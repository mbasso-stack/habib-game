#!/usr/bin/env python3
"""Hornea los personajes 3D para el juego.

De cada figura (herramientas/fuentes/<id>.obj) y su ajuste (herramientas/personajes/<id>.json) saca
modelos/personajes/<id>.bin (malla, pesos de piel, zonas de color y sombreado) y <id>.json (huesos y cara).

    venv/bin/python -I herramientas/hornear.py haluski kenji ...      # o "todos"
    ... --depurar CARPETA                                           # además guarda imágenes de la cabeza

Qué hace, en orden:
  1. Une vértices repetidos, normaliza (altura 1, pies en y = 0, centrado en los pies) y quita piezas sueltas.
  2. Sombreado: oclusión ambiental con rayos sobre una rejilla de vóxeles y un poco de oscurecido en los pliegues.
  3. Separa cada brazo del cuerpo con un corte mínimo (el borde más corto que respeta la forma) y cada pierna de la otra.
  4. Pesos de piel suaves dentro de cada parte (hombro, codo, muñeca, cadera, rodilla, tobillo, cuello).
  5. Donde el brazo toca el cuerpo por debajo de la axila (mano en el muslo, manga en el costado) y donde se tocan los muslos,
     rasga la malla y cierra las dos aberturas con una tapa: al mover el brazo no se estira nada ni queda ningún agujero.
  6. Zona de color de cada triángulo (traje, paneles, detalles, guantes, botas, piel, pelo...) para que los colores queden nítidos.
  7. Normales suaves por regiones (más suaves en la cara) y la superficie de la cara para pegar ojos, cejas, nariz y boca.
"""
import sys, os, json, struct, math
from collections import defaultdict, deque
import numpy as np

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZONAS = ["traje", "panel", "detalle", "guantes", "botas", "suela", "cuello", "mochila", "piel", "pelo", "metal", "acento", "visor", "luz", "labios", "ceja"]
Z = {n: i for i, n in enumerate(ZONAS)}
# Huesos: 0 cadera 1 columna 2 cabeza · 3-5 hombro/codo/mano derechos (x < 0) · 6-8 izquierdos · 9-11 muslo/rodilla/tobillo derechos · 12-14 izquierdos
TRONCO, BRAZO_D, BRAZO_I, PIERNA_D, PIERNA_I = 0, 1, 2, 3, 4


def sstep(a, b, x):
    t = np.clip((np.asarray(x, dtype=float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- lectura y limpieza
def leer_obj(ruta):
    """Vértices, triángulos y la coordenada de textura de cada esquina (o None si el modelo no trae)."""
    V, VT, F, FT = [], [], [], []
    with open(ruta) as f:
        for l in f:
            if l.startswith("v "):
                V.append([float(x) for x in l.split()[1:4]])
            elif l.startswith("vt "):
                VT.append([float(x) for x in l.split()[1:3]])
            elif l.startswith("f "):
                tr = [t.split("/") for t in l.split()[1:]]
                ids = [int(t[0]) - 1 for t in tr]
                tx = [int(t[1]) - 1 if len(t) > 1 and t[1] else -1 for t in tr]
                for j in range(1, len(ids) - 1):
                    F.append([ids[0], ids[j], ids[j + 1]]); FT.append([tx[0], tx[j], tx[j + 1]])
    F = np.array(F, dtype=np.int64)
    UV = None
    if VT and min(min(t) for t in FT) >= 0:
        UV = np.array(VT, dtype=np.float64)[np.array(FT)]   # (triángulos, 3, 2)
    return np.array(V, dtype=np.float64), F, UV


def soldar(V, F, tol=1e-6, X=None):
    clave = np.round(V / tol).astype(np.int64)
    _, inv = np.unique(clave, axis=0, return_inverse=True)
    inv = inv.reshape(-1)
    nv = inv.max() + 1
    V2 = np.zeros((nv, 3)); V2[inv] = V
    F2 = inv[F]
    ok = (F2[:, 0] != F2[:, 1]) & (F2[:, 1] != F2[:, 2]) & (F2[:, 0] != F2[:, 2])
    F2 = F2[ok]
    a = np.linalg.norm(np.cross(V2[F2[:, 1]] - V2[F2[:, 0]], V2[F2[:, 2]] - V2[F2[:, 0]]), axis=1)
    if X is not None:
        X = X[ok][a > 1e-14]
    return V2, F2[a > 1e-14], X


def compactar(V, F):
    usados = np.unique(F)
    mapa = -np.ones(len(V), dtype=np.int64); mapa[usados] = np.arange(len(usados))
    return V[usados], mapa[F]


def normalizar(V):
    y0, y1 = V[:, 1].min(), V[:, 1].max(); H = y1 - y0
    pies = V[V[:, 1] < y0 + 0.09 * H]
    cx = (pies[:, 0].min() + pies[:, 0].max()) / 2; cz = (pies[:, 2].min() + pies[:, 2].max()) / 2
    return (V - [cx, y0, cz]) / H


def quitar_cajas(V, F, cajas, X=None):
    if not cajas:
        return V, F, X
    malo = np.zeros(len(F), dtype=bool)
    for c in cajas:
        x0, x1, y0, y1, z0, z1 = c
        dentro = (V[:, 0] >= x0) & (V[:, 0] <= x1) & (V[:, 1] >= y0) & (V[:, 1] <= y1) & (V[:, 2] >= z0) & (V[:, 2] <= z1)
        malo |= dentro[F].any(axis=1)
    return (*compactar(V, F[~malo]), None if X is None else X[~malo])


def quitar_sueltas(V, F, minimo, X=None):
    """Quita las piezas sueltas pequeñas (restos de la hoja de personajes)."""
    p = np.arange(len(V))
    def raiz(a):
        while p[a] != a:
            p[a] = p[p[a]]; a = p[a]
        return a
    for a, b, c in F:
        ra, rb, rc = raiz(a), raiz(b), raiz(c)
        p[rb] = ra; p[raiz(c)] = ra
    r = np.array([raiz(i) for i in range(len(V))])
    caras_r = r[F[:, 0]]
    cuenta = np.bincount(caras_r, minlength=len(V))
    ok = cuenta[caras_r] >= minimo
    return (*compactar(V, F[ok]), None if X is None else X[ok])


# ---------------------------------------------------------------- geometría básica
def normales_cara(V, F):
    n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    a = np.linalg.norm(n, axis=1)
    return n / np.maximum(a, 1e-20)[:, None], a / 2


def normales_vertice(V, F, fn, area):
    n = np.zeros_like(V)
    for k in range(3):
        np.add.at(n, F[:, k], fn * area[:, None])
    L = np.linalg.norm(n, axis=1)
    n = n / np.maximum(L, 1e-20)[:, None]
    n[L < 1e-12] = [0, 1, 0]
    return n


def aristas(F):
    e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    e = np.sort(e, axis=1)
    return np.unique(e, axis=0)


def suavizar(V, E, it, lam=0.5):
    """Suavizado de Laplace uniforme: la forma sin los detalles (para saber qué sobresale)."""
    S = V.copy(); grado = np.bincount(E.ravel(), minlength=len(V)).astype(float)
    for _ in range(it):
        suma = np.zeros_like(S)
        np.add.at(suma, E[:, 0], S[E[:, 1]]); np.add.at(suma, E[:, 1], S[E[:, 0]])
        media = suma / np.maximum(grado, 1)[:, None]
        S = S + lam * (media - S)
    return S


def oclusion(V, F, vn, res=200, rayos=40, pasos=22):
    """Oclusión ambiental: rayos desde cada vértice sobre una rejilla con la superficie marcada."""
    h = 1.0 / res
    mn = V.min(axis=0) - 4 * h
    dim = np.ceil((V.max(axis=0) + 4 * h - mn) / h).astype(int) + 1
    rej = np.zeros(dim, dtype=bool)
    A, B, C = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    L = np.maximum(np.linalg.norm(B - A, axis=1), np.maximum(np.linalg.norm(C - A, axis=1), np.linalg.norm(C - B, axis=1)))
    k_all = np.clip(np.ceil(L / (h * 0.5)).astype(int), 1, 60)
    for k in np.unique(k_all):
        sel = k_all == k
        i, j = np.meshgrid(np.arange(k + 1), np.arange(k + 1), indexing="ij")
        m = (i + j) <= k
        u = (i[m] / k)[None, :, None]; w = (j[m] / k)[None, :, None]
        P = A[sel][:, None, :] * (1 - u - w) + B[sel][:, None, :] * u + C[sel][:, None, :] * w
        q = np.floor((P.reshape(-1, 3) - mn) / h).astype(int)
        rej[q[:, 0], q[:, 1], q[:, 2]] = True
    # rellena el interior (todo lo que no se alcanza desde fuera) para que los rayos no se cuelen por las rendijas
    fuera = np.zeros(dim, dtype=bool); fuera[0, :, :] = True
    pila = ~rej
    cambio = True
    while cambio:
        n = fuera.copy()
        for eje in range(3):
            for d in (1, -1):
                n |= np.roll(fuera, d, axis=eje)
        n &= pila
        cambio = n.sum() != fuera.sum()
        fuera = n
    solido = ~fuera
    # direcciones repartidas por el hemisferio (coseno)
    rng = np.random.default_rng(7)
    r1, r2 = rng.random(rayos), rng.random(rayos)
    loc = np.stack([np.sqrt(r1) * np.cos(2 * np.pi * r2), np.sqrt(r1) * np.sin(2 * np.pi * r2), np.sqrt(1 - r1)], axis=1)
    t1 = np.where(np.abs(vn[:, 1:2]) < 0.9, np.cross(vn, [0, 1, 0]), np.cross(vn, [1, 0, 0]))
    t1 /= np.maximum(np.linalg.norm(t1, axis=1), 1e-12)[:, None]
    t2 = np.cross(vn, t1)
    dirs = loc[None, :, 0:1] * t1[:, None, :] + loc[None, :, 1:2] * t2[:, None, :] + loc[None, :, 2:3] * vn[:, None, :]
    origen = V + vn * 2.2 * h
    tapado = np.zeros((len(V), rayos))
    vivo = np.ones((len(V), rayos), dtype=bool)
    for s in range(1, pasos + 1):
        P = origen[:, None, :] + dirs * (s * h * 1.15)
        q = np.floor((P - mn) / h).astype(int)
        for e in range(3):
            q[..., e] = np.clip(q[..., e], 0, dim[e] - 1)
        hit = solido[q[..., 0], q[..., 1], q[..., 2]] & vivo
        tapado[hit] = 1 - (s / (pasos + 1)) ** 1.5
        vivo &= ~hit
    return 1 - tapado.mean(axis=1)


def pliegues(V, E, vn):
    """Oscurece las hendiduras (vértice hundido respecto a sus vecinos) y aclara un poco las aristas salientes."""
    suma = np.zeros_like(V); cnt = np.zeros(len(V)); lon = np.zeros(len(V))
    np.add.at(suma, E[:, 0], V[E[:, 1]]); np.add.at(suma, E[:, 1], V[E[:, 0]])
    np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
    l = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1)
    np.add.at(lon, E[:, 0], l); np.add.at(lon, E[:, 1], l)
    c = np.maximum(cnt, 1)
    d = np.einsum("ij,ij->i", suma / c[:, None] - V, vn) / np.maximum(lon / c, 1e-9)
    return np.where(d > 0, 1 - 0.45 * np.minimum(1, d * 2.2), 1 + 0.12 * np.minimum(1, -d * 2.2))


# ---------------------------------------------------------------- corte mínimo (Dinic)
class Flujo:
    def __init__(s, n):
        s.n = n; s.g = [[] for _ in range(n)]
    def arista(s, a, b, c1, c2=0.0):
        s.g[a].append([b, c1, len(s.g[b])]); s.g[b].append([a, c2, len(s.g[a]) - 1])
    def maximo(s, S, T):
        total = 0.0
        while True:
            nivel = [-1] * s.n; nivel[S] = 0; q = deque([S])
            while q:
                u = q.popleft()
                for v, c, _ in s.g[u]:
                    if c > 1e-12 and nivel[v] < 0:
                        nivel[v] = nivel[u] + 1; q.append(v)
            if nivel[T] < 0:
                return total, nivel
            it = [0] * s.n
            while True:
                # camino en profundidad iterativo
                camino = []; u = S; f = float("inf"); pila_f = []
                while u != T:
                    avanzado = False
                    while it[u] < len(s.g[u]):
                        v, c, r = s.g[u][it[u]]
                        if c > 1e-12 and nivel[v] == nivel[u] + 1:
                            camino.append((u, it[u])); pila_f.append(f); f = min(f, c); u = v; avanzado = True
                            break
                        it[u] += 1
                    if not avanzado:
                        if not camino:
                            break
                        nivel[u] = -1
                        u, _ = camino.pop(); f = pila_f.pop(); it[u] += 1
                if u != T:
                    break
                for (a, i) in camino:
                    e = s.g[a][i]; e[1] -= f; s.g[e[0]][e[2]][1] += f
                total += f


def separar_brazo(V, F, E, vn, J, R, lado):
    """True para los vértices del brazo de ese lado (lado -1 = derecho, en x < 0)."""
    sx = lado
    ho = np.array([sx * J["hom"][0], J["hom"][1], J.get("brazoZ", 0.0)])
    co = np.array([sx * J["cod"][0], J["cod"][1], J.get("brazoZ", 0.0)])
    mu = np.array([sx * J["mun"][0], J["mun"][1], J.get("manoZ", J.get("brazoZ", 0.0))])
    fin = np.array([sx * J.get("dedosX", J["mun"][0]), J["manoFin"], J.get("manoZ", J.get("brazoZ", 0.0))])
    cadena = [(ho, co, R["brazo"][0]), (co, mu, R["brazo"][1]), (mu, fin, R["brazo"][2])]

    def dist_seg(P, a, b):
        d = b - a; t = np.clip(((P - a) @ d) / max(d @ d, 1e-12), 0, 1)
        return np.linalg.norm(P - (a + t[:, None] * d), axis=1), t

    dA = np.full(len(V), 9.0)
    for a, b, r in cadena:
        d, _ = dist_seg(V, a, b); dA = np.minimum(dA, d / r)
    # el cuerpo: elipse del tronco a cada altura, piernas, pelvis y la línea de los hombros
    if "troncoY" not in R:
        R["troncoY"], R["troncoX"], R["troncoZ"], R["troncoCZ"] = perfil_tronco(V, F, J, R)
    rx = np.interp(V[:, 1], R["troncoY"], R["troncoX"]); rz = np.interp(V[:, 1], R["troncoY"], R["troncoZ"])
    yc = np.clip(V[:, 1], J["cad"] - 0.05, J["cue"])
    dT = np.sqrt((V[:, 0] / rx) ** 2 + ((V[:, 2] - R.get("troncoCZ", 0.0)) / rz) ** 2 + ((V[:, 1] - yc) / 0.06) ** 2)
    dP, _ = dist_seg(V, np.array([sx * J["xp"], J["ing"], 0]), np.array([sx * J["xp"], 0.0, 0]))
    dB = np.minimum(dT, dP / R["pierna"])
    zona = (np.sign(V[:, 0]) == sx) & (V[:, 1] > J["manoFin"] - 0.04) & (V[:, 1] < J["hom"][1] + 0.08) & (np.abs(V[:, 0]) > 0.02)
    idx = np.nonzero(zona)[0]
    pos = -np.ones(len(V), dtype=np.int64); pos[idx] = np.arange(len(idx))
    n = len(idx); S, T = n, n + 1
    G = Flujo(n + 2)
    k = R.get("dato", 3.0)
    marg = dA[idx] - dB[idx]
    duro_brazo = (dA[idx] < R.get("nucleo", 0.55)) & (dB[idx] > 1.0)
    duro_cuerpo = (dB[idx] < 0.75) & (dA[idx] > 1.2) | (V[idx, 1] > J["hom"][1] + 0.06)
    for i in range(n):
        if duro_brazo[i]:
            G.arista(S, i, 1e9)
        elif duro_cuerpo[i]:
            G.arista(i, T, 1e9)
        else:
            m = marg[i] * k
            cb = math.log1p(math.exp(m)) if m < 30 else m       # coste de decir "brazo"
            cc = math.log1p(math.exp(-m)) if -m < 30 else -m    # coste de decir "cuerpo"
            G.arista(S, i, cc); G.arista(i, T, cb)
    # suavidad: cortar es barato por las hendiduras y caro por las superficies lisas y convexas
    lmed = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1).mean()
    lam = R.get("suave", 1.2)
    for a, b in E:
        ia, ib = pos[a], pos[b]
        if ia < 0 and ib < 0:
            continue
        d = V[b] - V[a]; L = np.linalg.norm(d)
        conv = float(np.dot(vn[b] - vn[a], d / max(L, 1e-12)))
        w = lam * (L / lmed) * min(3.0, max(0.15, math.exp(2.5 * conv)))
        if ia >= 0 and ib >= 0:
            G.arista(ia, ib, w, w)
        elif ia >= 0:
            G.arista(ia, T, w)      # el vecino fuera de la zona es cuerpo
        else:
            G.arista(ib, T, w)
    _, nivel = G.maximo(S, T)
    brazo = np.zeros(len(V), dtype=bool)
    brazo[idx] = np.array([nivel[i] >= 0 for i in range(n)])  # alcanzables desde la fuente tras el corte
    return brazo, dA


def corte(V, F, y):
    """Segmentos donde el plano horizontal y corta la malla: [(x0, z0, x1, z1), ...]."""
    Y = V[F][:, :, 1] - y
    cruza = (Y.min(axis=1) < 0) & (Y.max(axis=1) > 0)
    segs = []
    for t in F[cruza]:
        pts = []
        for i, j in ((0, 1), (1, 2), (2, 0)):
            a, b = V[t[i]], V[t[j]]
            if (a[1] - y) * (b[1] - y) < 0:
                u = (y - a[1]) / (b[1] - a[1]); p = a + u * (b - a); pts.append((p[0], p[2]))
        if len(pts) == 2:
            segs.append((pts[0][0], pts[0][1], pts[1][0], pts[1][1]))
    return np.array(segs) if segs else np.zeros((0, 4))


def perfil_tronco(V, F, J, R):
    """Semiejes del tronco a cada altura (x e z): el trozo de la sección que contiene x = 0, sin los brazos."""
    ys, rxs, rzs, czs = [], [], [], []
    for y in np.arange(J["cad"] - 0.06, J["cue"] + 0.001, 0.01):
        sg = corte(V, F, y)
        if not len(sg):
            continue
        iv = sorted(zip(np.minimum(sg[:, 0], sg[:, 2]), np.maximum(sg[:, 0], sg[:, 2]), range(len(sg))))
        grupos = []
        for x0, x1, i in iv:
            if grupos and x0 <= grupos[-1][1] + 0.004:
                grupos[-1][1] = max(grupos[-1][1], x1); grupos[-1][2].append(i)
            else:
                grupos.append([x0, x1, [i]])
        g = min(grupos, key=lambda g: 0 if g[0] <= 0 <= g[1] else min(abs(g[0]), abs(g[1])))
        rx = max(-g[0], g[1])
        if y < J["hom"][1] - 0.02:
            rx = min(rx, J["hom"][0] - 0.01)   # si el brazo está pegado al costado, el tronco no pasa del hombro
        zz = sg[g[2]][:, [1, 3]]
        ys.append(float(y)); rxs.append(rx * R.get("troncoEscalaX", 1.0)); rzs.append((zz.max() - zz.min()) / 2 * R.get("troncoEscalaZ", 1.0)); czs.append((zz.max() + zz.min()) / 2)
    return ys, rxs, rzs, float(np.median(czs))


# ---------------------------------------------------------------- pesos
def pesos_parte(P, parte, J):
    """Pesos de piel (4 huesos) de cada punto según la parte a la que pertenece."""
    n = len(P); W = np.zeros((n, 15))
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    for lado, b0, pid in ((-1, 3, BRAZO_D), (1, 6, BRAZO_I)):
        m = parte == pid
        if not m.any():
            continue
        Q = P[m]
        ho = np.array([lado * J["hom"][0], J["hom"][1]]); co = np.array([lado * J["cod"][0], J["cod"][1]]); mu = np.array([lado * J["mun"][0], J["mun"][1]])
        def tproj(a, b):
            d = b - a; return ((Q[:, :2] - a) @ d) / (d @ d)
        tc = tproj(ho, co); tm = tproj(co, mu)
        w_codo = sstep(0.82, 1.12, tc)          # del brazo al antebrazo alrededor del codo
        w_mano = sstep(-0.1, 0.12, tm - 1.0)    # del antebrazo a la mano alrededor de la muñeca
        w_hom = (1 - w_codo)
        w_cod = w_codo * (1 - w_mano)
        w_man = w_codo * w_mano
        # arriba del hombro se reparte con la columna para que el hombro no se rompa
        cols = sstep(J["hom"][1] - 0.035, J["hom"][1] + 0.05, Q[:, 1]) * sstep(0.35, -0.05, tc)
        W[np.nonzero(m)[0], 1] += cols
        W[np.nonzero(m)[0], b0] += w_hom * (1 - cols)
        W[np.nonzero(m)[0], b0 + 1] += w_cod * (1 - cols)
        W[np.nonzero(m)[0], b0 + 2] += w_man * (1 - cols)
    for lado, b0, pid in ((-1, 9, PIERNA_D), (1, 12, PIERNA_I)):
        m = parte == pid
        if not m.any():
            continue
        yy = y[m]; ii = np.nonzero(m)[0]
        cad = sstep(J["ing"] - 0.05, J["ing"] + 0.02, yy) * 0.6        # junto a la ingle se reparte con la cadera
        rod = sstep(J["rod"] + 0.03, J["rod"] - 0.03, yy)
        tob = sstep(J["tob"] + 0.02, J["tob"] - 0.02, yy)
        W[ii, 0] += cad
        W[ii, b0] += (1 - cad) * (1 - rod)
        W[ii, b0 + 1] += (1 - cad) * rod * (1 - tob)
        W[ii, b0 + 2] += (1 - cad) * tob
    m = parte == TRONCO
    if m.any():
        ii = np.nonzero(m)[0]; Q = P[m]; yy = Q[:, 1]
        cab = sstep(J["cue"] - 0.02, J["cue"] + 0.025, yy)
        col = sstep(J["cin"] - 0.05, J["cin"] + 0.05, yy) * (1 - cab)
        cad = (1 - cab) * (1 - col)
        # el tronco junto a la articulación del hombro sigue un poco al brazo (hombro redondo al levantarlo)
        h_peso = np.zeros(len(ii)); h_idx = np.zeros(len(ii), dtype=int)
        for lado, b0 in ((-1, 3), (1, 6)):
            d = np.sqrt((Q[:, 0] - lado * J["hom"][0]) ** 2 + ((Q[:, 1] - J["hom"][1]) * 1.2) ** 2 + (Q[:, 2] * 0.8) ** 2)
            w = sstep(0.085, 0.03, d) * 0.65 * (np.sign(Q[:, 0]) == lado)
            mejor = w > h_peso
            h_peso = np.where(mejor, w, h_peso); h_idx = np.where(mejor, b0, h_idx)
        # la pelvis por debajo de la cadera sigue un poco al muslo de su lado
        m_peso = sstep(J["cad"], J["ing"] - 0.01, yy) * sstep(0.01, 0.05, np.abs(Q[:, 0])) * 0.5
        m_idx = np.where(Q[:, 0] < 0, 9, 12)
        resto = (1 - h_peso) * (1 - m_peso)
        W[ii, 2] += cab * resto
        W[ii, 1] += col * resto
        W[ii, 0] += cad * resto
        np.add.at(W, (ii, h_idx), h_peso * (1 - m_peso))
        np.add.at(W, (ii, m_idx), m_peso)
    W /= np.maximum(W.sum(axis=1, keepdims=True), 1e-9)
    orden = np.argsort(-W, axis=1)[:, :4]
    wv = np.take_along_axis(W, orden, axis=1)
    wv /= np.maximum(wv.sum(axis=1, keepdims=True), 1e-9)
    return orden.astype(np.uint8), wv


# ---------------------------------------------------------------- rasgar y tapar
def rasgar(V, F, parte, J, cfg):
    """Rasga donde dos partes que se separan al moverse están unidas y cierra cada abertura con una tapa."""
    axila = J["hom"][1] - cfg.get("axila", 0.035)
    def rasgable(pa, pb, y):
        if pa == pb:
            return False
        brazos = (BRAZO_D, BRAZO_I)
        if pa in brazos or pb in brazos:
            return y < axila
        return {pa, pb} == {PIERNA_D, PIERNA_I}
    # parte de cada triángulo: la mayoritaria (en empate, la del vértice más bajo del brazo)
    pf = parte[F]
    tri_parte = np.empty(len(F), dtype=np.int64)
    for i, (a, b, c) in enumerate(pf):
        if a == b or a == c:
            tri_parte[i] = a
        elif b == c:
            tri_parte[i] = b
        else:
            cand = [p for p in (a, b, c) if p in (BRAZO_D, BRAZO_I)]
            tri_parte[i] = cand[0] if cand else a
    copias = {}
    Vn = [V]; partes_n = list(parte); origen = list(range(len(V)))
    F2 = F.copy()
    sigue = np.zeros(len(F), dtype=bool)   # triángulo que se queda unido aunque cruce partes (estirado suave)
    for i in range(len(F)):
        tp = tri_parte[i]
        for k in range(3):
            v = F[i, k]
            if parte[v] != tp and rasgable(tp, parte[v], V[v, 1]):
                clave = (v, tp)
                if clave not in copias:
                    copias[clave] = len(partes_n); partes_n.append(tp); origen.append(v)
                F2[i, k] = copias[clave]
    V2 = V[np.array(origen)]
    parte2 = np.array(partes_n)
    # tapas: bordes nuevos (aristas que solo tiene un triángulo y que antes tenían dos)
    def bordes(Fx):
        cuenta = defaultdict(int); dirig = {}
        for t in Fx:
            for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                cuenta[(min(a, b), max(a, b))] += 1; dirig[(a, b)] = True
        return cuenta, dirig
    c0, _ = bordes([[origen[a] for a in t] for t in F])
    c1, d1 = bordes(F2)
    medio = []
    for (a, b) in d1:
        if c1[(min(a, b), max(a, b))] == 1 and c0[(min(origen[a], origen[b]), max(origen[a], origen[b]))] >= 2:
            medio.append((a, b))
    # agrupa las aristas de borde en aberturas (componentes conexas) y tapa cada una en abanico
    padre = {}
    def raiz(a):
        padre.setdefault(a, a)
        while padre[a] != a:
            padre[a] = padre[padre[a]]; a = padre[a]
        return a
    for a, b in medio:
        padre[raiz(a)] = raiz(b)
    grupos = defaultdict(list)
    for a, b in medio:
        grupos[raiz(a)].append((a, b))
    nuevos_v, nuevas_f, partes_extra, tapas = [], [], [], []
    base = len(V2)
    for g, lados in grupos.items():
        vs = sorted({a for e in lados for a in e})
        if len(vs) < 3:
            continue
        centro = V2[vs].mean(axis=0)
        # la tapa se hunde un poco hacia dentro para que no sobresalga
        c = base + len(nuevos_v)
        nuevos_v.append(centro); partes_extra.append(parte2[vs[0]])
        for a, b in lados:
            nuevas_f.append([b, a, c]); tapas.append(True)
    if nuevos_v:
        V2 = np.vstack([V2, np.array(nuevos_v)])
        parte2 = np.concatenate([parte2, np.array(partes_extra)])
        F2 = np.vstack([F2, np.array(nuevas_f)])
    es_tapa = np.concatenate([np.zeros(len(F), dtype=bool), np.ones(len(nuevas_f), dtype=bool)])
    origen = np.concatenate([np.array(origen), -np.ones(len(nuevos_v), dtype=np.int64)])
    return V2, F2, parte2, origen, es_tapa, len(grupos)


# ---------------------------------------------------------------- zonas de color
def dentro_forma(P, f):
    """Formas de las zonas: caja [x0,x1,y0,y1,z0,z1] (opcional "simetrica") o elipsoide {c:[x,y,z], r:[rx,ry,rz]}."""
    if "caja" in f:
        x0, x1, y0, y1, z0, z1 = f["caja"]
        xs = np.abs(P[:, 0]) if f.get("simetrica") else P[:, 0]
        return (xs >= x0) & (xs <= x1) & (P[:, 1] >= y0) & (P[:, 1] <= y1) & (P[:, 2] >= z0) & (P[:, 2] <= z1)
    if "elipse" in f:
        c = np.array(f["elipse"]["c"], dtype=float); r = np.array(f["elipse"]["r"], dtype=float)
        Q = P.copy()
        if f.get("simetrica"):
            Q[:, 0] = np.abs(Q[:, 0]); c[0] = abs(c[0])
        return (((Q - c) / r) ** 2).sum(axis=1) <= 1
    return np.ones(len(P), dtype=bool)


def zonas_color(Vc, nc, parte_t, alto, J, cfg):
    """Zona de cada triángulo a partir de su centro (Vc), normal (nc), parte y relieve (alto: cuánto sobresale)."""
    x, y, z = Vc[:, 0], Vc[:, 1], Vc[:, 2]
    ax = np.abs(x)
    C = cfg.get("color", {})
    zona = np.full(len(Vc), Z["traje"])
    brazo = (parte_t == BRAZO_D) | (parte_t == BRAZO_I)
    pierna = (parte_t == PIERNA_D) | (parte_t == PIERNA_I)
    cab = (parte_t == TRONCO) & (y > J["cue"] + C.get("cuelloAlto", 0.012))
    # relieve: lo que sobresale de la forma suavizada son bolsillos, rodilleras, correas...
    umbral = C.get("relieve", 0.0045)
    sobresale = alto > umbral
    zona[sobresale & ~cab] = Z[C.get("zonaRelieve", "panel")]
    if C.get("ranuras", True):
        zona[(alto < -umbral * 1.2) & ~cab] = Z["detalle"]
    # piernas: botas y suela
    zona[y < J["bota"]] = Z["botas"]
    zona[y < C.get("suela", 0.012)] = Z["suela"]
    # manos
    guante = brazo & (y < J["mun"][1] + C.get("puno", 0.0))
    zona[guante] = Z["guantes"]
    # cuello del traje
    cuello = (y > J["cue"] - C.get("cuelloBajo", 0.03)) & (y <= J["cue"] + C.get("cuelloAlto", 0.012)) & (parte_t == TRONCO)
    zona[cuello] = Z["cuello"]
    # cabeza: piel y pelo según el nacimiento del pelo
    pel = cfg.get("pelo", {})
    if cab.any():
        frente = pel.get("frente", 0.955)   # altura del nacimiento del pelo en la frente
        sien = pel.get("sien", 0.935)       # en las sienes
        nuca = pel.get("nuca", 0.9)         # por detrás
        zcara = pel.get("zCara", 0.0)       # por delante de esta z es cara
        anchoCara = pel.get("anchoCara", 0.065)
        delante = z > zcara
        t = np.clip(ax / anchoCara, 0, 1)
        linea = frente + (sien - frente) * t ** 2
        es_pelo = np.where(delante & (ax < anchoCara), y > linea, y > nuca)
        # lados de la cabeza (orejas abajo, pelo arriba)
        lateral = delante & (ax >= anchoCara)
        es_pelo = np.where(lateral, y > pel.get("lateral", sien), es_pelo)
        zona[cab] = np.where(es_pelo[cab], Z["pelo"], Z["piel"])
    # mochila: lo que queda detrás del tronco
    moch = C.get("mochila")
    if moch:
        zona[(parte_t == TRONCO) & dentro_forma(Vc, moch)] = Z["mochila"]
    # zonas a mano (por orden; la última gana)
    for f in cfg.get("zonas", []):
        m = dentro_forma(Vc, f)
        if "partes" in f:
            grupos = {"tronco": [TRONCO], "brazo": [BRAZO_D, BRAZO_I], "pierna": [PIERNA_D, PIERNA_I]}
            m &= np.isin(parte_t, [q for p in f["partes"] for q in grupos[p]])
        if "normalY" in f:
            m &= nc[:, 1] >= f["normalY"]
        if "relieveMin" in f:
            m &= alto > f["relieveMin"]
        if "si" in f:
            m &= np.isin(zona, [Z[n] for n in f["si"]])
        zona[m] = Z[f["zona"]]
    return zona


# ---------------------------------------------------------------- normales por esquina
def normales_esquinas(V, F, fn, area, angulo_t):
    """Normal de cada esquina: media de los triángulos vecinos cuya normal no se aleja más del ángulo de ese triángulo."""
    vf = defaultdict(list)
    for i, t in enumerate(F):
        for v in t:
            vf[v].append(i)
    cosu = np.cos(np.radians(angulo_t))
    N = np.zeros((len(F), 3, 3))
    for i, t in enumerate(F):
        for k, v in enumerate(t):
            g = np.array(vf[v])
            ok = (fn[g] @ fn[i]) >= min(cosu[i], 0.9999)
            s = (fn[g[ok]] * area[g[ok], None]).sum(axis=0)
            L = np.linalg.norm(s)
            N[i, k] = s / L if L > 1e-12 else fn[i]
    return N


# ---------------------------------------------------------------- cara
def detectar_cara(V, F, fn, J, cfg):
    """Superficie de la cara vista de frente (para pegar los rasgos) y la punta de la nariz."""
    c = dict(cfg.get("cara", {}))
    cabeza = (V[F][:, :, 1] > J["cue"] - 0.01).all(axis=1) & (fn[:, 2] > 0.05)
    Fh = F[cabeza]
    if not len(Fh):
        return None
    if "nariz" not in c:
        sel = (np.abs(V[:, 0]) < 0.012) & (V[:, 1] > J["cue"] + 0.04) & (V[:, 1] < J["cue"] + 0.11)
        i = np.argmax(np.where(sel, V[:, 2], -9))
        c["nariz"] = [0.0, float(V[i, 1]), float(V[i, 2])]
    nx, ny, nz = c["nariz"]
    v = c.get("ventana", [-0.075, 0.075, ny - 0.07, ny + 0.075])  # x0, x1, y0, y1
    GX, GY = 96, 96
    xs = np.linspace(v[0], v[1], GX + 1); ys = np.linspace(v[3], v[2], GY + 1)
    zb = np.full((GY + 1, GX + 1), -9.0); nb = np.zeros((GY + 1, GX + 1, 3)); nb[..., 2] = 1
    A, B, C = V[Fh[:, 0]], V[Fh[:, 1]], V[Fh[:, 2]]
    fnh = fn[cabeza]
    for i in range(len(Fh)):
        a, b, cc = A[i], B[i], C[i]
        x0, x1 = min(a[0], b[0], cc[0]), max(a[0], b[0], cc[0]); y0, y1 = min(a[1], b[1], cc[1]), max(a[1], b[1], cc[1])
        ii = np.nonzero((xs >= x0) & (xs <= x1))[0]; jj = np.nonzero((ys >= y0) & (ys <= y1))[0]
        if not len(ii) or not len(jj):
            continue
        X, Y = np.meshgrid(xs[ii], ys[jj])
        den = (b[1] - cc[1]) * (a[0] - cc[0]) + (cc[0] - b[0]) * (a[1] - cc[1])
        if abs(den) < 1e-14:
            continue
        l1 = ((b[1] - cc[1]) * (X - cc[0]) + (cc[0] - b[0]) * (Y - cc[1])) / den
        l2 = ((cc[1] - a[1]) * (X - cc[0]) + (a[0] - cc[0]) * (Y - cc[1])) / den
        l3 = 1 - l1 - l2
        dentro = (l1 >= -1e-9) & (l2 >= -1e-9) & (l3 >= -1e-9)
        zz = l1 * a[2] + l2 * b[2] + l3 * cc[2]
        sub = zb[np.ix_(jj, ii)]
        mejor = dentro & (zz > sub)
        sub[mejor] = zz[mejor]; zb[np.ix_(jj, ii)] = sub
        nsub = nb[np.ix_(jj, ii)]; nsub[mejor] = fnh[i]; nb[np.ix_(jj, ii)] = nsub
    vacio = zb < -8
    zb[vacio] = nz - 0.05
    return {"c": c, "ventana": v, "GX": GX, "GY": GY, "z": zb, "n": nb, "vacio": vacio}


# ---------------------------------------------------------------- todo junto
def hornear(id_, depurar=None):
    ruta_cfg = os.path.join(RAIZ, "herramientas", "personajes", id_ + ".json")
    cfg = json.load(open(ruta_cfg))
    V, F, UV = leer_obj(os.path.join(RAIZ, "herramientas", "fuentes", id_ + ".obj"))
    V, F, UV = soldar(V, F, X=UV)
    V = normalizar(V)
    if cfg.get("girar"):  # el modelo mira hacia -z: se gira media vuelta
        V[:, 0] *= -1; V[:, 2] *= -1
    V, F, UV = quitar_cajas(V, F, cfg.get("quitar"), UV)
    V, F, UV = quitar_sueltas(V, F, cfg.get("piezaMinima", 40), UV)
    J = cfg["J"]; R = cfg["radios"]
    fn, area = normales_cara(V, F)
    vn = normales_vertice(V, F, fn, area)
    E = aristas(F)
    # sombreado y relieve
    ao = oclusion(V, F, vn, res=cfg.get("resAO", 200))
    pl = pliegues(V, E, vn)
    suave = suavizar(V, E, cfg.get("suavizado", 25))
    alto = np.einsum("ij,ij->i", V - suave, vn)
    sombra = np.clip(ao ** cfg.get("fuerzaAO", 1.0) * pl, 0.18, 1.12)
    # partes
    parte = np.full(len(V), TRONCO)
    bD, _ = separar_brazo(V, F, E, vn, J, R, -1)
    bI, _ = separar_brazo(V, F, E, vn, J, R, 1)
    parte[bD] = BRAZO_D; parte[bI] = BRAZO_I
    piernas = (parte == TRONCO) & (V[:, 1] < J["ing"])
    parte[piernas & (V[:, 0] < 0)] = PIERNA_D
    parte[piernas & (V[:, 0] >= 0)] = PIERNA_I
    # rasgar y tapar
    V2, F2, parte2, origen, es_tapa, n_tapas = rasgar(V, F, parte, J, cfg)
    if UV is not None:  # las tapas toman la textura de las esquinas vecinas; el centro, la media
        uv_v = np.zeros((len(V2), 2)); hay = np.zeros(len(V2), dtype=bool)
        for i in range(len(F)):
            for k in range(3):
                uv_v[F2[i, k]] = UV[i, k]; hay[F2[i, k]] = True
        UVt = [UV]
        for t in F2[len(F):]:
            if not hay[t[2]]:
                vec = [u for u in F2[len(F):] if u[2] == t[2]]
                uv_v[t[2]] = np.mean([uv_v[u[0]] for u in vec], axis=0); hay[t[2]] = True
            UVt.append(uv_v[t][None])
        UV2 = np.concatenate(UVt)
    else:
        UV2 = None
    sombra2 = np.where(origen >= 0, sombra[np.maximum(origen, 0)], 0.6)
    alto2 = np.where(origen >= 0, alto[np.maximum(origen, 0)], 0.0)
    si, sw = pesos_parte(V2, parte2, J)
    # zona de cada triángulo
    fn2, area2 = normales_cara(V2, F2)
    Vc = V2[F2].mean(axis=1)
    pt = np.array([np.bincount(parte2[t], minlength=5).argmax() for t in F2])
    zona = zonas_color(Vc, fn2, pt, alto2[F2].mean(axis=1), J, cfg)
    # las tapas toman la zona más común de sus vecinos
    if es_tapa.any():
        vf = defaultdict(list)
        for i, t in enumerate(F2):
            if not es_tapa[i]:
                for v in t:
                    vf[v].append(i)
        for i in np.nonzero(es_tapa)[0]:
            vec = [zona[j] for v in F2[i][:2] for j in vf[v]]
            if vec:
                zona[i] = np.bincount(vec).argmax()
    # normales: en la cabeza más suaves
    ang = np.where(Vc[:, 1] > J["cue"] + 0.01, cfg.get("anguloCabeza", 70), cfg.get("anguloCuerpo", 40)).astype(float)
    N = normales_esquinas(V2, F2, fn2, area2, ang)
    # vértices finales: uno por (vértice, normal)
    clave = {}
    vpos, vnor, vsi, vsw, vsom, vpar, caras, vuv = [], [], [], [], [], [], [], []
    for i, t in enumerate(F2):
        tri = []
        for k, v in enumerate(t):
            nq = tuple(np.round(N[i, k] * 60).astype(int))
            kk = (v, nq, None if UV2 is None else tuple(np.round(UV2[i, k] * 8192).astype(int)))
            if kk not in clave:
                clave[kk] = len(vpos)
                vuv.append(UV2[i, k] if UV2 is not None else (0, 0))
                vpos.append(V2[v]); vnor.append(N[i, k]); vsi.append(si[v]); vsw.append(sw[v]); vsom.append(sombra2[v]); vpar.append(parte2[v])
            tri.append(clave[kk])
        caras.append(tri)
    vpos = np.array(vpos); vnor = np.array(vnor); vsi = np.array(vsi); vsw = np.array(vsw); vsom = np.array(vsom); caras = np.array(caras)
    assert len(vpos) < 65536, len(vpos)
    # cara
    cara = detectar_cara(V, F, fn, J, cfg) if cfg.get("tieneCara", True) else None
    # escribir
    mn = vpos.min(axis=0); mx = vpos.max(axis=0)
    q = np.round((vpos - mn) / (mx - mn) * 65535).astype(np.uint16)
    nb = np.round(vnor * 127).astype(np.int8)
    wq = np.round(vsw * 255).astype(np.int32)
    wq[:, 0] += 255 - wq.sum(axis=1)
    out = bytearray(b"HGP2")
    out += struct.pack("<II6f", len(vpos), len(caras), *mn, *mx)
    out += q.tobytes()
    out += np.concatenate([nb, np.zeros((len(nb), 1), np.int8)], axis=1).tobytes()
    out += vsi.astype(np.uint8).tobytes()
    out += np.clip(wq, 0, 255).astype(np.uint8).tobytes()
    out += np.round(np.clip(vsom, 0, 1.25) / 1.25 * 255).astype(np.uint8).tobytes()
    out += np.array(vpar, dtype=np.uint8).tobytes()
    out += caras.astype(np.uint16).tobytes()
    out += zona.astype(np.uint8).tobytes()
    meta = {"J": J, "zonas": ZONAS, "paleta": cfg.get("paleta", {})}
    if UV2 is not None and cfg.get("texturas"):
        out += np.round(np.clip(np.array(vuv), 0, 1) * 65535).astype(np.uint16).tobytes()
        meta["textura"] = copiar_texturas(id_, cfg["texturas"])
    if cara:
        g = cara
        meta["cara"] = {"c": g["c"], "ventana": g["ventana"], "GX": g["GX"], "GY": g["GY"]}
        out += g["z"].astype(np.float32).tobytes()
        out += np.round(g["n"] * 127).astype(np.int8).tobytes()
    destino = os.path.join(RAIZ, "modelos", "personajes")
    open(os.path.join(destino, id_ + ".bin"), "wb").write(out)
    json.dump(meta, open(os.path.join(destino, id_ + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    resumen = {"id": id_, "vertices": len(vpos), "triangulos": len(caras), "tapas": int(es_tapa.sum()), "aberturas": n_tapas,
               "brazoD": int(bD.sum()), "brazoI": int(bI.sum()), "bytes": len(out), "troncoX": [round(a, 3) for a in R["troncoX"]], "nariz": cara["c"]["nariz"] if cara else None}
    if depurar:
        os.makedirs(depurar, exist_ok=True)
        imagen_cara(cara, os.path.join(depurar, id_ + "_cara.png"))
    return resumen


def copiar_texturas(id_, tx):
    """Pasa las texturas del modelo al juego: color y relieve en JPG, rugosidad (G) y metal (B) juntos en uno."""
    from PIL import Image
    base = os.path.join(RAIZ, "herramientas", "fuentes")
    destino = os.path.join(RAIZ, "modelos", "personajes")
    tam = tx.get("tam", 2048)
    res = {}
    if "color" in tx:
        Image.open(os.path.join(base, tx["color"])).convert("RGB").resize((tam, tam), Image.LANCZOS).save(os.path.join(destino, id_ + "_color.jpg"), quality=88)
        res["color"] = id_ + "_color.jpg"
    if "normal" in tx:
        Image.open(os.path.join(base, tx["normal"])).convert("RGB").resize((tam // 2, tam // 2), Image.LANCZOS).save(os.path.join(destino, id_ + "_normal.jpg"), quality=90)
        res["normal"] = id_ + "_normal.jpg"
    if "rugosidad" in tx or "metal" in tx:
        t2 = tam // 2
        r = Image.open(os.path.join(base, tx["rugosidad"])).convert("L").resize((t2, t2)) if "rugosidad" in tx else Image.new("L", (t2, t2), 180)
        m = Image.open(os.path.join(base, tx["metal"])).convert("L").resize((t2, t2)) if "metal" in tx else Image.new("L", (t2, t2), 0)
        Image.merge("RGB", (Image.new("L", (t2, t2), 0), r, m)).save(os.path.join(destino, id_ + "_rm.jpg"), quality=90)
        res["rm"] = id_ + "_rm.jpg"
    return res


def imagen_cara(cara, ruta):
    """Imagen de la cara vista de frente con una rejilla en coordenadas del modelo (para ajustar ojos, boca y pelo)."""
    if not cara:
        return
    from PIL import Image, ImageDraw
    z, n, v = cara["z"], cara["n"], cara["ventana"]
    luz = np.array([0.35, 0.45, 0.82]); luz /= np.linalg.norm(luz)
    s = np.clip(n @ luz, 0, 1) * 0.85 + 0.15
    s[cara["vacio"]] = 0.05
    img = Image.fromarray((np.clip(s, 0, 1) * 255).astype(np.uint8)).resize((768, 768), Image.NEAREST).convert("RGB")
    d = ImageDraw.Draw(img)
    X = lambda x: (x - v[0]) / (v[1] - v[0]) * 768
    Y = lambda y: (v[3] - y) / (v[3] - v[2]) * 768
    paso = 0.005
    x = math.ceil(v[0] / paso) * paso
    while x <= v[1]:
        d.line([(X(x), 0), (X(x), 768)], fill=(60, 90, 140) if abs(round(x / 0.01) * 0.01 - x) > 1e-6 else (90, 140, 220), width=1)
        if abs(round(x / 0.01) * 0.01 - x) < 1e-6:
            d.text((X(x) + 2, 2), f"{x:+.2f}", fill=(255, 220, 120))
        x += paso
    y = math.ceil(v[2] / paso) * paso
    while y <= v[3]:
        d.line([(0, Y(y)), (768, Y(y))], fill=(60, 90, 140) if abs(round(y / 0.01) * 0.01 - y) > 1e-6 else (90, 140, 220), width=1)
        if abs(round(y / 0.01) * 0.01 - y) < 1e-6:
            d.text((2, Y(y) + 2), f"{y:.3f}", fill=(255, 220, 120))
        y += paso
    c = cara["c"]
    nxp, nyp = c["nariz"][0], c["nariz"][1]
    d.ellipse([X(nxp) - 5, Y(nyp) - 5, X(nxp) + 5, Y(nyp) + 5], outline=(255, 60, 60), width=2)
    if "ojo" in c:
        for s_ in (-1, 1):
            ox, oy = s_ * abs(c["ojo"][0]), c["ojo"][1]
            w, h = c.get("ojoW", 0.02) / 2, c.get("ojoH", 0.008) / 2
            d.ellipse([X(ox - w), Y(oy + h), X(ox + w), Y(oy - h)], outline=(60, 255, 120), width=2)
    if "boca" in c:
        by, bw = c["boca"][1], c.get("bocaW", 0.02) / 2
        d.line([(X(-bw), Y(by)), (X(bw), Y(by))], fill=(255, 80, 200), width=2)
    if "ceja" in c:
        d.line([(X(-0.04), Y(c["ceja"])), (X(0.04), Y(c["ceja"]))], fill=(255, 160, 40), width=1)
    img.save(ruta)


if __name__ == "__main__":
    args = sys.argv[1:]
    depurar = None
    if "--depurar" in args:
        i = args.index("--depurar"); depurar = args[i + 1]; del args[i:i + 2]
    if not args or args == ["todos"]:
        args = sorted(f[:-5] for f in os.listdir(os.path.join(RAIZ, "herramientas", "personajes")) if f.endswith(".json"))
    for a in args:
        print(json.dumps(hornear(a, depurar), ensure_ascii=False))

// Personajes a partir de mallas 3D (modelos/personajes/*.bin): se cargan, se les pone un esqueleto con los mismos huesos
// que los personajes de código (así usan la misma animación) y se pintan por zonas mientras no haya textura.
"use strict";
(function () {
const HG = window.HG, T = THREE;
const sstep = (a, b, x) => { const t = HG.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Juntas de cada modelo en fracciones de su altura (pies en y = 0, centrado en x):
// cad cadera · ing entrepierna (donde se separan las piernas) · rod rodilla · tob tobillo · cin cintura · cue base del cuello
// hom/cod/mun [x, y] del hombro, codo y muñeca · xb |x| desde la que algo es brazo · mano y más baja de la mano · xp separación de la pierna
// bota altura de la caña de la bota · pelo fracción de la cabeza (desde el cuello) donde empieza el pelo
HG.MALLAS = {
  kenji: { cara: { W: 0.13, X: 0.08, ojoW: 0.23, ojoH: 0.072 }, J: { aw: 0.085, cad: 0.34, ing: 0.30, rod: 0.18, tob: 0.065, cin: 0.50, cue: 0.86, hom: [0.15, 0.78], cod: [0.215, 0.60], mun: [0.215, 0.46], xb: 0.16, mano: 0.37, xp: 0.085, bota: 0.12, pelo: 0.55 } },
  bruno: { cara: { W: 0.14, X: 0.085, ojoW: 0.23, ojoH: 0.072 }, J: { aw: 0.09, cad: 0.38, ing: 0.34, rod: 0.20, tob: 0.065, cin: 0.52, cue: 0.85, hom: [0.18, 0.76], cod: [0.235, 0.60], mun: [0.235, 0.46], xb: 0.16, mano: 0.40, xp: 0.09, bota: 0.12, pelo: 0.5 } },
  nadia: { cara: { W: 0.115, X: 0.07 }, J: { aw: 0.06, cad: 0.46, ing: 0.40, rod: 0.24, tob: 0.06, cin: 0.58, cue: 0.84, hom: [0.12, 0.78], cod: [0.19, 0.62], mun: [0.21, 0.46], xb: 0.13, mano: 0.40, xp: 0.07, bota: 0.10, pelo: 0.5 } },
  haluski: { J: { aw: 0.075, cad: 0.35, ing: 0.30, rod: 0.17, tob: 0.06, cin: 0.50, cue: 0.835, hom: [0.14, 0.75], cod: [0.19, 0.55], mun: [0.19, 0.40], xb: 0.14, mano: 0.355, xp: 0.07, bota: 0.11, pelo: 0.52 }, cara: { W: 0.13, X: 0.075, ojoY: 0.31, cejaY: 0.47 } },
  astro: { J: { aw: 0.08, zb: -0.1, cad: 0.36, ing: 0.31, rod: 0.18, tob: 0.065, cin: 0.52, cue: 0.84, hom: [0.17, 0.745], cod: [0.225, 0.57], mun: [0.215, 0.42], xb: 0.15, mano: 0.36, xp: 0.085, bota: 0.12, pelo: 0.45 }, cara: { W: 0.125, X: 0.07 } },
  piloto: { J: { aw: 0.07, cad: 0.38, ing: 0.33, rod: 0.19, tob: 0.06, cin: 0.54, cue: 0.82, hom: [0.14, 0.76], cod: [0.19, 0.58], mun: [0.2, 0.44], xb: 0.125, mano: 0.37, xp: 0.065, bota: 0.12, pelo: 0.5 }, cara: { W: 0.125, X: 0.075 }, zonas: [{ c: "#2a2f3a", b: [-0.06, -0.03, 0.868, 0.92, -9, 9] }, { c: "#2a2f3a", b: [0.05, 0.085, 0.868, 0.92, -9, 9] }] },
  robot: { J: { aw: 0.09, cad: 0.38, ing: 0.35, rod: 0.19, tob: 0.06, cin: 0.50, cue: 0.80, hom: [0.21, 0.73], cod: [0.225, 0.55], mun: [0.225, 0.37], xb: 0.17, mano: 0.29, xp: 0.095, bota: 0.08, pelo: 2 } },
};

const cache = {}, esperas = {};
function leer(buf) {
  const dv = new DataView(buf), nv = dv.getUint32(0, true), ni = dv.getUint32(4, true);
  const mn = [8, 12, 16].map(o => dv.getFloat32(o, true)), mx = [20, 24, 28].map(o => dv.getFloat32(o, true));
  let o = 36;
  const q = new Uint16Array(buf, o, nv * 3); o += nv * 6;
  const uv = new Uint16Array(buf, o, nv * 2); o += nv * 4;
  const nr = new Int8Array(buf, o, nv * 4); o += nv * 4;
  const idx = new Uint16Array(buf, o, ni);
  const pos = new Float32Array(nv * 3), tex = new Float32Array(nv * 2), nor = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    for (let k = 0; k < 3; k++) { pos[i * 3 + k] = mn[k] + q[i * 3 + k] / 65535 * (mx[k] - mn[k]); nor[i * 3 + k] = nr[i * 4 + k] / 127; }
    tex[i * 2] = uv[i * 2] / 65535; tex[i * 2 + 1] = uv[i * 2 + 1] / 65535;
  }
  return { nv, pos, tex, nor, idx: Uint16Array.from(idx) };
}

// Hueso de cada vértice: 0 cadera 1 columna 2 cabeza · 3-5 hombro/codo/mano derechos · 6-8 izquierdos · 9-11 muslo/rodilla/tobillo derechos · 12-14 izquierdos
function pesos(M, J) {
  const idx = new Uint16Array(M.nv * 4), w = new Float32Array(M.nv * 4), L = [];
  // borde exterior del cuerpo a cada altura y por lado: el brazo es lo que queda cerca de ese borde y más cerca de la cadena del brazo que de la cadera
  const ext = [new Float32Array(102), new Float32Array(102)];
  for (let v = 0; v < M.nv; v++) { const y = M.pos[v * 3 + 1]; if (y < J.mano || y > J.hom[1] + 0.08) continue; const lado = M.pos[v * 3] < 0 ? 0 : 1, b = Math.round(y * 100), a = Math.abs(M.pos[v * 3]); ext[lado][b] = Math.max(ext[lado][b], a); }
  for (const e of ext) {
    for (let b = 1; b < 101; b++) if (!e[b]) e[b] = e[b - 1];
    for (let b = 100; b >= 0; b--) if (!e[b]) e[b] = e[b + 1];
    const c = Float32Array.from(e); for (let b = 1; b < 101; b++) e[b] = Math.max(c[b - 1], c[b], c[b + 1]) * 0.7 + (c[b - 1] + c[b] + c[b + 1]) / 3 * 0.3;
  }
  const aw = J.aw || 0.075;
  const seg = (px, py, pz, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, t = HG.clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(px - (ax + dx * t), py - (ay + dy * t), pz * 0.6); };
  for (let v = 0; v < M.nv; v++) {
    const x = M.pos[v * 3], y = M.pos[v * 3 + 1], ax = Math.abs(x), lado = x < 0 ? 0 : 1;
    L.length = 0;
    const z = M.pos[v * 3 + 2], sx = x < 0 ? -1 : 1, hy = J.hom[1], yr = Math.max(y, J.mano + 0.02);
    const xb = Math.max(0.05, ext[lado][Math.round(yr * 100)] - (y < J.mano + 0.02 ? 0.03 : aw * (y < J.mun[1] ? 0.75 : 1)));
    // por debajo de la mano no hay brazo; la mano pegada al muslo se reparte según a quién esté más cerca (la cadera o la muñeca)
    const dM = seg(x, y, z, sx * J.mun[0], J.mun[1], sx * J.mun[0], J.mano - 0.03) / 0.06, dC = Math.min(seg(x, y, z, sx * J.xp, 0, sx * J.xp, J.ing) / 0.1, seg(x, y, z, sx * J.xp, J.ing, 0, J.cad) / 0.12);
    const cerca = y < J.mun[1] ? 1 - sstep(0.8, 1.3, dM / dC) : 1;
    const rampa = 0.006 + 0.014 * sstep(J.cod[1] - 0.02, J.cod[1] + 0.1, y);
    const wA = sstep(xb - rampa, xb + rampa, ax) * cerca * sstep(J.mano - 0.045, J.mano - 0.02, y) * (1 - sstep(hy + 0.03, hy + 0.08, y));
    if (wA > 0) {
      const sM = sstep(J.mun[1] - 0.03, J.mun[1] + 0.03, y), sC = sstep(J.cod[1] - 0.03, J.cod[1] + 0.03, y), b = lado ? 6 : 3;
      L.push([b + 2, wA * (1 - sM)], [b + 1, wA * sM * (1 - sC)], [b, wA * sM * sC]);
    }
    const r = 1 - wA;
    if (r > 0) {
      const cab = sstep(J.cue - 0.03, J.cue + 0.02, y), cuerpo = r * (1 - cab), pierna = 1 - sstep(J.ing - 0.015, J.ing + 0.04, y), tor = sstep(J.cin - 0.04, J.cin + 0.04, y);
      const lb = lado ? 12 : 9, sR = sstep(J.rod - 0.03, J.rod + 0.03, y), sT = sstep(J.tob - 0.02, J.tob + 0.02, y);
      L.push([2, r * cab], [0, cuerpo * (1 - pierna) * (1 - tor)], [1, cuerpo * (1 - pierna) * tor]);
      L.push([lb + 2, cuerpo * pierna * (1 - sT)], [lb + 1, cuerpo * pierna * sT * (1 - sR)], [lb, cuerpo * pierna * sT * sR]);
    }
    L.sort((a, b) => b[1] - a[1]);
    let s = 0; for (let k = 0; k < 4; k++) s += L[k] ? L[k][1] : 0; s = s || 1;
    for (let k = 0; k < 4; k++) { idx[v * 4 + k] = L[k] ? L[k][0] : 0; w[v * 4 + k] = L[k] ? L[k][1] / s : 0; }
  }
  return { idx, w };
}

// ---------- Cara: ojos, cejas, boca y nariz pintados en una lámina que se pega a la superficie de la cabeza ----------
const cabezas = {};
function datosCabeza(id) {
  if (cabezas[id]) return cabezas[id];
  const M = cache[id], cfg = HG.MALLAS[id], J = cfg.J, c = cfg.cara || {}, P = M.pos, tris = [];
  for (let t = 0; t < M.idx.length; t += 3) {
    const a = M.idx[t], b = M.idx[t + 1], d = M.idx[t + 2], y0 = J.cue - 0.01;
    if (P[a * 3 + 1] > y0 && P[b * 3 + 1] > y0 && P[d * 3 + 1] > y0) tris.push([a, b, d]);
  }
  let nariz = c.nariz;
  if (!nariz) { // la punta de la nariz es lo más adelantado de la cara, sobre el eje
    let mejor = -9, bx = 0, by = 0;
    for (let v = 0; v < M.nv; v++) {
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      if (Math.abs(x) < 0.012 && y > J.cue + (c.nMin ?? 0.08) * (1 - J.cue) && y < J.cue + (c.nMax ?? 0.42) * (1 - J.cue) && z > mejor) { mejor = z; bx = x; by = y; }
    }
    nariz = [bx, by, mejor];
  }
  return cabezas[id] = { tris, nariz, W: c.W || 0.125, c };
}
// punto más adelantado de la cabeza en (x, y): devuelve z y la normal
function rayo(M, tris, x, y) {
  const P = M.pos; let zb = -9, nb = null;
  for (let i = 0; i < tris.length; i++) {
    const [a, b, d] = tris[i], ax = P[a * 3], ay = P[a * 3 + 1], bx = P[b * 3], by = P[b * 3 + 1], dx = P[d * 3], dy = P[d * 3 + 1];
    if (x < Math.min(ax, bx, dx) || x > Math.max(ax, bx, dx) || y < Math.min(ay, by, dy) || y > Math.max(ay, by, dy)) continue;
    const den = (by - dy) * (ax - dx) + (dx - bx) * (ay - dy); if (Math.abs(den) < 1e-12) continue;
    const l1 = ((by - dy) * (x - dx) + (dx - bx) * (y - dy)) / den, l2 = ((dy - ay) * (x - dx) + (ax - dx) * (y - dy)) / den, l3 = 1 - l1 - l2;
    if (l1 < 0 || l2 < 0 || l3 < 0) continue;
    const z = l1 * P[a * 3 + 2] + l2 * P[b * 3 + 2] + l3 * P[d * 3 + 2];
    if (z > zb) {
      zb = z;
      const ux = bx - ax, uy = by - ay, uz = P[b * 3 + 2] - P[a * 3 + 2], vx = dx - ax, vy = dy - ay, vz = P[d * 3 + 2] - P[a * 3 + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz) || 1; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      nb = [nx / L, ny / L, nz / L];
    }
  }
  return zb > -9 ? { z: zb, n: nb } : null;
}
const PW = 1.3, PH = 0.92, PTOP = 0.62; // lámina: ancho y alto en unidades de ancho de cabeza, y lo que sube sobre la punta de la nariz
const CF = { ojoX: 0.17, ojoY: 0.34, ojoW: 0.27, ojoH: 0.085, cejaY: 0.5, bocaY: -0.13, bocaW: 0.21 };
function dibujarCara(d, cfg, cerrado) {
  const k = Object.assign({}, CF, cfg.c), CW = 1024, q = CW / PW;
  return HG.lienzoTex(CW, Math.round(PH * q), (c, w, h) => {
    const X = u => w / 2 + u * q, Y = v => (PTOP - v) * q, mujer = !!d.mujer;
    c.lineCap = "round"; c.lineJoin = "round";
    // sombra suave de las cuencas para dar volumen
    for (const s of [-1, 1]) { const g = c.createRadialGradient(X(s * k.ojoX), Y(k.ojoY + 0.01), 0, X(s * k.ojoX), Y(k.ojoY + 0.01), k.ojoW * q * 0.85); g.addColorStop(0, "rgba(70,35,30,0.20)"); g.addColorStop(1, "rgba(70,35,30,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    // cejas
    const pc = new T.Color(d.pelo || "#3a2a1c"), ceja = `#${pc.clone().multiplyScalar(0.55).getHexString()}`;
    for (const s of [-1, 1]) for (let j = 0; j < 7; j++) {
      const a = Math.random() * 0.012, x0 = s * (k.ojoX - 0.12), x1 = s * (k.ojoX + 0.13), vy = k.cejaY + (j - 3) * 0.006;
      c.strokeStyle = ceja; c.globalAlpha = 0.55; c.lineWidth = q * (mujer ? 0.010 : 0.014);
      c.beginPath(); c.moveTo(X(x0), Y(vy - 0.012 + a)); c.quadraticCurveTo(X(s * k.ojoX), Y(vy + 0.03 + a), X(x1), Y(vy - 0.018 + a)); c.stroke();
    }
    c.globalAlpha = 1;
    // ojos
    for (const s of [-1, 1]) {
      const cx = X(s * k.ojoX), cy = Y(k.ojoY), ew = k.ojoW * q, eh = k.ojoH * q;
      const almendra = () => { c.beginPath(); c.moveTo(cx - ew / 2, cy + eh * 0.1 * s); c.quadraticCurveTo(cx, cy - eh * 1.5, cx + ew / 2, cy - eh * 0.05 * s); c.quadraticCurveTo(cx, cy + eh * 1.05, cx - ew / 2, cy + eh * 0.1 * s); c.closePath(); };
      if (!cerrado) {
        c.save(); almendra(); c.clip();
        c.fillStyle = "#f2ece6"; c.fillRect(cx - ew, cy - eh * 2, ew * 2, eh * 4);
        const ir = eh * 0.98, gi = c.createRadialGradient(cx, cy, ir * 0.1, cx, cy, ir);
        const col = new T.Color(d.ojos || "#4a3020"); gi.addColorStop(0, "#050505"); gi.addColorStop(0.32, "#050505"); gi.addColorStop(0.4, `#${col.clone().multiplyScalar(0.55).getHexString()}`); gi.addColorStop(0.75, `#${col.clone().lerp(new T.Color(1, 1, 1), 0.12).getHexString()}`); gi.addColorStop(0.95, `#${col.clone().multiplyScalar(0.4).getHexString()}`); gi.addColorStop(1, "#16110e");
        c.fillStyle = gi; c.beginPath(); c.arc(cx, cy, ir, 0, 6.2832); c.fill();
        const sh = c.createLinearGradient(0, cy - eh * 1.4, 0, cy + eh * 0.3); sh.addColorStop(0, "rgba(40,20,15,0.65)"); sh.addColorStop(0.6, "rgba(40,20,15,0.1)"); sh.addColorStop(1, "rgba(40,20,15,0)"); c.fillStyle = sh; c.fillRect(cx - ew, cy - eh * 2, ew * 2, eh * 3);
        c.fillStyle = "rgba(255,255,255,0.95)"; c.beginPath(); c.arc(cx - ir * 0.38, cy - ir * 0.38, ir * 0.17, 0, 6.2832); c.fill();
        c.fillStyle = "rgba(255,255,255,0.35)"; c.beginPath(); c.arc(cx + ir * 0.35, cy + ir * 0.4, ir * 0.1, 0, 6.2832); c.fill();
        c.restore();
        // párpado superior grueso y pestañas
        c.strokeStyle = "#1e130e"; c.lineWidth = eh * (mujer ? 0.34 : 0.26);
        c.beginPath(); c.moveTo(cx - ew / 2, cy + eh * 0.1 * s); c.quadraticCurveTo(cx, cy - eh * 1.5, cx + ew / 2, cy - eh * 0.05 * s); c.stroke();
        c.lineWidth = eh * 0.1; c.strokeStyle = "rgba(90,45,40,0.6)";
        c.beginPath(); c.moveTo(cx - ew / 2, cy + eh * 0.1 * s); c.quadraticCurveTo(cx, cy + eh * 1.05, cx + ew / 2, cy - eh * 0.05 * s); c.stroke();
        c.strokeStyle = "#1e130e"; c.lineWidth = eh * 0.07;
        const nl = mujer ? 7 : 2; for (let i = 0; i < nl; i++) { const t = i / (nl - 1), lx = cx + s * (-ew / 2 + ew * (0.55 + 0.45 * t)), ly = cy - eh * 0.9 * Math.sin(Math.PI * (0.55 + 0.45 * t) * 0.85); c.beginPath(); c.moveTo(lx, ly + eh * 0.05); c.lineTo(lx + s * eh * 0.35, ly - eh * (mujer ? 0.55 : 0.18)); c.stroke(); }
      } else {
        c.fillStyle = d.piel || "#d9a988"; almendra(); c.fill();
        c.strokeStyle = "#1e130e"; c.lineWidth = eh * 0.2; c.beginPath(); c.moveTo(cx - ew / 2, cy); c.quadraticCurveTo(cx, cy + eh * 0.55, cx + ew / 2, cy); c.stroke();
      }
    }
    // nariz: fosas y sombra de la punta
    c.fillStyle = "rgba(60,25,20,0.5)"; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(X(s * 0.05), Y(-0.045), q * 0.026, q * 0.014, s * 0.4, 0, 6.2832); c.fill(); }
    // boca
    const my = k.bocaY, mw = k.bocaW, sonrisa = 0.018, esc = mujer || d.labiosGruesos ? 1.25 : 1;
    const labio = d.labios || "#b0625a", lc = new T.Color(labio);
    const mx = u => X(u * mw), mya = v => Y(my + v);
    c.fillStyle = `#${lc.clone().lerp(new T.Color(d.piel || "#d9a988"), 0.15).getHexString()}`;
    c.beginPath(); c.moveTo(mx(-1), mya(sonrisa)); c.quadraticCurveTo(mx(-0.5), mya(0.036 * esc), mx(-0.12), mya(0.03 * esc)); c.quadraticCurveTo(mx(0), mya(0.022 * esc), mx(0.12), mya(0.03 * esc)); c.quadraticCurveTo(mx(0.5), mya(0.036 * esc), mx(1), mya(sonrisa)); c.quadraticCurveTo(mx(0), mya(-0.002), mx(-1), mya(sonrisa)); c.fill();
    c.fillStyle = `#${lc.clone().multiplyScalar(1.08).getHexString()}`;
    c.beginPath(); c.moveTo(mx(-1), mya(sonrisa)); c.quadraticCurveTo(mx(0), mya(-0.002), mx(1), mya(sonrisa)); c.quadraticCurveTo(mx(0.6), mya(-0.05 * esc), mx(0), mya(-0.052 * esc)); c.quadraticCurveTo(mx(-0.6), mya(-0.05 * esc), mx(-1), mya(sonrisa)); c.fill();
    c.fillStyle = "rgba(255,255,255,0.18)"; c.beginPath(); c.ellipse(mx(0), mya(-0.03 * esc), q * mw * 0.28, q * 0.007, 0, 0, 6.2832); c.fill();
    c.strokeStyle = "rgba(55,18,16,0.85)"; c.lineWidth = q * 0.0065; c.beginPath(); c.moveTo(mx(-1.03), mya(sonrisa + 0.004)); c.quadraticCurveTo(mx(0), mya(-0.002), mx(1.03), mya(sonrisa + 0.004)); c.stroke();
    // barbilla y surco bajo la nariz: sombra suave
    const gs = c.createRadialGradient(X(0), mya(-0.09), 0, X(0), mya(-0.09), q * 0.07); gs.addColorStop(0, "rgba(60,30,25,0.14)"); gs.addColorStop(1, "rgba(60,30,25,0)"); c.fillStyle = gs; c.fillRect(X(-0.12), mya(-0.2), q * 0.24, q * 0.2);
  });
}
const carasGeo = {}, carasTex = {};
function geometriaCara(d) {
  const id = d.malla, A = d.altura, clave = id + A;
  if (carasGeo[clave]) return carasGeo[clave];
  const M = cache[id], H = datosCabeza(id), [nx, ny, nz] = H.nariz, W = H.W, GX = 64, GY = 56, off = 0.0006;
  const zs = new Float32Array((GX + 1) * (GY + 1)).fill(-9), ns = [];
  for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
    const x = nx + (i / GX - 0.5) * PW * W, y = ny + (PTOP - j / GY * PH) * W, r = rayo(M, H.tris, x, y), k = j * (GX + 1) + i;
    if (r) { zs[k] = r.z; ns[k] = r.n; } else ns[k] = [0, 0, 1];
  }
  for (let k = 0; k < zs.length; k++) if (zs[k] < -8) zs[k] = nz - 0.04; // sin superficie: queda detrás de la nariz
  const pos = new Float32Array(zs.length * 3), uv = new Float32Array(zs.length * 2), idx = [];
  for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
    const k = j * (GX + 1) + i, x = nx + (i / GX - 0.5) * PW * W, y = ny + (PTOP - j / GY * PH) * W;
    pos[k * 3] = (x + ns[k][0] * off) * A; pos[k * 3 + 1] = (y + ns[k][1] * off) * A; pos[k * 3 + 2] = (zs[k] + ns[k][2] * off) * A;
    uv[k * 2] = i / GX; uv[k * 2 + 1] = 1 - j / GY;
    if (i < GX && j < GY) { const a = k, b = k + 1, c = k + GX + 1, e = c + 1; idx.push(a, c, b, b, c, e); }
  }
  const g = new T.BufferGeometry(), n = zs.length;
  g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("uv", new T.BufferAttribute(uv, 2));
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let v = 0; v < n; v++) { si[v * 4] = 2; sw[v * 4] = 1; }
  g.setAttribute("skinIndex", new T.BufferAttribute(si, 4)); g.setAttribute("skinWeight", new T.BufferAttribute(sw, 4));
  g.setIndex(idx); g.computeVertexNormals();
  return carasGeo[clave] = g;
}
const caraTex = d => carasTex[d.id] || (carasTex[d.id] = { abierta: dibujarCara(d, HG.MALLAS[d.malla].cara ? { c: HG.MALLAS[d.malla].cara } : { c: {} }, false), cerrada: dibujarCara(d, HG.MALLAS[d.malla].cara ? { c: HG.MALLAS[d.malla].cara } : { c: {} }, true) });

// Oclusión barata: oscurece los huecos (pliegues, bolsillos, cuencas) y aclara un poco lo que sobresale
const cavidades = {};
function cavidad(id) {
  if (cavidades[id]) return cavidades[id];
  const M = cache[id], P = M.pos, N = M.nor, ids = new Map(), rep = new Int32Array(M.nv);
  for (let v = 0; v < M.nv; v++) { const k = Math.round(P[v * 3] * 3000) + "," + Math.round(P[v * 3 + 1] * 3000) + "," + Math.round(P[v * 3 + 2] * 3000); let r = ids.get(k); if (r === undefined) { r = ids.size; ids.set(k, r); } rep[v] = r; }
  const n = ids.size, sp = new Float32Array(n * 3), sn = new Float32Array(n * 3), cnt = new Float32Array(n), sl = new Float32Array(n);
  const arista = (a, b) => {
    const ra = rep[a], rb = rep[b]; if (ra === rb) return;
    for (let k = 0; k < 3; k++) { sp[ra * 3 + k] += P[b * 3 + k]; sp[rb * 3 + k] += P[a * 3 + k]; }
    const L = Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]); sl[ra] += L; sl[rb] += L; cnt[ra]++; cnt[rb]++;
  };
  for (let t = 0; t < M.idx.length; t += 3) { const a = M.idx[t], b = M.idx[t + 1], c = M.idx[t + 2]; arista(a, b); arista(b, c); arista(c, a); }
  for (let v = 0; v < M.nv; v++) for (let k = 0; k < 3; k++) sn[rep[v] * 3 + k] += N[v * 3 + k];
  const sombra = new Float32Array(M.nv);
  for (let v = 0; v < M.nv; v++) {
    const r = rep[v], c = cnt[r] || 1, L = sl[r] / c || 1, nl = Math.hypot(sn[r * 3], sn[r * 3 + 1], sn[r * 3 + 2]) || 1;
    const d = ((sp[r * 3] / c - P[v * 3]) * sn[r * 3] + (sp[r * 3 + 1] / c - P[v * 3 + 1]) * sn[r * 3 + 1] + (sp[r * 3 + 2] / c - P[v * 3 + 2]) * sn[r * 3 + 2]) / nl / L;
    sombra[v] = d > 0 ? 1 - 0.55 * Math.min(1, d * 2.2) : 1 + 0.18 * Math.min(1, -d * 2.2);
  }
  return cavidades[id] = sombra;
}

// Color por zonas (hasta que haya textura): botas, guantes, cuello, pelo, mochila, hombreras y rodilleras
function colores(M, J, d, depurar) {
  const c = new Float32Array(M.nv * 3), k = n => HG.lin(d[n] || "#888888"), col = { traje: k("traje"), panel: k("panel"), piel: k("piel"), pelo: k("pelo"), guantes: k("guantes"), botas: k("botas"), cuello: k("cuello"), mochila: k("mochila") };
  const tmp = new T.Color(), nuca = datosCabeza(d.malla).nariz[2] - 0.085, cabX = (HG.MALLAS[d.malla].cara || {}).X, sombra = cavidad(d.malla), zonas = (HG.MALLAS[d.malla].zonas || []).map(z => ({ b: z.b, c: HG.lin(z.c) }));
  for (let v = 0; v < M.nv; v++) {
    const x = M.pos[v * 3], y = M.pos[v * 3 + 1], z = M.pos[v * 3 + 2], ny = M.nor[v * 3 + 1], ax = Math.abs(x);
    let q = col.traje;
    const brazo = ax > J.xb && y > J.mano - 0.04 && y < J.hom[1] + 0.05;
    if (y < J.bota) q = col.botas;
    else if (brazo && y < J.mun[1] + 0.005) q = col.guantes;
    else if (y > J.cue + 0.012) {
      const t = (y - J.cue) / (1 - J.cue);
      q = (d.cara === false) ? col.panel : ax > (cabX || 0.1) ? col.traje : (t > J.pelo || (z < nuca && t > 0.12)) ? col.pelo : col.piel;
      if (d.casco) q = col.panel;
    } else if (y > J.cue - 0.03) q = col.cuello;
    else if (z < -0.06 && y > J.cin && y < J.hom[1] + 0.02 && ax < J.xb) q = col.mochila;
    else if ((y > J.hom[1] - 0.05 && brazo && ny > 0.35) || (Math.abs(y - J.rod) < 0.05 && z > 0.02 && ax < J.xb) || (y < J.rod - 0.03 && y > J.bota && Math.abs(y - J.rod) > 0.1 && false)) q = col.panel;
    for (const zn of zonas) if (x >= zn.b[0] && x <= zn.b[1] && y >= zn.b[2] && y <= zn.b[3] && z >= zn.b[4] && z <= zn.b[5]) q = zn.c;
    const h = (Math.sin(x * 91.7 + y * 53.1 + z * 37.9) * 43758.5453) % 1, f = (0.95 + Math.abs(h) * 0.08) * sombra[v];
    tmp.copy(q).multiplyScalar(f); c[v * 3] = tmp.r; c[v * 3 + 1] = tmp.g; c[v * 3 + 2] = tmp.b;
  }
  return c;
}

const geos = {};
function geometria(d) {
  const id = d.malla, A = d.altura, clave = id + A;
  if (geos[clave]) return geos[clave];
  const M = cache[id], J = HG.MALLAS[id].J, g = new T.BufferGeometry();
  const pos = new Float32Array(M.pos.length); for (let i = 0; i < pos.length; i++) pos[i] = M.pos[i] * A;
  const p = pesos(M, J);
  g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("normal", new T.BufferAttribute(M.nor, 3)); g.setAttribute("uv", new T.BufferAttribute(M.tex, 2));
  g.setAttribute("color", new T.BufferAttribute(colores(M, J, d), 3));
  g.setAttribute("skinIndex", new T.BufferAttribute(p.idx, 4)); g.setAttribute("skinWeight", new T.BufferAttribute(p.w, 4));
  // la mano y el antebrazo rozan la cadera y el muslo: se quitan los triángulos que los unen a otra parte (quedan ocultos) para que al mover el brazo no se estiren
  // se separan los triángulos que unen un brazo con otra parte por debajo del hombro (el roce de la mano con el muslo o la manga con el torso),
  // porque al mover el brazo se estirarían; cada brazo se trata por separado
  const idx = [], pe = (v, a) => { let t = 0; for (let k = 0; k < 4; k++) { const b = p.idx[v * 4 + k]; if (b >= a && b <= a + 2) t += p.w[v * 4 + k]; } return t; };
  for (let t = 0; t < M.idx.length; t += 3) {
    const v = [M.idx[t], M.idx[t + 1], M.idx[t + 2]], yc = (M.pos[v[0] * 3 + 1] + M.pos[v[1] * 3 + 1] + M.pos[v[2] * 3 + 1]) / 3;
    let corta = false;
    if (yc < J.hom[1] - 0.04) for (const a of [3, 6]) { const m = v.map(k => pe(k, a) > 0.5); if (m.some(x => x) && !m.every(x => x)) corta = true; }
    if (!corta) idx.push(v[0], v[1], v[2]);
  }
  g.setIndex(new T.BufferAttribute(Uint16Array.from(idx), 1));
  return geos[clave] = g;
}
const materiales = {};
const material = d => materiales[d.id] || (materiales[d.id] = new T.MeshStandardMaterial({ vertexColors: true, skinning: true, side: T.DoubleSide, roughness: d.rugosidad ?? 0.72, metalness: d.metal ?? 0.08 }));

HG.Mallas = {
  listo: id => !!cache[id],
  cargar(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    return esperas[id] || (esperas[id] = fetch(`modelos/personajes/${id}.bin`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(b => cache[id] = leer(b)));
  },
  // Esqueleto y malla de un personaje; devuelve lo mismo que HG.crearPersonaje
  crear(d) {
    const A = d.altura, J = HG.MALLAS[d.malla].J, raiz = new T.Group(), hueso = (p, x, y, z) => { const b = new T.Bone(); b.position.set(x, y, z); if (p) p.add(b); return b; };
    const cadera = hueso(null, 0, J.cad * A, 0), columna = hueso(cadera, 0, (J.cin - J.cad) * A, 0), cabeza = hueso(columna, 0, (J.cue - J.cin) * A, 0);
    const h = { cadera, columna, cabeza, hombros: [], codos: [], manos: [], muslos: [], rodillas: [], tobillos: [], ojos: [], parpados: [] };
    const huesos = [cadera, columna, cabeza];
    for (const s of [-1, 1]) {
      const ho = hueso(columna, s * J.hom[0] * A, (J.hom[1] - J.cin) * A, 0), co = hueso(ho, s * (J.cod[0] - J.hom[0]) * A, (J.cod[1] - J.hom[1]) * A, 0), ma = hueso(co, s * (J.mun[0] - J.cod[0]) * A, (J.mun[1] - J.cod[1]) * A, 0);
      h.hombros.push(ho); h.codos.push(co); h.manos.push(ma); huesos.push(ho, co, ma);
    }
    for (const s of [-1, 1]) {
      const mu = hueso(cadera, s * J.xp * A, 0, 0), ro = hueso(mu, 0, (J.rod - J.cad) * A, 0), to = hueso(ro, 0, (J.tob - J.rod) * A, 0);
      h.muslos.push(mu); h.rodillas.push(ro); h.tobillos.push(to); huesos.push(mu, ro, to);
    }
    const malla = new T.SkinnedMesh(geometria(d), material(d));
    malla.castShadow = malla.receiveShadow = true; malla.frustumCulled = false;
    raiz.add(malla); raiz.add(cadera); raiz.updateMatrixWorld(true);
    malla.bind(new T.Skeleton(huesos));
    const pico = HG.hacerPico(h.manos[0]), anim = HG.animacion(h, cadera, columna, J.cad * A, { reposoZ: 0.02, mano: true });
    let animar = anim;
    if (HG.MALLAS[d.malla].cara) { // ojos, cejas y boca, que parpadean
      const tx = caraTex(d), mat = new T.MeshStandardMaterial({ map: tx.abierta, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, skinning: true, roughness: 0.5, metalness: 0 });
      const cara = new T.SkinnedMesh(geometriaCara(d), mat); cara.frustumCulled = false; cara.renderOrder = 2; raiz.add(cara);
      raiz.updateMatrixWorld(true); cara.bind(malla.skeleton);
      let espera = HG.rnd(1, 4), cerrado = false;
      animar = (e, t, dt = 0.016) => { anim(e, t, dt); espera -= dt; const c = espera < 0.12; if (espera < 0) espera = HG.rnd(2, 5); if (c !== cerrado) { cerrado = c; mat.map = c ? tx.cerrada : tx.abierta; } };
    }
    return { grupo: raiz, def: d, huesos: h, pico(v) { pico.visible = v; }, animar };
  },
};
for (const id of Object.keys(HG.MALLAS)) HG.Mallas.cargar(id).catch(() => {}); // se descargan al arrancar; mientras tanto se ven los personajes de código
})();

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
  kenji: { J: { cad: 0.34, ing: 0.30, rod: 0.18, tob: 0.065, cin: 0.50, cue: 0.86, hom: [0.15, 0.78], cod: [0.215, 0.60], mun: [0.215, 0.46], xb: 0.16, mano: 0.37, xp: 0.085, bota: 0.12, pelo: 0.55 } },
  bruno: { J: { cad: 0.38, ing: 0.34, rod: 0.20, tob: 0.065, cin: 0.52, cue: 0.85, hom: [0.18, 0.76], cod: [0.235, 0.60], mun: [0.235, 0.46], xb: 0.16, mano: 0.40, xp: 0.09, bota: 0.12, pelo: 0.5 } },
  nadia: { J: { cad: 0.46, ing: 0.40, rod: 0.24, tob: 0.06, cin: 0.58, cue: 0.84, hom: [0.12, 0.78], cod: [0.19, 0.62], mun: [0.21, 0.46], xb: 0.13, mano: 0.40, xp: 0.07, bota: 0.10, pelo: 0.5 } },
  robot: { J: { cad: 0.38, ing: 0.35, rod: 0.19, tob: 0.06, cin: 0.50, cue: 0.80, hom: [0.21, 0.73], cod: [0.225, 0.55], mun: [0.225, 0.37], xb: 0.17, mano: 0.29, xp: 0.095, bota: 0.08, pelo: 2 } },
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
  for (let v = 0; v < M.nv; v++) {
    const x = M.pos[v * 3], y = M.pos[v * 3 + 1], ax = Math.abs(x), lado = x < 0 ? 0 : 1;
    L.length = 0;
    const xb = J.xb + Math.max(0, J.mun[0] - 0.055 - J.xb) * (1 - sstep(J.mun[1] - 0.02, J.mun[1] + 0.12, y)); // en la mano, más hacia fuera: así no se pegan los bolsillos del muslo
    const rampa = 0.006 + 0.014 * sstep(J.cod[1] - 0.02, J.cod[1] + 0.1, y); // corte seco en el antebrazo y la mano, suave en el hombro
    const wA = sstep(xb - rampa, xb + rampa, ax) * sstep(J.mano - 0.015, J.mano + 0.02, y) * (1 - sstep(J.hom[1] + 0.03, J.hom[1] + 0.08, y));
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

// Color por zonas (hasta que haya textura): botas, guantes, cuello, pelo, mochila, hombreras y rodilleras
function colores(M, J, d, depurar) {
  const c = new Float32Array(M.nv * 3), k = n => HG.lin(d[n] || "#888888"), col = { traje: k("traje"), panel: k("panel"), piel: k("piel"), pelo: k("pelo"), guantes: k("guantes"), botas: k("botas"), cuello: k("cuello"), mochila: k("mochila") };
  const tmp = new T.Color();
  for (let v = 0; v < M.nv; v++) {
    const x = M.pos[v * 3], y = M.pos[v * 3 + 1], z = M.pos[v * 3 + 2], ny = M.nor[v * 3 + 1], ax = Math.abs(x);
    let q = col.traje;
    const brazo = ax > J.xb && y > J.mano && y < J.hom[1] + 0.05;
    if (y < J.bota) q = col.botas;
    else if (brazo && y < J.mun[1] + 0.005) q = col.guantes;
    else if (y > J.cue + 0.012) {
      const t = (y - J.cue) / (1 - J.cue);
      q = (d.cara === false) ? col.panel : (t > J.pelo || (z < -0.02 && t > 0.2)) ? col.pelo : col.piel;
      if (d.casco) q = col.panel;
    } else if (y > J.cue - 0.03) q = col.cuello;
    else if (z < -0.06 && y > J.cin && y < J.hom[1] + 0.02 && ax < J.xb) q = col.mochila;
    else if ((y > J.hom[1] - 0.05 && brazo && ny > 0.35) || (Math.abs(y - J.rod) < 0.05 && z > 0.02 && ax < J.xb) || (y < J.rod - 0.03 && y > J.bota && Math.abs(y - J.rod) > 0.1 && false)) q = col.panel;
    const h = (Math.sin(x * 91.7 + y * 53.1 + z * 37.9) * 43758.5453) % 1, f = 0.93 + Math.abs(h) * 0.12;
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
  const idx = [], cadera = x => x === 0 || x >= 9;
  for (let t = 0; t < M.idx.length; t += 3) {
    const b = [0, 1, 2].map(k => p.idx[M.idx[t + k] * 4]);
    if (b.some(x => x === 4 || x === 5 || x === 7 || x === 8) && b.some(cadera)) continue;
    idx.push(M.idx[t], M.idx[t + 1], M.idx[t + 2]);
  }
  g.setIndex(new T.BufferAttribute(Uint16Array.from(idx), 1));
  return geos[clave] = g;
}
const materiales = {};
const material = d => materiales[d.id] || (materiales[d.id] = new T.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: d.rugosidad ?? 0.72, metalness: d.metal ?? 0.08 }));

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
    const pico = HG.hacerPico(h.manos[0]);
    return { grupo: raiz, def: d, huesos: h, pico(v) { pico.visible = v; }, animar: HG.animacion(h, cadera, columna, J.cad * A, { reposoZ: 0.02, mano: true }) };
  },
};
for (const id of Object.keys(HG.MALLAS)) HG.Mallas.cargar(id).catch(() => {}); // se descargan al arrancar; mientras tanto se ven los personajes de código
})();

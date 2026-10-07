// Personajes estilo Fortnite: cabeza esculpida con rasgos, ojos con iris y párpados, pelo por mechones,
// traje con costuras, parches y equipo. Miran hacia +Z y tienen los pies en y = 0.
// Al final se fusionan las piezas de cada hueso para que cada personaje se dibuje con pocas llamadas.
"use strict";
(function () {
const HG = window.HG, T = THREE;

HG.PERSONAJES = [
  { id: "haluski", malla: "haluski", corto: "Haluski", nombre: "Haluski", rol: "Protagonista", bio: "Piloto protagonista. Valiente, impulsivo y con un don para las naves.",
    piel: "#efc4a0", pelo: "#d9b062", peinado: "puntas", ojos: "#3f86d0", labios: "#c27a6e", traje: "#2c5aa8", panel: "#244a8a", cuello: "#a7afb8", detalle: "#3a414c",
    guantes: "#8c939c", botas: "#3a3d42", mochila: "#2c5aa8", mangueras: true, parches: "haluski", altura: 1.8, k: 1.0, semilla: 11 },
  { id: "nadia", malla: "nadia", corto: "Nadia", nombre: "Nadia Reyes", rol: "Exploradora · Amigos", bio: "Exploradora. Conoce cada roca de los planetas y a cada piloto de la estación.",
    piel: "#d29a74", pelo: "#141418", peinado: "rizos", ojos: "#5a3a22", labios: "#b0625a", traje: "#3d7a3a", panel: "#1f3c6e", cuello: "#1f3c6e", detalle: "#1f3c6e",
    guantes: "#3d7a3a", botas: "#2c5a2a", mochila: "#8f959c", rayas: true, parches: "nadia", mujer: true, altura: 1.7, k: 0.92, semilla: 22 },
  { id: "kenji", malla: "kenji", corto: "Kenji", nombre: "Capitán Kenji Morita", rol: "Comandante · Clanes", bio: "Comandante veterano. Dirige la estación y los clanes con mano firme.",
    piel: "#deb08a", pelo: "#b4b4b4", peinado: "atras", barba: "corta", ojos: "#3b2a1e", labios: "#b07468", traje: "#e2721f", panel: "#cf6316", cuello: "#4a4f57", detalle: "#5b6068",
    guantes: "#5b6068", botas: "#d0681c", mochila: "#e2721f", arnes: "#6b7079", consola: true, parches: "kenji", altura: 1.76, k: 1.05, semilla: 33 },
  { id: "bruno", malla: "bruno", corto: "Bruno", nombre: "Bruno «Llave» Kowalski", rol: "Mecánico del hangar", bio: "Mecánico del hangar. Si tiene tornillos, Bruno lo arregla.",
    piel: "#d6a482", pelo: "#4a3222", peinado: "cresta", barba: "larga", ojos: "#4a3020", labios: "#a8665c", traje: "#c0661f", panel: "#2a2c31", cuello: "#2a2c31", detalle: "#2a2c31",
    guantes: "#c0661f", botas: "#2a2c31", mochila: "#34373d", arnes: "#22242a", herramientas: true, sucio: true, parches: "bruno", altura: 1.9, k: 1.18, semilla: 44 },
  { id: "astro", malla: "astro", corto: "Astronauta", nombre: "Astronauta", rol: "Ingeniero de vuelo", bio: "Ingeniero de vuelo. Siempre lleva el casco bajo el brazo, por si acaso.",
    piel: "#e0b08c", pelo: "#5a4630", peinado: "atras", ojos: "#4a6a8a", labios: "#b06c60", traje: "#d9dde3", panel: "#8a919b", cuello: "#8a919b", detalle: "#5b6068",
    guantes: "#6b7079", botas: "#4a4f57", mochila: "#b8bec7", parches: "kenji", altura: 1.82, k: 1.02, semilla: 55 },
  { id: "piloto", malla: "piloto", corto: "Piloto", nombre: "Piloto", rol: "Piloto de pruebas", bio: "Piloto de pruebas. Vuela primero y pregunta después.",
    piel: "#e3b894", pelo: "#2a2018", peinado: "puntas", ojos: "#3a6a4a", labios: "#b8695f", traje: "#2f3b52", panel: "#c9d2de", cuello: "#c9d2de", detalle: "#3a414c",
    guantes: "#2a2f3a", botas: "#1d2027", mochila: "#2f3b52", altura: 1.85, k: 1.0, semilla: 66 },
];

const M = HG.malla, V = (x, y, z) => new T.Vector3(x, y, z), cache = {};
const una = (k, f) => cache[k] || (cache[k] = f());
const sstep = (a, b, x) => { const t = HG.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (dx, dy, s) => Math.exp(-(dx * dx + dy * dy) / (s * s));
// Oscurece (f < 1) o aclara hacia el blanco (f > 1)
const tono = (c, f) => "#" + (f <= 1 ? new T.Color(c).multiplyScalar(f) : new T.Color(c).lerp(new T.Color(1, 1, 1), f - 1)).getHexString();
const ESF = new T.SphereGeometry(1, 20, 14), ESF_BAJA = new T.IcosahedronGeometry(1, 1);

// ---------- Geometrías auxiliares ----------
const lathe = (pts, seg = 20) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(Math.max(0, r), y)), seg);
// Normales suaves también en las costuras y los polos
function suave(g) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, mapa = new Map(), s = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i).toFixed(5) + "," + p.getY(i).toFixed(5) + "," + p.getZ(i).toFixed(5);
    const l = mapa.get(k); if (l) l.push(i); else mapa.set(k, [i]);
  }
  for (const l of mapa.values()) if (l.length > 1) {
    s.set(0, 0, 0); for (const i of l) { s.x += n.getX(i); s.y += n.getY(i); s.z += n.getZ(i); }
    s.normalize(); for (const i of l) n.setXYZ(i, s.x, s.y, s.z);
  }
  return g;
}
// Tubo que se estrecha de r0 a r1 a lo largo de una curva (mechones de pelo, cables, cejas)
function mechon(pts, r0, r1, seg = 8, rad = 5, cerrado = false) {
  const curva = new T.CatmullRomCurve3(pts, cerrado, "centripetal");
  const g = new T.TubeGeometry(curva, seg, 1, rad, cerrado), p = g.attributes.position, c = new T.Vector3(), v = new T.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, r = cerrado ? r0 : HG.lerp(r0, r1, Math.pow(t, 1.4));
    curva.getPointAt(t, c);
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; v.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, v.x, v.y, v.z); }
  }
  return g;
}
// Cinta plana (correas, tirantes): sección rectangular de ancho x grueso orientada con "lado"
function cinta(pts, ancho, grueso, lado = V(1, 0, 0)) {
  const curva = new T.CatmullRomCurve3(pts), seg = pts.length * 4;
  const g = new T.TubeGeometry(curva, seg, 1, 4, false), p = g.attributes.position;
  const c = new T.Vector3(), tg = new T.Vector3(), lat = new T.Vector3(), nor = new T.Vector3(), v = new T.Vector3();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg; curva.getPointAt(t, c); curva.getTangentAt(t, tg);
    lat.copy(lado).addScaledVector(tg, -lado.dot(tg)).normalize(); nor.crossVectors(tg, lat).normalize();
    for (let j = 0; j <= 4; j++) {
      const a = j / 4 * Math.PI * 2 + Math.PI / 4;
      v.copy(c).addScaledVector(lat, Math.sign(Math.cos(a)) * ancho / 2).addScaledVector(nor, Math.sign(Math.sin(a)) * grueso / 2);
      p.setXYZ(i * 5 + j, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals(); return g;
}
const capsula = (r, l) => una("cap" + r + "|" + l, () => {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI / 2; pts.push([Math.cos(a) * r, -l + r + Math.sin(a) * r]); }
  for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push([Math.cos(a) * r, -r + Math.sin(a) * r]); }
  return lathe(pts, 10);
});
// Brazo o pierna que cuelga del pivote, con el músculo en "pos" (0 arriba, 1 abajo); "atras" lo carga hacia la espalda
function extremidad(r0, r1, largo, bulto, pos, atras = 0) {
  return una(["ext", r0, r1, largo, bulto, pos, atras].join(), () => {
    const n = 16, pts = [[0, -largo]];
    for (let i = n; i >= 0; i--) { const t = i / n; pts.push([HG.lerp(r0, r1, t) + bulto * Math.exp(-(((t - pos) / 0.25) ** 2)), -t * largo]); }
    pts.push([0, 0]);
    const g = lathe(pts, 20), p = g.attributes.position;
    if (atras) for (let i = 0; i < p.count; i++) {
      const t = -p.getY(i) / largo, z = p.getZ(i);
      if (z < 0) p.setZ(i, z * (1 + atras * 0.3 * Math.exp(-(((t - pos) / 0.25) ** 2))));
    }
    return suave(g);
  });
}

// ---------- Texturas ----------
function trama(c, w, h, f = 1) {
  for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(0,0,0,${0.035 * f})`; c.fillRect(0, y, w, 1); }
  for (let x = 0; x < w; x += 3) { c.fillStyle = `rgba(255,255,255,${0.025 * f})`; c.fillRect(x, 0, 1, h); }
  for (let i = 0; i < w * h / 40; i++) { c.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${0.05 * f})` : `rgba(255,255,255,${0.04 * f})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
}
function manchas(c, w, h, n, col = "45,30,18") {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = HG.rnd(w / 30, w / 8), g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${HG.rnd(0.15, 0.4)})`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
const texTela = (col, sucio) => una("tela" + col + !!sucio, () => HG.lienzoTex(256, 256, (c, w, h) => {
  c.fillStyle = col; c.fillRect(0, 0, w, h); trama(c, w, h); if (sucio) { c.globalAlpha = 0.45; manchas(c, w, h, 3); c.globalAlpha = 1; }
}, [3, 3]));
const matTela = (col, o = {}) => una("mt" + col + JSON.stringify(o), () => {
  const tx = texTela(col, o.sucio);
  return new T.MeshStandardMaterial({ map: tx, bumpMap: tx, bumpScale: 0.006, roughness: o.r ?? 0.78, metalness: o.m ?? 0 });
});
// Mechas: rayas suaves a lo largo del pelo (vertical para el casquete, horizontal para los mechones)
const texPelo = (col, vertical) => una("pelo" + col + vertical, () => HG.lienzoTex(128, 128, (c, w, h) => {
  c.fillStyle = col; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    c.fillStyle = Math.random() < 0.55 ? tono(col, 0.72) : tono(col, 1.18); c.globalAlpha = HG.rnd(0.15, 0.45);
    const a = Math.random() * w;
    if (vertical) c.fillRect(a, 0, 1, h); else c.fillRect(0, a, w, 1);
  }
  c.globalAlpha = 1;
}));
const texRizos = col => una("rizos" + col, () => HG.lienzoTex(256, 256, (c, w, h) => {
  c.fillStyle = col; c.fillRect(0, 0, w, h); c.lineWidth = 2;
  for (let i = 0; i < 900; i++) {
    c.strokeStyle = Math.random() < 0.5 ? tono(col, 0.6) : tono(col, 1.25); c.globalAlpha = HG.rnd(0.3, 0.7);
    const x = Math.random() * w, y = Math.random() * h, r = HG.rnd(2, 5), a = Math.random() * 6;
    c.beginPath(); c.arc(x, y, r, a, a + 3.5); c.stroke();
  }
  c.globalAlpha = 1;
}, [4, 4]));
const matPelo = (col, vertical) => una("mp" + col + vertical, () => new T.MeshStandardMaterial({ map: texPelo(col, vertical), roughness: 0.55, metalness: 0 }));
const texIris = col => una("iris" + col, () => HG.lienzoTex(64, 64, (c, w, h) => {
  // arriba el centro de la pupila, abajo el borde del iris
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#030303"); g.addColorStop(0.34, "#050505"); g.addColorStop(0.42, tono(col, 0.6)); g.addColorStop(0.68, tono(col, 1.15));
  g.addColorStop(0.86, tono(col, 0.75)); g.addColorStop(1, "#14100c");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 110; i++) {
    c.strokeStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.2)"; c.lineWidth = 1;
    const x = Math.random() * w; c.beginPath(); c.moveTo(x, h * 0.4); c.lineTo(x + HG.rnd(-2, 2), h * HG.rnd(0.7, 0.97)); c.stroke();
  }
}));
// Blanco del ojo, algo más oscuro en las esquinas (el frente del globo está en u = 0.25)
const texEsclera = () => una("esclera", () => HG.lienzoTex(64, 32, (c, w, h) => {
  c.fillStyle = "#b9a8a0"; c.fillRect(0, 0, w, h);
  const g = c.createRadialGradient(w * 0.25, h * 0.52, 0, w * 0.25, h * 0.52, w * 0.3);
  g.addColorStop(0, "#f6f1ec"); g.addColorStop(0.55, "#efe6df"); g.addColorStop(1, "rgba(239,230,223,0)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}));

// ---------- Cabeza ----------
const E = [0.098, 0.118, 0.112], C = 0.12, OJO = [0.36, 0.03], R_OJO = 0.0165;
// Lleva un punto de la esfera unidad (x, y, z) a la cabeza: cráneo, mandíbula, cejas, cuencas, nariz, pómulos, labios y barbilla
function forma(x, y, z, d, sinCuenca) {
  const ax = Math.abs(x), b = sstep(0, -1, y), m = d.mujer ? 0.6 : 1;
  let X = x, Y = y, Z = z;
  if (z < 0) Z *= 1 + 0.1 * sstep(-0.7, 0.3, y);                       // nuca
  X *= 1 + 0.08 * sstep(0.1, 0.7, y); Y *= 1 - 0.07 * sstep(0.4, 1, y);  // cráneo más redondo arriba
  if (y < 0) X *= 1 + (0.38 + 0.22 * m) * (1 - Math.sqrt(Math.max(0, 1 - y * y))); // mandíbula cuadrada
  X *= 1 - 0.27 * b * b * b;                                              // barbilla
  Y *= 1 + 0.15 * b;
  if (z > 0) Z *= 1 - 0.07 * sstep(0.5, 1, z);
  const w = sstep(0.35, 0.75, z);
  if (w > 0) {
    Z += w * (0.04 + 0.015 * m) * Math.exp(-((y - 0.2) ** 2) / 0.008) * sstep(0.65, 0.35, ax);   // arco de las cejas
    if (!sinCuenca) Z -= w * 0.09 * gauss(ax - OJO[0], y - OJO[1], 0.15);                        // cuencas
    Z += w * 0.05 * gauss(ax - 0.47, y + 0.17, 0.17);                                              // pómulos
    const tn = HG.clamp((0.12 - y) / 0.42, 0, 1), dy = y > 0.12 ? y - 0.12 : y < -0.3 ? y + 0.3 : 0;
    Z += w * (0.02 + 0.11 * tn * tn) * Math.exp(-x * x / (0.004 + 0.004 * tn) - dy * dy / 0.003); // nariz
    Z += w * 0.06 * gauss(x, y + 0.31, 0.07);
    Z += w * 0.035 * (gauss(x - 0.1, y + 0.335, 0.055) + gauss(x + 0.1, y + 0.335, 0.055));
    Z += w * 0.03 * Math.exp(-((y + 0.53) ** 2) / 0.002) * sstep(0.3, 0.1, ax);                  // labios
    Z += w * 0.035 * Math.exp(-((y + 0.605) ** 2) / 0.0025) * sstep(0.27, 0.08, ax);
    Z -= w * 0.025 * Math.exp(-((y + 0.73) ** 2) / 0.002) * sstep(0.25, 0.05, ax);                // hoyo bajo el labio
  }
  Z += sstep(0, 0.4, z) * 0.05 * m * gauss(x, y + 0.88, 0.24);                                    // barbilla
  return V(X * E[0], C + Y * E[1], Z * E[2]);
}
// Punto de la cara (vista de frente) separado de la piel un factor f
function sobre(x, y, f, d, z) {
  if (z === undefined) z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const q = forma(x, y, z, d); return V(q.x * f, C + (q.y - C) * f, q.z * f);
}
const geoCabeza = d => una("cab" + !!d.mujer + !!d.npc, () => {
  const g = (d.npc ? new T.SphereGeometry(1, 80, 60) : new T.SphereGeometry(1, 112, 84)).rotateY(-Math.PI / 2), p = g.attributes.position, v = new T.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const q = forma(v.x, v.y, v.z, d); p.setXYZ(i, q.x, q.y, q.z); }
  return suave(g);
});
// Capa sobre la cabeza (pelo, barba) donde el margen es positivo; se separa de la piel según "extra" y se pega a ella en el borde.
// Los vértices justo fuera se llevan al borde para que el contorno quede suave y no a escalones.
function capa(d, margen, extra, borde = 0.1, sw = 96, sh = 72, mover) {
  const g = new T.SphereGeometry(1, sw, sh).rotateY(-Math.PI / 2), p = g.attributes.position, n = p.count, ix = g.index.array;
  const dirs = [], mg = new Float32Array(n), suma = [];
  for (let i = 0; i < n; i++) { const v = new T.Vector3().fromBufferAttribute(p, i); dirs.push(v); mg[i] = margen(v.x, v.y, v.z); }
  for (let t = 0; t < ix.length; t += 3) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    const i = ix[t + a], j = ix[t + b];
    if (mg[i] <= 0 && mg[j] > 0) { const q = dirs[j].clone().lerp(dirs[i], mg[j] / (mg[j] - mg[i])); if (suma[i]) suma[i].add(q); else suma[i] = q; }
  }
  for (let i = 0; i < n; i++) if (suma[i]) { dirs[i].copy(suma[i].normalize()); mg[i] = 1e-5; }
  for (let i = 0; i < n; i++) {
    const v = dirs[i], q = forma(v.x, v.y, v.z, d), e = sstep(0, borde, mg[i]), f = 1 + 0.004 + extra(v.x, v.y, v.z) * e;
    q.set(q.x * f, C + (q.y - C) * f, q.z * f); if (mover) mover(v, q, e);
    p.setXYZ(i, q.x, q.y, q.z);
  }
  const quedan = [];
  for (let t = 0; t < ix.length; t += 3) if (mg[ix[t]] > 0 && mg[ix[t + 1]] > 0 && mg[ix[t + 2]] > 0) quedan.push(ix[t], ix[t + 1], ix[t + 2]);
  g.setIndex(quedan); return suave(g);
}
const margenPelo = (x, y, z) => y - (z > 0 ? 0.16 + 0.6 * z * z + 0.12 * Math.abs(x) * z : 0.16 - 0.62 * z * z);
const lineaPelo = (x, y, z) => margenPelo(x, y, z) > 0;
const margenCresta = (x, y, z) => Math.min(margenPelo(x, y, z), 0.24 - Math.abs(x));
const margenBarba = (x, y, z) => Math.min(0.02 - 0.5 * Math.max(0, z) - y, z + 0.05 + 0.45 * sstep(-0.35, -0.55, y), 0.12 * ((x / 0.3) ** 2 + ((y + 0.575) / 0.115) ** 2 - 1));

// Piel: poros, rubor, sombra de los ojos, labios, fosas nasales, nacimiento del pelo y sombra de barba
const clavePiel = d => [d.piel, d.labios, d.peinado, d.barba, !!d.mujer, d.pelo].join();
const texPiel = d => una("piel" + clavePiel(d), () => HG.lienzoTex(1024, 512, (c, W, H) => {
  const P = (x, y) => { const z = Math.sqrt(Math.max(0, 1 - x * x - y * y)); return [(0.5 + Math.atan2(x, z) / (2 * Math.PI)) * W, Math.acos(HG.clamp(y, -1, 1)) / Math.PI * H]; };
  const Pv = v => [(0.5 + Math.atan2(v.x, v.z) / (2 * Math.PI)) * W, Math.acos(HG.clamp(v.y, -1, 1)) / Math.PI * H];
  c.fillStyle = d.piel; c.fillRect(0, 0, W, H);
  const mancha = (x, y, r, rgb, a) => { const [px, py] = P(x, y), g = c.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(px - r, py - r, 2 * r, 2 * r); };
  for (const s of [-1, 1]) { mancha(s * 0.46, -0.24, 46, "215,95,85", d.mujer ? 0.24 : 0.16); mancha(s * 0.36, 0.08, 26, "80,40,55", 0.2); mancha(s * 0.2, -0.05, 20, "90,50,50", 0.12); }
  mancha(0, -0.31, 18, "210,90,80", 0.14);
  for (let i = 0; i < 12000; i++) { c.fillStyle = Math.random() < 0.5 ? "rgba(120,60,40,0.06)" : "rgba(255,240,230,0.06)"; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  // pelo pintado (nacimiento del pelo, barba, rapado) en una capa aparte escrita píxel a píxel y luego superpuesta
  const capaPelo = document.createElement("canvas"); capaPelo.width = W; capaPelo.height = H;
  const cp = capaPelo.getContext("2d"), img = cp.createImageData(W, H), px = img.data, pc = new T.Color(d.pelo), v = new T.Vector3();
  for (let k = 0; k < px.length; k += 4) { px[k] = pc.r * 255; px[k + 1] = pc.g * 255; px[k + 2] = pc.b * 255; }
  const puntos = (n, margen, a0, ancho, tam) => {
    for (let i = 0; i < n; i++) {
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1); const l = v.lengthSq(); if (l > 1 || l < 0.01) continue; v.normalize();
      const a = a0 * sstep(-ancho, ancho, margen(v.x, v.y, v.z)); if (a < 0.01) continue;
      const [x, y] = Pv(v);
      for (let j = 0; j < tam; j++) for (let q = 0; q < tam; q++) { const k = ((Math.min(H - 1, y + j | 0)) * W + ((x + q) % W | 0)) * 4 + 3; px[k] += (255 - px[k]) * a; }
    }
  };
  if (!d.mujer) puntos(9000, margenBarba, 0.07, 0.15, 2);
  if (d.barba) puntos(26000, margenBarba, 0.45, 0.05, 2);
  if (d.peinado === "cresta") puntos(30000, margenPelo, 0.35, 0.03, 2);
  else puntos(40000, margenPelo, 0.7, 0.05, 3);
  cp.putImageData(img, 0, 0); c.drawImage(capaPelo, 0, 0);
  const curva = (fn, x0, x1, n = 24) => { const r = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; r.push(P(x, fn(x))); } return r; };
  const poli = pts => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  const AN = d.mujer ? 0.25 : 0.27;
  const sup = x => { const a = Math.abs(x) / AN; return -0.5 + 0.018 * Math.exp(-(((Math.abs(x) - 0.07) / 0.05) ** 2)) - 0.045 * a * a; };
  const med = x => -0.565 + 0.012 * (x / AN) ** 2;
  const inf = x => -0.565 - (d.mujer ? 0.085 : 0.07) * (1 - (x / AN) ** 2);
  c.filter = "blur(1.5px)"; c.fillStyle = d.labios;
  poli([...curva(sup, -AN, AN), ...curva(med, AN, -AN)]);
  poli([...curva(med, -AN, AN), ...curva(inf, AN, -AN)]);
  c.fillStyle = "rgba(255,255,255,0.12)"; poli([...curva(x => inf(x) + 0.03, -AN * 0.5, AN * 0.5), ...curva(x => inf(x) + 0.05, AN * 0.5, -AN * 0.5)]);
  c.strokeStyle = "rgba(70,25,25,0.8)"; c.lineWidth = 2.5; c.beginPath(); curva(med, -AN * 1.05, AN * 1.05).forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
  c.fillStyle = "rgba(70,30,25,0.6)"; for (const s of [-1, 1]) { const [px, py] = P(s * 0.055, -0.375); c.beginPath(); c.ellipse(px, py, 6, 3.5, 0, 0, 6.283); c.fill(); }
  c.filter = "none";
}));
const matPiel = d => una("mpiel" + clavePiel(d), () => new T.MeshStandardMaterial({ map: texPiel(d), roughness: 0.58, metalness: 0, emissive: HG.lin(d.piel), emissiveIntensity: 0.04 }));
const geoOreja = una("oreja", () => new T.TorusGeometry(0.018, 0.0042, 6, 16, Math.PI * 1.4).rotateZ(1.3 * Math.PI).rotateY(Math.PI / 2));
const PARPADO = -0.06;

function cabeza(padre, d, h) {
  const mPiel = matPiel(d), mLisa = HG.mat(d.piel, { r: 0.6 });
  M(geoCabeza(d), mPiel, 0, 0, 0, padre);
  for (const s of [-1, 1]) {
    const p = forma(s * 0.985, -0.1, -0.12, d), o = HG.pivote(padre, p.x, p.y, p.z); o.rotation.y = -s * 0.3;
    M(ESF, mLisa, s * 0.004, 0, 0, o).scale.set(0.008, 0.03, 0.02);
    M(geoOreja, mLisa, s * 0.007, 0.002, 0, o);
  }
  // ojos: globo, iris con pupila, brillo, párpados y pestañas
  h.ojos = []; h.parpados = [];
  const mBlanco = una("mescl", () => new T.MeshStandardMaterial({ map: texEsclera(), roughness: 0.2 })), mPest = HG.mat("#17110d", { r: 0.7 });
  const mIris = una("miris" + d.ojos, () => new T.MeshStandardMaterial({ map: texIris(d.ojos), roughness: 0.06, metalness: 0 }));
  for (const s of [-1, 1]) {
    const q = forma(s * OJO[0], OJO[1], Math.sqrt(1 - OJO[0] ** 2 - OJO[1] ** 2), d, true);
    const o = HG.pivote(padre, q.x, q.y, q.z - 0.55 * R_OJO);
    M(una("globo", () => new T.SphereGeometry(R_OJO, 24, 16)), mBlanco, 0, 0, 0, o, false);
    M(una("iris", () => new T.SphereGeometry(R_OJO * 1.012, 24, 8, 0, Math.PI * 2, 0, 0.58).rotateX(Math.PI / 2)), mIris, 0, 0, 0, o, false);
    M(una("chispa", () => new T.SphereGeometry(0.0013, 8, 6)), HG.brillo("#ffffff"), -0.004, 0.005, R_OJO * 0.97, o, false);
    M(una("parpInf", () => new T.SphereGeometry(R_OJO * 1.06, 24, 6, 0, Math.PI * 2, Math.PI - 0.8, 0.8)), mLisa, 0, 0, 0, o, false);
    const pa = HG.pivote(o); pa.rotation.x = PARPADO;
    M(una("parp", () => new T.SphereGeometry(R_OJO * 1.1, 24, 10, 0, Math.PI * 2, 0, 1.25)), mLisa, 0, 0, 0, pa, false);
    M(una("pest" + s + !!d.mujer, () => {
      const pts = [], R = R_OJO * 1.13, th = 1.25;
      for (let i = 0; i <= 8; i++) { const ph = HG.lerp(-s * 0.95, s * 1.05, i / 8), fl = d.mujer ? 1 + 0.12 * Math.pow(i / 8, 3) : 1; pts.push(V(Math.sin(th) * Math.sin(ph) * R * fl, Math.cos(th) * R * fl, Math.sin(th) * Math.cos(ph) * R)); }
      return mechon(pts, 0.0008, d.mujer ? 0.0017 : 0.0011, 12, 4);
    }), mPest, 0, 0, 0, pa, false);
    h.ojos.push(o); h.parpados.push(pa);
  }
  // cejas: varios trazos finos siguiendo el arco
  const mCeja = HG.mat(tono(d.pelo, d.pelo === "#141418" ? 1 : 0.72), { r: 0.85 });
  for (const s of [-1, 1]) for (let j = 0; j < 5; j++) {
    const pts = [];
    for (let i = 0; i <= 6; i++) { const u = i / 6, x = 0.11 + u * 0.46, y = 0.19 + 0.06 * Math.sin(Math.PI * Math.min(1, u * 1.3)) - 0.03 * u + (j - 2) * 0.011 * (1 - u * 0.6); pts.push(sobre(s * x, y, 1.01, d)); }
    M(mechon(pts, (d.k > 1 ? 0.0042 : 0.0034) * (1 - Math.abs(j - 2) * 0.15), 0.0014, 10, 4), mCeja, 0, 0, 0, padre, false);
  }
  peinado(padre, d);
}

function peinado(padre, d) {
  const r = HG.semilla(d.semilla), mCas = matPelo(d.pelo, true), mPelo = matPelo(d.pelo, false);
  const en = (v, f) => { const q = forma(v.x, v.y, v.z, d); return V(q.x * f, C + (q.y - C) * f, q.z * f); };
  const dirPelo = (filtro = () => true) => { for (;;) { const v = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); const l = v.lengthSq(); if (l > 1 || l < 0.01) continue; v.normalize(); if (lineaPelo(v.x, v.y, v.z) && filtro(v)) return v; } };
  const dirA = (x, a) => V(x, Math.cos(a), Math.sin(a)).normalize(); // a: ángulo desde arriba hacia delante
  if (d.peinado === "puntas") {
    M(capa(d, margenPelo, () => 0.03), mCas, 0, 0, 0, padre);
    for (let i = 0; i < 120; i++) {
      const v = dirPelo(), raiz = en(v, 0.995), del = v.z > 0.45;
      const dir = v.clone().add(del ? V(0, 0.35, 0.2) : V(0, 0.45, -0.75)).normalize(), L = 0.035 + r() * 0.04 + Math.max(0, v.y) * 0.02;
      const p1 = raiz.clone().addScaledVector(v, L * 0.3).addScaledVector(dir, L * 0.25);
      const p2 = raiz.clone().addScaledVector(dir, L * 0.75).addScaledVector(v, L * 0.15);
      M(mechon([raiz, p1, p2, raiz.clone().addScaledVector(dir, L)], 0.013 + r() * 0.008, 0.0012, 8, 5), mPelo, 0, 0, 0, padre);
    }
    for (let i = 0; i < 11; i++) { // flequillo que cae hacia la frente
      const x = (i / 10 - 0.5) * 1.1 + (r() - 0.5) * 0.08, lado = Math.sign(x) * 0.07;
      M(mechon([en(dirA(x * 0.6, 0.6), 0.995), en(dirA(x * 0.75, 0.82), 1.08), en(dirA(x * 0.85 + lado, 1.05), 1.1), en(dirA(x * 0.9 + lado * 2, 1.18 + r() * 0.08), 1.07)], 0.013, 0.0015, 10, 5), mPelo, 0, 0, 0, padre);
    }
  } else if (d.peinado === "rizos") { // volumen rizado con bultos
    const bulto = (x, y, z) => Math.abs(Math.sin(x * 23 + 1.7) * Math.sin(y * 21 + 0.4) * Math.sin(z * 25 + 2.2));
    const mRizo = una("mrizo" + d.pelo, () => new T.MeshStandardMaterial({ map: texRizos(d.pelo), bumpMap: texRizos(d.pelo), bumpScale: 0.003, roughness: 0.85 }));
    M(capa(d, margenPelo, (x, y, z) => 0.08 + 0.07 * sstep(0.2, 0.9, y) + 0.07 * sstep(0, -0.8, z) + 0.04 * bulto(x, y, z), 0.12, 128, 96), mRizo, 0, 0, 0, padre);
    for (let i = 0; i < 260; i++) {
      const v = dirPelo(), f = 1.1 + 0.07 * Math.max(0, v.y) + 0.07 * Math.max(0, -v.z) + r() * 0.03, s = 0.009 + r() * 0.008;
      const b = M(ESF_BAJA, mRizo, 0, 0, 0, padre); b.position.copy(en(v, f)); b.scale.set(s, s * 0.8, s);
    }
  } else if (d.peinado === "atras") {
    M(capa(d, margenPelo, () => 0.035), mCas, 0, 0, 0, padre);
    const mCana = matPelo(tono(d.pelo, 1.35), false);
    for (let i = 0; i < 60; i++) {
      const x0 = (r() * 2 - 1) * 0.78, pts = [];
      for (let q = 0; q <= 6; q++) { const u = q / 6, a = 0.85 - u * 2.75; pts.push(en(dirA(x0 * (1 - 0.15 * u), a), 1.02 + 0.022 * Math.sin(Math.PI * u) + r() * 0.006)); }
      M(mechon(pts, 0.011 + r() * 0.004, 0.003, 14, 5), i % 3 ? mPelo : mCana, 0, 0, 0, padre);
    }
  } else if (d.peinado === "cresta") {
    M(capa(d, margenCresta, () => 0.03, 0.06), mCas, 0, 0, 0, padre);
    for (let i = 0; i < 60; i++) {
      const u = i / 59, v = dirA((r() * 2 - 1) * 0.17, 0.85 - u * 2.4), raiz = en(v, 0.995), L = 0.05 + 0.05 * Math.sin(Math.PI * Math.min(1, u * 1.2)) + r() * 0.015;
      const dir = v.clone().add(V(0, 0.35, -0.4)).normalize();
      M(mechon([raiz, raiz.clone().addScaledVector(v, L * 0.5), raiz.clone().addScaledVector(dir, L)], 0.017 + r() * 0.006, 0.0025, 8, 5), mPelo, 0, 0, 0, padre);
    }
  }
  if (d.barba) {
    const larga = d.barba === "larga";
    // la barba larga cuelga: se separa más de la cara y baja hacia el pecho
    M(capa(d, margenBarba, (x, y, z) => larga ? 0.04 + 0.12 * sstep(-0.5, -1, y) : 0.025, 0.08, 96, 72,
      larga ? (v, q, f) => { q.y -= 0.07 * f * sstep(-0.45, -0.95, v.y) * sstep(-0.4, 0.3, v.z); q.z += 0.012 * f * sstep(-0.5, -0.9, v.y); } : null), mCas, 0, 0, 0, padre);
    for (const s of [-1, 1]) M(mechon([sobre(s * 0.02, -0.425, 1.05, d), sobre(s * 0.16, -0.455, 1.06, d), sobre(s * 0.28, -0.54, 1.03, d), sobre(s * (larga ? 0.31 : 0.3), larga ? -0.66 : -0.6, 1.01, d)], 0.009, 0.003, 10, 5), mPelo, 0, 0, 0, padre);
    if (larga) for (let i = 0; i < 26; i++) { // puntas de la barba
      const x = (r() * 2 - 1) * 0.42, base = sobre(x, -0.95 + Math.abs(x) * 0.3, 1.1, d); base.y -= 0.05;
      M(mechon([base, base.clone().add(V(0, -0.03, 0.008)), V(base.x * 0.75, base.y - 0.05 - r() * 0.03, base.z - 0.005)], 0.011, 0.002, 8, 5), mPelo, 0, 0, 0, padre);
    }
  }
}

// ---------- Traje ----------
const TORSO = [[0, 0], [0.15, 0], [0.156, 0.04], [0.149, 0.1], [0.152, 0.17], [0.168, 0.25], [0.188, 0.33], [0.2, 0.4], [0.197, 0.455], [0.172, 0.5], [0.12, 0.528], [0.06, 0.545], [0, 0.55]];
const vTorso = y => { for (let j = 1; j < TORSO.length; j++) { const a = TORSO[j - 1][1], b = TORSO[j][1]; if (y <= b) return (j - 1 + (b > a ? (y - a) / (b - a) : 1)) / (TORSO.length - 1); } return 1; };
const radioTorso = y => { for (let j = 1; j < TORSO.length; j++) { const a = TORSO[j - 1], b = TORSO[j]; if (y <= b[1]) return b[1] > a[1] ? HG.lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1])) : b[0]; } return 0; };
const pecho = (x, y, d) => {
  const ax = Math.abs(x), k = d.k;
  if (d.mujer) return 0.034 * Math.exp(-(((y - 0.355) / 0.055) ** 2) - (((ax - 0.072) / 0.05) ** 2)) + 0.01 * Math.exp(-(((y - 0.38) / 0.1) ** 2));
  return 0.022 * k * Math.exp(-(((y - 0.37) / 0.065) ** 2) - (((ax - 0.075 * k) / 0.075) ** 2)) + 0.006 * Math.exp(-(((y - 0.2) / 0.08) ** 2));
};
const espalda = (x, y, d) => 0.014 * Math.exp(-(((y - 0.4) / 0.07) ** 2) - (((Math.abs(x) - 0.08 * d.k) / 0.06) ** 2));
// Superficie del torso: z delante (s = 1) o detrás (s = -1) a una altura y
const zTorso = (x, y, s, d) => { const R = radioTorso(y) * d.k, base = 0.66 * Math.sqrt(Math.max(0, R * R - x * x)), cf = R > 0 ? base / (0.66 * R) : 0; return s * (base + cf * (s > 0 ? pecho(x, y, d) : espalda(x, y, d))); };
const geoTorso = d => una("torso" + d.k + !!d.mujer, () => {
  const g = lathe(TORSO.map(([r, y]) => [r * d.k, y]), 56), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), R = radioTorso(y) * d.k; let z = p.getZ(i) * 0.66;
    const cf = R > 0 ? HG.clamp(z / (0.66 * R), -1, 1) : 0;
    z += cf > 0 ? cf * pecho(x, y, d) : cf * espalda(x, y, d); p.setZ(i, z);
  }
  return suave(g);
});
// Torso: u = 0 delante (cremallera en los dos bordes), u = 0.25 el costado izquierdo, v = 0 la cintura
const texTraje = d => una("traje" + d.id + d.traje + d.panel + d.parches + !!d.rayas + !!d.sucio, () => HG.lienzoTex(1024, 1024, (c, W, H) => {
  const X = u => u * W, Y = y => (1 - vTorso(y)) * H;
  c.fillStyle = d.traje; c.fillRect(0, 0, W, H); trama(c, W, H);
  const canesu = u => 0.435 - 0.035 * Math.exp(-((Math.min(u, 1 - u) / 0.06) ** 2));
  const linea = (pts, col, an, dash) => { c.strokeStyle = col; c.lineWidth = an; c.setLineDash(dash || []); c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]); };
  const borde = []; for (let u = 0; u <= 1.0001; u += 0.01) borde.push([X(u), Y(canesu(u))]);
  if (!d.rayas) { c.fillStyle = d.panel; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); for (let i = borde.length - 1; i >= 0; i--) c.lineTo(...borde[i]); c.closePath(); c.fill(); }
  linea(borde, "rgba(0,0,0,0.45)", 3); linea(borde.map(([x, y]) => [x, y + 7]), "rgba(255,255,255,0.28)", 1.5, [6, 5]);
  if (d.rayas) for (const u of [0.25, 0.75]) {
    c.fillStyle = d.panel; c.fillRect(X(u - 0.045), 0, X(0.09), H);
    for (const e of [-0.045, 0.045]) { linea([[X(u + e), 0], [X(u + e), H]], "rgba(0,0,0,0.4)", 3); linea([[X(u + e * 0.8), 0], [X(u + e * 0.8), H]], "rgba(255,255,255,0.3)", 1.5, [6, 5]); }
  } else for (const u of [0.25, 0.75]) linea([[X(u), Y(canesu(u))], [X(u), H]], "rgba(0,0,0,0.35)", 3);
  // cintura y pliegues
  c.fillStyle = "rgba(0,0,0,0.22)"; c.fillRect(0, Y(0.045), W, H - Y(0.045));
  linea([[0, Y(0.045)], [W, Y(0.045)]], "rgba(255,255,255,0.3)", 1.5, [6, 5]);
  c.filter = "blur(4px)";
  for (let i = 0; i < 26; i++) { const u = Math.random(), y = HG.rnd(0.06, 0.2); linea([[X(u), Y(y)], [X(u + HG.rnd(-0.03, 0.03)), Y(y + HG.rnd(0.03, 0.07))]], "rgba(0,0,0,0.12)", 6); }
  for (const u of [0.22, 0.28, 0.72, 0.78]) linea([[X(u), Y(0.45)], [X(u + (u % 0.5 < 0.25 ? 0.03 : -0.03)), Y(0.33)]], "rgba(0,0,0,0.14)", 8);
  c.filter = "none";
  // cremallera
  for (const x0 of [0, W - 9]) {
    c.fillStyle = "#1a1c20"; c.fillRect(x0, Y(0.535), 9, H);
    c.fillStyle = "#8d939b"; for (let y = Y(0.535); y < Y(0.05); y += 6) c.fillRect(x0 + (x0 ? 1 : 3), y, 5, 3);
  }
  c.fillStyle = "#c2c8cf"; c.fillRect(0, Y(0.51), 6, 26); c.fillRect(W - 6, Y(0.51), 6, 26);
  // parches y nombre (escala vertical para compensar el estiramiento del torso)
  const parche = (u, y, fn) => { c.save(); c.translate(X(u), Y(y)); c.scale(1, 1.45); fn(); c.restore(); };
  const placa = (u, y, txt, fondo = "#1c1f25", col = "#e9edf2") => parche(u, y, () => {
    c.font = "bold 20px Arial, sans-serif"; const w = c.measureText(txt).width + 16;
    c.fillStyle = fondo; c.fillRect(-w / 2, -13, w, 26); c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 1.5; c.setLineDash([4, 3]); c.strokeRect(-w / 2 + 3, -10, w - 6, 20); c.setLineDash([]);
    c.fillStyle = col; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 0, 1);
  });
  const redondo = (u, y, fondo, borde2, dibujo) => parche(u, y, () => {
    c.fillStyle = fondo; c.beginPath(); c.arc(0, 0, 30, 0, 6.283); c.fill();
    c.strokeStyle = borde2; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 28, 0, 6.283); c.stroke(); dibujo();
  });
  const espaldaTxt = (txt, col) => parche(0.5, 0.38, () => { c.font = "bold 34px Arial, sans-serif"; c.fillStyle = col; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, 0, 0); });
  if (d.parches === "haluski") {
    redondo(0.085, 0.37, "#13213f", "#d4a63a", () => {
      c.fillStyle = "#f08a2c"; c.beginPath(); c.arc(0, 2, 11, 0, 6.283); c.fill();
      c.strokeStyle = "#f3d7a0"; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 2, 19, 6, -0.3, 0, 6.283); c.stroke();
      c.fillStyle = "#fff"; for (const [x, y] of [[-15, -14], [13, -16], [17, 12], [-18, 10]]) c.fillRect(x, y, 2.5, 2.5);
    });
    placa(0.915, 0.375, "HALUSKI"); espaldaTxt("HALUSKI", "rgba(220,228,240,0.85)");
  } else if (d.parches === "nadia") {
    redondo(0.085, 0.37, "#1f3c6e", "#e4e8ee", () => {
      c.fillStyle = "#7fd36b"; c.beginPath(); c.moveTo(0, -20); c.lineTo(6, 0); c.lineTo(0, 20); c.lineTo(-6, 0); c.closePath(); c.fill();
      c.fillStyle = "#e4e8ee"; c.beginPath(); c.moveTo(-20, 0); c.lineTo(0, 5); c.lineTo(20, 0); c.lineTo(0, -5); c.closePath(); c.fill();
    });
    placa(0.915, 0.375, "REYES"); espaldaTxt("EXPLORACIÓN", "rgba(230,240,230,0.8)");
  } else if (d.parches === "kenji") {
    parche(0.11, 0.42, () => { c.fillStyle = "#1c1f25"; c.fillRect(-26, -16, 52, 32); c.fillStyle = "#e0b448"; for (let i = 0; i < 3; i++) c.fillRect(-20, -11 + i * 9, 40, 5); });
    placa(0.89, 0.42, "MORITA"); espaldaTxt("MANDO", "rgba(30,32,38,0.75)");
  } else if (d.parches === "bruno") {
    redondo(0.085, 0.37, "#2a2c31", "#c0661f", () => {
      c.strokeStyle = "#d9dde2"; c.lineWidth = 6; c.lineCap = "round";
      for (const a of [-0.8, 0.8]) { c.save(); c.rotate(a); c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 18); c.stroke(); c.beginPath(); c.arc(0, -19, 6, 0.6, 2.5, true); c.stroke(); c.restore(); }
    });
    placa(0.915, 0.375, "KOWALSKI"); espaldaTxt("TALLER", "rgba(30,32,38,0.75)");
  }
  if (d.sucio) { manchas(c, W, H, 30); manchas(c, W, H, 10, "20,20,20"); }
}));
// Parche del hombro (en la manga)
const texHombro = d => una("hombro" + d.id, () => HG.lienzoTex(128, 96, (c, w, h) => {
  c.fillStyle = "#1a1d23"; c.fillRect(0, 0, w, h);
  c.fillStyle = d.panel; c.fillRect(6, 6, w - 12, h - 12);
  c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 2; c.setLineDash([5, 4]); c.strokeRect(10, 10, w - 20, h - 20); c.setLineDash([]);
  c.fillStyle = "#f2f4f7"; c.font = "bold 40px Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText((d.corto || d.nombre || "H")[0], w / 2, h / 2 + 2);
}));
const texPantalla = () => una("pantalla", () => HG.lienzoTex(128, 64, (c, w, h) => {
  c.fillStyle = "#04151b"; c.fillRect(0, 0, w, h); c.strokeStyle = "#3fe0ff"; c.lineWidth = 2; c.beginPath();
  for (let x = 4; x < 80; x += 3) c.lineTo(x, 34 + Math.sin(x * 0.25) * 10 + HG.rnd(-3, 3)); c.stroke();
  c.fillStyle = "#ffb03a"; for (let i = 0; i < 4; i++) c.fillRect(90, 10 + i * 12, 26 - i * 5, 6);
  c.fillStyle = "#3fe0ff"; c.font = "bold 10px Arial"; c.fillText("RUMBO 042", 6, 12);
}));
const texAnillos = () => una("anillos", () => HG.lienzoTex(64, 8, (c, w, h) => { c.fillStyle = "#a5acb5"; c.fillRect(0, 0, w, h); c.fillStyle = "#5c636c"; for (let x = 0; x < w; x += 8) c.fillRect(x, 0, 3, h); }, [24, 1]));

// ---------- Fusión: une las mallas de cada hueso que comparten material ----------
function fusionar(raiz) {
  const grupos = []; raiz.traverse(o => { if (!o.isMesh) grupos.push(o); });
  for (const g of grupos) {
    const cubos = new Map();
    for (const o of g.children) if (o.isMesh && !o.userData.solo) {
      const k = o.material.uuid + (o.castShadow ? "s" : ""); if (!cubos.has(k)) cubos.set(k, []); cubos.get(k).push(o);
    }
    for (const lista of cubos.values()) {
      if (lista.length < 2) continue;
      const geos = lista.map(o => {
        o.updateMatrix();
        const q = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        for (const n of Object.keys(q.attributes)) if (n !== "position" && n !== "normal" && n !== "uv") q.deleteAttribute(n);
        if (!q.attributes.uv) q.setAttribute("uv", new T.BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2));
        if (!q.attributes.normal) q.computeVertexNormals();
        q.clearGroups(); q.morphAttributes = {}; q.applyMatrix4(o.matrix); return q;
      });
      const unida = T.BufferGeometryUtils.mergeBufferGeometries(geos);
      geos.forEach(q => q.dispose());
      if (!unida) continue;
      const m = M(unida, lista[0].material, 0, 0, 0, null, false); m.castShadow = lista[0].castShadow; m.receiveShadow = lista[0].receiveShadow;
      lista.forEach(o => g.remove(o)); g.add(m);
    }
  }
}

// ---------- Cuerpo ----------
// Animación por huesos (los mismos nombres en los personajes de código y en los de malla)
HG.animacion = (h, cadera, col, cadY, opc = {}) => {
  const reposoZ = opc.reposoZ ?? 0.1;
  let parpadeo = HG.rnd(1, 4), mirada = 0, mirarA = 0;
  return (estado, t, dt = 0.016) => {
    // postura neutra
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1;
      h.hombros[i].rotation.set(0.04, 0, s * reposoZ); h.codos[i].rotation.set(-0.15, 0, 0); h.manos[i].rotation.set(0, 0, 0);
      h.muslos[i].rotation.set(0, 0, 0); h.rodillas[i].rotation.set(0, 0, 0); h.tobillos[i].rotation.set(0, 0, 0);
    }
    col.rotation.set(0, 0, 0); h.cabeza.rotation.set(0, 0, 0); cadera.position.set(0, cadY, 0); cadera.rotation.set(0, 0, 0);
    if (estado === "andar" || estado === "correr") {
      const c = estado === "correr", f = t * (c ? 11 : 7.5), A = c ? 0.95 : 0.55;
      for (let i = 0; i < 2; i++) {
        const ph = f + i * Math.PI;
        h.muslos[i].rotation.x = -Math.sin(ph) * A;
        h.rodillas[i].rotation.x = Math.max(0, Math.sin(ph - 1.3)) * (c ? 1.5 : 0.9) + 0.05;
        h.tobillos[i].rotation.x = Math.sin(ph - 0.6) * (c ? 0.35 : 0.22);
        h.hombros[i].rotation.x = Math.sin(ph) * (c ? 0.9 : 0.45);
        h.codos[i].rotation.x = c ? -1.25 : -0.35 - Math.max(0, -Math.sin(ph)) * 0.25;
      }
      cadera.position.y = cadY - Math.abs(Math.cos(f)) * (c ? 0.05 : 0.025) + (c ? 0.02 : 0);
      cadera.rotation.y = Math.sin(f) * (c ? 0.12 : 0.08); cadera.rotation.z = Math.cos(f) * 0.03;
      col.rotation.x = c ? 0.22 : 0.04; col.rotation.y = -Math.sin(f) * (c ? 0.2 : 0.13); col.rotation.z = -cadera.rotation.z;
      h.cabeza.rotation.y = Math.sin(f) * 0.05; h.cabeza.rotation.x = c ? -0.12 : 0;
    } else if (estado === "saltar") {
      for (let i = 0; i < 2; i++) { h.muslos[i].rotation.x = -0.7 + i * 0.4; h.rodillas[i].rotation.x = 1.1 - i * 0.4; h.tobillos[i].rotation.x = 0.3; h.hombros[i].rotation.set(-0.5, 0, (i ? 1 : -1) * 0.9); h.codos[i].rotation.x = -0.5; }
      col.rotation.x = 0.08;
    } else if (estado === "picar") {
      const u = (t * 2.2) % 1, sw = u < 0.55 ? u / 0.55 : 1 - (u - 0.55) / 0.45;
      h.hombros[0].rotation.x = -2.6 + (1 - sw) * 2.2; h.hombros[1].rotation.x = -2.2 + (1 - sw) * 1.8;
      h.codos[0].rotation.x = -0.4; h.codos[1].rotation.x = -0.6;
      col.rotation.x = 0.1 + (1 - sw) * 0.35; h.muslos[0].rotation.x = -0.35; h.rodillas[0].rotation.x = 0.4; h.muslos[1].rotation.x = 0.15; h.rodillas[1].rotation.x = 0.1;
    } else if (estado === "saludar") {
      h.hombros[0].rotation.set(0, 0, -2.5); h.codos[0].rotation.set(0, 0, -0.4 + Math.sin(t * 9) * 0.45);
      h.cabeza.rotation.z = 0.1; col.rotation.z = 0.04;
      h.hombros[1].rotation.x = Math.sin(t * 1.6) * 0.03;
    } else if (estado === "pilotar") {
      for (let i = 0; i < 2; i++) { h.muslos[i].rotation.x = -1.5; h.rodillas[i].rotation.x = 1.5; h.hombros[i].rotation.x = -0.9; h.codos[i].rotation.x = -0.6; }
      cadera.position.y = cadY * 0.57;
    } else { // quieto: respiración, peso que pasa de una pierna a otra y mirada
      const p = Math.sin(t * 0.5), r = Math.sin(t * 1.6);
      cadera.position.x = p * 0.012; cadera.rotation.z = p * 0.035; cadera.position.y = cadY - Math.abs(p) * 0.004;
      for (let i = 0; i < 2; i++) { h.muslos[i].rotation.z = -cadera.rotation.z; h.tobillos[i].rotation.z = 0; h.hombros[i].rotation.x = r * 0.03 + 0.04; }
      h.rodillas[p > 0 ? 0 : 1].rotation.x = Math.abs(p) * 0.12; h.muslos[p > 0 ? 0 : 1].rotation.x = -Math.abs(p) * 0.06;
      col.rotation.x = r * 0.02; col.rotation.z = -cadera.rotation.z * 0.7;
      h.cabeza.rotation.y = Math.sin(t * 0.45) * 0.25; h.cabeza.rotation.z = cadera.rotation.z * 0.3;
    }
    // ojos: pequeños movimientos y parpadeo
    mirada -= dt; if (mirada < 0) { mirada = HG.rnd(0.6, 2.2); mirarA = HG.rnd(-0.2, 0.2); }
    for (const o of h.ojos) o.rotation.y = HG.lerp(o.rotation.y, mirarA, Math.min(1, dt * 20));
    parpadeo -= dt; const cerrado = parpadeo < 0.12;
    if (parpadeo < 0) parpadeo = HG.rnd(2, 5);
    for (const pa of h.parpados) pa.rotation.x = cerrado ? 1.35 : PARPADO;
  };
};

// Pico del minero en la mano derecha (solo se ve al picar)
HG.hacerPico = (mano) => {
  const pico = HG.pivote(mano, 0, -0.06, 0), mS = HG.mat("#16181c", { r: 0.85 }), mOscuro = HG.mat("#2b2f36", { r: 0.5, m: 0.5 }), mMetal = HG.mat("#c4cad2", { r: 0.28, m: 0.9 });
  M(new T.CylinderGeometry(0.013, 0.015, 0.72, 10).rotateX(Math.PI / 2), HG.mat("#6b4a2e", { r: 0.8 }), 0, 0, 0.24, pico);
  for (let i = 0; i < 4; i++) M(new T.TorusGeometry(0.016, 0.004, 6, 12), mS, 0, 0, -0.06 + i * 0.03, pico);
  M(HG.cajaR(0.04, 0.05, 0.05, 0.01), mOscuro, 0, 0, 0.59, pico);
  for (const s of [-1, 1]) M(mechon([V(0, 0, 0.59), V(0, s * 0.1, 0.6), V(0, s * 0.2, 0.575)], 0.022, 0.004, 8, 6), mMetal, 0, 0, 0, pico);
  pico.visible = false; return pico;
};

const crearProcedural = (d) => {
  const k = d.k, raiz = new T.Group(), h = {};
  const mT = matTela(d.traje, { sucio: d.sucio }), mP = matTela(d.panel, { sucio: d.sucio }), mD = HG.mat(d.detalle, { r: 0.45, m: 0.4 });
  const mG = matTela(d.guantes, { r: 0.55 }), mB = matTela(d.botas, { r: 0.6, sucio: d.sucio }), mS = HG.mat("#16181c", { r: 0.85 });
  const mMetal = HG.mat("#c4cad2", { r: 0.28, m: 0.9 }), mOscuro = HG.mat("#2b2f36", { r: 0.5, m: 0.5 });
  const mTorso = una("mtorso" + d.id + d.traje + d.panel + d.parches + !!d.rayas + !!d.sucio, () => new T.MeshStandardMaterial({ map: texTraje(d), bumpMap: texTela(d.traje), bumpScale: 0.004, roughness: 0.76, metalness: 0 }));
  const mPiel = HG.mat(d.piel, { r: 0.58 });
  const cuerpo = HG.pivote(raiz); cuerpo.scale.setScalar(d.altura / 1.8);
  const cadera = h.cadera = HG.pivote(cuerpo, 0, 0.97, 0);
  M(lathe([[0, -0.12], [0.09, -0.115], [0.14, -0.08], [0.16, -0.02], [0.158, 0.05], [0, 0.05]].map(([r, y]) => [r * k, y]), 28), mT, 0, 0, 0, cadera).scale.z = 0.72;
  M(new T.TorusGeometry(0.162 * k, 0.019, 8, 36).rotateX(Math.PI / 2), mOscuro, 0, 0.04, 0, cadera).scale.z = 0.74;
  M(HG.cajaR(0.06, 0.04, 0.014, 0.005), mMetal, 0, 0.04, 0.122 * k, cadera);
  const bolsa = (x, z, ry) => { const b = M(HG.cajaR(0.06, 0.07, 0.035, 0.01), d.herramientas ? HG.mat("#3a2a1c", { r: 0.7 }) : mP, x, -0.0, z, cadera); b.rotation.y = ry; M(HG.cajaR(0.064, 0.022, 0.038, 0.006), mOscuro, x, 0.03, z, cadera).rotation.y = ry; };
  if (d.herramientas || d.rayas) for (const s of [-1, 1]) bolsa(s * 0.15 * k, 0.03, s * 1.2);
  if (d.herramientas) { // llave inglesa colgando de la cadera
    const ll = HG.pivote(cadera, -0.165 * k, -0.05, -0.04); ll.rotation.z = 0.15;
    M(new T.BoxGeometry(0.012, 0.16, 0.022), mMetal, 0, -0.06, 0, ll); M(new T.TorusGeometry(0.018, 0.008, 6, 10, 4.6), mMetal, 0, 0.03, 0, ll).rotation.set(0, Math.PI / 2, 2.4);
  }
  // torso
  const col = h.columna = HG.pivote(cadera, 0, 0.04, 0);
  M(geoTorso(d), mTorso, 0, 0, 0, col);
  M(new T.TorusGeometry(0.066 * Math.sqrt(k), 0.024, 12, 32).rotateX(Math.PI / 2), HG.mat(d.cuello, { r: 0.4, m: d.parches === "haluski" ? 0.8 : 0.3 }), 0, 0.535, 0, col);
  if (d.parches === "haluski") M(new T.TorusGeometry(0.074, 0.008, 8, 32).rotateX(Math.PI / 2), mMetal, 0, 0.52, 0, col);
  const tirante = (x0, x1, yIni, off) => {
    const pts = [];
    for (const y of [yIni, ...[0.14, 0.24, 0.34, 0.42, 0.48].filter(y => y > yIni)]) { const x = HG.lerp(x0, x1, y / 0.5) * k; pts.push(V(x, y, zTorso(x, y, 1, d) + off)); }
    pts.push(V(x1 * k, 0.536, 0.05), V(x1 * k, 0.548, 0), V(x1 * k, 0.536, -0.05));
    for (const y of [0.48, 0.4, 0.3, 0.2, 0.1, 0.04]) { const x = HG.lerp(x0, x1, y / 0.5) * k; pts.push(V(x, y, zTorso(x, y, -1, d) - off)); }
    return pts;
  };
  if (d.arnes) {
    const ma = HG.mat(d.arnes, { r: 0.6, m: 0.2 });
    for (const s of [-1, 1]) M(cinta(tirante(s * 0.06, s * 0.1, 0.04, 0.007), 0.034, 0.008), ma, 0, 0, 0, col);
    const yc = 0.3, pts = []; for (let x = -0.14; x <= 0.1401; x += 0.035) pts.push(V(x * k, yc, zTorso(x * k, yc, 1, d) + 0.012));
    M(cinta(pts, 0.03, 0.008, V(0, 1, 0)), ma, 0, 0, 0, col);
    M(HG.cajaR(0.05, 0.045, 0.016, 0.008), mMetal, 0, yc, zTorso(0, yc, 1, d) + 0.02, col);
  } else for (const s of [-1, 1]) M(cinta(tirante(s * 0.11, s * 0.1, 0.24, 0.006), 0.03, 0.007), mOscuro, 0, 0, 0, col);
  if (d.consola) {
    const zc = zTorso(0, 0.38, 1, d) + 0.03;
    M(HG.cajaR(0.17, 0.1, 0.045, 0.012), HG.mat("#8a9099", { r: 0.4, m: 0.6 }), 0, 0.38, zc - 0.012, col);
    const pa = M(new T.PlaneGeometry(0.13, 0.065), new T.MeshBasicMaterial({ map: texPantalla() }), 0, 0.385, zc + 0.012, col, false); pa.userData.solo = true;
  }
  if (d.herramientas) {
    const zc = zTorso(0.07 * k, 0.4, 1, d);
    M(HG.cajaR(0.075, 0.08, 0.025, 0.008), HG.mat("#3a2a1c", { r: 0.7 }), 0.07 * k, 0.4, zc + 0.008, col);
    M(new T.CylinderGeometry(0.005, 0.005, 0.07, 6), HG.mat("#ff7a2a"), 0.055 * k, 0.43, zc + 0.012, col);
    M(new T.CylinderGeometry(0.005, 0.005, 0.07, 6), mMetal, 0.075 * k, 0.43, zc + 0.012, col);
  }
  if (d.mangueras) for (const s of [-1, 1]) { // conectores del pecho y mangueras a la mochila
    const zc = zTorso(0.075 * k, 0.33, 1, d);
    M(new T.CylinderGeometry(0.018, 0.018, 0.02, 14).rotateX(Math.PI / 2), mMetal, s * 0.075 * k, 0.33, zc + 0.006, col);
  }
  // mochila
  const zm = zTorso(0, 0.3, -1, d) - 0.065, moch = HG.pivote(col, 0, 0.3, zm), mMoch = HG.mat(d.mochila, { r: 0.45, m: 0.35 });
  M(HG.cajaR(0.28 * k, 0.36, 0.13, 0.035), mMoch, 0, 0, 0, moch);
  M(HG.cajaR(0.2 * k, 0.12, 0.03, 0.01), mOscuro, 0, -0.07, -0.065, moch);
  for (let i = 0; i < 4; i++) M(new T.BoxGeometry(0.16 * k, 0.008, 0.006), mS, 0, -0.04 - i * 0.02, -0.081, moch);
  M(new T.BoxGeometry(0.03, 0.012, 0.006), HG.mat("#0b1d14", { e: "#39ff9a", ei: 2 }), 0.08 * k, 0.12, -0.066, moch, false);
  if (d.mangueras) {
    for (const s of [-1, 1]) M(capsula(0.034, 0.3), mMetal, s * 0.105 * k, 0.17, -0.035, moch);
    const mMang = una("mmang", () => new T.MeshStandardMaterial({ map: texAnillos(), roughness: 0.35, metalness: 0.7 }));
    for (const s of [-1, 1]) {
      const zc = zTorso(0.075 * k, 0.33, 1, d);
      const pts = [V(s * 0.075 * k, 0.33, zc + 0.014), V(s * 0.1 * k, 0.45, zTorso(0.1 * k, 0.45, 1, d) + 0.02), V(s * 0.105 * k, 0.548, 0.02), V(s * 0.105 * k, 0.54, -0.06), V(s * 0.1 * k, 0.47, zm + 0.04)];
      M(mechon(pts, 0.011, 0.011, 24, 8), mMang, 0, 0, 0, col);
    }
  }
  // cuello y cabeza
  const cuello = HG.pivote(col, 0, 0.53, 0);
  M(lathe([[0, -0.03], [0.056, -0.03], [0.05, 0.03], [0.046, 0.08], [0.048, 0.13], [0, 0.13]], 20), mPiel, 0, 0, 0, cuello);
  h.cabeza = HG.pivote(cuello, 0, 0.04, 0);
  cabeza(h.cabeza, d, h);
  // brazos (0 = derecho, en -X porque mira hacia +Z)
  h.hombros = []; h.codos = []; h.manos = [];
  for (const s of [-1, 1]) {
    const hombro = HG.pivote(col, s * 0.2 * k, 0.445, 0); hombro.rotation.z = s * 0.1;
    M(new T.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, 1.75), mP, 0, 0.005, 0, hombro).scale.set(0.078 * k, 0.07, 0.074 * k);
    M(extremidad(0.058 * k, 0.047 * k, 0.29, 0.007 * k, 0.35, 0.5), mT, 0, 0, 0, hombro);
    const ph = M(new T.CylinderGeometry(0.0605 * k, 0.059 * k, 0.065, 14, 1, true, s * Math.PI / 2 - 0.65, 1.3), una("mhombro" + d.id, () => new T.MeshStandardMaterial({ map: texHombro(d), roughness: 0.7 })), 0, -0.075, 0, hombro, false);
    ph.userData.solo = true;
    const codo = HG.pivote(hombro, 0, -0.28, 0);
    M(ESF, mT, 0, 0, 0, codo).scale.setScalar(0.048 * k);
    M(extremidad(0.05 * k, 0.039 * k, 0.25, 0.007 * k, 0.25), mT, 0, 0, 0, codo);
    M(lathe([[0.041 * k, -0.25], [0.046 * k, -0.235], [0.046 * k, -0.2], [0.04 * k, -0.19]], 16), mD, 0, 0, 0, codo);
    const mano = HG.pivote(codo, 0, -0.26, 0);
    M(ESF, mG, 0, -0.04, 0, mano).scale.set(0.02 * k, 0.045, 0.04 * k);
    for (let f = 0; f < 4; f++) { // dedos en dos falanges, algo doblados hacia la palma
      const z = (f - 1.5) * 0.019 * k, dd = HG.pivote(mano, -s * 0.004, -0.075, z); dd.rotation.z = -s * 0.3;
      const l1 = f === 0 || f === 3 ? 0.028 : 0.034; M(capsula(0.0088 * k, l1), mG, 0, 0, 0, dd);
      const d2 = HG.pivote(dd, 0, -l1 + 0.008, 0); d2.rotation.z = -s * 0.55; M(capsula(0.0082 * k, l1 * 0.85), mG, 0, 0, 0, d2);
    }
    const pul = HG.pivote(mano, -s * 0.012, -0.03, 0.03 * k); pul.rotation.set(0.7, 0, -s * 0.5); M(capsula(0.0095 * k, 0.04), mG, 0, 0, 0, pul);
    h.hombros.push(hombro); h.codos.push(codo); h.manos.push(mano);
  }
  // piernas
  h.muslos = []; h.rodillas = []; h.tobillos = [];
  for (const s of [-1, 1]) {
    const muslo = HG.pivote(cadera, s * 0.092 * k, -0.03, 0);
    M(extremidad(0.09 * k, 0.066 * k, 0.45, 0.01 * k, 0.3), mT, 0, 0, 0, muslo);
    M(HG.cajaR(0.03, 0.11, 0.09, 0.008), mP, s * 0.083 * k, -0.2, 0, muslo);
    M(HG.cajaR(0.034, 0.03, 0.094, 0.006), mOscuro, s * 0.085 * k, -0.15, 0, muslo);
    const rod = HG.pivote(muslo, 0, -0.44, 0);
    M(ESF, mT, 0, 0, 0, rod).scale.setScalar(0.064 * k);
    M(HG.cajaR(0.085 * k, 0.1, 0.03, 0.012), mP, 0, -0.01, 0.058 * k, rod).rotation.x = -0.1;
    M(extremidad(0.066 * k, 0.048 * k, 0.4, 0.012 * k, 0.28, 0.7), mT, 0, 0, 0, rod);
    const tob = HG.pivote(rod, 0, -0.42, 0);
    M(lathe([[0.058 * k, -0.03], [0.062 * k, 0.04], [0.066 * k, 0.12], [0.07 * k, 0.17], [0.064 * k, 0.175]], 18), mB, 0, 0, 0, tob);
    M(new T.TorusGeometry(0.067 * k, 0.008, 6, 20).rotateX(Math.PI / 2), mOscuro, 0, 0.11, 0, tob);
    M(HG.cajaR(0.105 * k, 0.08, 0.2, 0.035), mB, 0, -0.035, 0.035, tob);
    M(ESF, mB, 0, -0.045, 0.12, tob).scale.set(0.052 * k, 0.04, 0.05);
    M(HG.cajaR(0.115 * k, 0.026, 0.25, 0.01), mS, 0, -0.072, 0.037, tob);
    h.muslos.push(muslo); h.rodillas.push(rod); h.tobillos.push(tob);
  }
  const pico = HG.hacerPico(h.manos[0]);
  fusionar(raiz);
  raiz.traverse(o => { if (o.isMesh) o.userData.sombra = o.castShadow; });

  return { grupo: raiz, def: d, huesos: h, pico(v) { pico.visible = v; }, animar: HG.animacion(h, cadera, col, 0.97, { reposoZ: 0.1 }) };
};

// Si el personaje tiene malla 3D (d.malla) se usa esa; mientras se descarga se ve el de código y se cambia solo
HG.crearPersonaje = (d) => {
  if (!d.malla || !HG.Mallas) return crearProcedural(d);
  const grupo = new T.Group(); let dentro = null, picando = false;
  const poner = x => { if (dentro) grupo.remove(dentro.grupo); dentro = x; grupo.add(x.grupo); x.pico(picando); };
  const w = { grupo, def: d, get huesos() { return dentro.huesos; }, pico(v) { picando = v; dentro.pico(v); }, animar(e, t, dt) { dentro.animar(e, t, dt); } };
  if (HG.Mallas.listo(d.malla)) poner(HG.Mallas.crear(d));
  else { poner(crearProcedural(d)); HG.Mallas.cargar(d.malla).then(() => poner(HG.Mallas.crear(d))).catch(() => {}); }
  return w;
};

// Robot de la tienda (modelo 3D propio: modelos/personajes/robot.bin)
HG.ROBOT = { id: "robot", malla: "robot", corto: "Robot", nombre: "Robot de la tienda", altura: 2.0, k: 1.0, semilla: 5, peinado: "", ojos: "#3f86d0", labios: "#aa8880", traje: "#cdd2d9", panel: "#4a5662", piel: "#e6eaee", pelo: "#2a3440", guantes: "#2a3440", botas: "#2a3440", cuello: "#4a5662", mochila: "#4a5662", rugosidad: 0.35, metal: 0.55 };

// NPC genérico de la estación con colores aleatorios
const TRAJES = ["#2f5ea6", "#3f7b3c", "#e2721f", "#8a3cff", "#c43c3c", "#3a3f48", "#1f8a7a", "#d9b23a"];
const PIELES = ["#f1c9a5", "#d9a27e", "#b07850", "#7a4e30", "#e3b48e"];
const PELOS = ["#17171b", "#4a3222", "#dcb468", "#a9a9a9", "#7a2a1a"];
HG.personajeAleatorio = (sem) => {
  const r = HG.semilla(sem), p = a => a[Math.floor(r() * a.length)];
  const traje = p(TRAJES), piel = p(PIELES), mujer = r() < 0.4;
  return { id: "npc" + sem, npc: true, corto: "", nombre: p(HG.PILOTOS_NPC), piel, pelo: p(PELOS), peinado: p(mujer ? ["rizos", "atras", "puntas"] : ["puntas", "rizos", "atras", "cresta"]), barba: !mujer && r() < 0.3 ? "corta" : null,
    ojos: p(["#3d7fc4", "#5a3a22", "#3b2a1e", "#4a7a3a"]), labios: tono(new T.Color(piel).lerp(new T.Color("#b0504a"), 0.45).getStyle(), 0.95), traje, panel: tono(traje, 0.75), cuello: "#4a4f57", detalle: "#3a414c",
    guantes: "#5b6068", botas: "#2a2c31", mochila: p(["#8f959c", "#34373d", traje]), arnes: r() < 0.4 ? "#22242a" : null, rayas: r() < 0.4, mujer,
    altura: (mujer ? 1.62 : 1.7) + r() * 0.2, k: (mujer ? 0.88 : 0.95) + r() * 0.15, semilla: sem };
};
})();

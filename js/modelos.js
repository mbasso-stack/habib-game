// Modelos 3D: naves del jugador (10), piratas, jefes, estación exterior, planetas y asteroides. Morro hacia -Z.
"use strict";
(function () {
const HG = window.HG, T = THREE, M = HG.malla;

// ---------- Naves del jugador (diseño de la imagen de Malik: casco blanco blindado) ----------
function aletaGeo() {
  const sh = new T.Shape(); [[6, 0], [-8, 0], [-14, 24], [-6, 24]].forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y));
  const g = new T.ExtrudeGeometry(sh, { depth: 1.8, bevelEnabled: false }); g.translate(0, 0, -0.9); g.rotateY(Math.PI / 2); return g;
}
const ALA = [[-18, 10], [-36, 26], [-30, 31], [-18, 28]], CANARD = [[-9, -14], [-20, -4], [-17, -1], [-9, -5]];
const GN = {
  casco: HG.formaGeo([[-3, -38], [3, -38], [10, -20], [16, 0], [20, 14], [18, 30], [-18, 30], [-20, 14], [-16, 0], [-10, -20]], 10),
  lomo: HG.formaGeo([[-2, -30], [2, -30], [6, -10], [8, 6], [-8, 6], [-6, -10]], 5),
  ala: HG.formaGeo(ALA, 1.6), alaD: HG.formaGeo(HG.espejo(ALA), 1.6), canard: HG.formaGeo(CANARD, 1.2), canardD: HG.formaGeo(HG.espejo(CANARD), 1.2),
  aleta: aletaGeo(), bloque: new T.BoxGeometry(28, 13, 16), rejilla: new T.BoxGeometry(2, 5, 12), franja: new T.BoxGeometry(1.6, 0.8, 22),
  neon: new T.BoxGeometry(0.6, 0.6, 30), cabina: new T.SphereGeometry(5, 16, 12), cabeza: new T.SphereGeometry(2.1, 10, 8), luz: new T.SphereGeometry(1.2, 6, 5),
  canon: new T.CylinderGeometry(1.4, 1.4, 20, 8).rotateX(Math.PI / 2), motor: new T.CylinderGeometry(5.5, 6.5, 10, 16).rotateX(Math.PI / 2),
  llama: new T.ConeGeometry(3.2, 18, 12).rotateX(Math.PI / 2), vaina: new T.BoxGeometry(6, 6, 22), torreta: new T.CylinderGeometry(4, 5, 4, 12),
};
// Paneles del casco: juntas, remaches, rejillas, marcas y desgaste (las formas extruidas usan coordenadas de mundo, por eso la repetición pequeña)
function dibujarCasco(c, w, h, rug) {
  const r = HG.semilla(5), g = v => `rgb(${v | 0},${v | 0},${v | 0})`;
  c.fillStyle = rug ? g(120) : "#e9ecf1"; c.fillRect(0, 0, w, h);
  const paneles = [[0, 0, 256, 160], [256, 0, 256, 96], [256, 96, 128, 160], [384, 96, 128, 160], [0, 160, 160, 192], [160, 160, 96, 192], [0, 352, 256, 160], [256, 256, 256, 128], [256, 384, 256, 128]];
  for (const [x, y, pw, ph] of paneles) {
    const v = r(); c.fillStyle = rug ? g(90 + v * 70) : `hsl(215, 10%, ${86 + v * 7}%)`; c.fillRect(x + 2, y + 2, pw - 4, ph - 4);
    c.strokeStyle = rug ? g(220) : "rgba(40,48,60,0.55)"; c.lineWidth = 2.5; c.strokeRect(x + 1, y + 1, pw - 2, ph - 2);
    c.fillStyle = rug ? g(200) : "rgba(60,66,76,0.7)";
    for (let i = 8; i < pw - 4; i += 16) { c.fillRect(x + i, y + 5, 2, 2); c.fillRect(x + i, y + ph - 7, 2, 2); }
  }
  if (!rug) {
    c.fillStyle = "rgba(30,34,40,0.8)"; for (let i = 0; i < 6; i++) c.fillRect(290, 280 + i * 10, 80, 4); // rejilla
    c.fillStyle = "#f2c230"; c.fillRect(20, 460, 120, 10); c.fillStyle = "#1b1b1b"; for (let x = 20; x < 140; x += 16) c.fillRect(x, 460, 8, 10);
    c.fillStyle = "rgba(40,48,60,0.7)"; c.font = "bold 22px Arial"; c.fillText("HG-01", 300, 60);
  }
  for (let k = 0; k < 140; k++) { // desgaste y polvo
    const x = r() * w, y = r() * h, rr = 6 + r() * 40, gr = c.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, rug ? "rgba(255,255,255,0.25)" : "rgba(70,60,50,0.07)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = gr; c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
}
let _texCasco = null, _rugCasco = null;
const texCasco = () => _texCasco || (_texCasco = HG.lienzoTex(512, 512, (c, w, h) => dibujarCasco(c, w, h, false), [1 / 22, 1 / 22]));
const rugCasco = () => _rugCasco || (_rugCasco = HG.lienzoTex(512, 512, (c, w, h) => dibujarCasco(c, w, h, true), [1 / 22, 1 / 22]));
HG.largoNave = idx => 12 + idx * 1.6;
HG.modeloNave = (idx, asp = { nivel: 0, color: HG.COLORES_NAVE[0] }) => {
  const g = new T.Group(), m = new T.Group(); g.add(m);
  const n = asp.nivel || 0, col = asp.color || HG.COLORES_NAVE[0];
  const casco = new T.MeshStandardMaterial({ map: texCasco(), roughnessMap: rugCasco(), color: HG.lin(idx === 9 ? "#f6f1e6" : "#f2f4f8"), roughness: n >= 2 ? 0.6 : 0.85, metalness: n >= 2 ? 0.75 : 0.4, emissive: HG.lin("#3a3f4a"), emissiveIntensity: 0.15 });
  const panel = new T.MeshStandardMaterial({ map: texCasco(), roughnessMap: rugCasco(), color: HG.lin("#d3d9e2"), roughness: 0.9, metalness: 0.45 }), oscuro = HG.mat("#2b303c", { r: 0.5, m: 0.8 }), metal = HG.mat("#8a93a3", { r: 0.3, m: 0.9 });
  const acento = n >= 1 ? HG.mat(col, { r: 0.4, m: 0.5, e: col, ei: 0.35 }) : HG.mat("#5d6878", { r: 0.5, m: 0.5 });
  const oro = HG.mat("#e2b44a", { r: 0.3, m: 0.9 });
  const add = (geo, mm, x, y, z, p = m) => M(geo, mm, x, y, z, p, false);
  add(GN.casco, casco, 0, 0, 0); add(GN.lomo, panel, 0, 5, 0);
  add(GN.cabina, HG.mat("#9fd8ff", { r: 0.08, m: 0.9, e: "#1a4a7a", ei: 0.6 }), 0, 8, -12).scale.set(0.8, 0.55, 1.9);
  add(GN.cabeza, HG.mat("#f2f4f8"), 0, 8, -10.5); add(GN.cabeza, HG.mat("#d4a437", { e: "#d4a437", ei: 0.5, m: 0.9, r: 0.2 }), 0, 8.3, -12.6).scale.set(0.6, 0.5, 0.35);
  add(GN.bloque, casco, 0, 2, 22).scale.set(idx >= 4 ? 1.15 : 1, idx >= 4 ? 1.12 : 1, 1);
  add(GN.ala, panel, 0, -5, 0); add(GN.alaD, panel, 0, -5, 0);
  if (idx >= 1) { add(GN.canard, acento, 0, -1, 0); add(GN.canardD, acento, 0, -1, 0); }
  const canones = [], llamas = [];
  for (const sg of [-1, 1]) {
    add(GN.aleta, casco, sg * 12, 5, 6).rotation.z = -sg * 0.3;
    if (idx >= 6) add(GN.aleta, acento, sg * 16, 3, 12).rotation.z = -sg * 0.75;
    add(GN.luz, HG.brillo(sg < 0 ? "#ff3030" : "#30ff60"), sg * 19, 28, 17);
    add(GN.rejilla, oscuro, sg * 16.5, 2, 4); add(GN.franja, idx === 9 ? oro : acento, sg * 3.6, 5.4, -8);
    const c = add(GN.canon, oscuro, sg * 5, -9, -27); canones.push(c);
    add(GN.motor, oscuro, sg * 7.5, 2, 32);
    llamas.push(add(GN.llama, HG.brillo(n >= 4 ? col : "#8fe0ff"), sg * 7.5, 2, 44));
    if (n >= 3) add(GN.neon, HG.brillo(col), sg * 15.5, -4.5, 4);
    if (idx >= 7) add(GN.vaina, panel, sg * 22, -2, 10); // bodegas laterales
  }
  for (let i = 0; i < Math.min(idx >= 2 ? HG.NAVES[idx].huecos - 1 : 0, 4); i++) { // vainas de armas bajo las alas
    const sg = i % 2 ? 1 : -1, x = sg * (24 + Math.floor(i / 2) * 6);
    canones.push(add(GN.canon, metal, x, -6, 6)); add(GN.luz, HG.brillo("#ff8a3a"), x, -6, -4);
  }
  if (idx >= 4) llamas.push(add(GN.llama, HG.brillo(n >= 4 ? col : "#8fe0ff"), 0, 6, 44)), add(GN.motor, oscuro, 0, 6, 32).scale.setScalar(0.7);
  if (idx >= 6) { add(GN.torreta, metal, 0, 9, 6); add(GN.canon, oscuro, 0, 10, -2).scale.set(0.8, 0.8, 0.6); }
  if (idx === 9) { add(GN.franja, oro, 0, 5.6, 14).scale.set(3, 1, 0.6); }
  const L = HG.largoNave(idx); m.scale.setScalar(L / 76);
  g.userData = {
    llamas, canones, largo: L,
    actualizar(t, empuje = 0.5) {
      for (const l of llamas) l.scale.set(1, 1, 0.5 + empuje * 1.4 + Math.random() * 0.3);
      if (n >= 5) casco.emissiveIntensity = 0.45 + Math.sin(t * 3) * 0.35, casco.emissive.copy(HG.lin(col)).multiplyScalar(0.5 + 0.5 * Math.sin(t * 2));
    },
  };
  return g;
};

// ---------- Piratas ----------
const GP = {
  disco: new T.SphereGeometry(14, 20, 12), aro: new T.TorusGeometry(16, 2.2, 8, 30).rotateX(Math.PI / 2), domo: new T.SphereGeometry(7, 14, 10), luz: new T.SphereGeometry(1.8, 6, 5),
  dardo: new T.OctahedronGeometry(9), pico: new T.ConeGeometry(2.5, 16, 6).rotateX(-Math.PI / 2),
  cuch: HG.formaGeo([[-4, 8], [-6, -4], [-38, -20], [-30, -2], [-12, 10]].map(([x, y]) => [x, -y]), 2),
  cuchD: HG.formaGeo(HG.espejo([[-4, 8], [-6, -4], [-38, -20], [-30, -2], [-12, 10]].map(([x, y]) => [x, -y])), 2),
  casco: new T.BoxGeometry(30, 9, 34), placa: new T.BoxGeometry(20, 5, 22), canon: new T.CylinderGeometry(2.4, 2.8, 32, 10).rotateX(Math.PI / 2), vaina: new T.BoxGeometry(8, 7, 18), brillo: new T.SphereGeometry(3, 8, 6),
};
HG.modeloPirata = (tipo, tinte = "#c43c3c") => {
  const g = new T.Group(), m = new T.Group(); g.add(m);
  const add = (geo, mm, x, y, z, p = m) => M(geo, mm, x, y, z, p, false);
  if (tipo === "explorador") {
    const giro = new T.Group(); m.add(giro);
    add(GP.disco, HG.mat("#3f9a50", { e: "#16401e", ei: 0.5, r: 0.4, m: 0.7 }), 0, 0, 0).scale.set(1.5, 0.4, 1.5);
    add(GP.aro, HG.mat("#9dff6a", { e: "#6fe03a", ei: 0.9 }), 0, 0, 0, giro);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; add(GP.luz, HG.brillo("#ff4040"), Math.cos(a) * 16, 0, Math.sin(a) * 16, giro); }
    add(GP.domo, HG.mat("#ffe066", { e: "#ffe066", ei: 0.9 }), 0, 4, 0).scale.set(1, 0.8, 1);
    g.userData.giro = giro;
  } else if (tipo === "dardo") {
    const cu = HG.mat("#8a45c8", { e: "#2a0f45", ei: 0.5, r: 0.35, m: 0.8 }), cc = HG.mat("#c03ad8", { e: "#8a1fb0", ei: 0.55, r: 0.3, m: 0.7 });
    add(GP.dardo, cu, 0, 0, 0).scale.set(0.9, 0.5, 2.4); add(GP.cuch, cc, 0, -1, 0); add(GP.cuchD, cc, 0, -1, 0);
    add(GP.pico, cu, 0, 0, -20); add(GP.brillo, HG.brillo("#66f0ff"), 0, 1, 12);
  } else { // cañonera
    const rojo = HG.mat(tinte, { e: "#400808", ei: 0.5, r: 0.45, m: 0.8 }), osc = HG.mat("#3a1818", { r: 0.5, m: 0.8 }), hierro = HG.mat("#6a707c", { r: 0.4, m: 0.9 });
    add(GP.casco, rojo, 0, 0, 0); add(GP.placa, osc, 0, 6, 2);
    for (const s of [-1, 1]) { add(GP.canon, hierro, s * 11, 1, -26); add(GP.brillo, HG.brillo("#ffa040"), s * 11, 1, -42); add(GP.vaina, osc, s * 21, 0, 10); add(GP.brillo, HG.brillo("#ff8040"), s * 21, 0, 20); }
    add(GP.brillo, HG.mat("#ff3030", { e: "#ff2020", ei: 1 }), 0, 9, -6);
  }
  m.scale.setScalar(0.38);
  return g;
};
HG.modeloJefe = (P) => {
  const g = new T.Group(), m = new T.Group(); g.add(m);
  const col = HG.mat(P.atm, { e: P.atm, ei: 0.15, r: 0.4, m: 0.8 }), osc = HG.mat("#24262c", { r: 0.5, m: 0.8 });
  const add = (geo, mm, x, y, z) => M(geo, mm, x, y, z, m, false);
  add(new T.OctahedronGeometry(50), osc, 0, 0, 0).scale.set(1.6, 0.45, 1.1);
  add(new T.BoxGeometry(150, 6, 40), col, 0, 0, 10);
  for (const s of [-1, 1]) { add(new T.BoxGeometry(14, 30, 50), osc, s * 75, 0, 10); add(GP.canon, HG.mat("#6a707c", { m: 0.9, r: 0.4 }), s * 30, -8, -55).scale.setScalar(1.6); }
  const nucleo = add(new T.SphereGeometry(16, 16, 12), HG.mat("#ff4d4d", { e: "#ff2020", ei: 1.2 }), 0, 16, 0);
  add(new T.TorusGeometry(26, 3, 8, 30).rotateX(Math.PI / 2), HG.brillo(P.atm), 0, 6, 0);
  m.scale.setScalar(0.55);
  g.userData.nucleo = nucleo;
  return g;
};

// ---------- Estación vista desde el espacio ----------
HG.modeloEstacion = () => {
  const g = new T.Group();
  const metal = HG.mat("#9aa1ab", { r: 0.45, m: 0.7 }), osc = HG.mat("#4a5059", { r: 0.5, m: 0.7 });
  const ventanas = HG.lienzoTex(512, 64, (c, w, h) => { c.fillStyle = "#3a4048"; c.fillRect(0, 0, w, h); for (let x = 4; x < w; x += 12) for (let y = 10; y < h - 10; y += 16) if (Math.random() < 0.7) { c.fillStyle = Math.random() < 0.8 ? "#ffd98a" : "#8fe0ff"; c.fillRect(x, y, 6, 6); } }, [8, 1]);
  const anillo = new T.Mesh(new T.TorusGeometry(230, 24, 16, 80), new T.MeshStandardMaterial({ map: ventanas, emissiveMap: ventanas, emissive: new T.Color(1, 1, 1), emissiveIntensity: 0.6, roughness: 0.5, metalness: 0.6 }));
  anillo.rotation.x = Math.PI / 2; g.add(anillo);
  M(new T.CylinderGeometry(45, 45, 140, 24), metal, 0, 0, 0, g, false);
  M(new T.CylinderGeometry(60, 45, 20, 24), osc, 0, 80, 0, g, false); M(new T.CylinderGeometry(45, 60, 20, 24), osc, 0, -80, 0, g, false);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, b = M(new T.BoxGeometry(190, 10, 14), metal, Math.cos(a) * 135, 0, Math.sin(a) * 135, g, false); b.rotation.y = -a; }
  for (const s of [-1, 1]) { const p = M(new T.BoxGeometry(260, 2, 60), HG.mat("#1b2a5a", { r: 0.3, m: 0.6, e: "#10204a", ei: 0.4 }), 0, s * 120, 0, g, false); p.rotation.y = Math.PI / 4; }
  const bahia = M(new T.PlaneGeometry(50, 30), HG.brillo("#6fd8ff", 0.7), 0, 0, 45.5, g, false);
  const luces = [];
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; luces.push(M(new T.SphereGeometry(4, 8, 6), HG.brillo(i % 2 ? "#ff4040" : "#40ff80"), Math.cos(a) * 230, 26, Math.sin(a) * 230, g, false)); }
  g.userData = { anillo, luces, bahia };
  return g;
};

// ---------- Planeta ----------
// Esfera con relieve, capa de nubes que gira aparte y atmósfera que brilla en el borde iluminado
const ATM = {
  vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 color; uniform vec3 sol; uniform float fuerza; varying vec3 vN; varying vec3 vV; varying vec3 vW;
    void main(){ float f = 1.0 - max(dot(vN, vV), 0.0); float luz = smoothstep(-0.3, 0.6, dot(vN, sol));
      float a = pow(f, 3.0) * fuerza * (0.15 + luz); gl_FragColor = vec4(color * a, a); }`,
};
HG.SOL_DIR = new T.Vector3(4000, 2500, 3000).normalize();
HG.matAtmosfera = (color, fuerza = 1.6) => new T.ShaderMaterial({
  uniforms: { color: { value: HG.lin(color) }, sol: { value: HG.SOL_DIR }, fuerza: { value: fuerza } },
  vertexShader: ATM.vertexShader, fragmentShader: ATM.fragmentShader, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.FrontSide,
});
HG.modeloPlaneta = (P) => {
  const g = new T.Group();
  // primero una textura pequeña (rápida) y, con el juego ya en marcha, la de alta resolución
  const tex = HG.texPlaneta(P, 256), lava = P.id === "ignea";
  const mat = new T.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 2.5, roughness: P.id === "aurora" || P.id === "onix" ? 0.7 : 0.95, metalness: 0,
    emissive: lava ? HG.lin("#ff5a1a") : new T.Color(0), emissiveMap: lava ? tex : null, emissiveIntensity: lava ? 0.6 : 0 });
  const esfera = new T.Mesh(new T.SphereGeometry(P.radio, 96, 64), mat);
  g.add(esfera);
  HG.mejorarLuego(() => { const t = HG.texPlaneta(P); mat.map = mat.bumpMap = t; if (lava) mat.emissiveMap = t; mat.needsUpdate = true; });
  let nubes = null;
  if (P.nubes > 0) {
    const mn = new T.MeshStandardMaterial({ map: HG.texNubes(P, 256), transparent: true, depthWrite: false, roughness: 1 });
    nubes = new T.Mesh(new T.SphereGeometry(P.radio * 1.012, 96, 64), mn); g.add(nubes);
    HG.mejorarLuego(() => { mn.map = HG.texNubes(P); mn.needsUpdate = true; });
  }
  g.add(new T.Mesh(new T.SphereGeometry(P.radio * 1.045, 64, 40), HG.matAtmosfera(P.atm)));
  g.userData.esfera = esfera; g.userData.nubes = nubes;
  return g;
};
HG.cielo = (radio) => {
  const m = new T.Mesh(new T.SphereGeometry(radio, 48, 24), new T.MeshBasicMaterial({ map: HG.texEstrellas(), side: T.BackSide, depthWrite: false, fog: false }));
  m.renderOrder = -1; return m;
};
})();

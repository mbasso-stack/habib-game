// Modelos 3D: naves del jugador (10), piratas, jefes, estación exterior, planetas y asteroides. Morro hacia -Z.
"use strict";
(function () {
const HG = window.HG, T = THREE, M = HG.malla;

// ---------- Naves del jugador (modelos 3D de Malik: modelos/naves/<id>.bin, largo 1, morro hacia -Z) ----------
// Se descargan al arrancar; la nave se monta al instante si ya están y, si no, aparece en cuanto llegan.
const navesMalla = {}, navesEsperas = {}, navesGeo = {};
function cargarNave(id) {
  if (navesMalla[id]) return Promise.resolve(navesMalla[id]);
  return navesEsperas[id] || (navesEsperas[id] = fetch(`modelos/naves/${id}.bin`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(b => navesMalla[id] = HG.Mallas.leer(b)));
}
HG.NAVES.forEach(n => cargarNave(n.id).catch(() => {}));
// colores base del casco (gris claro con paneles, vientre oscuro, popa de metal) y marca de las zonas de acento
function geoNave(idx) {
  const n = HG.NAVES[idx], M = navesMalla[n.id];
  if (navesGeo[n.id]) return navesGeo[n.id];
  const sombra = HG.Mallas.cavidad("nave:" + n.id, M), base = new Float32Array(M.nv * 3), acento = new Float32Array(M.nv);
  const claro = HG.lin("#a9b0bb"), oscuro = HG.lin("#3a4048"), tmp = new T.Color(), ss = HG.Mallas.sstep;
  let ancho = 0; for (let v = 0; v < M.nv; v++) ancho = Math.max(ancho, Math.abs(M.pos[v * 3]));
  for (let v = 0; v < M.nv; v++) {
    const x = M.pos[v * 3], y = M.pos[v * 3 + 1], z = M.pos[v * 3 + 2], ny = M.nor[v * 3 + 1];
    const cx = Math.floor(x * 40), cy = Math.floor(y * 40), cz = Math.floor(z * 40), h = Math.abs((Math.sin(cx * 12.9898 + cy * 78.233 + cz * 37.719) * 43758.5453) % 1);
    tmp.copy(claro).multiplyScalar(0.86 + h * 0.2);
    tmp.lerp(oscuro, 0.55 * ss(-0.1, -0.6, ny) + 0.6 * ss(0.4, 0.48, z));            // vientre y zona de motores
    tmp.multiplyScalar(sombra[v]);
    base[v * 3] = tmp.r; base[v * 3 + 1] = tmp.g; base[v * 3 + 2] = tmp.b;
    acento[v] = Math.max(ss(0.35, 0.6, ny) * (ss(0.06, 0.03, Math.abs(x)) + ss(0.8 * ancho, 0.95 * ancho, Math.abs(x)) * 0.9), ss(-0.36, -0.42, z) * ss(0.2, 0.5, ny) * 0.9);
  }
  return navesGeo[n.id] = { M, base, acento };
}
HG.largoNave = idx => HG.NAVES[idx].largo;
HG.modeloNave = (idx, asp = { nivel: 0, color: HG.COLORES_NAVE[0] }) => {
  const g = new T.Group(), m = new T.Group(); g.add(m);
  const nv = HG.NAVES[idx], L = nv.largo, n = asp.nivel || 0, col = asp.color || HG.COLORES_NAVE[0], cc = HG.lin(col);
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: n >= 2 ? 0.32 : 0.62, metalness: n >= 2 ? 0.8 : 0.35, emissive: n >= 3 ? cc.clone().multiplyScalar(0.16) : new T.Color(0) });
  const montar = () => {
    const { M, base, acento } = geoNave(idx), c = new Float32Array(M.nv * 3), gris = HG.lin("#6d7684"), ac = n >= 1 ? cc : gris;
    for (let v = 0; v < M.nv; v++) { const a = acento[v]; for (let k = 0; k < 3; k++) c[v * 3 + k] = base[v * 3 + k] * (1 - a) + (k === 0 ? ac.r : k === 1 ? ac.g : ac.b) * a * (base[v * 3 + k] * 0.4 + 0.75); }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(M.pos, 3)); geo.setAttribute("normal", new T.BufferAttribute(M.nor, 3)); geo.setAttribute("color", new T.BufferAttribute(c, 3)); geo.setIndex(new T.BufferAttribute(M.idx, 1));
    const malla = new T.Mesh(geo, mat); malla.scale.setScalar(L); malla.castShadow = true; m.add(malla);
  };
  if (navesMalla[nv.id]) montar(); else cargarNave(nv.id).then(montar).catch(() => {});
  // motores con llama, bocas de los cañones y bodegas laterales para armas extra
  const llamas = [], canones = [], punto = (x, y, z, p) => { const o = new T.Group(); o.position.set(x * L, y * L, z * L); p.add(o); return o; };
  const matLlama = HG.brillo(n >= 4 ? col : "#8fe0ff"), geoLlama = una3("llama", () => new T.ConeGeometry(0.05, 1, 14).translate(0, 0.5, 0).rotateX(Math.PI / 2));
  for (const [x, y, z] of nv.motores) {
    const piv = punto(x, y, z, m); piv.scale.setScalar(L);
    const ll = new T.Mesh(geoLlama, matLlama); ll.position.set(0, 0, 0); ll.scale.set(1, 1, 0.2); piv.add(ll); llamas.push(ll);
    if (n >= 3) { const halo = new T.Mesh(una3("halo", () => new T.TorusGeometry(0.052, 0.006, 6, 20)), HG.brillo(col)); piv.add(halo); }
  }
  for (const [x, y, z] of nv.canones) canones.push(punto(x, y, z, m));
  for (let i = 0; i < Math.max(0, nv.huecos - 1 - (nv.huecos > 1 ? 1 : 0)) && nv.huecos > 2; i++) { const sg = i % 2 ? 1 : -1; canones.push(punto(sg * (nv.ala + Math.floor(i / 2) * 0.04), nv.canones[0][1], nv.canones[0][2] + 0.1, m)); }
  g.userData = {
    llamas, canones, largo: L,
    actualizar(t, empuje = 0.5) {
      for (const l of llamas) l.scale.set(1, 1, 0.12 + empuje * 0.32 + Math.random() * 0.05);
      if (n >= 5) mat.emissive.copy(cc).multiplyScalar(0.12 + 0.12 * Math.sin(t * 2));
    },
  };
  return g;
};
const geo3 = {}; function una3(k, f) { return geo3[k] || (geo3[k] = f()); }

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

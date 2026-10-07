// Motor: render, materiales, texturas, controles, sonido, vídeo, guardado y control a pie en tercera persona.
"use strict";
(function () {
const HG = window.HG;
const T = THREE;

// ---------- Utilidades ----------
HG.rnd = (a, b) => a + Math.random() * (b - a);
HG.rint = (a, b) => Math.floor(HG.rnd(a, b + 1));
HG.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
HG.lerp = (a, b, k) => a + (b - a) * k;
HG.semilla = n => () => { n = n + 0x6D2B79F5 | 0; let t = Math.imul(n ^ n >>> 15, 1 | n); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
HG.lin = h => new T.Color(h).convertSRGBToLinear();
HG.fmt = n => Math.floor(n).toLocaleString("es-ES");
HG.angDif = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

// ---------- Render ----------
const lienzo = document.getElementById("lienzo");
const renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: "high-performance" });
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
const camara = new T.PerspectiveCamera(70, 16 / 9, 0.1, 40000);
HG.renderer = renderer; HG.camara = camara; HG.lienzo = lienzo;
function ajustar() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix();
}
addEventListener("resize", ajustar); ajustar();

// ---------- Postprocesado (brillo de luces, color, viñeta y antialiasing) ----------
const FINAL = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.32 }, sat: { value: 1.1 }, con: { value: 1.06 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, sat, con; varying vec2 vUv;
    vec3 aSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, sat); c = max((c - 0.18) * con + 0.18, 0.0); c = aSRGB(c);
      vec2 d = vUv - 0.5; c *= 1.0 - vig * dot(d, d) * 1.8; gl_FragColor = vec4(c, 1.0); }`,
};
let composer = null, pasoRender = null, pasoBrillo = null, pasoFxaa = null;
function crearComposer() {
  if (!T.EffectComposer) return;
  const pr = renderer.getPixelRatio(), w = innerWidth, h = innerHeight;
  const rt = new T.WebGLRenderTarget(w * pr, h * pr, { type: renderer.capabilities.isWebGL2 ? T.HalfFloatType : T.UnsignedByteType, format: T.RGBAFormat });
  composer = new T.EffectComposer(renderer, rt);
  pasoRender = new T.RenderPass(new T.Scene(), camara); composer.addPass(pasoRender);
  pasoBrillo = new T.UnrealBloomPass(new T.Vector2(w, h), 0.6, 0.5, 0.78); composer.addPass(pasoBrillo);
  composer.addPass(new T.ShaderPass(FINAL));
  pasoFxaa = new T.ShaderPass(T.FXAAShader); composer.addPass(pasoFxaa);
  ajustarComposer();
}
function ajustarComposer() {
  if (!composer) return;
  const pr = renderer.getPixelRatio(); composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight);
  pasoFxaa.uniforms.resolution.value.set(1 / (innerWidth * pr), 1 / (innerHeight * pr));
}
addEventListener("resize", ajustarComposer);
HG.brilloEscena = (fuerza, umbral = 0.78) => { if (pasoBrillo) { pasoBrillo.strength = fuerza; pasoBrillo.threshold = umbral; } };
// Cada escena puede llevar su propio brillo (escena.userData.brillo = [fuerza, umbral]) y exposición
HG.renderizar = (escena, cam) => {
  const u = escena.userData;
  renderer.toneMappingExposure = u.exposicion || 1.3;
  if (pasoBrillo && u.brillo) { pasoBrillo.strength = u.brillo[0]; pasoBrillo.threshold = u.brillo[1]; }
  if (composer && HG.ajustes.calidad !== "baja") { pasoRender.scene = escena; pasoRender.camera = cam; pasoFxaa.enabled = HG.ajustes.calidad === "alta"; composer.render(); }
  else renderer.render(escena, cam);
};
// Reflejos: entornos generados (sala oscura, espacio, cielo de cada planeta)
const pmrem = new T.PMREMGenerator(renderer);
HG.envDeEscena = esc => pmrem.fromScene(esc, 0.02).texture; // la escena solo puede tener materiales opacos (lo aditivo estropea el formato RGBE)
// Sala oscura con tiras y paneles de luz: reflejos creíbles para interiores metálicos
let envOscuro = null;
HG.envOscuro = () => envOscuro || (envOscuro = (() => {
  const esc = new T.Scene(), caja = new T.BoxGeometry(1, 1, 1);
  const sala = new T.Mesh(new T.BoxGeometry(24, 12, 24), new T.MeshBasicMaterial({ color: new T.Color(0x16191e), side: T.BackSide })); sala.position.y = 4; esc.add(sala);
  const luz = (c, i, x, y, z, sx, sy, sz) => { const m = new T.Mesh(caja, new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(i) })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); esc.add(m); };
  for (let i = -1; i <= 1; i++) luz(0xfff1dc, 7, i * 5, 9.9, 0, 0.7, 0.1, 18);
  luz(0x5a7cff, 1.4, 0, 4, -11.9, 16, 7, 0.1);
  luz(0xffc070, 4, -11.9, 3, 5, 0.1, 2.5, 3); luz(0x9fdcff, 4, 11.9, 3, -5, 0.1, 2.5, 3); luz(0xffffff, 2.5, 6, 3, 11.9, 4, 2, 0.1);
  luz(0x30343b, 1, 0, -1.95, 0, 24, 0.1, 24);
  return pmrem.fromScene(esc, 0.03).texture;
})());
HG.envDeTextura = tex => pmrem.fromEquirectangular(tex).texture;
// Espacio: negro con el disco del sol y un leve resplandor azul y naranja (reflejos fuertes del sol en el metal)
let envEspacio = null;
HG.envEspacio = dirSol => envEspacio || (envEspacio = (() => {
  const esc = new T.Scene();
  esc.add(new T.Mesh(new T.SphereGeometry(50, 16, 8), new T.MeshBasicMaterial({ color: new T.Color(0x05070d), side: T.BackSide })));
  const disco = (c, i, dir, r) => { const m = new T.Mesh(new T.SphereGeometry(r, 16, 8), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(i) })); m.position.copy(dir).normalize().multiplyScalar(40); esc.add(m); };
  disco(0xfff2dd, 40, dirSol, 3); disco(0x2a4c9a, 0.6, new T.Vector3(-1, -0.4, -0.6), 22); disco(0x8a4a2a, 0.35, new T.Vector3(0.6, -0.8, 0.5), 18);
  return pmrem.fromScene(esc, 0.02).texture;
})());

// ---------- Materiales ----------
const cacheMat = {};
// o: { r: rugosidad, m: metal, e: color emisivo, ei: intensidad, flat, op: opacidad, dbl }
HG.mat = (color, o = {}) => {
  const k = color + "|" + JSON.stringify(o);
  if (cacheMat[k]) return cacheMat[k];
  const m = new T.MeshStandardMaterial({ color: HG.lin(color), roughness: o.r ?? 0.6, metalness: o.m ?? 0.1, flatShading: !!o.flat });
  if (o.e) { m.emissive = HG.lin(o.e); m.emissiveIntensity = o.ei ?? 1; }
  if (o.op !== undefined) { m.transparent = true; m.opacity = o.op; }
  if (o.dbl) m.side = T.DoubleSide;
  return cacheMat[k] = m;
};
HG.brillo = (color, op) => { const m = new T.MeshBasicMaterial({ color: HG.lin(color) }); if (op !== undefined) { m.transparent = true; m.opacity = op; m.depthWrite = false; m.blending = T.AdditiveBlending; } return m; };
HG.malla = (geo, mat, x = 0, y = 0, z = 0, padre, sombra = true) => {
  const o = new T.Mesh(geo, mat); o.position.set(x, y, z);
  if (sombra) { o.castShadow = true; o.receiveShadow = true; }
  if (padre) padre.add(o); return o;
};
HG.pivote = (padre, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); if (padre) padre.add(g); return g; };
// Caja con bordes redondeados (extrusión con bisel)
HG.cajaR = (w, h, d, r = 0.02) => {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const s = new T.Shape(), a = w / 2 - r, b = h / 2 - r;
  s.absarc(a, b, r, 0, Math.PI / 2); s.absarc(-a, b, r, Math.PI / 2, Math.PI);
  s.absarc(-a, -b, r, Math.PI, 1.5 * Math.PI); s.absarc(a, -b, r, 1.5 * Math.PI, 2 * Math.PI);
  const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.9, bevelSegments: 3, curveSegments: 5 });
  g.translate(0, 0, -(d - 2 * r) / 2); return g;
};
// Forma plana (x, y) extruida hacia abajo; la y de la forma pasa a ser la z del mundo
HG.formaGeo = (pts, grosor = 2) => {
  const s = new T.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y));
  const g = new T.ExtrudeGeometry(s, { depth: grosor, bevelEnabled: false }); g.rotateX(Math.PI / 2); return g;
};
HG.espejo = pts => pts.map(([x, y]) => [-x, y]).reverse();

// ---------- Texturas generadas ----------
HG.lienzoTex = (w, h, dibujar, repetir) => {
  const el = document.createElement("canvas"); el.width = w; el.height = h;
  dibujar(el.getContext("2d"), w, h);
  const tx = new T.CanvasTexture(el); tx.encoding = T.sRGBEncoding; tx.anisotropy = 4;
  if (repetir) { tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(repetir[0], repetir[1]); }
  return tx;
};
HG.texRejilla = rep => HG.lienzoTex(256, 256, (c, w, h) => {
  c.fillStyle = "#3a3f47"; c.fillRect(0, 0, w, h);
  c.fillStyle = "#23272d";
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) c.fillRect(i * 16 + 3, j * 16 + 3, 10, 10);
  c.strokeStyle = "#555c66"; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
  for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}, rep);
HG.texPanel = rep => HG.lienzoTex(512, 512, (c, w, h) => {
  c.fillStyle = "#7d838c"; c.fillRect(0, 0, w, h);
  for (let k = 0; k < 4000; k++) { c.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)"; c.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
  c.strokeStyle = "#4b5058"; c.lineWidth = 4;
  [[0, 0, 512, 512], [16, 16, 230, 300], [266, 16, 230, 140], [266, 176, 230, 140], [16, 336, 480, 160]].forEach(r => c.strokeRect(...r));
  c.fillStyle = "#55595f";
  for (const [x, y] of [[26, 26], [236, 26], [26, 306], [236, 306], [276, 26], [486, 26]]) { c.beginPath(); c.arc(x, y, 4, 0, 6.283); c.fill(); }
  c.fillStyle = "rgba(0,0,0,0.25)"; for (let i = 0; i < 6; i++) c.fillRect(300, 360 + i * 18, 160, 6);
}, rep);
HG.texAviso = (rep) => HG.lienzoTex(128, 32, (c, w, h) => {
  c.fillStyle = "#f2c230"; c.fillRect(0, 0, w, h); c.fillStyle = "#1b1b1b";
  for (let x = -h; x < w; x += 24) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 12, h); c.lineTo(x + 12 + h, 0); c.lineTo(x + h, 0); c.fill(); }
}, rep);
HG.texTexto = (texto, o = {}) => HG.lienzoTex(o.w || 512, o.h || 128, (c, w, h) => {
  c.fillStyle = o.fondo || "rgba(0,0,0,0)"; c.fillRect(0, 0, w, h);
  c.font = `${o.peso || "bold"} ${o.tam || 64}px ${o.fuente || "Orbitron, Arial, sans-serif"}`;
  c.textAlign = "center"; c.textBaseline = "middle";
  if (o.brillo) { c.shadowColor = o.brillo; c.shadowBlur = 24; }
  c.fillStyle = o.color || "#fff"; c.fillText(texto, w / 2, h / 2 + 4);
});
HG.texEstrellas = (w = 2048, h = 1024, via = true) => HG.lienzoTex(w, h, (c) => {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#02030a"); g.addColorStop(0.5, "#070a1c"); g.addColorStop(1, "#02030a");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  if (via) { // vía láctea
    for (let k = 0; k < 900; k++) {
      const x = Math.random() * w, y = h * 0.5 + Math.sin(x / w * 6.283) * h * 0.12 + (Math.random() - 0.5) * h * 0.18;
      const r = HG.rnd(20, 90), gg = c.createRadialGradient(x, y, 0, x, y, r);
      const col = Math.random() < 0.6 ? "120,140,255" : (Math.random() < 0.5 ? "255,170,220" : "255,230,190");
      gg.addColorStop(0, `rgba(${col},0.05)`); gg.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  for (let k = 0; k < 5000; k++) { const s = Math.random() < 0.97 ? 1 : 2; c.fillStyle = `rgba(255,255,255,${HG.rnd(0.3, 1)})`; c.fillRect(Math.random() * w, Math.random() * h, s, s); }
});
const TEXR = {}, PAL_ROCA = [["#7a7068", "#4a433d", "#a89c90"], ["#8a4f3a", "#4d2a1f", "#b8785a"], ["#4f5a6e", "#2a3040", "#7d8aa3"], ["#5a4a3a", "#2e241c", "#8a7660"]];
HG.texRoca = v => TEXR[v] || (TEXR[v] = HG.lienzoTex(256, 256, (c, w, h) => {
  const [base, osc, claro] = PAL_ROCA[v % PAL_ROCA.length];
  c.fillStyle = base; c.fillRect(0, 0, w, h);
  for (let k = 0; k < 2500; k++) { c.fillStyle = Math.random() < 0.5 ? osc : claro; c.globalAlpha = HG.rnd(0.05, 0.25); const q = HG.rnd(1, 5); c.fillRect(Math.random() * w, Math.random() * h, q, q); }
  for (let k = 0; k < 7; k++) {
    const x = HG.rnd(30, 226), y = HG.rnd(30, 226), r = HG.rnd(10, 32);
    c.globalAlpha = 0.55; c.fillStyle = osc; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, 6.283); c.fill();
    c.globalAlpha = 0.8; c.strokeStyle = claro; c.lineWidth = 2; c.beginPath(); c.ellipse(x - 1, y - 1, r, r * 0.8, 0, 0.3, 3.4); c.stroke();
  }
  c.globalAlpha = 0.7; c.strokeStyle = osc; c.lineWidth = 1.5;
  for (let k = 0; k < 8; k++) { c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let j = 0; j < 6; j++) { x += HG.rnd(-22, 22); y += HG.rnd(-22, 22); c.lineTo(x, y); } c.stroke(); }
}));
const MATR = {};
HG.matRoca = v => MATR[v] || (MATR[v] = new T.MeshStandardMaterial({ map: HG.texRoca(v), bumpMap: HG.texRoca(v), bumpScale: 0.04, roughness: 1, metalness: 0 }));
HG.geoRoca = (sem, aplastar = 1) => {
  const r = HG.semilla(sem), g = new T.IcosahedronGeometry(1, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + r() * 0.32), p.getY(i) * (0.8 + r() * 0.32) * aplastar, p.getZ(i) * (0.8 + r() * 0.32));
  g.computeVertexNormals(); return g;
};
// Planetas: relieve fractal en 3D sobre la esfera (sin costuras), continentes, polos helados y nubes aparte
const TEXP = {}, TEXN = {};
const ruido3 = (() => { let n = null; return () => n || (n = new T.ImprovedNoise()); })();
const fbm = (x, y, z, oct) => { const N = ruido3(); let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * N.noise(x * f, y * f, z * f); a *= 0.5; f *= 2.03; } return s; };
const esferaUV = (u, v) => { const lon = u * Math.PI * 2, lat = (v - 0.5) * Math.PI; return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]; };
HG.fbm = fbm;
// Trabajo pesado que puede esperar: se hace de uno en uno cuando el juego ya ha arrancado
const pendientes = [];
HG.mejorarLuego = fn => { pendientes.push(fn); if (pendientes.length === 1) setTimeout(siguiente, 1500); };
function siguiente() { const fn = pendientes.shift(); if (fn) fn(); if (pendientes.length) setTimeout(siguiente, 250); }
HG.texPlaneta = (P, W = 1024) => TEXP[P.id + W] || (TEXP[P.id + W] = HG.lienzoTex(W, W / 2, (c, w, h) => {
  const img = c.createImageData(w, h), d = img.data, sem = P.radio * 0.013;
  const A = new T.Color(P.base), B = new T.Color(P.tierra), col = new T.Color(), tmp = new T.Color();
  const mar = P.id === "aurora" || P.id === "onix", lava = P.id === "ignea", hielo = P.id === "glacia";
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [px, py, pz] = esferaUV(x / w, 1 - y / h);
    let e = fbm(px * 2.2 + sem, py * 2.2, pz * 2.2 - sem, 6) + 0.5;            // altura 0..1 aprox.
    const det = fbm(px * 9 + 3, py * 9, pz * 9, 3);
    if (lava) { // corteza oscura con grietas de lava
      const g = Math.abs(fbm(px * 4 + 7, py * 4, pz * 4, 4)); col.copy(A).multiplyScalar(0.7 + det); if (g < 0.05) col.lerp(B, 1 - g / 0.05);
    } else if (mar) {
      const costa = 0.52;
      if (e < costa) col.copy(A).multiplyScalar(0.55 + e * 0.9); // mar: más oscuro en lo profundo
      else { col.copy(B).lerp(tmp.set("#8a7a55"), HG.clamp((e - costa) * 4, 0, 1) * 0.6).multiplyScalar(0.8 + det * 0.8); if (e > 0.72) col.lerp(tmp.set("#f2f4f6"), HG.clamp((e - 0.72) * 6, 0, 1)); }
    } else { // desiertos y mundos helados: bandas de terreno
      col.copy(A).lerp(B, HG.clamp(e * 1.4 - 0.2 + det * 0.6, 0, 1)).multiplyScalar(0.8 + det * 0.5);
      if (hielo) col.lerp(tmp.set("#7fb2c9"), HG.clamp(Math.abs(det) * 2.5 - 0.3, 0, 0.6));
    }
    const polo = Math.abs(py); if (!lava && polo > 0.82 + det * 0.08) col.lerp(tmp.set("#f4f8fb"), 0.9);
    const k = (y * w + x) * 4; d[k] = HG.clamp(col.r, 0, 1) * 255; d[k + 1] = HG.clamp(col.g, 0, 1) * 255; d[k + 2] = HG.clamp(col.b, 0, 1) * 255; d[k + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}));
HG.texNubes = (P, W = 1024) => TEXN[P.id + W] || (TEXN[P.id + W] = HG.lienzoTex(W, W / 2, (c, w, h) => {
  const img = c.createImageData(w, h), d = img.data, sem = P.radio * 0.021;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [px, py, pz] = esferaUV(x / w, 1 - y / h);
    const q = fbm(px * 1.5 + sem, py * 4, pz * 1.5, 2) * 0.6; // remolinos estirados en latitud
    const n = fbm(px * 3 + q + sem, py * 3 + q, pz * 3 - q, 5) + 0.5, a = HG.clamp((n - (1 - P.nubes * 1.2)) * 3, 0, 1);
    const k = (y * w + x) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = a * 255;
  }
  c.putImageData(img, 0, 0);
}));

// ---------- Entrada ----------
const teclas = {}, pulsadas = {};
let rdx = 0, rdy = 0, rueda = 0, clicI = false, clicIP = false, clicIS = false, clicD = false;
const esCampo = e => e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
addEventListener("keydown", e => {
  if (esCampo(e)) return;
  if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (!teclas[e.code]) pulsadas[e.code] = true;
  teclas[e.code] = true; HG.audio.iniciar();
});
addEventListener("keyup", e => { teclas[e.code] = false; });
addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; clicI = clicD = false; });
addEventListener("mousemove", e => { if (document.pointerLockElement === lienzo) { rdx += e.movementX; rdy += e.movementY; } });
lienzo.addEventListener("mousedown", e => {
  HG.audio.iniciar();
  if (e.button === 0) { clicI = true; clicIP = true; } if (e.button === 2) clicD = true;
  if (HG.quiereRaton && HG.quiereRaton() && document.pointerLockElement !== lienzo) lienzo.requestPointerLock && lienzo.requestPointerLock();
});
addEventListener("mouseup", e => { if (e.button === 0) { clicI = false; clicIS = true; } if (e.button === 2) clicD = false; });
addEventListener("wheel", e => { rueda += Math.sign(e.deltaY); }, { passive: true });
lienzo.addEventListener("contextmenu", e => e.preventDefault());
HG.input = {
  tecla: c => !!teclas[c], pulsada: c => !!pulsadas[c],
  raton() { const s = HG.ajustes.sens, r = { dx: rdx * s, dy: rdy * s * (HG.ajustes.invertir ? -1 : 1) }; rdx = rdy = 0; return r; },
  rueda() { const r = rueda; rueda = 0; return r; },
  clic: () => clicI, clicPulsado: () => clicIP, clicSoltado: () => clicIS, clicDer: () => clicD,
  bloqueado: () => document.pointerLockElement === lienzo,
  soltarRaton() { if (document.pointerLockElement) document.exitPointerLock(); },
  finFrame() { for (const k in pulsadas) delete pulsadas[k]; clicIP = clicIS = false; },
  limpiar() { for (const k in teclas) teclas[k] = false; clicI = clicD = false; rdx = rdy = 0; },
};

// ---------- Ajustes y guardado ----------
const AJ_DEF = { musica: 0.6, efectos: 0.7, calidad: "media", sens: 0.0022, invertir: false, fov: 70, fps: false, aspecto: 0 };
HG.ajustes = Object.assign({}, AJ_DEF);
try { Object.assign(HG.ajustes, JSON.parse(localStorage.getItem("haluski_ajustes") || "{}")); } catch (e) {}
HG.guardarAjustes = () => { try { localStorage.setItem("haluski_ajustes", JSON.stringify(HG.ajustes)); } catch (e) {} HG.aplicarAjustes(); };
HG.aplicarAjustes = () => {
  const q = HG.ajustes.calidad;
  renderer.setPixelRatio(q === "baja" ? 0.75 : q === "media" ? Math.min(devicePixelRatio || 1, 1.25) : Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = q !== "baja";
  camara.fov = HG.ajustes.fov; camara.updateProjectionMatrix(); ajustar();
  if (!composer) crearComposer(); else ajustarComposer();
  HG.audio && HG.audio.volumen();
};
HG.partidaNueva = () => ({
  version: 1, monedas: 1000, comida: 100, naves: {}, naveActiva: -1, armas: ["laser"], equipadas: ["laser"],
  carga: {}, planetas: {}, derrotas: 0, amigos: [], clan: null, videos: {}, creditosVistos: false, vidaNave: null, flota: 2,
});
// Las 10 naves antiguas pasan a las 4 actuales: 0-1 → Gorrión, 2-5 → Lince, 6-8 → Fénix, 9 → Haluski Prime
const flotaNueva = i => i <= 1 ? 0 : i <= 5 ? 1 : i <= 8 ? 2 : 3;
function migrarFlota(d) {
  if (d.flota === 2) return d;
  const n = {}; for (const [k, v] of Object.entries(d.naves || {})) { const j = flotaNueva(+k), o = n[j]; n[j] = !o ? v : { mov: Math.max(o.mov, v.mov), com: Math.max(o.com, v.com), asp: Math.max(o.asp, v.asp), color: v.color || o.color }; }
  d.naves = n; d.flota = 2;
  if (d.naveActiva >= 0) { d.naveActiva = flotaNueva(d.naveActiva); d.vidaNave = null; }
  return d;
}
HG.cargarPartida = () => { try { const d = JSON.parse(localStorage.getItem("haluski_partida")); if (d && d.vidaNave != null && d.vidaNave <= 0) d.vidaNave = null; return d && d.version === 1 ? migrarFlota(Object.assign(HG.partidaNueva(), d)) : null; } catch (e) { return null; } };
HG.guardarPartida = () => { try { localStorage.setItem("haluski_partida", JSON.stringify(HG.P)); } catch (e) {} };

// ---------- Sonido ----------
let actx = null;
const pistas = {};
let pistaActual = null;
HG.audio = {
  iniciar() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (actx && actx.state === "suspended") actx.resume();
    if (pistaActual && pistas[pistaActual] && pistas[pistaActual].paused) pistas[pistaActual].play().catch(() => {});
  },
  musica(nombre) {
    if (pistaActual === nombre) return;
    pistaActual = nombre;
    if (nombre && !pistas[nombre]) { const a = new Audio(`musica/${nombre}.mp3`); a.loop = true; a.volume = 0; pistas[nombre] = a; }
    if (nombre) pistas[nombre].play().catch(() => {});
  },
  actualizar(dt) { // fundido entre pistas
    for (const [n, a] of Object.entries(pistas)) {
      const obj = n === pistaActual ? HG.ajustes.musica * (HG.pausado ? 0.4 : 1) : 0;
      a.volume = HG.clamp(a.volume + Math.sign(obj - a.volume) * dt * 0.8, 0, 1);
      if (Math.abs(a.volume - obj) < 0.02) a.volume = obj;
      if (a.volume === 0 && n !== pistaActual && !a.paused) a.pause();
    }
  },
  volumen() {},
  sfx(tipo) {
    if (!actx || HG.ajustes.efectos <= 0) return;
    const S = {
      laser: [1200, 400, 0.08, "square", 0.04], gatling: [700, 300, 0.05, "sawtooth", 0.03], misil: [300, 900, 0.25, "sawtooth", 0.05],
      mina: [200, 120, 0.15, "square", 0.05], plasma: [180, 60, 0.5, "sawtooth", 0.09], rail: [2000, 200, 0.3, "square", 0.06],
      pulso: [120, 30, 0.8, "sawtooth", 0.1], explosion: [220, 40, 0.45, "sawtooth", 0.09], golpe: [300, 60, 0.3, "sawtooth", 0.08],
      moneda: [1200, 1900, 0.08, "triangle", 0.06], compra: [600, 1200, 0.18, "triangle", 0.08], error: [200, 120, 0.25, "square", 0.06],
      pico: [260, 110, 0.09, "square", 0.06], salto: [300, 600, 0.12, "triangle", 0.05], carga: [400, 1400, 0.3, "triangle", 0.06],
      alarma: [880, 440, 0.25, "square", 0.05], clic: [900, 900, 0.04, "triangle", 0.04], paso: [90, 60, 0.05, "triangle", 0.03],
    }[tipo];
    if (!S) return;
    const [f1, f2, dur, onda, vol] = S, o = actx.createOscillator(), g = actx.createGain();
    o.type = onda; o.frequency.setValueAtTime(f1, actx.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), actx.currentTime + dur);
    g.gain.setValueAtTime(vol * HG.ajustes.efectos * 1.4, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + dur);
  },
};

// ---------- Vídeo ----------
const video = document.getElementById("video");
let finVideo = null;
HG.video = {
  activo: () => !!finVideo,
  reproducir(src, alTerminar) {
    finVideo = alTerminar;
    video.src = src; video.style.display = "block"; video.volume = HG.ajustes.musica;
    document.getElementById("saltarVideo").style.display = "block";
    video.play().catch(() => { video.muted = true; video.play().catch(() => HG.video.terminar()); });
  },
  terminar() {
    if (!finVideo) return;
    const f = finVideo; finVideo = null;
    video.pause(); video.style.display = "none"; document.getElementById("saltarVideo").style.display = "none";
    f();
  },
};
video.addEventListener("ended", () => HG.video.terminar());
video.addEventListener("error", () => HG.video.terminar());
video.addEventListener("click", () => HG.video.terminar());

// ---------- Cámara en tercera persona y control a pie ----------
// Se usa en la estación y en los planetas. colision(x, z, r) devuelve true si el punto choca.
HG.ControlPie = class {
  constructor(personaje, opciones = {}) {
    this.p = personaje; this.pos = new T.Vector3(); this.vy = 0; this.suelo = true;
    this.yaw = 0; this.pitch = 0.25; this.dist = 4.2; this.rumbo = 0; this.estado = "quieto";
    this.vel = opciones.vel || 4.2; this.limites = opciones.limites; this.colision = opciones.colision || (() => false);
    this.altura = opciones.altura || (() => 0); // altura del suelo en (x, z)
    this.accion = 0; this.pasoT = 0;
  }
  colocar(x, z, rumbo = 0) { this.pos.set(x, this.altura(x, z), z); this.rumbo = rumbo; this.yaw = rumbo; this.vy = 0; this.p.grupo.position.copy(this.pos); this.p.grupo.rotation.y = rumbo; }
  actualizar(dt, controlActivo, lentitud = 1) {
    const I = HG.input;
    if (controlActivo) {
      const r = I.raton();
      this.yaw -= r.dx; this.pitch = HG.clamp(this.pitch + r.dy, -0.35, 1.1);
      if (I.tecla("ArrowLeft")) this.yaw += 2 * dt; if (I.tecla("ArrowRight")) this.yaw -= 2 * dt;
      if (I.tecla("ArrowUp")) this.pitch = HG.clamp(this.pitch - dt, -0.35, 1.1); if (I.tecla("ArrowDown")) this.pitch = HG.clamp(this.pitch + dt, -0.35, 1.1);
      this.dist = HG.clamp(this.dist + I.rueda() * 0.4, 2.2, 9);
    }
    let fx = 0, fz = 0;
    if (controlActivo && this.accion <= 0) {
      const ad = (I.tecla("KeyW") ? 1 : 0) - (I.tecla("KeyS") ? 1 : 0), lat = (I.tecla("KeyD") ? 1 : 0) - (I.tecla("KeyA") ? 1 : 0);
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      fx = sy * ad - cy * lat; fz = cy * ad + sy * lat;
      const L = Math.hypot(fx, fz); if (L > 0) { fx /= L; fz /= L; }
      if (I.pulsada("Space") && this.suelo) { this.vy = 5.2; this.suelo = false; HG.audio.sfx("salto"); }
    }
    const corre = controlActivo && (I.tecla("ShiftLeft") || I.tecla("ShiftRight"));
    const v = this.vel * (corre ? 1.85 : 1) * lentitud;
    const moviendo = fx !== 0 || fz !== 0;
    if (moviendo) {
      const nx = this.pos.x + fx * v * dt, nz = this.pos.z + fz * v * dt;
      if (!this.colision(nx, this.pos.z, 0.4)) this.pos.x = nx;
      if (!this.colision(this.pos.x, nz, 0.4)) this.pos.z = nz;
      if (this.limites) { const L = this.limites; this.pos.x = HG.clamp(this.pos.x, L[0], L[1]); this.pos.z = HG.clamp(this.pos.z, L[2], L[3]); }
      this.rumbo += HG.angDif(this.rumbo, Math.atan2(fx, fz)) * Math.min(1, dt * 12);
      this.pasoT += dt * (corre ? 2.6 : 1.7); if (this.pasoT > 1 && this.suelo) { this.pasoT = 0; HG.audio.sfx("paso"); }
    }
    const piso = this.altura(this.pos.x, this.pos.z);
    this.vy -= 14 * dt; this.pos.y += this.vy * dt;
    if (this.pos.y <= piso) { this.pos.y = piso; this.vy = 0; this.suelo = true; }
    else if (this.suelo && this.pos.y - piso < 0.35 && this.vy <= 0) this.pos.y = piso; // bajar cuestas sin despegar
    if (this.accion > 0) this.accion -= dt;
    this.estado = this.accion > 0 ? "picar" : !this.suelo ? "saltar" : moviendo ? (corre ? "correr" : "andar") : "quieto";
    const g = this.p.grupo; g.position.copy(this.pos); g.rotation.y = this.rumbo;
    // cámara detrás del personaje
    const cp = Math.cos(this.pitch), objetivo = new T.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
    const cam = new T.Vector3(objetivo.x - Math.sin(this.yaw) * this.dist * cp, objetivo.y + Math.sin(this.pitch) * this.dist, objetivo.z - Math.cos(this.yaw) * this.dist * cp);
    cam.y = Math.max(cam.y, this.altura(cam.x, cam.z) + 0.4); // que la cámara no se meta bajo el terreno
    camara.position.lerp(cam, Math.min(1, dt * 14)); camara.lookAt(objetivo);
  }
};
})();

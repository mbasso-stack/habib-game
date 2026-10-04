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
const TEXP = {};
HG.texPlaneta = P => TEXP[P.id] || (TEXP[P.id] = HG.lienzoTex(1024, 512, (c, w, h) => {
  c.fillStyle = P.base; c.fillRect(0, 0, w, h);
  for (let k = 0; k < 140; k++) { c.fillStyle = P.tierra; c.globalAlpha = HG.rnd(0.45, 0.9); c.beginPath(); c.ellipse(Math.random() * w, HG.rnd(40, h - 40), HG.rnd(30, 120), HG.rnd(16, 60), Math.random() * 3, 0, 6.283); c.fill(); }
  c.globalAlpha = 1;
  for (let k = 0; k < 60; k++) { c.fillStyle = `rgba(255,255,255,${P.nubes * HG.rnd(0.2, 0.6)})`; c.beginPath(); c.ellipse(Math.random() * w, HG.rnd(20, h - 20), HG.rnd(60, 180), HG.rnd(5, 16), 0, 0, 6.283); c.fill(); }
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
  HG.audio && HG.audio.volumen();
};
HG.partidaNueva = () => ({
  version: 1, monedas: 1000, comida: 100, naves: {}, naveActiva: -1, armas: ["laser"], equipadas: ["laser"],
  carga: {}, planetas: {}, derrotas: 0, amigos: [], clan: null, videos: {}, creditosVistos: false, vidaNave: null,
});
HG.cargarPartida = () => { try { const d = JSON.parse(localStorage.getItem("haluski_partida")); if (d && d.vidaNave != null && d.vidaNave <= 0) d.vidaNave = null; return d && d.version === 1 ? Object.assign(HG.partidaNueva(), d) : null; } catch (e) { return null; } };
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
    this.accion = 0; this.pasoT = 0;
  }
  colocar(x, z, rumbo = 0) { this.pos.set(x, 0, z); this.rumbo = rumbo; this.yaw = rumbo; this.vy = 0; this.p.grupo.position.copy(this.pos); this.p.grupo.rotation.y = rumbo; }
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
    this.vy -= 14 * dt; this.pos.y += this.vy * dt;
    if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.suelo = true; }
    if (this.accion > 0) this.accion -= dt;
    this.estado = this.accion > 0 ? "picar" : !this.suelo ? "saltar" : moviendo ? (corre ? "correr" : "andar") : "quieto";
    const g = this.p.grupo; g.position.copy(this.pos); g.rotation.y = this.rumbo;
    // cámara detrás del personaje
    const cp = Math.cos(this.pitch), objetivo = new T.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
    const cam = new T.Vector3(objetivo.x - Math.sin(this.yaw) * this.dist * cp, objetivo.y + Math.sin(this.pitch) * this.dist, objetivo.z - Math.cos(this.yaw) * this.dist * cp);
    camara.position.lerp(cam, Math.min(1, dt * 14)); camara.lookAt(objetivo);
  }
};
})();

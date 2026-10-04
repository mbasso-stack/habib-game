// La estación (lobby): hangar industrial en tercera persona con tienda, hangar de naves, sala de clanes y plataforma de despegue.
"use strict";
(function () {
const HG = window.HG, T = THREE, M = HG.malla;
const AN = 40, FO = 30, ALTO = 22; // medio ancho (x), medio fondo (z) y altura de la sala

const escena = new T.Scene();
escena.background = HG.lin("#05070d");
escena.fog = new T.Fog(HG.lin("#0b0f18"), 60, 140);

// ---------- Luces ----------
escena.add(new T.HemisphereLight(HG.lin("#dbe8ff"), HG.lin("#4a4236"), 1.0));
const sol = new T.DirectionalLight(HG.lin("#fff1dc"), 1.5);
sol.position.set(-20, 40, 18); sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -45, right: 45, top: 35, bottom: -35, near: 1, far: 120 });
sol.shadow.bias = -0.0005; escena.add(sol);
const luz = (color, i, d, x, y, z) => { const l = new T.PointLight(HG.lin(color), i, d, 2); l.position.set(x, y, z); escena.add(l); return l; };
luz("#ffcf8a", 2.2, 30, -28, 7, 22); luz("#e8f0ff", 1.6, 40, -10, 16, 0); luz("#e8f0ff", 1.6, 40, 14, 16, 18); luz("#6fd8ff", 1.6, 24, -27, 6, -17); luz("#ffffff", 1.4, 34, 26, 12, 8); luz("#8fb4ff", 1.2, 40, 6, 12, -22);

// ---------- Sala ----------
const suelo = M(new T.PlaneGeometry(AN * 2, FO * 2), new T.MeshStandardMaterial({ map: HG.texRejilla([40, 30]), roughness: 0.75, metalness: 0.6 }), 0, 0, 0, escena);
suelo.rotation.x = -Math.PI / 2; suelo.castShadow = false;
const matPared = new T.MeshStandardMaterial({ map: HG.texPanel([8, 2]), roughness: 0.6, metalness: 0.5 });
const matParedC = new T.MeshStandardMaterial({ map: HG.texPanel([6, 2]), roughness: 0.6, metalness: 0.5 });
M(new T.BoxGeometry(1, ALTO, FO * 2), matParedC, -AN - 0.5, ALTO / 2, 0, escena); // oeste
M(new T.BoxGeometry(1, ALTO, FO * 2), matParedC, AN + 0.5, ALTO / 2, 0, escena);  // este
M(new T.BoxGeometry(AN * 2, ALTO, 1), matPared, 0, ALTO / 2, FO + 0.5, escena);     // sur
// pared norte con el gran ventanal (x -14..26, y 3..17)
const VX0 = -14, VX1 = 26, VY0 = 3, VY1 = 17;
M(new T.BoxGeometry(VX0 + AN, ALTO, 1), matPared, (-AN + VX0) / 2, ALTO / 2, -FO - 0.5, escena);
M(new T.BoxGeometry(AN - VX1, ALTO, 1), matPared, (VX1 + AN) / 2, ALTO / 2, -FO - 0.5, escena);
M(new T.BoxGeometry(VX1 - VX0, VY0, 1), matPared, (VX0 + VX1) / 2, VY0 / 2, -FO - 0.5, escena);
M(new T.BoxGeometry(VX1 - VX0, ALTO - VY1, 1), matPared, (VX0 + VX1) / 2, (ALTO + VY1) / 2, -FO - 0.5, escena);
const marco = HG.mat("#d9dee6", { r: 0.35, m: 0.6, e: "#8fb4ff", ei: 0.25 });
for (const [w, h, x, y] of [[VX1 - VX0 + 2, 1, (VX0 + VX1) / 2, VY0], [VX1 - VX0 + 2, 1, (VX0 + VX1) / 2, VY1], [1, VY1 - VY0, VX0, (VY0 + VY1) / 2], [1, VY1 - VY0, VX1, (VY0 + VY1) / 2]]) M(new T.BoxGeometry(w, h, 1.6), marco, x, y, -FO, escena);
const espacio = M(new T.PlaneGeometry(260, 130), new T.MeshBasicMaterial({ map: HG.texEstrellas(2048, 1024), fog: false }), 6, 20, -110, escena, false);
// techo y vigas
M(new T.BoxGeometry(AN * 2, 1, FO * 2), HG.mat("#23272e", { r: 0.8, m: 0.4 }), 0, ALTO + 0.5, 0, escena);
for (let x = -AN + 6; x < AN; x += 12) {
  M(new T.BoxGeometry(1.2, 1.6, FO * 2), HG.mat("#3e444d", { r: 0.5, m: 0.7 }), x, ALTO - 1, 0, escena, false);
  M(new T.BoxGeometry(0.5, 0.2, FO * 2 - 6), HG.brillo("#e8f2ff"), x + 2, ALTO - 0.6, 0, escena, false);
}
// pasarelas superiores con barandillas en la pared oeste y sur
const matPas = new T.MeshStandardMaterial({ map: HG.texRejilla([3, 30]), roughness: 0.7, metalness: 0.6 });
const barandilla = (x0, z0, x1, z1, y) => {
  const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0), mm = HG.mat("#aeb5bf", { r: 0.35, m: 0.8 });
  for (const h of [1.1, 0.55]) { const b = M(new T.CylinderGeometry(0.05, 0.05, L, 6).rotateZ(Math.PI / 2), mm, (x0 + x1) / 2, y + h, (z0 + z1) / 2, escena, false); b.rotation.y = -ang; }
  for (let i = 0; i <= L; i += 2.5) M(new T.CylinderGeometry(0.05, 0.05, 1.1, 6), mm, x0 + Math.cos(ang) * i, y + 0.55, z0 + Math.sin(ang) * i, escena, false);
};
for (const y of [7, 13]) {
  M(new T.BoxGeometry(6, 0.4, FO * 2), matPas, -AN + 3, y, 0, escena); barandilla(-AN + 6, -FO, -AN + 6, FO, y);
  for (let z = -FO + 4; z < FO; z += 10) M(new T.BoxGeometry(0.3, 0.3, 0.3), HG.mat("#4a5059"), -AN + 6, y - 2, z, escena, false);
}
const cartel = (txt, x, y, z, ry = 0, w = 4, o = {}) => {
  const p = M(new T.PlaneGeometry(w, w / 4), new T.MeshBasicMaterial({ map: HG.texTexto(txt, Object.assign({ color: "#2b2f36", fondo: "#c9ced6", tam: 70 }, o)), transparent: !!o.transp }), x, y, z, escena, false);
  p.rotation.y = ry; return p;
};
cartel("BAY 01", -AN + 0.6, 10, -14, Math.PI / 2); cartel("BAY 02", -AN + 0.6, 10, -2, Math.PI / 2); cartel("BAY 03", -AN + 0.6, 16, 10, Math.PI / 2);
// escotilla redonda «CREW UNIT 4B»
const esc = HG.pivote(escena, -AN + 0.2, 3.4, 14); esc.rotation.y = Math.PI / 2;
M(new T.TorusGeometry(2.6, 0.45, 12, 40), HG.mat("#7a828d", { r: 0.4, m: 0.8 }), 0, 0, 0, esc);
M(new T.CircleGeometry(2.4, 40), HG.mat("#1a1e24", { r: 0.8 }), 0, 0, -0.05, esc);
M(new T.CircleGeometry(1.9, 40), HG.mat("#fff2c8", { e: "#ffe2a0", ei: 0.6 }), 0, 0, -0.3, esc, false);
const rot = M(new T.PlaneGeometry(6, 0.75), new T.MeshBasicMaterial({ map: HG.texTexto("CREW UNIT 4B · OCUPADO", { color: "#20242a", tam: 44, w: 1024 }), transparent: true }), 0, 3.4, 0.05, esc, false);
// líneas de seguridad amarillas
const linea = (x, z, w, d) => { const p = M(new T.PlaneGeometry(w, d), new T.MeshStandardMaterial({ map: HG.texAviso([Math.max(1, Math.round(Math.max(w, d) / 2)), 1]), roughness: 0.6 }), x, 0.02, z, escena); p.rotation.x = -Math.PI / 2; if (d > w) p.rotation.z = Math.PI / 2, p.scale.set(d / w, w / d, 1); p.castShadow = false; };
linea(0, -6, 60, 0.5); linea(-8, 8, 0.5, 36);

// ---------- Zonas ----------
const anillo = (x, z, r, color) => { const a = M(new T.RingGeometry(r - 0.35, r, 64), HG.brillo(color, 0.8), x, 0.03, z, escena, false); a.rotation.x = -Math.PI / 2; return a; };
// Plataforma de despegue (junto al ventanal)
const PAD = { x: 6, z: -18 };
M(new T.CylinderGeometry(8, 8.3, 0.25, 48), HG.mat("#3d434c", { r: 0.5, m: 0.7 }), PAD.x, 0.12, PAD.z, escena);
anillo(PAD.x, PAD.z, 7.6, "#ffcf3a"); anillo(PAD.x, PAD.z, 5, "#ffcf3a");
const txtPad = M(new T.PlaneGeometry(8, 2), new T.MeshBasicMaterial({ map: HG.texTexto("DESPEGUE", { color: "#ffd04a", tam: 80 }), transparent: true }), PAD.x, 0.27, PAD.z + 2, escena, false); txtPad.rotation.x = -Math.PI / 2;
// Hangar de naves (este)
const HANG = { x: 26, z: 10 };
M(new T.CylinderGeometry(11, 11.4, 0.3, 48), HG.mat("#3a3f47", { r: 0.5, m: 0.7 }), HANG.x, 0.15, HANG.z, escena);
anillo(HANG.x, HANG.z, 10.6, "#4cc9f0");
const holo = HG.pivote(escena, HANG.x, 0, HANG.z);
cartel("HANGAR", AN - 0.6, 9, 10, -Math.PI / 2, 8);
const consola = M(HG.cajaR(2.2, 1.1, 1, 0.1), HG.mat("#5a616b", { r: 0.4, m: 0.7 }), 15, 0.55, 2, escena);
M(new T.PlaneGeometry(1.8, 0.8), HG.mat("#06202a", { e: "#3fe0ff", ei: 0.8 }), 15, 1.15, 2.51, escena, false).rotation.x = -0.4;
// Tienda (suroeste): mostrador, estanterías y letrero de neón
const TI = { x: -28, z: 23 };
const most = M(new T.CylinderGeometry(6, 6, 1.1, 40, 1, true, Math.PI * 0.6, Math.PI * 0.8), HG.mat("#9aa1ab", { r: 0.25, m: 0.9, dbl: true }), TI.x, 0.55, TI.z + 4, escena);
M(new T.CylinderGeometry(6.2, 6.2, 0.08, 40, 1, false, Math.PI * 0.6, Math.PI * 0.8), HG.mat("#bfe8ff", { op: 0.45, r: 0.05, m: 0.2 }), TI.x, 1.12, TI.z + 4, escena, false);
for (let i = 0; i < 3; i++) {
  M(new T.BoxGeometry(10, 0.12, 1), HG.mat("#8a9099", { r: 0.4, m: 0.7 }), TI.x, 1.4 + i * 1.1, FO - 0.6, escena);
  for (let j = 0; j < 9; j++) M(new T.BoxGeometry(0.5, 0.6, 0.4), HG.mat(["#4cc9f0", "#ff9f43", "#e2e6ec", "#7CFC9A", "#ff4d6d"][(i + j) % 5], { r: 0.5 }), TI.x - 4.4 + j * 1.1, 1.75 + i * 1.1, FO - 0.6, escena, false);
}
const neon = HG.pivote(escena, TI.x, 5.6, FO - 1.6);
M(HG.cajaR(9, 2.4, 0.5, 0.5), HG.mat("#1d3550", { r: 0.4, m: 0.6 }), 0, 0, 0, neon);
M(new T.PlaneGeometry(8.2, 2), new T.MeshBasicMaterial({ map: HG.texTexto("TIENDA", { color: "#ffe0a8", brillo: "#ffb050", tam: 92 }), transparent: true }), 0, 0, -0.27, neon, false).rotation.y = Math.PI;
for (const [w, h, x, y] of [[9.2, 0.12, 0, 1.2], [9.2, 0.12, 0, -1.2], [0.12, 2.4, 4.6, 0], [0.12, 2.4, -4.6, 0]]) M(new T.BoxGeometry(w, h, 0.12), HG.brillo("#4fd0ff"), x, y, -0.3, neon, false);
// Sala de clanes (noroeste): mesa holográfica y estandartes
const CL = { x: -28, z: -18 };
M(new T.CylinderGeometry(3, 3.4, 1, 32), HG.mat("#4a5059", { r: 0.4, m: 0.8 }), CL.x, 0.5, CL.z, escena);
M(new T.CylinderGeometry(2.6, 2.6, 0.05, 32), HG.brillo("#4fd0ff", 0.6), CL.x, 1.03, CL.z, escena, false);
const holoPlaneta = M(new T.SphereGeometry(1.2, 16, 12), new T.MeshBasicMaterial({ color: HG.lin("#4fd0ff"), wireframe: true, transparent: true, opacity: 0.6 }), CL.x, 2.6, CL.z, escena, false);
HG.CLANES_NPC.forEach((c, i) => {
  const x = -36 + i * 4.2;
  M(new T.PlaneGeometry(3, 6), HG.mat(c.color, { r: 0.8, dbl: true, e: c.color, ei: 0.15 }), x, 8, -FO + 0.1, escena, false);
  M(new T.PlaneGeometry(2.4, 0.6), new T.MeshBasicMaterial({ map: HG.texTexto(c.nombre.toUpperCase(), { color: "#fff", tam: 40, w: 1024 }), transparent: true }), x, 6, -FO + 0.15, escena, false);
});
cartel("SALA DE CLANES", -26, 12, -FO + 0.2, 0, 10, { color: "#dff6ff", fondo: "#1d3550" });
// cajas y barriles de decoración (también son obstáculos)
const CAJAS = [[8, 18, 2.4], [11, 21, 1.8], [-6, 20, 2], [34, -24, 2.4], [30, -26, 1.6], [-14, -26, 2]];
CAJAS.forEach(([x, z, s]) => M(HG.cajaR(s, s, s, 0.12), HG.mat("#5d6570", { r: 0.6, m: 0.5 }), x, s / 2, z, escena));
for (let i = 0; i < 5; i++) M(new T.CylinderGeometry(0.6, 0.6, 1.4, 16), HG.mat(i % 2 ? "#c0661f" : "#2f5ea6", { r: 0.5, m: 0.4 }), 36, 0.7, 24 - i * 1.4, escena);

// ---------- Colisiones ----------
const cajasCol = [ // [x0, x1, z0, z1]
  [TI.x - 6, TI.x + 6, TI.z - 2.2, FO], [CL.x - 3.6, CL.x + 3.6, CL.z - 3.6, CL.z + 3.6], [13.8, 16.2, 1.3, 2.7], [35, 37, 17, 25],
  ...CAJAS.map(([x, z, s]) => [x - s / 2, x + s / 2, z - s / 2, z + s / 2]),
];
let cajaNave = null;
const colision = (x, z, r) => {
  for (const c of cajasCol) if (x > c[0] - r && x < c[1] + r && z > c[2] - r && z < c[3] + r) return true;
  if (cajaNave && x > cajaNave[0] - r && x < cajaNave[1] + r && z > cajaNave[2] - r && z < cajaNave[3] + r) return true;
  return false;
};

// ---------- Personajes ----------
const P = id => HG.PERSONAJES.find(p => p.id === id);
const fijos = [
  { p: HG.crearPersonaje(P("bruno")), x: 17.5, z: 4.5, r: -2.4, zona: "hangar", texto: "Hangar con Bruno" },
  { p: HG.crearPersonaje(P("nadia")), x: -19, z: 19, r: -2.3, zona: "amigos", texto: "Amigos con Nadia" },
  { p: HG.crearPersonaje(P("kenji")), x: -23, z: -13.5, r: -2.5, zona: "clanes", texto: "Sala de clanes con Kenji" },
];
fijos.forEach(f => { f.p.grupo.position.set(f.x, 0, f.z); f.p.grupo.rotation.y = f.r; escena.add(f.p.grupo); cajasCol.push([f.x - 0.5, f.x + 0.5, f.z - 0.5, f.z + 0.5]); });
const PUNTOS = [[-10, 0], [0, 6], [10, -2], [-4, -14], [16, -10], [2, 14], [-16, 6], [20, 22], [-2, -24], [28, -14]];
const paseantes = [];
for (let i = 0; i < 6; i++) {
  const p = HG.crearPersonaje(HG.personajeAleatorio(100 + i * 17)), [x, z] = PUNTOS[i];
  p.grupo.position.set(x, 0, z); escena.add(p.grupo);
  paseantes.push({ p, obj: PUNTOS[(i + 3) % PUNTOS.length], espera: HG.rnd(0, 4), t: HG.rnd(0, 10) });
}
// robot de la tienda (modelo CC0 RobotExpressive)
let robot = null, mezclador = null, accionesRobot = {}, saludando = 0;
if (THREE.GLTFLoader) new THREE.GLTFLoader().load("modelos/robot.glb", g => {
  robot = g.scene; const caja = new T.Box3().setFromObject(robot), h = caja.max.y - caja.min.y;
  robot.scale.setScalar(2.1 / h); robot.position.set(TI.x, 0, TI.z + 2.8); robot.rotation.y = 0;
  robot.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material.metalness = 0.8; o.material.roughness = 0.3; if (o.material.color) o.material.color.lerp(new T.Color(0.75, 0.78, 0.82), 0.6); } });
  escena.add(robot);
  mezclador = new T.AnimationMixer(robot);
  for (const c of g.animations) accionesRobot[c.name] = mezclador.clipAction(c);
  accionesRobot.Idle && accionesRobot.Idle.play();
}, undefined, () => {});
cajasCol.push([TI.x - 1, TI.x + 1, TI.z + 2, TI.z + 4]);

// nave expuesta en el hangar
let naveExpuesta = null;
HG.refrescarNaveHangar = () => {
  if (naveExpuesta) holo.remove(naveExpuesta);
  naveExpuesta = null; cajaNave = null;
  const idx = HG.P ? HG.P.naveActiva : -1;
  if (idx < 0) {
    naveExpuesta = M(new T.OctahedronGeometry(2.4), new T.MeshBasicMaterial({ color: HG.lin("#4fd0ff"), wireframe: true }), 0, 3, 0, holo, false);
  } else {
    const d = HG.P.naves[idx]; naveExpuesta = HG.modeloNave(idx, { nivel: d.asp, color: d.color }); naveExpuesta.position.set(0, 2.2, 0); naveExpuesta.rotation.y = 2.4;
    naveExpuesta.traverse(o => { if (o.isMesh) o.castShadow = true; }); holo.add(naveExpuesta);
    const L = HG.largoNave(idx) * 0.42; cajaNave = [HANG.x - L, HANG.x + L, HANG.z - L, HANG.z + L];
  }
};

// ---------- Jugador ----------
let jugador = null, control = null, skinActual = -1;
function prepararJugador() {
  const skin = HG.ajustes.aspecto || 0;
  if (jugador && skinActual === skin) return;
  if (jugador) escena.remove(jugador.grupo);
  jugador = HG.crearPersonaje(HG.PERSONAJES[skin]); skinActual = skin; escena.add(jugador.grupo);
  const prev = control; control = new HG.ControlPie(jugador, { limites: [-AN + 1, AN - 1, -FO + 1, FO - 1], colision });
  if (prev) { control.colocar(prev.pos.x, prev.pos.z, prev.rumbo); control.yaw = prev.yaw; }
}

// ---------- Interacciones ----------
const ZONAS = () => [
  ...fijos.map(f => ({ x: f.x, z: f.z, r: 3.2, zona: f.zona, texto: f.texto })),
  { x: TI.x, z: TI.z - 3.5, r: 4.5, zona: "tienda", texto: "Tienda del robot" }, // delante del mostrador
  { x: HANG.x, z: HANG.z, r: 9, zona: "hangar", texto: "Ver tu nave en el hangar" },
  { x: PAD.x, z: PAD.z, r: 7.5, zona: "despegar", texto: "Despegar" },
];
let zonaCerca = null;

HG.Estacion = {
  escena,
  entrar(desde) {
    prepararJugador(); HG.refrescarNaveHangar();
    if (desde === "puerta") control.colocar(-AN + 4, 14, Math.PI / 2);
    else control.colocar(PAD.x, PAD.z + 9, Math.PI);
    control.yaw = control.rumbo; HG.camara.position.set(control.pos.x - Math.sin(control.yaw) * 5, 3, control.pos.z - Math.cos(control.yaw) * 5);
    HG.audio.musica("estacion");
  },
  actualizar(dt, t, activo) {
    prepararJugador();
    control.actualizar(dt, activo, HG.P.comida <= 0 ? 0.5 : 1);
    jugador.animar(control.estado, t, dt);
    for (const f of fijos) f.p.animar(zonaCerca && zonaCerca.zona === f.zona ? "saludar" : "quieto", t + f.x, dt);
    for (const w of paseantes) {
      const g = w.p.grupo; w.t += dt;
      if (w.espera > 0) { w.espera -= dt; w.p.animar("quieto", w.t, dt); continue; }
      const dx = w.obj[0] - g.position.x, dz = w.obj[1] - g.position.z, d = Math.hypot(dx, dz);
      if (d < 0.6) { w.obj = PUNTOS[HG.rint(0, PUNTOS.length - 1)]; w.espera = HG.rnd(1.5, 6); continue; }
      g.position.x += dx / d * 1.4 * dt; g.position.z += dz / d * 1.4 * dt;
      g.rotation.y += HG.angDif(g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 6);
      w.p.animar("andar", w.t * 0.9, dt);
    }
    if (mezclador) mezclador.update(dt);
    holoPlaneta.rotation.y += dt * 0.6; holo.rotation.y += dt * 0.15;
    // zona más cercana
    zonaCerca = null; let dmin = 1e9;
    for (const z of ZONAS()) { const d = Math.hypot(z.x - control.pos.x, z.z - control.pos.z); if (d < z.r && d < dmin) { dmin = d; zonaCerca = z; } }
    if (robot && zonaCerca && zonaCerca.zona === "tienda" && saludando <= 0 && accionesRobot.Wave) {
      saludando = 6; const a = accionesRobot.Wave; a.reset(); a.setLoop(T.LoopOnce, 1); a.play(); a.crossFadeFrom(accionesRobot.Idle, 0.2, false);
      setTimeout(() => { accionesRobot.Idle.reset().play(); a.crossFadeTo(accionesRobot.Idle, 0.3, false); }, 2000);
    }
    if (saludando > 0) saludando -= dt;
    HG.ui.aviso(activo && zonaCerca ? `<b>E</b> · ${zonaCerca.texto}` : null);
    if (activo && zonaCerca && HG.input.pulsada("KeyE")) HG.juego.zona(zonaCerca.zona);
  },
  posJugador: () => control && control.pos,
};
})();

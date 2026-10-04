// Vuelo en 3D: la nave en tercera persona, armas, piratas, jefes, asteroides, botín, aterrizaje y atraque.
"use strict";
(function () {
const HG = window.HG, T = THREE;
const escena = new T.Scene();
escena.fog = new T.FogExp2(HG.lin("#03040a"), 0.000035);
escena.userData.brillo = [0.85, 0.72]; escena.userData.exposicion = 1.15;
escena.add(new T.AmbientLight(HG.lin("#8090b0"), 0.22));
escena.add(new T.HemisphereLight(HG.lin("#9fbfff"), HG.lin("#201810"), 0.25));
escena.environment = HG.envEspacio(HG.SOL_DIR);
const sol = new T.DirectionalLight(HG.lin("#fff2dd"), 1.6); sol.position.set(4000, 2500, 3000); escena.add(sol);
const sky = HG.cielo(20000); escena.add(sky);
const solVisible = HG.malla(new T.SphereGeometry(500, 24, 16), HG.brillo("#fff4d0"), 12000, 7500, 9000, escena, false);
HG.malla(new T.SphereGeometry(1100, 24, 16), HG.brillo("#ffcf80", 0.25), 12000, 7500, 9000, escena, false);
// destello del sol en la lente
const texDestello = (r0, col) => HG.lienzoTex(128, 128, (c, w, h) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, col); g.addColorStop(r0, col.replace(/[\d.]+\)$/, "0.25)")); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); });
if (T.Lensflare) {
  const lf = new T.Lensflare(), luzSol = new T.PointLight(0xffffff, 0, 1); luzSol.position.set(12000, 7500, 9000);
  lf.addElement(new T.LensflareElement(texDestello(0.2, "rgba(255,244,220,1)"), 700, 0, HG.lin("#fff1dd")));
  lf.addElement(new T.LensflareElement(texDestello(0.5, "rgba(140,190,255,0.5)"), 90, 0.5));
  lf.addElement(new T.LensflareElement(texDestello(0.5, "rgba(255,190,120,0.45)"), 140, 0.75));
  lf.addElement(new T.LensflareElement(texDestello(0.6, "rgba(160,255,200,0.35)"), 60, 1.0));
  luzSol.add(lf); escena.add(luzSol);
}
// polvo espacial alrededor de la nave: da sensación de velocidad
const NPOLVO = 500, polvoPos = new Float32Array(NPOLVO * 3), CUBO = 260;
for (let i = 0; i < NPOLVO * 3; i++) polvoPos[i] = HG.rnd(-CUBO, CUBO);
const polvoGeo = new T.BufferGeometry(); polvoGeo.setAttribute("position", new T.BufferAttribute(polvoPos, 3));
const texMota = HG.lienzoTex(32, 32, (c) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(0, 0, 32, 32); });
const polvo = new T.Points(polvoGeo, new T.PointsMaterial({ map: texMota, size: 0.5, color: HG.lin("#9fb2cc"), transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending }));
polvo.frustumCulled = false; escena.add(polvo);

// Estación y planetas
const estacion = HG.modeloEstacion(); estacion.rotation.y = Math.PI; escena.add(estacion);
const planetas = HG.PLANETAS.map(P => { const g = HG.modeloPlaneta(P); g.position.set(...P.pos); escena.add(g); return { P, g, pos: g.position }; });
// Campos de asteroides
const asteroides = [];
const geosRoca = [1, 2, 3, 4, 5].map(s => HG.geoRoca(s * 31));
[[1100, 60, -650, 1], [-1800, 200, -1500, 3], [-3300, 120, -4700, 2], [2600, -200, -3000, 0]].forEach(([x, y, z, v], k) => {
  for (let i = 0; i < 40; i++) {
    const r = HG.rnd(6, 28), m = HG.malla(geosRoca[i % 5], HG.matRoca(v), x + HG.rnd(-380, 380), y + HG.rnd(-120, 120), z + HG.rnd(-380, 380), escena, false);
    m.scale.setScalar(r); m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    asteroides.push({ m, pos: m.position, r, vida: r * 3, giro: HG.rnd(-0.3, 0.3), mineral: k % 2 ? "ferrita" : "cuarzo" });
  }
});

// Partículas (explosiones, chispas)
const NP = 2000, pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3), parts = [];
const geoP = new T.BufferGeometry(); geoP.setAttribute("position", new T.BufferAttribute(pPos, 3)); geoP.setAttribute("color", new T.BufferAttribute(pCol, 3));
const puntos = new T.Points(geoP, new T.PointsMaterial({ size: 6, vertexColors: true, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
puntos.frustumCulled = false; escena.add(puntos);
const chispas = (p, n, color, vel = 120, tam = 1) => {
  const c = new T.Color(color);
  for (let i = 0; i < n && parts.length < NP; i++) {
    const d = new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(HG.rnd(0.2, 1) * vel);
    parts.push({ p: p.clone(), v: d, vida: HG.rnd(0.4, 1.1) * tam, max: 1.1 * tam, c });
  }
};
const explotar = (p, tam = 1) => { chispas(p, 60 * tam, "#ffb347", 160 * tam, tam); chispas(p, 30 * tam, "#ff5a2a", 90 * tam, tam); chispas(p, 15, "#ffffff", 60, tam); HG.audio.sfx("explosion"); };

// ---------- Nave del jugador ----------
const N = { g: null, pos: new T.Vector3(), vel: new T.Vector3(), yaw: 0, pitch: 0, roll: 0, vel0: 0, lat: 0, hp: 100, hpMax: 100, viva: true, carga: 0, cds: {}, arma: 0, pulsoCd: 0, muerteT: 0 };
const fwd = () => new T.Vector3(-Math.sin(N.yaw) * Math.cos(N.pitch), Math.sin(N.pitch), -Math.cos(N.yaw) * Math.cos(N.pitch));
const der = () => new T.Vector3(Math.cos(N.yaw), 0, -Math.sin(N.yaw));
const stats = () => {
  const i = HG.P.naveActiva, d = HG.P.naves[i], b = HG.NAVES[i];
  return { velMax: b.vel * 1.4 * (1 + 0.1 * d.mov), man: 1 + 0.1 * d.mov, dano: b.dano * (1 + 0.1 * d.com), vidaMax: Math.round(b.vida * (1 + 0.1 * d.com)), bodega: b.bodega };
};
HG.statsNave = stats;
function prepararNave() {
  if (N.g) escena.remove(N.g);
  const i = HG.P.naveActiva, d = HG.P.naves[i];
  N.g = HG.modeloNave(i, { nivel: d.asp, color: d.color }); N.g.rotation.order = "YXZ"; escena.add(N.g);
  const s = stats(); N.hpMax = s.vidaMax;
  N.hp = HG.P.vidaNave == null || HG.P.vidaNave <= 0 ? N.hpMax : Math.min(N.hpMax, HG.P.vidaNave);
}

// ---------- Proyectiles, enemigos y botín ----------
const balas = [], enemigos = [], minas = [], cajas = [], efectos = [];
const GB = { bala: new T.CylinderGeometry(0.25, 0.25, 7, 6).rotateX(Math.PI / 2), misil: new T.CylinderGeometry(0.6, 0.6, 4, 8).rotateX(Math.PI / 2), bola: new T.SphereGeometry(1, 16, 12), mina: new T.OctahedronGeometry(2.2), caja: new T.BoxGeometry(4, 4, 4) };
function disparar(pos, dir, vel, dano, dueno, tipo, color, extra = {}) {
  const geo = tipo === "misil" ? GB.misil : tipo === "plasma" ? GB.bola : GB.bala;
  const m = HG.malla(geo, HG.brillo(color), pos.x, pos.y, pos.z, escena, false);
  if (tipo === "plasma") m.scale.setScalar(extra.tam || 4);
  m.lookAt(pos.clone().add(dir));
  balas.push(Object.assign({ m, pos: m.position, vel: dir.clone().multiplyScalar(vel), dano, dueno, tipo, vida: tipo === "misil" ? 6 : 2.5, color }, extra));
}
function botin(pos, mineral, cant) {
  const m = HG.malla(GB.caja, HG.mat(HG.MINERALES[mineral].color, { e: HG.MINERALES[mineral].color, ei: 0.8 }), pos.x, pos.y, pos.z, escena, false);
  cajas.push({ m, pos: m.position, mineral, cant, vida: 40 });
}
function crearEnemigo(tipo, nivel, pos, planeta = -1, jefe = null) {
  const g = jefe ? HG.modeloJefe(HG.PLANETAS[planeta]) : HG.modeloPirata(tipo);
  g.position.copy(pos); escena.add(g);
  const e = { g, pos: g.position, vel: new T.Vector3(), tipo, nivel, planeta, jefe: !!jefe, radio: jefe ? 34 : 9,
    hpMax: jefe ? jefe.vida : 40 + 35 * nivel, velMax: jefe ? 95 : 120 + 15 * nivel + (tipo === "dardo" ? 40 : 0),
    dano: jefe ? 10 + 4 * nivel : 4 + 3 * nivel, cd: HG.rnd(1, 3), orb: new T.Vector3(HG.rnd(-1, 1), HG.rnd(-0.4, 0.4), HG.rnd(-1, 1)).normalize(), nombre: jefe ? jefe.nombre : null };
  e.hp = e.hpMax; enemigos.push(e); return e;
}
function danarEnemigo(e, d, dueno = true) {
  if (e.hp <= 0) return;
  e.hp -= d; chispas(e.pos, 6, "#ffffff", 60, 0.5);
  if (e.hp <= 0) {
    explotar(e.pos, e.jefe ? 4 : 1.2);
    const pr = e.jefe ? HG.PLANETAS[e.planeta].jefe.premio : Math.round(120 + 90 * e.nivel + HG.rnd(0, 80));
    HG.P.monedas += pr; HG.P.derrotas++;
    HG.ui.toast(e.jefe ? `¡Has derrotado a ${e.nombre}! +${HG.fmt(pr)} monedas. Ya puedes plantar tu bandera en ${HG.PLANETAS[e.planeta].nombre}.` : `Pirata derribado · +${HG.fmt(pr)} monedas`, e.jefe ? "oro" : "");
    if (e.jefe) { const pp = HG.P.planetas[HG.PLANETAS[e.planeta].id] = HG.P.planetas[HG.PLANETAS[e.planeta].id] || {}; pp.jefe = true; }
    if (Math.random() < (e.jefe ? 1 : 0.3)) { const P = HG.PLANETAS[Math.max(0, e.planeta)]; botin(e.pos, P.minerales[HG.rint(0, 1)], e.jefe ? 15 : HG.rint(1, 4)); }
    HG.guardarPartida(); HG.juego.comprobarFinal();
  }
}
const BLINDAJE = 0.5; // todas las naves reciben la mitad de daño de disparos, choques y misiles
function danarJugador(d) {
  if (!N.viva) return;
  N.hp -= d * BLINDAJE; HG.ui.golpe(); HG.audio.sfx("golpe");
  if (N.hp <= 0) { N.hp = 0; N.viva = false; N.muerteT = 2.5; explotar(N.pos, 3); N.g.visible = false; HG.ui.toast("¡Tu nave ha explotado! Pierdes la carga.", "rojo"); }
}
// distancia de un punto al segmento a-b (para que las balas rápidas no atraviesen sin chocar)
const _ab = new T.Vector3(), _ap = new T.Vector3();
function distSeg(p, a, b) {
  _ab.subVectors(b, a); _ap.subVectors(p, a);
  const L = _ab.lengthSq(), k = L > 0 ? HG.clamp(_ap.dot(_ab) / L, 0, 1) : 0;
  return _ap.sub(_ab.multiplyScalar(k)).length();
}
function quitar(lista, i) { const o = lista[i]; if (o.m) escena.remove(o.m); if (o.g) escena.remove(o.g); lista.splice(i, 1); }

// ---------- Generación de piratas ----------
let encuentroT = 30;
const vivosDe = pl => enemigos.filter(e => e.planeta === pl && !e.jefe).length;
const respawnPl = {};
function gestionarPiratas(dt) {
  const dEst = N.pos.length();
  planetas.forEach((pl, k) => {
    const d = N.pos.distanceTo(pl.pos), id = pl.P.id, est = HG.P.planetas[id] || {};
    if (d < 2800) {
      respawnPl[k] = (respawnPl[k] || 0) - dt;
      const max = Math.min(6, 1 + pl.P.nivel);
      if (vivosDe(k) < max && respawnPl[k] <= 0) {
        const p = pl.pos.clone().add(new T.Vector3(HG.rnd(-1, 1), HG.rnd(-0.3, 0.3), HG.rnd(-1, 1)).normalize().multiplyScalar(pl.P.radio + HG.rnd(400, 900)));
        crearEnemigo(["explorador", "dardo", "canonera"][HG.rint(0, Math.min(2, pl.P.nivel))], pl.P.nivel, p, k);
        respawnPl[k] = vivosDe(k) + 1 >= max ? 25 : 1.2;
      }
      if (!est.jefe && d < 1700 && !enemigos.some(e => e.jefe && e.planeta === k)) {
        const p = pl.pos.clone().add(N.pos.clone().sub(pl.pos).normalize().multiplyScalar(pl.P.radio + 300));
        crearEnemigo("canonera", pl.P.nivel, p, k, pl.P.jefe);
        HG.ui.toast(`⚠ ${pl.P.jefe.nombre} defiende ${pl.P.nombre}`, "rojo"); HG.audio.sfx("alarma");
      }
    }
  });
  if (dEst > 1300 && !planetas.some(pl => N.pos.distanceTo(pl.pos) < 2800)) {
    encuentroT -= dt;
    if (encuentroT <= 0) {
      encuentroT = HG.rnd(35, 55); const nv = Math.min(5, 1 + Math.floor(dEst / 2500));
      for (let i = 0; i < HG.rint(2, 3); i++) crearEnemigo(["explorador", "dardo", "canonera"][HG.rint(0, 2)], nv, N.pos.clone().add(fwd().multiplyScalar(1400)).add(new T.Vector3(HG.rnd(-300, 300), HG.rnd(-150, 150), HG.rnd(-300, 300))), -1);
      HG.ui.toast("¡Piratas a la vista!", "rojo"); HG.audio.sfx("alarma");
    }
  }
}

// ---------- Armas ----------
function armaActual() { const eq = HG.P.equipadas; return HG.arma(eq[Math.min(N.arma, eq.length - 1)]); }
function bocas() { return N.g.userData.canones.map(c => c.getWorldPosition(new T.Vector3())); }
let bocaAlt = 0;
function objetivoMisil(pos, dir) {
  let mejor = null, dm = 1e9;
  for (const e of enemigos) { const v = e.pos.clone().sub(pos), d = v.length(); if (d < 2500 && v.normalize().dot(dir) > 0.6 && d < dm) { dm = d; mejor = e; } }
  return mejor;
}
function usarArmas(dt) {
  const I = HG.input, a = armaActual(), s = stats(), f = fwd();
  for (const k in N.cds) N.cds[k] -= dt;
  if (N.pulsoCd > 0) N.pulsoCd -= dt;
  const fuego = I.clic() || I.tecla("Space") || I.tecla("KeyF");
  const apunte = N.pos.clone().add(f.clone().multiplyScalar(900));
  if (a.tipo === "plasma") {
    if (fuego) { N.carga = Math.min(a.carga, N.carga + dt); if (N.carga >= a.carga && !N.avisoCarga) { N.avisoCarga = true; HG.audio.sfx("carga"); } }
    else if (N.carga > 0.15) {
      const k = N.carga / a.carga, b = bocas()[0];
      disparar(b, apunte.clone().sub(b).normalize(), a.vel, s.dano * a.mult * (0.3 + 0.7 * k), true, "plasma", a.color, { tam: 2 + 5 * k, radio: a.radio * (0.4 + 0.6 * k) });
      HG.audio.sfx("plasma"); N.carga = 0; N.avisoCarga = false;
    } else N.carga = 0;
    return;
  }
  if (!fuego || (N.cds[a.id] || 0) > 0) return;
  N.cds[a.id] = 1 / a.cad;
  const bs = bocas();
  if (a.tipo === "bala") {
    const b = bs[bocaAlt++ % bs.length], dir = apunte.clone().sub(b).normalize();
    if (a.disp) dir.add(new T.Vector3(HG.rnd(-a.disp, a.disp), HG.rnd(-a.disp, a.disp), HG.rnd(-a.disp, a.disp))).normalize();
    disparar(b.add(N.vel.clone().multiplyScalar(dt)), dir, a.vel + N.vel.length(), s.dano * a.mult, true, "bala", a.color);
    HG.audio.sfx(a.id === "gatling" ? "gatling" : "laser");
  } else if (a.tipo === "misil") {
    for (const b of bs.slice(0, 2)) disparar(b, f.clone(), a.vel, s.dano * a.mult, true, "misil", a.color, { obj: objetivoMisil(N.pos, f) });
    HG.audio.sfx("misil");
  } else if (a.tipo === "mina") {
    const p = N.pos.clone().sub(f.clone().multiplyScalar(HG.largoNave(HG.P.naveActiva)));
    const m = HG.malla(GB.mina, HG.mat(a.color, { e: a.color, ei: 0.8 }), p.x, p.y, p.z, escena, false);
    minas.push({ m, pos: m.position, dano: s.dano * a.mult, radio: a.radio, vida: 40 }); HG.audio.sfx("mina");
  } else if (a.tipo === "rail") {
    const b = bs[0], hits = [];
    for (const e of enemigos) { const v = e.pos.clone().sub(b), tt = v.dot(f); if (tt > 0 && tt < 3500 && v.sub(f.clone().multiplyScalar(tt)).length() < e.radio + 4) hits.push(e); }
    hits.forEach(e => danarEnemigo(e, s.dano * a.mult));
    for (const ast of asteroides) { const v = ast.pos.clone().sub(b), tt = v.dot(f); if (tt > 0 && tt < 3500 && v.sub(f.clone().multiplyScalar(tt)).length() < ast.r) ast.vida -= s.dano * a.mult; }
    const L = 3500, rayo = HG.malla(new T.CylinderGeometry(0.8, 0.8, L, 6).rotateX(Math.PI / 2).translate(0, 0, -L / 2), HG.brillo(a.color, 0.9), b.x, b.y, b.z, escena, false);
    rayo.quaternion.copy(N.g.quaternion); efectos.push({ m: rayo, vida: 0.3, max: 0.3 }); HG.audio.sfx("rail");
  } else if (a.tipo === "pulso") {
    for (const e of enemigos) if (e.pos.distanceTo(N.pos) < a.radio) danarEnemigo(e, s.dano * a.mult);
    for (const b of balas) if (!b.dueno && b.pos.distanceTo(N.pos) < a.radio) b.vida = 0;
    const anillo = HG.malla(new T.SphereGeometry(1, 32, 16), new T.MeshBasicMaterial({ color: HG.lin(a.color), transparent: true, opacity: 0.4, blending: T.AdditiveBlending, depthWrite: false, wireframe: true }), N.pos.x, N.pos.y, N.pos.z, escena, false);
    efectos.push({ m: anillo, vida: 0.7, max: 0.7, crecer: a.radio }); HG.audio.sfx("pulso");
  }
}

// ---------- Actualización ----------
const cam = HG.camara, tmp = new T.Vector3();
let zonaCerca = null;
function actualizarNave(dt, activo) {
  const I = HG.input, s = stats();
  if (!N.viva) { N.muerteT -= dt; if (N.muerteT <= 0) HG.juego.muerte(); return; }
  if (activo) {
    const r = I.raton(), giro = 1.0 * s.man;
    const dy = (I.tecla("ArrowLeft") ? 1 : 0) - (I.tecla("ArrowRight") ? 1 : 0), dp = (I.tecla("ArrowUp") ? 1 : 0) - (I.tecla("ArrowDown") ? 1 : 0);
    const yawRate = -r.dx * giro * 0.9 + dy * 1.4 * giro * dt;
    N.yaw += yawRate; N.pitch = HG.clamp(N.pitch - r.dy * giro * 0.9 + dp * 1.1 * giro * dt, -1.35, 1.35);
    N.roll += (HG.clamp(-yawRate / Math.max(dt, 0.001) * 0.25, -0.9, 0.9) - N.roll) * Math.min(1, dt * 5);
    const turbo = I.tecla("ShiftLeft") || I.tecla("ShiftRight");
    const obj = I.tecla("KeyW") ? s.velMax * (turbo ? 1.7 : 1) : I.tecla("KeyS") ? -s.velMax * 0.3 : N.vel0 * (1 - dt * 0.15);
    N.vel0 += HG.clamp(obj - N.vel0, -s.velMax * 1.2 * dt, s.velMax * 0.9 * dt);
    N.lat += (((I.tecla("KeyD") ? 1 : 0) - (I.tecla("KeyA") ? 1 : 0)) * s.velMax * 0.45 - N.lat) * Math.min(1, dt * 3);
    const w = I.rueda(); if (w) N.arma = (N.arma + (w > 0 ? 1 : -1) + HG.P.equipadas.length) % HG.P.equipadas.length;
    for (let i = 0; i < 5; i++) if (I.pulsada("Digit" + (i + 1)) && i < HG.P.equipadas.length) N.arma = i;
    usarArmas(dt);
  }
  N.vel.copy(fwd().multiplyScalar(N.vel0)).add(der().multiplyScalar(N.lat));
  N.pos.addScaledVector(N.vel, dt);
  // choques con planetas y la estación
  for (const pl of planetas) { const d = N.pos.distanceTo(pl.pos), min = pl.P.radio + 25; if (d < min) N.pos.copy(pl.pos).add(N.pos.clone().sub(pl.pos).normalize().multiplyScalar(min)); }
  if (N.pos.length() < 270 && Math.abs(N.pos.y) < 40) N.pos.setLength(270);
  N.g.position.copy(N.pos); N.g.rotation.set(N.pitch, N.yaw, N.roll);
  N.g.userData.actualizar(performance.now() / 1000, Math.abs(N.vel0) / s.velMax);
  // cámara de persecución
  const L = HG.largoNave(HG.P.naveActiva), q = N.g.quaternion;
  const objCam = new T.Vector3(0, L * 0.45, L * 1.9).applyQuaternion(q).add(N.pos);
  cam.position.lerp(objCam, 1 - Math.exp(-dt * 7));
  cam.up.set(0, 1, 0).applyQuaternion(q);
  cam.lookAt(N.pos.clone().add(fwd().multiplyScalar(L * 4)));
  cam.fov += ((HG.ajustes.fov + Math.min(20, Math.abs(N.vel0) / s.velMax * 12)) - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix();
  sky.position.copy(cam.position);
}
function actualizarEnemigos(dt) {
  const seguro = N.pos.length() < 900;
  for (let i = enemigos.length - 1; i >= 0; i--) {
    const e = enemigos[i];
    if (e.hp <= 0) { quitar(enemigos, i); continue; }
    const aP = N.pos.clone().sub(e.pos), d = aP.length();
    if (d > 4500 && !e.jefe) { quitar(enemigos, i); continue; }
    e.orb.applyAxisAngle(new T.Vector3(0, 1, 0), dt * 0.4);
    let objetivo = N.viva && !seguro ? N.pos.clone().add(e.orb.clone().multiplyScalar(e.jefe ? 380 : 220)) : e.pos.clone().sub(aP.clone().setLength(200));
    if (e.planeta >= 0 && e.pos.distanceTo(planetas[e.planeta].pos) > 3200) objetivo = planetas[e.planeta].pos.clone();
    const des = objetivo.sub(e.pos).normalize().multiplyScalar(e.velMax);
    e.vel.lerp(des, Math.min(1, dt * 1.2)); e.pos.addScaledVector(e.vel, dt);
    for (const pl of planetas) { const dd = e.pos.distanceTo(pl.pos); if (dd < pl.P.radio + 40) e.pos.copy(pl.pos).add(e.pos.clone().sub(pl.pos).setLength(pl.P.radio + 40)); }
    const mira = d < 1500 ? N.pos : e.pos.clone().add(e.vel);
    e.g.lookAt(e.pos.clone().sub(mira.clone().sub(e.pos)));
    if (e.g.userData.giro) e.g.userData.giro.rotation.y += dt * 2;
    if (e.g.userData.nucleo) e.g.userData.nucleo.scale.setScalar(1 + Math.sin(performance.now() / 150) * 0.15);
    e.cd -= dt;
    if (e.cd <= 0 && d < (e.jefe ? 1400 : 1000) && N.viva && !seguro) {
      e.cd = e.jefe ? 0.9 : Math.max(0.5, 1.7 - 0.15 * e.nivel) * HG.rnd(0.8, 1.3);
      const pred = N.pos.clone().add(N.vel.clone().multiplyScalar(d / 700)), dir = pred.sub(e.pos).normalize();
      if (e.jefe) {
        for (let k = -2; k <= 2; k++) disparar(e.pos.clone(), dir.clone().add(new T.Vector3(k * 0.06, (k % 2) * 0.03, 0)).normalize(), 700, e.dano, false, "bala", "#ff5a3a");
        if (Math.random() < 0.35) disparar(e.pos.clone(), dir.clone(), 330, e.dano * 2.5, false, "misil", "#ff3c6e", { obj: "jugador" });
      } else disparar(e.pos.clone(), dir.add(new T.Vector3(HG.rnd(-0.03, 0.03), HG.rnd(-0.03, 0.03), HG.rnd(-0.03, 0.03))).normalize(), 700, e.dano, false, "bala", "#ff5a3a");
    }
    if (N.viva && d < e.radio + 8) { danarJugador(e.jefe ? 40 : 20); danarEnemigo(e, 60); }
  }
}
function actualizarBalas(dt) {
  for (let i = balas.length - 1; i >= 0; i--) {
    const b = balas[i]; b.vida -= dt;
    if (b.tipo === "misil") {
      const obj = b.obj === "jugador" ? (N.viva ? N.pos : null) : (b.obj && b.obj.hp > 0 ? b.obj.pos : null);
      if (obj) { const sp = b.vel.length(), des = obj.clone().sub(b.pos).normalize().multiplyScalar(sp); b.vel.lerp(des, Math.min(1, dt * 2.5)).setLength(sp); }
      b.m.lookAt(b.pos.clone().add(b.vel)); if (Math.random() < 0.6) chispas(b.pos, 1, "#ffb060", 15, 0.4);
    }
    const prev = b.pos.clone();
    b.pos.addScaledVector(b.vel, dt);
    let golpe = false;
    if (b.dueno) {
      for (const e of enemigos) if (e.hp > 0 && distSeg(e.pos, prev, b.pos) < e.radio + (b.tipo === "plasma" ? b.m.scale.x : 2)) {
        golpe = true;
        if (b.tipo === "plasma") { for (const o of enemigos) if (o.pos.distanceTo(b.pos) < b.radio) danarEnemigo(o, b.dano); explotar(b.pos, 1.5); }
        else danarEnemigo(e, b.dano);
        break;
      }
      if (!golpe) for (const a of asteroides) if (distSeg(a.pos, prev, b.pos) < a.r) { golpe = true; a.vida -= b.dano; chispas(b.pos, 5, "#c8b8a0", 40, 0.5); break; }
    } else if (N.viva && distSeg(N.pos, prev, b.pos) < 7) { golpe = true; danarJugador(b.dano); }
    if (golpe || b.vida <= 0) { if (golpe && b.tipo === "misil") explotar(b.pos, 0.8); quitar(balas, i); }
  }
  for (let i = minas.length - 1; i >= 0; i--) {
    const m = minas[i]; m.vida -= dt; m.m.rotation.y += dt * 2;
    const cerca = enemigos.find(e => e.pos.distanceTo(m.pos) < m.radio);
    if (cerca) { for (const e of enemigos) if (e.pos.distanceTo(m.pos) < m.radio * 1.4) danarEnemigo(e, m.dano); explotar(m.pos, 1.3); m.vida = 0; }
    if (m.vida <= 0) quitar(minas, i);
  }
  for (let i = asteroides.length - 1; i >= 0; i--) {
    const a = asteroides[i]; a.m.rotation.y += a.giro * dt;
    if (a.vida <= 0) { explotar(a.pos, a.r / 20); botin(a.pos, a.mineral, HG.rint(1, 3)); quitar(asteroides, i); continue; }
    if (N.viva && N.pos.distanceTo(a.pos) < a.r + 6) { danarJugador(10 + a.r * 0.5); N.pos.copy(a.pos).add(N.pos.clone().sub(a.pos).setLength(a.r + 8)); N.vel0 *= -0.3; }
  }
  for (let i = cajas.length - 1; i >= 0; i--) {
    const c = cajas[i]; c.vida -= dt; c.m.rotation.x += dt; c.m.rotation.y += dt * 1.3;
    if (N.viva && N.pos.distanceTo(c.pos) < 18) {
      const metido = HG.juego.cargar(c.mineral, c.cant);
      if (metido > 0) { HG.ui.toast(`+${metido} ${HG.MINERALES[c.mineral].nombre}`); HG.audio.sfx("moneda"); quitar(cajas, i); continue; }
    }
    if (c.vida <= 0) quitar(cajas, i);
  }
  for (let i = efectos.length - 1; i >= 0; i--) {
    const f = efectos[i]; f.vida -= dt;
    f.m.material.opacity = Math.max(0, f.vida / f.max) * 0.9;
    if (f.crecer) { f.m.scale.setScalar(f.crecer * (1 - f.vida / f.max)); f.m.position.copy(N.pos); }
    if (f.vida <= 0) { escena.remove(f.m); efectos.splice(i, 1); }
  }
}
function actualizarParticulas(dt) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.vida -= dt; if (p.vida <= 0) { parts.splice(i, 1); continue; } p.p.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - dt * 1.5); }
  const n = parts.length;
  for (let i = 0; i < n; i++) { const p = parts[i], a = p.vida / p.max; pPos.set([p.p.x, p.p.y, p.p.z], i * 3); pCol.set([p.c.r * a, p.c.g * a, p.c.b * a], i * 3); }
  geoP.setDrawRange(0, n); geoP.attributes.position.needsUpdate = true; geoP.attributes.color.needsUpdate = true;
}

// ---------- Marcadores para el HUD ----------
function marcadores() {
  const out = [];
  const add = (pos, texto, tipo, dist) => {
    const v = pos.clone().project(cam), detras = v.z > 1;
    let x = (v.x + 1) / 2, y = (1 - v.y) / 2;
    if (detras) { x = 1 - x; y = 1 - y; }
    const fuera = detras || x < 0.03 || x > 0.97 || y < 0.05 || y > 0.95;
    if (fuera) { const cx = x - 0.5, cy = y - 0.5, k = 0.46 / Math.max(Math.abs(cx), Math.abs(cy) / 0.92, 0.0001); x = 0.5 + cx * k; y = 0.5 + cy * k; }
    out.push({ x, y, texto, tipo, dist, fuera });
  };
  add(new T.Vector3(0, 0, 0), "Estación", "estacion", N.pos.length());
  planetas.forEach(pl => { const st = HG.P.planetas[pl.P.id] || {}; add(pl.pos, pl.P.nombre + (st.conquistado ? " ⚑" : ""), st.conquistado ? "conquistado" : "planeta", N.pos.distanceTo(pl.pos) - pl.P.radio); });
  enemigos.filter(e => e.pos.distanceTo(N.pos) < 2600).slice(0, 14).forEach(e => add(e.pos, e.jefe ? e.nombre : "", e.jefe ? "jefe" : "enemigo", e.pos.distanceTo(N.pos)));
  return out;
}

HG.Espacio = {
  escena,
  entrar(desde) {
    prepararNave(); N.viva = true; N.g.visible = true; N.carga = 0; N.arma = Math.min(N.arma, HG.P.equipadas.length - 1);
    for (let i = enemigos.length - 1; i >= 0; i--) quitar(enemigos, i);
    for (let i = balas.length - 1; i >= 0; i--) quitar(balas, i);
    if (desde === "estacion") { N.pos.set(0, 0, -330); N.yaw = 0; N.pitch = 0; N.vel0 = 60; }
    else { const pl = planetas[desde], dir = pl.pos.clone().negate().normalize(); N.pos.copy(pl.pos).add(dir.clone().multiplyScalar(pl.P.radio + 320)); N.yaw = Math.atan2(-dir.x, -dir.z); N.pitch = Math.asin(HG.clamp(dir.y, -1, 1)); N.vel0 = 50; }
    N.roll = 0; N.lat = 0; N.g.position.copy(N.pos); N.g.rotation.set(N.pitch, N.yaw, 0); N.g.updateMatrixWorld();
    cam.position.copy(new T.Vector3(0, 10, 40).applyQuaternion(N.g.quaternion).add(N.pos));
    HG.audio.musica("vuelo");
  },
  // si la nave explotó, vuelve reparada a la estación
  salir() { HG.P.vidaNave = N.viva && N.hp > 0 ? N.hp : null; cam.up.set(0, 1, 0); cam.fov = HG.ajustes.fov; cam.updateProjectionMatrix(); },
  actualizar(dt, t, activo) {
    actualizarNave(dt, activo);
    gestionarPiratas(dt); actualizarEnemigos(dt); actualizarBalas(dt); actualizarParticulas(dt);
    estacion.userData.anillo.rotation.z += dt * 0.03; estacion.userData.luces.forEach((l, i) => { l.visible = Math.sin(t * 3 + i) > 0; });
    planetas.forEach(pl => { pl.g.userData.esfera.rotation.y += dt * 0.01; if (pl.g.userData.nubes) pl.g.userData.nubes.rotation.y += dt * 0.014; });
    for (let i = 0; i < NPOLVO; i++) for (let k = 0; k < 3; k++) { // el polvo se recoloca alrededor de la nave
      const j = i * 3 + k, c = N.pos.getComponent(k); let v = polvoPos[j];
      if (v < c - CUBO) v += 2 * CUBO; else if (v > c + CUBO) v -= 2 * CUBO; polvoPos[j] = v;
    }
    polvoGeo.attributes.position.needsUpdate = true;
    if (N.viva) HG.P.vidaNave = N.hp;
    // aterrizar o atracar
    zonaCerca = null;
    if (N.viva) {
      if (N.pos.length() < 650) zonaCerca = { tipo: "atracar", texto: "Atracar en la estación" };
      planetas.forEach((pl, k) => { if (N.pos.distanceTo(pl.pos) < pl.P.radio + 280) zonaCerca = { tipo: "aterrizar", planeta: k, texto: `Aterrizar en ${pl.P.nombre}` }; });
    }
    HG.ui.aviso(activo && zonaCerca ? `<b>E</b> · ${zonaCerca.texto}` : null);
    if (activo && zonaCerca && HG.input.pulsada("KeyE")) HG.juego.zona(zonaCerca.tipo, zonaCerca.planeta);
    const a = armaActual(), s = stats(), jefe = enemigos.find(e => e.jefe && e.pos.distanceTo(N.pos) < 3000);
    HG.ui.hudVuelo({
      hp: N.hp, hpMax: N.hpMax, vel: Math.round(Math.abs(N.vel0)), velMax: Math.round(s.velMax), arma: N.arma, carga: a.tipo === "plasma" ? N.carga / a.carga : 0,
      cds: N.cds, jefe: jefe ? { nombre: jefe.nombre, f: jefe.hp / jefe.hpMax } : null, marcadores: marcadores(),
    });
  },
  hambre(dt) { if (N.viva) { N.hp -= 2 * dt; if (N.hp <= 0) { N.hp = 0.01; danarJugador(1); } } },
  posNave: () => N.pos,
  // para pruebas
  _depurar: { N, enemigos, crearEnemigo, planetas },
};
})();

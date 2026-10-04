// Superficie de los planetas: explorar a pie, picar minerales y plantar la bandera al conquistarlo.
"use strict";
(function () {
const HG = window.HG, T = THREE, M = HG.malla;
let escena = null, k = 0, P = null, jugador = null, control = null, vetas = [], parts = [], baliza = null, bandera = null, nave = null, skin = -1;
const NP = 600, pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3);
let geoP = null;
const BAND = { x: 0, z: -60 }, NAVE = { x: 0, z: 10 };

function texSuelo(color) {
  return HG.lienzoTex(256, 256, (c, w, h) => {
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { c.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"; const s = HG.rnd(1, 4); c.fillRect(Math.random() * w, Math.random() * h, s, s); }
    for (let i = 0; i < 30; i++) { c.fillStyle = "rgba(0,0,0,0.06)"; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, HG.rnd(6, 30), HG.rnd(4, 16), Math.random() * 3, 0, 6.283); c.fill(); }
  }, [60, 60]);
}
function construir() {
  escena = new T.Scene();
  const cielo = HG.lin(P.cielo);
  escena.background = cielo; escena.fog = new T.Fog(cielo, 80, 520);
  escena.add(new T.HemisphereLight(HG.lin("#ffffff"), HG.lin(P.suelo), 0.75));
  const sol = new T.DirectionalLight(HG.lin("#fff1dc"), 1.25); sol.position.set(40, 80, 30); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 220 }); sol.shadow.bias = -0.0005;
  escena.add(sol); escena.add(sol.target); escena.userData.sol = sol;
  const suelo = M(new T.PlaneGeometry(1400, 1400), new T.MeshStandardMaterial({ map: texSuelo(P.suelo), roughness: 1 }), 0, 0, 0, escena); suelo.rotation.x = -Math.PI / 2; suelo.castShadow = false;
  // planeta madre en el cielo y montañas
  const tierra = new T.Color(P.tierra), base = new T.Color(P.base);
  for (let i = 0; i < 34; i++) {
    const a = HG.rnd(0, 6.283), d = HG.rnd(260, 480), h = HG.rnd(40, 150), r = HG.rnd(40, 110);
    M(new T.ConeGeometry(r, h, 7), HG.mat(tierra.clone().lerp(base, 0.55).multiplyScalar(0.55 + (i % 4) * 0.1).getStyle(), { r: 1, flat: true }), Math.cos(a) * d, h / 2 - 2, Math.sin(a) * d, escena, false);
  }
  M(new T.SphereGeometry(60, 32, 20), new T.MeshBasicMaterial({ map: HG.texPlaneta(HG.PLANETAS[(k + 2) % 5]), fog: false }), -300, 260, -700, escena, false);
  // rocas de decoración
  for (let i = 0; i < 40; i++) { const a = HG.rnd(0, 6.283), d = HG.rnd(30, 220), s = HG.rnd(0.6, 3); M(HG.geoRoca(i + k * 50, 0.7), HG.matRoca(k % 4), Math.cos(a) * d, s * 0.3, Math.sin(a) * d, escena).scale.setScalar(s); }
  // vetas de mineral
  vetas = [];
  const vidaVeta = 3 + Math.floor(P.nivel / 2);
  for (let i = 0; i < 26; i++) {
    let x, z, tries = 0;
    do { const a = HG.rnd(0, 6.283), d = HG.rnd(14, 110); x = Math.cos(a) * d; z = Math.sin(a) * d; tries++; }
    while (tries < 30 && (Math.hypot(x - NAVE.x, z - NAVE.z) < 14 || Math.hypot(x - BAND.x, z - BAND.z) < 8 || vetas.some(v => Math.hypot(v.x - x, v.z - z) < 6)));
    const mineral = P.minerales[i % 3 === 2 ? 1 : 0], col = HG.MINERALES[mineral].color, s = HG.rnd(1.1, 1.8);
    const g = HG.pivote(escena, x, 0, z);
    M(HG.geoRoca(i * 7 + k, 0.75), HG.matRoca(k % 4), 0, s * 0.45, 0, g).scale.setScalar(s);
    const mc = HG.mat(col, { e: col, ei: 0.7, r: 0.2, m: 0.3 });
    for (let j = 0; j < 4; j++) { const c = M(new T.OctahedronGeometry(0.3).scale(0.6, 1.8, 0.6), mc, HG.rnd(-0.5, 0.5) * s, s * HG.rnd(0.6, 1.1), HG.rnd(-0.5, 0.5) * s, g); c.rotation.set(HG.rnd(-0.5, 0.5), HG.rnd(0, 3), HG.rnd(-0.5, 0.5)); c.scale.multiplyScalar(s); }
    const luz = new T.PointLight(HG.lin(col), 0.6, 6, 2); luz.position.y = s; g.add(luz);
    vetas.push({ g, x, z, r: s, mineral, vida: vidaVeta, max: vidaVeta, sac: 0 });
  }
  // nave aterrizada
  const d = HG.P.naves[HG.P.naveActiva];
  nave = HG.modeloNave(HG.P.naveActiva, { nivel: d.asp, color: d.color }); nave.position.set(NAVE.x, 1.6, NAVE.z); nave.rotation.y = Math.PI * 0.85;
  nave.traverse(o => { if (o.isMesh) o.castShadow = true; }); nave.userData.llamas.forEach(l => l.visible = false); escena.add(nave);
  // baliza o bandera
  baliza = HG.pivote(escena, BAND.x, 0, BAND.z);
  M(new T.CylinderGeometry(2.5, 2.8, 0.4, 24), HG.mat("#4a5059", { m: 0.7, r: 0.4 }), 0, 0.2, 0, baliza);
  baliza.userData.rayo = M(new T.CylinderGeometry(0.8, 0.8, 120, 12, 1, true), HG.brillo("#7CFC9A", 0.35), 0, 60, 0, baliza, false);
  bandera = HG.pivote(escena, BAND.x, 0, BAND.z);
  M(new T.CylinderGeometry(0.08, 0.1, 7, 8), HG.mat("#d9dee6", { m: 0.8, r: 0.3 }), 0, 3.5, 0, bandera);
  const colB = (HG.P.clan && HG.P.clan.color) || "#4cc9f0";
  bandera.userData.tela = M(new T.PlaneGeometry(3.2, 2), HG.mat(colB, { dbl: true, r: 0.8, e: colB, ei: 0.15 }), 1.65, 5.9, 0, bandera);
  M(new T.PlaneGeometry(1.4, 1.4), new T.MeshBasicMaterial({ map: HG.texTexto("H", { color: "#ffffff", tam: 100, w: 128, h: 128 }), transparent: true, side: T.DoubleSide }), 1.65, 5.9, 0.02, bandera, false);
  // partículas
  geoP = new T.BufferGeometry(); geoP.setAttribute("position", new T.BufferAttribute(pPos, 3)); geoP.setAttribute("color", new T.BufferAttribute(pCol, 3));
  const pts = new T.Points(geoP, new T.PointsMaterial({ size: 0.25, vertexColors: true, blending: T.AdditiveBlending, depthWrite: false, transparent: true })); pts.frustumCulled = false; escena.add(pts);
  parts = []; skin = -1;
}
function chispas(x, y, z, n, color) {
  const c = new T.Color(color);
  for (let i = 0; i < n && parts.length < NP; i++) parts.push({ p: new T.Vector3(x, y, z), v: new T.Vector3(HG.rnd(-3, 3), HG.rnd(1, 6), HG.rnd(-3, 3)), vida: HG.rnd(0.4, 0.9), c });
}
const colision = (x, z, r) => {
  if (Math.hypot(x - NAVE.x, z - NAVE.z) < HG.largoNave(HG.P.naveActiva) * 0.38 + r) return true;
  for (const v of vetas) if (v.vida > 0 && Math.hypot(x - v.x, z - v.z) < v.r * 0.8 + r) return true;
  return false;
};
function estado() { return HG.P.planetas[P.id] = HG.P.planetas[P.id] || {}; }

HG.Planeta = {
  get escena() { return escena; },
  entrar(idx) {
    k = idx; P = HG.PLANETAS[idx]; construir();
    if (skin !== HG.ajustes.aspecto || !jugador) { jugador = HG.crearPersonaje(HG.PERSONAJES[HG.ajustes.aspecto || 0]); skin = HG.ajustes.aspecto; }
    escena.add(jugador.grupo); jugador.pico(true);
    control = new HG.ControlPie(jugador, { limites: [-240, 240, -240, 240], colision });
    const sx = NAVE.x + HG.largoNave(HG.P.naveActiva) * 0.5 + 3;
    control.colocar(sx, NAVE.z - 6, Math.PI); control.yaw = Math.PI;
    HG.camara.position.set(sx, 3, NAVE.z - 1);
    const st = estado();
    HG.ui.toast(st.conquistado ? `${P.nombre} es tuyo. ¡Sigue picando!` : st.jefe ? `Planta tu bandera en ${P.nombre} para conquistarlo.` : `Derrota a ${P.jefe.nombre} en órbita para conquistar ${P.nombre}.`);
    HG.audio.musica("vuelo");
  },
  actualizar(dt, t, activo) {
    const st = estado();
    control.actualizar(dt, activo, HG.P.comida <= 0 ? 0.5 : 1);
    jugador.animar(control.estado, t, dt);
    const sol = escena.userData.sol; sol.position.set(control.pos.x + 40, 80, control.pos.z + 30); sol.target.position.copy(control.pos);
    // picar
    if (activo && (HG.input.clic() || HG.input.tecla("KeyF")) && control.accion <= 0) {
      control.accion = 0.45; HG.audio.sfx("pico");
      let mejor = null, dm = 1e9;
      for (const v of vetas) { if (v.vida <= 0) continue; const d = Math.hypot(v.x - control.pos.x, v.z - control.pos.z) - v.r; if (d < dm) { dm = d; mejor = v; } }
      if (mejor && dm < 2.2) {
        mejor.vida -= 1; mejor.sac = 0.2; chispas(mejor.x, mejor.r, mejor.z, 10, HG.MINERALES[mejor.mineral].color);
        control.rumbo = Math.atan2(mejor.x - control.pos.x, mejor.z - control.pos.z);
        if (mejor.vida <= 0) {
          const cant = HG.rint(2, 4), metido = HG.juego.cargar(mejor.mineral, cant);
          HG.ui.toast(metido > 0 ? `+${metido} ${HG.MINERALES[mejor.mineral].nombre}` : "¡Bodega llena! Vende en la estación.", metido > 0 ? "" : "rojo");
          if (metido > 0) HG.audio.sfx("moneda"); else HG.audio.sfx("error");
          chispas(mejor.x, mejor.r, mejor.z, 30, HG.MINERALES[mejor.mineral].color); HG.audio.sfx("explosion");
        }
      }
    }
    for (const v of vetas) {
      if (v.sac > 0) { v.sac -= dt; v.g.position.x = v.x + HG.rnd(-0.06, 0.06); }
      if (v.vida <= 0 && v.g.scale.x > 0.01) v.g.scale.multiplyScalar(Math.max(0, 1 - dt * 6));
    }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.vida -= dt; if (p.vida <= 0) { parts.splice(i, 1); continue; } p.v.y -= 9 * dt; p.p.addScaledVector(p.v, dt); }
    parts.forEach((p, i) => { pPos.set([p.p.x, p.p.y, p.p.z], i * 3); const a = p.vida; pCol.set([p.c.r * a, p.c.g * a, p.c.b * a], i * 3); });
    geoP.setDrawRange(0, parts.length); geoP.attributes.position.needsUpdate = true; geoP.attributes.color.needsUpdate = true;
    baliza.visible = !!st.jefe && !st.conquistado; bandera.visible = !!st.conquistado;
    baliza.userData.rayo.material.opacity = 0.25 + Math.sin(t * 3) * 0.1;
    bandera.userData.tela.rotation.y = Math.sin(t * 2) * 0.15;
    // interacciones
    let av = null;
    const dN = Math.hypot(control.pos.x - NAVE.x, control.pos.z - NAVE.z), dB = Math.hypot(control.pos.x - BAND.x, control.pos.z - BAND.z);
    if (dN < HG.largoNave(HG.P.naveActiva) * 0.5 + 4) av = { t: "Despegar", f: () => HG.juego.zona("despegarPlaneta", k) };
    else if (dB < 5 && st.jefe && !st.conquistado) av = { t: "Plantar bandera", f: () => HG.juego.conquistar(k) };
    HG.ui.aviso(activo && av ? `<b>E</b> · ${av.t}` : null);
    if (activo && av && HG.input.pulsada("KeyE")) av.f();
  },
};
})();

// Superficie de los planetas: explorar a pie, picar minerales y plantar la bandera al conquistarlo.
"use strict";
(function () {
const HG = window.HG, T = THREE, M = HG.malla;
let escena = null, k = 0, P = null, jugador = null, control = null, vetas = [], parts = [], baliza = null, bandera = null, nave = null, skin = -1;
const NP = 600, pPos = new Float32Array(NP * 3), pCol = new Float32Array(NP * 3);
let geoP = null;
const BAND = { x: 0, z: -60 }, NAVE = { x: 0, z: 10 };

const sstep = (a, b, x) => { const t = HG.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const texDetalle = () => HG.lienzoTex(256, 256, (c, w, h) => { // grano claro que multiplica el color del terreno
  c.fillStyle = "#d8d8d8"; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) { const v = Math.random() < 0.5 ? 150 : 255; c.fillStyle = `rgba(${v},${v},${v},0.25)`; const s = HG.rnd(1, 3); c.fillRect(Math.random() * w, Math.random() * h, s, s); }
  for (let i = 0; i < 40; i++) { c.fillStyle = "rgba(120,120,120,0.12)"; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, HG.rnd(6, 30), HG.rnd(4, 16), Math.random() * 3, 0, 6.283); c.fill(); }
}, [180, 180]);
// Cielo: degradado del horizonte al cénit con el sol y su halo
const CIELO = {
  vertexShader: "varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }",
  fragmentShader: `uniform vec3 cenit, horizonte, suelo, solDir, solCol; varying vec3 vD;
    void main(){ vec3 d = normalize(vD); float y = d.y;
      vec3 c = y > 0.0 ? mix(horizonte, cenit, pow(y, 0.5)) : mix(horizonte, suelo, min(1.0, -y * 4.0));
      float s = max(dot(d, solDir), 0.0); c += solCol * (pow(s, 1500.0) * 40.0 + pow(s, 16.0) * 0.4 + pow(s, 3.0) * 0.12);
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`,
};
let altura = () => 0;
// Relieve del planeta: llano junto a la nave y la baliza, colinas alrededor y montañas a lo lejos
function crearAltura() {
  const sem = k * 37.1, F = HG.fbm;
  const base = (x, z) => {
    const dN = Math.hypot(x - NAVE.x, z - NAVE.z), dB = Math.hypot(x - BAND.x, z - BAND.z), d = Math.hypot(x, z);
    const llano = sstep(16, 60, Math.min(dN, dB + 6));
    let h = (F(x * 0.006 + sem, 0.5, z * 0.006, 4) * 26 + F(x * 0.035, 1.7 + sem, z * 0.035, 3) * 3) * llano + F(x * 0.08, 3.3, z * 0.08 + sem, 2) * 0.6;
    const m = sstep(220, 560, d); if (m > 0) h += m * (50 + 260 * Math.abs(F(x * 0.0035, 4.2 + sem, z * 0.0035, 5)));
    return h;
  };
  const h0 = base(NAVE.x, NAVE.z);
  altura = (x, z) => base(x, z) - h0;
}
function construir() {
  escena = new T.Scene();
  const hor = HG.lin(P.cielo), cen = hor.clone().multiplyScalar(0.45).lerp(HG.lin("#1a3a8a"), P.id === "ignea" || P.id === "onix" ? 0 : 0.25);
  escena.fog = new T.Fog(hor, 140, 950); escena.userData.brillo = [0.45, 0.85]; escena.userData.exposicion = 1.2;
  const solDir = new T.Vector3(40, 60, 30).normalize();
  const matCielo = () => new T.ShaderMaterial({ uniforms: { cenit: { value: cen }, horizonte: { value: hor }, suelo: { value: HG.lin(P.suelo).multiplyScalar(0.6) }, solDir: { value: solDir }, solCol: { value: HG.lin("#fff1dc") } },
    vertexShader: CIELO.vertexShader, fragmentShader: CIELO.fragmentShader, side: T.BackSide, depthWrite: false });
  const cielo = new T.Mesh(new T.SphereGeometry(3000, 32, 16), matCielo()); cielo.renderOrder = -2; cielo.frustumCulled = false; escena.add(cielo);
  const escEnv = new T.Scene(); escEnv.add(new T.Mesh(new T.SphereGeometry(40, 32, 16), matCielo())); escena.environment = HG.envDeEscena(escEnv);
  escena.add(new T.HemisphereLight(HG.lin("#ffffff"), HG.lin(P.suelo), 0.45));
  const sol = new T.DirectionalLight(HG.lin("#fff1dc"), 1.7); sol.position.copy(solDir).multiplyScalar(100); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 260 }); sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.04;
  escena.add(sol); escena.add(sol.target); escena.userData.sol = sol; escena.userData.solDir = solDir;
  // terreno con relieve y color según altura, pendiente y manchas
  crearAltura();
  const geo = new T.PlaneGeometry(2000, 2000, 240, 240).rotateX(-Math.PI / 2), pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) pos.setY(i, altura(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const cS = HG.lin(P.suelo), cT = HG.lin(P.tierra).lerp(cS, 0.5), cR = HG.lin(P.suelo).multiplyScalar(0.5).lerp(HG.lin("#5a544c"), 0.4), cN = HG.lin("#f2f6f8"), cc = new T.Color(), nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), n = HG.fbm(x * 0.02, 7.7, z * 0.02 + k, 3);
    cc.copy(cS).lerp(cT, HG.clamp(n * 2 + 0.3, 0, 1)).multiplyScalar(0.85 + n * 0.5);
    cc.lerp(cR, sstep(0.9, 0.7, nor.getY(i)));                          // pendientes de roca
    if (P.id !== "ignea" && P.id !== "duna") cc.lerp(cN, sstep(70, 140, y)); // nieve en las cumbres
    cols[i * 3] = cc.r; cols[i * 3 + 1] = cc.g; cols[i * 3 + 2] = cc.b;
  }
  geo.setAttribute("color", new T.BufferAttribute(cols, 3));
  const suelo = M(geo, new T.MeshStandardMaterial({ vertexColors: true, map: texDetalle(), roughness: P.id === "glacia" ? 0.55 : 0.97, metalness: 0 }), 0, 0, 0, escena); suelo.castShadow = false;
  if (P.id === "ignea") { // ríos de lava que brillan
    const lava = M(new T.PlaneGeometry(2000, 2000).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: HG.lin("#ff4a10").multiplyScalar(2.2) }), 0, -4, 0, escena, false);
    lava.renderOrder = -1;
  }
  M(new T.SphereGeometry(60, 48, 32), new T.MeshBasicMaterial({ map: HG.texPlaneta(HG.PLANETAS[(k + 2) % 5], 512), fog: false }), -300, 300, -700, escena, false);
  // piedras y matas repartidas (instanciadas: miles con pocas llamadas)
  const piedras = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), HG.matRoca(k % 4), 1600), o = new T.Object3D();
  for (let i = 0; i < 1600; i++) {
    const a = HG.rnd(0, 6.283), d = 6 + Math.pow(Math.random(), 0.7) * 260, x = Math.cos(a) * d, z = Math.sin(a) * d, s = HG.rnd(0.08, 0.5) * (Math.random() < 0.06 ? 4 : 1);
    o.position.set(x, altura(x, z) + s * 0.2, z); o.rotation.set(HG.rnd(0, 6), HG.rnd(0, 6), 0); o.scale.set(s, s * HG.rnd(0.4, 0.8), s * HG.rnd(0.7, 1.2)); o.updateMatrix(); piedras.setMatrixAt(i, o.matrix);
  }
  piedras.castShadow = true; piedras.receiveShadow = true; escena.add(piedras);
  if (P.id === "aurora" || P.id === "onix") {
    const texHierba = HG.lienzoTex(64, 64, (c, w, h) => { for (let i = 0; i < 26; i++) { const x = HG.rnd(6, 58); c.strokeStyle = `hsl(${100 + HG.rnd(-15, 15)}, 45%, ${HG.rnd(35, 60)}%)`; c.lineWidth = HG.rnd(1.5, 3); c.beginPath(); c.moveTo(x, h); c.quadraticCurveTo(x + HG.rnd(-6, 6), h * 0.5, x + HG.rnd(-12, 12), HG.rnd(4, 30)); c.stroke(); } });
    const gh = new T.PlaneGeometry(1, 1).translate(0, 0.5, 0), g2 = gh.clone().rotateY(Math.PI / 2), mata = T.BufferGeometryUtils.mergeBufferGeometries([gh, g2]);
    const matM = new T.MeshStandardMaterial({ map: texHierba, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.9, color: P.id === "onix" ? HG.lin("#6fa8ff") : new T.Color(1, 1, 1) });
    const matas = new T.InstancedMesh(mata, matM, 5000);
    for (let i = 0; i < 5000; i++) {
      const a = HG.rnd(0, 6.283), d = 4 + Math.pow(Math.random(), 0.8) * 200, x = Math.cos(a) * d, z = Math.sin(a) * d, s = HG.rnd(0.5, 1.1);
      o.position.set(x, altura(x, z) - 0.05, z); o.rotation.set(0, HG.rnd(0, 6), 0); o.scale.set(s, s * HG.rnd(0.6, 1.2), s); o.updateMatrix(); matas.setMatrixAt(i, o.matrix);
    }
    matas.receiveShadow = true; escena.add(matas);
  }
  // rocas grandes de decoración
  for (let i = 0; i < 40; i++) { const a = HG.rnd(0, 6.283), d = HG.rnd(30, 220), s = HG.rnd(0.6, 3), x = Math.cos(a) * d, z = Math.sin(a) * d; M(HG.geoRoca(i + k * 50, 0.7), HG.matRoca(k % 4), x, altura(x, z) + s * 0.3, z, escena).scale.setScalar(s); }
  // vetas de mineral
  vetas = [];
  const vidaVeta = 3 + Math.floor(P.nivel / 2);
  for (let i = 0; i < 26; i++) {
    let x, z, tries = 0;
    do { const a = HG.rnd(0, 6.283), d = HG.rnd(14, 110); x = Math.cos(a) * d; z = Math.sin(a) * d; tries++; }
    while (tries < 30 && (Math.hypot(x - NAVE.x, z - NAVE.z) < 14 || Math.hypot(x - BAND.x, z - BAND.z) < 8 || vetas.some(v => Math.hypot(v.x - x, v.z - z) < 6)));
    const mineral = P.minerales[i % 3 === 2 ? 1 : 0], col = HG.MINERALES[mineral].color, s = HG.rnd(1.1, 1.8);
    const g = HG.pivote(escena, x, altura(x, z), z);
    M(HG.geoRoca(i * 7 + k, 0.75), HG.matRoca(k % 4), 0, s * 0.45, 0, g).scale.setScalar(s);
    const mc = HG.mat(col, { e: col, ei: 0.7, r: 0.2, m: 0.3 });
    for (let j = 0; j < 4; j++) { const c = M(new T.OctahedronGeometry(0.3).scale(0.6, 1.8, 0.6), mc, HG.rnd(-0.5, 0.5) * s, s * HG.rnd(0.6, 1.1), HG.rnd(-0.5, 0.5) * s, g); c.rotation.set(HG.rnd(-0.5, 0.5), HG.rnd(0, 3), HG.rnd(-0.5, 0.5)); c.scale.multiplyScalar(s); }
    const luz = new T.PointLight(HG.lin(col), 0.6, 6, 2); luz.position.y = s; g.add(luz);
    vetas.push({ g, x, z, r: s, mineral, vida: vidaVeta, max: vidaVeta, sac: 0 });
  }
  // nave aterrizada
  const d = HG.P.naves[HG.P.naveActiva];
  nave = HG.modeloNave(HG.P.naveActiva, { nivel: d.asp, color: d.color }); nave.position.set(NAVE.x, altura(NAVE.x, NAVE.z) + 1.6, NAVE.z); nave.rotation.y = Math.PI * 0.85;
  nave.traverse(o => { if (o.isMesh) o.castShadow = true; }); nave.userData.llamas.forEach(l => l.visible = false); escena.add(nave);
  // baliza o bandera
  baliza = HG.pivote(escena, BAND.x, altura(BAND.x, BAND.z), BAND.z);
  M(new T.CylinderGeometry(2.5, 2.8, 0.4, 24), HG.mat("#4a5059", { m: 0.7, r: 0.4 }), 0, 0.2, 0, baliza);
  baliza.userData.rayo = M(new T.CylinderGeometry(0.8, 0.8, 120, 12, 1, true), HG.brillo("#7CFC9A", 0.35), 0, 60, 0, baliza, false);
  bandera = HG.pivote(escena, BAND.x, altura(BAND.x, BAND.z), BAND.z);
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
    control = new HG.ControlPie(jugador, { limites: [-240, 240, -240, 240], colision, altura });
    const sx = NAVE.x + HG.largoNave(HG.P.naveActiva) * 0.5 + 3;
    control.colocar(sx, NAVE.z - 6, Math.PI); control.yaw = Math.PI;
    HG.camara.position.set(sx, altura(sx, NAVE.z - 1) + 3, NAVE.z - 1);
    const st = estado();
    HG.ui.toast(st.conquistado ? `${P.nombre} es tuyo. ¡Sigue picando!` : st.jefe ? `Planta tu bandera en ${P.nombre} para conquistarlo.` : `Derrota a ${P.jefe.nombre} en órbita para conquistar ${P.nombre}.`);
    HG.audio.musica("vuelo");
  },
  actualizar(dt, t, activo) {
    const st = estado();
    control.actualizar(dt, activo, HG.P.comida <= 0 ? 0.5 : 1);
    jugador.animar(control.estado, t, dt);
    const sol = escena.userData.sol; sol.position.copy(escena.userData.solDir).multiplyScalar(100).add(control.pos); sol.target.position.copy(control.pos);
    // picar
    if (activo && (HG.input.clic() || HG.input.tecla("KeyF")) && control.accion <= 0) {
      control.accion = 0.45; HG.audio.sfx("pico");
      let mejor = null, dm = 1e9;
      for (const v of vetas) { if (v.vida <= 0) continue; const d = Math.hypot(v.x - control.pos.x, v.z - control.pos.z) - v.r; if (d < dm) { dm = d; mejor = v; } }
      if (mejor && dm < 2.2) {
        mejor.vida -= 1; mejor.sac = 0.2; chispas(mejor.x, mejor.g.position.y + mejor.r, mejor.z, 10, HG.MINERALES[mejor.mineral].color);
        control.rumbo = Math.atan2(mejor.x - control.pos.x, mejor.z - control.pos.z);
        if (mejor.vida <= 0) {
          const cant = HG.rint(2, 4), metido = HG.juego.cargar(mejor.mineral, cant);
          HG.ui.toast(metido > 0 ? `+${metido} ${HG.MINERALES[mejor.mineral].nombre}` : "¡Bodega llena! Vende en la estación.", metido > 0 ? "" : "rojo");
          if (metido > 0) HG.audio.sfx("moneda"); else HG.audio.sfx("error");
          chispas(mejor.x, mejor.g.position.y + mejor.r, mejor.z, 30, HG.MINERALES[mejor.mineral].color); HG.audio.sfx("explosion");
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

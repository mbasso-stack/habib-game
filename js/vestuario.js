// Vestuario: pantalla para elegir personaje con vista 3D.
"use strict";
(function () {
const HG = window.HG, T = THREE;
const escena = new T.Scene();
escena.background = HG.lin("#060a16");
escena.fog = new T.Fog(HG.lin("#060a16"), 9, 22);
escena.add(new T.HemisphereLight(HG.lin("#cfe2ff"), HG.lin("#20242c"), 0.75));
const clave = new T.SpotLight(HG.lin("#fff3e0"), 2.4, 20, 0.6, 0.5, 1.5);
clave.position.set(2.5, 6, 4); clave.castShadow = true; clave.shadow.mapSize.set(1024, 1024); escena.add(clave); escena.add(clave.target);
const borde = new T.DirectionalLight(HG.lin("#4fd0ff"), 1.5); borde.position.set(-3, 3, -4); escena.add(borde);
const relleno = new T.PointLight(HG.lin("#ffb070"), 0.9, 10); relleno.position.set(-3, 1.5, 3); escena.add(relleno);
const suelo = HG.malla(new T.CircleGeometry(30, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ map: HG.texRejilla([30, 30]), roughness: 0.8, metalness: 0.5 }), 0, 0, 0, escena); suelo.castShadow = false;
HG.malla(new T.CylinderGeometry(1.4, 1.5, 0.18, 48), HG.mat("#2a3140", { r: 0.4, m: 0.8 }), 0, 0.09, 0, escena);
HG.malla(new T.TorusGeometry(1.45, 0.03, 8, 64).rotateX(Math.PI / 2), HG.brillo("#4fd0ff"), 0, 0.19, 0, escena, false);
HG.malla(new T.PlaneGeometry(44, 22), new T.MeshBasicMaterial({ map: HG.texEstrellas(2048, 1024), fog: false }), 0, 6, -12, escena, false);

const modelos = HG.PERSONAJES.map(d => { const p = HG.crearPersonaje(d); p.grupo.position.y = 0.18; p.grupo.visible = false; escena.add(p.grupo); return p; });
let sel = 0, giro = 0, saludo = 0, alElegir = null, bloqueo = 0;

HG.Vestuario = {
  escena,
  get sel() { return sel; },
  abrir(fn) { alElegir = fn; bloqueo = 0.6; HG.input.finFrame(); this.mostrar(HG.ajustes.aspecto || 0); HG.ui.abrir("vestuario"); },
  mostrar(i) { sel = (i + modelos.length) % modelos.length; modelos.forEach((m, k) => { m.grupo.visible = k === sel; }); saludo = 1.6; giro = 0; HG.ui.repintar(); },
  elegir() { HG.ajustes.aspecto = sel; HG.guardarAjustes(); HG.audio.sfx("compra"); HG.ui.cerrar(); },
  alCerrar() { const f = alElegir; alElegir = null; if (f) f(); },
  actualizar(dt, t) {
    const I = HG.input;
    if (bloqueo > 0) bloqueo -= dt; // evita que la tecla que saltó el vídeo elija personaje
    else if (I.pulsada("ArrowLeft") || I.pulsada("KeyA")) { this.mostrar(sel - 1); HG.audio.sfx("clic"); }
    if (bloqueo <= 0 && (I.pulsada("ArrowRight") || I.pulsada("KeyD"))) { this.mostrar(sel + 1); HG.audio.sfx("clic"); }
    if (bloqueo <= 0 && I.pulsada("Enter")) this.elegir();
    giro += dt * 0.5; if (saludo > 0) saludo -= dt;
    const m = modelos[sel]; m.grupo.rotation.y = Math.sin(giro) * 0.6;
    m.animar(saludo > 0 ? "saludar" : "quieto", t, dt);
    HG.camara.position.set(0, 0.75, 2.9); HG.camara.lookAt(0, 0.45, 0); // personaje arriba, panel abajo
  },
};
})();

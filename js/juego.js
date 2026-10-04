// Bucle principal y estados del juego: menú, intro, estación, espacio y planetas.
"use strict";
(function () {
const HG = window.HG;
let estado = "menu", zona = null, t = 0, fundiendo = false, avisoHambre = false, autoguardado = 0;
const fundido = document.getElementById("fundido"), fpsEl = document.getElementById("fps");
const JUEGO = ["estacion", "espacio", "planeta"];
const modulo = () => estado === "espacio" ? HG.Espacio : estado === "planeta" ? HG.Planeta : HG.Estacion;

HG.quiereRaton = () => JUEGO.includes(estado) && !HG.ui.panelAbierto() && !HG.video.activo();
HG.pausado = false;

function transicion(fn, dur = 350) {
  if (fundiendo) return; fundiendo = true; fundido.style.opacity = 1;
  setTimeout(() => { fn(); setTimeout(() => { fundido.style.opacity = 0; fundiendo = false; }, 120); }, dur);
}
function ir(nuevo, arg) {
  if (estado === "espacio") HG.Espacio.salir();
  estado = nuevo;
  HG.ui.modoHud(nuevo === "espacio" ? "vuelo" : JUEGO.includes(nuevo) ? "pie" : null);
  if (nuevo === "estacion") HG.Estacion.entrar(arg);
  if (nuevo === "espacio") HG.Espacio.entrar(arg);
  if (nuevo === "planeta") HG.Planeta.entrar(arg);
  HG.guardarPartida();
}

HG.juego = {
  estado: () => estado,
  menu() { HG.input.soltarRaton(); estado = "menu"; HG.ui.modoHud(null); HG.ui.aviso(null); HG.Estacion.entrar("puerta"); HG.ui.abrir("principal"); HG.audio.musica("estacion"); },
  nueva() {
    HG.P = HG.partidaNueva(); HG.guardarPartida();
    estado = "intro";
    HG.video.reproducir("video/intro.mp4", () => transicion(() => HG.juego.elegirPersonaje(() => transicion(() => {
      ir("estacion", "puerta");
      HG.ui.toast("Bienvenido a la estación. Tienes 1.000 monedas: compra tu primera nave con Bruno, en el hangar (al este).", "oro");
      setTimeout(() => HG.ui.toast("Haz clic para mover la cámara con el ratón. Esc para pausar."), 1500);
    }))));
  },
  elegirPersonaje(volver) {
    const antes = estado; HG.input.soltarRaton(); HG.ui.aviso(null); HG.ui.modoHud(null);
    estado = "selector"; HG.Vestuario.abrir(() => volver(antes));
  },
  volverEstacion() { HG.juego._estado("estacion"); HG.ui.modoHud("pie"); },
  _estado(e) { estado = e; },
  continuar() { HG.P = HG.cargarPartida() || HG.partidaNueva(); estado = "intro"; transicion(() => ir("estacion", "puerta")); },
  zona(nombre, arg) {
    const P = HG.P;
    if (nombre === "hangar" || nombre === "tienda" || nombre === "clanes") HG.ui.abrir(nombre);
    else if (nombre === "amigos") HG.ui.abrir("tienda", { pestana: "amigos" });
    else if (nombre === "despegar") {
      if (P.naveActiva < 0) { HG.ui.toast("Necesitas una nave. Habla con Bruno en el hangar.", "rojo"); HG.audio.sfx("error"); return; }
      transicion(() => ir("espacio", "estacion"), 600);
    } else if (nombre === "atracar") transicion(() => { ir("estacion", "hangar"); HG.ui.toast("Atracado en la estación. Vende tus minerales en la tienda."); }, 600);
    else if (nombre === "aterrizar") {
      const pl = HG.PLANETAS[arg];
      if (!P.videos[pl.id]) {
        P.videos[pl.id] = true; HG.input.soltarRaton(); estado = "intro"; HG.ui.modoHud(null); HG.ui.aviso(null);
        HG.video.reproducir("video/llegada.mp4", () => transicion(() => ir("planeta", arg)));
      } else transicion(() => ir("planeta", arg), 600);
    } else if (nombre === "despegarPlaneta") transicion(() => ir("espacio", arg), 600);
  },
  cargaTotal() { return Object.values(HG.P.carga).reduce((s, n) => s + n, 0); },
  cargar(mineral, n) {
    const bod = HG.NAVES[HG.P.naveActiva].bodega, libre = Math.max(0, bod - this.cargaTotal()), m = Math.min(libre, n);
    if (m > 0) HG.P.carga[mineral] = (HG.P.carga[mineral] || 0) + m;
    return m;
  },
  conquistar(k) {
    const pl = HG.PLANETAS[k], st = HG.P.planetas[pl.id] = HG.P.planetas[pl.id] || {};
    if (st.conquistado) return;
    st.conquistado = true; const premio = 20000 * pl.nivel; HG.P.monedas += premio;
    HG.ui.toast(`¡${pl.nombre} conquistado! +${HG.fmt(premio)} monedas`, "oro"); HG.audio.sfx("compra");
    HG.guardarPartida(); this.comprobarFinal();
  },
  muerte() {
    HG.P.carga = {}; HG.P.vidaNave = null; HG.P.comida = Math.max(HG.P.comida, 25); // vuelves reparado y con algo de comida
    transicion(() => { ir("estacion", "hangar"); HG.ui.toast("Has reaparecido en la estación. Tu nave está reparada, pero perdiste la carga.", "rojo"); }, 500);
  },
  comprobarFinal() {
    const P = HG.P, conq = Object.values(P.planetas).filter(p => p.conquistado).length;
    if (!P.creditosVistos && conq >= HG.META.planetas && P.derrotas >= HG.META.derrotas && P.monedas >= HG.META.monedas) {
      P.creditosVistos = true; HG.guardarPartida(); setTimeout(() => HG.ui.abrir("creditos"), 800);
    }
  },
  alCerrarPanel(tipo) {
    HG.pausado = false;
    if (tipo === "principal" && estado === "menu") HG.ui.abrir("principal");
    if ((tipo === "ajustes" || tipo === "controles") && estado === "menu") HG.ui.abrir("principal");
    if (tipo === "hangar" && estado === "estacion") HG.refrescarNaveHangar();
    if (tipo === "vestuario") HG.Vestuario.alCerrar();
  },
};

// Esc: pausa / cerrar paneles
addEventListener("keydown", e => {
  if (e.code === "Enter" || e.code === "Space" || e.code === "Escape") if (HG.video.activo()) { HG.video.terminar(); return; }
  if (e.code !== "Escape") return;
  if (HG.ui.panelAbierto()) { if (estado !== "menu" || HG.ui.tipoPanel() !== "principal") HG.ui.cerrar(); }
  else if (JUEGO.includes(estado)) { HG.pausado = true; HG.ui.abrir("pausa"); }
});
document.addEventListener("pointerlockchange", () => {
  if (!document.pointerLockElement && JUEGO.includes(estado) && !HG.ui.panelAbierto() && !HG.video.activo()) { HG.pausado = true; HG.ui.abrir("pausa"); }
});
document.getElementById("saltarVideo").addEventListener("click", () => HG.video.terminar());

// ---------- Bucle ----------
let ultimo = performance.now(), fpsT = 0, fpsN = 0;
function bucle(ahora) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora; t += dt;
  const activo = JUEGO.includes(estado) && !HG.ui.panelAbierto() && !HG.video.activo() && !fundiendo;
  if (estado === "selector") {
    HG.Vestuario.actualizar(dt, t); HG.renderer.render(HG.Vestuario.escena, HG.camara);
  } else if (estado === "menu" || estado === "intro") {
    if (HG.Estacion.posJugador()) HG.Estacion.actualizar(dt, t, false);
    const a = t * 0.06; HG.camara.position.set(Math.sin(a) * 26, 9 + Math.sin(t * 0.2) * 2, Math.cos(a) * 18); HG.camara.lookAt(0, 3, 0);
    HG.renderer.render(HG.Estacion.escena, HG.camara);
  } else if (JUEGO.includes(estado)) {
    const P = HG.P;
    if (activo || estado === "espacio" && !HG.ui.panelAbierto()) {
      P.comida = Math.max(0, P.comida - dt / 12);
      if (P.comida < 20 && !avisoHambre) { avisoHambre = true; HG.ui.toast("¡Tienes hambre! Compra comida en la tienda de la estación.", "rojo"); }
      if (P.comida >= 20) avisoHambre = false;
      if (P.comida <= 0 && estado === "espacio") HG.Espacio.hambre(dt);
    }
    if (!HG.ui.panelAbierto() || estado !== "espacio") modulo().actualizar(dt, t, activo);
    HG.ui.comun();
    HG.renderer.render(modulo().escena, HG.camara);
    autoguardado += dt; if (autoguardado > 10) { autoguardado = 0; HG.guardarPartida(); }
  }
  HG.audio.actualizar(dt);
  HG.input.finFrame();
  if (HG.ajustes.fps) { fpsN++; fpsT += dt; if (fpsT > 0.5) { fpsEl.textContent = Math.round(fpsN / fpsT) + " FPS"; fpsN = 0; fpsT = 0; } fpsEl.style.display = "block"; } else fpsEl.style.display = "none";
}

// ---------- Arranque ----------
HG.aplicarAjustes();
HG.P = HG.cargarPartida() || HG.partidaNueva();
HG.juego.menu();
requestAnimationFrame(bucle);
})();

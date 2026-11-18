// Controles táctiles (móviles y tabletas): joystick a la izquierda, arrastrar a la derecha para mirar y botones.
// Solo aparecen en pantallas táctiles y mientras se juega (sin paneles ni vídeos abiertos).
"use strict";
(function () {
const HG = window.HG;
const tactil = "ontouchstart" in window || navigator.maxTouchPoints > 0;
if (!tactil) return;

const css = document.createElement("style");
css.textContent = `
#tactil { position: fixed; inset: 0; z-index: 15; pointer-events: none; display: none; user-select: none; -webkit-user-select: none; touch-action: none; }
#tactil.on { display: block; }
#tactil .zonaMirar { position: absolute; top: 0; bottom: 0; right: 0; width: 55%; pointer-events: auto; }
#tactil .joy { position: absolute; left: calc(28px + env(safe-area-inset-left)); bottom: calc(28px + env(safe-area-inset-bottom)); width: 150px; height: 150px; border-radius: 50%;
  background: radial-gradient(circle, rgba(79,208,255,.10), rgba(79,208,255,.04)); border: 2px solid rgba(79,208,255,.35); pointer-events: auto; }
#tactil .joy i { position: absolute; left: 50%; top: 50%; width: 62px; height: 62px; margin: -31px 0 0 -31px; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, rgba(180,235,255,.55), rgba(79,208,255,.25)); border: 2px solid rgba(180,235,255,.6); }
#tactil .botones { position: absolute; right: calc(20px + env(safe-area-inset-right)); bottom: calc(22px + env(safe-area-inset-bottom)); display: grid; grid-template-columns: repeat(3, 66px); gap: 12px; pointer-events: none; }
#tactil .bt { width: 66px; height: 66px; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; pointer-events: auto;
  font: 600 11px Orbitron, Arial, sans-serif; letter-spacing: .04em; color: #dff6ff; background: rgba(8,20,40,.55); border: 2px solid rgba(79,208,255,.45); backdrop-filter: blur(2px); }
#tactil .bt.grande { width: 82px; height: 82px; font-size: 12px; border-color: rgba(255,120,90,.7); background: rgba(60,14,10,.5); }
#tactil .bt.on { background: rgba(79,208,255,.35); }
#tactil .bt.oculto { visibility: hidden; }
#tactil .pausaT { position: absolute; top: calc(84px + env(safe-area-inset-top)); right: calc(18px + env(safe-area-inset-right)); width: 44px; height: 44px; font-size: 16px; pointer-events: auto; }
`;
document.head.appendChild(css); document.body.classList.add("tactil");

const raiz = document.createElement("div"); raiz.id = "tactil";
raiz.innerHTML = `<div class="zonaMirar"></div><div class="joy"><i></i></div><div class="botones"></div><div class="bt pausaT">❚❚</div>`;
document.body.appendChild(raiz);
const joy = raiz.querySelector(".joy"), pomo = joy.querySelector("i"), cajaBotones = raiz.querySelector(".botones"), zonaMirar = raiz.querySelector(".zonaMirar");

// botones de cada modo: [texto, tecla virtual, clase]
const BOTONES = {
  pie: [["E", "KeyE"], [HG.t("Picar"), "KeyF"], [HG.t("Saltar"), "Space"], ["", "", "oculto"], ["", "", "oculto"], [HG.t("Correr"), "ShiftLeft"]],
  nave: [["E", "KeyE"], [HG.t("Arma"), "rueda"], [HG.t("Frenar"), "KeyS"], [HG.t("Turbo"), "ShiftLeft"], [HG.t("Motor"), "KeyW"], [HG.t("Fuego"), "KeyF", "grande"]],
};
let modo = null;
function pintarBotones(m) {
  modo = m;
  cajaBotones.innerHTML = BOTONES[m].map(([t, k, c]) => `<div class="bt ${c || ""}" data-k="${k}">${t}</div>`).join("");
  cajaBotones.querySelectorAll(".bt[data-k]").forEach(b => {
    const k = b.dataset.k; if (!k) return;
    const on = e => { e.preventDefault(); b.classList.add("on"); if (k === "rueda") HG.input.girarRueda(1); else HG.input.virtual(k, true); };
    const off = e => { e.preventDefault(); b.classList.remove("on"); if (k !== "rueda") HG.input.virtual(k, false); };
    b.addEventListener("touchstart", on, { passive: false }); b.addEventListener("touchend", off, { passive: false }); b.addEventListener("touchcancel", off, { passive: false });
  });
}
raiz.querySelector(".pausaT").addEventListener("touchstart", e => { e.preventDefault(); HG.pausado = true; HG.input.limpiar(); HG.ui.abrir("pausa"); }, { passive: false });

// joystick: a pie mueve (WASD, y corre al empujar al máximo); en la nave dirige como el ratón
let jId = null, jx = 0, jy = 0;
const R = 60;
function moverJoy(t) {
  const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = t.clientX - cx, dy = t.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
  jx = dx / R; jy = dy / R; pomo.style.transform = `translate(${dx}px, ${dy}px)`;
}
function soltarJoy() { jId = null; jx = jy = 0; pomo.style.transform = ""; for (const k of ["KeyW", "KeyA", "KeyS", "KeyD"]) HG.input.virtual(k, false); }
joy.addEventListener("touchstart", e => { e.preventDefault(); const t = e.changedTouches[0]; jId = t.identifier; moverJoy(t); }, { passive: false });
addEventListener("touchmove", e => {
  for (const t of e.changedTouches) {
    if (t.identifier === jId) moverJoy(t);
    if (t.identifier === mId) { HG.input.mirar((t.clientX - mx) * 2.2, (t.clientY - my) * 2.2); mx = t.clientX; my = t.clientY; }
  }
}, { passive: true });
addEventListener("touchend", e => { for (const t of e.changedTouches) { if (t.identifier === jId) soltarJoy(); if (t.identifier === mId) mId = null; } });
addEventListener("touchcancel", () => { soltarJoy(); mId = null; });

// arrastrar en la mitad derecha: mirar (a pie) o dirigir (en la nave)
let mId = null, mx = 0, my = 0;
zonaMirar.addEventListener("touchstart", e => { e.preventDefault(); const t = e.changedTouches[0]; mId = t.identifier; mx = t.clientX; my = t.clientY; }, { passive: false });

function bucle() {
  requestAnimationFrame(bucle);
  const est = HG.juego.estado(), jugando = ["estacion", "espacio", "planeta"].includes(est) && !HG.ui.panelAbierto() && !HG.video.activo();
  raiz.classList.toggle("on", jugando);
  if (!jugando) return;
  const m = est === "espacio" ? "nave" : "pie";
  if (m !== modo) { HG.input.limpiar(); pintarBotones(m); }
  if (jId == null) return;
  if (m === "pie") {
    HG.input.virtual("KeyW", jy < -0.3); HG.input.virtual("KeyS", jy > 0.3); HG.input.virtual("KeyA", jx < -0.3); HG.input.virtual("KeyD", jx > 0.3);
  } else HG.input.mirar(jx * 9, jy * 9); // dirige la nave de forma continua
}
requestAnimationFrame(bucle);
})();

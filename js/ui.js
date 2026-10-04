// Interfaz: HUD, avisos, menús, hangar, tienda, clanes, ajustes y créditos.
"use strict";
(function () {
const HG = window.HG;
const $ = id => document.getElementById(id);
const panel = $("panel"), avisoEl = $("aviso"), toasts = $("toasts"), hud = $("hud"), marcEl = $("marcadores");
let panelTipo = null, avisoActual = null, sel = 0, pestana = "armas";
const fmt = HG.fmt;
const barra = (f, color) => `<div class="barra"><i style="width:${Math.round(HG.clamp(f, 0, 1) * 100)}%;background:${color}"></i></div>`;
const pips = (n, max) => Array.from({ length: max }, (_, i) => `<span class="pip ${i < n ? "on" : ""}"></span>`).join("");

HG.ui = {
  panelAbierto: () => !!panelTipo,
  tipoPanel: () => panelTipo,
  aviso(html) { if (html === avisoActual) return; avisoActual = html; avisoEl.innerHTML = html || ""; avisoEl.style.display = html ? "block" : "none"; },
  toast(texto, tipo = "") {
    const d = document.createElement("div"); d.className = "toast " + tipo; d.textContent = texto; toasts.appendChild(d);
    setTimeout(() => d.classList.add("fuera"), 3800); setTimeout(() => d.remove(), 4400);
    while (toasts.children.length > 5) toasts.firstChild.remove();
  },
  golpe() { const g = $("golpe"); g.style.opacity = 0.45; clearTimeout(g._t); g._t = setTimeout(() => g.style.opacity = 0, 120); },
  modoHud(m) { hud.className = m || "oculto"; if (m !== "vuelo") marcEl.innerHTML = ""; },
  // datos comunes (monedas, comida, carga, objetivo)
  comun() {
    const P = HG.P; if (!P) return;
    const carga = HG.juego.cargaTotal(), bod = P.naveActiva >= 0 ? HG.NAVES[P.naveActiva].bodega : 0;
    const conq = Object.values(P.planetas).filter(p => p.conquistado).length;
    set("hMonedas", fmt(P.monedas)); set("hCarga", `${carga}/${bod}`); set("hDerrotas", `${P.derrotas}/${HG.META.derrotas}`); set("hPlanetas", `${conq}/${HG.META.planetas}`);
    setBarra("bComida", P.comida / 100, P.comida < 20 ? "#ff5a4a" : "#7CFC9A"); set("tComida", Math.ceil(P.comida));
    set("hObjetivo", P.naveActiva < 0 ? "Compra tu primera nave en el hangar (Bruno, al este)" : carga >= bod && bod ? "Bodega llena: vende minerales en la tienda" : conq < 3 ? "Derrota jefes y planta tu bandera en 3 planetas" : P.derrotas < 100 ? "Derrota a 100 enemigos" : P.monedas < 1e6 ? "Reúne 1.000.000 de monedas" : "¡Misión cumplida!");
  },
  hudVuelo(d) {
    setBarra("bVida", d.hp / d.hpMax, d.hp / d.hpMax < 0.3 ? "#ff5a4a" : "#4fd0ff"); set("tVida", `${Math.ceil(d.hp)}/${d.hpMax}`);
    set("hVel", d.vel); setBarra("bVel", d.vel / (d.velMax * 1.7), "#ffd166");
    const eq = HG.P.equipadas;
    const html = eq.map((id, i) => { const a = HG.arma(id), cd = HG.clamp((d.cds[id] || 0) * a.cad, 0, 1); return `<div class="slot ${i === d.arma ? "sel" : ""}"><b>${i + 1}</b>${a.nombre}<i style="width:${Math.round((1 - cd) * 100)}%"></i></div>`; }).join("");
    set("hArmas", html, true);
    const c = $("cargaPlasma"); c.style.display = d.carga > 0 ? "block" : "none"; if (d.carga > 0) c.firstChild.style.width = Math.round(d.carga * 100) + "%";
    const j = $("barraJefe"); j.style.display = d.jefe ? "block" : "none"; if (d.jefe) { set("nJefe", d.jefe.nombre); j.querySelector("i").style.width = Math.round(d.jefe.f * 100) + "%"; }
    // marcadores
    while (marcEl.children.length < d.marcadores.length) { const m = document.createElement("div"); m.className = "marca"; marcEl.appendChild(m); }
    [...marcEl.children].forEach((el, i) => {
      const m = d.marcadores[i]; if (!m) { el.style.display = "none"; return; }
      el.style.display = "block"; el.className = "marca " + m.tipo + (m.fuera ? " fuera" : "");
      el.style.left = (m.x * 100) + "%"; el.style.top = (m.y * 100) + "%";
      const txt = m.tipo === "enemigo" ? "" : `${m.texto}<small>${m.dist > 1000 ? (m.dist / 1000).toFixed(1) + " km" : Math.max(0, Math.round(m.dist)) + " m"}</small>`;
      if (el._t !== txt) { el._t = txt; el.innerHTML = txt; }
    });
  },
  abrir(tipo, opc = {}) {
    panelTipo = tipo; if (opc.pestana) pestana = opc.pestana;
    if (tipo === "hangar") sel = Math.max(0, HG.P.naveActiva);
    HG.input.soltarRaton(); HG.input.limpiar(); HG.ui.aviso(null);
    pintar(); panel.style.display = "flex"; HG.audio.sfx("clic");
  },
  cerrar() { if (!panelTipo) return; const t = panelTipo; panelTipo = null; panel.style.display = "none"; panel.innerHTML = ""; HG.juego.alCerrarPanel(t); },
  repintar() { if (panelTipo) pintar(); },
};
function set(id, v, html) { const el = $(id); if (el && el._v !== v) { el._v = v; if (html) el.innerHTML = v; else el.textContent = v; } }
function setBarra(id, f, color) { const el = $(id); if (!el) return; const w = Math.round(HG.clamp(f, 0, 1) * 100) + "%"; if (el.style.width !== w) el.style.width = w; el.style.background = color; }

// ---------- Pintar paneles ----------
function cabecera(titulo, sub, quien) {
  return `<div class="cab"><div><h2>${titulo}</h2><p>${sub || ""}</p></div>${quien ? `<div class="quien">${quien}</div>` : ""}<button class="x" data-acc="cerrar">✕</button></div>
  <div class="saldo"><span class="oro">● ${fmt(HG.P.monedas)} monedas</span><span>🍖 Comida ${Math.ceil(HG.P.comida)}/100</span><span>📦 Carga ${HG.juego.cargaTotal()}/${HG.P.naveActiva >= 0 ? HG.NAVES[HG.P.naveActiva].bodega : 0}</span></div>`;
}
function pintar() {
  const P = HG.P, t = panelTipo;
  let h = "";
  if (t === "hangar") {
    const n = HG.NAVES[sel], d = P.naves[sel], mx = HG.NAVES[9];
    h += cabecera("HANGAR", "Compra, mejora y equipa tus naves", "Bruno «Llave» Kowalski · Mecánico");
    h += `<div class="dos"><div class="lista">${HG.NAVES.map((nv, i) => `<button class="fila ${i === sel ? "sel" : ""}" data-acc="selNave" data-i="${i}"><b>${i + 1}. ${nv.nombre}</b><span>${P.naves[i] ? (P.naveActiva === i ? "EN USO" : "TUYA") : fmt(nv.precio) + " ●"}</span></button>`).join("")}</div><div class="detalle">`;
    h += `<h3>${n.nombre}</h3><div class="stats">
      <div>Velocidad ${barra(n.vel / mx.vel, "#ffd166")}<span>${n.vel}</span></div><div>Vida ${barra(n.vida / mx.vida, "#7CFC9A")}<span>${n.vida}</span></div>
      <div>Daño ${barra(n.dano / mx.dano, "#ff6a5a")}<span>${n.dano}</span></div><div>Bodega ${barra(n.bodega / mx.bodega, "#4fd0ff")}<span>${n.bodega}</span></div>
      <div>Huecos de armas <span class="grande">${n.huecos}</span></div></div>`;
    if (!d) h += `<button class="boton grande" data-acc="comprarNave" ${P.monedas < n.precio ? "disabled" : ""}>Comprar por ${fmt(n.precio)} monedas</button>`;
    else {
      if (P.naveActiva !== sel) h += `<button class="boton" data-acc="usarNave">Usar esta nave</button>`;
      h += `<h4>Mejoras</h4>` + HG.RAMAS.map(r => { const nv = d[r.id], c = HG.costeMejora(sel, nv + 1); return `<div class="mejora"><div><b>${r.nombre}</b><small>${r.id === "asp" ? HG.ASPECTOS[Math.min(5, nv + (nv < 5 ? 1 : 0))] : r.desc}</small></div><div>${pips(nv, 5)}</div>${nv < 5 ? `<button class="boton peq" data-acc="mejorar" data-r="${r.id}" ${P.monedas < c ? "disabled" : ""}>${fmt(c)} ●</button>` : `<span class="ok">MÁX</span>`}</div>`; }).join("");
      if (d.asp >= 1) h += `<h4>Color</h4><div class="colores">${HG.COLORES_NAVE.map(c => `<button class="color ${d.color === c ? "sel" : ""}" style="background:${c}" data-acc="color" data-c="${c}"></button>`).join("")}</div>`;
      if (P.naveActiva === sel) {
        h += `<h4>Armas equipadas (${P.equipadas.length}/${n.huecos})</h4><div class="huecos">${Array.from({ length: n.huecos }, (_, i) => `<select data-acc="equipar" data-i="${i}"><option value="">— vacío —</option>${P.armas.map(id => `<option value="${id}" ${P.equipadas[i] === id ? "selected" : ""}>${HG.arma(id).nombre}</option>`).join("")}</select>`).join("")}</div>`;
        const s = HG.statsNave(), hp = P.vidaNave == null ? s.vidaMax : P.vidaNave, coste = Math.ceil((s.vidaMax - hp) * 2);
        h += `<div class="mejora"><div><b>Casco</b><small>${Math.ceil(hp)}/${s.vidaMax} de vida</small></div><div>${barra(hp / s.vidaMax, "#7CFC9A")}</div>${hp < s.vidaMax ? `<button class="boton peq" data-acc="reparar" ${P.monedas < coste ? "disabled" : ""}>Reparar ${fmt(coste)} ●</button>` : `<span class="ok">OK</span>`}</div>`;
      }
    }
    h += `</div></div>`;
  } else if (t === "tienda") {
    h += cabecera("TIENDA", "Armas, comida, venta de minerales y amigos", pestana === "amigos" ? "Nadia Reyes · Amigos" : "Robot dependiente");
    h += `<div class="pestanas">${[["armas", "Armas"], ["comida", "Comida"], ["vender", "Vender minerales"], ["amigos", "Amigos"]].map(([id, n]) => `<button class="${pestana === id ? "sel" : ""}" data-acc="pestana" data-p="${id}">${n}</button>`).join("")}</div><div class="rejilla">`;
    if (pestana === "armas") h += HG.ARMAS.map(a => `<div class="carta"><h4 style="color:${a.color}">${a.nombre}</h4><p>${a.desc}</p>${P.armas.includes(a.id) ? `<span class="ok">EN TU ARSENAL · equípala en el hangar</span>` : `<button class="boton" data-acc="comprarArma" data-id="${a.id}" ${P.monedas < a.precio ? "disabled" : ""}>${fmt(a.precio)} ●</button>`}</div>`).join("");
    if (pestana === "comida") h += `<div class="carta ancha">Comida ${barra(P.comida / 100, "#7CFC9A")} ${Math.ceil(P.comida)}/100<p>Baja con el tiempo. Sin comida, tu nave pierde vida y caminas más despacio.</p></div>` + HG.COMIDAS.map(c => `<div class="carta"><h4>${c.nombre}</h4><p>${c.desc}<br>+${c.valor} de comida</p><button class="boton" data-acc="comer" data-id="${c.id}" ${P.monedas < c.precio || P.comida >= 100 ? "disabled" : ""}>Comer · ${fmt(c.precio)} ●</button></div>`).join("");
    if (pestana === "vender") {
      const items = Object.entries(P.carga).filter(([, n]) => n > 0);
      const total = items.reduce((s, [m, n]) => s + n * HG.MINERALES[m].precio, 0);
      h += items.length ? items.map(([m, n]) => { const M = HG.MINERALES[m]; return `<div class="carta"><h4 style="color:${M.color}">${M.nombre}</h4><p>${n} unidades × ${fmt(M.precio)} ●</p><button class="boton" data-acc="vender" data-m="${m}">Vender por ${fmt(n * M.precio)} ●</button></div>`; }).join("") + `<div class="carta ancha"><button class="boton grande" data-acc="venderTodo">Vender todo · ${fmt(total)} ●</button></div>`
        : `<div class="carta ancha"><p>No llevas minerales. Pica rocas en los planetas o recoge las cajas que sueltan piratas y asteroides.</p></div>`;
      h += `<div class="carta ancha"><h4>Precios</h4><p>${Object.values(HG.MINERALES).map(M => `<span style="color:${M.color}">${M.nombre}</span> ${fmt(M.precio)} ●`).join(" · ")}</p></div>`;
    }
    if (pestana === "amigos") {
      h += `<div class="carta ancha"><p><b>Nadia:</b> «Aquí conoces a otros pilotos. Ahora mismo son pilotos de la estación; cuando el juego sea online, verás aquí a personas reales.»</p><p>Amigos: ${P.amigos.length}</p></div>`;
      h += HG.PILOTOS_NPC.map((n, i) => { const am = P.amigos.includes(n); return `<div class="carta"><h4>${n}</h4><p>Nivel ${3 + (i * 7) % 18} · ${i % 3 ? "En la estación" : "De misión"}</p><button class="boton ${am ? "sec" : ""}" data-acc="amigo" data-n="${n}">${am ? "Quitar amigo" : "Añadir amigo"}</button></div>`; }).join("");
    }
    h += `</div>`;
  } else if (t === "clanes") {
    const c = P.clan;
    h += cabecera("SALA DE CLANES", "Únete a un clan o crea el tuyo", "Capitán Kenji Morita · Comandante");
    h += `<div class="carta ancha">${c ? `<h4 style="color:${c.color}">Tu clan: ${c.nombre}</h4><p>${c.lema || ""}</p><button class="boton sec" data-acc="salirClan">Salir del clan</button>` : `<p>No perteneces a ningún clan. Tu bandera en los planetas tendrá el color de tu clan.</p>`}</div><div class="rejilla">`;
    h += HG.CLANES_NPC.map(cl => `<div class="carta"><h4 style="color:${cl.color}">${cl.nombre}</h4><p>${cl.lema}<br>${cl.miembros} miembros</p>${c && c.nombre === cl.nombre ? `<span class="ok">ERES MIEMBRO</span>` : `<button class="boton" data-acc="unirse" data-n="${cl.nombre}">Unirse</button>`}</div>`).join("");
    h += `<div class="carta"><h4>Crear clan</h4><p>Cuesta 5.000 monedas.</p><input id="nombreClan" maxlength="24" placeholder="Nombre del clan"><div class="colores">${HG.COLORES_NAVE.map((col, i) => `<button class="color ${i === 0 ? "sel" : ""}" style="background:${col}" data-acc="colorClan" data-c="${col}"></button>`).join("")}</div><button class="boton" data-acc="crearClan" ${P.monedas < 5000 ? "disabled" : ""}>Crear · 5.000 ●</button></div></div>`;
  } else if (t === "ajustes") {
    const A = HG.ajustes;
    h += `<div class="cab"><div><h2>AJUSTES</h2><p>Configura el juego a tu gusto</p></div><button class="x" data-acc="cerrar">✕</button></div><div class="ajustes">
      <label>Volumen de la música <input type="range" min="0" max="1" step="0.05" value="${A.musica}" data-aj="musica"></label>
      <label>Volumen de los efectos <input type="range" min="0" max="1" step="0.05" value="${A.efectos}" data-aj="efectos"></label>
      <label>Calidad gráfica <select data-aj="calidad">${["baja", "media", "alta"].map(q => `<option ${A.calidad === q ? "selected" : ""}>${q}</option>`).join("")}</select></label>
      <label>Sensibilidad del ratón <input type="range" min="0.0008" max="0.006" step="0.0002" value="${A.sens}" data-aj="sens"></label>
      <label>Campo de visión <input type="range" min="55" max="100" step="1" value="${A.fov}" data-aj="fov"></label>
      <label class="chk"><input type="checkbox" ${A.invertir ? "checked" : ""} data-aj="invertir"> Invertir eje vertical</label>
      <label class="chk"><input type="checkbox" ${A.fps ? "checked" : ""} data-aj="fps"> Mostrar FPS</label>
      <h4>Tu personaje</h4><div class="skins">${HG.PERSONAJES.map((p, i) => `<button class="${A.aspecto === i ? "sel" : ""}" data-acc="skin" data-i="${i}"><span style="background:${p.traje}"></span>${p.nombre}</button>`).join("")}</div>
      </div><button class="boton" data-acc="cerrar">Listo</button>`;
  } else if (t === "pausa") {
    h += `<div class="menuCentro"><h2>PAUSA</h2><button class="boton grande" data-acc="cerrar">Continuar</button><button class="boton" data-acc="abrir" data-t="ajustes">Ajustes</button><button class="boton" data-acc="abrir" data-t="controles">Controles</button><button class="boton sec" data-acc="salirMenu">Guardar y salir al menú</button></div>`;
  } else if (t === "controles") {
    h += `<div class="cab"><div><h2>CONTROLES</h2><p>Haz clic en el juego para controlar la cámara con el ratón · Esc para pausar</p></div><button class="x" data-acc="cerrar">✕</button></div><div class="dos ctrls">
      <div><h4>A pie</h4><p><kbd>W A S D</kbd> moverse · <kbd>Shift</kbd> correr · <kbd>Espacio</kbd> saltar<br><kbd>Ratón</kbd> cámara · <kbd>Rueda</kbd> zoom · <kbd>E</kbd> interactuar<br><kbd>Clic</kbd> o <kbd>F</kbd> picar minerales (en los planetas)</p></div>
      <div><h4>En la nave</h4><p><kbd>Ratón</kbd> o <kbd>flechas</kbd> dirigir · <kbd>W</kbd> acelerar · <kbd>S</kbd> frenar · <kbd>A D</kbd> desplazarse<br><kbd>Shift</kbd> turbo · <kbd>Clic</kbd>, <kbd>Espacio</kbd> o <kbd>F</kbd> disparar (mantén con el plasma)<br><kbd>1</kbd>–<kbd>5</kbd> o <kbd>rueda</kbd> cambiar arma · <kbd>E</kbd> aterrizar o atracar</p></div></div><button class="boton" data-acc="cerrar">Entendido</button>`;
  } else if (t === "principal") {
    const hay = !!HG.cargarPartida();
    h += `<div class="menuCentro principal"><h1>HALUSKI</h1><h3>MISIÓN COLONIAL</h3>
      ${hay ? `<button class="boton grande" data-acc="continuar">Continuar</button>` : ""}<button class="boton ${hay ? "" : "grande"}" data-acc="nueva">Nueva partida</button>
      <button class="boton" data-acc="abrir" data-t="ajustes">Ajustes</button><button class="boton" data-acc="abrir" data-t="controles">Controles</button>
      <a class="boton sec" href="clasico.html">Juego clásico</a><p class="nota">Fase 1 · sin conexión: los demás pilotos son NPCs. El modo online llega en la fase 2.</p></div>`;
  } else if (t === "creditos") {
    const conq = Object.values(P.planetas).filter(p => p.conquistado).length;
    h += `<div class="creditos"><div class="rodillo"><h1>¡MISIÓN CUMPLIDA!</h1><p>Has conquistado ${conq} planetas, derrotado a ${P.derrotas} enemigos y reunido ${fmt(P.monedas)} monedas.</p>
      <h3>HALUSKI: MISIÓN COLONIAL</h3><p><b>Idea y dirección</b><br>Malik</p><p><b>Música</b><br>«Interestelar» (Suno)</p><p><b>Cinemáticas e imágenes</b><br>Magnific</p>
      <p><b>Robot de la tienda</b><br>RobotExpressive, de Tomás Laulhé (CC0)</p><p><b>Programación</b><br>Claude</p><p>Gracias por jugar.</p></div><button class="boton" data-acc="cerrar">Seguir jugando</button></div>`;
  }
  panel.className = "panel " + t; panel.innerHTML = `<div class="caja">${h}</div>`;
}

// ---------- Acciones ----------
let colorClan = HG.COLORES_NAVE[0];
panel.addEventListener("click", e => {
  const b = e.target.closest("[data-acc]"); if (!b || b.disabled || b.tagName === "SELECT") return;
  const P = HG.P, a = b.dataset.acc;
  const pagar = c => { if (P.monedas < c) { HG.audio.sfx("error"); HG.ui.toast("No tienes suficientes monedas.", "rojo"); return false; } P.monedas -= c; HG.audio.sfx("compra"); return true; };
  switch (a) {
    case "cerrar": HG.ui.cerrar(); return;
    case "abrir": HG.ui.abrir(b.dataset.t); return;
    case "selNave": sel = +b.dataset.i; HG.audio.sfx("clic"); break;
    case "comprarNave": if (pagar(HG.NAVES[sel].precio)) {
      P.naves[sel] = { mov: 0, com: 0, asp: 0, color: HG.COLORES_NAVE[0] }; P.naveActiva = sel; P.vidaNave = null;
      P.equipadas = P.equipadas.slice(0, HG.NAVES[sel].huecos); if (!P.equipadas.length) P.equipadas = ["laser"];
      HG.ui.toast(`¡${HG.NAVES[sel].nombre} es tuya! Ve a la plataforma de despegue.`, "oro"); HG.refrescarNaveHangar();
    } break;
    case "usarNave": P.naveActiva = sel; P.vidaNave = null; P.equipadas = P.equipadas.slice(0, HG.NAVES[sel].huecos); HG.refrescarNaveHangar(); HG.audio.sfx("compra"); break;
    case "mejorar": { const r = b.dataset.r, d = P.naves[sel]; if (d[r] < 5 && pagar(HG.costeMejora(sel, d[r] + 1))) { d[r]++; if (r === "com") P.vidaNave = null; HG.refrescarNaveHangar(); } break; }
    case "color": P.naves[sel].color = b.dataset.c; HG.refrescarNaveHangar(); break;
    case "reparar": { const s = HG.statsNave(); if (pagar(Math.ceil((s.vidaMax - (P.vidaNave ?? s.vidaMax)) * 2))) P.vidaNave = s.vidaMax; break; }
    case "pestana": pestana = b.dataset.p; HG.audio.sfx("clic"); break;
    case "comprarArma": { const ar = HG.arma(b.dataset.id); if (pagar(ar.precio)) { P.armas.push(ar.id); if (P.naveActiva >= 0 && P.equipadas.length < HG.NAVES[P.naveActiva].huecos) P.equipadas.push(ar.id); HG.ui.toast(`${ar.nombre} comprada.`, "oro"); } break; }
    case "comer": { const c = HG.COMIDAS.find(x => x.id === b.dataset.id); if (pagar(c.precio)) P.comida = Math.min(100, P.comida + c.valor); break; }
    case "vender": { const m = b.dataset.m, v = P.carga[m] * HG.MINERALES[m].precio; P.monedas += v; P.carga[m] = 0; HG.audio.sfx("moneda"); HG.ui.toast(`+${fmt(v)} monedas`, "oro"); HG.juego.comprobarFinal(); break; }
    case "venderTodo": { let v = 0; for (const m in P.carga) { v += P.carga[m] * HG.MINERALES[m].precio; P.carga[m] = 0; } P.monedas += v; HG.audio.sfx("moneda"); HG.ui.toast(`+${fmt(v)} monedas`, "oro"); HG.juego.comprobarFinal(); break; }
    case "amigo": { const n = b.dataset.n, i = P.amigos.indexOf(n); if (i >= 0) P.amigos.splice(i, 1); else { P.amigos.push(n); HG.ui.toast(`${n} ahora es tu amigo.`); } HG.audio.sfx("clic"); break; }
    case "unirse": { const cl = HG.CLANES_NPC.find(c => c.nombre === b.dataset.n); P.clan = { nombre: cl.nombre, color: cl.color, lema: cl.lema }; HG.ui.toast(`Te has unido a ${cl.nombre}.`, "oro"); HG.audio.sfx("compra"); break; }
    case "salirClan": P.clan = null; break;
    case "colorClan": colorClan = b.dataset.c; panel.querySelectorAll("[data-acc=colorClan]").forEach(x => x.classList.toggle("sel", x === b)); return;
    case "crearClan": { const nom = ($("nombreClan").value || "").trim(); if (!nom) { HG.ui.toast("Escribe un nombre para tu clan.", "rojo"); return; } if (pagar(5000)) { P.clan = { nombre: nom, color: colorClan, lema: "Clan fundado por ti." }; HG.ui.toast(`Has fundado el clan ${nom}.`, "oro"); } break; }
    case "skin": HG.ajustes.aspecto = +b.dataset.i; HG.guardarAjustes(); break;
    case "salirMenu": HG.guardarPartida(); HG.ui.cerrar(); HG.juego.menu(); return;
    case "continuar": HG.juego.continuar(); HG.ui.cerrar(); return;
    case "nueva": if (!HG.cargarPartida() || confirm("¿Empezar una partida nueva? Se borrará la actual.")) { HG.juego.nueva(); HG.ui.cerrar(); } return;
  }
  HG.guardarPartida(); pintar();
});
panel.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.acc === "equipar") {
    const P = HG.P, i = +el.dataset.i, v = el.value, eq = P.equipadas.slice();
    eq[i] = v; const limpio = eq.filter(Boolean).filter((x, j, arr) => arr.indexOf(x) === j);
    P.equipadas = limpio.length ? limpio : ["laser"]; HG.guardarPartida(); pintar();
  }
  if (el.dataset.aj) { const k = el.dataset.aj; HG.ajustes[k] = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value; HG.guardarAjustes(); }
});
panel.addEventListener("input", e => { const el = e.target; if (el.dataset.aj && el.type === "range") { HG.ajustes[el.dataset.aj] = +el.value; HG.aplicarAjustes(); } });
})();

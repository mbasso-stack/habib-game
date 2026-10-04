// Personajes estilo Fortnite hechos con geometría y animados por código. Miran hacia +Z; los pies en y = 0.
"use strict";
(function () {
const HG = window.HG, T = THREE;

HG.PERSONAJES = [
  { id: "haluski", nombre: "Haluski", rol: "Protagonista", piel: "#f1c9a5", pelo: "#dcb468", peinado: "puntas", ojos: "#3d7fc4",
    traje: "#2f5ea6", panel: "#274f8d", cuello: "#9aa3ad", detalle: "#3a414c", guantes: "#8c939c", botas: "#3a3d42", mochila: "#2f5ea6", mangueras: true, parches: true, altura: 1.8, k: 1.0, semilla: 11 },
  { id: "nadia", nombre: "Nadia Reyes", rol: "Exploradora · Amigos", piel: "#d9a27e", pelo: "#17171b", peinado: "rizos", ojos: "#5a3a22",
    traje: "#3f7b3c", panel: "#1f3c6e", cuello: "#1f3c6e", detalle: "#1f3c6e", guantes: "#3f7b3c", botas: "#2e5a2c", mochila: "#8f959c", rayas: true, altura: 1.7, k: 0.92, semilla: 22 },
  { id: "kenji", nombre: "Capitán Kenji Morita", rol: "Comandante · Clanes", piel: "#e3b48e", pelo: "#a9a9a9", peinado: "atras", barba: "corta", ojos: "#3b2a1e",
    traje: "#e2721f", panel: "#cf6316", cuello: "#4a4f57", detalle: "#5b6068", guantes: "#5b6068", botas: "#d0681c", mochila: "#e2721f", arnes: "#6b7079", consola: true, altura: 1.76, k: 1.05, semilla: 33 },
  { id: "bruno", nombre: "Bruno «Llave» Kowalski", rol: "Mecánico del hangar", piel: "#d9a988", pelo: "#4a3222", peinado: "cresta", barba: "larga", ojos: "#4a3020",
    traje: "#c0661f", panel: "#2a2c31", cuello: "#2a2c31", detalle: "#2a2c31", guantes: "#c0661f", botas: "#2a2c31", mochila: "#34373d", arnes: "#22242a", herramientas: true, altura: 1.9, k: 1.18, semilla: 44 },
];

const ESF = new T.SphereGeometry(1, 24, 16);
const cil = (rt, rb, h, s = 16) => new T.CylinderGeometry(rt, rb, h, s).translate(0, -h / 2, 0); // cuelga del pivote
const cacheGeo = {};
const geo = (k, f) => cacheGeo[k] || (cacheGeo[k] = f());
const M = HG.malla;

function torso(k) {
  return geo("torso" + k, () => new T.LatheGeometry([[0, 0], [0.155, 0], [0.15, 0.1], [0.165, 0.24], [0.195, 0.37], [0.19, 0.45], [0.12, 0.52], [0.05, 0.54]].map(([r, y]) => new T.Vector2(r * k, y)), 24).scale(1, 1, 0.7));
}

// ---------- Cabeza ----------
const C = 0.14; // centro de la cabeza respecto al pivote
const E = [0.118, 0.138, 0.128]; // semiejes de la cabeza
const enCabeza = (d, f = 1) => new T.Vector3(d.x * E[0] * f, C + d.y * E[1] * f, d.z * E[2] * f);
function cabeza(padre, d) {
  const piel = HG.mat(d.piel, { r: 0.55 }), pieloOsc = HG.mat(new T.Color(d.piel).multiplyScalar(0.85).getStyle(), { r: 0.6 });
  M(ESF, piel, 0, C, 0, padre).scale.set(...E);
  for (const s of [-1, 1]) M(ESF, piel, s * 0.115, C, -0.005, padre).scale.set(0.012, 0.026, 0.018); // orejas
  M(ESF, pieloOsc, 0, C - 0.008, 0.128, padre).scale.set(0.016, 0.02, 0.016); // nariz
  const ojos = [];
  for (const s of [-1, 1]) {
    const o = HG.pivote(padre, s * 0.043, C + 0.012, 0.104);
    M(ESF, HG.mat("#ffffff", { r: 0.2 }), 0, 0, 0, o, false).scale.set(0.022, 0.019, 0.012);
    M(ESF, HG.mat(d.ojos, { r: 0.2 }), 0, 0, 0.009, o, false).scale.set(0.011, 0.011, 0.006);
    M(ESF, HG.mat("#0b0b0e", { r: 0.2 }), 0, 0, 0.012, o, false).scale.set(0.005, 0.005, 0.004);
    M(ESF, HG.brillo("#ffffff"), 0.004 * s, 0.004, 0.0155, o, false).scale.setScalar(0.0022);
    ojos.push(o);
    const ceja = M(new T.BoxGeometry(0.046, 0.009, 0.012), HG.mat(new T.Color(d.pelo).multiplyScalar(0.75).getStyle(), { r: 0.8 }), s * 0.045, C + 0.045, 0.113, padre, false);
    ceja.rotation.z = -s * 0.12;
  }
  M(new T.BoxGeometry(0.042, 0.007, 0.01), HG.mat("#9a4a45", { r: 0.5 }), 0, C - 0.055, d.barba ? 0.13 : 0.116, padre, false);
  pelo(padre, d);
  return ojos;
}
function pelo(padre, d) {
  const r = HG.semilla(d.semilla), m = HG.mat(d.pelo, { r: 0.85 });
  const casquete = (tilt, col = m, theta = 1.45) => { const c = M(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, theta), col, 0, C + 0.004, -0.004, padre); c.scale.set(E[0] * 1.06, E[1] * 1.05, E[2] * 1.06); c.rotation.x = tilt; };
  const arriba = new T.Vector3(0, 1, 0);
  if (d.peinado === "puntas") {
    casquete(-0.32);
    const cono = new T.ConeGeometry(0.028, 0.1, 6);
    for (let i = 0; i < 22; i++) {
      const dir = new T.Vector3(r() * 2 - 1, 0.35 + r() * 0.65, r() * 1.6 - 0.6).normalize();
      const p = M(cono, m, 0, 0, 0, padre); p.position.copy(enCabeza(dir, 0.97));
      p.quaternion.setFromUnitVectors(arriba, dir.clone().add(new T.Vector3(0, 0.25, 0.45)).normalize());
    }
    for (let i = 0; i < 5; i++) { // flequillo
      const dir = new T.Vector3((i - 2) * 0.22, 0.5, 0.85).normalize();
      const p = M(cono, m, 0, 0, 0, padre); p.position.copy(enCabeza(dir, 1.0));
      p.quaternion.setFromUnitVectors(arriba, new T.Vector3((i - 2) * 0.2, -0.45, 1).normalize());
    }
  } else if (d.peinado === "rizos") {
    casquete(-0.3);
    for (let i = 0; i < 60; i++) {
      const dir = new T.Vector3(r() * 2 - 1, r() * 1.3 - 0.3, r() * 2 - 1).normalize();
      if (dir.z > 0.5 && dir.y < 0.42) continue; // deja la cara libre
      const s = 0.026 + r() * 0.016; M(ESF, m, 0, 0, 0, padre).position.copy(enCabeza(dir, 1.04));
      padre.children[padre.children.length - 1].scale.setScalar(s);
    }
  } else if (d.peinado === "atras") {
    casquete(-0.45);
    for (let j = 0; j < 8; j++) {
      const a = 0.7 - j * 0.27, dir = new T.Vector3((j % 2 ? 1 : -1) * 0.18, Math.cos(a), Math.sin(a)).normalize();
      const p = M(ESF, m, 0, 0, 0, padre); p.position.copy(enCabeza(dir, 1.04)); p.scale.set(0.035, 0.022, 0.07); p.rotation.x = -a;
    }
  } else if (d.peinado === "cresta") {
    casquete(-0.3, HG.mat(new T.Color(d.pelo).lerp(new T.Color(d.piel), 0.45).getStyle(), { r: 0.9 }), 1.5);
    for (let j = 0; j < 9; j++) {
      const a = 0.85 - j * 0.28, dir = new T.Vector3(0, Math.cos(a), Math.sin(a));
      const p = M(ESF, m, 0, 0, 0, padre); p.position.copy(enCabeza(dir, 1.05)); p.scale.set(0.03, 0.06, 0.05); p.rotation.x = -a;
    }
  }
  if (d.barba) {
    const larga = d.barba === "larga";
    const b = M(new T.SphereGeometry(1, 20, 12, Math.PI / 2 - (larga ? 1.35 : 1.15), larga ? 2.7 : 2.3, larga ? 1.72 : 2.0, larga ? 1.15 : 0.75), m, 0, C - (larga ? 0.004 : 0), 0.003, padre);
    b.scale.set(E[0] * 1.05, E[1] * (larga ? 1.12 : 1.04), E[2] * 1.06);
    M(new T.BoxGeometry(0.06, 0.012, 0.014), m, 0, C - 0.042, 0.124, padre); // bigote
  }
}

// ---------- Cuerpo ----------
HG.crearPersonaje = (d) => {
  const k = d.k, raiz = new T.Group(), h = {};
  const mT = HG.mat(d.traje, { r: 0.7 }), mP = HG.mat(d.panel, { r: 0.65 }), mD = HG.mat(d.detalle, { r: 0.45, m: 0.35 });
  const mG = HG.mat(d.guantes, { r: 0.6 }), mB = HG.mat(d.botas, { r: 0.7 }), mS = HG.mat("#1b1d22", { r: 0.9 });
  const cuerpo = HG.pivote(raiz); cuerpo.scale.setScalar(d.altura / 1.8);
  const cadera = h.cadera = HG.pivote(cuerpo, 0, 0.97, 0);
  M(ESF, mT, 0, 0, 0, cadera).scale.set(0.17 * k, 0.12, 0.12 * k);
  M(new T.TorusGeometry(0.165 * k, 0.018, 8, 28).rotateX(Math.PI / 2), mD, 0, 0.05, 0, cadera).scale.z = 0.74;
  const col = h.columna = HG.pivote(cadera, 0, 0.04, 0);
  M(torso(k), mT, 0, 0, 0, col);
  M(new T.BoxGeometry(0.008, 0.4, 0.008), mD, 0, 0.27, 0.135 * k, col); // cremallera
  M(new T.TorusGeometry(0.075, 0.026, 10, 22).rotateX(Math.PI / 2), HG.mat(d.cuello, { r: 0.4, m: 0.4 }), 0, 0.53, 0, col);
  if (d.rayas) for (const s of [-1, 1]) M(new T.BoxGeometry(0.035, 0.4, 0.12 * k), mP, s * 0.165 * k, 0.26, 0, col);
  if (d.parches) {
    M(new T.CylinderGeometry(0.032, 0.032, 0.006, 20).rotateX(Math.PI / 2), HG.mat("#c9a03a", { r: 0.4, m: 0.6 }), -0.075 * k, 0.36, 0.131 * k, col);
    M(new T.BoxGeometry(0.07, 0.028, 0.006), HG.mat("#c9a03a", { r: 0.4, m: 0.6 }), 0.075 * k, 0.37, 0.13 * k, col);
  }
  if (d.arnes) {
    const ma = HG.mat(d.arnes, { r: 0.6, m: 0.2 });
    for (const s of [-1, 1]) for (const z of [1, -1]) { const t = M(new T.BoxGeometry(0.035, 0.46, 0.012), ma, s * 0.075 * k, 0.27, z * 0.136 * k, col); t.rotation.z = s * 0.22; }
    M(new T.BoxGeometry(0.3 * k, 0.03, 0.012), ma, 0, 0.3, 0.138 * k, col);
  }
  if (d.consola) {
    M(HG.cajaR(0.17, 0.1, 0.045, 0.012), HG.mat("#8a9099", { r: 0.4, m: 0.5 }), 0, 0.34, 0.14 * k, col);
    M(new T.BoxGeometry(0.12, 0.055, 0.004), HG.mat("#0c2a33", { e: "#3fe0ff", ei: 0.9 }), 0, 0.345, 0.165 * k, col, false);
  }
  if (d.herramientas) {
    M(HG.cajaR(0.22, 0.085, 0.05, 0.015), HG.mat("#25272c", { r: 0.5, m: 0.3 }), 0, 0.37, 0.145 * k, col);
    M(new T.BoxGeometry(0.02, 0.06, 0.012), HG.mat("#ff7a2a"), -0.05, 0.375, 0.172 * k, col);
    M(new T.BoxGeometry(0.06, 0.012, 0.012), HG.mat("#c8ccd2", { m: 0.8, r: 0.3 }), 0.05, 0.375, 0.172 * k, col).rotation.z = 0.7;
  }
  // mochila
  const moch = HG.pivote(col, 0, 0.3, -0.155 * k);
  M(HG.cajaR(0.3 * k, 0.38, 0.13, 0.04), HG.mat(d.mochila, { r: 0.55, m: 0.3 }), 0, 0, -0.04, moch);
  M(HG.cajaR(0.2 * k, 0.12, 0.04, 0.012), HG.mat("#555b63", { r: 0.5, m: 0.4 }), 0, -0.05, -0.115, moch);
  if (d.mangueras) for (const s of [-1, 1]) { const t = M(new T.TorusGeometry(0.11, 0.012, 6, 14, Math.PI), HG.mat("#9aa1aa", { m: 0.6, r: 0.35 }), s * 0.12 * k, 0.02, 0.05, moch); t.rotation.set(0, Math.PI / 2, Math.PI / 2 * s); }
  // cabeza
  const cuello = HG.pivote(col, 0, 0.53, 0);
  M(cil(0.045, 0.05, 0.07), HG.mat(d.piel, { r: 0.55 }), 0, 0.07, 0, cuello);
  h.cabeza = HG.pivote(cuello, 0, 0.04, 0);
  h.ojos = cabeza(h.cabeza, d);
  // brazos (0 = derecho, en -X porque mira hacia +Z)
  h.hombros = []; h.codos = []; h.manos = [];
  for (const s of [-1, 1]) {
    const hombro = HG.pivote(col, s * 0.205 * k, 0.44, 0); hombro.rotation.z = s * 0.12;
    M(ESF, mP, 0, 0, 0, hombro).scale.setScalar(0.07 * k);
    M(cil(0.056 * k, 0.048 * k, 0.28), mT, 0, 0, 0, hombro);
    const codo = HG.pivote(hombro, 0, -0.28, 0);
    M(ESF, mT, 0, 0, 0, codo).scale.setScalar(0.049 * k);
    M(cil(0.048 * k, 0.042 * k, 0.24), mT, 0, 0, 0, codo);
    M(cil(0.052 * k, 0.05 * k, 0.045), mD, 0, -0.2, 0, codo);
    const mano = HG.pivote(codo, 0, -0.27, 0);
    M(ESF, mG, 0, -0.035, 0, mano).scale.set(0.042 * k, 0.06, 0.03 * k);
    M(ESF, mG, -s * 0.03 * k, -0.02, 0.022, mano).scale.set(0.015, 0.03, 0.015);
    h.hombros.push(hombro); h.codos.push(codo); h.manos.push(mano);
  }
  // piernas
  h.muslos = []; h.rodillas = [];
  for (const s of [-1, 1]) {
    const muslo = HG.pivote(cadera, s * 0.095 * k, -0.02, 0);
    M(cil(0.085 * k, 0.07 * k, 0.44), mT, 0, 0, 0, muslo);
    const rod = HG.pivote(muslo, 0, -0.44, 0);
    M(ESF, mP, 0, 0, 0.045 * k, rod).scale.set(0.066 * k, 0.075, 0.04);
    M(cil(0.068 * k, 0.056 * k, 0.42), mT, 0, 0, 0, rod);
    const tob = HG.pivote(rod, 0, -0.42, 0);
    M(cil(0.066 * k, 0.07 * k, 0.14), mB, 0, 0.1, 0, tob);
    M(HG.cajaR(0.115 * k, 0.085, 0.23, 0.03), mB, 0, -0.03, 0.04, tob);
    M(HG.cajaR(0.12 * k, 0.026, 0.24, 0.008), mS, 0, -0.072, 0.04, tob);
    h.muslos.push(muslo); h.rodillas.push(rod);
  }
  // pico (solo se ve al picar)
  const pico = HG.pivote(h.manos[0], 0, -0.05, 0.02);
  M(new T.CylinderGeometry(0.014, 0.014, 0.7, 8).rotateX(Math.PI / 2), HG.mat("#6b4a2e", { r: 0.8 }), 0, 0, 0.25, pico);
  const cab = M(HG.cajaR(0.42, 0.05, 0.05, 0.015), HG.mat("#b8c0cc", { r: 0.3, m: 0.9 }), 0, 0, 0.6, pico); cab.rotation.x = Math.PI / 2;
  pico.visible = false;
  raiz.traverse(o => { if (o.isMesh) o.userData.sombra = o.castShadow; });

  const base = { cadY: 0.97 };
  let parpadeo = HG.rnd(1, 4);
  return {
    grupo: raiz, def: d, huesos: h,
    pico(v) { pico.visible = v; },
    animar(estado, t, dt = 0.016) {
      // postura neutra
      for (let i = 0; i < 2; i++) { h.hombros[i].rotation.set(0, 0, (i ? 1 : -1) * 0.12); h.codos[i].rotation.set(-0.12, 0, 0); h.muslos[i].rotation.set(0, 0, 0); h.rodillas[i].rotation.set(0, 0, 0); }
      col.rotation.set(0, 0, 0); h.cabeza.rotation.set(0, 0, 0); cadera.position.y = base.cadY;
      if (estado === "andar" || estado === "correr") {
        const c = estado === "correr", f = t * (c ? 11 : 7.5), A = c ? 0.95 : 0.55;
        for (let i = 0; i < 2; i++) {
          const ph = f + i * Math.PI;
          h.muslos[i].rotation.x = -Math.sin(ph) * A;
          h.rodillas[i].rotation.x = Math.max(0, Math.sin(ph - 1.3)) * (c ? 1.5 : 0.9) + 0.05;
          h.hombros[i].rotation.x = Math.sin(ph) * (c ? 0.9 : 0.45);
          h.codos[i].rotation.x = c ? -1.2 : -0.35;
        }
        cadera.position.y = base.cadY - Math.abs(Math.cos(f)) * (c ? 0.05 : 0.025) + (c ? 0.02 : 0);
        col.rotation.x = c ? 0.2 : 0.04; col.rotation.y = Math.sin(f) * 0.08;
      } else if (estado === "saltar") {
        for (let i = 0; i < 2; i++) { h.muslos[i].rotation.x = -0.7 + i * 0.4; h.rodillas[i].rotation.x = 1.1 - i * 0.4; h.hombros[i].rotation.set(-0.5, 0, (i ? 1 : -1) * 0.9); }
      } else if (estado === "picar") {
        const u = (t * 2.2) % 1, sw = u < 0.55 ? u / 0.55 : 1 - (u - 0.55) / 0.45;
        h.hombros[0].rotation.x = -2.6 + (1 - sw) * 2.2; h.hombros[1].rotation.x = -2.2 + (1 - sw) * 1.8;
        h.codos[0].rotation.x = -0.4; h.codos[1].rotation.x = -0.6;
        col.rotation.x = 0.1 + (1 - sw) * 0.35; h.muslos[0].rotation.x = -0.35; h.rodillas[0].rotation.x = 0.4;
      } else if (estado === "saludar") {
        h.hombros[0].rotation.set(0, 0, -2.5); h.codos[0].rotation.set(0, 0, -0.4 + Math.sin(t * 9) * 0.45);
        h.cabeza.rotation.z = 0.1;
      } else if (estado === "pilotar") {
        for (let i = 0; i < 2; i++) { h.muslos[i].rotation.x = -1.5; h.rodillas[i].rotation.x = 1.5; h.hombros[i].rotation.x = -0.9; h.codos[i].rotation.x = -0.6; }
        cadera.position.y = 0.55;
      } else { // quieto: respiración y mirada
        col.rotation.x = Math.sin(t * 1.6) * 0.02; h.cabeza.rotation.y = Math.sin(t * 0.45) * 0.25;
        for (let i = 0; i < 2; i++) h.hombros[i].rotation.x = Math.sin(t * 1.6) * 0.03;
      }
      parpadeo -= dt; const cerrado = parpadeo < 0.12;
      if (parpadeo < 0) parpadeo = HG.rnd(2, 5);
      for (const o of h.ojos) o.scale.y = cerrado ? 0.12 : 1;
    },
  };
};

// NPC genérico de la estación con colores aleatorios
const TRAJES = ["#2f5ea6", "#3f7b3c", "#e2721f", "#8a3cff", "#c43c3c", "#3a3f48", "#1f8a7a", "#d9b23a"];
const PIELES = ["#f1c9a5", "#d9a27e", "#b07850", "#7a4e30", "#e3b48e"];
const PELOS = ["#17171b", "#4a3222", "#dcb468", "#a9a9a9", "#7a2a1a"];
HG.personajeAleatorio = (sem) => {
  const r = HG.semilla(sem), p = a => a[Math.floor(r() * a.length)];
  const traje = p(TRAJES);
  return { id: "npc" + sem, nombre: p(HG.PILOTOS_NPC), piel: p(PIELES), pelo: p(PELOS), peinado: p(["puntas", "rizos", "atras", "cresta"]), barba: r() < 0.25 ? "corta" : null,
    ojos: p(["#3d7fc4", "#5a3a22", "#3b2a1e", "#4a7a3a"]), traje, panel: new T.Color(traje).multiplyScalar(0.75).getStyle(), cuello: "#4a4f57", detalle: "#3a414c",
    guantes: "#5b6068", botas: "#2a2c31", mochila: p(["#8f959c", "#34373d", traje]), arnes: r() < 0.4 ? "#22242a" : null, rayas: r() < 0.4, altura: 1.65 + r() * 0.25, k: 0.9 + r() * 0.2, semilla: sem };
};
})();

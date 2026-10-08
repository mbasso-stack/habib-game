// Personajes con los modelos 3D de Malik, ya preparados por herramientas/hornear.py:
// modelos/personajes/<id>.bin trae la malla con sus pesos de piel, la zona de color de cada triángulo y el sombreado,
// y <id>.json los huesos, la paleta y los puntos de la cara (ojos, cejas, nariz y boca), que se pintan sobre la superficie.
"use strict";
(function () {
const HG = window.HG, T = THREE;

HG.MALLAS = { haluski: {}, rayo: {}, nadia: {}, kenji: {}, bruno: {}, astro: {}, piloto: {}, robot: {} };
// Zonas de color (mismo orden que en hornear.py) y material de cada una: 0 tela/piel · 1 metal · 2 luz
const ZONAS = ["traje", "panel", "detalle", "guantes", "botas", "suela", "cuello", "mochila", "piel", "pelo", "metal", "acento", "visor", "luz", "labios", "ceja"];
const MATERIAL_ZONA = { metal: 1, visor: 1, luz: 2 };

const cache = {}, esperas = {};
function leer(buf, meta) {
  const dv = new DataView(buf);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== "HGP2") throw new Error("formato");
  const nv = dv.getUint32(4, true), nf = dv.getUint32(8, true);
  const mn = [12, 16, 20].map(o => dv.getFloat32(o, true)), mx = [24, 28, 32].map(o => dv.getFloat32(o, true));
  let o = 36;
  const corta = (n, Tipo, bytes) => { const a = new Tipo(buf.slice(o, o + n * bytes)); o += n * bytes; return a; };
  const q = corta(nv * 3, Uint16Array, 2), nr = corta(nv * 4, Int8Array, 1), si = corta(nv * 4, Uint8Array, 1), sw = corta(nv * 4, Uint8Array, 1);
  const sombra = corta(nv, Uint8Array, 1), parte = corta(nv, Uint8Array, 1), caras = corta(nf * 3, Uint16Array, 2), zona = corta(nf, Uint8Array, 1);
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) { pos[i * 3 + k] = mn[k] + q[i * 3 + k] / 65535 * (mx[k] - mn[k]); nor[i * 3 + k] = nr[i * 4 + k] / 127; }
  const M = { nv, nf, pos, nor, si, sw, sombra, parte, caras, zona, meta };
  if (meta.textura) { const u = corta(nv * 2, Uint16Array, 2); M.uv = new Float32Array(nv * 2); for (let i = 0; i < nv * 2; i++) M.uv[i] = u[i] / 65535; }
  if (meta.cara) {
    const n = (meta.cara.GX + 1) * (meta.cara.GY + 1);
    M.caraZ = corta(n, Float32Array, 4); M.caraN = corta(n * 3, Int8Array, 1);
  }
  return M;
}

// Paleta: la del modelo (ajustada en herramientas/personajes/<id>.json) con lo que cambie el personaje (los NPC traen la suya)
function paleta(d, M) {
  const p = Object.assign({ traje: "#888c94", panel: "#5d636d", detalle: "#2b2f36", guantes: "#3a3f47", botas: "#2c2f35", cuello: "#5d636d", mochila: "#5d636d",
    piel: "#d8a986", pelo: "#3a2a1c", metal: "#aeb5bf", acento: "#4fd0ff", visor: "#0d1522", luz: "#7fe6ff", labios: "#b0625a", ceja: "#3a2a1c" },
    ...["traje", "panel", "detalle", "guantes", "botas", "cuello", "mochila", "piel", "pelo", "labios"].filter(z => d[z]).map(z => ({ [z]: d[z] })), M.meta.paleta || {}, d.paleta || {});
  if (!p.suela) p.suela = "#" + new T.Color(p.botas).multiplyScalar(0.45).getHexString();
  return ZONAS.map(z => HG.lin(p[z] || "#888888"));
}
// Colores para revisar el modelo (visor): zona, parte o hueso dominante
const PRUEBA = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000", "#aaffc3"].map(c => new T.Color(c));

const geos = {};
function geometria(d, modo) {
  const M = cache[d.malla], A = d.altura, clave = [d.id, d.malla, A, modo || ""].join("|");
  if (geos[clave]) return geos[clave];
  const pal = paleta(d, M), n = M.nf * 3;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const tex = M.uv && !modo, uvs = tex ? new Float32Array(n * 2) : null, blanco = new T.Color(1, 1, 1);
  // los triángulos se ordenan por material para dibujarlos en tres grupos
  const orden = [[], [], []];
  for (let f = 0; f < M.nf; f++) orden[tex ? 0 : MATERIAL_ZONA[ZONAS[M.zona[f]]] || 0].push(f);
  const g = new T.BufferGeometry(); let c = 0;
  orden.forEach((lista, mat) => {
    const ini = c;
    for (const f of lista) {
      const z = M.zona[f];
      for (let k = 0; k < 3; k++, c++) {
        const v = M.caras[f * 3 + k];
        for (let e = 0; e < 3; e++) { pos[c * 3 + e] = M.pos[v * 3 + e] * A; nor[c * 3 + e] = M.nor[v * 3 + e]; }
        for (let e = 0; e < 4; e++) { si[c * 4 + e] = M.si[v * 4 + e]; sw[c * 4 + e] = M.sw[v * 4 + e] / 255; }
        let cc;
        if (modo === "zona") cc = PRUEBA[z % 16];
        else if (modo === "parte") cc = PRUEBA[M.parte[v] * 3];
        else if (modo === "hueso") cc = PRUEBA[M.si[v * 4]];
        else if (modo === "sombra") cc = new T.Color(1, 1, 1);
        else cc = tex ? blanco : pal[z];
        if (tex) { uvs[c * 2] = M.uv[v * 2]; uvs[c * 2 + 1] = M.uv[v * 2 + 1]; }
        let s = modo === "zona" || modo === "parte" || modo === "hueso" ? 1 : M.sombra[v] / 255 * 1.25;
        if (tex) s = 0.55 + 0.45 * Math.min(1, s); // la textura ya trae su sombreado: solo un poco de oclusión
        col[c * 3] = cc.r * s; col[c * 3 + 1] = cc.g * s; col[c * 3 + 2] = cc.b * s;
      }
    }
    if (c > ini) g.addGroup(ini, c - ini, mat);
  });
  g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("normal", new T.BufferAttribute(nor, 3)); g.setAttribute("color", new T.BufferAttribute(col, 3));
  g.setAttribute("skinIndex", new T.BufferAttribute(si, 4)); g.setAttribute("skinWeight", new T.BufferAttribute(sw, 4));
  if (tex) g.setAttribute("uv", new T.BufferAttribute(uvs, 2));
  return geos[clave] = g;
}
const mats = {};
const cargaTex = (archivo, srgb) => { const t = new T.TextureLoader().load(`${HG.BASE || ""}modelos/personajes/${archivo}?v=8`); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
// Modelo con texturas propias (color, relieve, rugosidad y metal)
function materialTexturas(M) {
  const tx = M.meta.textura, m = new T.MeshStandardMaterial({ vertexColors: true, skinning: true, side: T.DoubleSide, roughness: 1, metalness: 1 });
  if (tx.color) m.map = cargaTex(tx.color, true);
  if (tx.normal) { m.normalMap = cargaTex(tx.normal, false); m.normalScale.set(1, 1); }
  if (tx.rm) { const t = cargaTex(tx.rm, false); m.roughnessMap = t; m.metalnessMap = t; } else { m.roughness = 0.7; m.metalness = 0.05; }
  return [m, m, m];
}
const materiales = (d, M) => mats[d.id] || (mats[d.id] = M && M.meta.textura ? materialTexturas(M) : [
  new T.MeshStandardMaterial({ vertexColors: true, skinning: true, side: T.DoubleSide, roughness: d.rugosidad ?? 0.68, metalness: d.metal ?? 0.04 }),
  new T.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: 0.28, metalness: 0.85 }),
  new T.MeshStandardMaterial({ vertexColors: true, skinning: true, roughness: 0.4, metalness: 0, emissive: new T.Color(1, 1, 1), emissiveIntensity: 0.9 }),
]);

// ---------- Cara: ojos, cejas, nariz y boca pintados sobre la superficie de la cabeza ----------
const PX = 1400; // ancho del lienzo de la cara en píxeles
function dibujarCara(d, M, cerrado) {
  const C = M.meta.cara, k = C.c, v = C.ventana, W = v[1] - v[0], H = v[3] - v[2], q = PX / W, mujer = !!d.mujer;
  const pal = Object.assign({}, M.meta.paleta || {}, d.paleta || {});
  const piel = new T.Color(pal.piel || d.piel || "#d8a986"), pelo = new T.Color(pal.ceja || pal.pelo || d.pelo || "#3a2a1c");
  const ojoCol = new T.Color(pal.ojos || d.ojos || "#5a3a22"), labio = new T.Color(pal.labios || d.labios || "#b0625a");
  const hex = c => "#" + c.getHexString(), mezcla = (a, b, t) => hex(a.clone().lerp(b, t)), osc = (a, f) => hex(a.clone().multiplyScalar(f));
  return HG.lienzoTex(PX, Math.round(H * q), (c, w, h) => {
    const cx = k.cx || 0, X = x => (x + cx - v[0]) * q, Y = y => (v[3] - y) * q; // cx: la cara puede no estar centrada en x = 0
    c.lineCap = "round"; c.lineJoin = "round";
    const sombra = (x, y, rx, ry, color, a) => {
      c.save(); c.translate(X(x), Y(y)); c.scale(1, ry / rx);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, rx * q); g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
      c.fillStyle = g; c.fillRect(-rx * q, -rx * q, 2 * rx * q, 2 * rx * q); c.restore();
    };
    const oy = k.ojo[1], ox = Math.abs(k.ojo[0]), ew = k.ojoW, eh = k.ojoH, inc = k.ojoInclina ?? 0.0006;
    // cuencas, mejillas y nariz: volumen suave
    for (const s of [-1, 1]) {
      sombra(s * ox, oy + eh * 0.25, ew * 0.95, eh * 1.9, "70,35,30", 0.22);
      sombra(s * (ox + ew * 0.15), oy - eh * 2.6, ew * 0.9, ew * 0.5, "205,95,85", mujer ? 0.16 : 0.08);
      sombra(s * (k.narizAncho ?? 0.007), k.nariz[1] + 0.002, 0.004, 0.012, "80,40,30", 0.18);
    }
    // cejas: trazos de pelo a lo largo del arco
    const cy0 = k.ceja ?? oy + eh * 1.9, cgr = (k.cejaGrosor ?? (mujer ? 0.0026 : 0.0036));
    for (const s of [-1, 1]) {
      const x0 = ox - ew * 0.62, x1 = ox + ew * 0.62;
      for (let i = 0; i < 46; i++) {
        const t = i / 45, x = x0 + (x1 - x0) * t, arco = Math.sin(Math.PI * Math.min(1, t * 1.25)) * eh * 0.55 - t * eh * 0.15;
        const gros = cgr * (1 - 0.65 * t) * (0.7 + 0.3 * Math.sin(i * 7.3));
        const y = cy0 + arco + (Math.sin(i * 12.9) * 0.5) * gros * 0.5;
        c.strokeStyle = osc(pelo, 0.62 + 0.18 * Math.sin(i * 3.1)); c.globalAlpha = 0.75; c.lineWidth = Math.max(1, q * 0.00055);
        c.beginPath(); c.moveTo(X(s * x), Y(y - gros * 0.5)); c.lineTo(X(s * (x + ew * 0.05)), Y(y + gros * 0.5)); c.stroke();
      }
    }
    c.globalAlpha = 1;
    // ojos
    for (const s of [-1, 1]) {
      const cx = s * ox, a = s * inc; // a: el lado de fuera algo más alto
      const ini = [cx - s * ew * 0.5, oy - a], fin = [cx + s * ew * 0.5, oy + a];
      const forma = () => { c.beginPath(); c.moveTo(X(ini[0]), Y(ini[1])); c.bezierCurveTo(X(cx - s * ew * 0.2), Y(oy + eh * 1.05), X(cx + s * ew * 0.22), Y(oy + eh * 1.0), X(fin[0]), Y(fin[1])); c.bezierCurveTo(X(cx + s * ew * 0.2), Y(oy - eh * 0.75), X(cx - s * ew * 0.25), Y(oy - eh * 0.7), X(ini[0]), Y(ini[1])); c.closePath(); };
      // pliegue del párpado
      c.strokeStyle = "rgba(90,45,35,0.35)"; c.lineWidth = q * eh * 0.12;
      c.beginPath(); c.moveTo(X(cx - s * ew * 0.42), Y(oy + eh * 0.55)); c.quadraticCurveTo(X(cx + s * ew * 0.05), Y(oy + eh * 1.75), X(cx + s * ew * 0.5), Y(oy + eh * 0.85)); c.stroke();
      if (cerrado) {
        c.fillStyle = hex(piel.clone().multiplyScalar(0.92)); forma(); c.fill();
        c.strokeStyle = "#2a1610"; c.lineWidth = q * eh * 0.16; c.beginPath(); c.moveTo(X(ini[0]), Y(ini[1])); c.quadraticCurveTo(X(cx), Y(oy - eh * 0.45), X(fin[0]), Y(fin[1])); c.stroke();
        continue;
      }
      c.save(); forma(); c.clip();
      const gs = c.createLinearGradient(X(cx - ew / 2), 0, X(cx + ew / 2), 0);
      gs.addColorStop(0, "#c9b8ae"); gs.addColorStop(0.3, "#efe9e3"); gs.addColorStop(0.7, "#efe9e3"); gs.addColorStop(1, "#c4b2a7");
      c.fillStyle = gs; c.fillRect(X(cx - ew), Y(oy + eh * 2), ew * 2 * q, eh * 4 * q);
      const ir = ew * (k.iris ?? 0.215), icx = cx + s * ew * 0.02, icy = oy + eh * 0.08;
      const gi = c.createRadialGradient(X(icx), Y(icy), 0, X(icx), Y(icy), ir * q);
      gi.addColorStop(0, "#050505"); gi.addColorStop(0.36, "#060606"); gi.addColorStop(0.42, osc(ojoCol, 0.55)); gi.addColorStop(0.7, mezcla(ojoCol, new T.Color(1, 1, 1), 0.12)); gi.addColorStop(0.9, osc(ojoCol, 0.6)); gi.addColorStop(1, "#140e0a");
      c.fillStyle = gi; c.beginPath(); c.arc(X(icx), Y(icy), ir * q, 0, 6.2832); c.fill();
      for (let i = 0; i < 40; i++) { const an = i / 40 * 6.2832; c.strokeStyle = i % 2 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.18)"; c.lineWidth = 1; c.beginPath(); c.moveTo(X(icx) + Math.cos(an) * ir * q * 0.45, Y(icy) + Math.sin(an) * ir * q * 0.45); c.lineTo(X(icx) + Math.cos(an) * ir * q * 0.92, Y(icy) + Math.sin(an) * ir * q * 0.92); c.stroke(); }
      const gl = c.createLinearGradient(0, Y(oy + eh * 1.05), 0, Y(oy - eh * 0.2)); gl.addColorStop(0, "rgba(40,20,14,0.7)"); gl.addColorStop(0.45, "rgba(40,20,14,0.18)"); gl.addColorStop(1, "rgba(40,20,14,0)");
      c.fillStyle = gl; c.fillRect(X(cx - ew), Y(oy + eh * 2), ew * 2 * q, eh * 3 * q);
      c.fillStyle = "rgba(255,255,255,0.92)"; c.beginPath(); c.arc(X(icx - ir * 0.32), Y(icy + ir * 0.32), ir * q * 0.18, 0, 6.2832); c.fill();
      c.restore();
      // lagrimal, línea del párpado superior, pestañas y párpado inferior
      c.fillStyle = "rgba(200,110,100,0.55)"; c.beginPath(); c.ellipse(X(ini[0] + s * ew * 0.05), Y(ini[1] - eh * 0.05), ew * q * 0.05, eh * q * 0.22, 0, 0, 6.2832); c.fill();
      c.strokeStyle = "#24140e"; c.lineWidth = q * eh * (mujer ? 0.26 : 0.19);
      c.beginPath(); c.moveTo(X(ini[0]), Y(ini[1])); c.bezierCurveTo(X(cx - s * ew * 0.2), Y(oy + eh * 1.05), X(cx + s * ew * 0.22), Y(oy + eh * 1.0), X(fin[0] + s * ew * (mujer ? 0.08 : 0.02)), Y(fin[1] + (mujer ? eh * 0.12 : 0))); c.stroke();
      if (mujer) { c.lineWidth = q * eh * 0.07; for (let i = 0; i < 7; i++) { const t = 0.4 + i * 0.09, lx = cx + s * ew * (t - 0.5), ly = oy + eh * (1.0 - Math.abs(t - 0.5) * 0.9); c.beginPath(); c.moveTo(X(lx), Y(ly)); c.lineTo(X(lx + s * ew * 0.07), Y(ly + eh * 0.45)); c.stroke(); } }
      c.strokeStyle = "rgba(110,55,45,0.5)"; c.lineWidth = q * eh * 0.08;
      c.beginPath(); c.moveTo(X(ini[0] + s * ew * 0.08), Y(ini[1] - eh * 0.15)); c.bezierCurveTo(X(cx - s * ew * 0.2), Y(oy - eh * 0.85), X(cx + s * ew * 0.2), Y(oy - eh * 0.9), X(fin[0]), Y(fin[1])); c.stroke();
    }
    // nariz: fosas nasales
    const nb = k.fosas ?? [0.0055, k.nariz[1] - 0.0085];
    for (const s of [-1, 1]) {
      c.fillStyle = "rgba(55,22,18,0.62)"; c.beginPath(); c.ellipse(X(s * nb[0]), Y(nb[1]), q * 0.0026, q * 0.0013, s * 0.35, 0, 6.2832); c.fill();
    }
    // boca
    const by = k.boca[1], bw = k.bocaW / 2, sup = k.labioSup ?? (mujer ? 0.0034 : 0.0026), inf = k.labioInf ?? (mujer ? 0.0045 : 0.0036), son = k.sonrisa ?? 0.0006;
    sombra(0, by + sup + 0.004, 0.004, 0.003, "90,40,30", 0.18);          // surco bajo la nariz
    sombra(0, by - inf - 0.004, bw * 0.6, 0.004, "70,35,28", 0.22);       // sombra bajo el labio
    const L = (x, y) => [X(x), Y(by + y)];
    c.fillStyle = mezcla(labio, piel, 0.18); c.beginPath(); c.moveTo(...L(-bw, son));
    c.bezierCurveTo(...L(-bw * 0.6, sup * 0.9), ...L(-bw * 0.25, sup * 1.15), ...L(0, sup * 0.85));
    c.bezierCurveTo(...L(bw * 0.25, sup * 1.15), ...L(bw * 0.6, sup * 0.9), ...L(bw, son));
    c.quadraticCurveTo(...L(0, -sup * 0.15), ...L(-bw, son)); c.fill();
    c.fillStyle = mezcla(labio, new T.Color(1, 1, 1), 0.06); c.beginPath(); c.moveTo(...L(-bw, son));
    c.quadraticCurveTo(...L(0, -sup * 0.15), ...L(bw, son)); c.bezierCurveTo(...L(bw * 0.7, -inf * 0.9), ...L(bw * 0.25, -inf * 1.15), ...L(0, -inf * 1.12));
    c.bezierCurveTo(...L(-bw * 0.25, -inf * 1.15), ...L(-bw * 0.7, -inf * 0.9), ...L(-bw, son)); c.fill();
    c.fillStyle = "rgba(255,255,255,0.2)"; c.beginPath(); c.ellipse(...L(0, -inf * 0.55), bw * q * 0.32, inf * q * 0.18, 0, 0, 6.2832); c.fill();
    c.strokeStyle = "rgba(60,20,16,0.9)"; c.lineWidth = Math.max(1.2, q * 0.0007);
    c.beginPath(); c.moveTo(...L(-bw * 1.04, son + 0.0002)); c.quadraticCurveTo(...L(0, -sup * 0.15), ...L(bw * 1.04, son + 0.0002)); c.stroke();
    for (const s of [-1, 1]) sombra(s * bw * 1.02, by + son, 0.0018, 0.0016, "70,30,25", 0.35);
  });
}
const carasGeo = {}, carasTex = {};
function geometriaCara(d) {
  const M = cache[d.malla], C = M.meta.cara, A = d.altura, clave = d.malla + A;
  if (carasGeo[clave]) return carasGeo[clave];
  const { GX, GY, ventana: v } = C, n = (GX + 1) * (GY + 1), off = 0.001;
  const valido = new Uint8Array(n), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [];
  const zMin = C.c.nariz[2] - 0.045;
  for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
    const k = j * (GX + 1) + i, x = v[0] + (v[1] - v[0]) * i / GX, y = v[3] - (v[3] - v[2]) * j / GY, z = M.caraZ[k];
    valido[k] = z > zMin ? 1 : 0;
    const nx = M.caraN[k * 3] / 127, ny = M.caraN[k * 3 + 1] / 127, nz = M.caraN[k * 3 + 2] / 127;
    pos[k * 3] = (x + nx * off) * A; pos[k * 3 + 1] = (y + ny * off) * A; pos[k * 3 + 2] = (z + nz * off) * A;
    uv[k * 2] = i / GX; uv[k * 2 + 1] = 1 - j / GY;
  }
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, e = c + 1;
    if (valido[a] && valido[b] && valido[c] && valido[e]) idx.push(a, c, b, b, c, e);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("uv", new T.BufferAttribute(uv, 2));
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = 2; sw[i * 4] = 1; }
  g.setAttribute("skinIndex", new T.BufferAttribute(si, 4)); g.setAttribute("skinWeight", new T.BufferAttribute(sw, 4));
  g.setIndex(idx); g.computeVertexNormals();
  return carasGeo[clave] = g;
}
const caraTex = (d, M) => carasTex[d.id] || (carasTex[d.id] = { abierta: dibujarCara(d, M, false), cerrada: dibujarCara(d, M, true) });

HG.Mallas = {
  listo: id => !!cache[id],
  cargar(id) {
    if (cache[id]) return Promise.resolve(cache[id]);
    return esperas[id] || (esperas[id] = Promise.all([
      fetch(`${HG.BASE || ""}modelos/personajes/${id}.json?v=8`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`${HG.BASE || ""}modelos/personajes/${id}.bin?v=8`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
    ]).then(([meta, buf]) => cache[id] = leer(buf, meta)));
  },
  // Esqueleto y malla de un personaje; devuelve lo mismo que HG.crearPersonaje. opc.modo: "zona", "parte", "hueso" o "sombra" para revisar
  crear(d, opc = {}) {
    const M = cache[d.malla], A = d.altura, J = M.meta.J, raiz = new T.Group(), hueso = (p, x, y, z) => { const b = new T.Bone(); b.position.set(x, y, z); if (p) p.add(b); return b; };
    const cadera = hueso(null, 0, J.cad * A, 0), columna = hueso(cadera, 0, (J.cin - J.cad) * A, 0), cabeza = hueso(columna, 0, (J.cue - J.cin) * A, 0);
    const h = { cadera, columna, cabeza, hombros: [], codos: [], manos: [], muslos: [], rodillas: [], tobillos: [], ojos: [], parpados: [] };
    const huesos = [cadera, columna, cabeza];
    for (const s of [-1, 1]) {
      const ho = hueso(columna, s * J.hom[0] * A, (J.hom[1] - J.cin) * A, 0), co = hueso(ho, s * (J.cod[0] - J.hom[0]) * A, (J.cod[1] - J.hom[1]) * A, 0), ma = hueso(co, s * (J.mun[0] - J.cod[0]) * A, (J.mun[1] - J.cod[1]) * A, 0);
      h.hombros.push(ho); h.codos.push(co); h.manos.push(ma); huesos.push(ho, co, ma);
    }
    for (const s of [-1, 1]) {
      const mu = hueso(cadera, s * J.xp * A, 0, 0), ro = hueso(mu, 0, (J.rod - J.cad) * A, 0), to = hueso(ro, 0, (J.tob - J.rod) * A, 0);
      h.muslos.push(mu); h.rodillas.push(ro); h.tobillos.push(to); huesos.push(mu, ro, to);
    }
    const malla = new T.SkinnedMesh(geometria(d, opc.modo), opc.modo ? materiales({ id: d.id + "|prueba" }) : materiales(d, M));
    malla.castShadow = malla.receiveShadow = true; malla.frustumCulled = false;
    raiz.add(malla); raiz.add(cadera); raiz.updateMatrixWorld(true);
    malla.bind(new T.Skeleton(huesos));
    const pico = HG.hacerPico(h.manos[0]), anim = HG.animacion(h, cadera, columna, J.cad * A, { reposoZ: 0.02, mano: true });
    let animar = anim;
    if (M.meta.cara && M.meta.cara.c.ojo && !opc.sinCara) { // ojos, cejas, nariz y boca, que parpadean
      const tx = caraTex(d, M), mat = new T.MeshStandardMaterial({ map: tx.abierta, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, skinning: true, roughness: 0.55, metalness: 0 });
      const cara = new T.SkinnedMesh(geometriaCara(d), mat); cara.frustumCulled = false; cara.renderOrder = 2; raiz.add(cara);
      raiz.updateMatrixWorld(true); cara.bind(malla.skeleton);
      let espera = HG.rnd(1, 4), cerrado = false;
      animar = (e, t, dt = 0.016) => { anim(e, t, dt); espera -= dt; const c = espera < 0.12; if (espera < 0) espera = HG.rnd(2, 5); if (c !== cerrado) { cerrado = c; mat.map = c ? tx.cerrada : tx.abierta; } };
    }
    return { grupo: raiz, def: d, huesos: h, pico(v) { pico.visible = v; }, animar };
  },
};
for (const id of Object.keys(HG.MALLAS)) HG.Mallas.cargar(id).catch(() => {}); // se descargan al arrancar; mientras tanto se ven los personajes de código
})();

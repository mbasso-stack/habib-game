// Prueba de humo del juego completo: recorre menú, selector de personaje, estación, tiendas, espacio y un planeta,
// guarda una captura de cada escena y falla si hay algún error de JavaScript.
//   cd /tmp && NODE_PATH=$(npm root -g) node /ruta/al/repo/herramientas/prueba.js carpeta_capturas [ancho alto]
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const RAIZ = path.resolve(__dirname, "..");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".bin": "application/octet-stream", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4" };
const servidor = http.createServer((req, res) => {
  const ruta = path.join(RAIZ, decodeURIComponent(req.url.split("?")[0]));
  if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(ruta)] || "application/octet-stream" });
  fs.createReadStream(ruta).pipe(res);
});
const salida = path.resolve(process.argv[2] || "capturas"), W = +(process.argv[3] || 1280), H = +(process.argv[4] || 720);
(async () => {
  fs.mkdirSync(salida, { recursive: true });
  await new Promise(r => servidor.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${servidor.address().port}/index.html`;
  const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
  const pag = await nav.newPage({ viewport: { width: W, height: H } });
  const errores = [];
  pag.on("pageerror", e => errores.push("pageerror: " + e.message));
  pag.on("console", m => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errores.push("console: " + m.text()); });
  pag.on("requestfailed", r => { if (!/\.mp[34]/.test(r.url())) errores.push("request: " + r.url()); });
  const foto = async (nombre, espera = 1200) => { await pag.waitForTimeout(espera); await pag.screenshot({ path: path.join(salida, nombre + ".png") }); console.log("·", nombre); };
  const js = (f, a) => pag.evaluate(f, a);
  try {
    await pag.goto(url);
    await pag.waitForFunction(() => window.HG && HG.Mallas && ["haluski", "robot"].every(HG.Mallas.listo), null, { timeout: 120000 });
    await foto("01_menu", 2500);
    await js(() => HG.juego.elegirPersonaje(() => {})); await foto("02_selector", 1400);
    await js(() => HG.Vestuario.mostrar(4)); await foto("03_selector_rayo", 1400);
    // partida de prueba: con nave, dinero y carga
    await js(() => {
      const P = HG.partidaNueva(); Object.assign(P, { monedas: 250000, naves: { 0: { mov: 1, com: 1, asp: 0 }, 1: { mov: 0, com: 0, asp: 0 } }, naveActiva: 1, videos: { aurora: true }, carga: { cuarzo: 6 } });
      localStorage.setItem("haluski_partida", JSON.stringify(P)); HG.juego.continuar(); HG.ui.cerrar();
    });
    await foto("04_estacion", 2500);
    for (const p of ["tienda", "hangar", "clanes", "ajustes", "controles"]) { await js(p => HG.ui.abrir(p), p); await foto("05_panel_" + p, 700); await js(() => HG.ui.cerrar()); }
    await js(() => HG.juego.zona("despegar")); await foto("06_espacio", 3000);
    await pag.keyboard.down("KeyW"); await pag.mouse.move(W / 2 + 120, H / 2 - 40); await pag.mouse.down(); await foto("07_espacio_vuelo", 1500); await pag.mouse.up(); await pag.keyboard.up("KeyW");
    await js(() => HG.juego.zona("aterrizar", 0)); await foto("08_planeta", 3500);
    await js(() => HG.juego.zona("despegarPlaneta", 0)); await foto("09_espacio_planeta", 2500);
    await js(() => HG.juego.zona("atracar")); await foto("10_estacion_vuelta", 2500);
    const estado = await js(() => HG.juego.estado());
    if (estado !== "estacion") errores.push("estado final inesperado: " + estado);
  } catch (e) { errores.push("prueba: " + e.message); }
  await nav.close(); servidor.close();
  if (errores.length) { console.log("ERRORES:\n" + errores.join("\n")); process.exit(1); }
  console.log("OK: sin errores");
})();

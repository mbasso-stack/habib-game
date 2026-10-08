// Capturas del visor de personajes (herramientas/visor.html) sin depender de ningún servidor:
//   cd /tmp && NODE_PATH=$(npm root -g) node /home/user/habib-game/herramientas/capturar.js salida1.png "ids=kenji&vista=cara" salida2.png "ids=..."
// Monta un servidor estático temporal del repositorio, abre Chromium (SwiftShader) y guarda cada vista.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const RAIZ = path.resolve(__dirname, "..");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".bin": "application/octet-stream", ".png": "image/png", ".jpg": "image/jpeg", ".glb": "model/gltf-binary" };
const servidor = http.createServer((req, res) => {
  const ruta = path.join(RAIZ, decodeURIComponent(req.url.split("?")[0]));
  if (!ruta.startsWith(RAIZ) || !fs.existsSync(ruta) || fs.statSync(ruta).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(ruta)] || "application/octet-stream" });
  fs.createReadStream(ruta).pipe(res);
});
(async () => {
  await new Promise(r => servidor.listen(0, "127.0.0.1", r));
  const puerto = servidor.address().port;
  const navegador = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const args = process.argv.slice(2);
  try {
    for (let i = 0; i + 1 < args.length; i += 2) {
      const salida = path.resolve(args[i]), q = args[i + 1], w = +(new URLSearchParams(q).get("w") || 1200), h = +(new URLSearchParams(q).get("h") || 800);
      const pag = await navegador.newPage({ viewport: { width: w, height: h } });
      const errores = [];
      pag.on("pageerror", e => errores.push(e.message)); pag.on("console", m => { if (m.type() === "error") errores.push(m.text()); });
      await pag.goto(`http://127.0.0.1:${puerto}/herramientas/visor.html?${q}`);
      await pag.waitForFunction(() => window.listo, null, { timeout: 180000 });
      await pag.waitForTimeout(200);
      await pag.screenshot({ path: salida });
      const err = await pag.evaluate(() => window.error);
      console.log(salida, err ? "ERROR " + err : "ok", errores.length ? errores.join(" | ") : "");
      await pag.close();
    }
  } finally { await navegador.close(); servidor.close(); }
})();

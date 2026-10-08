# Herramientas de personajes

Los personajes del juego son los modelos 3D de Malik (`fuentes/<id>.obj`). Antes de usarlos en el juego se «hornean»:
`hornear.py` lee el modelo y su ajuste (`personajes/<id>.json`) y escribe `modelos/personajes/<id>.bin` y `<id>.json`.

```
python3 -m venv venv && venv/bin/pip install numpy pillow
venv/bin/python -I herramientas/hornear.py haluski          # o varios ids, o "todos"
cd /tmp && NODE_PATH=$(npm root -g) node /ruta/al/repo/herramientas/capturar.js salida.png "ids=haluski&norm=1&vista=frente&rejilla=1"
```

## Coordenadas

Todo va en fracciones de la altura del personaje: los pies en `y = 0`, la cabeza en `y = 1`, `x = 0` entre los pies,
`+z` hacia delante (hacia donde mira). `x < 0` es el lado **derecho** del personaje. En el visor usa `norm=1` para que la
rejilla muestre estas mismas coordenadas.

## Ajuste (`personajes/<id>.json`)

| Campo | Qué es |
|---|---|
| `J` | Articulaciones. `cad` cadera, `ing` entrepierna, `rod` rodilla, `tob` tobillo, `cin` cintura, `cue` base del cuello (y). `hom`, `cod`, `mun`: `[x, y]` del hombro, codo y muñeca (x positiva; vale para los dos lados). `xp` separación de cada pierna. `bota` altura de la caña de la bota. `manoFin` y de la punta de los dedos. Opcionales: `brazoZ`, `manoZ` (z del eje del brazo y de la mano), `dedosX` |
| `radios` | `brazo`: `[brazo, antebrazo, mano]` radio aproximado de cada tramo. `pierna`. Opcionales: `troncoEscalaX`, `troncoEscalaZ` (agranda o encoge el tronco estimado), `dato` (3: cuánto manda la forma frente a la suavidad del corte), `suave` (1.2), `nucleo` (0.55: lo que seguro es brazo) |
| `axila` | Hasta dónde se rasga la unión brazo-tronco, medido hacia abajo desde `hom[1]` (−0.005 = hasta algo por encima del hombro) |
| `pelo` | Nacimiento del pelo: `frente` (y en el centro de la frente), `sien` (y en las sienes), `nuca` (y por detrás), `zCara` (por delante de esta z es la cara), `anchoCara` (media anchura de la cara), `lateral` (y del pelo a los lados) |
| `color` | `relieve`: lo que sobresale más que esto de la forma suavizada pasa a `zonaRelieve` (por defecto `panel`). `ranuras` (true): lo hundido pasa a `detalle`. `suela`, `puno` (sube el guante), `cuelloAlto`, `cuelloBajo`, `mochila` (una forma) |
| `zonas` | Lista de zonas a mano, por orden (la última gana): `{"zona": "acento", "caja": [x0,x1,y0,y1,z0,z1], "simetrica": true}` o `{"zona": "...", "elipse": {"c": [x,y,z], "r": [rx,ry,rz]}}`. Filtros opcionales: `"partes": ["tronco","brazo","pierna"]`, `"normalY"` (mínimo), `"relieveMin"`, `"si": ["traje"]` (solo cambia esas zonas) |
| `paleta` | Color de cada zona (`traje`, `panel`, `detalle`, `guantes`, `botas`, `suela`, `cuello`, `mochila`, `piel`, `pelo`, `metal`, `acento`, `visor`, `luz`, `labios`, `ceja`) y de los ojos (`ojos`). `metal` y `visor` brillan como metal; `luz` emite luz |
| `cara` | Rasgos pintados: `ojo: [x, y]` (centro de cada ojo), `ojoW`, `ojoH` (ancho y alto de la abertura), `ojoInclina`, `iris` (fracción de `ojoW`), `ceja` (y), `cejaGrosor`, `nariz` (se detecta sola: `[0, y, z]` de la punta), `narizAncho`, `fosas: [x, y]`, `boca: [0, y]`, `bocaW`, `labioSup`, `labioInf`, `sonrisa`, `ventana: [x0, x1, y0, y1]` (zona de la cara donde se pinta) |
| `quitar` | Cajas `[x0,x1,y0,y1,z0,z1]`: se quitan los triángulos que tocan (restos sueltos) |
| otros | `piezaMinima`, `anguloCabeza` (70), `anguloCuerpo` (40), `suavizado` (25), `resAO` (200), `fuerzaAO` (1), `tieneCara` (false para el robot) |

## Visor (`visor.html`, parámetros en la dirección)

`ids=haluski,kenji` · `norm=1` · `vista=frente|lado|espalda|cara|caralado|tres|persp` · `ventana=x0,x1,y0,y1` · `rejilla=1&paso=0.01` ·
`modo=zona|parte|hueso|sombra` (colores de prueba) · `e=quieto|andar|correr|saltar|picar|saludar|pilotar&t=0.9` · `ry=0.6` · `sincara=1` · `w=1200&h=800`

Colores de `modo=parte`: brazo derecho azul claro, brazo izquierdo turquesa, tronco rosa, pierna derecha blanca, pierna izquierda beige.
Colores de `modo=zona`: traje rojo, panel verde, detalle amarillo, guantes azul, botas naranja, suela morado, cuello cian, mochila magenta,
piel lima, pelo rosa claro, metal verde azulado, acento lavanda, visor marrón, luz crema, labios granate, ceja menta.

# Haluski: Misión Colonial · Colony Mission

Juego de naves en 3D para el navegador, en **español e inglés** (se cambia en Ajustes; la primera vez se usa el idioma del navegador).
A 3D space game for the browser, in **Spanish and English** (switch in Settings; the browser language is used the first time).

## Fase 1 (sin conexión)
- **Estación en tercera persona:** camina por el hangar, compra y mejora naves en la terminal del hangar, habla con el robot de la tienda (te saluda al acercarte), únete a un clan o haz amigos en sus terminales y despega desde la plataforma.
- **Mina de carbón** en la estación: pica carbón y véndelo en la terminal de compra para no quedarte nunca sin dinero.
- **4 naves** (modelos 3D de Malik), de pequeña a grande: Gorrión, Lince, Fénix y Haluski Prime (de 1.000 a 800.000 monedas), con mejoras de Movimiento, Combate y Aspecto (5 niveles cada una).
- **Vuelo 3D** con piratas, jefes, asteroides y 7 armas: láser, gatling, misiles, minas, plasma cargado, railgun y bomba de pulso.
- **10 planetas** (Aurora, Verdia, Duna, Coral, Glacia, Ceniza, Ígnea, Prisma, Ónix y Abismo), cada uno con su jefe y 2 minerales para picar y vender. Derrota al jefe y planta tu bandera para conquistarlo.
- **7 personajes** para elegir (Haluski, Nadia, Kenji, Bruno, Rayo, Astronauta y Piloto), con ojos que parpadean, que saludan al elegirlos.
- **Móviles y tabletas:** joystick y botones táctiles; la interfaz se adapta a pantallas pequeñas.
- **Supervivencia:** vida de la nave (si explota, pierdes la carga) y barra de comida (se compra en la tienda).
- **Final:** 3 planetas conquistados, 100 enemigos derrotados y 1.000.000 de monedas.
- El juego anterior sigue en `clasico.html`.

## Controles
- A pie: WASD, Shift correr, Espacio saltar, ratón cámara, E interactuar, clic o F picar.
- Nave: ratón o flechas dirigir, W acelerar, S frenar, A/D desplazarse, Shift turbo, clic/Espacio/F disparar, 1-5 o rueda cambiar arma, E aterrizar o atracar.
- Esc: pausa y ajustes.

## Para desarrollar
- Abre `index.html` con cualquier servidor estático (`python3 -m http.server`). GitHub Pages publica el juego con `.github/workflows/pages.yml`.
- **Prueba automática:** `IDIOMA=es NODE_PATH=$(npm root -g) node herramientas/prueba.js capturas` recorre menú, selector, estación, paneles, espacio y un planeta, guarda una captura de cada escena y falla si hay errores de JavaScript.
- **Personajes:** los modelos 3D se preparan con `herramientas/hornear.py` (ver `herramientas/LEEME.md`); el visor (`herramientas/visor.html`) los muestra en cualquier pose.
- **Textos:** todo lo que se ve pasa por `HG.t()`; la traducción al inglés está en `js/idioma.js`.
- Al cambiar archivos, sube la versión `?v=` de `index.html` y `js/mallas.js` para que los jugadores no usen los de la caché.

## Créditos
Idea, personajes, naves y robot (modelos 3D), música «Interestelar» (Suno) y cinemáticas (Magnific): Malik. Motor 3D: three.js (MIT).

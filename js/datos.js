// Datos del juego: naves, armas, minerales, planetas, comida, clanes y pilotos.
"use strict";
window.HG = window.HG || {};

// Cuanto más cara es la nave, mejores son sus estadísticas de serie.
HG.NAVES = [ // id: archivo en modelos/naves · largo: tamaño en el juego · motores y canones: posiciones en fracción del largo · ala: a qué distancia del centro van las armas extra
  { id: "gorrion", nombre: HG.t("Gorrión"),       precio: 1000,   vel: 100, vida: 150,  dano: 10, bodega: 20,  huecos: 1, largo: 11, ala: 0.12, casco: "#d9dde3", detalle: "#2b3038", franja: "#4cc9f0", motores: [[-0.089, -0.051, 0.49], [0.084, -0.051, 0.49]], canones: [[-0.048, -0.066, -0.49], [0.046, -0.071, -0.49]] },
  { id: "lince",   nombre: HG.t("Lince"),         precio: 50000,  vel: 125, vida: 320,  dano: 18, bodega: 50,  huecos: 2, largo: 16, ala: 0.18, casco: "#dde0e5", detalle: "#30353e", franja: "#ff9f43", motores: [[-0.134, -0.031, 0.48], [0.134, -0.031, 0.48]], canones: [[-0.048, -0.068, -0.48], [0.047, -0.064, -0.48]] },
  { id: "fenix",   nombre: HG.t("Fénix"),         precio: 220000, vel: 160, vida: 780,  dano: 38, bodega: 150, huecos: 3, largo: 23, ala: 0.22, casco: "#1c1e23", detalle: "#3a3f48", franja: "#d4a63a", motores: [[-0.13, -0.066, 0.48], [0.13, -0.069, 0.48]], canones: [[-0.052, -0.142, -0.47], [0.053, -0.142, -0.47]] },
  { id: "prime",   nombre: HG.t("Haluski Prime"), precio: 800000, vel: 200, vida: 1500, dano: 60, bodega: 300, huecos: 4, largo: 30, ala: 0.26, casco: "#b0231b", detalle: "#1a1b1f", franja: "#efe6d2", motores: [[-0.163, -0.058, 0.48], [0.155, -0.053, 0.48]], canones: [[-0.051, -0.1, -0.48], [0.049, -0.1, -0.48]] },
];
// Mejoras de cada nave: 3 ramas de 5 niveles. Coste según el precio de la nave.
HG.RAMAS = [
  { id: "mov", nombre: HG.t("Movimiento"), desc: HG.t("+10% velocidad y maniobra por nivel") },
  { id: "com", nombre: HG.t("Combate"), desc: HG.t("+10% daño y +10% vida por nivel") },
  { id: "asp", nombre: HG.t("Aspecto"), desc: HG.t("Pintura, acabados, luces y estela") },
];
HG.costeMejora = (nave, nivel) => Math.round((300 + HG.NAVES[nave].precio * 0.05) * nivel / 10) * 10;
HG.ASPECTOS = ["De serie", "Pintura de color", "Acabado metalizado", "Luces de neón", "Estela de color", "Holográfica"].map(a => HG.t(a));
HG.COLORES_NAVE = ["#4cc9f0", "#ff9f43", "#7CFC9A", "#ff4d6d", "#b46bff", "#ffd166"];

HG.ARMAS = [
  { id: "laser",   nombre: HG.t("Láser"),                precio: 0,      tipo: "bala",   mult: 1,   cad: 6,    vel: 1100, color: "#5ff",    desc: HG.t("Disparo rápido y preciso. Viene de serie.") },
  { id: "gatling", nombre: HG.t("Ametralladora gatling"), precio: 15000,  tipo: "bala",   mult: 0.55, cad: 14,  vel: 1200, color: "#ffd34d", disp: 0.035, desc: HG.t("Lluvia de balas con algo de dispersión.") },
  { id: "misiles", nombre: HG.t("Misiles teledirigidos"), precio: 30000,  tipo: "misil",  mult: 5,   cad: 1.2,  vel: 420,  color: "#ff7a3c", desc: HG.t("Persiguen al enemigo más cercano.") },
  { id: "minas",   nombre: HG.t("Minas de proximidad"),   precio: 40000,  tipo: "mina",   mult: 8,   cad: 1,    radio: 90, color: "#ff3c6e", desc: HG.t("Se quedan flotando y explotan si se acerca un enemigo.") },
  { id: "plasma",  nombre: HG.t("Cañón de plasma"),       precio: 60000,  tipo: "plasma", mult: 16,  carga: 1.4, vel: 650, radio: 80, color: "#b46bff", desc: HG.t("Mantén el disparo para cargar una bola de energía enorme.") },
  { id: "railgun", nombre: HG.t("Railgun"),               precio: 120000, tipo: "rail",   mult: 9,   cad: 0.8,  color: "#9ff",    desc: HG.t("Rayo instantáneo que atraviesa a todos los enemigos.") },
  { id: "pulso",   nombre: HG.t("Bomba de pulso"),        precio: 200000, tipo: "pulso",  mult: 10,  cad: 1 / 12, radio: 650, color: "#8fe0ff", desc: HG.t("Onda de choque a tu alrededor. Recarga en 12 s.") },
];
HG.arma = id => HG.ARMAS.find(a => a.id === id);

HG.MINERALES = {
  cuarzo:    { nombre: HG.t("Cuarzo azul"),      precio: 40,   color: "#4aa8ff" },
  ferrita:   { nombre: HG.t("Ferrita"),          precio: 25,   color: "#a89a8c" },
  ambar:     { nombre: HG.t("Ámbar solar"),      precio: 90,   color: "#ffb23a" },
  silice:    { nombre: HG.t("Sílice roja"),      precio: 55,   color: "#e0483b" },
  criolita:  { nombre: HG.t("Criolita"),         precio: 150,  color: "#9ff0ff" },
  hielo:     { nombre: HG.t("Hielo estelar"),    precio: 110,  color: "#eafcff" },
  magmatita: { nombre: HG.t("Magmatita"),        precio: 300,  color: "#ff5a1a" },
  obsidiana: { nombre: HG.t("Obsidiana viva"),   precio: 220,  color: "#8a3cff" },
  nebulita:  { nombre: HG.t("Nebulita"),         precio: 600,  color: "#ff6be6" },
  vacio:     { nombre: HG.t("Cristal de vacío"), precio: 1000, color: "#a0fff0" },
};

// tipo: "mar" (océanos y hierba), "arena", "hielo" o "lava"; repartidos en un mapa grande con mucha separación
HG.PLANETAS = [
  { id: "aurora", nombre: HG.t("Aurora"), tipo: "mar",   nivel: 1, radio: 520, pos: [4500, 0, -3000],      base: "#2a6fb0", tierra: "#3f9b4a", nubes: 0.35, atm: "#66aaff", cielo: "#8fc4ff", suelo: "#4f8f46", minerales: ["cuarzo", "ferrita"],      jefe: { nombre: HG.t("Corsario Vex"), vida: 385, premio: 15000 } },
  { id: "verdia", nombre: HG.t("Verdia"), tipo: "mar",   nivel: 2, radio: 560, pos: [-5500, 400, -2000],   base: "#1f6b5e", tierra: "#7cc35a", nubes: 0.4,  atm: "#7dffc8", cielo: "#a8f0d0", suelo: "#5f9e4a", minerales: ["ferrita", "ambar"],       jefe: { nombre: HG.t("Capitana Musgo"), vida: 700, premio: 30000 } },
  { id: "duna",   nombre: HG.t("Duna"),   tipo: "arena", nivel: 2, radio: 480, pos: [-3000, 600, -7500],   base: "#b8793a", tierra: "#e0b070", nubes: 0.1,  atm: "#ffaa66", cielo: "#f2b27a", suelo: "#c98d4f", minerales: ["ambar", "silice"],        jefe: { nombre: HG.t("La Tormenta Roja"), vida: 880, premio: 40000 } },
  { id: "coral",  nombre: HG.t("Coral"),  tipo: "mar",   nivel: 3, radio: 600, pos: [7500, -300, -8000],   base: "#1d4f9a", tierra: "#e0866a", nubes: 0.3,  atm: "#ff9fb8", cielo: "#ffc6d3", suelo: "#c9765e", minerales: ["silice", "criolita"],     jefe: { nombre: HG.t("Almirante Anémona"), vida: 1400, premio: 70000 } },
  { id: "glacia", nombre: HG.t("Glacia"), tipo: "hielo", nivel: 3, radio: 560, pos: [1500, -600, -11500],  base: "#a9d6ea", tierra: "#ffffff", nubes: 0.3,  atm: "#cceeff", cielo: "#bfe2f2", suelo: "#dfeef5", minerales: ["criolita", "hielo"],      jefe: { nombre: HG.t("Reina del Hielo"), vida: 1760, premio: 90000 } },
  { id: "ceniza", nombre: HG.t("Ceniza"), tipo: "arena", nivel: 4, radio: 520, pos: [-9500, 300, -9000],   base: "#4a4440", tierra: "#8a7f75", nubes: 0.15, atm: "#c9b8a8", cielo: "#8f857c", suelo: "#5f5852", minerales: ["hielo", "obsidiana"],     jefe: { nombre: HG.t("El Carbonero"), vida: 2300, premio: 130000 } },
  { id: "ignea",  nombre: HG.t("Ígnea"),  tipo: "lava",  nivel: 4, radio: 500, pos: [-6000, 500, -15000],  base: "#2b0f08", tierra: "#ff5a1a", nubes: 0,    atm: "#ff6633", cielo: "#5a1c10", suelo: "#3a1a12", minerales: ["magmatita", "obsidiana"], jefe: { nombre: HG.t("Magnus el Fundido"), vida: 3080, premio: 180000 } },
  { id: "prisma", nombre: HG.t("Prisma"), tipo: "hielo", nivel: 5, radio: 580, pos: [9000, 700, -15500],   base: "#6b5bd6", tierra: "#d8c8ff", nubes: 0.2,  atm: "#c39bff", cielo: "#cbb6ff", suelo: "#b8a6e8", minerales: ["magmatita", "nebulita"],  jefe: { nombre: HG.t("Doctora Cristal"), vida: 4200, premio: 260000 } },
  { id: "onix",   nombre: HG.t("Ónix"),   tipo: "mar",   nivel: 5, radio: 620, pos: [1500, 1000, -19000],  base: "#1c2233", tierra: "#4a90d9", nubes: 0.2,  atm: "#4488ff", cielo: "#1a2240", suelo: "#2a3248", minerales: ["nebulita", "vacio"],      jefe: { nombre: HG.t("Almirante Sombra"), vida: 5225, premio: 350000 } },
  { id: "abismo", nombre: HG.t("Abismo"), tipo: "lava",  nivel: 5, radio: 640, pos: [-12000, -500, -19500], base: "#120a1c", tierra: "#b02cff", nubes: 0,    atm: "#a040ff", cielo: "#2a1240", suelo: "#24162e", minerales: ["obsidiana", "vacio"],     jefe: { nombre: HG.t("El Devorador"), vida: 6000, premio: 450000 } },
];

HG.CARBON = { precio: 80, max: 60 }; // mina de la estación: siempre se puede ganar dinero

HG.COMIDAS = [
  { id: "racion",   nombre: HG.t("Ración espacial"),   precio: 50,   valor: 15,  desc: HG.t("Sabe a cartón, pero llena.") },
  { id: "sandwich", nombre: HG.t("Sándwich de algas"), precio: 150,  valor: 35,  desc: HG.t("Algas hidropónicas de la estación.") },
  { id: "guiso",    nombre: HG.t("Guiso lunar"),       precio: 400,  valor: 70,  desc: HG.t("Receta secreta de Bruno.") },
  { id: "banquete", nombre: HG.t("Banquete estelar"),  precio: 1200, valor: 100, desc: HG.t("Te deja la barra llena.") },
];

HG.CLANES_NPC = [
  { nombre: HG.t("Halcones de Orión"),   lema: HG.t("Rápidos como la luz."),          miembros: 24, color: "#4cc9f0" },
  { nombre: HG.t("Forja Carmesí"),       lema: HG.t("Ningún casco sin reparar."),     miembros: 31, color: "#ff5a4a" },
  { nombre: HG.t("Errantes del Vacío"),  lema: HG.t("Más allá del último planeta."),  miembros: 17, color: "#b46bff" },
  { nombre: HG.t("Guardia de Aurora"),   lema: HG.t("Protegemos la primera colonia."), miembros: 40, color: "#7CFC9A" },
];
HG.PILOTOS_NPC = ["Iris Vega", "Tomás Ruiz", "Sora Kim", "Marco Bellini", "Ana Petrova", "Diego Luna", "Yuki Tanaka", "Lucía Ferrer", "Omar Haddad", "Elena Costa"];

// Final del juego (créditos)
HG.META = { planetas: 3, derrotas: 100, monedas: 1000000 };

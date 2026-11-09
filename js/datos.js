// Datos del juego: naves, armas, minerales, planetas, comida, clanes y pilotos.
"use strict";
window.HG = window.HG || {};

// Cuanto más cara es la nave, mejores son sus estadísticas de serie.
HG.NAVES = [ // id: archivo en modelos/naves · largo: tamaño en el juego · motores y canones: posiciones en fracción del largo · ala: a qué distancia del centro van las armas extra
  { id: "gorrion", nombre: "Gorrión",       precio: 1000,   vel: 100, vida: 150,  dano: 10, bodega: 20,  huecos: 1, largo: 11, ala: 0.12, casco: "#d9dde3", detalle: "#2b3038", franja: "#4cc9f0", motores: [[-0.089, -0.051, 0.49], [0.084, -0.051, 0.49]], canones: [[-0.048, -0.066, -0.49], [0.046, -0.071, -0.49]] },
  { id: "lince",   nombre: "Lince",         precio: 50000,  vel: 125, vida: 320,  dano: 18, bodega: 50,  huecos: 2, largo: 16, ala: 0.18, casco: "#dde0e5", detalle: "#30353e", franja: "#ff9f43", motores: [[-0.134, -0.031, 0.48], [0.134, -0.031, 0.48]], canones: [[-0.048, -0.068, -0.48], [0.047, -0.064, -0.48]] },
  { id: "fenix",   nombre: "Fénix",         precio: 220000, vel: 160, vida: 780,  dano: 38, bodega: 150, huecos: 3, largo: 23, ala: 0.22, casco: "#1c1e23", detalle: "#3a3f48", franja: "#d4a63a", motores: [[-0.13, -0.066, 0.48], [0.13, -0.069, 0.48]], canones: [[-0.052, -0.142, -0.47], [0.053, -0.142, -0.47]] },
  { id: "prime",   nombre: "Haluski Prime", precio: 800000, vel: 200, vida: 1500, dano: 60, bodega: 300, huecos: 4, largo: 30, ala: 0.26, casco: "#b0231b", detalle: "#1a1b1f", franja: "#efe6d2", motores: [[-0.163, -0.058, 0.48], [0.155, -0.053, 0.48]], canones: [[-0.051, -0.1, -0.48], [0.049, -0.1, -0.48]] },
];
// Mejoras de cada nave: 3 ramas de 5 niveles. Coste según el precio de la nave.
HG.RAMAS = [
  { id: "mov", nombre: "Movimiento", desc: "+10% velocidad y maniobra por nivel" },
  { id: "com", nombre: "Combate", desc: "+10% daño y +10% vida por nivel" },
  { id: "asp", nombre: "Aspecto", desc: "Pintura, acabados, luces y estela" },
];
HG.costeMejora = (nave, nivel) => Math.round((300 + HG.NAVES[nave].precio * 0.05) * nivel / 10) * 10;
HG.ASPECTOS = ["De serie", "Pintura de color", "Acabado metalizado", "Luces de neón", "Estela de color", "Holográfica"];
HG.COLORES_NAVE = ["#4cc9f0", "#ff9f43", "#7CFC9A", "#ff4d6d", "#b46bff", "#ffd166"];

HG.ARMAS = [
  { id: "laser",   nombre: "Láser",                precio: 0,      tipo: "bala",   mult: 1,   cad: 6,    vel: 1100, color: "#5ff",    desc: "Disparo rápido y preciso. Viene de serie." },
  { id: "gatling", nombre: "Ametralladora gatling", precio: 15000,  tipo: "bala",   mult: 0.55, cad: 14,  vel: 1200, color: "#ffd34d", disp: 0.035, desc: "Lluvia de balas con algo de dispersión." },
  { id: "misiles", nombre: "Misiles teledirigidos", precio: 30000,  tipo: "misil",  mult: 5,   cad: 1.2,  vel: 420,  color: "#ff7a3c", desc: "Persiguen al enemigo más cercano." },
  { id: "minas",   nombre: "Minas de proximidad",   precio: 40000,  tipo: "mina",   mult: 8,   cad: 1,    radio: 90, color: "#ff3c6e", desc: "Se quedan flotando y explotan si se acerca un enemigo." },
  { id: "plasma",  nombre: "Cañón de plasma",       precio: 60000,  tipo: "plasma", mult: 16,  carga: 1.4, vel: 650, radio: 80, color: "#b46bff", desc: "Mantén el disparo para cargar una bola de energía enorme." },
  { id: "railgun", nombre: "Railgun",               precio: 120000, tipo: "rail",   mult: 9,   cad: 0.8,  color: "#9ff",    desc: "Rayo instantáneo que atraviesa a todos los enemigos." },
  { id: "pulso",   nombre: "Bomba de pulso",        precio: 200000, tipo: "pulso",  mult: 10,  cad: 1 / 12, radio: 650, color: "#8fe0ff", desc: "Onda de choque a tu alrededor. Recarga en 12 s." },
];
HG.arma = id => HG.ARMAS.find(a => a.id === id);

HG.MINERALES = {
  cuarzo:    { nombre: "Cuarzo azul",      precio: 40,   color: "#4aa8ff" },
  ferrita:   { nombre: "Ferrita",          precio: 25,   color: "#a89a8c" },
  ambar:     { nombre: "Ámbar solar",      precio: 90,   color: "#ffb23a" },
  silice:    { nombre: "Sílice roja",      precio: 55,   color: "#e0483b" },
  criolita:  { nombre: "Criolita",         precio: 150,  color: "#9ff0ff" },
  hielo:     { nombre: "Hielo estelar",    precio: 110,  color: "#eafcff" },
  magmatita: { nombre: "Magmatita",        precio: 300,  color: "#ff5a1a" },
  obsidiana: { nombre: "Obsidiana viva",   precio: 220,  color: "#8a3cff" },
  nebulita:  { nombre: "Nebulita",         precio: 600,  color: "#ff6be6" },
  vacio:     { nombre: "Cristal de vacío", precio: 1000, color: "#a0fff0" },
};

// tipo: "mar" (océanos y hierba), "arena", "hielo" o "lava"; repartidos en un mapa grande con mucha separación
HG.PLANETAS = [
  { id: "aurora", nombre: "Aurora", tipo: "mar",   nivel: 1, radio: 520, pos: [4500, 0, -3000],      base: "#2a6fb0", tierra: "#3f9b4a", nubes: 0.35, atm: "#66aaff", cielo: "#8fc4ff", suelo: "#4f8f46", minerales: ["cuarzo", "ferrita"],      jefe: { nombre: "Corsario Vex", vida: 385, premio: 15000 } },
  { id: "verdia", nombre: "Verdia", tipo: "mar",   nivel: 2, radio: 560, pos: [-5500, 400, -2000],   base: "#1f6b5e", tierra: "#7cc35a", nubes: 0.4,  atm: "#7dffc8", cielo: "#a8f0d0", suelo: "#5f9e4a", minerales: ["ferrita", "ambar"],       jefe: { nombre: "Capitana Musgo", vida: 700, premio: 30000 } },
  { id: "duna",   nombre: "Duna",   tipo: "arena", nivel: 2, radio: 480, pos: [-3000, 600, -7500],   base: "#b8793a", tierra: "#e0b070", nubes: 0.1,  atm: "#ffaa66", cielo: "#f2b27a", suelo: "#c98d4f", minerales: ["ambar", "silice"],        jefe: { nombre: "La Tormenta Roja", vida: 880, premio: 40000 } },
  { id: "coral",  nombre: "Coral",  tipo: "mar",   nivel: 3, radio: 600, pos: [7500, -300, -8000],   base: "#1d4f9a", tierra: "#e0866a", nubes: 0.3,  atm: "#ff9fb8", cielo: "#ffc6d3", suelo: "#c9765e", minerales: ["silice", "criolita"],     jefe: { nombre: "Almirante Anémona", vida: 1400, premio: 70000 } },
  { id: "glacia", nombre: "Glacia", tipo: "hielo", nivel: 3, radio: 560, pos: [1500, -600, -11500],  base: "#a9d6ea", tierra: "#ffffff", nubes: 0.3,  atm: "#cceeff", cielo: "#bfe2f2", suelo: "#dfeef5", minerales: ["criolita", "hielo"],      jefe: { nombre: "Reina del Hielo", vida: 1760, premio: 90000 } },
  { id: "ceniza", nombre: "Ceniza", tipo: "arena", nivel: 4, radio: 520, pos: [-9500, 300, -9000],   base: "#4a4440", tierra: "#8a7f75", nubes: 0.15, atm: "#c9b8a8", cielo: "#8f857c", suelo: "#5f5852", minerales: ["hielo", "obsidiana"],     jefe: { nombre: "El Carbonero", vida: 2300, premio: 130000 } },
  { id: "ignea",  nombre: "Ígnea",  tipo: "lava",  nivel: 4, radio: 500, pos: [-6000, 500, -15000],  base: "#2b0f08", tierra: "#ff5a1a", nubes: 0,    atm: "#ff6633", cielo: "#5a1c10", suelo: "#3a1a12", minerales: ["magmatita", "obsidiana"], jefe: { nombre: "Magnus el Fundido", vida: 3080, premio: 180000 } },
  { id: "prisma", nombre: "Prisma", tipo: "hielo", nivel: 5, radio: 580, pos: [9000, 700, -15500],   base: "#6b5bd6", tierra: "#d8c8ff", nubes: 0.2,  atm: "#c39bff", cielo: "#cbb6ff", suelo: "#b8a6e8", minerales: ["magmatita", "nebulita"],  jefe: { nombre: "Doctora Cristal", vida: 4200, premio: 260000 } },
  { id: "onix",   nombre: "Ónix",   tipo: "mar",   nivel: 5, radio: 620, pos: [1500, 1000, -19000],  base: "#1c2233", tierra: "#4a90d9", nubes: 0.2,  atm: "#4488ff", cielo: "#1a2240", suelo: "#2a3248", minerales: ["nebulita", "vacio"],      jefe: { nombre: "Almirante Sombra", vida: 5225, premio: 350000 } },
  { id: "abismo", nombre: "Abismo", tipo: "lava",  nivel: 5, radio: 640, pos: [-12000, -500, -19500], base: "#120a1c", tierra: "#b02cff", nubes: 0,    atm: "#a040ff", cielo: "#2a1240", suelo: "#24162e", minerales: ["obsidiana", "vacio"],     jefe: { nombre: "El Devorador", vida: 6000, premio: 450000 } },
];

HG.CARBON = { precio: 80, max: 60 }; // mina de la estación: siempre se puede ganar dinero

HG.COMIDAS = [
  { id: "racion",   nombre: "Ración espacial",   precio: 50,   valor: 15,  desc: "Sabe a cartón, pero llena." },
  { id: "sandwich", nombre: "Sándwich de algas", precio: 150,  valor: 35,  desc: "Algas hidropónicas de la estación." },
  { id: "guiso",    nombre: "Guiso lunar",       precio: 400,  valor: 70,  desc: "Receta secreta de Bruno." },
  { id: "banquete", nombre: "Banquete estelar",  precio: 1200, valor: 100, desc: "Te deja la barra llena." },
];

HG.CLANES_NPC = [
  { nombre: "Halcones de Orión",   lema: "Rápidos como la luz.",          miembros: 24, color: "#4cc9f0" },
  { nombre: "Forja Carmesí",       lema: "Ningún casco sin reparar.",     miembros: 31, color: "#ff5a4a" },
  { nombre: "Errantes del Vacío",  lema: "Más allá del último planeta.",  miembros: 17, color: "#b46bff" },
  { nombre: "Guardia de Aurora",   lema: "Protegemos la primera colonia.", miembros: 40, color: "#7CFC9A" },
];
HG.PILOTOS_NPC = ["Iris Vega", "Tomás Ruiz", "Sora Kim", "Marco Bellini", "Ana Petrova", "Diego Luna", "Yuki Tanaka", "Lucía Ferrer", "Omar Haddad", "Elena Costa"];

// Final del juego (créditos)
HG.META = { planetas: 3, derrotas: 100, monedas: 1000000 };

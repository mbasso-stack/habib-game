// Datos del juego: naves, armas, minerales, planetas, comida, clanes y pilotos.
"use strict";
window.HG = window.HG || {};

// Cuanto más cara es la nave, mejores son sus estadísticas de serie.
HG.NAVES = [
  { nombre: "Gorrión",       precio: 1000,   vel: 100, vida: 100,  dano: 10, bodega: 20,  huecos: 1 },
  { nombre: "Halcón",        precio: 50000,  vel: 115, vida: 160,  dano: 14, bodega: 35,  huecos: 2 },
  { nombre: "Lince",         precio: 100000, vel: 125, vida: 210,  dano: 18, bodega: 50,  huecos: 2 },
  { nombre: "Raya",          precio: 150000, vel: 135, vida: 270,  dano: 22, bodega: 70,  huecos: 2 },
  { nombre: "Centella",      precio: 220000, vel: 150, vida: 330,  dano: 27, bodega: 90,  huecos: 3 },
  { nombre: "Tormenta",      precio: 300000, vel: 155, vida: 420,  dano: 32, bodega: 120, huecos: 3 },
  { nombre: "Fénix",         precio: 400000, vel: 165, vida: 520,  dano: 38, bodega: 150, huecos: 3 },
  { nombre: "Leviatán",      precio: 520000, vel: 160, vida: 680,  dano: 45, bodega: 220, huecos: 4 },
  { nombre: "Quimera",       precio: 650000, vel: 180, vida: 780,  dano: 52, bodega: 250, huecos: 4 },
  { nombre: "Haluski Prime", precio: 800000, vel: 200, vida: 1000, dano: 60, bodega: 300, huecos: 5 },
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

HG.PLANETAS = [
  { id: "aurora", nombre: "Aurora", nivel: 1, radio: 420, pos: [2300, 0, -1300],   base: "#2a6fb0", tierra: "#3f9b4a", nubes: 0.35, atm: "#66aaff", cielo: "#8fc4ff", suelo: "#4f8f46", minerales: ["cuarzo", "ferrita"],     jefe: { nombre: "Corsario Vex", vida: 700, premio: 15000 } },
  { id: "duna",   nombre: "Duna",   nivel: 2, radio: 380, pos: [-2700, 300, -2500], base: "#b8793a", tierra: "#e0b070", nubes: 0.1,  atm: "#ffaa66", cielo: "#f2b27a", suelo: "#c98d4f", minerales: ["ambar", "silice"],       jefe: { nombre: "La Tormenta Roja", vida: 1600, premio: 40000 } },
  { id: "glacia", nombre: "Glacia", nivel: 3, radio: 460, pos: [3500, -400, -4300], base: "#a9d6ea", tierra: "#ffffff", nubes: 0.3,  atm: "#cceeff", cielo: "#bfe2f2", suelo: "#dfeef5", minerales: ["criolita", "hielo"],     jefe: { nombre: "Reina del Hielo", vida: 3200, premio: 90000 } },
  { id: "ignea",  nombre: "Ígnea",  nivel: 4, radio: 400, pos: [-4300, 200, -5700], base: "#2b0f08", tierra: "#ff5a1a", nubes: 0,    atm: "#ff6633", cielo: "#5a1c10", suelo: "#3a1a12", minerales: ["magmatita", "obsidiana"], jefe: { nombre: "Magnus el Fundido", vida: 5600, premio: 180000 } },
  { id: "onix",   nombre: "Ónix",   nivel: 5, radio: 500, pos: [900, 650, -7800],   base: "#1c2233", tierra: "#4a90d9", nubes: 0.2,  atm: "#4488ff", cielo: "#1a2240", suelo: "#2a3248", minerales: ["nebulita", "vacio"],     jefe: { nombre: "Almirante Sombra", vida: 9500, premio: 350000 } },
];

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

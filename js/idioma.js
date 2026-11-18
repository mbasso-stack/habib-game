// Idiomas: el juego está escrito en español y aquí está su traducción al inglés.
// HG.t("texto en español con {0}", valor) devuelve el texto en el idioma elegido con los valores puestos.
// El idioma se elige en Ajustes; la primera vez se toma el del navegador (español si es español, si no inglés).
"use strict";
window.HG = window.HG || {};
(function () {
const HG = window.HG;
let idioma = null;
try { idioma = JSON.parse(localStorage.getItem("haluski_ajustes") || "{}").idioma; } catch (e) {}
if (idioma !== "es" && idioma !== "en") idioma = /^es\b/i.test(navigator.language || "") ? "es" : "en";
HG.idioma = idioma;
document.documentElement.lang = idioma;

const EN = {
  // naves, mejoras y armas
  "Gorrión": "Sparrow", "Lince": "Lynx", "Fénix": "Phoenix", "Haluski Prime": "Haluski Prime",
  "Movimiento": "Handling", "+10% velocidad y maniobra por nivel": "+10% speed and agility per level",
  "Combate": "Combat", "+10% daño y +10% vida por nivel": "+10% damage and +10% hull per level",
  "Aspecto": "Looks", "Pintura, acabados, luces y estela": "Paint, finishes, lights and trail",
  "De serie": "Stock", "Pintura de color": "Colour paint", "Acabado metalizado": "Metallic finish", "Luces de neón": "Neon lights", "Estela de color": "Coloured trail", "Holográfica": "Holographic",
  "Láser": "Laser", "Disparo rápido y preciso. Viene de serie.": "Fast and accurate. Comes as standard.",
  "Ametralladora gatling": "Gatling gun", "Lluvia de balas con algo de dispersión.": "A hail of bullets with some spread.",
  "Misiles teledirigidos": "Homing missiles", "Persiguen al enemigo más cercano.": "They chase the nearest enemy.",
  "Minas de proximidad": "Proximity mines", "Se quedan flotando y explotan si se acerca un enemigo.": "They float in place and explode when an enemy gets close.",
  "Cañón de plasma": "Plasma cannon", "Mantén el disparo para cargar una bola de energía enorme.": "Hold fire to charge a huge ball of energy.",
  "Railgun": "Railgun", "Rayo instantáneo que atraviesa a todos los enemigos.": "An instant beam that pierces every enemy.",
  "Bomba de pulso": "Pulse bomb", "Onda de choque a tu alrededor. Recarga en 12 s.": "A shockwave all around you. Recharges in 12 s.",
  // minerales
  "Cuarzo azul": "Blue quartz", "Ferrita": "Ferrite", "Ámbar solar": "Solar amber", "Sílice roja": "Red silica", "Criolita": "Cryolite",
  "Hielo estelar": "Star ice", "Magmatita": "Magmatite", "Obsidiana viva": "Living obsidian", "Nebulita": "Nebulite", "Cristal de vacío": "Void crystal",
  // planetas y jefes
  "Aurora": "Aurora", "Corsario Vex": "Corsair Vex", "Verdia": "Verdia", "Capitana Musgo": "Captain Moss", "Duna": "Dune", "La Tormenta Roja": "The Red Storm",
  "Coral": "Coral", "Almirante Anémona": "Admiral Anemone", "Glacia": "Glacia", "Reina del Hielo": "The Ice Queen", "Ceniza": "Ash", "El Carbonero": "The Coalman",
  "Ígnea": "Ignea", "Magnus el Fundido": "Magnus the Molten", "Prisma": "Prism", "Doctora Cristal": "Doctor Crystal", "Ónix": "Onyx", "Almirante Sombra": "Admiral Shadow",
  "Abismo": "Abyss", "El Devorador": "The Devourer",
  // comida y clanes
  "Ración espacial": "Space ration", "Sabe a cartón, pero llena.": "Tastes like cardboard, but it fills you up.",
  "Sándwich de algas": "Seaweed sandwich", "Algas hidropónicas de la estación.": "Hydroponic seaweed from the station.",
  "Guiso lunar": "Lunar stew", "Receta secreta de Bruno.": "Bruno's secret recipe.",
  "Banquete estelar": "Stellar feast", "Te deja la barra llena.": "Fills your bar right up.",
  "Halcones de Orión": "Orion Hawks", "Rápidos como la luz.": "Fast as light.", "Forja Carmesí": "Crimson Forge", "Ningún casco sin reparar.": "No hull left unrepaired.",
  "Errantes del Vacío": "Void Wanderers", "Más allá del último planeta.": "Beyond the last planet.", "Guardia de Aurora": "Aurora Guard", "Protegemos la primera colonia.": "We protect the first colony.",
  // espacio
  "¡Has derrotado a {0}! +{1} monedas. Ya puedes plantar tu bandera en {2}.": "You defeated {0}! +{1} coins. You can now plant your flag on {2}.",
  "Pirata derribado · +{0} monedas": "Pirate down · +{0} coins",
  "¡Tu nave ha explotado! Pierdes la carga.": "Your ship exploded! You lose your cargo.",
  "⚠ {0} defiende {1}": "⚠ {0} defends {1}", "¡Piratas a la vista!": "Pirates incoming!",
  "Estación": "Station", "Atracar en la estación": "Dock at the station", "Aterrizar en {0}": "Land on {0}",
  // estación
  "CREW UNIT 4B · OCUPADO": "CREW UNIT 4B · OCCUPIED", "DESPEGUE": "LAUNCH", "HANGAR": "HANGAR", "TIENDA": "SHOP", "SALA DE CLANES": "CLAN HALL",
  "Terminal del hangar": "Hangar terminal", "AMIGOS": "FRIENDS", "Terminal de amigos": "Friends terminal", "CLANES": "CLANS", "Terminal de clanes": "Clan terminal",
  "MINA DE CARBÓN": "COAL MINE", "COMPRA DE CARBÓN": "COAL BUYER",
  "+{0} de carbón ({1}/{2})": "+{0} coal ({1}/{2})",
  "Llevas el máximo de carbón ({0}). Véndelo en la terminal de compra.": "You're carrying the maximum coal ({0}). Sell it at the coal buyer.",
  "No llevas carbón. Pícalo en la mina de la estación.": "You have no coal. Mine some in the station's coal mine.",
  "Vendes {0} de carbón: +{1} monedas": "You sell {0} coal: +{1} coins",
  "Vender carbón ({0} × {1} ●)": "Sell coal ({0} × {1} ●)",
  "Mina de carbón · clic o F para picar · llevas {0}/{1}": "Coal mine · click or F to mine · carrying {0}/{1}",
  "Tienda del robot": "Robot's shop", "Ver tu nave en el hangar": "See your ship in the hangar", "Despegar": "Take off",
  // juego
  "Bienvenido a la estación. Tienes 1.000 monedas: compra tu primera nave en la terminal del hangar (al este). Si te quedas sin dinero, pica carbón en la mina y véndelo.":
    "Welcome to the station. You have 1,000 coins: buy your first ship at the hangar terminal (to the east). If you run out of money, mine coal and sell it.",
  "Haz clic para mover la cámara con el ratón. Esc para pausar.": "Click to move the camera with the mouse. Esc to pause.",
  "Necesitas una nave. Cómprala en la terminal del hangar.": "You need a ship. Buy one at the hangar terminal.",
  "Atracado en la estación. Vende tus minerales en la tienda.": "Docked at the station. Sell your minerals at the shop.",
  "¡{0} conquistado! +{1} monedas": "{0} conquered! +{1} coins",
  "Has reaparecido en la estación. Tu nave está reparada, pero perdiste la carga.": "You respawned at the station. Your ship is repaired, but you lost your cargo.",
  "¡Tienes hambre! Compra comida en la tienda de la estación.": "You're hungry! Buy food at the station shop.",
  "Compra tu primera nave en la terminal del hangar (al este) · ¿Sin dinero? Pica carbón en la mina": "Buy your first ship at the hangar terminal (to the east) · Out of money? Mine coal",
  "Bodega llena: vende minerales en la tienda": "Hold full: sell minerals at the shop",
  "Derrota jefes y planta tu bandera en 3 planetas": "Defeat bosses and plant your flag on 3 planets",
  "Derrota a 100 enemigos": "Defeat 100 enemies", "Reúne 1.000.000 de monedas": "Collect 1,000,000 coins", "¡Misión cumplida!": "Mission complete!",
  // personajes
  "Haluski": "Haluski", "Protagonista": "Hero", "Piloto protagonista. Valiente, impulsivo y con un don para las naves.": "The hero pilot. Brave, impulsive and a natural with ships.",
  "Nadia": "Nadia", "Nadia Reyes": "Nadia Reyes", "Exploradora · Amigos": "Explorer · Friends", "Exploradora. Conoce cada roca de los planetas y a cada piloto de la estación.": "Explorer. She knows every rock on every planet and every pilot on the station.",
  "Kenji": "Kenji", "Capitán Kenji Morita": "Captain Kenji Morita", "Comandante · Clanes": "Commander · Clans", "Comandante veterano. Dirige la estación y los clanes con mano firme.": "Veteran commander. Runs the station and the clans with a firm hand.",
  "Bruno": "Bruno", "Bruno «Llave» Kowalski": "Bruno “Wrench” Kowalski", "Mecánico del hangar": "Hangar mechanic", "Mecánico del hangar. Si tiene tornillos, Bruno lo arregla.": "Hangar mechanic. If it has bolts, Bruno can fix it.",
  "Rayo": "Rayo", "Astronauta de élite": "Elite astronaut", "Astronauta de élite. Su traje amarillo se ve desde cualquier rincón de la galaxia.": "Elite astronaut. That yellow suit can be spotted from any corner of the galaxy.",
  "Astronauta": "Astronaut", "Ingeniero de vuelo": "Flight engineer", "Ingeniero de vuelo. Siempre lleva el casco bajo el brazo, por si acaso.": "Flight engineer. Always keeps the helmet tucked under one arm, just in case.",
  "Piloto": "Pilot", "Piloto de pruebas": "Test pilot", "Piloto de pruebas. Vuela primero y pregunta después.": "Test pilot. Flies first, asks questions later.",
  "Robot": "Robot", "Robot de la tienda": "Shop robot",
  // planeta
  "{0} es tuyo. ¡Sigue picando!": "{0} is yours. Keep mining!", "Planta tu bandera en {0} para conquistarlo.": "Plant your flag on {0} to conquer it.",
  "Derrota a {0} en órbita para conquistar {1}.": "Defeat {0} in orbit to conquer {1}.", "¡Bodega llena! Vende en la estación.": "Hold full! Sell at the station.",
  "Plantar bandera": "Plant flag",
  // interfaz
  "monedas": "coins", "Comida": "Food", "Carga": "Cargo", "Objetivo:": "Objective:", "Casco de la nave": "Ship hull", "Derrotados": "Defeated", "Planetas": "Planets",
  "ENTER o clic para saltar ▸": "ENTER or click to skip ▸",
  "Compra, mejora y equipa tus naves": "Buy, upgrade and equip your ships", "EN USO": "IN USE", "TUYA": "OWNED",
  "Velocidad": "Speed", "Vida": "Hull", "Daño": "Damage", "Bodega": "Hold", "Huecos de armas": "Weapon slots",
  "Comprar por {0} monedas": "Buy for {0} coins", "Usar esta nave": "Use this ship", "Mejoras": "Upgrades", "MÁX": "MAX", "Color": "Colour",
  "Armas equipadas": "Equipped weapons", "vacío": "empty", "Casco": "Hull", "{0}/{1} de vida": "{0}/{1} hull", "Reparar": "Repair",
  "Armas, comida, venta de minerales y amigos": "Weapons, food, mineral trading and friends", "Robot dependiente": "Shop robot",
  "Armas": "Weapons", "Vender minerales": "Sell minerals", "Amigos": "Friends",
  "EN TU ARSENAL · equípala en el hangar": "IN YOUR ARSENAL · equip it in the hangar",
  "Baja con el tiempo. Sin comida, tu nave pierde vida y caminas más despacio.": "It drops over time. Without food your ship loses hull and you walk slower.",
  "+{0} de comida": "+{0} food", "Comer": "Eat", "{0} unidades": "{0} units", "Vender por": "Sell for", "Vender todo": "Sell everything",
  "No llevas minerales. Pica rocas en los planetas o recoge las cajas que sueltan piratas y asteroides.": "You have no minerals. Mine rocks on planets or pick up the crates dropped by pirates and asteroids.",
  "Precios": "Prices",
  "«Aquí conoces a otros pilotos. Ahora mismo son pilotos de la estación; cuando el juego sea online, verás aquí a personas reales.»": "“This is where you meet other pilots. For now they're station pilots; once the game goes online, you'll see real people here.”",
  "Nivel": "Level", "En la estación": "On the station", "De misión": "On a mission", "Quitar amigo": "Remove friend", "Añadir amigo": "Add friend",
  "Únete a un clan o crea el tuyo": "Join a clan or found your own", "Tu clan": "Your clan", "Salir del clan": "Leave clan",
  "No perteneces a ningún clan. Tu bandera en los planetas tendrá el color de tu clan.": "You're not in a clan. Your flag on planets will carry your clan's colour.",
  "{0} miembros": "{0} members", "ERES MIEMBRO": "MEMBER", "Unirse": "Join", "Crear clan": "Found a clan", "Cuesta {0} monedas.": "Costs {0} coins.", "Nombre del clan": "Clan name", "Crear": "Found",
  "AJUSTES": "SETTINGS", "Configura el juego a tu gusto": "Set the game up your way", "Idioma": "Language",
  "Volumen de la música": "Music volume", "Volumen de los efectos": "Sound effects volume", "Calidad gráfica": "Graphics quality", "baja": "low", "media": "medium", "alta": "high",
  "Sensibilidad del ratón": "Mouse sensitivity", "Campo de visión": "Field of view", "Invertir eje vertical": "Invert vertical axis", "Mostrar FPS": "Show FPS",
  "Tu personaje": "Your character", "Listo": "Done",
  "ELIGE TU PERSONAJE": "CHOOSE YOUR CHARACTER", "Jugar con {0}": "Play as {0}", "← → para cambiar · ENTER para elegir": "← → to browse · ENTER to choose",
  "PAUSA": "PAUSED", "Continuar": "Continue", "Cambiar personaje": "Change character", "Ajustes": "Settings", "Controles": "Controls", "Guardar y salir al menú": "Save and quit to menu",
  "CONTROLES": "CONTROLS", "Haz clic en el juego para controlar la cámara con el ratón · Esc para pausar": "Click in the game to control the camera with the mouse · Esc to pause",
  "A pie": "On foot", "En la nave": "In the ship",
  "<kbd>W A S D</kbd> moverse · <kbd>Shift</kbd> correr · <kbd>Espacio</kbd> saltar<br><kbd>Ratón</kbd> cámara · <kbd>Rueda</kbd> zoom · <kbd>E</kbd> interactuar<br><kbd>Clic</kbd> o <kbd>F</kbd> picar (en los planetas y en la mina de carbón)":
    "<kbd>W A S D</kbd> move · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump<br><kbd>Mouse</kbd> camera · <kbd>Wheel</kbd> zoom · <kbd>E</kbd> interact<br><kbd>Click</kbd> or <kbd>F</kbd> mine (on planets and in the coal mine)",
  "<kbd>Ratón</kbd> o <kbd>flechas</kbd> dirigir · <kbd>W</kbd> acelerar · <kbd>S</kbd> frenar · <kbd>A D</kbd> desplazarse<br><kbd>Shift</kbd> turbo (lejos de enemigos, salto de crucero) · <kbd>Clic</kbd>, <kbd>Espacio</kbd> o <kbd>F</kbd> disparar (mantén con el plasma)<br><kbd>1</kbd>–<kbd>5</kbd> o <kbd>rueda</kbd> cambiar arma · <kbd>E</kbd> aterrizar o atracar":
    "<kbd>Mouse</kbd> or <kbd>arrows</kbd> steer · <kbd>W</kbd> accelerate · <kbd>S</kbd> brake · <kbd>A D</kbd> strafe<br><kbd>Shift</kbd> boost (cruise jump when no enemies are near) · <kbd>Click</kbd>, <kbd>Space</kbd> or <kbd>F</kbd> fire (hold for plasma)<br><kbd>1</kbd>–<kbd>5</kbd> or <kbd>wheel</kbd> switch weapon · <kbd>E</kbd> land or dock",
  "Entendido": "Got it", "MISIÓN COLONIAL": "COLONY MISSION", "Nueva partida": "New game", "Elegir personaje": "Choose character", "Juego clásico": "Classic game",
  "Fase 1 · sin conexión: los demás pilotos son NPCs. El modo online llega en la fase 2.": "Phase 1 · offline: other pilots are NPCs. Online mode arrives in phase 2.",
  "¡MISIÓN CUMPLIDA!": "MISSION COMPLETE!", "Has conquistado {0} planetas, derrotado a {1} enemigos y reunido {2} monedas.": "You conquered {0} planets, defeated {1} enemies and collected {2} coins.",
  "Idea y dirección": "Concept and direction", "Personajes, naves y robot": "Characters, ships and robot", "Modelos 3D de Malik": "3D models by Malik", "Música": "Music",
  "Cinemáticas e imágenes": "Cinematics and artwork", "Programación": "Programming", "Motor 3D": "3D engine", "Gracias por jugar.": "Thanks for playing.", "Seguir jugando": "Keep playing",
  "No tienes suficientes monedas.": "You don't have enough coins.", "¡{0} es tuya! Ve a la plataforma de despegue.": "The {0} is yours! Head to the launch pad.",
  "{0} comprada.": "{0} purchased.", "+{0} monedas": "+{0} coins", "{0} ahora es tu amigo.": "{0} is now your friend.", "Te has unido a {0}.": "You joined {0}.",
  "Escribe un nombre para tu clan.": "Type a name for your clan.", "Clan fundado por ti.": "A clan founded by you.", "Has fundado el clan {0}.": "You founded the clan {0}.",
  "¿Empezar una partida nueva? Se borrará la actual.": "Start a new game? Your current game will be deleted.",
};

HG.t = (texto, ...valores) => {
  const s = idioma === "en" && EN[texto] != null ? EN[texto] : texto;
  return valores.length ? s.replace(/\{(\d)\}/g, (_, i) => valores[i]) : s;
};
// textos fijos de la página: los elementos con data-tr se traducen al arrancar
HG.traducirPagina = () => {
  document.querySelectorAll("[data-tr]").forEach(el => { el.textContent = HG.t(el.textContent.trim()); });
  document.title = "Haluski: " + HG.t("MISIÓN COLONIAL").replace(/\w\S*/g, w => w[0] + w.slice(1).toLowerCase());
};
})();

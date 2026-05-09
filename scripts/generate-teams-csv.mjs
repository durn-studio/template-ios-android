// Regenerate docs/teams-and-players.csv with an added "Real-world
// identity" column — maps the in-game nicknames (La Pulga, El
// Diego, O Rei …) to the real footballer / historical figure / pop
// star they reference. Non-football themes (food, landmarks) keep
// the character name as the identity since those nicknames *are*
// the real-world name.
//
// Entries marked "?" are my best guess — the nickname is legitimate
// but could plausibly refer to more than one person. Please audit
// and correct in the CSV directly; re-running this script will
// overwrite, so edits to the CSV belong in this map, not the output.

import fs from "node:fs";

// theme id → tier index (1-based) → real-world identity
const IDENTITIES = {
  superstars: {
    1:  "Iniesta (young)",       // El Joven
    2:  "Iniesta",                // El Mago
    3:  "Ronaldinho",             // O Samba
    4:  "Thierry Henry",          // La Flèche
    5:  "Franz Beckenbauer ?",    // Die Mauer
    6:  "Zico ?",                 // O Artista
    7:  "Carlos Valderrama",      // El Peludo
    8:  "Ronaldinho",             // O Bruxo
    9:  "Zinedine Zidane",        // Le Maestro
    10: "Diego Maradona (young)", // El Pibe
    11: "Ronaldo (R9)",           // O Fenômeno
    12: "Lionel Messi",           // La Pulga
  },
  bra: {
    1:  "Neymar ?",               // O Menino
    2:  "Zico",                   // O Maestro
    3:  "Cafu ?",                 // O Capitão
    4:  "Romário ?",              // O Guerreiro
    5:  "Romário",                // O Mágico
    6:  "Roberto Carlos ?",       // O Relâmpago
    7:  "Rivelino ?",             // O Pêndulo
    8:  "Garrincha",              // Alegria do Povo
    9:  "Rivaldo ?",              // O Míssil
    10: "Ronaldinho",             // O Bruxo
    11: "Ronaldo (R9)",           // O Fenômeno
    12: "Pelé",                   // O Rei
  },
  arg: {
    1:  "Sergio Romero ?",        // El Araña
    2:  "Lautaro Martínez",       // El Toro
    3:  "Emiliano Martínez",      // El Dibu
    4:  "Paulo Dybala",           // La Joya
    5:  "Ángel Di María",         // El Ángel
    6:  "Gabriel Batistuta",      // El Matador
    7:  "Ariel Ortega",           // El Burrito
    8:  "Javier Mascherano ?",    // El Caudillo
    9:  "Mario Kempes ?",         // El Flaco
    10: "Hugo Gatti ?",           // El Loco
    11: "Diego Maradona",         // El Diego
    12: "Lionel Messi",           // La Pulga
  },
  esp: {
    1:  "Iker Casillas (young) ?",// El Joven
    2:  "Andrés Iniesta",         // El Mago
    3:  "Xavi Hernández",         // El Cerebro
    4:  "Fernando Llorente ?",    // El Tanque
    5:  "Andrés Iniesta ?",       // El Ilusionista
    6:  "Xavi Hernández ?",       // El Arquitecto
    7:  "Fernando Torres",        // El Niño
    8:  "Iker Casillas",          // San Iker
    9:  "Sergio Ramos ?",         // El Muro
    10: "Raúl González ?",        // La Saeta
    11: "Raúl González ?",        // El Zorro
    12: "Andrés Iniesta ?",       // El Sabio
  },
  fra: {
    1:  "Kylian Mbappé (young) ?",  // Le Petit
    2:  "Patrick Vieira ?",         // Le Démolisseur
    3:  "Didier Deschamps ?",       // Le Patron
    4:  "Thierry Henry",            // La Flèche
    5:  "Laurent Blanc ?",          // Le Mur
    6:  "Michel Platini ?",         // Le Président
    7:  "Michel Platini",           // Le Roi
    8:  "Zinedine Zidane",          // Le Maestro
    9:  "Zinedine Zidane ?",        // Le Magicien
    10: "Kylian Mbappé",            // Le Génie
    11: "Kylian Mbappé ?",          // La Tornade
    12: "Zinedine Zidane",          // L'Empereur
  },
  ger: {
    1:  "Jamal Musiala (young) ?",  // Der Junge
    2:  "Toni Kroos ?",             // Der Panzer
    3:  "Franz Beckenbauer",        // Die Mauer
    4:  "Gerd Müller",              // Der Bomber
    5:  "Oliver Kahn",              // Der Titan
    6:  "Thomas Müller ?",          // Die Maschine
    7:  "Miroslav Klose",           // Der Torjäger
    8:  "Bastian Schweinsteiger ?", // Der Terrier
    9:  "Lothar Matthäus ?",        // Der Libero
    10: "Mesut Özil ?",             // Das Phantom
    11: "Franz Beckenbauer ?",      // Der König
    12: "Franz Beckenbauer",        // Der Kaiser
  },
  eng: {
    1:  "Wayne Rooney (young) ?",   // The Kid
    2:  "John Terry ?",             // The Bulldog
    3:  "David Beckham ?",          // The Captain
    4:  "Paul Gascoigne ?",         // The Magician
    5:  "Tony Adams ?",             // The Wall
    6:  "Jamie Vardy ?",            // The Fox
    7:  "Gary Lineker ?",           // The Gentleman
    8:  "Geoff Hurst ?",            // Sir Goal
    9:  "Harry Kane ?",             // The Lion
    10: "Steven Gerrard ?",         // The Legend
    11: "David Beckham ?",          // The King
    12: "Bobby Charlton",           // The Icon
  },
  por: {
    1:  "Bernardo Silva (young) ?", // O Menino
    2:  "Pepe ?",                   // O Lobo
    3:  "Luís Figo ?",              // O Maestro
    4:  "Eusébio ?",                // A Pantera
    5:  "Nuno Gomes ?",             // O Falcão
    6:  "Rui Costa ?",              // O Leão
    7:  "Pepe ?",                   // O Capitão
    8:  "Cristiano Ronaldo ?",      // O Tigre
    9:  "Ricardo Quaresma ?",       // A Águia
    10: "Luís Figo ?",              // O Cisne
    11: "Cristiano Ronaldo ?",      // A Bala
    12: "Cristiano Ronaldo",        // O Comandante
  },
  col: {
    1:  "Radamel Falcao",           // El Tigre
    2:  "Freddy Rincón ?",          // El Tren
    3:  "Carlos Valderrama",        // El Pibe
    4:  "René Higuita",             // El Escorpión
    5:  "Faustino Asprilla ?",      // El Loco
    6:  "Mario Yepes ?",            // El Caballero
    7:  "James Rodríguez ?",        // El Rey
    8:  "Adolfo Valencia ?",        // La Bestia
    9:  "Iván Ramiro Córdoba ?",    // El Fantasma
    10: "James Rodríguez",          // El Mágico
    11: "Carlos Valderrama",        // El Peludo
    12: "Carlos Valderrama ?",      // El Ídolo
  },
  mex: {
    1:  "Hirving Lozano (young) ?", // El Chico
    2:  "Cuauhtémoc Blanco ?",      // El Rayo
    3:  "Rafael Márquez ?",         // El Guerrero
    4:  "Jorge Campos ?",           // El Bravo
    5:  "Javier Hernández ?",       // El Matador
    6:  "Cuauhtémoc Blanco",        // El Místico
    7:  "Rafael Márquez",           // El Azteca
    8:  "Hugo Sánchez ?",           // El Jefe
    9:  "Jared Borgetti ?",         // El Halcón
    10: "Antonio Carbajal ?",       // El Emperador
    11: "Hugo Sánchez",             // El Hugo
    12: "Hugo Sánchez",             // El Dios
  },
  // Non-football themes: the nickname IS the identity. These get
  // copied through as-is rather than mapped.
  usa:          "self", // food items
  us_landmarks: "self",
  mxc:          "self",
  euro:         "self",
  us_history: {
    1:  "Paul Revere",
    2:  "George Washington",
    3:  "Benjamin Franklin",
    4:  "Alexander Hamilton",
    5:  "Abraham Lincoln",
    6:  "Theodore Roosevelt",
    7:  "Dwight D. Eisenhower",
    8:  "Martin Luther King Jr.",
    9:  "Frederick Douglass ?",
    10: "Abraham Lincoln",
    11: "Washington Monument",
    12: "Statue of Liberty",
  },
  us_popstars: {
    1:  "Michael Jackson (young) ?",
    2:  "Justin Bieber ?",
    3:  "Britney Spears ?",
    4:  "Justin Timberlake ?",
    5:  "Madonna",
    6:  "Prince",
    7:  "Whitney Houston ?",
    8:  "Jay-Z ?",
    9:  "Elvis Presley",
    10: "Michael Jackson",
    11: "Elton John",
    12: "Bruce Springsteen",
  },
};

// ── Read source, parse worlds, write new CSV ─────────────────────
const txt = fs.readFileSync(
  "/home/user/slamgoal/artifacts/slamgoal/constants/worlds.ts",
  "utf8",
);
const body = txt.slice(txt.indexOf("export const WORLDS"));

const groups = {
  "World Cup":      ["superstars","bra","arg","esp","fra","ger","eng","por","col","mex"],
  "America":        ["usa","us_history","us_popstars","us_landmarks"],
  "Mexican Fiesta": ["mxc"],
  "Euro Tour":      ["euro"],
};
const themeToGroup = Object.fromEntries(
  Object.entries(groups).flatMap(([g, list]) => list.map((id) => [id, g])),
);

const unescape = (s) =>
  JSON.parse(`"${s.replace(/\\([^u])/g, "\\\\$1").replace(/"/g, `\\"`)}"`);

const worldRe =
  /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",[\s\S]*?players:\s*\[([\s\S]*?)\],\s*\},/g;
const playerRe = /\{\s*name:\s*"([^"]+)",\s*ringColor:\s*"([^"]+)"\s*\}/g;

const rows = [
  ["Group", "Theme ID", "Theme Name", "Tier", "Character", "Real-world identity", "Ring Color"],
];
let m;
while ((m = worldRe.exec(body)) !== null) {
  const [, themeId, themeName, playersBlock] = m;
  const group = themeToGroup[themeId] ?? "(unassigned)";
  const idMap = IDENTITIES[themeId];
  let p, tier = 0;
  while ((p = playerRe.exec(playersBlock)) !== null) {
    tier += 1;
    const nickname = unescape(p[1]);
    const realName =
      idMap === "self"
        ? nickname
        : idMap && idMap[tier]
          ? idMap[tier]
          : "";
    rows.push([
      group,
      themeId,
      unescape(themeName),
      tier,
      nickname,
      realName,
      p[2],
    ]);
  }
}

const csv =
  rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, `""`)}"` : s;
        })
        .join(","),
    )
    .join("\n") + "\n";

fs.writeFileSync("/home/user/slamgoal/docs/teams-and-players.csv", csv);
const unresolved = rows.filter((r, i) => i > 0 && !r[5]).length;
console.log(`rows: ${rows.length - 1}, unresolved: ${unresolved}`);

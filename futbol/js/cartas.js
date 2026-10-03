'use strict';
/* Pelotazo · cartas de Equipo Estrella: base de datos de estrellas actuales y leyendas (nombres parecidos a los reales,
   a petición del usuario), banderas, retratos dibujados, atributos de carta calculados con una fórmula y el dibujo de
   la carta (oro, plata, bronce, Figura en azul y Leyenda).
   Atributos de carta: RIT TIR PAS REG DEF FÍS (porteros: EST MAN SAQ REF VEL POS), estrellas de habilidad (1-5),
   pie malo (1-5) y pie bueno. La media de la carta sale de los atributos según el puesto (PESOS_CARTA). */

/* ---------- países y banderas ---------- */
const _h = (...c) => c.map((x, i) => `<rect y="${i * 20 / c.length}" width="30" height="${20 / c.length + .1}" fill="${x}"/>`).join('');
const _v = (...c) => c.map((x, i) => `<rect x="${i * 30 / c.length}" width="${30 / c.length + .1}" height="20" fill="${x}"/>`).join('');
const _nord = (f, c, d) => `<rect width="30" height="20" fill="${f}"/><rect x="8" width="${d ? 5 : 4}" height="20" fill="${c}"/><rect y="8" width="30" height="4" fill="${c}"/>${d ? `<rect x="9" width="2.5" height="20" fill="${d}"/><rect y="8.8" width="30" height="2.4" fill="${d}"/>` : ''}`;
const PAISES = {
  ES: ['España', _h('#c60b1e', '#ffc400', '#ffc400', '#c60b1e')], EN: ['Inglaterra', '<rect width="30" height="20" fill="#fff"/><rect x="13" width="4" height="20" fill="#ce1124"/><rect y="8" width="30" height="4" fill="#ce1124"/>'],
  FR: ['Francia', _v('#0055a4', '#fff', '#ef4135')], IT: ['Italia', _v('#009246', '#fff', '#ce2b37')], DE: ['Alemania', _h('#000', '#dd0000', '#ffce00')],
  NL: ['Países Bajos', _h('#ae1c28', '#fff', '#21468b')], PT: ['Portugal', '<rect width="12" height="20" fill="#006600"/><rect x="12" width="18" height="20" fill="#ff0000"/><circle cx="12" cy="10" r="3.6" fill="#ffcc00"/>'],
  MX: ['México', _v('#006847', '#fff', '#ce1126') + '<circle cx="15" cy="10" r="2.6" fill="#8c5a2b"/>'],
  BR: ['Brasil', '<rect width="30" height="20" fill="#009c3b"/><path d="M15 2 28 10 15 18 2 10Z" fill="#ffdf00"/><circle cx="15" cy="10" r="4.4" fill="#002776"/>'],
  AR: ['Argentina', _h('#74acdf', '#fff', '#74acdf') + '<circle cx="15" cy="10" r="2.2" fill="#f6b40e"/>'],
  BE: ['Bélgica', _v('#000', '#fdda24', '#ef3340')], NO: ['Noruega', _nord('#ba0c2f', '#fff', '#00205b')], SE: ['Suecia', _nord('#006aa7', '#fecc00')],
  DK: ['Dinamarca', _nord('#c8102e', '#fff')], PL: ['Polonia', _h('#fff', '#dc143c')], HR: ['Croacia', _h('#ff0000', '#fff', '#171796') + '<rect x="12" y="5" width="6" height="8" fill="#fff"/><path d="M12 5h2v2h-2zm4 0h2v2h-2zm-2 2h2v2h-2zm-2 2h2v2h-2zm4 0h2v2h-2zm-2 2h2v2h-2z" fill="#ff0000"/>'],
  UY: ['Uruguay', _h('#fff', '#0038a8', '#fff', '#0038a8', '#fff', '#0038a8', '#fff', '#0038a8', '#fff') + '<rect width="12" height="11" fill="#fff"/><circle cx="6" cy="5.5" r="3" fill="#fcd116"/>'],
  CO: ['Colombia', _h('#fcd116', '#fcd116', '#003893', '#ce1126')], EC: ['Ecuador', _h('#ffdd00', '#ffdd00', '#034ea2', '#ed1c24') + '<circle cx="15" cy="10" r="2.2" fill="#6b4a2a"/>'],
  EG: ['Egipto', _h('#ce1126', '#fff', '#000') + '<circle cx="15" cy="10" r="1.6" fill="#c09300"/>'], MA: ['Marruecos', '<rect width="30" height="20" fill="#c1272d"/><path d="M15 5.5l1.3 4h4.2l-3.4 2.5 1.3 4-3.4-2.5-3.4 2.5 1.3-4-3.4-2.5h4.2Z" fill="none" stroke="#006233" stroke-width=".9"/>'],
  SN: ['Senegal', _v('#00853f', '#fdef42', '#e31b23') + '<circle cx="15" cy="10" r="1.8" fill="#00853f"/>'], CI: ['Costa de Marfil', _v('#f77f00', '#fff', '#009e60')],
  CM: ['Camerún', _v('#007a5e', '#ce1126', '#fcd116') + '<circle cx="15" cy="10" r="1.6" fill="#fcd116"/>'], NG: ['Nigeria', _v('#008751', '#fff', '#008751')],
  GE: ['Georgia', '<rect width="30" height="20" fill="#fff"/><rect x="13" width="4" height="20" fill="#ff0000"/><rect y="8" width="30" height="4" fill="#ff0000"/>'],
  KR: ['Corea del Sur', '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5" fill="#cd2e3a"/><path d="M10 10a5 5 0 0 0 10 0a2.5 2.5 0 0 0-5 0a2.5 2.5 0 0 1-5 0Z" fill="#0047a0"/>'],
  JP: ['Japón', '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5.5" fill="#bc002d"/>'],
  US: ['Estados Unidos', _h('#b22234', '#fff', '#b22234', '#fff', '#b22234', '#fff', '#b22234') + '<rect width="13" height="11" fill="#3c3b6e"/>'],
  CA: ['Canadá', _v('#ff0000', '#fff', '#fff', '#ff0000') + '<path d="M15 5l1.4 3 2-1-1 4 1.6.4-4 3-4-3 1.6-.4-1-4 2 1Z" fill="#ff0000"/>'],
  SC: ['Escocia', '<rect width="30" height="20" fill="#005eb8"/><path d="M0 0 30 20M30 0 0 20" stroke="#fff" stroke-width="3.4"/>'],
  WA: ['Gales', _h('#fff', '#00b140') + '<path d="M9 13q3-6 8-4l3-2 1 3-3 1q-2 4-9 2Z" fill="#d30731"/>'],
  CH: ['Suiza', '<rect width="30" height="20" fill="#da291c"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/>'],
  TR: ['Turquía', '<rect width="30" height="20" fill="#e30a17"/><circle cx="12" cy="10" r="5" fill="#fff"/><circle cx="13.3" cy="10" r="4" fill="#e30a17"/><circle cx="18" cy="10" r="1.6" fill="#fff"/>'],
  RS: ['Serbia', _h('#c6363c', '#0c4076', '#fff')], SI: ['Eslovenia', _h('#fff', '#005da4', '#ed1c24')], HU: ['Hungría', _h('#ce2939', '#fff', '#477050')],
  UA: ['Ucrania', _h('#0057b7', '#ffd700')], BG: ['Bulgaria', _h('#fff', '#00966e', '#d62612')], RO: ['Rumanía', _v('#002b7f', '#fcd116', '#ce1126')],
  RU: ['Rusia', _h('#fff', '#0039a6', '#d52b1e')], LR: ['Liberia', _h('#bf0a30', '#fff', '#bf0a30', '#fff', '#bf0a30', '#fff') + '<rect width="10" height="10" fill="#002868"/><circle cx="5" cy="5" r="2" fill="#fff"/>'],
  DZ: ['Argelia', _v('#006233', '#fff') + '<circle cx="15" cy="10" r="4" fill="#d21034"/><circle cx="16.3" cy="10" r="3.3" fill="#fff"/>'], GN: ['Guinea', _v('#ce1126', '#fcd116', '#009460')],
  GR: ['Grecia', _h('#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf') + '<rect width="11" height="11" fill="#0d5eaf"/><rect x="4.4" width="2.2" height="11" fill="#fff"/><rect y="4.4" width="11" height="2.2" fill="#fff"/>'],
  NIR: ['Irlanda del Norte', '<rect width="30" height="20" fill="#fff"/><rect x="13" width="4" height="20" fill="#ce1124"/><rect y="8" width="30" height="4" fill="#ce1124"/><circle cx="15" cy="10" r="2.6" fill="#fff"/><circle cx="15" cy="10" r="1.6" fill="#ce1124"/>'],
  IE: ['Irlanda', _v('#169b62', '#fff', '#ff883e')], CL: ['Chile', _h('#fff', '#d52b1e') + '<rect width="10" height="10" fill="#0039a6"/><circle cx="5" cy="5" r="1.8" fill="#fff"/>'],
  PY: ['Paraguay', _h('#d52b1e', '#fff', '#0038a8') + '<circle cx="15" cy="10" r="1.6" fill="none" stroke="#0038a8" stroke-width=".5"/>'], PE: ['Perú', _v('#d91023', '#fff', '#d91023')],
  GH: ['Ghana', _h('#ce1126', '#fcd116', '#006b3f') + '<path d="M15 7.6l.8 2.2h2.3l-1.9 1.4.7 2.2-1.9-1.4-1.9 1.4.7-2.2-1.9-1.4h2.3Z" fill="#000"/>'], GA: ['Gabón', _h('#009e60', '#fcd116', '#3a75c4')],
  SK: ['Eslovaquia', _h('#fff', '#0b4ea2', '#ee1c25') + '<path d="M8 5h6v6q0 3-3 4.5Q8 14 8 11Z" fill="#ee1c25" stroke="#fff" stroke-width=".6"/>'],
  CZ: ['Chequia', _h('#fff', '#d7141a') + '<path d="M0 0 13 10 0 20Z" fill="#11457e"/>'],
};
const nombrePais = c => (PAISES[c] && PAISES[c][0]) || (typeof NACIONES !== 'undefined' && NACIONES[c] && NACIONES[c].nombre) || c;
const banderaSVG = c => `<svg class="bandera" viewBox="0 0 30 20" aria-label="${esc(nombrePais(c))}">${PAISES[c] ? PAISES[c][1] : '<rect width="30" height="20" fill="#888"/>'}</svg>`;

/* ---------- clubes de fuera de las 8 ligas (para las estrellas que juegan allí) ---------- */
const CLUBES_EXTRA = {
  'Inter Miami': ['MIA', 0xf7b5cd, 0x231f20], 'Al Nassr': ['NAS', 0xfcd116, 0x1d3f91], 'Al Hilal': ['HIL', 0x1b4f9c, 0xf5f5f5], 'Al Ittihad': ['ITT', 0xf5d000, 0x111111],
  'Al Ahli': ['AHL', 0x0b7a3e, 0xf5f5f5], 'Santos': ['SAN', 0xf5f5f5, 0x111111], 'Galatasaray': ['GS', 0xa90432, 0xfdb912], 'Fenerbahçe': ['FB', 0xfde100, 0x163962],
  'LAFC': ['LAF', 0x111111, 0xc39e6d], 'Vancouver Whitecaps': ['VAN', 0xf5f5f5, 0x00245d], 'Rosario Central': ['RCE', 0x00338d, 0xf9d400], 'San Diego FC': ['SDF', 0x0a1d36, 0x8fb5e0],
  'Boca Juniors': ['BOC', 0x0b3c8c, 0xf6c200], 'Colo-Colo': ['CC', 0xf5f5f5, 0x111111], 'Fluminense': ['FLU', 0x8a1538, 0x006b3f],
  'Leyendas': ['LEY', 0x1b1b1b, 0xd4aa46],
};
// el club de una carta: el de la base de datos si existe; si no, uno de fuera (con insignia de colores)
function clubCarta(nombre) {
  const M = APP.mundo, c = M && M.clubes.find(x => x.nombre === nombre);
  if (c) return c;
  const e = CLUBES_EXTRA[nombre] || ['???', 0x888888, 0x222222];
  return { nombre, corto: e[0], camiseta: e[1], camiseta2: e[2], pantalon: e[2], liga: nombre === 'Leyendas' ? 'leyenda' : 'otras' };
}

/* ---------- fórmula de atributos ---------- */
const STATS_CAMPO = [['rit', 'RIT'], ['tir', 'TIR'], ['pas', 'PAS'], ['reg', 'REG'], ['def', 'DEF'], ['fis', 'FÍS']];
const STATS_POR = [['est', 'EST'], ['man', 'MAN'], ['saq', 'SAQ'], ['ref', 'REF'], ['vel', 'VEL'], ['col', 'POS']];
// cuánto se separa cada atributo de la media según el puesto
const PERFIL_CARTA = {
  DC: { rit: 1, tir: 4, pas: -9, reg: -1, def: -50, fis: -2 }, EI: { rit: 5, tir: -3, pas: -5, reg: 3, def: -52, fis: -16 }, ED: { rit: 5, tir: -3, pas: -5, reg: 3, def: -52, fis: -16 },
  MI: { rit: 3, tir: -6, pas: 0, reg: 1, def: -36, fis: -12 }, MD: { rit: 3, tir: -6, pas: 0, reg: 1, def: -36, fis: -12 },
  MCO: { rit: -5, tir: -2, pas: 2, reg: 3, def: -38, fis: -16 }, MC: { rit: -10, tir: -9, pas: 2, reg: -1, def: -13, fis: -5 }, MCD: { rit: -15, tir: -17, pas: -3, reg: -9, def: 1, fis: 0 },
  LD: { rit: 2, tir: -28, pas: -7, reg: -5, def: -2, fis: -6 }, LI: { rit: 2, tir: -28, pas: -7, reg: -5, def: -2, fis: -6 }, DFC: { rit: -13, tir: -38, pas: -19, reg: -23, def: 2, fis: 1 },
  POR: { est: 1, man: -2, saq: -12, ref: 2, vel: -34, col: 0 },
};
// qué atributos cuentan para la media en cada puesto
const PESOS_CARTA = {
  DC: { tir: .45, rit: .2, reg: .15, fis: .1, pas: .1 }, EI: { rit: .3, reg: .35, tir: .2, pas: .15 }, ED: { rit: .3, reg: .35, tir: .2, pas: .15 },
  MI: { rit: .25, reg: .3, pas: .3, tir: .15 }, MD: { rit: .25, reg: .3, pas: .3, tir: .15 },
  MCO: { pas: .35, reg: .35, tir: .2, rit: .1 }, MC: { pas: .45, reg: .2, def: .15, tir: .1, fis: .1 }, MCD: { def: .4, pas: .3, fis: .2, reg: .1 },
  LD: { def: .4, rit: .25, pas: .2, fis: .15 }, LI: { def: .4, rit: .25, pas: .2, fis: .15 }, DFC: { def: .6, fis: .25, rit: .1, pas: .05 },
  POR: { est: .25, man: .2, ref: .25, col: .25, saq: .05 },
};
// estilos de juego: se suman al perfil del puesto
const ARQUETIPOS = {
  velocista: { rit: 7, reg: 1, fis: -3 }, regateador: { reg: 6, rit: 2, fis: -6, pas: 1 }, rematador: { tir: 5, fis: 3, rit: -3 }, tanque: { fis: 9, rit: -4, reg: -4, tir: 2 },
  pasador: { pas: 7, rit: -4, reg: 1 }, creador: { pas: 5, reg: 4, fis: -5 }, muro: { def: 3, fis: 6, rit: -3 }, motor: { fis: 6, def: 5, rit: 1 },
  carrilero: { rit: 5, pas: 3, def: -2 }, lider: { def: 2, pas: 3, fis: 2 }, completo: {}, barredor: { vel: 16, saq: 10 }, felino: { ref: 4, est: 3, col: -2 },
};
const _hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// atributos de una carta a partir de la media, el puesto y el estilo; luego se ajustan para que la media cuadre
function statsCarta(pos, med, arq, semilla) {
  const P = PERFIL_CARTA[pos] || PERFIL_CARTA.MC, A = ARQUETIPOS[arq] || {}, W = PESOS_CARTA[pos] || PESOS_CARTA.MC, st = {};
  let h = _hash(semilla + pos);
  const ruido = () => { h = Math.imul(h ^ h >>> 13, 1274126177) >>> 0; return (h % 7) - 3; };
  for (const k in P) st[k] = med + P[k] + (A[k] || 0) + ruido();
  for (let i = 0; i < 8; i++) {
    let m = 0; for (const k in W) m += clamp(st[k], 20, 99) * W[k];
    const d = med - m; if (Math.abs(d) < .5) break;
    for (const k in W) st[k] += d;
  }
  for (const k in st) st[k] = Math.round(clamp(st[k], 15, 99));
  return st;
}
const mediaCarta = (pos, st) => { const W = PESOS_CARTA[pos] || PESOS_CARTA.MC; let m = 0; for (const k in W) m += st[k] * W[k]; return Math.round(m); };
const habPorRegate = (reg, pos) => pos === 'POR' ? 1 : reg >= 90 ? 5 : reg >= 83 ? 4 : reg >= 72 ? 3 : reg >= 58 ? 2 : 1;
// atributos para el motor del partido (vel, tir, pas, reg, def, par)
function atribMotor(pos, st) {
  if (pos === 'POR') return { vel: st.vel, tir: 25, pas: st.saq, reg: 30, def: 35, par: Math.round((st.est + st.man + st.ref + st.col) / 4) };
  return { vel: st.rit, tir: st.tir, pas: st.pas, reg: st.reg, def: st.def, par: 15 };
}

/* ---------- la base de datos de estrellas ----------
   'Nombre corto|Nombre completo|país|puesto|media|club|estilo|habilidad|pie malo|pie|piel 0-5|pelo|peinado|barba|dorsal|figura'
   pelo: n negro, o castaño oscuro, c castaño, r rubio, p pelirrojo, g canoso, b platino
   peinado: corto rapado peinado largo coleta moño rizado afro calvo cresta trenzas · barba: - corta larga perilla bigote sombra
   figura = 1: también tiene carta Figura (azul) con +3 */
const ESTRELLAS_TXT = `
Mbapé|Kilian Mbapé|FR|DC|91|Real Madrid|velocista|5|4|D|4|n|rapado|-|9|1
Halland|Erling Halland|NO|DC|91|Manchester City|rematador|3|3|I|0|r|moño|-|9|1
Bellinham|Jude Bellinham|EN|MCO|90|Real Madrid|completo|4|4|D|3|n|corto|-|5|1
Vinicio Jr.|Vinicio Júnior|BR|EI|90|Real Madrid|regateador|5|4|D|4|n|rizado|-|7|1
Rodry|Rodrigo Hernando|ES|MCD|90|Manchester City|pasador|3|4|D|1|o|corto|corta|16|1
Salaj|Mohamed Salaj|EG|ED|89|Liverpool|velocista|4|3|I|2|n|afro|corta|11|1
Dembelé|Usman Dembelé|FR|ED|90|Paris Saint-Germain|regateador|5|5|D|4|n|rizado|sombra|10|1
Kein|Harry Kein|EN|DC|90|Bayern München|rematador|3|4|D|0|c|corto|sombra|9|1
Yamall|Lamin Yamall|ES|ED|89|FC Barcelona|regateador|5|4|I|3|n|rizado|-|10|1
Rafiña|Rafiña Días|BR|EI|89|FC Barcelona|regateador|5|4|I|1|r|peinado|-|11|1
Van Dyk|Virgil van Dyk|NL|DFC|89|Liverpool|lider|2|3|D|4|n|rapado|corta|4|1
Valverdi|Federico Valverdi|UY|MC|88|Real Madrid|motor|3|4|D|1|o|corto|corta|8|1
Vitiña|Vitiña Ferreyra|PT|MC|88|Paris Saint-Germain|pasador|4|4|D|1|o|corto|-|17|1
Pedry|Pedro González|ES|MC|88|FC Barcelona|creador|4|4|D|1|n|corto|-|8|1
Wirz|Florian Wirz|DE|MCO|88|Liverpool|creador|4|4|D|0|c|corto|-|7|1
Musiela|Jamal Musiela|DE|MCO|88|Bayern München|regateador|5|4|D|3|n|rizado|-|10|1
Martinés|Lautaro Martinés|AR|DC|88|Inter|rematador|4|3|D|1|n|corto|corta|10|1
Curtois|Thibault Curtois|BE|POR|89|Real Madrid|felino|1|3|I|0|c|corto|-|1|1
Alison|Alison Beker|BR|POR|88|Liverpool|felino|1|3|D|1|c|corto|larga|1|1
Sakka|Bukayo Sakka|EN|ED|88|Arsenal|regateador|4|3|I|4|n|rapado|-|7|1
Fernándes|Bruno Fernándes|PT|MCO|87|Manchester United|pasador|4|4|D|1|o|corto|corta|8|1
Lewandoski|Robert Lewandoski|PL|DC|87|FC Barcelona|rematador|4|4|D|0|c|corto|-|9|0
Kvaratskelia|Khvicha Kvaratskelia|GE|EI|87|Paris Saint-Germain|regateador|5|4|D|0|c|largo|-|7|1
Hakimy|Ashraf Hakimy|MA|LD|87|Paris Saint-Germain|velocista|4|3|D|2|n|corto|-|2|1
Méndez|Nuno Méndez|PT|LI|87|Paris Saint-Germain|carrilero|4|3|I|4|n|rizado|-|25|1
Kimich|Joshua Kimich|DE|MCD|87|Bayern München|pasador|3|4|D|0|r|corto|-|6|0
Odegard|Martin Odegard|NO|MCO|87|Arsenal|creador|4|4|I|0|c|peinado|-|8|0
Raice|Declan Raice|EN|MCD|87|Arsenal|motor|3|3|D|0|c|corto|-|41|0
Fodden|Phil Fodden|EN|MCO|87|Manchester City|regateador|4|3|I|0|c|corto|-|47|0
Palmar|Cole Palmar|EN|MCO|87|Chelsea|creador|4|3|I|0|p|corto|-|10|1
Olisé|Michael Olisé|FR|ED|87|Bayern München|regateador|4|3|I|4|n|trenzas|-|17|0
Salibá|William Salibá|FR|DFC|87|Arsenal|muro|2|3|D|4|n|rapado|-|2|0
Díaz|Rúben Díaz|PT|DFC|87|Manchester City|lider|2|3|D|0|o|corto|corta|3|0
Rudiger|Antonio Rudiger|DE|DFC|86|Real Madrid|muro|2|3|D|4|n|rapado|corta|22|0
Magaláes|Gabriel Magaláes|BR|DFC|86|Arsenal|muro|2|3|I|1|n|corto|corta|6|0
Izak|Alexander Izak|SE|DC|87|Liverpool|regateador|4|4|D|4|n|corto|-|9|0
Álbarez|Julian Álbarez|AR|DC|87|Atlético de Madrid|completo|4|4|D|0|c|corto|-|19|0
Osimen|Víctor Osimen|NG|DC|86|Galatasaray|rematador|4|3|D|5|r|cresta|-|45|0
McAlister|Alexis McAlister|AR|MC|87|Liverpool|pasador|3|4|D|0|r|largo|-|10|0
Barela|Nicolo Barela|IT|MC|87|Inter|motor|3|3|D|0|n|corto|corta|23|0
Calhanoglú|Hakan Calhanoglú|TR|MCD|86|Inter|pasador|3|5|D|0|n|corto|corta|20|0
Bastonni|Alessandro Bastonni|IT|DFC|86|Inter|muro|2|3|I|0|c|corto|sombra|95|0
Donarrumma|Gianluigi Donarrumma|IT|POR|88|Manchester City|felino|1|3|D|0|n|corto|corta|99|0
Maignán|Mike Maignán|FR|POR|87|Milan|felino|1|3|D|4|n|rapado|corta|16|0
Martines|Emiliano Martines|AR|POR|86|Aston Villa|felino|1|3|D|1|o|corto|corta|23|0
Oblac|Jan Oblac|SI|POR|87|Atlético de Madrid|felino|1|3|D|0|c|corto|sombra|13|0
Noyer|Manuel Noyer|DE|POR|86|Bayern München|barredor|1|4|D|0|r|corto|-|1|0
Rayá|David Rayá|ES|POR|86|Arsenal|barredor|1|3|D|1|n|corto|corta|22|0
Ter Stegan|Marc-André ter Stegan|DE|POR|86|FC Barcelona|felino|1|3|D|0|r|corto|corta|1|0
Kosta|Diogo Kosta|PT|POR|85|FC Porto|felino|1|3|D|1|o|corto|corta|99|0
Ronalldo|Cristiano Ronalldo|PT|DC|86|Al Nassr|rematador|5|4|D|1|n|peinado|-|7|1
Messio|Lionel Messio|AR|ED|88|Inter Miami|creador|4|4|I|1|o|largo|corta|10|1
Neimar Jr.|Neimar da Silva|BR|EI|84|Santos|regateador|5|5|D|1|o|cresta|corta|10|1
Suáres|Luis Suáres|UY|DC|82|Inter Miami|rematador|4|4|D|1|n|corto|sombra|9|0
Benzemá|Karim Benzemá|FR|DC|85|Al Ittihad|rematador|4|4|D|2|n|rapado|corta|9|0
Kantí|Ngolo Kantí|FR|MCD|84|Al Ittihad|motor|2|3|D|5|n|calvo|-|7|0
Mané|Sadyo Mané|SN|EI|83|Al Nassr|velocista|4|4|D|5|n|rapado|sombra|10|0
Marez|Riyad Marez|DZ|ED|83|Al Ahli|regateador|4|3|I|3|n|rizado|sombra|7|0
Hernándes|Teo Hernándes|FR|LI|85|Al Hilal|carrilero|4|3|I|1|c|corto|corta|3|0
Bruno Guimarais|Bruno Guimarais|BR|MC|86|Newcastle United|pasador|4|3|D|2|n|corto|corta|39|0
Soboszlai|Dominik Soboszlai|HU|MCO|85|Liverpool|completo|4|4|D|0|r|peinado|-|8|0
Díez|Luis Díez|CO|EI|86|Bayern München|regateador|4|3|D|3|n|rizado|-|14|0
Gapko|Cody Gapko|NL|EI|85|Liverpool|completo|4|4|D|3|n|corto|-|18|0
Fernándes E.|Enzo Fernándes|AR|MC|85|Chelsea|pasador|3|4|D|0|c|largo|-|8|0
Caisedo|Moisés Caisedo|EC|MCD|86|Chelsea|motor|3|3|D|4|n|corto|-|25|0
Cucurela|Marc Cucurela|ES|LI|84|Chelsea|motor|3|3|I|1|o|largo|-|3|0
Zubimendy|Martín Zubimendy|ES|MCD|86|Arsenal|pasador|3|3|D|0|n|corto|-|36|0
Merinno|Mikel Merinno|ES|MC|84|Arsenal|completo|3|3|I|1|c|corto|-|23|0
Gyokeres|Viktor Gyokeres|SE|DC|86|Arsenal|tanque|3|3|D|1|o|corto|-|14|0
Haverts|Kai Haverts|DE|DC|84|Arsenal|completo|3|3|I|0|c|corto|-|29|0
Gvardiól|Josko Gvardiól|HR|DFC|85|Manchester City|completo|3|3|I|0|c|corto|-|24|0
Sylva|Bernardo Sylva|PT|MC|86|Manchester City|creador|4|3|I|1|n|corto|corta|20|0
Lisandro|Lisandro Martinés|AR|DFC|84|Manchester United|lider|2|3|I|0|c|largo|corta|6|0
Casemyro|Casemyro Silva|BR|MCD|82|Manchester United|muro|2|3|D|3|n|rapado|-|18|0
Watkings|Ollie Watkings|EN|DC|84|Aston Villa|rematador|3|3|D|3|n|rapado|-|11|0
Van der Ven|Micky van der Ven|NL|DFC|84|Tottenham Hotspur|velocista|2|3|I|0|r|corto|-|37|0
Symons|Xavi Symons|NL|MCO|84|Tottenham Hotspur|regateador|5|4|D|2|n|rizado|-|7|0
Grialish|Jack Grialish|EN|EI|82|Everton|regateador|4|3|D|0|c|peinado|sombra|18|0
Rodrygho|Rodrygho Goés|BR|ED|85|Real Madrid|regateador|5|4|D|3|n|corto|-|11|0
Kamavinga|Eduardo Kamavinga|FR|MC|85|Real Madrid|motor|4|3|I|5|n|trenzas|-|6|0
Chuameni|Aurelien Chuameni|FR|MCD|85|Real Madrid|muro|3|3|D|4|n|rapado|-|14|0
Militón|Éder Militón|BR|DFC|85|Real Madrid|velocista|2|3|D|3|n|rapado|-|3|0
Carbajal|Dani Carbajal|ES|LD|85|Real Madrid|lider|3|3|D|1|o|corto|corta|2|0
Alexander-Arnald|Trent Alexander-Arnald|EN|LD|86|Real Madrid|pasador|3|4|D|2|n|corto|-|12|0
Gúler|Arda Gúler|TR|MCO|83|Real Madrid|creador|4|4|I|0|c|largo|-|15|0
Endryck|Endryck Sousa|BR|DC|80|Real Madrid|rematador|4|3|I|3|n|rapado|-|16|0
De Yong|Frenkie de Yong|NL|MC|86|FC Barcelona|pasador|4|3|D|0|c|largo|-|21|0
Kundé|Jules Kundé|FR|LD|85|FC Barcelona|velocista|3|3|D|4|n|rizado|-|23|0
Araujó|Ronald Araujó|UY|DFC|84|FC Barcelona|muro|2|3|D|3|n|corto|-|4|0
Cubarzí|Pau Cubarzí|ES|DFC|84|FC Barcelona|pasador|2|3|D|0|c|corto|-|5|0
Olmos|Dani Olmos|ES|MCO|85|FC Barcelona|creador|4|4|D|1|n|corto|-|20|0
Gavy|Pablo Gavy|ES|MC|84|FC Barcelona|motor|4|3|D|1|n|largo|-|6|0
Baldé|Alex Baldé|ES|LI|82|FC Barcelona|velocista|3|3|I|4|n|rizado|-|3|0
Rashfort|Marcus Rashfort|EN|EI|82|FC Barcelona|velocista|4|4|D|4|n|corto|-|14|0
Niko Williams|Niko Williams|ES|EI|86|Athletic Club|velocista|5|3|D|4|n|corto|-|10|0
Simó|Unai Simó|ES|POR|85|Athletic Club|felino|1|3|D|0|n|corto|sombra|1|0
Grizman|Antoine Grizman|FR|DC|86|Atlético de Madrid|completo|4|4|I|0|r|corto|corta|7|0
Barkola|Bradley Barkola|FR|EI|84|Paris Saint-Germain|velocista|4|3|D|4|n|rizado|-|29|0
Nevez|Joao Nevez|PT|MC|86|Paris Saint-Germain|motor|4|4|D|0|n|largo|-|87|0
Dué|Desiré Dué|FR|ED|84|Paris Saint-Germain|regateador|5|4|D|4|n|corto|-|14|0
Marquiños|Marquiños Correa|BR|DFC|86|Paris Saint-Germain|lider|2|3|D|1|o|corto|-|5|0
Ruis|Fabián Ruis|ES|MC|85|Paris Saint-Germain|pasador|3|3|I|1|o|corto|corta|8|0
Upamekano|Dayot Upamekano|FR|DFC|84|Bayern München|muro|2|3|D|4|n|rapado|-|2|0
Davis|Alfonso Davis|CA|LI|84|Bayern München|velocista|4|3|I|4|n|rapado|-|19|0
Müler T.|Tomas Müler|DE|MCO|82|Vancouver Whitecaps|completo|3|4|D|0|c|corto|-|13|0
Guirasi|Serhou Guirasi|GN|DC|85|Borussia Dortmund|rematador|3|3|D|4|n|rapado|corta|9|0
Leon|Rafael Leon|PT|EI|85|Milan|velocista|5|3|D|4|n|trenzas|-|10|0
Pulisich|Christian Pulisich|US|ED|85|Milan|regateador|4|4|D|0|c|corto|-|11|0
Modrich|Luka Modrich|HR|MC|86|Milan|creador|4|4|D|0|r|largo|-|14|0
Jiménez S.|Santi Jiménez|MX|DC|81|Milan|rematador|3|3|D|1|c|peinado|-|7|0
MacTominay|Scott MacTominay|SC|MC|85|Napoli|motor|3|3|D|0|r|corto|-|8|0
Lukaku|Romelo Lukaku|BE|DC|83|Napoli|tanque|3|3|I|4|n|rapado|-|11|0
De Bruine|Kevin De Bruine|BE|MC|88|Napoli|pasador|4|5|D|0|p|corto|-|11|1
Lukman|Ademola Lukman|NG|EI|85|Atalanta|regateador|4|3|D|4|n|corto|-|11|0
Vlajovic|Dusan Vlajovic|RS|DC|83|Juventus|rematador|3|3|I|0|n|largo|-|9|0
Yildís|Kenan Yildís|TR|EI|83|Juventus|regateador|5|4|D|0|n|corto|-|10|0
Dibala|Paulo Dibala|AR|MCO|83|Roma|creador|4|4|I|1|n|corto|corta|21|0
Turam|Markus Turam|FR|DC|85|Inter|tanque|3|3|D|4|n|rapado|-|9|0
Shick|Patrik Shick|CZ|DC|82|Bayer Leverkusen|rematador|3|3|I|0|c|corto|-|14|0
Otamendy|Nicolás Otamendy|AR|DFC|80|Benfica|lider|2|3|D|1|n|corto|larga|30|0
Pavlidís|Vangelis Pavlidís|GR|DC|81|Benfica|rematador|3|3|D|0|n|corto|corta|14|0
Agejowa|Samu Agejowa|ES|DC|81|FC Porto|tanque|3|3|D|5|n|rapado|-|9|0
Julmand|Morten Julmand|DK|MCD|82|Sporting CP|motor|2|3|D|0|r|corto|corta|42|0
Trinkão|Francisco Trinkão|PT|ED|81|Sporting CP|regateador|4|3|I|1|n|corto|-|17|0
Ramós|Sergio Ramós|ES|DFC|82|Monterrey|lider|3|3|D|1|n|peinado|corta|93|1
Rodrígues J.|James Rodrígues|CO|MCO|80|León|creador|4|4|I|1|n|corto|corta|10|0
Ocampo|Lucas Ocampo|AR|ED|79|Monterrey|regateador|4|3|D|1|n|corto|sombra|11|0
Canalles|Sergio Canalles|ES|MCO|80|Monterrey|creador|4|4|I|0|c|corto|corta|10|0
Ginyac|André-Pierre Ginyac|FR|DC|78|Tigres UANL|rematador|3|4|D|1|c|calvo|larga|10|0
Correya|Ángel Correya|AR|DC|79|Tigres UANL|regateador|4|3|D|1|n|corto|-|11|0
Martín H.|Henry Martín|MX|DC|77|América|rematador|3|3|D|2|n|corto|corta|21|0
Álbarez E.|Edson Álbarez|MX|MCD|80|Fenerbahçe|muro|2|3|D|1|o|corto|-|4|0
Giménez R.|Raúl Giménez|MX|DC|79|Fulham|rematador|3|3|D|1|n|moño|corta|7|0
Losano|Irving Losano|MX|EI|78|San Diego FC|velocista|4|3|D|2|n|corto|-|11|0
Ochoá|Memo Ochoá|MX|POR|76|América|felino|1|3|D|1|n|afro|-|13|0
Son|Son Heung-mín|KR|EI|85|LAFC|velocista|4|5|D|1|n|corto|-|7|0
Di Marea|Ángel Di Marea|AR|ED|82|Rosario Central|regateador|4|3|I|0|c|largo|-|11|0
Sanné|Leroy Sanné|DE|ED|84|Galatasaray|velocista|4|3|I|4|n|rapado|-|10|0
Gundogán|Ilkay Gundogán|DE|MC|83|Galatasaray|pasador|3|4|D|1|n|corto|corta|20|0
Edersson|Edersson Moraes|BR|POR|86|Fenerbahçe|barredor|1|4|I|1|n|rapado|corta|31|0
Núñes|Darwin Núñes|UY|DC|82|Al Hilal|rematador|3|3|D|2|n|corto|-|9|0
Mastantono|Franco Mastantono|AR|ED|78|Real Madrid|regateador|4|3|I|1|n|corto|-|30|0
Huysen|Dean Huysen|ES|DFC|82|Real Madrid|pasador|2|3|D|0|c|corto|-|24|0
Carrera|Álvaro Carrera|ES|LI|80|Real Madrid|carrilero|3|3|I|0|c|corto|-|18|0
Brahim|Brahim Dias|ES|MCO|81|Real Madrid|regateador|4|3|D|2|n|corto|corta|21|0
Asensio R.|Raúl Asensio|ES|DFC|79|Real Madrid|muro|2|3|D|0|n|corto|-|35|0
Mendi|Ferland Mendi|FR|LI|82|Real Madrid|velocista|3|3|I|4|n|rapado|-|23|0
Fermín|Fermín Lopes|ES|MCO|82|FC Barcelona|completo|3|3|D|1|n|corto|-|16|0
Tores|Ferran Tores|ES|DC|82|FC Barcelona|rematador|3|4|D|0|c|corto|-|7|0
Garsía E.|Eric Garsía|ES|DFC|80|FC Barcelona|pasador|2|3|D|0|n|corto|-|24|0
Garsía J.|Joan Garsía|ES|POR|83|FC Barcelona|felino|1|3|D|0|c|corto|-|13|0
Koque|Jorge Koque|ES|MC|81|Atlético de Madrid|pasador|3|4|D|0|n|corto|corta|6|0
Simeoni|Giuliano Simeoni|AR|ED|81|Atlético de Madrid|motor|3|3|D|1|n|largo|-|20|0
Sorlot|Alexander Sorlot|NO|DC|82|Atlético de Madrid|tanque|3|3|D|0|r|largo|-|9|0
Le Normán|Robin Le Normán|ES|DFC|82|Atlético de Madrid|muro|2|3|D|0|c|corto|corta|24|0
Lorente|Marcos Lorente|ES|LD|82|Atlético de Madrid|motor|3|3|D|0|c|corto|-|14|0
Baenna|Alex Baenna|ES|MCO|83|Atlético de Madrid|creador|4|4|I|0|n|corto|-|10|0
Almadá|Thiago Almadá|AR|MCO|80|Atlético de Madrid|regateador|4|4|D|1|n|corto|-|11|0
Wiliams I.|Iñaki Wiliams|GH|DC|81|Athletic Club|velocista|3|3|D|5|n|corto|corta|9|0
Sanset|Oihan Sanset|ES|MCO|81|Athletic Club|creador|4|3|D|0|c|corto|-|8|0
Oyarsabal|Mikel Oyarsabal|ES|DC|83|Real Sociedad|completo|3|4|I|0|c|corto|-|10|0
Kubbo|Take Kubbo|JP|ED|81|Real Sociedad|regateador|4|3|I|0|n|corto|-|14|0
Morenno|Gerard Morenno|ES|DC|80|Villarreal|rematador|3|4|D|1|n|corto|corta|7|0
Parejjo|Dani Parejjo|ES|MC|81|Villarreal|pasador|3|4|D|0|n|corto|-|10|0
Pepe N.|Nicolás Pepe|CI|ED|79|Villarreal|regateador|4|3|I|4|n|trenzas|-|19|0
Iskó|Francisco Iskó|ES|MCO|84|Real Betis|creador|5|4|D|1|n|corto|larga|22|1
Antonny|Antonny Santos|BR|ED|80|Real Betis|regateador|5|3|I|3|n|corto|-|7|0
Lo Selso|Gio Lo Selso|AR|MC|81|Real Betis|pasador|4|4|I|0|c|largo|-|20|0
Aspás|Iago Aspás|ES|DC|79|Celta de Vigo|completo|4|4|I|0|c|corto|corta|10|0
Mamardashvily|Giorgi Mamardashvily|GE|POR|82|Liverpool|felino|1|3|D|0|n|corto|-|25|0
Dokku|Jeremy Dokku|BE|EI|82|Manchester City|regateador|5|3|D|4|n|rapado|-|11|0
Reinders|Tijani Reinders|NL|MC|84|Manchester City|completo|3|4|D|2|n|corto|-|4|0
Cherky|Rayan Cherky|FR|MCO|81|Manchester City|regateador|5|5|D|2|n|corto|-|10|0
Marmush|Omar Marmush|EG|DC|83|Manchester City|completo|4|4|D|2|n|corto|corta|7|0
Stons|John Stons|EN|DFC|82|Manchester City|pasador|2|3|D|0|c|corto|-|5|0
Saviño|Saviño Moreyra|BR|ED|80|Manchester City|regateador|4|3|I|2|n|rizado|-|26|0
Aït-Nuri|Rayan Aït-Nuri|DZ|LI|81|Manchester City|carrilero|4|3|I|3|n|rizado|-|21|0
Konatté|Ibrahima Konatté|FR|DFC|85|Liverpool|muro|2|3|D|5|n|rapado|corta|5|0
Frimpon|Jeremie Frimpon|NL|LD|83|Liverpool|velocista|4|3|D|4|n|rizado|-|30|0
Kerkés|Milos Kerkés|HU|LI|81|Liverpool|carrilero|3|3|I|0|n|corto|-|6|0
Gravenberg|Ryan Gravenberg|NL|MCD|85|Liverpool|completo|3|3|D|4|n|trenzas|-|38|0
Equitiké|Hugo Equitiké|FR|DC|83|Liverpool|regateador|4|3|D|4|n|rapado|-|22|0
Robertsón|Andy Robertsón|SC|LI|82|Liverpool|carrilero|3|3|I|0|c|corto|corta|26|0
Endó|Wataru Endó|JP|MCD|78|Liverpool|muro|2|3|D|1|n|corto|-|3|0
Trosard|Leandro Trosard|BE|EI|82|Arsenal|completo|4|5|D|0|c|corto|corta|19|0
Martinely|Gabriel Martinely|BR|EI|82|Arsenal|velocista|4|3|D|1|n|corto|-|11|0
Timbre|Jurriën Timbre|NL|LD|84|Arsenal|completo|3|3|D|4|n|corto|-|12|0
Califiori|Riccardo Califiori|IT|DFC|82|Arsenal|pasador|2|3|I|0|c|largo|-|33|0
Whyte|Ben Whyte|EN|LD|82|Arsenal|muro|2|3|D|0|c|corto|-|4|0
Ezé|Eberechi Ezé|EN|MCO|84|Arsenal|regateador|5|4|D|4|n|rapado|-|10|1
Madueque|Noni Madueque|EN|ED|80|Arsenal|regateador|4|3|I|4|n|corto|-|20|0
Jeims|Reece Jeims|EN|LD|83|Chelsea|completo|3|4|D|3|n|corto|corta|24|0
Netto|Pedro Netto|PT|EI|82|Chelsea|velocista|4|3|I|1|n|corto|-|7|0
Pedriño|Joao Pedriño|BR|DC|82|Chelsea|regateador|4|3|D|2|n|rizado|-|20|0
Garnaccho|Alejandro Garnaccho|AR|EI|80|Chelsea|velocista|4|3|D|0|n|largo|-|49|0
Sanches R.|Robert Sanches|ES|POR|80|Chelsea|barredor|1|3|D|0|n|corto|-|1|0
Estevinho|Estevinho Willian|BR|ED|78|Chelsea|regateador|5|4|I|2|n|rizado|-|41|0
Mbeumó|Bryan Mbeumó|CM|ED|83|Manchester United|completo|4|4|I|5|n|rapado|corta|19|0
Cuña|Matheus Cuña|BR|MCO|82|Manchester United|regateador|4|4|D|2|n|rizado|corta|10|0
Sesko|Benjamin Sesko|SI|DC|81|Manchester United|tanque|3|3|D|0|c|corto|-|30|0
Mainú|Kobbie Mainú|EN|MC|79|Manchester United|regateador|4|3|D|4|n|rizado|-|37|0
Dalott|Diogo Dalott|PT|LD|80|Manchester United|carrilero|3|3|D|0|n|corto|corta|2|0
De Licht|Matthijs de Licht|NL|DFC|81|Manchester United|muro|2|3|D|0|r|corto|-|4|0
Onanna|André Onanna|CM|POR|80|Manchester United|barredor|1|3|D|5|n|calvo|-|24|0
Gorden|Anthony Gorden|EN|EI|82|Newcastle United|velocista|4|3|D|0|c|peinado|-|10|0
Tonalli|Sandro Tonalli|IT|MC|84|Newcastle United|motor|3|3|D|0|c|largo|-|8|0
Joelintón|Joelintón Cassio|BR|MC|81|Newcastle United|tanque|3|3|D|3|n|rapado|corta|7|0
Poppe|Nick Poppe|EN|POR|82|Newcastle United|felino|1|3|D|0|c|corto|-|22|0
Romeró|Cristian Romeró|AR|DFC|84|Tottenham Hotspur|muro|2|3|D|1|n|corto|corta|17|0
Kudús|Mohammed Kudús|GH|ED|82|Tottenham Hotspur|regateador|4|3|I|4|n|rapado|-|14|0
Vicarió|Guglielmo Vicarió|IT|POR|83|Tottenham Hotspur|felino|1|3|D|0|c|corto|-|1|0
Madison|James Madison|EN|MCO|81|Tottenham Hotspur|creador|4|4|D|0|c|corto|-|10|0
Kulusevsky|Dejan Kulusevsky|SE|ED|82|Tottenham Hotspur|completo|4|3|I|0|r|corto|-|21|0
Tielemanns|Youri Tielemanns|BE|MC|82|Aston Villa|pasador|3|4|D|0|p|corto|-|8|0
Roger|Morgan Roger|EN|MCO|82|Aston Villa|regateador|4|3|D|3|n|corto|-|27|0
Torrez P.|Pau Torrez|ES|DFC|82|Aston Villa|pasador|2|3|I|0|c|corto|-|14|0
Konssa|Ezri Konssa|EN|DFC|81|Aston Villa|muro|2|3|D|4|n|rapado|-|4|0
Mitomma|Kaoru Mitomma|JP|EI|80|Brighton & Hove Albion|regateador|4|3|D|0|n|corto|-|22|0
Semenyó|Antoine Semenyó|GH|ED|80|Bournemouth|velocista|3|4|D|5|n|rapado|-|24|0
Matetta|Jean-Philippe Matetta|FR|DC|80|Crystal Palace|tanque|3|3|D|4|n|trenzas|-|14|0
Bowan|Jarrod Bowan|EN|ED|81|West Ham United|completo|3|3|I|0|c|corto|-|20|0
Paquettá|Lucas Paquettá|BR|MCO|81|West Ham United|regateador|4|4|I|2|n|rizado|-|10|0
Pickfort|Jordan Pickfort|EN|POR|82|Everton|barredor|1|3|I|0|c|corto|-|1|0
Dimarko|Federico Dimarko|IT|LI|85|Inter|carrilero|3|4|I|0|c|corto|-|32|0
Somer|Yann Somer|CH|POR|85|Inter|felino|1|3|D|0|c|corto|sombra|1|0
Dumfris|Denzel Dumfris|NL|LD|84|Inter|motor|3|3|D|4|n|corto|-|2|0
Pavar|Benjamin Pavar|FR|DFC|82|Inter|muro|2|3|D|0|c|corto|-|28|0
Lobotca|Stanislav Lobotca|SK|MCD|84|Napoli|pasador|3|3|D|0|c|calvo|corta|68|0
Di Lorenso|Giovanni Di Lorenso|IT|LD|84|Napoli|lider|2|3|D|0|c|corto|corta|22|0
Anguisa|Frank Anguisa|CM|MC|83|Napoli|motor|3|3|D|5|n|rapado|-|99|0
Hoylund|Rasmus Hoylund|DK|DC|80|Napoli|velocista|3|3|I|0|r|corto|-|19|0
Nerez|David Nerez|BR|EI|80|Napoli|regateador|4|3|I|3|n|rizado|-|7|0
Bremmer|Gleisón Bremmer|BR|DFC|84|Juventus|muro|2|3|D|3|n|rapado|corta|3|0
Conseição|Francisco Conseição|PT|ED|81|Juventus|regateador|5|3|I|0|n|corto|-|7|0
Davyd|Jonathan Davyd|CA|DC|82|Juventus|rematador|3|4|D|4|n|corto|-|30|0
Locateli|Manuel Locateli|IT|MC|82|Juventus|pasador|3|3|D|0|c|corto|corta|5|0
Koopmeiner|Teun Koopmeiner|NL|MC|82|Juventus|pasador|3|4|I|0|c|corto|-|8|0
Rabió|Adrien Rabió|FR|MC|82|Milan|motor|3|3|I|0|c|largo|-|12|0
Tomory|Fikayo Tomory|EN|DFC|81|Milan|velocista|2|3|D|4|n|rapado|-|23|0
Nkunkú|Christopher Nkunkú|FR|MCO|81|Milan|regateador|4|4|D|4|n|rapado|-|18|0
De Ketelaire|Charles De Ketelaire|BE|MCO|82|Atalanta|creador|4|4|I|0|c|corto|-|17|0
Éderson J.|Éderson José|BR|MC|82|Atalanta|motor|3|3|D|3|n|corto|-|13|0
Svilár|Mile Svilár|RS|POR|84|Roma|felino|1|3|I|0|c|corto|-|99|0
Mancinni|Gianluca Mancinni|IT|DFC|81|Roma|muro|2|3|D|0|c|corto|corta|23|0
Sulé|Matías Sulé|AR|ED|80|Roma|regateador|4|3|I|1|c|largo|-|18|0
Zacagni|Mattia Zacagni|IT|EI|81|Lazio|regateador|4|3|D|0|c|corto|corta|10|0
Kin|Moise Kin|IT|DC|82|Fiorentina|velocista|3|3|D|4|n|trenzas|-|20|0
De Jea|David de Jea|ES|POR|83|Fiorentina|felino|1|3|D|0|c|corto|corta|43|0
Pás|Nico Pás|AR|MCO|81|Como|creador|4|4|I|0|c|corto|-|10|0
Ta|Jonathan Ta|DE|DFC|84|Bayern München|muro|2|3|D|4|n|rapado|-|4|0
Goretska|Leon Goretska|DE|MC|81|Bayern München|motor|3|3|D|0|c|corto|corta|8|0
Gnabri|Serge Gnabri|DE|ED|82|Bayern München|velocista|4|3|D|4|n|corto|-|7|0
Paliña|João Paliña|PT|MCD|82|Bayern München|muro|2|3|D|0|c|corto|-|16|0
Kimm|Min-jae Kimm|KR|DFC|83|Bayern München|muro|2|3|D|1|n|corto|-|3|0
Kobell|Gregor Kobell|CH|POR|84|Borussia Dortmund|felino|1|3|D|0|c|corto|corta|1|0
Brant|Julian Brant|DE|MCO|81|Borussia Dortmund|creador|4|4|D|0|c|corto|-|10|0
Adeyémi|Karim Adeyémi|DE|EI|80|Borussia Dortmund|velocista|4|3|D|4|n|corto|-|27|0
Schlotterbek|Nico Schlotterbek|DE|DFC|83|Borussia Dortmund|muro|2|3|I|0|c|corto|-|4|0
Grimaldó|Álex Grimaldó|ES|LI|84|Bayer Leverkusen|pasador|4|4|I|0|p|corto|-|20|0
Undaf|Deniz Undaf|DE|DC|80|VfB Stuttgart|rematador|4|4|D|2|n|corto|corta|26|0
Eriksson|Christian Eriksson|DK|MC|78|VfL Wolfsburg|pasador|3|4|D|0|r|corto|-|24|0
Chevalié|Lucas Chevalié|FR|POR|82|Paris Saint-Germain|felino|1|3|D|0|c|corto|-|30|0
Pachó|Willian Pachó|EC|DFC|84|Paris Saint-Germain|muro|2|3|I|5|n|corto|-|51|0
Zaïre-Emeri|Warren Zaïre-Emeri|FR|MC|81|Paris Saint-Germain|motor|3|3|D|4|n|rapado|-|33|0
Ramós G.|Gonçalo Ramós|PT|DC|81|Paris Saint-Germain|rematador|3|3|D|0|c|corto|-|9|0
Li|Kang-in Li|KR|MCO|80|Paris Saint-Germain|creador|4|4|I|0|n|corto|-|19|0
Grinwood|Mason Grinwood|EN|ED|81|Olympique de Marseille|rematador|4|5|I|3|n|corto|-|10|0
Obameyang|Pierre-Emerick Obameyang|GA|DC|79|Olympique de Marseille|velocista|4|3|D|4|n|cresta|-|97|0
Ruli|Gerónimo Ruli|AR|POR|82|Olympique de Marseille|felino|1|3|D|1|n|corto|corta|1|0
Hojberg|Pierre-Emile Hojberg|DK|MC|81|Olympique de Marseille|lider|3|3|D|0|c|corto|-|23|0
Pogbá|Paul Pogbá|FR|MC|79|AS Monaco|completo|5|4|D|5|n|cresta|-|8|0
Minamimo|Takumi Minamimo|JP|MCO|79|AS Monaco|creador|4|3|D|0|n|corto|-|18|0
Fatti|Ansu Fatti|ES|EI|77|AS Monaco|regateador|4|3|D|5|n|rizado|-|31|0
L. de Yong|Luuk de Yong|NL|DC|79|PSV|tanque|2|3|D|0|c|corto|-|9|0
Perisich|Ivan Perisich|HR|EI|79|PSV|completo|3|5|D|0|c|corto|-|5|0
Verman|Joey Verman|NL|MC|79|PSV|pasador|3|3|D|0|r|corto|-|23|0
Weghorts|Wout Weghorts|NL|DC|76|Ajax|tanque|2|3|D|0|c|corto|corta|25|0
Ueeda|Ayase Ueeda|JP|DC|77|Feyenoord|rematador|3|3|D|0|n|corto|-|9|0
Trubín|Anatoliy Trubín|UA|POR|82|Benfica|felino|1|3|D|0|c|corto|-|1|0
Sylva A.|António Sylva|PT|DFC|80|Benfica|pasador|2|3|D|0|n|corto|-|4|0
Gonsalves|Pedro Gonsalves|PT|MCO|81|Sporting CP|creador|4|4|D|0|n|corto|corta|8|0
Fidalgó|Álvaro Fidalgó|ES|MC|77|América|pasador|3|4|D|0|c|corto|corta|8|0
Malagón|Luis Malagón|MX|POR|77|América|felino|1|3|D|1|n|corto|-|1|0
Andradda|Esteban Andradda|AR|POR|77|Monterrey|felino|1|3|D|1|n|corto|corta|1|0
Guzmán N.|Nahuel Guzmán|AR|POR|76|Tigres UANL|felino|1|3|D|1|n|largo|larga|1|0
Brunneta|Juan Brunneta|AR|MCO|78|Tigres UANL|creador|4|4|I|0|c|corto|corta|11|0
Myer|Kevin Myer|CO|POR|76|Cruz Azul|felino|1|3|D|3|n|corto|-|1|0
Sepúlbeda|Ángel Sepúlbeda|MX|DC|76|Cruz Azul|rematador|3|3|D|2|n|corto|-|29|0
Paulinyo|Paulinyo Silva|PT|DC|79|Toluca|rematador|3|3|D|1|n|corto|corta|26|0
Vegga|Alexis Vegga|MX|EI|77|Toluca|regateador|4|3|D|2|n|corto|-|10|0
Albarado|Roberto Albarado|MX|ED|75|Guadalajara|regateador|4|3|D|2|n|corto|-|25|0
Vázques|Johan Vázques|MX|DFC|79|Genoa|muro|2|3|I|2|n|corto|-|22|0
Tony|Ivan Tony|EN|DC|80|Al Ahli|rematador|3|4|D|4|n|corto|corta|99|0
Komán|Kingsley Komán|FR|EI|82|Al Nassr|velocista|4|3|D|4|n|corto|-|21|0
Félis|Joao Félis|PT|MCO|79|Al Nassr|regateador|4|4|D|0|n|corto|-|79|0
R. Nevez|Rúben Nevez|PT|MCD|82|Al Hilal|pasador|3|4|D|0|c|corto|corta|8|0
Mitrovich|Aleksandar Mitrovich|RS|DC|80|Al Hilal|tanque|3|3|D|0|n|corto|corta|9|0
Kulibaly|Kalidou Kulibaly|SN|DFC|81|Al Hilal|muro|2|3|D|5|n|rapado|corta|3|0
Bunu|Yassine Bunu|MA|POR|84|Al Hilal|felino|1|3|D|2|n|rapado|corta|37|0
Fabiñho|Fabiñho Tavares|BR|MCD|80|Al Ittihad|muro|2|3|D|3|n|corto|corta|8|0
De Paúl|Rodrigo De Paúl|AR|MC|82|Inter Miami|motor|3|4|D|1|n|largo|corta|7|0
Busquest|Sergio Busquest|ES|MCD|80|Inter Miami|pasador|3|3|D|0|n|corto|corta|5|0
Albá|Jordi Albá|ES|LI|79|Inter Miami|carrilero|3|3|I|0|c|corto|-|18|0
Cavanni|Edinson Cavanni|UY|DC|77|Boca Juniors|rematador|3|4|D|1|n|largo|corta|10|0
Paredez|Leandro Paredez|AR|MC|79|Boca Juniors|pasador|3|4|D|1|n|corto|corta|5|0
Vydal|Arturo Vydal|CL|MC|74|Colo-Colo|motor|3|3|D|2|n|cresta|corta|23|0
Sylva T.|Thiago Sylva|BR|DFC|78|Fluminense|lider|2|3|D|2|n|rapado|corta|3|0
Icardy|Mauro Icardy|AR|DC|80|Galatasaray|rematador|3|3|D|1|n|corto|-|9|0
Asensió|Marco Asensió|ES|MCO|80|Fenerbahçe|rematador|4|3|I|0|c|corto|-|21|0
`;
const LEYENDAS_TXT = `
Pelié|Edson Nascimiento|BR|DC|98|Leyendas|completo|5|5|D|4|n|rapado|-|10
Maradonna|Diego Maradonna|AR|MCO|97|Leyendas|regateador|5|3|I|1|n|rizado|-|10
Kruyff|Johan Kruyff|NL|DC|95|Leyendas|creador|5|4|D|0|c|largo|-|14
Zidán|Zinedine Zidán|FR|MCO|96|Leyendas|creador|5|4|D|1|o|calvo|-|10
Nazaryo|Ronaldo Nazaryo|BR|DC|96|Leyendas|velocista|5|4|D|3|n|rapado|-|9
Ronaldiño|Ronaldiño Gaúcho|BR|MCO|94|Leyendas|regateador|5|4|D|3|n|largo|-|10
Henri|Thierry Henri|FR|DC|93|Leyendas|velocista|4|4|D|4|n|calvo|-|14
Maldinni|Paolo Maldinni|IT|DFC|94|Leyendas|lider|2|4|D|1|n|largo|-|3
Bekenbauer|Franz Bekenbauer|DE|DFC|95|Leyendas|lider|3|4|D|0|c|peinado|-|5
Di Stéfanno|Alfredo Di Stéfanno|AR|DC|95|Leyendas|completo|4|4|D|1|n|calvo|-|9
Eusebiu|Eusebiu da Silva|PT|DC|94|Leyendas|rematador|4|4|D|5|n|rapado|-|10
Pushkás|Ferenc Pushkás|HU|DC|94|Leyendas|rematador|4|2|I|0|n|peinado|-|10
Yashín|Lev Yashín|RU|POR|94|Leyendas|felino|1|3|D|0|n|peinado|-|1
Bufón|Gianluigi Bufón|IT|POR|93|Leyendas|felino|1|3|D|0|c|largo|sombra|1
Casiyas|Iker Casiyas|ES|POR|91|Leyendas|felino|1|3|I|0|n|corto|sombra|1
Kan|Oliver Kan|DE|POR|91|Leyendas|felino|1|3|D|0|r|corto|-|1
Schmeikel|Peter Schmeikel|DK|POR|90|Leyendas|felino|1|3|D|0|r|corto|-|1
Van der Saar|Edwin van der Saar|NL|POR|89|Leyendas|barredor|1|3|D|0|c|calvo|-|1
Kampos|Jorge Kampos|MX|POR|86|Leyendas|barredor|1|3|D|2|n|largo|-|1
Xavy|Xavy Hernández|ES|MC|92|Leyendas|pasador|4|4|D|1|n|corto|sombra|6
Iniestra|Andrés Iniestra|ES|MC|92|Leyendas|creador|5|4|D|0|c|calvo|-|8
Alonzo|Xabi Alonzo|ES|MCD|89|Leyendas|pasador|3|4|D|1|c|corto|corta|14
Puyól|Carles Puyól|ES|DFC|90|Leyendas|muro|2|3|D|1|c|rizado|-|5
Torrés|Fernando Torrés|ES|DC|89|Leyendas|velocista|4|4|D|0|r|corto|-|9
Vila|David Vila|ES|DC|89|Leyendas|rematador|4|4|D|1|n|corto|perilla|7
Gonzáles|Raúl Gonzáles|ES|DC|90|Leyendas|rematador|4|4|I|1|n|corto|-|7
Kakah|Ricardo Kakah|BR|MCO|92|Leyendas|velocista|4|4|D|1|c|corto|-|22
Karlos|Roberto Karlos|BR|LI|91|Leyendas|carrilero|4|3|I|3|n|calvo|-|3
Cafú|Marcos Cafú|BR|LD|90|Leyendas|carrilero|3|3|D|4|n|rapado|-|2
Rivaldho|Rivaldho Ferreyra|BR|MCO|91|Leyendas|regateador|5|3|I|2|n|corto|-|10
Romárion|Romárion Faria|BR|DC|91|Leyendas|rematador|5|4|D|3|n|rapado|-|11
Zicco|Arthur Zicco|BR|MCO|92|Leyendas|creador|4|4|D|1|n|rizado|-|10
Garrinxa|Mané Garrinxa|BR|ED|92|Leyendas|regateador|5|3|D|3|n|corto|-|7
Pirllo|Andrea Pirllo|IT|MC|91|Leyendas|pasador|4|4|D|1|c|largo|larga|21
Toti|Francesco Toti|IT|MCO|91|Leyendas|creador|4|4|D|0|c|corto|-|10
Del Pierro|Alessandro Del Pierro|IT|MCO|91|Leyendas|creador|4|4|D|0|n|corto|-|10
Canavaro|Fabio Canavaro|IT|DFC|91|Leyendas|muro|2|3|D|1|n|rapado|-|5
Bagio|Roberto Bagio|IT|MCO|92|Leyendas|creador|5|4|D|1|c|coleta|perilla|10
Van Bastin|Marco van Bastin|NL|DC|94|Leyendas|rematador|4|4|D|0|r|corto|-|9
Gulit|Ruud Gulit|NL|MC|92|Leyendas|completo|4|4|D|4|n|trenzas|bigote|10
Bergkampf|Dennis Bergkampf|NL|DC|91|Leyendas|creador|4|4|D|0|r|corto|-|10
Roben|Arjen Roben|NL|ED|90|Leyendas|regateador|4|2|I|0|g|calvo|-|10
Mateus|Lothar Mateus|DE|MC|92|Leyendas|motor|3|4|D|0|c|peinado|-|10
Müler G.|Gerd Müler|DE|DC|93|Leyendas|rematador|3|4|D|0|n|largo|-|13
Lahn|Philipp Lahn|DE|LD|90|Leyendas|carrilero|3|4|D|0|c|corto|-|21
Klosse|Miroslav Klosse|DE|DC|89|Leyendas|rematador|3|3|D|0|c|corto|-|11
Kross|Toni Kross|DE|MC|90|Leyendas|pasador|3|5|D|0|r|corto|-|8
Charltan|Bobby Charltan|EN|MCO|92|Leyendas|completo|4|4|D|0|c|calvo|-|9
Beckam|David Beckam|EN|ED|89|Leyendas|pasador|3|3|D|0|r|cresta|-|7
Gerard|Steven Gerard|EN|MC|90|Leyendas|completo|3|4|D|0|c|corto|-|8
Lampar|Frank Lampar|EN|MC|89|Leyendas|rematador|3|4|D|0|c|corto|-|8
Rooni|Wayne Rooni|EN|DC|90|Leyendas|completo|4|4|D|0|c|rapado|-|10
Ferdinan|Rio Ferdinan|EN|DFC|89|Leyendas|lider|2|3|D|4|n|rapado|-|5
Kantona|Eric Kantona|FR|DC|90|Leyendas|completo|4|4|D|0|n|corto|-|7
Platinni|Michel Platinni|FR|MCO|93|Leyendas|creador|4|4|D|0|c|rizado|-|10
Viera|Patrick Viera|FR|MCD|90|Leyendas|motor|3|3|D|5|n|rapado|-|4
Riberi|Franck Riberi|FR|EI|89|Leyendas|regateador|5|3|D|0|c|calvo|sombra|7
Fygo|Luis Fygo|PT|ED|91|Leyendas|regateador|5|3|D|0|c|largo|-|7
Sánches|Hugo Sánches|MX|DC|91|Leyendas|rematador|4|4|D|1|n|rizado|bigote|9
Márques|Rafa Márques|MX|DFC|88|Leyendas|lider|3|4|D|1|n|corto|corta|4
Blanko|Cuauhtémoc Blanko|MX|MCO|87|Leyendas|creador|4|3|D|2|n|corto|-|10
Batistutta|Gabriel Batistutta|AR|DC|92|Leyendas|rematador|3|4|D|0|n|largo|-|9
Riquelmé|Juan Román Riquelmé|AR|MCO|90|Leyendas|pasador|4|4|D|1|n|corto|-|10
Zanetty|Javier Zanetty|AR|LD|89|Leyendas|motor|3|3|D|1|n|peinado|-|4
Valderama|Carlos Valderama|CO|MCO|88|Leyendas|pasador|4|3|D|2|r|afro|bigote|10
Drogbá|Didier Drogbá|CI|DC|91|Leyendas|tanque|3|3|D|4|n|rapado|-|11
Etoo|Samuel Etoo|CM|DC|91|Leyendas|velocista|4|4|D|5|n|rapado|-|9
Weá|George Weá|LR|DC|90|Leyendas|velocista|4|4|D|5|n|rapado|-|14
Shevchenco|Andriy Shevchenco|UA|DC|91|Leyendas|rematador|4|4|D|0|c|corto|-|7
Ibrahimovich|Zlatan Ibrahimovich|SE|DC|92|Leyendas|tanque|5|4|D|1|n|moño|corta|10
Stoichkof|Hristo Stoichkof|BG|DC|90|Leyendas|rematador|4|3|I|0|n|corto|-|8
Haghi|Gheorghe Haghi|RO|MCO|90|Leyendas|creador|4|3|I|0|n|corto|-|10
Beil|Gareth Beil|WA|ED|89|Leyendas|velocista|4|3|I|0|c|moño|corta|11
Marselo|Marselo Vieyra|BR|LI|88|Leyendas|carrilero|5|3|I|3|n|afro|-|12
Turé|Yaya Turé|CI|MC|89|Leyendas|motor|4|3|D|5|n|rapado|-|42
Hazzard|Eden Hazzard|BE|EI|90|Leyendas|regateador|5|4|D|1|c|corto|sombra|10
Agüeró|Sergio Agüeró|AR|DC|90|Leyendas|rematador|4|4|D|1|n|corto|-|10
Hiero|Fernando Hiero|ES|DFC|89|Leyendas|lider|2|3|D|1|n|corto|bigote|4
Butragueñho|Emilio Butragueñho|ES|DC|88|Leyendas|regateador|4|3|D|0|c|rizado|-|7
Sylva D.|David Sylva|ES|MCO|89|Leyendas|creador|4|4|I|0|n|corto|-|21
Fábrigas|Cesc Fábrigas|ES|MC|88|Leyendas|pasador|4|4|D|0|c|corto|corta|4
Jento|Paco Jento|ES|EI|90|Leyendas|velocista|4|3|I|0|n|peinado|-|11
Zubisarreta|Andoni Zubisarreta|ES|POR|87|Leyendas|felino|1|3|D|0|c|corto|bigote|1
Gutti|José Gutti|ES|MCO|86|Leyendas|creador|4|4|I|0|r|largo|-|14
Kempés|Mario Kempés|AR|DC|90|Leyendas|rematador|4|3|I|0|n|largo|-|10
Pasarella|Daniel Pasarella|AR|DFC|90|Leyendas|lider|2|3|D|0|n|largo|-|6
Canigia|Claudio Canigia|AR|DC|87|Leyendas|velocista|4|3|D|0|r|largo|-|7
Mascheranno|Javier Mascheranno|AR|MCD|88|Leyendas|muro|2|3|D|0|n|corto|-|14
Tébez|Carlos Tébez|AR|DC|87|Leyendas|tanque|4|3|D|2|n|corto|-|32
Higuaim|Gonzalo Higuaim|AR|DC|87|Leyendas|rematador|3|3|D|0|n|corto|corta|9
Crespó|Hernán Crespó|AR|DC|88|Leyendas|rematador|3|4|D|0|n|corto|-|9
Berón|Juan Sebastián Berón|AR|MC|88|Leyendas|pasador|3|4|D|0|g|calvo|-|11
Aymar|Pablo Aymar|AR|MCO|86|Leyendas|creador|5|4|D|0|n|largo|-|10
Sócratess|Sócratess Oliveira|BR|MCO|91|Leyendas|creador|4|4|D|1|n|rizado|larga|8
Rivelinno|Roberto Rivelinno|BR|MCO|90|Leyendas|creador|5|3|I|2|n|largo|bigote|11
Jairziño|Jairziño Ventura|BR|ED|90|Leyendas|velocista|4|3|D|4|n|afro|-|7
Albertto|Carlos Albertto|BR|LD|90|Leyendas|carrilero|3|3|D|3|n|corto|-|4
Bebetto|Bebetto Oliveira|BR|DC|88|Leyendas|rematador|4|3|D|3|n|corto|-|7
Adriánno|Adriánno Leite|BR|DC|89|Leyendas|tanque|4|4|I|4|n|rapado|-|10
Lúzio|Lúzio Ferreira|BR|DFC|87|Leyendas|muro|2|3|D|2|n|rapado|-|3
Juniño|Juniño Pernambucano|BR|MC|88|Leyendas|pasador|4|4|D|2|n|rapado|-|8
Tafarel|Cláudio Tafarel|BR|POR|86|Leyendas|felino|1|3|D|1|c|largo|-|1
Didda|Didda Silva|BR|POR|87|Leyendas|felino|1|3|D|5|n|rapado|-|12
Tostãu|Eduardo Tostãu|BR|DC|89|Leyendas|creador|4|4|I|1|n|largo|-|9
Nestta|Alessandro Nestta|IT|DFC|91|Leyendas|muro|2|3|D|0|n|largo|-|13
Baressi|Franco Baressi|IT|DFC|92|Leyendas|lider|2|3|D|0|c|calvo|-|6
Zof|Dino Zof|IT|POR|91|Leyendas|felino|1|3|D|0|g|corto|-|1
Meaza|Giuseppe Meaza|IT|DC|91|Leyendas|rematador|4|4|D|0|n|peinado|-|8
Vierri|Christian Vierri|IT|DC|89|Leyendas|tanque|3|3|I|0|n|corto|-|32
Inzagui|Pippo Inzagui|IT|DC|87|Leyendas|rematador|2|3|D|0|n|corto|-|9
Gatuso|Gennaro Gatuso|IT|MCD|87|Leyendas|motor|2|3|D|0|n|corto|larga|8
De Rosi|Daniele De Rosi|IT|MCD|87|Leyendas|lider|2|3|D|0|c|corto|corta|16
Chielini|Giorgio Chielini|IT|DFC|89|Leyendas|muro|2|3|I|0|n|corto|-|3
Rosi|Paolo Rosi|IT|DC|89|Leyendas|rematador|3|4|D|0|n|rizado|-|20
Rumenigge|Karl-Heinz Rumenigge|DE|DC|91|Leyendas|completo|4|4|D|0|r|largo|-|11
Klinsman|Jürgen Klinsman|DE|DC|89|Leyendas|rematador|3|4|D|0|r|corto|-|18
Balack|Michael Balack|DE|MC|89|Leyendas|completo|3|4|D|0|c|corto|-|13
Schweinsteigerr|Bastian Schweinsteigerr|DE|MC|89|Leyendas|motor|3|4|D|0|r|corto|-|31
Mayer|Sepp Mayer|DE|POR|90|Leyendas|felino|1|3|D|0|c|corto|-|1
Voller|Rudi Voller|DE|DC|87|Leyendas|rematador|3|3|D|0|g|rizado|bigote|9
Samer|Matthias Samer|DE|DFC|89|Leyendas|lider|3|3|D|0|p|corto|-|6
Ozil|Mesut Ozil|DE|MCO|88|Leyendas|creador|4|3|I|1|n|corto|-|10
Reuss|Marco Reuss|DE|EI|86|Leyendas|completo|4|4|D|0|r|corto|-|11
Humels|Mats Humels|DE|DFC|87|Leyendas|pasador|2|3|D|0|c|corto|corta|5
Neeskins|Johan Neeskins|NL|MC|90|Leyendas|motor|3|4|D|0|r|largo|-|13
Rijkard|Frank Rijkard|NL|MCD|91|Leyendas|completo|3|4|D|4|n|trenzas|-|3
Koemann|Ronald Koemann|NL|DFC|89|Leyendas|pasador|2|4|D|0|r|corto|-|4
Sedorf|Clarence Sedorf|NL|MC|90|Leyendas|completo|4|5|D|4|n|rapado|-|10
Kluyvert|Patrick Kluyvert|NL|DC|88|Leyendas|rematador|3|4|D|4|n|corto|-|9
Davidz|Edgar Davidz|NL|MC|88|Leyendas|motor|4|3|I|4|n|trenzas|-|26
Sneyder|Wesley Sneyder|NL|MCO|88|Leyendas|pasador|4|5|D|0|c|corto|-|10
Van Persi|Robin van Persi|NL|DC|89|Leyendas|rematador|4|3|I|0|n|corto|corta|20
Van Nistelroy|Ruud van Nistelroy|NL|DC|89|Leyendas|rematador|3|4|D|0|c|corto|-|10
Stamm|Jaap Stamm|NL|DFC|89|Leyendas|muro|2|3|D|0|g|calvo|-|6
Fontainne|Just Fontainne|FR|DC|90|Leyendas|rematador|3|4|D|0|n|peinado|-|17
Copa|Raymond Copa|FR|MCO|89|Leyendas|regateador|4|4|D|0|n|peinado|-|10
Desayi|Marcel Desayi|FR|DFC|89|Leyendas|muro|2|3|D|5|n|rapado|-|8
Turam L.|Lilian Turam|FR|DFC|89|Leyendas|muro|2|3|D|5|n|rapado|-|15
Blanch|Laurent Blanch|FR|DFC|87|Leyendas|pasador|2|3|D|0|g|calvo|-|5
Makelelé|Claude Makelelé|FR|MCD|88|Leyendas|muro|2|3|D|5|n|calvo|-|4
Pirés|Robert Pirés|FR|EI|88|Leyendas|regateador|4|4|D|0|c|largo|perilla|7
Trezegué|David Trezegué|FR|DC|88|Leyendas|rematador|3|4|D|1|n|corto|-|17
Papín|Jean-Pierre Papín|FR|DC|89|Leyendas|rematador|3|4|D|0|n|corto|-|9
Bartez|Fabien Bartez|FR|POR|87|Leyendas|felino|1|3|D|0|c|calvo|-|16
Loris|Hugo Loris|FR|POR|86|Leyendas|felino|1|3|I|0|c|corto|-|1
Linnekar|Gary Linnekar|EN|DC|89|Leyendas|rematador|3|4|D|0|c|corto|-|10
Shiarer|Alan Shiarer|EN|DC|90|Leyendas|rematador|3|4|D|0|c|corto|-|9
Escoles|Paul Escoles|EN|MC|89|Leyendas|pasador|3|4|D|0|p|corto|-|18
Tery|John Tery|EN|DFC|89|Leyendas|lider|2|3|D|0|n|corto|-|26
Kole|Ashley Kole|EN|LI|88|Leyendas|carrilero|3|3|I|4|n|rapado|-|3
Owenn|Michael Owenn|EN|DC|89|Leyendas|velocista|4|3|D|0|n|corto|-|10
Gascoyne|Paul Gascoyne|EN|MCO|88|Leyendas|regateador|4|4|D|0|b|corto|-|8
Bancks|Gordon Bancks|EN|POR|90|Leyendas|felino|1|3|D|0|c|peinado|-|1
Mor|Bobby Mor|EN|DFC|91|Leyendas|lider|2|3|D|0|r|corto|-|6
Kegan|Kevin Kegan|EN|DC|88|Leyendas|completo|4|3|D|0|c|rizado|-|7
Cambel|Sol Cambel|EN|DFC|87|Leyendas|muro|2|3|D|5|n|rapado|-|23
Kosta R.|Rui Kosta|PT|MCO|88|Leyendas|creador|4|4|D|0|n|largo|-|10
Decco|Decco Souza|PT|MC|88|Leyendas|creador|4|4|D|2|n|calvo|-|20
Carbalho|Ricardo Carbalho|PT|DFC|87|Leyendas|muro|2|3|D|0|n|corto|-|6
Borjetti|Jared Borjetti|MX|DC|84|Leyendas|rematador|3|3|D|2|n|corto|bigote|9
Chicharo|Javier 'Chicharo' Hernándes|MX|DC|84|Leyendas|rematador|3|4|D|1|n|corto|-|14
Pardó|Pável Pardó|MX|MC|82|Leyendas|pasador|3|3|D|1|n|corto|-|8
Guardao|Andrés Guardao|MX|MC|84|Leyendas|pasador|3|4|I|1|n|corto|corta|18
Bela|Carlos Bela|MX|ED|85|Leyendas|creador|4|4|I|2|n|corto|-|11
Dos Santtos|Giovani dos Santtos|MX|MCO|82|Leyendas|regateador|4|3|I|2|n|trenzas|-|10
Matador|Luis 'Matador' Hernándes|MX|DC|84|Leyendas|rematador|3|3|D|1|r|largo|-|15
Sánches O.|Oswaldo Sánches|MX|POR|83|Leyendas|felino|1|3|D|2|n|corto|-|1
Bestt|George Bestt|NIR|ED|92|Leyendas|regateador|5|4|D|0|n|largo|corta|7
Dalgish|Kenny Dalgish|SC|DC|90|Leyendas|completo|4|4|D|0|c|corto|-|7
Rusch|Ian Rusch|WA|DC|88|Leyendas|rematador|3|3|D|0|n|corto|bigote|9
Gigs|Ryan Gigs|WA|EI|88|Leyendas|regateador|4|3|I|0|n|corto|-|11
Kean|Roy Kean|IE|MCD|88|Leyendas|motor|2|3|D|0|n|corto|larga|16
Laudrop|Michael Laudrop|DK|MCO|90|Leyendas|creador|5|4|D|0|c|corto|-|10
Larson|Henrik Larson|SE|DC|88|Leyendas|rematador|3|4|D|3|n|trenzas|-|7
Suker|Davor Suker|HR|DC|88|Leyendas|rematador|4|3|I|0|n|corto|-|9
Nedvet|Pavel Nedvet|CZ|MC|91|Leyendas|motor|4|4|D|0|r|largo|-|11
Chech|Petr Chech|CZ|POR|89|Leyendas|felino|1|3|D|0|c|corto|-|1
Vidich|Nemanja Vidich|RS|DFC|88|Leyendas|muro|2|3|D|0|n|corto|-|15
Essyen|Michael Essyen|GH|MC|87|Leyendas|motor|3|3|D|5|n|rapado|-|5
Okoxa|Jay-Jay Okoxa|NG|MCO|88|Leyendas|regateador|5|4|D|5|n|rapado|-|10
Kanú|Nwankwo Kanú|NG|DC|86|Leyendas|regateador|4|3|D|5|n|rapado|-|4
Mila|Roger Mila|CM|DC|87|Leyendas|rematador|4|3|D|5|n|corto|bigote|9
Nakatta|Hidetoshi Nakatta|JP|MCO|85|Leyendas|creador|4|4|D|0|r|corto|-|7
Parck|Ji-sung Parck|KR|MC|85|Leyendas|motor|3|4|D|1|n|corto|-|13
Donovann|Landon Donovann|US|EI|84|Leyendas|velocista|4|4|D|0|c|corto|-|10
Figueroá|Elías Figueroá|CL|DFC|89|Leyendas|lider|2|3|D|1|n|peinado|-|2
Zamoranno|Iván Zamoranno|CL|DC|87|Leyendas|rematador|3|3|D|1|n|corto|-|9
Salaz|Marcelo Salaz|CL|DC|87|Leyendas|rematador|4|3|I|1|n|corto|-|11
Francescolli|Enzo Francescolli|UY|MCO|89|Leyendas|creador|4|4|D|0|n|largo|-|10
Forlám|Diego Forlám|UY|DC|88|Leyendas|rematador|4|5|D|0|r|largo|-|10
Cubiyas|Teófilo Cubiyas|PE|MCO|88|Leyendas|creador|4|4|D|3|n|afro|-|10
Higüita|René Higüita|CO|POR|85|Leyendas|barredor|3|3|D|3|n|largo|bigote|1
Asprila|Faustino Asprila|CO|DC|86|Leyendas|regateador|5|3|D|4|n|corto|-|11
Falkao|Radamel Falkao|CO|DC|88|Leyendas|rematador|3|4|D|1|n|largo|-|9
Chilaver|José Luis Chilaver|PY|POR|87|Leyendas|felino|1|3|I|1|n|corto|-|1
Blojín|Oleg Blojín|UA|EI|89|Leyendas|velocista|4|3|I|0|c|corto|-|11
`;
/* Cartas especiales de jugadores de arriba (se busca la fila por el nombre corto):
   'tipo|nombre corto|etiqueta|puesto|media|club de entonces|estilo|habilidad|pie malo|peinado|barba|pelo' (vacío = el de la fila)
   flashback: una versión de hace años (2 o 3 de los más icónicos); cumbre: 97-100, rarísimas; promesa: jóvenes en verde;
   figura: más cartas azules. */
const ESPECIALES_TXT = `
flashback|Messio|2009|ED|93|FC Barcelona|regateador|5|3|largo|-
flashback|Messio|2012|DC|96|FC Barcelona|regateador|5|4|corto|-
flashback|Messio|2022|ED|94|Paris Saint-Germain|creador|4|4|corto|larga
flashback|Ronalldo|2008|ED|93|Manchester United|velocista|5|4|peinado|-
flashback|Ronalldo|2014|EI|95|Real Madrid|rematador|5|4|corto|-
flashback|Ronalldo|2017|DC|94|Real Madrid|rematador|5|4|corto|-
flashback|Neimar Jr.|2011|EI|86|Santos|regateador|5|4|cresta|-
flashback|Neimar Jr.|2015|EI|92|FC Barcelona|regateador|5|5|corto|-
flashback|Neimar Jr.|2018|EI|93|Paris Saint-Germain|regateador|5|5|corto|-|r
flashback|Maradonna|1982|MCO|93|Boca Juniors|regateador|5|3||
flashback|Maradonna|1990|MCO|96|Napoli|regateador|5|3||
flashback|Pelié|1958|DC|95|Santos|velocista|5|4||
flashback|Pelié|1962|DC|97|Santos|completo|5|5||
flashback|Nazaryo|1997|DC|97|FC Barcelona|velocista|5|4|rapado|-
flashback|Nazaryo|2002|DC|96|Real Madrid|rematador|5|4|cresta|-
flashback|Ronaldiño|2002|MCO|91|Paris Saint-Germain|regateador|5|4||
flashback|Ronaldiño|2006|EI|97|FC Barcelona|regateador|5|4||
flashback|Zidán|1998|MCO|94|Juventus|creador|5|4|corto|-
flashback|Zidán|2002|MCO|96|Real Madrid|creador|5|4||
flashback|Kakah|2007|MCO|95|Milan|velocista|4|4||
flashback|Henri|2004|DC|95|Arsenal|velocista|4|4||
flashback|Kruyff|1971|DC|97|Ajax|creador|5|4||
flashback|Van Bastin|1988|DC|96|Milan|rematador|4|4||
flashback|Bekenbauer|1974|DFC|96|Bayern München|lider|3|4||
flashback|Platinni|1984|MCO|96|Juventus|creador|4|4||
flashback|Romárion|1994|DC|94|FC Barcelona|rematador|5|4||
flashback|Rivaldho|1999|MCO|95|FC Barcelona|regateador|5|3||
flashback|Shevchenco|2004|DC|94|Milan|rematador|4|4||
flashback|Fygo|2000|ED|94|FC Barcelona|regateador|5|3||
flashback|Pushkás|1960|DC|96|Real Madrid|rematador|4|2||
flashback|Di Stéfanno|1957|DC|97|Real Madrid|completo|4|4||
flashback|Eusebiu|1965|DC|96|Benfica|rematador|4|4||
flashback|Maldinni|1994|DFC|96|Milan|lider|2|4||
flashback|Bufón|2006|POR|95|Juventus|felino|1|3||
flashback|Casiyas|2010|POR|93|Real Madrid|felino|1|3||
flashback|Iniestra|2010|MC|94|FC Barcelona|creador|5|4||
flashback|Xavy|2011|MC|94|FC Barcelona|pasador|4|4||
flashback|Gerard|2005|MC|92|Liverpool|completo|3|4||
flashback|Beckam|1999|ED|90|Manchester United|pasador|3|3|corto|-
flashback|Rooni|2010|DC|92|Manchester United|completo|4|4||
flashback|Torrés|2008|DC|92|Liverpool|velocista|4|4||
flashback|Drogbá|2012|DC|92|Chelsea|tanque|3|3||
flashback|Etoo|2009|DC|92|FC Barcelona|velocista|4|4||
flashback|Ibrahimovich|2013|DC|92|Paris Saint-Germain|tanque|5|4|largo|-
flashback|Hazzard|2019|EI|93|Chelsea|regateador|5|4||
flashback|Roben|2014|ED|93|Bayern München|regateador|4|2||
flashback|Riberi|2013|EI|93|Bayern München|regateador|5|3||
flashback|Agüeró|2012|DC|92|Manchester City|rematador|4|4||
flashback|Beil|2014|ED|91|Real Madrid|velocista|4|3|corto|-
flashback|Kross|2017|MC|92|Real Madrid|pasador|3|5||
flashback|Marselo|2017|LI|89|Real Madrid|carrilero|5|3||
flashback|Ramós|2017|DFC|91|Real Madrid|lider|3|3|largo|corta
flashback|Modrich|2018|MC|92|Real Madrid|creador|4|4||
flashback|Suáres|2016|DC|92|FC Barcelona|rematador|4|4||
flashback|Lewandoski|2020|DC|93|Bayern München|rematador|4|4||
flashback|Benzemá|2022|DC|92|Real Madrid|rematador|4|4||
flashback|Mbapé|2018|ED|88|Paris Saint-Germain|velocista|5|4||
flashback|Mbapé|2022|DC|93|Paris Saint-Germain|velocista|5|4||
flashback|Halland|2020|DC|86|Borussia Dortmund|rematador|3|3|largo|-
flashback|Salaj|2018|ED|91|Liverpool|velocista|4|3||
flashback|De Bruine|2020|MC|92|Manchester City|pasador|4|5||
flashback|Van Dyk|2019|DFC|92|Liverpool|lider|2|3||
flashback|Grizman|2018|DC|91|Atlético de Madrid|completo|4|4|largo|-
flashback|Kantí|2018|MCD|89|Chelsea|motor|2|3||
flashback|Sánches|1986|DC|93|Real Madrid|rematador|4|4||
flashback|Márques|2006|DFC|89|FC Barcelona|lider|3|4||
flashback|Batistutta|1998|DC|93|Fiorentina|rematador|3|4||
flashback|Riquelmé|2001|MCO|91|Boca Juniors|pasador|4|4||
flashback|Kampos|1994|POR|88|UNAM Pumas|barredor|1|3||
cumbre|Pelié|La cima|DC|100|Santos|completo|5|5||
cumbre|Maradonna|La cima|MCO|99|Napoli|regateador|5|4||
cumbre|Messio|La cima|ED|99|FC Barcelona|regateador|5|4|corto|-
cumbre|Ronalldo|La cima|DC|99|Real Madrid|rematador|5|5|corto|-
cumbre|Nazaryo|La cima|DC|99|Inter|velocista|5|4|rapado|-
cumbre|Kruyff|La cima|DC|98|Ajax|creador|5|4||
cumbre|Zidán|La cima|MCO|98|Real Madrid|creador|5|5||
cumbre|Ronaldiño|La cima|MCO|98|FC Barcelona|regateador|5|5||
cumbre|Bekenbauer|La cima|DFC|98|Bayern München|lider|3|4||
cumbre|Maldinni|La cima|DFC|97|Milan|lider|3|4||
promesa|Yamall|Promesa|ED|91|FC Barcelona|regateador|5|4||
promesa|Cubarzí|Promesa|DFC|87|FC Barcelona|pasador|2|3||
promesa|Endryck|Promesa|DC|84|Real Madrid|rematador|4|3||
promesa|Mastantono|Promesa|ED|82|Real Madrid|regateador|4|3||
promesa|Mainú|Promesa|MC|83|Manchester United|regateador|4|3||
promesa|Zaïre-Emeri|Promesa|MC|85|Paris Saint-Germain|motor|3|3||
promesa|Dué|Promesa|ED|88|Paris Saint-Germain|regateador|5|4||
promesa|Estevinho|Promesa|ED|83|Chelsea|regateador|5|4||
promesa|Pás|Promesa|MCO|85|Como|creador|4|4||
promesa|Gúler|Promesa|MCO|87|Real Madrid|creador|4|4||
promesa|Yildís|Promesa|EI|87|Juventus|regateador|5|4||
promesa|Musiela|Promesa|MCO|91|Bayern München|regateador|5|4||
figura|Grizman|Figura|DC|89|||||
figura|Olisé|Figura|ED|90|||||
figura|Gyokeres|Figura|DC|89|||||
figura|Bremmer|Figura|DFC|87|||||
figura|Rodrígues J.|Figura|MCO|85|||||
`;
function leerFilas(txt, leyenda) {
  return txt.trim().split('\n').map((l, i) => {
    const [corto, nombre, nac, pos, med, club, arq, hab, pm, pie, piel, pelo, peinado, barba, num, fig] = l.split('|');
    return { sid: (leyenda ? 'L' : 'S') + i, corto, nombre, nac, pos, med: +med, club, arq, hab: +hab, pm: +pm, pie, num: +num, figura: fig === '1', leyenda,
      look: { piel: +piel, pelo, peinado, barba } };
  });
}
const ESTRELLAS = [...leerFilas(ESTRELLAS_TXT, false), ...leerFilas(LEYENDAS_TXT, true)];
const ESPECIALES = ESPECIALES_TXT.trim().split('\n').map((l, i) => {
  const [tipo, corto, etq, pos, med, club, arq, hab, pm, peinado, barba, pelo] = l.split('|');
  const b = ESTRELLAS.find(e => e.corto === corto);
  if (!b) return null;
  return { ...b, sid: 'X' + i, base: b.sid, tipo, etq, pos: pos || b.pos, med: +med, club: club || b.club, arq: arq || b.arq, hab: +hab || b.hab, pm: +pm || b.pm,
    look: { ...b.look, peinado: peinado || b.look.peinado, barba: barba || b.look.barba, pelo: pelo || b.look.pelo } };
}).filter(Boolean);
// todas las cartas posibles de la base de estrellas: normales, Figura (azul, +3) y Leyenda
const CARTAS_ESTRELLA = (() => {
  const L = [];
  for (const e of ESTRELLAS) {
    L.push({ ...e, clave: e.sid, tipo: e.leyenda ? 'leyenda' : 'normal' });
    if (e.figura) L.push({ ...e, clave: e.sid + 'f', tipo: 'figura', med: Math.min(99, e.med + 3) });
  }
  for (const e of ESPECIALES) L.push({ ...e, clave: e.sid });
  return L;
})();

/* ---------- aspecto (retrato dibujado) ---------- */
const PIEL_CARTA = [0xf3d3b5, 0xe2b48c, 0xc8915f, 0xa66d43, 0x7c4b2a, 0x4f2f1b];
const PELO_CARTA = { n: 0x15110f, o: 0x2e1d12, c: 0x6b4423, r: 0xd9b45a, p: 0xa4461f, g: 0x8d8a85, b: 0xe8e2cf };
const PEINADOS = ['corto', 'rapado', 'peinado', 'rizado', 'corto', 'largo', 'calvo', 'cresta', 'corto', 'moño'];
const BARBAS = ['-', '-', '-', 'sombra', 'corta', '-', 'perilla', 'larga', '-', 'bigote'];
// aspecto de un jugador inventado de la base de datos: sale de su piel y pelo y de su nombre (siempre el mismo)
function aspectoGenerico(j) {
  const h = _hash((j.nombre1 || '') + (j.nombre || '') + (j.id || ''));
  const cerca = (lista, v) => lista.reduce((m, x, i) => difColor(x, v) < difColor(lista[m], v) ? i : m, 0);
  return { piel: cerca(PIEL_CARTA, j.piel != null ? j.piel : 0xd9a27b), peloHex: j.pelo != null ? j.pelo : 0x2e1d12, peinado: PEINADOS[h % PEINADOS.length], barba: BARBAS[(h >> 5) % BARBAS.length] };
}
const _osc = (n, k) => { const r = (n >> 16 & 255) * k, g = (n >> 8 & 255) * k, b = (n & 255) * k; return '#' + [r, g, b].map(x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join(''); };
function retratoSVG(look, camiseta = 0x2b5d8a, cuello = 0xf5f5f5) {
  const piel = PIEL_CARTA[look.piel] != null ? PIEL_CARTA[look.piel] : look.piel, pelo = look.peloHex != null ? look.peloHex : PELO_CARTA[look.pelo] || 0x15110f;
  const P = colorCss(piel), Pd = _osc(piel, .82), H = colorCss(pelo), C = colorCss(camiseta), Cd = _osc(camiseta, .75);
  const pz = look.peinado, b = look.barba;
  const top = { corto: 'M32 40Q31 21 50 20Q69 21 68 40Q64 29 50 29Q36 29 32 40Z', peinado: 'M32 40Q30 17 52 15Q71 17 68 40Q63 27 49 27Q37 28 32 40Z', rizado: '', afro: '', calvo: '', rapado: 'M33 38Q33 22 50 21Q67 22 67 38Q63 29 50 28Q37 29 33 38Z' };
  let atras = '', arriba = '';
  if (pz === 'largo' || pz === 'trenzas') atras = `<path d="M29 40Q27 16 50 17Q73 16 71 40L73 68Q67 72 63 64L63 44H37V64Q33 72 27 68Z" fill="${H}"/>` + (pz === 'trenzas' ? [32, 36, 64, 68].map(x => `<path d="M${x} 46V70" stroke="${_osc(pelo, 1.6)}" stroke-width="1" opacity=".5"/>`).join('') : '');
  if (pz === 'afro') atras = `<ellipse cx="50" cy="34" rx="27" ry="23" fill="${H}"/>`;
  if (pz === 'coleta') atras = `<path d="M64 26Q78 30 74 52Q70 44 66 38Z" fill="${H}"/>`;
  if (pz === 'rizado') arriba = [[34, 34], [38, 26], [45, 22], [52, 21], [59, 23], [65, 28], [67, 35], [41, 29], [50, 27], [58, 29]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.2" fill="${H}"/>`).join('');
  else if (pz === 'cresta') arriba = `<path d="M44 30Q45 13 50 11Q55 13 56 30Z" fill="${H}"/><path d="M33 38Q33 25 50 24Q67 25 67 38Q60 31 50 31Q40 31 33 38Z" fill="${H}" opacity=".35"/>`;
  else if (pz === 'moño') arriba = `<path d="${top.corto}" fill="${H}"/><circle cx="50" cy="15" r="6.5" fill="${H}"/>`;
  else if (pz === 'largo' || pz === 'trenzas' || pz === 'coleta') arriba = `<path d="M31 42Q30 19 50 19Q70 19 69 42Q64 28 50 28Q37 28 31 42Z" fill="${H}"/>`;
  else if (pz === 'afro') arriba = `<path d="M32 38Q33 24 50 23Q67 24 68 38Q62 31 50 31Q38 31 32 38Z" fill="${H}"/>`;
  else if (pz === 'rapado') arriba = `<path d="${top.rapado}" fill="${H}" opacity=".5"/>`;
  else if (pz !== 'calvo') arriba = `<path d="${top[pz] || top.corto}" fill="${H}"/>`;
  const bigote = `<path d="M43.5 53.5Q50 50.5 56.5 53.5Q50 55 43.5 53.5Z" fill="${H}"/>`;
  const barba = { corta: `<path d="M33 46Q33 67 50 68Q67 67 67 46Q65 59 57 60Q50 57 43 60Q35 59 33 46Z" fill="${H}" opacity=".88"/>${bigote}`,
    larga: `<path d="M33 46Q32 76 50 77Q68 76 67 46Q65 60 57 61Q50 58 43 61Q35 60 33 46Z" fill="${H}"/>${bigote}`,
    perilla: `<path d="M45 59Q50 67 55 59Q50 61.5 45 59Z" fill="${H}"/>${bigote}`, bigote,
    sombra: `<path d="M33 46Q33 67 50 68Q67 67 67 46Q65 59 57 60Q50 57 43 60Q35 59 33 46Z" fill="${H}" opacity=".28"/>` }[b] || '';
  return `<svg class="retrato" viewBox="0 0 100 100" aria-hidden="true">${atras}
    <path d="M6 100Q10 75 36 70L50 79L64 70Q90 75 94 100Z" fill="${C}"/><path d="M36 70L50 79L64 70L60 68L50 74L40 68Z" fill="${colorCss(cuello)}"/><path d="M6 100Q10 75 36 70L40 72Q22 80 20 100Z" fill="${Cd}" opacity=".6"/>
    <path d="M42 56H58V71Q50 77 42 71Z" fill="${Pd}"/>
    <ellipse cx="32" cy="46" rx="3.4" ry="5" fill="${Pd}"/><ellipse cx="68" cy="46" rx="3.4" ry="5" fill="${Pd}"/>
    <ellipse cx="50" cy="44" rx="17.5" ry="21.5" fill="${P}"/><path d="M60 26Q69 36 66 52Q63 62 55 65Q66 50 60 26Z" fill="#000" opacity=".07"/>
    ${arriba}
    <path d="M40 38.5Q43.5 36.5 47 38.3M53 38.3Q56.5 36.5 60 38.5" stroke="${pz === 'calvo' || look.pelo === 'b' || look.pelo === 'r' ? _osc(pelo, .6) : H}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="43.5" cy="43.5" rx="2.1" ry="1.5" fill="#1b1410"/><ellipse cx="56.5" cy="43.5" rx="2.1" ry="1.5" fill="#1b1410"/>
    <path d="M50 44.5Q48.3 50 49 51.6Q50.5 52.4 52.3 51.4" stroke="${Pd}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M45.5 57Q50 59.2 54.5 57" stroke="#7a3b2e" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    ${barba}</svg>`;
}

/* ---------- la carta ---------- */
const TIPOS_CARTA = { figura: 'Figura', leyenda: 'Leyenda', flashback: 'Flashback', cumbre: 'Cumbre', promesa: 'Promesa' };
const claseDeCarta = c => TIPOS_CARTA[c.tipo] ? c.tipo : c.med >= 75 ? 'oro' : c.med >= 65 ? 'plata' : 'bronce';
const etiquetaCarta = c => TIPOS_CARTA[c.tipo] ? TIPOS_CARTA[c.tipo] + (c.etq && c.tipo !== 'promesa' && c.tipo !== 'figura' && c.etq !== 'La cima' ? ' ' + c.etq : '') : '';
// completa una carta (también las guardadas por versiones anteriores, que no tenían estos datos)
function completarCarta(c) {
  if (c.st && c.look) return c;
  const j = c.j != null && APP.mundo ? APP.mundo.jug[c.j] : null;
  const at = c.at || (j && j.at) || {};
  if (!c.st) {
    if (c.pos === 'POR') { const p = at.par || c.med; c.st = { est: p + 1, man: p - 1, saq: at.pas || p - 12, ref: p + 2, vel: at.vel || p - 34, col: p }; }
    else { const fis = c.med + (PERFIL_CARTA[c.pos] || PERFIL_CARTA.MC).fis + (_hash(c.nombre + c.uid) % 9) - 4; c.st = { rit: at.vel, tir: at.tir, pas: at.pas, reg: at.reg, def: at.def, fis: Math.round(clamp(fis, 25, 95)) }; }
  }
  const h = _hash((c.nombre1 || '') + c.nombre);
  if (!c.hab) c.hab = habPorRegate(c.st.reg || 0, c.pos);
  if (!c.pm) c.pm = 2 + (h % 3);
  if (!c.pie) c.pie = h % 5 ? 'D' : 'I';
  if (!c.look) c.look = aspectoGenerico({ nombre: c.nombre, nombre1: c.nombre1, id: c.j, piel: c.piel, pelo: c.pelo });
  if (!c.tipo) c.tipo = 'normal';
  return c;
}
// crea una carta a partir de una entrada de la base de estrellas
function cartaDeEstrella(e) {
  const st = statsCarta(e.pos, e.med, e.arq, e.nombre);
  const club = clubCarta(e.club);
  return { tipo: e.tipo, etq: e.etq || '', s: e.clave, nombre: e.corto, nombre1: '', completo: e.nombre, pos: e.pos, med: e.med, nac: e.nac, club: club.nombre, liga: club.liga,
    st, at: atribMotor(e.pos, st), hab: e.hab, pm: e.pm, pie: e.pie, num: e.num, look: { ...e.look },
    piel: PIEL_CARTA[e.look.piel], pelo: PELO_CARTA[e.look.pelo] || 0x15110f };
}
const estrellitas = n => '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';
function cartaHTML(c, extra = '', sel = false, grande = false, acc = null, mini = false) {
  completarCarta(c);
  const club = clubCarta(c.club), clase = claseDeCarta(c), S = c.pos === 'POR' ? STATS_POR : STATS_CAMPO;
  const foto = c.j != null && APP.mundo && APP.mundo.jug[c.j] && APP.mundo.jug[c.j].foto;
  return `<button class="fc fc-${clase} ${sel ? 'sel' : ''} ${grande ? 'fc-grande' : ''} ${mini ? 'fc-mini' : ''}" ${acc || `data-acc="carta" data-uid="${c.uid}"`} aria-label="${esc(c.completo || c.nombre)} ${c.med}">
    <span class="fc-brillo"></span>
    <span class="fc-izq"><b class="fc-med">${c.med}</b><span class="fc-pos">${c.pos}</span>${banderaSVG(c.nac)}${escudoHTML(club, 22)}</span>
    <span class="fc-foto">${foto ? `<img src="${foto}" alt="">` : retratoSVG(c.look, club.camiseta, club.camiseta2 === club.camiseta ? club.pantalon : club.camiseta2)}</span>
    ${TIPOS_CARTA[c.tipo] ? `<span class="fc-tipo">${etiquetaCarta(c)}</span>` : ''}
    <span class="fc-nom">${esc(c.nombre)}</span>
    <span class="fc-st">${S.map(([k, t]) => `<span><b>${c.st[k]}</b> ${t}</span>`).join('')}</span>
    <span class="fc-pie"><span title="Habilidad">${c.hab}★ HAB</span><span title="Pie malo">${c.pm}★ PM</span><span>${c.pie === 'I' ? 'ZUR' : 'DIE'}</span></span>
    ${extra}</button>`;
}

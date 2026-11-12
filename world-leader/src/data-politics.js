/* =====================================================================
   WORLD LEADER · DATOS · POLÍTICA AMPLIADA (Fase 2)
   Ejes ideológicos de partidos y leyes, sectores nuevos y campaña.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  // Cuatro ejes, de -2 a 2
  D.AXES = { eco: ['Izquierda', 'Derecha'], val: ['Progresista', 'Conservador'], nac: ['Globalista', 'Nacionalista'], est: ['Estado mínimo', 'Estado fuerte'] };
  // [economía, valores, nacionalismo, Estado] por partido ("ISO:Nombre" tiene prioridad sobre "Nombre").
  // Lo no listado se deriva de su ideología general. Todo aproximado: corrígelo en Editor → Partidos.
  D.PARTY_AX = {
    'Partido Republicano': [2, 2, 2, -1], 'Partido Demócrata': [-1, -2, -1, 1], Morena: [-1, 0, 1, 2], PAN: [1, 2, 0, -1], PRI: [0, 0, 1, 1], 'Movimiento Ciudadano': [0, -1, -1, 0], PVEM: [0, 0, 0, 1], 'MX:PT': [-2, 0, 1, 2],
    'BR:PT': [-1, -1, 0, 2], PL: [2, 2, 2, -1], 'CDU/CSU': [1, 1, 0, 0], SPD: [-1, -1, -1, 1], AfD: [1, 2, 2, 0], 'Los Verdes': [-1, -2, -2, 1], 'Die Linke': [-2, -1, 0, 2],
    BJP: [1, 2, 2, 1], 'Congreso (INC)': [-1, -1, 0, 1], 'Rusia Unida': [1, 2, 2, 2], 'Partido Comunista (PCFR)': [-2, 1, 2, 2], LDPR: [1, 2, 2, 1], 'Partido Comunista de China': [-1, 1, 2, 2],
    'Partido Laborista': [-1, -1, -1, 1], 'Partido Conservador': [1, 1, 1, -1], 'Reform UK': [1, 2, 2, -1], 'Liberal Demócratas': [0, -2, -2, 0], SNP: [-1, -1, 1, 1],
    'Ensemble (Renacimiento)': [1, -1, -2, 0], 'Agrupación Nacional': [0, 1, 2, 1], 'Nuevo Frente Popular': [-2, -2, -1, 2], 'Los Republicanos': [1, 1, 1, -1],
    PSOE: [-1, -2, -1, 1], PP: [1, 1, 0, -1], Vox: [1, 2, 2, -1], Sumar: [-2, -2, -1, 2], Junts: [1, 0, 2, 0], 'EH Bildu': [-2, -1, 1, 2], PNV: [0, 0, 1, 0], ERC: [-1, -1, 1, 1],
    'Hermanos de Italia': [1, 2, 2, 1], 'Partido Democrático': [-1, -2, -2, 1], 'Movimiento 5 Estrellas': [-1, -1, 0, 2], Lega: [1, 2, 2, 0], 'Forza Italia': [1, 0, -1, -1],
    'La Libertad Avanza': [2, 1, 0, -2], 'Unión por la Patria': [-1, -1, 1, 2], PRO: [1, 0, -1, -1], UCR: [0, -1, 0, 0],
    'Defensores de la Patria': [2, 2, 1, -1], 'Pacto Histórico': [-2, -2, 0, 2], 'Centro Democrático': [2, 2, 1, -1], 'Partido Liberal': [-1, -1, -1, 1],
    PLD: [1, 1, 2, 1], AKP: [1, 2, 2, 1], CHP: [-1, -1, 0, 1], Likud: [1, 1, 2, 0], 'Fuerza Popular': [2, 2, 1, 0], ANC: [-1, 0, 1, 2]
  };
  // Leyes: [valores, nacionalismo] (economía ya está en la ley; Estado = -economía salvo que se indique un tercer valor)
  D.LAW_AX = {
    edu_religiosa: [2, 0], edu_laica: [-2, 0], lib_culto: [-1, 0], rel_oficial: [2, 1], net_libre: [-1, -1], net_control: [1, 1, 2], vj_restriccion: [1, 0], mano_dura: [1, 1, 1], vigilancia: [1, 1, 2],
    servicio_militar: [1, 2, 1], gasto_defensa: [0, 2, 1], proteccionismo: [0, 2, 1], libre_comercio: [0, -2, -1], fronteras_abiertas: [-1, -2], fronteras_cerradas: [1, 2, 1], prensa_libre: [-1, 0, -1],
    reeleccion: [0, 1, 2], transicion_verde: [-1, -1, 1], salud_universal: [-1, 0, 2], reforma_agraria: [-1, 1, 1], nacionalizar: [0, 2, 2], privatizar: [0, -1, -2], desregular: [0, 0, -2], renta_basica: [-1, 0, 2]
  };
  // Cuatro sectores nuevos (total 12) y cómo les afecta cada ley
  Object.assign(D.SECTORS, { sin: { n: 'Sindicatos', w: .06 }, pre: { n: 'Medios', w: .04 }, tec: { n: 'Sector tecnológico', w: .05 }, min: { n: 'Minorías', w: .07 } });
  const SEC2 = {
    edu_publica: { sin: 4, min: 5 }, becas_tec: { tec: 8 }, edu_religiosa: { min: -6, pre: -2 }, edu_laica: { min: 3 }, salario_min: { sin: 10 }, privatizar: { sin: -10, tec: 3 }, nacionalizar: { sin: 6, tec: -4 },
    renta_basica: { sin: 4, min: 6 }, desregular: { sin: -8, tec: 7 }, imp_fortunas: { sin: 5, tec: -5 }, imp_recorte: { tec: 5 }, iva: { sin: -4, min: -3 }, lib_culto: { min: 8 }, rel_oficial: { min: -12, pre: -4 },
    pymes: { tec: 3 }, antimonopolio: { tec: -6, pre: 3 }, libre_comercio: { sin: -7, tec: 6 }, proteccionismo: { sin: 6, tec: -5 }, net_libre: { tec: 8, pre: 6 }, net_control: { tec: -10, pre: -12, min: -5 }, banda_ancha: { tec: 7 },
    vj_industria: { tec: 6 }, vj_restriccion: { tec: -4 }, esports: { tec: 2 }, salud_universal: { sin: 5, min: 6 }, salud_privada: { sin: -5, min: -5 }, mano_dura: { min: -8, pre: -2 }, policia_comunitaria: { min: 5 },
    vigilancia: { tec: -5, pre: -8, min: -6 }, servicio_militar: { min: -3 }, gasto_defensa: { tec: 3, sin: -2 }, edad_jubilacion: { sin: -10 }, reforma_agraria: { min: 4 }, transicion_verde: { tec: 5, sin: -3 },
    fronteras_abiertas: { min: 10, sin: -4, tec: 5 }, fronteras_cerradas: { min: -12, tec: -4 }, prensa_libre: { pre: 14 }, reeleccion: { pre: -10, min: -3 }
  };
  D.LAWS.forEach(l => { Object.assign(l.sec = l.sec || {}, SEC2[l.id]); });
  // Cómo reaccionan los sectores a los actos de política exterior
  D.SEC_ACTS = {
    com: { emp: 2, tec: 2, sin: -2, rur: -1 }, pna: { min: 1, jov: 1 }, ali: { mil: 3, jov: -1 }, def: { mil: 4, jov: -1 }, terr: { mil: -2 },
    warAtt: { mil: 5, jov: -5, min: -3, pre: -3, emp: -2, rel: -1 }, warDef: { mil: 3, obr: 2, rur: 2, jub: 2 }, sanction: { emp: -2, tec: -1, mil: 1 }
  };
  // Campaña electoral: mensajes (ok = cuándo conecta con el país), sectores que moviliza
  D.CAMPAIGN = {
    eco: { n: 'Prosperidad', d: 'Presumes de economía. Funciona si el país crece.', sec: ['emp', 'med', 'obr'] },
    seg: { n: 'Orden y seguridad', d: 'Mano firme. Funciona con inestabilidad o en guerra.', sec: ['jub', 'mil', 'med'] },
    cam: { n: 'Cambio social', d: 'Derechos y futuro. Funciona si jóvenes y minorías ya te miran bien.', sec: ['jov', 'min', 'sin'] },
    pat: { n: 'Patria y soberanía', d: 'La nación primero. Funciona si te ven fuerte ante el exterior.', sec: ['rur', 'rel', 'mil'] }
  };
  D.SPEND = [['Austera', 0, 0], ['Normal', .3, 2.5], ['Millonaria', .8, 5]]; // nombre, % del PIB, puntos
  // Países de régimen parlamentario (moción de censura); en el resto es juicio político
  D.PARLIAMENTARY = 'GB,DE,IT,ES,JP,IN,CA,AU,NZ,NL,BE,SE,NO,DK,FI,IE,PT,GR,IL,PL,CZ,HU,AT,TH,MY,SG,PK,BD,NP,IQ,ZA,ET,HR,RS,BG,RO,SK,SI,EE,LV,LT,LU,IS,MT'.split(',');
})();

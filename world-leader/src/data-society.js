/* =====================================================================
   WORLD LEADER · DATOS · SOCIEDAD (Fase 3 del interior)
   Debates sociales con opinión pública que se mueve (-100 en contra …
   +100 a favor de la reforma), movimientos que protestan si los ignoras,
   y la educación como inversión a largo plazo. Motor: 7t-society.js.
   pro/con: leyes que te colocan a favor o en contra. prog: +1 si la
   gente más educada tiende a apoyarla, -1 si tiende a rechazarla.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA, fx = D.fx;
  D.LAWS.push({ id: 'aborto', cat: 'sal', n: 'Aborto legal', d: 'Interrupción voluntaria del embarazo en la sanidad pública.', eco: 0, auth: -.5, sec: { jov: 6, med: 2, rel: -12, jub: -3 }, rep: { dem: 3 } });
  D.DEBATES = {
    aborto: { n: 'Aborto', q: 'el aborto legal', prog: 1, pro: ['aborto'], con: [] },
    pena: { n: 'Pena de muerte', q: 'la pena de muerte', prog: -1, pro: ['pena_muerte'], con: [] },
    drogas: { n: 'Drogas', q: 'legalizar las drogas', prog: .6, pro: ['cannabis'], con: [], natLegal: 1 },
    matrimonio: { n: 'Matrimonio igualitario', q: 'el matrimonio igualitario', prog: 1, pro: ['matrimonio'], con: [] },
    migracion: { n: 'Migración', q: 'abrir las fronteras', prog: .4, pro: ['fronteras_abiertas'], con: ['fronteras_cerradas'] },
    laicidad: { n: 'Laicidad', q: 'separar Iglesia y Estado', prog: .8, pro: ['lib_culto', 'edu_laica'], con: ['rel_oficial'] }
  };
  /* movimientos que no son un debate: nacen de cómo va el país */
  D.MOVES = {
    huelga: { n: 'Sindicatos', why: 'Desigualdad alta y recortes sociales', t: 'Huelga general', x: 'Los sindicatos paralizan fábricas, puertos y transporte. Exigen salarios dignos y que se acaben los recortes.' },
    estud: { n: 'Estudiantes', why: 'Recortes en educación', t: 'Las universidades, tomadas', x: 'Miles de estudiantes ocupan los campus y marchan hacia el palacio de gobierno contra los recortes educativos.' }
  };
  D.SOC = {
    opDrift: .012, opNoise: 1.5, gapAt: 25, mvK: .08, mvDecay: 2, protestAt: 55, protestP: .18, stabAt: 40, stabK: .012,
    lead: { cp: 1, op: 10, cd: 4 }, eduK: .04, eduRp: .05,
    opts: [
      ['Dialogar con los líderes', 'cp-1', { mv: -35 }],
      ['Prometer cambios', 'sec.all+2;party.opp-1', { mv: -50, promise: 1 }],
      ['Reprimir las protestas', 'rep.dem-3;sec.jov-4', { mv: -60, ix: { ins: -6, coh: -5 }, back: 1 }]
    ],
    promiseTurns: 8, backP: .35
  };
})();

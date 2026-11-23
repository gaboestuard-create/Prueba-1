/* =====================================================================
   WORLD LEADER · DATOS · RUTAS MARÍTIMAS Y ESTRECHOS (aproximado)
   ctrl: quién puede cerrarlo · goods: materias primas que se encarecen al cerrarse
   users: regiones cuyo comercio depende de él (y cuánto: 0-1)
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  D.STRAITS = [
    { id: 'ormuz', n: 'Estrecho de Ormuz', la: 26.6, lo: 56.3, ctrl: ['IR', 'OM'], goods: { pet: 1.06, gas: 1.05 }, users: { ASI: .35, EUR: .2, MOR: .4, AMN: .1 }, x: 'Por aquí pasa una quinta parte del petróleo del mundo.' },
    { id: 'suez', n: 'Canal de Suez', la: 30.6, lo: 32.3, ctrl: ['EG'], goods: { pet: 1.02 }, users: { EUR: .3, ASI: .2, MOR: .15, AFR: .1 }, x: 'El atajo entre Europa y Asia.' },
    { id: 'bab', n: 'Bab el-Mandeb', la: 12.6, lo: 43.3, ctrl: ['YE', 'DJ', 'ER'], goods: { pet: 1.02 }, users: { EUR: .2, ASI: .1, AFR: .1 }, x: 'La puerta sur del mar Rojo, camino de Suez.' },
    { id: 'malaca', n: 'Estrecho de Malaca', la: 2.5, lo: 101.5, ctrl: ['MY', 'ID', 'SG'], goods: { pet: 1.03, tie: 1.04 }, users: { ASI: .4, OCE: .2, EUR: .1 }, x: 'La arteria del comercio asiático.' },
    { id: 'taiwan', n: 'Estrecho de Taiwán', la: 24, lo: 119.5, ctrl: ['CN'], goods: { tie: 1.06 }, users: { ASI: .3, AMN: .15, EUR: .1 }, x: 'Ruta de los chips y la electrónica del mundo.' },
    { id: 'panama', n: 'Canal de Panamá', la: 9.1, lo: -79.7, ctrl: ['PA'], goods: { caf: 1.02 }, users: { AMN: .2, AMC: .3, AMS: .25, ASI: .1 }, x: 'Une el Atlántico y el Pacífico.' },
    { id: 'bosforo', n: 'Bósforo', la: 41.1, lo: 29.05, ctrl: ['TR'], goods: { tri: 1.05, pet: 1.02 }, users: { EUR: .1, MOR: .1 }, x: 'La salida del mar Negro: grano y petróleo.' },
    { id: 'gibraltar', n: 'Estrecho de Gibraltar', la: 35.95, lo: -5.6, ctrl: ['ES', 'MA'], goods: {}, users: { EUR: .15, AFR: .1, MOR: .05 }, x: 'La entrada al Mediterráneo.' }
  ];
  D.STR = { aiCloseP: .025, piracyP: .012, calm: 10, minTurns: 3, maxTurns: 8, closeCp: 2, closeConf: -12, closeRel: -15, escortCost: .002, escortNavy: 60, pressCp: 1, tradeHit: .6, gdpHit: .0015 };
})();

/* =====================================================================
   WORLD LEADER · DATOS · GABINETE Y SUCESIÓN
   D.MIN: cuatro ministerios y qué mejora cada punto de competencia (1-5).
   D.MTRAIT: rasgos de los ministros. D.AGE: edad, salud y sucesión.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  D.MIN = {
    eco: { n: 'Economía', ic: 'eco', per: { income: .012 }, x: '+1,2% de recaudación por punto' },
    ext: { n: 'Exteriores', ic: 'acuerdo', per: { relGain: .03 }, x: '+3% a las mejoras de relación por punto' },
    def: { n: 'Defensa', ic: 'mil', per: { atk: .02 }, x: '+2% de fuerza militar por punto' },
    int: { n: 'Interior', ic: 'seg', per: { stabT: .04 }, x: '+0,04 de estabilidad por turno por punto' }
  };
  D.MTRAIT = {
    tecnocrata: { n: 'Tecnócrata', x: 'Muy competente, poco político', comp: 1, loy: -5 },
    leal: { n: 'Leal', x: 'Nunca te traicionará', loy: 30 },
    ambicioso: { n: 'Ambicioso', x: 'Brillante, pero quiere tu sillón', comp: 1, loy: -25, ambition: 1 },
    corrupto: { n: 'Corrupto', x: 'Consigue cosas… y escándalos', comp: 1, scandal: .08 },
    popular: { n: 'Popular', x: 'La gente lo quiere: +1 punto en las elecciones', elect: 1 },
    gris: { n: 'Gris', x: 'Ni bueno ni malo' }
  };
  D.CAB = { candidates: 3, refresh: 8, hireCp: 1, fireLoy: -6, betrayLoy: 25, betrayAppr: 42, betrayP: .08, scandalCd: 6 };
  D.AGE = { start: [48, 66], sickFrom: 66, sickP: .012, sickPerYear: .006, deathHealth: 0, recover: 3, heirNeeded: 1 };
})();

/* =====================================================================
   WORLD LEADER · DATOS · SEGURIDAD NACIONAL (Fase 2 del interior)
   Inteligencia interna (vigilancia, director, operaciones), las tres ramas
   de las fuerzas armadas con su jefe, moral y modernización, y el interior
   resumido de los países de la IA. Motor: src/engine/7s-security.js.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA, fx = D.fx, O = o => o.map(x => ({ t: x[0], fx: fx(x[1]), sx: x[2] || {} }));
  D.SECINT = {
    surv: { n: ['Sin vigilancia interna', 'Vigilancia selectiva', 'Vigilancia masiva'], cost: .0012, ix: { seg: 4, cri: -4, ins: -4 }, scandalP: .03 },
    ops: {
      inf: { n: 'Infiltrar un cártel', cp: 1, p: .35, pLvl: .12, str: -16, cash: .6, d: 'Agentes encubiertos dentro del cártel. Si sale bien, golpe enorme; si sale mal, pierdes agentes.' },
      caza: { n: 'Cazar espías extranjeros', cp: 1, p: .45, pLvl: .1, d: 'Desarticular redes extranjeras en tu país: confianza y prestigio.' },
      corr: { n: 'Investigar corrupción', cp: 1, p: .5, pLvl: .1, cor: -6, d: 'Expedientes contra funcionarios corruptos. Puede salpicar a tu partido.' }
    },
    opCd: 3, dir: { loy: [50, 80], comp: [35, 85], replaceCp: 2, blackmailAt: 30, blackmailP: .06 }
  };
  D.BRANCH = {
    tierra: { n: 'Ejército', ic: 'tan', chief: 'Gral.' },
    mar: { n: 'Armada', ic: 'naval', chief: 'Alm.' },
    aire: { n: 'Fuerza Aérea', ic: 'caz', chief: 'Gral.' }
  };
  D.BR = {
    drift: .12, start: [50, 70], loy: [55, 80],
    /* qué mueve la moral de cada rama */
    law: { sueldo_militar: 10, gasto_defensa: 5, servicio_militar: -3, desarme: -8 },
    streets: -5, warWin: 8, warLose: -12, atWar: -3,
    /* moral y modernización → poder: (1 - k) + moral/100 × 2k, cada nivel de modernización suma mod */
    k: .15, mod: .05, modMax: 3, modGdp: .01, modTurns: 4, chiefCp: 1,
    coupAt: 30, coupStab: 45, coupP: .08
  };
  D.SEC_EV = {
    espionaje: { t: 'Escándalo: espiabas a la oposición', x: 'Un exagente filtra que la agencia intervino los teléfonos de periodistas y opositores. Las portadas no hablan de otra cosa.',
      opts: O([['Desmantelar la vigilancia masiva', 'rep.dem+2;sec.jov+2', { surv: 0, ins: 4 }], ['Culpar al director y destituirlo', 'cp-1', { dir: 1, ins: -2 }], ['Defenderla: «es por su seguridad»', 'rep.dem-4;sec.jov-5;sec.mil+2', { ins: -8 }]]) },
    chantaje: { t: 'El director de inteligencia te chantajea', x: '{N} te recuerda en privado todo lo que sabe. A cambio de su silencio quiere más presupuesto y manos libres.',
      opts: O([['Destituirlo, cueste lo que cueste', 'cp-2', { dir: 1, ins: -4 }], ['Ceder a sus exigencias', '$g-.2', { surv: 2, cor: 4, loy: 25 }]]) },
    sables: { t: 'Ruido de sables', x: 'Los jefes militares se reúnen sin avisarte. {N} habla en televisión de «salvar a la patria». Tu ministro de Defensa no contesta el teléfono.',
      opts: O([['Subir sueldos y presupuesto militar', '$g-.4;sec.mil+6', { loy: 15, mor: 8 }], ['Purgar la cúpula militar', 'cp-2;sec.mil-6;stab-3', { purge: 1 }], ['Ignorarlo: «son solo rumores»', 'chance.5{stab-2}{stab-12;cp-2;sec.all-4}', {}]]) }
  };
  /* interior resumido de los países de la IA (0-100) */
  D.AINT = { every: 2, k: .15, war: { seg: -12, coh: -6 }, sanc: { coh: -4 }, effGrow: .003, growCap: .3, effStab: .01,
    weakCoh: 35, weakSeg: 30, warSkip: .6,
    treaty: { cor: [60, 6, 'Gobierno corrupto: se deja agasajar'], coh: [35, -10, 'Su opinión pública está dividida'], seg: [35, 8, 'Buscan apoyo para su seguridad'] },
    aidBonus: 6, askCoh: 35 };
})();

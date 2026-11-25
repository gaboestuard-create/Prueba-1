/* =====================================================================
   WORLD LEADER · DATOS · ESTADO DE LA NACIÓN (Fase 1 del interior)
   Indicadores del país (0-100), gasto interno por partidas, policía,
   ejército en las calles y cárteles. Motor: src/engine/7r-nation.js.
   bad: 1 → cuanto más alto, peor (crimen, corrupción, desigualdad).
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA, fx = D.fx, O = o => o.map(x => ({ t: x[0], fx: fx(x[1]), nat: x[2] || {} }));
  D.NAT_IX = {
    seg: { n: 'Seguridad pública', ic: 'seg', d: 'Lo seguras que se sienten las calles.' },
    cri: { n: 'Crimen organizado', ic: 'ofensiva', bad: 1, d: 'Poder de cárteles y mafias.' },
    cor: { n: 'Corrupción', ic: 'oro', bad: 1, d: 'Sobornos, desvíos y favores en el Estado.' },
    edu: { n: 'Educación', ic: 'edu', d: 'Calidad de escuelas y universidades. Tarda años en moverse.' },
    sal: { n: 'Salud', ic: 'sal', d: 'Hospitales, médicos y esperanza de vida.' },
    inf: { n: 'Infraestructura', ic: 'obras', d: 'Carreteras, energía, agua y transporte.' },
    des: { n: 'Desigualdad', ic: 'eco', bad: 1, d: 'Distancia entre ricos y pobres.' },
    coh: { n: 'Cohesión social', ic: 'paz', d: 'Cuánto confían los ciudadanos unos en otros.' },
    ins: { n: 'Confianza en las instituciones', ic: 'acuerdo', d: 'Fe en tribunales, congreso y gobierno.' }
  };
  D.NAT = {
    drift: .1, slow: { edu: .035, inf: .05 }, noise: 1.2,
    /* punto de partida según renta por habitante (pobre → rica) y régimen */
    start: { seg: [38, 72], cri: [55, 20], cor: [62, 22], edu: [40, 78], sal: [42, 80], inf: [35, 78], des: [62, 35], coh: [48, 62], ins: [38, 60] },
    /* partidas de gasto: nivel 0–2 (1 = lo normal). Cada punto por encima cuesta gdp × coste por turno y mueve el objetivo de cada indicador */
    bud: {
      seg: { n: 'Seguridad y justicia', cost: .004, ix: { seg: 14, cri: -6, ins: 3 } },
      edu: { n: 'Educación', cost: .006, ix: { edu: 18, des: -4, coh: 2 } },
      sal: { n: 'Salud', cost: .005, ix: { sal: 18, coh: 3 } },
      inf: { n: 'Infraestructura', cost: .005, ix: { inf: 18, cor: 3 } },
      soc: { n: 'Programas sociales', cost: .004, ix: { des: -14, coh: 8, cri: -3 } }
    },
    /* leyes que ya existen y empujan los indicadores */
    law: {
      mano_dura: { seg: 6, ins: -4, coh: -3 }, policia_comunitaria: { seg: 4, coh: 4, ins: 2 }, vigilancia: { seg: 3, ins: -5 }, armas_civiles: { seg: -6, cri: 3 }, desarme: { seg: 4, cri: -2 },
      anticorrupcion: { cor: -14, ins: 6 }, pena_muerte: { seg: 2, ins: -3 }, transparencia: { cor: -8, ins: 5 }, prensa_libre: { cor: -4, ins: 3 }, control_medios: { cor: 6, ins: -6 },
      edu_publica: { edu: 8, des: -4 }, becas_tec: { edu: 5 }, edu_religiosa: { edu: -2, coh: 2 }, edu_laica: { edu: 2 }, salud_universal: { sal: 10, des: -4 }, salud_privada: { sal: 3, des: 6 }, vacunas: { sal: 4 },
      cannabis: { cri: -4, sal: -1 }, renta_basica: { des: -10, coh: 4 }, salario_min: { des: -5 }, imp_fortunas: { des: -6 }, imp_recorte: { des: 5 }, privatizar: { des: 4, cor: 3 }, vivienda: { des: -4, coh: 3 },
      agua: { inf: 4, sal: 3 }, puertos: { inf: 4 }, tren_rapido: { inf: 6 }, presa: { inf: 3 }, central_nuclear: { inf: 4 }, banda_ancha: { inf: 4, edu: 2 }, guarderias: { coh: 3, edu: 2 },
      fronteras_abiertas: { coh: -3 }, matrimonio: { coh: 1 }, centralizar: { cor: 2 }, reeleccion: { ins: -5 }
    },
    /* cómo pesan los indicadores (desviación respecto a 50) */
    eff: { grow: { edu: .004, inf: .005, cor: -.005, cri: -.004, sal: .002 }, growCap: .5, stab: { seg: .012, coh: .012, ins: .008, cri: -.01 }, elect: { ins: .04, seg: .03 },
      sec: { med: ['seg', .012], jov: ['edu', .01], jub: ['sal', .012], obr: ['des', -.012], emp: ['cor', -.01] } },
    police: { pay: { cost: .0015, seg: 6, cor: -8 }, eq: { gdp: .004, max: 3, seg: 4 }, purge: { cp: 2, cor: -12, seg: -6, cd: 8 } },
    army: { cp: 1, cost: .0008, max: 3, seg: 3, cri: -2, cart: -7, rl: -8, mil: .3, dem: -2, abuseP: .05 },
    cart: {
      narco: ['MX', 'CO', 'BR', 'VE', 'PE', 'EC', 'HN', 'GT', 'SV', 'BO', 'PY', 'JM', 'NG', 'AF', 'MM', 'PH', 'IT', 'AL', 'ZA', 'NI', 'DO', 'PA', 'CR', 'TH', 'LA'],
      names: ['Los Halcones del Norte', 'La Hermandad', 'Cártel del Golfo Negro', 'Los Herederos', 'La Familia del Valle', 'Clan de la Sierra', 'Los Ángeles Rojos', 'Cártel de la Costa', 'La Compañía', 'Los Señores del Puerto', 'La Nueva Frontera', 'Los Tres Ríos'],
      grow: .04, criMid: 55, drift: .6, cap: 110, maxN: 3, spawnP: .03, spawnCri: 64, criW: .22, rlW: .12, dieAt: 4,
      eventP: .07, exposeP: .05, pactTurns: 12, pactSeg: 8, pactCor: 7,
      acts: {
        guerra: { n: 'Ofensiva frontal', cp: 1, gdp: .003, str: -12, seg: -4, backP: .35, d: 'Golpe directo. Baja su fuerza, pero la violencia se dispara a corto plazo.' },
        fin: { n: 'Golpear sus finanzas', cp: 1, gdp: .001, str: -5, cash: .5, cor: -2, d: 'Congelar cuentas y lavado. Lento pero sin balas.' },
        pacto: { n: 'Pacto secreto', cp: 2, d: 'Baja la violencia ya. Sube la corrupción y, si se descubre, el escándalo es enorme.' }
      },
      legal: { cp: 3, str: -1.5, sec: { jov: 6, rel: -8, jub: -4 }, us: -10, sal: -2, d: 'Legalizar y regular las drogas. Seca el negocio poco a poco; incomoda a los religiosos y a Washington.' }
    }
  };
  /* decisiones: [texto, efectos, cambios en la nación {ix:{..}, str: fuerza del cártel}] */
  D.NAT_EV = {
    abuso: { t: 'Abusos del ejército en {R}', x: 'Un video muestra a soldados golpeando a civiles desarmados en un control de {R}. Las organizaciones de derechos humanos exigen la retirada.',
      opts: O([['Juicio militar a los responsables', 'sec.mil-4;rep.dem+2', { ix: { ins: 3 } }], ['Retirar al ejército de la región', 'sec.mil-2', { out: 1, ix: { ins: 2 } }], ['Respaldar a la tropa', 'sec.mil+4;rep.dem-4;sec.jov-4', { ix: { ins: -6, coh: -3 } }]]) },
    atentado: { t: '{C} ataca en {R}', x: '{C} ha detonado un coche bomba frente a la comandancia de {R}. Hay muertos y el país entero mira al gobierno.',
      opts: O([['Desplegar fuerzas especiales', '$g-.2;sec.mil+2', { str: -8, ix: { seg: -2 } }], ['Mensaje de unidad nacional', 'sec.all+1;cp-1', { ix: { coh: 4 } }], ['Negociar una tregua discreta', '', { str: 3, ix: { seg: 4, cor: 5 } }]]) },
    soborno: { t: 'Sobornos de {C}', x: 'La fiscalía descubre que mandos de la policía de {R} cobraban de {C}. El jefe del cártel se ríe en una grabación filtrada.',
      opts: O([['Depurar la policía local', 'cp-1', { ix: { cor: -5, seg: -3 } }], ['Taparlo para no alarmar', '', { ix: { cor: 6, ins: -2 } }], ['Destituir al ministro del ramo', 'sec.all+2;party.opp-1', { ix: { ins: 4 } }]]) },
    expuesto: { t: 'Se descubre tu pacto con {C}', x: 'Un periódico publica audios de tus enviados negociando con {C}. La oposición pide tu cabeza.',
      opts: O([['Pedir perdón y romper el pacto', 'sec.all-4;rep.dem+1', { ix: { ins: -8 } }], ['Negarlo todo', 'chance.5{sec.all-1}{sec.all-8;rep.conf-4}', { ix: { ins: -12 } }]]) },
    nuevo: { t: 'Nace un nuevo cártel en {R}', x: 'El crimen se ha disparado: un grupo llamado {C} controla ya las rutas de {R} y recluta a jóvenes sin trabajo.',
      opts: O([['Prioridad nacional: ir por ellos', '$g-.2', { str: -10 }], ['Vigilar y esperar', '', {}]]) }
  };
})();

/* =====================================================================
   WORLD LEADER · DATOS · LEYES Y GOBIERNO (pulido)
   Leyes nuevas, megaproyectos (build = turnos de obra: pagan desde el
   primer día y rinden al terminar), misiones militares y ritmo político.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  D.LAWCATS.obr = 'Grandes obras';
  D.LAWS.push(
    // --- grandes obras: cuestan desde el inicio y solo rinden al terminar
    { id: 'tren_rapido', cat: 'obr', n: 'Red de trenes de alta velocidad', d: 'Conecta las grandes ciudades. Seis trimestres de obras.', build: 6, eco: -1, sec: { obr: 5, rur: 3, med: 3 }, per: { cost: .35, grow: .14 } },
    { id: 'central_nuclear', cat: 'obr', n: 'Central nuclear', d: 'Energía propia para medio siglo. Ocho trimestres de obras.', build: 8, eco: 0, sec: { tec: 5, jov: -4, emp: 4 }, per: { cost: .3, oilSave: .2, grow: .05 } },
    { id: 'presa', cat: 'obr', n: 'Gran presa y regadío', d: 'Agua para el campo y luz para las ciudades.', build: 5, eco: -1, sec: { rur: 9, min: -3 }, per: { cost: .2, prodMul: .08, grow: .04 } },
    { id: 'espacio', cat: 'obr', n: 'Programa espacial', d: 'Lanzadores propios y satélites. Prestigio y ciencia.', build: 10, eco: 0, sec: { tec: 9, jov: 5, mil: 4 }, rep: { gen: 3 }, per: { cost: .4, grow: .05, mil: .03 } },
    { id: 'muro', cat: 'obr', n: 'Muro fronterizo', d: 'Cientos de kilómetros de valla y vigilancia.', build: 4, eco: 1, auth: 1, sec: { rur: 6, obr: 3, min: -10, jov: -4 }, rep: { gen: -6 }, per: { cost: .15, stab: 2 } },
    { id: 'vivienda', cat: 'obr', n: 'Plan nacional de vivienda', d: 'Un millón de viviendas asequibles.', build: 5, eco: -1, sec: { jov: 8, obr: 6, emp: 2 }, per: { cost: .35, stab: 3, grow: .05 } },
    // --- economía y Estado
    { id: 'carbono', cat: 'imp', n: 'Impuesto al carbono', d: 'Quien contamina, paga.', eco: -1, sec: { jov: 6, emp: -5, rur: -4, obr: -2 }, rep: { gen: 4 }, per: { tax: 1, oilSave: .1 } },
    { id: 'subsidio_comb', cat: 'eco', n: 'Subsidio a los combustibles', d: 'Gasolina barata para todos.', eco: -1, grp: 'comb', sec: { rur: 8, obr: 6, jov: -3 }, per: { cost: .4, stab: 2 } },
    { id: 'banca_publica', cat: 'eco', n: 'Banca pública de desarrollo', d: 'Crédito barato para pymes y regiones pobres.', eco: -2, sec: { emp: -3, rur: 5, med: 3, sin: 3 }, per: { cost: .15, grow: .06 } },
    { id: 'zonas_francas', cat: 'ext', n: 'Zonas francas industriales', d: 'Impuestos mínimos para quien fabrique y exporte.', eco: 2, sec: { emp: 7, sin: -5, obr: 2 }, per: { tax: -.6, trade: .12, grow: .06 } },
    { id: 'semana4', cat: 'eco', n: 'Semana laboral de cuatro días', d: 'Mismo sueldo, un día menos.', eco: -1, sec: { obr: 8, jov: 7, sin: 6, emp: -9 }, per: { grow: -.05, stab: 2 } },
    { id: 'transparencia', cat: 'soc', n: 'Ley de transparencia', d: 'Contratos y cuentas públicas abiertas a todos.', eco: 0, auth: -.5, sec: { med: 6, pre: 6, emp: -2 }, rep: { conf: 6, dem: 4 }, per: { scandal: .2, stab: 1 } },
    { id: 'autonomia', cat: 'soc', n: 'Más autonomía regional', d: 'Las regiones recaudan y deciden más.', eco: 0, grp: 'terr', sec: { min: 6, rur: 4, mil: -4 }, per: { stab: 2, tax: -.4 } },
    { id: 'centralizar', cat: 'soc', n: 'Centralización del Estado', d: 'El gobierno nacional recupera competencias.', eco: 0, auth: .5, grp: 'terr', sec: { min: -8, mil: 4, rur: -3 }, per: { tax: .6, stab: -1 } },
    { id: 'regula_ia', cat: 'net', n: 'Regulación de la inteligencia artificial', d: 'Límites, auditorías y responsables con nombre.', eco: 0, sec: { tec: -6, med: 4, sin: 4 }, rep: { dem: 2 } },
    // --- sociedad y seguridad
    { id: 'matrimonio', cat: 'soc', n: 'Matrimonio igualitario', d: 'Mismos derechos para todas las parejas.', eco: 0, auth: -.5, sec: { jov: 7, min: 8, rel: -10 }, rep: { dem: 4 } },
    { id: 'cannabis', cat: 'sal', n: 'Legalización del cannabis', d: 'Venta regulada y con impuestos.', eco: 0, auth: -.5, sec: { jov: 8, rel: -8, jub: -4 }, per: { tax: .3, stab: 1 } },
    { id: 'pena_muerte', cat: 'seg', n: 'Pena de muerte', d: 'Para los crímenes más graves.', eco: 1, auth: 1, maj: .66, sec: { jub: 5, rur: 4, min: -8, jov: -6, rel: -2 }, rep: { dem: -12, gen: -6 } },
    { id: 'sueldo_militar', cat: 'mil', n: 'Aumento salarial a las Fuerzas Armadas', d: 'Soldados mejor pagados, cuarteles más leales.', eco: 0, sec: { mil: 14 }, per: { cost: .15, mil: .03 } },
    { id: 'control_medios', cat: 'soc', n: 'Ley de medios', d: 'Licencias, cuotas y un regulador del gobierno.', eco: 0, auth: 1, grp: 'prensa', sec: { pre: -14, rur: 3 }, rep: { dem: -10 }, per: { stab: 2, scandal: -.3 } }
  );
  Object.assign(D.LAW_AX, { tren_rapido: [0, 0, 1], central_nuclear: [0, 1, 1], muro: [1, 2, 1], espacio: [0, 2, 1], vivienda: [-1, 0, 2], carbono: [-1, -1, 1], subsidio_comb: [0, 1, 2], banca_publica: [0, 0, 2], zonas_francas: [0, -1, -1], semana4: [-1, 0, 1], transparencia: [-1, 0, 0], autonomia: [-1, -1, -1], centralizar: [1, 1, 2], regula_ia: [-1, 0, 1], matrimonio: [-2, -1], cannabis: [-2, -1, -1], pena_muerte: [2, 1, 1], sueldo_militar: [0, 2, 1], control_medios: [1, 1, 2] });

  // Ritmo político
  D.GOV = { cpBase: 2, lawLoad: 6, review: 16, sunset: 8, flipLock: 6, demandEvery: 3, oppEvery: 5, regionEvery: 16 };
  // Misiones militares (com = parte de tus fuerzas que inmovilizan)
  D.MISSIONS = {
    frontera: { n: 'Patrulla fronteriza', d: 'Tropas en la frontera con un vecino: disuade un ataque, pero lo tensa.', com: .12, tgt: 'vecino' },
    interior: { n: 'Seguridad interior', d: 'Militares en las calles: más orden, menos libertades.', com: .1, tgt: '' },
    ayuda: { n: 'Ayuda humanitaria', d: 'Ingenieros, hospitales y víveres para un país en apuros.', com: .05, tgt: 'cualquiera' },
    paz: { n: 'Misión de paz', d: 'Cascos azules entre dos ejércitos: enfría la guerra y da prestigio.', com: .1, tgt: 'guerra' },
    ejercicio: { n: 'Maniobras conjuntas', d: 'Entrenar con un aliado: más preparación y una alianza más sólida.', com: .06, tgt: 'aliado' }
  };
})();

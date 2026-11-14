/* =====================================================================
   WORLD LEADER · DATOS · FASE 3: GUERRA DETALLADA, LOGÍSTICA Y ESPIONAJE
   Todo editable. verificado:false → valores de diseño, no datos reales.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  /* ---- unidades nuevas (role = papel en el triángulo táctico) ---- */
  Object.assign(D.UNITS, {
    aa: { n: 'Antiaéreos', cat: 'tierra', pow: 1.5, cost: .4, up: .02, men: 400, res: { hie: 1 } },
    esp: { n: 'Fuerzas especiales', cat: 'tierra', pow: 2.5, cost: .6, up: .03, men: 300, res: {} },
    abm: { n: 'Defensa estratégica', cat: 'tierra', pow: .5, cost: 2, up: .08, men: 200, res: { tie: 1, hie: 1 } },
    tra: { n: 'Aviones de transporte', cat: 'aire', pow: .5, cost: .8, up: .04, men: 100, res: { pet: 1 } },
    des: { n: 'Destructores', cat: 'mar', pow: 7, cost: 2, up: .08, men: 300, res: { hie: 2 } },
    anf: { n: 'Buques de desembarco', cat: 'mar', pow: 2, cost: 1, up: .05, men: 400, res: { hie: 1 } }
  });
  D.ROLE = { inf: 'inf', tan: 'arm', art: 'art', aa: 'aa', esp: 'sf', abm: 'abm', caz: 'fig', bom: 'bmb', dro: 'dro', tra: 'tra', fra: 'esc', des: 'esc', sub: 'sub', por: 'car', anf: 'anf' };
  D.ROLEN = { inf: 'Infantería', arm: 'Blindados', art: 'Artillería', aa: 'Antiaéreos', sf: 'Fuerzas especiales', abm: 'Defensa estratégica', fig: 'Cazas y drones', bmb: 'Bombarderos', dro: 'Drones', tra: 'Transporte', esc: 'Escoltas', sub: 'Submarinos', car: 'Portaaviones', anf: 'Desembarco' };
  /* triángulo táctico: quién vence a quién (+35% contra la parte del enemigo que contrarresta) */
  D.BEATS = { arm: ['inf', 'sf'], inf: ['sf'], sf: ['art', 'aa'], art: ['inf', 'aa'], aa: ['fig', 'bmb', 'dro'], fig: ['bmb', 'arm', 'art', 'dro'], bmb: ['arm', 'art'], dro: ['arm', 'art'], esc: ['sub'], sub: ['car', 'anf'], car: ['esc', 'anf'] };
  /* ---- terreno: def = multiplicador del defensor; el resto, por papel ---- */
  D.TER = {
    lla: { n: 'Llanura', def: 1, arm: 1.15, fig: 1.1, bmb: 1.1 },
    mon: { n: 'Montaña', def: 1.4, arm: .6, inf: 1.15, sf: 1.3, fig: .85, bmb: .8, art: .9 },
    sel: { n: 'Selva', def: 1.3, arm: .65, inf: 1.1, sf: 1.35, fig: .75, bmb: .7 },
    des: { n: 'Desierto', def: 1, arm: 1.2, inf: .85, fig: 1.15, bmb: 1.15, sup: .8 },
    ciu: { n: 'Ciudad', def: 1.5, arm: .7, inf: 1.25, sf: 1.2, art: .9, fig: .9, bmb: .9, civ: 1 },
    cos: { n: 'Costa', def: 1.1, anf: 1.2, esc: 1.1 }
  };
  /* terreno fijo de algunas regiones conocidas (iso: {índice: terreno}); el resto se deduce */
  D.TER_OVR = { AF: { 0: 'mon' }, NP: { 0: 'mon' }, CH: { 0: 'mon' }, BO: { 0: 'mon' } };
  /* ---- clima por estación ---- */
  D.WX = {
    norm: { n: 'Despejado' },
    inv: { n: 'Invierno', arm: .85, fig: .8, bmb: .8, sup: .85 },
    llu: { n: 'Lluvias', arm: .8, fig: .7, bmb: .7 },
    cal: { n: 'Calor extremo', inf: .9, sup: .9 }
  };
  /* ---- órdenes por tipo de grupo (ej = ejército, es = escuadrón, fl = flota) ---- */
  D.GTYPE = { ej: { n: 'Ejército', cat: 'tierra', ic: 'inf' }, es: { n: 'Escuadrón', cat: 'aire', ic: 'caz' }, fl: { n: 'Flota', cat: 'mar', ic: 'fra' } };
  D.ORDERS = {
    atk: { n: 'Atacar', t: ['ej', 'es'], foe: 1, d: 'Combate por la región enemiga elegida. Los escuadrones dan apoyo aéreo cercano.' },
    adv: { n: 'Avanzar', t: ['ej'], foe: 1, d: 'Ataca con +10% de ímpetu y, si gana, sigue sola hacia la siguiente región. Cansa más.' },
    def: { n: 'Defender', t: ['ej'], d: 'Se atrinchera en una región tuya: +20% en defensa y aprovecha las fortificaciones.' },
    ret: { n: 'Retirarse', t: ['ej', 'es', 'fl'], d: 'Vuelve a casa: recupera suministro y moral, pero cede la iniciativa.' },
    blq: { n: 'Bloquear', t: ['fl'], d: 'Cierra sus puertos: corta su suministro y su economía. Requiere dominar el mar.' },
    bmb: { n: 'Bombardear', t: ['es', 'fl'], foe: 1, d: 'Castiga una región: destruye tropas, fortificaciones y suministro. Bombardear ciudades puede ser un crimen de guerra.' },
    lnd: { n: 'Desembarcar', t: ['ej'], foe: 1, d: 'Asalto anfibio a una región costera. Requiere buques de desembarco o dominio del mar; −30% el primer turno.' },
    pat: { n: 'Patrullar', t: ['es', 'fl'], d: 'Protege tus rutas de suministro y disputa el dominio del aire o del mar.' }
  };
  /* ---- doctrinas (una por rama; cambiarla cuesta 2 CP) ---- */
  D.DOCT = {
    tierra: { blitz: { n: 'Guerra relámpago', d: 'Blindados +20% al atacar; consumen un 30% más de combustible.', m: { armAtk: .2, fuel: .3 } }, prof: { n: 'Defensa en profundidad', d: 'Defensa +20% y fortificaciones un 30% más baratas; ataque −10%.', m: { defB: .2, fortC: -.3, atk: -.1 } } },
    aire: { sup: { n: 'Superioridad aérea', d: 'Cazas y drones +25% en la lucha por el cielo; bombardeo −10%.', m: { air: .25, bmb: -.1 } }, est: { n: 'Bombardeo estratégico', d: 'Bombardeos +35%; más daño civil y más riesgo de crímenes de guerra.', m: { bmb: .35, civ: .5 } } },
    mar: { alt: { n: 'Flota de alta mar', d: 'Portaaviones y escoltas +20%.', m: { nav: .2 } }, sub: { n: 'Guerra submarina', d: 'Submarinos +30% y bloqueos un 25% más eficaces.', m: { sub: .3, blq: .25 } } }
  };
  /* ---- árbol de investigación militar: se suma al árbol de Laboratorios ---- */
  Object.assign(D.TECH_BRANCHES, { ter: 'Ejército de tierra', aer: 'Fuerza aérea', nav: 'Armada' });
  D.TECHS.push(
    { id: 'ter1', b: 'ter', t: 1, n: 'Blindaje compuesto', d: 'Tanques que aguantan lo que antes los destruía.', m: { w_arm: .12 } },
    { id: 'ter2', b: 'ter', t: 2, n: 'Visión nocturna y redes tácticas', d: 'La infantería ve y se coordina de noche.', m: { w_inf: .12, w_sf: .15 } },
    { id: 'ter3', b: 'ter', t: 3, n: 'Artillería de precisión', d: 'Cada proyectil cae donde debe.', m: { w_art: .2, w_def: .05 } },
    { id: 'aer1', b: 'aer', t: 1, n: 'Radares de nueva generación', d: 'Ves al enemigo antes de que despegue.', m: { w_air: .1 } },
    { id: 'aer2', b: 'aer', t: 2, n: 'Cazas furtivos', d: 'Invisibles para la mayoría de las defensas.', m: { w_air: .15 } },
    { id: 'aer3', b: 'aer', t: 3, n: 'Reabastecimiento en vuelo', d: 'Más alcance y más horas sobre el frente.', m: { w_air: .1, w_sup: .1 } },
    { id: 'nav1', b: 'nav', t: 1, n: 'Sonar avanzado', d: 'Los submarinos enemigos dejan de ser invisibles.', m: { w_nav: .1 } },
    { id: 'nav2', b: 'nav', t: 2, n: 'Misiles antibuque', d: 'Un buque menos por cada disparo.', m: { w_nav: .15 } },
    { id: 'nav3', b: 'nav', t: 3, n: 'Logística naval', d: 'Convoyes que llegan siempre.', m: { w_sup: .15, w_nav: .05 } }
  );
  /* ---- políticas de guerra ---- */
  D.WPOL = {
    racion: { n: 'Racionamiento', d: 'El frente gasta un 40% menos de comida y combustible; el país consume un 15% menos de petróleo. Obreros y clase media lo sufren cada turno.' },
    leva: { n: 'Reclutamiento forzoso', d: 'Cada turno se incorporan nuevas unidades de infantería sin coste. Jóvenes y minorías lo odian; tu imagen democrática cae.' },
    econ: { n: 'Economía de guerra', d: 'Conviertes fábricas: unidades un 25% más baratas y más capacidad de reclutar. Tu economía crece menos.' }
  };
  /* ---- niveles de alerta ---- */
  D.ALERT = [
    { n: 'Paz', d: 'Ejército en cuarteles.', up: 1, ready: 0, grow: 0 },
    { n: 'Tensión', d: 'Vigilancia reforzada: +1 de preparación por turno.', up: 1.05, ready: 1, grow: 0 },
    { n: 'Movilización', d: 'Reservistas llamados: +3 de preparación por turno, disuade a los vecinos; cuesta dinero y crecimiento.', up: 1.2, ready: 3, grow: -.08 },
    { n: 'Guerra', d: 'Todo el país al servicio del frente: +5 de preparación por turno; caro y agotador.', up: 1.4, ready: 5, grow: -.15 }
  ];
  D.FORT = { n: 'Fortificaciones', max: 3, cost: 1.5, up: .05, turns: 2 };
  D.BASES.cuartel.n = 'Barracas'; D.BASES.aerea.n = 'Aeródromo'; D.BASES.naval.n = 'Astillero';
  /* ---- operaciones encubiertas nuevas ---- */
  Object.assign(D.SPYOPS, {
    mil: { n: 'Espiar su ejército', d: 'Durante 8 turnos ves sus fuerzas y sus grupos sin niebla de guerra.', cp: 1, base: .65, risk: .35, k: 1 },
    eco: { n: 'Espiar su economía', d: 'Robas planes industriales: +8 puntos de investigación y +20% en tu proyecto de I+D si ellos lo dominan.', cp: 1, base: .6, risk: .35, k: 1 },
    cib: { n: 'Ciberoperación', d: 'Atacas sus redes: su suministro de guerra cae 25 puntos y su economía un 1%.', cp: 2, base: .5, risk: .45, k: 2 },
    fil: { n: 'Filtración', d: 'Filtras documentos comprometedores: −6 de estabilidad y peor relación con sus socios.', cp: 2, base: .55, risk: .4, k: 1.5 },
    opo: { n: 'Apoyar a la oposición', d: 'Financias a sus opositores: si es democracia, adelantas sus elecciones; si no, protestas.', cp: 2, base: .5, risk: .5, k: 2.5 }
  });
  D.AGENCY = { n: ['Sin agencia', 'Agencia modesta', 'Agencia seria', 'Agencia de élite'], cost: [0, .0005, .0012, .0025] };
  D.DIFFW = [.85, 1, 1.08, 1.18]; // fuerza de la IA en batalla según dificultad
})();

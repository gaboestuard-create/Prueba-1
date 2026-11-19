/* =====================================================================
   WORLD LEADER · DATOS · FASE 5: escenarios, campañas, victorias,
   reto semanal, eventos procedurales y mundo alternativo.
   Todo es editable. Los datos históricos son aproximados (verificado: false).

   Operaciones de escenario (ops), se aplican tras crear el mundo:
     ['rel', A, B, v, motivo]     relación entre dos países (A o B pueden ser '*' = todos, 'P' = jugador, 'big' = las 20 mayores economías)
     ['blocRel', blocA, blocB, v] relación entre todos los miembros de dos bloques
     ['gdp', filtro, k]          multiplica el PIB (filtro: '*', 'big', 'P' o un código)
     ['stab', filtro, v]         suma estabilidad
     ['war', A, B]  ['sanc', A, B]  ['tr', tipo, A, B]  ['untr', A, B]
     ['coups', n]                n golpes de Estado al azar entre países inestables
     ['wars', n]                 n guerras al azar entre vecinos hostiles
     ['crisis', n]               crisis financieras en n grandes economías (y quizá en la tuya)
     ['price', k, m]             precio de una materia prima (k = '*' para todas)
     ['inf', v]  ['year', y]  ['leader', iso, nombre, partido]  ['reg', iso, régimen]
     ['blocs', iso, '+OTAN' | '-OTAN']  ['per', '*', 'agres', +0.1]  ['tension', v] (rival de cada gran potencia)
   Condiciones de objetivos (goal / if): ver goalOk() en src/engine/7g-scenarios.js
     ['gdpX', 1.3] ['gdpRank', 5] ['powRank', 3] ['tr', 'com'|'pna'|'ali'|'def'|'any', n] ['stab', 60] ['appr', 55]
     ['rep', 'paz', 20] ['peace'] ['annex', 2] ['occ', 6] ['rel', 'US', 30] ['relLt', 'US', 0] ['warsWon', 1] ['tech', 6]
     ['firsts', 2] ['debtLt', .8] ['med', 2] ['noSanc'] ['bloc', 'OTAN'] ['flag', 'x'] ['noflag', 'x'] ['laws', 8]
     ['reg', 'dem'] ['turns', 12] (turnos dentro de la etapa) ['turn', 60] ['stabLt', 20] ['dead'] ['any', [...], [...]]
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA, fx = D.fx;

  /* ---------- escenarios ---------- */
  D.SCEN = [
    { id: 'actual', n: 'Mundo actual (nov 2026)', d: 'Normal', obj: 'Gobierna el mundo tal como es hoy.', x: 'El tablero de hoy: guerra en Ucrania, rivalidad entre Washington y Pekín, bloques en tensión y una economía mundial que crece poco.', ops: [], verificado: false },
    { id: 'guerrafria', n: 'Guerra Fría tardía', d: 'Difícil', year: 1987, obj: 'Sobrevive al duelo de bloques sin que el mundo arda.',
      x: 'Dos bloques armados hasta los dientes, telones de acero y crisis por delegación. Las repúblicas exsoviéticas son satélites fieles de Moscú; China juega a dos bandas.',
      ops: [['year', 1987], ['blocRel', 'OTAN', 'OTSC', -45, 'Telón de acero'], ['rel', 'US', 'RU', -40, 'Guerra Fría'], ['rel', 'US', 'CU', -40, 'Embargo'], ['rel', 'RU', 'CU', 40, 'Hermanos socialistas'],
        ['rel', 'RU', 'UA', 80, 'República hermana'], ['rel', 'RU', 'BY', 60, 'República hermana'], ['rel', 'RU', 'KZ', 50, 'República hermana'], ['rel', 'RU', 'VN', 35, 'Aliado socialista'], ['rel', 'RU', 'KP', 30, 'Aliado socialista'],
        ['rel', 'CN', 'RU', -20, 'Ruptura sino-soviética'], ['rel', 'US', 'CN', 20, 'Diplomacia triangular'], ['sanc', 'US', 'RU'], ['sanc', 'RU', 'US'], ['sanc', 'US', 'CU'], ['peace', 'RU', 'UA'],
        ['leader', 'US', 'Ronald Reagan', 'Partido Republicano'], ['leader', 'RU', 'Mijaíl Gorbachov', 'PCUS'], ['reg', 'RU', 'com'], ['leader', 'CN', 'Deng Xiaoping', 'Partido Comunista'], ['leader', 'GB', 'Margaret Thatcher', 'Partido Conservador'],
        ['leader', 'FR', 'François Mitterrand', 'Partido Socialista'], ['leader', 'DE', 'Helmut Kohl', 'CDU'], ['leader', 'CU', 'Fidel Castro', 'Partido Comunista'], ['leader', 'JP', 'Yasuhiro Nakasone', 'PLD'], ['leader', 'IN', 'Rajiv Gandhi', 'Congreso Nacional'],
        ['leader', 'UA', 'Volodímir Shcherbytsky', 'PCUS'], ['reg', 'UA', 'com'], ['reg', 'BY', 'com'], ['leader', 'MX', 'Miguel de la Madrid', 'PRI'], ['leader', 'BR', 'José Sarney', 'PMDB'], ['leader', 'AR', 'Raúl Alfonsín', 'UCR'],
        ['gdp', 'CN', .25], ['gdp', 'IN', .35], ['gdp', 'RU', 1.2], ['per', '*', 'agres', .05]], verificado: false },
    { id: 'crisis', n: 'Mundo en crisis económica', d: 'Difícil', obj: 'Saca a tu país de la recesión antes que los demás.',
      x: 'Un crac bancario ha contagiado a las grandes economías. Crédito seco, materias primas por los suelos, paro al alza y gobiernos que caen como fichas.',
      ops: [['crisis', 8, 'P'], ['gdp', '*', .93], ['stab', '*', -6], ['price', '*', .75], ['price', 'pet', .6], ['inf', 3], ['coups', 2]], verificado: false },
    { id: 'tension', n: 'Mundo multipolar en tensión', d: 'Difícil', obj: 'Navega entre cinco potencias que desconfían unas de otras.',
      x: 'Ya no hay un árbitro. Washington, Pekín, Moscú, Nueva Delhi y Bruselas compiten por zonas de influencia; las guerras por delegación se multiplican.',
      ops: [['tension', -25], ['rel', 'US', 'CN', -30, 'Rivalidad estratégica'], ['rel', 'IN', 'CN', -25, 'Frontera disputada'], ['rel', 'IN', 'PK', -20, 'Cachemira'], ['rel', 'SA', 'IR', -25, 'Pulso regional'],
        ['wars', 3], ['per', '*', 'agres', .08], ['sanc', 'US', 'CN'], ['sanc', 'CN', 'US']], verificado: false },
    { id: 'paz', n: 'Mundo en paz frágil', d: 'Fácil', obj: 'Mantén la paz: cualquier chispa puede incendiarlo todo.',
      x: 'Un alto el fuego general y una ola de tratados han traído calma. Pero los agravios siguen ahí, y la paz solo dura mientras alguien la cuide.',
      ops: [['peace', '*', '*'], ['rel', 'RU', 'UA', 15, 'Alto el fuego'], ['rel', '*', '*', 8, 'Ola de distensión'], ['per', '*', 'agres', -.08], ['stab', '*', 4]], verificado: false },
    { id: 'caos', n: 'Caos total', d: 'Despiadado', obj: 'Sobrevive. Lo demás es un lujo.',
      x: 'Golpes de Estado, guerras y crisis desde el primer día. Los mercados se desploman, los aliados dudan y tu propio ejército mira hacia el palacio.',
      ops: [['coups', 7], ['wars', 6], ['crisis', 6, 'P'], ['stab', '*', -10], ['stab', 'P', -8], ['price', '*', 1.25], ['inf', 6], ['per', '*', 'agres', .12], ['rel', 'P', 'big', -8, 'Desconfianza general']], verificado: false },
    /* escenarios desbloqueables (logros) */
    { id: 'edad', n: 'Edad de oro', d: 'Fácil', lock: 'u_edad', obj: 'Haz que la prosperidad dure.', x: 'Crecimiento, comercio y tecnología baratos. El reto es no estropearlo.',
      ops: [['gdp', '*', 1.08], ['stab', '*', 8], ['rel', '*', '*', 5, 'Prosperidad compartida'], ['price', '*', 1.1], ['peace', '*', '*']], verificado: false },
    { id: 'invierno', n: 'Invierno nuclear', d: 'Despiadado', lock: 'u_invierno', obj: 'Reconstruye la civilización tras un intercambio nuclear limitado.',
      x: 'Un intercambio nuclear limitado ha devastado a las grandes potencias. Cosechas perdidas, refugiados y gobiernos improvisados.',
      ops: [['gdp', 'big', .6], ['stab', '*', -12], ['coups', 5], ['price', '*', 1.6], ['inf', 8], ['rel', '*', '*', -6, 'Mundo traumatizado']], verificado: false }
  ];

  /* ---------- naciones históricas desbloqueables (país propio sobre un territorio) ---------- */
  D.HISTNATIONS = [
    { id: 'gcol', lock: 'u_naciones', iso: 'CO', n: 'Gran Colombia', reg: 'dem', ideo: 0, x: 'El sueño de Bolívar, de nuevo en pie.' },
    { id: 'yugo', lock: 'u_naciones', iso: 'RS', n: 'Federación Yugoslava', reg: 'hib', ideo: -1, x: 'Los Balcanes unidos bajo una sola bandera.' },
    { id: 'rau', lock: 'u_naciones', iso: 'EG', n: 'República Árabe Unida', reg: 'aut', ideo: -1, x: 'El panarabismo vuelve al poder en El Cairo.' },
    { id: 'aust', lock: 'u_naciones', iso: 'AT', n: 'Danubia', reg: 'mon', ideo: 1, x: 'Una monarquía constitucional en el corazón de Europa.' },
    { id: 'cent', lock: 'u_naciones', iso: 'GT', n: 'República Federal de Centroamérica', reg: 'dem', ideo: 0, x: 'Cinco repúblicas que vuelven a ser una.' }
  ];

  /* ---------- victorias alternativas (partida libre) ----------
     Umbrales elegidos para que ninguna sea trivial: ver FASE5.md */
  D.VICT = [
    { id: 'dom', n: 'Dominación', x: 'Controlas al menos el 25% del poder militar mundial y has anexionado 3 países.', ic: 'tan' },
    { id: 'eco', n: 'Victoria económica', x: 'Tu PIB supera en 1,6 veces al segundo del mundo y es al menos 1,5 veces el inicial.', ic: 'oro' },
    { id: 'dip', n: 'Victoria diplomática', x: '12 alianzas o pactos de defensa, 30 tratados comerciales y confianza internacional de 50.', ic: 'acuerdo' },
    { id: 'tec', n: 'Victoria científica y cultural', x: 'Tu país fue el primero del mundo en 7 grandes descubrimientos y tu prestigio cultural es alto.', ic: 'tec' },
    { id: 'sup', n: 'Supervivencia', x: 'Sigues en el poder tras 120 trimestres (30 años).', ic: 'seg' },
    { id: 'leg', n: 'Legado', x: 'Tras al menos 60 trimestres, el juicio de la historia te da 85 o más.', ic: 'trofeo' }
  ];

  /* ---------- modos y reto semanal ---------- */
  D.MODES = [
    { id: 'libre', n: 'Partida libre', x: 'Elige país, escenario y reglas. Seis caminos a la victoria.' },
    { id: 'camp', n: 'Campaña', x: 'Ocho historias con objetivos por etapas y tres finales cada una.' },
    { id: 'semana', n: 'Reto semanal', x: 'Misma semilla y reglas para todo el que juegue esta semana.' },
    { id: 'rapido', n: 'Rápido', x: '36 turnos. Gana quien consiga más puntos.' },
    { id: 'sandbox', n: 'Sandbox', x: 'Editor abierto, sin derrota por elecciones. Para experimentar.' }
  ];
  D.QUICK_TURNS = 36;
  D.WEEK_RULES = [
    { id: 'escasez', n: 'Escasez de recursos' }, { id: 'hostil', n: 'Mundo hostil' }, { id: 'alt', n: 'Mundo alternativo' }, { id: 'rapido', n: 'Partida rápida (36 turnos)' },
    { id: 'perm', n: 'Muerte permanente' }, { id: 'caosev', n: 'Eventos al doble' }, { id: 'pobre', n: 'Economía dura' }
  ];
  D.WEEK_COUNTRIES = ['MX', 'BR', 'AR', 'TR', 'NG', 'ID', 'PL', 'EG', 'VN', 'ZA', 'CO', 'PK', 'KR', 'IR', 'ES', 'UA', 'SA', 'CL', 'PH', 'ET'];
  /* componentes de dificultad: multiplicadores (1 = normal) */
  D.DK = { ai: ['Agresividad de la IA', .6, 1.5], eco: ['Generosidad de la economía', .7, 1.3], stab: ['Dureza de la estabilidad', .6, 1.6], ev: ['Frecuencia de eventos', .5, 2] };

  /* ---------- campañas ----------
     stages: { n, x (lo que te cuenta tu asesor), goal: [...], turns: plazo }  · lose: derrota inmediata
     events: { id, st (etapa), at (turnos tras empezar la etapa), t, x, opts: [[texto, efectos]] } (los efectos pueden poner flag.algo)
     endings: tres finales; gana el primero cuyo "if" se cumpla (el último no tiene condición) */
  const C = [
    { id: 'emergente', n: 'La potencia emergente', iso: 'IN', scen: 'actual', d: 'Media', lead: 'Kavya Raman',
      x: 'Mil cuatrocientos millones de personas, una economía que despega y vecinos que te miran con recelo. El siglo puede ser tuyo… si no tropiezas.',
      stages: [
        { n: 'Despegue', x: 'Primero, crecer. Haz que la economía crezca un 15% y domina tres tecnologías.', goal: [['gdpX', 1.15], ['tech', 3]], turns: 28 },
        { n: 'Un asiento en la mesa', x: 'El mundo debe contar contigo: 8 tratados comerciales y 3 pactos de no agresión.', goal: [['tr', 'com', 8], ['tr', 'pna', 3]], turns: 28 },
        { n: 'Potencia', x: 'Entra en el podio: entre las 3 mayores economías del mundo y con 10 tecnologías dominadas.', goal: [['gdpRank', 3], ['tech', 10]], turns: 44 }],
      lose: [['stabLt', 18]],
      events: [
        { id: 'em_fab', st: 0, at: 2, t: 'La fábrica del mundo', x: 'Las multinacionales quieren trasladar su producción a tu país si abres la mano con los impuestos y los sindicatos.',
          opts: [['Abrir las puertas', '$g+.6;grow+.2/6;sec.emp+8;sec.obr-6;flag.em_abierto'], ['Crecer con industria propia', 'grow+.1/6;sec.obr+6;sec.emp-4;flag.em_propia']] },
        { id: 'em_himal', st: 1, at: 4, t: 'Incidente en el Himalaya', x: 'Patrullas chinas y tuyas se enfrentan a pedradas en un paso fronterizo. Hay muertos. La prensa pide respuesta.',
          opts: [['Respuesta militar limitada', 'sec.mil+8;rel.CN-15:Choque en el Himalaya;rep.paz-4;flag.em_halcon'], ['Canal diplomático discreto', 'rel.CN+4:Contención en la frontera;sec.mil-5;rep.paz+3;flag.em_paloma']] },
        { id: 'em_wash', st: 2, at: 3, t: 'La oferta de Washington', x: 'Estados Unidos te ofrece una asociación estratégica: tecnología militar a cambio de alinearte contra Pekín.',
          opts: [['Aceptar la asociación', 'rel.US+15:Asociación estratégica;rel.CN-12:Te alineas con Washington;units.aire+8;flag.em_alineado'], ['Mantener la autonomía estratégica', 'rep.conf+5;rel.RU+5:Autonomía estratégica;flag.em_autonomo']] }],
      endings: [
        { t: 'La potencia que inspira', x: 'Tu país se convierte en el ejemplo del Sur Global: rico, respetado y en paz con sus vecinos.', if: [['rep', 'paz', 15], ['noflag', 'em_halcon']] },
        { t: 'El nuevo hegemón regional', x: 'Nadie en Asia del Sur se mueve sin tu permiso. Te temen tanto como te respetan.', if: [['any', [['flag', 'em_halcon']], [['annex', 1]], [['flag', 'em_alineado']]]] },
        { t: 'Gigante con pies de barro', x: 'Las cifras impresionan, pero la desigualdad y la tensión interna amenazan todo lo logrado.' }] },

    { id: 'declive', n: 'La superpotencia en declive', iso: 'US', scen: 'tension', d: 'Difícil', lead: 'Margaret Holloway',
      x: 'Sigues siendo el país más poderoso del mundo, pero la deuda crece, los aliados dudan y los rivales huelen la sangre.',
      stages: [
        { n: 'Contener la hemorragia', x: 'Pon la casa en orden: estabilidad de 60 y aprobación de 52, y sostenlo 6 turnos.', goal: [['stab', 60], ['appr', 52], ['turns', 6]], turns: 26 },
        { n: 'Reconstruir alianzas', x: 'Recupera a tus aliados: 6 alianzas o pactos de defensa y confianza internacional de 10.', goal: [['tr', 'ali', 6], ['rep', 'conf', 10]], turns: 30 },
        { n: 'El nuevo orden', x: 'Demuestra que el siglo no ha terminado: sigue siendo la primera economía, con 8 alianzas o pactos de defensa, durante 8 turnos.', goal: [['gdpRank', 1], ['tr', 'ali', 8], ['turns', 8]], turns: 40 }],
      lose: [['stabLt', 20], ['gdpRankGt', 2]],
      events: [
        { id: 'de_deuda', st: 0, at: 2, t: 'El techo de deuda', x: 'El congreso amenaza con bloquear el presupuesto si no recortas el gasto militar o social.',
          opts: [['Recortar el gasto militar', 'sec.mil-10;$g+.5;units.tierra-5;flag.de_retiro'], ['Recortar programas sociales', 'sec.obr-8;sec.jov-6;$g+.5;flag.de_halcon'], ['Subir impuestos a los ricos', 'sec.emp-10;sec.obr+5;$g+.4']] },
        { id: 'de_bases', st: 1, at: 3, t: '¿Volver a casa?', x: 'Tus asesores debaten: cerrar bases en el extranjero y centrarse en casa, o redoblar la presencia global.',
          opts: [['Repliegue ordenado', 'rep.paz+8;$g+.4;relAll.big-3:Retirada americana;flag.de_retiro'], ['Más presencia, no menos', 'sec.mil+8;$g-.4;rep.conf+6;flag.de_halcon']] },
        { id: 'de_rival', st: 2, at: 2, t: 'El rival propone un pacto', x: 'Pekín ofrece un reparto de esferas de influencia: tú en las Américas y Europa, ellos en Asia.',
          opts: [['Aceptar el reparto', 'rel.CN+20:Reparto de esferas;rel.JP-15:Abandono de Asia;rel.KR-15:Abandono de Asia;flag.de_reparto'], ['Rechazarlo con firmeza', 'rel.CN-10:Rechazo del reparto;rep.conf+5']] }],
      endings: [
        { t: 'El renacimiento americano', x: 'Contra todo pronóstico, el país recupera su vigor: aliados leales, economía pujante y un liderazgo que nadie discute.', if: [['rep', 'conf', 25], ['noflag', 'de_reparto']] },
        { t: 'La retirada ordenada', x: 'Renuncias al papel de policía del mundo. El país es menos poderoso, pero más estable y en paz.', if: [['any', [['flag', 'de_retiro']], [['flag', 'de_reparto']]]] },
        { t: 'El imperio a la defensiva', x: 'Sigues en la cima, pero rodeado de rivales y con aliados que ya no confían del todo.' }] },

    { id: 'pequeno', n: 'Entre gigantes', iso: 'MN', scen: 'tension', d: 'Difícil', lead: 'Oyuun Batbayar',
      x: 'Tres millones de personas entre Rusia y China. Tu independencia depende de que ninguno de los dos crea que eres del otro.',
      stages: [
        { n: 'Equilibrio', x: 'Gánate a los dos vecinos: relación de 10 con Rusia y con China, sin guerras.', goal: [['rel', 'RU', 10], ['rel', 'CN', 10], ['peace']], turns: 28 },
        { n: 'El tercer vecino', x: 'Diversifica: 6 tratados comerciales y una economía un 20% mayor.', goal: [['tr', 'com', 6], ['gdpX', 1.2]], turns: 30 },
        { n: 'Soberanía', x: 'Aguanta 20 turnos más entero, independiente y con estabilidad de 50.', goal: [['turns', 20], ['stab', 50], ['occFree']], turns: 36 }],
      lose: [['occBy', 3], ['stabLt', 15]],
      events: [
        { id: 'pe_mina', st: 0, at: 2, t: 'La mina de cobre', x: 'Una empresa china y otra rusa pujan por la mayor mina del país. Una tercera, canadiense, ofrece menos dinero.',
          opts: [['Para China', '$g+.8;rel.CN+12:Concesión minera;rel.RU-6:Concesión minera china;flag.pe_cn'], ['Para Rusia', '$g+.6;rel.RU+12:Concesión minera;rel.CN-6:Concesión minera rusa;flag.pe_ru'], ['Para los canadienses', '$g+.3;rel.CA+12:Concesión minera;rel.US+6:El tercer vecino;flag.pe_occ']] },
        { id: 'pe_bases', st: 1, at: 4, t: 'Una base en la estepa', x: 'Moscú pide instalar una estación de radar en tu territorio. Pekín advierte que lo vería como un acto hostil.',
          opts: [['Aceptar el radar ruso', 'rel.RU+15:Radar en la estepa;rel.CN-15:Radar ruso;flag.pe_ru'], ['Negarse con cortesía', 'rel.RU-5:Rechazo del radar;rel.CN+5:Neutralidad;flag.pe_neutral']] },
        { id: 'pe_ue', st: 2, at: 3, t: 'Invitación de Bruselas', x: 'La Unión Europea te ofrece un acuerdo de asociación. Tus dos vecinos lo miran con desconfianza.',
          opts: [['Firmarlo', 'rel.FR+10:Asociación;rel.DE+10:Asociación;rel.RU-6:Te acercas a Europa;rel.CN-6:Te acercas a Europa;flag.pe_occ'], ['Aplazarlo', 'flag.pe_neutral']] }],
      endings: [
        { t: 'La Suiza de la estepa', x: 'Neutral, próspera y respetada por todos. Tus vecinos gigantes compiten por tu amistad en vez de por tu territorio.', if: [['rel', 'RU', 25], ['rel', 'CN', 25]] },
        { t: 'El tercer vecino', x: 'Te apoyas en Occidente para equilibrar a los gigantes. Funciona… mientras Occidente se acuerde de ti.', if: [['flag', 'pe_occ']] },
        { t: 'Satélite con bandera propia', x: 'Sigues siendo independiente sobre el papel, pero las decisiones importantes se toman en otra capital.' }] },

    { id: 'mediador', n: 'El mediador mundial', iso: 'NO', scen: 'tension', d: 'Media', lead: 'Ingrid Solberg',
      x: 'Un país pequeño, rico y respetado. El mundo arde y tú tienes algo que nadie más tiene: la confianza de casi todos.',
      stages: [
        { n: 'La primera paz', x: 'Media con éxito en una guerra ajena: toca en el globo a uno de los bandos y pulsa «Mediar» en su ficha.', goal: [['med', 1]], turns: 24 },
        { n: 'El honesto intermediario', x: 'Logra 3 mediaciones y una reputación de paz de 20.', goal: [['med', 3], ['rep', 'paz', 20]], turns: 40 },
        { n: 'La conciencia del mundo', x: 'Confianza internacional de 20, ninguna gran potencia hostil (relación de −20 o más con las 5 mayores) y sin guerras propias.', goal: [['rep', 'conf', 20], ['relBig', -20], ['peace']], turns: 44 }],
      lose: [['declared', 1]],
      events: [
        { id: 'me_arma', st: 0, at: 3, t: 'Armas para la paz', x: 'Tu industria podría vender armas a uno de los bandos de una guerra. El dinero vendría bien; la neutralidad, no tanto.',
          opts: [['Vender las armas', '$g+.8;rep.paz-12;flag.me_armas'], ['Neutralidad estricta', 'rep.paz+5;rep.conf+3']] },
        { id: 'me_secreto', st: 1, at: 4, t: 'El canal secreto', x: 'Un enviado te propone una negociación secreta entre dos enemigos acérrimos. Si se filtra, quedarás como un ingenuo.',
          opts: [['Aceptar el canal', 'chance.6{rep.paz+10;rep.conf+6}{rep.conf-6};flag.me_canal'], ['Solo negociaciones públicas', 'rep.conf+2']] },
        { id: 'me_nobel', st: 2, at: 2, t: 'El premio', x: 'Te proponen para el premio de la paz. Aceptarlo te da prestigio; rechazarlo en nombre de las víctimas, otra clase de respeto.',
          opts: [['Aceptarlo', 'rep.conf+8;sec.all+3;flag.me_premio'], ['Rechazarlo', 'rep.paz+8;flag.me_humilde']] }],
      endings: [
        { t: 'El gran pacificador', x: 'Tus mediaciones se estudian en las academias diplomáticas. El mundo es un poco más seguro gracias a ti.', if: [['noflag', 'me_armas'], ['med', 4]] },
        { t: 'El negociador de la sombra', x: 'Nadie sabe del todo lo que hiciste, pero los que importan te deben favores.', if: [['flag', 'me_canal']] },
        { t: 'Buenas intenciones', x: 'Lograste algunas paces, pero el mundo siguió su curso. Al menos lo intentaste.' }] },

    { id: 'imperio', n: 'El imperio conquistador', iso: 'TR', scen: 'tension', d: 'Despiadado', lead: 'Kemal Aydın',
      x: 'Un ejército poderoso, una historia imperial y vecinos débiles. Los generales susurran que es el momento. La historia juzgará el precio.',
      stages: [
        { n: 'El primer paso', x: 'Gana una guerra (paz favorable) u ocupa 4 regiones extranjeras.', goal: [['any', [['warsWon', 1]], [['occ', 4]]]], turns: 28 },
        { n: 'Expansión', x: 'Anexiona un país y ocupa al menos 6 regiones.', goal: [['annex', 1], ['occ', 6]], turns: 32 },
        { n: 'Imperio', x: 'Anexiona 3 países en total y mantén la estabilidad por encima de 40 durante 8 turnos.', goal: [['annex', 3], ['stab', 40], ['turns', 8]], turns: 44 }],
      lose: [['stabLt', 15]],
      events: [
        { id: 'im_gen', st: 0, at: 1, t: 'El consejo de generales', x: 'Tus generales te presentan dos planes: una guerra relámpago o una campaña lenta con apoyo popular.',
          opts: [['Guerra relámpago', 'sec.mil+10;units.tierra+10;rep.paz-5;flag.im_rapido'], ['Preparar a la opinión pública', 'camp+3;sec.all+3;flag.im_lento']] },
        { id: 'im_pob', st: 1, at: 4, t: 'La población conquistada', x: 'Los territorios ocupados se resisten. Tus gobernadores piden instrucciones.',
          opts: [['Mano de hierro', 'rep.dem-10;rep.gen-6;sec.mil+5;flag.im_hierro'], ['Integración y derechos', '$g-.5;rep.dem+5;flag.im_integra']] },
        { id: 'im_coal', st: 2, at: 3, t: 'La coalición', x: 'Varios países discuten una coalición contra ti. Puedes intentar dividirlos con dinero o desafiarlos.',
          opts: [['Comprar a los indecisos', '$g-.8;relAll.big+4:Diplomacia del dinero'], ['Desafiarlos', 'sec.mil+6;relAll.big-6:Desafío imperial;rep.paz-5;flag.im_hierro']] }],
      endings: [
        { t: 'Un imperio que perdura', x: 'Tus conquistas se convierten en provincias leales. Dentro de un siglo, nadie recordará que fueron otra cosa.', if: [['flag', 'im_integra'], ['stab', 55]] },
        { t: 'El tirano de la historia', x: 'Tu imperio es vasto y temido. Los libros de historia de tus vecinos te dedican capítulos enteros, ninguno amable.', if: [['flag', 'im_hierro']] },
        { t: 'El imperio de arena', x: 'Conquistaste mucho, pero todo se sostiene con alfileres. Tu sucesor heredará guerrillas y deudas.' }] },

    { id: 'comercial', n: 'La república comercial', iso: 'SG', scen: 'actual', d: 'Media', lead: 'Wei Ling Tan',
      x: 'Una isla sin recursos que vive del comercio. Si el comercio mundial se cierra, tú te ahogas. Si se abre, puedes ser el centro del mundo.',
      stages: [
        { n: 'Abrir rutas', x: 'Firma 12 tratados comerciales.', goal: [['tr', 'com', 12]], turns: 24 },
        { n: 'El puerto del mundo', x: 'Haz crecer la economía un 35% sin endeudarte más del 80% del PIB.', goal: [['gdpX', 1.35], ['debtLt', .8]], turns: 32 },
        { n: 'Centro financiero', x: '20 tratados comerciales, una economía 1,8 veces la inicial y confianza de 10.', goal: [['tr', 'com', 20], ['gdpX', 1.8], ['rep', 'conf', 10]], turns: 44 }],
      lose: [['stabLt', 20]],
      events: [
        { id: 'co_fisc', st: 0, at: 3, t: 'El paraíso fiscal', x: 'Te proponen convertir el país en refugio de capitales con secreto bancario absoluto.',
          opts: [['Adelante', '$g+1;rep.conf-8;relAll.big-3:Paraíso fiscal;flag.co_paraiso'], ['Transparencia', 'rep.conf+8;sec.emp-4;flag.co_limpio']] },
        { id: 'co_estrecho', st: 1, at: 4, t: 'El estrecho', x: 'Una potencia quiere patrullar el estrecho que controla tu comercio. Otra te ofrece protección a cambio de una base.',
          opts: [['Aceptar la base', 'rel.US+12:Base naval;rel.CN-10:Base extranjera;flag.co_base'], ['Neutralidad armada', '$g-.4;units.mar+10;rep.conf+3']] },
        { id: 'co_cripto', st: 2, at: 2, t: 'La bolsa digital', x: 'Las finanzas digitales prometen convertirte en la capital mundial del dinero nuevo… o en su mayor estafa.',
          opts: [['Apostar fuerte', 'chance.55{$g+1.2;grow+.3/6}{$g-1;stab-6}'], ['Regular primero', 'rep.conf+4']] }],
      endings: [
        { t: 'El puerto del mundo', x: 'Medio comercio mundial pasa por tus muelles y tus bancos. Pequeña, rica y respetada.', if: [['flag', 'co_limpio']] },
        { t: 'La caja fuerte del planeta', x: 'Eres riquísima, aunque el dinero que guardas tiene a veces un olor extraño.', if: [['flag', 'co_paraiso']] },
        { t: 'La ciudad-estado protegida', x: 'Prosperas bajo el paraguas de una gran potencia. Mientras dure el paraguas.' }] },

    { id: 'fallido', n: 'El Estado fallido', iso: 'HT', scen: 'actual', d: 'Difícil', lead: 'Marie-Claire Joseph',
      x: 'Pandillas, hambre y un Estado que casi no existe. Nadie apuesta por ti. Precisamente por eso, todo lo que logres contará el doble.',
      stages: [
        { n: 'Recuperar las calles', x: 'Lleva la estabilidad a 45 y sostenla 4 turnos.', goal: [['stab', 45], ['turns', 4]], turns: 20 },
        { n: 'Que vuelva el pan', x: 'Haz crecer la economía un 50% y alcanza una aprobación de 55.', goal: [['gdpX', 1.5], ['appr', 55]], turns: 34 },
        { n: 'Un Estado de verdad', x: 'Estabilidad de 65, 16 leyes aprobadas y 8 turnos sin sobresaltos.', goal: [['stab', 65], ['laws', 16], ['turns', 8]], turns: 40 }],
      lose: [['stabLt', 4]],
      events: [
        { id: 'fa_band', st: 0, at: 1, t: 'Las pandillas', x: 'Las bandas controlan media capital. Puedes negociar una tregua o lanzar una ofensiva policial.',
          opts: [['Ofensiva total', 'stab+6;rep.dem-6;sec.mil+6;flag.fa_mano'], ['Tregua y programas sociales', '$g-.4;stab+3;sec.jov+6;flag.fa_social']] },
        { id: 'fa_ayuda', st: 1, at: 2, t: 'La ayuda internacional', x: 'Los donantes ofrecen un gran paquete de ayuda, con supervisores extranjeros en tus ministerios.',
          opts: [['Aceptar con supervisión', '$g+2;rep.conf+6;sec.mil-4;flag.fa_ayuda'], ['Solo sin condiciones', '$g+.6;sec.all+3']] },
        { id: 'fa_elec', st: 2, at: 3, t: '¿Elecciones ya?', x: 'La comunidad internacional pide elecciones. Tus aliados temen perderlas.',
          opts: [['Convocarlas', 'rep.dem+12;stab-3;flag.fa_dem'], ['Aplazarlas: primero, el orden', 'rep.dem-8;stab+4;flag.fa_mano']] }],
      endings: [
        { t: 'El milagro caribeño', x: 'De Estado fallido a democracia en marcha. Tu historia se cuenta en todo el mundo como prueba de que se puede.', if: [['flag', 'fa_dem'], ['noflag', 'fa_mano']] },
        { t: 'Orden con mano dura', x: 'Las calles son seguras y la economía funciona, pero las libertades esperan turno.', if: [['flag', 'fa_mano']] },
        { t: 'La reconstrucción frágil', x: 'El país está mejor que nunca en décadas, pero un mal año podría deshacerlo todo.' }] },

    { id: 'reformista', n: 'El líder reformista', iso: 'CU', scen: 'actual', d: 'Difícil', lead: 'Elena Varona',
      x: 'Llegas al poder con el viejo aparato vigilándote y una población que ya no cree en nada. Quieres cambiarlo todo sin que todo se derrumbe.',
      stages: [
        { n: 'Primeras reformas', x: 'Aprueba 5 leyes sin que la estabilidad baje de 40.', goal: [['laws', 5], ['stab', 40]], turns: 24 },
        { n: 'Abrirse al mundo', x: 'Haz crecer la economía un 20% y mejora la relación con Estados Unidos por encima de −40.', goal: [['gdpX', 1.2], ['rel', 'US', -40]], turns: 34 },
        { n: 'El nuevo país', x: 'Llega a régimen híbrido o democracia (o a 35 de reputación democrática), con aprobación de 55.', goal: [['any', [['reg', 'dem']], [['reg', 'hib']], [['rep', 'dem', 35]]], ['appr', 55]], turns: 40 }],
      lose: [['stabLt', 15]],
      events: [
        { id: 're_viejo', st: 0, at: 2, t: 'La vieja guardia', x: 'Los veteranos del partido exigen frenar las reformas. Tienen al ejército de su lado.',
          opts: [['Pactar con ellos', 'sec.mil+6;rep.dem-4;flag.re_pacto'], ['Jubilarlos a todos', 'sec.mil-10;stab-5;rep.dem+6;flag.re_ruptura']] },
        { id: 're_deshielo', st: 1, at: 1, t: 'El deshielo', x: 'Un enviado de Washington sugiere que un gesto humanitario abriría la puerta a levantar sanciones.',
          opts: [['Liberar a los presos políticos', 'rel.US+25:Gesto de deshielo;rep.dem+8;sec.mil-6'], ['Abrir el país al turismo y a las remesas', 'rel.US+12:Apertura al turismo;$g+.4;sec.emp+5'], ['Nada que negociar', 'sec.mil+4;rel.US-5:Portazo al deshielo']] },
        { id: 're_mercado', st: 1, at: 4, t: 'La apertura económica', x: 'Permitir empresas privadas puede multiplicar el crecimiento… y la desigualdad.',
          opts: [['Apertura total', 'grow+.4/8;sec.emp+10;sec.obr-6;flag.re_mercado'], ['Apertura gradual', 'grow+.2/8;sec.obr+3']] },
        { id: 're_const', st: 2, at: 1, t: 'La nueva constitución', x: 'Una asamblea propone una constitución con elecciones libres y pluripartidismo.',
          opts: [['Elecciones libres', 'do.setReg:dem;rep.dem+20;stab-6;flag.re_dem'], ['Apertura controlada', 'do.setReg:hib;rep.dem+8;flag.re_hib'], ['Rechazarla', 'rep.dem-12;sec.jov-10']] }],
      endings: [
        { t: 'La transición ejemplar', x: 'El país cambia de régimen sin un solo disparo. Tu nombre queda asociado a la palabra libertad.', if: [['reg', 'dem']] },
        { t: 'El modelo chino a la caribeña', x: 'Abriste la economía sin abrir del todo la política. Prosperidad sí; libertad, a medias.', if: [['flag', 're_mercado']] },
        { t: 'La reforma inconclusa', x: 'Cambiaste mucho, pero no lo suficiente. Tu sucesor tendrá que decidir si sigue o da marcha atrás.' }] }
  ];
  /* conversión: los efectos de las opciones se traducen con el mini-lenguaje de eventos ("do.setReg:dem" = operación del motor) */
  const fx2 = s => s.split(';').map(t => t.trim()).filter(Boolean).some(t => /^do\./.test(t)) ? s.split(';').map(t => t.trim()).filter(Boolean).flatMap(t => { const m = /^do\.(\w+):(\w+)$/.exec(t); return m ? [['do', m[1], { v: m[2] }]] : fx(t); }) : fx(s);
  for (const c of C) for (const e of c.events) e.opts = e.opts.map(o => ({ t: o[0], fx: fx2(o[1]) }));
  D.CAMP = C;

  /* ---------- eventos procedurales: plantillas que combinan país, líder, recurso y situación ----------
     {T} país, {L} su líder, {RES} recurso, {SIT} situación. Efectos con el mini-lenguaje. */
  D.PROC = {
    p: .22, cool: 10,
    sit: ['una sequía histórica', 'una huelga general', 'unas elecciones reñidas', 'un escándalo de corrupción', 'una ola de protestas estudiantiles', 'un terremoto', 'una crisis de deuda', 'un boom tecnológico', 'una epidemia de gripe', 'un golpe fallido'],
    tpl: [
      { id: 'res_oferta', tgt: 'any', t: '{L} ofrece {RES}', x: '{T}, golpeado por {SIT}, necesita liquidez y te ofrece {RES} a precio de saldo a cambio de pago inmediato.',
        opts: [['Comprar', '$g-.3;prod.{K}+1;rel.T+6:Compra en un mal momento'], ['Ofrecer un préstamo en su lugar', '$g-.2;rel.T+10:Préstamo solidario;rep.conf+2'], ['No interesa', 'rel.T-2:Ignoraste su oferta']] },
      { id: 'res_disputa', tgt: 'neighbor', t: 'Disputa por {RES} con {T}', x: 'Prospectores de {T} y de tu país reclaman el mismo yacimiento de {RES} en la frontera. {L} habla de “soberanía”.',
        opts: [['Explotarlo a medias', 'rel.T+4:Explotación conjunta;prod.{K}+1'], ['Reclamarlo entero', 'prod.{K}+2;rel.T-12:Disputa fronteriza;sec.mil+3'], ['Arbitraje internacional', 'rep.conf+3;rep.paz+2']] },
      { id: 'sit_ayuda', tgt: 'any', t: '{T} pide ayuda', x: '{T} sufre {SIT} y {L} pide ayuda públicamente a la comunidad internacional.',
        opts: [['Ayuda generosa', '$g-.3;rel.T+12:Ayuda en la desgracia;rep.gen+4'], ['Ayuda simbólica', '$g-.05;rel.T+3:Ayuda simbólica'], ['Es su problema', 'rel.T-6:Le diste la espalda']] },
      { id: 'sit_oportunidad', tgt: 'rival', t: 'La debilidad de {T}', x: 'Tu rival {T} atraviesa {SIT}. Tus asesores ven una oportunidad para ganar influencia… o para apretar.',
        opts: [['Tender la mano', 'rel.T+10:Tendiste la mano;rep.paz+3'], ['Apretar con propaganda', 'rel.T-8:Propaganda;sec.mil+3'], ['Esperar', '']] },
      { id: 'lider_visita', tgt: 'power', t: '{L} quiere verte', x: '{L}, líder de {T}, propone una cumbre bilateral para hablar de {RES} y de seguridad regional.',
        opts: [['Cumbre a lo grande', 'cp-1;rel.T+8:Cumbre bilateral;sec.emp+3'], ['Solo una llamada', 'rel.T+2:Llamada cordial'], ['Declinar', 'rel.T-5:Rechazaste la cumbre']] },
      { id: 'lider_insulto', tgt: 'any', t: '{L} te insulta', x: 'En pleno {SIT}, {L} culpa a tu gobierno de los males de {T} en un discurso televisado.',
        opts: [['Responder con dureza', 'sec.all+2;rel.T-8:Guerra de palabras'], ['Ignorarlo', 'rep.conf+2'], ['Llamarle en privado', 'rel.T+4:Llamada discreta']] },
      { id: 'res_boom', tgt: '', t: 'Fiebre de {RES}', x: 'El precio mundial de {RES} se dispara por {SIT} en {T}. Tus productores piden permisos de explotación urgentes.',
        opts: [['Dar permisos', 'prod.{K}+1;sec.emp+5;sec.rur-3'], ['Impuesto a las ganancias extraordinarias', '$g+.3;sec.emp-5'], ['Proteger el medio ambiente', 'sec.jov+5;sec.emp-4']] },
      { id: 'sit_refug', tgt: 'neighbor', t: 'Éxodo desde {T}', x: '{SIT} en {T} empuja a miles de personas hacia tu frontera.',
        opts: [['Acogerlos', '$g-.2;rel.T+8:Acogida de refugiados;rep.gen+5;sec.obr-3'], ['Campamentos en la frontera', '$g-.1;rel.T+2:Campamentos'], ['Cerrar la frontera', 'sec.mil+3;rel.T-6:Frontera cerrada;rep.gen-4']] }
    ]
  };

  /* ---------- mundo alternativo: qué se puede barajar y con qué reglas de coherencia ---------- */
  D.ALT = {
    leaders: 'Los líderes se intercambian solo entre países de la misma región.',
    borders: 'Hasta 12 regiones cambian de dueño, siempre entre vecinos terrestres, nunca la capital ni del jugador, y como máximo una por país.',
    states: 'PIB ±25% y estabilidad ±15; los regímenes solo cambian a uno cercano (democracia↔híbrido, autoritario↔militar↔partido único).',
    regNear: { dem: ['hib'], hib: ['dem', 'aut'], aut: ['mil', 'com', 'hib'], mil: ['aut'], com: ['aut'], mon: ['aut', 'hib'], teo: ['aut'] }
  };
})();

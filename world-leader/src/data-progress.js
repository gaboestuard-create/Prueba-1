/* =====================================================================
   WORLD LEADER · DATOS · FASE 5: logros, desbloqueables, estilos,
   rasgos de leyenda y fórmula de puntuación. Todo editable.
   Cada logro: [id, icono, nombre, descripción, condición(m), oculto?, desbloquea?]
   "m" son las métricas de la partida (ver metrics() en src/engine/7h-victory.js):
     turn gdpX gdpRank powRank appr stab com ali pna laws wars warsWon annex occ med tech firsts conf paz dem gen
     debt sancOn sancBy crimes elections treat spy coupsNear mode scen camp campStage campEnd vic over traits
     cash nukes noWarTurns lostElec allies regs gdp pop, y "g" las estadísticas globales (partidas, victorias…)
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  D.ACH = [
    // ---- primeros pasos
    ['primer', 'pin', 'Primer día en el palacio', 'Juega tu primer turno.', m => m.turn >= 1],
    ['ano', 'pin', 'Un año en el cargo', 'Aguanta 4 trimestres.', m => m.turn >= 4],
    ['legis', 'seg', 'Legislatura completa', 'Aguanta 16 trimestres.', m => m.turn >= 16],
    ['decada', 'seg', 'La década', 'Aguanta 40 trimestres.', m => m.turn >= 40],
    ['eterno', 'seg', 'El eterno', 'Aguanta 100 trimestres.', m => m.turn >= 100],
    ['ley1', 'obras', 'Tu primera ley', 'Aprueba una ley.', m => m.laws >= 1],
    ['ley10', 'obras', 'Legislador', 'Aprueba 10 leyes.', m => m.laws >= 10],
    ['ley25', 'obras', 'Reformador incansable', 'Aprueba 25 leyes.', m => m.laws >= 25],
    ['reeleg', 'jov', 'El pueblo ha hablado', 'Gana unas elecciones.', m => m.elections >= 1],
    ['reeleg3', 'jov', 'Tricampeón', 'Gana 3 elecciones.', m => m.elections >= 3],
    // ---- economía
    ['crece20', 'eco', 'Viento de cola', 'Haz crecer el PIB un 20%.', m => m.gdpX >= 1.2],
    ['crece50', 'eco', 'Milagro económico', 'Haz crecer el PIB un 50%.', m => m.gdpX >= 1.5],
    ['crece100', 'oro', 'El doble', 'Duplica el PIB.', m => m.gdpX >= 2],
    ['top10', 'oro', 'Club de los diez', 'Entra en las 10 mayores economías.', m => m.gdpRank <= 10],
    ['top1', 'oro', 'Número uno', 'Sé la primera economía del mundo.', m => m.gdpRank === 1],
    ['caja', 'emp', 'Colchón', 'Acumula en caja el 10% de tu PIB.', m => m.cash >= .1],
    ['sindeuda', 'emp', 'Cuentas limpias', 'Baja la deuda del 30% del PIB tras 20 turnos.', m => m.turn >= 20 && m.debt < .3],
    ['quiebra', 'presion', 'Bancarrota creativa', 'Ten una deuda del 150% del PIB y sigue gobernando.', m => m.debt >= 1.5, 1],
    // ---- diplomacia
    ['com5', 'acuerdo', 'Comerciante', 'Ten 5 tratados comerciales.', m => m.com >= 5],
    ['com20', 'acuerdo', 'La ruta de la seda', 'Ten 20 tratados comerciales.', m => m.com >= 20],
    ['ali3', 'acuerdo', 'Hermanos de armas', 'Ten 3 alianzas o pactos de defensa.', m => m.ali >= 3],
    ['ali10', 'acuerdo', 'Arquitecto de bloques', 'Ten 10 alianzas o pactos de defensa.', m => m.ali >= 10],
    ['treat25', 'acuerdo', 'Coleccionista de firmas', 'Firma 25 tratados en una partida.', m => m.treat >= 25],
    ['conf50', 'trofeo', 'Palabra de honor', 'Alcanza 50 de confianza internacional.', m => m.conf >= 50],
    ['med1', 'paz', 'Pacificador', 'Media con éxito en una guerra ajena.', m => m.med >= 1],
    ['med5', 'paz', 'El honesto intermediario', 'Logra 5 mediaciones.', m => m.med >= 5],
    ['amigos', 'regalo', 'Todo el mundo me quiere', 'Ten relación de 50 o más con 25 países.', m => m.friends >= 25],
    ['paria', 'presion', 'Persona non grata', 'Sufre sanciones de 15 países a la vez.', m => m.sancOn >= 15, 1],
    ['sancion10', 'presion', 'Mano dura comercial', 'Sanciona a 10 países a la vez.', m => m.sancBy >= 10],
    // ---- guerra y espionaje
    ['guerra1', 'tan', 'Bautismo de fuego', 'Entra en una guerra.', m => m.wars >= 1],
    ['gana1', 'tan', 'Victoria', 'Gana una guerra.', m => m.warsWon >= 1],
    ['gana5', 'tan', 'Señor de la guerra', 'Gana 5 guerras.', m => m.warsWon >= 5],
    ['anex1', 'frontera', 'Nuevas fronteras', 'Anexiona un país.', m => m.annex >= 1],
    ['anex5', 'frontera', 'Imperio', 'Anexiona 5 países.', m => m.annex >= 5],
    ['occ10', 'frontera', 'Ocupante', 'Ocupa 10 regiones extranjeras.', m => m.occ >= 10],
    ['pow1', 'mil', 'Primera potencia militar', 'Ten el ejército más poderoso del mundo.', m => m.powRank === 1],
    ['pacif40', 'paz', 'Cuarenta trimestres de paz', 'Llega al turno 40 sin haber entrado en ninguna guerra.', m => m.turn >= 40 && m.wars === 0],
    ['espia10', 'ojo', 'Ojos en todas partes', 'Ejecuta 10 operaciones de espionaje.', m => m.spy >= 10],
    ['crimen', 'bomb', 'La Haya te espera', 'Comete crímenes de guerra.', m => m.crimes >= 1, 1],
    ['nuke', 'ura', 'El botón rojo', 'Usa un arma nuclear.', m => m.nukes >= 1, 1],
    // ---- ciencia y política interior
    ['tec5', 'tec', 'Laboratorio nacional', 'Domina 5 tecnologías.', m => m.tech >= 5],
    ['tec12', 'tec', 'Era de la información', 'Domina 12 tecnologías.', m => m.tech >= 12],
    ['first1', 'tec', 'Primero en el mundo', 'Sé el primer país en lograr un gran descubrimiento.', m => m.firsts >= 1],
    ['first5', 'tec', 'Faro de la ciencia', 'Sé el primero en 5 grandes descubrimientos.', m => m.firsts >= 5],
    ['amado', 'jov', 'El querido', 'Llega al 75% de aprobación.', m => m.appr >= 75],
    ['odiado', 'presion', 'Récord de impopularidad', 'Baja del 15% de aprobación y sigue en el cargo.', m => m.appr < 15 && !m.over, 1],
    ['roca', 'seg', 'Roca firme', 'Llega a 85 de estabilidad.', m => m.stab >= 85],
    ['filo', 'presion', 'Al filo', 'Sobrevive 4 turnos con estabilidad por debajo de 15.', m => m.lowStab >= 4, 1],
    ['demo', 'jov', 'Faro democrático', 'Alcanza 50 de reputación democrática.', m => m.dem >= 50],
    ['golpes', 'ojo', 'Vecindario agitado', 'Vive 5 golpes de Estado en el mundo en una partida.', m => m.coups >= 5],
    // ---- finales, modos y campañas
    ['vic', 'trofeo', 'Victoria', 'Consigue cualquier victoria alternativa.', m => !!m.vic],
    ['vic_eco', 'oro', 'Hegemonía económica', 'Consigue la victoria económica.', m => m.vic === 'eco'],
    ['vic_dip', 'acuerdo', 'Concierto de naciones', 'Consigue la victoria diplomática.', m => m.vic === 'dip'],
    ['vic_dom', 'tan', 'Dominación', 'Consigue la victoria por dominación.', m => m.vic === 'dom'],
    ['vic_tec', 'tec', 'Siglo de las luces', 'Consigue la victoria científica.', m => m.vic === 'tec'],
    ['vic_leg', 'trofeo', 'Para la posteridad', 'Consigue la victoria por legado.', m => m.vic === 'leg', 0, 'u_edad'],
    ['camp1', 'pin', 'Primera campaña', 'Termina una campaña.', m => !!m.campEnd],
    ['camp_all', 'trofeo', 'Cronista del siglo', 'Termina 8 campañas distintas.', (m, g) => (g.campDone || 0) >= 8, 0, 'u_cronista'],
    ['camp_alt', 'trofeo', 'Otro final', 'Consigue dos finales distintos de la misma campaña.', (m, g) => !!g.twoEnds],
    ['rapido', 'pin', 'Contrarreloj', 'Termina una partida rápida con más de 60 puntos.', m => m.mode === 'rapido' && m.over && m.score >= 60],
    ['semanal', 'pin', 'Reto aceptado', 'Termina un reto semanal.', m => m.mode === 'semana' && m.over],
    ['caos', 'bomb', 'Sobreviviste al caos', 'Aguanta 20 turnos en el escenario Caos total.', m => m.scen === 'caos' && m.turn >= 20, 0, 'u_invierno'],
    ['frio', 'ura', 'Deshielo', 'Aguanta 20 turnos en la Guerra Fría sin entrar en guerra.', m => m.scen === 'guerrafria' && m.turn >= 20 && m.wars === 0],
    ['perm', 'seg', 'Sin red', 'Llega al turno 40 en muerte permanente.', m => m.perm && m.turn >= 40, 0, 'u_marco'],
    ['juegos5', 'pin', 'Veterano', 'Empieza 5 partidas.', (m, g) => g.games >= 5, 0, 'u_naciones'],
    ['juegos20', 'pin', 'Adicto al poder', 'Empieza 20 partidas.', (m, g) => g.games >= 20, 0, 'u_tema'],
    // ---- ocultos y con humor
    ['breve', 'puerta', 'Menos que un yogur', 'Pierde el poder antes del turno 4.', m => m.over && m.turn < 4, 1],
    ['exilio', 'puerta', 'Con una sola maleta', 'Termina en el exilio.', m => m.overR === 'exilio', 1],
    ['urnas', 'puerta', 'Gracias por los servicios prestados', 'Pierde unas elecciones.', m => m.overR === 'eleccion', 1],
    ['golpeado', 'tan', 'Despertar con tanques', 'Sufre un golpe de Estado.', m => m.overR === 'golpe' || m.overR === 'revolucion', 1],
    ['sandbox', 'ojo', 'Dios de bolsillo', 'Usa el editor en modo sandbox.', m => m.mode === 'sandbox' && m.edited, 1, 'u_retrato'],
    ['pobre', 'presion', 'Austeridad extrema', 'Ten la caja en números rojos 8 turnos seguidos.', m => m.redTurns >= 8, 1],
    ['patas', 'regalo', 'Diplomacia del mantel', 'Haz 10 visitas de Estado.', m => m.visits >= 10, 1],
    ['traidor', 'presion', 'Puñalada por la espalda', 'Declara la guerra a alguien con quien tenías un pacto.', m => m.betray >= 1, 1]
  ];
  /* desbloqueables: id → qué abre. Se ganan con logros (última columna de D.ACH) */
  D.UNLOCK = {
    u_edad: { n: 'Escenario «Edad de oro»', k: 'scen' }, u_invierno: { n: 'Escenario «Invierno nuclear»', k: 'scen' },
    u_naciones: { n: 'Naciones históricas al fundar país', k: 'nat' }, u_cronista: { n: 'Rasgo «Cronista»', k: 'trait' },
    u_marco: { n: 'Marco dorado para el retrato', k: 'frame' }, u_retrato: { n: 'Retrato de estilo grabado', k: 'frame' },
    u_tema: { n: 'Estilo de interfaz «Carmesí»', k: 'theme' }, u_leyenda: { n: 'Rasgos de leyenda', k: 'trait' }
  };
  /* los rasgos de leyenda se desbloquean con 15 logros cualesquiera */
  D.UNLOCK_BY_COUNT = [[15, 'u_leyenda'], [30, 'u_tema']];
  D.BRANCHES.leg = 'Leyenda';
  D.TRAITS.push(
    { id: 'cronista', b: 'leg', t: 1, lock: 'u_cronista', n: 'Cronista', pro: '+10% a las mejoras de relación y +2 pts en elecciones', con: '−2% de recaudación', m: { relGain: .1, elect: 2, income: -.02 } },
    { id: 'estadista', b: 'leg', t: 2, lock: 'u_leyenda', n: 'Estadista', pro: '+1 capital político por turno y +4 a que acepten tus tratados', con: '−0.05 pp de crecimiento', m: { cp: 1, treatyAcc: 4, growth: -.05 } },
    { id: 'mito', b: 'leg', t: 3, lock: 'u_leyenda', n: 'Mito viviente', pro: 'Escándalos a la mitad y estabilidad +0.15/turno', con: '−10% a las mejoras de afinidad: nadie te ve como uno más', m: { scandal: -.5, stabT: .15, secGain: -.1 } }
  );
  /* estilos de interfaz (variables CSS) */
  D.THEMES = {
    clasico: { n: 'Clásico', v: {} },
    esmeralda: { n: 'Esmeralda', v: { '--gold': '#7fe0a8', '--gold2': '#2f9e68', '--cyan': '#7fd6ff' } },
    artico: { n: 'Ártico', v: { '--gold': '#cfe6ff', '--gold2': '#7aa6d6', '--cyan': '#9ff0ff' } },
    carmesi: { n: 'Carmesí', lock: 'u_tema', v: { '--gold': '#ff8a7a', '--gold2': '#b23a2e', '--cyan': '#ffc46b' } }
  };
  D.FRAMES = { none: { n: 'Sin marco' }, oro: { n: 'Marco dorado', lock: 'u_marco' }, grabado: { n: 'Grabado', lock: 'u_retrato' } };

  /* puntuación: cada bloque aporta hasta su máximo; total de 0 a 100. Nada domina por sí solo */
  D.SCORE = [
    ['eco', 'Economía', 20, 'Crecimiento del PIB respecto al inicio (+50% = máximo) y deuda'],
    ['soc', 'Bienestar', 15, 'Aprobación media y estabilidad'],
    ['dip', 'Diplomacia', 15, 'Tratados, confianza y mediaciones'],
    ['paz', 'Paz y prestigio', 12, 'Reputación de paz y humanitaria, sin crímenes de guerra'],
    ['sci', 'Ciencia', 12, 'Tecnologías y descubrimientos pioneros'],
    ['pow', 'Poder', 12, 'Puesto militar mundial, guerras ganadas y territorio'],
    ['dur', 'Permanencia', 8, 'Tiempo en el poder'],
    ['obj', 'Objetivos', 6, 'Etapas de campaña o victoria conseguida']
  ];
})();

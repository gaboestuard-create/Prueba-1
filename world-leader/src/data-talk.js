/* =====================================================================
   WORLD LEADER · DATOS · CONVERSACIONES ENTRE LÍDERES, ASAMBLEA Y PRENSA
   Conversación: lista de líneas [quién, texto]. Quién: 'A' o 'B' (los dos
   líderes), 'X' (un tercero). Huecos: {A} {B} {X} países, {LA} {LB} {LX}
   líderes, {P} tu país, {PL} tú.
   Contextos: guerra, sanciones, tratado, golpe, anexión, paz, crisis,
   sobre ti (bien o mal) y charla de cumbre. Todo editable (verificado: false).
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA, fx = D.fx;
  D.TALK = {
    war: [
      [['X', '{LA}, detén esto. Cada día de guerra contra {B} es una vergüenza para todos.'], ['A', 'No empecé yo esta historia. {B} lleva años provocando.'], ['B', 'Mentira. Que el mundo vea quién cruzó la frontera primero.']],
      [['B', 'Mis ciudades arden y el mundo mira hacia otro lado.'], ['A', 'Rinde tus posiciones y esto termina mañana.'], ['X', 'Desde {X} pedimos un alto el fuego inmediato. Nadie gana así.']],
      [['A', 'Nuestra operación avanza según lo previsto.'], ['X', '¿Prevista? Hay columnas de refugiados en tres fronteras, {LA}.'], ['A', 'Los refugiados son responsabilidad de {B}.']]
    ],
    sanc: [
      [['B', '¿Sanciones, {LA}? Pensé que éramos socios.'], ['A', 'Los socios no hacen lo que hizo {B}.'], ['B', 'Lo pagarán vuestras empresas antes que nosotros.']],
      [['A', 'Las sanciones contra {B} seguirán hasta que cambie de rumbo.'], ['B', 'Nos habéis cerrado un mercado. Abriremos diez.'], ['X', 'Desde {X} miramos con preocupación esta escalada.']],
      [['B', 'Mi pueblo sabrá a quién culpar cuando falte el pan.'], ['A', 'Que culpe a quien gobierna, {LB}.']]
    ],
    treaty: [
      [['A', 'Un buen acuerdo, {LB}. Nuestros puertos ya lo notan.'], ['B', 'Y lo que viene. Brindemos por la próxima década.'], ['X', 'Desde {X} tomamos nota: quizá queramos sumarnos.']],
      [['B', 'Tus negociadores son duros, {LA}.'], ['A', 'Los tuyos también. Por eso este tratado va a durar.']],
      [['A', 'Que lo vea el mundo: {A} y {B} caminan juntos.'], ['B', 'Y que tomen nota los que apostaban a que nos peleáramos.']]
    ],
    coup: [
      [['X', '¿Alguien ha hablado con los nuevos militares de {A}?'], ['B', 'Yo sí. Prometen elecciones "cuando sea posible".'], ['X', 'O sea, nunca.']],
      [['B', 'Lo que pasa en {A} es un aviso para toda la región.'], ['X', 'Un aviso que nadie quiere escuchar, {LB}.']],
      [['A', 'La patria estaba en peligro. Hemos restaurado el orden.'], ['B', 'Con tanques en la plaza, {LA}. Curioso orden.']]
    ],
    annex: [
      [['X', '{A} ya no existe en los mapas de {B}. ¿Y ahora?'], ['B', 'Ahora reconstruimos. Es nuestra tierra.'], ['X', 'La historia no olvida estas cosas, {LB}.']],
      [['B', 'La unificación era inevitable.'], ['X', 'Eso dicen siempre los que se quedan con todo.']]
    ],
    peace: [
      [['A', 'Hemos firmado, {LB}. Que no tengamos que volver a vernos en un campo de batalla.'], ['B', 'Que sea la última vez. Mis soldados vuelven a casa.']],
      [['X', 'Por fin paz entre {A} y {B}. ¿Cuánto durará?'], ['A', 'Lo que dure la palabra de {LB}.'], ['B', 'Lo mismo digo.']]
    ],
    crisis: [
      [['A', 'Los mercados nos están destrozando, {LB}. Necesito una línea de crédito.'], ['B', 'Te la doy si abres tu sector energético.'], ['A', 'Eso es chantaje.'], ['B', 'Eso es economía.']],
      [['X', 'La crisis de {A} va a contagiarnos a todos.'], ['B', 'Por eso hay que dejar caer a sus bancos antes de que nos arrastren.']]
    ],
    gossipGood: [
      [['A', '¿Has visto lo que está haciendo {PL} en {P}?'], ['B', 'Sí. Ojalá más líderes trabajaran así.'], ['A', 'Habrá que invitarle a la próxima cumbre.']],
      [['B', '{P} cumple su palabra. Eso no abunda.'], ['A', 'Por eso mi gobierno quiere acercarse más a {PL}.']]
    ],
    gossipBad: [
      [['A', '¿Te fías de {PL}?'], ['B', 'Ni un poco. Ya viste lo que hizo.'], ['A', 'Entonces vigilemos a {P} de cerca.']],
      [['B', '{P} se cree más grande de lo que es.'], ['A', 'Alguien tendrá que recordárselo a {PL}.'], ['B', 'Con paciencia. Los imperios pequeños caen solos.']],
      [['X', 'Dicen que {PL} prepara algo.'], ['A', 'Que lo intente. Estaremos esperando.']]
    ],
    chat: [
      [['A', 'Hace frío en esta cumbre, {LB}.'], ['B', 'Más frío hace en tu política comercial.'], ['A', 'Touché.']],
      [['B', '¿Cómo van tus elecciones, {LA}?'], ['A', 'Como siempre: prometiendo lo que no puedo cumplir.'], ['B', 'Al menos eres honesto en privado.']],
      [['A', 'Mi ministro de Economía dice que el año que viene será mejor.'], ['B', 'El mío dice lo mismo desde hace diez años.']],
      [['X', '¿Alguien sabe quién paga la cena?'], ['A', 'Seguro que {B}, que acaba de firmar un gran contrato.'], ['B', 'Ni lo sueñes.']]
    ]
  };
  /* tus posibles respuestas cuando dos líderes discuten en público */
  D.TALK_REPLY = {
    duel: [['Apoyar a {A}', 'rel.A+3:Lo apoyaste en público;rel.B-3:Tomaste partido'], ['Apoyar a {B}', 'rel.B+3:Lo apoyaste en público;rel.A-3:Tomaste partido'], ['Pedir calma a los dos', 'rep.paz+1;rel.A+1:Llamada a la calma;rel.B+1:Llamada a la calma']],
    gossipGood: [['Agradecer en público', 'rel.A+3:Agradeciste sus palabras;rel.B+2:Agradeciste sus palabras'], ['Tomarlo con humildad', 'rep.conf+1']],
    gossipBad: [['Responder con dureza', 'sec.all+1;rel.A-4:Le respondiste;rel.B-2:Le respondiste'], ['Invitarlos a dialogar', 'rel.A+2:Tendiste la mano;rel.B+2:Tendiste la mano;rep.paz+1'], ['Ignorarlo', '']]
  };
  /* la asamblea de la ONU: discursos según el voto */
  D.UN_LINES = {
    si: ['{L} ({C}): «Votamos a favor. El mundo no puede mirar hacia otro lado.»', '{L} ({C}): «Esta resolución es lo mínimo que debemos a las víctimas.»', '{L} ({C}): «{C} apoya la propuesta sin reservas.»'],
    no: ['{L} ({C}): «Votamos en contra. Esto es injerencia disfrazada de justicia.»', '{L} ({C}): «Una resolución redactada por y para los poderosos.»', '{L} ({C}): «{C} no apoyará este doble rasero.»'],
    abs: ['{L} ({C}): «Nos abstenemos. Ni con unos ni con otros.»'],
    fin: { si: 'La presidenta de la Asamblea: «La resolución queda aprobada.» Aplausos en media sala.', no: 'La presidenta de la Asamblea: «La resolución queda rechazada.» Murmullos en el hemiciclo.' }
  };
  /* rueda de prensa: preguntas de periodistas según cómo te va */
  D.MEDIA = ['The Global Times', 'Le Monde Diplomatique', 'Agencia Andina', 'Al Jazira', 'Der Spiegel', 'El Correo del Sur', 'Nikkei Asia', 'Radio Continente'];
  const Q = [
    ['war', 'Su guerra cumple otro trimestre. ¿Cuándo volverán a casa los soldados?', [['«Cuando hayamos ganado.»', 'sec.mil+4;sec.jov-3'], ['«Estamos abiertos a negociar.»', 'rep.paz+3;sec.mil-3'], ['«Sin comentarios.»', 'sec.all-1']]],
    ['war', 'Hay denuncias de víctimas civiles. ¿Abrirá una investigación?', [['«Sí, con observadores internacionales.»', 'rep.gen+4;sec.mil-4'], ['«Son mentiras del enemigo.»', 'rep.gen-3;sec.mil+3']]],
    ['crisis', 'La crisis golpea a las familias. ¿Qué les dice?', [['«Vienen meses duros, pero saldremos.»', 'sec.all+1'], ['«La culpa es del gobierno anterior.»', 'party.opp-3;rep.conf-1'], ['«Habrá ayudas directas.»', '$g-.3;sec.obr+5']]],
    ['low', 'Las encuestas le dan su peor nota. ¿Piensa dimitir?', [['«Jamás. El pueblo me eligió.»', 'sec.mil+2;sec.jov-3'], ['«Escucho las críticas y voy a cambiar cosas.»', 'sec.all+2;cp-1'], ['«Las encuestas se equivocan siempre.»', 'sec.all-2']]],
    ['high', 'Es usted el líder más popular de la década. ¿Su secreto?', [['«Trabajar sin descanso.»', 'sec.all+1'], ['«Escuchar a la gente.»', 'sec.jov+3;sec.obr+2'], ['«Rodearme de los mejores.»', 'sec.emp+3;cp+1']]],
    ['sanc', 'Varios países le sancionan. ¿Está aislado?', [['«Tenemos más amigos que nunca.»', 'rep.conf-1;sec.mil+2'], ['«Buscaremos el diálogo con todos.»', 'rep.paz+2;rep.conf+2']]],
    ['any', 'Se rumorea un escándalo de contratos públicos en su gabinete.', [['«Abriré una auditoría independiente.»', 'rep.dem+3;cp-1;sec.all+1'], ['«Es una campaña de desprestigio.»', 'sec.all-2;rep.dem-2'], ['Cortar la pregunta', 'rep.dem-3']]],
    ['any', '¿Cuál es su prioridad para el próximo año?', [['«La economía.»', 'sec.emp+3'], ['«La educación y la salud.»', 'sec.jov+2;sec.obr+2'], ['«La seguridad.»', 'sec.mil+3;sec.jov-1']]],
    ['any', 'Una periodista le pregunta por su relación con {X}.', [['«Excelente, y va a mejorar.»', 'rel.T+4:Elogios en rueda de prensa'], ['«Tenemos diferencias que resolver.»', ''], ['«No confiamos en ellos.»', 'rel.T-6:Críticas en rueda de prensa;sec.mil+2']]]
  ];
  D.PRESS = Q.map(q => ({ if: q[0], q: q[1], opts: q[2].map(o => ({ t: o[0], fx: fx(o[1]) })) }));
})();

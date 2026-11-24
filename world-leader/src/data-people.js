/* =====================================================================
   WORLD LEADER · DATOS · PERSONAJES, CUMBRES Y SALA DE CRISIS
   Personajes recurrentes: actitud (-100..100) hacia ti. Sus escenas usan
   {N} (su nombre), {P} tu país, {PL} tú, {O} partido de la oposición.
   Cada opción: [texto, efectos (mini-lenguaje), cambio de actitud].
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA, fx = D.fx, O = o => o.map(x => ({ t: x[0], fx: fx(x[1]), att: x[2] }));
  D.PEOPLE = {
    opo: { n: 'Líder de la oposición', role: 'Jefe de {O}', ic: 'jov', scenes: [
      { if: 'lowAppr', t: '{N} pide tu dimisión', x: '{N}, jefe de {O}, aprovecha tus malas encuestas: «Este gobierno está agotado».', opts: O([['Responder en el congreso', 'cp-1;sec.all+1', -5], ['Invitarlo a un pacto de Estado', 'cp-1;party.opp+3;stab+2', 15], ['Ignorarlo', 'sec.all-1', -3]]) },
      { if: 'any', t: '{N} propone una ley conjunta', x: '{N} te ofrece apoyar una reforma educativa si cedes en otra cosa.', opts: O([['Aceptar el pacto', 'sec.jov+3;cp-1;party.opp+2', 12], ['Rechazarlo', 'sec.all-1', -8]]) },
      { if: 'elecNear', t: 'Debate televisado con {N}', x: 'A pocas semanas de las elecciones, {N} te reta a un debate en directo.', opts: O([['Aceptar y atacar', 'camp+3;sec.all+1', -10], ['Aceptar y proponer', 'camp+2;rep.dem+2', 2], ['No ir al debate', 'camp-2', -4]]) } ] },
    per: { n: 'Periodista', role: 'Columnista de investigación', ic: 'pre', scenes: [
      { if: 'any', t: 'Entrevista con {N}', x: '{N}, cuya columna es la más leída del país, quiere entrevistarte a fondo.', opts: O([['Entrevista sin condiciones', 'rep.dem+3;chance.5{sec.all+2}{sec.all-2}', 12], ['Solo con preguntas pactadas', 'sec.all+1', -6], ['Negarse', 'rep.dem-2', -10]]) },
      { if: 'hostile', t: '{N} investiga a tu gobierno', x: '{N} prepara un reportaje sobre contratos de tu gobierno. Tu jefe de gabinete propone «hablar con su editor».', opts: O([['Dejar trabajar a la prensa', 'chance.5{rep.dem+4}{stab-3;sec.all-3}', 8], ['Presionar a su editor', 'rep.dem-8;sec.pre-6', -25], ['Filtrar una exclusiva a cambio', 'cp-1;sec.pre+3', 5]]) } ] },
    gen: { n: 'Jefe del Estado Mayor', role: 'General de las Fuerzas Armadas', ic: 'mil', scenes: [
      { if: 'war', t: '{N} pide más recursos', x: 'El general {N} exige más presupuesto para la guerra: «Sin munición no hay victoria».', opts: O([['Concederlo', '$g-.3;sec.mil+6;units.tierra+5', 12], ['Pedirle que haga más con menos', 'sec.mil-4', -10]]) },
      { if: 'milLow', t: '{N} expresa su malestar', x: 'En una cena privada, el general {N} te advierte de que la tropa está descontenta.', opts: O([['Subir el sueldo militar', '$g-.2;sec.mil+5', 15], ['Recordarle quién manda', 'sec.mil-3;stab-1', -15], ['Pedirle paciencia', '', -3]]) },
      { if: 'any', t: '{N} propone unas maniobras', x: 'El general {N} quiere unas grandes maniobras para mostrar fuerza ante los vecinos.', opts: O([['Aprobarlas', '$g-.1;sec.mil+3;relAll.big-1:Maniobras de exhibición', 8], ['Algo discreto', 'sec.mil+1', 2]]) } ] },
    mag: { n: 'Magnate', role: 'Empresario más rico del país', ic: 'emp', scenes: [
      { if: 'any', t: '{N} te ofrece invertir', x: '{N}, el hombre más rico del país, promete una gran inversión si rebajas un impuesto que le afecta.', opts: O([['Trato hecho', '$g+.4;sec.emp+5;sec.obr-4;rep.dem-2', 15], ['Invertir sin favores', 'sec.emp-2', -8], ['Subirle los impuestos', '$g+.2;sec.obr+4;sec.emp-6', -20]]) },
      { if: 'friendly', t: '{N} financia tu fundación', x: '{N} quiere donar a una fundación cercana a tu partido. Nadie tiene por qué saberlo.', opts: O([['Aceptar la donación', 'camp+3;chance.3{rep.dem-6;sec.all-3}{}', 10], ['Rechazarla', 'rep.dem+2', -5]]) } ] }
  };
  D.PEOPLE_CFG = { p: .3, cool: 2, hostile: -30, friendly: 30, perPress: .04, genCoup: -50, opoElect: 2 };

  /* cumbre anual: los grandes se reúnen; eliges con quién reunirte y el tema central */
  D.SUMMIT = { every: 4, at: 2, invites: 14, meet: 2, rank: 25, rel: 7, treatyP: .35, topics: {
    clima: { n: 'Cambio climático', fx: fx('rep.gen+3;sec.jov+3;sec.emp-2') }, comercio: { n: 'Comercio global', fx: fx('sec.emp+3;grow+.05/4') },
    seguridad: { n: 'Seguridad internacional', fx: fx('rep.paz+3;sec.mil+2') }, salud: { n: 'Salud mundial', fx: fx('rep.gen+4;sec.jub+2') } } };

  /* sala de crisis: tres fases, una por turno; cada opción suma puntos (v). El total decide el final */
  const C = (id, n, steps, end) => ({ id, n, steps: steps.map(s => ({ x: s[0], opts: s[1].map(o => ({ t: o[0], v: o[1], fx: fx(o[2] || '') })) })), end: { ok: fx(end[0]), mid: fx(end[1]), bad: fx(end[2]) } });
  D.CRISES = [
    C('rehenes', 'Rehenes en la embajada', [
      ['Un grupo armado toma tu embajada en el extranjero con 40 diplomáticos dentro. Exigen la liberación de presos.', [['Abrir un canal de negociación', 2], ['Preparar a las fuerzas especiales', 1, 'sec.mil+2'], ['Declarar que no se negocia con terroristas', 0, 'sec.all+2']]],
      ['Los secuestradores liberan a 5 rehenes como gesto, pero amenazan con ejecutar a uno al día.', [['Pagar un rescate discreto', 2, '$g-.3'], ['Ganar tiempo con mediadores', 1], ['Ultimátum público', 0, 'rep.paz-2']]],
      ['Tus fuerzas especiales están en posición. El país contiene la respiración.', [['Asalto relámpago', 1, 'chance.5{}{stab-3}'], ['Último intento de diálogo', 2], ['Ceder a sus exigencias', 1, 'rep.conf-5']]]],
      ['sec.all+5;rep.conf+5;stab+3', 'sec.all+1', 'sec.all-6;stab-5;rep.conf-4']),
    C('ciber', 'Ciberataque a la red eléctrica', [
      ['Media capital se queda sin luz: un ciberataque ha tomado el control de la red eléctrica.', [['Activar el protocolo de emergencia', 2, '$g-.1'], ['Culpar públicamente a un país rival', 0, 'sec.all+1'], ['Esperar a los técnicos', 1]]],
      ['Los hospitales funcionan con generadores. Los atacantes piden un rescate en criptomonedas.', [['Pagar en secreto', 1, '$g-.3;rep.dem-2'], ['Pedir ayuda a tus aliados', 2], ['Apagar toda la red para limpiarla', 1, 'sec.emp-3']]],
      ['Los técnicos localizan el origen del ataque.', [['Contraataque informático', 1, 'chance.5{sec.mil+3}{rep.conf-3}'], ['Reforzar las defensas y callar', 2], ['Denunciarlo en la ONU', 1, 'rep.conf+2']]]],
      ['sec.all+3;stab+2;sec.tec+4', 'sec.emp-1', 'stab-6;sec.all-4;grow-.2/3']),
    C('nuclear', 'Accidente en una central nuclear', [
      ['Una fuga en una central nuclear obliga a evacuar 20 kilómetros a la redonda.', [['Evacuación inmediata y transparencia', 2, '$g-.2'], ['Minimizar para evitar el pánico', 0, 'chance.5{}{rep.dem-6}'], ['Evacuación parcial', 1]]],
      ['La nube radiactiva se mueve hacia una ciudad grande. Los vecinos exigen información.', [['Pedir ayuda internacional', 2, 'rep.conf+2'], ['Rueda de prensa diaria', 2, 'sec.all+1'], ['Censurar las redes sociales', 0, 'rep.dem-6']]],
      ['La fuga está contenida. Hay que decidir el futuro de la energía nuclear.', [['Cerrar todas las centrales', 1, 'sec.jov+4;sec.emp-5'], ['Revisarlas y mantenerlas', 2, 'sec.emp+2'], ['Seguir como si nada', 0]]]],
      ['sec.all+4;rep.gen+4', 'sec.all-1', 'stab-8;sec.all-6;rep.gen-4']),
    C('pandemia', 'Brote epidémico', [
      ['Un virus nuevo se propaga en tu capital. Los hospitales se llenan.', [['Confinamiento inmediato', 2, 'grow-.2/2;sec.emp-3'], ['Recomendaciones voluntarias', 1], ['Negar la gravedad', 0, 'sec.emp+2']]],
      ['El virus llega a otras regiones. Falta material sanitario.', [['Comprar material a cualquier precio', 2, '$g-.4'], ['Pedírselo a tus aliados', 1, 'rep.conf+1'], ['Racionar', 1, 'sec.all-2']]],
      ['Llegan las primeras vacunas.', [['Vacunar primero a mayores y sanitarios', 2, 'sec.jub+4'], ['Vacunar primero a trabajadores esenciales', 2, 'sec.obr+3'], ['Que decida el mercado', 0, 'sec.emp+2;rep.gen-4']]]],
      ['sec.all+4;rep.gen+3;stab+2', 'sec.all-1', 'stab-6;sec.all-5;grow-.3/4'])
  ];
  D.CRISIS_CFG = { p: .05, from: 6, cool: 16, ok: 5, mid: 3 };
})();

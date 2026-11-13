/* =====================================================================
   WORLD LEADER · DATOS · MÁS CONTENIDO: leyes, eventos, titulares,
   operaciones de guerra y gestos diplomáticos.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA, fx = D.fx;
  D.LAWS.push(
    { id: 'guarderias', cat: 'soc', n: 'Guarderías públicas universales', d: 'Plaza gratuita para cada niño.', eco: -1, sec: { med: 6, jov: 6, obr: 4, emp: 2 }, per: { cost: .2, grow: .05 } },
    { id: 'natalidad', cat: 'soc', n: 'Cheque por nacimiento', d: 'Dinero por cada hijo.', eco: 0, sec: { rel: 6, rur: 4, med: 3 }, per: { cost: .15 } },
    { id: 'loteria', cat: 'imp', n: 'Legalización del juego', d: 'Casinos y apuestas con impuestos altos.', eco: 1, sec: { rel: -8, emp: 4, jub: -3 }, per: { tax: .5, stab: -1 } },
    { id: 'turismo', cat: 'com', n: 'Plan nacional de turismo', d: 'Visados fáciles, promoción y aeropuertos.', eco: 1, sec: { emp: 6, med: 3, rur: 2 }, per: { cost: .08, grow: .07, trade: .05 } },
    { id: 'plasticos', cat: 'soc', n: 'Prohibición de plásticos de un solo uso', d: 'Adiós a bolsas y envases desechables.', eco: -1, sec: { jov: 5, emp: -4 }, rep: { gen: 2 } },
    { id: 'armas_civiles', cat: 'seg', n: 'Libre porte de armas', d: 'Cualquier adulto puede ir armado.', eco: 2, auth: -.5, grp: 'armas', sec: { rur: 7, mil: 3, jov: -5, min: -5, med: -3 }, per: { stab: -3 } },
    { id: 'desarme', cat: 'seg', n: 'Desarme civil', d: 'Recompra obligatoria de armas.', eco: -1, grp: 'armas', sec: { rur: -7, med: 4, jov: 3, min: 3 }, per: { stab: 3, cost: .05 } },
    { id: 'anticorrupcion', cat: 'seg', n: 'Fiscalía anticorrupción', d: 'Fiscales independientes con dientes.', eco: 0, auth: -.5, sec: { med: 6, pre: 5, emp: -3 }, rep: { conf: 5 }, per: { scandal: .25, cost: .05, stab: 2 } },
    { id: 'teletrabajo', cat: 'eco', n: 'Derecho al teletrabajo', d: 'Trabajar desde casa por ley.', eco: 0, sec: { tec: 6, jov: 5, med: 4, emp: -4 }, per: { oilSave: .05 } },
    { id: 'reserva_estrategica', cat: 'mil', n: 'Reserva militar ciudadana', d: 'Voluntarios entrenados un mes al año.', eco: 0, sec: { mil: 6, jov: -3 }, per: { cost: .06, mil: .04 } },
    { id: 'agua', cat: 'obr', n: 'Plan hídrico nacional', d: 'Desaladoras y trasvases. Cinco trimestres de obras.', build: 5, eco: -1, sec: { rur: 8, med: 3 }, per: { cost: .2, stab: 2, prodMul: .05 } },
    { id: 'puertos', cat: 'obr', n: 'Megapuerto y corredor logístico', d: 'La puerta de tu comercio. Seis trimestres de obras.', build: 6, eco: 1, sec: { emp: 7, sin: 3, rur: -2 }, per: { cost: .25, trade: .2, grow: .08 } }
  );
  // Titulares del mundo
  D.WORLD_EVENTS.push(
    { t: 'Erupción volcánica en {X} cierra el espacio aéreo regional', w: 3, x: 'any', fx: [['cstab', -4], ['stock', 'log', .93]] },
    { t: 'Récord de turismo mundial: las aerolíneas se disparan', w: 3, fx: [['stock', 'log', 1.1], ['price', 'pet', 1.05]] },
    { t: 'Hackeo masivo paraliza bancos de tres continentes', w: 3, fx: [['stock', 'fin', .9], ['stock', 'tec', .96]] },
    { t: 'Hallan un megayacimiento de tierras raras en {X}', w: 2, x: 'any', fx: [['price', 'tie', .82], ['cgdp', 1.5]] },
    { t: 'Plaga arrasa los cafetales: el café toca máximos', w: 3, fx: [['price', 'caf', 1.3]] },
    { t: 'Nueva batería sin litio sacude el mercado', w: 2, fx: [['price', 'lit', .78], ['stock', 'aut', 1.07]] },
    { t: 'Huelga portuaria mundial: los fletes se triplican', w: 2, fx: [['stock', 'log', 1.2], ['sent', -.03]] },
    { t: 'Ola de calor histórica dispara el consumo eléctrico', w: 3, fx: [['price', 'gas', 1.15], ['price', 'car', 1.12]] },
    { t: 'Escándalo de dopaje empaña los Juegos; {X} pierde su sede', w: 2, x: 'any', fx: [['cstab', -2]] },
    { t: 'Fusión histórica entre gigantes tecnológicos', w: 3, fx: [['stock', 'tec', 1.07]] },
    { t: 'El níquel se desploma por exceso de oferta', w: 2, fx: [['price', 'niq', .8]] },
    { t: 'La plata brilla: la demanda solar agota existencias', w: 2, fx: [['price', 'pla', 1.22]] },
    { t: 'Descubren una vacuna universal contra la gripe', w: 2, fx: [['stock', 'far', 1.18]] },
    { t: 'Motín militar sofocado en {X}', w: 3, x: 'unstable', fx: [['cstab', -6]] },
    { t: 'Boom de natalidad y consumo en {X}', w: 2, x: 'any', fx: [['cgdp', 1.2], ['cstab', 2]] },
    { t: 'Colapsa una gran constructora: temor a efecto dominó', w: 2, fx: [['stock', 'fin', .9], ['stock', 'ind', .9], ['price', 'hie', .9]] },
    { t: 'Carrera espacial: tres potencias anuncian bases lunares', w: 2, fx: [['stock', 'def', 1.06], ['stock', 'tec', 1.04]] },
    { t: 'Histórico acuerdo pesquero calma las aguas en disputa', w: 2, fx: [['sent', .02]] },
    { t: 'Apagón de satélites deja sin GPS a medio planeta', w: 2, fx: [['stock', 'log', .92], ['stock', 'tec', .95]] },
    { t: 'El hierro sube: Asia vuelve a construir', w: 3, fx: [['price', 'hie', 1.18], ['price', 'cob', 1.08]] }
  );
  // Eventos interactivos (va después de data-events2.js: usa su D.fx)
  const E = [
    ['ocupa_resist', 14, { occupier: 1, cool: 5 }, 'occupied', 'Resistencia en la zona ocupada', 'Un atentado contra tus tropas en territorio de {T} deja decenas de muertos. La población local calla… y protege a los autores.',
      [['Represalia ejemplar', 'rep.gen-8;rep.dem-4;rel.T-12:Represalias contra civiles;sec.mil+4', 'later3@.6{stab-3;sec.jov-5;rep.paz-5}:Las imágenes de la represalia dan la vuelta al mundo'], ['Ganarse a la población', '$g-.3;rel.T+5:Reconstrucción en la zona ocupada;sec.mil-3'], ['Replegarse a posiciones seguras', 'sec.mil-5;rep.paz+2']]],
    ['ocupa_colonos', 8, { occupier: 1, cool: 9 }, 'occupied', 'Colonos', 'Empresarios y nacionalistas te piden abrir el territorio ocupado de {T} a tus ciudadanos.',
      [['Autorizar los asentamientos', 'sec.rur+6;sec.emp+4;rel.T-18:Colonizas su territorio;rep.paz-8;relAll.big-4:Tus asentamientos'], ['Prohibirlos', 'sec.rur-5;rep.paz+4;rel.T+4:Frenaste a los colonos'], ['Mirar hacia otro lado', 'rel.T-8:Asentamientos tolerados;rep.conf-3']]],
    ['heroe', 6, { cool: 10 }, '', 'El héroe incómodo', 'Un general condecorado, adorado por la tropa, empieza a opinar de política en televisión.',
      [['Ofrecerle un ministerio', 'sec.mil+8;party.gov-4;cp-1'], ['Pasarlo a retiro', 'sec.mil-8;rep.dem+3', 'chance.3{ev3:golpe}{}'], ['Enviarlo de embajador muy lejos', 'sec.mil-3;cp+1']]],
    ['fuga_cerebros', 6, { cool: 10 }, 'power', 'Se van los mejores', '{T} lanza visados exprés para tus ingenieros y médicos. Las universidades se vacían.',
      [['Subir sueldos públicos', '$g-.4;sec.tec+5;sec.med+3'], ['Exigir años de servicio a los becados', 'sec.jov-6;sec.tec-3;rep.dem-2'], ['Dejarlos ir', 'grow-.1/5;sec.tec-4']]],
    ['deporte', 7, { cool: 8 }, '', 'La final', 'La selección nacional juega la final del mundial. El país entero está en la calle.',
      [['Ir al palco', 'chance.5{sec.all+4;cp+1}{sec.all-2}'], ['Declarar festivo nacional', 'sec.obr+5;sec.jov+4;sec.emp-4;grow-.05/1'], ['Quedarte trabajando', 'sec.med+1']]],
    ['secuestro', 5, { cool: 12 }, 'neighbor', 'Avión secuestrado', 'Un avión comercial tuyo ha sido secuestrado y aterriza en {T}. Piden liberar presos.',
      [['Asalto de fuerzas especiales', 'appr{sec.all+6;sec.mil+6}{sec.all-7;rel.T-8:Tu asalto en su aeropuerto}'], ['Negociar', 'sec.mil-4;rep.conf-3;rel.T+4:Cooperaron en el secuestro'], ['Pedir a {T} que actúe', 'rel.T+6:Confiaste en ellos', 'chance.5{sec.all+3}{sec.all-5}']]],
    ['monopolio', 6, { cool: 10 }, '', 'El dueño de todo', 'Un solo empresario controla ya la telefonía, dos bancos y el mayor periódico. Te invita a cenar.',
      [['Ir a la cena', 'sec.emp+6;sec.pre+3;rep.conf-3', 'later4@.5{sec.med-5;sec.sin-5}:Se publica tu cena secreta con el magnate'], ['Trocear su imperio', 'sec.emp-10;sec.med+6;sec.sin+4;stock.home*.93'], ['Subirle los impuestos', '$g+.4;sec.emp-6']]],
    ['minoria_auto', 6, { cool: 12 }, '', 'Quieren votar su futuro', 'El parlamento de {R} aprueba convocar una consulta de autodeterminación.',
      [['Permitir la consulta', 'rep.dem+8;sec.min+8;sec.mil-8;sec.rur-4', 'chance.3{stab-10;sec.all-4}{stab+3}'], ['Prohibirla', 'sec.min-10;sec.mil+4;rep.dem-6;stab-3'], ['Ofrecer un estatuto especial', '$g-.3;sec.min+4;cp-2']]],
    ['regalo', 5, { cool: 8 }, 'power', 'Un regalo envenenado', '{L} te envía un regalo de Estado: un avión presidencial de lujo. La prensa ya pregunta.',
      [['Aceptarlo', 'rel.T+8:Aceptaste su regalo;sec.pre-5;rep.conf-4'], ['Subastarlo para hospitales', 'rel.T-3:Subastaste su regalo;sec.all+3;rep.gen+3'], ['Devolverlo', 'rel.T-8:Rechazaste su regalo;rep.conf+3']]],
    ['clima_extremo', 6, { cool: 9 }, '', 'El año sin invierno', 'Tercera cosecha perdida. Los científicos te entregan un informe que nadie quiere leer.',
      [['Plan de adaptación', '$g-.5;sec.rur+6;sec.jov+4'], ['Culpar a los países ricos', 'relAll.rich-3:Tus acusaciones climáticas;sec.rur+3'], ['Archivar el informe', 'sec.jov-5;sec.tec-3', 'later5@.6{sec.rur-8;grow-.2/3}:La sequía que predijo el informe llega puntual']]],
    ['desertores_mios', 5, { war: 1, cool: 6 }, '', 'Deserciones', 'Un batallón entero se niega a volver al frente. Sus madres acampan frente al palacio.',
      [['Consejo de guerra', 'sec.mil+3;sec.jov-8;sec.min-3;units.tierra-2'], ['Rotarlos y dar permisos', 'units.tierra-4;sec.jov+4;sec.mil-3'], ['Recibir a las madres', 'cp-1;sec.all+2;sec.mil-4']]],
    ['oferta_paz', 6, { war: 1, cool: 7 }, 'power', 'Un mediador', '{L} se ofrece a mediar en tu guerra. Aceptar es admitir que quieres salir; negarse, que no.',
      [['Aceptar la mediación', 'rep.paz+6;rel.T+8:Aceptaste su mediación;sec.mil-4'], ['Rechazarla', 'rel.T-6:Rechazaste su mediación;rep.paz-4;sec.mil+3'], ['Usarla para ganar tiempo', 'rep.conf-4;units.tierra+3']]]
  ];
  E.forEach(e => D.EVENTS.push({ id: e[0], w: e[1], if: e[2], tgt: e[3] || null, t: e[4], x: e[5], opts: e[6].map(o => ({ t: o[0], fx: fx(o[1]), hid: fx(o[2]) })) }));
  D.WAROPS = {
    bomb: { n: 'Bombardeo estratégico', d: 'Tu aviación golpea fábricas y cuarteles: −5% de sus fuerzas y −4 de estabilidad. El mundo lo ve.', cp: 1 },
    bloqueo: { n: 'Bloqueo naval', d: 'Tu armada cierra sus puertos: su economía cae y su moral también. Necesitas superioridad en el mar.', cp: 1 },
    ofensiva: { n: 'Ofensiva general', d: 'Una batalla extra este turno, pagando un 3% de bajas de entrada.', cp: 2 }
  };
  D.GESTURES = {
    cultural: { n: 'Intercambio cultural', d: 'Becas, giras y exposiciones: +2 ahora y +1 por turno durante 6.', cp: 0 },
    denuncia: { n: 'Denuncia pública', d: 'Los señalas ante el mundo: −10 con ellos, +4 con cada uno de sus rivales.', cp: 1 },
    ultimatum: { n: 'Ultimátum', d: 'Exiges tributo bajo amenaza. Solo funciona si los alcanzas y los doblas en fuerza.', cp: 2 }
  };
})();

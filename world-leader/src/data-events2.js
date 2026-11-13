/* =====================================================================
   WORLD LEADER · DATOS · EVENTOS (Fase 2): 64 eventos, cadenas y arcos
   Cada fila: [id, peso, condición, objetivo, título, texto, opciones, previo?]
   opción: [texto, efectos visibles, efectos ocultos?]
   Mini-lenguaje de efectos (se separan con ";"):
     $-0.3 (mM$) · $g-1.2 (% PIB) · stab+3 · cp-2 · inf+1 · unemp-.5 · fxr-5 · debt+3 (% PIB) · camp+2
     sec.obr+8 · sec.all-4 · rep.paz+3 · party.opp-5 · rel.T-12:Motivo · relAll.big+4:Motivo
     grow-.3/3 (pp durante 3 turnos) · price.pet*1.2 · stock.tec*.9 · prod.lit+2 · units.tierra-10 · ind.man-1
     flag.nombre · arc.rival+1 · over.golpe · ev3:id (encadena el evento "id" dentro de 3 turnos)
     later5@.7{...}:Titular (consecuencia diferida con probabilidad) · chance.5{si}{no} · appr{si}{no} (según aprobación)
   Textos: {T} país, {L} su líder, {R} una región tuya, {O} principal partido opositor.
   Condiciones: ver cond2() en el motor (infGt, unempGt, debtGt, fxLt, cri, minority, war, peace, arc, bloc, p5, every, gpcGt…).
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  function blocks(s, from) { const out = []; let i = from; while (s[i] === '{') { let d = 0, j = i; for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && !--d) break; } out.push(s.slice(i + 1, j)); i = j + 1; } return [out, i]; }
  function tok(t) {
    let m;
    if ((m = /^later(\d+)(?:@([\d.]+))?(?=\{)/.exec(t))) { const [b, e] = blocks(t, m[0].length); return ['later', +m[1], m[2] ? +m[2] : 1, fx(b[0]), t[e] === ':' ? t.slice(e + 1) : '']; }
    if ((m = /^chance([\d.]+)(?=\{)/.exec(t))) { const [b] = blocks(t, m[0].length); return ['chance', +m[1], fx(b[0]), fx(b[1] || '')]; }
    if (/^appr\{/.test(t)) { const [b] = blocks(t, 4); return ['chanceAppr', fx(b[0]), fx(b[1] || '')]; }
    if ((m = /^ev(\d+):(\w+)$/.exec(t))) return ['chain', +m[1], m[2]];
    if ((m = /^(over|flag)\.(\w+)$/.exec(t))) return [m[1], m[2]];
    if (!(m = /^([a-zA-Z$]+)(?:\.(\w+))?([+\-*])([\d.]+)(?:\/(\d+))?(?::(.*))?$/.exec(t))) throw new Error('Efecto mal escrito: ' + t);
    const k = m[1], sub = m[2], v = m[3] === '-' ? -m[4] : +m[4];
    if (k === 'sec' || k === 'rep' || k === 'price' || k === 'stock' || k === 'prod' || k === 'units' || k === 'party' || k === 'arc' || k === 'ind') return [k, sub, v];
    if (k === 'rel') return ['rel', sub, v, m[6]]; if (k === 'relAll') return ['relAll', v, m[6], sub]; if (k === 'grow') return ['grow', v, +m[5] || 3];
    return [k, v];
  }
  function fx(s) { const out = []; let i = 0; s = s || ''; while (i < s.length) { let j = i, d = 0; while (j < s.length && (s[j] !== ';' || d)) { if (s[j] === '{') d++; else if (s[j] === '}') d--; j++; } const t = s.slice(i, j).trim(); i = j + 1; if (t) out.push(tok(t)); } return out; }
  D.fx = fx;
  const E = [
    // ---------- ECONOMÍA ----------
    ['cesta', 14, { infGt: 9, cool: 6 }, '', 'La cesta de la compra', 'Los precios suben más rápido que los sueldos. En los mercados ya se oye tu nombre, y no para bien.',
      [['Controlar precios por decreto', 'inf-2;sec.emp-6;sec.obr+3', 'later4@.6{grow-.3/3;sec.med-4}:Los controles de precios vacían los estantes'], ['Subir los tipos de golpe', 'inf-3;unemp+1;sec.med-3'], ['Repartir bonos de ayuda', '$g-.5;sec.obr+6;sec.jub+4;inf+.5']]],
    ['paro', 12, { unempGt: 11, cool: 6 }, '', 'Generación sin trabajo', 'Uno de cada cuatro jóvenes no encuentra empleo. Las colas empiezan a parecerse a manifestaciones.',
      [['Plan de empleo público', '$g-.6;unemp-1.5;sec.jov+6;sec.sin+3'], ['Bonificar a quien contrate', '$g-.3;unemp-.8;sec.emp+4'], ['Que busquen fuera', 'sec.jov-8;unemp-.5', 'later5@.7{sec.tec-4;grow-.1/4}:La fuga de talento joven empieza a notarse']]],
    ['moneda', 14, { fxLt: 85, cool: 6 }, '', 'Corrida contra la moneda', 'Los especuladores apuestan a que tu moneda se hunde. Cada hora que pasa les da la razón.',
      [['Quemar reservas para defenderla', '$g-1;fxr+8'], ['Dejarla flotar', 'fxr-5;inf+1.5;grow+.15/3'], ['Control de cambios', 'fxr+10;sec.emp-8;stock.home*.85;rep.conf-3']]],
    ['rating', 12, { debtGt: .8, cool: 8 }, '', 'Rebaja de calificación', 'Las agencias degradan tu deuda a un escalón del bono basura.',
      [['Anunciar un ajuste creíble', 'sec.all-4;debt-3;party.opp+3'], ['Despreciar a las agencias', 'sec.obr+2', 'later3@.7{fxr-8;inf+1;stock.home*.9}:Los mercados castigan la arrogancia: se dispara la prima de riesgo'], ['Reestructurar con los acreedores', 'debt-10;rep.conf-8;relAll.rich-5:Reestructuraste tu deuda']]],
    ['contagio', 0, {}, '', 'La crisis llama a tu puerta', 'La crisis financiera que empezó en {T} ha llegado a tus bancos. Dos de los grandes no abrirán mañana si no haces algo.',
      [['Rescatar a la banca', '$g-1.5;sec.emp+5;sec.obr-6;sec.sin-4;stab+2'], ['Dejar caer a uno como escarmiento', 'stock.home*.85;unemp+1;sec.med-5', 'later4{grow+.2/4}:El sistema financiero sale saneado de la crisis'], ['Corralito', 'fxr+4;sec.med-10;sec.jub-8;stab-6']]],
    ['burbuja', 5, { gpcGt: 18, once: 1, turnGte: 5 }, '', 'Fiebre del ladrillo', 'Los pisos se venden antes de construirse y los bancos prestan a cualquiera. Tu ministro de Economía duerme mal.',
      [['Pinchar la burbuja ahora', 'grow-.25/3;sec.med-4;sec.emp-3'], ['No tocar nada: la fiesta da votos', 'sec.med+4;grow+.1/3', 'later6@.7{grow-.6/4;unemp+1.5;sec.med-8;stock.fin*.8}:Estalla la burbuja inmobiliaria'], ['Vivienda pública masiva', '$g-.8;sec.jov+6;sec.emp-4']]],
    ['fabrica', 8, { cool: 8 }, 'power', 'La fábrica se va', 'Una multinacional de {T} amenaza con cerrar su mayor planta en {R} y llevársela a otro país.',
      [['Subvencionarla para que se quede', '$g-.4;sec.sin+4;sec.emp+3'], ['Dejar que se vaya', 'ind.man-1;unemp+.6;sec.obr-5;sec.sin-5'], ['Expropiar la planta', 'sec.sin+8;sec.emp-8;rel.T-10:Expropiaste a su empresa;stock.home*.93']]],
    ['gas', 5, { once: 1 }, 'neighbor', 'Gas bajo la frontera', 'Una prospección confirma un gran yacimiento de gas a caballo entre tu territorio y el de {T}.',
      [['Explotarlo por tu cuenta', 'prod.gas+2;rel.T-18:Explotaste solo el gas compartido'], ['Consorcio conjunto', 'prod.gas+1;rel.T+10:Compartiste el yacimiento'], ['Moratoria ambiental', 'sec.jov+6;sec.emp-4;rep.gen+3']]],
    ['cripto', 6, { cool: 12 }, '', 'La moneda del futuro', 'El lobby tecnológico te propone adoptar una criptomoneda como moneda de curso legal.',
      [['Adoptarla', 'sec.tec+8;sec.jov+4', 'chance.5{$g+.8}{$g-1;rep.conf-4;fxr-4}'], ['Regularla con mano firme', 'sec.tec-4;sec.med+2'], ['Prohibirla', 'sec.tec-10;sec.jov-5;fxr+2']]],
    ['pensiones', 9, { secLt: ['jub', 40], cool: 8 }, '', 'El sistema de pensiones no cuadra', 'La caja de pensiones tiene dinero para tres años. Los jubilados ya han convocado una marcha.',
      [['Subirlas igualmente', '$g-.7;sec.jub+10;debt+1'], ['Retrasar la jubilación', 'sec.jub-8;sec.sin-6;sec.emp+4;debt-1'], ['Fondo privado obligatorio', 'sec.emp+6;sec.jub-4;stock.fin*1.06', 'later6@.4{sec.jub-8;sec.med-4}:El fondo privado de pensiones pierde un tercio en bolsa']]],
    ['minera', 7, { cool: 10 }, 'power', 'La concesión', 'Una minera de {T} quiere abrir un yacimiento gigante en {R}. Promete empleo; los vecinos temen por el agua.',
      [['Aprobarla', 'prod.cob+1;$g+.4;sec.rur-7;sec.emp+5;rel.T+5:Abriste la puerta a su minera', 'later5@.4{sec.rur-8;rep.gen-4}:Un vertido de la mina envenena el río'], ['Exigir regalías altas', 'chance.5{prod.cob+1;$g+.8}{rel.T-6:Espantaste a su minera;sec.emp-3}'], ['Rechazarla', 'sec.rur+6;sec.min+3;sec.emp-5']]],
    ['cumbre_eco', 10, { gdpGt: 300, every: 8 }, 'power', 'Cumbre económica mundial', 'Las veinte mayores economías se reúnen. {L} propone un plan coordinado; todos miran quién pone el dinero.',
      [['Sumarte al plan coordinado', '$g-.3;grow+.15/4;relAll.big+4:Cooperaste en la cumbre económica'], ['Defender tus aranceles', 'sec.sin+3;sec.rur+3;relAll.trade-3:Bloqueaste el acuerdo comercial'], ['Proponer condonar deuda a los pobres', 'rep.gen+6;$g-.2;relAll.rich-2:Tu propuesta de condonación']]],
    // ---------- POLÍTICA ----------
    ['filtracion', 9, { cool: 7 }, '', 'Los audios', 'Alguien ha grabado a tu jefe de gabinete repartiendo contratos por teléfono. Un diario los publicará mañana.',
      [['Cesarlo antes de que salgan', 'cp-2;sec.pre+4;sec.med+3;party.gov-3'], ['Presionar al diario', 'sec.pre-10;rep.dem-6', 'chance.5{later2{sec.all-7;flag.scandal;party.opp+5}:Los audios salen igual, y con tu llamada al director incluida}{}'], ['Dar la cara en televisión', 'appr{sec.all+3;rep.conf+2}{sec.all-5;flag.scandal}']]],
    ['socio', 10, { minority: 1, cool: 6 }, '', 'El precio de un socio', '{O} te ofrece sus votos para toda la legislatura. A cambio quiere un ministerio y enterrar una de tus reformas.',
      [['Aceptar el trato', 'party.opp+15;cp+2;sec.all-2'], ['Negociar solo el ministerio', 'chance.5{party.opp+10;cp+1}{party.opp-6}'], ['Gobernar en minoría con orgullo', 'sec.all+2;party.opp-8;stab-2']]],
    ['transfuga', 7, { dem: 1, cool: 8 }, '', 'Tránsfugas', 'Seis diputados de {O} quieren pasarse a tu grupo. Piden cargos, claro.',
      [['Darles cargos', 'cp+2;rep.conf-3;party.opp-10', 'later3@.5{sec.pre-5;sec.med-4}:Se publica la lista de cargos que compraron seis escaños'], ['Aceptarlos sin premio', 'chance.4{cp+1}{}'], ['Rechazarlos en público', 'sec.med+3;rep.conf+3;party.opp+4']]],
    ['juez', 7, { dem: 1, cool: 10 }, '', 'El tribunal contra el palacio', 'El Tribunal Supremo tumba una de tus leyes estrella por inconstitucional.',
      [['Acatar la sentencia', 'rep.dem+5;cp-2;sec.med+2'], ['Reformar el tribunal', 'rep.dem-12;sec.pre-6;cp+2;party.opp-8', 'later4@.6{stab-8;sec.jov-6}:Miles de personas rodean el tribunal para defenderlo'], ['Desobedecer', 'rep.dem-18;stab-6;sec.mil-4;rep.conf-6']]],
    ['gobernador', 8, { cool: 8 }, '', 'El gobernador rebelde', 'La autoridad de {R} se niega a aplicar tus leyes y amenaza con dejar de recaudar para el Estado.',
      [['Negociar más autonomía', '$g-.3;stab+3;sec.rur+3'], ['Intervenir la región', 'stab-5;rep.dem-6;sec.mil+3', 'later3@.5{stab-6;sec.min-6}:La intervención de la región acaba en disturbios'], ['Cortarle la financiación', 'chance.5{stab+2}{stab-4;party.opp+4}']]],
    ['referendum', 5, { dem: 1, once: 1, turnGte: 6 }, '', 'Referéndum', 'Un millón de firmas te obligan a decidir si convocas un referéndum sobre tu reforma más polémica.',
      [['Convocarlo y hacer campaña', 'appr{sec.all+5;cp+3;rep.dem+5}{sec.all-6;cp-3;party.opp+6}'], ['Bloquearlo con tecnicismos', 'rep.dem-8;sec.jov-6;sec.pre-4'], ['Retirar la reforma', 'cp-3;party.opp+6;sec.med+2']]],
    ['medios', 7, { secLt: ['pre', 40], cool: 8 }, '', 'Portadas de plomo', 'Los grandes medios han cerrado filas contra ti. Cada mañana desayunas con un titular peor.',
      [['Entrevista sin condiciones', 'appr{sec.pre+8;sec.med+3}{sec.pre-3;sec.all-2}'], ['Publicidad institucional generosa', '$g-.2;sec.pre+6;rep.conf-2'], ['Crear tu propio canal', '$g-.3;sec.pre-6;rep.dem-5;sec.rur+3']]],
    ['sucesor', 5, { turnGte: 10, once: 1 }, '', 'El delfín', 'Tu número dos ha empezado a moverse por su cuenta. En el partido ya hacen apuestas.',
      [['Nombrarlo sucesor', 'party.gov+5;cp-1;stab+2'], ['Cesarlo', 'cp+1;party.gov-6', 'later4@.5{party.all-6;sec.all-3}:Tu antiguo número dos funda su propio partido'], ['Enfrentarlo a otro rival interno', 'chance.5{cp+2}{stab-3;party.gov-4}']]],
    ['fraude_fiscal', 6, { cool: 10 }, '', 'Los papeles', 'Una filtración mundial revela cuentas en paraísos fiscales de empresarios, deportistas… y dos ministros tuyos.',
      [['Cesar a los dos', 'cp-2;sec.med+5;sec.obr+3;rep.conf+3'], ['Amnistía si repatrían', '$g+.6;sec.emp+5;sec.obr-7;sec.sin-5'], ['Esperar a que escampe', 'sec.all-3', 'later2@.5{sec.all-5;flag.scandal}:La oposición convierte los papeles en su bandera']]],
    ['protesta_reg', 8, { stabLt: 50, cool: 7 }, '', 'Barricadas en {R}', 'Lo que empezó como una protesta por el precio del transporte ya es un levantamiento regional.',
      [['Ceder en sus demandas', '$g-.4;stab+5;sec.rur+4'], ['Enviar antidisturbios', 'stab-3;rep.dem-5;sec.jov-5;sec.min-4', 'chance.4{ev2:estado_sitio}{stab+4}'], ['Ir en persona a negociar', 'cp-2;appr{stab+7;sec.all+3}{stab-4}']]],
    ['estado_sitio', 0, {}, '', 'Sangre en las calles', 'La represión en {R} ha dejado muertos. El país entero mira qué haces ahora.',
      [['Destituir al ministro del Interior', 'cp-2;stab+4;sec.mil-4;rep.dem+3'], ['Declarar el estado de sitio', 'stab+6;rep.dem-15;sec.jov-10;sec.pre-8;ev3:amnistia'], ['Culpar a infiltrados extranjeros', 'rep.conf-6;sec.rur+3;sec.pre-5']]],
    ['amnistia', 0, {}, '', 'Después del estado de sitio', 'El orden ha vuelto a {R}, pero hay cientos de detenidos y medio mundo pide explicaciones.',
      [['Amnistía general', 'stab+3;rep.dem+8;sec.mil-6;sec.jov+5'], ['Juzgarlos', 'sec.mil+4;rep.dem-6;sec.min-6;relAll.rich-3:Los presos de tu estado de sitio'], ['Comisión de la verdad', 'cp-2;rep.dem+5;rep.conf+3;sec.mil-3']]],
    // ---------- SOCIEDAD ----------
    ['epidemia', 5, { cool: 14 }, '', 'Brote en {R}', 'Un brote infeccioso desborda los hospitales de {R}. Aún puede contenerse.',
      [['Cuarentena regional', 'grow-.2/2;sec.jub+4;sec.emp-4;stab+1'], ['Reforzar hospitales', '$g-.4;sec.jub+3;sec.min+2'], ['Quitarle hierro', '', 'later2@.6{sec.all-6;sec.jub-8;stab-5}:El brote se extiende por todo el país']]],
    ['incendios', 6, { cool: 9 }, '', 'El verano del fuego', 'Arde {R}. Los bomberos no dan abasto y los alcaldes piden al ejército.',
      [['Movilizar al ejército', 'sec.rur+6;sec.mil+2;$g-.2'], ['Pedir ayuda a los vecinos', 'relAll.neighbors+2:Les pediste ayuda contra el fuego;sec.rur+3'], ['Culpar a los ecologistas', 'sec.rur+2;sec.jov-6;sec.pre-3']]],
    ['migrantes', 8, { cool: 8 }, 'neighbor', 'La valla', 'Miles de migrantes cruzan desde {T}. Los alcaldes de {R} exigen que cierres el paso.',
      [['Regularizarlos', 'sec.min+8;sec.emp+4;sec.rur-6;sec.obr-4;unemp+.3;rep.gen+5'], ['Devolverlos a la frontera', 'sec.rur+5;sec.min-8;rep.gen-6;rel.T-5:Devolviste a sus migrantes'], ['Pactar cuotas con el vecino', 'cp-1;chance.6{rel.T+6:Pactasteis la migración;sec.med+2}{rel.T-4:Fracasó el pacto migratorio}']]],
    ['aborto', 6, { dem: 1, cool: 14 }, '', 'La ley que divide al país', 'Una iniciativa ciudadana lleva al congreso una ley sobre derechos reproductivos. Nadie se queda neutral.',
      [['Apoyarla', 'sec.jov+7;sec.min+5;sec.rel-12;party.opp-4'], ['Oponerte', 'sec.rel+10;sec.jov-8;sec.min-5;sec.pre-3'], ['Libertad de voto y silencio', 'sec.rel-3;sec.jov-3;cp+1']]],
    ['estadio', 5, { cool: 12 }, '', 'El mundial', 'Tu país puede organizar el mayor torneo deportivo del planeta. La factura es de las que no se olvidan.',
      [['Presentar la candidatura', '$g-.7;sec.jov+5;sec.obr+4;relAll.big+2:Tu candidatura deportiva', 'later6@.5{sec.all+6;grow+.15/3}:El torneo es un éxito y el país lo celebra'], ['Compartir sede con un vecino', '$g-.3;sec.jov+3;relAll.neighbors+3:Sede compartida'], ['Renunciar', 'sec.jov-3;sec.med+2']]],
    ['idioma', 5, { cool: 14 }, '', 'Las lenguas de {R}', 'Las minorías de {R} exigen que su lengua sea oficial en escuelas y juzgados.',
      [['Reconocerla', 'sec.min+10;sec.rur-3;sec.rel-2;stab+2'], ['Negarse', 'sec.min-10;sec.mil+2;stab-2'], ['Enseñanza bilingüe opcional', '$g-.2;sec.min+5']]],
    ['ia_empleo', 6, { techGte: 2, cool: 12 }, '', 'Las máquinas llegan a la oficina', 'La automatización que impulsaste ha destruido cien mil empleos administrativos en un año.',
      [['Impuesto al robot', 'sec.tec-8;sec.sin+7;sec.obr+4;grow-.08/4'], ['Reciclaje profesional masivo', '$g-.5;unemp-.6;sec.med+3'], ['Es el progreso', 'sec.tec+5;unemp+.8;sec.sin-7;sec.med-4']]],
    ['secta', 4, { secLt: ['rel', 45], cool: 14 }, '', 'El predicador', 'Un predicador llena estadios y ya da consignas de voto. Sus fieles no reconocen tu autoridad.',
      [['Recibirlo en palacio', 'sec.rel+8;sec.jov-4;sec.pre-3'], ['Investigar sus cuentas', 'sec.rel-6;sec.pre+4', 'chance.5{sec.rel+4;rep.conf+2}{sec.rel-6;stab-3}'], ['Ignorarlo', 'sec.rel-2']]],
    // ---------- DIPLOMACIA ----------
    ['embajada', 7, { rival: 1, cool: 9 }, 'rival', 'Asalto a la embajada', 'Una turba ha entrado en tu embajada en {T}. La policía local miró hacia otro lado.',
      [['Romper relaciones', 'rel.T-25:Rompiste relaciones;sec.mil+4;sec.emp-3'], ['Exigir disculpas y reparación', 'chance.5{rel.T+4:Se disculparon por la embajada;sec.all+2}{rel.T-10:Ignoraron tu protesta;sec.mil-3}'], ['Bajar el tono', 'rel.T+3:No escalaste lo de la embajada;sec.mil-5;sec.rur-2']]],
    ['rehenes', 5, { cool: 14 }, 'rival', 'Los detenidos', '{T} ha detenido a doce ciudadanos tuyos acusándolos de espionaje. {L} quiere algo a cambio.',
      [['Pagar discretamente', '$g-.3;sec.med+4', 'later3@.5{rep.conf-5;sec.mil-4}:Se filtra que pagaste un rescate'], ['Canje de prisioneros', 'rel.T+6:Canje de prisioneros;sec.mil-3;sec.med+3'], ['Sanciones y firmeza', 'rel.T-15:Respondiste con sanciones a las detenciones;sec.mil+4', 'later4@.5{sec.med-5}:Los detenidos son condenados a veinte años']]],
    ['espia_aliado', 5, { ally: 1, cool: 14 }, 'ally', 'El favor', '{L} te pide en privado que extradites a un opositor suyo refugiado en tu país.',
      [['Entregarlo', 'rel.T+15:Entregaste a su opositor;rep.dem-6;sec.min-4;sec.pre-4'], ['Negarte', 'rel.T-10:Protegiste a su opositor;rep.dem+4'], ['Dejar que «se escape» a un tercer país', 'rel.T-3:Su opositor se te escapó;rep.conf-2']]],
    ['bloque', 9, { bloc: 1, every: 6 }, 'ally', 'Cumbre de tu bloque', 'Los socios de tu bloque se reúnen. {L} propone más integración; otros piden mano dura con los rivales del bloque.',
      [['Impulsar más integración', 'relAll.friends+4:Tu impulso al bloque;sec.emp+3;sec.rur-3;grow+.08/4'], ['Liderar la línea dura', 'sec.mil+4;relAll.friends+2:Tu firmeza en el bloque;rep.paz-3'], ['Bloquear el comunicado', 'relAll.friends-5:Bloqueaste la cumbre;cp+1;sec.rur+2']]],
    ['oleoducto', 6, { cool: 12 }, 'neighbor', 'El corredor', '{T} propone construir a medias un corredor energético que cruzaría {R}.',
      [['Firmarlo', '$g-.5;rel.T+12:Construisteis el corredor;grow+.12/6', 'later6@.3{rel.T-10:Disputa por las tarifas del corredor}:{T} y tú os peleáis por las tarifas del corredor'], ['Pedir que lo pague entero', 'chance.4{rel.T+4:Pagó el corredor;grow+.1/6}{rel.T-6:Rechazó tus condiciones}'], ['Rechazarlo', 'rel.T-4:Rechazaste su corredor;sec.rur+3']]],
    ['voto_onu', 6, { cool: 10 }, 'power', 'Una llamada antes de votar', '{L} te pide tu voto en un organismo internacional. Ofrece inversiones; su rival te ha ofrecido lo mismo.',
      [['Votar con {T}', 'rel.T+12:Votaste con ellos;$g+.3;relAll.enemiesOfT-3:Votaste con su rival'], ['Votar con su rival', 'rel.T-10:Votaste contra ellos;relAll.enemiesOfT+5:Votaste con ellos;$g+.3'], ['Abstenerte y cobrar a los dos', 'chance.4{$g+.5}{rel.T-5:Jugaste a dos bandas;rep.conf-4}']]],
    ['desertor', 4, { rival: 1, cool: 14 }, 'rival', 'El desertor', 'Un general de {T} cruza tu frontera con una maleta de documentos y pide protección.',
      [['Acogerlo y leerlo todo', 'rel.T-14:Acogiste a su desertor;sec.mil+5;units.aire+3'], ['Devolverlo', 'rel.T+12:Devolviste a su desertor;rep.gen-5;sec.mil-4'], ['Pasarlo a un aliado', 'rel.T-5:Su desertor pasó por tu país;relAll.friends+2:Les entregaste al desertor']]],
    ['visita', 6, { cool: 8 }, 'power', 'Visita de Estado', '{L} anuncia una visita oficial. Trae una comitiva de empresarios… y una lista de peticiones.',
      [['Alfombra roja', '$-.4;rel.T+10:Visita de Estado espléndida;sec.emp+3'], ['Recibirlo con protestas toleradas', 'rel.T-6:Lo recibiste con abucheos;sec.jov+3;sec.min+2'], ['Aprovechar para firmar contratos', 'chance.6{$g+.5;rel.T+6:Contratos tras su visita}{rel.T-3:La visita no dio frutos}']]],
    ['isla', 5, { cool: 16 }, 'neighbor', 'El islote', 'Pescadores de {T} han plantado su bandera en un islote que tus mapas dan por tuyo.',
      [['Enviar la armada', 'rel.T-15:Enviaste buques al islote;sec.mil+6;rep.paz-5', 'chance.3{ev2:escaramuza}{sec.all+2}'], ['Llevarlo a un tribunal internacional', 'rep.paz+4;sec.mil-3', 'later5@.5{sec.all+4;rel.T-4:Perdieron el arbitraje}:El tribunal te da la razón sobre el islote'], ['Proponer explotación conjunta', 'rel.T+8:Compartisteis el islote;sec.mil-5;sec.rur-2']]],
    ['escaramuza', 0, {}, '', 'Disparos en el islote', 'Un patrullero tuyo y una corbeta de {T} han intercambiado fuego. Hay muertos. {L} habla de «acto de guerra».',
      [['Golpe de represalia', 'rel.T-25:Represalia naval;units.mar-4;sec.mil+6;rep.paz-10;price.pet*1.08'], ['Línea directa para frenar', 'cp-2;rel.T+6:Frenasteis la escalada;sec.mil-4;rep.paz+5'], ['Pedir mediación internacional', 'rep.paz+3;relAll.big+2:Pediste mediación;sec.mil-2']]],
    // ---------- SEGURIDAD Y GUERRA ----------
    ['atentado', 5, { cool: 12 }, '', 'Atentado en la capital', 'Una bomba en el metro. Decenas de muertos. Todavía nadie lo reivindica.',
      [['Leyes de excepción', 'stab+5;rep.dem-8;sec.min-6;sec.jub+5'], ['Unidad y calma', 'sec.all+3;stab+2;sec.mil-2'], ['Señalar a un país rival', 'sec.mil+5;sec.rur+3', 'later3@.6{rep.conf-8;sec.pre-5}:La investigación desmiente tu acusación sobre el atentado']]],
    ['narco', 7, { stabLt: 58, cool: 8 }, '', 'El cártel de {R}', 'Un cártel controla ya municipios enteros de {R}. Cobra impuestos y nombra alcaldes.',
      [['Enviar al ejército', 'sec.mil+4;stab-3;$g-.3', 'chance.5{stab+8;sec.all+3}{stab-5;sec.min-5;ev3:narco2}'], ['Pactar una tregua bajo la mesa', 'stab+5', 'later4@.6{sec.all-8;rep.conf-8;flag.scandal}:Sale a la luz tu pacto con el cártel'], ['Atacar su dinero', 'cp-2;sec.emp-3;stab+3;stock.fin*.95']]],
    ['narco2', 0, {}, '', 'La guerra del cártel', 'El cártel responde: coches bomba, jueces asesinados y carreteras cortadas en {R}.',
      [['Guerra total', '$g-.6;stab-4;units.tierra-3', 'chance.6{stab+12;sec.all+5}{stab-6}'], ['Pedir ayuda a una potencia', 'relAll.big+2:Pediste ayuda contra el cártel;stab+4;sec.mil-5;rep.conf-2'], ['Negociar su rendición', 'stab+6;rep.dem-4;sec.mil-4']]],
    ['desfile', 5, { secLt: ['mil', 42], cool: 10 }, '', 'El desfile', 'Los generales quieren un gran desfile y presupuesto para modernizar el arsenal. Lo piden en público.',
      [['Darles ambas cosas', '$g-.5;sec.mil+12;units.tierra+4;sec.jov-3'], ['Solo el desfile', '$g-.1;sec.mil+4'], ['Recordarles quién manda', 'sec.mil-8;sec.jov+4;rep.dem+3', 'chance.25{ev2:golpe}{}']]],
    ['mercenarios', 4, { war: 1, cool: 8 }, '', 'Soldados de fortuna', 'Una empresa militar privada te ofrece cinco mil hombres para tu guerra. Sin preguntas.',
      [['Contratarlos', '$g-.5;units.tierra+8;rep.paz-5', 'later4@.5{rep.gen-8;relAll.rich-4:Los crímenes de tus mercenarios}:Tus mercenarios cometen una matanza'], ['Rechazarlos', 'sec.mil+2'], ['Denunciarlos', 'rep.paz+4;rep.conf+2']]],
    ['prisioneros', 5, { war: 1, cool: 6 }, '', 'Los prisioneros', 'Tus tropas han capturado a miles de soldados enemigos. Mantenerlos cuesta; el mundo observa.',
      [['Trato ejemplar', '$g-.2;rep.gen+6;rep.paz+3'], ['Canjearlos', 'sec.mil+4;units.tierra+3'], ['Usarlos como moneda de presión', 'rep.gen-8;rep.conf-4;sec.mil+2']]],
    ['pacifistas', 6, { war: 1, cool: 5 }, '', 'No a la guerra', 'Cien mil personas piden en la calle que detengas la guerra. Entre ellas, hijos de ministros.',
      [['Escucharlos: abrir negociaciones', 'sec.jov+8;sec.min+4;sec.mil-8;rep.paz+6'], ['Ignorarlos', 'sec.jov-5;sec.pre-2'], ['Prohibir las marchas', 'rep.dem-10;sec.jov-10;stab-3;sec.mil+3']]],
    ['armas_nuevas', 5, { techGte: 3, cool: 14 }, '', 'El arma que nadie tiene', 'Tus laboratorios militares tienen un prototipo que cambia el equilibrio. Enseñarlo o esconderlo.',
      [['Exhibirlo en un desfile', 'sec.mil+8;units.aire+6;relAll.neighbors-4:Tu nueva arma los asusta;rep.paz-4'], ['Guardarlo en secreto', 'units.aire+6;cp-1'], ['Venderlo a un aliado', '$g+.8;relAll.friends+3:Les vendiste tecnología militar;rep.paz-2']]],
    // ---------- CADENA: ESCÁNDALO DE ESPIONAJE ----------
    ['topo1', 5, { turnGte: 5, once: 1 }, 'power', 'El micrófono', 'Tus técnicos encuentran micrófonos en tu despacho. La tecnología apunta a {T}.',
      [['Hacerlo público', 'rel.T-12:Los acusaste de espiarte;sec.all+3;ev3:topo2'], ['Alimentarlos con información falsa', 'cp-1;ev4:topo3'], ['Protestar en privado', 'rel.T-4:Tu queja por los micrófonos;chance.5{rel.T+6:Se disculparon en privado}{}']]],
    ['topo2', 0, {}, '', 'La respuesta de {T}', '{L} niega el espionaje y publica documentos tuyos comprometedores para demostrar que «todos lo hacen».',
      [['Expulsar a sus diplomáticos', 'rel.T-15:Expulsaste a sus diplomáticos;sec.mil+4;sec.emp-3'], ['Admitirlo y proponer un pacto de no espionaje', 'rep.conf+4;rel.T+8:Pacto de no espionaje;sec.mil-4'], ['Negar tus documentos', 'rep.conf-6;sec.pre-5']]],
    ['topo3', 0, {}, '', 'El anzuelo funciona', 'Tu información falsa ha llevado a {T} a cometer un error diplomático monumental. Aún no saben que fuiste tú.',
      [['Explotarlo en la ONU', 'relAll.big+4:Dejaste en evidencia a su rival;rel.T-10:Los humillaste', 'later4@.5{rel.T-15:Descubrieron tu trampa;rep.conf-5}:{T} descubre quién les tendió la trampa'], ['Guardar la carta', 'cp+2'], ['Vendérselo caro en privado', '$g+.4;rel.T+4:Negocio discreto']]],
    // ---------- ARCO DEL RIVAL ----------
    ['rival0', 30, { arc: ['rival', 0], turnGte: 3 }, 'arcRival', 'Un enemigo con nombre propio', '{L}, líder de {T}, te dedica medio discurso: te llama «aprendiz peligroso» ante las cámaras de todo el mundo.',
      [['Responder con ironía', 'arc.rival+1;sec.all+2;rel.T-5:Cruce de declaraciones'], ['Ignorarlo', 'arc.rival+1;sec.mil-2'], ['Devolver el golpe con dureza', 'arc.rival+1;rel.T-12:Guerra de declaraciones;sec.mil+3;rep.paz-2']]],
    ['rival1', 30, { arc: ['rival', 1], cool: 5 }, 'arcRival', '{L} mueve ficha', '{T} sube los aranceles a tus exportaciones estrella y corteja a tus socios comerciales.',
      [['Represalia arancelaria', 'arc.rival+1;rel.T-10:Guerra comercial;sec.sin+3;sec.emp-4;inf+.4'], ['Buscar otros mercados', 'arc.rival+1;$g-.2;grow+.08/5;relAll.trade+2:Diversificaste tu comercio'], ['Proponer una tregua', 'arc.rival+1;chance.4{rel.T+10:Tregua comercial}{rel.T-4:Rechazó tu tregua;sec.mil-3}']]],
    ['rival2', 30, { arc: ['rival', 2], cool: 5 }, 'arcRival', 'Cara a cara', 'Una cumbre te sienta por fin frente a {L}. Hay fotógrafos, hay tensión y hay una puerta para hablar a solas.',
      [['Tenderle la mano', 'arc.rival+1;appr{rel.T+20:Deshielo en la cumbre;rep.paz+6;flag.rivalPaz}{rel.T-5:Te dejó con la mano tendida;sec.mil-4}'], ['Plantarle cara ante las cámaras', 'arc.rival+1;rel.T-10:Lo desafiaste en la cumbre;sec.all+3;sec.mil+4'], ['Proponerle un reparto de influencias', 'arc.rival+1;rel.T+10:Reparto de influencias;rep.conf-6;relAll.neighbors-3:Tu pacto con su rival']]],
    ['rival3', 30, { arc: ['rival', 3], cool: 6 }, 'arcRival', 'La última jugada de {L}', '{L} atraviesa su peor momento en casa. Sus opositores te piden apoyo para derribarlo.',
      [['Financiar a su oposición', 'arc.rival+1;$g-.3', 'chance.4{rel.T+25:Su nuevo gobierno te debe una;rep.conf-4}{rel.T-25:Descubrió tu apoyo a sus opositores;rep.conf-8}'], ['Avisarle del complot', 'arc.rival+1;rel.T+25:Le salvaste el cargo;rep.conf+5'], ['Sentarte a mirar', 'arc.rival+1;cp+1']]],
    // ---------- ARCO DEL ALIADO ----------
    ['aliado0', 30, { arc: ['ally', 0], turnGte: 4 }, 'arcAlly', 'Un amigo en apuros', '{L}, tu mejor aliado, te llama de madrugada: necesita un préstamo urgente y que nadie lo sepa.',
      [['Prestárselo', 'arc.ally+1;$g-.4;rel.T+15:Le prestaste cuando nadie lo hacía;flag.aliadoDebe'], ['Prestárselo con condiciones', 'arc.ally+1;$g-.2;rel.T+4:Préstamo con letra pequeña'], ['Decirle que no', 'arc.ally+1;rel.T-12:Le negaste ayuda']]],
    ['aliado1', 30, { arc: ['ally', 1], cool: 6 }, 'arcAlly', 'El escándalo de {L}', '{L} está acusado de corrupción. Medio mundo le da la espalda y te pide que hagas lo mismo.',
      [['Defenderlo en público', 'arc.ally+1;rel.T+15:Lo defendiste en su peor momento;rep.conf-5;sec.pre-4'], ['Guardar silencio', 'arc.ally+1;rel.T-4:Callaste cuando te necesitaba'], ['Condenarlo', 'arc.ally+1;rel.T-20:Lo condenaste en público;rep.dem+5;relAll.rich+2:Tu firmeza contra la corrupción']]],
    ['aliado2', 30, { arc: ['ally', 2], cool: 7 }, 'arcAlly', 'Cuentas entre amigos', 'Ha pasado el temporal para {L}. Ahora es {T} quien puede hacerte un favor grande. O cobrarte lo de antes.',
      [['Pedirle apoyo militar', 'arc.ally+1;chance.6{units.tierra+6;rel.T-4:Te cobró el favor}{rel.T-8:No quiso ayudarte}'], ['Pedirle un tratado ventajoso', 'arc.ally+1;chance.6{grow+.15/6;$g+.4}{rel.T-5:Rechazó tu propuesta}'], ['No pedir nada', 'arc.ally+1;rel.T+8:No le pasaste factura;rep.conf+3']]]
  ];
  D.EVENTS2 = E.map(e => ({ id: e[0], w: e[1], if: e[2], tgt: e[3] || null, t: e[4], x: e[5], opts: e[6].map(o => ({ t: o[0], fx: fx(o[1]), hid: fx(o[2]) })), pre: e[7] ? fx(e[7]) : null }));
  D.EVENTS = D.EVENTS.concat(D.EVENTS2); // se suman a los 22 de la Fase 1
})();

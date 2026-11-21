/* =====================================================================
   WORLD LEADER · DATOS · REGIONES CON VIDA PROPIA Y DESASTRES LOCALES
   D.SEPAR: movimientos independentistas o autonomistas reales (aproximado,
   verificado: false). [país, nombre de la región tal como está en el mapa,
   movimiento, fuerza inicial 0-100].
   D.RL: ajustes del malestar regional y de las acciones.
   D.RDIS: desastres que caen sobre una región concreta.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA, fx = D.fx;
  D.SEPAR = [
    ['ES', 'Cataluña', 'el independentismo catalán', 55], ['ES', 'País Vasco', 'el nacionalismo vasco', 35], ['GB', 'Escocia', 'el independentismo escocés', 50],
    ['CA', 'Quebec', 'el soberanismo quebequés', 35], ['FR', 'Córcega', 'el nacionalismo corso', 30], ['CN', 'Xinjiang', 'el movimiento uigur', 45], ['CN', 'Tíbet', 'el movimiento tibetano', 45],
    ['IN', 'Jammu y Cachemira', 'el separatismo cachemir', 55], ['RU', 'Chechenia', 'el separatismo checheno', 40], ['ID', 'Papúa', 'el movimiento por Papúa Libre', 50],
    ['PK', 'Baluchistán', 'el separatismo baluchi', 50], ['SN', 'Ziguinchor', 'el movimiento de Casamance', 35], ['CM', 'Sudoeste', 'el movimiento anglófono de Ambazonia', 50],
    ['IT', 'Véneto', 'el autonomismo véneto', 25], ['IT', 'Cerdeña', 'el nacionalismo sardo', 20], ['GE', 'Abjasia', 'el separatismo abjasio', 70], ['BO', 'Santa Cruz', 'el autonomismo cruceño', 35],
    ['US', 'Texas', 'el movimiento «Texit»', 10], ['MX', 'Chiapas', 'el movimiento zapatista', 30]
  ];
  D.RL = {
    drift: .15, sepDrift: .08, protestAt: 50, riotAt: 68, crisisAt: 60, protestStab: .4, cooldown: 6,
    acts: {
      inv: { n: 'Invertir en la región', x: 'Obras y empleo durante 6 turnos: baja el malestar y el independentismo.', cp: 1, gdp: .004, m: -10, sep: -4, turns: 6 },
      visita: { n: 'Visitar la región', x: 'Te dejas ver: baja el malestar un poco.', cp: 1, m: -8, sep: -2 },
      dura: { n: 'Mano dura', x: 'Policía y orden durante 4 turnos: baja mucho el malestar, pero sube el independentismo y tu imagen democrática sufre.', cp: 1, m: -15, sep: 8, dem: -2, turns: 4 },
      aut: { n: 'Conceder autonomía', x: 'Más autogobierno: baja mucho el independentismo. Los militares no lo verán bien.', cp: 2, sep: -25, m: -10, mil: -3, sep_only: 1 }
    }
  };
  /* desastres: nombre, dónde pueden caer (lat mínima/máxima en valor absoluto) y opciones */
  D.RDIS = [
    { k: 'huracan', n: 'Un huracán', lat: [8, 32], coast: 1, ic: 'tormenta' },
    { k: 'terremoto', n: 'Un terremoto', lat: [0, 60], ic: 'des' },
    { k: 'inundacion', n: 'Inundaciones', lat: [0, 60], ic: 'tormenta' },
    { k: 'incendio', n: 'Un gran incendio forestal', lat: [15, 55], ic: 'exp' },
    { k: 'sequia', n: 'Una sequía extrema', lat: [10, 40], ic: 'humo' },
    { k: 'brote', n: 'Un brote epidémico', lat: [0, 60], ic: 'des' }
  ];
  D.RDIS_OPTS = [
    ['Ayuda masiva del Estado', '$g-.4;sec.all+2', -25], ['Ayuda limitada', '$g-.1', -8],
    ['Enviar al ejército', 'sec.mil+3', -15], ['Pedir ayuda internacional', 'relAll.big+2:Ayuda en la catástrofe;rep.conf-1', -12]
  ].map(o => ({ t: o[0], fx: fx(o[1]), m: o[2] }));
  /* crisis independentista y disturbios: opciones con efectos nacionales y regionales (m = malestar, sep = independentismo) */
  D.RCRISIS = [
    { t: 'Referéndum pactado', fx: fx('rep.dem+6;stab-3'), m: -20, sep: -30, aut: 1, ref: 1 },
    { t: 'Negociar más autogobierno', fx: fx('cp-2;sec.mil-3'), m: -15, sep: -25, aut: 1 },
    { t: 'Suspender la autonomía', fx: fx('rep.dem-8;sec.mil+4;stab+2'), m: 15, sep: 10 }
  ];
  D.RRIOT = [
    { t: 'Abrir una mesa de diálogo', fx: fx('cp-1'), m: -15 }, { t: 'Paquete de ayudas para la región', fx: fx('$g-.2'), m: -20 },
    { t: 'Desplegar a la policía antidisturbios', fx: fx('rep.dem-3;sec.mil+2'), m: -25, sep: 8 }
  ];
})();

/* =====================================================================
   WORLD LEADER · DATOS · CARRERA TECNOLÓGICA MUNDIAL
   Grandes descubrimientos que todas las potencias persiguen a la vez.
   cost: puntos de I+D · req: descubrimiento previo · per/m: efectos para
   quien lo domina (como leyes/rasgos; a la IA le valen grow, stab y mil)
   sec: golpe de opinión al lograrlo (solo jugador) · first: premio del
   primero (rep: reputación; world: cambios en los mercados del mundo)
   verificado:false → ficción plausible, no datos reales.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  D.DFIELDS = { dig: 'Computación e IA', sal: 'Salud y biotecnología', amb: 'Medio ambiente y alimentos', ene: 'Energía y materiales', mil: 'Militar', esp: 'Espacio' };
  D.DISC = [
    { id: 'cuantica', f: 'dig', n: 'Computación cuántica útil', cost: 110, d: 'Rompe cifrados y diseña fármacos y materiales en horas.', per: { grow: .06 }, m: { spyOp: .15 }, first: { rep: { conf: 3 }, world: [['stock', 'tec', 1.08]] } },
    { id: 'chips', f: 'dig', n: 'Semiconductores de 1 nanómetro', cost: 90, d: 'Los chips que todo el mundo necesita, hechos en casa.', per: { trade: .12, grow: .04 }, first: { world: [['price', 'tie', 1.15]] } },
    { id: 'ia', f: 'dig', n: 'Inteligencia artificial general', cost: 170, req: 'cuantica', d: 'Una mente artificial que investiga, gestiona y negocia.', per: { grow: .15 }, m: { cp: 1 }, sec: { tec: 8, sin: -6 }, first: { rep: { conf: 4, gen: 3 }, world: [['stock', 'tec', 1.18], ['sent', .03]] } },
    { id: 'vacuna', f: 'sal', n: 'Vacuna universal', cost: 80, d: 'Una sola dosis contra gripes y coronavirus.', per: { stab: 3 }, sec: { jub: 5, med: 3 }, first: { rep: { gen: 8 }, world: [['stock', 'far', 1.1]] } },
    { id: 'cancer', f: 'sal', n: 'Terapia génica contra el cáncer', cost: 140, req: 'vacuna', d: 'El cáncer pasa a ser una enfermedad crónica.', per: { stab: 4, grow: .04 }, sec: { jub: 8, med: 5 }, first: { rep: { gen: 6 } } },
    { id: 'longevidad', f: 'sal', n: 'Medicina de la longevidad', cost: 130, req: 'cancer', d: 'Vivir 20 años más, y sanos. Las pensiones tiemblan.', per: { grow: .05, cost: .1 }, sec: { jub: 10, jov: -3 }, first: { rep: { gen: 5 } } },
    { id: 'carbono', f: 'amb', n: 'Captura de carbono a gran escala', cost: 90, d: 'Fábricas que limpian el aire en lugar de ensuciarlo.', per: { stab: 1 }, sec: { jov: 6 }, first: { rep: { gen: 8 }, world: [['price', 'car', 1.12]] } },
    { id: 'vertical', f: 'amb', n: 'Agricultura vertical', cost: 70, d: 'Granos y verduras en torres, sin sequías ni plagas.', per: { prodMul: .06, stab: 1 }, sec: { rur: -4, med: 3 }, first: { world: [['price', 'tri', .85], ['price', 'caf', .92]] } },
    { id: 'desal', f: 'amb', n: 'Desalinización barata', cost: 75, d: 'Agua dulce ilimitada del mar.', per: { grow: .04, stab: 2 }, sec: { rur: 6 }, first: { rep: { gen: 4 } } },
    { id: 'baterias', f: 'ene', n: 'Baterías de estado sólido', cost: 85, d: 'Coches y redes que ya no dependen del petróleo.', per: { oilSave: .2 }, first: { world: [['price', 'lit', 1.25], ['price', 'pet', .92], ['stock', 'aut', 1.1]] } },
    { id: 'supercond', f: 'ene', n: 'Superconductores a temperatura ambiente', cost: 150, d: 'Electricidad sin pérdidas, trenes que levitan.', per: { grow: .08, trade: .08, mil: .04 }, first: { rep: { conf: 3 }, world: [['price', 'cob', .85], ['stock', 'ind', 1.08]] } },
    { id: 'fusion', f: 'ene', n: 'Fusión nuclear comercial', cost: 180, req: 'supercond', d: 'Energía casi infinita. El mundo del petróleo se tambalea.', per: { oilSave: .45, cost: -.15, grow: .1 }, first: { rep: { gen: 6, conf: 4 }, world: [['price', 'pet', .7], ['price', 'gas', .75], ['price', 'car', .7], ['stock', 'ene', .85]] } },
    { id: 'hiper', f: 'mil', n: 'Misiles hipersónicos', cost: 100, d: 'Imposibles de interceptar. Tus rivales lo notarán.', per: { mil: .15 }, sec: { mil: 6 }, first: { rep: { paz: -4 }, world: [['stock', 'def', 1.08]] } },
    { id: 'escudo', f: 'mil', n: 'Escudo antimisiles', cost: 120, d: 'Una cúpula que detiene casi todo lo que vuela.', per: { mil: .1 }, m: { casual: -.15 }, sec: { mil: 4, med: 2 } },
    { id: 'laser', f: 'mil', n: 'Armas láser', cost: 110, req: 'hiper', d: 'Disparos a la velocidad de la luz, casi gratis.', per: { mil: .12 }, m: { unitCost: -.05 }, sec: { mil: 4 } },
    { id: 'robots', f: 'mil', n: 'Ejército robótico', cost: 160, req: 'laser', d: 'Máquinas al frente; tus jóvenes, en casa.', per: { mil: .2 }, m: { casual: -.3 }, sec: { jov: 6, mil: -4 }, first: { rep: { paz: -5 } } },
    { id: 'ciber', f: 'mil', n: 'Ciberarmas ofensivas', cost: 80, d: 'Apagar la red eléctrica de un país sin un disparo.', m: { spyOp: .2, spy: .5 } },
    { id: 'satelites', f: 'esp', n: 'Constelación de satélites espía', cost: 90, d: 'Ves cada tanque del planeta. Con misiles hipersónicos, alcanzas a cualquier país.', m: { spyOp: .1 }, sec: { mil: 3 } },
    { id: 'luna', f: 'esp', n: 'Base lunar permanente', cost: 140, req: 'satelites', d: 'Bandera en la Luna: el prestigio que no se compra.', per: { stab: 3 }, m: { treatyAcc: 4 }, sec: { jov: 5, med: 4 }, first: { rep: { gen: 10, conf: 5 } } },
    { id: 'asteroides', f: 'esp', n: 'Minería de asteroides', cost: 190, req: 'luna', d: 'Metales raros llovidos del cielo. Los mercados de minerales se hunden.', per: { prodMul: .2, grow: .06 }, first: { world: [['price', 'tie', .6], ['price', 'pla', .7], ['price', 'niq', .7], ['price', 'oro', .8]] } }
  ];
  D.DISC.forEach(x => x.verificado = false);
})();

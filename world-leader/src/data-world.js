/* =====================================================================
   WORLD LEADER · DATOS · FÁBRICAS DE MATERIAS PRIMAS
   out: unidades por turno y nivel (a la mitad si no tienes yacimientos)
   cost: miles de M$ del primer nivel (sube con cada nivel) · verificado:false
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  D.FACT = {
    pet: { n: 'Pozos y refinería', out: 3, cost: 4 }, gas: { n: 'Planta de gas', out: 2.5, cost: 4 }, car: { n: 'Mina de carbón', out: 3, cost: 2 },
    hie: { n: 'Fundición de acero', out: 2, cost: 3 }, cob: { n: 'Mina de cobre', out: 2, cost: 3 }, lit: { n: 'Planta de litio', out: 1.5, cost: 5 },
    tie: { n: 'Refinería de tierras raras', out: 1, cost: 6 }, ura: { n: 'Planta de enriquecimiento', out: .6, cost: 9 }, tri: { n: 'Granjas industriales', out: 3, cost: 2 },
    caf: { n: 'Plantaciones', out: 2, cost: 2 }, oro: { n: 'Mina de oro', out: .8, cost: 5 }, pla: { n: 'Mina de plata', out: 1, cost: 4 }, niq: { n: 'Mina de níquel', out: 1, cost: 4 }
  };
  for (const k in D.FACT) D.FACT[k].verificado = false;
})();

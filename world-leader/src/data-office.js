/* =====================================================================
   WORLD LEADER · DATOS · EL DESPACHO: discursos a la nación
   Tonos y temas: efectos en sectores (sec), estabilidad (stab) y favor del público.
   ===================================================================== */
(function () {
  const D = globalThis.WL.DATA;
  D.SPEECH = {
    cp: 1, cool: 4,
    tones: {
      calmar: { n: 'Calmar los ánimos', x: 'Serenidad y responsabilidad. Sube la estabilidad.', stab: 2, all: 1, favor: 4 },
      movilizar: { n: 'Movilizar al país', x: 'Épica y esperanza. Funciona mejor si ya te quieren.', all: 3, stab: -1, favor: 8, needAppr: 45 },
      culpar: { n: 'Señalar a un culpable extranjero', x: 'Une a tu gente contra otro país. Él no lo olvidará.', all: 2, favor: 10, foe: -8, paz: -2 },
      prometer: { n: 'Prometer a lo grande', x: 'Aplausos hoy; si no cumples, te lo cobrarán.', all: 4, favor: 12, later: -5 }
    },
    topics: {
      eco: { n: 'La economía', sec: { emp: 3, obr: 2, med: 1 } },
      seg: { n: 'La seguridad', sec: { mil: 3, rel: 1, jub: 1, jov: -1 } },
      uni: { n: 'La unidad nacional', sec: { min: 3, rur: 1, rel: 1 } },
      fut: { n: 'El futuro y la educación', sec: { jov: 3, tec: 2, pre: 1 } },
      soc: { n: 'Salud y pensiones', sec: { jub: 3, obr: 1, sin: 1 } }
    }
  };
  D.BRIEF_MEDIA = ['El Diario Nacional', 'Canal 24', 'La Voz del Pueblo', 'Radio Capital', 'El Observador'];
})();

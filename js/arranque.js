'use strict';
/* Pelotazo · arranque y bucle principal */
/* =====================================================================
   arranque y bucle principal
   ===================================================================== */
let acumulado = 0, ultimoT = 0;
function bucle(ahora) {
  requestAnimationFrame(bucle);
  const dt = Math.min(.1, (ahora - (ultimoT || ahora)) / 1000); ultimoT = ahora;
  leerControles();
  if (!G.pausa) {
    acumulado += dt; let n = 0;
    while (acumulado >= DT && n < 6) { paso(DT); acumulado -= DT; n++; }
    if (n >= 6) acumulado = 0;
    G.pasosPorFrame = n;
  } else consumirBordes();
  // ambiente del público: sube cuando el balón se acerca a una portería
  if (typeof SFX !== 'undefined' && (G.frames & 7) === 0) {
    const enJuego = !G.pausa && G.fase !== 'fin' && !document.body.classList.contains('en-menu');
    SFX.ambiente(enJuego, enJuego ? clamp(1 - (HL - Math.abs(G.balon.x)) / 40, 0, 1) * (G.fase === 'gol' ? 1.5 : 1) : 0);
  }
  if (!$('capa').hidden) navMando(dt);
  if (R && document.body.classList.contains('en-menu') && R.menu) { animarMenu3D(dt); R.renderer.render(R.menu.S, R.cam); }
  else if (R) { moverCamara(dt); actualizarLineaApunte(); const real = MODELO_REAL(); if (real) dibujarReal(); dibujarJugadores(!real); R.renderer.render(R.scene, R.cam); medirFps(dt); }
  actualizarHud(dt);
  G.frames++;
}
// avanzar la simulación sin dibujar (para las pruebas)
G.avanzar = n => { for (let i = 0; i < n; i++) { leerControles(); paso(DT); if (G.fase === 'fin') break; } };
G.prueba = PRUEBA;
window.G = G;
async function arrancar() {
  await cargarGuardado();
  vigilarPestanas();
  if (SAVE.estado === 'recuperado') setTimeout(() => toast('Tus datos estaban dañados: se recuperaron de una copia de seguridad.', 6000), 300);
  if (SAVE.estado === 'reiniciado') setTimeout(() => toast('Tus datos estaban dañados y no había copias: se empezó de cero.', 6000), 300);
  if (SAVE.estado === 'futuro') setTimeout(() => toast('Tus datos son de una versión más nueva del juego: esta versión no los modificará.', 6000), 300);
  if (typeof THREE === 'undefined') { mostrarError('No se pudo cargar la biblioteca de gráficos. Revisa tu conexión y recarga la página.'); return; }
  // base de datos: la editada por el usuario si existe; si no, la de fábrica
  const rm = await cargarRanura('mundo');
  APP.mundo = rm.datos || generarMundo();
  if (rm.estado === 'recuperada') setTimeout(() => toast('Tu base de datos editada estaba dañada: se recuperó de una copia.', 6000), 400);
  if (rm.estado === 'perdida') setTimeout(() => toast('Tu base de datos editada estaba dañada y no tenía copias: se usa la de fábrica.', 6000), 400);
  if (!iniciarGraficos()) return;
  nuevoPartido();
  iniciarTactil(); iniciarTeclado(); iniciarNavegacion(); aplicarTactil(); iniciarApp();
  addEventListener('resize', ajustarTamano);
  addEventListener('gamepadconnected', () => toast('Mando conectado'));
  document.addEventListener('visibilitychange', () => { if (document.hidden && !G.pausa && G.fase === 'juego' && !document.body.classList.contains('en-menu')) abrirPausa(); });
  $('bPausa').addEventListener('click', () => abrirPausa());
  if (SAVE.estado === 'nuevo') guardarAhora();
  G.listo = true;
  mostrarInicio();
  requestAnimationFrame(bucle);
}
arrancar();

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
  if (R) { moverCamara(dt); const real = MODELO_REAL(); if (real) dibujarReal(); dibujarJugadores(!real); R.renderer.render(R.scene, R.cam); medirFps(dt); }
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
  if (!iniciarGraficos()) return;
  nuevoPartido();
  iniciarTactil(); iniciarTeclado(); aplicarTactil();
  addEventListener('resize', ajustarTamano);
  addEventListener('gamepadconnected', () => toast('Mando conectado'));
  document.addEventListener('visibilitychange', () => { if (document.hidden && !G.pausa && G.fase === 'juego') abrirPausa(); });
  $('bPausa').addEventListener('click', () => abrirPausa());
  if (SAVE.estado === 'nuevo') guardarAhora();
  G.listo = true;
  mostrarInicio();
  requestAnimationFrame(bucle);
}
arrancar();

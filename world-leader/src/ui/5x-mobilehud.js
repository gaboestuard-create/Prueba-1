/* =====================================================================
   INTERFAZ · CABECERA EN MÓVIL
   La fila de modos del mapa se pliega en un solo botón «Mapa» (la
   lista sale al tocarlo y se cierra al tocar fuera). Los avisos
   (toasts y logros) se limitan a los más recientes para no tapar el mapa.
   ===================================================================== */
document.addEventListener('pointerdown', e => { if (UI.modesOpen && !e.target.closest('.modepop, .modebtn')) { UI.modesOpen = false; if (S()) UI.render(); } });
{ const st = TUT.find(x => x[0] === '.modes'); if (st && mobileQ.matches) st[0] = '.modebtn'; } /* en móvil el tour señala el botón «Mapa» */

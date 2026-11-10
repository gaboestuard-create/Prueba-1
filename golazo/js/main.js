// Arranque y bucle principal: simulación a paso fijo (60 Hz), render libre y calidad gráfica automática.
(function () {
  'use strict';
  const G = window.G, STEP = 1 / 60;
  const Game = (G.Game = { paused: false, fps: 60, autoQ: true });
  let last = 0, acc = 0, fT = 0, fN = 0, warm = 3, slow = 0;

  window.addEventListener('error', (e) => { const el = document.getElementById('err'); el.textContent = 'Error: ' + e.message + ' (' + (e.filename || '').split('/').pop() + ':' + e.lineno + ')'; el.classList.remove('hide'); });

  Game.play = function (cfg) { G.Match.start(cfg); G.Render.build(G.M); G.Cam.orbit = false; Game.paused = false; acc = 0; warm = 2; };
  // Partido IA vs IA de fondo para el menú.
  Game.demo = function () {
    const T = G.Data.teams, i = (Math.random() * T.length) | 0;
    G.UI.inMatch = false; Game.play({ home: T[i], away: T[(i + 1 + ((Math.random() * (T.length - 1)) | 0)) % T.length], human: -1, diff: 'dificil', halfLen: 1e9 });
    G.Cam.orbit = true;
  };

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000 || STEP); last = now;
    G.Input.poll(); G.UI.input();
    let simDt = 0;
    if (!Game.paused) {
      G.Control.update(dt);
      acc += dt;
      let n = 0; while (acc >= STEP && n < 4) { G.Match.step(STEP); acc -= STEP; n++; }
      if (n === 4) acc = 0; // equipo muy lento: no acumular deuda
      simDt = n * STEP * G.T.timeScale;
    }
    G.Cam.update(dt); G.Render.update(dt, simDt); G.UI.update(dt); G.Audio.update(dt);
    // calidad automática: si no llega al objetivo dos segundos seguidos, baja un nivel (nunca sube sola)
    fT += dt; fN++;
    if (fT >= 1) {
      Game.fps = fN / fT; fT = fN = 0;
      if (warm > 0) warm--;
      else if (Game.autoQ && !document.hidden && G.Render.q > 0) {
        slow = Game.fps < [0, 27, 45, 52][G.Render.q] ? slow + 1 : 0;
        if (slow >= 2) { slow = 0; warm = 2; G.Render.setQuality(G.Render.q - 1); }
      }
    }
  }

  G.Data.load(function () {
    G.Render.init(document.getElementById('c'));
    G.UI.init();
    const q = new URLSearchParams(location.search);
    Game.demo(); G.UI.menu();
    if (q.has('jugar')) G.UI.play(); // index.html?jugar entra directo al partido
    requestAnimationFrame(frame);
  });
})();

// Audio 100% sintetizado con WebAudio: ambiente de estadio reactivo, silbato, golpes de balón, poste, red y música de menú.
(function () {
  'use strict';
  const G = window.G;
  const A = (G.Audio = { ctx: null, muted: false, vol: 0.8 });
  let ctx, master, crowdG, crowdF, roarG, noiseBuf, musicG, musicT = null, clapT = 0, level = 0.2;
  try { A.muted = localStorage.getItem('golazo.mute') === '1'; } catch (e) {}

  function noise(dur, freq, q, gain, when, type) { // ráfaga de ruido filtrado con envolvente
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = when || ctx.currentTime;
    s.buffer = noiseBuf; s.loop = true; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return f;
  }
  function tone(type, f0, f1, dur, gain, when) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = when || ctx.currentTime;
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    return g;
  }

  // Hay que llamarlo desde un gesto del usuario (política de autoplay de los navegadores).
  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = A.ctx = new AC();
    master = ctx.createGain(); master.gain.value = A.muted ? 0 : A.vol; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 6 + (Math.random() * 2 - 1) * 0.25; } // ruido rosado aprox.
    // murmullo del público: ruido -> pasa-banda -> ganancia (ambos siguen la emoción del partido)
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    crowdF = ctx.createBiquadFilter(); crowdF.type = 'bandpass'; crowdF.frequency.value = 600; crowdF.Q.value = 0.5;
    crowdG = ctx.createGain(); crowdG.gain.value = 0;
    s.connect(crowdF); crowdF.connect(crowdG); crowdG.connect(master); s.start();
    const s2 = ctx.createBufferSource(); s2.buffer = noiseBuf; s2.loop = true; s2.playbackRate.value = 0.7;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1400; f2.Q.value = 0.8;
    roarG = ctx.createGain(); roarG.gain.value = 0;
    s2.connect(f2); f2.connect(roarG); roarG.connect(master); s2.start();
    musicG = ctx.createGain(); musicG.gain.value = 0.5; musicG.connect(master);
  };
  A.mute = function (m) { A.muted = m; if (master) master.gain.value = m ? 0 : A.vol; try { localStorage.setItem('golazo.mute', m ? '1' : '0'); } catch (e) {} };

  A.whistle = function (n) {
    if (!ctx) return;
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + i * 0.38, dur = n > 1 && i === n - 1 ? 0.7 : 0.26;
      for (const f of [2850, 3050]) { const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(); o.type = 'square'; o.frequency.value = f; l.frequency.value = 34; lg.gain.value = 0.035; g.gain.setValueAtTime(0.05, t); g.gain.setValueAtTime(0.05, t + dur - 0.04); g.gain.linearRampToValueAtTime(0, t + dur); l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(master); o.start(t); l.start(t); o.stop(t + dur); l.stop(t + dur); }
    }
  };
  A.kick = function (speed) { if (!ctx) return; const v = Math.min(1, speed / 30); tone('sine', 170 + v * 60, 55, 0.1, 0.25 + v * 0.45); noise(0.05, 2400, 0.7, 0.1 + v * 0.2); };
  A.bounce = function () { if (ctx) tone('sine', 120, 60, 0.07, 0.12); };
  A.post = function () { if (!ctx) return; tone('triangle', 880, 860, 0.5, 0.3); tone('sine', 1320, 1300, 0.35, 0.18); tone('sine', 150, 70, 0.12, 0.4); };
  A.net = function () { if (ctx) noise(0.3, 3200, 0.6, 0.25); };
  A.ooh = function () { if (!ctx) return; const f = noise(1.1, 900, 1.2, 0.5); f.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 1); };
  A.goal = function () { if (!ctx) return; const t = ctx.currentTime; roarG.gain.cancelScheduledValues(t); roarG.gain.setValueAtTime(roarG.gain.value, t); roarG.gain.linearRampToValueAtTime(0.9, t + 0.25); roarG.gain.setValueAtTime(0.9, t + 2.6); roarG.gain.linearRampToValueAtTime(0, t + 6); };
  function claps() { const t = ctx.currentTime, pat = [0, 0.42, 0.84, 1.05, 1.26]; for (let r = 0; r < 3; r++) for (const p of pat) noise(0.07, 1900, 1.5, 0.11 + level * 0.1, t + r * 1.9 + p); }

  // Música de menú: bajo + arpegio sobre Am-F-C-G, secuenciado a mano.
  const CH = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 164.8, 196], [196, 246.9, 293.7]];
  A.music = function (on) {
    if (!ctx) return;
    if (!on) { if (musicT) { clearInterval(musicT); musicT = null; } return; }
    if (musicT) return;
    let step = 0, next = ctx.currentTime + 0.1;
    const play = () => {
      while (next < ctx.currentTime + 0.3) {
        const c = CH[(step >> 3) % 4], i = step % 8, t = next;
        const voice = (type, f, dur, gain) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(musicG); o.start(t); o.stop(t + dur + 0.02); };
        if (i % 4 === 0) voice('triangle', c[0] / 2, 0.5, 0.3);
        voice('square', c[[0, 1, 2, 1, 2, 1, 0, 2][i]] * (i > 3 ? 2 : 1), 0.18, 0.045);
        if (i % 2) noise(0.03, 7000, 1, 0.03, t, 'highpass');
        next += 0.19; step++;
      }
    };
    musicT = setInterval(play, 100);
  };

  A.update = function (dt) {
    if (!ctx) return;
    const M = G.M, live = M.state !== 'idle', target = live ? 0.1 + M.excite * 0.42 : 0;
    level += (target - level) * Math.min(1, dt * 2.5);
    crowdG.gain.value = level; crowdF.frequency.value = 480 + M.excite * 700;
    if (live && (clapT -= dt) < 0) { clapT = 14 + Math.random() * 16; if (M.state === 'play') claps(); }
  };

  G.on('kick', (e) => A.kick(e.speed));
  G.on('bounce', () => A.bounce());
  G.on('post', () => { A.post(); A.ooh(); });
  G.on('net', () => A.net());
  G.on('whistle', (n) => A.whistle(n));
  G.on('goal', () => A.goal());
  G.on('save', (e) => { A.kick(e.sp * 0.6); if (e.sp > 14) A.ooh(); });
  G.on('tackle', () => A.kick(9));
})();

/* =====================================================================
   INTERFAZ · sonido sintetizado (WebAudio, sin archivos). El contexto de
   audio solo puede arrancar tras un gesto del usuario: el primer clic.
   ===================================================================== */
const Sfx = (() => {
  let ctx = null, on = true; try { on = localStorage.getItem('wl_snd') !== '0'; } catch (e) { }
  const ac = () => { if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); } if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  function tone(f, t0, dur, type, vol, f2) {
    const t = ctx.currentTime + t0, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + .05);
  }
  const seq = (fs, step, dur, type, vol) => fs.forEach((f, i) => tone(f, i * step, dur, type, vol));
  const P = {
    click: () => tone(920, 0, .045, 'triangle', .035), ok: () => seq([660, 990], .08, .16, 'sine', .05), bad: () => tone(190, 0, .26, 'sawtooth', .045, 120),
    turn: () => seq([262, 330, 392, 523], .09, .55, 'triangle', .055), war: () => { tone(72, 0, 1, 'sawtooth', .11, 40); tone(55, .28, 1, 'square', .07, 36); },
    treaty: () => seq([523, 659, 784], .12, .7, 'sine', .055), peace: () => seq([392, 523, 659], .14, .8, 'sine', .05), vote: () => tone(440, 0, .32, 'triangle', .05, 660),
    coup: () => { tone(110, 0, .5, 'square', .07, 55); tone(104, .3, .7, 'sawtooth', .07, 49); }, tech: () => seq([523, 784, 1047, 1568], .07, .4, 'sine', .045), event: () => seq([440, 415], .18, .4, 'triangle', .05)
  };
  return {
    play(n) { if (!on || !P[n]) return; try { if (ac()) P[n](); } catch (e) { } },
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('wl_snd', on ? '1' : '0'); } catch (e) { } this.play('ok'); return on; }
  };
})();
['turn', 'war', 'treaty', 'peace', 'vote', 'coup', 'tech'].forEach(k => Bus.on(k, () => Sfx.play(k)));
Bus.on('toast', t => Sfx.play(t.ok === false ? 'bad' : 'ok'));
document.addEventListener('click', e => { if (e.target.closest('[data-a]')) Sfx.play('click'); }, true);
H.sound = () => { Sfx.toggle(); UI.render(); };

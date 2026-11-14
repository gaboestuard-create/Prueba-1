/* =====================================================================
   INTERFAZ · AUDIO PROCEDURAL (Web Audio, sin archivos ni música ajena).
   Mezclador por canales (música, efectos, ambiente, interfaz), efectos
   sintetizados, ambiente del globo y música adaptativa original por capas
   (pad, bajo, arpegio, percusión, melodía) según el estado del mundo.
   El audio solo arranca tras el primer gesto del usuario.
   ===================================================================== */
const Sfx = (() => {
  let ctx = null, bus = null, nbuf = null, amb = null, timer = null;
  const M = { mood: 'paz', want: 'paz', step: 0, next: 0, layer: {}, seed: 7 };
  const MOODS = {
    paz: { bpm: 72, prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], sc: [0, 2, 4, 7, 9], L: { pad: .9, bass: .45, arp: .45, perc: 0, lead: .35 } },
    tension: { bpm: 88, prog: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], sc: [0, 3, 5, 7, 10], L: { pad: .75, bass: .7, arp: .7, perc: .3, lead: .2 } },
    crisis: { bpm: 96, prog: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [7, 11, 14]], sc: [0, 1, 3, 7, 8], L: { pad: .65, bass: .9, arp: .8, perc: .55, lead: 0 } },
    guerra: { bpm: 104, prog: [[0, 3, 7], [10, 14, 17], [8, 12, 15], [7, 11, 14]], sc: [0, 3, 5, 7, 8], L: { pad: .6, bass: 1, arp: .55, perc: 1, lead: .3 } },
    victoria: { bpm: 96, prog: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], sc: [0, 2, 4, 7, 9], L: { pad: 1, bass: .7, arp: .8, perc: .5, lead: .6 } },
    derrota: { bpm: 60, prog: [[0, 3, 7], [5, 8, 12], [0, 3, 7], [7, 10, 14]], sc: [0, 3, 5, 7, 10], L: { pad: 1, bass: .5, arp: .2, perc: 0, lead: .3 } }
  };
  const hz = (semi, oct) => 146.83 * Math.pow(2, semi / 12 + (oct || 0)); // re3
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC();
    const master = ctx.createGain(), comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination); bus = { master };
    for (const k of ['music', 'sfx', 'amb', 'ui']) { bus[k] = ctx.createGain(); bus[k].connect(master); }
    const rv = ctx.createConvolver(), rg = ctx.createGain(), n = ctx.sampleRate * 2.4, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); }
    rv.buffer = b; rg.gain.value = .28; rv.connect(rg); rg.connect(master); bus.rev = rv;
    for (const k of ['pad', 'bass', 'arp', 'perc', 'lead']) { M.layer[k] = ctx.createGain(); M.layer[k].gain.value = 0; M.layer[k].connect(bus.music); }
    mix(); return ctx;
  }
  function mix() { if (!bus) return; const v = CFG.vol, t = ctx.currentTime; bus.master.gain.setTargetAtTime(CFG.mute ? 0 : v.master, t, .05); for (const k of ['music', 'sfx', 'amb', 'ui']) bus[k].gain.setTargetAtTime(v[k], t, .05); music(); }
  const noise = () => { if (!nbuf) { const n = ctx.sampleRate * 2; nbuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } return nbuf; };
  function tone(dst, f, t0, dur, type, vol, f2, rev, att) { const t = ctx.currentTime + t0, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + (att || .012)); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(dst); if (rev) g.connect(bus.rev); o.start(t); o.stop(t + dur + .05); }
  function nz(dst, t0, dur, vol, fq, q, type, f2) { const t = ctx.currentTime + t0, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(fq, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur); f.Q.value = q || 1;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(dst); s.start(t, Math.random() * 1.5); s.stop(t + dur + .05); }
  const seq = (dst, fs, step, dur, type, vol, rev) => fs.forEach((f, i) => tone(dst, f, i * step, dur, type, vol, 0, rev));
  const boom = t0 => { tone(bus.sfx, 90, t0, .9, 'sine', .22, 32); nz(bus.sfx, t0, .8, .3, 400, .7, 'lowpass', 60); };
  const quill = () => { for (let i = 0; i < 6; i++) nz(bus.sfx, i * .07, .06, .05, 3500 + Math.random() * 2000, 4); };
  const gavel = t0 => { tone(bus.sfx, 150, t0, .12, 'sine', .2, 90); nz(bus.sfx, t0, .05, .15, 1800, 2); };
  const brass = (ch, t0, dur) => ch.forEach(s => { const t = ctx.currentTime + t0, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = hz(s, 1); f.type = 'lowpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + .12);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.045, t + .05); g.gain.setValueAtTime(.045, t + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(f); f.connect(g); g.connect(bus.sfx); g.connect(bus.rev); o.start(t); o.stop(t + dur + .05); });
  const fanfare = () => { brass([0, 4, 7], 0, .4); brass([5, 9, 12], .4, .4); brass([7, 11, 14], .8, .4); brass([12, 16, 19], 1.2, 1.5); tone(bus.sfx, 73, 1.2, 1.4, 'sine', .15, 0, 1); };
  const P = {
    click: () => tone(bus.ui, 920, 0, .04, 'triangle', .05), hover: () => tone(bus.ui, 1600, 0, .025, 'sine', .012),
    ok: () => seq(bus.ui, [660, 990], .07, .15, 'sine', .07), bad: () => { tone(bus.ui, 196, 0, .22, 'sawtooth', .06, 130); tone(bus.ui, 185, .08, .2, 'square', .03, 120); },
    coin: () => seq(bus.ui, [1318, 1760], .06, .2, 'triangle', .05),
    turn: () => { seq(bus.sfx, [262, 330, 392, 523], .09, .6, 'triangle', .06, 1); nz(bus.sfx, 0, .6, .04, 3000, .7, 'highpass'); },
    war: () => { tone(bus.sfx, 72, 0, 1.2, 'sawtooth', .13, 40); tone(bus.sfx, 55, .28, 1.2, 'square', .08, 36); boom(.1); boom(.6); },
    treaty: () => { quill(); seq(bus.sfx, [523, 659, 784, 1047], .12, .8, 'sine', .06, 1); }, peace: () => seq(bus.sfx, [392, 523, 659, 784], .15, 1, 'sine', .06, 1),
    vote: () => { gavel(0); gavel(.2); tone(bus.sfx, 440, .4, .4, 'triangle', .05, 660); },
    coup: () => { tone(bus.sfx, 110, 0, .6, 'square', .08, 55); tone(bus.sfx, 104, .3, .8, 'sawtooth', .08, 49); for (let i = 0; i < 10; i++) nz(bus.sfx, .9 + i * .06, .08, .12, 220, 1, 'lowpass'); },
    tech: () => seq(bus.sfx, [523, 784, 1047, 1568], .07, .5, 'sine', .055, 1), event: () => seq(bus.sfx, [440, 415], .18, .45, 'triangle', .06),
    battle: () => { for (let i = 0; i < 4; i++) boom(i * .22 + Math.random() * .1); nz(bus.sfx, 0, 1.2, .06, 2500, .5, 'highpass'); },
    news: () => { for (let i = 0; i < 8; i++) tone(bus.sfx, 1800 + (i % 2) * 300, i * .05, .03, 'square', .02); },
    alert: () => seq(bus.sfx, [880, 660], .12, .2, 'square', .035), alertHi: () => seq(bus.sfx, [988, 740, 988, 740], .12, .18, 'sawtooth', .045),
    fanfare, inaug: fanfare, elecWin: fanfare, elecLose: () => seq(bus.sfx, [392, 349, 311, 262], .3, .9, 'triangle', .06, 1),
    crisis: () => { tone(bus.sfx, 330, 0, 1.6, 'sawtooth', .05, 110); tone(bus.sfx, 311, .1, 1.6, 'sawtooth', .04, 104); nz(bus.sfx, 0, 1.6, .05, 800, 2, 'bandpass', 150); },
    over: () => seq(bus.sfx, [262, 247, 220, 196, 147], .35, 1.4, 'triangle', .07, 1)
  };
  /* ---- música adaptativa: un secuenciador con 0,25 s de margen ---- */
  const rnd = () => (M.seed = (M.seed * 16807) % 2147483647) / 2147483647;
  function musicStep(i, t) {
    const md = MOODS[M.mood], bar = Math.floor(i / 16), st = i % 16, ch = md.prog[bar % md.prog.length], sp = 60 / md.bpm / 4, L = M.layer;
    const v = (dst, f, dur, type, vol, att, cut) => { const o = ctx.createOscillator(), g = ctx.createGain(); let out = g; o.type = type; o.frequency.value = f;
      if (cut) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); fl.connect(g); } else o.connect(g);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + (att || .01)); g.gain.exponentialRampToValueAtTime(.0001, t + dur); out.connect(dst); out.connect(bus.rev); o.start(t); o.stop(t + dur + .05); };
    if (st === 0) ch.forEach((s, k) => { v(L.pad, hz(s, 0), sp * 16 * 1.05, 'sawtooth', .022, sp * 5, 700 + 300 * k); v(L.pad, hz(s, 0) * 1.004, sp * 16, 'triangle', .02, sp * 6); });
    if (st === 0 || st === 8 || (md.L.perc > .5 && (st === 6 || st === 14))) v(L.bass, hz(ch[0], -1), sp * 3.5, 'triangle', .11, .01);
    if (st % 2 === 0 && md.L.arp > .3) v(L.arp, hz(ch[(st / 2) % 3], 1 + (st % 8 === 6 ? 1 : 0)), sp * 1.6, 'triangle', .035, .005);
    if (md.L.perc) { if (st === 0 || st === 8 || (M.mood === 'guerra' && st % 4 === 0)) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .25); g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.0001, t + .3); o.connect(g); g.connect(L.perc); o.start(t); o.stop(t + .35); }
      if (st % 2 === 1) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise(); f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(.025, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05); s.connect(f); f.connect(g); g.connect(L.perc); s.start(t, rnd()); s.stop(t + .07); } }
    if (st % 4 === 0 && md.L.lead && rnd() < .38) v(L.lead, hz(md.sc[Math.floor(rnd() * md.sc.length)] + (rnd() < .3 ? 12 : 0), 1), sp * 3, 'sine', .04, .02);
  }
  function tick() { if (!ctx) return; const now = ctx.currentTime; if (M.next < now) M.next = now + .05;
    while (M.next < now + .25) { if (M.step % 16 === 0 && M.want !== M.mood) { M.mood = M.want; for (const k in M.layer) M.layer[k].gain.setTargetAtTime(MOODS[M.mood].L[k], M.next, 1.2); }
      musicStep(M.step, M.next); M.next += 60 / MOODS[M.mood].bpm / 4; M.step++; } }
  function music() { const on = ctx && !CFG.mute && CFG.vol.music > .01 && CFG.vol.master > .01 && !document.hidden && UI.screen === 'game';
    if (on && !timer) { for (const k in M.layer) M.layer[k].gain.setTargetAtTime(MOODS[M.mood].L[k], ctx.currentTime, 1.5); timer = setInterval(tick, 60); }
    else if (!on && timer) { clearInterval(timer); timer = null; for (const k in M.layer) M.layer[k].gain.setTargetAtTime(0, ctx.currentTime, .3); }
    ambient(on && CFG.vol.amb > .01); }
  function ambient(on) { if (on && !amb && ctx) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); s.buffer = noise(); s.loop = true; f.type = 'lowpass'; f.frequency.value = 520; lfo.frequency.value = .07; lg.gain.value = 260; lfo.connect(lg); lg.connect(f.frequency);
      g.gain.value = .0001; g.gain.setTargetAtTime(.09, ctx.currentTime, 2); s.connect(f); f.connect(g); g.connect(bus.amb); s.start(); lfo.start(); amb = { s, lfo, g }; }
    else if (!on && amb) { const a = amb; amb = null; a.g.gain.setTargetAtTime(.0001, ctx.currentTime, .3); setTimeout(() => { try { a.s.stop(); a.lfo.stop(); } catch (e) { } }, 1200); } }
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else { ctx.resume(); } music(); }); // sin pestaña visible, sin sonido ni CPU
  return {
    play(n) { if (CFG.mute || !P[n]) return; try { if (init()) P[n](); } catch (e) { } },
    unlock() { try { if (init()) music(); } catch (e) { } },
    mix() { try { if (ctx) mix(); } catch (e) { } },
    mood(m) { if (MOODS[m]) M.want = m; }, get moodNow() { return M.want; },
    get on() { return !CFG.mute; },
    toggle() { CFG.mute = !CFG.mute; cfgSave(); this.mix(); if (!CFG.mute) this.play('ok'); return !CFG.mute; },
    refresh() { try { if (ctx) music(); } catch (e) { } }
  };
})();
['turn', 'war', 'treaty', 'peace', 'vote', 'coup', 'tech', 'battle'].forEach(k => Bus.on(k, () => Sfx.play(k)));
Bus.on('toast', t => Sfx.play(t.ok === false ? 'bad' : 'ok'));
document.addEventListener('click', e => { if (e.target.closest('[data-a]')) Sfx.play('click'); }, true);
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => Sfx.unlock(), { capture: true, passive: true })); // el navegador solo deja sonar tras un gesto
let hoverT = 0; document.addEventListener('pointerover', e => { if (!CFG.hover || e.pointerType !== 'mouse') return; const b = e.target.closest && e.target.closest('button[data-a]'); if (b && performance.now() - hoverT > 70) { hoverT = performance.now(); Sfx.play('hover'); } });
H.sound = () => { Sfx.toggle(); UI.render(); };

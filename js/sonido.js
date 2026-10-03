'use strict';
/* Pelotazo · sonido. Todo se sintetiza con Web Audio (sin archivos): golpes de balón con cuerpo y chasquido de
   cuero, silbato con su vibración, público de fondo que sube con las jugadas, rugido de gol, palo, red y sonidos
   suaves para los menús. Un poco de reverberación de estadio para que no suene "robótico".
   El navegador solo deja sonar después de que el usuario toca algo: SFX.desbloquear() se llama en la portada. */
const SFX = (() => {
  let ctx = null, master = null, sala = null, ruido = null, amb = null, ambGain = null, ambFiltro = null, volumen = 1;
  const nivel = () => { try { const s = DATOS.ajustes.sonido; return s === 'no' ? 0 : s === 'bajo' ? .45 : 1; } catch (e) { return 1; } };
  function crear() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = .8 * nivel(); master.connect(comp); comp.connect(ctx.destination);
    // reverberación de estadio: ruido que se apaga poco a poco
    sala = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.9), imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = imp.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    sala.buffer = imp;
    const salaGain = ctx.createGain(); salaGain.gain.value = .28; sala.connect(salaGain); salaGain.connect(master);
    // ruido rosa (más natural que el blanco) para público, red, golpes
    const n = ctx.sampleRate * 3; ruido = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = ruido.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099046; b1 = .963 * b1 + w * .2965164; b2 = .57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * .1848) * .2; }
    return true;
  }
  function salida(gain, rev = .3) { gain.connect(master); if (rev > 0) { const s = ctx.createGain(); s.gain.value = rev; gain.connect(s); s.connect(sala); } }
  function env(g, t0, ataque, pico, caida) { g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(pico, t0 + ataque); g.gain.exponentialRampToValueAtTime(.0001, t0 + ataque + caida); }
  function fuenteRuido(t0, dur) { const s = ctx.createBufferSource(); s.buffer = ruido; s.loop = true; s.start(t0, Math.random() * 2); s.stop(t0 + dur + .05); return s; }
  const ok = () => ctx && ctx.state === 'running' && nivel() > 0;

  // golpe al balón: "pum" grave + chasquido del cuero (más fuerte cuanto más fuerte el golpe)
  function patada(f = .6) {
    if (!ok()) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150 + f * 40, t); o.frequency.exponentialRampToValueAtTime(48, t + .11);
    env(g, t, .004, .55 * (.4 + f * .6), .14); o.connect(g); salida(g, .25); o.start(t); o.stop(t + .2);
    const r = fuenteRuido(t, .06), bp = ctx.createBiquadFilter(), g2 = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 1800 + f * 1400; bp.Q.value = .9;
    env(g2, t, .002, .5 * (.3 + f * .7), .045); r.connect(bp); bp.connect(g2); salida(g2, .35);
  }
  function bote(v = 3) {
    if (!ok() || v < 1.5) return; const t = ctx.currentTime, f = Math.min(1, v / 9);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + .08);
    env(g, t, .003, .3 * f, .09); o.connect(g); salida(g, .2); o.start(t); o.stop(t + .15);
  }
  // silbato del árbitro: tono alto con la vibración de la bolita
  function silbato(tipo = 'corto') {
    if (!ok()) return;
    const tramos = tipo === 'final' ? [[0, .45], [.6, .45], [1.2, 1.1]] : tipo === 'largo' ? [[0, .4], [.55, .9]] : [[0, .32]];
    for (const [ini, dur] of tramos) {
      const t = ctx.currentTime + ini;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
      o.type = 'sine'; o.frequency.value = 2850; o2.type = 'triangle'; o2.frequency.value = 2870 * 2;
      lfo.frequency.value = 38; lg.gain.value = 140; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
      const g2 = ctx.createGain(); g2.gain.value = .12; o2.connect(g2); g2.connect(bp); o.connect(bp);
      bp.type = 'bandpass'; bp.frequency.value = 2900; bp.Q.value = 2.5; bp.connect(g);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.32, t + .025); g.gain.setValueAtTime(.32, t + dur - .06); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      salida(g, .4);
      for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + dur + .02); }
    }
  }
  // público: rugido que crece (gol) o un "uuuh" corto (ocasión)
  function publico(intensidad = 1, dur = 3.2, tono = 650) {
    if (!ok()) return; const t = ctx.currentTime;
    for (const [fc, q, vol] of [[tono, .7, 1], [tono * 2.3, 1.2, .5], [tono * .55, .8, .6]]) {
      const r = fuenteRuido(t, dur + 1.5), bp = ctx.createBiquadFilter(), g = ctx.createGain(), am = ctx.createOscillator(), amg = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = q;
      am.frequency.value = 3 + Math.random() * 4; amg.gain.value = .12 * intensidad * vol; am.connect(amg); amg.connect(g.gain);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.55 * intensidad * vol, t + .35); g.gain.setValueAtTime(.55 * intensidad * vol, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t + dur + 1.2);
      r.connect(bp); bp.connect(g); salida(g, .5); am.start(t); am.stop(t + dur + 1.3);
    }
  }
  const gol = () => { publico(1.25, 4, 700); setTimeout(() => publico(.6, 2.5, 1100), 350); red(); };
  const ocasion = () => publico(.55, .9, 520);
  function red() { if (!ok()) return; const t = ctx.currentTime, r = fuenteRuido(t, .4), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 2500; env(g, t, .01, .25, .35); r.connect(hp); hp.connect(g); salida(g, .2); }
  function palo() {
    if (!ok()) return; const t = ctx.currentTime;
    for (const [f, v] of [[620, .25], [1490, .12], [2380, .07]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; env(g, t, .002, v, .5); o.connect(g); salida(g, .4); o.start(t); o.stop(t + .6); }
    patada(.8); setTimeout(ocasion, 120);
  }
  // ambiente del estadio durante el partido: murmullo continuo que sube cuando hay peligro
  function ambiente(on, intensidad = .3) {
    if (!ctx) return;
    if (on && !amb && ok()) {
      amb = ctx.createBufferSource(); amb.buffer = ruido; amb.loop = true;
      ambFiltro = ctx.createBiquadFilter(); ambFiltro.type = 'bandpass'; ambFiltro.frequency.value = 520; ambFiltro.Q.value = .6;
      ambGain = ctx.createGain(); ambGain.gain.value = .0001;
      amb.connect(ambFiltro); ambFiltro.connect(ambGain); salida(ambGain, .4); amb.start();
    }
    if (!on && amb) { const a = amb; ambGain.gain.setTargetAtTime(.0001, ctx.currentTime, .3); setTimeout(() => { try { a.stop(); } catch (e) { } }, 1200); amb = null; return; }
    if (amb) { ambGain.gain.setTargetAtTime(.05 + intensidad * .2, ctx.currentTime, .6); ambFiltro.frequency.setTargetAtTime(480 + intensidad * 300, ctx.currentTime, .6); }
  }
  // menús: toques suaves con algo de sala (no pitidos)
  function tono(frecs, tipo = 'triangle', vol = .14, dur = .22, rev = .35) {
    if (!ok()) return; const t = ctx.currentTime;
    frecs.forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = tipo; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 3200; env(g, t + i * .055, .006, vol, dur); o.connect(lp); lp.connect(g); salida(g, rev); o.start(t + i * .055); o.stop(t + i * .055 + dur + .05); });
  }
  const mover = () => tono([1320], 'sine', .05, .06, .1);
  const aceptar = () => tono([660, 990], 'triangle', .12, .22);
  const atras = () => tono([520, 390], 'triangle', .1, .18);
  function inicio() {
    if (!ok()) return; const t = ctx.currentTime, r = fuenteRuido(t, .9), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(3200, t + .55);
    env(g, t, .25, .35, .5); r.connect(bp); bp.connect(g); salida(g, .5);
    setTimeout(() => tono([523, 659, 784, 1046], 'triangle', .12, .45, .5), 280);
  }
  return {
    desbloquear() { try { if (!ctx && !crear()) return Promise.resolve(); if (ctx.state === 'suspended') return ctx.resume().catch(() => { }); } catch (e) { } return Promise.resolve(); },
    volumen() { if (master) master.gain.value = .8 * nivel(); },
    patada, bote, silbato, gol, ocasion, palo, red, ambiente, mover, aceptar, atras, inicio,
    get activo() { return !!ctx && ctx.state === 'running'; },
  };
})();

/* =====================================================================
   INTERFAZ · GUÍA: «Qué hacer ahora» y consejos para descubrir el juego
   - En el panel de asesores, arriba: las 3 cosas más urgentes con botón «Ir».
   - Los primeros turnos de cada jugador, un consejo por turno sobre una
     función que quizá no conoce (se recuerda en este navegador: wl_tips).
   ===================================================================== */
function todo() {
  const s = S(), m = me(), c = CC(m), out = [], add = (p, t, go) => out.push({ p, t, go });
  if (s.pend.length) add(9, `Tienes ${s.pend.length} decisión${s.pend.length > 1 ? 'es' : ''} pendiente${s.pend.length > 1 ? 's' : ''}`, { a: 'showPend' });
  if (c.stab < 40) add(8, `Estabilidad baja (${Math.round(c.stab)}): calma a los sectores descontentos`, { p: 'pol', t: 'sec' });
  for (const w of Q.warsOf(m)) if ((w.att.includes(m) ? w.score : -w.score) < -20) { add(8, 'Vas perdiendo una guerra: revisa el frente o pide la paz', { p: 'mil', t: 'gue' }); break; }
  if (c.tr < 0) add(7, 'Caja en números rojos: revisa el presupuesto', { p: 'eco', t: 'pre' });
  const hot = Q.rlList().find(([i]) => { const r = Q.rlInfo(i); return r.m >= D.RL.protestAt || (r.sep != null && r.sep >= D.RL.crisisAt - 8); });
  if (hot) add(7, `${c.terr[hot[0]].n} está a punto de estallar`, { iso: m, i: hot[0] });
  const ci = P5.campInfo(); if (ci && ci.K.end == null && ci.left != null && ci.left <= 6) add(7, `Campaña: ${ci.left} turnos para «${ci.st.n}»`, { p: 'sys', t: 'obj' });
  const sx = s.sanc.filter(x => x.on === m); if (sx.length >= 2) add(5, `${sx.length} países te sancionan: pide que las levanten`, { iso: sx[0].by, dip: 1 });
  const op = (s.talk || []).filter(Q.talkOpen); if (op.length) add(4, `${op.length} debate${op.length > 1 ? 's' : ''} en el que puedes intervenir`, { p: 'world', t: 'con' });
  if (s.pol.cp >= 8) add(4, `Te sobra capital político (${s.pol.cp}): propone una ley`, { p: 'pol', t: 'ley' });
  if (!s.tech.cur) add(4, 'Tus científicos están sin proyecto', { p: 'tec' });
  const fr = Object.keys(s.c).filter(z => z !== m && CC(z).alive && !Q.atWar(m, z) && Q.rel(m, z) > 35 && !Q.hasT('com', m, z) && !((CC(z).ask.parley || 0) > s.turn)).sort((a, b) => CC(b).gdp - CC(a).gdp)[0];
  if (fr) add(3, `${CC(fr).n} te aprecia y no tenéis tratado comercial: negocia en persona`, { iso: fr, dip: 1 });
  return out.sort((a, b) => b.p - a.p).slice(0, 3);
}
const todoHTML = () => { const L = todo(); return `<div class="card todo5"><p class="eyebrow">Qué hacer ahora</p>${L.length ? L.map((x, i) => `<div class="arow"><b class="num">${i + 1}</b><span class="grow">${esc(x.t)}</span><button class="btn sm gold" data-a="goTo" data-k="${i}">Ir</button></div>`).join('') : '<p class="mut">Todo en orden. Buen momento para planear a largo plazo.</p>'}</div>`; };
function goTo(g) { if (!g) return; closeModal(); if (g.a) return H[g.a](); if (g.dip) { UI.shTab = 'acu'; return H.dipOpen({ iso: g.iso }); }
  if (g.iso) { UI.panel = null; UI.terrOpen = true; if (g.i != null) UI.terrSel = g.i; return selectCountry(g.iso, true); }
  UI.panel = g.p; if (g.t) UI.tab[g.p] = g.t; UI.render(); refreshMap(); }
H.goTo = d => goTo((todo()[+d.k] || {}).go);
{ const a0 = PANELS.adv; PANELS.adv = t => todoHTML() + a0(t); }

/* consejos de descubrimiento: uno por turno, cada uno una sola vez por navegador */
const TIPS = [
  ['adv', 'El botón de asesores (arriba) te dice qué hacer ahora y por qué.', { p: 'adv' }],
  ['reg', 'Toca tu país y abre sus regiones: cada una tiene su malestar. El modo de mapa «Regiones» las pinta por separado.', { iso: '@me' }],
  ['parley', 'En la ficha diplomática de cualquier país puedes negociar en persona: cada líder reacciona según su carácter.', { dip: '@ally' }],
  ['con', 'Los líderes hablan entre ellos. En Mundo → Conversaciones puedes leerlos e intervenir.', { p: 'world', t: 'con' }],
  ['obj', 'En Partida → Objetivos ves tu puntuación desglosada y cómo ganar.', { p: 'sys', t: 'obj' }],
  ['zoom', 'Acerca la cámara: verás los nombres de estados y provincias. En Ajustes puedes cambiar la cámara y el fondo.', { p: 'sys', t: 'aju' }],
  ['war', 'En Ejército → Guerras está la sala de guerra: frentes, logística y espionaje.', { p: 'mil', t: 'gue' }]
];
const tipsSeen = () => { try { return JSON.parse(localStorage.getItem('wl_tips') || '[]'); } catch (e) { return []; } };
function showTip() { const s = S(); if (!s || s.over || s.turn > 14 || $('#tippop')) return; const seen = tipsSeen(), t = TIPS.find(x => !seen.includes(x[0])); if (!t) return;
  try { localStorage.setItem('wl_tips', JSON.stringify(seen.concat(t[0]))); } catch (e) { }
  const d = document.createElement('div'); d.id = 'tippop'; d.className = 'tippop glass'; d.innerHTML = `<small class="eyebrow">${gi('idea' in GI ? 'idea' : 'pin')} Consejo</small><p>${esc(t[1])}</p><div class="row end"><button class="btn sm ghost" data-a="tipClose">Entendido</button><button class="btn sm gold" data-a="tipGo" data-k="${t[0]}">Mostrar</button></div>`;
  document.body.appendChild(d); }
H.tipClose = () => $('#tippop')?.remove();
H.tipGo = d => { $('#tippop')?.remove(); const t = TIPS.find(x => x[0] === d.k); if (!t) return; const g = Object.assign({}, t[2]);
  if (g.iso === '@me') g.iso = me(); if (g.dip === '@ally') { const z = Object.keys(S().c).filter(x => x !== me() && CC(x).alive && !Q.atWar(me(), x)).sort((a, b) => Q.rel(me(), b) - Q.rel(me(), a))[0]; g.iso = z; g.dip = 1; }
  if (g.p === 'adv') { UI.panel = 'adv'; UI.render(); return; } goTo(g); };
Bus.on('turn', () => { let n = 0; clearInterval(UI.tipT); UI.tipT = setInterval(() => { if (++n > 90) return clearInterval(UI.tipT); if (!$('#modal').hidden || !$('#cine').hidden) return; clearInterval(UI.tipT); setTimeout(showTip, 1200); }, 500); });

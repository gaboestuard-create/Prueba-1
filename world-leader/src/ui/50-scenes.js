/* =====================================================================
   INTERFAZ · escenas: transición de turno, cinemáticas, votaciones,
   decisiones pendientes y final de partida.
   Las escenas hacen cola: durante "terminar turno" se acumulan y se
   reproducen en orden después del resumen.
   ===================================================================== */
const SQ = []; let sqRun = false;
function scene(fn) { if (UI.turnBuf) UI.turnBuf.push(fn); else { SQ.push(fn); runSQ(); } }
function runSQ() {
  if (sqRun) return; const f = SQ.shift();
  if (!f) { if (S() && UI.screen === 'game') { if (S().over) showOver(); else showPending(); } return; }
  sqRun = true; f(() => { sqRun = false; runSQ(); });
}
const modalScene = (html, cls) => done => { openModal(html + `<div class="row end"><button class="btn gold" data-a="sceneDone">Continuar</button></div>`, false, cls); UI.sceneDone = done; };
H.sceneDone = () => { closeModal(); const d = UI.sceneDone; UI.sceneDone = null; if (d) d(); };
const cineScene = (html, ms, pre) => done => {
  const c = $('#cine'); if (pre) pre(); c.innerHTML = html; c.hidden = false; let fin = false;
  const end = () => { if (fin) return; fin = true; clearTimeout(t); c.classList.add('out'); setTimeout(() => { c.hidden = true; c.classList.remove('out'); c.innerHTML = ''; UI.cineEnd = null; done(); }, 260); };
  const t = ms ? setTimeout(end, ms) : 0; UI.cineEnd = end;
};
H.cineDone = () => { if (UI.cineEnd) UI.cineEnd(); };
const banner = (kind, icn, eyebrow, title, sub) => `<div class="banner ${kind}" data-a="cineDone"><div class="bn-in">${ic(icn, 'bn-ic')}<p class="eyebrow">${eyebrow}</p><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
const near = iso => iso === me() || Q.nb(me()).includes(iso) || Q.alliesOf(me()).includes(iso);

/* ---- transición cinematográfica entre turnos ---- */
Bus.on('turn', t => {
  const buf = UI.turnBuf || []; UI.turnBuf = null; UI.busy = false;
  const a = t.after, b = t.before, d = (label, v, txt, good) => `<div class="${(good != null ? good : v >= 0) ? 'up' : 'down'}"><small>${label}</small><b>${txt}</b></div>`;
  const top = t.news.slice().sort((x, y) => y.p - x.p).slice(0, 6);
  const html = `<div class="turnfx"><div class="tf-in"><p class="eyebrow">Turno ${S().turn + 1}</p><h1>${esc(t.date)}</h1>
    <div class="tf-deltas">${d('Caja', a.tr - b.tr, (a.tr - b.tr >= 0 ? '+' : '−') + money(Math.abs(a.tr - b.tr)).slice(1))}${d('PIB', a.gdp - b.gdp, sgn((a.gdp / b.gdp - 1) * 100, 2) + '%')}${d('Aprobación', a.appr - b.appr, sgn(a.appr - b.appr, 1))}${d('Estabilidad', a.stab - b.stab, sgn(a.stab - b.stab, 1))}${a.terr !== b.terr ? d('Territorios', a.terr - b.terr, sgn(a.terr - b.terr)) : ''}</div>
    <ul class="tf-news">${top.map((n, i) => `<li class="p${n.p}" style="animation-delay:${.25 + i * .12}s">${ic(NEWS_IC[n.k] || 'world')}<span>${esc(n.x)}</span></li>`).join('') || '<li style="animation-delay:.25s"><span>Un trimestre tranquilo. Demasiado tranquilo.</span></li>'}</ul>
    ${turnExtra()}
    <button class="btn gold lg" data-a="cineDone">Continuar ${ic('next')}</button></div></div>`;
  SQ.push(cineScene(html, 0), ...buf); autosave(); refreshMap(); runSQ();
});

/* ---- cinemáticas de eventos del mundo ---- */
Bus.on('war', w => { if (!(near(w.a) || near(w.d) || CC(w.a).gdp > 800 || CC(w.d).gdp > 800)) return; scene(cineScene(banner('war', 'war', 'Declaración de guerra', `${cname(w.a)} <i>contra</i> ${cname(w.d)}`, `<span class="flag xl">${flag(w.a)}</span> ${ic('war')} <span class="flag xl">${flag(w.d)}</span>`), 3400, () => { Globe.focus(w.d, 2.3); refreshMap(); })); });
Bus.on('treaty', t => scene(cineScene(banner('treaty', 'treaty', 'Tratado firmado', esc(t.name), `<span class="flag xl">${flag(t.a)}</span> ${cname(t.a)} · ${cname(t.b)} <span class="flag xl">${flag(t.b)}</span>`), 2600, () => refreshMap())));
Bus.on('coup', c => { if (!S() || !(near(c.iso) || CC(c.iso).gdp > 300)) return; scene(cineScene(banner('coup', 'coup', 'Cambio de régimen', cname(c.iso), `${esc(CC(c.iso).lider.n)} toma el poder`), 3000, () => Globe.focus(c.iso, 2.3))); });
Bus.on('peace', p => { if (p.a === me() || p.d === me()) scene(cineScene(banner('peace', 'peace', 'Fin de la guerra', `${cname(p.a)} y ${cname(p.d)} firman la paz`), 2800, () => refreshMap())); });
Bus.on('annex', a => { if (near(a.v) || near(a.t) || CC(a.t).gdp > 800) scene(cineScene(banner('war', 'map', 'El mapa cambia', `${cname(a.t)} anexa ${cname(a.v)}`), 3200, () => { Globe.focus(a.v, 2.3); refreshMap(); })); });
Bus.on('consequence', c => { if (c.msg) scene(modalScene(`<p class="eyebrow">Consecuencia de una decisión anterior</p><h2>${esc(c.msg)}</h2><div class="chips">${fxChips(c.shown)}</div>`, 'event')); });
Bus.on('election', e => scene(modalScene(`<p class="eyebrow">Noche electoral</p><h2>${e.win ? 'Reelección' : 'Derrota en las urnas'}</h2>
  <div class="elec"><span class="bar ${e.win ? 'green' : 'red'} need tall grow-anim" style="--need:50%"><i style="width:${e.share}%"></i></span><b class="${e.win ? 'up' : 'down'}">${e.share.toFixed(1)}%</b></div>
  ${e.regs ? electionRegsHTML(e) : ''}<p>${e.win ? 'El país te renueva la confianza por cuatro años más. El congreso se recompone a tu favor.' : 'No alcanzaste la mitad de los votos. El poder cambia de manos.'}</p>`, 'event')));
Bus.on('tech', t => scene(cineScene(banner('peace', 'tec', 'Avance tecnológico', esc(t.n), 'Tus laboratorios lo han conseguido'), 2800)));
Bus.on('route', r => Globe.trip({ a: r.a, b: r.b, cargo: 1 }));
Bus.on('trip', t => Globe.trip(t));

/* ---- votación en el congreso ---- */
Bus.on('vote', v => {
  const cols = []; v.by.slice().sort((a, b) => a.ideo - b.ideo).forEach(p => { for (let i = 0; i < p.s; i++) cols.push(i < p.yes ? '#5fe3a1' : '#ff5a4d'); });
  while (cols.length < 100) cols.push('#ff5a4d');
  scene(modalScene(`<p class="eyebrow">Votación en el congreso</p><h2>${esc(v.title)}</h2>${hemi(cols.slice(0, 100), 'voting')}
    <div class="vote-res"><b class="up">${v.yes} a favor</b><span class="stamp ${v.pass ? 'ok' : 'no'}">${v.pass ? 'Aprobada' : 'Rechazada'}</span><b class="down">${100 - v.yes} en contra</b></div>
    <div class="vote-by">${v.by.map(p => `<div class="line"><span><i class="dot" style="background:${IDC(p.ideo)}"></i> ${esc(p.n)}${p.g ? ' <small class="gold">gob.</small>' : ''}</span><span class="bar green"><i style="width:${p.s ? p.yes / p.s * 100 : 0}%"></i></span><b class="num">${p.yes}/${p.s}</b></div>`).join('')}</div>
    <small class="mut">Hacían falta más de ${Math.round(v.need)} votos.</small>`, 'vote'));
});
/* ---- resultado de la ONU ---- */
Bus.on('un', u => {
  const mine = u.votes[me()], diff = Q.alliesOf(me()).filter(z => u.votes[z] != null && mine && u.votes[z] === -mine).sort((a, b) => CC(b).gdp - CC(a).gdp).slice(0, 5);
  scene(modalScene(`<p class="eyebrow">Asamblea General de la ONU</p><h2>${esc(u.title)}${u.r.target ? ' · ' + cname(u.r.target) : ''}</h2>
    <div class="tally big"><i class="y" style="flex:${u.yes}"></i><i class="a" style="flex:${u.abs}"></i><i class="n" style="flex:${u.no}"></i></div>
    <div class="vote-res"><b class="up">${u.yes} a favor</b><span class="stamp ${u.pass ? 'ok' : 'no'}">${u.pass ? 'Aprobada' : 'Rechazada'}</span><b class="down">${u.no} en contra</b></div>
    <small class="mut center">${u.abs} abstenciones · tu voto: ${mine > 0 ? 'a favor' : mine < 0 ? 'en contra' : 'abstención'}</small>
    ${u.out.length ? `<div class="chips">${fxChips(u.out)}</div>` : ''}
    ${diff.length ? `<p class="mut">Aliados que votaron contra tu postura: ${diff.map(z => flag(z) + ' ' + cname(z)).join(', ')}.</p>` : ''}`, 'vote'));
});

/* ---- decisiones pendientes (eventos, ofertas, llamadas a las armas, ONU) ---- */
const PK = { event: 'Evento', offer: 'Mensaje diplomático', war: 'Guerra', peace: 'Negociación de paz', un: 'Naciones Unidas', elec: 'Elecciones' };
function showPending() {
  if (!S() || S().over || sqRun || SQ.length || !S().pend.length || UI.screen !== 'game') return;
  if (!$('#modal').hidden && !UI.modalClosable) return; // ya hay una escena o decisión abierta
  const p = S().pend[0], spy = Q.mod('spy'), other = p.iso && p.iso !== me() && S().c[p.iso];
  if (p.k === 'camp') return campaignModal(p);
  if (p.k === 'un' && Q.unBrief()) return unModal(p);
  if (other) Globe.focus(p.iso, 2.4);
  Sfx.play('event');
  openModal(`<div class="ev-head">${other ? portrait(p.iso) : ic(p.k === 'un' ? 'un' : p.k === 'elec' ? 'elec' : 'coup', 'ev-ic')}<div><p class="eyebrow">${PK[p.k] || 'Decisión'}${other ? ' · ' + fl(p.iso) + ' ' + cname(p.iso) : ''}${S().pend.length > 1 ? ` · quedan ${S().pend.length}` : ''}</p><h2>${esc(p.t)}</h2></div></div>
    <p class="ev-text">${esc(p.x)}</p>
    <div class="opts">${p.opts.map((o, i) => { const dis = o.req && o.req.cp && S().pol.cp < o.req.cp; return `<button class="opt" data-a="decide" data-i="${i}" ${dis ? 'disabled' : ''}><b>${esc(o.t)}</b><span class="chips">${fxChips(Q.describeFx(o.fx, p.iso))}${spy && o.hid && o.hid.length ? `<span class="chip violet">Oculto:</span>${fxChips(Q.describeFx(o.hid, p.iso))}` : ''}</span></button>`; }).join('')}</div>
    <small class="mut">${spy ? 'Tu red de intrigas te muestra las consecuencias ocultas.' : 'Algunas decisiones tienen consecuencias que no se ven hasta más tarde.'}</small>`, false, 'event');
}
H.decide = d => { closeModal(); const r = act('decide', { i: +d.i }); if (!r.ok) return showPending(); runSQ(); };
Bus.on('decided', e => { if (e.shown.length) toast(e.shown.filter(x => !/:$/.test(x[0])).slice(0, 3).map(x => x[0].replace(/^· /, '')).join(' · ')); refreshMap(); });

/* ---- final de la partida ---- */
const OVER = {
  eleccion: ['Derrota en las urnas', 'Las urnas hablaron. Entregas la banda presidencial y vuelves a ser un ciudadano más.'],
  golpe: ['Golpe de Estado', 'Los tanques rodean el palacio al amanecer. Tu mandato termina a punta de fusil.'],
  revolucion: ['Revolución', 'La multitud ha tomado el palacio. El país que gobernabas ya no te obedece.'],
  conquista: ['Tu país ha caído', 'La bandera enemiga ondea sobre tu capital. El Estado que dirigías ha dejado de existir.'],
  exilio: ['Exilio', 'Abandonas el poder por tu propio pie, de noche y con una sola maleta.']
};
function showOver() {
  const s = S(), o = s.over; if (!o) return; const c = CC(me()), txt = OVER[o.r] || ['Fin del mandato', ''];
  const friends = Object.keys(s.c).filter(i => i !== me() && CC(i).alive).map(i => [i, Q.rel(me(), i)]).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const canAsk = o.asylum === undefined && o.r !== 'eleccion';
  const epi = o.asylum ? `<p class="epi">${cname(o.asylum)} te abre sus puertas. Terminas tus días allí, escribiendo unas memorias que nadie se atreve a publicar en tu país.</p>` : o.asylum === null ? `<p class="epi">${cname(o.asked)} te cierra la puerta. Los nuevos dueños del país ya han fijado fecha para tu juicio.</p>` : '';
  openModal(`<div class="over"><p class="eyebrow">${esc(o.date)} · turno ${o.t + 1}</p><h1>${txt[0]}</h1><p>${txt[1]}</p>${epi}
    <div class="kvs big">${kv('Recordado como', esc(o.title))}${kv('Trimestres en el poder', o.t)}${kv('PIB', sgn((c.gdp / s.stats.gdp0 - 1) * 100, 0) + '%')}${kv('Leyes aprobadas', s.stats.laws)}${kv('Guerras', s.stats.wars)}${kv('Reelecciones', s.stats.elections)}</div>
    ${canAsk ? `<h4>Pedir asilo</h4><div class="row wrap">${friends.map(f => `<button class="btn" data-a="overAsylum" data-iso="${f[0]}">${flag(f[0])} ${cname(f[0])} (${sgn(f[1])})</button>`).join('')}</div><small class="mut">Te acogerá quien tenga contigo una relación de 30 o más.</small>` : ''}
    <div class="row end"><button class="btn" data-a="exportOpen2">Exportar partida</button><button class="btn gold" data-a="overNew">Nueva partida</button></div></div>`, false, 'event');
}
H.overAsylum = d => { act('asylum', { iso: d.iso }); showOver(); };
H.overNew = () => { closeModal(); try { localStorage.removeItem('wl_save'); } catch (e) { } H.quit(); };
H.exportOpen2 = () => { H.exportOpen(); UI.modalClosable = false; $('#modal .xbtn').dataset.a = 'backOver'; };
H.backOver = () => showOver();
Bus.on('over', () => { if (!UI.turnBuf) setTimeout(runSQ, 0); });

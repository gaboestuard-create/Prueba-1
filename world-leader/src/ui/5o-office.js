/* =====================================================================
   INTERFAZ · EL DESPACHO: informe matinal, llamadas, discursos y encuestas
   - Informe matinal tras cada turno (sustituye a la portada del periódico,
     que sigue a un toque). Se desactiva en Ajustes.
   - Las propuestas de otros países llegan como llamadas: contestar o colgar.
   - Política → Discurso y Política → Encuestas.
   ===================================================================== */
if (CFG.brief == null) CFG.brief = true;
const BRIEF_N = { obr: 'Obreros', emp: 'Empresarios', jov: 'Jóvenes', rel: 'Religiosos', rur: 'Rurales', mil: 'Militares', med: 'Clase media', jub: 'Jubilados', sin: 'Sindicatos', pre: 'Medios', tec: 'Tecnológico', min: 'Minorías' };
const trend = L => L.length >= 2 ? L[L.length - 1] - L[L.length - 2] : 0;
function briefHTML(t) { const s = S(), m = me(), c = CC(m), f = s.fin || Q.finance(), hap = s.hist.appr, hg = s.hist.gdp, mine = (t.news || []).filter(n => n.i === m).sort((a, b) => b.p - a.p);
  const wars = Q.warsOf(m), worst = wars.map(w => w.att.includes(m) ? w.score : -w.score).sort((a, b) => a - b)[0], hot = Q.rlList().filter(x => x[1] >= D.RL.protestAt).length, closed = Q.strInfo().filter(x => !x.open && x.dep >= .2 && x.by !== m);
  const ci = P5.campInfo(), C = Q.cabInfo(), shaky = C ? Object.keys(C.m).filter(k => C.m[k].loy < 30) : [], el = isFinite(s.pol.nextElec) && s.pol.nextElec < 900 ? s.pol.nextElec - s.turn : null;
  const card = (ic, title, lines, tone) => `<div class="brief-c ${tone || ''}"><small class="eyebrow">${gi(ic)} ${title}</small>${lines.filter(Boolean).map(l => `<p>${l}</p>`).join('')}</div>`;
  const g = t.growth != null ? t.growth : 0, net = (f.inc && f.exp) ? Object.values(f.inc).reduce((a, b) => a + b, 0) - Object.values(f.exp).reduce((a, b) => a + b, 0) : 0;
  return `<div class="brief5"><p class="eyebrow">${esc(Q.dateStr())} · Informe para ${esc(s.leader.n)}</p><h2>Buenos días, ${esc(s.leader.n.split(' ')[0])}</h2>
    <div class="brief-g">${card('eco', 'Economía', [`Crecimiento: ${sgn(g, 2)} pp anualizados`, `Caja: <b>${money(c.tr)}</b> (${sgn(net, 1)} por turno)`, closed.length ? `<span class="red">${closed.map(x => esc(x.s.n)).join(', ')} cerrado</span>` : ''], c.tr < 0 ? 'bad' : '')}
      ${card('seg', 'Seguridad', [wars.length ? `${wars.length} guerra${wars.length > 1 ? 's' : ''} en curso · ${worst < -20 ? '<span class="red">vas perdiendo</span>' : worst > 20 ? '<span class="green">vas ganando</span>' : 'frente estable'}` : 'El país está en paz', hot ? `<span class="red">${hot} región${hot > 1 ? 'es' : ''} en protesta</span>` : 'Las regiones están tranquilas', `Estabilidad: <b>${Math.round(c.stab)}</b>`], wars.length || hot ? 'bad' : '')}
      ${card('pre', 'Prensa', [mine[0] ? `«${esc(mine[0].x)}»` : 'Un trimestre sin grandes titulares sobre ti', `Aprobación: <b>${Math.round(Q.approval())}%</b> (${sgn(trend(hap), 0)})`])}
      ${card('pin', 'Agenda', [s.pend.length ? `<b>${s.pend.length}</b> decisión${s.pend.length > 1 ? 'es' : ''} esperando` : 'Sin decisiones pendientes', el != null && el > 0 && el <= 6 ? `Elecciones en <b>${el}</b> turnos` : '', ci && ci.K.end == null && ci.left != null ? `Campaña: ${ci.left} turnos para «${esc(ci.st.n)}»` : '', shaky.length ? `<span class="red">Ministro poco leal: ${esc(C.m[shaky[0]].n)}</span>` : '', (s.speechT || 0) <= s.turn ? 'Puedes dirigirte a la nación' : ''])}</div>
    <div class="row wrap end"><button class="btn sm ghost" data-a="briefPaper">Leer el periódico</button><button class="btn sm" data-a="briefSpeech">Preparar un discurso</button></div></div>`; }
Bus.on('turn', t => { if (CFG.brief && S() && !S().over) scene(modalScene(briefHTML(t), 'event wide')); });
H.briefPaper = () => { const d = UI.sceneDone; UI.sceneDone = null; openModal(paperHTML() + `<div class="row end"><button class="btn gold" data-a="briefBack">Al despacho</button></div>`, false, 'wide paperbox'); UI.briefDone = d; };
H.briefBack = () => { closeModal(); const d = UI.briefDone; UI.briefDone = null; if (d) d(); };
H.briefSpeech = () => { H.sceneDone(); UI.panel = 'pol'; UI.tab.pol = 'dis'; UI.render(); };
{ const s0 = PANELS.sys; PANELS.sys = t => t !== 'aju' ? s0(t) : s0(t).replace('<h4>', `<label class="check"><input type="checkbox" data-c="cfgB" data-k="brief" ${CFG.brief ? 'checked' : ''}> Informe matinal al empezar cada turno (sustituye a la portada del periódico)</label><h4>`); }

/* ---- llamadas: las propuestas de otros países suenan antes de abrirse ---- */
UI.calls = new WeakSet();
{ const p0 = showPending; showPending = () => { const s = S(); if (!s || s.over || sqRun || SQ.length || !s.pend.length || UI.screen !== 'game' || (!$('#modal').hidden && !UI.modalClosable)) return p0();
  const p = s.pend[0]; if (p.k !== 'offer' || !p.iso || !CC(p.iso) || UI.calls.has(p)) return p0(); const L = CC(p.iso).lider;
  if (!CFG.mute) Sfx.play('news'); Globe.focus(p.iso, 2.4);
  openModal(`<div class="call5"><div class="callring">${face(p.iso)}</div><p class="eyebrow">Llamada entrante</p><h2>${esc(L.n)}</h2><p class="mut">${fl(p.iso)} ${cname(p.iso)} · relación ${sgn(Q.rel(me(), p.iso))}</p>
    <div class="row center"><button class="btn red" data-a="callNo">Colgar</button><button class="btn gold" data-a="callYes">Contestar</button></div></div>`, false, 'event call'); }; }
H.callYes = () => { UI.calls.add(S().pend[0]); closeModal(); showPending(); };
H.callNo = () => { const p = S().pend[0]; closeModal(); act('decide', { i: p.opts.length - 1 }); toast(`Colgaste a ${CC(p.iso).lider.n}: lo tomará como un rechazo`); showPending(); };

/* ---- discurso a la nación ---- */
PTABS.pol.push(['dis', 'Discurso'], ['enc', 'Encuestas']);
{ const p0 = PANELS.pol; PANELS.pol = t => t === 'dis' ? speechHTML() : t === 'enc' ? pollsHTML() : p0(t); }
UI.sp = { tone: 'calmar', topic: 'eco', iso: '' };
function speechHTML() { const s = S(), SP = D.SPEECH, wait = (s.speechT || 0) - s.turn, last = s.speech, F = UI.sp;
  const foes = Object.keys(s.c).filter(z => z !== me() && CC(z).alive).sort((a, b) => Q.rel(me(), a) - Q.rel(me(), b)).slice(0, 12);
  return `<p class="mut fine">Te diriges a todo el país por televisión. Elige el tono y el tema: cada sector escucha cosas distintas. Cuesta ${SP.cp} de capital político; puedes hablar cada ${SP.cool} turnos.</p>
    <h4>Tono</h4><div class="scens">${Object.entries(SP.tones).map(([k, t]) => `<button class="scard ${F.tone === k ? 'on' : ''}" data-a="spSet" data-f="tone" data-v="${k}"><b>${esc(t.n)}</b><small>${esc(t.x)}</small></button>`).join('')}</div>
    ${F.tone === 'culpar' ? `<label>País al que señalas ${sel('sp:iso', foes.map(z => [z, CC(z).n + ' (' + sgn(Q.rel(me(), z)) + ')']), F.iso || foes[0])}</label>` : ''}
    <h4>Tema</h4><div class="chips">${Object.entries(SP.topics).map(([k, t]) => `<button class="chip ${F.topic === k ? 'gold' : ''}" data-a="spSet" data-f="topic" data-v="${k}">${esc(t.n)}</button>`).join('')}</div>
    <div class="row end"><button class="btn gold lg" data-a="spGo" ${wait > 0 ? 'disabled' : ''}>${wait > 0 ? `Podrás hablar en ${wait} turno${wait > 1 ? 's' : ''}` : 'Pronunciar el discurso'}</button></div>
    ${last ? `<h4>Tu último discurso · ${esc(turnDate(last.t))}</h4><div class="card"><p><b>${esc(SP.tones[last.tone].n)}</b> sobre <b>${esc(SP.topics[last.topic].n.toLowerCase())}</b>${last.iso ? ` señalando a ${cname(last.iso)}` : ''}</p>
      <div class="arow"><span class="grow">Lo aprobó el público</span>${bar(last.favor, 100, last.favor >= 55 ? 'green' : last.favor < 40 ? 'red' : '')}<b class="num">${last.favor}%</b></div>
      <div class="chips">${Object.entries(last.sec || {}).filter(x => x[1]).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="chip ${v > 0 ? 'good' : 'bad'}">${esc(BRIEF_N[k] || k)} ${sgn(v)}</span>`).join('')}</div></div>` : ''}`; }
H.spSet = d => { UI.sp[d.f] = d.v; UI.render(); };
H.spGo = () => { const F = UI.sp, iso = F.tone === 'culpar' ? fv('sp:iso', '') || $('#sp\\:iso')?.value : null, r = act('speech', { tone: F.tone, topic: F.topic, iso });
  if (r.ok) { Sfx.play('vote'); if (!CFG.rm) Globe.ring(...(LL(me()) || [0, 0]), r.favor >= 55 ? 0x7dffb0 : 0xffb04a, .14, 2200); } UI.render(); };

/* ---- encuestas detalladas y recortes de prensa ---- */
function pollsHTML() { const s = S(), m = me(), ap = (s.h5 || []).map(x => x.ap), secs = Object.entries(s.pol.sec).sort((a, b) => b[1].w - a[1].w), regs = Q.rlList();
  const clip = s.news.filter(n => n.i === m && n.p >= 2).slice(-8).reverse();
  return `${ap.length >= 2 ? lineChart([{ n: 'Aprobación', c: '#7fe0a8', me: 1, v: ap }], 'Tu aprobación a lo largo del mandato', v => Math.round(v) + '%') : ''}
    <h4>${gi('obr')} Por sector <small class="mut">y cuánto pesa cada sector en el país</small></h4>
    <div class="poll5">${secs.map(([k, x]) => `<div class="arow"><span class="grow">${esc(BRIEF_N[k] || k)} <small class="mut">${Math.round(x.w * 100)}% del país</small></span>${bar(x.a, 100, x.a >= 60 ? 'green' : x.a < 40 ? 'red' : '')}<b class="num">${Math.round(x.a)}</b></div>`).join('')}</div>
    ${regs.length > 2 ? `<h4>${gi('pin')} Por región</h4><div class="chips">${regs.slice(-3).reverse().map(([i, mm]) => `<span class="chip good">${esc(CC(m).terr[i].n)} · contenta</span>`).join('')}${regs.slice(0, 3).map(([i, mm]) => `<span class="chip ${mm >= D.RL.protestAt ? 'bad' : ''}">${esc(CC(m).terr[i].n)} · malestar ${Math.round(mm)}</span>`).join('')}</div>` : ''}
    <h4>${gi('pre')} Recortes de prensa</h4>${clip.length ? clip.map((n, i) => `<div class="clip5"><small class="eyebrow">${esc(D.BRIEF_MEDIA[(n.id || i) % D.BRIEF_MEDIA.length])} · ${esc(turnDate(n.t))}</small><b>${esc(n.x)}</b></div>`).join('') : '<p class="mut">Aún no hay titulares sobre ti.</p>'}`; }

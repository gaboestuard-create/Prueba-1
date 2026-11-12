/* =====================================================================
   INTERFAZ · POLÍTICA AMPLIADA (Fase 2): partidos con ejes y relación,
   sectores con tendencia y causas, pactos de voto, campaña y noche
   electoral. Envuelve al panel de Política existente.
   ===================================================================== */
const _polPanel = PANELS.pol;
PTABS.pol[1] = ['con', 'Partidos'];
PANELS.pol = t => t === 'con' ? partiesHTML() : t === 'sec' ? sectorsHTML() : _polPanel(t);
OVER.censura = ['Destituido por el congreso', 'Los votos estaban contados antes de que empezara la sesión. Sales del palacio por la puerta de atrás.'];

function partiesHTML() {
  const pol = S().pol, gov = Q.govSeats(), dem = Q.isDem();
  return `${hemi(seatCols())}<p class="center mut">Tu coalición suma <b class="${gov > 50 ? 'up' : 'down'}">${Math.round(gov)} de 100 escaños</b>${S().flags.minority ? ' <span class="chip bad">Crisis de gobernabilidad: −1 CP y estabilidad a la baja</span>' : ''}</p>
    ${pol.seats.map((p, i) => `<article class="card party"><div class="row"><i class="dot big" style="background:${IDC(p.ideo)}"></i><div class="grow"><h3>${esc(p.n)}</h3><small class="mut">${Math.round(p.s)} escaños · ${i ? (p.g ? 'socio de gobierno' : 'oposición') : 'tu partido'} · <span class="${p.v ? 'good' : ''}">${p.v ? '✓ verificado' : 'sin verificar'}</span></small></div>${p.g ? '<span class="chip gold">Gobierno</span>' : ''}</div>
      <div class="axes">${Object.keys(D.AXES).map((k, j) => `<div class="ax"><small>${D.AXES[k][0]}</small>${relBar(p.ax[j] * 50)}<small>${D.AXES[k][1]}</small></div>`).join('')}</div>
      ${i && dem ? `<div class="line"><span>Relación contigo</span>${bar(p.rel, 100, p.rel < 35 ? 'red' : p.rel >= 55 ? 'green' : '')}<b class="num">${Math.round(p.rel)}</b></div>
      <div class="row wrap"><button class="btn sm" data-a="pTalk" data-k="woo" data-i="${i}" title="Partidas para sus prioridades: relación +8">Cortejar · 1 CP · ${money(CC(me()).gdp * .0005)}</button>${p.g ? `<button class="btn sm red" data-a="pTalk" data-k="expel" data-i="${i}" data-confirm>Expulsar del gobierno</button>` : `<button class="btn sm gold" data-a="pTalk" data-k="pact" data-i="${i}" title="Exige relación de 55 y cercanía ideológica">Invitar al gobierno · 2 CP</button>`}</div>` : ''}</article>`).join('')}
    <p class="mut fine">Cada partido vota por la distancia entre la ley y sus cuatro ejes, por su relación contigo y por si le prometiste algo. Un socio con relación menor de 35 abandona la coalición; sin mayoría y con poca aprobación llega la ${D.PARLIAMENTARY.includes(me()) ? 'moción de censura' : 'acusación para un juicio político'}.</p>`;
}
function sectorsHTML() {
  const pol = S().pol, t = S().turn, agg = {};
  for (const k in pol.sec) for (const e of pol.slog[k] || []) if (t - e.t <= 4) agg[e.w] = (agg[e.w] || 0) + e.v * pol.sec[k].w;
  const worst = Object.keys(agg).filter(w => agg[w] < -.15).sort((a, b) => agg[a] - agg[b]).slice(0, 3), best = Object.keys(agg).filter(w => agg[w] > .15).sort((a, b) => agg[b] - agg[a]).slice(0, 2);
  return `<div class="card"><small>Tu aprobación es ${pct(Q.approval())}. En los últimos turnos:</small>
      ${worst.length ? `<p><b class="down">Te restó apoyo:</b> ${worst.map(w => `${esc(w)} (${sgn(agg[w], 1)})`).join(' · ')}</p>` : '<p class="mut">Nada te ha restado apoyo de forma apreciable.</p>'}${best.length ? `<p><b class="up">Te sumó:</b> ${best.map(w => `${esc(w)} (${sgn(agg[w], 1)})`).join(' · ')}</p>` : ''}</div>
    ${Object.keys(pol.sec).sort((a, b) => pol.sec[a].a - pol.sec[b].a).map(k => { const x = pol.sec[k], b = Q.secBase(k), h = pol.shist[k] || [], d = h.length > 1 ? x.a - h[Math.max(0, h.length - 4)] : 0, wy = Q.secWhy(k);
      return `<details class="secrow"><summary><span class="grow"><b>${D.SECTORS[k].n}</b> <small class="mut">${Math.round(x.w * 100)}%</small></span><span class="bar ${x.a < 35 ? 'red' : x.a > 60 ? 'green' : ''} need" style="--need:${b}%"><i style="width:${x.a}%"></i></span><b class="num">${Math.round(x.a)}</b><small class="num ${d > .5 ? 'up' : d < -.5 ? 'down' : 'mut'}">${d > .5 ? '▲' : d < -.5 ? '▼' : '='}${Math.abs(d) > .5 ? Math.abs(d).toFixed(0) : ''}</small>${spark(h, 60, 20)}</summary>
        <div class="why">${wy.map(e => `<div><span>${esc(e.w)} <small class="mut">turno ${e.t + 1}</small></span><b class="${e.v >= 0 ? 'up' : 'down'}">${sgn(e.v, 1)}</b></div>`).join('') || '<div><span class="mut">Sin cambios recientes</span></div>'}<div><span class="mut">Línea base por tus leyes y rasgos</span><b>${Math.round(b)}</b></div></div></details>`; }).join('')}
    <p class="mut fine">Ordenados de menor a mayor afinidad. Toca un sector para ver por qué se movió. La marca blanca es su línea base. Por debajo de 36 llegan huelgas, protestas, fuga de capitales o ruido de sables, según el sector.</p>`;
}
function lawExtra(l, on) {
  if (on || !Q.isDem()) return ''; const pol = S().pol, opp = pol.seats.map((p, i) => [i, p]).filter(x => x[0] && !x[1].g);
  const done = opp.filter(x => pol.pledge[x[1].n] === l.id).map(x => `<span class="chip good">${esc(x[1].n)} comprometido</span>`).join('');
  return opp.length ? `<div class="row wrap pledge"><small class="mut">Pactar el voto de</small>${sel('pl:pp', opp.map(x => [x[0], `${x[1].n} (${Math.round(x[1].s)})`]), opp[0][0])}<button class="btn sm" data-a="pledge" data-id="${l.id}">Pactar · 1 CP</button>${done}</div>` : '';
}
H.pTalk = d => act('partyTalk', { k: d.k, i: +d.i });
H.pledge = d => { const opp = S().pol.seats.map((p, i) => [i, p]).filter(x => x[0] && !x[1].g); act('partyTalk', { k: 'pledge', i: +fv('pl:pp', opp[0] && opp[0][0]), law: d.id }); };

/* ---- campaña: mensaje, sectores objetivo, gasto y aval ---- */
function campaignModal(p) {
  const pol = S().pol, f = { msg: fv('cg:msg', 'eco'), spend: +fv('cg:spend', 1), tg: [fv('cg:t1', 'med'), fv('cg:t2', 'obr')], ally: +fv('cg:ally', 0) }, pl = Q.campaignPlan(f);
  const secs = Object.keys(pol.sec).map(k => [k, `${D.SECTORS[k].n} · ${Math.round(pol.sec[k].w * 100)}% · afinidad ${Math.round(pol.sec[k].a)}`]);
  openModal(`<div class="ev-head">${ic('elec', 'ev-ic')}<div><p class="eyebrow">Elecciones · quedan 2 turnos</p><h2>${esc(p.t)}</h2></div></div><p class="ev-text">${esc(p.x)}</p>
    <h4>1 · Mensaje</h4><div class="grid2">${Object.keys(D.CAMPAIGN).map(k => { const m = D.CAMPAIGN[k]; return `<button class="opt ${f.msg === k ? 'on' : ''}" data-a="cgSet" data-k="msg" data-v="${k}"><b>${m.n} <span class="chip ${Q.msgFits(k) ? 'good' : 'bad'}">${Q.msgFits(k) ? 'conecta' : 'no cuaja'}</span></b><small class="mut">${m.d} Moviliza a ${m.sec.map(x => D.SECTORS[x].n.toLowerCase()).join(', ')}.</small></button>`; }).join('')}</div>
    <h4>2 · A quién le hablas</h4><div class="row wrap">${sel('cg:t1', secs, f.tg[0])}${sel('cg:t2', secs, f.tg[1])}</div>
    <h4>3 · Gasto</h4><div class="row wrap">${D.SPEND.map((x, i) => `<button class="btn ${f.spend === i ? 'gold' : ''}" data-a="cgSet" data-k="spend" data-v="${i}">${x[0]} · ${money(CC(me()).gdp * x[1] / 100)}</button>`).join('')}</div>
    <h4>4 · Quién te avala</h4>${sel('cg:ally', [[0, 'Nadie: campaña en solitario']].concat(pol.seats.map((x, i) => [i, `${x.n} · relación ${Math.round(x.rel)}${x.rel >= 55 ? '' : ' (te dirá que no)'}`]).slice(1)), f.ally)}
    <div class="card"><small>Previsión</small>${pl.list.map(x => `<div class="line"><span>${esc(x[0])}</span><b class="num ${x[1] >= 0 ? 'up' : 'down'}">${sgn(x[1], 1)} pts</b></div>`).join('')}<div class="line"><span><b>Total sobre tu proyección</b></span><b class="num ${pl.total >= 0 ? 'up' : 'down'}">${sgn(pl.total, 1)} pts</b></div></div>
    <div class="row end"><button class="btn gold lg" data-a="cgGo">Lanzar la campaña · ${money(pl.cost)}</button></div>`, false, 'event wide');
}
H.cgSet = d => { UI.form['cg:' + d.k] = d.v; campaignModal(S().pend[0]); };
H['in:cg'] = () => { if (S().pend[0] && S().pend[0].k === 'camp') campaignModal(S().pend[0]); };
H.cgGo = () => { const x = { msg: fv('cg:msg', 'eco'), spend: +fv('cg:spend', 1), tg: [fv('cg:t1', 'med'), fv('cg:t2', 'obr')], ally: +fv('cg:ally', 0) }; closeModal(); act('decide', { i: 0, x }); runSQ(); };
const electionRegsHTML = e => `<div class="eregs">${e.regs.map((r, i) => `<div class="line" style="animation-delay:${.15 + i * .13}s"><span>${esc(r.n)}</span><span class="bar ${r.v >= 50 ? 'green' : 'red'} need grow-anim" style="--need:50%"><i style="width:${r.v}%;animation-delay:${.15 + i * .13}s"></i></span><b class="num ${r.v >= 50 ? 'up' : 'down'}">${r.v.toFixed(0)}%</b></div>`).join('')}</div>`;

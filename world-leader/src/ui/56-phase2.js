/* =====================================================================
   INTERFAZ · FASE 2: economía profunda, inteligencia, bloques, Asamblea,
   periódico, alertas, atajos de teclado y editor ampliado.
   Todo envuelve o amplía los paneles existentes.
   ===================================================================== */
Object.assign(INN, { ind: 'Industria y exportaciones', ara: 'Aranceles' }); Object.assign(EXN, { deu: 'Servicio de la deuda' });
Object.assign(PT, { edit: 'Editor · modo dios' });

/* ---------- ECONOMÍA: indicadores, industria, política y deuda ---------- */
PTABS.eco[1][1] = 'Recursos'; PTABS.eco.push(['ind', 'Indicadores'], ['fab', 'Industria'], ['pol', 'Deuda y política']);
Bus.on('syserr', e => { if (UI.errT === G.S.turn) return; UI.errT = G.S.turn; toast(`Se omitió un fallo interno (${e.w}). La partida sigue; si se repite, exporta la partida y avísame.`, false); });
function chart(arr, title, unit, cls) {
  if (!arr || arr.length < 2) return `<div class="card chartc"><small>${title}</small><p class="mut">Aparecerá tras un par de turnos.</p></div>`;
  const w = 300, h = 90, mn = Math.min(...arr), mx = Math.max(...arr), sp = mx - mn || 1, pts = arr.map((v, i) => [(i / (arr.length - 1) * (w - 12) + 6).toFixed(1), (h - 10 - (v - mn) / sp * (h - 22)).toFixed(1)]), last = arr[arr.length - 1], d = last - arr[0];
  return `<div class="card chartc"><div class="row"><small class="grow">${title}</small><b class="num">${last}${unit}</b><small class="num ${d >= 0 ? 'up' : 'down'}">${sgn(d, Math.abs(d) < 10 ? 1 : 0)}</small></div>
    <svg class="chart ${cls || ''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="grid" d="M6 ${h / 2}H${w - 6}M6 ${h - 10}H${w - 6}M6 12H${w - 6}"/><path class="area" d="M${pts.map(p => p.join(',')).join('L')}L${w - 6},${h - 4}L6,${h - 4}z"/><path class="line" pathLength="1" d="M${pts.map(p => p.join(',')).join('L')}"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="3"/></svg>
    <div class="row"><small class="mut grow">mín ${mn}${unit}</small><small class="mut">máx ${mx}${unit}</small></div></div>`;
}
const _ecoPanel = PANELS.eco;
PANELS.eco = t => {
  const s = S(), c = CC(me()), E = Q.ecoInfo();
  if (t === 'ind') return `<div class="kvs big">${kv('Inflación', E.inf.toFixed(1) + '%')}${kv('Desempleo', E.unemp.toFixed(1) + '%')}${kv('Deuda', Math.round(E.ratio * 100) + '% del PIB')}${kv('Moneda', Math.round(E.fx), '100 = valor inicial')}</div>
      ${E.cri ? `<p class="warn-box">Tu país está en crisis financiera: quedan unos ${E.cri} turnos. Menos crecimiento, más paro y la bolsa nacional cae.</p>` : ''}
      ${E.infected.length ? `<p class="mut">Países en crisis ahora mismo: ${E.infected.map(z => flag(z) + ' ' + cname(z)).join(', ')}. Se contagia por los tratados comerciales; unas reservas altas te protegen.</p>` : ''}
      <div class="grid2">${chart(s.hist.gdp, 'PIB (mM$)', '', 'gold')}${chart(s.hist.debt, 'Deuda', '%', 'red')}${chart(s.hist.inf, 'Inflación', '%', 'red')}${chart(s.hist.unemp, 'Desempleo', '%', 'red')}${chart(s.hist.appr, 'Aprobación', '%', 'cyan')}${chart(s.hist.tr, 'Caja (mM$)', '', 'gold')}</div>`;
  if (t === 'fab') { const I = Q.indInfo();
    return `<p class="mut">Cada planta convierte materias primas en exportaciones. Si produces el insumo, te cuesta la mitad; si lo importas, dependes del precio mundial y de tu moneda.</p>
      <div class="grid3">${Object.keys(I).map(k => { const d = D.INDUSTRY[k], x = I[k]; return `<div class="card"><h3>${d.n}</h3><small class="mut">${d.d}</small><div class="kvs">${kv('Plantas', x.lvl)}${kv('Margen', `<span class="${x.margin > 0 ? 'up' : 'down'}">${money(x.margin)}</span>`)}${kv('Recauda', money(x.rev))}</div>
        <div class="chips">${Object.keys(d.inp).map(r => `<span class="chip ${(c.rec[r] || 0) > 0 ? 'good' : 'bad'}">${D.COMMODITIES[r].n} ${(c.rec[r] || 0) > 0 ? '· propio' : '· importado'}</span>`).join('')}</div>
        <button class="btn gold" data-a="buildInd" data-k="${k}">Nueva planta · ${money(x.build)}</button></div>`; }).join('')}</div>
      <p class="mut fine">El Estado recauda el 35% del margen. Cada planta nueva suma crecimiento (+0.012 pp, hasta +0.3) y baja algo el paro. Con precios altos de los insumos una industria puede dar pérdidas.</p>`; }
  if (t === 'pol') return `<h4>Palancas <small class="mut">mover una cuesta 1 CP; una vez por turno cada una</small></h4>
      ${Object.keys(D.LEVERS).map(k => { const L = D.LEVERS[k]; return `<div class="arow"><div class="grow"><b>${L.n}</b><small>${L.d[E.levers[k]]}</small></div>${L.o.map((o, i) => `<button class="btn sm ${E.levers[k] === i ? 'gold' : ''}" data-a="policy" data-k="${k}" data-v="${i}" title="${esc(L.d[i])}" ${E.set[k] === s.turn && E.levers[k] !== i ? 'disabled' : ''}>${o}</button>`).join('')}</div>`; }).join('')}
      <h4>Deuda pública</h4><div class="kvs big">${kv('Deuda', money(E.debt))}${kv('Sobre el PIB', Math.round(E.ratio * 100) + '%')}${kv('Interés', E.rate.toFixed(2) + '% /turno')}${kv('Coste', money(E.debt * E.rate / 100) + ' /turno')}</div>
      <div class="row wrap"><label class="inl">Importe (mM$) ${inp('ec:bond', Math.max(1, Math.round(c.gdp * .01)), 'type="number" min="0.1" step="0.1" class="w70"')}</label><button class="btn" data-a="bond" data-d="1">Emitir bonos</button><button class="btn" data-a="bond" data-d="-1">Amortizar</button></div>
      <p class="mut fine">El interés sube con la deuda, la inflación, la inestabilidad y la mala fama. Por encima del 90% del PIB llegan las rebajas de calificación; el tope es el 150%.</p>
      <h4>Reservas y moneda</h4><div class="kvs big">${kv('Reservas', money(E.res))}${kv('Moneda', Math.round(E.fx))}</div>
      <div class="row wrap"><button class="btn" data-a="reserves" data-d="1">Depositar en reservas</button><button class="btn" data-a="reserves" data-d="-1">Retirar</button></div>
      <p class="mut fine">Usa el mismo importe de arriba. Si la moneda cae por debajo de 90, el banco central gasta reservas para sostenerla. Una moneda débil encarece lo que importas y da empuje a tu industria.</p>`;
  return _ecoPanel(t);
};
H.buildInd = d => act('buildInd', { k: d.k }); H.policy = d => act('policy', { k: d.k, v: +d.v });
const bondAmt = () => +fv('ec:bond', Math.max(1, Math.round(CC(me()).gdp * .01)));
H.bond = d => act('bond', { amt: bondAmt() * +d.d }); H.reserves = d => act('reserves', { amt: bondAmt() * +d.d });

/* ---------- DIPLOMACIA: inteligencia y bloques ---------- */
PTABS.dip.push(['blo', 'Bloques']);
const _dipPanel = PANELS.dip;
PANELS.dip = t => {
  if (t === 'int') { const L = Q.intelList(), A = Q.arcInfo();
    return `<p class="mut">Lo que tus servicios creen que planea cada país. Es una estimación: la certeza sube con tus redes de agentes, y algunos gobiernos mienten sobre sus intenciones.</p>
      ${A ? `<div class="chips"><button class="chip bad" data-a="sel" data-iso="${A.rival.iso}">Tu rival: ${flag(A.rival.iso)} ${cname(A.rival.iso)}</button><button class="chip good" data-a="sel" data-iso="${A.ally.iso}">Tu aliado: ${flag(A.ally.iso)} ${cname(A.ally.iso)}</button></div>` : ''}
      <div class="list">${L.map(e => `<button class="li intel" data-a="sel" data-iso="${e.iso}">${fl(e.iso)}<span class="grow"><b>${cname(e.iso)}</b><small class="mut">Dice: ${esc(Q.planText(e.says))}${e.goalText ? ' · objetivo: ' + esc(e.goalText.toLowerCase()) : ''}</small><small class="${e.danger >= 3 ? 'down' : ''}">Creemos: ${esc(Q.planText(e.est))}</small></span><span class="conf">${bar(e.conf * 100, 100, e.conf > .65 ? 'green' : e.conf < .45 ? 'red' : '')}<small class="mut">${Math.round(e.conf * 100)}% · red ${e.net}</small></span></button>`).join('') || '<p class="mut pad">Tus servicios aún no tienen informes: llegarán al cerrar el primer turno.</p>'}</div>`; }
  if (t === 'blo') return `<p class="mut">Los bloques defensivos te protegen (y te obligan); los comerciales te dan libre comercio con todos sus miembros.</p>
      ${Object.keys(D.BLOCS).map(b => { const k = Q.blocCheck(b), B = D.BLOCS[b]; return `<div class="arow"><div class="grow"><b><i class="dot" style="background:${B.c}"></i>${k.n} ${k.inside ? '<span class="chip gold">Miembro</span>' : ''}</b><small>${k.members} miembros · relación media contigo ${sgn(k.avg)}${B.def ? ' · defensa mutua' : ''}${B.com ? ' · libre comercio' : ''}${!k.inside && !k.ok ? ' · no te admiten: ' + esc(k.why.join('; ')) : ''}</small></div>${k.inside ? `<button class="btn sm red" data-a="bloc" data-b="${b}" data-leave="1" data-confirm>Abandonar · 2 CP</button>` : `<button class="btn sm ${k.ok ? 'gold' : ''}" data-a="bloc" data-b="${b}" ${k.ok ? '' : 'disabled'}>Pedir ingreso · 4 CP</button>`}</div>`; }).join('')}`;
  return _dipPanel(t);
};
H.bloc = d => { act('bloc', { b: d.b, leave: !!d.leave }); refreshMap(); };
function sheetExtra(iso) {
  const emb = S().sanc.find(x => x.by === me() && x.on === iso);
  return `<h4>Cumbre bilateral</h4><div class="arow"><div class="grow"><b>Convocar una cumbre</b><small>Más peso que una visita: puede cerrar un tratado, frenar su presión sobre ti o borrar agravios. 2 CP y ${money(.5)}.</small></div>${sel('sh:ag', [['com', 'Agenda económica'], ['seg', 'Agenda de seguridad'], ['rec', 'Reconciliación']], 'com')}<button class="btn sm gold" data-a="summit" data-iso="${iso}">Convocar</button></div>
    ${emb && !emb.emb ? `<div class="arow"><div class="grow"><b>Embargo total</b><small>El peldaño siguiente a las sanciones: su economía sufre el doble. Si es un gran productor, subirán los precios para todos.</small></div><button class="btn sm red" data-a="embargo" data-iso="${iso}" data-confirm>Decretar embargo · 2 CP</button></div>` : ''}`;
}
H.summit = d => sheetAct('summit', { iso: d.iso, agenda: fv('sh:ag', 'com') }); H.embargo = d => sheetAct('embargo', { iso: d.iso });

/* ---------- ASAMBLEA: debate, previsión, cabildeo y veto ---------- */
function unModal(p) {
  const b = Q.unBrief(), cp = S().pol.cp;
  openModal(`<div class="ev-head">${ic('un', 'ev-ic')}<div><p class="eyebrow">Asamblea de Naciones${b.binding ? ' · resolución vinculante' : ''}</p><h2>${esc(p.t.replace('Asamblea de la ONU · ', ''))}</h2></div></div><p class="ev-text">${esc(p.x)}</p>
    <div class="tally big"><i class="y" style="flex:${b.yes}"></i><i class="a" style="flex:${b.abs}"></i><i class="n" style="flex:${b.no}"></i></div><small class="mut center">Previsión sin contar tu voto: ${b.yes} a favor · ${b.abs} abstenciones · ${b.no} en contra</small>
    ${b.veto.length ? `<p class="warn-box">${b.veto.map(z => flag(z) + ' ' + cname(z)).join(' y ')} ${b.veto.length > 1 ? 'vetarán' : 'vetará'} el texto en el consejo, salgan los votos que salgan.</p>` : ''}
    <h4>Debate</h4><div class="debate">${b.debate.map(d => `<div class="say ${d.v > 0 ? 'y' : d.v < 0 ? 'n' : ''}">${fl(d.iso)}<span><b>${cname(d.iso)}</b> <small class="mut">${d.v > 0 ? 'a favor' : d.v < 0 ? 'en contra' : 'indeciso'}</small><br>«${esc(d.q)}»</span></div>`).join('')}</div>
    <h4>Cabildeo <small class="mut">indecisos · ${6 - b.buys} gestiones disponibles · un favor cuesta 1 CP y te lo cobrarán</small></h4>
    <div class="list lobby">${b.swing.map(x => `<div class="li">${fl(x.iso)}<span class="grow">${cname(x.iso)} <small class="mut">${x.sc > .12 ? 'a favor' : x.sc < -.12 ? 'en contra' : 'abstención'} · relación ${sgn(x.rel)}</small></span>${x.bought ? `<span class="chip gold">Comprometido ${x.bought > 0 ? 'a favor' : 'en contra'}</span>` : `<button class="btn sm" data-a="unLobby" data-iso="${x.iso}" data-how="favor" data-dir="1" ${cp < 1 ? 'disabled' : ''}>Favor: sí</button><button class="btn sm" data-a="unLobby" data-iso="${x.iso}" data-how="favor" data-dir="-1" ${cp < 1 ? 'disabled' : ''}>Favor: no</button><button class="btn sm" data-a="unLobby" data-iso="${x.iso}" data-how="aid" data-dir="1" title="Ayuda en efectivo a cambio de su sí">${money(Math.max(.2, CC(x.iso).gdp * .004))}: sí</button>`}</div>`).join('') || '<p class="mut pad">Nadie duda: los votos están decididos.</p>'}</div>
    <h4>Tu voto</h4><div class="row wrap">${p.opts.map((o, i) => /cabildear/.test(o.t) ? '' : `<button class="btn ${i === 0 ? 'gold' : /Vetar/.test(o.t) ? 'red' : ''}" data-a="decide" data-i="${i}" ${/Vetar/.test(o.t) ? 'data-confirm' : ''}>${esc(o.t)}</button>`).join('')}</div>`, false, 'event wide');
}
H.unLobby = d => { act('unLobby', { iso: d.iso, how: d.how, dir: +d.dir }); if (S().pend[0] && S().pend[0].k === 'un') unModal(S().pend[0]); };

/* ---------- PERIÓDICO, ALERTAS Y RESUMEN ---------- */
function paperHTML() {
  const p = Q.paper();
  return `<div class="paper"><header><small>${esc(p.date)} · edición internacional</small><h1>El Heraldo Mundial</h1></header>
    ${p.head ? `<h2 class="headline">${esc(p.head.x)}</h2>` : '<p class="mut">Sin noticias: un trimestre en calma.</p>'}
    <div class="cols">${Object.keys(p.sec).filter(k => p.sec[k].length).map(k => `<section><h4>${k}</h4>${p.sec[k].map(n => `<p class="p${n.p}">${esc(n.x)}</p>`).join('')}</section>`).join('')}</div></div>`;
}
H.paper = () => openModal(paperHTML(), true, 'wide paperbox');
PTABS.world.push(['per', 'Periódico']);
const _worldPanel = PANELS.world; PANELS.world = t => t === 'per' ? paperHTML() : _worldPanel(t);
const alertBtn = () => { const n = Q.alerts().length, hot = Q.alerts().some(a => a.p >= 4); return `<button class="sndbtn ${hot ? 'hot' : ''}" data-a="alerts" aria-label="Alertas" title="Alertas (A)">${ic('bad')}${n ? `<i class="badge">${n}</i>` : ''}</button>`; };
const alertRows = () => Q.alerts().map(a => `<button class="alert p${a.p}" data-a="alertGo" data-p="${a.panel}" data-t="${a.tab}">${ic(a.p >= 4 ? 'bad' : 'next')}<span>${esc(a.t)}</span></button>`).join('');
const alertsHTML = () => `<aside class="alerts glass"><header><h3>Requiere tu atención</h3><button class="btn sm ghost" data-a="paper">Periódico</button></header>${alertRows() || '<p class="mut pad">Todo en orden. Disfrútalo: no dura.</p>'}</aside>`;
H.alerts = () => { UI.alertsOpen = !UI.alertsOpen; UI.render(); };
H.alertGo = d => { UI.alertsOpen = false; if (UI.cineEnd) UI.cineEnd(); if (!d.p) return showPending(); UI.panel = d.p; if (d.t) UI.tab[d.p] = d.t; UI.sel = innerWidth < 1250 ? null : UI.sel; UI.render(); };
const turnExtra = () => { const a = Q.alerts().filter(x => x.p >= 2); return a.length ? `<div class="tf-alerts"><p class="eyebrow">Requiere tu atención</p>${a.slice(0, 5).map(x => `<div class="alert p${x.p}">${ic(x.p >= 4 ? 'bad' : 'next')}<span>${esc(x.t)}</span></div>`).join('')}</div>` : ''; };

/* ---------- ATAJOS DE TECLADO ---------- */
const KEYS = [['Espacio / Intro', 'Terminar turno o continuar'], ['1 – 8', 'Abrir los paneles del gabinete'], ['M', 'Cambiar el modo de mapa'], ['A', 'Alertas'], ['N', 'Periódico'], ['Esc', 'Cerrar'], ['?', 'Esta ayuda']];
document.addEventListener('keydown', e => {
  if (UI.screen !== 'game' || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test((e.target.tagName || ''))) return; const k = e.key;
  if (k === ' ' || k === 'Enter') { if (e.target.closest && e.target.closest('button')) return; e.preventDefault(); if (UI.cineEnd) return UI.cineEnd(); const b = $('[data-a=sceneDone]'); if (b) return b.click(); if ($('#modal').hidden && !S().pend.length && !S().over) H.endTurn(); else if ($('#modal').hidden) showPending(); return; }
  if (!$('#modal').hidden || !$('#cine').hidden) return;
  if (k >= '1' && k <= '8' && DOCK[+k - 1]) H.open({ p: DOCK[+k - 1][0] });
  else if (k === 'm' || k === 'M') { const m = Object.keys(MODES); H.mode({ m: m[(m.indexOf(UI.mode) + 1) % m.length] }); }
  else if (k === 'a' || k === 'A') H.alerts(); else if (k === 'n' || k === 'N') H.paper();
  else if (k === '?') openModal(`<h2>Atajos de teclado</h2>${KEYS.map(x => `<div class="line"><span><kbd>${x[0]}</kbd></span><span>${x[1]}</span><b></b></div>`).join('')}`, true);
});
Bus.on('state', () => { if (UI.screen === 'game') { clearTimeout(UI.svT); UI.svT = setTimeout(autosave, 1200); } }); // la partida se guarda tras cada acción, no solo al cerrar turno

/* ---------- EDITOR AMPLIADO ---------- */
PTABS.edit = [['pais', 'País'], ['reg', 'Regiones'], ['par', 'Partidos'], ['ia', 'IA y memoria'], ['eve', 'Eventos'], ['dat', 'Datos']];
const _editPanel = PANELS.edit;
PANELS.edit = t => {
  const s = S(), p = me(), iso = edIso(), c = CC(iso), cs = Object.keys(s.c).sort((a, b) => CC(a).n.localeCompare(CC(b).n)).map(i => [i, CC(i).n]);
  const N = (label, k, v, attrs) => `<label>${label}<input data-c="edSet" data-k="${k}" value="${esc(v)}" ${attrs || 'type="number" step="any"'}></label>`, pickC = `<label>País ${sel('ed:iso', cs, iso)}</label>`;
  if (t === 'reg') { const i = Math.min(c.terr.length - 1, Math.max(0, +fv('ed:reg', 0) || 0)), r = c.terr[i];
    return `${pickC}<label>Región ${sel('ed:reg', c.terr.map((x, j) => [j, x.n + (x.o !== iso ? ' → ' + CC(x.o).n : '')]), i)}</label>
      <div class="grid2">${N('Nombre', `terr.${i}.n`, r.n, 'type="text" maxlength="60"')}${N('Autoridad regional', `terr.${i}.gob`, r.gob || '', 'type="text" maxlength="60"')}${N('Partido gobernante', `terr.${i}.p`, r.p || '', 'type="text" maxlength="60"')}
        <label>Quién la controla<select data-c="edSet" data-k="terr.${i}.o">${cs.map(x => `<option value="${x[0]}" ${r.o === x[0] ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select></label></div>
      <label class="check"><input type="checkbox" data-c="edSet" data-k="terr.${i}.v" ${r.v ? 'checked' : ''}> Autoridad y partido verificados por mí</label>
      <p class="mut fine">Cambiar quién la controla traslada la región (con su peso económico y su población) al instante: sirve para probar conquistas y cesiones.</p>`; }
  if (t === 'par') return `<p class="mut">El congreso de tu país. Los escaños se reequilibran solos para sumar 100. Ejes de −2 a 2: ${Object.keys(D.AXES).map(k => D.AXES[k].join(' ↔ ')).join(' · ')}.</p>
      ${s.pol.seats.map((x, i) => `<div class="card party"><div class="grid3">${N('Partido', `party.${i}.n`, x.n, 'type="text" maxlength="50"')}${N('Escaños', `party.${i}.s`, Math.round(x.s), 'type="number" min="0" max="100"')}${i ? N('Relación contigo', `party.${i}.rel`, Math.round(x.rel), 'type="number" min="0" max="100"') : ''}${Object.keys(D.AXES).map((k, j) => N(D.AXES[k][1], `party.${i}.ax.${j}`, x.ax[j], 'type="number" min="-2" max="2" step="0.5"')).join('')}</div>
        <div class="row wrap">${i ? `<label class="check"><input type="checkbox" data-c="edSet" data-k="party.${i}.g" ${x.g ? 'checked' : ''}> En el gobierno</label>` : ''}<label class="check"><input type="checkbox" data-c="edSet" data-k="party.${i}.v" ${x.v ? 'checked' : ''}> Verificado</label></div></div>`).join('')}`;
  if (t === 'ia') { const o = s.c[fv('ed:o', '')] && fv('ed:o') !== iso ? fv('ed:o') : (iso === p ? cs.find(x => x[0] !== iso)[0] : p), PER = { agres: 'Agresividad', expan: 'Expansionismo', leal: 'Lealtad', coop: 'Cooperación', rencor: 'Rencor', amb: 'Ambición', risk: 'Tolerancia al riesgo', eng: 'Propensión a mentir' }, mem = Q.memOf(iso, o);
    return `${pickC}<label>Dificultad de la partida<select data-c="edSet" data-k="diff">${Q.DIFF.n.map((n, i) => `<option value="${i}" ${(s.diff == null ? 1 : s.diff) === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <h4>Personalidad de ${cname(iso)} (0-100)</h4><div class="grid3">${Object.keys(PER).map(k => N(PER[k], 'per.' + k, Math.round((c.per[k] || 0) * 100), 'type="number" min="0" max="100"')).join('')}</div>
      <label>Objetivo de largo plazo<select data-c="edSet" data-k="goal">${Object.keys(Q.GOALS).map(k => `<option value="${k}" ${c.goal === k ? 'selected' : ''}>${Q.GOALS[k]}</option>`).join('')}</select></label>
      <h4>Memoria entre ${cname(iso)} y</h4>${sel('ed:o', cs.filter(x => x[0] !== iso), o)}
      <div class="why">${mem.map(m => `<div><span>${esc(m.k)} ${m.g ? '<small class="mut">agravio</small>' : ''}</span><span><b class="${m.v >= 0 ? 'up' : 'down'}">${sgn(m.v, 0)}</b> <button class="lnk" data-a="memDel" data-i="${m.i}">borrar</button></span></div>`).join('') || '<div><span class="mut">No recuerdan nada el uno del otro.</span></div>'}</div>
      <div class="row wrap">${inp('ed:ml', 'Favor del editor', 'maxlength="50" aria-label="Motivo"')}${inp('ed:mv', 20, 'type="number" min="-90" max="90" class="w70" aria-label="Valor"')}<button class="btn sm" data-a="memAdd">Añadir recuerdo</button></div>
      <p class="mut fine">Relación actual: ${sgn(Q.rel(iso, o))}. Un valor negativo se guarda como agravio (decae despacio y pesa en sus decisiones).</p>`; }
  if (t === 'eve') { const all = D.EVENTS.map(e => [e.id, e.t.replace(/\{.\}/g, '…')]).sort((a, b) => a[1].localeCompare(b[1]));
    return `<p class="mut">Lanza cualquier evento a mano, con el país que elijas como protagonista si el evento lo necesita.</p>
      <label>Evento ${sel('ed:ev', all, all[0][0])}</label><label>País protagonista ${sel('ed:evt', [['', 'El que elija el juego']].concat(cs.filter(x => x[0] !== p)), '')}</label>
      <div class="row"><button class="btn gold" data-a="edFire">Disparar evento</button></div><p class="mut fine">${D.EVENTS.length} eventos en total. Los encadenados se disparan igual que el resto.</p>`; }
  if (t === 'dat') return `<p class="mut">Tus correcciones (líderes, partidos, regímenes, autoridades y partidos regionales) viajan aparte de la partida, para reutilizarlas.</p>
      <div class="row wrap"><button class="btn gold" data-a="datExp">Exportar datos corregidos</button><button class="btn" data-a="datKeep">Usarlos en mis próximas partidas</button><button class="btn ghost" data-a="datDrop" data-confirm>Olvidar los guardados</button></div>
      <textarea id="datTxt" rows="7" placeholder='Aquí aparece el JSON al exportar. Para importar, pega uno y pulsa "Aplicar".'></textarea>
      <div class="row end"><button class="btn" data-a="datCopy">Copiar</button><button class="btn gold" data-a="datImp">Aplicar a esta partida</button></div>
      <p class="mut fine">La partida completa (estado + datos) se exporta desde Partida → Exportar JSON.</p>`;
  return _editPanel();
};
H.memDel = d => { const iso = edIso(), o = S().c[fv('ed:o', '')] && fv('ed:o') !== iso ? fv('ed:o') : me(); act('edit', { iso, k: 'memdel', o, v: +d.i }); };
H.memAdd = () => { const iso = edIso(), cs = Object.keys(S().c).filter(x => x !== iso), o = S().c[fv('ed:o', '')] && fv('ed:o') !== iso ? fv('ed:o') : (iso === me() ? cs[0] : me()); act('edit', { iso, k: 'memadd', o, label: fv('ed:ml', 'Favor del editor'), v: +fv('ed:mv', 20) }); refreshMap(); };
H.edFire = () => { const all = D.EVENTS.map(e => e.id), r = act('fireEvent', { id: fv('ed:ev', all[0]), iso: fv('ed:evt', '') }); if (r.ok) { UI.panel = null; UI.render(); showPending(); } };
H.datExp = () => { $('#datTxt').value = WL.exportData(); toast('Datos exportados: cópialos y guárdalos'); };
H.datCopy = () => { const t = $('#datTxt'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Copiado'), () => toast('No se pudo copiar solo: el texto queda seleccionado', false)); };
H.datImp = () => { act('importData', { json: $('#datTxt').value.trim() }); refreshMap(); };
H.datKeep = () => { try { localStorage.setItem('wl_mod', WL.exportData()); toast('Tus correcciones se aplicarán a las partidas nuevas en este navegador'); } catch (e) { toast('Este navegador bloquea el guardado local', false); } };
H.datDrop = () => { try { localStorage.removeItem('wl_mod'); toast('Datos guardados olvidados'); } catch (e) { } };
{ const go0 = H.ngGo; H.ngGo = () => { go0(); if (UI.screen !== 'game') return; let m = null; try { m = localStorage.getItem('wl_mod'); } catch (e) { } if (m) { const r = G.act('importData', { json: m }); if (r.ok) refreshMap(); } }; }

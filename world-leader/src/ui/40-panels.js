/* =====================================================================
   INTERFAZ · paneles del gabinete: Economía, Política, Diplomacia,
   Ejército, Mundo, Editor (modo dios) y Partida
   ===================================================================== */
const PT = { eco: 'Economía', pol: 'Política interna', dip: 'Diplomacia', mil: 'Fuerzas armadas', world: 'El mundo', edit: 'Editor · modo dios', sys: 'Partida' };
const PTABS = {
  eco: [['pre', 'Presupuesto'], ['rec', 'Materias primas'], ['com', 'Comercio'], ['bol', 'Bolsa']],
  pol: [['ley', 'Leyes'], ['con', 'Congreso'], ['sec', 'Sectores'], ['reg', 'Regiones'], ['ele', 'Elecciones']],
  dip: [['rel', 'Relaciones'], ['tra', 'Tratados'], ['onu', 'ONU'], ['rep', 'Reputación']],
  mil: [['fue', 'Fuerzas'], ['bas', 'Bases'], ['gue', 'Guerras']],
  world: [['ran', 'Ranking'], ['not', 'Noticias']]
};
function panelHTML() {
  const p = UI.panel, t = PTABS[p] ? curTab(p, PTABS[p][0][0]) : '';
  return `<section class="panel glass"><header><h2>${ic(p)} ${PT[p]}</h2><button class="xbtn" data-a="closePanel" aria-label="Cerrar">${ic('x')}</button></header>
    ${PTABS[p] ? tabs(p, PTABS[p]) : ''}<div class="pbody scroll" data-sc="p-${p}-${t}">${PANELS[p](t)}</div></section>`;
}
const PANELS = {};
const tbl = (head, rows) => `<div class="tblw"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;

/* ---------- ECONOMÍA ---------- */
const INN = { imp: 'Impuestos', com: 'Tratados comerciales', mat: 'Exportación de materias primas', con: 'Contratos de suministro', div: 'Dividendos de bolsa', res: 'Fondos reservados' };
const EXN = { pub: 'Gasto público', ley: 'Programas de tus leyes', mil: 'Fuerzas armadas', imp: 'Importaciones', int: 'Intereses de la deuda' };
PANELS.eco = t => {
  const s = S(), c = CC(me()), f = Q.finance();
  if (t === 'pre') {
    const mx = Math.max(f.ti, f.te, 1), lines = (o, n, cls) => Object.keys(n).filter(k => o[k] > .005).map(k => `<div class="line"><span>${n[k]}</span>${bar(o[k], mx, cls)}<b class="num">${money(o[k])}</b></div>`).join('');
    const g = Q.growthOf(me());
    return `<div class="kvs big">${kv('Caja', money(c.tr))}${kv('Saldo por turno', `<span class="${f.net >= 0 ? 'up' : 'down'}">${f.net >= 0 ? '+' : '−'}${money(Math.abs(f.net)).slice(1)}</span>`)}${kv('PIB', money(c.gdp))}${kv('Crecimiento', `<span class="${g >= 0 ? 'up' : 'down'}">${sgn(g, 2)} pp/turno</span>`)}</div>
      ${c.tr < 0 ? `<p class="warn-box">Estás en deuda: pagas un 3% de interés por turno y, pasado el 12% del PIB, llegará una crisis de deuda.</p>` : ''}
      <div class="grid2"><div><h4>Ingresos <b class="up num">${money(f.ti)}</b></h4>${lines(f.inc, INN, 'green')}</div><div><h4>Gastos <b class="down num">${money(f.te)}</b></h4>${lines(f.exp, EXN, 'red')}</div></div>
      <div class="grid2"><div class="card"><small>Caja, últimos turnos</small>${spark(s.hist.tr, 220, 44) || '<p class="mut">Aún sin historial</p>'}</div><div class="card"><small>PIB, últimos turnos</small>${spark(s.hist.gdp, 220, 44) || '<p class="mut">Aún sin historial</p>'}</div></div>
      <p class="mut fine">Presión fiscal: ${(Q.taxRate() * 100).toFixed(1)}% del PIB. Se cambia con leyes de impuestos. Importes en miles de millones de $ (mM); B = billones.</p>`;
  }
  if (t === 'rec') {
    const fl2 = Q.resFlow();
    return `<div class="row wrap"><label class="check"><input type="checkbox" data-c="autoToggle" ${s.auto ? 'checked' : ''}> Exportar automáticamente el excedente sobre la reserva</label><label class="inl">Cantidad ${inp('ec:q', 5, 'type="number" min="1" class="w50"')}</label></div>
      ${tbl(['Recurso', 'Produce', 'Consume', 'Saldo', 'Reserva', 'Precio', '', ''], Object.keys(fl2).map(k => { const x = fl2[k], m = s.mkt.com[k], n = x.net; return `<tr><td><b>${D.COMMODITIES[k].n}</b></td><td class="num">${x.prod.toFixed(1)}</td><td class="num">${x.cons.toFixed(1)}</td><td class="num ${n >= 0 ? 'up' : 'down'}">${sgn(n, 1)}</td><td class="num">${Math.round(x.stock)}</td><td class="num">$${m.p.toFixed(2)}</td><td>${spark(m.h, 70, 22)}</td><td class="nowrap"><button class="btn sm" data-a="buyCom" data-k="${k}">Comprar</button> <button class="btn sm" data-a="sellCom" data-k="${k}">Vender</button></td></tr>`; }))}
      <p class="mut fine">Unidades por turno. Tu país consume petróleo, gas y grano; si faltan se importan solos (+8%). Las unidades militares gastan hierro, tierras raras, petróleo y uranio de la reserva.</p>`;
  }
  if (t === 'com') {
    const p = me(), ti = Q.tradeIncome(), mult = Math.max(.2, 1 + Q.mod('tradeInc') + Q.lawSum('trade'));
    const partners = Object.keys(s.c).filter(i => i !== p && CC(i).alive && Q.hasT('com', p, i) && !Q.atWar(p, i)).sort((a, b) => CC(b).gdp - CC(a).gdp);
    return `<div class="kvs big">${kv('Socios comerciales', ti.n)}${kv('Ingreso por comercio', money(ti.v) + ' /turno')}${kv('Contratos activos', s.contracts.length + ' de 8')}</div>
      <h4>Contratos de suministro</h4>${s.contracts.length ? s.contracts.map((x, i) => `<div class="arow"><div class="grow"><b>${fl(x.to)} ${cname(x.to)}</b><small>${x.q} u/turno de ${D.COMMODITIES[x.com].n.toLowerCase()} a $${x.p.toFixed(2)} · quedan ${x.left} turnos · ${money(x.q * x.p)}/turno</small></div><button class="btn sm red" data-a="cancelContract" data-i="${i}" data-confirm>Cancelar</button></div>`).join('') : '<p class="mut">Ninguno. Se firman desde las acciones diplomáticas de cada país.</p>'}
      <h4>Tratados comerciales</h4>${partners.length ? `<div class="chips">${partners.slice(0, 40).map(i => `<button class="chip ${Q.sanctioned(p, i) || Q.sanctioned(i, p) ? 'bad' : 'cyan'}" data-a="sel" data-iso="${i}">${flag(i)} ${cname(i)} · ${money(.0015 * Math.sqrt(c.gdp * CC(i).gdp) * mult)}</button>`).join('')}</div>` : '<p class="mut">Sin socios. Propón tratados comerciales a países con relación positiva.</p>'}
      <p class="mut fine">Cada tratado rinde según el tamaño de las dos economías y añade +0.03 pp de crecimiento (máx. +0.3). Las sanciones y las guerras lo cortan.</p>`;
  }
  const pv = Q.portValue();
  return `<div class="row wrap"><div class="kvs big grow">${kv('Cartera', money(pv))}${kv('Comisión', Q.fee() ? '1%' : '0%')}</div><label class="inl">Importe por orden (mM$) ${inp('ec:amt', Math.max(1, Math.round(c.gdp * .002)), 'type="number" min="0.1" step="0.1" class="w70"')}</label></div>
    ${tbl(['Empresa', 'Sector', 'Precio', 'Turno', '', 'Tu posición', ''], D.COMPANIES.map(co => { const m = s.mkt.co[co.id], h = m.h, ch = h.length > 1 ? (h[h.length - 1] / h[h.length - 2] - 1) * 100 : 0, pos = s.port[co.id], val = pos ? pos.q * m.p : 0, home = Q.ownerOf(co.home); return `<tr><td><b>${esc(co.n)}</b> <small class="mut">${flag(home)} ${co.y ? co.y + '% div.' : ''}</small></td><td><small>${D.STOCK_SECTORS[co.sec]}</small></td><td class="num">$${m.p >= 100 ? m.p.toFixed(0) : m.p.toFixed(2)}</td><td class="num ${ch >= 0 ? 'up' : 'down'}">${sgn(ch, 1)}%</td><td>${spark(h, 70, 22)}</td><td class="num">${pos ? `${money(val)} <small class="${val >= pos.c ? 'up' : 'down'}">${sgn((val / pos.c - 1) * 100, 0)}%</small>` : '—'}</td><td class="nowrap"><button class="btn sm" data-a="buyStock" data-id="${co.id}">Comprar</button>${pos ? ` <button class="btn sm" data-a="sellStock" data-id="${co.id}">Vender</button>` : ''}</td></tr>`; }))}
    <p class="mut fine">Precios simulados: reaccionan a guerras, sanciones, estabilidad del país de origen y eventos del mundo. No reflejan cotizaciones reales.</p>`;
};
H.autoToggle = (d, el) => act('setAuto', { on: el.checked });
H.buyCom = d => act('buyCom', { k: d.k, q: +fv('ec:q', 5) }); H.sellCom = d => act('sellCom', { k: d.k, q: +fv('ec:q', 5) });
H.buyStock = d => act('buyStock', { id: d.id, amt: +fv('ec:amt', Math.max(1, Math.round(CC(me()).gdp * .002))) }); H.sellStock = d => act('sellStock', { id: d.id, frac: 1 });
H.cancelContract = d => act('cancelContract', { i: +d.i });

/* ---------- POLÍTICA ---------- */
const PERN = { cost: v => [`${v > 0 ? 'Cuesta' : 'Ahorra'} ${Math.abs(v)}% del PIB al año`, -v], tax: v => [`Impuestos ${sgn(v, 1)} pp`, v], grow: v => [`Crecimiento ${sgn(v, 2)} pp/turno`, v], stab: v => [`Estabilidad ${sgn(v)}`, v], trade: v => [`Comercio ${sgn(v * 100)}%`, v], prodMul: v => [`Materias primas +${v * 100}%`, 1], mil: v => [`Fuerza militar +${v * 100}%`, 1], cap: v => [`Reclutamiento +${v * 100}%`, 1], oilSave: v => [`Consumo de petróleo −${v * 100}%`, 1], elect: v => [`Elecciones +${v} pts`, 1], scandal: () => ['Más escándalos salen a la luz', -1] };
const IDC = v => v <= -1.5 ? '#e0564a' : v <= -.5 ? '#f08f6e' : v < .5 ? '#d9c77a' : v < 1.5 ? '#6fb0f0' : '#3f72dc';
function hemi(cols, cls) { // hemiciclo de 100 escaños
  const rows = [[19, 40], [23, 52], [27, 64], [31, 76]], seats = [];
  rows.forEach(r => { for (let i = 0; i < r[0]; i++) { const a = Math.PI - (i + .5) / r[0] * Math.PI; seats.push({ a, x: 90 + Math.cos(a) * r[1], y: 86 - Math.sin(a) * r[1] }); } });
  seats.sort((p, q) => q.a - p.a);
  return `<svg class="hemi ${cls || ''}" viewBox="0 0 180 92">${seats.map((s, i) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="3.5" fill="${cols[i] || '#445'}" style="animation-delay:${i * 12}ms"/>`).join('')}</svg>`;
}
const seatCols = () => { const out = []; S().pol.seats.slice().sort((a, b) => a.ideo - b.ideo).forEach(p => { for (let i = 0; i < Math.round(p.s); i++) out.push(IDC(p.ideo)); }); while (out.length < 100) out.push(out[out.length - 1]); return out.slice(0, 100); };
PANELS.pol = t => {
  const s = S(), pol = s.pol, c = CC(me());
  if (t === 'ley') {
    const cat = fv('pl:cat', ''), canDecree = Q.mod('decree') || !Q.isDem();
    const list = D.LAWS.filter(l => !cat || (cat === 'on' ? pol.laws[l.id] != null : l.cat === cat));
    return `<div class="chips filt"><button class="chip ${!cat ? 'gold' : ''}" data-a="lawCat" data-c="">Todas</button><button class="chip ${cat === 'on' ? 'gold' : ''}" data-a="lawCat" data-c="on">Vigentes (${Object.keys(pol.laws).length})</button>${Object.keys(D.LAWCATS).map(k => `<button class="chip ${cat === k ? 'gold' : ''}" data-a="lawCat" data-c="${k}">${D.LAWCATS[k]}</button>`).join('')}</div>
      ${list.map(l => {
        const on = pol.laws[l.id] != null, cool = (pol.cool[l.id] || 0) - s.turn, f = Q.lawForecast(on ? Q.invLaw(l) : l), okV = f.yes > f.need;
        const rival = l.grp && D.LAWS.find(x => x.grp === l.grp && x.id !== l.id && pol.laws[x.id] != null);
        const chips = Object.keys(l.sec || {}).map(k => [D.SECTORS[k].n + ' ' + sgn(l.sec[k]), l.sec[k]]).concat(Object.keys(l.per || {}).map(k => PERN[k](l.per[k]))).concat(Object.keys(l.rep || {}).map(k => [Q.REPN[k] + ' ' + sgn(l.rep[k]), l.rep[k]])).concat(l.once ? Q.describeFx(l.once) : []);
        return `<article class="law ${on ? 'on' : ''}"><div class="row"><h3>${esc(l.n)}</h3><span class="chip">${D.LAWCATS[l.cat]}</span>${on ? '<span class="chip gold">Vigente</span>' : ''}${l.maj ? '<span class="chip">Exige 2/3</span>' : ''}</div>
          <p>${esc(l.d)}${rival ? ` <em class="mut">Sustituye a “${esc(rival.n)}”.</em>` : ''}</p><div class="chips">${fxChips(chips)}</div>
          <div class="fore"><small>${on ? 'Previsión para derogarla' : 'Previsión de voto'}: <b class="${okV ? 'up' : 'down'}">${Math.round(f.yes)} a favor</b> · necesitas más de ${Math.round(f.need)}</small><span class="bar ${okV ? 'green' : 'red'} need" style="--need:${f.need}%"><i style="width:${f.yes}%"></i></span></div>
          <div class="row wrap">${on ? `<button class="btn sm" data-a="repeal" data-id="${l.id}">Derogar · 2 CP</button>` : cool > 0 ? `<span class="mut">El congreso no la retoma hasta dentro de ${cool} turnos</span>` : `<button class="btn sm gold" data-a="law" data-id="${l.id}" data-m="normal">Proponer · 2 CP</button><button class="btn sm" data-a="law" data-id="${l.id}" data-m="lobby" title="+12% de apoyo en cada partido">Cabildear · 3 CP</button><button class="btn sm" data-a="law" data-id="${l.id}" data-m="bribe" title="+20% de apoyo. Puede destaparse." data-confirm>Comprar votos · ${money(Q.bribeCost())}</button>${canDecree ? `<button class="btn sm red" data-a="law" data-id="${l.id}" data-m="decree" data-confirm>Decreto · 3 CP</button>` : ''}`}</div></article>`;
      }).join('') || '<p class="mut">No hay leyes en esta categoría.</p>'}`;
  }
  if (t === 'con') {
    const gov = pol.seats.filter(p => p.g).reduce((a, p) => a + p.s, 0);
    return `${hemi(seatCols())}<p class="center mut">Tu coalición suma <b class="${gov > 50 ? 'up' : 'down'}">${Math.round(gov)} de 100 escaños</b>${Q.isDem() ? '' : ' · el congreso es poco más que un sello'}</p>
      ${pol.seats.map(p => `<div class="line"><span><i class="dot" style="background:${IDC(p.ideo)}"></i> ${esc(p.n)} ${p.g ? '<span class="chip gold">Gobierno</span>' : ''}</span>${bar(p.s, 100)}<b class="num">${Math.round(p.s)}</b></div>`).join('')}
      <p class="mut fine">Cada partido vota según la distancia ideológica con la ley, tu aprobación, lo popular que sea la medida y si está en tu coalición. Los colores van de izquierda (rojo) a derecha (azul).</p>`;
  }
  if (t === 'sec') return `<p class="mut">Tu aprobación (${pct(Q.approval())}) es la media ponderada de estos sectores. Cada uno tiende hacia su línea base, que mueven tus leyes.</p>
      ${Object.keys(pol.sec).map(k => { const x = pol.sec[k], b = Q.secBase(k); return `<div class="line sec"><span><b>${D.SECTORS[k].n}</b> <small class="mut">${Math.round(x.w * 100)}% del electorado</small></span><span class="bar ${x.a < 35 ? 'red' : x.a > 60 ? 'green' : ''} need" style="--need:${b}%"><i style="width:${x.a}%"></i></span><b class="num">${Math.round(x.a)}</b><small class="${b > x.a + 1 ? 'up' : b < x.a - 1 ? 'down' : 'mut'}">${b > x.a + 1 ? '▲' : b < x.a - 1 ? '▼' : '='} ${Math.round(b)}</small></div>`; }).join('')}
      <p class="mut fine">La marca vertical es la línea base. Por debajo de 36, obreros, jóvenes, religiosos o empresarios provocan huelgas, protestas o fuga de capitales; los militares, golpes.</p>`;
  if (t === 'reg') {
    const lc = Q.localCtl(), rul = D.SUB_RULING[me()];
    return `${lc != null ? `<p>Tu partido gobierna el <b>${pct(lc * 100)}</b> de tus regiones. Eso suma o resta votos en el congreso y en las elecciones.</p>` : '<p class="mut">Este país aún no tiene gobiernos regionales detallados (Fase 1: EE.UU., México, Brasil, Alemania, India, Rusia y China).</p>'}
      <div class="terrs">${c.terr.map(x => `<span class="terr ${x.o !== me() ? 'occ' : x.p && x.p === rul ? 'mine' : ''}">${esc(x.n)}${x.p ? ` <em>${esc(x.p)}</em>` : ''}${x.o !== me() ? ` <b>→ ${cname(x.o)}</b>` : ''}</span>`).join('')}</div>`;
  }
  if (!Q.isDem()) return `<p>En un régimen de tipo <b>${esc(D.REGIMES[c.reg].toLowerCase())}</b> no hay elecciones que perder. Tu riesgo es otro: con la estabilidad por debajo de 30 o los militares por debajo de 28, llegará el golpe.</p><div class="line"><span>Estabilidad</span>${bar(c.stab, 100, c.stab < 30 ? 'red' : 'green')}<b class="num">${Math.round(c.stab)}</b></div><div class="line"><span>Militares</span>${bar(pol.sec.mil.a, 100, pol.sec.mil.a < 28 ? 'red' : 'green')}<b class="num">${Math.round(pol.sec.mil.a)}</b></div>`;
  const ap = Q.approval(), lc = Q.localCtl(), fac = [['Aprobación', (ap - 50) * .9], ['Ventaja de gobernar', 2 + (c.reg === 'hib' ? 5 : 0)], ['Tus rasgos', Q.mod('elect')], ['Tus leyes', Q.lawSum('elect')], ['Campaña', pol.camp], ['Control regional', lc == null ? 0 : (lc - .5) * 4], ['Escándalo reciente', s.flags.scandal ? -4 : 0]].filter(x => Math.abs(x[1]) >= .05);
  const proj = Math.max(5, Math.min(95, 50 + fac.reduce((a, x) => a + x[1], 0))), left = pol.nextElec - s.turn;
  return `<div class="kvs big">${kv('Próxima elección', left > 0 ? `en ${left} turno${left > 1 ? 's' : ''}` : 'este turno')}${kv('Proyección de voto', `<span class="${proj >= 50 ? 'up' : 'down'}">${proj.toFixed(1)}%</span>`)}${kv('Margen de error', '± 4 pts')}</div>
    <span class="bar ${proj >= 50 ? 'green' : 'red'} need tall" style="--need:50%"><i style="width:${proj}%"></i></span>
    <h4>De dónde sale la proyección</h4>${fac.map(x => `<div class="line"><span>${x[0]}</span><b class="num ${x[1] >= 0 ? 'up' : 'down'}">${sgn(x[1], 1)} pts</b></div>`).join('')}
    <p class="mut fine">Si sacas menos del 50% pierdes el poder y termina la partida. Dos turnos antes de votar eliges cómo hacer campaña.</p>`;
};
H.lawCat = d => { UI.form['pl:cat'] = d.c; UI.render(); };
H.law = d => act('proposeLaw', { id: d.id, mode: d.m }); H.repeal = d => act('repealLaw', { id: d.id });

/* ---------- DIPLOMACIA ---------- */
PANELS.dip = t => {
  const s = S(), p = me();
  if (t === 'rel') {
    const q = fv('dp:q', '').trim().toLowerCase(), so = fv('dp:s', 'rd');
    let list = Object.keys(s.c).filter(i => i !== p && CC(i).alive && (!q || CC(i).n.toLowerCase().includes(q))).map(i => [i, Q.rel(p, i)]);
    list.sort(so === 'rd' ? (a, b) => b[1] - a[1] : so === 'ra' ? (a, b) => a[1] - b[1] : so === 'pw' ? (a, b) => Q.power(b[0]) - Q.power(a[0]) : (a, b) => CC(b[0]).gdp - CC(a[0]).gdp);
    return `<div class="row wrap"><div class="searchbox grow">${ic('search')}${inp('dp:q', '', 'placeholder="Buscar país…" autocomplete="off"')}</div>${sel('dp:s', [['rd', 'Más amigos primero'], ['ra', 'Más hostiles primero'], ['pw', 'Por fuerza militar'], ['gd', 'Por PIB']], 'rd')}</div>
      <div class="list">${list.slice(0, 90).map(x => `<button class="li" data-a="sel" data-iso="${x[0]}">${fl(x[0])}<span class="grow">${cname(x[0])}</span>${relBar(x[1])}<b class="num ${relCls(x[1])}">${sgn(x[1])}</b></button>`).join('') || '<p class="mut pad">Ningún país coincide.</p>'}</div>`;
  }
  if (t === 'tra') {
    const c = CC(p), tr = s.tr.filter(x => x.a === p || x.b === p), other = x => x.a === p ? x.b : x.a;
    const grp = k => { const l = tr.filter(x => x.t === k); return l.length ? `<h4>${Q.TNAME[k]} (${l.length})</h4><div class="chips">${l.map(x => `<button class="chip ${k === 'com' ? 'cyan' : 'good'}" data-a="sel" data-iso="${other(x)}">${flag(other(x))} ${cname(other(x))}</button>`).join('')}</div>` : ''; };
    const myS = s.sanc.filter(x => x.by === p), onMe = s.sanc.filter(x => x.on === p), bases = s.bases.filter(b => b.by === p);
    return `<h4>Bloques</h4><div class="chips">${c.blocs.map(b => `<span class="chip cyan">${D.BLOCS[b].n}${D.BLOCS[b].def ? ' · defensa mutua' : D.BLOCS[b].com ? ' · libre comercio' : ''}</span>`).join('') || '<span class="mut">No perteneces a ningún bloque</span>'}</div>
      ${['def', 'ali', 'pna', 'com'].map(grp).join('') || '<p class="mut">No has firmado tratados bilaterales todavía.</p>'}
      <h4>Sanciones</h4><div class="chips">${myS.map(x => `<button class="chip bad" data-a="sel" data-iso="${x.on}">Sancionas a ${cname(x.on)}</button>`).join('')}${onMe.map(x => `<button class="chip bad" data-a="sel" data-iso="${x.by}">${cname(x.by)} te sanciona</button>`).join('')}${!myS.length && !onMe.length ? '<span class="mut">Ninguna</span>' : ''}</div>
      <h4>Bases en el extranjero</h4><div class="chips">${bases.map(b => `<button class="chip gold" data-a="sel" data-iso="${b.in}">${flag(b.in)} ${cname(b.in)}</button>`).join('') || '<span class="mut">Ninguna</span>'}</div>`;
  }
  if (t === 'onu') {
    const left = 4 - s.turn % 4, L = s.un.last, ty = fv('un:t', 'condena'), needsT = ['condena', 'sanc', 'ayuda'].includes(ty);
    const cs = Object.keys(s.c).filter(i => i !== p && CC(i).alive).sort((a, b) => CC(a).n.localeCompare(CC(b).n)).map(i => [i, CC(i).n]);
    const ws = s.wars.map(w => [w.id, `${CC(w.att[0]).n} contra ${CC(w.def[0]).n}`]);
    return `<div class="kvs big">${kv('Próxima asamblea', `en ${left} turno${left > 1 ? 's' : ''}`)}${kv('En la agenda', s.un.queue ? Q.UNT[s.un.queue.type] + ' (tuya)' : 'La decide la asamblea')}</div>
      ${L ? `<div class="card"><small>Última votación</small><h3>${Q.UNT[L.r.type]}${L.r.target ? ' · ' + cname(L.r.target) : ''} <span class="chip ${L.pass ? 'good' : 'bad'}">${L.pass ? 'Aprobada' : 'Rechazada'}</span></h3><div class="tally"><i class="y" style="flex:${L.yes}"></i><i class="a" style="flex:${L.abs}"></i><i class="n" style="flex:${L.no}"></i></div><small class="mut">${L.yes} a favor · ${L.abs} abstenciones · ${L.no} en contra · tú: ${L.mine > 0 ? 'a favor' : L.mine < 0 ? 'en contra' : 'abstención'}</small></div>` : ''}
      <h4>Proponer una resolución · 3 CP</h4><div class="row wrap">${sel('un:t', Object.entries(Q.UNT), 'condena')}${needsT ? sel('un:x', cs, cs[0] && cs[0][0]) : ''}${ty === 'cese' ? (ws.length ? sel('un:w', ws, ws[0][0]) : '<span class="mut">No hay guerras en curso</span>') : ''}<button class="btn gold" data-a="unPropose">Llevar a la asamblea</button></div>
      <p class="mut fine">Cada país vota según su relación con el afectado, su régimen y sus intereses; los amigos del que propone lo acompañan. Tu voto queda registrado: el condenado y sus rivales lo recordarán.</p>`;
  }
  const AX = { paz: ['Belicista', 'Pacífico', 'Los países pacíficos confían en ti; los agresivos te respetan menos.'], conf: ['Traidor', 'Confiable', 'Decide si aceptan tus tratados. Romper pactos lo hunde.'], dem: ['Autoritario', 'Demócrata', 'Las democracias te quieren arriba; las autocracias, abajo.'], gen: ['Egoísta', 'Generoso', 'Sube con ayuda y acogida; un poco de buena voluntad de todos.'] };
  return `<div class="center"><p class="eyebrow">El mundo te conoce como</p><h2 class="gold-t">${esc(Q.repTitle())}</h2></div>
    ${Object.keys(AX).map(k => { const v = s.rep[k]; return `<div class="repax"><div class="row"><small>${AX[k][0]}</small><b class="num ${v >= 0 ? 'up' : 'down'}">${sgn(v)}</b><small>${AX[k][1]}</small></div>${relBar(v)}<small class="mut">${AX[k][2]}</small></div>`; }).join('')}
    <p class="mut fine">La reputación se erosiona despacio hacia cero: hay que mantenerla con hechos. Modifica la relación con los 196 países según la personalidad de cada líder.</p>`;
};
H.unPropose = () => { const s = S(), cs = Object.keys(s.c).filter(i => i !== me() && CC(i).alive).sort((a, b) => CC(a).n.localeCompare(CC(b).n)); act('unPropose', { type: fv('un:t', 'condena'), target: fv('un:x', cs[0]), war: fv('un:w', s.wars[0] && s.wars[0].id) }); };
H['in:dp'] = () => { clearTimeout(UI.dpT); UI.dpT = setTimeout(UI.render, 180); }; H['in:un'] = () => UI.render();

/* ---------- EJÉRCITO ---------- */
function warCard(w) {
  const p = me(), mine = w.att.includes(p) || w.def.includes(p), sc = w.att.includes(p) ? w.score : w.def.includes(p) ? -w.score : w.score, lead = w.att[0] === p || w.def[0] === p;
  const side = l => l.map(x => `<button class="chip" data-a="sel" data-iso="${x}">${flag(x)} ${cname(x)}</button>`).join('');
  const occ = x => Object.keys(S().c).reduce((a, z) => a + (z !== x ? CC(z).terr.filter(t => t.o === x).length : 0), 0);
  return `<article class="card war"><div class="row"><h3>${cname(w.att[0])} contra ${cname(w.def[0])}</h3><small class="mut">${S().turn - w.s} turnos</small></div>
    <div class="row top"><div class="grow"><small>Atacan · ocupan ${occ(w.att[0])}</small><div class="chips">${side(w.att)}</div></div><div class="grow"><small>Defienden · ocupan ${occ(w.def[0])}</small><div class="chips">${side(w.def)}</div></div></div>
    ${relBar(sc)}<small class="mut">${mine ? (sc >= 0 ? 'Vas ganando' : 'Vas perdiendo') : (sc >= 0 ? 'Gana el atacante' : 'Gana el defensor')} (${sgn(sc)})</small>
    ${mine ? `<div class="row wrap">${lead ? `<button class="btn sm" data-a="peace2" data-w="${w.id}" data-k="blanca">Paz blanca · 1 CP</button><button class="btn sm" data-a="peace2" data-w="${w.id}" data-k="actual">Paz con lo ocupado · 1 CP</button><button class="btn sm red" data-a="peace2" data-w="${w.id}" data-k="rendicion" data-confirm>Rendirte</button>` : `<button class="btn sm red" data-a="peace2" data-w="${w.id}" data-k="blanca" data-confirm>Retirarte de la guerra</button>`}</div>` : ''}</article>`;
}
PANELS.mil = t => {
  const s = S(), p = me(), c = CC(p);
  if (t === 'fue') {
    const rank = Object.keys(s.c).filter(i => CC(i).alive).sort((a, b) => Q.power(b) - Q.power(a)).indexOf(p) + 1;
    return `<div class="kvs big">${kv('Fuerza total', Math.round(Q.power(p)))}${kv('Puesto mundial', '#' + rank)}${kv('Tropas', num(Q.troops(p)))}${kv('Mantenimiento', money(Q.upkeep(p)) + ' /turno')}</div>
      ${s.flags.oilShort ? '<p class="warn-box">Sin petróleo ni crédito para importarlo: tus fuerzas rinden un 25% menos.</p>' : ''}
      ${Object.keys(D.CATS).map(cat => { const cap = Q.capacity(cat); return `<h4>${D.CATS[cat]} <small class="mut">puedes formar ${Math.max(0, cap)} unidades más este turno</small></h4>${tbl(['Unidad', 'Tienes', 'Fuerza', 'Costo', 'Mant.', 'Requiere', ''], Object.keys(D.UNITS).filter(k => D.UNITS[k].cat === cat).map(k => { const u = D.UNITS[k]; return `<tr><td><b>${u.n}</b></td><td class="num">${c.u[k] || 0}</td><td class="num">${u.pow}</td><td class="num">${money(Q.unitCost(k))}</td><td class="num">${money(u.up * Q.costLvl(p))}</td><td><small>${Object.keys(u.res).map(r => `${u.res[r]} ${D.COMMODITIES[r].n.toLowerCase()}`).join(', ') || '—'}</small></td><td class="nowrap"><button class="btn sm" data-a="recruit" data-k="${k}" data-n="1" ${cap < 1 ? 'disabled' : ''}>+1</button> <button class="btn sm" data-a="recruit" data-k="${k}" data-n="5" ${cap < 5 ? 'disabled' : ''}>+5</button> <button class="btn sm ghost" data-a="disband" data-k="${k}" ${c.u[k] ? '' : 'disabled'}>−1</button></td></tr>`; }))}`; }).join('')}`;
  }
  if (t === 'bas') {
    const fb = s.bases.filter(b => b.by === p);
    return `<div class="grid3">${Object.keys(D.BASES).map(k => { const b = D.BASES[k]; return `<div class="card"><h3>${b.n}</h3><div class="kvs">${kv('Tienes', c.bases[k] || 0)}${kv('Forma', `${b.cap} u/turno`)}</div><small class="mut">Unidades de ${D.CATS[b.cat].toLowerCase()} · mantenimiento ${money(b.up * Q.costLvl(p))}</small><button class="btn gold" data-a="buildBase" data-k="${k}">Construir · ${money(Q.baseCost(k))}</button></div>`; }).join('')}</div>
      <h4>Bases en el extranjero</h4><div class="chips">${fb.map(b => `<button class="chip gold" data-a="sel" data-iso="${b.in}">${flag(b.in)} ${cname(b.in)} · alcance en ${esc(D.REGIONS[D.C[b.in].region])}</button>`).join('') || '<span class="mut">Ninguna. Pídelas desde las acciones diplomáticas de un aliado.</span>'}</div>
      <p class="mut fine">Solo puedes atacar a quien alcanzas: vecinos, países costeros si tu armada es suficiente, o regiones donde tengas una base.</p>`;
  }
  const mine = Q.warsOf(p), rest = s.wars.filter(w => !mine.includes(w));
  return `<h4>Tus guerras</h4>${mine.map(warCard).join('') || '<p class="mut">Estás en paz. Las guerras se declaran desde las acciones diplomáticas de cada país.</p>'}
    <h4>Otras guerras en el mundo</h4>${rest.map(warCard).join('') || '<p class="mut">No hay otras guerras en curso.</p>'}`;
};
H.recruit = d => act('recruit', { k: d.k, n: +d.n }); H.disband = d => act('disband', { k: d.k, n: 1 }); H.buildBase = d => act('buildBase', { k: d.k });
H.peace2 = d => act('peace', { w: +d.w, kind: d.k });

/* ---------- MUNDO ---------- */
PANELS.world = t => {
  const s = S(), p = me();
  if (t === 'ran') {
    const al = Object.keys(s.c).filter(i => CC(i).alive), top = (f, fmtv) => { const l = al.slice().sort((a, b) => f(b) - f(a)), r = l.indexOf(p); return l.slice(0, 12).concat(r >= 12 ? [p] : []).map(i => `<button class="li ${i === p ? 'on' : ''}" data-a="sel" data-iso="${i}"><small class="num mut">${l.indexOf(i) + 1}</small>${fl(i)}<span class="grow">${cname(i)}</span><b class="num">${fmtv(f(i))}</b></button>`).join(''); };
    return `<div class="grid2"><div><h4>Fuerza militar</h4><div class="list">${top(i => Q.power(i), v => Math.round(v))}</div></div><div><h4>Economía</h4><div class="list">${top(i => CC(i).gdp, money)}</div></div></div>
      <p class="mut fine">${al.length} Estados soberanos · ${s.wars.length} guerra${s.wars.length === 1 ? '' : 's'} en curso · ${s.sanc.length} regímenes de sanciones.</p>`;
  }
  let last = -1;
  return `<div class="newslog">${s.news.slice(-80).reverse().map(n => { const hd = n.t !== last ? `<h4>Turno ${n.t + 1}</h4>` : ''; last = n.t; return hd + `<${n.i ? 'button data-a="sel" data-iso="' + n.i + '"' : 'div'} class="nrow p${n.p}">${ic(NEWS_IC[n.k] || 'world')}<span>${esc(n.x)}</span></${n.i ? 'button' : 'div'}>`; }).join('')}</div>`;
};

/* ---------- EDITOR (modo dios) ---------- */
PANELS.edit = () => {
  const s = S(), p = me(), iso = s.c[fv('ed:iso', '')] ? fv('ed:iso') : (UI.sel || p), c = CC(iso), mine = iso === p;
  const cs = Object.keys(s.c).sort((a, b) => CC(a).n.localeCompare(CC(b).n)).map(i => [i, CC(i).n + (CC(i).alive ? '' : ' (anexado)')]);
  const N = (label, k, v, attrs) => `<label>${label}<input data-c="edSet" data-k="${k}" value="${esc(v)}" ${attrs || 'type="number" step="any"'}></label>`;
  const o = s.c[fv('ed:o', '')] ? fv('ed:o') : p;
  return `<p class="mut">Cambia cualquier dato al instante. Los cambios se aplican al salir de cada campo.</p>
    <label>País ${sel('ed:iso', cs, iso)}</label>
    <h4>Identidad</h4><div class="grid2">${N('Nombre del país', 'n', c.n, 'type="text" maxlength="40"')}${N('Líder', 'lider', c.lider.n, 'type="text" maxlength="60"')}${N('Partido', 'partido', c.partido, 'type="text" maxlength="60"')}${N('Retrato (URL)', 'img', c.lider.img || '', 'type="text" placeholder="https://…"')}
      <label>Régimen<select data-c="edSet" data-k="reg">${Object.keys(D.REGIMES).map(k => `<option value="${k}" ${c.reg === k ? 'selected' : ''}>${D.REGIMES[k]}</option>`).join('')}</select></label>
      <label>Ideología<select data-c="edSet" data-k="ideo">${[-2, -1, 0, 1, 2].map(k => `<option value="${k}" ${c.ideo === k ? 'selected' : ''}>${D.IDEO[k]}</option>`).join('')}</select></label></div>
    <label class="check"><input type="checkbox" data-c="edSet" data-k="verificado" ${c.lider.verificado ? 'checked' : ''}> Líder verificado por mí</label>
    <h4>Números</h4><div class="grid3">${N('Caja (mM$)', 'tr', +c.tr.toFixed(1))}${N('PIB (mM$)', 'gdp', +c.gdp.toFixed(1))}${N('Población (M)', 'pop', +c.pop.toFixed(3))}${N('Estabilidad', 'stab', Math.round(c.stab), 'type="number" min="0" max="100"')}${mine ? N('Capital político', 'cp', s.pol.cp, 'type="number" min="0" max="12"') : N('Relación contigo', 'rel', Q.rel(p, iso), 'type="number" min="-100" max="100"')}</div>
    <h4>Tropas por categoría</h4>${Object.keys(D.CATS).map(cat => `<div class="row wrap edcat"><b>${D.CATS[cat]}</b><button class="btn sm" data-a="edCat" data-k="${cat}" data-v="2">×2</button><button class="btn sm" data-a="edCat" data-k="${cat}" data-v="0.5">÷2</button>${Object.keys(D.UNITS).filter(k => D.UNITS[k].cat === cat).map(k => N(D.UNITS[k].n, 'u.' + k, c.u[k] || 0, 'type="number" min="0" class="w70"')).join('')}</div>`).join('')}
    <h4>Recursos naturales (nivel 0-5)</h4><div class="grid3">${Object.keys(D.COMMODITIES).map(k => N(D.COMMODITIES[k].n, 'rec.' + k, c.rec[k] || 0, 'type="number" min="0" max="5"')).join('')}</div>
    ${mine ? `<h4>Reservas de materias primas</h4><div class="grid3">${Object.keys(D.COMMODITIES).map(k => N(D.COMMODITIES[k].n, 'stock.' + k, Math.round(c.stock[k] || 0), 'type="number" min="0"')).join('')}</div>
      <h4>Reputación mundial (−100 a 100)</h4><div class="grid2">${Object.keys(s.rep).map(k => N(Q.REPN[k], 'rep.' + k, Math.round(s.rep[k]), 'type="number" min="-100" max="100"')).join('')}</div>
      <h4>Afinidad de los sectores (0-100)</h4><div class="grid3">${Object.keys(s.pol.sec).map(k => N(D.SECTORS[k].n, 'sec.' + k, Math.round(s.pol.sec[k].a), 'type="number" min="0" max="100"')).join('')}</div>` : ''}
    <h4>Aliados y enemigos</h4><div class="row wrap"><span>Entre ${cname(iso)} y</span>${sel('ed:o', cs.filter(x => x[0] !== iso), o === iso ? cs[0][0] : o)}<button class="btn sm" data-a="edRel" data-k="ally">${Q.hasExplicit('ali', iso, o) ? 'Quitar alianza' : 'Hacer aliados'}</button><button class="btn sm" data-a="edRel" data-k="enemy">Alternar enemistad</button><button class="btn sm" data-a="edRel" data-k="peace">Terminar sus guerras</button></div>
    <p class="mut fine">Actual: relación ${sgn(Q.rel(iso, o === iso ? p : o))} · ${Q.alliesOf(iso).includes(o) ? 'aliados' : 'sin alianza'} · ${Q.atWar(iso, o) ? 'en guerra' : 'en paz'}.</p>`;
};
const edIso = () => S().c[fv('ed:iso', '')] ? fv('ed:iso') : (UI.sel || me());
H.edSet = (d, el) => { act('edit', { iso: edIso(), k: d.k, v: el.type === 'checkbox' ? el.checked : el.value }); refreshMap(); };
H.edCat = d => { act('edit', { iso: edIso(), k: 'cat.' + d.k, v: d.v }); };
H.edRel = d => { const o = S().c[fv('ed:o', '')] ? fv('ed:o') : me(); act('edit', { iso: edIso(), k: d.k, o }); refreshMap(); };
H['in:ed'] = () => UI.render();

/* ---------- PARTIDA: guardar, exportar, importar ---------- */
PANELS.sys = () => {
  const s = S();
  return `<div class="kvs big">${kv('Semilla del mundo', s.seed)}${kv('Turno', s.turn + 1)}${kv('Fecha', esc(Q.dateStr()))}</div>
    <p class="mut">La partida se guarda sola en este navegador al final de cada turno. Para llevártela a otro dispositivo, expórtala como JSON.</p>
    <div class="row wrap"><button class="btn gold" data-a="saveNow">Guardar ahora</button><button class="btn" data-a="exportOpen">Exportar JSON</button><button class="btn" data-a="importOpen">Importar JSON</button><button class="btn ghost" data-a="tut" data-i="0">Ver tutorial</button><button class="btn red" data-a="quit" data-confirm>Salir al menú</button></div>
    <h4>Sobre los datos</h4><p class="mut fine">PIB, población y ejércitos son aproximaciones redondeadas. Los líderes y partidos reflejan el conocimiento del modelo que escribió este juego y pueden estar desactualizados: todos nacen como “sin verificar” y se corrigen en el Editor. Las cotizaciones de empresas son simuladas.</p>`;
};
H.saveNow = () => { try { localStorage.setItem('wl_save', G.save()); toast('Partida guardada en este navegador'); } catch (e) { toast('Este navegador bloquea el guardado local: usa Exportar JSON', false); } };
H.exportOpen = () => { openModal(`<h2>Exportar partida</h2><p class="mut">Copia este texto y guárdalo en un archivo .json. Dentro del visor de Claude las descargas están bloqueadas; el botón Descargar funciona al abrir el HTML en tu navegador.</p><textarea id="expTxt" readonly rows="8">${esc(G.save())}</textarea><div class="row end"><button class="btn" data-a="expDl">Descargar .json</button><button class="btn gold" data-a="expCopy">Copiar</button></div>`, true); };
H.expCopy = () => { const t = $('#expTxt'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Partida copiada al portapapeles'), () => toast('No se pudo copiar solo: el texto queda seleccionado, cópialo a mano', false)); };
H.expDl = () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([G.save()], { type: 'application/json' })); a.download = `world-leader-turno-${S().turn + 1}.json`; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { toast('La descarga está bloqueada aquí: usa Copiar', false); } };
H.importOpen = () => { openModal(`<h2>Importar partida</h2><p class="mut">Pega el JSON exportado o elige el archivo.</p><textarea id="impTxt" rows="8" placeholder='{"v":1, …}'></textarea><div class="row end"><input type="file" id="impFile" accept=".json,application/json" data-c="impFile"><button class="btn gold" data-a="impGo">Cargar</button></div>`, true); };
H.impFile = (d, el) => { const f = el.files && el.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $('#impTxt').value = r.result; }; r.readAsText(f); };
H.impGo = () => { const r = G.load($('#impTxt').value.trim()); toast(r.msg, r.ok); if (r.ok) enterGame(false); };
H.quit = () => { autosave(); UI.screen = 'start'; UI.panel = null; UI.sel = null; Globe.spin = true; Globe.select([]); Globe.setRoutes([]); Globe.setWars([]); UI.routeKey = UI.frontKey = ''; Globe.home(); UI.render(); };

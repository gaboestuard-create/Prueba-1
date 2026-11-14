/* =====================================================================
   INTERFAZ · FASE 3: Sala de guerra (frente, grupos, órdenes), Logística,
   Disuasión, agencia de inteligencia, parte de batalla animado, frentes
   en el globo, editor de guerra y atajos. Todo se lee de un vistazo.
   ===================================================================== */
Object.assign(GI, {
  aa: 'M2 15h20l-1.5 4h-17zM6 11h9v3H6zM9 10.5l9-6 1 1.5-9 6zM12 12.2l8-5 1 1.5-8 5z' + ring(6, 19.5, 1.3) + ring(12, 19.5, 1.3) + ring(18, 19.5, 1.3),
  esp: 'M7 7.5c0-2 2.5-3.5 5.5-3.5S18 5 18 6.5V9H7zM8 10h8v1.5a4 4 0 01-8 0zM4 22c0-4 3-6 8-6s8 2 8 6zM18.5 13l3-3 .9.9-3 3z',
  abm: 'M4 20h16v2H4zM11 13h2v7h-2zM3 4c4 0 9 4 9 9-5 0-9-5-9-9zM14 3a7 7 0 017 7h-2a5 5 0 00-5-5zM14 6.5a3.5 3.5 0 013.5 3.5h-2a1.5 1.5 0 00-1.5-1.5z',
  tra: 'M12 2c.9 0 1.5 1.5 1.5 3.5V9l9 4v2.5l-9-2V18l2.5 2v1.5l-4-1-4 1V20l2.5-2v-4.5l-9 2V13l9-4V5.5C10.5 3.5 11.1 2 12 2z',
  des: 'M1 14h22l-3.5 6h-15zM6 10h10v3H6zM9 6h3v3.5H9zM14.5 7.5h1.2v2.5h-1.2zM16.5 11.5h5v1.3h-5zM2 12h3v1.3H2z',
  anf: 'M2 13h17l3 2-2.5 5H5zM5 9h8v3.5H5zM15 9.5l4.5 3h-4.5z',
  mon2: 'M1.5 20.5L9 6.5l4.2 7 2.8-4 6.5 11z', ciu2: 'M2 21V11h4V6h5v15h2V9h4v4h5v8zM4 13h1.4v1.4H4zM7.5 8h1.4v1.4H7.5zM15 11h1.4v1.4H15z',
  des2: 'M1 19c3-3 6-3 9-1 3-4 8-5 13-2v4H1z' + ring(17, 7, 3), sol: ring(12, 12, 4.5) + 'M11 1h2v3.5h-2zM11 19.5h2V23h-2zM1 11h3.5v2H1zM19.5 11H23v2h-3.5z',
  nieve: 'M11 2h2v20h-2zM2 11h20v2H2zM4.2 5.6l1.4-1.4 14.2 14.2-1.4 1.4zM18.4 4.2l1.4 1.4L5.6 19.8l-1.4-1.4z', lluvia: 'M6.5 14a4.5 4.5 0 01-.6-9A6 6 0 0117.5 6 4 4 0 0117.5 14zM7 16l-1.5 4h1.6L8.6 16zM11.5 16L10 20h1.6l1.5-4zM16 16l-1.5 4h1.6l1.5-4z',
  estrella: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z'
});
const TER_IC = { lla: 'tri', mon: 'mon2', sel: 'hoja', des: 'des2', ciu: 'ciu2', cos: 'naval' }, WX_IC = { norm: 'sol', inv: 'nieve', llu: 'lluvia', cal: 'sol' };
const ORD_IC = { atk: 'ofensiva', adv: 'ofensiva', def: 'seg', ret: 'puerta', blq: 'naval', bmb: 'bomb', lnd: 'anf', pat: 'ojo' };
const ROLE_IC = { inf: 'inf', arm: 'tan', art: 'art', aa: 'aa', sf: 'esp', fig: 'caz', bmb: 'bom', dro: 'dro', esc: 'des', sub: 'sub', car: 'por', anf: 'anf' };
Object.assign(EXN, { frente: 'Operaciones en el frente', alerta: 'Nivel de alerta', fort: 'Fortificaciones', spy: 'Agencia de inteligencia' });
Object.assign(MODN, { w_arm: v => `Blindados +${Math.round(v * 100)}%`, w_inf: v => `Infantería +${Math.round(v * 100)}%`, w_sf: v => `Fuerzas especiales +${Math.round(v * 100)}%`, w_art: v => `Artillería +${Math.round(v * 100)}%`, w_def: v => `Defensa +${Math.round(v * 100)}%`, w_air: v => `Aviación +${Math.round(v * 100)}%`, w_nav: v => `Armada +${Math.round(v * 100)}%`, w_sup: v => `Suministro +${Math.round(v * 100)}%` });
const uStrip = u => Object.keys(u).filter(k => u[k] > 0 && D.UNITS[k]).map(k => `<span title="${D.UNITS[k].n}">${gi(k)}${num(u[k])}</span>`).join('') || '<span class="mut">sin unidades</span>';
const supWord = v => v > .35 ? ['Dominas', 'good'] : v > .1 ? ['Ventaja', 'good'] : v < -.35 ? ['Lo domina el enemigo', 'bad'] : v < -.1 ? ['Desventaja', 'bad'] : ['Disputado', ''];
const stars = x => `<span class="stars" title="Experiencia ${Math.round(x * 100)}%">${[1, 2, 3].map(i => gi('estrella', x >= i / 3 - .01 ? 'on' : '')).join('')}</span>`;
const rName = k => { const st = Q.rSt(k); return st ? st.n : '—'; };
const terChip = k => { const t = Q.terOf(k), x = Q.wxOf(k); return `<span class="chip">${gi(TER_IC[t])} ${D.TER[t].n}</span><span class="chip">${gi(WX_IC[x])} ${D.WX[x].n}</span>`; };

/* ---------- pestañas del Ejército ---------- */
PTABS.mil.unshift(['tea', 'Sala de guerra']); PTABS.mil.push(['log', 'Logística'], ['est', 'Disuasión']);
{ const m0 = PANELS.mil; PANELS.mil = t => t === 'tea' ? warRoomHTML() : t === 'log' ? logHTML() : t === 'est' ? deterHTML() : t === 'gue' ? m0(t).replace(/<\/article>/g, '<button class="btn sm gold wr-open" data-a="warRoom">Abrir la sala de guerra</button></article>') : m0(t); }
H.warRoom = () => { UI.tab.mil = 'tea'; UI.panel = 'mil'; UI.render(); const w = Q.warsOf(me())[0]; if (w) Globe.focus(w.att[0] === me() ? w.def[0] : w.att[0], 2.2); };

function triangleHTML() {
  const rows = ['arm', 'inf', 'sf', 'art', 'aa', 'fig', 'bmb', 'esc', 'sub', 'car'];
  return `<details class="card tri"><summary>${gi('estrella')} Triángulo táctico: qué vence a qué</summary><div class="tri-g">${rows.map(r => `<div class="tri-r"><span>${gi(ROLE_IC[r])} ${D.ROLEN[r]}</span><b>›</b><span>${(D.BEATS[r] || []).map(x => `${gi(ROLE_IC[x] || 'inf')} ${D.ROLEN[x]}`).join(' · ')}</span></div>`).join('')}</div>
    <p class="mut fine">Cada unidad pega un 35% más contra lo que vence y un 25% menos contra lo que la vence. El terreno, el clima, la moral, la experiencia, el suministro y el dominio del aire multiplican el resultado.</p></details>`;
}
function peaceRoom() { const W = S().war3, s = S();
  return `<div class="card wr-peace"><h3>${gi('paz')} Estás en paz</h3><p>Alerta actual: <b>${D.ALERT[W.alert].n}</b>. Si estalla una guerra, tu Estado Mayor despliega automáticamente ejércitos, escuadrones y flotas; podrás tomar el mando cuando quieras.</p>
    <div class="row wrap"><button class="btn sm" data-a="milTab" data-t="est">Disuasión y alerta</button><button class="btn sm" data-a="milTab" data-t="log">Logística</button></div></div>
    <h4>${gi('tan')} Guerras en el mundo (${s.wars.length})</h4>${s.wars.map(w => `<div class="arow"><div class="grow"><b>${fl(w.att[0])} ${cname(w.att[0])} contra ${fl(w.def[0])} ${cname(w.def[0])}</b><small>${S().turn - w.s} turnos · ${Math.abs(w.score) < 15 ? 'frente estancado' : (w.score > 0 ? cname(w.att[0]) : cname(w.def[0])) + ' va ganando'}${(w.cf || 0) > S().turn ? ' · alto el fuego' : ''}</small></div><div class="tug sm"><i style="width:${50 + w.score / 2}%"></i></div></div>`).join('') || '<p class="mut">Ninguna. Un mundo raro.</p>'}
    ${triangleHTML()}`; }
H.milTab = d => { UI.tab.mil = d.t; UI.render(); };
function warRoomHTML() { const L = Q.warsOf(me()); if (!L.length) return peaceRoom(); return L.map(warPanel).join('') + triangleHTML(); }
function warPanel(w) {
  const s = S(), p = me(), side = Q.thSide(w, p), foeS = Q.thOther(side), lead = w[side][0], foe = w[foeS][0], sc = side === 'att' ? w.score : -w.score, W = s.war3, auto = W.auto[w.id] !== false, isLead = lead === p;
  const R = Q.thRegs(w), won = R.filter(k => Q.rpk(k)[0] === foe && Q.ctlSide(w, k) === side).length, lost = R.filter(k => Q.rpk(k)[0] === lead && Q.ctlSide(w, k) === foeS).length;
  const G = Q.grpOf(p, w.id), foeG = s.army.filter(g => g.w === w.id && Q.thSide(w, g.o) === foeS), avg = f => G.length ? Math.round(G.reduce((a, g) => a + g[f], 0) / G.length) : '—';
  const as = supWord(Q.airSup(w, side)), ns = supWord(Q.navSup(w, side)), cf = (w.cf || 0) > s.turn, tg = Q.thFront(w, side, 5), th = Q.thFront(w, foeS, 4);
  const est = (o, n) => Q.knows(o) ? num(n) : '≈' + num(Math.round(n * Q.fogK(o, 'n')));
  const regCard = (k, kind) => { const st = Q.rSt(k), own = st.o, here = s.army.filter(g => g.w === w.id && g.at === k && g.t === 'ej'), atk = s.army.filter(g => g.w === w.id && g.tgt === k && ['atk', 'adv', 'lnd'].includes(g.ord));
    const defN = here.reduce((a, g) => a + Q.gsize(g), 0) + Object.values(Q.garrison(own, k)).reduce((a, v) => a + v, 0);
    return `<div class="reg ${kind}"><div class="row"><b>${fl(own)} ${esc(st.n)}</b>${st.fort ? `<span class="chip gold" title="Fortificaciones">${gi('cuartel')} ${st.fort}</span>` : ''}</div><div class="chips">${terChip(k)}</div>
      <small>${kind === 'tg' ? `Defensores: ${defN ? est(own, defN) + ' unidades' : 'solo milicias locales'}` : `Tus defensores: ${defN ? num(defN) : 'solo milicias locales'}`}${atk.length ? ` · atacan: ${atk.map(g => `${flag(g.o)} ${Q.knows(g.o) ? esc(g.n) : '?'}`).join(', ')}` : ''}</small></div>`; };
  const grpCard = g => { const pend = UI.form['go:' + g.id], O = D.ORDERS[g.ord], T = pend ? Q.validTargets(w, g, pend) : [];
    return `<article class="grp g-${g.t} ${g.sup < 30 || g.mor < 30 ? 'warn' : ''}">${gi(D.GTYPE[g.t].ic, 'xl')}<div class="grow"><div class="row"><h3>${esc(g.n)}</h3><span class="chip gold">${gi(ORD_IC[g.ord])} ${O.n}${O.foe || g.ord === 'def' ? ' · ' + esc(rName(g.tgt)) : ''}</span></div>
      <div class="army">${uStrip(g.u)}</div><div class="gbars"><span>Moral</span>${bar(g.mor, 100, g.mor < 30 ? 'red' : 'green')}<span>Suministro</span>${bar(g.sup, 100, g.sup < 30 ? 'red' : 'gold')}<span>Veteranía</span>${stars(g.exp)}</div>
      <div class="chips ords">${Object.keys(D.ORDERS).filter(o => D.ORDERS[o].t.includes(g.t)).map(o => `<button class="chip ${(pend || g.ord) === o ? 'gold' : ''}" data-a="gOrd" data-g="${g.id}" data-o="${o}" title="${esc(D.ORDERS[o].d)}">${gi(ORD_IC[o])} ${D.ORDERS[o].n}</button>`).join('')}</div>
      ${pend ? `<div class="row wrap tgt"><small>${esc(D.ORDERS[pend].d)}</small>${T.length ? sel('gt:' + g.id, T.map(k => [k, `${rName(k)} · ${D.TER[Q.terOf(k)].n}`]), T[0]) + `<button class="btn sm gold" data-a="gGo" data-g="${g.id}">Dar la orden</button>` : '<span class="chip bad">Sin objetivos posibles</span>'}<button class="btn sm ghost" data-a="gCancel" data-g="${g.id}">Cancelar</button></div>` : ''}
      <div class="row"><button class="btn sm" data-a="gAdd" data-g="${g.id}">Reforzar con la mitad de lo libre</button><button class="btn sm ghost" data-a="gDel" data-g="${g.id}" data-confirm>Disolver</button></div></div></article>`; };
  const freeCat = cat => Object.keys(D.UNITS).filter(k => D.UNITS[k].cat === cat && k !== 'abm').reduce((a, k) => a + Q.freeU(p, k), 0);
  const last = s.blog.filter(b => b.w === w.id && b.t === s.turn - 1);
  return `<article class="card wroom"><div class="wr-head"><div class="wr-side">${fl(lead)}<b>${cname(lead)}</b><small>${w[side].length > 1 ? `+${w[side].length - 1} aliado${w[side].length > 2 ? 's' : ''}` : 'sin aliados'}</small></div>
      <div class="wr-vs"><div class="tug"><i style="width:${50 + sc / 2}%"></i></div><b class="${sc > 15 ? 'up' : sc < -15 ? 'down' : ''}">${sc > 15 ? 'Vas ganando' : sc < -15 ? 'Vas perdiendo' : 'Frente estancado'} (${sgn(Math.round(sc))})</b><small class="mut">${s.turn - w.s} turnos de guerra${cf ? ` · alto el fuego ${w.arm ? '(armisticio) ' : ''}${w.cf - s.turn} t` : ''}</small></div>
      <div class="wr-side r">${fl(foe)}<b>${cname(foe)}</b><small>${w[foeS].length > 1 ? `+${w[foeS].length - 1} aliado${w[foeS].length > 2 ? 's' : ''}` : 'sin aliados'}</small></div></div>
    <div class="chips wr-stats"><span class="chip ${won ? 'good' : ''}">${gi('pin')} Ocupas ${won}</span><span class="chip ${lost ? 'bad' : ''}">${gi('pin')} Pierdes ${lost}</span><span class="chip ${as[1]}">${gi('caz')} Cielo: ${as[0]}</span>${D.C[lead].land && D.C[foe].land ? '' : `<span class="chip ${ns[1]}">${gi('fra')} Mar: ${ns[0]}</span>`}<span class="chip">${gi('min')} Moral ${avg('mor')}</span><span class="chip">${gi('pet')} Suministro ${avg('sup')}</span>${W.weary > 10 ? `<span class="chip bad">Cansancio ${Math.round(W.weary)}</span>` : ''}</div>
    <div class="row wrap"><label class="check"><input type="checkbox" data-c="warAutoT" data-w="${w.id}" ${auto ? 'checked' : ''}> Estado Mayor al mando (la IA mueve tus grupos cada turno)</label></div>
    ${isLead ? `<div class="row wrap">${cf ? `<button class="btn sm red" data-a="breakCf" data-w="${w.id}" data-confirm>Romper el alto el fuego</button>` : `<button class="btn sm" data-a="cfire" data-w="${w.id}">Proponer alto el fuego · 1 CP</button><button class="btn sm" data-a="cfire" data-w="${w.id}" data-arm="1">Proponer armisticio · 1 CP</button>`}<button class="btn sm" data-a="peace2" data-w="${w.id}" data-k="blanca">Paz blanca · 1 CP</button><button class="btn sm" data-a="peace2" data-w="${w.id}" data-k="actual">Paz con lo ocupado · 1 CP</button><button class="btn sm red" data-a="peace2" data-w="${w.id}" data-k="rendicion" data-confirm>Rendirte</button>${CC(p).nuke && !w.thr ? `<button class="btn sm red" data-a="sThreat" data-w="${w.id}" data-confirm title="Consecuencias políticas enormes">Amenaza estratégica</button>` : ''}</div>` : `<div class="row"><button class="btn sm red" data-a="peace2" data-w="${w.id}" data-k="blanca" data-confirm>Retirarte de la guerra</button></div>`}
    <div class="grid2 front"><div><h4>${gi('ofensiva')} Objetivos</h4>${tg.map(k => regCard(k, 'tg')).join('') || '<p class="mut">Ninguna región enemiga a tu alcance.</p>'}</div><div><h4>${gi('seg')} Amenazado</h4>${th.map(k => regCard(k, 'th')).join('') || '<p class="mut">El enemigo no alcanza tu territorio.</p>'}</div></div>
    <h4>${gi('inf')} Tus grupos <small class="mut">libres: ${freeCat('tierra')} de tierra · ${freeCat('aire')} aéreas · ${freeCat('mar')} navales</small></h4>${G.map(grpCard).join('') || '<p class="mut">No tienes grupos en esta guerra: tus guarniciones defienden solas.</p>'}
    <div class="row wrap">${sel('nf:' + w.id, [['.25', '25% de lo libre'], ['.5', '50% de lo libre'], ['1', 'Todo lo libre']], '.5')}${Object.keys(D.GTYPE).filter(t => t !== 'fl' || !D.C[p].land).map(t => `<button class="btn sm" data-a="gNew" data-w="${w.id}" data-t="${t}">${gi(D.GTYPE[t].ic)} Nuevo ${D.GTYPE[t].n.toLowerCase()}</button>`).join('')}</div>
    <h4>${gi('ojo')} Fuerzas enemigas <small class="mut">${Q.knows(foe) ? 'información fiable' : 'estimación de tus servicios: mejora con espías y con tu agencia'}</small></h4>
    <div class="list">${foeG.map(g => `<div class="li">${gi(D.GTYPE[g.t].ic)}${fl(g.o)}<span class="grow">${Q.knows(g.o) ? esc(g.n) : D.GTYPE[g.t].n + ' enemigo'} <small class="mut">${est(g.o, Q.gsize(g))} unidades · ${Q.knows(g.o) || g.id % 2 ? D.ORDERS[g.ord].n.toLowerCase() + (g.tgt && Q.rSt(g.tgt) && D.ORDERS[g.ord].foe ? ' ' + esc(rName(g.tgt)) : '') : 'intenciones desconocidas'}</small></span></div>`).join('') || '<p class="mut pad">No detectas grupos enemigos.</p>'}</div>
    ${last.length ? `<h4>${gi('bomb')} Último parte <button class="chip gold" data-a="bReport" data-w="${w.id}">Ver batallas</button></h4><div class="list">${last.slice(0, 6).map(b => bRow(b, side, w)).join('')}</div>` : ''}
  </article>`;
}
const bGood = (b, w) => { const s = w ? Q.thSide(w, me()) : null, att = w ? Q.thSide(w, b.a) === s : b.a === me(); return att ? b.win : !b.win; };
const bRow = (b, side, w) => `<div class="li ${bGood(b, w) ? 'f-eco' : 'f-war'}">${gi(b.kind === 'aire' ? 'bom' : b.kind === 'mar' ? 'des' : 'tan')}<span class="grow"><b>${esc(b.n)}</b> <small class="mut">${D.TER[b.ter].n} · ${b.took ? (bGood(b, w) ? 'región tomada' : 'región perdida') : bGood(b, w) ? 'victoria' : 'derrota'}</small></span><span class="chip ${bGood(b, w) ? 'good' : 'bad'}">${Math.round(b.ratio * 100)}%</span></div>`;
H.gOrd = d => { const O = D.ORDERS[d.o]; if (O.foe || d.o === 'def') { UI.form['go:' + d.g] = d.o; UI.render(); } else act('grpOrder', { g: +d.g, ord: d.o }); };
H.gGo = d => { const o = UI.form['go:' + d.g], el = document.getElementById('gt:' + d.g); delete UI.form['go:' + d.g]; act('grpOrder', { g: +d.g, ord: o, tgt: fv('gt:' + d.g, el && el.value) }); };
H.gCancel = d => { delete UI.form['go:' + d.g]; UI.render(); };
H.gAdd = d => act('grpAdd', { g: +d.g, f: .5 }); H.gDel = d => act('grpDel', { g: +d.g });
H.gNew = d => act('mkGroup', { w: +d.w, t: d.t, f: +fv('nf:' + d.w, '.5') });
H.warAutoT = (d, el) => act('warAuto', { w: +el.dataset.w, on: el.checked ? 1 : 0 });
H.cfire = d => act('ceasefire', { w: +d.w, arm: d.arm ? 1 : 0 }); H.breakCf = d => act('breakCf', { w: +d.w }); H.sThreat = d => act('stratThreat', { w: +d.w });

/* ---------- Logística y economía de guerra ---------- */
function logHTML() {
  const s = S(), p = me(), c = CC(p), W = s.war3, G = Q.grpOf(p), need = Q.warNeeds(G), f = s.fin || Q.finance(), at = Q.warsOf(p).length, blk = Object.keys(W.blk || {}).some(k => !k.includes(':') && W.blk[k]);
  const res = [['pet', 'Combustible'], ['hie', 'Munición'], ['tie', 'Repuestos'], ['tri', 'Alimentos']];
  const sellers = Object.keys(s.c).filter(z => z !== p && CC(z).alive && !Q.atWar(p, z) && Q.rel(p, z) >= 15 && !W.emb.includes(z) && Q.power(z) > 50).sort((a, b) => Q.power(b) - Q.power(a)).slice(0, 25);
  const buyers = Object.keys(s.c).filter(z => z !== p && CC(z).alive && Q.rel(p, z) >= 0 && !W.myEmb.includes(z)).sort((a, b) => (Q.inWar(b) ? 1 : 0) - (Q.inWar(a) ? 1 : 0) || CC(b).gdp - CC(a).gdp).slice(0, 30);
  const units = Object.keys(D.UNITS).filter(k => k !== 'abm').map(k => [k, D.UNITS[k].n]);
  return `<div class="kvs big">${kv('Gasto del frente', money(f.exp.frente || 0) + '/t')}${kv('Alerta', money(f.exp.alerta || 0) + '/t')}${kv('Inflación', (s.eco ? s.eco.inf.toFixed(1) : '—') + '%')}${kv('Cansancio de guerra', Math.round(W.weary) + '/100')}</div>
    ${blk ? '<p class="warn-box">Tus puertos están bloqueados: no puedes importar suministros de guerra y tu caja sangra cada turno.</p>' : ''}
    <h4>${gi('pet')} Suministros del frente <small class="mut">se consumen cada turno; si faltan, se importan solos mientras haya dinero y no haya bloqueo</small></h4>
    <div class="ucards">${res.map(([r, n]) => { const st = c.stock[r] || 0, q = need[r] || 0, left = q > .01 ? st / q : Infinity; return `<article class="ucard">${gi(r, 'xl')}<div class="grow"><div class="row"><h3>${n}</h3><b class="cnt num">${Math.round(st)}</b></div><small class="mut">${D.COMMODITIES[r].n} · consumo ${q.toFixed(1)} u/turno</small>${bar(Math.min(10, left), 10, left < 2 ? 'red' : left < 5 ? 'gold' : 'green')}<small>${left === Infinity ? 'Sin consumo de guerra' : left < 1 ? '¡Se acaba este turno!' : `Para ${Math.floor(left)} turno${left >= 2 ? 's' : ''}`}</small></div></article>`; }).join('')}</div>
    ${G.length ? `<h4>${gi('pin')} Suministro por grupo</h4>${G.map(g => `<div class="arow">${gi(D.GTYPE[g.t].ic)}<div class="grow"><b>${esc(g.n)}</b>${bar(g.sup, 100, g.sup < 30 ? 'red' : 'gold')}<small class="mut">${Math.round(g.sup)}% · ${Q.ctlSide(Q.warById(g.w), g.at) === Q.thSide(Q.warById(g.w), p) ? 'en territorio propio: se reabastece' : 'en territorio enemigo: cuanto más lejos, más sufre'}</small></div></div>`).join('')}` : ''}
    <h4>${gi('sin')} Políticas de guerra</h4>${Object.keys(D.WPOL).map(k => `<div class="arow"><div class="grow"><b>${D.WPOL[k].n}</b><small>${D.WPOL[k].d}</small></div><button class="btn sm ${W.pol[k] ? 'gold' : ''}" data-a="wpolT" data-k="${k}" data-on="${W.pol[k] ? 0 : 1}" ${!W.pol[k] && (k !== 'econ' ? !at : W.alert < 2) ? 'disabled' : ''}>${W.pol[k] ? 'En vigor · suspender' : 'Aplicar · 1 CP'}</button></div>`).join('')}
    <h4>${gi('com')} Mercado de armas</h4>
    <div class="arow"><div class="grow"><b>Comprar armas</b><small>A países amigos (relación 15 o más) que no te tengan embargado. Llegan al momento, un 30% más caras.</small></div>${sellers.length ? sel('ab:z', sellers.map(z => [z, CC(z).n]), sellers[0]) + sel('ab:k', units, 'tan') + inp('ab:n', 5, 'type="number" min="1" class="w50"') + '<button class="btn sm gold" data-a="armsBuy">Comprar</button>' : '<span class="chip bad">Nadie te vende ahora</span>'}</div>
    <div class="arow"><div class="grow"><b>Vender armas</b><small>Ganas dinero e influencia; los enemigos del comprador lo recordarán.</small></div>${sel('as:z', buyers.map(z => [z, CC(z).n + (Q.inWar(z) ? ' (en guerra)' : '')]), buyers[0]) + sel('as:k', units, 'inf') + inp('as:n', 5, 'type="number" min="1" class="w50"')}<button class="btn sm" data-a="armsSell">Vender</button></div>
    <div class="arow"><div class="grow"><b>Embargos de armas</b><small>${W.emb.length ? `Te embargan: ${W.emb.map(z => flag(z) + ' ' + cname(z)).join(', ')}${W.emb.length >= 3 ? ' · tus unidades cuestan un 10% más' : ''}` : 'Nadie te embarga.'}${W.myEmb.length ? ` · Tú embargas a: ${W.myEmb.map(z => flag(z) + ' ' + cname(z)).join(', ')}` : ''}</small></div>${sel('ae:z', Object.keys(s.c).filter(z => z !== p && CC(z).alive).sort((a, b) => CC(a).n.localeCompare(CC(b).n)).map(z => [z, CC(z).n + (W.myEmb.includes(z) ? ' (embargado)' : '')]), Q.warsOf(p)[0] ? (Q.warsOf(p)[0].att[0] === p ? Q.warsOf(p)[0].def[0] : Q.warsOf(p)[0].att[0]) : 'RU')}<button class="btn sm" data-a="armsEmbT">Embargar / levantar</button></div>`;
}
H.wpolT = d => act('wpol', { k: d.k, on: +d.on });
H.armsBuy = () => act('buyArms', { iso: fv('ab:z', ($('#ab\\:z') || {}).value), k: fv('ab:k', 'tan'), n: +fv('ab:n', 5) });
H.armsSell = () => act('sellArms', { iso: fv('as:z', ($('#as\\:z') || {}).value), k: fv('as:k', 'inf'), n: +fv('as:n', 5) });
H.armsEmbT = () => act('armsEmb', { iso: fv('ae:z', ($('#ae\\:z') || {}).value) });

/* ---------- Disuasión: alerta, demostraciones, postura estratégica, doctrinas y fortificaciones ---------- */
function deterHTML() {
  const s = S(), p = me(), c = CC(p), W = s.war3, hostile = Object.keys(s.c).filter(z => z !== p && CC(z).alive && !Q.atWar(p, z) && (Q.nb(p).includes(z) || Q.rel(p, z) < -30)).sort((a, b) => Q.rel(p, a) - Q.rel(p, b));
  const L = Q.warsOf(p), regs = L.length ? [...new Set(L.flatMap(w => Q.thFront(w, Q.thOther(Q.thSide(w, p)), 4)))].filter(k => Q.rSt(k).o === p) : c.terr.map((t, i) => [t, i]).filter(x => x[0].o === p).sort((a, b) => (D.C[p].terr[b[1]].e || 0) - (D.C[p].terr[a[1]].e || 0)).slice(0, 6).map(x => Q.rk(p, x[1]));
  return `<h4>${gi('presion')} Nivel de alerta</h4><div class="alertlv">${D.ALERT.map((a, i) => `<button class="${W.alert === i ? 'on' : ''} lv${i}" data-a="alertSet" data-v="${i}" ${L.length && i < 2 ? 'disabled' : ''}><b>${a.n}</b><small>${a.d}</small></button>`).join('')}</div>
    <h4>${gi('mil')} Demostración de fuerza <small class="mut">1 CP · exige alerta de Tensión o más</small></h4><div class="arow"><div class="grow"><b>Mostrar los dientes</b><small>Maniobras a la vista de un país. Si eres claramente más fuerte (×1.3), retrocede y abandona sus planes contra ti; si no, responde movilizando.</small></div>${hostile.length ? sel('sf:z', hostile.map(z => [z, `${CC(z).n} (${sgn(Q.rel(p, z))})`]), hostile[0]) + `<button class="btn sm" data-a="showF" ${W.alert < 1 ? 'disabled' : ''}>Demostrar</button>` : '<span class="mut">Nadie a quien intimidar</span>'}</div>
    ${c.nuke ? `<h4>${gi('ultimatum')} Capacidad estratégica</h4><div class="arow"><div class="grow"><b>Alerta estratégica ${W.str ? '(activa)' : ''}</b><small>Disuasión máxima: nadie llevará la escalada contigo hasta la guerra. A cambio, tu imagen de paz cae cada turno y las grandes potencias desconfían. En guerra podrás lanzar una amenaza explícita: puede acabarla de golpe, pero con un coste político enorme y riesgo de crisis mundial si el rival también la tiene.</small></div><button class="btn sm ${W.str ? 'gold' : 'red'}" data-a="stratT" data-v="${W.str ? 0 : 1}">${W.str ? 'Volver a la normalidad' : 'Elevar la alerta'}</button></div>` : ''}
    <h4>${gi('estrella')} Doctrinas <small class="mut">una por rama · cambiar cuesta 2 CP y tus generales tardan 8 turnos en aceptar otra</small></h4>
    <div class="grid3">${Object.keys(D.DOCT).map(b => `<div class="card doc"><small>${D.CATS[b]}</small>${Object.keys(D.DOCT[b]).map(k => { const x = D.DOCT[b][k], on = W.doct[b] === k; return `<button class="trait ${on ? 'on' : ''}" data-a="docSet" data-b="${b}" data-k="${k}" ${on ? 'disabled' : ''}><b>${x.n}</b><small>${x.d}</small></button>`; }).join('')}${(W.dcd[b] || 0) > s.turn ? `<small class="mut">Cambio posible en ${W.dcd[b] - s.turn} t</small>` : ''}</div>`).join('')}</div>
    <h4>${gi('cuartel')} Fortificaciones <small class="mut">+15% de defensa por nivel (máx. ${D.FORT.max}); ${D.FORT.turns} turnos de obra; mantenimiento por nivel</small></h4>
    ${regs.map(k => { const st = Q.rSt(k), q = W.fq.find(x => x.k === k && !x.done); return `<div class="arow"><div class="grow"><b>${esc(st.n)} ${st.fort ? '<span class="chip gold">' + gi('cuartel') + ' nivel ' + st.fort + '</span>' : ''}</b><div class="chips">${terChip(k)}</div></div>${q ? `<span class="chip gold">En obras: ${q.r - s.turn} t</span>` : (st.fort || 0) >= D.FORT.max ? '<span class="chip good">Al máximo</span>' : `<button class="btn sm" data-a="fortB" data-k="${k}">Fortificar · ${money(Q.fortCost(k))}</button>`}</div>`; }).join('')}
    ${W.bq.length ? `<h4>${gi('cuartel')} Obras militares</h4><div class="chips">${W.bq.map(q => `<span class="chip gold">${D.BASES[q.k].n}: ${q.r - s.turn} t</span>`).join('')}</div>` : ''}
    ${W.crimes ? `<p class="warn-box">${W.crimes} denuncia${W.crimes > 1 ? 's' : ''} de crímenes de guerra contra tus fuerzas. A partir de 3, un tribunal internacional abre un caso.</p>` : ''}
    ${triangleHTML()}`;
}
H.alertSet = d => act('setAlert', { v: +d.v }); H.showF = () => act('showForce', { iso: fv('sf:z', ($('#sf\\:z') || {}).value) }); H.stratT = d => act('strat', { v: +d.v });
H.docSet = d => act('doctrine', { b: d.b, k: d.k }); H.fortB = d => act('fortify', { k: d.k });

/* ---------- agencia de inteligencia (Diplomacia · Inteligencia) ---------- */
{ const d0 = PANELS.dip; PANELS.dip = t => t === 'int' ? agencyHTML() + d0(t) : d0(t); }
function agencyHTML() { const sp = S().spy, c = CC(me()), lv = sp.lvl || 0;
  return `<div class="card agency"><div class="row"><div class="grow"><small>Agencia de inteligencia</small><h3>${gi('ojo')} ${D.AGENCY.n[sp.bud || 0]} · nivel ${lv.toFixed(1)} de 4.8</h3></div></div>${bar(lv, 4.8, 'gold')}
    <div class="chips">${D.AGENCY.n.map((n, i) => `<button class="chip ${(sp.bud || 0) === i ? 'gold' : ''}" data-a="agencyB" data-v="${i}">${n}${i ? ' · ' + money(c.gdp * D.AGENCY.cost[i]) + '/t' : ''}</button>`).join('')}</div>
    <small class="mut">El nivel sube despacio hacia lo que pagas. Cada punto: +4.5% de éxito en operaciones, informes más certeros, más contraespionaje y menos niebla de guerra (desde 4.2 ves todos los ejércitos).</small></div>`; }
H.agencyB = d => act('agency', { v: +d.v });

/* ---------- parte de batalla animado ---------- */
function battleHTML(list) { const s = S();
  return `<p class="eyebrow">Parte de guerra · ${esc(Q.dateStr())}</p><h2>${list.length} combate${list.length > 1 ? 's' : ''} en tus frentes</h2><div class="bts">${list.slice(0, 5).map((b, i) => { const w = Q.warById(b.w), good = bGood(b, w), icons = o => Object.keys(o).slice(0, 4).map(k => gi(k)).join('') || gi(b.kind === 'aire' ? 'bom' : b.kind === 'mar' ? 'des' : 'inf');
    return `<div class="bt ${good ? 'ok' : 'ko'}" style="--d:${i * .45}s"><div class="row between"><b>${gi(TER_IC[b.ter])} ${esc(b.n)}</b><small class="mut">${D.TER[b.ter].n} · ${D.WX[b.wx].n}${b.kind !== 'tierra' ? ' · ' + (b.kind === 'aire' ? 'ataque aéreo' : 'combate naval') : ''}</small></div>
      <div class="bt-arena"><div class="bt-s l">${fl(b.a)}<div class="bt-u">${icons(b.la)}</div><small>${num(b.pa)}</small></div><div class="bt-x">${ic('war')}</div><div class="bt-s r"><small>${num(b.pd)}</small><div class="bt-u">${icons(b.ld)}</div>${fl(b.d)}</div></div>
      <div class="bt-pow"><i style="--w:${Math.round(b.ratio * 100)}%"></i></div><div class="bt-res">${good ? 'Victoria' : 'Derrota'}${b.took ? ` · ${good ? 'región tomada' : 'región perdida'}` : ''}</div>
      <div class="row between"><small>Bajas ${cname(b.a)}: ${Object.keys(b.la).length ? uStrip(b.la) : 'ninguna'}</small><small>Bajas ${cname(b.d)}: ${Object.keys(b.ld).length ? uStrip(b.ld) : 'ninguna'}</small></div></div>`; }).join('')}</div>${list.length > 5 ? `<p class="mut">Y ${list.length - 5} combates más.</p>` : ''}`; }
const myBattles = t => S().blog.filter(b => b.t === t && b.me);
Bus.on('turn', () => { const L = myBattles(S().turn - 1); if (L.length) scene(modalScene(battleHTML(L), 'event wide')); });
H.bReport = d => { const L = S().blog.filter(b => b.w === +d.w && b.t === S().turn - 1); if (L.length) openModal(battleHTML(L), true, 'event wide'); };

/* ---------- frentes en el globo ---------- */
function theatreData() { const s = S(), p = me(), arrows = [], zones = [], lines = [], LL = k => { const g = Q.rGeo(k); return [g.la, g.lo]; }, dd = (a, b) => { const A = LL(a), B = LL(b); return (A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2; };
  for (const w of Q.warsOf(p)) { const side = Q.thSide(w, p), tg = Q.thFront(w, side, 5), th = Q.thFront(w, Q.thOther(side), 4);
    tg.forEach(k => zones.push({ p: LL(k), c: 0xff5a4d, s: 3.2 })); th.forEach(k => zones.push({ p: LL(k), c: 0xffb347, s: 2.6 }));
    th.forEach(k => { const n = tg.slice().sort((a, b) => dd(k, a) - dd(k, b))[0]; if (n) lines.push({ a: LL(k), b: LL(n), c: 0xff7a2f }); });
    for (const g of s.army) { if (g.w !== w.id || !['atk', 'adv', 'lnd', 'bmb'].includes(g.ord) || !g.tgt || g.tgt === g.at || !Q.rSt(g.tgt)) continue; const mine = Q.thSide(w, g.o) === side; if (!mine && !Q.knows(g.o) && g.id % 2) continue;
      arrows.push({ a: LL(g.at), b: LL(g.tgt), c: mine ? (g.o === p ? 0xffc94a : 0x8fd3ff) : 0xff3b30, w: g.t === 'ej' ? .007 : .0045 }); } }
  for (const b of s.blog) if (b.t === s.turn - 1 && b.kind === 'tierra' && !b.me) zones.push({ p: LL(b.k), c: 0xff3b2f, s: 1.8 });
  return { arrows, zones, lines }; }
{ const r0 = refreshMap; refreshMap = () => { r0(); if (!S() || UI.screen !== 'game') return; const d = theatreData(), k = JSON.stringify(d); if (k !== UI.thKey) { UI.thKey = k; Globe.setTheatre(d); } }; }
{ const q0 = H.quit; H.quit = d => { Globe.setTheatre(null); UI.thKey = ''; return q0(d); }; }

/* ---------- editor: guerra ---------- */
PTABS.edit.push(['gue', 'Guerra']);
{ const e0 = PANELS.edit; PANELS.edit = t => t === 'gue' ? edWarHTML() : e0(t); }
function edWarHTML() { const s = S(), cs = Object.keys(s.c).filter(z => CC(z).alive).sort((a, b) => CC(a).n.localeCompare(CC(b).n)).map(z => [z, CC(z).n]);
  return `<div class="arow"><div class="grow"><b>Forzar una guerra</b><small>Entre cualquier par de países, con sus reacciones en cadena.</small></div>${sel('ew:a', cs, 'RU')}${sel('ew:b', cs, 'UA')}<button class="btn sm red" data-a="edW" data-op="war">Declarar</button></div>
    ${s.wars.map(w => { const R = Q.thRegs(w); return `<div class="card"><div class="row"><h3>${fl(w.att[0])} ${cname(w.att[0])} contra ${fl(w.def[0])} ${cname(w.def[0])}</h3><small class="mut">marcador ${Math.round(w.score)}</small></div>
      <div class="row wrap"><button class="btn sm" data-a="edW" data-op="peace" data-w="${w.id}">Forzar paz</button><button class="btn sm" data-a="edW" data-op="cf" data-w="${w.id}">Alto el fuego</button><button class="btn sm" data-a="edW" data-op="score" data-w="${w.id}" data-v="25">Atacante +25</button><button class="btn sm" data-a="edW" data-op="score" data-w="${w.id}" data-v="-25">Defensor +25</button>
        ${sel('ew:mk' + w.id, w.att.concat(w.def).map(z => [z, CC(z).n]), w.att[0])}${sel('ew:t' + w.id, Object.keys(D.GTYPE).map(t => [t, D.GTYPE[t].n]), 'ej')}<button class="btn sm" data-a="edW" data-op="mk" data-w="${w.id}">Crear grupo</button></div>
      ${s.army.filter(g => g.w === w.id).map(g => `<div class="arow">${gi(D.GTYPE[g.t].ic)}${fl(g.o)}<div class="grow"><b>${esc(g.n)}</b><small>${D.ORDERS[g.ord].n} · ${esc(rName(g.tgt))} · ${Q.gsize(g)} u · moral ${Math.round(g.mor)} · suministro ${Math.round(g.sup)}</small></div>
        <button class="btn sm" data-a="edW" data-op="add" data-g="${g.id}">+25% unidades</button><button class="btn sm" data-a="edW" data-op="sup" data-g="${g.id}" data-v="100">Suministro 100</button><button class="btn sm" data-a="edW" data-op="sup" data-g="${g.id}" data-v="10">Suministro 10</button><button class="btn sm" data-a="edW" data-op="mor" data-g="${g.id}" data-v="100">Moral 100</button>
        ${sel('ew:mv' + g.id, R.map(k => [k, rName(k)]), g.at)}<button class="btn sm" data-a="edW" data-op="move" data-g="${g.id}">Mover</button><button class="btn sm red" data-a="edW" data-op="del" data-g="${g.id}">Eliminar</button></div>`).join('')}</div>`; }).join('') || '<p class="mut">No hay guerras en curso.</p>'}`; }
H.edW = d => { const a = { op: d.op, w: d.w, g: d.g, v: d.v };
  if (d.op === 'war') { a.a = fv('ew:a', 'RU'); a.b = fv('ew:b', 'UA'); }
  if (d.op === 'mk') { a.iso = fv('ew:mk' + d.w, ($('#ew\\:mk' + d.w) || {}).value); a.t = fv('ew:t' + d.w, 'ej'); }
  if (d.op === 'move') a.k = fv('ew:mv' + d.g, ($('#ew\\:mv' + d.g) || {}).value);
  act('edWar', a); refreshMap(); };

/* ---------- atajos ---------- */
KEYS.push(['G', 'Sala de guerra'], ['L', 'Logística de guerra']);
document.addEventListener('keydown', e => { if (UI.screen !== 'game' || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName || '') || !$('#modal').hidden) return;
  if (e.key === 'g' || e.key === 'G') H.warRoom(); else if (e.key === 'l' || e.key === 'L') { UI.tab.mil = 'log'; UI.panel = 'mil'; UI.render(); } });

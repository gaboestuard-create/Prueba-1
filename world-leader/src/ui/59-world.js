/* =====================================================================
   INTERFAZ · MUNDO EN VIVO, barra de recursos, fábricas y guerrillas
   en ciudades ocupadas.
   ===================================================================== */
const FG = { dip: 'dip', peace: 'dip', treaty: 'dip', war: 'war', mil: 'war', coup: 'pol', pol: 'pol', elec: 'pol', eco: 'eco', tec: 'tec' };
const FGN = { dip: ['Diplomacia', 'acuerdo'], war: ['Guerra y ejércitos', 'tan'], eco: ['Economía', 'eco'], pol: ['Política', 'sin'], tec: ['Ciencia', 'matraz'], world: ['Mundo', 'pin'] };
const QN = ['Ene–Mar', 'Abr–Jun', 'Jul–Sep', 'Oct–Dic'], tLabel = t => `${QN[t % 4]} ${2027 + Math.floor(t / 4)}`;
PTABS.world.unshift(['act', 'En vivo']);
{ const w0 = PANELS.world; PANELS.world = t => t === 'act' ? feedHTML() : w0(t); }
function feedHTML() {
  const all = Q.worldFeed(), turns = [...new Set(all.map(e => e.t))].sort((a, b) => b - a).slice(0, 8), t = +fv('wf:t', turns.includes(S().turn - 1) ? S().turn - 1 : turns[0] || 0), g = fv('wf:g', ''), q = fv('wf:q', '').trim().toLowerCase();
  const now = all.filter(e => e.t === t), who = new Set(now.flatMap(e => [e.a, e.b]).filter(Boolean));
  const L = now.filter(e => (!g || (FG[e.k] || 'world') === g) && (!q || e.x.toLowerCase().includes(q))).reverse();
  return `<div class="kvs">${kv('Trimestre', tLabel(t))}${kv('Sucesos', now.length)}${kv('Países activos', who.size)}</div>
    <div class="chips">${turns.map(x => `<button class="chip ${x === t ? 'gold' : ''}" data-a="wfT" data-v="${x}">${tLabel(x)}</button>`).join('')}</div>
    <div class="row wrap"><div class="searchbox grow">${ic('search')}${inp('wf:q', '', 'placeholder="Buscar país o suceso…" autocomplete="off"')}</div></div>
    <div class="chips filt"><button class="chip ${!g ? 'gold' : ''}" data-a="wfG" data-v="">Todo</button>${Object.keys(FGN).map(k => `<button class="chip ${g === k ? 'gold' : ''}" data-a="wfG" data-v="${k}">${gi(FGN[k][1])} ${FGN[k][0]}</button>`).join('')}</div>
    <div class="list feed">${L.map(e => { const k = FG[e.k] || 'world', ok = e.a && CC(e.a); return `<button class="li f-${k}" ${ok ? `data-a="sel" data-iso="${e.a}"` : ''}>${gi(FGN[k][1])}<span class="fl2">${ok ? fl(e.a) : ''}${e.b && CC(e.b) ? '<i>›</i>' + fl(e.b) : ''}</span><span class="grow">${esc(e.x)}</span></button>`; }).join('') || '<p class="mut pad">Nada con ese filtro.</p>'}</div>`;
}
H.wfT = d => { UI.form['wf:t'] = d.v; UI.render(); }; H.wfG = d => { UI.form['wf:g'] = d.v; UI.render(); }; H['in:wf'] = () => { clearTimeout(UI.wfT); UI.wfT = setTimeout(UI.render, 200); };
H.feedOpen = () => { UI.tab.world = 'act'; UI.panel = 'world'; UI.render(); };
/* teletipo: clic para abrir el mundo en vivo */
const tickLink = h => h.replace('<div class="ticker"', '<div class="ticker" data-a="feedOpen" role="button" tabindex="0" title="Ver todo lo que pasa en el mundo"');

/* ---------- barra de recursos siempre visible ---------- */
const RKEY = ['pet', 'gas', 'tri', 'hie', 'tie', 'ura', 'lit', 'cob'];
const usedBy = k => Object.keys(D.UNITS).filter(u => D.UNITS[u].res[k]).map(u => D.UNITS[u].n.toLowerCase());
function resbarHTML() {
  const f = Q.resFlow(); return `<div class="resbar glass" aria-label="Materias primas">${RKEY.map(k => { const x = f[k], n = x.net, low = n < 0 && x.stock < -n * 4, u = usedBy(k);
    return `<button class="rs ${low ? 'low' : n < 0 ? 'neg' : ''}" data-a="resOpen" title="${esc(D.COMMODITIES[k].n)}: reserva ${Math.round(x.stock)} · produces ${x.prod.toFixed(1)} · consumes ${x.cons.toFixed(1)}${u.length ? ' · lo usan: ' + u.join(', ') : ''}${low ? ' · ¡se acaba!' : ''}">${gi(k)}<b>${Math.round(x.stock)}</b><small>${n >= 0 ? '+' : ''}${n.toFixed(1)}</small></button>`; }).join('')}</div>`;
}
{ const d0 = dockHTML; dockHTML = () => tickLink(d0()) + (UI.sel || (UI.panel && innerWidth < 760) ? '' : resbarHTML()); } // no tapar la ficha del país ni los paneles
H.resOpen = () => { UI.tab.eco = 'pla'; UI.panel = 'eco'; UI.render(); };

/* ---------- fábricas ---------- */
PTABS.eco.splice(2, 0, ['pla', 'Fábricas']);
{ const e0 = PANELS.eco; PANELS.eco = t => t === 'pla' ? facHTML() : e0(t); }
function facHTML() {
  const f = Q.resFlow(), c = CC(me()), t = S().turn;
  return `<div class="kvs big">${kv('Fábricas', Object.keys(S().fac).reduce((s, k) => s + Q.facLvl(k), 0) + ' niveles')}${kv('Mantenimiento', money(Q.facUp()) + ' /turno')}${kv('Caja', money(c.tr))}</div>
    <p class="mut">Produce tú mismo lo que te falta o lo que más vale. Con yacimientos propios rinden el doble y cuestan menos; sin ellos, reciclas e importas mineral. Las obras tardan 2 turnos. Lo que sobre se exporta solo.</p>
    <div class="ucards">${Object.keys(D.FACT).map(k => { const F = D.FACT[k], l = Q.facLvl(k), x = f[k], dep = (c.rec[k] || 0) > 0, st = S().fac[k], busy = st && st.r > t, u = usedBy(k);
      return `<article class="ucard fac">${gi(k, 'xl')}<div class="grow"><div class="row"><h3>${F.n}</h3><b class="cnt num">${l}/5</b></div><small class="mut">${D.COMMODITIES[k].n} · ${dep ? 'tienes yacimientos' : 'sin yacimientos: rinde la mitad'}${u.length ? ' · para ' + u.slice(0, 3).join(', ') : ''}</small>
        ${bar(l, 5, 'gold')}<small>Producen ${Q.facOut(k).toFixed(1)} u/t · saldo del recurso <b class="${x.net >= 0 ? 'up' : 'down'}">${sgn(x.net, 1)}</b> · precio $${S().mkt.com[k].p.toFixed(2)}</small>
        <div class="row">${busy ? `<span class="chip gold">En obras: ${st.r - t} t</span>` : l >= 5 ? '<span class="chip good">Al máximo</span>' : `<button class="btn sm gold" data-a="buildFac" data-k="${k}" ${c.tr < Q.facCost(k) ? 'disabled' : ''}>${l ? 'Ampliar' : 'Construir'} · ${money(Q.facCost(k))}</button>`}</div></div></article>`; }).join('')}</div>`;
}
H.buildFac = d => act('buildFac', { k: d.k });

/* ---------- guerrillas en ciudades ocupadas por otros ---------- */
{ const d2 = PANELS.dip;
  PANELS.dip = t => { if (t !== 'ocu') return d2(t); const L = Q.occCells(), by = {}; L.forEach(c => (by[c.iso] = by[c.iso] || []).push(c)); const ks = Object.keys(by).sort((a, b) => by[b].length - by[a].length).slice(0, 25);
    return d2(t) + `<h4>${gi('inf')} Ciudades ocupadas por otros</h4><p class="mut">Arma a la guerrilla local: en 2–4 turnos se levanta y, si triunfa, la ciudad vuelve a su país, que te lo agradecerá. Triunfa más si el ocupante está inestable o en guerra. El ocupante puede descubrirte.</p>
      ${ks.map(z => `<div class="cellgrp"><b>${fl(z)} ${cname(z)} <small class="mut">${by[z].length} ciudad${by[z].length > 1 ? 'es' : ''} ocupada${by[z].length > 1 ? 's' : ''}</small></b>${by[z].slice(0, 8).map(c => `<div class="arow"><div class="grow"><b>${gi('pin')} ${esc(c.n)}</b><small>Ocupada por ${flag(c.by)} ${cname(c.by)}</small></div>${c.armed ? '<span class="chip gold">Guerrilla armada</span>' : `<button class="btn sm" data-a="armCell" data-iso="${z}" data-i="${c.i}">Armar la guerrilla · 1 CP · ${money(Math.max(.3, D.C[z].gdp * .004))}</button>`}</div>`).join('')}</div>`).join('') || '<p class="mut">Ningún país ocupa ahora ciudades de otro.</p>'}`; };
}
H.armCell = d => { act('armCell', { iso: d.iso, i: +d.i }); refreshMap(); };

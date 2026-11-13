/* =====================================================================
   INTERFAZ · HUD, modos de mapa, panel de país y hoja de acciones
   ===================================================================== */
const MODES = { pol: 'Político', rel: 'Relaciones', mil: 'Militar', eco: 'Economía', blo: 'Bloques' };
const LEGEND = {
  pol: 'Cada país con su color · el tuyo en dorado', rel: 'Rojo hostil → ámbar frío → verde amigo · tú en cian',
  mil: 'De violeta (débil) a naranja (potencia militar)', eco: 'PIB por habitante: de oscuro (pobre) a claro (rico)', blo: 'Color por bloque principal · gris = no alineado'
};
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ramp = (stops, t) => { t = Math.max(0, Math.min(.9999, t)) * (stops.length - 1); const i = Math.floor(t); return lerp3(stops[i], stops[i + 1], t - i); };
function hsl(h, s, l) { const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return [f(0), f(8), f(4)]; }
const polColor = iso => { const h = hash(iso + 'wl'); let hue = h % 360; if (hue > 22 && hue < 68) hue += 60; return hsl(hue, .3 + (h >> 9) % 16 / 100, .42 + (h >> 16) % 11 / 100); };
const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function colorOf(iso, mode, ctx) { // iso = país vivo (dueño)
  const c = CC(iso), p = me();
  if (mode === 'pol') return iso === p ? [226, 180, 58] : polColor(iso);
  if (mode === 'rel') { if (iso === p) return [79, 216, 255]; const r = Q.rel(p, iso); return r <= -100 ? [120, 14, 18] : ramp([[205, 52, 44], [214, 150, 62], [176, 170, 96], [70, 190, 120]], (r + 100) / 200); }
  if (mode === 'mil') return ramp([[44, 40, 92], [120, 60, 150], [214, 84, 110], [255, 160, 60]], Math.log10(Q.power(iso) + 1) / ctx.maxPow);
  if (mode === 'eco') return ramp([[26, 52, 66], [36, 120, 124], [70, 196, 160], [214, 250, 208]], Math.log10(c.gdp / c.pop + .3) / 2.2 + .12);
  const b = ['OTAN', 'OTSC', 'BRICS', 'UE', 'ASEAN', 'MERCOSUR', 'LA', 'UA', 'OCS', 'G7'].find(x => c.blocs.includes(x)); return b ? hexRgb(D.BLOCS[b].c) : [84, 92, 108];
}
function refreshMap() {
  if (!Globe.ready) return;
  const colors = {}, wars = {}, over = {};
  if (!S()) { for (const iso in D.C) colors[iso] = polColor(iso); Globe.paint(colors, {}); return; }
  const ctx = { maxPow: Math.log10(Math.max(...Object.keys(S().c).map(i => Q.power(i))) + 1) };
  const own = {};
  for (const iso in S().c) {
    const o = Q.ownerOf(iso); let col = own[o] || (own[o] = colorOf(o, UI.mode, ctx));
    const c = CC(iso), occ = c.alive ? c.terr.filter(t => t.o !== iso) : [];
    if (iso === UI.sel && c.alive && c.terr.length > 1) { over[iso] = {}; c.terr.forEach((t, i) => { if (t.o === iso) over[iso][i + 1] = partyColor(t.p); }); } // país seleccionado: regiones por partido
    if (occ.length) { wars[iso] = 1; over[iso] = over[iso] || {}; c.terr.forEach((t, i) => { if (t.o !== iso) { const k = Q.ownerOf(t.o); over[iso][i + 1] = own[k] || (own[k] = colorOf(k, UI.mode, ctx)); } }); } // cada provincia ocupada se pinta del ocupante
    colors[iso] = col;
  }
  for (const w of S().wars) wars[w.def[0]] = 1; // franjas rojas solo donde se combate
  Globe.paint(colors, wars, over);
  Globe.select(UI.sel ? Object.keys(S().c).filter(i => Q.ownerOf(i) === UI.sel) : []);
  const p = me(), routes = [];
  S().contracts.forEach(x => routes.push({ a: p, b: x.to, gold: 1 }));
  Object.keys(S().c).filter(i => i !== p && CC(i).alive && Q.hasT('com', p, i) && !Q.atWar(p, i)).sort((a, b) => CC(b).gdp - CC(a).gdp).slice(0, 18).forEach(i => routes.push({ a: p, b: i }));
  const key = routes.map(r => r.b + (r.gold || '')).join(); if (key !== UI.routeKey) { UI.routeKey = key; Globe.setRoutes(routes); }
  const fronts = [...new Set(S().wars.map(w => w.def[0]).concat(Object.keys(S().c).filter(i => CC(i).alive && CC(i).terr.some(t => t.o !== i))))];
  const fk = fronts.join(); if (fk !== UI.frontKey) { UI.frontKey = fk; Globe.setWars(fronts); }
  if (Globe.label) Globe.label(p, CC(p).n, 'me');
}

/* ---- HUD ---- */
function hudHTML() {
  const s = S(), c = CC(me()), f = s.fin || Q.finance(), ap = Q.approval(), pol = s.pol, left = pol.nextElec - s.turn;
  const stat = (icn, label, val, sub, cls, panel) => `<button class="stat ${cls || ''}" data-a="open" data-p="${panel}" title="${esc(label)}">${ic(icn)}<span><b>${val}</b><small>${sub}</small></span></button>`;
  return `<header class="hud glass">
    <button class="hud-id" data-a="selMe">${portrait(me())}<span><b>${fl(me())} ${cname(me())}</b><small>${esc(s.leader.n)} · ${esc(Q.repTitle())}</small></span></button>
    <div class="hud-stats">
      ${stat('money', 'Caja del Estado y saldo por turno', money(c.tr), `<i class="${f.net >= 0 ? 'up' : 'down'}">${f.net >= 0 ? '+' : '−'}${money(Math.abs(f.net)).slice(1)}</i> /turno`, c.tr < 0 ? 'warn' : '', 'eco')}
      ${stat('cp', 'Capital político: lo gastas en casi todo', pol.cp + '<em>/12</em>', 'capital político', pol.cp < 2 ? 'warn' : '', 'pol')}
      ${stat('people', 'Aprobación ponderada de los sectores', pct(ap), Q.isDem() ? (left > 0 ? `elección en ${left} t` : 'elección') : 'aprobación', ap < 40 ? 'warn' : '', 'pol')}
      ${stat('stab', 'Estabilidad: por debajo de 30 hay ruido de sables', Math.round(c.stab), 'estabilidad', c.stab < 30 ? 'warn' : '', 'pol')}
    </div>
    <button class="sndbtn" data-a="sound" aria-label="${Sfx.on ? 'Silenciar' : 'Activar sonido'}" title="Sonido">${ic(Sfx.on ? 'snd' : 'mute')}</button>
    ${alertBtn()}
    <div class="hud-date"><b>${esc(Q.dateStr())}</b><small>Turno ${s.turn + 1}</small></div>
  </header>
  <nav class="modes" aria-label="Modo de mapa">${Object.keys(MODES).map(m => `<button data-a="mode" data-m="${m}" class="${UI.mode === m ? 'on' : ''}">${MODES[m]}</button>`).join('')}<small class="legend">${LEGEND[UI.mode]}</small></nav>`;
}
const DOCK = [['eco', 'Economía'], ['pol', 'Política'], ['dip', 'Diplomacia'], ['mil', 'Ejército'], ['tec', 'Ciencia'], ['world', 'Mundo'], ['edit', 'Editor'], ['sys', 'Partida']];
function dockHTML() {
  const n = S().pend.length;
  return `<nav class="dock glass" aria-label="Gabinete">${DOCK.map(d => `<button data-a="open" data-p="${d[0]}" class="${UI.panel === d[0] ? 'on' : ''}">${ic(d[0])}<span>${d[1]}</span></button>`).join('')}</nav>
    <button class="endturn ${n ? 'pend' : ''}" data-a="${n ? 'showPend' : 'endTurn'}" ${UI.busy ? 'disabled' : ''}>${n ? `Decisión pendiente${n > 1 ? ' (' + n + ')' : ''}` : 'Terminar turno'} ${ic('next')}</button>`;
}
H.mode = d => { UI.mode = d.m; UI.render(); refreshMap(); };
H.open = d => { UI.panel = UI.panel === d.p ? null : d.p; if (UI.panel && innerWidth < 1250) UI.sel = null; UI.render(); refreshMap(); };
H.closePanel = () => { UI.panel = null; UI.render(); };
H.selMe = () => selectCountry(me());
H.unsel = () => { UI.sel = null; UI.render(); refreshMap(); };
H.sel = d => selectCountry(d.iso, true);
function selectCountry(iso, fly, prov) {
  if (!iso || !S() || !S().c[iso]) return; const o = Q.ownerOf(iso);
  UI.terrSel = o === iso && prov ? prov - 1 : UI.sel === o ? UI.terrSel : null; if (UI.terrSel != null) UI.terrOpen = true;
  UI.sel = o; UI.why = false; if (innerWidth < 1250) UI.panel = null;
  if (fly !== false) Globe.focus(iso);
  UI.render(); refreshMap();
}
H.endTurn = () => { if (UI.busy) return; UI.busy = true; UI.turnBuf = []; UI.render(); setTimeout(() => { const r = act('endTurn'); if (!r.ok) { UI.busy = false; UI.turnBuf = null; UI.render(); } }, 30); };
H.showPend = () => showPending();

/* ---- panel del país seleccionado ---- */
const kv = (k, v, t) => `<div title="${esc(t || '')}"><small>${k}</small><b>${v}</b></div>`;
function statusChips(iso) {
  const p = me(), out = [];
  if (iso === p) return '<span class="chip gold">Tu país</span>';
  if (Q.atWar(p, iso)) out.push('<span class="chip bad">En guerra contigo</span>');
  if (Q.alliesOf(p).includes(iso)) out.push('<span class="chip good">Aliado</span>');
  if (Q.hasExplicit('pna', p, iso)) out.push('<span class="chip">No agresión</span>');
  if (Q.hasT('com', p, iso)) out.push('<span class="chip cyan">Socio comercial</span>');
  if (Q.sanctioned(p, iso)) out.push('<span class="chip bad">Lo sancionas</span>');
  if (Q.sanctioned(iso, p)) out.push('<span class="chip bad">Te sanciona</span>');
  if (S().bases.some(b => b.by === p && b.in === iso)) out.push('<span class="chip gold">Base tuya</span>');
  return out.join('');
}
function countryHTML(iso) {
  const c = CC(iso), d = D.C[iso], p = me(), mine = iso === p, r = mine ? 100 : Q.rel(p, iso);
  const allies = Q.alliesOf(iso), blocDef = c.blocs.filter(b => D.BLOCS[b].def), inBloc = x => blocDef.some(b => CC(x).blocs.includes(b));
  const expl = allies.filter(x => !inBloc(x)).sort((a, b) => CC(b).gdp - CC(a).gdp);
  const foes = Q.enemiesOf(iso), rivals = Object.keys(S().c).filter(z => z !== iso && CC(z).alive && !foes.includes(z)).map(z => [z, Q.rel(iso, z)]).filter(x => x[1] < -45).sort((a, b) => a[1] - b[1]).slice(0, 4);
  const own = Q.ownCount(iso), held = Object.keys(S().c).reduce((s, z) => s + (z !== iso ? CC(z).terr.filter(t => t.o === iso).length : 0), 0);
  const cats = Object.keys(D.CATS).map(k => { const a = Q.catPow(iso, k), b = Q.catPow(p, k), mx = Math.max(a, b, 1); return `<div class="cmp"><small>${D.CATS[k]}</small>${bar(a, mx, mine ? 'gold' : 'red')}${mine ? '' : bar(b, mx, 'gold')}<b class="num">${Math.round(a)}</b></div>`; }).join('');
  const recs = Object.keys(c.rec).filter(k => c.rec[k] > 0).sort((a, b) => c.rec[b] - c.rec[a]).map(k => `<span class="chip" title="Nivel de producción ${c.rec[k]} de 5">${D.COMMODITIES[k].n} <i class="dots">${'●'.repeat(c.rec[k])}</i></span>`).join('') || '<span class="mut">Sin recursos de exportación</span>';
  const why = UI.why && !mine ? `<div class="why">${Q.relBreakdown(iso).map(x => `<div><span>${esc(x[0])}</span><b class="${x[1] >= 0 ? 'up' : 'down'}">${sgn(x[1])}</b></div>`).join('')}</div>` : '';
  const terr = regionsHTML(iso);
  return `<aside class="cpanel glass" data-sc="cp"><button class="xbtn" data-a="unsel" aria-label="Cerrar">${ic('x')}</button>
    <header class="cp-head"><span class="flag xl">${flag(iso)}</span><div><h2>${cname(iso)}</h2><small class="mut">${esc(D.REGIONS[d.region])} · ${esc(D.REGIMES[c.reg])}${c.nuke ? ' · ☢ nuclear' : ''}</small></div></header>
    <div class="leader">${portrait(iso, true)}<div><b>${esc(c.lider.n)}</b><small>${esc(c.partido)} · ${esc(D.IDEO[c.ideo] || '')}</small>
      <span class="chip ${c.lider.verificado ? 'good' : ''}" title="${c.lider.verificado && !c.lider.gen && iso !== p ? 'Contrastado con prensa el ' + D.VERIFIED_ON : 'Los líderes parten de datos sin verificar: corrígelos en el Editor'}">${c.lider.verificado ? '✓ verificado' : c.lider.gen ? 'generado por el juego' : 'sin verificar'}</span></div></div>
    ${mine ? '' : `<div class="relbox"><div class="row"><small>Amistad contigo</small><b class="${relCls(r)}">${relWord(r)} · ${sgn(r)}</b></div>${relBar(r)}<button class="lnk" data-a="why">${UI.why ? 'Ocultar motivos' : '¿Por qué?'}</button>${why}</div>`}
    <div class="chips">${statusChips(iso)}</div>
    <div class="kvs">${kv('PIB', money(c.gdp))}${kv('Población', c.pop >= 1 ? c.pop.toFixed(0) + ' M' : Math.round(c.pop * 1000) + ' mil')}${kv('Estabilidad', Math.round(c.stab), 'Por debajo de 18 hay riesgo de golpe')}${kv('Tropas', num(Q.troops(iso)), 'Personal aproximado')}</div>
    <h4>Fuerza militar <small class="mut">${mine ? '' : 'rojo: ellos · dorado: tú'}</small></h4><div class="cmps">${cats}</div>
    ${intelHTML(iso)}
    <h4>Aliados</h4><div class="chips">${blocDef.map(b => `<span class="chip cyan">${D.BLOCS[b].n}</span>`).join('')}${expl.slice(0, 7).map(x => `<button class="chip good" data-a="sel" data-iso="${x}">${flag(x)} ${cname(x)}</button>`).join('')}${expl.length > 7 ? `<span class="chip">+${expl.length - 7}</span>` : ''}${!blocDef.length && !expl.length ? '<span class="mut">Ninguno</span>' : ''}</div>
    <h4>Enemigos</h4><div class="chips">${foes.map(x => `<button class="chip bad" data-a="sel" data-iso="${x}">${ic('war')} ${cname(x)}</button>`).join('')}${rivals.map(x => `<button class="chip" data-a="sel" data-iso="${x[0]}">${flag(x[0])} ${cname(x[0])} ${sgn(x[1])}</button>`).join('')}${!foes.length && !rivals.length ? '<span class="mut">Ninguno declarado</span>' : ''}</div>
    <h4>Recursos</h4><div class="chips">${recs}</div>
    ${terr}
    <footer class="cp-actions">${mine ? `<button class="btn" data-a="open" data-p="pol">Política</button><button class="btn" data-a="open" data-p="mil">Ejército</button>` : `<button class="btn gold" data-a="dipOpen" data-iso="${iso}">Diplomacia y guerra</button>`}<button class="btn ghost" data-a="editOpen" data-iso="${iso}">Editar</button></footer></aside>`;
}
function intelHTML(iso) {
  const x = iso !== me() && Q.intel(iso); if (!x) return '';
  const row = (l, v) => `<div class="cmp"><small>${l}</small>${bar(v * 100, 100, 'gold')}<b class="num">${Math.round(v * 100)}</b></div>`;
  return `<h4>${ic('spy')} Informe de inteligencia <small class="mut">red nivel ${x.net}</small></h4><div class="cmps intel">${row('Agresivo', x.per.agres)}${row('Expansión', x.per.expan)}${row('Lealtad', x.per.leal)}${row('Rencor', x.per.rencor)}</div>
    <div class="chips"><span class="chip">Tesoro ${money(x.tr)}</span><span class="chip ${x.threat > 1 ? 'bad' : ''}">Se siente ${x.threat > 1 ? 'amenazado' : 'seguro'}</span>${x.rival ? `<button class="chip" data-a="sel" data-iso="${x.rival}">Rival: ${flag(x.rival)} ${cname(x.rival)}</button>` : ''}${x.nextElec != null && x.nextElec > 0 ? `<span class="chip">Elecciones en ${x.nextElec} t</span>` : ''}${x.grudge < -10 ? `<span class="chip bad">Te guarda rencor (${sgn(x.grudge)})</span>` : ''}</div>`;
}
H.why = () => { UI.why = !UI.why; UI.render(); };
H.editOpen = d => { UI.form['ed:iso'] = d.iso; UI.panel = 'edit'; UI.render(); };

/* ---- hoja de acciones con un país ---- */
const oddsWord = o => o >= 8 ? ['Casi seguro', 'good'] : o >= 0 ? ['Probable', 'good'] : o >= -10 ? ['Difícil', ''] : ['Lo rechazarán', 'bad'];
function sheetHTML(iso) {
  const c = CC(iso), p = me(), P = CC(p), war = Q.atWar(p, iso), r = Q.rel(p, iso);
  const row = (title, sub, btn) => `<div class="arow"><div class="grow"><b>${title}</b><small>${sub}</small></div>${btn}</div>`;
  const B = (label, a, extra, cls, confirm) => `<button class="btn sm ${cls || ''}" data-a="${a}" data-iso="${iso}" ${extra || ''} ${confirm ? 'data-confirm' : ''}>${label}</button>`;
  const treaties = Object.keys(Q.TNAME).map(t => {
    if (Q.hasT(t, p, iso)) return row(Q.TNAME[t], Q.hasExplicit(t, p, iso) ? 'Vigente. Romperlo dañará tu fama de confiable.' : 'Vigente por pertenecer al mismo bloque.', Q.hasExplicit(t, p, iso) ? B('Romper', 'breakT', `data-t="${t}"`, 'red', 1) : '<span class="chip good">Bloque</span>');
    const ev = Q.treatyEval(t, iso), o = oddsWord(ev.odds);
    return row(`${Q.TNAME[t]} <span class="chip ${o[1]}">${o[0]}</span>`, `Necesitas ${ev.need}; tienes ${ev.score}. ${ev.reasons.slice(1).map(x => esc(x[0]) + ' ' + sgn(x[1])).join(' · ')}`, B(`Proponer · ${Q.TCP[t]} CP`, 'propose', `data-t="${t}"`, 'gold'));
  }).join('');
  const comOpts = Object.keys(D.COMMODITIES).map(k => [k, `${D.COMMODITIES[k].n} (tienes ${Math.round(P.stock[k] || 0)})`]);
  const myT = P.terr.map((t, i) => [i, t]).filter(x => x[1].o === p && x[0] > 0).map(x => [x[0], x[1].n]), theirT = c.terr.map((t, i) => [i, t]).filter(x => x[1].o === iso && x[0] > 0).map(x => [x[0], x[1].n]);
  const defenders = Q.alliesOf(iso).filter(x => x !== p), their = Q.power(iso) * 1.25 + defenders.reduce((s, x) => s + Q.power(x) * .6, 0), reach = Q.canReach(p, iso);
  const myWar = S().wars.find(w => (w.att.includes(p) && w.def.includes(iso)) || (w.def.includes(p) && w.att.includes(iso)));
  const lead = myWar && (myWar.att[0] === p || myWar.def[0] === p), sc = myWar ? (myWar.att.includes(p) ? myWar.score : -myWar.score) : 0;
  return `<header class="sheet-head">${portrait(iso)}<div><p class="eyebrow">Acciones con</p><h2>${fl(iso)} ${cname(iso)}</h2><small class="mut">${esc(c.lider.n)} · relación ${sgn(r)} (${relWord(r)}) · tienes ${S().pol.cp} CP y ${money(P.tr)}</small></div></header>
  <div class="sheet scroll" data-sc="sheet">
    ${war ? `<h4>Guerra en curso</h4>${row('Marcador de la guerra', `${sc >= 0 ? 'Vas ganando' : 'Vas perdiendo'} (${sgn(sc)}). ${lead ? 'Tú decides cuándo termina.' : 'No lideras esta guerra: solo puedes retirarte.'}`, lead ? `${B('Paz blanca', 'peace', `data-w="${myWar.id}" data-k="blanca"`)}${B('Paz con lo ocupado', 'peace', `data-w="${myWar.id}" data-k="actual"`)}${B('Rendirte', 'peace', `data-w="${myWar.id}" data-k="rendicion"`, 'red', 1)}` : B('Retirarte', 'peace', `data-w="${myWar.id}" data-k="blanca"`, 'red', 1))}` : `
    <h4>Tratados</h4>${treaties}
    <h4>Encuentros</h4>
    ${row('Viaje diplomático', 'Vas a su capital: mejora la relación (+5 a +10). Con países hostiles puede salir mal.', B('Viajar · 1 CP', 'visit'))}
    ${row('Invitar a su líder', 'Recepción en tu capital: mejora la relación y da algo de prestigio en casa.', B('Invitar · 1 CP', 'invite'))}
    <h4>Dar ayuda</h4>
    ${row('Ayuda económica', `Regalar el 1% de su PIB (${money(c.gdp * .01)}) vale unos +30 de relación.`, `${inp('sh:eco', Math.max(.1, Math.min(Math.round(c.gdp * .05) / 10, Math.floor(P.tr) / 10)), 'type="number" min="0.1" step="0.1" class="w70" aria-label="Importe"')}${B('Enviar', 'aid', 'data-kind="eco"')}`)}
    ${row('Ayuda material', 'Envías materias primas de tus reservas.', `${sel('sh:mk', comOpts, 'pet')}${inp('sh:mq', 5, 'type="number" min="1" class="w50" aria-label="Unidades"')}${B('Enviar', 'aid', 'data-kind="mat"')}`)}
    ${row('Ayuda militar', 'Transfieres el 10% de tus unidades de una categoría. Sus enemigos lo recordarán.', `${sel('sh:mc', Object.entries(D.CATS), 'tierra')}${B('Enviar', 'aid', 'data-kind="mil"', '', 1)}`)}
    <h4>Pedir ayuda</h4>
    ${row('Solicitar ayuda', 'Dinero (relación 40), materias primas (si las producen) o tropas (solo aliados, relación 55). Quedas debiendo un favor.', `${B('Dinero', 'askAid', 'data-kind="eco"')}${sel('sh:ak', Object.keys(D.COMMODITIES).map(k => [k, D.COMMODITIES[k].n]), 'pet')}${B('Material', 'askAid', 'data-kind="mat"')}${B('Tropas', 'askAid', 'data-kind="mil"')}`)}
    <h4>Comercio</h4>
    ${row('Contrato de exportación', 'Suministro fijo durante 8 turnos a precio +10%. Incumplirlo daña la relación.', `${sel('sh:ck', comOpts, 'pet')}${inp('sh:cq', 2, 'type="number" min="1" class="w50" aria-label="Unidades por turno"')}${B('Firmar', 'contract')}`)}
    <h4>Presión y presencia</h4>
    ${Q.sanctioned(p, iso) ? row('Sanciones', 'Las tienes activas contra este país.', B('Levantar', 'lift')) : row('Sanciones', 'Frena su economía y corta el comercio. Sus aliados se enfadan; sus rivales te lo agradecen.', B('Sancionar · 2 CP', 'sanction', '', 'red', 1))}
    ${row('Base estratégica', `Tropas tuyas en su suelo (${money(5 * Q.costLvl(iso) + 2)}): te da alcance militar en ${esc(D.REGIONS[D.C[iso].region])}. Exige alianza o relación de 70.`, S().bases.some(b => b.by === p && b.in === iso) ? '<span class="chip gold">Establecida</span>' : B('Pedir base · 2 CP', 'base'))}
    <h4>Territorio por tratado</h4>
    ${theirT.length > 1 ? row('Comprar territorio', `Solo entre vecinos y con relación de 55. Precio: ${money(c.gdp / Math.max(1, Q.ownCount(iso)) * 6)}.`, `${sel('sh:bt', theirT, theirT[0][0])}${B('Ofrecer · 3 CP', 'buyTerr', '', '', 1)}`) : ''}
    ${myT.length > 1 ? row('Ceder territorio', 'Les entregas una región tuya: +35 de relación, y un disgusto serio en casa.', `${sel('sh:ct', myT, myT[0][0])}${B('Ceder', 'cedeTerr', '', 'red', 1)}`) : ''}
    <h4>Guerra</h4>
    ${row('Declarar la guerra', reach ? `Tu fuerza: ${Math.round(Q.power(p))}. La suya defendiendo: ${Math.round(their)}${defenders.length ? ` contando a ${defenders.length} aliado${defenders.length > 1 ? 's' : ''} que pueden intervenir` : ''}. ${Q.hasExplicit('pna', p, iso) || Q.alliesOf(p).includes(iso) ? 'Romperías un pacto: el mundo entero lo recordará.' : ''}` : 'Fuera de tu alcance: necesitas frontera común, una armada mayor o una base en su región.', B('Declarar guerra · 4 CP', 'declareWar', reach ? '' : 'disabled', 'red', 1))}
    <h4>Operaciones encubiertas <small class="mut">tu red aquí: nivel ${Q.spyNet(iso)} de 3</small></h4>
    ${Object.keys(D.SPYOPS).map(k => { const o = D.SPYOPS[k]; return row(`${o.n} <span class="chip ${Q.spyOdds(iso, k) >= .6 ? 'good' : Q.spyOdds(iso, k) < .4 ? 'bad' : ''}">${Math.round(Q.spyOdds(iso, k) * 100)}% de éxito</span>`, `${o.d} Si falla, ${Math.round(o.risk * 100)}% de que te descubran.`, B(`${money(Q.spyCost(iso, k))} · ${o.cp} CP`, 'spy', `data-op="${k}"`, k === 'gol' || k === 'sab' || k === 'des' ? 'red' : '', k === 'gol')); }).join('')}
    ${sheetExtra(iso)}
    <h4>Salida personal</h4>
    ${row('Pedir asilo', 'Abdicas y te exilias aquí. Termina la partida. Necesitas relación de 30.', B('Pedir asilo', 'asylum', '', 'ghost', 1))}`}
  </div>`;
}
H.dipOpen = d => { for (const k in UI.form) if (k.startsWith('sh:')) delete UI.form[k]; UI.sheet = d.iso; openModal(sheetHTML(d.iso), true, 'wide'); };
const sheetAct = (name, args) => { const iso = UI.sheet; act(name, args); if (UI.sheet && S() && !S().over && $('#modal .sheet')) openModal(sheetHTML(iso), true, 'wide'), UI.sheet = iso; };
H.propose = d => sheetAct('propose', { iso: d.iso, t: d.t });
H.breakT = d => sheetAct('breakTreaty', { iso: d.iso, t: d.t });
H.visit = d => sheetAct('visit', { iso: d.iso }); H.invite = d => sheetAct('invite', { iso: d.iso });
H.aid = d => sheetAct('giveAid', d.kind === 'eco' ? { iso: d.iso, kind: 'eco', v: +fv('sh:eco', 1) } : d.kind === 'mat' ? { iso: d.iso, kind: 'mat', k: fv('sh:mk', 'pet'), v: +fv('sh:mq', 5) } : { iso: d.iso, kind: 'mil', k: fv('sh:mc', 'tierra'), v: .1 });
H.askAid = d => sheetAct('askAid', { iso: d.iso, kind: d.kind, k: fv('sh:ak', 'pet') });
H.contract = d => sheetAct('contract', { iso: d.iso, k: fv('sh:ck', 'pet'), q: +fv('sh:cq', 2) });
H.sanction = d => sheetAct('sanction', { iso: d.iso }); H.lift = d => sheetAct('lift', { iso: d.iso }); H.base = d => sheetAct('base', { iso: d.iso });
H.buyTerr = d => { const c = CC(d.iso), def = c.terr.findIndex((t, i) => i > 0 && t.o === d.iso); sheetAct('buyTerr', { iso: d.iso, i: +fv('sh:bt', def) }); };
H.cedeTerr = d => { const def = CC(me()).terr.findIndex((t, i) => i > 0 && t.o === me()); sheetAct('cedeTerr', { iso: d.iso, i: +fv('sh:ct', def) }); };
H.declareWar = d => { closeModal(); act('declareWar', { iso: d.iso }); };
H.peace = d => { sheetAct('peace', { w: +d.w, kind: d.k }); if (!Q.atWar(me(), d.iso)) closeModal(); };
H.asylum = d => { closeModal(); act('asylum', { iso: d.iso }); };
H.spy = d => sheetAct('spy', { iso: d.iso, op: d.op });

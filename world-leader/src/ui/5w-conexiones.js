/* =====================================================================
   INTERFAZ · CONEXIONES (mapa de causas) Y «¿QUÉ PROVOCA?» DE CADA LEY
   Nación → Conexiones: eliges cualquier palanca, indicador o resultado y
   ves, a izquierda, qué lo mueve y, a derecha, a qué afecta. Tocar una
   tarjeta navega por la cadena. El grafo se construye con las mismas
   tablas del motor (D.NAT, D.SECINT, D.SOC), así que nunca se desfasa.
   ===================================================================== */
PTABS.nac.splice(1, 0, ['con', 'Conexiones']);
{ const n0 = PANELS.nac; PANELS.nac = t => t === 'con' ? cxHTML() : n0(t); }
const NTD = D.NAT, NIXK = Object.keys(D.NAT_IX), BUDN = { seg: 'Seguridad y justicia', edu: 'Educación', sal: 'Salud', inf: 'Infraestructura', soc: 'Programas sociales' };
function cxModel() { const N = Q.natInfo(), So = Q.socInfo(), Sc = Q.secInfo(), s = S(), E = NTD.eff, nodes = {}, edges = [];
  const node = (id, kind, n, icon, go, val, tone) => { nodes[id] = { id, kind, n, icon, go, val, tone: tone || '' }; };
  const edge = (a, b, w, why) => { if (w) edges.push({ a, b, w, why }); };
  for (const b in NTD.bud) node('b:' + b, 'lev', 'Gasto: ' + BUDN[b], D.NAT_IX[b] ? D.NAT_IX[b].ic : 'oro', ['nac', 'gas'], Math.round(N.bud[b] * 100) + '%');
  node('pol', 'lev', 'Policía', 'seg', ['nac', 'seg'], `sueldos ${Math.round(N.pay * 100)}% · equipo ${N.eq}/${NTD.police.eq.max}`);
  node('army', 'lev', 'Ejército en las calles', 'tan', ['nac', 'seg'], `${N.army.length} región${N.army.length === 1 ? '' : 'es'}`);
  node('surv', 'lev', 'Vigilancia interna', 'ojo', ['nac', 'int'], D.SECINT.surv.n[Sc.surv].replace('Sin vigilancia interna', 'Apagada'));
  node('laws', 'lev', 'Leyes vigentes', 'acuerdo', ['pol', 'ley'], `${Object.keys(s.pol.laws).length} en vigor`);
  node('cart', 'lev', 'Cárteles', 'ofensiva', ['nac', 'nar'], `${N.cart.length} activo${N.cart.length === 1 ? '' : 's'}`, N.cart.length ? 'bad' : 'good');
  node('unemp', 'lev', 'Desempleo', 'obr', ['eco', 'ind'], `${(So.eco.unemp || 0).toFixed(1)}%`, So.eco.unemp > 10 ? 'bad' : '');
  for (const x of NIXK) { const d = D.NAT_IX[x], v = N.ix[x].v, g = d.bad ? 100 - v : v; node('i:' + x, 'ind', d.n, d.ic, ['nac', 'est'], String(Math.round(v)), g >= 60 ? 'good' : g < 35 ? 'bad' : ''); }
  node('r:grow', 'res', 'Crecimiento', 'eco', ['nac', 'inf'], sgn(So.eco.grow, 2) + ' pp/t', So.eco.grow >= 0 ? 'good' : 'bad');
  node('r:stab', 'res', 'Estabilidad', 'seg', ['pol', 'sec'], String(Math.round(CC(me()).stab)), CC(me()).stab < 40 ? 'bad' : '');
  node('r:elect', 'res', 'Apoyo electoral', 'pre', ['pol', 'ele'], sgn(Math.round(Q.mod('elect') * 10) / 10, 1));
  node('r:sec', 'res', 'Sectores sociales', 'obr', ['pol', 'sec'], `aprobación ${Math.round(Q.approval())}`, Q.approval() < 40 ? 'bad' : '');
  node('r:rp', 'res', 'Investigación', 'tec', ['tec', 'lab'], sgn(Math.round(So.rp * 10) / 10, 1) + ' pts/t');
  for (const b in NTD.bud) for (const x in NTD.bud[b].ix) edge('b:' + b, 'i:' + x, NTD.bud[b].ix[x], 'por cada +100% de gasto');
  edge('pol', 'i:seg', NTD.police.pay.seg + NTD.police.eq.seg, 'sueldos y equipo'); edge('pol', 'i:cor', NTD.police.pay.cor, 'mejores sueldos, menos sobornos'); edge('army', 'i:seg', NTD.army.seg, 'por región con tropas');
  for (const x in D.SECINT.surv.ix) edge('surv', 'i:' + x, D.SECINT.surv.ix[x], 'por nivel de vigilancia');
  for (const x of NIXK) { let w = 0; for (const id in s.pol.laws) w += (NTD.law[id] || {})[x] || 0; edge('laws', 'i:' + x, w, 'suma de tus leyes vigentes'); }
  edge('cart', 'i:cri', NTD.cart.criW * 100, 'crece con su fuerza'); edge('cart', 'i:seg', -8, 'violencia del narco'); edge('unemp', 'i:des', 6, 'por cada 10 pts de paro');
  edge('i:cor', 'i:ins', -2, 'la corrupción mina la confianza'); edge('i:des', 'i:coh', -1.5, 'la desigualdad divide');
  for (const x in E.grow) edge('i:' + x, 'r:grow', E.grow[x] * 1000, 'pesa en el crecimiento'); for (const x in E.stab) edge('i:' + x, 'r:stab', E.stab[x] * 500, 'pesa en la estabilidad'); for (const x in E.elect) edge('i:' + x, 'r:elect', E.elect[x] * 200, 'pesa en las urnas');
  for (const sc in E.sec) edge('i:' + E.sec[sc][0], 'r:sec', E.sec[sc][1] * 800, D.SECTORS[sc].n); edge('i:edu', 'r:rp', 2, 'la educación acumulada hace ciencia');
  const mx = {}; for (const e of edges) { const k = nodes[e.b].kind; mx[k] = Math.max(mx[k] || 0, Math.abs(e.w)); } for (const e of edges) e.s = Math.abs(e.w) / mx[nodes[e.b].kind] >= .6 ? 3 : Math.abs(e.w) / mx[nodes[e.b].kind] >= .25 ? 2 : 1;
  for (const e of edges) { const T = nodes[e.b], bad = T.id.startsWith('i:') && D.NAT_IX[T.id.slice(2)].bad; e.good = (e.w > 0) !== !!bad; }
  return { nodes, edges, N }; }
const arrows = e => `<span class="cx-ar ${e.good ? 'good' : 'bad'}" title="${esc(e.why)}">${(e.w > 0 ? '▲' : '▼').repeat(e.s)}</span>`;
function cxCard(n, e, dir) { return `<button class="cx-card ${n.tone}" data-a="cxGo" data-id="${n.id}"><span class="hico">${gi(n.icon)}</span><span class="grow"><b>${esc(n.n)}</b><small>${esc(n.val)}${e ? ' · ' + esc(e.why) : ''}</small></span>${e ? arrows(e) : ''}</button>`; }
function cxHTML() { const M = cxModel(), id = M.nodes[UI.cx] ? UI.cx : 'i:seg', n = M.nodes[id], inc = M.edges.filter(e => e.b === id), out = M.edges.filter(e => e.a === id);
  const grp = (k, t) => `<div class="cx-pick"><small>${t}</small>${Object.values(M.nodes).filter(x => x.kind === k).map(x => `<button class="chip ${x.id === id ? 'gold' : ''}" data-a="cxGo" data-id="${x.id}">${esc(x.n.replace('Gasto: ', ''))}</button>`).join('')}</div>`;
  const X = id.startsWith('i:') ? id.slice(2) : null, why = X ? M.N.ix[X].why : [];
  const laws = X ? Object.entries(NTD.law).filter(([, v]) => v[X]).sort((a, b) => Math.abs(b[1][X]) - Math.abs(a[1][X])).slice(0, 8).map(([lid, v]) => { const l = D.LAWS.find(q => q.id === lid); if (!l) return ''; const on = S().pol.laws[lid] != null, g = (v[X] > 0) !== !!D.NAT_IX[X].bad;
    return `<button class="chip ${on ? 'gold' : g ? 'good' : 'bad'}" data-a="cxLaw" data-id="${lid}" title="${on ? 'Vigente' : 'Disponible'}">${on ? '✓ ' : ''}${esc(l.n)} ${sgn(v[X])}</button>`; }).join('') : '';
  return `<p class="mut fine">Toca cualquier tarjeta para seguir la cadena: de lo que decides, a lo que cambia en el país, a lo que acaba pasando contigo.</p>
    <details class="cx-det" ${innerWidth > 760 ? 'open' : ''}><summary>Elegir otra tarjeta · ahora: <b>${esc(n.n)}</b></summary>${grp('lev', 'Palancas')}${grp('ind', 'Indicadores')}${grp('res', 'Resultados')}</details>
    <div class="cx-grid"><div class="cx-col"><h4>${inc.length ? 'Lo mueve' : 'Tú lo decides'}</h4>${inc.map(e => cxCard(M.nodes[e.a], e)).join('') || '<p class="mut fine">Es una palanca: se cambia desde su menú.</p>'}</div>
      <div class="cx-mid"><div class="card cx-now ${n.tone}"><span class="hico big">${gi(n.icon)}</span><b>${esc(n.n)}</b><em>${esc(n.val)}</em>${X ? `<small class="mut">${esc(D.NAT_IX[X].d)}</small>` : ''}
        ${why.length ? `<div class="chips">${why.map(w => `<span class="chip ${(w[0] > 0) !== !!(X && D.NAT_IX[X].bad) ? 'good' : 'bad'}">${sgn(w[0])} ${esc(w[1])}</span>`).join('')}</div>` : ''}
        <button class="btn sm gold" data-a="goTab" data-p="${n.go[0]}" data-t="${n.go[1]}">Abrir en su menú</button></div>
        ${laws ? `<h4>Leyes que lo mueven</h4><div class="chips">${laws}</div>` : ''}</div>
      <div class="cx-col"><h4>${out.length ? 'Afecta a' : 'Es un resultado'}</h4>${out.map(e => cxCard(M.nodes[e.b], e)).join('') || '<p class="mut fine">Aquí acaba la cadena: es lo que notas en la partida.</p>'}</div></div>
    <p class="mut fine">▲ sube ▼ baja. Verde: bueno para ti. Rojo: malo para ti. Más flechas, más peso.</p>`; }
H.cxGo = d => { UI.cx = d.id; UI.render(); };
H.cxLaw = d => { const l = D.LAWS.find(x => x.id === d.id); if (!l) return; UI.form['pl:cat'] = l.cat; H.hubGo({ p: 'pol', t: 'ley' }); };
/* «¿Qué provoca?» en cada ley: todos los efectos agrupados y con su porqué */
{ const le0 = lawExtra; lawExtra = (l, on) => { const nl = NTD.law[l.id], dp = Object.entries(D.DEBATES).filter(([, b]) => b.pro.includes(l.id) || b.con.includes(l.id));
  const chips = nl ? Object.keys(nl).map(x => { const bad = D.NAT_IX[x].bad; return [`${D.NAT_IX[x].n} ${sgn(nl[x])}`, (nl[x] > 0) !== !!bad ? 1 : -1]; }) : [];
  return `<div class="row wrap">${chips.length ? `<small class="mut">En el país:</small>${fxChips(chips)}` : ''}<button class="btn sm ghost" data-a="lawFx" data-id="${l.id}">${gi('ojo')} ¿Qué provoca?</button></div>` + le0(l, on); }; }
H.lawFx = d => { const l = D.LAWS.find(x => x.id === d.id); if (!l) return; const s = S(), nl = NTD.law[l.id] || {}, sec = Object.keys(l.sec || {}), per = Object.keys(l.per || {}), rep = Object.keys(l.rep || {});
  const sect = (t, ic, body) => body ? `<div class="lfx"><h4>${gi(ic)} ${t}</h4>${body}</div>` : '';
  const debs = Object.entries(D.DEBATES).filter(([, b]) => b.pro.includes(l.id) || b.con.includes(l.id)).map(([k, b]) => { const side = b.pro.includes(l.id) ? 1 : -1, o = s.soc ? s.soc.op[k] : 0, clash = side * o < 0;
    return `<div class="arow"><span class="grow">Te coloca ${side > 0 ? 'a favor de' : 'en contra de'} <b>${esc(b.q)}</b><small class="mut">Opinión actual: ${Math.round(o)}</small></span><span class="chip ${clash ? 'bad' : 'good'}">${clash ? 'Choca con la mayoría' : 'Va con la mayoría'}</span></div>`; }).join('');
  const prog = (a, b) => b ? `<span class="chip ${a > 0 ? 'good' : 'bad'}">${esc(b)}</span>` : '';
  openModal(`<h2>${esc(l.n)}</h2><p class="mut">${esc(l.d)}</p>
    ${sect('Al aprobarla (sectores)', 'obr', sec.length ? `<div class="chips">${fxChips(sec.map(k => [D.SECTORS[k].n + ' ' + sgn(l.sec[k]), l.sec[k]]))}</div><small class="mut">Cambia la línea base de cada sector: su apoyo tiende hacia ella poco a poco.</small>` : '')}
    ${sect('Cada turno (economía)', 'eco', per.length ? `<div class="chips">${fxChips(per.map(k => PERN[k](l.per[k])))}</div>` : '')}
    ${sect('En el país (lento)', 'seg', Object.keys(nl).length ? `<div class="chips">${Object.keys(nl).map(x => `<button class="chip ${(nl[x] > 0) !== !!D.NAT_IX[x].bad ? 'good' : 'bad'}" data-a="cxGoClose" data-id="i:${x}">${esc(D.NAT_IX[x].n)} ${sgn(nl[x])}</button>`).join('')}</div><small class="mut">Toca uno para ver a qué afecta ese indicador.</small>` : '')}
    ${sect('Reputación', 'ojo', rep.length ? `<div class="chips">${fxChips(rep.map(k => [Q.REPN[k] + ' ' + sgn(l.rep[k]), l.rep[k]]))}</div>` : '')}
    ${sect('Opinión pública', 'jov', debs)}
    ${sect('Al momento', 'check', l.once ? `<div class="chips">${fxChips(Q.describeFx(l.once))}</div>` : '')}
    <div class="row end"><button class="btn" data-a="closeModal">Cerrar</button></div>`, true); };
H.cxGoClose = d => { closeModal(); UI.cx = d.id; H.hubGo({ p: 'nac', t: 'con' }); };

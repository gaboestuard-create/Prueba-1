/* =====================================================================
   INTERFAZ · CARRERA TECNOLÓGICA, potencias científicas y promesas
   de leyes a otros países.
   ===================================================================== */
Object.assign(GI, {
  hoja: 'M20 3C9 3 4 8 4 15c0 2 .5 4 1.5 5.5L4 22h1.6l1.3-1.3C8.5 21.5 10 22 12 22c6 0 9-6 8-19zM7.5 18.5C10 14 13 11 17 8.5 13.5 12 11 15 8.5 19.5z',
  rayo: 'M13.500 1L4 14h6.500L9.500 23 20 9.500h-6.500z',
  cohete: 'M12 1.500c3 2 5 6 5 10.500l2.500 3V20l-4-2h-7l-4 2v-5.500l2.500-3C7 7.500 9 3.500 12 1.500zM9.800 19h4.400L12 22.500z' + ring(12, 9, 2),
  matraz: 'M8.500 2h7v1.800h-1.300v5.400l5.600 9.300A2.300 2.300 0 0117.800 22H6.200a2.300 2.300 0 01-2-3.500l5.600-9.300V3.800H8.500zM7.500 15.500l-1.700 2.900c-.2.400.1.800.5.800h11.400c.4 0 .7-.4.5-.8l-1.700-2.900z'
});
const DFI = { dig: 'tec', sal: 'sal', amb: 'hoja', ene: 'rayo', mil: 'tan', esp: 'cohete' };
Object.assign(INN, { alq: 'Alquiler de bases extranjeras' }); Object.assign(EXN, { ide: 'Investigación y desarrollo' });
Object.assign(MODN, { spy: v => `Espionaje +${Math.round(v * 30)}%`, rp: v => `Laboratorios +${v} pts` });
PTABS.tec = [['lab', 'Laboratorios'], ['car', 'Carrera mundial'], ['pot', 'Potencias científicas']];
{ const t0 = PANELS.tec; PANELS.tec = t => t === 'car' ? raceHTML() : t === 'pot' ? potHTML() : t0(t); }
const dfx = x => Object.keys(x.per || {}).map(k => PERN[k](x.per[k])[0]).concat(Object.keys(x.m || {}).map(k => MODN[k] ? MODN[k](x.m[k]) : '')).filter(Boolean).join(' · ');
function raceHTML() {
  const s = S(), p = me(), R = Q.raceInfo(), D2 = s.disc, pts = Q.rdPts(p), cur = D2.cur && Q.DS[D2.cur], ci = cur && R.find(r => r.id === cur.id), mine = R.filter(r => r.own.includes(p)).length, firsts = R.filter(r => r.own[0] === p).length;
  const bars = r => `<div class="race">${r.own.includes(p) ? '' : `<div class="rb me"><i></i><span>Tú</span>${bar(r.mine, r.cost, 'gold')}<small>${Math.round(r.mine / r.cost * 100)}%</small></div>`}${r.lead.map(l => `<div class="rb">${fl(l.iso)}<span>${cname(l.iso)}</span>${bar(l.p * 100, 100, 'red')}<small>${Math.round(l.p * 100)}%</small></div>`).join('')}</div>`;
  return `<div class="kvs big">${kv('Tu I+D', pts.toFixed(1) + ' pts/turno')}${kv('Presupuesto', D2.rd + '% del PIB · ' + money(CC(p).gdp * D2.rd / 400) + '/t')}${kv('Dominas', mine + ' de ' + R.length)}${kv('Primero del mundo', firsts)}</div>
    <div class="arow"><div class="grow"><b>${gi('matraz')} Presupuesto nacional de I+D</b><small>Más dinero, más rápido. Los países ricos investigan más por habitante; los regímenes de partido único concentran recursos. Tus laboratorios del árbol y las leyes de educación también suman.</small></div><div class="chips">${[0, .5, 1, 2, 3].map(v => `<button class="chip ${D2.rd === v ? 'gold' : ''}" data-a="rdB" data-v="${v}">${v}%</button>`).join('')}</div></div>
    ${cur ? `<div class="card disc-cur">${gi(DFI[cur.f], 'xl')}<div class="grow"><small>Proyecto nacional</small><h3>${esc(cur.n)}</h3>${bars(ci)}<small class="mut">Faltan unos ${Math.max(1, Math.ceil((ci.cost - ci.mine) / Math.max(.1, pts)))} turnos${ci.own.length ? ` · ya lo tienen ${ci.own.length} países: te cuesta la mitad, pero pagarás licencia a ${cname(ci.own[0])}` : ' · nadie lo tiene aún: si llegas primero, cobrarás licencias a todos'}</small></div></div>` : '<p class="warn-box">Tu programa nacional no tiene objetivo: tus puntos de I+D se pierden. Elige un descubrimiento.</p>'}
    <p class="mut">El primero en lograr cada avance gana prestigio, cobra licencias a quien llegue después y, a veces, mueve los mercados del mundo. Los avances militares los usan también tus rivales: una potencia con satélites espía y misiles hipersónicos puede atacar a cualquier país.</p>
    ${Object.keys(D.DFIELDS).map(f => `<h4>${gi(DFI[f])} ${D.DFIELDS[f]}</h4><div class="dgrid">${D.DISC.filter(x => x.f === f).map(x => { const r = R.find(y => y.id === x.id), own = r.own.includes(p), lock = !own && !r.open;
      return `<article class="disc ${own ? 'own' : ''} ${D2.cur === x.id ? 'cur' : ''} ${lock ? 'locked' : ''}"><div class="row">${gi(DFI[f])}<h3>${esc(x.n)}</h3>${r.own[0] ? `<span class="chip ${r.own[0] === p ? 'gold' : ''}" title="Primero en lograrlo">1.º ${flag(r.own[0])}</span>` : ''}</div><small>${esc(x.d)}</small><small class="pro">${dfx(x)}</small>
        ${r.own.length > 1 ? `<div class="owners">${r.own.slice(1, 9).map(z => flag(z)).join('')}${r.own.length > 9 ? '…' : ''}</div>` : ''}${own ? '<span class="chip good">Dominado</span>' : bars(r)}
        ${own ? '' : lock ? `<small class="mut">Requiere: ${esc(Q.DS[x.req].n)}</small>` : D2.cur === x.id ? '<span class="chip gold">Investigando</span>' : `<button class="btn sm gold" data-a="disc" data-id="${x.id}">Investigar · ${r.cost} pts</button>`}</article>`; }).join('')}</div>`).join('')}`;
}
function potHTML() {
  const L = Q.sciRank(), p = me();
  return `<p class="mut">Quién invierte más en ciencia. Lo que investiga cada país es secreto: solo lo ves si tienes una red de espías allí.</p>
    <div class="list sci">${L.map((r, i) => `<button class="li ${r.iso === p ? 'mine' : ''}" data-a="sel" data-iso="${r.iso}"><b class="num rank">${i + 1}</b>${fl(r.iso)}<span class="grow">${cname(r.iso)}<small class="mut">${r.t === '?' ? 'Investiga: secreto' : r.t ? 'Investiga: ' + esc(Q.DS[r.t].n) : 'Sin proyecto'}</small></span><span class="chip">${gi('matraz')} ${r.pts.toFixed(1)}/t</span><span class="chip" title="Descubrimientos dominados">${r.n}</span><span class="chip ${r.first ? 'gold' : ''}" title="Primero del mundo">1.º ×${r.first}</span></button>`).join('')}</div>`;
}
H.rdB = d => act('rdBudget', { v: +d.v }); H.disc = d => act('discover', { id: d.id });
/* promesas de leyes hechas a otros países */
{ const le0 = lawExtra; lawExtra = (l, on) => { const f = Q.fdem().find(x => x.law === l.id); return (f ? `<div class="row wrap"><span class="chip gold">${flag(f.iso)} Se lo prometiste a ${cname(f.iso)}: ${f.until - S().turn} t</span></div>` : '') + le0(l, on); }; }

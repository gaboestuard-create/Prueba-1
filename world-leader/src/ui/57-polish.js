/* =====================================================================
   INTERFAZ · PULIDO: capital político y agenda, ciclo de vida de las
   leyes, elecciones regionales, misiones y disuasión, teletipo de
   noticias y viajes de otros países en el globo.
   ===================================================================== */
Object.assign(PK, { review: 'Revisión de una ley', oppbill: 'Iniciativa de la oposición' });

/* ---------- POLÍTICA ---------- */
function cpHTML() {
  const g = Q.govInfo(), pol = S().pol, t = S().turn;
  const dem = g.dem.map(d => { const l = D.LAWS.find(x => x.id === d.law), left = d.until - t; return `<div class="arow demand"><div class="grow"><b>${D.SECTORS[d.k].n} exigen: ${esc(l.n)}</b><small>Si la apruebas en ${left} trimestre${left > 1 ? 's' : ''}: +8 con ellos. Si no: −9.</small></div><span class="chip ${left <= 1 ? 'bad' : 'gold'}">${left} t</span><button class="btn sm gold" data-a="lawJump" data-id="${l.id}">Ver ley</button></div>`; }).join('');
  return `<div class="card cpcard"><div class="row"><div class="grow"><small>Capital político</small><h3>${pol.cp} de 12 · <span class="${g.regen >= 2 ? 'up' : 'down'}">+${g.regen} por turno</span></h3></div><button class="btn sm" data-a="cabinet" ${t - g.cab < 8 ? 'disabled' : ''} title="+3 a todos los sectores y +3 de estabilidad">Remodelar gabinete · 3 CP${t - g.cab < 8 ? ` (en ${8 - (t - g.cab)} t)` : ''}</button></div>
    <div class="chips">${g.parts.map(x => `<span class="chip ${x[1] > 0 ? 'good' : 'bad'}">${esc(x[0])} ${sgn(x[1])}</span>`).join('')}</div>
    ${g.idle > 5 ? `<p class="warn-box">Llevas ${g.idle} trimestres sin aprobar ninguna ley: la parálisis te resta apoyo cada turno.</p>` : ''}<small class="mut">${g.laws} leyes vigentes. A partir de ${D.GOV.lawLoad}, cada 3 leyes más restan 1 CP por turno: gobernar mucho cansa. Los beneficios de una ley se dan por sentados con los años; los agravios no se olvidan.</small></div>
    ${dem ? `<h4>Exigencias con plazo</h4>${dem}` : ''}`;
}
const _polPanel2 = PANELS.pol;
PANELS.pol = t => t === 'ley' ? cpHTML() + _polPanel2(t) : t === 'reg' ? regElHTML() + _polPanel2(t) : t === 'sec' ? _polPanel2(t) + commHTML() : _polPanel2(t);
H.lawJump = d => { const l = D.LAWS.find(x => x.id === d.id); UI.form['pl:cat'] = l.cat; UI.render(); };
H.cabinet = () => act('cabinet');
{ const le0 = lawExtra;
  lawExtra = (l, on) => {
    const pol = S().pol, t = S().turn, g = Q.govInfo(), x = (g.lx || {})[l.id] || {}, b = [];
    if (on && l.build && Q.lawBuilding(l.id)) b.push(`<span class="chip gold">En obras: inaugura en ${l.build - (t - pol.laws[l.id])} t</span>`);
    if (on && x.exp) b.push(`<span class="chip ${x.exp - t <= 1 ? 'bad' : ''}">Caduca en ${x.exp - t} t</span>`);
    if (on) b.push(`<span class="chip">Vigente desde hace ${t - pol.laws[l.id]} t</span>`);
    if (!on && l.build) b.push(`<span class="chip gold">Obra de ${l.build} trimestres: paga desde el inicio, rinde al terminar</span>`);
    if (!on && l.grp && (g.lock[l.grp] || 0) > t) b.push(`<span class="chip bad">Tema bloqueado ${g.lock[l.grp] - t} t: el congreso acaba de legislar sobre esto</span>`);
    if (g.dem.some(d => d.law === l.id)) b.push('<span class="chip gold">Te la están exigiendo</span>');
    const sun = !on && !l.build && (pol.cool[l.id] || 0) <= t ? `<button class="btn sm" data-a="lawSun" data-id="${l.id}" title="+10% de apoyo; caduca en ${D.GOV.sunset} trimestres salvo prórroga">Con caducidad · 2 CP</button>` : '';
    return (b.length || sun ? `<div class="row wrap">${b.join('')}${sun}</div>` : '') + le0(l, on);
  };
}
H.lawSun = d => act('proposeLaw', { id: d.id, mode: 'normal', sunset: 1 });
function commHTML() { const pol = S().pol, t = S().turn; return `<h4>Campañas de comunicación <small class="mut">1 CP y ${money(CC(me()).gdp * .0004)}: +4 con un sector; cada sector puede recibir una cada 3 turnos</small></h4><div class="chips">${Object.keys(pol.sec).map(k => `<button class="chip ${(pol.comm[k] || 0) > t ? '' : 'gold'}" data-a="comm" data-k="${k}" ${(pol.comm[k] || 0) > t || pol.cp < 1 ? 'disabled' : ''}>${D.SECTORS[k].n}${(pol.comm[k] || 0) > t ? ' · ' + (pol.comm[k] - t) + ' t' : ''}</button>`).join('')}</div>`; }
H.comm = d => act('commSector', { k: d.k });
function regElHTML() {
  if (!Q.isDem()) return ''; const t = S().turn, c = CC(me()), rul = Q.rulingTag(), up = c.terr.map((x, i) => [x, i]).filter(x => x[1] > 0 && x[0].o === me() && x[0].el != null && x[0].el - t <= 3).sort((a, b) => a[0].el - b[0].el);
  return `<h4>Elecciones regionales próximas</h4>${up.map(([x, i]) => `<div class="arow"><div class="grow"><b><i class="dot" style="background:${rgbCss(partyColor(x.p))}"></i>${esc(x.n)}</b><small>Gobierna ${esc(x.p || '—')}${x.p === rul ? ' (tu partido)' : ''} · vota en ${x.el - t} trimestre${x.el - t === 1 ? '' : 's'}${x.camp ? ' · campaña hecha (+' + x.camp + ')' : ''}</small></div>${x.camp ? '' : `<button class="btn sm gold" data-a="regCamp" data-i="${i}">Volcar la campaña · 1 CP</button>`}</div>`).join('') || '<p class="mut">Ninguna en los próximos 3 trimestres. Cada región vota cada 4 años, de forma escalonada.</p>'}`;
}
H.regCamp = d => act('regCampaign', { i: +d.i });

/* ---------- EJÉRCITO: preparación, misiones y disuasión ---------- */
PTABS.mil.splice(1, 0, ['mis', 'Misiones']);
const _milPanel = PANELS.mil;
PANELS.mil = t => {
  if (t !== 'mis') return _milPanel(t);
  const s = S(), m = s.mil, p = me(), dt = Q.deterrence(), cs = Object.keys(s.c).filter(i => i !== p && CC(i).alive).sort((a, b) => CC(a).n.localeCompare(CC(b).n));
  const tgtOpts = k => { const M = D.MISSIONS[k]; return M.tgt === 'vecino' ? Q.nb(p).map(i => [i, CC(i).n]) : M.tgt === 'aliado' ? Q.alliesOf(p).map(i => [i, CC(i).n]) : M.tgt === 'cualquiera' ? cs.map(i => [i, CC(i).n]) : M.tgt === 'guerra' ? s.wars.filter(w => !w.att.includes(p) && !w.def.includes(p)).map(w => [w.id, `${CC(w.att[0]).n} contra ${CC(w.def[0]).n}`]) : []; };
  return `<div class="kvs big">${kv('Preparación', Math.round(m.ready) + '/100', 'Baja en paz; sube con maniobras y en guerra')}${kv('Efecto en tu fuerza', '×' + Q.readyMult().toFixed(2))}${kv('Fuerzas en misiones', Math.round(Q.committed() * 100) + '%')}${kv('Mantenimiento', money(Q.upkeep(p)) + ' /t')}</div>
    <div class="arow"><div class="grow"><b>Maniobras nacionales</b><small>+15 de preparación. Un ejército que no entrena se oxida (−1.5 por turno en paz) y combate peor.</small></div><button class="btn gold" data-a="drill" ${m.drill === s.turn ? 'disabled' : ''}>Maniobras · 1 CP · ${money(Q.upkeep(p) * .6 + .2)}</button></div>
    <h4>Misiones en curso <small class="mut">${m.miss.length} de 3</small></h4>${m.miss.map((x, i) => `<div class="arow"><div class="grow"><b>${D.MISSIONS[x.k].n}${x.t && s.c[x.t] ? ' · ' + cname(x.t) : x.k === 'paz' && Q.warById(+x.t) ? ' · ' + cname(Q.warById(+x.t).att[0]) + ' / ' + cname(Q.warById(+x.t).def[0]) : ''}</b><small>${D.MISSIONS[x.k].d} Desde hace ${s.turn - x.s} t.</small></div><button class="btn sm ghost" data-a="missEnd" data-i="${i}">Terminar</button></div>`).join('') || '<p class="mut">Ninguna: tus tropas solo cuestan dinero.</p>'}
    <h4>Nueva misión</h4>${Object.keys(D.MISSIONS).map(k => { const M = D.MISSIONS[k], o = tgtOpts(k); return `<div class="arow"><div class="grow"><b>${M.n}</b><small>${M.d} Inmoviliza el ${Math.round(M.com * 100)}% de tus fuerzas.</small></div>${M.tgt ? (o.length ? sel('ms:' + k, o, o[0][0]) : '<small class="mut">Sin objetivo posible</small>') : ''}<button class="btn sm" data-a="missGo" data-k="${k}" ${M.tgt && !o.length || m.miss.length >= 3 ? 'disabled' : ''}>Desplegar${k === 'paz' ? ' · 1 CP' : ''}</button></div>`; }).join('')}
    <h4>Disuasión <small class="mut">quién podría atacarte, según tus estados mayores</small></h4>
    ${dt.slice(0, 10).map(d => `<button class="li" data-a="sel" data-iso="${d.iso}">${fl(d.iso)}<span class="grow">${cname(d.iso)} <small class="mut">relación ${sgn(d.rel)} · su fuerza frente a la tuya ×${d.ratio.toFixed(2)}</small></span><span class="chip ${d.risk === 'alto' ? 'bad' : d.risk === 'medio' ? 'gold' : 'good'}">riesgo ${d.risk}</span></button>`).join('') || '<p class="mut">Nadie en tu entorno tiene ni el motivo ni la fuerza.</p>'}`;
};
H.drill = () => act('drill'); H.missEnd = d => act('mission', { k: 'interior', end: +d.i });
H.missGo = d => { const M = D.MISSIONS[d.k], v = fv('ms:' + d.k, null), first = (document.getElementById('ms:' + d.k) || {}).value; act('mission', { k: d.k, t: M.tgt === 'guerra' ? '' : v || first, w: M.tgt === 'guerra' ? +(v || first) : null }); };

/* ---------- TELETIPO Y VIAJES DE OTROS PAÍSES ---------- */
const tickerHTML = () => { const n = S().news.slice(-10).reverse(); return n.length ? `<div class="ticker" aria-label="Últimas noticias"><b>Última hora</b><div class="tk"><span>${n.map(x => `${esc(x.x)}`).join('  ◆  ')}</span></div></div>` : ''; };
{ const dock0 = dockHTML; dockHTML = () => dock0() + tickerHTML(); }
UI.aiTrips = [];
Bus.on('aiTrip', t => { UI.aiTrips.push(t); });
Bus.on('turn', () => { const q = UI.aiTrips.splice(0, 6); q.forEach((t, i) => setTimeout(() => Globe.trip({ a: t.a, b: t.b, cargo: t.t === 'com' }), 1400 + i * 650)); UI.aiTrips.length = 0; });

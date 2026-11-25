/* =====================================================================
   INTERFAZ · SOCIEDAD E INFORME DEL PAÍS (Nación → Sociedad, Informe)
   ===================================================================== */
PTABS.nac.push(['soc', 'Sociedad'], ['inf', 'Informe']);
{ const n0 = PANELS.nac; PANELS.nac = t => t === 'soc' ? socHTML() : t === 'inf' ? reportHTML() : n0(t); }
const ofCase = s => s.replace(/ de el /g, ' del ');
function socHTML() { const I = Q.socInfo(), SO = D.SOC, col = v => v > SO.protestAt ? 'red' : v > SO.stabAt ? 'gold' : '';
  const posTxt = p => p > 0 ? '<span class="chip good">Tu gobierno: a favor</span>' : p < 0 ? '<span class="chip bad">Tu gobierno: en contra</span>' : '<span class="chip">Sin ley</span>';
  return `<p class="mut fine">La opinión pública se mueve sola (la educación la empuja) y puedes liderarla con campañas. Tu postura la marcan tus leyes. Si chocas con una mayoría clara, o la mayoría pide una reforma que no haces, crece un movimiento que acaba en la calle.</p>
  <h4>${gi('acuerdo')} Debates</h4>${I.deb.map(d => { const B = D.DEBATES[d.k], o = Math.round(d.op);
    return `<div class="card soc5"><div class="row wrap"><b class="grow">${esc(B.n)}</b>${posTxt(d.pos)}</div>
      <div class="opbar"><i style="left:${(o + 100) / 2}%"></i></div><div class="row"><small class="mut grow">En contra</small><small><b>${o > 0 ? o + ' a favor' : o < 0 ? -o + ' en contra' : 'empate'}</b></small><small class="mut grow" style="text-align:right">A favor</small></div>
      ${d.mv > 5 ? `<div class="arow"><span class="grow">Movimiento en la calle${d.prom ? ` <small class="gold">promesa: ${d.prom} t</small>` : ''}</span>${bar(d.mv, 100, col(d.mv))}<b class="num">${Math.round(d.mv)}</b></div>` : ''}
      <div class="row wrap"><button class="btn sm" data-a="socLead" data-k="${d.k}" data-dir="1" ${d.cd ? 'disabled' : ''}>${esc(ofCase('Campaña a favor de ' + B.q))} · ${SO.lead.cp} CP</button><button class="btn sm ghost" data-a="socLead" data-k="${d.k}" data-dir="-1" ${d.cd ? 'disabled' : ''}>En contra · ${SO.lead.cp} CP</button>${d.cd ? `<small class="mut">otra campaña en ${d.cd} t</small>` : ''}</div></div>`; }).join('')}
  <h4>${gi('obr')} Movimientos sociales</h4>${I.mov.map(m => { const M = D.MOVES[m.k]; return `<div class="arow"><div class="grow"><b>${esc(M.n)}</b><small class="mut">${m.cause > 0 ? esc(M.why) : 'Tranquilos por ahora'}${m.prom ? ` · promesa: ${m.prom} t` : ''}</small></div>${bar(m.mv, 100, col(m.mv))}<b class="num">${Math.round(m.mv)}</b></div>`; }).join('')}
  <h4>${gi('edu')} Educación a largo plazo</h4><div class="card"><div class="arow"><span class="grow">Nivel educativo acumulado</span>${bar(I.eduL, 100, I.eduL >= 60 ? 'green' : I.eduL < 40 ? 'red' : '')}<b class="num">${Math.round(I.eduL)}</b></div>
    <small class="mut">Es la media de muchos años de educación: lo que inviertes hoy se nota dentro de unos 20 turnos. Ahora da ${sgn(Math.round(I.rp * 10) / 10)} puntos de investigación por turno.</small></div>`; }
function reportHTML() { const I = Q.socInfo(), E = I.eco, N = Q.natInfo(), kv = (k, v, cls) => `<div class="arow"><span class="grow">${k}</span><b class="${cls || ''}">${v}</b></div>`;
  const ix = Object.entries(N.ix).map(([k, x]) => [k, x.v, D.NAT_IX[k].bad ? 100 - x.v : x.v]).sort((a, b) => a[2] - b[2]);
  return `<p class="mut fine">Resumen del país para tomar decisiones de un vistazo.</p>
  <h4>${gi('eco')} Economía</h4><div class="card">${kv('PIB', money(E.gdp))}${kv('Crecimiento', sgn(E.grow, 2) + ' pp/turno', E.grow >= 0 ? 'green' : 'red')}${kv('Desempleo', (E.unemp || 0).toFixed(1) + '%', E.unemp > 10 ? 'red' : '')}${kv('Inflación', (E.inf || 0).toFixed(1) + '%', E.inf > 8 ? 'red' : '')}${kv('Deuda', Math.round(E.debt * 100) + '% del PIB', E.debt > 1 ? 'red' : '')}</div>
  <h4>${gi('ext')} Comercio exterior</h4><div class="card">${kv('Tratados comerciales', E.trade.n)}${kv('Ingresos por comercio', money(E.trade.v) + ' / turno', 'green')}${kv('Aranceles', Math.round((E.tar || 1) * 100) + '% de lo normal')}${kv('Sanciones contra ti', E.sancOn, E.sancOn ? 'red' : '')}${kv('Estrechos cerrados', E.strClosed, E.strClosed ? 'red' : '')}</div>
  <h4>${gi('pin')} Lo mejor y lo peor del país</h4><div class="card">${kv('Peor: ' + esc(D.NAT_IX[ix[0][0]].n), Math.round(ix[0][1]), 'red')}${kv('Segundo peor: ' + esc(D.NAT_IX[ix[1][0]].n), Math.round(ix[1][1]), 'red')}${kv('Mejor: ' + esc(D.NAT_IX[ix[ix.length - 1][0]].n), Math.round(ix[ix.length - 1][1]), 'green')}
    ${kv('Cárteles activos', N.cart.length, N.cart.length ? 'red' : '')}${kv('Movimiento social más fuerte', (() => { const all = I.deb.concat(I.mov).sort((a, b) => b.mv - a.mv)[0]; return all.mv > 5 ? esc((D.DEBATES[all.k] || D.MOVES[all.k]).n) + ' · ' + Math.round(all.mv) : 'ninguno'; })())}</div>`; }
H.socLead = d => act('socLead', { k: d.k, dir: +d.dir });

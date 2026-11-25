/* =====================================================================
   INTERFAZ · ESTADO DE LA NACIÓN (botón «Nación» del dock)
   Estado: los nueve indicadores · Gasto: partidas internas ·
   Seguridad: policía y ejército en las calles · Narcotráfico: cárteles.
   ===================================================================== */
IC.nac = 'M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6';
PT.nac = 'Estado de la nación';
PTABS.nac = [['est', 'Estado'], ['gas', 'Gasto'], ['seg', 'Seguridad'], ['nar', 'Narcotráfico']];
Object.assign(EXN, { nat: 'Gasto interno extra (Nación)' }); Object.assign(INN, { natcut: 'Recortes de gasto interno' });
PANELS.nac = t => { const N = Q.natInfo(); if (!N) return '<p class="mut">Sin datos de la nación.</p>'; return t === 'gas' ? natBudHTML(N) : t === 'seg' ? natSegHTML(N) : t === 'nar' ? natNarHTML(N) : natStateHTML(N); };
const natTone = (k, v) => { const good = D.NAT_IX[k].bad ? 100 - v : v; return good >= 60 ? 'green' : good < 35 ? 'red' : ''; };
function natStateHTML(N) {
  return `<p class="mut fine">Cómo está tu país por dentro. Cada indicador persigue su objetivo (la marca ▸): lo mueven el gasto, las leyes, la policía y el crimen. Pesan en el crecimiento, la estabilidad, los sectores y las elecciones.</p>
  <div class="nat5">${Object.entries(D.NAT_IX).map(([k, d]) => { const x = N.ix[k], v = Math.round(x.v), t = Math.round(x.t), arrow = t > v + 1 ? '▲' : t < v - 1 ? '▼' : '■', bad = d.bad ? t > v + 1 : t < v - 1;
    return `<div class="card nat-c"><div class="row"><span>${gi(d.ic)}</span><b class="grow">${esc(d.n)}</b><b class="num ${natTone(k, v)}">${v}</b></div>
      <div class="arow">${bar(v, 100, natTone(k, v))}<small class="${t === v ? 'mut' : bad ? 'red' : 'green'}">${arrow} ${t}</small>${spark(x.h, 70, 22)}</div>
      <small class="mut">${esc(d.d)}</small>${x.why.length ? `<small>${x.why.map(w => `<span class="${(w[0] > 0) !== !!d.bad ? 'green' : 'red'}">${sgn(w[0])}</span> ${esc(w[1])}`).join(' · ')}</small>` : ''}</div>`; }).join('')}</div>`; }
function natBudHTML(N) { const tot = Object.values(N.cost).reduce((a, b) => a + b, 0);
  return `<p class="mut fine">Reparte el dinero entre las partidas. 100% es lo normal: más cuesta cada turno y mejora el indicador poco a poco (la educación tarda años); recortar ahorra ya y lo pagas después.</p>
  ${Object.entries(D.NAT.bud).map(([k, b]) => `<div class="card nat-b"><div class="row"><b class="grow">${esc(b.n)}</b><b class="num" id="natv-${k}">${Math.round(N.bud[k] * 100)}%</b></div>
    <input type="range" min="0" max="200" step="25" value="${Math.round(N.bud[k] * 100)}" data-c="natBud" data-k="${k}" aria-label="${esc(b.n)}">
    <small class="mut">${Object.entries(b.ix).map(([x, v]) => `${esc(D.NAT_IX[x].n)} ${sgn(v)}`).join(' · ')} por cada 100% extra · ${N.cost[k] > 0 ? 'cuesta ' + money(N.cost[k]) : N.cost[k] < 0 ? 'ahorra ' + money(-N.cost[k]) : 'sin coste extra'} por turno</small></div>`).join('')}
  <p class="${tot > 0 ? 'red' : tot < 0 ? 'green' : 'mut'}">Balance de partidas: ${tot > 0 ? money(tot) + ' más de gasto' : tot < 0 ? money(-tot) + ' de ahorro' : 'neutro'} por turno</p>`; }
function natSegHTML(N) { const A = D.NAT.army, Pp = D.NAT.police, regs = Q.rlList ? Q.rlList() : [], c = CC(me());
  const cartReg = {}; for (const k of N.cart) cartReg[k.i] = (cartReg[k.i] || 0) + k.str;
  const rows = regs.map(([i, m]) => [i, m, cartReg[i] || 0]).sort((a, b) => (N.army.includes(b[0]) - N.army.includes(a[0])) || (b[2] - a[2]) || (b[1] - a[1])).slice(0, 12);
  return `<h4>${gi('seg')} Policía</h4><div class="card"><div class="row"><b class="grow">Sueldos</b><b class="num" id="natv-pay">${Math.round(N.pay * 100)}%</b></div>
    <input type="range" min="50" max="200" step="25" value="${Math.round(N.pay * 100)}" data-c="natPay" aria-label="Sueldos policiales">
    <small class="mut">Mejor pagados: más seguridad y menos sobornos. Cada 100% extra cuesta ${money(c.gdp * Pp.pay.cost)} por turno.</small>
    <div class="row wrap"><button class="btn sm" data-a="natEquip" ${N.eq >= Pp.eq.max ? 'disabled' : ''}>Reequipar · ${money(c.gdp * Pp.eq.gdp)} · nivel ${N.eq}/${Pp.eq.max}</button>
    <button class="btn sm ghost" data-a="natPurge" data-confirm ${N.purge ? 'disabled' : ''}>Depurar la policía · ${Pp.purge.cp} CP${N.purge ? ` · en ${N.purge} t` : ''}</button></div>
    <small class="mut">Depurar baja mucho la corrupción, pero durante un tiempo hay menos agentes en la calle.</small></div>
  <h4>${gi('tan')} Ejército en las calles <small class="mut">${N.army.length}/${A.max}</small></h4>
  <p class="mut fine">Sacar al ejército calma una región y golpea a los cárteles que operan allí, pero cuesta ${money(c.gdp * A.cost)} por turno, resta reputación democrática y puede haber abusos.</p>
  ${rows.map(([i, m, cs]) => { const on = N.army.includes(i); return `<div class="arow"><div class="grow"><b>${esc(c.terr[i].n)}</b><small class="mut">Malestar ${Math.round(m)}${cs ? ` · narco ${Math.round(cs)}` : ''}</small></div>
    <button class="btn sm ${on ? 'ghost' : 'gold'}" data-a="natArmy" data-i="${i}" ${!on && N.army.length >= A.max ? 'disabled' : ''}>${on ? 'Retirar' : `Desplegar · ${A.cp} CP`}</button></div>`; }).join('') || '<p class="mut">No controlas ninguna región.</p>'}`; }
function natNarHTML(N) { const K = D.NAT.cart, c = CC(me());
  return `<p class="mut fine">Crimen organizado ${Math.round(N.ix.cri.v)}/100. Los cárteles crecen con el crimen y la pobreza, sobornan a tu policía y atentan si se sienten fuertes. Si su fuerza llega a ${K.dieAt}, caen.</p>
  ${N.cart.map(k => `<div class="card nar5"><div class="row"><span>${gi('ofensiva')}</span><div class="grow"><b>${esc(k.n)}</b><small class="mut">Feudo: ${esc(k.reg)} · jefe: ${esc(k.boss)} · caja ${Math.round(k.cash)}${k.pact ? ` · <span class="gold">pacto secreto (${k.pact} t)</span>` : ''}</small></div><b class="num ${k.str > 60 ? 'red' : ''}">${Math.round(k.str)}</b></div>
    ${bar(k.str, 100, k.str > 60 ? 'red' : '')}
    <div class="row wrap">${Object.entries(K.acts).map(([h, A]) => `<button class="btn sm ${h === 'pacto' ? 'ghost' : ''}" data-a="cartel" data-id="${k.id}" data-how="${h}" title="${esc(A.d)}" ${k.cd ? 'disabled' : ''} ${h === 'pacto' ? 'data-confirm' : ''}>${esc(A.n)} · ${A.cp} CP${A.gdp ? ' · ' + money(c.gdp * A.gdp) : ''}</button>`).join('')}</div>
    ${k.cd ? `<small class="mut">Podrás volver a actuar en ${k.cd} turnos.</small>` : ''}</div>`).join('') || '<p class="mut">No hay cárteles organizados en tu país. Si el crimen sube mucho, aparecerán.</p>'}
  <h4>Política de drogas</h4>${N.legal ? `<p class="good">Drogas legalizadas desde ${esc(turnDate(N.legal - 1))}. El negocio del narco se seca poco a poco.</p>` : `<div class="card"><p class="mut">${esc(K.legal.d)}</p><button class="btn sm" data-a="natLegal" data-confirm>Legalizar y regular · ${K.legal.cp} CP</button></div>`}`; }
H.natBud = (d, el) => { const r = act('natBud', { k: el.dataset.k, v: el.value / 100 }); const b = $('#natv-' + el.dataset.k); if (b) b.textContent = el.value + '%'; if (r.ok) UI.render(); };
H.natPay = (d, el) => { const r = act('natPay', { v: el.value / 100 }); if (r.ok) UI.render(); };
H.natEquip = () => act('natEquip'); H.natPurge = () => act('natPurge'); H.natArmy = d => act('natArmy', { i: +d.i }); H.natLegal = () => act('natLegal');
H.cartel = d => act('cartel', { id: +d.id, how: d.how });
/* cada turno, el globo recuerda dónde están las tropas y los cárteles */
Bus.on('turn', () => { const N = S() && Q.natInfo(); if (!N || CFG.rm) return; for (const i of N.army) Bus.emit('regfx', { iso: me(), i, k: 'humo' }); });

/* =====================================================================
   INTERFAZ · GABINETE Y SUCESIÓN (Política → Gabinete)
   ===================================================================== */
PTABS.pol.push(['gab', 'Gabinete']);
{ const p0 = PANELS.pol; PANELS.pol = t => t === 'gab' ? cabHTML() : p0(t); }
const stars5 = n => '★'.repeat(n) + '☆'.repeat(5 - n);
function cabHTML() { const C = Q.cabInfo(), L = S().leader, U = UI.cabOpen;
  const lead = `<div class="card cab-lead"><div class="row"><span class="portrait big">${portraitSVG(L.n, L.pseed)}</span><div class="grow"><b>${esc(L.n)}</b><small class="mut">${L.age} años · heredero: ${C.heir ? esc(C.m[C.heir].n) : '<span class="red">ninguno</span>'}</small>
    <div class="arow"><span class="grow">Salud</span>${bar(L.health, 100, L.health < 40 ? 'red' : L.health < 70 ? '' : 'green')}<b class="num">${Math.round(L.health)}</b></div></div></div>
    <p class="mut fine">A partir de los ${D.AGE.sickFrom} años puedes enfermar. Si mueres sin heredero, el partido elige a otro y el país se agita; con heredero, el relevo es suave.</p></div>`;
  const card = k => { const m = C.m[k], M = D.MIN[k], T = D.MTRAIT[m.tr], cand = C.cand[k] || [];
    return `<div class="card cab"><div class="row"><span class="portrait">${portraitSVG(m.n, m.pseed)}</span><div class="grow"><small class="eyebrow">${gi(M.ic)} ${esc(M.n)}</small><b>${esc(m.n)}</b> ${C.heir === k ? '<span class="chip gold">Heredero</span>' : ''}<small class="mut">${esc(T.n)} · ${esc(T.x)}</small></div></div>
      <div class="arow"><span class="grow">Competencia <small class="mut">${esc(M.x)}</small></span><b class="gold">${stars5(m.comp)}</b></div>
      <div class="arow"><span class="grow">Lealtad</span>${bar(m.loy, 100, m.loy < 30 ? 'red' : m.loy > 70 ? 'green' : '')}<b class="num">${Math.round(m.loy)}</b></div>
      <div class="row wrap"><button class="btn sm" data-a="cabHeir" data-k="${k}">${C.heir === k ? 'Quitar como heredero' : 'Nombrar heredero'}</button><button class="btn sm" data-a="cabOpen" data-k="${k}">${U === k ? 'Ocultar candidatos' : 'Sustituir'}</button></div>
      ${U === k ? `<div class="cand5">${cand.length ? cand.map((x, i) => `<div class="arow"><span class="portrait">${portraitSVG(x.n, x.pseed)}</span><div class="grow"><b>${esc(x.n)}</b><small class="mut">${esc(D.MTRAIT[x.tr].n)} · ${stars5(x.comp)} · lealtad ${x.loy}</small></div><button class="btn sm gold" data-a="cabHire" data-k="${k}" data-i="${i}">Nombrar · ${D.CAB.hireCp} CP</button></div>`).join('') : '<p class="mut">No hay candidatos ahora.</p>'}
        <button class="btn sm ghost" data-a="cabRefresh">Buscar otros candidatos</button><small class="mut">Cambiar a un ministro baja un poco la lealtad del resto.</small></div>` : ''}</div>`; };
  return lead + `<div class="cabs">${Object.keys(D.MIN).map(card).join('')}</div>`; }
H.cabOpen = d => { UI.cabOpen = UI.cabOpen === d.k ? null : d.k; if (UI.cabOpen && !(Q.cabInfo().cand[d.k] || []).length) act('minRefresh'); UI.render(); };
H.cabHire = d => { act('minHire', { k: d.k, i: +d.i }); UI.cabOpen = null; UI.render(); };
H.cabHeir = d => { act('minHeir', { k: d.k }); UI.render(); };
H.cabRefresh = () => { act('minRefresh'); UI.render(); };
Bus.on('succession', e => scene(cineScene(banner('war', 'cp', e.heir ? 'Relevo en el poder' : 'Crisis de sucesión', esc(e.n), `${esc(e.old)} ha muerto`), 3600)));

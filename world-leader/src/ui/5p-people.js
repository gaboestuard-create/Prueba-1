/* =====================================================================
   INTERFAZ · PERSONAJES, CUMBRE Y SALA DE CRISIS
   ===================================================================== */
PTABS.pol.push(['per', 'Personajes']);
{ const p0 = PANELS.pol; PANELS.pol = t => t === 'per' ? peopleHTML() : p0(t); }
const attLbl = a => a >= D.PEOPLE_CFG.friendly ? ['Aliado', 'good'] : a <= D.PEOPLE_CFG.hostile ? ['Enemigo', 'bad'] : ['Neutral', ''];
const PPL_FX = { opo: ['Si te odia: −2 en elecciones', 'Si te aprecia: +1 en elecciones'], per: ['Si te odia: exclusivas contra ti'], gen: ['Si te odia y la tropa está descontenta: inestabilidad'], mag: ['Si te aprecia: aporta dinero cada turno'] };
function peopleHTML() { const P2 = Q.pplInfo();
  return `<p class="mut fine">Personas con nombre que recuerdan lo que haces. Su actitud cambia con cada decisión y tiene consecuencias.</p><div class="cabs">${Object.entries(D.PEOPLE).map(([k, d]) => { const p = P2[k], L = attLbl(p.att);
    return `<div class="card cab"><div class="row"><span class="portrait">${portraitSVG(p.n, p.pseed)}</span><div class="grow"><small class="eyebrow">${gi(d.ic)} ${esc(d.n)}</small><b>${esc(p.n)}</b> <span class="chip ${L[1]}">${L[0]}</span><small class="mut">${esc(d.role.replace('{O}', (S().pol.seats.filter(x => !x.g).sort((a, b) => b.s - a.s)[0] || { n: 'la oposición' }).n))}</small></div></div>
      <div class="arow"><span class="grow">Actitud hacia ti</span>${bar(p.att + 100, 200, p.att > 30 ? 'green' : p.att < -30 ? 'red' : '')}<b class="num">${sgn(p.att)}</b></div>
      <small class="mut">${esc(PPL_FX[k].join(' · '))}</small>
      ${p.log.length ? `<ol class="tl5">${p.log.slice(-4).reverse().map(x => `<li><small>${esc(turnDate(x.t))}</small> ${esc(x.x)} <b class="${x.v >= 0 ? 'green' : 'red'}">${sgn(x.v)}</b></li>`).join('')}</ol>` : '<p class="mut">Aún no habéis coincidido.</p>'}</div>`; }).join('')}</div>`; }

/* la decisión de un personaje lleva su cara; la sala de crisis, su aire de urgencia */
{ const p0 = showPending; showPending = () => { const s = S(); if (s && s.pend[0] && s.pend[0].k === 'summit' && !s.over && !sqRun && !SQ.length && ($('#modal').hidden || UI.modalClosable) && UI.screen === 'game') return summitModal(s.pend[0]);
  p0(); const p = s && s.pend[0], box = $('#modal .mbox'); if (!p || !box || $('#modal').hidden) return;
  if (p.id === 'crisis') { box.classList.add('crisis5'); if (!CFG.mute) Sfx.play('alert'); }
  if (p.id === 'ppl' && p.who && !box.querySelector('.ppl-head')) { const pp = Q.pplInfo()[p.who]; box.insertAdjacentHTML('afterbegin', `<div class="ppl-head row"><span class="portrait">${portraitSVG(pp.n, pp.pseed)}</span><div><small class="eyebrow">${esc(D.PEOPLE[p.who].n)}</small><b>${esc(pp.n)}</b> <span class="chip ${attLbl(pp.att)[1]}">${attLbl(pp.att)[0]}</span></div></div>`); } }; }
UI.sum = { meet: [], topic: 'comercio' };
function summitModal(p) { const F = UI.sum;
  openModal(`<p class="eyebrow">${esc(p.t)}</p><h2>La cumbre</h2><p>${esc(p.x)}</p><h4>Reuniones bilaterales <small class="mut">elige hasta ${D.SUMMIT.meet}</small></h4>
    <div class="sum5">${p.inv.map(z => `<button class="li ${F.meet.includes(z) ? 'on' : ''}" data-a="sumMeet" data-iso="${z}">${face(z)}<span class="grow"><b>${esc(CC(z).lider.n)}</b><small class="mut">${fl(z)} ${cname(z)} · relación ${sgn(Q.rel(me(), z))}</small></span></button>`).join('')}</div>
    <h4>Tema que propones</h4><div class="chips">${Object.entries(D.SUMMIT.topics).map(([k, t]) => `<button class="chip ${F.topic === k ? 'gold' : ''}" data-a="sumTopic" data-k="${k}">${esc(t.n)}</button>`).join('')}</div>
    <div class="row end"><button class="btn ghost" data-a="sumSkip">No asistir</button><button class="btn gold" data-a="sumGo">Ir a la cumbre</button></div>`, false, 'event wide'); }
H.sumMeet = d => { const M = UI.sum.meet, i = M.indexOf(d.iso); if (i >= 0) M.splice(i, 1); else { if (M.length >= D.SUMMIT.meet) M.shift(); M.push(d.iso); } document.querySelectorAll('#modal [data-a=sumMeet]').forEach(b => b.classList.toggle('on', M.includes(b.dataset.iso))); };
H.sumTopic = d => { UI.sum.topic = d.k; document.querySelectorAll('#modal [data-a=sumTopic]').forEach(b => b.classList.toggle('gold', b.dataset.k === d.k)); };
H.sumGo = () => { const r = act('summitYear', { meet: UI.sum.meet, topic: UI.sum.topic }); if (r.ok) { UI.sum.meet = []; closeModal(); if (!CFG.rm) Globe.ring(...(LL(me()) || [0, 0]), 0xffd36a, .12, 2000); showPending(); } };
H.sumSkip = () => { closeModal(); act('decide', { i: 1 }); showPending(); };
Bus.on('crisisEnd', e => scene(cineScene(banner(e.r === 'bad' ? 'war' : 'peace', e.r === 'bad' ? 'bad' : 'cp', 'Sala de crisis', esc(e.n), e.r === 'ok' ? 'Crisis resuelta con éxito' : e.r === 'mid' ? 'Un final agridulce' : 'La gestión fue un desastre'), 3000)));

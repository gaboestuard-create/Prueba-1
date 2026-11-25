/* =====================================================================
   INTERFAZ · SEGURIDAD NACIONAL
   Nación → Inteligencia (vigilancia, director, operaciones internas) ·
   Ejército → Mandos (Ejército, Armada, Fuerza Aérea) · ficha de cada
   país → Situación interna (el interior resumido de la IA).
   ===================================================================== */
PTABS.nac.push(['int', 'Inteligencia']); PTABS.mil.push(['man', 'Mandos']);
{ const n0 = PANELS.nac; PANELS.nac = t => t === 'int' ? secIntHTML() : n0(t); }
{ const m0 = PANELS.mil; PANELS.mil = t => t === 'man' ? branchHTML() : m0(t); }
Object.assign(EXN, { vig: 'Vigilancia interna' });
function secIntHTML() { const I = Q.secInfo(), O = D.SECINT.ops, N = Q.natInfo(), d = I.dir, mor = v => v >= 60 ? 'green' : v < 35 ? 'red' : '';
  return `<p class="mut fine">La agencia también trabaja dentro del país. Su nivel (${I.lvl.toFixed(1)}) depende del presupuesto que fijas en Diplomacia → Inteligencia y mejora el éxito de cada operación.</p>
  <div class="card"><div class="row"><span class="portrait">${portraitSVG(d.n, d.pseed)}</span><div class="grow"><small class="eyebrow">Director de inteligencia</small><b>${esc(d.n)}</b><small class="mut">Competencia ${Math.round(d.comp)}</small>
    <div class="arow"><span class="grow">Lealtad</span>${bar(d.loy, 100, mor(d.loy))}<b class="num">${Math.round(d.loy)}</b></div></div></div>
    <small class="mut">Con poca lealtad y vigilancia activa, puede chantajearte con lo que sabe.</small><div class="row"><button class="btn sm ghost" data-a="secDir" data-confirm>Nombrar otro director · ${D.SECINT.dir.replaceCp} CP</button></div></div>
  <h4>${gi('ojo')} Vigilancia interna</h4><div class="row wrap">${D.SECINT.surv.n.map((n, v) => `<button class="btn sm ${I.surv === v ? 'gold' : ''}" data-a="secSurv" data-v="${v}">${esc(n)}</button>`).join('')}</div>
  <p class="mut fine">Cada nivel: seguridad ${sgn(D.SECINT.surv.ix.seg)}, crimen ${sgn(D.SECINT.surv.ix.cri)}, confianza en las instituciones ${sgn(D.SECINT.surv.ix.ins)} y ${money(CC(me()).gdp * D.SECINT.surv.cost)} por turno. Si se filtra, escándalo.</p>
  <h4>${gi('ofensiva')} Operaciones${I.cd ? ` <small class="mut">agencia ocupada ${I.cd} t</small>` : ''}</h4>
  ${Object.entries(O).map(([k, o]) => `<div class="card"><div class="row"><b class="grow">${esc(o.n)}</b><small class="mut">${o.cp} CP</small></div><small class="mut">${esc(o.d)}</small>
    <div class="row wrap">${k === 'inf' ? (N.cart.map(c => `<button class="btn sm" data-a="secOp" data-k="inf" data-id="${c.id}" ${I.cd ? 'disabled' : ''}>${esc(c.n)} · ${Math.round(c.str)}</button>`).join('') || '<small class="mut">No hay cárteles que infiltrar.</small>')
      : `<button class="btn sm" data-a="secOp" data-k="${k}" ${I.cd ? 'disabled' : ''}>Ordenar</button>`}</div></div>`).join('')}`; }
function branchHTML() { const I = Q.secInfo(), B = D.BR, avg = Object.values(I.br).reduce((s, b) => s + b.loy, 0) / 3, col = v => v >= 60 ? 'green' : v < 35 ? 'red' : '';
  return `<p class="mut fine">Cada rama tiene jefe, lealtad, moral y modernización. La moral y la modernización multiplican su poder en combate; la lealtad baja, con un país inestable, trae ruido de sables.</p>
  <div class="card"><div class="arow"><span class="grow"><b>Relación cívico-militar</b></span>${bar(avg, 100, col(avg))}<b class="num">${Math.round(avg)}</b></div><small class="mut">Media de lealtad de los tres jefes. Por debajo de ${B.coupAt}, si la estabilidad cae de ${B.coupStab}, hay riesgo.</small></div>
  <div class="cabs">${Object.entries(I.br).map(([k, b]) => { const R = D.BRANCH[k];
    return `<div class="card cab"><div class="row"><span class="portrait">${portraitSVG(b.n, b.pseed)}</span><div class="grow"><small class="eyebrow">${gi(R.ic)} ${esc(R.n)}</small><b>${esc(b.n)}</b><small class="mut">Poder ${Math.round(b.pow * b.f)} (${b.f >= 1 ? '+' : '−'}${Math.abs(Math.round((b.f - 1) * 100))}% por moral y equipo)</small></div></div>
      <div class="arow"><span class="grow">Lealtad</span>${bar(b.loy, 100, col(b.loy))}<b class="num">${Math.round(b.loy)}</b></div>
      <div class="arow"><span class="grow">Moral <small class="mut">▸ ${Math.round(b.t)}</small></span>${bar(b.mor, 100, col(b.mor))}<b class="num">${Math.round(b.mor)}</b></div>
      <div class="arow"><span class="grow">Modernización</span><b>${'★'.repeat(b.mod)}${'☆'.repeat(B.modMax - b.mod)}</b></div>
      <div class="row wrap"><button class="btn sm" data-a="brMod" data-k="${k}" ${b.mod >= B.modMax || b.modIn ? 'disabled' : ''}>${b.modIn ? `Modernizando · ${b.modIn} t` : `Modernizar · ${money(CC(me()).gdp * B.modGdp)}`}</button><button class="btn sm ghost" data-a="brChief" data-k="${k}" data-confirm>Relevar al jefe · ${B.chiefCp} CP</button></div></div>`; }).join('')}</div>
  <p class="mut fine">Suben la moral: el apoyo de los militares, leyes como sueldo militar o más gasto en defensa y ganar guerras. La bajan: perder guerras, la guerra larga y, para el Ejército, patrullar las calles.</p>`; }
H.secSurv = d => act('secSurv', { v: +d.v }); H.secDir = () => act('secDir'); H.secOp = d => act('secOp', { k: d.k, id: +d.id });
H.brMod = d => act('brMod', { k: d.k }); H.brChief = d => act('brChief', { k: d.k });
/* ficha de un país: su situación interna, que pesa en lo que acepta */
SHT[0][3].unshift('Situación interna');
{ const x0 = sheetExtra; sheetExtra = iso => { const n = Q.aiNi(iso); if (!n) return x0(iso); const w = (v, bad) => { const g = bad ? 100 - v : v; return `<b class="${g >= 60 ? 'green' : g < 35 ? 'red' : ''}">${v}</b>`; }, A = D.AINT;
  const notes = [n.coh < A.weakCoh || n.seg < A.weakSeg ? 'Su crisis interna le quita ganas de guerras' : '', n.coh < A.askCoh ? 'No puede prestarte ayuda' : '', n.cor > A.treaty.cor[0] ? 'Gobierno corrupto: más fácil de convencer' : '', n.seg < A.treaty.seg[0] ? 'Busca socios para su seguridad' : ''].filter(Boolean);
  return `<h4>Situación interna</h4><p>Seguridad ${w(n.seg)} · Corrupción ${w(n.cor, 1)} · Cohesión ${w(n.coh)}</p>${notes.length ? `<p class="mut fine">${notes.map(esc).join(' · ')}</p>` : ''}` + x0(iso); }; }

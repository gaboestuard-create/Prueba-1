/* =====================================================================
   INTERFAZ · pantalla de inicio, creación de líder y tutorial
   ===================================================================== */
const NG = { step: 0, iso: 'MX', custom: false, cname: '', creg: 'dem', cideo: '0', name: '', partido: '', pseed: 0, img: '', traits: [], seed: '', q: '' };
const hasSave = () => { try { return !!localStorage.getItem('wl_save'); } catch (e) { return false; } };

function startHTML() {
  return `<div class="start"><div class="start-in">
    <p class="eyebrow">Simulador de liderazgo mundial · Fase 2</p>
    <h1 class="logo">WORLD<span>LEADER</span></h1>
    <p class="tagline">197 países, 1.084 provincias. Cada uno recuerda lo que hiciste.</p>
    <div class="start-btns"><button class="btn gold lg" data-a="ngStart">Nueva partida</button>
      ${hasSave() ? `<button class="btn lg" data-a="continue">Continuar</button>` : ''}<button class="btn ghost lg" data-a="importOpen">Importar partida</button></div>
    <p class="fine">Datos aproximados. Casi todos los líderes llegan marcados “sin verificar”: puedes corregirlos en el Editor.</p></div></div>`;
}
const diff = c => c.gdp > 1500 && c.stab > 55 ? ['Potencia', 'good'] : c.gdp < 60 || c.stab < 36 ? ['Difícil', 'bad'] : ['Media', ''];
function createHTML() {
  const c = D.C[NG.iso], steps = ['País', 'Líder', 'Personalidad'];
  let body = '';
  if (NG.step === 0) {
    const q = NG.q.trim().toLowerCase(), list = Object.values(D.C).filter(x => !q || x.n.toLowerCase().includes(q)).sort((a, b) => b.gdp - a.gdp);
    const d = diff(c);
    body = `<div class="card sel-card"><div class="row"><span class="flag xl">${flag(NG.iso)}</span><div class="grow"><h3>${esc(NG.custom && NG.cname ? NG.cname : c.n)}</h3><small class="mut">${esc(D.REGIONS[c.region])} · ${esc(D.REGIMES[c.reg])} · <span class="chip ${d[1]}">${d[0]}</span></small></div></div>
        <div class="kvs"><div><small>PIB</small><b>${money(c.gdp)}</b></div><div><small>Población</small><b>${c.pop >= 1 ? c.pop.toFixed(0) + ' M' : (c.pop * 1000).toFixed(0) + ' mil'}</b></div><div><small>Estabilidad</small><b>${c.stab}</b></div><div><small>Militares</small><b>${num(c.mil * 1000)}</b></div></div>
        <small class="mut">Gobierna hoy: ${esc(c.lider.n)} (${esc(c.partido)})</small></div>
      <label class="check"><input type="checkbox" data-c="ngCustom" ${NG.custom ? 'checked' : ''}> Fundar un país nuevo sobre este territorio</label>
      ${NG.custom ? `<div class="grid2"><label>Nombre del país${inp('ng:cname', NG.cname, 'maxlength="30" placeholder="República de…"')}</label><label>Régimen${sel('ng:creg', Object.entries(D.REGIMES), NG.creg)}</label><label>Ideología${sel('ng:cideo', Object.entries(D.IDEO).sort((a, b) => a[0] - b[0]), NG.cideo)}</label></div>` : ''}
      <div class="searchbox">${ic('search')}${inp('ng:q', NG.q, 'placeholder="Buscar país… o tócalo en el globo" autocomplete="off"')}</div>
      <div class="list scroll" data-sc="ngl" id="ngList">${list.map(x => `<button class="li ${x.iso === NG.iso ? 'on' : ''}" data-a="ngPick" data-iso="${x.iso}">${fl(x.iso)}<span class="grow">${esc(x.n)}</span><small class="mut num">${money(x.gdp)}</small></button>`).join('') || '<p class="mut pad">Ningún país coincide.</p>'}</div>`;
  } else if (NG.step === 1) {
    const nm = NG.name || 'Tu nombre';
    body = `<div class="row top"><div class="portrait big">${portraitSVG(nm, NG.pseed)}${NG.img ? `<img src="${esc(NG.img)}" alt="" onerror="this.remove()">` : ''}</div>
        <div class="grow col"><label>Nombre del líder${inp('ng:name', NG.name, 'maxlength="40" placeholder="Nombre y apellido" autocomplete="off"')}</label>
        <button class="btn sm" data-a="ngReroll">Otro retrato</button></div></div>
      <label>Partido${inp('ng:partido', NG.partido || (NG.custom ? '' : c.partido), 'maxlength="50" placeholder="Nombre del partido"')}</label>
      <label>Retrato propio (URL de imagen, opcional)${inp('ng:img', NG.img, 'placeholder="https://… o data:image/…" inputmode="url"')}</label>
      <label>Semilla del mundo (opcional)${inp('ng:seed', NG.seed, 'placeholder="Vacío = aleatoria" inputmode="numeric"')}</label>
      <p class="mut fine">El retrato se dibuja por código a partir del nombre. Si pegas una URL se usará tu imagen; dentro del visor de Claude las imágenes externas pueden bloquearse, pero funcionan al abrir el HTML en tu navegador.</p>`;
  } else {
    const left = D.TRAIT_POINTS - NG.traits.length;
    body = `<p class="mut">Elige hasta ${D.TRAIT_POINTS} rasgos. Cada nivel exige el anterior de su rama, y todos dan algo y quitan algo. <b class="${left ? 'gold' : ''}">${left} punto${left === 1 ? '' : 's'} libre${left === 1 ? '' : 's'}</b></p>
      <div class="tree scroll" data-sc="tree">${Object.keys(D.BRANCHES).map(b => `<div class="branch"><h4>${D.BRANCHES[b]}</h4>${D.TRAITS.filter(t => t.b === b).map(t => {
        const on = NG.traits.includes(t.id), prev = D.TRAITS.find(x => x.b === b && x.t === t.t - 1), locked = prev && !NG.traits.includes(prev.id);
        return `<button class="trait ${on ? 'on' : ''} ${locked ? 'locked' : ''}" data-a="ngTrait" data-id="${t.id}" aria-pressed="${on}"><b>${esc(t.n)}</b><small class="pro">${esc(t.pro)}</small><small class="con">${esc(t.con)}</small></button>`;
      }).join('<i class="link"></i>')}</div>`).join('')}</div>`;
  }
  return `<section class="create glass"><header><h2>Nuevo mandato</h2><div class="steps">${steps.map((s, i) => `<button data-a="ngStep" data-s="${i}" class="${i === NG.step ? 'on' : ''}">${i + 1}. ${s}</button>`).join('')}</div></header>
    <div class="create-body">${body}</div>
    <footer><button class="btn ghost" data-a="${NG.step ? 'ngStep' : 'toStart'}" data-s="${NG.step - 1}">Atrás</button>
      ${NG.step < 2 ? `<button class="btn gold" data-a="ngStep" data-s="${NG.step + 1}">Siguiente</button>` : `<button class="btn gold" data-a="ngGo">Comenzar mandato</button>`}</footer></section>`;
}
H.ngStart = () => { UI.screen = 'create'; NG.step = 0; Globe.spin = false; Globe.focus(NG.iso); Globe.select([NG.iso]); UI.render(); };
H.toStart = () => { UI.screen = 'start'; Globe.spin = true; Globe.select([]); Globe.home(); UI.render(); };
H.ngPick = d => { NG.iso = d.iso; NG.partido = ''; Globe.focus(d.iso); Globe.select([d.iso]); UI.render(); };
H.ngStep = d => { NG.step = Math.max(0, Math.min(2, +d.s)); UI.render(); };
H.ngCustom = (d, el) => { NG.custom = el.checked; UI.render(); };
H.ngReroll = () => { NG.pseed++; UI.render(); };
H.ngTrait = d => {
  const t = D.TRAITS.find(x => x.id === d.id), i = NG.traits.indexOf(t.id);
  if (i >= 0) NG.traits = NG.traits.filter(id => { const x = D.TRAITS.find(y => y.id === id); return !(x.b === t.b && x.t >= t.t); }); // quitar un rasgo quita los que dependen de él
  else { const prev = D.TRAITS.find(x => x.b === t.b && x.t === t.t - 1); if (prev && !NG.traits.includes(prev.id)) return toast(`Primero necesitas "${prev.n}"`, false); if (NG.traits.length >= D.TRAIT_POINTS) return toast('No te quedan puntos: quita un rasgo primero', false); NG.traits.push(t.id); }
  UI.render();
};
['q', 'cname', 'creg', 'cideo', 'name', 'partido', 'img', 'seed'].forEach(k => { H['in:ng'] = (v, el) => { const f = el.dataset.f.split(':')[1]; NG[f] = v; if (f === 'q') { clearTimeout(NG.t); NG.t = setTimeout(UI.render, 180); } }; });
H.ngGo = () => {
  if (!NG.name.trim()) { NG.step = 1; UI.render(); return toast('Ponle nombre a tu líder', false); }
  if (NG.custom && !NG.cname.trim()) { NG.step = 0; UI.render(); return toast('Ponle nombre a tu país', false); }
  const seed = parseInt(NG.seed, 10) || (Date.now() % 2147483647);
  G.newGame({ iso: NG.iso, name: NG.name.trim(), traits: NG.traits, seed, img: NG.img.trim(), pseed: NG.pseed, partido: NG.partido.trim() || (NG.custom ? 'Partido Fundador' : ''), custom: NG.custom ? { n: NG.cname.trim(), reg: NG.creg, ideo: NG.cideo } : null });
  enterGame(true);
};
function enterGame(fresh) {
  UI.screen = 'game'; UI.panel = null; UI.sel = null; UI.form = {}; Globe.spin = false; closeModal();
  Globe.focus(me(), 2.5); UI.render(); refreshMap(); autosave();
  let seen = false; try { seen = !!localStorage.getItem('wl_tut'); } catch (e) { }
  if (fresh && !seen) tutorial(0); else if (S().over) showOver(); else showPending();
}
H.continue = () => { let s = null; try { s = localStorage.getItem('wl_save'); } catch (e) { } const r = s ? G.load(s) : { ok: false, msg: 'No hay partida guardada' }; toast(r.msg, r.ok); if (r.ok) enterGame(false); };
function autosave() { try { localStorage.setItem('wl_save', G.save()); } catch (e) { /* almacenamiento bloqueado: queda exportar a mano */ } }

/* ---- tutorial de primera vez ---- */
const TUT = [
  ['#globe', 'El mundo es tuyo', 'Arrastra para girar el globo, usa la rueda o pellizca para acercarte y toca cualquier país para ver a su líder, su ejército y lo que piensa de ti.'],
  ['.hud', 'Tus cuatro números', 'Caja, capital político, aprobación y estabilidad. Casi todo lo que hagas cuesta capital político: se regenera cada turno, así que elige bien en qué gastarlo.'],
  ['.dock', 'Tu gabinete', 'Economía, Política, Diplomacia y Ejército. Aquí propones leyes al congreso, inviertes en bolsa, firmas tratados y construyes bases.'],
  ['.modes', 'Lee el mapa', 'Cambia el modo de mapa para ver quién te quiere, quién está armado y quién es rico. Las franjas rojas son guerras en curso.'],
  ['.endturn', 'Un turno = un trimestre', 'Al terminar el turno juegan los otros 196 países: se rearman, pactan, traicionan y te piden cosas. Después llegan los eventos, y tus decisiones tienen consecuencias que no siempre se ven al momento.']
];
function tutorial(i) {
  document.querySelectorAll('.tut-hi').forEach(e => e.classList.remove('tut-hi'));
  if (i >= TUT.length) { try { localStorage.setItem('wl_tut', '1'); } catch (e) { } closeModal(); return showPending(); }
  const t = TUT[i], el = $(t[0]); if (el && t[0] !== '#globe') el.classList.add('tut-hi');
  openModal(`<p class="eyebrow">Tutorial · ${i + 1} de ${TUT.length}</p><h2>${t[1]}</h2><p>${t[2]}</p><div class="row end"><button class="btn ghost" data-a="tut" data-i="99">Saltar</button><button class="btn gold" data-a="tut" data-i="${i + 1}">${i + 1 < TUT.length ? 'Siguiente' : 'A gobernar'}</button></div>`, false, 'tut');
}
H.tut = d => tutorial(+d.i);

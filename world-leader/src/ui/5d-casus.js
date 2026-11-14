/* =====================================================================
   INTERFAZ · MOTIVOS PARA LA GUERRA (ficha del país · pestaña Guerra)
   ===================================================================== */
SHT.find(x => x[0] === 'gue')[3].unshift('Motivos para la guerra');
const JCOL = ['bad', 'gold', 'good', 'good'], JTXT = [
  'Para el mundo sería una guerra de agresión: te condenarán en la Asamblea, las democracias te embargarán armas, muchos te sancionarán (y se cortan los tratados comerciales con ellos) y tus aliados dudarán.',
  'El mundo duda: sigue contando como agresión, pero tu reputación sufre un poco menos.',
  'Guerra provocada: sin condena en la Asamblea ni embargo de armas, muchas menos sanciones, tus aliados te apoyan más y anexionar al final duele menos.',
  'Nadie discute que te provocaron: casi nadie te sanciona ni te corta tratados, tu reputación apenas sufre y una anexión final se entiende.'];
{ const x0 = sheetExtra; sheetExtra = iso => { const J = Q.justInfo(iso), c = CC(iso), t = S().turn, cd = (c.ask.apo || 0) > t;
  return x0(iso) + `<h4>Motivos para la guerra</h4><div class="card just j${J.lvl}"><div class="row"><div class="grow"><small class="mut">Justificación ante el mundo</small><h3><span class="chip ${JCOL[J.lvl]}">${J.name}</span> <small class="mut">${J.score} puntos</small></h3></div></div>
    <div class="just-bar">${bar(Math.min(J.score, 100), 100, J.lvl >= 2 ? 'green' : J.lvl ? 'gold' : 'red')}<i style="left:15%"></i><i style="left:40%"></i><i style="left:80%"></i></div>
    <small>${JTXT[J.lvl]}</small>
    ${J.list.length ? `<div class="just-l">${J.list.slice(0, 8).map(g => `<div><span>${esc(g.x)}${g.ago ? ` <small class="mut">hace ${g.ago} t</small>` : ''}</span><b>+${g.v}</b></div>`).join('')}</div>` : '<p class="mut">No te ha provocado. Los agravios se acumulan cuando te espía, sabotea, dispara en la frontera, te sanciona, te lanza ultimátums o arma guerrillas en tu territorio, y se olvidan con los años.</p>'}
    ${J.score >= 15 ? `<div class="arow"><div class="grow"><b>${gi('ultimatum')} Exigir disculpas y reparaciones</b><small>El paso previo a la guerra. Si aceptan, pagan y los agravios quedan saldados; si se niegan, tu justificación crece. Aceptan más si eres mucho más fuerte y si no son agresivos ni rencorosos.</small></div><button class="btn sm gold" data-a="apology" data-iso="${iso}" ${cd ? 'disabled' : ''}>${cd ? `Espera ${c.ask.apo - t} t` : 'Exigir · 1 CP'}</button></div>` : ''}</div>`; }; }
H.apology = d => sheetAct('demandApology', { iso: d.iso });
{ const s0 = sheetHTML; sheetHTML = iso => { const J = Q.justInfo(iso); return s0(iso).replace('Declarar guerra · 4 CP', `Declarar guerra · 4 CP · justificación ${J.name.toLowerCase()}`); }; }

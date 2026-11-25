/* =====================================================================
   INTERFAZ · NAVEGACIÓN POR SECCIONES
   El dock pasa de 9 botones sueltos a 5 secciones con sentido (Mi país,
   Gobierno, Economía, Mundo, Defensa) más «Más». Cada una abre un menú
   de tarjetas: para qué sirve, su estado en vivo y a dónde lleva. Dentro
   de cada pestaña, «Relacionado» enlaza con lo que se ve afectado y un
   botón ‹ vuelve al menú de la sección. Las pestañas nuevas que añada
   cualquier módulo aparecen solas en su sección.
   ===================================================================== */
const HUBS = {
  pais: { n: 'Mi país', ic: 'nac', d: 'Cómo está tu gente por dentro: seguridad, salud, educación, calles y regiones.', order: ['nac:est', 'nac:con', 'nac:gas', 'nac:seg', 'nac:nar', 'nac:int', 'nac:soc', 'pol:reg', 'nac:inf'] },
  gob: { n: 'Gobierno', ic: 'pol', d: 'Cómo mandas: leyes, congreso, equipo, elecciones y lo que dice la gente.', order: ['pol:ley', 'pol:con', 'pol:sec', 'pol:enc', 'pol:ele', 'pol:gab', 'pol:dis', 'pol:per'] },
  eco: { n: 'Economía', ic: 'eco', d: 'El dinero y lo que lo mueve: presupuesto, comercio, industria y ciencia.', order: [] },
  mun: { n: 'Mundo', ic: 'dip', d: 'Tus relaciones con el resto: tratados, bloques, espionaje y lo que pasa fuera.', order: [] },
  def: { n: 'Defensa', ic: 'mil', d: 'Tus fuerzas, tus guerras y quién manda en ellas.', order: [] },
  mas: { n: 'Más', ic: 'sys', d: 'Guardar, ajustes, logros, historia y el editor.', order: [] }
};
const HUB_OF = { nac: 'pais', pol: 'gob', eco: 'eco', tec: 'eco', dip: 'mun', world: 'mun', mil: 'def', edit: 'mas', sys: 'mas' };
const hubOfTab = (p, t) => p === 'pol' && t === 'reg' ? 'pais' : p === 'edit' && S() && P5.opt('solo') && S().setup.mode !== 'sandbox' ? null : HUB_OF[p] || null; /* sin editor: «un solo país» lo oculta */
/* tarjeta: icono, para qué sirve, estado en vivo [texto, tono] */
const CARD = {
  'nac:est': ['seg', 'Los 9 indicadores del país y por qué se mueven', () => { const n = Q.natInfo(), bad = Object.entries(n.ix).filter(([k, x]) => (D.NAT_IX[k].bad ? 100 - x.v : x.v) < 40).length; return bad ? [`${bad} en alerta`, 'bad'] : ['Todo estable', 'good']; }],
  'nac:con': ['ojo', 'Qué mueve qué: palancas, indicadores y resultados', () => ['Mapa de causas', '']],
  'nac:gas': ['oro', 'Reparte el dinero entre seguridad, educación, salud…', () => { const n = Q.natInfo(), t = Object.values(n.cost).reduce((a, b) => a + b, 0); return [t > 0 ? `+${money(t)}/t` : t < 0 ? `−${money(-t)}/t` : 'Neutro', t > 0 ? 'bad' : t < 0 ? 'good' : '']; }],
  'nac:seg': ['tan', 'Policía y ejército en las calles', () => { const n = Q.natInfo(); return [`Seguridad ${Math.round(n.ix.seg.v)}`, n.ix.seg.v < 35 ? 'bad' : '']; }],
  'nac:nar': ['ofensiva', 'Cárteles: combatirlos, pactar o legalizar', () => { const n = Q.natInfo(); return n.cart.length ? [`${n.cart.length} cártel${n.cart.length > 1 ? 'es' : ''}`, 'bad'] : ['Sin cárteles', 'good']; }],
  'nac:int': ['ojo', 'Director, vigilancia y operaciones secretas', () => { const s = Q.secInfo(); return [`Agencia nivel ${s.lvl.toFixed(1)}`, '']; }],
  'nac:soc': ['jov', 'Debates, movimientos y educación a largo plazo', () => { const s = Q.socInfo(), m = s.deb.concat(s.mov).sort((a, b) => b.mv - a.mv)[0]; return m.mv > D.SOC.protestAt - 15 ? ['Calle caliente', 'bad'] : ['Tranquila', 'good']; }],
  'nac:inf': ['pin', 'Resumen para decidir de un vistazo', () => ['', '']],
  'pol:reg': ['frontera', 'Malestar y separatismo región por región', () => { const l = Q.rlList(); return l.length && l[0][1] >= D.RL.protestAt ? ['Hay focos', 'bad'] : ['Calmas', 'good']; }],
  'pol:ley': ['acuerdo', 'Propón o deroga leyes y mira qué provocan', () => [`${Object.keys(S().pol.laws).length} vigentes`, '']],
  'pol:con': ['emp', 'Tu coalición y cómo votan los partidos', () => { const g = S().pol.seats.filter(p => p.g).reduce((a, p) => a + p.s, 0); return [`${Math.round(g)} de 100`, g > 50 ? 'good' : 'bad']; }],
  'pol:sec': ['obr', 'Qué grupos te apoyan y cuáles no', () => [`Aprobación ${Math.round(Q.approval())}`, Q.approval() < 40 ? 'bad' : '']],
  'pol:enc': ['ojo', 'Encuestas detalladas por sector', () => ['', '']],
  'pol:ele': ['pre', 'Cuándo vuelves a las urnas y cómo vas', () => { const e = S().pol.nextElec - S().turn; return [e > 0 ? `En ${e} t` : 'Ahora', e <= 3 ? 'gold' : '']; }],
  'pol:gab': ['min', 'Tus ministros y quién te sucede', () => ['', '']],
  'pol:dis': ['cultural', 'Discursos a la nación', () => ['', '']],
  'pol:per': ['jov', 'La oposición, la prensa, el general y el magnate', () => ['', '']],
  'eco:pre': ['oro', 'Ingresos, gastos y deuda', () => { const f = S().fin; return f ? [(f.net >= 0 ? '+' : '−') + money(Math.abs(f.net)).replace('−', '') + '/t', f.net >= 0 ? 'good' : 'bad'] : ['', '']; }],
  'mil:man': ['aerea', 'Jefes, lealtad y moral de cada rama', () => { const s = Q.secInfo(), a = Object.values(s.br).reduce((x, b) => x + b.loy, 0) / 3; return [`Lealtad ${Math.round(a)}`, a < 40 ? 'bad' : '']; }],
  'mil:gue': ['war', 'Frentes y paz de tus guerras', () => { const n = Q.warsOf(me()).length; return n ? [`${n} en curso`, 'bad'] : ['En paz', 'good']; }],
  'dip:rel': ['paz', 'Cómo te ve cada país', () => ['', '']],
  'world:con': ['caz', 'Lo que hablan los líderes entre sí', () => { const n = (S().talk || []).filter(Q.talkOpen).length; return n ? [`${n} para intervenir`, 'gold'] : ['', '']; }]
};
const CARD_IC = { eco: 'oro', pla: 'pla', com: 'com', bol: 'imp', ind: 'eco', fab: 'tec', pol: 'imp', rut: 'naval', rec: 'pet', pre: 'oro', lab: 'tec', car: 'tec', pot: 'tec', rel: 'paz', tra: 'acuerdo', onu: 'frontera', rep: 'ojo', int: 'ojo', blo: 'fra', ocu: 'bandera', tea: 'ofensiva', fue: 'tan', mis: 'frontera', bas: 'cuartel', gue: 'ofensiva', log: 'car', est: 'seg', man: 'aerea', act: 'ojo', ran: 'trofeo', not: 'cultural', per: 'cultural', gen: 'check', obj: 'trofeo', aju: 'obras', dia: 'cultural', glo: 'ojo', his: 'eco' };
const PANEL_N = { eco: 'Economía', tec: 'Ciencia', dip: 'Diplomacia', world: 'El mundo', mil: 'Fuerzas armadas', edit: 'Editor', sys: 'Partida', pol: 'Política', nac: 'Nación' };
function hubCards(id) { const H0 = HUBS[id], seen = new Set(), out = [], add = (p, t, label) => { const k = p + ':' + t; if (seen.has(k) || hubOfTab(p, t) !== id) return; seen.add(k); out.push({ p, t, k, label }); };
  const lab = {}; for (const p in PTABS) for (const [t, l] of PTABS[p]) lab[p + ':' + t] = l;
  for (const k of H0.order) if (lab[k]) add(...k.split(':'), lab[k]);
  for (const p in PTABS) for (const [t, l] of PTABS[p]) add(p, t, l); return out; }
const hubTodo = id => { try { return todo().filter(x => x.go && (x.go.p ? hubOfTab(x.go.p, x.go.t) === id : false)); } catch (e) { return []; } };
PT.hub = ''; Object.defineProperty(PT, 'hub', { get: () => (HUBS[UI.hub] || HUBS.pais).n });
IC.hub = IC.nac; Object.assign(IC, { 'h:pais': IC.nac, 'h:gob': IC.pol, 'h:eco': IC.eco, 'h:mun': IC.dip, 'h:def': IC.mil, 'h:mas': 'M5 12h.01M12 12h.01M19 12h.01M5 12a1 1 0 100 .01M12 12a1 1 0 100 .01M19 12a1 1 0 100 .01' });
PANELS.hub = () => { const id = UI.hub || 'pais', h = HUBS[id], cards = hubCards(id), urgent = hubTodo(id);
  return `<p class="mut fine">${esc(h.d)}</p>
    ${urgent.length ? `<div class="hub-urg">${urgent.map(x => `<button class="btn sm gold" data-a="hubGo" data-p="${x.go.p}" data-t="${x.go.t || ''}">${gi('pin')} ${esc(x.t)}</button>`).join('')}</div>` : ''}
    <div class="hubgrid">${cards.map(c => { const m = CARD[c.k] || [CARD_IC[c.t] || 'pin', '', () => ['', '']]; let st = ['', '']; try { st = m[2](); } catch (e) { }
      return `<button class="card hcard ${c.k === 'nac:con' ? 'feat' : ''}" data-a="hubGo" data-p="${c.p}" data-t="${c.t}"><span class="hico">${gi(m[0])}</span><b>${esc(c.label)}</b><small>${esc(m[1] || (PANEL_N[c.p] || '') + ' · ' + c.label)}</small>${st[0] ? `<em class="hst ${st[1]}">${esc(st[0])}</em>` : ''}</button>`; }).join('')}</div>`; };
H.hubGo = d => { UI.panel = d.p; if (d.t) UI.tab[d.p] = d.t; if (innerWidth < 1250) UI.sel = null; UI.render(); refreshMap(); };
H.hubBack = () => { const p = UI.panel, h = hubOfTab(p, UI.tab[p] || (PTABS[p] || [[]])[0][0]); if (h) { UI.hub = h; UI.panel = 'hub'; UI.render(); } };
H.goTab = d => H.hubGo({ p: d.p, t: d.t });
/* el dock: secciones en vez de pantallas */
DOCK.length = 0; DOCK.push(['h:pais', 'Mi país'], ['h:gob', 'Gobierno'], ['h:eco', 'Economía'], ['h:mun', 'Mundo'], ['h:def', 'Defensa'], ['h:mas', 'Más']);
function dockOn(id) { const h = id.slice(2); if (UI.panel === 'hub') return UI.hub === h; return !!UI.panel && hubOfTab(UI.panel, UI.tab[UI.panel] || ((PTABS[UI.panel] || [[]])[0] || [])[0]) === h; }
{ const o0 = H.open; H.open = d => { if (!String(d.p).startsWith('h:')) return o0(d); const h = d.p.slice(2); if (typeof setSnap === 'function') setSnap('pn', 'full');
  if (dockOn(d.p) && UI.panel === 'hub') { UI.panel = null; UI.render(); return refreshMap(); } UI.hub = h; UI.panel = 'hub'; if (innerWidth < 1250) UI.sel = null; UI.render(); refreshMap(); }; }
/* «Relacionado»: cada pestaña enlaza con lo que mueve o lo que se ve afectado */
const REL = {
  'nac:est': [['nac', 'gas', 'Gasto', 'oro'], ['nac', 'seg', 'Seguridad', 'tan'], ['nac', 'soc', 'Sociedad', 'jov'], ['nac', 'con', 'Conexiones', 'ojo']],
  'nac:gas': [['nac', 'est', 'Ver efectos', 'seg'], ['eco', 'pre', 'Presupuesto', 'oro'], ['nac', 'con', 'Conexiones', 'ojo']],
  'nac:seg': [['nac', 'nar', 'Narcotráfico', 'ofensiva'], ['mil', 'man', 'Mandos', 'aerea'], ['pol', 'reg', 'Regiones', 'frontera']],
  'nac:nar': [['nac', 'seg', 'Seguridad', 'tan'], ['nac', 'int', 'Inteligencia', 'ojo'], ['pol', 'ley', 'Leyes', 'acuerdo']],
  'nac:int': [['nac', 'nar', 'Narcotráfico', 'ofensiva'], ['dip', 'int', 'Espionaje exterior', 'ojo'], ['mil', 'man', 'Mandos', 'aerea']],
  'nac:soc': [['pol', 'ley', 'Leyes', 'acuerdo'], ['pol', 'ele', 'Elecciones', 'pre'], ['pol', 'enc', 'Encuestas', 'ojo'], ['nac', 'gas', 'Gasto', 'oro']],
  'nac:inf': [['sys', 'his', 'Historia', 'eco'], ['nac', 'est', 'Estado', 'seg'], ['eco', 'pre', 'Presupuesto', 'oro']],
  'nac:con': [['nac', 'gas', 'Gasto', 'oro'], ['pol', 'ley', 'Leyes', 'acuerdo'], ['nac', 'est', 'Estado', 'seg']],
  'pol:ley': [['nac', 'con', 'Qué mueven', 'ojo'], ['pol', 'con', 'Congreso', 'emp'], ['nac', 'soc', 'Opinión pública', 'jov'], ['pol', 'sec', 'Sectores', 'obr']],
  'pol:con': [['pol', 'ley', 'Leyes', 'acuerdo'], ['pol', 'ele', 'Elecciones', 'pre']],
  'pol:sec': [['pol', 'enc', 'Encuestas', 'ojo'], ['nac', 'soc', 'Sociedad', 'jov'], ['pol', 'dis', 'Discurso', 'cultural']],
  'pol:enc': [['pol', 'sec', 'Sectores', 'obr'], ['pol', 'dis', 'Discurso', 'cultural'], ['pol', 'ele', 'Elecciones', 'pre']],
  'pol:ele': [['pol', 'enc', 'Encuestas', 'ojo'], ['pol', 'dis', 'Discurso', 'cultural'], ['pol', 'sec', 'Sectores', 'obr']],
  'pol:reg': [['nac', 'seg', 'Ejército en calles', 'tan'], ['nac', 'gas', 'Gasto', 'oro'], ['nac', 'nar', 'Narcotráfico', 'ofensiva']],
  'pol:gab': [['pol', 'per', 'Personajes', 'jov'], ['mil', 'man', 'Mandos', 'aerea']],
  'eco:pre': [['nac', 'gas', 'Gasto del país', 'oro'], ['eco', 'pol', 'Deuda', 'imp'], ['eco', 'com', 'Comercio', 'com']],
  'mil:man': [['nac', 'seg', 'Seguridad', 'tan'], ['mil', 'fue', 'Fuerzas', 'tan'], ['pol', 'gab', 'Gabinete', 'min']],
  'mil:fue': [['mil', 'man', 'Mandos', 'aerea'], ['mil', 'log', 'Logística', 'car']],
  'dip:rel': [['dip', 'tra', 'Tratados', 'acuerdo'], ['dip', 'blo', 'Bloques', 'fra'], ['world', 'con', 'Conversaciones', 'caz']],
  'dip:int': [['nac', 'int', 'Inteligencia interna', 'ojo'], ['dip', 'rel', 'Relaciones', 'paz']],
  'world:con': [['dip', 'rel', 'Relaciones', 'paz'], ['dip', 'onu', 'ONU', 'frontera']]
};
function relatedHTML(p, t) { const L = REL[p + ':' + t]; if (!L) return ''; return `<nav class="rel5" aria-label="Relacionado"><small>Relacionado</small>${L.map(x => `<button class="chip" data-a="goTab" data-p="${x[0]}" data-t="${x[1]}">${gi(x[3])} ${esc(x[2])}</button>`).join('')}</nav>`; }

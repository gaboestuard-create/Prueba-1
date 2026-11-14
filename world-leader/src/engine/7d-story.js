/* =====================================================================
   SISTEMA · FASE 4 · PERSONALIDAD Y NARRATIVA
   Sinergias entre rasgos, condición de rasgo en eventos, «Diario de mi
   mandato», frases de líderes según su carácter y el juicio de la
   historia (legado) al terminar.
   ===================================================================== */
const synergies = () => (D.SYNERGY || []).filter(x => S.leader.traits.includes(x.a) && S.leader.traits.includes(x.b));
{ const m0 = mod; mod = k => { let v = m0(k); if (S && S.leader) for (const x of synergies()) v += x.m[k] || 0; return v; }; }
{ const c0 = condOk; condOk = q => c0(q) && (!q || !q.trait || S.leader.traits.includes(q.trait)); }
hook('new', () => { S.diary = []; }); hook('load', () => { S.diary = S.diary || []; });
function diary(x, k) { S.diary.push({ t: S.turn, x, k: k || 'pol' }); if (S.diary.length > 400) S.diary.splice(0, S.diary.length - 400); }
{ const n0 = news; news = (x, k, iso, p) => { n0(x, k, iso, p); if (S.diary && iso === S.player && (p || 1) >= 2 && ['war', 'peace', 'pol', 'elec', 'coup', 'tec', 'dip', 'mil'].includes(k)) diary(x, k); }; }
{ const d0 = ACT.decide; ACT.decide = a => { const p = S.pend[0], o = p && p.opts && p.opts[+a.i]; const r = d0(a); if (r && r.ok !== false && o && S.diary && p.k !== 'un') diary(`${p.t}: ${o.t}`, 'dec'); return r; }; }
/* frases de líderes según su carácter, reaccionando a lo que hiciste este turno */
function archetype(z) { const p = S.c[z].per; return p.agres > .6 ? 'halcon' : p.coop > .65 ? 'paloma' : p.rencor > .65 && rel(S.player, z) < 0 ? 'rencor' : 'pragma'; }
hook('late', () => { const me = S.player, mine = S.news.filter(n => n.t >= S.turn - 1 && n.i === me), ctxs = [];
  if (mine.some(n => /declara la guerra/.test(n.x))) ctxs.push('war'); if (mine.some(n => n.k === 'dip' && /firman|firma /.test(n.x))) ctxs.push('treaty'); if (mine.some(n => /sanciona/.test(n.x))) ctxs.push('sanc');
  if (mine.some(n => n.k === 'tec')) ctxs.push('disc'); if (mine.some(n => n.k === 'elec')) ctxs.push('elec'); if (inWar(me) && warScoreFor(me) < -30) ctxs.push('weak');
  if (!ctxs.length || !chance(.7)) return; const ctx = pick(ctxs), pool = alive().filter(z => z !== me && (S.c[z].gdp > 400 || nb(me).includes(z)));
  for (const z of shuffle(pool).slice(0, ctx === 'war' ? 3 : 2)) { const L = (D.QUOTES[archetype(z)] || {})[ctx]; if (!L) continue;
    const q = pick(L).replace(/\{P\}/g, S.leader.n).replace(/\{C\}/g, P().n); news(`${S.c[z].lider.n} (${S.c[z].n}): ${q}`, 'dip', z, 1); wlog('dip', z, me, `${S.c[z].lider.n} sobre ${P().n}: ${q}`); } });
/* el juicio de la historia */
function legacy() {
  const s = S, c = P(), yrs = s.turn / 4, g = (c.gdp / Math.max(.001, s.stats.gdp0 || c.gdp) - 1) * 100, ap = s.hist.appr.length ? s.hist.appr.reduce((a, b) => a + b, 0) / s.hist.appr.length : approval();
  const firsts = s.disc ? D.DISC.filter(x => (s.disc.own[x.id] || [])[0] === s.player).length : 0, crimes = (s.war3 || {}).crimes || 0, R = s.rep;
  const facts = [[g > 40, 'el del milagro económico', `Bajo su mandato la economía creció un ${Math.round(g)}%.`], [R.paz > 40, 'el pacificador', 'Se le recuerda por evitar guerras y firmar paces difíciles.'],
    [s.stats.annexed >= 2 || (s.stats.wars >= 3 && R.paz < -20), 'el conquistador', `Libró ${s.stats.wars} guerras y redibujó el mapa.`], [firsts >= 3, 'el visionario', `Su país fue el primero del mundo en ${firsts} grandes descubrimientos.`],
    [s.stats.laws >= 20, 'el reformador', `Aprobó ${s.stats.laws} leyes que cambiaron la vida diaria.`], [ap > 62, 'el querido', 'El pueblo lo quiso como a pocos.'], [crimes >= 3 || R.dem < -40, 'el tirano', 'Su nombre quedó ligado a la represión y a los crímenes de guerra.'],
    [g < -15, 'el de la ruina', `La economía se hundió un ${Math.round(-g)}%.`], [yrs < 2, 'el breve', 'Su paso por el poder fue tan corto que pocos lo recuerdan.']];
  const hit = facts.filter(f => f[0]), title = hit.length ? hit[0][1] : 'el gestor', score = clamp(Math.round(50 + g / 3 + (ap - 50) / 2 + R.paz / 6 + R.gen / 8 + firsts * 3 - crimes * 6 - s.stats.annexed * 4), 0, 100);
  const text = (hit.slice(0, 3).map(f => f[2]).join(' ') || 'Gobernó sin grandes aciertos ni grandes desastres.') + ` Estuvo ${yrs >= 1 ? Math.round(yrs * 10) / 10 + ' años' : s.turn + ' trimestres'} en el poder.`;
  const key = s.diary.filter(d => ['war', 'peace', 'elec', 'tec', 'coup', 'dec'].includes(d.k)).slice(-8);
  return { name: `${s.leader.n}, ${title}`, title, score, text, key, stats: { yrs, g, ap, firsts, crimes, laws: s.stats.laws, wars: s.stats.wars, annexed: s.stats.annexed } };
}

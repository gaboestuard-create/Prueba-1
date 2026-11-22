/* =====================================================================
   BALANCE · la IA también paga su ejército, y aviso de plazos de campaña
   Antes las IAs compraban armas sin coste fijo y sus ejércitos crecían sin
   límite. Ahora pagan parte del mantenimiento; si se arruinan, desmovilizan.
   ===================================================================== */
const AI_UPKEEP = .6; // fracción del mantenimiento que paga la IA (el jugador paga 1)
hook('world', () => {
  for (const iso of alive()) { if (isP(iso)) continue; const c = S.c[iso];
    c.tr -= upkeep(iso) * AI_UPKEEP * (inWar(iso) ? 1.3 : 1);
    if (c.tr < -c.gdp * .01) { for (const k in c.u) c.u[k] = Math.floor(c.u[k] * .96); c.tr = -c.gdp * .01; } }
});
/* techo de rearme: la IA no compra si su ejército ya supera N veces el inicial (ajustado a cuánto ha crecido su economía) */
const AI_ARMS_X = 2, AI_ARMS_X_WAR = 3.5;
const armsBase = c => { let v = 0; for (const k in D.UNITS) v += (c.u[k] || 0) * D.UNITS[k].pow; return v; };
hook('new', () => { for (const iso of ISOS) { const c = S.c[iso]; c.p0 = armsBase(c); c.g0 = c.gdp; } });
hook('load', () => { for (const iso of ISOS) { const c = S.c[iso]; if (c.p0 == null) { c.p0 = armsBase(c); c.g0 = c.gdp; } } });
{ const b0 = aiBuy; aiBuy = iso => { const c = S.c[iso], cap = Math.max(c.p0, 20) * (inWar(iso) ? AI_ARMS_X_WAR : AI_ARMS_X) * Math.sqrt(Math.max(1, c.gdp / c.g0)), p0 = armsBase(c); if (p0 >= cap) return false;
  const u0 = Object.assign({}, c.u), tr0 = c.tr, r = b0(iso), p1 = armsBase(c); if (p1 <= cap) return r;
  const f = (cap - p0) / (p1 - p0); for (const k in c.u) c.u[k] = (u0[k] || 0) + Math.floor((c.u[k] - (u0[k] || 0)) * f); c.tr = tr0 - (tr0 - c.tr) * f; return r; }; } /* una compra no puede saltarse el techo: se recorta y se devuelve el dinero sobrante */
/* campaña: alerta cuando a la etapa le quedan 4 turnos o menos */
{ const a0 = alerts; alerts = () => { const out = a0(), ci = campInfo();
  if (ci && ci.K.end == null && ci.left != null && ci.left <= 4) { const miss = ci.goals.filter(g => !g.ok).map(g => g.t);
    if (miss.length) out.unshift({ p: 5, t: `Campaña: ${Math.max(0, ci.left)} turno${ci.left === 1 ? '' : 's'} para «${ci.st.n}». Falta: ${miss.join(', ')}`, panel: 'sys', tab: 'obj' }); }
  return out; }; }

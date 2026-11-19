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
/* campaña: alerta cuando a la etapa le quedan 4 turnos o menos */
{ const a0 = alerts; alerts = () => { const out = a0(), ci = campInfo();
  if (ci && ci.K.end == null && ci.left != null && ci.left <= 4) { const miss = ci.goals.filter(g => !g.ok).map(g => g.t);
    if (miss.length) out.unshift({ p: 5, t: `Campaña: ${Math.max(0, ci.left)} turno${ci.left === 1 ? '' : 's'} para «${ci.st.n}». Falta: ${miss.join(', ')}`, panel: 'sys', tab: 'obj' }); }
  return out; }; }

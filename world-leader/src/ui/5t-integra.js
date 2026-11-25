/* =====================================================================
   INTERFAZ · LO NUEVO EN LA GUÍA, LOS CONSEJOS Y LAS GRÁFICAS
   «Qué hacer ahora» avisa de cárteles, protestas, mandos y director;
   Partida → Historia suma los indicadores de la Nación.
   ===================================================================== */
{ const t0 = todo; todo = () => { const out = t0(), s = S(), n = Q.natInfo(), so = Q.socInfo(), sc = Q.secInfo(); if (!n || !so || !sc) return out;
  const add = (p, t, go) => out.push({ p, t, go }), go = (p, t) => ({ p, t });
  const hot = n.cart.filter(k => k.str > 70).sort((a, b) => b.str - a.str)[0]; if (hot) add(7, `${hot.n} domina ${hot.reg} (fuerza ${Math.round(hot.str)})`, go('nac', 'nar'));
  if (n.ix.seg.v < 30) add(7, `La seguridad pública está por los suelos (${Math.round(n.ix.seg.v)})`, go('nac', 'seg'));
  const mv = so.deb.concat(so.mov).sort((a, b) => b.mv - a.mv)[0]; if (mv.mv > D.SOC.protestAt - 15) add(6, `Un movimiento social se calienta: ${(D.DEBATES[mv.k] || D.MOVES[mv.k]).n.toLowerCase()} (${Math.round(mv.mv)})`, go('nac', 'soc'));
  const lo = Object.entries(sc.br).sort((a, b) => a[1].loy - b[1].loy)[0]; if (lo[1].loy < D.BR.coupAt + 12) add(6, `La lealtad de ${D.BRANCH[lo[0]].n.toLowerCase()} es baja (${Math.round(lo[1].loy)})`, go('mil', 'man'));
  if (sc.surv && sc.dir.loy < D.SECINT.dir.blackmailAt + 10) add(5, `Tu director de inteligencia es poco leal (${Math.round(sc.dir.loy)})`, go('nac', 'int'));
  return out.sort((a, b) => b.p - a.p).slice(0, 3); }; }
TIPS.push(['nac', 'En Nación ves cómo está tu país por dentro: seguridad, corrupción, educación… y desde ahí reparte el gasto, saca al ejército o combate a los cárteles.', { p: 'nac', t: 'est' }],
  ['soc', 'En Nación → Sociedad la opinión pública cambia sola: si tus leyes chocan con una mayoría, acabarán marchando contra ti.', { p: 'nac', t: 'soc' }]);
{ const h0 = historyHTML; historyHTML = () => { const base = h0(), N = Q.natInfo(); if (!N || !N.ix.seg.h || N.ix.seg.h.length < 2) return base; const pick = (ks, cols) => ks.map((k, i) => ({ n: D.NAT_IX[k].n, c: cols[i], me: !i, v: N.ix[k].h }));
  return base + lineChart(pick(['seg', 'cri', 'cor'], ['#e8c36a', '#ff8a7a', '#b99cff']), 'Seguridad, crimen y corrupción', v => Math.round(v) + '') + lineChart(pick(['edu', 'sal', 'des'], ['#7fe0a8', '#8fd3ff', '#ff8a7a']), 'Educación, salud y desigualdad', v => Math.round(v) + ''); }; }

/* =====================================================================
   SISTEMA · EL DESPACHO: discursos a la nación
   Cada pocos turnos puedes dirigirte al país eligiendo tono y tema. El
   público reacciona según tu aprobación, tu carisma y lo que digas.
   ===================================================================== */
hook('new', () => { S.speech = null; S.speechT = 0; }); hook('load', () => { if (S.speech === undefined) S.speech = null; S.speechT = S.speechT || 0; });
ACT.speech = a => {
  const SP = D.SPEECH, T = SP.tones[a.tone], P2 = SP.topics[a.topic], me = S.player; if (!T || !P2) return fail('Elige tono y tema');
  if (S.speechT > S.turn) return fail(`Ya hablaste hace poco: espera ${S.speechT - S.turn} turnos`);
  if (a.tone === 'culpar' && (!S.c[a.iso] || !S.c[a.iso].alive || a.iso === me)) return fail('Elige a qué país señalar');
  if (!useCP(SP.cp)) return fail(`Necesitas ${SP.cp} de capital político`);
  const ap = approval(), weak = T.needAppr && ap < T.needAppr, k = weak ? .4 : 1, out = {};
  const add = (s, v) => { if (!v) return; secAdd(s, v); out[s] = (out[s] || 0) + v; };
  for (const s in S.pol.sec) add(s, Math.round((T.all || 0) * k));
  for (const s in P2.sec) add(s, P2.sec[s]);
  if (T.stab) P().stab = clamp(P().stab + T.stab, 0, 100); if (T.paz) repAdd('paz', T.paz);
  if (T.foe) addMod(me, a.iso, 'Te señaló en un discurso a su nación', T.foe, .3, 1);
  if (T.later) S.later.push({ t: S.turn + 4, p: .6, fx: [['sec', 'all', T.later]], msg: 'Las promesas de tu discurso no se cumplieron' });
  const favor = Math.round(clamp(ap + (T.favor || 0) * k + mod('elect') * 2 + rr(-8, 8), 5, 95));
  S.speech = { t: S.turn, tone: a.tone, topic: a.topic, favor, iso: a.iso || null, sec: out }; S.speechT = S.turn + SP.cool;
  news(`${S.leader.n} se dirige a la nación: «${P2.n}». El ${favor}% lo aprueba`, 'pol', me, 3); return { msg: `Discurso emitido: ${favor}% de aprobación`, favor, sec: out };
};

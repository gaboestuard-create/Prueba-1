// TikTok "Día del Médico": agradecimiento de Laboratorio Clínico Villanueva a los médicos.
// Tiempos en segundos globales, tomados de src/palabras_medico.json (transcripción de la voz).
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import {
  C, Centro, Escena, Ficha, Franjas, Golpe, MONO, Mascota, Progreso, Subtitulos, TITULO, f, lerp, usePop, useSacudida,
} from "./piezas";
import palabras from "./palabras_medico.json";

export const DURACION_MEDICO = f(41.5);
const ORO = "#F2B544";
const ECG = "#3DDC84";
const E = { noche: 0, guardias: 4.9, dia: 11.4, gracias3: 18.1, casa: 21.5, sangre: 25.5, honor: 31.55, final: 33.5, fin: 41.5 };

// ---------- piezas propias de este video ----------
const FondoNoche: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 70% 15%, #1B3B63 0%, #0A1A2F 55%, #040A14 100%)" }}>
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: random("ex" + i) * 1080, top: random("ey" + i) * 900, width: 4, height: 4, borderRadius: 2,
          background: "#fff", opacity: 0.25 + 0.5 * Math.abs(Math.sin(frame / 20 + i)) }} />
      ))}
    </AbsoluteFill>
  );
};

/** Fondo cálido: crema con corazones y cruces médicas flotando muy suaves. */
const FondoCalido: React.FC<{ tono?: string }> = ({ tono = C.crema }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, #FFFFFF 0%, ${tono} 70%)`, overflow: "hidden" }}>
      {Array.from({ length: 16 }, (_, i) => {
        const x = random("cx" + i) * 1080;
        const y = ((random("cy" + i) * 2100 - frame * (0.8 + random("cv" + i))) % 2100 + 2100) % 2100 - 100;
        const s = 40 + random("cs" + i) * 60;
        return i % 2 ? (
          <Corazon key={i} size={s} style={{ position: "absolute", left: x, top: y, opacity: 0.12 }} color={C.naranja} />
        ) : (
          <svg key={i} width={s} height={s} viewBox="0 0 10 10" style={{ position: "absolute", left: x, top: y, opacity: 0.1, transform: `rotate(${frame + i * 20}deg)` }}>
            <path d="M4 0h2v4h4v2H6v4H4V6H0V4h4z" fill={C.azul} />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

const Corazon: React.FC<{ size: number; color?: string; style?: React.CSSProperties; latido?: number }> = ({ size, color = "#E8344A", style, latido = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `scale(${latido})`, overflow: "visible", ...style }}>
    <path d="M50 88 C 12 62 4 38 18 22 C 30 9 46 14 50 28 C 54 14 70 9 82 22 C 96 38 88 62 50 88 Z" fill={color} />
    <ellipse cx="32" cy="32" rx="10" ry="6" fill="#fff" opacity="0.35" transform="rotate(-35 32 32)" />
  </svg>
);

/** Trazo de electrocardiograma que avanza; `pico` = fase del latido. */
const Electro: React.FC<{ top: number; color?: string; ancho?: number }> = ({ top, color = ECG, ancho = 1080 }) => {
  const frame = useCurrentFrame();
  const pts: string[] = [];
  for (let x = 0; x <= ancho; x += 6) {
    const fase = ((x + frame * 9) % 360) / 360;
    let y = 0;
    if (fase > 0.42 && fase < 0.46) y = -20;
    else if (fase >= 0.46 && fase < 0.49) y = 120;
    else if (fase >= 0.49 && fase < 0.53) y = -180;
    else if (fase >= 0.53 && fase < 0.56) y = 40;
    else if (fase > 0.68 && fase < 0.76) y = -30 * Math.sin(((fase - 0.68) / 0.08) * Math.PI);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return (
    <svg width={ancho} height="420" viewBox={`0 -220 ${ancho} 420`} style={{ position: "absolute", top, left: 0, filter: `drop-shadow(0 0 14px ${color})` }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const Reloj: React.FC = () => {
  const frame = useCurrentFrame();
  const p = usePop(-0.1);
  const min = Math.floor(lerp(frame, 0, f(4.8), 0, 4));
  return (
    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 150, color: "#FF5A5A", letterSpacing: 4, transform: `scale(${p})`,
      textShadow: "0 0 30px rgba(255,90,90,0.7)", padding: "10px 40px", border: "4px solid rgba(255,90,90,0.4)", borderRadius: 24, background: "rgba(0,0,0,0.35)" }}>
      03<span style={{ opacity: Math.floor(frame / 15) % 2 ? 0.2 : 1 }}>:</span>0{min}<span style={{ fontSize: 50, marginLeft: 14 }}>a.m.</span>
    </div>
  );
};

const IconoLinea: React.FC<{ tipo: string; color?: string; size?: number }> = ({ tipo, color = C.tinta, size = 120 }) => {
  const k = { stroke: color, strokeWidth: 7, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {tipo === "cafe" && <><path d="M20 38 h48 v26 a18 18 0 0 1 -18 18 h-12 a18 18 0 0 1 -18 -18 z" {...k} /><path d="M68 44 h6 a10 10 0 0 1 0 20 h-6" {...k} /><path d="M34 14 q6 8 0 16 M48 14 q6 8 0 16" {...k} /></>}
      {tipo === "guardia" && <><circle cx="50" cy="52" r="34" {...k} /><path d="M50 32 v22 l14 10" {...k} /><path d="M30 10 l-12 12 M70 10 l12 12" {...k} /></>}
      {tipo === "decision" && <><path d="M50 90 V56 M50 56 L24 28 M50 56 L76 28" {...k} /><path d="M14 30 l10 -4 l2 10 M86 30 l-10 -4 l-2 10" {...k} /></>}
      {tipo === "oido" && <><path d="M30 40 a22 22 0 1 1 40 12 c-6 8 -12 10 -12 22 a10 10 0 0 1 -20 0" {...k} /><path d="M44 42 a8 8 0 1 1 12 6" {...k} /></>}
      {tipo === "explicar" && <><path d="M14 22 h72 v44 h-36 l-16 14 v-14 h-20 z" {...k} /><path d="M28 38 h44 M28 52 h28" {...k} /></>}
      {tipo === "acompanar" && <><circle cx="34" cy="26" r="10" {...k} /><circle cx="66" cy="26" r="10" {...k} /><path d="M18 84 v-26 a16 16 0 0 1 32 0 M50 58 a16 16 0 0 1 32 0 v26 M42 62 h16" {...k} /></>}
      {tipo === "diagnostico" && <><rect x="22" y="14" width="56" height="76" rx="8" {...k} /><path d="M36 50 l10 10 l20 -22" {...k} /><path d="M40 14 v-4 h20 v4" {...k} /></>}
    </svg>
  );
};

const Estetoscopio: React.FC<{ s: number; size?: number }> = ({ s, size = 420 }) => {
  const frame = useCurrentFrame();
  const dib = lerp(frame, f(s), f(s + 1.2), 0, 1);
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
      <path d="M60 20 v40 a40 40 0 0 0 80 0 v-40 M100 100 v30 a30 30 0 0 0 30 30 h10" fill="none" stroke={C.azul} strokeWidth="9" strokeLinecap="round"
        strokeDasharray="420" strokeDashoffset={420 * (1 - dib)} />
      <circle cx="160" cy="160" r={18 * dib} fill={C.naranja} stroke={C.azul} strokeWidth="6" />
      <circle cx="60" cy="18" r={8 * dib} fill={C.azul} /><circle cx="140" cy="18" r={8 * dib} fill={C.azul} />
    </svg>
  );
};

const Confeti: React.FC<{ s: number; n?: number }> = ({ s, n = 60 }) => {
  const frame = useCurrentFrame();
  const t = (frame - f(s)) / 30;
  if (t < 0 || t > 3.5) return null;
  const cols = [C.naranja, C.azul, ORO, "#E8344A", C.naranjaViva];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: n }, (_, i) => {
        const ang = random("a" + i) * Math.PI * 2;
        const v = 500 + random("v" + i) * 900;
        const x = 540 + Math.cos(ang) * v * t;
        const y = 760 + Math.sin(ang) * v * t * 0.8 + 600 * t * t;
        const op = interpolate(t, [0, 0.1, 2.6, 3.5], [0, 1, 1, 0]);
        return i % 3 === 0 ? (
          <Corazon key={i} size={44} color={cols[i % 5]} style={{ position: "absolute", left: x, top: y, opacity: op, transform: `rotate(${t * 300 + i * 40}deg)` }} />
        ) : (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: 18, height: 34, background: cols[i % 5], opacity: op, borderRadius: 4,
            transform: `rotate(${t * 500 + i * 33}deg)` }} />
        );
      })}
    </AbsoluteFill>
  );
};

// ---------- escenas ----------
const Noche: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Escena desde={E.noche} hasta={E.guardias}>
      <FondoNoche />
      <Centro top={260}><Reloj /></Centro>
      <Electro top={540} />
      <Centro top={1010}>
        {frame < f(2.75) ? (
          <>
            <Golpe s={-0.12} desde={1.2} style={{ fontSize: 76, fontWeight: 600, color: C.crema }}>hay quienes eligen</Golpe>
            <Golpe s={1.2} style={{ fontSize: 120 }}>NO DORMIR</Golpe>
          </>
        ) : (
          <>
            <Golpe s={2.75} style={{ fontSize: 76, fontWeight: 600, color: C.crema }}>para que tú sí puedas</Golpe>
            <Golpe s={3.76} style={{ fontSize: 120, color: ORO }}>DESCANSAR</Golpe>
          </>
        )}
      </Centro>
    </Escena>
  );
};

const Guardias: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    { s: 4.96, txt: "DESVELOS", icono: "cafe" },
    { s: 6.08, txt: "GUARDIAS", icono: "guardia" },
    { s: 7.08, txt: "DECISIONES DIFÍCILES", icono: "decision" },
  ];
  const aliento = usePop(9.52, 10);
  const sac = useSacudida([4.96, 6.08, 7.08], 14);
  return (
    <Escena desde={E.guardias} hasta={E.dia}>
      <FondoNoche />
      <AbsoluteFill style={{ transform: sac }}>
        <div style={{ position: "absolute", top: 230, left: 70, right: 70, display: "flex", flexDirection: "column", gap: 34,
          opacity: lerp(frame, f(9.3), f(9.8), 1, 0.25) }}>
          {items.map((it, i) => {
            const p = usePop(it.s, 12);
            return frame >= f(it.s) ? (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 30, transform: `translateX(${(1 - p) * -700}px)` }}>
                <div style={{ width: 150, height: 150, borderRadius: 34, background: "rgba(255,255,255,0.08)", border: "3px solid rgba(255,255,255,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconoLinea tipo={it.icono} color={C.crema} />
                </div>
                <div style={{ fontFamily: TITULO, fontWeight: 800, fontSize: i === 2 ? 78 : 104, color: C.blanco, letterSpacing: -2, lineHeight: 0.95 }}>{it.txt}</div>
              </div>
            ) : <div key={i} style={{ height: 150 }} />;
          })}
        </div>
        {frame >= f(8.52) && (
          <Centro top={820}>
            <Golpe s={8.52} style={{ fontSize: 70, fontWeight: 600, color: C.crema }}>y aun así, siempre</Golpe>
          </Centro>
        )}
        {frame >= f(9.52) && (
          <div style={{ position: "absolute", top: 930, left: 110, right: 110, transform: `scale(${aliento}) rotate(-2deg)` }}>
            <div style={{ background: C.crema, borderRadius: 50, padding: "34px 40px", display: "flex", alignItems: "center", gap: 26,
              boxShadow: `0 0 80px ${ORO}88` }}>
              <Corazon size={120} latido={1 + Math.max(0, Math.sin(frame / 5)) * 0.08} />
              <div style={{ fontFamily: TITULO, fontWeight: 800, fontSize: 70, color: C.tinta, lineHeight: 0.95 }}>una palabra<br />de aliento</div>
            </div>
            <div style={{ width: 0, height: 0, marginLeft: 120, borderLeft: "40px solid transparent", borderRight: "10px solid transparent", borderTop: `50px solid ${C.crema}` }} />
          </div>
        )}
      </AbsoluteFill>
    </Escena>
  );
};

const Dia: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = frame < f(17.16) ? 0 : interpolate(frame, [f(17.16), f(17.16) + 10], [0.85, 0], { extrapolateRight: "clamp" });
  const sac = useSacudida([17.16], 24);
  const logo = usePop(13.36, 12);
  const latido = usePop(17.3, 8);
  const antes = frame < f(17.16);
  return (
    <Escena desde={E.dia} hasta={E.gracias3}>
      <FondoCalido />
      <AbsoluteFill style={{ transform: sac }}>
        {antes ? (
          <>
            <Centro top={200}>
              <Golpe s={11.43} style={{ fontSize: 70, fontWeight: 600, color: C.azul }}>hoy, en el</Golpe>
              <Golpe s={12.08} style={{ fontSize: 132, color: C.tinta }}>DÍA DEL</Golpe>
              <Golpe s={12.48} style={{ fontSize: 150, color: C.naranja }}>MÉDICO</Golpe>
            </Centro>
            <div style={{ position: "absolute", top: 640, left: 330 }}><Estetoscopio s={11.6} /></div>
            {frame >= f(13.36) && (
              <Centro top={1110}>
                <div style={{ fontFamily: MONO, fontSize: 30, color: "#5A6472", letterSpacing: 3, opacity: logo }}>DESDE</div>
                <Img src={staticFile("logo_sin_lema.png")} style={{ width: 560, marginTop: 10, transform: `scale(${logo})` }} />
              </Centro>
            )}
          </>
        ) : (
          <>
            <Centro top={420}>
              <Golpe s={17.16} desde={3.4} style={{ fontSize: 230, color: C.naranja, letterSpacing: -6, transform: "rotate(-4deg)",
                textShadow: `10px 10px 0 ${C.azul}` }}>¡GRACIAS!</Golpe>
            </Centro>
            <div style={{ position: "absolute", left: 390, top: 700 }}>
              <Corazon size={300} latido={latido * (1 + Math.max(0, Math.sin((frame - f(17.3)) / 5)) * 0.08)} />
            </div>
          </>
        )}
        <Mascota pose="guino_pulgar" desde={13.4} hasta={17.1} x={880} y={1330} alto={360} />
      </AbsoluteFill>
      <Confeti s={17.16} />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </Escena>
  );
};

const PorEscuchar: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    { s: 18.64, txt: "escuchar", icono: "oido", col: ORO },
    { s: 19.6, txt: "explicar", icono: "explicar", col: C.azulViva },
    { s: 20.72, txt: "acompañar", icono: "acompanar", col: C.naranjaViva },
  ];
  return (
    <Escena desde={E.gracias3} hasta={E.casa}>
      <FondoCalido tono="#F7E9D7" />
      <Centro top={200}>
        <Golpe s={18.16} style={{ fontSize: 96, color: C.tinta }}>GRACIAS POR</Golpe>
      </Centro>
      <div style={{ position: "absolute", top: 390, left: 80, right: 80, display: "flex", flexDirection: "column", gap: 30 }}>
        {items.map((it, i) => {
          const p = usePop(it.s, 11);
          return frame >= f(it.s) ? (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 30, background: it.col, borderRadius: 36, padding: "22px 34px",
              transform: `scale(${p}) rotate(${[-2, 1.5, -1][i]}deg)`, boxShadow: "0 16px 0 rgba(10,26,47,0.18)" }}>
              <IconoLinea tipo={it.icono} />
              <div style={{ fontFamily: TITULO, fontWeight: 800, fontSize: 96, color: C.tinta, letterSpacing: -2 }}>{it.txt}</div>
            </div>
          ) : <div key={i} style={{ height: 164 }} />;
        })}
      </div>
    </Escena>
  );
};

const Casa: React.FC = () => {
  const frame = useCurrentFrame();
  const camina = lerp(frame, f(23.76), f(25.2), 0, 1);
  const luz = lerp(frame, f(24.4), f(24.9), 0, 1);
  const diag = usePop(22.24, 11);
  return (
    <Escena desde={E.casa} hasta={E.sangre}>
      <FondoCalido />
      {frame < f(23.2) ? (
        <>
          <Centro top={250}>
            <Golpe s={21.76} style={{ fontSize: 76, fontWeight: 600, color: C.azul }}>por cada</Golpe>
            <Golpe s={22.24} style={{ fontSize: 124, color: C.tinta }}>DIAGNÓSTICO</Golpe>
          </Centro>
          <Centro top={620}>
            <div style={{ transform: `scale(${diag}) rotate(${(1 - diag) * -20}deg)`, background: "#fff", borderRadius: 40, padding: 40, boxShadow: "0 20px 60px rgba(10,26,47,0.15)" }}>
              <IconoLinea tipo="diagnostico" color={C.azul} size={300} />
            </div>
          </Centro>
        </>
      ) : (
        <>
          <Centro top={230}>
            <Golpe s={23.2} style={{ fontSize: 70, fontWeight: 600, color: C.azul }}>por cada paciente que</Golpe>
            <Golpe s={24.4} style={{ fontSize: 124, color: C.naranja }}>VUELVE A CASA</Golpe>
          </Centro>
          <svg width="1080" height="700" viewBox="0 0 1080 700" style={{ position: "absolute", top: 560 }}>
            <path d="M620 300 L800 160 L980 300 V560 H620 Z" fill="#fff" stroke={C.tinta} strokeWidth="10" strokeLinejoin="round" />
            <rect x="760" y="400" width="80" height="160" rx="8" fill={`rgba(242,181,68,${0.2 + luz * 0.8})`} stroke={C.tinta} strokeWidth="8" />
            <rect x="660" y="340" width="70" height="60" rx="6" fill={`rgba(242,181,68,${0.2 + luz * 0.8})`} stroke={C.tinta} strokeWidth="8" />
            <circle cx={790 - (1 - luz) * 0} cy="480" r={luz * 140} fill={ORO} opacity={0.18} />
            <line x1="40" y1="562" x2="1040" y2="562" stroke={C.tinta} strokeWidth="8" strokeLinecap="round" />
            <g transform={`translate(${120 + camina * 560}, ${470 + Math.abs(Math.sin(camina * 20)) * -10})`}>
              <circle cx="0" cy="-40" r="22" fill={C.azul} />
              <path d="M0 -16 V40 M0 40 l-18 50 M0 40 l18 50 M0 0 l-24 30 M0 0 l24 30" stroke={C.azul} strokeWidth="12" strokeLinecap="round" fill="none" />
            </g>
          </svg>
        </>
      )}
    </Escena>
  );
};

const Sangre: React.FC = () => {
  const frame = useCurrentFrame();
  const flecha = lerp(frame, f(27.76), f(28.6), 0, 1);
  const late = 1 + Math.max(0, Math.sin(frame / 6)) * 0.1;
  const corazon = usePop(28.4, 9);
  return (
    <Escena desde={E.sangre} hasta={E.honor}>
      <FondoCalido tono="#F7E9D7" />
      <div style={{ position: "absolute", top: 260, left: 70, width: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <Golpe s={25.52} style={{ fontSize: 64, color: C.azul }}>NOSOTROS</Golpe>
        <svg width="160" height="440" viewBox="0 0 160 440" style={{ transform: `scale(${usePop(25.6)})` }}>
          <rect x="30" y="60" width="100" height="360" rx="50" fill="#fff" stroke={C.tinta} strokeWidth="9" />
          <clipPath id="tb"><rect x="30" y="60" width="100" height="360" rx="50" /></clipPath>
          <rect x="30" y={lerp(frame, f(25.7), f(26.9), 420, 180)} width="100" height="300" fill="#C8102E" clipPath="url(#tb)" />
          <rect x="18" y="20" width="124" height="60" rx="14" fill={C.lila} />
        </svg>
        <Golpe s={26.56} style={{ fontSize: 46, fontWeight: 600, color: C.tinta, textAlign: "center" }}>leemos lo que dice la sangre</Golpe>
      </div>
      <svg width="260" height="120" viewBox="0 0 260 120" style={{ position: "absolute", top: 560, left: 420 }}>
        <path d="M10 60 H220 M180 20 L230 60 L180 100" fill="none" stroke={C.naranja} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="420" strokeDashoffset={420 * (1 - flecha)} />
      </svg>
      <div style={{ position: "absolute", top: 260, right: 60, width: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <Golpe s={27.76} style={{ fontSize: 64, color: C.naranja }}>USTEDES</Golpe>
        <div style={{ height: 440, display: "flex", alignItems: "center" }}>
          {frame >= f(28.4) && <Corazon size={330} latido={corazon * late} />}
        </div>
        <Golpe s={28.4} style={{ fontSize: 46, fontWeight: 600, color: C.tinta, textAlign: "center" }}>lo convierten en</Golpe>
      </div>
      <Centro top={1030}>
        <div style={{ display: "flex", gap: 30, alignItems: "baseline" }}>
          <Golpe s={29.84} style={{ fontSize: 110, color: C.azul }}>CUIDADO</Golpe>
          <Golpe s={30.6} style={{ fontSize: 70, color: C.tinta }}>y</Golpe>
          <Golpe s={30.88} desde={2.6} style={{ fontSize: 130, color: "#E8344A" }}>VIDA</Golpe>
        </div>
      </Centro>
    </Escena>
  );
};

const Honor: React.FC = () => (
  <Escena desde={E.honor} hasta={E.final}>
    <FondoCalido />
    <Centro top={250}>
      <Golpe s={31.6} style={{ fontSize: 70, fontWeight: 600, color: C.azul }}>es un</Golpe>
      <Golpe s={31.84} desde={2.4} style={{ fontSize: 190, color: C.naranja, letterSpacing: -4 }}>HONOR</Golpe>
      <Golpe s={32.24} style={{ fontSize: 76, color: C.tinta }}>trabajar a su lado</Golpe>
    </Centro>
    <Mascota pose="dos_pulgares" desde={31.7} hasta={33.45} x={540} y={1330} alto={620} />
  </Escena>
);

const Final: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = usePop(36.0, 12);
  return (
    <Escena desde={E.final} hasta={E.fin}>
      <FondoCalido />
      <div style={{ position: "absolute", top: -60, left: lerp(frame, f(33.5), f(34), -1400, 0), width: 1500, height: 120, background: C.naranja, transform: "rotate(-14deg)", transformOrigin: "0 0" }} />
      <div style={{ position: "absolute", top: 90, left: lerp(frame, f(33.6), f(34.1), -1400, 0), width: 1500, height: 60, background: C.azul, transform: "rotate(-14deg)", transformOrigin: "0 0" }} />
      <Centro top={300}>
        <Golpe s={33.62} desde={2.6} style={{ fontSize: 120, color: C.naranja, transform: "rotate(-3deg)" }}>¡FELIZ</Golpe>
        <Golpe s={33.84} desde={2.6} style={{ fontSize: 150, color: C.tinta, transform: "rotate(-3deg)", letterSpacing: -4 }}>DÍA DEL</Golpe>
        <Golpe s={34.24} desde={2.6} style={{ fontSize: 170, color: C.azul, transform: "rotate(-3deg)", letterSpacing: -4 }}>MÉDICO!</Golpe>
        <div style={{ height: 40 }} />
        <Golpe s={35.1} style={{ fontSize: 50, fontWeight: 600, color: C.tinta }}>de parte de toda la comunidad:</Golpe>
        <Golpe s={37.04} style={{ fontSize: 76, color: C.naranja }}>gracias por cuidarnos</Golpe>
        <div style={{ height: 30 }} />
        <Img src={staticFile("logo_sin_lema.png")} style={{ width: 600, transform: `scale(${logo})`, opacity: Math.min(1, logo * 2) }} />
        {frame >= f(38.6) && <div style={{ marginTop: 14 }}><Ficha s={38.6} color={C.naranja} style={{ background: C.tinta }}>#DíaDelMédico</Ficha></div>}
      </Centro>
      <Mascota pose="saltando" desde={34.3} hasta={41.5} x={540} y={1880} alto={520} />
      <Confeti s={34.24} n={80} />
    </Escena>
  );
};

export const DiaMedico: React.FC = () => {
  const frame = useCurrentFrame();
  const bordes = [E.guardias, E.dia, E.gracias3, E.casa, E.sangre, E.honor, E.final];
  return (
    <AbsoluteFill style={{ background: C.tinta }}>
      <Noche />
      <Guardias />
      <Dia />
      <PorEscuchar />
      <Casa />
      <Sangre />
      <Honor />
      <Final />
      {frame < f(E.final) && <Subtitulos palabras={palabras} top={1430} acento={frame < f(E.dia) ? ORO : C.naranja} />}
      {bordes.map((b) => <Franjas key={b} s={b} />)}
      <Progreso total={DURACION_MEDICO} />

      <Audio src={staticFile("medico_voz.mp3")} />
      <Audio src={staticFile("medico_musica.mp3")} volume={(fr) => (fr < f(E.dia) ? 0.18 : fr > f(E.final) ? 0.4 : 0.26)} />
      {[0.35, 1.55, 2.75, 3.95].map((s) => (
        <Sequence key={"b" + s} from={f(s)} durationInFrames={30}><Audio src={staticFile("medico_beep.mp3")} volume={0.35} /></Sequence>
      ))}
      {bordes.map((b) => (
        <Sequence key={"w" + b} from={Math.max(0, f(b) - 8)} durationInFrames={30}><Audio src={staticFile("whoosh.mp3")} volume={0.25} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

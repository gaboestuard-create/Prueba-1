// TikTok de prueba: "Biometría hemática" con Supergabito. Todos los tiempos son segundos globales,
// tomados de la transcripción con tiempos por palabra de la voz (src/palabras.json).
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  C, Ficha, Fondo, Franjas, GloboBlanco, GloboRojo, Golpe, MONO, Mascota, Plaqueta, Progreso, Subtitulos, TITULO,
  f, lerp, usePop, useSacudida,
} from "./piezas";

export const DURACION = f(68.4);

// límites de escena (inicio de cada frase en la voz)
const E = { hook: 0, gabito: 6.05, muestra: 14.2, rojos: 19.15, blancos: 28.75, plaquetas: 37.98, dato: 42.07, cuando: 48.15, prep: 54.6, cta: 59.35, fin: 68.4 };

const Escena: React.FC<{ desde: number; hasta: number; children: React.ReactNode }> = ({ desde, hasta, children }) => {
  const frame = useCurrentFrame();
  if (frame < f(desde) || frame >= f(hasta)) return null;
  // micro zoom continuo: la escena nunca está quieta
  const z = interpolate(frame, [f(desde), f(hasta)], [1, 1.045]);
  return <AbsoluteFill style={{ transform: `scale(${z})` }}>{children}</AbsoluteFill>;
};

const Centro: React.FC<{ top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ top, children, style }) => (
  <div style={{ position: "absolute", top, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", ...style }}>
    {children}
  </div>
);

// ---------- 1. Gancho ----------
const Bateria: React.FC = () => {
  const frame = useCurrentFrame();
  const nivel = lerp(frame, f(0.9), f(2.9), 1, 0.06);
  const parpadeo = frame > f(2.9) && Math.floor(frame / 5) % 2 === 0 ? 0.25 : 1;
  const col = nivel > 0.5 ? "#3DDC84" : nivel > 0.2 ? C.naranjaViva : C.sangreViva;
  const p = usePop(0.9);
  return (
    <svg width="360" height="180" viewBox="0 0 360 180" style={{ transform: `scale(${p}) rotate(-6deg)` }}>
      <rect x="8" y="8" width="310" height="164" rx="34" fill="none" stroke={C.blanco} strokeWidth="14" />
      <rect x="326" y="60" width="26" height="60" rx="10" fill={C.blanco} />
      <rect x="30" y="30" width={266 * nivel} height="120" rx="18" fill={col} opacity={parpadeo} />
      <text x="163" y="112" textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize="56" fill={C.blanco}>{Math.round(nivel * 100)}%</text>
    </svg>
  );
};

const Gota: React.FC = () => {
  const frame = useCurrentFrame();
  const cae = lerp(frame, f(3.15), f(3.5), -300, 760);
  const impacto = f(3.5);
  const r = frame < impacto ? 0 : interpolate(frame, [impacto, impacto + 14], [0, 1500], { extrapolateRight: "clamp" });
  return (
    <>
      {frame < impacto && (
        <svg width="160" height="220" viewBox="0 0 160 220" style={{ position: "absolute", left: 460, top: cae }}>
          <path d="M80 0 C 80 0 0 110 0 145 A 80 75 0 0 0 160 145 C 160 110 80 0 80 0 Z" fill={C.sangreViva} />
          <ellipse cx="52" cy="140" rx="16" ry="26" fill="#fff" opacity="0.35" />
        </svg>
      )}
      {frame >= impacto && (
        <div style={{ position: "absolute", left: 540 - r, top: 860 - r, width: r * 2, height: r * 2, borderRadius: "50%", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: r - 540, top: r - 860, width: 1080, height: 1920 }}>
            <Fondo tono="sangre" />
          </div>
        </div>
      )}
    </>
  );
};

const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const sac = useSacudida([0.84, 3.5], 22);
  const globo = usePop(4.0);
  return (
    <Escena desde={E.hook} hasta={E.gabito}>
      <Fondo />
      <AbsoluteFill style={{ transform: sac }}>
        {frame < f(3.5) && (
          <Centro top={330}>
            <Golpe s={0.16} style={{ fontSize: 120 }}>¿SIEMPRE</Golpe>
            <Golpe s={0.84} style={{ fontSize: 170, color: C.naranjaViva }}>CANSADO?</Golpe>
            <div style={{ height: 50 }} />
            <Bateria />
            <div style={{ height: 40 }} />
            <Golpe s={1.64} style={{ fontSize: 64, fontWeight: 600, color: C.crema }}>…aunque duermas bien</Golpe>
          </Centro>
        )}
        <Gota />
        {frame >= f(3.5) && (
          <Centro top={420}>
            <Golpe s={3.55} style={{ fontSize: 160 }}>TU SANGRE</Golpe>
            <Golpe s={4.3} style={{ fontSize: 78, fontWeight: 600, color: "#FFD9DE" }}>te está avisando algo</Golpe>
            <div style={{ height: 60 }} />
            <GloboRojo size={360} giro={Math.sin(frame / 15) * 40} style={{ transform: `scale(${globo})` }} />
          </Centro>
        )}
      </AbsoluteFill>
    </Escena>
  );
};

// ---------- 2. Presentación de Supergabito ----------
const Reflectores: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen" }}>
      {[-1, 1].map((lado) => (
        <div key={lado} style={{ position: "absolute", top: -200, left: 540 + lado * 420 - 300, width: 600, height: 2200,
          background: "linear-gradient(180deg, rgba(255,240,200,0.35), rgba(255,240,200,0) 75%)",
          clipPath: "polygon(45% 0, 55% 0, 100% 100%, 0 100%)", transformOrigin: "50% 0",
          transform: `rotate(${lado * (14 + Math.sin(frame / 20 + lado) * 8)}deg)` }} />
      ))}
    </AbsoluteFill>
  );
};

const Cuerdas: React.FC<{ y?: number }> = ({ y = 1160 }) => (
  <svg width="1080" height="500" style={{ position: "absolute", top: y, left: 0 }}>
    {[C.sangreViva, C.blanco, C.azulViva].map((col, i) => (
      <path key={i} d={`M -40 ${60 + i * 90} Q 540 ${110 + i * 90} 1120 ${60 + i * 90}`} stroke={col} strokeWidth="18" fill="none" strokeLinecap="round" opacity="0.9" />
    ))}
    <rect x="-10" y="20" width="44" height="320" rx="10" fill="#C9CED6" />
    <rect x="1046" y="20" width="44" height="320" rx="10" fill="#C9CED6" />
  </svg>
);

const Gabito: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [f(6.1), f(6.1) + 8], [0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sac = useSacudida([6.1, 12.64], 20);
  const placa = usePop(6.45, 14);
  const lado = lerp(frame, f(11.4), f(12.2), 0, 1);
  return (
    <Escena desde={E.gabito} hasta={E.muestra}>
      <Fondo tono="ring" />
      <Reflectores />
      <Cuerdas y={1240} />
      <AbsoluteFill style={{ transform: sac }}>
        <Mascota pose="saltando" desde={6.1} hasta={9.9} x={540} y={1330} alto={980} />
        <Mascota pose="guino_pulgar" desde={9.95} hasta={14.2} x={540 + lado * 250} y={1330 + lado * 160} alto={900 - lado * 320} />
        {frame >= f(6.45) && frame < f(11.4) && (
          <div style={{ position: "absolute", top: 220, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center",
            transform: `translateX(${(1 - placa) * -900}px) rotate(-4deg)` }}>
            <div style={{ background: C.naranja, padding: "10px 36px", fontFamily: MONO, fontWeight: 700, fontSize: 34, color: C.blanco, letterSpacing: 6 }}>
              EL LUCHADOR DE TU SALUD
            </div>
            <div style={{ fontFamily: TITULO, fontWeight: 800, fontSize: 138, color: C.blanco, letterSpacing: -3, lineHeight: 1,
              WebkitTextStroke: "6px " + C.azul, paintOrder: "stroke fill", textShadow: `10px 10px 0 ${C.azul}` }}>
              SUPERGABITO
            </div>
          </div>
        )}
        {frame >= f(10.3) && (
          <div style={{ position: "absolute", top: 250, left: 70, right: 70 }}>
            <Golpe s={10.3} style={{ fontSize: 70, fontWeight: 600, color: C.crema }}>el estudio que</Golpe>
            <Golpe s={11.5} style={{ fontSize: 110 }}>LO CUENTA TODO</Golpe>
            <div style={{ height: 50 }} />
            <Golpe s={12.64} desde={3} style={{ fontSize: 132, color: C.naranjaViva, transform: "rotate(-3deg)" }}>BIOMETRÍA</Golpe>
            <Golpe s={13.28} desde={3} style={{ fontSize: 132, color: C.azulViva, transform: "rotate(-3deg)" }}>HEMÁTICA</Golpe>
          </div>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: C.blanco, opacity: flash }} />
    </Escena>
  );
};

// ---------- 3. Una muestra, tres equipos ----------
const Tubo: React.FC = () => {
  const frame = useCurrentFrame();
  const nivel = lerp(frame, f(14.4), f(15.9), 0, 1);
  const p = usePop(14.25);
  return (
    <svg width="260" height="720" viewBox="0 0 260 720" style={{ transform: `scale(${p}) rotate(${8 - p * 8}deg)` }}>
      <defs>
        <clipPath id="tubo"><rect x="50" y="90" width="160" height="600" rx="80" /></clipPath>
        <linearGradient id="liq" x1="0" x2="1"><stop offset="0" stopColor="#8E0A1F" /><stop offset="0.5" stopColor={C.sangreViva} /><stop offset="1" stopColor="#8E0A1F" /></linearGradient>
      </defs>
      <g clipPath="url(#tubo)">
        <rect x="50" y={690 - nivel * 520} width="160" height="600" fill="url(#liq)" />
        <path d={`M50 ${690 - nivel * 520} q 40 ${-14 + Math.sin(frame / 4) * 8} 80 0 t 80 0`} fill="#FF6B6B" opacity="0.7" />
      </g>
      <rect x="50" y="90" width="160" height="600" rx="80" fill="none" stroke="#E9EEF5" strokeWidth="12" />
      <rect x="34" y="20" width="192" height="100" rx="20" fill={C.lila} />
      <rect x="70" y="250" width="22" height="300" rx="11" fill="#fff" opacity="0.3" />
      <text x="130" y="82" textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize="36" fill="#fff">BH</text>
    </svg>
  );
};

const Muestra: React.FC = () => {
  const frame = useCurrentFrame();
  const equipos = [
    { s: 16.52, el: <GloboRojo size={150} giro={Math.sin(frame / 12) * 40} />, nombre: "ROJOS", col: C.sangreViva },
    { s: 16.66, el: <GloboBlanco size={150} t={frame / 30} />, nombre: "BLANCOS", col: C.lila },
    { s: 16.8, el: <Plaqueta size={130} seed="eq" />, nombre: "PLAQUETAS", col: "#B48ACF" },
  ];
  return (
    <Escena desde={E.muestra} hasta={E.rojos}>
      <Fondo />
      <div style={{ position: "absolute", left: 70, top: 300 }}><Tubo /></div>
      <div style={{ position: "absolute", left: 380, top: 330, right: 60 }}>
        <Golpe s={14.4} style={{ fontSize: 76, fontWeight: 600, color: C.crema }}>una sola</Golpe>
        <Golpe s={14.8} style={{ fontSize: 120 }}>MUESTRA</Golpe>
        <div style={{ height: 70 }} />
        <Golpe s={16.52} desde={2.6} style={{ fontSize: 230, color: C.naranjaViva, lineHeight: 0.8 }}>3</Golpe>
        <Golpe s={16.8} style={{ fontSize: 86 }}>EQUIPOS</Golpe>
        <div style={{ height: 30 }} />
        <Ficha s={17.6}>TRABAJAN 24/7</Ficha>
      </div>
      <div style={{ position: "absolute", top: 1080, left: 60, right: 60, display: "flex", justifyContent: "space-around" }}>
        {equipos.map((e, i) => {
          const p = usePop(e.s, 9);
          return frame >= f(e.s) ? (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transform: `scale(${p}) translateY(${Math.sin(frame / 8 + i) * 8}px)` }}>
              {e.el}
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: e.col, letterSpacing: 3 }}>{e.nombre}</div>
            </div>
          ) : <div key={i} style={{ width: 150 }} />;
        })}
      </div>
    </Escena>
  );
};

// ---------- 4 y 5. El ring: rojos y blancos ----------
const Banner: React.FC<{ s: number; texto: string; desdeIzq: boolean }> = ({ s, texto, desdeIzq }) => {
  const p = usePop(s, 13);
  return (
    <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center",
      transform: `translateX(${(1 - p) * (desdeIzq ? -1200 : 1200)}px) rotate(-3deg)` }}>
      <div style={{ background: C.crema, color: C.tinta, fontFamily: TITULO, fontWeight: 800, fontSize: 84, padding: "12px 40px",
        boxShadow: `12px 12px 0 ${C.naranja}`, letterSpacing: -1 }}>{texto}</div>
    </div>
  );
};

const Sintoma: React.FC<{ s: number; texto: string; i: number }> = ({ s, texto, i }) => (
  <div style={{ marginTop: 18, transform: `rotate(${[-3, 2, -1][i]}deg)` }}>
    <Ficha s={s} color={C.sangreViva} style={{ fontSize: 46 }}>
      <span style={{ width: 18, height: 18, borderRadius: 9, background: C.sangreViva, display: "inline-block" }} />{texto}
    </Ficha>
  </div>
);

const Rojos: React.FC = () => {
  const frame = useCurrentFrame();
  const sac = useSacudida([19.2, 25.84], 22);
  const entra = usePop(20.72, 10);
  const baja = lerp(frame, f(24.7), f(25.8), 0, 1);
  return (
    <Escena desde={E.rojos} hasta={E.blancos}>
      <Fondo tono="ring" />
      <Reflectores />
      <Cuerdas y={1300} />
      <AbsoluteFill style={{ transform: sac }}>
        <Banner s={19.2} texto="EN ESTA ESQUINA" desdeIzq />
        <div style={{ position: "absolute", top: 400, left: 60, transform: `translateX(${(1 - entra) * -800}px)` }}>
          <GloboRojo size={420 - baja * 120} giro={Math.sin(frame / 18) * 38} style={{ filter: `saturate(${1 - baja * 0.6}) brightness(${1 - baja * 0.25})` }} />
        </div>
        <div style={{ position: "absolute", top: 420, left: 520, right: 60 }}>
          <Golpe s={20.72} style={{ fontSize: 96, color: C.sangreViva }}>GLÓBULOS</Golpe>
          <Golpe s={21.32} style={{ fontSize: 132 }}>ROJOS</Golpe>
          <div style={{ height: 24 }} />
          <Ficha s={22.4} color={C.azulViva}>LLEVAN O₂</Ficha>
        </div>
        {/* burbujas de oxígeno viajando */}
        {frame >= f(22.4) && frame < f(24.7) && Array.from({ length: 10 }, (_, i) => {
          const t = ((frame - f(22.4)) / 40 + i / 10) % 1;
          return <div key={i} style={{ position: "absolute", left: 80 + t * 900, top: 950 + Math.sin(t * 9 + i) * 60, width: 54, height: 54, borderRadius: 27,
            border: `5px solid ${C.azulViva}`, color: C.azulViva, fontFamily: MONO, fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: Math.sin(t * Math.PI) }}>O₂</div>;
        })}
        {frame >= f(24.7) && (
          <div style={{ position: "absolute", top: 860, left: 70 }}>
            <Golpe s={24.7} style={{ fontSize: 60, fontWeight: 600, color: C.crema }}>si están bajos ↓</Golpe>
            <Golpe s={25.84} desde={3.2} style={{ fontSize: 150, color: C.sangreViva, transform: "rotate(-4deg)", WebkitTextStroke: "4px #fff", paintOrder: "stroke fill" }}>ANEMIA</Golpe>
          </div>
        )}
        <div style={{ position: "absolute", top: 1085, left: 60, width: 760, display: "flex", flexWrap: "wrap", columnGap: 18 }}>
          <Sintoma s={26.48} texto="CANSANCIO" i={0} />
          <Sintoma s={27.2} texto="MAREOS" i={1} />
          <Sintoma s={27.92} texto="PIEL PÁLIDA" i={2} />
        </div>
      </AbsoluteFill>
      <Mascota pose="senalando_lado" desde={23.0} hasta={28.6} x={900} y={1330} alto={470} />
    </Escena>
  );
};

const Medidor: React.FC = () => {
  const frame = useCurrentFrame();
  const p = usePop(33.2, 12);
  const ang = frame < f(33.2) ? 0 : Math.sin((frame - f(33.2)) / 7) * 70;
  return (
    <svg width="420" height="260" viewBox="0 0 420 260" style={{ transform: `scale(${p})` }}>
      <path d="M30 230 A 180 180 0 0 1 390 230" fill="none" stroke="#2A4466" strokeWidth="34" strokeLinecap="round" />
      <path d="M30 230 A 180 180 0 0 1 120 74" fill="none" stroke={C.azulViva} strokeWidth="34" strokeLinecap="round" />
      <path d="M300 74 A 180 180 0 0 1 390 230" fill="none" stroke={C.sangreViva} strokeWidth="34" strokeLinecap="round" />
      <path d="M150 58 A 180 180 0 0 1 270 58" fill="none" stroke="#3DDC84" strokeWidth="34" />
      <g transform={`rotate(${ang} 210 230)`}><rect x="203" y="70" width="14" height="165" rx="7" fill={C.crema} /></g>
      <circle cx="210" cy="230" r="22" fill={C.crema} />
      <text x="40" y="258" fontFamily={MONO} fontWeight={700} fontSize="26" fill={C.azulViva}>BAJO</text>
      <text x="320" y="258" fontFamily={MONO} fontWeight={700} fontSize="26" fill={C.sangreViva}>ALTO</text>
    </svg>
  );
};

const Blancos: React.FC = () => {
  const frame = useCurrentFrame();
  const sac = useSacudida([28.8], 22);
  const entra = usePop(30.48, 10);
  const escudo = usePop(32.36, 10);
  return (
    <Escena desde={E.blancos} hasta={E.plaquetas}>
      <Fondo tono="ring" />
      <Reflectores />
      <Cuerdas y={1300} />
      <AbsoluteFill style={{ transform: sac }}>
        <Banner s={28.8} texto="EN LA OTRA ESQUINA" desdeIzq={false} />
        <div style={{ position: "absolute", top: 380, right: 50, transform: `translateX(${(1 - entra) * 800}px)` }}>
          <svg width="460" height="500" viewBox="0 0 460 500" style={{ position: "absolute", left: -10, top: -30, opacity: escudo, transform: `scale(${0.7 + escudo * 0.3})` }}>
            <path d="M230 20 L420 90 V250 C420 370 330 450 230 480 C130 450 40 370 40 250 V90 Z" fill="none" stroke={C.azulViva} strokeWidth="14"
              strokeDasharray="1600" strokeDashoffset={1600 * (1 - escudo)} style={{ filter: `drop-shadow(0 0 24px ${C.azulViva})` }} />
          </svg>
          <div style={{ position: "relative", left: 25, top: 20 }}><GloboBlanco size={400} t={frame / 30} /></div>
        </div>
        <div style={{ position: "absolute", top: 420, left: 70, width: 520 }}>
          <Golpe s={30.48} style={{ fontSize: 96, color: "#CDB8F0" }}>GLÓBULOS</Golpe>
          <Golpe s={30.96} style={{ fontSize: 124 }}>BLANCOS</Golpe>
          <div style={{ height: 24 }} />
          <Ficha s={32.36} color={C.azulViva}>TUS DEFENSAS</Ficha>
        </div>
        {frame >= f(33.2) && (
          <div style={{ position: "absolute", top: 900, left: 70, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 26 }}>
            <Medidor />
            <div style={{ display: "flex", gap: 18 }}>
              <Ficha s={35.6} color={C.sangreViva}>INFECCIÓN</Ficha>
              <Ficha s={36.64} color={C.naranjaViva}>ALGO QUE REVISAR</Ficha>
            </div>
          </div>
        )}
      </AbsoluteFill>
      <Mascota pose="senalando_frente" desde={33.0} hasta={37.9} x={900} y={1180} alto={380} />
    </Escena>
  );
};

// ---------- 6. Plaquetas ----------
const Plaquetas: React.FC = () => {
  const frame = useCurrentFrame();
  const sello = lerp(frame, f(39.4), f(41.0), 0, 1);
  return (
    <Escena desde={E.plaquetas} hasta={E.dato}>
      <Fondo />
      <Centro top={250}>
        <Golpe s={38.32} style={{ fontSize: 76, fontWeight: 600, color: C.crema }}>y las</Golpe>
        <Golpe s={38.6} style={{ fontSize: 150, color: "#CDB8F0" }}>PLAQUETAS</Golpe>
      </Centro>
      {/* herida: piel cortada que se sella */}
      <div style={{ position: "absolute", top: 720, left: 90, width: 900, height: 300, borderRadius: 40, background: "linear-gradient(180deg,#F2C6A0,#E0A57A)",
        boxShadow: "inset 0 -20px 40px rgba(0,0,0,0.15)" }}>
        <div style={{ position: "absolute", top: 135, left: 120, width: 660, height: 30 * (1 - sello) + 4, borderRadius: 20, background: C.sangre,
          boxShadow: `0 0 ${30 * (1 - sello)}px ${C.sangreViva}` }} />
        {Array.from({ length: 16 }, (_, i) => {
          const s = 39.4 + i * 0.07;
          const t = lerp(frame, f(s) - 12, f(s), 0, 1);
          const ox = 140 + i * 40, oy = 130;
          const sx = i % 2 ? 1100 : -300, sy = -400 + (i % 3) * 300;
          return t > 0 ? (
            <div key={i} style={{ position: "absolute", left: sx + (ox - sx) * t, top: sy + (oy - sy) * t, transform: `rotate(${i * 40 + (1 - t) * 300}deg)` }}>
              <Plaqueta size={56} seed={"p" + i} />
            </div>
          ) : null;
        })}
      </div>
      <Centro top={1060}>
        {frame >= f(41.0) && <Ficha s={41.0} color="#3DDC84" style={{ fontSize: 52 }}>✓ SANGRADO DETENIDO</Ficha>}
      </Centro>
      <Mascota pose="dos_pulgares" desde={40.2} hasta={42.0} x={955} y={1330} alto={280} />
    </Escena>
  );
};

// ---------- 7. ¿Sabías que...? ----------
const Dato: React.FC = () => {
  const frame = useCurrentFrame();
  const n = Math.round(lerp(frame, f(44.2), f(44.9), 0, 120));
  const sticker = usePop(42.19, 9);
  return (
    <Escena desde={E.dato} hasta={E.cuando}>
      <Fondo tono="sangre" />
      <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ background: "#FFD23F", color: C.tinta, fontFamily: TITULO, fontWeight: 800, fontSize: 92, padding: "16px 44px", borderRadius: 24,
          transform: `scale(${sticker}) rotate(${-6 + (1 - sticker) * 30}deg)`, boxShadow: "0 18px 0 rgba(0,0,0,0.25)" }}>¿SABÍAS QUE…?</div>
      </div>
      <Centro top={420}>
        <Golpe s={42.96} style={{ fontSize: 70, fontWeight: 600, color: "#FFD9DE" }}>cada glóbulo rojo vive</Golpe>
        {frame >= f(44.2) && (
          <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 20 }}>
            <div style={{ position: "relative", width: 260, height: 260 }}>
              <svg width="260" height="260" viewBox="0 0 300 300" style={{ position: "absolute", transform: `rotate(${frame * 4}deg)` }}>
                <circle cx="150" cy="150" r="130" fill="none" stroke="#FFD9DE" strokeWidth="10" strokeDasharray="60 24" />
                <path d="M150 12 l22 -10 l-6 24 z" fill="#FFD9DE" />
              </svg>
              <GloboRojo size={170} giro={Math.sin(frame / 14) * 40} style={{ position: "absolute", left: 45, top: 45 }} />
            </div>
            <div style={{ fontFamily: TITULO, fontWeight: 800, color: C.blanco, lineHeight: 0.85, textAlign: "left" }}>
              <div style={{ fontSize: 200, fontVariantNumeric: "tabular-nums" }}>{n}</div>
              <div style={{ fontSize: 96, color: "#FFD23F" }}>DÍAS</div>
            </div>
          </div>
        )}
        <div style={{ height: 30 }} />
        <Golpe s={45.71} style={{ fontSize: 64, fontWeight: 600 }}>tu sangre se renueva</Golpe>
        <Golpe s={47.1} style={{ fontSize: 96, color: "#FFD23F" }}>TODO EL TIEMPO</Golpe>
      </Centro>
      <Mascota pose="sorprendido" desde={42.2} hasta={48.1} x={180} y={1330} alto={360} />
    </Escena>
  );
};

// ---------- 8. ¿Cuándo se pide? ----------
const Icono: React.FC<{ tipo: string }> = ({ tipo }) => {
  const k = { stroke: C.tinta, strokeWidth: 9, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width="96" height="96" viewBox="0 0 100 100">
      {tipo === "chequeo" && <><rect x="22" y="14" width="56" height="76" rx="8" {...k} /><path d="M36 50 l10 10 l20 -22" {...k} /></>}
      {tipo === "cirugia" && <><path d="M18 82 L62 38" {...k} /><path d="M62 38 l18 -18 a8 8 0 0 1 0 12 l-12 12 z" {...k} /><path d="M70 66 h18 M79 57 v18" {...k} /></>}
      {tipo === "embarazo" && <path d="M50 84 C 10 58 14 22 36 20 C 46 19 50 28 50 32 C 50 28 54 19 64 20 C 86 22 90 58 50 84 Z" {...k} />}
      {tipo === "fiebre" && <><path d="M42 18 a8 8 0 0 1 16 0 v40 a16 16 0 1 1 -16 0 z" {...k} /><path d="M50 40 v26" {...k} /></>}
    </svg>
  );
};

const Cuando: React.FC = () => {
  const items = [
    { s: 48.65, txt: "Chequeo de rutina", tipo: "chequeo", col: "#FFD23F" },
    { s: 49.85, txt: "Antes de una cirugía", tipo: "cirugia", col: C.azulViva },
    { s: 51.29, txt: "En el embarazo", tipo: "embarazo", col: "#FF9EC1" },
    { s: 52.4, txt: "Fiebre o moretones", tipo: "fiebre", col: C.naranjaViva },
  ];
  const frame = useCurrentFrame();
  return (
    <Escena desde={E.cuando} hasta={E.prep}>
      <Fondo />
      <Centro top={220}>
        <Golpe s={48.17} style={{ fontSize: 110 }}>¿CUÁNDO</Golpe>
        <Golpe s={48.4} style={{ fontSize: 110, color: C.naranjaViva }}>SE PIDE?</Golpe>
      </Centro>
      <div style={{ position: "absolute", top: 520, left: 70, right: 70, display: "flex", flexDirection: "column", gap: 26 }}>
        {items.map((it, i) => {
          const p = usePop(it.s, 12);
          return frame >= f(it.s) ? (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, background: it.col, borderRadius: 28, padding: "18px 30px",
              transform: `translateX(${(1 - p) * (i % 2 ? 900 : -900)}px) rotate(${[-1.5, 1.2, -0.8, 1.5][i]}deg)`, boxShadow: "0 14px 0 rgba(0,0,0,0.3)" }}>
              <Icono tipo={it.tipo} />
              <div style={{ fontFamily: TITULO, fontWeight: 800, fontSize: 60, color: C.tinta, letterSpacing: -1 }}>{it.txt}</div>
            </div>
          ) : <div key={i} style={{ height: 132 }} />;
        })}
      </div>
      <Mascota pose="pensativo" desde={48.3} hasta={54.5} x={540} y={1395} alto={230} />
    </Escena>
  );
};

// ---------- 9. Preparación ----------
const Prep: React.FC = () => {
  const items = [
    { s: 54.8, txt: "RÁPIDA" },
    { s: 55.42, txt: "CASI NO DUELE" },
    { s: 57.56, txt: "SIN AYUNO*" },
  ];
  const frame = useCurrentFrame();
  return (
    <Escena desde={E.prep} hasta={E.cta}>
      <Fondo />
      <Centro top={260}>
        <Golpe s={54.65} style={{ fontSize: 64, fontWeight: 600, color: C.crema }}>tranquilo, es</Golpe>
      </Centro>
      <div style={{ position: "absolute", top: 400, left: 90, right: 90, display: "flex", flexDirection: "column", gap: 40 }}>
        {items.map((it, i) => {
          const p = usePop(it.s, 10);
          return frame >= f(it.s) ? (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 34, transform: `scale(${p})`, transformOrigin: "0 50%" }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="#3DDC84" />
                <path d="M34 62 l18 18 l36 -40" stroke={C.tinta} strokeWidth="14" fill="none" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="100" strokeDashoffset={100 * (1 - Math.min(1, p))} />
              </svg>
              <div style={{ fontFamily: TITULO, fontWeight: 800, fontSize: 96, color: C.blanco, letterSpacing: -2 }}>{it.txt}</div>
            </div>
          ) : null;
        })}
      </div>
      {frame >= f(57.9) && (
        <div style={{ position: "absolute", top: 1010, left: 90, right: 330, fontFamily: MONO, fontSize: 28, color: C.crema, opacity: lerp(frame, f(57.9), f(58.3), 0, 0.85) }}>
          *La biometría sola. Si te piden otros estudios, sigue las indicaciones del laboratorio.
        </div>
      )}
      <Mascota pose="guino_pulgar" desde={55.0} hasta={59.3} x={860} y={1330} alto={300} />
    </Escena>
  );
};

// ---------- 10. Cierre con marca ----------
const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = usePop(60.85, 12);
  const franja = (d: number) => lerp(frame, f(59.4 + d), f(59.9 + d), -1400, 0);
  const boton = usePop(65.2, 9);
  const pulso = 1 + Math.max(0, Math.sin((frame - f(65.6)) / 5)) * 0.06 * (frame > f(65.6) ? 1 : 0);
  return (
    <Escena desde={E.cta} hasta={E.fin}>
      <AbsoluteFill style={{ background: C.crema }} />
      {/* franjas diagonales del arte del logo */}
      <div style={{ position: "absolute", top: -60, left: franja(0), width: 1500, height: 120, background: C.naranja, transform: "rotate(-14deg)", transformOrigin: "0 0" }} />
      <div style={{ position: "absolute", top: 90, left: franja(0.1), width: 1500, height: 60, background: C.azul, transform: "rotate(-14deg)", transformOrigin: "0 0" }} />
      <div style={{ position: "absolute", bottom: 60, right: franja(0.05), width: 1500, height: 120, background: C.naranja, transform: "rotate(-14deg)", transformOrigin: "100% 100%" }} />
      <div style={{ position: "absolute", bottom: 210, right: franja(0.15), width: 1500, height: 60, background: C.azul, transform: "rotate(-14deg)", transformOrigin: "100% 100%" }} />
      <Centro top={330}>
        <Golpe s={59.43} style={{ fontSize: 70, color: C.tinta, fontWeight: 600 }}>hazte tu biometría en</Golpe>
        <div style={{ height: 30 }} />
        <Img src={staticFile("logo_sin_lema.png")} style={{ width: 900, transform: `scale(${logo})`, opacity: Math.min(1, logo * 2) }} />
        <div style={{ height: 30 }} />
        <div style={{ display: "flex", gap: 22, fontFamily: TITULO, fontWeight: 800, fontSize: 62, letterSpacing: -1 }}>
          {[{ s: 62.75, t: "Calidez", c: C.naranja }, { s: 63.45, t: "exactitud", c: C.azul }, { s: 64.33, t: "economía", c: C.tinta }].map((w, i) => {
            const p = usePop(w.s, 11);
            return <span key={i} style={{ color: w.c, transform: `translateY(${(1 - p) * 40}px)`, opacity: Math.min(1, p * 2), display: "inline-block" }}>{w.t}{i < 2 ? " ·" : ""}</span>;
          })}
        </div>
      </Centro>
      {frame >= f(65.2) && (
        <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ background: C.naranja, color: C.blanco, fontFamily: TITULO, fontWeight: 800, fontSize: 64, padding: "20px 60px", borderRadius: 999,
            transform: `scale(${boton * pulso})`, boxShadow: `0 16px 0 ${C.azul}` }}>＋ SÍGUEME</div>
        </div>
      )}
      <Mascota pose="saltando" desde={60.0} hasta={68.4} x={540} y={1790} alto={560} />
      <div style={{ position: "absolute", top: 1170, left: 60, right: 60, textAlign: "center", fontFamily: MONO, fontSize: 24, color: "#5A6472" }}>
        Información general. Tu médico interpreta tus resultados.
      </div>
    </Escena>
  );
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  const bordes = [E.gabito, E.muestra, E.rojos, E.blancos, E.plaquetas, E.dato, E.cuando, E.prep, E.cta];
  const enCierre = frame >= f(E.cta);
  return (
    <AbsoluteFill style={{ background: C.tinta }}>
      <Gancho />
      <Gabito />
      <Muestra />
      <Rojos />
      <Blancos />
      <Plaquetas />
      <Dato />
      <Cuando />
      <Prep />
      <Cierre />
      {!enCierre && <Subtitulos />}
      {bordes.map((b) => <Franjas key={b} s={b} />)}
      <Progreso total={DURACION} />

      <Audio src={staticFile("voz.mp3")} />
      <Audio src={staticFile("beat.mp3")} volume={0.09} />
      {bordes.map((b) => (
        <Sequence key={"w" + b} from={Math.max(0, f(b) - 8)} durationInFrames={30}><Audio src={staticFile("whoosh.mp3")} volume={0.35} /></Sequence>
      ))}
      {[6.1, 19.2, 28.8].map((s) => (
        <Sequence key={"c" + s} from={f(s) - 2} durationInFrames={60}><Audio src={staticFile("campana.mp3")} volume={0.45} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

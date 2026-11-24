# WORLD LEADER · Guía de arquitectura

Para cambiar jugabilidad o ampliar fases sin romper el resto del juego.

## Cómo se construye

`node build.js` une todo `src/` en `world-leader.html` (jugable al abrirlo en el navegador), `dist/artifact.html` (para publicar en claude.ai) y `dist/core.js` (motor sin interfaz, para las pruebas).

| Orden | Capa | Archivos | Regla |
|---|---|---|---|
| 1 | Datos | `src/data.js` y luego `src/data-*.js` en **orden alfabético** | Solo datos. Un archivo que use `D.fx` (el lenguaje de efectos de eventos) debe ordenarse **después** de `data-events2.js`. |
| 2 | Motor | `src/engine/NN-*.js` en orden alfabético, dentro de **una sola función** | Todo el estado vive en `S` y es JSON puro. Los archivos que exportan algo en `WL.Game.q` deben ordenarse antes de `80-turn.js` (por eso existen `7a…7q`, que van detrás de `79-*` y antes de `80-turn`). |
| 3 | Globo | `src/globe.js` | Three.js. Su API pública es `WL.Globe` (`paint`, `focus`, `trip`, `setTheatre`, `fx`, `setQuality`…). |
| 4 | Interfaz | `src/ui/NN-*.js` en orden alfabético, dentro de **una sola función** | Solo lee el estado (`G.S`, `G.q`) y actúa con `act('nombre', args)`. Nunca modifica `S` directamente, salvo el editor. |

## Mapa por fase

- **Fase 1**: `10-core` (estado, `hook`, `safe`, guardado), `20-economy`, `30-politics`, `40-diplomacy`, `50-war`, `60-ai`, `70-events`, `80-turn`. Interfaz: `10-base`, `20-start`, `30-hud`, `40-panels`, `50-scenes`, `90-boot`.
- **Ampliación** previa a la Fase 2: `65-tech-spy`, `66-regions`.
- **Fase 2 y pulidos**: `67…77` en el motor; `45…59` en la interfaz.
- **Ampliaciones posteriores**: `78-conquest` (ocupación, resistencia), `79-initiative`, `79-race`, `79-world`.
- **Fase 3**: `7a-theatre` (frente y batallas), `7b-wareco` (economía y diplomacia de guerra), `7c-intel` (espionaje), `data-war.js`, `ui/5a-war.js`.
- **Regiones ocupadas**: `ui/5c-occview.js` (tarjeta de región ocupada o anexionada y lista de provincias por origen).
- **Reciprocidad**: `7e-reciprocity` (la IA revisa y levanta sanciones, represalias, pedir que levanten).
- **Motivos para la guerra**: `7f-casus` y `ui/5d-casus.js` (agravios, justificación, exigir disculpas).
- **Fase 4**: `7d-story` (sinergias, diario, frases, legado), `data-story.js` (rasgos, 40 eventos, frases), `ui/12-cfg.js` (ajustes), `ui/15-sound.js` (audio procedural), `ui/5b-feel.js` (experiencia), y en `globe.js` auroras, partículas y calidad.
- **Fase 5**: `7g-scenarios` (escenarios, modos, dificultad por partes, campañas, código de partida, reto semanal), `7h-victory` (métricas, puntuación, victorias, epílogo, eventos procedurales, mediación), `data-scenario.js`, `data-progress.js` y `ui/5e-modes.js`. Detalles y balance en `FASE5.md`.
- **Conversaciones**: `7j-talk` (diálogos entre líderes, ONU, prensa), `data-talk.js`, `ui/5h-talk.js`.
- **Regiones con vida**: `7k-regions` (malestar, independentismo, acciones regionales, desastres locales), `data-regions2.js`, `ui/5i-regions.js`.
- **Negociación en persona**: `7l-parley` (3 rondas según la personalidad del líder), `D.PARLEY` en `data-talk.js`, `ui/5j-parley.js`. Capitales regionales aproximadas en `data-regions3.js`.
- **Guía**: `ui/5k-guide.js` («Qué hacer ahora» en el panel de asesores y consejos de descubrimiento los primeros turnos, recordados en `wl_tips`).
- **Globo vivo e historia**: `ui/5l-living.js` (fichas de tropas, luces de ciudad, gráficas en Partida → Historia), `7m-history` (S.h5, un punto cada 2 turnos) y en `globe.js` `setUnits`, `setCities`.
- **Gabinete y sucesión**: `7n-cabinet` (4 ministros con competencia, lealtad y rasgo que suman a `mod()`; escándalos, conspiraciones; edad, salud y relevo por heredero), `data-cabinet.js`, `ui/5m-cabinet.js` (Política → Gabinete).
- **Rutas marítimas**: `7o-straits` (8 estrechos que se cierran por guerra, sanciones o piratería; precios, comercio y PIB), `data-straits.js`, `ui/5n-straits.js` (Economía → Rutas) y `setStraits` en el globo.
- **El despacho**: `7p-office` (discursos a la nación), `data-office.js`, `ui/5o-office.js` (informe matinal tras cada turno, llamadas entrantes para las propuestas de otros países, Política → Discurso y Encuestas).
- **Personajes, cumbres y crisis**: `7q-people` (4 personajes con actitud y memoria, cumbre anual de grandes economías, sala de crisis en 3 fases), `data-people.js`, `ui/5p-people.js` (Política → Personajes).
- **Aspecto**: `ui/5f-look.js` (modo de mapa «Regiones», nombres de estados al acercarte, cámara orbital o táctica, fondos) y en `globe.js` `setBg`, `setCam`, `setReg`, `setProvLabels`. La paleta de países está en `ATLAS` (`ui/30-hud.js`) y el estilo de botones al final de `styles.css`.

## Cómo extender sin romper

- **Ampliar en vez de reescribir.** Las funciones declaradas con `function` se pueden envolver desde un archivo posterior:
  ```js
  { const f0 = laFuncion; laFuncion = (...a) => { const r = f0(...a); /* lo nuevo */ return r; }; }
  ```
  Igual con `ACT.x`, `PANELS.x` y `H.x`. Las declaradas con `const` no se pueden envolver: hay que exportar otra cosa o editar el archivo original.
- **Fases del turno** (`hook`): `new`, `load`, `player`, `world`, `late`, `finance`. Cada hook corre dentro de `safe()`: si falla, se registra en `S.errs` y el turno continúa.
- **Partidas antiguas.** Todo campo nuevo del estado necesita su valor por defecto en `hook('load', …)`.
- **Comentarios.** No pongas `// comentario` en medio de una línea de código: anula el resto de la línea. Ya provocó dos errores de compilación.
- **Números de balance** (unidades, terreno, clima, doctrinas, leyes, eventos, descubrimientos, fábricas): están en `src/data*.js` y son editables.

## Pruebas

| Comando | Qué comprueba |
|---|---|
| `npm test` | Partidas con acciones al azar en 10 países; determinismo de guardar y cargar; una partida guardada antigua; todas las opciones de todos los eventos; recorridos completos de guerra, ocupación, carrera tecnológica, fábricas y legado; escenarios, campañas, victorias, código de partida, epílogo y logros. |
| `npm run soak` | 150 turnos en 3 países: errores internos, crecimiento del estado, turnos lentos y recarga idéntica. |
| `npm run balance` | Bots de estrategia única (equilibrada, dinero, comercio, pasiva, espionaje, tortuga, guerra). Ninguno debe dominar. Acepta países y bots: `node balance.js RU,CN guerra,tortuga`. |
| `npm run check` | Todo lo anterior salvo el balance. |

## Ajustes del jugador

Se guardan en el navegador (`wl_cfg`), no en la partida. El progreso de la Fase 5 (logros, récords, estadísticas, estilo) está en `wl_prog` y los escenarios propios en `wl_scen`. Ajustes: calidad (auto, baja, media o alta), reducir movimiento, volúmenes por canal, silencio, portada del periódico, cámara cinematográfica y modo observador. El autoguardado está en `wl_save`, con una copia del turno anterior en `wl_save_bak`; las ranuras manuales en `wl_slot1` a `wl_slot6`.

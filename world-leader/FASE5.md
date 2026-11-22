# WORLD LEADER · Fase 5: campañas, escenarios y rejugabilidad

Todo funciona sin servidor dentro de `world-leader.html`. El contenido nuevo vive en dos archivos de datos editables:

| Archivo | Qué contiene |
|---|---|
| `src/data-scenario.js` | 8 escenarios (2 desbloqueables), 8 campañas, 6 victorias alternativas, modos, reto semanal, componentes de dificultad, plantillas de eventos procedurales, reglas del mundo alternativo y naciones históricas. |
| `src/data-progress.js` | 76 logros (12 ocultos), desbloqueables, rasgos de leyenda, estilos de interfaz, marcos de retrato y la fórmula de puntuación. |

Código: `src/engine/7g-scenarios.js` (escenarios, modos, dificultad, campañas, código de partida, reto semanal), `src/engine/7h-victory.js` (métricas, puntuación, victorias, epílogo, eventos procedurales, mediación) y `src/ui/5e-modes.js` (toda la interfaz nueva).

## Cómo se juega

- **Inicio**: cinco modos (libre, campaña, reto semanal, rápido, sandbox), «Código de partida» y «Logros y récords».
- **Nueva partida**: se añade el paso 4 «Mundo»: escenario, reglas opcionales (muerte permanente, un solo país sin editor, escasez, mundo hostil, mundo alternativo) y cuatro deslizadores de dificultad (agresividad de la IA, economía, estabilidad, frecuencia de eventos) que se suman a los cuatro niveles de siempre.
- **En partida**: Partida → **Objetivos** (etapa de campaña, victorias y desglose de la puntuación) y **Logros**. Una píldora encima de «Terminar turno» muestra la etapa y el plazo. Para mediar en una guerra ajena, toca a uno de los bandos y pulsa «Mediar».
- **Al terminar**: final de campaña (1 de 3), puntuación desglosada, línea del tiempo del mandato, cómo te recuerda cada país, epílogo simulado de 12 turnos, tarjeta de resultado en PNG y «Seguir gobernando» tras una victoria.
- **Compartir**: Partida → Partida muestra el código `WL5-…` (semilla, país, rasgos, escenario, modo, reglas). Quien lo pegue en «Código de partida» empieza con el mismo mundo.
- **Editor → Escenarios**: simulación rápida (la IA juega N turnos por ti y puedes deshacerla), ajustes de dificultad y reglas de la partida en curso, lanzar un evento procedural, cumplir una etapa, probar cada victoria, y crear, editar, exportar e importar escenarios propios en JSON.

## Decisiones de balance

**Victorias alternativas** (solo en partida libre, reto semanal y sandbox). Se probaron con bots enfocados:

| Victoria | Condición | Comprobación |
|---|---|---|
| Económica | PIB ≥ 1,6 × el segundo **y** ≥ 1,5 × el inicial | EE. UU. con juego económico la logra hacia el turno 42. Lo segundo evita que EE. UU. gane en el turno 1. |
| Diplomática | 12 alianzas o pactos de defensa, 30 tratados comerciales, confianza 50 | Alemania la logra hacia el turno 52 firmando sin parar. |
| Científica | Primero del mundo en 7 descubrimientos y 12 tecnologías | EE. UU. lleva 6 primeros puestos en el turno 42: alcanzable, pero hay que pelearla. |
| Dominación | 25% del poder militar mundial y 3 anexiones | La más difícil. Desde la mejora posterior las IAs pagan el 60% de su mantenimiento (`7i-balance.js`) y ya no se rearman sin límite. |
| Supervivencia | 120 trimestres en el poder | Larga a propósito. |
| Legado | Turno ≥ 80 y juicio de la historia ≥ 88 | Exige un mandato largo y bueno a la vez. Con juego equilibrado el legado se queda en 75–83: hacen falta méritos extra (paz, descubrimientos, reformas). |

**Puntuación** (0–100, pública en Objetivos): economía 20, bienestar 15, diplomacia 15, paz y prestigio 12, ciencia 12, poder 12, permanencia 8 y objetivos 6. Cada bloque tiene tope, así que la guerra o el dinero por sí solos no pasan de 12 o 20 puntos. Los crímenes de guerra restan en «paz y prestigio».

**Campañas**: cada etapa tiene plazo. Si vence, pierdes («Se agotó el plazo») en vez de quedarte atascado. El bot de prueba (`camp.js` del desarrollo) juega dos semillas por campaña:

- Ganadas con el bot: emergente, declive, entre gigantes, mediador, comercial, Estado fallido y reformista.
- Imperio conquistador: el bot cumple dos etapas (gana su guerra y anexiona) pero no llega a 3 anexiones en el plazo. Un jugador que elija bien a sus víctimas sí puede.

Ajustes hechos tras las pruebas:

- **Cuba–EE. UU.**: con afinidad −67 y sanciones, una relación de 0 era imposible. Ahora el objetivo es −40 y hay un evento de deshielo.
- **Confianza internacional**: decae un 1,5% por turno. Los objetivos de 30–40 eran inalcanzables y se bajaron a 10–20.
- **Mongolia**: la etapa final pedía llegar al turno 60 con un plazo que acababa antes, así que era imposible. Ahora pide aguantar 20 turnos dentro de la etapa.
- **Rango militar**: los objetivos de rango militar se cambiaron por otros (tecnologías, alianzas), porque el ejército de las IAs crece demasiado (ver «Bugs conocidos»). Además, las métricas usan el poder «en bruto», sin el castigo por preparación que `power()` aplica solo al jugador.
- **Haití**: se ganaba en 15 turnos. Ahora pide crecer un 50%, una aprobación de 55, estabilidad de 65, 16 leyes y aguantar 8 turnos.
- **Mediación**: antes solo existía cuando la IA te la pedía. Ahora puedes iniciarla tú (2 de capital político; necesitas relación de −25 o más con ambos bandos y esperar 4 turnos entre intentos).

**Dificultad por partes**: `diffK` (en `68-brain.js`) multiplica la agresividad de la IA (`ai` y el umbral de guerra `need`) y la economía (`inc`). La dureza de la estabilidad resta o suma unos 0,5 puntos por turno. La frecuencia de eventos salta o duplica el evento del turno.

**Logros**: no cuentan en partidas editadas, salvo el del sandbox. Simular con el bot o probar victorias marca la partida como editada.

## Compatibilidad

Las partidas de fases anteriores cargan como «partida libre, escenario actual» y muestran un aviso. Los campos nuevos (`setup`, `p5`, `camp`) se crean al cargar. El progreso del jugador (logros, récords, estadísticas, escenarios propios y estilo) se guarda en el navegador (`wl_prog` y `wl_scen`), nunca en la partida.

## Pruebas

`npm test` añade escenarios, determinismo con mundo alternativo, código de partida, modo rápido, sandbox, sin editor, victorias y seguir jugando, campañas (etapas, eventos, finales, plazo, derrota), mediación, escenario propio, epílogo (no cambia la partida), eventos procedurales sin repetición, migración de una partida de la Fase 4, logros y reto semanal. Pasa también el soak de 150 turnos.

## Mejoras posteriores

- `src/engine/7i-balance.js`: la IA paga el 60% del mantenimiento de su ejército (130% en guerra). Si su caja baja del −1% del PIB, desmoviliza un 4% por turno. En el escenario actual, India pasa de multiplicar su poder ×16 en 40 turnos a ×3,5. Es el valor `AI_UPKEEP`.
- Alerta de campaña: cuando a una etapa le quedan 4 turnos o menos, aparece en «Requiere tu atención» con lo que falta, y te lleva a Objetivos.
- Ajustes: Mongolia pide relación 10 con ambos vecinos; el mediador, reputación de paz 20.

## Repaso de equilibrio (todo encendido)

- El juicio de la historia sumaba crecimiento sin tope y llegaba a 100 hacia el turno 50: un bot sencillo ganaba por Legado en 16 de 16 partidas en el turno 60. Ahora cada componente tiene tope (7d-story.js) y la victoria pide turno 80 y 88 puntos.
- La IA ya no se rearma sin control: además de pagar mantenimiento, no supera 2 veces su ejército inicial en paz ni 3,5 en guerra (ajustado por el crecimiento de su economía), y una compra grande se recorta. Antes India multiplicaba su ejército por 9 en 60 turnos; ahora por 2 (3,5 en el escenario de tensión). Valores en `7i-balance.js`.
- Los eventos de campaña llegaban solo con cero decisiones pendientes y podían retrasarse indefinidamente; ahora admiten una decisión en espera.
- Media de decisiones por turno con todo activo: unas 2 (máximo 5–6).

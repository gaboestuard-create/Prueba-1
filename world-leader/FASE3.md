# WORLD LEADER · Fase 3: guerra detallada, logística y espionaje

Notas de diseño y de balance. Los números de unidades, terreno, clima, doctrinas, políticas y operaciones están en `src/data-war.js` y son editables (`verificado: false`: son valores de diseño, no datos reales).

## Arquitectura

| Capa | Archivo | Qué hace |
|---|---|---|
| Datos | `src/data-war.js` | Unidades nuevas, papeles del triángulo táctico, terreno, clima, órdenes, doctrinas, árbol militar (tierra, aire y mar), políticas de guerra, alerta, fortificaciones y operaciones encubiertas nuevas. |
| Lógica | `src/engine/7a-theatre.js` | Teatro de operaciones: regiones en disputa, grupos (ejército, escuadrón, flota), batallas región a región, bombardeo, combate naval, bloqueo, suministro y moral, y la IA de campaña. |
| Lógica | `src/engine/7b-wareco.js` | Alerta, políticas de guerra, cansancio, inflación, comercio y embargo de armas, integración o rebelión de lo ocupado, reparaciones y cesiones, exilio, refugiados, reacciones del mundo, alto el fuego y armisticio, crímenes de guerra, disuasión y escalada estratégica, obras con tiempo, editor. |
| Lógica | `src/engine/7c-intel.js` | Agencia de inteligencia, contraespionaje, niebla de guerra, operaciones nuevas y alertas de guerra. |
| Render | `src/ui/5a-war.js`, `src/globe.js` (`setTheatre`) | Sala de guerra, Logística, Disuasión, agencia, parte de batalla animado, frentes en el globo, editor y atajos (G y L). |

`warTurn` (Fase 1) ya no tira un dado de fuerza total: llama a `theatreTurn`. Todo lo demás de la guerra se conserva: reacciones en cadena, capitulación, peticiones de paz y anexión.

## Cómo se resuelve una batalla

Fuerza de un grupo = Σ unidades × potencia de la unidad × terreno × clima × triángulo táctico × tecnología y doctrina; multiplicado además por:

- moral: 0,4 + 0,6 × moral/100;
- veteranía: 1 + 0,3 × experiencia;
- suministro: 0,45 + 0,55 × suministro/100;
- dominio del aire: 1 ± 0,25.

- El defensor multiplica por el terreno (montaña ×1,4, ciudad ×1,5…), por las fortificaciones (+15 % por nivel) y por la orden Defender (+20 %). Si no hay un grupo defendiendo, luchan la guarnición (12 % de las tropas libres; 20 % en la capital) y las milicias locales.
- Triángulo táctico: +35 % contra lo que vences y −25 % contra lo que te vence.
  - Blindados › infantería › fuerzas especiales › artillería y antiaéreos.
  - Antiaéreos › aviación › blindados.
  - Escoltas › submarinos › portaaviones.
- Para tomar la región, el atacante necesita más del 55 % de la fuerza total en juego (53 % con «Avanzar»). Pierde un 3 % + 12 % × (1 − proporción) de sus unidades; el defensor, un 3 % + 12 % × proporción.
- Las capitales caen al final, y la capital de una potencia nuclear no cae.

## Decisiones de balance

1. **Moral.** Una derrota resta 7 puntos y la retirada otros 6. Defender tu propia tierra recupera 7 por turno; «Avanzar» cansa 3 por turno. Con los valores iniciales (−10 y −12) un ejército que perdía dos batallas en un turno se hundía y el país caía en 3 turnos.
2. **Retirada automática** por debajo de 15 de moral o de 20 de suministro, y no antes, para que la IA no abandone frentes que aún puede sostener.
3. **El suministro decide las guerras lejanas.** Fuera de tu territorio, cada turno se pierden 5 + 30 × distancia (en radianes); si dominas el mar, solo el 60 %. Un bloqueo naval resta 10 por turno. Los suministros de guerra salen de tus reservas de combustible, munición, repuestos y alimentos; si faltan, se importan solos mientras haya dinero y no haya bloqueo.
4. **El marcador sigue al territorio**: cada turno se acerca un 15 % al reparto real de regiones, para que «quién va ganando» se lea de un vistazo.
5. **Dificultad**: la IA lucha con ×0,85, ×1, ×1,08 o ×1,18 según la dificultad, y ve tus órdenes con un 35 %, 60 %, 85 % o 100 % de probabilidad.
6. **Cansancio de guerra**: +0,7 por turno y guerra, y +1,5 por cada batalla perdida; baja con la paz. Resta apoyo de jóvenes, clase media y obreros y limita la moral de tus tropas.
7. **Amenaza estratégica**: se paga siempre (−25 de paz, −10 de confianza, −10 de relación con las grandes potencias, hasta 5 sanciones). Contra un rival no nuclear acaba la guerra el 70 % de las veces. Contra uno nuclear, el 40 % cede y el resto provoca una crisis mundial con alto el fuego impuesto. Es una mecánica de riesgo político, sin detalle técnico.
8. **Agencia de inteligencia**: su nivel sube un 15 % por turno hacia lo que pagas (máximo 4,8). Cada punto da +4,5 % de éxito en operaciones y +3 % de certeza en los informes; desde 4,2 no hay niebla de guerra.

### Resultados de los bots (40 turnos, 3 semillas por país)

Democracias (MX, DE, AR, TR, NG):

| Estrategia | Sobrevive | Riqueza | Aprobación |
|---|---|---|---|
| Equilibrada | 15/15 | +74 % | 71 |
| Dinero | 7/15 | +85 % | 43 |
| Pasiva | 7/15 | +24 % | 44 |
| Comercio | 6/15 | +25 % | 44 |
| Espionaje total | 6/15 | +24 % | 41 |
| Tortuga | 5/15 | +15 % | 41 |
| Guerra | 1/15 | +4 % | 33 |

Regímenes autoritarios (RU, CN, SA, IR, EG):

| Estrategia | Sobrevive | Riqueza | Aprobación |
|---|---|---|---|
| Equilibrada | 15/15 | +69 % | 50 |
| Espionaje total | 15/15 | +19 % | 36 |
| Tortuga | 15/15 | +14 % | 36 |
| Guerra | 13/15 | −23 % | 22 |

Ninguna estrategia de un solo eje domina. La guerra pura es viable en regímenes autoritarios, pero arruina el país. En democracias se pierde en las urnas: es una decisión de diseño, no un error.

Para repetir la prueba: `node build.js && node balance.js [PAÍSES] [bots]`.

# Calle Mayor

Tycoon de negocios en 2D para teléfono y PC. Empiezas con $300 y un puesto de limonada; creces a locales,
abres un estudio para diseñar tus propios productos e inviertes en la bolsa hasta llegar a Tycoon ($1 M de patrimonio).
Sin dependencias: abre `index.html` (las fuentes vienen de Google Fonts y tienen respaldo si no hay internet).

| Archivo | Capa | Qué contiene |
| --- | --- | --- |
| `datos.js` | Datos | Negocios, lotes, rangos, categorías de producto, acciones, eventos y **todo el balance**. |
| `motor.js` | Simulación | Horas, clientes, reputación, productos, bolsa y rangos. Sin interfaz, determinista por semilla. |
| `escena.js` | Presentación | La calle en canvas: día y noche, edificios por nivel, peatones, clientes, autos, monedas. |
| `ui.js` + `index.html` | Presentación | Paneles, iconos SVG propios y animaciones. Manda acciones con `Motor.hacer(estado, accion, args)`. |

- `node prueba.js` (o `node prueba.js --ver`): un bot juega 120 días y comprueba ritmo de rangos, quiebra,
  determinismo y que la bolsa y los terrenos no regalen dinero. Córrelo después de tocar `datos.js`.
- `node construir.js [salida.html]`: junta todo en un solo archivo para publicarlo o pasarlo al teléfono.

El juego anterior al estilo Big Ambitions queda en pausa en `mi-imperio/`.

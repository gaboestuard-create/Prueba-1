# Mi Imperio (Fase 1)

Simulador de negocios 2D para teléfono y PC. Sin dependencias y sin internet: abre `index.html`.

| Archivo | Capa | Qué contiene |
| --- | --- | --- |
| `datos.js` | Datos | Negocios, productos, locales, distritos, proveedores y **todo el balance**. Un negocio nuevo se agrega aquí, sin tocar código. |
| `motor.js` | Simulación | Reloj, clientes, reputación, empleados, dinero y necesidades. Sin interfaz, determinista por semilla. |
| `ui.js` + `index.html` | Presentación | Solo lee el estado y manda acciones con `Motor.hacer(estado, accion, args)`. |

- `node prueba.js`: juega 30 días sin pantalla (jugador razonable y descuidado, los tres negocios) y falla si la economía se rompe. Córrelo después de tocar `datos.js`.
- `node construir.js [salida.html]`: junta todo en un solo archivo para pasarlo al teléfono o publicarlo.

# Calle Mayor

Tycoon de negocios en 2D para teléfono y PC. Empiezas con $300 y un puesto de limonada; creces a locales,
abres un estudio para diseñar tus propios productos, los fabricas en tus plantas e inviertes en la bolsa
hasta llegar a Tycoon ($1 M de patrimonio).

Fábricas: la planta de alimentos (Empresario) hace bebidas y snacks; la de ensamble (Magnate), audífonos, tenis
y teléfonos. Cada línea se asigna a un producto, produce `capLinea` unidades al día y necesita `porLinea` obreros.
Lo que cabe en tus líneas sale al costo `propio`; el resto se maquila al `costo` de la categoría.
Sin dependencias: abre `index.html` (las fuentes vienen de Google Fonts y tienen respaldo si no hay internet).

Fase 2 (en curso): Grupo Ferrán es un rival que abre negocios en lotes libres (máximo 3, nunca los últimos 3 libres),
compite en precio, quiebra tras días en rojo y te vende sus locales. Cada 4 a 7 días llega una decisión con dos salidas
(`decisiones` en `datos.js`). Tu color de marca pinta toldos y letreros; varios negocios del mismo giro forman cadena
(insumos más baratos y fama compartida). Los hitos dan premios en efectivo.

Modos: **Historia** (7 capítulos con diálogos de Doña Chela, Ulises Ferrán, Valeria Vega y el Lic. Ortiz; finales
`calle`, `socios`, `vendido` y dos derrotas) y **Sandbox** (dinero inicial y rival a elegir). Guion, capítulos y finales
viven en `datos.js` (`dialogos`, `capitulos`, `finales`).

Números rojos: el banco da un plazo (más largo con más negocios). Mientras tanto Ferrán y Capital Vega ofrecen comprar
tus negocios, cada día más barato; se acepta, se regatea una vez o se rechaza. Si se acaba el plazo con un solo negocio,
Ferrán se lo queda; con varios, quiebra. Ambos son fin de partida.

Vecindad (`vecindad` en `datos.js`): lo que hay en los lotes de al lado sube o baja la gente que entra (café con pan,
flores con restaurante, mismo giro pared con pared, planta junto a una tienda). Anaquel (`anaquel`): tus productos se
venden en el mostrador de tus negocios compatibles y eso los da a conocer en las tiendas de fuera.

Interiores (prototipo con la Tiendita de la esquina, `interior` en `datos.js`): entras al local en 3D cenital y
acomodas muebles en una cuadrícula. Las cajas con cajero fijan cuántos clientes se atienden por hora, los anaqueles y
refris exhiben productos y se vacían, los reponedores los llenan desde la bodega y el pedido automático llega de noche.
Un mueble al que nadie puede llegar no cuenta, y los pasillos apretados restan.

| Archivo | Capa | Qué contiene |
| --- | --- | --- |
| `datos.js` | Datos | Negocios, lotes, rangos, categorías de producto, acciones, eventos y **todo el balance**. |
| `motor.js` | Simulación | Horas, clientes, reputación, productos, fábricas, bolsa y rangos. Sin interfaz, determinista por semilla. |
| `escena.js` | Presentación | La calle en canvas: día y noche, edificios por nivel, peatones, clientes, autos, monedas. |
| `interior.js` | Presentación | Interior en 3D cenital con three.js (copia local en `vendor/`, licencia MIT): muebles, clientes, cajeros, reponedores. |
| `ui.js` + `index.html` | Presentación | Paneles, iconos SVG propios y animaciones. Manda acciones con `Motor.hacer(estado, accion, args)`. |

- `node prueba.js` (o `node prueba.js --ver`): un bot juega 120 días y comprueba ritmo de rangos, quiebra,
  determinismo, que una planta pague y que la bolsa y los terrenos no regalen dinero. Córrelo después de tocar `datos.js`.
- `node construir.js [salida.html]`: junta todo en un solo archivo para publicarlo o pasarlo al teléfono.

El juego anterior al estilo Big Ambitions queda en pausa en `mi-imperio/`.

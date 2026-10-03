# Pelotazo · fútbol de acción en 3D

Juego de fútbol arcade en un solo archivo: `index.html` (three.js r128 desde cdnjs). Se publica como artefacto
de claude.ai con su propio enlace (ver "Publicar"). Todo el texto del juego está en español.

**Es un proyecto aparte de DT26.** No toques nada de `dt26/` ni compartas código, datos guardados o nombres de
almacenamiento con él. Pelotazo guarda en su propia base de datos (`pelotazo`).

## Reglas del proyecto

- Jugadores, equipos y marcas **inventados**. Nunca usar "FIFA", "Ultimate Team", ni nombres, caras o escudos reales.
  El futuro modo de cartas se llamará de otra forma y solo usará moneda del juego (nunca dinero real).
- Estilo de pocos polígonos / caricatura. Tiene que ir fluido en un celular de gama media: los 22 jugadores se dibujan
  con una malla por pieza del cuerpo (`InstancedMesh`), así son pocas llamadas de dibujo. No añadas una malla por
  jugador ni sombras en tiempo real sin medir antes.
- Controles: pantalla táctil, teclado y mando deben hacer lo mismo. Todo pasa por `leerControles()`, que mezcla las
  tres fuentes en `ENT` (estado), `BORDE` (recién pulsado) y `SUELTO` (recién soltado). Las pulsaciones rápidas se
  guardan en `PULSO` para no perderlas aunque el juego vaya a pocos fotogramas. Los botones cambian de función al
  defender (Pase→Cambiar, Pase largo→Presión, Tiro→Barrida); ver `controlUsuario` y `actualizarBotones`.
- La simulación usa un paso fijo (`DT = 1/60`, función `paso`). La lógica del juego no depende de los fotogramas por
  segundo; el dibujo sí. El azar sale de `rng()` (con semilla) para que las pruebas se repitan igual.

## Plan por capas

1. **Prototipo jugable** (hecho): cancha, balón, 11 contra 11, controles, pase, pase largo, tiro, entradas, gol,
   marcador, tiempo. Saques de banda, córner y de puerta en versión simple (el jugador saca con el pie).
2. Reglas completas: saques con su animación, faltas, penaltis, fuera de juego, medio tiempo y repeticiones.
3. Mejores animaciones, cámara y sonido.
4. Partido rápido y torneos.
5. Modo carrera de jugador.
6. Modo de cartas sin conexión (monedas y sobres del juego, contra la computadora).

## Regla número uno: no perder el progreso

- Los datos (`DATOS`: ajustes, estadísticas, historial) se guardan en IndexedDB con la clave `save`, como texto
  `js:` + JSON. Si no hay IndexedDB se usa localStorage, y si tampoco, solo memoria. No cambies ese formato.
- Junto a ella: `save_meta` (versión y fecha), `bak_index` y las copias `bak_*` (5 por tipo: `auto`, `partido`,
  `reemplazo`), y `danado_*` (datos dañados que se apartaron al abrir).
- Si cambias la forma de `DATOS`: sube `SAVE_VERSION` y añade la conversión en `MIGR[nueva]`. `arreglarDatos`
  completa los campos que falten.
- `guardarAhora` no guarda si `validarDatos` encuentra daños graves. Si añades datos que deban existir siempre,
  añade también su comprobación ahí.
- Los guardados van en fila (`enCola`). Cualquier cosa que sustituya los datos debe ir dentro de la fila y llamar
  antes a `bakCurrent(...)` (ver `bakRestore`).
- Datos de una versión más nueva del juego (`v > SAVE_VERSION`): se abren en modo solo lectura y nunca se escriben.
- Solo una pestaña guarda a la vez: la última que se abre toma el control (`vigilarPestanas`).

## Pruebas

```
cd futbol
npm install
npm test                 # todas (alrededor de 1 minuto)
npm test -- guardado     # solo las que contienen "guardado" en el nombre
```

Abren el juego en Chromium sin pantalla y comprueban: arranque y dibujo, diseño en teléfono (vertical y
horizontal), pases, pase al primer toque, tiros y goles, saques, entradas, un partido entero entre la computadora,
teclado, pantalla táctil, mando, cambio de jugador, y todo el guardado (reabrir, copias, datos dañados, versión
nueva, formato antiguo, restaurar, dos pestañas) más la compatibilidad con cada versión publicada.

Para manejar el juego desde una prueba: `G.prueba` (activo, mx, mz y botones) sustituye a los controles y
`G.avanzar(n)` adelanta n pasos sin dibujar. `G.autoplay = true` hace que la computadora maneje a los dos equipos.

## Publicar

Artefacto: https://claude.ai/artifact/PDaxHwKVqqYsViT7qjwQKU

1. `npm test` en verde.
2. Publicar el artefacto con `futbol/index.html` (siempre el mismo enlace).
3. Hacer commit y añadir ese commit a `tests/compat.json`: desde entonces las pruebas comprueban que sus datos
   guardados se siguen abriendo en todas las versiones futuras.

## Estética

Fuentes Lilita One (títulos y marcador) y Nunito (texto). Colores en variables CSS de `:root` (un solo tema oscuro,
porque es un juego a pantalla completa). Estilos del estadio en `ESTILOS` (día, atardecer, noche): para un estilo
gráfico nuevo, añade una entrada ahí y una opción en `OPCIONES`.

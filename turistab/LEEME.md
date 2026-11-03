# TurisTab — video demo de la app

`turistab_demo.mp4`: 80 s, 1920×1080, 30 fps, sin audio. Es la demostración de la app "En busca del destino ideal
en Tabasco" (Expo UMMA, Fundamentos de Mercadotecnia), hecha a partir del documento técnico del equipo.

Escenas: inicio → mapa con burbujas → filtro inteligente → ficha del lugar → ruta con mapa offline →
joyas ocultas → comparar destinos → traductor al inglés → cierre.

- `demo.html`: toda la animación (ilustraciones SVG, mapa estilizado de Tabasco, UI). Abre `demo.html?t=20` en Chrome
  para ver el cuadro del segundo 20. Tiempos de cada escena en `CAPS` y `TAPS`.
- `render.js`: lo convierte a video. `node turistab/render.js` (unos 4 min; necesita Playwright y ffmpeg).
  `node turistab/render.js --stills 5,20,40` saca PNGs de prueba.

El mapa es una silueta aproximada, no cartografía exacta. La Hacienda Cacao Real y la Cocina Chontal son ejemplos
inventados; los precios y horarios también son de ejemplo.

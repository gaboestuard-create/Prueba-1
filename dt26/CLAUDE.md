# DT26 · Director Técnico

Juego de gestión de fútbol en un solo archivo: `index.html`. Se publica como artefacto de claude.ai
(https://claude.ai/artifact/YDEA8CZV1fYaHCwU3uKpa3). Todo el texto del juego está en español.

## Regla número uno: no perder partidas

Los jugadores llevan temporadas enteras guardadas. Cualquier cambio debe poder abrir las partidas que ya existen.

- La partida se guarda en IndexedDB con la clave `save`, en el formato de siempre (`gz:` + base64, o `js:` + JSON).
  No cambies ese formato: las versiones antiguas del juego tienen que poder leerlo.
- Junto a ella están `save_meta`, `bak_index` y las copias `bak_*`. La lógica vive en la sección
  "protección de la partida" (busca `validateWorld`, `bakPut`, `loadLocal`).
- Si cambias la estructura de la partida (`W`): sube `VERSION` y añade la conversión en `MIGR[nueva]`.
  `fixWorld` sigue completando los campos que falten en partidas antiguas.
- Nunca borres ni sobrescribas `save` sin pasar antes por `bakCurrent(...)`.
- `saveNow` no guarda si `validateWorld` encuentra daños graves. Si añades datos nuevos que deban
  existir siempre, añade también su comprobación ahí.
- Solo una pestaña guarda a la vez (sección "una sola pestaña guarda a la vez"). Cualquier acción que
  sustituya la partida debe llamar antes a `tabTakeover()`.

## Pruebas

```
cd dt26
npm install
npm test            # todas (unos 75 s)
npm test -- nube    # solo las que contienen "nube" en el nombre
```

Las pruebas abren el juego en Chromium sin pantalla y comprueban: varias temporadas seguidas,
guardar y reabrir, copias de seguridad, recuperación de partidas dañadas, varias pestañas, la nube
y la compatibilidad con las partidas de cada versión publicada.

Antes de publicar una versión nueva:
1. `npm test` en verde.
2. Publicar el artefacto con `dt26/index.html`.
3. Hacer commit y añadir ese commit a `tests/compat.json`: desde entonces las pruebas comprobarán
   que sus partidas siguen abriéndose en todas las versiones futuras.

## Estética

Fuentes Barlow y Barlow Condensed. Colores en variables CSS de `:root`, con tema claro y oscuro.
Componentes que se reutilizan: `.card`, `.kv`, `.btn`, `.seg`, `.chip`, `.tw`/`table.t`, `.mbtn`,
`.pick`, `.tile`, `.snote`, y `modal()`/`toast()` para diálogos y avisos.

# Notas del repositorio

- `mascota/` contiene la mascota animada del Laboratorio Clínico Villanueva (sprites en video con fondo transparente).
  Para cualquier video de la marca, lee `mascota/LEEME.md`: ahí está el catálogo de clips, cómo pegarlos en un video y
  cómo regenerarlos. Los clips ya renderizados están en `mascota/salida/`.
- `marca/` tiene el logo (original y sin fondo), el lema y los colores de la marca; ver `marca/LEEME.md`.
- `videos/tiktoks/` es el proyecto Remotion con los TikToks de la marca (una composición por video: `Biometria`,
  `DiaDelMedico`). Las piezas reutilizables (subtítulos por palabra, transiciones con franjas del logo, Supergabito
  animado) están en `src/piezas.tsx`; ver su `LEEME.md` antes de hacer un video nuevo.

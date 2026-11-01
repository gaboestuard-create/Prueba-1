#!/usr/bin/env bash
# Deja esta carpeta lista para volver a renderizar la prueba 1: fuentes, cuadros de la mascota y texturas.
set -e
cd "$(dirname "$0")"
mkdir -p fonts frames
for p in fraunces special-elite caveat ibm-plex-mono; do
  npm pack @fontsource/$p --silent >/dev/null && tar xzf fontsource-$p-*.tgz
  cp package/files/*-latin-{400,700,900}-{normal,italic}.woff2 fonts/ 2>/dev/null || true
  rm -rf package fontsource-$p-*.tgz
done
for p in sorprendido pensativo senalando_lado dudando dos_pulgares guino_pulgar; do for c in entrada idle salida; do
  mkdir -p frames/${p}_$c
  ffmpeg -v error -y -c:v libvpx-vp9 -i ../../mascota/salida/${p}_$c.webm -vf scale=720:1080 -pix_fmt rgba frames/${p}_$c/%03d.png
done; done
cp ../../marca/logo_sin_fondo_x3.png logo.png
python3 assets.py   # paper.jpg + grain.png
echo "Listo."

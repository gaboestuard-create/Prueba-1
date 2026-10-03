#!/bin/sh
# Copia la versión actual del juego a la rama gh-pages (GitHub Pages: https://gaboestuard-create.github.io/Prueba-1/).
# Uso: sh futbol/publicar-pages.sh "mensaje"   (desde la raíz del repositorio, con las pruebas en verde)
set -e
RAIZ=$(git rev-parse --show-toplevel); W=$(mktemp -d)
git -C "$RAIZ" fetch -q origin gh-pages
git -C "$RAIZ" worktree add -q "$W" origin/gh-pages
cd "$W"; git checkout -q -B gh-pages
rm -rf js icons index.html manifest.webmanifest sw.js
cp -r "$RAIZ/futbol/index.html" "$RAIZ/futbol/manifest.webmanifest" "$RAIZ/futbol/sw.js" "$RAIZ/futbol/icons" "$RAIZ/futbol/js" .
git add -A; git commit -q -m "${1:-Actualizar Pelotazo}" || echo "sin cambios"
git push -q origin gh-pages
cd "$RAIZ"; git worktree remove --force "$W"

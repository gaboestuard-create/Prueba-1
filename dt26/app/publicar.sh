#!/bin/sh
# Publica DT26 como aplicación en la carpeta dt26/ de la rama gh-pages (GitHub Pages).
# La rama también lleva otros juegos (Pelotazo, en la raíz): este script solo toca dt26/.
# Uso, desde la raíz del repositorio: sh dt26/app/publicar.sh
set -e
D=$(cd "$(dirname "$0")/.." && pwd); ROOT=$(cd "$D/.." && pwd); TMP=$(mktemp -d)
git -C "$ROOT" fetch -q origin gh-pages 2>/dev/null && git -C "$ROOT" worktree add -q "$TMP/site" origin/gh-pages \
  || { git -C "$ROOT" worktree add -q --detach "$TMP/site" && git -C "$TMP/site" checkout -q --orphan gh-pages && git -C "$TMP/site" rm -rqf . ; }
O="$TMP/site/dt26"; mkdir -p "$O"; touch "$TMP/site/.nojekyll"
cp "$D/index.html" "$O/index.html"; cp "$D/app/manifest.webmanifest" "$D/app/sw.js" "$D/app/"icon-*.png "$O/"
cd "$TMP/site"; git add -A dt26 .nojekyll
if git diff --cached --quiet; then echo "gh-pages ya está al día"; else
  printf 'DT26: publicar %s en GitHub Pages\n%s' "$(git -C "$ROOT" rev-parse --short HEAD)" "${TRAILER:+
$TRAILER}" | git commit -q -F -; fi
git push -q origin HEAD:gh-pages; cd "$ROOT"; git worktree remove --force "$TMP/site"; echo "publicado en gh-pages"

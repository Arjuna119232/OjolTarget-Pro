#!/usr/bin/env bash
# Bundles the built web app + local fonts into Android assets.
#
# Sources (override with env vars if needed):
#   WEB_DIR    Vite output folder (default: ./web-dist, else ../dist)
#   FONTS_DIR  bundled font folder (default: ./fonts)
#   SRC_IMAGES foto avatar/hero (default: ./web-images)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"

if [ -n "${WEB_DIR:-}" ]; then
  :
elif [ -d "$HERE/../dist" ] && [ -f "$HERE/../dist/index.html" ]; then
  WEB_DIR="$HERE/../dist"
elif [ -d "$HERE/web-dist" ]; then
  WEB_DIR="$HERE/web-dist"
else
  WEB_DIR="$HERE/../dist"
fi

if [ -n "${FONTS_DIR:-}" ]; then
  :
elif [ -d "$HERE/fonts" ]; then
  FONTS_DIR="$HERE/fonts"
else
  FONTS_DIR="$HERE/../fonts"
fi

ASSETS="$HERE/assets"

[ -f "$WEB_DIR/index.html" ] || { echo "build web tidak ditemukan di $WEB_DIR"; exit 1; }

rm -rf "$ASSETS"
mkdir -p "$ASSETS/www/fonts"

cp -r "$WEB_DIR/." "$ASSETS/www/"
cp "$FONTS_DIR/fonts.css" "$ASSETS/www/fonts/fonts.css"
cp "$FONTS_DIR"/woff2/*.woff2 "$ASSETS/www/fonts/"

# Foto dipakai lewat path dev absolut (/src/assets/images/...); Vite membiarkannya,
# jadi path yang sama dicerminkan di bundle agar avatar & hero tetap tampil offline.
SRC_IMAGES="${SRC_IMAGES:-$HERE/web-images}"
if [ -d "$SRC_IMAGES" ] && [ -n "$(ls -A "$SRC_IMAGES" 2>/dev/null)" ]; then
  # ImageMagick 7 = `magick`, ImageMagick 6 = `convert` (default on Ubuntu CI).
  if command -v magick >/dev/null 2>&1; then
    IM_CMD=(magick)
  elif command -v convert >/dev/null 2>&1; then
    IM_CMD=(convert)
  else
    echo "ImageMagick tidak ditemukan (magick/convert)"; exit 1
  fi
  mkdir -p "$ASSETS/www/src/assets/images"
  for img in "$SRC_IMAGES"/*.jpg; do
    "${IM_CMD[@]}" "$img" -resize '1280x1280>' -strip -quality 85 \
      "$ASSETS/www/src/assets/images/$(basename "$img")"
  done
fi

python3 - "$ASSETS/www/index.html" <<'PY'
import re, sys
path = sys.argv[1]
html = open(path, encoding='utf-8').read()

# Drop the remote Google Fonts requests: fonts are bundled locally.
html = re.sub(r'\s*<link rel="preconnect"[^>]*>\n?', '\n', html)
html = re.sub(r'\s*<link href="https://fonts\.googleapis\.com[^>]*>\n?', '\n', html)

if '/fonts/fonts.css' not in html:
    html = html.replace(
        '</head>',
        '  <link rel="stylesheet" href="/fonts/fonts.css">\n'
        '  <style>html,body{background-color:#0a0f1d;}</style>\n'
        '</head>'
    )

open(path, 'w', encoding='utf-8').write(html)
print('index.html prepared')
PY

echo "assets size: $(du -sh "$ASSETS" | cut -f1)"

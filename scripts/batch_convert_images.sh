#!/usr/bin/env bash
set -euo pipefail

# Batch convert product_photos/*.jpg to WebP (q=80)
if ! command -v cwebp >/dev/null 2>&1; then
  echo "cwebp not found. Install libwebp (Ubuntu: sudo apt install webp)"
  exit 1
fi

mkdir -p product_photos_webp
shopt -s nullglob
for f in product_photos/*.jpg; do
  out="product_photos_webp/${f##*/}"
  out="${out%.*}.webp"
  echo "Converting $f -> $out"
  cwebp -q 80 "$f" -o "$out"
done

echo "Done. WebP images are in product_photos_webp/"

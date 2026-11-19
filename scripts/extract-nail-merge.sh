#!/usr/bin/env bash
# Extrai os quadros do vídeo das camadas se juntando (media-src/unha-camadas.mp4)
# para a rolagem do site. Usa os quadros 60 a 126: antes há textos em inglês e depois a unha fica parada.
set -euo pipefail
OUT=public/media/unha-camadas
mkdir -p "$OUT"
ffmpeg -v error -y -i media-src/unha-camadas.mp4 \
  -vf "select='between(n\,59\,125)',crop=640:704:320:6" \
  -fps_mode vfr -c:v libwebp -quality 80 -compression_level 6 "$OUT/f%03d.webp"
ls "$OUT" | wc -l

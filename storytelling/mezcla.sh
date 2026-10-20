#!/bin/sh
# Mezcla la voz en off (voz.mp3, ElevenLabs) con musica.wav y la pone en video_storytelling.mp4.
# Cada frase: inicio y fin dentro de voz.mp3 -> segundo del video donde entra.
set -e
cd "$(dirname "$0")"
FRASES="0.00 4.04 4.5
4.67 7.13 12.4
7.55 10.00 16.7
10.56 14.63 20.6
15.14 17.92 27.6
18.29 20.52 35.0
20.75 23.48 42.4
24.03 31.34 45.9
31.89 33.80 54.0
34.30 36.16 56.6"
F=""; L=""; i=0
while read a b at; do
  ms=$(awk "BEGIN{print int($at*1000)}")
  F="$F[1:a]atrim=$a:$b,asetpts=PTS-STARTPTS,adelay=$ms:all=1[v$i];"; L="$L[v$i]"; i=$((i+1))
done <<LIST
$FRASES
LIST
ffmpeg -y -loglevel error -i video_storytelling.mp4 -i voz.mp3 -i musica.wav -filter_complex \
  "${F}${L}amix=inputs=$i:normalize=0,apad,atrim=0:60,volume=2.2,asplit[voz][ctl];[2:a]volume=0.45[mus];[mus][ctl]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];[duck][voz]amix=inputs=2:normalize=0,alimiter=limit=0.9[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t 60 tmp_mezcla.mp4
mv tmp_mezcla.mp4 video_storytelling.mp4

"""Anima la mascota del Laboratorio Clínico Villanueva a partir de una sola imagen.

Técnica "cutout" (marioneta 2D): se recorta el fondo, se separan cabeza y mano,
y cada capa se rota/escala por cuadro. Uso: python3 mascota/animar.py
Requiere Pillow, numpy y ffmpeg.
"""
import math
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

DIR = Path(__file__).parent
OUT = DIR / "salida"
FPS = 30
CANVAS = (1024, 1600)
TOP = 40  # margen superior para saltos

src = Image.open(DIR / "original.jpg").convert("RGB")
W, H = src.size
rgb = np.asarray(src)

# --- 1. Quitar fondo: relleno desde las esquinas sobre el negro casi puro ---
dark = Image.fromarray(((rgb.max(2) <= 14) * 255).astype("uint8")).copy()
for p in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
    ImageDraw.floodfill(dark, p, 128)
opaque = np.asarray(dark) != 128

# --- 2. Máscaras de partes (coordenadas medidas sobre original.jpg) ---
yy, xx = np.mgrid[0:H, 0:W]
HEAD_C, HEAD_R = (555, 385), (350, 388)
head = opaque & (((xx - HEAD_C[0]) / HEAD_R[0]) ** 2 + ((yy - HEAD_C[1]) / HEAD_R[1]) ** 2 <= 1)

poly = Image.new("L", (W, H), 0)
ImageDraw.Draw(poly).polygon([(88, 585), (252, 585), (252, 882), (88, 882)], fill=255)
hand = opaque & (np.asarray(poly) > 0) & ~head
# el cuerpo conserva la parte baja de la mano: al girarla se ve la muñeca original, no un hueco
body = opaque & ~head & ~(hand & (yy < 830))


def layer(mask, pixels=rgb):
    return Image.fromarray(np.dstack([pixels, mask * 255]).astype("uint8"), "RGBA")


# Rellena bajo la cabeza estirando hacia arriba lo que hay justo debajo (cuello/bata),
# para que no aparezca un hueco cuando la cabeza se inclina.
body_px = rgb.copy()
body_fill = body.copy()
for x in range(HEAD_C[0] - HEAD_R[0], HEAD_C[0] + HEAD_R[0]):
    col = np.nonzero(head[:, x])[0]
    if len(col) == 0:
        continue
    yb = col.max() + 4
    if yb < H and body[yb, x]:
        y0 = max(col.max() - 60, 0)
        body_px[y0:yb, x] = rgb[yb, x]
        body_fill[y0:yb, x] = True

L_BODY = layer(body_fill, body_px)
L_HEAD = layer(head)
L_HAND = layer(hand)
NECK = (520, 760)
WRIST = (185, 880)

# Parpadeo: se copia en espejo el ojo que guiña (mismo estilo de dibujo) sobre el ojo abierto
EYE = [(280, 445), (365, 447), (415, 485), (450, 545), (440, 570), (375, 597), (305, 585), (277, 525)]
FACE_X = 510  # eje de simetría de la cara (centro de la nariz)
eye_m = Image.new("L", (W, H), 0)
ImageDraw.Draw(eye_m).polygon(EYE, fill=255)
eye_m = eye_m.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(2))
mirror = np.ascontiguousarray(rgb[:, ::-1])
shift = W - 2 * FACE_X  # x espejo = 2*FACE_X - x
mirror = np.roll(mirror, -shift, axis=1)
L_HEAD_CLOSED = L_HEAD.copy()
L_HEAD_CLOSED.paste(Image.fromarray(mirror), (0, 0), eye_m)


def head_with_blink(t):
    """t>0.5 ojo cerrado (los parpadeos de caricatura no necesitan cuadros intermedios)."""
    return L_HEAD_CLOSED if t > 0.5 else L_HEAD


def frame(head_rot=0.0, hand_rot=0.0, blink=0.0, sx=1.0, sy=1.0, dy=0.0, scale=1.0):
    char = L_BODY.copy()
    char.alpha_composite(head_with_blink(blink).rotate(head_rot, Image.BICUBIC, center=NECK))
    char.alpha_composite(L_HAND.rotate(hand_rot, Image.BICUBIC, center=WRIST))
    w, h = max(int(W * sx * scale), 1), max(int(H * sy * scale), 1)
    char = char.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    feet_y = TOP + H  # los pies quedan fijos en el piso
    canvas.alpha_composite(char, ((CANVAS[0] - w) // 2, int(feet_y - h + dy)))
    return canvas


def blink_curve(f, at, dur=6):
    d = f - at
    return max(0.0, 1 - abs(d - dur / 2) / (dur / 2)) if 0 <= d <= dur else 0.0


ease = lambda t: 0.5 - 0.5 * math.cos(math.pi * min(max(t, 0), 1))


def back_out(t, s=1.9):
    t -= 1
    return t * t * ((s + 1) * t + s) + 1


# --- 3. Clips ---
def idle(f, n=90):
    p = 2 * math.pi * f / n
    return frame(head_rot=2.5 * math.sin(p), sx=1 - 0.008 * math.sin(2 * p),
                 sy=1 + 0.012 * math.sin(2 * p), blink=blink_curve(f, 55), hand_rot=1.5 * math.sin(p))


def pulgar(f, n=60):
    p = 2 * math.pi * f / n
    pump = max(0.0, math.sin(2 * p))  # dos "¡bien!" por ciclo
    return frame(hand_rot=-10 * pump, head_rot=-3 * pump, dy=-28 * pump,
                 sx=1 + 0.015 * pump, sy=1 - 0.015 * pump, blink=blink_curve(f, 40, 5))


def entrada(f, n=36):
    t = min(f / 24, 1)
    s = back_out(t) if t > 0 else 0
    return frame(scale=max(s, 0.01), head_rot=6 * (1 - t) * math.sin(f), hand_rot=-12 * (1 - ease(t)))


CLIPS = {"idle": (idle, 90), "pulgar": (pulgar, 60), "entrada": (entrada, 36)}


def export(name, fn, n):
    tmp = OUT / f"_{name}"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    for f in range(n):
        fn(f, n).save(tmp / f"{f:04d}.png")
    seq = str(tmp / "%04d.png")
    run = lambda *a: subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", seq, *a], check=True)
    run("-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-auto-alt-ref", "0", str(OUT / f"{name}.webm"))
    run("-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", "-vf", "scale=512:-2", str(OUT / f"{name}.mov"))
    # vista previa sobre fondo de color (GIF no maneja bien alfa suave)
    run("-filter_complex", "color=c=0x1f4fa3:s=1024x1600:r=30[bg];[bg][0]overlay=shortest=1,scale=384:-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse",
        str(OUT / f"{name}_preview.gif"))
    shutil.rmtree(tmp)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    frame().save(OUT / "mascota_sin_fondo.png")
    # autocomprobación: las capas cubren el recorte sin huecos y el fondo es transparente
    assert ((head | hand | body) == opaque).all()
    assert frame().getpixel((5, 5))[3] == 0
    for name, (fn, n) in CLIPS.items():
        export(name, fn, n)
        print("ok", name)

"""Mascota Laboratorio Clínico Villanueva: recorta cada pose de poses/*.jpg y genera clips de motion graphics.

Por pose: <pose>.png (sin fondo) y clips entrada / idle (loop) / salida en .webm (alfa) y _pantalla_verde.mp4.
Además demo.mp4 / demo.gif con todas las poses encadenadas. Uso: python3 mascota/animar.py [pose ...]
Requiere Pillow, numpy y ffmpeg.
"""
import math
import shutil
import subprocess
import sys
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

DIR = Path(__file__).parent
OUT = DIR / "salida"
FPS = 30
CANVAS = (1080, 1620)
CHAR_H = 1200  # alto normalizado del personaje
FEET_Y = 1590  # línea del piso en el lienzo
N_ENTRADA, N_IDLE, N_SALIDA = 18, 60, 12

# estilo del loop idle por pose: "respira" (default), "brinca", "tiembla", "encoge"
IDLE = {"saltando": "brinca", "sorprendido": "tiembla", "dudando": "encoge"}


def recortar(path):
    """Fondo negro -> transparente: relleno desde todo el borde; recorta el bbox del personaje."""
    img = Image.open(path).convert("RGB")
    img = img.crop((3, 3, img.width - 3, img.height - 3))  # algunas capturas traen una línea gris en el borde
    rgb = np.asarray(img)
    W, H = img.size
    dark = Image.fromarray(((rgb.max(2) <= 7) * 255).astype("uint8")).copy()
    border = [(x, 0) for x in range(0, W, 3)] + [(x, H - 1) for x in range(0, W, 3)] + \
             [(0, y) for y in range(0, H, 3)] + [(W - 1, y) for y in range(0, H, 3)]
    for p in border:
        if dark.getpixel(p) == 255:
            ImageDraw.floodfill(dark, p, 128)
    alpha = Image.fromarray(((np.asarray(dark) != 128) * 255).astype("uint8"))
    # quita motas sueltas y suaviza 1 px el borde
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = img.copy()
    rgba.putalpha(alpha)
    return rgba.crop(rgba.getbbox())


def ease(t):
    t = min(max(t, 0.0), 1.0)
    return 0.5 - 0.5 * math.cos(math.pi * t)


def back_out(t, s=2.2):
    t = min(max(t, 0.0), 1.0) - 1
    return t * t * ((s + 1) * t + s) + 1


def pose_frame(char, sx=1.0, sy=1.0, dy=0.0, rot=0.0, dx=0.0):
    """Coloca el personaje con los pies en el piso; escala/rota con pivote en los pies."""
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    if sx <= 0.01 or sy <= 0.01:
        return canvas
    w, h = int(char.width * sx), int(char.height * sy)
    c = char.resize((w, h), Image.LANCZOS)
    x = (CANVAS[0] - w) // 2 + int(dx)
    y = FEET_Y - h + int(dy)
    canvas.paste(c, (x, y), c)  # lienzo vacío: paste = composición, y admite posiciones negativas
    if rot:
        canvas = canvas.rotate(rot, Image.BICUBIC, center=(CANVAS[0] / 2 + dx, FEET_Y + dy))
    return canvas


def entrada(char, f, n=N_ENTRADA):
    """Pop: crece desde los pies con rebote y estiramiento, termina en reposo."""
    t = f / (n - 1)
    s = back_out(t / 0.8)
    stretch = 0.12 * math.sin(math.pi * min(t / 0.6, 1)) * (1 - t)
    return pose_frame(char, s * (1 - stretch), s * (1 + stretch), rot=-8 * (1 - ease(t / 0.8)))


def salida(char, f, n=N_SALIDA):
    """Se agacha un poco (anticipación) y se encoge hacia los pies."""
    t = f / (n - 1)
    if t < 0.3:
        k = ease(t / 0.3)
        return pose_frame(char, 1 + 0.06 * k, 1 - 0.08 * k)
    k = (t - 0.3) / 0.7
    s = (1 - k) ** 2
    return pose_frame(char, (1.06 - 0.06 * k) * s, (0.92 + 0.3 * k) * s, rot=6 * k)


def idle(char, f, estilo, n=N_IDLE):
    p = 2 * math.pi * f / n
    if estilo == "brinca":
        h = abs(math.sin(p))  # dos brincos por ciclo
        squash = max(0.0, 0.25 - h) * 0.3
        return pose_frame(char, 1 + squash, 1 - squash + 0.02 * h, dy=-55 * h)
    if estilo == "tiembla":
        return pose_frame(char, 1 - 0.008 * math.sin(2 * p), 1 + 0.012 * math.sin(2 * p), dx=3 * math.sin(f * 2.3), rot=1.2 * math.sin(f * 1.7))
    if estilo == "encoge":  # encoge los hombros dos veces
        k = max(0.0, math.sin(2 * p)) ** 2
        return pose_frame(char, 1 + 0.02 * k, 1 - 0.03 * k, rot=1.5 * math.sin(p))
    return pose_frame(char, 1 - 0.008 * math.sin(2 * p), 1 + 0.014 * math.sin(2 * p), rot=1.2 * math.sin(p))


def frames(char, pose):
    return {
        "entrada": [entrada(char, f) for f in range(N_ENTRADA)],
        "idle": [idle(char, f, IDLE.get(pose, "respira")) for f in range(N_IDLE)],
        "salida": [salida(char, f) for f in range(N_SALIDA)],
    }


def encode(imgs, name, verde=True):
    tmp = OUT / f"_{name}"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    for i, im in enumerate(imgs):
        im.save(tmp / f"{i:04d}.png", compress_level=1)
    run = lambda *a: subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "%04d.png"), *a], check=True)
    run("-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "30", "-auto-alt-ref", "0", str(OUT / f"{name}.webm"))
    if verde:
        run("-f", "lavfi", "-i", f"color=c=0x00FF00:s={CANVAS[0]}x{CANVAS[1]}:r={FPS}",
            "-filter_complex", "[1][0]overlay=shortest=1,scale=540:-2,format=yuv420p", "-c:v", "libx264", "-crf", "18",
            str(OUT / f"{name}_pantalla_verde.mp4"))
    shutil.rmtree(tmp)


def procesar(pose):
    char = recortar(DIR / "poses" / f"{pose}.jpg")
    char = char.resize((round(char.width * CHAR_H / char.height), CHAR_H), Image.LANCZOS)
    assert char.width <= CANVAS[0], pose
    char.save(OUT / f"{pose}.png")
    clips = frames(char, pose)
    # autocomprobación: fondo transparente, entrada termina y la salida empieza en la pose de reposo
    reposo = np.asarray(pose_frame(char))
    assert reposo[5, 5, 3] == 0 and reposo[..., 3].max() == 255
    assert np.abs(np.asarray(clips["entrada"][-1]).astype(int) - reposo).mean() < 2
    for im in sum(clips.values(), []):  # ningún cuadro se sale del lienzo (arriba / lados)
        a = np.asarray(im)[..., 3]
        assert a[0].max() == 0 and a[:, 0].max() == 0 and a[:, -1].max() == 0, pose
    for clip, imgs in clips.items():
        encode(imgs, f"{pose}_{clip}")
    print("ok", pose, flush=True)
    return pose


def demo(poses):
    """Todas las poses encadenadas (entrada -> idle -> salida) sobre fondo azul, como en un video explicativo."""
    seq = []
    for pose in poses:
        char = Image.open(OUT / f"{pose}.png")
        c = frames(char, pose)
        seq += c["entrada"] + c["idle"] + c["salida"] + [Image.new("RGBA", CANVAS)] * 4
    bg = Image.new("RGBA", CANVAS, (31, 79, 163, 255))
    out = []
    for im in seq:
        b = bg.copy()
        b.alpha_composite(im)
        out.append(b)
    tmp = OUT / "_demo"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir()
    for i, im in enumerate(out):
        im.convert("RGB").save(tmp / f"{i:04d}.png", compress_level=1)
    src = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(tmp / "%04d.png")]
    subprocess.run(src + ["-vf", "scale=540:-2,format=yuv420p", "-c:v", "libx264", "-crf", "20", str(OUT / "demo.mp4")], check=True)
    subprocess.run(src + ["-filter_complex", "fps=15,scale=270:-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse", str(OUT / "demo.gif")], check=True)
    shutil.rmtree(tmp)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    poses = sys.argv[1:] or sorted(p.stem for p in (DIR / "poses").glob("*.jpg"))
    with Pool(4) as pool:
        pool.map(procesar, poses)
    demo(poses)
    print("ok demo")

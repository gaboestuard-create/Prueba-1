"""Efectos de caricatura (signos, estrellas, vena, gota...) dibujados con formas, sin fuentes.
Coordenadas del lienzo de animar.CANVAS; cada función recibe (canvas, ...) y dibuja encima."""
import math

from PIL import Image, ImageDraw

LIN = (22, 35, 80, 255)
ROJO, AMAR, BLANCO, CELESTE, ROSA = (230, 40, 40, 255), (255, 214, 10, 255), (255, 255, 255, 255), (120, 200, 255, 255), (255, 90, 140, 255)


def _hi(canvas, draw_fn, k=3):
    """Dibuja en capa k veces más grande y reduce: bordes suaves."""
    layer = Image.new("RGBA", (canvas.width * k, canvas.height * k), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer), k)
    canvas.alpha_composite(layer.resize(canvas.size, Image.LANCZOS))


def _rot(pts, c, a):
    ca, sa = math.cos(a), math.sin(a)
    return [(c[0] + (x - c[0]) * ca - (y - c[1]) * sa, c[1] + (x - c[0]) * sa + (y - c[1]) * ca) for x, y in pts]


def exclamacion(canvas, c, s=1.0, ang=0.0, col=ROJO):
    def f(d, k):
        w, h = 46 * s, 120 * s
        poly = _rot([(c[0] - w / 2, c[1] - h), (c[0] + w / 2, c[1] - h), (c[0] + w / 4, c[1] - 30 * s), (c[0] - w / 4, c[1] - 30 * s)], c, ang)
        dot = _rot([(c[0], c[1] - 4 * s)], c, ang)[0]
        r = 24 * s
        d.polygon([(x * k, y * k) for x, y in poly], fill=col, outline=LIN, width=int(7 * k))
        d.ellipse(((dot[0] - r) * k, (dot[1] - r) * k, (dot[0] + r) * k, (dot[1] + r) * k), fill=col, outline=LIN, width=int(7 * k))
    _hi(canvas, f)


def estrella(canvas, c, r=40, ang=0.0, col=AMAR):
    def f(d, k):
        pts = [(c[0] + (r if i % 2 == 0 else r * 0.45) * math.cos(ang + i * math.pi / 4 - math.pi / 2),
                c[1] + (r if i % 2 == 0 else r * 0.45) * math.sin(ang + i * math.pi / 4 - math.pi / 2)) for i in range(8)]
        d.polygon([(x * k, y * k) for x, y in pts], fill=col, outline=LIN, width=int(5 * k))
    _hi(canvas, f)


def corazon(canvas, c, r=34, col=ROSA):
    def f(d, k):
        x, y = c
        d.ellipse(((x - r) * k, (y - r) * k, x * k, (y + r * 0.2) * k), fill=col)
        d.ellipse((x * k, (y - r) * k, (x + r) * k, (y + r * 0.2) * k), fill=col)
        d.polygon([((x - r) * k, (y - r * 0.25) * k), ((x + r) * k, (y - r * 0.25) * k), (x * k, (y + r * 1.25) * k)], fill=col)
    _hi(canvas, f)


def vena(canvas, c, s=1.0):
    """Vena de enojo: cuatro arcos rojos en cruz."""
    def f(d, k):
        for a in (45, 135, 225, 315):
            a = math.radians(a)
            ox, oy = c[0] + 18 * s * math.cos(a), c[1] + 18 * s * math.sin(a)
            d.arc(((ox - 22 * s) * k, (oy - 22 * s) * k, (ox + 22 * s) * k, (oy + 22 * s) * k),
                  math.degrees(a) + 120, math.degrees(a) + 240, fill=ROJO, width=int(9 * s * k))
    _hi(canvas, f)


def gota(canvas, c, s=1.0):
    def f(d, k):
        x, y = c
        d.polygon([(x * k, (y - 46 * s) * k), ((x - 24 * s) * k, (y + 4 * s) * k), ((x + 24 * s) * k, (y + 4 * s) * k)], fill=CELESTE, outline=LIN, width=int(4 * k))
        d.ellipse(((x - 24 * s) * k, (y - 20 * s) * k, (x + 24 * s) * k, (y + 28 * s) * k), fill=CELESTE, outline=LIN, width=int(4 * k))
    _hi(canvas, f)


def humo(canvas, c, r=26, a=1.0):
    def f(d, k):
        col = (255, 255, 255, int(235 * a))
        for dx, dy, rr in ((0, 0, r), (r * 0.9, r * 0.2, r * 0.8), (-r * 0.9, r * 0.2, r * 0.7)):
            d.ellipse(((c[0] + dx - rr) * k, (c[1] + dy - rr) * k, (c[0] + dx + rr) * k, (c[1] + dy + rr) * k), fill=col)
    _hi(canvas, f)


def globo_pensar(canvas, c, n_puntos=3, w=250, h=150):
    """Nube de pensamiento con n_puntos (0-3) puntos suspensivos y 3 burbujas hacia la cabeza."""
    def f(d, k):
        x, y = c
        for dx, dy, rr in ((-w * .32, 0, h * .42), (0, -h * .12, h * .5), (w * .32, 0, h * .42), (-w * .1, h * .12, h * .4), (w * .15, h * .12, h * .4)):
            d.ellipse(((x + dx - rr) * k, (y + dy - rr) * k, (x + dx + rr) * k, (y + dy + rr) * k), fill=LIN)
        for dx, dy, rr in ((-w * .32, 0, h * .42 - 6), (0, -h * .12, h * .5 - 6), (w * .32, 0, h * .42 - 6), (-w * .1, h * .12, h * .4 - 6), (w * .15, h * .12, h * .4 - 6)):
            d.ellipse(((x + dx - rr) * k, (y + dy - rr) * k, (x + dx + rr) * k, (y + dy + rr) * k), fill=BLANCO)
        for i, (bx, by, br) in enumerate(((-w * .3, h * .78, 22), (-w * .42, h * 1.0, 14), (-w * .5, h * 1.16, 9))):
            d.ellipse(((x + bx - br - 4) * k, (y + by - br - 4) * k, (x + bx + br + 4) * k, (y + by + br + 4) * k), fill=LIN)
            d.ellipse(((x + bx - br) * k, (y + by - br) * k, (x + bx + br) * k, (y + by + br) * k), fill=BLANCO)
        for i in range(n_puntos):
            px = x + (i - 1) * 62
            d.ellipse(((px - 15) * k, (y - 15) * k, (px + 15) * k, (y + 15) * k), fill=LIN)
    _hi(canvas, f)


def pregunta(canvas, c, s=1.0, col=AMAR):
    """Signo de interrogación dibujado con arcos (sin fuentes)."""
    def f(d, k):
        x, y = c
        w = int(26 * s * k)
        for col_, ww in ((LIN, w + int(12 * k)), (col, w)):
            d.arc(((x - 50 * s) * k, (y - 110 * s) * k, (x + 50 * s) * k, (y - 20 * s) * k), 180, 400, fill=col_, width=ww)
            d.line([((x + 38 * s) * k, (y - 40 * s) * k), (x * k, (y - 5 * s) * k), (x * k, (y + 25 * s) * k)], fill=col_, width=ww, joint="curve")
        r = 20 * s
        d.ellipse(((x - r - 5) * k, (y + 62 * s - r - 5) * k, (x + r + 5) * k, (y + 62 * s + r + 5) * k), fill=LIN)
        d.ellipse(((x - r) * k, (y + 62 * s - r) * k, (x + r) * k, (y + 62 * s + r) * k), fill=col)
    _hi(canvas, f)

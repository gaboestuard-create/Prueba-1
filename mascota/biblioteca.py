"""Biblioteca de animaciones de la mascota (emociones). Uso: python3 mascota/biblioteca.py [nombre ...]
Cada clip es una función (f, n) -> imagen RGBA; todos están pensados para repetirse sin corte."""
import math
import sys

import animar as A
import efectos as E

TOP = A.TOP
P = lambda x, y: (x, y + TOP)  # coordenadas de la imagen original -> lienzo
sin, pi = math.sin, math.pi
clamp = lambda v, a=0.0, b=1.0: min(max(v, a), b)


def flotar(f, n, items, subida=260):
    """Dibuja partículas que suben y se desvanecen; items=[(dibujar, x, y, fase)]; dibujar(canvas, centro, escala)."""
    def fx(c):
        for dibujar, x, y, fase in items:
            t = (f / n + fase) % 1.0
            s = min(1.0, t * 5) * (1 - clamp((t - 0.7) / 0.3))  # aparece rápido, se encoge al final
            if s > 0.05:
                dibujar(c, P(x, y - subida * t), s)
    return fx


def sorprendido(f, n=75):
    t = f / n
    salto = ease_pulse(t, 0.08, 0.2, 0.75, 0.9)  # 0..1: sube de golpe, se sostiene, baja suave
    agacha = clamp(1 - abs(t - 0.04) / 0.05) * 0.06
    tem = 3 * sin(f * 2.2) * salto  # temblor
    pop = A.back_out(clamp((t - 0.12) / 0.12)) if t < 0.8 else clamp((0.9 - t) / 0.1)

    def fx(c):
        if pop > 0.02:
            E.exclamacion(c, P(950, 330), 1.6 * pop, 0.2)
            E.exclamacion(c, P(80, 360), 1.2 * pop, -0.25)
    return A.frame(head_rot=-9 * salto + tem, dy=-95 * salto, sx=1 - 0.03 * salto + agacha, sy=1 + 0.05 * salto - agacha,
                   arms=(22 * salto, 22 * salto), arm_d=(-60 * salto, -130 * salto), fx=fx)


def ease_pulse(t, a, b, c, d):
    """0 hasta a, sube a 1 en [a,b], 1 hasta c, baja a 0 en [c,d]."""
    if t < a or t > d:
        return 0.0
    if t < b:
        return A.ease((t - a) / (b - a))
    return 1.0 if t <= c else A.ease((d - t) / (d - c))


def alegre(f, n=60):
    p = 2 * pi * f / n
    rebote = abs(sin(p))  # dos saltitos por ciclo
    aire = rebote
    aplasta = clamp(0.25 - rebote) * 0.2
    corazones = [(E.corazon, 70 + 45 * i, 560 - 40 * i, i / 3) for i in range(3)] + [(E.estrella, 960 - 45 * i, 560 - 40 * i, i / 3 + 0.17) for i in range(3)]
    fx = flotar(f, n, [(lambda c, p_, s, d=d: d(c, p_, 40 * s) if d is E.estrella else d(c, p_, 34 * s), x, y, fa) for d, x, y, fa in corazones])
    return A.frame(head_rot=7 * sin(p), dy=-70 * aire, sx=1 + aplasta, sy=1 - aplasta + 0.03 * aire, blink=1.0 if rebote > 0.6 else 0.0,
                   arms=(0, 0), arm_d=(0, 40 * (1 - aire) - 40 * aire), fx=fx)


def molesto(f, n=60):
    p = 2 * pi * f / n
    pisa = max(0.0, sin(p * 2))
    sacude = sin(f * 1.5)
    pulso = 1 + 0.15 * sin(f * 0.8)

    def fx(c):
        E.vena(c, P(815, 215), 1.3 * pulso)
        for i in range(3):  # vapor que sale de los lados
            t = (f / n * 2 + i / 3) % 1
            E.humo(c, P(150 - 25 * t, 380 - 220 * t), 26 * (1 - t * 0.5), 1 - t)
            E.humo(c, P(900 + 25 * t, 380 - 220 * t), 26 * (1 - t * 0.5), 1 - t)
    return A.frame(head_rot=5 * sacude, sx=1 + 0.02 * pisa, sy=1 - 0.025 * pisa, arms=(42, 42), arm_d=(10, 95 + 10 * pisa), rubor=0.08 * pulso, fx=fx)


def pensativo(f, n=90):
    p = 2 * pi * f / n
    puntos = 1 + int(3 * f / n) % 3 if f / n < 0.9 else 3

    def fx(c):
        E.globo_pensar(c, P(830, 60), puntos)
        if 0.5 < f / n < 0.9:
            E.pregunta(c, P(120, 130), 0.9)
    return A.frame(head_rot=-5 + 3 * sin(p), hand_rot=-38 + 2 * sin(p), sx=1 - 0.005 * sin(p), sy=1 + 0.008 * sin(p),
                   blink=A.blink_curve(f, 62, 7), fx=fx)


def brazos_arriba(f, n=48):
    p = 2 * pi * f / n
    aire = abs(sin(p / 2)) ** 0.8
    aplasta = clamp(0.2 - aire) * 0.25
    est = [(E.estrella, 120, 360, 0.0), (E.estrella, 930, 330, 0.33), (E.estrella, 80, 640, 0.66), (E.estrella, 960, 610, 0.15)]
    fx = flotar(f, n, [(lambda c, p_, s, d=d: d(c, p_, 44 * s), x, y, fa) for d, x, y, fa in est], subida=120)
    return A.frame(head_rot=-4 * sin(p / 2 + 1), dy=-120 * aire, sx=1 + aplasta, sy=1 - aplasta + 0.04 * aire, blink=1.0 if aire > 0.85 else 0.0,
                   arms=(22 * aire, 22 * aire), arm_d=(-62 * aire, -155 * aire), fx=fx)


def aprobado(f, n=45):
    p = 2 * pi * f / n
    pump = max(0.0, sin(p))
    return A.frame(head_rot=3 * sin(p), dy=-20 * pump, arms=(-3 * pump, -3 * pump), arm_d=(0, -30 * pump), blink=A.blink_curve(f, 30, 5))


NUEVOS = {"sorprendido": (sorprendido, 75), "alegre": (alegre, 60), "molesto": (molesto, 60), "pensativo": (pensativo, 90),
          "brazos_arriba": (brazos_arriba, 48), "aprobado": (aprobado, 45)}

if __name__ == "__main__":
    A.OUT.mkdir(exist_ok=True)
    for name in sys.argv[1:] or NUEVOS:
        fn, n = NUEVOS[name]
        A.export(name, fn, n)
        print("ok", name)

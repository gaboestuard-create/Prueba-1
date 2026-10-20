# Genera musica.wav (60 s): música original sintetizada, sin derechos de autor.
import wave
import numpy as np

SR, DUR = 44100, 60.0
out = np.zeros(int(SR * DUR))
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def hz(n):  # "A4" -> 440
    return 440 * 2 ** ((NOTE[n[:-1]] + 12 * (int(n[-1]) + 1) - 69) / 12)


def tone(t0, dur, note, vol, kind='tri'):
    n = int(dur * SR); tt = np.arange(n) / SR
    ph = (hz(note) * tt) % 1
    w = {'tri': 4 * np.abs(ph - .5) - 1, 'sq': np.where(ph < .5, 1, -1) * .6, 'sin': np.sin(2 * np.pi * ph)}[kind]
    env = np.minimum(1, tt / .01) * np.exp(-tt * (2.5 if kind != 'sin' else 1))
    i = int(t0 * SR); out[i:i + n] += (w * env * vol)[:len(out) - i]


def noise(t0, dur, vol):
    n = int(dur * SR); i = int(t0 * SR)
    out[i:i + n] += (np.random.default_rng(i).uniform(-1, 1, n) * np.exp(-np.arange(n) / SR * 30) * vol)[:len(out) - i]


# 0-16 s: arpegio lento en La menor (aislamiento)
for bar, ch in enumerate(['A3 C4 E4', 'F3 A3 C4', 'C3 E3 G3', 'G3 B3 D4'] * 2):
    for k, n in enumerate(ch.split() * 2):
        tone(1 + bar * 2 + k * .333, 1.2, n, .12, 'sin')
# notificaciones en la escena de la casa
for t in [8.6, 9.4, 10.2, 11.0, 12.2, 13.1, 14.0]:
    tone(t, .15, 'E6', .08, 'sin'); tone(t + .08, .2, 'B6', .06, 'sin')
# 16.6 s: descubrimiento (arpegio mágico ascendente)
for k, n in enumerate(['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7']):
    tone(16.6 + k * .09, 1.5, n, .1, 'sin')
# 20-53 s: chiptune alegre en Do mayor, 140 bpm
b = 60 / 140
mel = 'E5 G5 A5 G5 E5 C5 D5 E5 G5 E5 D5 C5 A4 C5 D5 C5'.split()
prog = ['C3', 'A2', 'F2', 'G2']
t, i = 20.0, 0
while t < 53:
    vol = .06 if t < 23 else .09
    tone(t, b * .9, mel[i % 16], vol, 'sq')
    if i % 4 == 0:
        bass = prog[(i // 4) % 4]
        for k in range(4): tone(t + k * b, b * .8, bass, .12, 'tri')
    if t > 23: noise(t, .08, .05 if i % 2 else .1)
    t += b; i += 1
# 42 s: fanfarria de meta
for k, n in enumerate(['C5', 'E5', 'G5', 'C6']): tone(42 + k * .15, .6, n, .1, 'sq')
# 53-60 s: cierre cálido
for n in ['C4', 'E4', 'G4', 'C5']: tone(53.2, 6, n, .1, 'sin')
for k, n in enumerate(['G5', 'E5', 'C6']): tone(55 + k * .6, 2, n, .08, 'sin')

fade = np.ones_like(out); fade[-SR:] = np.linspace(1, 0, SR)
out = np.clip(out * fade / max(1, np.abs(out).max() / .9), -1, 1)
with wave.open('musica.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((out * 32767).astype(np.int16).tobytes())

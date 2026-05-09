#!/usr/bin/env python3
# Arcade-feel SFX synthesiser. Stdlib only (math + wave + struct) so
# it runs anywhere Python is installed. Each patch layers FM synthesis
# (bell/metal tones), attack transients (noise clicks), and pitch
# envelopes to land on sounds that read as "fun, juicy, addictive"
# instead of pure sine tones.

import math
import os
import struct
import wave

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "artifacts", "slamgoal", "assets", "sfx")


# ─── helpers ─────────────────────────────────────────────────────────

def save(name, samples):
    path = os.path.join(OUT, f"{name}.wav")
    peak = max(1e-9, max(abs(s) for s in samples))
    scale = 0.92 / peak
    frames = bytearray()
    for s in samples:
        v = int(max(-1.0, min(1.0, s * scale)) * 32767)
        frames += struct.pack("<h", v)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(frames))
    size = os.path.getsize(path)
    print(f"{name}.wav  {len(samples)/SR*1000:4.0f} ms  {size/1024:4.1f} KB")


def env_ar(n, attack_ms=3.0, release_ms=140.0):
    """Attack-release envelope with exponential decay. Core of punchy
    short SFX — fast rise, slow tapered tail."""
    atk = max(1, int(SR * attack_ms / 1000))
    tau = max(1, int(SR * release_ms / 1000))
    out = [0.0] * n
    for i in range(n):
        if i < atk:
            out[i] = i / atk
        else:
            out[i] = math.exp(-(i - atk) / tau)
    return out


def env_adsr(n, a_ms=4, d_ms=20, s_lvl=0.6, r_ms=140):
    """Full ADSR. Sustain level s_lvl ∈ [0,1]."""
    a = max(1, int(SR * a_ms / 1000))
    d = max(1, int(SR * d_ms / 1000))
    r = max(1, int(SR * r_ms / 1000))
    sus_n = max(0, n - a - d - r)
    out = [0.0] * n
    idx = 0
    for i in range(a):
        out[idx] = i / a
        idx += 1
    for i in range(d):
        if idx >= n: break
        out[idx] = 1 - (1 - s_lvl) * (i / d)
        idx += 1
    for _ in range(sus_n):
        if idx >= n: break
        out[idx] = s_lvl
        idx += 1
    for i in range(r):
        if idx >= n: break
        out[idx] = s_lvl * math.exp(-3 * i / r)
        idx += 1
    return out


def pitch_glide(start_hz, end_hz, n, curve=1.0):
    """Per-sample frequency array following an exponential glide
    whose shape is tuned by `curve`. curve>1 = snappy drop, curve<1
    = gentle slide."""
    out = [0.0] * n
    for i in range(n):
        t = (i / max(1, n - 1)) ** curve
        out[i] = start_hz * ((end_hz / start_hz) ** t)
    return out


def fm(freqs, mod_ratio, mod_index, env_amp, env_mod=None):
    """2-op FM synth. `freqs` is a per-sample carrier frequency array;
    `mod_ratio` scales modulator relative to carrier; `mod_index` is
    the bell-brightness. env_amp controls amplitude, env_mod scales
    the modulator depth over time (defaults to env_amp → classic
    bell timbre where brightness decays with amplitude)."""
    n = len(freqs)
    if env_mod is None:
        env_mod = env_amp
    out = [0.0] * n
    car_phase = 0.0
    mod_phase = 0.0
    dt = 1 / SR
    for i in range(n):
        f_c = freqs[i]
        f_m = f_c * mod_ratio
        mod = math.sin(mod_phase)
        mod_phase += 2 * math.pi * f_m * dt
        car_phase += 2 * math.pi * f_c * dt + mod_index * env_mod[i] * mod
        out[i] = env_amp[i] * math.sin(car_phase)
    return out


def sine(freq, n, env_amp, detune_hz=0):
    """Plain sine partial. `freq` can be scalar or a per-sample array."""
    out = [0.0] * n
    phase = 0.0
    dt = 1 / SR
    for i in range(n):
        f = (freq[i] if isinstance(freq, list) else freq) + detune_hz
        phase += 2 * math.pi * f * dt
        out[i] = env_amp[i] * math.sin(phase)
    return out


def noise_click(dur_ms=4, peak=0.9):
    """Very short white-noise burst — the psycho-acoustic "attack
    transient" that makes a sound feel percussive / real."""
    n = int(SR * dur_ms / 1000)
    state = 0xBEEF
    out = [0.0] * n
    for i in range(n):
        state = (1103515245 * state + 12345) & 0x7FFFFFFF
        r = (state / 0x7FFFFFFF) * 2 - 1
        fade = 1 - (i / max(1, n - 1))
        out[i] = r * fade * peak
    return out


def noise_lp(dur_ms, cutoff_ratio=0.15, env_amp=None):
    """Lo-pass filtered noise (1-pole IIR). Fat hissy layer — used
    for shake/explosion rumble. cutoff_ratio ∈ (0,1) controls brightness."""
    n = int(SR * dur_ms / 1000)
    if env_amp is None:
        env_amp = env_ar(n, 4, 180)
    state = 0xCAFE
    a = cutoff_ratio
    y = 0.0
    out = [0.0] * n
    for i in range(n):
        state = (1103515245 * state + 12345) & 0x7FFFFFFF
        r = (state / 0x7FFFFFFF) * 2 - 1
        y = y + a * (r - y)
        out[i] = env_amp[i] * y
    return out


def mix(*layers):
    n = max(len(l) for l in layers)
    out = [0.0] * n
    for l in layers:
        for i, v in enumerate(l):
            out[i] += v
    peak = max(1e-9, max(abs(s) for s in out))
    if peak > 1:
        out = [s / peak for s in out]
    return out


def concat(*layers):
    out = []
    for l in layers:
        out.extend(l)
    return out


def pad_silence(samples, lead_ms=0, tail_ms=0):
    lead = [0.0] * int(SR * lead_ms / 1000)
    tail = [0.0] * int(SR * tail_ms / 1000)
    return lead + list(samples) + tail


# ─── per-event patches ───────────────────────────────────────────────
#
# General philosophy: each patch is a layered composition —
#   • noise_click attack transient for percussive "hit" feel
#   • FM tone for pitched body (bell/metallic timbre > pure sine)
#   • optional pitch glide for rising/falling interest
#   • short release so rapid-fire events don't smear
# Total duration stays ≤ 400 ms for most events; only goat + gameOver
# get longer tails because they're one-shots the player anticipates.

os.makedirs(OUT, exist_ok=True)

# ── drop ─────────────────────────────────────────────────────────
#   Water-drop plink. Quick pitch drop from 900 → 520 Hz over 110 ms
#   gives the classic "blip" shape. FM ratio 2.0 for a slightly bright
#   metallic body.
n = int(SR * 140 / 1000)
freqs = pitch_glide(900, 520, n, curve=2.2)
amp = env_ar(n, 3, 110)
save("drop", mix(
    noise_click(6, peak=0.6),
    fm(freqs, mod_ratio=2.0, mod_index=5.0, env_amp=amp),
))

# ── merge ────────────────────────────────────────────────────────
#   Signature arcade "ding". Two FM bells a major 3rd apart (E5 + G#5),
#   both gliding UP a whole step over 180 ms. Noise click attack. The
#   upward glide + bell timbre is the "addictive" feedback — same
#   trick the Suika game uses.
n = int(SR * 220 / 1000)
f_high = pitch_glide(784, 988, n, curve=0.55)
f_mid = pitch_glide(659, 784, n, curve=0.55)
amp = env_ar(n, 2, 170)
save("merge", mix(
    noise_click(5, peak=0.5),
    fm(f_high, mod_ratio=3.0, mod_index=4.5, env_amp=amp),
    fm(f_mid, mod_ratio=2.0, mod_index=3.8, env_amp=amp),
))

# ── mergeBig ─────────────────────────────────────────────────────
#   Chunkier version for tier 7+ merges. Major triad of FM bells +
#   shimmery octave on top. 320 ms with a tail so big merges feel
#   like an event.
n = int(SR * 340 / 1000)
amp = env_ar(n, 2, 260)
amp_shimmer = env_ar(n, 40, 200)
f1 = pitch_glide(523, 659, n, curve=0.5)
f2 = pitch_glide(659, 784, n, curve=0.5)
f3 = pitch_glide(784, 988, n, curve=0.5)
f_shim = pitch_glide(1568, 1976, n, curve=0.5)
save("mergeBig", mix(
    noise_click(8, peak=0.55),
    fm(f1, mod_ratio=2.0, mod_index=4.0, env_amp=amp),
    fm(f2, mod_ratio=2.0, mod_index=4.2, env_amp=amp),
    fm(f3, mod_ratio=3.0, mod_index=4.8, env_amp=amp),
    fm(f_shim, mod_ratio=5.0, mod_index=2.2, env_amp=amp_shimmer),
))

# ── bomb ────────────────────────────────────────────────────────
#   Layered explosion. Sub-bass rumble (120 → 40 Hz) + mid body (580 →
#   90 Hz) + bright noise burst. Total 380 ms with a heavy tail.
n = int(SR * 400 / 1000)
amp_long = env_ar(n, 2, 300)
amp_short = env_ar(n, 1, 180)
sub_freqs = pitch_glide(120, 40, n, curve=2.5)
body_freqs = pitch_glide(580, 90, n, curve=2.0)
save("bomb", mix(
    noise_click(12, peak=0.9),
    sine(sub_freqs, n, amp_long),
    fm(body_freqs, mod_ratio=0.5, mod_index=6.0, env_amp=amp_long),
    noise_lp(400, cutoff_ratio=0.4, env_amp=env_ar(n, 2, 160)),
))

# ── shake ────────────────────────────────────────────────────────
#   Rattle with tremolo — noise burst with an amplitude modulation
#   at ~12 Hz simulates a fast shake, + a sub-thump low end so it
#   feels weighty. 560 ms.
n = int(SR * 560 / 1000)
amp_noise = env_ar(n, 5, 420)
# Apply tremolo on top: (1 + 0.45*sin(2π*12Hz*t)) * amp
for i in range(n):
    t = i / SR
    amp_noise[i] *= 0.55 + 0.45 * math.sin(2 * math.pi * 12 * t)
thump_freqs = pitch_glide(95, 70, n, curve=1.5)
save("shake", mix(
    noise_lp(560, cutoff_ratio=0.55, env_amp=amp_noise),
    sine(thump_freqs, n, env_ar(n, 5, 300)),
))

# ── swap ────────────────────────────────────────────────────────
#   Two FM "whoosh" sweeps crossing — one ascending, one descending —
#   with a click at the midpoint. Reads as "exchange positions".
n = int(SR * 200 / 1000)
up = pitch_glide(440, 1320, n, curve=0.8)
down = pitch_glide(1320, 440, n, curve=0.8)
amp = env_ar(n, 3, 160)
click_point = pad_silence(noise_click(6, peak=0.5), lead_ms=90)
save("swap", mix(
    fm(up, mod_ratio=1.5, mod_index=3.0, env_amp=amp),
    fm(down, mod_ratio=1.5, mod_index=3.0, env_amp=amp),
    click_point,
))

# ── magnet ───────────────────────────────────────────────────────
#   Warm pad with a slow vibrato — the "field is on" sound. Slightly
#   detuned triad (root + fifth + octave) for a chorus-y width.
n = int(SR * 450 / 1000)
amp = env_adsr(n, a_ms=30, d_ms=80, s_lvl=0.75, r_ms=220)
vib_amp = [1.0] * n
for i in range(n):
    t = i / SR
    vib_amp[i] = 1 + 0.018 * math.sin(2 * math.pi * 5.5 * t)
root = [196 * v for v in vib_amp]
fifth = [294 * v for v in vib_amp]
oct_high = [392 * v for v in vib_amp]
save("magnet", mix(
    fm(root, mod_ratio=1.0, mod_index=1.8, env_amp=amp),
    fm(fifth, mod_ratio=1.0, mod_index=1.6, env_amp=amp),
    sine(oct_high, n, amp, detune_hz=1.2),
))

# ── goat ────────────────────────────────────────────────────────
#   Full triumph fanfare when the player reaches the G.O.A.T. tier.
#   Ascending C major arpeggio (C-E-G-C) with each note a bell tone,
#   then a sustained high octave with vibrato. ~900 ms.
notes = [523, 659, 784, 1047]
note_ms = 140
final_ms = 400
parts = []
for hz in notes:
    n = int(SR * note_ms / 1000)
    amp = env_ar(n, 3, 120)
    parts.append(mix(
        noise_click(3, peak=0.3),
        fm([hz] * n, mod_ratio=3.0, mod_index=3.6, env_amp=amp),
    ))
# Final sustained note with slow vibrato
n_final = int(SR * final_ms / 1000)
vib = [1047 * (1 + 0.012 * math.sin(2 * math.pi * 5 * i / SR)) for i in range(n_final)]
amp_final = env_adsr(n_final, a_ms=4, d_ms=20, s_lvl=0.85, r_ms=320)
parts.append(mix(
    fm(vib, mod_ratio=2.0, mod_index=3.0, env_amp=amp_final),
    sine([2093] * n_final, n_final, env_ar(n_final, 40, 300), detune_hz=1.5),
))
save("goat", concat(*parts))

# ── gameOver ────────────────────────────────────────────────────
#   Classic "wah-wah-waaah" descending — three notes stepping down a
#   minor 3rd each time, last note held longer with a vibrato sigh.
notes_go = [(392, 220), (330, 220), (262, 500)]
parts = []
for i, (hz, ms) in enumerate(notes_go):
    n = int(SR * ms / 1000)
    if i == len(notes_go) - 1:
        # Final note — add vibrato that widens over the sustain
        vib = [hz * (1 + 0.02 * math.sin(2 * math.pi * 5 * j / SR) * (j / n))
               for j in range(n)]
        amp = env_adsr(n, a_ms=10, d_ms=30, s_lvl=0.75, r_ms=380)
        parts.append(mix(
            fm(vib, mod_ratio=1.5, mod_index=2.8, env_amp=amp),
            sine(vib, n, env_ar(n, 10, 340), detune_hz=-1.0),
        ))
    else:
        amp = env_ar(n, 4, ms * 0.8)
        parts.append(fm([hz] * n, mod_ratio=1.5, mod_index=2.5, env_amp=amp))
save("gameOver", concat(*parts))

# ── shopPurchase ────────────────────────────────────────────────
#   Cha-ching. Two-note up a 5th (E6 → B6) with a sparkly shimmer
#   octave above the second note. Very short, bright, satisfying.
n1 = int(SR * 90 / 1000)
n2 = int(SR * 240 / 1000)
amp1 = env_ar(n1, 2, 70)
amp2 = env_ar(n2, 2, 190)
amp_shim = env_ar(n2, 30, 160)
save("shopPurchase", concat(
    mix(
        noise_click(4, peak=0.4),
        fm([1319] * n1, mod_ratio=3.0, mod_index=4.0, env_amp=amp1),
    ),
    mix(
        fm([1976] * n2, mod_ratio=3.0, mod_index=4.2, env_amp=amp2),
        sine([3951] * n2, n2, amp_shim, detune_hz=2),
    ),
))

print("\nDone.")

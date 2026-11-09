import { rng } from './palette'

// The coast road, laid out once from a seed: long straights where we open up, single bends,
// S-bends and runs of tight curves where we brake, and climbs and descents along the cliff.
// Everything is a table of curvature and grade along one loop; positions wrap round it.

const DS = .5

type Built = { k: Float32Array; heading: Float32Array; grade: Float32Array; loop: number; sBends: { s: number; right: boolean }[] }

function build(): Built {
  const r = rng(911)
  const bends: { from: number; len: number; k: number }[] = []
  const sBends: { s: number; right: boolean }[] = []
  let at = 60
  let dir = 1
  const target = 3600
  const curve = (len: number, k: number) => { bends.push({ from: at, len, k }); at += len }
  while (at < target - 300) {
    const roll = r()
    if (roll < .34) {
      // A long straight along the cliff.
      at += 160 + r() * 220
    } else if (roll < .6) {
      // One bend, gentle or tight; the next one usually goes the other way.
      dir = r() < .7 ? -dir : dir
      const len = 34 + r() * 46
      curve(len, dir * (1.05 + r() * .35) / len)
      at += 40 + r() * 60
    } else if (roll < .82) {
      // An S: two bends close together, announced by a warning sign.
      dir = r() < .5 ? -dir : dir
      sBends.push({ s: at - 70, right: dir > 0 })
      const len = 30 + r() * 12
      curve(len, dir * 1.05 / len)
      at += 6
      curve(len, -dir * 1.05 / len)
      at += 60 + r() * 60
    } else {
      // A run of tight curves, one after another.
      dir = r() < .5 ? -dir : dir
      sBends.push({ s: at - 70, right: dir > 0 })
      const n = 3 + Math.floor(r() * 2)
      for (let j = 0; j < n; j++) { const len = 24 + r() * 10; curve(len, (j % 2 ? -dir : dir) * .95 / len); at += 4 }
      at += 70 + r() * 60
    }
  }
  const loop = Math.ceil(Math.max(at + 120, target) / DS) * DS
  const n = loop / DS
  const k = new Float32Array(n)
  for (const b of bends) {
    // Eased in and out: the bend tightens, holds, and opens again.
    for (let i = Math.floor(b.from / DS); i < (b.from + b.len) / DS; i++) {
      const t = (i * DS - b.from) / b.len
      k[i % n] += b.k * Math.sin(Math.PI * t) ** 2 * 2
    }
  }
  // Heading along the loop; take out its slow drift so the road keeps returning to the coast's line.
  const heading = new Float32Array(n)
  for (let i = 1; i < n; i++) heading[i] = heading[i - 1] + k[i - 1] * DS
  const drift = (heading[n - 1] + k[n - 1] * DS) / n
  for (let i = 0; i < n; i++) heading[i] -= drift * i
  const window = Math.round(500 / DS)
  const avg = circularMean(heading, window)
  for (let i = 0; i < n; i++) heading[i] -= avg[i]
  for (let i = 0; i < n; i++) k[i] = (heading[(i + 1) % n] - heading[(i - 1 + n) % n]) / (2 * DS)

  // Grade: flats, climbs and descents, eased.
  const raw = new Float32Array(n)
  let g = 0, s = 0
  while (s < loop) {
    const roll = r()
    const len = roll < .4 ? 150 + r() * 250 : 110 + r() * 160
    g = roll < .4 ? 0 : (g > 0 ? -1 : g < 0 ? 1 : r() < .5 ? 1 : -1) * (.04 + r() * .045)
    for (let i = Math.floor(s / DS); i < Math.min(n, (s + len) / DS); i++) raw[i] = g
    s += len
  }
  const grade = circularMean(raw, Math.round(70 / DS))
  let mean = 0
  for (let i = 0; i < n; i++) mean += grade[i]
  mean /= n
  for (let i = 0; i < n; i++) grade[i] -= mean
  return { k, heading, grade, loop, sBends }
}

function circularMean(a: Float32Array, window: number) {
  const n = a.length
  const out = new Float32Array(n)
  let sum = 0
  const half = Math.floor(window / 2)
  for (let j = -half; j <= half; j++) sum += a[(j + n) % n]
  for (let i = 0; i < n; i++) {
    out[i] = sum / (2 * half + 1)
    sum += a[(i + half + 1) % n] - a[(i - half + n) % n]
  }
  return out
}

const T = build()
export const LOOP = T.loop
export const S_BENDS = T.sBends

function sample(a: Float32Array, s: number) {
  const n = a.length
  const x = (((s / DS) % n) + n) % n
  const i = Math.floor(x)
  const f = x - i
  return a[i] * (1 - f) + a[(i + 1) % n] * f
}

/** How sharply the road turns at `s`: positive to the right. */
export const curvature = (s: number) => sample(T.k, s)
/** The road's direction at `s`, as a small-angle slope across. */
export const heading = (s: number) => sample(T.heading, s)
/** Uphill positive. */
export const grade = (s: number) => sample(T.grade, s)
let peak = 0
for (const v of T.k) peak = Math.max(peak, Math.abs(v))
/** The tightest bend on the loop. */
export const C_MAX = peak

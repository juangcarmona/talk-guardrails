// Road signage on a mountain pass. Spanish signs give the code: blue tells you
// what to do (soft), red forbids (hard), amber is retroreflective attention.

export const color = {
  paint: '#eef0f2',
  soft: '#5b8cff',
  chevron: '#1f5fd6',
  hard: '#f2384f',
  amber: '#ffb21c',
  steel: '#8b929c',
  asphalt: '#59606b',
  rock: '#6a5f73',
  scree: '#4a5263',
  star: '#c9d2e2',
  leaf: '#5b7340',
  leafDark: '#33452a',
  pine: '#2c3d2a',
  /** Loose stone on an unmade road: pale chips and darker pebbles. */
  gravel: '#b49c80',
  pebble: '#7a6a58',
} as const

// Sky and land at sunset (0) and at night (1); the talk walks from one to the other.
export const sky = {
  top: ['#1d2b4f', '#04060b'],
  mid: ['#5b3d6b', '#070b16'],
  horizon: ['#f08a4b', '#0f1626'],
  sun: ['#ffb36b', '#0f1626'],
  /** The sun's disc: white-gold high up, deep orange as it touches the sea. */
  disc: ['#fff4d6', '#ff7a3a'],
  ridgeFar: ['#3b2c4a', '#0b0f19'],
  ridgeNear: ['#22192c', '#07090f'],
  ground: ['#16121a', '#06070a'],
  // The sea four hundred metres down: the sky's glow near the horizon, deep blue below.
  seaFar: ['#b7735e', '#0c1424'],
  seaNear: ['#1f2a48', '#03050b'],
  // The cliff face: warm rock catching the sunset at the top, blue haze further down.
  cliffTop: ['#4e3c40', '#101116'],
  cliffMid: ['#3a3446', '#0a0c12'],
  cliffLow: ['#2a3150', '#05070c'],
  wall: ['#3a2d33', '#0c0d11'],
  road: ['#24222b', '#101116'],
  /** An unmade track: dusty, warmer and paler than asphalt. */
  track: ['#4a3f37', '#16140f'],
} as const

/** Mix two #rrggbb colours, as #rrggbb. */
export function mix(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1), 16)
  const y = parseInt(b.slice(1), 16)
  const ch = (shift: number) => Math.round(((x >> shift) & 255) * (1 - t) + ((y >> shift) & 255) * t)
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')
}

/** Mix a sunset/night pair. */
export function blend(pair: readonly [string, string], t: number) {
  return mix(pair[0], pair[1], Math.min(1, Math.max(0, t)))
}

/** Deterministic random numbers, so the road is the same on every load. */
export function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

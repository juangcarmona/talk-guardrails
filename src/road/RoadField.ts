// The recurring piece: a mountain pass drawn in glyphs, seen from the driver's seat.
// Painted lines and the blue curve chevrons are the soft guardrails (they tell you,
// you can still go over them); the red and white barrier between the road and the
// ravine is the hard one (it stops you). The talk starts at sunset and ends at night.
// Each scene names a form and a light; the field eases from one to the next.

import { blend, color, mix as tone, rng, sky } from './palette'
import { FORMS, type Cue, type Form, type FormName } from './forms'
import { C_MAX, LOOP, S_BENDS, curvature, grade, heading } from './track'

const GLYPHS = ['.', ':', '-', '=', '+', 'x', '*', '#', '@', '|', '^', '>', '<', '%', '&'] as const
type Glyph = (typeof GLYPHS)[number]

const W = 1920
const H = 1080
const VPX = 1220
const HORIZON = 500
const FOCAL = 760
const CAM_H = 1.6
const Z_MIN = 2
const LENGTH = 90
const ROW = 0.011
const EASE_MS = 1400
/** The road on screen is a model of the real one: 1 m of it stands for this many metres of driving. */
const WORLD = .4
const TOP_KMH = 290
/** Braking, in m/s², and the speed each gear tops out at, in km/h. */
const BRAKE = 8.5
/** The braking we plan for, kept below what the car can do so there is always some left. */
const PLAN = 6.5
const GEAR_TOP = [68, 108, 148, 188, 228, 268, 310]

// Lateral positions across the road, in metres from the camera. We drive on the
// right, as in Spain: the mountain wall on the left, the ravine on our right.
// Narrow mountain shoulders: a hand's width of gravel at the foot of the cut, a step between the line and the barrier.
export const ROAD = { leftEdge: -4.8, centre: -1.3, rightEdge: 2.15, rail: 2.4 }
/** The lip of the drop, just past the barrier posts. */
const LIP = .25

// The road's line and rise come from the track tables (src/road/track.ts).
/** 0 on the sharpest bends, 1 on the straights: where a barrier is needed first. */
const calm = (s: number) => 1 - Math.abs(curvature(s)) / C_MAX

// Narrowings: every so often a rockfall has taken two metres of the oncoming lane.
const PINCH_PERIOD = 170
const PINCH_AT = 125
const PINCH_WIDTH = 2
/** 1 in the middle of a narrowing, 0 on the open road. */
function pinch(s: number) {
  const d = (((s - PINCH_AT) % PINCH_PERIOD) + PINCH_PERIOD) % PINCH_PERIOD
  return Math.exp(-((Math.min(d, PINCH_PERIOD - d) / 11) ** 2))
}
const leftEdge = (s: number) => ROAD.leftEdge + PINCH_WIDTH * pinch(s)
const centre = (s: number) => (leftEdge(s) + ROAD.rightEdge) / 2

type View = { s0: number; heading: number; slope: number; bend: Float32Array; rise: Float32Array }

/** The road ahead from `s0`: how far it drifts across and rises, relative to where we point, every half metre. */
const VIEW_DZ = .5
function view(s0: number): View {
  const n = Math.ceil((LENGTH + 40) / VIEW_DZ)
  const bend = new Float32Array(n + 1), rise = new Float32Array(n + 1)
  const h0 = heading(s0), g0 = grade(s0)
  let ph = 0, pg = 0
  for (let j = 1; j <= n; j++) {
    const s = s0 + j * VIEW_DZ
    const dh = heading(s) - h0, dg = grade(s) - g0
    bend[j] = bend[j - 1] + (ph + dh) / 2 * VIEW_DZ
    rise[j] = rise[j - 1] + (pg + dg) / 2 * VIEW_DZ
    ph = dh; pg = dg
  }
  return { s0, heading: h0, slope: g0, bend, rise }
}
function along(a: Float32Array, z: number) {
  const x = Math.max(0, z / VIEW_DZ)
  const i = Math.floor(x)
  if (i >= a.length - 1) return a[a.length - 1] + (a[a.length - 1] - a[a.length - 2]) * (x - a.length + 1)
  return a[i] + (a[i + 1] - a[i]) * (x - i)
}

// When the lorry comes through, we flinch: 0 normally, 1 with our wheels on the edge of the drop.
let swerve = 0
/** How far the lorry leans towards us as it passes (negative: towards the wall). */
let drift = 0
/** This pass is a close one: with protection there, we hit it. */
let extreme = false
const SWERVE_U = 2.25

/** Where the road camera sits across the road and how far it has turned (small angles): for the lay-by. */
let camU = 0
let camYaw = 0
/** A free camera for the opening and closing shots: position on the road's own axes and heading (radians, 0 down the road, π/2 out to sea). */
export type Cine = { x: number; y: number; z: number; yaw: number }
let cine: Cine | null = null

/** A point on the road's own axes (`x` across including the bends, `z` ahead, `h` up) to sheet pixels. */
function toScreen(v: View, x: number, z: number, h: number) {
  if (cine) {
    const dx = x - cine.x, dz = z - cine.z, sn = Math.sin(cine.yaw), cs = Math.cos(cine.yaw)
    const d = dx * sn + dz * cs
    const k = FOCAL / Math.max(d, .05)
    return { x: VPX + (dx * cs - dz * sn) * k, y: HORIZON - (h + along(v.rise, z) - cine.y) * k, k, d }
  }
  const k = FOCAL / z
  // Pulling right also points the nose a little towards the edge, more so far ahead.
  const cam = SWERVE_U * swerve * Math.min(1, 6 / z + .35)
  return { x: VPX + (x - cam - camU - camYaw * z) * k, y: HORIZON + (CAM_H - h - along(v.rise, z)) * k, k, d: z }
}

/** A point `z` metres ahead, `u` across, `h` up, to sheet pixels, following the bends. */
function project(v: View, u: number, z: number, h: number) {
  return toScreen(v, u + along(v.bend, z), z, h)
}

/** How much the moon, behind us, lights the scene: nothing at sunset, a little at full night. */
const moonOf = (dusk: number) => smooth((dusk - .45) / .45)
const smooth = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c) }
/** How hard we pull away from the lorry, from its signed distance (negative once it has gone by). */
function flinch(d: number) {
  if (d > 34) return 0
  if (d > 7) return smooth((34 - d) / 27)
  if (d > -4) return 1
  return 1 - smooth((-4 - d) / 40)
}

// The cut on our left: how far back its top sits and how high it stands.
const WALL_BACK = 4.6
const WALL_H = 10

type Particle = { s: number; u: number; h: number; glyph: Glyph; jitter: number; tint: string; scale?: number; road?: boolean; loose?: boolean }

function build(): Particle[] {
  const r = rng(20261106)
  const out: Particle[] = []
  const pick = (glyphs: Glyph[]) => glyphs[Math.floor(r() * glyphs.length)]
  // Asphalt grain.
  for (let i = 0; i < 1400; i++) out.push({ s: r() * LENGTH, u: ROAD.leftEdge + r() * (ROAD.rail - ROAD.leftEdge), h: 0, glyph: pick(['.', '.', ':']), jitter: r(), tint: color.asphalt, road: true })
  // Loose stone, only on the unmade track at the start: denser, paler, with ruts where wheels have gone.
  for (let i = 0; i < 3200; i++) {
    const rut = r() < .45
    const u = rut ? [-3.6, -2.2, -.4, 1.0][Math.floor(r() * 4)] + (r() - .5) * .5 : ROAD.leftEdge + r() * (ROAD.rail - ROAD.leftEdge)
    out.push({ s: r() * LENGTH, u, h: 0, glyph: rut ? pick(['.', '-', '.']) : pick(['.', ':', '.', '*', 'x']), jitter: r(), tint: rut ? color.pebble : r() < .6 ? color.gravel : color.pebble, road: true, loose: true })
  }
  // Shrubs: a cluster of leaf glyphs. Clinging to the cliff edge, on top of the cut and at its foot.
  const bush = (s: number, u: number, h: number, size: number) => {
    for (let j = 0; j < 7 + size * 8; j++) out.push({ s: s + (r() - .5) * size, u: u + (r() - .5) * size, h: h + r() * size * .8, glyph: pick(['#', '@', '%', '&', '*']), jitter: r(), tint: r() < .6 ? color.leafDark : color.leaf, scale: 2.4 })
  }
  for (let i = 0; i < 30; i++) bush(r() * LENGTH, ROAD.rail + LIP - .05 + r() * .25, 0, .35 + r() * .35)
  for (let i = 0; i < 40; i++) bush(r() * LENGTH, ROAD.leftEdge - WALL_BACK - r() * .8, WALL_H, .6 + r() * .6)
  for (let i = 0; i < 18; i++) bush(r() * LENGTH, ROAD.leftEdge - .35, 0, .4 + r() * .3)
  return out
}

const PARTICLES = build()

// The sea, four hundred metres below the cliff edge.
const CLIFF = -400
/** Glints on the water, in screen space: x across, y from the horizon down. */
const GLINTS = (() => { const r = rng(43); return Array.from({ length: 420 }, () => ({ x: r(), y: r() ** 2.2, j: r() })) })()
const STARS = (() => { const r = rng(7); return Array.from({ length: 320 }, () => ({ a: r() * 6.4 - 3.2, y: r() ** 1.6, g: (r() < .8 ? '.' : r() < .5 ? '+' : '*') as Glyph, j: r() })) })()
const BOATS = (() => { const r = rng(11); return Array.from({ length: 14 }, () => ({ a: .15 + r() * 1.3, y: 8 + r() ** 2 * 90, j: r() })) })()

/** Stable pseudo-random value for a sample index, so glyphs do not flicker. */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function atlas(tint: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 64 * GLYPHS.length
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.font = '700 48px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = tint
  GLYPHS.forEach((glyph, k) => ctx.fillText(glyph, 64 * (k + .5), 34))
  return canvas
}

const atlases = new Map<string, HTMLCanvasElement>()
const sprite = (tint: string) => atlases.get(tint) ?? atlases.set(tint, atlas(tint)).get(tint)!

export type Light = Form & { dusk: number }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
function mix(a: Light, b: Light, t: number): Light {
  const out = { ...b }
  for (const key of Object.keys(a) as (keyof Light)[]) (out[key] as number) = lerp(a[key] as number, b[key] as number, t)
  return out
}

/** 1 towards the land (left), 0 out to sea (right): the coast's mountains stop where the sea begins. */
const landward = (a: number) => 1 - smooth((a + .05) / .35)

/** Ridge height in pixels for a direction `a` (radians from north, roughly). */
function ridge(a: number, layer: number) {
  const o = layer * 3.1
  const peaks = 1 - Math.abs(Math.sin(a * 4.1 + o))
  return (layer ? 150 : 250) * (.3 + .32 * peaks ** 2 + .2 * Math.sin(a * 2.3 + 2 * o) + .1 * Math.sin(a * 9.7 + o) + .05 * Math.abs(Math.sin(a * 27)) + .03 * Math.sin(a * 61))
}

/** Draw a glyph from the atlas, centred, if it is on the sheet at all. */
const putter = (ctx: CanvasRenderingContext2D) => (tint: string, glyph: Glyph, x: number, y: number, size: number, alpha: number) => {
  if (alpha <= .01 || x < -40 || x > W + 40 || y < -40 || y > H + 40) return
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.drawImage(sprite(tint), 64 * GLYPHS.indexOf(glyph), 0, 64, 64, x - size / 2, y - size / 2, size, size)
}

/** Everything far away: sky, sun, stars, the ridges inland, the sea and its glints, boats. `yaw` is where we look, on the map. */
function drawSky(ctx: CanvasRenderingContext2D, f: Light, dusk: number, yaw: number, t: number) {
  const ax = (a: number) => VPX + Math.tan(Math.max(-1.3, Math.min(1.3, a - yaw))) * FOCAL
  // Sky: sunset gradient to night, the sun's glow behind the ridges, stars as the light goes.
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON)
  g.addColorStop(0, blend(sky.top, dusk))
  g.addColorStop(.6, blend(sky.mid, dusk))
  g.addColorStop(1, blend(sky.horizon, dusk))
  ctx.globalAlpha = 1
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, HORIZON + 4)
  const sunX = ax(.4)
  // The sun: white-hot at the core, a gold bloom round it, a band of fire along the horizon.
  // It sinks into the sea as the talk goes on and turns deep orange on the way; gone by nightfall.
  const sunR = 30
  const sunY = HORIZON - 70 + dusk * 150
  const sunUp = Math.max(0, 1 - dusk * 1.6) * f.sky
  const low = Math.min(1, dusk * 1.6)
  const glow = (x: number, y: number, r: number, sx: number, sy: number, stops: [number, string][], alpha: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(sx, sy)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    for (const [at, c] of stops) g.addColorStop(at, c)
    ctx.globalAlpha = alpha
    ctx.fillStyle = g
    ctx.fillRect(-r, -r, 2 * r, 2 * r)
    ctx.restore()
  }
  if (sunUp > .01) {
    ctx.save()
    ctx.beginPath(); ctx.rect(-100, -100, W + 200, HORIZON + 103); ctx.clip()
    // The sky warms all round it, then a wide flat band of light lies on the horizon.
    glow(sunX, sunY, 760, 1, .8, [[0, tone('#ffb347', '#ff6a2a', low) + 'aa'], [.35, tone('#ff9a3c', '#e2502a', low) + '55'], [1, '#ff7a3a00']], sunUp)
    glow(sunX, HORIZON, 200, 4.5, .55, [[0, tone('#ffd27a', '#ff7a3a', low) + 'cc'], [1, '#ff8a3a00']], sunUp)
    ctx.globalCompositeOperation = 'lighter'
    glow(sunX, sunY, sunR * 4, 1, 1, [[0, '#fff1c4cc'], [.3, tone('#ffd27a', '#ff8a3a', low) + '88'], [1, '#ffb34700']], sunUp)
    glow(sunX, sunY, sunR, 1, 1, [[0, '#ffffff'], [.55, tone('#fff6d8', '#ffc27a', low)], [.85, tone('#ffe08a', '#ff8a3a', low)], [1, tone('#ffc35a', '#ff6a2a', low) + '00']], sunUp)
    ctx.restore()
  }
  const put = putter(ctx)
  // At night, the moon behind us lifts a faint blue haze off the horizon.
  {
    const m = moonOf(dusk) * f.sky
    if (m > .01) {
      const haze = ctx.createLinearGradient(0, HORIZON - 260, 0, HORIZON + 4)
      haze.addColorStop(0, '#2a3654' + '00')
      haze.addColorStop(1, '#2a3654')
      ctx.globalAlpha = .55 * m
      ctx.fillStyle = haze
      ctx.fillRect(0, HORIZON - 260, W, 264)
    }
  }
  for (const star of STARS) put(color.star, star.g, ax(star.a), 30 + star.y * (HORIZON - 120), 9 + star.j * 7, (dusk - .15) * 1.3 * f.sky * (.4 + .6 * Math.abs(Math.sin(t * .7 + star.j * 50))))

  // Two ridges, far and near, turning with the road; a rim of glyphs catches the last light.
  for (const layer of [0, 1]) {
    ctx.globalAlpha = 1
    ctx.fillStyle = blend(layer ? sky.ridgeNear : sky.ridgeFar, dusk)
    ctx.beginPath()
    ctx.moveTo(0, HORIZON + 4)
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, HORIZON + 4 - ridge(Math.atan((x - VPX) / FOCAL) + yaw, layer) * landward(Math.atan((x - VPX) / FOCAL) + yaw))
    ctx.lineTo(W, HORIZON + 4)
    ctx.fill()
    for (let x = 0; x <= W; x += 14) {
      const a = Math.atan((x - VPX) / FOCAL) + yaw
      put(layer ? color.rock : color.amber, '.', x, HORIZON + 4 - ridge(a, layer) * landward(a), 12, (layer ? .5 : .55 * (1 - dusk)) * f.land * hash(Math.round(a * 400)) * landward(a))
      // Moonlight catching the ridge lines.
      put(color.star, '.', x, HORIZON + 5 - ridge(a, layer) * landward(a), 10, .4 * moonOf(dusk) * f.land * hash(Math.round(a * 400) + 7) * landward(a))
    }
  }
  // The sea: bright with the sky at the horizon, deep below; the sun's road of glints on it.
  const sea = ctx.createLinearGradient(0, HORIZON, 0, H)
  sea.addColorStop(0, blend(sky.seaFar, dusk))
  sea.addColorStop(.35, blend(sky.seaNear, dusk))
  sea.addColorStop(1, blend(sky.seaNear, Math.min(1, dusk + .3)))
  ctx.globalAlpha = 1
  ctx.fillStyle = sea
  ctx.fillRect(0, HORIZON + 3, W, H - HORIZON)
  // The sun's road: a column of gold straight below the disc, about as wide as the sun, broken into
  // glittering streaks; a bright seam where it meets the horizon. Added on top, as light is.
  const moon = moonOf(dusk)
  if (sunUp > .01) {
    ctx.save()
    ctx.beginPath(); ctx.rect(-100, HORIZON + 2, W + 200, H); ctx.clip()
    ctx.globalCompositeOperation = 'lighter'
    glow(sunX, HORIZON + 3, 160, 3.2, .06, [[0, '#fff1c4dd'], [1, '#ffd27a00']], sunUp)
    glow(sunX, HORIZON + 3, H - HORIZON, .07, 1, [[0, tone('#ffd27a', '#ff8a3a', low) + '99'], [.45, tone('#ffb347', '#ff6a2a', low) + '44'], [1, '#ff8a3a00']], sunUp)
    ctx.restore()
    ctx.globalCompositeOperation = 'lighter'
  }
  for (const g of GLINTS) {
    const y = HORIZON + 6 + g.y * (H - HORIZON)
    const across = (g.x - .5) * 2
    const x = sunX + across * (sunR * 1.2 + g.y * 140) * (Math.abs(across) < .7 ? 1 : 1.8)
    const path = 1 - Math.abs(across) * .75
    const w = 8 + g.y * 30 + (1 - Math.abs(across)) * 12
    put(g.j < .35 ? '#fff1c4' : g.j < .8 ? color.amber : '#ff8a3a', g.j < .5 ? '-' : '=', x, y, w, sunUp * path * (.2 + .8 * Math.abs(Math.sin(t * 1.9 + g.j * 40))))
  }
  ctx.globalCompositeOperation = 'source-over'
  // At night the moon is behind us: a faint silver sparkle all across the water.
  for (const g of GLINTS) {
    const y = HORIZON + 6 + g.y * (H - HORIZON)
    put(color.star, '-', W * g.x, y, 5 + g.y * 14, (dusk * .2 + moon * .35) * f.sky * Math.abs(Math.sin(t * .9 + g.j * 30)))
  }
  // Boats' lights far out come on as it gets dark.
  for (const boat of BOATS) put(boat.j < .7 ? color.amber : color.paint, '.', ax(boat.a), HORIZON + boat.y, 10, (dusk - .25) * 1.2 * f.land * (.6 + .4 * Math.sin(t * 1.1 + boat.j * 30)))
}

/** Draw one frame: `travel` metres along the road, `t` seconds of clock (for twinkle). */
export function draw(canvas: HTMLCanvasElement, f: Light, travel: number, t: number, hero: Hero = HERO_IDLE) {
  const ctx = canvas.getContext('2d')!
  const scale = canvas.width / W
  const show = Math.min(1, Math.max(0, (f.head - .1) * 3))
  // We only flinch towards the edge where nothing would stop us: paint, or no barrier at all.
  // Without even paint, the lorry takes its half out of the middle; with lines it keeps to its side.
  drift = regimeOf(f) === 'none' ? .7 : -.35
  // The lorry, if the script has one on the road: we pull away as it comes by.
  swerve = hero.lorry ? flinch(hero.lorry.z - Z_MIN) * show * Math.min(1, f.speed / 3) : 0
  extreme = hero.lorry?.outcome === 'scrape'
  if (hero.lorry?.outcome === 'crash') drift = .7
  // Lean towards the drop and shudder on the rumble of the edge; zoom a touch so the corners stay covered.
  const amp = (2 + 7 * swerve) * swerve
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  cine = hero.cine ?? null
  camU = cine ? 0 : hero.cam?.u ?? 0
  camYaw = cine ? 0 : hero.cam?.yaw ?? 0
  if (cine) swerve = 0
  ctx.translate(W / 2 + Math.sin(t * 53) * amp, H / 2 + Math.sin(t * 71) * amp * .7)
  ctx.rotate(.05 * swerve)
  ctx.scale(1 + .08 * swerve, 1 + .08 * swerve)
  ctx.translate(-W / 2, -H / 2)
  const v = view(travel)
  const dusk = Math.min(1, Math.max(0, f.dusk))
  const yaw = Math.atan(v.heading) + (cine ? cine.yaw : camYaw)

  drawSky(ctx, f, dusk, yaw, t)
  if (hero.bay) drawBayPanorama(ctx, t, (Math.PI / 2 - (cine?.yaw ?? 0)) * FOCAL, hero.bay)
  const put = putter(ctx)
  const moon = moonOf(dusk)

  // Light on the road: daylight fades, headlights reach the nearest twenty-odd metres.
  const lit = (z: number) => (1 - .7 * dusk) + .3 * moon + dusk * 1.4 * Math.exp(-Math.abs(z - (cine?.z ?? 0)) / 24)
  const fogOf = (z: number) => cine
    ? Math.min(1, Math.max(0, 1.15 - Math.abs(z - cine.z) / LENGTH))
    : Math.min(1, Math.max(0, 1.15 - z / LENGTH)) * Math.min(1, (z - Z_MIN) / 1.2)

  // Chevrons on the outside of the sharpest bends, every 7 m.
  const signs: { z: number; s: number; warn?: boolean; sbend?: boolean; right?: boolean }[] = []
  for (let k = Math.ceil((travel + Z_MIN) / 7); k * 7 < travel + LENGTH; k++) if (Math.abs(curvature(k * 7)) > .5 * C_MAX) signs.push({ z: k * 7 - travel, s: k * 7 })
  // A warning triangle before every S and run of curves.
  for (const b of S_BENDS) for (let lap = Math.floor((travel - b.s) / LOOP); b.s + lap * LOOP < travel + LENGTH; lap++) {
    const s = b.s + lap * LOOP
    if (s - travel > Z_MIN) signs.push({ z: s - travel, s, sbend: true, right: b.right })
  }

  // Land, from far to near.
  const land: { z: number; p: Particle }[] = []
  for (const p of PARTICLES) {
    const z = Z_MIN + (((p.s - travel) % LENGTH) + LENGTH) % LENGTH
    land.push({ z, p })
    if (cine && z - LENGTH > -BEHIND) land.push({ z: z - LENGTH, p })
  }
  land.sort((a, b) => b.z - a.z)

  // Oncoming traffic, far to near, and a shudder when the lorry goes by close.
  const traffic = TRAFFIC.map(car => ({ car, z: Z_MIN + (((car.s0 - travel * 1.9) % car.period) + car.period) % car.period }))
  if (hero.lorry && hero.lorry.z > Z_MIN) traffic.push({ car: LORRY, z: hero.lorry.z })
  const near = traffic.filter(c => c.z < LENGTH).sort((a, b) => b.z - a.z)
  const lights: (() => void)[] = []

  // Stage 4: a traffic officer steps into our lane with a STOP paddle, the patrol car on the shoulder, and we stop.
  const props: { z: number; paint: () => void }[] = []
  const lays = hero.lays ?? []
  for (const lay of lays) {
    if (lay.kind === 'police') {
      const pz = lay.s + 14 - travel, oz = lay.s + 8 - travel
      if (pz < LENGTH && pz > Z_MIN) props.push({ z: pz, paint: () => drawPatrol(ctx, v, pz, ROAD.rail + LIP + 2.8, dusk, 1, t, lit(pz), lights) })
      if (oz < LENGTH && oz > Z_MIN) props.push({ z: oz, paint: () => drawOfficer(ctx, v, oz, ROAD.rail + LIP + .3, dusk, 1, lit(oz)) })
    }
    const pz = lay.s - 6 - travel
    if (lay.kind === 'parking' && pz < LENGTH && pz > Z_MIN) props.push({ z: pz, paint: () => drawParking(ctx, v, pz, f, dusk, fogOf(pz)) })
  }
  props.sort((a, b) => b.z - a.z)
  const layAt = (s: number) => layWidth(lays, s)

  // Warning triangles forty metres before each narrowing.
  for (let k = Math.ceil((travel - PINCH_AT + 40) / PINCH_PERIOD); PINCH_AT - 40 + k * PINCH_PERIOD < travel + LENGTH; k++) {
    const s = PINCH_AT - 40 + k * PINCH_PERIOD
    if (s - travel > Z_MIN) signs.push({ z: s - travel, s, warn: true })
  }
  signs.sort((a, b) => a.z - b.z)


  const paintTint = f.paintTint > .5 ? color.soft : color.paint
  // Terrain as strips between consecutive rows, far to near, so near rock covers far road on a bend.
  // Wall and road are solid: no seams, nothing showing through. Distance and dimming tint them
  // towards the far ridge instead of making them transparent.
  const wallBase = blend(sky.wall, dusk)
  const roadBase = tone(blend(sky.road, dusk), blend(sky.track, dusk), f.gravel)
  const haze = blend(sky.ridgeFar, dusk)
  const shade = (base: string, z: number) => tone(tone(tone(base, '#3b4458', .28 * moon), haze, smooth((z / LENGTH - .55) / .45)), blend(sky.ground, 1), (1 - f.land) * .5)
  const solid = (a: Edge, b: Edge, c: Edge, d: Edge, fill: string) => {
    ctx.globalAlpha = 1
    ctx.fillStyle = fill
    ctx.strokeStyle = fill
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); ctx.stroke()
  }
  const cliffTop = blend(sky.cliffTop, dusk)
  const cliffLow = blend(sky.cliffLow, dusk)
  const cliffMid = blend(sky.cliffMid, dusk)
  type Edge = { x: number; y: number }
  let prev: Edge[] | null = null
  const strip = (a: Edge, b: Edge, c: Edge, d: Edge, fill: string) => {
    ctx.fillStyle = fill
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill()
  }
  let kerbPrev: { foot: Edge; top: Edge; back: Edge } | null = null
  let li = 0
  let si = signs.length - 1
  let ti = 0
  let pi = 0
  const rows: number[] = []
  for (let z = Z_MIN + LENGTH; z > Z_MIN; z /= 1 + ROW) rows.push(z)
  if (cine) for (let z = Z_MIN - .3; z > -BEHIND; z -= .3) rows.push(z)
  let parPrev: { x: number; y: number; d: number }[] | null = null
  for (let i = 0; i < rows.length; i++) {
    const z = rows[i]
    // Terrain strip between the previous row and this one first.
    const s = travel + z
    const left = leftEdge(s)
    const wide = layAt(s)
    const lipU = ROAD.rail + LIP + wide
    const edges = [project(v, left - WALL_BACK, z, WALL_H), project(v, left - .2, z, 0), project(v, lipU, z, 0), project(v, lipU, z, -25), project(v, lipU, z, CLIFF), project(v, lipU, z, -90)]
    if (prev && cine) {
      // The free camera can stand on the road or look along it: cut the strips into pieces and leave
      // out any piece reaching behind it.
      const zp = rows[i - 1], sp = travel + zp, lp = leftEdge(sp), wp = ROAD.rail + LIP + layAt(sp)
      const n = 10
      for (let j = 0; j < n; j++) {
        const a0 = j / n, a1 = (j + 1) / n
        const u = (l: number, r: number, a: number) => l + (r - l) * a
        const q = [project(v, u(lp - .2, wp, a0), zp, 0), project(v, u(left - .2, lipU, a0), z, 0), project(v, u(left - .2, lipU, a1), z, 0), project(v, u(lp - .2, wp, a1), zp, 0)]
        if (q.every(p => p.d > .25)) solid(q[0], q[1], q[2], q[3], shade(roadBase, Math.abs(z - cine.z)))
        const w = [project(v, u(lp - .2, lp - WALL_BACK, a0), zp, WALL_H * a0), project(v, u(left - .2, left - WALL_BACK, a0), z, WALL_H * a0), project(v, u(left - .2, left - WALL_BACK, a1), z, WALL_H * a1), project(v, u(lp - .2, lp - WALL_BACK, a1), zp, WALL_H * a1)]
        if (w.every(p => p.d > .25)) solid(w[0], w[1], w[2], w[3], shade(wallBase, Math.abs(z - cine.z)))
      }
    } else if (prev) {
      ctx.globalAlpha = Math.min(1, Math.max(0, 1.15 - z / LENGTH) * 4) * f.land
      // The cliff face, only where it turns to face us: the outside of a bend ahead, dropping to the sea.
      // Screen-space winding: the face's quad turns anticlockwise only when we see its front.
      const q = [prev[2], edges[2], edges[4], prev[4]]
      let area = 0
      for (let k = 0; k < 4; k++) area += q[k].x * q[(k + 1) % 4].y - q[(k + 1) % 4].x * q[k].y
      const reveal = smooth((z - 14) / 18) * Math.min(1, (LENGTH - z) / 25)
      if (area < 0 && reveal > .02) {
        ctx.globalAlpha = reveal * f.land
        // Rock at the top, hazier and bluer as it falls away, lost in the sea mist long before the water.
        strip(prev[5], edges[5], edges[4], prev[4], cliffLow)
        strip(prev[3], edges[3], edges[5], prev[5], cliffMid)
        strip(prev[2], edges[2], edges[3], prev[3], cliffTop)
        if (i % 3 === 0) for (let g = 0; g < 7; g++) {
          const crack = project(v, ROAD.rail + LIP - .2, z, -3 - g * 9 - hash(i + g) * 6)
          put(color.rock, '|', crack.x, crack.y, Math.min(34, Math.max(4, crack.k * 5)), (.5 - g * .06) * (1 - .5 * dusk))
        }
        for (let g = 0; g < 3; g++) {
          const h = -(hash(i * 31 + g) ** 1.3) * 390
          const rock = project(v, ROAD.rail + LIP - .3, z, h)
          put(h > -120 ? color.rock : color.scree, hash(i * 7 + g) < .5 ? '#' : hash(i + g) < .5 ? ':' : '|', rock.x, rock.y, Math.min(30, Math.max(4, rock.k * 6)), (.35 + .4 * (1 - dusk)) * (1 + h / 600))
        }
        const foam = project(v, ROAD.rail + LIP + 2, z, CLIFF)
        put(color.paint, hash(i * 3) < .5 ? '-' : '=', foam.x, foam.y, Math.min(20, Math.max(4, foam.k * 8)), (.3 + .4 * (1 - dusk)) * Math.abs(Math.sin(t * 1.3 + i)))
      }
      solid(prev[1], edges[1], edges[2], prev[2], shade(roadBase, z))
      solid(prev[0], edges[0], edges[1], prev[1], shade(wallBase, z))
    }
    prev = edges
    // A low stone parapet along the outside of a lay-by.
    if (wide > .3) {
      const par = [project(v, lipU, z, 0), project(v, lipU, z, .75)]
      if (parPrev && par.every(p => p.d > .25) && parPrev.every(p => p.d > .25)) {
        const stone = Math.min(1, .45 + .55 * lit(z)) * (1 - .45 * dusk)
        ctx.globalAlpha = fogOf(z)
        solid(parPrev[0], par[0], par[1], parPrev[1], shadeHex('#7d7681', stone))
      }
      parPrev = par
    } else parPrev = null
    // Then whatever stands on the strip just drawn, far to near.
    for (; li < land.length && land[li].z >= z; li++) {
      const { z: lz, p } = land[li]
      if (p.loose && f.gravel < .01) continue
      // The narrowing pushes the cut into the road; the asphalt squeezes between the cut and the barrier.
      const at = travel + lz
      const u = p.u < ROAD.leftEdge ? p.u + PINCH_WIDTH * pinch(at)
        : p.road ? ROAD.rail - (ROAD.rail - p.u) * (ROAD.rail - leftEdge(at)) / (ROAD.rail - ROAD.leftEdge) : p.u + layAt(at)
      const pt = project(v, u, lz, p.h)
      const sc = p.scale ?? 1
      const size = Math.min(30 * sc, Math.max(4, pt.k * .16 * sc))
      const alpha = fogOf(lz) * ((p.road ? .3 : .45) + .35 * p.jitter) * lit(lz) * (p.loose ? f.gravel * 1.6 : p.road ? 1 - .6 * f.gravel : 1)
      put(p.tint, p.glyph, pt.x, pt.y + (p.jitter - .5) * 2, size * (p.loose ? 1.15 : 1), alpha * f.land)
    }
    for (; si >= 0 && signs[si].z >= z; si--) {
      const sign = signs[si]
      if (sign.sbend) drawSBend(ctx, v, sign.z, sign.s, !!sign.right, f, dusk, fogOf(sign.z))
      else if (sign.warn) drawNarrows(ctx, v, sign.z, sign.s, f, dusk, fogOf(sign.z))
      else drawChevron(ctx, v, sign.z, sign.s, f, dusk, fogOf(sign.z), put)
    }
    for (; pi < props.length && props[pi].z >= z; pi++) props[pi].paint()
    // Lorries only on the open road and among the soft guardrails, where they give you a fright.
    for (; ti < near.length && near[ti].z >= z; ti++) if (show) drawVehicle(ctx, v, near[ti].car, near[ti].z, dusk, fogOf(near[ti].z) * show, lit(near[ti].z), lights)

    // Edges of this row: wall top, wall foot, road left, road right, ravine lip, ravine floor.
    // The lip of the ravine, a crisp broken edge.
    const lip = project(v, lipU, z, 0)
    put(color.rock, hash(i * 3) < .5 ? '.' : '-', lip.x, lip.y, Math.min(26, Math.max(4, (FOCAL / z) * .12)), fogOf(z) * .7 * lit(z) * f.land)
    // Moonlight silvers the edges facing us: the top of the cut and the lip of the drop.
    if (moon > .02) {
      const top = project(v, left - WALL_BACK, z, WALL_H)
      put(color.star, hash(i * 5) < .5 ? '.' : '-', top.x, top.y, Math.min(22, Math.max(4, (FOCAL / z) * .1)), fogOf(z) * .55 * moon * f.land)
      put(color.star, '.', lip.x, lip.y - 1, Math.min(20, Math.max(4, (FOCAL / z) * .09)), fogOf(z) * .45 * moon * f.land)
    }
    // Fallen rock along the narrowing.
    const fall = pinch(s)
    if (fall > .25 && hash(i * 5) < fall * .8) {
      const rock = project(v, left - .25 + hash(i * 9) * .5, z, hash(i * 11) * .4)
      put(color.rock, hash(i * 2) < .5 ? '@' : '#', rock.x, rock.y, Math.min(40, Math.max(5, (FOCAL / z) * .32)), fogOf(z) * .9 * lit(z) * f.land)
    }
    const fog = fogOf(z) * lit(z)
    const size = Math.min(34, Math.max(5, (FOCAL / z) * .16))
    for (let strand = -1; strand <= 1; strand++) {
      const h1 = hash(i * 7 + strand + 3)
      const edge = project(v, left + strand * .06, z, 0)
      put(paintTint, h1 < .7 ? '-' : '=', edge.x, edge.y, size, fog * f.paint)
      const right = project(v, ROAD.rightEdge + strand * .06, z, 0)
      put(paintTint, h1 < .6 ? '-' : '=', right.x, right.y, size, fog * f.paint * .85)
      // Through a narrowing the centre line goes solid: no overtaking.
      if (s % 9 < 3 || fall > .12) {
        const dash = project(v, centre(s) + strand * .06, z, 0)
        put(paintTint, h1 < .5 ? '=' : '-', dash.x, dash.y, size, fog * f.dash)
      }
    }
    // Level 1: a raised concrete kerb along the edge, following the road: a lit top, a darker face.
    if (calm(s) < f.coverage && f.stones > .01 && wide < .3) {
      const kerb = { foot: project(v, ROAD.rail - .08, z, 0), top: project(v, ROAD.rail - .08, z, KERB_H), back: project(v, ROAD.rail + .06, z, KERB_H) }
      if (kerbPrev) {
        const light = Math.min(1, .45 + .55 * lit(z)) * (1 - .35 * dusk)
        ctx.globalAlpha = Math.min(1, fogOf(z) * 1.3) * f.stones
        const quad = (p: Edge[], fill: string) => {
          ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (const q of p.slice(1)) ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fill(); ctx.stroke()
        }
        quad([kerbPrev.foot, kerb.foot, kerb.top, kerbPrev.top], shade(KERB, light * .62))
        quad([kerbPrev.top, kerb.top, kerb.back, kerbPrev.back], shade(KERB, light))
        // Joints every metre and a half.
        const n = Math.floor(s / 1.5)
        if (n !== Math.floor((travel + (rows[i - 1] ?? z)) / 1.5)) {
          ctx.strokeStyle = shade(KERB, light * .35); ctx.lineWidth = Math.max(1, kerb.top.k * .012)
          ctx.beginPath(); ctx.moveTo(kerb.foot.x, kerb.foot.y); ctx.lineTo(kerb.top.x, kerb.top.y); ctx.lineTo(kerb.back.x, kerb.back.y); ctx.stroke()
        }
      }
      kerbPrev = kerb
    } else kerbPrev = null
    // Level 2: a timber fence, two round rails on stout posts every 2 m.
    if (calm(s) < f.coverage && f.logs > .01 && wide < .3) {
      const bsize = Math.min(30, Math.max(5, (FOCAL / z) * .13))
      const a = fogOf(z) * (.55 + .45 * lit(z)) * f.logs
      for (const h of [.38, .44, .74, .8]) {
        const rail = project(v, ROAD.rail, z, h)
        put(hash(i * 11 + h * 10) < .5 ? WOOD : WOOD_DARK, hash(i * 17 + h * 10) < .7 ? '=' : '#', rail.x, rail.y, bsize * 1.4, a)
      }
      const prev = travel + (rows[i - 1] ?? z * (1 + ROW))
      if (Math.floor(prev / 2) !== Math.floor(s / 2)) for (let j = 0; j < 10; j++) { const post = project(v, ROAD.rail + .06, z, j * .09); put(WOOD_DARK, '#', post.x, post.y, bsize * 1.5, a) }
    }
    // The barrier: W-beam in red and white 2 m panels, posts every 2 m, a reflector on every other post.
    if (calm(s) < f.coverage && f.rail > .01 && wide < .3) {
      const panel = Math.floor(s / 2) % 2 ? color.hard : color.paint
      const bsize = Math.min(30, Math.max(5, (FOCAL / z) * .12))
      for (const h of [.5, .58, .66, .74]) {
        const h2 = hash(i * 13 + h * 100)
        const beam = project(v, ROAD.rail, z, h)
        put(panel, h2 < .5 ? '#' : h2 < .8 ? '=' : '@', beam.x, beam.y, bsize, fogOf(z) * (.55 + .45 * lit(z)) * f.rail)
      }
      const prev = travel + (rows[i - 1] ?? z * (1 + ROW))
      if (Math.floor(prev / 2) !== Math.floor(s / 2)) {
        for (let j = 0; j < 9; j++) { const post = project(v, ROAD.rail + .08, z, j * .085); put(color.steel, '|', post.x, post.y, bsize, fogOf(z) * .8 * f.rail) }
        if (Math.floor(s / 2) % 2 === 0) { const eye = project(v, ROAD.rail - .05, z, .82); put(color.amber, '*', eye.x, eye.y, bsize * 1.2, fogOf(z) * (.2 + dusk * 1.1) * f.rail) }
      }
    }
  }
  // Headlights last, added on top: they glare over whatever is in front of them.
  ctx.globalCompositeOperation = 'lighter'
  for (const light of lights) light()
  ctx.globalCompositeOperation = 'source-over'
  // Our own car, just ahead of the camera, and anyone walking round it, far to near.
  if (f.car > .01) drawHero(ctx, v, f, dusk, moon, t, hero, put)
  if (hero.puff) drawPuff(put, v, hero.u ?? .35, hero.puff, t)
  const peak = swerve
  ctx.globalAlpha = 1
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  // The dials, in the corner, level and still.
  if (hero.hud && f.car > .3) drawHud(ctx, hero.hud, Math.min(1, (f.car - .3) * 1.6) * hero.spawn)
  if (hero.paused) drawPaused(ctx)
  if (hero.coin) drawCoin(ctx, performance.now() / 1000)
  // Level and still, over the road, clear of the sheet's text on the left.
  if (hero.crash >= 0) drawGameOver(ctx, hero.crash)
  swerve = 0
  cine = null; camU = 0; camYaw = 0
  return peak
}

// Oncoming traffic. Each vehicle comes round on its own loop; `lane` pushes it towards the centre line.
type Vehicle = { kind: 'car' | 'moto' | 'truck'; s0: number; period: number; body: string; lane: number }
/** The lorry the script sends; it has no loop of its own. */
const LORRY: Vehicle = { kind: 'truck', s0: 0, period: 1, body: '#c9cdd2', lane: .6 }
const TRAFFIC: Vehicle[] = [
  { kind: 'car', s0: 189.5, period: 300, body: '#2d3a4a', lane: 0 },
  { kind: 'moto', s0: 229.5, period: 300, body: '#1c1d22', lane: -.3 },
  { kind: 'car', s0: 29.5, period: 300, body: '#6a2329', lane: .1 },
]

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift: number) => Math.round(Math.min(255, ((n >> shift) & 255) * k))
  return `rgb(${ch(16)} ${ch(8)} ${ch(0)})`
}

/** A box `len` long, `w` wide, from `h0` to `h1` above the road, its front face `z` metres away. */
function box(ctx: CanvasRenderingContext2D, v: View, u: number, z: number, len: number, w: number, h0: number, h1: number, body: string, light: number) {
  const P = (du: number, dz: number, h: number) => project(v, u + du, z + dz, h)
  const quad = (a: Edge, b: Edge, c: Edge, d: Edge, fill: string) => {
    ctx.fillStyle = fill
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill()
  }
  const bend = along(v.bend, z + len / 2)
  const l = -w / 2, r = w / 2
  if (u + bend + l > 0) quad(P(l, 0, h0), P(l, len, h0), P(l, len, h1), P(l, 0, h1), shade(body, .55 * light))
  if (u + bend + r < 0) quad(P(r, 0, h0), P(r, len, h0), P(r, len, h1), P(r, 0, h1), shade(body, .55 * light))
  if (h1 < CAM_H) quad(P(l, 0, h1), P(r, 0, h1), P(r, len, h1), P(l, len, h1), shade(body, .8 * light))
  quad(P(l, 0, h0), P(r, 0, h0), P(r, 0, h1), P(l, 0, h1), shade(body, .7 * light))
}
type Edge = { x: number; y: number }

/** Front-face detail: a dark panel from (u0, h0) to (u1, h1), seen at distance z. */
function panel(ctx: CanvasRenderingContext2D, v: View, u: number, z: number, u0: number, u1: number, h0: number, h1: number, fill: string) {
  const a = project(v, u + u0, z, h1)
  const b = project(v, u + u1, z, h0)
  ctx.fillStyle = fill
  ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y)
}

function drawVehicle(ctx: CanvasRenderingContext2D, v: View, car: Vehicle, z: number, dusk: number, fog: number, lit: number, lights: (() => void)[]) {
  if (fog <= .01) return
  const s = v.s0 + z
  const u = (leftEdge(s) + centre(s)) / 2 + car.lane + (car.kind === 'truck' ? drift * swerve : 0)
  const light = Math.min(1.3, .35 + .65 * lit)
  ctx.globalAlpha = Math.min(1, fog * 1.4)
  const glass = shade('#3a4a66', (.5 + .5 * (1 - dusk)) * light)
  const dark = '#08090b'
  const lamps: { du: number; h: number; r: number; tint: string }[] = []
  if (car.kind === 'car') {
    box(ctx, v, u, z + .9, 2.6, 1.6, .9, 1.45, car.body, light)
    box(ctx, v, u, z, 4.3, 1.8, .25, .95, car.body, light)
    panel(ctx, v, u, z + .9, -.7, .7, .98, 1.4, glass)
    panel(ctx, v, u, z, -.45, .45, .3, .55, dark)
    for (const du of [-.65, .65]) panel(ctx, v, u, z + .2, du - .18, du + .18, 0, .3, dark)
    lamps.push({ du: -.62, h: .68, r: .13, tint: '255 244 214' }, { du: .62, h: .68, r: .13, tint: '255 244 214' })
  } else if (car.kind === 'moto') {
    box(ctx, v, u, z + .3, 1.9, .35, .3, .9, car.body, light)
    box(ctx, v, u, z + .7, .5, .55, .9, 1.55, '#30343c', light)
    box(ctx, v, u, z + .75, .3, .3, 1.55, 1.85, '#e8e8e8', light)
    panel(ctx, v, u, z + .2, -.07, .07, 0, .35, dark)
    lamps.push({ du: 0, h: .95, r: .11, tint: '255 244 214' })
  } else {
    // A lorry: long trailer, tall cab, a chrome grille, amber markers along the roof.
    box(ctx, v, u, z + 2.7, 11, 2.5, 1, 4, '#8a2a30', light)
    box(ctx, v, u, z, 2.4, 2.5, .45, 3.3, car.body, light)
    panel(ctx, v, u, z, -1.1, 1.1, 1.9, 2.95, glass)
    panel(ctx, v, u, z, -.8, .8, .55, 1.55, shade('#8b929c', light))
    for (let k = 0; k < 5; k++) panel(ctx, v, u, z, -.8, .8, .6 + k * .2, .66 + k * .2, dark)
    for (const du of [-.9, .9]) panel(ctx, v, u, z + .3, du - .25, du + .25, 0, .55, dark)
    lamps.push({ du: -1, h: .8, r: .19, tint: '255 244 214' }, { du: 1, h: .8, r: .19, tint: '255 244 214' })
    for (const du of [-1.15, -.6, 0, .6, 1.15]) lamps.push({ du, h: 3.22, r: .06, tint: '255 178 28' })
  }
  // Lamps glow in a second pass; dipped beams are on from sunset, and grow at night.
  const glow = (.35 + .65 * dusk) * fog
  lights.push(() => {
    for (const lamp of lamps) {
      const p = project(v, u + lamp.du, z, lamp.h)
      const core = Math.max(1.5, lamp.r * p.k)
      const halo = core * (lamp.h > 3 ? 4 : 7 + 6 * dusk)
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo)
      g.addColorStop(0, `rgb(${lamp.tint} / ${glow})`)
      g.addColorStop(.25, `rgb(${lamp.tint} / ${glow * .35})`)
      g.addColorStop(1, `rgb(${lamp.tint} / 0)`)
      ctx.globalAlpha = 1
      ctx.fillStyle = g
      ctx.fillRect(p.x - halo, p.y - halo, halo * 2, halo * 2)
      ctx.fillStyle = `rgb(255 255 255 / ${Math.min(1, glow * 1.5)})`
      ctx.beginPath(); ctx.arc(p.x, p.y, core, 0, Math.PI * 2); ctx.fill()
    }
    // The pool their beams throw on the road in front of them.
    if (car.kind !== 'moto' || dusk > .3) {
      const ahead = Math.max(Z_MIN + .5, z - 6)
      const p = project(v, u, ahead, 0)
      const rx = 2.2 * p.k, ry = .5 * p.k
      ctx.save()
      ctx.translate(p.x, p.y); ctx.scale(1, ry / rx)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
      g.addColorStop(0, `rgb(255 236 190 / ${.22 * dusk * fog})`)
      g.addColorStop(1, 'rgb(255 236 190 / 0)')
      ctx.fillStyle = g
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
      ctx.restore()
    }
  })
}

/** Car width and height in metres: a rear-engined coupé, low and narrow. */
const HERO_W = 1.7
const HERO_H = 1.22
const HERO_Z = 3.3
/** Length and height of the car, for drawing it in three dimensions. */
/** How far behind the road camera the free camera can see the ground. */
const BEHIND = 30
const LAY_W = 5.6
const WOOD = '#9a6a3c'
const WOOD_DARK = '#5e3e22'
const WHITEWASH = '#e4ded0'
const KERB = '#9a958b'
/** The kerb's height: a hand and a half, enough to throw a wheel back. */
const KERB_H = .24
/** How far right we can go: the right tyre's outer face on the lip of the drop. */
const HERO_EDGE = ROAD.rail + LIP - .05 - HERO_W / 2 - .35
const RED = '#c0101e'
function shadeHex(hex: string, k: number) { return shade(hex, k) }

/** How far a lay-by widens the ground past the lip at `s`, eased in and out over 8 m. */
function layWidth(lays: LayBy[], s: number) {
  let w = 0
  for (const l of lays) {
    const d = s - l.s
    if (d < -8 || d > l.len + 8) continue
    w = Math.max(w, LAY_W * smooth((d + 8) / 8) * (1 - smooth((d - l.len) / 8)))
  }
  return w
}

/** A blue parking sign before the lay-by. */
function drawParking(ctx: CanvasRenderingContext2D, v: View, z: number, _f: Light, dusk: number, fog: number) {
  const u = ROAD.rail + LIP + .3
  const top = project(v, u, z, 2.1), bottom = project(v, u, z, 1.45), post = project(v, u, z, 0)
  const h = bottom.y - top.y
  if (h < 2 || top.d < .3) return
  ctx.globalAlpha = fog * (.7 + .3 * dusk)
  ctx.fillStyle = color.steel
  ctx.fillRect(top.x - Math.max(1, h * .04), bottom.y, Math.max(2, h * .08), post.y - bottom.y)
  
  ctx.fillStyle = '#ffffff'; ctx.fillRect(top.x - h / 2, top.y, h, h)
  ctx.fillStyle = color.chevron; ctx.fillRect(top.x - h * .44, top.y + h * .06, h * .88, h * .88)
  ctx.fillStyle = '#ffffff'; ctx.font = `800 ${Math.round(h * .7)}px system-ui, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('P', top.x, top.y + h * .53)
}

/** Exhaust on a cold start: a few grey puffs drifting back from the tailpipes. */
function drawPuff(put: ReturnType<typeof putter>, v: View, u: number, k: number, t: number) {
  for (let j = 0; j < 26; j++) {
    const life = (k + hash(j * 7)) % 1
    const side = j % 2 ? .28 : -.28
    const p = project(v, u + side + (hash(j * 3) - .5) * .5 * life, HERO_Z - .1 - life * 1.4, .15 + life * .6)
    if (p.d < .3) continue
    put(color.steel, life < .4 ? '@' : life < .7 ? '%' : '.', p.x, p.y, (.18 + life * .5) * p.k * .5, (1 - life) * .5 * Math.min(1, k * 3) * (1 - smooth((t % 1) * 0)))
  }
}

/** A small pause mark above the dials. */
function drawPaused(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.globalAlpha = .9
  ctx.fillStyle = 'rgb(8 9 11 / .85)'
  ctx.beginPath(); ctx.roundRect(1656, 742, 190, 46, 6); ctx.fill()
  ctx.fillStyle = color.amber
  ctx.fillRect(1674, 753, 7, 24); ctx.fillRect(1687, 753, 7, 24)
  ctx.font = '700 22px ui-monospace, Menlo, Consolas, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('PAUSE · M', 1706, 766)
  ctx.restore()
}

/** The arcade's attract screen: INSERT COIN blinking over the road until the first M. */
function drawCoin(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (Math.floor(t * 1.6) % 2 === 0) {
    ctx.font = '900 96px ui-monospace, Menlo, Consolas, monospace'
    ctx.fillStyle = '#7c1220'
    ctx.fillText('INSERT COIN', 1500 + 5, 200 + 5)
    ctx.fillStyle = color.amber
    ctx.fillText('INSERT COIN', 1500, 200)
  }
  ctx.font = '700 34px ui-monospace, Menlo, Consolas, monospace'
  ctx.fillStyle = 'rgb(255 244 214 / .85)'
  ctx.fillText('PRESS  M', 1500, 275)
  ctx.restore()
}

/** The moonlit bay as a panorama, `dx` pixels right of where it sits when we look straight out to sea. */
let bayCanvas: HTMLCanvasElement | null = null
let bayDrawn = -1
function drawBayPanorama(ctx: CanvasRenderingContext2D, t: number, dx: number, alpha: number) {
  if (alpha <= .01 || dx > W || dx < -W) return
  bayCanvas ??= document.createElement('canvas')
  if (bayCanvas.width !== W) { bayCanvas.width = W; bayCanvas.height = H }
  // The bay changes slowly (twinkles, the lighthouse): redraw it ten times a second, not every frame.
  if (t - bayDrawn > .1 || t < bayDrawn) {
    bayDrawn = t
    const b = bayCanvas.getContext('2d')!
    b.setTransform(1, 0, 0, 1, 0, 0)
    b.clearRect(0, 0, W, H)
    drawBay(b, t, 0)
  }
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.drawImage(bayCanvas, dx, 0, W, H)
  // Soften its left edge into the night sky beside it.
  ctx.restore()
}

/** Two dials bottom right: speed on the left, a bigger rev counter with the gear and digital speed in it. */
function drawHud(ctx: CanvasRenderingContext2D, hud: Hud, alpha: number) {
  if (alpha <= .01) return
  ctx.save()
  ctx.globalAlpha = alpha
  const mono = 'ui-monospace, Menlo, Consolas, monospace'
  const dial = (cx: number, cy: number, r: number, max: number, step: number, minor: number, label: (v: number) => string, red: number | null, value: number, needle: string) => {
    const a0 = Math.PI * .75, sweep = Math.PI * 1.5
    const ang = (v: number) => a0 + sweep * Math.min(1, Math.max(0, v / max))
    ctx.fillStyle = 'rgb(8 9 11 / .86)'
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#3a3f48'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2); ctx.stroke()
    if (red !== null) { ctx.strokeStyle = color.hard; ctx.lineWidth = r * .07; ctx.beginPath(); ctx.arc(cx, cy, r * .86, ang(red), ang(max)); ctx.stroke() }
    for (let v = 0; v <= max + 1e-6; v += minor) {
      const major = Math.abs(v / step - Math.round(v / step)) < 1e-6
      const a = ang(v), c = Math.cos(a), si = Math.sin(a)
      ctx.strokeStyle = red !== null && v >= red ? color.hard : '#c9ced6'
      ctx.lineWidth = major ? 3 : 1.5
      ctx.beginPath(); ctx.moveTo(cx + c * r * (major ? .74 : .8), cy + si * r * (major ? .74 : .8)); ctx.lineTo(cx + c * r * .9, cy + si * r * .9); ctx.stroke()
      if (major) {
        ctx.fillStyle = '#e6e9ee'; ctx.font = `600 ${Math.round(r * .15)}px ${mono}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(label(v), cx + c * r * .58, cy + si * r * .58)
      }
    }
    const a = ang(value)
    ctx.strokeStyle = needle; ctx.lineWidth = r * .045; ctx.lineCap = 'round'
    
    ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * r * .12, cy - Math.sin(a) * r * .12); ctx.lineTo(cx + Math.cos(a) * r * .86, cy + Math.sin(a) * r * .86); ctx.stroke()
    ctx.fillStyle = '#1b1e24'; ctx.beginPath(); ctx.arc(cx, cy, r * .09, 0, Math.PI * 2); ctx.fill()
  }
  dial(1560, 905, 82, 320, 40, 20, v => String(v), null, hud.kmh, '#f2f4f7')
  const tx = 1752, ty = 880, tr = 108
  dial(tx, ty, tr, 8000, 1000, 500, v => String(v / 1000), 7000, hud.rpm, '#ff6a2a')
  // Digital speed and gear inside the rev counter, as the real thing does it.
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f2f4f7'; ctx.font = `800 ${Math.round(tr * .27)}px ${mono}`
  ctx.fillText(String(Math.round(hud.kmh)), tx, ty + tr * .66)
  ctx.fillStyle = '#8b929c'; ctx.font = `600 ${Math.round(tr * .1)}px ${mono}`
  ctx.fillText('km/h', tx, ty + tr * .87)
  ctx.fillStyle = 'rgb(8 9 11 / .9)'; ctx.beginPath(); ctx.roundRect(tx - tr * .13, ty + tr * .17, tr * .26, tr * .26, 4); ctx.fill()
  ctx.strokeStyle = color.amber; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.fillStyle = color.amber; ctx.font = `800 ${Math.round(tr * .2)}px ${mono}`
  ctx.fillText(String(hud.gear + 1), tx, ty + tr * .305)
  ctx.restore()
}

/** Our car from behind, after the 992 Carrera S: wide hips that swell out over the rear wheels, a
 *  fastback roof with a big rear window, the louvred engine grille with the vertical third brake light,
 *  a thin light bar right across the tail ending in smoked lamp clusters, and a black diffuser with
 *  two big oval tailpipes either side of the plate. Drawn at the origin (bottom centre). */
function drawCar(ctx: CanvasRenderingContext2D, w: number, h: number, light: number, brake: boolean, heads = true) {
  const X = (x: number) => x * w, Y = (y: number) => -y * h
  const col = (hex: string, m = 1) => shade(hex, light * m)
  const path = (pts: [number, number][], mirror = true) => {
    const all = mirror ? [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y] as [number, number])] : pts
    const mid = (p: [number, number], q: [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
    ctx.beginPath()
    const m0 = mid(all[all.length - 1], all[0])
    ctx.moveTo(X(m0[0]), Y(m0[1]))
    for (let i = 0; i < all.length; i++) {
      const p = all[i], m = mid(p, all[(i + 1) % all.length])
      ctx.quadraticCurveTo(X(p[0]), Y(p[1]), X(m[0]), Y(m[1]))
    }
    ctx.closePath()
  }
  // Tyres: only their bottoms show under the bumper.
  ctx.fillStyle = col('#08090b')
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.roundRect(X(sx > 0 ? .31 : -.48), Y(.2), X(.17), h * .2, w * .015); ctx.fill() }
  // Mirrors, out on stalks beyond the narrow cabin.
  for (const sx of [-1, 1]) {
    ctx.fillStyle = col(RED, .75)
    ctx.beginPath(); ctx.moveTo(X(sx * .3), Y(.7)); ctx.lineTo(X(sx * .42), Y(.71)); ctx.lineTo(X(sx * .42), Y(.69)); ctx.lineTo(X(sx * .3), Y(.68)); ctx.fill()
    ctx.beginPath(); ctx.ellipse(X(sx * .455), Y(.71), w * .045, h * .035, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = col('#0b0c10'); ctx.beginPath(); ctx.ellipse(X(sx * .46), Y(.708), w * .03, h * .022, 0, 0, Math.PI * 2); ctx.fill()
  }
  // The body: bell-shaped from behind, hips at full width, the roof narrow and low.
  path([[.05, .07], [.44, .075], [.49, .16], [.5, .3], [.5, .42], [.47, .52], [.36, .58], [.29, .64], [.26, .76], [.22, .88], [.14, .955], [.04, .975]])
  const body = ctx.createLinearGradient(0, Y(.98), 0, Y(.06))
  body.addColorStop(0, col(RED, .7)); body.addColorStop(.3, col(RED, .85)); body.addColorStop(.47, col(RED, 1.25))
  body.addColorStop(.6, col(RED, 1)); body.addColorStop(.85, col(RED, .78)); body.addColorStop(1, col(RED, .55))
  ctx.fillStyle = body; ctx.fill()
  // The light catching each hip.
  ctx.save(); ctx.clip()
  for (const sx of [-1, 1]) {
    const g = ctx.createRadialGradient(X(sx * .4), Y(.5), 0, X(sx * .4), Y(.5), w * .2)
    g.addColorStop(0, 'rgb(255 255 255 / .22)'); g.addColorStop(1, 'rgb(255 255 255 / 0)')
    ctx.fillStyle = g; ctx.fillRect(X(sx * .4) - w * .2, Y(.5) - w * .2, w * .4, w * .4)
  }
  ctx.restore()
  // Rear window, wide and raked, with the two of us in it.
  path([[.04, .665], [.235, .665], [.225, .77], [.2, .87], [.13, .92], [.04, .93]])
  const glass = ctx.createLinearGradient(0, Y(.93), 0, Y(.66))
  glass.addColorStop(0, col('#39445c')); glass.addColorStop(1, col('#0b0f19'))
  ctx.fillStyle = glass; ctx.fill()
  ctx.save(); ctx.clip()
  for (const [x, tint] of heads ? [[-.1, '#1e1611'], [.1, '#6a4420']] as const : []) {
    ctx.fillStyle = col('#15171c'); ctx.beginPath(); ctx.roundRect(X(x - .075), Y(.84), X(.15), h * .18, w * .03); ctx.fill()
    ctx.fillStyle = col(tint); ctx.beginPath(); ctx.ellipse(X(x), Y(.8), w * .042, h * .06, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = 'rgb(255 255 255 / .07)'
  ctx.beginPath(); ctx.moveTo(X(-.2), Y(.665)); ctx.lineTo(X(-.08), Y(.93)); ctx.lineTo(X(.0), Y(.93)); ctx.lineTo(X(-.12), Y(.665)); ctx.fill()
  ctx.restore()
  // Engine grille under the window: black, vertical louvres, the third brake light in the middle.
  ctx.fillStyle = col('#0a0b0e')
  ctx.beginPath(); ctx.roundRect(X(-.24), Y(.665), X(.48), h * .1, w * .008); ctx.fill()
  ctx.fillStyle = col('#4a4f59')
  for (let i = 0; i < 22; i++) { const x = -.225 + i * .0214; if (Math.abs(x + .004) > .035) ctx.fillRect(X(x), Y(.655), Math.max(1, w * .005), h * .08) }
  ctx.fillStyle = brake ? '#ff2a35' : col('#8a0c16')
  for (const sx of [-1, 1]) ctx.fillRect(X(sx > 0 ? .008 : -.022), Y(.66), X(.014), h * .085)
  // The light bar: a dark band right across the tail, thin in the middle, the lamps smoked at the ends,
  // and one red line of light along it.
  ctx.fillStyle = col('#16070a')
  ctx.beginPath()
  ctx.moveTo(X(-.49), Y(.5)); ctx.quadraticCurveTo(X(-.36), Y(.505), X(-.3), Y(.49)); ctx.lineTo(X(.3), Y(.49)); ctx.quadraticCurveTo(X(.36), Y(.505), X(.49), Y(.5))
  ctx.lineTo(X(.47), Y(.44)); ctx.quadraticCurveTo(X(.36), Y(.43), X(.3), Y(.465)); ctx.lineTo(X(-.3), Y(.465)); ctx.quadraticCurveTo(X(-.36), Y(.43), X(-.47), Y(.44))
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = brake ? '#ff3a44' : col('#e01828', 1.1)
  ctx.lineWidth = Math.max(1.5, h * .012); ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(X(-.47), Y(.485)); ctx.quadraticCurveTo(X(0), Y(.482), X(.47), Y(.485)); ctx.stroke()
  ctx.lineCap = 'butt'
  for (const sx of [-1, 1]) {
    ctx.fillStyle = brake ? 'rgb(255 50 60 / .9)' : col('#7a0a12', 1.2)
    ctx.beginPath(); ctx.ellipse(X(sx * .41), Y(.468), w * .055, h * .016, 0, 0, Math.PI * 2); ctx.fill()
  }
  // Rear bumper: the black diffuser wrapping round, two big oval tailpipes, the plate between them.
  ctx.fillStyle = col('#101114')
  ctx.beginPath()
  ctx.moveTo(X(-.46), Y(.22)); ctx.lineTo(X(-.15), Y(.2)); ctx.lineTo(X(-.13), Y(.215)); ctx.lineTo(X(.13), Y(.215)); ctx.lineTo(X(.15), Y(.2)); ctx.lineTo(X(.46), Y(.22))
  ctx.quadraticCurveTo(X(.47), Y(.12), X(.42), Y(.07)); ctx.lineTo(X(-.42), Y(.07)); ctx.quadraticCurveTo(X(-.47), Y(.12), X(-.46), Y(.22))
  ctx.closePath(); ctx.fill()
  for (const sx of [-1, 1]) {
    ctx.fillStyle = col('#c9cdd4'); ctx.beginPath(); ctx.ellipse(X(sx * .28), Y(.13), w * .07, h * .045, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#040405'; ctx.beginPath(); ctx.ellipse(X(sx * .28), Y(.13), w * .056, h * .033, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = col('#5a0a10'); ctx.fillRect(X(sx > 0 ? .38 : -.44), Y(.235), X(.06), h * .012)
  }
  ctx.fillStyle = col('#e4e2da')
  ctx.beginPath(); ctx.roundRect(X(-.1), Y(.2), X(.2), h * .085, w * .006); ctx.fill()
  ctx.fillStyle = col('#2a2d33')
  ctx.fillRect(X(-.07), Y(.17), X(.14), h * .028)
}

/** What the road's protection is in a form: nothing, paint only, or steel where it is needed. */
export type Regime = 'none' | 'soft' | 'hard'
export const regimeOf = (f: Form): Regime => f.coverage > .3 ? 'hard' : f.paintTint > .5 || f.paint > .5 ? 'soft' : 'none'

/** Our car's state beyond the road: `crash` seconds since we went over (-1 if not), `spawn` 0→1 fading back in. */
export type Hud = { kmh: number; rpm: number; gear: number }
/** A widening on the sea side: where the police wait, or where we pull in at the end. */
export type LayBy = { s: number; len: number; kind: 'police' | 'parking' }
export type Hero = {
  crash: number; spawn: number; lorry: { z: number; outcome: Cue['outcome'] } | null; braking: boolean; hud?: Hud | null
  /** Our car across the road and its heading off the road's line; the road camera's offset and turn. */
  u?: number; yaw?: number; cam?: { u: number; yaw: number }
  lays?: LayBy[]
  /** The free camera, for the closing shot; exhaust as the engine starts. */
  cine?: Cine | null; puff?: number
  /** Waiting for the first M: the arcade's INSERT COIN. */
  coin?: boolean
  /** How much of the moonlit bay shows, at the end. */
  bay?: number
  paused?: boolean
}
const HERO_IDLE: Hero = { crash: -1, spawn: 1, lorry: null, braking: false }
/** The car's centre when its right side rubs the barrier. */
const HERO_RAIL = ROAD.rail - .04 - HERO_W / 2


function drawHero(ctx: CanvasRenderingContext2D, v: View, f: Light, dusk: number, moon: number, t: number, hero: Hero, put: (tint: string, glyph: Glyph, x: number, y: number, size: number, alpha: number) => void) {
  const regime = regimeOf(f)
  const s = v.s0 + HERO_Z
  // Pulled over into a lay-by there is no barrier beside us, and nothing to push us back.
  const railed = regime === 'hard' && calm(s) < f.coverage && (hero.u ?? .35) < 1 && layWidth(hero.lays ?? [], s) < .3
  // When the lorry comes we squeeze over to the edge. Without steel, the right wheels stop on the lip;
  // with steel there, we go further and the barrier pushes back: the car scrapes along it and bounces in.
  const base = hero.u ?? .35
  let u = base + HERO_EDGE * swerve
  let contact = 0
  if (railed) {
    // Usually we just tuck in short of it; on a close one we hit it and it throws us back.
    const want = base + (HERO_RAIL - base + (extreme ? .45 : -.12)) * swerve
    contact = Math.max(0, want - HERO_RAIL) / .45
    u = Math.min(want, HERO_RAIL) - contact * .06 * (1 + Math.sin(t * 38))
  }
  // Over the edge: the car slides out past the lip, tips, and drops out of sight.
  const c = hero.crash
  let lift = 0, roll = 0, fade = 1
  if (c >= 0) {
    u += 3.2 * Math.min(c, 1.2) ** 2
    lift = c < .3 ? .25 * Math.sin(c / .3 * Math.PI) : -9 * (c - .3) ** 2
    roll = 1.6 * Math.min(1, c / 1.1) ** 1.5
    fade = 1 - smooth((c - .9) / .6)
  }
  const alpha = f.car * fade * hero.spawn
  const foot = project(v, u, HERO_Z, lift)
  const w = HERO_W * foot.k
  const h = HERO_H * foot.k
  // The car holds still on the screen; it only shudders against the barrier.
  const bob = contact * Math.sin(t * 61) * (3 + 6 * f.stones + 3 * f.logs)
  // Its own paint keeps its colour after dark: the road's lamps and the moon are on it.
  const light = Math.min(1, .82 + .18 * (1 - dusk) + .1 * moon)
  const brake = c >= 0 || contact > .1 || hero.braking
  const k = foot.k / 100
  if (alpha > .01 && foot.d > .3) {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(foot.x, foot.y + bob)
    if (roll) ctx.rotate(roll)
    ctx.fillStyle = 'rgb(0 0 0 / .4)'
    ctx.beginPath(); ctx.ellipse(0, 0, w * .56, h * .07, 0, 0, Math.PI * 2); ctx.fill()
    ctx.scale(k, k)
    drawCar(ctx, 170, 128, light, brake)
    ctx.restore()
  }
  // Gravel spitting off the edge from under the right wheel while we hug it, and a shower of it as we go.
  const spit = c >= 0 ? Math.max(0, 1 - c / 1.4) : railed ? 0 : Math.max(0, swerve - .4) * 1.7
  if (spit > .01) {
    const wheel = project(v, (c >= 0 ? ROAD.rail + LIP : u + HERO_W / 2 - .1), HERO_Z, 0)
    for (let k = 0; k < (c >= 0 ? 90 : 46); k++) {
      const a = hash(k * 17 + Math.floor(t * 30))
      const out = hash(k * 7)
      put(k % 3 ? color.scree : k % 2 ? color.gravel : color.rock, k % 2 ? '.' : ':', wheel.x + out * w * .5, wheel.y - a * h * .25 + out * out * h * (c >= 0 ? 1.4 : .6), 8 + hash(k * 3) * 14, spit * (.4 + .6 * a) * f.car)
    }
  }
  // What the hit throws up depends on what we hit: sparks off steel, splinters off timber, chips off rock.
  if (contact > .01 && f.car > .01) {
    const at = project(v, ROAD.rail - .02, HERO_Z, .5)
    const total = f.rail + f.logs + f.stones || 1
    const steel = f.rail / total, wood = f.logs / total, rock = f.stones / total
    ctx.save()
    if (steel > .05) {
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, w * .35)
      g.addColorStop(0, `rgb(255 220 150 / ${.6 * contact * steel * f.car})`)
      g.addColorStop(1, 'rgb(255 140 40 / 0)')
      ctx.fillStyle = g
      ctx.fillRect(at.x - w * .35, at.y - w * .35, w * .7, w * .7)
    }
    for (let k = 0; k < 120; k++) {
      const life = (t * 3 + hash(k * 13)) % 1
      const kind = hash(k * 19)
      const ang = -Math.PI / 2 - .2 - hash(k * 5) * 1.9
      const speed = (.3 + hash(k * 11) * .9) * w * (kind < steel ? 1.1 : .7)
      const x = at.x + Math.cos(ang) * speed * life
      const y = at.y + Math.sin(ang) * speed * life + life * life * h * (kind < steel ? 1.1 : 1.6)
      const a = Math.min(1, contact * 1.8) * f.car * (1 - life * .8)
      if (kind < steel) put(life < .3 ? '#fff4d6' : life < .6 ? color.amber : '#ff6a2a', life < .25 ? '*' : life < .6 ? '+' : '.', x, y, 14 + (1 - life) * 26, a)
      else if (kind < steel + wood) put(k % 3 ? WOOD : WOOD_DARK, k % 2 ? '-' : k % 3 ? '|' : 'x', x, y, 14 + (1 - life) * 20, a)
      else if (rock > .05) put(k % 3 ? WHITEWASH : color.rock, k % 2 ? '.' : k % 3 ? ':' : '#', x, y, 12 + (1 - life) * 20, a)
    }
    ctx.restore()
  }
  // Tail lights: on from dusk, bright when braking. Added on top, as light is.
  const lamp = (brake ? .9 : .15 + .55 * dusk) * alpha
  if (lamp > .02 && c < 0 && !roll) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const side of [-1, 1]) {
      if (foot.d < .3) continue
      const x = foot.x + side * .41 * w
      const y = foot.y + bob - .6 * foot.k
      const r = w * .16
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgb(255 60 60 / ${lamp * .7})`)
      g.addColorStop(1, 'rgb(255 40 40 / 0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    ctx.restore()
  }
}

const GO_X = 1300
const GO_Y = 690
/** The arcade card after we go over: GAME OVER, then a countdown to try again. */
function drawGameOver(ctx: CanvasRenderingContext2D, c: number) {
  const show = smooth((c - 1.4) / .3) * (1 - smooth((c - 4.1) / .3))
  if (show <= .01) return
  ctx.save()
  ctx.globalAlpha = show * .55
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = show
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 150px ui-monospace, Menlo, Consolas, monospace'
  ctx.fillStyle = '#7c1220'
  ctx.fillText('GAME OVER', GO_X + 7, GO_Y + 7)
  ctx.fillStyle = color.hard
  ctx.fillText('GAME OVER', GO_X, GO_Y)
  const left = Math.max(1, Math.ceil(4 - c))
  if (Math.floor(c * 3) % 2 === 0) {
    ctx.font = '700 54px ui-monospace, Menlo, Consolas, monospace'
    ctx.fillStyle = color.amber
    ctx.fillText(`CONTINUE? ${left}`, GO_X, GO_Y + 120)
  }
  ctx.restore()
}


// The viewpoint: a bay at night, the full moon high over it and its road of silver on the water,
// a dark headland on the left with a lighthouse, the coast on the right lit with a town along the shore.
const BAY_HORIZON = 560
const MOON = { x: 1330, y: 210, r: 30 }
const SHORE = (() => { const r = rng(91); return Array.from({ length: 150 }, () => ({ x: r(), up: r() ** 2.4, j: r() })) })()
/** The coast on the right: rising from the shore to a ridge, in sheet pixels. */
const coastTop = (x: number) => BAY_HORIZON + 4 - 34 * smooth((x - 1040) / 80) - Math.max(0, (x - 1080) / (W - 1080)) ** 1.3 * 260 - 18 * Math.sin(x / 70) * Math.max(0, (x - 1150) / 800)
const headTop = (x: number) => BAY_HORIZON + 2 - (14 + Math.max(0, 1 - ((x - 260) / 300) ** 2) * 95 + Math.max(0, 1 - ((x - 520) / 180) ** 2) * 40) * (1 - smooth((x - 600) / 150))

function drawBay(ctx: CanvasRenderingContext2D, t: number, dx: number) {
  ctx.save()
  ctx.translate(dx, HORIZON - BAY_HORIZON)
  ctx.beginPath(); ctx.rect(0, 0, W, H + BAY_HORIZON - HORIZON); ctx.clip()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  const put = (tint: string, glyph: Glyph, x: number, y: number, size: number, alpha: number) => {
    if (alpha <= .01) return
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.drawImage(sprite(tint), 64 * GLYPHS.indexOf(glyph), 0, 64, 64, x - size / 2, y - size / 2, size, size)
  }
  const glow = (x: number, y: number, r: number, sx: number, sy: number, stops: [number, string][]) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    for (const [at, c] of stops) g.addColorStop(at, c)
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r)
    ctx.restore()
  }
  // Sky: deep blue, a little paler towards the moon and the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, BAY_HORIZON)
  sky.addColorStop(0, '#02040c')
  sky.addColorStop(.7, '#0a1530')
  sky.addColorStop(1, '#122046')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, BAY_HORIZON + 2)
  for (const star of STARS) {
    const x = ((star.a + 3.2) / 6.4) * W
    const y = 20 + star.y * (BAY_HORIZON - 120)
    const away = Math.hypot(x - MOON.x, y - MOON.y)
    put(color.star, star.g, x, y, 8 + star.j * 6, Math.min(1, away / 500) * .8 * (.4 + .6 * Math.abs(Math.sin(t * .7 + star.j * 50))))
  }
  // The moon: a wide pale halo, a tighter glow, a white disc.
  ctx.globalCompositeOperation = 'lighter'
  glow(MOON.x, MOON.y, 520, 1, 1, [[0, '#3a4c7a66'], [.4, '#1c284a33'], [1, '#0a102000']])
  glow(MOON.x, MOON.y, MOON.r * 4.5, 1, 1, [[0, '#f4f2e8cc'], [.25, '#b8c6e866'], [1, '#6a7cb000']])
  glow(MOON.x, MOON.y, MOON.r, 1, 1, [[0, '#ffffff'], [.8, '#fbf8ee'], [1, '#e8ecf800']])
  ctx.globalCompositeOperation = 'source-over'
  // The sea, and the moon's road on it: a bright seam at the horizon, then a column breaking into glints.
  ctx.globalAlpha = 1
  const sea = ctx.createLinearGradient(0, BAY_HORIZON, 0, H)
  sea.addColorStop(0, '#0e1a3a')
  sea.addColorStop(.4, '#060c1e')
  sea.addColorStop(1, '#02040a')
  ctx.fillStyle = sea
  ctx.fillRect(0, BAY_HORIZON, W, H)
  ctx.save()
  ctx.beginPath(); ctx.rect(0, BAY_HORIZON + 1, W, H); ctx.clip()
  ctx.globalCompositeOperation = 'lighter'
  glow(MOON.x, BAY_HORIZON + 2, 140, 2.6, .07, [[0, '#e8eefcbb'], [1, '#9fb4e000']])
  glow(MOON.x, BAY_HORIZON + 2, H - BAY_HORIZON, .06, 1, [[0, '#c8d4f055'], [.5, '#8fa2d022'], [1, '#6a7cb000']])
  ctx.restore()
  ctx.globalCompositeOperation = 'lighter'
  for (const g of GLINTS) {
    const y = BAY_HORIZON + 5 + g.y * (H - BAY_HORIZON)
    const across = (g.x - .5) * 2
    const x = MOON.x + across * (MOON.r * 1.3 + g.y * 170) * (Math.abs(across) < .7 ? 1 : 1.7)
    const w = 8 + g.y * 32 + (1 - Math.abs(across)) * 12
    put(g.j < .5 ? '#f4f6ff' : '#b8c6e8', g.j < .5 ? '-' : '=', x, y, w, (1 - Math.abs(across) * .75) * (.2 + .8 * Math.abs(Math.sin(t * 1.6 + g.j * 40))))
  }
  ctx.globalCompositeOperation = 'source-over'
  // The headland on the left and the coast on the right, black against the sky.
  ctx.globalAlpha = 1
  ctx.fillStyle = '#03050b'
  ctx.beginPath(); ctx.moveTo(-10, BAY_HORIZON + 4)
  for (let x = -10; x <= 760; x += 10) ctx.lineTo(x, headTop(x))
  ctx.lineTo(760, BAY_HORIZON + 4); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#04060d'
  ctx.beginPath(); ctx.moveTo(1040, BAY_HORIZON + 6)
  for (let x = 1040; x <= W + 10; x += 10) ctx.lineTo(x, coastTop(x))
  ctx.lineTo(W + 10, BAY_HORIZON + 6); ctx.closePath(); ctx.fill()
  // A faint rim of moonlight on the ridges.
  for (let x = 1100; x <= W; x += 12) put(color.star, '.', x, coastTop(x), 8, .25 * hash(x))
  for (let x = 0; x <= 740; x += 12) put(color.star, '.', x, headTop(x), 8, .2 * hash(x + 9))
  // Lights: the town strung along the shore and up the slope, the promenade in a row, their streaks on
  // the water; a lighthouse on the headland's tip and two boats out in the bay.
  ctx.globalCompositeOperation = 'lighter'
  for (const p of SHORE) {
    const x = 1090 + p.x * (W - 1090)
    const top = coastTop(x)
    const y = BAY_HORIZON - p.up * (BAY_HORIZON - top - 14)
    const warm = p.j < .7
    const a = .55 + .45 * Math.sin(t * 2 + p.j * 60) ** 2
    put(warm ? color.amber : '#f4f2e8', '.', x, y, 9 + p.j * 6, a)
    if (p.up < .12) put(warm ? color.amber : '#f4f2e8', '|', x, BAY_HORIZON + 16 + p.j * 10, 10 + p.j * 10, a * .35)
  }
  for (let k = 0; k < 26; k++) {
    const x = 1110 + k * ((W - 1110) / 26)
    put('#fff1c4', '.', x, BAY_HORIZON + 2, 10, .9)
    put('#fff1c4', '|', x, BAY_HORIZON + 18, 14, .25)
  }
  for (let k = 0; k < 12; k++) put(color.amber, '.', 420 + k * 26 + hash(k) * 12, BAY_HORIZON - 2 - hash(k + 3) * 14, 9, .7)
  const beam = Math.max(0, Math.sin(t * 1.4)) ** 6
  glow(735, headTop(735) - 5, 22, 1, 1, [[0, `rgb(255 250 230 / ${.3 + .7 * beam})`], [1, 'rgb(255 250 230 / 0)']])
  for (const [x, y] of [[880, 640], [1560, 700]]) { put(color.paint, '.', x, y, 10, .8); put(color.amber, '.', x + 8, y, 8, .6) }
  ctx.globalCompositeOperation = 'source-over'
  ctx.restore()
}

/** A traffic officer in our lane: reflective vest, white helmet, right arm up with a STOP paddle. */
function drawOfficer(ctx: CanvasRenderingContext2D, v: View, z: number, u: number, _dusk: number, show: number, lit: number) {
  const light = Math.min(1.4, .45 + .7 * lit)
  ctx.globalAlpha = Math.min(1, show * 1.5)
  // A traffic police officer: navy uniform, black boots, hi-vis vest with silver bands and POLICÍA
  // across the chest, white gloves, a navy cap with the chequered band, a whistle on a white cord.
  const navy = '#1b2547'
  box(ctx, v, u - .13, z, .24, .17, 0, .14, '#0b0c10', light)
  box(ctx, v, u + .13, z, .24, .17, 0, .14, '#0b0c10', light)
  box(ctx, v, u - .13, z, .22, .17, .14, .92, navy, light)
  box(ctx, v, u + .13, z, .22, .17, .14, .92, navy, light)
  box(ctx, v, u, z, .24, .48, .88, .96, '#111318', light)
  box(ctx, v, u, z, .26, .5, .96, 1.5, '#d8f02a', light)
  for (const h of [1.0, 1.08]) panel(ctx, v, u, z - .01, -.25, .25, h, h + .035, shade('#e8ecf0', light * 1.25))
  panel(ctx, v, u, z - .01, -.25, .25, 1.24, 1.37, shade(navy, light))
  {
    const a = project(v, u, z - .02, 1.305)
    ctx.fillStyle = shade('#ffffff', light * 1.1)
    ctx.font = `800 ${Math.max(4, a.k * .085)}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('POLICÍA', a.x, a.y)
  }
  // Left arm down in a navy sleeve, right arm out holding the paddle; white gloves.
  box(ctx, v, u - .32, z, .16, .13, 1.0, 1.48, navy, light)
  box(ctx, v, u - .32, z, .16, .13, .9, 1.0, '#f4f4f4', light)
  box(ctx, v, u + .42, z - .05, .14, .4, 1.34, 1.46, navy, light)
  box(ctx, v, u + .64, z - .06, .12, .1, 1.3, 1.44, '#f4f4f4', light)
  // Whistle cord across the chest.
  panel(ctx, v, u, z - .02, .04, .07, 1.38, 1.48, shade('#ffffff', light))
  box(ctx, v, u, z, .2, .2, 1.5, 1.66, '#c99a7a', light)
  // Cap: navy crown, chequered black-and-white band, black peak.
  box(ctx, v, u, z, .26, .27, 1.7, 1.8, navy, light)
  for (let k = 0; k < 6; k++) panel(ctx, v, u, z - .01, -.135 + k * .045, -.09 + k * .045, 1.66, 1.7, shade(k % 2 ? '#111111' : '#f4f4f4', light))
  box(ctx, v, u, z - .1, .1, .27, 1.65, 1.67, '#0b0c10', light)
  // The paddle, held out at arm's length: a red octagon with a white rim and STOP, on a short handle.
  const c = project(v, u + .68, z - .08, 1.62)
  const r = .34 * c.k
  const hand = project(v, u + .68, z - .08, 1.3)
  ctx.fillStyle = shade('#8b929c', light)
  ctx.fillRect(c.x - Math.max(1, r * .06), c.y, Math.max(2, r * .12), hand.y - c.y + r * .2)
  const octagon = (rad: number) => {
    ctx.beginPath()
    for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; ctx.lineTo(c.x + rad * Math.cos(a), c.y + rad * Math.sin(a)) }
    ctx.closePath(); ctx.fill()
  }
  ctx.fillStyle = '#ffffff'; octagon(r)
  ctx.fillStyle = color.hard; octagon(r * .86)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${Math.max(6, r * .5)}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('STOP', c.x, c.y + r * .04)
}

/** The patrol car on the shoulder, light bar flashing blue. */
function drawPatrol(ctx: CanvasRenderingContext2D, v: View, z: number, u: number, dusk: number, show: number, t: number, lit: number, lights: (() => void)[]) {
  const light = Math.min(1.3, .4 + .65 * lit)
  ctx.globalAlpha = Math.min(1, show * 1.5)
  box(ctx, v, u, z + 1, 2.4, 1.6, .9, 1.45, '#e9ecef', light)
  box(ctx, v, u, z, 4.4, 1.8, .25, .95, '#e9ecef', light)
  panel(ctx, v, u, z, -.9, .9, .5, .7, shade('#1b3fa0', light))
  for (let k = 0; k < 12; k++) panel(ctx, v, u, z - .005, -.9 + k * .15, -.75 + k * .15, .7, .76, shade(k % 2 ? '#1b3fa0' : '#f4f4f4', light))
  {
    const a = project(v, u, z - .01, .6)
    ctx.fillStyle = shade('#ffffff', light)
    ctx.font = `800 ${Math.max(4, a.k * .13)}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('POLICÍA', a.x, a.y)
  }
  panel(ctx, v, u, z + 1, -.7, .7, .98, 1.4, shade('#3a4a66', light))
  box(ctx, v, u, z + 1.6, .3, 1.2, 1.45, 1.6, '#20242b', light)
  const flash = Math.sin(t * 9) > 0
  lights.push(() => {
    for (const [du, on] of [[-.4, flash], [.4, !flash]] as const) {
      const p = project(v, u + du, z + 1.6, 1.56)
      const halo = Math.max(6, .2 * p.k) * (5 + 6 * dusk)
      const a = (on ? 1 : .15) * show * (.5 + .5 * dusk)
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo)
      g.addColorStop(0, `rgb(80 140 255 / ${a})`)
      g.addColorStop(.3, `rgb(60 110 255 / ${a * .35})`)
      g.addColorStop(1, 'rgb(60 110 255 / 0)')
      ctx.globalAlpha = 1
      ctx.fillStyle = g
      ctx.fillRect(p.x - halo, p.y - halo, halo * 2, halo * 2)
    }
  })
}

/** Spanish warning sign P-14: dangerous bends, first one to the right (or left). */
function drawSBend(ctx: CanvasRenderingContext2D, v: View, z: number, s: number, right: boolean, f: Light, _dusk: number, fog: number) {
  const u = leftEdge(s) - .45
  const top = project(v, u, z, 2.3)
  const base = project(v, u, z, 1.35)
  const h = base.y - top.y
  const w = h * 1.15
  const alpha = fog * f.chevron * Math.min(1, Math.max(0, (z - 4) / 4)) * Math.max(.35, f.paint)
  if (alpha <= .01 || top.x < -80 || top.x > W + 80 || h < 3) return
  ctx.globalAlpha = alpha
  const post = project(v, u, z, 0)
  ctx.fillStyle = color.steel
  ctx.fillRect(top.x - Math.max(1, w * .03), base.y - h * .2, Math.max(2, w * .06), post.y - base.y + h * .2)
  ctx.fillStyle = color.hard
  ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x + w / 2, base.y); ctx.lineTo(top.x - w / 2, base.y); ctx.closePath(); ctx.fill()
  ctx.fillStyle = color.paint
  const k = .26
  ctx.beginPath(); ctx.moveTo(top.x, top.y + h * k * 1.3); ctx.lineTo(top.x + w * (.5 - k * .6), base.y - h * k * .45); ctx.lineTo(top.x - w * (.5 - k * .6), base.y - h * k * .45); ctx.closePath(); ctx.fill()
  // The road as a thick black S, bottom to top.
  const d = right ? 1 : -1
  ctx.strokeStyle = '#0d0f12'
  ctx.lineWidth = Math.max(1.5, w * .07)
  ctx.lineCap = 'round'
  const x = top.x, y0 = base.y - h * .24, y1 = top.y + h * .42
  ctx.beginPath()
  ctx.moveTo(x - d * w * .04, y0)
  ctx.bezierCurveTo(x + d * w * .16, y0 - (y0 - y1) * .35, x - d * w * .16, y0 - (y0 - y1) * .65, x + d * w * .04, y1)
  ctx.stroke()
  ctx.lineCap = 'butt'
}

/** Spanish warning sign P-17a, "road narrows": white triangle, red rim, at the foot of the cut. */
function drawNarrows(ctx: CanvasRenderingContext2D, v: View, z: number, s: number, f: Light, _dusk: number, fog: number) {
  const u = leftEdge(s) - .45
  const top = project(v, u, z, 2.3)
  const base = project(v, u, z, 1.35)
  const h = base.y - top.y
  const w = h * 1.15
  const alpha = fog * f.chevron * Math.min(1, Math.max(0, (z - 4) / 4))
  if (alpha <= .01 || top.x < -80 || top.x > W + 80) return
  ctx.globalAlpha = alpha
  const post = project(v, u, z, 0)
  ctx.fillStyle = color.steel
  ctx.fillRect(top.x - Math.max(1, w * .03), base.y - h * .2, Math.max(2, w * .06), post.y - base.y + h * .2)
  ctx.fillStyle = color.hard
  ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x + w / 2, base.y); ctx.lineTo(top.x - w / 2, base.y); ctx.closePath(); ctx.fill()
  ctx.fillStyle = color.paint
  const k = .26
  ctx.beginPath(); ctx.moveTo(top.x, top.y + h * k * 1.3); ctx.lineTo(top.x + w * (.5 - k * .6), base.y - h * k * .45); ctx.lineTo(top.x - w * (.5 - k * .6), base.y - h * k * .45); ctx.closePath(); ctx.fill()
  // Two road edges, the left one bending in.
  ctx.strokeStyle = '#0d0f12'
  ctx.lineWidth = Math.max(1, w * .05)
  const y0 = base.y - h * .2, y1 = top.y + h * .45, x = top.x
  ctx.beginPath(); ctx.moveTo(x + w * .1, y0); ctx.lineTo(x + w * .1, y1); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - w * .14, y0); ctx.lineTo(x - w * .14, y0 - h * .12); ctx.lineTo(x - w * .03, y1 + h * .1); ctx.lineTo(x - w * .03, y1); ctx.stroke()
}

/** Spanish curve panel (TB-2): a blue board with two white chevrons pointing into the bend, white rim, on a grey post. Retroreflective: it glows at night. */
function drawChevron(ctx: CanvasRenderingContext2D, v: View, z: number, s: number, f: Light, dusk: number, fog: number, _put: (tint: string, glyph: Glyph, x: number, y: number, size: number, alpha: number) => void) {
  const right = curvature(s) > 0
  const u = right ? leftEdge(s) - .45 : ROAD.rail + LIP + .1
  const top = project(v, u, z, 1.65)
  const bottom = project(v, u, z, 1.05)
  const h = bottom.y - top.y
  const w = h * 1.35
  const alpha = fog * f.chevron * (.7 + .3 * dusk) * Math.min(1, Math.max(0, (z - 5) / 4))
  if (alpha <= .01 || top.x < -80 || top.x > W + 80 || h < 2) return
  ctx.globalAlpha = alpha
  const post = project(v, u, z, 0)
  ctx.fillStyle = '#9aa1ab'
  ctx.fillRect(top.x - Math.max(1, w * .035), bottom.y - 1, Math.max(2, w * .07), post.y - bottom.y + 1)
  // Board with a white rim; a soft blue halo once the headlights catch it.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(top.x - w / 2, top.y, w, h)
  const rim = Math.max(1, h * .07)
  ctx.fillStyle = color.chevron
  ctx.fillRect(top.x - w / 2 + rim, top.y + rim, w - 2 * rim, h - 2 * rim)
  // Two fat chevrons pointing where the road goes.
  ctx.fillStyle = '#ffffff'
  const dir = right ? 1 : -1
  const ch = h * .62, cw = w * .2, th = w * .1
  for (const off of [-.17, .13]) {
    const cx = top.x + dir * off * w
    const cy = top.y + h / 2
    ctx.beginPath()
    ctx.moveTo(cx - dir * cw / 2, cy - ch / 2)
    ctx.lineTo(cx - dir * cw / 2 + dir * th, cy - ch / 2)
    ctx.lineTo(cx + dir * cw / 2 + dir * th, cy)
    ctx.lineTo(cx - dir * cw / 2 + dir * th, cy + ch / 2)
    ctx.lineTo(cx - dir * cw / 2, cy + ch / 2)
    ctx.lineTo(cx + dir * cw / 2, cy)
    ctx.closePath(); ctx.fill()
  }
}

/** Live field: requestAnimationFrame loop with eased form and light changes. */
// The opening, in seconds after the coin: the engine catches, settles, and we pull away.
const INTRO = { end: 1.4 }
const ease = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c < .5 ? 4 * c ** 3 : 1 - (-2 * c + 2) ** 3 / 2 }
/** How far we move across into the lay-by at the end, and how long the swing round takes. */
const PARK_U = 4.8
const OUTRO_SWING = 5.5

export class RoadField {
  private from: Light
  private to: Light
  private changed = 0
  private frame = 0
  private travel = 85
  private last = performance.now()
  /** Seconds of drive time; it stands still while paused. */
  private clock = 0
  private paused = false
  /** At the start, nothing moves until the first M: the coin in the slot. */
  private waiting = false
  // The game: when we last went over (clock seconds, -1 if we are on the road) and when we came back.
  private crashAt = -1
  private spawnAt = -1e9
  private armed = true
  // The drive: real speed in km/h, the gear we are in and the engine's revs.
  private kmh = 120
  private gear = 3
  private rpm = 4000
  private braking = false
  // The sheet's script: its lorries, when the sheet opened, which cues have gone, the lorry on the road.
  private cues: Cue[] = []
  private sheetAt = 0
  private fired = 0
  private lorry: { z: number; outcome: Cue['outcome'] } | null = null
  // The opening and the closing, the lay-bys on the road, where the car and the camera are across it.
  private intro: number | null = null
  private outro: { phase: 'drive' | 'swing'; s: number; at: number } | null = null
  private lays: LayBy[] = []
  private heroU = .35
  private heroYaw = 0
  private camU = 0
  private camYaw = 0
  private spare: HTMLCanvasElement | null = null

  constructor(private canvas: HTMLCanvasElement, private reduced: boolean, name: FormName, dusk: number) {
    this.from = this.to = { ...FORMS[name], dusk }
    if (this.to.intro && !reduced) this.startIntro()
    this.resize()
    this.loop()
  }

  setForm(name: FormName, dusk: number) {
    const was = this.to
    this.from = this.current(performance.now())
    this.to = { ...FORMS[name], dusk }
    this.changed = performance.now()
    if (this.to.intro && !was.intro && !this.reduced) this.startIntro()
    // Leaving the first sheet without a coin: start anyway.
    if (!this.to.intro && this.waiting) { this.waiting = false; this.intro = this.clock }
    if (this.reduced) this.paint(performance.now())
  }

  /** A new sheet: start its script from the top. */
  setScript(cues: Cue[] = []) {
    this.cues = [...cues].sort((a, b) => a.at - b.at)
    this.sheetAt = this.clock
    this.fired = 0
  }

  /** M: the first one starts the game, after that it freezes the drive and lets it go again. */
  togglePause() {
    if (this.waiting) { this.waiting = false; this.intro = this.clock; return }
    this.paused = !this.paused
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    // The road is a backdrop: render it at sheet resolution at most, it does not need retina sharpness.
    const scale = Math.min(1, Math.max(.5, (rect.width / W) * devicePixelRatio))
    this.canvas.width = Math.round(W * scale)
    this.canvas.height = Math.round(H * scale)
    this.paint(performance.now())
  }

  dispose() { cancelAnimationFrame(this.frame) }

  private current(now: number) {
    const k = this.reduced ? 1 : Math.min(1, (now - this.changed) / EASE_MS)
    return mix(this.from, this.to, 1 - (1 - k) ** 3)
  }

  /** The straightest, most level stretch of `ahead` metres starting within `span` metres of `from`, clear of the narrowings. */
  private straight(from: number, ahead: number, span = 320) {
    let best = from, score = Infinity
    for (let s = from; s < from + span; s += 4) {
      let worst = 0
      for (let d = -15; d <= ahead; d += 4) worst = Math.max(worst, Math.abs(curvature(s + d)) / C_MAX + 25 * Math.abs(grade(s + d) - grade(s)) + 3 * pinch(s + d))
      if (worst < score) { score = worst; best = s }
    }
    return best
  }

  /** Back to the start: the car on the gravel at the foot of a straight, engine off, waiting for a coin. */
  private startIntro() {
    this.travel = this.straight(this.travel, 100, 3000) - 20
    this.intro = null
    this.waiting = true
    this.paused = false
    this.kmh = 0; this.gear = 0; this.rpm = 0
    this.lorry = null; this.crashAt = -1; this.outro = null
    this.lays = []; this.heroU = .35; this.heroYaw = 0; this.camU = 0; this.camYaw = 0
  }

  private base(crash: number, spawn: number): Hero {
    return {
      crash, spawn, lorry: this.lorry, braking: this.braking || this.kmh < 1,
      hud: this.reduced ? null : { kmh: this.kmh, rpm: this.rpm, gear: this.gear },
      u: this.heroU, yaw: this.heroYaw, cam: { u: this.camU, yaw: this.camYaw }, lays: this.lays,
      paused: this.paused, coin: this.waiting,
    }
  }

  /** Lay one frame over another, through a spare canvas, for the moment the two cameras meet. */
  private over(alpha: number, paint: (c: HTMLCanvasElement) => void) {
    if (alpha <= .01) return
    this.spare ??= document.createElement('canvas')
    if (this.spare.width !== this.canvas.width || this.spare.height !== this.canvas.height) { this.spare.width = this.canvas.width; this.spare.height = this.canvas.height }
    paint(this.spare)
    const ctx = this.canvas.getContext('2d')!
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(1, alpha)
    ctx.drawImage(this.spare, 0, 0)
    ctx.restore()
  }

  private paint(now: number) {
    const light = this.current(now)
    const dt = this.paused || this.waiting || this.reduced ? 0 : Math.min(.1, (now - this.last) / 1000)
    this.last = now
    this.clock += dt
    const t = this.clock
    if (this.intro !== null && t - this.intro >= INTRO.end) this.intro = null
    if (this.waiting) { draw(this.canvas, light, this.travel, t, this.base(-1, 1)); return }
    if (this.intro !== null) { this.paintIntro(light, t - this.intro); return }
    this.police()
    this.closing(light)
    if (this.outro?.phase === 'swing') { this.paintOutro(light, t - this.outro.at); return }
    let crash = this.crashAt < 0 ? -1 : t - this.crashAt
    // After the countdown, start again a little further on, with the lorry gone.
    if (crash > 4.4) { this.crashAt = -1; crash = -1; this.travel += 60; this.spawnAt = t; this.armed = false; this.lorry = null; this.kmh = 50; this.gear = 1 }
    // Once over the edge the camera stops at the lip and watches.
    const pace = crash < 0 ? 1 : Math.max(0, 1 - crash * 2.5)
    if (!this.reduced) {
      if (crash < 0) this.drive(light, dt)
      else { this.kmh = Math.max(0, this.kmh - dt * 120); this.braking = true }
      this.travel += dt * this.kmh / 3.6 * WORLD * pace
      this.script(dt * pace)
    }
    const spawn = Math.min(1, (t - this.spawnAt) / .9)
    const peak = draw(this.canvas, light, this.travel, t, this.base(crash, spawn))
    // The close pass: the script says whether this one puts us over. Steel never lets us.
    if (this.reduced || crash >= 0) return
    if (peak > .8 && this.armed) {
      this.armed = false
      if (this.lorry?.outcome === 'crash' && regimeOf(light) !== 'hard' && light.car > .6) this.crashAt = t
    } else if (peak < .2) this.armed = true
  }

  /** The coin is in: the engine catches with a puff of exhaust, the revs settle, and then we drive. */
  private paintIntro(light: Light, k: number) {
    this.rpm = k < .4 ? 2600 : 900
    draw(this.canvas, light, this.travel, this.clock, { ...this.base(-1, 1), braking: true, puff: Math.min(1, k) })
  }

  /** The stop: a lay-by comes into view far ahead with the police in it, and we brake to halt short of the officer. */
  private police() {
    const ahead = this.lays.find(l => l.kind === 'police' && l.s + l.len > this.travel)
    if (this.to.stop > .5 && !ahead && this.intro === null) this.lays.push({ s: this.travel + LENGTH - 4, len: 30, kind: 'police' })
    this.lays = this.lays.filter(l => l.s + l.len + 25 > this.travel || (l.kind === 'parking' && this.outro))
  }

  /** Where the car has to stop, if anywhere: short of the officer, or inside the lay-by at the end. */
  private stopAt() {
    if (this.outro) return this.outro.s + 16
    const lay = this.lays.find(l => l.kind === 'police' && l.s + 8 > this.travel + HERO_Z)
    return this.to.stop > .5 && lay ? lay.s - 4.7 : null
  }

  /**
   * The closing. Once the last sheet is up we look for the next straight, with a lay-by over the bay at
   * the far end of it; we pull across into it and stop, and then the camera swings round to the side.
   */
  private closing(light: Light) {
    if (this.to.bay < .5) {
      if (this.outro) { this.outro = null; this.lays = this.lays.filter(l => l.kind !== 'parking'); this.heroU = .35; this.heroYaw = 0; this.camU = 0; this.camYaw = 0 }
      return
    }
    if (!this.outro) {
      const s = this.straight(this.travel + LENGTH - 8, 60)
      this.outro = { phase: 'drive', s, at: 0 }
      this.lays = this.lays.filter(l => l.kind !== 'parking').concat({ s, len: 40, kind: 'parking' })
    }
    if (this.outro.phase !== 'drive') return
    const rear = this.travel + HERO_Z
    const x = Math.min(1, Math.max(0, (rear - (this.outro.s - 8)) / 20))
    this.heroU = .35 + PARK_U * smooth(x)
    this.heroYaw = Math.atan(PARK_U * 6 * x * (1 - x) / 20)
    const cx = Math.min(1, Math.max(0, (rear - (this.outro.s - 4)) / 22))
    this.camU = PARK_U * smooth(cx)
    if (x >= 1 && this.kmh < .5) { this.kmh = 0; this.outro = { ...this.outro, phase: 'swing', at: this.clock } }
    void light
  }

  /** The last shot: the car stays parked and the camera turns to the right, out over the moonlit bay. */
  private paintOutro(light: Light, k: number) {
    const e = ease(k / OUTRO_SWING)
    const yaw = (Math.PI / 2 - .2) * e
    const cam: Cine = { x: this.camU, y: CAM_H, z: 0, yaw }
    this.rpm = 900
    draw(this.canvas, light, this.travel, this.clock, { ...this.base(-1, 1), cine: cam, hud: null, yaw: 0, bay: smooth((yaw - .45) / .8) })
    // The first instant: the drive's frame, fading into the free camera's identical one.
    if (k < .4) this.over(1 - k / .4, c => draw(c, light, this.travel, this.clock, this.base(-1, 1)))
  }

  /**
   * Drive like the car would: flat out on the straights, brake hard enough to make each bend at
   * its own speed, accelerate out of it, change gear on the way. The sheet sets the ceiling; a stop
   * ahead (the police, the lay-by at the end) brings us to rest exactly there.
   */
  private drive(light: Light, dt: number) {
    const ceiling = TOP_KMH * Math.max(0, light.speed) / 7
    let allowed = ceiling
    // Each bend's speed is set by its tightest point, and we must be down to it where the bend begins:
    // so look a little past each point for the apex, and plan the braking with some margin in hand.
    const at = this.travel + HERO_Z
    for (let d = 0; d <= 200; d += 3) {
      let sharp = 0
      for (let a = 0; a <= 40; a += 5) sharp = Math.max(sharp, Math.abs(curvature(at + d + a)) / C_MAX)
      if (sharp < .08) continue
      const corner = 235 - 180 * Math.min(1, sharp) ** .6
      allowed = Math.min(allowed, 3.6 * Math.sqrt((corner / 3.6) ** 2 + 2 * PLAN * d / WORLD))
    }
    const stop = this.stopAt()
    if (stop !== null) {
      const d = stop - (this.travel + HERO_Z)
      allowed = Math.min(allowed, d <= .05 ? 0 : 3.6 * Math.sqrt(2 * PLAN * d / WORLD))
      if (d <= .05 && this.kmh < 8) this.kmh = 0
    }
    const ms = this.kmh / 3.6
    let acc: number
    // On the brakes as soon as we reach the planned curve, and harder if we are over it.
    if (this.kmh > allowed + .5) acc = -Math.min(BRAKE * 1.3, PLAN + (this.kmh - allowed) / 3.6 * 3)
    else {
      // Pull: strong low down, fading towards the top; climbs cost, descents give.
      acc = Math.max(.4, 9.5 * (1 - this.kmh / 330)) - 9.8 * grade(this.travel + HERO_Z)
      if (this.kmh > allowed - 4) acc = Math.min(acc, (allowed - this.kmh) / 3.6 * 2)
    }
    this.braking = acc < -2.5
    this.kmh = Math.max(0, (ms + acc * dt) * 3.6)
    // Seven-speed box: up near the redline, down as the revs fall under braking.
    const revs = (g: number) => this.kmh < 3 && g === 0 ? 900 : 1000 + 6500 * this.kmh / GEAR_TOP[g]
    if (revs(this.gear) > 7300 && this.gear < GEAR_TOP.length - 1) this.gear++
    else if (this.gear > 0 && revs(this.gear) < (this.braking ? 4200 : 2400)) this.gear--
    const target = Math.max(900, revs(this.gear))
    this.rpm += (target - this.rpm) * Math.min(1, dt * 12)
  }

  /** Send the next lorry when its cue comes up, and move the one on the road. */
  private script(dt: number) {
    // Oncoming at its own 7 m/s plus ours.
    const closing = this.kmh / 3.6 * WORLD + 7
    if (this.lorry) {
      this.lorry.z -= dt * closing
      if (this.lorry.z < -60) this.lorry = null
    }
    const cue = this.cues[this.fired]
    if (!cue || this.lorry || this.crashAt >= 0 || this.clock - this.sheetAt < cue.at) return
    if (cue.outcome === 'crash') {
      // Wait for the pass to fall on a left-hand bend, where we are on the outside; give up after 20 s.
      const meet = this.travel + this.kmh / 3.6 * WORLD * (LENGTH - Z_MIN) / closing
      const late = this.clock - this.sheetAt - cue.at > 20
      if (!late && curvature(meet + HERO_Z) / C_MAX > -.35) return
    }
    this.lorry = { z: LENGTH, outcome: cue.outcome }
    this.fired++
  }

  private loop = () => {
    if (this.reduced) return
    this.paint(performance.now())
    this.frame = requestAnimationFrame(this.loop)
  }
}

/** One static frame, for print, presenter previews and reduced motion. */
export function drawStatic(canvas: HTMLCanvasElement, name: FormName, dusk: number) {
  canvas.width = W
  canvas.height = H
  draw(canvas, { ...FORMS[name], dusk }, 85, 2)
}

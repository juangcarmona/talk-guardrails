// The recurring piece: a mountain pass drawn in glyphs, seen from the driver's seat.
// Painted lines and the blue curve chevrons are the soft guardrails (they tell you,
// you can still go over them); the red and white barrier between the road and the
// ravine is the hard one (it stops you). The talk starts at sunset and ends at night.
// Each scene names a form and a light; the field eases from one to the next.

import { blend, color, mix as tone, rng, sky } from './palette'
import { FORMS, type Form, type FormName } from './forms'

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
const TURN_MS = 3200

// Lateral positions across the road, in metres from the camera. We drive on the
// right, as in Spain: the mountain wall on the left, the ravine on our right.
// Narrow mountain shoulders: a hand's width of gravel at the foot of the cut, a step between the line and the barrier.
export const ROAD = { leftEdge: -4.8, centre: -1.3, rightEdge: 2.15, rail: 2.4 }
/** The lip of the drop, just past the barrier posts. */
const LIP = .25

// The road's line on the map (X) and its rise (Y), in metres along the road.
const X = (s: number) => 18 * Math.sin(s / 40) + 7 * Math.sin(s / 17 + 1.3)
const dX = (s: number) => (18 / 40) * Math.cos(s / 40) + (7 / 17) * Math.cos(s / 17 + 1.3)
const curvature = (s: number) => -(18 / 1600) * Math.sin(s / 40) - (7 / 289) * Math.sin(s / 17 + 1.3)
const C_MAX = 18 / 1600 + 7 / 289
const Y = (s: number) => 2.2 * Math.sin(s / 55) + .8 * Math.sin(s / 21)
const dY = (s: number) => (2.2 / 55) * Math.cos(s / 55) + (.8 / 21) * Math.cos(s / 21)
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

type View = { s0: number; heading: number; slope: number; x0: number; y0: number }

function view(s0: number): View {
  return { s0, heading: dX(s0), slope: dY(s0), x0: X(s0), y0: Y(s0) }
}

// When the lorry comes through, we flinch: 0 normally, 1 with our wheels on the edge of the drop.
let swerve = 0
/** How far the lorry leans towards us as it passes (negative: towards the wall). */
let drift = 0
/** This pass is a close one: with protection there, we hit it. */
let extreme = false
const SWERVE_U = 2.25

/** A point `z` metres ahead, `u` across, `h` up, to sheet pixels, following the bends. */
function project(v: View, u: number, z: number, h: number) {
  const k = FOCAL / z
  const bend = X(v.s0 + z) - v.x0 - v.heading * z
  const rise = Y(v.s0 + z) - v.y0 - v.slope * z
  // Pulling right also points the nose a little towards the edge, more so far ahead.
  const cam = SWERVE_U * swerve * Math.min(1, 6 / z + .35)
  return { x: VPX + (u - cam + bend) * k, y: HORIZON + (CAM_H - h - rise) * k, k }
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

/** Draw one frame: `travel` metres along the road, `t` seconds of clock (for twinkle). */
export function draw(canvas: HTMLCanvasElement, f: Light, travel: number, t: number, hero: Hero = HERO_IDLE) {
  const ctx = canvas.getContext('2d')!
  const scale = canvas.width / W
  const show = Math.min(1, Math.max(0, (f.head - .1) * 3))
  // We only flinch towards the edge where nothing would stop us: paint, or no barrier at all.
  // Without even paint, the lorry takes its half out of the middle; with lines it keeps to its side.
  drift = regimeOf(f) === 'none' ? .7 : -.35
  swerve = 0
  extreme = false
  TRAFFIC.forEach((truck, k) => {
    if (truck.kind !== 'truck') return
    const gap = (((truck.s0 - travel * 1.9) % truck.period) + truck.period) % truck.period
    const near = flinch(gap < truck.period / 2 ? gap : gap - truck.period)
    if (near <= swerve) return
    swerve = near
    // Only some passes are close enough to put us into the protection: a sharp bend, or bad luck.
    const lap = Math.floor((travel * 1.9 - truck.s0 + truck.period / 2) / truck.period)
    extreme = Math.abs(curvature(travel + HERO_Z)) / C_MAX > .75 || hash(lap * 31 + k * 7) < .3
  })
  swerve *= show * Math.min(1, f.speed / 3)
  // Lean towards the drop and shudder on the rumble of the edge; zoom a touch so the corners stay covered.
  const amp = (2 + 7 * swerve) * swerve
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  // At the viewpoint we turn right: the road slides off to the left as the bay comes in.
  const turn = smooth(f.bay)
  if (turn > .999) { drawBay(ctx, t, 0); return 0 }
  ctx.translate(-turn * W, 0)
  ctx.translate(W / 2 + Math.sin(t * 53) * amp, H / 2 + Math.sin(t * 71) * amp * .7)
  ctx.rotate(.05 * swerve)
  ctx.scale(1 + .08 * swerve, 1 + .08 * swerve)
  ctx.translate(-W / 2, -H / 2)
  const v = view(travel)
  const dusk = Math.min(1, Math.max(0, f.dusk))
  const yaw = Math.atan(v.heading)
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
  const put = (tint: string, glyph: Glyph, x: number, y: number, size: number, alpha: number) => {
    if (alpha <= .01 || x < -40 || x > W + 40 || y < -40 || y > H + 40) return
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.drawImage(sprite(tint), 64 * GLYPHS.indexOf(glyph), 0, 64, 64, x - size / 2, y - size / 2, size, size)
  }
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

  // Light on the road: daylight fades, headlights reach the nearest twenty-odd metres.
  const lit = (z: number) => (1 - .7 * dusk) + .3 * moon + dusk * 1.4 * Math.exp(-z / 24)
  const fogOf = (z: number) => Math.min(1, Math.max(0, 1.15 - z / LENGTH)) * Math.min(1, (z - Z_MIN) / 1.2)

  // Chevrons on the outside of the sharpest bends, every 7 m.
  const signs: { z: number; s: number; warn?: boolean }[] = []
  for (let k = Math.ceil((travel + Z_MIN) / 7); k * 7 < travel + LENGTH; k++) if (Math.abs(curvature(k * 7)) > .62 * C_MAX) signs.push({ z: k * 7 - travel, s: k * 7 })

  // Land, from far to near.
  const land: { z: number; p: Particle }[] = []
  for (const p of PARTICLES) land.push({ z: Z_MIN + (((p.s - travel) % LENGTH) + LENGTH) % LENGTH, p })
  land.sort((a, b) => b.z - a.z)

  // Oncoming traffic, far to near, and a shudder when the lorry goes by close.
  const traffic = TRAFFIC.map(car => ({ car, z: Z_MIN + (((car.s0 - travel * 1.9) % car.period) + car.period) % car.period })).filter(c => c.z < LENGTH).sort((a, b) => b.z - a.z)
  const lights: (() => void)[] = []

  // Stage 4: a traffic officer steps into our lane with a STOP paddle, the patrol car on the shoulder, and we stop.
  const props: { z: number; paint: () => void }[] = []
  if (f.stop > .01) {
    const oz = lerp(36, 6.2, f.stop)
    props.push({ z: oz + 9, paint: () => drawPatrol(ctx, v, oz + 9, dusk, f.stop, t, lit(oz + 9), lights) })
    props.push({ z: oz, paint: () => drawOfficer(ctx, v, oz, dusk, f.stop, lit(oz)) })
  }

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
  let li = 0
  let si = signs.length - 1
  let ti = 0
  let pi = 0
  for (let i = 0, z = Z_MIN + LENGTH; z > Z_MIN; i++, z /= 1 + ROW) {
    // Terrain strip between the previous row and this one first.
    const s = travel + z
    const left = leftEdge(s)
    const edges = [project(v, left - WALL_BACK, z, WALL_H), project(v, left - .2, z, 0), project(v, ROAD.rail + LIP, z, 0), project(v, ROAD.rail + LIP, z, -25), project(v, ROAD.rail + LIP, z, CLIFF), project(v, ROAD.rail + LIP, z, -90)]
    if (prev) {
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
    // Then whatever stands on the strip just drawn, far to near.
    for (; li < land.length && land[li].z >= z; li++) {
      const { z: lz, p } = land[li]
      if (p.loose && f.gravel < .01) continue
      // The narrowing pushes the cut into the road; the asphalt squeezes between the cut and the barrier.
      const at = travel + lz
      const u = p.u < ROAD.leftEdge ? p.u + PINCH_WIDTH * pinch(at)
        : p.road ? ROAD.rail - (ROAD.rail - p.u) * (ROAD.rail - leftEdge(at)) / (ROAD.rail - ROAD.leftEdge) : p.u
      const pt = project(v, u, lz, p.h)
      const sc = p.scale ?? 1
      const size = Math.min(30 * sc, Math.max(4, pt.k * .16 * sc))
      const alpha = fogOf(lz) * ((p.road ? .3 : .45) + .35 * p.jitter) * lit(lz) * (p.loose ? f.gravel * 1.6 : p.road ? 1 - .6 * f.gravel : 1)
      put(p.tint, p.glyph, pt.x, pt.y + (p.jitter - .5) * 2, size * (p.loose ? 1.15 : 1), alpha * f.land)
    }
    for (; si >= 0 && signs[si].z >= z; si--) {
      const sign = signs[si]
      if (sign.warn) drawNarrows(ctx, v, sign.z, sign.s, f, dusk, fogOf(sign.z))
      else drawChevron(ctx, v, sign.z, sign.s, f, dusk, fogOf(sign.z), put)
    }
    for (; pi < props.length && props[pi].z >= z; pi++) props[pi].paint()
    // Lorries only on the open road and among the soft guardrails, where they give you a fright.
    for (; ti < traffic.length && traffic[ti].z >= z; ti++) if (show) drawVehicle(ctx, v, traffic[ti].car, traffic[ti].z, dusk, fogOf(traffic[ti].z) * show, lit(traffic[ti].z), lights)

    // Edges of this row: wall top, wall foot, road left, road right, ravine lip, ravine floor.
    // The lip of the ravine, a crisp broken edge.
    const lip = project(v, ROAD.rail + LIP, z, 0)
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
    // Level 1: whitewashed boulders along the edge, one every metre and a half or so.
    if (calm(s) < f.coverage && f.stones > .01) {
      const prev = travel + z * (1 + ROW)
      if (Math.floor(prev / 1.5) !== Math.floor(s / 1.5)) {
        const n = Math.floor(s / 1.5)
        const big = .8 + hash(n * 3) * .45
        const c = project(v, ROAD.rail - .05, z, .26 * big)
        const rx = .36 * big * c.k, ry = .28 * big * c.k
        const light = Math.min(1, .45 + .55 * lit(z))
        ctx.globalAlpha = fogOf(z) * f.stones
        ctx.fillStyle = shade(WHITEWASH, light * (1 - .4 * dusk))
        ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, Math.PI, 0); ctx.lineTo(c.x + rx, c.y + ry * .9); ctx.lineTo(c.x - rx, c.y + ry * .9); ctx.closePath(); ctx.fill()
        ctx.fillStyle = shade(color.rock, light * .8)
        ctx.fillRect(c.x - rx, c.y + ry * .45, rx * 2, ry * .45)
        const gsize = Math.min(30, Math.max(4, c.k * .14))
        for (let j = 0; j < 4; j++) put(color.scree, j % 2 ? '#' : ':', c.x + (j - 1.5) * rx * .45, c.y + ry * (.2 + .3 * hash(n * 7 + j)), gsize, fogOf(z) * .6 * f.stones)
      }
    }
    // Level 2: a timber fence, two round rails on stout posts every 2 m.
    if (calm(s) < f.coverage && f.logs > .01) {
      const bsize = Math.min(30, Math.max(5, (FOCAL / z) * .13))
      const a = fogOf(z) * (.55 + .45 * lit(z)) * f.logs
      for (const h of [.38, .44, .74, .8]) {
        const rail = project(v, ROAD.rail, z, h)
        put(hash(i * 11 + h * 10) < .5 ? WOOD : WOOD_DARK, hash(i * 17 + h * 10) < .7 ? '=' : '#', rail.x, rail.y, bsize * 1.4, a)
      }
      const prev = travel + z * (1 + ROW)
      if (Math.floor(prev / 2) !== Math.floor(s / 2)) for (let j = 0; j < 10; j++) { const post = project(v, ROAD.rail + .06, z, j * .09); put(WOOD_DARK, '#', post.x, post.y, bsize * 1.5, a) }
    }
    // The barrier: W-beam in red and white 2 m panels, posts every 2 m, a reflector on every other post.
    if (calm(s) < f.coverage && f.rail > .01) {
      const panel = Math.floor(s / 2) % 2 ? color.hard : color.paint
      const bsize = Math.min(30, Math.max(5, (FOCAL / z) * .12))
      for (const h of [.5, .58, .66, .74]) {
        const h2 = hash(i * 13 + h * 100)
        const beam = project(v, ROAD.rail, z, h)
        put(panel, h2 < .5 ? '#' : h2 < .8 ? '=' : '@', beam.x, beam.y, bsize, fogOf(z) * (.55 + .45 * lit(z)) * f.rail)
      }
      const prev = travel + z * (1 + ROW)
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
  // Our own car, just ahead of the camera: we ride behind it all the way.
  if (f.car > .01) drawHero(ctx, v, f, dusk, moon, t, hero, put)
  const peak = swerve
  ctx.globalAlpha = 1
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  if (turn > .001) { drawBay(ctx, t, (1 - turn) * W); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over' }
  // Level and still, over the road, clear of the sheet's text on the left.
  if (hero.crash >= 0) drawGameOver(ctx, hero.crash)
  swerve = 0
  return peak
}

// Oncoming traffic. Each vehicle comes round on its own loop; `lane` pushes it towards the centre line.
type Vehicle = { kind: 'car' | 'moto' | 'truck'; s0: number; period: number; body: string; lane: number }
const TRAFFIC: Vehicle[] = [
  { kind: 'car', s0: 189.5, period: 300, body: '#2d3a4a', lane: 0 },
  { kind: 'moto', s0: 229.5, period: 300, body: '#1c1d22', lane: -.3 },
  { kind: 'car', s0: 29.5, period: 300, body: '#6a2329', lane: .1 },
  { kind: 'truck', s0: 241.5, period: 300, body: '#c9cdd2', lane: .6 },
  { kind: 'truck', s0: 391.5, period: 300, body: '#d8b23a', lane: .6 },
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
  const bend = X(v.s0 + z + len / 2) - v.x0 - v.heading * (z + len / 2)
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

// Our car: a red open roadster seen from behind, two heads over the windscreen, drawn as a block of
// glyphs. Left half only; the right mirrors it, with the passenger's hair in another colour.
const HERO_HALF = [
  '             dd     ',
  '            dddd    ',
  '      wwwwwwddddwwww',
  '    wwxxxxxxddddxxxx',
  '   hhhhhhhhhhhhhhhhh',
  ' hhRRRRRRRRRRRRRRRRR',
  'hRRRRRRRRRRRRRRRRRRR',
  'rkttttttaRRRRRRRRRRR',
  'rkttttttaRRRRRRRRppp',
  'rrrrrrrrrrrrrrrrrppp',
  'kggggggggggggggggggg',
  'kkkkkk kkkkkkkkkkkkk',
  'kkkkkk   g          ',
]
const HERO = HERO_HALF.map(row => row + [...row].reverse().join('').replace(/d/g, 'b'))
const HERO_CELL: Record<string, { fill: string; ink: string; glyph: string }> = {
  R: { fill: '#c41f33', ink: '#ff5a64', glyph: '#' },
  h: { fill: '#e8384a', ink: '#ffb0b4', glyph: '=' },
  r: { fill: '#7c1220', ink: '#c41f33', glyph: ':' },
  k: { fill: '#0e0f13', ink: '#3a3d46', glyph: '.' },
  g: { fill: '#8b929c', ink: '#e8ecf0', glyph: '=' },
  t: { fill: '#9a0f1c', ink: '#ff3b3b', glyph: '@' },
  a: { fill: '#b8660a', ink: '#ffb21c', glyph: '*' },
  p: { fill: '#e9e6dc', ink: '#2a2d33', glyph: '-' },
  w: { fill: '#3a4a66', ink: '#b8d0ec', glyph: '-' },
  x: { fill: '#24151a', ink: '#4a2a30', glyph: '.' },
  d: { fill: '#1e1712', ink: '#4a3a2c', glyph: '%' },
  b: { fill: '#6a4420', ink: '#c08a4a', glyph: '%' },
}
const HERO_COLS = HERO[0].length
const HERO_ROWS = HERO.length
/** Car width and height in metres, the glyph cells stretched to fit. */
const HERO_W = 1.95
const HERO_H = 1.12
const HERO_Z = 2.8
const WOOD = '#9a6a3c'
const WOOD_DARK = '#5e3e22'
const WHITEWASH = '#e4ded0'
/** How far right we can go: the right tyre's outer face on the lip of the drop. */
const HERO_EDGE = ROAD.rail + LIP - .05 - HERO_W / 2 - .35
const heroSprites = new Map<string, HTMLCanvasElement>()

function heroSprite(light: number, brake: boolean) {
  const key = `${light}|${brake}`
  const hit = heroSprites.get(key)
  if (hit) return hit
  const cw = 14, ch = 24
  const c = document.createElement('canvas')
  c.width = HERO_COLS * cw
  c.height = HERO_ROWS * ch
  const g = c.getContext('2d')!
  g.font = `700 ${ch * .9}px ui-monospace, Menlo, Consolas, monospace`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const k = light / 10
  HERO.forEach((row, y) => [...row].forEach((cell, x) => {
    const spec = HERO_CELL[cell]
    if (!spec) return
    const glow = cell === 't' && brake
    // Solid behind, a glyph on top: it reads as a car from the back of the room and as text up close.
    g.fillStyle = shade(spec.fill, glow ? 1.6 : k)
    g.fillRect(x * cw, y * ch, cw + .5, ch + .5)
    g.fillStyle = shade(spec.ink, glow ? 1.4 : Math.min(1.2, k * 1.1))
    g.fillText(spec.glyph, x * cw + cw / 2, y * ch + ch / 2 + 1)
  }))
  heroSprites.set(key, c)
  return c
}

/** What the road's protection is in a form: nothing, paint only, or steel where it is needed. */
export type Regime = 'none' | 'soft' | 'hard'
export const regimeOf = (f: Form): Regime => f.coverage > .3 ? 'hard' : f.paintTint > .5 || f.paint > .5 ? 'soft' : 'none'

/** Our car's state beyond the road: `crash` seconds since we went over (-1 if not), `spawn` 0→1 fading back in. */
export type Hero = { crash: number; spawn: number }
const HERO_IDLE: Hero = { crash: -1, spawn: 1 }
/** The car's centre when its right side rubs the barrier. */
const HERO_RAIL = ROAD.rail - .04 - HERO_W / 2

/**
 * Decide what a close pass with a lorry does to us. With nothing at the edge, a pass on a bend puts us
 * over, and so does half of the rest. With paint, we keep to our side unless the bend is sharp and we
 * are unlucky. With steel, we never go over.
 */
export function overTheEdge(f: Form, travel: number, n: number) {
  const bend = Math.abs(curvature(travel + HERO_Z)) / C_MAX
  const luck = hash(n * 7 + 3)
  const regime = regimeOf(f)
  if (regime === 'none') return bend > .3 || luck < .5
  if (regime === 'soft') return bend > .35 && luck < .6
  return false
}

function drawHero(ctx: CanvasRenderingContext2D, v: View, f: Light, dusk: number, moon: number, t: number, hero: Hero, put: (tint: string, glyph: Glyph, x: number, y: number, size: number, alpha: number) => void) {
  const regime = regimeOf(f)
  const s = v.s0 + HERO_Z
  const railed = regime === 'hard' && calm(s) < f.coverage
  // When the lorry comes we squeeze over to the edge. Without steel, the right wheels stop on the lip;
  // with steel there, we go further and the barrier pushes back: the car scrapes along it and bounces in.
  let u = .35 + HERO_EDGE * swerve
  let contact = 0
  if (railed) {
    // Usually we just tuck in short of it; on a close one we hit it and it throws us back.
    const want = .35 + (HERO_RAIL - .35 + (extreme ? .45 : -.12)) * swerve
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
  // It leans out of the bends ahead and bobs a little on the stones while it moves.
  const turn = c >= 0 ? 0 : curvature(v.s0 + 12) / C_MAX
  const moving = c >= 0 ? 0 : Math.min(1, f.speed / 3)
  const bob = moving * (Math.sin(t * 17) * 1.2 + Math.sin(t * 5.3) * (1 + 2 * f.gravel)) + contact * Math.sin(t * 61) * (3 + 6 * f.stones + 3 * f.logs)
  const light = Math.round(Math.min(10, Math.max(2, 10 * ((1 - .55 * dusk) + .25 * moon))))
  const brake = f.stop > .3 || f.speed < 1.5 || c >= 0 || contact > .1
  const sprite = heroSprite(light, brake)
  if (alpha > .01) {
    ctx.save()
    ctx.globalAlpha = alpha
    if (c < 0) {
      ctx.fillStyle = 'rgb(0 0 0 / .45)'
      ctx.beginPath(); ctx.ellipse(foot.x, foot.y - h * .02, w * .56, h * .07, 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.translate(foot.x + turn * 18, foot.y + bob)
    ctx.rotate(roll)
    ctx.transform(1, 0, -turn * .06, 1, 0, 0)
    ctx.drawImage(sprite, -w / 2, -h, w, h)
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
  if (lamp > .02 && c < 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const side of [-1, 1]) {
      const x = foot.x + turn * 18 + side * w * (12.5 / HERO_COLS)
      const y = foot.y + bob - h * (1 - 9 / HERO_ROWS)
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
  ctx.translate(dx, 0)
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip()
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
  ctx.fillRect(0, BAY_HORIZON, W, H - BAY_HORIZON)
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
  // The viewpoint: a stone parapet across the bottom, our car pulled in against it, facing the bay.
  ctx.globalAlpha = 1
  ctx.fillStyle = '#07080c'
  ctx.fillRect(0, H - 120, W, 120)
  for (let x = 0; x < W; x += 22) put(color.rock, hash(x) < .5 ? '#' : '=', x + 11, H - 118, 22, .35)
  for (let x = 0; x < W; x += 60) { ctx.fillStyle = '#0c0d12'; ctx.fillRect(x, H - 128, 56, 12) }
  const car = heroSprite(4, false)
  const cw = 380, ch = cw * HERO_H / HERO_W
  ctx.globalAlpha = 1
  ctx.drawImage(car, MOON.x - cw / 2 + 120, H - 40 - ch, cw, ch)
  ctx.restore()
}

/** A traffic officer in our lane: reflective vest, white helmet, right arm up with a STOP paddle. */
function drawOfficer(ctx: CanvasRenderingContext2D, v: View, z: number, dusk: number, show: number, lit: number) {
  const s = v.s0 + z
  const u = centre(s) + 1.3
  const light = Math.min(1.4, .45 + .7 * lit)
  ctx.globalAlpha = Math.min(1, show * 1.5)
  // Legs, torso in a fluorescent vest with silver bands, arms, head, helmet.
  box(ctx, v, u - .13, z, .22, .17, 0, .9, '#1d2a22', light)
  box(ctx, v, u + .13, z, .22, .17, 0, .9, '#1d2a22', light)
  box(ctx, v, u, z, .26, .5, .9, 1.5, '#c8f03c', light)
  for (const h of [1.05, 1.3]) panel(ctx, v, u, z - .01, -.25, .25, h, h + .05, shade('#dfe4ea', light * 1.2))
  box(ctx, v, u - .32, z, .16, .13, .95, 1.48, '#c8f03c', light)
  box(ctx, v, u + .42, z - .05, .14, .4, 1.34, 1.46, '#c8f03c', light)
  box(ctx, v, u, z, .2, .2, 1.5, 1.66, '#c99a7a', light)
  box(ctx, v, u, z, .26, .27, 1.64, 1.82, '#f2f2f2', light)
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
  ctx.shadowColor = color.hard
  ctx.shadowBlur = 30 * dusk * show
  ctx.fillStyle = '#ffffff'; octagon(r)
  ctx.shadowBlur = 0
  ctx.fillStyle = color.hard; octagon(r * .86)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${Math.max(6, r * .5)}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('STOP', c.x, c.y + r * .04)
}

/** The patrol car on the shoulder, light bar flashing blue. */
function drawPatrol(ctx: CanvasRenderingContext2D, v: View, z: number, dusk: number, show: number, t: number, lit: number, lights: (() => void)[]) {
  const u = ROAD.rightEdge + .1
  const light = Math.min(1.3, .4 + .65 * lit)
  ctx.globalAlpha = Math.min(1, show * 1.5)
  box(ctx, v, u, z + 1, 2.4, 1.6, .9, 1.45, '#e9ecef', light)
  box(ctx, v, u, z, 4.4, 1.8, .25, .95, '#e9ecef', light)
  panel(ctx, v, u, z, -.9, .9, .55, .68, shade('#1f6b3a', light))
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

/** Spanish warning sign P-17a, "road narrows": white triangle, red rim, at the foot of the cut. */
function drawNarrows(ctx: CanvasRenderingContext2D, v: View, z: number, s: number, f: Light, dusk: number, fog: number) {
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
  ctx.shadowColor = color.hard
  ctx.shadowBlur = 22 * dusk
  ctx.fillStyle = color.hard
  ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x + w / 2, base.y); ctx.lineTo(top.x - w / 2, base.y); ctx.closePath(); ctx.fill()
  ctx.shadowBlur = 0
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

/** A blue panel with white chevrons pointing into the bend, on its outside. Retroreflective: it glows at night. */
function drawChevron(ctx: CanvasRenderingContext2D, v: View, z: number, s: number, f: Light, dusk: number, fog: number, put: (tint: string, glyph: Glyph, x: number, y: number, size: number, alpha: number) => void) {
  const right = curvature(s) > 0
  const u = right ? leftEdge(s) - .45 : ROAD.rail + LIP + .1
  const top = project(v, u, z, 1.55)
  const bottom = project(v, u, z, .95)
  const w = .8 * top.k
  const h = bottom.y - top.y
  const alpha = fog * f.chevron * (.65 + .35 * dusk) * Math.min(1, Math.max(0, (z - 5) / 4))
  if (alpha <= .01 || top.x < -60 || top.x > W + 60) return
  ctx.globalAlpha = alpha
  ctx.shadowColor = color.soft
  ctx.shadowBlur = 24 * dusk
  ctx.fillStyle = color.chevron
  ctx.fillRect(top.x - w / 2, top.y, w, h)
  ctx.shadowBlur = 0
  ctx.strokeStyle = color.paint
  ctx.lineWidth = Math.max(1, w * .05)
  ctx.strokeRect(top.x - w / 2, top.y, w, h)
  const post = project(v, u, z, 0)
  ctx.fillStyle = color.steel
  ctx.fillRect(top.x - Math.max(1, w * .03), bottom.y, Math.max(2, w * .06), post.y - bottom.y)
  put(color.paint, right ? '>' : '<', top.x, top.y + h / 2, Math.min(h * 1.3, 60), alpha)
}

/** Live field: requestAnimationFrame loop with eased form and light changes. */
export class RoadField {
  private from: Light
  private to: Light
  private changed = 0
  private frame = 0
  private travel = 85
  private last = performance.now()
  private start = performance.now()
  // The game: when we last went over (ms, -1 if we are on the road), when we came back, which pass this is.
  private crashAt = -1
  private spawnAt = -1e9
  private armed = true
  private passes = 0

  constructor(private canvas: HTMLCanvasElement, private reduced: boolean, name: FormName, dusk: number) {
    this.from = this.to = { ...FORMS[name], dusk }
    this.resize()
    this.loop()
  }

  setForm(name: FormName, dusk: number) {
    this.from = this.current(performance.now())
    this.to = { ...FORMS[name], dusk }
    this.changed = performance.now()
    if (this.reduced) this.paint(performance.now())
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const scale = Math.min(2, Math.max(1, (rect.width / W) * devicePixelRatio))
    this.canvas.width = Math.round(W * scale)
    this.canvas.height = Math.round(H * scale)
    this.paint(performance.now())
  }

  dispose() { cancelAnimationFrame(this.frame) }

  private current(now: number) {
    const k = this.reduced ? 1 : Math.min(1, (now - this.changed) / EASE_MS)
    const out = mix(this.from, this.to, 1 - (1 - k) ** 3)
    // Turning in at the viewpoint takes its time: a slow pan, not a cut.
    const kb = this.reduced ? 1 : Math.min(1, (now - this.changed) / TURN_MS)
    out.bay = lerp(this.from.bay, this.to.bay, smooth(kb))
    return out
  }

  private paint(now: number) {
    const light = this.current(now)
    let crash = this.crashAt < 0 ? -1 : (now - this.crashAt) / 1000
    // After the countdown, start again a little further on, with the lorry gone.
    if (crash > 4.4) { this.crashAt = -1; crash = -1; this.travel += 60; this.spawnAt = now; this.armed = false }
    // Once over the edge the camera stops at the lip and watches.
    const pace = crash < 0 ? 1 : Math.max(0, 1 - crash * 2.5)
    if (!this.reduced) this.travel += Math.min(.1, (now - this.last) / 1000) * light.speed * pace
    this.last = now
    const spawn = Math.min(1, (now - this.spawnAt) / 900)
    const peak = draw(this.canvas, light, this.travel, (now - this.start) / 1000, { crash, spawn })
    // A close pass: decide, once per lorry, whether this one puts us over.
    if (this.reduced || crash >= 0) return
    if (peak > .8 && this.armed) {
      this.armed = false
      this.passes++
      if (light.car > .6 && overTheEdge(light, this.travel, this.passes)) this.crashAt = now
    } else if (peak < .2) this.armed = true
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

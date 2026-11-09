// What each scene asks of the road: how strongly each part shows, how much of
// the road the barrier covers, and how fast we drive. Numbers ease between forms.
// The light (sunset → night) is not here: it follows the sheet number.

export type Form = {
  paint: number; dash: number; rail: number; chevron: number
  land: number; sky: number
  /** Oncoming traffic: cars, motorbikes, the odd lorry. */
  head: number
  /** 1 brings the officer with the STOP paddle into the lane and stops the car. */
  stop: number
  /** How much of the road the barrier covers: 0 none, .3 the sharpest curves only, 1 everywhere. */
  coverage: number
  speed: number
  /** 1 tints the painted lines in the soft blue. */
  paintTint: number
  /** 1 turns the road into bare gravel: no asphalt, no paint, nothing at the edge. */
  gravel: number
  /** How clearly our own car shows in front of us: 1 full, lower behind text-heavy sheets. */
  car: number
  /** 1 turns the camera right at the viewpoint, onto the bay under the full moon. */
  bay: number
  /** Level 1 of hard: whitewashed boulders along the edge. */
  stones: number
  /** Level 2 of hard: a mountain fence of timber rails on wooden posts. */
  logs: number
}

const base: Form = { paint: 1, dash: 1, rail: 1, chevron: 1, land: 1, sky: 1, head: 1, coverage: .35, speed: 7, paintTint: 0, stop: 0, gravel: 0, car: 1, stones: 0, logs: 0, bay: 0 }

export const FORMS = {
  /** Where the talk starts: a track of loose gravel along the drop. No lines, no signs, no barrier, and lorries coming. */
  gravel: { ...base, paint: 0, dash: 0, chevron: 0, coverage: 0, gravel: 1 },
  /** Title: the pass at sunset, barrier only on the sharpest bends. */
  road: base,
  /** Behind text-heavy sheets: the road dims and slows. */
  dim: { ...base, coverage: .7, paint: .4, dash: .4, rail: .4, chevron: .4, land: .55, head: .4, speed: 5, car: .35 },
  /** Dimmed, with level 1 or level 2 at the edge instead of steel. */
  dimStones: { ...base, coverage: .7, paint: .4, dash: .4, rail: 0, stones: .5, chevron: .4, land: .55, head: .4, speed: 5, car: .35 },
  dimLogs: { ...base, coverage: .7, paint: .4, dash: .4, rail: 0, logs: .5, chevron: .4, land: .55, head: .4, speed: 5, car: .35 },
  /** Soft guardrails: paint and curve signs in blue, no barrier at all. */
  paint: { ...base, coverage: 0, head: .6, paintTint: 1 },
  /** Hard, level 1: boulders along the edge. Crude, but you bounce off them. */
  stones: { ...base, paint: .3, dash: .3, coverage: .7, head: .5, rail: 0, stones: 1 },
  /** Hard, level 2: a timber fence, the mountain-road kind. */
  logs: { ...base, paint: .3, dash: .3, coverage: .7, head: .5, rail: 0, logs: 1 },
  /** Hard, level 3: the steel W-beam barrier on every bend that matters; paint fades. */
  barrier: { ...base, paint: .3, dash: .3, coverage: .7, head: .5 },
  /** Stage 4: the agent is stopped. An officer with a STOP paddle, the patrol car flashing, and we halt. */
  stop: { ...base, paint: .3, dash: .3, coverage: .7, head: 0, speed: 0, stop: 1 },
  /** Black spot done: steel along the whole ravine. */
  steel: { ...base, coverage: 1.05 },
  /** Parked at night: no traffic, barrier everywhere, for the closing question. */
  parked: { ...base, coverage: 1.05, head: 0, speed: .8 },
  /** The end of the drive: we pull in at a viewpoint, turn right, and the bay opens under a full moon. */
  mirador: { ...base, coverage: 1.05, head: 0, speed: 0, bay: 1 },
} satisfies Record<string, Form>

export type FormName = keyof typeof FORMS

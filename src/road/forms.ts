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
}

const base: Form = { paint: 1, dash: 1, rail: 1, chevron: 1, land: 1, sky: 1, head: 1, coverage: .35, speed: 7, paintTint: 0, stop: 0 }

export const FORMS = {
  /** Title: the pass at sunset, barrier only on the sharpest bends. */
  road: base,
  /** Behind text-heavy sheets: the road dims and slows. */
  dim: { ...base, coverage: .7, paint: .4, dash: .4, rail: .4, chevron: .4, land: .55, head: .4, speed: 3.5 },
  /** Soft guardrails: paint and curve signs in blue, no barrier at all. */
  paint: { ...base, coverage: 0, head: .6, paintTint: 1 },
  /** Hard guardrails: the barrier covers every bend that matters; paint fades. */
  barrier: { ...base, paint: .3, dash: .3, coverage: .7, head: .5, speed: 5 },
  /** Stage 4: the agent is stopped. An officer with a STOP paddle, the patrol car flashing, and we halt. */
  stop: { ...base, paint: .3, dash: .3, coverage: .7, head: 0, speed: 0, stop: 1 },
  /** Black spot done: steel along the whole ravine. */
  steel: { ...base, coverage: 1.05, speed: 5 },
  /** Parked at night: no traffic, barrier everywhere, for the closing question. */
  parked: { ...base, coverage: 1.05, head: 0, speed: .8 },
} satisfies Record<string, Form>

export type FormName = keyof typeof FORMS

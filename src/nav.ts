import { scenes } from './scenes'

export type Position = { index: number; step: number }

export function parseHash(hash: string): Position {
  const [, id = '', step = '0'] = hash.replace(/^#/, '').split('/')
  const index = Math.max(0, scenes.findIndex(scene => scene.id === id))
  return { index, step: Math.min(Math.max(0, Number(step) || 0), scenes[index].steps) }
}

export function toHash({ index, step }: Position) {
  return `#/${scenes[index].id}${step ? `/${step}` : ''}`
}

export function next({ index, step }: Position): Position {
  if (step < scenes[index].steps) return { index, step: step + 1 }
  return index < scenes.length - 1 ? { index: index + 1, step: 0 } : { index, step }
}

export function previous({ index, step }: Position): Position {
  if (step > 0) return { index, step: step - 1 }
  return index > 0 ? { index: index - 1, step: scenes[index - 1].steps } : { index, step }
}

export function same(a: Position, b: Position) {
  return a.index === b.index && a.step === b.step
}

// Audience and presenter windows stay in step through one channel.
export type Message = { type: 'goto'; position: Position } | { type: 'hello' } | { type: 'blackout'; on: boolean } | { type: 'lang'; lang: 'en' | 'es' } | { type: 'pause' }
export const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('guardrails-deck')

export function keyAction(event: KeyboardEvent): 'next' | 'previous' | 'first' | 'last' | 'presenter' | 'blackout' | 'fullscreen' | 'pause' | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  switch (event.key) {
    case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter': case 'n': return 'next'
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': return 'previous'
    case 'Home': return 'first'
    case 'End': return 'last'
    case 'p': case 'P': return 'presenter'
    case 'b': case 'B': case '.': return 'blackout'
    case 'f': case 'F': return 'fullscreen'
    // Freeze the drive behind the sheet, for anyone the motion bothers; again to carry on.
    case 'm': case 'M': return 'pause'
    default: return null
  }
}

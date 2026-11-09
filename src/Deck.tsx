import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { channel, keyAction, next, parseHash, previous, same, toHash, type Message, type Position } from './nav'
import { initialLang, storeLang, translator, type Lang } from './i18n'
import { scenes } from './scenes'
import { Stage } from './Stage'

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Keeps a 1920×1080 sheet scaled to fit the window. */
export function useFit(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const fit = () => {
      const parent = element.parentElement!.getBoundingClientRect()
      const scale = Math.min(parent.width / 1920, parent.height / 1080)
      element.style.transform = `translate(${(parent.width - 1920 * scale) / 2}px, ${(parent.height - 1080 * scale) / 2}px) scale(${scale})`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element.parentElement!)
    return () => observer.disconnect()
  }, [ref])
}

/** Shared position state: URL hash, keyboard, and the channel between windows. */
export function usePosition({ broadcast, transitions }: { broadcast: boolean; transitions: boolean }) {
  const [position, setPosition] = useState(() => parseHash(location.hash))
  const ref = useRef(position)

  const go = useCallback((target: Position, announce = broadcast) => {
    if (same(target, ref.current)) return
    const sceneChanges = target.index !== ref.current.index
    ref.current = target
    history.replaceState(null, '', toHash(target))
    const apply = () => flushSync(() => setPosition(target))
    if (transitions && sceneChanges && document.startViewTransition && !reducedMotion()) {
      // A fast clicker can start a transition before the last one ends; the skipped one is expected.
      const transition = document.startViewTransition(apply)
      transition.ready.catch(() => {})
      transition.finished.catch(() => {})
    } else apply()
    if (announce) channel?.postMessage({ type: 'goto', position: target } satisfies Message)
  }, [broadcast, transitions])

  useEffect(() => {
    const fromHash = () => go(parseHash(location.hash))
    const fromChannel = (event: MessageEvent<Message>) => {
      if (event.data.type === 'goto') go(event.data.position, false)
      if (event.data.type === 'hello' && broadcast) channel?.postMessage({ type: 'goto', position: ref.current } satisfies Message)
    }
    addEventListener('hashchange', fromHash)
    channel?.addEventListener('message', fromChannel)
    return () => { removeEventListener('hashchange', fromHash); channel?.removeEventListener('message', fromChannel) }
  }, [go, broadcast])

  return { position, go, ref }
}

export function useKeys(go: (p: Position) => void, ref: RefObject<Position>, extra: (action: string) => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = keyAction(event)
      if (!action) return
      event.preventDefault()
      const current = ref.current
      if (action === 'next') go(next(current))
      else if (action === 'previous') go(previous(current))
      else if (action === 'first') go({ index: 0, step: 0 })
      else if (action === 'last') go({ index: scenes.length - 1, step: scenes[scenes.length - 1].steps })
      else extra(action)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [go, ref, extra])
}

/** Language shared by every window; the title sheet carries the toggle. */
export function useLang() {
  const [lang, setLang] = useState<Lang>(initialLang)
  useEffect(() => { storeLang(lang) }, [lang])
  useEffect(() => {
    const onMessage = (event: MessageEvent<Message>) => {
      if (event.data.type === 'lang') setLang(event.data.lang)
      if (event.data.type === 'hello') channel?.postMessage({ type: 'lang', lang } satisfies Message)
    }
    channel?.addEventListener('message', onMessage)
    return () => channel?.removeEventListener('message', onMessage)
  }, [lang])
  const choose = useCallback((value: Lang) => { setLang(value); channel?.postMessage({ type: 'lang', lang: value } satisfies Message) }, [])
  return [lang, choose] as const
}

/** Whole minutes since the page loaded, like the clock in Software Engineering 2.0 and Aligned. */
function useMinutes() {
  const [start] = useState(() => performance.now())
  const [minutes, setMinutes] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setMinutes(Math.floor((performance.now() - start) / 60000)), 5000)
    return () => clearInterval(timer)
  }, [start])
  return minutes
}

export function Deck() {
  const sheet = useRef<HTMLDivElement>(null)
  const { position, go, ref } = usePosition({ broadcast: true, transitions: true })
  const [blackout, setBlackout] = useState(false)
  const [lang, setLang] = useLang()
  const minutes = useMinutes()
  useFit(sheet)

  const extra = useCallback((action: string) => {
    if (action === 'presenter') window.open(`${location.pathname}?presenter&lang=${lang}${toHash(ref.current)}`, 'guardrails-presenter', 'width=1400,height=860')
    if (action === 'blackout') setBlackout(on => { channel?.postMessage({ type: 'blackout', on: !on } satisfies Message); return !on })
    if (action === 'fullscreen') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
    if (action === 'pause') { dispatchEvent(new Event('road:pause')); channel?.postMessage({ type: 'pause' } satisfies Message) }
  }, [ref, lang])
  useKeys(go, ref, extra)

  useEffect(() => {
    const onMessage = (event: MessageEvent<Message>) => {
      if (event.data.type === 'blackout') setBlackout(event.data.on)
      if (event.data.type === 'pause') dispatchEvent(new Event('road:pause'))
    }
    channel?.addEventListener('message', onMessage)
    return () => channel?.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => { document.title = `${translator(lang)(...scenes[position.index].title)} · Guardrails` }, [position.index, lang])

  return <main className="viewport" onClick={event => {
    if ((event.target as Element).closest('a, button, [data-hover]')) return
    go(event.clientX < innerWidth / 3 ? previous(ref.current) : next(ref.current))
  }}>
    <div className="fit" ref={sheet}><Stage index={position.index} step={position.step} lang={lang} minutes={minutes} onLang={setLang} /></div>
    {blackout && <div className="blackout" />}
    <p className="visually-hidden" role="status" aria-live="polite">{position.index + 1} / {scenes.length} · {translator(lang)(...scenes[position.index].title)}</p>
  </main>
}

/** A still frame of one position, used by the presenter previews. */
export function Embed() {
  const sheet = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(() => parseHash(location.hash))
  useFit(sheet)
  useEffect(() => {
    const update = () => setPosition(parseHash(location.hash))
    addEventListener('hashchange', update)
    return () => removeEventListener('hashchange', update)
  }, [])
  return <main className="viewport embed"><div className="fit" ref={sheet}><Stage index={position.index} step={position.step} lang={initialLang()} still /></div></main>
}

/** Every scene at its final step, one per page, for PDF export. */
export function Print() {
  return <main className="print">{scenes.map((scene, index) => <section className="page" key={scene.id}><Stage index={index} step={scene.steps} lang={initialLang()} still /></section>)}</main>
}

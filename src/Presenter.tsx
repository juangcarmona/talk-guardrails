import { useCallback, useEffect, useState } from 'react'
import { useKeys, useLang, usePosition } from './Deck'
import { translator } from './i18n'
import { channel, next, toHash, type Message } from './nav'
import { notes, notesEs } from './notes'
import { acts, scenes } from './scenes'

const TARGET_MINUTES = 40

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(Math.abs(seconds)))
  return `${seconds < 0 ? '−' : ''}${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Speaker view in a second window: notes for the current step, timer, current and next position. */
export function Presenter() {
  const { position, go, ref } = usePosition({ broadcast: true, transitions: false })
  const [started, setStarted] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [, setBlackout] = useState(false)
  const [lang, setLang] = useLang()
  const t = translator(lang)
  const extra = useCallback((action: string) => {
    if (action === 'blackout') setBlackout(on => { channel?.postMessage({ type: 'blackout', on: !on } satisfies Message); return !on })
  }, [])
  useKeys(go, ref, extra)

  useEffect(() => { channel?.postMessage({ type: 'hello' } satisfies Message) }, [])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer) }, [])
  useEffect(() => { if (started === null && (position.index > 0 || position.step > 0)) setStarted(Date.now()) }, [position, started])
  useEffect(() => { document.title = `Presenter · ${t(...scenes[position.index].title)}` }, [position.index, t])

  const scene = scenes[position.index]
  const upcoming = next(position)
  const segments = (lang === 'es' ? notesEs : notes)[scene.id] ?? ['(no notes)']
  const elapsed = started === null ? 0 : (now - started) / 1000
  const remaining = TARGET_MINUTES * 60 - elapsed
  const base = location.pathname

  return <main className="presenter">
    <header>
      <span className="p-scene">{position.index + 1}/{scenes.length} · {t(...acts[scene.act]) || '—'} · <b>{t(...scene.title)}</b> · step {position.step}/{scene.steps}</span>
      <span className={`p-timer ${remaining < 300 ? 'warn' : ''}`}>{clock(elapsed)} <small>/ {TARGET_MINUTES}:00 · {clock(remaining)} left</small></span>
      <span className="p-clock">{new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      <button type="button" onClick={() => setLang(lang === 'en' ? 'es' : 'en')}>{lang === 'en' ? 'ES' : 'EN'}</button>
      <button type="button" onClick={() => setStarted(Date.now())}>Reset timer</button>
    </header>
    <section className="p-current"><iframe title="Current" src={`${base}?embed&lang=${lang}${toHash(position)}`} /></section>
    <section className="p-next">
      <p>Next: {upcoming === position ? 'end' : `${t(...scenes[upcoming.index].title)}${upcoming.step ? ` · step ${upcoming.step}` : ''}`}</p>
      <iframe title="Next" src={`${base}?embed&lang=${lang}${toHash(upcoming)}`} />
    </section>
    <section className="p-notes">
      {segments.map((text, k) => <p key={k} className={k === position.step ? 'now' : k < position.step ? 'done' : ''}>{text}</p>)}
    </section>
    <footer>→ / PageDown next · ← / PageUp back · B blackout · keys work in either window</footer>
  </main>
}

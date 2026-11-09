import type { CSSProperties } from 'react'
import { StepContext } from './components'
import { Field } from './Field'
import { translator, type Lang } from './i18n'
import { acts, scenes } from './scenes'

// Each act has a kind of road marking for its chapter bar: none, the amber
// attention line, dashed blue paint (soft), red and white barrier (hard).
export const actRail = ['none', 'amber', 'soft', 'hard', 'amber'] as const
export const actColor = ['var(--paint)', 'var(--amber)', 'var(--soft)', 'var(--hard)', 'var(--amber)']

function hhmm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

type Props = { index: number; step: number; lang: Lang; still?: boolean; minutes?: number; onLang?: (lang: Lang) => void }

/** One scene at a given step on a fixed 1920×1080 sheet. The light falls from sunset on the first sheet to night on the last. */
export function Stage({ index, step, lang, still = false, minutes = 0, onLang }: Props) {
  const scene = scenes[index]
  const t = translator(lang)
  return <div className="sheet" data-layout={scene.layout} data-act={scene.act} data-rail={actRail[scene.act]} style={{ '--act': actColor[scene.act] } as CSSProperties}>
    <Field form={scene.form(step)} dusk={index / (scenes.length - 1)} still={still} sheet={scene.id} traffic={scene.traffic} />
    {scene.act > 0 && <div className="chapter-bar" aria-hidden="true" />}
    {scene.act > 0 && <p className="chapter-label">{t(...acts[scene.act])}</p>}
    <StepContext.Provider value={step}>
      <article className="scene" key={scene.id} data-scene={scene.id} aria-label={t(...scene.title)}>{scene.content(t)}</article>
    </StepContext.Provider>
    {index === 0 && onLang && <nav className="lang-toggle" aria-label={t('Presentation language', 'Idioma de la presentación')}>
      {(['en', 'es'] as const).map(value => <button key={value} type="button" lang={value} aria-pressed={lang === value} onClick={() => onLang(value)}>{value.toUpperCase()}</button>)}
    </nav>}
    <p className="sheet-block" aria-hidden="true">
      <span>Guardrails</span>
      <span className="pk"><i>PK</i>{String(index + 1).padStart(2, '0')}<small>/{scenes.length}</small></span>
      <span>{scene.id}</span>
      {minutes > 0 && <span className="elapsed">{hhmm(minutes)}</span>}
    </p>
  </div>
}

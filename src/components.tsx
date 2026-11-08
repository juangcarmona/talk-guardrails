import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'

// Current step inside the scene. Elements reveal when the step reaches their `at`.
export const StepContext = createContext(0)

export function At({ at, until, children, className = '', style, as: Tag = 'div' }: { at: number; until?: number; children: ReactNode; className?: string; style?: CSSProperties; as?: 'div' | 'span' }) {
  const step = useContext(StepContext)
  const on = step >= at && (until === undefined || step < until)
  return <Tag className={`rv ${on ? 'on' : ''} ${until !== undefined ? 'slot' : ''} ${className}`} style={style} aria-hidden={!on}>{children}</Tag>
}

/** Soft or hard, as a road-sign plate: blue rectangle for guidance, red ring for prohibition. */
export function Plate({ kind, children }: { kind: 'soft' | 'hard'; children: ReactNode }) {
  return <span className={`plate ${kind}`}>{children}</span>
}

/** Terminal output that types in line by line. Highlight words with [[double brackets]]. */
export function Term({ lines, label }: { lines: string[]; label: string }) {
  return <pre className="term" role="region" aria-label={label}>
    {lines.map((line, k) => <span key={k} className={`term-line ${line.startsWith('$') ? 'cmd' : /^\s*(\/\/|<!--)/.test(line) ? 'note' : ''}`} style={{ '--k': k } as CSSProperties}>
      {line.split(/(\[\[.+?\]\])/).map((part, j) => part.startsWith('[[') ? <mark key={j}>{part.slice(2, -2)}</mark> : part)}
      {'\n'}
    </span>)}
  </pre>
}

export function Source({ children, t }: { children: ReactNode; t: (en: string, es: string) => string }) {
  return <p className="source"><span>{t('Source', 'Fuente')}</span>{children}</p>
}

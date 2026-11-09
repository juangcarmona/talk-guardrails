import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import csharp from 'highlight.js/lib/languages/csharp'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import xml from 'highlight.js/lib/languages/xml'

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

hljs.registerLanguage('xml', xml)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('bash', bash)

export type Lang = 'xml' | 'javascript' | 'json' | 'csharp' | 'markdown' | 'bash' | 'console'

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Highlighted HTML, one string per line, with any span left open at a line break closed and reopened. */
function highlight(code: string, lang: Lang) {
  if (lang === 'console') return code.split('\n').map(line => {
    const kind = line.startsWith('$') ? 'prompt' : /^\s*(✘|error|Build FAILED)/i.test(line) ? 'fail' : /^\s*✔/.test(line) ? 'pass' : /^\s*#/.test(line) ? 'note' : ''
    return kind ? `<span class="c-${kind}">${escape(line)}</span>` : escape(line)
  })
  const html = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
  const lines: string[] = []
  const open: string[] = []
  let current = ''
  for (const token of html.match(/<span[^>]*>|<\/span>|\n|[^<\n]+/g) ?? []) {
    if (token === '\n') { lines.push(current + '</span>'.repeat(open.length)); current = open.join('') }
    else { if (token.startsWith('<span')) open.push(token); else if (token === '</span>') open.pop(); current += token }
  }
  lines.push(current + '</span>'.repeat(open.length))
  return lines
}

/** A code panel: a tab with the file name, highlighted lines that type in one by one, and lines to point at. */
export function Code({ lang, file, lines, mark = [], className = '' }: { lang: Lang; file: string; lines: string[]; mark?: number[]; className?: string }) {
  const html = useMemo(() => highlight(lines.join('\n'), lang), [lines, lang])
  return <figure className={`code ${className}`} role="region" aria-label={file}>
    <figcaption><i className={`dot ${lang}`} />{file}</figcaption>
    <pre>{html.map((line, k) => <span key={k} className={`term-line ${mark.includes(k + 1) ? 'hit' : ''}`} style={{ '--k': k } as CSSProperties} dangerouslySetInnerHTML={{ __html: (line || ' ') + '\n' }} />)}</pre>
  </figure>
}

export function Source({ children, t }: { children: ReactNode; t: (en: string, es: string) => string }) {
  return <p className="source"><span>{t('Source', 'Fuente')}</span>{children}</p>
}

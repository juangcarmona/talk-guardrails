// Two languages for the whole deck. Literal quotations, artifact text and
// terminal output stay in their original English in both.
export type Lang = 'en' | 'es'
export type T = (en: string, es: string) => string

export const translator = (lang: Lang): T => (en, es) => (lang === 'es' ? es : en)

export function initialLang(): Lang {
  const param = new URLSearchParams(location.search).get('lang')
  if (param === 'es' || param === 'en') return param
  try { return localStorage.getItem('guardrails-lang') === 'es' ? 'es' : 'en' } catch { return 'en' }
}

export function storeLang(lang: Lang) {
  try { localStorage.setItem('guardrails-lang', lang) } catch { /* private mode: the URL still carries it */ }
  const url = new URL(location.href)
  url.searchParams.set('lang', lang)
  history.replaceState(null, '', url)
  document.documentElement.lang = lang
}

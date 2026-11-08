// Renders the built deck with Playwright: `shots` (one PNG per step), `pdf` (one page per scene), `og` (share image).
// Run `npm run build` first. Usage: node scripts/capture.mjs shots|pdf|og (LANG_DECK=es for Spanish)
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { preview } from 'vite'

const mode = process.argv[2] ?? 'shots'
const lang = process.env.LANG_DECK === 'es' ? 'es' : 'en'
const server = await preview({ preview: { port: 4174, strictPort: true }, logLevel: 'silent' })
const base = 'http://localhost:4174/'
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

try {
  if (mode === 'pdf') {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.goto(`${base}?print&lang=${lang}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.pdf({ path: `guardrails${lang === 'es' ? '-es' : ''}.pdf`, width: '1920px', height: '1080px', printBackground: true })
    console.log('guardrails.pdf')
  } else if (mode === 'og') {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
    await page.goto(`${base}?embed#/title`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: 'public/og.png' })
    console.log('public/og.png')
  } else {
    await mkdir('screenshots', { recursive: true })
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.goto(`${base}?lang=${lang}`, { waitUntil: 'networkidle' })
    const positions = await page.evaluate(() => window.__positions)
    for (const [k, { id, step }] of positions.entries()) {
      await page.evaluate(hash => { location.hash = hash }, `#/${id}${step ? `/${step}` : ''}`)
      await page.waitForTimeout(2600)
      const file = `screenshots/${lang}-${String(k + 1).padStart(2, '0')}-${id}-${step}.png`
      await page.screenshot({ path: file })
      console.log(file)
    }
  }
} finally {
  await browser.close()
  server.httpServer.close()
}

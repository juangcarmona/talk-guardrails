// Quick look at a few positions of the built deck: node scripts/peek.mjs <outdir> <lang> <hash>...
import { chromium } from '@playwright/test'
import { preview } from 'vite'
const [out, lang, ...hashes] = process.argv.slice(2)
const server = await preview({ preview: { port: 4175, strictPort: true }, logLevel: 'silent' })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  for (const hash of hashes) {
    await page.goto(`http://localhost:4175/?lang=${lang}${hash}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1800)
    const file = `${out}/${lang}-${hash.replace(/[#/]+/g, '-').replace(/^-/, '') || 'title'}.png`
    await page.screenshot({ path: file })
    console.log(file)
  }
} finally { await browser.close(); server.httpServer.close() }

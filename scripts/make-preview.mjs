// Gộp bản build thành 1 file HTML duy nhất (CSS, JS, font nằm sẵn bên trong) để đăng bản xem thử.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const dir = process.argv[2] ?? 'dist-preview'
const out = process.argv[3] ?? join(dir, 'preview.html')
const html = readFileSync(join(dir, 'index.html'), 'utf8')
const mime = { woff2: 'font/woff2', woff: 'font/woff', png: 'image/png', svg: 'image/svg+xml' }

const inlineUrls = (css, base) =>
  css.replace(/url\((['"]?)([^)'"]+)\1\)/g, (m, q, p) => {
    if (p.startsWith('data:')) return m
    const ext = p.split('.').pop()
    const buf = readFileSync(join(base, p))
    return `url(data:${mime[ext] ?? 'application/octet-stream'};base64,${buf.toString('base64')})`
  })

let styles = ''
for (const [, href] of html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)) {
  const path = join(dir, href)
  styles += inlineUrls(readFileSync(path, 'utf8'), dirname(path))
}
let scripts = ''
for (const [, src] of html.matchAll(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)) {
  scripts += readFileSync(join(dir, src), 'utf8').replaceAll('</script', '<\\/script')
}
const title = html.match(/<title>.*?<\/title>/)[0]
const page = `${title}\n<style>${styles}</style>\n<div id="root"></div>\n<script type="module">${scripts}</script>\n`
writeFileSync(out, page)
console.log(`${out}: ${(page.length / 1024).toFixed(0)} KB`)

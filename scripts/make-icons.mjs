// Vẽ biểu tượng trang và ảnh xem trước khi chia sẻ link, bằng trình duyệt Chromium của Playwright.
// Chỉ cần chạy lại khi đổi thiết kế:  node scripts/make-icons.mjs
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')

// Biểu tượng: ô vuông đỏ cam bo góc, bên trong là 2 tấm thẻ học xếp chồng (giống logo nhỏ cạnh chữ "Sổ Ôn Tập").
function icon({ rounded = true, scale = 1 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8a5c"/>
      <stop offset="0.55" stop-color="#ff4f64"/>
      <stop offset="1" stop-color="#e02f5c"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.28"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#7a0016" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#shine)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="166" y="118" width="240" height="176" rx="40" fill="#fff" fill-opacity="0.5" transform="rotate(8 286 206)"/>
    <g filter="url(#shadow)" transform="rotate(-7 246 286)">
      <rect x="106" y="186" width="280" height="200" rx="44" fill="#fff"/>
      <path d="M160 262h120M160 310h76" stroke="#ff4f64" stroke-opacity="0.35" stroke-width="22" stroke-linecap="round"/>
    </g>
  </g>
</svg>
`
}

const fontUrl = (file) => pathToFileURL(join(root, 'node_modules/@fontsource-variable/inter/files', file)).href
const VI = 'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB'

// Ảnh 1200×630 hiện khi dán link vào Messenger, Zalo, Facebook…
const og = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: I; src: url(${fontUrl('inter-latin-wght-normal.woff2')}); font-weight: 100 900; }
@font-face { font-family: I; src: url(${fontUrl('inter-vietnamese-wght-normal.woff2')}); font-weight: 100 900; unicode-range: ${VI}; }
* { box-sizing: border-box; margin: 0 }
body { width: 1200px; height: 630px; overflow: hidden; font-family: I, sans-serif; color: #f3f3f5; display: flex; align-items: center; gap: 40px; padding: 0 72px;
  background:
    radial-gradient(70% 70% at 50% 0%, oklch(62% 0.2 22 / 0.42), transparent 75%),
    radial-gradient(45% 50% at 0% 30%, oklch(62% 0.17 347 / 0.24), transparent 70%),
    radial-gradient(50% 50% at 100% 95%, oklch(62% 0.15 285 / 0.24), transparent 70%),
    #08080a }
body::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgb(255 255 255 / .05) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / .05) 1px, transparent 1px);
  background-size: 56px 56px; -webkit-mask-image: radial-gradient(80% 90% at 50% 0%, #000 20%, transparent 75%) }
.left { position: relative; flex: 1; display: flex; flex-direction: column; gap: 24px }
.brand { display: flex; align-items: center; gap: 16px; font-size: 32px; font-weight: 650; letter-spacing: -0.02em }
.brand svg { width: 60px; height: 60px }
h1 { font-size: 80px; line-height: 1.02; font-weight: 700; letter-spacing: -0.045em; white-space: nowrap;
  background: linear-gradient(180deg, #f3f3f5 35%, #8f8f9b); -webkit-background-clip: text; color: transparent; padding-bottom: 6px }
p { font-size: 28px; color: #a8a8b2; line-height: 1.4 }
.tags { display: flex; gap: 10px; flex-wrap: wrap }
.tags span { font-size: 20px; padding: 8px 16px; border-radius: 99px; color: #c9c9d1; background: rgb(255 255 255 / .06); border: 1px solid rgb(255 255 255 / .12) }
.cards { position: relative; width: 440px; height: 430px }
.card { position: absolute; width: 400px; height: 250px; border-radius: 28px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(140deg, rgb(255 255 255 / .09), rgb(255 255 255 / 0) 40%), rgb(26 26 32 / .85);
  border: 1px solid rgb(255 255 255 / .12); box-shadow: inset 0 1px 0 rgb(255 255 255 / .12), 0 30px 80px -20px rgb(0 0 0 / .9) }
.card b { font-size: 44px; font-weight: 650; letter-spacing: -0.03em }
.card i { position: absolute; top: 20px; left: 22px; font-style: normal; font-size: 15px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  padding: 4px 12px; border-radius: 99px; border: 1px solid rgb(255 255 255 / .1); background: rgb(255 255 255 / .06); color: #a8a8b2 }
.c1 { top: 0; left: 40px; transform: rotate(5deg) }
.c2 { top: 170px; left: 0; transform: rotate(-4deg); background: linear-gradient(140deg, rgb(255 255 255 / .09), rgb(255 255 255 / 0) 40%), radial-gradient(120% 90% at 50% 0%, oklch(72% .15 22 / .2), transparent 60%), rgb(26 26 32 / .9) }
.c2 i { color: oklch(82% .14 22) }
</style>
<div class="left">
  <div class="brand">${icon()}Sổ Ôn Tập</div>
  <h1>Ôn bài mỗi ngày</h1>
  <p>Thẻ lật, trắc nghiệm chấm điểm và ghi chú theo từng môn.</p>
  <div class="tags"><span>Miễn phí</span><span>Không cần tài khoản</span><span>Dùng được khi mất mạng</span></div>
</div>
<div class="cards">
  <div class="card c1"><i>Câu hỏi</i><b>ambitious</b></div>
  <div class="card c2"><i>Đáp án</i><b>tham vọng</b></div>
</div>`

mkdirSync(join(pub, 'icons'), { recursive: true })
writeFileSync(join(pub, 'favicon.svg'), icon())

const browser = await chromium.launch()
const page = await browser.newPage()
async function png(svg, size, file, transparent) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`)
  await page.screenshot({ path: join(pub, file), omitBackground: transparent })
}
await png(icon(), 32, 'icons/favicon-32.png', true)
await png(icon(), 192, 'icons/icon-192.png', true)
await png(icon(), 512, 'icons/icon-512.png', true)
// Android tự cắt biểu tượng thành hình tròn hoặc bo góc: nền phủ kín, hình thu nhỏ vào vùng an toàn.
await png(icon({ rounded: false, scale: 0.78 }), 512, 'icons/icon-maskable-512.png', false)
// iPhone tự bo góc, nên nền phải phủ kín, không trong suốt.
await png(icon({ rounded: false, scale: 0.9 }), 180, 'icons/apple-touch-icon.png', false)

const ogFile = join(root, 'node_modules', '.og.html')
writeFileSync(ogFile, og)
await page.setViewportSize({ width: 1200, height: 630 })
await page.goto(pathToFileURL(ogFile).href)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: join(pub, 'og.png') })
await browser.close()
console.log('Đã vẽ xong biểu tượng và og.png')

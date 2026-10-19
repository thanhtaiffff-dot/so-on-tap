// Vẽ biểu tượng trang và ảnh xem trước khi chia sẻ link, bằng trình duyệt Chromium của Playwright.
// Chỉ cần chạy lại khi đổi thiết kế:  node scripts/make-icons.mjs
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pub = join(root, 'public')
const C = { accent: '#2f4fd6', ink: '#1a2038', paper: '#f5f6fa', rule: '#c9d6f2', margin: '#f08a8a', marker: '#ffe36e' }

// Biểu tượng: tấm thẻ học có dòng kẻ và lề đỏ, giống logo nhỏ cạnh chữ "Sổ Ôn Tập".
function icon({ rounded = true, scale = 1 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="${C.accent}"/>
  <g transform="translate(256 256) scale(${scale}) rotate(-6) translate(-256 -256)">
    <rect x="96" y="136" width="320" height="240" rx="22" fill="#fff" stroke="${C.ink}" stroke-width="16"/>
    <path d="M104 206h304M104 256h304M104 306h304" stroke="${C.rule}" stroke-width="12"/>
    <path d="M188 231h168" stroke="${C.marker}" stroke-width="26" stroke-linecap="round"/>
    <path d="M160 144v224" stroke="${C.margin}" stroke-width="14"/>
  </g>
</svg>
`
}

const fontUrl = (p) => pathToFileURL(join(root, 'node_modules', p)).href

// Ảnh 1200×630 hiện khi dán link vào Messenger, Zalo, Facebook…
const og = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: B; src: url(${fontUrl('@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2')}); font-weight: 200 800; }
@font-face { font-family: B; src: url(${fontUrl('@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-vietnamese-wght-normal.woff2')}); font-weight: 200 800; unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB; }
@font-face { font-family: V; src: url(${fontUrl('@fontsource/be-vietnam-pro/files/be-vietnam-pro-vietnamese-500-normal.woff2')}); font-weight: 500; unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB; }
@font-face { font-family: V; src: url(${fontUrl('@fontsource/be-vietnam-pro/files/be-vietnam-pro-latin-500-normal.woff2')}); font-weight: 500; }
* { box-sizing: border-box; margin: 0 }
body { width: 1200px; height: 630px; background: ${C.paper}; font-family: V, sans-serif; color: ${C.ink}; display: flex; align-items: center; padding: 0 80px; gap: 40px; overflow: hidden }
.left { flex: 1; display: flex; flex-direction: column; gap: 22px }
.brand { display: flex; align-items: center; gap: 18px; font: 750 34px B; }
.brand svg { width: 64px; height: 64px }
h1 { font: 780 74px/1.05 B; white-space: nowrap; letter-spacing: -0.02em; background: linear-gradient(transparent 60%, ${C.marker} 60% 92%, transparent 92%); align-self: flex-start }
p { font-size: 30px; color: #4b5273; line-height: 1.4 }
.tags { display: flex; gap: 12px; flex-wrap: wrap }
.tags span { font-size: 22px; padding: 8px 18px; border-radius: 99px; background: #fff; border: 2px solid #dcdfeb }
.cards { position: relative; width: 430px; height: 420px }
.card { position: absolute; width: 400px; height: 250px; border-radius: 10px; background-color: #fff; border: 2px solid #dcdfeb;
  box-shadow: 0 2px 4px rgb(26 32 56 / .08), 0 18px 40px rgb(26 32 56 / .12);
  background-image: linear-gradient(90deg, transparent 52px, ${C.margin} 52px 55px, transparent 55px), repeating-linear-gradient(180deg, transparent 0 41px, ${C.rule} 41px 43px);
  display: flex; align-items: center; padding-left: 84px }
.card b { font: 700 46px B } .card i { position: absolute; top: 18px; left: 84px; font-style: normal; font-size: 20px; letter-spacing: .08em; text-transform: uppercase; color: #5d6380 }
.c1 { top: -10px; left: 30px; transform: rotate(5deg) } .c2 { top: 190px; left: 0; transform: rotate(-5deg) }
</style>
<div class="left">
  <div class="brand">${icon()}Sổ Ôn Tập</div>
  <h1>Ôn bài mỗi ngày</h1>
  <p>Thẻ lật, trắc nghiệm chấm điểm và ghi chú theo từng môn.</p>
  <div class="tags"><span>Miễn phí</span><span>Không cần tài khoản</span><span>Dùng được khi mất mạng</span></div>
</div>
<div class="cards">
  <div class="card c1"><b>ambitious</b><i>Câu hỏi</i></div>
  <div class="card c2"><b>tham vọng</b><i>Đáp án</i></div>
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
await png(icon({ rounded: false, scale: 0.82 }), 512, 'icons/icon-maskable-512.png', false)
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

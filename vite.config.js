import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Bản xem thử một file (đăng lên claude.ai) dựng với --mode xem-thu: không CSP, không service worker.
const PREVIEW_MODE = 'xem-thu'

// Chính sách bảo mật nội dung (CSP): chỉ cho chạy code và tải file từ chính trang này.
// Khi lên Cloudflare, file public/_headers gửi thêm chính sách đầy đủ hơn qua HTTP header.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function cspPlugin(preview) {
  return {
    name: 'add-csp',
    apply: 'build',
    transformIndexHtml(html) {
      if (preview) return html
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
    },
  }
}

// Ảnh xem trước khi chia sẻ link (og:image) cần địa chỉ đầy đủ, nên chỉ thêm khi biết SITE_URL
// (đặt trong file .env.production, ví dụ SITE_URL=https://so-on-tap.pages.dev).
function sharePlugin(site) {
  return {
    name: 'share-meta',
    apply: 'build',
    transformIndexHtml(html) {
      if (!/^https:\/\/[\w.-]+(\/[\w./-]*)?$/.test(site ?? '')) return html
      const url = site.endsWith('/') ? site : `${site}/`
      return html.replace(
        '</head>',
        `  <meta property="og:url" content="${url}" />\n    <meta property="og:image" content="${url}og.png" />\n  </head>`,
      )
    },
  }
}

// File của public/ không cần giữ sẵn để dùng khi mất mạng.
const NOT_CACHED = new Set(['_headers', '_redirects', 'robots.txt', 'og.png'])

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? listFiles(p) : [p]
  })
}

// Tạo sw.js (service worker): giữ sẵn mọi file của trang trong máy để mở được khi mất mạng.
// Tên bộ nhớ đệm đổi theo nội dung, nên mỗi bản mới tự thay bản cũ.
function serviceWorkerPlugin(preview) {
  let publicDir
  return {
    name: 'service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir
    },
    generateBundle(_, bundle) {
      if (preview) return
      const hash = createHash('sha256')
      const built = Object.keys(bundle)
        .filter((f) => f !== 'index.html' && !f.endsWith('.woff') && !f.endsWith('.map'))
        .sort()
      for (const f of Object.keys(bundle).sort()) hash.update(f).update(bundle[f].code ?? bundle[f].source ?? '')
      const pub = listFiles(publicDir)
        .map((p) => relative(publicDir, p).split('\\').join('/'))
        .filter((f) => !NOT_CACHED.has(f))
        .sort()
      for (const f of pub) hash.update(f).update(readFileSync(join(publicDir, f)))
      const assets = ['./', ...built, ...pub]
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: swSource(`so-on-tap-${hash.digest('hex').slice(0, 12)}`, assets) })
    },
  }
}

const swSource = (cache, assets) => `// Tạo tự động khi build (xem vite.config.js), đừng sửa tay.
const CACHE = ${JSON.stringify(cache)}
const ASSETS = ${JSON.stringify(assets)}
const ROOT = new URL('./', self.location).pathname

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('so-on-tap-') && key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

// Trang báo "Có bản mới" và người dùng bấm Tải lại: dùng bản mới ngay.
self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return
  if (req.mode === 'navigate') {
    if (url.pathname === ROOT || url.pathname === ROOT + 'index.html')
      e.respondWith(caches.match('./').then((r) => r || fetch(req)))
    return
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)))
})
`

export default defineConfig(({ command, mode }) => ({
  base: './',
  define: { __SW__: JSON.stringify(command === 'build' && mode !== PREVIEW_MODE) },
  plugins: [react(), cspPlugin(mode === PREVIEW_MODE), sharePlugin(loadEnv(mode, process.cwd(), '').SITE_URL), serviceWorkerPlugin(mode === PREVIEW_MODE)],
  test: { include: ['src/**/*.test.{js,jsx}'] },
}))

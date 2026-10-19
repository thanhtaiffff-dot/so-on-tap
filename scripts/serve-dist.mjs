// Máy chủ tĩnh nhỏ để chạy thử bản build (thư mục dist) giống khi lên Cloudflare:
// gửi kèm các header ghi trong file _headers và nén chữ (brotli/gzip). Chạy: node scripts/serve-dist.mjs [cổng]
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { brotliCompressSync, gzipSync } from 'node:zlib'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
}

// Đọc file _headers: dòng không thụt lề là đường dẫn (có thể có *), dòng thụt lề là "Tên: giá trị".
export function parseHeaders(text) {
  const rules = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      const pattern = line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
      rules.push({ re: new RegExp(`^${pattern}$`), headers: [] })
    } else if (rules.length) {
      const i = line.indexOf(':')
      rules.at(-1).headers.push([line.slice(0, i).trim().toLowerCase(), line.slice(i + 1).trim()])
    }
  }
  return rules
}

// Như Cloudflare: nén file chữ (HTML, JS, CSS, JSON, SVG); font woff2 và ảnh PNG vốn đã nén sẵn.
const COMPRESS = /^(text\/|application\/(json|manifest\+json)|image\/svg)/
const ENCODERS = [['br', brotliCompressSync], ['gzip', gzipSync]]

export function startServer({ dir = 'dist', port = 4317, host = '127.0.0.1' } = {}) {
  const root = resolve(dir)
  const packed = new Map()
  const headersFile = join(root, '_headers')
  const rules = existsSync(headersFile) ? parseHeaders(readFileSync(headersFile, 'utf8')) : []
  const server = createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    const path = decodeURIComponent(pathname)
    const file = resolve(root, `.${path.endsWith('/') ? `${path}index.html` : path}`)
    if (!file.startsWith(root + sep) || file === headersFile) {
      res.writeHead(404).end()
      return
    }
    try {
      let body = await readFile(file)
      const headers = { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }
      for (const r of rules)
        if (r.re.test(pathname)) for (const [k, v] of r.headers) headers[k] = headers[k] && k !== 'content-type' ? `${headers[k]}, ${v}` : v
      const enc = COMPRESS.test(headers['content-type']) && ENCODERS.find(([name]) => (req.headers['accept-encoding'] ?? '').includes(name))
      if (enc) {
        const key = `${enc[0]} ${file}`
        if (!packed.has(key)) packed.set(key, enc[1](body))
        body = packed.get(key)
        headers['content-encoding'] = enc[0]
        headers.vary = 'Accept-Encoding'
      }
      res.writeHead(200, headers).end(body)
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Không tìm thấy')
    }
  })
  return new Promise((ok) => server.listen(port, host, () => ok(server)))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 4317)
  await startServer({ port })
  console.log(`Đang chạy bản build tại http://127.0.0.1:${port}/`)
}

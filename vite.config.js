import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Chính sách bảo mật nội dung (CSP): chỉ cho phép tải code, font, ảnh từ chính trang web.
// Chặn được phần lớn kiểu tấn công chèn mã độc (XSS).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function cspPlugin() {
  return {
    name: 'add-csp',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      // Bản xem thử (một file duy nhất) không dùng CSP vì code nằm ngay trong trang.
      if (process.env.ON_TAP_PREVIEW) return html
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      )
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), cspPlugin()],
})

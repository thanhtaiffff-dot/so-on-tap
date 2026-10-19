// Tạo mã định danh ngẫu nhiên (UUID phiên bản 4).
// crypto.randomUUID chỉ có khi trang chạy qua https hoặc localhost. Khi mở qua http thường
// (ví dụ từ máy khác trong mạng LAN) thì tự ghép UUID từ crypto.getRandomValues.
export function uid() {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// Cài trang như ứng dụng và dùng được khi mất mạng (PWA).
import { useSyncExternalStore } from 'react'

let installEvent = null // lời mời cài của Chrome/Edge, giữ lại để bấm nút trong Cài đặt
let waiting = null // bản mới của trang đã tải xong, đang chờ tải lại
let version = 0
const subs = new Set()
const emit = () => {
  version++
  subs.forEach((f) => f())
}
const subscribe = (f) => {
  subs.add(f)
  return () => subs.delete(f)
}
const useVersion = () => useSyncExternalStore(subscribe, () => version)

export function setupPwa() {
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvent = e
    emit()
  })
  addEventListener('appinstalled', () => {
    installEvent = null
    emit()
  })
  // __SW__ chỉ bật trong bản dựng thật; bản chạy thử và bản xem thử một file thì không có service worker.
  if (!__SW__ || !('serviceWorker' in navigator)) return
  addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js')
      const found = (sw) => {
        if (!navigator.serviceWorker.controller) return // lần cài đầu tiên, chưa phải bản mới
        waiting = sw
        emit()
      }
      if (reg.waiting) found(reg.waiting)
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing
        sw?.addEventListener('statechange', () => sw.state === 'installed' && found(sw))
      })
      // Mỗi lần quay lại trang thì hỏi xem có bản mới không.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {})
      })
    } catch {
      /* không đăng ký được: trang vẫn chạy bình thường khi có mạng */
    }
  })
}

export function useUpdateReady() {
  useVersion()
  return waiting !== null
}

export function applyUpdate() {
  if (!waiting) return location.reload()
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true })
  waiting.postMessage('skip-waiting')
}

const ua = () => navigator.userAgent
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
export const isIOS = () => /iPad|iPhone|iPod/.test(ua()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isMacSafari = () => !isIOS() && /Macintosh/.test(ua()) && /Safari\//.test(ua()) && !/Chrome|Chromium|Edg\/|Firefox/.test(ua())

// Cách cài phù hợp với trình duyệt đang dùng.
export function useInstallHow() {
  useVersion()
  if (isStandalone()) return 'installed'
  if (installEvent) return 'prompt'
  if (isIOS()) return 'ios'
  if (isMacSafari()) return 'mac'
  return 'none'
}

export async function promptInstall() {
  const e = installEvent
  if (!e) return false
  e.prompt()
  const { outcome } = await e.userChoice
  installEvent = null
  emit()
  return outcome === 'accepted'
}

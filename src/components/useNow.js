import { useEffect, useState } from 'react'

// Giờ hiện tại để đếm thẻ cần ôn. Cập nhật mỗi phút và mỗi lần quay lại tab,
// nên để trang mở qua đêm thì sáng hôm sau số thẻ cần ôn vẫn đúng.
export function useNow(every = 60e3) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const onVisible = () => document.visibilityState === 'visible' && tick()
    const timer = setInterval(tick, every)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [every])
  return now
}

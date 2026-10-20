import { expect } from '@playwright/test'

// Mở trang chủ và đợi dữ liệu nạp xong.
export async function openHome(page) {
  await page.goto('./')
  await expect(page.locator('.subject-card').first()).toBeVisible()
}

export async function openSubject(page, name = 'Tiếng Anh') {
  await openHome(page)
  await page.locator('.subject-card', { hasText: name }).click()
  await expect(page.locator('h1')).toHaveText(name)
}

// Đợi các hiệu ứng xuất hiện chạy xong (khối trượt lên, màu nền đổi theo môn),
// kể cả hiệu ứng vừa bắt đầu ở khung hình kế tiếp.
export async function waitAnimations(page) {
  await page.evaluate(async () => {
    const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    for (let i = 0; i < 10; i++) {
      await frames()
      const running = document.getAnimations().filter((a) => a.playState === 'running')
      if (!running.length) return
      await Promise.all(running.map((a) => a.finished.catch(() => {})))
    }
  })
}

export async function tab(page, name) {
  await page.locator('.tabs a', { hasText: name }).click()
}

// Đợi đến khi chữ "Đã lưu" (hoặc trạng thái lưu) ổn định: không còn thay đổi nào đang chờ ghi.
export async function waitSaved(page) {
  await page.waitForFunction(() => !document.querySelector('.banner.bad'))
  await page.waitForTimeout(600)
}

// Nạp sẵn nhiều dữ liệu theo cách lưu cũ (localStorage), trang sẽ tự chuyển sang cách lưu mới khi mở.
export async function seedLegacy(page, { cards = 0, notes = 0, noteLen = 100 } = {}) {
  await page.goto('./robots.txt')
  await page.evaluate(
    ([cards, notes, noteLen]) => {
      const now = Date.now()
      const d = {
        version: 1,
        subjects: [
          { id: 'en', name: 'Tiếng Anh', hue: 222, createdAt: now },
          { id: 'ly', name: 'Vật lý', hue: 152, createdAt: now + 1 },
        ],
        cards: [],
        notes: [],
        quizHistory: [],
      }
      for (let i = 0; i < cards; i++)
        d.cards.push({ id: `c${i}`, subjectId: 'en', front: `word number ${i}`, back: `nghĩa tiếng Việt khá dài số ${i}`, box: 0, reviewedAt: 0 })
      for (let i = 0; i < notes; i++)
        d.notes.push({ id: `n${i}`, subjectId: 'en', title: `Ghi chú ${i}`, body: 'Nội dung ôn tập '.repeat(noteLen), updatedAt: now - i })
      localStorage.setItem('so-on-tap:v1', JSON.stringify(d))
    },
    [cards, notes, noteLen],
  )
}

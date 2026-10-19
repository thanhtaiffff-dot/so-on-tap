// Tốc độ với nhiều dữ liệu (lỗi L5): 2.000 thẻ và 150 ghi chú dài.
// Ngưỡng: mở danh sách dưới 1,5 giây; mỗi phím dưới 100 ms (mốc "thấy tức thì" của mô hình RAIL),
// rộng hơn số đo thật nhiều để máy chạy test chậm cũng qua; số đo thật in ra trong kết quả.
import { expect, test } from '@playwright/test'
import { openSubject, seedLegacy, tab } from './helpers.js'

test('nhiều dữ liệu vẫn mở nhanh và gõ không bị giật', async ({ page }) => {
  await seedLegacy(page, { cards: 2000, notes: 150, noteLen: 600 })
  await openSubject(page)

  const t0 = Date.now()
  await tab(page, 'Bộ thẻ')
  await expect(page.locator('.card-row').first()).toBeVisible()
  const openCards = Date.now() - t0
  await expect(page.locator('.card-row')).toHaveCount(100)

  await tab(page, 'Ghi chú')
  await page.locator('.note-item').first().click()
  await page.locator('#note-body').click()
  const perKey = await page.evaluate(async () => {
    const ta = document.querySelector('#note-body')
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    const times = []
    for (let i = 0; i < 15; i++) {
      const start = performance.now()
      set.call(ta, `${ta.value}a`)
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))
      times.push(performance.now() - start)
    }
    return times.sort((a, b) => a - b)[7]
  })
  console.log(`Mở danh sách 2.000 thẻ: ${openCards} ms; mỗi phím gõ trong ghi chú: ${perKey.toFixed(1)} ms`)
  expect(openCards).toBeLessThan(1500)
  expect(perKey).toBeLessThan(100)
})

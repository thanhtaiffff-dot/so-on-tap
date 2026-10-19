// Dùng khi mất mạng: mở trang một lần, tắt máy chủ, tải lại vẫn chạy và còn dữ liệu.
import { expect, test } from '@playwright/test'
import { startServer } from '../scripts/serve-dist.mjs'

test('mở lại được khi mất mạng sau lần mở đầu tiên', async ({ browser }) => {
  const port = 4500 + Math.floor(Math.random() * 400)
  const server = await startServer({ port })
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    await page.goto(`http://127.0.0.1:${port}/`)
    await expect(page.locator('.subject-card').first()).toBeVisible()
    await page.waitForFunction(async () => {
      await navigator.serviceWorker.ready
      return Boolean(navigator.serviceWorker.controller)
    })
    await page.fill('#new-subject', 'Học khi mất mạng')
    await page.getByRole('button', { name: 'Thêm môn' }).click()
    await page.waitForTimeout(700)

    server.closeAllConnections()
    await new Promise((ok) => server.close(ok))
    const offline = await page.request.get(`http://127.0.0.1:${port}/`).catch(() => null)
    expect(offline).toBeNull()

    await page.reload()
    await expect(page.locator('.subject-card h2')).toHaveText(['Tiếng Anh', 'Vật lý', 'Học khi mất mạng'])
    await page.locator('.subject-card', { hasText: 'Tiếng Anh' }).click()
    await expect(page.locator('.flashcard')).toBeVisible()
  } finally {
    await context.close()
    server.close()
  }
})

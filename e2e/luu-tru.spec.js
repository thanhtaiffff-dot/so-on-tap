// Lưu dữ liệu: nhiều tab, bộ nhớ đầy, chuyển dữ liệu cũ, sao lưu và khôi phục.
import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { openHome, openSubject, seedLegacy, tab, waitSaved } from './helpers.js'

test('mở 2 tab cùng lúc: sửa ở tab nào cũng không mất (L1)', async ({ context }) => {
  const a = await context.newPage()
  const b = await context.newPage()
  await openSubject(a)
  await openHome(b)
  await tab(a, 'Bộ thẻ')
  await a.fill('#card-front', 'từ tab A')
  await a.fill('#card-back', 'A')
  await a.getByRole('button', { name: 'Thêm thẻ' }).click()
  await b.fill('#new-subject', 'Môn từ tab B')
  await b.getByRole('button', { name: 'Thêm môn' }).click()
  // Tab kia tự cập nhật, không cần tải lại.
  await expect(a.locator('.tabs')).toBeVisible()
  await expect(b.locator('.subject-card', { hasText: 'Tiếng Anh' })).toContainText('7 thẻ')
  await a.goto('./')
  await expect(a.locator('.subject-card h2')).toContainText(['Môn từ tab B'])
  await waitSaved(a)
  await waitSaved(b)
  await b.reload()
  await expect(b.locator('.subject-card h2')).toHaveText(['Tiếng Anh', 'Vật lý', 'Môn từ tab B'])
  await expect(b.locator('.subject-card', { hasText: 'Tiếng Anh' })).toContainText('7 thẻ')
})

test('ghi không được (bộ nhớ đầy) thì báo ngay và thử lại được (L2)', async ({ page }) => {
  await openHome(page)
  await page.evaluate(() => {
    window.__put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('Hết chỗ', 'QuotaExceededError')
    }
  })
  await page.fill('#new-subject', 'Môn chưa lưu')
  await page.getByRole('button', { name: 'Thêm môn' }).click()
  const banner = page.locator('.banner.bad')
  await expect(banner).toContainText('Chưa lưu được')
  await expect(banner).toContainText('đã đầy')
  await page.evaluate(() => (IDBObjectStore.prototype.put = window.__put))
  await banner.getByRole('button', { name: 'Thử lại' }).click()
  await expect(banner).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.subject-card h2')).toContainText(['Môn chưa lưu'])
})

test('dữ liệu của bản cũ được chuyển sang cách lưu mới', async ({ page }) => {
  await seedLegacy(page, { cards: 12, notes: 3 })
  await openHome(page)
  await expect(page.locator('.subject-card', { hasText: 'Tiếng Anh' })).toContainText('12 thẻ · 3 ghi chú')
  await page.reload()
  await expect(page.locator('.subject-card', { hasText: 'Tiếng Anh' })).toContainText('12 thẻ · 3 ghi chú')
})

test('mở qua địa chỉ http thường (không có crypto.randomUUID) vẫn dùng được (L6)', async ({ page }) => {
  await page.addInitScript(() => {
    delete Crypto.prototype.randomUUID
  })
  await openHome(page)
  expect(await page.evaluate(() => typeof crypto.randomUUID)).toBe('undefined')
  await page.fill('#new-subject', 'Môn qua http')
  await page.getByRole('button', { name: 'Thêm môn' }).click()
  await expect(page.locator('.subject-card h2')).toContainText(['Môn qua http'])
})

test('tải file sao lưu, xoá hết rồi khôi phục lại', async ({ page }) => {
  await openHome(page)
  await page.getByRole('link', { name: 'Cài đặt' }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Tải file sao lưu' }).click()])
  expect(download.suggestedFilename()).toMatch(/^so-on-tap-\d{4}-\d{2}-\d{2}\.json$/)
  const file = await download.path()
  const data = JSON.parse(await readFile(file, 'utf8'))
  expect(data).toMatchObject({ app: 'so-on-tap', version: 3 })
  expect(data.cards).toHaveLength(11)
  await expect(page.locator('.panel', { hasText: 'Sao lưu và khôi phục' })).toContainText('Lần sao lưu gần nhất')

  await page.getByRole('button', { name: 'Xoá hết dữ liệu' }).click()
  await page.getByRole('button', { name: 'Xoá hết', exact: true }).click()
  await page.setInputFiles('#import-file', { name: 'la.json', mimeType: 'application/json', buffer: Buffer.from('{"khong":"phai"}') })
  await expect(page.getByRole('status')).toContainText('không phải file sao lưu')
  await page.setInputFiles('#import-file', file)
  await expect(page.getByRole('status')).toContainText('Đã khôi phục')
  await page.getByRole('link', { name: 'Môn học' }).click()
  await expect(page.locator('.subject-card h2')).toHaveText(['Tiếng Anh', 'Vật lý'])
})

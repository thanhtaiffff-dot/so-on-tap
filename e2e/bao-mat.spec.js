// Bảo mật: header gửi kèm trang, không có gì vi phạm chính sách nội dung (CSP), chữ người dùng nhập không chạy được thành code.
import { expect, test } from '@playwright/test'
import { openSubject, tab } from './helpers.js'

test('trang và file được gửi kèm đủ header bảo mật', async ({ page, request }) => {
  const res = await page.goto('./')
  const h = res.headers()
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
  expect(h['content-security-policy']).toContain("script-src 'self'")
  expect(h['x-frame-options']).toBe('DENY')
  expect(h['x-content-type-options']).toBe('nosniff')
  expect(h['referrer-policy']).toBe('no-referrer')
  expect(h['permissions-policy']).toContain('camera=()')
  const js = await page.locator('script[type="module"]').getAttribute('src')
  expect((await request.get(js)).headers()['cache-control']).toContain('immutable')
  expect((await request.get('sw.js')).headers()['cache-control']).toBe('no-cache')
})

test('không có gì bị chính sách bảo mật (CSP) chặn khi dùng trang', async ({ page }) => {
  await page.addInitScript(() => {
    window.__csp = []
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  await openSubject(page)
  await page.click('.flashcard')
  await tab(page, 'Trắc nghiệm')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await tab(page, 'Ghi chú')
  await page.locator('.note-item').first().click()
  await tab(page, 'Bộ thẻ')
  await page.getByRole('link', { name: 'Cài đặt' }).click()
  await page.getByRole('button', { name: /Giao diện/ }).click()
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => window.__csp)).toEqual([])
  expect(errors).toEqual([])
})

test('chữ có dạng mã HTML chỉ hiện ra như chữ, không chạy được', async ({ page }) => {
  const evil = '<img src=x onerror="window.__hacked=1">'
  await openSubject(page)
  await tab(page, 'Bộ thẻ')
  await page.fill('#card-front', evil)
  await page.fill('#card-back', evil)
  await page.getByRole('button', { name: 'Thêm thẻ' }).click()
  await expect(page.locator('.card-row').first()).toContainText(evil)
  await tab(page, 'Ghi chú')
  await page.getByRole('link', { name: 'Ghi chú mới' }).click()
  await page.locator('#note-title').fill(evil)
  await page.getByRole('link', { name: '← Danh sách' }).click()
  await expect(page.locator('.note-item').first()).toContainText(evil)
  expect(await page.evaluate(() => window.__hacked)).toBeUndefined()
  expect(await page.locator('img[src="x"]').count()).toBe(0)
})

// Khả năng truy cập (người dùng trình đọc màn hình, bàn phím, mắt kém): quét bằng axe theo chuẩn WCAG 2.1 AA.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openSubject, tab } from './helpers.js'

for (const colorScheme of ['light', 'dark']) {
  test(`không có lỗi khả năng truy cập ở mọi màn hình (giao diện ${colorScheme === 'light' ? 'sáng' : 'tối'})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    const problems = []
    const scan = async (screen) => {
      await page.waitForTimeout(150)
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze()
      for (const v of r.violations) problems.push(`${screen}: ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)
    }
    await openSubject(page)
    await scan('thẻ lật')
    await page.click('.flashcard')
    await page.waitForTimeout(600)
    await scan('thẻ lật, mặt sau')
    await page.getByRole('button', { name: 'Đổi tên' }).click()
    await scan('đổi tên môn')
    await page.getByRole('button', { name: 'Huỷ' }).click()
    await tab(page, 'Trắc nghiệm')
    await scan('cài đặt trắc nghiệm')
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await page.locator('.option').first().click()
    await scan('câu hỏi')
    for (let i = 0; i < 10; i++) {
      const next = page.locator('.feedback .btn')
      if (!(await next.count())) break
      const last = (await next.innerText()).includes('kết quả')
      await next.click()
      if (last) break
      await page.locator('.option').nth(1).click()
    }
    await scan('kết quả trắc nghiệm')
    await tab(page, 'Ghi chú')
    await scan('danh sách ghi chú')
    await page.locator('.note-item').first().click()
    await scan('soạn ghi chú')
    await tab(page, 'Bộ thẻ')
    await page.getByRole('button', { name: 'Thêm nhiều thẻ cùng lúc' }).click()
    await scan('bộ thẻ')
    await page.getByRole('link', { name: 'Cài đặt' }).click()
    await scan('cài đặt')
    await page.getByRole('link', { name: 'Môn học' }).click()
    await scan('trang chủ')
    expect(problems).toEqual([])
  })
}

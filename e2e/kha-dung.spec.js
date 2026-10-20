// Khả năng truy cập (người dùng trình đọc màn hình, bàn phím, mắt kém): quét bằng axe theo chuẩn WCAG 2.1 AA.
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { gradeCard, openSubject, tab, waitAnimations } from './helpers.js'

// Hai giao diện mặc định, cùng các bộ nền và màu nhấn tự chỉnh (Cài đặt → Giao diện), phối theo kiểu khó đọc nhất:
// màu nhấn nhạt trên nền sáng, nút tô màu nhấn, chữ rất lớn, tương phản cao.
const LOOKS = [
  { name: 'sáng', mode: 'light' },
  { name: 'tối', mode: 'dark' },
  { name: 'đen OLED, xanh dương, nút màu nhấn, chữ có chân', mode: 'dark', look: { dark: 'oled', accent: '#4f7cff', primary: 'accent', font: 'serif' } },
  { name: 'xám dịu, xanh ngọc, vệt màu theo màu nhấn', mode: 'dark', look: { dark: 'dim', accent: '#2dd4bf', ambient: 'accent', round: 'round' } },
  { name: 'giấy kem, vàng, nút màu nhấn, chữ rất lớn', mode: 'light', look: { light: 'paper', accent: '#f5c518', primary: 'accent', size: '125' } },
  { name: 'sáng, hồng, nút màu nhấn, tương phản cao', mode: 'light', look: { accent: '#f472b6', primary: 'accent', contrast: 'high', ambient: 'accent' } },
]

for (const { name, mode, look } of LOOKS) {
  test(`không có lỗi khả năng truy cập ở mọi màn hình (giao diện ${name})`, async ({ page }) => {
    test.slow() // quét hơn chục màn hình
    await page.addInitScript(([m, l]) => {
      localStorage.setItem('so-on-tap:giao-dien', m)
      if (l) localStorage.setItem('so-on-tap:tuy-chinh', JSON.stringify(l))
    }, [mode, look])
    const problems = []
    // ready: một phần tử của màn hình cần quét. Chuyển trang chạy sau cú bấm một chút, nên phải đợi
    // màn hình mới hiện ra rồi mới đợi hiệu ứng xuất hiện chạy xong, để đo độ tương phản trên màu thật.
    const scan = async (screen, ready) => {
      await expect(ready).toBeVisible()
      await waitAnimations(page)
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze()
      for (const v of r.violations) problems.push(`${screen}: ${v.id} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)
    }
    await openSubject(page)
    await scan('thẻ lật', page.locator('.flashcard'))
    await page.click('.flashcard')
    await page.waitForTimeout(600)
    await scan('thẻ lật, mặt sau', page.locator('.flashcard.is-flipped'))
    await page.getByRole('button', { name: 'Đổi tên' }).click()
    await scan('đổi tên môn', page.locator('#subject-name'))
    await page.getByRole('button', { name: 'Huỷ' }).click()
    // Chấm hết 6 thẻ để xem màn hình ôn xong.
    await page.getByRole('button', { name: /^Dễ/ }).click()
    for (let i = 0; i < 5; i++) await gradeCard(page, 'Dễ')
    await scan('ôn xong', page.locator('.result'))
    await tab(page, 'Trắc nghiệm')
    await scan('cài đặt trắc nghiệm', page.getByRole('button', { name: 'Bắt đầu' }))
    await page.getByRole('button', { name: 'Bắt đầu' }).click()
    await page.locator('.option').first().click()
    await scan('câu hỏi', page.locator('.feedback'))
    for (let i = 0; i < 10; i++) {
      const next = page.locator('.feedback .btn')
      if (!(await next.count())) break
      const last = (await next.innerText()).includes('kết quả')
      await next.click()
      if (last) break
      await page.locator('.option').nth(1).click()
    }
    await scan('kết quả trắc nghiệm', page.locator('.result'))
    await tab(page, 'Ghi chú')
    await scan('danh sách ghi chú', page.locator('.note-item').first())
    await page.locator('.note-item').first().click()
    await scan('soạn ghi chú', page.locator('#note-title'))
    await tab(page, 'Bộ thẻ')
    await page.getByRole('button', { name: 'Thêm nhiều thẻ cùng lúc' }).click()
    await scan('bộ thẻ', page.locator('#card-bulk'))
    await page.getByRole('link', { name: 'Cài đặt' }).click()
    await scan('cài đặt', page.locator('.settings h1'))
    await page.getByRole('link', { name: 'Môn học' }).click()
    await scan('trang chủ', page.locator('#new-subject'))
    await page.getByRole('button', { name: 'Tìm nhanh' }).click()
    await page.getByRole('combobox').fill('anh')
    await scan('tìm nhanh', page.locator('.pal-item').first())
    expect(problems).toEqual([])
  })
}

// Các thao tác chính, chạy trên cả máy tính và điện thoại.
import { expect, test } from '@playwright/test'
import { openHome, openSubject, tab } from './helpers.js'

test('trang chủ có dữ liệu mẫu, thêm môn mới và còn nguyên sau khi tải lại', async ({ page }) => {
  await openHome(page)
  await expect(page.locator('.subject-card h2')).toHaveText(['Tiếng Anh', 'Vật lý'])
  await page.fill('#new-subject', 'Hoá học')
  await page.getByRole('button', { name: 'Thêm môn' }).click()
  await expect(page.locator('.subject-card h2')).toHaveText(['Tiếng Anh', 'Vật lý', 'Hoá học'])
  await page.reload()
  await expect(page.locator('.subject-card h2')).toHaveText(['Tiếng Anh', 'Vật lý', 'Hoá học'])
})

test('thẻ lật: bấm chuột vào thẻ rồi dùng phím mũi tên vẫn được (L7)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'điện thoại không có bàn phím')
  await openSubject(page)
  const counter = page.locator('.study .num').first()
  await page.click('.flashcard')
  await expect(page.locator('.flashcard')).toHaveClass(/is-flipped/)
  await page.keyboard.press('ArrowRight')
  await expect(counter).toHaveText('2 / 6')
  await page.keyboard.press('Space')
  await expect(page.locator('.flashcard')).toHaveClass(/is-flipped/)
  await page.keyboard.press('ArrowLeft')
  await expect(counter).toHaveText('3 / 6')
  await page.locator('h1').click()
  await page.keyboard.press('Space')
  await expect(page.locator('.flashcard')).toHaveClass(/is-flipped/)
  await page.keyboard.press('ArrowRight')
  await expect(counter).toHaveText('4 / 6')
})

test('ôn đi ôn lại nhiều lượt trong một ngày không thành "đã thuộc" (L4)', async ({ page }) => {
  await openSubject(page)
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 6; i++) {
      await page.click('.flashcard')
      await page.getByRole('button', { name: /Nhớ rồi/ }).click()
    }
    await expect(page.locator('.result')).toContainText('6 nhớ')
    await page.getByRole('button', { name: 'Ôn lượt mới' }).click()
  }
  await page.goto('./')
  await expect(page.locator('.subject-card', { hasText: 'Tiếng Anh' })).toContainText('Đã thuộc 0%')
})

test('trắc nghiệm: số câu không bị trùng (L8) và chấm điểm', async ({ page }) => {
  await openSubject(page)
  await tab(page, 'Trắc nghiệm')
  await expect(page.locator('.seg button')).toHaveText(['5', 'Tất cả (6)'])
  await expect(page.locator('.seg [aria-checked="true"]')).toHaveText('Tất cả (6)')
  await page.locator('.seg button', { hasText: '5' }).click()
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  for (let i = 0; i < 5; i++) {
    await page.locator('.option').first().click()
    await page.locator('.feedback .btn').click()
  }
  await expect(page.locator('.result .big')).toHaveText(/^\d\/5$/)
  await page.getByRole('button', { name: 'Đổi cài đặt' }).click()
  await expect(page.locator('.history li')).toHaveCount(1)
})

test('ghi chú mới chỉ được tạo khi gõ chữ, gõ liền mạch không mất chữ (L9)', async ({ page }) => {
  await openSubject(page)
  await tab(page, 'Ghi chú')
  await expect(page.locator('.note-item')).toHaveCount(1)
  await page.getByRole('link', { name: 'Ghi chú mới' }).click()
  await page.getByRole('link', { name: '← Danh sách' }).click()
  await expect(page.locator('.note-item')).toHaveCount(1)

  await page.getByRole('link', { name: 'Ghi chú mới' }).click()
  await page.locator('#note-title').pressSequentially('Từ vựng bài 1')
  await expect(page.locator('#note-title')).toHaveValue('Từ vựng bài 1')
  await expect(page).toHaveURL(/ghi-chu\/[0-9a-f-]{36}$/)
  await page.locator('#note-body').fill('present perfect')
  await expect(page.locator('.save-state')).toHaveText('Đã lưu')
  await page.getByRole('link', { name: '← Danh sách' }).click()
  await expect(page.locator('.note-item')).toHaveCount(2)

  // Gõ rồi xoá hết chữ: quay về danh sách thì ghi chú rỗng được dọn đi.
  await page.getByRole('link', { name: 'Ghi chú mới' }).click()
  await page.locator('#note-title').fill('x')
  await page.locator('#note-title').fill('')
  await page.getByRole('link', { name: '← Danh sách' }).click()
  await expect(page.locator('.note-item')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.note-item').first()).toContainText('Từ vựng bài 1')
})

test('chuyển qua lại các mục rồi bấm Quay lại thì về trang chủ (L10)', async ({ page }) => {
  await openSubject(page)
  await tab(page, 'Trắc nghiệm')
  await tab(page, 'Ghi chú')
  await tab(page, 'Bộ thẻ')
  await page.goBack()
  await expect(page.locator('.hero h1')).toBeVisible()
})

test('thêm, sửa, xoá thẻ và thêm nhiều thẻ một lúc', async ({ page }) => {
  await openSubject(page)
  await tab(page, 'Bộ thẻ')
  await page.fill('#card-front', 'diligent')
  await page.fill('#card-back', 'siêng năng')
  await page.getByRole('button', { name: 'Thêm thẻ' }).click()
  const first = page.locator('.card-row').first()
  await expect(first).toContainText('diligent')

  await first.getByRole('button', { name: 'Sửa' }).click()
  await page.locator('.card-edit input').first().fill('hard-working')
  await page.locator('.card-edit').getByRole('button', { name: 'Lưu' }).click()
  await expect(page.locator('.card-row').first()).toContainText('hard-working')

  await page.locator('.card-row').first().getByRole('button', { name: 'Xoá' }).click()
  await page.getByRole('button', { name: 'Xoá luôn' }).click()
  await expect(page.locator('.card-row')).toHaveCount(6)

  await page.getByRole('button', { name: 'Thêm nhiều thẻ cùng lúc' }).click()
  await page.fill('#card-bulk', 'one - một\ntwo\thai\nthree; ba')
  await page.getByRole('button', { name: 'Thêm 3 thẻ' }).click()
  await expect(page.locator('.card-row')).toHaveCount(9)
  await page.reload()
  await expect(page.locator('.card-row')).toHaveCount(9)
  await expect(page.locator('.card-row').first()).toContainText('three')
})

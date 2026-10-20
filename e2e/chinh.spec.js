// Các thao tác chính, chạy trên cả máy tính và điện thoại.
import { expect, test } from '@playwright/test'
import { gradeCard, openHome, openSubject, seedLegacy, tab } from './helpers.js'

test('trang chủ có dữ liệu mẫu, thêm môn mới và còn nguyên sau khi tải lại', async ({ page }) => {
  await openHome(page)
  await expect(page.locator('.subject-card h2')).toHaveText(['Tiếng Anh', 'Vật lý'])
  await page.fill('#new-subject', 'Hoá học')
  await page.getByRole('button', { name: 'Thêm môn' }).click()
  await expect(page.locator('.subject-card h2')).toHaveText(['Tiếng Anh', 'Vật lý', 'Hoá học'])
  await page.reload()
  await expect(page.locator('.subject-card h2')).toHaveText(['Tiếng Anh', 'Vật lý', 'Hoá học'])
})

test('thẻ lật: bấm chuột vào thẻ rồi dùng phím tắt vẫn được (L7)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'điện thoại không có bàn phím')
  await openSubject(page)
  const left = page.locator('.study .num').first()
  await expect(left).toHaveText('Còn 6 thẻ')
  await page.click('.flashcard')
  await expect(page.locator('.flashcard')).toHaveClass(/is-flipped/)
  await expect(page.getByRole('button', { name: /^Quên/ })).toContainText('1 phút')
  // 4 là Dễ: thẻ mới vào lịch ôn luôn, lượt này bớt một thẻ.
  await page.keyboard.press('4')
  await expect(left).toHaveText('Còn 5 thẻ')
  await expect(page.locator('.flashcard')).not.toHaveClass(/is-flipped/)
  // ← là Quên: thẻ quay lại sau 1 phút, nên vẫn còn 5 thẻ.
  await page.keyboard.press('Space')
  await expect(page.locator('.flashcard')).toHaveClass(/is-flipped/)
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('.flashcard')).not.toHaveClass(/is-flipped/)
  await expect(left).toHaveText('Còn 5 thẻ')
  await page.locator('h1').click()
  await page.keyboard.press('Space')
  await expect(page.locator('.flashcard')).toHaveClass(/is-flipped/)
  await page.keyboard.press('4')
  await expect(left).toHaveText('Còn 4 thẻ')
})

test('ôn đi ôn lại nhiều lượt trong một ngày không thành "đã thuộc" (L4)', async ({ page }) => {
  await openSubject(page)
  // Lượt "Hôm nay": thẻ mới phải nhớ 2 lần (ngay bây giờ và 10 phút sau) mới vào lịch ôn.
  for (let i = 0; i < 12; i++) await gradeCard(page, 'Nhớ')
  await expect(page.locator('.result')).toContainText('12 lượt ôn')
  await expect(page.locator('.result')).toContainText('Đã ôn xong mọi thẻ cần ôn hôm nay')
  await expect(page.locator('.result')).toContainText('Lần ôn tới:')
  await page.getByRole('button', { name: 'Ôn tự do' }).click()
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 6; i++) await gradeCard(page, 'Nhớ')
    await expect(page.locator('.result')).toContainText('6 lượt ôn')
    await page.getByRole('button', { name: 'Ôn lượt mới' }).click()
  }
  await page.goto('./')
  await expect(page.locator('.subject-card', { hasText: 'Tiếng Anh' })).toContainText('Đã thuộc 0%')
})

test('lịch ôn: trang chủ đếm thẻ cần ôn, ôn xong thì hẹn ngày khác, tải lại vẫn nhớ', async ({ page }) => {
  // 3 thẻ đã ôn từ 10 ngày trước (giờ đến hạn) và 25 thẻ mới: mỗi ngày chỉ học 20 thẻ mới.
  await seedLegacy(page, { cards: 28, reviewed: 3 })
  await openHome(page)
  const panel = page.locator('.today')
  await expect(panel.locator('h2')).toHaveText('Cần ôn 23 thẻ')
  await expect(panel).toContainText('3 thẻ đến hạn · 20 thẻ mới')
  await panel.getByRole('link', { name: /Tiếng Anh/ }).click()
  await expect(page).toHaveURL(/the-lat$/)
  await expect(page.locator('.tabs a', { hasText: 'Thẻ lật' })).toContainText('23')
  // Thẻ đến hạn đứng trước thẻ mới.
  await expect(page.locator('.face.front .face-text')).toHaveText('word number 0')
  for (let i = 0; i < 23; i++) await gradeCard(page, 'Dễ')
  await expect(page.locator('.result')).toContainText('Còn 5 thẻ mới chưa học')
  await page.reload()
  await expect(page.locator('.result')).toContainText('Hôm nay môn này không còn thẻ nào cần ôn')
  await page.getByRole('button', { name: 'Học thêm 5 thẻ mới' }).click()
  for (let i = 0; i < 5; i++) await gradeCard(page, 'Dễ')
  await expect(page.locator('.result')).not.toContainText('thẻ mới chưa học')
  await tab(page, 'Bộ thẻ')
  await expect(page.locator('.box-pill', { hasText: 'Mới' })).toHaveCount(0)
  await expect(page.locator('.box-pill').first()).toHaveText(/^Ôn .+ nữa$/)
  await page.goto('./')
  await expect(panel.locator('h2')).toHaveText('Hôm nay ôn xong rồi')
  await expect(panel).toContainText('Lần ôn tới:')
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

// Đáp án của các thẻ mẫu môn Tiếng Anh.
const ANSWERS = {
  ambitious: 'tham vọng, có hoài bão',
  consistent: 'nhất quán, kiên định',
  reluctant: 'miễn cưỡng, ngần ngại',
  thorough: 'kỹ lưỡng, cẩn thận',
  efficient: 'hiệu quả (ít tốn công sức)',
  curious: 'tò mò, ham hiểu biết',
}

test('trắc nghiệm: chọn sai thì có lời giải, làm lại được các câu sai', async ({ page }) => {
  test.slow() // 12 câu, mỗi câu đợi hiệu ứng hiện đáp án
  await openSubject(page)
  await tab(page, 'Trắc nghiệm')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  let noted = false
  for (let i = 0; i < 6; i++) {
    const prompt = await page.locator('.question').innerText()
    await page.locator('.option', { hasNotText: ANSWERS[prompt] }).first().click()
    const explain = page.locator('.feedback .explain')
    await expect(explain).toContainText(`Đáp án đúng: ${ANSWERS[prompt]}`)
    await expect(explain).toContainText('là đáp án của câu')
    if (prompt === 'ambitious') {
      await expect(explain).toContainText('She is ambitious about her career.')
      noted = true
    }
    await page.locator('.feedback .btn').click()
  }
  expect(noted).toBe(true)
  await expect(page.locator('.result .big')).toHaveText('0/6')
  await expect(page.locator('.review li')).toHaveCount(6)
  await page.getByRole('button', { name: 'Làm lại 6 câu sai' }).click()
  for (let i = 0; i < 6; i++) {
    const prompt = await page.locator('.question').innerText()
    await page.locator('.option', { hasText: ANSWERS[prompt] }).click()
    await page.locator('.feedback .btn').click()
  }
  await expect(page.locator('.result')).toContainText('Kết quả làm lại câu sai')
  await expect(page.locator('.result .big')).toHaveText('6/6')
  // Lượt làm lại chỉ để luyện: lịch sử điểm chỉ có lần làm đầu.
  await page.getByRole('button', { name: 'Đổi cài đặt' }).click()
  await expect(page.locator('.history li')).toHaveCount(1)
  await expect(page.locator('.history li')).toContainText('0/6')
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

test('tìm nhanh (Ctrl/⌘ + K): gõ không dấu vẫn tìm ra, Enter để mở', async ({ page, isMobile }) => {
  await openHome(page)
  const box = page.getByRole('combobox', { name: 'Tìm môn, ghi chú hoặc lệnh' })
  if (isMobile) await page.getByRole('button', { name: 'Tìm nhanh' }).click()
  else await page.keyboard.press('Control+K')
  await expect(box).toBeFocused()
  await box.fill('vat ly')
  await expect(page.getByRole('option').first()).toContainText('Vật lý')
  await box.press('Enter')
  await expect(page.locator('h1')).toHaveText('Vật lý')
  await expect(page.locator('.palette')).toBeHidden()

  await page.getByRole('button', { name: 'Tìm nhanh' }).click()
  await box.fill('trac nghiem anh')
  await page.getByRole('option', { name: /Trắc nghiệm · Tiếng Anh/ }).click()
  await expect(page).toHaveURL(/trac-nghiem$/)
  await expect(page.locator('h1')).toHaveText('Tiếng Anh')

  await page.getByRole('button', { name: 'Tìm nhanh' }).click()
  await box.fill('giao dien sang')
  await box.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  if (isMobile) return
  await page.keyboard.press('Control+K')
  await expect(box).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.palette')).toBeHidden()
})

test('trắc nghiệm bằng bàn phím: A đến D chọn đáp án, Enter sang câu tiếp', async ({ page, isMobile }) => {
  test.skip(isMobile, 'điện thoại không có bàn phím')
  await openSubject(page)
  await tab(page, 'Trắc nghiệm')
  await page.getByRole('button', { name: 'Bắt đầu' }).click()
  await expect(page.getByText('Câu 1 / 6')).toBeVisible()
  await page.keyboard.press('b')
  await expect(page.locator('.option.is-correct')).toHaveCount(1)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Câu 2 / 6')).toBeVisible()
  await page.keyboard.press('4')
  await expect(page.locator('.feedback')).toBeVisible()
})

test('mặc định là giao diện tối; đổi được, nhớ lựa chọn, "Theo máy" theo đúng máy', async ({ page }) => {
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())
  await openHome(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: /Giao diện/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: /Giao diện/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'system')
  // Máy đổi sáng/tối thì trang đổi theo (do JavaScript đổi bộ nền, nên đợi một chút).
  await page.emulateMedia({ colorScheme: 'light' })
  await expect.poll(bg).toBe('#f2f2f5')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(bg).toBe('#08080a')
})

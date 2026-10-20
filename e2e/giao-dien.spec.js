// Tự chỉnh giao diện (Cài đặt → Giao diện): bộ nền, màu nhấn, phông, cỡ chữ, chủ đề nhanh.
import { expect, test } from '@playwright/test'
import { contrast, parseHex } from '../src/components/color.js'
import { openHome } from './helpers.js'

// Không dùng service worker ở đây, để chặn được file JavaScript của trang (test "vẽ ngay khi mở trang").
test.use({ serviceWorkers: 'block' })

const html = (page) => page.locator('html')
const cssVar = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name)
const group = (page, name) => page.getByRole('radiogroup', { name, exact: true })
const radio = (page, groupName, name) => group(page, groupName).getByRole('radio', { name, exact: true })

async function openAppearance(page) {
  await openHome(page)
  await page.getByRole('link', { name: 'Cài đặt' }).click()
  await expect(page.getByRole('heading', { name: 'Giao diện' })).toBeVisible()
}

async function expectAttrs(page, attrs) {
  for (const [name, value] of Object.entries(attrs)) await expect(html(page), name).toHaveAttribute(name, value)
}

test('chỉnh từng phần: cả trang đổi ngay, tải lại vẫn giữ', async ({ page }) => {
  await openAppearance(page)
  await radio(page, 'Nền khi tối', 'Đen OLED').click()
  await expect(html(page)).toHaveAttribute('data-palette', 'oled')
  await expect(html(page)).toHaveCSS('background-color', 'rgb(0, 0, 0)')
  await radio(page, 'Màu nhấn', 'Xanh dương').click()
  await radio(page, 'Phông chữ', 'Có chân').click()
  await radio(page, 'Cỡ chữ', 'Lớn').click()
  await radio(page, 'Bo góc', 'Tròn').click()
  await radio(page, 'Vệt màu phía sau', 'Tắt').click()
  await page.getByRole('checkbox', { name: 'Tô màu nhấn cho nút chính' }).check()
  await page.getByRole('checkbox', { name: /^Kính mờ/ }).uncheck()

  const check = async () => {
    await expectAttrs(page, {
      'data-palette': 'oled', 'data-accent': 'custom', 'data-font': 'serif', 'data-size': '112',
      'data-round': 'round', 'data-ambient': 'off', 'data-primary': 'accent', 'data-glass': 'solid',
    })
    await expect(radio(page, 'Nền khi tối', 'Đen OLED')).toHaveAttribute('aria-checked', 'true')
    // Cỡ chữ "Lớn" là 112,5% của 16px; nút chính tô đúng màu đã chọn, chữ trên nút đen cho dễ đọc.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('18px')
    const btn = page.locator('.ap-preview .btn:not(.ghost)')
    await expect(btn).toHaveCSS('background-color', 'rgb(79, 124, 255)')
    await expect(btn).toHaveCSS('color', 'rgb(0, 0, 0)')
    await expect(page.locator('.ambient')).toBeHidden()
  }
  await check()
  await page.reload()
  await check()
})

test('mở trang là đúng giao diện đã chọn ngay, trước khi phần còn lại của trang chạy', async ({ page }) => {
  await openAppearance(page)
  // Đang để luôn tối mà chọn nền sáng: chuyển sang sáng luôn để thấy ngay.
  await radio(page, 'Nền khi sáng', 'Giấy kem').click()
  await expect(html(page)).toHaveAttribute('data-theme', 'light')
  await radio(page, 'Màu nhấn', 'Vàng').click()
  await radio(page, 'Cỡ chữ', 'Rất lớn').click()
  await expect(html(page)).toHaveAttribute('data-size', '125')
  const accent = await cssVar(page, '--accent')

  // Chặn mã JavaScript của trang: chỉ còn HTML, CSS và theme-init.js.
  await page.route(/\/assets\/.+\.js$/, (route) => route.abort())
  await page.reload()
  await expect(page.locator('#root')).toBeEmpty()
  await expectAttrs(page, { 'data-theme': 'light', 'data-palette': 'paper', 'data-accent': 'custom', 'data-size': '125' })
  expect(await cssVar(page, '--bg')).toBe('#f3ecdf')
  expect(await cssVar(page, '--accent')).toBe(accent)
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('20px')
  for (const meta of await page.locator('meta[name="theme-color"]').all()) await expect(meta).toHaveAttribute('content', '#f3ecdf')
})

test('cách vẽ đã lưu bị cũ (sau bản cập nhật): mở trang là lưu lại cách vẽ mới cho lần mở sau', async ({ page }) => {
  await page.goto('./robots.txt')
  await page.evaluate(() => {
    const old = { palette: 'dark', bar: '#08080a', vars: {} }
    localStorage.setItem('so-on-tap:tuy-chinh', JSON.stringify({ dark: 'oled', paint: { attrs: {}, dark: old, light: old } }))
  })
  await openHome(page)
  await expect(html(page)).toHaveAttribute('data-palette', 'oled')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('so-on-tap:tuy-chinh')))
  expect(saved.paint.dark).toEqual({ palette: 'oled', bar: '#000000', vars: {} })
})

test('màu tự chọn quá nhạt: chữ màu nhấn được làm đậm cho dễ đọc, nút vẫn đúng màu đã chọn', async ({ page }) => {
  await openAppearance(page)
  await radio(page, 'Chế độ', 'Sáng').click()
  await page.getByLabel('Chọn màu khác').fill('#ffe066')
  await expect(html(page)).toHaveAttribute('data-accent', 'custom')
  await expect.poll(() => cssVar(page, '--accent-fill')).toBe('#ffe066')
  const text = await cssVar(page, '--accent')
  expect(text).not.toBe('#ffe066')
  expect(contrast(parseHex(text), parseHex('#f2f2f5'))).toBeGreaterThanOrEqual(4.5)
  await expect(page.locator('.accent-custom')).toHaveClass(/\bon\b/)
  await expect(group(page, 'Màu nhấn').getByRole('radio', { checked: true })).toHaveCount(0)
})

test('chủ đề nhanh đổi cả bộ một lần bấm; "Về mặc định" trả lại như cũ', async ({ page }) => {
  await openAppearance(page)
  const reset = page.getByRole('button', { name: 'Về mặc định' })
  await expect(radio(page, 'Chủ đề nhanh', 'Mặc định')).toHaveAttribute('aria-checked', 'true')
  await expect(reset).toBeDisabled()
  await radio(page, 'Chủ đề nhanh', 'Giấy và mực').click()
  await expect(radio(page, 'Chủ đề nhanh', 'Giấy và mực')).toHaveAttribute('aria-checked', 'true')
  await expectAttrs(page, {
    'data-theme': 'light', 'data-palette': 'paper', 'data-font': 'serif', 'data-round': 'sharp', 'data-glass': 'solid', 'data-ambient': 'off',
  })
  await reset.click()
  // Chỉ bỏ phần tự chỉnh, vẫn giữ chế độ sáng đang dùng.
  await expectAttrs(page, { 'data-theme': 'light', 'data-palette': 'light' })
  for (const name of ['data-font', 'data-round', 'data-glass', 'data-ambient', 'data-accent']) await expect(html(page)).not.toHaveAttribute(name)
  await expect(reset).toBeDisabled()
  expect(await page.evaluate(() => localStorage.getItem('so-on-tap:tuy-chinh'))).toBeNull()
})

test('"Theo máy" dùng nền khi tối hay nền khi sáng đã chọn, máy đổi là trang đổi theo', async ({ page }) => {
  await openAppearance(page)
  await radio(page, 'Chế độ', 'Theo máy').click()
  await radio(page, 'Nền khi tối', 'Xám dịu').click()
  await radio(page, 'Nền khi sáng', 'Giấy kem').click()
  await expect(html(page)).toHaveAttribute('data-theme', 'system')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(html(page)).toHaveAttribute('data-palette', 'dim')
  await expect(page.getByText('máy để tối nên trang dùng nền Xám dịu')).toBeVisible()
  // Thanh trạng thái (điện thoại, ứng dụng đã cài): mỗi thẻ meta lấy màu nền của bộ nền tương ứng.
  await expect(page.locator('meta[name="theme-color"][media*="dark"]')).toHaveAttribute('content', '#1d2027')
  await expect(page.locator('meta[name="theme-color"][media*="light"]')).toHaveAttribute('content', '#f3ecdf')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html(page)).toHaveAttribute('data-palette', 'paper')
  await expect.poll(() => cssVar(page, '--bg')).toBe('#f3ecdf')
})

test('chọn bằng bàn phím: mũi tên đổi lựa chọn, cả nhóm chỉ một điểm dừng Tab', async ({ page, isMobile }) => {
  test.skip(isMobile, 'điện thoại không có bàn phím')
  await openAppearance(page)
  await radio(page, 'Cỡ chữ', 'Vừa').focus()
  await page.keyboard.press('ArrowRight')
  await expect(radio(page, 'Cỡ chữ', 'Lớn')).toBeFocused()
  await expect(radio(page, 'Cỡ chữ', 'Lớn')).toHaveAttribute('aria-checked', 'true')
  await expect(html(page)).toHaveAttribute('data-size', '112')
  await expect(radio(page, 'Cỡ chữ', 'Vừa')).toHaveAttribute('tabindex', '-1')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(html(page)).toHaveAttribute('data-size', '90')
  await page.keyboard.press('ArrowLeft') // đầu danh sách thì vòng về cuối
  await expect(html(page)).toHaveAttribute('data-size', '125')
  await expect(radio(page, 'Cỡ chữ', 'Rất lớn')).toBeFocused()
})

test('Tìm nhanh: mở phần Giao diện và đổi chủ đề bằng lệnh', async ({ page }) => {
  await openHome(page)
  const box = page.getByRole('combobox', { name: 'Tìm môn, ghi chú hoặc lệnh' })
  await page.getByRole('button', { name: 'Tìm nhanh' }).click()
  // Lúc chưa gõ, danh sách lệnh không kèm các chủ đề cho gọn.
  await expect(page.getByRole('option', { name: 'Tùy chỉnh giao diện' })).toBeVisible()
  await expect(page.getByRole('option', { name: /^Chủ đề:/ })).toHaveCount(0)
  await box.fill('tuy chinh giao dien')
  await page.getByRole('option', { name: 'Tùy chỉnh giao diện' }).click()
  await expect(page).toHaveURL(/#\/cai-dat$/)
  await expect(page.locator('#giao-dien')).toBeFocused()

  await page.getByRole('button', { name: 'Tìm nhanh' }).click()
  await box.fill('chu de dem')
  await page.getByRole('option', { name: /^Chủ đề: Đêm OLED/ }).click()
  await expectAttrs(page, { 'data-theme': 'dark', 'data-palette': 'oled', 'data-primary': 'accent' })
  await expect(radio(page, 'Chủ đề nhanh', 'Đêm OLED')).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Tìm nhanh' }).click()
  await box.fill('chu de')
  await expect(page.getByRole('option', { name: /^Chủ đề: Đêm OLED/ })).toContainText('Đang dùng')
})

test('đổi giao diện ở một tab thì tab khác đang mở đổi theo', async ({ page, context }) => {
  await openAppearance(page)
  const other = await context.newPage()
  await openHome(other)
  await radio(page, 'Chủ đề nhanh', 'Dịu mắt').click()
  await expectAttrs(other, { 'data-palette': 'dim', 'data-accent': 'custom', 'data-round': 'round' })
  await expect.poll(() => cssVar(other, '--accent-fill')).toBe('#2dd4bf')
})

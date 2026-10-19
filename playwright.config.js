import { defineConfig, devices } from '@playwright/test'

// Test chạy trên bản build thật (npm run build trước), qua máy chủ có đủ header bảo mật như trên mạng.
const PORT = 4317

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}/`, trace: 'retain-on-failure' },
  webServer: {
    command: `node scripts/serve-dist.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'may-tinh', use: { ...devices['Desktop Chrome'] } },
    { name: 'dien-thoai', use: { ...devices['Pixel 7'] }, testMatch: /chinh\.spec/ },
  ],
})

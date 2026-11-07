import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for SaveRaks 2.0
 * Tests mobile-first responsive interfaces and desktop layouts.
 */
export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'Mobile Pixel 7',
      use: {
        ...devices['Pixel 7'],
        channel: 'chrome',
      },
    },
    {
      name: 'Mobile iPhone 14',
      use: {
        ...devices['iPhone 14'],
        defaultBrowserType: 'chromium',
        channel: 'chrome',
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 5173 --host 127.0.0.1',
    cwd: '../../apps/web',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});

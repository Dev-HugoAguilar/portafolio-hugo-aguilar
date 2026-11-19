import { defineConfig } from '@playwright/test';

/**
 * Playwright usa el Chrome instalado en el equipo (`channel: 'chrome'`), sin
 * descargar navegadores.
 *
 * Antes de ejecutar:
 *   1. API real:  cd backend && python -m uvicorn app.main:app --port 8010
 *   2. Sitio:     cd dist && python -m http.server 8000
 *   3. Pruebas:   cd dashboards/banca-multiple && npx playwright test
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: './evidencias/artefactos',
  use: {
    baseURL: 'http://localhost:8000',
    channel: 'chrome',
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'escritorio',
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    },
    {
      name: 'movil',
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});

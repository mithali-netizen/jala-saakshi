/**
 * Capture the citizen-app screens used on the landing page.
 *
 *   npm run shoot:app                  # against a dev server on :5173
 *   BASE=http://localhost:5181 npm run shoot:app
 *   CHROME_PATH=/path/to/chrome npm run shoot:app
 *
 * Writes public/images/app/<route>-<kn|en>.png.
 *
 * Every shot uses the same viewport and scale so the three phones line up in the
 * layout, and the Kannada and English versions of a screen are pixel-aligned.
 *
 * These are stills: re-run this after changing the app, or the landing page will show
 * screens that no longer exist.
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(HERE, '..', 'public', 'images', 'app');
const BASE = process.env.BASE ?? 'http://localhost:5173';

/** iPhone 14-ish. deviceScaleFactor 3 so the stills stay sharp on retina screens. */
const VIEWPORT = { width: 390, height: 844 };
const SCALE = 3;

/** Doddagubbi, so the report screen shows a real fix and picks the featured lake. */
const GEO = { latitude: 13.0764, longitude: 77.6738, accuracy: 20 };

const SHOTS = [
  { slug: 'app', route: '#/app', label: 'home' },
  { slug: 'app-report', route: '#/app/report', label: 'report' },
  { slug: 'app-map', route: '#/app/map', label: 'map' },
];

const LANGS = [
  { code: 'kn', suffix: 'kn' },
  { code: 'en', suffix: 'en' },
];

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error('Could not find Chrome. Set CHROME_PATH to your Chrome or Chromium binary.');
  }
  return found;
}

/** Fonts loaded, map tiles decoded, lake polygons drawn — whatever applies to the page. */
async function settle(page, route) {
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15_000 })
    .catch(() => console.warn('   fonts did not report ready; carrying on'));

  if (route.includes('/map')) {
    // Every tile element present and fully decoded.
    await page
      .waitForFunction(
        () => {
          const tiles = [...document.querySelectorAll('img.leaflet-tile')];
          return tiles.length > 0 && tiles.every((t) => t.complete && t.naturalWidth > 0);
        },
        null,
        { timeout: 30_000 },
      )
      .catch(() => console.warn('   map tiles did not all settle; carrying on'));
    // The lake layer only draws once the 1.7 MB GeoJSON has parsed.
    await page
      .waitForFunction(() => !!document.querySelector('canvas.leaflet-zoom-animated'), null, { timeout: 30_000 })
      .catch(() => console.warn('   lake layer did not appear; carrying on'));
  }

  // Let any transition finish before the shutter.
  await page.waitForTimeout(900);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: findChrome() });
  let failures = 0;

  for (const { slug, route, label } of SHOTS) {
    for (const { code, suffix } of LANGS) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: SCALE,
        permissions: ['geolocation'],
        geolocation: GEO,
        locale: code === 'kn' ? 'kn-IN' : 'en-IN',
        reducedMotion: 'reduce',
      });
      // The app reads its language from localStorage on first render.
      await context.addInitScript((lang) => {
        try {
          localStorage.setItem('jala-lang', lang);
        } catch {
          /* private window: the app falls back to its default */
        }
      }, code);

      const page = await context.newPage();
      const problems = [];
      page.on('pageerror', (e) => problems.push(e.message));

      const url = `${BASE}/${route}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
        await settle(page, route);
        const file = path.join(OUT_DIR, `${slug}-${suffix}.png`);
        await page.screenshot({ path: file });
        const ok = problems.length === 0;
        if (!ok) failures += 1;
        console.log(
          `${ok ? '✓' : '!'} ${label.padEnd(7)} ${suffix}  ${path.relative(path.join(HERE, '..'), file)}` +
            (ok ? '' : `  — page error: ${problems[0]}`),
        );
      } catch (err) {
        failures += 1;
        console.error(`✗ ${label} ${suffix} — ${err instanceof Error ? err.message : err}`);
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  console.log(
    `\n${SHOTS.length * LANGS.length} shots at ${VIEWPORT.width}x${VIEWPORT.height} @${SCALE}x -> ${path.relative(process.cwd(), OUT_DIR)}`,
  );
  if (failures) {
    console.error(`${failures} shot(s) had problems. Check the output above before using them.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

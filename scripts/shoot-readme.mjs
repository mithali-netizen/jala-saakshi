/**
 * Capture the standard-size screenshots used in README.md.
 *
 *   npm run dev                      # in another terminal
 *   npm run shoot:readme             # BASE=http://localhost:5173 by default
 *   CHROME_PATH=/path/to/chrome npm run shoot:readme
 *
 * Writes docs/screenshots/*.png.
 *   Web   : 1440x900 @1x   (README shows them ~800px wide)
 *   Phone :  390x844 @2x
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'docs', 'screenshots');
const BASE = process.env.BASE ?? 'http://localhost:5173';
const GEO = { latitude: 13.0764, longitude: 77.6738, accuracy: 20 }; // Doddagubbi

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const c = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => existsSync(p));
  if (!c) throw new Error('Set CHROME_PATH to a Chrome/Edge binary.');
  return c;
}

const WEB = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Desktop shots. `fullPage` for the long landing page sections is avoided on purpose: fixed size. */
const WEB_SHOTS = [
  { file: 'web-landing.png', route: '#/' },
  { file: 'web-landing-evidence.png', route: '#/', scrollTo: '#evidence' },
  { file: 'web-near-me.png', route: '#/near-me' },
  { file: 'web-dashboard.png', route: '#/dashboard', wait: 'map' },
  { file: 'web-authority-portal.png', route: '#/authority' },
  { file: 'web-tracker.png', route: '#/story/tracker' },
  { file: 'web-doddagubbi.png', route: '#/story/lake' },
];

const KN_NOTE = 'ಕೆರೆಯ ನೀರಿನ ಮೇಲೆ ಬಿಳಿ ನೊರೆ ತೇಲುತ್ತಿದೆ ಮತ್ತು ಸತ್ತ ಮೀನುಗಳು ಕಾಣುತ್ತಿವೆ.';
const EN_NOTE = 'White froth is floating on the lake and there are dead fish near the bank.';

const PHONE_SHOTS = [
  { slug: 'app-home', route: '#/app' },
  { slug: 'app-report', route: '#/app/report' },
  { slug: 'app-report-voice', route: '#/app/report', fill: true },
  { slug: 'app-map', route: '#/app/map', wait: 'map' },
];

async function settle(page, wait) {
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15000 }).catch(() => {});
  if (wait === 'map') {
    await page
      .waitForFunction(() => {
        const t = [...document.querySelectorAll('img.leaflet-tile')];
        return t.length > 0 && t.every((x) => x.complete && x.naturalWidth > 0);
      }, null, { timeout: 30000 })
      .catch(() => {});
  }
  await page.waitForTimeout(1200);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: findChrome() });

  for (const s of WEB_SHOTS) {
    const ctx = await browser.newContext({
      viewport: WEB,
      deviceScaleFactor: 1,
      permissions: ['geolocation'],
      geolocation: GEO,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/${s.route}`, { waitUntil: 'networkidle', timeout: 60000 });
      await settle(page, s.wait);
      if (s.scrollTo) {
        await page.locator(s.scrollTo).scrollIntoViewIfNeeded();
        await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), s.scrollTo);
        await page.waitForTimeout(1500);
      }
      await page.screenshot({ path: path.join(OUT, s.file) });
      console.log('✓', s.file);
    } catch (e) {
      console.error('✗', s.file, e.message);
    } finally {
      await ctx.close();
    }
  }

  for (const lang of ['kn', 'en']) {
    for (const s of PHONE_SHOTS) {
      const ctx = await browser.newContext({
        viewport: PHONE,
        deviceScaleFactor: 2,
        permissions: ['geolocation'],
        geolocation: GEO,
        locale: lang === 'kn' ? 'kn-IN' : 'en-IN',
        reducedMotion: 'reduce',
      });
      await ctx.addInitScript((l) => {
        try { localStorage.setItem('jala-lang', l); } catch { /* ignore */ }
      }, lang);
      const page = await ctx.newPage();
      const file = `${s.slug}-${lang}.png`;
      try {
        await page.goto(`${BASE}/${s.route}`, { waitUntil: 'networkidle', timeout: 60000 });
        await settle(page, s.wait);
        if (s.fill) {
          // The mic only appends a transcript to this field; simulate that result.
          const issues = page.locator('.issue-grid button');
          if ((await issues.count()) > 1) { await issues.nth(0).click(); await issues.nth(1).click(); }
          await page.locator('#description').fill(lang === 'kn' ? KN_NOTE : EN_NOTE);
          await page.locator('#description').scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
        }
        await page.screenshot({ path: path.join(OUT, file) });
        console.log('✓', file);
      } catch (e) {
        console.error('✗', file, e.message);
      } finally {
        await ctx.close();
      }
    }
  }

  // Architecture diagram: crop the browser chrome out of public/images/architecture.jpg.
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/images/architecture.jpg`, { waitUntil: 'load' });
  const dims = await page.evaluate(() => {
    const i = document.querySelector('img');
    return { w: i.naturalWidth, h: i.naturalHeight };
  });
  // Top ~131px of the 1600x1040 capture is macOS menu + Chrome toolbar; bottom corner radius ignored.
  const top = Math.round((131 / 1040) * dims.h);
  await page.setViewportSize({ width: dims.w, height: dims.h });
  await page.goto(`${BASE}/images/architecture.jpg`, { waitUntil: 'load' });
  await page.screenshot({
    path: path.join(OUT, 'architecture.png'),
    clip: { x: 0, y: top, width: dims.w, height: dims.h - top - 2 },
  });
  console.log('✓ architecture.png');
  await ctx.close();

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

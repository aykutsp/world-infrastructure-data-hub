// One-off helper for docs/screenshots/. Loads the live site, clicks through a
// handful of states, and saves a PNG for each one. Not wired into the build
// pipeline — run with `node scripts/takeScreenshots.mjs` when you want to
// refresh the README imagery.
//
// Requires `npx playwright install chromium` once.

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const URL = 'https://aykutsp.github.io/world-infrastructure-data-hub/';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  console.log('Loading live site...');
  await page.goto(URL, { waitUntil: 'networkidle' });
  // Leaflet needs a tick for tiles to settle.
  await page.waitForTimeout(2500);

  // 1) Explore — default Gasoline view
  console.log('  [1/5] explore-gasoline');
  await page.screenshot({ path: path.join(OUT, 'explore-gasoline.png'), fullPage: false });

  // 2) Explore — Grid CO₂ metric (new in v1.1)
  console.log('  [2/5] explore-grid-co2');
  await page.getByRole('button', { name: /grid co/i }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'explore-grid-co2.png'), fullPage: false });

  // 3) Compare view — pick a few countries
  console.log('  [3/5] compare');
  await page.getByRole('button', { name: 'Compare' }).click();
  await page.waitForTimeout(400);

  for (const q of ['Germany', 'Turkey', 'United States', 'Norway']) {
    await page.getByPlaceholder(/add country/i).fill(q);
    await page.waitForTimeout(400);
    const option = page.locator('.compare-result').first();
    if (await option.count()) {
      await option.click();
      await page.waitForTimeout(250);
    }
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'compare.png'), fullPage: false });

  // 4) Trip view — Istanbul → Berlin preset
  console.log('  [4/5] trip-istanbul-berlin');
  await page.getByRole('button', { name: 'Trip' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /istanbul.*berlin/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^Calculate$/i }).click();
  // Routing + country-resolution take a few seconds.
  await page.waitForTimeout(7000);
  await page.screenshot({ path: path.join(OUT, 'trip-istanbul-berlin.png'), fullPage: false });

  // 5) API Library modal
  console.log('  [5/5] api-library');
  await page.getByRole('button', { name: /api library/i }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'api-library.png'), fullPage: false });

  await browser.close();
  console.log(`\n✓ wrote 5 screenshots to ${OUT}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

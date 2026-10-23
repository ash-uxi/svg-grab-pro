import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

/**
 * One small check per browser that the built extension really works: right-click an SVG on a
 * local page, download it, copy it. Kept deliberately tiny; if it ever gets flaky, cut it down
 * rather than adding retries. Build first with `node scripts/build-e2e.mjs` (`npm run e2e`).
 */
const here = dirname(fileURLToPath(import.meta.url));
const extensionDir = join(here, '..', 'dist', 'e2e');
const browsers = (process.env.E2E_BROWSERS || 'chrome,firefox').split(',');
const headless = process.env.E2E_HEADFUL ? false : true;

/** @type {import('node:http').Server} */
let server;
let fixtureUrl = '';

before(async () => {
  const html = readFileSync(join(here, 'fixture.html'));
  server = createServer((_, response) => response.end(html));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)));
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  fixtureUrl = `http://127.0.0.1:${address.port}/`;
});
after(() => server.close());

/** @param {string} browserName @param {string} downloadPath */
async function launch(browserName, downloadPath) {
  if (browserName === 'chrome') {
    return puppeteer.launch({
      browser: 'chrome',
      headless,
      pipe: true,
      enableExtensions: [extensionDir],
      downloadBehavior: { policy: 'allow', downloadPath },
    });
  }
  const browser = await puppeteer.launch({
    browser: 'firefox',
    headless,
    extraPrefsFirefox: {
      'extensions.originControls.grantByDefault': true,
      'browser.download.folderList': 2,
      'browser.download.dir': downloadPath,
      'browser.download.useDownloadDir': true,
      'browser.download.always_ask_before_handling_new_types': false,
      'browser.helperApps.neverAsk.saveToDisk': 'image/svg+xml',
    },
  });
  await browser.installExtension(extensionDir);
  return browser;
}

/**
 * @template T
 * @param {() => Promise<T>} check
 * @param {string} what
 */
async function eventually(check, what, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // Not ready yet.
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/** @param {import('puppeteer').Page} page */
async function rightClickLogo(page) {
  const box = await (await page.$('#logo'))?.boundingBox();
  assert.ok(box, 'fixture logo is on the page');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
}

/** @param {import('puppeteer').Page} page @param {string} action */
async function pick(page, action) {
  // `data-open` skips a previous menu that is still fading out.
  const item = await page.waitForSelector(
    `svg-grab-pro >>> .menu[data-open] [data-action="${action}"]`,
    {
      visible: true,
      timeout: 3_000,
    }
  );
  await item?.click();
}

/** @param {import('puppeteer').Page} page */
async function toastAfterPending(page) {
  return eventually(
    () =>
      page.evaluate(() => {
        const toast = document.querySelector('svg-grab-pro')?.shadowRoot?.querySelector('.toast');
        const tone = /** @type {HTMLElement | null | undefined} */ (toast)?.dataset.tone;
        return tone && tone !== 'pending' ? { tone, text: toast?.textContent?.trim() } : null;
      }),
    'a toast'
  );
}

for (const browserName of browsers) {
  describe(browserName, { concurrency: false }, () => {
    /** @type {import('puppeteer').Browser} */
    let browser;
    /** @type {import('puppeteer').Page} */
    let page;
    const downloadPath = mkdtempSync(join(tmpdir(), `svg-grab-pro-${browserName}-`));

    before(async () => {
      browser = await launch(browserName, downloadPath);
      page = await browser.newPage();
      await page.setViewport({ width: 800, height: 600 });
      // The background registers the content script on install; reload until it's on the page.
      await eventually(async () => {
        await page.goto(fixtureUrl);
        await rightClickLogo(page);
        return page.$('svg-grab-pro >>> [data-action="download-svg"]');
      }, 'the content script menu');
      await page.keyboard.press('Escape');
    });

    after(async () => {
      await browser?.close();
      rmSync(downloadPath, { recursive: true, force: true });
    });

    test('Download SVG saves a standalone .svg file', async () => {
      await rightClickLogo(page);
      await pick(page, 'download-svg');
      const file = await eventually(
        () => readdirSync(downloadPath).find((name) => name.endsWith('.svg')),
        'the downloaded .svg'
      );
      const svg = await eventually(() => {
        const text = readFileSync(join(downloadPath, file), 'utf8');
        return text.includes('</svg>') && text;
      }, 'the download to finish');
      assert.match(svg, /^<svg[\s>]/);
      assert.match(svg, /viewBox="0 0 24 24"/);
    });

    test('Copy SVG succeeds', async () => {
      await rightClickLogo(page);
      await pick(page, 'copy-svg');
      const toast = await toastAfterPending(page);
      assert.equal(toast.tone, 'success', `toast said: ${toast.text}`);
    });
  });
}

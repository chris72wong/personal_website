const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const temporaryBrowsers = path.join(os.tmpdir(), 'personal-website-browsers');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(temporaryBrowsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = temporaryBrowsers;
const { chromium, webkit } = require('playwright');
const screenshotDirectory = process.env.TRANSIT_SCREENSHOT_DIR || path.join(os.tmpdir(), 'personal-website-review');
fs.mkdirSync(screenshotDirectory, { recursive: true });
const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';
const waitUntil = async (page, condition) => page.waitForFunction(condition);

async function checkBrowser(engine) {
  const browser = engine === 'webkit' ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(siteUrl);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#background').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.building-action').count(), 3);
    assert.equal(await page.locator('.section-scroll-cue').first().innerText(), 'Projects');
    assert.equal(await page.locator('.section-scroll-cue').last().getAttribute('href'), '#education');
    assert.equal(await page.locator('#certifications').count(), 0);
    assert.equal(await page.locator('.transit-journey button, .transit-journey a, .transit-status, .journey-heading, .transit-caption, .transit-scene-bar').count(), 0);
    assert.deepEqual(await page.locator('.journey-entry').evaluateAll(entries => entries.map(entry => entry.id)), ['wind-stop', 'business-stop', 'rbc-stop', 'computer-science-stop']);
    assert.deepEqual(await page.locator('.transit-stop').evaluateAll(stops => stops.map(stop => stop.dataset.entry)), ['wind-stop', 'business-stop', 'rbc-stop', 'computer-science-stop']);
    const car = page.locator('[data-train-car="0"]');
    await page.waitForFunction(() => Number(document.querySelector('[data-train-car="0"]').getAttribute('transform').match(/translate\(([-\d.]+)/)[1]) > -10);
    // Drive animation frames deterministically to check a complete loop quickly.
    await page.evaluate(() => {
      const nativeRequest = window.requestAnimationFrame.bind(window);
      const nativeCancel = window.cancelAnimationFrame.bind(window);
      const frames = new Map();
      let nextId = 1000000;
      let time = performance.now();
      window.requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
      window.cancelAnimationFrame = id => { frames.delete(id); nativeCancel(id); };
      window.advanceFrames = duration => {
        for (let elapsed = 0; elapsed < duration; elapsed += 100) {
          time += 100;
          const pending = Array.from(frames.values());
          frames.clear();
          pending.forEach(callback => callback(time));
        }
      };
      window.restoreFrames = () => {
        window.requestAnimationFrame = nativeRequest;
        window.cancelAnimationFrame = nativeCancel;
        const pending = Array.from(frames.values());
        frames.clear();
        pending.forEach(callback => callback(performance.now()));
      };
      // Reschedule through the controlled clock instead of waiting for a native
      // frame to arrive; headless WebKit may throttle that original frame.
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(100);

    const snapshots = await page.evaluate(() => {
      const history = [];
      for (let tick = 0; tick < 245; tick++) {
        window.advanceFrames(100);
        history.push({
          x: Number(document.querySelector('[data-train-car="0"]').getAttribute('transform').match(/translate\(([-\d.]+)/)[1]),
          stop: document.querySelector('.transit-stop.is-current')?.dataset.transitStop ?? null,
          sign: document.querySelector('[data-track-stop].is-current')?.dataset.trackStop ?? null,
          entry: document.querySelector('.journey-entry.is-current')?.id ?? null,
        });
      }
      return history;
    });
    const sequence = [];
    for (const snapshot of snapshots) {
      if (snapshot.stop === null) continue;
      assert.equal(snapshot.sign, snapshot.stop);
      assert.equal(snapshot.entry, ['wind-stop', 'business-stop', 'rbc-stop', 'computer-science-stop'][Number(snapshot.stop)]);
      if (sequence.at(-1) !== snapshot.stop) sequence.push(snapshot.stop);
    }
    assert.deepEqual(sequence.slice(0, 5), ['0', '1', '2', '3', '0'], `${engine}: ${JSON.stringify([snapshots[0], snapshots.at(-1)])}`);
    for (let index = 1; index < snapshots.length; index++) {
      assert.equal(snapshots[index].x >= snapshots[index - 1].x || (snapshots[index].x < 0 && snapshots[index - 1].x > 1100), true, 'Only a full exit resets the forward-moving train');
    }
    await page.evaluate(() => window.restoreFrames());
    await page.locator('#home').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(200);
    const offscreen = await car.getAttribute('transform');
    await page.waitForTimeout(250);
    assert.equal(await car.getAttribute('transform'), offscreen, 'Train pauses offscreen');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(100);
    await page.locator('#background').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(100);
    const reduced = await car.getAttribute('transform');
    await page.waitForTimeout(250);
    assert.equal(await car.getAttribute('transform'), reduced);
    for (const width of [1920, 1440, 768, 640, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `No page overflow at ${width}px`);
      const bounds = await page.locator('.transit-journey').boundingBox();
      assert.equal(bounds.x, 0, 'Train scenery reaches the left edge');
      const pageWidth = await page.evaluate(() => document.body.clientWidth);
      assert.ok(Math.abs(bounds.width - pageWidth) < 1, `Train scenery reaches the right edge: ${bounds.width}/${pageWidth}`);
      await page.locator('#background').screenshot({ path: path.join(screenshotDirectory, `${engine}-journey-${width}.png`), style: '.nav { visibility: hidden; }' });
      if (width === 1440 || width === 768) {
        await page.locator('#projects').screenshot({ path: path.join(screenshotDirectory, `${engine}-projects-${width}.png`), style: '.nav { visibility: hidden; }' });
      }
    }
    await page.locator('.project-building').first().locator('.building-action').click();
    assert.equal(await page.locator('#project-dialog').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#project-dialog').isVisible(), false);
    await page.locator('.section-scroll-cue').last().click();
    assert.equal(await page.evaluate(() => window.location.hash), '#education');
    await page.locator('.back-to-top').click();
    assert.equal(await page.evaluate(() => window.location.hash), '#home');
    await page.locator('#home').screenshot({ path: path.join(screenshotDirectory, `${engine}-home.png`), style: '.nav { visibility: hidden; }' });
    assert.deepEqual(errors, []);
    const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await staticPage.goto(siteUrl);
    assert.equal(await staticPage.locator('.journey-entry').count(), 4);
    assert.equal(await staticPage.locator('.transit-journey a, .transit-journey button').count(), 0);
    assert.equal(await staticPage.locator('.project-panel:visible').count(), 3);
    assert.equal(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await staticPage.locator('[href="#project-gym-partner"]').click();
    await waitUntil(staticPage, () => location.hash === '#project-gym-partner');
    assert.ok((await staticPage.locator('#project-gym-partner').boundingBox()).y >= 0, 'Static project anchor remains visible');

    // Every context is a fresh private session. Add explicit storage, font, history,
    // and older-media-API restrictions instead of merely resizing a desktop page.
    for (const restricted of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      if (restricted) {
        await context.route('https://fonts.googleapis.com/**', route => route.abort());
        await context.route('https://fonts.gstatic.com/**', route => route.abort());
        await context.addInitScript(() => {
          for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(window, name, { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
          for (const name of ['pushState', 'replaceState']) History.prototype[name] = () => { throw new DOMException('History restricted', 'SecurityError'); };
          const nativeMatchMedia = window.matchMedia.bind(window);
          window.matchMedia = query => {
            const media = nativeMatchMedia(query);
            const listen = media.addEventListener.bind(media);
            media.addListener = listener => listen('change', listener);
            media.addEventListener = undefined;
            return media;
          };
        });
      }
      const phone = await context.newPage();
      phone.on('pageerror', error => errors.push(error.message));
      await phone.goto(siteUrl);
      await phone.locator('.navlink[href="#projects"]').tap();
      await waitUntil(phone, () => location.hash === '#projects');
      await phone.waitForTimeout(150);
      const cityBounds = await phone.locator('.project-city').boundingBox();
      assert.equal(cityBounds.x, 0);
      assert.equal(cityBounds.width, 390);
      assert.equal(await phone.locator('.project-city').evaluate(el => el.scrollWidth === el.clientWidth), true, 'Projects require no horizontal swipe');
      await phone.locator('#projects').screenshot({ path: path.join(screenshotDirectory, `${engine}-projects-${restricted ? 'restricted' : 'phone'}.png`), style: '.nav { visibility: hidden; }' });
      for (let index = 0; index < 3; index++) {
        await phone.locator('.building-action').nth(index).tap();
        assert.equal(await phone.locator('#project-dialog').isVisible(), true);
        assert.equal(await phone.locator('.project-panel:visible').count(), 1);
        const navigation = await phone.locator('.navlink.active').getAttribute('href');
        assert.equal(navigation, '#projects', 'Opening a popup keeps Projects active');
        const scrollArea = await phone.locator('.project-dialog-content').evaluate(el => {
          el.scrollTop = el.scrollHeight;
          return { height: el.clientHeight, scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
        });
        assert.ok(scrollArea.height > 0);
        if (scrollArea.scrollHeight > scrollArea.height) assert.ok(scrollArea.scrollTop > 0, 'Long phone popups can scroll');
        await phone.locator('#project-dialog').screenshot({ path: path.join(screenshotDirectory, `${engine}-popup-${index}.png`) });
        await phone.locator('.project-dialog-close').tap();
        await waitUntil(phone, () => !document.querySelector('#project-dialog').open && !document.body.classList.contains('project-open'));
        if (!restricted) await waitUntil(phone, () => location.hash === '#projects');
        await phone.waitForTimeout(100);
        assert.ok((await phone.locator('.building-action').nth(index).boundingBox()).y >= 0, 'Closing restores the selected building');
      }
      if (!restricted) {
        await phone.locator('.building-action').first().tap();
        await phone.goBack();
        await waitUntil(phone, () => !document.querySelector('#project-dialog').open);
        await phone.goForward();
        await waitUntil(phone, () => document.querySelector('#project-dialog').open);
        await phone.locator('.project-dialog-close').tap();
        await waitUntil(phone, () => !document.querySelector('#project-dialog').open);
      }
      await phone.locator('.section-scroll-cue').last().tap();
      await waitUntil(phone, () => location.hash === '#education');
      await phone.waitForTimeout(100);
      const heading = await phone.locator('#education').boundingBox();
      const nav = await phone.locator('.nav').boundingBox();
      assert.ok(heading.y >= nav.height, 'Education heading clears the sticky navigation');
      assert.equal(await phone.locator('.navlink.active').getAttribute('href'), '#background');
      await phone.setViewportSize({ width: 844, height: 390 });
      assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No overflow after rotation');
      await phone.locator('.back-to-top').tap();
      await waitUntil(phone, () => location.hash === '#home');
      await context.close();
    }
    const direct = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
    direct.on('pageerror', error => errors.push(error.message));
    await direct.goto(`${siteUrl}/#project-gym-partner`);
    await waitUntil(direct, () => document.querySelector('#project-dialog').open);
    await direct.locator('.project-dialog-close').tap();
    await waitUntil(direct, () => !document.querySelector('#project-dialog').open && location.hash === '#projects');
    assert.equal(await direct.evaluate(() => document.body.classList.contains('project-open')), false);
    assert.deepEqual(errors, []);
    console.log(`${engine} browser checks passed: full-width scenery at six widths, train loop and reduced motion, touch popups and scrolling, navigation and rotation, Back/Forward and shared links, no JavaScript, and fresh private contexts with blocked storage/fonts/history and legacy media listeners. Screenshots: ${screenshotDirectory}`);
  } finally {
    await browser.close();
  }
}

(async () => {
  const engines = process.env.SITE_BROWSER ? [process.env.SITE_BROWSER] : ['edge'];
  if (!process.env.SITE_BROWSER && fs.existsSync(webkit.executablePath())) engines.push('webkit');
  for (const engine of engines) await checkBrowser(engine);
})().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173');
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
      let nextId = 0;
      let time = performance.now();
      window.requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
      window.cancelAnimationFrame = id => frames.delete(id);
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
    assert.deepEqual(sequence.slice(0, 5), ['0', '1', '2', '3', '0']);
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
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `No page overflow at ${width}px`);
      if (process.env.TRANSIT_SCREENSHOT_DIR) {
        await page.locator('#background').screenshot({ path: path.join(process.env.TRANSIT_SCREENSHOT_DIR, `transit-simplified-${width}.png`), style: '.nav { visibility: hidden; }' });
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
    if (process.env.TRANSIT_SCREENSHOT_DIR) {
      await page.locator('#home').screenshot({ path: path.join(process.env.TRANSIT_SCREENSHOT_DIR, 'home-projects-cue.png'), style: '.nav { visibility: hidden; }' });
    }
    assert.deepEqual(errors, []);
    const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await staticPage.goto(process.env.SITE_URL || 'http://127.0.0.1:4173');
    assert.equal(await staticPage.locator('.journey-entry').count(), 4);
    assert.equal(await staticPage.locator('.transit-journey a, .transit-journey button').count(), 0);
    console.log('Browser checks passed: forward loop, all four station lights, requested order and removals, offscreen and reduced motion, 1440/390/320px, project dialog, navigation, and no-JS content.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

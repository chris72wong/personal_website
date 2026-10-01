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
  const errors = [];
  const watch = page => page.on('pageerror', error => errors.push(error.message));
  const layout = page => page.evaluate(() => {
    const bounds = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [r.x, r.width, r.height]; };
    return ['.hero-stage', '.harbor-stage', '.transit-scene'].map(bounds);
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    watch(page);
    await page.goto(siteUrl);
    await page.evaluate(() => document.fonts.ready);
    const reducedTrainPosition = await page.locator('[data-train-car="0"]').getAttribute('transform');
    assert.deepEqual(await page.locator('.building-label').allTextContents(), ['Gym Partner', 'Dream Planner', 'Travel Dashboard']);
    assert.deepEqual(await page.locator('.section-scroll-cue').evaluateAll(links => links.map(link => link.getAttribute('href'))), ['#projects', '#background', '#home']);
    assert.equal(await page.locator('.back-to-top').count(), 0);
    assert.equal(await page.locator('.scene-water, .scene-cloud, .scene-lights, .harbor-boats, filter').count(), 0, 'No filtered scenery or redundant animated overlays');
    assert.equal(await page.locator('.harbor-backdrop > image').count(), 1, 'One image paints the project background');
    assert.ok(await page.locator('.harbor-backdrop > image').evaluate(async el => {
      const image = new Image(); image.src = el.getAttribute('href'); await image.decode(); return image.naturalWidth > 0;
    }), 'The new backdrop loads');
    assert.ok(await page.locator('.resort-plane image').evaluate(async el => {
      const image = new Image(); image.src = el.getAttribute('href'); await image.decode(); return image.naturalWidth > 0;
    }), 'The transparent plane sprite loads');
    assert.equal(await page.getByRole('button', { name: /Learn more about/ }).count(), 3, 'Each project has a real Learn more button');
    assert.ok(await page.locator('.project-trigger').evaluateAll(buttons => buttons.every(button => {
      const stage = button.closest('.harbor-stage').getBoundingClientRect();
      const bounds = button.getBoundingClientRect();
      return bounds.height >= 44 && bounds.top > stage.top + stage.height * .73 && bounds.bottom < stage.bottom;
    })), 'Buttons sit beneath the buildings, inside the landscape, with at least 44px height');
    for (const [building, title] of [['gym', 'gym-partner'], ['dream', 'dream-planner'], ['travel', 'travel-dashboard']]) {
      const button = page.locator(`.building-${building} .project-trigger`);
      await button.click();
      assert.equal(await page.locator('.project-dialog').getAttribute('aria-labelledby'), `${title}-title`);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.project-dialog').open);
      assert.equal(await button.evaluate(el => el === document.activeElement), true, 'Closing restores focus to the button');
    }
    const keyboardButton = page.locator('.building-dream .project-trigger');
    await keyboardButton.focus(); await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('.project-dialog').open);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.project-dialog').open);
    await page.locator('#home').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    assert.ok(await page.evaluate(() => {
      const scene = document.querySelector('#background').getBoundingClientRect();
      const copyright = document.querySelector('.footer').getBoundingClientRect();
      return copyright.top >= scene.top && copyright.bottom <= scene.bottom &&
        Math.abs(scene.bottom - document.querySelector('main').getBoundingClientRect().bottom) < 1;
    }), 'Copyright sits inside the final scene and no footer strip follows it');
    for (const width of [320, 390, 640, 900]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const phone = await context.newPage(); watch(phone); await phone.goto(siteUrl); await phone.evaluate(() => document.fonts.ready);
      assert.equal(await phone.locator('.navlink[aria-current="location"]').getAttribute('href'), '#home', 'Overview starts on Home even when all scenes fit');
      const mobile = await layout(phone);
      mobile.forEach((rect, i) => {
        assert.equal(rect[1], 1280, `Touch overview retains its panoramic canvas at ${width}px`);
        assert.ok(Math.abs(rect[1] / rect[2] - [1754 / 896, 1672 / 941, 1672 / 941][i]) < .002, `Touch artwork keeps its original proportions at ${width}px`);
      });
      assert.ok(await phone.evaluate(() => window.visualViewport.scale < 1), 'Phone initially fits the desktop overview');
      const meta = await phone.locator('meta[name="viewport"]').getAttribute('content');
      assert.ok(!/maximum-scale|user-scalable/.test(meta), 'Pinch zoom remains available');
      await phone.locator('.building-gym .project-trigger').tap(); await phone.waitForFunction(() => document.querySelector('.project-dialog').open);
      assert.equal(await phone.locator('.project-dialog').getAttribute('aria-labelledby'), 'gym-partner-title');
      await phone.locator('.project-dialog-close').tap(); await phone.waitForFunction(() => !document.querySelector('.project-dialog').open);
      if (width === 390) {
        await phone.emulateMedia({ reducedMotion: 'no-preference' });
        await phone.waitForFunction(() => document.documentElement.classList.contains('is-typing'));
        await phone.waitForFunction(() => !document.documentElement.classList.contains('is-typing'));
        assert.deepEqual(await phone.locator('.name-text').allTextContents(), ['Christopher', 'Wong'], 'Phone typing completes both lines');
        assert.equal(await phone.locator('.name-cursor').evaluate(el => el.getAnimations()[0]?.playState), 'running', 'Phone cursor blinks');
        await phone.emulateMedia({ reducedMotion: 'reduce' });
        await phone.waitForFunction(() => document.querySelector('.name-cursor').getAnimations().length === 0);
        assert.equal(await phone.locator('.name-cursor').evaluate(el => el.getAnimations().length), 0, 'Reduced motion disables cursor blinking');
      }
      if (width === 390) await phone.screenshot({ path: path.join(screenshotDirectory, `${engine}-mobile-overview.png`), fullPage: true });
      await context.close();
    }
    // Return explicitly after the phone contexts and asynchronous fragment history settle.
    await page.locator('.navlink[href="#home"]').click();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.querySelector('.hero').classList.contains('scene-active'));
    await page.waitForFunction(() => document.documentElement.classList.contains('is-typing'));
    await page.waitForFunction(() => !document.documentElement.classList.contains('is-typing'));
    assert.deepEqual(await page.locator('.name-text').allTextContents(), ['Christopher', 'Wong'], 'Desktop typing completes both lines');
    const clock = () => page.locator('.hero-vessel').evaluate(el => el.getAnimations()[0]?.currentTime);
    const before = await clock(); await page.waitForTimeout(250); assert.ok(await clock() > before, 'Welcome boat still moves');
    assert.deepEqual(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect.target instanceof Element).map(a => a.effect.target.classList.value).sort()), ['hero-vessel', 'hero-vessel-hull', 'name-cursor'], 'Only the visible boat and name cursor animate automatically');
    await page.locator('#background').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await page.waitForFunction(() => !document.querySelector('.hero').classList.contains('scene-active'));
    await page.waitForTimeout(100); const paused = await clock(); await page.waitForTimeout(150); assert.equal(await clock(), paused, 'Boat pauses offscreen');
    await page.locator('#projects').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.harbor-stage').classList.contains('scene-active'));
    const planeClock = () => page.locator('.resort-plane').evaluate(el => el.getAnimations()[0]?.currentTime);
    const flightStart = await planeClock(); await page.waitForTimeout(150); assert.ok(await planeClock() > flightStart, 'The plane moves when Projects is visible');
    const flight = await page.locator('.resort-plane').evaluate(el => {
      const animation = el.getAnimations()[0];
      const originalTime = animation.currentTime;
      const samples = [0, 9000, 14500, 19500, 19750, 23000].map(time => {
        animation.currentTime = time;
        const style = getComputedStyle(el); const matrix = new DOMMatrix(style.transform);
        return { x: matrix.e, y: matrix.f, opacity: Number(style.opacity) };
      });
      animation.currentTime = originalTime;
      return samples;
    });
    assert.ok(flight[0].x > flight[1].x && flight[1].x > flight[2].x, 'The plane flies from right to left');
    assert.ok(flight[0].y > flight[1].y && flight[1].y > flight[2].y, 'The plane climbs gently');
    assert.equal(flight[3].opacity, 0, 'The plane is hidden after exiting');
    assert.equal(flight[4].opacity, 0, 'The loop includes a quiet gap');
    assert.equal(flight[5].opacity, 1, 'The plane returns within 23 seconds');
    await page.locator('.building-travel .project-trigger').click();
    await page.waitForFunction(() => !document.querySelector('.harbor-stage').classList.contains('scene-active'));
    await page.locator('.resort-plane').evaluate(el => el.getAnimations()[0].ready);
    const modalPause = await planeClock(); await page.waitForTimeout(150); assert.equal(await planeClock(), modalPause, 'The plane pauses during project dialogs');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('.project-dialog').open);
    await page.waitForFunction(() => document.querySelector('.harbor-stage').classList.contains('scene-active'));
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.locator('.resort-plane').evaluate(el => el.getAnimations()[0].ready);
    const hiddenPause = await planeClock(); await page.waitForTimeout(150); assert.equal(await planeClock(), hiddenPause, 'The plane pauses in hidden tabs');
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('.resort-plane').getAnimations().length === 0);
    assert.equal(await page.locator('.resort-plane').evaluate(el => el.getAnimations().length), 0, 'Reduced motion disables the flyby');
    assert.equal(await page.locator('.resort-plane').evaluate(el => Number(getComputedStyle(el).opacity)), 0, 'Reduced motion keeps the plane hidden');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.querySelector('.harbor-stage').classList.contains('scene-active'));
    await page.waitForFunction(() => document.querySelector('.resort-plane').getAnimations().length === 1);
    await page.locator('.resort-plane').evaluate(el => { el.getAnimations()[0].currentTime = 1000; });
    await page.locator('.harbor-stage').screenshot({ path: path.join(screenshotDirectory, `${engine}-projects.png`) });
    // A shorter viewport lets the final scene fully cover Projects instead of
    // leaving its lower edge visible at the document's maximum scroll position.
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.locator('#background').evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' }));
    await page.waitForFunction(() => !document.querySelector('.harbor-stage').classList.contains('scene-active'));
    await page.locator('.resort-plane').evaluate(el => el.getAnimations()[0].ready);
    const flightPause = await planeClock(); await page.waitForTimeout(150); assert.equal(await planeClock(), flightPause, 'The plane pauses offscreen');
    await page.setViewportSize({ width: 1280, height: 900 });
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
        frames.clear();
        document.dispatchEvent(new Event('visibilitychange'));
      };
      // Reschedule through the controlled clock instead of waiting for a native
      // frame to arrive; headless WebKit may throttle that original frame.
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(100);

    const snapshots = await page.evaluate(() => {
      const history = [];
      for (let tick = 0; tick < 500; tick++) {
        window.advanceFrames(100);
        history.push({
          x: Number(document.querySelector('[data-train-car="0"]').getAttribute('transform').match(/translate\(([-\d.]+)/)[1]),
          stop: document.querySelector('.transit-stop.is-current')?.dataset.transitStop ?? null,
          wheelError: (() => {
            const svg = document.querySelector('.transit-landscape');
            const path = document.querySelector('#transit-track');
            const ledge = document.querySelector('.bridge-ledge path');
            const inverse = svg.getCTM().inverse();
            let error = 0;
            for (const art of document.querySelectorAll('.train-car-art')) {
              const matrix = inverse.multiply(art.getCTM());
              for (const contact of [art.dataset.bogieRear, art.dataset.bogieFront]) {
                const [x, y] = contact.split(',').map(Number);
                const wheel = new DOMPoint(x, y).matrixTransform(matrix);
                if (wheel.x < 0 || wheel.x > 1672) continue;
                const wheelTop = new DOMPoint(x, 130).matrixTransform(matrix);
                if (!ledge.isPointInFill(wheelTop) || !ledge.isPointInFill(wheel)) throw new Error('A wheel is exposed above the foreground bridge ledge');
                let low = 0, high = path.getTotalLength();
                for (let step = 0; step < 18; step++) {
                  const midpoint = (low + high) / 2;
                  if (path.getPointAtLength(midpoint).x < wheel.x) low = midpoint;
                  else high = midpoint;
                }
                error = Math.max(error, Math.abs(wheel.y - path.getPointAtLength((low + high) / 2).y));
              }
            }
            return error;
          })(),
        });
      }
      return history;
    });
    const sequence = [];
    for (const snapshot of snapshots) {
      if (snapshot.stop === null) continue;
      if (sequence.at(-1) !== snapshot.stop) sequence.push(snapshot.stop);
    }
    assert.ok(sequence.join(',').includes('0,1,2,3,0'), `${engine}: Every milestone lights in order across a full loop: ${sequence}`);
    for (let index = 1; index < snapshots.length; index++) {
      const distance = snapshots[index].x - snapshots[index - 1].x;
      assert.ok(distance >= 0 || (snapshots[index].x < 0 && snapshots[index - 1].x > 1672), 'Only a full exit resets the forward-moving train');
      if (distance >= 0) assert.ok(distance > 8 && distance < 12, 'The train restores its earlier travel speed');
      assert.ok(snapshots[index].wheelError < .25, `All six bogies stay on the track: ${snapshots[index].wheelError}`);
    }
    await page.evaluate(() => window.restoreFrames());

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(position => document.querySelector('[data-train-car="0"]').getAttribute('transform') === position, reducedTrainPosition);
    const still = await car.getAttribute('transform'); await page.waitForTimeout(200); assert.equal(await car.getAttribute('transform'), still, 'Reduced motion stops the train');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(100); const moving = await car.getAttribute('transform'); await page.waitForTimeout(200); assert.notEqual(await car.getAttribute('transform'), moving, 'Train resumes');
    await page.locator('#home').evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(100); const offscreen = await car.getAttribute('transform'); await page.waitForTimeout(200); assert.equal(await car.getAttribute('transform'), offscreen, 'Train pauses offscreen');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#projects .section-scroll-cue').click(); await page.waitForFunction(() => location.hash === '#background');
    await page.locator('#background .section-scroll-cue').click(); await page.waitForFunction(() => location.hash === '#home');
    await page.screenshot({ path: path.join(screenshotDirectory, `${engine}-desktop-overview.png`), fullPage: true });
    const fallback = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); watch(fallback); await fallback.goto(siteUrl);
    assert.equal(await fallback.locator('.project-panel:visible').count(), 3, 'Project articles work without JavaScript');
    assert.equal(await fallback.locator('.project-trigger:visible').count(), 0, 'No inactive buttons without JavaScript');
    assert.equal(await fallback.locator('.building-fallback:visible').count(), 3, 'Usable article links replace buttons without JavaScript');
    await fallback.locator('.building-gym .building-fallback').tap();
    assert.equal(new URL(fallback.url()).hash, '#project-gym-partner', 'Fallback link reaches the matching article');
    assert.equal(await fallback.locator('.stop-logo:visible').count(), 4, 'All milestones remain visible');
    assert.deepEqual(errors, []);
    console.log(`${engine}: desktop/mobile composition, project buttons and keyboard access, plane flyby and pausing, boat motion, full train loop and bogie alignment, reduced motion, touch dialogs, arrows, footer and no-JavaScript checks passed. Screenshots: ${screenshotDirectory}`);
  } finally { await browser.close(); }
}
(async () => {
  const engines = process.env.SITE_BROWSER ? [process.env.SITE_BROWSER] : ['edge'];
  if (!process.env.SITE_BROWSER && fs.existsSync(webkit.executablePath())) engines.push('webkit');
  for (const engine of engines) await checkBrowser(engine);
})().catch(error => { console.error(error); process.exitCode = 1; });

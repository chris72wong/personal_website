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

async function checkHarbor(page, width) {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#projects').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.waitForFunction(() => document.querySelector('.harbor-stage').classList.contains('harbor-is-visible'));
  await page.waitForTimeout(600);
  const selectors = width <= 700
    ? ['.building-dream .scene-water', '.building-travel .scene-water', '.building-gym .scene-water', '.building-gym .scene-cloud', '.building-gym .scene-lights', '.building-dream .resort-cascade']
    : ['.boat-ferry', '.boat-motor', '.harbor-backdrop .scene-cloud', '.harbor-backdrop .scene-water', '.harbor-backdrop .scene-lights', '.harbor-backdrop .resort-cascade'];
  const snapshot = () => page.evaluate(selectors => selectors.map(selector => {
    const el = document.querySelector(selector);
    const animation = el.getAnimations()[0];
    return { time: animation?.currentTime, state: animation?.playState, duration: animation?.effect.getTiming().duration };
  }), selectors);
  const before = await snapshot();
  await page.waitForTimeout(250);
  const after = await snapshot();
  for (let i = 0; i < before.length; i++) {
    if (selectors[i].startsWith('.boat-')) assert.ok(before[i].duration >= 54000, `Boats use slow animation cycles at ${width}px: ${JSON.stringify(before[i])}`);
    assert.equal(after[i].state, 'running');
    assert.ok(after[i].time > before[i].time, `Scenery layer ${selectors[i]} moves at ${width}px`);
  }
  assert.equal(await page.locator('.project-dialog').evaluate(el => el.open), false, 'Boat motion does not open projects');
  const returnHash = await page.evaluate(() => location.hash);
  await page.locator('.building-action').first().click();
  await page.waitForFunction(() => document.querySelector('.project-dialog').getAnimations().length === 0);
  await page.waitForTimeout(100);
  const popupPaused = await snapshot();
  await page.waitForTimeout(150);
  assert.deepEqual(await snapshot(), popupPaused, 'Boats pause while a popup is open');
  await page.locator('.project-dialog-close').click();
  await page.waitForFunction(() => !document.querySelector('.project-dialog').open);
  await page.waitForFunction(hash => location.hash === hash, returnHash);
  // Allow history's fragment scroll and the popup's return-position frame to settle.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.locator('#home').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.waitForFunction(() => !document.querySelector('.harbor-stage').classList.contains('harbor-is-visible'));
  await page.waitForTimeout(100);
  const offscreen = await snapshot();
  await page.waitForTimeout(150);
  assert.deepEqual(await snapshot(), offscreen, 'Offscreen boats remain paused');
  await page.locator('#projects').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(await page.evaluate(selectors => selectors.every(selector => document.querySelector(selector).getAnimations({ subtree: true }).length === 0), selectors), 'Reduced motion removes boat animations');
}

async function checkWelcome(page, engine) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.querySelector('.hero').classList.contains('scene-active'));
  await page.waitForFunction(() => !document.documentElement.classList.contains('is-typing'));
  assert.deepEqual(await page.locator('.name-text').allTextContents(), ['Christopher', 'Wong']);
  assert.equal(await page.locator('.name-cursor').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
  assert.equal(await page.locator('.section-scroll-cue svg').evaluate(el => getComputedStyle(el).stroke), 'rgb(255, 255, 255)');
  const selectors = ['.hero .scene-cloud', '.hero .scene-water', '.hero .scene-lights', '.hero-vessel'];
  const clocks = () => page.evaluate(selectors => selectors.map(selector => document.querySelector(selector).getAnimations()[0]?.currentTime), selectors);
  const before = await clocks();
  await page.waitForTimeout(250);
  const after = await clocks();
  assert.ok(after.every((time, index) => time > before[index]), 'Welcome clouds, water, lights and boat all animate');
  await page.locator('#background').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
  await page.waitForFunction(() => !document.querySelector('.hero').classList.contains('scene-active'));
  await page.waitForTimeout(100);
  const paused = await clocks();
  await page.waitForTimeout(150);
  assert.deepEqual(await clocks(), paused, 'Welcome motion pauses offscreen');
  await page.waitForFunction(() => document.querySelector('.transit-scene').classList.contains('scene-active'));
  const alpineSelectors = ['.transit-scene .scene-cloud', '.transit-scene .scene-water', '.transit-scene .scene-lights'];
  const alpineClocks = () => page.evaluate(selectors => selectors.map(selector => document.querySelector(selector).getAnimations()[0]?.currentTime), alpineSelectors);
  const alpineBefore = await alpineClocks();
  await page.waitForTimeout(250);
  assert.ok((await alpineClocks()).every((time, index) => time > alpineBefore[index]), 'Mountain clouds, water and bridge lights animate');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.scene-cloud, .scene-water, .scene-lights, .hero-vessel')].every(el => el.getAnimations().length === 0)), 'Reduced motion removes all scenery animations');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}

async function checkBrowser(engine) {
  const browser = engine === 'webkit' ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(siteUrl);
    await page.evaluate(() => document.fonts.ready);
    await checkWelcome(page, engine);
    await page.locator('#background').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.building-action').count(), 3);
    assert.deepEqual(await page.locator('.building-label').allTextContents(), ['Gym Partner', 'Dream Planner', 'Travel Dashboard'], 'Projects follow the requested left-to-right order');
    assert.equal(await page.locator('.section-scroll-cue').count(), 1);
    assert.equal(await page.locator('.section-scroll-cue').first().innerText(), '');
    assert.equal(await page.locator('.section-scroll-cue').first().getAttribute('href'), '#projects');
    assert.equal(await page.locator('.navlink[href="#background"]').innerText(), 'Education/Experience');
    assert.equal(await page.locator('#background-title').innerText(), 'Education/Experience');
    assert.equal(await page.locator('.stop-logo img').count(), 4);
    assert.deepEqual(await page.locator('.stop-label').allTextContents(), ['Wind Group', 'Honours Bachelor of Business Administration', 'RBC Royal Bank of Canada', 'Honours Bachelor of Science, Computer Science']);
    assert.deepEqual(await page.locator('.stop-institution').allTextContents(), ['Brock University', 'Brock University']);
    assert.ok(await page.evaluate(() => Math.abs(document.querySelector('#projects').getBoundingClientRect().bottom - document.querySelector('#background').getBoundingClientRect().top) < 1), 'Projects and Education/Experience are flush');
    assert.equal(await page.locator('#certifications').count(), 0);
    assert.equal(await page.locator('.transit-journey button, .transit-journey a, .transit-status, .journey-heading, .transit-caption, .transit-scene-bar').count(), 0);
    assert.equal(await page.locator('.journey-timeline, .journey-entry').count(), 0);
    assert.equal(await page.locator('.transit-stop').count(), 4);
    assert.equal(await page.locator('[data-track-stop], #transit-station-sign').count(), 0, 'No Underground-style stop posts remain');
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
            const inverse = svg.getCTM().inverse();
            let error = 0;
            for (const art of document.querySelectorAll('.train-car-art')) {
              const matrix = inverse.multiply(art.getCTM());
              for (const contact of [art.dataset.bogieRear, art.dataset.bogieFront]) {
                const [x, y] = contact.split(',').map(Number);
                const wheel = new DOMPoint(x, y).matrixTransform(matrix);
                if (wheel.x < 0 || wheel.x > 1672) continue;
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
    await checkHarbor(page, 1440);
    await checkHarbor(page, 390);
    for (const width of [1920, 1440, 768, 640, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `No page overflow at ${width}px`);
      const bounds = await page.locator('.transit-journey').boundingBox();
      assert.equal(bounds.x, 0, 'Train scenery reaches the left edge');
      const pageWidth = await page.evaluate(() => document.body.clientWidth);
      assert.ok(Math.abs(bounds.width - pageWidth) < 1, `Train scenery reaches the right edge: ${bounds.width}/${pageWidth}`);
      for (const [scene, title] of [['.harbor-stage', '#projects-title'], ['.transit-scene', '#background-title']]) {
        const integrated = await page.locator(scene).evaluate((el, title) => {
          const scene = el.getBoundingClientRect();
          const heading = el.querySelector(title).getBoundingClientRect();
          return heading.top >= scene.top && heading.bottom <= scene.bottom && heading.left >= scene.left && heading.right <= scene.right;
        }, title);
        assert.ok(integrated, `Heading sits within ${scene} at ${width}px`);
      }
      assert.equal(await page.locator('.harbor-backdrop').isVisible(), width > 700, 'Wide panorama switches to individual destinations on phones');
      const buildings = await page.locator('.project-building').evaluateAll(elements => elements.map(el => {
        const { x, y, width, height } = el.getBoundingClientRect();
        return { x, y, width, height };
      }));
      if (width <= 700) {
        assert.equal(buildings[1].x, buildings[0].x, 'Mobile destinations share a reading column');
        assert.ok(buildings[1].y >= buildings[0].y + buildings[0].height && buildings[2].y >= buildings[1].y + buildings[1].height, 'Every mobile project has a separate stop');
      } else {
        assert.ok(buildings[0].x < buildings[1].x && buildings[1].x < buildings[2].x, 'Desktop keeps the horizontal harbor');
        const clearHeading = await page.locator('.harbor-stage').evaluate(el => el.querySelector('.scene-heading').getBoundingClientRect().bottom <= el.querySelector('.building-gym .building-copy').getBoundingClientRect().top);
        assert.ok(clearHeading, `Projects heading and introduction clear the callouts at ${width}px`);
      }
      if (width <= 640) {
        const composition = await page.locator('.hero-landscape').evaluate(svg => {
          const bounds = svg.getBoundingClientRect();
          const boat = svg.querySelector('.hero-vessel-art image').getBoundingClientRect();
          const tower = new DOMPoint(1171, 86).matrixTransform(svg.getScreenCTM());
          return {
            boatVisible: Math.max(0, Math.min(bounds.right, boat.right) - Math.max(bounds.left, boat.left)) / boat.width,
            towerVisible: tower.x > bounds.left && tower.x < bounds.right
          };
        });
        assert.ok(composition.boatVisible > .9 && composition.towerVisible, `Phone framing preserves the yacht and CN Tower at ${width}px`);
      }
      await page.locator('#home').screenshot({ path: path.join(screenshotDirectory, `${engine}-welcome-${width}.png`), style: '.nav, .skip-link { visibility: hidden; }' });
      await page.locator('#background').screenshot({ path: path.join(screenshotDirectory, `${engine}-journey-${width}.png`), style: '.nav, .skip-link { visibility: hidden; }' });
      if ([1440, 768, 640, 390, 320].includes(width)) {
        await page.locator('#projects').screenshot({ path: path.join(screenshotDirectory, `${engine}-projects-${width}.png`), style: '.nav, .skip-link { visibility: hidden; }' });
      }
    }
    await page.locator('.project-building').first().locator('.building-action').click();
    assert.equal(await page.locator('#project-dialog').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#project-dialog').isVisible(), false);
    await page.locator('.navlink[href="#background"]').click();
    assert.equal(await page.evaluate(() => window.location.hash), '#background');
    await page.locator('.back-to-top').click();
    assert.equal(await page.evaluate(() => window.location.hash), '#home');
    await page.locator('#home').screenshot({ path: path.join(screenshotDirectory, `${engine}-home.png`), style: '.nav, .skip-link { visibility: hidden; }' });
    assert.deepEqual(errors, []);
    const staticPage = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    await staticPage.goto(siteUrl);
    assert.equal(await staticPage.locator('.transit-stop').count(), 4);
    assert.equal(await staticPage.locator('.transit-journey a, .transit-journey button').count(), 0);
    assert.equal(await staticPage.locator('.project-panel:visible').count(), 3);
    assert.equal(await staticPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await staticPage.locator('[href="#project-gym-partner"]').click();
    await waitUntil(staticPage, () => location.hash === '#project-gym-partner');
    assert.ok((await staticPage.locator('#project-gym-partner').boundingBox()).y >= 0, 'Static project anchor remains visible');

    // Exercise real animation clocks in a fresh mobile/private context, rather
    // than only checking the reduced-motion popup flows below.
    const animatedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
    const animatedPhone = await animatedContext.newPage();
    animatedPhone.on('pageerror', error => errors.push(error.message));
    await animatedPhone.goto(siteUrl);
    await waitUntil(animatedPhone, () => !document.documentElement.classList.contains('is-typing'));
    assert.deepEqual(await animatedPhone.locator('.name-text').allTextContents(), ['Christopher', 'Wong']);
    await animatedPhone.locator('#background').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await waitUntil(animatedPhone, () => document.querySelector('.hero h1').getBoundingClientRect().bottom < 0);
    await animatedPhone.waitForTimeout(100);
    await animatedPhone.locator('#home').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await waitUntil(animatedPhone, () => document.documentElement.classList.contains('is-typing'));
    assert.notDeepEqual(await animatedPhone.locator('.name-text').allTextContents(), ['Christopher', 'Wong'], 'Revisiting the name starts typing again');
    await waitUntil(animatedPhone, () => !document.documentElement.classList.contains('is-typing'));
    assert.deepEqual(await animatedPhone.locator('.name-text').allTextContents(), ['Christopher', 'Wong']);
    await waitUntil(animatedPhone, () => document.querySelector('.hero-vessel').getAnimations().some(animation => animation.playState === 'running'));
    for (const selector of ['.hero .scene-cloud', '.hero .scene-water', '.hero .scene-lights', '.hero-vessel']) {
      const layer = animatedPhone.locator(selector).first();
      const before = await layer.evaluate(el => el.getAnimations()[0]?.currentTime);
      await animatedPhone.waitForTimeout(150);
      assert.ok(await layer.evaluate(el => el.getAnimations()[0]?.currentTime) > before, `${selector} advances on phones`);
    }
    await animatedPhone.locator('.building-travel').scrollIntoViewIfNeeded();
    await waitUntil(animatedPhone, () => document.querySelector('.harbor-stage').classList.contains('harbor-is-visible'));
    for (const selector of ['.building-dream .building-model', '.building-travel .building-model', '.building-gym .building-model']) {
      const before = await animatedPhone.locator(selector).evaluate(el => el.getAnimations({ subtree: true })[0]?.currentTime);
      await animatedPhone.waitForTimeout(150);
      const after = await animatedPhone.locator(selector).evaluate(el => el.getAnimations({ subtree: true })[0]?.currentTime);
      assert.ok(typeof before === 'number' && after > before, `${engine}: ${selector} advances on mobile`);
    }
    await animatedPhone.locator('.transit-scene').scrollIntoViewIfNeeded();
    const trainBefore = await animatedPhone.locator('[data-train-car="0"]').getAttribute('transform');
    await animatedPhone.waitForTimeout(250);
    assert.notEqual(await animatedPhone.locator('[data-train-car="0"]').getAttribute('transform'), trainBefore, 'Train moves in a mobile private context');
    await animatedPhone.waitForFunction(() => document.querySelector('.transit-stops-viewport').scrollLeft > 100, null, { timeout: 15000 });
    await animatedPhone.locator('.transit-stops-viewport').evaluate(el => {
      el.dispatchEvent(new Event('pointerdown'));
      el.scrollLeft = 0;
    });
    await animatedPhone.waitForTimeout(200);
    assert.equal(await animatedPhone.locator('.transit-stops-viewport').evaluate(el => el.scrollLeft), 0, 'Manual exploration pauses the label strip following');
    await animatedPhone.emulateMedia({ reducedMotion: 'reduce' });
    await animatedPhone.waitForTimeout(100);
    const stillTrain = await animatedPhone.locator('[data-train-car="0"]').getAttribute('transform');
    await animatedPhone.waitForTimeout(150);
    assert.equal(await animatedPhone.locator('[data-train-car="0"]').getAttribute('transform'), stillTrain);
    await animatedPhone.locator('#home').evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await animatedPhone.waitForTimeout(150);
    assert.deepEqual(await animatedPhone.locator('.name-text').allTextContents(), ['Christopher', 'Wong']);
    assert.equal(await animatedPhone.evaluate(() => document.documentElement.classList.contains('is-typing')), false, 'Reduced motion shows the full name without typing');
    await animatedContext.close();

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
      const cityBounds = await phone.locator('.project-harbor').boundingBox();
      assert.equal(cityBounds.x, 0);
      assert.equal(cityBounds.width, 390);
      assert.equal(await phone.locator('.project-harbor').evaluate(el => el.scrollWidth === el.clientWidth), true, 'Projects require no horizontal swipe');
      await phone.locator('#projects').screenshot({ path: path.join(screenshotDirectory, `${engine}-projects-${restricted ? 'restricted' : 'phone'}.png`), style: '.nav, .skip-link { visibility: hidden; }' });
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
      await phone.locator('.navlink[href="#background"]').tap();
      await waitUntil(phone, () => location.hash === '#background');
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

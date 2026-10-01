const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const siteUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const [width, height] of [[1280, 720], [1366, 768], [1536, 864], [1920, 1080], [2560, 1440], [3440, 1440], [3840, 1080], [1920, 600], [1024, 600]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(siteUrl);
      await page.evaluate(() => document.fonts.ready);
      for (const [id, frame] of [['home', '.hero-stage'], ['projects', '.harbor-stage'], ['background', '.transit-scene']]) {
        await page.locator(`.navlink[href="#${id}"]`).click();
        const fit = await page.evaluate(({ id, frame }) => {
          const section = document.getElementById(id);
          const scene = section.querySelector(frame).getBoundingClientRect();
          const nav = document.querySelector('.nav').getBoundingClientRect();
          const cue = section.querySelector('.section-scroll-cue');
          const arrow = cue.getBoundingClientRect();
          const visible = bounds => bounds.left >= -.5 && bounds.right <= innerWidth + .5 && bounds.top >= nav.bottom - .5 && bounds.bottom <= innerHeight + .5;
          const center = document.elementFromPoint(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2);
          const controls = [...section.querySelectorAll('.project-building, .project-trigger, .transit-stop')].map(el => el.getBoundingClientRect());
          const backdrop = section.querySelector('svg > image');
          const art = backdrop.getBoundingClientRect();
          const matrix = backdrop.getScreenCTM();
          return {
            sceneVisible: visible(scene), arrowVisible: visible(arrow), arrowClickable: center === cue || cue.contains(center),
            fullWidth: Math.abs(scene.left - nav.left) < .5 && Math.abs(scene.right - nav.right) < .5,
            fullHeight: Math.abs(scene.top - nav.bottom) < .5 && Math.abs(scene.bottom - innerHeight) < .5,
            artCoversScene: art.left <= scene.left + .5 && art.right >= scene.right - .5 && art.top <= scene.top + .5 && art.bottom >= scene.bottom - .5,
            uniformScale: Math.abs(matrix.a - matrix.d) < .0001 && matrix.b === 0 && matrix.c === 0,
            controlsVisible: controls.every(visible),
            cardsClearArrow: [...section.querySelectorAll('.project-building')].every(el => el.getBoundingClientRect().bottom <= arrow.top),
            horizontalOverflow: document.documentElement.scrollWidth > innerWidth
          };
        }, { id, frame });
        assert.ok(fit.sceneVisible && fit.arrowVisible && fit.arrowClickable, `${width}x${height} ${id}: scene and arrow must fit and be clickable: ${JSON.stringify(fit)}`);
        assert.ok(fit.fullWidth && fit.fullHeight && fit.artCoversScene && fit.uniformScale, `${width}x${height} ${id}: artwork must fill the screen through proportional cropping: ${JSON.stringify(fit)}`);
        assert.ok(fit.controlsVisible && fit.cardsClearArrow && !fit.horizontalOverflow, `${width}x${height} ${id}: controls must fit without overlapping the arrow`);
        if (id === 'projects') {
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await page.waitForFunction(() => document.querySelector('.resort-plane').getAnimations().length === 1);
          const longestGap = await page.locator('.resort-plane').evaluate(plane => {
            const animation = plane.getAnimations()[0];
            const originalTime = animation.currentTime;
            animation.pause();
            const viewport = plane.ownerSVGElement.getBoundingClientRect();
            let gap = 0, longest = 0;
            // Two complete loops also measure the wraparound at the screen edges.
            for (let time = 0; time <= 46000; time += 100) {
              animation.currentTime = time;
              const bounds = plane.querySelector('image').getBoundingClientRect();
              const visible = Number(getComputedStyle(plane).opacity) > 0 &&
                bounds.right > viewport.left && bounds.left < viewport.right &&
                bounds.bottom > viewport.top && bounds.top < viewport.bottom;
              gap = visible ? 0 : gap + 100;
              longest = Math.max(longest, gap);
            }
            animation.currentTime = originalTime;
            animation.play();
            return longest;
          });
          assert.ok(longestGap <= 2000, `${width}x${height}: plane may be out of sight for at most two seconds, got ${longestGap}ms`);
          await page.emulateMedia({ reducedMotion: 'reduce' });
        }
        if (width === 3840 && id === 'projects') await page.screenshot({ path: path.join(os.tmpdir(), 'viewport-ultrawide-review.png') });
        if (width === 1366 && id === 'projects') await page.screenshot({ path: path.join(os.tmpdir(), 'viewport-laptop-review.png') });
        await page.locator(`#${id} .section-scroll-cue`).click();
        assert.equal(new URL(page.url()).hash, id === 'home' ? '#projects' : id === 'projects' ? '#background' : '#home');
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    const resizing = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
    await resizing.goto(siteUrl);
    await resizing.locator('.navlink[href="#projects"]').click();
    await resizing.setViewportSize({ width: 1920, height: 720 });
    await resizing.waitForFunction(() => {
      const section = document.getElementById('projects').getBoundingClientRect();
      const arrow = document.querySelector('#projects .section-scroll-cue').getBoundingClientRect();
      return Math.abs(section.top - document.querySelector('.nav').getBoundingClientRect().bottom) < 1 && arrow.bottom <= innerHeight;
    });
    await resizing.close();
    console.log('Desktop viewport checks passed at nine laptop, monitor, ultrawide, and short-window sizes: full-width proportional cropping, visible/clickable arrows, controls, navigation, and live window resizing.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

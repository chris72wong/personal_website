Personal website

Static HTML, CSS, and JavaScript. Serve the repository with a local HTTP server to preview it.

The project neighbourhood and education landscape span the page. Text stays in a centered reading column. Projects sit side by side on desktop and stack vertically on phones, with native links to complete articles when JavaScript or dialog support is unavailable. Popup content scrolls independently, and closing restores the page position. Navigation measures its actual height to keep section headings visible.

The portfolio does not require cookies or browser storage. Project popups remain usable if browser history updates are denied, media preferences support older Safari listeners, and popup cleanup has a timeout for suspended mobile animations.

The education and experience journey uses an inline SVG landscape and a three-car train that loops from left to right, lighting each milestone as it passes. The animation pauses outside the viewport or in a hidden tab and stays still with reduced motion enabled. All timeline content remains visible without JavaScript.

Checks:

- `node --test --test-isolation=none tests/projects.test.cjs`
- `node tests/transit.browser.cjs` with Playwright available and Microsoft Edge installed. The suite also runs WebKit when installed; set `SITE_BROWSER=edge` or `SITE_BROWSER=webkit` to select one engine. `PLAYWRIGHT_BROWSERS_PATH` is respected, with `personal-website-browsers` in the system temporary directory used when present. The browser checks use `http://127.0.0.1:4173` by default; set `SITE_URL` to another local preview URL. Screenshots go to `personal-website-review` in the system temporary directory; set `TRANSIT_SCREENSHOT_DIR` to change that location.
- Browser coverage includes 320–1920px layouts, touch input, popup scrolling and closing, shared project links, Back/Forward, rotation, navigation, reduced motion, no JavaScript, and fresh private contexts with storage/fonts/history blocked and legacy media listeners. Device emulation and desktop WebKit complement testing on a physical phone; they do not reproduce every iOS browser condition.

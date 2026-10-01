Personal website

Static HTML, CSS, and JavaScript. Serve the repository with a local HTTP server to preview it.

The project neighbourhood and Education/Experience landscape span the page, with section headings integrated into the scenery. Text stays in a centered reading column. Projects sit side by side on desktop; on phones, smaller buildings alternate along a winding vertical road, with native links to complete articles when JavaScript or dialog support is unavailable. Popup content scrolls independently, and closing restores the page position. Navigation measures its actual height to keep section headings visible.

The portfolio does not require cookies or browser storage. Project popups remain usable if browser history updates are denied, media preferences support older Safari listeners, and popup cleanup has a timeout for suspended mobile animations.

The Education/Experience journey uses an inline SVG landscape and a three-car train that loops from left to right, lighting each milestone as it passes. Stops use circle-and-bar symbols. The animation pauses outside the viewport or in a hidden tab and stays still with reduced motion enabled. The horizontal strip contains all four milestones and remains visible without JavaScript.

A car loops along both lanes of the project road on desktop and mobile, lighting buildings without opening their project dialogs. The mobile road bends in the gaps between stops and reaches both section edges. Traffic pauses offscreen, in hidden tabs, while a popup is open, and with reduced motion. The modern electric train has a rounded cab and rear, long carriages, bogies, and a pantograph. Below it, a strip of logos and full milestone labels follows the train on mobile; users can also swipe or use the keyboard to explore, temporarily pausing that following behavior.

The Toronto skyline traces and the name types when each enters the viewport, including on phones, and both replay when revisited. Reduced motion shows the complete name immediately. Mobile animation checks exercise advancing skyline, train, tree, and sign animation clocks in fresh private contexts. On iPhone, the site respects Settings → Accessibility → Motion → Reduce Motion.

Checks:

- `node --test --test-isolation=none tests/projects.test.cjs`
- `node tests/transit.browser.cjs` with Playwright available and Microsoft Edge installed. The suite also runs WebKit when installed; set `SITE_BROWSER=edge` or `SITE_BROWSER=webkit` to select one engine. `PLAYWRIGHT_BROWSERS_PATH` is respected, with `personal-website-browsers` in the system temporary directory used when present. The browser checks use `http://127.0.0.1:4173` by default; set `SITE_URL` to another local preview URL. Screenshots go to `personal-website-review` in the system temporary directory; set `TRANSIT_SCREENSHOT_DIR` to change that location.
- Browser coverage includes 320–1920px layouts, touch input, popup scrolling and closing, shared project links, Back/Forward, rotation, navigation, reduced motion, no JavaScript, and fresh private contexts with storage/fonts/history blocked and legacy media listeners. Device emulation and desktop WebKit complement testing on a physical phone; they do not reproduce every iOS browser condition.

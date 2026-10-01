Personal website

Static HTML, CSS, and JavaScript. Serve the repository with a local HTTP server to preview it.

The education and experience journey uses an inline SVG landscape and a three-car train that loops from left to right, lighting each milestone as it passes. The animation pauses outside the viewport or in a hidden tab and stays still with reduced motion enabled. All timeline content remains visible without JavaScript.

Checks:

- `node --test --test-isolation=none tests/projects.test.cjs`
- `node tests/transit.browser.cjs` with Playwright available and Microsoft Edge installed. The browser checks use `http://127.0.0.1:4173` by default; set `SITE_URL` to another local preview URL. Optionally set `TRANSIT_SCREENSHOT_DIR` to an existing directory for desktop and phone screenshots.

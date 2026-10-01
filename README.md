Personal website

Static HTML, CSS, and JavaScript. Serve the repository with a local HTTP server to preview it.

The sunset project harbor and Education/Experience landscape span the page, with section headings integrated into the scenery. Projects sit side by side over the harbor on desktop; phones show three illustrated destinations in a vertical reading column. Native links lead to complete articles when JavaScript or dialog support is unavailable. Popup content scrolls independently, and closing restores the page position. Navigation measures its actual height to keep section headings visible.

The portfolio does not require cookies or browser storage. Project popups remain usable if browser history updates are denied, media preferences support older Safari listeners, and popup cleanup has a timeout for suspended mobile animations.

The Education/Experience journey uses a painterly moonlit mountain backdrop and a three-car train crossing the arched viaduct at its original pace (about 22 seconds per loop), lighting milestones as it passes. Each carriage independently follows the track at both wheel contacts, and the bridge's foreground railing conceals the lower wheel edges. Clouds drift, lake reflections shimmer, and lights and stars brighten subtly. There are no Underground-style trackside stop posts. Desktop overlays all four milestones on the forest; smaller screens show the labels below the scene. The milestones remain visible without JavaScript. Asset sources and built-in imagegen prompts are recorded in `images/alpine-artwork.md`.

Projects uses a detailed sunset resort panorama: Gym Partner's open-air gym on the left, Dream Planner's resort lodge in the middle, and Travel Dashboard's departures terminal on the right. Live names, descriptions, icons, and Explore links sit above the destinations. Two yachts drift slowly with bobbing, wakes, and reflections; clouds, lagoon and pool water, waterfalls, and lanterns animate independently. Phones show each destination as an illustrated card with animated scenery. Asset sources and built-in imagegen prompts are recorded in `images/resort-artwork.md`; `images/harbor-artwork.md` documents the previous scene.

The modern electric train has a rounded cab and rear, long carriages, bogies, and a pantograph. Below it, a strip of logos and full milestone labels follows the train on mobile; users can also swipe or use the keyboard to explore, temporarily pausing that following behavior.

The welcome page shows a painterly Toronto night waterfront with separate drifting clouds, shimmering reflections, subtle light and star pulses, and a slowly moving yacht with a wake and reflection. The name types when the section enters the viewport, with a white blinking cursor and white scroll arrows. Phones retain the CN Tower and a smaller yacht. Artwork sources and built-in imagegen prompts are recorded in `images/welcome-artwork.md`.

All scene motion pauses offscreen, in hidden tabs, or during project popups. Reduced motion shows still scenery and the complete name immediately. Mobile checks exercise advancing cloud, water, light, train, and boat animation clocks in fresh private contexts. On iPhone, the site respects Settings → Accessibility → Motion → Reduce Motion.

Checks:

- `node --test --test-isolation=none tests/projects.test.cjs`
- `node tests/transit.browser.cjs` with Playwright available and Microsoft Edge installed. The suite also runs WebKit when installed; set `SITE_BROWSER=edge` or `SITE_BROWSER=webkit` to select one engine. `PLAYWRIGHT_BROWSERS_PATH` is respected, with `personal-website-browsers` in the system temporary directory used when present. The browser checks use `http://127.0.0.1:4173` by default; set `SITE_URL` to another local preview URL. Screenshots go to `personal-website-review` in the system temporary directory; set `TRANSIT_SCREENSHOT_DIR` to change that location.
- Browser coverage includes 320–1920px layouts, full-loop wheel alignment and train speed, phone yacht/tower framing, scenery animation and pausing, touch input, popup scrolling and closing, shared project links, Back/Forward, rotation, navigation, reduced motion, no JavaScript, and fresh private contexts with storage/fonts/history blocked and legacy media listeners. Device emulation and desktop WebKit complement testing on a physical phone; they do not reproduce every iOS browser condition.

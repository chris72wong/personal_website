# Personal website

Static HTML, CSS, and JavaScript. Serve the repository with a local HTTP server to preview it.

Desktop and phones share the same panoramic composition. The viewport uses a 1280px desktop canvas on phones, initially scaled down to show the full page width, with unrestricted pinch zoom. Projects stay side by side, all four education/experience milestones remain over the forest, and no mobile camera panning or automatic label scrolling occurs. Scene heights follow the artwork proportions rather than device height.

The welcome scene retains its slowly drifting and bobbing yacht. The moonlit alpine railway retains its three-car train at the original speed, with each carriage following both wheel contacts on the track and milestones lighting as it passes. A static stone parapet follows the bridge curve in front of the train, hiding the wheels while keeping the carriage bodies visible. The name types when it enters view, followed by a blinking white square cursor. The cursor pauses offscreen and during project popups. These are the only automatic animations. They pause offscreen, in hidden tabs, during project popups, and for reduced motion. Clouds, water, stars, and lights are painted into the backdrops; filtered duplicate scenery, resort yachts, section entrance effects have been removed.

Projects uses a subdued painted sunset resort panorama, matching the alpine scene's broader shapes and restrained highlights. Live names, descriptions, icons, and Explore links sit above the three destinations. The optimized backdrop is `images/projects-resort-subtle.webp`; its generation prompt is recorded in `images/resort-subtle-artwork.md`. Previous artwork remains available for reference.

White double chevrons link from Home to Projects, Projects to Education/Experience, and the final scene back to Home. The final image meets the full-width copyright divider directly.

Project popups keep their desktop presentation, keyboard containment, focus restoration, scroll restoration, and Back/Forward behavior. Explicit open/close transitions remain. Complete project articles remain available without JavaScript or dialog support. No cookies or browser storage are required. Restricted history, older Safari media listeners, and suspended closing animations are supported.

## Checks

- `node --test --test-isolation=none tests/projects.test.cjs`
- `node tests/transit.browser.cjs` with Playwright available and Microsoft Edge installed. WebKit runs when installed; set `SITE_BROWSER=edge` or `SITE_BROWSER=webkit` to select an engine. The browser checks default to `http://127.0.0.1:4173`; set `SITE_URL` for another local preview. Screenshots default to `personal-website-review` in the system temporary directory; override with `TRANSIT_SCREENSHOT_DIR`.

Browser coverage includes equal desktop/phone composition at 320–900px phone viewports, initial overview scaling, unrestricted zoom metadata, touch project dialogs, static scenery, live boat motion, a full train loop with all six bogies aligned, motion pausing, reduced motion, arrow navigation, footer alignment, and no-JavaScript fallback. Device emulation complements testing on a physical phone.

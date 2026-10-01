# Alpine railway artwork

Created with the built-in imagegen tool using the user's Education/Experience reference. Generated PNG masters remain in the default generated_images folder. Optimized WebP exports are saved in this project:

- `images/education-alpine.webp` — 1672 × 941 moonlit mountain, forest, lake, and viaduct backdrop. Train, tall circle-and-bar stop posts, logos, and text removed.
- `images/education-alpine-v2.webp` — 1672 × 941 final backdrop, with clouds removed for separate animation while preserving the original railway geometry.
- `images/alpine-train.webp` — 1100 × 163 transparent complete three-car electric passenger train. Transparent margins trimmed for placement on the bridge.
- `images/night-cloud.webp` — transparent drifting cloud layer shared with the welcome scene; prompt recorded in `images/welcome-artwork.md`.

The site draws each carriage independently along an invisible curve matching the bridge. Both bogie contact points map onto the track; a foreground bridge mask keeps lower wheel edges behind the railing. A full loop takes about 22 seconds, restoring the original speed. Separate clouds, clipped lake reflections, lamps, and stars add subtle motion. Motion pauses outside the viewport, in hidden tabs, and while project popups are open, and remains still with reduced motion. Milestone logos, institution names, degrees, and dates are live HTML. Desktop overlays the milestones on the forest; smaller screens put them below the scene. The phone camera follows the train and the milestone strip can be swiped or explored with the keyboard.

## Final backdrop prompt

Use case: precise-object-edit. Asset type: full-width animated portfolio section backdrop.
Edit target: attached Education/Experience moonlit alpine bridge illustration.
Keep the exact wide 16:9 composition, richly detailed painterly illustration style, crescent moon and stars, layered blue mountains, pine forests, lake reflections, and the stone arched railway viaduct in the same positions. Remove the train, its headlight beam and motion streaks, rebuilding the bridge/landscape behind it. Remove every tall circle-and-bar London Underground style trackside stop post, including its pole. Keep the low bridge railing and tiny normal railing lights. Remove ALL interface elements: large heading and underline, four logos and their boxes, horizontal milestone connecting lines/dots, all names/degrees/dates. Repair the sky and lower forest naturally. The bottom third should remain a dark detailed forest/lake vignette suited to overlaying real HTML milestone text later. No text, logos, trains, tall railway signs, interface boxes, or roundel posts. Preserve bridge rail alignment and image framing.

## Clear-sky backdrop edit prompt

Use case: precise-object-edit. Edit target: the attached moonlit alpine viaduct landscape, already without trains or signs. Change ONLY the clouds: remove all painted clouds and replace them with matching clear blue night sky, preserving stars where appropriate. Keep every mountain contour, pine tree, lake reflection, moon, bridge arch, low bridge railing, lamp, and the EXACT railway deck curve and pixel positions unchanged. Do not move or redraw the bridge, change framing, add any objects, trains, posts or text. Keep exact 1672x941 composition. Real animated cloud layers will be added in code.

## Final train prompt

Use case: background-extraction. Asset type: transparent train sprite for a moonlit mountain railway website.
Style/design reference: the attached alpine railway portfolio illustration. Generate ONLY a complete modern three-car electric passenger train, matching the reference train, facing RIGHT. Side view with a very slight elevated view of the roof; all cars aligned horizontally on an imaginary straight track. Sleek rounded cab on the right, rounded rear on the left, two articulated flexible couplings, long silver blue-gray bodies with a thin mint green stripe, dark navy roof and wheels, warm glowing golden cabin windows, delicate pantograph. Detailed painterly illustrated style and night-time blue shadows, exactly matching the reference. The full train is visible from tail to cab, three connected cars, extremely wide and low silhouette (roughly six times wider than tall). Genuinely transparent background around and below the train. No rail, bridge, scenery, text, signs, light beams, ground shadows, motion streaks, or reflections. Leave small transparent margins.


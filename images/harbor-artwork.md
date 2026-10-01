# Harbor artwork

Created with the built-in imagegen tool from the user's supplied harbor reference. The generated PNG masters remain in the default generated_images folder. The site uses WebP exports; boat transparency is preserved.

## Site assets

- `images/projects-harbor.webp`: sunset backdrop with boats and interface text removed.
- `images/harbor-ferry.webp`: transparent passenger ferry.
- `images/harbor-motorboat.webp`: transparent foreground motorboat.
- `images/harbor-sailboat.webp`: transparent sailboat reused at different distances.

The four assets total about 295 KiB. Desktop places animated boat layers over the panorama. Phones crop each destination from the same backdrop and add a boat layer to each illustration. Animation cycles take 54–110 seconds; boat bobbing takes 6–8 seconds. Motion pauses offscreen, in hidden tabs, and while a project dialog is open. Reduced motion leaves the boats still.

## Final prompts

### harbor

Use case: precise-object-edit. Asset type: full-width website harbor backdrop.
Edit target: attached sunset tropical harbor illustration. Preserve the composition and painterly detailed illustration style, all three buildings, palms, docks, mountains, sunset, lanterns, reflections and turquoise water. Remove ALL boats (the foreground motorboat, middle passenger ferry, and every small sailboat), repairing water naturally where they were. Remove the large Projects heading and all three bottom project titles and button rectangles/text, repairing sky and water naturally. Keep the physical DEPARTURES and GYM signs on buildings. Keep exactly the same wide 16:9 composition and building positions. No new UI, no extra buildings, no boats. This image will have real HTML text and separately animated boat layers placed over it.

### ferry

Use case: background-extraction. Asset type: animated website boat sprite.
Input image: attached tropical sunset harbor, boat design and painterly style reference.
Create ONLY the white-and-navy small passenger ferry from the center foreground of the reference, facing left as in the reference. Detailed warm amber cabin windows, navy canopy, white hull, two small orange life rings, softly painted sunset highlights. Full side view with slight perspective showing roof, same camera angle as the reference. Isolated single boat on a genuinely transparent background. Crop composition reasonably tight around boat with some transparent margin. No scenery, water, wake, reflections, text, ground, shadow below or other objects. Wide image, boat fills width.

### motor

Use case: background-extraction. Asset type: animated website boat sprite.
Input image: attached tropical sunset harbor, style reference.
Create ONLY the small white and dark navy motorboat in the lower foreground of the reference, facing right. Compact cabin with warm amber windows, white pointed hull, navy roof, little antenna, painterly sunset highlights. Full side view with slight elevated perspective exactly matching reference camera. Single boat isolated on a genuinely transparent background with a tight crop and small clear margins. No water, wake, scenery, reflection, text, shadows below or other objects. Wide image.

### sail

Use case: background-extraction. Asset type: small distant animated website sailboat sprite.
Input image: tropical harbor style reference. Create one small sailing boat like distant sailboats in this image: slender navy wooden hull, thin tall mast, two triangular peach cream sails lit by sunset, painterly illustration with simple clean silhouette. Slight elevated side view matching reference, whole boat visible. Isolated centered on genuinely transparent background, crop reasonably tight. No water, reflection, wake, scenery, shadow or text.


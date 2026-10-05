# MAP node artwork

Source: the supplied `E8BB0B53-95FB-49A8-B1A7-8E003B87B2F0.jpeg` (1536 × 512).
`assets/map-node-sheet.webp` is the original lossless format conversion and is retained as the reference.
The runtime sheet is `assets/map-node-sheet-dark.webp`: its hex interiors were edited to black with the
built-in imagegen tool, retaining the monochrome swords, workshop and scrap imagery. The output was
normalized to 1536 × 512 with nearest-neighbor resizing, then saved as lossless WebP. CSS also supplies
a black background beneath the artwork. See the exact edit prompt below.

The 360 × 426 CSS sprite windows start at y=38:

| Type | Source x | Artwork |
|---|---:|---|
| battle | 106 | Crossed swords |
| garage | 586 | Workshop / wrench |
| scrap | 1066 | Scrap crate / gear |

Each image fills the existing point-up hexagonal button and is clipped to that hex.
The same sprite windows are used for the two selectable nodes and the four future previews.
Previous SVG icons and visible node labels are not rendered. Accessible Japanese labels,
long-press details, route dispatch, and inert preview behavior are retained.
MAP generation, save/load, rewards, depth progression and combat are unchanged.

Regression: `node tests/map-nodes.cjs` and `node tests/map-nodes-browser.cjs`.
Browser test checks the loaded sheet, three distinct sprite windows, absence of SVG/text labels,
and layout at 320×568, 375×667, 390×844, 393×852 and 430×932.

## Black-background edit prompt

Use case: precise-object-edit. Edit target: the supplied NEHAN three-icon sheet. Change ONLY the backgrounds inside all three hexagons to opaque solid near-black (#000000), especially the light grey panels behind the left crossed swords and right scrap crate. Keep the recognizable crossed katana blades/handles, central star, middle workshop wrench/tools/bench, right scrap crate/gear/spare parts and thin white pixel hex outlines. Make the existing foreground artwork crisp white/light-grey pixel lines against BLACK interiors, retaining black outlines where needed. No new objects, no text, no color, no neon or light grey/white filled panels. The middle garage is already mostly black; retain it. Preserve EXACT layout and positions: canvas 1536 by 512 pixels, hex centers x286/x766/x1246 y251, three equal hexes width360 height426 top38. Preserve all boundaries and composition, no scaling, no repositioning, no crop. Preserve the white canvas OUTSIDE the hexagons (the app clips those regions); it is only hex interiors that must be black. This is a minimal background correction, NOT a new icon design. The most important invariant is predominantly black interiors, with recognizable white/light-grey foreground art and white thin hex borders.

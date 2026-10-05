# MAP node artwork

Source: the supplied `E8BB0B53-95FB-49A8-B1A7-8E003B87B2F0.jpeg` (1536 × 512).
`assets/map-node-sheet.webp` is a lossless format conversion of that source, not regenerated art.

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

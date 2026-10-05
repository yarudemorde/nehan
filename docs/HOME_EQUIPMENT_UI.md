# ホーム背景・装備変更 UI

- 背景: `assets/home-city-tall.webp`（836 × 1881、4:9）。添付画像を参考に組み込みimagegenで生成。元画像を変更せず別アセットとして保存。
- ホームは9:16中央配置を解除し、端末の全幅・全高を使用。背景はフレームを含まないためobject-fit: coverで余白なく表示。操作UIのみsafe-areaを避ける。
- 下部の白枠・黒背景メニューは横スクロール・スナップ。左右タッチスワイプ、マウスドラッグ、左右キーに対応。ボタンをタップすると従来の画面へ移動。
- 装着画面の装備武器・Memoryの「装備変更」は中央一覧を所持個体一覧へ切り替える。別画面・交換専用オーバーレイは作らない。
- 交換時はWeapon/Memoryの個体全体をStorageと入れ替える。Module・Slot・CT・破損状態・レア度を保持。最大HP低下時のみ現在HPをclamp。戦闘中の交換・Install/Overwrite禁止は継続。

## 背景生成プロンプト

組み込みimagegen（参考画像を渡して生成、非透明）。

Use case: stylized-concept. Asset type: NEHAN full-screen portrait mobile game home background, 1024 x 2304 pixels, approximately 4:9, edge-to-edge artwork. Input image: supplied monochrome city is style and scene reference. Generate a fresh vertically extended composition matching its dark Japanese cyberpunk underground railway city, Hong Kong-like layered back alleys, dense cables, elevated train, bridges, lightboxes and white neon in BLACK AND WHITE ONLY. Bald mechanical robot bounty hunter seen from behind at lower left, weathered black cloak and pale worn metal, no hair. Preserve strong white-on-black gritty pixel/dither illustration style and powerful depth. Vertical sign at upper left reads exactly 合法改造. No 九龍. Tall distant towers fade into white fog high above. Bottom 25% stays predominantly dark street and cloak for overlaid menu, still illustrated, never a blank border. Reserve subdued upper-left space for HTML title; no title or menus baked into artwork. Critical: art reaches all four edges, no letterboxing, no framing, no UI buttons. The whole tall mobile screen must feel immersed in this world. No color, no extra foreground people, no watermark.

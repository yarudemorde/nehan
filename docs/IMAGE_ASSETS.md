# 画像の差し替え

戦闘画面は `<img>` でサンプル画像を読み込みます。ゲーム処理から独立して画像を差し替えられます。

| 用途 | 現在のパス | 推奨比率 |
| --- | --- | --- |
| 主人公 | assets/protagonist.svg | 3:4、透過背景 |
| 敵 E01 | assets/sentinel.svg | 3:4、透過背景 |
| 敵 E02 | assets/hunter.svg | 3:4、透過背景 |
| 敵 E03 | assets/monk.svg | 3:4、透過背景 |
| 武器 | assets/action-weapon.svg | 1:1 |
| メモリ1〜4 | assets/action-1.svg 〜 assets/action-4.svg | 1:1 |

SVGは同名ファイルを置き換えてください。PNG/WebPを使用する場合は assets に保存し、index.html の renderCombat / renderMemory 内の画像パスと敵画像の対応表を拡張子も含め変更してください。拡張子だけを変えてSVGファイルにPNGを保存しないでください。画像は object-fit: contain で縦横比を維持します。推奨サイズは人物480×640px、アイコン256×256pxです。

武器・メモリのサンプルは現在の枠番号に対応します。アイテムごとに別の画像を使う場合は、各アイテムIDから画像パスを解決する対応表を追加してください。タップ・長押し・CT・破損率の挙動は画像に依存しません。

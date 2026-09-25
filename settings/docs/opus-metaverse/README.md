# opus-metaverse（Opus 5.5 没入型コンセプトサイト）

2026-09-25 新規。`opus-metaverse/index.html` 1枚物（Three.js r170 を jsDelivr から読み込み）＋ `tune-panel.js`。

- ローカル: http://localhost:8782 （`.claude/launch.json` の name: `opus-metaverse`）
- 未デプロイ（「デプロイ」と言われたら新しい Vercel プロジェクトを作る）

## 構成（スクロール割合 P = 0〜1 でカメラが -Z 方向へ進む）

| 章 | P の範囲 | 3D | 文字 |
|---|---|---|---|
| 00 Genesis | 0〜0.095 | 光る核（ノイズで脈打つ球 z=-45）＋殻の粒子 | Opus 5.5（スクロールで文字が散る） |
| 01 Threshold | 0.105〜0.215 | 核を通り抜け → 粒子の輪のポータル z=-76 | Beyond the interface. |
| 02 Worlds | 0.23〜0.45 | グリッドの床/天井・光る塔30本・浮かぶ結晶 | It builds. ＋能力カード4枚 |
| 03 Depth | 0.47〜0.645 | 六角リングのトンネル＋流れる光の線（カメラが傾く） | Stay in the flow. ＋流れる言葉 |
| 04 Connection | 0.665〜0.845 | 星座ネットワーク z=-500（ドラッグで回転・ホバーで膨らむ） | Every idea, connected. |
| 05 Singularity | 0.875〜 | ブラックホール z=-615。星屑が渦を巻いて吸い込まれる | Enter the world. ＋ターミナル打ち込み |

インタラクション: マウスで視点・クリックで波紋（全粒子に伝わる）・スクロール速度で色ずれ/速度ブラー/画角/音が変化・
カード3D傾き＋スポットライト・ボタン吸い付き・カスタムカーソル・右の章ナビでジャンプ・音はWeb Audioで生成（ファイル無し）。

## 🟡 仮置き（ヒデさん未確認）

| 項目 | 仮の値 | 変える場所 |
|---|---|---|
| 配色 | 背景 #04030a / コーラル #ff7a45 / すみれ #8f7bff / シアン #5fd4ff | 調整パネル「🎬 全体 > 配色」 |
| 書体 | Geist / Geist Mono / Instrument Serif（イタリック） | index.html の Google Fonts |
| コピー | 英語の文言すべて（性能数値は捏造しないため出していない） | 各 section |
| CTA のリンク先 | https://claude.ai | `#ch-final` |

## 注意

- 明るさ: 核は bloom で白飛びしやすい。核のフラグメント末尾の `*.34` が明るさの係数
- Anthropic 公式ロゴは使っていない（自作の軌道マーク）。フッターに「Not affiliated」表記あり
- Claude のブラウザパネルが非表示だと描画が止まる → 検証は design-gallery の Playwright(swiftshader)で撮る

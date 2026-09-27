# 🎨 Web → Figma 出力の手順（コード→デザイン）

> ⚠️ **2026-09-27 から、進め方の決まりの正は [RULES.md](RULES.md)。** この資料は詳細と経緯の参照用です。食い違ったら RULES.md を優先します。

制定 2026-08-29。anyflow v3 のキービジュアル（惑星＋軌道）を Figma の指定セクションへ
出力した時の知見をまとめたもの。**「このグラフィックを、あのセクションのここへ入れて」**と
言われた時は、毎回この手順でやる。

> 前提ツール: Figma MCP の `use_figma`（Plugin API を JS で実行）／`upload_assets`（SVG・画像取込）／
> `get_screenshot`。着手前に `figma-use` スキルを必ずロードする。

---

## 0. 大方針：ベクターは残す・ラスターだけ画像

ヒデさんの標準指示：**「可能な限り Figma のデータ（パス・オブジェクト）に置き換える。
そのまま出すのが難しいものだけ 2倍解像度の画像で入れる」**。

| 要素 | 出し方 |
|---|---|
| 線・図形・円・グラデ（軌道・ドット等） | ✅ **SVGで書き出し → `upload_assets` でベクター取込**（編集可能なパスになる） |
| WebGL/Canvas 質感（惑星の球など、ベクター化不能） | 🖼 **2倍解像度のPNG**を書き出して差し込む |

SVG は `gradientUnits="userSpaceOnUse"` のグラデもそのまま保持される（手作業でノードを
作るより正確・速い）。惑星のように「表示◯◯px の 2倍のビットマップ」を用意すれば 2倍解像度になる。

---

## 1. 元グラフィックから数値・画像を吸い出す（ブラウザ）

`http://localhost:8776`（v3）などを開き、`javascript_tool` で：

1. **座標・グラデ**：楕円/円の `cx,cy,rx,ry`、`transform` の回転角、`stroke`、`stroke-width`、
   `linearGradient` の `gradientUnits/x1..y2/stops` を全部取得（実測。推測で埋めない）。
2. **ドット**：表示中の円の `cx,cy,r,fill` を列挙（表裏レイヤーの重複はデデュープ）。
3. **惑星画像**：`canvas.toDataURL('image/png')` で dataURL を取得（大きいので保存ファイル経由でOK）。
   canvas のビットマップが表示サイズの2倍あれば 2倍解像度。
4. **配置基準**：`viewBox`（例 `0 0 915.483 630`）と、惑星の viewBox 座標での位置・サイズ。

## 2. 1枚のSVGに「レイヤー順」で組む

惑星の前後関係（入れ子＝軌道の下半分が惑星の手前を通る）を **SVG のレイヤー順**で表現する：

```
<svg viewBox="0 0 915.483 630">
  <defs> …グラデ… <clipPath id="lowerHalf"><rect y=(惑星中心y) …/></clipPath> </defs>
  <!-- ①裏の軌道(全体) -->
  <ellipse … stroke="url(#gOuterF)"/> …
  <!-- ②惑星プレースホルダ(あとで2倍PNGを流し込む) -->
  <rect id="planet" x=… y=… width=… height=… fill="#D9D9D9"/>
  <!-- ③表(下半分)=惑星の手前を通る -->
  <g clip-path="url(#lowerHalf)"> <ellipse …/> … </g>
  <!-- ④ドット -->
  <circle …/> …
</svg>
```

`planet` の rect を挟んでおくのがミソ。取込後にこの rect の fill を惑星PNGに差し替えれば、
レイヤー順（裏軌道→惑星→表の下半分→ドット）がそのまま Figma に残る。

## 3. Figma に取り込む

1. `use_figma` で **出力先ページをカレントにする**（`setCurrentPageAsync`）。
2. `upload_assets`（count:1）で URL を取得 → **`curl` で SVG を POST**（Content-Type `image/svg+xml`）。
   SVG は編集可能なベクターツリー（FRAME＋VECTOR）として取り込まれる。返り値の `placedOnNodeId` を控える。
   ```bash
   curl -s -X POST "<submitUrl>" -F "file=@kv.svg;type=image/svg+xml;filename=KV-graphic.svg"
   ```
3. 取込ノードの構造を `use_figma` で確認し、`planet` プレースホルダの nodeId を特定。
4. `upload_assets`（count:1, `nodeIds:["<planet nodeId>"]`, `scaleMode:"FILL"`）で URL 取得 →
   惑星PNGを同様に `curl` POST。rect の塗りが画像に置き換わる。
5. レイヤー名を日本語で整理・ドットはグループ化しておく（あとで触りやすい）。

---

## 4. 🔴 セクションへ入れる時の最重要ルール（ここで毎回ハマった）

### (A) SECTION の子の `x`/`y` は「セクション原点からの相対座標」
ページ直下の子は**絶対座標**だが、**SECTION の子はセクション左上からの相対座標**になる。

- ❌ `frame.x = section.x + 中央寄せ`（絶対のつもり）→ 実際は `section.x` が二重に足されて
  **遥か遠く（右下）へ飛ぶ**。「セクション内にあるはずが変な場所」の正体はコレ。
- ✅ セクション内で中央に置くなら **相対座標**で：
  ```js
  frame.x = Math.round((section.width  - frame.width ) / 2);  // section.x は足さない！
  frame.y = Math.round((section.height - frame.height) / 2);
  ```

### (B) 置き方の順番（不可視バグ対策）
Figma のセクションは**幾何学的な位置**で中身を判定する。**範囲外で `appendChild` すると
描画に登録されず不可視**になり、カット&再ペーストするまで見えない。だから：

1. まず**相対座標で範囲内へ置く**（上の (A)）。
2. それから `section.appendChild(frame)`。
3. 入れ子セクション（例 v3.0 > Section 3）でも、範囲内なら内側セクションに所属する。

### (C) 検証は absoluteBoundingBox で
`frame.x` の生値では判断できない（相対だから）。必ず：
```js
const fb = frame.absoluteBoundingBox, sb = section.absoluteBoundingBox;
const inside = fb.x>=sb.x && fb.x+fb.width<=sb.x+sb.width && fb.y>=sb.y && fb.y+fb.height<=sb.y+sb.height;
```
で内外を確認。`frame.screenshot()` は枠だけ描画で常に見えるので不可視判定に使えない。
**`get_screenshot` でセクションを撮る**（ノードが範囲外だと巨大領域を描画してしまうので、
まともなセクション実寸で撮れたら正しく入っている合図）。

---

## 5. サイズ

原寸で置くと惑星が2倍でくっきり。大きくしたい時は軌道・ドット（ベクター）は無劣化だが、
**惑星PNGは拡大すると甘くなる**ので、その時は**惑星だけ高解像度で再書き出し**する。
サイズは見た目に出るので、決め打ちせず AskUserQuestion で聞く。

## 6. 実例

- ファイル: works（`jSLFEubHMoy3Hxgcw1AZuR`）／ページ Anyflow（`13951:13623`）
- 出力先: v3.0 > Section 3（`15900:38770`）に KVグラフィックを配置（2026-08-29）
- 関連メモリ: `reference-figma-section-invisible-bug`

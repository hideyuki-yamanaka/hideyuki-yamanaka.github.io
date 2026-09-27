# 🎨 Web → Figma 出力の手順（コード→デザイン）

> 📌 **何を守るか（決まり）は [RULES.md](RULES.md) の「★ 場面C」と「3. Figmaへ書き出す時」。この資料はその手順とハマり所です。**
> **Figmaに書き出す時は、着手前にこの資料を読む**（2026-09-27〜）。食い違ったら RULES.md を優先します。
> 組み方の決まりの要点: 基本はオートレイアウト（イラスト・アイコン・ロゴは無理にしない）／幅と高さは固定でなく Hug・Fill／数値は4と8の倍数／今の画面を測って作る。

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

---

## 7. ハマり所チェックリスト（書き出しの前後に見る）

2026-09-27 のルール仕分けで「ルール」から外れた、書き出しの技術メモをここに集めた。決まりではなく**手順の注意**として使う。［ ］は仕分け棚の元の番号。

- [ ] **作業するページを毎回指定する**。`use_figma` は毎回先頭ページに戻るので、操作の前に `setCurrentPageAsync` で対象ページに切り替える ［075］
- [ ] **セクションに入れる要素は、先に範囲の中へ置いてから入れる**（上の4章）。子の座標はセクション左上からの相対。範囲外で `appendChild` すると見えなくなる ［068］
- [ ] **一括削除は、必ず自分の親フレームの中で絞る**。ページ全体を文字で検索して消すと、別の版のラベルまで消える（実際に17個消した） ［070］
- [ ] **セクションの高さが伸びたら、下の要素も同じだけ下げ、外枠の高さも伸ばす** ［071］
- [ ] **`resize()` の後は Hug をかけ直す**。`resize()` すると固定サイズに戻るので、あとで `layoutSizingHorizontal` / `layoutSizingVertical = 'HUG'`（親いっぱいなら `'FILL'`）を設定し直す。絶対配置の子は、親に入れてから設定する ［073・RULES 3-3］
- [ ] **SF Pro Text は Figma で読めないので、SF Pro か Inter に置き換える**。幅のずれは字間で合わせ、行間は測った px で固定する ［076］
- [ ] **スクショを入れる時は、画像枠と同じ縦横比で撮る**（切り抜きゼロで入る） ［077］
- [ ] **書き出しで端が切れる時は、要素本来の範囲で書き出す**。`exportAsync` に `useAbsoluteBounds` を付けるか、一時的にクリップを外して後で戻す ［078］
- [ ] **Figmaにあるロゴ・SNSアイコン・メニューは、作り直さず複製して使う**（トンマナが完全に一致して速い） ［079］
- [ ] **Figmaに置く大きさは決め打ちせず聞く**（上の5章） ［080］
- [ ] **WebP は PNG にしてから入れる**（RULES 3-5） ［074］
- [ ] **行間と字間はパーセント（%）で入れる**（RULES 3-6）。`lineHeight: { unit: 'PERCENT', value: 行間px ÷ 文字サイズ × 100 }`、`letterSpacing: { unit: 'PERCENT', value: 字間px ÷ 文字サイズ × 100 }`（例：16px・行間24px → 150、字間0.32px → 2）。CSS の `em` の字間は ×100 がそのまま %
- [ ] **仕上げの点検（必ず・自動）**：書き出したフレームを下の 8章のスクリプトで検査し、結果の表を報告に載せる。オートレイアウトの枠に固定の幅・高さが残っていないか（アイコン・画像を除く）、余白・gap・角丸・文字サイズが4と8の倍数か、行間と字間が%か、線幅・影・ぼかし・不透明度・色に似た値が増えていないかを数える（RULES 3-2〜3-6・4-7・4-13）

---

## 8. 書き出した後の自動の点検（use_figma で流す）

書き出しが終わったら、出したフレームの ID を入れて `use_figma` でこれを流す（2026-09-27 に書いた版。まだ本物のファイルで流していないので、初めて使う時に動きを確かめて直す）。結果（決まりから外れた値・固定の大きさ・px の行間/字間・似た色）を表にして報告に載せる。
外れた値はその場で直す（今ある古いカンプは報告だけで直さない）。決まりは RULES.md 4-7：倍数が効くのは文字サイズ・サイズ・余白・角丸だけ（4と8の倍数・10px以下は2刻み・文字は14と18も可）。行間と字間は%なら倍数でなくてよい。線幅・影・ぼかし・不透明度は自由で、似た値だけ寄せる。

```js
const ROOT_ID = '書き出したフレームのID';
const root = await figma.getNodeByIdAsync(ROOT_ID);
let pg = root; while (pg && pg.type !== 'PAGE') pg = pg.parent;
if (pg) await figma.setCurrentPageAsync(pg);   /* use_figma は毎回先頭ページに戻るので、対象のページを指定する */
const grid = v => v === 0 || (v <= 10 && v % 2 === 0) || v % 4 === 0;
const okFont = v => grid(v) || v === 14 || v === 18;
const bad = [], fixed = [], unitNg = [], colors = new Map(), free = { 線幅: new Map(), 影: new Map(), ぼかし: new Map(), 不透明度: new Map() };
const count = (m, v) => m.set(Math.round(v * 100) / 100, (m.get(Math.round(v * 100) / 100) || 0) + 1);
const note = (n, what, v) => bad.push(`${n.name}（${n.id}）${what} ${Math.round(v * 100) / 100}`);
const isArt = n => ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'LINE', 'ELLIPSE', 'POLYGON'].includes(n.type) || /ロゴ|アイコン|イラスト|logo|icon/i.test(n.name);
root.findAll(() => true).concat(root).forEach(n => {
  if ('layoutMode' in n && n.layoutMode !== 'NONE') {
    ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing'].forEach(k => { if (!grid(n[k])) note(n, k, n[k]); });
    if (n.counterAxisSpacing != null && !grid(n.counterAxisSpacing)) note(n, 'counterAxisSpacing', n.counterAxisSpacing);
  }
  if ('layoutSizingHorizontal' in n && !isArt(n) && n.type !== 'TEXT' && !(n.fills || []).some?.(f => f.type === 'IMAGE')) {
    if (n.layoutSizingHorizontal === 'FIXED' || n.layoutSizingVertical === 'FIXED') fixed.push(`${n.name}（${n.id}）横=${n.layoutSizingHorizontal}・縦=${n.layoutSizingVertical}`);
  }
  if (typeof n.cornerRadius === 'number' && n.cornerRadius < 999 && !grid(n.cornerRadius)) note(n, '角丸', n.cornerRadius);
  /* 線幅・影・ぼかし・不透明度は自由（数えて、似た値のかたまりを見るだけ） */
  if (typeof n.strokeWeight === 'number' && (n.strokes || []).length) count(free.線幅, n.strokeWeight);
  (n.effects || []).forEach(e => { if (e.visible === false) return; if (e.type.includes('BLUR')) count(free.ぼかし, e.radius); else { count(free.影, e.radius); if (e.offset) { count(free.影, Math.abs(e.offset.x)); count(free.影, Math.abs(e.offset.y)); } } });
  if (typeof n.opacity === 'number' && n.opacity < 1) count(free.不透明度, n.opacity);
  if (n.type === 'TEXT') {
    const fs = n.fontSize, lh = n.lineHeight, ls = n.letterSpacing;
    if (typeof fs === 'number' && !okFont(fs)) note(n, '文字サイズ', fs);
    if (lh && lh.unit === 'PIXELS') unitNg.push(`${n.name}（${n.id}）行間がpx（${lh.value}）→ %に`);
    if (ls && ls.unit === 'PIXELS' && ls.value !== 0) unitNg.push(`${n.name}（${n.id}）字間がpx（${ls.value}）→ %に`);
  }
  (Array.isArray(n.fills) ? n.fills : []).forEach(f => { if (f.type === 'SOLID' && (f.opacity ?? 1) === 1) { const k = [f.color.r, f.color.g, f.color.b].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join(''); colors.set('#' + k, (colors.get('#' + k) || 0) + 1); } });
});
const 自由な値 = Object.fromEntries(Object.entries(free).map(([k, m]) => [k, [...m.entries()].sort((a, b) => a[0] - b[0])]));
return { 決まりから外れた値: bad, 固定の大きさ: fixed, pxの行間と字間: unitNg, 使っている色: [...colors.entries()].sort((a, b) => b[1] - a[1]), 自由な値: 自由な値 };
```

- 「使っている色」は、実装の色（`node settings/design-check/design-check.mjs <プロダクト>` の結果）と見比べて、実装に無い色・ほぼ同じ色が増えていないかを確かめる
- 固定の大きさは、アイコン・画像・イラスト・ロゴ以外で出たら、Hug か Fill にできないかを見る（限られた場面だけ固定・RULES 3-3）
- 「決まりから外れた値」と「自由な値」（線幅・影・ぼかし・不透明度）の近い値（例：影 22 と 24）は、見た目がほぼ変わらなければ自動で寄せて報告の表に書き、見た目が変わりそうな物は提案する（線引きは RULES.md 4-13 の表）


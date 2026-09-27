# スクロール事故の防止ルール（2026-08-23 ヒデさん制定）

> ⚠️ **2026-09-27 から、進め方の決まりの正は [RULES.md](RULES.md)。** この資料は詳細と経緯の参照用です。食い違ったら RULES.md を優先します。

> mock ページが「スクロールできない」事故が繰り返し起きたため制定。
> **コンテンツが1画面に収まらない可能性があるページ・領域には、必ずスクロールバーを設ける。**

## なぜ起きるか（原因はほぼ毎回これ）

演出のあるサイト（網走・Anyflow など）は、ページ全体を

```css
html, body { height: 100%; overflow: hidden; }
```

にして**独自のスクロール制御**（慣性スクロール・場面切替など）を持っていることが多い。
この構成のサイトに mock ページや新ページを普通に足すと、**ブラウザ標準のスクロールが
死んでいる**ので、1画面を超えた分が見えなくなる。

## ルール

1. **新しいページ・mock・一覧・モーダル・パネルを作る時は、必ず「はみ出したらどうするか」を決める。**
   コンテンツが増える可能性が少しでもあれば、その要素自身をスクロールコンテナにする：

   ```tsx
   // Tailwind の場合（mock ページの定番）
   <main className="h-screen overflow-y-auto">…</main>
   ```

   ```css
   /* 素の CSS の場合 */
   .page { height: 100vh; overflow-y: auto; overscroll-behavior: contain; }
   ```

2. **作ったら目視で済ませず実測する。** 渡す前に必ずこれを確認：

   ```js
   // スクロールコンテナで scrollHeight > clientHeight かつ実際に scrollTop が動くこと
   const el = document.querySelector('main');
   el.scrollTop = 99999;
   console.log(el.scrollHeight > el.clientHeight, el.scrollTop > 0); // 両方 true なら OK
   ```

3. **慣性スクロール（Lenis 等）採用サイトでは、独立スクロール領域に
   `data-lenis-prevent` を付ける**（ホイールを本体に持っていかれるため）。
   tune-panel.js は対応済み。

4. モーダル・ドロップダウン・調整パネルなど**高さ固定のUIは中身側を
   `overflow-y: auto` にする**（項目が増えても外寸を変えない）。

## この構成のプロジェクト（html/body が overflow: hidden）

| プロジェクト | 備考 |
|---|---|
| abashiri-site-v2 | 独自の慣性スクロール。mock は `h-screen overflow-y-auto` 必須 |
| abashiri-site (V1.0) | 同上 |
| anyflow-embed / -v2 | セクション演出あり。埋め込み前提 |

新しくこの構成のサイトを作ったら、この表に1行足すこと。

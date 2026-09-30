# anyflow-embed V5.0（作業版）

| | 中身 | 本番 URL |
|---|---|---|
| **V5.0** | このフォルダ | https://anyflow-embed-v5.vercel.app |

## ファイル構成（2026-09-26 に分割）

- `index.html` … HTML だけ
- `css/style.css` … 見た目（CSS）
- `js/parts/01〜07-*.js` … JavaScript（**直すのはここ**）
- `js/app.js` … ⚠️ 自動生成。`js/parts` を番号順につなげただけ（ブラウザはこれを読む）

**`js/parts` を直したら `./build.sh` を実行**（`js/app.js` を作り直す）。
焼き込み値は `js/parts/02-shipped.js`。詳しくは
[settings/docs/anyflow/V5-FILES.md](../../settings/docs/anyflow/V5-FILES.md)。

## デプロイ

```bash
./build.sh && grep projectName .vercel/project.json && npx vercel --prod --yes
```

`projectName` が `anyflow-embed-v5` であることを必ず確認（他のバージョンを上書きしないため）。
`../deploy-v5.sh` は `./build.sh` を自動で実行してから上げる。

## 公開するにあたって（公開前に必ずやること）

このサイトはいま「たたき台」として公開しています。検索に出さない設定と、デザイン調整の道具が入った状態です。
正式に公開する前に、下の **1〜3 は必ず**、4〜5 はできれば行ってください（2026-09-30 に書いた内容）。

### 1. 調整パネルを出さないようにする【必須】

- **いま**：最初は隠れていますが、画面の右下（PC は 100px 角・スマホは 72px 角）の**透明な箱を押すと「調整パネル」が出ます**。見た人が偶然押すと出てしまいます。
- **やること**：`css/style.css` のいちばん最後に、次の2行を足します（パネルと、それを出す透明な箱の両方を消します）。

  ```css
  /* 公開版: 調整パネルと、それを出す右下の透明な箱を出さない */
  .tools, .tools-secret-hot { display: none !important; }
  ```

- 見た目は変わりません。パネルで決めた数値は、`js/parts/02-shipped.js` に焼き込み済みです。
- ✏️編集モード（文字や位置をドラッグで動かす道具）は、パネルの中からしか入れません。なので、これで一緒に出なくなります。
- **確かめ方**：本番を PC とスマホで開き、右下の角を押しても何も出ないこと。

### 2. 検索エンジンに出す設定に戻す【必須】

いまは「検索に出さない」設定が **4つのファイル・5か所** にあります。全部そろえて外します（1か所でも残ると検索に出ません）。

| ファイル | いまの設定 | 公開する時 |
|---|---|---|
| `index.html`（8行目） | `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` | 行ごと消す |
| `index.html`（9行目） | `<meta name="googlebot" content="noindex, nofollow">` | 行ごと消す |
| `contact.html`（7行目） | `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">` | 行ごと消す |
| `vercel.json` | いちばん上のまとまり（`"source": "/(.*)"` の `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`） | そのまとまりだけ消す（下のキャッシュの設定は残す） |
| `robots.txt` | `Disallow: /`（全部のページを拒否） | `Allow: /` に書き換える。サイトマップを作ったら `Sitemap: https://〈本番のドメイン〉/sitemap.xml` も足す |

**確かめ方**

- `curl -I https://〈本番のドメイン〉/` の結果に `X-Robots-Tag` が無いこと
- トップとお問い合わせページのソースに `noindex` が無いこと
- `https://〈本番のドメイン〉/robots.txt` が `Allow: /` になっていること
- Google Search Console の「URL 検査」で、インデックスに登録できると出ること

### 3. トップのお問い合わせフォームを、本物の送り先につなぐ【必須】

- **いま**：トップページの下にある「お問い合わせ」のフォームは、見た目だけの作りです（`index.html` の `<form class="cv-form" … onsubmit="return false;">`）。**「送信する」を押しても、どこにも送られません。**
- 別ページのお問い合わせ（`contact.html`）は、HubSpot の本物のフォームです（portalId `47236172`・formId `6db15437-1dd9-4e3b-b562-6f6f323e42a8`・region `na1`）。
- **やること**（どれにするかは相談して決める）
  - A. トップのフォームの送信を、HubSpot へ送る（contact.html と同じフォームへ）
  - B. トップのフォームを「お問い合わせページへ進む」ボタン（`/contact.html` へ）に置き換える
  - C. トップにも HubSpot のフォームをそのまま埋め込む
- **確かめ方**：本番のドメインから実際に送信して、HubSpot に届くこと（トップ・お問い合わせページの両方）。

### 4. 本番のドメインと、リンクを共有した時の見え方【できれば】

- **ドメイン**：いまは `anyflow-embed-v5.vercel.app` です。Vercel の Project → Settings → Domains で、正式なドメインをつなぎます。
- **共有した時の見え方**：`index.html` には `<title>` しかありません。公開前に次を足すと、SNS やチャットにリンクを貼った時にきれいに出ます。
  - `<meta name="description">`（お問い合わせページにはあり）
  - OGP（`og:title`・`og:description`・`og:image`・`og:url`）と `twitter:card`
  - `<link rel="canonical">` とファビコン（`<link rel="icon">`）
- **アクセス解析**（Google アナリティクスなど）は、いま入っていません。必要なら入れます。

### 5. 表示の速さのための設定【できれば】

- `vercel.json` で、トップ（`/` と `/index.html`）を「保存しない（no-store）」にしています。デザイン調整の間、直した物がすぐ見えるようにするためです。
- 公開後にこのまとまりを外すと、Vercel のふつうのキャッシュになり、2回目からの表示が速くなります。
- `js/`・`css/` は「毎回新しいか確かめる」設定なので、そのままでも古い物は出ません。

### 何もしなくてよい物（確認だけ）

- **スマホの実機への同期**（右下の📱ボタン・`?live=phone`）：手元のパソコン（localhost）と社内の Wi-Fi の住所の時だけ動く作りです。本番では自動で止まります。
- `tools/`・`js/parts/`・`build.sh`・`README.md` は、本番に上げない設定です（`.vercelignore`）。
- **比べる用の URL の合図**（`?ds=low|mid|high`・`?prodsim=1`）：付けなければ何も起きません。
- **数値を後から変えた時**は、`js/parts/02-shipped.js` の `SHIPPED_GENERATION` の数字も上げてください。前に同じブラウザで調整パネルを触った人にも、新しい値が届くようにするためです。

### 公開した後の確認（PC とスマホの両方）

1. トップとお問い合わせページが開き、エラーが出ていない（ブラウザの開発ツールのコンソール）
2. 右下の角を押しても、調整パネルが出ない
3. 検索の設定が外れている（上の 2 の確かめ方）
4. お問い合わせを実際に送って、HubSpot に届く

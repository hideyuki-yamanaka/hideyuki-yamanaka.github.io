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

## 検索エンジン

`robots.txt` と `vercel.json` の `X-Robots-Tag` と `index.html` の noindex メタで全クローラーを拒否。
公開する時は3つ一緒に外す。

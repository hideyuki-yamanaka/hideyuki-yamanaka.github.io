# スマホモード（実機ライブ同期）— プロダクト共通の単一ソース

PC で調整パネルの値を変えると、**同じ Wi‑Fi のスマホ実機プレビューにリアルタイムで反映**される仕組み。スマホは QR を読むだけ。SP レスポンシブを詰めるための道具。**このフォルダが全プロダクト共通の「正」**（＝ここを更新すれば、以後どのプロダクトにも最新版を入れられる）。

> 詳しい思想・運用ルールは [settings/docs/general/PHONE-MODE.md](../../docs/general/PHONE-MODE.md)。実装済みの参考実装は anyflow V5.0（`anyflow/v5/index.html` 末尾の `phoneMode()`／`anyflow/v5/tools/live-sync.mjs`）。

## 中身

| ファイル | 役割 |
|---|---|
| `server.mjs` | 中継サーバ（Node・依存 `qrcode` のみ）。`POST /push`（PC→設定）／`GET /events`（SSE→スマホ）／`GET /qr`／`GET /ip`。**プロダクト非依存**（設定JSONを不透明なまま中継）。 |
| `phone-mode.client.js` | 本体ページに読ませる汎用クライアント。`window.PHONE_MODE_CONFIG` で設定。`?live=phone`＝スマホ受信、それ以外＝PC（ボタン＋QR＋同期＋スマホモード表示）。 |
| `package.json` | 依存（qrcode）。`node_modules` は `.gitignore`。 |

## 他プロダクトへの入れ方（3 ステップ）

1. **本体ページを LAN 公開**で配信する（`0.0.0.0` バインド）。多くは既存の dev サーバでOK。スマホは `http://<PCのLAN-IP>:<PAGE_PORT>/` で最新版を開ける。
2. **本体ページの末尾**（調整パネルより後）に設定＋クライアントを読む:
   ```html
   <script>
     window.PHONE_MODE_CONFIG = {
       syncPort: 8779,
       storageKeys: ['<app>-settings-key'],   // 調整値を入れている localStorage キー(複数可)
       saveFnName: 'save',                     // 保存関数名(あればラップして保存時に配信)
       panelSel: '#panel',
       headBtnSel: '#panelPhoneBtn',           // 無ければ右下にFABが出る
       bannerBeforeSel: '#panelBody',
       fontRowSel: '.txt-row',                 // (任意)レスポンシブ値をオレンジで示す行
       rowElOf: function (row) { var l = row.querySelector('label'); return l && l.title; },
       shippedGenKey: '<app>-shipped-gen',     // (任意)焼き込み世代ガード対策
       theme: 'orange'
     };
   </script>
   <script src="phone-mode.client.js"></script>
   ```
   （`phone-mode.client.js` は本体が配信するフォルダにコピーして置く。ページと同じ origin で読めればOK。）
3. **中継サーバを起動**（一度だけ・ターミナル）:
   ```bash
   cd settings/tune-panel/phone-mode && (test -d node_modules || npm install) && PAGE_PORT=<本体ページのポート> SYNC_PORT=8779 node server.mjs
   ```
   ターミナルとPC画面の「📱 スマホモード」ボタンに QR が出る。スマホで読む → PCで「同期を開始」→ 保存のたびにスマホが更新。

## 使い勝手（UX）

- 「📱 スマホモード」ボタン **1 押しでスマホモードON＋QR表示**、もう1押しでQRの開閉（モードは継続）。ポップアップの「スマホモード終了」で解除。
- スマホモード中は **STUDIO 風のオレンジ**にUIが変わり、上部に帯「スマホモード：この画面の調整がスマホに反映されます」。
- `fontRowSel`/`rowElOf` を渡すと、`@media(max-width:600px)` や `html.mb` で**文字プロパティを上書きしている＝レスポンシブで値が変わる行**を**オレンジで印**（行名に ● ＋ 変わった入力欄がオレンジ）。各入力に `data-prop`（font-size / font-weight / line-height / letter-spacing）を付けておくと入力単位で光る。

## ハマりどころ（実測・2026-09-19）

- **`fetch(..., { keepalive:true })` は本体 64KB 制限**。設定JSONが大きい（anyflow は ~180KB）と keepalive だと**無言で失敗**して届かない → keepalive は付けない。
- スマホ側は `localStorage` に書いて**リロード**で反映（全 apply を漏れなく通すのが安全）。スクロール位置は `sessionStorage` で維持。ちらつきは保存デバウンス後に1回だけ。
- スマホは LAN‑IP＝非ローカル扱いなので、焼き込み世代ガードがあるプロダクトは `shippedGenKey` を渡す（受信時に最大値へ）。
- 本番（vercel 等）では自動で無効（`isDev` 判定）。

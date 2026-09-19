# スマホモード（実機ライブ同期）— 全プロダクト共通の標準機能

**調整パネルを持つプロダクトには、原則この「スマホモード」を入れる**（2026-09-19 ヒデさん指定）。PC で数値をいじると、同じ Wi‑Fi のスマホ実機プレビューにリアルタイム反映され、SP レスポンシブを実機で詰められる。

## この MD の位置づけ（＝つねに最新に保つやり方）

- **substance（実体）はコードにある**。この MD はコードを指すだけの薄いガイド。だから**ブラッシュアップしてもこの MD は古びない**（コードが唯一の正）。
- **正（単一ソース）**: [`settings/tune-panel/phone-mode/`](../../tune-panel/phone-mode/)
  - `server.mjs` … 中継サーバ（プロダクト非依存）
  - `phone-mode.client.js` … 本体ページに読ませる汎用クライアント（`window.PHONE_MODE_CONFIG` で設定）
  - `README.md` … 入れ方（3 ステップ）と UX とハマりどころ
- **参考実装（リファレンス）**: anyflow V5.0 — `anyflow/v5/index.html` 末尾の `phoneMode()` と `anyflow/v5/tools/live-sync.mjs`。
- **更新ルール**: スマホモードを直す時は **まず `settings/tune-panel/phone-mode/` を直す**（＝単一ソース）。各プロダクトはそこからコピーして使う。anyflow は歴史的にインライン実装なので、共通版に寄せた変更は両方に入れる。

## 何ができるか（要点）

- スマホは **QR を読むだけ**で「同期プレビュー（`?live=phone`）」が開く。調整パネルは出ず、プレビュー専用。
- PC は調整パネルの「📱 スマホモード」ボタンで **1 押しON＋QR**、もう1押しでQR開閉、ポップアップの「終了」で解除。
- 同期中は **STUDIO 風オレンジ**にUIが変わり、上部に帯が出る（＝いま実機に反映される、が直感的に分かる）。
- `@media(max-width:600px)` / `html.mb` で**文字プロパティを上書き＝レスポンシブで値が変わる行**を**オレンジで印**（STUDIO のモバイル編集風）。

## 仕組み（1 行ずつ）

1. 本体ページは **LAN 公開**（`0.0.0.0`）で配信 → スマホは `http://<LAN-IP>:<PAGE_PORT>/` で最新版を直接開ける。
2. 中継サーバ（`SYNC_PORT`）が **`POST /push`（PC→設定）**を **`GET /events`（SSE→スマホ）**へ中継。QR は `GET /qr`、LAN‑IP は `GET /ip`。
3. クライアントは `?live=phone` なら受信して `localStorage` に書き→**リロード**で反映（スクロール位置は保持）。PC 側は `save()` をラップして**保存のたびに配信**。

## 入れ方・つまづき

[`settings/tune-panel/phone-mode/README.md`](../../tune-panel/phone-mode/README.md) に集約（config・起動コマンド・keepalive 64KB 罠・焼き込み世代ガード・本番無効化など）。anyflow の起動は:

```bash
cd "anyflow/v5/tools" && (test -d node_modules || npm install) && node live-sync.mjs
```

他プロダクトは共通版で:

```bash
cd settings/tune-panel/phone-mode && (test -d node_modules || npm install) && PAGE_PORT=<本体のポート> node server.mjs
```

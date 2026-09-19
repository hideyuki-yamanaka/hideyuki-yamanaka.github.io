# anyflow V5.0 スマホ実機ライブ同期（PC で調整 → スマホに即反映）

2026-09-19 ヒデさん依頼。スマホでレスポンシブを詰める時、**PC で数値をいじると同じ Wi‑Fi のスマホ実機プレビューがリアルタイムで変わる**仕組み。スマホは QR を読むだけ。

## 使い方（3 ステップ）

1. **中継サーバを起動**（ターミナルで一度だけ。`.claude/launch.json` の `anyflow-live-sync` でも可）
   ```bash
   cd "/Users/hideyuki/Developer/Claude Code/anyflow/v5/tools" && (test -d node_modules || npm install) && node live-sync.mjs
   ```
   起動すると**ターミナルに QR が出る**。スマホURLも表示される（例 `http://172.16.15.153:8778/?live=phone`）。

2. **スマホで QR を読む**（PC と同じ Wi‑Fi 必須）。パネルは出ず、プレビュー専用になる。左下に「📱 PCと同期中」。
   - QR は、ターミナル／または 調整パネル**ヘッダーの「📱 スマホ実機」ボタン**のポップアップにも出る。

3. **PC で調整**：`http://localhost:8778/` を普通に開いて左下の **📱 ボタン → 「同期を開始」**。
   以降、**調整パネルで値を変えて保存が走るたび**（0.8 秒の自動保存）に、その設定がスマホへ送られてスマホが最新表示に更新される（スクロール位置は保たれる）。

## 仕組み

- 本体ページは既存の **8778（`anyflow/nocache_server.py`）が LAN 公開**（`*:8778`）で配信。スマホは PC の LAN‑IP:8778 で最新版を直接開ける。
- 中継サーバ **8779**（`anyflow/v5/tools/live-sync.mjs`・Node、依存は `qrcode` のみ）が担うのは 3 つだけ：
  - `POST /push` … PC が保存のたびに設定（`localStorage` の `anyflow-embed-anim-v81` と `anyflow-gfx-presets`）を投げる
  - `GET /events`（SSE）… スマホが受け取り、保存し直してリロード
  - `GET /qr` / `GET /ip` … QR(SVG) と LAN‑IP を返す
- ページ側（`index.html` 末尾の `liveSync()` IIFE）:
  - `?live=phone` … スマホ。受信→`localStorage` へ書く→短いデバウンスでリロード。焼き込み世代ガードに勝つよう `anyflow-shipped-gen` も最大値にする（LAN‑IP は非ローカル扱いなので必要）。
  - PC（`?live` 無し）… 左下 📱 ボタン。`save()` をラップして「保存→送信」。**開発（localhost / 10. / 192.168. / 172.16–31.）でだけ**動き、本番（vercel）では何も出さない。

## ハマりどころ（実測）

- **`fetch(..., { keepalive:true })` は本体 64KB 制限**。anyflow の設定 JSON は ~180KB なので keepalive だと**無言で失敗**して届かない → keepalive は付けない（2026-09-19 に丸半日相当ハマった箇所）。
- スマホ側は `localStorage` に書いて**リロード**で反映（全 apply 関数を漏れなく呼ぶのが安全なため）。リロードのちらつきは保存デバウンス（0.8 秒）後に 1 回だけなので実用上気にならない。スクロール位置は `sessionStorage` で維持。
- `node_modules` は `.gitignore`。初回だけ `npm install`（launch.json の起動コマンドが自動で入れる）。

## ファイル

- `anyflow/v5/tools/live-sync.mjs` … 中継サーバ
- `anyflow/v5/tools/package.json` … 依存（qrcode）
- `anyflow/v5/index.html` 末尾 … ページ側 `liveSync()`
- `.claude/launch.json` の `anyflow-live-sync` … 起動設定（port 8779）

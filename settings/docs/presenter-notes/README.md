# カンペ連動プレゼン（presenter-notes）— セットアップ＆運用

Figma のスライドを見せながら、手元の「カンペ（トークスクリプト）」を
**ページ送りに連動**させて出すツール。**Chrome のタブを切り替えて**スライドと
ウェブサイトを行き来しながらプレゼンでき、カンペは共有されない別ウィンドウに出る。

- コード: [`presenter-notes/v1/`](../../../presenter-notes/v1/)（依存ゼロの静的HTML）
- 本番URL: **https://presenter-notes-seven.vercel.app**
- Vercel プロジェクト: `presenter-notes`（CLI 手動デプロイ・Git連携なし）
- ローカル確認: `http://localhost:8780`（`.claude/launch.json` の `presenter-notes`）

## 仕組み（なぜ連動できるか）

1. **スライドのタブ**（`present.html`）が Figma プロトタイプを `embed.figma.com` で埋め込む
2. Figma が **`PRESENTED_NODE_CHANGED`**（今このフレームに来た、というイベント）を postMessage で送る
3. そのページID(nodeId)を **`BroadcastChannel`**（同一PC・同一オリジンの別ウィンドウ/タブ間通信）で
   **カンペウィンドウ** `notes.html` へ飛ばし、対応する原稿を表示
4. 設定・原稿は `localStorage`（オリジン単位）に保存

> 🔑 **Figma のイベント送受信には OAuth アプリの `client-id` が必須**（無いと postMessage が一切飛ばない・実測確定）。
> **client-id とオリジン登録はアカウントに1回だけ**。デッキ（プレゼン）や Figma ファイルには依存せず**永久に使い回す**。
>
> 🔑🔑 **送信コマンド（親→iframe）は `targetOrigin: '*'` でないと効かない**（最重要ハマり・実測）。
> `NAVIGATE_FORWARD` / `NAVIGATE_BACKWARD` / `NAVIGATE_TO_FRAME_AND_CLOSE_OVERLAYS`（data:`{nodeId:"a:b"}`）を
> `embed.figma.com`（iframe の src origin）宛に送ると**黙って無視される**。`'*'` 宛なら動く。受信は client-id だけで動く。
> OAuth アプリは **Draft のままで送受信とも動作**（publish 不要）。

## 発表者ビュー（カンペ側にプレビュー＋双方向操作）

カンペ（`notes.html`）は Figma Slides の発表者ビュー風：**左=スライドのプレビュー**（同じ
プロトを埋め込み・`pointer-events:none` で操作不可）＋**右=原稿**＋**下=◀戻る/送る▶**。

- **共有スライド（`present.html`）が“真実の元”**。カンペの「送る」→ BroadcastChannel `{nav}` →
  present が `NAVIGATE_FORWARD` を Figma へ（`'*'`）→ present が `PRESENTED_NODE_CHANGED` 発火 →
  `{node}` を配信 → カンペがプレビューを `NAVIGATE_TO_FRAME` で追従＋原稿更新。
- **双方向**：present を直接送ってもカンペが追従。ループはプレビューが present の `node` のみで動く設計で防止。
- カンペが後から開いても、`notes-ready` → present が現在ノードを再送して同期。
- **直接編集**：右下「✎ このページを編集」→ その場で見出し＋原稿を書いて「保存」（Figma Slides の Edit 風）。
  Cmd/Ctrl+Enter で保存・Esc でキャンセル。保存はアクティブデッキの `card[currentId]` へ（`scripts-updated` で設定ページにも即反映）。
- **Figma フッター（ロゴ/ファイル名/Edited）は非表示**：埋め込みURLに `footer=false`（present/notes 両方）。残る `<1/42>` は Figma のページナビ。
- ⚠️ `hidden` 属性は `.btn`/`.notes-edit` の display 指定に負けるため、style.css 先頭に `[hidden]{display:none!important}` が必須。

## 複数プレゼン（デッキ）

- `localStorage` の `pn_decks` に **{name, url(Figmaプロト), scripts(原稿)} を何個でも**保存。
- 設定ページ上部の「🎬 プレゼン（デッキ）を選ぶ」で切替・追加・名前変更・削除。
- **新しいプレゼン = 「＋新規プレゼン」→ URL貼る→収録だけ。Figma側の設定はやり直し不要。**
- 旧バージョン（1組だけ持っていた `pn_url`/`pn_scripts`）は初回ロードで自動的に「プレゼン1」へ移行。
- `present.html`/`notes.html` は**アクティブなデッキ**を見る。切替時は BroadcastChannel の
  `deck-changed` で present が reload・notes がリセット。

## Figma 側の設定（1回だけ・設定済み）

- OAuth アプリ「**カンペ連動**」（オーナー Hideyuki Yamanaka / どさんこデザイン / Status: Draft でも動く）
  - 作成: https://www.figma.com/developers/apps →「Create a new app」
- **Client ID: `ozsIuuW15ekd1Vek1gKbVe`**（公開情報。Secret 未使用）
- Embed API →「Add an embed origin」に登録済み:
  - `http://localhost:8780`（ローカル）/ `https://presenter-notes-seven.vercel.app`（本番）
  - ⚠️ **別URLで開くならそのオリジンを追加登録**しないとイベントが飛ばない

## アイコン（2026-09-09 刷新・案A ライン）

以前は `⚙ ◧ ▤ 🔗 ↻ ▶ ✎ ⋯ ＋ ‹ ›` を **文字のまま** ボタンに置いていた。
文字だと太さが揃わない・24pxグリッドに乗らずボケる・OSごとに形が変わる・
ベースラインで上下がズレる、が同時に起きる。**視認性の問題はほぼ全部これが原因。**

- 定義は [`presenter-notes/v1/icons.js`](../../../presenter-notes/v1/icons.js) に集約（24×24 / 線1.75px / 角丸）
- 静的HTML → `<span data-ic="settings"></span>`（読み込み時に自動でSVGへ差し替え）
- JSで組む → `PNI.svg('more', 18)`
- 色は `currentColor`。ボタンが青くなればアイコンも白く追従する
- **見分けの要**：`panelLeft`（スライド一覧）＝枠の**左**に柱／`notes`（トークスクリプト）＝枠の**下**に帯。
  塗る位置を左右逆にしてあるので、16pxでもシルエットで区別できる
- 3案（ライン／ソリッド／ボールド）の比較モックは `presenter-notes/v1/mock/icons/`。
  採用は**案A ライン**。他案は比較用に残してある

## 3画面の役割

| 画面 | ファイル | 開き方 | 役割 |
|---|---|---|---|
| 作成 | `index.html` | 最初に開くタブ | **Figma Slides 風**の作成UI。① ギャラリー（プレゼンのカード一覧）② エディタ（左=ページ一覧／中央=スライド／下=原稿・自動保存）。client-id は⚙モーダル |
| スライド | `present.html` | 「スライドを開く」= **同じChrome内の新しいタブ** | Figma 埋め込み。他サイトのタブと切替可 |
| カンペ | `notes.html` | 「カンペを開く」= **別ウィンドウ** | 共有しない。発表者ビュー（スライドプレビュー＋原稿＋送りボタン）・文字サイズ A＋/A− |

## 使い方

### A. 準備・原稿づくり（作成UI）
1. 本番URLを開く（＝ギャラリー）。初回は ⚙ から client-id を設定。
2. 「＋ 新規プレゼン」→ 名前 → エディタが開く → 「🔗URL」で Figma プロト共有URLを貼る。
3. エディタで**スライドを「次へ」で送りながら、下のトークスクリプト欄に原稿を書く**（自動保存）。
   送るたびに左のページ一覧が増える。ページ一覧クリックで飛べる。

### B. 本番（Chrome タブ切り替え式）
1. エディタ右上「▶ 本番を開始（2画面）」→ **スライド（新タブ）** と **カンペ（別ウィンドウ）** が開く。
2. 共有する Chrome ウィンドウ … タブ①スライド ＋ タブ②③見せたいウェブサイト（タブ切替で行き来）。
3. カンペ（発表者ビュー：スライドプレビュー＋原稿＋送りボタン）は共有ウィンドウの外へ（裏/サブ画面/iPad）。
4. 画面共有は **「画面全体」ではなく「Chrome ウィンドウ」を選ぶ** → 全タブが映り、カンペ別ウィンドウは映らない（モニター1枚でOK）。
5. スライドを送る（Figma直接・カンペの送るボタン・キーボード←→）→ カンペが連動。右上 A＋/A− で文字サイズ。

## 🔴 実運用の必須注意

- 画面共有は **「Chrome ウィンドウ」** を選ぶ（「画面全体」だとカンペ別ウィンドウも映る）。
- **カンペは共有する Chrome ウィンドウに入れない**（別ウィンドウのまま裏やサブ画面へ）。
- スライドタブを**表示している間だけ** Figma はイベントを出す（他タブに切替中は一時停止するが、
  戻れば再開。切替中は原稿も最後のページのまま待機＝正常）。
- `localStorage` は**オリジン単位**。localhost と Vercel は設定・原稿を共有しない。

## デプロイ（更新のしかた）

Git 連携なし。更新したら手動で:

```bash
cd "/Users/hideyuki/Developer/Claude Code/presenter-notes/v1" && npx vercel --prod --yes
```

- デプロイ前に `cat .vercel/project.json` で `projectName: presenter-notes` を確認
- 別ドメインで開くなら Figma アプリの embed origin にそのオリジンを追加

## 検証済み（2026-09-02・実Chrome / localhost / Vercel）

- Figma 埋め込み表示（リンク共有ONで未ログインでも可）✅
- client-id 設定後 `INITIAL_LOAD` / `PRESENTED_NODE_CHANGED` 受信 ✅（localhost・Vercel 両方）
- 発表 → カンペへ BroadcastChannel → ページ番号描画 ✅
- **送信コマンド（`'*'` 宛）**: `NAVIGATE_FORWARD` でスライド前進（1/42→2/42）✅ / `NAVIGATE_TO_FRAME` でジャンプ ✅
- **カンペの「送る」→ 共有スライド前進**（BroadcastChannel 経由の全経路）✅
- 複数デッキが URL・原稿ともに独立 ✅ / 旧データの自動移行 ✅
- 文字サイズ A＋/A−（40→48→44px 保存）✅

## 今後やるなら（未実装）

- **カンペをスマホ/iPadで見る**（＝画面全体共有でも隠す）には、別端末同期の中継サーバーが必要
  （Supabase Realtime / Upstash 等）。2026-09-02 時点は「Chrome ウィンドウ共有」で運用する方針。

## Notion バックアップ（2026-09-11・自動リアルタイム同期）

ツールが動かない時の保険として、トークスクリプトを Notion の1ページへ自動保存する。

- 仕組み：ブラウザ →`/api/notion`（Vercelサーバー関数）→ Notion API。Notion はブラウザから直接書けない（CORS＋鍵）ため中継する。
- `presenter-notes/v1/api/notion.js`：受け取った原稿でページを毎回作り直し最新に保つ。太字は Notion の bold に反映。ページID は URL でも ID でも抽出。
- `presenter-notes/v1/notionsync.js`：原稿HTML→太字つき文字列片へ変換、編集の4秒後にまとめてPOST。閉じる/裏に回る直前にも送る。
- 保存キー：`pn_notion_token`（全体）＋ deck ごとの `notionPage`。
- 設定は⚙モーダルの「③ Notionバックアップ」。Notionトークンはブラウザ内のみ保存し、サーバーは転送だけで保存しない。
- 利用の前提（ユーザー操作）：① Notionで内部インテグレーション作成→トークン取得 ② バックアップ先ページの「•••›接続」で連携を追加 ③ ⚙にトークンとページURLを保存。
- 本番の疎通確認：`curl -X POST .../api/notion -d '{}'` → 400（トークン未設定）が正常。

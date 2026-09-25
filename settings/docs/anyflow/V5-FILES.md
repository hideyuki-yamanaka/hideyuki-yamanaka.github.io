# anyflow V5.0 のファイル構成と直し方（2026-09-26 整理D〜）

2026-09-26 に不要なコード・データを整理（A/B）し、20,907行あった `index.html` を分割（D）した。
**どこを直すか・焼き込み・デプロイの手順が変わった**ので、作業前にここを読むこと。

## ファイルの地図（`anyflow/v5/`）

| ファイル | 中身 | 直したら |
|---|---|---|
| `index.html` | HTML だけ（約600行）。CSS と JS は下のファイルを読み込む | そのままでOK |
| `css/style.css` | 見た目（CSS）全部。旧 `index.html` の `<style>` | そのままでOK |
| `js/parts/01-settings.js` | 軌道データ・惑星デザイン・演出の案の一覧・既定値 `DEFAULTS` | `./build.sh` |
| `js/parts/02-shipped.js` | **焼き込み値だけ**（`SHIPPED_PRESETS` / `SHIPPED_PRESET_STATE` / `SHIPPED_SETTINGS` / `SHIPPED_FLAGS` / `SHIPPED_GENERATION`） | `./build.sh` |
| `js/parts/03-base.js` | 保存と読み込み（`loadParams`/`load`）・ドット・軌道・お問い合わせの案・背景 | `./build.sh` |
| `js/parts/04-kv-motion.js` | KV の集約アニメ・案ごとのグラフィック・エコー・ケージ・直接編集 | `./build.sh` |
| `js/parts/05-edit-scroll.js` | 頂点編集・編集モード・スクロール連動セクション・ビジョン | `./build.sh` |
| `js/parts/06-sections.js` | 開発者体験・リプレイ・球体・慣性スクロール・実績のピクト | `./build.sh` |
| `js/parts/07-panel.js` | KV のバリエーション・上書きの控え・調整パネル（`buildPanel`） | `./build.sh` |
| `js/app.js` | ⚠️ **自動生成**。上の7つを番号順につなげただけ。ブラウザが読むのはこれ1本 | 直接編集しない |
| `build.sh` | `js/parts` → `js/app.js` を作る。`--check` で最新か確認 | — |

- どのファイルも 4,000 行以下（CLAUDE.md の分割ルール）。いちばん大きいのは `07-panel.js`（約2,900行）。
- **JS を7本のまま読み込ませない理由**: ファイルを分けて `<script>` を並べると、ファイルとファイルの間で
  タイマー・アニメのコマ・Promise の続きが先に動き、まだ読み込まれていない関数を呼ぶ事故が起き得る
  （実測で、ファイル5で予約した処理がファイル7の関数を使う所が5か所あった）。つなげた1本なら、
  分割前の1本の `<script>` と1文字も違わない＝動き方も同じ。

## 直し方

```bash
cd "/Users/hideyuki/Developer/Claude Code/anyflow/v5"
./build.sh          # js/parts を直したら必ず。構文エラーならここで止まる
./build.sh --check  # js/app.js が最新か確かめるだけ
```

- ローカル確認（http://localhost:8778）はキャッシュしない設定なので、`./build.sh` のあと再読み込みすれば反映される。
- `js/app.js` を直接直しても、次の `./build.sh` で消える。必ず `js/parts` 側を直す。
- 自動保存（Auto-save のコミット）は `js/parts` と `js/app.js` の両方を拾う。両方がそろっている状態でコミットすること。

## 焼き込み（Desktop の anyflow-settings.json を本番の初期値にする）

- 書き換える場所は **`js/parts/02-shipped.js` だけ**（旧: `index.html` の中）。書き換えたら `./build.sh`。
- `SHIPPED_SETTINGS` には **`gfxVarOverride` を入れない**。同じ中身が `SHIPPED_PRESET_STATE.over` にあり、
  読み込み時（`load()`）に必ずそちらで上書きされるため（2026-09-26 に重複 37KB を削除）。
- 変わりやすい見た目を焼いた時は、これまでどおり `SHIPPED_GENERATION` を上げる。

## デプロイ

- `anyflow/deploy-v5.sh` は、上げる前に `./build.sh` を自動で実行する（失敗したら上げない）。
- 手で上げる時:

```bash
cd "/Users/hideyuki/Developer/Claude Code/anyflow/v5" && ./build.sh && grep projectName .vercel/project.json && npx vercel --prod --yes
```

- `js/parts/` と `build.sh` は `.vercelignore` で本番に上げない（配るのは `js/app.js` だけ）。
- `vercel.json` で `/js/` と `/css/` は毎回「新しいか」確認させる設定（デプロイ直後に古い版が残らない）。

## 2026-09-26 の整理で消したもの（戻す時は git 履歴から）

| 何を | 大きさ | コミット |
|---|---|---|
| 旧KV（iframe の `kv/` 一式）・迷子フォルダ `undefined/`・未使用画像14個・`_backup/` | 約3.6MB | 0c5fd8e7 |
| 実績の演出で完全削除した案の CSS | 92KB | 41827b68 |
| 実績の演出の動き（`resFxFrame` 737行→106行・24-4/26 だけ残す） | 48KB | 6c1830e9（Auto-save に同梱） |
| 実績の演出の残り＋どこからも使われていない処理 69件 | 58KB | 63cac71c |
| ピクトの完全削除した案 40案・一度だけ動く引っ越し処理 55件 | 80KB | 51097256 |
| ほかの完全削除した案の定義/CSS・焼き込みの重複と不要値 | 62KB | cbc242d0 |

**あえて残したもの**: KV の動きの案の定義（選択が「何番目か」で保存されているので、消すと番号がずれて選択中の案が変わる）／
フォームのスタイル案の CSS（URL `?fstyle=` で呼べる経路がある）／`SHIPPED_PRESETS`（昇格した案の土台として使用中）。

# このリポジトリの運用ルール

ユーザーは非エンジニアのデザイナー（ヒデさん）。Claude Code は以下を守ること。

## 📘 ルール集（最初に読む）

> **進め方の決まりの正は [settings/docs/general/RULES.md](settings/docs/general/RULES.md)（2026-09-27 に全ルールを仕分けて作り直した）。**
> RULES.md は下の1行で**会話の始めに毎回自動で読み込まれる**（ヒデさんが「ルールを読んで」と言わなくてよい）。
> **最優先は RULES.md の一番上「★ いちばん大事な決まり」。** 作業の最初に、今が 場面A（カンプから作る）／B（カンプなしで作る）／C（作った画面をFigmaに書き出す）のどれかを見きわめ、その場面の決まりから守る。
> ★は、会話の始め・再開・要約の直後と、場面の言葉（「カンプ」「Figmaに書き出して」「デプロイ」「直ってない」など）が来た時にも自動で出る（仕掛け: `.claude/hooks/rules-reminder.py`、設定: `.claude/settings.json`）。

@settings/docs/general/RULES.md

> ほかの資料と食い違ったら RULES.md を優先する。外した決まりは [RULES-ARCHIVE.md](settings/docs/general/RULES-ARCHIVE.md)（参照用。今の作業では守らなくてよい）。
> 資料の索引は [settings/docs/README.md](settings/docs/README.md)。調整パネルの仕様は [settings/tune-panel/README.md](settings/tune-panel/README.md)。
> **ルール集は「これからの進め方」の決まり。外した決まりに沿って作られた、今あるサイトやアプリの作りは変えない。**

## 🔒 削除厳禁 Notion リソース（運用中の本番資産）

下記の Notion リソースは **絶対に削除・改名しないこと**。eigyo-tracker（自動同期スクリプト）が ID 参照で使っており、削除すると本番が即停止する。タイトルに `[🔒削除厳禁]` プレフィックスを付けて運用中。

| 種類 | タイトル | ID | env 変数 | 役割 |
|---|---|---|---|---|
| 📊 DB | [🔒削除厳禁] 企業リスト（旧称: デザイン制作会社） | `18919c93-bf12-4d92-b867-5ef9c32fb7b3` | `NOTION_COMPANIES_DB_ID` | 営業同期のメインDB |
| 📊 DB | [🔒削除厳禁] 営業同期 レポート（週次） | `3519b3c4-ddc0-819f-a278-e7f00497ce37` | `NOTION_REPORT_DB_ID` | 週次レポート蓄積先 |
| 📊 DB | [🔒削除厳禁] ステータス変更ログ | `d08ccb69-d0e7-4a16-aba7-2423e77f8ea0` | `NOTION_STATUS_CHANGE_LOG_DB_ID` | Before/After 表示の元データ |
| 📄 ページ | [🔒削除厳禁] 📬 営業同期 通知 | `3529b3c4-ddc0-8138-bd75-eab8bc43efb1` | `NOTION_NOTIFY_PAGE_ID` | @メンション通知の貼付先 |

- 個別レコード（会社ページ・過去レポート個別ページなど）は削除可能。**DB / 親ページ自体は不可**。
- ID は `gh secret list` で GitHub Secrets にも登録済み。

### 🔄 営業トラッカーのスキーマ自動キャッチアップ（実装済み）

**ヒデさんは Notion 上でプロパティ・オプションをほぼ自由にいじってよい。型変更だけは要注意。**

仕組み：

1. **id ベースの動的解決**（[eigyo-tracker/src/schema-resolver.ts](eigyo-tracker/src/schema-resolver.ts)）
   - sync 起動時に Notion DB を retrieve
   - プロパティ id・オプション id（Notion 内部 ID、rename しても不変）で「現在の名前」を逆引き
   - status などの内部値は内部 role key（"S" "A" "WAITING" など）で扱う
2. **自動復元**（[eigyo-tracker/src/schema-restorer.ts](eigyo-tracker/src/schema-restorer.ts)）
   - プロパティ削除・オプション削除を検知 → Notion API で再作成
   - 復元成功時は Notion 通知ページに「自動復元しました」とコメント
3. **キャッシュの自動 git commit**（[.github/workflows/eigyo-tracker.yml](.github/workflows/eigyo-tracker.yml)）
   - [eigyo-tracker/notion-schema-cache.json](eigyo-tracker/notion-schema-cache.json) に「役割 → id, currentName」を保持
   - sync 後に差分があれば github-actions[bot] が main へ自動 commit
4. **型変更だけは停止＋通知**（[eigyo-tracker/src/schema-check.ts](eigyo-tracker/src/schema-check.ts)）
   - 自動で型を戻すとデータロスするため、検知して停止し Notion 通知ページに⚠️

**ヒデさんがやって OK な操作**：
- プロパティ rename / 新規プロパティ追加
- select オプション rename / 追加
- プロパティ削除（自動で再作成される）
- select オプション削除（自動で再作成される）

**止まる操作**：プロパティの型変更（select↔multi_select 等）。
- 意図的な変更なら → Claude に「コード側のスキーマ定義 (src/schema-resolver.ts の `*_PROP_INITIAL`) を新仕様に合わせて」と依頼
- ミスなら → Notion で型を元に戻す

## 🖥 開発中はローカルで確認する（2026-08-27 制定）

**毎回デプロイしない。** ローカルで本番と同じものを見てもらい、
ヒデさんが「**デプロイ**」と言った時だけ Vercel に上げる。

- 理由: Vercel 無料プランは **1日100デプロイが上限**。細かい修正のたびに上げていたら
  2026-08-27 に上限へ到達し、その日は公開できなくなった
- 修正したらローカルサーバーを立てて、**ローカルURLを案内する**
  （anyflow V3 = http://localhost:8776 / V2 = http://localhost:8775。`.claude/launch.json` 参照）
- 配信するのは本番と同じファイルなので、見た目・挙動は本番と一致する
- 上限に当たった時は `anyflow/deploy-v2-v3.sh` ／ `abashiri/deploy-v3.sh` ＋ 定期タスクで、
  リセット後に自動で上がる（どちらも成功したら `.done` マーカーを置いて自分で止まる。
  ログは `abashiri/.deploy-v3.log`）
  ⚠️ 2026-09-27 に crontab の予約は全部外した（網走V3・AnyFlow V4/V5 の自動デプロイ、design-gallery の毎朝取得）。
  使う時は登録し直す。外す前の控え: `~/.claude/backups/crontab-2026-09-27.txt`

## 🔒 削除厳禁ブランチ（凍結スナップショット）

「あの時の状態に戻したい」用に残してあるブランチ。**絶対に消さない・上書きしない。**

| ブランチ | 中身 | 作った日 |
|---|---|---|
| `abashiri-v1.0` | 網走サイト バージョン 1.0（デザインシステム整備・命名統一まで完了した状態） | 2026-08-16 |
| `anyflow-v1.0` | anyflow-embed バージョン 1.0（公開中の本番そのもの。ここからアップデート案を検討する） | 2026-08-19 |

- これ以降の網走サイトのアップデートは **main に積む**（v1.0 ブランチには何も足さない）
- 凍結ブランチを増やす時は、この表にも 1 行足すこと

### 🧹 消してよい古いブランチ（役目を終えたもの）

`abashiri-v1.0` と `main` 以外は、ヒデさんの判断で消してよい。
⚠️ **この環境（Claude Code Remote）からはブランチ削除ができない**（`git push --delete` が
403 で弾かれる）。消す時は GitHub の Branches 画面か、ヒデさんのローカルから実行する。

| ブランチ | 状態 |
|---|---|
| `restore-abashiri-before-design-system` | 役目終了（2026-08-16 にヒデさん確認済み） |
| `claude/laughing-maxwell` / `claude/tender-bartik` | 過去の自動ブランチ。本番未反映トラブルの元 |
| `claude/design-system-figma-docs-toi8q2` | 今回の作業ブランチ。main に統合済み |
| `claude/abashiri-speech-bubble-animation-rrs13o` | 統合済みなら不要 |
| `release/v2.0` | 中身を確認してから判断 |

## 🚀 各プロジェクトの本番 URL とデプロイ先

### Vercel 勢（アプリ本体は全部 Vercel に統一）

| プロジェクト | 本番 URL | Git | Vercel Project | 自動 deploy |
|---|---|---|---|---|
| **houmon-app** | **https://houmon-app-lilac.vercel.app** | submodule (main) | houmon-app | ✅ main push で自動 |
| **design-gallery** | **https://design-gallery-puce.vercel.app** | 親リポ subdir (main) | design-gallery | ✅ main push で自動（Root Directory: `design-gallery`、2026-07-31設定） |
| **空き時間みつける君** | **https://akijikan-mitsukeru-kun.vercel.app** | 親リポ subdir (main) | akijikan-mitsukeru-kun | 手動（`vercel --prod`） |
| **Retro Games** | **https://retro-games-one.vercel.app** | 親リポ subdir (main) | retro-games | 手動（`vercel --prod`） |
| **anyflow-embed（V1.0・公開中）** | **https://anyflow-embed.vercel.app** | 親リポ subdir (main) | anyflow-embed | 手動（`vercel --prod`） |
| **anyflow-embed-v2（アップデート案）** | **https://anyflow-embed-v2.vercel.app** | 親リポ subdir (main) | anyflow-embed-v2 | 手動（`vercel --prod`） |
| **anyflow-embed-v3（旧・アップデート案）** | **https://anyflow-embed-v3.vercel.app** | 親リポ subdir (main) | anyflow-embed-v3 | 手動（`vercel --prod`） |
| **anyflow-embed-v4（現・新規開発）** | **https://anyflow-embed-v4.vercel.app** | 親リポ subdir (main) | anyflow-embed-v4 | 手動（`vercel --prod`） |
| **abashiri-site（網走 V1.0・公開中）** | **https://abashiri-site.vercel.app** | 親リポ subdir (main) | abashiri-site | ✋ 手動（Git連携解除・Root Directory空）。push しても本番は動かない。上げ直しは `cd abashiri/v1 && npx vercel --prod --yes` |
| **abashiri-site-v2（網走 アップデート案）** | **https://abashiri-site-v2.vercel.app** | 親リポ subdir (main) | abashiri-site-v2 | 手動（`vercel --prod`） |
| **abashiri-site-v3（網走 V3.0 作業版）** | **https://abashiri-site-v3.vercel.app** | 親リポ subdir (main) | abashiri-site-v3 | 手動（`vercel --prod`） |
| **presenter-notes（カンペ連動プレゼン）** | **https://presenter-notes-seven.vercel.app** | 親リポ subdir (main) | presenter-notes | 手動（`cd presenter-notes/v1 && npx vercel --prod --yes`）。※Figma OAuth の client-id 必須・別URLは embed origin 追加登録。詳細 [settings/docs/presenter-notes/README.md](settings/docs/presenter-notes/README.md) |
| travel-shiori（旅のしおり） | https://tabinoshiori-swart.vercel.app | 親リポ subdir (main) | **tabinoshiori**（※ project 名が違う） | - |
| nittei-chousei | https://nittei-chousei-pi.vercel.app | submodule (master) | nittei-chousei | - |

### GitHub Pages 勢（ポータル本体のみ）

| プロジェクト | 本番 URL | デプロイ元 |
|---|---|---|
| ポータル本体 | https://hideyuki-yamanaka.github.io/ | 親リポ `.github/workflows/deploy.yml` |

注意事項：
- 📁 **バージョンはプロダクト親の下に `v1` / `v2` で置く**（2026-08-23 から）。「凍結（触るな）」の概念は廃止し、**V1.0＝公開版（安定）／ V2＝更新作業版**の対等な2バージョンとして扱う。両方とも手動デプロイ。
- **abashiri（網走）＝ `abashiri/v1`〜`abashiri/v3`**（別URL・別Vercelプロジェクトで公開）。
  - `abashiri/v1/` = V1.0（公開版・安定）。Vercel `abashiri-site` → https://abashiri-site.vercel.app
  - `abashiri/v2/` = V2（更新作業版）。Vercel `abashiri-site-v2` → https://abashiri-site-v2.vercel.app
  - V1.0 は 2026-08-23 に Git 連携を解除＋Root Directory を空に（push しても本番は動かない）。上げ直しは `abashiri/v1/` 内で `npx vercel --prod --yes`
  - V2 は `abashiri/v2/` 内で `npx vercel --prod --yes`
  - `abashiri/v3/` = V3.0（2026-09-14〜の更新作業版。v2のコピーから開始）。Vercel `abashiri-site-v3` → https://abashiri-site-v3.vercel.app 。ローカル dev は port 3095（launch.json name: abashiri-v3）
- **anyflow ＝ `anyflow/v1` と `anyflow/v2`**（別URL・別Vercelプロジェクト）。
  - `anyflow/v1/` = V1.0（公開版）。Vercel `anyflow-embed` → https://anyflow-embed.vercel.app
  - `anyflow/v2/` = V2（更新作業版）。Vercel `anyflow-embed-v2` → https://anyflow-embed-v2.vercel.app
  - ⚠️ デプロイ前に必ず `cat .vercel/project.json` で projectName を確認（`anyflow/v1/` の中で叩くと**公開中サイトを上書き**してしまう）
  - V1.0 のコードは `anyflow-v1.0` ブランチにも保存済み（削除厳禁の保険スナップショット）
- **アプリは全部 Vercel 一本**（2026-04-23 統一）。以前は GH Pages にも複製 deploy されてたが、houmon-app の mock モード問題や design-gallery の swc バグなどトラブルの温床だった。現在は各 `hideyuki-yamanaka.github.io/<app>/` にアクセスすると Vercel へリダイレクトされるだけ。
- **nittei-chousei だけデフォルトブランチが `master`**。他は `main`。
- ポータルの `product.meta.json` の `path` が絶対 URL（`https://...`）なら Vercel、未指定 or 相対パスなら GH Pages。今は全アプリが絶対URL指定済み。
- **空き時間みつける君 / Retro Games は親リポの subdir に直置き**（submodule ではない）でデプロイは手動。更新時は該当ディレクトリで `npx vercel --prod --yes` を叩く。
- **design-gallery は 2026-07-31 から Git 自動デプロイ**（Vercel の Root Directory を `design-gallery` に設定済み）。main に push するだけで本番反映される。毎朝のスクレイパー commit も自動で本番に乗る。
  - ⚠️ design-gallery ディレクトリ内から `npx vercel --prod` を叩くと Root Directory が二重になって失敗する。手動で再デプロイしたい時は `npx vercel redeploy design-gallery-puce.vercel.app` を使う。

## 🧭 houmon-app のデプロイ手順（auto 連携あり）

1. `houmon-app/` 内で編集して commit
2. `git push origin main` → Vercel が**自動で** build & deploy
3. `npx vercel inspect houmon-app-lilac.vercel.app` で 最新 deploy の created 時刻を確認
4. 問題なければ親リポの submodule pointer も進める（`git add houmon-app && git commit -m 'bump houmon-app submodule' && git push`）
   - ※ GH Pages 側はリダイレクトだけなので急がなくてもOK

手動 deploy したい時だけ `npx vercel --prod --yes` を houmon-app ディレクトリで叩く。

## ⚠️ 過去の本番未反映事故

6件の事故の経緯と対策は [settings/docs/general/VERCEL-PROJECTS.md](settings/docs/general/VERCEL-PROJECTS.md) の最後に移した（2026-09-27）。デプロイで困った時はまずそこを見る。

## ⚠️ git config（超重要・過去の本番未反映主犯）

コミット前に必ず `git log -1 --format='%ae'` で author email を確認。
`*@Mac.lan` のようなローカルホスト由来メールだと Vercel がデプロイを拒否する。

正しい設定:
```
user.name  = hideyuki-yamanaka
user.email = dosanko.design@gmail.com
```

もし過去のコミットが壊れた author で入ってたら、Claude は `git commit --amend --reset-author` ＋
`git push --force-with-lease` で修正する（force push の是非はユーザーに確認）。

## 🔑 環境変数

各プロジェクトに `.env.example` を置いている。ローカルでは `.env.local` にコピーして値を入れる。
**Vercel 側への登録を忘れない**（Project Settings > Environment Variables）。

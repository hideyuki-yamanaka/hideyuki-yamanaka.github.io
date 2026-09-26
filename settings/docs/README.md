# 📚 ドキュメント置き場

「あの資料どこやったっけ？」を無くすための入口。**まずここを見る。**

> 📁 このフォルダは 2026-08-23 から **`settings/docs/`** に置いています（旧: リポジトリ直下 `docs/`）。
> 調整パネルのライブラリも **`settings/tune-panel/`** に移動しました。
> `CLAUDE.md` / `AGENTS.md` は Claude Code が直下から自動で読むので**動かしていません**。

## 置き方のルール（迷ったらこれ）

| 種類 | 置き場所 | 例 |
|---|---|---|
| **どのプロダクトにも効く話** | `settings/docs/general/` | 進め方のルール・カンプの読み方・Vercel の運用 |
| **特定のプロダクトの話** | `settings/docs/<プロダクト名>/` | 網走サイトのデザインシステム・anyflow の引き継ぎ書 |
| [anyflow/LIVE-SYNC.md](anyflow/LIVE-SYNC.md) | スマホ実機ライブ同期(QR・PC調整→スマホ即反映)の使い方と仕組み |
| [anyflow/ANYFLOW-PC-SP-INDEPENDENCE.md](anyflow/ANYFLOW-PC-SP-INDEPENDENCE.md) | 調整パネルの PC/SP 独立(mbKey・params.mb・applyMbToParams)の絶対ルールと住み分け・対象外 |
| [anyflow/ANYFLOW-PANEL-STRUCTURE.md](anyflow/ANYFLOW-PANEL-STRUCTURE.md) | 調整パネルの構成ルール(新5カテゴリ: バリエ→基本→フォント→エフェクト＆テクスチャ→アニメ→その他＋オブジェクト束ね＋命名統一)。2026-09-20 大改修で改訂 |
| [anyflow/PANEL-REORG-MAP.md](anyflow/PANEL-REORG-MAP.md) | 調整パネル大改修の対応表(現状→カテゴリ→オブジェクト→新名称→操作)。全タブ＋実装ステータス(済み/仮置き)つき |
| [anyflow/HANDOFF-20260920.md](anyflow/HANDOFF-20260920.md) | 【引き継ぎ】別Claudeが anyflow V5.0 の作業を続けるための現状・仕組み・動かし方・進め方ルール・未対応(2026-09-20) |
| [anyflow/HANDOFF-2026-09-22.md](anyflow/HANDOFF-2026-09-22.md) | 【引き継ぎ・最新】そのまま貼ればOK。SPのみのビジョンメッシュ(機能名の上げ/縮小/中央化/左右移動)＋実績の罫線余白60px化。applyVfFade vs vfDraw・ピクト透明余白・PC/SP独立・push rebase 手順つき(2026-09-22) |

- フォルダ名は**プロダクトのフォルダ名とそろえる**（`abashiri/` の資料 → `settings/docs/abashiri/`）
- 新しいプロダクトの資料が出てきたら、`settings/docs/` に同じ名前のフォルダを作って入れる
- ⚠️ **プロダクト別フォルダの中で `index.html` `app/globals.css` のように書かれている相対パスは、
  そのプロダクトのフォルダ（例: `../../anyflow/v1/`）を基準に読む**

## 🌐 general — 全プロダクト共通

| ファイル | 中身 | いつ読む |
|---|---|---|
| [general/WORKING-RULES.md](general/WORKING-RULES.md) | 推測・質問・報告の共通ルール（🔴最重要・持ち運び用） | **作業に着手する前に必ず** |
| DEPLOY-RULES | 無駄なVercelデプロイを消す方法(Ignored Build Step)＋24h集計コマンド | [general/DEPLOY-RULES.md](general/DEPLOY-RULES.md) | 2026-09-11 |
| [SCROLL-RULES.md](general/SCROLL-RULES.md) | スクロール事故の防止（1画面超えは必ずスクロールバー・実測してから渡す） |
| [general/DESIGN-SYSTEM-RULES.md](general/DESIGN-SYSTEM-RULES.md) | Figma カンプの読み方（🔴スペック表をコードより先に作る・数値を推測で埋めない） | カンプ通りに実装する時 |
| [general/RESPONSIVE-RULES.md](general/RESPONSIVE-RULES.md) | レスポンシブ実装（🔴**全プロダクト共通の基準: 途中で幅を変えても崩れない**＝「A幅で開いてBへ」＝「最初からB」・6章に作り方の優先順位(CSS→書き直し→境目で開き直し)とスマホ判定中は保存しない決まり／SP は "別のカンプ" として一から実装・実機の短い innerHeight で検証） | スマホ/ブレイクポイント対応をする時・新しくサイトを作る時 |
| [general/PHONE-MODE.md](general/PHONE-MODE.md) | スマホモード（実機ライブ同期・QRでスマホ実機にPCの調整を即反映）＝調整パネルの標準機能。単一ソースは settings/tune-panel/phone-mode/ | SP を実機で詰める時／新プロダクトに入れる時 |
| [general/FIXLOG.md](general/FIXLOG.md) | 不具合の1行台帳（症状と真因。**直す前に検索・直したら追記**） | バグを直す前後に必ず |
| [general/FIGMA-EFFECTS-RULES.md](general/FIGMA-EFFECTS-RULES.md) | ブラー/影を正しく実装（🔴 backdrop-blurはSVG/PNGに焼けない＝ライブCSS必須。値はFigma実測） | Figmaのガラス/影を実装する時 |
| [general/FIGMA-OUTPUT-WORKFLOW.md](general/FIGMA-OUTPUT-WORKFLOW.md) | Web→Figma出力（ベクターはSVG取込・惑星等は2倍PNG・🔴セクションの子は相対座標で範囲内へ→appendChild） | グラフィックをFigmaのセクションへ出力する時 |
| [general/DESIGN-SYSTEM-WORKFLOW.md](general/DESIGN-SYSTEM-WORKFLOW.md) | 既存サイトを棚卸ししてデザインシステムに整える手順 | スタイルを整理する時 |
| [general/VERCEL-PROJECTS.md](general/VERCEL-PROJECTS.md) | 各プロジェクトの本番 URL・Vercel 設定・デプロイ手順 | デプロイ・本番反映の確認 |
| [general/FOLDER-RESTRUCTURE-RUNBOOK.md](general/FOLDER-RESTRUCTURE-RUNBOOK.md) | フォルダ構成の整理手順（settings/ への集約・バージョンフォルダの親子化。Vercel 設定の直し方つき） | フォルダを動かす時 |

## 📦 プロダクト別

### abashiri（網走サイト）
| ファイル | 中身 |
|---|---|
| [abashiri/DESIGN-SYSTEM.md](abashiri/DESIGN-SYSTEM.md) | 完成したデザインシステム（色・文字・余白のトークン一覧） |
| [abashiri/DESIGN-SYSTEM-V2.md](abashiri/DESIGN-SYSTEM-V2.md) | V2.0 用に再整理したデザインシステム（4/8の倍数ルール・丸め表つき） |
| [abashiri/DESIGN-SYSTEM-V3.md](abashiri/DESIGN-SYSTEM-V3.md) | **V3.0 の最新版**（直値をトークンへ寄せた統合表・レスポンシブ900px区切り・ブラーとスクロール演出の落とし穴） |
| [abashiri/TUNE-PANEL-V3.md](abashiri/TUNE-PANEL-V3.md) | 調整パネルを anyflow 仕様に統一した記録（四辺リサイズ・行ごとの↺・プリセット・スマホのシート） |
| [abashiri/V1.1-STATUS.md](abashiri/V1.1-STATUS.md) | v1.1 のいまの状態・仮置き一覧・実装の地雷・次にやること（引き継ぎ用） |
| [abashiri/TASKS.md](abashiri/TASKS.md) | ヒデさんからの依頼台帳（依頼・進捗・概算時間。受けたら即追記） |


### houmon-app（家庭訪問アプリ）

| ファイル | 中身 |
|---|---|
| [houmon-app/DESIGN-SYSTEM.md](houmon-app/DESIGN-SYSTEM.md) | デザインシステム（2026-09-27 整理: 色は役割の名前・角丸6段・影5つ・文字10/12/16/20/24・4の倍数ルール・マテリアルアイコン・画面ごとの決まり・運用ルール） |

### opus-metaverse（Opus 5.5 没入型コンセプトサイト）
| ファイル | 中身 |
|---|---|
| [opus-metaverse/README.md](opus-metaverse/README.md) | 章構成とスクロール範囲・インタラクション一覧・仮置き一覧・明るさの注意（2026-09-25 新規） |

### anyflow
| ファイル | 中身 |
|---|---|
| [anyflow/V5-FILES.md](anyflow/V5-FILES.md) | **V5.0 のファイル構成（2026-09-26 分割）**。直すのは `js/parts`→`./build.sh`、焼き込みは `js/parts/02-shipped.js`、デプロイ手順、整理で消したもの一覧 |
| [anyflow/HANDOFF.md](anyflow/HANDOFF.md) | 実装の引き継ぎ書（一番厚い。実測値と経緯が全部ここ） |
| [anyflow/DESIGN-SYSTEM.md](anyflow/DESIGN-SYSTEM.md) | V5.0 のデザインシステム（実装トークンの一覧・2026-09-19 の整理の記録・戻し方）。値の唯一の出どころは DS-TOKENS ブロック（2026-09-26 から `anyflow/v5/css/style.css` の中） |
| [anyflow/RESULTS-INITIAL-RESTORATION.md](anyflow/RESULTS-INITIAL-RESTORATION.md) | 最初に納品した10案の復元。独立URL /mock/results-initial/、当時のレイアウト・操作・CSS、復元元と実測、現在の一覧とは別の番号・保存領域 |
| [anyflow/RESULTS-SECOND-RESTORATION.md](anyflow/RESULTS-SECOND-RESTORATION.md) | 2回目に納品した10案の復元。2026/09/13 22:50版、独立URL /mock/results-second/、横スクロール3案・Visionから開発者体験まで |
| [anyflow/RESULTS-REVEAL-STUDY.md](anyflow/RESULTS-REVEAL-STUDY.md) | 現在の検討一覧、残存案の連番、2回目No.03の追加、新規10案（既存の別版5＋新しいアプローチ5）、画面占有率・発火条件・移植用文面。削除済みの専用ファイルを除去。No.01は着地後に横移動し、通常の縦スクロールへ復帰 |
| [anyflow/RESULTS-ATTENTION-DESIGN-QA.md](anyflow/RESULTS-ATTENTION-DESIGN-QA.md) | 2026/09/15追加10案の画面・動作確認。PC／390px実測、原本との比較、修正内容、削除状態の確認 |
| [anyflow/RESULTS-VISUAL-HANDOFF.md](anyflow/RESULTS-VISUAL-HANDOFF.md) | **最新版**：実績1・4・5・6・7・9案のサイズ・画面占有率・構図・全アニメーション場面・スマホ・Visionから開発者体験以降までの接続仕様。添付比較画像は `anyflow/results-reference/`、持ち運び一式は `anyflow/RESULTS-VISUAL-HANDOFF.zip` |
| [anyflow/RESULTS-MOTION-HANDOFF.md](anyflow/RESULTS-MOTION-HANDOFF.md) | 旧版の演出概要。実装時は上の最新版を優先 |
| [anyflow/BLENDER-3D-HERO-HANDOFF.md](anyflow/BLENDER-3D-HERO-HANDOFF.md) | TOPキービジュアルを Blender で3D立体化する引き継ぎ（構図の実測座標・ガラス質感・Figmaノード番号つき。ローカルClaude＋Blender MCP 向け） |
| [anyflow/DESIGN-SYSTEM-V3.md](anyflow/DESIGN-SYSTEM-V3.md) | **V3の実装デザインシステム**（色/余白/角丸/影/モーションのトークン一覧・Low/Mid/High 3段階・切替方法・整理の記録・戻し方） |
| [anyflow/DESIGN-TOKENS.md](anyflow/DESIGN-TOKENS.md) | デザイントークン一覧（v1/v2時代の紙の整理。V3実装はDESIGN-SYSTEM-V3.mdが後継） |
| [anyflow/STORYBOARD-NOTES.md](anyflow/STORYBOARD-NOTES.md) | 絵コンテのメモ |
| [anyflow/FRAMER-AGENT-BRIEF.md](anyflow/FRAMER-AGENT-BRIEF.md) | Framer 側の担当者／AI 向けの依頼書 |
| [anyflow/anyflow-postmortem.md](anyflow/anyflow-postmortem.md) | 事故の振り返り（[general/WORKING-RULES.md](general/WORKING-RULES.md) の根拠になった実測） |
| [anyflow/BACKDROP-FILTER-HANDOFF.md](anyflow/BACKDROP-FILTER-HANDOFF.md) | v2 KV のすりガラス(backdrop-filter)問題の引き継ぎ書（原因複数・試したこと・検証法・次の一手。別アカ継続用） |

### presenter-notes（カンペ連動プレゼン）
| ファイル | 中身 |
|---|---|
| [presenter-notes/README.md](presenter-notes/README.md) | セットアップ＆運用（仕組み・Figma OAuth 設定・使い方・実運用の注意・デプロイ・検証記録） |

### travel-shiori（旅のしおり）
| ファイル | 中身 |
|---|---|
| [travel-shiori/要件定義書.docx](travel-shiori/要件定義書.docx) | 要件定義書 |

## 🚚 ここに集めていないもの（意図的）

移すと壊れる・見つけにくくなるので、あえて元の場所に残しているファイル。

| ファイル | 場所 | 残す理由 |
|---|---|---|
| `CLAUDE.md` / `AGENTS.md` | リポジトリ直下 | Claude Code がその場所から自動で読み込む。動かすと効かなくなる |
| `abashiri/v1/` `abashiri/v2/` などの `CLAUDE.md` / `AGENTS.md` | 各バージョン直下 | 同上（`next dev` が自動生成もする） |
| [abashiri/PANEL-STRUCTURE.md](abashiri/PANEL-STRUCTURE.md) | 網走の調整パネルの構成ルール（anyflow と同じ5カテゴリ・同じ並び） |
| 各プロダクトの `README.md` | 各プロダクト直下 | GitHub がフォルダを開いた時に表示する定位置。npm パッケージ（tune-panel）も同じ |
| `anyflow/v1/framer-handoff/*.md` | 元の場所 | `assets/` `code/` とセットで zip にして渡す**納品物一式**。バラすと zip が作れない |
| houmon-app / nittei-chousei の資料 | それぞれの別リポジトリ | submodule（このリポジトリの管理外） |

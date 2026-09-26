# houmon-app デザインシステム

> 整理した日: 2026-09-27（ヒデさん指示「重複・ほぼ差のない値は統合して整理整頓」）
> 手順: [general/DESIGN-SYSTEM-WORKFLOW.md](../general/DESIGN-SYSTEM-WORKFLOW.md)
> 整理前に戻る目印: houmon-app のタグ `before-design-system-2026-09-27`

**値の出どころは 1 か所だけ**: `houmon-app/src/app/globals.css`（色 = `:root` の `--color-*`、影 = `@theme` の `--shadow-*`）。
画面のファイルに 色コード（`#F0F0F0` など）や Tailwind の名前付きの色（`gray-500` など）を直接書かない。

---

## 数値のルール（全部に共通）

| ルール | 中身 |
|---|---|
| 基本 | **4 の倍数**（4 / 8 / 12 / 16 / 20 / 24 …） |
| 10px 以下 | **2px 刻みも可**（2 / 4 / 6 / 8 / 10） |
| 例外 | 1px の細い線・カードの影の 1px の層 / 0.5px の区切り線 / 画面の最大幅 1366px（iPad）/ 地図のピンの図形 / 印刷ページ（pt・mm で組んでいる） |

---

## 色（役割で名前を付ける。見た目の色名では付けない）

使い方: `text-[var(--color-subtext)]` / `bg-[var(--color-fill)]` / `style={{ color: 'var(--color-text)' }}`

### 文字
| 名前 | 値 | 使う所 | 統合した色 |
|---|---|---|---|
| `--color-text` | `#111111` | 本文・見出し | `#000` `#111` `#222` / gray-900・800 |
| `--color-text-2` | `#3C3C43` | 濃いめの補足 | `#374151` `#4B5563` `#555` / gray-700 |
| `--color-subtext` | `#6E6E73` | 補足・ラベル | `#666` `#6B7280` `#717171` `#5F6368` / gray-600・500 |
| `--color-muted` | `#8E8E93` | さらに薄い補足・アイコン | `#888` `#999` `#9CA3AF` / gray-400 |
| `--color-placeholder` | `#C7C7CC` | 未入力・無効 | `#CCC` `#D0D0D0` `#D1D5DB` `#B9C0CC` / gray-300 |

### 面・線
| 名前 | 値 | 使う所 | 統合した色 |
|---|---|---|---|
| `--color-bg` | `#F2F2F7` | 画面の地 | — |
| `--color-white` / `--color-card` | `#FFFFFF` | 白・カード・シート | `#FFF` |
| `--color-fill` | `#F0F0F0` | 薄いグレーの面・押した時 | `#F5F5F5` `#F3F4F6` `#EEEEEF` `#E8EAED` / gray-100 |
| `--color-fill-subtle` | `#F7F7F8` | さらに薄い面 | `#FAFAFA` `#F9FAFB` `#F8F8F8` / gray-50 |
| `--color-border` | `#E5E5EA` | 線 | `#E5E7EB` `#E0E0E3` `#E8E8E8` `#EBEBEB` / gray-200 |

### 役割の色（1 つの役割に「本体 / 文字 / 薄い面 / 薄い線」）
| 役割 | 本体 | 文字 | 薄い面 | 薄い線 |
|---|---|---|---|---|
| 操作・リンク `primary` | `#007AFF` | — | `#EFF4FF` | `#C3D8FF` |
| 拒否・削除・エラー `danger` | `#FF3B30` | `#B91C1C` | `#FFE5E5` | `#FECACA` |
| 会えた `success` | `#34C759` | `#1D7A3F` | `#D6F4DE` | — |
| 住所不明・注意 `warning` | `#FF9500` | `#C2410C` | `#FFEAD0`（さらに薄い `#FFF7ED`） | `#FED7AA` |
| 転居 `moved` | `#AF52DE` | `#7B2DBF` | `#F3E8FF` | — |
| AI の機能 `ai` | `#6366F1` → `#8B5CF6`（グラデ） | `#4338CA` | `#EEF2FF` | — |
| ヤング `young` | `#5AC8FA` | — | — | — |
| ブックマーク `bookmark` | `#FFCC00` | — | `#FFF6CC` | — |

⚠️ **本部・部・地区の色**（`lib/constants.ts` の `ORG_TREE`）は **データ** なので ここには入れない。
絞り込みで選んだ時は 本部の色で塗らず **黒 1 色**（`#222`）、本部の色は名前の前の小さな点だけに使う。

整理の結果: 画面の色 **106 種類 → 役割 40 前後**（直書き 403 か所 + Tailwind の名前付きの色 119 か所を置き換え）。

---

## 文字

| 大きさ | Tailwind | 使う所 |
|---|---|---|
| 10px | `text-[10px]` | いちばん小さい補足・バッジ |
| 12px | `text-[12px]` / `text-xs` | 補足・ラベル・チップ |
| 16px | `text-base` / `text-[16px]` | **本文**（前の 14px をここへ）・戻るボタン付きページの見出し（太字） |
| 20px | `text-xl` | タブの一番上のページの見出し・一覧の「メンバー」 |
| 24px | `text-2xl` | ログイン画面の見出し |
| 32px / 36px | `2rem` / `text-4xl` | ダッシュボードの大きい数字 |

整理の記録: 9→10 / 11→12 / 13→12 / **14→16（ヒデさん決定 案C）** / 15→16 / 17→16 / 18→20。

| 行間 | 値 | 使う所 |
|---|---|---|
| `leading-none` | 1 | アイコン・数字だけの行 |
| `leading-tight` | 1.25 | 見出し・1〜2 行のもの（前の snug 1.375 / 1.2 を統合） |
| `leading-relaxed` | 1.6 前後 | 本文・メモ（CSS の 1.65 を 1.6 に） |

| 字間 | 値 | 使う所 |
|---|---|---|
| 詰める | `-0.04em` | ダッシュボードの大きい数字・「1 / 3」の件数（前の -0.03em / -0.1em を統合） |
| 広げる | `tracking-wide` | 小さいラベル |
| 例外 | `tracking-[0.3em]` | ログインの 6 桁の数字（読みやすさのため） |

---

## 角丸

| 値 | Tailwind | 使う所 |
|---|---|---|
| 4px | `rounded` | 小さいタグ |
| 8px | `rounded-lg` | 小さいボタン（前の 6px をここへ） |
| 12px | `rounded-xl` | カード（`.ios-card`）・入力欄（前の 10px をここへ） |
| 16px | `rounded-2xl` | シート・大きいボタン |
| 24px | `rounded-3xl` | AI のカード（中の 22px もここへ） |
| 丸 | `rounded-full` | チップ・丸ボタン・シートの取っ手（前の 20px / 3px） |

---

## 影（役割で 5 つ + カード）

| 名前 | 値 | 使う所 |
|---|---|---|
| `shadow-raised` | `0 2px 4px rgba(0,0,0,.08)` | 選んだタブ・小さいボタン（前の shadow / shadow-sm / 0 1px 3px） |
| `shadow-float` | `0 4px 12px rgba(0,0,0,.2)` | 地図の丸ボタン・ピン（前の 0 3px 10px ほか 6 種類） |
| `shadow-overlay` | `0 8px 32px rgba(0,0,0,.2)` | ポップアップ・大きいパネル（前の shadow-lg / 2xl ほか 5 種類） |
| `shadow-sheet` | `0 -4px 20px rgba(0,0,0,.1)` | 下から出るシートの上向きの影 |
| `shadow-ai` | `0 8px 24px rgba(99,102,241,.28)` | AI の機能の紫の光 |
| （カード） | `.ios-card` の 3 層 | カード。1px の細い層を重ねた別物なのでそのまま |

---

## 余白

4 の倍数（10px 以下は 2px 刻み）。Tailwind の目盛りで `3.5`（14px）などは使わない。
整理の記録: 14px → 12 / 16、3px → 4、チップの中 5px → 6、小チップ 3px 9px → 4px 8px、シートの取っ手の太さ 5px → 4、ボタンの高さ 50px → 48、一覧の上 18px → 16、カード内 14px → 16。

---

## アイコン

- **Google Material Symbols（Rounded・線のタイプ）** に統一（前は lucide-react）
- `houmon-app/scripts/icon-map.json` に「部品の名前 → マテリアルの名前」を書き、`node scripts/gen-icons.mjs` で
  `src/components/icons.tsx` を作り直す（使う分の形だけを取り込む）
- 画面では `import { Star, Camera } from '../components/icons'` のように使う（部品の名前は lucide と同じ）
- `fill` を渡すと塗りつぶしの形（★ のブックマーク中など）

---

## 画面ごとの決まり（揃えたもの）

| 項目 | 決まり |
|---|---|
| ページの見出し | タブの一番上のページ = 20px 太字 / 戻るボタン付きのページ = 16px 太字 / ログイン系 = 24px 太字 |
| カード | 共通の `.ios-card`（自前の `bg-white rounded-2xl shadow border` は作らない） |
| ブックマーク | 呼び名は「ブックマーク」（「行きたい」は使わない）。★ アイコン付き。帯・シートとも ★ / 写真 / メモ の 3 つともアイコン付き |
| 記録のボタン | 「記録」（「記録する」ではない） |

---

## 運用ルール

1. 新しい色・影を足す時は **まず globals.css に役割の名前で足す**。画面に色コードを直接書かない
2. 数値は上の「数値のルール」の目盛りから選ぶ
3. ⚠️ globals.css を書き換えたら、ローカルの開発サーバーが気づかないことがある
   → `rm -rf .next` して起動し直し、配信中の CSS に反映されたか curl で見てから画面を確認する（[FIXLOG](../general/FIXLOG.md) 2026-09-27）
4. 印刷ページ（`components/print/`・`app/members/print/`）は紙の寸法（pt・mm）で組んでいるので、この目盛りの対象外

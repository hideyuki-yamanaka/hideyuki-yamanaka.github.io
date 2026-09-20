# anyflow V5.0 調整パネル：PC/SP独立の仕組み（絶対ルール）

> 2026-09-20 制定。ヒデさん強い指定「サイト全体でノーコードツール(STUDIO)のようにPC/SP別で独立して数値を持ちたい」。
> **調整パネルを作り直しても、この2軸の独立は必ず残すこと。** 関連メモリ: `feedback_anyflow_panel_scoping_spec`。

## 2軸の独立（すべてのつまみに適用）
1. **バリエーション別（案ごと）** … KVの「強調」でいじった値は「ノーマル」に出ない（`VAR_AUTOSAVE`＋`gfxVarOverride`）。
2. **PC/SP別** … スマホモード中にいじった値はPCに出ない／PCの値はSPに出ない。**SPで上書き中の項目はブルー印**。

## PC/SP独立の実装（3系統が共存）
| 系統 | 対象 | SP専用の保存先 | 読み分け |
|---|---|---|---|
| ① フォント | 太さ/行間/字間（🔤文字） | `params.editsMb[key]` | `textTools.applyAll` が isMobile の時だけ base に重ねる |
| ② ビジョンのメッシュ | 惑星/カゴ/網など vision の dome | `params.sections.vision.domeMb[k]` | `vfCfgVal` / `vfSet`（`_vfPhoneOn()` で切替） |
| ③ **汎用（今回の主役）** | それ以外の寸法/位置/間隔/色/テクスチャ/タイミング系スライダー | `params.mb['ドットのパス']` | `slider()` の `mbKey` ＋ `applyMbToParams()` |

### ③ 汎用の仕組み（mbKey）
- `slider(label, min, max, step, get, set, fmt, hint, { mbKey: 'ドットのパス' })` を付けると：
  - **スマホモード中**（`html.phone-mode`）の `set(v)` は `params.mb[mbKey]=v` に書くだけ。**PCの基準値（本来の set 先）は触らない**。
  - `get()` はスマホモード中だけ `params.mb[mbKey]` を優先表示。
  - 青印（`row.mb-override`）とリセット（SP上書きだけ消す）は `mbKey` から自動生成。
- **スマホ実機**（幅≤`MOBILE_MAX`=600px ＝ `isMobile`）は起動時に `applyMbToParams()` が `params.mb` の各パスを本体 `params` へ流し込む → SPだけがSP用の値で描画される。`liveApplyNoReload()`（リアルタイム同期）でも呼ぶ。
- **スマホ(isMobile)は閲覧専用**：`save()` の先頭で `if (isMobile) return;`。applyMbToParams が本体を書き換えているので、スマホで保存するとPCの基準値まで汚れるため。**編集・保存はPC側だけ**（スマホモードのトグルはPC上のクラス切替なので isMobile は false のまま）。
- `mbKey` のパス＝実際の `params` のドットパス。別名ヘルパーの対応：`sv()`=`params.sections` / `editPos('K')`=`params.edits.K` / `cvv()`=`params.cv` / `_g()`=`params.cvfGlass` / `f14〜f26()`=`params.sections.results.fx14〜26` / `heroP()`=`params.sections.results.hero` / `D()`=`params.drawer` / `kg()`=`params.kvGfx`。

## いま独立している範囲（2026-09-20・176個のmbKey）
KVの文字と間隔（`kv.*`）／右グラフィックの位置XYZ（`kvGfx.*`）／実績（`sections.results.*`・fx14〜26・hero・hrGap 等）／開発者体験（`sections.dev.*`）／導入事例（`sections.cases.*`）／ビジョンの位置・文字サイズ（`sections.vision.*`）／お問い合わせ背景のディザ（`cv.*`）／フォームのガラス（`cvfGlass.*`）／メニュー（`drawer.*`）／全体（`secHeadGap`・`formWidth` 等）。

## 対象外（🟡 仮置き・必要なら追加）
- **右グラフィックの“動き”の内部値**（軌道/メッシュ/粒などの `M/R/S/AC/B/G/L/RP` 系・約50個）。これらは**案（バリエーション）ごと**に保存先が分かれており、`params.mb`（全案共通のSP値）に載せると意味が合わないため対象外。SPでも動きを個別化したい場合は「案×PC/SP」の二重管理が要る（要相談）。
- `慣性の強さ`（`13 - v` の逆算式で、表示値と保存値が違うため単純な mbKey では扱えない）。
- 実績の`固定の長さ`（`rfxVh[選択中の案キー]` と保存先が実行時に変わる）。

## 検証（再発テスト）
`design-gallery/node_modules/playwright`（swiftshader）で localhost:8778 を開く。
- 起動エラー0・パネル行数・実つまみで「スマホモード→ `params.mb` に書く／PC基準値は不変／青印が付く」。
- 往復：PCでスマホモード編集→自動保存→**スマホ幅(390px)で開くと本体に反映**→PC基準値は元のまま。
- スクリプト実体は作業時のもの（scratchpad）。同等チェックを再実行して確かめる。

# 網走観光サイト（な〜んにもない たまらない）

Next.js 製の観光サイト。トップのキービジュアルは、吹き出し → 「な〜んにもない」→
「たまらない」→ ボタン → 人物イラスト、の順に出てくる登場アニメーションで構成されている。

## ローカルで動かす

```bash
npm install
npm run dev
```

http://localhost:3000 を開く。

## 本番

- URL: https://abashiri-site-v2.vercel.app
- Vercel Project: `abashiri-site-v2`（フォルダ: `abashiri/v2`）
- ✋ **手動デプロイ**。このフォルダの中で叩く:

```bash
npx vercel --prod --yes
```

> デプロイ前に `cat .vercel/project.json` で `projectName` が `abashiri-site-v2` か必ず確認。
> 詳細は [../../settings/docs/general/VERCEL-PROJECTS.md](../../settings/docs/general/VERCEL-PROJECTS.md)。

## 演出まわりの調整ファイル

数値をいじるだけで動きを変えられるように、パラメーターは設定ファイルに切り出してある。

| ファイル | 何を決めているか |
|---|---|
| [components/heroTiming.ts](components/heroTiming.ts) | 登場演出全体のタイミング（何秒後に何が出るか） |
| [components/bubbleConfig.ts](components/bubbleConfig.ts) | 吹き出しの形の補正、しっぽが伸びる演出、ムニムニ |
| [components/layoutConfig.ts](components/layoutConfig.ts) | キービジュアルの配置 |
| [components/birdConfig.ts](components/birdConfig.ts) | カモメの位置とふわふわ |
| [components/faceConfig.ts](components/faceConfig.ts) | 人物イラストの眉がマウスに反応する動き |

## 人物イラストの眉がマウスに反応する仕組み

右下の「たまんねーっ」の人物は、**元の PNG（`public/img/illust-main.png`）をそのまま出している**。
動かしたいのは眉だけなので、眉の形だけ [components/illustMainPaths.ts](components/illustMainPaths.ts) に
ベクターで持っていて、PNG の上に重ねてある。

重ね方（下 → 上）:

1. `illust-main.png`
2. 元の眉を隠す**肌色のパッチ**（動かない。眉の形を少し太らせたもの）
3. **動く眉**

止まっている時はパッチの上にぴったり眉が乗るので、見た目は元の PNG と変わらない。
眉が上がった時だけ、元の眉があった所がパッチの肌色で埋まって跡が残らない。

> 以前は全体をトレースして黒目も動かしていたが、元絵より線が甘くなるので取りやめた。
> その時のフルデータは git 履歴（`db5fcd1`）に残っている。

反応のさせ方は [components/useFaceReaction.ts](components/useFaceReaction.ts)。
⚠️ イラストは `pointer-events-none`（クリックがすり抜ける）のままにしたいので、
**CSS の `:hover` は使えない**。使うと後ろのキービジュアルのボタンをイラストが
覆ってしまう。なので window でカーソルを監視して、イラストの矩形に入ったかを
自前で判定している。

- **眉**: カーソルがイラストに乗っている間だけ、少し持ち上がる（既定 5px）
- 動きは 300ms・`--ease-standard` でふわっと。パキッとは切り替えない
- **スマホ**: 指で触っている間だけ反応する（離すと戻る）
- `prefers-reduced-motion` の時は動かさない

持ち上げ量と反応範囲は [components/faceConfig.ts](components/faceConfig.ts) で、
`/mock/face` の調整パネルから触りながら決められる。

イラストを描き直した時は [scripts/illust-trace.py](scripts/illust-trace.py) で
眉のパスを作り直す（手で書き換えない）。横顔の「ぼーっ」もPNGのまま。

## 比較用モックページ

`/mock/` 配下は認証不要で、実機（iPhone）で開いて触れる比較ページ。
採用案が決まったら不採用のモックは消す。

| URL | 中身 |
|---|---|
| `/mock/tail` | 吹き出しのしっぽが伸びる演出（5案） |
| `/mock/bubble` | 吹き出しのムニムニ（3案） |
| `/mock/bubble/tune` | 吹き出しの数値を触りながら確認する調整パネル |
| `/mock/tune` | 登場タイミングの調整パネル |
| `/mock/illust` | 人物イラストのスイング |
| `/mock/face` | 眉の反応の調整パネル（顔を拡大した確認窓つき） |
| `/mock/kv` / `/mock/layout` / `/mock/shadow` / `/mock/bird` | キービジュアル各種 |

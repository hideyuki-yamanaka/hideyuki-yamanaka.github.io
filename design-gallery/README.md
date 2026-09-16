This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## スクレイピング（新着の取り込み）

| いつ | どうやって |
|---|---|
| 自動 | 半日に1回（**朝9時・夜9時**）に GitHub Actions が走る |
| 手動 | 画面ヘッダー右上の「**今すぐ取り込む**」ボタン |

- 取り込みは GitHub 側で動く（Playwright でブラウザを開くので10分ほどかかる）。
  押した直後に一覧は変わらない。取り込み → コミット → 本番の作り直し、の順に進む。
- ボタンには最終取得（「3時間前」など）が出る。走っている間はクルクル回る。
- **トークン未設定でもボタンは使える**。押すと GitHub の Actions 画面が開くので
  そこで「Run workflow」を押す。ワンクリックで済ませたい時は `.env.example` の
  `GH_DISPATCH_TOKEN` を参照して Vercel に登録する。

### 本番の自動デプロイについて

このリポジトリはモノレポで、main に push すると Vercel がビルドを始める。
ただし `vercel.json` の `ignoreCommand` で **design-gallery を触っていない push は
ビルドをスキップ**するようにしてある（2026-09-17）。
他のプロダクトの作業で Vercel の1日100回の枠を食いつぶさないための措置。


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

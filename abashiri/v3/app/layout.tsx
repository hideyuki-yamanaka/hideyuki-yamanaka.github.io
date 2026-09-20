import type { Metadata } from "next";
import { Noto_Sans_JP, Inter } from "next/font/google";
import SoundUi from "@/components/SoundUi";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

/* v1.1 のカンプ（15071:24641 / 15176:2415）で指定されている書体。
   本文・見出しは Noto Sans JP、数字は Inter。ウェイトはカンプに出てくる4段だけ読む。 */
const noto = Noto_Sans_JP({
  /* 200(ExtraLight) は v1.1 のぼーっとスポット（本文・もっと見る）で使う */
  weight: ["100", "200", "300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

const inter = Inter({
  weight: ["100", "300", "400"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/* ⚠️ Zen Kaku Gothic New と M PLUS Rounded 1c は 2026-09-20 に読み込みをやめた。
   v1.0 の名残で残っていたが、実装を全文検索しても【使っている場所が1つも無かった】
   （globals.css の --font-zen-body / --font-rounded-num という定義があるだけで、
     その変数を参照している要素がゼロ）。
   日本語フォントは next/font が1ウェイトにつき20前後のサブセットに割るため、
   この2つだけで woff2 が約140ファイルあった。
   実測（本番・トップページ）: フォント 245ファイル / 3.06MB。
   ヒデさん「サイトがのっそり重い」の主因はここ。 */

export const metadata: Metadata = {
  title: "網走観光サイト｜な〜んにもない たまらない",
  description:
    "な〜んにもない、たまらない。北海道・網走でぼーっとする旅の観光サイト。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${noto.variable} ${inter.variable}`}
    >
      <body>
        {children}
        {/* 環境音はレイアウト常駐：ページを移動しても途切れず流れ続ける */}
        <SoundUi askConsent />
        {/* ページ遷移の幕（ブラー5案）。レイアウト常駐で全ページに効く */}
        <PageTransition />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Noto_Sans_JP, Inter, Zen_Kaku_Gothic_New, M_PLUS_Rounded_1c } from "next/font/google";
import SoundUi from "@/components/SoundUi";
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

/* v1.0 の書体。まだ差し替えていないセクション（スポット/グルメ/プロモ）が参照している。
   カンプが揃った時点で外す。 */
const zen = Zen_Kaku_Gothic_New({
  weight: ["500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-zen",
  display: "swap",
});

const rounded = M_PLUS_Rounded_1c({
  weight: ["100", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-rounded",
  display: "swap",
});

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
      className={`${noto.variable} ${inter.variable} ${zen.variable} ${rounded.variable}`}
    >
      <body>
        {children}
        {/* 環境音はレイアウト常駐：ページを移動しても途切れず流れ続ける */}
        <SoundUi askConsent />
      </body>
    </html>
  );
}

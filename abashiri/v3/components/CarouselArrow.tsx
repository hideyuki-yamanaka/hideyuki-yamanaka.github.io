"use client";

/*
 * 左右に送るカルーセルの丸いボタン（共通の部品）
 * 使っている所：ぼーっと体験ページの場所えらび（青い地の上・onDark）／トップの体験セクション 案2 の送りボタン
 *   （白い地の上・onLight・束の下に2つ並べる。EventNav.tsx。2026-10-14 まで束の左右に置いていたが、流れる文字に重なるのでやめた）
 *
 * 形は場所えらびのボタン（2026-08 の v1.2 ボタン共通仕様）のまま：丸・内側に1pxの線・すりガラス（blur65）・シェブロンの線の太さ 1.6
 * 地の色は2通り
 *   onDark … 青い地や写真の上。地 white/10・線 white/40・矢印 白（場所えらび。キービジュアルの「ぼーっとしてみる」と同じ）
 *     2026-10-28 から地・線・ぼかしは全ページ共通のガラスのボタン（globals.css の .glass-btn。調整パネルで一括に変わる）
 *   2026-10-29 から onLight も同じ見た目（白いガラス・白い矢印）。tone は置き場所の目印として残している
 *   onLight … 白い地・薄い水色の地の上。地 white/30・線 ブランドの青 25%・矢印 ブランドの青・すりガラス（blur65）
 *     【2026-10-21 ヒデさん】①「グレーの惑星みたいな感じではなく、キービジュアルのぼーっとしてみるのボタンみたいに。見にくければ視認性を」
 *       → いったん ブランドの青 80% の丸に白い矢印にした
 *     ②「トップのガラスっぽい表現を真似て。真っ白だと見えないので、ほんのり青を入れるなど視認性を工夫して。案を5つぐらい」
 *       → 送りボタンを 現行＋10案 から選べるようにして見比べ
 *     ③ 同日「ボタンは9番でいきましょう。青い枠線で、シェブロンも青のやつ。それ以外の案は調整パネルからも全部削除」
 *       ＝案9 青いふちのガラス に決定。白30%のすりガラスに、縁だけブランドの青 25%（白い地でも縁で丸だと分かる）・矢印もブランドの青
 *     （その前は 地 white/70・線 black/20・矢印 black/80＝灰色の丸）
 * 大きさ：md＝68px・矢印 24px（既定・場所えらび・2026-10-30 から体験セクションの送りボタンの PC も）／sm＝48px・矢印 20px
 *         nav＝56px・矢印 20px（2026-10-30 まで体験セクションの送りボタンの PC）／nav-sm＝44px・矢印 16px（同 スマホ）
 * 置き場所（どこに出すか）は使う側が className / style で決める
 */
const SIZE = {
  md: { box: "size-[68px]", icon: "size-[24px]" },
  sm: { box: "size-[48px]", icon: "size-[20px]" },
  nav: { box: "size-[56px]", icon: "size-[20px]" },
  "nav-sm": { box: "size-[44px]", icon: "size-[16px]" },
} as const;

export default function CarouselArrow({
  dir,
  onClick,
  label,
  tone = "onDark",
  size = "md",
  className = "",
  style,
}: {
  dir: "left" | "right";
  onClick: () => void;
  /** 読み上げ用の名前（例: 前の場所へ） */
  label: string;
  tone?: "onDark" | "onLight";
  size?: keyof typeof SIZE;
  className?: string;
  style?: React.CSSProperties;
}) {
  const s = SIZE[size];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={style}
      className={`${className} flex ${s.box} cursor-pointer items-center justify-center rounded-full transition-colors duration-300 ease-standard ${
        /* 【2026-10-29 ヒデさん「体験セクションの下のカルーセルのシェブロンのボタンは、キービジュアルの『ぼーっとしてみる』のボタンに合わせる。中身のシェブロンも白で」】
           → onLight も onDark と同じ全ページ共通のガラスのボタン・白い矢印にした
           【2026-10-30 ヒデさん「体験セクションの下のカルーセルのボタンが見にくいので、見やすくなるような5パターン。トンマナに気を使って」】
           → onLight は見た目を globals.css の .ev-nav-btn に任せる（既定＝今のガラス。html[data-ev-nav]＝1〜5 で5つの案・調整パネル） */
        tone === "onLight" ? "ev-nav-btn" : "glass-btn glass-hover text-white"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" className={s.icon} aria-hidden>
        <path
          d={dir === "left" ? "M15 5L8 12l7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

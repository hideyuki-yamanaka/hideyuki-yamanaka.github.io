"use client";

/*
 * 左右に送るカルーセルの丸いボタン（共通の部品）
 * 使っている所：ぼーっと体験ページの場所えらび（青い地の上）／トップの体験セクション 案2 の送りボタン「案4 丸いボタンを下に」
 *   （白い地の上・束の下に2つ並べる。EventNav.tsx。2026-10-14 まで束の左右に置いていたが、流れる文字に重なるのでやめた）
 *
 * 形と大きさは場所えらびのボタン（2026-08 の v1.2 ボタン共通仕様）のまま：
 *   68px の丸・内側に1pxの線・すりガラス（blur65）・シェブロンは 24px・線の太さ 1.6
 * 地の色だけ2通り（2026-10-14 体験セクションに使うため白い地用を足した）
 *   onDark … 青い地や写真の上。地 white/10・線 white/40・矢印 白（場所えらびのまま）
 *   onLight … 白い地の上。地 white/70・線 black/20・矢印 black/80（流れる文字と同じ濃さ）🟡仮置き
 * 大きさ：md＝68px（既定）／sm＝48px・矢印 20px（スマホの体験セクション。画面が狭いため・2026-10-14 🟡仮置き）
 * 置き場所（どこに出すか）は使う側が className / style で決める
 */
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
  size?: "md" | "sm";
  className?: string;
  style?: React.CSSProperties;
}) {
  const onLight = tone === "onLight";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={style}
      className={`${className} flex ${size === "sm" ? "size-[48px]" : "size-[68px]"} cursor-pointer items-center justify-center rounded-full ring-1 ring-inset backdrop-blur-65 transition-colors duration-300 ease-standard ${
        onLight ? "bg-white/70 ring-black/20 hover:bg-white" : "bg-white/10 ring-white/40 hover:bg-white/25"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" className={size === "sm" ? "size-[20px]" : "size-[24px]"} aria-hidden>
        <path
          d={dir === "left" ? "M15 5L8 12l7 7" : "M9 5l7 7-7 7"}
          stroke={onLight ? "rgba(0,0,0,0.8)" : "white"}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

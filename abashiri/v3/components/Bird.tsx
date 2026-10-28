/*
 * 新規描き起こしのカモメ（コマ切り替えのGIF風パタパタ）
 * variant:
 *  - "flap"    2コマ・大きめの羽ばたき（下げコマもアーチを残した曲線）
 *  - "soft"    2コマ・カモメらしい「〜」の曲線を両コマともキープした控えめ版
 *  - "smooth3" 3コマ・上げ→中間→下げ→中間 のなめらか版
 */
export type BirdVariant = "flap" | "soft" | "smooth3";

const FRAMES: Record<BirdVariant, string[]> = {
  /* 【2026-10-28 ヒデさん「羽ばたくモーションの時に、真ん中の接続部の切れ目がガタガタして綺麗ではない。もう少し滑らかなパスに」】
     原因：真ん中のつなぎ目が小さな折れ曲がり（上げた形は曲がりの半径 2.25・下げた形は 26.6度の角）で、
     線の太さ（半分で 3.5〜4）より急に曲がるので、線の内側が折り重なってガタついて見えていた。
     → 羽の形はそのまま（元の曲線を途中で切っただけ）、真ん中だけ向きがなめらかにつながる曲線に描き直した。
       上げた形：谷の曲がりの半径 5（底は 36→34 と少し浅く）／下げた形：角を無くし、山の頂上 29 は元のまま
     前の形：上げ "M12 32 C26 13 44 11 57 34 Q60 38 63 34 C76 11 94 13 108 32"／下げ "M12 52 C26 48 38 30 56 30 Q60 28 64 30 C82 30 94 48 108 52" */
  flap: [
    "M12 32 C25.52 13.65 42.78 11.16 55.66 31.74 C57.7 35 62.3 35 64.34 31.74 C77.22 11.16 94.48 13.65 108 32",
    "M12 52 C24.6 48.4 35.58 33.46 50.77 30.51 C53.72 29.94 57 29 60 29 C63 29 66.28 29.94 69.23 30.51 C84.42 33.46 95.4 48.4 108 52",
  ],
  soft: [
    "M11 36 C26 18 44 16 57 35 Q60 39 63 35 C76 16 94 18 109 36",
    "M10 44 C26 29 44 25 57 35 Q60 38 63 35 C76 25 94 29 110 44",
  ],
  smooth3: [
    "M12 32 C26 13 44 11 57 34 Q60 38 63 34 C76 11 94 13 108 32",
    "M10 40 C24 22 44 19 57 34 Q60 38 63 34 C76 19 96 22 110 40",
    "M12 52 C26 48 38 30 56 30 Q60 28 64 30 C82 30 94 48 108 52",
  ],
};

const FRAME_CLASSES: Record<number, string[]> = {
  2: ["bird-frame-a", "bird-frame-b"],
  3: ["bird3-a", "bird3-m", "bird3-b"],
};

type BirdProps = {
  variant?: BirdVariant;
  color?: string;
  flapDuration?: number;
  driftDuration?: number;
  delay?: number;
  /** 線の太さ（SVG座標系 viewBox 120 基準） */
  strokeWidth?: number;
  className?: string;
};

export default function Bird({
  variant = "flap",
  color = "#ffffff",
  flapDuration = 0.55,
  driftDuration = 8,
  delay = 0,
  strokeWidth = 7,
  className,
}: BirdProps) {
  const frames = FRAMES[variant];
  const classes = FRAME_CLASSES[frames.length];
  const frameStyle = {
    animationDuration: `${flapDuration * (frames.length === 3 ? 1.6 : 1)}s`,
    animationDelay: `${delay * 0.5}s`,
  };
  return (
    <div
      className={`bird-drift ${className ?? "h-full w-full"}`}
      style={{ animationDuration: `${driftDuration}s`, animationDelay: `${delay}s` }}
    >
      <svg viewBox="0 0 120 64" className="h-full w-full" fill="none">
        {frames.map((d, i) => (
          <g key={i} className={classes[i]} style={frameStyle}>
            <path
              d={d}
              strokeLinecap="round"
              strokeLinejoin="round"
              /* 色と太さは調整パネルのCSS変数で上書きできる（既定は従来値）。2026-08-23 */
              style={{
                stroke: `var(--bird-color, ${color})`,
                strokeWidth: `calc(${strokeWidth}px * var(--bird-stroke, 1))`,
              }}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

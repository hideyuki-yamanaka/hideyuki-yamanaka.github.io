/* eslint-disable @next/next/no-img-element */
/* サイトの作字ロゴ（吹き出し「な〜んにもない たまらない」＋右上の「網走市観光サイト」のセット）。
 * 【2026-09-26】ハンバーガーメニューにも同じものを入れるため、フッター（SiteFooter の Logo）と
 *  同じ位置関係で部品にした。位置関係は KV（TopPage）の実測値：
 *    作字ブロック        415 x 379
 *    網走市観光サイト     (215.7, 8.3) 188.2 x 36.3   ← 吹き出しの右上
 *    作字（471x390のSVG） (-28, 13.1)                 ← SVGの余白ぶん左上へずらす
 *  ブロックごと拡大縮小するので、位置関係は崩れない。
 *  tone: light = 写真や青の上（白い吹き出し＋白文字）／ blue = 白地の上（反転版） */
const W = 415;
const H = 379;

export default function SiteLogo({
  height,
  tone = "light",
  className = "",
}: {
  height: number;
  tone?: "light" | "blue";
  className?: string;
}) {
  const s = height / H;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ height, width: W * s }}>
      <div
        className="absolute left-0 top-0"
        style={{ width: W, height: H, transformOrigin: "top left", transform: `scale(${s})` }}
      >
        <img
          src={tone === "light" ? "/img/text-kanko-site.svg" : "/img/text-kanko-site-blue.svg"}
          alt="網走市観光サイト"
          className="absolute"
          style={{ left: 215.7, top: 8.3, width: 188.2, height: 36.3 }}
        />
        <img
          src={tone === "light" ? "/img/hero-message.svg" : "/img/hero-message-blue.svg"}
          alt="な〜んにもない たまらない"
          className="absolute max-w-none"
          style={{ left: -28, top: 13.1, width: 471, height: 390 }}
        />
      </div>
    </div>
  );
}

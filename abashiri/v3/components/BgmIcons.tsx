"use client";

/*
 * 左上の音のスイッチ（ON／OFF）のアイコン 5案のモック（2026-10-20）
 *
 * 【ヒデさん】「トップページの左上にあるオンオフのアイコン、作り込みが簡素なので、もう少しリッチなアイコンに。
 *   5パターンぐらい。オンオフ1セットで。ベタ塗りの案も。ベタ塗りの中でも、濃い青と薄い青のような多色の案も」
 *   →「作成したらモックとして入れてみて」
 * → 調整パネル › サイト共通 › バリエーション › 環境音（BGM）› アイコン で切り替える（0＝今のまま＝img の絵）。
 *   色はサイトの色だけ（Brand_Primary #0070c9／Brand_SkyTop #35c3ea／Brand_SkyBottom #b5d7ff／Shadow_Base #005fb3／白）。
 *   大きさは 20px🟡（今の 16px より一回り大きくして描き込みを見せる・4の倍数）。
 *   絵は 24×24 の中に描く（スピーカーは同じ形を全案で使い、線・塗り・色だけ変える）。
 */
import { useId } from "react";

export const BGM_ICON_VARIANTS: Record<number, { name: string; note: string }> = {
  1: { name: "くっきり線（波がゆらぐ）", note: "今の線の絵を、太く角の丸い線で描き直し。鳴っている間は音の波2本がゆっくり明滅する。OFF は斜線ではなく右に「×」" },
  2: { name: "ベタ塗り（青1色）", note: "白い丸に、塗りつぶしたスピーカーと太い波。いちばん素直なベタ塗り" },
  3: { name: "ベタ塗り（濃い青×薄い青）", note: "丸を薄い青（Brand_SkyBottom）で塗り、スピーカーと波を濃い青（Brand_Primary）で。2色だけのやわらかい形" },
  4: { name: "ベタ塗り（空のグラデの丸）", note: "丸を空の色のグラデ（Brand_SkyTop→Brand_Primary）で塗り、白いスピーカー。外側の波だけ薄い青。縁に白い輪" },
  5: { name: "ガラス玉（立体・3色）", note: "白から薄い青へのふくらんだ丸＋上のつや。スピーカーは影の青と濃い青の2段、波は濃い青と空の青。いちばん作り込んだ形" },
  6: { name: "音の波（バー）", note: "【ヒデさんの見本から・2026-10-20】丸の背景なし。角の丸い縦の棒5本（短・中・長・中・短）の音の波。OFF は斜線を引き、斜線の周りは棒を切り欠く。色は横の ON／OFF の文字と同じ（空の上は白・白い場面は濃い灰色・選んでいる側は青い地に白）" },
};
/** 既定の案（調整パネルの既定と、パネルの無いページで保存値が無い時に使う）。🟡 2026-10-20 ヒデさんの見本の「音の波」 */
export const BGM_ICON_DEFAULT = 6;
/** 横の文字の色（currentColor）で描く案。選んでいない側の薄さは文字の色が受け持つので、絵の薄がけはしない */
export const BGM_ICON_TEXT_COLOR = new Set([6]);

/* 案6 音の波：24×24 の中に、幅3.2・間1.8の棒を5本（見本の比率：短 6／中 12／長 20）。
   OFF の斜線は見本の角度（左上→右下）で、太さ 2.4・周りを 1.2 ずつ切り欠く */
const BARS = [
  { x: 0.4, h: 6 },
  { x: 5.4, h: 12 },
  { x: 10.4, h: 20 },
  { x: 15.4, h: 12 },
  { x: 20.4, h: 6 },
];
const SLASH = { x1: 2.4, y1: 3.4, x2: 20.4, y2: 20.4 };

/* スピーカーの形（全案共通・24×24） */
const SPEAKER = "M5.5 10.3c0-.44.36-.8.8-.8h2.2l3.37-2.7c.52-.42 1.3-.05 1.3.62v9.16c0 .67-.78 1.04-1.3.62L8.5 14.5H6.3a.8.8 0 0 1-.8-.8v-3.4Z";
/* 2色に塗り分ける時の、後ろの箱と前のラッパ */
const BOX = "M6.3 9.5h2.2v5H6.3a.8.8 0 0 1-.8-.8v-3.4c0-.44.36-.8.8-.8Z";
const CONE = "M8.5 9.5l3.37-2.7c.52-.42 1.3-.05 1.3.62v9.16c0 .67-.78 1.04-1.3.62L8.5 14.5Z";
/* 音の波（内・外）と、OFF の「×」 */
const W1 = "M15.2 9.8a3.1 3.1 0 0 1 0 4.4";
const W2 = "M17.4 7.7a6.1 6.1 0 0 1 0 8.6";
const X = "M15.7 10.1l3.8 3.8M19.5 10.1l-3.8 3.8";

const BLUE = "#0070c9";
const SKY_TOP = "#35c3ea";
const SKY_BOTTOM = "#b5d7ff";
const DEEP = "#005fb3";

export function BgmIcon({ variant, kind, playing }: { variant: number; kind: "on" | "off"; playing?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const on = kind === "on";
  const line = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let body: React.ReactNode = null;
  if (variant === 1) {
    body = (
      <>
        <circle cx="12" cy="12" r="12" fill="#fff" />
        <path d={SPEAKER} {...line} stroke={BLUE} strokeWidth="1.5" />
        {on ? (
          <g className={playing ? "bgm-ico-waves" : undefined}>
            <path d={W1} {...line} stroke={BLUE} strokeWidth="1.5" className="bgm-w1" />
            <path d={W2} {...line} stroke={BLUE} strokeWidth="1.5" className="bgm-w2" />
          </g>
        ) : (
          <path d={X} {...line} stroke={BLUE} strokeWidth="1.5" />
        )}
      </>
    );
  } else if (variant === 2) {
    body = (
      <>
        <circle cx="12" cy="12" r="12" fill="#fff" />
        <path d={SPEAKER} fill={BLUE} stroke={BLUE} strokeWidth="0.8" strokeLinejoin="round" />
        {on ? (
          <>
            <path d={W1} {...line} stroke={BLUE} strokeWidth="1.8" />
            <path d={W2} {...line} stroke={BLUE} strokeWidth="1.8" />
          </>
        ) : (
          <path d={X} {...line} stroke={BLUE} strokeWidth="1.8" />
        )}
      </>
    );
  } else if (variant === 3) {
    body = (
      <>
        <circle cx="12" cy="12" r="12" fill={SKY_BOTTOM} />
        <path d={SPEAKER} fill={BLUE} stroke={BLUE} strokeWidth="0.8" strokeLinejoin="round" />
        {on ? (
          <>
            <path d={W1} {...line} stroke={BLUE} strokeWidth="1.8" />
            <path d={W2} {...line} stroke={BLUE} strokeWidth="1.8" />
          </>
        ) : (
          <path d={X} {...line} stroke={BLUE} strokeWidth="1.8" />
        )}
      </>
    );
  } else if (variant === 4) {
    body = (
      <>
        <defs>
          <linearGradient id={`g${uid}`} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={SKY_TOP} />
            <stop offset="1" stopColor={BLUE} />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="12" fill={`url(#g${uid})`} />
        <circle cx="12" cy="12" r="11.4" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.2" />
        <path d={SPEAKER} fill="#fff" stroke="#fff" strokeWidth="0.8" strokeLinejoin="round" />
        {on ? (
          <>
            <path d={W1} {...line} stroke="#fff" strokeWidth="1.8" />
            <path d={W2} {...line} stroke={SKY_BOTTOM} strokeWidth="1.8" />
          </>
        ) : (
          <path d={X} {...line} stroke="#fff" strokeWidth="1.8" />
        )}
      </>
    );
  } else if (variant === 6) {
    const bars = (
      <>
        {BARS.map((b) => (
          <rect key={b.x} x={b.x} y={12 - b.h / 2} width="3.2" height={b.h} rx="1.6" fill="currentColor" />
        ))}
      </>
    );
    body = on ? (
      bars
    ) : (
      <>
        <defs>
          {/* 斜線の周りだけ棒を消す（すき間 1.2 ずつ） */}
          <mask id={`m${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#fff" />
            <line {...SLASH} stroke="#000" strokeWidth="4.8" strokeLinecap="round" />
          </mask>
        </defs>
        <g mask={`url(#m${uid})`}>{bars}</g>
        <line {...SLASH} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </>
    );
  } else if (variant === 5) {
    body = (
      <>
        <defs>
          <radialGradient id={`r${uid}`} cx="9" cy="7" r="17" gradientUnits="userSpaceOnUse">
            <stop offset="0.35" stopColor="#fff" />
            <stop offset="1" stopColor={SKY_BOTTOM} />
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="12" fill={`url(#r${uid})`} />
        {/* 下の縁にうっすら空の青＝丸がふくらんで見える */}
        <circle cx="12" cy="12" r="11.5" fill="none" stroke={SKY_TOP} strokeOpacity="0.45" strokeWidth="1" />
        {/* 上のつや */}
        <ellipse cx="11" cy="5.6" rx="6.4" ry="2.8" fill="#fff" fillOpacity="0.85" />
        <path d={BOX} fill={DEEP} stroke={DEEP} strokeWidth="0.8" strokeLinejoin="round" />
        <path d={CONE} fill={BLUE} stroke={BLUE} strokeWidth="0.8" strokeLinejoin="round" />
        {on ? (
          <>
            <path d={W1} {...line} stroke={BLUE} strokeWidth="1.8" />
            <path d={W2} {...line} stroke={SKY_TOP} strokeWidth="1.8" />
          </>
        ) : (
          <path d={X} {...line} stroke={BLUE} strokeWidth="1.8" />
        )}
      </>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={`bgm-ico size-[20px] shrink-0 ${BGM_ICON_TEXT_COLOR.has(variant) ? "bgm-ico-cc" : ""}`} aria-hidden>
      {body}
    </svg>
  );
}

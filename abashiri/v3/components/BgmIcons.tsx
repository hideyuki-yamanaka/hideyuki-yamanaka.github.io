"use client";

/*
 * 左上の音のスイッチ（ON／OFF）のアイコン「音の波」（2026-10-20 決定）
 *
 * 【ヒデさん】「作り込みが簡素なので、もう少しリッチなアイコンに」→ 5案のモック →
 *   見本（音の波の棒5本・OFF は斜線）から作った案に決定：「オンオフは新しく追加した波の案で、
 *   他のバリエーションの案は削除して大丈夫です」。前の絵（白い丸＋細い線のスピーカー）と5案は消した
 *   （戻す時は git の記録。2026-10-20 の「音のアイコン5案」のコミット）。
 *
 * - 丸の背景なし。角の丸い縦の棒5本（短・中・長・中・短）。24×24 の中に、幅3.2・間1.8・高さ 6／12／20
 * - OFF は左上→右下の斜線（太さ2.4）。斜線の周りは棒を1.2ずつ切り欠く
 * - 色は横の ON／OFF の文字と同じ（currentColor）。空の上の選んでいない側は白50%・
 *   白い場面（html[data-header-dark]）では濃い灰色・選んでいる側は青い地に白。文字と一緒に変わる
 * - 大きさは 20px🟡
 */
import { useId } from "react";

const BARS = [
  { x: 0.4, h: 6 },
  { x: 5.4, h: 12 },
  { x: 10.4, h: 20 },
  { x: 15.4, h: 12 },
  { x: 20.4, h: 6 },
];
const SLASH = { x1: 2.4, y1: 3.4, x2: 20.4, y2: 20.4 };

export function BgmWaveIcon({ kind, className = "size-[20px]" }: { kind: "on" | "off"; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const bars = (
    <>
      {BARS.map((b) => (
        <rect key={b.x} x={b.x} y={12 - b.h / 2} width="3.2" height={b.h} rx="1.6" fill="currentColor" />
      ))}
    </>
  );
  return (
    <svg viewBox="0 0 24 24" className={`bgm-ico shrink-0 ${className}`} aria-hidden>
      {kind === "on" ? (
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
      )}
    </svg>
  );
}

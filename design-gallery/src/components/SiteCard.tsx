"use client";

import { memo, useState } from "react";
import {
  SiteEntry,
  SOURCE_LABELS,
  SOURCE_COLORS,
  SIGNAL_LABELS,
  SiteSignal,
} from "@/types";

/** カードに出す制作タグのハッシュタグ表示順 */
const SIGNAL_DISPLAY_ORDER: SiteSignal[] = ["framer", "studio", "production"];

interface SiteCardProps {
  site: SiteEntry;
  selected: boolean;
  onSelect: (id: string, e: { shiftKey: boolean; metaKey: boolean }) => void;
  onToggleStar: (id: string) => void;
}

/** "2024-09" → "2024年9月にキュレーション" */
function formatCuratedAt(yyyymm: string): string {
  const m = yyyymm.match(/^(\d{4})-(\d{2})$/);
  if (!m) return yyyymm;
  return `${m[1]}年${parseInt(m[2], 10)}月`;
}

export const SiteCard = memo(function SiteCard({
  site,
  selected,
  onSelect,
  onToggleStar,
}: SiteCardProps) {
  const [hovered, setHovered] = useState(false);
  // 制作クレジットの全文ホバー表示用ステート。
  // 省略(...)されてても、ホバーで全文がふわっと出る保険的なツールチップ。
  const [agencyHovered, setAgencyHovered] = useState(false);

  return (
    <div
      data-site-id={site.id}
      className={`group relative rounded-xl bg-bg-secondary transition-shadow duration-200 cursor-pointer ${
        selected ? "outline outline-2 outline-blue-500 outline-offset-2" : ""
      }`}
      style={{
        boxShadow: hovered
          ? "var(--card-shadow-hover)"
          : "var(--card-shadow)",
        // View Transitions API 用の識別名。確認済みチェックでカードが消える時に、
        // ブラウザがこの名前でカード単位のスナップショットを撮って、
        // 消えるカードはフェード・残るカードは新しい位置へ滑らかに動かす。
        viewTransitionName: `card-${site.id}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => onSelect(site.id, { shiftKey: e.shiftKey, metaKey: e.metaKey })}
    >
      {/* サムネイル */}
      <div className="relative overflow-hidden bg-gray-100 rounded-t-xl aspect-[4/3]">
        <img
          src={site.thumbnailUrl}
          alt={site.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          draggable={false}
        />

        {/* ホバーオーバーレイ */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

        {/* DONEチェック（左上・常時うっすら表示） */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(site.id);
          }}
          className={`absolute top-2.5 left-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 z-10 ${
            site.starred
              ? "bg-emerald-500 text-white shadow-md"
              : hovered
                ? "bg-white/90 text-gray-400 hover:bg-emerald-500 hover:text-white shadow-sm"
                : "bg-white/50 text-gray-300 shadow-sm"
          }`}
          title={site.starred ? "未確認に戻す" : "確認済みにする"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* 日付（ホバー時・左上チェックの右） */}
        <div
          className={`absolute top-3 left-12 text-[12px] font-medium text-white drop-shadow transition-opacity duration-200 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        >
          {site.date}
        </div>

        {/* 外部リンク（ホバー時・右上） */}
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all duration-200 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
          title="サイトを開く"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>

        {/* 引用元バッジ（右下）。pickup（手動シード枠）は 2026-07-21 ヒデさん指示で
            バッジ非表示（内部的なソース名で、出典メディアではないため） */}
        {site.source !== "pickup" && (
          <div
            className={`absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold text-white tracking-wide transition-opacity duration-200 ${
              hovered ? "opacity-100" : "opacity-80"
            }`}
            style={{ backgroundColor: SOURCE_COLORS[site.source] }}
          >
            {SOURCE_LABELS[site.source]}
          </div>
        )}
      </div>

      {/* カード情報 */}
      <div className="px-3 py-3">
        <h3 className="text-[14px] font-semibold text-text-primary truncate leading-tight">
          {site.title}
        </h3>
        {/* 制作タグ（ハッシュタグ表記: #Framer / #Studio / #制作会社） */}
        {site.signals && site.signals.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
            {SIGNAL_DISPLAY_ORDER.filter((sig) => site.signals?.includes(sig)).map((sig) => (
              <span
                key={sig}
                className="text-[10px] font-medium text-text-secondary/80 tracking-tight"
              >
                #{SIGNAL_LABELS[sig]}
              </span>
            ))}
          </div>
        )}
        {/* キュレーション日 + クレジット（制作会社・デザイナー）
            旧: ドメイン表示+コピー → 削除（ホバー時の外部リンクボタンで開ける）
            新: いつ取得されたサイトか + 誰が作ったか */}
        <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-text-secondary/70 min-w-0">
          {/* キュレーション日 */}
          <span
            className="inline-flex items-center gap-1 shrink-0 tabular-nums"
            title={`キュレーション日: ${site.date}`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {formatCuratedAt(site.date)}
          </span>
          {/* クレジット（制作会社／作り手）— ある時だけ表示。
              省略表示中でも、ホバーで全文ツールチップが出るようにしてある。
              アイコンと会社名はカード内で少し強調（text-text-secondary, medium）して
              「これは制作者情報や」と見て分かるようにしてる。 */}
          {site.agency && (
            <>
              <span className="text-text-secondary/30 shrink-0">·</span>
              <span
                className="inline-flex items-center gap-1 min-w-0 relative cursor-default"
                onMouseEnter={() => setAgencyHovered(true)}
                onMouseLeave={() => setAgencyHovered(false)}
              >
                <svg
                  className="w-3 h-3 shrink-0 text-text-secondary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="truncate font-medium text-text-secondary">
                  {site.agency}
                </span>

                {/* カスタムツールチップ: ホバー時に全文表示。
                    - whitespace-nowrap で必ず1行に。日本語の文字単位改行を防ぐ。
                    - inline-block + w-max で中身の幅ぴったりにする。
                    - pointer-events-none で領域から外れたらすぐ消える。 */}
                {agencyHovered && (
                  <span
                    role="tooltip"
                    className="absolute left-0 bottom-full mb-2 z-50 inline-block w-max max-w-[min(320px,80vw)] px-2.5 py-1.5 rounded-md bg-gray-900 text-white text-[12px] font-normal leading-snug shadow-xl pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    <span className="opacity-60">制作: </span>
                    <span className="font-medium">{site.agency}</span>
                    {/* 三角の矢印（下向き） */}
                    <span
                      className="absolute top-full left-3 w-0 h-0"
                      style={{
                        borderLeft: "4px solid transparent",
                        borderRight: "4px solid transparent",
                        borderTop: "4px solid rgb(17 24 39)",
                      }}
                    />
                  </span>
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
},
(prev, next) =>
  prev.site.id === next.site.id &&
  prev.site.starred === next.site.starred &&
  prev.site.date === next.site.date &&
  prev.site.agency === next.site.agency &&
  prev.selected === next.selected
);

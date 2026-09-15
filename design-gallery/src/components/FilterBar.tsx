"use client";

import { useState } from "react";
import {
  SourceSite,
  SOURCE_LABELS,
  SOURCE_COLORS,
  FilterState,
  SiteSignal,
} from "@/types";
import { dateRange as globalDateRange } from "@/data/load-sites";
import { FilterModal } from "./FilterModal";

interface FilterBarProps {
  filter: FilterState;
  updateFilter: (partial: Partial<FilterState>) => void;
  toggleSource: (source: SourceSite) => void;
  onClearSources: () => void;
  resetFilter: () => void;
  signalCounts?: Partial<Record<SiteSignal, number>>;
}

// 2026-09-15: ヒデさん指示で並び替え。日本のメディアを左にまとめ、
// 唯一の海外ソースである Awwwards は一番右へ。
const sources: SourceSite[] = [
  "sankou",
  "81web",
  "muuuuu",
  "webdesignclip",
  "s5style",
  "awwwards",
  // "pickup" はソースとしては存在するが、ピル（絞り込みボタン）は 2026-07-19 に
  // ヒデさん指示で非表示化。エントリ自体は「すべて」フィードに流れ続ける。
];

export function FilterBar({
  filter,
  updateFilter,
  toggleSource,
  onClearSources,
  signalCounts,
}: FilterBarProps) {
  const [showModal, setShowModal] = useState(false);
  const allSourcesActive = filter.sources.length === 0;

  // Filter ボタンのバッジ（デフォルトでないフィルタが何個かかってるか）
  const nonDefaultCount =
    (filter.sortOrder !== "newest" ? 1 : 0) +
    (filter.dateRange[0] !== globalDateRange[0] ||
    filter.dateRange[1] !== globalDateRange[1]
      ? 1
      : 0) +
    filter.signals.length;

  return (
    <>
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-bg-secondary flex-wrap">
        {/* メディア: ブランド色の丸ピル */}
        <button
          onClick={onClearSources}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
            allSourcesActive
              ? "bg-text-primary text-white"
              : "text-text-secondary hover:bg-bg-primary"
          }`}
        >
          すべて
        </button>
        {sources.map((source) => {
          const active = filter.sources.includes(source);
          return (
            <button
              key={source}
              onClick={() => toggleSource(source)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                active
                  ? "text-white"
                  : "text-text-secondary hover:bg-bg-primary"
              }`}
              style={active ? { backgroundColor: SOURCE_COLORS[source] } : {}}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: SOURCE_COLORS[source] }}
              />
              {SOURCE_LABELS[source]}
            </button>
          );
        })}

        {/* 右端: 統合フィルターボタン */}
        <div className="ml-auto flex items-center gap-3 text-[12px] text-text-secondary">
          <button
            onClick={() => setShowModal(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
              nonDefaultCount > 0
                ? "border-text-primary text-text-primary bg-bg-primary"
                : "border-border text-text-secondary hover:border-text-primary/50 hover:text-text-primary"
            }`}
            title="フィルターを開く"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            フィルター
            {nonDefaultCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold">
                {nonDefaultCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showModal && (
        <FilterModal
          filter={filter}
          updateFilter={updateFilter}
          onClose={() => setShowModal(false)}
          signalCounts={signalCounts}
        />
      )}
    </>
  );
}

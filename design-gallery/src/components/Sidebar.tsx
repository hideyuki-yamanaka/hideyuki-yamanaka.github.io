"use client";

import { useState } from "react";
import {
  SourceSite,
  SOURCE_LABELS,
  SOURCE_COLORS,
  Category,
  CATEGORY_LABELS,
  DesignTaste,
  TASTE_LABELS,
  FilterState,
} from "@/types";
import { dateRange as globalDateRange } from "@/data/load-sites";

interface SidebarProps {
  filter: FilterState;
  updateFilter: (partial: Partial<FilterState>) => void;
  resetFilter: () => void;
  toggleSource: (source: SourceSite) => void;
}

function SectionTitle({
  children,
  open,
  onToggle,
}: {
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-text-sidebar/60 hover:text-text-sidebar/80 transition-colors"
    >
      {children}
      <svg
        className={`w-3 h-3 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
}

function CheckItem({
  label,
  checked,
  onChange,
  color,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  color?: string;
  count?: number;
}) {
  return (
    <button
      onClick={onChange}
      className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-[14px] transition-colors rounded-md mx-0 ${
        checked
          ? "text-text-sidebar-active bg-bg-sidebar-hover"
          : "text-text-sidebar hover:text-text-sidebar-active hover:bg-bg-sidebar-hover"
      }`}
    >
      <span
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          checked ? "bg-accent border-accent" : "border-text-sidebar/30"
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {color && (
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="truncate flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className="text-[12px] text-text-sidebar/40">{count}</span>
      )}
    </button>
  );
}

export function Sidebar({
  filter,
  updateFilter,
  resetFilter,
  toggleSource,
}: SidebarProps) {
  const [openSections, setOpenSections] = useState({
    source: true,
    category: true,
    taste: false,
    agency: false,
    date: true,
  });

  const toggle = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sources: SourceSite[] = ["sankou", "81web", "muuuuu", "webdesignclip"];
  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  const tastes = Object.keys(TASTE_LABELS) as DesignTaste[];

  // 日付をスライダー用インデックスに変換
  const allMonths = generateMonths(globalDateRange[0], globalDateRange[1]);
  const fromIdx = Math.max(0, allMonths.indexOf(filter.dateRange[0]));
  const toIdx = Math.max(allMonths.length - 1, allMonths.indexOf(filter.dateRange[1]));

  const hasActiveFilter =
    filter.sources.length > 0 ||
    filter.categories.length > 0 ||
    filter.tastes.length > 0 ||
    filter.agencyOnly ||
    filter.starredOnly ||
    filter.dateRange[0] !== globalDateRange[0] ||
    filter.dateRange[1] !== globalDateRange[1];

  return (
    <aside className="w-[var(--sidebar-width)] bg-bg-sidebar flex flex-col shrink-0 h-full">
      {/* お気に入りフィルター */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => updateFilter({ starredOnly: !filter.starredOnly })}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors ${
            filter.starredOnly
              ? "bg-accent/20 text-accent"
              : "text-text-sidebar hover:bg-bg-sidebar-hover hover:text-text-sidebar-active"
          }`}
        >
          <svg
            className={`w-4 h-4 ${filter.starredOnly ? "fill-accent" : "fill-none stroke-current"}`}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          お気に入り
        </button>
      </div>

      {/* リセット */}
      {hasActiveFilter && (
        <div className="px-4 pb-1">
          <button
            onClick={resetFilter}
            className="text-[12px] text-accent hover:text-accent/80 transition-colors"
          >
            フィルターをリセット
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {/* ソースサイト */}
        <SectionTitle open={openSections.source} onToggle={() => toggle("source")}>
          引用元サイト
        </SectionTitle>
        {openSections.source && (
          <div className="pb-2">
            {sources.map((s) => (
              <CheckItem
                key={s}
                label={SOURCE_LABELS[s]}
                checked={filter.sources.includes(s)}
                onChange={() => toggleSource(s)}
                color={SOURCE_COLORS[s]}
              />
            ))}
          </div>
        )}

        {/* カテゴリ */}
        <SectionTitle open={openSections.category} onToggle={() => toggle("category")}>
          カテゴリ
        </SectionTitle>
        {openSections.category && (
          <div className="pb-2">
            {categories.map((c) => (
              <CheckItem
                key={c}
                label={CATEGORY_LABELS[c]}
                checked={filter.categories.includes(c)}
                onChange={() =>
                  updateFilter({
                    categories: filter.categories.includes(c)
                      ? filter.categories.filter((x) => x !== c)
                      : [...filter.categories, c],
                  })
                }
              />
            ))}
          </div>
        )}

        {/* テイスト */}
        <SectionTitle open={openSections.taste} onToggle={() => toggle("taste")}>
          テイスト
        </SectionTitle>
        {openSections.taste && (
          <div className="pb-2">
            {tastes.map((t) => (
              <CheckItem
                key={t}
                label={TASTE_LABELS[t]}
                checked={filter.tastes.includes(t)}
                onChange={() =>
                  updateFilter({
                    tastes: filter.tastes.includes(t)
                      ? filter.tastes.filter((x) => x !== t)
                      : [...filter.tastes, t],
                  })
                }
              />
            ))}
          </div>
        )}

        {/* 制作会社 */}
        <div className="px-3 py-1">
          <CheckItem
            label="制作会社のみ表示"
            checked={filter.agencyOnly}
            onChange={() => updateFilter({ agencyOnly: !filter.agencyOnly })}
          />
        </div>

        {/* 日付 */}
        <SectionTitle open={openSections.date} onToggle={() => toggle("date")}>
          Date
        </SectionTitle>
        {openSections.date && (
          <div className="px-4 pb-4">
            <div className="text-[14px] text-text-sidebar mb-3 font-medium">
              {filter.dateRange[0]} — {filter.dateRange[1]}
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-text-sidebar/50 uppercase">From</label>
                <input
                  type="range"
                  min={0}
                  max={allMonths.length - 1}
                  value={fromIdx}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const newFrom = allMonths[idx];
                    if (newFrom <= filter.dateRange[1]) {
                      updateFilter({ dateRange: [newFrom, filter.dateRange[1]] });
                    }
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-sidebar/50 uppercase">To</label>
                <input
                  type="range"
                  min={0}
                  max={allMonths.length - 1}
                  value={toIdx}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const newTo = allMonths[idx];
                    if (newTo >= filter.dateRange[0]) {
                      updateFilter({ dateRange: [filter.dateRange[0], newTo] });
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* キーボードヒント */}
      <div className="border-t border-white/10 px-4 py-2.5 text-[10px] text-text-sidebar/40 space-y-1">
        <div>⌘+Shift+O: サイトを開く</div>
        <div>Shift+クリック: 範囲選択</div>
        <div>Ctrl+スクロール: ズーム</div>
      </div>
    </aside>
  );
}

/** YYYY-MM の配列を生成 */
function generateMonths(from: string, to: string): string[] {
  const months: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy,
    m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

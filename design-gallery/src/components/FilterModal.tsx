"use client";

import { useEffect, useMemo } from "react";
import {
  FilterState,
  SortOrder,
  SiteSignal,
  SIGNAL_LABELS,
} from "@/types";
import { allSites, dateRange as globalDateRange } from "@/data/load-sites";

interface FilterModalProps {
  filter: FilterState;
  updateFilter: (partial: Partial<FilterState>) => void;
  onClose: () => void;
  /** 各シグナルが何件ヒットしているか（UIヒント表示用、省略可） */
  signalCounts?: Partial<Record<SiteSignal, number>>;
}

const SIGNAL_ORDER: SiteSignal[] = ["framer", "studio", "production"];

/** 日付レンジ用のYYYY-MM配列を生成 */
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

export function FilterModal({
  filter,
  updateFilter,
  onClose,
  signalCounts,
}: FilterModalProps) {
  // Escで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allMonths = useMemo(
    () => generateMonths(globalDateRange[0], globalDateRange[1]),
    []
  );
  const fromIdx = Math.max(0, allMonths.indexOf(filter.dateRange[0]));
  const toIdx = allMonths.indexOf(filter.dateRange[1]);
  const toIdxSafe = toIdx >= 0 ? toIdx : allMonths.length - 1;

  // 月別件数（ボリュームゾーン表示用）
  const monthlyCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of allSites) {
      if (!s.date) continue;
      map.set(s.date, (map.get(s.date) ?? 0) + 1);
    }
    return allMonths.map((m) => map.get(m) ?? 0);
  }, [allMonths]);
  const maxCount = Math.max(1, ...monthlyCounts);
  const selectedTotal = useMemo(() => {
    let total = 0;
    for (let i = fromIdx; i <= toIdxSafe; i++) total += monthlyCounts[i] ?? 0;
    return total;
  }, [monthlyCounts, fromIdx, toIdxSafe]);
  const grandTotal = monthlyCounts.reduce((a, b) => a + b, 0);

  // スムースなエリアチャートのSVGパス（中点経由の2次ベジェで柔らかく）
  const areaPathD = useMemo(() => {
    const w = 1000;
    const h = 60;
    const n = monthlyCounts.length;
    if (n === 0) return "";
    const pts = monthlyCounts.map((c, i) => {
      const x = n === 1 ? w / 2 : (i / (n - 1)) * w;
      const y = h - (c / maxCount) * h;
      return { x, y };
    });
    let d = `M 0,${h} L ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const midX = (prev.x + curr.x) / 2;
      d += ` Q ${midX.toFixed(2)},${prev.y.toFixed(2)} ${(
        (midX + curr.x) /
        2
      ).toFixed(2)},${((prev.y + curr.y) / 2).toFixed(2)}`;
    }
    d += ` L ${w},${pts[pts.length - 1].y.toFixed(2)} L ${w},${h} Z`;
    return d;
  }, [monthlyCounts, maxCount]);

  const leftPct = allMonths.length > 1 ? (fromIdx / (allMonths.length - 1)) * 100 : 0;
  const rightPct =
    allMonths.length > 1 ? (toIdxSafe / (allMonths.length - 1)) * 100 : 100;

  const toggleSignal = (sig: SiteSignal) => {
    const has = filter.signals.includes(sig);
    const next = has
      ? filter.signals.filter((s) => s !== sig)
      : [...filter.signals, sig];
    updateFilter({ signals: next });
  };

  const resetAll = () => {
    updateFilter({
      sortOrder: "newest",
      dateRange: globalDateRange,
      signals: [],
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center gap-3 p-5 border-b border-border shrink-0">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5 text-accent"
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
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold text-text-primary leading-tight">
              フィルター
            </h2>
            <p className="text-[12px] text-text-secondary mt-0.5">
              並び順・日付・タグ（Framer / Studio / 制作会社）
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors shrink-0"
            aria-label="閉じる"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 本体 */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {/* 並び順 */}
          <section>
            <h3 className="text-[12px] uppercase tracking-wider text-text-secondary mb-2">
              並び順
            </h3>
            <div className="flex gap-2">
              {(["newest", "oldest", "random"] as SortOrder[]).map((order) => {
                const active = filter.sortOrder === order;
                return (
                  <button
                    key={order}
                    onClick={() => updateFilter({ sortOrder: order })}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                      active
                        ? "bg-text-primary text-white border-text-primary"
                        : "text-text-secondary border-border hover:border-text-primary/50"
                    }`}
                  >
                    {order === "newest"
                      ? "↓ 新しい順"
                      : order === "oldest"
                        ? "↑ 古い順"
                        : "🔀 ランダム"}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 日付レンジ（スムースなエリアチャート + デュアルハンドル） */}
          <section>
            <div className="flex items-end justify-between mb-2">
              <h3 className="text-[12px] uppercase tracking-wider text-text-secondary">
                日付レンジ
              </h3>
              <div className="flex items-baseline gap-3">
                <span className="text-[12px] text-text-secondary tabular-nums">
                  {selectedTotal.toLocaleString()} / {grandTotal.toLocaleString()} 件
                </span>
                <span className="text-[14px] font-semibold text-text-primary tabular-nums">
                  {allMonths[fromIdx]} — {allMonths[toIdxSafe]}
                </span>
              </div>
            </div>

            {/* エリアチャート */}
            <svg
              viewBox="0 0 1000 60"
              preserveAspectRatio="none"
              className="w-full h-12 block overflow-visible"
            >
              <defs>
                <linearGradient id="fm-area-selected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="fm-area-muted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#9ca3af" stopOpacity="0.05" />
                </linearGradient>
                <clipPath id="fm-clip-selected">
                  <rect
                    x={leftPct * 10}
                    y={0}
                    width={(rightPct - leftPct) * 10}
                    height={60}
                  />
                </clipPath>
                <clipPath id="fm-clip-muted-left">
                  <rect x={0} y={0} width={leftPct * 10} height={60} />
                </clipPath>
                <clipPath id="fm-clip-muted-right">
                  <rect x={rightPct * 10} y={0} width={1000 - rightPct * 10} height={60} />
                </clipPath>
              </defs>
              <path d={areaPathD} fill="url(#fm-area-muted)" clipPath="url(#fm-clip-muted-left)" />
              <path d={areaPathD} fill="url(#fm-area-muted)" clipPath="url(#fm-clip-muted-right)" />
              <path d={areaPathD} fill="url(#fm-area-selected)" clipPath="url(#fm-clip-selected)" />
            </svg>

            {/* スライダー（丸ポチ + 青ライン一体型、チャート直下にベタ付け） */}
            <DateSliderBar
              totalMonths={allMonths.length}
              fromIdx={fromIdx}
              toIdx={toIdxSafe}
              onFromChange={(v) => {
                const newFrom = allMonths[v];
                if (newFrom <= filter.dateRange[1]) {
                  updateFilter({ dateRange: [newFrom, filter.dateRange[1]] });
                }
              }}
              onToChange={(v) => {
                const newTo = allMonths[v];
                if (newTo >= filter.dateRange[0]) {
                  updateFilter({ dateRange: [filter.dateRange[0], newTo] });
                }
              }}
            />

            <div className="flex items-center justify-between text-[10px] text-text-secondary tabular-nums mt-2">
              <span>{allMonths[0]}</span>
              <button
                onClick={() => updateFilter({ dateRange: globalDateRange })}
                className="text-accent hover:underline"
              >
                日付をリセット
              </button>
              <span>{allMonths[allMonths.length - 1]}</span>
            </div>
          </section>

          {/* タグ（Framer / Studio / Production） */}
          <section>
            <h3 className="text-[12px] uppercase tracking-wider text-text-secondary mb-2">
              制作タグ（AND条件）
            </h3>
            <div className="flex flex-col gap-1.5">
              {SIGNAL_ORDER.map((sig) => {
                const checked = filter.signals.includes(sig);
                const count = signalCounts?.[sig];
                return (
                  <button
                    key={sig}
                    onClick={() => toggleSignal(sig)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      checked
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-text-primary/40"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? "bg-accent border-accent"
                          : "border-text-secondary/40"
                      }`}
                    >
                      {checked && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 text-[14px] text-text-primary">
                      {SIGNAL_LABELS[sig]}
                    </span>
                    {typeof count === "number" && (
                      <span className="text-[12px] text-text-secondary">
                        {count.toLocaleString()} 件
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-border shrink-0 flex items-center justify-between">
          <button
            onClick={resetAll}
            className="h-9 px-3 rounded-lg text-[12px] text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            すべてリセット
          </button>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-text-primary text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            適用して閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 日付レンジ用のデュアルハンドル・スライダーバー。
 * - ネイティブ range の黒トラックを全ブラウザで完全無効化
 * - 2つのつまみの間に選択範囲を示す青ライン（transition なし＝リアルタイム追従）
 */
function DateSliderBar({
  totalMonths,
  fromIdx,
  toIdx,
  onFromChange,
  onToChange,
}: {
  totalMonths: number;
  fromIdx: number;
  toIdx: number;
  onFromChange: (v: number) => void;
  onToChange: (v: number) => void;
}) {
  const leftPct = totalMonths > 1 ? (fromIdx / (totalMonths - 1)) * 100 : 0;
  const rightPct = totalMonths > 1 ? (toIdx / (totalMonths - 1)) * 100 : 100;
  return (
    <div className="relative h-[16px] select-none">
      {/* 青ライン（つまみの間） */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-[2px] bg-accent rounded-full pointer-events-none"
        style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
      />
      <input
        type="range"
        min={0}
        max={totalMonths - 1}
        value={fromIdx}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v <= toIdx) onFromChange(v);
        }}
        className="fm-date-range"
        style={{ zIndex: fromIdx > totalMonths - 2 ? 5 : 3 }}
      />
      <input
        type="range"
        min={0}
        max={totalMonths - 1}
        value={toIdx}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v >= fromIdx) onToChange(v);
        }}
        className="fm-date-range"
        style={{ zIndex: 4 }}
      />
      <style jsx>{`
        .fm-date-range {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 16px;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background: transparent !important;
          outline: none;
          border: none;
          margin: 0;
          padding: 0;
          pointer-events: none;
        }
        .fm-date-range::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          height: 16px;
          border: none;
          box-shadow: none;
        }
        .fm-date-range::-moz-range-track {
          background: transparent;
          height: 16px;
          border: none;
          box-shadow: none;
        }
        .fm-date-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--accent);
          cursor: grab;
          pointer-events: auto;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .fm-date-range::-webkit-slider-thumb:active {
          cursor: grabbing;
        }
        .fm-date-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 2px solid var(--accent);
          cursor: grab;
          pointer-events: auto;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .fm-date-range::-moz-focus-outer {
          border: 0;
        }
      `}</style>
    </div>
  );
}

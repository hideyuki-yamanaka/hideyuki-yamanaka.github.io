"use client";

import { FilterState, ViewMode } from "@/types";
import { ScrapeButton } from "./ScrapeButton";

interface HeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  columns: number;
  onColumnsChange: (cols: number) => void;
  filteredCount: number;
  filter: FilterState;
  updateFilter: (partial: Partial<FilterState>) => void;
  // 「もう見ない」/ Eagle重複の管理を統合した歯車モーダルへの導線
  filteredIds: string[]; // 現在表示中のサイトIDリスト（ゴミ箱の対象）
  onHideMany: (ids: string[]) => void;
  onOpenHiddenManager: () => void;
}

// 並び順は「すべて → 未確認 → 確認済み」。
// デフォルト(initialFilter.viewMode="unchecked") が真ん中に来るので、
// 左右に広げて選べる感覚になりやすい。
const MODES: { id: "all" | "unchecked" | "checked"; label: string; dot: string }[] = [
  { id: "all", label: "すべて", dot: "#6B7280" },
  { id: "unchecked", label: "未確認", dot: "#EF4444" },
  { id: "checked", label: "確認済み", dot: "#10B981" },
];

export function Header({
  search,
  onSearchChange,
  columns,
  onColumnsChange,
  filteredCount,
  filter,
  updateFilter,
  filteredIds,
  onHideMany,
  onOpenHiddenManager,
}: HeaderProps) {
  const viewModeState: "unchecked" | "all" | "checked" = filter.starredOnly
    ? "checked"
    : filter.viewMode === "unchecked"
      ? "unchecked"
      : "all";

  const setMode = (id: "unchecked" | "all" | "checked") => {
    if (id === "checked") {
      updateFilter({ viewMode: "all" as ViewMode, starredOnly: true });
    } else {
      updateFilter({ viewMode: id as ViewMode, starredOnly: false });
    }
  };

  return (
    <header className="h-[56px] bg-bg-secondary border-b border-border flex items-center px-5 gap-4 shrink-0 z-30">
      {/* 検索 */}
      <div className="relative flex-1 max-w-[400px]">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="サイト名、URL、エージェンシーで検索..."
          className="w-full h-8 pl-9 pr-3 text-[13px] bg-bg-primary border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
        />
      </div>

      {/* 件数（今見ているモードの件数を1つだけ表示。
          確認済みにする / 非表示にすると、その数字がそのまま減る） */}
      <span className="text-[12px] text-text-secondary whitespace-nowrap tabular-nums">
        {viewModeState === "unchecked"
          ? `未確認 ${filteredCount}件`
          : viewModeState === "checked"
            ? `確認済み ${filteredCount}件`
            : `すべて ${filteredCount}件`}
      </span>

      {/* スペーサー */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* 確認済みモード時の「まとめて非表示」ボタン
            一覧から消えてくれるとメンタルが楽になる、というユーザー要望。
            データは消さず、復元は歯車アイコンのモーダルから。 */}
        {viewModeState === "checked" && filteredCount > 0 && (
          <button
            onClick={() => {
              const ok = window.confirm(
                `表示中の確認済み${filteredCount}件を一覧から非表示にします。\n\n（データは消えません。歯車アイコンのメニューからいつでも戻せます）`
              );
              if (ok) onHideMany(filteredIds);
            }}
            className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border border-border bg-bg-primary text-[12px] text-text-secondary hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
            title={`表示中の${filteredCount}件を一覧から非表示にする`}
            aria-label="表示中のサイトを非表示にする"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span className="tabular-nums">{filteredCount}</span>
            <span>件を非表示</span>
          </button>
        )}

        {/* 状態セグメント（V02: 状態ドット付き） */}
        <div className="inline-flex p-0.5 bg-bg-primary rounded-lg">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 h-7 rounded-md text-[12px] font-medium inline-flex items-center gap-1.5 transition-all ${
                viewModeState === m.id
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列数スライダー */}
      <div className="flex items-center gap-2">
        <svg
          className="w-3.5 h-3.5 text-text-secondary"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <rect x="1" y="1" width="3" height="3" rx="0.5" />
          <rect x="6" y="1" width="3" height="3" rx="0.5" />
          <rect x="11" y="1" width="3" height="3" rx="0.5" />
          <rect x="1" y="6" width="3" height="3" rx="0.5" />
          <rect x="6" y="6" width="3" height="3" rx="0.5" />
          <rect x="11" y="6" width="3" height="3" rx="0.5" />
        </svg>
        <input
          type="range"
          min={2}
          max={10}
          value={columns}
          onChange={(e) => onColumnsChange(Number(e.target.value))}
          className="w-[80px] accent-accent"
          title={`${columns}列`}
        />
        <svg
          className="w-3 h-3 text-text-secondary"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <rect x="1" y="1" width="6" height="6" rx="0.5" />
          <rect x="9" y="1" width="6" height="6" rx="0.5" />
          <rect x="1" y="9" width="6" height="6" rx="0.5" />
          <rect x="9" y="9" width="6" height="6" rx="0.5" />
        </svg>
      </div>

      {/* 今すぐ取り込む（2026-09-17 ヒデさん依頼。ふだんは朝9時と夜9時に自動） */}
      <ScrapeButton />

      {/* 歯車アイコン: Eagle重複と「もう見ない」非表示の統合管理（最右端） */}
      <button
        onClick={onOpenHiddenManager}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
        title="非表示の管理（Eagle連携 + もう見ない）"
        aria-label="非表示の管理"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </header>
  );
}

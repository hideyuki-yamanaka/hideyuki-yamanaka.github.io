"use client";

import { SourceSite, SOURCE_LABELS, SOURCE_COLORS } from "@/types";

interface UpdateNotificationModalProps {
  counts: Partial<Record<SourceSite, number>>;
  onClose: () => void;
}

export function UpdateNotificationModal({
  counts,
  onClose,
}: UpdateNotificationModalProps) {
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  if (total === 0) return null;

  // 件数が多い順に表示
  const sortedSources: SourceSite[] = (
    Object.keys(counts) as SourceSite[]
  )
    .filter((s) => (counts[s] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-[90%] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-start gap-3 mb-5">
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-bold text-text-primary leading-tight">
              下記のコンテンツが更新されました
            </h2>
            <p className="text-[12px] text-text-secondary mt-1">
              新しく {total} 件のサイトが追加されています
            </p>
          </div>
        </div>

        {/* メディア別カウント */}
        <div className="flex flex-col gap-2 mb-6">
          {sortedSources.map((source) => (
            <div
              key={source}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-bg-secondary"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[source] }}
                />
                <span className="text-[14px] font-medium text-text-primary">
                  {SOURCE_LABELS[source]}
                </span>
              </div>
              <span className="text-[14px] font-bold text-text-primary tabular-nums">
                {counts[source]} 件
              </span>
            </div>
          ))}
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full h-10 rounded-lg bg-text-primary text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
        >
          確認した
        </button>
      </div>
    </div>
  );
}

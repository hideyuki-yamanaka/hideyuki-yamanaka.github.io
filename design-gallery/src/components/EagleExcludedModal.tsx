"use client";

import { useEffect } from "react";
import Image from "next/image";
import { SiteEntry, SOURCE_LABELS, SOURCE_COLORS } from "@/types";

interface EagleExcludedModalProps {
  sites: SiteEntry[];
  onClose: () => void;
}

export function EagleExcludedModal({ sites, onClose }: EagleExcludedModalProps) {
  // Escで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[960px] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-start gap-3 p-5 border-b border-border shrink-0">
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
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold text-text-primary leading-tight">
              Eagle重複で非表示中のサイト
            </h2>
            <p className="text-[12px] text-text-secondary mt-1">
              {sites.length} 件（既にEagleに収録済みのためギャラリーから除外中）
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

        {/* グリッド */}
        <div className="flex-1 overflow-y-auto p-5">
          {sites.length === 0 ? (
            <div className="text-center py-12 text-text-secondary text-[14px]">
              非表示中のサイトはありません
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sites.map((site) => (
                <a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 rounded-lg overflow-hidden border border-border hover:border-accent transition-colors"
                  title={`${site.title} - ${site.url}`}
                >
                  <div className="relative aspect-[4/3] bg-bg-secondary overflow-hidden">
                    {site.thumbnailUrl ? (
                      <Image
                        src={site.thumbnailUrl}
                        alt={site.title}
                        fill
                        sizes="240px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-[12px]">
                        No thumbnail
                      </div>
                    )}
                    {/* ソースバッジ */}
                    <span
                      className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-white/90 backdrop-blur text-[10px] font-medium"
                      style={{ color: SOURCE_COLORS[site.source] }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: SOURCE_COLORS[site.source] }}
                      />
                      {SOURCE_LABELS[site.source]}
                    </span>
                  </div>
                  <div className="px-2.5 pb-2.5">
                    <p className="text-[12px] font-medium text-text-primary line-clamp-1">
                      {site.title}
                    </p>
                    <p className="text-[12px] text-text-secondary line-clamp-1 mt-0.5">
                      {site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-border shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-text-primary text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

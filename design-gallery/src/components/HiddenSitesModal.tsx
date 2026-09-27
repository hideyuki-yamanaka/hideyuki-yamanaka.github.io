"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SiteEntry, SOURCE_LABELS, SOURCE_COLORS } from "@/types";
import { EagleExcludedModal } from "./EagleExcludedModal";
import type { EagleStatus } from "@/hooks/useEagleSync";

interface HiddenSitesModalProps {
  // 「もう見ない」自分で非表示にしたサイト
  sites: SiteEntry[];
  onUnhideOne: (id: string) => void;
  onUnhideAll: () => void;
  // Eagle連携
  eagleStatus: EagleStatus;
  eagleItemCount: number;
  eagleExcludedSites: SiteEntry[];
  hideEagleDuplicates: boolean;
  onToggleHideEagleDuplicates: () => void;
  onEagleRefresh: () => void;
  // モーダル制御
  onClose: () => void;
}

/**
 * 「非表示の管理センター」
 *
 * 統合: Eagle重複の表示/非表示トグル + 「もう見ない」非表示サイトの復元。
 * どちらも『一覧から消す』機能なので、ここに集約してヘッダーをスッキリさせる。
 */
export function HiddenSitesModal({
  sites,
  onUnhideOne,
  onUnhideAll,
  eagleStatus,
  eagleItemCount,
  eagleExcludedSites,
  hideEagleDuplicates,
  onToggleHideEagleDuplicates,
  onEagleRefresh,
  onClose,
}: HiddenSitesModalProps) {
  const [showEagleList, setShowEagleList] = useState(false);

  // Escで閉じる（Eagle一覧サブモーダルが開いてる時はそっちに譲る）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showEagleList) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, showEagleList]);

  const handleUnhideAll = () => {
    if (sites.length === 0) return;
    const ok = window.confirm(
      `非表示にしている${sites.length}件すべてを一覧に戻します。よろしいですか？`
    );
    if (ok) {
      onUnhideAll();
    }
  };

  const eagleStatusText =
    eagleStatus === "live"
      ? `Eagle接続中（${eagleItemCount.toLocaleString()}件収録）`
      : eagleStatus === "cached"
        ? `キャッシュ使用中（${eagleItemCount.toLocaleString()}件収録）`
        : eagleStatus === "syncing"
          ? "Eagle同期中…"
          : eagleStatus === "empty"
            ? "Eagle未接続（Eagleを起動してリロード）"
            : "Eagle未同期";

  const eagleDotColor =
    eagleStatus === "live"
      ? "#10B981"
      : eagleStatus === "cached"
        ? "#F59E0B"
        : eagleStatus === "syncing"
          ? "#3B82F6"
          : "#9CA3AF";

  return (
    <>
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
              {/* 歯車 */}
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-bold text-text-primary leading-tight">
                非表示の管理
              </h2>
              <p className="text-[12px] text-text-secondary mt-1">
                Eagle重複と「もう見ない」をまとめて管理
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
          <div className="flex-1 overflow-y-auto">
            {/* === Eagle連携セクション === */}
            <section className="p-5 border-b border-border">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-[14px] font-bold text-text-primary">
                  Eagle連携
                </h3>
                <button
                  onClick={onEagleRefresh}
                  className="inline-flex items-center gap-1 text-[12px] text-text-secondary hover:text-text-primary transition-colors"
                  title="Eagleと再同期"
                >
                  <svg
                    className={`w-3 h-3 ${eagleStatus === "syncing" ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  再同期
                </button>
              </div>

              <div className="rounded-xl border border-border bg-bg-primary p-4">
                {/* ステータス行 */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`w-2 h-2 rounded-full ${eagleStatus === "syncing" ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: eagleDotColor }}
                  />
                  <span className="text-[12px] text-text-secondary">
                    {eagleStatusText}
                  </span>
                </div>

                {/* トグル行 */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-text-primary">
                      Eagleに収録済みのサイトを非表示
                    </p>
                    <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                      Eagleで保存済みのサイトをギャラリーから隠す。重複ブックマーク防止に。
                    </p>
                  </div>
                  <button
                    onClick={onToggleHideEagleDuplicates}
                    disabled={eagleItemCount === 0}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${
                      hideEagleDuplicates ? "bg-blue-500" : "bg-gray-400"
                    } ${eagleItemCount === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                    aria-label={
                      hideEagleDuplicates ? "Eagle重複を表示する" : "Eagle重複を隠す"
                    }
                    aria-pressed={hideEagleDuplicates}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        hideEagleDuplicates ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* 非表示中の件数 + 一覧ボタン */}
                {hideEagleDuplicates && eagleExcludedSites.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
                    <span className="text-[12px] text-text-secondary">
                      現在{" "}
                      <span className="font-bold text-accent tabular-nums">
                        {eagleExcludedSites.length.toLocaleString()}
                      </span>{" "}
                      件を非表示中
                    </span>
                    <button
                      onClick={() => setShowEagleList(true)}
                      className="text-[12px] text-accent hover:underline underline-offset-2"
                    >
                      一覧を見る →
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* === もう見ない非表示セクション === */}
            <section className="p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-[14px] font-bold text-text-primary">
                  「もう見ない」で非表示
                  {sites.length > 0 && (
                    <span className="ml-2 text-text-secondary font-normal tabular-nums">
                      {sites.length}件
                    </span>
                  )}
                </h3>
                {sites.length > 0 && (
                  <button
                    onClick={handleUnhideAll}
                    className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg border border-border bg-bg-primary text-[12px] font-medium text-text-primary hover:border-accent/40 hover:text-accent transition-colors"
                    title="非表示を全部解除して一覧に戻す"
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    全部戻す
                  </button>
                )}
              </div>

              {sites.length === 0 ? (
                <div className="text-center py-12 text-text-secondary border border-dashed border-border rounded-xl">
                  <svg
                    className="w-10 h-10 mx-auto mb-2 opacity-30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <p className="text-[12px] font-medium">
                    まだ非表示にしたサイトはありません
                  </p>
                  <p className="text-[12px] mt-1 opacity-70">
                    確認済みタブで「○件を非表示」を押すとここに溜まります
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sites.map((site) => (
                    <div
                      key={site.id}
                      className="group flex flex-col gap-2 rounded-lg overflow-hidden border border-border bg-white"
                      title={`${site.title} - ${site.url}`}
                    >
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-[4/3] bg-bg-secondary overflow-hidden block"
                      >
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
                      </a>
                      <div className="px-2.5 pb-2.5 flex flex-col gap-1.5">
                        <p className="text-[12px] font-medium text-text-primary line-clamp-1">
                          {site.title}
                        </p>
                        <p className="text-[12px] text-text-secondary line-clamp-1">
                          {site.url
                            .replace(/^https?:\/\//, "")
                            .replace(/\/$/, "")}
                        </p>
                        <button
                          onClick={() => onUnhideOne(site.id)}
                          className="mt-1 h-7 inline-flex items-center justify-center gap-1 px-2 rounded-md border border-border text-[12px] font-medium text-text-secondary hover:border-accent/40 hover:text-accent transition-colors"
                          title="このサイトを一覧に戻す"
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
                              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                            />
                          </svg>
                          一覧に戻す
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
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

      {/* Eagle重複の一覧サブモーダル */}
      {showEagleList && (
        <EagleExcludedModal
          sites={eagleExcludedSites}
          onClose={() => setShowEagleList(false)}
        />
      )}
    </>
  );
}

"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { SiteEntry } from "@/types";
import { SiteCard } from "./SiteCard";

const PAGE_SIZE = 100;

interface GalleryProps {
  sites: SiteEntry[];
  columns: number;
  selectedIds: Set<string>;
  onSelect: (id: string, e: { shiftKey: boolean; metaKey: boolean }) => void;
  onToggleStar: (id: string) => void;
  onSetStarredMany: (ids: string[], starred: boolean) => void;
  onClearSelection: () => void;
  onColumnsChange: (cols: number) => void;
}

export function Gallery({
  sites,
  columns,
  selectedIds,
  onSelect,
  onToggleStar,
  onSetStarredMany,
  onClearSelection,
  onColumnsChange,
}: GalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  // 現在ビューポート上端付近にあるカードのインデックス。
  // スクロール位置インジケーター用。
  const [currentIdx, setCurrentIdx] = useState(0);
  // スクロール中フラグ。チップを濃く出すかどうかの切替に使う。
  // 800ms 操作が無ければ自動で false に戻す。
  const [scrolling, setScrolling] = useState(false);
  const scrollEndTimer = useRef<number | null>(null);

  // フィルターが変わったら displayCount をリセット。
  // スクロール位置は保持する（「確認済み」トグル等でカードが減っても位置が飛ばないように）。
  // ブラウザは scrollHeight が縮めば自動で上限にクランプしてくれる。
  const sitesKey = sites.length;
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [sitesKey]);

  // 表示するサイト
  const visibleSites = useMemo(
    () => sites.slice(0, displayCount),
    [sites, displayCount]
  );
  const hasMore = displayCount < sites.length;

  // 無限スクロール + 現在位置インジケーター。
  //   handleScroll の中でやってる事:
  //     1. 下端500px以内なら追加ロード（無限スクロール）
  //     2. ビューポート上端付近のカードを探して currentIdx に反映
  //     3. scrolling=true にして 800ms 後 false に戻すタイマー仕込む
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;

      // 1. 追加ロード判定
      if (hasMore && scrollHeight - scrollTop - clientHeight < 500) {
        setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, sites.length));
      }

      // 2. 現在位置（ビューポート上端から少し下にあるカードのインデックス）
      const containerTop = el.getBoundingClientRect().top;
      // 上端から 100px 下を「今見てる」基準点に
      const probeY = containerTop + 100;
      const cards = el.querySelectorAll<HTMLElement>("[data-site-id]");
      let idx = 0;
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        if (r.top > probeY) break;
        idx = i;
      }
      setCurrentIdx(idx);

      // 3. スクロール中フラグ
      setScrolling(true);
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
      scrollEndTimer.current = window.setTimeout(() => setScrolling(false), 800);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    // 初期表示時に1回呼ぶ（フィルター変更後の位置反映用）
    handleScroll();
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollEndTimer.current) window.clearTimeout(scrollEndTimer.current);
    };
  }, [hasMore, sites.length]);

  // Ctrl+スクロール / ピンチで列数変更
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1 : -1;
        onColumnsChange(Math.max(2, Math.min(10, columns + delta)));
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [columns, onColumnsChange]);

  // カード以外（空エリア）のクリックで選択解除
  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-site-id]")) return;
    if (target.closest("button") || target.closest("a")) return;
    onClearSelection();
  };

  // 画面のどこをクリックしても、カード / アクションバー / モーダル以外なら選択解除
  // （ヘッダーやフィルターバー、Eagleバーの余白なども対象）
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // カード自身 or アクションバー or モーダル内は無視
      if (target.closest("[data-site-id]")) return;
      if (target.closest("[data-selection-action-bar]")) return;
      if (target.closest("[role=dialog]")) return;
      onClearSelection();
    };
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [selectedIds, onClearSelection]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-5"
      onClick={handleContainerClick}
    >
      {sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
          <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-[16px] font-medium">該当するサイトがありません</p>
          <p className="text-[14px] mt-1">フィルター条件を変更してみてください</p>
        </div>
      ) : (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {visibleSites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              selected={selectedIds.has(site.id)}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      )}

      {/* もっと読み込み表示 */}
      {hasMore && (
        <div className="flex justify-center py-8">
          <span className="text-[14px] text-text-secondary">
            {visibleSites.length} / {sites.length}件を表示中…スクロールで続きを読み込み
          </span>
        </div>
      )}

      {/* スクロール位置インジケーター（案A: ミニ件数チップ）
          - 右上に固定。ヘッダー(56px)+FilterBar(44px)+少し余白。
          - スクロール中は濃く・大きめ、停止中は薄く小さく。
          - sites.length=0 のときは出さない（空状態のメッセージと被るので）。 */}
      {sites.length > 0 && (
        <div
          aria-live="polite"
          className={`fixed top-[116px] right-6 z-40 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-md border border-border text-[12px] tabular-nums transition-all duration-300 pointer-events-none select-none ${
            scrolling ? "opacity-100 scale-100" : "opacity-50 scale-95"
          }`}
        >
          <span className="font-bold text-text-primary">
            {(currentIdx + 1).toLocaleString()}
          </span>
          <span className="text-text-secondary"> / {sites.length.toLocaleString()}</span>
        </div>
      )}

      {/* 選択中アクションバー */}
      {selectedIds.size > 0 && (
        <div
          data-selection-action-bar
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-900/95 text-white shadow-2xl backdrop-blur-sm"
        >
          <span className="text-sm font-medium">
            {selectedIds.size}件を選択中
          </span>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => {
              const selected = sites.filter((s) => selectedIds.has(s.id));
              if (selected.length > 10) {
                const ok = window.confirm(`${selected.length}件のタブを開きます。よろしいですか？`);
                if (!ok) return;
              }
              selected.forEach((s) => {
                window.open(s.url, "_blank", "noopener,noreferrer");
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            まとめて開く
          </button>
          {(() => {
            const ids = sites.filter((s) => selectedIds.has(s.id)).map((s) => s.id);
            const allStarred = ids.length > 0 && ids.every((id) => sites.find((s) => s.id === id)?.starred);
            return (
              <button
                onClick={() => {
                  onSetStarredMany(ids, !allStarred);
                  // アクション完了 → 選択解除してアクションバーを閉じる
                  onClearSelection();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  allStarred ? "bg-white/20 hover:bg-white/30" : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {allStarred ? "チェックを外す" : "まとめて確認済みへ"}
              </button>
            );
          })()}
          <button
            onClick={onClearSelection}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
          >
            選択解除
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Eagle重複で非表示中（または表示中）の件数を案内するセカンダリバー。
 *
 * - ヘッダーのすぐ下、FilterBar の上に配置する。
 * - `visible=false` でも DOM は残して、max-height と opacity でスッと出入りさせる。
 * - 直近の excludedCount をキャッシュしておき、退場中に「0件」に切り替わらないようにする。
 * - ON/OFF のトグルはヘッダーの Eagle ボタン側にあるので、ここは情報表示＋モーダルリンクのみ。
 */

interface EagleExcludedBarProps {
  /** Eagle 重複の件数 */
  excludedCount: number;
  /** 「一覧を見る」クリック時に呼ぶ（非表示一覧モーダルを開く） */
  onOpenExcluded: () => void;
  /** 表示状態。false なら max-height=0 + opacity=0 に遷移 */
  visible: boolean;
  /** 現在 Eagle 重複を非表示にしてるかどうか（文言の切替用） */
  hideEagleDuplicates: boolean;
}

export function EagleExcludedBar({
  excludedCount,
  onOpenExcluded,
  visible,
  hideEagleDuplicates,
}: EagleExcludedBarProps) {
  const lastCountRef = useRef(excludedCount);
  if (excludedCount > 0) lastCountRef.current = excludedCount;
  const displayCount = excludedCount > 0 ? excludedCount : lastCountRef.current;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`shrink-0 overflow-hidden ${
        mounted ? "transition-[max-height,opacity] duration-300 ease-out" : ""
      } ${visible ? "max-h-10 opacity-100" : "max-h-0 opacity-0"}`}
    >
      <div
        className={`h-10 flex items-center px-5 gap-3 bg-accent/5 border-b border-accent/20 text-[12px] transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "-translate-y-1"
        }`}
      >
        <svg
          className="w-4 h-4 text-accent shrink-0"
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
        <span className="text-accent font-medium tabular-nums">
          Eagle重複{" "}
          <span className="font-bold">{displayCount.toLocaleString()}</span>{" "}
          件を{hideEagleDuplicates ? "非表示中" : "表示中"}
        </span>
        <button
          onClick={onOpenExcluded}
          tabIndex={visible ? 0 : -1}
          className="text-accent underline underline-offset-2 hover:text-accent/80"
        >
          一覧を見る
        </button>
      </div>
    </div>
  );
}

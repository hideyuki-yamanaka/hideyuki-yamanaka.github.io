'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ChevronLeft, MoreHorizontal, Plus, Share2, Trash2, Bot } from 'lucide-react';
import { Trip, Day, Spot, AssigneeType, ASSIGNEE_CONFIG } from '../../../lib/types';
import {
  getTripByAnyShareId, updateTrip, addSpot, updateSpot, deleteSpot,
  deleteTrip as removeTripFromStorage, updateDayHeadline,
} from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { SpotFormData } from '../../../components/SpotEditModal';
import Timeline from '../../../components/Timeline';
import type { DaySection } from '../../../components/Timeline';
import { cn } from '../../../lib/utils';
import { analyzeTrip, DraftSpot } from '../../../lib/trip-review';

import type { MapViewHandle } from '../../../components/MapView';
const MapView = dynamic(() => import('../../../components/MapView'), { ssr: false });
const SpotEditModal = dynamic(() => import('../../../components/SpotEditModal'), { ssr: false });
const DraftEditForm = dynamic(() => import('../../../components/DraftEditForm'), { ssr: false });

const DAY_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

function formatShortDate(dateStr: string, dayOffset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + dayOffset);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateWithDay(dateStr: string, dayOffset: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + dayOffset);
  return `${d.getMonth() + 1}/${d.getDate()}(${DAY_OF_WEEK[d.getDay()]})`;
}

export default function SharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [selectedDayIdx, setSelectedDayIdx] = useState(1);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [editSpotId, setEditSpotId] = useState<string | null>(null);
  const [showAddSpot, setShowAddSpot] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeType>('all');
  const [editingTitle, setEditingTitle] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [draftSpots, setDraftSpots] = useState<DraftSpot[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  const mapRef = useRef<MapViewHandle>(null);
  const [locating, setLocating] = useState(false);

  const [mapHeight, setMapHeight] = useState(35);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(35);
  const headerRef = useRef<HTMLElement>(null);

  const handleDragStart = useCallback((clientY: number) => {
    isDragging.current = true;
    dragStartY.current = clientY;
    dragStartHeight.current = mapHeight;
    document.body.style.userSelect = 'none';
  }, [mapHeight]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging.current) return;
    const deltaVh = ((clientY - dragStartY.current) / window.innerHeight) * 100;
    const newHeight = Math.min(70, Math.max(10, dragStartHeight.current + deltaVh));
    setMapHeight(newHeight);
  }, []);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientY);
    const onEnd = () => handleDragEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  useEffect(() => {
    getTripByAnyShareId(shareId).then((result) => {
      if (result) {
        setTrip(result.trip);
        setReadOnly(result.readOnly);
      } else {
        setNotFound(true);
      }
    });
  }, [shareId]);

  // ─── iPhone / iPad シームレス同期: Supabase Realtime 購読 ───
  // trips テーブルに変更があれば debounce 付きで再フェッチ → 別端末の編集が即時反映。
  // trips テーブルは Supabase 側で Realtime publication に登録されている前提
  // (sql/2026-04-29-realtime.sql で ALTER PUBLICATION 済)。
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        getTripByAnyShareId(shareId).then((result) => {
          if (result) setTrip(result.trip);
        });
      }, 500);
    };
    const channel = supabase
      .channel(`travel-shiori-realtime-${shareId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, scheduleRefetch)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [shareId]);

  // DaySection データを構築（常に全Day表示、フィルタはスポットレベルで適用）
  const daySections: DaySection[] = trip
    ? trip.days.map((day, idx) => {
        const filtered = assigneeFilter === 'all'
          ? day.spots
          : day.spots.filter((s) => !s.assignee || s.assignee === 'all' || s.assignee === assigneeFilter);
        return {
          day,
          dayIdx: idx,
          dateLabel: formatDateWithDay(trip.startDate, idx),
          headline: day.headline,
          spots: filtered,
        };
      })
    : [];

  // マップ用: 全スポット（フィルタ済み）
  const displaySpots: Spot[] = daySections.flatMap((s) => s.spots);

  // spotId → 何日目 のマッピング（マップピン表示用）
  const spotDayMap: Record<string, number> = {};
  if (trip) {
    trip.days.forEach((day) => {
      day.spots.forEach((s) => { spotDayMap[s.id] = day.dayNum; });
    });
  }

  const dayOptions = trip
    ? trip.days.map((day, idx) => ({
        id: day.id,
        label: `Day${day.dayNum} ${formatDateWithDay(trip.startDate, idx)}`,
      }))
    : [];

  // スクロール領域のref（IntersectionObserver用）
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingByClick = useRef(false);

  const refreshTrip = useCallback(async () => {
    const result = await getTripByAnyShareId(shareId);
    if (result) setTrip(result.trip);
  }, [shareId]);

  // IntersectionObserver: スクロール位置に応じてタブ自動切り替え
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || !trip) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingByClick.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.dayIdx);
            if (!isNaN(idx)) setSelectedDayIdx(idx + 1);
          }
        }
      },
      {
        root: scrollContainer,
        // ヘッダーの少し下で検出
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      }
    );

    const sections = scrollContainer.querySelectorAll('[data-day-idx]');
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [trip, daySections]);

  // アクティブなタブが見えるように横スクロール
  useEffect(() => {
    const container = tabContainerRef.current;
    if (!container) return;
    const activeTab = container.querySelector('[data-active-tab="true"]') as HTMLElement | null;
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedDayIdx]);

  // タブクリック → 該当セクションにスムーズスクロール
  const handleDayTabClick = useCallback((dayIdx: number) => {
    setSelectedDayIdx(dayIdx + 1);
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    const target = scrollContainer.querySelector(`[data-day-idx="${dayIdx}"]`);
    if (target) {
      isScrollingByClick.current = true;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => { isScrollingByClick.current = false; }, 800);
    }
  }, []);

  const handleAddSpot = async (data: SpotFormData) => {
    if (!trip) return;
    const targetDayId = data.dayId
      || (selectedDayIdx > 0 ? trip.days[selectedDayIdx - 1]?.id : trip.days[0]?.id);
    if (!targetDayId) return;
    const updated = await addSpot(trip.shareId, targetDayId, data);
    if (updated) setTrip(updated);
    setShowAddSpot(false);
  };

  const handleEditSpot = async (data: SpotFormData) => {
    if (!trip || !editSpotId) return;
    const updated = await updateSpot(trip.shareId, editSpotId, data);
    if (updated) setTrip(updated);
    setEditSpotId(null);
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (!trip) return;
    const updated = await deleteSpot(trip.shareId, spotId);
    if (updated) setTrip(updated);
    if (selectedSpotId === spotId) setSelectedSpotId(null);
  };

  const handleSpotTap = (spotId: string) => {
    setSelectedSpotId(spotId);
    if (!readOnly) setEditSpotId(spotId);
  };

  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  useEffect(() => {
    if (trip) {
      setEditTitle(trip.title);
      setEditStart(trip.startDate);
      setEditEnd(trip.endDate);
    }
  }, [trip]);

  const handleSaveSettings = async () => {
    if (!trip || !editTitle.trim() || !editStart || !editEnd) return;
    const newStart = new Date(editStart);
    const newEnd = new Date(editEnd);
    const newDayCount = Math.max(1, Math.round((newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const updated = { ...trip, title: editTitle.trim(), startDate: editStart, endDate: editEnd };
    while (updated.days.length < newDayCount) {
      const n = updated.days.length + 1;
      updated.days.push({ id: crypto.randomUUID(), tripId: trip.id, dayNum: n, headline: '', spots: [] });
    }
    if (updated.days.length > newDayCount) updated.days = updated.days.slice(0, newDayCount);
    updated.days.forEach((d, i) => { d.dayNum = i + 1; });
    await updateTrip(updated);
    setTrip(updated);
    setShowSettings(false);
    if (selectedDayIdx > newDayCount) setSelectedDayIdx(0);
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;
    if (confirm('この旅行プランを削除しますか？')) {
      await removeTripFromStorage(trip.shareId);
      router.push('/');
    }
  };

  const [snackbarMsg, setSnackbarMsg] = useState('');
  const showSnackbarMsg = (msg: string) => {
    setSnackbarMsg(msg);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 2500);
  };

  const handleCopyEditUrl = () => {
    if (!trip) return;
    const url = `${window.location.origin}/share/${trip.shareId}`;
    navigator.clipboard.writeText(url);
    showSnackbarMsg('編集用リンクをコピーしました');
  };

  const handleCopyViewUrl = () => {
    if (!trip) return;
    const url = `${window.location.origin}/share/${trip.viewId}`;
    navigator.clipboard.writeText(url);
    showSnackbarMsg('閲覧用リンクをコピーしました');
  };

  const handleStartReview = useCallback(() => {
    if (!trip) return;
    setShowReview(true);
    setReviewLoading(true);
    setDraftSpots([]);
    setTimeout(() => {
      const results = analyzeTrip(trip);
      setDraftSpots(results);
      setReviewLoading(false);
    }, 1200);
  }, [trip]);

  // AIチャットページから ?review=1 で戻ってきたら抜けチェックを自動起動
  useEffect(() => {
    if (!trip) return;
    if (searchParams.get('review') === '1' && !showReview) {
      handleStartReview();
      // URLからパラメータを取り除く
      router.replace(`/share/${shareId}`);
    }
  }, [trip, searchParams, showReview, handleStartReview, router, shareId]);

  const handleApplyReview = async () => {
    if (!trip) return;
    const updated = { ...trip, days: trip.days.map(d => ({ ...d, spots: [...d.spots] })) };

    for (const draft of draftSpots) {
      const day = updated.days.find(d => d.id === draft.dayId);
      if (day) {
        day.spots.push({
          id: crypto.randomUUID(),
          dayId: day.id,
          name: draft.name,
          type: draft.type,
          isMain: false,
          time: draft.time || '',
          endTime: draft.endTime,
          transport: draft.transport,
          sortOrder: draft.sortOrder,
          memo: draft.memo || '',
        });
        day.spots.sort((a, b) => a.sortOrder - b.sortOrder);
      }
    }

    await updateTrip(updated);
    setTrip(updated);
    setShowReview(false);
    setDraftSpots([]);
  };

  /** ドラフトカードをタップ → ボトムシート内で編集画面に遷移 */
  const handleDraftTap = (draft: DraftSpot) => {
    setEditingDraftId(draft.id);
  };

  /** ドラフト編集を保存（ボトムシート内） */
  const handleDraftSave = (updated: DraftSpot) => {
    setDraftSpots(prev => prev.map(d => d.id === updated.id ? updated : d));
    setEditingDraftId(null);
  };

  const editingDraft = editingDraftId
    ? draftSpots.find(d => d.id === editingDraftId)
    : undefined;

  const editingSpot = editSpotId
    ? trip?.days.flatMap(d => d.spots).find(s => s.id === editSpotId)
    : undefined;

  if (notFound) {
    return (
      <div className="min-h-full bg-[var(--color-bg)] flex flex-col items-center justify-center px-8 text-center">
        <div className="text-5xl mb-3">🔍</div>
        <h1 className="text-[18px] font-bold mb-1">プランが見つかりません</h1>
        <p className="text-[14px] text-gray-500">このURLの旅行プランは存在しないか、削除された可能性があります。</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-full bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    );
  }

  // ボトムシートの高さ（vhで管理、100 - mapHeight がシートの高さ）
  const sheetTopVh = mapHeight;

  return (
    <div className="h-full relative bg-[var(--color-bg)] overflow-hidden">
      {/* ── ヘッダー（マップの上にオーバーレイ） ── */}
      <header
        ref={headerRef}
        className="absolute top-0 left-0 right-0 z-30 px-4 py-3.5 flex items-center"
      >
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="mx-3 flex-1 text-center">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={inlineTitle}
              onChange={(e) => setInlineTitle(e.target.value)}
              onBlur={async () => {
                const trimmed = inlineTitle.trim();
                if (trimmed && trimmed !== trip.title) {
                  const updated = { ...trip, title: trimmed };
                  await updateTrip(updated);
                  setTrip(updated);
                }
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') { setEditingTitle(false); }
              }}
              className="w-full max-w-[220px] px-4 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-[16px] font-bold text-gray-900 text-center outline-none ring-2 ring-blue-500/40"
            />
          ) : (
            <span
              onClick={readOnly ? undefined : () => { setInlineTitle(trip.title); setEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 50); }}
              className={cn(
                "inline-block px-4 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-[16px] font-bold text-gray-900 truncate max-w-[220px] transition-colors",
                !readOnly && "cursor-pointer active:bg-white/60"
              )}
            >
              {trip.title}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center"
        >
          <MoreHorizontal className="w-[18px] h-[18px] text-gray-700" />
        </button>
      </header>

      {/* ── 全画面マップ ── */}
      <div className="absolute inset-0 z-0">
        <MapView
          ref={mapRef}
          spots={displaySpots}
          selectedSpotId={selectedSpotId}
          onSpotSelect={(spotId) => setSelectedSpotId(spotId)}
          visibleHeightVh={mapHeight}
          spotDayMap={spotDayMap}
        />
      </div>

      {/* ── 現在地ボタン（マップの右下、ボトムシートの上）── */}
      <button
          onClick={() => {
            setLocating(true);
            mapRef.current?.locateMe();
            setTimeout(() => setLocating(false), 3000);
          }}
          className="absolute z-10 right-4 flex items-center justify-center"
          style={{ top: `calc(${mapHeight}vh - 52px)` }}
          aria-label="現在地を表示"
        >
          <div className="w-10 h-10 bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.3)] flex items-center justify-center active:bg-gray-100 transition-colors">
            {/* Google Maps「my_location」アイコン */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill={locating ? '#4285F4' : '#666'}>
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          </div>
        </button>

      {/* ── ボトムシート ── */}
      <div
        className="absolute left-0 right-0 bottom-0 z-20 flex flex-col bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
        style={{
          top: `${sheetTopVh}vh`,
          transition: isDragging.current ? 'none' : 'top 0.2s ease-out',
        }}
      >
        {/* ドラッグハンドル + 日程タブ */}
        <div
          className="flex-shrink-0 cursor-row-resize touch-none select-none"
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
        >
          <div className="flex justify-center items-center py-2">
            <div className="w-9 h-1 bg-gray-300 rounded-full" />
          </div>
          {/* 日程タブ + 人物フィルター（横並び） */}
          <div className="px-3 pt-1 pb-1.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {/* 左: 日程タブ */}
              <div ref={tabContainerRef} className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                {trip.days.map((day, idx) => (
                  <button
                    key={day.id}
                    data-active-tab={selectedDayIdx === idx + 1 ? 'true' : undefined}
                    onClick={() => handleDayTabClick(idx)}
                    className={cn(
                      'flex-shrink-0 px-3.5 py-1.5 rounded-full text-[14px] font-medium transition-all whitespace-nowrap',
                      selectedDayIdx === idx + 1
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-500 active:bg-gray-200'
                    )}
                  >
                    {day.dayNum}日目
                  </button>
                ))}
              </div>
              {/* 人物フィルター */}
              <div className="flex-shrink-0 inline-flex items-center bg-gray-100 rounded-lg p-0.5 ml-auto">
                {([
                  { key: 'all' as const, label: '全員', activeText: 'text-gray-700' },
                  { key: 'parents' as const, label: '両親', activeText: 'text-orange-600' },
                  { key: 'son' as const, label: '息子', activeText: 'text-green-600' },
                ] as const).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setAssigneeFilter(item.key)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all whitespace-nowrap',
                      assigneeFilter === item.key
                        ? cn('bg-white shadow-sm', item.activeText)
                        : 'text-gray-400'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 工程リスト */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
          <Timeline
            daySections={daySections}
            selectedSpotId={selectedSpotId}
            onSpotSelect={handleSpotTap}
            onSpotDelete={handleDeleteSpot}
            onAdd={() => setShowAddSpot(true)}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* ── FAB（閲覧モードでは非表示） ── */}
      {!readOnly && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-[1366px] pointer-events-none">
          {/* AIチャットボタン（+ボタンの上） */}
          <button
            onClick={() => router.push(`/share/${shareId}/ai-chat`)}
            className="absolute bottom-[72px] right-5 w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-full shadow-lg shadow-purple-500/30 flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
            aria-label="AIアシスタント"
          >
            <Bot className="w-6 h-6" strokeWidth={2.5} />
          </button>
          {/* スポット追加ボタン */}
          <button
            onClick={() => setShowAddSpot(true)}
            className="absolute bottom-0 right-5 w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
            aria-label="スポットを追加"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── モーダル類 ── */}
      {showAddSpot && (
        <SpotEditModal isOpen={showAddSpot} onClose={() => setShowAddSpot(false)} onSave={handleAddSpot} dayOptions={dayOptions} />
      )}
      {editSpotId && editingSpot && (
        <SpotEditModal isOpen={true} onClose={() => setEditSpotId(null)} onSave={handleEditSpot} initialData={editingSpot} dayOptions={dayOptions} />
      )}

      {/* ── 抜けチェック プレビュー（メインシート内オーバーレイ） ── */}
      {showReview && (
        <div className="absolute left-0 right-0 bottom-0 z-30 flex flex-col bg-[#f2f2f7] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]" style={{ top: `${sheetTopVh}vh` }}>
          <div className="flex justify-center items-center py-2 flex-shrink-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 編集画面 or リスト画面 */}
            {editingDraftId && editingDraft ? (
              <DraftEditForm
                draft={editingDraft}
                onSave={handleDraftSave}
                onBack={() => setEditingDraftId(null)}
              />
            ) : (
              <>
                {/* リスト画面ヘッダー */}
                <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
                  <button
                    onClick={() => { setShowReview(false); setDraftSpots([]); setEditingDraftId(null); }}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3c3c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <div className="text-center">
                    <span className="text-[16px] font-bold">抜けチェック</span>
                    {!reviewLoading && draftSpots.length > 0 && (
                      <p className="text-[12px] text-gray-400 mt-0.5">{draftSpots.length}件の提案</p>
                    )}
                  </div>
                  {!reviewLoading && draftSpots.length > 0 ? (
                    <button
                      onClick={handleApplyReview}
                      className="px-3 py-1.5 bg-blue-500 text-white text-[13px] font-semibold rounded-lg active:bg-blue-600 transition-colors"
                    >
                      確定
                    </button>
                  ) : (
                    <div className="w-14" />
                  )}
                </div>
                {/* リストコンテンツ */}
                <div className="flex-1 overflow-y-auto bg-white rounded-t-xl">
                  {reviewLoading ? (
                    <div className="px-4 pt-4">
                      {/* AI分析ヘッダー */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center ai-pulse-glow">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-gray-900">旅程を分析中...</p>
                          <p className="text-[12px] text-gray-400 mt-0.5">抜け漏れをチェックしています</p>
                        </div>
                      </div>

                      {/* スキャンアニメーション付きカード群 */}
                      <div className="space-y-3 relative">
                        <div className="ai-scan-line" />
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="ai-card-stagger"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          >
                            {i % 3 === 1 ? (
                              /* 破線ドラフトカード風 */
                              <div className="rounded-xl py-3 px-3.5 border-2 border-dashed border-blue-200 overflow-hidden">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full ai-shimmer" />
                                  <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/5 rounded-md ai-shimmer" />
                                    <div className="flex gap-2">
                                      <div className="h-3 w-14 rounded-full ai-shimmer" />
                                      <div className="h-3 w-16 rounded-full ai-shimmer" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* 通常カード風 */
                              <div className="rounded-2xl p-3.5 bg-white ring-1 ring-black/[0.04] overflow-hidden">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-12 rounded-lg ai-shimmer" />
                                  <div className="flex-1 space-y-2">
                                    <div className="h-5 rounded-md ai-shimmer" style={{ width: `${55 + i * 8}%` }} />
                                    <div className="flex gap-2">
                                      <div className="h-3.5 w-12 rounded-md ai-shimmer" />
                                      <div className="h-3.5 w-10 rounded-full ai-shimmer" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 進捗ドット */}
                      <div className="flex items-center justify-center gap-1.5 mt-6">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-blue-400"
                            style={{
                              animation: 'pulseGlow 1.5s ease-in-out infinite',
                              animationDelay: `${i * 0.3}s`,
                              opacity: 0.4 + i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : draftSpots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="text-5xl mb-4">✨</div>
                      <h3 className="text-[17px] font-bold text-gray-900 mb-1">完璧な旅程です！</h3>
                      <p className="text-[14px] text-gray-400">抜け漏れは見つかりませんでした</p>
                    </div>
                  ) : (
                    <Timeline
                      daySections={daySections}
                      selectedSpotId={null}
                      onSpotSelect={() => {}}
                      onSpotDelete={() => {}}
                      readOnly={true}
                      draftSpots={draftSpots}
                      onDraftTap={handleDraftTap}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── スナックバー ── */}
      {showSnackbar && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 bg-gray-900 text-white text-[14px] font-medium rounded-2xl shadow-xl animate-[fadeInUp_0.3s_ease]">
          {snackbarMsg}
        </div>
      )}

      {/* ── 設定モーダル ── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 modal-overlay flex items-end justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}
        >
          <div className="w-full max-w-lg bg-white rounded-t-2xl modal-sheet pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3">
              <button
                onClick={() => setShowSettings(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3c3c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="text-[16px] font-bold">{readOnly ? '情報' : '設定'}</span>
              {!readOnly ? (
                <button
                  onClick={handleSaveSettings}
                  className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              ) : <div className="w-9" />}
            </div>
            <div className="px-4 space-y-4">
              {!readOnly && (
                <>
                  <div>
                    <label className="text-[12px] text-gray-400 mb-1 block font-medium">タイトル</label>
                    <input type="text" className="ios-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[12px] text-gray-400 mb-1 block font-medium">出発日</label>
                      <input type="date" className="ios-input" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[12px] text-gray-400 mb-1 block font-medium">帰着日</label>
                      <input type="date" className="ios-input" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="text-[12px] text-gray-400 mb-2 block font-medium">共有リンク</label>
                <div className="flex flex-col gap-2">
                  <button onClick={handleCopyEditUrl} className="flex items-center justify-center gap-2 w-full h-[44px] bg-blue-50 text-blue-600 rounded-xl text-[14px] font-medium active:bg-blue-100 transition-colors">
                    <Share2 className="w-4 h-4" />
                    編集用リンクをコピー
                  </button>
                  <button onClick={handleCopyViewUrl} className="flex items-center justify-center gap-2 w-full h-[44px] bg-gray-100 text-gray-600 rounded-xl text-[14px] font-medium active:bg-gray-200 transition-colors">
                    <Share2 className="w-4 h-4" />
                    閲覧用リンクをコピー
                  </button>
                </div>
              </div>
              {!readOnly && (
                <button onClick={handleDeleteTrip} className="flex items-center justify-center gap-2 w-full h-[44px] bg-red-50 text-red-600 rounded-xl text-[15px] font-medium mt-4">
                  <Trash2 className="w-4 h-4" />
                  旅行プランを削除
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

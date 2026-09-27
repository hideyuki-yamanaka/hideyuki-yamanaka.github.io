'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronRight, Calendar, MoreHorizontal, Trash2, Copy, RotateCcw, ChevronDown, Share2, Link, Eye, Pencil } from 'lucide-react';
import { Trip } from '../lib/types';
import { getTrips, createTrip, deleteTrip, duplicateTrip, getTrashedTrips, restoreTrip, permanentlyDeleteTrip, updateTrip } from '../lib/storage';
import { cn } from '../lib/utils';

function getDayOfWeek(dateStr: string): string {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[new Date(dateStr).getDay()];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} (${getDayOfWeek(dateStr)})`;
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" fillOpacity="0.9"/>
          <circle cx="12" cy="9" r="2.5" fill="#4F46E5"/>
        </svg>
      </div>
      <div>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">旅のしおり</h1>
        <p className="text-[12px] text-gray-400 -mt-0.5">Travel Planner</p>
      </div>
    </div>
  );
}

function TripMenu({ shareId, viewId, onDelete, onDuplicate, onSnackbar, onRename }: {
  shareId: string;
  viewId?: string;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSnackbar: (msg: string) => void;
  onRename: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick as unknown as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick as unknown as EventListener);
    };
  }, [open]);

  const copyEditUrl = () => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${shareId}`);
    onSnackbar('編集用リンクをコピーしました');
    setOpen(false);
  };

  const copyViewUrl = () => {
    if (!viewId) return;
    navigator.clipboard.writeText(`${window.location.origin}/share/${viewId}`);
    onSnackbar('閲覧用リンクをコピーしました');
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative flex-shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-lg ring-1 ring-black/[0.08] overflow-hidden min-w-[180px]">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onRename(); }}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Pencil className="w-4 h-4 text-gray-500" />
            名前を編集
          </button>
          <div className="h-px bg-gray-100" />
          <button
            onClick={(e) => { e.stopPropagation(); copyEditUrl(); }}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Link className="w-4 h-4 text-blue-500" />
            編集用リンクをコピー
          </button>
          {viewId && (
            <>
              <div className="h-px bg-gray-100" />
              <button
                onClick={(e) => { e.stopPropagation(); copyViewUrl(); }}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Eye className="w-4 h-4 text-green-500" />
                閲覧用リンクをコピー
              </button>
            </>
          )}
          <div className="h-px bg-gray-100" />
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDuplicate(shareId); }}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Copy className="w-4 h-4 text-gray-500" />
            複製
          </button>
          <div className="h-px bg-gray-100" />
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(shareId); }}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-[14px] text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            削除
          </button>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState<string | null>(null);
  const [trashedTrips, setTrashedTrips] = useState<Trip[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editingTripTitle, setEditingTripTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [snackbar, setSnackbar] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const handleSnackbar = (msg: string) => {
    setSnackbar(msg);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 2500);
  };

  const refreshAll = async () => {
    const [t, trashed] = await Promise.all([getTrips(), getTrashedTrips()]);
    setTrips(t);
    setTrashedTrips(trashed);
  };

  useEffect(() => {
    refreshAll().then(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newStart || !newEnd) return;
    const trip = await createTrip(newTitle.trim(), newStart, newEnd);
    await refreshAll();
    setShowCreate(false);
    setNewTitle(''); setNewStart(''); setNewEnd('');
    router.push(`/share/${trip.shareId}`);
  };

  const handleDelete = async (shareId: string) => {
    await deleteTrip(shareId);
    await refreshAll();
    setDeleteConfirm(null);
  };

  const handleDuplicate = async (shareId: string) => {
    const newTrip = await duplicateTrip(shareId);
    if (newTrip) await refreshAll();
  };

  const handleRestore = async (shareId: string) => {
    await restoreTrip(shareId);
    await refreshAll();
  };

  const handlePermanentDelete = async (shareId: string) => {
    await permanentlyDeleteTrip(shareId);
    await refreshAll();
    setPermanentDeleteConfirm(null);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-sm text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)]">
      <main className="px-5 pt-14 pb-24 max-w-lg mx-auto">
        {/* ロゴ + 新規追加ボタン */}
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center shadow-md shadow-blue-500/25 active:scale-95 transition-transform"
            aria-label="新規追加"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {trips.length === 0 ? (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex flex-col items-center justify-center pt-16 text-center active:bg-gray-50/50 rounded-3xl transition-colors cursor-pointer pb-8"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center mb-5">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#93C5FD" fillOpacity="0.6"/>
                <circle cx="12" cy="9" r="2.5" fill="#3B82F6"/>
              </svg>
            </div>
            <h2 className="text-[20px] font-bold text-gray-900 mb-2">旅行プランがありません</h2>
            <p className="text-[14px] text-gray-400 mb-4 leading-relaxed">
              タップして旅の計画を始めましょう
            </p>
            <span className="flex items-center gap-2 h-[48px] px-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl text-[16px] font-semibold shadow-lg shadow-blue-500/25">
              <Plus className="w-5 h-5" />
              最初のプランを作成
            </span>
          </button>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => {
              const dayCount = trip.days.length;
              const spotCount = trip.days.reduce((sum, d) => sum + d.spots.length, 0);

              return (
                <div
                  key={trip.id}
                  className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.04] active:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => { if (editingTripId !== trip.id) router.push(`/share/${trip.shareId}`); }}
                >
                  <div className="flex items-center gap-2 p-4">
                    <div className="flex-1 min-w-0">
                      {editingTripId === trip.id ? (
                        <input
                          ref={titleInputRef}
                          type="text"
                          value={editingTripTitle}
                          onChange={(e) => setEditingTripTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={async () => {
                            const trimmed = editingTripTitle.trim();
                            if (trimmed && trimmed !== trip.title) {
                              await updateTrip({ ...trip, title: trimmed });
                              await refreshAll();
                            }
                            setEditingTripId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingTripId(null);
                          }}
                          className="text-[17px] font-bold text-gray-900 w-full bg-transparent outline-none ring-1 ring-blue-500/40 rounded-lg px-2 py-0.5 -ml-2"
                        />
                      ) : (
                        <h3 className="text-[17px] font-bold text-gray-900 truncate">{trip.title}</h3>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(trip.startDate)} 〜 {formatDate(trip.endDate)}</span>
                      </div>
                      <p className="text-[12px] text-gray-400 mt-0.5">{dayCount}日間 · {spotCount}スポット</p>
                    </div>
                    <TripMenu
                      shareId={trip.shareId}
                      viewId={trip.viewId}
                      onDelete={(id) => setDeleteConfirm(id)}
                      onDuplicate={handleDuplicate}
                      onSnackbar={handleSnackbar}
                      onRename={() => {
                        setEditingTripId(trip.id);
                        setEditingTripTitle(trip.title);
                        setTimeout(() => titleInputRef.current?.focus(), 50);
                      }}
                    />
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ゴミ箱セクション */}
        {trashedTrips.length > 0 && (
          <div className="mt-10">
            <button
              onClick={() => setShowTrash(!showTrash)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors mb-3"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-[14px] font-medium">ゴミ箱（{trashedTrips.length}件）</span>
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform',
                showTrash && 'rotate-180'
              )} />
            </button>
            {showTrash && (
              <div className="space-y-2">
                {trashedTrips.map((trip) => {
                  const dayCount = trip.days.length;
                  const spotCount = trip.days.reduce((sum, d) => sum + d.spots.length, 0);
                  const deletedDate = trip.deletedAt ? new Date(trip.deletedAt) : null;
                  const deletedLabel = deletedDate
                    ? `${deletedDate.getMonth() + 1}/${deletedDate.getDate()} に削除`
                    : '';

                  return (
                    <div key={trip.id} className="bg-gray-50 rounded-2xl ring-1 ring-black/[0.04] p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 opacity-60">
                          <h3 className="text-[15px] font-bold text-gray-700 truncate">{trip.title}</h3>
                          <div className="flex items-center gap-1.5 mt-1 text-[12px] text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(trip.startDate)} 〜 {formatDate(trip.endDate)}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {dayCount}日間 · {spotCount}スポット · {deletedLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleRestore(trip.shareId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg ring-1 ring-black/[0.08] text-[12px] font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            復元
                          </button>
                          <button
                            onClick={() => setPermanentDeleteConfirm(trip.shareId)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg ring-1 ring-black/[0.08] text-[12px] font-medium text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            完全削除
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 新規作成モーダル */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 modal-overlay flex items-end justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="w-full max-w-lg bg-white rounded-t-2xl modal-sheet pb-8">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3">
              <button
                onClick={() => setShowCreate(false)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label="キャンセル"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3c3c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span className="text-[16px] font-semibold">新しい旅行</span>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newStart || !newEnd}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                  !newTitle.trim() || !newStart || !newEnd ? 'bg-gray-100' : 'bg-[var(--color-primary)]'
                )}
                aria-label="作成"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={!newTitle.trim() || !newStart || !newEnd ? '#8e8e93' : '#fff'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 space-y-3">
              <div>
                <label className="text-[12px] text-gray-500 mb-1 block">タイトル</label>
                <input type="text" className="ios-input" placeholder="例：沖縄家族旅行" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[12px] text-gray-500 mb-1 block">出発日</label>
                  <input type="date" className="ios-input" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                </div>
                <div className="flex-1">
                  <label className="text-[12px] text-gray-500 mb-1 block">帰着日</label>
                  <input type="date" className="ios-input" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ゴミ箱に移動確認 */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 modal-overlay flex items-center justify-center px-8"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-[270px] overflow-hidden text-center">
            <div className="pt-5 pb-4 px-4">
              <h3 className="text-[15px] font-semibold mb-1">ゴミ箱に移動</h3>
              <p className="text-[13px] text-gray-500">ゴミ箱からいつでも復元できます</p>
            </div>
            <div className="border-t border-gray-100 flex">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 text-[15px] text-[var(--color-primary)] border-r border-gray-100">
                キャンセル
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 text-[15px] text-red-500 font-semibold">
                ゴミ箱へ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完全削除確認 */}
      {permanentDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 modal-overlay flex items-center justify-center px-8"
          onClick={(e) => { if (e.target === e.currentTarget) setPermanentDeleteConfirm(null); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-[270px] overflow-hidden text-center">
            <div className="pt-5 pb-4 px-4">
              <h3 className="text-[15px] font-semibold mb-1">完全に削除</h3>
              <p className="text-[13px] text-gray-500">この操作は取り消せません</p>
            </div>
            <div className="border-t border-gray-100 flex">
              <button onClick={() => setPermanentDeleteConfirm(null)} className="flex-1 py-3 text-[15px] text-[var(--color-primary)] border-r border-gray-100">
                キャンセル
              </button>
              <button onClick={() => handlePermanentDelete(permanentDeleteConfirm)} className="flex-1 py-3 text-[15px] text-red-500 font-semibold">
                完全削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スナックバー */}
      {showSnackbar && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 bg-gray-900 text-white text-[14px] font-medium rounded-2xl shadow-xl animate-[fadeInUp_0.3s_ease]">
          {snackbar}
        </div>
      )}
    </div>
  );
}

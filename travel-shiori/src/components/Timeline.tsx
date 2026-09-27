'use client';

import { ChevronRight, Trash2 } from 'lucide-react';
import { Spot, Day, getSpotConfig, TRANSPORT_LABELS, TRANSPORT_CONFIG, ASSIGNEE_CONFIG, DAY_COLORS, getDayColor } from '../lib/types';
import { cn } from '../lib/utils';
import type { DraftSpot } from '../lib/trip-review';
import { getMissingInfo } from '../lib/trip-review';

/** Day セクション情報 */
export interface DaySection {
  day: Day;
  dayIdx: number;
  dateLabel: string;    // "5/28(木)"
  headline: string;     // "女満別/旭川→東京 大誓堂・屋形船"
  spots: Spot[];        // フィルタ済みのスポット
}

interface TimelineProps {
  /** Day セクション単位のデータ（All表示用） */
  daySections: DaySection[];
  selectedSpotId: string | null;
  onSpotSelect: (id: string) => void;
  onSpotDelete: (id: string) => void;
  onAdd?: () => void;
  readOnly: boolean;
  /** ドラフトスポット（抜けチェック用、破線カードとして挿入） */
  draftSpots?: DraftSpot[];
  /** ドラフトカードをタップ時 */
  onDraftTap?: (draft: DraftSpot) => void;
}

export default function Timeline({
  daySections,
  selectedSpotId,
  onSpotSelect,
  onSpotDelete,
  onAdd,
  readOnly,
  draftSpots = [],
  onDraftTap,
}: TimelineProps) {
  const totalSpots = daySections.reduce((sum, s) => sum + s.spots.length, 0);

  if (totalSpots === 0 && draftSpots.length === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="w-full flex flex-col items-center justify-center py-20 text-gray-400 active:bg-gray-50 transition-colors rounded-2xl cursor-pointer"
      >
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">📍</span>
        </div>
        <p className="text-[15px] font-medium text-gray-500">スポットがまだありません</p>
        <p className="text-[13px] mt-1 text-gray-400">タップしてスポットを追加</p>
      </button>
    );
  }

  const dayColors = DAY_COLORS;

  // ドラフトを dayId + afterSpotId でインデックス化
  const draftsByDay: Record<string, Record<string, DraftSpot[]>> = {};
  for (const d of draftSpots) {
    if (!draftsByDay[d.dayId]) draftsByDay[d.dayId] = {};
    const key = d.afterSpotId ?? '__end__';
    if (!draftsByDay[d.dayId][key]) draftsByDay[d.dayId][key] = [];
    draftsByDay[d.dayId][key].push(d);
  }

  return (
    <div className="px-3 pt-1">
      {daySections.map((section, sectionIdx) => {
        const { day, spots } = section;
        if (spots.length === 0 && !draftsByDay[day.id]) return null;
        const color = dayColors[section.dayIdx % dayColors.length];
        const dayDrafts = draftsByDay[day.id] || {};

        return (
          <div key={day.id} data-day-idx={section.dayIdx}>
            {sectionIdx > 0 && <div className="h-10" />}

            {/* Day セクションヘッダー */}
            <div className="sticky top-0 z-10 -mx-3 px-4 pt-3 pb-2" style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.98) 70%, rgba(255,255,255,0.85))',
              backdropFilter: 'blur(8px)',
            }}>
              <div className="flex items-baseline gap-2">
                <span className={cn('font-black', color.text)}>
                  <span className="text-[36px] tracking-tighter" style={{ fontWeight: 900 }}>{day.dayNum}</span>
                  <span className="text-[22px] tracking-tight ml-[1px]">日目</span>
                </span>
                <span className="text-[17px] font-semibold text-gray-500">
                  {section.dateLabel}
                </span>
              </div>
              {section.headline && (
                <p className="text-[15px] text-gray-400 mt-0.5 leading-snug">
                  {section.headline}
                </p>
              )}
            </div>

            {/* スポット一覧 + ドラフトカード */}
            <div className="flex flex-col gap-1.5 pt-2">
              {spots.map((spot) => (
                <div key={spot.id}>
                  <SpotCard
                    spot={spot}
                    dayNum={day.dayNum}
                    isSelected={selectedSpotId === spot.id}
                    readOnly={readOnly}
                    onSelect={() => onSpotSelect(spot.id)}
                    onDelete={() => onSpotDelete(spot.id)}
                  />
                  {/* このスポットの後に挿入されるドラフト */}
                  {dayDrafts[spot.id]?.map((draft) => (
                    <div key={draft.id} className="mt-1.5">
                      <DraftCard
                        spot={draft}
                        dayNum={day.dayNum}
                        onTap={() => onDraftTap?.(draft)}
                      />
                    </div>
                  ))}
                </div>
              ))}
              {/* 末尾に挿入されるドラフト */}
              {dayDrafts['__end__']?.map((draft) => (
                <div key={draft.id}>
                  <DraftCard
                    spot={draft}
                    dayNum={day.dayNum}
                    onTap={() => onDraftTap?.(draft)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 入力が必要なフィールドのプレースホルダー表示 */
function FieldPlaceholder({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg bg-orange-50 border border-dashed border-orange-300 text-orange-500 font-medium">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      </svg>
      {label}
    </span>
  );
}

/** ドラフトカード（通常カードと同じ見た目 + 破線ボーダー + 入力すべき箇所を明示） */
function DraftCard({
  spot,
  dayNum,
  onTap,
}: {
  spot: DraftSpot;
  dayNum: number;
  onTap: () => void;
}) {
  const config = getSpotConfig(spot.type);
  const isTransit = spot.type === 'transit';
  const dayColor = getDayColor(dayNum);

  if (isTransit) {
    const tc = spot.transport ? TRANSPORT_CONFIG[spot.transport] : null;
    return (
      <button
        type="button"
        onClick={onTap}
        className="w-full text-left rounded-xl py-3 px-3.5 border-2 border-dashed border-blue-300 bg-blue-50/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center flex-shrink-0 w-10">
            <div className="w-0.5 h-2 bg-blue-200 rounded-full" />
            <span className="text-[28px] leading-none my-0.5">{tc?.icon ?? '🔄'}</span>
            <div className="w-0.5 h-2 bg-blue-200 rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[15px] font-semibold text-gray-700 truncate block">
              {spot.name}
            </span>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {spot.time ? (
                <span className="text-[14px] tabular-nums text-gray-400 font-medium">{spot.time}</span>
              ) : (
                <FieldPlaceholder label="時刻を入力" />
              )}
              {tc ? (
                <span className="text-[12px] px-2 py-0.5 rounded-full bg-gray-200/70 text-gray-600 font-medium">{tc.label}</span>
              ) : (
                <FieldPlaceholder label="移動手段を選択" />
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-blue-400 flex-shrink-0" />
        </div>
      </button>
    );
  }

  // 目的地/ホテル/食事
  const isNamePlaceholder = spot.name === '宿泊先' || spot.name === '食事';

  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full text-left rounded-2xl p-3.5 border-2 border-dashed border-blue-300 bg-blue-50/30"
    >
      <div className="flex items-center gap-3">
        <MiniPinIcon dayNum={dayNum} size={36} draft />

        <div className="flex-1 min-w-0">
          {isNamePlaceholder ? (
            <div className="flex items-center gap-2">
              <span className="text-[19px] font-bold text-gray-300 leading-tight">{spot.name}</span>
              <FieldPlaceholder label="名前を入力" />
            </div>
          ) : (
            <span className="text-[19px] font-bold text-gray-900 truncate block leading-tight">
              {spot.name}
            </span>
          )}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {spot.time ? (
              <span className="text-[14px] tabular-nums text-gray-400 font-medium">{spot.time}</span>
            ) : (
              <FieldPlaceholder label="時刻を入力" />
            )}
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: dayColor.hex + '15',
                color: dayColor.hex,
              }}
            >
              {config?.label ?? 'その他'}
            </span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-blue-400 flex-shrink-0" />
      </div>
    </button>
  );
}

/** 人物の色テーマ + アバター画像 */
const ASSIGNEE_COLORS: Record<string, { bg: string; text: string; avatar: string }> = {
  parents: { bg: 'bg-orange-50', text: 'text-orange-700', avatar: '/avatar-parents-sm.jpg' },
  son:     { bg: 'bg-green-50',  text: 'text-green-700',  avatar: '/avatar-son-sm.jpg' },
};

/** ミニピンアイコン */
function MiniPinIcon({ dayNum, size = 28, draft = false }: { dayNum: number; size?: number; draft?: boolean }) {
  const color = getDayColor(dayNum);
  const svgH = Math.round(size * 1.3);
  return (
    <svg width={size} height={svgH} viewBox="0 0 32 42" fill="none" className="flex-shrink-0" style={draft ? { opacity: 0.5 } : undefined}>
      <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 26 16 26s16-14 16-26C32 7.164 24.836 0 16 0z"
            fill={draft ? '#93C5FD' : color.hex} />
      <circle cx="16" cy="15" r="9" fill="white" opacity="0.95"/>
      <text x="16" y="19" textAnchor="middle" fill={draft ? '#93C5FD' : color.hex}
            fontSize="14" fontWeight="700">{dayNum}</text>
    </svg>
  );
}

/** 1スポットのカード表示 */
function SpotCard({
  spot,
  dayNum,
  isSelected,
  readOnly,
  onSelect,
  onDelete,
}: {
  spot: Spot;
  dayNum: number;
  isSelected: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const config = getSpotConfig(spot.type);
  const isTransit = spot.type === 'transit';
  const assignee = spot.assignee && spot.assignee !== 'all' ? spot.assignee : null;
  const aColor = assignee ? ASSIGNEE_COLORS[assignee] : null;
  const dayColor = getDayColor(dayNum);

  if (isTransit) {
    const tc = spot.transport ? TRANSPORT_CONFIG[spot.transport] : null;
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full text-left rounded-xl py-3 px-3.5 transition-all duration-150 active:scale-[0.98]',
          'bg-gray-50 ring-1 ring-gray-100',
          isSelected && 'ring-2 ring-blue-500/30 bg-blue-50/30',
        )}
      >
        <div className="flex items-center gap-3">
          {assignee && (
            <img
              src={aColor!.avatar}
              alt={ASSIGNEE_CONFIG[assignee]?.label}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            />
          )}
          <div className="flex flex-col items-center flex-shrink-0 w-10">
            <div className="w-0.5 h-2 bg-gray-200 rounded-full" />
            <span className="text-[28px] leading-none my-0.5">{tc?.icon ?? '🔄'}</span>
            <div className="w-0.5 h-2 bg-gray-200 rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[15px] font-semibold text-gray-700 truncate block">
              {spot.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[14px] tabular-nums text-gray-400 font-medium">
                {spot.time}
              </span>
              {spot.endTime && (
                <span className="text-[13px] text-gray-400">– {spot.endTime}</span>
              )}
              {tc && (
                <span className="text-[12px] px-2 py-0.5 rounded-full bg-gray-200/70 text-gray-600 font-medium">
                  {tc.label}
                </span>
              )}
            </div>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="pc-delete-btn w-8 h-8 rounded-full items-center justify-center hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
              </button>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-2xl transition-all duration-150 active:scale-[0.98]',
        'shadow-sm p-3.5',
        assignee
          ? aColor!.bg
          : 'bg-white ring-1 ring-black/[0.04]',
        isSelected && 'ring-2 ring-blue-500/30 shadow-md',
      )}
      style={{ borderLeft: `3px solid ${dayColor.hex}` }}
    >
      <div className="flex items-center gap-3">
        {assignee && (
          <img
            src={aColor!.avatar}
            alt={ASSIGNEE_CONFIG[assignee]?.label}
            className="w-11 h-11 rounded-full object-cover flex-shrink-0"
          />
        )}

        <MiniPinIcon dayNum={dayNum} size={36} />

        <div className="flex-1 min-w-0">
          <span className="text-[19px] font-bold text-gray-900 truncate block leading-tight">
            {spot.name}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[14px] tabular-nums text-gray-400 font-medium">
              {spot.time}
            </span>
            {spot.endTime && (
              <span className="text-[13px] text-gray-400">– {spot.endTime}</span>
            )}
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: dayColor.hex + '15',
                color: dayColor.hex,
              }}
            >
              {config?.label ?? 'その他'}
            </span>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="pc-delete-btn w-8 h-8 rounded-full items-center justify-center hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </div>
        )}
      </div>

      {spot.memo && (
        <div className="mt-2.5 pl-[50px] pt-2 border-t border-gray-200">
          <p className="text-[13px] text-gray-500 leading-relaxed">{spot.memo}</p>
        </div>
      )}
    </button>
  );
}

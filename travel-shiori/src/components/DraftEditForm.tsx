'use client';

import { useState, useEffect, useRef } from 'react';
import { Spot, SpotType, TransportType, SPOT_CONFIG, TRANSPORT_CONFIG } from '../lib/types';
import type { DraftSpot } from '../lib/trip-review';

/** 未入力フィールドのアラートバッジ */
function MissingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-orange-50 border border-dashed border-orange-300 text-orange-500 font-medium">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
      </svg>
      {label}
    </span>
  );
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface DraftEditFormProps {
  draft: DraftSpot;
  onSave: (updated: DraftSpot) => void;
  onBack: () => void;
}

export default function DraftEditForm({ draft, onSave, onBack }: DraftEditFormProps) {
  const [name, setName] = useState(draft.name);
  const [type, setType] = useState<SpotType>(draft.type);
  const [time, setTime] = useState(draft.time || '');
  const [endTime, setEndTime] = useState(draft.endTime || '');
  const [transport, setTransport] = useState<TransportType | undefined>(draft.transport);
  const [memo, setMemo] = useState(draft.memo || '');
  const [lat, setLat] = useState<number | undefined>(draft.lat);
  const [lng, setLng] = useState<number | undefined>(draft.lng);

  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setName(draft.name);
    setType(draft.type);
    setTime(draft.time || '');
    setEndTime(draft.endTime || '');
    setTransport(draft.transport);
    setMemo(draft.memo || '');
    setLat(draft.lat);
    setLng(draft.lng);
  }, [draft]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&accept-language=ja`
        );
        const data: NominatimResult[] = await res.json();
        setSearchResults(data);
        setShowResults(data.length > 0);
      } catch {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 500);
  };

  const selectResult = (result: NominatimResult) => {
    setName(result.display_name.split(',')[0].trim());
    setLat(parseFloat(result.lat));
    setLng(parseFloat(result.lon));
    setShowResults(false);
    setSearchResults([]);
  };

  const handleSave = () => {
    onSave({
      ...draft,
      name: name.trim() || draft.name,
      type,
      time,
      endTime: endTime || undefined,
      transport: type === 'transit' ? transport : undefined,
      memo: memo.trim() || undefined,
      lat,
      lng,
    });
  };

  const spotTypes = Object.keys(SPOT_CONFIG) as SpotType[];
  const transportTypes = Object.keys(TRANSPORT_CONFIG) as TransportType[];

  // 未入力チェック
  const isNameEmpty = !name.trim() || name === '宿泊先' || name === '食事';
  const isTimeEmpty = !time;
  const isTransportEmpty = type === 'transit' && !transport;

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー: 戻る + 完了 */}
      <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3c3c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[16px] font-bold">編集</span>
        <button
          onClick={handleSave}
          className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>

      {/* フォーム */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* スポット名 */}
        <div className="mb-3 relative">
          <div className="flex items-center gap-2 mb-1 pl-1">
            <label className="text-[12px] text-gray-400 font-medium">スポット名</label>
            {isNameEmpty && <MissingBadge label="名前を入力してください" />}
          </div>
          <input
            type="text"
            placeholder="場所を検索..."
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className={`w-full px-4 py-3 bg-white rounded-xl text-[16px] outline-none focus:ring-2 focus:ring-blue-500/30 ${isNameEmpty ? 'ring-1 ring-orange-300' : ''}`}
          />
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white rounded-xl shadow-lg z-10 mt-1 overflow-hidden">
              {searchResults.map((result, i) => (
                <div
                  key={i}
                  onMouseDown={() => selectResult(result)}
                  className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-0"
                >
                  <div className="text-[14px] font-medium">{result.display_name.split(',')[0]}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5 truncate">{result.display_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* カテゴリ */}
        <div className="mb-3">
          <label className="text-[12px] text-gray-400 mb-1.5 block pl-1 font-medium">カテゴリ</label>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {spotTypes.map((st) => {
              const config = SPOT_CONFIG[st];
              const selected = type === st;
              return (
                <button
                  key={st}
                  onClick={() => setType(st)}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all"
                  style={{
                    background: selected ? config.color : '#fff',
                    color: selected ? '#fff' : '#000',
                    boxShadow: selected ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 時刻 */}
        <div className="mb-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 pl-1">
                <label className="text-[12px] text-gray-400 font-medium">開始時刻</label>
                {isTimeEmpty && <MissingBadge label="入力してください" />}
              </div>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-full px-4 py-3 bg-white rounded-xl text-[16px] outline-none focus:ring-2 focus:ring-blue-500/30 ${isTimeEmpty ? 'ring-1 ring-orange-300' : ''}`}
              />
            </div>
            <div className="flex-1">
              <label className="text-[12px] text-gray-400 mb-1 block pl-1 font-medium">終了時刻</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-white rounded-xl text-[16px] outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
        </div>

        {/* 移動手段（transit のみ） */}
        {type === 'transit' && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5 pl-1">
              <label className="text-[12px] text-gray-400 font-medium">移動手段</label>
              {isTransportEmpty && <MissingBadge label="選択してください" />}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {transportTypes.map((tt) => {
                const selected = transport === tt;
                const tc = TRANSPORT_CONFIG[tt];
                return (
                  <button
                    key={tt}
                    onClick={() => setTransport(tt)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
                    style={{
                      background: selected ? '#1a1a1a' : '#fff',
                      color: selected ? '#fff' : '#000',
                      boxShadow: selected ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <span className="text-[15px]">{tc?.icon}</span>
                    <span>{tc?.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* メモ */}
        <div className="mb-3">
          <label className="text-[12px] text-gray-400 mb-1 block pl-1 font-medium">メモ</label>
          <textarea
            placeholder="メモを入力..."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 bg-white rounded-xl text-[16px] outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
          />
        </div>
      </div>
    </div>
  );
}

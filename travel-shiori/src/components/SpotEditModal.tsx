'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Spot, SpotType, TransportType, AssigneeType, SPOT_CONFIG, TRANSPORT_LABELS, TRANSPORT_CONFIG, ASSIGNEE_CONFIG, getSpotConfig } from '../lib/types';

export interface SpotFormData {
  name: string;
  type: SpotType;
  isMain: boolean;
  time: string;
  endTime?: string;
  transport?: TransportType;
  assignee?: AssigneeType;
  lat?: number;
  lng?: number;
  memo?: string;
  dayId?: string;
}

interface DayOption {
  id: string;
  label: string;
}

interface SpotEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (spot: SpotFormData) => void;
  initialData?: Partial<Spot>;
  dayOptions?: DayOption[];
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

// ==============================
// Drum roll picker column (mobile)
// ==============================
const ITEM_H = 32;
const VISIBLE = 3;
const DRUM_H = ITEM_H * VISIBLE;

function DrumColumn({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const idx = Math.max(0, items.indexOf(value));

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = idx * ITEM_H;
    }
  }, [idx]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    if (isScrolling.current) return;
    isScrolling.current = true;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) { isScrolling.current = false; return; }
      const newIdx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, newIdx));
      if (items[clamped] !== value) onChange(items[clamped]);
      isScrolling.current = false;
    });
  };

  return (
    <div style={{ position: 'relative', height: DRUM_H, width: 52, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: ITEM_H, left: 0, right: 0,
        height: ITEM_H, background: '#f2f2f7', borderRadius: 8,
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          height: '100%', overflowY: 'auto', position: 'relative', zIndex: 1,
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
      >
        <div style={{ height: ITEM_H }} />
        {items.map((item, i) => {
          const selected = i === idx;
          return (
            <div
              key={item}
              style={{
                height: ITEM_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: selected ? 20 : 16,
                fontWeight: selected ? 700 : 400,
                color: selected ? '#1a1a1a' : '#c7c7cc',
                fontFamily: "'Roboto', sans-serif",
                scrollSnapAlign: 'start',
                transition: 'font-size 0.1s, color 0.1s',
                userSelect: 'none',
              }}
            >
              {item}
            </div>
          );
        })}
        <div style={{ height: ITEM_H }} />
      </div>
      <style>{`
        div[style*="scroll-snap-type"]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

// ==============================
// TimePicker: mobile=drum roll, PC=select dropdown
// ==============================
function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  const [h, m] = value.split(':');
  const currentH = hours.includes(h) ? h : '09';
  const currentM = minutes.includes(m) ? m : '00';

  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // PC: select dropdown
  if (!isMobile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 0' }}>
        <select
          value={currentH}
          onChange={(e) => onChange(`${e.target.value}:${currentM}`)}
          style={{
            fontSize: 20, fontWeight: 700, fontFamily: "'Roboto', sans-serif",
            padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e5ea',
            background: '#fff', color: '#1a1a1a', cursor: 'pointer',
            appearance: 'auto' as const,
          }}
        >
          {hours.map(hh => <option key={hh} value={hh}>{hh}</option>)}
        </select>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>:</span>
        <select
          value={currentM}
          onChange={(e) => onChange(`${currentH}:${e.target.value}`)}
          style={{
            fontSize: 20, fontWeight: 700, fontFamily: "'Roboto', sans-serif",
            padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e5ea',
            background: '#fff', color: '#1a1a1a', cursor: 'pointer',
            appearance: 'auto' as const,
          }}
        >
          {minutes.map(mm => <option key={mm} value={mm}>{mm}</option>)}
        </select>
      </div>
    );
  }

  // Mobile: drum roll
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      padding: '2px 0',
    }}>
      <DrumColumn
        items={hours}
        value={currentH}
        onChange={(v) => onChange(`${v}:${currentM}`)}
      />
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>:</div>
      <DrumColumn
        items={minutes}
        value={currentM}
        onChange={(v) => onChange(`${currentH}:${v}`)}
      />
    </div>
  );
}

// ==============================
// Main SpotEditModal
// ==============================
export default function SpotEditModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  dayOptions,
}: SpotEditModalProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [type, setType] = useState<SpotType>(initialData?.type ?? 'destination');
  const [isMain, setIsMain] = useState(initialData?.isMain ?? false);
  const [time, setTime] = useState(initialData?.time ?? '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime ?? '');
  const [showEndTime, setShowEndTime] = useState(!!initialData?.endTime);
  const [transport, setTransport] = useState<TransportType | undefined>(initialData?.transport);
  const [assignee, setAssignee] = useState<AssigneeType | undefined>(initialData?.assignee);
  const [lat, setLat] = useState<number | undefined>(initialData?.lat);
  const [lng, setLng] = useState<number | undefined>(initialData?.lng);
  const [memo, setMemo] = useState(initialData?.memo ?? '');
  const [dayId, setDayId] = useState(initialData?.dayId ?? '');

  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name ?? '');
      setType(initialData?.type ?? 'destination');
      setIsMain(initialData?.isMain ?? false);
      setTime(initialData?.time ?? '09:00');
      setEndTime(initialData?.endTime ?? '');
      setShowEndTime(!!initialData?.endTime);
      setTransport(initialData?.transport);
      setAssignee(initialData?.assignee);
      setLat(initialData?.lat);
      setLng(initialData?.lng);
      setMemo(initialData?.memo ?? '');
      setDayId(initialData?.dayId ?? '');
      setSearchResults([]);
      setShowResults(false);
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialData]);

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

  const selectSearchResult = (result: NominatimResult) => {
    const shortName = result.display_name.split(',')[0].trim();
    setName(shortName);
    setLat(parseFloat(result.lat));
    setLng(parseFloat(result.lon));
    setShowResults(false);
    setSearchResults([]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const data: SpotFormData = {
      name: name.trim(),
      type,
      isMain,
      time,
      ...(showEndTime && endTime ? { endTime } : {}),
      ...(type === 'transit' && transport ? { transport } : {}),
      ...(assignee && assignee !== 'all' ? { assignee } : {}),
      ...(lat !== undefined ? { lat } : {}),
      ...(lng !== undefined ? { lng } : {}),
      ...(memo.trim() ? { memo: memo.trim() } : {}),
      ...(dayId ? { dayId } : {}),
    };
    onSave(data);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!visible) return null;

  const spotTypes = Object.keys(SPOT_CONFIG) as SpotType[];
  const transportTypes = Object.keys(TRANSPORT_LABELS) as TransportType[];
  const assigneeTypes = Object.keys(ASSIGNEE_CONFIG) as AssigneeType[];

  return (
    <>
      <style>{`
        .spot-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          transition: opacity 0.3s ease;
        }
        @media (min-width: 768px) {
          .spot-modal-overlay {
            align-items: center;
          }
        }
        .spot-modal-sheet {
          background: #f2f2f7;
          border-radius: 16px 16px 0 0;
          width: 100%;
          max-width: 500px;
          max-height: 92vh;
          overflow-y: auto;
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
          padding-bottom: env(safe-area-inset-bottom, 20px);
          -webkit-overflow-scrolling: touch;
        }
        @media (min-width: 768px) {
          .spot-modal-sheet {
            border-radius: 20px;
            max-height: 80vh;
            transform: translateY(0) scale(0.95);
            opacity: 0;
            transition: transform 0.25s ease, opacity 0.25s ease;
            box-shadow: 0 25px 60px rgba(0,0,0,0.2);
          }
          .spot-modal-sheet.open {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        .spot-modal-sheet.open {
          transform: translateY(0);
        }
        .spot-modal-sheet .ios-input {
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-radius: 10px;
          background: #fff;
          font-size: 16px;
          color: #000;
          outline: none;
          -webkit-appearance: none;
          font-family: 'Roboto', sans-serif;
        }
        .spot-modal-sheet .ios-input::placeholder {
          color: #c7c7cc;
        }
        .spot-modal-sheet .ios-input:focus {
          box-shadow: 0 0 0 2px rgba(0,122,255,0.3);
        }
      `}</style>

      <div
        className="spot-modal-overlay"
        style={{ opacity: animateIn ? 1 : 0 }}
        onClick={handleBackdropClick}
      >
        <div className={`spot-modal-sheet ${animateIn ? 'open' : ''}`}>
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
            <div style={{ width: 36, height: 5, borderRadius: 2.5, background: '#c7c7cc' }} />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 12px 12px',
            borderBottom: '0.5px solid #e5e5ea',
          }}>
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#e5e5ea', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3c3c43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              {initialData?.id ? 'スポット編集' : 'スポット追加'}
            </span>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: name.trim() ? '#1a1a1a' : '#e5e5ea',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: name.trim() ? 'pointer' : 'default',
                transition: 'background 0.2s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={name.trim() ? '#fff' : '#8e8e93'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div style={{ padding: '16px' }}>
            {/* Name */}
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: '#8e8e93', paddingLeft: 4, fontWeight: 500 }}>
                  スポット名
                </label>
              </div>
              <input
                className="ios-input"
                type="text"
                placeholder="場所を検索..."
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
              />
              {showResults && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', borderRadius: 10,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  zIndex: 10, marginTop: 4, overflow: 'hidden',
                }}>
                  {searchResults.map((result, i) => (
                    <div
                      key={i}
                      onMouseDown={() => selectSearchResult(result)}
                      style={{
                        padding: '10px 16px', fontSize: 14, color: '#000', cursor: 'pointer',
                        borderBottom: i < searchResults.length - 1 ? '0.5px solid #e5e5ea' : 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f2f2f7')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      <div style={{ fontWeight: 500 }}>{result.display_name.split(',')[0]}</div>
                      <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.display_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Type selector */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#8e8e93', marginBottom: 6, display: 'block', paddingLeft: 4, fontWeight: 500 }}>
                カテゴリ
              </label>
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
                WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none',
              }}>
                {spotTypes.map((st) => {
                  const config = SPOT_CONFIG[st];
                  const selected = type === st;
                  return (
                    <button
                      key={st}
                      onClick={() => { setType(st); setIsMain(st === 'destination'); }}
                      style={{
                        flexShrink: 0, display: 'flex', alignItems: 'center',
                        padding: '6px 14px', borderRadius: 20, border: 'none',
                        background: selected ? config.color : '#fff',
                        color: selected ? '#fff' : '#000',
                        fontSize: 13, fontWeight: selected ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: selected ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day selector */}
            {dayOptions && dayOptions.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#8e8e93', marginBottom: 6, display: 'block', paddingLeft: 4, fontWeight: 500 }}>
                  日程
                </label>
                <div style={{
                  display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
                  WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none',
                }}>
                  {dayOptions.map((opt) => {
                    const selected = dayId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setDayId(opt.id)}
                        style={{
                          flexShrink: 0, display: 'flex', alignItems: 'center',
                          padding: '6px 12px', borderRadius: 20, border: 'none',
                          background: selected ? '#1a1a1a' : '#fff',
                          color: selected ? '#fff' : '#000',
                          fontSize: 13, fontWeight: selected ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: selected ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assignee selector */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#8e8e93', marginBottom: 6, display: 'block', paddingLeft: 4, fontWeight: 500 }}>
                対象者
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {assigneeTypes.map((at) => {
                  const config = ASSIGNEE_CONFIG[at];
                  const selected = (assignee ?? 'all') === at;
                  return (
                    <button
                      key={at}
                      onClick={() => setAssignee(at)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        padding: '8px 10px', borderRadius: 12, border: 'none',
                        background: selected ? '#1a1a1a' : '#fff',
                        color: selected ? '#fff' : '#000',
                        fontSize: 13, fontWeight: selected ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: selected ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{config.icon}</span>
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time pickers */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: '#8e8e93', marginBottom: 6, display: 'block', paddingLeft: 4, fontWeight: 500 }}>
                    開始時刻
                  </label>
                  <div style={{ background: '#fff', borderRadius: 14, padding: '4px 8px' }}>
                    <TimePicker value={time} onChange={setTime} />
                  </div>
                </div>
                {showEndTime ? (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      <label style={{ fontSize: 12, color: '#8e8e93', paddingLeft: 4, fontWeight: 500 }}>
                        終了時刻
                      </label>
                      <button
                        onClick={() => { setShowEndTime(false); setEndTime(''); }}
                        style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: '#e5e5ea', border: 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', marginLeft: 'auto',
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="3" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 14, padding: '4px 8px' }}>
                      <TimePicker value={endTime || time} onChange={setEndTime} />
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: '#8e8e93', marginBottom: 6, display: 'block', paddingLeft: 4, fontWeight: 500 }}>
                      終了時刻
                    </label>
                    <button
                      onClick={() => {
                        setShowEndTime(true);
                        if (!endTime) setEndTime(time);
                      }}
                      style={{
                        width: '100%', height: DRUM_H + 8,
                        borderRadius: 14, border: '2px dashed #d1d1d6',
                        background: '#f9f9f9',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 4,
                        cursor: 'pointer', color: '#8e8e93',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>タップして追加</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Transport (transit only) */}
            {type === 'transit' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#8e8e93', marginBottom: 6, display: 'block', paddingLeft: 4, fontWeight: 500 }}>
                  移動手段
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {transportTypes.map((tt) => {
                    const selected = transport === tt;
                    const tc = TRANSPORT_CONFIG[tt];
                    return (
                      <button
                        key={tt}
                        onClick={() => setTransport(tt)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 20, border: 'none',
                          background: selected ? '#1a1a1a' : '#fff',
                          color: selected ? '#fff' : '#000',
                          fontSize: 13, fontWeight: selected ? 600 : 400,
                          cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: selected ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                        }}
                      >
                        <span style={{ fontSize: 15 }}>{tc?.icon}</span>
                        <span>{tc?.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Memo */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#8e8e93', marginBottom: 6, display: 'block', paddingLeft: 4, fontWeight: 500 }}>
                メモ
              </label>
              <textarea
                className="ios-input"
                placeholder="メモを入力..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                style={{ resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

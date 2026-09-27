'use client';

import React, { useRef, useState, useCallback } from 'react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

export default function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const ACTION_WIDTH = 72;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const diff = e.touches[0].clientX - startX.current;
    const base = offset < 0 ? -ACTION_WIDTH : 0;
    const clamped = Math.max(-ACTION_WIDTH, Math.min(0, diff + base));
    currentX.current = clamped;
    setOffset(clamped);
  }, [swiping, offset]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    setOffset(currentX.current < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0);
  }, []);

  const close = useCallback(() => setOffset(0), []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
      {/* 削除ボタン（カードの裏に隠れている） */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: ACTION_WIDTH,
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        <button
          onClick={() => { close(); onDelete(); }}
          style={{
            border: 'none',
            background: '#FF3B30',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            width: '100%',
            borderRadius: '0 16px 16px 0',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          削除
        </button>
      </div>
      {/* スワイプで動くコンテンツ本体 */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (offset < 0) { close(); } }}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

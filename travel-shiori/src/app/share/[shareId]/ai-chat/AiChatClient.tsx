'use client';

import { useEffect, useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Send, Loader2, Plus, Check, MapPin, Utensils, Hotel, Train, Bot, ClipboardCheck, ImagePlus, X, MessageCircle, PenSquare } from 'lucide-react';
import { Trip, SpotType, TransportType, SPOT_CONFIG, TRANSPORT_CONFIG } from '../../../../lib/types';
import { getTripByAnyShareId, addSpot } from '../../../../lib/storage';

// ---------- Types ----------

interface SuggestedSpot {
  name: string;
  type: SpotType;
  time?: string;
  endTime?: string;
  dayNum: number;
  memo?: string;
  transport?: TransportType;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];           // base64 data URLs
  spots?: SuggestedSpot[];
  addedSpotNames?: string[];  // しおりに追加済みのスポット名
}

interface ChatSession {
  id: string;
  updatedAt: number;
  messages: ChatMessage[];
}

const MAX_SESSIONS = 3;

function loadSessions(key: string): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ChatSession[];
    return arr.filter((s) => s?.id && Array.isArray(s.messages))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SESSIONS);
  } catch { return []; }
}

function sessionTitle(s: ChatSession): string {
  const firstUser = s.messages.find((m) => m.role === 'user');
  const text = (firstUser?.content || '(無題の会話)').replace(/\s+/g, ' ').trim();
  return text.length > 28 ? text.slice(0, 28) + '…' : text;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  return `${day}日前`;
}

/** 画像をリサイズして base64 data URL を返す */
function resizeImage(file: File, maxPx = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxPx || height > maxPx) {
          const ratio = Math.min(maxPx / width, maxPx / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- Helpers ----------

/** しおりデータをAIに渡す用のテキストに変換 */
function tripToContext(trip: Trip): string {
  const lines: string[] = [];
  lines.push(`旅行: ${trip.title}`);
  lines.push(`期間: ${trip.startDate} 〜 ${trip.endDate}`);
  for (const day of trip.days) {
    lines.push(`\n■ Day${day.dayNum} ${day.headline || ''}`);
    if (day.spots.length === 0) {
      lines.push('  （スポットなし）');
    }
    for (const spot of day.spots) {
      const time = spot.time ? `${spot.time}` : '';
      const endTime = spot.endTime ? `〜${spot.endTime}` : '';
      const transport = spot.transport ? ` (${TRANSPORT_CONFIG[spot.transport]?.label || spot.transport})` : '';
      lines.push(`  ${time}${endTime} ${spot.name} [${spot.type}]${transport}${spot.memo ? ` メモ: ${spot.memo}` : ''}`);
    }
  }
  return lines.join('\n');
}

/** AI応答テキストからスポット提案JSONを抽出 */
function parseSpots(text: string): { displayText: string; spots: SuggestedSpot[] } {
  const match = text.match(/%%%SPOTS_START%%%([\s\S]*?)%%%SPOTS_END%%%/);
  if (!match) return { displayText: text, spots: [] };

  const displayText = text.replace(/%%%SPOTS_START%%%[\s\S]*?%%%SPOTS_END%%%/, '').trim();
  try {
    const spots: SuggestedSpot[] = JSON.parse(match[1].trim());
    return { displayText, spots };
  } catch {
    return { displayText: text, spots: [] };
  }
}

/** スポットタイプのアイコン */
function SpotIcon({ type, className, style }: { type: SpotType; className?: string; style?: React.CSSProperties }) {
  const iconClass = className || 'w-4 h-4';
  switch (type) {
    case 'destination': return <MapPin className={iconClass} style={style} />;
    case 'food': return <Utensils className={iconClass} style={style} />;
    case 'hotel': return <Hotel className={iconClass} style={style} />;
    case 'transit': return <Train className={iconClass} style={style} />;
  }
}

// ---------- Component ----------

export default function AiChatPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params);
  const router = useRouter();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const sessionsKey = `ai-chat-sessions-${shareId}`;
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 起動時に過去のセッション一覧を読み込む
  useEffect(() => {
    setSessions(loadSessions(sessionsKey));
  }, [sessionsKey]);

  // メッセージが変わったら現在セッションをlocalStorageに保存（画像は除外して容量節約）
  useEffect(() => {
    if (messages.length === 0) return;
    const id = sessionId || crypto.randomUUID();
    if (!sessionId) setSessionId(id);

    const toSave: ChatMessage[] = messages.map((m) => ({ ...m, images: undefined }));
    const now = Date.now();
    const updated: ChatSession = { id, messages: toSave, updatedAt: now };

    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      const next = [updated, ...filtered].slice(0, MAX_SESSIONS);
      try {
        localStorage.setItem(sessionsKey, JSON.stringify(next));
      } catch { /* quota exceeded — ignore */ }
      return next;
    });
  }, [messages, sessionId, sessionsKey]);

  const handleResume = (s: ChatSession) => {
    setSessionId(s.id);
    setMessages(s.messages);
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setInput('');
    setPendingImages([]);
    setStreamingText('');
  };

  useEffect(() => {
    getTripByAnyShareId(shareId).then((result) => {
      if (result) {
        setTrip(result.trip);
        setReadOnly(result.readOnly);
      } else {
        router.back();
      }
    });
  }, [shareId, router]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  /** ストリーミングでAIからの応答を読み取る */
  const readStream = async (reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> => {
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            setStreamingText(fullText);
          }
        } catch {
          // パースエラーは無視
        }
      }
    }
    return fullText;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await resizeImage(file, 1024);
        newImages.push(dataUrl);
      } catch { /* skip broken files */ }
    }
    setPendingImages((prev) => [...prev, ...newImages]);
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleSend = async (text?: string) => {
    const msgText = (text || input).trim();
    const images = [...pendingImages];
    if ((!msgText && images.length === 0) || loading || !trip) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msgText || '(画像を送信)',
      images: images.length > 0 ? images : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setPendingImages([]);
    setLoading(true);
    setStreamingText('');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // API用のメッセージ配列を構築（画像つきはvision形式）
    const apiMessages = [...messages, userMsg].map((m) => {
      if (m.images && m.images.length > 0) {
        return {
          role: m.role,
          content: [
            ...m.images.map((url: string) => ({ type: 'image_url' as const, image_url: { url, detail: 'low' as const } })),
            { type: 'text' as const, text: m.content },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          tripContext: tripToContext(trip),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `API error ${res.status}`);
      }

      let fullText: string;

      if (res.headers.get('Content-Type')?.includes('text/event-stream')) {
        const reader = res.body!.getReader();
        fullText = await readStream(reader);
      } else {
        const data = await res.json();
        fullText = data.message;
      }

      const { displayText, spots } = parseSpots(fullText);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: displayText,
        spots: spots.length > 0 ? spots : undefined,
        addedSpotNames: [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const detail = e instanceof Error ? e.message : '';
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `すみません、エラーが発生しました。\n${detail}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  };

  /** 提案されたスポットをしおりに追加 */
  const handleAddSpot = async (msgId: string, spot: SuggestedSpot) => {
    if (!trip || readOnly) return;

    const day = trip.days.find((d) => d.dayNum === spot.dayNum) || trip.days[0];
    if (!day) return;

    const updated = await addSpot(shareId, day.id, {
      name: spot.name,
      type: spot.type,
      isMain: spot.type === 'destination',
      time: spot.time || '',
      endTime: spot.endTime,
      transport: spot.transport,
      memo: spot.memo,
    });

    if (updated) {
      setTrip(updated);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, addedSpotNames: [...(m.addedSpotNames || []), spot.name] }
            : m
        )
      );
    }
  };

  /** 抜けチェック：旅程ページのボトムシート抜けチェック画面に遷移 */
  const handleReviewCheck = () => {
    router.push(`/share/${shareId}?review=1`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // ストリーミング中の表示用テキスト（JSONブロックは非表示）
  const displayStreamingText = streamingText.replace(/%%%SPOTS_START%%%[\s\S]*$/, '').trim();

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* ── ヘッダー ── */}
      <header className="ios-nav flex items-center h-11 px-4 flex-shrink-0 z-10">
        <button onClick={() => router.push(`/share/${shareId}`)} className="flex items-center gap-0.5 text-blue-500 active:opacity-60 -ml-1">
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          <span className="text-[17px]">戻る</span>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold truncate mx-4">
          AIアシスタント
        </h1>
        {messages.length > 0 ? (
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1 text-blue-500 active:opacity-60 -mr-1"
            aria-label="新しい会話を始める"
          >
            <PenSquare className="w-5 h-5" strokeWidth={2} />
          </button>
        ) : (
          <div className="w-14" />
        )}
      </header>

      {/* ── メッセージ一覧 ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center gap-3">
            <Bot className="w-32 h-32 text-gray-300 -mb-3" strokeWidth={1.5} />
            <div>
              <p className="text-[15px] font-medium text-gray-600">旅のAIアシスタント</p>
              <p className="text-[13px] mt-0.5 leading-relaxed text-gray-400">
                プランの提案やアドバイスをAIがお手伝いします
              </p>
            </div>

            {/* クイックアクション */}
            <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
              <button
                onClick={() => handleSend('おすすめのスポットを提案して')}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 text-left shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                <span className="text-[14px] text-gray-700">おすすめスポットを提案して</span>
              </button>
              <button
                onClick={handleReviewCheck}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 text-left shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-[14px] text-gray-700">旅程の抜けをチェック</span>
              </button>
              <button
                onClick={() => handleSend('空いている時間帯に何か追加したい')}
                className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 text-left shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-[14px] text-gray-700">空き時間を埋める提案をして</span>
              </button>
            </div>

            {/* 過去の会話から再開 */}
            {sessions.length > 0 && (
              <div className="w-full max-w-xs mt-4">
                <p className="text-[12px] text-gray-400 mb-2 text-left px-1">過去の会話から再開</p>
                <div className="flex flex-col gap-2">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleResume(s)}
                      className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 text-left shadow-sm active:scale-[0.98] transition-transform"
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-gray-700 truncate">{sessionTitle(s)}</p>
                        <p className="text-[11px] text-gray-400">{timeAgo(s.updatedAt)}・{s.messages.length}件</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {/* メッセージ吹き出し */}
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                }`}
              >
                {msg.images && msg.images.length > 0 && (
                  <div className={`flex flex-wrap gap-1.5 ${msg.content && msg.content !== '(画像を送信)' ? 'mb-2' : ''}`}>
                    {msg.images.map((src, i) => (
                      <img key={i} src={src} alt="" className="rounded-lg max-w-[200px] max-h-[200px] object-cover" />
                    ))}
                  </div>
                )}
                {msg.content !== '(画像を送信)' && msg.content}
              </div>
            </div>

            {/* スポット提案カード */}
            {msg.spots && msg.spots.length > 0 && (
              <div className="mt-2 space-y-2 ml-0 mr-8">
                {msg.spots.map((spot, idx) => {
                  const added = msg.addedSpotNames?.includes(spot.name);
                  const config = SPOT_CONFIG[spot.type];
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${config?.color}15` }}
                        >
                          <SpotIcon type={spot.type} className="w-4 h-4" style={{ color: config?.color } as React.CSSProperties} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-gray-800 truncate">{spot.name}</p>
                          <p className="text-[12px] text-gray-400">
                            Day{spot.dayNum}
                            {spot.time && ` · ${spot.time}`}
                            {spot.endTime && `〜${spot.endTime}`}
                            {spot.transport && ` · ${TRANSPORT_CONFIG[spot.transport]?.label || ''}`}
                          </p>
                        </div>
                        {!readOnly && (
                          <button
                            onClick={() => handleAddSpot(msg.id, spot)}
                            disabled={added}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex-shrink-0 ${
                              added
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-blue-500 text-white active:scale-95'
                            }`}
                          >
                            {added ? (
                              <>
                                <Check className="w-3 h-3" />
                                追加済み
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                追加
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {spot.memo && (
                        <div className="px-3 pb-2.5 -mt-0.5">
                          <p className="text-[12px] text-gray-400">{spot.memo}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* ストリーミング中の表示 */}
        {loading && displayStreamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm text-[15px] leading-relaxed whitespace-pre-wrap text-gray-800">
              {displayStreamingText}
              <span className="inline-block w-1.5 h-4 bg-gray-400 rounded-sm ml-0.5 animate-pulse align-text-bottom" />
            </div>
          </div>
        )}

        {/* ローディングドット（ストリーミング開始前） */}
        {loading && !streamingText && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 入力エリア ── */}
      <div className="flex-shrink-0 border-t border-[var(--color-border)] bg-white px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        {/* 添付画像プレビュー */}
        {pendingImages.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
            {pendingImages.map((src, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={src} alt="" className="w-16 h-16 object-cover rounded-xl" />
                <button
                  onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800/70 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 active:text-gray-600 active:scale-95 transition-all flex-shrink-0 disabled:opacity-40"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 resize-none rounded-2xl bg-[var(--color-bg)] px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-blue-500 max-h-[120px]"
          />
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && pendingImages.length === 0) || loading}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-500 text-white disabled:opacity-40 active:scale-95 transition-transform flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

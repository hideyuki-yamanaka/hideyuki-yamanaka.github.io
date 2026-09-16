"use client";

/*
 * 「今すぐ取り込む」ボタン（2026-09-17 ヒデさん依頼）。
 *
 * ふだんは半日に1回（朝9時・夜9時）に自動で走る。
 * 「今すぐ見たい」時のために、ここから手で走らせられるようにした。
 *
 * ⚠️ 押してから一覧に反映されるまで【10分ちょっと】かかる。
 *    取り込み → GitHub にコミット → 本番が作り直される、という順で進むため。
 *    押した直後に画面が変わらなくても壊れていない。
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Run = {
  status: string;
  conclusion: string | null;
  url: string;
  startedAt: string;
} | null;

type Info = {
  scrapedAt: string | null;
  newlyDetected: number;
  actionsUrl: string;
  hasToken: boolean;
  run: Run;
};

/** 「3時間前」のような言い方にする。数字だけだと今日か昨日か分からないので */
function ago(iso: string | null): string {
  if (!iso) return "未取得";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "未取得";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "さっき";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

export function ScrapeButton() {
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/scrape", { cache: "no-store" });
      if (r.ok) setInfo((await r.json()) as Info);
    } catch {
      /* つながらない時は黙って前の表示のまま */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* 走っている間だけ 20 秒おきに様子を見に行く（ふだんは叩かない） */
  const running =
    info?.run?.status === "queued" || info?.run?.status === "in_progress" || busy;
  useEffect(() => {
    if (!running) {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
      return;
    }
    if (timer.current) return;
    timer.current = setInterval(load, 20000);
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [running, load]);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/scrape", { method: "POST" });
      const j = (await r.json()) as {
        ok: boolean;
        message?: string;
        actionsUrl?: string;
        reason?: string;
      };
      if (j.ok) {
        setMsg("取り込みを始めました（一覧に出るまで10分ほど）");
        setTimeout(load, 4000);
      } else {
        setMsg(j.message ?? "起動できませんでした");
        /* トークンが無い時は GitHub の画面を開いて、そこから押してもらう */
        if (j.reason === "no-token" && j.actionsUrl) {
          window.open(j.actionsUrl, "_blank", "noopener");
        }
      }
    } catch (e) {
      setMsg(`起動できませんでした（${String(e).slice(0, 80)}）`);
    } finally {
      setBusy(false);
    }
  };

  const failed = info?.run?.status === "completed" && info.run.conclusion === "failure";
  const label = running ? "取り込み中…" : "今すぐ取り込む";

  return (
    <div className="relative">
      <button
        onClick={start}
        disabled={running}
        className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border text-[12px] transition-colors ${
          running
            ? "border-border bg-bg-primary text-text-secondary cursor-default"
            : failed
              ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-border bg-bg-primary text-text-secondary hover:text-text-primary hover:border-accent/50"
        }`}
        title={
          running
            ? "GitHub 側で取り込みが動いています（10分ほどかかります）"
            : `最終取得 ${ago(info?.scrapedAt ?? null)}／ふだんは朝9時と夜9時に自動で取り込みます`
        }
        aria-label="スクレイピングを今すぐ実行"
      >
        <svg
          className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`}
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
        <span className="whitespace-nowrap">{label}</span>
        {!running && (
          <span className="text-text-secondary/70 tabular-nums">
            {ago(info?.scrapedAt ?? null)}
          </span>
        )}
      </button>

      {/* 押した直後のひとこと。数秒で消える類のものではないので、クリックで閉じる */}
      {msg && (
        <button
          onClick={() => setMsg(null)}
          className="absolute right-0 top-9 z-40 max-w-[320px] rounded-lg border border-border bg-white px-3 py-2 text-left text-[11px] leading-relaxed text-text-primary shadow-lg"
        >
          {msg}
          {info?.run?.url && (
            <span className="mt-1 block text-accent underline">
              GitHub で進み具合を見る
            </span>
          )}
        </button>
      )}
    </div>
  );
}

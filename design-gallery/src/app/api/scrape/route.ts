/*
 * スクレイピングを手で走らせるための入口（2026-09-17 ヒデさん依頼）。
 *
 *   「デザインギャラリー側にスクレーピングのロードボタンを置いてもらって、
 *     手動でもできるようにしてほしい」
 *
 * 中身は GitHub Actions の「Scrape Design Gallery」を外から起こしているだけ。
 * スクレイピング自体は Playwright でブラウザを立ち上げるので Vercel 上では動かせない
 * （実行に10分かかる・メモリも足りない）。GitHub の無料枠で回すのが正解。
 *
 * ⚠️ トークン（GH_DISPATCH_TOKEN）が無くても画面は壊さない。
 *    その時は「GitHub の画面を開いてね」と返して、ボタン側がそのリンクを開く。
 */
import { NextResponse } from "next/server";
import meta from "@/data/scrape-meta.json";

export const dynamic = "force-dynamic";

const OWNER = "hideyuki-yamanaka";
const REPO = "hideyuki-yamanaka.github.io";
const WORKFLOW = "scrape-design-gallery.yml";
const ACTIONS_URL = `https://github.com/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}`;

function token() {
  return process.env.GH_DISPATCH_TOKEN || process.env.GITHUB_TOKEN || "";
}

async function gh(path: string, init?: RequestInit) {
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token()}`,
      "x-github-api-version": "2022-11-28",
      ...(init?.headers || {}),
    },
  });
}

/** いまの状況を返す（最終取得日時と、走っている最中かどうか） */
export async function GET() {
  const base = {
    scrapedAt: (meta as { scrapedAt?: string }).scrapedAt ?? null,
    newlyDetected: (meta as { newlyDetected?: number }).newlyDetected ?? 0,
    actionsUrl: ACTIONS_URL,
    hasToken: Boolean(token()),
  };
  if (!token()) return NextResponse.json({ ...base, run: null });

  try {
    const r = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=1`);
    if (!r.ok) return NextResponse.json({ ...base, run: null });
    const j = (await r.json()) as {
      workflow_runs?: {
        status: string;
        conclusion: string | null;
        html_url: string;
        created_at: string;
      }[];
    };
    const run = j.workflow_runs?.[0];
    return NextResponse.json({
      ...base,
      run: run
        ? {
            /* queued / in_progress / completed */
            status: run.status,
            /* success / failure / cancelled（完了後のみ） */
            conclusion: run.conclusion,
            url: run.html_url,
            startedAt: run.created_at,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ ...base, run: null });
  }
}

/** 「今すぐ取り込む」を押した時。GitHub Actions を起こす */
export async function POST() {
  if (!token()) {
    return NextResponse.json(
      {
        ok: false,
        reason: "no-token",
        message:
          "サーバーに GitHub のトークンが入っていないので、ここからは起動できません。GitHub の画面から「Run workflow」を押してください。",
        actionsUrl: ACTIONS_URL,
      },
      { status: 200 },
    );
  }
  try {
    const r = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ref: "main" }),
    });
    /* 成功は 204 No Content。本文は無い */
    if (r.status === 204) {
      return NextResponse.json({ ok: true, actionsUrl: ACTIONS_URL });
    }
    const text = await r.text();
    return NextResponse.json(
      {
        ok: false,
        reason: "github-error",
        message: `GitHub が受け付けませんでした（${r.status}）。${text.slice(0, 160)}`,
        actionsUrl: ACTIONS_URL,
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        reason: "network",
        message: `GitHub につながりませんでした（${String(e).slice(0, 120)}）`,
        actionsUrl: ACTIONS_URL,
      },
      { status: 200 },
    );
  }
}

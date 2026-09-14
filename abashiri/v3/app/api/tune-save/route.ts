/*
 * 調整パネルの「💾 保存」をデプロイに引き継ぐための受け口（2026-08-23 ヒデさん依頼）。
 *
 * ローカル（next start / next dev）で保存を押すと、パネルがここへ全数値をPOSTし、
 * リポジトリ内の public/tune-defaults.json に書き込む。
 * このファイルは git に載り、サイトが起動時に既定値として読み込むので、
 * 次のデプロイで「保存した値」がそのまま全員の既定値になる。
 *
 * ⚠️ 本番（Vercel）では書き込み禁止（ファイルシステムは一時的で意味がない上、
 *    誰でも既定値を書き換えられてしまうため）。
 */
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  if (process.env.VERCEL) {
    return NextResponse.json(
      { ok: false, reason: "本番では保存の引き継ぎはできません（ローカル専用）" },
      { status: 403 }
    );
  }
  try {
    const params = await req.json();
    if (typeof params !== "object" || params === null) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const file = path.join(process.cwd(), "public", "tune-defaults.json");
    await writeFile(file, JSON.stringify(params, null, 2) + "\n", "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

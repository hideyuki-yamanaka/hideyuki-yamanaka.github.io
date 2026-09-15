/**
 * 各メディアの「1ページ目」を実際に見に行き、scraped-sites.json に
 * 取り込めているかを 1件ずつ照合する健全性チェック。
 *
 * 「本当にスクレイピングできてるの？」を目視ではなく実測で答えるためのもの。
 *
 * 使い方:
 *   npx tsx scripts/check-page1-coverage.ts
 *   npx tsx scripts/check-page1-coverage.ts --json   # 生データ
 *
 * 出力: メディアごとに「1ページ目にあるサイト → 取れている / 取れていない」の一覧。
 */
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";
import { normalizeUrl } from "../src/lib/eagle";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface Item {
  title: string;
  url: string;
  date?: string;
}

interface StoredSite {
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
  isDead?: boolean;
  firstSeen?: string;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

// ============================================================
// 各メディアの「1ページ目」取得
// ============================================================

/** SANKOU! トップページ（= 1ページ目） */
async function page1Sankou(): Promise<Item[]> {
  const html = await fetchHtml("https://sankoudesign.com/");
  const $ = cheerio.load(html);
  const items: Item[] = [];
  $("article li").each((_, el) => {
    const $el = $(el);
    const $figure = $el.find("figure");
    if ($figure.length === 0) return;
    const $img = $figure.find("img.wp-post-image").first();
    const title = $img.attr("alt")?.trim() || "";
    const siteUrl = $figure.find("a[target='_blank']").attr("href") || "";
    if (!title || !siteUrl) return;
    let date = "";
    const rawDate = $el.find('p[class^="list_time"]').first().text().trim();
    const dm = rawDate.match(/^(\d{4})[/-](\d{2})/);
    if (dm) date = `${dm[1]}-${dm[2]}`;
    items.push({ title, url: siteUrl, date });
  });
  return items;
}

/** Web Design Clip（日本版）1ページ目 */
async function page1Wdc(): Promise<Item[]> {
  const html = await fetchHtml("https://webdesignclip.com/");
  const $ = cheerio.load(html);
  const items: Item[] = [];
  $("li.post_li:not(.post_ad)").each((_, el) => {
    const $el = $(el);
    const title =
      $el.find("figcaption.post_title h2 a").attr("title") ||
      $el.find("figcaption.post_title h2 a").text().trim() ||
      "";
    const siteUrl =
      $el.find(".post_inner--launch a").attr("href") ||
      $el.find("figcaption.post_title h2 a").attr("href") ||
      "";
    if (!title || !siteUrl.startsWith("http")) return;
    const timeEl = $el.find(".post_inner--date time");
    const date = timeEl.attr("datetime")?.slice(0, 7) || "";
    items.push({ title, url: siteUrl, date });
  });
  return items;
}

/** S5-Style API の先頭（= サイトの1ページ目相当） */
async function page1S5(limit = 30): Promise<Item[]> {
  const res = await fetch(
    `https://api.s5-style.com/posts/?offset=0&limit=${limit}`,
    {
      headers: {
        "User-Agent": UA,
        Accept: "application/json,*/*;q=0.8",
        Referer: "https://www.s5-style.com/",
      },
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: s5-style api`);
  const json = (await res.json()) as {
    items: { title: string; site_url: string }[];
  };
  return json.items
    .filter((i) => i.site_url && i.title)
    .map((i) => ({ title: i.title, url: i.site_url }));
}

/** Awwwards の棚（AI / SOTD）1ページ目 */
async function page1Awwwards(shelf: "ai" | "sites_of_the_day"): Promise<Item[]> {
  const html = await fetchHtml(
    `https://www.awwwards.com/websites/${shelf}/?page=1`
  );
  const $ = cheerio.load(html);
  const items: Item[] = [];
  $("li.col-3.js-collectable").each((_, el) => {
    const raw = $(el).attr("data-collectable-model-value");
    if (!raw) return;
    let payload: {
      collectableTitle?: string;
      title?: string;
      slug?: string;
      createdAt?: number;
    };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const title = payload.collectableTitle || payload.title || "";
    const slug = payload.slug || "";
    if (!title || !slug) return;
    const outbound =
      $(el).find("a.figure-rollover__bt[target='_blank']").first().attr("href") ||
      `https://www.awwwards.com/sites/${slug}`;
    let date = "";
    if (payload.createdAt) {
      const d = new Date(payload.createdAt * 1000);
      if (!Number.isNaN(d.getTime())) date = d.toISOString().slice(0, 7);
    }
    items.push({ title, url: outbound, date });
  });
  return items;
}

/** MUUUUU.ORG トップページの初期表示分（スクロールなし＝1ページ目） */
async function page1Muuuuu(): Promise<Item[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 900 },
      userAgent: UA,
    });
    await page.goto("https://muuuuu.org/", {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForSelector(".c-post-list__item", { timeout: 20000 });
    return await page.evaluate(() => {
      const out: { title: string; url: string }[] = [];
      document.querySelectorAll(".c-post-list__item").forEach((el) => {
        const a = el.querySelector<HTMLAnchorElement>("a.c-post-list__link");
        const img = el.querySelector<HTMLImageElement>("img.c-post-list__image");
        if (!a || !img) return;
        const title = (img.alt || "").trim();
        if (!a.href || !title) return;
        out.push({ title, url: a.href });
      });
      return out;
    });
  } finally {
    await browser.close();
  }
}

/** 81-web.com トップページの初期表示分（スクロールなし＝1ページ目） */
async function page181web(): Promise<Item[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 900 },
      userAgent: UA,
    });
    await page.goto("https://81-web.com/", {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForSelector(".p-gallery-list-card", { timeout: 20000 });
    return await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll(".p-gallery-list-card")
      );
      return cards
        .map((card) => {
          const img = card.querySelector(
            "img.p-gallery-list-card__body__figure__img"
          ) as HTMLImageElement | null;
          const title = img?.getAttribute("alt")?.trim() || "";
          const visit = Array.from(
            card.querySelectorAll("a[target='_blank']")
          ).find(
            (a) => !(a as HTMLAnchorElement).href.includes("81-web.com")
          ) as HTMLAnchorElement | undefined;
          const dateText =
            card
              .querySelector(".p-gallery-list-card__body__info__date")
              ?.textContent?.trim() || "";
          const m = dateText.match(/(\d{4})\.(\d{1,2})/);
          return {
            title,
            url: visit?.href || "",
            date: m ? `${m[1]}-${m[2].padStart(2, "0")}` : "",
          };
        })
        .filter((x) => x.title && x.url);
    });
  } finally {
    await browser.close();
  }
}

/** Eagle が起動していれば保存済みURL集合を返す */
async function fetchEagleUrls(): Promise<Set<string> | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      "http://localhost:41595/api/item/list?limit=100000",
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { url?: string; website?: string }[];
    };
    const set = new Set<string>();
    for (const it of json.data || []) {
      const u = it.url || it.website;
      if (u) set.add(normalizeUrl(u));
    }
    return set;
  } catch {
    return null;
  }
}

// ============================================================
// 照合
// ============================================================
const CUTOFF_DATE = "2024-01";

type Verdict =
  | "取得済み"
  | "取得済み(リンク切れ扱い)"
  | "取得済み(別メディア枠)"
  | "未取得"
  | "対象外(古い)";

interface Row {
  media: string;
  title: string;
  url: string;
  siteDate: string;
  verdict: Verdict;
  storedSource?: string;
  storedDate?: string;
  inEagle?: boolean;
  normalized: string;
}

async function main() {
  const asJson = process.argv.includes("--json");
  const dataPath = path.join(
    __dirname,
    "..",
    "src",
    "data",
    "scraped-sites.json"
  );
  const stored = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as StoredSite[];

  const byUrl = new Map<string, StoredSite>();
  for (const s of stored) {
    const key = normalizeUrl(s.url);
    if (!byUrl.has(key)) byUrl.set(key, s);
  }

  const eagle = await fetchEagleUrls();
  if (!asJson) {
    console.log(
      eagle
        ? `🦅 Eagle 接続OK: 保存済み ${eagle.size} 件（重複判定に使用）`
        : `🦅 Eagle 未起動: 重複判定はスキップ`
    );
  }

  const sources: {
    media: string;
    expectedSource: string;
    get: () => Promise<Item[]>;
  }[] = [
    { media: "SANKOU!", expectedSource: "sankou", get: page1Sankou },
    { media: "MUUUUU.ORG", expectedSource: "muuuuu", get: page1Muuuuu },
    {
      media: "Web Design Clip",
      expectedSource: "webdesignclip",
      get: page1Wdc,
    },
    { media: "81-web.com", expectedSource: "81web", get: page181web },
    { media: "S5-Style", expectedSource: "s5style", get: () => page1S5(30) },
    // Awwwards は 2026-09-15 にヒデさん指示で対象外（日本のメディアに限る）。
    // そもそも Cloudflare がスクリプトからのアクセスを 403 で弾くため、
    // ここから確認すること自体ができない（page1Awwwards は残してあるが未使用）。
  ];

  const rows: Row[] = [];

  for (const src of sources) {
    if (!asJson) process.stdout.write(`\n📡 ${src.media} の1ページ目を取得中… `);
    let items: Item[] = [];
    try {
      items = await src.get();
      if (!asJson) console.log(`${items.length} 件`);
    } catch (e) {
      if (!asJson) console.log(`❌ 取得失敗: ${(e as Error).message}`);
      rows.push({
        media: src.media,
        title: "(ページ取得自体に失敗)",
        url: "",
        siteDate: "",
        verdict: "未取得",
        normalized: "",
      });
      continue;
    }

    for (const it of items) {
      const key = normalizeUrl(it.url);
      const hit = byUrl.get(key);
      let verdict: Verdict;
      if (hit) {
        if (hit.isDead) verdict = "取得済み(リンク切れ扱い)";
        else if (hit.source !== src.expectedSource)
          verdict = "取得済み(別メディア枠)";
        else verdict = "取得済み";
      } else if (it.date && it.date < CUTOFF_DATE) {
        verdict = "対象外(古い)";
      } else {
        verdict = "未取得";
      }
      rows.push({
        media: src.media,
        title: it.title,
        url: it.url,
        siteDate: it.date || "",
        verdict,
        storedSource: hit?.source,
        storedDate: hit?.date,
        inEagle: eagle ? eagle.has(key) : undefined,
        normalized: key,
      });
    }
  }

  if (asJson) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  // ---- サマリー ----
  console.log("\n" + "=".repeat(70));
  console.log("📊 メディア別サマリー");
  console.log("=".repeat(70));
  const medias = Array.from(new Set(rows.map((r) => r.media)));
  for (const m of medias) {
    const rs = rows.filter((r) => r.media === m);
    const ok = rs.filter((r) => r.verdict.startsWith("取得済み")).length;
    const ng = rs.filter((r) => r.verdict === "未取得").length;
    const old = rs.filter((r) => r.verdict === "対象外(古い)").length;
    const rate = rs.length > 0 ? Math.round((ok / rs.length) * 100) : 0;
    console.log(
      `${m.padEnd(20)} 1ページ目 ${String(rs.length).padStart(3)}件 → 取得済み ${String(ok).padStart(3)}件 (${String(rate).padStart(3)}%) / 未取得 ${ng}件 / 対象外 ${old}件`
    );
  }

  // ---- 未取得の明細 ----
  const missing = rows.filter((r) => r.verdict === "未取得");
  console.log("\n" + "=".repeat(70));
  console.log(`❌ 未取得（取りこぼし）: ${missing.length} 件`);
  console.log("=".repeat(70));
  for (const r of missing) {
    console.log(`  [${r.media}] ${r.title}`);
    console.log(`      ${r.url}  (サイト上の日付: ${r.siteDate || "不明"})`);
  }

  // ---- Eagle 重複で消えている分 ----
  if (eagle) {
    const dup = rows.filter((r) => r.inEagle);
    console.log("\n" + "=".repeat(70));
    console.log(`🦅 Eagle に保存済み（ギャラリーでは非表示）: ${dup.length} 件`);
    console.log("=".repeat(70));
    for (const r of dup) console.log(`  [${r.media}] ${r.title}`);
  }

  // ---- 確認済み判定用のキー一覧を書き出す ----
  const outPath = path.join(__dirname, "..", "page1-coverage.json");
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf-8");
  console.log(`\n✅ 明細を書き出しました: ${outPath}`);
  console.log(
    `   （「確認済み」かどうかはブラウザの localStorage にあるため、この JSON の normalized と突き合わせて判定する）`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/* anyflow と 網走 の調整パネルを、同じ条件で撮って計測する。
   ・パネル要素だけを 2倍解像度で切り出す（画面全体だと小さすぎて読めない）
   ・あわせて主要パーツの computed style を吸い出し、数値で突き合わせられるようにする */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = process.env.OUT || "/tmp/panel-cmp";
fs.mkdirSync(OUT, { recursive: true });

/* 計測する部品。左が「役割」、右が それぞれのサイトでの CSS セレクタ */
const PARTS = {
  anyflow: {
    root: ".panel",
    head: ".panel-head",
    headTitle: ".panel-head > span:first-child",
    tabsBar: ".pan-tabs",
    tab: ".pan-tab",
    tabOn: ".pan-tab.on",
    body: ".panel-body",
    grp: ".grp",
    grpTitle: ".grp-title",
    grpSub: ".grp.sub2",
    row: ".row",
    rowLabel: ".row > label",
    val: ".val",
    range: 'input[type="range"]',
    seg: ".seg",
    segOn: ".seg .on",
    foot: null,
    presetLab: ".pset-lab",
    presetChip: ".pset-chip",
  },
  abashiri: {
    root: ".tp",
    head: ".tp-head",
    headTitle: ".tp-title",
    tabsBar: ".tp-tabs",
    tab: ".tp-tab",
    tabOn: ".tp-tab.on",
    body: ".tp-body",
    grp: ".tp-grp",
    grpTitle: ".tp-grp-title",
    grpSub: ".tp-grp.deep",
    row: ".tp-row",
    rowLabel: ".tp-row > label",
    val: ".tp-val",
    range: 'input[type="range"]',
    seg: ".tp-seg",
    segOn: ".tp-seg .on",
    foot: ".tp-foot",
    presetLab: ".tp-pset-lab",
    presetChip: ".tp-pset-chip",
  },
};

const PROPS = [
  "width", "height", "padding", "margin", "gap", "borderRadius", "border",
  "background-color", "backdropFilter", "boxShadow", "color",
  "fontSize", "fontWeight", "lineHeight", "letterSpacing", "opacity",
  "display", "alignItems", "justifyContent", "flex", "overflowY", "resize",
];

async function measure(page, parts) {
  return page.evaluate(
    ({ parts, PROPS }) => {
      const out = {};
      for (const [name, sel] of Object.entries(parts)) {
        if (!sel) { out[name] = null; continue; }
        const el = document.querySelector(sel);
        if (!el) { out[name] = "(無し)"; continue; }
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const o = { _box: `${Math.round(r.width)}x${Math.round(r.height)}` };
        PROPS.forEach((p) => {
          const v = cs[p] !== undefined ? cs[p] : cs.getPropertyValue(p);
          if (v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px") o[p] = v;
        });
        out[name] = o;
      }
      return out;
    },
    { parts, PROPS }
  );
}

async function shootAnyflow(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1512, height: 982 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:8777", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const t = document.querySelector(".tools");
    if (t) t.classList.remove("tools-hidden");
    const p = document.querySelector(".panel");
    if (p) p.classList.remove("closed");
  });
  await page.waitForTimeout(600);
  const shots = {};
  const el = await page.$(".panel");
  await el.screenshot({ path: path.join(OUT, "anyflow-open.png") });
  shots.open = "anyflow-open.png";

  /* たたんだ状態 */
  await page.evaluate(() => document.querySelector(".panel").classList.add("closed"));
  await page.waitForTimeout(300);
  await (await page.$(".panel")).screenshot({ path: path.join(OUT, "anyflow-closed.png") });
  await page.evaluate(() => document.querySelector(".panel").classList.remove("closed"));
  await page.waitForTimeout(300);

  const m = await measure(page, PARTS.anyflow);
  const tabs = await page.$$eval(".pan-tab", (ts) => ts.map((t) => t.textContent.trim()));
  await ctx.close();
  return { shots, m, tabs };
}

async function shootAbashiri(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1512, height: 982 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3095", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(2800);
  await page.evaluate(() => {
    const p = document.querySelector(".tp");
    if (p) { p.style.display = ""; p.classList.remove("closed"); }
  });
  await page.waitForTimeout(400);
  /* トップページのタブを開いて、最初のセクションを展開（中身が見える状態にする） */
  await page.evaluate(() => {
    const p = document.querySelector(".tp");
    const t = [...p.querySelectorAll(".tp-tab")].find((x) => x.textContent.includes("トップ"));
    if (t) t.click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const p = document.querySelector(".tp");
    const h = [...p.querySelectorAll(".tp-sec-head")];
    if (h[2]) h[2].click();
  });
  await page.waitForTimeout(500);
  await (await page.$(".tp")).screenshot({ path: path.join(OUT, "abashiri-open.png") });

  await page.evaluate(() => document.querySelector(".tp").classList.add("closed"));
  await page.waitForTimeout(300);
  await (await page.$(".tp")).screenshot({ path: path.join(OUT, "abashiri-closed.png") });
  await page.evaluate(() => document.querySelector(".tp").classList.remove("closed"));
  await page.waitForTimeout(300);

  const m = await measure(page, PARTS.abashiri);
  const tabs = await page.$$eval(".tp-tab", (ts) => ts.map((t) => t.textContent.trim()));
  await ctx.close();
  return { m, tabs };
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader"] });
  const a = await shootAnyflow(browser);
  const b = await shootAbashiri(browser);
  fs.writeFileSync(
    path.join(OUT, "measure.json"),
    JSON.stringify({ anyflow: a.m, abashiri: b.m, tabs: { anyflow: a.tabs, abashiri: b.tabs } }, null, 1)
  );
  console.log("保存先:", OUT);
  console.log(fs.readdirSync(OUT).join("\n"));
  await browser.close();
})();

/* 網走パネルの「案を選ぶピル」「2択のセグメント」まわりを撮って、
   anyflow の chip / seg と見比べられるようにする */
const { chromium } = require("playwright");
const path = require("path");
const OUT = process.env.OUT || "/tmp/panel-cmp5";
require("fs").mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  await page.goto("http://localhost:3095", { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(2800);
  await page.evaluate(() => {
    const p = document.querySelector(".tp");
    p.style.display = ""; p.classList.remove("closed");
    const t = [...p.querySelectorAll(".tp-tab")].find((x) => x.textContent.includes("サイト共通"));
    if (t) t.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const p = document.querySelector(".tp");
    const h = [...p.querySelectorAll(".tp-sec-head")];
    if (h[0]) h[0].click();          /* フッター（案のピル） */
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => { document.querySelector(".tp").style.height = "760px"; });
  await page.waitForTimeout(300);
  await (await page.$(".tp")).screenshot({ path: path.join(OUT, "abashiri-pills.png") });

  /* ピル1粒の実測 */
  const m = await page.evaluate(() => {
    const pick = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return "(無し)";
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      return {
        box: `${Math.round(r.width)}x${Math.round(r.height)}`,
        radius: cs.borderRadius, border: cs.border, bg: cs.backgroundColor,
        color: cs.color, font: cs.fontSize + "/" + cs.fontWeight, padding: cs.padding,
      };
    };
    return { pill: pick(".tp-pill"), pillOn: pick(".tp-pill.on"), pillsBox: pick(".tp-pills") };
  });
  await ctx.close();

  /* anyflow 側 */
  const ctx2 = await browser.newContext({ viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage();
  await p2.goto("http://localhost:8777", { waitUntil: "networkidle" }).catch(() => {});
  await p2.waitForTimeout(2500);
  await p2.evaluate(() => {
    const t = document.querySelector(".tools"); if (t) t.classList.remove("tools-hidden");
    const p = document.querySelector(".panel"); if (p) { p.classList.remove("closed"); p.style.height = "760px"; }
  });
  await p2.waitForTimeout(600);
  await (await p2.$(".panel")).screenshot({ path: path.join(OUT, "anyflow-pills.png") });
  const m2 = await p2.evaluate(() => {
    const pick = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return "(無し)";
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      return {
        box: `${Math.round(r.width)}x${Math.round(r.height)}`,
        radius: cs.borderRadius, border: cs.border, bg: cs.backgroundColor,
        color: cs.color, font: cs.fontSize + "/" + cs.fontWeight, padding: cs.padding,
      };
    };
    return { chip: pick(".chip-b"), chipOn: pick(".chip-b.on"), varPill: pick(".var-pill"), seg: pick(".seg button") };
  });
  await ctx2.close();
  console.log(JSON.stringify({ abashiri: m, anyflow: m2 }, null, 1));
  await browser.close();
})();

/* 調整パネルの原本（このフォルダ）から、各サイトの写しを作る道具（2026-10-20 ヒデさん「一元管理したいです。わかりやすく」）
 *
 *   node settings/tune-panel/sync-copies.mjs                     … 全部のサイトへ写す
 *   node settings/tune-panel/sync-copies.mjs --site abashiri/v3  … そのサイトだけ写す（網走の npm run dev・build の前に、網走の道具から呼ばれる）
 *   node settings/tune-panel/sync-copies.mjs --check             … 写しが原本と同じかを調べるだけ（違えば終了コード 1）
 *   node settings/tune-panel/sync-copies.mjs --hook              … Claude Code の仕掛け（PostToolUse の Write|Edit|MultiEdit）から。
 *                                                                   書いたファイルが原本の時だけ、その場で写し直す（失敗しても作業は止めない）
 *
 * ・写しの先頭に「自動で写した物・直接直さない」の1行を付ける。直す時は原本を直す（写しを直しても、次に写した時に消える）
 * ・写しを使うサイトが増えたら、下の COPIES に1行足すだけ（ここが「原本 → 写す先」の一覧のただ1つの置き場）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = path.dirname(fileURLToPath(import.meta.url));   /* settings/tune-panel（原本の置き場） */
const REPO = path.resolve(ORIGIN, '../..');                      /* 作業場のいちばん上 */

/* ===== 原本 → 写す先 の一覧（ここだけを書き足す） =====
   site … 作業場のいちばん上から見たサイトのフォルダ ／ files … [原本（このフォルダから）, 写す先（サイトのフォルダから）] */
export const COPIES = [
  { name: '網走V3', site: 'abashiri/v3', files: [
    ['tune-panel.js', 'public/tune-panel.js'],
    ['phone-mode/phone-mode.client.js', 'public/phone-mode.client.js']
  ] }
];

const mark = (from, site) => `/* ⚠️ 自動で写した物。直接直さない（直しても次に写した時に消える）。原本: settings/tune-panel/${from} ／ 写す道具と一覧: settings/tune-panel/sync-copies.mjs（${site} の npm run dev・build の前に自動で走る） */\n`;

/* 写す（check のときは調べるだけ）。返り値は1件ずつの結果 */
export function sync({ check = false, site = null, only = null } = {}) {
  const out = [];
  for (const c of COPIES) {
    if (site && path.normalize(c.site) !== path.normalize(site)) continue;
    const dir = path.join(REPO, c.site);
    if (!fs.existsSync(dir)) { out.push({ c, f: null, st: 'nosite' }); continue; }
    for (const [from, to] of c.files) {
      if (only && !only.includes(from)) continue;
      const src = path.join(ORIGIN, from), dst = path.join(dir, to);
      if (!fs.existsSync(src)) { out.push({ c, f: to, st: 'nosrc' }); continue; }
      const want = mark(from, c.site) + fs.readFileSync(src, 'utf8');
      const now = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
      if (now === want) { out.push({ c, f: to, st: 'same' }); continue; }
      if (check) { out.push({ c, f: to, st: 'differ', from }); continue; }
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, want);
      out.push({ c, f: to, st: 'wrote', from });
    }
  }
  return out;
}

/* Claude Code の仕掛けから：書いたファイルが原本なら、その原本を使う写しだけ作り直す */
function hook() {
  let data = {};
  try { data = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) { return; }
  const file = data.tool_input && data.tool_input.file_path;
  if (!file) return;
  const rel = path.relative(ORIGIN, path.resolve(file)).split(path.sep).join('/');
  const used = new Set(COPIES.flatMap(c => c.files.map(f => f[0])));
  if (!used.has(rel)) return;
  const wrote = sync({ only: [rel] }).filter(r => r.st === 'wrote');
  if (!wrote.length) return;
  const msg = `【調整パネルの写し】原本 settings/tune-panel/${rel} を書き換えたので、写しを作り直しました：` +
    wrote.map(r => `${r.c.name}（${r.c.site}/${r.f}）`).join('・') + '。写しは手で直さないでください';
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg } }));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--hook')) {
    try { hook(); } catch (e) { /* 写し直しの失敗で作業を止めない */ }
    process.exit(0);
  }
  const check = args.includes('--check');
  const si = args.indexOf('--site'), site = si >= 0 ? args[si + 1] : null;
  const res = sync({ check, site });
  for (const r of res) {
    const where = `${r.c.name}（${r.c.site}/${r.f || ''}）`;
    if (r.st === 'wrote') console.log(`[調整パネルの写し] ${where} を原本から写しました`);
    if (r.st === 'differ') console.log(`[調整パネルの写し] ❌ ${where} が原本（settings/tune-panel/${r.from}）と違います → node settings/tune-panel/sync-copies.mjs で写し直してください`);
    if (r.st === 'nosite') console.log(`[調整パネルの写し] ${r.c.name} のフォルダ（${r.c.site}）が見つからないので飛ばしました`);
    if (r.st === 'nosrc') console.log(`[調整パネルの写し] ❌ 原本が見つかりません（${where}）`);
  }
  const differ = res.filter(r => r.st === 'differ' || r.st === 'nosrc').length, wrote = res.filter(r => r.st === 'wrote').length;
  if (!differ && !wrote) console.log(`[調整パネルの写し] ✅ 写しは原本と同じです（${res.filter(r => r.st === 'same').length} 件）`);
  process.exit(check && differ ? 1 : 0);
}

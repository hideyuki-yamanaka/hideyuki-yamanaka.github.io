/* 調整パネルの原本（settings/tune-panel）から、網走V3 の public/ へ写す道具（2026-10-20 ヒデさん「一元管理したいです。わかりやすく」）
 *
 *   node scripts/sync-tune-panel.mjs          … 写す（npm run dev／npm run build の前に自動で走る：package.json の predev・prebuild）
 *   node scripts/sync-tune-panel.mjs --check  … 写しが原本と同じかを調べるだけ（違えば終了コード 1）
 *
 * 写す物（原本 → 写し）
 *   settings/tune-panel/tune-panel.js                     → public/tune-panel.js
 *   settings/tune-panel/phone-mode/phone-mode.client.js   → public/phone-mode.client.js
 *
 * ・写しの先頭に「自動で写した物・直接直さない」の1行を付ける。直す時は原本を直す（写しを直しても、次に写した時に消える）
 * ・原本が見つからない時（Vercel では網走のフォルダだけが送られる）は、失敗させずに何もしない（いまの写しをそのまま使う）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');                                  /* abashiri/v3 */
const ORIGIN = path.resolve(SITE, '../../settings/tune-panel');        /* 原本の置き場 */
const FILES = [
  { from: 'tune-panel.js', to: 'public/tune-panel.js' },
  { from: 'phone-mode/phone-mode.client.js', to: 'public/phone-mode.client.js' }
];
const mark = from => `/* ⚠️ 自動で写した物。直接直さない（直しても次に写した時に消える）。原本: settings/tune-panel/${from} ／ 写す道具: abashiri/v3/scripts/sync-tune-panel.mjs（npm run dev・build の前に自動で走る） */\n`;
const check = process.argv.includes('--check');

let changed = 0, differ = 0, missing = 0;
for (const f of FILES) {
  const src = path.join(ORIGIN, f.from), dst = path.join(SITE, f.to);
  if (!fs.existsSync(src)) { missing++; continue; }
  const want = mark(f.from) + fs.readFileSync(src, 'utf8');
  const now = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
  if (now === want) continue;
  if (check) { differ++; console.log(`[調整パネルの写し] ❌ ${f.to} が原本（settings/tune-panel/${f.from}）と違います → node scripts/sync-tune-panel.mjs で写し直してください`); continue; }
  fs.writeFileSync(dst, want);
  changed++;
  console.log(`[調整パネルの写し] ${f.to} を原本から写しました`);
}
if (missing) console.log(`[調整パネルの写し] 原本が見つからないので、いまの写しをそのまま使います（${missing} 件・Vercel では網走のフォルダだけが送られるため）`);
else if (check && !differ) console.log('[調整パネルの写し] ✅ 写しは原本と同じです');
else if (!check && !changed) console.log('[調整パネルの写し] 写しは原本と同じです（写し直しなし）');
process.exit(check && differ ? 1 : 0);

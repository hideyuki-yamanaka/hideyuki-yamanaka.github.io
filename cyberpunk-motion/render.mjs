// movie.html を1コマずつ描かせて MP4 にまとめる
//   全編:   node render.mjs
//   静止画: node render.mjs --stills 45,120,300 [出力フォルダ]
import { chromium } from '/Users/hideyuki/Developer/Claude Code/design-gallery/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FPS = 30, DUR = 30, TOTAL = FPS * DUR;
const args = process.argv.slice(2);
const stillsIdx = args.indexOf('--stills');

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('pageerror:', e.message));
await page.goto(pathToFileURL(join(here, 'movie.html')).href + '?render', { waitUntil: 'networkidle' });
await page.evaluate(() => window.ready);

const grab = i => page.evaluate(i => { renderAt(i); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, i);

if (stillsIdx >= 0) {
  const frames = args[stillsIdx + 1].split(',').map(Number);
  const out = args[stillsIdx + 2] || join(here, 'out', 'stills');
  mkdirSync(out, { recursive: true });
  for (const f of frames) writeFileSync(join(out, `f${String(f).padStart(4, '0')}.png`), Buffer.from(await grab(f), 'base64'));
  console.log('stills ->', out);
} else {
  mkdirSync(join(here, 'out'), { recursive: true });
  const file = join(here, 'out', 'neon-city-concept-film.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < TOTAL; i++) {
    const b = Buffer.from(await grab(i), 'base64');
    if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`frame ${i}/${TOTAL}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('done ->', file, `${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();

#!/usr/bin/env node
/*
 * design-check.mjs — デザインの数値の検査（ルール集 RULES.md 4-7・4-13）
 *
 * 決まり（4-7：文字サイズ・サイズ・余白・角丸の4と8の倍数）から外れた値と、参考の「寄せる候補」（似た色・
 * 近い値のかたまり＝行間・線幅・影・ぼかし・不透明度・1回しか使っていない近い値）を一覧にする。依存ゼロ（Node だけ）。
 * 今あるサイトの値は報告するだけで、何も書き換えない。
 *
 *   node settings/design-check/design-check.mjs <ファイルかフォルダ ...>   … 全体を検査（完了の前・監査）
 *   node settings/design-check/design-check.mjs --hook                  … 書いた直後の見張り（PostToolUse から。書いた所だけ）
 *   node settings/design-check/design-check.mjs <フォルダ> --fix [--dry-run] [--prefer=fontSize:11=12]
 *                                                                       … 見た目がほぼ変わらない物だけ自動で寄せる（先に戻し用の目印を作る）
 *                                                                         ※決まりどおりの値どうし（1回しか使っていない近い値）と、1px 以下のサイズ・余白は
 *                                                                           自動では寄せない（いつも「提案」・2026-09-27）
 *   オプション: --json（機械向け）／--with-js（フォルダ検査で .js .ts も見る）／--all（mock・test も見る）
 *
 * わざと決まりから外す行には、同じ行に「4-7例外」と書く（理由も添える）。その行は検査しない。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

/* ---------------- 決まり（RULES.md 4-7 の表と同じ。変える時は両方直す） ---------------- */
const grid = v => (v <= 10 && Math.abs(v % 2) < 1e-9) || Math.abs(v % 4) < 1e-9;   /* 4の倍数・10px以下は2刻み */
const RULE = {
  /* 倍数の決まり（外れたら直す） */
  fontSize:   { name: '文字サイズ', ok: v => grid(v) || v === 14 || v === 18, text: '4の倍数（10px以下は2刻み）か 14・18' },
  size:       { name: 'サイズ',     ok: grid, text: '4の倍数（10px以下は2刻み）' },
  spacing:    { name: '余白',       ok: grid, text: '4の倍数（10px以下は2刻み）' },
  radius:     { name: '角丸',       ok: v => grid(v) || v >= 999, text: '4の倍数（10px以下は2刻み）か完全な丸' },
  /* 自由（乱立しないように、似た値のかたまりだけ「寄せる候補」として出す・2026-09-27 ヒデさん） */
  lineHeight: { name: '行間',       free: true, near: 0.05, unit: '' },
  stroke:     { name: '線幅',       free: true, near: 0.5,  unit: 'px' },
  shadow:     { name: '影',         free: true, near: 2,    rel: 0.1, unit: 'px' },   /* 2px以内 かつ 1割以内 */
  blur:       { name: 'ぼかし',     free: true, near: 2,    rel: 0.1, unit: 'px' },
  opacity:    { name: '不透明度',   free: true, near: 0.05, unit: '' },
  fontWeight: { name: 'ウェイト',   free: true, near: 0,    unit: '' },
};
const SIMILAR_COLOR_DE = 3;   /* 色の差（CIEDE2000）がこれ未満の別の色を「似た色」とする（仮置き） */
/* 自動で寄せてよい（見た目がほぼ変わらない）差。これを超えたら「提案」（RULES.md 4-13 の表と同じ。変える時は両方直す） */
const AUTO = { color: 2, fontSize: 1, spacing: 2, size: 2, radius: 2, lineHeight: 0.05, opacity: 0.05, stroke: 0.5 /* 未満 */, shadow: 2, blur: 2, shadowRel: 0.1 };
function howTo(cat, from, to) {
  const d = Math.abs(to - from);
  if (cat === 'fontWeight') return '提案';
  /* 1px 以下のサイズ・余白は、細い線に合わせた値のことが多い（区切り線の height:1px・線を重ねる margin:-1px など）。自動では動かさない（この行は説明の文・4-7例外） */
  if ((cat === 'size' || cat === 'spacing') && from <= 1) return '提案';
  if (cat === 'stroke') return d < AUTO.stroke ? '自動' : '提案';
  if (cat === 'shadow' || cat === 'blur') return d <= AUTO[cat] + 1e-9 && d / Math.max(from, to) <= AUTO.shadowRel + 1e-9 ? '自動' : '提案';
  return d <= (AUTO[cat] ?? 0) + 1e-9 ? '自動' : '提案';
}
/* 画面の大きさ（スマホ枠 390×844 など）は 4-7 の例外「画面の最大幅・画面の大きさ」 */
const SCREEN = new Set([320, 360, 375, 390, 393, 412, 414, 428, 430, 667, 736, 740, 780, 812, 844, 852, 896, 915, 926, 932,
  768, 800, 820, 834, 1024, 1112, 1180, 1194, 1280, 1366, 1440, 1536, 1600, 1680, 1920, 2560]);

/* ---------------- どのプロパティがどの項目か ---------------- */
const PROP = {};
const put = (cat, list) => list.forEach(p => { PROP[p] = cat; });
put('fontSize', ['font-size']);
put('lineHeight', ['line-height']);
put('letterSpacing', ['letter-spacing']);
put('fontWeight', ['font-weight']);
put('size', ['width', 'height', 'min-width', 'min-height', 'inline-size', 'block-size', 'flex-basis']);   /* max-width は「画面の最大幅」の例外 */
put('spacing', ['padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-inline', 'padding-block',
  'padding-inline-start', 'padding-inline-end', 'padding-block-start', 'padding-block-end',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-inline', 'margin-block',
  'margin-inline-start', 'margin-inline-end', 'margin-block-start', 'margin-block-end',
  'gap', 'row-gap', 'column-gap', 'grid-gap', 'grid-row-gap', 'grid-column-gap', 'scroll-padding', 'scroll-margin']);
put('radius', ['border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'border-start-start-radius', 'border-start-end-radius', 'border-end-start-radius', 'border-end-end-radius']);
put('stroke', ['border', 'border-width', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-inline', 'border-block',
  'outline', 'outline-width', 'stroke-width', '-webkit-text-stroke-width', '-webkit-text-stroke', 'column-rule-width']);
put('shadow', ['box-shadow', 'text-shadow']);
put('filter', ['filter', 'backdrop-filter', '-webkit-backdrop-filter']);
put('opacity', ['opacity']);
const CAMEL = {};
Object.keys(PROP).forEach(p => { CAMEL[p.replace(/^-webkit-/, 'webkit-').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = p; });

/* 名前から項目を決める（CSS の変数・デザイントークン） */
function varCat(name) {
  const n = name.toLowerCase();
  if (/(^--text-|font-size|fontsize|^--fs-)/.test(n)) return 'fontSize';
  if (/(leading|line-height|^--lh-)/.test(n)) return 'lineHeight';
  if (/(radius|rounded|corner)/.test(n)) return 'radius';
  if (/(shadow)/.test(n)) return 'shadow';
  if (/(blur)/.test(n)) return 'blur';
  if (/(stroke|border-w|line-w|hairline)/.test(n)) return 'stroke';
  if (/(space|spacing|gap|pad|margin|gutter)/.test(n)) return 'spacing';
  if (/(size|width|height|icon)/.test(n)) return 'size';
  return null;
}

/* Tailwind の [任意の値] の頭 → 項目 */
const TW = {
  spacing: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe', 'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me', 'gap', 'gap-x', 'gap-y', 'space-x', 'space-y'],
  size: ['w', 'h', 'min-w', 'min-h', 'size', 'basis'],
  radius: ['rounded', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l', 'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl', 'rounded-s', 'rounded-e'],
};
const TW_HEAD = {};
Object.keys(TW).forEach(c => TW[c].forEach(h => { TW_HEAD[h] = c; }));
Object.assign(TW_HEAD, { text: 'text', leading: 'lineHeight', tracking: 'letterSpacing', border: 'border', 'border-t': 'border', 'border-r': 'border',
  'border-b': 'border', 'border-l': 'border', 'border-x': 'border', 'border-y': 'border', shadow: 'shadow', blur: 'blur', 'backdrop-blur': 'blur',
  opacity: 'opacity', font: 'font', bg: 'color', fill: 'color', stroke: 'strokeTw', outline: 'border', ring: 'border' });

/* ---------------- 小道具 ---------------- */
const LEN = /(-?\d*\.?\d+)(px|rem)\b/g;
function lengths(s) {
  const out = [];
  let m;
  LEN.lastIndex = 0;
  while ((m = LEN.exec(s))) out.push(Math.abs(parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1)));
  return out;
}
const round = v => Math.round(v * 1000) / 1000;
function nearest(v, ok) {
  let lo = null, hi = null;
  for (let d = 0.5; d <= 64 && (lo === null || hi === null); d += 0.5) {
    if (lo === null && v - d >= 0 && ok(round(v - d))) lo = round(v - d);
    if (hi === null && ok(round(v + d))) hi = round(v + d);
  }
  return [lo, hi].filter(x => x !== null && x !== v).map(x => x + 'px').join(' か ');
}

/* 寄せる先を1つ決める：一番近い決まりの値。同じ差なら、そのプロダクトでよく使っている方 */
function target(v, ok, used) {
  let lo = null, hi = null;
  for (let d = 0.5; d <= 64 && (lo === null || hi === null); d += 0.5) {
    if (lo === null && v - d >= 0 && ok(round(v - d))) lo = round(v - d);
    if (hi === null && ok(round(v + d))) hi = round(v + d);
  }
  if (lo === null) return hi;
  if (hi === null) return lo;
  const dl = v - lo, dh = hi - v;
  if (dl !== dh) return dl < dh ? lo : hi;
  const n = x => (used && used.get(x) ? used.get(x).n : 0);
  return n(hi) > n(lo) ? hi : lo;
}

/* 色 */
function parseColor(s) {
  s = s.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    let a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return null;
}
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
function toLab({ r, g, b }) {
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = (R * 0.2126 + G * 0.7152 + B * 0.0722), Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
/* CIEDE2000（見た目の色の差。1 ≒ ほぼ分からない、5 未満 ≒ 並べても似ている） */
function dE2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (b, a) => { if (a === 0 && b === 0) return 0; const h = deg(Math.atan2(b, a)); return h < 0 ? h + 360 : h; };
  const h1p = hp(b1, a1p), h2p = hp(b2, a2p);
  let dhp = 0;
  if (C1p * C2p !== 0) dhp = Math.abs(h2p - h1p) <= 180 ? h2p - h1p : (h2p - h1p > 180 ? h2p - h1p - 360 : h2p - h1p + 360);
  const dLp = L2 - L1, dCp = C2p - C1p, dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));
  const Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) hbp = Math.abs(h1p - h2p) <= 180 ? (h1p + h2p) / 2 : (h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2);
  const T = 1 - 0.17 * Math.cos(rad(hbp - 30)) + 0.24 * Math.cos(rad(2 * hbp)) + 0.32 * Math.cos(rad(3 * hbp + 6)) - 0.20 * Math.cos(rad(4 * hbp - 63));
  const dTh = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
  const Sl = 1 + 0.015 * Math.pow(Lbp - 50, 2) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T, Rt = -Math.sin(rad(2 * dTh)) * Rc;
  return Math.sqrt(Math.pow(dLp / Sl, 2) + Math.pow(dCp / Sc, 2) + Math.pow(dHp / Sh, 2) + Rt * (dCp / Sc) * (dHp / Sh));
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

/* ---------------- CSS の変数の種類 ---------------- */
/* 名前から種類が分からない変数（--hdr-py など）は、使っている所のプロパティで決める（padding: var(--hdr-py) なら余白）。
 * 走らせる前に全ファイルから集める（2026-09-27：名前だけで決めていて見落としていた） */
const VAR_USE = new Map();   /* 変数名 → { 項目: 回数 } */
function collectVarUses(text) {
  const note = (name, cat) => { if (!cat || cat === 'filter') return; const m = VAR_USE.get(name) || {}; m[cat] = (m[cat] || 0) + 1; VAR_USE.set(name, m); };
  const decl = /([a-zA-Z-]+)\s*:\s*(['"`]?)([^;{}'"`\n]*\bvar\([^;{}'"`\n]*)/g;
  let m;
  while ((m = decl.exec(text))) {
    const prop = m[1].includes('-') || PROP[m[1].toLowerCase()] ? m[1].toLowerCase() : CAMEL[m[1]];
    const cat = prop && PROP[prop];
    if (!cat) continue;
    const re = /\bvar\(\s*(--[\w-]+)/g;
    let v;
    while ((v = re.exec(m[3]))) note(v[1], cat);
  }
  const tw = /(?:^|[\s"'`:])-?([a-z]+(?:-[a-z]+)?)-\[var\((--[\w-]+)/g;
  while ((m = tw.exec(text))) { const c = TW_HEAD[m[1]]; note(m[2], c === 'text' ? 'fontSize' : c === 'border' || c === 'strokeTw' ? 'stroke' : c); }
}
function varCatOf(name) {
  const byName = varCat(name);
  if (byName) return byName;
  const m = VAR_USE.get(name);
  if (!m) return null;
  const top = Object.entries(m).sort((a, b) => b[1] - a[1]);
  return top.length === 1 || top[0][1] > top[1][1] ? top[0][0] : null;   /* 同じ回数で割れた時は決めない */
}

/* var(--x, 150px) の「予備の値」（カンマの後ろ）と、var() の外の値を、それぞれ fn に通す（入れ子の var() も） */
function mapVarParts(v, outsideFn, fallbackFn) {
  let out = '', i = 0;
  while (i < v.length) {
    const k = v.indexOf('var(', i);
    if (k < 0) { out += outsideFn(v.slice(i)); break; }
    out += outsideFn(v.slice(i, k)) + 'var(';
    let depth = 1, j = k + 4, comma = -1;
    for (; j < v.length; j++) {
      const ch = v[j];
      if (ch === '(') depth++;
      else if (ch === ')') { if (--depth === 0) break; }
      else if (ch === ',' && depth === 1 && comma < 0) comma = j;
    }
    if (depth !== 0) { out += v.slice(k + 4); break; }
    out += comma < 0 ? v.slice(k + 4, j + 1) : v.slice(k + 4, comma + 1) + mapVarParts(v.slice(comma + 1, j), fallbackFn, fallbackFn) + ')';
    i = j + 1;
  }
  return out;
}
const LEN_CATS = new Set(['size', 'spacing', 'radius', 'fontSize', 'stroke', 'shadow']);

/* ---------------- 1つの宣言を調べる ---------------- */
function checkDecl(prop, value, ctx, sink) {
  prop = prop.toLowerCase();
  let cat = PROP[prop] || (prop.startsWith('--') ? varCatOf(prop) : null);
  const v = value.trim();
  if (!/gradient\(/.test(v) && !/shadow/.test(prop) && !/^(filter|backdrop-filter|-webkit-backdrop-filter|mask|-webkit-mask)/.test(prop)) (v.match(COLOR_RE) || []).forEach(c => sink.color(c, ctx, prop.startsWith('--')));
  if (!cat) return;
  if (/\bcalc\(|\benv\(/.test(v)) return;   /* 計算の途中の値は見ない */
  if (/\bvar\(/.test(v)) {   /* var() の外の値と、var(--x, 150px) の予備の値だけ見る */
    if (LEN_CATS.has(cat)) { const f = s => { lengths(s).forEach(n => sink.len(cat, n, v, ctx)); return s; }; mapVarParts(v, f, f); }
    return;
  }
  if (cat === 'letterSpacing') {   /* 字間は %（CSS は em）で書く。px の時だけ参考に出す */
    sink.note('letterSpacing', v, ctx);
    if (/\d(px|rem)\b/.test(v) && !/^0(px)?$/.test(v)) sink.tip('letterSpacing', v, 'em（%）で書く（4の倍数でなくてよい）', ctx);
    return;
  }
  if (cat === 'fontWeight') { if (/^\d+$/.test(v)) sink.use('fontWeight', parseFloat(v), ctx); return; }
  if (cat === 'opacity') {
    const n = parseFloat(v);
    if (/^-?\d*\.?\d+%?$/.test(v)) { const x = v.endsWith('%') ? n / 100 : n; if (x > 0 && x < 1) sink.use('opacity', round(x), ctx); }
    return;
  }
  if (cat === 'filter') {
    const re = /(blur|drop-shadow)\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(v))) lengths(m[2]).forEach(n => sink.len(m[1] === 'blur' ? 'blur' : 'shadow', n, v, ctx));
    return;
  }
  if (cat === 'lineHeight') {   /* 行間は比率（%）で書く。4の倍数でなくてよい。px の時だけ参考に出す */
    if (/^\d*\.?\d+$/.test(v)) sink.use('lineHeight', parseFloat(v), ctx);
    else if (/%$/.test(v)) sink.use('lineHeight', parseFloat(v) / 100, ctx);
    else if (/\d(px|rem)\b/.test(v)) sink.tip('lineHeight', v, '比率（%）で書く（4の倍数でなくてよい）', ctx);
    return;
  }
  lengths(v).forEach(n => sink.len(cat, n, v, ctx));
}

/* ---------------- ファイルを読む ---------------- */
const CSS_EXT = new Set(['.css', '.scss', '.sass', '.less']);
const MARKUP_EXT = new Set(['.html', '.htm', '.vue', '.svelte']);
const JSX_EXT = new Set(['.tsx', '.jsx']);
const JS_EXT = new Set(['.js', '.mjs', '.ts', '.mts']);
const ALL_EXT = new Set([...CSS_EXT, ...MARKUP_EXT, ...JSX_EXT, ...JS_EXT]);

function blankComments(text) {   /* 行番号を保ったまま /* */ /* を空白にする */
  return text.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
}
function blankKeyframes(text) {   /* @keyframes の中（アニメの途中の値）は見ない */
  let out = text, i;
  const re = /@(-webkit-)?keyframes[^{]*\{/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 1; i = m.index + m[0].length;
    while (i < text.length && depth > 0) { if (text[i] === '{') depth++; else if (text[i] === '}') depth--; i++; }
    out = out.slice(0, m.index) + out.slice(m.index, i).replace(/[^\n]/g, ' ') + out.slice(i);
  }
  return out;
}

/* CSS の宣言を行ごとに拾う（まとまりの中の font-size を覚えて、比率の行間に使う） */
function scanCss(text, file, lineOffset, sink, onlyLines) {
  const src = blankKeyframes(blankComments(text));
  const lines = src.split('\n');
  let blockFont = null;
  lines.forEach((ln, idx) => {
    const lineNo = idx + 1 + lineOffset;
    if (ln.includes('}')) blockFont = null;
    if (onlyLines && !onlyLines.has(lineNo)) { const fs0 = ln.match(/font-size\s*:\s*(\d*\.?\d+)px/); if (fs0) blockFont = parseFloat(fs0[1]); return; }
    if (/4-7例外/.test(text.split('\n')[idx] || '')) return;
    const re = /(^|[;{\s"'`(])(--[\w-]+|-?[a-z][a-z-]*)\s*:\s*([^;{}"'`]+)/gi;
    let m;
    const fsm = ln.match(/font-size\s*:\s*(\d*\.?\d+)px/);
    if (fsm) blockFont = parseFloat(fsm[1]);
    while ((m = re.exec(ln))) {
      if (/^\s*(https?|data|mailto)$/i.test(m[2])) continue;
      checkDecl(m[2], m[3], { file, line: lineNo, fontSize: blockFont }, sink);
    }
    if (ln.includes('}')) blockFont = null;
  });
}

/* Tailwind の [任意の値] と、.5 刻みの余白クラス */
function scanTailwind(ln, ctx, sink) {
  const re = /(?:^|[\s"'`:{(])(-?)([a-z]+(?:-[a-z]+)?)-\[([^\]\s]+)\]/g;
  let m;
  while ((m = re.exec(ln))) {
    const head = m[2], raw = m[3].replace(/_/g, ' '), cat = TW_HEAD[head];
    if (!cat) continue;
    const colors = raw.match(COLOR_RE) || [];
    colors.forEach(c => sink.color(c, ctx));
    if (cat === 'color' || /^#|^rgb/.test(raw)) continue;
    if (/\bvar\(|\bcalc\(/.test(raw)) continue;
    if (cat === 'text') { lengths(raw).forEach(n => sink.len('fontSize', n, head + '-[' + m[3] + ']', ctx)); continue; }
    if (cat === 'letterSpacing') { sink.note('letterSpacing', raw, ctx); if (/\d(px|rem)\b/.test(raw)) sink.tip('letterSpacing', head + '-[' + m[3] + ']', 'em（%）で書く（4の倍数でなくてよい）', ctx); continue; }
    if (cat === 'font') { if (/^\d+$/.test(raw)) sink.use('fontWeight', +raw, ctx); continue; }
    if (cat === 'opacity') { const x = parseFloat(raw) > 1 ? parseFloat(raw) / 100 : parseFloat(raw); if (!isNaN(x) && x > 0 && x < 1) sink.use('opacity', round(x), ctx); continue; }
    if (cat === 'lineHeight') { if (/px|rem/.test(raw)) sink.tip('lineHeight', head + '-[' + m[3] + ']', '比率（%）で書く（4の倍数でなくてよい）', ctx); else if (!isNaN(parseFloat(raw))) sink.use('lineHeight', parseFloat(raw), ctx); continue; }
    if (cat === 'border') { lengths(raw).forEach(n => sink.len('stroke', n, head + '-[' + m[3] + ']', ctx)); continue; }
    if (cat === 'strokeTw') { lengths(raw).forEach(n => sink.len('stroke', n, head + '-[' + m[3] + ']', ctx)); continue; }
    lengths(raw).forEach(n => sink.len(cat, n, head + '-[' + m[3] + ']', ctx));
  }
  const half = /(?:^|[\s"'`:])-?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|w|h|size)-(\d+\.5)(?=[\s"'`]|$)/g;   /* sm:px-3.5 のような頭付きも */
  while ((m = half.exec(ln))) {
    const px = parseFloat(m[2]) * 4;
    sink.len(TW_HEAD[m[1]] || 'spacing', px, m[1] + '-' + m[2] + '（' + px + 'px）', ctx);
  }
  /* 目盛りの名前のクラス（p-4 = 16px・gap-2 = 8px・text-sm = 14px など）は決まりどおりなので、数えるだけ
   * （数えないと、Tailwind で組んだサイトでは「よく使う値」を読み違え、同じ差の時の寄せる先を誤る） */
  const named = /(?:^|[\s"'`:])-?(p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|basis)-(\d+)(?=[\s"'`]|$)/g;
  while ((m = named.exec(ln))) { const px = parseInt(m[2], 10) * 4; if (px > 0) sink.use(TW_HEAD[m[1]] || 'spacing', px, ctx); }
  const textNamed = /(?:^|[\s"'`:])text-(xs|sm|base|lg|xl|[2-9]xl)(?=[\s"'`]|$)/g;
  while ((m = textNamed.exec(ln))) { const px = TW_TEXT_PX[m[1]]; if (px && RULE.fontSize.ok(px)) sink.use('fontSize', px, ctx); }
}
const TW_TEXT_PX = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60, '7xl': 72, '8xl': 96, '9xl': 128 };

/* React の style={{ fontSize: 13 }} など（キャメルケース） */
function scanStyleObject(ln, ctx, sink) {
  const re = /\b([a-zA-Z]+)\s*:\s*(['"`]?)(-?\d*\.?\d+(?:px|rem)?)\2\s*[,}]/g;
  let m;
  while ((m = re.exec(ln))) {
    const prop = CAMEL[m[1]];
    if (!prop) continue;
    const val = /px|rem/.test(m[3]) || PROP[prop] === 'fontWeight' || PROP[prop] === 'opacity' || PROP[prop] === 'lineHeight' ? m[3] : m[3] + 'px';
    checkDecl(prop, val, ctx, sink);
  }
  /* padding: '6px 10px' のように、値が2つ以上ある文字列（値が1つの物は上で見た） */
  const multi = /\b([a-zA-Z]+)\s*:\s*(['"`])([^'"`]*\d(?:px|rem)[^'"`]*)\2/g;
  while ((m = multi.exec(ln))) {
    const prop = CAMEL[m[1]];
    if (!prop || !/\s/.test(m[3].trim())) continue;
    checkDecl(prop, m[3], ctx, sink);
  }
}

function scanFile(file, text, sink, onlyLines) {
  const ext = path.extname(file).toLowerCase();
  if (CSS_EXT.has(ext)) { scanCss(text, file, 0, sink, onlyLines); return; }
  const lines = text.split('\n');
  if (MARKUP_EXT.has(ext)) {
    /* <style> の中は CSS として、style="" は宣言として、class="" は Tailwind として */
    const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let m;
    const styleRanges = [];
    while ((m = re.exec(text))) {
      const before = text.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1;
      scanCss(m[1], file, before, sink, onlyLines);
      styleRanges.push([before + 1, before + m[1].split('\n').length]);
    }
    lines.forEach((ln, i) => {
      const lineNo = i + 1;
      if (styleRanges.some(([a, b]) => lineNo >= a && lineNo <= b)) return;
      if ((onlyLines && !onlyLines.has(lineNo)) || /4-7例外/.test(ln)) return;
      const ctx = { file, line: lineNo };
      const sa = /style\s*=\s*"([^"]*)"/g;
      let s;
      while ((s = sa.exec(ln))) s[1].split(';').forEach(d => { const k = d.indexOf(':'); if (k > 0) checkDecl(d.slice(0, k).trim(), d.slice(k + 1), ctx, sink); });
      scanTailwind(ln, ctx, sink);
    });
    return;
  }
  /* JSX・JS：文字列の中の CSS（px 付きだけ）・style オブジェクト・Tailwind */
  lines.forEach((ln, i) => {
    const lineNo = i + 1;
    if ((onlyLines && !onlyLines.has(lineNo)) || /4-7例外/.test(ln)) return;
    const ctx = { file, line: lineNo };
    const re = /(^|[;{\s"'`])(--[\w-]+|-?[a-z][a-z-]*)\s*:\s*([^;{}"'`]*?(?:px|rem)[^;{}"'`]*)/g;
    let m;
    while ((m = re.exec(ln))) if (m[2].includes('-') || PROP[m[2]]) checkDecl(m[2], m[3], ctx, sink);
    if (JSX_EXT.has(ext)) { scanStyleObject(ln, ctx, sink); scanTailwind(ln, ctx, sink); }
    else (ln.match(COLOR_RE) || []).forEach(c => sink.color(c, ctx));
  });
}

/* ---------------- 結果を集める ---------------- */
function newSink() {
  const bad = [], tips = [], uses = {}, colors = new Map(), notes = {};
  return {
    bad: (cat, v, raw, ctx) => bad.push({ cat, v, raw: String(raw).trim().slice(0, 60), file: ctx.file, line: ctx.line }),
    tip: (cat, raw, why, ctx) => tips.push({ cat, raw: String(raw).trim().slice(0, 60), why, file: ctx.file, line: ctx.line }),
    len(cat, v, raw, ctx) {
      const r = RULE[cat];
      if (!r) return;
      if (v === 0) return;
      /* 画面の大きさ（390・430 など）と同じ値は、画面の大きさなら例外・部品の大きさなら寄せる。黙って飛ばさず参考に出す（2026-09-27） */
      if (cat === 'size' && SCREEN.has(v) && !r.ok(v)) { this.tip('size', raw, '画面の大きさなら行に「4-7例外」。部品の大きさなら ' + nearest(v, r.ok) + ' へ', ctx); return; }
      if (r.free || r.ok(v)) this.use(cat, v, ctx);   /* 自由な項目は数えるだけ */
      else this.bad(cat, v, raw, ctx);
    },
    use: (cat, v, ctx) => { (uses[cat] ||= new Map()); const k = v; const e = uses[cat].get(k) || { n: 0, at: [] }; e.n++; if (e.at.length < 3) e.at.push(ctx.file + ':' + ctx.line); uses[cat].set(k, e); },
    color: (c, ctx, isToken) => { const p = parseColor(c); if (!p || p.a < 1) return; const k = hex(p); const e = colors.get(k) || { n: 0, at: [], token: false }; e.n++; if (isToken) e.token = true; if (e.at.length < 3) e.at.push(ctx.file + ':' + ctx.line); colors.set(k, e); },
    note: (cat, v, ctx) => { (notes[cat] ||= new Map()); notes[cat].set(v, (notes[cat].get(v) || 0) + 1); },
    result: () => ({ bad, tips, uses, colors, notes }),
  };
}

function similarColors(colors) {
  const list = [...colors.entries()].map(([k, e]) => ({ k, n: e.n, at: e.at, token: e.token, lab: toLab(parseColor(k)) }));
  const pairs = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const d = dE2000(list[i].lab, list[j].lab);
    if (d > 0.01 && d < SIMILAR_COLOR_DE) {
      const [a, b] = list[i].n >= list[j].n ? [list[i], list[j]] : [list[j], list[i]];
      /* どちらも名前の付いた色（--bg と --surface-2 など）は、役割が違うかもしれないので自動ではまとめない（2026-09-27） */
      const tokens = a.token && b.token;
      pairs.push({ keep: a.k, keepN: a.n, drop: b.k, dropN: b.n, dropAt: b.at[0], d: Math.round(d * 10) / 10, how: d < AUTO.color && !tokens ? '自動' : '提案', tokens });
    }
  }
  return pairs.sort((x, y) => x.d - y.d);
}

/* 1回しか使っていない、決まりどおりの値（例：よく使う 8px の近くに 1回だけの 6px）。決まり（4-7）は倍数だけで、
 * 決まりどおりの値どうしをまとめるのは求めていない（種類に上限は設けない・ヒデさん 2026-09-27）。小さい値では 2px でも
 * 見た目が変わる（8px→6px は 25% 細くなる）ので、自動では寄せず、いつも「提案」にする */
function rareNearValues(uses) {
  const out = [];
  ['spacing', 'radius', 'fontSize', 'size'].forEach(cat => {
    const m = uses[cat];
    if (!m) return;
    m.forEach((e, v) => {
      if (e.n !== 1) return;
      let best = null;
      m.forEach((e2, v2) => { if (v2 !== v && Math.abs(v2 - v) <= 4 && e2.n >= 3 && (!best || e2.n > best.n)) best = { v: v2, n: e2.n }; });
      if (best) out.push({ cat, v, at: e.at[0], near: best.v, nearN: best.n, how: '提案' });
    });
  });
  return out;
}

/* 自由な項目（行間・線幅・影・ぼかし・不透明度）の、近い値のかたまり＝寄せる候補 */
function nearClusters(uses) {
  const out = [];
  Object.keys(RULE).filter(c => RULE[c].free && RULE[c].near > 0).forEach(cat => {
    const m = uses[cat];
    if (!m) return;
    const vals = [...m.keys()].sort((a, b) => a - b);
    let grp = [vals[0]];
    const flush = () => { if (grp.length >= 2) out.push({ cat, vals: grp.map(v => ({ v, n: m.get(v).n, at: m.get(v).at[0] })) }); };
    const r = RULE[cat];
    for (let i = 1; i < vals.length; i++) {
      const d = vals[i] - grp[0];   /* かたまりの先頭と比べる（数珠つなぎで広がらないように） */
      if (d <= r.near + 1e-9 && (!r.rel || d / vals[i] <= r.rel + 1e-9)) grp.push(vals[i]);
      else { flush(); grp = [vals[i]]; }
    }
    flush();
  });
  return out;
}

/* ---------------- 表にする ---------------- */
function rel(f) { return path.relative(process.cwd(), f) || f; }
function report({ bad, tips, uses, colors, notes }, files, opts = {}) {
  const lines = [];
  lines.push(`## デザインの数値の検査（ルール集 4-7）`);
  lines.push(`対象 ${files} ファイル／決まり（文字サイズ・サイズ・余白・角丸の4と8の倍数）から外れた値 ${bad.length} 件`);
  lines.push(`似た色 ${opts.pairs.length} 組／近い値のかたまり（行間・線幅・影・ぼかし・不透明度）${opts.clusters.length} か所／1回しか使っていない近い値 ${opts.rare.length} 件／書き方の提案 ${tips.length} 件`);
  lines.push('扱い：「自動」＝見た目がほぼ変わらないので、作業で触っている範囲なら聞かずに寄せて報告の表に書く。「提案」＝見た目が変わりそうなので、寄せる前に聞く（RULES.md 4-13）');
  if (bad.length) {
    lines.push('', `### 決まりから外れた値（${bad.length} 件・扱いが「自動」の物は、作業で触っている範囲なら聞かずに寄せる）`, '', '| 箇所 | 項目 | 値 | 書き方 | 寄せる先 | 扱い |', '|---|---|---|---|---|---|');
    /* 文字は、大小の差が消えないようにずらした後の寄せる先を出す（--fix と同じ） */
    const fontMap = new Map();
    bad.filter(b => b.cat === 'fontSize').forEach(b => { const t = target(b.v, RULE.fontSize.ok, uses.fontSize); if (t !== null && howTo('fontSize', b.v, t) === '自動') fontMap.set(b.v, t); });
    spreadFontTargets({ fontSize: fontMap });
    bad.slice(0, opts.limit || 200).forEach(b => {
      const r = RULE[b.cat];
      const t = b.cat === 'fontSize' && fontMap.has(b.v) ? fontMap.get(b.v) : target(b.v, r.ok, uses[b.cat]);
      lines.push(`| ${rel(b.file)}:${b.line} | ${r.name} | ${b.v}px | \`${b.raw.replace(/\|/g, '\\|')}\` | ${t}px | ${howTo(b.cat, b.v, t)} |`);
    });
    if (bad.length > (opts.limit || 200)) lines.push(`| … | ほか ${bad.length - (opts.limit || 200)} 件 | | | | |`);
  }
  if (opts.clusters.length) {
    lines.push('', `### 近い値のかたまり（行間・線幅・影・ぼかし・不透明度）`, '', '| 項目 | 近い値（使っている回数） | 寄せる先 | 扱い | 例の箇所 |', '|---|---|---|---|---|');
    opts.clusters.slice(0, 60).forEach(c => {
      const u = RULE[c.cat].unit, top = c.vals.slice().sort((a, b) => b.n - a.n)[0].v;
      const how = c.vals.every(x => x.v === top || howTo(c.cat, x.v, top) === '自動') ? '自動' : '提案';
      lines.push(`| ${RULE[c.cat].name} | ${c.vals.map(x => x.v + u + '（' + x.n + '）').join('・')} | ${top}${u} | ${how} | ${rel(c.vals[0].at.split(':')[0])}:${c.vals[0].at.split(':')[1]} |`);
    });
  }
  if (tips.length) {
    lines.push('', `### 参考：書き方の提案（${tips.length} 件）`, '', '| 箇所 | 項目 | 書き方 | 提案 |', '|---|---|---|---|');
    tips.slice(0, 40).forEach(t => lines.push(`| ${rel(t.file)}:${t.line} | ${t.cat === 'letterSpacing' ? '字間' : (RULE[t.cat] && RULE[t.cat].name) || t.cat} | \`${t.raw.replace(/\|/g, '\\|')}\` | ${t.why} |`));
  }
  if (opts.pairs.length) {
    lines.push('', `### 似た色（色の差 ${SIMILAR_COLOR_DE} 未満・${opts.pairs.length} 組。2未満は自動で寄せる）`, '', '| 寄せる先（よく使う色） | 回数 | 似た色 | 回数 | 色の差 | 扱い | 似た色の箇所 |', '|---|---|---|---|---|---|---|');
    opts.pairs.slice(0, 60).forEach(p => lines.push(`| ${p.keep} | ${p.keepN} | ${p.drop} | ${p.dropN} | ${p.d} | ${p.how}${p.tokens ? '（名前の違う色どうし）' : ''} | ${rel(p.dropAt.split(':')[0])}:${p.dropAt.split(':')[1]} |`));
  }
  if (opts.rare.length) {
    lines.push('', `### 1回しか使っていない近い値（4-4・決まりどおりの値どうしなので自動では寄せない。まとめるかは提案）`, '', '| 項目 | 値 | 箇所 | 寄せる先（よく使う値） | 扱い |', '|---|---|---|---|---|');
    opts.rare.slice(0, 60).forEach(r => lines.push(`| ${RULE[r.cat].name} | ${r.v}px | ${rel(r.at.split(':')[0])}:${r.at.split(':')[1]} | ${r.near}px（${r.nearN} 回） | ${r.how} |`));
  }
  if (opts.summary) {
    lines.push('', '### 使っている値の種類', '', '| 項目 | 種類 | 値 |', '|---|---|---|');
    ['fontSize', 'lineHeight', 'fontWeight', 'spacing', 'size', 'radius', 'stroke', 'shadow', 'blur', 'opacity'].forEach(c => {
      const m = uses[c];
      if (!m || !m.size) return;
      const vals = [...m.keys()].sort((a, b) => a - b);
      lines.push(`| ${RULE[c].name} | ${vals.length} | ${vals.slice(0, 30).join('・')}${vals.length > 30 ? ' …' : ''} |`);
    });
    if (notes.letterSpacing) lines.push(`| 字間 | ${notes.letterSpacing.size} | ${[...notes.letterSpacing.keys()].slice(0, 20).join('・')} |`);
    lines.push(`| 色（不透明） | ${colors.size} | ― |`);
  }
  return lines.join('\n');
}

/* ---------------- フォルダを歩く ---------------- */
const SKIP_DIR = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'out', 'coverage', '.vercel', '.turbo', '.cache', '.claude']);
function isGenerated(text) { return /自動生成|AUTO-GENERATED|DO NOT EDIT|@generated/i.test(text.split('\n').slice(0, 10).join('\n')); }
function walk(p, opts, out) {
  let st;
  try { st = fs.statSync(p); } catch (e) { return; }
  if (st.isDirectory()) {
    const base = path.basename(p);
    if (SKIP_DIR.has(base)) return;
    if (!opts.all && (base === 'mock' || base === 'test' || base === 'tests' || base === '__tests__')) return;
    fs.readdirSync(p).forEach(n => walk(path.join(p, n), opts, out));
    return;
  }
  const ext = path.extname(p).toLowerCase();
  if (!ALL_EXT.has(ext) || /\.min\./.test(p) || st.size > 1.5e6) return;
  if (JS_EXT.has(ext) && !opts.withJs && !opts.explicit) return;
  out.push(p);
}

/* ---------------- 書いた直後の見張り（PostToolUse） ---------------- */
function gitOld(file) {
  try {
    const root = execFileSync('git', ['-C', path.dirname(file), 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const relp = path.relative(root, file);
    return execFileSync('git', ['-C', root, 'show', 'HEAD:' + relp], { encoding: 'utf8', maxBuffer: 20e6, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { return ''; }
}
function hook() {
  let data = {};
  try { data = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) { return; }
  const file = data.tool_input && (data.tool_input.file_path || data.tool_input.notebook_path);
  if (!file || !fs.existsSync(file)) return;
  const ext = path.extname(file).toLowerCase();
  if (!ALL_EXT.has(ext) || /\.min\.|\/(node_modules|\.next|dist|build|out)\//.test(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  if (isGenerated(text)) return;
  /* いま書いた行 ＝ 前回の記録（HEAD）に無い行 */
  const oldCount = new Map();
  gitOld(file).split('\n').forEach(l => oldCount.set(l, (oldCount.get(l) || 0) + 1));
  const only = new Set();
  text.split('\n').forEach((l, i) => { const c = oldCount.get(l) || 0; if (c > 0) oldCount.set(l, c - 1); else if (l.trim()) only.add(i + 1); });
  if (!only.size) return;
  const sink = newSink();
  collectVarUses(text);
  scanFile(file, text, sink, only);
  let { bad } = sink.result();   /* 書いた直後に知らせるのは決まり（4と8の倍数）だけ。提案は完了前の全体検査で出す */
  if (!bad.length) return;
  /* 同じ所を何度も知らせない（30分） */
  const stateDir = path.join(os.tmpdir(), 'claude-design-check');
  const sid = String(data.session_id || 'x').replace(/[^\w-]/g, '');
  const stateFile = path.join(stateDir, sid + '.json');
  let seen = {};
  try { seen = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (e) {}
  const now = Date.now();
  const lines = text.split('\n');
  bad = bad.filter(b => { const k = file + '|' + (lines[b.line - 1] || '').trim() + '|' + b.cat + '|' + b.v; if (seen[k] && now - seen[k] < 30 * 60e3) return false; seen[k] = now; return true; });
  try { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(stateFile, JSON.stringify(seen)); } catch (e) {}
  if (!bad.length) return;
  const rows = bad.slice(0, 10).map(b => {
    const r = RULE[b.cat];
    const t = target(b.v, r.ok, null), how = howTo(b.cat, b.v, t);
    return `- ${path.basename(file)}:${b.line} ${r.name} ${b.v}px \`${b.raw}\` → ${how === '自動' ? '自動で ' + t + 'px に寄せる（差 ' + round(Math.abs(t - b.v)) + 'px・見た目はほぼ変わらない）' : '提案：近い値は ' + nearest(b.v, r.ok) + '（差 ' + round(Math.abs(t - b.v)) + 'px 以上・見た目が変わるかも。寄せる前に聞く）'}`;
  });
  const msg = '【デザインの数値の見張り・ルール集 4-7・4-13】いま書いた所に、4と8の倍数から外れた値があります。「自動」は聞かずに寄せて報告の表に書き、「提案」はヒデさんに聞いてください。わざと外すなら同じ行に「4-7例外（理由）」と書いてください。\n' +
    rows.join('\n') + (bad.length > 10 ? `\n- ほか ${bad.length - 10} 件` : '');
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg } }));
}


/* ---------------- 自動で寄せる（--fix）：見た目がほぼ変わらない物だけ書き換える（RULES.md 4-13） ---------------- */
/* maps.num[cat] : 値 → 寄せる先（px か、単位なしの比率）／maps.hex : 色 → 寄せる先の色 */
function buildFixMaps(res, pairs, rare, clusters) {
  const num = {}, hex = new Map();
  const put = (cat, from, to) => { if (from === to) return; (num[cat] ||= new Map()); if (!num[cat].has(from)) num[cat].set(from, to); };
  res.bad.forEach(b => { const r = RULE[b.cat], t = target(b.v, r.ok, res.uses[b.cat]); if (t !== null && howTo(b.cat, b.v, t) === '自動') put(b.cat, b.v, t); });
  const notes = spreadFontTargets(num);
  clusters.forEach(c => { const top = c.vals.slice().sort((a, b) => b.n - a.n)[0].v; c.vals.forEach(x => { if (x.v !== top && howTo(c.cat, x.v, top) === '自動') put(c.cat, x.v, top); }); });
  rare.forEach(r => { if (r.how === '自動') put(r.cat, r.v, r.near); });
  /* 色は、よく使う方へ。寄せる先がさらに寄せられる時は、たどって最後の色へ */
  pairs.filter(p => p.how === '自動').sort((a, b) => b.keepN - a.keepN).forEach(p => { if (!hex.has(p.drop) && !hex.has(p.keep)) hex.set(p.drop, p.keep); });
  hex.forEach((to, from) => { let t = to, guard = 0; while (hex.has(t) && guard++ < 10) t = hex.get(t); hex.set(from, t); });
  return { num, hex, notes };
}
/* 文字サイズ：別々の大きさが同じ値に寄ると、見出しと補足の大小の差が消える（例：13px と 11px が両方 12px）。
 * ちょうど真ん中の値（どちらに寄せても同じ差）は、ぶつからない側へずらす。大きい方から先に上へ（読みやすさを保つ・2026-09-27） */
function spreadFontTargets(num) {
  const m = num.fontSize, notes = [];
  if (!m) return notes;
  const ok = RULE.fontSize.ok;
  const sides = f => {
    let lo = null, hi = null;
    for (let d = 0.5; d <= 16 && (lo === null || hi === null); d += 0.5) {
      if (lo === null && f - d > 0 && ok(round(f - d))) lo = round(f - d);
      if (hi === null && ok(round(f + d))) hi = round(f + d);
    }
    return { lo, hi, tie: lo !== null && hi !== null && round(f - lo) === round(hi - f) };
  };
  for (let guard = 0; guard < 8; guard++) {
    const byTo = new Map();
    m.forEach((to, from) => { if (!byTo.has(to)) byTo.set(to, []); byTo.get(to).push(from); });
    let moved = false;
    for (const [to, froms] of byTo) {
      if (froms.length < 2) continue;
      for (const f of froms.slice().sort((a, b) => b - a)) {
        const s = sides(f), alt = f > to ? s.hi : s.lo;
        if (!s.tie || alt === null || alt === to) continue;
        m.set(f, alt);
        notes.push(`${f}px → ${alt}px（${froms.filter(x => x !== f).map(x => x + 'px').join('・')} も ${to}px に寄るので、大小の差を残すため反対側へ）`);
        moved = true;
        break;
      }
      if (moved) break;
    }
    if (!moved) break;
  }
  return notes;
}
const fmt = (v, unit) => unit === 'rem' ? String(round(v / 16)).replace(/^0\./, '0.') + 'rem' : String(round(v)) + (unit || '');
function rewriteLengths(cat, str, maps, changes, where) {
  const m = maps.num[cat];
  if (!m) return str;
  return str.replace(/(-?)(\d*\.?\d+)(px|rem)\b/g, (all, sign, n, unit) => {
    const px = round(parseFloat(n) * (unit === 'rem' ? 16 : 1));
    if (!m.has(px)) return all;
    const out = sign + fmt(m.get(px), unit);
    changes.push({ ...where, cat, from: all, to: out });
    return out;
  });
}
function rewriteColors(str, maps, changes, where) {
  if (!maps.hex.size) return str;
  return str.replace(/#[0-9a-fA-F]{3,8}\b/g, all => {
    const p = parseColor(all);
    if (!p || p.a < 1) return all;
    const k = hex(p);
    if (!maps.hex.has(k)) return all;
    const out = maps.hex.get(k);
    changes.push({ ...where, cat: 'color', from: all, to: out });
    return out;
  });
}
function rewriteDecl(prop, value, maps, changes, where) {
  prop = prop.toLowerCase();
  const cat = PROP[prop] || (prop.startsWith('--') ? varCatOf(prop) : null);
  let v = value;
  if (!/gradient\(/.test(v) && !/shadow/.test(prop) && !/^(filter|backdrop-filter|-webkit-backdrop-filter|mask|-webkit-mask)/.test(prop)) v = rewriteColors(v, maps, changes, where);
  if (!cat || /\bcalc\(|\benv\(/.test(v)) return v;
  if (/\bvar\(/.test(v)) {   /* var() の外の値と、var(--x, 150px) の予備の値だけ書き換える */
    if (!LEN_CATS.has(cat)) return v;
    const f = s => rewriteLengths(cat, s, maps, changes, where);
    return mapVarParts(v, f, f);
  }
  if (cat === 'filter') return v.replace(/(blur|drop-shadow)\(([^)]*)\)/g, (all, fn, inner) => fn + '(' + rewriteLengths(fn === 'blur' ? 'blur' : 'shadow', inner, maps, changes, where) + ')');
  if (cat === 'lineHeight' || cat === 'opacity') {
    const t = v.trim(), m = maps.num[cat];
    if (m && /^\d*\.?\d+%?$/.test(t)) {
      const x = t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t);
      if (m.has(round(x))) { const to = m.get(round(x)); const out = t.endsWith('%') ? round(to * 100) + '%' : String(to); changes.push({ ...where, cat, from: t, to: out }); return v.replace(t, out); }
    }
    return v;
  }
  if (cat === 'letterSpacing' || cat === 'fontWeight') return v;
  return rewriteLengths(cat, v, maps, changes, where);
}
/* 1行の中の「プロパティ: 値」を、見つけた位置のまま書き換える（view は注釈や @keyframes を空白にした行） */
function rewriteDeclsInLine(orig, view, re, maps, changes, where, filter) {
  let out = '', last = 0, m;
  re.lastIndex = 0;
  while ((m = re.exec(view))) {
    const prop = m[2], vStart = m.index + m[0].length - m[3].length, vEnd = m.index + m[0].length;
    if (filter && !filter(prop)) continue;
    if (/^\s*(https?|data|mailto)$/i.test(prop)) continue;
    const val = orig.slice(vStart, vEnd);
    const nv = rewriteDecl(prop, val, maps, changes, { ...where, prop });
    if (nv !== val) { out += orig.slice(last, vStart) + nv; last = vEnd; }
  }
  return out + orig.slice(last);
}
function rewriteTailwind(line, maps, changes, where) {
  let out = line.replace(/((?:^|[\s"'`:{(])-?)([a-z]+(?:-[a-z]+)?)-\[([^\]\s]+)\]/g, (all, pre, head, raw) => {
    const cat = TW_HEAD[head];
    if (!cat || cat === 'letterSpacing' || cat === 'font') return all;
    let nv = raw;
    if (cat === 'color' || /^#/.test(raw)) nv = rewriteColors(raw, maps, changes, { ...where, prop: head });
    else if (cat === 'text') nv = /px|rem/.test(raw) ? rewriteLengths('fontSize', raw, maps, changes, { ...where, prop: head }) : rewriteColors(raw, maps, changes, { ...where, prop: head });
    else if (cat === 'border' || cat === 'strokeTw') nv = /px|rem/.test(raw) ? rewriteLengths('stroke', raw, maps, changes, { ...where, prop: head }) : rewriteColors(raw, maps, changes, { ...where, prop: head });
    else if (cat === 'shadow') nv = rewriteColors(rewriteLengths('shadow', raw.replace(/_/g, ' '), maps, changes, { ...where, prop: head }), maps, changes, { ...where, prop: head }).replace(/ /g, '_');
    else if (cat === 'opacity' || cat === 'lineHeight') {
      const m = maps.num[cat], x = parseFloat(raw);
      if (cat === 'lineHeight' && /px|rem/.test(raw)) return all;
      const key = cat === 'opacity' && x > 1 ? round(x / 100) : round(x);
      if (m && m.has(key)) { const to = m.get(key); nv = cat === 'opacity' && x > 1 ? String(round(to * 100)) : String(to); changes.push({ ...where, prop: head, cat, from: raw, to: nv }); }
    } else nv = rewriteLengths(cat === 'blur' ? 'blur' : cat, raw, maps, changes, { ...where, prop: head });
    return nv === raw ? all : pre + head + '-[' + nv + ']';
  });
  /* .5 刻みの余白クラス（p-3.5 = 14px など。sm:px-3.5 のような頭付きも） */
  out = out.replace(/((?:^|[\s"'`:])-?)(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|w|h|size)-(\d+\.5)(?=[\s"'`]|$)/g, (all, pre, head, n) => {
    const cat = TW_HEAD[head] || 'spacing', m = maps.num[cat], px = parseFloat(n) * 4;
    if (!m || !m.has(px)) return all;
    const to = m.get(px) / 4;
    if (Math.abs(to * 2 - Math.round(to * 2)) > 1e-9) return all;
    changes.push({ ...where, prop: head, cat, from: head + '-' + n, to: head + '-' + to });
    return pre + head + '-' + to;
  });
  return out;
}
function rewriteStyleObject(line, maps, changes, where) {
  return line.replace(/\b([a-zA-Z]+)(\s*:\s*)(['"`]?)(-?\d*\.?\d+)(px|rem)?\3(?=\s*[,}])/g, (all, key, colon, q, n, unit) => {
    const prop = CAMEL[key];
    if (!prop) return all;
    const cat = PROP[prop];
    if (!cat || cat === 'fontWeight' || cat === 'letterSpacing') return all;
    const m = maps.num[cat];
    if (!m) return all;
    const unitless = !unit;
    const px = cat === 'lineHeight' || cat === 'opacity' ? round(parseFloat(n)) : round(parseFloat(n) * (unit === 'rem' ? 16 : 1));
    if (!m.has(px)) return all;
    const to = m.get(px);
    const out = key + colon + q + (cat === 'lineHeight' || cat === 'opacity' || unitless ? String(to) : fmt(to, unit)) + q;
    changes.push({ ...where, prop: key, cat, from: all, to: out });
    return out;
  }).replace(/\b([a-zA-Z]+)(\s*:\s*)(['"`])([^'"`]*\d(?:px|rem)[^'"`]*)\3/g, (all, key, colon, q, val) => {
    /* padding: '6px 10px' のように、値が2つ以上ある文字列 */
    const prop = CAMEL[key];
    if (!prop || !/\s/.test(val.trim())) return all;
    const nv = rewriteDecl(prop, val, maps, changes, { ...where, prop: key });
    return nv === val ? all : key + colon + q + nv + q;
  });
}
const DECL_RE_CSS = () => /(^|[;{\s"'`(])(--[\w-]+|-?[a-z][a-z-]*)\s*:\s*([^;{}"'`]+)/gi;
const DECL_RE_JS = () => /(^|[;{\s"'`])(--[\w-]+|-?[a-z][a-z-]*)\s*:\s*([^;{}"'`]*?(?:px|rem)[^;{}"'`]*)/g;
function fixText(file, text, maps) {
  const ext = path.extname(file).toLowerCase(), changes = [];
  const lines = text.split('\n');
  const skip = i => /4-7例外/.test(lines[i]);
  if (CSS_EXT.has(ext)) {
    const view = blankKeyframes(blankComments(text)).split('\n');
    return { text: lines.map((ln, i) => skip(i) ? ln : rewriteDeclsInLine(ln, view[i], DECL_RE_CSS(), maps, changes, { file, line: i + 1 })).join('\n'), changes };
  }
  if (MARKUP_EXT.has(ext)) {
    /* <style> の中は CSS として（@keyframes と注釈は空白にした行で位置を決める） */
    const view = text.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (all, a, css, b) => a + blankKeyframes(blankComments(css)) + b).split('\n');
    const inStyle = new Array(lines.length).fill(false);
    let on = false;
    lines.forEach((ln, i) => { if (/<style[^>]*>/i.test(ln)) on = true; inStyle[i] = on; if (/<\/style>/i.test(ln)) on = false; });
    return { text: lines.map((ln, i) => {
      if (skip(i)) return ln;
      const where = { file, line: i + 1 };
      if (inStyle[i]) return rewriteDeclsInLine(ln, view[i], DECL_RE_CSS(), maps, changes, where);
      let out = ln.replace(/(style\s*=\s*")([^"]*)(")/g, (all, a, body, b) => a + rewriteDeclsInLine(body, body, DECL_RE_CSS(), maps, changes, where) + b);
      return rewriteTailwind(out, maps, changes, where);
    }).join('\n'), changes };
  }
  return { text: lines.map((ln, i) => {
    if (skip(i)) return ln;
    const where = { file, line: i + 1 };
    let out = rewriteDeclsInLine(ln, ln, DECL_RE_JS(), maps, changes, where, p => p.includes('-') || !!PROP[p]);
    if (JSX_EXT.has(ext)) { out = rewriteStyleObject(out, maps, changes, where); out = rewriteTailwind(out, maps, changes, where); }
    return out;
  }).join('\n'), changes };
}

/* ---------------- 入口 ---------------- */
const args = process.argv.slice(2);
if (args.includes('--hook')) {
  try { hook(); } catch (e) { /* 見張りの失敗で作業を止めない */ }
} else {
  const opts = { withJs: args.includes('--with-js'), all: args.includes('--all'), json: args.includes('--json'), fix: args.includes('--fix'), dry: args.includes('--dry-run') };
  const targets = args.filter(a => !a.startsWith('--'));
  if (!targets.length) { console.log('使い方: node design-check.mjs <ファイルかフォルダ ...> [--with-js] [--all] [--json]'); process.exit(0); }
  const files = [];
  targets.forEach(t => { const explicit = fs.existsSync(t) && fs.statSync(t).isFile(); walk(path.resolve(t), { ...opts, explicit }, files); });
  const sink = newSink();
  let scanned = 0;
  files.forEach(f => { const text = fs.readFileSync(f, 'utf8'); if (!isGenerated(text)) collectVarUses(text); });   /* 先に変数の使われ方を集める */
  files.forEach(f => { const text = fs.readFileSync(f, 'utf8'); if (isGenerated(text)) return; scanned++; scanFile(f, text, sink, null); });
  const res = sink.result();
  const pairs = similarColors(res.colors), rare = rareNearValues(res.uses), clusters = nearClusters(res.uses);
  if (opts.fix) {
    /* 自動で寄せる。書き換える前に、戻し用の目印（git のタグ）を作っておくこと（ヒデさんの指示：今の状態に戻れることは必須） */
    const maps = buildFixMaps(res, pairs, rare, clusters);
    /* --prefer fontSize:11=12 … 寄せる先をヒデさんの判断で決める時（例：読みやすさを優先して大きい方へ） */
    args.filter(a => a.startsWith('--prefer=')).forEach(a => a.slice(9).split(',').forEach(x => {
      const m = x.match(/^(\w+):(-?\d*\.?\d+)=(-?\d*\.?\d+)$/);
      if (m) { (maps.num[m[1]] ||= new Map()).set(parseFloat(m[2]), parseFloat(m[3])); }
    }));
    const all = [];
    files.forEach(f => {
      const text = fs.readFileSync(f, 'utf8');
      if (isGenerated(text)) return;
      const r = fixText(f, text, maps);
      if (r.changes.length && r.text !== text) { if (!opts.dry) fs.writeFileSync(f, r.text); all.push(...r.changes); }
    });
    const lines = [`## 自動で寄せた値（${all.length} か所${opts.dry ? '・試しに数えただけで書き換えていない' : ''}）`, '', '| 箇所 | プロパティ | 前 | 後 |', '|---|---|---|---|'];
    all.forEach(c => lines.push(`| ${rel(c.file)}:${c.line} | ${c.prop || ''} | \`${String(c.from).replace(/\|/g, '\\|')}\` | \`${String(c.to).replace(/\|/g, '\\|')}\` |`));
    if (maps.notes.length) lines.push('', '文字の寄せる先をずらした所：', ...maps.notes.map(n => '- ' + n));
    const after = newSink();
    files.forEach(f => { const text = fs.readFileSync(f, 'utf8'); if (!isGenerated(text)) scanFile(f, text, after, null); });
    const ar = after.result(), ap = similarColors(ar.colors);
    const propose = ar.bad.filter(b => howTo(b.cat, b.v, target(b.v, RULE[b.cat].ok, ar.uses[b.cat])) === '提案');
    lines.push('', `残り：決まりから外れた値 ${ar.bad.length} 件（うち提案 ${propose.length} 件）・似た色 ${ap.length} 組（うち自動 ${ap.filter(p => p.how === '自動').length} 組）`);
    console.log(lines.join('\n'));
  } else {
    if (opts.json) {
      console.log(JSON.stringify({ files: scanned, bad: res.bad, tips: res.tips, similarColors: pairs, nearClusters: clusters, rare }, null, 2));
    } else {
      console.log(report(res, scanned, { pairs, rare, clusters, summary: true }));
    }
    /* process.exit() は使わない：出力を次のコマンドへ渡している時に、長い結果の終わりが切れるため（2026-09-27） */
    process.exitCode = res.bad.length ? 1 : 0;
  }
}

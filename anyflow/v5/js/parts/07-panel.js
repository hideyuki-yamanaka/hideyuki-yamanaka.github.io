/* ===== 【2026-09-18 ヒデさん依頼】キービジュアルのバリエーション（案） =====
   normal=ノーマル(Figma 17707:26544。文字はネイティブデータ、グラフィックは画像トレース) / strong=強調(2026-09-17 調整版)。
   1案＝コピーのサイズ/位置/書体(kv)＋右グラフィックの拡大・移動(kvGfx)＋惑星(planet)＋カゴ(mesh)の束。
   ★ピン留め・⋯(この設定で上書き/解除/削除)は varRowX 共通(値は params.gfxVarOverride.kvVar / gfxFav / gfxVariantHidden)。 */
const KV_VARIANTS = [
  { key: 'normal', name: 'ノーマル', tip: 'Figma 17707:26544。コピー 50px/90px(ExtraBold/Bold)・罫線を上に置いた2行のサブ・小さめのグラフィック。',
    /* 値の出どころ: コピー＝Figma ネイティブ(x136/y232、本文50px・140%・ExtraBold、最終行90px・120%・Bold、罫線40px、サブ20px・160%・Medium、
       本文→罫線 40px(実装は行箱248なので42で合わせる)、罫線→サブ 21px(罫線1px込みで20))。
       グラフィック＝コンプ画像(2倍スクショ 1508×1258 を 774×646 に配置)を画素で測り、球の中心(1009,426.5)・直径227、カゴ(線)の範囲 557×549 に
       自動で寄せた実測値(2026-09-18: 球は完全一致、カゴは 543×566 で平均一致・縦横比は回転位相の差)。 */
    data: { kv: { mainSize: 50, jumpSize: 90, eyebrowSize: 20, copyX: 86, copyY: 24, copyGap: 42, eyebrowDash: true, eyebrowDashW: 40, dashGap: 20,
                  mainWeight: 800, mainLh: 1.4, lastWeight: 700, lastLh: 1.2, eyebrowWeight: 500, eyebrowLh: 1.6, eyebrowLayout: 'col' },
            kvGfx: { scale: 1, dx: 31.9, dy: 15 }, planet: { scale: 1.004, dx: 31, dy: 45, flat: 1 },
            mesh: { cageR: 2.22, size: 0.52, nodes: 32, cageFreq: 2, cageTilt: -11, cageSpin: 0.4, lineAlpha: 0.25, lineWidth: 1.5 } } },
  { key: 'strong', name: '強調', tip: '2026-09-17 の調整版(Figma 17435:22386)。コピー 70px/120px・大きいグラフィック(1.21倍)。',
    data: { kv: { mainSize: 70, jumpSize: 120, eyebrowSize: 20, copyX: 0, copyY: 0, copyGap: 32, eyebrowDash: true, eyebrowDashW: 14, dashGap: 10,
                  mainWeight: 800, mainLh: 1.4, lastWeight: 700, lastLh: 1.2, eyebrowWeight: 500, eyebrowLh: 0, eyebrowLayout: 'row' },
            kvGfx: { scale: 1.21, dx: 148, dy: 184 }, planet: { scale: 1.3, dx: 31, dy: 45, flat: 1 },
            mesh: { cageR: 2.7, size: 0.52, nodes: 32, cageFreq: 2, cageTilt: -11, cageSpin: 0.4, lineAlpha: 0.25, lineWidth: 1.5 } } },
];
const KV_VAR_KV_KEYS = ['mainSize', 'jumpSize', 'eyebrowSize', 'copyX', 'copyY', 'copyGap', 'eyebrowDash', 'eyebrowDashW', 'dashGap', 'mainWeight', 'mainLh', 'lastWeight', 'lastLh', 'eyebrowWeight', 'eyebrowLh', 'eyebrowLayout'];
const KV_VAR_MESH_KEYS = ['cageR', 'size', 'nodes', 'cageFreq', 'cageTilt', 'cageRoll', 'cageYaw', 'cageSpin', 'lineAlpha', 'lineWidth', 'spread', 'msx', 'msy', 'msz', 'mpinch', 'meshShape'];   /* msx/msy/msz/mpinch/meshShape=【2026-09-21】メッシュの形状(横長/縦長/ひし形) */
/* 【2026-09-21 ヒデさん依頼】KVメッシュの形状(基本のメッシュ)。ビジョンと同じ5案(VIS_MESH_SHAPES を流用) */
/* 【2026-09-20 ヒデさん依頼・#7】KV要素の「位置移動(dx/dy)・パディング」も案別に独立させる(強調でずらした位置がノーマルに効かないように)。
   文字(fs/fw/lh/ls)は含めない=別系統(editsMb/共通)。対象要素は sec:'kv' の全て。 */
const KV_VAR_EDIT_ELS = ['navLogo', 'navLinks', 'navCta', 'kvMain', 'kvMainLast', 'kvEyebrow', 'kvLogos'];
const KV_VAR_EDIT_PROPS = ['dx', 'dy', 'pt', 'pr', 'pb', 'pl'];
function kvVarEditsSnapshot() { const r = {}; if (!params.edits) return r; KV_VAR_EDIT_ELS.forEach(k => { const e = params.edits[k]; if (!e) return; const o = {}; KV_VAR_EDIT_PROPS.forEach(p => { if (e[p] != null) o[p] = e[p]; }); if (Object.keys(o).length) r[k] = o; }); return r; }
function kvClearEdits() { if (!params.edits) return; KV_VAR_EDIT_ELS.forEach(k => { const e = params.edits[k]; if (e) KV_VAR_EDIT_PROPS.forEach(p => { delete e[p]; }); }); }
function kvAssignEdits(ed) { if (!ed) return; if (!params.edits) params.edits = {}; for (const k in ed) { if (!params.edits[k]) params.edits[k] = {}; Object.assign(params.edits[k], ed[k]); } }
function kvVarKey() { const v = String((params && params.kvVar) || 'normal'); if (KV_VARIANTS.some(x => x.key === v) && !variantRemovedKey('kvVar', v)) return v; const f = KV_VARIANTS.find(x => !variantRemovedKey('kvVar', x.key)); return (f || KV_VARIANTS[0]).key; }
function kvVarSnapshot() { const pick = (o, ks) => { const r = {}; ks.forEach(k => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; }; return { kv: pick(params.kv, KV_VAR_KV_KEYS), kvGfx: Object.assign({}, params.kvGfx), planet: Object.assign({}, params.planet), mesh: pick(params.conv && params.conv.mesh, KV_VAR_MESH_KEYS), edits: kvVarEditsSnapshot() }; }
function kvVarAssign(sn) { if (!sn) return; if (sn.kv) Object.assign(params.kv, sn.kv); if (sn.kvGfx) params.kvGfx = Object.assign(params.kvGfx || {}, sn.kvGfx); if (sn.planet) Object.assign(params.planet, sn.planet); if (sn.mesh && params.conv && params.conv.mesh) Object.assign(params.conv.mesh, sn.mesh); if (sn.edits) kvAssignEdits(sn.edits); }
function kvVarRefresh() { try { document.documentElement.classList.toggle('kv-strong', kvVarKey() === 'strong'); } catch (e) {}   /* 【2026-09-20 ヒデさん依頼】強調案の時だけビジョン以下を下げる(PCのみ)。CSS: html.kv-strong:not(.mb) #vision */ try { applyKvCopy(); } catch (e) {} try { textTools.applyAll(); } catch (e) {} try { renderFrame(); } catch (e) {} try { if (editHandles.on) editHandles.place(); } catch (e) {} }
/* 案の値(＋⋯で上書き保存した控え)を params へ流し込む。quiet=起動時(未保存扱いにしない) */
function applyKvVariant(key, quiet) {
  const v = KV_VARIANTS.find(x => x.key === key) || KV_VARIANTS[0];
  kvClearEdits();   /* 【2026-09-20 #7】案の位置移動は案別。切替時にいったん0へ戻し、下の控え(ov.edits)で案ごとの位置を入れ直す */
  kvVarAssign(structuredClone(v.data));
  const ov = ((params.gfxVarOverride || {}).kvVar || {})[v.key];
  if (ov) kvVarAssign(structuredClone(ov));
  kvVarRefresh();
  if (!quiet) { try { markDirty(); } catch (e) {} }
}
/* 【2026-09-21 ヒデさん依頼・Y14】ビジョンのメッセージ(データをつなぐ〜)の「フォント行」で変えた
   見た目(サイズ fs / 行間 lh / 字間 ls)を、案(デフォルト/強調)ごとに独立させるためのヘルパー。
   太さ fw・位置 dx/dy は両案で共通なので巻き込まない(ここには入れない)。
   なぜ必要か: これまで大きさは params.edits.visMsg(＝全案で共有の1つの入れ物)に入っていたため、
   デフォルトで大きさを変えると強調にも移っていた(＝連動)。案ごとに控え(gfxVarOverride.visEmph)へ
   grab して切替時に put で入れ替える。 */
const VIS_MSG_ED_KEYS = ['fs', 'lh', 'ls'];
function visEmphGrabMsg(store) { if (!store || !store.visMsg) return null; const o = {}; VIS_MSG_ED_KEYS.forEach(k => { if (store.visMsg[k] != null) o[k] = store.visMsg[k]; }); return Object.keys(o).length ? o : null; }
function visEmphPutMsg(store, src) { if (!store) return; const t = store.visMsg || (store.visMsg = {}); VIS_MSG_ED_KEYS.forEach(k => { delete t[k]; }); if (src) VIS_MSG_ED_KEYS.forEach(k => { if (src[k] != null) t[k] = src[k]; }); }
const VAR_SNAP = {
  kvVar:   { get: () => kvVarSnapshot(), set: sn => { kvVarAssign(sn); kvVarRefresh(); }, reset: () => applyKvVariant(kvVarKey()) },
  results: { get: () => ({ results: params.sections.results, valSaas: params.patterns.valSaas, valAi: params.patterns.valAi }),
             set: s => { if (s.results) Object.assign(params.sections.results, s.results); if (s.valSaas) params.patterns.valSaas = s.valSaas; if (s.valAi) params.patterns.valAi = s.valAi; },
             reset: () => varResetResults() },
  picto:   { get: () => ({ results: params.sections.results }), set: s => { if (s.results) Object.assign(params.sections.results, s.results); },
             reset: () => varResetResults() },
  conv:    { get: () => params.conv, set: s => Object.assign(params.conv, s), reset: () => Object.assign(params.conv, structuredClone(DEFAULTS_PRISTINE.conv)) },
  planet:  { get: () => params.planet, set: s => Object.assign(params.planet, s), reset: () => Object.assign(params.planet, structuredClone(DEFAULTS_PRISTINE.planet)) },
  vision:  { get: () => params.sections.vision, set: s => Object.assign(params.sections.vision, s), reset: () => Object.assign(params.sections.vision, structuredClone(DEFAULTS_PRISTINE.sections.vision)) },
  /* 【2026-09-19】揺らぎのグラデは「グラデに関わるキーだけ」を控える(dome や余白を巻き込まない) */
  visGrad: { get: () => { const v = params.sections.vision, o = {}; ['gradVar', 'gradSat', 'gradBri', 'gradDur', 'gradAng'].forEach(k => { if (v[k] != null) o[k] = v[k]; }); return o; },
             set: s => Object.assign(params.sections.vision, s), reset: () => { visApplyGrad(visGradKey()); applyVisGrad(); } },
  /* 【2026-09-21 ヒデさん依頼】ビジョンの案(デフォルト/強調=emph)ごとに、メッセージ/ポイントの文字サイズを独立させる。
     dome(メッシュ)や grad は別バケット管理なので巻き込まない=サイズ系だけ控える。 */
  visEmph: { get: () => { const v = params.sections.vision, o = {}; ['msgSize', 'pHSize', 'pPSize', 'pWidth'].forEach(k => { if (v[k] != null) o[k] = v[k]; });
               /* 【2026-09-21 Y14】メッセージのフォント行(サイズ/行間/字間)も案ごとに控える。PC=edits / スマホ=editsMb を別々に。 */
               o.__vm = visEmphGrabMsg(params.edits); o.__vmMb = visEmphGrabMsg(params.editsMb); return o; },
             set: s => { if (!s) return; ['msgSize', 'pHSize', 'pPSize', 'pWidth'].forEach(k => { if (s[k] != null) params.sections.vision[k] = s[k]; });
               if ('__vm' in s) visEmphPutMsg(params.edits || (params.edits = {}), s.__vm);
               if ('__vmMb' in s) visEmphPutMsg(params.editsMb || (params.editsMb = {}), s.__vmMb);
               applyVpSize(); try { textTools.applyAll(); } catch (e) {} try { if (typeof syncPanelRows === 'function') syncPanelRows(); } catch (e) {} }, reset: () => {} },
  cv:      { get: () => params.cv, set: s => Object.assign(params.cv, s), reset: () => Object.assign(params.cv, structuredClone(DEFAULTS_PRISTINE.cv)) },
  /* 【2026-09-15】揺らぎの案は「動きに関わるキーだけ」を控える(余白や色の設定を巻き込まない) */
  cvSway:  { get: () => { const o = {}; SWAY_KEYS.forEach(k => { if (params.cv[k] != null) o[k] = params.cv[k]; }); return o; },
             set: s => Object.assign(params.cv, s), reset: () => cvApplySway(cvSwayKey()) },
  /* 【2026-09-19】ビジョンのメッシュの案(描き方に関わるキーだけ。大きさ・フェード・ロゴは巻き込まない) */
  resSlotFx: { get: () => { const r = params.sections.results, o = {}; RES_SLOT_KEYS.forEach(k => { if (r[k] != null) o[k] = r[k]; }); return o; },
               set: s => { Object.assign(params.sections.results, s); applyResSlotFade(); }, reset: () => resApplySlotFx(resSlotFxKey()) },
  visLogo: { get: () => { const c = vfCfg(), o = {}; VF_LOGO_KEYS.forEach(k => { if (c[k] != null) o[k] = c[k]; }); return o; },
             set: s => { const v = params.sections.vision; if (!v.dome) v.dome = {}; Object.assign(v.dome, s); applyVfFade(); }, reset: () => vfApplyLogoVariant(vfLogoKey()) },
  visMesh: { get: () => { const c = vfCfg(), o = {}; VF_VAR_KEYS.forEach(k => { if (c[k] != null) o[k] = c[k]; }); return o; },
             set: s => { const v = params.sections.vision; if (!v.dome) v.dome = {}; Object.assign(v.dome, s); vfMesh = null; applyVfFade(); }, reset: () => vfApplyVariant(vfVarKey()) },
  dev:     { get: () => params.sections.dev, set: s => Object.assign(params.sections.dev, s), reset: () => Object.assign(params.sections.dev, structuredClone(DEFAULTS_PRISTINE.sections.dev)) },
};

/* ===== 【2026-09-19 ヒデさん依頼・最重要】バリエーションの上書きが「選び直す/リロードで戻る」バグの根治 =====
   仕組み: 案ごとの上書き控え params.gfxVarOverride[bucket][key] を『常にいまの見た目』に保つ。
   ・つまみを触る → markDirty の自動保存で、選択中の案の控えを更新(varAutoCapture)
   ・案を切り替える → 離れる案の控えも即更新(varRowX の choose 内)/選んだ案は控えを重ねる(既存)
   ・起動時 → 選択中の案の控えを適用(varApplyOverridesAtStartup)
   これで『触った値=案の値』になり、選び直しても・リロードしても戻らない。
   snap は必ず『その案が持つキーだけ』の狭いものにすること(広いと別の設定を巻き込む)。 */
const VAR_AUTOSAVE = [
  { bucket: 'visMesh',   sel: () => vfVarKey(),     snap: () => VAR_SNAP.visMesh,   base: (key) => { const m = (VIS_MESHES.find(x => x.key === key) || VIS_MESHES[0]); const g = Object.assign({}, VF_DEF, m.cfg || {}), o = {}; VF_VAR_KEYS.forEach(k => { if (g[k] != null) o[k] = g[k]; }); return o; } },
  { bucket: 'visLogo',   sel: () => vfLogoKey(),    snap: () => VAR_SNAP.visLogo,   base: (key) => { const m = (VIS_LOGOS.find(x => x.key === key) || VIS_LOGOS[0]); const o = {}; VF_LOGO_KEYS.forEach(k => { if (m.cfg[k] != null) o[k] = m.cfg[k]; }); return o; } },
  { bucket: 'visGrad',   sel: () => visGradKey(),   snap: () => VAR_SNAP.visGrad,   base: (key) => { const g = (VIS_GRADS.find(x => x.key === key) || VIS_GRADS[0]); const m = Object.assign({ gradVar: key, gradSat: 1, gradBri: 1, gradDur: 7, gradAng: 67 }, g.v || {}), o = {}; ['gradVar', 'gradSat', 'gradBri', 'gradDur', 'gradAng'].forEach(k => { if (m[k] != null) o[k] = m[k]; }); return o; } },
  /* 【2026-09-21 ヒデさん依頼】ビジョンの案(デフォルト/強調)ごとにメッセージ/ポイントの文字サイズを独立(案別に控える) */
  { bucket: 'visEmph',   sel: () => visEmphMode(),  snap: () => VAR_SNAP.visEmph,   base: () => { const d = DEFAULTS_PRISTINE.sections.vision, o = {}; ['msgSize', 'pHSize', 'pPSize', 'pWidth'].forEach(k => { if (d[k] != null) o[k] = d[k]; }); o.__vm = null; o.__vmMb = null; return o; } },
  { bucket: 'resSlotFx', sel: () => resSlotFxKey(), snap: () => VAR_SNAP.resSlotFx, base: (key) => { const m = (RES_SLOT_FX.find(x => x.key === key) || RES_SLOT_FX[0]); const o = {}; RES_SLOT_KEYS.forEach(k => { if (m.cfg[k] != null) o[k] = m.cfg[k]; }); return o; } },
  { bucket: 'cvSway',    sel: () => cvSwayKey(),    snap: () => VAR_SNAP.cvSway,    base: (key) => { const c = (CV_SWAYS.find(x => x.key === key) || CV_SWAYS[0]); const g = Object.assign({}, SWAY_BASE, c.cv || {}), o = {}; SWAY_KEYS.forEach(k => { if (g[k] != null) o[k] = g[k]; }); return o; } },
  /* 【2026-09-20 ヒデさん報告バグ修正】KV案(kvVar)が管理する 惑星/カゴ(mesh)/KVコピー(kv)/右グラフィック(kvGfx) は
     起動時の applyKvVariant で案の焼き込み値が再適用されるため、上書き控えを常に最新にしておかないと『デフォルトにしても戻る』。
     ここに入れることで、保存のたびに gfxVarOverride.kvVar[案] = いまの値 になり、起動時にそれが勝つ。 */
  { bucket: 'kvVar',     sel: () => kvVarKey(),     snap: () => VAR_SNAP.kvVar,     base: (key) => { const pick = (o, ks) => { const r = {}; ks.forEach(k => { if (o && o[k] !== undefined) r[k] = o[k]; }); return r; }; const d = ((KV_VARIANTS.find(x => x.key === key) || KV_VARIANTS[0]).data) || {}; return { kv: pick(d.kv, KV_VAR_KV_KEYS), kvGfx: Object.assign({}, d.kvGfx), planet: Object.assign({}, d.planet), mesh: pick(d.mesh, KV_VAR_MESH_KEYS), edits: {} }; } },
];
function varAutoInfo(bucket) { return VAR_AUTOSAVE.find(b => b.bucket === bucket) || null; }
/* いまの見た目を、選択中の案の控えへ書き込む(自動保存のたびに)
   skipStore=true のときは localStorage 書き込み(重い presetStoreSave)を省いて【メモリ内の控えだけ】即時更新する。
   → つまみを触った瞬間に控えが最新になるので、0.8秒の自動保存を待たずに案を選び直しても・再描画されても戻らない。 */
function varAutoCapture(skipStore) {
  if (!params) return; if (!params.gfxVarOverride) params.gfxVarOverride = {};
  for (const b of VAR_AUTOSAVE) { try { const snap = b.snap(); if (!snap) continue; const key = String(b.sel()); if (!params.gfxVarOverride[b.bucket]) params.gfxVarOverride[b.bucket] = {}; params.gfxVarOverride[b.bucket][key] = JSON.parse(JSON.stringify(snap.get())); } catch (e) {} }
  if (!skipStore) { try { presetStoreSave(); } catch (e) {} }
}
/* 起動時: 選択中の案の控えを画面へ適用(リロードで戻らないように) */
function varApplyOverridesAtStartup() {
  for (const b of VAR_AUTOSAVE) { try { const snap = b.snap(); if (!snap) continue; const key = String(b.sel()); const ov = ((params.gfxVarOverride || {})[b.bucket] || {})[key]; if (ov) snap.set(JSON.parse(JSON.stringify(ov))); } catch (e) {} }
}
/* 実績の調整を「コード既定」へ(既定に無い後付けの鍵(fx21 など案ごとの値)は消す＝コード側の初期値に戻る) */
function varResetResults() { const r = params.sections.results, d = structuredClone(DEFAULTS_PRISTINE.sections.results); for (const k in r) { if (!(k in d)) delete r[k]; } Object.assign(r, d); }
function varRowX(bucket, items, getSel, setSel, o) {
  o = o || {};
  const box = document.createElement('div'); box.className = 'var-box'; box.dataset.bucket = bucket;
  /* 【2026-09-16 ヒデさん依頼】ピン留めした案は、通常の案に紛れないよう【上部に見出し付きの別セクション】で出す(全バリエーション共通) */
  const favHead = document.createElement('div'); favHead.className = 'var-favhead'; favHead.textContent = '★ ピン留め'; favHead.hidden = true;
  const favRow = document.createElement('div'); favRow.className = 'sw-row sw-favrow'; favRow.hidden = true;
  const row = document.createElement('div'); row.className = 'sw-row';
  box.append(favHead, favRow, row); (mount || body).appendChild(box);
  const K = v => String(v);
  const hidden = () => { if (!params.gfxVariantHidden) params.gfxVariantHidden = {}; return params.gfxVariantHidden[bucket] || (params.gfxVariantHidden[bucket] = []); };
  const favs = () => { if (!Array.isArray(params.gfxFav)) params.gfxFav = []; return params.gfxFav; };
  const isFav = it => favs().some(f => f.m === bucket && K(f.name) === K(it.key));
  const ovOf = it => ((params.gfxVarOverride || {})[bucket] || {})[K(it.key)];
  const autoInfo = (typeof varAutoInfo === 'function') ? varAutoInfo(bucket) : null;   /* 【2026-09-19】この案は自動控え対象か */
  /* 「上書き済み」と見なすのは、控えが素の案の値と実際に違う時だけ(自動控えで素の値が入っただけの時は隠す) */
  const ovCustom = it => { const ov = ovOf(it); if (!ov) return false; if (!autoInfo) return true; try { return JSON.stringify(ov) !== JSON.stringify(autoInfo.base(K(it.key))); } catch (e) { return true; } };
  const gone = it => hidden().includes(K(it.key)) || variantRemovedKey(bucket, K(it.key));
  const plainName = it => String(it.name).replace(/^(\d+(?:-\d+)?|[A-Za-z]{1,2}\d{0,2})\s+/, '');
  const choose = it => {
    /* 【2026-09-19】自動控え対象は、いま離れる案の見た目を控えへ即保存してから切り替える(選び直しで戻らない) */
    if (autoInfo && o.snap) { try { const cur = K(getSel()); if (!params.gfxVarOverride) params.gfxVarOverride = {}; if (!params.gfxVarOverride[bucket]) params.gfxVarOverride[bucket] = {}; params.gfxVarOverride[bucket][cur] = JSON.parse(JSON.stringify(o.snap.get())); } catch (e) {} }
    setSel(it.key);
    const ov = ovOf(it);
    if (ov && o.snap) { try { o.snap.set(JSON.parse(JSON.stringify(ov))); } catch (e) {} }   /* 上書き済みの案は、その控えを重ねる */
    markDirty(); renderFrame();
    if (o.after) o.after(it);
    if (typeof syncPanelRows === 'function') syncPanelRows();
    fill();
  };
  const menuFor = (x, it, label) => ev => {
    ev.stopPropagation();
    const old = document.querySelector('.pmenu'); if (old) old.remove();
    const menu = document.createElement('div'); menu.className = 'pmenu';
    const close = () => menu.remove();
    const mk = (lbl, fn, cls) => { const m = document.createElement('button'); m.type = 'button'; m.textContent = lbl; if (cls) m.className = cls; m.onclick = () => { close(); fn(); }; menu.appendChild(m); };
    const fav = isFav(it);
    mk(fav ? '★ ピン留めを解除（元の位置に戻す）' : '★ お気に入りにピン留め（おすすめ）', () => {
      if (fav) params.gfxFav = favs().filter(f => !(f.m === bucket && K(f.name) === K(it.key)));
      else favs().push({ m: bucket, name: K(it.key) });
      presetStoreSave(); markDirty(); fill();
    });
    if (o.snap) {
      mk('⤓ いまの設定で上書き', () => {
        if (!params.gfxVarOverride) params.gfxVarOverride = {};
        if (!params.gfxVarOverride[bucket]) params.gfxVarOverride[bucket] = {};
        params.gfxVarOverride[bucket][K(it.key)] = JSON.parse(JSON.stringify(o.snap.get()));
        presetStoreSave(); markDirty(); fill();
      });
      if (ovCustom(it)) mk('↺ 上書きを解除（元の設定に戻す）', () => {
        delete params.gfxVarOverride[bucket][K(it.key)];
        if (o.snap.reset && K(getSel()) === K(it.key)) { try { o.snap.reset(); } catch (e) {} }   /* 選択中なら画面もその場で元へ */
        presetStoreSave(); markDirty(); renderFrame(); if (o.after) o.after(it); if (typeof syncPanelRows === 'function') syncPanelRows(); fill();
      });
    }
    mk('🗑 削除', () => {
      /* 【V5.0 2026-09-16 ヒデさん依頼】セクション自体は消せない=最後の1案は削除不可(消せるのは各案のみ) */
      const _aliveNow = items.filter(q => !gone(q));
      if (_aliveNow.length <= 1) { askModal('削除できません', 'このまとまりの最後の1案です。セクション自体は消せません（消せるのは各案のみ）。', 'OK', () => {}); return; }
      askModal('削除しますか？', `「${label}」を一覧から消します。以降の番号は自動で詰めます。あとで「消した案を戻す」で戻せます。`, '削除する', () => {
        hidden().push(K(it.key));
        params.gfxFav = favs().filter(f => !(f.m === bucket && K(f.name) === K(it.key)));
        if (K(getSel()) === K(it.key)) { const alive = items.find(q => !gone(q)); if (alive) choose(alive); }
        presetStoreSave(); markDirty(); renderFrame(); fill();
      });
    }, 'danger');
    document.body.appendChild(menu);
    const r = x.getBoundingClientRect();
    menu.style.left = Math.min(r.left, innerWidth - menu.offsetWidth - 8) + 'px';
    menu.style.top = Math.min(r.bottom + 4, innerHeight - menu.offsetHeight - 8) + 'px';
    setTimeout(() => document.addEventListener('click', close, { once: true }), 0);
  };
  const pill = (it, label, no, target) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.key = K(it.key); b.dataset.no = no || '';
    b.className = 'var-pill' + (K(getSel()) === K(it.key) ? ' on' : '') + (isFav(it) ? ' fav' : '');
    b.title = plainName(it) + (it.tip ? ' — ' + it.tip : '') + `（ID ${it.key}）` + (ovCustom(it) ? '（⤓ 上書き済み・⋯から解除できます）' : '');
    b.append(document.createTextNode(label));
    b.onclick = () => choose(it);
    { /* 【2026-09-18 ヒデさん指定】現行(fixed)の案にも ⋯ を出して削除できるようにする(最後の1案だけは削除不可) */ const x = document.createElement('button'); x.type = 'button'; x.className = 'var-x'; x.textContent = '⋯'; x.title = 'ピン留め / この設定で上書き / 削除'; x.onclick = menuFor(x, it, label); b.appendChild(x); }
    (target || row).appendChild(b);
  };
  const fill = () => {
    row.innerHTML = ''; favRow.innerHTML = '';
    const alive = items.filter(it => !gone(it)), view = [];
    /* 【2026-09-18 ヒデさん指定】案が1つしか残っていない欄は選ぶ意味が無いので欄ごと隠し、その1案を既定にする(0なら隠すだけ) */
    box.hidden = alive.length <= 1;
    if (alive.length === 1 && K(getSel()) !== K(alive[0].key)) { try { const it1 = alive[0]; setSel(it1.key); markDirty(); setTimeout(() => { try { if (o.after) o.after(it1); renderFrame(); } catch (e) {} }, 0); } catch (e) {} }
    const pinned = favs().filter(f => f.m === bucket).map(f => alive.find(it => K(it.key) === K(f.name))).filter(Boolean);
    /* ピン留めは上部の別セクション(favRow)へ。番号(★1..)や VAR_VIEW の順は従来どおり(固定→ピン→その他) */
    favHead.hidden = favRow.hidden = pinned.length === 0;
    alive.filter(it => it.fixed).forEach(it => { pill(it, plainName(it), '', row); view.push({ key: K(it.key), no: plainName(it) }); });
    pinned.forEach((it, i) => { const no = '★' + (i + 1); pill(it, no + ' ' + plainName(it), no, favRow); view.push({ key: K(it.key), no }); });
    let n = 0;
    alive.forEach(it => { if (it.fixed || pinned.includes(it)) return; n++; pill(it, n + ' ' + plainName(it), String(n), row); view.push({ key: K(it.key), no: String(n) }); });
    VAR_VIEW[bucket] = view;
    const restorable = hidden().filter(kk => !variantRemovedKey(bucket, kk) && items.some(it => K(it.key) === kk));
    if (restorable.length) {
      const back = document.createElement('button'); back.type = 'button'; back.className = 'var-pill var-back';
      back.textContent = `↺ 消した案を戻す (${restorable.length})`;
      back.onclick = () => pickModal('消した案を戻す', '戻したい案の「戻す」を押してください。まとめて全部は戻しません。',
        restorable.map(kk => plainName(items.find(it => K(it.key) === kk))),
        nm => { const it = items.find(q => plainName(q) === nm); const i2 = it ? hidden().indexOf(K(it.key)) : -1; if (i2 >= 0) hidden().splice(i2, 1); presetStoreSave(); markDirty(); fill(); });
      row.appendChild(back);
    }
    if (o.reset) row.appendChild(mkReset(o.reset.get, v => { o.reset.set(v); fill(); }, null, false));
    if (o.onFill) o.onFill();
  };
  fill();
  if (rows) rows.push({ _sync: fill });
  if (o.reset && subItems) subItems.push({ reset: () => { const d = defaultOf(o.reset.get); if (d != null) { o.reset.set(d); fill(); } } });
  return fill;
}
/* 実績の案の表示番号(ID → いまの番号)。見えていなければ null / ID◯ */
function rfxNo(key, strict) { const v = (VAR_VIEW.resFx || []).find(x => x.key === String(key)); return v ? v.no : (strict ? null : 'ID' + key); }
function rfxNos(keys) { const a = keys.map(k => rfxNo(k, true)).filter(Boolean); return a.length ? a.join('・') : 'ID' + keys.join('/'); }
const RFX_TITLES = [];   /* [要素, 文言を作る関数] 実績の案別グループの小見出し(番号が変わったら書き直す) */
/* 【2026-09-16】お問い合わせのデザイン案を「一体型」で確定し、案を選ぶ項目を削除したので、
   「案によってまとまりを出し分ける」仕掛け(CV_DYN / CV_DYN10 / syncCvDyn)も不要になった。 */
function subT(cat, fn) { sub(cat, fn(), true, { fixed: true }); const el = cat.lastElementChild && cat.lastElementChild.querySelector('.grp-title span'); if (el) RFX_TITLES.push([el, fn]); }
function syncRfxTitles() { RFX_TITLES.forEach(([el, fn]) => { el.textContent = fn(); }); }
function resFxRow(opts) {
  return varRowX('resFx', opts.map(([name, key, tip]) => ({ key, name, tip, fixed: key === 'default' })), () => resFxKey(), key => { params.patterns.resFx = key; },
    { snap: VAR_SNAP.results, after: () => { fit(); renderFrame(); syncRfxDyn(); }, onFill: () => syncRfxTitles() });
}

/* 【2026-09-14 ヒデさん指定】案ごとの調整は「その案を選んだ時だけ」出す(動的表示)。パネルを組み立てる時に登録し、案の切替で同期 */
const RFX_DYN = [];
function rfxDyn(el, keys) { if (el) RFX_DYN.push({ el, keys }); }
function syncRfxDyn() { const k = resFxKey(); RFX_DYN.forEach(d => { d.el.style.display = d.keys.includes(k) ? '' : 'none'; }); }



/* ===== Figma のプロパティパネル風「数値パネル」(2026-08-27 ヒデさん指定) =====
   直接編集で選んだオブジェクトの X / Y / W / H / 角度 を数値で表示し、直接入力もできる。
   ドラッグ中はリアルタイムで数値が追いつく。スライダー(プログレスバー)は使わない。 */
function buildNumPanel(host) {
  const wrap = document.createElement('div');
  host.appendChild(wrap);
  const NAMES = { outer: ['外の輪', '#FF5D97'], inner: ['内の輪', '#0EBBFF'], planet: ['惑星', '#111'] };
  let fields = {};

  function mkField(label, unit, get, set, step) {
    const f = document.createElement('div');
    f.className = 'np-f';
    const l = document.createElement('label');
    l.textContent = label;
    const i = document.createElement('input');
    i.type = 'number';
    i.step = step || 1;
    i.value = get();
    const u = document.createElement('span');
    u.className = 'np-u';
    u.textContent = unit || '';
    /* 入力したら即反映。↑↓キーでも動く */
    const apply = () => {
      const v = parseFloat(i.value);
      if (!isFinite(v)) return;
      set(v);
      markDirty();
      renderFrame();
      if (editHandles.on) editHandles.place();
    };
    i.addEventListener('input', apply);
    i.addEventListener('change', () => { apply(); if (typeof editHistory !== 'undefined') { editHistory.push(); editBar.sync(); } });
    f.append(l, i, u);
    return { el: f, input: i, get };
  }

  /* 選んだ対象に合わせて中身を作り直す */
  function render(key) {
    wrap.innerHTML = '';
    fields = {};
    if (!editHandles.on) return;
    if (!key) {
      const e = document.createElement('div');
      e.className = 'np-empty';
      e.textContent = '右のグラフィックで「外の輪 / 内の輪 / 惑星」をクリックすると、ここに数値が出ます。';
      wrap.appendChild(e);
      return;
    }
    const [name, color] = NAMES[key] || [key, '#888'];
    const head = document.createElement('div');
    head.className = 'np-head';
    const dot = document.createElement('span');
    dot.className = 'np-dot';
    dot.style.background = color;
    head.append(dot, document.createTextNode(name));
    wrap.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'np';
    wrap.appendChild(grid);

    if (key === 'planet') {
      const P = params.planet;
      fields.x = mkField('X', 'px', () => Math.round(P.dx), v => P.dx = Math.round(v));
      fields.y = mkField('Y', 'px', () => Math.round(P.dy), v => P.dy = Math.round(v));
      /* 【2026-08-27 ヒデさん指定】惑星も縦横比を保たないので、W と H を別々に出す */
      fields.w = mkField('W', 'px', () => Math.round(convPlanetR() * 2),
        v => P.scale = clamp01x(v / 2 / 130, 0.2, 3));
      fields.h = mkField('H', 'px', () => Math.round(convPlanetRY() * 2),
        v => P.flat = clamp01x(v / 2 / Math.max(1, 130 * P.scale), 0.05, 3));
      grid.append(fields.x.el, fields.y.el, fields.w.el, fields.h.el);
    } else {
      const O = params.orbits[key], b = orbitBase(key);
      fields.x = mkField('X', 'px', () => Math.round(O.dx), v => O.dx = Math.round(v));
      fields.y = mkField('Y', 'px', () => Math.round(O.dy), v => O.dy = Math.round(v));
      /* W/H は実寸(px)で出す。中で scale / flat に直す = Figma と同じ感覚で触れる */
      fields.w = mkField('W', 'px', () => Math.round(orbitGeom(key).rx * 2),
        v => O.scale = clamp01x(v / 2 / b.rx, 0.2, 2.5));
      fields.h = mkField('H', 'px', () => Math.round(orbitGeom(key).ry * 2),
        v => O.flat = clamp01x(v / 2 / (b.ry * O.scale), 0.05, 3));
      fields.r = mkField('角度', '°', () => +(b.rot + O.angle).toFixed(1),
        v => O.angle = +(v - b.rot).toFixed(1), 0.5);
      grid.append(fields.x.el, fields.y.el, fields.w.el, fields.h.el, fields.r.el);
      /* 【2026-08-28 ヒデさん指定】この軌道を手動で 前/裏 に。自動ボタンで両方裏になった時などの個別調整 */
      const fbRow = document.createElement('div');
      fbRow.className = 'np-fb';
      const fbLab = document.createElement('span'); fbLab.className = 'np-fb-lab'; fbLab.textContent = '前後';
      const bFront = document.createElement('button'); bFront.type = 'button'; bFront.textContent = '前に出す'; bFront.className = 'np-fb-b';
      const bBack = document.createElement('button'); bBack.type = 'button'; bBack.textContent = '裏に回す'; bBack.className = 'np-fb-b';
      const syncFB = () => { bFront.classList.toggle('on', !O.behind); bBack.classList.toggle('on', !!O.behind); };
      const setFB = back => {
        O.behind = back; markDirty(); renderFrame(); syncFB();
        if (typeof editBar !== 'undefined' && editBar.sync) editBar.sync();
        if (typeof editHistory !== 'undefined') { editHistory.push(); editBar.sync(); }
      };
      bFront.onclick = () => setFB(false);
      bBack.onclick = () => setFB(true);
      syncFB();
      fbRow.append(fbLab, bFront, bBack);
      wrap.appendChild(fbRow);
    }
  }
  function clamp01x(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  /* ドラッグ中: 入力欄に触っていない時だけ数値を追いつかせる */
  function sync() {
    for (const k in fields) {
      const f = fields[k];
      if (document.activeElement === f.input) continue;
      f.input.value = f.get();
    }
  }
  editHandles.bind(render, sync);
  render(editHandles.selected);
}

/* ページの流れと同じ順番で並べる:
   全体 → キービジュアル → ビジョン → 実績 → 開発者体験 → 導入事例 */

function buildPanel() {
  const keepScroll = body.scrollTop;   // 作り直しでスクロール位置が飛ばないように退避
  body.innerHTML = '';
  rows.length = 0;
  hiddenListRefresh();   /* 【2026-09-15】焼き込み済みの案を「消した案」の控えから外す(完全削除リストの最新化) */
  /* 【2026-09-15 ヒデさん指定】大カテゴリのタブ列。先頭に置き、カテゴリを全部組み立てた後(末尾)で中身を埋める */
  const panTabs = document.createElement('div'); panTabs.className = 'pan-tabs'; body.appendChild(panTabs);
  liveEdit = false;                    // 既定は「頭から流し直す」。見た目だけの所で true にする
  const sv = () => params.sections;

  /* セクションの長さ。スクロール駆動の時は倍率、時間で再生の時は画面何個ぶんか。
     ⚠️ 中の値（driveLen / lenVh）は別物なので、モードごとに触る先を切り替える */
  /* ⚠️【2026-08-19 ヒデさん指摘】「もっと右へ動かしたいのに端で止まる」問題。
     原因は slider() の自動上限調整（既定を中央に置くために上限を縮める）で、
     スクロール駆動は 1〜12 と書いていたのに実際は 5 まで、
     時間再生は 110〜800 と書いていたのに実際は 190vh までしか動かせなかった。
     ここは書いた上限をそのまま使う（fixedMax）。 */
  const sectionLenSlider = (key, maxVh) => {
    if (params.drive === 'scroll') {
      rows.push(slider('表示時間', 1, 12, 0.25,
        () => sv()[key].driveLen, v => { sv()[key].driveLen = v; fit(); },
        v => '×' + v.toFixed(2),
        '見終わるのに必要なスクロール量。大きいほどゆっくり、じっくり見せます。',
        { fixedMax: true, mbKey: 'sections.' + key + '.driveLen' }));
    } else {
      rows.push(slider('表示時間', 110, maxVh, 10,
        () => sv()[key].lenVh, v => { sv()[key].lenVh = v; fit(); },
        v => (v / 100).toFixed(1) + '画面',
        'モーションが終わってから次へ抜けるまでの長さ。大きいほど余韻が残ります。',
        { fixedMax: true, mbKey: 'sections.' + key + '.lenVh' }));
    }
  };

  /* ========== 🌊 全体 ========== */
  const catAll = category('全体（サイト全体のモーション）', false);

  /* 【2026-09-17 大掃除】「文字の太さ(一括±)」は削除。太さは各タブの「文字」か ✏️編集 で個別に。 */

  /* 【2026-08-30 ヒデさん指定・パネル整理】「モーションの進み方(時間/スクロール駆動)」と
     「スクロールの固定(固定/固定追従なし)」の項目は削除。
     自動再生(時間)×固定追従なしで確定し、値もコード側で固定している。 */

  sub(catAll, '慣性スクロール', null, { fixed: true, grp: 'fxtex' });   /* スクロールの効き＝エフェクト扱い(ヒデさん指定) */
  /* ⚠️【2026-08-28 ヒデさん指定】ここは「値が小さいほど慣性が強い」逆向きの作りで、
     右へ動かすほど弱くなっていた。表示も「強め/中/弱め」の言葉だけで向きが読めなかった。
     内部の値はそのまま(13 から引く)で、つまみだけ【右＝強い】に直し、数字を出す。 */
  rows.push(slider('慣性の強さ', 1, 12, 0.5,
    () => 13 - params.sections.common.smooth,
    v => sv().common.smooth = Math.min(12, Math.max(1, 13 - v)),   /* ⚠️ 範囲が広がってもマイナスにしない */
    v => '×' + v.toFixed(1),
    '右へ動かすほど、指を離しても長く流れ続けます。左でピタッと止まります。'));

  /* 【2026-09-21 ヒデさん依頼】背景グリッド(方眼)テクスチャ。オン/オフ＋オンの時だけ細かさ等のつまみを出す(動的) */
  sub(catAll, 'グリッド（背景の方眼）', null, { fixed: true, grp: 'fxtex' });
  segRow('グリッド', [['オン', 1], ['オフ', 0]],
    () => (params.grid && params.grid.on ? 1 : 0),
    v => { if (!params.grid) params.grid = {}; params.grid.on = !!v; applyGrid(); markDirty(); buildPanel(); });
  if (params.grid && params.grid.on) {
    rows.push(slider('細かさ（マスの大きさ）', 8, 120, 1, () => (params.grid.cell != null ? params.grid.cell : 40),
      v => { params.grid.cell = v; applyGrid(); markDirty(); }, v => Math.round(v) + 'px',
      '方眼1マスの大きさ。小さいほど細かい方眼になります。'));
    rows.push(slider('線の太さ', 0.5, 4, 0.5, () => (params.grid.w != null ? params.grid.w : 1),
      v => { params.grid.w = v; applyGrid(); markDirty(); }, v => v.toFixed(1) + 'px', '方眼の線の太さ。'));
    rows.push(slider('線の濃さ', 0.05, 1, 0.05, () => (params.grid.op != null ? params.grid.op : 0.45),
      v => { params.grid.op = v; applyGrid(); markDirty(); }, v => Math.round(v * 100) + '%', '方眼の線の濃さ(透明度)。うすいほど背景になじみます。'));
  }

  /* くり返しは慣性とは別の話なので独立させる(ヒデさん指定 2026-08-27) */
  sub(catAll, 'くり返し再生', null, { fixed: true, grp: 'anim' });   /* 再生＝アニメーション扱い(ヒデさん指定) */
  segRow('くり返し', [['する', 1], ['しない', 0]], () => params.replay ? 1 : 0, v => { params.replay = !!v; markDirty(); });
  note('一度見たセクションも、戻ってくるともう一度流れます。');

  /* 【2026-09-19 ヒデさん依頼】見出し部品(英字ラベル＋見出し)の共通つまみ。4か所(Our Vision/Use Case/Contact/Strength)を一括で */
  sub(catAll, 'セクション見出し（共通の部品）', null, { fixed: true });
  rows.push(slider('ラベル→見出しの間隔', 0, 30, 1, () => (params.secHeadGap != null ? params.secHeadGap : 6), v => { params.secHeadGap = v; applySecHeadGap(); markDirty(); }, v => Math.round(v) + 'px', 'Our Vision / Use Case / Contact / Strength 01・02 の英字ラベルと、その下の見出しの間。4か所いっしょに変わります(既定 6px は仮置き)。', { mbKey: 'secHeadGap', fixedMax: true }));

  /* 【2026-09-17 大掃除・ヒデさん指定】ヘッダー(案12 分離型・なめらか・1.65秒)/ハンバーガー(2本線・クロス)/浮くピルの質感(標準)/
     押した先の画面(左寄せ大) は【今の値で固定＝焼き込み】。選択UIは削除(DEFAULTS/SHIPPED/移行で値を固定)。 */

  /* ========== 🖼 キービジュアル ========== */
  /* 【2026-08-27 ヒデさん指定】既定は全部たたむ。キービジュアルだけ開いて「グラフィック」を見せる */
  /* (旧「フォントテスト」タブは 2026-09-17 の大掃除で撤去。⑪調整版を正として基本値へ焼き込み、
     代わりに各タブの「文字（太さ・行間・字間）」で全テキストを個別に変えられるようにした) */

  const catKv = category('キービジュアル（いちばん上の画面）', true);
  panelVarsec('kv', 'キービジュアル（案）');   /* 【2026-09-21 ヒデさん依頼】主役案をセクションに→配下に基本/フォント/エフェクト/アニメーション */

  /* 【2026-09-18 ヒデさん依頼】KVのバリエーション(ノーマル/強調)。★ピン留めは上の別セクション、⋯で「この設定で上書き」「解除」「削除」 */
  sub(catKv, 'バリエーション（案）', true, { fixed: true, bare: true });   /* 【2026-09-20 ヒデさん依頼】カテゴリ節「バリエーション」と重複する小見出しは出さず、案の選択だけ見せる */
  varRowX('kvVar', KV_VARIANTS, () => kvVarKey(), k => { params.kvVar = String(k); applyKvVariant(String(k)); },
    { snap: VAR_SNAP.kvVar, after: () => { if (typeof syncPanelRows === 'function') syncPanelRows(); if (typeof fillAnimBody === 'function') fillAnimBody(); } });
  note('ノーマル＝Figma 17707:26544（コピー50/90px・小さめのグラフィック）／強調＝9/17の調整版（70/120px・大きいグラフィック）。案を選んでから下のつまみ(コピー・惑星・メッシュ)や「文字」で調整し、⋯「この設定で上書き」でその案に保存できます。');
  note('⚠️【調整パネルの絶対ルール】値は①バリエーション別（案ごと）②PC/SP別 で独立します。強調でいじった位置・数値はノーマルに出ません。スマホモード中に変えた値はPCに出ず、その項目はブルーで印が付きます（案を作り直す時もこの2軸の独立を必ず残すこと）。');

  /* 【2026-09-20 ヒデさん依頼】KVの余白: ヘッダー↔コピー / グラフィック↔コピー の距離。PC/SP独立(mbKey)。既存の「位置 縦/横」は別に残す */
  liveEdit = true;
  sub(catKv, '余白（ヘッダー・グラフィックとのギャップ）');
  slider('ヘッダー↔コピーのギャップ', -160, 300, 2, () => (params.kv.hlOff || 0), v => { params.kv.hlOff = v; applyKvCopy(); markDirty(); },
    v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'コピー(見出し)をヘッダーから上下にずらします。0＝いまの位置。プラスで下へ。PC・スマホは別々に持てます(スマホモード中に変えるとスマホだけに効く)。', { signed: true, mbKey: 'kv.hlOff' });
  slider('グラフィック↔コピーのギャップ', -200, 200, 2, () => (params.kv.gfxY || 0), v => { params.kv.gfxY = v; try { applySway(); } catch (e) {} markDirty(); },
    v => (v > 0 ? '+' : '') + Math.round(v) + 'px', '右グラフィック(惑星)を上下にずらして、コピーとの間隔を変えます。0＝いまの位置。プラスで下へ、マイナスで上へ(離す)。PC・スマホは別々に持てます。', { signed: true, mbKey: 'kv.gfxY' });
  slider('ヘッダー↔コンテンツの距離（スマホ）', -200, 400, 4, () => (params.kv.spTop || 0), v => { params.kv.spTop = v; applyKvCopy(); markDirty(); },
    v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'スマホ版で、ヘッダーからKVコンテンツ全体(グラフィック＋コピー＋ロゴ帯)をまとめて下げる距離。0＝いまの位置。プラスで下へ。PCのレイアウトには影響しません。', { signed: true });

  /* ===== グラフィック (2026-08-26 ヒデさん指定・整理) =====
     右側のグラフィックの設定をここに集約する。いちばん上が「直接編集」。
     以下は全部この中の入れ子: 案を選ぶ / 出てくるタイミング / 惑星のアニメーション / 軌道 */
  liveEdit = true;
  subDefaultOpen = true;      /* ここから下(グラフィック)は既定で開く */
  sub(catKv, 'グラフィック');
  /* 【2026-09-19 ヒデさん依頼】右グラフィック(惑星＋カゴ)を XYZ で動かす。真ん中(0)＝いまの位置。Z は手前(+)/奥(−)＝大きく/小さく(PCのみ) */
  note('▼ 右グラフィック全体（惑星＋メッシュ）の位置。真ん中(0)＝いまの位置。傾き・向きは下の「メッシュ」の組');
  { const kg = () => (params.kvGfx || (params.kvGfx = { scale: 1.21, dx: 148, dy: 184 })); const ks = (label, key, min, max, step, fmt, tip) => slider(label, min, max, step, () => kg()[key] || 0, v => { kg()[key] = v; try { applySway(); } catch (e) {} markDirty(); }, fmt, tip, { signed: true, mbKey: 'kvGfx.' + key });
    const px = v => (v > 0 ? '+' : '') + Math.round(v) + 'px', pc = v => (v > 0 ? '+' : '') + Math.round(v) + '%';
    ks('位置 X', 'ox', -300, 300, 2, px, '右グラフィック(惑星＋メッシュ)を左右(X)に。0＝いまの位置。');
    ks('位置 Y', 'oy', -300, 300, 2, px, '右グラフィック(惑星＋メッシュ)を上下(Y)に。0＝いまの位置。');
    ks('位置 Z', 'oz', -60, 60, 1, pc, '奥行き(Z)。手前(+)で大きく、奥(−)で小さく。0＝いまの大きさ。'); }
  const gRoot = mount;
  /* 【2026-08-29 ヒデさん指定】右グラフィックの登場タイミングは「左側コピー>タイミング」だと
     見つけにくいので、ここ(グラフィック直下)にも同じスライダーを置く(同じ params.kv.graphicGap)。 */
  liveEdit = true;
  sub(catKv, 'グラフィック', false, { grp: 'anim' });   /* 【2026-09-20 大改修】出現アニメはアニメ節へ(基本の位置とは分ける) */
  slider('出るタイミング', -2, 2, 0.05, () => params.kv.graphicGap, v => params.kv.graphicGap = v,
    v => v.toFixed(2) + '秒', 'マイナスにすると早く（タイピング中に）出ます。0で小ラベルと同時。', { mbKey: 'kv.graphicGap', signed: true });
  note('※ 同じ設定は「左側コピー > タイミング」にもあります。');

  /* ═══ ① アニメーションを選ぶ ── いちばん上の考え方 (2026-08-27 ヒデさん指定) ═══
     ここで選んだ案が、以下すべての土台になる。
     ⚠️ グラフィックの形(軌道と惑星の位置・サイズ・傾き)も、プリセットも【案ごと】に分かれている。
        案を切り替えると、その案の形に入れ替わる(前の案の形は引き継がない)。 */
  liveEdit = true;
  /* 【2026-08-27 ヒデさん指定】見出しの番号も「アニメーションを選ぶ」の文言も出さず、
     選択ピルからいきなり始める */
  sub(gRoot, '', true, { fixed: true, bare: true });
  const aRoot = mount;
  let fillPresetRow = null;   /* ②のプリセット行を作り直す関数(案が変わったら中身を入れ替える) */
  /* 【2026-09-17 大掃除・ヒデさん指定】起動案(軌道と粒/ネットワーク)の切替ピル・カテゴリ絞り込みは削除。
     案は ネットワーク★1「D 大きいケージ」(converge=mesh) に固定＝焼き込み。 */

  /* 【2026-09-17 大掃除・ヒデさん指定】バリエーション(ネットワークC1〜C3 など)の選択UIは削除(★1 D 大きいケージ に固定)。 */
  /* ═══ グラフィックを編集 ── 直接編集とプリセット ═══
     【2026-08-27 ヒデさん指定】見出しは出さず、選択ピルのすぐ下にボタンを置く。
     ⚠️ 置き場所は aRoot(選択ピルと同じ箱)。gRoot に入れると、案ごとの調整より
        あとに回ってしまい「ピルの下」にならない */
  liveEdit = true;
  sub(aRoot, '', true, { fixed: true, bare: true });
  {
    /* 【2026-08-29 ヒデさん指定】パネル内の「グラフィックを編集する」ボタンは削除。
       グラフィック編集は調整パネル右上の ✏️編集 ボタンが担う(押すと editHandles＋siteEdit が入る)。
       ここには編集モード中に動的に出る数値パネル(X/Y/W/H/角度)と、行き先の案内だけ残す。 */
    const n2 = document.createElement('div');
    n2.className = 'grp-note';
    n2.textContent = '右上の ✏️編集 を押すと編集モード。メッシュ全体はドラッグで移動、惑星はクリック → 辺で幅・高さ、角で大きさ。文字は端をつかんで移動、中をクリックで太さ・行間・打ち替え。';
    (mount || body).appendChild(n2);
    buildNumPanel(mount || body);
  }

  /* 【2026-09-17 大掃除・ヒデさん指定】プリセット(＋保存/呼び出し)のUIは削除。 */
  liveEdit = false;

  liveEdit = false;
  const animBody = document.createElement('div');
  aRoot.appendChild(animBody);
  /* 【2026-08-27 リロード感の解消】説明文は要素を使い回して文字だけ差し替え、
     作り直すのは「この案の調整」の箱だけにする。共通の項目は一度きり作って触らない。
     こうすると案を押しても、見ていた場所が動かず、アニメだけがすぐ切り替わる。 */
  /* 【2026-08-27 ヒデさん指定】案の説明は常時出さない(縦が伸びるため)。
     文面は選択ピルにマウスを乗せた時の吹き出しで読める */
  const animModeBox = document.createElement('div');
  animBody.appendChild(animModeBox);
  /* 【2026-08-29 ヒデさん指定】案ごとに「効く項目だけ」出す仕組み。グループ要素と表示条件を控え、
     案切替(fillAnimBody)のたびに表示/非表示を同期する。使わない案では丸ごと隠す。 */
  const dynGroups = [];   /* {el, vis:()=>bool} */
  const effectApplies = () => (params.converge && params.converge !== 'off') && !(params.conv && params.conv.net3d);
  /* 【2026-08-29 ヒデさん指定】汎用の「軌道(輪)」「ドット(粒)」調整が“描画に効く”案かどうか。
     render 側(convFrame)の hideAll と同じ判定: ネットワーク3D(固定再現)・網でつながる(mesh)・
     粒が並ぶ(beads)・粒の渦(accre で軌道を出していない)は、輪もドットも自動で隠れるので調整は無効。 */
  const orbitsUsed = () => {
    if (params.conv && params.conv.net3d) return false;
    const cv = params.converge;
    const accreShows = cv === 'accre' && !!(params.conv && params.conv.accre && params.conv.accre.showOrbit);
    const hideAll = (cv === 'accre' && !accreShows) || cv === 'mesh' || cv === 'beads';
    return !hideAll;
  };
  const addDynGroup = (vis) => { if (mount && mount.parentElement) { const el = mount.parentElement; dynGroups.push({ el, vis }); el.style.display = vis() ? '' : 'none'; } };
  {
    const CONV_DESC = {
      off:    '軌道をただ回り続けます。集約の動きはしません。',
      reel:   '内側の輪がドットごと惑星へ縮んで吸い込まれ、外側の輪が内側へ下りてきて、空いた外側に新しい輪が現れる…をくり返します。',
      spiral: '粒がしばらく軌道の上を回ったあと、渦を描きながら内側へ落ちて惑星に吸い込まれます。吸われた粒はまた軌道に生まれ直します。',
      accre:  '軌道の代わりに、たくさんの細かい粒が惑星のまわりで渦を巻きます（土星の輪のような円盤）。粒は回りながら少しずつ内側へ落ちて取り込まれます。輪とドットは自動で隠れます。',
      mesh:   '軌道の代わりに、ゆらぎ漂うノードの網ができます。データがノードからノードへ渡り歩いて惑星へ届きます。輪とドットは自動で隠れます。',
      beads:  '軌道の線を消して、点だけを密に並べて輪の形を作ります。並んだ点のうち一部が順に惑星へ吸い込まれます（輪の形は崩れません）。',
      duplex: '惑星とドットを線で結び、その線の上を粒が行き来します。青＝軌道から惑星へ、ピンク＝惑星から軌道へ。惑星に入った粒は消えます。',
      gyro:   '2本の輪が独楽(ジャイロスコープ)のように立体的に転がります。輪を真横から見る瞬間があり、周期的に惑星へ引き寄せられて集約します。ドットは輪に乗ったまま一緒に転がります。',
    };
    window.__convDesc = CONV_DESC;
  }
  function fillAnimBody() {
    const keepScroll = body.scrollTop;      /* 見ていた位置を保つ */
    const keepMount = mount, keepLive = liveEdit, keepOpen = subDefaultOpen;
    subDefaultOpen = true;                  /* 案を切り替えても、中の小見出しは開いたまま */
    animModeBox.innerHTML = '';
    mount = animModeBox;
    liveEdit = true;                        /* ここのつまみは触っても頭出ししない */

    const pctF = v => Math.round(v * 100) + '%';
    const cvMode = params.converge || 'reel';
    /* 【2026-08-27 ヒデさん指定】「ドットの周回」と「スピン」は同じ話なので1つのまとまりに置く。
       案ごとに中身が変わるので、ここで案別に足していく */
    /* 【2026-08-29 ヒデさん指定・フォーマット統一】どの案でも「揺らぎ」「軌道の回転」を
       ON/OFF トグルで揃える。既定は 揺らぎON・回転OFF。速さ等の細かい調整はトグルONの時だけ出す。
       (以前は off 群だけこの「動き」セクションが無く、B/C/D 等は回転が焼き込みでいじれなかった) */
    /* 【2026-09-19 ヒデさん指定】「動き（揺らぎ）」の節(揺らぎ する/しない・揺らぎの動き/強さ・軌道の回転・転がり・回り方・粒の連動・ドットの周回・3D網の細目・横揺れ・軌道のサイズ・軌道の線の太さ)は削除。
       値は削除時点の保存値のまま固定(揺らぎ しない=sway1・揺らぎの強さ0 / 軌道の回転 しない / ドットの周回 する / 軌道のサイズ×1.00 / 線 4.1px)。戻したい時は git 履歴(2026-09-19 以前)の fillAnimBody を参照 */
    if (cvMode === 'reel') {
      const R = params.conv.reel;
      sub(animModeBox, 'この案の調整（輪が縮んで吸収）', true);
      slider('周期', 2, 10, 0.1, () => params.conv.reel.T, v => R.T = v, v => v.toFixed(1) + '秒',
        '1循環の長さ。「吸収→もう1本が移動→空いた位置に新しい輪」のくり返し。', { mbKey: 'conv.reel.T' });
      slider('収縮を始める', 0.05, 0.6, 0.01, () => params.conv.reel.shrinkAt, v => R.shrinkAt = v, pctF,
        'ここまでは全周サイズでドットが回る。', { mbKey: 'conv.reel.shrinkAt' });
      slider('吸収し終わる', 0.4, 0.9, 0.01, () => params.conv.reel.endAt, v => R.endAt = v, pctF,
        'ここで吸収が完了し、もう1本が移動を始める。', { mbKey: 'conv.reel.endAt' });
      /* 【2026-08-30 ヒデさん指定・統一】「移り変わりの回転」「移る長さ」はここから削除。
         『動き(この案)』の「入れ替わりの回転(する/しない)+入れ替わりの速さ(秒)」に一本化した。 */
      slider('新しい輪が出る', 0.04, 0.3, 0.01, () => params.conv.reel.inDur, v => R.inDur = v, pctF,
        '空いた位置に新しい輪がフェードインする時間。', { mbKey: 'conv.reel.inDur' });
      slider('どこまで縮むか', 0.5, 1, 0.01, () => params.conv.reel.depth, v => R.depth = v, pctF, '100%で惑星の中心まで縮む。', { mbKey: 'conv.reel.depth' });
      slider('中間の輪の数', 0, 12, 1, () => params.conv.reel.blend, v => R.blend = v, v => v + '本',
        '外の輪と内の輪の間を、この本数だけ埋めます（イラレのブレンドのイメージ）。0で無し。'
        + '軌道をそのまま複製したくっきりした線で出ます。', { mbKey: 'conv.reel.blend', fixedMax: true });
      /* 【2026-08-30 ヒデさん指定】「粒（吸い込み）」は収縮だけでなく A(軌道)全案の共通オプションへ移動(下の共通ブロック)。 */
      /* 【2026-08-28 ヒデさん指定】「中間の輪の濃さ」は削除。薄くせず、くっきり出すため。 */
      /* 【2026-08-27 ヒデさん指定】ここにあった機能は全削除:
           ・消え方の3択(前面カット / 圧縮グロー / データ粒)とその説明
           ・圧縮グロー専用のつまみ(光り方5種・光の強さ・線の太さ)
           ・データ粒専用のつまみ(線の太さ・点の密度・つながり始め/きる・点が回る速さ・ゆらぎ)
           ・「透過し始め」「透過率(残す濃さ)」
         消え方は【前面カット】固定になった(エンジン側の他の道筋は残してあるが選べない)。 */
    } else if (cvMode === 'spiral') {
      const S = params.conv.spiral;
      sub(animModeBox, 'この案の調整（粒が渦で吸収）', true);
      slider('粒の数', 1, 200, 1, () => params.conv.spiral.count, v => S.count = v, v => v + '個', null, { mbKey: 'conv.spiral.count', fixedMax: true });
      slider('軌道にいる秒数', 0.2, 12, 0.1, () => params.conv.spiral.stay, v => S.stay = v, v => v.toFixed(1) + '秒',
        '粒はまず軌道上を回り、このくらい経ってから吸い込まれ始める。', { mbKey: 'conv.spiral.stay', fixedMax: true });
      slider('吸い込みの秒数', 0.5, 16, 0.1, () => params.conv.spiral.life, v => S.life = v, v => v.toFixed(1) + '秒',
        '軌道から離れて惑星に届くまでの秒数。', { mbKey: 'conv.spiral.life', fixedMax: true });
      slider('回転の速さ', 0.1, 5, 0.05, () => params.conv.spiral.speed, v => S.speed = v, v => '×' + v.toFixed(2), null, { mbKey: 'conv.spiral.speed', fixedMax: true });
      slider('粒の大きさ', 0.2, 3, 0.05, () => params.conv.spiral.size, v => S.size = v, v => '×' + v.toFixed(2),
        '粒1つの大きさ。大きくすると「コメット」のような大きめの粒になります。', { mbKey: 'conv.spiral.size', fixedMax: true });
    } else if (cvMode === 'accre') {
      const AC = params.conv.accre;
      sub(animModeBox, 'この案の調整（粒の渦）', true);
      segRow('軌道を出す', [['出す', 1], ['消す', 0]], () => params.conv.accre.showOrbit ? 1 : 0,
        v => { AC.showOrbit = !!v; markDirty(); renderFrame(); });
      note('この案は既定では軌道を消しています。「出す」にすると輪とドットも一緒に見せられます（共通の表示スイッチに従います）。');
      slider('粒の数', 5, 2000, 5, () => params.conv.accre.count, v => AC.count = v, v => v + '個',
        '密度そのもの。多いほど渦が濃くなります。', { mbKey: 'conv.accre.count', fixedMax: true });
      slider('粒の大きさ', 0.05, 3, 0.01, () => params.conv.accre.size, v => AC.size = v, v => '×' + v.toFixed(2),
        'この案の粒だけの大きさ（共通の「ドットの大きさ」に掛かります）。', { mbKey: 'conv.accre.size', fixedMax: true });
      slider('粒の揺らぎ', 0, 3, 0.05, () => params.conv.accre.wobble, v => AC.wobble = v, v => v.toFixed(2),
        '回りながら外側・内側へゆらゆら揺れます。0でぴたっと回ります。', { mbKey: 'conv.accre.wobble', fixedMax: true });
      slider('落ちる速さ', 0.05, 6, 0.05, () => params.conv.accre.fall, v => AC.fall = v, v => '×' + v.toFixed(2),
        '内へ落ちていく速さ。', { mbKey: 'conv.accre.fall', fixedMax: true });
      slider('回る速さ', 0.05, 6, 0.05, () => params.conv.accre.speed, v => AC.speed = v, v => '×' + v.toFixed(2), null, { mbKey: 'conv.accre.speed', fixedMax: true });
      slider('円盤の大きさ', 0.3, 3, 0.01, () => params.conv.accre.scale, v => AC.scale = v, v => '×' + v.toFixed(2), null, { mbKey: 'conv.accre.scale', fixedMax: true });
      slider('きらめき', 0, 1, 0.02, () => params.conv.accre.twinkle, v => AC.twinkle = v, v => v.toFixed(2),
        '粒の明滅の強さ。0で一定の明るさ。', { mbKey: 'conv.accre.twinkle', fixedMax: true });
    } else if (cvMode === 'mesh') {
      const M = params.conv.mesh;
      /* 【2026-09-20 大改修・ヒデさん依頼】惑星はメッシュと別パラメータ→別見出し「惑星」に分離。旧「メッシュ（網）の形」→「メッシュ（網）」。カゴ→メッシュに命名統一・見出しにモノ名があるので子は短縮。 */
      sub(animModeBox, '惑星', true);
      slider('大きさ', 0.2, 3, 0.02, () => params.planet.scale, v => { params.planet.scale = v; if (editHandles.on) editHandles.place(); },
        v => Math.round(v * 100) + '%', '惑星の大きさ。100%が基準。右上の ✏️編集 で惑星の角をつまんでも変えられます。', { mbKey: 'planet.scale' });
      sub(animModeBox, 'メッシュ', true);
      /* 【2026-09-17 大掃除・ヒデさん指定】「頂点は自動配置」ボタンと案内は削除(ケージは立体並びで手置き不可のため常に空振りだった) */
      slider('ノードの数', 3, 60, 1, () => params.conv.mesh.nodes,
        v => { M.nodes = v; if (M.pts && M.pts.length !== Math.round(v)) M.pts = null; },
        v => v + '個', '「散らばり（フィボナッチ）」の時の点の数。「整った網（測地線）」では下の「面の数」で決まります。', { mbKey: 'conv.mesh.nodes', fixedMax: true });
      slider('ノードの大きさ', 0.1, 3, 0.02, () => params.conv.mesh.size, v => M.size = v, v => '×' + v.toFixed(2),
        'この案のノードだけの大きさ（全体の「ドットの大きさ」に掛かります）。', { mbKey: 'conv.mesh.size', fixedMax: true });
      /* 惑星の大きさは上の「惑星」見出しへ移動(2026-09-20 大改修) */
      /* 【2026-08-27 ヒデさん指定】包囲ケージ専用のつまみ */
      if ((M.style || 'organic') === 'cage') {
        slider('大きさ', 1.05, 4, 0.05, () => params.conv.mesh.cageR, v => M.cageR = v, v => '×' + v.toFixed(2),
          '惑星の半径の何倍でメッシュを組むか。大きいほど大きく取り囲みます。', { mbKey: 'conv.mesh.cageR' });
        /* 【2026-09-25 ヒデさん依頼】メッシュの形状バリエーション(丸み/横長/ひし形/縦長)＋横/縦のふくらみ＋尖りのつまみは削除。
           現状(焼き込み済みの msx/msy/mpinch)を既定として固定。形状はいじらせず、面の数(下)だけ残す。 */
        slider('回る速さ', 0, 3, 0.05, () => params.conv.mesh.cageSpin, v => M.cageSpin = v,
          v => '×' + v.toFixed(2), '右へ動かすほどメッシュが速く回ります。0(左端)で止まります。', { mbKey: 'conv.mesh.cageSpin' });
        slider('傾き（前後）', -60, 60, 1, () => params.conv.mesh.cageTilt, v => M.cageTilt = v, v => v + '°',
          'メッシュの軸を手前/奥へ倒す。0で真横から見た形になります。', { mbKey: 'conv.mesh.cageTilt' });
        /* 【2026-09-19 ヒデさん依頼】傾きを3軸に(前後・左右・向き) */
        slider('傾き（左右）', -60, 60, 1, () => (params.conv.mesh.cageRoll || 0), v => M.cageRoll = v, v => (v > 0 ? '+' : '') + v + '°',
          'メッシュの軸を左右に倒す(画面の面内で回す)。0＝いまの向き。', { mbKey: 'conv.mesh.cageRoll', signed: true });
        slider('向き（回転の位置）', -180, 180, 1, () => (params.conv.mesh.cageYaw || 0), v => M.cageYaw = v, v => (v > 0 ? '+' : '') + v + '°',
          '縦軸まわりの向きをずらす。回っている時は「どこから回り始めるか」、止めている時は「どの面を見せるか」。', { mbKey: 'conv.mesh.cageYaw', signed: true });
        /* 【2026-09-18 ヒデさん依頼「メッシュの面の数などを変えられるように」】カゴの形(整った網/散らばり)を選べるようにし、
           整った網は「面の数」を段階スライダーに(旧: 粗い/ふつう/細かい の3択)。表示は実際の点・線の数。 */
        optRow('cageShape', '形', [['整った網（点が飛び飛び）', 'geo'], ['散らばり（1個ずつ）', 'fibo']],   /* 【2026-09-25】散らばりは三角網になり面の数を1個ずつ調整できる */
          () => (M.cageShape || 'fibo'), v => { M.cageShape = v; markDirty(); renderFrame(); fillAnimBody(); });
        if (M.cageShape === 'geo') {
          /* 【2026-09-02 ヒデさん指定】整った網(測地線)は面の細かさで密度を決める */
          slider('面の数（網の細かさ）', 1, 4, 1, () => (M.cageFreq == null ? 2 : M.cageFreq),
            v => { M.cageFreq = Math.round(v); renderFrame(); },
            v => { try { const g = buildGeodesic(Math.round(v)); return `段階${Math.round(v)}（点${g.verts.length}・線${g.edges.length}）`; } catch (e) { return String(Math.round(v)); } },
            '惑星を覆う網(測地線球)の細かさ。1=20面 / 2=80面 / 3=320面 / 4=1280面。4は点が600を超えるので少し重くなります。', { fixedMax: true, mbKey: 'conv.mesh.cageFreq' });
        } else {
          /* 【2026-09-25 ヒデさん依頼・面の数を1個ずつ】散らばり＝三角網。点の数を1個ずつ(旧「1点から出る骨」は三角網では不要になったので置き換え) */
          slider('面の数（点の数・1個ずつ）', 12, 300, 1, () => (M.cageFiboN == null ? 42 : M.cageFiboN),
            v => { M.cageFiboN = Math.round(v); renderFrame(); },
            v => { const k = Math.round(v); return '点' + k + '・線' + (3 * k - 6); },
            '散らばり(三角網)の点の数。1個ずつ増減できます。42＝整った網の面の数2と同じ点・線の数、92＝面の数3相当。多いほど細かく丸く。', { fixedMax: true, mbKey: 'conv.mesh.cageFiboN' });
        }
      }
      slider('全体の広がり', 0.4, 2, 0.02, () => params.conv.mesh.spread == null ? 1 : params.conv.mesh.spread, v => M.spread = v,
        v => '×' + v.toFixed(2), '網ぜんたいの広がり。大きいほどノードが外へ広がって大きな網になります。', { mbKey: 'conv.mesh.spread', fixedMax: true });
      slider('線の濃さ', 0, 1, 0.01, () => params.conv.mesh.lineAlpha, v => M.lineAlpha = v, v => v.toFixed(2), null, { mbKey: 'conv.mesh.lineAlpha', fixedMax: true });
      slider('線の太さ', 0.3, 6, 0.1, () => params.conv.mesh.lineWidth, v => M.lineWidth = v, v => v.toFixed(1) + 'px', null, { mbKey: 'conv.mesh.lineWidth', fixedMax: true });
      slider('つながる範囲', 0.05, 1.2, 0.01, () => params.conv.mesh.span, v => M.span = v, v => v.toFixed(2),
        '大きいほど線が増えて網が濃くなります。', { mbKey: 'conv.mesh.span', fixedMax: true });
      slider('ランダムさ', 0, 2.5, 0.05, () => params.conv.mesh.random, v => M.random = v, v => '×' + v.toFixed(2),
        'ノードがどれだけ大きく漂うか。0でぴたっと止まります。', { mbKey: 'conv.mesh.random', fixedMax: true });
      slider('漂う速さ', 0, 3, 0.05, () => params.conv.mesh.drift, v => M.drift = v, v => '×' + v.toFixed(2), null, { mbKey: 'conv.mesh.drift', fixedMax: true });
      slider('1ホップの時間', 0.05, 2, 0.05, () => params.conv.mesh.hop, v => M.hop = v, v => v.toFixed(2) + '秒', null, { mbKey: 'conv.mesh.hop', fixedMax: true });
      slider('パケットの頻度', 0.1, 8, 0.1, () => params.conv.mesh.rate, v => M.rate = v, v => v.toFixed(1) + '個/秒', null, { mbKey: 'conv.mesh.rate', fixedMax: true });
    } else if (cvMode === 'beads') {
      const B = params.conv.beads;
      sub(animModeBox, 'この案の調整（点が並ぶ軌道）', true);
      /* 【2026-08-28 ヒデさん指定】楕円の端で点が詰まって見える問題への対処 */
      segRow('並べ方', [['見た目そろえ', 1], ['等角(従来)', 0]],
        () => (params.conv.beads.even === false) ? 0 : 1,
        v => { B.even = !!v; markDirty(); renderFrame(); });
      note('「見た目そろえ」＝弧の長さで等分するので、輪の端でも点が詰まって見えません。「等角」＝角度で等分する昔の並べ方。');
      slider('ドットの密度', 6, 1200, 2, () => params.conv.beads.count, v => B.count = v, v => v + '個',
        '多いほど点が詰まって軌道の線に見えます。', { mbKey: 'conv.beads.count', fixedMax: true });
      slider('同時に吸われる割合', 0.02, 1, 0.01, () => params.conv.beads.ratio, v => B.ratio = v, pctF,
        '小さいほど輪の形が保たれ、大きいほど一斉に吸い込まれます。', { mbKey: 'conv.beads.ratio', fixedMax: true });
      slider('吸収にかかる秒数', 0.5, 12, 0.1, () => params.conv.beads.life, v => B.life = v, v => v.toFixed(1) + '秒', null, { mbKey: 'conv.beads.life', fixedMax: true });
      slider('回る速さ', 0.02, 2, 0.02, () => params.conv.beads.speed, v => B.speed = v, v => '×' + v.toFixed(2), null, { mbKey: 'conv.beads.speed', fixedMax: true });
      slider('並びの乱れ', 0, 3, 0.05, () => params.conv.beads.jitter, v => B.jitter = v, v => v.toFixed(2),
        '0できっちり等間隔。上げるほど並びがばらつきます。', { mbKey: 'conv.beads.jitter', fixedMax: true });
      slider('戻ってくる時間', 0.1, 5, 0.1, () => params.conv.beads.backIn, v => B.backIn = v, v => v.toFixed(1) + '秒',
        '吸い込まれた点が、空いた場所にゆっくり現れるまでの時間。', { mbKey: 'conv.beads.backIn', fixedMax: true });
    } else if (cvMode === 'gyro') {
      const G = params.conv.gyro;
      sub(animModeBox, 'この案の調整（ジャイロ回転）', true);
      slider('転がる速さ', 0, 3, 0.05, () => params.conv.gyro.tumble, v => G.tumble = v,
        v => '×' + v.toFixed(2), '右へ動かすほど輪が速く転がります。0(左端)で止まります。', { mbKey: 'conv.gyro.tumble' });
      slider('面が回る速さ', 0, 3, 0.05, () => params.conv.gyro.spin, v => G.spin = v,
        v => '×' + v.toFixed(2), '右へ動かすほど輪の向きが速く回ります。外と内は逆回りです。', { mbKey: 'conv.gyro.spin' });
      slider('2本のずれ', 0, 180, 5, () => params.conv.gyro.phase, v => G.phase = v, v => v + '°',
        '外と内の転がりをどれだけずらすか。90°で直交して、いちばんジャイロらしくなります。', { mbKey: 'conv.gyro.phase' });
      /* ⚠️ 値が大きいほど【厚く】なるのに名前が「薄さ」で、向きが逆に読めた(2026-08-28) */
      slider('真横の厚み', 0.01, 0.5, 0.01, () => params.conv.gyro.thin, v => G.thin = v, v => v.toFixed(2),
        '真横から見た瞬間の厚み。左へ動かすほど線に近くなり、右へ動かすほど厚みが残ります。', { mbKey: 'conv.gyro.thin' });
      slider('吸い寄せの強さ', 0, 0.8, 0.02, () => params.conv.gyro.pull, v => G.pull = v, v => Math.round(v * 100) + '%',
        '周期的に輪が惑星へ引き寄せられる量。0で引き寄せません。', { mbKey: 'conv.gyro.pull' });
      slider('吸い寄せの周期', 1, 14, 0.2, () => params.conv.gyro.pullT, v => G.pullT = v, v => v.toFixed(1) + '秒',
        '引き寄せをくり返す間隔。', { mbKey: 'conv.gyro.pullT' });
    } else if (CONV_LINKED.includes(cvMode)) {
      const L = params.conv.link;
      sub(animModeBox, 'この案の調整（線で行き来）', true);
      note('惑星のエリアに入った粒は完全に消えます。手前で縮みながら薄くなるので、吸い込まれるように見えます。');
      slider('吸い込まれる範囲', 0, 1.2, 0.02, () => params.conv.link.vanishK, v => L.vanishK = v, v => '×' + v.toFixed(2),
        '惑星の縁のどれくらい手前から縮み始めるか。0でエリアに触れた瞬間に消えます。', { mbKey: 'conv.link.vanishK', fixedMax: true });
      slider('流れる速さ', 0.1, 4, 0.05, () => params.conv.link.speed, v => L.speed = v, v => '×' + v.toFixed(2), null, { mbKey: 'conv.link.speed', fixedMax: true });
      slider('1周の秒数', 0.5, 10, 0.1, () => params.conv.link.T, v => L.T = v, v => v.toFixed(1) + '秒', null, { mbKey: 'conv.link.T', fixedMax: true });
      slider('粒の密度', 0.3, 6, 0.1, () => params.conv.link.density, v => L.density = v, v => '×' + v.toFixed(1),
        '1本の線に流す粒の数。', { mbKey: 'conv.link.density', fixedMax: true });
      slider('線の反り', 0, 1, 0.01, () => params.conv.link.curve, v => L.curve = v, v => v.toFixed(2),
        '0で直線、大きいほど弧を描きます。', { mbKey: 'conv.link.curve', fixedMax: true });
      slider('線の濃さ', 0, 0.6, 0.01, () => params.conv.link.lineAlpha, v => L.lineAlpha = v, v => v.toFixed(2), null, { mbKey: 'conv.link.lineAlpha' });
      slider('線の太さ', 0.2, 4, 0.1, () => params.conv.link.lineWidth, v => L.lineWidth = v, v => v.toFixed(1) + 'px',
        '惑星とドットを結ぶ線の太さ。', { mbKey: 'conv.link.lineWidth' });
    }

    /* 【2026-08-30 ヒデさん指定】「粒（吸い込み）」を A(軌道)グループの全案の共通オプションに。
       (以前は収縮=reelだけだった)。渦(spiral)は元々この動きが本体なので出さない。ネットワーク3D中も対象外。 */
    if (convGroupOf(cvMode).key === 'orbit' && cvMode !== 'spiral' && cvMode !== 'mesh' && !params.conv.net3d) {
      /* 2026-08-31: mesh(ネットワーク)は対象外(自前のノード粒とぶつかりデザインが破綻するため) */
      sub(animModeBox, '粒（吸い込み）— どの案でも重ねられる', true);
      const RP = params.conv.reelP || (params.conv.reelP = { on: false, count: 12, life: 8, speed: 0.55, size: 0.62, stay: 5, swirl: 1, fallCurve: 1 });
      segRow('粒（吸い込み）', [['なし', 0], ['あり', 1]],
        () => RP.on ? 1 : 0,
        v => { RP.on = !!v; markDirty(); renderFrame(); fillAnimBody(); });
      if (RP.on) {
        /* 連動の切替は「動き(この案) > 粒も一緒に回す」に統一(2026-08-30) */
        slider('粒の数', 2, 40, 1, () => RP.count, v => { RP.count = v; renderFrame(); }, v => Math.round(v) + '個',
          '軌道の上を回って惑星へ吸い込まれる粒の数。', { mbKey: 'conv.reelP.count', fixedMax: true });
        slider('粒の大きさ', 0.2, 1.5, 0.02, () => RP.size, v => { RP.size = v; renderFrame(); }, v => '×' + v.toFixed(2), '粒の大きさ。', { mbKey: 'conv.reelP.size' });
        slider('回る速さ', 0.1, 2, 0.05, () => RP.speed, v => { RP.speed = v; renderFrame(); }, v => '×' + v.toFixed(2), '軌道を回る速さ。', { mbKey: 'conv.reelP.speed' });
        slider('吸い込みの秒数', 2, 16, 0.5, () => RP.life, v => { RP.life = v; renderFrame(); }, v => v.toFixed(1) + '秒', '吸い込まれきるまでの時間。長いほどゆっくり。', { mbKey: 'conv.reelP.life', fixedMax: true });
        slider('軌道で待つ秒数', 1, 10, 0.5, () => RP.stay, v => { RP.stay = v; renderFrame(); }, v => v.toFixed(1) + '秒', '吸い込まれる前に軌道を回っている時間。', { mbKey: 'conv.reelP.stay' });
        slider('巻き具合', 0, 3, 0.05, () => RP.swirl, v => { RP.swirl = v; renderFrame(); }, v => '×' + v.toFixed(2), '吸い込まれる間の渦の巻き。0でまっすぐ。', { mbKey: 'conv.reelP.swirl' });
        slider('落ち方のカーブ', 0.1, 3, 0.05, () => RP.fallCurve, v => { RP.fallCurve = v; renderFrame(); }, v => '×' + v.toFixed(2), '大きいほど中心の近くで一気に吸い込まれる。', { mbKey: 'conv.reelP.fallCurve' });
      }
    }


    /* 【2026-08-29 ヒデさん指定】案ごとに「効く項目だけ」出す。使わない案では丸ごと隠す。
       例: エフェクトは吸収する案だけ / 汎用の軌道・ドット調整はネットワーク3D(固定再現)では効かない。 */
    for (const g of dynGroups) if (g.el) g.el.style.display = g.vis() ? '' : 'none';
    mount = keepMount;
    subDefaultOpen = keepOpen;
    liveEdit = keepLive;
    body.scrollTop = keepScroll;
  }
  fillAnimBody();

  /* ═══ ③〜⑤ ここから下は【モノ(オブジェクト)ごと】の調整 (2026-08-27 ヒデさん指定) ═══
     どの案を選んでいても効く、パーツそのものの設定。案ごとの細かいつまみは ① の中にある。 */

  /* ---------- ③ 軌道（輪） ---------- */
  liveEdit = true;
  sub(gRoot, '軌道（輪）', true);
  addDynGroup(orbitsUsed);   /* 2026-08-29: 輪が自動で隠れる案(net3d/mesh/beads/accre)では軌道調整が効かないので隠す */
  /* 【2026-08-27 ヒデさん指定】「表示」の中に「表示」の行、のような入れ子の重複をやめ、
     モノの箱の中は小見出しを置かずにフラットに並べる */
  chipRow('表示', [
    { name: '外の輪', get: () => params.conv.showOuter, set: v => params.conv.showOuter = v,
      hint: '外側の輪' },
    { name: '内の輪', get: () => params.conv.showInner, set: v => params.conv.showInner = v,
      hint: '内側の輪' },
    { name: 'ドット', get: () => params.conv.showDots,  set: v => params.conv.showDots = v,
      hint: '輪の上を回っている点' },
  ]);
  note('輪を消すと、その輪のドットも消えます。粒の渦・網の案では自動で隠れます。軌道の回転は案ごとなので「動き（この案）」にあります。');
  slider('漂う量', -3, 3, 0.05, () => params.conv.orbitDrift, v => params.conv.orbitDrift = v,
    v => '×' + v.toFixed(2),
    '真ん中(0)で固定。右へ動かすほど大きく漂い、左へ動かすと逆向きに漂います。', { mbKey: 'conv.orbitDrift', signed: true });
  /* 【2026-08-29 ヒデさん指定・フォーマット統一】「揺らぎ」「軌道の回転」の ON/OFF は
     案ごとに独立させたので「グラフィック > 動き（この案）」へ移動した。ここには置かない。 */
  note('揺らぎ・軌道の回転の ON/OFF は、案ごとに「グラフィック」タブの「動き（この案）」にあります（既定は 揺らぎON・回転OFF）。');

  /* 【2026-08-28 ヒデさん指定】複数軌道(リピート): 本数を増やすと惑星の中心に軌道を張る(アトム型など) */
  slider('軌道の本数', 0, 12, 1, () => params.conv.ringCount || 0,
    v => { params.conv.ringCount = v; markDirty(); renderFrame(); fillRingSub(); },
    v => (v < 2 ? '通常(2本)' : Math.round(v) + '本'),
    '0〜1で通常の2本のまま。2以上にすると、惑星の中心に複数の軌道を張ります（アトム型など）。', { mbKey: 'conv.ringCount', fixedMax: true });
  const ringSubBox = document.createElement('div');
  (mount || body).appendChild(ringSubBox);
  var fillRingSub = function () {
    const keep = mount; mount = ringSubBox; ringSubBox.innerHTML = '';
    if ((params.conv.ringCount || 0) >= 2) {
      const SHAPES = [
        { key: 'atom', name: 'アトム' }, { key: 'saturn', name: '土星' },
        { key: 'rosette', name: '花' }, { key: 'globe', name: '地球儀' },
      ];
      varRowX('ringShape', SHAPES, () => params.conv.ringShape || 'atom', v => { params.conv.ringShape = v; },
        { snap: VAR_SNAP.conv, after: (isLive => () => applyEdit(isLive, true))(liveEdit), reset: { get: () => params.conv.ringShape, set: v => { params.conv.ringShape = v; renderFrame(); } } });
      segRow('回転', [['する', 1], ['しない', 0]], () => (params.conv.ringRotate === false ? 0 : 1),
        v => { params.conv.ringRotate = !!v; markDirty(); renderFrame(); });
      note('「しない」にすると、輪が回らず・奥行きも動かず、その向きでぴたっと止まります（下の「回る速さ」「奥行きの動き」は回転オンの時だけ効きます）。');
      slider('回る速さ', 0, 2, 0.05, () => params.conv.ringSpin, v => params.conv.ringSpin = v, v => '×' + v.toFixed(2), '軌道全体の回る速さ。', { mbKey: 'conv.ringSpin' });
      slider('奥行きの動き', 0, 1.5, 0.05, () => params.conv.ringTumble, v => params.conv.ringTumble = v, v => '×' + v.toFixed(2), 'アトム型・地球儀型で、奥行きの伸び縮みの速さ。', { mbKey: 'conv.ringTumble' });
      slider('つぶし', 0.15, 0.8, 0.02, () => params.conv.ringFlat, v => params.conv.ringFlat = v, v => v.toFixed(2), '軌道の縦のつぶし具合。小さいほど細長い輪。', { mbKey: 'conv.ringFlat' });
      slider('大きさ', 0.5, 1.6, 0.02, () => params.conv.ringSize, v => params.conv.ringSize = v, v => '×' + v.toFixed(2), '軌道全体の大きさ。', { mbKey: 'conv.ringSize' });
      slider('線の太さ', 0.5, 8, 0.1, () => params.conv.ringWidth, v => params.conv.ringWidth = v, v => v.toFixed(1) + 'px', '複数軌道の線の太さ。', { mbKey: 'conv.ringWidth' });
    }
    mount = keep;
  };
  fillRingSub();

  /* ---------- ④ ドット（粒） ---------- */
  sub(gRoot, 'ドット（粒）', true);
  addDynGroup(orbitsUsed);   /* 2026-08-29: ドットが自動で隠れる案(net3d/mesh/beads/accre)では汎用ドット調整が効かないので隠す */
  slider('大きさ', 0.1, 4, 0.02, () => params.conv.dotSize, v => params.conv.dotSize = v,
    v => '×' + v.toFixed(2), 'すべての案のドット・粒にまとめて効きます。', { mbKey: 'conv.dotSize' });
  {
    /* もとは「グラフィック」の見出しの右にあったアイコン。
       モノごとの整理にあわせて、ドットの持ちものとしてここへ移した */
    const wrap = document.createElement('div');
    wrap.className = 'gmode gmode-row';
    const ICONS = {
      flat: '<svg viewBox="0 0 22 14" width="22" height="14" aria-hidden="true">'
          + '<circle cx="4" cy="7" r="2.6"/><circle cx="11" cy="7" r="2.6"/><circle cx="18" cy="7" r="2.6"/></svg>',
      persp: '<svg viewBox="0 0 22 14" width="22" height="14" aria-hidden="true">'
          + '<circle cx="4.5" cy="7" r="4"/><circle cx="13" cy="7" r="2.4"/><circle cx="19" cy="7" r="1.3"/></svg>',
    };
    const perspBox = document.createElement('div');
    const fillPersp = () => {
      perspBox.innerHTML = '';
      const keep = mount; mount = perspBox;
      if ((params.conv.dotPersp || 'flat') === 'persp') {
        slider('遠近の強さ', 0, 0.9, 0.02, () => params.conv.perspK, v => params.conv.perspK = v, v => v.toFixed(2),
          '手前と奥の大きさ・太さの差。大きいほど立体感が強くなります。', { mbKey: 'conv.perspK' });
        /* 【2026-08-29 ヒデさん指定】遠近を効かせる対象を選べる（ドット/軌道の線/両方）。
           軌道は「手前(下)の線を太く・奥(上)を細く」で遠近を出す。 */
        segRow('対象', [['ドット', 'dots'], ['軌道', 'orbit'], ['両方', 'both']],
          () => params.conv.perspScope || 'dots',
          v => { params.conv.perspScope = v; markDirty(); renderFrame(); });
        note('「軌道」を選ぶと、手前(下)の線が太く・奥(上)の線が細くなって、輪にも奥行きが出ます。');
      }
      mount = keep;
    };
    for (const [key, label] of [['flat', 'どこでも同じ大きさ'], ['persp', '手前が大きく、奥が小さい（遠近）']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gmode-b' + ((params.conv.dotPersp || 'flat') === key ? ' on' : '');
      b.innerHTML = ICONS[key];
      b.title = label;
      b.onclick = () => {
        params.conv.dotPersp = key;
        markDirty(); renderFrame();
        wrap.querySelectorAll('.gmode-b').forEach((el, j) => el.classList.toggle('on', j === (key === 'flat' ? 0 : 1)));
        fillPersp();
        fillAnimBody();
      };
      wrap.appendChild(b);
    }
    const prow = document.createElement('div');
    prow.className = 'row';
    const plab = document.createElement('label');
    plab.textContent = '遠近';
    plab.title = '左＝どこでも同じ大きさ／右＝手前が大きく、奥が小さい';
    /* 2026-08-29 ヒデさん指定: 遠近トグルにもリセット(↺)を置く */
    const perspRst = mkReset(() => (params.conv.dotPersp || 'flat'), v => {
      params.conv.dotPersp = v;
      wrap.querySelectorAll('.gmode-b').forEach((el, j) => el.classList.toggle('on', j === (v === 'flat' ? 0 : 1)));
      markDirty(); renderFrame(); fillPersp();
    }, null, false);
    prow.append(plab, wrap, perspRst);
    (mount || body).appendChild(prow);
    (mount || body).appendChild(perspBox);
    fillPersp();
  }
  slider('ランダムさ', -3, 3, 0.05, () => params.conv.dotRandom, v => params.conv.dotRandom = v, v => v.toFixed(2),
    '真ん中(0)できっちり等間隔。左右どちらへ動かしてもばらつきます（向きが逆になります）。', { mbKey: 'conv.dotRandom', signed: true });
  note('「軌道にそって回るかどうか」は案ごとの設定なので、① の中にあります。');

  /* ---------- ⑤ 惑星 ---------- */
  /* 【2026-08-28 ヒデさん指定】エフェクトを「惑星(模様)」の【上】へ。独立したセクションにする。 */
  sub(gRoot, 'エフェクト（吸収のされ方）', true);
  /* 【2026-08-29 ヒデさん指定】この節は「吸収する案」でだけ出す。 */
  addDynGroup(effectApplies);
  {
    /* パルス / 波紋 / エコー = エフェクトの種類。ここは「選択ピル」で、下の番号ピルと役割を分ける */
    const GLOWS = [
      { key: 'pulse',  name: 'パルス', tip: '届いた瞬間だけ、ふっと明るくなります。' },
      { key: 'echo',   name: 'エコー', tip: '惑星の丸いシルエットが、ひと回り大きくなった残像として外へ広がります。線ではなく“面”の波紋。' },
    ];
    varRowX('glowKind', GLOWS, () => params.conv.glowKind || 'pulse', v => { params.conv.glowKind = v; },
      { snap: VAR_SNAP.conv, after: (isLive => () => { fillGlowSub(); applyEdit(isLive, true); })(liveEdit), reset: { get: () => params.conv.glowKind, set: v => { params.conv.glowKind = v; renderFrame(); } } });

    /* 【2026-08-28 ヒデさん指定】エフェクトの出方(タイミング)。データが取り込まれるたびに毎回だと、
       粒がパラパラ入る案ではエフェクトが出っぱなしになる。「N回に1回」「N秒に1回」でまびける。 */
    segRow('エフェクトの出方', [['毎回', 'every'], ['回数で', 'count'], ['秒で', 'time']],
      () => params.conv.fxMode || 'every',
      v => { params.conv.fxMode = v; markDirty(); renderFrame(); fillFxPeriod(); });
    const fxPeriodBox = document.createElement('div');
    (mount || body).appendChild(fxPeriodBox);
    var fillFxPeriod = function () {
      const keep = mount; mount = fxPeriodBox; fxPeriodBox.innerHTML = '';
      const m = params.conv.fxMode || 'every';
      if (m === 'count') {
        slider('何回に1回', 1, 30, 1, () => params.conv.fxCount, v => params.conv.fxCount = v,
          v => Math.round(v) + '回に1回',
          '取り込みが何回起きるごとに1回エフェクトを出すか。大きいほど間引かれます。', { mbKey: 'conv.fxCount' });
      } else if (m === 'time') {
        slider('何秒に1回', 0.5, 15, 0.5, () => params.conv.fxEvery, v => params.conv.fxEvery = v,
          v => v.toFixed(1) + '秒に1回',
          '前に出してからこの秒数がたつまで、次のエフェクトを出しません。', { mbKey: 'conv.fxEvery' });
      }
      mount = keep;
    };

    /* 【2026-08-28 ヒデさん指定】広がりの慣性(波紋・エコー共通)。水面の波紋のように、勢いよく広がってスッと落ち着く */
    slider('広がりの慣性', 0, 1, 0.05, () => params.conv.fxInertia, v => params.conv.fxInertia = v,
      v => v.toFixed(2),
      '0＝一定の速さ（機械的）。右へ動かすほど、最初は勢いよく広がってだんだん減速します（自然な波紋）。波紋・エコーに効きます。', { mbKey: 'conv.fxInertia' });

    /* エコーを選んだ時だけ、下に「バリエーション」の番号ピルと細かいつまみを出す */
    const echoBox = document.createElement('div');
    (mount || body).appendChild(echoBox);
    const ECHOES = [
      { key: 'k1', name: '1 うしろに重ねる', tip: '惑星の絵をそのまま複製して、ひと回り大きく後ろへ。ふちにリムのように出ます。いちばん自然。' },
      { key: 'k2', name: '2 ぼかして広がる', tip: '複製にぼかしをかけながら大きく広がります。やわらかい残像。' },
      { key: 'k3', name: '3 手前にゴースト', tip: '複製を惑星の手前へ薄く重ねます。透けた残像がいちばんはっきり見えます。' },
      { key: 'k4', name: '4 色が変わる面',   tip: '単色の面の残像。取り込むたびに色が変わります（青・ピンク・水色・藤・白からランダム）。' },
      { key: 'k5', name: '5 連続ディゾルブ', tip: '惑星を少しずつ大きくしながら何十枚も薄く重ねます。段差が消えて、尾を引くように滑らかに溶けます。' },
      { key: 'k6', name: '6 内から溶ける',   tip: '同じ重ね方をしたうえで内側を抜き、外へ広がる輪にします。いちばん波紋らしい溶け方。' },
      { key: 'k7', name: '7 ぼけて溶ける',   tip: '重ねたうえで強くぼかします。輪郭が完全に消えて、光がにじむように広がります。' },
      { key: 'k8', name: '8 くっきり尾を引く', tip: '1と同じで惑星をそのまま複製するのでハッキリ見えます。1コマぶんの進みを細かく重ねるので、段差が出ずになめらかです。' },
      { key: 'k9', name: '9 連なる波',       tip: '殻を等間隔でずっと回し続けます。生まれる瞬間が無いので、途切れずに波が外へ流れ続けます（この案だけ間引きの対象外）。' },
    ];
    var fillGlowSub = function () {
      const keep = mount; mount = echoBox; echoBox.innerHTML = '';
      /* 【2026-09-19 ヒデさん依頼】エコーの「バリエーション／残像の輪郭／詳細つまみ」は削除(使わないため)。エコーの見た目は現在の params.conv のまま固定。 */
      mount = keep;
    };
    fillFxPeriod();
    fillGlowSub();
  }
  slider('光の強さ', 0, 1, 0.05, () => params.conv.glow, v => params.conv.glow = v, v => v.toFixed(2),
    '右へ動かすほど強く光ります。0で光りません。', { mbKey: 'conv.glow' });
  slider('溜まりの残り方', 1, 20, 0.5, () => params.conv.glowHold, v => params.conv.glowHold = v, v => v.toFixed(1) + '秒',
    '取り込んだぶんが半分に戻るまでの時間。右へ動かすほど、強くなった状態が長く残ります（Aパルス以外で効きます）。', { mbKey: 'conv.glowHold' });

  /* 【2026-09-17 大掃除・ヒデさん指定】「自由回転」(XYZ回転の枠・開始地点ボタン)は削除。メッシュ案では使っていない。 */
  /* 【2026-09-19 ヒデさん依頼】「惑星（模様）」の案の欄は削除(使わないため)。惑星スキンは現在の params.design のまま固定。 */
  /* 【2026-09-17 ヒデさん指定】「大きさ」のつまみは「メッシュ（網）の形」の中(ノードの数の下・カゴの大きさの上)へ移動 */
  /* 【2026-09-09 ヒデさん指定】惑星の「つぶし」項目は削除。真円(flat=1)に固定＝焼き込み。
     実装は params.planet.flat 未設定時 1(真円) が既定なので挙動不変。 */

  /* 【2026-08-27 ヒデさん指摘・削除】「登場（出てくる順番）」の節はここにあったが丸ごと削除。
     理由: 中身(入場の起点 / モックが出る / アイコンが出る・ばらけ / 軌道が出る)は
     すべて iframe のモックKV(kv/embed.html)へ postMessage するだけの値だった。
     惑星案に絞った今、その iframe は表示されていないので何も効かない。
     実測: 4つのつまみを動かしても、描画中の円・楕円の位置と濃さが1つも変わらなかった。 */
  subDefaultOpen = false;     /* グラフィックはここまで */
  /* 【2026-09-19 ヒデさん依頼】「ロゴ帯（目視の微調整）」の欄は削除(使わないため)。位置は現在の params.logoTune のまま固定。 */
  /* 【2026-08-27 ヒデさん指定】「左側コピー」に改名し、順番 / タイミング に分ける */
  /* 【2026-09-20 大改修・ヒデさん依頼】「左側コピー」の器を廃止し、コピー(基本)＋コピー(順番)/コピー(打つ速さ)=アニメに分割。 */
  const copyRoot = catKv;
  /* 【2026-09-20 大改修・ヒデさん依頼】コピー＝基本(位置・罫線・ギャップ)／フォント(サイズ)／アニメ(出現・タイピング)に分割。「上下の並び」は削除。位置はX/Y表記。 */
  sub(copyRoot, 'コピー', false);   /* 基本: 位置・罫線・ギャップ */
  rows.push(slider('位置 X', -120, 300, 2, () => (params.kv.copyX || 0),
    v => { params.kv.copyX = v; applyKvCopy(); }, v => v + 'px',
    'コピー全体（メイン＋サブ）を左右にずらします。0でヘッダーのロゴの左端と同じ位置(窓幅が変わっても揃います)。', { mbKey: 'kv.copyX', signed: true }));
  rows.push(slider('位置 Y', -200, 300, 2, () => (params.kv.copyY || 0),
    v => { params.kv.copyY = v; applyKvCopy(); }, v => v + 'px',
    'コピー全体を上下にずらします。0で調整版(Figma)の位置。', { mbKey: 'kv.copyY', signed: true }));
  segRow('サブの罫線（—）', [['あり', 1], ['なし', 0]],
    () => (params.kv.eyebrowDash === false ? 0 : 1),
    v => { params.kv.eyebrowDash = !!v; applyKvCopy(); markDirty(); buildPanel(); });
  if (params.kv.eyebrowDash !== false) {
    rows.push(slider('罫線の長さ', 8, 80, 1, () => (params.kv.eyebrowDashW != null ? params.kv.eyebrowDashW : 26),
      v => { params.kv.eyebrowDashW = v; applyKvCopy(); }, v => Math.round(v) + 'px',
      'サブコピー先頭の罫線(—)の長さ。カンプは26px。', { mbKey: 'kv.eyebrowDashW' }));
    rows.push(slider('罫線と文字のギャップ', 0, 40, 1, () => (params.kv.dashGap != null ? params.kv.dashGap : 10),
      v => { params.kv.dashGap = v; applyKvCopy(); }, v => Math.round(v) + 'px',
      '罫線(—)とサブコピー文字の間隔。', { mbKey: 'kv.dashGap' }));
  }
  rows.push(slider('メイン↔サブのギャップ', 0, 60, 1, () => (params.kv.copyGap != null ? params.kv.copyGap : 16),
    v => { params.kv.copyGap = v; applyKvCopy(); }, v => Math.round(v) + 'px',
    'メインコピーとサブコピーの縦の間隔。', { mbKey: 'kv.copyGap' }));
  sub(copyRoot, 'コピー', false, { grp: 'font' });   /* フォント: 文字サイズ(太さ/行間/字間は🔤文字) */
  rows.push(slider('1〜2行目のサイズ', 40, 110, 1, () => (params.kv.mainSize != null ? params.kv.mainSize : 70),
    v => { params.kv.mainSize = v; applyKvCopy(); }, v => Math.round(v) + 'px',
    '見出し1〜2行目「データ連携で／AIとプロダクトに」の文字サイズ。調整版は70px。太さ・行間・字間は「文字」で。', { mbKey: 'kv.mainSize', mbDefault: 34 }));
  rows.push(slider('最終行「競争力を」のサイズ', 60, 160, 1, () => (params.kv.jumpSize != null ? params.kv.jumpSize : 120),
    v => { params.kv.jumpSize = v; applyKvCopy(); }, v => Math.round(v) + 'px',
    '見出し3行目「競争力を」だけのサイズ。1〜2行目とは別の独立した値(ここだけ大きくできる)。調整版は120px。', { mbKey: 'kv.jumpSize', mbDefault: 60 }));
  rows.push(slider('サブのサイズ', 10, 28, 1, () => (params.kv.eyebrowSize != null ? params.kv.eyebrowSize : 20),
    v => { params.kv.eyebrowSize = v; applyKvCopy(); }, v => Math.round(v) + 'px',
    '「AI/プロダクト企業のための〜」の文字サイズ。調整版は20px。太さ・字間は「文字」で。', { mbKey: 'kv.eyebrowSize', mbDefault: 12 }));
  sub(copyRoot, 'コピー（出現）', false, { grp: 'anim' });
  note('数字はページを開いてから何秒後か。上から出る順です。');
  /* 【2026-09-09 ヒデさん確定】ヘッダーのホバーアニメは テキスト=上下ロール / ボタン=矢印 に確定＝焼き込み。
     選択パネル(5案ずつ)は削除。実装は header の data-navhover="roll" / data-btnhover="arrow" 固定(下のJS)。 */
  rows.push(slider('ナビ項目の間隔', 12, 64, 1, () => (params.kv.navGap != null ? params.kv.navGap : 32),
    v => { params.kv.navGap = v; applyNavGap(); }, v => Math.round(v) + 'px',
    'ヘッダーのナビ(ビジョン/提供できること…)の左右の間隔。', { mbKey: 'kv.navGap' }));
  rows.push(slider('ヘッダーが出る', 0, 3, 0.05, () => params.kv.headerAt, v => params.kv.headerAt = v, v => v.toFixed(2) + '秒後',
    'いちばん上のロゴとメニューが、ぼけた状態から現れるまで。', { mbKey: 'kv.headerAt' }));
  rows.push(slider('文字を打ち始める', 0, 6, 0.05, () => params.kv.typeAt, v => params.kv.typeAt = v, v => v.toFixed(2) + '秒後',
    '「AIと事業を強くする」を1文字ずつ打ち始めるまで。', { mbKey: 'kv.typeAt' }));
  sub(copyRoot, 'コピー（タイピング）', false, { grp: 'anim' });
  note('打つ速さと間の取り方。触ると先頭から流し直します。');
  rows.push(slider('1行目の1文字の時間', 0.03, 0.4, 0.01, () => params.kv.charDur, v => params.kv.charDur = v, v => v.toFixed(2) + 's/字',
    '1文字あたりの時間。小さいほどタタタッと速く打ちます。', { mbKey: 'kv.charDur' }));
  rows.push(slider('2行目の1文字の時間', 0.03, 0.4, 0.01, () => params.kv.charDur2, v => params.kv.charDur2 = v, v => v.toFixed(2) + 's/字',
    'ゆっくりにすると、最後の一言が印象に残ります。', { mbKey: 'kv.charDur2' }));
  rows.push(slider('タイピング速度の変化', 0, 1, 0.05, () => params.kv.typeEase, v => params.kv.typeEase = v, v => Math.round(v * 100) + '%',
    '大きいほど「最初は速く、最後はゆっくり」に。0で一定。', { mbKey: 'kv.typeEase' }));
  rows.push(slider('行と行の間', 0, 1.5, 0.05, () => params.kv.lineGap, v => params.kv.lineGap = v, v => v.toFixed(2) + '秒',
    '1行目を打ち終わってから、2行目を打ち始めるまでの間。', { mbKey: 'kv.lineGap' }));
  rows.push(slider('打ち終わり→一言', 0, 3, 0.05, () => params.kv.eyebrowGap, v => params.kv.eyebrowGap = v, v => v.toFixed(2) + '秒',
    '打ち終わってから、上の「APIでデータを繋ぐ〜」が出るまで。', { mbKey: 'kv.eyebrowGap' }));
  rows.push(slider('→ 右のグラフィックが出る', -2, 2, 0.05, () => params.kv.graphicGap, v => params.kv.graphicGap = v, v => v.toFixed(2) + '秒',
    '小ラベル基準で、右のモック→アイコン→軌道が出るタイミング。マイナスにすると小ラベルより前（タイピング中）に前倒しできます。', { mbKey: 'kv.graphicGap', signed: true }));
  rows.push(slider('ブラー解除の時間', 0.4, 3, 0.05, () => params.kv.revealDur, v => params.kv.revealDur = v, v => v.toFixed(2) + '秒',
    'ぼやけた状態からくっきりするまで。大きいほどゆったり。', { mbKey: 'kv.revealDur' }));

  /* (旧「共通（見せ方）」の項目は 2026-08-27 に ③軌道 / ④ドット / ⑤惑星 へ振り分けた) */

  /* 【2026-09-17 大掃除・ヒデさん依頼】このセクションの全テキストの 太さ／行間／字間(値の置き場は params.edits＝✏️編集と共通) */
  sub(catKv, '文字（太さ・行間・字間）', null, { fixed: true });
  note('ヘッダーとキービジュアルの文字ごとに 太さ(100〜900)・行間(倍)・字間(px) を変えます。空欄＝今のCSSの値(カッコ内)。位置や打ち替えは右上の ✏️編集 で文字をクリック。');
  textRowsFor(['kv']);

  /* ========== 📖 ビジョン ========== */
  panelVarsec(null);   /* 【2026-09-21】KVタブ終わり */
  const catVis = category('ビジョン（つなぐことが、強みになる時代へ）', false);
  catNote(catVis, 'Our Vision(ブラー) → メッセージがマスクで出る → 下に図(SVG書き出し)がブラーで出る → 右に Point 01/02。');
  panelVarsec('vis', 'ビジョン（案）');   /* 【2026-09-21 ヒデさん依頼】主役案をセクションに→配下に4カテゴリ */

  /* 【2026-09-20 ヒデさん依頼】ビジョンのバリエーション(デフォルト/強調)。強調＝2行・左揃え・大きめ */
  sub(catVis, 'バリエーション（案）', true, { fixed: true, grp: 'variation', bare: true });   /* 【2026-09-21 ヒデさん依頼】カテゴリ節「バリエーション」と重複する小見出しは出さず、案の選択だけ見せる(KVと統一) */
  varRowX('visEmph', VIS_EMPH_VARIANTS, () => visEmphMode(), k => {
    params.sections.vision.emph = String(k);
    /* 【2026-09-21 Y14・連動の根治】案を切り替える瞬間に、メッセージ等のサイズ系を「素の既定」へ戻す。
       この直後に varRowX.choose が『その案の上書き控え』を重ねる(あれば)。
       → 控えあり=その案だけの独立した大きさ / 控えなし=素の既定。どちらでも「離れた案でいじった大きさ」は残らない。
       これが無いと、控えの無い案へ移った時に params.edits.visMsg(全案共有)へ残った大きさをそのまま表示していた(＝連動の正体)。 */
    try { const d = DEFAULTS_PRISTINE.sections.vision; ['msgSize', 'pHSize', 'pPSize', 'pWidth'].forEach(kk => { if (d[kk] != null) params.sections.vision[kk] = d[kk]; }); } catch (e) {}
    visEmphPutMsg(params.edits || (params.edits = {}), null);
    visEmphPutMsg(params.editsMb || (params.editsMb = {}), null);
    applyVisEmph(); try { applyVpSize(); } catch (e) {} try { textTools.applyAll(); } catch (e) {}
  }, { snap: VAR_SNAP.visEmph, after: () => { if (typeof syncPanelRows === 'function') syncPanelRows(); } });   /* 【2026-09-21 ヒデさん依頼】案(デフォルト/強調)を切り替えたら、離れる案の文字サイズを控え→選んだ案の控えを適用=それぞれ独立 */
  note('強調＝メッセージを2行(データをつなぐことが、／強みになる時代へ)に・左揃え・文字+20px・見出しの左をKVコピーに合わせる・1行目→2行目のマスク出現。デフォルト＝現状(1行・中央)。');

  /* 【2026-08-30 ヒデさん指定】「強み」の強調はグラデ揺らぎで確定。他の案とこのセクション自体を削除した */

  /* 【2026-08-26 整理】1項目だけの見出しが並んで冗長だったので「基本」にまとめた */
  /* 【2026-09-20 大改修】基本(余白)＋ぼかし(エフェクト)＋表示時間(アニメ)に分割。図→グラフィック、距離→ギャップ表記。 */
  sub(catVis, 'セクションの余白', false);
  rows.push(slider('実績とのギャップ', 0, 600, 10, () => (params.visResPull != null ? params.visResPull : 200), v => { params.visResPull = v; applyVisResPull(); markDirty(); try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, v => '−' + Math.round(v) + 'px',
    'ビジョンのグラフィックが過ぎてから実績(for SaaS / for AI)が出るまでの空白を詰めます(実績を上へ引き上げる)。PCのみ。既定 200px 仮置き。', { mbKey: 'visResPull' }));
  rows.push(slider('見出し→グラフィック・ポイントのギャップ（上下）', 0, 160, 2, () => (sv().vision.belowGap != null ? sv().vision.belowGap : 50), v => { sv().vision.belowGap = v; applyVisBelow(); }, v => '+' + Math.round(v) + 'px',
    'メッセージの下の余白。グラフィック(ドーム)と Point 01/02 が同じ量だけ下がります(PCのみ)。既定 50px 仮置き。', { mbKey: 'sections.vision.belowGap', fixedMax: true }));
  rows.push(slider('グラフィックとポイントの左右ギャップ', -200, 200, 4, () => (sv().vision.pointsX != null ? sv().vision.pointsX : 0), v => { sv().vision.pointsX = v; applyVisPointsX(); }, v => (v > 0 ? '+' : '') + Math.round(v) + 'px',
    '左のグラフィックと Point 01/02 の横の間隔。＋で右・−で左。0＝いまの位置(PCのみ)。', { mbKey: 'sections.vision.pointsX', signed: true }));
  sub(catVis, '出現のぼかし', false, { grp: 'fxtex' });
  rows.push(slider('強さ', 0, 30, 1, () => sv().vision.blur, v => sv().vision.blur = v, v => v + 'px',
    '文字・グラフィックが出る時/消える時のぼやけの強さ。', { mbKey: 'sections.vision.blur' }));
  sub(catVis, 'セクション（再生）', false, { grp: 'anim' });
  sectionLenSlider('vision', 800);

  /* 【2026-08-29 ヒデさん指定】固定追従なし(時間再生)の「ブロックの表示タイミング」を細かく調整。
     塊＝メッセージ / グラフィック / ポイント1 / ポイント2。メッセージ自体は上の「1行目が出るまで」。 */
  sub(catVis, '表示タイミング（メッセージ→グラフィック→ポイント）', true);
  note('実装の時系列: ②メッセージ開始 →(出現時間×下の発火%＋間)→ グラフィック →(③「出きるまで」で出きる)→(＋ポイント1/2の間)→ ポイント。');
  rows.push(slider('グラフィック発火（メッセージの何割で）', 0, 1, 0.05, () => (sv().vision.npFireK != null ? sv().vision.npFireK : 0.70),
    v => sv().vision.npFireK = v, v => Math.round(v * 100) + '%',
    'メッセージがどこまで出た時点でグラフィックが動き出すか。100%=出きってから / 70%=途中で先行発火(既定)。実装に元々あった隠れ係数をパネルへ公開(2026-09-02)。', { mbKey: 'sections.vision.npFireK' }));
  rows.push(slider('メッセージ→グラフィック', 0, 3, 0.05, () => sv().vision.npGap, v => sv().vision.npGap = v, v => v.toFixed(2) + '秒',
    '上の発火タイミングから、さらに追加で待つ間。0=発火と同時(既定)。', { mbKey: 'sections.vision.npGap' }));
  rows.push(slider('グラフィック→ポイント1', 0, 4, 0.05, () => sv().vision.npP1, v => sv().vision.npP1 = v, v => v.toFixed(2) + '秒',
    'グラフィックが出きって(③の「出きるまで」経過後)から、Point 01 が出るまでの間。0=出きったと同時。', { mbKey: 'sections.vision.npP1' }));
  rows.push(slider('グラフィック→ポイント2', 0, 5, 0.05, () => sv().vision.npP2, v => sv().vision.npP2 = v, v => v.toFixed(2) + '秒',
    'グラフィックが出きって(③の「出きるまで」経過後)から、Point 02 が出るまでの間。', { mbKey: 'sections.vision.npP2' }));
  rows.push(slider('ポイントの出現時間', 0.2, 3, 0.05, () => (sv().vision.npPointDur != null ? sv().vision.npPointDur : 0.8),
    v => sv().vision.npPointDur = v, v => v.toFixed(2) + '秒',
    'Point 01/02(と見出し)がブラーから出きるまでの長さ。大きいほどゆったり。', { mbKey: 'sections.vision.npPointDur' }));

  sub(catVis, 'Our Vision（出現）', false, { grp: 'anim' });
  note('メッセージの上に出る小さいラベル「Our Vision」。いまは消えず出しっぱなしです。');
  rows.push(slider('出るまで', 0, 3, 0.05, () => sv().vision.labelAt, v => sv().vision.labelAt = v, v => v.toFixed(2) + '秒後',
    'セクションに入って(発火して)から「Our Vision」が出るまでの時間。', { mbKey: 'sections.vision.labelAt' }));
  rows.push(slider('出きるまで', 0.4, 4, 0.1, () => sv().vision.labelDur, v => sv().vision.labelDur = v, v => v.toFixed(1) + '秒',
    'ぼやけた状態からくっきりするまで。大きいほどゆったり。', { mbKey: 'sections.vision.labelDur' }));

  /* 【2026-08-29 ヒデさん指定・整理】いまは「1行・分裂なし・その場で出す(固定追従なし)」なので、
     旧「2行/消える・分裂/左下へ移動」の節は廃止。塊は メッセージ / 左グラフィック / ポイント1・2 だけ。 */
  /* 【2026-09-20 大改修】② メッセージ: 基本(メッセージ:サイズ/位置X/Y ・ Our Vision:位置X/Y)＋アニメ(メッセージ出現) に分割。文字サイズはビジョンでは基本のまま(ヒデさん指定)。 */
  const editPos = (key) => { if (!params.edits) params.edits = {}; return params.edits[key] || (params.edits[key] = {}); };
  sub(catVis, 'メッセージ', false);
  rows.push(slider('位置 X', -400, 600, 2, () => (editPos('visMsg').dx || 0),
    v => { editPos('visMsg').dx = v; textTools.applyAll(); }, v => v + 'px', 'メッセージの左右位置。', { mbKey: 'edits.visMsg.dx', signed: true }));
  rows.push(slider('位置 Y', -400, 600, 2, () => (editPos('visMsg').dy || 0),
    v => { editPos('visMsg').dy = v; textTools.applyAll(); }, v => v + 'px', 'メッセージの上下位置。', { mbKey: 'edits.visMsg.dy', signed: true }));
  sub(catVis, 'メッセージ', false, { grp: 'font' });   /* 【2026-09-20 ヒデさん依頼】文字サイズはフォント節へ */
  rows.push(slider('文字サイズ', 28, 72, 1, () => (sv().vision.msgSize != null ? sv().vision.msgSize : 50),
    v => { sv().vision.msgSize = v; applyVpSize(); }, v => Math.round(v) + 'px',
    '「データをつなぐことが、強みになる時代へ。」の文字サイズ。カンプは50px。行間は1.7倍で自動追従。', { mbKey: 'sections.vision.msgSize', mbDefault: 26 }));
  /* 【2026-09-25 ヒデさん依頼】強調案の行間(1行目↔2行目の縦の間隔)。強調案だけに効く独立値。PC/SP独立(mbKey)。数値=1行目の頭からの距離(px) */
  rows.push(slider('行間（強調案・1↔2行目）', 30, 260, 2, () => (sv().vision.emphGap != null ? sv().vision.emphGap : 119),
    v => { sv().vision.emphGap = v; applyVpSize(); }, v => Math.round(v) + 'px',
    '強調案の「データをつなぐことが、」と「強みになる時代へ」の行の間隔。この案だけに効きます（デフォルト案・他バリエーションには影響しません）。PCとスマホで別々に調整できます。', { mbKey: 'sections.vision.emphGap', mbDefault: 50 }));
  sub(catVis, 'Our Vision', false);
  rows.push(slider('位置 X', -400, 600, 2, () => (editPos('visLabel').dx || 0),
    v => { editPos('visLabel').dx = v; textTools.applyAll(); }, v => v + 'px',
    'Our Vision の左右位置。編集モードで枠の端をドラッグしても動きます。', { mbKey: 'edits.visLabel.dx', signed: true }));
  rows.push(slider('位置 Y', -400, 600, 2, () => (editPos('visLabel').dy || 0),
    v => { editPos('visLabel').dy = v; textTools.applyAll(); }, v => v + 'px', 'Our Vision の上下位置。', { mbKey: 'edits.visLabel.dy', signed: true }));
  sub(catVis, 'メッセージ（出現）', false, { grp: 'anim' });
  rows.push(slider('出るまで', 0.2, 5, 0.05, () => sv().vision.line1At, v => sv().vision.line1At = v, v => v.toFixed(2) + '秒後',
    'セクションに入って(発火して)からメッセージが出るまでの時間。', { mbKey: 'sections.vision.line1At' }));
  rows.push(slider('出きるまで', 0.4, 3, 0.05, () => sv().vision.revealDur, v => sv().vision.revealDur = v, v => v.toFixed(2) + '秒',
    'ぼけた状態から出きるまでの時間。', { mbKey: 'sections.vision.revealDur' }));
  rows.push(slider('1文字ずつずらす', -0.9, 0.9, 0.05, () => sv().vision.charLag, v => sv().vision.charLag = v, v => Math.round(v * 100) + '%',
    '真ん中(0)で行まるごと同時。左右どちらへ動かしても1文字ずつバラバラに出ます。', { mbKey: 'sections.vision.charLag', signed: true }));
  /* 【2026-09-15 ヒデさん指定】「つなぐ／強み」の揺らぎのグラデ: くすまない鮮やかな配色 3案(色味はブランド色のまま)＋つまみ */
  sub(catVis, '揺らぎのグラデ（つなぐ／強み）の配色', true, { fixed: true });
  varRowX('visGrad', VIS_GRADS, () => visGradKey(), v => { visApplyGrad(String(v)); }, { autosave: true, snap: VAR_SNAP.visGrad, after: () => { applyVisGrad(); } });
  note('選ぶとその案の彩度・明るさが下のつまみに入ります。細かく変えたら ⋯「いまの設定で上書き」でその案に保存できます。');
  rows.push(slider('彩度', 0.6, 2.2, 0.02, () => (sv().vision.gradSat != null ? sv().vision.gradSat : 1), v => { sv().vision.gradSat = v; applyVisGrad(); }, v => Math.round(v * 100) + '%', 'グラデ文字の彩度。100%が元の色。', { mbKey: 'sections.vision.gradSat' }));
  rows.push(slider('明るさ', 0.8, 1.3, 0.01, () => (sv().vision.gradBri != null ? sv().vision.gradBri : 1), v => { sv().vision.gradBri = v; applyVisGrad(); }, v => Math.round(v * 100) + '%', 'グラデ文字の明るさ。', { mbKey: 'sections.vision.gradBri' }));
  rows.push(slider('流れる速さ', 3, 14, 0.5, () => (sv().vision.gradDur != null ? sv().vision.gradDur : 7), v => { sv().vision.gradDur = v; applyVisGrad(); }, v => v.toFixed(1) + '秒/往復', 'グラデが往復する時間。短いほど速い。', { mbKey: 'sections.vision.gradDur' }));
  rows.push(slider('角度', 0, 180, 1, () => (sv().vision.gradAng != null ? sv().vision.gradAng : 67), v => { sv().vision.gradAng = v; applyVisGrad(); }, v => Math.round(v) + '°', 'グラデの向き。カンプは 67°。', { mbKey: 'sections.vision.gradAng' }));

  /* 【2026-09-20 大改修・ヒデさん依頼】③「図（網目のドーム）」→ グラフィックの「メッシュ」に統一。案(visMesh)を削除し現在の見た目を既定に。位置/向き/半径=基本、線/点/パケット/フェード=エフェクト、回転=アニメ、透明度=エフェクト に振り分け。機能名の個別位置はX/Yスライダーに。 */
  sub(catVis, 'メッシュ', false);
  note('Figma 18004:38228 のグラフィックをコードで描画(正二十面体を分割した球)。位置は ✏️編集でもドラッグ可。');
  const vfS = (label, key, min, max, step, fmt, tip, o) => rows.push(slider(label, min, max, step, () => vfCfgVal(key), v => { vfSet(key, v); if (key === 'freq') vfMesh = null; markDirty(); }, fmt, tip, Object.assign({ fixedMax: true, mbActive: () => { const _v = params.sections.vision; return !!(_v && _v.domeMb && _v.domeMb[key] != null); }, mbClear: () => { const _v = params.sections.vision; if (_v && _v.domeMb) { delete _v.domeMb[key]; applyVfFade(); } } }, o || {})));
  /* 【2026-09-25 ヒデさん依頼】メッシュの形状バリエーション＋横/縦のふくらみ＋尖りのつまみは削除。
     現状(焼き込み済み)を既定として固定。形状はいじらせず、細かさ(面の数)だけ下に残す。 */
  note('▼ セット（メッシュ＋ロゴ＋機能名）');
  vfS('セットの位置 X', 'dx', -200, 200, 2, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'セット(メッシュ・ロゴ・機能名)を左右に。Point 01/02 は動きません。PCのみ。0＝いまの位置。', { signed: true });
  vfS('セットの位置 Y', 'dy', -100, 200, 2, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'セットを上下に。Point 01/02 は動きません。既定 +30px 仮置き。');
  vfS('セットの大きさ', 'scale', 0.5, 1.6, 0.02, v => Math.round(v * 100) + '%', 'メッシュとロゴを球の中心から拡大縮小。機能名は文字サイズを変えず位置だけ外へ。既定 115% 仮置き。');
  note('▼ メッシュ本体（位置・向き）');
  vfS('位置 X', 'mx', -200, 200, 2, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'メッシュだけを左右に。ロゴと機能名は動きません。0＝いまの位置。', { signed: true });
  vfS('位置 Y', 'my', -200, 200, 2, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'メッシュだけを上下に(下のフェードも一緒)。0＝いまの位置。', { signed: true });
  vfS('位置 Z', 'mz', -60, 60, 1, v => (v > 0 ? '+' : '') + Math.round(v) + '%', '奥行き。手前(+)＝大きく／奥(−)＝小さく。0＝いまの大きさ。', { signed: true });
  vfS('半径', 'r', 150, 360, 2, v => Math.round(v) + 'px', 'メッシュの球だけの半径(ロゴ・機能名は動かない)。カンプ 262px。');
  vfS('傾き（前後）', 'tilt', -45, 45, 1, v => Math.round(v) + '°', 'マイナスで上面が見える(手前に倒す)。');
  vfS('傾き（左右）', 'roll', -45, 45, 1, v => (v > 0 ? '+' : '') + Math.round(v) + '°', 'メッシュの軸を左右に倒す。0＝いまの向き。', { signed: true });
  vfS('向き（回転の位置）', 'yaw', -180, 180, 1, v => (v > 0 ? '+' : '') + Math.round(v) + '°', '縦軸まわりの向きをずらす。', { signed: true });
  /* 【2026-09-25 ヒデさん依頼・面の数を1個ずつ】形: 整った網(測地線・点が飛び飛び)／散らばり(三角網・点を1個ずつ)。既定は今の整った網。KVとは別の値 */
  segRow('形', [['整った網', 'geo'], ['散らばり（1個ずつ）', 'fibo']], () => (vfCfg().meshKind === 'fibo' ? 'fibo' : 'geo'), v => { vfSet('meshKind', v); markDirty(); });
  vfS('細かさ（整った網）', 'freq', 1, 4, 1, v => Math.round(v) + '（点 ' + [0, 12, 42, 92, 162][Math.round(v)] + '）', '形が「整った網」の時の球の分割数。3=カンプと同じ密度(点92・線270)。');
  vfS('面の数（散らばり・1個ずつ）', 'fn', 12, 300, 1, v => '点' + Math.round(v) + '・線' + (3 * Math.round(v) - 6), '形が「散らばり」の時の点の数。1個ずつ増減できます。92＝整った網の細かさ3(カンプ)と同じ点・線の数。');
  /* --- 基本: 機能名 --- */
  sub(catVis, '機能名', false);
  vfS('全機能 X', 'labGX', -200, 200, 2, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', '5つの機能名をまとめて左右に。＋で右。', { signed: true });
  vfS('全機能 Y', 'labGY', -200, 200, 2, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', '5つの機能名をまとめて上下に。＋で下。', { signed: true });
  vfS('球との距離', 'labelDist', 0.6, 1.3, 0.02, v => Math.round(v * 100) + '%', '機能名(コネクタ・SDK等)を球の中心へ寄せる/離す。100%=いまの位置。');
  { const LABN = ['コネクタ', '認証ウィザード', 'SDK', 'ワークフロー', '実行エンジン'];
    LABN.forEach((nm, i) => {
      const dm = () => { const v = params.sections.vision; if (!v.dome) v.dome = {}; if (!v.dome.labOff) v.dome.labOff = []; if (!v.dome.labOff[i]) v.dome.labOff[i] = { x: 0, y: 0 }; return v.dome.labOff[i]; };
      rows.push(slider(nm + ' X', -150, 150, 1, () => (dm().x || 0), v => { dm().x = v; applyVfFade(); markDirty(); }, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', nm + ' の左右位置。＋で右。', { signed: true }));
      rows.push(slider(nm + ' Y', -150, 150, 1, () => (dm().y || 0), v => { dm().y = v; applyVfFade(); markDirty(); }, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', nm + ' の上下位置。＋で下。', { signed: true }));
    });
  }
  /* --- 基本: ロゴ(表示・大きさ・位置。傾き/角度は撤去=独立フラット化。透明度はエフェクトへ) --- */
  sub(catVis, 'ロゴ', false);
  segRow('表示', [['表示', 1], ['非表示', 0]], () => (vfCfg().logoOn === 0 ? 0 : 1), v => { vfSet('logoOn', v ? 1 : 0); markDirty(); });
  vfS('大きさ', 'logoScale', 0.4, 2.5, 0.02, v => Math.round(v * 100) + '%', '中央のロゴだけの大きさ(メッシュの大きさに掛かる)。');
  vfS('位置 X', 'logoDx', -300, 300, 1, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'ロゴを左右へ。✏️編集モードのドラッグでも動きます。');
  vfS('位置 Y', 'logoDy', -300, 300, 1, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'ロゴを上下へ。');
  /* --- エフェクト＆テクスチャ: メッシュの見た目＋フェード --- */
  sub(catVis, 'メッシュ', false, { grp: 'fxtex' });
  vfS('線の濃さ', 'lineAlpha', 0.05, 0.8, 0.01, v => Math.round(v * 100) + '%', '手前の線の濃さ。奥ほど自動で薄く。');
  vfS('線の太さ', 'lineWidth', 0.5, 3, 0.1, v => v.toFixed(1) + 'px', '手前の線の太さ。奥は少し細く。');
  vfS('奥の線の薄さ', 'depthFade', 0, 1, 0.05, v => v === 0 ? 'なし' : Math.round(v * 100) + '%', '球の奥側の線・点をどれだけ薄く・細くするか。手前はそのまま。');
  vfS('点の大きさ', 'dot', 1, 5, 0.1, v => v.toFixed(1) + 'px', '節目の点(ピンク/シアン/紺/薄い青灰)の大きさ。');
  vfS('パケット（骨を走る光）', 'pk', 0, 12, 0.5, v => v === 0 ? 'なし' : v.toFixed(1) + '/秒', '線の上を走る光の数(1秒あたり)。0でなし。');
  vfS('下のフェード 始まり', 'fadeA', 0, 1, 0.02, v => Math.round(v * 100) + '%', 'ここから下が薄くなり始める(図の高さに対する%)。');
  vfS('下のフェード 終わり', 'fadeB', 0, 1, 0.02, v => Math.round(v * 100) + '%', 'ここで完全に消える。');
  sub(catVis, 'ロゴ', false, { grp: 'fxtex' });
  vfS('透明度', 'logoOpacity', 0.2, 1, 0.02, v => Math.round(v * 100) + '%', '薄くすると後ろのメッシュが透けて馴染む。');
  /* --- アニメーション: メッシュの回転＋グラフィックの出現 --- */
  sub(catVis, 'メッシュ', false, { grp: 'anim' });
  segRow('回転', [['あり', 1], ['なし', 0]], () => (vfCfg().spinOn === 0 ? 0 : 1), v => { vfSet('spinOn', v ? 1 : 0); markDirty(); });
  vfS('回転の速さ', 'spin', 0, 2, 0.05, v => '×' + v.toFixed(2), '「回転 あり」の時の速さ。0.35 で約2分半で1周。');
  sub(catVis, 'グラフィックの出現', false, { grp: 'anim' });
  rows.push(slider('出きるまで', 0.4, 3, 0.1, () => sv().vision.miniDur, v => sv().vision.miniDur = v, v => v.toFixed(1) + '秒',
    'ぼけた状態からくっきり出るまでの時間。', { mbKey: 'sections.vision.miniDur' }));

  sub(catVis, 'ポイント1・2', true);
  rows.push(slider('横幅', 220, 560, 4, () => (sv().vision.pWidth != null ? sv().vision.pWidth : 328),
    v => { sv().vision.pWidth = v; applyVpSize(); }, v => Math.round(v) + 'px',
    'ポイント1・2のブロックの横幅。狭いほど本文の折り返しが増えます。カンプは328px。', { mbKey: 'sections.vision.pWidth' }));
  sub(catVis, 'ポイント1・2', false, { grp: 'font' });   /* 【2026-09-20 ヒデさん依頼】文字サイズはフォント節へ */
  rows.push(slider('見出しサイズ', 16, 44, 1, () => (sv().vision.pHSize != null ? sv().vision.pHSize : 26),
    v => { sv().vision.pHSize = v; applyVpSize(); }, v => Math.round(v) + 'px',
    '「賢いAIの土台をつくる」などの見出しの文字サイズ。カンプは26px。', { mbKey: 'sections.vision.pHSize', mbDefault: 20 }));
  rows.push(slider('本文サイズ', 10, 24, 0.5, () => (sv().vision.pPSize != null ? sv().vision.pPSize : 14),
    v => { sv().vision.pPSize = v; applyVpSize(); }, v => v.toFixed(1) + 'px',
    'ポイントの説明文の文字サイズ。カンプは14px。', { mbKey: 'sections.vision.pPSize', mbDefault: 12 }));

  /* 【2026-08-26 整理】見出しだけが空で、中身(見出し/Point01/Point02)が同じ階層に並んでいたので入れ子に直した */
  sub(catVis, '2つの価値', false);
  const vpRoot = mount;
  note('デザイン位置からのズレ。＋で右／下へ。');
  [['ポイント1', 'p1X', 'p1Y'], ['ポイント2', 'p2X', 'p2Y']]
    .forEach(([label, kx, ky]) => {
      sub(vpRoot, label, true);
      rows.push(slider('位置 X', -400, 400, 2, () => sv().vision[kx], v => sv().vision[kx] = v, v => v + 'px', 'プラスで右へ、マイナスで左へ。', { mbKey: 'sections.vision.' + kx }));
      rows.push(slider('位置 Y', -400, 400, 2, () => sv().vision[ky], v => sv().vision[ky] = v, v => v + 'px', 'プラスで下へ、マイナスで上へ。', { mbKey: 'sections.vision.' + ky }));
    });

  sub(catVis, '文字（太さ・行間・字間）', null, { fixed: true });
  note('ビジョンの文字ごとに 太さ・行間・字間。空欄＝今のCSSの値(カッコ内)。位置や打ち替えは ✏️編集 で文字をクリック。');
  textRowsFor(['vis']);

  /* ========== 📈 実績 ========== */
  panelVarsec(null);   /* 【2026-09-21】ビジョンタブ終わり */
  const catRes = category('実績（導入企業◯◯社などの数字）', false);
  RFX_DYN.length = 0;   /* 案ごとの動的パネルの登録をやり直す(組み立てのたび) */
  RFX_TITLES.length = 0;
  try { Object.keys(DEV_DYN).forEach(k => { delete DEV_DYN[k]; }); } catch (e) {}   /* 2026-09-15: モックの案ごとのつまみも作り直す */
  catNote(catRes, '見出し → 数字と本文 → 見終わると暗くなって次のセクションへ。');
  panelVarsec('fx', '演出');   /* 【2026-09-21 ヒデさん依頼】ここから「演出」セクション(この中に 基本/フォント/エフェクト/アニメーションを入れ子で) */

  /* 【2026-09-13 ヒデさん指定・比較検証】実績セクションの演出案(Codex 1/4/5/6。7・9 は 2026-09-14 に削除)。既定=現行。
     各ボタンのツールチップ(title)に狙いを表示。?resFx=1 などURLでも指定可。 */
  sub(catRes, '演出の案（比較検証・PCのみ）', true, { fixed: true });
  {
    const RFX_OPTS = [
      ['24-4 for SaaS/for AI から入る(要素移動)', '24-4', '【2026-09-17 新】ピクトを大きくズームさせず、ほぼ最終サイズのままフェード＋位置移動だけで終点へ運ぶ版。3枚カードが途中で「別の絵柄に切り替わって見える」印象を消し、絵(SVG)は同じまま要素の移動で補完する(固定・240vh)。'],
      ['26 数値→線→下段が横へ', '26', '絵コンテ(Figma 17283:23622): 3つの数値が中央に大きく→上段の終点(見出し 左・数値 右)へ→横線が伸びきる→下段(説明・ピクト)がブラーで→横に動いて for AI→縦に戻る(固定・560vh)。'],
    ];
    /* 【2026-09-14 ヒデさん指定】案は × で消せる(KV のバリエーションと同じ仕組み。「現行」は消せない・番号は振り直さない) */
    resFxRow(RFX_OPTS);
    note('比較用(採用前)。番号は「見えている案の連番」(消すと自動で詰まる)。元の ID と狙いはボタンに乗せると出ます。⋯ から ★ピン留め(おすすめ・先頭に出る)／いまの設定で上書き／削除。SP は各案を縦積みで再現(縦600px以下の端末は固定案も縦流れ)。実績→開発者体験の暗転・白反転は全案共通(伸ばした尺の終端が入口)。');
    rows.push(slider('固定の長さ', 100, 700, 10,
      () => { const k = resFxKey(); return resFxVh(k) || (RES_FX[k] && RES_FX[k].vh) || 100; },
      v => { const k = resFxKey(); if (!(RES_FX[k] && RES_FX[k].vh)) return; const r = params.sections.results; r.rfxVh = r.rfxVh || {}; r.rfxVh[k] = v; fit(); },
      v => { const k = resFxKey(); return (RES_FX[k] && RES_FX[k].vh) ? v + 'vh' : '固定なし'; },
      '固定して読む区間の長さ(固定のある案のみ。4・12・30・33・38〜41 は固定なし)。大きいほどゆっくり進みます。'));
    { const _vr = [...mount.querySelectorAll('.row')].find(r => (r.textContent || '').includes('固定の長さ'));
      rfxDyn(_vr, ['24-4', '26']); }   /* 4/12/30/33/38〜41 は固定なし */   /* 固定のある案の時だけ出す */
    /* 【2026-09-26 整理】完全削除した案だけの調整(主役ピクト系・案14・案20・案21〜23)は削除。
       主役ピクト系のぼかし(hero.pictoBlur)は案24-4 が今も読むので値の既定(RFX_HERO_DEF)は残す */
    const pct = v => Math.round(v * 100) + '%';
    /* 案24: ピクトの大きさと文字の動き(その案の時だけ出す) */
    subT(catRes, () => '案' + rfxNos(['24-4']) + '：ピクトの大きさと文字の動き');
    const _g24 = catRes.lastElementChild;
    const f24 = () => { const r = params.sections.results; r.fx24 = r.fx24 || {}; return r.fx24; };
    const F24 = { heroScale: 1.7, labelUp: 190, prodSize: 38 };
    /* 【2026-09-21 ヒデさん依頼】主役の大きさ/文字が上へ/Product は PC のスクロール登場演出専用で、スマホ(flow)では効かない。
       → スマホモード中は隠す(.pc-only-row)。PC編集時は今まで通り表示。区切り線の余白はスマホ用の効く版を下に用意。 */
    const pcOnly = (r) => { try { r.classList.add('pc-only-row'); } catch (e) {} return r; };
    const s24 = (label, key, min, max, step, fmt, tip) => rows.push(pcOnly(slider(label, min, max, step, () => (f24()[key] != null ? f24()[key] : F24[key]), v => { f24()[key] = v; markDirty(); }, fmt, tip, { mbKey: 'sections.results.fx24.' + key })));
    s24('ピクトの主役の大きさ', 'heroScale', 1.2, 2.2, 0.05, v => '×' + v.toFixed(2), '各列の中央に大きく出る時の倍率(絵コンテ 666枠/386枠 ≒ 1.7)。※PCのスクロール登場演出専用(スマホでは効きません)。');
    s24('文字が上へ動く距離', 'labelUp', 80, 300, 5, v => v + 'px', '「for SaaS / for AI」が中央から上へ動く距離(絵コンテは約190px)。※PCのスクロール登場演出専用。');
    /* 【2026-09-18 ヒデさん依頼】登場の大きい文字の下に付く「Product」のサイズ(終点のタグでは1行続きで同じサイズ) */
    rows.push(pcOnly(slider('大きい文字の下の「Product」のサイズ', 16, 70, 1, () => (f24().prodSize != null ? f24().prodSize : 38), v => { f24().prodSize = v; applyResProd(); markDirty(); }, v => Math.round(v) + 'px',
      '「for SaaS / for AI」(70px)の下に付く Product の文字サイズ。添付画像の比率(約55%)で既定38px。太さは「文字」で。※PCの登場演出専用。', { mbKey: 'sections.results.fx24.prodSize', fixedMax: true })));
    rows.push(pcOnly(slider('区切り線の上の余白', 0, 260, 4, () => (sv().results.hrGap != null ? sv().results.hrGap : 100), v => { sv().results.hrGap = v; applyResHrGap(); }, v => Math.round(v) + 'px',
      '「2つの価値」のブロックと、その下の区切り線＋「事業の推進力を、Anyflowが支えます。」との間隔。広げると線から下がまとめて下がります(全体は中央寄せなので上の余白は少し詰まります)。※PCのみ(スマホは下の「区切り線まわりの余白(スマホ)」で)。', { mbKey: 'sections.results.hrGap', fixedMax: true })));
    rows.push(pcOnly(slider('区切り線の下の余白', 0, 200, 4, () => (sv().results.hrGap2 != null ? sv().results.hrGap2 : 0), v => { sv().results.hrGap2 = v; applyResHrGap(); }, v => Math.round(v) + 'px',
      '区切り線と「事業の推進力を、Anyflowが支えます。」＋数値との間隔。0 でいままで(上段の padding 28px ぶんだけ空いています)。※PCのみ。', { mbKey: 'sections.results.hrGap2', fixedMax: true })));
    /* 【2026-09-21 ヒデさん依頼】スマホ用に効く「区切り線まわりの余白」。SP は縦積みなので、各ブロック↔線の間隔をまとめて調整(既定16px＝現状) */
    const _spGap = slider('区切り線まわりの余白（スマホ）', 8, 40, 1, () => (sv().results.spGap != null ? sv().results.spGap : 16), v => { sv().results.spGap = v; applyResSpGap(); markDirty(); }, v => Math.round(v) + 'px', 'スマホの実績で、for SaaS / for AI / 数値の各ブロックと区切り線との上下の間隔をまとめて調整します。既定16px。', { fixedMax: true });
    try { _spGap.classList.add('sp-only-row'); } catch (e) {} rows.push(_spGap);
    rfxDyn(_g24, ['24-4']);
    /* 案26: 数値の大きさ・線・横移動(その案の時だけ出す) */
    subT(catRes, () => '案' + rfxNo('26') + '：数値の大きさ・線・横移動');
    const _g26 = catRes.lastElementChild;
    const f26 = () => { const r = params.sections.results; r.fx26 = r.fx26 || {}; return r.fx26; };
    const F26 = { numScale: 1.714, settleAt: 0.06, settleLen: 0.20, lineAt: 0.28, lineLen: 0.14, panAt: 0.58, panLen: 0.20 };
    const s26 = (label, key, min, max, step, fmt, tip) => rows.push(slider(label, min, max, step, () => (f26()[key] != null ? f26()[key] : F26[key]), v => { f26()[key] = v; markDirty(); }, fmt, tip, { mbKey: 'sections.results.fx26.' + key }));
    s26('数値の大きさ', 'numScale', 1.2, 3, 0.05, v => '×' + v.toFixed(2), '最初に中央へ大きく出す倍率(70px に対して。絵コンテは 120px=1.71倍)。');
    s26('数値が収まり始める位置', 'settleAt', 0, 0.3, 0.01, pct, '固定区間のどこから上段の終点へ動き始めるか。');
    s26('収まる長さ', 'settleLen', 0.05, 0.5, 0.01, pct, '終点に収まり切るまでの長さ。');
    s26('線が伸び始める位置', 'lineAt', 0.1, 0.6, 0.01, pct, '横線が左から伸び始める位置。伸びきると下段がブラーで現れます。');
    s26('線が伸びる長さ', 'lineLen', 0.03, 0.4, 0.01, pct, '線が伸びきるまでの長さ。');
    s26('横に動き始める位置', 'panAt', 0.3, 0.85, 0.01, pct, '下段が for SaaS → for AI へ動き始める位置。');
    s26('横移動の長さ', 'panLen', 0.05, 0.5, 0.01, pct, '横移動にかける長さ。');
    rfxDyn(_g26, ['26']);
    syncRfxDyn();
  }

  /* 【2026-08-30 ヒデさん指定】実績→開発者体験の切替は「スムーズフェード」固定(既定)。選択UIは廃止。 */

  /* ⚠️【2026-08-26 ヒデさん指定】「レイアウトを選ぶ」(案A/B/C)は削除。実績は新デザイン1本に統一。 */
  /* 【2026-09-20 大改修】長さ→アニメ(再生)・ぼかし→エフェクト に分割(ビジョンと統一) */
  sub(catRes, 'セクション（再生）', false, { grp: 'anim' });
  sectionLenSlider('results', 600);
  sub(catRes, '画像のぼかし', false, { grp: 'fxtex' });
  rows.push(slider('強さ', 0, 40, 1, () => sv().results.imgBlur, v => sv().results.imgBlur = v, v => v + 'px',
    '大きいほど、写真がぼんやりした状態から現れます。', { mbKey: 'sections.results.imgBlur' }));

  /* 【2026-09-19 ヒデさん依頼】for SaaS / for AI の大きな文字は、画面の下に見えている間はぼけていて、上がってくるにつれてはっきり */
  sub(catRes, '入場のぼかし（for SaaS / for AI が下から上がる間）');
  note('セクションが画面下から入ってくる進み具合(0%=下端に顔を出す / 50%=大きな文字が画面の下端に出る / 100%=所定の位置)に連動。所定の位置に着いたら効きません。');
  rows.push(slider('24-4 のぼかしの強さ（強め）', 0, 60, 1, () => (sv().results.entryBlur44 != null ? sv().results.entryBlur44 : 26), v => sv().results.entryBlur44 = v, v => Math.round(v) + 'px', '演出の案が 24-4 の時の、入ってきた直後のぼけ(強め)。0でぼかし無し。', { mbKey: 'sections.results.entryBlur44' }));
  rows.push(slider('24-5 のぼかしの強さ', 0, 60, 1, () => (sv().results.entryBlur != null ? sv().results.entryBlur : 16), v => sv().results.entryBlur = v, v => Math.round(v) + 'px', '演出の案が 24-5(と 24/24-2/24-3)の時の、入ってきた直後のぼけ。0でぼかし無し。', { mbKey: 'sections.results.entryBlur' }));
  rows.push(slider('はっきりし始める', 0, 1, 0.05, () => (sv().results.entryFrom != null ? sv().results.entryFrom : 0.4), v => sv().results.entryFrom = v, v => Math.round(v * 100) + '%', 'ここまでは最大のぼけのまま。「出だしの高さ」と同じ%＝文字が画面の下端に出た時。', { mbKey: 'sections.results.entryFrom', fixedMax: true }));
  rows.push(slider('はっきりしきる', 0.05, 1, 0.05, () => (sv().results.entryTo != null ? sv().results.entryTo : 0.95), v => sv().results.entryTo = v, v => Math.round(v * 100) + '%', 'ここで完全にくっきり。100%=所定の位置に着いた時。', { mbKey: 'sections.results.entryTo', fixedMax: true }));
  rows.push(slider('出だしの薄さ', 0, 1, 0.05, () => (sv().results.entryOp != null ? sv().results.entryOp : 1), v => sv().results.entryOp = v, v => Math.round(v * 100) + '%', '入ってきた直後の不透明度。100%=薄くしない(ぼかしだけ)。', { mbKey: 'sections.results.entryOp', fixedMax: true }));
  rows.push(slider('出だしの高さ', 0.2, 0.6, 0.02, () => (sv().results.bigStartY != null ? sv().results.bigStartY : 0.4), v => sv().results.bigStartY = v, v => Math.round(v * 100) + '%', '着地前の for SaaS / for AI の中心を、画面の上から何%の位置に置くか。50%=ど真ん中(旧)。小さいほど上＝ビジョンとの空白が詰まる。着地の位置(タグ)は変わりません。', { mbKey: 'sections.results.bigStartY', fixedMax: true }));

  sub(catRes, '出てくる順番とタイミング');
  note('「事業の推進力を、」(見出し1行目) → タイピング「Anyflow」→「が支えます。」 → その他(区切り線・3数値・2つの価値)。それぞれの間隔を分けて調整できます。');
  /* 【2026-09-09 ヒデさん指定】「Anyflowの見せ方」(下線に打ち込む/押し広げる)の選択UIは削除。
     下線に打ち込む(slot)に固定＝焼き込み。実装は (c.typeStyle || 'slot') が既定 slot なので挙動不変。 */
  rows.push(slider('見出し1行目が出るまで', 0, 2, 0.05, () => sv().results.typeAt, v => sv().results.typeAt = v, v => v.toFixed(2) + '秒後',
    'セクションに入って(発火して)から「事業の推進力を、」が出るまで。', { mbKey: 'sections.results.typeAt' }));
  rows.push(slider('→ タイピングが始まる', 0, 2.5, 0.05, () => (sv().results.typeGap != null ? sv().results.typeGap : 0.55), v => sv().results.typeGap = v, v => v.toFixed(2) + '秒',
    '見出し1行目からタイピング「Anyflowが支えます。」が始まるまでの間。', { mbKey: 'sections.results.typeGap' }));
  rows.push(slider('Anyflowと「が」の間', 0, 24, 1,
    () => (sv().results.slotGap != null ? sv().results.slotGap : 4),
    v => { sv().results.slotGap = v; applyResSlotGap(); }, v => Math.round(v) + 'px',
    'タイピングされる「Anyflow」と、続く「が支えます。」の間隔。', { mbKey: 'sections.results.slotGap' }));
  /* 【2026-09-21 ヒデさん依頼・構造整理】ピクトの線幅/速さ/大きさは「ピクトグラム」セクションへ移動(下の panelVarsec('picto') 配下)。
     重複していた旧「ピクトグラムの線の太さ」(0.5〜4px版)はここで削除(新しい「ピクトの線の太さ」×倍率に一本化)。 */
  rows.push(slider('→ その他の要素が出る', -0.5, 3, 0.05, () => (sv().results.restGap != null ? sv().results.restGap : 0.1), v => sv().results.restGap = v, v => v.toFixed(2) + '秒',
    'タイピング開始から、区切り線・3数値・2つの価値が出るまでの間。マイナスでタイピングより前に。', { mbKey: 'sections.results.restGap', signed: true }));
  rows.push(slider('見出しの1文字の時間', 0.02, 0.2, 0.005, () => sv().results.charDur, v => sv().results.charDur = v, v => v.toFixed(3) + 's/字',
    '案Bのみ。1文字あたりの時間。小さいほど速く打ちます。', { mbKey: 'sections.results.charDur' }));
  rows.push(slider('数字が出るまで', 0, 1.2, 0.05, () => sv().results.numsGap, v => sv().results.numsGap = v, v => Math.round(v * 100) + '%',
    '見出しが何割出たら数字が出るか。大きいほど後から出ます。', { mbKey: 'sections.results.numsGap' }));
  rows.push(slider('数字と本文が出る', 0.4, 4, 0.1, () => sv().results.softDur, v => sv().results.softDur = v, v => v.toFixed(1) + '秒',
    '線・数字・本文がぼけから出きるまで。', { mbKey: 'sections.results.softDur' }));
  /* 【2026-08-30 ヒデさん指定】「写真が出るまで」「写真の奥行き」は、いま写真を置いていないので廃止。 */

  sub(catRes, '数字が回って止まる演出');
  note('数字が桁ごとに回り、左の桁から順に止まります。');
  /* 【2026-09-19 ヒデさん依頼】スロットの案(案1=現状 / 案2=ぼかして消える)。⋯で上書き/削除可 */
  varRowX('resSlotFx', RES_SLOT_FX, () => resSlotFxKey(), v => { resApplySlotFx(String(v)); markDirty(); }, { autosave: true, snap: VAR_SNAP.resSlotFx, after: () => { if (typeof syncPanelRows === 'function') syncPanelRows(); } });
  note('案を選ぶと「上下のなじませ・ぼかしの強さ・ぼかしの範囲・窓の高さ」に値が入ります。細かく変えたら ⋯「この設定で上書き」。');
  rows.push(slider('回り出すまで', 0, 2, 0.05, () => sv().results.slotAt, v => sv().results.slotAt = v, v => v.toFixed(2) + '秒後',
    'セクションが始まってから回り出すまで。0で即。', { mbKey: 'sections.results.slotAt' }));
  rows.push(slider('1桁が止まるまで', 0.3, 3, 0.05, () => sv().results.slotDur, v => sv().results.slotDur = v, v => v.toFixed(2) + '秒',
    '長いほどゆっくり回って止まります。', { mbKey: 'sections.results.slotDur' }));
  rows.push(slider('次の桁のディレイ', 0, 0.4, 0.01, () => sv().results.slotStagger, v => sv().results.slotStagger = v, v => v.toFixed(2) + '秒',
    '大きいほど「左からパタパタ」に。0で全桁同時。', { mbKey: 'sections.results.slotStagger' }));
  rows.push(slider('何周まわすか', 1, 6, 1, () => sv().results.slotCycles, v => sv().results.slotCycles = v, v => v + '周',
    '0〜9 を何回流すか。多いほど勢いよく見えます。', { mbKey: 'sections.results.slotCycles' }));
  rows.push(slider('スロットの上下のなじませ', 0, 30, 1, () => (sv().results.slotFade != null ? sv().results.slotFade : 14), v => { sv().results.slotFade = v; applyResSlotFade(); markDirty(); }, v => Math.round(v) + '%', '数字の窓の上下を透明へグラデで消す幅(窓の高さに対する%)。0でパツッと切れる(従来)。', { mbKey: 'sections.results.slotFade', fixedMax: true }));
  rows.push(slider('上下のぼかしの強さ', 0, 8, 0.5, () => (sv().results.slotBlur != null ? sv().results.slotBlur : 0), v => { sv().results.slotBlur = v; applyResSlotFade(); markDirty(); }, v => v === 0 ? 'なし' : v.toFixed(1) + 'px',
    '案2/3用。窓の上下に重ねるぼかしの強さ(端ほど強い)。0でぼかし無し。', { mbKey: 'sections.results.slotBlur' }));
  rows.push(slider('上下のぼかしの範囲', 10, 60, 1, () => (sv().results.slotBlurZone != null ? sv().results.slotBlurZone : 45), v => { sv().results.slotBlurZone = v; applyResSlotFade(); markDirty(); }, v => Math.round(v) + '%',
    '案2/3用。窓の高さの何%までぼかしを重ねるか(上下それぞれ)。', { mbKey: 'sections.results.slotBlurZone' }));
  rows.push(slider('窓の高さ', 1, 2, 0.02, () => (sv().results.slotWin != null ? sv().results.slotWin : 1.6), v => { sv().results.slotWin = v; applyResSlotFade(); markDirty(); }, v => v.toFixed(2) + '文字分',
    '案2/3用。回っている間だけ広がる窓の高さ(1＝数字ぴったり)。高いほど前後の数字がのぞく。止まると 1.24 に戻ります。行の高さは変わりません。', { mbKey: 'sections.results.slotWin' }));
  rows.push(slider('消える長さ', 0.6, 2, 0.05, () => (sv().results.slotRamp != null ? sv().results.slotRamp : 1), v => { sv().results.slotRamp = v; applyResSlotFade(); markDirty(); }, v => '×' + v.toFixed(2),
    '案2/3/4用。端で薄くなっていく帯の長さの倍率。長いほどゆっくり溶ける(止まった時の数字には影響しない範囲で自動で縮む)。', { mbKey: 'sections.results.slotRamp' }));
  rows.push(slider('ドラムの丸み（分割数）', 8, 20, 1, () => (sv().results.slotDrumN != null ? sv().results.slotDrumN : 12), v => { sv().results.slotDrumN = v; markDirty(); }, v => Math.round(v) + '分割',
    '案4用。円筒を何分割して数字を貼るか。少ないほど丸みが強く(前後の数字が大きく傾く)、多いほど平らに近づく。', { mbKey: 'sections.results.slotDrumN' }));
  rows.push(slider('ドラムの端の薄さ', 0.5, 3, 0.1, () => (sv().results.slotDrumFade != null ? sv().results.slotDrumFade : 1.3), v => { sv().results.slotDrumFade = v; markDirty(); }, v => '×' + v.toFixed(1),
    '案4用。端(傾いた数字)をどれだけ薄くするか。大きいほど早く薄くなる。', { mbKey: 'sections.results.slotDrumFade' }));
  rows.push(slider('回り出す位置', 0.4, 1, 0.05, () => sv().results.slotEnterAt, v => sv().results.slotEnterAt = v, v => Math.round(v * 100) + '%',
    '100%＝画面の下に出た瞬間 / 50%＝真ん中まで来てから。', { mbKey: 'sections.results.slotEnterAt' }));
  rows.push(slider('止まり際の粘り', 2, 9, 0.5, () => sv().results.slotEase, v => sv().results.slotEase = v, v => '×' + v.toFixed(1),
    '大きいほど「最初は勢いよく、最後はじりじり」に。', { mbKey: 'sections.results.slotEase' }));

  /* 【2026-08-28 ヒデさん指定】2つの価値の右側ピクトグラム(各5案) */
  liveEdit = true;
  panelVarsec('picto', 'ピクトグラム');   /* 【2026-09-21 ヒデさん依頼】ここから「ピクトグラム」セクション(選択UI＋基本/エフェクト/アニメーションを入れ子で) */
  sub(catRes, 'ピクトグラム（2つの価値の右）', true, { fixed: true, grp: 'variation' });   /* For SaaS/For AI のピクト案選択＝バリエーション扱い */
  {
    const SAAS = [
      { key: 'S2', name: 'S2 双方向のやり取り', tip: '2つの箱の間を小さな四角が行き来し、届くと受け手の枠が太くなります。' },
      /* 2026-08-28 追加: 合流・重なり・時系列・パスのトリミング */
      { key: 'S7', name: 'S7 4つが1つに',      tip: '四隅の四角が中央へ集まって重なり、合流した瞬間に外周が一周描かれます。' },
      { key: 'S9', name: 'S9 弧が噛み合う',    tip: '左右から弧が伸びてきて、中央で1つの円になります。噛み合った瞬間だけ太くなります。' },
      /* 2026-08-28 追加: 躍動感・回転・奥行き */
      /* 2026-08-28 追加: 開く → グリンと回る → 重なる */
      { key: 'S18', name: 'S18 配って束ねる',     tip: '3枚が扇に開き、グリンと回って、パチンと束に戻ります。' },
    ];
    const AI = [
      /* 2026-08-28 追加: パスのトリミングで「道筋が描かれていく」＝時間の経過とストーリー */
      /* 2026-08-28 追加: 躍動感・回転・奥行き */
      { key: 'A13', name: 'A13 カードがめくれる', tip: '長方形が横幅の伸び縮みで3回めくれ、3枚目で三角が現れます。' },
      /* 2026-08-28 追加: 実行を「矢印」で表す */
      /* 2026-09-08 ヒデさん指定・追加。矢印の三角は「線が伸びきる直前にフェードイン」(トリミングしない) */
      { key: 'A21', name: 'A21 折れて進む・改（既定）', tip: '左下から折れ線が伸び、伸びきる直前に三角矢印がフェードインします（トリミングしない）。' },
      { key: 'A20', name: 'A20 レーダー', tip: '縦の棒が位相をずらして上下するだけのループ（矢印・三角なし）。' },
    ];
    /* 【2026-08-28 ヒデさん指定】どちらの案か分かるよう、見出しを付けて分ける。
       ⚠️ もとは note() で書いていたが、補足文は既定で隠しているので見えていなかった */
    const picRoot = mount;
    sub(picRoot, 'For Saas', true, { fixed: true });
    varRowX('valSaas', SAAS, () => params.patterns.valSaas || 'S9', v => { params.patterns.valSaas = v; }, { snap: VAR_SNAP.picto });
    sub(picRoot, 'For AI', true, { fixed: true });
    varRowX('valAi', AI, () => params.patterns.valAi || 'A21', v => { params.patterns.valAi = v; }, { snap: VAR_SNAP.picto });
  }
  liveEdit = false;

  /* 【2026-09-21 ヒデさん依頼・構造整理】ピクトの見た目つまみを「ピクトグラム」セクションの中へ(基本＝大きさ/線幅、アニメーション＝速さ) */
  sub(catRes, 'ピクトの大きさ・線', true, { fixed: true, grp: 'basic' });
  rows.push(slider('ピクトの大きさ', 0.5, 2, 0.05, () => (sv().results.pictoDisp != null ? sv().results.pictoDisp : 1), v => { sv().results.pictoDisp = v; applyPictoDisp(); markDirty(); }, v => '×' + v.toFixed(2), 'for SaaS / for AI のピクトグラムの表示サイズ。1=現状。スマホモード中の変更はスマホだけに反映(PC/SP独立)。', { mbKey: 'sections.results.pictoDisp', fixedMax: true }));
  rows.push(slider('ピクトの線の太さ', 0.3, 3, 0.05, () => (sv().results.pictoW != null ? sv().results.pictoW : 1), v => { sv().results.pictoW = v; valStrokeMul = v; markDirty(); drawValueIcons(); }, v => '×' + v.toFixed(2), 'for SaaS / for AI のピクトグラム(線画)の線の太さ。1=基準1px。スマホは既定0.6(細め)。', { mbKey: 'sections.results.pictoW', mbDefault: 0.6, fixedMax: true }));
  sub(catRes, 'ピクトの動き', true, { fixed: true, grp: 'anim' });
  optRow('pictoSpeed', 'ピクトの速さ', [['ゆっくり', '0.7'], ['標準', '1'], ['速め', '1.4'], ['かなり速い', '1.9']],
    () => String(sv().results.pictoSpeed != null ? sv().results.pictoSpeed : 1),
    v => { sv().results.pictoSpeed = +v; markDirty(); drawValueIcons(); });

  panelVarsec('fx', '演出');   /* 【2026-09-21】以降(つなぎ・文字)は「演出」セクションへ戻す */

  sub(catRes, '次のセクションへのつなぎ（明→黒）');
  note('実績セクションの背景が、下へスクロールするほど白→黒へ変わり、開発者体験(黒画面)へつながります。'
    + '「%」は“開発者体験セクションが画面の下から上へどれだけ入ってきたか”の割合です（0%=まだ画面外／100%=画面上端まで来た）。'
    + '暗くなると文字・図・for SaaS/for AI タグは自動で白へ反転します（どの案・どのピクトでも同じ）。');
  /* 【2026-09-08 ヒデさん指定】smoothモードの暗転を4カーブ＋開始/終了で調整＋補足を丁寧に */
  optRow('darkVar', '暗転のしかた', [['なめらか', '1'], ['ためて一気に', '2'], ['早めにゆっくり', '3'], ['直線', '4']],
    () => String(sv().results.darkVar || 2),
    v => { sv().results.darkVar = +v; markDirty(); renderFrame(); });
  note('暗転カーブ: なめらか=全体を等しくふわっと／ためて一気に=しばらく明るいまま→後半でグッと黒（ヒデさん既定）／早めにゆっくり=最初にサッと暗くなり後半ゆっくり／直線=一定速度。');
  rows.push(slider('明るいままの範囲', 0, 0.6, 0.02, () => (sv().results.darkFrom != null ? sv().results.darkFrom : 0.18),
    v => { sv().results.darkFrom = v; renderFrame(); }, v => Math.round(v * 100) + '%',
    '開発者体験がここまで画面に入るまでは明るいまま（暗転しない）。右へ動かすほど、明るい状態が長く続いてから黒へ切り替わります。0%=すぐ暗くなり始める。', { mbKey: 'sections.results.darkFrom' }));
  rows.push(slider('黒くなりきる位置', 0.3, 1, 0.02, () => (sv().results.darkTo != null ? sv().results.darkTo : 0.82),
    v => { sv().results.darkTo = v; renderFrame(); }, v => Math.round(v * 100) + '%',
    '開発者体験がここまで入ると真っ黒になりきります。「明るいまま」との差が小さいほどパッと、大きいほどゆっくり暗くなります。', { mbKey: 'sections.results.darkTo' }));
  /* 黒レクタングル案(scrollHold=固定/resTrans=black)専用スライダーは、その案の時だけ出す(紛らわしさ回避・2026-09-08) */
  if ((params.patterns && params.patterns.resTrans) === 'black') {
    note('↓は黒レクタングル案専用のスライダーです。');
    rows.push(slider('暗くなり始める', 0, 0.9, 0.02, () => sv().results.outFrom, v => sv().results.outFrom = v, v => Math.round(v * 100) + '%',
      '何割スクロールしたら黒矩形が出始めるか。', { mbKey: 'sections.results.outFrom' }));
    rows.push(slider('暗くなりきる', 0.2, 1, 0.02, () => sv().results.outTo, v => sv().results.outTo = v, v => Math.round(v * 100) + '%',
      'ここで黒矩形が全面を覆います。上との差が小さいほどパッと切り替わります。', { mbKey: 'sections.results.outTo' }));
    rows.push(slider('消える時のぼかし', 0, 40, 1, () => sv().results.outBlur, v => sv().results.outBlur = v, v => v + 'px',
      '大きいほど強くぼけながら消えます。', { mbKey: 'sections.results.outBlur' }));
  }

  sub(catRes, '文字（太さ・行間・字間）', null, { fixed: true });
  note('実績の文字ごとに 太さ・行間・字間(for SaaS/AI・価値の見出し・本文・数字も)。空欄＝今のCSSの値(カッコ内)。位置や打ち替えは ✏️編集 で文字をクリック。');
  textRowsFor(['res']);

  /* ========== 🖥 開発者体験 ========== */
  panelVarsec(null);   /* 【2026-09-21】実績タブ終わり。次タブへ持ち越さない */
  const catDev = category('開発者体験（暗い画面のコード紹介）', false);
  catNote(catDev, '暗い背景で CLI / SDK の画面が順に切り替わります。');
  panelVarsec('dev', 'モック（スタイル案）');   /* 【2026-09-21 ヒデさん依頼】主役案(モック)をセクションに→配下に基本/フォント/エフェクト/アニメーション */
  /* 【2026-09-15 ヒデさん指定】モックのスタイル案(立体感 5案・リキッドグラス含む)と配色。★ピン留め／上書き／削除は他のバリエーションと同じ */
  sub(catDev, 'モックのスタイル（立体感）', true, { fixed: true, grp: 'variation' });   /* スタイルの選択＝案の切替なのでバリエーション扱い(先頭へ) */
  varRowX('devStyle', DEV_STYLES, () => devStyleKey(), v => { params.devStyle = String(v); }, { snap: VAR_SNAP.dev, after: () => { applyDevStyle(); renderFrame(); syncDevDyn(); } });
  note('正面のまま(傾け・重ねなし)で立体感を出す10案(1〜10)と、AI らしい5案(11〜15: 光が縁を走る／オーロラ／スキャン／粒／脈)。案を選ぶと下の「この案の調整」が入れ替わります。配色とも組み合わせられます。');
  sub(catDev, 'モックの配色（スタイル案のすぐ下で選ぶ）', true, { fixed: true });
  varRowX('devTone', DEV_TONES, () => devToneKey(), v => { params.devTone = String(v); }, { snap: VAR_SNAP.dev, after: () => { applyDevStyle(); renderFrame(); } });
  /* 【2026-09-15 ヒデさん指定】案ごとのつまみ。選んでいる案のまとまりだけ出す(syncDevDyn) */
  Object.keys(DEV_DYN_SPEC).forEach(g => {
    const sp = DEV_DYN_SPEC[g];
    sub(catDev, sp.title, true, { fixed: true, grp: 'variation' });   /* 各スタイル案の調整＝案に紐づくのでバリエーション扱い(選択のすぐ下) */
    DEV_DYN[g] = catDev.lastElementChild;
    if (g === 'glass') {
      note('ガラス案は、後ろのカードを実際にぼかして「すりガラス越し」に見せています(ブラウザの仕様で backdrop-filter だけでは後ろのカードがぼけないため)。');
      rows.push(slider('ガラスのぼかし', 0, 48, 1, () => (sv().dev.mockBlur != null ? sv().dev.mockBlur : 24), v => { sv().dev.mockBlur = v; applyDevStyle(); }, v => Math.round(v) + 'px', '板ごしの地のぼけ具合(効く環境では backdrop-filter も併用)。', { mbKey: 'sections.dev.mockBlur', fixedMax: true }));
    }
    sp.rows.forEach(r => {
      if (r.seg) { segRow(r.label, r.seg, () => devDynGet(g, r), v => { devStv(g)[r.k] = v; applyDevStyle(); markDirty(); renderFrame(); }); return; }
      rows.push(slider(r.label, r.min, r.max, r.step, () => devDynGet(g, r), v => { devStv(g)[r.k] = v; applyDevStyle(); }, r.fmt, r.hint, { fixedMax: true, mbKey: 'sections.dev.stv.' + g + '.' + r.k }));
    });
  });
  syncDevDyn();
  sub(catDev, '全部の案に効く調整', true, { fixed: true });
  rows.push(slider('内側の影・光', 0, 2, 0.05, () => (sv().dev.mockInner != null ? sv().dev.mockInner : 1), v => { sv().dev.mockInner = v; applyDevStyle(); }, v => Math.round(v * 100) + '%', 'インナーシャドウ／インナーグロー／縁の光の強さ。', { mbKey: 'sections.dev.mockInner', fixedMax: true }));
  rows.push(slider('影の濃さ', 0, 1.5, 0.05, () => (sv().dev.mockShadow != null ? sv().dev.mockShadow : 1), v => { sv().dev.mockShadow = v; applyDevStyle(); }, v => Math.round(v * 100) + '%', '各案の落ち影の濃さ。', { mbKey: 'sections.dev.mockShadow', fixedMax: true }));

  /* 【2026-09-20 ヒデさん依頼・#10】①②それぞれ 見出し↔モックの間隔・モックの大きさ(PCのみ。SPは別スケール) */
  sub(catDev, '①② 見出しとモックの間隔・大きさ（PC）');
  rows.push(slider('① 見出し↔モックの間隔', 0, 90, 2, () => (sv().dev.dev1Gap != null ? sv().dev.dev1Gap : 36), v => { sv().dev.dev1Gap = v; applyDevTune(); }, v => Math.round(v) + 'px', '開発者体験①の見出しとモックの上下の間隔。', { mbKey: 'sections.dev.dev1Gap', fixedMax: true }));
  rows.push(slider('① モックの大きさ', 0.7, 1.6, 0.02, () => (sv().dev.dev1Scale != null ? sv().dev.dev1Scale : 1.1), v => { sv().dev.dev1Scale = v; applyDevTune(); }, v => Math.round(v * 100) + '%', '開発者体験①のモックの拡大率。', { mbKey: 'sections.dev.dev1Scale', fixedMax: true }));
  rows.push(slider('② 見出し↔モックの間隔', 0, 120, 2, () => (sv().dev.dev2Gap != null ? sv().dev.dev2Gap : 36), v => { sv().dev.dev2Gap = v; applyDevTune(); }, v => Math.round(v) + 'px', '開発者体験②の見出しと、正面のモック(カード)の上下の間隔(見た目どおり)。①と同じ意味で、既定36px＝①と同じ。', { mbKey: 'sections.dev.dev2Gap', fixedMax: true }));
  rows.push(slider('② モックの大きさ', 0.7, 1.6, 0.02, () => (sv().dev.dev2Scale != null ? sv().dev.dev2Scale : 1.1), v => { sv().dev.dev2Scale = v; applyDevTune(); }, v => Math.round(v * 100) + '%', '開発者体験②のモックの拡大率。', { mbKey: 'sections.dev.dev2Scale', fixedMax: true }));

  sub(catDev, '基本（長さ）');
  sectionLenSlider('dev', 1600);

  /* 【2026-09-16 ヒデさん指定】①②で中央に来たら一旦止まる(固定スクロール) */
  sub(catDev, '①②で一旦止まる（固定スクロール）');
  note('①「開発スピードを加速」と②「開発環境に柔軟に適応」が、中央に来たら固定されて一旦止まり、スクロールすると次へ進みます（PC のみ）。');
  optRow('devPinStops', '①②で止まる', [['止まる', 'on'], ['止まらない（通常）', 'off']],
    () => ((sv().dev.pinStops !== 'off') ? 'on' : 'off'),
    v => { sv().dev.pinStops = v; fit(); renderFrame(); });
  rows.push(slider('止まっている長さ', 30, 160, 5, () => (sv().dev.devDwell != null ? sv().dev.devDwell : 90), v => { sv().dev.devDwell = v; fit(); }, v => Math.round(v) + 'vh',
    '各章が中央で止まっている距離。長いほど、しっかり止まって見えます。', { mbKey: 'sections.dev.devDwell', fixedMax: true }));

  /* 【2026-08-30 ヒデさん指定】② はテキストスライド固定(既定)。リスト/スライドの選択UIは廃止。 */
  sub(catDev, '② の見出しのスロット（API / CLI / SDK の箱）', true, { fixed: true });
  rows.push(slider('箱の上下の位置', -30, 30, 1, () => (sv().dev.slotBoxY != null ? sv().dev.slotBoxY : 0), v => { sv().dev.slotBoxY = v; applyDsBox(); }, v => (v > 0 ? '+' : '') + Math.round(v) + 'px',
    'マイナスで上へ、プラスで下へ。文字の並びには影響しません(見た目だけ動かします)。', { mbKey: 'sections.dev.slotBoxY', signed: true, fixedMax: true }));
  rows.push(slider('箱の高さ', 24, 64, 1, () => (sv().dev.slotBoxH != null ? sv().dev.slotBoxH : 42), v => { sv().dev.slotBoxH = v; applyDsBox(); }, v => Math.round(v) + 'px',
    'グレーの箱の高さ。文字(34px)より少し大きいと収まりがよくなります。', { mbKey: 'sections.dev.slotBoxH', fixedMax: true }));

  sub(catDev, '② の出入り（スクロール位置）');
  note('② は dev1 と同じくスクロール位置で出入りします（時間再生ではないので上に戻っても急に消えません）。');
  const dsVpNote = noteLive(() => { const m = sv().dev.vpMode || 'center';
    return m === 'bottom' ? '下部基準: 画面に入ってすぐ出しきる（早め）。' : m === 'top' ? '上部基準: 中央より上まで来てから出しきる（遅め）。' : '中央基準: dev1 と同じタイミング。'; });
  optRow('devVpMode', '② の出入りの基準', [['下部で出す', 'bottom'], ['中央で出す', 'center'], ['上部で出す', 'top']],
    () => (sv().dev.vpMode || 'center'),
    v => { sv().dev.vpMode = v; dsVpNote(); renderFrame(); });
  note('↓ CLI/SDK/API の箱が「左右に割れて開く」動きは時間再生（ゆったり）。登場後に自動で開きます。');
  rows.push(slider('割れ始めるまでの間', 0, 2, 0.05, () => sv().dev.splitDelay, v => sv().dev.splitDelay = v, v => v.toFixed(2) + '秒',
    '② が登場してから、箱が左右に割れ始めるまでの待ち時間。', { mbKey: 'sections.dev.splitDelay' }));
  rows.push(slider('割れきる時間（ゆったり）', 0.2, 3, 0.05, () => sv().dev.splitDur, v => sv().dev.splitDur = v, v => v.toFixed(2) + '秒',
    '箱が完全に開ききるまでの時間。大きいほどゆったり開きます。', { mbKey: 'sections.dev.splitDur' }));

  sub(catDev, 'スロット（切替タイミング）');
  /* 【2026-09-09 ヒデさん指定】切替モーションは「スナップ」に固定＝焼き込み。フリップ/ブラー/横押し/ズーム/キューブと
     選択UIは削除。実装は applyDsMotion(d.slideMotion || 'snap') が既定 snap なので挙動不変。 */
  rows.push(slider('スナップのキレ', 1, 6, 0.2, () => sv().dev.slideSnapK, v => sv().dev.slideSnapK = v, v => '×' + v.toFixed(1),
    'スナップの切替の急さ。大きいほどメリハリが強く（スナップ選択時）。', { mbKey: 'sections.dev.slideSnapK' }));
  rows.push(slider('自動で切り替わる間隔', 1.5, 8, 0.1, () => sv().dev.slideEvery, v => sv().dev.slideEvery = v, v => v.toFixed(1) + '秒',
    'CLI→SDK→API が自動で次へ進む間隔。', { mbKey: 'sections.dev.slideEvery' }));
  rows.push(slider('切り替えにかける時間', 0.2, 1.5, 0.05, () => sv().dev.slideDur, v => sv().dev.slideDur = v, v => v.toFixed(2) + '秒',
    '1回の切替アニメの長さ。短いほどパキッと。', { mbKey: 'sections.dev.slideDur' }));

  /* 【2026-08-30 ヒデさん指定】リスト案用の「画面が切り替わる見え方 / 後ろに重なるカード / コードの見せ方」は廃止
     (② はテキストスライド固定のため)。関連パラメータは既定のまま残るが、パネルからは出さない。 */

  sub(catDev, '文字（太さ・行間・字間）', null, { fixed: true });
  note('開発者体験の文字ごとに 太さ・行間・字間。空欄＝今のCSSの値(カッコ内)。');
  textRowsFor(['dev']);

  /* ========== 🗂 導入事例 ========== */
  panelVarsec(null);   /* 【2026-09-21】開発者体験タブ終わり */
  const catCase = category('導入事例（2×2グリッド）', false);
  catNote(catCase, '見出し → 水平線が左から3本 → 中央の縦線 → カードが画面に入った順に1枚ずつブラーで登場。');

  /* 【2026-09-17 大掃除・ヒデさん指定】罫線(あり/なし)とホバーの動きの選択UIは削除。罫線なし(caseLayout=1)・影でふわっと浮く(ct-lift)に固定＝焼き込み。 */
  /* 【2026-09-20 大改修】再生時間→アニメ・ぼかし→エフェクト に分割(ビジョンと統一) */
  sub(catCase, 'セクション（再生）', false, { grp: 'anim' });
  sectionLenSlider('cases', 1000);
  rows.push(slider('全体の再生時間', 3, 20, 0.5, () => sv().cases.playSec, v => sv().cases.playSec = v, v => v.toFixed(1) + '秒',
    '見出し〜カードまで出そろうのにかける時間。小さいほどキビキビ。', { mbKey: 'sections.cases.playSec' }));
  sub(catCase, '出現のぼかし', false, { grp: 'fxtex' });
  rows.push(slider('強さ', 0, 40, 1, () => sv().cases.inBlur, v => sv().cases.inBlur = v, v => v + 'px',
    '大きいほど強くぼけた状態から現れます。※貼りつけない時は無効。', { mbKey: 'sections.cases.inBlur' }));

  sub(catCase, '① 見出し「導入事例」', null, { grp: 'anim' });   /* 中身は出現タイミングのみ＝アニメーション */
  note('「%」は、前の暗い画面が明るく戻る動きの進み具合です。');
  rows.push(slider('見出しが出る', 0, 1, 0.02, () => sv().cases.introAt, v => sv().cases.introAt = v, v => Math.round(v * 100) + '%',
    '何割進んだら見出しが出はじめるか。小さいほど早く見えます。', { mbKey: 'sections.cases.introAt' }));
  rows.push(slider('見出しが出きるまで', 0.05, 1, 0.02, () => sv().cases.introDur, v => sv().cases.introDur = v, v => v.toFixed(2) + '秒',
    '「導入事例」の文字がぼけから出きるまでの時間。', { mbKey: 'sections.cases.introDur' }));

  /* 【2026-09-17 大掃除】「② 罫線が引かれる」のつまみは削除(罫線なしに固定したので効かない) */
  sub(catCase, '② カードが1枚ずつブラーで登場');
  /* 【2026-09-19 ヒデさん依頼】4枚同時(2026-08-30 確定)→ 1枚ずつに変更。起点は再生進捗ではなく「カード自身が画面に入った時点」 */
  note('カードはそれぞれ「自分が画面に入った時点」を起点に、1枚目→2枚目→3枚目→4枚目の順にディレイしてブラーで出ます(旧: 4枚同時)。ぼけの強さは上の「基本」。');
  rows.push(slider('次のカードのディレイ', 0, 0.6, 0.02, () => (sv().cases.cardStagger != null ? sv().cases.cardStagger : 0.18), v => sv().cases.cardStagger = v, v => v.toFixed(2) + '秒',
    '1枚目が出はじめてから次のカードが出はじめるまでの間。同じ行の2枚はこの間隔で前後します。下の行が遅れて画面に入った分は差し引かれます。', { mbKey: 'sections.cases.cardStagger' }));
  rows.push(slider('1枚が出きるまで', 0.05, 1, 0.02, () => sv().cases.cardDur, v => sv().cases.cardDur = v, v => v.toFixed(2),
    '1枚がぼけから出きるまでの長さ。', { mbKey: 'sections.cases.cardDur' }));

  /* 【2026-09-22 ヒデさん依頼】カードの上下パディング(スマホ)。カードが縦積みなので、この値×2＝カード間の余白。詰めるとカードが近づく。--cg-pad-y へ */
  sub(catCase, 'カード（スマホ）', null, { grp: 'basic' });
  rows.push(slider('上下パディング', 4, 48, 2, () => (sv().cases.cardPadY != null ? sv().cases.cardPadY : 24), v => { sv().cases.cardPadY = v; applyCasesPad(); markDirty(); }, v => Math.round(v) + 'px',
    'スマホの導入事例カードの上下の余白。カードは縦積みなので、この値×2 がカード同士の隙間になります。詰めるとカードが近づきます。既定24px。', { mbKey: 'sections.cases.cardPadY', grp: 'basic' }));

  /* 【2026-08-30 ヒデさん指定】カードのホバーは「パスのトリミング(trim)」固定(既定)。選択UIは廃止。
     ホバーは case-grid の data-hover(= params.patterns.caseHover)で常に適用される。 */
  liveEdit = false;

  /* 【2026-08-30 ヒデさん指定】コンバージョンは導入事例の下（ページ順と同じ並び）に置く。 */
  sub(catCase, '文字（太さ・行間・字間）', null, { fixed: true });
  note('導入事例の文字ごとに 太さ・行間・字間(見出し・Use Case・カードの一言/タグ/会社名)。空欄＝今のCSSの値(カッコ内)。');
  textRowsFor(['case']);

  const catCv = category('コンバージョン（お問い合わせの流れる背景）', false);
  catNote(catCv, 'カンプのラジアルグラデを、惑星と同じ発想で流れさせ、Bayerディザで粒立たせています。');
  panelVarsec('cv', 'お問い合わせ（案）');   /* 【2026-09-21 ヒデさん依頼】主役案をセクションに→配下に4カテゴリ */
  const cvv = () => (params.cv || (params.cv = {}));
  /* 【2026-09-21 ヒデさん依頼】お問い合わせ背景グラデの「ウェーブ」調整(速さ/強さ/うねり)。エフェクト節に格納。値はシェーダのuniformで毎フレーム反映 */
  sub(catCv, 'ウェーブ（流れる背景）', null, { fixed: true, grp: 'fxtex' });   /* ※「流れる速さ」は既存(下の別ブロック)にあるので重複させない */
  rows.push(slider('波の速さ', 0, 0.4, 0.005, () => (cvv().waveSpd != null ? cvv().waveSpd : 0.11), v => { cvv().waveSpd = v; markDirty(); }, v => v.toFixed(3), 'うねり(波)が動く速さ。', { mbKey: 'cv.waveSpd', fixedMax: true }));
  rows.push(slider('波の強さ', 0, 0.6, 0.01, () => (cvv().wave != null ? cvv().wave : 0.13), v => { cvv().wave = v; markDirty(); }, v => v.toFixed(2), '大きなうねりの振幅。大きいほど波打ちます。', { mbKey: 'cv.wave', fixedMax: true }));
  rows.push(slider('うねりの長さ', 0.1, 2, 0.05, () => (cvv().waveLen != null ? cvv().waveLen : 0.85), v => { cvv().waveLen = v; markDirty(); }, v => v.toFixed(2), 'うねりの波長。小さいほど細かく波打ちます。', { mbKey: 'cv.waveLen', fixedMax: true }));
  rows.push(slider('うねり（ふくらみ）', 0, 0.4, 0.01, () => (cvv().swell != null ? cvv().swell : 0.12), v => { cvv().swell = v; markDirty(); }, v => v.toFixed(2), '色のふくらみ(swell)。', { mbKey: 'cv.swell', fixedMax: true }));
  /* 【2026-09-21 ヒデさん依頼】フォームの磨りガラス(バックドロップ・ぼかし/彩度)は「エフェクト」節へ */
  sub(catCv, 'フォーム（磨りガラス）', null, { fixed: true, grp: 'fxtex' });
  const _cg = () => (params.cvfGlass = params.cvfGlass || {});
  rows.push(slider('フォームのぼかし（バックドロップ）', 0, 40, 1, () => (_cg().blur != null ? _cg().blur : 22), v => { _cg().blur = v; applyCvfGlass(); markDirty(); }, v => Math.round(v) + 'px', 'フォームの磨りガラスのぼかし量(backdrop-filter)。', { mbKey: 'cvfGlass.blur', fixedMax: true }));
  rows.push(slider('フォームの彩度', 1, 2.2, 0.05, () => (_cg().sat != null ? _cg().sat : 1.5), v => { _cg().sat = v; applyCvfGlass(); markDirty(); }, v => v.toFixed(2), 'フォームの磨りガラスの彩度。上げると背景の色が残ります。', { mbKey: 'cvfGlass.sat', fixedMax: true }));
  /* 【2026-09-16 ヒデさん確定】お問い合わせは「フッター一体型・溶け込む」(ID10)で確定。
     案を選ぶ項目はパネルから削除し、既定値として固定した。
     ⚠️ CV_STYLES の他の案(0/11/12/13)の定義と CSS は残してあるので、
        比べ直したくなったら URL ?cv=0 などで一時的に切り替えられる。 */
  /* 【2026-09-15 ヒデさん指定】カラー案(10案)。選ぶとその案の値が下のつまみに入る。つまみで細かく変えたら ⋯「いまの設定で上書き」でその案に保存 */
  /* 【2026-09-16 ヒデさん依頼】カラー案・グラデの色・暗さ・明るさコントラストのセクションは削除(デザインカンプで確定)。値は焼き込み(cvColorBy CK / ramp comp)に残るので見た目は不変 */
  /* 【V5.0 2026-09-16 ヒデさん依頼】UX再設計: 部品化して「見せ方3案」で組み替える。似た項目(グラデの形が2箇所 等)を1つの“もの”にまとめ、必要な時だけ出す。 */
  const isForm = () => String(params.cvCta || 'button') === 'form';
  const gizmoBtn = () => { const gb = document.createElement('button'); gb.type = 'button'; gb.id = 'cvGizmoBtn'; gb.className = 'cvg-editbtn'; gb.textContent = '🎯 グラデーションを棒で編集'; gb.onclick = () => { const sec = document.getElementById('conversion'); if (sec) sec.scrollIntoView({ block: 'center', behavior: 'smooth' }); cvGizmo.toggle(); }; (mount || body).appendChild(gb); };
  const B = {
    cta() {
      varRowX('cvCta', CV_CTAS, () => String(params.cvCta || 'button'), v => { params.cvCta = String(v); }, { after: () => { applyCvStyle(); renderFrame(); if (typeof buildPanel === 'function') buildPanel(); } });
      note('現行はボタン遷移。「フォーム（直置き）」にすると、見出し・本文の下に自作フォームを置きます(送信先は無し=見た目のみ)。切り替えると下に必要な項目だけ出ます。');
    },
    formStyle() {
      /* 【2026-09-17 大掃除・ヒデさん指定】リキッドグラス5案の選択は削除。「リキッドグラス（明）」(formStyle=1) に固定＝焼き込み。横幅と細かい調整だけ残す */
      rows.push(slider('フォームの横幅', 440, 960, 10, () => (params.formWidth != null ? params.formWidth : 660), v => { params.formWidth = v; applyCvStyle(); }, v => Math.round(v) + 'px', 'お問い合わせフォームの横幅。広いほどゆったり。画面が狭い時は自動で収まります(最大94%)。', { mbKey: 'formWidth', fixedMax: true }));
      /* 【2026-09-17 ヒデさん依頼】背景・バックドロップフィルター・プレースホルダーの色味を後から個別調整できるように(白飛び対策) */
      const _g = () => (params.cvfGlass = params.cvfGlass || {});
      /* 【2026-09-18 ヒデさん指定】「フォーム裏の明るさ上限」は見た目が想像と違うため取り下げ(既定 100%=効かない)。代わりに上の「流れ・ゆらゆら」の白い光の案(7〜9)で対応 */
      rows.push(slider('フォームの角丸', 0, 48, 1, () => (_g().radius != null ? _g().radius : 22), v => { _g().radius = v; applyCvfGlass(); }, v => Math.round(v) + 'px', 'フォームのカード全体の角の丸さ。', { mbKey: 'cvfGlass.radius', fixedMax: true }));
      rows.push(slider('入力欄の角丸', 0, 30, 1, () => (_g().inR != null ? _g().inR : 10), v => { _g().inR = v; applyCvfGlass(); }, v => Math.round(v) + 'px', '入力欄・セレクトの角の丸さ。', { mbKey: 'cvfGlass.inR', fixedMax: true }));
      /* 【2026-09-18 ヒデさん依頼】外枠の線とプレースホルダーも変えられるように */
      optRow('cvfCardBorder', 'カードの枠線の色', [['白系', 'w'], ['黒系', 'k']], () => (_g().bDark ? 'k' : 'w'), v => { _g().bDark = v === 'k'; applyCvfGlass(); });
      rows.push(slider('カードの枠線の太さ', 0, 4, 0.5, () => (_g().bw != null ? _g().bw : 1), v => { _g().bw = v; applyCvfGlass(); }, v => v.toFixed(1) + 'px', 'フォームのカードの外枠の線の太さ。0で線なし。', { mbKey: 'cvfGlass.bw', fixedMax: true }));
      rows.push(slider('カードの枠線の濃さ', 0, 1, 0.02, () => (_g().ba != null ? _g().ba : 0.66), v => { _g().ba = v; applyCvfGlass(); }, v => Math.round(v * 100) + '%', '外枠の線の不透明度。', { mbKey: 'cvfGlass.ba', fixedMax: true }));
      optRow('cvfInBorder', '入力欄の枠線の色', [['白系', 'w'], ['黒系', 'k']], () => (_g().inBDark ? 'k' : 'w'), v => { _g().inBDark = v === 'k'; applyCvfGlass(); });
      rows.push(slider('入力欄の枠線の太さ', 0, 4, 0.5, () => (_g().inBw != null ? _g().inBw : 1), v => { _g().inBw = v; applyCvfGlass(); }, v => v.toFixed(1) + 'px', '入力欄・セレクトの枠線の太さ。0で線なし。', { mbKey: 'cvfGlass.inBw', fixedMax: true }));
      rows.push(slider('入力欄の枠線の濃さ', 0, 1, 0.02, () => (_g().inBa != null ? _g().inBa : 0.72), v => { _g().inBa = v; applyCvfGlass(); }, v => Math.round(v * 100) + '%', '入力欄の枠線の不透明度。', { mbKey: 'cvfGlass.inBa', fixedMax: true }));
      optRow('cvfPh', 'プレースホルダーの色', [['黒系', 'k'], ['白系', 'w']], () => (_g().phDark === false ? 'w' : 'k'), v => { _g().phDark = v !== 'w'; applyCvfGlass(); });
      rows.push(slider('カードの色の透過率', 0, 0.9, 0.02, () => (_g().bgA != null ? _g().bgA : 0.5), v => { _g().bgA = v; applyCvfGlass(); }, v => Math.round(v * 100) + '%', 'フォームカードの色の濃さ(透過率)。下げるほど背景が透けます。', { mbKey: 'cvfGlass.bgA', fixedMax: true }));
      colorRow('カードの色', () => (_g().bgColor || '#ffffff'), v => { _g().bgColor = v; applyCvfGlass(); markDirty(); }, 'フォームカードの色そのもの。既定は白。透過率は上のつまみで。');   /* 【2026-09-21 ヒデさん依頼】色自体を変えられるように */
      /* 【2026-09-21 ヒデさん依頼】ぼかし(バックドロップ)と彩度は「エフェクト」節へ移動(下の別 sub フォーム(磨りガラス)) */
      rows.push(slider('入力欄の白さ', 0, 0.9, 0.02, () => (_g().inA != null ? _g().inA : 0.56), v => { _g().inA = v; applyCvfGlass(); }, v => Math.round(v * 100) + '%', '入力欄の地色の白さ。', { mbKey: 'cvfGlass.inA', fixedMax: true }));
      rows.push(slider('プレースホルダーの濃さ', 0.1, 0.6, 0.02, () => (_g().phA != null ? _g().phA : 0.32), v => { _g().phA = v; applyCvfGlass(); }, v => Math.round(v * 100) + '%', '「Anyflow株式会社」等の見本文字の濃さ。白飛びで見えにくい時は上げる。', { mbKey: 'cvfGlass.phA', fixedMax: true }));
      note('セクション自体の色味・グラデーションは、下の「背景グラデーション」「色の移ろい」「粒（ディザ）」で調整できます。');
    },
    gradForm() {
      varRowX('cvForm', CV_FORMS, () => cvFormKey(), v => { cvApplyForm(String(v)); }, { after: () => { applyCvStyle(); renderFrame(); if (typeof syncPanelRows === 'function') syncPanelRows(); } });
      note('グラデの“形”。放射(現行)／縦グラデ／放射やわらか／斜め。色は現行のまま。');
    },
    gradGeom() {
      segRow('形（詳細）', [['カンプ', 0], ['放射', 1], ['線形', 2]], () => (cvv().gMode || 0), v => { cvv().gMode = v; markDirty(); renderFrame(); });
      gizmoBtn();
      note('棒編集: 両端で角度・広がり、途中で中心。下の数値と連動します。');
      rows.push(slider('中心 横', 0, 1, 0.01, () => (cvv().gcx != null ? cvv().gcx : 0.60), v => { cvv().gcx = v; }, v => Math.round(v * 100) + '%', '明るい中心の横位置。0=左端 / 100%=右端。', { mbKey: 'cv.gcx' }));
      rows.push(slider('中心 縦', 0, 1, 0.01, () => (cvv().gcy != null ? cvv().gcy : 0.00), v => { cvv().gcy = v; }, v => Math.round(v * 100) + '%', '明るい中心の縦位置。0=上端 / 100%=下端。', { mbKey: 'cv.gcy' }));
      rows.push(slider('広がり', 0.2, 2.5, 0.02, () => (cvv().gr != null ? cvv().gr : 0.9), v => { cvv().gr = v; }, v => '×' + v.toFixed(2), '小さいほど色が早く変わり、大きいほどゆるやか。', { mbKey: 'cv.gr' }));
      rows.push(slider('縦横比', 0.4, 2.5, 0.02, () => (cvv().gAspect != null ? cvv().gAspect : 1), v => { cvv().gAspect = v; }, v => '×' + v.toFixed(2), '放射を横長(>1)・縦長(<1)に。', { mbKey: 'cv.gAspect' }));
      rows.push(slider('回転', 0, 360, 1, () => (cvv().gAng || 0), v => { cvv().gAng = v; }, v => Math.round(v) + '°', '楕円・線形の向き。', { mbKey: 'cv.gAng' }));
    },
    dither() {
      rows.push(slider('粗さ（ドット）', 1, 8, 0.5, () => cvv().cell, v => { cvv().cell = v; }, v => v.toFixed(1) + 'px', '大きいほど粗い。1でカンプ。', { mbKey: 'cv.cell' }));
      rows.push(slider('階調（レベル）', 2, 12, 1, () => cvv().levels, v => { cvv().levels = v; }, v => Math.round(v) + '段', '少ないほどディザが強く。カンプは3段。', { mbKey: 'cv.levels' }));
      rows.push(slider('ディザの散り', 0, 2, 0.05, () => cvv().spread, v => { cvv().spread = v; }, v => '×' + v.toFixed(2), '大きいほど粒感。', { mbKey: 'cv.spread' }));
    },
    flow() {
      /* 【2026-09-18 ヒデさん依頼】白い光の居場所(右上を漂う)の案。⋯で削除/上書き可 */
      varRowX('cvSway', CV_SWAYS, () => cvSwayKey(), v => { params.cvSway = String(v); cvApplySway(String(v)); }, { autosave: true, snap: VAR_SNAP.cvSway, after: () => { applyCvStyle(); renderFrame(); if (typeof syncPanelRows === 'function') syncPanelRows(); } });
      note('現行＝今の動き。案1〜3＝白い光が右上のあたりを漂い、フォームまで流れ込まないようにした案。案4＝白を軸に揺らす。案5・6＝案4の動き＋色の入れ替わり(白はそのまま)。どの案も「動き」と「色」を丸ごと決めるので、案を切り替えれば前の案の色設定は残らない。選んでから下のつまみで微調整→⋯「この設定で上書き」。');
      /* 【2026-09-19】色の入れ替わり(案5・6)の細かい調整。案1〜4では効かない(hueMode=off) */
      rows.push(slider('色の入れ替わり: 1周の時間', 8, 180, 2, () => (cvv().moodSec != null ? cvv().moodSec : 30), v => { cvv().moodSec = v; }, v => Math.round(v) + '秒', '案5・6で色が一周する時間。長いほどゆっくり。案1〜4では効きません。', { mbKey: 'cv.moodSec', fixedMax: true }));
      rows.push(slider('色の入れ替わり: 留まる割合', 0, 0.9, 0.05, () => (cvv().swapHold != null ? cvv().swapHold : 0.45), v => { cvv().swapHold = v; }, v => Math.round(v * 100) + '%', '案5・6で、各状態に留まる時間の割合(1区間のうち)。0で常に移り変わり続ける。', { mbKey: 'cv.swapHold', fixedMax: true }));
      rows.push(slider('揺らぎの軸（画面中心 ↔ 白い光）', 0, 1, 0.05, () => (cvv().swayPivot != null ? cvv().swayPivot : 0), v => { cvv().swayPivot = v; }, v => Math.round(v * 100) + '%', '0%=画面の中心を軸に傾ける(白い光は弧を描いて動く)／100%=白い光の中心を軸に(白は動かず周りだけ揺れる)。', { mbKey: 'cv.swayPivot', fixedMax: true }));
      rows.push(slider('白を取る（中心の開始色）', 0, 0.6, 0.01, () => (cvv().coreSkip != null ? cvv().coreSkip : 0), v => { cvv().coreSkip = v; }, v => v === 0 ? '白から' : '×' + v.toFixed(2), 'いちばん明るい中心を、白ではなく色の途中から始める(0.26=淡ブルー / 0.34=案7 / 0.59=シアン)。白い領域が無くなる。', { mbKey: 'cv.coreSkip', fixedMax: true }));
      rows.push(slider('白の縁のぼかし', 0, 0.25, 0.01, () => (cvv().coreSoft != null ? cvv().coreSoft : 0), v => { cvv().coreSoft = v; }, v => '×' + v.toFixed(2), '白い光の周りの色の切り替わりをやわらかく(白の大きさは変えない)。0=くっきり / 案7 は 0.12。', { mbKey: 'cv.coreSoft', fixedMax: true }));
      rows.push(slider('白の絞り', 0, 3, 0.1, () => (cvv().core != null ? cvv().core : 0), v => { cvv().core = v; }, v => '×' + v.toFixed(1), '白い光の芯だけを小さくする(周りの色の広がりは変えない)。0=そのまま / 案7 は 1.2。', { mbKey: 'cv.core', fixedMax: true }));
      rows.push(slider('白い光の近くのうねりを弱める', 0, 1, 0.05, () => (cvv().waveAnchor != null ? cvv().waveAnchor : 0), v => { cvv().waveAnchor = v; }, v => Math.round(v * 100) + '%', '白い光の周り(半径15〜55%)だけ「うねり」を弱めて、白がフォームへ流れ込まないようにする。', { mbKey: 'cv.waveAnchor', fixedMax: true }));
      rows.push(slider('流れる速さ', 0, 1, 0.02, () => cvv().speed, v => { cvv().speed = v; }, v => '×' + v.toFixed(2), 'グラデが流れる速さ。0で停止。', { mbKey: 'cv.speed' }));
      rows.push(slider('うねりの強さ', 0, 0.6, 0.02, () => cvv().swell, v => { cvv().swell = v; }, v => '×' + v.toFixed(2), '流れのゆらぎ。', { mbKey: 'cv.swell' }));
      rows.push(slider('流れの細かさ', 0.3, 8, 0.1, () => cvv().flowScale, v => { cvv().flowScale = v; }, v => '×' + v.toFixed(1), '大きいほど細かい流れ。', { mbKey: 'cv.flowScale' }));
      rows.push(slider('大きなうねり', 0, 0.35, 0.005, () => (cvv().wave != null ? cvv().wave : 0.13), v => { cvv().wave = v; }, v => '×' + v.toFixed(3), 'なめらかな大波。粒っぽくなりません。', { mbKey: 'cv.wave', fixedMax: true }));
      rows.push(slider('ゆらゆら（傾き）', 0, 14, 0.5, () => (cvv().swayDeg != null ? cvv().swayDeg : 5), v => { cvv().swayDeg = v; }, v => v.toFixed(1) + '°', '全体がゆっくり左右に傾く。0で停止。', { mbKey: 'cv.swayDeg', fixedMax: true }));
      rows.push(slider('ゆらゆらの周期', 6, 90, 1, () => (cvv().swaySec != null ? cvv().swaySec : 26), v => { cvv().swaySec = v; }, v => Math.round(v) + '秒', '1往復の時間。長いほどゆったり。', { mbKey: 'cv.swaySec', fixedMax: true }));
    },
    edge() {
      varRowX('cvEdge', CV_EDGES, () => cvEdgeKey(), v => { applyCvEdge(String(v)); }, { after: () => { applyCvStyle(); renderFrame(); if (typeof syncPanelRows === 'function') syncPanelRows(); } });
      rows.push(slider('溶け込みの深さ', 60, 520, 10, () => (cvv().blend != null ? cvv().blend : CV_BLEND_DEF), v => { cvv().blend = v; applyCvStyle(); renderFrame(); }, v => Math.round(v) + 'px', '色が満色になるまでの距離。大きいほど徐々に溶け、境目の線が出ません。', { mbKey: 'cv.blend', fixedMax: true }));
    },
    spacing() {
      rows.push(slider('見出しの上の余白', 0, 400, 10, () => (cvv().headTop != null ? cvv().headTop : CV_HEAD_TOP_DEF), v => { cvv().headTop = v; applyCvStyle(); fit(); }, v => Math.round(v) + 'px', '減らすほど導入事例との間が詰まります。', { mbKey: 'cv.headTop', fixedMax: true }));
      rows.push(slider('上に足す高さ', 0, 600, 10, () => (cvv().addT != null ? cvv().addT : 0), v => { cvv().addT = v; applyCvStyle(); }, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', '見出しの上に色の面を足す。', { mbKey: 'cv.addT', fixedMax: true }));
      rows.push(slider('下に足す高さ', 0, 600, 10, () => (cvv().addB != null ? cvv().addB : 0), v => { cvv().addB = v; applyCvStyle(); }, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'ボタンの下(フッターとの間)に足す。', { mbKey: 'cv.addB', fixedMax: true }));
      rows.push(slider('導入事例との間隔', -120, 300, 5, () => (cvv().gapTop || 0), v => { cvv().gapTop = v; applyCvStyle(); }, v => (v > 0 ? '+' : '') + Math.round(v) + 'px', 'あいだの余白。マイナスは導入事例の下の空きを詰めます(カードが切れない所で自動停止)。', { mbKey: 'cv.gapTop', signed: true }));
    },
  };
  /* 【V5.0 2026-09-16 ヒデさん依頼】要素別に固定。CTAの中に「フォーム」が入る等の“包含関係”を入れ子(cv-subg)で見せる。
     絵文字・番号は付けない(後の改修がしやすいように)。階層の見せ方だけ5案(cvHier)で切替。 */
  const subgroup = (label, fn) => {
    const g = document.createElement('div'); g.className = 'cv-subg';
    if (label) { const l = document.createElement('div'); l.className = 'cv-subg-lab'; l.textContent = label; g.appendChild(l); }
    (mount || body).appendChild(g);
    const prev = mount; mount = g; try { fn(); } finally { mount = prev; }
  };
  catCv.classList.add('hier-1');   /* 見せ方＝インデント固定(焼き込み) */
  /* 【2026-09-17 大掃除・ヒデさん指定】見せ方(5案)/CTA案(ボタン↔フォーム)/リキッドグラス5案/背景グラデ案(0〜3)/形の詳細(中心・広がり・回転・棒で編集)/
     境界(溶け込み)/余白・高さ の選択UIは削除。今の値(フォーム直置き・明るいリキッドグラス・放射グラデ・標準の溶け込み・余白120/0/0/60)に固定＝焼き込み。 */
  sub(catCv, 'フォーム（横幅・磨りガラスの細かい調整）', false, { grp: 'basic' }); B.formStyle();
  /* 【2026-09-26 ヒデさん依頼】ボタンの矢印の線幅(実寸px・PC/SP別)。ヘッダーの「お問い合わせ」とセクションの「フォームを記入」共通 */
  sub(catCv, 'ボタン（矢印）', false, { grp: 'basic' });
  rows.push(slider('矢印の線幅', 0.5, 4, 0.1, () => (cvv().ctaArrowW != null ? cvv().ctaArrowW : 2), v => { cvv().ctaArrowW = v; applyCtaArrow(); }, v => v.toFixed(1) + 'px',
    'お問い合わせボタンの矢印の線の太さ(画面上の実寸)。ヘッダーの「お問い合わせ」とお問い合わせセクションの「フォームを記入」の両方に効きます。旧は0.9px。', { mbKey: 'cv.ctaArrowW', mbDefault: 2 }));   /* 横幅などフォームの基本設定なので基本扱い(文字より前へ) */
  sub(catCv, '粒（ディザ）と流れ'); B.dither();
  /* 【2026-09-19 ヒデさん依頼】「グラデの案（動き・色）と流れ」の欄は削除(使わないため)。お問い合わせ背景グラデの動き・色は現在の params.cv のまま固定。 */

  sub(catCv, '文字（太さ・行間・字間）', null, { fixed: true });
  note('お問い合わせとフッターの文字ごとに 太さ・行間・字間(Contact・見出し・本文・フォームの項目名/入力欄・送信ボタン・フッター)。空欄＝今のCSSの値(カッコ内)。');
  textRowsFor(['cv']);

  /* ========== 🍔 ハンバーガーメニュー (2026-09-18 ヒデさん依頼) ========== */
  panelVarsec(null);   /* 【2026-09-21】コンバージョンタブ終わり */
  const catMenu = category('ハンバーガーメニュー（右上を押した先の画面）', false);
  catNote(catMenu, '左寄せ大の暗いメニュー。余白・項目の間隔・文字サイズはここ、太さ/行間/字間は下の「文字」。右上の✏️編集でも触れます。');
  sub(catMenu, '余白・間隔', null, { fixed: true });
  { const D = () => (params.drawer = params.drawer || {});
    const dv = (k, def) => (D()[k] != null ? D()[k] : def);
    const ds = (label, k, def, min, max, step, fmt, tip) => rows.push(slider(label, min, max, step, () => dv(k, def), v => { D()[k] = v; applyDrawerTune(); markDirty(); }, fmt, tip, { fixedMax: true, signed: min < 0, mbKey: 'drawer.' + k }));
    ds('上の余白', 'padT', 0, -200, 400, 4, v => Math.round(v) + 'px', 'メニュー全体の上の余白。マイナスで上へ寄せます。');
    ds('下の余白', 'padB', 0, -200, 400, 4, v => Math.round(v) + 'px', 'メニュー全体の下の余白。');
    ds('左の余白', 'padL', 130, 0, 600, 4, v => Math.round(v) + 'px', '左端からメニューまでの余白(以前は 9vw≒130px)。');
    ds('右の余白', 'padR', 0, 0, 600, 4, v => Math.round(v) + 'px', 'メニューの右の余白。');
    ds('項目の間隔（上下）', 'gap', 24, 0, 120, 2, v => Math.round(v) + 'px', 'ビジョン／提供できること… の行と行の間。以前は10px。');
    sub(catMenu, '文字サイズ', false, { grp: 'font' });   /* 【2026-09-20 ヒデさん依頼】文字サイズはフォント節へ */
    ds('項目の文字サイズ', 'fs', 56, 24, 120, 1, v => Math.round(v) + 'px', 'メニュー項目の文字サイズ。');
    ds('番号の文字サイズ', 'numFs', 14, 8, 40, 1, v => Math.round(v) + 'px', '01〜04 の番号の文字サイズ。');
    /* 【2026-09-20 ヒデさん依頼C】重複する「アイコンの線の」を小見出し「アイコンの線」にまとめ、中は 長さ/太さ/間隔 に(冗長排除) */
    sub(catMenu, 'アイコンの線', false);   /* 右上のハンバーガー(2本線) */
    ds('長さ', 'barW', 20, 12, 36, 1, v => Math.round(v) + 'px', '右上のハンバーガー(2本線)の横幅。');
    ds('太さ', 'barH', 2, 1, 5, 0.5, v => v.toFixed(1) + 'px', '2本の線の太さ。');
    ds('間隔', 'barGap', 7, 2, 14, 0.5, v => v.toFixed(1) + 'px', '2本の線の上下の間隔(線の中心どうし)。');
    sub(catMenu, 'その他', false);
    ds('スクロール時のナビのぼかし', 'navBlur', 8, 0, 24, 1, v => Math.round(v) + 'px', 'スクロールでナビ(ビジョン〜導入事例)が右へ格納される時、徐々にかかるぼかしの最大量。0でぼかし無し。');
  }
  sub(catMenu, '文字（太さ・行間・字間）', null, { fixed: true });
  note('メニューの項目・番号・お問い合わせボタンの 太さ・行間・字間。空欄＝今のCSSの値(カッコ内)。');
  textRowsFor(['menu']);

  /* 【2026-09-20 ヒデさん依頼・パネル整理】全カテゴリを組み終えたので、各タブの小見出しを
     いつも同じ順(バリエーション→基本→フォント→カラー→テクスチャ→アニメーション)に並べ替える。 */
  applyPanelGroupOrder();

  /* ボタン。
     ⚠️【2026-08-19 ヒデさん指定】「動きを止める」「先頭から見直す」は削除。
        触った値がそのまま次回の既定になる自動保存もやめて、
        【保存を押した時だけ残る】形にした。 */
  const btns = document.createElement('div');
  btns.className = 'btns';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'primary';
  /* 【2026-08-26 ヒデさん指定】いまの値を「最初に出る状態」として確定させるボタン */
  syncSaveBtn = () => {
    saveBtn.textContent = dirty ? 'デフォルトに設定（未保存）' : 'デフォルトに設定';
    saveBtn.classList.toggle('dirty', dirty);
  };
  saveBtn.onclick = () => {
    save();
    dirty = false;
    syncSaveBtn();
    try { if (typeof exitEditMode === 'function') exitEditMode(); } catch (e) {}   /* 【2026-09-19 ヒデさん依頼】保存したら編集モードを抜ける */
    saveBtn.textContent = '✅ デフォルトにしました';
    setTimeout(syncSaveBtn, 1600);
  };
  syncSaveBtn();
  /* 【2026-09-01 ヒデさん指定】「デプロイしてもKVが反映されない」対策。
     ローカルの調整・案の選択はこのブラウザ(localStorage)にしか残らないため、
     本番に載せるには 書き出し→Claudeに渡す→焼き込みデプロイ が必要。
     いままでコンソールで打っていたワンライナーをボタン1つにした(中身は同じダンプ形式)。 */
  const exportBtn = document.createElement('button');
  exportBtn.textContent = '設定書き出し';
  exportBtn.title = 'いまのブラウザの設定ぜんぶを anyflow-settings.json としてダウンロードします。これをClaudeに渡すと、同じ見た目を本番に焼き込めます。';
  exportBtn.onclick = () => {
    try { save(); } catch (e) {}
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('anyflow-')) dump[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(dump)], { type: 'application/json' });
    const aEl = document.createElement('a');
    aEl.href = URL.createObjectURL(blob);
    aEl.download = 'anyflow-settings.json';
    aEl.click();
    URL.revokeObjectURL(aEl.href);
    try { if (typeof exitEditMode === 'function') exitEditMode(); } catch (e) {}   /* 【2026-09-19】書き出し=保存なので編集モードを抜ける */
    exportBtn.textContent = '✅ 書き出しました（Claudeに渡してください）';
    setTimeout(() => { exportBtn.textContent = '設定書き出し'; }, 2200);
  };
  /* 【2026-09-02 ヒデさん指定】案の完全削除リストのコピー。
     パネルの「🗑削除」は隠すだけ(=「消した案を戻す」で復活できる)。コードから恒久的に消す(完全削除)には
     Claudeに焼き込んでもらう必要があるので、いま隠している案の一覧をワンタップでコピーできるようにする。 */
  const purgeBtn = document.createElement('button');
  purgeBtn.textContent = 'バリエーション削除';
  purgeBtn.title = 'いま「削除」で隠している案の一覧をコピーします。Claudeに貼って「完全削除して」と言えば、コードから恒久的に消してもらえます。';
  purgeBtn.onclick = () => {
    try { save(); } catch (e) {}
    /* 【2026-09-15 ヒデさん指定・最新化】焼き込み済み(コードから消えている)案は控えから外し、「まだ焼き込んでいない案」だけを出す。空のまとまりは載せない */
    hiddenListRefresh();
    const nonEmpty = v => Array.isArray(v) ? v.length > 0 : !!(v && typeof v === 'object' && Object.keys(v).length);
    const pick = src => { const o = {}; for (const m in (src || {})) { if (nonEmpty(src[m])) o[m] = JSON.parse(JSON.stringify(src[m])); } return o; };
    const payload = { hidden: pick(params.gfxVariantHidden), trash: pick(params.gfxPresetTrash) };
    const nHid = Object.values(payload.hidden).reduce((a, b) => a + (Array.isArray(b) ? b.length : 1), 0);
    const text = (nHid
      ? '【完全削除の依頼】以下の案を VARIANT_REMOVED_EXTRA に焼き込んで、コードから恒久的に消してください。(焼き込み済みの案は含めていません)\n'
      : '【完全削除の依頼】新しく消した案はありません(いま隠している案はすべて焼き込み済みです)。\n')
      + JSON.stringify(payload, null, 1);
    const done = () => {
      purgeBtn.textContent = '✅ コピーしました（Claudeに貼ってください）';
      setTimeout(() => { purgeBtn.textContent = 'バリエーション削除'; }, 2600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
    function fallbackCopy(t, cb) {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove(); cb();
    }
  };
  /* 【2026-08-26 ヒデさん指定】下の「元に戻す」は廃止。各項目の右端にある ↺ で個別に戻す */
  /* 【2026-09-15 ヒデさん指定】タブの中身: body 直下の大カテゴリ(.cat)を集め、選んだ1つだけ出す。選択はブラウザに記憶(無ければ開いていたカテゴリ) */
  { const cats = [...body.querySelectorAll(':scope > .cat')];
    const titles = cats.map(c => ((c.querySelector('.cat-head > span') || {}).textContent || '').trim());
    let cur = null; try { cur = localStorage.getItem(PANEL_TAB_KEY); } catch (e) {}
    if (!titles.includes(cur)) { const iOpen = cats.findIndex(c => !c.classList.contains('closed')); cur = titles[iOpen >= 0 ? iOpen : 0] || ''; }
    const showTab = t => {
      cats.forEach((c, i) => { const onT = titles[i] === t; c.classList.toggle('tab-on', onT); if (onT) { c.classList.remove('closed'); catOpen[titles[i]] = true; } });
      panTabs.querySelectorAll('.pan-tab').forEach(b => b.classList.toggle('on', b.dataset.t === t));
      /* 【2026-09-20 ヒデさん依頼】タブは横1列＋横スクロール。選んだタブが画面外でも中央に寄せる */
      try { const onB = panTabs.querySelector('.pan-tab.on'); if (onB && panTabs.clientWidth) { const target = onB.offsetLeft - (panTabs.clientWidth - onB.offsetWidth) / 2; panTabs.scrollTo({ left: Math.max(0, target), behavior: 'smooth' }); } } catch (e) {}
      try { localStorage.setItem(PANEL_TAB_KEY, t); } catch (e) {}
    };
    panTabs.innerHTML = '';
    titles.forEach(t => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pan-tab'; b.dataset.t = t;
      b.textContent = t.split('（')[0].trim(); b.title = t;
      b.onclick = () => { showTab(t); body.scrollTop = 0; };
      panTabs.appendChild(b);
    });
    body.classList.toggle('tabbed', cats.length > 1);
    if (cats.length > 1) showTab(cur);
  }
  btns.append(saveBtn, exportBtn, purgeBtn);
  body.appendChild(btns);

  /* 【2026-08-28 ヒデさん指定】「いまの設定をコピーする」ボタンは削除。 */
  const saveNote = document.createElement('div');
  saveNote.className = 'grp-note keep';
  saveNote.style.margin = '6px 0 0';
  saveNote.textContent = '調整は自動でこのブラウザに保存されます(リロード・ブラウザを閉じてもOK)。'
    + '本番サイトに反映したい時は「⬇ 設定を書き出す」を押して、出てきたファイルをClaudeに渡してください。';
  body.appendChild(saveNote);
  body.scrollTop = keepScroll;         // 見ていた位置に戻す
}
buildPanel();
applyMarquee();
/* 【2026-09-15】URL でも切替: ?cl=0|1(罫線) / ?ch=trim|cardtrim|ct-lift|ct-tight|ct-panel(ホバー) */
try { const _cl = location.search.match(/[?&]cl=(\d)(?:&|$)/); if (_cl && CASE_LAYOUTS.some(c => c.key === _cl[1])) params.patterns.caseLayout = _cl[1];
      const _ch = location.search.match(/[?&]ch=([a-z-]+)(?:&|$)/); if (_ch && CASE_HOVERS.some(c => c.key === _ch[1])) params.patterns.caseHover = _ch[1]; } catch (e) {}
applyCaseHover();   /* 導入事例のホバー案を初期反映 (2026-08-27) */
applyCaseLayout();  /* 導入事例の罫線あり/なしを初期反映 (2026-09-15) */
/* URL ?cvc=C1〜C11 でカラー案(選んでいるデザイン案に紐づく)。全部の定義が済んだここで読む(早い位置だと variantRemovedKey が未定義で黙って失敗していた・実測) */
/* 【2026-09-15】開発者体験モックの案も URL で確認できるように: ?dev=0〜15 / ?devt=dark|graphite|blue|cyan|pink */
try { const _dv = location.search.match(/[?&]dev=(\d{1,2})(?:&|$)/); if (_dv && DEV_STYLES.some(d => d.key === _dv[1])) params.devStyle = _dv[1];
      const _dt = location.search.match(/[?&]devt=([a-z]+)(?:&|$)/); if (_dt && DEV_TONES.some(d => d.key === _dt[1])) params.devTone = _dt[1]; } catch (e) {}
try { const _cvc = location.search.match(/[?&]cvc=(C\d{1,2})(?:&|$)/); if (_cvc && CV_COLORS.some(s => s.key === _cvc[1])) { params.cvColorBy = params.cvColorBy || {}; params.cvColorBy[cvStyleKey()] = _cvc[1]; cvApplyColorFull(_cvc[1]); } } catch (e) {}
cvApplyForm(cvFormKey());   /* 【2026-09-16】グラデの形を初期反映(放射/縦/斜め) */
applyCvEdge(cvEdgeKey());   /* 【2026-09-16】溶け込みの深さを初期反映(blend も案の値に) */
applyHdrMode(hdrModeKey());  /* 【V5.0】追従ヘッダーの案を初期反映＋固定化 */
applyHdrMotion();            /* 【V5.0 2026-09-17】ヘッダー変形のイージング/速さを初期反映 */
applyKvCopy();               /* 【2026-09-17】ヘッダーが固定(全幅)になった後にロゴ左端を測り直す(KVコピーの左端をロゴに揃える) */
addEventListener('resize', () => { try { applyKvCopy(); } catch (e) {} try { applyGrid(); } catch (e) {} });
addEventListener('load', () => { try { applyKvCopy(); } catch (e) {} });
/* 【2026-09-21 ヒデさん依頼・Y12】スマホプレビュー枠(iframe ?preview=1)を、親の保存(localStorage)に合わせてリアルタイム再適用。
   同 origin なので storage イベントで受けられる(実機の別origin/SSEとは別経路)。パネルで数値を変える→親が save→iframe が即再描画。 */
function __previewReapply() {
  try {
    var mainText = localStorage.getItem(STORAGE_KEY); if (!mainText) return;
    var newP = JSON.parse(mainText); if (!newP || typeof newP !== 'object') return;
    for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k) && !(k in newP)) delete params[k]; }
    Object.assign(params, newP);
    try { var ps = localStorage.getItem('anyflow-gfx-presets'); if (ps) { var stp = JSON.parse(ps); if (stp) { params.gfxVarOverride = stp.over || {}; params.gfxPresets = stp.presets || {}; params.gfxPresetOn = stp.on || {}; params.gfxVariantHidden = stp.hidden || {}; params.gfxFav = stp.fav || []; params.gfxPresetTrash = stp.trash || {}; } } } catch (e) {}
    var C = function (fn) { try { fn(); } catch (e) {} };
    try { vfMesh = null; } catch (e) {}
    C(function () { applyKvVariant(kvVarKey(), true); });
    C(function () { varApplyOverridesAtStartup(); });
    C(function () { applyMbToParams(); });   /* SP専用値は案の再適用の後(順序重要) */
    C(function () { applyKvCopy(); }); C(function () { applyVpSize(); }); C(function () { applyVisEmph(); });
    C(function () { textTools.applyAll(); }); C(function () { applyVfFade(); }); C(function () { applyGrid(); });
    C(function () { applyDevTune(); }); C(function () { applyCvfGlass(); }); C(function () { applyCvStyle(); });
    C(function () { if (typeof applySway === 'function') applySway(); });
    C(function () { if (typeof visApplyGrad === 'function') { visApplyGrad(visGradKey()); if (typeof applyVisGrad === 'function') applyVisGrad(); } });
    C(function () { if (typeof resApplySlotFx === 'function') resApplySlotFx(resSlotFxKey()); });
    C(function () { if (typeof applyResProd === 'function') applyResProd(); });
    C(function () { if (typeof applyMarquee === 'function') applyMarquee(); });
    C(function () { if (typeof fit === 'function') fit(); });
    C(function () { renderFrame(); });
  } catch (e) {}
}
window.__previewReapply = __previewReapply;
addEventListener('storage', function (e) {
  if (!document.documentElement.classList.contains('pp-inner')) return;   /* プレビューiframeの中だけ反応 */
  if (e.key === STORAGE_KEY || e.key === 'anyflow-gfx-presets') { try { __previewReapply(); } catch (er) {} }
});
bindHdrScroll();             /* 【V5.0】追従ヘッダーのスクロール監視を設置 */
bindDrawer();                /* 【V5.0】ハンバーガーのドロワー開閉を設置 */
applyCvStyle();     /* お問い合わせのデザイン案を初期反映 (2026-09-15) */
applyVisGrad();     /* ビジョンの揺らぎのグラデ案を初期反映 (2026-09-15) */
try { applyDevTune(); } catch (e) {}   /* 【2026-09-20 #10】見出し↔モック間隔・モック拡大 */
applyDevStyle();    /* 開発者体験モックのスタイル案を初期反映 (2026-09-15) */

/* パネル開閉 */
const panel = document.getElementById('panel');
/* ===== 調整パネルの移動 (ヘッダーをドラッグ) =====
   .tools は既定で right/bottom 固定。動かし始めたら left/top 指定に切り替える */
const toolsEl = document.querySelector('.tools');
/* パネルが画面からはみ出さないように、上端の位置を押し戻す。
   ⚠️ right/bottom 固定のまま（＝一度も動かしていない）なら、
      背が伸びた分は自然に上へ伸びるので何もしなくてよい */
function keepPanelInView() {
  if (!toolsEl.style.top || toolsEl.style.top === 'auto') return;
  /* 下側ははみ出してよい。つまむヘッダーが画面に残るところまでを上限にする(2026-08-27 修正) */
  const headEl = document.getElementById('panelHead');
  const headH = (headEl && headEl.offsetHeight) || 44;
  const max = Math.max(8, (window.innerHeight || 0) - headH - 8);
  let top = parseFloat(toolsEl.style.top);
  if (!isFinite(top)) return;
  if (top > max) top = max;
  if (top < 8) top = 8;
  toolsEl.style.top = top + 'px';
}
window.addEventListener('resize', keepPanelInView);

/* ===== 調整パネルのサイズ変更: 上下・左右の辺をつかむ (2026-08-27 ヒデさん指定) =====
   ブラウザ標準の resize は右下だけなので、4辺ぶんのつまみを自前で足す。
   上辺・左辺は「掴んだ端を動かす」ので、位置(top/left)も一緒に動かす。 */
(() => {
  const panelEl = document.getElementById('panel');
  if (!panelEl) return;
  const MINW = 240, MINH = 120;
  for (const side of ['t', 'b', 'l', 'r']) {
    const z = document.createElement('div');
    z.className = 'pz pz-' + side;
    panelEl.appendChild(z);
    z.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      try { z.setPointerCapture(e.pointerId); } catch (_) {}
      const r = toolsEl.getBoundingClientRect();
      const st = { x: e.clientX, y: e.clientY, w: r.width, h: r.height, left: r.left, top: r.top };
      /* 掴んだ瞬間に left/top 指定へ切り替える。中央そろえの transform も外す(飛び防止) */
      toolsEl.style.transform = 'none';
      toolsEl.style.left = r.left + 'px';
      toolsEl.style.top = r.top + 'px';
      toolsEl.style.right = 'auto';
      toolsEl.style.bottom = 'auto';
      const move = ev => {
        const dx = ev.clientX - st.x, dy = ev.clientY - st.y;
        if (side === 'r') panelEl.style.width = Math.max(MINW, st.w + dx) + 'px';
        if (side === 'b') panelEl.style.height = Math.max(MINH, st.h + dy) + 'px';
        if (side === 'l') {
          const w = Math.max(MINW, st.w - dx);
          panelEl.style.width = w + 'px';
          toolsEl.style.left = (st.left + (st.w - w)) + 'px';
        }
        if (side === 't') {
          const h = Math.max(MINH, st.h - dy);
          panelEl.style.height = h + 'px';
          toolsEl.style.top = (st.top + (st.h - h)) + 'px';
        }
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }
})();

(() => {
  const tools = toolsEl;
  const head = document.getElementById('panelHead');
  /* 【2026-08-27 ヒデさん指定】掴める場所が狭かったので、ヘッダーだけでなく
     パネルの中身の「何も無い所」でも掴んで動かせるようにする。
     スライダー・ボタン・入力欄など“操作するもの”の上では移動しない。 */
  const dragZones = [head, document.getElementById('panelBody')].filter(Boolean);
  const isControl = (t) => !!(t && t.closest && t.closest(
    'input, button, select, textarea, .sw-pill, .rst, .gbtn, .seg, .np-f, .pz, .sw-copy, a'));
  let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, dragging = false;
  const onDown = e => {
    if (document.documentElement.classList.contains('mb')) return;   /* 【2026-09-09】スマホはボトムシート(グリップのスワイプ)操作なので、移動ドラッグは無効 */
    if (e.button !== 0) return;
    if (e.currentTarget !== head && isControl(e.target)) return;   /* 操作するものの上では動かさない */
    /* ⚠️【2026-08-19 バグ修正】ここで left/top 指定へ切り替えていたのが原因で、
       【ヘッダーを押しただけ】でも上端固定になっていた。
       閉じている時は下の方にいるので、そこから開くと背が 46px → 520px に伸びて
       下へ突き抜け、画面外へ458pxはみ出していた（実測）。
       位置の記録だけして、実際に動かし始める(pointermove で3px超)まで CSS は触らない。 */
    const r = tools.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    moved = false; dragging = true;
  };
  const onMove = e => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) + Math.abs(dy) <= 3) return;   /* まだ「押しただけ」。何もしない */
    if (!moved) {
      /* ここで初めて「動かしている」と判断して、left/top 指定へ切り替える。
         ⚠️【2026-08-27 バグ修正】CSS の上下中央そろえ(transform: translateY(-50%))が
            残ったまま top を指定すると、掴んだ瞬間に半分ぶん跳ねて【飛んで見えた】。
            位置指定に切り替える時は transform を必ず外す。 */
      moved = true;
      tools.style.transform = 'none';
      tools.style.left = ox + 'px';
      tools.style.top = oy + 'px';
      tools.style.right = 'auto';
      tools.style.bottom = 'auto';
    }
    /* ⚠️【2026-08-27 バグ修正】以前は「パネル全体が画面に収まる」ところまでしか動かせず、
       背の高いパネルだと下へほとんど動かせなかった(実測: 高さ361/画面392 で上限23px)。
       Figma のパネルと同じく、下側ははみ出してよい。【つまむヘッダーが画面に残る】所までにする。 */
    const w = tools.offsetWidth;
    const headH = (head && head.offsetHeight) || 44;
    tools.style.left = Math.min(Math.max(0, ox + dx), innerWidth - Math.min(w, 120)) + 'px';
    tools.style.top = Math.min(Math.max(0, oy + dy), Math.max(8, innerHeight - headH - 8)) + 'px';
  };
  const onUp = () => { dragging = false; };
  for (const z of dragZones) z.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  /* ドラッグした時は、開閉トグルなどのクリックを発火させない */
  for (const z of dragZones) {
    z.addEventListener('click', e => { if (moved) { e.stopImmediatePropagation(); moved = false; } }, true);
  }
})();

/* 【2026-08-27 ヒデさん指定】アコーディオンは基本【下へ開く】。
   画面の下の方にいて下へ伸ばせない時だけ【上へ開く】(上端を持ち上げる)。 */
function openPanelDownward() {
  /* right/bottom 固定のまま(＝一度も動かしていない)なら、CSS の上下中央そろえに任せる */
  if (!toolsEl.style.top || toolsEl.style.top === 'auto') return;
  const top = parseFloat(toolsEl.style.top);
  if (!isFinite(top)) return;
  const h = toolsEl.offsetHeight;
  const room = (window.innerHeight || 0) - top - 8;
  if (h <= room) return;                       /* 下に入るならそのまま(下開き) */
  /* 下に入りきらない時だけ、入る範囲で上へ持ち上げる(上開き)。
     持ち上げすぎて画面上端を越えないようにする */
  const up = Math.max(0, Math.min(h - room, top - 8));
  if (up > 0) toolsEl.style.top = (top - up) + 'px';
}
document.getElementById('panelHead').addEventListener('click', () => {
  if (document.documentElement.classList.contains('mb')) return;   /* 【2026-09-09】スマホはグリップのスワイプで開閉するのでクリック開閉は無効 */
  panel.classList.toggle('closed');
  requestAnimationFrame(openPanelDownward);
  /* 開いて背が伸びた分で画面外へ出ないように押し戻す（動かしたあとの位置の時だけ効く） */
  keepPanelInView();
});

/* ===== 【2026-09-09 ヒデさん指定】スマホ: Googleマップ風ボトムシート =====
   上部のグリップをスワイプ: 下げるとピーク(見出しだけ)/格納、上げると画面半分まで展開。スナップ付き。 */
(() => {
  const tools = toolsEl;
  const panel = document.getElementById('panel');
  const head = document.getElementById('panelHead');
  if (!tools || !panel) return;
  const grip = document.createElement('div');
  grip.className = 'panel-grip';
  panel.insertBefore(grip, panel.firstChild);
  const isMB = () => document.documentElement.classList.contains('mb');
  let dragging = false, startY = 0, startTY = 0, curTY = 0;
  const sheetH = () => panel.getBoundingClientRect().height || 1;
  const peekPx = () => (grip.offsetHeight || 12) + (head ? head.offsetHeight : 40);
  const peekTY = () => Math.max(0, sheetH() - peekPx());
  const syncPeekVar = () => document.documentElement.style.setProperty('--sheet-peek', peekPx() + 'px');
  const applyTY = ty => { curTY = ty; tools.style.transform = 'translateY(' + ty + 'px)'; };
  const snapOpen = () => { tools.classList.add('sheet-open'); tools.style.transform = ''; curTY = 0; };
  const snapPeek = () => { tools.classList.remove('sheet-open'); tools.style.transform = ''; curTY = peekTY(); };
  const hideSheet = () => { tools.classList.add('tools-hidden'); tools.classList.remove('sheet-open'); tools.style.transform = ''; try { sessionStorage.setItem('anyflow-tools-secret', '0'); } catch (_) {} };
  syncPeekVar(); window.addEventListener('resize', syncPeekVar);
  const start = e => {
    if (!isMB()) return;
    dragging = true; startY = e.clientY;
    startTY = tools.classList.contains('sheet-open') ? 0 : peekTY();
    curTY = startTY;
    tools.classList.add('sheet-dragging'); tools.classList.remove('sheet-open');
    tools.style.transform = 'translateY(' + startTY + 'px)';
    try { grip.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault(); e.stopPropagation();
  };
  const move = e => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    applyTY(Math.max(0, Math.min(peekTY() + 90, startTY + dy)));
    e.preventDefault();
  };
  const end = e => {
    if (!dragging) return;
    dragging = false; tools.classList.remove('sheet-dragging');
    const p = peekTY(); const dy = ((e && e.clientY) || startY) - startY;
    if (curTY > p + 40 && dy > 40) hideSheet();     /* ピークからさらに下げた → 格納 */
    else if (curTY < p * 0.5) snapOpen();           /* 半分以上上げた → 展開 */
    else snapPeek();                                /* それ以外 → ピークへスナップ */
  };
  grip.addEventListener('pointerdown', start);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
})();

/* ===== 【2026-09-09 ヒデさん指定】ヘッダーのホバーアニメ(ナビ5案/ボタン5案)＋ロゴでトップへ ===== */
(() => {
  const header = document.querySelector('.header');
  if (!header) return;
  /* ナビ(お問い合わせ以外)のテキストを2段構造にラップ(ロール用)。他の案でも同じ構造でOK。 */
  header.querySelectorAll('.nav-links a').forEach(a => {
    const t = a.textContent.trim();
    a.innerHTML = '<span class="nlab"><span>' + t + '</span><span aria-hidden="true">' + t + '</span></span>';
  });
  /* 黒ボタンのテキストを <span> に(矢印/塗りの前面化用) */
  const cta = header.querySelector('.cta');
  if (cta && cta.children.length === 0) cta.innerHTML = '<span>' + cta.textContent.trim() + '</span>';
  /* 【2026-09-09 ヒデさん確定】テキスト=上下ロール / ボタン=矢印 に固定(焼き込み・選択パネルは削除)。 */
  header.dataset.navhover = 'roll';
  header.dataset.btnhover = 'arrow';
  /* コンバージョンの「フォームを記入」ボタンも同じ矢印アニメにする(テキストを <span> にラップ)。 */
  const cvBtn = document.querySelector('.cv-btn');
  if (cvBtn && cvBtn.children.length === 0) cvBtn.innerHTML = '<span>' + cvBtn.textContent.trim() + '</span>';
  /* ロゴ(ヘッダー/フッター)クリックでホームのトップへ。透過フェード＋スムーズスクロール。 */
  const toTop = e => {
    if (e) e.preventDefault();
    document.documentElement.classList.add('to-top-fade');
    try { if (window.lenis && lenis.scrollTo) lenis.scrollTo(0, { duration: 1.0 }); else window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (_) { window.scrollTo(0, 0); }
    setTimeout(() => document.documentElement.classList.remove('to-top-fade'), 620);
  };
  const hlogo = header.querySelector('.logo');
  if (hlogo) hlogo.addEventListener('click', toTop);
  const flogo = document.querySelector('.ft-logo');
  if (flogo) flogo.addEventListener('click', toTop);
})();
/* ===== サイト全体の直接編集 (2026-08-29 ヒデさん指定) =====
   ✏️編集モード中は、KVだけでなくサイト内の主要オブジェクトをドラッグで直接動かせる。
   動かした量は既存の位置パラメータへ書くので、「これをデフォルトに設定」で保存できる。
   対象: Visionの軌道グラフィック(noPinX/noPinY) / Point01(p1X/p1Y) / Point02(p2X/p2Y) / KVグラフィック(kv.gx/gy) */
const siteEdit = (() => {
  const V = () => params.sections.vision;
  const TARGETS = [
    { el: () => document.getElementById('vfWrap'),  name: 'Visionグラフィック（SVG）',
      /* 【2026-09-19】図は SVG 書き出し(#vfWrap)。位置ずらしは文字システムと同じ edits.vfWrap.dx/dy(旧 noPinX/noPinY は使わない) */
      get: () => { const e = (params.edits && params.edits.vfWrap) || {}; return { x: e.dx || 0, y: e.dy || 0 }; },
      set: (x, y) => { params.edits = params.edits || {}; params.edits.vfWrap = Object.assign(params.edits.vfWrap || {}, { dx: Math.round(x), dy: Math.round(y) }); if (typeof textTools !== 'undefined' && textTools.applyAll) textTools.applyAll(); } },
    { el: () => document.getElementById('valP1'), name: 'Point 01',
      get: () => ({ x: V().p1X || 0, y: V().p1Y || 0 }),
      set: (x, y) => { V().p1X = Math.round(x); V().p1Y = Math.round(y); } },
    { el: () => document.getElementById('valP2'), name: 'Point 02',
      get: () => ({ x: V().p2X || 0, y: V().p2Y || 0 }),
      set: (x, y) => { V().p2X = Math.round(x); V().p2Y = Math.round(y); } },
    { el: () => document.querySelector('.orbit'), name: 'KVグラフィック',
      get: () => ({ x: params.kv.gx || 0, y: params.kv.gy || 0 }),
      set: (x, y) => { params.kv.gx = Math.round(x); params.kv.gy = Math.round(y); } },
  ];
  let on = false;
  function scaleOf(el) {
    /* 画面px → 設計px の換算。要素の見かけ幅 ÷ レイアウト幅 = 祖先ぶくみの実効スケール */
    const w = el.offsetWidth;
    if (!w) return 1;
    const k = el.getBoundingClientRect().width / w;
    return k > 0.01 ? k : 1;
  }
  /* 【2026-08-29 ヒデさん指定】オブジェクトの複数選択。選択中(.se-sel)はまとめてドラッグできる。 */
  const selection = new Set();
  function syncSel() {
    for (const t of TARGETS) { const el = t.el(); if (el) el.classList.toggle('se-sel', selection.has(t)); }
  }
  const SE_EDGE = 14;   /* 【2026-09-03 ヒデさん指定】この幅ぶんの外周が「移動をつかむ枠」 */
  function nearEdge(el, e) {
    const r = el.getBoundingClientRect();
    return (e.clientX - r.left < SE_EDGE) || (r.right - e.clientX < SE_EDGE)
        || (e.clientY - r.top < SE_EDGE) || (r.bottom - e.clientY < SE_EDGE);
  }
  function onDown(e) {
    if (!on) return;
    const t = this.__seTarget;
    /* 【2026-09-03 ヒデさん指定】Figma風: バウンディングボックスの端(SE_EDGE)をつかむと移動、
       中のテキストの上は移動せずテキスト編集(シングル=ツールバー / ダブル=打ち替え)に譲る。
       テキストを含まないグラフィック(orbit等)は全面で移動。 */
    const onText = e.target.closest && e.target.closest('.tt-hit');
    if (onText && !nearEdge(this, e)) return;   /* 内側のテキスト → 移動しない(click/dblclickでtextToolsが処理) */
    e.preventDefault(); e.stopPropagation();
    /* Shift/⌘/Ctrlクリックで選択に足し引き。通常クリックは、そのオブジェクトだけを選択
       (すでに選択済みなら、選択を保ったまま複数まとめてドラッグ)。 */
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      if (selection.has(t)) selection.delete(t); else selection.add(t);
    } else if (!selection.has(t)) {
      selection.clear(); selection.add(t);
    }
    syncSel();
    if (!selection.has(t)) return;   /* Shiftで選択を外した時はドラッグしない */
    /* 選択中の全オブジェクトの「今の位置・実効スケール」を控え、同じ移動量で一緒に動かす */
    const starts = [...selection].map(tt => ({ t: tt, p: tt.get(), k: scaleOf(tt.el()) }));
    const sx = e.clientX, sy = e.clientY;
    const move = ev => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) window.__ttDragged = true;   /* 2026-09-03: ドラッグ後はテキスト選択しない */
      for (const s of starts) s.t.set(s.p.x + dx / s.k, s.p.y + dy / s.k);
      markDirty(); renderFrame();
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }
  function set(v) {
    on = !!v;
    document.documentElement.classList.toggle('site-edit', on);
    if (!on) selection.clear();
    for (const t of TARGETS) {
      const el = t.el(); if (!el) continue;
      el.classList.toggle('se-hit', on);
      if (!on) el.classList.remove('se-sel');
      if (on && !el.__seBound) {
        el.__seTarget = t;
        el.addEventListener('pointerdown', onDown);
        /* 端＝移動カーソル / 内側のテキスト＝テキストカーソル(Figma風の見え方) */
        el.addEventListener('pointermove', ev => {
          if (!on) return;
          const onT = ev.target.closest && ev.target.closest('.tt-hit');
          const c = nearEdge(el, ev) ? 'move' : (onT ? 'text' : 'move');
          el.style.cursor = c;
          if (onT) onT.style.cursor = c;   /* テキストの上でも端に近ければ移動カーソル */
        });
        el.__seBound = true;
      }
      if (!on) el.style.cursor = '';
    }
    if (on) syncSel();
  }
  return { set, get on() { return on; } };
})();

/* ===== 【2026-09-03 ヒデさん指定】汎用テキスト編集レイヤー =====
   編集モード中、トップページの主要テキストをクリックすると浮きツールバーが出て、
   Figmaのように サイズ / ウェイト / 行間 / 字間 / 余白 を数値で変えられ、打ち替えもできる。
   保存は params.edits[key]（トップ全体で共有・案非依存）。rvAt が触るのは opacity/filter/transform
   だけなので、font系プロパティは毎フレームのアニメと競合しない。 */
const textTools = (() => {
  /* key=保存キー / sel=要素セレクタ / name=表示名 / text=打ち替え可(子が純テキストのみ)
     move=位置移動可(端ドラッグ。既定1) / font=font系編集可(既定1)。
     【2026-09-03 ヒデさん指定】可能な限りページ全体の要素を対象にする。 */
  /* 【2026-09-17 大掃除】対象の台帳は TEXT_SPEC(パネルの「文字」と共用)。multi の要素は同じ値をまとめて当てる。 */
  const SPEC = TEXT_SPEC;
  const specEls = sp => { try { return sp.multi ? Array.from(document.querySelectorAll(sp.sel)) : [document.querySelector(sp.sel)].filter(Boolean); } catch (e) { return []; } };
  const specEl = sp => specEls(sp)[0] || null;
  /* 保存先は params.edits ただ一つ(旧フォントテスト案ごとの保存は 2026-09-17 に撤去) */
  function editsOf(key) {
    if (!params.edits) params.edits = {};
    return params.edits[key] || (params.edits[key] = {});
  }
  /* params.edits を全対象のDOMへ反映(起動時・変更時) */
  function applyAll() {
    if (!params.edits) params.edits = {};
    /* 【2026-09-20 ヒデさん依頼・PC/SP独立】スマホ(isMobile)の時だけ「スマホ上書き(editsMb)」を共有(edits)に重ねる。
       PCでは editsMb を一切見ない＝スマホモードでいじった値がPCに出ない。 */
    /* 【2026-09-22 ヒデさん報告・PC/SP連動の根治】スマホモード(phone-mode)中は editsMb を「この親ページ(=PC表示)」には重ねない。
       重ねると PC ページの文字が SP の値に化けて「PCとSPが連動して見える」＋パネル入力(SP値)と食い違う原因になっていた。
       SP のプレビューは右下の実機プレビュー枠(#phonePreview の iframe＝?preview=1・isMobile=true でSPとして描画)と、
       ライブ同期した実機が担う。よって適用は「実機 isMobile の時だけ」に戻す＝PCページは常に PC(edits)のまま。 */
    const _isMb = (typeof isMobile !== 'undefined' && isMobile);
    const _mb = (_isMb && params.editsMb) ? params.editsMb : null;
    for (const sp of SPEC) {
      const _base = params.edits[sp.key] || {};
      const _mob = _mb ? _mb[sp.key] : null;
      const e = _mob ? Object.assign({}, _base, _mob) : Object.assign({}, _base);
      /* 【2026-09-20 ヒデさん報告・修正】SP は文字サイズ(fs)を PC(base)から引き継がない。SP のサイズは CSS(--fs-hero 等) か
         スマホモードで付けた SP 専用の上書き(editsMb)だけで決まる。→ PC のコピーのサイズをいじっても SP は連動しない。
         太さ・行間・字間(fw/lh/ls)は共通デザインなので base を引き継ぐ(SP専用の上書きがあればそちらが勝つ)。 */
      if (_isMb && (!_mob || _mob.fs == null)) delete e.fs;
      for (const el of specEls(sp)) {
        el.style.fontSize      = e.fs != null ? e.fs + 'px' : '';
        el.style.fontWeight    = e.fw != null ? String(e.fw) : '';
        el.style.lineHeight    = e.lh != null ? String(e.lh) : '';
        el.style.letterSpacing = e.ls != null ? e.ls + 'px' : '';
        const hasPad = ['pt', 'pr', 'pb', 'pl'].some(k => e[k] != null);
        el.style.padding = hasPad
          ? `${e.pt || 0}px ${e.pr || 0}px ${e.pb || 0}px ${e.pl || 0}px` : '';
        /* 位置移動は margin で反映(transformアニメと非競合。left/top指定要素にも効く)。
           【2026-09-17】rel の要素(margin:auto で中央寄せのフォーム等)は margin だと中央寄せが壊れるので、
           position:relative + left/top でずらす(static/relative の時だけ。absolute はそのまま margin)。 */
        let useRel = false;
        if (sp.rel) { const pos = getComputedStyle(el).position; if (pos === 'static') { el.style.position = 'relative'; useRel = true; } else if (pos === 'relative') useRel = true; }
        if (useRel) {
          el.style.left = e.dx ? e.dx + 'px' : ''; el.style.top = e.dy ? e.dy + 'px' : '';
          el.style.marginLeft = ''; el.style.marginTop = '';
        } else {
          el.style.marginLeft = e.dx ? e.dx + 'px' : '';
          el.style.marginTop  = e.dy ? e.dy + 'px' : '';
        }
        if (sp.text && !sp.multi && e.text != null && el.textContent !== e.text) el.textContent = e.text;
      }
    }
  }
  function scaleOf(el) {
    const w = el.offsetWidth; if (!w) return 1;
    const k = el.getBoundingClientRect().width / w; return k > 0.01 ? k : 1;
  }
  const TT_EDGE = 14;
  function nearEdge(el, e) {
    const r = el.getBoundingClientRect();
    return (e.clientX - r.left < TT_EDGE) || (r.right - e.clientX < TT_EDGE)
        || (e.clientY - r.top < TT_EDGE) || (r.bottom - e.clientY < TT_EDGE);
  }
  /* 端をつかんだら margin で位置移動(Figma風。中央はテキスト編集に譲る) */
  function onDown(e) {
    if (!on) return;
    const sp = this.__ttSpec; if (sp.move === 0) return;
    /* 【2026-09-17 ヒデさん報告「編集で位置移動ができない」】文字の要素は端(TT_EDGE)をつかんだ時だけ移動
       (内側はクリック→文字編集に譲る)。位置だけの要素(font:0＝図・モック・カード・かたまり)は面のどこをつかんでも移動。
       ただし中の別の文字要素の上を押した時は、その文字側に譲る。 */
    const innerText = e.target.closest && e.target.closest('.tt-hit');
    if (sp.font !== 0) { if (!nearEdge(this, e)) return; }
    else if (innerText && innerText !== this && !nearEdge(this, e)) return;
    e.preventDefault(); e.stopPropagation();
    const el = this, ed = editsOf(sp.key), k = scaleOf(el);
    const sx = e.clientX, sy = e.clientY, dx0 = ed.dx || 0, dy0 = ed.dy || 0;
    const move = ev => {
      const ddx = (ev.clientX - sx) / k, ddy = (ev.clientY - sy) / k;
      if (Math.abs(ev.clientX - sx) > 3 || Math.abs(ev.clientY - sy) > 3) window.__ttDragged = true;
      ed.dx = Math.round(dx0 + ddx); ed.dy = Math.round(dy0 + ddy);
      applyAll(); markDirty();
      if (sel === sp) positionBar(el);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }

  let on = false, sel = null, bar = null;
  function buildBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'txt-bar';
    document.body.appendChild(bar);
    return bar;
  }
  function num(label, unit, get, setV, min, max, step) {
    const wrap = document.createElement('label');
    wrap.className = 'tb-num';
    wrap.innerHTML = `<span>${label}</span>`;
    const inp = document.createElement('input');
    inp.type = 'number'; inp.min = min; inp.max = max; inp.step = step;
    const cur = get();
    inp.value = (cur == null ? '' : cur);
    inp.placeholder = 'auto';
    inp.oninput = () => {
      const v = inp.value === '' ? null : parseFloat(inp.value);
      setV(v); applyAll(); markDirty();
    };
    inp.onpointerdown = e => e.stopPropagation();
    wrap.appendChild(inp);
    if (unit) { const u = document.createElement('em'); u.textContent = unit; wrap.appendChild(u); }
    return wrap;
  }
  function renderBar() {
    const b = buildBar();
    b.innerHTML = '';
    if (!sel) { b.classList.remove('on'); return; }
    const el = specEl(sel); if (!el) { b.classList.remove('on'); return; }
    const e = editsOf(sel.key);
    const cs = getComputedStyle(el);
    const title = document.createElement('div');
    title.className = 'tb-title'; title.textContent = sel.name;
    b.appendChild(title);
    /* 位置 X/Y(移動可の要素のみ) */
    if (sel.move !== 0) {
      b.appendChild(num('X', 'px', () => e.dx, v => { if (v == null) delete e.dx; else e.dx = v; }, -1200, 1200, 1));
      b.appendChild(num('Y', 'px', () => e.dy, v => { if (v == null) delete e.dy; else e.dy = v; }, -1200, 1200, 1));
    }
    if (sel.font !== 0) {
      /* サイズ */
      b.appendChild(num('サイズ', 'px', () => e.fs, v => { if (v == null) delete e.fs; else e.fs = v; },
        8, 200, 1));
      /* ウェイト */
      const wWrap = document.createElement('label'); wWrap.className = 'tb-num';
      wWrap.innerHTML = '<span>太さ</span>';
      const wSel = document.createElement('select');
      wSel.innerHTML = '<option value="">auto</option>' +
        [100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => `<option value="${w}">${w}</option>`).join('');
      wSel.value = e.fw != null ? String(e.fw) : '';
      wSel.onchange = () => { if (wSel.value === '') delete e.fw; else e.fw = +wSel.value; applyAll(); markDirty(); };
      wSel.onpointerdown = ev => ev.stopPropagation();
      wWrap.appendChild(wSel); b.appendChild(wWrap);
      /* 行間(倍) */
      b.appendChild(num('行間', '', () => e.lh, v => { if (v == null) delete e.lh; else e.lh = v; },
        0.8, 3, 0.05));
      /* 字間 */
      b.appendChild(num('字間', 'px', () => e.ls, v => { if (v == null) delete e.ls; else e.ls = v; },
        -5, 20, 0.1));
    }
    /* 余白: 上右下左 */
    const padWrap = document.createElement('div'); padWrap.className = 'tb-pad';
    padWrap.innerHTML = '<span>余白</span>';
    [['pt', '上'], ['pr', '右'], ['pb', '下'], ['pl', '左']].forEach(([k, lb]) => {
      const i = document.createElement('input');
      i.type = 'number'; i.title = lb + '余白(px)'; i.placeholder = lb;
      i.value = e[k] != null ? e[k] : '';
      i.oninput = () => { const v = i.value === '' ? null : parseFloat(i.value);
        if (v == null) delete e[k]; else e[k] = v; applyAll(); markDirty(); };
      i.onpointerdown = ev => ev.stopPropagation();
      padWrap.appendChild(i);
    });
    b.appendChild(padWrap);
    /* 打ち替え */
    if (sel.text) {
      const ed = document.createElement('button'); ed.className = 'tb-btn'; ed.textContent = '✎ 文字を打ち替え';
      ed.onpointerdown = ev => ev.stopPropagation();
      ed.onclick = () => startEditText(el, sel);
      b.appendChild(ed);
    }
    /* リセット */
    const rs = document.createElement('button'); rs.className = 'tb-btn'; rs.textContent = '↺ この要素をリセット';
    rs.onpointerdown = ev => ev.stopPropagation();
    rs.onclick = () => { params.edits[sel.key] = {}; applyAll(); markDirty(); renderBar(); };
    b.appendChild(rs);
    b.classList.add('on');
    positionBar(el);
  }
  function positionBar(el) {
    const r = el.getBoundingClientRect();
    const bw = bar.offsetWidth || 300;
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(8, Math.min(left, innerWidth - bw - 8));
    let top = r.top - bar.offsetHeight - 10;
    if (top < 8) top = r.bottom + 10;
    bar.style.left = left + 'px';
    bar.style.top = top + 'px';
  }
  function startEditText(el, sp) {
    el.setAttribute('contenteditable', 'true');
    el.classList.add('txt-editing');
    el.focus();
    const rng = document.createRange(); rng.selectNodeContents(el);
    const s = getSelection(); s.removeAllRanges(); s.addRange(rng);
    const finish = () => {
      el.removeAttribute('contenteditable');
      el.classList.remove('txt-editing');
      const t = el.textContent;
      editsOf(sp.key).text = t;
      applyAll(); markDirty();
      el.removeEventListener('blur', finish); el.removeEventListener('keydown', onKey);
    };
    const onKey = ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); el.blur(); }
      if (ev.key === 'Escape') { el.blur(); } };
    el.addEventListener('blur', finish); el.addEventListener('keydown', onKey);
  }
  function select(sp) {
    sel = sp;
    for (const s of SPEC) { for (const el of specEls(s)) el.classList.toggle('tt-sel', s === sp); }
    renderBar();
  }
  function onClick(e) {
    if (!on) return;
    const sp = this.__ttSpec;
    /* ドラッグ(位置移動)と区別: siteEditが動かした直後は選択しない */
    if (window.__ttDragged) { window.__ttDragged = false; return; }
    e.stopPropagation();
    select(sp);
  }
  /* 【2026-09-03 ヒデさん指定】ダブルクリックで打ち替え(contenteditable)へ */
  function onDbl(e) {
    if (!on) return;
    const sp = this.__ttSpec;
    if (!sp.text) return;   /* 打ち替え非対応(KVメイン/メッセージ等)はダブルクリック無視 */
    e.stopPropagation(); e.preventDefault();
    select(sp);
    startEditText(this, sp);
  }
  function set(v) {
    on = !!v;
    document.documentElement.classList.toggle('txt-edit', on);
    for (const sp of SPEC) {
      for (const el of specEls(sp)) {   /* 【2026-09-17】multi(同じ見た目が複数)も全部クリックできる */
        el.classList.toggle('tt-hit', on);
        if (!on) el.classList.remove('tt-sel');
        if (on && !el.__ttBound) {
          el.__ttSpec = sp;
          el.addEventListener('click', onClick);
          el.addEventListener('dblclick', onDbl);
          el.addEventListener('pointerdown', onDown);
          el.addEventListener('pointermove', ev => {
            if (!on) return;
            el.style.cursor = (sp.move !== 0 && (sp.font === 0 || nearEdge(el, ev))) ? 'move' : (sp.text || sp.font !== 0 ? 'text' : 'default');
          });
          el.__ttBound = true;
        }
        if (!on) el.style.cursor = '';
      }
    }
    if (!on) { sel = null; if (bar) bar.classList.remove('on'); }
  }
  function refresh() { if (on && sel) renderBar(); }
  return { set, applyAll, refresh, get on() { return on; } };
})();
textTools.applyAll();

/* 【2026-08-29 ヒデさん指定】タイトル横の✏️編集ボタン: 直接編集モードのオン/オフ(パネルの開閉はしない) */
(() => {
  const eb = document.getElementById('panelEditBtn');
  if (!eb) return;
  const syncEb = () => { eb.classList.toggle('on', !!editHandles.on); eb.textContent = editHandles.on ? '✏️ 編集中' : '✏️ 編集'; };
  window.__syncEditBtn = syncEb;   /* パネル再構築後などに外から呼べるように */
  /* 【2026-09-19 ヒデさん依頼】編集モードを確実に抜ける共通関数(保存/書き出し/パネル非表示から呼ぶ) */
  window.exitEditMode = function () { try { if (editHandles.on) editHandles.set(false); } catch (e) {} try { siteEdit.set(false); } catch (e) {} try { textTools.set(false); } catch (e) {} syncEb(); };
  eb.addEventListener('click', (e) => {
    e.stopPropagation();                       /* パネルの開閉と喧嘩させない */
    editHandles.set(!editHandles.on);
    siteEdit.set(editHandles.on);              /* サイト全体のオブジェクトも同じモードで編集可に */
    textTools.set(editHandles.on);             /* 2026-09-03: テキストのfont編集レイヤーも同期 */
    syncEb();
  });
  eb.addEventListener('pointerdown', e => e.stopPropagation());   /* ドラッグ開始も抑止 */
  syncEb();
})();

/* ===== 表示モード（2026-08-25 ヒデさん指定：V1.0同様に最初から表示） =====
   パネルは V1.0 と同じく最初から右下に表示（closed=見出しだけ・クリックで開く）。
   透明ボックス(.tools-secret-hot)は残してあり、隠したい時だけ押せる。
   sessionStorage に明示的に '0'(隠す) が入っている時だけ隠した状態で始める。 */
(() => {
  /* 【2026-08-29 ヒデさん指定】リロードしたら必ず「非表示」から始める(前回の表示状態を復元しない)。
     右上の空ボックス(.tools-secret-hot)を押すと出てくる。 */
  const SKEY = 'anyflow-tools-secret';
  let shown = false;
  try { sessionStorage.removeItem(SKEY); } catch (e) {}
  const panelEl2 = document.getElementById('panel');
  const apply = () => {
    toolsEl.classList.toggle('tools-hidden', !shown);
    /* 【2026-08-27 ヒデさん指定】出したときはアコーディオンを開いた状態にする */
    if (shown && panelEl2) panelEl2.classList.remove('closed');
    /* 【2026-09-09】スマホ: 空ボックスをタップで出す時は必ず「ピーク(見出しだけ)」から。展開状態は持ち越さない。 */
    if (shown && document.documentElement.classList.contains('mb')) { toolsEl.classList.remove('sheet-open'); toolsEl.style.transform = ''; }
  };
  apply();
  const hot = document.createElement('div');
  hot.className = 'tools-secret-hot';
  document.body.appendChild(hot);
  hot.addEventListener('click', () => {
    shown = !shown;
    if (!shown) { try { if (typeof exitEditMode === 'function') exitEditMode(); } catch (e) {} }   /* 【2026-09-19】隠す時は編集モードを抜ける */
    try { sessionStorage.setItem(SKEY, shown ? '1' : '0'); } catch (e) {}
    apply();
  });
})();
/* カテゴリの開閉では外寸は変わらない作りだが、
   ヒデさんが右下のつまみで背を伸ばしている場合に備えて、ここでも押し戻しておく */
document.getElementById('panelBody').addEventListener('click', () => {
  requestAnimationFrame(() => { openPanelDownward(); keepPanelInView(); });
  if (document.documentElement.classList.contains('phone-mode') && typeof window.__markMbOverrides === 'function') setTimeout(window.__markMbOverrides, 40);   /* 【2026-09-19】タブ切替後もオレンジ印を付け直す */
});

/* ============================================================================
   【2026-09-19 ヒデさん依頼】スマホ実機ライブ同期
   ・?live=phone … スマホ側。PCの調整を受け取り、保存し直してリロード表示(スクロール位置は保つ)。
   ・それ以外(PC) … 右下に「📱」ボタン。QR/URL を出し、同期ONでPCの保存のたびに設定を送る。
   中継サーバ: node anyflow/v5/tools/live-sync.mjs (:8779)。本体ページは既存 :8778(LAN公開)。
   ============================================================================ */
(function liveSync() {
  var SYNC = location.protocol + '//' + location.hostname + ':8779';
  var mode = (new URLSearchParams(location.search).get('live') || '').toLowerCase();
  /* 開発(ローカル/LAN)だけで動かす。本番(vercel等)では同期UIもスマホ処理も出さない */
  var isDev = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
  if (!isDev) return;

  /* ---------------- スマホ側: 受信してリロード ---------------- */
  if (mode === 'phone') {
    try { document.documentElement.classList.add('live-phone'); } catch (e) {}
    var st = document.createElement('style');
    st.textContent = '.tools{display:none!important}'
      + '.live-badge{position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:2147483647;'
      + 'background:rgba(17,24,39,.82);color:#fff;font:600 11px/1 -apple-system,system-ui,sans-serif;'
      + 'padding:7px 10px;border-radius:999px;letter-spacing:.02em;pointer-events:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}'
      + '.live-badge.off{background:rgba(190,40,40,.9)}';
    document.head.appendChild(st);
    var badge = document.createElement('div'); badge.className = 'live-badge'; badge.textContent = '📱 PCと接続中…';
    document.body.appendChild(badge);
    /* リロードをまたいでスクロール位置を保つ */
    try { var sv = sessionStorage.getItem('anyflow-live-scroll'); if (sv != null) { var y = +sv; requestAnimationFrame(function () { window.scrollTo(0, y); setTimeout(function () { window.scrollTo(0, y); }, 60); }); } } catch (e) {}
    var reloadT = null;
    /* firstMsg はリロードすると再実行で毎回 true に戻ってしまうので、sessionStorage で「初回リロード済み」を持つ(以降はリロードせずソフト適用) */
    var firstDone = false; try { firstDone = sessionStorage.getItem('anyflow-pm-firstdone') === '1'; } catch (e) {}
    function applyIncoming(text) {
      var d; try { d = JSON.parse(text); } catch (e) { return; }
      if (!(d && typeof d === 'object' && 'main' in d)) return;
      badge.classList.remove('off'); badge.textContent = '📱 PCと同期中';
      /* 【2026-09-20 ヒデさん報告バグ修正】SSE は接続のたびに前回値(latest)を送ってくるので、
         毎回リロードすると『チカチカ無限リロード』になる。前回適用した“生ペイロード”と同じなら何もしない。
         (localStorage 比較だと起動時 migration が値を書き換えて常に不一致になり止まらないため、生ペイロードで判定) */
      var last = null; try { last = sessionStorage.getItem('anyflow-pm-last'); } catch (e) {}
      if (text === last) return;
      try { sessionStorage.setItem('anyflow-pm-last', text); } catch (e) {}
      try {
        if (d.main != null) localStorage.setItem('anyflow-embed-anim-v81', d.main); else localStorage.removeItem('anyflow-embed-anim-v81');
        if (d.preset != null) localStorage.setItem('anyflow-gfx-presets', d.preset); else localStorage.removeItem('anyflow-gfx-presets');
        try { localStorage.setItem('anyflow-shipped-gen', '99999999999999'); } catch (e) {}
      } catch (e) { return; }
      clearTimeout(reloadT);
      /* 【2026-09-20 ヒデさん依頼】スマホモードの調整をリロードせずリアルタイム反映(チカチカ解消)。
         スマホ側はパネルが無い(閉じている)ので、params を差し替えて apply 関数群を直接呼ぶ＝ソフト再適用。
         初回だけは確実さ優先でリロード、以降はリロード無しで即反映。失敗時はリロードに退避。 */
      reloadT = setTimeout(function () {
        if (!firstDone) { firstDone = true; try { sessionStorage.setItem('anyflow-pm-firstdone', '1'); sessionStorage.setItem('anyflow-live-scroll', String(window.scrollY || window.pageYOffset || 0)); } catch (e) {} location.reload(); return; }
        try { liveApplyNoReload(d.main, d.preset); } catch (e) { try { location.reload(); } catch (e2) {} }
      }, firstDone ? 40 : 120);
    }
    /* リロードせずに params を差し替えて描画系を全部呼び直す(KV・文字・メッシュ・実績・CV・ビジョン) */
    function liveApplyNoReload(mainText, presetText) {
      var newP; try { newP = JSON.parse(mainText); } catch (e) { location.reload(); return; }
      if (!newP || typeof newP !== 'object') { location.reload(); return; }
      try { for (var k in params) { if (Object.prototype.hasOwnProperty.call(params, k) && !(k in newP)) delete params[k]; } } catch (e) {}
      try { Object.assign(params, newP); } catch (e) {}
      if (presetText) { try { var stp = JSON.parse(presetText); if (stp) { params.gfxVarOverride = stp.over || {}; params.gfxPresets = stp.presets || {}; params.gfxPresetOn = stp.on || {}; params.gfxVariantHidden = stp.hidden || {}; params.gfxFav = stp.fav || []; params.gfxPresetTrash = stp.trash || {}; } } catch (e) {} }
      var call = function (fn) { try { fn(); } catch (e) {} };
      try { vfMesh = null; } catch (e) {}
      call(function () { if (typeof applyKvVariant === 'function') applyKvVariant(kvVarKey(), true); });
      call(function () { if (typeof varApplyOverridesAtStartup === 'function') varApplyOverridesAtStartup(); });
      /* 【2026-09-20 ヒデさん報告・実機プレビューで線幅等をいじると惑星/カゴが変わる不具合の根治】
         SP専用の値(mb)は、案の再適用(applyKvVariant/varApply=案の焼き込み値で base を上書き)より「後」に流し込む。
         以前は前に流していたため、案の再適用が SP 値を上書きして戻してしまい、リロードするまで正しく見えなかった
         (リロード時は varApply→applyMb の順で正しかった。ここも同じ順に揃える)。 */
      call(function () { if (typeof applyMbToParams === 'function') applyMbToParams(); });
      call(function () { if (typeof applyKvCopy === 'function') applyKvCopy(); });
      call(function () { if (typeof applyVisEmph === 'function') applyVisEmph(); });   /* 【2026-09-20】ビジョンのバリエーションもライブ反映 */
      call(function () { if (typeof textTools !== 'undefined' && textTools.applyAll) textTools.applyAll(); });
      call(function () { if (typeof applyVfFade === 'function') applyVfFade(); });
      call(function () { if (typeof applySway === 'function') applySway(); });
      call(function () { if (typeof applyVisBelow === 'function') applyVisBelow(); });
      call(function () { if (typeof applyVisPointsX === 'function') applyVisPointsX(); });
      call(function () { if (typeof resApplySlotFx === 'function' && typeof resSlotFxKey === 'function') resApplySlotFx(resSlotFxKey()); });
      call(function () { if (typeof applyResSlotFade === 'function') applyResSlotFade(); });
      call(function () { if (typeof applyPictoDisp === 'function') applyPictoDisp(); });
      call(function () { if (typeof applyResSpGap === 'function') applyResSpGap(); });
      call(function () { if (typeof cvApplySway === 'function' && typeof cvSwayKey === 'function') cvApplySway(cvSwayKey()); });
      call(function () { if (typeof visApplyGrad === 'function' && typeof visGradKey === 'function') { visApplyGrad(visGradKey()); if (typeof applyVisGrad === 'function') applyVisGrad(); } });
      call(function () { if (typeof applyMarquee === 'function') applyMarquee(); });
      call(function () { if (typeof fit === 'function') fit(); });
      call(function () { if (typeof renderFrame === 'function') renderFrame(); });
    }
    function connect() {
      var es;
      try { es = new EventSource(SYNC + '/events'); } catch (e) { badge.classList.add('off'); badge.textContent = '📱 同期サーバに接続できません'; return; }
      es.onmessage = function (ev) { if (ev && ev.data) applyIncoming(ev.data); };
      es.onerror = function () { badge.classList.add('off'); badge.textContent = '📱 再接続中…'; };
      es.onopen = function () { badge.classList.remove('off'); badge.textContent = '📱 PCと同期中'; };
    }
    connect();
    return;
  }

  /* ---------------- PC側: QR/URL + 送信 ---------------- */
  window.__liveSyncOn = false;
  function liveSyncPush() {
    if (!window.__liveSyncOn) return;
    var payload;
    try { payload = JSON.stringify({ main: localStorage.getItem('anyflow-embed-anim-v81'), preset: localStorage.getItem('anyflow-gfx-presets') }); } catch (e) { return; }
    try { fetch(SYNC + '/push', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: payload }).catch(function () {}); } catch (e) {}   /* keepalive は付けない: 設定JSONが64KB超だと keepalive fetch は無言で失敗する(2026-09-19 実測) */
  }
  window.liveSyncPush = liveSyncPush;
  /* 保存(save)のたびに送る。save は既存の関数。ラップして「保存 → 同期送信」に */
  try { if (typeof save === 'function') { var _origSave = save; save = function () { var r = _origSave.apply(this, arguments); try { liveSyncPush(); } catch (e) {} return r; }; } } catch (e) {}

  var css = document.createElement('style');
  css.textContent =
    '.live-pop{position:fixed;left:12px;bottom:64px;z-index:2147483000;width:250px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:14px;'
    + 'box-shadow:0 12px 40px rgba(16,24,40,.22);padding:14px;font:400 12px/1.5 -apple-system,system-ui,sans-serif;color:#222;display:none}'
    + '.live-pop.show{display:block}.live-pop h4{margin:0 0 8px;font-size:12px;font-weight:700}'
    + '.live-pop .qr{width:190px;height:190px;margin:2px auto 8px;display:block;background:#f4f4f5;border-radius:8px}'
    + '.live-pop .url{word-break:break-all;background:#f4f4f5;border-radius:7px;padding:6px 8px;font-size:11px;color:#333;margin-bottom:8px}'
    + '.live-pop .row{display:flex;gap:6px;align-items:center;margin-top:8px}'
    + '.live-pop button{flex:1;border:1px solid rgba(0,0,0,.1);background:#fff;border-radius:8px;padding:7px;font:600 12px/1 inherit;cursor:pointer}'
    + '.live-pop button.pri{background:#0e5cff;color:#fff;border-color:#0e5cff}.live-pop button.pri.on{background:#111;border-color:#111}'
    + '.live-pop .st{font-size:11px;color:#666;margin-top:8px;min-height:15px}.live-pop .err{color:#c0392b}'
    + '.live-pop .pm-prompt{display:none;width:100%;margin-top:8px;border:1px dashed rgba(14,92,255,.5);background:#eef8ff;color:#0b4bd6;border-radius:8px;padding:8px;font:600 11px/1.35 inherit;cursor:pointer;text-align:center}.live-pop .pm-prompt.show{display:block}'
    /* ▼ スマホモード(同期中)の見た目 */
    + '.phone-mode-banner{display:none;gap:6px;align-items:center;justify-content:center;font:600 11px/1.35 -apple-system,system-ui,sans-serif;color:#0b4bd6;background:linear-gradient(90deg,rgba(14,92,255,.10),rgba(14,187,255,.14));border-top:1px solid rgba(14,92,255,.22);border-bottom:1px solid rgba(14,92,255,.22);padding:7px 12px;text-align:center}'
    + '.phone-mode-banner b{font-weight:800}'
    + 'html.phone-mode .phone-mode-banner{display:flex}'
    + 'html.phone-mode .panel-head{background:linear-gradient(90deg,rgba(14,92,255,.10),rgba(14,187,255,.12))}'
    + 'html.phone-mode #panel{box-shadow:0 0 0 2px rgba(14,92,255,.45),0 14px 40px rgba(16,24,40,.22)}'
    + 'html.phone-mode #panelLiveBtn{background:#0e5cff;border-color:#0e5cff;color:#fff}'
    /* 【2026-09-19/09-20 ヒデさん依頼】スマホモード中に「SP専用に上書きした項目」を STUDIO 風にハイライト。
       つまみも文字行も統一: 行の左に青いバー＋薄い青背景＋見出しに●。触った瞬間に付く(input/change で即更新)。 */
    + '/* 【2026-09-21 ヒデさん依頼】スマホ上書きの左側の濃い青の装飾(背景＋左バー)は撤去。印は下の●と文字色だけの控えめ表示に */'
    + 'html.phone-mode .row.mb-override .val,html.phone-mode .row.mb-override > label{font-weight:600}'
    + 'html.phone-mode .txt-row.mb-override > label{font-weight:600}'
    + 'html.phone-mode .pc-only-row{display:none!important}'   /* 【2026-09-21】PC演出専用のつまみはスマホモード中は隠す */
    + 'html:not(.phone-mode) .sp-only-row{display:none!important}'   /* スマホ専用のつまみはPC編集時は隠す */
    + 'html.phone-mode .txt-row .txt-n.mb-diff,html.phone-mode .txt-row .txt-w.mb-diff{border-color:#0EBBFF!important;background:#dff0ff;color:#0b4bd6;font-weight:600}';
  document.head.appendChild(css);

  var trigger = document.getElementById('panelLiveBtn');
  if (trigger) { trigger.hidden = false; }
  var pop = document.createElement('div'); pop.className = 'live-pop';
  pop.innerHTML = '<h4>📱 スマホモード（実機プレビュー）</h4>'
    + '<img class="qr" alt="QR">'
    + '<div class="url">読み込み中…</div>'
    + '<div class="st"></div>'
    + '<button id="lvPrompt" class="pm-prompt">📋 起動プロンプトをコピー（Claudeに貼る）</button>'
    + '<div class="row"><button id="lvCopy">URLコピー</button><button class="pri" id="lvStop">スマホモード終了</button></div>';
  document.body.appendChild(pop);
  /* パネル上部の「スマホモード」帯(同期中だけ表示) */
  var banner = document.createElement('div'); banner.className = 'phone-mode-banner';
  banner.innerHTML = '📱 <b>スマホモード</b>：この画面の調整が、同期中のスマホ実機に反映されます';
  var pbody = document.getElementById('panelBody'); if (pbody && pbody.parentNode) pbody.parentNode.insertBefore(banner, pbody);
  var qrImg = pop.querySelector('.qr'), urlEl = pop.querySelector('.url'), stEl = pop.querySelector('.st'),
      copyBtn = pop.querySelector('#lvCopy'), stopBtn = pop.querySelector('#lvStop'), promptBtn = pop.querySelector('#lvPrompt');
  var phoneUrl = '', ipInfo = null, statusT = null;

  function refreshStatus() {
    fetch(SYNC + '/ip').then(function (r) { return r.json(); }).then(function (j) {
      ipInfo = j; phoneUrl = j.phoneUrl;
      urlEl.textContent = phoneUrl; urlEl.classList.remove('err');
      qrImg.src = SYNC + '/qr?t=' + Date.now();
      var n = j.clients || 0;
      stEl.classList.remove('err'); promptBtn.classList.remove('show');
      stEl.textContent = window.__liveSyncOn
        ? ('同期ON ・ つないでいるスマホ ' + n + '台')
        : ('スマホでこのQRを読むと同期プレビューが開きます（' + n + '台接続中）');
    }).catch(function () {
      urlEl.textContent = '同期サーバが起動していません'; urlEl.classList.add('err');
      qrImg.removeAttribute('src');
      stEl.classList.add('err');
      stEl.textContent = 'このボタンでプロンプトをコピーして Claude に貼ると起動できます↓';
      promptBtn.classList.add('show');
    });
  }
  function positionPop() {
    if (pop.__dragged) return;   /* 【2026-09-20】手で動かした後は自動配置しない */
    pop.style.right = ''; pop.style.bottom = 'auto';
    var pw = pop.offsetWidth || 250, ph = pop.offsetHeight || 320, pad = 12;
    /* 【2026-09-20 ヒデさん依頼】パネルに重ならないよう、パネルの反対側に出す(左端なら右・右端なら左) */
    var panel = document.getElementById('panel') || (trigger && trigger.closest('.tools'));
    var pr = panel ? panel.getBoundingClientRect() : (trigger ? trigger.getBoundingClientRect() : null);
    var left, top;
    if (pr) {
      var mid = pr.left + pr.width / 2;
      left = (mid < window.innerWidth / 2) ? (pr.right + pad) : (pr.left - pw - pad);   /* パネルが左→右に / 右→左に */
      if (left + pw > window.innerWidth - pad) left = pr.left - pw - pad;               /* 出した側がはみ出すなら反対へ */
      if (left < pad) left = pr.right + pad;
      top = pr.top;
    } else { left = window.innerWidth - pw - pad; top = pad; }
    left = Math.max(pad, Math.min(left, window.innerWidth - pw - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - ph - pad));
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }
  function showPop() { pop.__dragged = false; pop.classList.add('show'); positionPop(); requestAnimationFrame(positionPop); refreshStatus(); clearInterval(statusT); statusT = setInterval(refreshStatus, 3000); window.addEventListener('resize', positionPop); }
  function hidePop() { pop.classList.remove('show'); clearInterval(statusT); window.removeEventListener('resize', positionPop); }
  /* 【2026-09-20 ヒデさん依頼】QRポップアップを見出しでドラッグ移動 */
  (function () { var h = pop.querySelector('h4'); if (!h) return; h.style.cursor = 'move'; h.style.userSelect = 'none'; var sx, sy, sl, st, drag = false;
    h.addEventListener('pointerdown', function (e) { drag = true; pop.__dragged = true; sx = e.clientX; sy = e.clientY; var r = pop.getBoundingClientRect(); sl = r.left; st = r.top; try { h.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    h.addEventListener('pointermove', function (e) { if (!drag) return; var pad = 6, nl = sl + (e.clientX - sx), nt = st + (e.clientY - sy); nl = Math.max(pad, Math.min(nl, window.innerWidth - pop.offsetWidth - pad)); nt = Math.max(pad, Math.min(nt, window.innerHeight - pop.offsetHeight - pad)); pop.style.left = nl + 'px'; pop.style.top = nt + 'px'; });
    var end = function (e) { drag = false; try { h.releasePointerCapture(e.pointerId); } catch (x) {} }; h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
  })();
  /* 【2026-09-19 ヒデさん依頼】スマホ実機ボタン1つで「スマホモードON＋QRポップアップ＋パネル切替」をまとめて。もう一度押すとQRの開閉。終了はポップアップの「スマホモード終了」 */
  /* 【2026-09-19 ヒデさん依頼・STUDIO風】スマホ(@media≤600 / html.mb)で文字プロパティを上書きしているルールを集め、
     その要素の 🔤文字 行をオレンジで光らせる(=レスポンシブで値が変わっている印) */
  function collectMobileFontRules() {
    var FONT = ['font-size', 'font-weight', 'line-height', 'letter-spacing'], out = [];
    function scan(rules, mob) { for (var i = 0; i < rules.length; i++) { var r = rules[i];
      if (r.type === 4 && r.media) { var mm = (r.media.mediaText || '').match(/max-width:\s*(\d+)px/); scan(r.cssRules || [], mob || !!(mm && +mm[1] <= 640)); }
      else if (r.type === 1 && r.selectorText) { var sel = r.selectorText; if (!(mob || /html\.mb\b/.test(sel))) continue; var pr = FONT.filter(function (q) { return r.style.getPropertyValue(q); }); if (pr.length) out.push({ sel: sel.replace(/html\.mb\b\s*/g, '').replace(/html:not\(\.mb\)\b\s*/g, ''), props: pr }); } } }
    for (var k = 0; k < document.styleSheets.length; k++) { try { scan(document.styleSheets[k].cssRules || [], false); } catch (e) {} }
    return out;
  }
  var _mbRulesCache = null;
  function markMbOverrides() {
    if (!document.documentElement.classList.contains('phone-mode')) return;
    if (!_mbRulesCache) _mbRulesCache = collectMobileFontRules();
    var rows = document.querySelectorAll('.txt-row');
    for (var i = 0; i < rows.length; i++) { var row = rows[i], lab = row.querySelector('label'), sel = lab && lab.title, el = null;
      try { el = sel ? document.querySelector(sel) : null; } catch (e) {}
      var props = {};
      if (el) for (var j = 0; j < _mbRulesCache.length; j++) { try { if (el.matches(_mbRulesCache[j].sel)) _mbRulesCache[j].props.forEach(function (q) { props[q] = 1; }); } catch (e) {} }
      /* 【2026-09-20】CSSの@mediaだけでなく、実際にスマホモードで付けた上書き(editsMb)も青印にする */
      var _mk = row.dataset.key, _mo = (params.editsMb && params.editsMb[_mk]) || null;
      if (_mo) { var _MAP = { fs: 'font-size', fw: 'font-weight', lh: 'line-height', ls: 'letter-spacing' }; for (var _k in _MAP) { if (_mo[_k] != null) props[_MAP[_k]] = 1; } }
      row.classList.toggle('mb-override', Object.keys(props).length > 0);
      var inp = row.querySelectorAll('[data-prop]');
      for (var m = 0; m < inp.length; m++) inp[m].classList.toggle('mb-diff', !!props[inp[m].dataset.prop]);
    }
  }
  function clearMbOverrides() { var r = document.querySelectorAll('.txt-row.mb-override, .txt-row .mb-diff'); for (var i = 0; i < r.length; i++) { r[i].classList.remove('mb-override'); r[i].classList.remove('mb-diff'); } }
  window.__markMbOverrides = markMbOverrides;
  /* 【2026-09-21 ヒデさん依頼】スマホモードON時に「390×844のデバイス枠に実画面(iframe ?preview=1)」を出す。実スクロールできる。OFFで消す */
  function ppApplyTransform() { var pp = document.getElementById('phonePreview'); if (!pp) return; pp.style.transform = 'translate(' + (pp._dx || 0) + 'px,' + (pp._dy || 0) + 'px) scale(' + (pp._sc != null ? pp._sc : 1) + ')'; }
  function ppSync(on) {
    var pp = document.getElementById('phonePreview'), ppf = document.getElementById('ppFrame');
    if (!pp || !ppf) return;
    if (document.documentElement.classList.contains('pp-inner')) return;   /* プレビューiframeの中では出さない(再帰回避) */
    if (on) {
      var u = location.pathname + '?preview=1';
      /* 【2026-09-21 Y11】iframe(SP)読み込み完了後にパネルを再sync＝フォント行の「サイズ」がSP実サイズ(プレビューと一致)を表示するように */
      ppf.onload = function () { setTimeout(function () { try { if (typeof syncPanelRows === 'function') syncPanelRows(); } catch (e) {} try { if (window.__markMbOverrides) window.__markMbOverrides(); } catch (e) {} }, 350); };
      if ((ppf.getAttribute('src') || '') !== u) ppf.setAttribute('src', u); else ppf.onload();
      pp.classList.add('on');
      pp._sc = Math.min(1, (window.innerHeight - 32) / 892);   /* 画面が低い時は枠ごと縮めて収める(bar36+frame844+余白) */
      ppApplyTransform();
    } else { pp.classList.remove('on'); ppf.setAttribute('src', 'about:blank'); }
  }
  (function () {
    var rl = document.getElementById('ppReload'), cl = document.getElementById('ppClose'), ppf = document.getElementById('ppFrame'), bar = document.querySelector('#phonePreview .pp-bar'), pp = document.getElementById('phonePreview');
    if (rl) rl.addEventListener('click', function () { if (ppf) ppf.setAttribute('src', location.pathname + '?preview=1&_t=' + Date.now()); });
    if (cl) cl.addEventListener('click', function () { setActive(false); try { hidePop(); } catch (e) {} });
    /* 【2026-09-21 ヒデさん依頼】プレビュー枠をバーでドラッグ移動 */
    if (bar && pp) {
      bar.style.cursor = 'move'; bar.style.touchAction = 'none';
      var drag = null;
      bar.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button')) return;   /* ↻/× はドラッグしない */
        drag = { x: e.clientX, y: e.clientY, dx: pp._dx || 0, dy: pp._dy || 0 };
        try { bar.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault();
      });
      bar.addEventListener('pointermove', function (e) {
        if (!drag) return; pp._dx = drag.dx + (e.clientX - drag.x); pp._dy = drag.dy + (e.clientY - drag.y); ppApplyTransform();
      });
      var end = function (e) { drag = null; try { bar.releasePointerCapture(e.pointerId); } catch (er) {} };
      bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
    }
  })();
  function setActive(on) {
    window.__liveSyncOn = !!on;
    try { document.documentElement.classList.toggle('phone-mode', !!on); } catch (e) {}   /* 帯・青枠はこのクラスで出す */
    if (trigger) { trigger.classList.toggle('on', !!on); trigger.textContent = on ? '📱 スマホモード中' : '📱 スマホモード'; }
    try { if (typeof syncPanelRows === 'function') syncPanelRows(); } catch (e) {}   /* パネルの値を読み直す */
    if (on) { setTimeout(markMbOverrides, 60); } else { clearMbOverrides(); }
    if (on) liveSyncPush();
    try { ppSync(!!on); } catch (e) {}   /* 実機プレビュー枠の表示/非表示 */
  }
  if (trigger) {
    trigger.addEventListener('click', function (e) { e.stopPropagation();
      if (!window.__liveSyncOn) { setActive(true); showPop(); }        /* 初回: モードON＋QR */
      else if (pop.classList.contains('show')) { hidePop(); }           /* 2回目: QRだけ隠す(モードは継続) */
      else { showPop(); }                                              /* もう一度: QR再表示 */
    });
    trigger.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  }
  if (stopBtn) stopBtn.addEventListener('click', function () { setActive(false); hidePop(); });
  copyBtn.addEventListener('click', function () {
    if (!phoneUrl) return;
    try { navigator.clipboard.writeText(phoneUrl); copyBtn.textContent = 'コピーしました'; setTimeout(function () { copyBtn.textContent = 'URLコピー'; }, 1200); } catch (e) {}
  });
  promptBtn.addEventListener('click', function () {
    var t = 'anyflow V5.0 のスマホモード(実機ライブ同期)の中継サーバが起動していないようです。起動してください。\n\ncd "/Users/hideyuki/Developer/Claude Code/anyflow/v5/tools" && (test -d node_modules || npm install) && node live-sync.mjs';
    try { navigator.clipboard.writeText(t); promptBtn.textContent = '✅ コピーしました（Claudeに貼ってください）'; setTimeout(function () { promptBtn.textContent = '📋 起動プロンプトをコピー（Claudeに貼る）'; }, 2000); } catch (e) {}
  });
})();

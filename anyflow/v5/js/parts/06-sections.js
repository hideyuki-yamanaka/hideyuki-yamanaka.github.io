/* dev2(章②): 見出し → モック → 右テキスト の順で出現。モックはビューポート中はループ再生。 */
/* ===== 開発者体験2「テキストスライド案」(2026-08-29 ヒデさん指定) =====
   見出しの箱が CLI→SDK→API と切り替わり(スロット風)、モックのカルーセルも同期して回る。
   スクロール駆動: セクションが画面下部に来たら発火し、スクロールで箱が開いて語が切り替わる。
   モック内のアニメーション(タイピング)はオフ＝全要素が出た静止状態。 */
const dsEls = {
  box: document.getElementById('dsBox'), roll: document.getElementById('dsRoll'),
  out: document.getElementById('dsOut'), in: document.getElementById('dsIn'),
};
const DS_WORDS = ['CLI', 'SDK', 'API'], DS_SCREENS = ['cli', 'sdk', 'api'];
const DS_WH = 34;
/* 【2026-09-02】箱の幅はJSがインライン指定するのでCSSでは縮められない→ここで画面幅分岐 */
const dsBoxW = () => (window.innerWidth <= 780 ? 76 : 112);
function dsSnapEase(t, k) { return Math.pow(clamp01(t), k); }
let dsStaticFilled = false;
function dsFillStaticAll() {
  /* テキストスライド案はモック内アニメOFF＝全行を出しきった状態にする(clip全開) */
  if (dsStaticFilled) return;
  ['api', 'cli', 'sdk'].forEach(scr => {
    const root = document.getElementById(DM2_ROOT[scr]); if (!root) return;
    [...root.children].forEach(l => { l.style.clipPath = 'none'; l.style.opacity = '1'; });
  });
  dsStaticFilled = true;
}
/* 【2026-08-29 ヒデさん指定・改】スクロール連動をやめて【時間駆動の自動カルーセル】に。
   ビューポートに入ったら(=dev2の入場クロック s)、①語が左右に分かれて箱がマスクで開く →
   ②CLI→SDK→API と一定間隔(slideEvery)で自動で切り替わり続ける(ループ)。モックも同期。 */
/* 【2026-08-29 改】箱の開き(左右に分かれる)はスクロール駆動(openK)、語の CLI→SDK→API 切替は
   時間駆動の自動カルーセル(s)。openK/s は updateDev2Reveal が算出して渡す。 */
function updateDevSlide(openK, s) {
  const d = params.sections.dev;
  if (!dsEls.box) return;
  /* ① 箱が左右に分かれて開く = スクロール位置(openK 0→1)。 */
  const ok = clamp01(openK);
  dsEls.box.style.width = (dsBoxW() * ok).toFixed(2) + 'px';   /* 2026-08-30: 0.1→0.01px精度でカタつき低減 */
  dsEls.box.style.margin = ok > 0.02 ? '0 12px' : '0';
  /* ② 語の自動カルーセル = 時間 s。箱が開ききって一呼吸おいてから回り始める。 */
  const N = DS_WORDS.length;
  const every = Math.max(1.2, d.slideEvery != null ? d.slideEvery : 3.0);
  const dur = Math.max(0.2, Math.min(every - 0.3, d.slideDur != null ? d.slideDur : 0.5));
  let idx = 0, tr = 0;
  const tSlot = (s < 0 || ok < 0.9) ? -1 : s - 0.35;
  if (tSlot > 0) {
    const cyc = tSlot / every;
    idx = Math.floor(cyc) % N;
    const within = cyc - Math.floor(cyc);
    const trStart = 1 - dur / every;          /* 各サイクルの終わり dur 秒で切り替える(それまでホールド) */
    tr = within < trStart ? 0 : (within - trStart) / (dur / every);
  }
  const nextIdx = (idx + 1) % N;
  dsEls.out.textContent = DS_WORDS[idx]; dsEls.in.textContent = DS_WORDS[nextIdx];
  applyDsMotion(d.slideMotion || 'snap', tr, d);
  const shownIdx = tr >= 0.5 ? nextIdx : idx;
  const scr = DS_SCREENS[shownIdx];
  if (devScreen2 !== scr) { devScreen2 = scr; }   /* カルーセルが updateDev2Stack で同期して回る */
}
/* スロット(語)の切替モーション。スナップ/フリップ/ブラー＋横押し/ズーム/キューブ(2026-08-29 +3種)。 */
function applyDsMotion(motion, tr, d) {
  const o = dsEls.out, ins = dsEls.in, H = DS_WH, W = dsBoxW();
  const e = motion === 'snap' ? dsSnapEase(tr, d.slideSnapK || 3.4) : tr;
  o.style.filter = ''; ins.style.filter = '';
  if (motion === 'flip') {
    dsEls.roll.style.perspective = '300px';
    o.style.transform = `rotateX(${(e * 90).toFixed(1)}deg)`; o.style.opacity = (1 - Math.min(1, e * 1.6)).toFixed(2);
    ins.style.transform = `rotateX(${(-(1 - e) * 90).toFixed(1)}deg)`; ins.style.opacity = Math.min(1, e * 1.6).toFixed(2);
  } else if (motion === 'blur') {
    o.style.transform = 'none'; o.style.opacity = (1 - e).toFixed(2); o.style.filter = `blur(${(e * 7).toFixed(1)}px)`;
    ins.style.transform = 'none'; ins.style.opacity = e.toFixed(2); ins.style.filter = `blur(${((1 - e) * 7).toFixed(1)}px)`;
  } else if (motion === 'push') {
    o.style.transform = `translateX(${(-e * W).toFixed(1)}px)`; o.style.opacity = (1 - e).toFixed(2);
    ins.style.transform = `translateX(${((1 - e) * W).toFixed(1)}px)`; ins.style.opacity = e.toFixed(2);
  } else if (motion === 'zoom') {
    o.style.transform = `scale(${(1 - 0.5 * e).toFixed(3)})`; o.style.opacity = (1 - e).toFixed(2);
    ins.style.transform = `scale(${(0.5 + 0.5 * e).toFixed(3)})`; ins.style.opacity = e.toFixed(2);
  } else if (motion === 'cube') {
    dsEls.roll.style.perspective = '340px';
    o.style.transform = `rotateY(${(e * 90).toFixed(1)}deg)`; o.style.opacity = (1 - Math.min(1, e * 1.5)).toFixed(2);
    ins.style.transform = `rotateY(${(-(1 - e) * 90).toFixed(1)}deg)`; ins.style.opacity = Math.min(1, e * 1.5).toFixed(2);
  } else { // snap
    o.style.transform = `translateY(${(-e * H).toFixed(1)}px)`; o.style.opacity = '1';
    ins.style.transform = `translateY(${((1 - e) * H).toFixed(1)}px)`; ins.style.opacity = '1';
  }
}
function dsResetBox() { if (dsEls.box) { dsEls.box.style.width = '0'; dsEls.box.style.margin = '0'; } }

function updateDev2Reveal() {
  const b2 = devEls.block2; if (!b2) return;
  const b2m = devPinOn() ? devEls.in2 : b2;   /* pin時は固定される内側で測る(保持中は出しきりで張り付く) */
  if (!dev2StackEl) dev2StackEl = b2.querySelector('.dev2-stack');
  const d = params.sections.dev;
  /* 【2026-08-29】テキストスライド案の切替: #dev に .ds2-slide を付け、箱アニメを駆動、モックは静止。 */
  const slide = d.ds2 === 'slide';
  if (devEls.sec) devEls.sec.classList.toggle('ds2-slide', slide);
  const vh = innerHeight || 1;
  const r = rectOf(b2m);
  const refY = r.top + r.height / 2;   // ブロック中心(pin時は内側=画面中央付近で張り付く)
  /* 【2026-08-29 ヒデさん指定・重要修正】dev2 の出入りを dev1 と同じ【スクロール位置駆動】に統一。
     以前は kBlock を越えた瞬間に時計(dev2SeqT0)で見出し→モック→右を再生していたため、上に戻ると
     時計が -1 にリセットされて【パッと消える／変なスクロールリプレイ】になっていた。
     ここでは revealK(スクロール位置)で3要素をずらして出す＝出も入りもなめらか＆対称。
     vpMode=出しきる基準位置(bottom=早め/center=dev1と同じ/top=遅め)。 */
  const FULL = { bottom: 0.72, center: 0.58, top: 0.44 };
  const full = FULL[d.vpMode] || FULL.center;   // ブロック中心がこの高さ(画面上端からの割合)まで来たら出しきり
  const revealK = easeOutQ(clamp01((vh - refY) / (vh * (1 - full))));
  b2.style.opacity = '1'; b2.style.filter = ''; b2.style.transform = '';
  /* 【2026-08-29 ヒデさん指定・再修正】dev1 と挙動を完全一致に。以前は revealK で easeOutQ を1回、
     さらに段差(stag)でもう1回 easeOutQ を掛けて【二重イージング】になっていた。easeOutQ=1-(1-t)^5 は
     非常に急峻なので、二重に掛かると極小のスクロール幅で一気に出入り＝スクロールバックで“パッと消える”。
     段差も二重イージングもやめ、dev1 と同じ単一 easeOutQ の revealK で3要素をまとめて出入りさせる。 */
  revealEl(devEls.h2, revealK, 16, 24);
  revealEl(dev2StackEl, revealK, 16, 0);
  revealEl(devEls.list, revealK, 16, 24);
  const on = revealK > 0.35;
  if (slide) {
    /* テキストスライド案: モック内アニメーションはオフ(全要素を出しきった静止状態)。 */
    dsFillStaticAll();
    /* 時計 s: セクションが十分見えている間だけ進める(箱の割れ＝時間再生の起点)。 */
    if (revealK > 0.5) { if (dev2SeqT0 == null) dev2SeqT0 = elapsed; }
    else if (revealK < 0.12) dev2SeqT0 = null;
    const s = dev2SeqT0 == null ? -1 : elapsed - dev2SeqT0;
    /* 【2026-08-29 ヒデさん指定】箱が左右に割れて開く所は【時間再生】でゆったり。
       splitDelay 秒おいてから splitDur 秒かけて easeIO でなめらかに開く(スクロール駆動をやめる)。 */
    const splitDelay = d.splitDelay != null ? d.splitDelay : 0.45;
    const splitDur = Math.max(0.2, d.splitDur != null ? d.splitDur : 1.2);
    const openK = s < 0 ? 0 : easeIO(clamp01((s - splitDelay) / splitDur));
    updateDevSlide(openK, s);
  } else {
    dsResetBox();
    driveEditorLoop(null, on, 'dev2');
    if (on && typeof dmAnimScreen === 'function') {
      const t = elapsed - (devMockT0.dev2 == null ? elapsed : devMockT0.dev2);
      dmAnimScreen('api', t); dmAnimScreen('cli', t); dmAnimScreen('sdk', t);
    }
  }
}

/* 【2026-09-16 ヒデさん指定】開発者体験①②の「中央で一旦止まる(sticky保持)」が有効か。PC のみ・パネルで on/off。
   pin時は出現/保持の判定を .dev-blk-in(=固定される内側)の位置で測る＝固定中は rect.top≈0 で「出しきった状態」に張り付く=止まって見える。 */
function devPinOn() { return !isMobile && devEls.in1 && devEls.in2 && (params.sections.dev.pinStops !== 'off'); }
function updateDev(pRaw) {
  /* 【2026-08-26 リデザイン】固定追従なし・縦スクロール。ブロックが画面に入ったら
     ブラー+フェードで上品に出現。モックは表示中ずっとループ再生(V1.0踏襲)。 */
  const vh = innerHeight || 1;
  /* ブロックの中心が画面下端(=0)→画面の45%地点(=1) へ上がるまでに出しきる。
     45%を過ぎたら 1 で頭打ち＝出っ放し。画面の下にある間は 0＝隠す。 */
  const reveal = (el) => {
    if (!el) return 1;
    /* 【2026-09-09 ヒデさん指定】開発者体験のブラー出現も PC と同じに戻す(入場で1回だけ再生) */
    const r = rectOf(el);
    const centerY = r.top + r.height / 2;
    /* ブロックの上端が画面上端に来た時点でほぼ出しきる(=黒背景の直後に自動で出て見える)。0.5 で top=0 のとき k≒1 */
    return easeOutQ(clamp01((vh - centerY) / (vh * 0.5)));
  };
  const applyBlock = (el, k) => {
    if (!el) return;
    el.style.opacity = k.toFixed(3);
    const bl = (1 - k) * 16;
    el.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : '';
    el.style.transform = k < 0.999 ? `translateY(${((1 - k) * 24).toFixed(1)}px)` : '';
  };
  /* dev1(章①): ブロックを出現＋モックをループ駆動(表示中は流れっぱなし)。
     【2026-08-26】実績尾部に重ねているので、dev1 は「中央に着いてから」フェードインさせ、
     下からのせり上がりは黒(resGrow)の裏に隠す（黒がフェードするのと入れ替わりで“その場”に出る）。 */
  /* 【2026-08-29 ヒデさん指定】開発者体験①(開発スピード加速)は「もっと早めにブラーで出す」。
     下から上がってくる間に出しはじめ、中下部〜中央(center が vh*0.58 付近)でブラー0=一番くっきり。 */
  const b1r = rectOf(devPinOn() ? devEls.in1 : devEls.block1);
  const b1c = b1r.top + b1r.height / 2;
  const posK = easeOutQ(clamp01((vh - b1c) / (vh * 0.42)));   // center が vh*0.58 でくっきり(=1)
  /* 固定追従なし(smooth)は黒がゆったり時間追従なので、dev1 も“黒が覆う瞬間(resBlackK)”に合わせて出す
     (せり上がりを黒の裏に隠す)。「固定」モードは前の実装どおり位置だけで出す(黒はスクロール駆動)。 */
  /* 【2026-08-29】スムーズフェード時は黒オブジェクトが無いので、dev1 は位置(posK)だけで出す(黒待ちにしない)。 */
  const blackK = resSmooth() ? 1 : ((params.scrollHold === 'smooth') ? easeOutQ(clamp01((resBlackK - 0.55) / 0.35)) : 1);
  const k1 = posK * blackK;
  applyBlock(devEls.block1, k1);
  driveEditorLoop(dev1Refs, k1 > 0.35, 'dev1');
  /* dev2(章②): 見出し→モック→右テキストの順で出現＋モックをループ駆動 */
  updateDev2Reveal();

  /* 暗い地色(fixed 100vh)。
     ⚠️【2026-08-26 ヒデさん指定】黒トランジション中に「後ろも暗くなる」のを防ぐ。
        実績尾部に #dev を重ねているため、以前の (vh - r.top)/… だと #dev が入ってくる早い段階で
        dev-bg が全面を暗くし、resGrow(黒オブジェクト)がまだ小さいのに背景が暗く見えていた。
        → dev-bg は「dev1 が中央付近に着いてから(=resGrow が黒を渡す点)」だけ出す。
        それまでは背景は元の地色(#e7e7e7)のまま、resGrow オブジェクトだけが展開して黒になる。 */
  if (devEls.bg && devEls.sec) {
    const r = rectOf(devEls.sec);
    let bgK = 0;
    if (r.bottom > 0 && r.top < vh) {
      /* 【2026-08-29】スムーズフェード= dev が入ってくる分だけ背景を自然にクロスフェード(黒の裏に隠さない)。
         従来(黒オブジェクト)= dev1 が中央付近に来てから出す。 */
      /* 【2026-09-08 ヒデさん指定・根治】背景の暗幕もパネルの darkFrom/darkTo/darkVar に従わせる。
         これで“背景の暗さ”と“文字の白反転(darkKはこのdevDarkKに追従)”が必ず同期する
         (以前は背景=旧式・文字=新カーブでズレ、暗い背景に暗い文字が残っていた)。 */
      const _rc = params.sections.results || {};
      const _df = _rc.darkFrom != null ? _rc.darkFrom : 0;
      const _dt = _rc.darkTo != null ? _rc.darkTo : 0.7;
      const _dvv = _rc.darkVar || 1;
      const _uu = clamp01(((vh - r.top) / vh - _df) / Math.max(0.05, _dt - _df));
      const enter = resSmooth()
        ? (_dvv === 2 ? Math.pow(_uu, 2.4) : _dvv === 3 ? 1 - Math.pow(1 - _uu, 2.4) : _dvv === 4 ? _uu : easeIO(_uu))
        : clamp01((vh * 0.15 - r.top) / (vh * 0.25));
      /* 【2026-08-29 ヒデさん指定】dev→導入事例の境界を「実績→dev」と同じく境界を感じないフェードに。
         導入事例(下端=cases上端)がせり上がってくる分だけ、暗幕をゆっくり(easeIO)引いていく。 */
      const leave = resSmooth()
        ? easeIO(clamp01(r.bottom / (vh * 0.85)))
        : clamp01(r.bottom / (vh * 0.4));                          // 下端が抜けていく
      bgK = Math.min(enter, leave);
    }
    devEls.bg.style.opacity = bgK.toFixed(3);
    devDarkK = bgK;   /* 【2026-08-30 ヒデさん指定】暗幕の濃さを共有 → 導入事例の黒テキストも同じルールで白反転 */
  }

  /* 導入事例(cases)の見出しゲートに使われる devFin は、もう開発者体験に依存させない。
     cases 側は自分の再生進捗で見出しを出すよう変更済みなので、ここは 1 固定で無害化する。 */
  devFin = 1;
}

/* ---------- 導入事例 (カードスタック) ---------- */
const caseEls = {
  vp: document.querySelector('#cases .pin-vp'),
  title: document.getElementById('caseTitle'),
  eyebrow: document.getElementById('caseEyebrow'),
  hlines: [0, 1, 2].map(i => document.getElementById('cgH' + i)),   // 水平線(上→下)
  vline: document.getElementById('cgV'),                             // 中央の垂直線
  grid: document.getElementById('caseGrid'),
  cards: [0, 1, 2, 3].map(i => document.getElementById('caseCard' + i)),  // 4セル
};

function updateCases(pRaw) {
  const c = params.sections.cases;
  /* 所定の位置(固定)に着いたら1本の映像として自動再生 */
  let tc = playT('cases', c.playSec, canPlay(pRaw), SECS.cases, pRaw);
  /* 【2026-09-09 ヒデさん指定】導入事例のブラー出現も PC と同じ時間再生に戻す */
  const p = tc < 0 ? 0 : clamp01(tc / c.playSec);

  /* 「導入事例」ラベルと1枚目は、セクションが画面下から入ってくる助走のうちに出しきる。
     こうしないと、前の開発者体験セクションの固定が外れてから
     ここが固定され始めるまでの1画面ぶんが、まるまる何も起きない空スクロールになる */
  const pre = progOverride.casesPre != null ? progOverride.casesPre : preP(SECS.cases);
  /* 「導入事例」の文字は乗り換え区間に入った直後から出す。
     こうすると黒いセクションを抜けた瞬間にもう文字が見えていて、
     真っさらな画面を挟まずに次の話へ移れる */
  /* 【2026-08-18 指定】助走(pre)は「まだ背景が暗いうち」に終わってしまうので使えない。
     開発者体験の暗転の進み具合(devFin)を基準にして、明るくなりきってから中身を出す */
  /* ⚠️【2026-08-18 真因】.pin-vp には不透明な明るい背景(#f2f2f2)が入っている。
     導入事例は margin-top:-100vh で開発者体験と重なり、DOM で後ろにあるため
     【白い板が開発者体験を下から覆いながら上がってくる】。
     これが「暗い面の下に何も無い明るい帯」の正体だった。
     開発者体験が実績に対して同じ手当てをしているのと同様に、
     定位置(top:0)に着くまでは板そのものを透明にしておく。 */
  const casTop = rectOf(SECS.cases).top;
  /* 【2026-08-29】固定追従なしでは「top:0 に着くまで隠す」をやめ、入場で普通に見せる。 */
  const casHidden = (!CASES_NOPIN && params.pin !== 'off' && casTop > 2);
  setStyle(caseEls.vp, 'opacity', casHidden ? '0' : '1');
  /* ⚠️【2026-08-19 バグ修正】透明でもマウスの当たり判定は生きている。
     導入事例の板は margin-top:-100vh で開発者体験の上に重なっているので、
     透明なまま【右の API / CLI / SDK リストを覆って】ホバーが効かなくなっていた
     （ヒデさん報告「SDK部分のホバーが効かない」。実測では CLI も効いていなかった）。
     見えていない間は当たり判定も切る。
     ⚠️ .pin-vp だけでは足りない。section 自体が -100vh で重なっているので、
        section にも掛けないと「section が受け取ってしまう」（実測で確認） */
  setStyle(caseEls.vp, 'pointerEvents', casHidden ? 'none' : '');
  setStyle(SECS.cases, 'pointerEvents', casHidden ? 'none' : '');

  const noPin = params.pin === 'off';
  /* 固定なし: ブロックが画面に入ってからの秒数で流す（位置に直結させると
     スクロールを止めた所で止まり、カードがブラーのまま残る） */
  const npT = noPin ? npBlockT('cases', caseEls.vp) : -1;
  /* 【2026-08-25】開発者体験を非pin化したので devFin ゲートは廃止。
     見出しはこのセクションの再生進捗 p の頭でブラー→フェードで出す(自動再生の先頭)。 */
  const intro = noPin ? easeOutQ(clamp01(npT / 0.55))
                      : seg(p, 0, 0.12, easeOutQ);
  rv(caseEls.title, intro, 8, 8);
  rv(caseEls.eyebrow, intro, 8, 8);   /* 2026-09-15: 英語ラベルも見出しと同じ出方 */
  /* 【2026-08-30 ヒデさん指定】反転ルールの統一: dev の暗幕がまだ濃いうちに見えている「導入事例」は
     実績と同じく暗さに連動して白へ反転(明るくなったら元の黒に戻る)。 */
  [caseEls.title, caseEls.eyebrow].forEach(el => {
    if (!el) return;
    if (devDarkK > 0.002) {
      const b = [16, 24, 40];   // .case-title の元色 #101828
      el.style.color = `rgb(${Math.round(b[0] + (255 - b[0]) * devDarkK)},${Math.round(b[1] + (255 - b[1]) * devDarkK)},${Math.round(b[2] + (255 - b[2]) * devDarkK)})`;
    } else if (el.style.color) {
      el.style.color = '';
    }
  });

  /* 【2026-08-25 刷新・カンプ 15800:24258】
     水平線3本(上→下でディレイ) が左から引かれる → 中央の垂直線が上から引かれる → カード4枚がブラーで登場。
     線は CSS の scaleX / scaleY を 0→1 にして「左から / 上から引く」。線・カードは再生進捗 p 基準。 */
  /* 【2026-08-30 ヒデさん指定】固定追従なし(no-pin)でもパネルの値で動くよう共通化。
     ⚠️ 以前は no-pin だと npT(秒)のハードコード(0.25s/0.7s/0.9s…)で、パネルのつまみが効いていなかった。
     いまは no-pin では q = npT / playSec(再生尺に対する割合)にして、pin と同じ lineAt/vlineAt/cardAt を使う。 */
  const q = noPin ? clamp01(npT / Math.max(0.1, c.playSec)) : p;
  /* 水平線: 上(i=0)が先。下へ行くほど lineStagger だけ遅れて引き始める */
  caseEls.hlines.forEach((el, i) => {
    if (!el) return;
    const a = c.lineAt + i * c.lineStagger;
    const k = seg(q, a, a + c.lineDur, easeOutQ);
    el.style.transform = `scaleX(${k.toFixed(4)})`;
  });
  /* 中央の垂直線: 上から下へ (水平線が進んだあと) */
  if (caseEls.vline) {
    const vk = seg(q, c.vlineAt, c.vlineAt + c.vlineDur, easeOutQ);
    caseEls.vline.style.transform = `scaleY(${vk.toFixed(4)})`;
  }
  /* カード4枚: 罫線が引けたあと、左上→右上→左下→右下 の順にブラーで登場。
     ⚠️ 固定なしではブロックごと（.pin-stage）にブラーで出しているので、カード側には掛けない(二重防止) */
  /* 【2026-09-19 ヒデさん依頼】カードは1枚ずつ: それぞれが「自分が画面に入った時点」(npBlockT)を起点に、1→2→3→4 の順に
     cardStagger 秒ずつ遅れてブラーで出る(旧 2026-08-30: 4枚同時・no-pin ではブラー無し)。
     同じ行の2枚は同時に画面に入るのでディレイで前後する。下の行が遅れて入った分はディレイから差し引く(待たせすぎない)。
     画面から出ると npBlockT が時計を戻すので、戻ってくるとまた1枚ずつ出る(他セクションと同じリプレイ) */
  const stag = c.cardStagger != null ? c.cardStagger : 0.18;
  const cardT = caseEls.cards.map((el, i) => el ? npBlockT('caseCard' + i, el) : -1);
  const ent0 = (npClocks.caseCard0 && npClocks.caseCard0.t0 != null) ? npClocks.caseCard0.t0 : null;
  caseEls.cards.forEach((el, i) => {
    if (!el) return;
    const t = cardT[i];
    const st = npClocks['caseCard' + i];
    const late = (ent0 != null && st && st.t0 != null) ? Math.max(0, st.t0 - ent0) : 0;   /* 1枚目より遅れて画面に入った秒数 */
    const delay = Math.max(0, i * stag - late);
    const k = t < 0 ? 0 : easeOutQ(clamp01((t - delay) / Math.max(0.05, c.cardDur)));
    el.style.opacity = k.toFixed(3);
    const bl = (1 - k) * c.inBlur;
    el.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : '';
  });
}

/* 各セクションの「自動再生の開始時刻」をまとめて初期化する。
   通常はリプレイさせないので触らないが、「↺ 最初から」と検証用フックからだけ呼ぶ */
/* ===== スクロールリプレイ (2026-08-15 復活) =====
   セクションが画面から完全に外れたら時計を巻き戻す。戻ってくるともう一度アニメが流れる。
   ⚠️ 画面に半分でも残っているうちに巻き戻すと、見ている最中に頭へ戻ってしまうので
      「上下に1画面ぶん離れたら」という余裕を持たせている */
function replayCheck() {
  if (!params.replay) return;
  for (const k in SECS) {
    if (!secPlay[k]) continue;
    if (progOverride[k] != null) continue;   /* 検証で進捗を固定している時は巻き戻さない */
    const r = rectOf(SECS[k]);
    /* 完全に画面の外へ出たら巻き戻す。再生が始まるのは固定された時(top≒0)なので、
       これでも「見ている最中に頭へ戻る」ことはない */
    if (r.bottom <= 0 || r.top >= innerHeight) resetSectionClock(k);
  }
}
function resetSectionClock(k) {
  delete secPlay[k];
  delete storyP[k];
  if (k === 'vision')  { visAutoT0 = null; visAutoDone = false; visMoveT0 = null; visT = -1; }
  if (k === 'results') { resT0 = null; resT = -1; }
  if (k === 'dev')     { devHoldT0 = null; devScreenT0 = null; devStarted = false;
                         devScreen2 = 'api'; devSwapT0 = null; dmBuildScreen('editor'); }
}

function resetSectionClocks() {
  visAutoT0 = null; visAutoDone = false; visMoveT0 = null; visT = -1;
  resT0 = null; resT = -1;
  for (const k in storyP) delete storyP[k];
  for (const k in secPlay) delete secPlay[k];
  scrollLocked = false; if (lenis) lenis.start();
  devHoldT0 = null; devScreenT0 = null; devStarted = false;
}

/* スクロール慣性補間: 生のスクロール進捗を毎フレーム少しずつ追いかける (lenis風のぬるっと感) */
const smoothP = { vision: -1, dev: -1, cases: -1, results: -1 };   // -1 = 未初期化
/* ⚠️ 2026-08-14: 一度「1秒あたりの進捗上限(maxRate)」を入れたが、
   スクロールしても画面が進まない“のっそり”した感じになり不採用。元の追従に戻した。
   早送り対策は、進捗を鈍らせるのではなく【上限だけ決めて時間で進める】方向で解いた。 */
function smoothTo(key, target) {
  const k = params.sections.common.smooth;
  if (k <= 0 || smoothP[key] < 0) { smoothP[key] = target; return target; }
  const a = 1 - Math.exp(-frameDt * k);
  smoothP[key] += (target - smoothP[key]) * a;
  if (Math.abs(target - smoothP[key]) < 0.0004) smoothP[key] = target;
  return smoothP[key];
}

/* ---------- キービジュアルの登場 (ヘッダー → 小見出し → タイピング → グラフィック) ---------- */
const kvEls = {
  header: document.querySelector('.header'),
  eyebrow: document.getElementById('hlEyebrow'),
  lines: [document.getElementById('hlL1'), document.getElementById('hlL2'), document.getElementById('hlL3')].filter(Boolean),
  orbit: document.querySelector('.orbit'),
  logos: document.querySelector('.logos'),
  chars: [[], []],
  carets: [],
};
/* ⚠️ CSS で .headline を消してあるのは「JS が動く前の素の文字」を出さないため。
   1文字ずつの箱を組み終えたら、器そのものは表示に戻す（中身の出現は JS が管理する） */
(function unhideHeadline() {
  const h = document.querySelector('.headline');
  if (h) h.style.opacity = '1';
})();
/* 【2026-09-17 ヒデさん依頼】タイピング演出は残しつつ「1文字スパン」をやめ、DOM は "表示中の部分文字列(普通のテキスト)＋キャレット" だけにする。
   ＝ ソースHTMLの素のテキスト(例: <span id="hlL1">AIと事業を<i class="hl-caret"></i>)をそのまま編集でき、本番で検証ツールでも普通のテキストとして置き換えられる。 */
kvEls.text = ['', ''];
kvEls.textNodes = [null, null];
(function buildKvType() {
  kvEls.lines.forEach((line, i) => {
    const caret = line.querySelector('.hl-caret');
    const first = line.firstChild;
    const full = (first && first.nodeType === 3) ? first.textContent : '';   // ソースの素テキストを保持
    kvEls.text[i] = full;
    if (first && first.nodeType === 3) line.removeChild(first);
    const tn = document.createTextNode('');   // 表示中の部分文字列を入れる普通のテキストノード(スパンではない)
    line.insertBefore(tn, caret);
    kvEls.textNodes[i] = tn;
    kvEls.carets.push(caret);
  });
})();

/* 【2026-09-26 整理】旧KV(iframe の kv/embed.html・A案/B案)の遅延読み込み・案の切替・入場の合図(postMessage)は撤去。
   KV は惑星だけ(params.kvDesign は読み込み時に 'planet' へそろえる)。 */
document.documentElement.classList.toggle('kv-planet', params.kvDesign === 'planet');
/* 【2026-08-30 ヒデさん指定】ナビ項目の左右の間隔(px)。パネルの「ナビ項目の間隔」から変えられる */
function applyNavGap() {
  document.documentElement.style.setProperty('--nav-gap', (params.kv.navGap != null ? params.kv.navGap : 32) + 'px');
}
applyNavGap();
/* 【2026-08-31 ヒデさん指定】KVコピーの文字設定(サイズ/サブの罫線)をCSS変数へ反映。
   【2026-09-17 大掃除】太さ・字間は「文字」(params.edits)へ一本化したのでここでは扱わない。
   コピー左端は「ヘッダーロゴの左端」が基準(--kv-copy-base を実測で入れる)。copyX はそこからのずらし。 */
/* 【2026-09-18 ヒデさん依頼】ハンバーガーメニュー(左寄せ大)の余白・間隔・文字サイズ → CSS 変数 */
const LOGO_KEYS = ['hennge', 'upsider', 'np', 'akerun', 'smaregi', 'andpad', 'icare', 'contracts', 'sweeep'];
/* 【2026-09-18 ヒデさん依頼】ロゴ帯の目視の微調整(上下・左右の余白)を両セットの img に当てる */
function applyLogoTune() {
  const T = params.logoTune || {};
  document.querySelectorAll('.mq-set').forEach(set => { Array.from(set.querySelectorAll('img')).forEach((img, i) => { const k = LOGO_KEYS[i]; const t = (k && T[k]) || {}; img.style.setProperty('--dy', (t.dy || 0) + 'px'); img.style.marginLeft = (t.mx || 0) + 'px'; img.style.marginRight = (t.mx || 0) + 'px'; }); });
}
function applyDrawerTune() {
  const d = Object.assign({ padT: 0, padB: 0, padL: 130, padR: 0, gap: 24, fs: 56, numFs: 14 }, params.drawer || {}); const r = document.documentElement.style;
  r.setProperty('--drw-pt', d.padT + 'px'); r.setProperty('--drw-pb', d.padB + 'px'); r.setProperty('--drw-pl', d.padL + 'px'); r.setProperty('--drw-pr', d.padR + 'px');
  r.setProperty('--drw-gap', d.gap + 'px'); r.setProperty('--drw-fs', d.fs + 'px'); r.setProperty('--drw-num-fs', d.numFs + 'px');
  r.setProperty('--hdr-nav-blur', (d.navBlur != null ? d.navBlur : 8) + 'px');
  /* 【2026-09-18 ヒデさん依頼】ハンバーガーアイコン(2本線)の長さ・太さ・間隔(html.bi-2 の CSS より優先させるため要素に直接) */
  document.querySelectorAll('.hdr-burger, .cta-burg').forEach(b => { b.style.setProperty('--bg-w', (d.barW != null ? d.barW : 20) + 'px'); b.style.setProperty('--bg-h', (d.barH != null ? d.barH : 2) + 'px'); b.style.setProperty('--bg-gap', (d.barGap != null ? d.barGap : 7) + 'px'); });
}
function applyKvCopy() {
  const r = document.documentElement.style, k = params.kv;
  /* 【2026-09-20 #3】KV見出しの文字サイズもSP独立。実機SPは params.mb 直読み＋SP既定(main34/jump60/eyebrow12=SPカンプ由来の --fs-hero/--fs-hero-jump/--fs-caption)、PCは70/120/20。
     SP CSS(.hl-main 等)もこの変数を読むよう変更済み＝スマホモードのパネル数値と実機が一致する。isMobile確定後(fit)にも再実行。 */
  const _mbK = (params && params.mb) || {};
  const _isMbK = (typeof isMobile !== 'undefined' && isMobile);
  const effK = (f, pc, sp) => _isMbK ? (_mbK['kv.' + f] != null ? _mbK['kv.' + f] : sp) : (k[f] != null ? k[f] : pc);
  r.setProperty('--kv-main-size', effK('mainSize', 70, 34) + 'px');
  r.setProperty('--kv-jump-size', effK('jumpSize', 120, 60) + 'px');   /* 最終行「競争力を」(PC調整版 120px / SP 60px) */
  r.setProperty('--kv-eyebrow-size', effK('eyebrowSize', 20, 12) + 'px');
  /* 【2026-09-20 ヒデさん依頼】ヘッダー↔コピーの距離。基準top(PC208/SP434)に足すオフセット。PC/SP独立(mbKey)。 */
  r.setProperty('--kv-hl-off', (k.hlOff != null ? k.hlOff : 0) + 'px');
  /* 【2026-09-20 ヒデさん依頼】スマホ版: ヘッダー↔コンテンツの距離(KV全体=グラフィック＋コピー＋ロゴ帯を下げる)。PCのレイアウトは未使用。 */
  r.setProperty('--kv-sp-top', (k.spTop != null ? k.spTop : 0) + 'px');
  /* 【2026-09-18】案ごとの書体(太さ/行間)。PC だけ CSS 変数で効かせる(スマホは 9/9 トレースのまま) */
  r.setProperty('--kv-main-weight', String(k.mainWeight != null ? k.mainWeight : 800));
  r.setProperty('--kv-main-lh', String(k.mainLh != null ? k.mainLh : 1.4));
  r.setProperty('--kv-last-weight', String(k.lastWeight != null ? k.lastWeight : 700));
  r.setProperty('--kv-last-lh', String(k.lastLh != null ? k.lastLh : 1.2));
  r.setProperty('--kv-eyebrow-weight', String(k.eyebrowWeight != null ? k.eyebrowWeight : 500));
  r.setProperty('--kv-eyebrow-lh', (k.eyebrowLh ? String(k.eyebrowLh) : 'normal'));
  document.documentElement.classList.toggle('kvv-eyebrow-col', k.eyebrowLayout === 'col');
  /* 【2026-09-20 ヒデさん依頼】KVを中央配置に。コピーは #stage(1440px・中央寄せ) の中にあるので、
     ステージが中央に寄る幅(ウィンドウ>1440＝stage.left>0)では base を設計値(50px・ステージ基準)に固定する。
     こうするとグラフィック(同じ #stage 内)と同じだけ中央へ寄り、コピー↔グラフィックの余白を保ったまま全体が中央に集まる。
     1440以下は従来どおりロゴ左端に合わせる(ステージが幅いっぱいなので見た目は不変)。 */
  try {
    const logo = document.querySelector('.logo'), st = document.getElementById('stage');
    let base = 50;
    const sr = st ? st.getBoundingClientRect() : null;
    if (sr && sr.left > 1) {
      base = 50;   /* 広い画面: ステージが中央寄せ → コピーもステージ基準の設計値で中央へ */
    } else if (logo && sr) {
      const sc = sr.width > 0 ? (sr.width / 1440) : 1;
      const lr = logo.getBoundingClientRect();
      if (lr.width > 0 && sr.width > 0) base = Math.round((lr.left - sr.left) / sc);
    }
    r.setProperty('--kv-copy-base', base + 'px');
  } catch (e) { r.setProperty('--kv-copy-base', '50px'); }
  r.setProperty('--kv-copy-dir', k.copyOrder === 'sub' ? 'column-reverse' : 'column');
  r.setProperty('--kv-eyebrow-dash', (k.eyebrowDash === false) ? 'none' : 'block');
  r.setProperty('--kv-eyebrow-dash-w', (k.eyebrowDashW != null ? k.eyebrowDashW : 26) + 'px');
  r.setProperty('--kv-dash-gap', (k.dashGap != null ? k.dashGap : 10) + 'px');
  r.setProperty('--kv-copy-gap', (k.copyGap != null ? k.copyGap : 16) + 'px');
  r.setProperty('--kv-copy-x', (k.copyX || 0) + 'px');
  r.setProperty('--kv-copy-y', (k.copyY || 0) + 'px');
}
applyKvCopy();
applyDrawerTune();
applyLogoTune();
/* (旧フォントテスト FONT_TEST_PRESETS / applyFontTest は 2026-09-17 の大掃除で撤去。⑪調整版の値は CSS(.hl-main 等)・DEFAULTS.kv・applySway(KV_GFX) に焼き込み済み) */
/* ポイント1・2の文字サイズ(2026-09-03) */
function applyVpSize() {
  const v = (params.sections && params.sections.vision) || {};
  const r = document.documentElement.style;
  const mb = (params && params.mb) || {};
  const isMb = (typeof isMobile !== 'undefined' && isMobile);   /* 実機SP(幅≤600) */
  /* 【2026-09-20 ヒデさん#3】SPは既定トークン(msg26/見出し20/本文12)を基準にし、SP上書き(params.mb)があればそれを使う。
     PCは従来どおり(50/26/14)。SP CSS 側もこの変数を読むよう変更済み＝パネルの数値と実機の見た目が一致する。
     ※実機では PC値が v.* に流れ込んでいる(applyMbToParams)が、SPは params.mb を直接見るので PC値は漏れない。 */
  const eff = (field, pcDef, spDef) => isMb
    ? (mb['sections.vision.' + field] != null ? mb['sections.vision.' + field] : spDef)
    : (v[field] != null ? v[field] : pcDef);
  r.setProperty('--vp-h-size', eff('pHSize', 26, 20) + 'px');
  r.setProperty('--vp-p-size', eff('pPSize', 14, 12) + 'px');
  r.setProperty('--vp-width', (v.pWidth != null ? v.pWidth : 328) + 'px');
  r.setProperty('--vis-msg-size', eff('msgSize', 50, 26) + 'px');
  r.setProperty('--vis-emph-gap', eff('emphGap', 119, 50) + 'px');
  try { applyCtaArrow(); } catch (e) {}   /* 【2026-09-26】お問い合わせボタンの矢印の線幅(PC/SP別)もここで一緒に反映＝起動・スマホ判定後・ライブ同期で取り直される */   /* 【2026-09-25】強調案の1↔2行目の行間(PC既定119/SP既定50・PC/SP独立) */
}
/* 【2026-09-26 ヒデさん依頼】お問い合わせボタンの矢印の線幅(実寸px)。PC=params.cv.ctaArrowW / SP=params.mb['cv.ctaArrowW']。未設定は2px */
function applyCtaArrow() {
  const isMb = (typeof isMobile !== 'undefined' && isMobile), mb = (params && params.mb) || {}, cv = (params && params.cv) || {};
  const w = isMb ? (mb['cv.ctaArrowW'] != null ? mb['cv.ctaArrowW'] : 2) : (cv.ctaArrowW != null ? cv.ctaArrowW : 2);
  document.documentElement.style.setProperty('--cta-arrow-w', (+w || 2) + 'px');
}
applyVpSize();
/* 【2026-09-21 ヒデさん依頼】背景グリッド(方眼)。params.grid → html.grid-on と CSS変数(--grid-cell/-w/-line)へ。 */
function applyGrid() {
  const g = (params && params.grid) || {};
  const el = document.documentElement;
  try { el.classList.toggle('grid-on', !!g.on); } catch (e) {}
  const s = el.style;
  s.setProperty('--grid-cell', (g.cell != null ? g.cell : 40) + 'px');
  s.setProperty('--grid-w', (g.w != null ? g.w : 1) + 'px');
  const op = (g.op != null ? g.op : 0.45);
  let rgb = '172,172,172';
  const m = /^#?([0-9a-fA-F]{6})$/.exec(g.color || '#ACACAC');
  if (m) { const n = parseInt(m[1], 16); rgb = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }
  s.setProperty('--grid-line', 'rgba(' + rgb + ',' + op + ')');
  /* 【2026-09-21 ヒデさん「もっと合わせたい」】方眼のタテ線を画面の中央に合わせる=中身の中央にある仕切り線(for SaaS/AI)が
     どの画面幅(1440以外の1512等)でもマス目に乗る。中央にマス線が来るよう左オフセットを (画面幅/2)%マス で算出。 */
  const cell = (g.cell != null ? g.cell : 40);
  const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1440;
  s.setProperty('--grid-pos-x', (Math.round(((vw / 2) % cell) * 100) / 100) + 'px');
}
applyGrid();
/* 【2026-09-01】実績: Anyflowと「が」の間(px)をCSS変数へ */
function applyResSlotGap() {
  const v = params.sections && params.sections.results ? params.sections.results.slotGap : 4;
  document.documentElement.style.setProperty('--res-slot-gap', (v != null ? v : 4) + 'px');
}
applyResSlotGap();
/* 【2026-09-15 ヒデさん指定】案24 系: 2つの価値のブロックと区切り線の間の余白(px) */
/* 【2026-09-15 ヒデさん指定】開発者体験②のスロットの箱の位置・高さ */
function applyDsBox() {
  const d = (params.sections && params.sections.dev) || {};
  const r = document.documentElement.style;
  r.setProperty('--ds-box-y', (d.slotBoxY != null ? d.slotBoxY : 0) + 'px');
  r.setProperty('--ds-box-h', (d.slotBoxH != null ? d.slotBoxH : 42) + 'px');
}
applyDsBox();
function applyResHrGap() {
  const r = (params.sections && params.sections.results) || {};
  document.documentElement.style.setProperty('--rfx-hr-gap', (r.hrGap != null ? r.hrGap : 100) + 'px');
  document.documentElement.style.setProperty('--rfx-hr-gap2', (r.hrGap2 != null ? r.hrGap2 : 0) + 'px');
}
applyResHrGap();
applyPfGradStops();   /* 【2026-09-01】軌道グラデの色ストップを保存値で反映 */
/* 【2026-08-31 ヒデさん指定・バグ修正】バリエーションの「いまの設定で上書き」がリロード後に
   見た目へ反映されない問題: 上書き自体は保存されていたが、開いた直後は誰も適用していなかった。
   起動時、選択中の案に上書き(または昇格プリセット)があれば、その数値で開く。 */
/* ⚠️ ここで即時実行すると、applyGfxVariant→markDirty が後方で let 宣言される変数(syncPresetPills等)に
   触れて TDZ の ReferenceError になり、リセット(net3d=false)の直後に中断していた(実際に発生)。
   setTimeout(0) でスクリプト評価が全部終わってから適用する。 */
setTimeout(function applyOverrideOnBoot() {
  try {
    const m = params.converge || 'off';
    const i = (params.gfxVariantOn || {})[m];
    if (i == null) return;
    const v = (GFX_VARIANTS[m] || [])[i];
    if (!v) return;
    const ov = ((params.gfxVarOverride || {})[m] || {})[v.name];
    if (ov || v.preset) applyGfxVariant(i);
  } catch (e) {}
}, 0);
/* 【2026-09-18】KVのバリエーション(ノーマル/強調)は、上の起動案の再適用より【後】に流し込む(惑星やカゴの値が上書きされないように) */
setTimeout(() => { try { applyKvVariant(kvVarKey(), true); } catch (e) {} }, 0);
setTimeout(() => { try { if (typeof varApplyOverridesAtStartup === 'function') varApplyOverridesAtStartup(); } catch (e) {} varCaptureReady = true; try { applyMbToParams(); } catch (e) {} try { if (typeof applyVisEmph === 'function') applyVisEmph(); } catch (e) {}   /* 【2026-09-20】ビジョンのバリエーション(強調/デフォルト)を焼き込み/保存値で組み直す */ try { SESSION_START = JSON.parse(JSON.stringify(params)); } catch (e) {}   /* 【2026-09-20】リセットの基準=開いた時の値を控える */ try { if (typeof renderFrame === 'function') renderFrame(); } catch (e) {} }, 0);   /* 【2026-09-19】ビジョン等の案の上書きをリロード後も反映。済んだら即時控えを解禁。【2026-09-20】スマホ(SP)は params.mb を本体へ流し込む */
/* 【2026-09-20 ヒデさん依頼・PC/SP独立】スマホ(isMobile)の時だけ、スマホ専用の値 params.mb を本体 params の該当パスへ流し込む(PCでは何もしない=PCの値は不変) */
function mbDeepSet(root, path, val) { const ks = String(path).split('.'); let o = root; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; }
/* 【2026-09-22 ヒデさん依頼】導入事例カードの上下パディング(スマホ)を調整パネルから可変に。--cg-pad-y を設定。
   SP の .cg-cell だけが読む(PCのカードは別レイアウトで未使用)ので PC の見た目には影響しない。値は
   params.sections.cases.cardPadY(SPは params.mb 経由で applyMbToParams が流し込む)。既定24px。 */
function applyCasesPad() {
  try {
    const c = params.sections && params.sections.cases;
    const v = (c && c.cardPadY != null) ? c.cardPadY : 24;
    document.documentElement.style.setProperty('--cg-pad-y', Math.round(v) + 'px');
  } catch (e) {}
}
function applyMbToParams() { if (!(typeof isMobile !== 'undefined' && isMobile)) return; if (!params || !params.mb) return; for (const p in params.mb) { try { mbDeepSet(params, p, params.mb[p]); } catch (e) {} } try { applyVpSize(); } catch (e) {} try { applyKvCopy(); } catch (e) {} try { applyPictoDisp(); } catch (e) {} try { applyCasesPad(); } catch (e) {}   /* 【2026-09-22】SP上書き後、カードの上下パディングも取り直す */   /* 【2026-09-21】SP上書きを流した後、ピクト表示サイズも取り直す */   /* 【2026-09-20 #3】SP上書きを流し込んだ後、ビジョン/KVの文字サイズ変数を取り直す(ライブ同期でも即反映) */ }
applyCasesPad();   /* 【2026-09-22】起動時に --cg-pad-y の既定を入れる(PC/SP共通・PCは未使用) */

function updateKV() {
  const c = params.kv, t = elapsed;
  /* 【2026-09-09 ヒデさん指定】スマホも KV の入場(タイピング→グラフィックのブラー出現)は PC と同じ。
     2026-09-08 の「最初から最終状態で固定」は撤回。スクロールで動く要因(揺れ/再レイアウト)は
     applySway の sway 無効化と fit() のガードで別途止めている。ロゴ帯だけは JS で触らず CSS で出す(下の rv 参照)。 */
  /* 【2026-09-09 ヒデさん指摘「ボタン/サブコピーに影」】ヘッダー(お問い合わせボタン)とサブコピーの
     entrance blur は iOS で合成レイヤーの残像(=影)になる。スマホは blur=0(フェード+スライドのみ)にする。
     グラフィックの登場ブラーは“望まれた演出”なので残す。 */
  rv(kvEls.header, easeOutQ(clamp01((t - c.headerAt) / T_IN)), isMobile ? 0 : 8, 10);

  /* 1文字ずつ打ち込む */
  const tt = t - c.typeAt;
  /* 緩急: 最初はゆっくり、だんだん速くなる。i文字目までの所要時間 = charDur * n * (i/n をイーズインした値) */
  const e = c.typeEase;
  const ease = x => x * (1 - e) + e * x * x;          // 0→1 を前半ゆっくりに
  const timeOf = (i, n, dur) => dur * n * ease(i / Math.max(1, n));
  /* 【2026-09-17】行数可変(2〜3行など)に一般化: 各行の開始時刻を累積で出す。1行目は素早く charDur、以降はゆったり charDur2。行間は lineGap */
  const durOf = li => (li === 0 ? c.charDur : c.charDur2);
  const starts = []; let acc = 0;
  kvEls.text.forEach((full, li) => { starts.push(acc); acc += timeOf(full.length, full.length, durOf(li)) + c.lineGap; });
  const typeEnd = acc - c.lineGap;   // 最終行の打ち終わり
  kvEls.textNodes.forEach((tn, li) => {
    if (!tn) return;
    const full = kvEls.text[li], n = full.length, base = starts[li], dur = durOf(li);
    /* 打ち終わった文字数を数え、テキストノードを部分文字列に(＝カーソルは打った文字の直後)。スパンは使わない */
    let count = 0;
    for (let ci = 0; ci < n; ci++) { if (tt >= base + timeOf(ci, n, dur)) count = ci + 1; else break; }
    if (tn.data.length !== count) tn.data = full.slice(0, count);
  });
  const blink = ((tt * 1.7) % 1 < 0.55) ? 1 : 0;
  const typing = tt > -0.15 && tt < typeEnd + 0.5;
  /* いま打っている行のキャレットだけ点滅(その行の開始〜次の行の開始まで) */
  kvEls.carets.forEach((car, li) => {
    if (!car) return;
    const on0 = starts[li] - c.lineGap * 0.4;
    const on1 = (li + 1 < starts.length) ? starts[li + 1] - c.lineGap * 0.4 : typeEnd + 0.5;
    car.style.opacity = (typing && tt >= on0 && tt < on1) ? blink : 0;
  });

  /* 打ち終わってから小ラベル(罫線ごと) → グラフィック → ロゴ の順で出す
     (2026-08-14: 以前は小ラベルが先に出ていたが、タイピングの後に変更) */
  /* ブラーで出てくる所の速さはここでまとめて決める (2026-08-15: 速すぎるとの指摘でゆったりへ) */
  const RD = c.revealDur;
  const eyeAt = c.typeAt + typeEnd + c.eyebrowGap;
  rv(kvEls.eyebrow, easeOutQ(clamp01((t - eyeAt) / RD)), isMobile ? 0 : 8, 8);   /* サブコピーの影対策(上記) */
  const gAt = eyeAt + c.graphicGap;
  const _orbReveal = easeOutQ(clamp01((t - gAt) / (RD * 1.5)));
  if (kvRevealElapsed == null && _orbReveal > 0.5) kvRevealElapsed = elapsed;
  rv(kvEls.orbit, _orbReveal, 12);
  /* スマホのロゴ帯は JS(rv)で触らない: iOS で inline の blur/opacity 書き込みが合成レイヤーを落とすため。
     スマホは常時表示(CSS の .logos opacity:1)＝チカチカ/一瞬消える対策(2026-09-09、遅延フェードは撤去)。 */
  if (!isMobile) rv(kvEls.logos, easeOutQ(clamp01((t - gAt - RD * 0.6) / RD)), 8);
  /* 【2026-09-26 整理】旧KV iframe への入場合図(1行目の打ち終わり＋introLead)は iframe ごと撤去 */
}

function updateSections() {
  const nowY = window.scrollY || window.pageYOffset || 0;
  const dY = nowY - lastScrollY;
  if (Math.abs(dY) > 0.5) scrollDir = dY < 0 ? -1 : 1;
  lastScrollY = nowY;
  updateScrollLock();
  clampScroll();
  /* 【2026-09-02】診断記録は8フレームに1回へ間引き。elementFromPoint+rect取得×6が毎フレーム
     強制レイアウトを誘発していた(プロファイル実測2.2%+α)。240行リングは約32秒ぶんに伸びる */
  if ((frameCount & 7) === 0) diagWatch();
  fastForward();
  replayCheck();
  updateKV();
  /* ⚠️ 固定追従なしではセクションの高さが 100vh なので pinP の分母が 0 ＝ 常に 0 になる。
     その結果「スクロール量に紐づく見た目」（軌道の移動・拡大、暗転、カードの重なり）が
     一切進まず、軌道が小さいまま止まる（2026-08-18 ヒデさん報告）。
     固定なしの時は「セクションが画面下から上がってくる分」を進行度として渡す。 */
  const prog = el => (params.pin === 'off' ? clamp01(preP(el)) : pinP(el));
  /* 【2026-08-29】Vision だけは固定追従なし＝入場進捗(preP)で自動再生。実績・事例は従来どおり。 */
  /* 【2026-08-29 ヒデさん指定】固定追従なしは「入った瞬間に発火」だと画面外(下に peek)で
     もう再生されてしまう。セクションがある程度画面に入ってから(上端が約75%より上)発火させる。 */
  const NOPIN_ENTER = 0.45;   // preP をこのぶん遅らせて発火(大きいほど中に入ってから)。0.45=セクションが半分以上入ってから
  const visProg = VIS_NOPIN ? clamp01(preP(SECS.vision) - NOPIN_ENTER) : prog(SECS.vision);
  updateVision(progOverride.vision != null ? progOverride.vision : smoothTo('vision', visProg));
  updateDev(progOverride.dev != null ? progOverride.dev : smoothTo('dev', prog(SECS.dev)));
  updateDev2Stack();   /* dev2 の3枚カルーセル(ホバー切替) */
  /* 【2026-08-29】導入事例も固定追従なし＝入場進捗(preP)で自動再生。 */
  const casesProg = CASES_NOPIN ? clamp01(preP(SECS.cases) - NOPIN_ENTER) : prog(SECS.cases);
  updateCases(progOverride.cases != null ? progOverride.cases : smoothTo('cases', casesProg));
  /* 【2026-08-29】スムーズフェード時は実績も固定追従なし＝入場進捗(preP)で自動再生。 */
  const resProg = resSmooth() ? clamp01(preP(SECS.results) - NOPIN_ENTER) : prog(SECS.results);
  updateResults(progOverride.results != null ? progOverride.results : smoothTo('results', resProg));
  if (params.pin === 'off') renderNoPin();
}

/* ================= 球体 (WebGL / 2Dグラデを3D回転) ================= */
const sphereCanvas = document.getElementById('sphere');
let sphereGL = null;

function initSphere() {
  /* ⚠️【2026-08-28】preserveDrawingBuffer が無いと、描いた直後以外は canvas の中身を読めない。
     エコー(残像)は毎フレーム drawImage で惑星の絵を複製するので、これが無いと複製が空になり
     「残像が全く見えない」状態になっていた(実測: 濃さ0.855でも画面に何も出ない)。 */
  const gl = sphereCanvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl) { sphereFallback(); return; }

  const vs = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  /* 共通部にデザイン専用の仕上げ(finish)・補助関数(helpers)・粒の細かさを差し込み、惑星ごとに別シェーダーを作る */
  const fsTemplate = (grainScale, finish, helpers) => `
precision highp float;
uniform vec2 uRes;
uniform float uAngle;    /* 主回転 (rad) */
uniform float uAngle2;   /* 2軸目の回転 (rad) */
uniform float uNoise;    /* 追い粒の強さ (カンプ由来の質感に上乗せ) */
uniform float uLight;    /* 1=なし / 2=右上光源 */
uniform sampler2D uTex;  /* カンプの惑星画像 (4倍解像度) */

mat3 rotAxis(vec3 a, float t){
  float c = cos(t), s = sin(t);
  vec3 u = normalize(a);
  return mat3(
    c+u.x*u.x*(1.-c),      u.x*u.y*(1.-c)-u.z*s,  u.x*u.z*(1.-c)+u.y*s,
    u.y*u.x*(1.-c)+u.z*s,  c+u.y*u.y*(1.-c),      u.y*u.z*(1.-c)-u.x*s,
    u.z*u.x*(1.-c)-u.y*s,  u.z*u.y*(1.-c)+u.x*s,  c+u.z*u.z*(1.-c)
  );
}
float hash(vec3 p){
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
${helpers || ''}
void main(){
  vec2 p = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  float R = 0.884615; /* 230px / 260px */
  float len = length(p);
  float px = 2.0 / uRes.y;
  float alpha = 1.0 - smoothstep(R - 1.5 * px, R + 1.5 * px, len);
  if (alpha <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float z = sqrt(max(R * R - dot(p, p), 1e-5));
  vec3 n = normalize(vec3(p, z));

  /* 回転軸: 軌道の傾き(-23°)とはずらした斜め軸 + ゆっくり別軸 → 多面的 */
  vec3 ax1 = normalize(vec3(0.53, 0.85, 0.35));
  vec3 ax2 = normalize(vec3(-0.62, 0.22, 0.76));
  vec3 d = rotAxis(ax2, uAngle2) * rotAxis(ax1, uAngle) * n;

  /* カンプ画像を球面に貼る: 回転後の向き d から画像の色を拾う。
     無回転ならカンプがピクセルそのまま出る。裏側(d.z<0)はカンプに無いので鏡映で生成 */
  vec2 uv = vec2(0.5 + d.x * 0.47, 0.5 - d.y * 0.47);
  vec3 col = texture2D(uTex, uv).rgb;

  /* 球の表面に張り付いた粒 (球と一緒に回る) */
  float grain = hash(floor(d * ${grainScale}) + 0.5) - 0.5;

  /* ---- デザイン専用の仕上げ ---- */
  ${finish}

  /* ---- 右上光源モード: 白を「光の反射」として陰影をつける ---- */
  if (uLight > 1.5) {
    vec3 Ldir = normalize(vec3(0.62, 0.62, 0.48));
    float diff = clamp(dot(n, Ldir), 0.0, 1.0);
    float lightAmt = 0.45 + 0.55 * diff;
    vec3 shadowCol = col * vec3(0.55, 0.60, 0.85); /* 影はグレーでなく青みに沈める */
    col = mix(shadowCol, col, lightAmt);
    col += vec3(0.95, 0.96, 1.0) * pow(diff, 8.0) * 0.25;
  }

  gl_FragColor = vec4(col * alpha, alpha);
}`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }
  const v = compile(gl.VERTEX_SHADER, vs);
  if (!v) { sphereFallback(); return; }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const _spSP = !!(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);   /* 【2026-09-21】isMobile確定前でも判定できるよう matchMedia で直接。惑星は初期化時に一度サイズ決定→echo-canがそれを基準に作られるため timing 非依存にする */
  const dpr = Math.min(_spSP ? 1.5 : 2, window.devicePixelRatio || 1);   /* 【2026-09-21 ヒデさん依頼・SP軽量化】惑星canvasの解像度を2→1.5に。残像(echo-can)も惑星幅×2なので連鎖で軽く(1040→780=約44%省) */
  sphereCanvas.width = 260 * dpr;
  sphereCanvas.height = 260 * dpr;
  gl.viewport(0, 0, sphereCanvas.width, sphereCanvas.height);

  const progs = {};
  for (const [key, ds] of Object.entries(DESIGNS)) {
    /* fragment があるデザインは完全カスタムシェーダー (テクスチャ不使用) */
    const fsSrc = ds.fragment || fsTemplate(ds.grainScale, ds.finish, ds.helpers);
    const f = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!f) { sphereFallback(); return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, v);
    gl.attachShader(prog, f);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), sphereCanvas.width, sphereCanvas.height);
    progs[key] = {
      prog,
      needsTex: !ds.fragment,
      uAngle: gl.getUniformLocation(prog, 'uAngle'),
      uAngle2: gl.getUniformLocation(prog, 'uAngle2'),
      uNoise: gl.getUniformLocation(prog, 'uNoise'),
      uTime: gl.getUniformLocation(prog, 'uTime'),
      uDither: gl.getUniformLocation(prog, 'uDither'),
      uLight: gl.getUniformLocation(prog, 'uLight'),
    };
    if (!ds.fragment) {
      gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);
      /* 【2026-08-30 ヒデさん指定・軽量化】カンプ画像はここでは読まない(遅延ロード)。
         ⚠️ 以前は全デザイン(B/C/D)の画像を起動時に全部ロードしていて、表示に使わない
         2.6MB を毎回ダウンロードしていた。いまは「選ばれているデザインだけ」読む
         (下の loadSphereTex。パネルで切り替えたらその時に読む)。 */
      progs[key].src = ds.src;
    }
  }
  sphereGL = { gl, progs };
  loadSphereTex(params.design);   /* 現在のデザインの画像だけ先に読む */
}
/* テクスチャのオンデマンド読み込み。多重ロード防止に loading フラグを持つ */
function loadSphereTex(key) {
  if (!sphereGL) return;
  const pr = sphereGL.progs[key];
  if (!pr || !pr.needsTex || pr.tex || pr.loading || !pr.src) return;
  pr.loading = true;
  const gl = sphereGL.gl;
  const tex = gl.createTexture();
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    pr.tex = tex;
    pr.loading = false;
    renderSphere();
  };
  img.src = pr.src;
}

/* WebGLが使えない環境: カンプ画像をそのまま表示 */
function sphereFallback() {
  sphereGL = null;
  sphereCanvas.classList.add('fallback');
  const ds = DESIGNS[params.design] || DESIGNS[Object.keys(DESIGNS)[0]];
  sphereCanvas.style.backgroundImage = `url('${ds.src}')`;
}

/* 球体の回転角 (主回転, 2軸目) */
function sphereAngles() {
  const sp = params.sphere;
  let t = elapsed;   /* 【2026-09-09】惑星の自転は PC と同じ(スマホで止めていたのを戻す。揺れ(sway)だけ止める) */
  /* ランダム: 周期の違う3つの波を重ねて、繰り返しに聞こえない不規則さを作る
     (乱数を毎フレーム引くとガタガタになるので、なめらかな擬似ランダムにしている) */
  if (sp.random > 0) {
    t += sp.random * sp.duration / (2 * Math.PI) *
         (Math.sin(elapsed * 0.31) * 0.6 + Math.sin(elapsed * 0.73 + 1.7) * 0.3 + Math.sin(elapsed * 1.27 + 3.1) * 0.1);
  }
  const a = 2 * Math.PI * t / sp.duration * (sp.dir || 1);
  return [a + sp.tilt * Math.PI / 180, a * sp.tumble];
}

function renderSphere() {
  if (!sphereGL) {
    if (sphereCanvas.classList.contains('fallback')) {
      const ds = DESIGNS[params.design] || DESIGNS[Object.keys(DESIGNS)[0]];
      sphereCanvas.style.backgroundImage = `url('${ds.src}')`;
    }
    return;
  }
  const { gl, progs } = sphereGL;
  const pr = progs[params.design] || progs[Object.keys(progs)[0]];
  if (!pr) return;
  if (pr.needsTex && !pr.tex) { loadSphereTex(params.design); return; }   /* 遅延: 選ばれた時に画像を読む(読み終わるまで描かない) */
  const [ang, ang2] = sphereAngles();
  gl.useProgram(pr.prog);
  if (pr.tex) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pr.tex);
  }
  gl.uniform1f(pr.uAngle, ang);
  gl.uniform1f(pr.uAngle2, ang2);
  gl.uniform1f(pr.uNoise, params.sphere.noise);
  if (pr.uTime) gl.uniform1f(pr.uTime, elapsed);
  if (pr.uDither) gl.uniform1f(pr.uDither, params.dither || 1);
  if (pr.uLight) gl.uniform1f(pr.uLight, 1);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
initSphere();

/* ロゴカルーセルへパラメーターを反映 */
const marqueeTrack = document.getElementById('marqueeTrack');
/* 【2026-08-27 ヒデさん指定】導入事例のホバー案を反映する。
   案の実体は CSS 側([data-hover=...])。ここでは属性を書き替えるだけ */
/* 【2026-09-15 ヒデさん指定】導入事例の見せ方(罫線あり/なし)とホバーの案 */
const CASE_LAYOUTS = [
  { key: '0', name: '現行（罫線あり）', fixed: true, tip: 'カンプどおり。画面いっぱいの罫線で4つに区切る。' },
  { key: '1', name: '罫線なし', tip: '罫線を全部消して、カードだけを2×2で並べる。ホバー「カードの周りに線が引かれる」と相性がよい。' },
];
const CASE_HOVERS = [
  { key: 'trim',      name: '現行（サムネイルに枠が引かれる）', fixed: true, tip: '写真の4辺が四隅から同時に伸びて枠を閉じる。写真は少しだけ寄る。' },
  { key: 'cardtrim',  name: 'カードの周りに線が引かれる', tip: '写真ではなく【カードの外周】を、4辺同時のトリミングで閉じる。サムネイルの枠は出ません。罫線なしの案と相性がよい。' },
  /* 線を引かない5案: 影の付け方と面のグレー／色みだけで見せる */
  { key: 'ct-lift',   name: '影でふわっと浮く', tip: '線は引かず、大きく遠い影で6px 持ち上がる。いちばん「浮く」。' },
  { key: 'ct-tight',  name: '影が近くに締まる', tip: '小さく近い影で2px だけ持ち上がる。カチッとした手触り。' },
  { key: 'ct-panel',  name: '面が白く浮く（＋やわらかい影）', tip: '面が白くなり、やわらかい影で紙のように地から離れる。' },
];
function caseLayoutKey() { const v = String((params.patterns && params.patterns.caseLayout) || '0'); return (CASE_LAYOUTS.some(c => c.key === v) && !variantRemovedKey('caseLayout', v)) ? v : '0'; }
function caseHoverKey() { const v = String((params.patterns && params.patterns.caseHover) || 'trim'); return (CASE_HOVERS.some(c => c.key === v) && !variantRemovedKey('caseHover', v)) ? v : 'trim'; }
function applyCaseLayout() {
  const sec = document.getElementById('cases'); if (!sec) return;
  const k = caseLayoutKey();
  CASE_LAYOUTS.forEach(c => sec.classList.toggle('cl-' + c.key, c.key === k));
}
function applyCaseHover() {
  const g = caseEls && caseEls.grid;
  if (!g) return;
  g.dataset.hover = caseHoverKey();
  /* 【2026-09-15】カードの外周の線(4辺)を、まだ無ければ各カードに入れる */
  (caseEls.cards || []).forEach(c => {
    if (!c) return;
    ['t', 'r', 'b', 'l'].forEach(side => {
      if (!c.querySelector('.cg-ce-' + side)) { const i = document.createElement('i'); i.className = 'cg-cedge cg-ce-' + side; c.appendChild(i); }
    });
  });
  /* C案「下線が伸びる」で使う線を、まだ無ければ各カードに1本ずつ入れる */
  (caseEls.cards || []).forEach(c => {
    if (c && !c.querySelector('.cg-uline')) {
      const i = document.createElement('i');
      i.className = 'cg-uline';
      c.appendChild(i);
    }
    /* F案「パスのトリミング」で使う4辺の線を、まだ無ければサムネイルに入れる(実体要素) */
    const img = c && c.querySelector('.cg-img');
    if (img && !img.querySelector('.cg-edge')) {
      ['t', 'r', 'b', 'l'].forEach(side => {
        const e = document.createElement('span');
        e.className = 'cg-edge cg-e-' + side;
        img.appendChild(e);
      });
    }
  });
}
function applyMarquee() {
  if (!marqueeTrack) return;   /* 2026-08-31: ロゴは支給iframeに差し替え済み(自前マーキー廃止)。要素が無ければ何もしない */
  /* 【2026-09-09】モバイルは 1セット幅≒720px を 8s ≒ 90px/s で流す(CSSアニメ・滑らか)。
     JS駆動時代に書いた inline transform が残っていると CSS アニメの transform を上書きするので消す。 */
  if (isMobile) marqueeTrack.style.transform = '';
  marqueeTrack.style.animationDuration = (isMobile ? 20 : params.marquee.duration) + 's';   /* 【2026-09-20 ヒデさん依頼】SP のロゴティッカーをさらに減速(14→20s・720px/20s≒36px/s) */   /* モバイル 11→14s にさらに減速(720px/14s≒51px/s・ヒデさん指定「やや速い」2026-09-09) */
  marqueeTrack.style.animationDirection = params.marquee.direction === 1 ? 'normal' : 'reverse';
  /* 【2026-09-09】静的モバイルでは KV 以下の演出を止めているが、ロゴティッカーだけは常に流す。
     params.running は調整パネル/古いlocalStorage由来で false のことがあり、それに引きずられて
     実機で「ティッカーが止まる」事故が出たため、モバイルは running 状態に依存させず必ず走らせる。 */
  marqueeTrack.style.animationPlayState = (isMobile || params.running) ? 'running' : 'paused';
  document.documentElement.style.setProperty('--logo-gap', params.marquee.gap + 'px');
}

/* ===== 慣性スクロール =====
   ホイールを回した分をそのまま反映せず、毎フレーム少しずつ追いつかせる。
   参考36サイト中21サイトが採用していた「なめらかさ」の土台。
   ・スマホ(タッチ)は端末標準の慣性の方が自然なので掛けない
   ・OS側で「視差効果を減らす」にしている人には掛けない
   ・native の scroll を動かす方式なので position:sticky はそのまま生きる */
let lenis = null;
if (window.Lenis && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  lenis = new window.Lenis({
    /* 【2026-08-29 ヒデさん指定】以前は duration:1.1 固定で、調整パネルの「慣性の強さ」を
       0付近にしても実スクロールの慣性が全く弱まらなかった。lerp 方式に変え、下の raf で
       毎フレーム params.sections.common.smooth から lerp を出して実スクロールの慣性へ反映する。
       lerp 大=すぐ止まる(慣性弱) / lerp 小=長く流れる(慣性強)。 */
    lerp: 0.1,
    smoothWheel: true,
    syncTouch: false,                               // スマホは端末標準に任せる
    /* ⚠️ 調整パネルの中でホイールを回した時にページが動かないようにする。
       これが無いと Lenis が wheel を全部さらってしまい、パネル内スクロールが効かない */
    prevent: node => !!(node && node.closest && node.closest('.tools')),
  });
}

/* ⚠️ 描画中に例外が1回でも出ると、以前は requestAnimationFrame の再予約に
   到達できず【全アニメーションが永久に止まった】。画面が途中で固まる症状の原因。
   次フレームの予約は try の外に置き、何があっても回り続けるようにする。 */
let frameErrLogged = false;
/* ===== 実績「2つの価値」の右側ピクトグラム (2026-08-28 ヒデさん指定) =====
   仮置きの SVG 画像をやめ、【塗りなし・枠線だけの単純な幾何学】で動くピクトグラムにする。
   使う形: 円 / 正方形・長方形 / 三角 / 線 のみ。図形の数はどの案も 4〜9個に揃えてある(密度を合わせる)。
   for SaaS = リアルタイムにデータ同期 / for AI = コンテキスト取得から実行(一方向の流れ)
   案は調整パネル(実績 > ピクトグラム)で選ぶ。 */
const VAL_VB = 220;                    /* 描画の座標系。表示は 220×220 */
const VAL_INK = '#111';
const VAL_ACC = '#0EBBFF';
const VAL_PINK = '#FF5D97';
/* 【2026-09-26 ヒデさん依頼】for AI「A20 レーダー」の先端の丸の色(左の棒から順)。ブランド3色＝Anyflow マークの水色・青・ピンク
   (開発者体験モックのサイドバーの丸ポチと同じ3色)。隣どうしが同じ色にならない並び。⚠️仮置き: 並びは好みで入れ替え可 */
const VAL_A20_COLS = ['#0EBBFF', '#2E6FD8', '#FF5D97', '#0EBBFF', '#2E6FD8'];
/* 【2026-08-30 ヒデさん指定】黒せり上がりの白反転を、ピクトグラムの「黒い図形」にも効かせる(色付きACC/PINKは維持)。
   updateResults が毎フレーム valInkCur をセット(反転中=白寄り / 通常=VAL_INK)。valTake/valStyle が #111 を検知して差し替える。 */
let valInkCur = VAL_INK;
let valStrokeMul = 1;   /* 【2026-09-02 ヒデさん指定】実績ピクトグラムの線幅の倍率(パネル調整)。全ての線幅×この値 */
const valSvgs = {};                    /* { saas:{svg, pool}, ai:{...} } */
function valEnsure(key, id) {
  if (valSvgs[key]) return valSvgs[key];
  const host = document.getElementById(id);
  if (!host) return null;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VAL_VB} ${VAL_VB}`);
  host.innerHTML = '';
  host.appendChild(svg);
  valSvgs[key] = { svg, pool: [], used: 0 };
  return valSvgs[key];
}
/* 形を1つ借りる。使い回すので、毎フレーム作り直さない */
function valTake(st, tag) {
  let el = st.pool[st.used];
  if (!el || el.tagName !== tag) {
    if (el) el.remove();
    el = document.createElementNS(SVG_NS, tag);
    st.svg.appendChild(el);
    st.pool[st.used] = el;
  }
  st.used++;
  el.setAttribute('opacity', '1');
  el.setAttribute('stroke', valInkCur);
  el.setAttribute('stroke-width', (1 * valStrokeMul).toFixed(2));   /* 2026-08-30: 基準1px ×倍率(パネル・2026-09-02) */
  el.removeAttribute('transform');
  return el;
}
function valDone(st) {
  for (let i = st.used; i < st.pool.length; i++) st.pool[i].setAttribute('opacity', '0');
  st.used = 0;
}
/* --- 便利関数(すべて枠線だけ) --- */
function vCircle(st, cx, cy, r, o) { const e = valTake(st, 'circle');
  e.setAttribute('cx', cx.toFixed(1)); e.setAttribute('cy', cy.toFixed(1)); e.setAttribute('r', Math.max(0.1, r).toFixed(1));
  e.__len = 2 * Math.PI * Math.max(0.1, r);
  if (o) valStyle(e, o); return e; }
function vRect(st, cx, cy, w, h, o) { const e = valTake(st, 'rect');
  e.setAttribute('x', (cx - w / 2).toFixed(1)); e.setAttribute('y', (cy - h / 2).toFixed(1));
  e.setAttribute('width', Math.max(0.1, w).toFixed(1)); e.setAttribute('height', Math.max(0.1, h).toFixed(1));
  e.setAttribute('rx', (o && o.rx != null ? o.rx : 0));
  e.__len = 2 * (Math.max(0.1, w) + Math.max(0.1, h));
  if (o) valStyle(e, o); return e; }
function vTri(st, cx, cy, r, rot, o) { const e = valTake(st, 'polygon');
  const p = [];
  for (let i = 0; i < 3; i++) { const a = (rot + i * 120 - 90) * Math.PI / 180;
    p.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1)); }
  e.setAttribute('points', p.join(' '));
  e.__len = 3 * (r * Math.sqrt(3));
  if (o) valStyle(e, o); return e; }
function vLine(st, x1, y1, x2, y2, o) { const e = valTake(st, 'line');
  e.setAttribute('x1', x1.toFixed(1)); e.setAttribute('y1', y1.toFixed(1));
  e.setAttribute('x2', x2.toFixed(1)); e.setAttribute('y2', y2.toFixed(1));
  e.__len = Math.hypot(x2 - x1, y2 - y1);
  if (o) valStyle(e, o); return e; }
/* 楕円。縦を潰すと「寝ている」＝奥行きが出る。2Dのままで立体に見せる要 */
function vEll(st, cx, cy, rx, ry, rot, o) { const e = valTake(st, 'ellipse');
  e.setAttribute('cx', cx.toFixed(1)); e.setAttribute('cy', cy.toFixed(1));
  e.setAttribute('rx', Math.max(0.1, rx).toFixed(1)); e.setAttribute('ry', Math.max(0.1, ry).toFixed(1));
  if (rot) e.setAttribute('transform', `rotate(${rot.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})`);
  /* 楕円の周長(ラマヌジャンの近似)。トリミングに使う */
  const a = Math.max(0.1, rx), b = Math.max(0.1, ry), h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
  e.__len = Math.PI * (a + b) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
  if (o) valStyle(e, o); return e; }
/* 楕円の上の点(deg)。傾きも効かせる。奥(上半分)か手前(下半分)かも返す */
function vOn(cx, cy, rx, ry, deg, rot) {
  const t = deg * Math.PI / 180, r = (rot || 0) * Math.PI / 180;
  const lx = rx * Math.cos(t), ly = ry * Math.sin(t);
  return { x: cx + lx * Math.cos(r) - ly * Math.sin(r),
           y: cy + lx * Math.sin(r) + ly * Math.cos(r),
           front: Math.sin(t) > 0, depth: (Math.sin(t) + 1) / 2 };
}
/* 折れ線。ストーリーの「道筋」を描くのに使う */
function vPath(st, pts, o) { const e = valTake(st, 'path');
  e.setAttribute('d', 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L'));
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]);
  e.__len = L; if (o) valStyle(e, o); return e; }
/* 【2026-08-28 ヒデさん指定】パスのトリミング。
   線を「今どこまで描かれたか」で見せると、時間の経過やストーリーが表せる。
   k=0 で何も描かれていない / k=1 で全部描かれた。from を渡すと途中から。 */
/* ピクトの表示倍率(座標系 220 → 画面px)。svg の箱の大きさ(CSS の transform をかける前)で測り、1フレームに1回だけ計算する。
   線の太さ・点線の長さは non-scaling-stroke で画面px なので、座標の長さと比べる時はこれで割り掛けする(理由は vTrim の注記) */
function vSvgScale(svg) {
  if (!svg) return 1;
  if (svg.__scF !== frameSeq) { const w = svg.clientWidth, h = svg.clientHeight; svg.__sc = (w > 0 && h > 0) ? (Math.min(w, h) / VAL_VB) : 1; svg.__scF = frameSeq; }
  return svg.__sc || 1;
}
function vTrim(e, k, from) {
  const L0 = e.__len || 0;
  if (!L0) return e;
  /* 【2026-09-15 ヒデさん指摘「For AI のパスが途中で途切れる」の根治】線は vector-effect:non-scaling-stroke なので dasharray は画面px。
     ピクトが 220px より大きく表示される案(300/325/340/420px など)では、座標系(220)の長さのままだと表示の途中で切れていた
     → その svg の表示倍率を毎フレーム1回だけ測って掛ける。
     【2026-09-26 ヒデさん指摘「線が途中で止まる」の真因・修正】倍率は「svg の箱の大きさ(CSS の transform をかける前)」で測る。
     non-scaling-stroke の点線の長さは、親の transform(実績の固定ステージの縮小 --sp・ピクトの拡大)を【含まない】単位で数えられる。
     以前は getBoundingClientRect(transform 込み)で測っていたため、画面の高さが足りずステージを縮めている時(ノートPCで --sp≈0.83〜0.9)に
     点線の1本目が縮小率ぶん短くなり、線が 83〜90% の所で止まっていた(1440×921 以上では --sp=1 なので出なかった)。
     箱が正方形でない時は viewBox が小さい方の辺に合わせて収まる(meet)ので、幅と高さの小さい方を使う。 */
  const L = L0 * vSvgScale(e.ownerSVGElement);
  const a = Math.max(0, Math.min(1, from || 0)), b = Math.max(a, Math.min(1, k));
  const on = L * (b - a);
  e.setAttribute('stroke-dasharray', on.toFixed(2) + ' ' + L.toFixed(2));
  e.setAttribute('stroke-dashoffset', (-L * a).toFixed(2));
  /* 【2026-09-26】長さ0(描き始めの瞬間)は隠す。線の端が丸(round)なので、長さ0の点線でも線の始点と終点に小さな点が出ていた
     (S9 の周の頭で左右の合わせ目にピンクの点が出ていた)。このフレームだけの指定で、次のフレームは valTake が濃さを戻す */
  if (on < 0.01) e.setAttribute('opacity', '0');
  return e;
}
function valStyle(e, o) {
  if (o.c) e.setAttribute('stroke', o.c === VAL_INK ? valInkCur : o.c);
  if (o.w != null) e.setAttribute('stroke-width', (o.w * valStrokeMul).toFixed(2));
  if (o.a != null) e.setAttribute('opacity', Math.max(0, Math.min(1, o.a)).toFixed(3));
  if (o.dash) e.setAttribute('stroke-dasharray', o.dash); else e.removeAttribute('stroke-dasharray');
  e.removeAttribute('stroke-dashoffset');
  if (o.rot != null) e.setAttribute('transform', `rotate(${o.rot.toFixed(1)} ${o.rx0 || 110} ${o.ry0 || 110})`);
}
const vE = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   /* なめらかな出入り */
/* 【2026-09-08 ヒデさん指定・強化】緩急をさらに強く。両端が“ぐっと”遅く、中央で一気に速い
   シグモイド型(指数3.4)。「最初ゆっくり→ぐっと速く→また遅く」。for AI の矢印の線の伸びに使う。 */
const vEIO = u => { u = u < 0 ? 0 : u > 1 ? 1 : u; const a = Math.pow(u, 3.4); return a / (a + Math.pow(1 - u, 3.4)); };
/* 【2026-08-28 ヒデさん指定】全体的にゆったりすぎたので、緩急の強い動きを足す。
   vE2 = 一気に動いて、終わりでぴたっと止まる(見せ場に使う)
   vE3 = 少し行き過ぎて戻る(重なる・刺さる瞬間の気持ちよさ)
   vHold = 前半は止まって待ち、後半で一気に動く(ためを作る) */
const vE2 = k => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3.4);
const vE3 = k => { const c = 1.7; const x = Math.max(0, Math.min(1, k));
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const vHold = (k, wait) => { const w = wait == null ? 0.4 : wait;
  return k <= w ? 0 : vE2((k - w) / (1 - w)); };
/* 矢印(実行を表すのに使う)。dir は度(0=右) */
function vArrow(st, x, y, len, dir, o) {
  const a = (dir || 0) * Math.PI / 180;
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  const h = Math.max(5, len * 0.30);
  const p = [[x, y], [ex, ey]];
  vTrim(vPath(st, p, o), 1);
  const b1 = a + Math.PI * 0.82, b2 = a - Math.PI * 0.82;
  vPath(st, [[ex + Math.cos(b1) * h, ey + Math.sin(b1) * h], [ex, ey],
             [ex + Math.cos(b2) * h, ey + Math.sin(b2) * h]], o);
  return { x: ex, y: ey };
}
const vLoop = (t, T) => (t % T) / T;                                     /* 0→1 のくり返し */

/* ===================== for SaaS: リアルタイムにデータ同期 ===================== */
const VAL_SAAS = {
  /* S1 【2026-08-30 ヒデさん指定・新規】点線が左→右へ伸びてから、青→ピンクの粒が後追いで流れる。
     最初は点線は出ておらず、伸びきってから粒が追いかける。すべて1pxの枠線。 */
  /* S2 双方向のやり取り: 2つの箱の間を小さな正方形が行き来し、届くと受け手の枠が太くなる */
  S2(st, t) {
    const C = VAL_VB / 2, L = 46, R = 174;
    const k = vLoop(t, 2.6), fwd = k < 0.5;
    const u = vE(fwd ? k / 0.5 : (k - 0.5) / 0.5);
    const x = fwd ? L + (R - L) * u : R - (R - L) * u;
    const hitL = !fwd && u > 0.86, hitR = fwd && u > 0.86;
    vRect(st, L, C, 46, 60, { rx: 4, w: 1, c: hitL ? VAL_ACC : VAL_INK });
    vRect(st, R, C, 46, 60, { rx: 4, w: 1, c: hitR ? VAL_ACC : VAL_INK });
    for (let i = 0; i < 3; i++) vLine(st, L - 14, C - 16 + i * 16, L + 14, C - 16 + i * 16, { a: 0.3 });
    for (let i = 0; i < 3; i++) vLine(st, R - 14, C - 16 + i * 16, R + 14, C - 16 + i * 16, { a: 0.3 });
    vRect(st, x, C, 13, 13, { c: fwd ? VAL_ACC : VAL_PINK, w: 1, rot: u * 180, rx0: x, ry0: C });
  },
  /* S4 一斉にそろう: 3×3 の升目がバラバラに光り、最後に全部が同じ状態へ揃う */
  /* S5 すれ違う2本の流れ: 上下の線を、円と正方形が逆向きに流れる。交差で一瞬ふくらむ */
  /* ===== ここから 2026-08-28 追加分 =====
     ヒデさん指定の方向: 複数が1つになる / 重なり合う / 時系列が分かる / 緩急がある。
     S6〜S10 はパスのトリミング(線が描かれていく)を使い、時間の経過とストーリーを出す。 */

  /* S6 描かれてつながる: 左から右へ線が引かれ、届いた瞬間に受け手の枠が一周描かれる */
  /* S7 4つが1つに: 四隅の四角が中央へ集まり、重なって1つになる。合流の瞬間に外周が一周描かれる */
  S7(st, t) {
    const C = VAL_VB / 2, T = 4.2, k = vLoop(t, T);
    const come = Math.min(1, k / 0.5), hold = Math.max(0, (k - 0.52) / 0.24), back = Math.max(0, (k - 0.82) / 0.18);
    const d = 62 * (1 - vE(come)) + 62 * vE(back);
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 + 45) * Math.PI / 180;
      vRect(st, C + Math.cos(a) * d, C + Math.sin(a) * d, 30, 30,
        { rx: 3, w: 1, c: i % 2 ? VAL_ACC : VAL_PINK, a: 0.9 });
    }
    vTrim(vCircle(st, C, C, 52, { w: 1, c: VAL_ACC, a: hold > 0 ? 1 - back : 0 }), vE(hold));
  },
  /* S8 満ちて同期: 外周が0→100%まで描かれ(進捗)、満ちた瞬間に内側の四角がパッと出る */
  /* S9 2つの弧が噛み合う: 左右から弧が伸びて1つの円になる。噛み合った瞬間だけ太くなる */
  S9(st, t) {
    const C = VAL_VB / 2, T = 3.6, k = vLoop(t, T);
    const grow = Math.min(1, k / 0.55), lock = Math.max(0, (k - 0.55) / 0.2), off = Math.max(0, (k - 0.85) / 0.15);
    const R = 56;
    /* 円周上の a0°→a1° の折れ線(弧)。a1<a0 なら逆回り */
    const arcPts = (a0, a1, seg) => { const pts = [];
      for (let i = 0; i <= seg; i++) { const a = (a0 + (a1 - a0) * (i / seg)) * Math.PI / 180;
        pts.push([C + Math.cos(a) * R, C + Math.sin(a) * R]); }
      return pts; };
    const arc = (a0, a1, kk, col) => {
      vTrim(vPath(st, arcPts(a0, a1, 26), { c: col, w: 1, a: 1 - off }), vE(kk));
    };
    /* 【2026-09-26 ヒデさん依頼】下地の点線の円は、青/ピンクの弧が伸びた所から消えていく(弧の伸びに合わせたトリミング)。
       以前は点線の円がずっと全周出ていた。点線の粒が動いて見えないよう、弧の終点側から逆向きに描いて「まだ弧が来ていない所」だけ残す
       (模様の起点が終点側に固定される)。弧が消える所(off)では点線の円が全周で薄く戻り、次の周の頭と濃さ・模様がつながる */
    const eG = off > 0 ? 0 : vE(grow);                       /* 点線が弧に食われた割合 */
    const gA = off > 0 ? 0.14 * off : 0.14;                  /* 点線の濃さ(戻る時だけ 0→0.14) */
    const guide = (a0, a1) => { if (eG >= 1 || gA <= 0) return;
      const aCut = a0 + (a1 - a0) * eG;                      /* 弧の先端の角度 */
      vPath(st, arcPts(a1, aCut, Math.max(2, Math.ceil(26 * (1 - eG)))), { a: gA, dash: '4 6' }); };
    guide(180, 360);
    guide(0, 180);
    arc(180, 360, grow, VAL_ACC);
    arc(0, 180, grow, VAL_PINK);
    /* 常設の印(左右の合わせ目)。どの場面でも密度が落ちないように。
       【2026-09-26 ヒデさん依頼】内側の端を円周にぴったり(弧の線の外側のふちに、印の丸い端が接する位置)。以前は円の中へ 2 入り込んではみ出して見えた。
       線の太さは画面px(non-scaling)なので、弧の線の半分＋印の丸い端の半分(=1px×線の太さの倍率)を表示倍率で割って座標に直す */
    const gap = valStrokeMul / vSvgScale(st.svg);
    vLine(st, C - R - 12, C, C - R - gap, C, { a: 0.25 });
    vLine(st, C + R + gap, C, C + R + 12, C, { a: 0.25 });
    if (lock > 0) vCircle(st, C, C, 12 + vE(Math.min(1, lock * 2)) * 6, { c: VAL_ACC, w: 1, a: 1 - lock });
  },
  /* S10 積層して重なる: 3つの円がずれて重なっていき、完全に重なると1つに見える */
  /* ===== ここから 2026-08-28 追加分(躍動感・回転・奥行き) =====
     2Dのフラットなまま立体に見せる手: 楕円を寝かせる / 手前を大きく奥を小さく /
     回転しながら大小を変える / 前後の重なりを入れ替える。 */

  /* S11 二軸のジャイロ: 直交する2つの輪が転がる。交点に印。いちばん躍動感がある */
  /* S12 立方体が回る: 前後2枚の正方形を線で結んだ枠。横幅の伸び縮みで回転して見せる */
  /* S13 手前と奥をめぐる: 寝かせた輪の上を四角が周回。手前で大きく前面、奥で小さく背面 */
  /* S14 盤が立ち上がる: 寝かせた盤が周期的に立ち上がり、上に乗った3つが一緒に回る */
  /* S15 逆回転して噛み合う: 2つの正方形が逆に回りながら近づき、45°ずれて重なる */
  /* ===== 2026-08-28 追加: 開く → グリンと回る → 重なる =====
     ヒデさん指定「一旦上下に開いた後に右回転でグリンとスピンして、また重なる」。
     緩急を効かせるため、開く/回る/戻る をはっきり分けて、間に“ため”を入れている。 */

  /* S16 開いて回って重なる: 3枚が上下に開き、右へグリンと回って、また1つに重なる */
  /* S17 花のように開いて閉じる: 4枚が放射状に開き、全体が回ってから中央へ戻る */
  /* S18 カードを配って束ねる: 3枚が扇に開き、グリンと回って、パチンと束に戻る */
  S18(st, t) {
    const C = VAL_VB / 2, T = 3.6, k = vLoop(t, T);
    const fan = vE2(Math.max(0, Math.min(1, k / 0.2)));
    const spin = vHold(Math.max(0, Math.min(1, (k - 0.24) / 0.36)), 0.12) * 360;
    const back = vE3(Math.max(0, Math.min(1, (k - 0.68) / 0.24)));
    const sp = (1 - back) * fan;
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 34 * sp;
      const tilt = (i - 1) * 16 * sp + spin;
      vRect(st, C + off, C, 66, 88, { rx: 5, w: 1,
        c: [VAL_PINK, VAL_INK, VAL_ACC][i], rot: tilt, rx0: C + off, ry0: C });
    }
    vLine(st, C - 74, C + 56, C + 74, C + 56, { a: 0.25 });
    const lock = Math.max(0, (back - 0.88) / 0.12);
    if (lock > 0) vRect(st, C, C, 66 + lock * 12, 88 + lock * 12, { rx: 6, c: VAL_ACC, w: 1, a: 1 - lock });
  },
};

/* ===================== for AI: コンテキスト取得から実行 ===================== */
const VAL_AI = {
  /* A1 一方向のパイプライン: 円(取得)→正方形(処理)→三角(実行)。粒が左から右へ一方向に流れ、段ごとに形が変わる */
  /* A20 レーダー(2026-09-08 ヒデさん指定): 縦の棒が上下するだけのループ。
     長方形の収縮も水色の再生マークが右へずれる動きも無し。棒が波打つのを延々くり返す。 */
  A20(st, t) {
    const C = VAL_VB / 2;
    const N = 5, span = 132, x0 = C - span / 2, gap = span / (N - 1);
    const baseY = C + 48;                 /* 棒の下端(共通の底) */
    const minH = 22, maxH = 100;
    const R = 2.5;                        /* 先端の丸の半径 */
    /* 底の基準線(うっすら)。空っぽに見えないように常設 */
    vLine(st, x0 - 12, baseY, x0 + span + 12, baseY, { a: 0.25, w: 1 });
    for (let i = 0; i < N; i++) {
      const x = x0 + i * gap;
      /* 位相を1本ずつずらして波打たせる＝レーダー/イコライザ風の上下 */
      const s = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.8);
      const h = minH + (maxH - minH) * s;
      vLine(st, x, baseY, x, baseY - h, { w: 1, a: 0.9 });
      /* 【2026-09-26 ヒデさん依頼】先端の丸は棒の先に「乗せる」(中心を半径ぶん上へ＝ペンの上に丸がくっついている形)。
         以前は丸の中心が棒の先端にあり、棒が丸を串刺しにしていた。色はブランド3色を散らす(以前は全部水色) */
      vCircle(st, x, baseY - h - R, R, { c: VAL_A20_COLS[i % VAL_A20_COLS.length], w: 1, a: 0.9 });
    }
  },
  /* ===== 2026-09-08 ヒデさん指定・新規7案(コンテキスト取得→実行)。矢印の三角は
     「パスのトリミング」ではなく【線が伸びきる直前にフェードイン】で出す(＝延長線上に矢じりが現れる) ===== */
  /* 共通: 線の終点付近に三角矢じりをフェードインで置く。dir=度(0=右) */
  A21(st, t) {   /* 折れて進む・改(既定): 左下から折れ線→伸びきる直前に三角がフェードイン。
                   線の伸びは緩急強め(vEIO)=最初ゆっくり→速く→また遅く(2026-09-08 ヒデさん指定) */
    const C = VAL_VB / 2, T = 4.4, k = vLoop(t, T);
    const draw = vEIO(Math.min(1, k / 0.72));   /* 進み具合そのものに緩急を掛ける */
    const P = [[36, C + 46], [78, C + 46], [78, C], [130, C], [130, C - 44], [172, C - 44]];
    vPath(st, P, { a: 0.14, dash: '4 6' });
    vTrim(vPath(st, P, { c: VAL_ACC, w: 1 }), draw);
    for (let i = 1; i < P.length - 1; i++) {
      const at = i / (P.length - 1);
      vRect(st, P[i][0], P[i][1], 8, 8, { w: 1, a: draw > at ? 0.9 : 0.18 });
    }
    const tri = vE(clamp01((draw - 0.78) / 0.22));   /* 伸びきる直前にフェードイン */
    vTri(st, 186, C - 44, 20, 90, { c: VAL_ACC, w: 1, a: 0.14 + 0.86 * tri });
  },
  /* A2 形が変わる: 円 → 正方形 → 三角 と姿を変え、三角になった瞬間に外へ線が飛ぶ＝実行 */
  /* A3 集めて撃つ: 散らばった小さな正方形が中央の円へ集まり、満ちたら右へ三角が飛ぶ */
  /* A5 積んで実行 (2026-08-28 ヒデさん指定で作り直し):
     ・フェードインをやめ、【下から入ってくる】動きにした
     ・あとから入ってきた板が、先にあった板を【下から押し上げる】
     ・三角は出さない。積み上がる動きだけで「溜まっていく」を見せる
     ・緩急: 入るのは一気に(vE2)、押し上げは少し行き過ぎて戻る(vE3) */
  /* ===== ここから 2026-08-28 追加分 =====
     A6〜A10 はパスのトリミングで「道筋が描かれていく」＝時間の経過とストーリーを出す。
     どれも 取得 → 処理 → 実行 の順番が読み取れるようにしてある。 */

  /* A6 経路が描かれて実行: 円から三角へ折れ線が引かれ、描き切った瞬間に三角が一周描かれて発火 */
  /* A7 3ステップ: 取得→解釈→実行の枠が順に描かれて満ちる。最後に三角。時系列そのもの */
  /* A8 満ちて発射 (2026-08-28 ヒデさん指定): 発射は三角ではなく【矢印】に。
     円弧が満ちるまでが「取得」。満ちた瞬間に矢印が右へ飛ぶ＝いちばん緩急が強い */
  /* A9 重なって答えになる: 3つの円(文脈の断片)が中央で重なり、重なりから四角→三角へ変わって抜ける */
  /* A10 一本の線が折れて進む: 線が描かれながら3回折れ、先端が三角になって抜ける */
  /* ===== ここから 2026-08-28 追加分(躍動感・回転・奥行き) ===== */

  /* A11 回り込んで発射: 寝かせた軌道を粒が回り、1周したら中央から三角が飛ぶ。奥は小さく手前は大きく */
  /* A12 球を走査する: 寝かせた輪を何本も重ねて球の骨組みに。走査線が上から下へ、終わると三角 */
  /* A13 カードがめくれる: 長方形が横幅の伸び縮みで3回めくれる。
     【2026-08-30 ヒデさん指定】最後の三角は削除・角丸もすべて無し。 */
  A13(st, t) {
    /* 【2026-08-31 ヒデさん指定】for SaaS(S9: 円R56=上端54〜下端166)とサイズ感・高さを揃える。
       カードを116×86に拡大し、カード上端54・バー下端166.5に配置(全体の占有と中心をS9と一致)。 */
    const C = VAL_VB / 2, T = 4.8, k = vLoop(t, T), W = 116, H = 86, CY = 97, BARY = 163;
    const step = Math.min(2, Math.floor(k / 0.3));
    const u = Math.min(1, (k - step * 0.3) / 0.3);
    const w = W * Math.abs(Math.cos(u * Math.PI));       /* 0 を通る＝真横を向く */
    vRect(st, C, CY, W, H, { rx: 0, a: 0.14, dash: '4 6' });
    vRect(st, C, CY, Math.max(2, w), H, { rx: 0, w: 1, c: [VAL_INK, VAL_ACC, VAL_PINK][step] });
    for (let i = 0; i < 3; i++)
      vRect(st, C - 42 + i * 42, BARY, 28, 7, { rx: 0, w: 1, a: i <= step ? 0.9 : 0.2 });
  },
  /* A14 螺旋で落ちて撃つ: 粒が寝かせた軌道を回りながら中心へ。着いた瞬間に三角が上へ抜ける */
  /* A15 板が立ち上がる: 寝ていた3枚が順に立ち上がり、揃うと三角に変わって抜ける */
  /* ===== 2026-08-28 追加: 矢印で「実行」を表す3案 =====
     ヒデさん指定。三角だけでなく、ふつうの矢印も使ってよいとのこと。 */

  /* A16 伸びて刺さる: 左から矢印が伸びていき、右の枠に刺さると枠が一瞬太くなる */
  /* A17 三方向へ配信: 中央の四角から矢印が3本、同時に外へ飛ぶ */
  /* A18 向きを決めて飛ぶ: 矢印が中心でぐるっと回り、止まった向きへシュッと飛ぶ */
  /* A19 ひし形を貫く (2026-08-28 ヒデさん指定・Figma 15888:25154 のピクトグラムをもとに)
     ひし形が左から順に現れて右へ4つまで増え、そこを矢印が左から右へ貫く。
     カンプの比率を実測して合わせた(900×520の描画で計測):
       全体の幅 400 に対して ひし形の並びが 45% / 高さが 66% / 矢印は右から24%
       → こちらの 220 の座標系では 全体180(x15〜195) / ひし形の並び81 /
         半幅16.5・半高59 / 中心 x=86,104.6,123.2,141.8 / 中心 y=110
     緩急: ひし形は一気に(vE2)、矢印は ためてから一気に(vHold) */
};
function drawValueIcons() {
  const p = params.patterns || {};
  const _rs = params.sections && params.sections.results;
  /* 【2026-09-02】ピクト線幅の倍率。【2026-09-21 Y10】スマホは既定を細く(0.6px)。
     SP専用の上書き(params.mb['sections.results.pictoW'])があればそれを優先＝パネルのSP調整は効いたまま。PCは従来通り(pictoW/1)。 */
  {
    const _isMbSw = (typeof isMobile !== 'undefined' && isMobile) || (typeof _vfPhoneOn === 'function' && _vfPhoneOn());
    const _mbPw = params.mb && params.mb['sections.results.pictoW'];
    valStrokeMul = _isMbSw ? ((_mbPw != null) ? _mbPw : 0.6) : ((_rs && _rs.pictoW != null) ? _rs.pictoW : 1);
  }
  /* 【2026-09-08 ヒデさん指定】ピクトの速度をSaaS/AI共通で調整(全バリエーションに適用)。
     時間を一律で伸縮＝どの案も同じテンポ感になる。 */
  const _sp = (_rs && _rs.pictoSpeed != null) ? _rs.pictoSpeed : 1;
  const _et = elapsed * _sp;
  const a = valEnsure('saas', 'valSaas');
  if (a) { const f = VAL_SAAS[p.valSaas] || VAL_SAAS.S9;   /* 【2026-09-26 整理】完全削除した案(S1ほか)は表から外したので、保存値が消した案なら既定(S9)で描く */ try { f(a, rfxValT(valTOv.saas, _et)); } catch (e) {} valDone(a); }
  const b = valEnsure('ai', 'valAi');
  if (b) { const f = VAL_AI[p.valAi] || VAL_AI.A21;   /* 同上: 消した案(A1ほか)なら既定(A21) */ try { f(b, rfxValT(valTOv.ai, _et)); } catch (e) {} valDone(b); }
}

let _rafPaused = false;   /* 【2026-09-22】タブ非表示で描画ループを止めているか */
function frame(ts) {
  try {
    if (lenis) {
      /* 【2026-08-29】実スクロールの慣性を「慣性の強さ」スライダー(smooth)に連動。
         smooth 12(=つまみ左/弱)→lerp 0.5(すぐ止まる) / smooth 1(=つまみ右/強)→lerp 0.045(長く流れる)。 */
      const sm = Math.max(1, Math.min(12, params.sections.common.smooth || 3));
      lenis.options.lerp = 0.045 + (sm - 1) / 11 * (0.5 - 0.045);
      lenis.raf(ts);
    }
    if (lastTs !== null) {
      frameDt = Math.min(0.1, (ts - lastTs) / 1000);
      if (params.running) elapsed += frameDt;
    }
    lastTs = ts;
    renderFrame();
    drawValueIcons();
  } catch (e) {
    /* 【2026-09-01】診断用: 最後の例外を保持(A2ドット停止の調査。__anim.health() で読める) */
    window.__lastFrameErr = String((e && e.stack) || e);
    frameErrCount++;
    if (!frameErrLogged) { frameErrLogged = true; console.error('[anyflow] 描画中の例外:', e); }
  }
  frameCount++;
  /* 【2026-09-22 ヒデさん依頼】タブが見えていない時(別タブ/最小化/アプリ切替)は描画ループを止める＝
     放置中の連続レンダリング(canvas×3＋WebGL＋毎フレーム更新)による発熱・電力の無駄を断つ。
     復帰は visibilitychange で。時間(elapsed)は止めている間は進めず、戻った瞬間の dt 飛びは lastTs リセットで吸収。 */
  if (document.hidden) { _rafPaused = true; return; }
  requestAnimationFrame(frame);   /* ← try の外。絶対に止めない(表示中は) */
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', function () {
  if (!document.hidden && _rafPaused) { _rafPaused = false; lastTs = null; requestAnimationFrame(frame); }   /* 復帰: lastTs=null で時間の飛びを防いでから再開 */
});
renderFrame();

/* デバッグ用フック（rAFが動かない環境で手動で時間を進める） */
window.__anim = {
  /* 【2026-09-01】ドット停止の現場診断: 症状が出た直後にコンソールで await __anim.health() 。
     1秒間のフレーム数・時計の進み・例外の有無をまとめて返す(これをそのまま貼ってもらえば原因が分かる) */
  health() {
    const f0 = frameCount, e0 = elapsed, err0 = frameErrCount;
    return new Promise(res => setTimeout(() => res({
      framesPerSec: frameCount - f0,
      clockAdvanced: +(elapsed - e0).toFixed(3),
      running: params.running,
      converge: params.converge,
      net3d: params.conv && params.conv.net3d,
      netSpd: params.net3d && params.net3d.spd,
      netSpin: params.net3d && params.net3d.spin,
      errorsInLastSec: frameErrCount - err0,
      lastError: window.__lastFrameErr || null,
    }), 1000));
  },
  step(dt) { elapsed += dt; renderFrame(); drawValueIcons(); },
  setElapsed(v) { elapsed = v; renderFrame(); },
  _params() { return params; },   /* 検証用: 現在の params を返す(PC/SP独立の実測・青印の確認に使う) */
  mb() { return params.mb ? JSON.parse(JSON.stringify(params.mb)) : {}; },   /* 検証用: SP専用の上書き一覧(mbKey→値) */
  /* 各セクションの自動再生を頭からやり直す (通常はリプレイしないので検証用) */
  replay() { elapsed = 0; resetSectionClocks(); renderFrame(); },
  setSway(n) { params.sway = n; renderFrame(); },
  setDesign(k) { params.design = k; renderFrame(); },
  setDither(n) { params.dither = n; renderFrame(); },
  /* セクション進捗を固定して確認する: __anim.setProgress('dev', 0.5) / 解除は null */
  setProgress(key, v) { if (v == null) delete progOverride[key]; else progOverride[key] = v; renderFrame(); },
  setPattern(sec, key) { params.patterns[sec] = key; renderFrame(); },
  startResults() { resT0 = elapsed; resT = -1; renderFrame(); },
  getState() { return { elapsed, params }; },
  /* 実機で起きた「セクションが抜ける」瞬間の記録を取り出す */
  /* 現象が出た直後に打つと、直近4秒ぶんの推移が出る。
     読み方: 各セクションは「上端/下端:固定枠の下端」。dev_st は P=再生中 D=完了 S=開始済 と章番号 */
  diag(n) { return diagRing.slice(-(n || 60)); },
  diagText(n) { return diagRing.slice(-(n || 60)).map(r =>
    `y${r.y} vh${r.vh} ${r.drive} res${r.results} dev${r.dev} cas${r.cases} fin${r.fin} ttl${r.title} ${r.dev_st} @${r.at78}`).join('\n'); },
  /* 検証用: いま何が再生中でスクロールが止まっているか */
  lockState() { return { locked: scrollLocked, playing: anyPlaying(), sections: JSON.parse(JSON.stringify(secPlay)) }; },
};

/* ================= ステージのスケーリング =================
   高さ921pxのカンプ座標系はそのままに、幅だけ画面いっぱいへ広げる（フィル）。
   左右の要素は left:120px / right:120px でアンカーしているので余白は常に120px */
const stage = document.getElementById('stage');
/* ===== 【2026-09-26 ヒデさん依頼「ウィンドウ幅がいろいろな端末でも順応するように」】PC⇄スマホの境目をまたいだら開き直す =====
   このページは「開いた瞬間の幅」でPC用/スマホ用を決め、そのとき
     ・スマホ用の値(params.mb)を設定そのものに流し込む(applyMbToParams・元のPC値はメモリ上から消える)
     ・パネルで調整した文字の大きさ/太さを、その側の値で各文字に書き込む(文字システム)
     ・見出しの改行位置など、開いた時の幅で1回だけ決める所がほかにも多数ある
   ため、開いたあとに窓を狭める/広げる・端末を横向きにする等で境目(600px)をまたぐと、並びだけ切り替わって
   中身は開いた時の側のまま(PCの大きい文字がスマホ幅にはみ出す等)になっていた。さらにスマホ幅で開いて
   PC幅へ広げると、スマホの値が入った設定のまま保存が動き、PCの保存値をスマホの値で上書きする危険もあった。
   → 境目をまたいだら、幅が落ち着くのを待って1回だけ開き直す(＝最初からその幅で開いたのと必ず同じになる)。
     見ていた位置(セクションとその中の進み)は開き直したあとに戻す。途中で元の側へ戻したら開き直さない。 */
let modeAtLoad = null;                 /* 開いた時の側(true=スマホ) */
let _modeReloadT = null;
const MODE_RELOAD_KEY = 'anyflow-mode-reload';   /* sessionStorage: 開き直す前の位置(このタブの中だけ) */
function modeSwitchReload(wasMobile, nextMobile) {
  if (document.documentElement.classList.contains('pp-inner')) return;   /* パネルのスマホプレビューの枠の中は幅が固定なので対象外 */
  if (nextMobile === modeAtLoad) {       /* 開いた時の側へ戻った → 開き直しは取り消し(メモリの設定は開いた時のまま正しい) */
    clearTimeout(_modeReloadT); _modeReloadT = null; window.__afModeReloading = false; return;
  }
  if (!wasMobile && markDirty._t) {      /* PC→スマホ: 保存待ちの調整は PC のうちに保存(スマホ側は保存しない決まり) */
    clearTimeout(markDirty._t); markDirty._t = null;
    try { if (typeof varAutoCapture === 'function') varAutoCapture(); } catch (e) {}
    try { save(); dirty = false; } catch (e) {}
  }
  if (wasMobile && markDirty._t) { clearTimeout(markDirty._t); markDirty._t = null; }   /* スマホ→PC: スマホの値が入った設定は保存しない */
  window.__afModeReloading = true;       /* 開き直すまで save() を止める(03-base の save 冒頭) */
  clearTimeout(_modeReloadT);
  _modeReloadT = setTimeout(() => {
    /* 直前に開き直したばかり(4秒以内)なら繰り返さない＝万一の往復ループ防止 */
    let last = null; try { last = JSON.parse(sessionStorage.getItem(MODE_RELOAD_KEY) || 'null'); } catch (e) {}
    if (last && Date.now() - last.at < 4000) { window.__afModeReloading = false; return; }
    /* 見ていた位置: 画面の中央にあるセクションと、その中での進み(0〜1) */
    let pos = { at: Date.now(), id: null, k: 0 };
    try {
      const mid = innerHeight / 2;
      const sec = [...document.querySelectorAll('body > section[id], .stage > section[id], section[id]')].find(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
      if (sec) { const r = sec.getBoundingClientRect(); const run = Math.max(1, r.height - innerHeight); pos = { at: pos.at, id: sec.id, k: Math.max(0, Math.min(1, -r.top / run)) }; }
    } catch (e) {}
    try { sessionStorage.setItem(MODE_RELOAD_KEY, JSON.stringify(pos)); } catch (e) {}
    location.reload();
  }, 400);
}
/* 開き直したあと、見ていたセクションの同じ所へ戻す(10秒以内の開き直しだけ。ふつうの再読み込みは従来どおり先頭から) */
function restoreModeReloadPos() {
  let pos = null; try { pos = JSON.parse(sessionStorage.getItem(MODE_RELOAD_KEY) || 'null'); } catch (e) {}
  if (!pos || !pos.id || Date.now() - pos.at > 10000) return false;
  const sec = document.getElementById(pos.id); if (!sec) return false;
  const r = sec.getBoundingClientRect(); const run = Math.max(0, r.height - innerHeight);
  const y = Math.max(0, scrollY + r.top + run * pos.k);
  if (typeof lenis !== 'undefined' && lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  pos.id = null; try { sessionStorage.setItem(MODE_RELOAD_KEY, JSON.stringify(pos)); } catch (e) {}   /* 戻すのは1回だけ(時刻は残して往復ループ防止に使う) */
  return true;
}
function fit() {
  /* 描画前などで 0 が返る環境があるのでフォールバックを噛ませる (NaN 防止) */
  const w = window.innerWidth || document.documentElement.clientWidth || 1440;
  const h = window.innerHeight || document.documentElement.clientHeight || 921;
  /* 【2026-09-09 ヒデさん指定・根治】iOS Safari はスクロールでアドレスバーが開閉すると innerHeight だけが
     変わり resize が飛ぶ。そのたびに再レイアウト(scale再計算・セクション高さ再設定)すると、静的なはずの
     コンテンツがスクロールのたびにガクッと動いて見える。モバイルで『幅は同じ・高さだけ変わった』時は
     再レイアウトせずに抜ける(幅が変わる=回転や本当のリサイズの時だけ組み直す)。 */
  /* 【2026-09-09】静的モバイルは初回レイアウトが最終形。iOS Safari はスクロールでアドレスバーが
     開閉して innerHeight(と時に幅サブピクセル)が変わり、それを拾って再レイアウトすると中身が
     ガクッと動く。幅が実質変わらない(±2px)限り一切再レイアウトしない=揺れを完全に断つ。
     本当の回転(幅が2pxより大きく変化)のときだけ通常の fit を通す。 */
  if (isMobile && fitReady && Math.abs(w - lastFitW) <= 2) { lastFitH = h; return; }
  lastFitW = w; lastFitH = h;
  /* スマホは 390×780 の設計フレームに切り替える (PCの1440×921をそのまま縮めると
     本文が4pxくらいになって読めないため、座標系ごと差し替える) */
  /* 【2026-09-08】iOS Safari は読み込み直後に innerWidth が一瞬 980px 等を返すことがあり、
     それを拾うと isMobile を誤判定して固定化する。CSS の @media と同じ matchMedia を基準にして確実化。 */
  const nextMobile = (window.matchMedia && window.matchMedia('(max-width: ' + MOBILE_MAX + 'px)').matches) || w <= MOBILE_MAX;
  /* 1回目の fit で「開いた時の側」を記録(fitReady は最初の fit より前に true になるので、目印には使えない) */
  if (modeAtLoad === null) modeAtLoad = nextMobile;
  else if (nextMobile !== isMobile) modeSwitchReload(isMobile, nextMobile);   /* PC⇄スマホの境目をまたいだ(上の注記) */
  isMobile = nextMobile;
  DW = isMobile ? 390 : 1440;
  DH = isMobile ? 780 : 921;
  document.documentElement.classList.toggle('mb', isMobile);
  try { applyVfFade(); } catch (e) {}   /* 【2026-09-20】SP/PC 確定後にビジョンの図の位置を取り直す(スマホ専用の見た目) */
  try { applyVpSize(); } catch (e) {}   /* 【2026-09-20 #3】isMobile 確定後にビジョンの文字サイズを取り直す(SP は SP 既定/上書きで、PC は PC 値で) */
  try { applyKvCopy(); } catch (e) {}   /* 【2026-09-20 #3】KV見出しの文字サイズも同様に isMobile 確定後に取り直す */
  try { applyGrid(); } catch (e) {}   /* 【2026-09-21】画面幅が変わったら方眼の中央合わせ(--grid-pos-x)を取り直す */
  try { if (typeof applyVisEmphLeft === 'function') applyVisEmphLeft(); } catch (e) {}   /* 【2026-09-21】強調案の見出しを画面左120pxへ(幅が変わったら逆算し直す) */
  /* 【2026-09-09】isMobile が確定したこの時点でロゴティッカーの再生を再アサート。
     初回に applyMarquee が isMobile 未確定(=false)＋params.running=false で走ると
     ティッカーが止まったままになるため、モバイル確定後に必ず running へ戻す。 */
  if (isMobile && typeof marqueeTrack !== 'undefined' && marqueeTrack) marqueeTrack.style.animationPlayState = 'running';
  /* 【2026-09-09】ロゴ帯のぼやけ対策: 初期フレーム(isMobile 未確定=false)で rv() が
     inline に filter:blur(8px)/opacity:0 を書いてしまい、モバイル確定後は誰も消さないため
     帯がぼやけたまま残っていた。確定時に一度だけ inline を空にする(表示は CSS の .logos に委ねる)。 */
  if (isMobile && typeof kvEls !== 'undefined' && kvEls.logos && !kvEls.logos.dataset.mbCleared) {
    kvEls.logos.style.filter = ''; kvEls.logos.style.opacity = ''; kvEls.logos.style.transform = ''; kvEls.logos.style.pointerEvents = '';
    kvEls.logos.dataset.mbCleared = '1';
  }
  const s = Math.min(1, w / DW);                   // 設計幅以上では等倍(100%表示)
  const sp = Math.min(1, w / DW, h / DH);          // ピンは縦も収まるように
  /* 【2026-09-15 ヒデさん指定・レスポンシブ】設計幅(1440)より広い画面では、ステージを画面幅まで広げず 1440 のまま中央に置く
     (広げると絶対配置の要素(ビジョンの見出しなど)が左に寄ったまま動かない。縮小する時は従来どおり画面幅ぴったり)。スマホは従来どおり */
  stageW = (!isMobile && s >= 1) ? DW : Math.max(DW, w / s);
  /* 固定(pin)のステージも PC は常に設計幅(1440)。横長で縦が低い窓(例 1512×828・1920×800)では以前 w/sp まで広げていたため、
     縮小はしても中身が左に寄ったままだった(ビジョンの見出しが中央から −118〜−329px)。1440×sp の枠を中央に置く(枠の外は pin-vp の地色) */
  stagePinW = isMobile ? Math.max(DW, w / sp) : DW;
  const st = document.documentElement.style;
  st.setProperty('--s', s);
  st.setProperty('--sp', sp);
  st.setProperty('--sw', stageW + 'px');
  st.setProperty('--swp', stagePinW + 'px');
  /* 【2026-09-15 ヒデさん指摘】設計幅(1440)のステージを中央に置いたため、縦が低い窓では
     ステージが画面より狭くなり、罫線やロゴ帯が画面の端まで届かなくなっていた。
     「画面幅いっぱい」で見せたい要素のために、ステージ内の設計px で画面幅ぶんの幅と左位置を渡す。
     (bleed-w = 画面幅 ÷ 縮小率 / bleed-x = それをステージ中央に置くための左オフセット) */
  { const bwp = w / sp, bws = w / s;
    st.setProperty('--bleed-w', bwp.toFixed(1) + 'px');
    st.setProperty('--bleed-x', ((stagePinW - bwp) / 2).toFixed(1) + 'px');
    st.setProperty('--bleed-w-s', bws.toFixed(1) + 'px');
    st.setProperty('--bleed-x-s', ((stageW - bws) / 2).toFixed(1) + 'px'); }
  st.setProperty('--dh', DH + 'px');
  /* 【2026-09-09 ヒデさん指定】dev2(ds2-slide)モックの横フィット。dev は --s スケール外(設計px)で
     dev1 は max-width:100% で縮むのに dev2(840px固定)は縮まず左右にはみ出す。dev-block は padding 120×2 なので
     使える幅 ≒ viewport − 240、左右余白ぶん −64 して 840px を収める倍率を算出し、dev1 と同様に余白を保つ。
     モバイル(≤600)は @media の scale(0.42) が優先されるので影響しない。 */
  st.setProperty('--dev2-fit', isMobile ? '1' : String(Math.max(0.3, Math.min(1, (w - 160) / 840)).toFixed(3)));
  /* 【2026-09-09 カンプSP 準拠】スマホの KV は次セクション(Our Vision y741 = section 667 + label 74)の
     直前で切る。設計フレーム DH=780 のままだと下に空白が残り、KV→ビジョンが空きすぎていた。
     .stage-wrap は overflow:hidden なので、はみ出す分(ロゴ帯 664 より下の空白)は見えない。 */
  /* 【2026-09-20 ヒデさん報告・ロゴが下半分見切れる】KV高さ667だと、器の下端(667)がロゴ帯(≈642–692)の途中に来て、
     次セクションがロゴの下半分を覆っていた(.stage-wrap は 2026-09-17 に overflow:visible 化済み＝クリップでなく被さり)。
     ロゴ帯の下端＋余白まで器を伸ばし、ロゴが必ず全部見えるようにする(その分 KV→ビジョンの間が少し空く)。 */
  const KV_MB_H = 704;
  stage.parentElement.style.height = ((isMobile ? KV_MB_H : DH) * s) + 'px';
  /* スクロール尺 (調整パネルから変えられる) */
  /* 固定追従なしの時は 100vh（貼りつけないので余分な尺は要らない）。
     スクロール駆動の時は尺を driveLen 倍に伸ばして、進み方をゆったりにする */
  const noPin = params.pin === 'off';
  document.documentElement.classList.toggle('nopin', noPin);
  buildNoPin(noPin);
  /* 尺の倍率はセクションごとに持つ（章の数や再生時間が違うので、まとめると噛み合わない） */
  const lenMul = key => (params.drive === 'scroll'
    ? Math.max(1, params.sections[key].driveLen || 1) : 1);
  /* 固定なしでは 1ブロック=100vh。ビジョンと開発者体験は2ブロック積むので 200vh 必要 */
  const NP_BLOCKS = { vision: 2, dev: 2, results: 1, cases: 1 };
  const H = key => (noPin ? 100 * NP_BLOCKS[key] : Math.round(params.sections[key].lenVh * lenMul(key))) + 'vh';
  /* 【2026-09-09 ヒデさん指定】タブレット(デスクトップ層で幅が --s に縮む)は「1画面=100vh」の中に
     幅縮小(--sp)されたコンテンツが中央寄せされ、上下に大きな余白ができる。NOPIN(非ピン)の各セクションは
     ピン走路が不要なので、タブレットだけ 1画面ぶんの高さを詰めて余白を減らす。PC(--s=1)は 100vh のまま。
     コンテンツ高さ(≒DH×--sp)が収まる範囲で、少し余裕(×1.25・最低62vh)を持たせてクリップを防ぐ。 */
  const isTablet = !isMobile && s < 0.92;
  document.documentElement.classList.toggle('tab', isTablet);
  const nopinSecVh = isTablet
    ? Math.max(62, Math.min(100, Math.round((sp * DH / h) * 100 * 1.25))) + 'vh'
    : '100vh';
  document.documentElement.style.setProperty('--nopin-vh', nopinSecVh);   /* NOPINセクションの pin-vp 高さをCSSから連動(タブレットで詰める) */
  /* 【2026-08-29】Vision は常に固定追従なし＝1画面(100vh)で普通に流す(スクロールジャックしない)。
     登場は入場トリガーで updateVision が時間で自動再生する。 */
  SECS.vision.style.height = VIS_NOPIN ? nopinSecVh : H('vision');
  /* 【2026-08-25 リデザイン】開発者体験は非pin・2ブロック(各min-height:100vh)なので、
     中身なりの高さ(auto=約200vh)にする。pin用の H('dev')(=600vh)は使わない。 */
  SECS.dev.style.height = 'auto';   /* pin時は .dev-block が各(100vh+dwell)なので auto でも自動で伸びる */
  /* 【2026-09-16 ヒデさん指定】開発者体験①②の「中央で一旦止まる(sticky)」。PC のみ。dwell=止まっている長さ(vh) */
  SECS.dev.classList.toggle('dev-pin', !isMobile && (params.sections.dev.pinStops !== 'off'));
  SECS.dev.style.setProperty('--dev-dwell', (params.sections.dev.devDwell != null ? params.sections.dev.devDwell : 90) + 'vh');
  /* 【2026-08-29 ヒデさん指定】スムーズフェード時は実績に被せない＝#dev の -100vh 重なりを外して普通に下へ置く。 */
  SECS.dev.style.marginTop = resSmooth() ? '0' : '';
  /* 【2026-08-29】導入事例も固定追従なし＝1画面(100vh)。長いピン尺(最大600vh)の余分スクロールを解消。 */
  SECS.cases.style.height = CASES_NOPIN ? nopinSecVh : H('cases');
  /* 【2026-08-29】スムーズフェード時は実績も固定追従なし＝1画面(100vh)で普通に流す。 */
  SECS.results.style.height = resSmooth() ? nopinSecVh : H('results');
  SECS.results.classList.toggle('res-smooth', resSmooth());
  /* 【2026-09-13 比較検証】実績の演出案(resFx)。固定して読む区間がある案は sticky に戻し、セクション高さを伸ばす。
     #dev は実績直後に続くので、伸ばした尺の終端がそのまま既存の暗転入口(devDarkK)になる。 */
  document.documentElement.classList.toggle('rfx-short', resFxShort());   /* SP で縦が短い(≤600px): 固定案を縦流れに */
  applyResFx();
  { const _k = resFxActive(), _vh = resFxVh(_k);
    if (resFxFlowMode(_k)) SECS.results.style.height = 'auto';   /* 自然に流れる案(4、縦が短い端末の固定案): 中身なりの高さ */
    else if (_vh) SECS.results.style.height = _vh + 'vh'; }
  /* 【2026-09-09 ヒデさん指定・見切れ根治】静的モバイル: pin-vp(100vh)より中身が高いセクションは
     下が見切れる。最下要素の位置から実コンテンツ高さを測り、section と pin-vp に明示的に設定して
     クリップを解除する(絶対配置でも最下要素のrectで測れる)。 */
  if (isMobile) requestAnimationFrame(() => {
    const fixH = (id, lastSel, pad) => {
      const sec = SECS[id]; if (!sec) return;
      const vp = sec.querySelector('.pin-vp'); if (!vp) return;
      const lasts = sec.querySelectorAll(lastSel);
      if (!lasts.length) return;
      const secTop = sec.getBoundingClientRect().top;
      let maxB = 0;
      lasts.forEach(el => { const b = el.getBoundingClientRect().bottom; if (b > maxB) maxB = b; });
      const hh = Math.ceil(maxB - secTop + (pad || 40));
      if (hh > 100) { vp.style.position = 'relative'; vp.style.overflow = 'visible'; vp.style.height = hh + 'px'; sec.style.height = hh + 'px'; }
    };
    fixH('vision', '#valP1, #valP2', 16);   /* 【2026-09-16 ヒデさん依頼】ビジョン末尾の余白=実績「事業の推進力を」の上。85→16(=--space-16。スペーシングガイドライン準拠)。ビジョン上部は意図的なので不変 */
    if (resFxActive() === 'default') fixH('results', '#resVals, .r2v:last-child', 56);   /* 【2026-09-14】案の時は案の CSS/JS が高さを決める */
    fixH('cases', '.cg-cell', 64);
    try { initSpResultLines(); } catch (e) {}   /* 【2026-09-22】SP: 実績の罫線3本を入場アニメ(左→右トリム・ディレイ)にする */
  });
}
fitReady = true;
/* 【2026-09-22 ヒデさん依頼】SP のみ: 実績の罫線(res2-hr-top / res2-vline / res2-hr の3本)を
   「ビューポートに入った段階で左→右にパスのトリミング＋3本ディレイ」で出す。
   軽量化で SP は --rfx-hr/--rfx-vline=1 固定＋rfx-flow で transform:none となり最初から全部表示だった。
   PC はスクロール駆動(--rfx-hr)のまま＝一切触らない。inline!important で CSS の transform:none !important に勝つ。 */
let _spLineIO = null;
function initSpResultLines() {
  const on = (typeof isMobile !== 'undefined' && isMobile);
  const res = document.getElementById('results'); if (!res) return;
  if (_spLineIO) { _spLineIO.disconnect(); _spLineIO = null; }
  let lines = [].slice.call(res.querySelectorAll('.res2-hr-top, .res2-vline, .res2-hr'))
    .filter(el => getComputedStyle(el).display !== 'none');
  if (!on) {   /* PC: 何もしない(万一 inline が付いていたら剥がして従来のスクロール駆動へ) */
    lines.forEach(el => { ['transform', 'transform-origin', 'transition', 'transition-delay'].forEach(k => el.style.removeProperty(k)); delete el.dataset.lnShown; });
    return;
  }
  lines.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);   /* 上から順にディレイ */
  lines.forEach((el, i) => {
    if (el.dataset.lnShown === '1') return;   /* 既に出したものは触らない(リサイズで戻さない) */
    el.style.setProperty('transform', 'scaleX(0)', 'important');
    el.style.transformOrigin = 'left center';
    el.style.transition = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.transitionDelay = (i * 0.12).toFixed(2) + 's';
  });
  _spLineIO = new IntersectionObserver((ents) => {
    ents.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.style.setProperty('transform', 'scaleX(1)', 'important');   /* 左→右トリム */
      e.target.dataset.lnShown = '1';
      _spLineIO.unobserve(e.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -22% 0px' });   /* ビューポートの上寄り78%に入ったら描く */
  lines.forEach(el => { if (el.dataset.lnShown !== '1') _spLineIO.observe(el); });
}
window.addEventListener('resize', fit);
window.addEventListener('load', fit);
/* リロードしたら必ずキービジュアルの先頭から。
   ブラウザ既定の「前回のスクロール位置を復元」を切っておかないと、
   途中から復元されて各セクションの自動再生が中途半端な状態で始まってしまう */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
/* ヘッダーのアンカーリンクも慣性スクロールで飛ばす */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const el = document.querySelector(a.getAttribute('href'));
  if (!el) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(el, { duration: 1.6 }); else el.scrollIntoView();
});
/* 【2026-09-26】PC⇄スマホの境目で開き直した時だけは、見ていたセクションの同じ所へ戻す(modeSwitchReload)。それ以外は従来どおり先頭から */
window.addEventListener('load', () => { window.scrollTo(0, 0); setTimeout(() => { try { restoreModeReloadPos(); } catch (e) {} }, 350); });
window.scrollTo(0, 0);
if (window.ResizeObserver) new ResizeObserver(fit).observe(document.documentElement);
fit();

/* ================= 調整パネル UI ================= */
const body = document.getElementById('panelBody');
const PANEL_TAB_KEY = 'anyflow-panel-tab-v1';   /* 【2026-09-15】調整パネルで選んだタブ(大カテゴリ)の記憶 */

/* 既定値をそのまま読むためのヘルパー。
   スライダーの get は params を参照する閉包なので、一瞬だけ params を初期値に差し替えて呼ぶ */

/* ===== 「その場で反映」と「頭から流し直し」の使い分け (2026-08-19 ヒデさん指摘) =====
   ⚠️ これまではパネルを触ると必ず replayHere() が走り、
      キービジュアルにいる時は elapsed が 0 に戻っていた。
      つまり【ヘッダーのブラー → タイピング → グラフィック出現】が全部やり直しになる。
      惑星の柄を選んだだけで画面がリセットされるので、リロードしたようにしか見えない。
      実測: 柄のピルを押すと elapsed 20s → 0s、ヘッダーの不透明度 1 → 0。

   見た目そのものを変える項目（惑星の柄・自転・軌道の見え方）は、時計を戻さず
   その場で描き直すだけでよい。逆に「登場の順番やタイミング」を触る項目は
   頭から流し直さないと結果が見えないので、従来どおり流し直す。

   liveEdit = true の間に作られた項目は「その場で反映」になる。 */
let liveEdit = false;
function applyEdit(isLive, now) {
  /* 【2026-08-27 ヒデさん指定】「パネルを触るとリロードが走る」の根治。
     これまでは liveEdit=false の項目を触るたびに replayHere() で
     セクションの時計を 0 に戻していた（＝頭から再生し直し）。
     今後はどの項目でも時計を戻さず、いまの時刻のまま描き直すだけにする。
     つまみを動かした瞬間に、その場で結果が変わる。 */
  renderFrame();
}

/* ===== アニメ案ごとの「グラフィックの形」 (2026-08-27 ヒデさん指定) =====
   ⚠️ これまでは軌道と惑星の位置・サイズが【全案で共通】だったので、
      ①で輪を潰すと②③でも潰れたままだった。
      これからは案ごとに別々に持ち、案を切り替えると【その案の形】に入れ替わる。
      いま画面に出ている値は今までどおり params.orbits / params.planet。
      案を離れる時にそれを params.gfxByMode[案] へしまい、入る時に取り出す。 */
function gfxSnapshot() {
  const pick = o => ({ dx: o.dx, dy: o.dy, scale: o.scale, flat: o.flat == null ? 1 : o.flat, angle: o.angle, behind: !!o.behind });
  const P = params.planet;
  return {
    layout: params.orbitLayout,
    outer: pick(params.orbits.outer),
    inner: pick(params.orbits.inner),
    planet: { dx: P.dx, dy: P.dy, scale: P.scale, flat: P.flat == null ? 1 : P.flat },
  };
}
/* 「最初に実装した位置関係」= DEFAULTS の値。案ごとの既定はこれ */
function gfxDefault() {
  const pick = o => ({ dx: o.dx, dy: o.dy, scale: o.scale, flat: o.flat == null ? 1 : o.flat, angle: o.angle });
  const P = DEFAULTS.planet;
  return {
    layout: DEFAULTS.orbitLayout,
    outer: pick(DEFAULTS.orbits.outer),
    inner: pick(DEFAULTS.orbits.inner),
    planet: { dx: P.dx, dy: P.dy, scale: P.scale, flat: P.flat == null ? 1 : P.flat },
  };
}
function gfxApply(d) {
  if (!d) return;
  if (d.layout) params.orbitLayout = d.layout;
  for (const key of ['outer', 'inner']) {
    if (!d[key]) continue;
    for (const k of ['dx', 'dy', 'scale', 'flat', 'angle']) {
      if (typeof d[key][k] === 'number') params.orbits[key][k] = d[key][k];
    }
    if (typeof d[key].behind === 'boolean') params.orbits[key].behind = d[key].behind;
  }
  if (d.planet) {
    for (const k of ['dx', 'dy', 'scale', 'flat']) {
      if (typeof d.planet[k] === 'number') params.planet[k] = d.planet[k];
    }
  }
  markDirty();
  renderFrame();
}
/* いまの形を、いまの案の引き出しへしまう */
function gfxStash() {
  if (!params.gfxByMode) params.gfxByMode = {};
  params.gfxByMode[params.converge || 'reel'] = gfxSnapshot();
}
/* ===== プリセットに入れる中身 (2026-08-27 ヒデさん指摘で拡張) =====
   ⚠️ これまでプリセットは【形】(軌道と惑星の位置・大きさ・傾き)しか覚えていなかったので、
      アニメのつまみをいくら調整して保存しても、呼び出した時に再現されなかった。
      いまは「その時にパネルで見えている値」をまるごと覚える:
        形 / 惑星の模様 / ゆらぎ / 共通の見せ方 / いま選んでいる案のつまみ一式 */
function gfxSnapshotFull() {
  const mode = params.converge || 'reel';
  const pk = CONV_PARAM_KEY[mode];
  const C = params.conv;
  return {
    ...gfxSnapshot(),
    design: params.design,
    sway: params.sway,
    swayAmp: params.swayAmp,            /* ゆらぎの強さ */
    swayDir: params.swayDir || 'tilt',  /* 揺らぎの動き(2026-08-30) */
    duration: params.duration,          /* ドットが軌道を1周する秒数 */
    globalSpeed: params.globalSpeed,
    /* 【2026-08-29 ヒデさん指定】自由回転(全体の回転)は案ごとに独立させる。
       案(バリエーション)ごとに保存し、切替時に復元・未設定は0へ戻す。 */
    kv: { rotX: (params.kv && params.kv.rotX) || 0, rotY: (params.kv && params.kv.rotY) || 0, rotZ: (params.kv && params.kv.rotZ) || 0 },
    common: {
      showOuter: C.showOuter, showInner: C.showInner, showDots: C.showDots,
      dotSize: C.dotSize, dotPersp: C.dotPersp, perspK: C.perspK, perspScope: C.perspScope, glow: C.glow, frontCut: C.frontCut,
      glowKind: C.glowKind, glowHold: C.glowHold, glowEcho: C.glowEcho,
      echoSpeed: C.echoSpeed, echoShells: C.echoShells, echoSpread: C.echoSpread,
      echoStart: C.echoStart, echoFade: C.echoFade, echoAlpha: C.echoAlpha,
      fxMode: C.fxMode, fxCount: C.fxCount, fxEvery: C.fxEvery, fxInertia: C.fxInertia, echoCrisp: C.echoCrisp,
      ringCount: C.ringCount, ringShape: C.ringShape, ringSpin: C.ringSpin, ringFlat: C.ringFlat, ringSize: C.ringSize, ringTumble: C.ringTumble, ringWidth: C.ringWidth, ringRotate: C.ringRotate, startPhase: C.startPhase,
      dotRandom: C.dotRandom, orbitSpin: C.orbitSpin, orbitDrift: C.orbitDrift,
      dotMove: C.dotMove ? C.dotMove[mode] : undefined,
      orbitSpin: convOrbitSpinAmt(),          /* 案ごとの軌道回転 */
      gyroMix: (C.gyroMixBy || {})[mode] || 0, /* 案ごとのジャイロ混ぜ具合 */
      orbitWidth: (C.orbitWidthBy || {})[mode], /* 案ごとの軌道の線の太さ */
      orbitScale: (C.orbitScaleBy || {})[mode], /* 案ごとの軌道のサイズ */
      net3d: !!C.net3d,                        /* 【2026-08-31】ネットワーク3Dフラグ(欠けると上書き復元で標準軌道に化けた) */
      hsway: C.hsway ? { ...C.hsway } : undefined,   /* 【2026-09-01】横揺れ(B3) */
    },
    net3dNT: params.net3d ? { ...params.net3d } : null,   /* 【2026-08-31】ネットワーク3D専用つまみ一式 */
    mode: pk && C[pk] ? { ...C[pk] } : null,
    meshPts: (C.mesh && C.mesh.pts) ? C.mesh.pts.map(q => ({ x: q.x, y: q.y })) : null,
    gyro: C.gyro ? { ...C.gyro } : null,   /* ジャイロの転がり方 */
    /* ※「登場(出てくる順番)」は 2026-08-27 に削除。モックKV(iframe)専用で、
         惑星案では何も効かない値だったため、プリセットにも入れない */
  };
}
function gfxApplyFull(d) {
  if (!d) return;
  gfxApply(d);                                  /* まず形 (古いプリセットはここだけ入っている) */
  if (typeof d.design === 'string') params.design = d.design;
  if (typeof d.sway === 'number') params.sway = d.sway;
  if (typeof d.swayAmp === 'number') params.swayAmp = d.swayAmp;
  if (typeof d.swayDir === 'string') params.swayDir = d.swayDir;
  if (typeof d.duration === 'number') params.duration = d.duration;
  if (typeof d.globalSpeed === 'number') params.globalSpeed = d.globalSpeed;
  /* 【2026-08-29】自由回転(全体の回転)を案ごとに復元。無い案は0(=正面)。 */
  if (params.kv) {
    params.kv.rotX = (d.kv && typeof d.kv.rotX === 'number') ? d.kv.rotX : 0;
    params.kv.rotY = (d.kv && typeof d.kv.rotY === 'number') ? d.kv.rotY : 0;
    params.kv.rotZ = (d.kv && typeof d.kv.rotZ === 'number') ? d.kv.rotZ : 0;
  }
  const mode = params.converge || 'reel';
  const C = params.conv;
  if (d.net3dNT && params.net3d) Object.assign(params.net3d, d.net3dNT);   /* 2026-08-31: ネットワーク3Dつまみ復元 */
  if (d.common) {
    for (const k of ['showOuter', 'showInner', 'showDots', 'dotSize', 'dotPersp',
                     'perspK', 'perspScope', 'glow', 'dotRandom', 'orbitSpin', 'orbitDrift', 'frontCut',
                     'glowKind', 'glowHold', 'glowEcho',
                     'echoSpeed', 'echoShells', 'echoSpread', 'echoStart', 'echoFade', 'echoAlpha',
                     'fxMode', 'fxCount', 'fxEvery', 'fxInertia', 'echoCrisp',
                     'ringCount', 'ringShape', 'ringSpin', 'ringFlat', 'ringSize', 'ringTumble', 'ringWidth', 'ringRotate', 'startPhase']) {
      if (d.common[k] !== undefined) C[k] = d.common[k];
    }
    if (d.common.dotMove !== undefined) {
      if (!C.dotMove) C.dotMove = {};
      C.dotMove[mode] = d.common.dotMove;
    }
    if (d.common.net3d !== undefined) C.net3d = !!d.common.net3d;   /* 2026-08-31 */
    if (d.common.hsway) C.hsway = { ...JSON.parse(JSON.stringify(DEFAULTS.conv.hsway)), ...d.common.hsway };   /* 2026-09-01: 横揺れ復元 */
    if (typeof d.common.orbitSpin === 'number') {
      if (!C.orbitSpinBy) C.orbitSpinBy = {};
      C.orbitSpinBy[mode] = d.common.orbitSpin;
    }
    if (typeof d.common.gyroMix === 'number') {
      if (!C.gyroMixBy) C.gyroMixBy = {};
      C.gyroMixBy[mode] = d.common.gyroMix;
    }
    if (typeof d.common.orbitWidth === 'number') {
      if (!C.orbitWidthBy) C.orbitWidthBy = {};
      C.orbitWidthBy[mode] = d.common.orbitWidth;
    }
    if (typeof d.common.orbitScale === 'number') {
      if (!C.orbitScaleBy) C.orbitScaleBy = {};
      C.orbitScaleBy[mode] = d.common.orbitScale;
    }
  }
  const pk = CONV_PARAM_KEY[mode];
  if (d.mode && pk && C[pk]) Object.assign(C[pk], d.mode);
  if (C.mesh) C.mesh.pts = d.meshPts ? d.meshPts.map(q => ({ x: q.x, y: q.y })) : null;
  if (d.gyro && C.gyro) Object.assign(C.gyro, d.gyro);
  markDirty();
  renderFrame();
}

/* 【2026-08-27 ヒデさん指定】確認は window.confirm ではなく、パネルのトーンに合わせた小さなモーダルで出す */
function askModal(title, body, okLabel, onOk) {
  const bg = document.createElement('div');
  bg.className = 'mdl-bg';
  const m = document.createElement('div');
  m.className = 'mdl';
  const h = document.createElement('h4'); h.textContent = title;
  const p = document.createElement('p'); p.textContent = body;
  const row = document.createElement('div'); row.className = 'mdl-btns';
  const no = document.createElement('button'); no.type = 'button'; no.textContent = 'やめる';
  const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'danger'; yes.textContent = okLabel || '削除する';
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  no.onclick = close;
  yes.onclick = () => { close(); onOk(); };
  bg.onclick = e => { if (e.target === bg) close(); };
  document.addEventListener('keydown', onKey, true);
  row.append(no, yes); m.append(h, p, row); bg.appendChild(m); document.body.appendChild(bg);
  yes.focus();
}

/* 【2026-08-28 ヒデさん指定】消した案は「全部戻す」だとややこしいので、
   一覧を出して1つずつ選んで戻せるようにする */
function pickModal(title, body, items, onPick) {
  const bg = document.createElement('div');
  bg.className = 'mdl-bg';
  const m = document.createElement('div');
  m.className = 'mdl';
  const h = document.createElement('h4'); h.textContent = title;
  const p = document.createElement('p'); p.textContent = body;
  const list = document.createElement('div'); list.className = 'mdl-list';
  const row = document.createElement('div'); row.className = 'mdl-btns';
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const draw = () => {
    list.innerHTML = '';
    if (!items.length) { close(); return; }
    items.slice().forEach(name => {
      const li = document.createElement('div'); li.className = 'mdl-li';
      const t = document.createElement('span'); t.textContent = name;
      const b = document.createElement('button'); b.type = 'button'; b.textContent = '戻す';
      b.onclick = () => { onPick(name); draw(); };
      li.append(t, b); list.appendChild(li);
    });
  };
  const done = document.createElement('button'); done.type = 'button'; done.textContent = '閉じる';
  done.onclick = close;
  row.appendChild(done);
  bg.onclick = e => { if (e.target === bg) close(); };
  document.addEventListener('keydown', onKey, true);
  m.append(h, p, list, row); bg.appendChild(m); document.body.appendChild(bg);
  draw();
}

/* --- 案ごとのグラフィック3案 (2026-08-27 ヒデさん指定) --- */
function applyGfxVariant(i) {
  const mode = params.converge || 'reel';
  const v = (GFX_VARIANTS[mode] || [])[i];
  if (!v) return;
  applyingVariant = true;
  /* 【2026-08-28 ヒデさん指定・根治】案を選び直したら、その案が指定しない「回転・スピン系」は
     必ず 0 へ戻す。こうしないと、前に選んだジャイロ案やスピンの保存値がブラウザに残って
     「A カンプ通り」を選んでも回り続けてしまう。このあと root / gyro / common / conv が
     上書きするので、回転を指定している案(ジャイロ案など)はちゃんと効く。 */
  if (!params.conv.orbitSpinBy) params.conv.orbitSpinBy = {};
  if (!params.conv.gyroMixBy) params.conv.gyroMixBy = {};
  params.conv.orbitSpinBy[mode] = 0;
  params.conv.gyroMixBy[mode] = 0;
  params.conv.ringCount = 0;   /* シェイプ(複数軌道)は、それを指定する案でだけオンにする */
  if (mode === 'reel' && params.conv.reel) params.conv.reel.spinUp = 0;
  /* 【2026-08-29 ヒデさん指定】案ごとに独立させるため、案を選ぶ瞬間に「シェイプ共通」と
     「この案のつまみ」を一旦すべて既定へ戻す。このあと 定義(common/conv) → 保存した調整 の順に
     重ねるので、他の案でいじった値が漏れて残らない。 */
  for (const rk of ['ringShape', 'ringSpin', 'ringFlat', 'ringSize', 'ringTumble', 'ringWidth', 'ringRotate', 'startPhase'])
    params.conv[rk] = DEFAULTS.conv[rk];
  /* 【2026-08-29 ヒデさん指定・全項目を案ごとに独立】表示(外の輪/内の輪/ドット)・ドット設定・
     光り方・エフェクト・遠近 なども、案を選ぶ瞬間に一旦すべて既定へ戻す。
     このあと 定義(v.common) → その案で保存した調整 の順に重ねるので、他の案の値が漏れない。 */
  for (const k of ['showOuter', 'showInner', 'showDots', 'dotSize', 'dotPersp', 'perspK', 'perspScope',
                   'glow', 'frontCut', 'glowKind', 'glowHold', 'glowEcho',
                   'echoSpeed', 'echoShells', 'echoSpread', 'echoStart', 'echoFade', 'echoAlpha',
                   'fxMode', 'fxCount', 'fxEvery', 'fxInertia', 'echoCrisp', 'dotRandom', 'orbitDrift', 'net3d'])
    if (DEFAULTS.conv[k] !== undefined) params.conv[k] = DEFAULTS.conv[k];
  /* 横揺れ(B3専用)も一旦既定(オフ)へ。B3を選んだ時だけ下で有効化される */
  params.conv.hsway = JSON.parse(JSON.stringify(DEFAULTS.conv.hsway));
  /* 案ごとの引き出し(per-mode)も既定へ */
  if (params.conv.orbitWidthBy) params.conv.orbitWidthBy[mode] = (DEFAULTS.conv.orbitWidthBy || {})[mode];
  if (params.conv.orbitScaleBy) params.conv.orbitScaleBy[mode] = (DEFAULTS.conv.orbitScaleBy || {})[mode];
  if (params.conv.dotMove)      params.conv.dotMove[mode]      = (DEFAULTS.conv.dotMove || {})[mode];
  /* 自由回転(全体の回転)も案ごとに独立＝既定は正面(0) */
  if (params.kv) { params.kv.rotX = 0; params.kv.rotY = 0; params.kv.rotZ = 0; }
  /* 【2026-08-29 ヒデさん指定・フォーマット統一】揺らぎも案ごとに独立＝既定はオン(②シーソー)。
     この案で保存した値があれば、このあと gfxApplyFull で復元される。 */
  params.sway = DEFAULTS.sway;
  params.swayAmp = DEFAULTS.swayAmp;
  params.swayDir = DEFAULTS.swayDir;
  {
    const pk0 = CONV_PARAM_KEY[mode];
    if (pk0 && DEFAULTS.conv[pk0] && params.conv[pk0])
      for (const kk in DEFAULTS.conv[pk0]) params.conv[pk0][kk] = DEFAULTS.conv[pk0][kk];
  }
  /* 【2026-08-30 ヒデさん指定・再修正】プリセット昇格バリエーション:
     上の「一旦すべて既定へ」を通した上で、プリセットの全設定(gfxApplyFull)をそのまま重ねる。
     ⚠️ 以前は既定リセットを通さない別分岐だったため、プリセットに無い古い項目(ringRotate等)へ
        直前の案の値が漏れて「プリセットの数値と違う」が起きていた。 */
  /* 【2026-08-30 ヒデさん指定】「この設定で上書き」した案は、その控え(全設定)が最優先。
     無ければ昇格プリセットの数値。どちらも既定リセット後にフル適用＝決定的。 */
  const _ov = ((params.gfxVarOverride || {})[mode] || {})[v.name];
  if (_ov || v.preset) {
    gfxApplyFull(JSON.parse(JSON.stringify(_ov || v.preset)));
    /* 【2026-08-31】古い上書きスナップショットに net3d が無くても、案の定義から必ず立て直す
       (欠けているとネットワーク3D案が標準軌道の姿で開いてしまう) */
    if (params.conv) params.conv.net3d = convVarIsNetwork(v) || !!(_ov && _ov.common && _ov.common.net3d);
    if (!params.gfxVariantOn) params.gfxVariantOn = {};
    params.gfxVariantOn[mode] = i;
    /* 上書き/昇格は「保存した数値で開く」が正。調整の控え(gfxTweaks)は復元しない(汚染上書き防止) */
    applyingVariant = false;
    markDirty();
    renderFrame();
    return;
  }
  if (v.hsway) params.conv.hsway.on = true;   /* B3「J 地平線・横揺れ」: 横揺れを既定オン */
  const base = gfxDefault(), g = v.gfx || {};
  gfxApply({
    layout: g.layout || base.layout,
    outer:  { ...base.outer,  ...(g.outer  || {}) },
    inner:  { ...base.inner,  ...(g.inner  || {}) },
    planet: { ...base.planet, ...(g.planet || {}) },
  });
  const pk = CONV_PARAM_KEY[mode];
  if (v.conv && pk && params.conv[pk]) Object.assign(params.conv[pk], v.conv);
  /* 【2026-08-27 ヒデさん指定】ゆったりさせるには、ドットが軌道を1周する時間そのものを
     変える必要がある。root は params の直下(duration など)へ書く */
  if (v.root) for (const k in v.root) params[k] = v.root[k];
  /* ⑦の転がりの設定は共通の引き出し(conv.gyro)へ */
  if (v.gyro && params.conv.gyro) Object.assign(params.conv.gyro, v.gyro);
  /* common は params.conv の直下(共通の見せ方)へ。
     orbitSpin と gyroMix だけは案ごとの引き出しへ入れる */
  if (v.common) {
    for (const k in v.common) {
      if (k === 'orbitSpin') {
        /* 【2026-08-29 ヒデさん指定・フォーマット統一】軌道の回転は全案とも既定オフに統一する。
           案が持っていた回転量は「回転をオンにした時に使う速さ」として控えておくだけで、
           アクティブな値(orbitSpinBy)は 0(オフ)のまま。オンにするのはパネルのトグル。 */
        if (!params.conv.spinDefBy) params.conv.spinDefBy = {};
        params.conv.spinDefBy[mode] = v.common[k];
        /* orbitSpinBy[mode] は上のリセットで 0(オフ)のまま。この案で回転オンを保存していれば後で復元 */
      } else if (k === 'gyroMix') {
        /* 【2026-08-29 ヒデさん指定】ジャイロの転がりも既定オフに統一。値は「オンにした時用」に控える(gyroMixByは0のまま)。 */
        if (!params.conv.gyroMixDefBy) params.conv.gyroMixDefBy = {};
        params.conv.gyroMixDefBy[mode] = v.common[k];
      } else if (k === 'orbitWidth') {
        if (!params.conv.orbitWidthBy) params.conv.orbitWidthBy = {};
        params.conv.orbitWidthBy[mode] = v.common[k];
      } else if (k === 'orbitScale') {
        if (!params.conv.orbitScaleBy) params.conv.orbitScaleBy = {};
        params.conv.orbitScaleBy[mode] = v.common[k];
      } else params.conv[k] = v.common[k];
    }
  }
  if (!params.gfxVariantOn) params.gfxVariantOn = {};
  params.gfxVariantOn[mode] = i;
  /* 【2026-08-29 ヒデさん指定】この案で前に調整した値があれば重ねて復元(案ごとに独立) */
  const tw = params.gfxTweaks && params.gfxTweaks[mode] && params.gfxTweaks[mode][i];
  if (tw) gfxApplyFull(tw);
  applyingVariant = false;
  markDirty();
  renderFrame();
}
function gfxVariantOn() { return (params.gfxVariantOn || {})[params.converge || 'reel']; }

/* --- 案ごとのプリセット --- */
function defaultOf(get) {
  const keep = params;
  try { params = DEFAULTS; return get(); }
  catch (e) { return null; }
  finally { params = keep; }
}
/* 【2026-09-20 ヒデさん依頼】リセット(↺)は「このブラウザでページを開いた時の値」に戻す。
   起動時(load＋案の適用＋SP流し込みが済んだ直後)の params を丸ごと控えておき、
   defaultOf と同じ手(params を一時的に控えへ差し替えて get() を呼ぶ)で、パス無しでも各つまみの開始値を引く。
   反転式(13-v など)や sv()/kg()/editPos() 経由のつまみも、get がそのまま控えを読むので正しく戻る。 */
let SESSION_START = null;
function sessionOf(get) {
  if (!SESSION_START) return defaultOf(get);
  const keep = params;
  try { params = SESSION_START; return get(); }
  catch (e) { return null; }
  finally { params = keep; }
}
/* 各項目のリセット(↺)。既定値は defaultOf() で DEFAULTS から引く。
   2026-08-26 ヒデさん指定: 行ごとに戻せるようにし、下の「元に戻す」は廃止 */
function mkReset(get, set, sync, isLive) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rst';
  b.textContent = '↺';
  b.title = 'このセッションを開いた時の値に戻す';
  const d = defaultOf(get);
  if (d === undefined || d === null) { b.classList.add('off'); return b; }   /* 既定が無い項目はリセット対象外(ボタンを無効に) */
  b.onclick = (e) => {
    e.stopPropagation();
    let t = sessionOf(get);                       /* このセッションを開いた時の値 */
    if (t === undefined || t === null) t = d;     /* 無ければ焼き込み既定へフォールバック */
    set(typeof t === 'object' ? structuredClone(t) : t);
    markDirty();
    if (sync) sync();
    applyEdit(!!isLive, true);
  };
  return b;
}
/* ===== 【2026-09-17 大掃除・ヒデさん依頼】ページ上の全テキストの台帳(文字システム) =====
   sec=どのタブの「文字」に出すか(kv/vis/res/dev/case/cv) / multi=同じ見た目の要素が複数(まとめて同じ値を当てる) /
   text=打ち替え可 / font=太さ・行間・字間を変えられる(0=位置だけ) / move=端をつかんで位置移動(0=不可)。
   値の置き場は params.edits[key]={fw,lh,ls,fs,dx,dy,pt…} の一つだけ。パネルの「文字」と ✏️編集(クリック→浮きバー)は同じ値を触る。 */
const TEXT_SPEC = [
  // --- ヘッダー(KVタブに出す) ---
  { key: 'navLogo',   sel: '.logo',                  name: 'ロゴ',                          sec: 'kv',  text: 0, font: 0 },
  { key: 'navLinks',  sel: 'header nav a:not(.cta)', name: 'ヘッダーのナビ',                sec: 'kv',  text: 0, multi: 1, move: 0 },
  { key: 'navCta',    sel: 'header .cta',            name: 'ヘッダーのボタン',              sec: 'kv',  text: 1 },
  // --- キービジュアル ---
  { key: 'kvMain',    sel: '.hl-main',   name: 'KVメインコピー（データ連携で〜）',        sec: 'kv',  text: 0 },
  { key: 'kvMainLast', sel: '.hl-main .hl-line:last-child', name: 'KVメイン 最終行（競争力を）', sec: 'kv', text: 0, move: 0 },   /* 【2026-09-18】Figma 17707:26040 では最終行だけ Bold(700) */
  { key: 'kvEyebrow', sel: '#hlEyebrow', name: 'KVサブコピー（AI/プロダクト企業の〜）',    sec: 'kv',  text: 0 },
  { key: 'kvLogos',   sel: '.logos',     name: 'KVロゴ帯（位置だけ）',                      sec: 'kv',  text: 0, font: 0 },
  // --- ビジョン ---
  { key: 'visLabel',  sel: '#visLabel',      name: 'Our Vision',                         sec: 'vis', text: 1 },
  { key: 'visMsg',    sel: '.vis-l1, .vis-l2', name: 'メッセージ（データをつなぐことが〜）', sec: 'vis', text: 0, multi: 1 },   /* 【2026-09-20】太さ等を1行目・2行目の両方に当てる(強調案の2行対応) */
  { key: 'vfWrap',    sel: '#vfWrap',        name: '図（網目のドーム・位置だけ）',        sec: 'vis', text: 0, font: 0 },   /* 【2026-09-19】Figma 18004:38228 */
  /* 【2026-09-19 ヒデさん依頼】図の機能名と補足は1つずつ(太さ・行間・字間・サイズ・文字・位置)。カンプ: 機能名 Noto Medium 16px / 補足 Regular 8px */
  { key: 'vfLab1',    sel: '#vfLab1',       name: '図の機能名①（コネクタ・組ごと位置）', sec: 'vis', text: 0, font: 0 },
  { key: 'vfL1',      sel: '#vfL1',         name: '図の機能名① コネクタ',        sec: 'vis', text: 1 },
  { key: 'vfL1s',     sel: '#vfL1s',        name: '図の補足① 外部サービスをつなぐ',          sec: 'vis', text: 1 },
  { key: 'vfLab2',    sel: '#vfLab2',       name: '図の機能名②（認証ウィザード・組ごと位置）', sec: 'vis', text: 0, font: 0 },
  { key: 'vfL2',      sel: '#vfL2',         name: '図の機能名② 認証ウィザード',        sec: 'vis', text: 1 },
  { key: 'vfL2s',     sel: '#vfL2s',        name: '図の補足② 認証設定を支える',          sec: 'vis', text: 1 },
  { key: 'vfLab3',    sel: '#vfLab3',       name: '図の機能名③（SDK・組ごと位置）', sec: 'vis', text: 0, font: 0 },
  { key: 'vfL3',      sel: '#vfL3',         name: '図の機能名③ SDK',        sec: 'vis', text: 1 },
  { key: 'vfL3s',     sel: '#vfL3s',        name: '図の補足③ 開発環境に組み込む',          sec: 'vis', text: 1 },
  { key: 'vfLab4',    sel: '#vfLab4',       name: '図の機能名④（ワークフロー・組ごと位置）', sec: 'vis', text: 0, font: 0 },
  { key: 'vfL4',      sel: '#vfL4',         name: '図の機能名④ ワークフロー',        sec: 'vis', text: 1 },
  { key: 'vfL4s',     sel: '#vfL4s',        name: '図の補足④ 連携処理を組み立てる',          sec: 'vis', text: 1 },
  { key: 'vfLab5',    sel: '#vfLab5',       name: '図の機能名⑤（実行エンジン・組ごと位置）', sec: 'vis', text: 0, font: 0 },
  { key: 'vfL5',      sel: '#vfL5',         name: '図の機能名⑤ 実行エンジン',        sec: 'vis', text: 1 },
  { key: 'vfL5s',     sel: '#vfL5s',        name: '図の補足⑤ 処理を実行する',          sec: 'vis', text: 1 },
  { key: 'vfLogo',    sel: '#vfLogo',        name: '図のロゴ（位置だけ。大きさはビジョンタブ③）', sec: 'vis', text: 0, font: 0 },
  { key: 'p1tag',     sel: '#valP1 .vp-tag', name: 'Point 01 ラベル',                    sec: 'vis', text: 1 },
  { key: 'p1h',       sel: '#valP1 h3',      name: 'Point 01 見出し',                    sec: 'vis', text: 1 },
  { key: 'p1p',       sel: '#valP1 p',       name: 'Point 01 本文',                      sec: 'vis', text: 1 },
  { key: 'p2tag',     sel: '#valP2 .vp-tag', name: 'Point 02 ラベル',                    sec: 'vis', text: 1 },
  { key: 'p2h',       sel: '#valP2 h3',      name: 'Point 02 見出し',                    sec: 'vis', text: 1 },
  { key: 'p2p',       sel: '#valP2 p',       name: 'Point 02 本文',                      sec: 'vis', text: 1 },
  // --- 実績 ---
  { key: 'r2vTag',    sel: '.r2v-tag',   name: 'for SaaS / for AI（小ラベル）',              sec: 'res', text: 0, multi: 1, move: 0 },
  { key: 'r2vTagProd', sel: '.r2v-tag .r2v-prod', name: 'for SaaS / for AI（小ラベル）の Product', sec: 'res', text: 0, multi: 1, move: 0 },
  { key: 'r2vBig',    sel: '.r2v-big',   name: 'for SaaS / for AI（大きい英字）',            sec: 'res', text: 0, multi: 1, move: 0 },
  { key: 'r2vBigProd', sel: '.r2v-big-prod', name: 'for SaaS / for AI（大）の Product',       sec: 'res', text: 0, multi: 1, move: 0 },   /* 【2026-09-18】新規の文字は必ずここに登録(太さ/行間/字間がプルダウンで選べる) */
  { key: 'r2vH',      sel: '.r2v-h',     name: '価値の見出し（リアルタイムに〜／コンテキスト取得〜）', sec: 'res', text: 0, multi: 1, move: 0 },
  { key: 'r2vP',      sel: '.r2v-p',     name: '価値の本文',                                 sec: 'res', text: 0, multi: 1, move: 0 },
  { key: 'resHl1',    sel: '#resHl1',    name: '推進力の見出し 1行目（事業の推進力を、）',    sec: 'res', text: 1 },
  { key: 'resHl2',    sel: '#resHl2',    name: '推進力の見出し 2行目（Anyflowが支えます）',  sec: 'res', text: 0 },
  { key: 'statsLab',  sel: '.res2-stats .r2s b',    name: '数字のラベル（導入企業 など）',    sec: 'res', text: 0, multi: 1, move: 0 },
  { key: 'statsVal',  sel: '.res2-stats .r2s span', name: '数字（100+ など）',              sec: 'res', text: 0, multi: 1, move: 0 },
  { key: 'resStats',  sel: '#resStats',  name: '数字のかたまり（位置だけ）',                 sec: 'res', text: 0, font: 0 },
  { key: 'resVals',   sel: '#resVals',   name: '価値のかたまり（位置だけ）',                 sec: 'res', text: 0, font: 0 },
  /* 【2026-09-17 ヒデさん報告「編集でグラフィックが選べない/動かない」】図・モック・カード・フォームも位置移動の対象に(font:0=面のどこでもドラッグ) */
  { key: 'figSaas',   sel: '#valSaas',   name: 'for SaaS の図（位置だけ）',                  sec: 'res', text: 0, font: 0, rel: 1 },
  { key: 'figAi',     sel: '#valAi',     name: 'for AI の図（位置だけ）',                    sec: 'res', text: 0, font: 0, rel: 1 },
  // --- 開発者体験 ---
  { key: 'dcLabel',   sel: '.dc-label',  name: 'Strength 01 / 02',                          sec: 'dev', text: 0, multi: 1 },
  { key: 'dcOne',     sel: '.dc-one',    name: '見出し（自動生成で〜／開発環境〜）',          sec: 'dev', text: 0, multi: 1 },
  { key: 'dsWord',    sel: '.ds-word',   name: '見出しのスロット（CLI / SDK / API）',          sec: 'dev', text: 0, multi: 1, move: 0 },   /* 2026-09-18 コンプ: SF Pro Medium(500) 34px */
  { key: 'dlHead',    sel: '.dl-head b', name: 'リストの見出し（CLI / SDK / API）',           sec: 'dev', text: 0, multi: 1, move: 0 },
  { key: 'dlBody',    sel: '.dl-item p', name: 'リストの説明文',                              sec: 'dev', text: 0, multi: 1, move: 0 },
  { key: 'devMock1',  sel: '#devMock1',  name: 'Strength 01 のモック（位置だけ）',           sec: 'dev', text: 0, font: 0, rel: 1 },
  { key: 'devMock',   sel: '#devMock',   name: 'Strength 02 のモック（位置だけ）',           sec: 'dev', text: 0, font: 0, rel: 1 },
  // --- 導入事例 ---
  { key: 'caseEyebrow', sel: '#caseEyebrow', name: 'Use Case',                              sec: 'case', text: 1 },
  { key: 'caseTitle', sel: '#caseTitle',  name: '導入事例（見出し）',                        sec: 'case', text: 1 },
  { key: 'cgQuote',   sel: '.cg-quote',   name: 'カードの一言',                              sec: 'case', text: 0, multi: 1, move: 0 },
  { key: 'cgTag',     sel: '.cg-tag',     name: 'カードの業種タグ',                          sec: 'case', text: 0, multi: 1, move: 0 },
  { key: 'cgCompany', sel: '.cg-company', name: 'カードの会社名',                            sec: 'case', text: 0, multi: 1, move: 0 },
  { key: 'caseGrid',  sel: '#caseGrid',   name: '事例カード4枚（位置だけ）',                 sec: 'case', text: 0, font: 0, rel: 1 },
  // --- お問い合わせ ---
  { key: 'cvEyebrow', sel: '.cv-eyebrow', name: 'Contact',                                  sec: 'cv',  text: 1 },
  { key: 'cvHead',    sel: '.cv-head',    name: 'お問い合わせ（見出し）',                    sec: 'cv',  text: 1 },
  { key: 'cvSub',     sel: '.cv-sub',     name: 'お問い合わせの本文',                        sec: 'cv',  text: 0 },
  { key: 'cvfLab',    sel: '.cvf-lab',    name: 'フォームの項目名',                          sec: 'cv',  text: 0, multi: 1, move: 0 },
  { key: 'cvfIn',     sel: '.cvf-in',     name: 'フォームの入力欄',                          sec: 'cv',  text: 0, multi: 1, move: 0 },
  { key: 'cvfFine',   sel: '.cvf-fine',   name: 'メルマガの注記',                            sec: 'cv',  text: 1 },
  { key: 'cvfSubmit', sel: '.cvf-submit', name: '送信ボタン',                                sec: 'cv',  text: 1 },
  { key: 'cvInner',   sel: '.cv-inner',   name: 'お問い合わせ全体（位置だけ）',              sec: 'cv',  text: 0, font: 0 },
  { key: 'cvForm',    sel: '.cv-form',    name: 'お問い合わせフォーム（位置だけ）',          sec: 'cv',  text: 0, font: 0, rel: 1 },
  // --- フッター(お問い合わせタブに出す) ---
  { key: 'footNav',   sel: '.cv-foot-nav a', name: 'フッターのナビ',                         sec: 'cv',  text: 0, multi: 1, move: 0 },
  { key: 'footAddr',  sel: '.cv-foot-addr',  name: 'フッターの住所',                         sec: 'cv',  text: 1 },
  { key: 'footCopy',  sel: '.cv-foot-copy',  name: 'コピーライト',                           sec: 'cv',  text: 1 },
  // --- ハンバーガーメニュー(🍔タブに出す) 2026-09-18 ---
  { key: 'drwNav',    sel: '.hdr-drawer-nav a:not(.hdr-drawer-cta)', name: 'メニューの項目（ビジョン など）', sec: 'menu', text: 0, multi: 1, move: 0 },
  { key: 'drwNum',    sel: '.hdr-drawer-nav .hdr-drawer-num', name: 'メニューの番号（01〜04）',           sec: 'menu', text: 0, multi: 1, move: 0 },
  { key: 'drwCta',    sel: '.hdr-drawer-cta', name: 'メニューのお問い合わせボタン',              sec: 'menu', text: 0, move: 0 },
];

function slider(label, min, max, step, get, set, fmt, hint, opts) {
  opts = opts || {};
  /* 【2026-09-20 ヒデさん依頼・PC/SP独立】mbKey を持つつまみは、スマホモード中は params.mb[mbKey](スマホ専用の値)だけを読み書きする。
     PCの値(_rawSet の書き込み先)は触らない＝スマホでいじってもPCに出ない。スマホ実機(isMobile)は起動時に applyMbToParams で
     params.mb を本体 params の該当パスへ流し込むので、SPだけがスマホ用の値で描画される。青印/リセットも mbKey から自動で用意。 */
  if (opts.mbKey) {
    const _mbk = opts.mbKey, _g = get, _s = set;
    const _pon = () => { try { return document.documentElement.classList.contains('phone-mode'); } catch (e) { return false; } };
    get = () => (_pon() && params.mb && params.mb[_mbk] != null) ? params.mb[_mbk] : ((_pon() && opts.mbDefault != null) ? opts.mbDefault : _g());   /* 【2026-09-20 #3】opts.mbDefault があれば、スマホモードで上書き未設定の時は SP 既定値を表示(フォントサイズ等・SP既定≠PC既定の項目用) */
    set = (v) => { if (_pon()) { if (!params.mb) params.mb = {}; params.mb[_mbk] = v; } else { _s(v); } };
    if (!opts.mbActive) opts.mbActive = () => !!(params.mb && params.mb[_mbk] != null);
    if (!opts.mbClear) opts.mbClear = () => { if (params.mb) delete params.mb[_mbk]; };
  }
  /* ⚠️ 既定値が左端だと、そこから下げられない。既定がツマミの真ん中に来るよう上限を取り直す
     (2026-08-15 指定)。既定が最小と同じもの(0など)は中央に置けないのでそのまま。

     ⚠️【2026-08-19 ヒデさん指摘】この自動調整は「もっと右へ伸ばしたい」項目では邪魔になる。
        例: 見せる長さ は 1〜12 のつもりで書いていたのに、既定3を中央に置くために
            上限が 5 まで縮められていて、指定した 12 がまったく効いていなかった。
        opts.fixedMax = true を渡した項目は、書いた上限をそのまま使う。 */
  /* ===== つまみの範囲の決め方 (2026-08-27 ヒデさん指定で全面的に作り直し) =====
     「いまの値を真ん中に置く。上にも下にも、変化がちゃんと出るだけの幅を持たせる」

     ⚠️ これまでの作り
        ・既定値を中央に置くために【上限を縮めて】いた → 書いた上限まで動かせない事故
          (例: 見せる長さ 1〜12 のつもりが実際は 5 まで) → fixedMax で個別に逃がしていた
        ・端に張り付いた時だけ少し広げる後付けだったので、中央には来なかった

     ⚠️ 新しい作り (fixedMax はもう不要。付いていても同じ結果になる)
        1. いまの値を中央に置く。半幅 = いまの値と【床】の差 (＝左右が同じだけ動かせる)
        2. 床(それ以上下げられない値)は守る:
             書いた下限が 0 → 0 / 正の数 → その半分 / 負を含む → 制限なし
           床に張り付いている値(0本・0秒など)は、原理的に中央には置けない。
           そのぶん上へ幅を取って、少し動かすだけで変化が出るようにする
        3. 端(8%未満/92%超)まで動かして手を離したら、その値を中央に取り直す
           → どんな値にも届く。上限を縮めても行き止まりにならない(昔の事故の再発防止) */
  const dMin0 = min, dMax0 = max;
  function rangeFor(cur) {
    if (typeof cur !== 'number' || !isFinite(cur)) cur = dMin0;
    /* 【2026-08-28 ヒデさん指定】0 が左端に張り付く項目は、左側にマイナスを置いて 0 を中央にする。
       マイナスに意味がある項目(逆回り・逆向きのゆらぎ・逆方向のずらし)だけ signed を付けている。 */
    const signed = !!(opts && opts.signed);
    const floor = signed ? -Infinity
      : (dMin0 < 0 ? -Infinity : (dMin0 > 0 ? Math.min(dMin0 * 0.5, Math.abs(cur) * 0.4) : 0));
    /* 【2026-08-27 ヒデさん指定・精査】いまの値を真ん中に置くことを最優先にする。
       ・下へ動かせる余地(いまの値 − 床)がそのまま半幅。これで左右が同じだけ動かせる＝中央
       ・余地が刻み2つぶんも無い時(＝値が床に張り付いている)は中央に置けないので、
         代わりに「少し動かすだけで変化が出る」幅を取る */
    const room = signed ? Math.max(Math.abs(cur), (dMax0 - dMin0) * 0.5)
               : (isFinite(floor) ? (cur - floor) : (dMax0 - dMin0) * 0.5);
    const half = (room >= step * 2) ? room
               : Math.max(step * 4, (dMax0 - dMin0) * 0.15);
    let lo = cur - half, hi = cur + half;
    if (lo < floor) { lo = floor; hi = lo + half * 2; }
    const q = v => Math.round(v / step) * step;
    lo = q(lo); hi = q(hi);
    if (hi - lo < step * 4) hi = lo + step * 4;
    if (cur < lo) lo = q(cur - step);
    if (cur > hi) hi = q(cur + step);
    return { lo, hi };
  }
  { const r = rangeFor(get()); min = r.lo; max = r.hi; }
  const row = document.createElement('div');
  row.className = 'row';
  const lab = document.createElement('label');
  lab.textContent = label;
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min; input.max = max; input.step = step;
  input.value = get();
  const val = document.createElement('span');
  val.className = 'val';
  const f = fmt || (v => v);
  val.textContent = f(get());
  const isLive = liveEdit;   /* 作った時点の設定を覚えておく (押した時ではなく) */
  input.addEventListener('input', () => {
    set(parseFloat(input.value));
    val.textContent = f(parseFloat(input.value));
    markDirty();
    applyEdit(isLive);       /* 見た目だけの項目は即反映 / それ以外は手が止まってから流し直す */
    /* 【2026-09-20 ヒデさん依頼】スマホモード中は、触った瞬間にSP上書きのブルー印を付け直す(STUDIO風)。触れば元と同じでも光る */
    try { row.classList.toggle('mb-override', !!_mbOn()); } catch (e) {}
  });
  input.addEventListener('change', () => {
    applyEdit(isLive, true);
    /* 端に達したまま離したら、その値を中央にして範囲を取り直す(行き止まりを作らない) */
    const v = parseFloat(input.value), lo = +input.min, hi = +input.max;
    const k = (hi - lo) ? (v - lo) / (hi - lo) : 0.5;
    if (k < 0.1 || k > 0.9) {
      const r = rangeFor(v);
      /* 端まで動かしたのに範囲が狭くなるのは困る。いまの幅より狭くしない */
      const span = Math.max(r.hi - r.lo, hi - lo);
      const c = Math.min(Math.max(v, r.lo), r.hi);
      let nlo = c - span / 2, nhi = c + span / 2;
      if (nlo < r.lo) { nlo = r.lo; nhi = nlo + span; }
      input.min = nlo; input.max = nhi; input.value = v;
    }
  });
  const _mbOn = () => { try { return (opts && typeof opts.mbActive === 'function') && (typeof _vfPhoneOn === 'function') && _vfPhoneOn() && opts.mbActive(); } catch (e) { return false; } };
  row._sync = () => {
    /* 外から値が変わった時(プリセット・案の切替・直接編集)も、範囲から外れないようにする */
    const v = get();
    if (v < +input.min || v > +input.max) { const r = rangeFor(v); input.min = r.lo; input.max = r.hi; }
    input.value = v; val.textContent = f(v);
    /* 【2026-09-20 ヒデさん依頼・#2】スマホモード中に SP 専用の上書きがある項目はブルーで印(row.mb-override) */
    try { row.classList.toggle('mb-override', !!_mbOn()); } catch (e) {}
  };
  const _rst = mkReset(get, set, () => row._sync(), isLive);
  /* 【2026-09-20 ヒデさん依頼・リセット統一】スマホモード中は必ず「SP専用の上書きを解除(PC値に戻す)」＝base(PC値)は触らない。
     通常モードは mkReset が「このセッションを開いた時の値」に戻す。 */
  if (opts && typeof opts.mbClear === 'function') { const _oc = _rst.onclick; _rst.onclick = (e) => { if (typeof _vfPhoneOn === 'function' && _vfPhoneOn()) { if (e) e.stopPropagation(); opts.mbClear(); markDirty(); row._sync(); } else if (_oc) _oc(e); }; }
  row.append(lab, input, val, _rst);
  /* セクション単位のリセット対象に登録 */
  if (subItems) subItems.push({ reset: () => {
    if (typeof _vfPhoneOn === 'function' && _vfPhoneOn()) { if (opts.mbClear) opts.mbClear(); row._sync(); }   /* スマホモード=SP上書きだけ解除 */
    else { let t = sessionOf(get); if (t == null) t = defaultOf(get); if (t != null) { set(typeof t === 'object' ? structuredClone(t) : t); row._sync(); } }   /* 通常=開いた時の値へ */
  } });
  mount.appendChild(row);
  if (hint) {
    lab.title = hint;          /* 出さない代わりに、項目名にマウスを乗せれば読める */
    const h = document.createElement('div');
    h.className = 'row-hint';
    h.textContent = hint;
    mount.appendChild(h);
  }
  return row;
}

/* 【2026-09-01 ヒデさん指定】色を選ぶ行(カラーピッカー)。sliderと同じ見た目・リセット対応 */
function colorRow(label, get, set, hint) {
  const row = document.createElement('div');
  row.className = 'row';
  const lab = document.createElement('label');
  lab.textContent = label;
  const input = document.createElement('input');
  input.type = 'color';
  input.style.cssText = 'width:44px;height:24px;padding:0;border:1px solid #ddd;border-radius:6px;background:none;cursor:pointer;';
  input.value = get();
  const val = document.createElement('span');
  val.className = 'val';
  val.textContent = get();
  const isLive = liveEdit;
  input.addEventListener('input', () => {
    set(input.value);
    val.textContent = input.value;
    markDirty();
    applyEdit(isLive);
  });
  row._sync = () => { input.value = get(); val.textContent = get(); };
  row.append(lab, input, val, mkReset(get, set, () => row._sync(), isLive));
  if (subItems) subItems.push({ reset: () => { const d = defaultOf(get); if (d != null) { set(d); row._sync(); } } });
  mount.appendChild(row);
  if (hint) {
    lab.title = hint;
    const h = document.createElement('div');
    h.className = 'row-hint';
    h.textContent = hint;
    mount.appendChild(h);
  }
  return row;
}


const rows = [];
/* ドラッグで params が変わった時に、開いているパネルの表示も追いつかせる */
function syncPanelRows() {
  for (const r of rows) { if (r && r._sync) r._sync(); }
  body.querySelectorAll('.row').forEach(r => { if (r._sync) r._sync(); });
  body.querySelectorAll('.txt-row').forEach(r => { if (r._sync) r._sync(); });   /* 【2026-09-21 Y11】フォント行も再sync(スマホモードでSP実サイズを表示し直す) */
}

/* ===== 【2026-09-15 ヒデさん依頼】グラデーション編集ギズモ(Figma風の棒＋両端ハンドル) =====
   「グラデーションを棒で編集」で編集モードに入ると、お問い合わせのグラデの上に棒が出る。
   両端(青い四角)をドラッグ=角度と広がり、棒の途中をドラッグ=位置(中心)を動かす。
   内部は params.cv の gcx/gcy(中心 0..1・画面と同じ向き) / gAng(角度・度) / gr(広がり=棒の長さ) を書き換える。
   実測(2026-09-15): gcx↑で右へ・gcy↑で下へ・角度は画面(y下向き)の atan2 と一致・gr=棒の長さ÷画面幅。 */
const cvGizmo = (function () {
  let wrap = null, svg = null, line = null, hit = null, hA = null, hB = null, nA = null, nB = null;
  let editing = false;
  const sec = () => document.getElementById('conversion');
  const cvEl = () => document.getElementById('cvCanvas');
  function build() {
    if (wrap) return;
    wrap = document.createElement('div'); wrap.className = 'cv-gizmo'; wrap.hidden = true;
    wrap.innerHTML =
      '<svg><line class="cvg-line"/><line class="cvg-hit"/></svg>' +
      '<span class="cvg-node cvg-nodeA"></span><span class="cvg-node cvg-nodeB"></span>' +
      '<button class="cvg-h cvg-a" type="button" aria-label="グラデの始点"></button>' +
      '<button class="cvg-h cvg-b" type="button" aria-label="グラデの終点"></button>' +
      '<div class="cvg-bar"><span>棒をドラッグして角度・位置・広がりを調整</span>' +
      '<button class="cvg-reset" type="button">リセット</button>' +
      '<button class="cvg-done" type="button">完了</button></div>';
    sec().appendChild(wrap);
    svg = wrap.querySelector('svg'); line = wrap.querySelector('.cvg-line'); hit = wrap.querySelector('.cvg-hit');
    hA = wrap.querySelector('.cvg-a'); hB = wrap.querySelector('.cvg-b');
    nA = wrap.querySelector('.cvg-nodeA'); nB = wrap.querySelector('.cvg-nodeB');
    wrap.querySelector('.cvg-done').onclick = () => toggle(false);
    wrap.querySelector('.cvg-reset').onclick = () => { const c = params.cv; c.gcx = 0.60; c.gcy = 0.00; c.gAng = 0; c.gr = 0.9; apply(); placeFromParams(); };
    dragHandle(hA, 'a'); dragHandle(hB, 'b'); dragHandle(hit, 'line');
  }
  function fit() {   /* ギズモの箱を canvas にぴったり重ねる(#conversion 基準の px) */
    const c = cvEl(), sr = sec(); if (!c || !sr) return;
    const cr = c.getBoundingClientRect(), srr = sr.getBoundingClientRect();
    wrap.style.left = (cr.left - srr.left) + 'px'; wrap.style.top = (cr.top - srr.top) + 'px';
    wrap.style.width = cr.width + 'px'; wrap.style.height = cr.height + 'px';
  }
  function dims() { const c = cvEl().getBoundingClientRect(); return { W: c.width, H: c.height }; }
  /* params → 棒の両端(px, ギズモ箱内・y下向き) */
  function endpoints() {
    const { W, H } = dims(); const c = params.cv;
    const cx = (c.gcx != null ? c.gcx : 0.6) * W, cy = (c.gcy != null ? c.gcy : 0) * H;
    const ang = (c.gAng || 0) * Math.PI / 180, L = Math.max(0.2, c.gr != null ? c.gr : 0.9) * W;
    const dx = Math.cos(ang) * L / 2, dy = Math.sin(ang) * L / 2;
    return { A: { x: cx - dx, y: cy - dy }, B: { x: cx + dx, y: cy + dy } };
  }
  let A = { x: 0, y: 0 }, B = { x: 0, y: 0 };
  function draw() {
    line.setAttribute('x1', A.x); line.setAttribute('y1', A.y); line.setAttribute('x2', B.x); line.setAttribute('y2', B.y);
    hit.setAttribute('x1', A.x); hit.setAttribute('y1', A.y); hit.setAttribute('x2', B.x); hit.setAttribute('y2', B.y);
    hA.style.left = A.x + 'px'; hA.style.top = A.y + 'px'; hB.style.left = B.x + 'px'; hB.style.top = B.y + 'px';
    nA.style.left = A.x + 'px'; nA.style.top = A.y + 'px'; nB.style.left = B.x + 'px'; nB.style.top = B.y + 'px';
  }
  function placeFromParams() {
    /* 【2026-09-16 ヒデさん指摘】開いた時は「表示されているグラデそのまま」を映す。
       中心が画面外でも、既定の棒に置き換えない(位置が変わって見えるため)。棒は本当の中心・角度・広がりに一致する。 */
    fit(); const e = endpoints(); A = e.A; B = e.B; draw();
  }
  /* 棒の両端 → params(中心・角度・広がり) */
  function paramsFromEnds() {
    const { W, H } = dims(); const c = params.cv;
    const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2;
    c.gcx = Math.max(0, Math.min(1, cx / W)); c.gcy = Math.max(0, Math.min(1, cy / H));
    const vx = B.x - A.x, vy = B.y - A.y, L = Math.hypot(vx, vy);
    c.gAng = ((Math.atan2(vy, vx) * 180 / Math.PI) % 360 + 360) % 360;
    c.gr = Math.max(0.2, Math.min(2.5, L / W));
  }
  function apply(persist) { if (typeof applyCvStyle === 'function') applyCvStyle(); if (typeof renderFrame === 'function') renderFrame();
    if (typeof syncPanelRows === 'function') syncPanelRows(); if (persist && typeof markDirty === 'function') markDirty(); }
  function dragHandle(el, which) {
    el.addEventListener('pointerdown', ev => {
      ev.preventDefault(); el.setPointerCapture && el.setPointerCapture(ev.pointerId);
      const r = wrap.getBoundingClientRect();
      const start = { mx: ev.clientX, my: ev.clientY, A: { ...A }, B: { ...B } };
      const move = e => {
        const px = e.clientX - r.left, py = e.clientY - r.top;
        if (which === 'a') A = { x: px, y: py };
        else if (which === 'b') B = { x: px, y: py };
        else { const dx = e.clientX - start.mx, dy = e.clientY - start.my;
          A = { x: start.A.x + dx, y: start.A.y + dy }; B = { x: start.B.x + dx, y: start.B.y + dy }; }
        draw(); paramsFromEnds(); apply(false);
      };
      const up = e => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); apply(true); };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
    });
  }
  function toggle(on) {
    build(); editing = (on == null) ? !editing : !!on;
    wrap.hidden = !editing;
    if (editing) { placeFromParams(); window.addEventListener('resize', placeFromParams); window.addEventListener('scroll', fit, true);
      document.addEventListener('keydown', onKey); }
    else { window.removeEventListener('resize', placeFromParams); window.removeEventListener('scroll', fit, true); document.removeEventListener('keydown', onKey); }
    const btn = document.getElementById('cvGizmoBtn'); if (btn) { btn.textContent = editing ? '✓ 編集を終える' : '🎯 グラデーションを棒で編集'; btn.classList.toggle('on', editing); }
    return editing;
  }
  function onKey(e) { if (e.key === 'Escape') toggle(false); }
  return { toggle, isEditing: () => editing, refresh: () => { if (editing) placeFromParams(); } };
})();

let mount = null;   // slider() などの追加先 (現在の小カテゴリの親)
let syncPresetPills = null;   // プリセットの点灯を今の値で塗り直す(fillPresetRow の中で差し替え)

/* 大カテゴリ (開閉できる箱) */
/* ⚠️ 惑星やライトのピルを押すと buildPanel() でパネルを作り直すため、
   何もしないと【開いていたカテゴリが閉じ、見ていた位置も先頭に飛ぶ】。
   開閉状態はここで覚えておき、スクロール位置は buildPanel() の前後で退避・復元する */
const catOpen = {};
function category(title, open) {
  const isOpen = (catOpen[title] !== undefined) ? catOpen[title] : open;
  catOpen[title] = isOpen;
  const cat = document.createElement('div');
  cat.className = 'cat' + (isOpen ? '' : ' closed');
  const head = document.createElement('div');
  head.className = 'cat-head';
  head.innerHTML = `<span>${title}</span><span class="cat-chev">▾</span>`;
  const content = document.createElement('div');
  content.className = 'cat-body';
  head.onclick = () => {
    const nowClosed = cat.classList.toggle('closed');
    catOpen[title] = !nowClosed;
    /* 【2026-08-27 ヒデさん指定】カテゴリを開いた時は、中の小見出しも全部開いた状態にする */
    if (!nowClosed) {
      content.querySelectorAll('.grp').forEach(g => {
        g.classList.remove('closed');
        const t = g.querySelector('.grp-title span');
        if (t) subOpen[t.textContent.trim()] = true;
      });
    }
  };
  cat.append(head, content);
  body.appendChild(cat);
  return content;
}

/* 小カテゴリ (見出し行) — 以降の slider は同じカテゴリに追加される */
/* 小見出し。deep=true で一段内側の見出しになる */
/* 小見出しもアコーディオンにする (2026-08-26 ヒデさん指定・既定は閉じる)。
   開閉状態は見出しテキストをキーに覚え、パネルを作り直しても保つ */
const subOpen = {};
/* いま組み立て中のセクションに属する項目(リセット用)。sub() のたびに新しくする */
let subItems = null;
let subDefaultOpen = false;   /* true の間に作る小見出しは、既定で開いた状態にする */
/* 【2026-09-20 ヒデさん依頼・パネル整理】小見出しを「グループ」に分類し、タブが切り替わっても
   いつも同じ順(バリエーション→基本→フォント→カラー→テクスチャ→アニメーション)で並ぶようにする。
   分類は見出しの言葉から自動判定。合わない所は sub(..., { grp:'basic' }) のように明示で上書きできる。 */
/* 【2026-09-20 大改修・ヒデさん依頼】新5カテゴリに統一: バリエーション→基本→フォント→エフェクト＆テクスチャ→アニメーション→その他。
   旧 color/texture は fxtex(エフェクト＆テクスチャ)に統合。ルールは settings/docs/anyflow/ANYFLOW-PANEL-STRUCTURE.md。 */
const GRP_ORDER = { variation: 0, basic: 1, font: 2, fxtex: 3, anim: 4, other: 5 };
const GRP_LABEL = { variation: 'バリエーション', basic: '基本', font: 'フォント', fxtex: 'エフェクト＆テクスチャ', anim: 'アニメーション', other: 'その他' };
/* 【2026-09-21 ヒデさん依頼】1つのタブに複数のバリエーションセクション(例: 実績＝演出＋ピクトグラム案)がある時、
   セクションごとに 基本/フォント/エフェクト＆テクスチャ/アニメーション を入れ子で分ける。
   パネル構築中に panelVarsec('id','見出し') を呼ぶと、それ以降に作る .grp に dataset.varsec を刻む。
   applyPanelGroupOrder が varsec ごとに束ね直す。null で解除(タブ共通=従来のタブ単位)。 */
let PANEL_VARSEC = null;
function panelVarsec(id, label) { PANEL_VARSEC = id ? { id: String(id), label: String(label || id) } : null; }
let _grpSeq = 0;   /* 同じグループ内は元の順を保つための連番(安定ソート) */
function grpFromLabel(k) {
  if (/🔤|文字（太/.test(k)) return 'font';
  if (/バリエーション|演出の案|スタイル|案.*：/.test(k)) return 'variation';
  if (/配色|カラー|色の移ろい|ディザ|ガラス|立体感|網目|質感|テクスチャ|マテリアル|エフェクト/.test(k)) return 'fxtex';
  if (/タイミング|アニメ|演出|順番|登場|揺らぎ|つなぎ|一旦止まる|出入り|入場|切替|ディレイ|出てくる|回って/.test(k)) return 'anim';
  return 'basic';
}
/* 【2026-09-20 大改修・ヒデさん依頼】各タブ(.cat-body)の中を、カテゴリ順(バリエ→基本→フォント→エフェクト＆テクスチャ→アニメ→その他)の
   「見出し付きアコーディオン節(.cat-section)」に束ねる。各節の中はオブジェクト小見出し(.grp)。既定は全開き。開閉はタブ×カテゴリで記憶。
   ※ buildPanel は毎回 body を作り直すので、この関数は毎回まっさらな .grp を束ね直す。 */
const catSecOpen = {};
function applyPanelGroupOrder() {
  try {
    /* カテゴリ節(基本/フォント/エフェクト/アニメーション/バリエーション)を container に組む共通処理。
       nested=true(バリエーションセクションの中)の時は、選択UI(variation)は節を作らず見出し直下にそのまま置き、
       残り4カテゴリは入れ子見出し(H2)の開閉節にする。 */
    const buildCats = (container, list, keyPrefix, nested) => {
      const keyed = list.map((el, i) => {
        const cat = (GRP_ORDER[el.dataset.grp] != null) ? el.dataset.grp : 'basic';
        return { el, cat, o: GRP_ORDER[cat], i: +(el.dataset.seq || i) };
      });
      keyed.sort((a, b) => (a.o - b.o) || (a.i - b.i));
      let curCat = null, secBody = null;
      keyed.forEach(k => {
        if (nested && k.cat === 'variation') { container.appendChild(k.el); curCat = null; secBody = null; return; }   /* セクション見出し直下に選択UIをそのまま */
        if (k.cat !== curCat) {
          curCat = k.cat;
          const sec = document.createElement('div');
          sec.className = 'cat-section cs-' + curCat + (curCat === 'variation' ? ' cs-variation' : '') + (nested ? ' cs-nested' : '');
          const openKey = keyPrefix + '::' + curCat;
          const open = (catSecOpen[openKey] === undefined) ? true : catSecOpen[openKey];   /* 既定は全開き */
          catSecOpen[openKey] = open;
          if (!open) sec.classList.add('closed');
          const head = document.createElement('div');
          head.className = 'cat-section-head';
          const isVar = (curCat === 'variation');   /* 【2026-09-20】バリエーションは開閉しない・▾なし */
          head.innerHTML = '<span>' + (GRP_LABEL[curCat] || curCat) + '</span>' + (isVar ? '' : '<span class="cs-chev">▾</span>');
          if (!isVar) head.onclick = () => { catSecOpen[openKey] = !sec.classList.toggle('closed'); };
          secBody = document.createElement('div');
          secBody.className = 'cat-section-body';
          sec.append(head, secBody);
          container.appendChild(sec);
        }
        secBody.appendChild(k.el);
      });
    };
    document.querySelectorAll('.cat-body').forEach(bodyEl => {
      const catEl = bodyEl.closest('.cat');
      const tabTitle = (((catEl && catEl.querySelector('.cat-head > span')) || {}).textContent || '').trim();
      const notes = Array.from(bodyEl.children).filter(el => el.classList && el.classList.contains('cat-note'));
      const grps = Array.from(bodyEl.children).filter(el => el.classList && el.classList.contains('grp'));
      if (!grps.length) return;
      const hasVarsec = grps.some(el => el.dataset.varsec);
      if (!hasVarsec) {
        buildCats(bodyEl, grps, tabTitle, false);   /* 従来: タブ単位で1組の4カテゴリ */
      } else {
        /* 【2026-09-21 ヒデさん依頼】varsec(演出/ピクトグラム等)ごとに束ね直し、各セクションの中に4カテゴリを入れ子で置く */
        const order = [], byVs = {};
        grps.forEach(el => { const vs = el.dataset.varsec || ''; if (!(vs in byVs)) { byVs[vs] = []; order.push(vs); } byVs[vs].push(el); });
        order.forEach(vs => {
          if (vs === '') { buildCats(bodyEl, byVs[vs], tabTitle, false); return; }   /* varsec無し=タブ共通は従来通り上に */
          const label = (byVs[vs][0] && byVs[vs][0].dataset.varseclabel) || vs;
          const secWrap = document.createElement('div');
          secWrap.className = 'cat-section cs-variation vs-section';
          const head = document.createElement('div');
          head.className = 'cat-section-head';
          head.innerHTML = '<span>' + label + '</span>';   /* バリエーションセクション見出し(H1・▾なし) */
          const secBody = document.createElement('div');
          secBody.className = 'cat-section-body vs-body';
          secWrap.append(head, secBody);
          bodyEl.appendChild(secWrap);
          buildCats(secBody, byVs[vs], tabTitle + '::' + vs, true);   /* この中に4カテゴリを入れ子で */
        });
      }
      /* タブの説明文(cat-note)は最上部に残す */
      for (let n = notes.length - 1; n >= 0; n--) bodyEl.insertBefore(notes[n], bodyEl.firstChild);
    });
  } catch (e) {}
}
function sub(target, html, deep, opts) {
  const key = String(html).replace(/<[^>]*>/g, '').trim();
  const fixed = !!(opts && opts.fixed);   /* たためない＝常に開いたコンパクト表示 */
  /* 既定はたたむ。ただし「グラフィック」とその中の小見出しは開いた状態で始める
     (2026-08-27 ヒデさん指定) */
  const GRAPHIC_OPEN = ['グラフィック', '',
                        '軌道（輪）', 'ドット（粒）', '惑星',
                        '表示', '表示・大きさ', '模様',
                        'この案の調整（輪が縮んで吸収）', 'この案の調整（粒が渦で吸収）',
                        'この案の調整（粒の渦）', 'この案の調整（網でつながる）',
                        'この案の調整（点が並ぶ軌道）', 'この案の調整（線で行き来）',
                        'この案の調整（ジャイロ回転）', '動き（この案）'];
  /* 【2026-08-27 ヒデさん指定】グラフィックのセクションは、たためる所も既定で開いておく */
  /* 【2026-09-20 ヒデさん依頼】オブジェクト小見出し(.grp)は開閉なし＝常に全開き。開閉できるのはカテゴリ節(.cat-section)だけ */
  const open = true;
  const bare = !!(opts && opts.bare);   /* 見出しそのものを出さない(中身だけ並べる) */
  const g = document.createElement('div');
  g.className = (deep ? 'grp sub2' : 'grp') + (open ? '' : ' closed') + (fixed ? ' fixed' : '') + (bare ? ' bare' : '');
  g.dataset.grp = String((opts && opts.grp) || grpFromLabel(key));   /* 【2026-09-20】並べ替え用のグループ印 */
  g.dataset.seq = String(_grpSeq++);
  if (PANEL_VARSEC) { g.dataset.varsec = PANEL_VARSEC.id; g.dataset.varseclabel = PANEL_VARSEC.label; }   /* 【2026-09-21】どのバリエーションセクションに属すか(実績の演出/ピクトグラム等) */
  const title = document.createElement('div');
  title.className = 'grp-title';
  const lab = document.createElement('span');
  lab.innerHTML = html;
  const chev = document.createElement('span');
  chev.className = 'grp-chev';
  chev.textContent = '▾';
  /* 【2026-08-26 ヒデさん指定】セクションごとに「リセット」と「保存」を置く */
  const acts = document.createElement('div');
  acts.className = 'grp-acts';
  const items = [];
  const rs = document.createElement('button');
  rs.className = 'gbtn'; rs.type = 'button'; rs.textContent = '↺';
  rs.title = 'このまとまりを、このセッションを開いた時の値に戻す（スマホモード中はスマホ用の上書きを解除）';
  rs.onclick = (e) => {
    e.stopPropagation();
    for (const it of items) { if (it.reset) it.reset(); }
    markDirty(); renderFrame();
    if (typeof syncPanelRows === 'function') syncPanelRows();
    rs.classList.add('done'); rs.textContent = '✓ 戻しました';
    setTimeout(() => { rs.classList.remove('done'); rs.textContent = '↺'; }, 1200);
  };
  /* 【2026-08-28 ヒデさん指定】各まとまりの 💾(保存) は削除。
     グラフィックはプリセットで、それ以外は下の「これをデフォルトに設定」で残せるため。 */
  acts.append(rs);
  title.append(lab, acts, chev);   /* [タイトル][リセット・保存][開閉] の順 */
  /* 【2026-08-27 ヒデさん指定】戻す値を持たないセクション(プリセットなど)にはボタンを出さない。
     組み立てが終わってから項目の有無で判断する */
  setTimeout(() => { if (!items.length) acts.remove(); }, 0);
  const inner = document.createElement('div');
  inner.className = 'grp-body';
  /* 【2026-09-20 ヒデさん依頼】小見出しは開閉しない: ▾を消し、タイトルは非クリックに */
  chev.style.display = 'none'; title.style.cursor = 'default';
  if (bare) title.style.display = 'none';
  g.append(title, inner);
  target.appendChild(g);
  mount = inner;      /* 以降の slider / note はこの中に入る = たためる */
  subItems = items;   /* 以降の項目は、このセクションのリセット対象になる */
}
/* グループのすぐ下に置く注釈 */
/* ⚠️ mount は sub() が呼ばれて初めて決まる。sub() より前に note() を呼ぶと
   mount が null で落ちる（2026-08-19 に実際に踏んだ）。保険で body に逃がす */
function note(text) {
  const d = document.createElement('div');
  d.className = 'grp-note';
  d.textContent = text;
  (mount || body).appendChild(d);
  return d;
}
/* 選んだ内容で文言が変わる説明。パネルを作り直さずに文字だけ差し替えるための版。
   (2026-08-27 ヒデさん指定「リロードは一切挟まない」)
   高さを固定枠にしてあるので、文言が変わっても下の行は動かない。 */
function noteLive(getText, minH) {
  const d = note(getText());
  d.style.minHeight = minH || '2.6em';
  const sync = () => { d.textContent = getText(); };
  if (rows) rows.push({ _sync: sync });
  return sync;
}
/* カテゴリを開いてすぐ、小見出しより前に置く「このカテゴリは何か」の説明 */
function catNote(target, text) {
  const d = document.createElement('div');
  d.className = 'grp-note cat-note';
  d.textContent = text;
  target.appendChild(d);
}

/* 方向切替の2択ボタン行 */
/* 【2026-09-15】色のつまみ(カラーピッカー＋16進)。slider と同じ行の見た目で、パネルの同期(rows._sync)にも乗る */
function colorRow(label, get, set, tip) {
  const norm = v => { const m = /^#?([0-9a-f]{6})$/i.exec(String(v || '').trim()); return m ? ('#' + m[1].toLowerCase()) : null; };
  const row = document.createElement('div'); row.className = 'row';
  const lab = document.createElement('label'); lab.textContent = label; if (tip) lab.title = tip;
  const inp = document.createElement('input'); inp.type = 'color'; inp.value = norm(get()) || '#000000';
  const hex = document.createElement('input'); hex.type = 'text'; hex.className = 'hexin'; hex.value = inp.value; hex.maxLength = 7; hex.spellcheck = false;
  inp.oninput = () => { hex.value = inp.value; set(inp.value); markDirty(); renderFrame(); };
  hex.onchange = () => { const v = norm(hex.value); if (v) { inp.value = v; set(v); markDirty(); renderFrame(); } else hex.value = inp.value; };
  row.append(lab, inp, hex);
  const sync = () => { const v = norm(get()); if (v) { inp.value = v; hex.value = v; } };
  row._sync = sync; if (rows) rows.push({ _sync: sync });
  (mount || body).appendChild(row);
  return row;
}
function segRow(label, opts, getDir, setDir) {
  const row = document.createElement('div');
  row.className = 'row seg-row';
  row.innerHTML = `<label>${label}</label>`;
  const seg = document.createElement('div');
  seg.className = 'seg';
  const isLive = liveEdit;
  const bs = opts.map(([text, value]) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.onclick = () => { setDir(value); sync(); applyEdit(isLive, true); };
    seg.appendChild(b);
    return [b, value];
  });
  function sync() { bs.forEach(([b, value]) => b.classList.toggle('on', getDir() === value)); }
  sync();
  if (rows) rows.push({ _sync: sync });
  row.appendChild(seg);
  row.appendChild(mkReset(getDir, v => { setDir(v); sync(); }, null, isLive));
  if (subItems) subItems.push({ reset: () => { const d = defaultOf(getDir); if (d != null) { setDir(d); sync(); } } });
  mount.appendChild(row);
}

/* ===== 【2026-09-17 大掃除・ヒデさん依頼】「文字」の1行: 太さ(プルダウン)・行間・字間 =====
   TEXT_SPEC の1項目につき1行。値は params.edits[key] (✏️編集の浮きバーと同じ置き場)。
   空欄＝今のCSSの値をそのまま使う(カッコ内に実測値を出して「今いくつか」が読めるようにする)。 */
function textRow(sp) {
  if (!document.getElementById('txtRowCss')) {
    const st = document.createElement('style'); st.id = 'txtRowCss';
st.textContent = '.txt-row{align-items:flex-start}'
      + '.txt-row > label{flex:0 0 86px;font-size:10px;line-height:1.25;padding-top:3px}'   /* 名前は詰めて折り返し可。つまみは1行に収める */
      + '.txt-row .txt-ctl{display:flex;gap:4px 6px;align-items:center;flex-wrap:wrap;flex:1;min-width:0}'   /* 【2026-09-20】収まらない時は折り返して欠けさせない */
      + '.txt-row .txt-pair{display:inline-flex;align-items:center;gap:2px;flex:0 0 auto}'                  /* ラベル＋入力は必ずセットで折り返す */
      + '.txt-row select.txt-w{font-size:11px;padding:2px 16px 2px 4px;max-width:none;width:74px;flex:0 0 auto;text-overflow:clip}'
      + '.txt-row input.txt-n{width:38px;font-size:11px;padding:2px 3px;flex:0 0 auto;box-sizing:border-box}'   /* 【2026-09-20 ヒデさん依頼】数字の幅ぶんだけにスリム化(右の余りを詰める。旧50px) */
      + '.txt-row .txt-lab{font-size:10px;opacity:.6;margin-left:0;flex:0 0 auto;white-space:nowrap}'
      + '.txt-row input.txt-n.is-auto{color:inherit}'   /* 【2026-09-20 ヒデさん依頼】薄い色での色分けは不要→通常色で統一 */
      + '.txt-row{gap:2px}'                              /* 【2026-09-20】↺の分を詰める */
      + '.txt-row > label{flex:0 0 104px}'               /* 【2026-09-20 ヒデさん依頼】入力をスリムにした分、ラベル幅を広げて折り返しを減らす(旧74px) */
      + '.txt-row > .rst{flex:0 0 18px;width:18px;height:22px;line-height:20px;font-size:12px;border-radius:5px;margin-left:1px}';
    document.head.appendChild(st);
  }
  const row = document.createElement('div');
  row.className = 'row txt-row';
  const lab = document.createElement('label'); lab.textContent = sp.name; lab.title = sp.sel; row.appendChild(lab);
  const box = document.createElement('div'); box.className = 'txt-ctl';
  row.dataset.key = sp.key;   /* 【2026-09-20】スマホ上書きの印付け(markMbOverrides)で使う */
  /* 【2026-09-20 ヒデさん依頼・PC/SP独立】書き込み先を切り替える:
     スマホモード中は「スマホだけの上書き」params.editsMb[key] へ、通常は共有の params.edits[key] へ。
     → スマホモードでいじってもPC(共有値)は変わらない。適用は textTools.applyAll が isMobile の時だけ mb を base に重ねる。 */
  const phoneOn = () => { try { return document.documentElement.classList.contains('phone-mode'); } catch (e) { return false; } };
  const edBase = () => { if (!params.edits) params.edits = {}; return params.edits[sp.key] || (params.edits[sp.key] = {}); };
  const edMob  = () => { if (!params.editsMb) params.editsMb = {}; return params.editsMb[sp.key] || (params.editsMb[sp.key] = {}); };
  const ed = () => phoneOn() ? edMob() : edBase();
  /* 【2026-09-21 ヒデさん指摘・Y11】スマホモード中は「見えている実サイズ」をプレビュー枠(iframe=SP文脈)から測る。
     パネルは PC ページなので getComputedStyle は PC サイズを返し、SP プレビューの見た目と食い違っていた。 */
  const cs = () => {
    try { if (phoneOn()) { const f = document.getElementById('ppFrame'); if (f && f.contentDocument && f.contentWindow) { const el2 = f.contentDocument.querySelector(sp.sel); if (el2) return f.contentWindow.getComputedStyle(el2); } return null; /* 【2026-09-22】スマホモード中はSPプレビュー(iframe)からのみ読む。iframe未ロード時に親(=PC表示)の値を誤って拾わない(拾うと入力がPC値へ飛ぶ) */ } } catch (e) {}
    const el = document.querySelector(sp.sel); return el ? getComputedStyle(el) : null;
  };
  const apply = () => { try { textTools.applyAll(); textTools.refresh(); } catch (e) {} markDirty(); };
  const wSel = document.createElement('select'); wSel.className = 'txt-w'; wSel.title = '太さ(ウェイト)。自動＝CSSのまま';
  wSel.innerHTML = '<option value="">自動</option>' + [100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => `<option value="${w}">${w}</option>`).join('');
  wSel.onchange = () => { const e = ed(); if (wSel.value === '') delete e.fw; else e.fw = +wSel.value; apply(); sync(); try { if (window.__markMbOverrides) window.__markMbOverrides(); } catch (e2) {} };
  const numIn = (title, step, min, max, key) => {
    const i = document.createElement('input'); i.type = 'number'; i.className = 'txt-n'; i.title = title; i.step = step; i.min = min; i.max = max;
    i.oninput = () => { const e = ed(); const v = i.value === '' ? null : parseFloat(i.value); if (v == null || isNaN(v)) delete e[key]; else e[key] = v; i.classList.toggle('is-auto', v == null); apply(); try { if (window.__markMbOverrides) window.__markMbOverrides(); } catch (e2) {} };
    i.onpointerdown = ev => ev.stopPropagation();
    return i;
  };
  const fsz = numIn('文字サイズ(px)。いまの大きさが入っているので、そこから上下できます。消すとCSSのまま(自動)に戻る', '1', '6', '200', 'fs');   /* 【2026-09-19 ヒデさん依頼】サイズは現在値からの相殺に */
  const lh = numIn('行間(倍)。空欄＝CSSのまま', '0.05', '0.8', '3', 'lh');
  const ls = numIn('字間(px)。空欄＝CSSのまま', '0.1', '-5', '20', 'ls');
  fsz.dataset.prop = 'font-size'; wSel.dataset.prop = 'font-weight'; lh.dataset.prop = 'line-height'; ls.dataset.prop = 'letter-spacing';   /* 【2026-09-19】スマホモードで「モバイルで値が変わる」ものをオレンジに */
  const mkLab = (t, el, title) => { const pair = document.createElement('span'); pair.className = 'txt-pair'; const l = document.createElement('span'); l.className = 'txt-lab'; l.textContent = t; if (title) l.title = title; pair.append(l, el); box.append(pair); };
  mkLab('サ', fsz, 'サイズ(px)'); mkLab('太', wSel, '太さ(ウェイト)'); mkLab('lh', lh, '行間(倍)'); mkLab('ls', ls, '字間(px)');   /* 【2026-09-20 ヒデさん依頼】行間=lh・字間=ls 表記に */
  function sync() {
    /* スマホモード中は「共有(base)＋スマホ上書き(mb)」を表示。通常は共有だけ */
    const _base = (params.edits && params.edits[sp.key]) || {};
    const _mob = (params.editsMb && params.editsMb[sp.key]) || {};
    const e = phoneOn() ? Object.assign({}, _base, _mob) : _base, c = cs();
    const _eff = c ? Math.round(parseFloat(c.fontSize)) : '';
    /* 【2026-09-21 ヒデさん報告・導入事例で「40pxと出るのに見た目が違う」】文字サイズ(fs)は SP(実機 isMobile＝狭幅／スマホモード)では
       PC(base=edits)の fs を無視して描く(applyAll と同じ)。なのでパネルの表示も SP では base.fs を出さず、SP専用(editsMb.fs)か
       実際の描画サイズ(_eff)を出す＝「表示値＝見た目」を一致させる。太さ/行間/字間(fw/lh/ls)は共通なので従来どおり e を使う。 */
    const _isMbRow = (typeof isMobile !== 'undefined' && isMobile) || phoneOn();
    const _fsShown = _isMbRow ? (_mob.fs != null ? _mob.fs : null) : (e.fs != null ? e.fs : null);
    fsz.value = _fsShown != null ? _fsShown : (c ? _eff : fsz.value);   /* 【2026-09-19】いまの大きさを入れておく → そこから上下。触っていない間は未設定(=CSSのまま)。【2026-09-22】cs()がnull(スマホモードでiframe未ロード)なら現在値を保持=PC値へ飛ばさない */
    fsz.placeholder = _eff + '';
    fsz.classList.toggle('is-auto', _fsShown == null);   /* 自動(未変更)は薄く */
    wSel.value = e.fw != null ? String(e.fw) : '';
    wSel.options[0].textContent = c ? `自動(${c.fontWeight})` : '自動';
    /* 【2026-09-20 ヒデさん依頼・#12】lh/ls も「いまの値」を入れておく → そこから上下できる(空欄起点で変な値へ飛ぶのを防ぐ)。触っていない間は e.lh/e.ls 未設定(=CSSのまま)で薄く表示 */
    const _lhCur = c ? ((parseFloat(c.lineHeight) && parseFloat(c.fontSize)) ? +(parseFloat(c.lineHeight) / parseFloat(c.fontSize)).toFixed(2) : '') : '';
    lh.value = e.lh != null ? e.lh : (c ? _lhCur : lh.value);   /* 【2026-09-22】iframe未ロード時は現在値を保持 */
    lh.placeholder = _lhCur + '';
    lh.classList.toggle('is-auto', e.lh == null);
    const _lsCur = c ? (c.letterSpacing === 'normal' ? 0 : +parseFloat(c.letterSpacing).toFixed(1)) : '';
    ls.value = e.ls != null ? e.ls : (c ? _lsCur : ls.value);   /* 【2026-09-22】iframe未ロード時は現在値を保持 */
    ls.placeholder = _lsCur + '';
    ls.classList.toggle('is-auto', e.ls == null);
  }
  sync();
  row._sync = sync;   /* 【2026-09-21 Y11】syncPanelRows から再syncできるように(スマホモードでSP実サイズを表示) */
  row.appendChild(box);
  /* 【2026-09-20 ヒデさん依頼】各フォント行に↺リセット。押した時のモードのストア(通常=共有/スマホモード=スマホ上書き)の
     文字設定(サイズ・太さ・行間・字間)だけを消す。位置(dx/dy)やパディングは触らない。
     ＝スマホモードでいじってPCに移ってしまった値も、通常モードで↺を押せば既定へ戻せる。 */
  const resetFont = () => {
    /* 【2026-09-20 ヒデさん依頼・リセット統一】スマホモード中はSP専用の上書き(editsMb)だけ解除＝PC(共有)の文字設定に戻す。
       通常モードは「このセッションを開いた時の値」(SESSION_START.edits)に戻す(無ければ未設定=CSSのまま)。 */
    if (phoneOn()) {
      const store = params.editsMb && params.editsMb[sp.key];
      if (store) ['fs', 'fw', 'lh', 'ls'].forEach(k => { delete store[k]; });
    } else {
      const start = SESSION_START && SESSION_START.edits && SESSION_START.edits[sp.key];
      const store = (params.edits[sp.key] || (params.edits[sp.key] = {}));
      ['fs', 'fw', 'lh', 'ls'].forEach(k => { if (start && start[k] != null) store[k] = start[k]; else delete store[k]; });
    }
    apply(); sync();
    try { if (typeof window.__markMbOverrides === 'function') window.__markMbOverrides(); } catch (e) {}
  };
  const rst = document.createElement('button'); rst.type = 'button'; rst.className = 'rst'; rst.textContent = '↺';
  rst.title = 'このセッションを開いた時の文字設定に戻す（スマホモード中はスマホ用の上書きを解除）';
  rst.onpointerdown = ev => ev.stopPropagation();
  rst.onclick = ev => { ev.stopPropagation(); resetFont(); };
  row.appendChild(rst);
  if (subItems) subItems.push({ reset: resetFont });
  row._sync = sync;
  if (rows) rows.push({ _sync: sync });
  (mount || body).appendChild(row);
  return row;
}
/* セクション(sec)の文字を全部並べる。font:0(位置だけの要素)は出さない */
function textRowsFor(secs) {
  TEXT_SPEC.filter(sp => secs.includes(sp.sec) && sp.font !== 0).forEach(textRow);
}

/* 【2026-09-18 ヒデさん指定】する/しない以外の「案を選ぶ」行は、全部 ⋯(削除)付きの varRowX に統一する。
   opts=[[表示名, 値]]。値は文字列キーとして扱う(数値は set 側で戻す)。bucket は params.gfxVariantHidden の鍵(完全削除リストにも出る)。 */
function optRow(bucket, label, opts, get, set, o) {
  const lab = document.createElement('div'); lab.className = 'row opt-row'; lab.innerHTML = `<label>${label}</label>`; (mount || body).appendChild(lab);
  return varRowX(bucket, opts.map(([name, key]) => ({ key: String(key), name })), () => String(get()), k => set(k), o || {});
}

/* 【2026-08-27 ヒデさん指定・コンパクト化】オン/オフの2択をいくつか横に並べて1行に収める。
   これまで「外の輪」「内の輪」「ドット」で3行使っていたものが1行になる。 */
function chipRow(label, items) {
  const row = document.createElement('div');
  row.className = 'row';
  const lab = document.createElement('label');
  lab.textContent = label;
  const box = document.createElement('div');
  box.className = 'chip-box';
  const bs = items.map(it => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip-b';
    b.textContent = it.name;
    b.title = (it.hint || it.name) + '（押すと表示・非表示が切り替わります）';
    b.onclick = () => { it.set(!it.get()); sync(); markDirty(); renderFrame(); };
    box.appendChild(b);
    return [b, it];
  });
  function sync() { bs.forEach(([b, it]) => b.classList.toggle('on', !!it.get())); }
  sync();
  if (rows) rows.push({ _sync: sync });
  if (subItems) subItems.push({ reset: () => {
    items.forEach(it => { const d = defaultOf(it.get); if (d != null) it.set(d); });
    sync();
  } });
  /* 2026-08-29 ヒデさん指定: この行にもリセット(↺)を置く(全チップを既定へ) */
  const rst = document.createElement('button');
  rst.type = 'button'; rst.className = 'rst'; rst.textContent = '↺'; rst.title = '既定に戻す';
  rst.onclick = (e) => {
    e.stopPropagation();
    items.forEach(it => { const d = defaultOf(it.get); if (d != null) it.set(d); });
    sync(); markDirty(); renderFrame();
  };
  row.append(lab, box, rst);
  (mount || body).appendChild(row);
}

/* 【2026-08-28 ヒデさん指定】ピクトグラムやエフェクトも「バリエーション」なので、
   アニメーションのバリエーションと同じ見た目・同じ削除UIで並べられるようにする。
   ・記号(A,B,C… / 1,2,3…)は【残っている中の順番】で毎回振り直す
   ・× で削除 → 確認モーダル → 一覧の最後に「↺ 消した案を戻す(n)」
   ・消した控えはプリセットと同じ保管場所に置くので、パネルを作り替えても残る
   key = 控えを入れる引き出しの名前 / items = [{key,name,tip}] / mark = 記号の振り方 */
/* ===== 【2026-09-15 ヒデさん指定】バリエーション行の共通仕様(KV のバリエーションと同じ): 見えている順の連番(自動採番)・★ピン留め(おすすめ)・
   ⤓この設定で上書き・↺上書き解除・🗑削除・↺消した案を戻す。実績／ピクト(For SaaS・For AI)／エコー／光り方／輪の形／惑星の質感／ビジョンの登場 に共通 =====
   bucket : 保存の入れ物の鍵(params.gfxVariantHidden / gfxFav / gfxVarOverride。完全削除 VARIANT_REMOVED_EXTRA の鍵にもなる)
   items  : [{ key, name, tip, fixed }] fixed=消せない・番号なし(実績の「現行」)
   getSel / setSel : いま選んでいる key / 選ぶ(値の代入だけ。反映は共通で行う)
   o.snap : { get(), set(obj), reset() } 「いまの設定で上書き」で控える範囲(無ければ上書きは出ない)
   o.after: 選択・上書き適用のあとに呼ぶ(fit など) / o.reset: { get, set } 行の右端の ↺ / o.onFill: 並び直しのたびに呼ぶ
   番号は見えている順に 1 から振り直す(消した案・焼き込み済み・ピン留め中は飛ばす)。元の ID はツールチップに出す */
const VAR_VIEW = {};   /* bucket → [{ key, no }] いまの表示番号(実績の小見出し「案◯」の同期に使う) */

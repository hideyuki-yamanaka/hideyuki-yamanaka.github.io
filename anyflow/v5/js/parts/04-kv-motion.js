
/* ===== 惑星への集約アニメ (2026-08-26 ヒデさん指定・①②④⑩) =====
   大前提: デザインは V1.0 のまま一切変えない。既存の軌道・惑星・ドットに「動き」だけ足す。
   （既存パーツと同じ見た目の複製を増やすのは OK: スパイラルの粒・波の輪）
   'reel'   ①収縮ループ: 外の輪は常に固定で残し、内の輪がドットごと惑星へ収縮→吸収(フェード)→
            新しい輪がフェードインして再生。傾き(シーソー)・クロスはさせない(固定)。
   'spiral' ②スパイラル: 通常の周回はそのまま。追加の粒が螺旋で半径を縮めて吸い込まれる。
   'pulse'  ④パルス: 7個のドットが鼓動の周期で一斉に惑星へ収束→吸収→軌道上へ再出現。
   ※ ④「輪が流れ込む」(waves) は 2026-08-27 ヒデさん指定で削除。番号は詰めず据え置き
     (これまでの会話が「6番＝点が並ぶ軌道」で通っているため) */
/* ===== 選択ピルの「グループ」(2026-08-28 ヒデさん指定) =====
   内部モード(converge)は上の CONVERGES のまま保持し、表示だけ束ねる。
   こうするとプリセット(gfxPresets[mode])もバリエーション(GFX_VARIANTS[mode])も消えない。
     周回のみ  … off。「線で行き来」(duplex)のオン/オフ＋ジャイロ(gyro)をバリエーションに
     1 収縮    … reel
     2 軌道と粒 … spiral + accre + beads を統合
     3 ネットワーク … mesh */
/* 【2026-08-29 ヒデさん指定・大枠再編】選択ピルは 2グループに統合:
     A 軌道     … 周回のみ(off/gyro) + 収縮(reel) + 軌道と粒(spiral/accre/beads) + 線で行き来(duplex) を統合。
                   中を「軌道のみ / 粒とセット / 収縮あり」のカテゴリに分け、下のトグルで絞り込める。
     B ネットワーク … 網(mesh) + ネットワーク3D。
   内部モード(converge)・プリセット(gfxPresets)・バリエーション(GFX_VARIANTS)は保持したまま表示だけ束ねる。 */
/* 【2026-08-31 ヒデさん指定・解釈修正】タブは従来どおり A 軌道 / B ネットワーク の2つ。
   合体するのは A の中のカテゴリ「軌道のみ」+「粒とセット」→「軌道と粒」(下の CONV_CATS)。 */
const CONV_GROUPS = [
  { key: 'orbit',   name: '軌道',
    modes: ['off', 'gyro', 'reel', 'spiral', 'accre', 'beads', 'duplex'],
    desc: '軌道をベースにした案。カテゴリ(軌道と粒/収縮あり)ごとに並びます。' },
  { key: 'network', name: 'ネットワーク', modes: ['mesh'],
    desc: 'ゆらぎ漂うノードの網、または3Dネットワーク。データがノードを渡り歩いて惑星へ届きます。' },
];
/* A(軌道)の中のカテゴリ。各内部モードをタグ付けし、バリエーション行を振り分ける＋オンオフで絞り込む。 */
function convCatFilter() {
  if (!params.convCatFilter || typeof params.convCatFilter !== 'object') params.convCatFilter = { orbdot: true, shrink: true };
  if (params.convCatFilter.orbdot == null) params.convCatFilter.orbdot = true;   /* 2026-08-31: カテゴリ合体(軌道と粒)を古い保存にも補完 */
  return params.convCatFilter;
}
/* あるバリエーションが「B ネットワーク」に属するか(=ネットワーク3D。off内に定義があるので名前でBへ回す) */
function convVarIsNetwork(v) { return !!(v && v.common && v.common.net3d); }
function convGroupOf(mode) {
  mode = mode || 'off';
  /* 【2026-08-30 ヒデさん指定】ネットワーク3D(off + net3d)は A 軌道のバリエーションに置く(off の所属=A)。 */
  return CONV_GROUPS.find(g => g.modes.includes(mode) || g.line === mode) || CONV_GROUPS[0];
}
/* ===== 案ごとのグラフィック6案 (2026-08-27 ヒデさん指定。3案→6案に増やした) =====
   ⚠️ デザインそのものは変えない。同じアニメーションの枠の中で
      【軌道と惑星の 位置・大きさ・つぶし・傾き・レイアウト】と
      【その案のつまみ】【軌道そのものの回転】だけを変えて、見え方の違う6案を用意する。
   gfx    = 書いた項目だけが既定(gfxDefault)を上書きする
   conv   = その案のつまみ
   common = 全案で共通の見せ方。orbitSpin だけは「案ごとの引き出し」へ入る
   ※ 配置は下の LOOKS を使い回す。案ごとに毎回書かないことで、
      「どの案でも同じ配置バリエーションが選べる」状態を保つ。 */
const GFX_LOOKS = {
  /* カンプ通り。2本がほぼ平行に流れる */
  std:     {},
  /* ジャイロ交差。傾きを逆にして立体交差させる */
  cross:   { layout: 'gyro', planet: { scale: 0.92 } },
  /* 薄く広がる皿。横に広げて寝かせ、土星の輪のように */
  dish:    { outer: { scale: 1.22, flat: 0.55 }, inner: { scale: 1.08, flat: 0.5 }, planet: { scale: 1.12, dy: 54 } },
  /* 立ち上がるクロス。輪を起こして丸に近づけ、深く交差させる */
  upright: { outer: { scale: 1.0, flat: 1.9, angle: -40 }, inner: { scale: 0.93, flat: 1.8, angle: 36 }, planet: { scale: 0.92 } },
  /* 大きく包む。軌道を広げて惑星を小さく＝スケール感が出る */
  wide:    { layout: 'gyro', outer: { scale: 1.4 }, inner: { scale: 1.3, flat: 1.15 }, planet: { scale: 0.74, dy: 36 } },
  /* 惑星に寄る。軌道を小さくして惑星を大きく＝密で力強い */
  tight:   { outer: { scale: 0.8, flat: 0.95 }, inner: { scale: 0.72, flat: 1.0 }, planet: { scale: 1.32, dy: 50 } },
  /* 片寄せ。惑星を右へ、軌道を左へずらして非対称に */
  offset:  { layout: 'gyro', outer: { scale: 1.12, dx: -50, dy: 8 }, inner: { scale: 1.0, dx: -32, flat: 1.2 },
             planet: { scale: 0.96, dx: 64, dy: 52 } },
};
const GFX_VARIANTS = {
  off: [
    { name: 'A カンプ通り', desc: 'Figma のカンプそのまま。2本がほぼ平行に流れます。',
      gfx: GFX_LOOKS.std, common: { orbitSpin: 0 } },
    { name: 'B ジャイロ交差', desc: '2本の傾きを逆にして立体交差させます。惑星の前後を横切る回数が増え、奥行きが出ます。',
      gfx: GFX_LOOKS.cross, common: { orbitSpin: 0.35 } },
    { name: 'C 薄く広がる皿', desc: '2本とも横に広げて薄くつぶし、土星の輪のように寝かせます。惑星は大きめ。',
      gfx: GFX_LOOKS.dish, common: { orbitSpin: 0.2 } },
    { name: 'D 立ちクロス', desc: '輪を起こして丸に近づけ、深く交差させます。回転をつけると天球儀のように見えます。',
      gfx: GFX_LOOKS.upright, common: { orbitSpin: 0.8 } },
    { name: 'E 大きく包む', desc: '軌道を大きく広げて惑星を小さく。スケール感が出ます。',
      gfx: GFX_LOOKS.wide, common: { orbitSpin: 0.5 } },
    { name: 'F 惑星に寄る', desc: '軌道を小さくたたんで惑星を大きく。密で力強い見え方になります。',
      gfx: GFX_LOOKS.tight, common: { orbitSpin: 1.2 } },
    /* 【2026-08-29 ヒデさん指定】Figma 15970-42735 のネットワーク周回を3Dで再現した新案。
       専用レンダラー(net3d)に切り替わる。2D/3D・手前奥の太さ・物理は下の「この案のつまみ」で。 */
    { name: 'ネットワーク3D', desc: 'Figmaのネットワーク周回の再現。3本の軌道を傾いた3Dの円で描きます。3D＝手前が太く奥が細い線幅＋物理(手前のドットは速く/奥はゆっくり)。2D/3Dは下のつまみで切替。',
      gfx: GFX_LOOKS.std, common: { net3d: true } },
  ],
  /* 【2026-08-27 ヒデさん指定】①はスピンが速すぎて狙う印象(ゆったり・先進・未来)から遠かった。
     ・1周の秒数(duration)を 24秒 → 30〜40秒 に伸ばして、ドットの流れ自体をゆっくりに
     ・1循環(T)を 5〜9秒に伸ばし、長く回ってから静かに縮み始めるようにした
     ・軌道の回転(orbitSpin)は 0〜0.3 に抑えた(以前は最大1.3=15秒で1回転していた)
     ・現れ方(inDur)と移り方(moveDur)を長くして、動きの角を取った */
  reel: [
    { name: 'A カンプ通り', desc: '既定の並び。長くゆっくり回ってから、静かに惑星へ滑り込みます。',
      gfx: GFX_LOOKS.std,
      conv: { blend: 0, T: 6.4, shrinkAt: 0.36, endAt: 0.80, moveDur: 0.20, inDur: 0.22 },
      common: { orbitSpin: 0 }, root: { duration: 32 } },
    { name: 'B 深く交差', desc: 'ジャイロ交差の配置。中間の輪を3本はさんで層をつくり、ゆっくり惑星の前後を横切ります。',
      gfx: { layout: 'gyro', outer: { scale: 1.05 }, inner: { scale: 0.95, flat: 1.15 }, planet: { scale: 0.9, dy: 40 } },
      conv: { blend: 3, blendAlpha: 0.28, T: 7.2, shrinkAt: 0.36, endAt: 0.82, moveDur: 0.20, inDur: 0.22 },
      common: { orbitSpin: 0.10 }, root: { duration: 34 } },
    { name: 'C 薄い皿', desc: '横に広げて寝かせた薄い輪。中間の輪5本が、土星の輪のようにゆっくり吸い込まれます。',
      gfx: GFX_LOOKS.dish,
      conv: { blend: 5, blendAlpha: 0.24, T: 7.6, shrinkAt: 0.34, endAt: 0.82, moveDur: 0.22, inDur: 0.24 },
      common: { orbitSpin: 0.07 }, root: { duration: 34 } },
    { name: 'D 立ちクロス', desc: '起こして交差させた輪が、球状の層のままゆっくり縮んでいきます。',
      gfx: GFX_LOOKS.upright,
      conv: { blend: 6, blendAlpha: 0.22, T: 8.0, depth: 0.98, shrinkAt: 0.34, endAt: 0.84, moveDur: 0.22, inDur: 0.24 },
      common: { orbitSpin: 0.10 }, root: { duration: 36 } },
    { name: 'E 大きく包む', desc: '大きく広げた輪が、長い時間をかけて小さな惑星へ吸い込まれます。いちばんゆったり。',
      gfx: GFX_LOOKS.wide,
      conv: { blend: 4, blendAlpha: 0.26, T: 9.0, shrinkAt: 0.30, endAt: 0.84, moveDur: 0.24, inDur: 0.26 },
      common: { orbitSpin: 0.07 }, root: { duration: 38 } },
    { name: 'F 惑星に寄る', desc: '惑星のすぐ外で輪が生まれては縮みます。11案の中ではテンポが速めですが、以前より落ち着かせてあります。',
      gfx: GFX_LOOKS.tight,
      conv: { blend: 2, blendAlpha: 0.32, T: 5.6, shrinkAt: 0.34, endAt: 0.80, moveDur: 0.18, inDur: 0.20 },
      common: { orbitSpin: 0.12 }, root: { duration: 28 } },
    /* 【2026-08-28 ヒデさん指定】複数軌道シェイプ(本数はパネルの「軌道の本数」で増減)。粒はこの案の吸収のまま。 */
    { name: 'アトム 4本', desc: '4本の軌道が原子模型のように交差して回ります。粒はこの案の吸収のまま。',
      gfx: GFX_LOOKS.std, common: { ringCount: 4, ringShape: 'atom' } },
    { name: 'アトム 6本', desc: '6本の軌道が原子模型のように交差。密度が上がって華やかに。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'atom' } },
    { name: 'アトム 8本', desc: '8本の軌道が球状に張り巡らされ、複雑に回ります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 8, ringShape: 'atom' } },
    { name: '土星の輪', desc: '同心の輪が土星の輪のように重なってゆっくり回ります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'saturn' } },
    { name: '花のリング', desc: '同じ大きさの輪を均等に回して重ねた花のような形。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'rosette' } },
  ],
  /* 【2026-08-28 ヒデさん指定】②③は回る速さと取り込む速さが速かったので、全体にゆっくりへ。
     ・回る速さ(speed)を 1 → 0.3〜0.9 に
     ・吸い込みにかける時間(life / fall)を長く
     ・軌道にいる時間(stay)を長く取って、落ち始めるまでの間を作った
     ・全体の1周(duration)も 24秒 → 28〜38秒 に伸ばした */
  spiral: [
    { name: 'A 標準の渦', desc: '既定の並び。長く軌道を回ってから、ゆっくり渦を描いて落ちます。',
      gfx: GFX_LOOKS.std,
      conv: { count: 12, life: 8, speed: 0.55, size: 0.62, stay: 5, swirl: 1, fallCurve: 1 },
      common: { orbitSpin: 0 }, root: { duration: 32 } },
    { name: 'B 大げさな渦巻き', desc: '粒を26個に増やし、中心へ近づくほど強く巻き込みます。速さは抑えてあるので、うねりが読み取れます。',
      gfx: { layout: 'gyro', outer: { scale: 1.1 }, inner: { scale: 1.0, flat: 1.2 }, planet: { scale: 0.88 } },
      conv: { count: 26, life: 9, speed: 0.6, size: 0.5, stay: 3.5, swirl: 2.4, fallCurve: 1.8 },
      common: { orbitSpin: 0.18 }, root: { duration: 34 } },
    { name: 'C ゆったり大回り', desc: '軌道を大きく広げて寝かせ、粒がとても長い時間かけて回り込みます。いちばん静か。',
      gfx: { outer: { scale: 1.28, flat: 0.6 }, inner: { scale: 1.18, flat: 0.55 }, planet: { scale: 0.8, dy: 56 } },
      conv: { count: 16, life: 13, speed: 0.45, size: 0.75, stay: 7, swirl: 0.3, fallCurve: 0.7 },
      common: { orbitSpin: 0.1 }, root: { duration: 38 } },
    { name: 'D 立ちクロスの渦', desc: '起こして交差させた軌道から、粒が縦方向にも巻き込まれます。渦の軸が見えやすい配置。',
      gfx: GFX_LOOKS.upright,
      conv: { count: 30, life: 8.5, speed: 0.6, size: 0.55, stay: 4, swirl: 1.8, fallCurve: 1.4 },
      common: { orbitSpin: 0.28 }, root: { duration: 34 } },
    { name: 'E 大きく包む渦', desc: '遠くの大きな軌道から、小さな惑星へ長い渦を描いて落ちていきます。',
      gfx: GFX_LOOKS.wide,
      conv: { count: 22, life: 14, speed: 0.45, size: 0.68, stay: 6.5, swirl: 1.2, fallCurve: 1.1 },
      common: { orbitSpin: 0.14 }, root: { duration: 38 } },
    { name: 'F 近くで速い渦', desc: '惑星のすぐ外で、粒が短くきつく巻き込まれます。14案の中ではテンポ速めですが、以前より落ち着かせてあります。',
      gfx: GFX_LOOKS.tight,
      conv: { count: 34, life: 5, speed: 0.85, size: 0.45, stay: 2, swirl: 2.4, fallCurve: 1.9 },
      common: { orbitSpin: 0.3 }, root: { duration: 28 } },
    /* 【2026-08-28 ヒデさん指定】「周回のみ」と同じカンプの2本の軌道のまま、粒が吸収される案。
       レイアウトは std(カンプ通り)・回転なしで、周回のみの見た目を保ったまま粒だけ惑星へ落ちる。 */
    { name: '周回レイアウトで吸収', desc: '周回のみと同じ2本の軌道(カンプ通り)のまま、粒がゆっくり惑星へ吸い込まれます。軌道の形は崩れません。',
      gfx: GFX_LOOKS.std,
      conv: { count: 14, life: 8, speed: 0.5, size: 0.62, stay: 5.5, swirl: 1, fallCurve: 1 },
      common: { orbitSpin: 0 }, root: { duration: 34 } },
    /* 【2026-08-29 ヒデさん指定】コメット: 大きめの粒が少数、軌道をくるくる回りながら、たまに1個ずつ惑星へ吸い込まれる。 */
    { name: 'コメット', desc: '2本の軌道が斜めに交差してくるくる回り、大きめの粒がたまに1つずつ惑星へ吸い込まれます（Figmaカンプ準拠）。',
      gfx: { layout: 'gyro', planet: { scale: 0.92 } },
      conv: { count: 6, life: 3.6, speed: 0.5, size: 1.2, stay: 7, swirl: 0.6, fallCurve: 1.4 },
      common: { orbitSpin: 0.35 }, root: { duration: 34 } },
    /* 【2026-08-28 ヒデさん指定】複数軌道シェイプ(本数はパネルの「軌道の本数」で増減)。粒はこの案の吸収のまま。 */
    { name: 'アトム 4本', desc: '4本の軌道が原子模型のように交差して回ります。粒はこの案の吸収のまま。',
      gfx: GFX_LOOKS.std, common: { ringCount: 4, ringShape: 'atom' } },
    { name: 'アトム 6本', desc: '6本の軌道が原子模型のように交差。密度が上がって華やかに。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'atom' } },
    { name: 'アトム 8本', desc: '8本の軌道が球状に張り巡らされ、複雑に回ります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 8, ringShape: 'atom' } },
    { name: '土星の輪', desc: '同心の輪が土星の輪のように重なってゆっくり回ります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'saturn' } },
    { name: '花のリング', desc: '同じ大きさの輪を均等に回して重ねた花のような形。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'rosette' } },
  ],
  accre: [
    { name: 'A 標準の円盤', desc: '既定の円盤。粒がゆっくり渦を巻きながら、少しずつ内へ落ちていきます。',
      gfx: GFX_LOOKS.std,
      conv: { scale: 1.15, count: 1000, size: 0.35, fall: 0.55, speed: 0.45, showOrbit: false, swirl: 1, fallCurve: 1 },
      common: { orbitSpin: 0 }, root: { duration: 32 } },
    { name: 'B 大きく薄い円盤', desc: '円盤を広げて粒を1800個に。1粒を小さく、流れもゆっくりにして、細かい砂が漂うようにします。',
      gfx: { planet: { scale: 0.82, dy: 52 } },
      conv: { scale: 1.85, count: 1800, size: 0.22, fall: 0.4, speed: 0.35, wobble: 0.7, twinkle: 0.6, showOrbit: false, swirl: 0.6 },
      common: { orbitSpin: 0 }, root: { duration: 36 } },
    { name: 'C 軌道つき・きつい渦', desc: '軌道を出したまま、内側でしっかり渦を巻かせます。ジャイロ交差なので円盤と輪が立体的に絡みます。',
      gfx: { layout: 'gyro', inner: { scale: 0.92, flat: 1.1 }, planet: { scale: 0.95 } },
      conv: { scale: 0.85, count: 700, size: 0.4, fall: 0.6, speed: 0.6, showOrbit: true, swirl: 2.0, fallCurve: 1.5, wobble: 0.2 },
      common: { orbitSpin: 0.2 }, root: { duration: 32 } },
    { name: 'D 立ちクロス＋円盤', desc: '起こして交差させた輪を出したまま、その内側で円盤が渦を巻きます。',
      gfx: GFX_LOOKS.upright,
      conv: { scale: 1.0, count: 900, size: 0.34, fall: 0.5, speed: 0.5, showOrbit: true, swirl: 1.4, fallCurve: 1.2, wobble: 0.3 },
      common: { orbitSpin: 0.3 }, root: { duration: 34 } },
    { name: 'E 大きく包む円盤', desc: '小さな惑星のまわりに、大きく薄い円盤がゆったり広がります。銀河のようなスケール感。',
      gfx: GFX_LOOKS.wide,
      conv: { scale: 2.2, count: 1600, size: 0.24, fall: 0.35, speed: 0.3, showOrbit: false, swirl: 0.5, twinkle: 0.7 },
      common: { orbitSpin: 0.12 }, root: { duration: 38 } },
    { name: 'F 惑星に密着', desc: '大きな惑星のすぐ表面近くを粒が回ります。14案の中では速めですが、以前よりかなり落ち着かせてあります。',
      gfx: GFX_LOOKS.tight,
      conv: { scale: 0.65, count: 1200, size: 0.3, fall: 0.8, speed: 0.9, showOrbit: false, swirl: 2.0 },
      common: { orbitSpin: 0.3 }, root: { duration: 28 } },
  ],
  mesh: [
    { name: 'A ふわふわ漂う', desc: '既定。ノードがゆらゆら漂い、線で結ばれてデータが渡り歩きます。',
      gfx: GFX_LOOKS.std,
      conv: { style: 'organic', nodes: 14, span: 0.34, lineAlpha: 0.5, lineWidth: 1.4, drift: 1, random: 0.6, size: 0.6, hop: 0.55, rate: 1.2 },
      common: { orbitSpin: 0 } },
    { name: 'B まばらな星座', desc: 'ノードを9個まで減らして間隔を広げ、線を薄く。ぽつぽつと星座のように見せます。',
      gfx: { planet: { scale: 0.92 } },
      conv: { style: 'constellation', nodes: 9, span: 0.55, lineAlpha: 0.3, lineWidth: 1, drift: 1.7, random: 1, size: 0.75, hop: 0.75, rate: 0.9 },
      common: { orbitSpin: 0 } },
    { name: 'C 包囲ケージ', desc: '惑星のまわりの球殻にノードを並べ、骨で結んだカゴがゆっくり回ります。手前の骨は惑星の前を、奥の骨は後ろを通るので、まるごと取り囲んでいるように見えます。',
      gfx: { layout: 'gyro', outer: { scale: 1.12 }, inner: { scale: 1.0, flat: 1.25 }, planet: { scale: 0.9, dy: 44 } },
      conv: { style: 'cage', nodes: 26, cageR: 1.8, cageSpin: 1, cageLinks: 3, cageTilt: -20,
              lineAlpha: 0.5, lineWidth: 1.1, size: 0.5, random: 0.6, hop: 0.45, rate: 1.8 },
      common: { orbitSpin: 0 } },
    { name: 'D 大きいケージ', desc: '包囲ケージを大きく組み、骨を増やして密に。惑星を大きく囲い込む印象になります。',
      gfx: GFX_LOOKS.wide,
      conv: { style: 'cage', nodes: 40, cageR: 2.6, cageSpin: 0.6, cageLinks: 4, cageTilt: -14,
              lineAlpha: 0.42, lineWidth: 0.9, size: 0.42, random: 0.4, hop: 0.5, rate: 2.2 },
      common: { orbitSpin: 0 } },
    { name: 'E 細かいケージ', desc: '細かい骨のカゴが惑星を包んで速く回ります。手前の骨は惑星の前、奥は後ろを通って取り囲みます。',
      gfx: GFX_LOOKS.std,
      conv: { style: 'cage', nodes: 34, cageR: 1.7, cageSpin: 1.8, cageLinks: 3, cageTilt: -28,
              lineAlpha: 0.5, lineWidth: 1.0, size: 0.4, random: 0.2, hop: 0.32, rate: 2.6 },
      common: { orbitSpin: 0 } },
    { name: 'F 立ちクロスの網', desc: '起こして交差させた広い範囲に網を張ります。奥行きのあるネットになります。',
      gfx: GFX_LOOKS.upright,
      conv: { style: 'organic', nodes: 22, span: 0.42, lineAlpha: 0.45, lineWidth: 1.2, drift: 1.3, random: 0.9, size: 0.5, hop: 0.5, rate: 1.6 },
      common: { orbitSpin: 0.8 } },
    /* 【2026-09-02 ヒデさん指定】現行ケージのブラッシュアップ案: 面がきれいに整った(潰れ・歪みなし)測地線球。 */
    { name: 'G 整った網（測地線）', desc: '面がきれいに整った、潰れ・歪みのない網。正20面体を細分した測地線球で、全ての面がほぼ均一・全ての辺がほぼ同じ長さ。縦の潰しも無い真円の球なので、端正な多面体らしい佇まいになります。密度は「面の細かさ」で調整(1=正20面体/2=42点/3=162点)。',
      gfx: GFX_LOOKS.wide,
      conv: { style: 'cage', cageShape: 'geo', cageFreq: 2, cageR: 2.4, cageSpin: 0.6, cageLinks: 3, cageTilt: -14,
              lineAlpha: 0.5, lineWidth: 0.9, size: 0.42, random: 0, hop: 0.5, rate: 2.0 },
      common: { orbitSpin: 0 } },
    /* 【2026-08-28 ヒデさん指定】複数軌道シェイプ(本数はパネルの「軌道の本数」で増減)。粒はこの案の吸収のまま。 */
    { name: 'アトム 4本', desc: '4本の軌道が原子模型のように交差して回ります。粒はこの案の吸収のまま。',
      gfx: GFX_LOOKS.std, common: { ringCount: 4, ringShape: 'atom' } },
    { name: 'アトム 6本', desc: '6本の軌道が原子模型のように交差。密度が上がって華やかに。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'atom' } },
    { name: 'アトム 8本', desc: '8本の軌道が球状に張り巡らされ、複雑に回ります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 8, ringShape: 'atom' } },
    { name: '土星の輪', desc: '同心の輪が土星の輪のように重なってゆっくり回ります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'saturn' } },
    { name: '花のリング', desc: '同じ大きさの輪を均等に回して重ねた花のような形。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'rosette' } },
  ],
  beads: [
    { name: 'A 標準', desc: '既定。点が等間隔に並んだ輪から、順に惑星へ吸い込まれます。',
      gfx: GFX_LOOKS.std, conv: { count: 300, size: 0.5, ratio: 0.22, speed: 0.26, spin: 0, jitter: 0 },
      common: { orbitSpin: 0 } },
    { name: 'B 細かい粒', desc: '1粒を小さくして、線に近い細かさに。流れがなめらかに見えます。',
      gfx: { outer: { scale: 1.06 }, inner: { scale: 1.02 }, planet: { scale: 1.02 } },
      conv: { count: 300, size: 0.34, ratio: 0.16, speed: 0.34, spin: 0.5, jitter: 0.15 },
      common: { orbitSpin: 0.25 } },
    { name: 'C 交差する二重リング', desc: 'ジャイロ交差の2本に点を並べ、吸い込まれる時に渦を巻かせます。2本の重なりで奥行きが出ます。',
      gfx: { layout: 'gyro', outer: { scale: 1.02 }, inner: { scale: 0.94, flat: 1.2 }, planet: { scale: 0.9 } },
      conv: { count: 300, size: 0.55, ratio: 0.3, spin: 1.3, spinEase: 1.4, backIn: 1.5 },
      common: { orbitSpin: 0.5 } },
    { name: 'D 立ちクロスのリング', desc: '起こして交差させた2本の点リングが、天球儀のように回りながら吸い込まれます。',
      gfx: GFX_LOOKS.upright, conv: { count: 300, size: 0.5, ratio: 0.24, speed: 0.3, spin: 1.0, spinEase: 1.2, backIn: 1.3 },
      common: { orbitSpin: 1.0 } },
    { name: 'E 大きいリング', desc: '大きく広げたリングから、小さな惑星へゆっくり吸い込まれます。',
      gfx: GFX_LOOKS.wide, conv: { count: 300, size: 0.6, ratio: 0.16, speed: 0.2, life: 5, backIn: 1.8 },
      common: { orbitSpin: 0.45 } },
    { name: 'F 惑星に寄るリング', desc: '大きな惑星のすぐ外で、点が速く回りながら次々に吸い込まれます。',
      gfx: GFX_LOOKS.tight, conv: { count: 300, size: 0.44, ratio: 0.34, speed: 0.44, life: 2.4, spin: 0.8 },
      common: { orbitSpin: 1.4 } },
  ],
  duplex: [
    { name: 'A 標準', desc: '既定。ゆるく反った線の上を、粒が惑星と軌道の間で行き来します。',
      gfx: GFX_LOOKS.std, conv: { curve: 0.22, density: 1, lineAlpha: 0.16, lineWidth: 1, size: 0.6, speed: 1 },
      common: { orbitSpin: 0 } },
    { name: 'B まっすぐ放射', desc: '線の反りをほぼ無くして放射状に。太く濃くして、配線図のようなはっきりした見え方にします。',
      gfx: { outer: { scale: 1.08 }, inner: { scale: 0.98 }, planet: { scale: 1.05 } },
      conv: { curve: 0.03, density: 1.6, lineAlpha: 0.26, lineWidth: 2.2, size: 0.5, speed: 1.3 },
      common: { orbitSpin: 0.2 } },
    { name: 'C 大きく弧を描く', desc: '線を大きく反らせて細く。ジャイロ交差の広い軌道と組み合わせ、弧が惑星の前後を回り込みます。',
      gfx: { layout: 'gyro', outer: { scale: 1.15, flat: 0.85 }, inner: { scale: 1.0, flat: 1.3 }, planet: { scale: 0.85, dy: 40 } },
      conv: { curve: 0.62, density: 0.8, lineAlpha: 0.34, lineWidth: 0.6, size: 0.7, speed: 0.75, T: 4.2 },
      common: { orbitSpin: 0.4 } },
    { name: 'D 立ちクロスの線', desc: '起こして交差させた軌道と惑星を結ぶので、線が縦にも走ります。立体的な配線に見えます。',
      gfx: GFX_LOOKS.upright, conv: { curve: 0.3, density: 1.3, lineAlpha: 0.24, lineWidth: 1.2, size: 0.55, speed: 1.1 },
      common: { orbitSpin: 0.9 } },
    { name: 'E 遠くから長い線', desc: '大きく広げた軌道から、小さな惑星まで長い線が伸びます。粒がゆっくり長距離を移動します。',
      gfx: GFX_LOOKS.wide, conv: { curve: 0.45, density: 1.1, lineAlpha: 0.2, lineWidth: 0.8, size: 0.62, speed: 0.7, T: 5 },
      common: { orbitSpin: 0.45 } },
    { name: 'F 密な短い線', desc: '大きな惑星のすぐ外から、短い線で密に行き来します。処理量が多そうな印象。',
      gfx: GFX_LOOKS.tight, conv: { curve: 0.12, density: 2.4, lineAlpha: 0.3, lineWidth: 1.6, size: 0.45, speed: 1.6, T: 2.2 },
      common: { orbitSpin: 1.3 } },
  ],
  gyro: [
    { name: 'A 標準のジャイロ', desc: '2本の輪が直交して転がります。いちばんジャイロらしい形。',
      gfx: GFX_LOOKS.std, conv: { tumble: 1, spin: 1, phase: 90, thin: 0.06, pull: 0.25, pullT: 5 },
      common: { orbitSpin: 0 } },
    { name: 'B 立ちクロスで転がる', desc: '起こして交差させた輪が転がるので、球体の骨組みが回っているように見えます。',
      gfx: GFX_LOOKS.upright, conv: { tumble: 1.2, spin: 1.4, phase: 90, thin: 0.04, pull: 0.3, pullT: 4.4 },
      common: { orbitSpin: 0.3 } },
    { name: 'C ゆっくり大きく', desc: '大きく広げた輪が、ゆったりと転がりながら小さな惑星へ吸い寄せられます。',
      gfx: GFX_LOOKS.wide, conv: { tumble: 0.45, spin: 0.5, phase: 90, thin: 0.08, pull: 0.4, pullT: 8 },
      common: { orbitSpin: 0.2 } },
    { name: 'D 高速スピン', desc: '惑星のすぐ外で輪が速く転がります。装置が高速で稼働しているような見え方。',
      gfx: GFX_LOOKS.tight, conv: { tumble: 2.2, spin: 2.4, phase: 90, thin: 0.03, pull: 0.18, pullT: 2.6 },
      common: { orbitSpin: 0.6 } },
    { name: 'E 同じ向きで転がる', desc: '2本のずれを無くして同じ向きに転がします。1枚の板が回っているように見えます。',
      gfx: GFX_LOOKS.dish, conv: { tumble: 0.9, spin: 0.8, phase: 0, thin: 0.05, pull: 0.22, pullT: 5.5 },
      common: { orbitSpin: 0.25 } },
    { name: 'F 片寄せジャイロ', desc: '惑星を右へ、輪を左へずらした非対称な配置で転がります。動きに癖が出ます。',
      gfx: GFX_LOOKS.offset, conv: { tumble: 1.1, spin: 1.2, phase: 120, thin: 0.05, pull: 0.34, pullT: 4 },
      common: { orbitSpin: 0.7 } },
    /* 【2026-08-28 ヒデさん指定】複数軌道シェイプ(本数はパネルの「軌道の本数」で増減できる)。
       3案=アトム型(本数違い) / 4・5案目=別のシェイプ(土星型・花型)。 */
    { name: 'アトム 4本', desc: '4本の軌道が原子模型のように、惑星の中心で均等に交差して回ります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 4, ringShape: 'atom' } },
    { name: 'アトム 6本', desc: '6本の軌道が原子模型のように交差。密度が上がって華やかになります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'atom' } },
    { name: 'アトム 8本', desc: '8本の軌道が球状に張り巡らされ、複雑に回ります。いちばん密。',
      gfx: GFX_LOOKS.std, common: { ringCount: 8, ringShape: 'atom' } },
    { name: '土星の輪', desc: '同じ傾きの輪を大きさ違いで同心に重ねた、土星の輪のような形。ゆっくり回ります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'saturn' } },
    { name: '花のリング', desc: '同じ大きさの輪を均等に回して重ねた、花びらのような形。平面的に回ります。',
      gfx: GFX_LOOKS.std, common: { ringCount: 6, ringShape: 'rosette' } },
  ],
};
/* 【2026-08-29 ヒデさん指定】バリエーション一覧から「完全削除」した案(案キー→消した案名)。
   ⚠️ 配列(GFX_VARIANTS)から要素を抜くと、案の並び順(インデックス)がズレて既存の調整値(gfxTweaks)が
      別の案に化ける／共有バリエ(GFX_LOOKS2・ジャイロ版)は他案でも使うため配列削除は危険。
      なので「表示・復元の両方から名前で恒久除外」する方式にする(コードに焼くので localStorage を消しても復活しない)。
   これ以降ヒデさんが新たに案を完全削除したい時は、その案の名前をここへ足すだけでよい。 */
const VARIANT_REMOVED = {
  off:    ['F 惑星に寄る', 'I 大小の入れ子', 'J 地平線', 'K 斜めの流れ', 'ジャイロ・速い', 'E 大きく包む', 'G ヘアライン', 'B ジャイロ交差', 'ジャイロ・直交'],
  reel:   ['C 薄い皿', 'D 立ちクロス', 'I 大小の入れ子', 'A カンプ通り', 'B 深く交差', 'E 大きく包む', 'アトム 4本', 'アトム 6本', 'アトム 8本', '花のリング', 'H 縦のクロス', 'J 地平線', 'K 斜めの流れ', 'ジャイロ・直交', 'ジャイロ・斜めの流れ', 'G ヘアライン', 'ジャイロ・速い'],
  mesh:   ['J 地平線', 'F 立ちクロスの網', 'ジャイロ・斜めの流れ', 'H 縦のクロス', '花のリング', '土星の輪', 'G ヘアライン', 'ジャイロ・縦のクロス', 'アトム 8本', 'アトム 6本', 'アトム 4本', 'ジャイロ・直交', 'ジャイロ・ゆるやか', 'B まばらな星座', 'ジャイロ・速い'],
  accre:  ['B 大きく薄い円盤', 'E 大きく包む円盤', 'F 惑星に密着', 'G ヘアライン', 'J 地平線', 'ジャイロ・直交', 'L 前後を貫く軌道', 'H 縦のクロス', 'I 大小の入れ子', 'K 斜めの流れ', 'C 軌道つき・きつい渦', 'ジャイロ・速い', 'ジャイロ・斜めの流れ', 'ジャイロ・縦のクロス', 'ジャイロ・ゆるやか'],
  duplex: ['C 大きく弧を描く', 'G ヘアライン', 'I 大小の入れ子', 'J 地平線', 'ジャイロ・直交', 'ジャイロ・速い', 'E 遠くから長い線', 'B まっすぐ放射', 'F 密な短い線', 'H 縦のクロス', 'K 斜めの流れ', 'ジャイロ・縦のクロス', 'ジャイロ・斜めの流れ', 'D 立ちクロスの線'],
  gyro:   ['F 片寄せジャイロ', 'G ヘアライン', 'I 大小の入れ子', 'J 地平線', 'D 高速スピン', 'A 標準のジャイロ', 'E 同じ向きで転がる', '花のリング', 'アトム 4本', 'アトム 6本', 'アトム 8本', '土星の輪', 'C ゆっくり大きく', 'K 斜めの流れ'],
  beads:  ['G ヘアライン', 'J 地平線', 'ジャイロ・斜めの流れ', 'ジャイロ・縦のクロス', 'ジャイロ・速い', 'ジャイロ・直交', 'H 縦のクロス', 'A 標準', 'B 細かい粒', 'I 大小の入れ子', 'K 斜めの流れ', 'F 惑星に寄るリング', 'D 立ちクロスのリング', 'E 大きいリング', 'ジャイロ・ゆるやか'],
  spiral: ['J 地平線' /* 2026-09-01: A4をB3(J 地平線・横揺れ)へ移動 */, 'C ゆったり大回り', 'E 大きく包む渦', 'F 近くで速い渦', 'G ヘアライン', 'I 大小の入れ子', 'K 斜めの流れ', 'H 縦のクロス', 'B 大げさな渦巻き', 'アトム 8本', '花のリング', 'アトム 6本', 'ジャイロ・縦のクロス', 'ジャイロ・斜めの流れ'],
};
/* 【2026-08-30 ヒデさん指定】devで削除したバリエーションの完全削除ぶん(設定ダンプのhiddenを焼き込み)。
   VARIANT_REMOVED と合わせて恒久除外＝メニューにも復元一覧にも出ない。 */
const VARIANT_REMOVED_EXTRA = {"off":["H 縦のクロス","C 薄く広がる皿","A カンプ通り","D 立ちクロス"],"reel":["F 惑星に寄る","P1 プリセット 1","P4 プリセット 7","P5 プリセット 14","P6 プリセット 16","ジャイロ・縦のクロス","P2 プリセット 4","ジャイロ・ゆるやか","J 地平線・横揺れ"],"mesh":["E 細かいケージ","C 包囲ケージ","P5 プリセット 5","P3 プリセット 3","K 斜めの流れ","P4 プリセット 4","I 大小の入れ子","A ふわふわ漂う"],"accre":["D 立ちクロス＋円盤","P3 プリセット 3","P4 プリセット 4","P1 プリセット 1","P2 プリセット 2"],"duplex":["A 標準","ジャイロ・ゆるやか"],"gyro":["B 立ちクロスで転がる","H 縦のクロス"],"beads":["P2 プリセット 2","P3 プリセット 3","P1 プリセット 1"],"spiral":["コメット","A 標準の渦","ジャイロ・速い","P2 プリセット 4","P4 プリセット 7","P8 プリセット 12","P12 プリセット 19","P13 プリセット 20","P14 プリセット 21","P16 プリセット 22","土星の輪","ジャイロ・ゆるやか","P3 プリセット 6","ジャイロ・直交","D 立ちクロスの渦","周回レイアウトで吸収","P15 プリセット 21","P5 プリセット 8"],"glowKind":["ripple"],"valSaas":["S1","S5","S8","S16","S10","S17","S4","S3"],"valAi":["A24","A1","A6","A8","A10","A16","A22","A25","A26","A28","A29","A31","A32","A23","A27","A30","A4"],"glowEcho":[],"resFx":["4","6","11","13","14","15","16","17","19","21","5","12","23","27","29","31","32","34","35","36","28","38","40","41","24","25","37","39","22","33","30","10","18","1","default","20","24-2","24-5","24-3"],"cvStyle":["11","13","12","1"],"cvColor":["C4","C5","C6","C8","C9","C10","C7"],"visGrad":["1"],"devStyle":["4","6","7","9","10","13","14","15","12","3","2","5","8","1"],"cvShape":["1","2","3","4","5"],"caseHover":["ct-brand","ct-gray","nolines"],"formStyle":["5","2"],"hdrMode":["2","3","4","6","7","9","11","13","14","10","15","1"],"burgerIcon":["3","4","5"],"cvSway":["1","2","3","4","5","6"],"devTone":["blue","cyan","pink"],"pictoSpeed":["0.7","1.4","1.9"],"darkVar":["1","3","4"],"cvfCardBorder":["k"],"cvfInBorder":["k"],"cvfPh":["w"]};   /* 2026-09-20 追加(ヒデさん依頼・完全削除): resFx default/20/24-2/24-5/24-3、devTone blue/cyan/pink、pictoSpeed 0.7/1.4/1.9、darkVar 1/3/4、cvfCardBorder k、cvfInBorder k、cvfPh w */   /* 2026-09-16 追加: フォームスタイル2/5・ヘッダー案2/3/4/6/7/9/11/13 を完全削除(焼き込み) / 2026-09-15 最新化: お問い合わせの案1・ウェーブ造形1〜5、開発者体験モックの案 4/6/7/9/10/13/14/15 を追加(定義とCSS・シェーダも削除済み) / 2026-09-18 追加: ピクト S3・A30・A4、実績の案 1/10/18、開発者体験モックの案 1/5/8、お問い合わせの揺らぎ 1〜6、エフェクト「波紋」(ripple)(定義・CSS・シェーダも削除済み) */
const variantRemoved = (m, name) => (VARIANT_REMOVED[m] || []).includes(name) || (VARIANT_REMOVED_EXTRA[m] || []).includes(name);
/* 【2026-08-29 ヒデさん指定】variantRow(glowEcho/valSaas/valAi)は key で管理するので、key で恒久除外する。 */
const VARIANT_REMOVED_KEY = {
  glowEcho: ['k5', 'k6', 'k9', 'k1', 'k4', 'k8'],
  valSaas:  ['S13', 'S14', 'S12', 'S11', 'S6', 'S15'],   /* 2026-08-30: S1 を新For SaaS既定にしたので除外リストから外す */
  valAi:    ['A2', 'A11', 'A14', 'A15', 'A12', 'A9', 'A7', 'A19', 'A17', 'A3', 'A5', 'A18'],
};
const variantRemovedKey = (bucket, key) => (VARIANT_REMOVED_KEY[bucket] || []).includes(key) || (VARIANT_REMOVED_EXTRA[bucket] || []).includes(key);
/* 【2026-09-15 ヒデさん指定】「消した案」の控え(gfxVariantHidden)の最新化。
   焼き込み済み(=コードから恒久的に消えている)案が控えに残ったままだと、「完全削除リストをコピー」に毎回その古い案まで混ざって出る。
   焼き込み済みぶん・重複を控えから外す(見た目は変わらない: 焼き込み済みはどのみち一覧に出ない)。変わった時だけ保存 */
function hiddenListRefresh() {
  const h = params && params.gfxVariantHidden; if (!h || typeof h !== 'object') return false;
  let changed = false;
  for (const m in h) {
    if (!Array.isArray(h[m])) continue;
    const seen = new Set();
    const keep = h[m].filter(nm => { if (seen.has(nm) || variantRemoved(m, nm) || variantRemovedKey(m, nm)) return false; seen.add(nm); return true; });
    if (keep.length !== h[m].length) { h[m] = keep; changed = true; }
  }
  if (changed) { try { presetStoreSave(); } catch (e) {} }
  return changed;
}
/* ===== さらに5案 (2026-08-27 ヒデさん指定) =====
   狙う印象は【先進的 / 上品 / 洗練】。A〜F より思い切って見た目を変える。
   ⚠️ デザイン(惑星・軌道・ドットの絵)は変えない。変えるのは配置と、その案のつまみだけ。
   同じ5つがどの案にも並ぶので、案をまたいで見比べられる。 */
const GFX_LOOKS2 = [
  { key: 'hair', name: 'G ヘアライン', spin: 0.12,
    desc: '軌道を大きく広げ、粒をごく小さく。細い線だけが遠くを走る、いちばん静かで上品な形。',
    gfx: { outer: { scale: 1.45, flat: 0.62 }, inner: { scale: 1.36, flat: 0.58 }, planet: { scale: 0.62, dy: 44 } },
    common: { dotSize: 0.55 } },
  { key: 'portrait', name: 'H 縦のクロス', spin: 1.1,
    desc: '輪を縦に立てて交差させます。横に流れる普通の形と真逆で、いちばん目を引きます。',
    gfx: { outer: { scale: 0.92, flat: 2.4, angle: 66 }, inner: { scale: 0.84, flat: 2.3, angle: -58 }, planet: { scale: 0.86 } } },
  { key: 'nested', name: 'I 大小の入れ子', spin: 0.22,
    desc: '外を大きく、内をぐっと小さく。大小の差で奥行きが出て、構造がある印象になります。',
    gfx: { outer: { scale: 1.5, flat: 0.78 }, inner: { scale: 0.6, flat: 1.05 }, planet: { scale: 0.72, dy: 48 } } },
  { key: 'horizon', name: 'J 地平線', spin: 0,
    desc: '輪を水平に寝かせて細い帯に。大きな惑星が帯の上に浮かび、静かで洗練された佇まいになります。',
    /* ⚠️ angle は基準の傾き(-23.33°)を打ち消す値。そのままだと「斜めの直線2本」に見えた(実測) */
    gfx: { outer: { scale: 1.12, flat: 0.26, angle: 23.33 },
           inner: { scale: 0.98, flat: 0.22, angle: 23.33 },
           planet: { scale: 1.16, dy: 54 } } },
  { key: 'rising', name: 'K 斜めの流れ', spin: 0.75,
    desc: '2本とも右肩上がりに傾け、惑星を左下へ。対角に流れる非対称な構図で、動きが出ます。',
    gfx: { layout: 'gyro',
           outer: { scale: 1.16, flat: 0.9, angle: 52, dy: -18 },
           inner: { scale: 1.04, flat: 1.05, angle: 44, dy: 14 },
           planet: { scale: 0.9, dx: -24, dy: 40 } } },
];
/* 案ごとの味付け。書いていない組み合わせは、その案の既定のつまみのまま */
const LOOK_TUNE = {
  reel:   { hair:     { blend: 2, blendAlpha: 0.14, T: 8.4, depth: 0.98, shrinkAt: 0.34, endAt: 0.84, moveDur: 0.22, inDur: 0.26 },
            portrait: { blend: 4, blendAlpha: 0.28, T: 7.8, shrinkAt: 0.36, endAt: 0.82, moveDur: 0.20, inDur: 0.24 },
            nested:   { blend: 0, T: 7.4, shrinkAt: 0.36, endAt: 0.82, moveDur: 0.20, inDur: 0.24 },
            horizon:  { blend: 5, blendAlpha: 0.20, T: 8.6, shrinkAt: 0.32, endAt: 0.84, moveDur: 0.24, inDur: 0.26 },
            rising:   { blend: 3, blendAlpha: 0.26, T: 7.0, shrinkAt: 0.36, endAt: 0.82, moveDur: 0.20, inDur: 0.22 } },
  spiral: { hair:     { count: 40, size: 0.34, life: 12, speed: 0.4, stay: 6, swirl: 1.2 },
            portrait: { count: 24, size: 0.6,  life: 9,  speed: 0.6, stay: 4, swirl: 2.2, fallCurve: 1.6 },
            nested:   { count: 20, size: 0.7,  life: 10, speed: 0.5, stay: 5.5, swirl: 1.6 },
            horizon:  { count: 18, size: 0.8,  life: 11, speed: 0.45, stay: 6, swirl: 0.4, fallCurve: 0.8 },
            rising:   { count: 28, size: 0.5,  life: 9,  speed: 0.6, stay: 4.5, swirl: 1.8 } },
  accre:  { hair:     { scale: 2.4,  count: 1800, size: 0.18, fall: 0.3,  speed: 0.28, twinkle: 0.8, showOrbit: false },
            portrait: { scale: 1.0,  count: 1100, size: 0.34, fall: 0.5,  speed: 0.5,  showOrbit: true, swirl: 1.6 },
            nested:   { scale: 0.7,  count: 1000, size: 0.34, fall: 0.55, speed: 0.55, showOrbit: true, swirl: 1.8 },
            horizon:  { scale: 1.6,  count: 1400, size: 0.24, fall: 0.4,  speed: 0.35, swirl: 0.5, showOrbit: false },
            rising:   { scale: 1.25, count: 1100, size: 0.3,  fall: 0.5,  speed: 0.5,  swirl: 1.4, wobble: 0.5, showOrbit: true } },
  mesh:   { hair: { style: 'cage', nodes: 46, cageR: 2.9, cageSpin: 0.45, cageLinks: 3, cageTilt: -10,
                    lineAlpha: 0.3, lineWidth: 0.7, size: 0.3, random: 0.3 },
            portrait: { style: 'cage', nodes: 30, cageR: 1.7, cageSpin: 1.4, cageLinks: 4, cageTilt: -62,
                        lineAlpha: 0.5, lineWidth: 1, size: 0.45 },
            nested: { style: 'constellation', nodes: 16, span: 0.4, lineAlpha: 0.34, lineWidth: 0.9,
                      drift: 1.2, random: 0.8, size: 0.6 },
            horizon: { style: 'organic', nodes: 18, span: 0.5, lineAlpha: 0.4, lineWidth: 1,
                       drift: 0.7, random: 0.4, size: 0.55 },
            rising: { style: 'cage', nodes: 32, cageR: 2.0, cageSpin: 0.9, cageLinks: 3, cageTilt: 34,
                      lineAlpha: 0.45, lineWidth: 0.9, size: 0.42 } },
  beads:  { hair: { count: 520, size: 0.3, ratio: 0.12, speed: 0.2, life: 5 },
            portrait: { count: 300, size: 0.55, ratio: 0.26, spin: 1.2, spinEase: 1.3 },
            nested: { count: 300, size: 0.52, ratio: 0.2, speed: 0.3, backIn: 1.6 },
            horizon: { count: 380, size: 0.4, ratio: 0.14, speed: 0.22, life: 4.2 },
            rising: { count: 300, size: 0.5, ratio: 0.28, speed: 0.36, spin: 0.9 } },
  duplex: { hair: { curve: 0.5, density: 0.9, lineAlpha: 0.14, lineWidth: 0.4, size: 0.42, speed: 0.8, T: 5.2 },
            portrait: { curve: 0.2, density: 1.4, lineAlpha: 0.28, lineWidth: 1.1, size: 0.55, speed: 1.2 },
            nested: { curve: 0.35, density: 1.2, lineAlpha: 0.22, lineWidth: 0.9, size: 0.6 },
            horizon: { curve: 0.08, density: 1.8, lineAlpha: 0.24, lineWidth: 1.4, size: 0.5, speed: 1.1 },
            rising: { curve: 0.4, density: 1.3, lineAlpha: 0.26, lineWidth: 1, size: 0.55, speed: 1.15 } },
  gyro:   { hair: { tumble: 0.6, spin: 0.7, phase: 90, thin: 0.02, pull: 0.3, pullT: 7 },
            portrait: { tumble: 1.3, spin: 1.5, phase: 90, thin: 0.04, pull: 0.25, pullT: 4 },
            nested: { tumble: 0.9, spin: 1.0, phase: 120, thin: 0.05, pull: 0.45, pullT: 5.5 },
            horizon: { tumble: 0.7, spin: 0.6, phase: 30, thin: 0.03, pull: 0.2, pullT: 6.5 },
            rising: { tumble: 1.5, spin: 1.3, phase: 150, thin: 0.04, pull: 0.35, pullT: 4.2 } },
};
/* 案ごとの「全体の速さ」。①はゆったり見せたいので長めに取る (2026-08-27 ヒデさん指定) */
const LOOK_ROOT = {
  reel:   { hair: { duration: 38 }, portrait: { duration: 34 }, nested: { duration: 34 },
            horizon: { duration: 36 }, rising: { duration: 32 } },
  /* ②③も渦がゆっくり見えるよう長めに (2026-08-28 ヒデさん指定) */
  spiral: { hair: { duration: 38 }, portrait: { duration: 34 }, nested: { duration: 36 },
            horizon: { duration: 38 }, rising: { duration: 34 } },
  accre:  { hair: { duration: 38 }, portrait: { duration: 34 }, nested: { duration: 34 },
            horizon: { duration: 38 }, rising: { duration: 34 } },
};
/* ①だけ、軌道の回転を落ち着かせる(共通の値だと速すぎた) */
const LOOK_SPIN = {
  reel:   { hair: 0.05, portrait: 0.10, nested: 0.07, horizon: 0, rising: 0.09 },   /* 2026-08-28 さらにゆっくりへ */
  spiral: { hair: 0.08, portrait: 0.2,  nested: 0.12, horizon: 0, rising: 0.15 },
  accre:  { hair: 0.08, portrait: 0.2,  nested: 0.12, horizon: 0, rising: 0.15 },
};
/* どの案にも G〜K を同じ順で足す */
for (const mode in GFX_VARIANTS) {
  for (const L of GFX_LOOKS2) {
    const tune = (LOOK_TUNE[mode] || {})[L.key];
    const spin = ((LOOK_SPIN[mode] || {})[L.key] != null) ? LOOK_SPIN[mode][L.key] : L.spin;
    GFX_VARIANTS[mode].push({
      name: L.name, desc: L.desc, gfx: L.gfx,
      conv: tune || undefined,
      common: { orbitSpin: spin, ...(L.common || {}) },
      root: (LOOK_ROOT[mode] || {})[L.key],
    });
  }
}
/* ===== どの案にも「ジャイロ版」を3つずつ足す (2026-08-28 ヒデさん指定) =====
   ⑦の【輪が独楽のように転がる動き】を、他の案にも混ぜたもの。
   ⚠️ ④網でつながる は輪そのものを使わない(ノードと骨で描く)ので、転がりが乗らない。
      代わりに【カゴの傾きと回転】を振ったものを3つ入れる(別のアニメーションでよい、との指定)。 */
const GYRO_MIX_SETS = [
  { name: 'ジャイロ・ゆるやか', mix: 0.45, spin: 0.1,
    desc: '⑦の転がりを控えめに混ぜます。輪がゆっくり傾きながら回り、奥行きだけが増します。',
    gyro: { tumble: 0.45, spin: 0.5, phase: 90, thin: 0.18, pull: 0.15, pullT: 8 } },
  { name: 'ジャイロ・直交', mix: 0.9, spin: 0.15,
    desc: '2本を直交させて転がします。いちばんジャイロらしく、球の骨組みが回っているように見えます。',
    gyro: { tumble: 0.9, spin: 1.0, phase: 90, thin: 0.06, pull: 0.28, pullT: 5.5 } },
  { name: 'ジャイロ・速い', mix: 1, spin: 0.25,
    desc: '転がりを強く速く。装置が高速で稼働しているような、機械的で先進的な印象になります。',
    gyro: { tumble: 1.8, spin: 1.9, phase: 90, thin: 0.03, pull: 0.2, pullT: 3.2 } },
];
/* ④網でつながる 用の代替3案(カゴの傾き・回転を振る) */
const MESH_GYRO_SETS = [
  { name: 'ジャイロ・ゆるやか', desc: 'カゴをゆっくり傾けて回します。奥行きが静かに出ます。',
    conv: { style: 'cage', nodes: 28, cageR: 1.9, cageSpin: 0.4, cageLinks: 3, cageTilt: -46,
            lineAlpha: 0.42, lineWidth: 1, size: 0.45, random: 0.4, hop: 0.5, rate: 1.6 } },
  { name: 'ジャイロ・直交', desc: 'カゴをほぼ真横に倒して回します。輪が直交しているように見えます。',
    conv: { style: 'cage', nodes: 30, cageR: 1.75, cageSpin: 1.0, cageLinks: 4, cageTilt: -80,
            lineAlpha: 0.5, lineWidth: 1, size: 0.45, random: 0.3, hop: 0.42, rate: 2 } },
  { name: 'ジャイロ・速い', desc: 'カゴを速く回します。機械的で先進的な印象。',
    conv: { style: 'cage', nodes: 34, cageR: 1.55, cageSpin: 2.2, cageLinks: 3, cageTilt: -24,
            lineAlpha: 0.5, lineWidth: 0.9, size: 0.4, random: 0.2, hop: 0.3, rate: 2.6 } },
];
/* 【2026-08-28 ヒデさん指定】①はゆったり見せたいので、ジャイロ版も転がりを大幅に落とす。
   ⑦そのもの(独立した案)は速いままでよい */
const GYRO_SLOW_REEL = [
  { mix: 0.30, spin: 0.04, gyro: { tumble: 0.16, spin: 0.16, phase: 90, thin: 0.30, pull: 0.10, pullT: 14 } },
  { mix: 0.50, spin: 0.06, gyro: { tumble: 0.24, spin: 0.26, phase: 90, thin: 0.22, pull: 0.16, pullT: 12 } },
  { mix: 0.70, spin: 0.08, gyro: { tumble: 0.34, spin: 0.38, phase: 90, thin: 0.16, pull: 0.20, pullT: 10 } },
];
for (const mode in GFX_VARIANTS) {
  if (mode === 'gyro') continue;                 /* ⑦そのものには足さない */
  if (mode === 'mesh') {
    for (const M of MESH_GYRO_SETS) {
      GFX_VARIANTS.mesh.push({ name: M.name, desc: M.desc, gfx: GFX_LOOKS.cross, conv: M.conv,
                               common: { orbitSpin: 0 } });
    }
    continue;
  }
  GYRO_MIX_SETS.forEach((G, gi) => {
    const slow = (mode === 'reel') ? GYRO_SLOW_REEL[gi] : null;
    GFX_VARIANTS[mode].push({
      name: G.name,
      desc: slow ? G.desc.replace('。', '。①はゆったり見せたいので、転がりはかなり抑えてあります。') : G.desc,
      gfx: { layout: 'gyro', outer: { scale: 1.04 }, inner: { scale: 0.96, flat: 1.1 }, planet: { scale: 0.9, dy: 42 } },
      gyro: slow ? slow.gyro : G.gyro,
      common: { orbitSpin: slow ? slow.spin : G.spin, gyroMix: slow ? slow.mix : G.mix },
      root: { duration: mode === 'reel' ? 38 : 34 },
    });
  });
}

/* ===== ⑦の「縦のクロス」「斜めの流れ」の動きをする案を、①〜⑥にも入れる (2026-08-28 ヒデさん指定) =====
   配置は G〜K と同じ型(portrait / rising)を使い、そこに⑦の転がりを混ぜたもの。
   ⚠️ ④網でつながる は輪を使わないので転がりが乗らない。
      代わりに、同じ向き(縦/斜め)に見えるカゴの傾きで入れる。 */
const GYRO_LOOK_SETS = [
  { key: 'portrait', name: 'ジャイロ・縦のクロス',
    desc: '縦に立てて交差させた輪が、そのまま転がります。球の骨組みが縦向きに回っているように見えます。',
    gfx: GFX_LOOKS2[1].gfx,
    gyro: { tumble: 0.8, spin: 0.9, phase: 90, thin: 0.08, pull: 0.26, pullT: 6 },
    slow: { tumble: 0.22, spin: 0.24, phase: 90, thin: 0.22, pull: 0.16, pullT: 12 },
    mix: 0.85, slowMix: 0.45, spin2: 0.12, slowSpin: 0.06,
    mesh: { style: 'cage', nodes: 30, cageR: 1.8, cageSpin: 0.9, cageLinks: 4, cageTilt: -78,
            lineAlpha: 0.48, lineWidth: 1, size: 0.45, random: 0.3, hop: 0.45, rate: 1.9 } },
  { key: 'rising', name: 'ジャイロ・斜めの流れ',
    desc: '右肩上がりに傾けた輪が転がります。惑星は左下寄り。対角に流れる非対称な動きになります。',
    gfx: GFX_LOOKS2[4].gfx,
    gyro: { tumble: 0.7, spin: 0.8, phase: 140, thin: 0.1, pull: 0.3, pullT: 6.5 },
    slow: { tumble: 0.2, spin: 0.22, phase: 140, thin: 0.24, pull: 0.18, pullT: 13 },
    mix: 0.8, slowMix: 0.4, spin2: 0.1, slowSpin: 0.05,
    mesh: { style: 'cage', nodes: 28, cageR: 2.0, cageSpin: 0.8, cageLinks: 3, cageTilt: 42,
            lineAlpha: 0.45, lineWidth: 0.95, size: 0.44, random: 0.35, hop: 0.5, rate: 1.7 } },
];
for (const mode of ['reel', 'spiral', 'accre', 'mesh', 'beads', 'duplex']) {
  for (const G of GYRO_LOOK_SETS) {
    if (mode === 'mesh') {
      GFX_VARIANTS.mesh.push({ name: G.name, desc: G.desc, gfx: G.gfx, conv: G.mesh,
                               common: { orbitSpin: 0 } });
      continue;
    }
    const slow = (mode === 'reel');            /* ①はゆったり見せたいので抑える */
    GFX_VARIANTS[mode].push({
      name: G.name,
      desc: slow ? G.desc + '（①はゆったり見せたいので、転がりは抑えてあります）' : G.desc,
      gfx: G.gfx,
      gyro: slow ? G.slow : G.gyro,
      common: { orbitSpin: slow ? G.slowSpin : G.spin2, gyroMix: slow ? G.slowMix : G.mix },
      root: { duration: slow ? 38 : 34 },
    });
  }
}

/* 【2026-08-28 ヒデさん指定】③(粒の渦が回る)に、立体感(3D)が出る案を足す。
   軌道を出したまま【惑星の手前を通る半分】と【奥へ回る半分】をはっきり見せる。
   ・輪を起こして大きめにし、惑星の前後を大きく横切らせる
   ・手前のものは隠さない(frontCut:false)ので、輪と粒が惑星の前を堂々と通る
   ・円盤は控えめにして、輪の前後関係が読み取れるようにする */
GFX_VARIANTS.accre.push({
  name: 'L 前後を貫く軌道',
  desc: '軌道を出したまま立てて、惑星の手前を通る半分と奥へ回る半分をはっきり見せます。手前のものを隠さないので、輪と粒が惑星の前を横切って立体的に見えます。',
  gfx: { layout: 'gyro',
         outer: { scale: 1.18, flat: 1.55, angle: -34 },
         inner: { scale: 1.02, flat: 1.65, angle: 30 },
         planet: { scale: 0.86, dy: 44 } },
  conv: { scale: 0.78, count: 900, size: 0.32, showOrbit: true, swirl: 1.5, fallCurve: 1.2, wobble: 0.25 },
  common: { orbitSpin: 0.22, frontCut: false, dotSize: 1.1 },
  root: { duration: 34 },
});
/* 【2026-08-30 ヒデさん指定】プリセット(devで保存した35個)を正式バリエーションへ昇格。
   preset: を持つバリエーションは、適用時にプリセットとまったく同じ関数(gfxApplyFull)で
   全設定を再現する(変換ロスなし)。プリセットのチップ自体は「確認できるまで」残してある。 */
for (const _pm in SHIPPED_PRESETS) {
  if (!GFX_VARIANTS[_pm]) continue;
  (SHIPPED_PRESETS[_pm] || []).forEach((p, pi) => {
    GFX_VARIANTS[_pm].push({
      name: 'P' + (pi + 1) + ' ' + p.name,   /* 同名プリセットがあっても取り違えないよう一意化 */
      desc: 'プリセット「' + p.name + '」から昇格した案。',
      preset: p.data,
    });
  });
}
/* 【2026-09-01 ヒデさん指定】A4「J 地平線」を収縮(B)グループへ移動。
   reel(収縮)バケットの新案として追加し、収縮はB1(土星系reel)のhorizon調整値、
   さらにこの案だけの「横揺れ」(内外の輪の左右ゆれ)を既定オンにする。
   元のA4(spiral側のJ 地平線)は VARIANT_REMOVED.spiral で恒久除外。 */
GFX_VARIANTS.reel.push({
  name: 'J 地平線・横揺れ',
  desc: '輪を水平に寝かせた地平線レイアウトの収縮版。内側の輪が吸い込まれ、内外の輪を左右にゆらせます。振れ幅・周期・ディレイ・揺れ方は「横揺れ（この案）」で調整。',
  gfx: GFX_LOOKS2[3].gfx,                     /* J 地平線と同じ配置(horizon) */
  conv: (LOOK_TUNE.reel || {}).horizon,        /* 収縮の味付けはreelのhorizon調整値 */
  common: { orbitSpin: 0 },
  hsway: true,
});

/* 案キー → params.conv の中のどのつまみ束か (duplex だけ名前が link) */
const CONV_PARAM_KEY = { reel: 'reel', spiral: 'spiral', accre: 'accre', mesh: 'mesh', beads: 'beads', duplex: 'link', gyro: 'gyro' };
/* 双方向(ラインで結ぶ)系のモード。共通エンジンで動かす */
const CONV_LINKED = ['duplex'];
function convOn() { return params.kvDesign === 'planet' && (params.converge || 'off') !== 'off'; }
/* いまの案で「ドット自体の移動(周回)」を動かすか。案ごとに切り替えられる */
function convDotMoves() {
  const m = params.conv && params.conv.dotMove;
  if (!m) return true;
  const k = params.converge || 'reel';
  return m[k] !== false;
}
const convDotF = DOTS.map(() => 1);   // ドットごとの「惑星への寄せ」(1=軌道上 → 0=惑星中心)
const convDotA = DOTS.map(() => 1);   // ドットごとの濃さ倍率 (集約アニメ用)
let convGlow = 0;                     // 吸収の瞬間、惑星がふっと明るくなる(減衰)
let applyingVariant = false;          // 案を適用中は「案ごとの調整の記録」を止める
/* 【2026-08-29 ヒデさん指定】案ごとに調整値を独立させる: いま選んでいる案の状態を、その案専用に控える */
function gfxTouchVariant() {
  if (applyingVariant || !params || !params.conv) return;
  /* 【2026-08-30 ヒデさん指定・バグ修正】案を切り替えた直後の markDirty では保存しない。
     ⚠️ convSwitchTo 直後は「形だけ新モード・つまみは前モードのまま」の混合状態で、
        これを控え(gfxTweaks)に保存すると、次にその案を開いた時に混合状態が復元されていた。 */
  if (gfxJustSwitched) { gfxJustSwitched = false; return; }
  const m = params.converge || 'off';
  const idx = (params.gfxVariantOn || {})[m];
  if (idx == null) return;
  /* 【2026-08-30 ヒデさん指定】プリセット昇格案は「常にプリセットの数値」なので控えを取らない */
  const vv = (typeof GFX_VARIANTS !== 'undefined' && GFX_VARIANTS[m] || [])[idx];
  if (vv && vv.preset) return;
  if (!params.gfxTweaks) params.gfxTweaks = {};
  if (!params.gfxTweaks[m]) params.gfxTweaks[m] = {};
  try { params.gfxTweaks[m][idx] = gfxSnapshotFull(); } catch (e) {}
}
let gfxJustSwitched = false;   /* convSwitchTo 直後の混合状態を控えに入れないためのフラグ */
let convGlowLast = -1e9;              // 最後に「エフェクトを出した」時刻
let convGlowN = 0;                    // 取り込みイベントの通し番号(回数モード用)
let convGlowBurst = -1e9;             // いま出している一連(バースト)の開始時刻
/* 【2026-08-28 ヒデさん指定】エフェクトの出方を3つから。
     every … 取り込みのたびに毎回(従来)
     count … N回の取り込みに1回だけ出す(粒が0.1秒ごとに入っても、まびいて出す)
     time  … 前に出してから N秒たっていなければ出さない
   ⚠️ 取り込みは1回でも「粒がパラパラ入る」と細かく何度も呼ばれる。
      出したバーストの直後(0.4秒)は同じ取り込みの積み増しとして必ず通し、光を育てる。
      それを1イベントとは数えない。 */
function convAddGlow(amt) {
  const C = params.conv || {};
  const mode = C.fxMode || 'every';
  const sinceBurst = elapsed - convGlowBurst;
  if (sinceBurst >= 0 && sinceBurst < 0.4) {   // 同じ取り込みの続き = 常に通す
    convGlow = Math.min(1.2, convGlow + amt);
    return;
  }
  /* ここからは「新しい取り込みイベント」 */
  convGlowN++;
  let allow = true;
  if (mode === 'count') {
    const every = Math.max(1, Math.round(C.fxCount || 10));
    allow = (convGlowN % every === 0);
  } else if (mode === 'time') {
    const every = Math.max(0, C.fxEvery || 0);
    allow = (convGlowLast < -1e8) || (elapsed - convGlowLast >= every);
  }
  if (!allow) return;
  convGlow = Math.min(1.2, convGlow + amt);
  convGlowLast = elapsed;
  convGlowBurst = elapsed;
}
/* 【2026-08-28 ヒデさん指定】吸収を重ねるほど「データが強くなっていく」感じを出すための蓄積。
   吸収のたびに増え、glowHold 秒でゆっくり半分へ戻る。0〜1 */
let convCharge = 0;
/* 波紋(ripple)用: 惑星から広がる輪の残り時間 */
let convRipples = [];
let convRippleEls = null;
let convLastT = null;                 // elapsed 基準の dt (一時停止に追従)
let convWasOn = false;
let reelPWasOn = false;   /* 【2026-08-30】off(軌道のみ)での粒(吸い込み)の後片付け用 */
let convLastMode = null;              // モード切替の検知 (前のモードの粒・輪の片付け用)
const convSStep = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
/* 【2026-08-28 ヒデさん指定】広がりの慣性。0=一定(なめらかステップ)、1=最初速く→だんだん減速。
   水面の波紋のように、勢いよく広がってスッと落ち着く(慣性)見え方にする。 */
function convFxEase(u) {
  u = clamp01(u);
  const inr = clamp01((params.conv && params.conv.fxInertia != null) ? params.conv.fxInertia : 0.5);
  const smooth = u * u * (3 - 2 * u);
  const easeOut = 1 - Math.pow(1 - u, 2.6);
  return smooth * (1 - inr) + easeOut * inr;
}
/* 惑星(#sphere)の中心 = 集約先。CSS(left306.06 top112.32 260px角) + パネルの惑星オフセット */
function convCenter() {
  const pl = params.planet || {};
  return { x: 306.06 + 130 + (pl.dx || 0), y: 112.32 + 130 + (pl.dy || 0) };
}
/* 楕円 g を「惑星中心へ f で寄せた」ジオメトリ (f=1 そのまま → f→0 惑星中心で消える) */
function convGeom(g, f) {
  const c = convCenter();
  return { cx: c.x + (g.cx - c.x) * f, cy: c.y + (g.cy - c.y) * f,
           rx: g.rx * f, ry: g.ry * f, rot: g.rot };
}
/* --- 追加パーツのプール (見た目は既存パーツの複製) --- */
let convSpiral = null;   // ②の粒: 既存ドットと同じ circle を back/front に1個ずつ
let convSpiralBuilt = null;   // 作った時の {count, size}。パネルで変わったら作り直す
function convSpiralPool(S) {
  S = S || params.conv.spiral;   /* 2026-08-29: reel でも同じ粒を使えるよう設定を引数化 */
  const n = Math.max(1, Math.round(S.count));
  if (convSpiral && convSpiralBuilt && (convSpiralBuilt.count !== n || convSpiralBuilt.size !== S.size)) {
    for (const p of convSpiral) { p.back.remove(); p.front.remove(); }
    convSpiral = null;
  }
  if (convSpiral) return convSpiral;
  convSpiralBuilt = { count: n, size: S.size };
  const COLORS = ['#0EBBFF', '#FF5D97'];   // 既存ドットと同じ2色 (グレーはデータ感が無いので除外)
  convSpiral = [];
  for (let i = 0; i < n; i++) {
    const mk = () => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('r', (DOT_R * S.size).toFixed(3));   // 大きさはパネルから
      c.setAttribute('fill', COLORS[i % 2]);
      c.setAttribute('opacity', '0');
      return c;
    };
    const back = mk(), front = mk();
    dotsBackG.appendChild(back); dotsFrontG.appendChild(front);
    /* 【2026-08-26 ヒデさん指定】粒はまず軌道上(f=1)を回り、hold 秒たったら吸い込まれ始める */
    convSpiral.push({ back, front, ell: i % 2 ? 'inner' : 'outer',
      deg: Math.random() * 360, f: 1, mode: 0,
      age: Math.random() * Math.max(0.5, S.stay),                    // 出のタイミングをばらす
      hold: Math.max(0.3, S.stay * (0.5 + Math.random())),
      spd: (28 + Math.random() * 42), rate: 1 / (S.life * (0.7 + Math.random() * 0.6)) });
  }
  return convSpiral;
}
/* 【2026-08-29 ヒデさん指定】「粒が渦を描いて惑星へ吸い込まれる」動きを関数化。spiral 案の本体でもあり、
   収縮(reel)案でも粒オプションとして同じ動きを重ねられるようにする。geoms=軌道の楕円、S=粒の設定、dt=経過秒。 */
function runSpiralParticles(geoms, S, dt) {
  const pool = convSpiralPool(S);
  for (const p of pool) {
    /* 吸い込まれる間のスピン(巻き具合)。軌道にいる間は普通に回り、吸い込まれ始めると中心に近いほど速く回る(swirl) */
    const sw = Math.max(0, S.swirl == null ? 1 : S.swirl);
    const boost = (p.mode === 1 && sw > 0) ? Math.pow(Math.max(0.15, p.f), -sw) : 1;
    if (convDotMoves()) p.deg += p.spd * S.speed * boost * dt * (params.direction || 1);
    p.age += dt;
    if (p.mode === 0) {
      p.f = 1;                                                       // 軌道上に乗って回る
      if (p.age >= p.hold) p.mode = 1;
    } else {
      const fc = Math.max(0.1, S.fallCurve == null ? 1 : S.fallCurve);
      p.f -= p.rate * dt * Math.pow(Math.max(0.15, p.f), 1 - fc);     // 螺旋で吸い込まれる
      if (p.f <= 0.12) {                                             // 吸収 → 軌道上に生まれ直す
        convAddGlow(0.18);
        p.mode = 0; p.age = 0; p.f = 1;
        p.hold = Math.max(0.3, S.stay * (0.5 + Math.random()));
        p.deg = Math.random() * 360;
        p.ell = Math.random() < 0.5 ? 'inner' : 'outer';
        p.spd = 28 + Math.random() * 42;
        p.rate = 1 / (S.life * (0.7 + Math.random() * 0.6));         // 吸い込みの秒数はパネルから
      }
    }
    const fv = Math.max(0.12, Math.min(1, p.f));
    let al = 1;
    if (p.mode === 0 && p.age < 0.5) al = p.age / 0.5;               // 軌道上にフェードイン
    else if (fv < 0.26) al = (fv - 0.12) / 0.14;                     // 惑星際でフェードアウト
    const pos = posOn(convGeom(geoms[p.ell], fv), p.deg);
    const op = clamp01(al) * 0.9;
    const rr = (DOT_R * S.size * convDotK(pos.y, geoms[p.ell].cy, geoms[p.ell].ry)).toFixed(2);
    [p.back, p.front].forEach(el => { el.setAttribute('cx', pos.x); el.setAttribute('cy', pos.y); el.setAttribute('r', rr); el.setAttribute('opacity', op.toFixed(3)); });
    p.front.style.display = pos.front ? '' : 'none';
    p.back.style.display = pos.front ? 'none' : '';
  }
}
/* ===== 2026-08-26 追加: 糸 / メッシュ / ドット軌道 / 双方向(ラインで結ぶ7案) =====
   すべて「既存のドットと同じ circle」と「path(線)」だけで作る。惑星と軌道の見た目は変えない。 */
const CONV_BLUE = '#0EBBFF', CONV_PINK = '#FF5D97';
let convMesh = null, convBeads = null;   // ⑫メッシュ / ⑬ドット軌道 の状態
/* 【2026-09-02 ヒデさん指定】面がきれいに整った(潰れ・歪みなし)網の案用: 測地線球(正20面体を細分)。
   全頂点が球面に均等・全辺がほぼ同長=正多面体らしい整った面になる。freq=1で12頂点(正20面体)、2で42、3で162。 */
function buildGeodesic(freq) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],
               [0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
  let faces = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],
               [10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],
               [2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };
  verts = verts.map(norm);
  for (let s = 1; s < Math.max(1, freq); s++) {
    const mid = {}, nf = [];
    const midpoint = (a, b) => {
      const key = a < b ? a + '_' + b : b + '_' + a;
      if (mid[key] != null) return mid[key];
      const va = verts[a], vb = verts[b];
      verts.push(norm([(va[0]+vb[0])/2, (va[1]+vb[1])/2, (va[2]+vb[2])/2]));
      return (mid[key] = verts.length - 1);
    };
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = nf;
  }
  const eset = new Set(), edges = [];
  const addE = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (!eset.has(k)) { eset.add(k); edges.push([a, b]); } };
  for (const [a, b, c] of faces) { addE(a, b); addE(b, c); addE(c, a); }
  return { verts, edges };
}
/* 【2026-09-25 ヒデさん依頼・面の数を1個ずつ】フィボナッチ球(n点)を凸包で三角形分割した網。
   測地線球(buildGeodesic/vfBuild)は点が飛び飛び(12/42/92/162…)なので、点の数を1個ずつ変えたい時はこちら。
   球面上の点の凸包＝ドロネー分割なので、線が交差せず穴も空かない「少しラフな整った網」になる(辺=3n-6・面=2n-4 を n=8〜400 で検証済み)。
   向きは最初の四面体の重心(常に内側)から外向きに揃える。n=300 でも生成 約2ms・呼び出し側でキャッシュする。 */
function sphereFiboHull(n) {
  n = Math.max(8, Math.round(n));
  const P = [];
  for (let i = 0; i < n; i++) { const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = Math.PI * (1 + Math.sqrt(5)) * i; P.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const i0 = 0, i1 = n - 1, i2 = Math.floor(n / 2), i3 = Math.floor(n / 4);
  const C = [0, 1, 2].map(k => (P[i0][k] + P[i1][k] + P[i2][k] + P[i3][k]) / 4);
  const mk = (a, b, c) => { let nv = crs(sub(P[b], P[a]), sub(P[c], P[a])); const l = Math.hypot(nv[0], nv[1], nv[2]) || 1; nv = [nv[0] / l, nv[1] / l, nv[2] / l];
    if (dot(nv, sub(P[a], C)) < 0) { const t = b; b = c; c = t; nv = [-nv[0], -nv[1], -nv[2]]; } return { v: [a, b, c], n: nv, d: dot(nv, P[a]) }; };
  let F = [mk(i0, i1, i2), mk(i0, i1, i3), mk(i0, i2, i3), mk(i1, i2, i3)];
  const used = new Set([i0, i1, i2, i3]);
  for (let p = 0; p < n; p++) { if (used.has(p)) continue;
    const vis = [], keep = [];
    for (const f of F) (dot(f.n, P[p]) - f.d > 1e-10 ? vis : keep).push(f);
    if (!vis.length) continue;
    const cnt = new Map();
    for (const f of vis) for (let k = 0; k < 3; k++) { const a = f.v[k], b = f.v[(k + 1) % 3]; const key = a < b ? a + '_' + b : b + '_' + a; cnt.set(key, (cnt.get(key) || 0) + 1); }
    F = keep;
    for (const [key, c] of cnt) if (c === 1) { const [a, b] = key.split('_').map(Number); F.push(mk(a, b, p)); }
  }
  const es = new Set(), edges = [];
  for (const f of F) for (let k = 0; k < 3; k++) { const a = f.v[k], b = f.v[(k + 1) % 3]; const key = a < b ? a * 65536 + b : b * 65536 + a; if (!es.has(key)) { es.add(key); edges.push([Math.min(a, b), Math.max(a, b)]); } }
  return { verts: P, edges };
}
let convLine = null;   // 線(path)のプール。奥レイヤーに置く(惑星の後ろを通る線が自然に隠れる)
/* 【2026-08-27 ヒデさん指定】惑星を「包囲する」ケージ用の線。
   convLinePool の線は奥レイヤーにしか置けず、必ず惑星の後ろを通ってしまう。
   ケージは手前の骨も見えないと囲んでいるように見えないので、
   ドットと同じく【奥に1本・手前に1本】持ち、深さで描くほうを切り替える。 */
let convLine2 = null;
function convLine2Pool(n) {
  if (convLine2 && convLine2.length !== n) {
    for (const q of convLine2) { q.back.remove(); q.front.remove(); }
    convLine2 = null;
  }
  if (convLine2) return convLine2;
  convLine2 = [];
  const mk = (host, before) => {
    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('opacity', '0');
    host.insertBefore(el, before);
    return el;
  };
  for (let i = 0; i < n; i++) {
    convLine2.push({ back: mk(dotsBackG.parentNode, dotsBackG), front: mk(dotsFrontG.parentNode, dotsFrontG) });
  }
  return convLine2;
}
function convHideLines2() {
  if (convLine2) for (const q of convLine2) { q.back.setAttribute('opacity', '0'); q.front.setAttribute('opacity', '0'); }
}
function convLine2Set(q, A, B, color, w, op, front) {
  const d = `M${A.x.toFixed(1)},${A.y.toFixed(1)} L${B.x.toFixed(1)},${B.y.toFixed(1)}`;
  /* 【2026-09-02】色と太さは変わった時だけ書く(毎フレームのsetAttribute削減。dとopacityは毎回) */
  const sig = color + '|' + w;
  for (const el of [q.back, q.front]) {
    el.setAttribute('d', d);
    if (q._sig !== sig) { el.setAttribute('stroke', color); el.setAttribute('stroke-width', String(w)); }
  }
  q._sig = sig;
  q.front.setAttribute('opacity', front ? String(op) : '0');
  q.back.setAttribute('opacity', front ? '0' : String(op));
}
function convLinePool(n) {
  if (convLine && convLine.length !== n) { for (const el of convLine) el.remove(); convLine = null; }
  if (convLine) return convLine;
  convLine = [];
  const host = dotsBackG.parentNode;
  for (let i = 0; i < n; i++) {
    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('fill', 'none'); el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('opacity', '0');
    host.insertBefore(el, dotsBackG);
    convLine.push(el);
  }
  return convLine;
}
/* 【2026-08-29 ヒデさん指定】網の線を「惑星の前」にも通すためのプール(手前レイヤー・下半分だけクリップ)。
   これで平面の網でも、惑星が網の中に入れ子に見える。 */
let convLineFront = null, convMeshFrontClip = null;
function convLineFrontPool(n) {
  if (convLineFront && convLineFront.length !== n) { for (const el of convLineFront) el.remove(); convLineFront = null; }
  if (convLineFront) return convLineFront;
  convLineFront = [];
  const frontHost = dotsFrontG.parentNode;
  if (!convMeshFrontClip) {
    let defs = frontHost.querySelector('defs');
    if (!defs) { defs = document.createElementNS(SVG_NS, 'defs'); frontHost.insertBefore(defs, frontHost.firstChild); }
    const cp = document.createElementNS(SVG_NS, 'clipPath'); cp.setAttribute('id', 'meshFrontClip');
    const r = document.createElementNS(SVG_NS, 'rect'); r.setAttribute('x', -4000); r.setAttribute('y', 0); r.setAttribute('width', 12000); r.setAttribute('height', 8000);
    cp.appendChild(r); defs.appendChild(cp); convMeshFrontClip = r;
  }
  for (let i = 0; i < n; i++) {
    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('fill', 'none'); el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('opacity', '0'); el.setAttribute('clip-path', 'url(#meshFrontClip)');
    frontHost.insertBefore(el, dotsFrontG);
    convLineFront.push(el);
  }
  return convLineFront;
}
/* 粒(circle)のプール。【2026-08-26 ヒデさん指定】惑星の後ろに回ったものは透けさせず消すため、
   奥(layer-back)と手前(layer-front)に1個ずつ持ち、front 判定で描くほうを切り替える。
   奥レイヤーは惑星canvas(z-index:2)の下にあるので、惑星に隠れて自然に見えなくなる。 */
let convPkt = null;
function convPktPool(n) {
  if (convPkt && convPkt.length !== n) { for (const p of convPkt) { p.el.remove(); p.back.remove(); } convPkt = null; }
  if (convPkt) return convPkt;
  convPkt = [];
  for (let i = 0; i < n; i++) {
    const mk = () => { const c = document.createElementNS(SVG_NS, 'circle'); c.setAttribute('opacity', '0'); return c; };
    const el = mk(), back = mk();
    dotsFrontG.appendChild(el); dotsBackG.appendChild(back);
    convPkt.push({ el, back, k: -1, dir: 1, li: 0, hue: 0 });
  }
  return convPkt;
}
/* 粒を1つ描く。front=false なら奥レイヤーへ回して惑星に隠れさせる */
function pktSet(pk, x, y, r, fill, op, front) {
  for (const el of [pk.el, pk.back]) {
    el.setAttribute('cx', x); el.setAttribute('cy', y);
    el.setAttribute('r', r); el.setAttribute('fill', fill);
  }
  pk.el.setAttribute('opacity', front === false ? '0' : String(op));
  pk.back.setAttribute('opacity', front === false ? String(op) : '0');
}
function convHideLines() { if (convLine) for (const el of convLine) el.setAttribute('opacity', '0'); if (convLineFront) for (const el of convLineFront) el.setAttribute('opacity', '0'); }
function convHidePkts() { if (convPkt) for (const p of convPkt) { p.el.setAttribute('opacity', '0'); p.back.setAttribute('opacity', '0'); p.k = -1; } }
/* ドットの今の位置 (convFrame は renderFrame の描画前に走るので自前で出す) */
function convDotPos(geoms, i) {
  const d = DOTS[i];
  return posOn(geoms[d.ellipse], patternDeg(d, i, params.dots[i]));
}
/* 惑星⇄点 を結ぶゆるい曲線。curve で反りの強さ */
function convCurve(a, b, curve) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  return { x: mx - dy * curve, y: my + dx * curve };   // 中点を法線方向へずらす
}
function convBez(p0, pc, p1, t) {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * pc.x + t * t * p1.x,
           y: u * u * p0.y + 2 * u * t * pc.y + t * t * p1.y };
}
function convPathD(p0, pc, p1) { return `M${p0.x.toFixed(1)},${p0.y.toFixed(1)} Q${pc.x.toFixed(1)},${pc.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`; }

/* 【2026-08-28 ヒデさん指定】複数軌道のシェイプ(アトム型/土星型/花型)。
   ringCount>=2 で、惑星の中心に N 本の軌道を出す。本数はスライダー(リピート)で増減。 */
let convShapeBack = null, convShapeFront = null, convShapeClipRect = null;
let convShapeGradB = [], convShapeGradF = [];
function convShapePool(n) {
  if (convShapeBack && convShapeBack.length !== n) {
    for (const e of convShapeBack) e.remove();
    for (const e of convShapeFront) e.remove();
    convShapeBack = null; convShapeFront = null;
  }
  if (convShapeBack) return;
  convShapeBack = []; convShapeFront = [];
  const backHost = dotsBackG.parentNode, frontHost = dotsFrontG.parentNode;
  /* 前面リングは「惑星の中心より下(手前側)」だけ見せる = 惑星に入れ子に見える。クリップは前面svgのdefsへ */
  if (!convShapeClipRect) {
    let defs = frontHost.querySelector('defs');
    if (!defs) { defs = document.createElementNS(SVG_NS, 'defs'); frontHost.insertBefore(defs, frontHost.firstChild); }
    const cp = document.createElementNS(SVG_NS, 'clipPath');
    cp.setAttribute('id', 'shapeFrontClip');
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', -4000); r.setAttribute('y', 0); r.setAttribute('width', 12000); r.setAttribute('height', 8000);
    cp.appendChild(r); defs.appendChild(cp);
    convShapeClipRect = r;
  }
  const mk = (host, before, clip) => {
    const el = document.createElementNS(SVG_NS, 'ellipse');
    el.setAttribute('fill', 'none'); el.setAttribute('stroke-width', '3');
    el.setAttribute('stroke-linecap', 'round'); el.setAttribute('opacity', '0'); el.setAttribute('data-shape', '1');
    if (clip) el.setAttribute('clip-path', 'url(#shapeFrontClip)');
    host.insertBefore(el, before);
    return el;
  };
  /* 【2026-08-29 ヒデさん指定】カンプ実測の青→白→ピンクを、輪ごとに個別グラデで持つ。
     白の位置(カンプ 0.49/0.40)を輪ごとに少しずつずらして、単調に見えないようにする(特に土星)。 */
  const ensureDefs = host => { let d = host.querySelector('defs'); if (!d) { d = document.createElementNS(SVG_NS, 'defs'); host.insertBefore(d, host.firstChild); } return d; };
  [backHost, frontHost].forEach(host => host.querySelectorAll('linearGradient[id^="gShR"]').forEach(g => g.remove()));
  const defsB = ensureDefs(backHost), defsF = ensureDefs(frontHost);
  const mkGrad = (defs, id, dir, white) => {
    const g = document.createElementNS(SVG_NS, 'linearGradient');
    /* 【2026-08-29 ヒデさん指定】1本1本の軌道それぞれにグラデを効かせる = objectBoundingBox。
       各リングの長さ方向(major軸)に沿って、その輪自身の向きで色が流れる(回転に追従)。 */
    g.setAttribute('id', id); g.setAttribute('gradientUnits', 'objectBoundingBox');
    g.setAttribute('x1', '0'); g.setAttribute('y1', '0.5'); g.setAttribute('x2', '1'); g.setAttribute('y2', '0.5');
    const c1 = dir ? '#FF5D97' : '#00ABEB', c2 = dir ? '#00ABEB' : '#FF5D97';
    const s1 = document.createElementNS(SVG_NS, 'stop'); s1.setAttribute('offset', '0'); s1.setAttribute('stop-color', c1);
    const s2 = document.createElementNS(SVG_NS, 'stop'); s2.setAttribute('offset', white.toFixed(4)); s2.setAttribute('stop-color', 'white'); s2.setAttribute('class', 'shGWhite');
    const s3 = document.createElementNS(SVG_NS, 'stop'); s3.setAttribute('offset', '1'); s3.setAttribute('stop-color', c2);
    g.append(s1, s2, s3); defs.appendChild(g); return g;
  };
  convShapeGradB = []; convShapeGradF = [];
  for (let i = 0; i < n; i++) {
    const dir = i % 2;                                   /* 1本ごとに向きを入れ替え(カンプの外/内と同じ・色の向きだけ) */
    const white = 0.490385;                              /* 2026-08-29 ヒデさん指定: 白位置のずらし(0.40/0.49)を撤去。全リング同じ白位置 */
    convShapeGradB.push(mkGrad(defsB, 'gShRB' + i, dir, white));
    convShapeGradF.push(mkGrad(defsF, 'gShRF' + i, dir, white));
    convShapeBack.push(mk(backHost, dotsBackG, false));    /* 惑星の裏(z1) */
    convShapeFront.push(mk(frontHost, dotsFrontG, true));  /* 惑星の前(z3)・下半分だけ */
  }
}
function convHideShape() {
  if (convShapeBack) for (const e of convShapeBack) e.setAttribute('opacity', '0');
  if (convShapeFront) for (const e of convShapeFront) e.setAttribute('opacity', '0');
}
function convShapeOn() { return params.kvDesign === 'planet' && (params.conv && params.conv.ringCount || 0) >= 2; }
function convDrawShape() {
  if (!convShapeOn()) { convHideShape(); return false; }
  const C = params.conv;
  const n = Math.max(2, Math.min(12, Math.round(C.ringCount)));
  convShapePool(n);
  const cc = convCenter();
  /* 前面リングは惑星中心より下だけ = 上半分は裏、下半分は前 → 惑星に入れ子 */
  if (convShapeClipRect) convShapeClipRect.setAttribute('y', cc.y.toFixed(1));
  const R = orbitBase('outer').rx * (C.ringSize == null ? 1 : C.ringSize) * convOrbitScale();
  const flat = C.ringFlat == null ? 0.42 : C.ringFlat;
  const shape = C.ringShape || 'atom';
  const ringRot = (C.ringRotate === false) ? 0 : 1;   /* 2026-08-29 回転する/しないスイッチ。offで輪を静止 */
  const spin = kvGT() * (C.ringSpin == null ? 0.35 : C.ringSpin) * ringRot;
  const tumble = (C.ringTumble == null ? 0.6 : C.ringTumble) * ringRot;
  const baseRot = orbitBase('outer').rot;    /* カンプの傾きを基準に */
  for (let i = 0; i < n; i++) {
    let rx = R, ry = R * flat, rot = baseRot;
    if (shape === 'atom') {
      /* 【2026-08-29 ヒデさん指定】横向きで始めたい/縦にならないように。
         ・全体の回転はゆっくり(spin*12)にしてドリフトを抑える
         ・「縦寄りの輪ほど開ききらない」ようにして、常に横長のアトムに保つ */
      rot = i * 180 / n + spin * 12;
      const horiz = Math.abs(Math.cos(rot * Math.PI / 180));   /* 1=横, 0=縦 */
      const foreMax = 0.32 + 0.68 * horiz;                     /* 縦の輪は最大でも 0.32 までしか開かない */
      /* 【2026-09-02 ヒデさん指定】|cos|は折り返しでV字にカクつく→cos²(同じ周期・同じ振れ幅で、
         両端とも速度0で折り返す=イージング付き)に変更。閉じ切る瞬間の「急に戻る」感じを解消 */
      const _c = Math.cos(kvGT() * tumble + i * Math.PI / n);
      const fore = 0.12 + (foreMax - 0.12) * _c * _c;
      rx = R * (0.62 + 0.38 * horiz);   /* 縦寄りの輪は長さも短く = 上下に伸びない = 横長のアトム */
      ry = rx * flat * fore;
    } else if (shape === 'saturn') {
      const f = n === 1 ? 1 : (0.42 + 0.58 * i / (n - 1));
      rx = R * f; ry = R * f * flat;
      rot = baseRot + spin * 10;
    } else if (shape === 'rosette') {
      rot = i * 180 / n + spin * 30;
      ry = R * flat;
    } else if (shape === 'globe') {
      rot = i * 180 / n + spin * 26;
      const _c = Math.cos(kvGT() * tumble + i * Math.PI / n);   /* atomと同じくcos²で滑らかに */
      const fore = 0.2 + 0.8 * _c * _c;
      rx = R * (0.5 + 0.5 * fore); ry = R;
    }
    /* 【2026-08-29 ヒデさん指定】白位置のずらし(0.40/0.49の交互)を撤去。全リング同じ白位置に統一。 */
    const white = 0.490385;
    const tr = `rotate(${rot.toFixed(2)} ${cc.x.toFixed(1)} ${cc.y.toFixed(1)})`;
    /* 【2026-09-02】複数リングにも「軌道の線の太さ」(案ごとの倍率)を掛ける。
       掛け忘れでアトム型などの線幅スライダーが無反応だった(★1/6/7/9等) */
    const swBase = (params.conv.ringWidth == null ? 3 : params.conv.ringWidth) * convOrbitWidth();
    /* 【2026-08-29 ヒデさん指定】遠近を軌道の線にも: 手前(下=front)を太く・奥(上=back)を細く */
    const cP = params.conv || {};
    const orbitPersp = (cP.dotPersp === 'persp') && (cP.perspScope === 'orbit' || cP.perspScope === 'both');
    const pk = orbitPersp ? (cP.perspK == null ? 0.45 : cP.perspK) : 0;
    [[convShapeBack[i], convShapeGradB[i], 'gShRB' + i], [convShapeFront[i], convShapeGradF[i], 'gShRF' + i]].forEach(([el, grad, gid], j) => {
      el.setAttribute('cx', cc.x.toFixed(1)); el.setAttribute('cy', cc.y.toFixed(1));
      el.setAttribute('rx', Math.max(2, rx).toFixed(1)); el.setAttribute('ry', Math.max(2, ry).toFixed(1));
      el.setAttribute('transform', tr);
      if (grad) { const w = grad.querySelector('.shGWhite'); if (w) w.setAttribute('offset', white.toFixed(4)); }
      el.setAttribute('stroke', 'url(#' + gid + ')');
      const sw = Math.max(0.3, swBase * (1 + (j === 1 ? pk : -pk) * 0.7));
      el.setAttribute('stroke-width', sw.toFixed(2));
      el.setAttribute('opacity', '0.9');
    });
  }
  return true;
}
/* ①の「中間の輪」(2026-08-27 ヒデさん指定)。外の輪と内の輪の間を、指定本数だけ埋める。
   イラストレーターのブレンドのように、2本の間を等間隔で補間した輪を描く。 */
let convBlendRings = null;
function convBlendPool(n) {
  if (convBlendRings && convBlendRings.length !== n) {
    for (const el of convBlendRings) el.remove();
    convBlendRings = null;
  }
  if (convBlendRings) return convBlendRings;
  convBlendRings = [];
  const host = dotsBackG.parentNode;
  for (let i = 0; i < n; i++) {
    const el = document.createElementNS(SVG_NS, 'ellipse');
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'url(#gInnerB)');
    el.setAttribute('stroke-width', '2');
    el.setAttribute('opacity', '0');
    host.insertBefore(el, dotsBackG);
    convBlendRings.push(el);
  }
  return convBlendRings;
}
function convHideBlend() { if (convBlendRings) for (const el of convBlendRings) el.setAttribute('opacity', '0'); }

/* ⑦降着円盤: 惑星を中心にした薄い円盤を無数の微粒子が回りながら内へ落ちる */
let convAccre = null;
function convAccrePool() {
  const A = params.conv.accre;
  const n = Math.max(10, Math.round(A.count));
  if (convAccre && (convAccre.length !== n || convAccre.builtSize !== A.size)) {
    for (const p of convAccre) { p.back.remove(); p.front.remove(); }
    convAccre = null;
  }
  if (convAccre) return convAccre;
  convAccre = [];
  convAccre.builtSize = A.size;
  for (let i = 0; i < n; i++) {
    const color = i % 2 ? '#FF5D97' : '#0EBBFF';
    const mk = () => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('r', (DOT_R * params.conv.accre.size).toFixed(3));
      c.setAttribute('fill', color); c.setAttribute('opacity', '0');
      return c;
    };
    const back = mk(), front = mk();
    dotsBackG.appendChild(back); dotsFrontG.appendChild(front);
    convAccre.push({ back, front,
      ang: Math.random() * 360, f: 0.25 + Math.pow(Math.random(), 0.7) * 0.95,
      tw: Math.random() * Math.PI * 2 });
  }
  return convAccre;
}
/* 【2026-08-31】粒(吸い込み)専用の片付け。集約オン中(mesh等)にオフへ切った時、
   その案のプールを巻き添えにせず吸い込み粒だけを消すために使う */
function convHideSpiralPool() {
  if (convSpiral) for (const p of convSpiral) { p.back.setAttribute('opacity', '0'); p.front.setAttribute('opacity', '0'); }
}
function convHidePools() {
  if (convSpiral) for (const p of convSpiral) { p.back.setAttribute('opacity', '0'); p.front.setAttribute('opacity', '0'); }
  if (convAccre) for (const p of convAccre) { p.back.setAttribute('opacity', '0'); p.front.setAttribute('opacity', '0'); }
  convHideLines(); convHideLines2(); convHidePkts();
}
/* 輪(実物の ellipse SVG)の濃さ。reel の循環(convReelA)と表示オンオフ(conv.showOuter/Inner)を
   掛け合わせて renderFrame で書く。奥(b)と手前(f)を別々に持てる(消え方「沈む」で手前だけ透かす)。
   blur は消え方「ぼかし」用。書き込みは変わった時だけ */
const convReelA = { outer: { b: 1, f: 1, blur: 0, w: 3, dash: '', color: '', fx: '', dashOff: 0, cap: '' },
                    inner: { b: 1, f: 1, blur: 0, w: 3, dash: '', color: '', fx: '', dashOff: 0, cap: '' } };
function convReelAReset() {
  for (const k of ['outer', 'inner']) { const a = convReelA[k]; a.b = 1; a.f = 1; a.blur = 0; a.w = 3; a.dash = ''; a.color = ''; a.fx = ''; a.dashOff = 0; a.cap = ''; }
}
const convRingWritten = { outer: '', inner: '' };
function applyRingAlpha(key, aB, aF) {
  const sig = aB.toFixed(3) + '|' + aF.toFixed(3);
  if (sig === convRingWritten[key]) return;
  convRingWritten[key] = sig;
  const ells = orbitSvgEls[key].ells;   // [奥, 手前]
  ells[0].setAttribute('opacity', aB.toFixed(3));
  ells[1].setAttribute('opacity', aF.toFixed(3));
}
/* 【2026-08-27 ヒデさん指定】溶ける時に「別の物質に変わっていく」見せ方をするため、
   線の太さ・破線・にじみを毎フレーム変えられるようにする */
const convRingStyleWritten = { outer: '', inner: '' };
/* いま選んでいる案の「軌道の線の太さ」の倍率 */
/* いま選んでいる案の「軌道全体の大きさ」の倍率 */
function convOrbitScale() {
  const C = params.conv;
  if (!C || params.kvDesign !== 'planet') return 1;
  const v = (C.orbitScaleBy || {})[params.converge || 'reel'];
  return (typeof v === 'number' && v > 0.05) ? v : 1;
}
function convOrbitWidth() {
  const C = params.conv;
  if (!C) return 1;
  const v = (C.orbitWidthBy || {})[params.converge || 'reel'];
  return (typeof v === 'number' && v > 0) ? v : 1;
}
function applyRingStyle(key, w, dash, color, cap) {
  w = w * convOrbitWidth();          /* 案ごとの太さをここでまとめて掛ける */
  /* 【2026-08-29 ヒデさん指定】遠近を「軌道の線」にも効かせる時は、手前(下=front)を太く・奥(上=back)を細く。
     ells = [back(上), front(下)]。perspScope が orbit/both かつ 遠近=persp の時だけ効く。 */
  const C = params.conv || {};
  const orbitPersp = (C.dotPersp === 'persp') && (C.perspScope === 'orbit' || C.perspScope === 'both');
  const pk = orbitPersp ? (C.perspK == null ? 0.45 : C.perspK) : 0;
  const sig = w.toFixed(2) + '|' + dash + '|' + (color || '') + '|' + (cap || '') + '|' + pk.toFixed(3);
  if (sig === convRingStyleWritten[key]) return;
  convRingStyleWritten[key] = sig;
  const ells = orbitSvgEls[key].ells;
  ells.forEach((el, i) => {
    const isFront = (i === 1);
    const wf = Math.max(0.2, w * (1 + (isFront ? pk : -pk) * 0.7));
    el.setAttribute('stroke-width', wf.toFixed(2));
    /* 丸いドットに見せたい時は round(短い破線が丸い点になる) */
    if (cap) el.setAttribute('stroke-linecap', cap); else el.removeAttribute('stroke-linecap');
    if (dash) el.setAttribute('stroke-dasharray', dash); else el.removeAttribute('stroke-dasharray');
    if (color) el.setAttribute('stroke', color);
    else el.setAttribute('stroke', i === 0
      ? (key === 'inner' ? 'url(#gInnerB)' : 'url(#gOuterB)')
      : (key === 'inner' ? 'url(#gInnerF)' : 'url(#gOuterF)'));
  });
}
const convRingBlurWritten = { outer: '', inner: '' };
/* にじみ(blur)だけでなく、彩度・明るさも掛けられるようにする(2026-08-27) */
function applyRingBlur(key, px, extra, dashOff) {
  const sig = px.toFixed(2) + '|' + (extra || '') + '|' + (dashOff || 0);
  if (sig === convRingBlurWritten[key]) return;
  convRingBlurWritten[key] = sig;
  const v = ((px > 0.05 ? `blur(${px.toFixed(2)}px) ` : '') + (extra || '')).trim();
  for (const el of orbitSvgEls[key].ells) {
    el.style.filter = v;
    if (dashOff) el.setAttribute('stroke-dashoffset', dashOff.toFixed(1));
    else el.removeAttribute('stroke-dashoffset');
  }
}
const convDotSpin = DOTS.map(() => 0);   // 収縮中の回転アップ(度)。ドットの角度に足す
/* 消え方「前面カット」用: 手前レイヤーの輪から、惑星に重なる部分だけをマスクで切り取る。
   輪が惑星の中へ滑り込んで見える(はみ出し対策。ヒデさん指摘 2026-08-26) */
let convMaskEl = null, convMaskCircle = null;
const convMaskOn = { outer: false, inner: false };
function convSetClip(key, on) {
  if (convMaskOn[key] === on) return;
  convMaskOn[key] = on;
  const front = orbitSvgEls[key].ells[1];   // [奥, 手前] の手前
  if (on) {
    if (!convMaskEl) {
      const svg = front.ownerSVGElement;
      const defs = svg.querySelector('defs');
      convMaskEl = document.createElementNS(SVG_NS, 'mask');
      convMaskEl.setAttribute('id', 'convPlanetHole');
      const r = document.createElementNS(SVG_NS, 'rect');
      r.setAttribute('x', '-300'); r.setAttribute('y', '-300');
      r.setAttribute('width', '1600'); r.setAttribute('height', '1300');
      r.setAttribute('fill', 'white');
      convMaskCircle = document.createElementNS(SVG_NS, 'circle');
      convMaskCircle.setAttribute('fill', 'black');
      convMaskEl.appendChild(r); convMaskEl.appendChild(convMaskCircle);
      defs.appendChild(convMaskEl);
    }
    front.setAttribute('mask', 'url(#convPlanetHole)');
  } else front.removeAttribute('mask');
}
/* 惑星の手前に来たものを隠すか (パネルで切り替え。2026-08-28 ヒデさん指定) */
/* 【2026-08-28 ヒデさん指定】波紋: 吸収が届いた瞬間、惑星から外へ輪が広がる。
   既存の ellipse を使い回すのではなく、専用の circle を数本だけ持つ(軽い) */
function convDrawRipples(strength, hit, dt) {
  if (!convRippleEls) {
    const host = dotsFrontG && dotsFrontG.parentNode;
    if (!host) return;
    convRippleEls = [];
    for (let i = 0; i < 5; i++) {
      /* 【2026-08-28 ヒデさん指定】軌道と同じ「つぶれ具合・傾き」で広がるので、円ではなく楕円 */
      const c = document.createElementNS(SVG_NS, 'ellipse');
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', '#0EBBFF');
      c.setAttribute('opacity', '0');
      c.style.pointerEvents = 'none';
      host.insertBefore(c, dotsFrontG);
      convRippleEls.push(c);
    }
  }
  if (strength <= 0.001) {
    convRipples.length = 0;
    for (const c of convRippleEls) c.setAttribute('opacity', '0');
    return;
  }
  /* 届いた瞬間に1本ぶん生む(出しすぎないよう間隔をあける) */
  if (hit > 0.35 && convRipples.length < convRippleEls.length &&
      (!convRipples.length || convRipples[convRipples.length - 1].t > 0.22)) {
    convRipples.push({ t: 0 });
  }
  const cc = convCenter(), pr = convPlanetR();
  for (let i = convRipples.length - 1; i >= 0; i--) {
    convRipples[i].t += dt * 0.75;
    if (convRipples[i].t >= 1) convRipples.splice(i, 1);
  }
  /* 【2026-08-28 ヒデさん指定】波紋の形と傾きは、軌道に合わせて自動で決める。
     真円で上下に広がると軌道と噛み合わないため、内の輪の「つぶれ具合(ry/rx)」と「傾き(rot)」を借りる。
     ⚠️ ③粒の渦・④網 のように輪が出ていない案でも、軌道の形そのものは生きているのでそのまま使える。 */
  const gi = orbitGeom('inner');
  const flat = Math.max(0.06, Math.min(1, Math.abs(gi.ry) / Math.max(1, Math.abs(gi.rx))));
  const rot = gi.rot;
  for (let i = 0; i < convRippleEls.length; i++) {
    const q = convRipples[i], el = convRippleEls[i];
    if (!q) { el.setAttribute('opacity', '0'); continue; }
    const k = convFxEase(q.t);
    const rx = pr * (1 + k * 0.95);
    el.setAttribute('cx', cc.x.toFixed(1)); el.setAttribute('cy', cc.y.toFixed(1));
    el.setAttribute('rx', rx.toFixed(1));
    el.setAttribute('ry', Math.max(1, rx * flat).toFixed(1));
    el.setAttribute('transform', `rotate(${rot.toFixed(2)} ${cc.x.toFixed(1)} ${cc.y.toFixed(1)})`);
    el.setAttribute('stroke-width', (2.2 * (1 - k) + 0.4).toFixed(2));
    el.setAttribute('opacity', (0.55 * strength * (1 - k)).toFixed(3));
  }
}
/* ===== エコー (2026-08-28 ヒデさん指定・作り直し3案) =====
   ⚠️ はじめは「単色の面」や「グラデーションの面」で残像を作っていたが、
      惑星の色を拾っただけの別物に見えていた。
      指定は【いま出来上がっている惑星のグラフィック全体を、そのまま重ねる】方向。
   → 惑星は canvas なので、同じ大きさの canvas を用意して毎フレーム drawImage で
      【絵をまるごと複製】し、ひと回り大きくして重ねる。本物の質感がそのまま残像になる。
   1 うしろに重ねる … 惑星の後ろへ。ふちにリムのように出る。いちばん自然
   2 ぼかして広がる … 複製にぼかしをかけながら広がる。やわらかい残像
   3 手前にゴースト … 惑星の手前へ薄く重ねる。透けた残像がはっきり見える */
let convEchoes = [], convEchoCans = null, convEchoEls = null;
let convEchoClock = 0;      /* 9「連なる波」用。ずっと進み続ける時計 */
/* 【2026-08-28 ヒデさん指定】1枚を等倍から広げると、始まりは惑星に隠れて残像が見えない。
   ・最初から【ひと回り大きい】ところから始める
   ・1回の取り込みで【3枚】を、少しずつ大きさをずらして重ねる
   3枚 × 同時に2回分 = 6枚ぶん用意する */
const CONV_ECHO_MAX = 12;      /* 最大 6枚 × 同時2回分 */
/* 何枚目がどこから始まるか。つまみ(echoStart / echoSpread)から作る */
function echoShellCount() { return Math.max(1, Math.min(6, Math.round(params.conv.echoShells ?? 3))); }
function echoStartOf(step) {
  const s0 = params.conv.echoStart ?? 1.12;
  const gap = (params.conv.echoSpread ?? 0.28) * 0.5;
  return s0 + step * gap;
}
/* 【2026-08-28 ヒデさん指定】4 は単色の面。取り込むたびに色が変わる。
   ブランドの色まわりから選ぶので、どれが出ても浮かない */
const ECHO_COLORS = ['#0EBBFF', '#FF5D97', '#7FD8FF', '#A78BFA', '#FFFFFF'];
function convEchoEllipses() {
  if (convEchoEls) return convEchoEls;
  const host = dotsBackG && dotsBackG.parentNode;
  if (!host) return null;
  convEchoEls = [];
  for (let i = 0; i < CONV_ECHO_MAX; i++) {
    const e = document.createElementNS(SVG_NS, 'ellipse');
    e.setAttribute('stroke', 'none');
    e.setAttribute('opacity', '0');
    e.style.pointerEvents = 'none';
    host.insertBefore(e, dotsBackG);
    convEchoEls.push(e);
  }
  return convEchoEls;
}
function convEchoCanvases() {
  if (convEchoCans) return convEchoCans;
  if (!sphereCanvasEl || !sphereCanvasEl.parentNode) return null;
  convEchoCans = [];
  const SRC = sphereCanvasEl.width || 520;
  for (let i = 0; i < CONV_ECHO_MAX; i++) {
    const c = document.createElement('canvas');
    /* 惑星の2倍の器。中央に惑星を描くので、2.0倍まで広げても切れない */
    c.width = SRC * 2;
    c.height = SRC * 2;
    c.className = 'echo-can';
    sphereCanvasEl.parentNode.insertBefore(c, sphereCanvasEl);   /* 既定は惑星の後ろ */
    convEchoCans.push({ el: c, ctx: c.getContext('2d') });
  }
  return convEchoCans;
}
/* ===== 溶けるように広がる残像 (2026-08-28 ヒデさん指定) =====
   ⚠️ これまでは「別々の殻(コピー)を数枚重ねる」作りだったので、
      1枚1枚の輪郭が見えて段差＝ガタガタに見えていた。
   1枚の canvas の中に、惑星を少しずつ大きくしながら【何十枚も薄く】重ねて描くと、
   境目が消えて、ズームぼかしのように滑らかにつながる(＝ディゾルブ)。
   さらに内側を消しゴムで抜くと、波紋のように「外へ溶けていく輪」になる。 */
function echoSmear(c, from, to, alpha, layers, eraseInner) {
  const ctx = c.ctx, W = c.el.width, H = c.el.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  const N = Math.max(3, layers | 0);
  const off = W / 4;                      /* 器は惑星の2倍。中央に置く */
  for (let i = 0; i < N; i++) {
    const f = N === 1 ? 0 : i / (N - 1);
    const sc = from + (to - from) * f;
    /* 外側ほど薄く。合計が濃くなりすぎないよう枚数で割る */
    ctx.globalAlpha = Math.max(0, alpha * (1 - f * 0.85) * (2.2 / N));
    ctx.setTransform(sc, 0, 0, sc, (W / 2) * (1 - sc), (H / 2) * (1 - sc));
    try { ctx.drawImage(sphereCanvasEl, off, off); } catch (e) {}
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  if (eraseInner > 0) {
    /* 内側をやわらかく抜く = 中が空いた輪になり、波紋らしく見える。
       半径は【惑星の半径(W/4) × eraseInner】。いまの広がりに合わせて渡すこと */
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(1, (W / 4) * eraseInner));
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.72, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
}
function convDrawEchoes(strength, hit, dt, style) {
  const st = style || 'k1';
  const crispB = (params.conv && params.conv.echoCrisp) ? 0.12 : 1;   /* くっきり表示: ぼかしをほぼ切る */
  const useEll = (st === 'k4');
  const cans = (!useEll && strength > 0.001) ? convEchoCanvases() : convEchoCans;
  const ells = (useEll && strength > 0.001) ? convEchoEllipses() : convEchoEls;
  const hideAll = () => {
    if (convEchoCans) for (const c of convEchoCans) c.el.style.opacity = '0';
    if (convEchoEls) for (const e of convEchoEls) e.setAttribute('opacity', '0');
  };
  if (strength <= 0.001) { convEchoes.length = 0; hideAll(); return; }
  if (useEll ? !ells : !cans) { convEchoes.length = 0; return; }
  hideAll();
  /* 生む: 吸収のたびに【3枚】。大きさをずらして重ねるので、広がりが読み取れる。
     色は取り込みごとに1つ選び、3枚で共有する(4のときだけ使う) */
  /* 溶ける系(5〜7)は1枚の中で層を作るので、殻は1つだけ生む。
     「重ねる枚数」はその中の層の細かさとして効く */
  const SH = (st === 'k5' || st === 'k6' || st === 'k7') ? 1 : echoShellCount();
  if (hit > 0.35 && (!convEchoes.length || convEchoes[convEchoes.length - 1].t > 0.24)
      && convEchoes.length + SH <= CONV_ECHO_MAX) {
    const col = ECHO_COLORS[(Math.random() * ECHO_COLORS.length) | 0];
    for (let sIdx = 0; sIdx < SH; sIdx++) {
      convEchoes.push({ t: -sIdx * 0.08, step: sIdx, c: col });
    }
  }
  /* 【2026-08-28】広がる速さをつまみで。ゆっくりにするほど1コマの変化が小さく、滑らかに見える */
  const spd = Math.max(0.1, params.conv.echoSpeed ?? 0.7) * (st === 'k2' ? 0.85 : 1.0);
  for (let i = convEchoes.length - 1; i >= 0; i--) {
    convEchoes[i].t += dt * spd;
    if (convEchoes[i].t >= 1) convEchoes.splice(i, 1);
  }
  /* 消え方: 1 で直線、大きいほど最後まで濃く残ってスッと消える(ガタつきが目立ちにくい) */
  const fadeP = Math.max(0.4, params.conv.echoFade ?? 1.6);
  const aMul = Math.max(0, params.conv.echoAlpha ?? 1);      /* 濃さのつまみ */
  const fadeOf = u => Math.pow(1 - u, fadeP) * aMul;
  const spread = Math.max(0.02, params.conv.echoSpread ?? 0.28);
  const pl = params.planet, plFlat = pl.flat == null ? 1 : pl.flat;
  /* --- 5〜7 溶けるように広がる: 1枚の canvas に何十枚も薄く重ねて描く --- */
  if (st === 'k5' || st === 'k6' || st === 'k7') {
    const c0 = cans && cans[0];
    if (!c0) return;
    for (let i = 1; i < cans.length; i++) cans[i].el.style.opacity = '0';
    /* いちばん新しい残像の進み具合を使う(1つのなめらかな波として見せる) */
    let u = -1;
    for (const q of convEchoes) if (q.t >= 0 && (u < 0 || q.t < u)) u = q.t;
    if (u < 0) { c0.el.style.opacity = '0'; return; }
    const uu = Math.max(0, Math.min(1, u));
    const layers = Math.max(6, Math.round(6 + (params.conv.echoShells ?? 3) * 6));
    const from = 1.0, to = echoStartOf(0) + convFxEase(uu) * spread * 1.6;
    if (st === 'k7') {
      /* ぼけて溶ける: 重ね描き＋強いぼかし */
      echoSmear(c0, from, to, 0.9, layers, 0);
      c0.el.style.filter = `blur(${((2 + uu * 22) * crispB).toFixed(1)}px)`;
    } else if (st === 'k6') {
      /* 内から溶ける: 内側を抜いて、外へ広がる輪にする。
         抜く範囲は「いまの広がり」の内側 55% ぶん。広がるほど輪も外へ移る */
      echoSmear(c0, from, to, 1.0, layers, from + (to - from) * 0.55);
      c0.el.style.filter = `blur(${((1 + uu * 6) * crispB).toFixed(1)}px)`;
    } else {
      /* 連続ディゾルブ: 段差なく尾を引いて溶ける */
      echoSmear(c0, from, to, 0.95, layers, 0);
      c0.el.style.filter = `blur(${((0.5 + uu * 3) * crispB).toFixed(1)}px)`;
    }
    c0.el.style.zIndex = '1';
    c0.el.style.transform = `translate(${pl.dx}px, ${pl.dy}px) scale(${pl.scale.toFixed(4)}, ${(pl.scale * plFlat).toFixed(4)})`;
    c0.el.style.opacity = (strength * fadeOf(uu)).toFixed(3);
    return;
  }
  /* --- 4 色が変わる面: 単色の楕円。取り込むたびに色が変わる --- */
  if (useEll) {
    const cc = convCenter(), rx0 = convPlanetR(), ry0 = convPlanetRY();
    for (let i = 0; i < ells.length; i++) {
      const q = convEchoes[i], el = ells[i];
      if (!q || q.t < 0) { el.setAttribute('opacity', '0'); continue; }
      const u = Math.max(0, Math.min(1, q.t));
      const grow = echoStartOf(q.step || 0) + convFxEase(u) * spread;
      el.setAttribute('cx', cc.x.toFixed(1)); el.setAttribute('cy', cc.y.toFixed(1));
      el.setAttribute('rx', (rx0 * grow).toFixed(1));
      el.setAttribute('ry', (ry0 * grow).toFixed(1));
      el.setAttribute('fill', q.c || '#7FD8FF');
      /* 外側の殻ほど薄く。重ねた時に濃淡が出る */
      el.setAttribute('opacity', (0.32 * strength * fadeOf(u) * (1 - (q.step || 0) * 0.18)).toFixed(3));
    }
    return;
  }
  /* --- 8/9 くっきり系【2026-08-28 ヒデさん指定】--------------------------------
     1と同じで「惑星の絵をそのまま複製」するのでハッキリ見える。
     違うのは、1コマぶんの進みを細かく重ねて描くところ(=進みの段差が消える)。
       8 尾を引く : 取り込みで殻が生まれる。1と同じ出方のまま、なめらか
       9 連なる波 : 殻を等間隔でずっと回し続ける。生まれる瞬間が無いので段差ゼロ */
  if (st === 'k8' || st === 'k9') {
    const N = echoShellCount();
    convEchoClock = (convEchoClock + dt * spd * 0.6) % 1;
    for (let i = 0; i < cans.length; i++) {
      const c = cans[i];
      if (i >= N) { c.el.style.opacity = '0'; continue; }
      let u, step;
      if (st === 'k9') {
        u = (convEchoClock + i / N) % 1; step = 0;
      } else {
        const q = convEchoes[i];
        if (!q || q.t < 0) { c.el.style.opacity = '0'; continue; }
        u = Math.max(0, Math.min(1, q.t)); step = q.step || 0;
      }
      const base = echoStartOf(step);
      const grow = base + convFxEase(u) * spread;
      const prev = base + convFxEase(Math.max(0, u - 0.07)) * spread;   /* 少し前の位置 */
      echoSmear(c, prev, grow, 1.15, 8, 0);
      c.el.style.filter = '';
      c.el.style.zIndex = '1';
      c.el.style.transform =
        `translate(${pl.dx}px, ${pl.dy}px) scale(${pl.scale.toFixed(4)}, ${(pl.scale * plFlat).toFixed(4)})`;
      c.el.style.opacity = (0.95 * strength * fadeOf(u) * (1 - step * 0.14)).toFixed(3);
    }
    return;
  }
  for (let i = 0; i < cans.length; i++) {
    const q = convEchoes[i], c = cans[i];
    if (!q || q.t < 0) { c.el.style.opacity = '0'; continue; }
    const u = Math.max(0, Math.min(1, q.t));
    const base = echoStartOf(q.step || 0), dim = 1 - (q.step || 0) * 0.18;
    /* 惑星の絵をまるごと複製する(これが残像の中身) */
    try {
      c.ctx.setTransform(1, 0, 0, 1, 0, 0);
      c.ctx.clearRect(0, 0, c.el.width, c.el.height);
      /* 器の中央に惑星を置く(器は惑星の2倍) */
      const off = c.el.width / 4;
      c.ctx.drawImage(sphereCanvasEl, off, off);
    } catch (e) {}
    let grow, a, fx = '';
    if (st === 'k2') {
      grow = base + convFxEase(u) * spread * 1.3;
      a = 0.8 * strength * fadeOf(u) * dim;
      fx = `blur(${((4 + (q.step || 0) * 3 + u * 12) * crispB).toFixed(1)}px)`;
      c.el.style.zIndex = '1';
    } else if (st === 'k3') {
      grow = base + convFxEase(u) * spread;
      a = 0.4 * strength * fadeOf(u) * dim;
      fx = `saturate(${(1 + u * 0.6).toFixed(2)}) brightness(${(1 + u * 0.25).toFixed(2)})`;
      c.el.style.zIndex = '3';                 /* 惑星の手前へ */
    } else {
      grow = base + convFxEase(u) * spread;
      a = 0.95 * strength * fadeOf(u) * dim;
      c.el.style.zIndex = '1';
    }
    c.el.style.filter = fx;
    c.el.style.transform =
      `translate(${pl.dx}px, ${pl.dy}px) scale(${(pl.scale * grow).toFixed(4)}, ${(pl.scale * plFlat * grow).toFixed(4)})`;
    c.el.style.opacity = a.toFixed(3);
  }
}
function convFrontCut() { return (params.conv && params.conv.frontCut) !== false; }
function convPlanetR() { return 130 * ((params.planet && params.planet.scale) || 1); }
/* 【2026-08-27 ヒデさん指定】惑星も縦横比を保たずにつぶせる。縦の半径はこちら */
function convPlanetRY() { return convPlanetR() * ((params.planet && params.planet.flat) || 1); }
/* データ粒の見た目を作る。k=0 で丸いドットの列 / k=1 で隙間ゼロの1本の線。
   ドットの直径 = 線の太さ。間隔(pitch)を詰めていくので「密着して線になる」ように見える。 */
function convPixelDash(k, R) {
  const dotW = Math.max(0.4, R.pxWidth == null ? 1.6 : R.pxWidth);
  const dens = Math.max(0.05, R.pxDensity == null ? 1 : R.pxDensity);
  const pitch = dotW * 2.6 * dens;                 /* 点の中心から次の点まで */
  /* 【2026-08-27 ヒデさん指定】点がつながり始める/つながりきるタイミングを調整できる。
     収縮の進み(k)のうち、pxJoinAt 〜 pxJoinEnd の区間で「点 → 線」に変える。 */
  const jA = clamp01(R.pxJoinAt == null ? 0 : R.pxJoinAt);
  const jB = Math.max(jA + 0.02, clamp01(R.pxJoinEnd == null ? 1 : R.pxJoinEnd));
  const jk = convSStep(clamp01((k - jA) / (jB - jA)));
  const len = 0.01 + jk * pitch;                  /* 点が伸びて隣とくっつく */
  const gap = Math.max(0, pitch - len);
  const wob = R.pxWobble || 0;
  /* 【2026-08-27 ヒデさん指定】点が軌道の上をくるくる流れるようにする。
     破線のオフセットを送り続けると、点が線に沿って回って見える(⑥のドットと同じ感覚)。
     ドットの周回オフ(convDotMoves)の時は止める。 */
  const spin = (R.pxSpin == null ? 1 : R.pxSpin);
  const moving = (typeof convDotMoves === 'function') ? convDotMoves() : true;
  const base = 360 / Math.max(1, params.duration) * (params.globalSpeed || 1) * (params.direction || 1);
  const flow = (moving && spin) ? -(elapsed * base * spin * 1.6) : 0;
  const wave = wob ? Math.sin(elapsed * 4.2) * wob * 6 : 0;
  return {
    dash: gap < 0.25 ? '' : len.toFixed(2) + ' ' + gap.toFixed(2),
    w: dotW,
    off: (flow + wave) % 100000,
  };
}
/* 【2026-08-26】どの案でも効く「ドットの大きさ」と「遠近感」。
   画面の下ほど手前＝大きい。cy/ry は基準にする楕円の中心と縦半径。 */
function convDotK(y, cy, ry) {
  const C = params.conv || {};
  const base = C.dotSize == null ? 1 : C.dotSize;
  if ((C.dotPersp || 'flat') !== 'persp') return base;
  const k = clamp01(((y - cy) / Math.max(1, ry) + 1) / 2) * 2 - 1;   // -1(奥) 〜 +1(手前)
  return base * (1 + k * (C.perspK == null ? 0.45 : C.perspK));
}
/* 毎フレーム: モードに応じて geoms とドット係数を書き換える (renderFrame から呼ぶ) */
function convFrame(geoms) {
  const dt = convLastT == null ? 0 : Math.max(0, elapsed - convLastT);
  convLastT = elapsed;
  convGlow *= Math.exp(-dt * 2.4);
  /* 蓄積は、いま光っている量に応じて増え、時間でゆっくり戻る */
  {
    const hold = Math.max(0.5, params.conv.glowHold == null ? 6 : params.conv.glowHold);
    convCharge += Math.min(convGlow, 1) * dt * 2.6;
    convCharge -= convCharge * (dt / hold);
    convCharge = Math.max(0, Math.min(1, convCharge));
  }
  const on = convOn();
  if (!on) {
    if (convWasOn) {   // 後片付け (モードや案を切り替えた時に一度だけ)
      for (let i = 0; i < DOTS.length; i++) { convDotF[i] = 1; convDotA[i] = 1; convDotSpin[i] = 0; }
      convReelAReset(); applyRingBlur('outer', 0, '', 0); applyRingBlur('inner', 0, '', 0);
      convSetClip('outer', false); convSetClip('inner', false);
      convHidePools(); convHideBlend(); convGlow = 0;
      /* 【2026-08-30 ヒデさん指定・バグ修正】吸収の光(エコー/波紋)の器と蓄積も片付ける。
         ⚠️ これらは集約オンの間しか描き直されないため、「軌道のみ(off)」へ切り替えた瞬間に
            最後に描いた輪が画面に固まって【常時表示】のまま残っていた。 */
      convEchoes.length = 0; convRipples.length = 0; convCharge = 0;
      if (convEchoCans) for (const c of convEchoCans) c.el.style.opacity = '0';
      if (convEchoEls) for (const e of convEchoEls) e.setAttribute('opacity', '0');
      if (convRippleEls) for (const e of convRippleEls) e.setAttribute('opacity', '0');
      if (sphereCanvasEl) { sphereCanvasEl.style.filter = ''; sphereCanvasEl.style.removeProperty('--conv-breath'); }
      convWasOn = false;
    }
    /* 【2026-08-30 ヒデさん指定・バグ修正】「軌道のみ(off)」でも粒(吸い込み)オプションを効かせる。
       ⚠️ convFrame は off だとここで return するため、粒の描画コード(関数の最後)に届かず
       「粒ありにしても1つも出ない」になっていた。off ではここで直接描く。 */
    if (params.conv && params.conv.reelP && params.conv.reelP.on && !params.conv.net3d) {
      const pg = (params.conv.spinLink === false)
        ? { outer: orbitGeom('outer', true), inner: orbitGeom('inner', true) }
        : geoms;   /* 2026-08-30: 連動は共通トグル(spinLink)に統一 */
      runSpiralParticles(pg, params.conv.reelP, dt);
      reelPWasOn = true;
    } else if (reelPWasOn) { convHidePools(); reelPWasOn = false; }   /* オフに切ったら粒を片付ける */
    return;
  }
  convWasOn = true;
  const mode = params.converge;
  const C = params.conv;
  /* 【2026-08-30 ヒデさん指定】粒用ジオメトリ。「粒も一緒に回す=連動しない」の時は、
     軌道自体の回転(convOrbitSpin/ジャイロ回転)を除いた形で粒を描く(粒の回転軸が変わらない)。
     輪(軌道の線)・reelの輪・基準ドットは geoms のまま＝軌道と一緒に回る。 */
  const pGeoms = (C.spinLink === false)
    ? { outer: orbitGeom('outer', true), inner: orbitGeom('inner', true) }
    : geoms;
  if (convLastMode !== mode) { convHidePools(); convLastMode = mode; }   // 切替時に前のモードの粒・輪を片付ける
  /* 惑星の「受け止め」= 明るさ。WebGL/フォールバック両対応の CSS filter で */
  if (sphereCanvasEl) {
    /* 【2026-08-28 ヒデさん指定】吸収の光り方を5つから選べる。
       どれも「データが取り込まれて惑星が強くなっていく」ことの見せ方。 */
    const gk = C.glowKind || 'pulse';
    const g = C.glow || 0;
    const hit = Math.min(convGlow, 1);       /* いま届いた分 */
    const ch = convCharge;                   /* これまでに溜まった分 */
    let fx = '';
    if (g <= 0.001) fx = '';
    else if (gk === 'hue') {
      /* 色が変わる: 溜まるほど色相がじわっと動き、鮮やかになる。届いた瞬間だけ少し明るく */
      fx = `hue-rotate(${(ch * 72 * g).toFixed(1)}deg) saturate(${(1 + ch * 1.1 * g).toFixed(3)})`
         + ` brightness(${(1 + hit * 0.5 * g).toFixed(3)})`;
    } else if (gk === 'core') {
      /* 芯が育つ: 溜まるほど中心が明るく硬くなる(コントラストと明るさが上がる) */
      fx = `brightness(${(1 + (ch * 0.95 + hit * 0.35) * g).toFixed(3)})`
         + ` contrast(${(1 + ch * 0.8 * g).toFixed(3)})`
         + ` saturate(${(1 + ch * 0.5 * g).toFixed(3)})`;
    } else if (gk === 'echo') {   /* 波紋(ripple)は 2026-09-18 に完全削除 */
      /* 波紋 / エコー: 惑星自体は控えめに。外へ広がる輪・残像で受け止めを見せる(下で描く) */
      fx = `brightness(${(1 + hit * 0.45 * g).toFixed(3)})`;
    } else if (gk === 'breath') {
      /* 呼吸: 溜まった量に応じて、ゆっくり明るさが行き来する */
      const br = 1 + (0.5 + 0.5 * Math.sin(elapsed * 1.15)) * ch * 0.9 * g + hit * 0.3 * g;
      fx = `brightness(${br.toFixed(3)})`;
    } else {
      /* パルス(従来): 届いた瞬間だけ、ふっと明るくなる */
      const b = 1 + hit * g;
      fx = b > 1.005 ? `brightness(${b.toFixed(3)})` : '';
    }
    sphereCanvasEl.style.filter = fx;
    /* 呼吸だけは、わずかに大きさも脈打たせる(明るさだけだと弱いため) */
    if (gk === 'breath' && g > 0.001) {
      const k = 1 + (0.5 + 0.5 * Math.sin(elapsed * 1.15)) * ch * 0.035 * g;
      sphereCanvasEl.style.setProperty('--conv-breath', k.toFixed(4));
    } else sphereCanvasEl.style.removeProperty('--conv-breath');
    convDrawRipples(0, hit, dt);   /* 波紋は削除済み(0=描かない) */
    convDrawEchoes(gk === 'echo' ? g : 0, hit, dt, C.glowEcho);
  }

  if (mode === 'reel') {
    /* 【2026-08-26 循環版・ヒデさん指定】輪は使い回しで循環する:
       内の位置の輪が収縮して吸収されたら、外の輪が内の位置へ同じサイズになって移動し、
       元の外の位置には吸収された輪が新しくフェードインで出現。世代(gen)ごとに
       実物の2本(inner/outer 要素)が役割を交代し続ける = ベルトコンベアのような循環。 */
    const R = C.reel;
    const T = Math.max(1, R.T);
    const gen = Math.floor(elapsed / T), ph = (elapsed % T) / T;
    const sAt = Math.max(0.02, R.shrinkAt);                            // 収縮の開始
    /* 【2026-08-30 ヒデさん指定・統一】輪の入れ替わり(スライド回転)の長さは「秒」で指定(swapSec)。
       ⚠️ 以前は moveDur(周期の割合)を min(moveDur, 吸収後の残り時間) でクランプしていて、
          吸収終わり(endAt)が遅い案では上限0.18で頭打ち＝つまみを回しても【全く変わらなかった】。
          いまは秒→割合に換算し、足りなければ吸収の終わりを自動で前倒しして時間を確保する(確実に効く)。 */
    const swapSec = (R.swapSec != null) ? R.swapSec : Math.max(0.3, (R.moveDur || 0.16) * Math.max(1, R.T));
    const slideLen = Math.min(0.6, Math.max(0.04, swapSec / T));
    const eAt = Math.min(Math.max(sAt + 0.08, Math.min(0.9, R.endAt)), 0.96 - slideLen);
    const zStart = eAt + slideLen * 0.4;                               // 新しい輪が出はじめる
    const zLen = Math.max(0.04, Math.min(R.inDur, 1 - zStart - 0.01));
    const S_out = geoms.outer, S_in = geoms.inner;                     // スロット(位置)のジオメトリ
    /* 流れの向き(ヒデさん指定 2026-08-26): down=外(上)→内(下)→吸収 / up=内(下)→外(上)→吸収
       slotA=吸収される側のスロット / slotB=新しい輪が生まれる側のスロット */
    const up = R.flow === 'up';
    const slotA = up ? S_out : S_in;
    const slotB = up ? S_in : S_out;
    const shrinkKey = gen % 2 ? 'outer' : 'inner';                     // 今回吸収される実物の要素
    const slideKey = shrinkKey === 'inner' ? 'outer' : 'inner';
    const planetR = convPlanetR();
    let effDepth = R.depth;
    if (R.vanish === 'shrink') effDepth = Math.max(R.depth, 0.995);
    /* はみ出ず溶ける: 惑星の輪郭に収まるサイズまでしか縮まない */
    if (R.vanish === 'fit') effDepth = Math.min(R.depth, 1 - planetR / Math.max(1, slotA.rx));
    /* --- 吸収される輪 --- */
    let gS = slotA, aB = 1, aF = 1, blur = 0, spinDeg = 0, aDot = 1, clipOn = false;
    if (ph < sAt) { }
    else if (ph < eAt) {
      const k = convSStep((ph - sAt) / (eAt - sAt));
      /* ⚠️ 前に選んでいた案の見た目(破線・色・太さ)が残らないよう、毎フレーム基準に戻してから塗る */
      const RA = convReelA[shrinkKey];
      RA.w = 3; RA.dash = ''; RA.color = ''; RA.fx = ''; RA.dashOff = 0; RA.cap = '';
      gS = convGeom(slotA, 1 - k * effDepth);
      spinDeg = 0;   /* 【2026-08-30 ヒデさん指定】spinUp(縮むほど回る)は廃止。くるくる系は「入れ替わりの回転」1本に統一 */
      /* 透過: fadeAt(収縮の中の割合)から fadeTo(残す濃さ)へ */
      const fs = sAt + (eAt - sAt) * clamp01(R.fadeAt);
      const fk = ph > fs ? convSStep((ph - fs) / Math.max(0.001, eAt - fs)) : 0;
      const fadeA = 1 - (1 - R.fadeTo) * fk;
      if (R.vanish === 'sink') { aB = 1; aF = fadeA; }                 // 手前だけ透ける=惑星の後ろへ沈む
      else if (R.vanish === 'shrink') { aB = aF = 1; }                 // 透けずに点まで縮んで消える
      else if (R.vanish === 'blur') { aB = aF = fadeA; blur = fk * 5; }
      else if (R.vanish === 'early') {
        /* 早め透過: 輪の横幅が惑星に重なる前に、サイズ連動で透け切る(はみ出しが見えない) */
        const rxNow = slotA.rx * (1 - k * effDepth);
        const kk = 1 - clamp01((rxNow - planetR * 1.05) / (planetR * 1.6));
        aB = aF = 1 - (1 - R.fadeTo) * convSStep(kk);
      }
      else if (R.vanish === 'clip') { aB = aF = fadeA; clipOn = convFrontCut(); }// 前面カット(切替可)
      /* ===== 「別の物質に変わっていく」3案 (2026-08-27 ヒデさん指定) ===== */
      else if (R.vanish === 'compress') {
        /* 圧縮グロー: 縮むほど発光して凝縮する。光り方は5種から選べる(2026-08-27 ヒデさん指定) */
        aB = aF = fadeA; clipOn = true;
        const pw = (R.glowPower == null ? 1 : R.glowPower);
        RA.w = 3 * (R.glowWidth == null ? 0.5 : R.glowWidth) * (1 + k * 0.6);
        const tone = R.glowTone || 'now';
        if (tone === 'rainbow') {
          /* 虹: 色相がゆっくり回りながら鮮やかになる */
          RA.fx = `hue-rotate(${((elapsed * 40 + k * 180) % 360).toFixed(0)}deg) saturate(${(1 + k * 2.6 * pw).toFixed(2)}) brightness(${(1 + k * 0.35 * pw).toFixed(2)})`;
          blur = k * 1.6 * pw;
        } else if (tone === 'strong') {
          /* 強発光: 白飛びするくらい明るく、にじみも強い */
          RA.fx = `saturate(${(1 + k * 1.6 * pw).toFixed(2)}) brightness(${(1 + k * 1.5 * pw).toFixed(2)})`;
          blur = k * 3.6 * pw;
        } else if (tone === 'cool') {
          /* 青に寄る: ブランドの水色側へ寄せて、涼しく光る */
          RA.fx = `hue-rotate(${(-k * 32).toFixed(0)}deg) saturate(${(1 + k * 2.2 * pw).toFixed(2)}) brightness(${(1 + k * 0.4 * pw).toFixed(2)})`;
          blur = k * 1.4 * pw;
        } else if (tone === 'warm') {
          /* ピンクに寄る: ブランドのピンク側へ寄せて、暖かく光る */
          RA.fx = `hue-rotate(${(k * 30).toFixed(0)}deg) saturate(${(1 + k * 2.2 * pw).toFixed(2)}) brightness(${(1 + k * 0.4 * pw).toFixed(2)})`;
          blur = k * 1.4 * pw;
        } else {
          /* いまの感じ(既定): 彩度が上がって白く発光 */
          RA.fx = `saturate(${(1 + k * 2.4 * pw).toFixed(2)}) brightness(${(1 + k * 0.45 * pw).toFixed(2)})`;
          blur = k * 1.6 * pw;
        }
      }
      else if (R.vanish === 'pixel') {
        /* データ粒(2026-08-27 ヒデさん指定):
           軌道は最初から【丸いドットの列】。収縮するほど点が伸びて隣とくっつき、
           最後は隙間のない1本の線になる。 */
        aB = aF = fadeA; clipOn = true;
        const px = convPixelDash(k, R);
        RA.dash = px.dash; RA.w = px.w; RA.cap = 'round';
        RA.dashOff = px.off;
        RA.fx = `saturate(${(1 + k * 1.6).toFixed(2)})`;
      }
      else { aB = aF = fadeA; }                                        // fade(既定) / fit も同じ透過
      aDot = Math.max(aB, aF);
    } else if (ph < zStart) { gS = slotB; aB = aF = 0; aDot = 0; }     // 消えている間(生まれる側で待機)
    else { gS = slotB; aB = aF = aDot = convSStep((ph - zStart) / zLen); }   // 新しい輪として出現
    convSetClip(shrinkKey, clipOn);
    convSetClip(shrinkKey === 'inner' ? 'outer' : 'inner', false);
    if (clipOn && convMaskCircle) {
      const cc = convCenter();
      convMaskCircle.setAttribute('cx', cc.x); convMaskCircle.setAttribute('cy', cc.y);
      convMaskCircle.setAttribute('r', planetR);
    }
    /* --- 生まれる側 → 吸収される側 へ移る輪 --- */
    let gM = slotB;
    if (ph >= eAt && ph < eAt + slideLen) {
      const k = convSStep((ph - eAt) / slideLen);
      gM = { cx: slotB.cx + (slotA.cx - slotB.cx) * k, cy: slotB.cy + (slotA.cy - slotB.cy) * k,
             rx: slotB.rx + (slotA.rx - slotB.rx) * k, ry: slotB.ry + (slotA.ry - slotB.ry) * k,
             /* 【2026-08-28 ヒデさん指定】移り変わりの回転 オン/オフ。offなら傾きを変えず(移動先の傾きのまま)すべり込む＝回らない */
             rot: (R.transRot === false) ? slotA.rot : (slotB.rot + (slotA.rot - slotB.rot) * k) };
    } else if (ph >= eAt + slideLen) gM = slotA;
    if (ph >= eAt && ph - (dt / T) < eAt) convAddGlow(0.7);
    geoms[shrinkKey] = gS; geoms[slideKey] = gM;                       // ドットも輪ごと動く
    /* --- 中間の輪(ブレンド): 収縮している輪と、もう1本の輪の間を等間隔で埋める --- */
    {
      const bn = Math.max(0, Math.round(R.blend || 0));
      if (bn > 0) {
        const rings = convBlendPool(bn);
        for (let bi = 0; bi < bn; bi++) {
          const t = (bi + 1) / (bn + 1);              // 0<t<1 の等間隔
          const el = rings[bi];
          const cx = gS.cx + (gM.cx - gS.cx) * t, cy = gS.cy + (gM.cy - gS.cy) * t;
          const rx = gS.rx + (gM.rx - gS.rx) * t, ry = gS.ry + (gM.ry - gS.ry) * t;
          const rot = gS.rot + (gM.rot - gS.rot) * t;
          el.setAttribute('cx', cx.toFixed(1)); el.setAttribute('cy', cy.toFixed(1));
          el.setAttribute('rx', Math.max(0.1, rx).toFixed(1)); el.setAttribute('ry', Math.max(0.1, ry).toFixed(1));
          el.setAttribute('transform', `rotate(${rot.toFixed(2)} ${cx.toFixed(1)} ${cy.toFixed(1)})`);
          /* 【2026-08-28 ヒデさん指定】中間の輪は【軌道をそのまま複製したくっきりした線】にする。
             以前は blendAlpha(既定0.45)で薄くしていたので、混ざったような色に見えていた。
             濃さは吸収中の輪と同じ動き(収縮側に近いほどその輪に寄せる)だけ残し、
             線の太さも本物の軌道と同じ 3px × 案ごとの太さ にそろえる。 */
          const a = ((aB + aF) / 2) * (1 - t) + 1 * t;
          el.setAttribute('opacity', a.toFixed(3));
          el.setAttribute('stroke-width', (3 * convOrbitWidth()).toFixed(2));
        }
      } else convHideBlend();
    }
    convReelA[shrinkKey].b = aB; convReelA[shrinkKey].f = aF; convReelA[shrinkKey].blur = blur;
    if (!(ph >= sAt && ph < eAt)) {   /* 収縮していない間は元の見た目に戻す */
      const r0 = convReelA[shrinkKey];
      r0.w = 3; r0.dash = ''; r0.color = ''; r0.fx = ''; r0.dashOff = 0; r0.cap = '';
    }
    const sl = convReelA[slideKey];
    sl.b = 1; sl.f = 1; sl.blur = 0; sl.w = 3; sl.dash = ''; sl.color = ''; sl.fx = ''; sl.dashOff = 0; sl.cap = '';
    /* 【2026-08-27 ヒデさん指定】データ粒を選んでいる間は、軌道そのものが最初からドットの列。
       収縮していない輪(と、収縮前の輪)も、ドット表示のままにしておく。 */
    if (R.vanish === 'pixel') {
      const px0 = convPixelDash(0, R);
      for (const key of [shrinkKey, slideKey]) {
        const st = convReelA[key];
        const isShrinking = (key === shrinkKey) && (ph >= sAt && ph < eAt);
        if (isShrinking) continue;                 /* 収縮中の輪は上で計算済み */
        st.dash = px0.dash; st.w = px0.w; st.cap = 'round'; st.dashOff = px0.off;
      }
    }
    for (let i = 0; i < DOTS.length; i++) {
      convDotF[i] = 1;                                                 // 位置は geoms 側で寄せ済み
      const isShrink = DOTS[i].ellipse === shrinkKey;
      convDotA[i] = isShrink ? aDot : 1;
      convDotSpin[i] = isShrink ? spinDeg : 0;                         // 収縮中も回り続ける(+アップ)
    }
  } else {
    convReelAReset();
    convHideBlend();   /* ①以外では中間の輪は出さない */
    convSetClip('outer', false); convSetClip('inner', false);
    for (let i = 0; i < DOTS.length; i++) { convDotF[i] = 1; convDotA[i] = 1; convDotSpin[i] = 0; }
  }

  if (mode === 'spiral') {
    /* 粒はまず軌道上を回り、hold秒たったら螺旋で惑星へ吸い込まれ、吸収されたらまた軌道上に生まれ直す */
    runSpiralParticles(pGeoms, C.spiral, dt);   /* 2026-08-30: 連動しない時は回転を除いた粒用ジオメトリ */
  } else if (mode === 'accre') {
    /* ⑦降着円盤: 惑星を中心にした薄い円盤。微粒子が回りながら内へ落ちて取り込まれる */
    const A = C.accre;
    const pool = convAccrePool();
    const cc = convCenter();
    const disk = { cx: cc.x, cy: cc.y, rx: orbitBase('inner').rx * A.scale, ry: orbitBase('inner').rx * A.scale * 0.335, rot: pGeoms.inner.rot };   /* 2026-08-30: 円盤(粒)も連動切替に従う */
    for (const p of pool) {
      /* 【2026-08-27 ヒデさん指定】渦の巻き具合を調整できる。
         swirl=0 でどこでも同じ速さ(ゆるい渦) / 大きいほど内側で急に速くなり、きつく巻き込む */
      const sw = Math.max(0, A.swirl == null ? 1 : A.swirl);
      if (convDotMoves()) {
        p.ang += (0.5 / Math.pow(Math.max(0.2, p.f), sw)) * A.speed * 60 * dt * (params.direction || 1);
      }
      /* 落ち方のカーブ: 1で等速、大きいほど中心に近いほど速く吸い込まれる */
      const fc = Math.max(0.1, A.fallCurve == null ? 1 : A.fallCurve);
      p.f -= 0.022 * A.fall * dt * Math.pow(Math.max(0.15, p.f), 1 - fc);
      if (p.f <= 0.16) { convAddGlow(0.10);
        p.f = 1.05 + Math.random() * 0.15; p.ang = Math.random() * 360; }
      /* 揺らぎ: 粒ごとに位相の違う波で半径をわずかに揺らす(0でぴたっと回る) */
      const wob = 1 + (A.wobble || 0) * 0.18 * Math.sin(elapsed * 1.7 + p.tw * 2.3);
      const pos = posOn(disk, p.ang);
      const ff = p.f * wob;
      const fpos = { x: cc.x + (pos.x - cc.x) * ff, y: cc.y + (pos.y - cc.y) * ff, front: pos.front };
      const twk = 0.45 + A.twinkle * Math.sin(elapsed * 2 + p.tw);
      const near = clamp01((0.34 - p.f) / 0.18);           // 惑星際でフェードアウト
      const al = clamp01(twk * (1 - near));
      const rr = (DOT_R * A.size * convDotK(fpos.y, cc.y, disk.ry)).toFixed(2);
      [p.back, p.front].forEach(el => { el.setAttribute('cx', fpos.x); el.setAttribute('cy', fpos.y);
        el.setAttribute('r', rr); el.setAttribute('opacity', al.toFixed(3)); });
      p.front.style.display = fpos.front ? '' : 'none';
      p.back.style.display = fpos.front ? 'none' : '';
    }
  } else if (mode === 'mesh' && (C.mesh.style === 'cage')) {
    /* ===== 包囲ケージ (2026-08-27 ヒデさん指定) =====
       惑星のまわりの【球殻】にノードを均等に並べ、球ごとゆっくり回す。
       奥半球のノードと骨は惑星の後ろへ、手前半球は惑星の前を通るので
       「取り囲んでいる／包囲している」ように見える。
       デザインは変えない: 使うのは既存のドット(circle)と線(path)だけ。 */
    const M = C.mesh, cc = convCenter();
    const n = Math.max(6, Math.round(M.nodes));
    const fiboN = Math.max(8, Math.min(400, Math.round(M.cageFiboN == null ? 42 : M.cageFiboN)));   /* 【2026-09-25】散らばり(三角網)の点の数。既定42＝整った網(面の数2)と同じ点・線の数 */
    const links = Math.max(1, Math.round(M.cageLinks == null ? 3 : M.cageLinks));
    /* 【2026-09-02 ヒデさん指定】geo=測地線球(整った面)。それ以外はフィボナッチ球(従来) */
    const shape = M.cageShape || 'fibo';
    const freq = Math.max(1, Math.round(M.cageFreq == null ? 2 : M.cageFreq));
    /* 球殻の上の位置は回しても関係が変わらないので、隣どうしの組は作る時に1回だけ決める */
    if (!convMesh || convMesh.style !== 'cage' || convMesh.shape !== shape ||
        (shape !== 'geo' && convMesh.nodes.length !== fiboN) || (shape === 'geo' && convMesh.freq !== freq)) {   /* 【2026-09-25】散らばりも三角網になったので骨の本数(links)は形に関係しない */
      let base, pairs;
      if (shape === 'geo') {
        /* 測地線球: 頂点も辺も「整った面」そのもの。最近傍接続や縦潰しをしないので歪まない。 */
        const g = buildGeodesic(freq);
        base = g.verts.map((v, i) => ({ x: v[0], y: v[1], z: v[2], c: i % 2 ? CONV_PINK : CONV_BLUE, tw: 0 }));
        pairs = g.edges;
      } else {
        /* 【2026-09-25 ヒデさん依頼・面の数を1個ずつ】散らばり＝フィボナッチ球を凸包で三角網に(旧: 最寄りN点と結ぶ＝交差や穴が出てラフすぎた)。点の数は cageFiboN */
        const g = sphereFiboHull(fiboN);
        base = g.verts.map((v, i) => ({ x: v[0], y: v[1], z: v[2], c: i % 2 ? CONV_PINK : CONV_BLUE, tw: 0 }));
        pairs = g.edges;
      }
      convMesh = { style: 'cage', shape, freq, nodes: base, pairs, links, pk: [], next: 0 };
    }
    const spin = M.cageSpin == null ? 1 : M.cageSpin;
    const yaw = (convDotMoves() ? elapsed : 0) * 0.42 * spin * (params.direction || 1) + (M.cageYaw || 0) * Math.PI / 180;   /* cageYaw=【2026-09-19】向き(回転の位置のずらし) */
    const tilt = (M.cageTilt == null ? -20 : M.cageTilt) * Math.PI / 180;
    const roll = (M.cageRoll || 0) * Math.PI / 180;   /* 【2026-09-19】左右の傾き(画面の面内で回す) */
    const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(roll), sr = Math.sin(roll);
    /* 息をするようにわずかに伸び縮み(0にすると完全に固い球)。geo(整った面)は歪ませないので固定。 */
    const breathe = shape === 'geo' ? 1 : (1 + Math.sin(elapsed * 0.55) * 0.03 * (M.random || 0));
    const squish = shape === 'geo' ? 1.0 : 0.94;   /* geoは縦潰しなし=真円の球で歪まない */
    /* 【2026-08-29 ヒデさん指定】ケージ(外のネットワーク)の大きさを惑星サイズから独立させる。
       以前は convPlanetR()(=130×惑星スケール)基準だったので「惑星を大きくすると外のケージも一緒に大きくなる」
       状態だった。基準を固定の 130(=惑星スケール1相当)にし、ケージは cageR だけで大きさが決まるように。
       これで「大きさ」スライダーは惑星だけを大きくする。 */
    const Rc = 130 * (M.cageR == null ? 1.75 : M.cageR) * breathe;
    /* 【2026-09-21 ヒデさん依頼】メッシュの形状(丸み/横長/ひし形/縦長)。頂点をワープしてから回転・投影 */
    const _msx = M.msx != null ? M.msx : 1, _msy = M.msy != null ? M.msy : 1, _msz = M.msz != null ? M.msz : 1, _mpinch = M.mpinch || 0;
    const proj = q => {
      let qx = q.x, qy = q.y, qz = q.z;
      if (_mpinch) { const k = 1 - _mpinch * Math.abs(qy); qx *= k; qz *= k; }   /* 赤道は太く極は細く=ひし形 */
      qx *= _msx; qy *= _msy; qz *= _msz;
      const x1 = qx * cy + qz * sy, z1 = -qx * sy + qz * cy, y1 = qy;      /* 縦軸まわりに回す */
      const y2 = y1 * ct - z1 * st, z2 = y1 * st + z1 * ct;                      /* 少し傾ける(前後) */
      const x3 = x1 * cr - y2 * sr, y3 = x1 * sr + y2 * cr;                      /* 左右に傾ける(cageRoll) */
      return { x: cc.x + x3 * Rc, y: cc.y + y3 * Rc * squish, z: z2 };           /* z>0 = 手前 */
    };
    const P = convMesh.nodes.map(proj);
    /* --- 骨(線) 手前は惑星の前、奥は惑星の後ろを通す --- */
    const pool = convLine2Pool(convMesh.pairs.length);
    convHideLines();     /* 片面しか持たない線プールは使わない */
    for (let i = 0; i < pool.length; i++) {
      const [a, b] = convMesh.pairs[i];
      const A = P[a], B = P[b], zm = (A.z + B.z) / 2;
      const al = M.lineAlpha * (0.42 + 0.58 * (zm + 1) / 2);   /* 奥ほど薄く＝奥行きが出る */
      convLine2Set(pool[i], A, B, '#6B7690', (M.lineWidth || 1) * (0.7 + 0.3 * (zm + 1) / 2), al.toFixed(3), zm > 0);
    }
    /* --- ノード --- (geoは頂点数=測地線の実頂点数に合わせる) */
    const nn = convMesh.nodes.length;
    const pkts = convPktPool(nn + 12);
    for (let i = 0; i < nn; i++) {
      const p0 = P[i], q = convMesh.nodes[i], pk = pkts[i];
      const dep = 0.72 + 0.5 * (p0.z + 1) / 2;                 /* 手前ほど大きく明るく */
      pktSet(pk, p0.x, p0.y, (DOT_R * M.size * dep).toFixed(2), q.c, (0.5 + 0.5 * dep).toFixed(3), p0.z > 0);
    }
    /* --- パケット: 骨をたどって惑星へ届く --- */
    convMesh.next -= dt;
    if (convMesh.next <= 0 && convMesh.pk.length < 12) {
      convMesh.next = Math.max(0.08, 1 / Math.max(0.05, M.rate));
      const e = convMesh.pairs[(Math.random() * convMesh.pairs.length) | 0];
      convMesh.pk.push({ from: e[0], via: e[1], k: 0, stage: 0 });
    }
    for (let i = convMesh.pk.length - 1; i >= 0; i--) {
      const q2 = convMesh.pk[i];
      q2.k += dt / Math.max(0.08, M.hop);
      if (q2.k >= 1) { q2.k = 0; q2.stage++; if (q2.stage > 1) { convAddGlow(0.3); convMesh.pk.splice(i, 1); continue; } }
      const A = q2.stage === 0 ? P[q2.from] : P[q2.via];
      const B = q2.stage === 0 ? P[q2.via] : { x: cc.x, y: cc.y, z: 1 };
      const k = convSStep(q2.k);
      const pk = pkts[nn + i];
      if (!pk) continue;
      const mx = A.x + (B.x - A.x) * k, my = A.y + (B.y - A.y) * k, mz = A.z + (B.z - A.z) * k;
      const inP = convFrontCut() && Math.hypot(mx - cc.x, my - cc.y) < convPlanetR();
      pktSet(pk, mx, my, (DOT_R * M.size * 0.8).toFixed(2), CONV_BLUE, '0.95', mz > 0 && !inP);
    }
    for (let i = convMesh.pk.length; i < 12; i++) { const pk = pkts[nn + i]; if (pk) { pk.el.setAttribute('opacity', '0'); pk.back.setAttribute('opacity', '0'); } }
  } else if (mode === 'mesh') {
    /* ⑫メッシュ (2026-08-26 改良): 3つの見た目 × ランダムに漂う動き。
       organic=ふわふわ漂う / constellation=星座(明滅・線は近いものだけ) / grid=格子状のネット */
    const M = C.mesh, cc = convCenter();
    const n = Math.max(3, Math.round(M.nodes));
    const style = M.style || 'organic';
    convHideLines2();
    if (!convMesh || convMesh.nodes.length !== n || convMesh.style !== style) {
      convMesh = { style, nodes: [], pk: [], next: 0 };
      for (let i = 0; i < n; i++) {
        /* 位相と速さを個別に持たせて、繰り返しに見えない不規則な漂いを作る */
        convMesh.nodes.push({
          a: (i / n) * Math.PI * 2, r: 0.5 + ((i * 37) % 10) / 10 * 0.5,
          p1: Math.random() * 6.28, p2: Math.random() * 6.28, p3: Math.random() * 6.28,
          s1: 0.21 + Math.random() * 0.22, s2: 0.13 + Math.random() * 0.19, s3: 0.31 + Math.random() * 0.26,
          gx: (i % 4) / 3, gy: Math.floor(i / 4) / Math.max(1, Math.ceil(n / 4) - 1 || 1),
          c: i % 2 ? CONV_PINK : CONV_BLUE, tw: Math.random() * 6.28,
        });
      }
    }
    const RX = orbitBase('outer').rx * 0.95 * (M.spread == null ? 1 : M.spread), RY = RX * 0.5;
    const amp = M.random * 46;
    /* 【2026-08-28 ヒデさん指定】頂点を手で置いてあれば、その座標を基準にする。
       頂点編集の最中は漂いを止めて、掴んだ点が逃げないようにする */
    const pts = (M.pts && M.pts.length === n) ? M.pts : null;
    const frozen = (typeof meshHandles !== 'undefined') && meshHandles.on;
    const np = k => {
      const q = convMesh.nodes[k];
      /* 周期の違う3つの波を重ねた、なめらかな擬似ランダム(毎フレーム乱数だとガタつく) */
      const wx = Math.sin(elapsed * q.s1 + q.p1) * 0.6 + Math.sin(elapsed * q.s3 + q.p3) * 0.4;
      const wy = Math.sin(elapsed * q.s2 + q.p2) * 0.6 + Math.cos(elapsed * q.s1 * 0.7 + q.p3) * 0.4;
      let bx, by;
      if (pts) { bx = pts[k].x; by = pts[k].y; }
      else if (style === 'grid') { bx = cc.x + (q.gx - 0.5) * RX * 1.7; by = cc.y + (q.gy - 0.5) * RY * 1.5; }
      else { bx = cc.x + Math.cos(q.a) * RX * q.r; by = cc.y + Math.sin(q.a) * RY * q.r; }
      const mv = (convDotMoves() && !frozen) ? 1 : 0;   /* 周回オフ・頂点編集中はノードも漂わない */
      return { x: bx + wx * amp * M.drift * mv, y: by + wy * amp * M.drift * 0.7 * mv };
    };
    /* 頂点編集のつまみを置くために、今フレームの位置を控えておく */
    convMesh.pos = []; for (let k = 0; k < n; k++) convMesh.pos.push(np(k));
    /* --- 線 --- */
    const pairs = [];
    for (let i = 0; i < n; i++) {
      const A = np(i);
      if (style !== 'constellation') pairs.push([A, cc, M.lineAlpha * 0.45]);   // 星座は惑星へ線を引かない
      for (let j = i + 1; j < n; j++) {
        const B = np(j), dd = Math.hypot(A.x - B.x, A.y - B.y);
        const reach = RX * M.span * 2;
        if (dd < reach) pairs.push([A, B, M.lineAlpha * (1 - dd / reach)]);     // 近いほど濃い
      }
    }
    const lines = convLinePool(Math.max(pairs.length, n * 3));
    for (let i = 0; i < lines.length; i++) {
      if (i < pairs.length) {
        const [A, B, al] = pairs[i];
        lines[i].setAttribute('d', `M${A.x.toFixed(1)},${A.y.toFixed(1)} L${B.x.toFixed(1)},${B.y.toFixed(1)}`);
        lines[i].setAttribute('stroke', '#6B7690');
        lines[i].setAttribute('stroke-width', String(M.lineWidth || 1));
        lines[i].setAttribute('opacity', Math.max(0, al).toFixed(3));
      } else lines[i].setAttribute('opacity', '0');
    }
    /* 【2026-08-29 ヒデさん指定】惑星の中心より下(手前側)の線は、惑星の前にも通す＝入れ子に見せる */
    if (convMeshFrontClip) convMeshFrontClip.setAttribute('y', cc.y.toFixed(1));
    const flines = convLineFrontPool(lines.length);
    for (let i = 0; i < flines.length; i++) {
      if (i < pairs.length) {
        const [A, B, al] = pairs[i];
        flines[i].setAttribute('d', `M${A.x.toFixed(1)},${A.y.toFixed(1)} L${B.x.toFixed(1)},${B.y.toFixed(1)}`);
        flines[i].setAttribute('stroke', '#6B7690');
        flines[i].setAttribute('stroke-width', String(M.lineWidth || 1));
        flines[i].setAttribute('opacity', Math.max(0, al).toFixed(3));
      } else flines[i].setAttribute('opacity', '0');
    }
    /* --- ノードとパケット --- */
    const pkts = convPktPool(n + 12);
    for (let i = 0; i < n; i++) {
      const P0 = np(i), pk = pkts[i], q = convMesh.nodes[i];
      const tw = style === 'constellation' ? 0.55 + 0.45 * Math.sin(elapsed * 1.6 + q.tw) : 0.85;
      /* 惑星に重なったノードは奥へ回して隠す(透けさせない) */
      const inPlanet = convFrontCut() && Math.hypot(P0.x - cc.x, P0.y - cc.y) < convPlanetR();
      /* 手前(下半分)のノードは惑星に重なっても前に出す=入れ子に見える。奥(上半分)は隠す */
      pktSet(pk, P0.x, P0.y, (DOT_R * M.size * convDotK(P0.y, cc.y, RY)).toFixed(2), q.c, tw.toFixed(3), !inPlanet || P0.y > cc.y);
    }
    convMesh.next -= dt;
    if (convMesh.next <= 0 && convMesh.pk.length < 12) {
      convMesh.next = Math.max(0.08, 1 / Math.max(0.05, M.rate));
      convMesh.pk.push({ from: (Math.random() * n) | 0, via: (Math.random() * n) | 0, k: 0, stage: 0 });
    }
    for (let i = convMesh.pk.length - 1; i >= 0; i--) {
      const q2 = convMesh.pk[i];
      q2.k += dt / Math.max(0.08, M.hop);
      if (q2.k >= 1) { q2.k = 0; q2.stage++; if (q2.stage > 1) { convAddGlow(0.3); convMesh.pk.splice(i, 1); continue; } }
      const A = q2.stage === 0 ? np(q2.from) : np(q2.via);
      const B = q2.stage === 0 ? np(q2.via) : cc;
      const k = convSStep(q2.k);
      const pk = pkts[n + i];
      if (!pk) continue;
      const mx = A.x + (B.x - A.x) * k, my = A.y + (B.y - A.y) * k;
      const inP = convFrontCut() && Math.hypot(mx - cc.x, my - cc.y) < convPlanetR();
      pktSet(pk, mx, my, (DOT_R * M.size * 0.75).toFixed(2), CONV_BLUE, '0.95', !inP);
    }
    for (let i = convMesh.pk.length; i < 12; i++) { const pk = pkts[n + i]; if (pk) { pk.el.setAttribute('opacity', '0'); pk.back.setAttribute('opacity', '0'); } }
  } else if (mode === 'beads') {
    /* ⑬ドットの軌道 (2026-08-26 改良・ヒデさん指定):
       ドットを【等間隔で密に】並べて輪の形そのものを作る。吸われるのは一部(ratio)だけなので
       輪の形が崩れず「軌道」と分かる。ghost で薄い軌道線も残せる。 */
    const B = C.beads, cc = convCenter();
    const n = Math.max(6, Math.round(B.count));
    const pkts = convPktPool(n);
    convHideLines();   /* 軌道の線は出さない(点だけで輪を作る) */
    if (!convBeads || convBeads.length !== n) {
      convBeads = [];
      for (let i = 0; i < n; i++) {
        /* 外周と内周へ交互に、等間隔で並べる = 密度が上がるほど輪に見える */
        const ring = i % 2, idx = Math.floor(i / 2), half = Math.ceil(n / 2);
        /* slot/half は「1周のどこか」の割合。弧で等分する時に使う */
        convBeads.push({ base: (idx / half) * 360, slot: idx, half, ring, t: -1, jit: (Math.random() - 0.5) });
      }
      convBeads.spin = 0; convBeads.next = 0;
    }
    if (convDotMoves()) convBeads.spin += B.speed * 60 * dt * (params.direction || 1);
    /* 吸われている数が ratio を超えないよう、順番に送り出す */
    const wantOn = Math.max(1, Math.round(n * clamp01(B.ratio)));
    let onNow = 0;
    for (const b of convBeads) if (b.t >= 0) onNow++;
    convBeads.next -= dt;
    if (onNow < wantOn && convBeads.next <= 0) {
      const idle = convBeads.filter(b => b.t < 0);
      if (idle.length) { idle[(Math.random() * idle.length) | 0].t = 0; }
      convBeads.next = Math.max(0.02, B.life / Math.max(1, wantOn) * 0.7);
    }
    for (let i = 0; i < n; i++) {
      const b = convBeads[i];
      const g = b.ring ? pGeoms.inner : pGeoms.outer;   /* 2026-08-30: 粒リングも連動切替に従う */
      let f = 1, al = 0.95, swirl = 0;
      if (b.t >= 0) {
        b.t += dt;
        const k = clamp01(b.t / Math.max(0.2, B.life));
        f = 1 - convSStep(k) * 0.94;
        /* 【2026-08-27 ヒデさん指定】吸い込まれる間に回り込ませる＝②の「渦で吸収」に近い動き。
           spinEase を上げるほど、中心に近づくほど速く回る(角運動量ふう) */
        if (B.spin) {
          const ease = Math.max(0.1, B.spinEase == null ? 1 : B.spinEase);
          swirl = B.spin * 180 * Math.pow(k, 1 / ease);
        }
        if (k > 0.7) al = (1 - k) / 0.3;
        if (k >= 1) {
          convAddGlow(0.10);
          b.t = -1;
          b.back = 0;   /* 【2026-08-27 ヒデさん指定】空いた場所へは、ゆったりフェードインで戻す */
        }
      }
      /* 【2026-08-28 ヒデさん指定】端で点が詰まって見えないよう、弧の長さで等分する。
         「等角(従来)」に戻したい時はパネルの『並べ方』で切り替えられる */
      let ang;
      if (B.even === false) {
        ang = b.base + convBeads.spin;
      } else {
        const ratio = Math.abs(g.ry) / Math.max(1, Math.abs(g.rx));
        ang = convArcAngle(ratio, b.slot / Math.max(1, b.half) + convBeads.spin / 360);
      }
      ang += b.jit * (B.jitter || 0) * 12 + swirl;
      /* 戻ってきた点は、しばらくかけて濃くなる(ふっと湧かない) */
      if (b.back != null) {
        b.back += dt;
        const bi = clamp01(b.back / Math.max(0.1, B.backIn == null ? 1.2 : B.backIn));
        al *= convSStep(bi);
        if (bi >= 1) b.back = null;
      }
      const pos = posOn(f === 1 ? g : convGeom(g, f), ang);
      pktSet(pkts[i], pos.x, pos.y, (DOT_R * B.size * convDotK(pos.y, g.cy, g.ry)).toFixed(2),
        b.ring ? CONV_BLUE : CONV_PINK, clamp01(al).toFixed(3), pos.front);
    }
  } else if (CONV_LINKED.includes(mode)) {
    /* ⑭〜⑳ 双方向: 惑星とドットをラインで結び、行き(集約)と帰り(配信)のデータが飛び交う。
       青＝軌道から惑星へ集約 / ピンク＝惑星から軌道へ配信 */
    const L = C.link, cc = convCenter();
    const nd = DOTS.length;
    const lines = convLinePool(nd);
    const per = Math.max(1, Math.round(3 * L.density));
    const pkts = convPktPool(nd * per);
    const T = Math.max(0.6, L.T);
    const ends = [], ctrls = [];
    for (let i = 0; i < nd; i++) {
      const p1 = convDotPos(geoms, i);
      const pc = convCurve(cc, p1, ((i % 2) ? 1 : -1) * L.curve);
      ends.push(p1); ctrls.push(pc);
      lines[i].setAttribute('d', convPathD(cc, pc, p1));
      lines[i].setAttribute('stroke', DOTS[i].color === '#4E4E4E' ? '#6B7690' : DOTS[i].color);
      lines[i].setAttribute('stroke-width', String(L.lineWidth == null ? 1 : L.lineWidth));
      lines[i].setAttribute('opacity', String(L.lineAlpha));
    }
    /* 【2026-08-26 ヒデさん指定】惑星のエリアに入った粒は【完全に消す】。
       惑星の縁(fadeK の外側)から縮みながら急速に薄くなり、内側では描かない。 */
    const pr = convPlanetR();
    for (let i = 0; i < nd; i++) {
      for (let j = 0; j < per; j++) {
        const pk = pkts[i * per + j];
        if (!pk) continue;
        const seed = (i * 7 + j * 3) % 10 / 10;
        const u = convDotMoves() ? ((elapsed * L.speed / T + seed) % 1) : seed;   // 周回オフなら止める
        const out = j % 2 === 1;                          // 半分は行き(集約)、半分は帰り(配信)
        const t = out ? 1 - u : u;
        const q = convBez(cc, ctrls[i], ends[i], clamp01(t));
        if (!out && t > 0.94) convAddGlow(0.03);
        let al = 0.95, sz = L.size;
        /* 惑星のエリア(半径 pr)に入ったら完全に消す。
           入る手前 vanishK のぶんだけ「縮みながら」薄くなるので、パッと消えず吸い込まれて見える */
        const dd = Math.hypot(q.x - cc.x, q.y - cc.y);
        const edge = pr * (1 + Math.max(0, L.vanishK));   // 消え始める半径
        if (convFrontCut() && dd < pr) { pk.el.setAttribute('opacity', '0'); pk.back.setAttribute('opacity', '0'); continue; }   // 惑星の中では描かない
        if (convFrontCut() && dd < edge) {
          const k = convSStep(1 - (dd - pr) / Math.max(1, edge - pr));
          sz = L.size * (1 - k * 0.9);                    // 縮んで吸い込まれる
          al = 0.95 * (1 - k);
        }
        pktSet(pk, q.x, q.y, (DOT_R * Math.max(0.02, sz) * convDotK(q.y, cc.y, geoms.outer.ry)).toFixed(2),
          out ? CONV_PINK : CONV_BLUE, clamp01(al).toFixed(3), true);
      }
    }
  } else {
    convHidePools();
  }
  /* 【2026-08-30 ヒデさん指定】「粒が吸い込まれる」オプションを A(軌道)グループの全案で使えるように
     (以前は収縮=reelだけ)。専用プールなので各案の内蔵の粒とは独立。渦(spiral)は本体が同じ動きなので除外。
     ⚠️ if連鎖の最後の else{convHidePools()} で粒プールが毎フレーム消される案があるため、
        必ずこの位置(convFrameの最後)で上書き描画する。オフの時は convHidePools が既に隠している。 */
  /* 【2026-08-31 ヒデさん指定・バグ修正】①グループ合体で mesh(ネットワーク)にも吸い込み粒が
     出てしまいデザインが破綻 → mesh は対象外に(自前のノード粒の世界観のため)。
     ②集約オン中に粒をオフへ切っても、オフ時の片付けが off パスにしか無く消えなかった
     → ここでも吸い込み粒のプールだけを片付ける(その案の粒は巻き添えにしない)。 */
  const reelPActive = params.conv.reelP && params.conv.reelP.on
      && mode !== 'spiral' && mode !== 'mesh' && !params.conv.net3d
      && convGroupOf(mode).key === 'orbit';
  if (reelPActive) {
    runSpiralParticles(pGeoms, params.conv.reelP, dt);   /* 連動は共通トグル(spinLink) */
    reelPWasOn = true;
  } else if (reelPWasOn) {
    if (mode !== 'spiral') convHideSpiralPool();   /* spiral は本体が同じプールを描くので触らない */
    reelPWasOn = false;
  }
}
const sphereCanvasEl = document.getElementById('sphere');

/* ===== 直接編集（Figma のエディタ操作感を踏襲。2026-08-26 ヒデさん指定） =====
   リサーチ(Figma/FigJam ヘルプ)に基づく仕様:
   ・選択すると「バウンディングボックス」(青い枠)が出る
   ・四隅の白い四角ハンドル = 斜めリサイズ。辺の中央 = 幅だけ／高さだけのリサイズ
   ・角の【少し外側】にホバーすると回転カーソルに変わり、ドラッグで回転
   ・Shift = 比率を保つ / 回転は15°刻み
   ・ドラッグ中はサイズや角度の数値が出る
   対象: 外の輪 / 内の輪 / 惑星。クリックで選び、枠の内側をドラッグで移動。 */
const editHandles = (() => {
  const BLUE = '#0D99FF';
  /* Figma の回転カーソル(曲がった矢印)に寄せた自前カーソル */
  const ROT_CUR = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
    '<path d="M7 10a6 6 0 0 1 10-3.5" fill="none" stroke="black" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M7 10a6 6 0 0 1 10-3.5" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round"/>' +
    '<path d="M17.6 3.2l0.6 4.2-4.2-0.6z" fill="black" stroke="white" stroke-width="0.8"/>' +
    '</svg>') + '") 12 12, grab';
  let svg = null, on = false, drag = null, wasRunning = null, sel = null;
  let selKeys = [];            /* まとめて選んだ対象(1つなら単体・複数ならグループ) */
  let marq = null, marqRect = null;   /* ドラッグ選択(マーキー) */
  let onSel = null, onEdit = null;   /* パネルとの同期用コールバック */
  let boxG = null, boxBg = null, boxRect = null, label = null;
  const hits = {};      /* 当たり判定(選択用) */
  const handles = [];   /* {el, kind, ix, iy} kind: corner/edge/rot */

  const KEYS = ['outer', 'inner', 'planet'];
  function ensure() {
    if (svg) return svg;
    const orbit = document.querySelector('.orbit');
    if (!orbit) return null;
    svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 915.483 630');
    svg.setAttribute('class', 'edit-layer');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:9;overflow:visible;';
    orbit.appendChild(svg);

    /* --- バウンディングボックス --- */
    /* 【2026-08-27 バグ修正】辺のリサイズが効かなかった原因は重なり順。
       選択用の当たり判定(透明な太い楕円)がハンドルの上にいて、辺を掴めなかった。
       枠(移動用) → 当たり判定 → ハンドル類 の順に重ねる。 */
    /* 【2026-08-28 バグ修正】SVGの"空白"は普通ポインタを拾わないので、まとめて選択(マーキー)が
       始まらなかった。透明な下敷きを一番下に敷いて、空白ドラッグを必ず拾わせる。
       当たり判定(軌道・惑星)とハンドルはこの後に足すので、そちらが上=優先される。 */
    const marqBg = document.createElementNS(SVG_NS, 'rect');
    marqBg.setAttribute('x', -3000); marqBg.setAttribute('y', -3000);
    marqBg.setAttribute('width', 9000); marqBg.setAttribute('height', 9000);
    marqBg.setAttribute('fill', 'rgba(0,0,0,0)');
    /* 【2026-09-17 大掃除・ヒデさん報告「編集でグラフィックの位置移動ができない」】案をメッシュに固定したので
       輪＋惑星の囲み選択(マーキー)は不要。この透明シートがドラッグを横取りして、siteEdit の
       「KVグラフィック全体をつかんで動かす」が始まらなかった。pointer-events を切って下へ通す。 */
    marqBg.style.pointerEvents = 'none';
    marqBg.style.cursor = 'crosshair';
    svg.appendChild(marqBg);
    marqBg.addEventListener('pointerdown', e => {
      const q = toLocal(e);
      marq = { x0: q.x, y0: q.y, x1: q.x, y1: q.y, moved: false };
    });
    boxBg = document.createElementNS(SVG_NS, 'g');
    svg.appendChild(boxBg);
    boxG = document.createElementNS(SVG_NS, 'g');   /* ハンドル類。当たり判定より後で足す */
    boxRect = document.createElementNS(SVG_NS, 'rect');
    boxRect.setAttribute('fill', 'rgba(0,0,0,0)');
    boxRect.setAttribute('stroke', BLUE);
    boxRect.setAttribute('stroke-width', '1.5');
    /* 【2026-08-26 ヒデさん指定】枠の【内側】ならどこを掴んでも動かせる。
       当たり判定(線・惑星)はこの後に作って上に重ねるので、選択中でも別のオブジェクトを選び直せる */
    boxRect.style.cursor = 'move';
    boxRect.style.pointerEvents = 'all';
    boxRect.addEventListener('pointerdown', e => { e.stopPropagation(); startDrag(e, { kind: 'move' }); });
    boxBg.appendChild(boxRect);

    /* --- 回転ゾーン(角の少し外側。Figma と同じく“角の外”で回転) --- */
    for (const [ix, iy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const r = document.createElementNS(SVG_NS, 'rect');
      r.setAttribute('width', '30'); r.setAttribute('height', '30');
      r.setAttribute('fill', 'rgba(0,0,0,0)');
      r.setAttribute('data-kind', 'rot');
      r.style.cursor = ROT_CUR;
      r.style.pointerEvents = 'all';
      r.addEventListener('pointerdown', e => { e.stopPropagation(); startDrag(e, { kind: 'rot' }); });
      boxG.appendChild(r);
      handles.push({ el: r, kind: 'rot', ix, iy });
    }
    /* --- 辺そのものを掴める帯 (Figma と同じく辺のどこでもリサイズできる) --- */
    for (const [ix, iy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const r = document.createElementNS(SVG_NS, 'rect');
      r.setAttribute('fill', 'rgba(0,0,0,0)');
      r.setAttribute('data-kind', 'edgeband');
      r.setAttribute('data-ix', ix); r.setAttribute('data-iy', iy);
      r.style.pointerEvents = 'all';
      r.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); startDrag(e, { kind: 'edge', ix, iy }); });
      boxG.appendChild(r);
      handles.push({ el: r, kind: 'edgeband', ix, iy });
    }
    /* --- 辺ハンドル(見た目の四角。中央に置く) --- */
    for (const [ix, iy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const h = mkHandle('edge', ix, iy); handles.push(h);
    }
    /* --- 角ハンドル(斜めリサイズ)。辺より後に置いて上に来るように --- */
    for (const [ix, iy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const h = mkHandle('corner', ix, iy); handles.push(h);
    }
    /* --- 当たり判定(クリックで選ぶ) --- */
    for (const key of KEYS) {
      const el = document.createElementNS(SVG_NS, 'ellipse');
      el.setAttribute('fill', key === 'planet' ? 'rgba(0,0,0,0)' : 'none');
      if (key !== 'planet') { el.setAttribute('stroke', 'rgba(0,0,0,0)'); el.setAttribute('stroke-width', '30'); }
      el.style.cursor = 'move';   /* 描かれている所を触れば、そのまま掴んで動かせる */
      el.style.pointerEvents = key === 'planet' ? 'fill' : 'stroke';
      el.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (e.shiftKey || e.metaKey || e.ctrlKey) { toggleInSel(key); return; }   /* Cmd/Shift+クリックで追加選択(移動はしない) */
        select(key); startDrag(e, { kind: 'move' });
      });
      svg.appendChild(el);
      hits[key] = el;
    }

    svg.appendChild(boxG);   /* ハンドル類は当たり判定より前面へ */
    /* --- ドラッグ中の数値表示 --- */
    label = document.createElementNS(SVG_NS, 'g');
    const lb = document.createElementNS(SVG_NS, 'rect');
    lb.setAttribute('rx', '3'); lb.setAttribute('fill', BLUE);
    lb.setAttribute('height', '18'); lb.setAttribute('width', '92');
    const lt = document.createElementNS(SVG_NS, 'text');
    lt.setAttribute('fill', '#fff'); lt.setAttribute('font-size', '11');
    lt.setAttribute('text-anchor', 'middle'); lt.setAttribute('dy', '12.5');
    label.append(lb, lt); label.style.display = 'none'; label.style.pointerEvents = 'none';
    svg.appendChild(label);
    label._bg = lb; label._tx = lt;

    /* ドラッグ選択(マーキー)の枠 */
    marqRect = document.createElementNS(SVG_NS, 'rect');
    marqRect.setAttribute('fill', 'rgba(13,153,255,0.10)');
    marqRect.setAttribute('stroke', BLUE);
    marqRect.setAttribute('stroke-width', '1');
    marqRect.setAttribute('stroke-dasharray', '4 3');
    marqRect.style.display = 'none';
    marqRect.style.pointerEvents = 'none';
    svg.appendChild(marqRect);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', endDrag);
    return svg;
  }
  function mkHandle(kind, ix, iy) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('data-kind', kind); r.setAttribute('data-ix', ix); r.setAttribute('data-iy', iy);
    r.setAttribute('width', '9'); r.setAttribute('height', '9');
    r.setAttribute('fill', '#fff'); r.setAttribute('stroke', BLUE); r.setAttribute('stroke-width', '1.5');
    r.style.pointerEvents = 'all';
    r.addEventListener('pointerdown', e => { e.stopPropagation(); startDrag(e, { kind, ix, iy }); });
    boxG.appendChild(r);
    return { el: r, kind, ix, iy };
  }

  /* 画面座標 → SVG(915x630) 座標 */
  function toLocal(e) {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  }
  /* いま選んでいる対象の枠(中心・半幅・半高・角度) */
  function boxOf(key) {
    if (key === 'planet') {
      const c = convCenter();
      return { cx: c.x, cy: c.y, rx: convPlanetR(), ry: convPlanetRY(), rot: 0 };
    }
    return orbitGeom(key);
  }
  function select(key) {
    sel = key;
    selKeys = key ? [key] : [];
    if (boxG) boxG.style.display = key ? '' : 'none';
    if (boxBg) boxBg.style.display = key ? '' : 'none';
    place();
    if (onSel) onSel(key);      /* パネル側へ「何を選んだか」を伝える */
  }
  /* まとめて選ぶ(マーキー用)。1つなら単体選択と同じ扱い */
  function selectMany(keys) {
    selKeys = keys.slice();
    sel = keys.length === 1 ? keys[0] : null;
    const has = selKeys.length > 0;
    if (boxG) boxG.style.display = has ? '' : 'none';
    if (boxBg) boxBg.style.display = has ? '' : 'none';
    place();
    if (onSel) onSel(sel);      /* 複数の時は sel=null(数値パネルは単体用) */
  }
  /* Cmd/Shift+クリックで、その対象を選択に足す/外す */
  function toggleInSel(key) {
    const i = selKeys.indexOf(key);
    if (i >= 0) selKeys.splice(i, 1); else selKeys.push(key);
    sel = selKeys.length === 1 ? selKeys[0] : null;
    const has = selKeys.length > 0;
    if (boxG) boxG.style.display = has ? '' : 'none';
    if (boxBg) boxBg.style.display = has ? '' : 'none';
    place();
    if (onSel) onSel(sel);
  }
  /* 複数選択時のまとめ枠 = 各対象の外接矩形の和(回転は無視した軸並行) */
  function groupAABB() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const k of selKeys) {
      const bb = boxOf(k);
      x0 = Math.min(x0, bb.cx - bb.rx); x1 = Math.max(x1, bb.cx + bb.rx);
      y0 = Math.min(y0, bb.cy - bb.ry); y1 = Math.max(y1, bb.cy + bb.ry);
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, rot: 0 };
  }
  /* いま操作対象にしている枠(単体は回転込み・複数はまとめ枠) */
  function curBox() { return selKeys.length > 1 ? groupAABB() : (sel ? boxOf(sel) : null); }
  /* マーキーに重なる対象を拾う */
  function keysIn(m) {
    const mm = { x0: Math.min(m.x0, m.x1), x1: Math.max(m.x0, m.x1), y0: Math.min(m.y0, m.y1), y1: Math.max(m.y0, m.y1) };
    const out = [];
    for (const key of KEYS) {
      const bb = boxOf(key);
      const ab = { x0: bb.cx - bb.rx, x1: bb.cx + bb.rx, y0: bb.cy - bb.ry, y1: bb.cy + bb.ry };
      if (!(mm.x1 < ab.x0 || mm.x0 > ab.x1 || mm.y1 < ab.y0 || mm.y0 > ab.y1)) out.push(key);
    }
    return out;
  }
  /* 目標の絶対ジオメトリ(中心・半幅・半高)を、対象の params に書き戻す。
     位置は「元の dx/dy からの差分」で動かす(揺らぎ等のオフセットを二重に足さない) */
  function setObjRel(bs, ncx, ncy, nrx, nry) {
    if (bs.k === 'planet') {
      const P = params.planet;
      P.scale = clamp(0.2, 3, nrx / 130);
      P.flat  = clamp(0.05, 3, nry / Math.max(1, 130 * P.scale));
      P.dx = Math.round(bs.pdx + (ncx - bs.cx));
      P.dy = Math.round(bs.pdy + (ncy - bs.cy));
    } else {
      const O = params.orbits[bs.k], b2 = orbitBase(bs.k);
      O.scale = clamp(0.2, 2.5, nrx / b2.rx);
      O.flat  = clamp(0.05, 3, nry / Math.max(1, b2.ry * O.scale));
      O.dx = Math.round(bs.pdx + (ncx - bs.cx));
      O.dy = Math.round(bs.pdy + (ncy - bs.cy));
    }
  }
  function startDrag(e, info) {
    if (!selKeys.length && info.kind === 'move') return;
    e.preventDefault();
    const b = curBox();
    drag = { ...info, start: toLocal(e), box: b, base: sel ? snapshot(sel) : null, shift: e.shiftKey };
    if (selKeys.length > 1) {
      /* まとめ操作: 各対象の絶対ジオメトリと元の dx/dy を控える */
      drag.bases = selKeys.map(k => {
        const bb = boxOf(k), pr = (k === 'planet' ? params.planet : params.orbits[k]);
        return { k, cx: bb.cx, cy: bb.cy, rx: bb.rx, ry: bb.ry, pdx: pr.dx || 0, pdy: pr.dy || 0 };
      });
    }
  }
  function endDrag() {
    if (marq) {
      if (marq.moved) { const ks = keysIn(marq); ks.length ? selectMany(ks) : select(null); }
      else select(null);   /* 動かさずに離した = 何もない所をクリック = 選択解除 */
      marq = null; if (marqRect) marqRect.style.display = 'none';
      return;
    }
    if (drag && typeof editHistory !== 'undefined') { editHistory.push(); editBar.sync(); }
    drag = null;
    if (label) label.style.display = 'none';
  }
  function snapshot(key) {
    return key === 'planet' ? { ...params.planet } : { ...params.orbits[key] };
  }
  function clamp(lo, hi, v) { return v < lo ? lo : v > hi ? hi : v; }
  /* SVG座標 → 対象のローカル座標(回転を戻す) */
  function toBox(p, b) {
    const a = -b.rot * Math.PI / 180;
    const dx = p.x - b.cx, dy = p.y - b.cy;
    return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
  }
  function onMove(e) {
    /* --- マーキー(ドラッグ選択)中 --- */
    if (marq) {
      const q = toLocal(e);
      marq.x1 = q.x; marq.y1 = q.y;
      if (!marq.moved && Math.hypot(q.x - marq.x0, q.y - marq.y0) > 3) marq.moved = true;
      if (marqRect) {
        const x0 = Math.min(marq.x0, marq.x1), y0 = Math.min(marq.y0, marq.y1);
        marqRect.setAttribute('x', x0.toFixed(1)); marqRect.setAttribute('y', y0.toFixed(1));
        marqRect.setAttribute('width', Math.abs(marq.x1 - marq.x0).toFixed(1));
        marqRect.setAttribute('height', Math.abs(marq.y1 - marq.y0).toFixed(1));
        marqRect.style.display = marq.moved ? '' : 'none';
      }
      return;
    }
    if (!drag) return;
    /* --- 複数まとめて: 中心から比例でサイズ変更 / まとめて移動 --- */
    if (selKeys.length > 1 && drag.bases) {
      e.preventDefault();
      const p2 = toLocal(e), gb = drag.box, shift2 = e.shiftKey;
      let text2 = '';
      if (drag.kind === 'move') {
        const dx = p2.x - drag.start.x, dy = p2.y - drag.start.y;
        drag.bases.forEach(bs => setObjRel(bs, bs.cx + dx, bs.cy + dy, bs.rx, bs.ry));
        text2 = `${Math.round(dx)} , ${Math.round(dy)}`;
      } else if (drag.kind !== 'rot') {
        const ax = gb.cx - drag.ix * gb.rx, ay = gb.cy - drag.iy * gb.ry;   /* 反対側の辺/角を固定 */
        let sx = drag.ix !== 0 ? clamp(0.1, 5, Math.abs(p2.x - ax) / Math.max(1, 2 * gb.rx)) : 1;
        let sy = drag.iy !== 0 ? clamp(0.1, 5, Math.abs(p2.y - ay) / Math.max(1, 2 * gb.ry)) : 1;
        if (drag.kind === 'corner' && shift2) { const sc = Math.max(sx, sy); sx = sy = sc; }
        drag.bases.forEach(bs => {
          const ncx = ax + (bs.cx - ax) * sx, ncy = ay + (bs.cy - ay) * sy;
          setObjRel(bs, ncx, ncy, bs.rx * sx, bs.ry * sy);
        });
        text2 = `${Math.round(sx * 100)}％ × ${Math.round(sy * 100)}％`;
      }
      markDirty(); renderFrame();
      if (typeof syncPanelRows === 'function') syncPanelRows();
      showLabel(text2);
      return;
    }
    if (!sel) return;
    e.preventDefault();
    const p = toLocal(e), b = drag.box, base = drag.base, shift = e.shiftKey;
    let text = '';
    if (sel === 'planet') {
      const P = params.planet;
      if (drag.kind === 'move') {
        P.dx = Math.round(base.dx + (p.x - drag.start.x));
        P.dy = Math.round(base.dy + (p.y - drag.start.y));
        text = `${P.dx} , ${P.dy}`;
      } else if (drag.kind !== 'rot') {
        /* 【2026-08-27 ヒデさん指定】縦横比は維持しない。
           角=縦横とも / 左右の辺=横だけ / 上下の辺=縦だけ 変わる */
        const l = toBox(p, b);
        const wantRx = Math.abs(l.x), wantRy = Math.abs(l.y);
        const baseFlat = base.flat == null ? 1 : base.flat;
        if (drag.kind === 'corner') {
          const sc = clamp(0.2, 3, wantRx / 130);
          P.scale = sc;
          P.flat = shift ? baseFlat                      /* Shift の時だけ比率を保つ */
                         : clamp(0.05, 3, wantRy / Math.max(1, 130 * sc));
        } else if (drag.ix !== 0) {
          P.scale = clamp(0.2, 3, wantRx / 130);
        } else {
          P.flat = clamp(0.05, 3, wantRy / Math.max(1, 130 * P.scale));
        }
        text = `${Math.round(convPlanetR() * 2)} × ${Math.round(convPlanetRY() * 2)}`;
      }
    } else {
      const O = params.orbits[sel], bs = orbitBase(sel);
      if (drag.kind === 'move') {
        O.dx = Math.round(base.dx + (p.x - drag.start.x));
        O.dy = Math.round(base.dy + (p.y - drag.start.y));
        text = `${O.dx} , ${O.dy}`;
      } else if (drag.kind === 'rot') {
        const a0 = Math.atan2(drag.start.y - b.cy, drag.start.x - b.cx);
        const a1 = Math.atan2(p.y - b.cy, p.x - b.cx);
        let deg = base.angle + (a1 - a0) * 180 / Math.PI;
        if (shift) deg = Math.round(deg / 15) * 15;      /* Figma と同じ 15°刻み */
        O.angle = Math.round(deg * 10) / 10;
        text = ((bs.rot + O.angle).toFixed(1)) + '°';
      } else {
        const l = toBox(p, b);
        const wantRx = Math.abs(l.x), wantRy = Math.abs(l.y);
        const baseFlat = base.flat == null ? 1 : base.flat;
        if (drag.kind === 'corner') {
          const sc = clamp(0.2, 2.5, wantRx / bs.rx);
          O.scale = sc;
          O.flat = shift ? baseFlat                       /* Shift=比率を保つ */
                         : clamp(0.05, 3, wantRy / Math.max(1, bs.ry * sc));
        } else if (drag.ix !== 0) {                       /* 左右の辺 = 幅だけ */
          O.scale = clamp(0.2, 2.5, wantRx / bs.rx);
        } else {                                          /* 上下の辺 = 高さだけ(つぶし) */
          O.flat = clamp(0.05, 3, wantRy / Math.max(1, bs.ry * O.scale));
        }
        const g = orbitGeom(sel);
        text = `${Math.round(g.rx * 2)} × ${Math.round(g.ry * 2)}`;
      }
    }
    markDirty();
    renderFrame();
    if (typeof syncPanelRows === 'function') syncPanelRows();
    if (onEdit) onEdit(sel);    /* ドラッグ中もパネルの数値をリアルタイムで更新 */
    showLabel(text);
  }
  function showLabel(text) {
    if (!label || !text) return;
    const b = curBox();
    if (!b) return;
    label.style.display = '';
    label._tx.textContent = text;
    const w = Math.max(56, text.length * 8 + 16);
    label._bg.setAttribute('width', w);
    label._bg.setAttribute('x', (b.cx - w / 2).toFixed(1));
    label._bg.setAttribute('y', (b.cy + b.ry + 14).toFixed(1));
    label._tx.setAttribute('x', b.cx.toFixed(1));
    label._tx.setAttribute('y', (b.cy + b.ry + 14).toFixed(1));
  }
  /* 毎フレーム、枠とハンドルを今の図形に合わせて置き直す */
  function place() {
    if (!on || !svg) return;
    /* 当たり判定を今の図形に合わせる */
    for (const key of KEYS) {
      const el = hits[key];
      if (key === 'planet') {
        const c = convCenter();
        el.setAttribute('cx', c.x); el.setAttribute('cy', c.y);
        el.setAttribute('rx', convPlanetR()); el.setAttribute('ry', convPlanetRY());
      } else {
        const g = orbitGeom(key);
        el.setAttribute('cx', g.cx); el.setAttribute('cy', g.cy);
        el.setAttribute('rx', g.rx); el.setAttribute('ry', g.ry);
        el.setAttribute('transform', `rotate(${g.rot} ${g.cx} ${g.cy})`);
        /* 【2026-09-17 ヒデさん報告「編集でグラフィックが動かない」】メッシュ案では輪を描かないのに、輪の透明な当たり判定が
           残っていて見えない輪をつかんでしまい、全体ドラッグ(siteEdit)の邪魔をしていた。輪が無い案では当たり判定も消す。 */
        el.style.display = ((params.converge || 'reel') === 'mesh') ? 'none' : '';
      }
    }
    if (!selKeys.length) { if (boxG) boxG.style.display = 'none'; if (boxBg) boxBg.style.display = 'none'; return; }
    boxG.style.display = ''; boxBg.style.display = '';
    const b = curBox();
    const multi = selKeys.length > 1;
    const tr = `rotate(${b.rot} ${b.cx} ${b.cy})`;
    boxG.setAttribute('transform', tr);
    boxBg.setAttribute('transform', tr);
    boxRect.setAttribute('x', (b.cx - b.rx).toFixed(1));
    boxRect.setAttribute('y', (b.cy - b.ry).toFixed(1));
    boxRect.setAttribute('width', (b.rx * 2).toFixed(1));
    boxRect.setAttribute('height', (b.ry * 2).toFixed(1));
    /* 惑星は円なので、つぶし(辺ハンドル)は出さない */
    for (const h of handles) {
      const isEdge = h.kind === 'edge' || h.kind === 'edgeband';
      /* 複数まとめては回転させない(角の回転ゾーンは隠す)。単体の惑星は円なので辺・回転を隠す */
      const hide = (multi && h.kind === 'rot') || (sel === 'planet' && (isEdge || h.kind === 'rot'));
      h.el.style.display = hide ? 'none' : '';
      if (hide) continue;
      const x = b.cx + b.rx * h.ix, y = b.cy + b.ry * h.iy;
      if (h.kind === 'edgeband') {
        /* 辺いっぱいの帯。角の回転ゾーンとぶつからないよう、少し内側で止める */
        const T = 22, inset = 18;   /* 2026-08-27: 掴みやすいよう帯を太く */
        if (h.ix === 0) {   /* 上下の辺 */
          h.el.setAttribute('x', (b.cx - b.rx + inset).toFixed(1));
          h.el.setAttribute('y', (y - T / 2).toFixed(1));
          h.el.setAttribute('width', Math.max(0, b.rx * 2 - inset * 2).toFixed(1));
          h.el.setAttribute('height', T);
        } else {            /* 左右の辺 */
          h.el.setAttribute('x', (x - T / 2).toFixed(1));
          h.el.setAttribute('y', (b.cy - b.ry + inset).toFixed(1));
          h.el.setAttribute('width', T);
          h.el.setAttribute('height', Math.max(0, b.ry * 2 - inset * 2).toFixed(1));
        }
        h.el.style.cursor = cursorFor(h.ix, h.iy, b.rot);
        continue;
      }
      if (h.kind === 'rot') {
        h.el.setAttribute('x', (x + h.ix * 4 - 15).toFixed(1));
        h.el.setAttribute('y', (y + h.iy * 4 - 15).toFixed(1));
      } else {
        h.el.setAttribute('x', (x - 4.5).toFixed(1));
        h.el.setAttribute('y', (y - 4.5).toFixed(1));
        /* カーソルは向きに応じて Figma と同じ両矢印にする(回転角も加味) */
        h.el.style.cursor = cursorFor(h.ix, h.iy, b.rot);
      }
    }
  }
  function cursorFor(ix, iy, rot) {
    let a = Math.atan2(iy, ix) * 180 / Math.PI + rot;
    a = ((a % 180) + 180) % 180;
    if (a < 22.5 || a >= 157.5) return 'ew-resize';
    if (a < 67.5) return 'nwse-resize';
    if (a < 112.5) return 'ns-resize';
    return 'nesw-resize';
  }
  return {
    get on() { return on; },
    get selected() { return sel; },
    /* パネル側から: 選択が変わった時 / ドラッグで値が変わった時 に呼んでもらう */
    bind(onSelect, onChange) { onSel = onSelect; onEdit = onChange; },
    refresh() { if (onSel) onSel(sel); },
    select,
    set(v) {
      on = !!v;
      const el = ensure();
      if (el) el.style.display = on ? '' : 'none';
      /* 直接編集の間はアニメーションを止める(掴んで動かしやすくする)。切った時は元に戻す */
      /* ⚠️【2026-08-27 事故対応】set(true) が2回走ると wasRunning に false を覚えてしまい、
         オフにしても再生が戻らなかった(止まったまま)。すでに覚えている時は上書きしない。
         切る時は「編集のための一時停止」を必ず解除する(記録が無ければ再生に戻す)。 */
      if (on) { if (wasRunning == null) wasRunning = params.running; params.running = false; }
      else { params.running = (wasRunning == null ? true : wasRunning); wasRunning = null; select(null); }
      /* 編集バーと「元に戻す」の履歴を、編集モードに合わせて出し入れする */
      if (typeof editHistory !== 'undefined') {
        if (on) { editHistory.begin(); editBar.show(); } else editBar.hide();
      }
      if (onSel) onSel(on ? sel : null);
      if (typeof applyMarquee === 'function') applyMarquee();
      /* ④網でつながる を選んでいる時は、頂点のつまみも一緒に出す (2026-08-28 ヒデさん指定) */
      if (typeof meshHandles !== 'undefined') meshHandles.set(on && meshHandles.usable);
      renderFrame();
      if (on) place();
    },
    place,
  };
})();

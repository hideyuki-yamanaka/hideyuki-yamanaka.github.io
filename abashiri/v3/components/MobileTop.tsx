"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * スマホ（〜640px）用のトップ。デスクトップの固定キャンバスとは別レイアウト。
 *
 * ルール：左右24pxパディング／最小フォント12px／デスクトップの世界観を踏襲。
 *
 * 演出（2026-08-24 ヒデさん指示）：
 *   ページは「固定ビューのスライド」。上下スワイプ（またはホイール）で、
 *   画面はそのままに、いまの場面がブラーで消え → 次の場面がブラーから現れる
 *   （その場でブラーのクロスフェード。スクロールで流れていくのではない）。
 * コピー・写真はデスクトップ実装と同じ実データ。
 */
import { useRouter } from "next/navigation";
import MobileHeader, { MOBILE_GOTO_KEY, MOBILE_NAV } from "./MobileHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";

const MSG_TITLE = "網走は何もない。";
const MSG_BLOCKS: string[][] = [
  ["よくそんなことを言われます。", "ただ、それがいいんです。魅力なんです。"],
  [
    "いまの情報過多な日本で暮らしていると、考えることが多すぎです。",
    "休んでいるあいだも、頭が動き続けている。",
  ],
  ["網走は何も考えなくていい時間、ぼーっとする時間をお届けします。"],
  ["オホーツクの海と、広大な大地と、空。", "それ以外は、何もありません。"],
  ["網走は何もない。だから、たまらない。"],
];

const SPOTS = [
  {
    no: "01",
    slug: "notoro",
    title: "能取岬",
    img: "/img/spot-notoro.webp",
    body: "オホーツク海に突き出た岬で、突端には灯台と管理事務所があるだけ。ここから西方は能取湖と常呂町の海岸、北方はすべてオホーツク海、東方は遠く知床連山が眺められます。",
  },
  {
    no: "02",
    slug: "sango",
    title: "能取湖サンゴ草群落地",
    img: "/img/spot-sangoso.webp",
    body: "能取湖の南岸、卯原内に位置する「能取湖サンゴ草群生地」は、別名アッケシソウと呼ばれるサンゴ草の日本一を誇る群落地です。",
  },
  {
    no: "03",
    slug: "ryuhyo",
    title: "流氷クルーズ",
    img: "/img/spot-ryuhyo.webp",
    body: "冬のオホーツク海を埋め尽くす流氷は、はるかアムール川から流れ着く自然の贈りもの。砕氷船に乗れば、白い海原を割って進む音と揺れを全身で感じられます。",
  },
  {
    /* 🟡 2026-09-16：網走駅を外してスマホが3件になったので、PC（SpotShowcase）
       と同じ4件になるよう、PC にだけあった「ひまわり畑」を足した。
       スマホはPCを踏襲する取り決めに沿った補完です */
    no: "04",
    slug: "himawari",
    title: "大曲湖畔園地ひまわり畑",
    img: "/img/spot/himawari-1.webp",
    body: "網走刑務所の旧農場跡地を整備した広大な園地。秋には約260万本のひまわりが咲きそろい、展望台から一面の黄色を見渡せます。",
  },
];

const GOURMET = [
  { no: "01", title: "横山蒲鉾店", img: "/img/gourmet-new-1.webp", slug: "yokoyama" },
  { no: "02", title: "松尾ジンギスカン 呼人支店", img: "/img/gourmet-new-2.webp", slug: "matsuo" },
  { no: "03", title: "ラーメンだるまや", img: "/img/gourmet-new-3.webp", slug: "darumaya" },
  { no: "04", title: "酒縁酒場 屯々", img: "/img/gourmet-new-4.webp", slug: "tonton" },
];

/* 体験セクション（PC版 EventSection と同じ4件・同じ詳細ページへつなぐ） */
const EVENTS = [
  { no: "01", slug: "kangoku", title: "博物館 網走監獄", img: "/img/spot/kangoku-1.webp" },
  { no: "02", slug: "ryuhyokan", title: "オホーツク流氷館", img: "/img/spot/ryuhyokan-1.webp" },
  { no: "03", slug: "canoe", title: "カヌー体験", img: "/img/spot/canoe-1.webp" },
  { no: "04", slug: "washi", title: "オジロワシ・オオワシウォッチング", img: "/img/spot/washi-1.webp" },
];

/* KV / メッセージ / スポット×4 / グルメ / 体験 / フッター
   （2026-09-16 ヒデさん指示で体験とフッターを追加。PCと同じ中身をスマホでも見せる） */
const SCENE_COUNT = 9;

/** キービジュアルの作字ブロック（PC カンプ 415×379）をスマホで何倍にするか。
    PC との位置関係を壊さないよう、ブロックごと拡大縮小する。
    0.8 → 0.64（2026-09-16 ヒデさん指示「もう少し80%ぐらいに縮小」） */
/* フッターの作字ロゴの倍率。枠 415x379 を高さ150pxに収める（150/379） */
const FOOT_LOGO_SCALE = 150 / 379;

/* 【2026-09-17】タブレット（縦長の大きい画面）用の倍率。
   縦長タブレットは useIsMobile で【この縦長用レイアウト】に回している。
   iPhone 用の倍率のままだと、1024px の画面で作字が 266px しかなく
   スカスカに見えたので、744px 以上では大きくする（実測して決めた値）。 */
const KV_SCALE_TAB = 1.0;
const FOOT_LOGO_SCALE_TAB = 230 / 379;

const KV_SCALE = 0.64;
const DUR = 800; // トランジション時間(ms)

export default function MobileTop() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const lockRef = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  preload("/img/bg-hero.jpg", { as: "image", fetchPriority: "high" });

  const goTo = useCallback((n: number) => {
    setActive((prev) => {
      const t = Math.max(0, Math.min(SCENE_COUNT - 1, n));
      if (t === prev || lockRef.current) return prev;
      lockRef.current = true;
      window.setTimeout(() => {
        lockRef.current = false;
      }, DUR);
      return t;
    });
  }, []);
  const step = useCallback(
    (dir: number) => setActive((prev) => {
      if (lockRef.current) return prev;
      const t = Math.max(0, Math.min(SCENE_COUNT - 1, prev + dir));
      if (t !== prev) {
        lockRef.current = true;
        window.setTimeout(() => {
          lockRef.current = false;
        }, DUR);
      }
      return t;
    }),
    []
  );

  /* ホイール（縦）で1枚ずつ */
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // 横は無視（グルメの横送り用）
    if (Math.abs(e.deltaY) < 8) return;
    step(e.deltaY > 0 ? 1 : -1);
  };
  /* スワイプ（縦）で1枚ずつ */
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    touch.current = null;
    if (Math.abs(dy) < 40 || Math.abs(dy) <= Math.abs(dx)) return; // 縦スワイプのみ
    step(dy < 0 ? 1 : -1); // 上へスワイプ＝次へ
  };

  /* 別ページ（詳細ページなど）のメニューから飛んできた時、
     預かった場面をそのまま開く（2026-09-24 ヒデさん指摘の対応で追加）。
     ⚠️ 読んだら消す。消さないと次にトップへ来た時もまた飛ぶ */
  useEffect(() => {
    let n: string | null = null;
    try {
      n = sessionStorage.getItem(MOBILE_GOTO_KEY);
      if (n) sessionStorage.removeItem(MOBILE_GOTO_KEY);
    } catch {}
    if (n) setActive(Math.max(0, Math.min(SCENE_COUNT - 1, Number(n) || 0)));
  }, []);

  /* その場でブラーのクロスフェード（動かさない） */
  /* グルメ（白背景）のときはヘッダーを黒に切り替える */
  const headerDark = active === 6 || active === 7 || active === 8;
  useEffect(() => {
    document.documentElement.dataset.headerDark = headerDark ? "1" : "";
    return () => {
      document.documentElement.dataset.headerDark = "";
    };
  }, [headerDark]);

  const scene = (i: number): React.CSSProperties => ({
    opacity: i === active ? 1 : 0,
    filter: i === active ? "blur(0px)" : "blur(16px)",
    transition: `opacity ${DUR}ms cubic-bezier(0.22,1,0.36,1), filter ${DUR}ms cubic-bezier(0.22,1,0.36,1)`,
    pointerEvents: i === active ? "auto" : "none",
    zIndex: i === active ? 10 : 1,
  });

  return (
    <main
      className="relative h-[100dvh] w-full overflow-hidden bg-sky-bottom"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <MobileHeader dark={headerDark} onScene={goTo} />

      {/* ── 0: KV ───────────────────────── */}
      <section
        className="absolute inset-0 flex flex-col overflow-hidden"
        style={scene(0)}
      >
        <img
          src="/img/bg-hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/15 to-transparent" />

        <div className="relative z-10 flex flex-1 flex-col">
          <div className="flex flex-1 -translate-y-8 flex-col items-center justify-center">
            {/* 作字ブロックは PC カンプ 415×379 の相対配置そのまま
                （網走市観光サイトは吹き出しの右上）。スマホ幅に合わせて縮小。
                2026-08-28 ヒデさん指示：位置を勝手に変えずPC踏襲
                縮小率は KV_SCALE の1か所だけで管理する（枠の寸法も連動させる。
                片方だけ直すと中身と枠がずれるため）。
                2026-09-16 ヒデさん指示で 0.8 → さらに80%の 0.64 へ */}
            <div
              /* ⚠️ 倍率は CSS 変数で持つ。JS の定数のままだと
                 タブレット（744px以上）で差し替えられないため
                 （2026-09-17 タブレット対応） */
              style={
                {
                  ["--kv-s" as string]: KV_SCALE,
                  ["--kv-s-tab" as string]: KV_SCALE_TAB,
                  width: "calc(415px * var(--kv-s))",
                  height: "calc(379px * var(--kv-s))",
                } as React.CSSProperties
              }
              className="relative tab:![width:calc(415px*var(--kv-s-tab))] tab:![height:calc(379px*var(--kv-s-tab))]"
            >
              <div
                className="absolute left-0 top-0 h-[379px] w-[415px] origin-top-left [transform:scale(var(--kv-s))] tab:[transform:scale(var(--kv-s-tab))]"
              >
                {/* ⚠️ 作字は 471x390。415px の枠に直接置くと img の max-width:100% で
                   415px まで縮められ（実測 390→343.6px）、「網走市観光サイト」との
                   位置関係が PC とずれる。PC と同じく入れ子の div に逃がして、
                   幅と高さを明示する（2026-09-16 ヒデさん指摘） */}
                <div className="absolute left-[-28px] top-[13.1px]">
                  <img
                    src="/img/hero-message.svg"
                    alt="な〜んにもない、たまらない。"
                    className="h-[390px] w-[471px] max-w-none"
                  />
                </div>
                <img
                  src="/img/text-kanko-site.svg"
                  alt="網走市観光サイト"
                  className="absolute left-[215.7px] top-[8.3px] h-[36.3px] w-[188.2px]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/experience")}
              className="mt-6 flex items-center justify-center rounded-full bg-white/10 px-6 py-[13px] text-body-14 font-medium leading-none text-white ring-1 ring-inset ring-white/40 backdrop-blur-65 transition-transform active:scale-95"
            >
              ぼーっとしてみる
            </button>
          </div>
          <img
            src="/img/illust-main.png"
            alt=""
            className="pointer-events-none absolute -bottom-[30px] right-3 w-[90px]"
          />
        </div>
      </section>

      {/* ── 1: メッセージ ─────────────────── */}
      <section
        className="absolute inset-0 flex items-center bg-gradient-to-b from-sky-top to-brand px-6 text-white tab:px-[80px]"
        style={scene(1)}
      >
        {/* タブレットは行が長くなりすぎるので、柱の幅を決めて中央に置く */}
        <div className="w-full tab:mx-auto tab:max-w-[680px]">
          <h2 className="text-title-28 font-thin leading-[1.5] tab:text-title-44">
            {MSG_TITLE}
          </h2>
          <div className="mt-9 space-y-6 text-body-14 font-light leading-[2] tracking-[0.3px] tab:mt-12 tab:space-y-8 tab:text-body-18">
            {MSG_BLOCKS.map((lines, i) => (
              <p key={i}>
                {lines.map((l, j) => (
                  <span key={j} className="block">
                    {l}
                  </span>
                ))}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2〜5: ぼーっとスポット ───────────── */}
      {SPOTS.map((spot, si) => (
        <section
          key={spot.no}
          className="absolute inset-0 overflow-hidden"
          style={scene(2 + si)}
        >
          <img
            src={spot.img}
            alt={spot.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* 文字は写真に直接載せず、PC版と同じ「すりガラスのカード」に載せる
              （white/10 + backdrop-blur-65。角丸なし。2026-09-16 ヒデさん指示）。
              カードごとタップで詳細ページへ */}
          <button
            type="button"
            onClick={() => router.push(`/spot/${spot.slug}`)}
            className="absolute inset-x-6 bottom-[72px] flex flex-col gap-4 bg-white/10 p-6 text-left text-white backdrop-blur-65 tab:inset-x-[80px] tab:bottom-[110px] tab:gap-6 tab:p-10"
          >
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body-13 font-extralight tab:text-body-16">
                  ぼーっとスポット {spot.no}
                </p>
                <p className="mt-1 text-title-24 font-thin leading-tight tab:mt-2 tab:text-title-34">
                  {spot.title}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 pb-1 text-body-12 font-extralight tab:text-body-14">
                もっと見る
                <img src="/img/icon-view-more.svg" alt="" className="size-[16px]" />
              </span>
            </div>
            {/* ⚠️ タブレットで1行が長くなりすぎる（実測: 1024px幅で約66文字）ので
                読みやすい行長（約40文字）で止める */}
            <p className="text-body-13 font-extralight leading-[1.9] tracking-[0.3px] tab:max-w-[640px] tab:text-body-16 tab:leading-[2]">
              {spot.body}
            </p>
          </button>
        </section>
      ))}

      {/* ── 6: 素朴なグルメ ───────────────── */}
      <section
        className="absolute inset-0 flex flex-col justify-center bg-white px-6 tab:px-[80px]"
        style={scene(6)}
      >
        <h2 className="text-body-20 font-thin leading-[1.7] text-ink tab:text-title-34">
          なーんにもない、道東の土地、網走。
          <br />
          そこの味が沁みちゃうんです。
        </h2>
        {/* 自動スライドショー（連続スクロール＝gourmet-marquee を再利用）。
            シームレスにループさせるためカードを2周ぶん並べる */}
        <div className="-mx-6 mt-8 overflow-hidden tab:-mx-[80px] tab:mt-12">
          <div
            className="gourmet-marquee flex w-max gap-3 pl-6 tab:gap-5 tab:pl-[80px]"
            style={{ ["--gourmet-speed" as string]: "28s" }}
          >
            {[...GOURMET, ...GOURMET].map((card, idx) => (
              /* タップで詳細ページへ（2026-09-20 ヒデさん指示でグルメにも詳細を新設）。
                 流れている最中でも押せるよう、カードごと押せる形にしてある */
              <div
                key={idx}
                onClick={() => router.push(`/gourmet/${card.slug}`)}
                className="relative w-[230px] shrink-0 cursor-pointer overflow-hidden tab:w-[330px]"
              >
                <img
                  src={card.img}
                  alt={card.title}
                  className="h-[300px] w-full object-cover tab:h-[430px]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 text-white">
                  <p className="text-body-12 font-extralight tab:text-body-13">
                    素朴なグルメ {card.no}
                  </p>
                  <p className="mt-0.5 text-body-16 font-light leading-snug tab:text-body-20">
                    {card.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7: 体験セクション ───────────────── */}
      <section
        className="absolute inset-0 flex flex-col justify-center bg-white px-6 tab:px-[80px]"
        style={scene(7)}
      >
        <h2 className="text-body-20 font-thin leading-[1.7] text-ink tab:text-title-34">
          意外とオモロい、網走。
        </h2>
        {/* 2列×2段。タップで詳細ページへ */}
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 tab:mt-12 tab:gap-x-6 tab:gap-y-10">
          {EVENTS.map((e) => (
            <button
              key={e.slug}
              type="button"
              onClick={() => router.push(`/spot/${e.slug}`)}
              className="flex flex-col gap-2 text-left"
            >
              <div className="overflow-hidden">
                <img
                  src={e.img}
                  alt={e.title}
                  className="h-[150px] w-full object-cover tab:h-[300px]"
                />
              </div>
              <p className="text-body-12 font-extralight leading-[1.4] text-ink/50 tab:text-body-13">
                体験 {e.no}
              </p>
              <p className="text-body-14 font-light leading-[1.5] text-ink tab:text-body-20">
                {e.title}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* ── 8: フッター ───────────────────── */}
      <section
        className="absolute inset-0 flex flex-col items-center justify-center gap-10 bg-white px-6"
        style={scene(8)}
      >
        {/* 作字ロゴ。PC のフッター（SiteFooter の Logo）と同じ組みにそろえて
            「網走市観光サイト」を吹き出しの右上に入れる（2026-09-17 ヒデさん指摘で追加）。
            ⚠️ 枠は 415x379。ここを高さ150pxに合わせるので倍率は 150/379 = 0.396。
               作字は 471x390 なので、PC と同じく入れ子の div に逃がして
               max-w-none を明示する（直に置くと 415px に切り詰められて位置がずれる）。
            ⚠️ ここは白背景。もとの text-kanko-site.svg は【白い文字】なので、
               青にした text-kanko-site-blue.svg を使う（白のままだと見えない） */}
        <div
          className="relative tab:![width:calc(415px*var(--ft-s-tab))] tab:![height:calc(379px*var(--ft-s-tab))]"
          style={
            {
              ["--ft-s" as string]: FOOT_LOGO_SCALE,
              ["--ft-s-tab" as string]: FOOT_LOGO_SCALE_TAB,
              width: "calc(415px * var(--ft-s))",
              height: "calc(379px * var(--ft-s))",
            } as React.CSSProperties
          }
        >
          <div
            className="absolute left-0 top-0 h-[379px] w-[415px] origin-top-left [transform:scale(var(--ft-s))] tab:[transform:scale(var(--ft-s-tab))]"
          >
            <div className="absolute left-[-28px] top-[13.1px]">
              <img
                src="/img/hero-message-blue.svg"
                alt="な〜んにもない たまらない"
                className="h-[390px] w-[471px] max-w-none"
              />
            </div>
            <img
              src="/img/text-kanko-site-blue.svg"
              alt="網走市観光サイト"
              className="absolute left-[215.7px] top-[8.3px] h-[36.3px] w-[188.2px]"
            />
          </div>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 tab:gap-x-8">
          {MOBILE_NAV.map((n) => (
            <button
              key={n.label}
              type="button"
              onClick={() => goTo(n.scene)}
              className="text-body-13 font-light leading-[1.2] text-ink/70 tab:text-body-16"
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          {[
            { icon: "/img/sns-ig-circle.svg", label: "Instagram" },
            { icon: "/img/sns-x.svg", label: "X" },
            { icon: "/img/sns-yt.svg", label: "YouTube" },
          ].map((s) => (
            <a
              key={s.label}
              href="#"
              aria-label={s.label}
              className="opacity-70"
              onClick={(ev) => ev.preventDefault()}
            >
              <img src={s.icon} alt="" className="h-[18px] w-auto [filter:brightness(0)] tab:h-[24px]" />
            </a>
          ))}
        </div>
      </section>

      {/* 右端の進行ドットは 2026-09-16 ヒデさん指示で撤去。
         場面移動はスワイプとメニューで足りるため */}

    </main>
  );
}

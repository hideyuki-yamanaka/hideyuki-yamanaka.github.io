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
import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";

const NAV: { label: string; href?: string; scene?: number }[] = [
  { label: "ホーム", scene: 0 },
  { label: "ぼーっとスポット", scene: 2 },
  { label: "グルメ", scene: 6 },
  { label: "体験", href: "/experience" },
];

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
    title: "能取岬",
    img: "/img/spot-notoro.jpg",
    body: "オホーツク海に突き出た岬で、突端には灯台と管理事務所があるだけ。ここから西方は能取湖と常呂町の海岸、北方はすべてオホーツク海、東方は遠く知床連山が眺められます。",
  },
  {
    no: "02",
    title: "能取湖サンゴ草群落地",
    img: "/img/spot-sangoso.jpg",
    body: "能取湖の南岸、卯原内に位置する「能取湖サンゴ草群生地」は、別名アッケシソウと呼ばれるサンゴ草の日本一を誇る群落地です。",
  },
  {
    no: "03",
    title: "網走駅",
    img: "/img/spot-eki.jpg",
    body: "石北本線と釧網本線が乗り入れる、オホーツクの玄関口。縦書きの駅名標には「人生を横道にそれず、まっすぐ歩んでほしい」という願いが込められていると伝わります。",
  },
  {
    no: "04",
    title: "流氷クルーズ",
    img: "/img/spot-ryuhyo.jpg",
    body: "冬のオホーツク海を埋め尽くす流氷は、はるかアムール川から流れ着く自然の贈りもの。砕氷船に乗れば、白い海原を割って進む音と揺れを全身で感じられます。",
  },
];

const GOURMET = [
  { no: "01", title: "横山蒲鉾店", img: "/img/gourmet-new-1.jpg" },
  { no: "02", title: "松尾ジンギスカン 呼人支店", img: "/img/gourmet-new-2.jpg" },
  { no: "03", title: "ラーメンだるまや", img: "/img/gourmet-new-3.jpg" },
  { no: "04", title: "酒縁酒場 屯々", img: "/img/gourmet-new-4.jpg" },
];

const SCENE_COUNT = 7; // KV / メッセージ / スポット×4 / グルメ
const DUR = 800; // トランジション時間(ms)

export default function MobileTop() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const go = (item: (typeof NAV)[number]) => {
    setMenuOpen(false);
    if (item.href) router.push(item.href);
    else if (typeof item.scene === "number") goTo(item.scene);
  };

  /* その場でブラーのクロスフェード（動かさない） */
  /* グルメ（白背景）のときはヘッダーを黒に切り替える */
  const headerDark = active === 6;
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
      {/* 固定追従ヘッダー：左=環境音ON/OFF、右=ハンバーガー（全シーン共通。2026-08-28 ヒデさん指示） */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 pt-5">
        <div
          id="abashiri-sound-slot"
          className="pointer-events-auto flex h-[22px] origin-left scale-[0.72] items-center"
        />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="メニューを開く"
          className="pointer-events-auto flex size-9 items-center justify-center"
        >
          <span className="relative block h-[11px] w-[24px]">
            <span
              className={`absolute left-0 top-0 h-[1.5px] w-full rounded-full ${headerDark ? "bg-ink" : "bg-white"}`}
            />
            <span
              className={`absolute bottom-0 left-0 h-[1.5px] w-full rounded-full ${headerDark ? "bg-ink" : "bg-white"}`}
            />
          </span>
        </button>
      </header>

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
                2026-08-28 ヒデさん指示：位置を勝手に変えずPC踏襲 */}
            <div style={{ width: 415 * 0.8, height: 379 * 0.8 }} className="relative">
              <div className="absolute left-0 top-0 h-[379px] w-[415px] origin-top-left scale-[0.8]">
                <img
                  src="/img/hero-message.svg"
                  alt="な〜んにもない、たまらない。"
                  className="absolute left-[-28px] top-[13.1px] w-[471px]"
                />
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
              className="mt-6 flex items-center justify-center rounded-full bg-white/10 px-6 py-[13px] text-[14px] font-medium leading-none text-white ring-1 ring-inset ring-white/45 backdrop-blur-[12px] transition-transform active:scale-95"
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
        className="absolute inset-0 flex items-center bg-gradient-to-b from-sky-top to-brand px-6 text-white"
        style={scene(1)}
      >
        <div>
          <h2 className="text-[28px] font-thin leading-[1.5]">{MSG_TITLE}</h2>
          <div className="mt-9 space-y-6 text-[14px] font-light leading-[2] tracking-[0.3px]">
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
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-6 pb-12 pt-28 text-white">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-extralight">
                  ぼーっとスポット {spot.no}
                </p>
                <p className="mt-1 text-[22px] font-thin leading-tight">
                  {spot.title}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 pb-1 text-[12px] font-extralight">
                もっと見る
                <img src="/img/icon-view-more.svg" alt="" className="size-[16px]" />
              </span>
            </div>
            <p className="mt-3 text-[13px] font-extralight leading-[1.9] tracking-[0.3px]">
              {spot.body}
            </p>
          </div>
        </section>
      ))}

      {/* ── 6: 素朴なグルメ ───────────────── */}
      <section
        className="absolute inset-0 flex flex-col justify-center bg-white px-6"
        style={scene(6)}
      >
        <h2 className="text-[20px] font-thin leading-[1.7] text-ink">
          なーんにもない、道東の土地、網走。
          <br />
          そこの味が沁みちゃうんです。
        </h2>
        {/* 自動スライドショー（連続スクロール＝gourmet-marquee を再利用）。
            シームレスにループさせるためカードを2周ぶん並べる */}
        <div className="-mx-6 mt-8 overflow-hidden">
          <div
            className="gourmet-marquee flex w-max gap-3 pl-6"
            style={{ ["--gourmet-speed" as string]: "28s" }}
          >
            {[...GOURMET, ...GOURMET].map((card, idx) => (
              <div
                key={idx}
                className="relative w-[230px] shrink-0 overflow-hidden rounded-3xl"
              >
                <img
                  src={card.img}
                  alt={card.title}
                  className="h-[300px] w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 text-white">
                  <p className="text-[12px] font-extralight">
                    素朴なグルメ {card.no}
                  </p>
                  <p className="mt-0.5 text-[16px] font-light leading-snug">
                    {card.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 進行ドット（右端・タップでも移動） ───── */}
      <div className="absolute right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2">
        {Array.from({ length: SCENE_COUNT }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}枚目へ`}
            onClick={() => goTo(i)}
            className={`block rounded-full transition-all duration-300 ${
              i === active
                ? "h-4 w-[6px] bg-white"
                : "size-[6px] bg-white/45"
            } ${active === 6 ? "mix-blend-difference" : ""}`}
          />
        ))}
      </div>

      {/* ── ハンバーガーメニュー ─────────────── */}
      {menuOpen && (
        <nav className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-9 bg-brand/95 text-white backdrop-blur-lg">
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="閉じる"
            className="absolute right-6 top-6 flex size-9 items-center justify-center text-white"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 2L14 14M14 2L2 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {NAV.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => go(item)}
              className="text-[18px] font-light leading-none text-white"
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </main>
  );
}

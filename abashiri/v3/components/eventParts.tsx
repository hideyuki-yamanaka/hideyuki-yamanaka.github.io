"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 体験セクションの共通部品（EventSection.tsx と EventVariants4/5.tsx が使う）
 * 2026-09-16 に EventSection.tsx から切り出した。
 * 案が増えてファイルが太ってきたので、データ・文字組み・カードの枠だけをここに置く。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  animate,
  motionValue,
  useAnimationFrame,
  useMotionValue,
  useTransform,
  type MotionValue,
  type Transition,
} from "framer-motion";

export type EventItem = {
  /* 【2026-09-16 ヒデさん指示】他のセクションと同じく通し番号を振る。
     表示は「体験 01」。「イベント」の語は使わない */
  no: string;
  tag: string;
  title: string;
  body: string;
  img: string;
  /** 詳細ページの slug（spotDetailData.ts のキー）。4件とも繋いである */
  slug: string;
};

/* 4件とも網走市観光公式サイトの実在ページに対応させ、詳細ページへつないでいる
   （2026-09-15 ヒデさん指示。以前の仮置き文言は廃止） */
export const ITEMS: EventItem[] = [
  {
    no: "01",
    tag: "体験",
    title: "博物館 網走監獄",
    body: "実際に使われていた監獄の建物を移築・復原した野外博物館。重要文化財の舎房や、受刑者が食べている「監獄食」を味わえる食堂もあります。",
    img: "/img/spot/kangoku-1.webp",
    slug: "kangoku",
  },
  {
    no: "02",
    tag: "体験",
    title: "オホーツク流氷館",
    body: "天都山の頂上にある、流氷を一年中体感できる施設。マイナス15度の流氷体感テラスや、クリオネなど流氷の生きものに会えます。",
    img: "/img/spot/ryuhyokan-1.webp",
    slug: "ryuhyokan",
  },
  {
    no: "03",
    tag: "体験",
    title: "カヌー体験",
    body: "網走川や網走湖を、ガイドと一緒にゆっくり漕ぎ出す水の上のさんぽ。鳥の声と水の音だけの静かな時間が待っています。",
    img: "/img/spot/canoe-1.webp",
    slug: "canoe",
  },
  {
    no: "04",
    tag: "体験",
    title: "オジロワシ・オオワシウォッチング",
    body: "冬の網走に渡ってくる大型のワシを、ガイドと探しにいくツアー。流氷の上や河口の木々にとまる姿は迫力満点です。",
    img: "/img/spot/washi-1.webp",
    slug: "washi",
  },
];

export const EASE = [0.22, 1, 0.36, 1] as const;
export const reveal = {
  hidden: { opacity: 0, y: 32, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.1, ease: EASE },
  },
};
export const VIEW = { once: true, amount: 0.25 } as const;

/* ── 文字の部品（カンプの書式） ───────────────── */

export /* 大見出し。大きさは --sec-head（グルメと共通・調整パネルのつまみ）。
   行間だけ縦組み/横組みで変えている */
function VTitle({ className = "" }: { className?: string }) {
  return (
    <h2
      className={`shrink-0 whitespace-nowrap text-[length:var(--sec-head)] font-thin leading-[1.3] text-ink ${className}`}
      style={{ writingMode: "vertical-rl" }}
    >
      意外とオモロい、網走。
    </h2>
  );
}

export function HTitle({ className = "" }: { className?: string }) {
  return (
    <h2
      className={`whitespace-nowrap text-[length:var(--sec-head)] font-thin leading-[1.8] text-ink ${className}`}
    >
      意外とオモロい、網走。
    </h2>
  );
}

export function Caption({
  it,
  size = "sm",
  className = "",
}: {
  it: EventItem;
  size?: "sm" | "lg";
  className?: string;
}) {
  /* 説明ごと詳細ページへのリンクにする（2026-09-15 ヒデさん指示「全部つなぎ込む」） */
  return (
    <Link
      href={`/spot/${it.slug}`}
      className={`group flex flex-col gap-2 ${className}`}
    >
      <p className="text-body-14 font-extralight leading-[1.2] tracking-[0.7px] text-ink/45 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        {it.tag} {it.no}
      </p>
      <p
        className={`font-thin leading-[1.4] text-ink ${
          size === "lg" ? "text-title-28" : "text-body-18"
        }`}
      >
        {it.title}
      </p>
      {size === "lg" && (
        <p className="mt-2 text-body-14 font-extralight leading-[2] tracking-[0.7px] text-ink/70">
          {it.body}
        </p>
      )}
      <span className="mt-1 flex items-center gap-1 text-body-14 font-extralight leading-[1.2] text-ink/60 transition-transform duration-300 ease-standard group-hover:translate-x-[6px]">
        もっと見る
        <img src="/img/icon-view-more-black.svg" alt="" className="size-[14px]" />
      </span>
    </Link>
  );
}

/** カードのリンク枠。カード全体がホバー領域で、中の写真が枠内で拡大する。
    グルメのカードと同じ言葉遣い（1.06倍・700ms・ease-out）。
    ⚠️ 拡大はこの枠に掛ける。中の写真は framer が transform を直接書くので、
    写真側に hover クラスを足しても上書きされて効かない（2026-09-16） */
export function CardLink({
  it,
  className = "",
  style,
  children,
}: {
  it: EventItem;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={`overflow-hidden ${className}`} style={style}>
      <Link
        href={`/spot/${it.slug}`}
        className="block size-full transition-transform duration-700 ease-out hover:scale-[1.06]"
      >
        {children}
      </Link>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   画面を固定してから動かすしくみ（2026-09-17 ヒデさん依頼）
   「中央に来た時にビューポートが中央に来て、真ん中に来た後に四方に飛び散る。
     一旦画面の固定が入った方がいい」
   ═══════════════════════════════════════════════════ */

/** ピンしている間の進み具合 0→1 を返す。
    ⚠️ トップページは window ではなく [data-abashiri-scroller] の中がスクロールする。
       さらに 1512×982 のキャンバスを縮小表示しているので、
       getBoundingClientRect（縮小後のpx）と scrollTop（縮小前のpx）を混ぜてはいけない。
       offsetTop を親まで足し上げて、全部「縮小前のpx」でそろえる */
export function usePinProgress(stage: React.RefObject<HTMLElement | null>) {
  const q = useMotionValue(0);
  useAnimationFrame(() => {
    const st = stage.current;
    const sc = document.querySelector<HTMLElement>("[data-abashiri-scroller]");
    if (!st || !sc) return;
    let top = 0;
    let el: HTMLElement | null = st;
    while (el && el !== sc) {
      top += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    const travel = Math.max(1, st.offsetHeight - sc.clientHeight);
    const v = Math.max(0, Math.min(1, (sc.scrollTop - top) / travel));
    if (Math.abs(v - q.get()) > 0.0005) q.set(v);
  });
  return q;
}

/** 画面いっぱい（1512×982）の場面を、指定した長さぶん貼りつけておく箱。
    hold で「貼りついてから動き出すまでの“ため”」を作れる（0.18＝最初の18%は静止） */
/** 4枚目が出たとみなす進み具合。ここまで来たら関所をあける
    （1.0 まで待つと「見終わったのに下へ行けない」になる。2026-09-24 ヒデさん報告） */
const PEEL_DONE = 0.96;
/** 関所の保険。【貼りついたまま進みが止まって】この時間(ms)たったら通す。
    2026-09-26：「1回スクロール＝1枚」になり、見る人が自分のペースで進めるので、
    貼りつく前から数えていた旧仕様（6秒）だと読んでいる途中で勝手にあいてしまう。
    → 貼りついている間だけ、最後に進んでからの時間で数える */
const GATE_MAX_MS = 9000;

export function PinStage({
  /** 貼りつけておく長さ。画面の高さの何倍か */
  length = 2.6,
  children,
  hold,
}: {
  length?: number;
  /** pinned: いま場面が画面に貼りついているか（true の間だけ「1回＝1枚」を受け付ける） */
  children: (
    q: MotionValue<number>,
    pinned: React.RefObject<boolean>
  ) => React.ReactNode;
  /** 0〜1。1 になるまで【この場面から下へ抜けさせない】ための見張り。
      中の場面が毎フレーム書き込む（1 に達したら解除）。
      【2026-09-20 ヒデさん指示】
        「今2枚目見終わったら下にスクロールできる感じになっているので、
          ちゃんと4枚目まで見た後に、見終わったら下にスクロールできる感じに」
      ⚠️ 写真が流れる速さは「一定」（＝スクロールの強さに関係なく一定）なので、
         強くスクロールすると【写真が追いつく前に貼りつきが切れて】しまう。
         位置で決まる貼りつきと、時間で進む流れは、そのままでは両立しない。
         そこで「流れ終わるまでは、この場面の下端より先へ行かせない」。
         上へ戻るのは自由（下向きだけ止める）。 */
  hold?: React.RefObject<number>;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const q = usePinProgress(stage);

  /* 直前のスクロール位置。上へ動いたか下へ動いたかを見るのに使う */
  const lastTop = useRef(-1);
  /* 関所を張り始めた時刻。長く止めすぎないための保険 */
  const gateSince = useRef(0);
  /* 保険の判定用：最後に見た進み具合と、時間切れで通したかどうか */
  const lastHold = useRef(0);
  const timedOut = useRef(false);
  /* いま場面が画面に貼りついているか。中の場面が「1回＝1枚」の受付に使う */
  const pinned = useRef(false);

  useAnimationFrame(() => {
    if (!hold) return;
    const w = window as unknown as { __abashiriScrollGate?: number };
    const openGate = () => {
      if (w.__abashiriScrollGate !== undefined) delete w.__abashiriScrollGate;
      gateSince.current = 0;
    };
    const el = stage.current;
    const sc = document.querySelector<HTMLElement>("[data-abashiri-scroller]");
    if (!el || !sc) return;

    let y = 0;
    let e: HTMLElement | null = el;
    while (e && e !== sc) {
      y += e.offsetTop;
      e = e.offsetParent as HTMLElement | null;
    }
    const limit = y + el.offsetHeight - sc.clientHeight;
    const now = sc.scrollTop;
    const goingUp = lastTop.current >= 0 && now < lastTop.current - 0.5;
    lastTop.current = now;
    const pinnedNow = now >= y - 2 && now <= limit + 2;
    pinned.current = pinnedNow;

    /* まだ場面の手前にいる／もう通り過ぎた → 何もしない */
    if (now <= y - sc.clientHeight * 3 || now > limit + sc.clientHeight) {
      openGate();
      return;
    }

    /* 【2026-09-21→24 ヒデさん報告の修正】
         「下の方にスムーズに行けない」「スクロールバックで上に行けない」
         「4枚目を見てもすぐ下に行けない」
       原因は、この関所が強すぎたこと。3つ直す：
         ① 上へ戻る時は【一切止めない】（前は上向きにも通せんぼしていた）
         ② 4枚目が出たら即あける（前は進み具合が 1.0 になるまで閉じていた）
         ③ 保険の時間切れ。万一あかない状態になっても数秒で必ず通す */
    if (goingUp) { openGate(); return; }                      /* ① */
    if (hold.current >= PEEL_DONE) { openGate(); return; }    /* ② */

    /* ③ 保険（2026-09-26 作り直し）
       ・貼りつく前は数えない（関所だけ張っておく）
       ・貼りついたら「最後に進んでから」の時間で数える
       ・時間切れで一度あけたら、進むか場面を離れるまで【あけっぱなし】にする
         （旧仕様は1フレームだけあけて、次のフレームでまた閉じていた） */
    if (!pinnedNow) {
      gateSince.current = 0;
      timedOut.current = false;
      lastHold.current = hold.current;
      w.__abashiriScrollGate = limit;
      return;
    }
    if (Math.abs(hold.current - lastHold.current) > 0.004) {
      lastHold.current = hold.current;
      gateSince.current = performance.now();
      timedOut.current = false;
    }
    if (!gateSince.current) gateSince.current = performance.now();
    if (timedOut.current || performance.now() - gateSince.current > GATE_MAX_MS) {
      timedOut.current = true;
      if (w.__abashiriScrollGate !== undefined) delete w.__abashiriScrollGate;
      return;
    }
    w.__abashiriScrollGate = limit;
  });

  return (
    /* ⚠️ -mt-[180px]：体験セクションの上パディングを打ち消して、
       貼りついた場面がちょうど画面いっぱいになるようにする */
    <div
      ref={stage}
      className="relative -mt-[180px] w-full"
      style={{ height: `${Math.round(length * 982)}px` }}
    >
      <div className="sticky top-0 h-[982px] w-full overflow-hidden bg-white">
        {children(q, pinned)}
      </div>
    </div>
  );
}

/* ═══════════ 1回スクロール＝1枚（案31・32 の重ね写真） ═══════════
   【2026-09-26 ヒデさん指示】
     「スクロールの強さによって進む距離が変わっている。写真が右にずれる挙動が
       スクロールの強さに影響されずに、一回スクロールすれば一定の速度で流れる感じに」
     「今すごくリニアで横にワーって機械的。もう少し自然に流れるアニメを3案」
   旧：スクロールした【量】を行き先にして、一定の速さで追いかけていた
       → 強くスクロールすると行き先が遠くなり、何枚もまとめて流れていた
   新：スクロールの【回数】だけを見る。1回（ひと続きの操作）＝1枚。
       流れる時間とカーブは毎回同じなので、強く回しても弱く回しても同じ動きになる */

/** ひと続きの操作とみなす間隔(ms)。これより空いたら「次の1回」 */
const GESTURE_GAP = 220;

/** 流れ方の3案。何が違うかは note に書いてある（パネルにもそのまま出る） */
export type EvFlow = {
  name: string;
  note: string;
  /** 1枚がめくれる時の時間とカーブ */
  move: Transition;
  /** 流れる途中でふわっと浮き上がる量(px)。0＝まっすぐ横へ */
  lift: number;
  /** 流れながら回る量(度) */
  spin: number;
  /** 回転の遅れ。1＝移動と同時、2＝あとから遅れてついてくる */
  spinLag: number;
  /** 移動のどこから消え始めるか（0〜1） */
  fadeAt: number;
  /** 1枚抜けたあと、残った束がしなって落ち着くか */
  settle: boolean;
};

export const EV_FLOWS: Record<number, EvFlow> = {
  1: {
    name: "案1 ふわっと減速",
    note: "【違い＝止まり方】出だしだけ少し速く、あとは氷の上をすべるように長く減速して止まる。まっすぐ横へ。いちばん素直で静か（1枚あたり約1.1秒）",
    move: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
    lift: 0,
    spin: 10,
    spinLag: 1,
    fadeAt: 0.5,
    settle: false,
  },
  2: {
    name: "案2 しなり",
    note: "【違い＝手ざわり】ばねで引っぱられたように流れ、残った写真の束も小さく揺れてから落ち着く。紙の束をめくった時の“しなり”がある動き（1枚あたり約1秒）",
    move: { type: "spring", stiffness: 95, damping: 14, mass: 1 },
    lift: 0,
    spin: 14,
    spinLag: 1,
    fadeAt: 0.6,
    settle: true,
  },
  3: {
    name: "案3 風に流される",
    note: "【違い＝軌道】ゆっくり動き出し、ふわっと浮き上がって弧を描きながら右へ流れる。回転はあとから遅れてついてくる。いちばんゆったり（1枚あたり約1.6秒）",
    move: { duration: 1.6, ease: [0.45, 0, 0.2, 1] },
    lift: 70,
    spin: 18,
    spinLag: 2,
    fadeAt: 0.55,
    settle: false,
  },
};

/** いま選ばれている流れ方（CSS 変数 --ev-flow。調整パネルが書く） */
export function useEvFlow(): EvFlow {
  const [n, setN] = useState(1);
  useAnimationFrame(() => {
    const v = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--ev-flow"),
      10
    );
    const k = EV_FLOWS[v] ? v : 1;
    if (k !== n) setN(k);
  });
  return EV_FLOWS[n];
}

/** 重ね写真の各カードの動き（0＝束の中 → 1＝抜けた）を「1回＝1枚」で進める。
    - いちばん上（配列の最後）から順に抜ける。いちばん下（i=0）は台紙として残る
    - 上向きの操作では1枚ずつ戻る
    - 場面の上へ抜けたら全部戻す
    hold には「抜けきった割合」を書き、PinStage の関所に使わせる */
export function useStepCards(
  q: MotionValue<number>,
  pinned: React.RefObject<boolean>,
  hold: React.RefObject<number>
) {
  const flow = useEvFlow();
  const steps = ITEMS.length - 1; /* 抜ける枚数（台紙の1枚は残す） */
  /* 各カードの進み（0→1）と、束の“しなり”用の値 */
  const ts = useMemo(() => ITEMS.map(() => motionValue(0)), []);
  const nudges = useMemo(() => ITEMS.map(() => motionValue(0)), []);
  const step = useRef(0);
  const flowRef = useRef(flow);
  flowRef.current = flow;

  /* 段を動かす。i 番目のカードは「上から何枚目か」で出番が決まる */
  const goTo = (next: number) => {
    const n = Math.max(0, Math.min(steps, next));
    if (n === step.current) return;
    const prev = step.current;
    step.current = n;
    const f = flowRef.current;
    ITEMS.forEach((_, i) => {
      if (i === 0) return; /* 台紙は動かさない */
      const order = ITEMS.length - 1 - i; /* 0 が最初に抜ける */
      animate(ts[i], n > order ? 1 : 0, f.move);
    });
    /* 案2：1枚抜けたら、次にいちばん上になったカードがしなって落ち着く */
    if (f.settle && n > prev) {
      const top = ITEMS.length - 1 - n; /* 次にいちばん上のカード */
      if (top >= 0) {
        animate(nudges[top], [0, 1, -0.35, 0], {
          duration: 0.9,
          times: [0, 0.3, 0.65, 1],
          ease: "easeInOut",
        });
      }
    }
  };

  /* 操作の受付：ホイール・キー・スワイプ。貼りついている間だけ数える */
  useEffect(() => {
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 2 || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const now = performance.now();
      const fresh = now - last > GESTURE_GAP;
      last = now;
      if (!fresh || !pinned.current) return;
      goTo(step.current + (e.deltaY > 0 ? 1 : -1));
    };
    const onKey = (e: KeyboardEvent) => {
      if (!pinned.current) return;
      if (["ArrowDown", "PageDown", " "].includes(e.key)) goTo(step.current + 1);
      else if (["ArrowUp", "PageUp"].includes(e.key)) goTo(step.current - 1);
    };
    let ty = 0;
    const onTouchStart = (e: TouchEvent) => {
      ty = e.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = (e.changedTouches[0]?.clientY ?? ty) - ty;
      if (Math.abs(dy) < 30 || !pinned.current) return;
      goTo(step.current + (dy < 0 ? 1 : -1));
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 場面の上へ抜けたら全部戻す／関所へ「抜けきった割合」を渡す */
  useAnimationFrame(() => {
    if (q.get() <= 0.0005 && step.current > 0 && !pinned.current) goTo(0);
    let sum = 0;
    for (let i = 1; i < ITEMS.length; i++) sum += Math.min(1, Math.max(0, ts[i].get()));
    hold.current = steps > 0 ? sum / steps : 1;
  });

  return { ts, nudges, flow };
}

/** 「ため」を作ってから 0→1 にする（貼りついた直後は動かさない） */
export function afterHold(
  q: MotionValue<number>,
  hold = 0.18,
  end = 0.92
): MotionValue<number> {
  return useTransform(q, [hold, end], [0, 1], { clamp: true });
}

/** 進み具合を ref に毎フレーム写す。PinStage の hold（下へ行かせない見張り）へ渡す用 */
export function useReportProgress(
  p: MotionValue<number>,
  ref: React.RefObject<number>
) {
  useAnimationFrame(() => {
    ref.current = p.get();
  });
}

/** 「一定の速さ」で追いかける進み具合を返す。
    【2026-09-17 ヒデさん指示】
      「スクロールの強さによってスピードを変えるのではなく、一定の速度に。
        どんだけ強くスクロールしても、どうしても一定の速度で流れる」
    → スクロールは【行き先】を決めるだけ。実際の位置は毎フレーム
      「決められた速さ × 経った時間」ぶんしか進まない。
      速く長くスクロールしても、流れる速さは変わらない。
    速さは CSS 変数 --ev-peel-speed（1秒あたり全体の何割進むか）で変えられる。 */
export function useConstantSpeed(
  src: MotionValue<number>,
  fallbackSpeed = 0.22
) {
  const out = useMotionValue(0);
  useAnimationFrame((_t, deltaMs) => {
    /* 長時間バックグラウンドだった後の巨大な delta は切る */
    const dt = Math.min(0.05, Math.max(0.001, deltaMs / 1000));
    const raw = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--ev-peel-speed")
    );
    const speed = Number.isFinite(raw) && raw > 0 ? raw : fallbackSpeed;
    const target = src.get();
    const cur = out.get();
    const d = target - cur;
    if (d === 0) return;
    const step = speed * dt;
    out.set(Math.abs(d) <= step ? target : cur + Math.sign(d) * step);
  });
  return out;
}

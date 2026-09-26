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
  out,
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
  /** いま抜けている（右へ流れていった）カードの枚数。0 より大きい間は、
      場面の上端より上へ行かせない（下から戻ってきた時に、1枚ずつ重ね直すため） */
  out?: React.RefObject<number>;
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

  /* 上向きの関所の保険：戻しの操作が効かないまま押し当て続けた時の逃げ道 */
  const upSince = useRef(0);
  const lastOut = useRef(-1);

  useAnimationFrame(() => {
    if (!hold) return;
    const w = window as unknown as {
      __abashiriScrollGate?: number;
      __abashiriScrollGateTop?: number;
      __abashiriGateBypassUntil?: number;
    };
    const closeTop = () => {
      if (w.__abashiriScrollGateTop !== undefined) delete w.__abashiriScrollGateTop;
    };
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

    /* ナビのジャンプ中は関所を張らない */
    if ((w.__abashiriGateBypassUntil || 0) > performance.now()) {
      openGate();
      closeTop();
      return;
    }

    /* ── 上向きの関所（2026-09-26）──
       カードがまだ抜けている間は、場面の上端（y）より上へ行かせない。
       下から戻ってくる時は3画面手前から張っておく（勢いで通り過ぎないように）。
       最後の1枚を戻した瞬間（抜けている枚数が 0）にあける。
       保険：押し当てたまま戻しが進まない状態が GATE_MAX_MS 続いたら通す */
    const outN = out ? out.current : 0;
    if (out && outN > 0 && now >= y - 2 && now <= limit + sc.clientHeight * 3) {
      if (outN !== lastOut.current) { lastOut.current = outN; upSince.current = 0; }
      const pressing = now <= y + 2;
      if (pressing && !upSince.current) upSince.current = performance.now();
      if (!pressing) upSince.current = 0;
      if (upSince.current && performance.now() - upSince.current > GATE_MAX_MS) closeTop();
      else w.__abashiriScrollGateTop = y;
    } else {
      lastOut.current = outN;
      upSince.current = 0;
      closeTop();
    }

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

/** ひと続きの操作とみなす間隔(ms)。これより空いたら「次の1回」
    ⚠️ トップのグルメで止める関所（TopPage）も同じ基準を使う。変える時は両方に効く */
export const GESTURE_GAP = 160;
/** 慣性の途中で指をもう一度動かした（＝量が急に増えた）とみなす倍率と、最短の間隔(ms) */
export const SPIKE_RATIO = 1.6;
export const SPIKE_MIN_MS = 300;
/** カードが「抜けた」とみなす進み具合（すべる距離のこの割合まで来たら関所をあける）。
    止まりきるまで待つと、見終わったのに下へ進めない時間ができる（実測 約2秒） */
const LAUNCHED_AT = 0.35;

/** 流れ方の3案（物理で作る）。何が違うかは note に書いてある（パネルにもそのまま出る）
    【2026-09-26 ヒデさん指示（2回目）】
      「今のバリエーションは多分速度だけで変えている。そうじゃなくて、右にやったら
        右に行きながら、ちょっと右に回転していく、徐々に右に回転するとか、
        カードを右にやった時の自然な挙動のバリエーションを。今のは削除」
      「慣性の法則を活かす。全体的にもうちょっとゆったり流れる感じで」
      「床に置いたカードを右にやると、最初は速くてゆっくり。物理の法則で自然な動きに」
      （同日追加）「反応が遅くなりすぎた。スクロールしたらすぐ反応、横はゆったりめ」
                  「ゆったりでもノロノロではない。スクロール1〜2秒以内に画面の外へ」
      → すべる時間を 2.0〜2.4 → 1.4〜1.6 秒に。反応まわりは useStepCards を参照
    → 前の3案（ふわっと減速／しなり／風に流される）は削除。
      3案とも「最初がいちばん速く、摩擦でだんだん遅くなって止まる」「進みながら少しずつ
      右（時計回り）に回る」は共通。ちがいは【摩擦のかかり方】と【どこを押したか】。
    しくみ：t は「押してからの経過時間」（0→1 を duration 秒で等速に進める）。
      位置・回転・ずれは、その時間の関数として物理の式で出す */
export type EvFlow = {
  name: string;
  note: string;
  /** 押してから止まるまでの秒数 */
  duration: number;
  /** 経過時間 τ(0〜1) → 進んだ割合(0〜1)。最初が速く、だんだん遅くなる */
  pos: (τ: number) => number;
  /** 経過時間 τ → 回転の進み(0〜1)。これに spin を掛ける */
  rot: (τ: number) => number;
  /** 止まるまでに右へ回る量(度) */
  spin: number;
  /** 回りながら下へそれる量(px)。0＝まっすぐ横へ */
  drift: number;
  /** 経過時間のどこから消え始めるか（0〜1） */
  fadeAt: number;
  /** 下にあったカードが少しつられて動くか */
  settle: boolean;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/* 動摩擦（摩擦が一定）：速さが時間とともにまっすぐ落ちる → 位置は 1-(1-τ)² */
const friction = (τ: number) => 1 - Math.pow(1 - clamp01(τ), 2);
/* 空気のような抵抗（速さに比例して減速）：出だしが最も速く、長い惰性の尾を引く */
const DRAG_K = 4.2;
const drag = (τ: number) => (1 - Math.exp(-DRAG_K * clamp01(τ))) / (1 - Math.exp(-DRAG_K));

export const EV_FLOWS: Record<number, EvFlow> = {
  1: {
    name: "案1 床をすべる",
    note: "【摩擦が一定】床に置いたカードを右へ押し出した動き。はじめがいちばん速く、摩擦で一定のペースで遅くなって止まる。進んだぶんだけ少しずつ右に回る（約1.4秒で画面の外へ）",
    duration: 1.4,
    pos: friction,
    rot: friction,
    spin: 12,
    drift: 0,
    fadeAt: 0.55,
    settle: false,
  },
  2: {
    name: "案2 惰性で長くすべる",
    note: "【慣性が長く残る】つるっと軽く押した動き。出だしが速く、そのあと惰性で長くすべって、ふっと止まる。回転は押された瞬間より少し遅れてついてきて、止まる直前まで回り続ける（約1.6秒で画面の外へ）",
    duration: 1.6,
    pos: drag,
    rot: (τ) => Math.pow(drag(clamp01((τ - 0.08) / 0.92)), 1.25),
    spin: 15,
    drift: 0,
    fadeAt: 0.5,
    settle: false,
  },
  3: {
    name: "案3 角を押されて回る",
    note: "【押した場所が左下の角】重心からずれた所を押したので、すべりながら大きめに右へ回り、回ったぶん少し下へそれていく。下のカードもつられて少しだけ動いて戻る（約1.5秒で画面の外へ）",
    duration: 1.5,
    pos: (τ) => 1 - Math.pow(1 - clamp01(τ), 2.3),
    rot: (τ) => 1 - Math.pow(1 - clamp01(τ), 1.6),
    spin: 22,
    drift: 26,
    fadeAt: 0.55,
    settle: true,
  },
};

/** 戻る時（上へスクロール）も「はじめ速く・だんだん遅く」に見せるための逆算。
    t（時間）を 1→0 へ戻すと、そのままでは“はじめ遅く・最後に速い”になるので、
    位置が「1 - pos(u)」で減っていくように、時間の進め方を逆算して作る */
function returnEase(pos: (τ: number) => number) {
  const inv = (y: number) => {
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 28; k++) {
      const mid = (lo + hi) / 2;
      if (pos(mid) < y) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  return (u: number) => 1 - inv(1 - pos(u));
}

/** いま選ばれている流れ方（CSS 変数 --ev-flow。調整パネルが書く） */
/** 流れ方の既定（2026-09-26 ヒデさん「3番目でデフォルトに」）。
    ⚠️ 値の住み家は4つ：ここ／globals.css の --ev-flow／TopTunePanel の既定／tune-defaults.json */
const EV_FLOW_DEFAULT = 3;
export function useEvFlow(): EvFlow {
  const [n, setN] = useState(EV_FLOW_DEFAULT);
  useAnimationFrame(() => {
    const v = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--ev-flow"),
      10
    );
    const k = EV_FLOWS[v] ? v : EV_FLOW_DEFAULT;
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
  hold: React.RefObject<number>,
  /** いま抜けている枚数（PinStage の上向きの関所に渡す） */
  out?: React.RefObject<number>
) {
  const flow = useEvFlow();
  const steps = ITEMS.length - 1; /* 抜ける枚数（台紙の1枚は残す） */
  /* 各カードの進み（0→1）と、束の“しなり”用の値 */
  const ts = useMemo(() => ITEMS.map(() => motionValue(0)), []);
  const nudges = useMemo(() => ITEMS.map(() => motionValue(0)), []);
  const step = useRef(0);
  /* 操作の通し番号と、端（全部抜けた／全部重なった）に着いた操作の番号。
     端に着いた操作の“勢い”では先へ進ませず、【次の1回】ですぐ抜けられるようにする
     （そうしないと、最後の1枚が動く瞬間をスクロールで通り過ぎてしまう。2026-09-26 実測） */
  const gid = useRef(0);
  const endGid = useRef(-1);
  const flowRef = useRef(flow);
  flowRef.current = flow;

  /* 段を動かす。i 番目のカードは「上から何枚目か」で出番が決まる */
  const goTo = (next: number) => {
    const n = Math.max(0, Math.min(steps, next));
    if (n === step.current) return;
    const prev = step.current;
    step.current = n;
    if (n === steps || n === 0) endGid.current = gid.current;
    const f = flowRef.current;
    ITEMS.forEach((_, i) => {
      if (i === 0) return; /* 台紙は動かさない */
      const order = ITEMS.length - 1 - i; /* 0 が最初に抜ける */
      const to = n > order ? 1 : 0;
      if (ts[i].get() === to) return;
      /* t＝押してからの経過時間。等速で進め、形（速い→遅い）は pos/rot の式で出す */
      animate(ts[i], to, {
        duration: f.duration,
        ease: to === 1 ? "linear" : returnEase(f.pos),
      });
    });
    /* 案2：1枚抜けたら、次にいちばん上になったカードがしなって落ち着く */
    if (f.settle && n > prev) {
      const top = ITEMS.length - 1 - n; /* 次にいちばん上のカード */
      if (top >= 0) {
        /* 上のカードに引きずられて少し右へ動き、摩擦で戻って落ち着く */
        animate(nudges[top], [0, 1, 0.25, 0], {
          duration: 1.4,
          times: [0, 0.22, 0.6, 1],
          ease: "easeOut",
        });
      }
    }
  };

  /* 操作の受付：ホイール・キー・スワイプ。貼りついている間だけ数える */
  useEffect(() => {
    /* 【同日 ヒデさん指摘】「反応が遅い。スクロールしたらすぐ反応してほしい」
       旧：ひと続きの操作の【最初の1回】だけ数えていた。すると
         ・セクションに入ってきたスクロールは、入る前に始まっているので数えない
           → 着いても何も起きず、もう1回スクロールが要った
         ・トラックパッドは1回のスワイプで約1秒「慣性」の信号が続く。その途中の
           2回目のスワイプも「同じ1回」とみなして無視していた
       新：1つの操作につき1枚は変えずに、
         ・その操作でまだ1枚も動かしていなければ、貼りついた瞬間に1枚動かす
         ・慣性の途中で量が急に増えたら（＝指でもう一度払った）、新しい1回とみなす */
    let last = 0;
    let prevAbs = 0;
    let lastTrig = 0;
    let usedThisGesture = false;
    const onWheel = (e: WheelEvent) => {
      const a = Math.abs(e.deltaY);
      if (a < 2 || a < Math.abs(e.deltaX)) return;
      const now = performance.now();
      const fresh = now - last > GESTURE_GAP;
      const spike = !fresh && a > prevAbs * SPIKE_RATIO + 6 && now - lastTrig > SPIKE_MIN_MS;
      if (fresh || spike) {
        usedThisGesture = false;
        gid.current++;
      }
      last = now;
      prevAbs = a;
      if (!pinned.current || usedThisGesture) return;
      usedThisGesture = true;
      lastTrig = now;
      goTo(step.current + (e.deltaY > 0 ? 1 : -1));
    };
    const onKey = (e: KeyboardEvent) => {
      gid.current++;
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
      gid.current++;
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
    /* 各カードが「抜けた」とみなせるか（すべる距離の LAUNCHED_AT まで来たか）の平均。
       最後の1枚がすべり出して少し進んだら 1 になり、すぐ下へ進める */
    /* 端に着いた操作が終わって、次の操作が始まったか */
    const passed = gid.current > endGid.current;
    /* 上向きの関所：全部重なっても、重ねきった操作の勢いのうちは 1 のまま（＝止めておく） */
    if (out) out.current = step.current > 0 ? step.current : passed ? 0 : 1;
    const f = flowRef.current;
    let sum = 0;
    for (let i = 1; i < ITEMS.length; i++) sum += Math.min(1, f.pos(ts[i].get()) / LAUNCHED_AT);
    const h = steps > 0 ? sum / steps : 1;
    /* 下向きの関所も同じ：全部抜けた操作の勢いでは抜けさせない（次の1回ですぐ抜ける） */
    hold.current = step.current === steps && !passed ? Math.min(h, 0.9) : h;
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

/* 2026-09-26：useReportProgress / useConstantSpeed（スクロール量を一定速で追う方式）は、
   「1回スクロール＝1枚」（useStepCards）に置き換えて使わなくなったので削除した */

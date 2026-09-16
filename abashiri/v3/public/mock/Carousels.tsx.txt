"use client";

/* eslint-disable @next/next/no-img-element */
/* ═══════════════════════════════════════════════════════════════════
 * 網走V3 体験セクション｜案12「奥行きの3Dカルーセル」／案13「湾曲するカルーセル」
 *
 * 2026-09-17 大改修。参考画像2枚と監査記録に沿って、立体の構造から作り直した。
 *   参考1 reference-01-ring.png    … 剛体カードが閉じた回転体に並ぶ
 *   参考2 reference-02-curved.png  … 斜めに見た円筒。面そのものが湾曲
 *
 * ── 幾何の約束（両案で同じ式を使う）──────────────────
 *   中央のカードを theta = 0 とし、手前を +Z とした【閉じた円環】
 *       x = R * sin(theta)
 *       z = R * (cos(theta) - 1)     ← 中央が z=0、奥へ行くほど負
 *       向き = rotateY(theta)         ← 左(theta<0)は負、右は正
 *   これで「左右カードの、中央に近い縦辺が手前に出る」（参考1と一致）。
 *   ⚠️ 改修前は左が +39.6deg で参考と逆だった。
 *
 * ── 参考1の構造をどう作るか ────────────────────────
 *   参考1は 正面の大きな1枚／左右の強く斜めのカード／中央の背後から覗く翼、の3層。
 *   8スロットの円環（45度刻み）だと：
 *       0°    正面（原寸・不透明）
 *       ±45°  左右で強く傾く
 *       ±90°  真横。ほぼ線になる
 *       ±135° 裏を向いて奥にいる → 前面カードの脇から【翼】として覗く
 *       180°  真後ろ。前面カードに隠れる
 *   参考1の翼（幅80px前後）は ±135° のカードの裏面。R と perspective を合わせると
 *   実測でほぼ同じ幅になる（下の検証コメント参照）。
 *
 * 必要なもの
 *   ・React 18+ / Next.js（"use client"）
 *   ・案13 のみ three（npm i three、型は npm i -D @types/three）
 *     ※ three は案13を表示する時だけ動的 import される
 *
 * 使い方
 *   import { Carousel3D, CarouselBend } from "./Carousels";
 *   <Carousel3D />   // 案12
 *   <CarouselBend /> // 案13
 *
 * 操作
 *   PC : 横ドラッグ／横ホイール／← → キー　スマホ : 横スワイプ（縦スクロールは通す）
 *   案12 は慣性を見込んだ位置へスナップ、案13 は自由に減速して止まる
 *
 * ⚠️ 実装メモ（踏んだ罠）
 *   ・preserve-3d の親に opacity / filter / overflow を掛けると立体が潰れる。
 *     配置の親（3D）と、見た目の子（切り抜き・影・暗さ）は必ず分ける。
 *   ・preserve-3d の中では z-index ではなく実際の3D位置で前後が決まる。
 *     負の z-index ＋ 半透明で奥行きを作らない。
 *   ・Three.js の ShaderMaterial は色空間の変換を通らない。
 *     読み書きとも LinearSRGBColorSpace にそろえないと色がどぎつく出る。
 *   ・THREE.NoColorSpace を outputColorSpace に入れると例外→握り潰されて
 *     フォールバック表示になる（原因が見えないので注意）。
 *   ・3D の箱に overflow:hidden を掛けると奥行きが潰れる。切るなら外側の枠で。
 * ═══════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ── 表示する中身 ─────────────────────────────
   既定はこのファイルの中の4件。呼び出す側から items を渡せば差し替えられる
   （本番の体験セクションは eventParts.tsx の ITEMS を渡している）*/
export type CarouselItem = { no: string; tag: string; title: string; img: string; href: string };
type Item = CarouselItem;
const DEFAULT_ITEMS: Item[] = [
  { no: "01", tag: "体験", title: "博物館 網走監獄", img: "/img/spot/kangoku-1.jpg", href: "/spot/kangoku" },
  { no: "02", tag: "体験", title: "オホーツク流氷館", img: "/img/spot/ryuhyokan-1.jpg", href: "/spot/ryuhyokan" },
  { no: "03", tag: "体験", title: "カヌー体験", img: "/img/spot/canoe-1.jpg", href: "/spot/canoe" },
  { no: "04", tag: "体験", title: "オジロワシ・オオワシウォッチング", img: "/img/spot/washi-1.jpg", href: "/spot/washi" },
];

/* ═══════════════════════════════════════════════════
   調整はここだけ見ればよい。
   寸法は「入れ物の幅から計算」するので、基準値と比率で持つ
   ═══════════════════════════════════════════════════ */
const CONFIG = {
  css3d: {
    /** 円環のスロット数。データ4件を2周ぶん並べて閉じた輪にする */
    slots: 8,
    /** 基準の入れ物幅。これを1.0として他の寸法を比例させる */
    baseW: 1512,
    /** 基準幅での寸法 */
    cardW: 420,
    cardH: 610,
    /* 半径と遠近はカード幅から導く。参考1の比率に合わせて逆算した値：
         R = 1.8W / perspective = 2.3W のとき（8スロット・45度刻み）
           ±45°  … 中央カードの縁から 0.26W（約111px）空いて左右に立つ
           ±135° … 中央カードの縁から 0.245W（約103px）はみ出す【翼】になる
           180°  … 幅 0.42W まで縮んで中央カードの後ろに完全に隠れる
       参考1の実測（中央幅445・左右の間隔135・翼の幅75〜80）とほぼ同じ比率 */
    radiusPerCardW: 1.8,
    perspectivePerCardW: 2.3,
    stageH: 760,
    /** 狭い画面での下限・上限（入れ物幅に対する割合） */
    /* 狭い画面での中央カードの幅（入れ物幅に対する割合）。
       ⚠️ 0.62 だと幅390pxで ±45°の隣が画面外に出た（実測）。
          0.44 なら隣が 47px ほど覗いて「横に動かせる」と分かる（実測） */
    cardWMin: 0.44,
    cardWMax: 0.3, // 広い画面で大きくなりすぎないように（幅の30%）
    /** 何pxドラッグしたら1枚ぶん進むか（入れ物幅に対する割合） */
    dragPerCardRatio: 0.24, // 1512px なら約363px／1枚
    wheelPerCard: 320,
    /** 追従の速さ（1秒あたりの寄り具合）。dt で正規化する */
    stiffness: 9,
    /** リリース後、慣性をどれだけ先読みしてスナップ先を決めるか（秒） */
    flickLookahead: 0.22,
    /** 奥のカードをどれだけ沈ませるか（0=沈ませない） */
    farDim: 0.42,
  },
  webgl: {
    slots: 8,
    baseW: 1512,
    cardW: 430,
    cardH: 300, // 参考2は横長。写真の比率に近い形にする
    radius: 560, // 円環の半径。カードの湾曲半径もこれに合わせる
    fov: 38,
    /** 円筒の姿勢。参考2は斜めから見た円筒 */
    tiltX: -26, // 手前へ倒す（度）。参考2は上から見下ろす角度
    tiltZ: 8, // 少しロールさせる（度）
    /** 面の曲がり具合。1 = 円環と同じ半径でぴったり円筒になる */
    bendStrength: 1,
    /** 速さに応じて増やす曲がり（小さく抑える） */
    bendBoost: 0.12,
    segments: 48,
    stageH: 560,
    dragPerCardRatio: 0.24,
    wheelPerCard: 320,
    stiffness: 7,
    /** 手を離したあとの減速（1秒あたり何分の1になるか） */
    decayPerSec: 0.06,
    dprMax: 2,
  },
};

/* ── 小道具 ─────────────────────────────── */
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** dt（秒）に依らず同じ手触りになる寄せ方。60Hzでも120Hzでも同じ速さ */
const damp = (cur: number, to: number, stiffness: number, dt: number) =>
  to + (cur - to) * Math.exp(-stiffness * dt);

function usePrefersReducedMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setOn(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return on;
}

/** 入れ物の幅・高さを見張る（React の state 更新は「変わった時だけ」） */
function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((p) => (Math.abs(p.w - w) > 0.5 || Math.abs(p.h - h) > 0.5 ? { w, h } : p));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** 画面に入っている間だけ true（画面外では描画を止める） */
function useOnScreen(ref: React.RefObject<HTMLElement | null>) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => setOn(es.some((e) => e.isIntersecting)),
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return on;
}

/* ═══════════════════════════════════════════════════
   ドラッグ／スワイプ／ホイール／キーボードの入力
   ・「ドラッグ中」「リリース後」「停止」を分ける
   ・速度は【差分 ÷ 時間】を短い履歴でならす
   ・押したまま止めて離したら勢いを残さない
   ・移動距離でクリックとドラッグを区別する
   ═══════════════════════════════════════════════════ */
type InputApi = {
  /** 何枚ぶん進んだか（小数。連続した値） */
  target: React.RefObject<number>;
  /** 1秒あたり何枚ぶん動いているか */
  velocity: React.RefObject<number>;
  dragging: React.RefObject<boolean>;
  /** 直前がドラッグだったか（クリック抑止に使う） */
  wasDrag: React.RefObject<boolean>;
};

function useCarouselInput({
  el,
  pxPerCard,
  wheelPerCard,
  onRelease,
  onWheelEnd,
}: {
  el: React.RefObject<HTMLElement | null>;
  pxPerCard: number;
  wheelPerCard: number;
  /** 指を離した時。慣性を使うかは呼び出し側が決める */
  onRelease?: (velocity: number) => void;
  onWheelEnd?: () => void;
}): InputApi {
  const target = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const wasDrag = useRef(false);
  /* 速度をならすための短い履歴（時刻とスクリーンX） */
  const hist = useRef<{ t: number; x: number }[]>([]);
  const movedPx = useRef(0);
  const pxRef = useRef(pxPerCard);
  pxRef.current = Math.max(60, pxPerCard);
  const wheelPx = useRef(wheelPerCard);
  wheelPx.current = Math.max(60, wheelPerCard);
  const relRef = useRef(onRelease);
  relRef.current = onRelease;
  const wEndRef = useRef(onWheelEnd);
  wEndRef.current = onWheelEnd;

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let wheelTimer = 0;
    let activeId: number | null = null;
    let captured = false;

    const pushHist = (x: number) => {
      const t = performance.now();
      const h = hist.current;
      h.push({ t, x });
      /* 直近120msだけ残す。押したまま止めて離した時に勢いが残らない */
      while (h.length > 2 && t - h[0].t > 120) h.shift();
    };
    /** 履歴から「1秒あたり何枚ぶん」を出す */
    const calcVelocity = () => {
      const h = hist.current;
      if (h.length < 2) return 0;
      const a = h[0];
      const b = h[h.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt < 0.008) return 0;
      /* 最後の動きから 80ms 以上空いていたら、止まってから離したとみなす */
      if (performance.now() - b.t > 80) return 0;
      return -(b.x - a.x) / pxRef.current / dt;
    };

    const down = (e: PointerEvent) => {
      if (activeId !== null) return;
      activeId = e.pointerId;
      dragging.current = true;
      wasDrag.current = false;
      movedPx.current = 0;
      velocity.current = 0; /* 押したら慣性を止める */
      hist.current = [];
      captured = false;
      pushHist(e.clientX);
      /* ⚠️ ここで setPointerCapture してはいけない。捕捉すると click の対象が
         捕捉した要素になり、カード内のリンクが【押しても反応しなくなる】
         （2026-09-17 実測）。実際に動き出してから捕捉する */
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current || e.pointerId !== activeId) return;
      const h = hist.current;
      const last = h[h.length - 1];
      const dx = e.clientX - (last ? last.x : e.clientX);
      movedPx.current += Math.abs(dx);
      if (movedPx.current > 6 && !wasDrag.current) {
        wasDrag.current = true;
        /* 動き出したと分かってから捕捉する。枠の外へ出ても追従できる */
        try {
          node.setPointerCapture(e.pointerId);
          captured = true;
        } catch {}
      }
      target.current += -dx / pxRef.current;
      pushHist(e.clientX);
    };
    const finish = (e: PointerEvent, canceled: boolean) => {
      if (e.pointerId !== activeId) return;
      activeId = null;
      if (!dragging.current) return;
      dragging.current = false;
      /* pointercancel は「操作が横取りされた」合図。勢いは渡さない */
      const v = canceled ? 0 : calcVelocity();
      velocity.current = v;
      relRef.current?.(v);
      hist.current = [];
      if (captured) {
        try {
          node.releasePointerCapture(e.pointerId);
        } catch {}
        captured = false;
      }
      /* クリック抑止のフラグは次のクリックまで残す */
      if (wasDrag.current) window.setTimeout(() => (wasDrag.current = false), 0);
    };

    const wheel = (e: WheelEvent) => {
      /* 縦の動きの方が大きい時はページのスクロールに渡す */
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      velocity.current = 0;
      target.current += e.deltaX / wheelPx.current;
      window.clearTimeout(wheelTimer);
      /* ホイールが止まったらスナップさせる（途中の角度で止まりっぱなしにしない） */
      wheelTimer = window.setTimeout(() => wEndRef.current?.(), 140);
    };

    const key = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      velocity.current = 0;
      target.current = Math.round(target.current) + (e.key === "ArrowRight" ? 1 : -1);
    };
    /* ドラッグのあとのクリックでリンクへ飛ばない */
    const click = (e: MouseEvent) => {
      if (wasDrag.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    /* ⚠️ これが無いと、カードのリンク（<a>）を掴んだ瞬間にブラウザの
       ネイティブなドラッグ＆ドロップが始まり、pointercancel が飛んで
       【2回動かしただけで操作が切れる】（2026-09-17 実測：move が2回で cancel 1回）。
       画像の draggable=false だけでは足りない。リンク自体も止める */
    const dragStart = (e: Event) => e.preventDefault();
    node.addEventListener("dragstart", dragStart);
    node.addEventListener("pointerdown", down);
    node.addEventListener("pointermove", move);
    const onUp = (e: PointerEvent) => finish(e, false);
    const onCancel = (e: PointerEvent) => finish(e, true);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onCancel);
    node.addEventListener("lostpointercapture", onCancel as EventListener);
    node.addEventListener("wheel", wheel, { passive: false });
    node.addEventListener("keydown", key);
    node.addEventListener("click", click, true);
    return () => {
      window.clearTimeout(wheelTimer);
      node.removeEventListener("dragstart", dragStart);
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", onUp);
      node.removeEventListener("pointercancel", onCancel);
      node.removeEventListener("lostpointercapture", onCancel as EventListener);
      node.removeEventListener("wheel", wheel);
      node.removeEventListener("keydown", key);
      node.removeEventListener("click", click, true);
    };
  }, [el]);

  return { target, velocity, dragging, wasDrag };
}

/** カードに乗せる情報（既存のグルメカードと同じ言葉遣い） */
function CardInfo({ it }: { it: Item }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-black/0 via-black/0 to-black/75 px-6 py-6 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100">
      <div className="flex translate-y-[14px] flex-col gap-2 opacity-0 transition-all delay-75 duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
        <p className="text-[13px] font-extralight leading-[1.2] text-white/80">
          {it.tag} {it.no}
        </p>
        <p className="text-[24px] font-thin leading-[1.3] text-white">{it.title}</p>
        <span className="mt-1 flex items-center gap-1 text-[13px] font-extralight leading-[1.2] text-white">
          もっと見る
          <img src="/img/icon-view-more.svg" alt="" className="size-[15px]" />
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   案12 奥行きの3Dカルーセル（CSS 3D Transform）

   ・閉じた円環。x=R sinθ / z=R(cosθ−1) / rotateY=θ を一貫して使う
   ・回転角は【常に連続】。modulo は「何番目のデータを出すか」だけに使う
   ・前面カードは不透明・原寸。奥行きは Z と perspective で作る
   ・カードは表と裏を持つ（裏面の写真が鏡像になるのを防ぐ）
   ・preserve-3d の中なので z-index は使わない（実際の3D位置で前後が決まる）
   ═══════════════════════════════════════════════════ */
export function Carousel3D({ items }: { items?: Item[] } = {}) {
  const C = CONFIG.css3d;
  const ITEMS = items && items.length ? items : DEFAULT_ITEMS;
  const host = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const dims = useRef<(HTMLDivElement | null)[]>([]);
  const size = useSize(host);
  const onScreen = useOnScreen(host);
  const reduce = usePrefersReducedMotion();
  const pos = useRef(0);

  /* 入れ物の幅から寸法を作る。PCの値を固定して左右を隠すだけにしない */
  const M = useMemo(() => {
    const w = size.w || C.baseW;
    const k = w / C.baseW;
    /* 狭い画面では「幅の62%」を下限にして、左右の隣が必ず少し見えるようにする */
    const cardW = clamp(C.cardW * k, Math.min(w * C.cardWMin, 320), w * C.cardWMax + 260);
    const cardH = cardW * (C.cardH / C.cardW);
    const radius = cardW * C.radiusPerCardW;
    const perspective = cardW * C.perspectivePerCardW;
    const stageH = Math.max(cardH * 1.18, 360);
    return { w, cardW, cardH, radius, perspective, stageH };
  }, [size.w, C]);

  const step = 360 / C.slots;
  const snap = useCallback(
    (v: number) => {
      const t = input.target;
      /* 慣性を見込んだ位置へスナップ（急停止させない） */
      const ahead = t.current + v * C.flickLookahead;
      t.current = Math.round(ahead);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [C.flickLookahead]
  );
  const input = useCarouselInput({
    el: host,
    pxPerCard: M.w * C.dragPerCardRatio,
    wheelPerCard: C.wheelPerCard,
    onRelease: (v) => snap(v),
    onWheelEnd: () => snap(0),
  });

  useEffect(() => {
    if (!onScreen) return;
    let raf = 0;
    let prev = performance.now();
    let idle = 0;
    const draw = (now: number) => {
      /* 長時間バックグラウンドだった後の巨大な dt を切る */
      const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
      prev = now;
      const to = input.target.current;
      pos.current = reduce ? to : damp(pos.current, to, C.stiffness, dt);
      const moving = Math.abs(to - pos.current) > 0.0004 || input.dragging.current;
      if (moving) idle = 0;
      else idle += dt;

      if (moving || idle < 0.25) {
        for (let i = 0; i < C.slots; i++) {
          const el = cards.current[i];
          if (!el) continue;
          /* 回転角は連続。折り返さない＝可視領域で瞬間移動しない */
          const theta = (i - pos.current) * step;
          const rad = (theta * Math.PI) / 180;
          const x = Math.sin(rad) * M.radius;
          const z = (Math.cos(rad) - 1) * M.radius;
          /* 置いてから、その場で向きを変える（順序を明示） */
          el.style.transform =
            `translate3d(${x.toFixed(2)}px, 0px, ${z.toFixed(2)}px) ` +
            `rotateY(${theta.toFixed(3)}deg)`;
          /* 奥の沈み。⚠️ 3Dの親ではなく、カードの【中】の面に掛ける */
          const dim = dims.current[i];
          if (dim) {
            const far = clamp(-z / (M.radius * 2), 0, 1);
            dim.style.opacity = (far * C.farDim).toFixed(3);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [C, M, step, onScreen, reduce, input]);

  return (
    <div className="flex w-full flex-col gap-10 bg-white">
      <h2 className="px-6 text-[length:var(--sec-head,36px)] font-thin leading-[1.8] text-black sm:px-[147px]">
        意外とオモロい、網走。
      </h2>
      <div
        ref={host}
        role="group"
        aria-label="体験のカルーセル。左右キーで移動できます"
        tabIndex={0}
        className="relative w-full cursor-grab select-none outline-none active:cursor-grabbing"
        style={{
          height: M.stageH,
          perspective: `${M.perspective}px`,
          /* 横スワイプは受け取りつつ、縦スクロールはページに通す */
          touchAction: "pan-y",
        }}
      >
        {/* 3D の土台。⚠️ ここに opacity / filter / overflow を掛けない */}
        <div
          className="absolute left-1/2 top-1/2 size-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {Array.from({ length: C.slots }, (_, i) => {
            const it = ITEMS[i % ITEMS.length];
            /* 同じデータが2周ぶん並ぶ。2周目は読み上げ・フォーカスから外す */
            const dup = i >= ITEMS.length;
            return (
              <div
                key={i}
                ref={(el) => {
                  cards.current[i] = el;
                }}
                className="absolute"
                style={{
                  width: M.cardW,
                  height: M.cardH,
                  marginLeft: -M.cardW / 2,
                  marginTop: -M.cardH / 2,
                  transformStyle: "preserve-3d",
                  willChange: "transform",
                }}
              >
                {/* 表 */}
                <a
                  href={it.href}
                  draggable={false}
                  aria-hidden={dup || undefined}
                  tabIndex={dup ? -1 : 0}
                  className="group absolute inset-0 block overflow-hidden bg-white shadow-[0_24px_60px_rgba(0,0,0,.22)]"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <img
                    src={it.img}
                    alt={it.title}
                    draggable={false}
                    className="size-full select-none object-cover"
                  />
                  <CardInfo it={it} />
                  {/* 奥ほど沈む面。3Dの親ではなくここに掛ける */}
                  <span
                    ref={(el) => {
                      dims.current[i] = el as unknown as HTMLDivElement;
                    }}
                    className="pointer-events-none absolute inset-0 bg-[#0b1f33]"
                    style={{ opacity: 0 }}
                  />
                </a>
                {/* 裏。既存の色だけを使い、新しい中身は作らない
                    （裏返った時に写真や文字が鏡像になるのを防ぐ） */}
                <div
                  aria-hidden
                  className="absolute inset-0 border border-black/10 bg-[#eef2f6]"
                  style={{
                    transform: "rotateY(180deg)",
                    backfaceVisibility: "hidden",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <p className="px-6 text-[13px] font-extralight leading-[1.4] text-black/40 sm:px-[147px]">
        ← 横にドラッグ／スワイプ、または ← → キーで回ります
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   案13 湾曲するカルーセル（Three.js / WebGL）

   ・tiltGroup（円筒の姿勢）→ spinGroup（円筒軸まわりの回転）→ カード、と分ける
   ・カードの位置と向きは案12と同じ式。rotation.y = +theta
     （改修前は -theta で、接線と符号が合っていなかった）
   ・面の湾曲は【弧の長さが変わらない】式に置き換える
       k = bendStrength / bendRadius
       x' = sin(k x)/k   z' = (cos(k x)-1)/k   y' = y
     k≈0 では元の平面に戻す（ゼロ除算よけ）
   ・写真は object-fit: cover 相当の UV 補正を掛ける（縦伸びを防ぐ）
   ═══════════════════════════════════════════════════ */
export function CarouselBend({ items }: { items?: Item[] } = {}) {
  const C = CONFIG.webgl;
  const ITEMS = items && items.length ? items : DEFAULT_ITEMS;
  const host = useRef<HTMLDivElement>(null);
  const size = useSize(host);
  const onScreen = useOnScreen(host);
  const reduce = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);

  const M = useMemo(() => {
    const w = size.w || C.baseW;
    const k = clamp(w / C.baseW, 0.42, 1.25);
    const cardW = C.cardW * k;
    const cardH = C.cardH * k;
    const radius = C.radius * k;
    const stageH = Math.max(C.stageH * k, 380);
    return { w, k, cardW, cardH, radius, stageH };
  }, [size.w, C]);

  const input = useCarouselInput({
    el: host,
    pxPerCard: M.w * C.dragPerCardRatio,
    wheelPerCard: C.wheelPerCard,
  });

  /* 生きている値を rAF から読むための入れ物（React の再描画を挟まない） */
  const live = useRef({ ...M, onScreen, reduce });
  live.current = { ...M, onScreen, reduce };

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let disposed = false;
    let cleanup = () => {};

    /* three は重いので、この案を出す時だけ読み込む */
    import("three")
      .then((THREE) => {
        if (disposed || !node) return;
        let renderer: import("three").WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        } catch {
          setFailed(true);
          return;
        }
        renderer.setPixelRatio(Math.min(C.dprMax, window.devicePixelRatio || 1));
        /* ⚠️ ShaderMaterial は three が自動で入れる色空間の変換を通らない。
           読み書きとも「変換なし」にそろえて <img> と同じ色で出す。
           定数名はバージョンで変わるので存在を確かめてから使う */
        if (THREE.LinearSRGBColorSpace) {
          renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        }
        node.appendChild(renderer.domElement);
        Object.assign(renderer.domElement.style, {
          width: "100%",
          height: "100%",
          display: "block",
        });

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(C.fov, 1, 1, 8000);

        /* 円筒の姿勢（傾き）と、円筒軸まわりの回転を別々に持つ */
        const tiltGroup = new THREE.Group();
        const spinGroup = new THREE.Group();
        tiltGroup.add(spinGroup);
        scene.add(tiltGroup);
        tiltGroup.rotation.x = (C.tiltX * Math.PI) / 180;
        tiltGroup.rotation.z = (C.tiltZ * Math.PI) / 180;
        /* ⚠️ カードは z = R(cosθ−1) に置くので、円環の【中心】は z = −R にある。
           そのまま傾けると原点（＝円環の手前の端）を軸に振り回されて、
           絵が右下へ逃げる（2026-09-17 実測）。
           spinGroup を +R ずらして、円環の中心を原点に合わせてから傾ける */

        /* 面を湾曲させるシェーダー。
           弧の長さを保つ式なので、曲率を変えても横に伸び縮みしない */
        const vert = `
          uniform float uK;          // 曲率 = bendStrength / bendRadius
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec3 pos = position;
            if (abs(uK) > 0.00001) {
              float s = sin(uK * pos.x) / uK;
              float c = (cos(uK * pos.x) - 1.0) / uK;
              pos.x = s;
              pos.z += c;
            }
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }`;
        /* UV は保持したうえで、cover 相当の拡大と中央寄せを掛ける */
        const frag = `
          uniform sampler2D uMap;
          uniform vec2 uScale;
          uniform vec2 uOffset;
          uniform float uDim;
          varying vec2 vUv;
          void main() {
            vec2 uv = vUv * uScale + uOffset;
            vec4 c = texture2D(uMap, uv);
            gl_FragColor = vec4(c.rgb * (1.0 - uDim), c.a);
          }`;

        const loader = new THREE.TextureLoader();
        const meshes: import("three").Mesh[] = [];
        const textures: import("three").Texture[] = [];
        type U = {
          uMap: { value: import("three").Texture };
          uK: { value: number };
          uScale: { value: import("three").Vector2 };
          uOffset: { value: import("three").Vector2 };
          uDim: { value: number };
        };
        const uniforms: U[] = [];

        /** 写真の縦横比とカードの縦横比から cover 相当の UV を出す */
        const applyCover = (u: U, iw: number, ih: number, cw: number, ch: number) => {
          if (!iw || !ih) return;
          const imgA = iw / ih;
          const cardA = cw / ch;
          if (imgA > cardA) {
            const s = cardA / imgA; // 横長すぎる → 左右を切る
            u.uScale.value.set(s, 1);
            u.uOffset.value.set((1 - s) / 2, 0);
          } else {
            const s = imgA / cardA; // 縦長すぎる → 上下を切る
            u.uScale.value.set(1, s);
            u.uOffset.value.set(0, (1 - s) / 2);
          }
        };

        for (let i = 0; i < C.slots; i++) {
          const it = ITEMS[i % ITEMS.length];
          const u: U = {
            uMap: { value: new THREE.Texture() },
            uK: { value: 0 },
            uScale: { value: new THREE.Vector2(1, 1) },
            uOffset: { value: new THREE.Vector2(0, 0) },
            uDim: { value: 0 },
          };
          const tex = loader.load(it.img, (t) => {
            const im = t.image as { width: number; height: number } | undefined;
            applyCover(u, im?.width ?? 0, im?.height ?? 0, live.current.cardW, live.current.cardH);
            render(); /* 画像が届いたら必ず描き直す */
          });
          if (THREE.LinearSRGBColorSpace) tex.colorSpace = THREE.LinearSRGBColorSpace;
          u.uMap.value = tex;
          textures.push(tex);
          const mat = new THREE.ShaderMaterial({
            uniforms: u as unknown as Record<string, { value: unknown }>,
            vertexShader: vert,
            fragmentShader: frag,
            /* 不透明な写真なので透過は切る。深度も普通に書く＝突き抜けない */
            transparent: false,
            depthTest: true,
            depthWrite: true,
            side: THREE.FrontSide,
          });
          const geo = new THREE.PlaneGeometry(1, 1, C.segments, 1);
          const m = new THREE.Mesh(geo, mat);
          spinGroup.add(m);
          meshes.push(m);
          uniforms.push(u);
        }

        /* ── 寸法・カメラ・配置の計算（リサイズのたびに呼ぶ）── */
        let cardW = M.cardW;
        let cardH = M.cardH;
        let radius = M.radius;
        const layout = () => {
          const L = live.current;
          cardW = L.cardW;
          cardH = L.cardH;
          radius = L.radius;
          meshes.forEach((m, i) => {
            m.scale.set(cardW, cardH, 1);
            /* 面の曲率は円環の半径に合わせる＝1本の円筒になる。
               ⚠️ Geometry は 1x1 なので、局所Xは scale 後に cardW 倍される。
                  シェーダーは scale 前の座標を見るので k も cardW ぶん掛ける */
            uniforms[i].uK.value = (C.bendStrength / radius) * cardW;
          });
          spinGroup.position.z = radius;
          const w = node.clientWidth || 1;
          const h = node.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          /* 収めたい大きさを縦と横で別々に出す。
             縦はカード1枚ぶん（傾けたぶんの余裕込み）、横は円環の直径＋カード幅。
             それぞれに必要な距離を出して遠い方を採る＝距離とFOVを二重に動かさない */
          const vFov = (C.fov * Math.PI) / 180;
          const needV = cardH * 2.1;
          const needH = radius * 2 + cardW;
          const distV = needV / 2 / Math.tan(vFov / 2);
          const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
          const distH = needH / 2 / Math.tan(hFov / 2);
          /* ⚠️ 円環の中心を原点に置いたので、手前のカードは z=+R にいる。
             距離に R を足さないとカメラが円環の中へ入ってしまう（実測で確認） */
          camera.position.set(0, 0, Math.max(distV, distH) + radius);
          /* ⚠️ tiltX で手前へ倒すと、【見えている側（手前の半分）】だけが持ち上がる。
             原点を見ると絵が画面の上半分に寄るので、持ち上がったぶんを見込んで
             少し上を見る＝絵が下りてきて画面の中央に収まる。
             持ち上がり量 = R * sin(-tiltX) */
          const lift = radius * Math.sin((-C.tiltX * Math.PI) / 180);
          camera.lookAt(0, lift * 0.62, 0);
          camera.updateProjectionMatrix();
          /* 画像が先に届いていた場合も、比率をやり直す */
          meshes.forEach((m, i) => {
            const im = textures[i].image as { width: number; height: number } | undefined;
            applyCover(uniforms[i], im?.width ?? 0, im?.height ?? 0, cardW, cardH);
          });
        };

        const step = (2 * Math.PI) / C.slots;
        let posV = 0;
        const place = () => {
          meshes.forEach((m, i) => {
            /* 角度は連続。折り返さないので画面内で瞬間移動しない */
            const theta = (i - posV) * step;
            m.position.set(Math.sin(theta) * radius, 0, (Math.cos(theta) - 1) * radius);
            /* 面の法線を円の外向きにそろえる（接線と符号を合わせる） */
            m.rotation.y = theta;
            /* 奥のカードだけ少し沈ませる */
            uniforms[i].uDim.value = clamp(-m.position.z / (radius * 2), 0, 1) * 0.5;
          });
        };

        let needsRender = true;
        const render = () => {
          needsRender = true;
        };

        const ro = new ResizeObserver(() => {
          layout();
          render();
        });
        ro.observe(node);
        layout();
        place();

        let raf = 0;
        let prev = performance.now();
        const tick = (now: number) => {
          const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
          prev = now;
          const L = live.current;

          if (L.onScreen && document.visibilityState !== "hidden") {
            /* ドラッグ中は慣性を足さない。離したあとだけ自由に減速する */
            if (!input.dragging.current && !L.reduce) {
              const v = input.velocity.current;
              if (Math.abs(v) > 0.0005) {
                input.target.current += v * dt;
                /* dt に基づく減速。60Hz でも 120Hz でも同じ止まり方 */
                input.velocity.current = v * Math.pow(C.decayPerSec, dt);
              } else if (v !== 0) {
                input.velocity.current = 0;
              }
            }
            const to = input.target.current;
            const next = L.reduce ? to : damp(posV, to, C.stiffness, dt);
            if (Math.abs(next - posV) > 0.00002) {
              posV = next;
              place();
              needsRender = true;
            }
            if (needsRender) {
              renderer.render(scene, camera);
              needsRender = false;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        const onVis = () => render();
        document.addEventListener("visibilitychange", onVis);

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          document.removeEventListener("visibilitychange", onVis);
          meshes.forEach((m) => {
            m.geometry.dispose();
            (m.material as import("three").ShaderMaterial).dispose();
          });
          textures.forEach((t) => t.dispose()); /* テクスチャも必ず解放する */
          renderer.dispose();
          renderer.domElement.remove();
        };
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex w-full flex-col gap-10 bg-white">
      <h2 className="px-6 text-[length:var(--sec-head,36px)] font-thin leading-[1.8] text-black sm:px-[147px]">
        意外とオモロい、網走。
      </h2>
      <div
        ref={host}
        role="group"
        aria-label="体験のカルーセル。左右キーで移動できます"
        tabIndex={0}
        className="relative w-full cursor-grab select-none outline-none active:cursor-grabbing"
        style={{ height: M.stageH, touchAction: "pan-y" }}
      >
        {failed && (
          /* WebGL が使えない・画像が読めない時のための素の並び。
             見ることも押すこともできる状態にしておく */
          <div className="flex size-full items-center gap-2 overflow-x-auto px-4">
            {ITEMS.map((it) => (
              <a
                key={it.href}
                href={it.href}
                className="group relative h-[70%] w-[46%] shrink-0 overflow-hidden sm:w-[24%]"
              >
                <img src={it.img} alt={it.title} className="size-full object-cover" />
                <CardInfo it={it} />
              </a>
            ))}
          </div>
        )}
      </div>
      <p className="px-6 text-[13px] font-extralight leading-[1.4] text-black/40 sm:px-[147px]">
        ← 横にドラッグ／スワイプ、または ← → キーで流れます
      </p>
    </div>
  );
}

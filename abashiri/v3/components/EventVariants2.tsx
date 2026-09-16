"use client";

/* eslint-disable @next/next/no-img-element */
/*
 * 体験セクション｜新しい10案（案11〜20）
 * 2026-09-16 ヒデさん依頼:
 *   「このセクションのデザインを改めて考えてほしい。ユーザーが見飽きないような
 *     ユニークなインタラクションや、写真を魅力的に見せるものをそれぞれ。10案」
 *
 * 10案それぞれの「ひと言でいうと」
 *   11 帯がひらく     細い帯から上下に開いて全景になる（マスク）
 *   12 すれちがう     上の段は右へ、下の段は左へ。二段が逆向きに流れる
 *   13 のぞき窓       枠は動かず、中の写真だけがゆっくり流れる
 *   14 一枚ずつ       中央の大きな1枚が、スクロールで順に入れ替わる
 *   15 横にのびる     細い縦帯が横へ広がって全景になる（11の横版）
 *   16 ずれた四列     4列がそれぞれ違う速さで上下に流れる
 *   17 さわると開く   並んだ4枚のうち、カーソルを乗せた1枚だけが広がる
 *   18 大きな番号     写真の上の巨大な 01〜04 が、写真と逆向きに流れる
 *   19 弧からそろう   弧に沿って散らばった4枚が、まっすぐ一列にそろう
 *   20 手で引ける     横に並んだフィルムを、ドラッグやホイールで引ける
 *
 * 全案の約束（EventSection.tsx から引き継ぎ）
 *   ・動かすのは transform / opacity / clip-path だけ。width・height は毎フレーム変えない
 *     （レイアウトし直しでガタつく。2026-09-15 に実際に起きた）
 *   ・useTransform の入力レンジは 0〜1 に収め、必ず増加順（負を渡すとページごと落ちる）
 *   ・p は「画面のちょうど真ん中で 1 になる進捗」。そこがいちばん良く見える状態
 *   ・トップは 1512×982 の固定キャンバスを縮小表示しているので、寸法は px で持つ
 *
 * 🟡仮置き：カンプは無い。寸法・速さはトップの既存値（余白147px・写真560px 等）を基準に決めた
 */
import { useEffect, useRef, useState } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import {
  Caption,
  CardLink,
  HTitle,
  ITEMS,
  VTitle,
  type EventItem,
} from "./eventParts";

export const EVENT_EXTRA_PATTERNS: Record<
  number,
  { name: string; note: string }
> = {
  11: { name: "案11 帯がひらく", note: "細い帯から上下に開いて全景になる。閉じた隙間から少しだけ見えている状態から始まるので、開ききった時の気持ちよさが出る" },
  12: { name: "案12 すれちがう", note: "上の段は右へ、下の段は左へ。二段が逆向きに流れてすれちがう。写真を大きく使える" },
  13: { name: "案13 のぞき窓", note: "枠は動かず、中の写真だけがゆっくり流れる。窓からのぞいているような見え方で、1枚の写真を広く見せられる" },
  14: { name: "案14 一枚ずつ", note: "中央の大きな1枚が、スクロールに合わせて順に入れ替わる。左に番号の一覧が出て、いま何枚目かが分かる" },
  15: { name: "案15 横にのびる", note: "細い縦帯が横へ広がって全景になる（案11の横版）。4枚が順にのびるので、目が左から右へ流れる" },
  16: { name: "案16 ずれた四列", note: "4列がそれぞれ違う速さで上下に流れる。縦に長い写真を大きく使えて、スクロールするたび並びが変わって見える" },
  17: { name: "案17 さわると開く", note: "並んだ4枚のうち、カーソルを乗せた1枚だけが横に広がる。触った時だけ動くので、スクロールは静かなまま" },
  18: { name: "案18 大きな番号", note: "写真の上に置いた巨大な 01〜04 が、写真と逆向きにゆっくり流れる。数字が主役の見た目になる" },
  19: { name: "案19 弧からそろう", note: "弧に沿って散らばっていた4枚が、まっすぐ一列にそろう。ばらけた状態から整っていく気持ちよさ" },
  20: { name: "案20 手で引ける", note: "横に並んだフィルムを、ドラッグやホイールで自分で引ける。見るだけでなく触れるので飽きにくい" },
};

/* 0〜1 に収めた区間。i 番目が少し遅れて始まり、終わりは4枚そろう */
const seg = (i: number, end = 0.62, stagger = 0.07) => {
  const from = Math.max(0, Math.min(end - 0.0001, i * stagger));
  return [from, end] as const;
};

/** 見出し＋中身＋説明の並びを揃えるための外枠 */
function Frame({
  children,
  captions = true,
  vertical = false,
  className = "",
}: {
  children: React.ReactNode;
  captions?: boolean;
  vertical?: boolean;
  className?: string;
}) {
  if (vertical) {
    return (
      <div className="flex w-full items-start gap-8 pl-6 sm:gap-[69px] sm:pl-[147px]">
        <VTitle className="mt-[40px]" />
        <div className={`flex min-w-0 flex-1 flex-col gap-10 ${className}`}>
          {children}
          {captions && <CaptionRow />}
        </div>
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col gap-12 sm:gap-[90px]">
      <HTitle className="px-6 sm:px-[147px]" />
      <div className={`flex w-full flex-col gap-10 ${className}`}>
        {children}
        {captions && <CaptionRow className="px-4 sm:px-[40px]" />}
      </div>
    </div>
  );
}

function CaptionRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-full gap-5 ${className}`}>
      {ITEMS.map((it) => (
        <Caption key={it.title} it={it} className="min-w-0 flex-1" />
      ))}
    </div>
  );
}

/* ═══════════ 案11 帯がひらく ═══════════
   細い帯（高さの12%だけ見えている）から、上下へ開いて全景になる。
   開くのは clip-path なので、写真そのものは動かない＝ガタつかない */
function BandOpen({ p }: { p: MotionValue<number> }) {
  return (
    <Frame>
      <div className="flex w-full gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <BandCard key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </Frame>
  );
}
function BandCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const [a, b] = seg(i);
  /* 44% → 0% ／ 44% → 0%（上下から閉じている帯が開く） */
  const clip = useTransform(p, [a, b], [44, 0]);
  const path = useTransform(clip, (v) => `inset(${v}% 0% ${v}% 0%)`);
  const s = useTransform(p, [a, b], [1.12, 1]);
  return (
    <div className="min-w-0 flex-1">
      <CardLink it={it} className="h-[560px] w-full">
        <motion.img
          src={it.img}
          alt={it.title}
          className="size-full object-cover"
          style={{ clipPath: path, scale: s }}
        />
      </CardLink>
    </div>
  );
}

/* ═══════════ 案12 すれちがう ═══════════
   上の段は右へ、下の段は左へ。逆向きに流れてすれちがう */
function CrossRows({ p }: { p: MotionValue<number> }) {
  const right = useTransform(p, [0, 1], [-180, 180]);
  const left = useTransform(p, [0, 1], [180, -180]);
  return (
    <Frame captions={false}>
      <div className="flex flex-col gap-[5px] overflow-hidden">
        <motion.div className="flex gap-[5px]" style={{ x: right }}>
          {ITEMS.slice(0, 2).map((it) => (
            <div key={it.title} className="flex w-[820px] shrink-0 flex-col gap-4">
              <CardLink it={it} className="h-[380px] w-full">
                <img src={it.img} alt={it.title} className="size-full object-cover" />
              </CardLink>
              <Caption it={it} />
            </div>
          ))}
        </motion.div>
        <motion.div className="flex justify-end gap-[5px]" style={{ x: left }}>
          {ITEMS.slice(2).map((it) => (
            <div key={it.title} className="flex w-[820px] shrink-0 flex-col gap-4">
              <CardLink it={it} className="h-[380px] w-full">
                <img src={it.img} alt={it.title} className="size-full object-cover" />
              </CardLink>
              <Caption it={it} />
            </div>
          ))}
        </motion.div>
      </div>
    </Frame>
  );
}

/* ═══════════ 案13 のぞき窓 ═══════════
   枠は動かず、中の写真だけが縦にゆっくり流れる。
   写真を枠より大きく置いて、はみ出したぶんを動かしている */
function Peephole({ p }: { p: MotionValue<number> }) {
  return (
    <Frame>
      <div className="flex w-full gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <PeepCard key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </Frame>
  );
}
function PeepCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  /* 1枚ごとに流れる向き・速さを変えると、並びが単調にならない */
  const amp = [-120, 90, -70, 130][i];
  const y = useTransform(p, [0, 1], [-amp, amp]);
  return (
    <div className="min-w-0 flex-1">
      <CardLink it={it} className="h-[560px] w-full">
        {/* 写真は枠より 260px 高くしておき、その差ぶんだけ中で動かす */}
        <motion.img
          src={it.img}
          alt={it.title}
          className="h-[820px] w-full object-cover"
          style={{ y, marginTop: -130 }}
        />
      </CardLink>
    </div>
  );
}

/* ═══════════ 案14 一枚ずつ ═══════════
   中央の大きな1枚が、スクロールに合わせて順に入れ替わる。
   左に番号の一覧を出して、いま何枚目かが分かるようにする */
function OneByOne({ p }: { p: MotionValue<number> }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const step = () => {
      const v = p.get();
      /* 0〜1 を4等分。最後の1枚は少し長めに見せたいので 0.92 で止める */
      const i = Math.min(ITEMS.length - 1, Math.floor((v / 0.92) * ITEMS.length));
      setCur(i < 0 ? 0 : i);
    };
    step();
    return p.on("change", step);
  }, [p]);

  return (
    <div className="flex w-full items-start gap-8 pl-6 sm:gap-[80px] sm:pl-[147px]">
      <div className="flex shrink-0 flex-col gap-10 pt-[30px]">
        <VTitle />
        <ul className="flex flex-col gap-4">
          {ITEMS.map((it, i) => (
            <li key={it.title} className="flex items-center gap-3">
              <motion.span
                className="block h-px bg-ink"
                animate={{ width: i === cur ? 40 : 12, opacity: i === cur ? 1 : 0.25 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.span
                className="font-num text-body-14 font-thin leading-none text-ink"
                animate={{ opacity: i === cur ? 1 : 0.3 }}
                transition={{ duration: 0.5 }}
              >
                {it.no}
              </motion.span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6 pr-6 sm:pr-[40px]">
        {/* 写真は重ねて置き、いま見せる1枚だけを不透明にする（場所は動かない） */}
        <div className="relative h-[620px] w-full">
          {ITEMS.map((it, i) => (
            <motion.div
              key={it.title}
              className="absolute inset-0"
              animate={{ opacity: i === cur ? 1 : 0, scale: i === cur ? 1 : 1.05 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ pointerEvents: i === cur ? "auto" : "none" }}
            >
              <CardLink it={it} className="size-full">
                <img src={it.img} alt={it.title} className="size-full object-cover" />
              </CardLink>
            </motion.div>
          ))}
        </div>
        <div className="relative h-[120px]">
          {ITEMS.map((it, i) => (
            <motion.div
              key={it.title}
              className="absolute inset-x-0 top-0"
              animate={{ opacity: i === cur ? 1 : 0, y: i === cur ? 0 : 10 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ pointerEvents: i === cur ? "auto" : "none" }}
            >
              <Caption it={it} size="lg" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ 案15 横にのびる ═══════════
   細い縦帯が横へ広がって全景になる（案11の横版）。
   左から順にのびるので、目が自然に左から右へ流れる */
function WideOpen({ p }: { p: MotionValue<number> }) {
  return (
    <Frame>
      <div className="flex w-full gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <WideCard key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </Frame>
  );
}
function WideCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const [a, b] = seg(i, 0.66, 0.1);
  const clip = useTransform(p, [a, b], [42, 0]);
  const path = useTransform(clip, (v) => `inset(0% ${v}% 0% ${v}%)`);
  const s = useTransform(p, [a, b], [1.1, 1]);
  return (
    <div className="min-w-0 flex-1">
      <CardLink it={it} className="h-[560px] w-full">
        <motion.img
          src={it.img}
          alt={it.title}
          className="size-full object-cover"
          style={{ clipPath: path, scale: s }}
        />
      </CardLink>
    </div>
  );
}

/* ═══════════ 案16 ずれた四列 ═══════════
   4列がそれぞれ違う速さで上下に流れる。
   縦に長い写真を大きく使えて、スクロールのたび並びが変わって見える */
function DriftColumns({ p }: { p: MotionValue<number> }) {
  return (
    <Frame captions={false}>
      <div className="flex w-full items-start gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <DriftCol key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </Frame>
  );
}
function DriftCol({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  /* 外側の列は大きく、内側は小さく動かすと「揺らぎ」に見える */
  const amp = [150, -90, 110, -140][i];
  const y = useTransform(p, [0, 1], [amp, -amp]);
  return (
    <motion.div className="flex min-w-0 flex-1 flex-col gap-5" style={{ y }}>
      <CardLink it={it} className="h-[660px] w-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
      <Caption it={it} />
    </motion.div>
  );
}

/* ═══════════ 案17 さわると開く ═══════════
   並んだ4枚のうち、カーソルを乗せた1枚だけが横に広がる。
   ⚠️ 幅そのものを変えるので、動かす対象はこの4枚だけに閉じている。
      親の高さは固定なので、上下のレイアウトは一切動かない */
function HoverOpen({ p }: { p: MotionValue<number> }) {
  const [over, setOver] = useState<number | null>(null);
  const o = useTransform(p, [0, 0.35], [0, 1]);
  return (
    <Frame captions={false}>
      <motion.div
        className="flex w-full gap-[5px] px-4 sm:px-[40px]"
        style={{ opacity: o }}
        onMouseLeave={() => setOver(null)}
      >
        {ITEMS.map((it, i) => (
          <div
            key={it.title}
            onMouseEnter={() => setOver(i)}
            className="flex min-w-0 flex-col gap-5 transition-[flex-grow] duration-700 ease-out"
            style={{ flexGrow: over === null ? 1 : over === i ? 2.2 : 0.75, flexBasis: 0 }}
          >
            <CardLink it={it} className="h-[600px] w-full">
              <img src={it.img} alt={it.title} className="size-full object-cover" />
            </CardLink>
            <div
              className="transition-opacity duration-500 ease-out"
              style={{ opacity: over === null || over === i ? 1 : 0.35 }}
            >
              <Caption it={it} />
            </div>
          </div>
        ))}
      </motion.div>
    </Frame>
  );
}

/* ═══════════ 案18 大きな番号 ═══════════
   写真の上に置いた巨大な 01〜04 が、写真と逆向きにゆっくり流れる。
   数字が主役に見えて、写真はその背後に広がる */
function BigNumbers({ p }: { p: MotionValue<number> }) {
  return (
    <Frame captions={false}>
      <div className="flex w-full flex-col gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <NumberRow key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </Frame>
  );
}
function NumberRow({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  const dir = i % 2 === 0 ? 1 : -1;
  const numX = useTransform(p, [0, 1], [140 * dir, -140 * dir]);
  const imgX = useTransform(p, [0, 1], [-60 * dir, 60 * dir]);
  return (
    <div className="relative h-[320px] w-full overflow-hidden">
      <CardLink it={it} className="absolute inset-0">
        <motion.img
          src={it.img}
          alt={it.title}
          className="size-full scale-[1.12] object-cover"
          style={{ x: imgX }}
        />
      </CardLink>
      {/* 数字は写真の上。押せると紛らわしいので当たり判定は外す */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 flex items-center font-num text-[200px] font-thin leading-none text-white/75 mix-blend-soft-light"
        style={{ x: numX, [i % 2 === 0 ? "left" : "right"]: 60 }}
      >
        {it.no}
      </motion.span>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-8 pb-6">
        <span className="text-body-18 font-thin leading-[1.4] text-white">
          {it.title}
        </span>
        <span className="text-body-14 font-extralight leading-[1.4] text-white/80">
          {it.tag} {it.no}
        </span>
      </div>
    </div>
  );
}

/* ═══════════ 案19 弧からそろう ═══════════
   弧に沿って散らばっていた4枚が、まっすぐ一列にそろう */
function ArcAlign({ p }: { p: MotionValue<number> }) {
  return (
    <Frame>
      <div className="flex w-full gap-[5px] px-4 sm:px-[40px]">
        {ITEMS.map((it, i) => (
          <ArcCard key={it.title} it={it} i={i} p={p} />
        ))}
      </div>
    </Frame>
  );
}
function ArcCard({ it, i, p }: { it: EventItem; i: number; p: MotionValue<number> }) {
  /* 弧：両端が下がって内側が上がる。そこからまっすぐへ */
  const ys = [120, -40, -40, 120];
  const rots = [-7, -2.5, 2.5, 7];
  const y = useTransform(p, [0, 0.66], [ys[i], 0]);
  const rot = useTransform(p, [0, 0.66], [rots[i], 0]);
  const s = useTransform(p, [0, 0.66], [0.86, 1]);
  return (
    <motion.div className="min-w-0 flex-1" style={{ y, rotate: rot, scale: s }}>
      <CardLink it={it} className="h-[560px] w-full">
        <img src={it.img} alt={it.title} className="size-full object-cover" />
      </CardLink>
    </motion.div>
  );
}

/* ═══════════ 案20 手で引ける ═══════════
   横に並んだフィルムを、ドラッグやホイールで自分で引ける。
   ⚠️ 縦スクロールを奪わないよう、横に動かすのは「横向きのホイール」か
      ドラッグの時だけ。縦ホイールはそのままページに通す */
function DragFilm({ p }: { p: MotionValue<number> }) {
  const box = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const drag = useRef<{ on: boolean; sx: number; base: number }>({
    on: false,
    sx: 0,
    base: 0,
  });
  const CARD = 640;
  const GAP = 5;
  const MIN = -(ITEMS.length * (CARD + GAP) - 1512 + 80);

  const clamp = (v: number) => Math.max(MIN, Math.min(0, v));

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      /* 横向きの動きのほうが大きい時だけ引き取る */
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      setX((v) => clamp(v - e.deltaX));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const down = (e: React.PointerEvent) => {
    drag.current = { on: true, sx: e.clientX, base: x };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current.on) return;
    setX(clamp(drag.current.base + (e.clientX - drag.current.sx)));
  };
  const up = () => {
    drag.current.on = false;
  };

  const o = useTransform(p, [0, 0.3], [0, 1]);

  return (
    <Frame captions={false}>
      <motion.div
        ref={box}
        className="w-full cursor-grab overflow-hidden active:cursor-grabbing"
        style={{ opacity: o }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div
          className="flex gap-[5px] pl-4 transition-transform duration-500 ease-out sm:pl-[40px]"
          style={{ transform: `translateX(${x}px)` }}
        >
          {ITEMS.map((it) => (
            <div
              key={it.title}
              className="flex shrink-0 flex-col gap-5"
              style={{ width: CARD }}
            >
              <CardLink it={it} className="h-[600px] w-full">
                {/* ドラッグ中に画像そのものが選択・移動しないようにする */}
                <img
                  src={it.img}
                  alt={it.title}
                  draggable={false}
                  className="size-full select-none object-cover"
                />
              </CardLink>
              <Caption it={it} />
            </div>
          ))}
        </div>
      </motion.div>
      <p className="px-4 text-body-14 font-extralight leading-[1.4] text-ink/40 sm:px-[40px]">
        ← 横に引けます
      </p>
    </Frame>
  );
}

/** 案11〜20 の入口。EventSection から番号で呼ばれる */
export function ExtraPattern({ pat, p }: { pat: number; p: MotionValue<number> }) {
  switch (pat) {
    case 11:
      return <BandOpen p={p} />;
    case 12:
      return <CrossRows p={p} />;
    case 13:
      return <Peephole p={p} />;
    case 14:
      return <OneByOne p={p} />;
    case 15:
      return <WideOpen p={p} />;
    case 16:
      return <DriftColumns p={p} />;
    case 17:
      return <HoverOpen p={p} />;
    case 18:
      return <BigNumbers p={p} />;
    case 19:
      return <ArcAlign p={p} />;
    case 20:
      return <DragFilm p={p} />;
    default:
      return null;
  }
}

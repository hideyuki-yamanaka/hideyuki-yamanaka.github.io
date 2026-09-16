"use client";

/* eslint-disable @next/next/no-img-element */
/* ═══════════════════════════════════════════════════════════════════
 * 網走V3 体験セクション｜案12「奥行きの3Dカルーセル」／案13「湾曲するカルーセル」
 * 実装チェック用に、この1ファイルだけで動くようまとめたもの（2026-09-17）
 *
 *   案12 = CSS 3D Transform ベース
 *          カードが楕円の軌道に並び、中央からの角度で
 *          rotateY / translateX / translateZ / scale / opacity を同時に補間。
 *          z から z-index を作って前後関係を保つ。無限ループ。
 *
 *   案13 = Three.js / WebGL ベース
 *          PlaneGeometry の頂点を Vertex Shader で円筒座標へ移して
 *          【カード表面そのものを湾曲】させる。rotateY の擬似表現ではない。
 *          湾曲・位置・角度・スクロールはそれぞれ別のパラメータで制御。
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
 *   PC : 横ドラッグ／横ホイール　スマホ : 横スワイプ
 *   案12 は離すといちばん近いカードへスナップ、案13 は慣性で滑って止まる
 *
 * ⚠️ 実装メモ（ハマったところ）
 *   ・Three.js の ShaderMaterial は three が自動で入れる色空間の変換を通らない。
 *     読み書きとも LinearSRGBColorSpace にそろえないと色がどぎつく出る。
 *   ・THREE.NoColorSpace を outputColorSpace に入れると例外が出て、
 *     そのまま握り潰されてフォールバック表示になる（原因が見えないので注意）。
 *   ・3D の箱に overflow:hidden を掛けると奥行きが潰れる。切るなら外側の枠で。
 * ═══════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from "react";

/* ── 表示する中身（プロジェクトのデータに差し替えてください）───────── */
type Item = { no: string; tag: string; title: string; img: string; href: string };
const ITEMS: Item[] = [
  { no: "01", tag: "体験", title: "博物館 網走監獄", img: "/img/spot/kangoku-1.jpg", href: "/spot/kangoku" },
  { no: "02", tag: "体験", title: "オホーツク流氷館", img: "/img/spot/ryuhyokan-1.jpg", href: "/spot/ryuhyokan" },
  { no: "03", tag: "体験", title: "カヌー体験", img: "/img/spot/canoe-1.jpg", href: "/spot/canoe" },
  { no: "04", tag: "体験", title: "オジロワシ・オオワシウォッチング", img: "/img/spot/washi-1.jpg", href: "/spot/washi" },
];

/* ═══════════════════════════════════════════════════
   調整はここだけ見ればよい
   ═══════════════════════════════════════════════════ */
const CONFIG = {
  /* ── 案34（CSS 3D）── */
  css3d: {
    perspective: 1500, // 親に掛ける遠近の強さ（px）
    cardW: 360, // カードの幅
    cardH: 470, // カードの高さ
    radiusX: 620, // 楕円の横半径（左右にどれだけ広がるか）
    radiusZ: 520, // 楕円の奥行き半径（どれだけ奥へ回り込むか）
    stepDeg: 44, // カード1枚ぶんの角度
    rotateGain: 0.9, // カードが中央を向く強さ（1で軌道の接線どおり）
    scaleFar: 0.72, // いちばん奥のカードの大きさ
    opacityFar: 0.35, // いちばん奥のカードの不透明度
    damping: 0.12, // 追従のなめらかさ（小さいほどゆっくり）
    dragGain: 1 / 9, // ドラッグ 1px あたり何枚ぶん進むか
    wheelGain: 1 / 320, // ホイール 1px あたり何枚ぶん進むか
    stageH: 600, // 舞台の高さ
  },
  /* ── 案35（Three.js）── */
  webgl: {
    cameraDistance: 900, // カメラの引き
    fov: 42,
    cardW: 380,
    cardH: 490,
    cardSpacing: 430, // カードの間隔（円弧に沿った長さ）
    bendRadius: 1100, // 円筒の半径。小さいほど強く曲がる
    bendStrength: 1, // 曲がりの強さ（0で平ら）
    bendBoost: 0.55, // 速く動かした時に増やす曲がり
    segments: 40, // 横方向の分割数（多いほどなめらかに曲がる）
    damping: 0.09,
    inertia: 0.92, // 手を離したあとの減速（1に近いほど長く滑る）
    dragGain: 1 / 420, // ドラッグ 1px あたりの進み
    wheelGain: 1 / 900,
    stageH: 600,
  },
};

/* 値をなめらかに近づける */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/* 見た目の都合で 0〜1 に収める */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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

/** ドラッグ・スワイプ・ホイールを「何枚ぶん進んだか」に変える共通の入力 */
function useCarouselInput({
  el,
  onDelta,
  onRelease,
  dragGain,
  wheelGain,
}: {
  el: React.RefObject<HTMLElement | null>;
  onDelta: (d: number, live: boolean) => void;
  onRelease: (v: number) => void;
  dragGain: number;
  wheelGain: number;
}) {
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let down = false;
    let lastX = 0;
    let vel = 0;

    const start = (e: PointerEvent) => {
      down = true;
      lastX = e.clientX;
      vel = 0;
      node.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      const d = -dx * dragGain;
      vel = d;
      onDelta(d, true);
    };
    const up = () => {
      if (!down) return;
      down = false;
      onRelease(vel);
    };
    const wheel = (e: WheelEvent) => {
      /* 横方向の動きが大きい時だけ引き取る（縦スクロールは奪わない） */
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      onDelta(e.deltaX * wheelGain, false);
    };

    node.addEventListener("pointerdown", start);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    node.addEventListener("pointerleave", up);
    node.addEventListener("wheel", wheel, { passive: false });
    return () => {
      node.removeEventListener("pointerdown", start);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
      node.removeEventListener("pointerleave", up);
      node.removeEventListener("wheel", wheel);
    };
  }, [el, onDelta, onRelease, dragGain, wheelGain]);
}

/** カードに乗せる情報（グルメと同じ言葉遣い） */
function CardInfo({ it }: { it: Item }) {
  return (
    <a
      href={it.href}
      className="group/hover absolute inset-0 flex flex-col justify-end bg-gradient-to-b from-black/5 to-black/80 px-7 py-6 opacity-0 transition-opacity duration-500 ease-out hover:opacity-100"
    >
      <div className="flex translate-y-[16px] flex-col gap-2 opacity-0 transition-all delay-75 duration-500 ease-out group-hover/hover:translate-y-0 group-hover/hover:opacity-100">
        <p className="text-[14px] font-extralight leading-[1.2] text-white/80">
          {it.tag} {it.no}
        </p>
        <p className="text-[28px] font-thin leading-[1.3] text-white">
          {it.title}
        </p>
        <span className="mt-1 flex items-center gap-1 text-[14px] font-extralight leading-[1.2] text-white">
          もっと見る
          <img src="/img/icon-view-more.svg" alt="" className="size-[16px]" />
        </span>
      </div>
    </a>
  );
}

/* ═══════════════════════════════════════════════════
   案12（内部の呼び名は案34） 奥行きの3Dカルーセル（CSS 3D Transform）
   楕円の軌道に並べ、中央から離れるほど
   rotateY / translateX / translateZ / scale を同時に変える。
   平行移動ではなく「回り込み」に見えるのがねらい
   ═══════════════════════════════════════════════════ */
export function Carousel3D() {
  const C = CONFIG.css3d;
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  /* いま何枚目にいるか（小数。ドラッグ中はなめらかに動く） */
  const pos = useRef(0);
  const target = useRef(0);
  const reduce = usePrefersReducedMotion();
  const n = ITEMS.length;

  useCarouselInput({
    el: box,
    dragGain: C.dragGain,
    wheelGain: C.wheelGain,
    onDelta: (d) => {
      target.current += d;
    },
    onRelease: (vel) => {
      /* 手を離したら、勢いを少し足してからいちばん近いカードへ吸い込む */
      target.current = Math.round(target.current + vel * 6);
    },
  });

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      pos.current = reduce
        ? target.current
        : lerp(pos.current, target.current, C.damping);
      for (let i = 0; i < n; i++) {
        const el = cards.current[i];
        if (!el) continue;
        /* 中央からの「枚数の差」を -n/2〜n/2 に畳む＝無限ループ */
        let k = i - pos.current;
        k = ((k % n) + n + n / 2) % n - n / 2;
        const rad = (k * C.stepDeg * Math.PI) / 180;
        const x = Math.sin(rad) * C.radiusX;
        /* 手前が 0、奥ほどマイナス */
        const z = Math.cos(rad) * C.radiusZ - C.radiusZ;
        /* 中央を向く（軌道の接線）。左のカードは右を、右のカードは左を向く */
        const ry = -k * C.stepDeg * C.rotateGain;
        /* 奥ほど小さく・薄く */
        const far = clamp01((C.radiusZ + z) / (C.radiusZ * 2));
        const sc = lerp(C.scaleFar, 1, far);
        const op = lerp(C.opacityFar, 1, far);
        el.style.transform =
          `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) ` +
          `rotateY(${ry.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        el.style.opacity = op.toFixed(3);
        /* 前後関係が破綻しないよう、奥行きから z-index を作る */
        el.style.zIndex = String(100 + Math.round(z));
        /* 中央のカードだけ触れるようにする（奥のカードを誤って押さない） */
        el.style.pointerEvents = Math.abs(k) < 0.5 ? "auto" : "none";
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [C, n, reduce]);

  return (
    <div className="flex w-full flex-col gap-12 bg-white sm:gap-[90px]">
      <h2 className="px-6 text-[36px] font-thin leading-[1.8] text-black sm:px-[147px]">
        意外とオモロい、網走。
      </h2>
      <div
        ref={box}
        className="relative w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
        style={{ height: C.stageH, perspective: `${C.perspective}px` }}
      >
        <div
          className="absolute left-1/2 top-1/2 size-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {ITEMS.map((it, i) => (
            <div
              key={it.title}
              ref={(el) => {
                cards.current[i] = el;
              }}
              className="group absolute"
              style={{
                width: C.cardW,
                height: C.cardH,
                marginLeft: -C.cardW / 2,
                marginTop: -C.cardH / 2,
                transformStyle: "preserve-3d",
                willChange: "transform, opacity",
              }}
            >
              <div className="relative size-full overflow-hidden bg-white shadow-[0_24px_60px_rgba(0,0,0,.22)]">
                <img
                  src={it.img}
                  alt={it.title}
                  draggable={false}
                  className="size-full select-none object-cover"
                />
                <CardInfo it={it} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="px-6 text-[14px] font-extralight leading-[1.4] text-black/40 sm:px-[147px]">
        ← 横にドラッグすると回ります
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   案13（内部の呼び名は案35）湾曲するカルーセル（Three.js / WebGL）
   ・PlaneGeometry を横に細かく割り、【頂点そのもの】を円筒座標へ移して曲げる
     theta = x / radius / newX = sin(theta)*radius / newZ = radius - cos(theta)*radius
   ・曲げは Vertex Shader でやる（CPU から毎フレーム頂点を書き換えない）
   ・カードの湾曲・位置・角度・スクロールはそれぞれ別のパラメータで制御する
   ═══════════════════════════════════════════════════ */
export function CarouselBend() {
  const C = CONFIG.webgl;
  const host = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const posRef = useRef(0);
  const velRef = useRef(0);
  const reduce = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);

  useCarouselInput({
    el: host,
    dragGain: C.dragGain,
    wheelGain: C.wheelGain,
    onDelta: (d) => {
      target.current += d;
      velRef.current = d;
    },
    onRelease: (vel) => {
      velRef.current = vel;
    },
  });

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let disposed = false;
    let cleanup = () => {};

    /* three は重いので、この案を選んだ時だけ読み込む */
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
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(C.fov, 1, 1, 6000);
        camera.position.z = C.cameraDistance;
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        /* ⚠️ ShaderMaterial は three が自動で入れる色空間の変換を通らない。
           読み込み側（テクスチャ）と書き出し側（レンダラ）の両方を
           「変換しない」でそろえて、<img> と同じ色で出す。
           片方だけ sRGB にすると青が異様に濃く出る（2026-09-17 実測）。
           ⚠️ 定数名はバージョンで変わるので、無い時は何もしない */
        if (THREE.LinearSRGBColorSpace) {
          renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
        }
        node.appendChild(renderer.domElement);
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block";

        /* ── 曲げるシェーダー ──
           x を円筒座標へ移すだけ。UV は触らないので絵は伸びない */
        const vert = `
          uniform float uRadius;
          uniform float uStrength;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec3 pos = position;
            float theta = (pos.x / uRadius) * uStrength;
            float nx = sin(theta) * uRadius;
            float nz = uRadius - cos(theta) * uRadius;
            pos.x = mix(pos.x, nx, uStrength);
            pos.z -= nz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }`;
        const frag = `
          uniform sampler2D uMap;
          uniform float uDim;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(uMap, vUv);
            gl_FragColor = vec4(c.rgb * (1.0 - uDim), c.a);
          }`;

        const loader = new THREE.TextureLoader();
        const meshes: import("three").Mesh[] = [];
        const uniforms: {
          uRadius: { value: number };
          uStrength: { value: number };
          uDim: { value: number };
        }[] = [];

        ITEMS.forEach((it) => {
          const tex = loader.load(it.img);
          if (THREE.LinearSRGBColorSpace) tex.colorSpace = THREE.LinearSRGBColorSpace;
          const u = {
            uMap: { value: tex },
            uRadius: { value: C.bendRadius },
            uStrength: { value: C.bendStrength },
            uDim: { value: 0 },
          };
          const mat = new THREE.ShaderMaterial({
            uniforms: u,
            vertexShader: vert,
            fragmentShader: frag,
            transparent: true,
            side: THREE.DoubleSide,
          });
          const geo = new THREE.PlaneGeometry(
            C.cardW,
            C.cardH,
            C.segments,
            1
          );
          const m = new THREE.Mesh(geo, mat);
          scene.add(m);
          meshes.push(m);
          uniforms.push(u);
        });

        const resize = () => {
          const w = node.clientWidth || 1;
          const h = node.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          /* 画面が狭いほどカメラを引いて、カードが収まるようにする */
          camera.position.z = C.cameraDistance * (w < 900 ? 1.35 : 1);
          camera.updateProjectionMatrix();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(node);

        const n = ITEMS.length;
        const span = C.cardSpacing * n;
        let raf = 0;
        const draw = () => {
          /* 手を離したあとは慣性で少し流れて止まる */
          if (!reduce) {
            target.current += velRef.current;
            velRef.current *= C.inertia;
            if (Math.abs(velRef.current) < 0.00002) velRef.current = 0;
          }
          posRef.current = reduce
            ? target.current
            : lerp(posRef.current, target.current, C.damping);

          /* 速く動かしている間だけ、曲がりを少し強くする */
          const speed = Math.min(1, Math.abs(velRef.current) * 60);
          const bend = C.bendStrength * (1 + C.bendBoost * speed);

          meshes.forEach((m, i) => {
            /* 円弧に沿った位置。左右へ無限に続いて見えるよう折り返す */
            let s = (i - posRef.current) * C.cardSpacing;
            s = ((s % span) + span + span / 2) % span - span / 2;
            const theta = s / C.bendRadius;
            m.position.x = Math.sin(theta) * C.bendRadius;
            m.position.z = C.bendRadius - Math.cos(theta) * C.bendRadius;
            m.position.z *= -1; /* 奥へ回り込ませる */
            /* カメラに対する角度＝軌道の接線。位置とは別に持つ */
            m.rotation.y = -theta;
            uniforms[i].uRadius.value = C.bendRadius;
            uniforms[i].uStrength.value = bend;
            /* 奥のカードは少し沈ませる */
            uniforms[i].uDim.value = clamp01(-m.position.z / (C.bendRadius * 1.6)) * 0.55;
          });

          renderer.render(scene, camera);
          raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          meshes.forEach((m) => {
            m.geometry.dispose();
            (m.material as import("three").ShaderMaterial).dispose();
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [C, reduce]);

  return (
    <div className="flex w-full flex-col gap-12 bg-white sm:gap-[90px]">
      <h2 className="px-6 text-[36px] font-thin leading-[1.8] text-black sm:px-[147px]">
        意外とオモロい、網走。
      </h2>
      <div
        ref={host}
        className="relative w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
        style={{ height: C.stageH }}
      >
        {failed && (
          /* WebGL が使えない環境のための素の並び */
          <div className="flex size-full items-center justify-center gap-[5px] px-[40px]">
            {ITEMS.map((it) => (
              <div key={it.title} className="h-[520px] min-w-0 flex-1 overflow-hidden">
                <img src={it.img} alt={it.title} className="size-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="px-6 text-[14px] font-extralight leading-[1.4] text-black/40 sm:px-[147px]">
        ← 横にドラッグすると流れます
      </p>
    </div>
  );
}


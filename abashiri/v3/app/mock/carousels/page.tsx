"use client";

/* 案12・13（3Dカルーセル）の実装チェック用ページ。
   本番のセクションと同じ中身を、まとめたコンポーネントで動かしている。
   コピペ用のコードは /mock/Carousels.tsx.txt にも置いてある */
import { Carousel3D, CarouselBend } from "@/components/Carousels";

export default function CarouselsMock() {
  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-white">
      <section className="border-b border-black/10 py-[60px]">
        <p className="px-6 pb-8 text-[13px] font-light tracking-[0.1em] text-black/40 sm:px-[147px]">
          案12 奥行きの3Dカルーセル（CSS 3D Transform）
        </p>
        <Carousel3D />
      </section>
      <section className="py-[60px]">
        <p className="px-6 pb-8 text-[13px] font-light tracking-[0.1em] text-black/40 sm:px-[147px]">
          案13 湾曲するカルーセル（Three.js / WebGL）
        </p>
        <CarouselBend />
      </section>
    </main>
  );
}

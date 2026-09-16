"use client";

/* 案12・13（3Dカルーセル）の実装チェック用ページ。
   本番のセクションと同じ中身を、まとめたコンポーネントで動かしている。
   コピペ用のコードは /mock/Carousels.tsx.txt にも置いてある。

   ⚠️ このサイトは globals.css で body { overflow: hidden } にしている
      （トップページが縮小キャンバスのため）。このページだけ自前の
      スクロール容器にしないと、縦スクロールの確認ができない */
import { Carousel3D, CarouselBend } from "@/components/Carousels";

export default function CarouselsMock() {
  return (
    <main className="h-dvh w-full overflow-y-auto overflow-x-hidden overscroll-contain bg-white">
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
      <div aria-hidden className="h-[40vh]" />
    </main>
  );
}

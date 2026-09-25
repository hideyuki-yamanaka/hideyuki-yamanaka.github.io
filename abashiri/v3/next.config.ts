import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // framer-motion (Motion v13) が dev の StrictMode 二重マウントで
  // AnimatePresence の入場アニメーションを固まらせるため無効化
  reactStrictMode: false,
  // スマホモード（実機ライブ同期）で、同じ Wi-Fi のスマホから開発サーバを開けるようにする。
  // Next.js 16 は既定で localhost 以外からの開発用リクエストを止めるため、LAN のアドレスを許可する。
  // ⚠️ 開発時（next dev）だけに効く設定。本番には関係しない（2026-09-26）
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
};

export default nextConfig;

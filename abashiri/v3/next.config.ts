import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // framer-motion (Motion v13) が dev の StrictMode 二重マウントで
  // AnimatePresence の入場アニメーションを固まらせるため無効化
  reactStrictMode: false,
};

export default nextConfig;

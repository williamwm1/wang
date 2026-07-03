import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // 仓库中存在多个 lockfile 时，显式指定本项目为根目录
    root: path.join(__dirname),
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Worktree is 3 levels deep under the main project root which holds node_modules
    root: path.resolve(__dirname, '../../..'),
  },
};

export default nextConfig;

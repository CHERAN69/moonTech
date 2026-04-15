import type { NextConfig } from "next";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nextPkgPath = path.dirname(require.resolve("next/package.json"));
// Go from .../node_modules/next up to the project root
const projectRoot = path.resolve(nextPkgPath, "..", "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;

import { dirname } from "node:path";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

export function resolveTurbopackRoot(startDir = projectRoot) {
  let currentDir = startDir;

  while (true) {
    if (existsSync(join(currentDir, "node_modules/next/package.json"))) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      return projectRoot;
    }

    currentDir = parentDir;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  turbopack: {
    root: resolveTurbopackRoot()
  }
};

export default nextConfig;

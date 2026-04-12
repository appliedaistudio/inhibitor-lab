import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import manifest from "./public/manifest.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function bundleClassicContentScript() {
  return {
    name: "bundle-classic-content-script",
    apply: "build",
    enforce: "post",
    async writeBundle() {
      await esbuild({
        entryPoints: [resolve(__dirname, "src/content/content.js")],
        bundle: true,
        format: "iife",
        platform: "browser",
        target: "chrome120",
        minify: true,
        outfile: resolve(__dirname, "dist/content.js"),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), bundleClassicContentScript(), crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        blocked: resolve(__dirname, "blocked.html"),
        popup: resolve(__dirname, "popup.html"),
        "service-worker": resolve(
          __dirname,
          "src/background/service-worker.js",
        ),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
});
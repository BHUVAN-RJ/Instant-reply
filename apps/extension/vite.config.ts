import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest.json";

export default defineConfig({
  plugins: [crx({ manifest })],
  // Built to the repo root so the unpacked extension keeps loading from the same dist/ folder.
  build: { outDir: "../../dist", emptyOutDir: true },
});

import { defineConfig } from "vite";

// The design preview (preview/index.html): every theme on a stand in for Gmail's reply box, using the
// themes' real code. No extension plugin; fonts are served from public/.
export default defineConfig({
  root: "preview",
  publicDir: "../public",
  server: { port: 5199, strictPort: false },
});

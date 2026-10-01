// © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited.
// Third-party components: see public/third-party-notices.txt.
import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  // Keep /*! ... */ notices through minification.
  esbuild: { legalComments: 'inline' },
  build: {
    rollupOptions: {
      // Source comments are stripped by the minifier, so the shipped bundle carries its own notice.
      output: { banner: '/*! © 2026 Oriby Games. All rights reserved. Unauthorized copying or redistribution is prohibited. */' },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

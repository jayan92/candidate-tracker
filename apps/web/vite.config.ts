import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // strictPort: the API's CORS allow-list names :5173 exactly. Vite's default is
  // to silently hop to :5174 when the port is taken, which would leave every
  // fetch blocked by the browser with no obvious cause. Fail loudly instead.
  server: { port: 5173, strictPort: true },
  // `@candidate-tracker/shared` is consumed as TypeScript source, not a built
  // bundle (see decisions.md, Phase 0). The npm-workspace symlink resolves to
  // packages/shared/src, which sits outside node_modules, so Vite transpiles it
  // like any other source file. Excluding it from the dependency pre-bundler
  // keeps edits to the shared schemas hot-reloading instead of being frozen
  // into an optimized chunk.
  optimizeDeps: { exclude: ["@candidate-tracker/shared"] },
});

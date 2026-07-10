import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    test: {
      env,
      globalSetup: ["./test/global-setup.ts"],
      fileParallelism: false,
    },
  };
});

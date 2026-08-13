import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep shared app/lib code out of the entry chunk so lazy feature
        // pages do not import back into index-*.js (circular chunk graph).
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("/react/")) {
              return "react-vendor";
            }
            if (id.includes("@fontsource")) {
              return "fonts";
            }
            return "vendor";
          }

          // Keep explicitly lazy feature pages in their own chunks.
          if (
            /\/src\/components\/(AchievementsPage|GmStatsPage|LegalPage|BetaNotesPage|PlayerStatsTable)\./.test(
              id,
            )
          ) {
            return undefined;
          }

          // Shared libs + reusable components live outside the entry so lazy
          // pages never import back into index-*.js (circular chunk graph).
          if (
            id.includes("/src/lib/") ||
            id.includes("/src/data/") ||
            id.includes("/src/components/")
          ) {
            return "app-shared";
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "src/**/*.test.ts",
      "functions/__tests__/**/*.test.ts",
    ],
  },
});

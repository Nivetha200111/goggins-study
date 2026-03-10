import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist-electron/**",
    "next-env.d.ts",
    // Legacy webcam / quiz flow kept in-repo but no longer mounted after the local-agent pivot.
    "src/components/Companion/**",
    "src/components/PostureMonitor/**",
    "src/components/Quiz/**",
    "src/hooks/useContentAnalyzer.ts",
    "src/hooks/useDemonMode.ts",
    "src/hooks/usePostureMonitor.ts",
    "src/store/studyIntelligenceStore.ts",
  ]),
]);

export default eslintConfig;

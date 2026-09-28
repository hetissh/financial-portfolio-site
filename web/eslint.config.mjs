import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
export default defineConfig([...nextVitals, ...nextTypescript,
  globalIgnores([".next/**", ".next-admin/**", "out/**", "node_modules.incomplete/**", "next-env.d.ts", "test-results/**", "test-results-admin/**", "test-results-public/**", "playwright-report/**", "playwright-report-admin/**"]),
]);

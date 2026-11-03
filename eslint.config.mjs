import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...ts,
  {
    files: [
      "src/components/auth-form.tsx",
      "src/components/sign-out.tsx",
      "src/components/account-panel.tsx",
    ],
    rules: { "@next/next/no-location-assign-relative-destination": "off" },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

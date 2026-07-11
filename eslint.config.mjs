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
    "next-env.d.ts",
  ]),
  {
    rules: {
      // The brief requires preserving the provided design exactly; the theme's
      // CSS targets raw <img> elements, so next/image is intentionally not used.
      "@next/next/no-img-element": "off",
      // The original theme's 4 CSS files are served verbatim from /public via
      // <link> (preserving their internal url(../images/…) references) rather
      // than bundled, to keep the design pixel-identical.
      "@next/next/no-css-tags": "off",
      // Poppins is loaded via <link> to match the original design's font setup.
      "@next/next/no-page-custom-font": "off",
      // The theme hydration effect deliberately reads localStorage after mount
      // to avoid an SSR/client class mismatch (renders light, then flips).
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;

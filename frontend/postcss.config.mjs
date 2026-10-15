import path from "node:path";
import { fileURLToPath } from "node:url";

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Tailwind resolves `@import "tailwindcss"` and scans sources from `base`,
      // which defaults to process.cwd(). Turbopack's PostCSS worker can run from a
      // parent folder (the repo root), so pin it to this app's directory.
      base: path.dirname(fileURLToPath(import.meta.url)),
    },
  },
};

export default config;

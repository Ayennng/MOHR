// Prisma CLI config. DATABASE_URL comes from the environment or backend/.env.local.
import dotenv from "dotenv";
import path from "path";
import { defineConfig, env } from "prisma/config";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

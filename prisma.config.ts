import { defineConfig } from "prisma/config";
import { loadEnvConfig } from "@next/env";
import { loadProductionEnvironment } from "./lib/production/environment";

if (process.env.NODE_ENV === "production") loadProductionEnvironment();
else loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

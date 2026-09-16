import type { NextConfig } from "next";
import { loadProductionEnvironment } from "./lib/production/environment";

if (process.env.NODE_ENV === "production") loadProductionEnvironment();

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;

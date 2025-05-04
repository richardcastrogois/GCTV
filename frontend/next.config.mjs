/** @type {import('next').NextConfig} */
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack(config) {
    config.resolve.alias["@"] = resolve(__dirname, "src");
    config.resolve.alias["@/utils"] = resolve(__dirname, "src/utils");
    return config;
  },
};

export default nextConfig;

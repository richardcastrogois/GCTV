import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        port: "",
        pathname: "/photos/**",
      },
    ],
    formats: ["image/webp"],
    minimumCacheTTL: 60,
  },
  webpack(config) {
    config.resolve.alias["@"] = resolve(__dirname, "src");
    config.resolve.alias["@/utils"] = resolve(__dirname, "src/utils");
    return config;
  },
};

export default nextConfig;

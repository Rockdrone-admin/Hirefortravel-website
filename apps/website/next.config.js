/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for easier deployment if needed, or leave default for Vercel
  transpilePackages: ["@repo/logger"],
};

module.exports = nextConfig;

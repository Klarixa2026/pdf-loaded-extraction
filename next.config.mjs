/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling these — they rely on native Node.js behaviour
  // that breaks in the edge/webpack bundling environment.
  serverExternalPackages: ['pdf-parse', 'exceljs'],
};

export default nextConfig;

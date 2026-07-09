/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["ws"],
    serverActions: {
      allowedOrigins: ["*.ngrok-free.app", "*.ngrok.io", "localhost:3000"],
    },
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ilk deploy için hatalarda bile build'e izin ver
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint hatalarını build sırasında yoksay
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;

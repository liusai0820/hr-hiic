/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  
  // 配置静态资源
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  
  // 启用详细日志
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig; 
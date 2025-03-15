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
  
  // 图片配置
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/images/**',
      },
    ],
    unoptimized: process.env.NODE_ENV !== 'production',
    dangerouslyAllowSVG: true,
  },

  // 禁用构建时的API请求
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig; 
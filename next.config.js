/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow importing images
  images: {
    domains: ['localhost'],
  },
  // Add any environment variables you need here
  env: {
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
  },
  // Add output option for Docker deployment
  output: 'standalone',
};

module.exports = nextConfig; 
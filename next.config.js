/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/index.py', // Wait for Next.js to forward it to your Python file
      },
    ];
  },
};

module.exports = nextConfig;
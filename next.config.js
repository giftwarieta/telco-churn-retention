/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      '/api': [
        './api/backend.py',
        './models/**/*',
        './src/**/*',
        './data/**/*',
        './postdictive_full_results.csv',
      ],
      '/api/index': [
        './api/backend.py',
        './models/**/*',
        './src/**/*',
        './data/**/*',
        './postdictive_full_results.csv',
      ],
    },
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    RESTAURANT_NAME: process.env.RESTAURANT_NAME,
    RESTAURANT_EMAIL: process.env.RESTAURANT_EMAIL,
    RESTAURANT_PHONE: process.env.RESTAURANT_PHONE,
  },
  images: {
    domains: ['images.unsplash.com'], // Add domains for any images you might use
  },
  // Disable caching for API routes to ensure fresh data
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' }
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/reservations',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
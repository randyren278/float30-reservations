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
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
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
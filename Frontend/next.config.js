/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ipfs.io'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
    ],
  },
};

module.exports = nextConfig; 
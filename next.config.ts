import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Keep isolated API-mocked browser tests out of the running development server's output.
  distDir: process.env.NEXT_FRONTEND_TEST === '1' ? '.next/frontend-browser' : '.next',
  async redirects() {
    return [
      ...[
        ['login.html', '/login'], ['managers.html', '/managers'],
        ['generate-id-card.html', '/generate-id-card'], ['id-card-detail.html', '/id-cards'],
        ['scan.html', '/scan'], ['verify.html', '/verify'],
      ].map(([file, destination]) => ({source: `/${file}`, destination, permanent: false})),
      {source: '/portal-data.js', destination: '/404', permanent: false},
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

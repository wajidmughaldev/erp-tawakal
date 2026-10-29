import type {NextConfig} from 'next';

// `NEXT_EXPORT=1` builds the static site that is uploaded to the web host (see deploy/DEPLOY.md).
// Local development and the browser tests keep the normal Next.js server.
const exporting = process.env.NEXT_EXPORT === '1';

const nextConfig: NextConfig = {
  // Keep isolated API-mocked browser tests out of the running development server's output.
  distDir: process.env.NEXT_OUTPUT_DIR ?? (process.env.NEXT_FRONTEND_TEST === '1' ? '.next/frontend-browser' : '.next'),
  ...(exporting ? {output: 'export' as const, images: {unoptimized: true}} : {}),
};

export default nextConfig;

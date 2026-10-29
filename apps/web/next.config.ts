import type { NextConfig } from 'next';

const API_UPSTREAM =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bagg/api-client'],

  /**
   * Proxy /api/* to the FastAPI backend.
   *
   * Benefits:
   * - Same-origin requests → no cross-origin cookie headaches.
   * - Clients never need to know the backend URL.
   * - CORS is only needed for non-proxied third-party integrations.
   * - X-Forwarded-For / X-Real-IP forwarded automatically by Next.js.
   */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_UPSTREAM}/:path*`,
      },
    ];
  },

  /**
   * Strict security headers via Next.js (complements the edge middleware).
   * These fire for every response including API proxy responses.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

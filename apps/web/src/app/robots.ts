import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',

        allow: '/',

        disallow: [
          '/api/',
          '/dashboard',
          '/clients',
          '/quotes',
          '/invoices',
          '/payments',
          '/receipts',
          '/settings',
          '/profile',
          '/onboarding',
        ],
      },
    ],

    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
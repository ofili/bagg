import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

const routes = [
  '/',
  '/features',
  '/creatives',
  '/pricing',
  '/security',
  '/about',
  '/help',
  '/contact',
  '/early-access',
  '/login',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: route === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: route === '/' ? 1 : 0.7,
  }));
}

import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

const routes: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/features', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/features/invoicing', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/features/payments', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/features/receipts', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/features/quotes', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/freelancers', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/creatives', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/consultants', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/studios', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/security', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/help', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/early-access', priority: 0.5, changeFrequency: 'monthly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    changeFrequency,
    priority,
  }));
}

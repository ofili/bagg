import type { Metadata } from 'next';
import { absoluteUrl, siteDescription, siteName } from '@/lib/site';

export function marketingMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url,
      siteName,
      type: 'website',
      locale: 'en_NG',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteName}`,
      description,
    },
    ...(noIndex
      ? {
          robots: {
            index: false,
            follow: true,
          },
        }
      : {}),
  };
}

export const defaultMarketingMetadata: Metadata = {
  title: {
    absolute: 'bagg | send. chase. get paid.',
  },
  description: siteDescription,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'bagg | send. chase. get paid.',
    description: siteDescription,
    url: absoluteUrl('/'),
    siteName,
    type: 'website',
    locale: 'en_NG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bagg | send. chase. get paid.',
    description: siteDescription,
  },
};

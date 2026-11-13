import type { Metadata } from 'next';

import {
  absoluteUrl,
  siteDescription,
  siteName,
} from '@/lib/site';

interface MarketingMetadataOptions {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}

export function marketingMetadata({
                                    title,
                                    description,
                                    path,
                                    noIndex = false,
                                  }: MarketingMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);

  return {
    title,
    description,

    alternates: {
      canonical,
    },

    robots: {
      index: !noIndex,
      follow: true,
      googleBot: {
        index: !noIndex,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },

    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      type: 'website',
      locale: 'en_NG',
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export const defaultMarketingMetadata: Metadata = {
  title: {
    absolute:
        'Bagg | Invoice like a pro. Get paid without chasing.',
  },

  description: siteDescription,

  alternates: {
    canonical: absoluteUrl('/'),
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },

  openGraph: {
    title: 'Freelancer Invoicing & Payment Software | Bagg',
    description: siteDescription,
    url: absoluteUrl('/'),
    siteName,
    type: 'website',
    locale: 'en_NG',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Bagg — invoice like a pro. Get paid without chasing.',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Freelancer Invoicing & Payment Software | Bagg',
    description: siteDescription,
    images: ['/og-image.png']
  },
};
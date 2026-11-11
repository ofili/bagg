
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import React from 'react';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-bricolage',
});

const themeInitScript = `
(() => {
  try {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    document.documentElement.dataset.theme = prefersDark
      ? 'dark'
      : 'light';
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FF7A1A' },
    { media: '(prefers-color-scheme: dark)', color: '#1A110A' },
  ],
};

export const metadata: Metadata = {
  title: 'Bagg | Invoice like a pro. Get paid without chasing.',
  description:
    'Invoicing and get-paid workspace tailored for African freelancers and creators.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Bagg | Invoice like a pro. Get paid without chasing.',
    description:
      'Invoicing and get-paid workspace tailored for African freelancers and creators.',
    type: 'website',
    locale: 'en_NG',
    siteName: 'Bagg',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bagg | Invoice like a pro. Get paid without chasing.',
    description:
      'Invoicing and get-paid workspace tailored for African freelancers and creators.',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'format-detection': 'telephone=no',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} scroll-smooth`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-cream font-sans text-text antialiased selection:bg-sun">
        {children}
      </body>
    </html>
  );
}

import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import React from 'react';

import { ThemeProvider } from '@/components/theme/theme-provider';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-bricolage',
});

const themeInitScript = `
(() => {
  const STORAGE_KEY = 'bagg-theme';
  const VALID_THEMES = ['system', 'light', 'dark'];

  try {
    const storedPreference = localStorage.getItem(STORAGE_KEY);
    const preference = VALID_THEMES.includes(storedPreference)
      ? storedPreference
      : 'system';

    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    const resolvedTheme =
      preference === 'system'
        ? (prefersDark ? 'dark' : 'light')
        : preference;

    document.documentElement.dataset.theme = resolvedTheme;
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
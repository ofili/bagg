import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';

// One family for everything. latin-ext carries the naira sign (U+20A6);
// confirm the four currency glyphs render in this font, not a fallback (DESIGN.md 4.4).
const bricolage = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-bricolage',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FF7A1A',
};

export const metadata: Metadata = {
  title: 'Bagg | Invoice like a pro. Get paid without chasing.',
  description: 'Invoicing and get-paid workspace tailored for African freelancers and creators.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Bagg | Invoice like a pro. Get paid without chasing.',
    description: 'Invoicing and get-paid workspace tailored for African freelancers and creators.',
    type: 'website',
    locale: 'en_NG',
    siteName: 'Bagg',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bagg | Invoice like a pro. Get paid without chasing.',
    description: 'Invoicing and get-paid workspace tailored for African freelancers and creators.',
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
    <html lang="en" className={`${bricolage.variable} scroll-smooth`}>
      <body className="min-h-dvh bg-cream font-sans text-text antialiased selection:bg-sun">
        {children}
      </body>
    </html>
  );
}

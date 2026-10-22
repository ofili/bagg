import './globals.css';
import type { Metadata } from 'next';

export const viewport = {
  deviceWidth: 'width=device-width, initial-scale=1.0',
  viewportFit: 'cover',
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
    'theme-color': '#10b981',
    'format-detection': 'telephone=no',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased selection:bg-emerald-200">
        {children}
      </body>
    </html>
  );
}

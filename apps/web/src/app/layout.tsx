import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bagg | Invoice like a pro. Get paid without chasing.',
  description: 'Invoicing and get-paid workspace tailored for African freelancers and creators.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}

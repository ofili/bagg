import { CookieNotice } from '@/components/marketing/cookie-notice';
import { MarketingFooter } from '@/components/marketing/footer';
import { MarketingHeader } from '@/components/marketing/header';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only rounded-small bg-surface px-3 py-2 text-body font-extrabold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
      <CookieNotice />
    </div>
  );
}

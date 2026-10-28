'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button';

const STORAGE_KEY = 'bagg-cookie-notice';

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== 'dismissed');
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'dismissed');
    } catch {
      setVisible(false);
      return;
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6">
      <div
        role="region"
        aria-label="Cookie notice"
        className="mx-auto flex max-w-3xl flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-sheet sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
            <Cookie className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="max-w-xl text-body text-ink-soft">
            We use essential cookies to keep you signed in and remember this choice. We do not use
            advertising cookies.{' '}
            <Link href="/legal/cookies" className="font-extrabold text-link hover:underline">
              Read the cookie notice
            </Link>
            .
          </p>
        </div>
        <button
  type="button"
  onClick={dismiss}
  className={`${buttonStyles()} shrink-0`}
>
  Got it
</button>
      </div>
    </div>
  );
}

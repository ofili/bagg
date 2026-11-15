'use client';

import { CheckCircle } from '@phosphor-icons/react';

export function AllCaughtUp() {
  return (
    <div className="flex items-center gap-3 border-brut border-ink bg-peach p-5">
      <CheckCircle
        aria-hidden
        weight="fill"
        className="h-8 w-8 shrink-0 text-leaf"
      />
      <div>
        <p className="font-extrabold text-text">You’re all caught up</p>
        <p className="text-body text-text-soft">
          Nothing needs your attention right now.
        </p>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { Info } from 'lucide-react';
import { contactEmail } from '@/lib/site';

export function LegalNotice() {
  return (
    <div className="flex items-start gap-3 border-brut border-ink bg-peach p-4 sm:p-5">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
      <p className="text-body text-text-soft">
        This page is written in plain language so the rules are easy to understand. If something is
        unclear, email{' '}
        <a href={`mailto:${contactEmail}`} className="font-extrabold text-link hover:underline">
          {contactEmail}
        </a>
        . You can also read the{' '}
        <Link href="/help" className="font-extrabold text-link hover:underline">
          help centre
        </Link>
        .
      </p>
    </div>
  );
}

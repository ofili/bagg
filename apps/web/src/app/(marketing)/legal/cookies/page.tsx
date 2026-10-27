import Link from 'next/link';
import { LegalNotice } from '@/components/marketing/legal-notice';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail } from '@/lib/site';

export const metadata = marketingMetadata({
  title: 'cookies',
  description: 'What bagg stores in your browser and why.',
  path: '/legal/cookies',
  noIndex: true,
});

export default function CookiesPage() {
  return (
    <article>
      <h1 className="text-display text-ink">cookies.</h1>
      <p className="mt-4 text-body-l text-ink-soft">
        We keep browser storage to a minimum. This page explains what is stored, why it is there and
        how to remove it.
      </p>
      <div className="mt-6">
        <LegalNotice />
      </div>

      <LegalSection title="essential sign-in cookie">
        <p>
          When you sign in, bagg sets an essential session cookie so the server can recognise your
          workspace. Without it, you would have to sign in again on every page.
        </p>
      </LegalSection>

      <LegalSection title="your cookie notice choice">
        <p>
          When you dismiss the cookie notice, we store that choice in your browser’s local storage.
          It is not sent to us with every request. It only stops the notice from appearing again on
          this device.
        </p>
      </LegalSection>

      <LegalSection title="what we do not use">
        <p>
          The marketing site does not use advertising cookies or third-party tracking pixels. If
          that changes, this page and the notice will be updated before the new storage is used.
        </p>
      </LegalSection>

      <LegalSection title="managing storage">
        <p>
          You can clear cookies and local storage in your browser settings. Clearing the sign-in
          cookie will sign you out. Clearing the notice choice will make the notice appear again.
        </p>
        <p>
          For more on how we handle personal information, read the{' '}
          <Link href="/legal/privacy" className="font-extrabold text-link hover:underline">
            privacy summary
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="questions">
        <p>
          Email{' '}
          <a href={`mailto:${contactEmail}`} className="font-extrabold text-link hover:underline">
            {contactEmail}
          </a>{' '}
          if something here is unclear.
        </p>
      </LegalSection>
    </article>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-line-subtle pt-8">
      <h2 className="text-title text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-body-l text-ink-soft">{children}</div>
    </section>
  );
}

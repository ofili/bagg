import Link from 'next/link';
import { LegalNotice } from '@/components/marketing/legal-notice';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail } from '@/lib/site';

export const metadata = marketingMetadata({
  title: 'privacy',
  description: 'The plain-language summary of how bagg handles personal information.',
  path: '/legal/privacy',
  noIndex: true,
});

export default function PrivacyPage() {
  return (
    <article>
      <h1 className="text-display text-ink">privacy.</h1>
      <p className="mt-4 text-body-l text-ink-soft">
        We collect what we need to run your workspace, send your documents and keep the service
        secure. This is the plain-language version while the full policy is being prepared.
      </p>
      <div className="mt-6">
        <LegalNotice />
      </div>

      <LegalSection title="what we collect">
        <p>
          Your email address and sign-in details. The business name, logo, payment details and
          workspace settings you add. Client names, contact details, invoices, quotes, line items,
          reminders and receipts you create.
        </p>
        <p>
          Technical information needed to operate the service, such as delivery events, error logs
          and the basic device information sent by your browser.
        </p>
      </LegalSection>

      <LegalSection title="why we use it">
        <p>
          To create and maintain your workspace, generate documents, send the emails you ask us to
          send, show payment status, provide support and protect the service from abuse.
        </p>
        <p>
          We do not sell your personal information. We do not use advertising cookies on the
          marketing site.
        </p>
      </LegalSection>

      <LegalSection title="who we share it with">
        <p>
          We use service providers for email delivery, file storage and payment processing. They
          receive only what they need to perform that service. We may also disclose information
          where the law requires it or where it is necessary to protect a person from harm.
        </p>
      </LegalSection>

      <LegalSection title="how long we keep it">
        <p>
          We keep workspace and document records while your account is active. If you close your
          account, we will delete or anonymise the information unless we need to keep it for a legal,
          tax or security reason.
        </p>
      </LegalSection>

      <LegalSection title="your choices">
        <p>
          You can ask to see, correct or delete the personal information we hold about you. You can
          also ask how we use it. Email{' '}
          <a href={`mailto:${contactEmail}`} className="font-extrabold text-link hover:underline">
            {contactEmail}
          </a>{' '}
          and tell us what you need.
        </p>
        <p>
          For cookies and local storage, see the{' '}
          <Link href="/legal/cookies" className="font-extrabold text-link hover:underline">
            cookie notice
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="contact">
        <p>
          Questions about privacy can go to the same address:{' '}
          <a href={`mailto:${contactEmail}`} className="font-extrabold text-link hover:underline">
            {contactEmail}
          </a>
          .
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

import { LegalNotice } from '@/components/marketing/legal-notice';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail } from '@/lib/site';

export const metadata = marketingMetadata({
  title: 'terms of service',
  description: 'The plain-language summary of the terms for using bagg.',
  path: '/legal/terms',
  noIndex: true,
});

export default function TermsPage() {
  return (
    <article>
      <h1 className="text-display text-ink">terms of service.</h1>
      <p className="mt-4 text-body-l text-ink-soft">
        These are the rules for using bagg. We have written them plainly while the full legal
        agreement is being prepared.
      </p>
      <div className="mt-6">
        <LegalNotice />
      </div>

      <LegalSection title="using bagg">
        <p>
          bagg is a workspace for creating invoices, quotes, payment records and receipts. You can
          use it for your own business or the business you are authorised to represent.
        </p>
        <p>
          bagg is not a bank, a payment processor or a tax adviser. We do not hold your client’s
          money and we do not decide how much tax you owe.
        </p>
      </LegalSection>

      <LegalSection title="your account">
        <p>
          You need a working email address to sign in. Keep access to that email secure. You are
          responsible for the activity in your workspace and for the accuracy of the details you add
          to an invoice or quote.
        </p>
        <p>
          Do not use bagg to impersonate someone else, send fraudulent documents or break the law.
          We may suspend an account if we believe it is being used to harm someone.
        </p>
      </LegalSection>

      <LegalSection title="invoices and payments">
        <p>
          You decide what to charge, which currency to use and which payment details to share. Your
          client pays you directly using those details, unless an integrated payment option is
          explicitly enabled for that invoice.
        </p>
        <p>
          A client marking an invoice as paid is a claim, not proof. You should confirm the payment
          in your own account before relying on it. Automated payments are confirmed by the payment
          provider’s signed notification.
        </p>
      </LegalSection>

      <LegalSection title="your content">
        <p>
          You keep ownership of the business details, client information, line items and files you
          add to bagg. You give us permission to store and process that content so we can provide
          the service.
        </p>
        <p>
          Do not upload content you do not have the right to use. We may remove content that
          violates someone else’s rights or the law.
        </p>
      </LegalSection>

      <LegalSection title="availability and changes">
        <p>
          We work to keep bagg available, but we cannot promise uninterrupted access. We may change
          or remove features as the product develops. If a change affects a paid feature or a
          payment you have already made, we will explain it clearly.
        </p>
      </LegalSection>

      <LegalSection title="ending use">
        <p>
          You can stop using bagg at any time. We may suspend or close an account for misuse, for
          security reasons or where the law requires it. Before closing an account, we will try to
          give you a way to retrieve the records you need.
        </p>
      </LegalSection>

      <LegalSection title="questions">
        <p>
          If something here is unclear, email{' '}
          <a href={`mailto:${contactEmail}`} className="font-extrabold text-link hover:underline">
            {contactEmail}
          </a>
          . The final agreement will replace this summary when it is ready.
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

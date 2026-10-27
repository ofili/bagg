import Link from 'next/link';
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { ContactForm } from '@/components/marketing/contact-form';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail, securityEmail } from '@/lib/site';

export const metadata = marketingMetadata({
  title: 'contact',
  description: 'Contact bagg about your account, an invoice, a payment or a security concern.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        kicker="talk to a person"
        title="tell us what’s going on."
        copy="A bug, a payment question, a security concern or something that just felt wrong. Send us the details and the link if there is one."
      />

      <section className="bg-canvas">
        <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="rounded-card border border-line-subtle bg-surface p-5 sm:p-8">
            <h2 className="text-title text-ink">send a message</h2>
            <p className="mt-2 text-body text-ink-soft">
              This form opens your email app with the details filled in. You can edit it there
              before you send.
            </p>
            <div className="mt-7">
              <ContactForm />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-card border border-line-subtle bg-surface p-5">
              <div className="flex items-center gap-2 text-heading text-ink">
                <Mail className="h-5 w-5" aria-hidden="true" />
                support
              </div>
              <p className="mt-2 text-body text-ink-soft">
                Account, invoice, quote, payment and reminder questions.
              </p>
              <a
                href={`mailto:${contactEmail}`}
                className="mt-3 inline-flex min-h-11 items-center text-body font-extrabold text-link hover:underline"
              >
                {contactEmail}
              </a>
            </div>

            <div className="rounded-card border border-line-subtle bg-surface p-5">
              <div className="flex items-center gap-2 text-heading text-ink">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                security
              </div>
              <p className="mt-2 text-body text-ink-soft">
                A suspicious invoice, a link that is not yours or a vulnerability report.
              </p>
              <a
                href={`mailto:${securityEmail}`}
                className="mt-3 inline-flex min-h-11 items-center text-body font-extrabold text-link hover:underline"
              >
                {securityEmail}
              </a>
            </div>

            <div className="rounded-card border border-line-subtle bg-peach p-5">
              <h2 className="text-heading text-ink">before you write</h2>
              <ul className="mt-3 space-y-2 text-body text-ink-soft">
                <li>Check the help centre for the quick answer.</li>
                <li>Include the invoice or quote link if your question is about a document.</li>
                <li>Do not send passwords, card numbers or one-time codes.</li>
              </ul>
              <Link
                href="/help"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
              >
                Visit the help centre <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

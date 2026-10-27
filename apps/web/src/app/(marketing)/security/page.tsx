import Link from 'next/link';
import {
  ArrowRight,
  CircleCheck,
  CreditCard,
  Flag,
  KeyRound,
  Link2,
  Lock,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { SectionHeading } from '@/components/marketing/section-heading';
import { buttonStyles } from '@/components/ui/button';
import { marketingMetadata } from '@/lib/metadata';
import { securityEmail } from '@/lib/site';

export const metadata = marketingMetadata({
  title: 'security',
  description:
    'What bagg does today to protect your account, your share links and your payment details.',
  path: '/security',
});

export default function SecurityPage() {
  return (
    <>
      <PageHero
        kicker="trust, in plain words"
        title="your money details are not content."
        copy="Security pages are easy to fill with big claims. We would rather tell you what bagg does today, and what we will only say when it is true."
      >
        <Link href="/help" className={buttonStyles({ variant: 'outline', size: 'lg' })}>
          Read the help centre <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </PageHero>

      <section className="bg-canvas">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            title="what is true today."
            copy="These are the safeguards built into the product now. No asterisks."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <SecurityFact
              icon={<KeyRound className="h-5 w-5" />}
              title="no password to lose"
              copy="You sign in with a one-time code sent to your email. The code expires after ten minutes, and there is no password to reuse or reset."
            />
            <SecurityFact
              icon={<Link2 className="h-5 w-5" />}
              title="links are made to be shared, not guessed"
              copy="Share links use long random tokens. Treat the link like the invoice itself: send it to your client, not to a public group."
            />
            <SecurityFact
              icon={<CreditCard className="h-5 w-5" />}
              title="card details stay with the payment processor"
              copy="When card payment is enabled, the card details are entered on our payment partner’s checkout. bagg does not store your card number."
            />
            <SecurityFact
              icon={<CircleCheck className="h-5 w-5" />}
              title="you decide when a manual claim is paid"
              copy="A client can say they have paid, but the invoice only moves to paid when you confirm the claim or the payment gateway confirms the money."
            />
            <SecurityFact
              icon={<Lock className="h-5 w-5" />}
              title="automated payments wait for the gateway"
              copy="A browser redirect is not proof of settlement. Automated payments are confirmed by the signed gateway webhook, not just by a success screen."
            />
            <SecurityFact
              icon={<Flag className="h-5 w-5" />}
              title="a suspicious invoice can be reported"
              copy="Every client invoice has a report-abuse action. If something looks wrong, report it and verify the request with the business directly before sending money."
            />
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-surface">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <SectionHeading
                title="what we are not claiming yet."
                copy="The product is still growing. These safeguards are on the list, but they are not live claims."
              />
              <div className="mt-6 flex items-start gap-3 rounded-card border border-line bg-peach p-4">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
                <p className="text-body text-ink-soft">
                  We will add each one here when it is built and tested. Until then, do not treat
                  this page as a promise that it already exists.
                </p>
              </div>
            </div>

            <div className="rounded-card border border-line-subtle bg-canvas p-6">
              <h3 className="text-heading text-ink">on the road to launch</h3>
              <ul className="mt-4 space-y-3">
                {[
                  'Encryption at rest for stored business and payment details',
                  'Account-name checks before a payment is sent',
                  'Alerts when sensitive account details change',
                  'Independent security certifications and audits',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-body text-ink-soft">
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-line" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-canvas">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-8 rounded-card border border-line-subtle bg-surface p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-heading text-ink">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                found something that does not look right?
              </div>
              <p className="mt-2 max-w-2xl text-body-l text-ink-soft">
                Send us the invoice link and what looked wrong. For a suspicious payment request,
                do not send money until you have checked with the business directly.
              </p>
            </div>
            <a
              href={`mailto:${securityEmail}`}
              className={buttonStyles({ variant: 'outline', size: 'lg', className: 'shrink-0' })}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {securityEmail}
            </a>
          </div>
        </Container>
      </section>

      <CtaBand
        title="keep the money conversation calm."
        copy="Start free and see how bagg handles the invoice, the share link and the record."
        href="/signup"
        label="Start free"
      />
    </>
  );
}

function SecurityFact({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-card border border-line-subtle bg-surface p-5 sm:p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-chip text-ink">
        {icon}
      </span>
      <h3 className="mt-4 text-heading text-ink">{title}</h3>
      <p className="mt-1 text-body text-ink-soft">{copy}</p>
    </div>
  );
}

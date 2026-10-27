import Link from 'next/link';
import { ArrowRight, Check, CircleCheck, FileText, ShieldCheck, Users } from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { SectionHeading } from '@/components/marketing/section-heading';
import { buttonStyles } from '@/components/ui/button';
import { marketingMetadata } from '@/lib/metadata';

export const metadata = marketingMetadata({
  title: 'about',
  description:
    'bagg is an invoicing and get-paid workspace for African freelancers and creators. Calm around money, warm around the edges.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <PageHero
        kicker="about bagg"
        title="a calmer way to get paid."
        copy="bagg is an invoicing and get-paid workspace for African freelancers and creators. We make the admin around money feel lighter without making the money itself feel loose."
      >
        <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
          Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </PageHero>

      <section className="bg-canvas">
        <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <SectionHeading title="the work is already enough." />
          </div>
          <div className="max-w-2xl space-y-5 text-body-l text-ink-soft">
            <p>
              Independent work asks you to be the maker, the salesperson, the project manager and
              the finance team. The invoice is usually the last thing you want to think about after
              you have already done the hard part.
            </p>
            <p>
              bagg exists to make that last part feel smaller. A clear invoice. One link. A reminder
              that does not sound like a debt collector. A receipt when the money lands.
            </p>
            <p>
              We are starting with African freelancers and creators because the tools we used
              before were often built somewhere else, for someone else’s currency, bank and client
              habits.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-surface">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            title="what we keep coming back to."
            copy="A few rules that shape the product, the copy and the way we handle money."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Principle
              icon={<FileText className="h-5 w-5" />}
              title="money first, joy around."
              copy="The amount, the fee and the next step stay plain. The colour and the small jokes live around the edges."
            />
            <Principle
              icon={<Users className="h-5 w-5" />}
              title="clients never need an account."
              copy="Your client should be able to open a link, understand what to pay and pay it. That is the whole job."
            />
            <Principle
              icon={<CircleCheck className="h-5 w-5" />}
              title="status is a word, not just a colour."
              copy="Sent, viewed, claimed, part paid, paid. You should never have to guess what a colour means."
            />
            <Principle
              icon={<ShieldCheck className="h-5 w-5" />}
              title="never claim what is not built."
              copy="If a feature is coming, we say so. If a security safeguard is not live, we do not put it on a badge."
            />
          </div>
        </Container>
      </section>

      <section className="bg-canvas">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <SectionHeading title="what you won’t find here." />
            <ul className="max-w-2xl space-y-3">
              {[
                'Borrowed logos or invented customer stories',
                'A price hidden until after you have committed',
                'A security badge for something we have not built',
                'A reminder that bullies your client',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-body-l text-ink-soft">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-peach">
        <Container className="py-14 sm:py-16">
          <div className="max-w-3xl">
            <h2 className="text-title-l text-ink">built for the way independent work happens.</h2>
            <p className="mt-2 text-body-l text-ink-soft">
              A message here, a due date there, a client in another currency and a receipt that
              needs to exist before the month closes. bagg is designed for that reality.
            </p>
            <Link
              href="/features"
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
            >
              See the features <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <CtaBand
        title="start with the next invoice."
        copy="Make it, send it and keep the follow-up in one calm place."
        href="/signup"
        label="Start free"
      />
    </>
  );
}

function Principle({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-card border border-line-subtle bg-canvas p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-chip text-ink">
        {icon}
      </span>
      <h3 className="mt-4 text-heading text-ink">{title}</h3>
      <p className="mt-1 text-body text-ink-soft">{copy}</p>
    </div>
  );
}

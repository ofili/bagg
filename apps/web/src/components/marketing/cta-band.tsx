
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { buttonStyles } from '@/components/ui/button';

export function CtaBand({
                            title,
                            copy,
                            href,
                            label,
                        }: {
    title: string;
    copy: string;
    href: string;
    label: string;
}) {
    return (
        <section className="py-12 sm:py-16 lg:py-20">
            <Container>
                <div className="overflow-hidden border-brut border-ink bg-mango p-6 text-on-mango shadow-brut sm:p-10 lg:p-12">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-xl">
                            <h2 className="text-title-l font-extrabold tracking-tight sm:text-[2rem] sm:leading-tight">
                                {title}
                            </h2>
                            <p className="mt-3 max-w-lg text-body-l leading-relaxed text-on-mango/80">
                                {copy}
                            </p>
                        </div>

                        <Link
                            href={href}
                            className={`${buttonStyles({
                                variant: 'ink',
                                size: 'lg',
                            })} shrink-0`}
                        >
                            {label}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </Container>
        </section>
    );
}

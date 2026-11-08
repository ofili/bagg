'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface FlowShellProps {
    /** Text displayed in the top navigation bar. */
    title: string;

    /** Destination when the user closes the flow. */
    closeHref: string;

    /** Ordered labels identifying each step. */
    steps: readonly string[];

    /** Zero-based index of the current step. */
    currentStep: number;

    /** Main heading for the current step. */
    heading: string;

    /** Optional supporting description beneath the heading. */
    description?: string;

    /** Optional validation or API error. */
    error?: string | null;

    /** Called when the user dismisses an error. */
    onDismissError?: () => void;

    /** Current step content. */
    children: ReactNode;

    /** Persistent bottom actions. */
    footer?: ReactNode;

    /** Optional content between the heading and step content. */
    headerContent?: ReactNode;

    /** Optional additional class names for the content container. */
    contentClassName?: string;

    /** Optional additional class names for the outer container. */
    className?: string;
}

export function FlowShell({
                              title,
                              closeHref,
                              steps,
                              currentStep,
                              heading,
                              description,
                              error,
                              onDismissError,
                              children,
                              footer,
                              headerContent,
                              contentClassName,
                              className,
                          }: FlowShellProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);

    const totalSteps = steps.length;

    const safeStep = Math.min(
        Math.max(currentStep, 0),
        Math.max(totalSteps - 1, 0),
    );

    useEffect(() => {
        headingRef.current?.focus();
    }, [safeStep]);

    return (
        <div
            className={cn(
                'relative min-h-[100dvh] bg-surface',
                className,
            )}
        >
            <div
                className={cn(
                    'mx-auto w-full max-w-xl space-y-5 px-4 pt-4',
                    footer ? 'pb-52' : 'pb-8',
                )}
            >
                {/* Navigation and progress */}
                <header className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href={closeHref}
                            aria-label={`Close and return to ${title}`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink bg-surface"
                        >
                            <X
                                aria-hidden="true"
                                className="h-5 w-5"
                            />
                        </Link>

                        <p className="flex-1 text-body-l font-extrabold">
                            {title}
                        </p>

                        <p className="text-caption text-text-soft">
                            {safeStep + 1} of {totalSteps}
                        </p>
                    </div>

                    <div
                        role="progressbar"
                        aria-label={`${title} progress`}
                        aria-valuemin={1}
                        aria-valuemax={totalSteps}
                        aria-valuenow={safeStep + 1}
                        className="flex gap-1.5"
                    >
                        {steps.map((step, index) => (
                            <span
                                key={`${step}-${index}`}
                                aria-hidden="true"
                                className={cn(
                                    'h-1.5 flex-1 rounded-full border border-ink',
                                    index <= safeStep
                                        ? 'bg-mango'
                                        : 'bg-surface-tint',
                                )}
                            />
                        ))}
                    </div>
                </header>

                {/* Step heading */}
                <section className="space-y-2">
                    <h1
                        ref={headingRef}
                        tabIndex={-1}
                        className="text-title-l outline-none"
                    >
                        {heading}
                    </h1>

                    {description && (
                        <p className="text-body text-text-soft">
                            {description}
                        </p>
                    )}
                </section>

                {headerContent}

                {/* Error feedback */}
                {error && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="flex items-start justify-between gap-2 rounded-row bg-[#FFB3B3] p-3 text-body text-[#5A1010]"
                    >
                        <span className="min-w-0 flex-1 pt-2">
                            {error}
                        </span>

                        {onDismissError && (
                            <button
                                type="button"
                                aria-label="Dismiss message"
                                onClick={onDismissError}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn"
                            >
                                <X
                                    aria-hidden="true"
                                    className="h-5 w-5"
                                />
                            </button>
                        )}
                    </div>
                )}

                {/* Current step */}
                <main className={cn('min-w-0', contentClassName)}>
                    {children}
                </main>
            </div>

            {/* Persistent action area */}
            {footer && (
                <footer
                    className={cn(
                        'safe-bottom fixed inset-x-0 bottom-0 z-40',
                        'border-t-brut border-ink bg-surface',
                        'px-4 pt-3',
                    )}
                >
                    <div className="mx-auto w-full max-w-xl">
                        {footer}
                    </div>
                </footer>
            )}
        </div>
    );
}

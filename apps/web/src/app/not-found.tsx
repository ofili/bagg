import Link from 'next/link';
import { BagCharacter, Wordmark } from '@/components/brand';
import { buttonStyles } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-[75rem] items-center px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" aria-label="bagg home" className="inline-flex min-h-11 items-center">
          <Wordmark />
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
        <BagCharacter mood="sleepy" size={96} />
        <p className="mt-2 text-heading text-link">404</p>
        <h1 className="mt-1 text-title-l text-ink">this page took the day off</h1>
        <p className="mt-2 max-w-sm text-body text-ink-soft">
          The link may be old or mistyped. Your invoices are safe.
        </p>
        <Link href="/" className={`${buttonStyles()} mt-6`}>
  Take me home
</Link>
      </div>
    </main>
  );
}

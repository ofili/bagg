export const fieldLabelClassName = 'text-label font-bold text-text-soft';

export const fieldClassName = [
    'mt-1.5 min-h-12 w-full rounded-input border border-line',
    'bg-surface px-3 py-2.5 text-body text-text',
    'outline-none transition-colors',
    'placeholder:text-text-muted',
    'focus:border-ink focus:ring-2 focus:ring-ink/20',
    'disabled:cursor-not-allowed disabled:opacity-60',
    'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20',
].join(' ');
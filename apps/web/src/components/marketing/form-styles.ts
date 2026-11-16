export const fieldLabelClassName = 'text-label font-bold text-text-soft';

export const fieldClassName = [
    'mt-1.5 min-h-12 w-full rounded-input border-brut-thin border-ink',
    'bg-surface px-3 py-2.5 text-body text-text',
    'outline-none transition-colors',
    'placeholder:text-text-muted',
    'focus:outline-2 focus:outline-offset-2 focus:outline-ink',
    'disabled:cursor-not-allowed disabled:opacity-60',
    'aria-[invalid=true]:border-danger aria-[invalid=true]:outline-danger',
].join(' ');
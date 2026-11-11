
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant =
  | 'primary'
  | 'accent'
  | 'outline'
  | 'link'
  | 'danger'
  | 'ghost';

export type ButtonSize = 'md' | 'lg';

/**
 * expressive: 2px ink outline + hard shadow.
 * calm: thin ink outline, no shadow.
 */
export type Zone = 'expressive' | 'calm';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  zone?: Zone;
  fullWidth?: boolean;
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  zone = 'expressive',
  fullWidth = false,
}: ButtonStyleOptions = {}) {
  if (variant === 'link') {
    return cn(
      'inline-flex min-h-11 items-center justify-center gap-1 px-1 text-body font-extrabold',
      'text-link underline underline-offset-4 hover:no-underline',
      'disabled:pointer-events-none disabled:opacity-40',
      fullWidth && 'w-full',
    );
  }

  const colour: Record<Exclude<ButtonVariant, 'link'>, string> = {
    primary: 'bg-mango text-on-mango',
    accent: 'bg-pink text-on-pink',
    outline: 'bg-surface text-text',
    danger: 'bg-danger text-white',
    ghost: 'border-transparent bg-transparent text-text shadow-none hover:bg-surface-tint',
  };

  const isGhost = variant === 'ghost';

  return cn(
    'relative inline-flex items-center justify-center gap-2 rounded-btn px-5',
    'font-extrabold whitespace-nowrap select-none',
    size === 'lg' ? 'min-h-12 text-body-l' : 'min-h-11 text-body',
    colour[variant],
    !isGhost &&
      (zone === 'expressive'
        ? 'border-brut border-ink shadow-brut transition-[transform,box-shadow] duration-75 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
        : 'border-brut-thin border-ink'),
    isGhost && 'transition-colors duration-100',
    'disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none',
    fullWidth && 'w-full',
  );
}

/** Use on <Link> or <a> so links and buttons look identical. */
export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleOptions {
  /** Keeps the button's width, hides the label and shows a spinner. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant,
      size,
      zone,
      fullWidth,
      loading = false,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          buttonStyles({ variant, size, zone, fullWidth }),
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-flex items-center gap-2',
            loading && 'opacity-0',
          )}
        >
          {children}
        </span>

        {loading && (
          <Loader2
            aria-hidden
            className="absolute h-4 w-4 animate-spin"
          />
        )}
      </button>
    );
  },
);

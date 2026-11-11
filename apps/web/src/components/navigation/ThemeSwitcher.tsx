'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from '@phosphor-icons/react';

import { useTheme, type ThemePreference } from '@/components/theme/theme-provider';
import { cn } from '@/lib/cn';

const OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  Icon: typeof SunIcon;
}[] = [
  {
    value: 'system',
    label: 'System',
    description: 'Follow device settings',
    Icon: MonitorIcon,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Use the light appearance',
    Icon: SunIcon,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Use the dark appearance',
    Icon: MoonIcon,
  },
];

export function ThemeSwitcher() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (
        wrap.current &&
        !wrap.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const ActiveIcon =
    resolvedTheme === 'dark' ? MoonIcon : SunIcon;

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={`Appearance: ${preference}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Appearance: ${preference}`}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center',
          'rounded-btn border-brut-thin border-transparent',
          'text-ink transition-colors',
          'hover:border-ink hover:bg-surface-tint',
          'focus-visible:outline-none',
        )}
      >
        <ActiveIcon
          aria-hidden
          weight="bold"
          className="h-5 w-5"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Appearance preference"
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-64',
            'rounded-card border-brut border-ink',
            'bg-surface p-2 shadow-brut-sm',
          )}
        >
          <div className="px-3 pb-2 pt-1">
            <p className="text-body font-extrabold text-ink">
              Appearance
            </p>
            <p className="text-caption text-text-muted">
              Choose how Bagg looks.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            {OPTIONS.map(({ value, label, description, Icon }) => {
              const selected = preference === value;

              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    setPreference(value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3',
                    'rounded-row px-3 py-2 text-left',
                    'transition-colors',
                    selected
                      ? 'bg-peach text-ink'
                      : 'text-text hover:bg-surface-tint',
                  )}
                >
                  <Icon
                    aria-hidden
                    weight="bold"
                    className="h-5 w-5 shrink-0"
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-bold">
                      {label}
                    </span>
                    <span className="block text-caption text-text-muted">
                      {description}
                    </span>
                  </span>

                  {selected && (
                    <CheckIcon
                      aria-hidden
                      weight="bold"
                      className="h-4 w-4 shrink-0 text-link"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

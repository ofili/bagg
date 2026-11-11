'use client';

import {
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';

import {
  ThemePreference,
  useTheme,
} from './theme-provider';

const OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  Icon: typeof Monitor;
}[] = [
  {
    value: 'system',
    label: 'System',
    description: 'Follow your device settings',
    Icon: Monitor,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Always use light mode',
    Icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Always use dark mode',
    Icon: Moon,
  },
];

export function ThemePreferenceSection() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  return (
    <section
      aria-labelledby="appearance-heading"
      className="rounded-card border border-line-subtle bg-surface p-5"
    >
      <div className="border-b border-line-subtle pb-4">
        <h2
          id="appearance-heading"
          className="text-heading text-ink"
        >
          Appearance
        </h2>

        <p className="mt-1 text-caption text-text-muted">
          Choose how Bagg looks on this device.
        </p>
      </div>

      <fieldset className="pt-4">
        <legend className="mb-3 text-label font-bold text-ink">
          Theme
        </legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OPTIONS.map(({ value, label, description, Icon }) => {
            const selected = preference === value;

            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setPreference(value)}
                className={[
                  'flex min-h-20 items-center gap-3 rounded-btn',
                  'border-brut-thin p-3 text-left transition-colors',
                  'focus-visible:outline-none',
                  selected
                    ? 'border-ink bg-peach shadow-brut-sm'
                    : 'border-line bg-surface hover:bg-surface-tint',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center',
                    'rounded-full',
                    selected
                      ? 'bg-mango text-on-mango'
                      : 'bg-surface-tint text-text-soft',
                  ].join(' ')}
                >
                  <Icon
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </span>

                <span className="min-w-0">
                  <span className="block text-body font-extrabold text-ink">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-caption text-text-muted">
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <p
        className="mt-4 text-caption text-text-muted"
        aria-live="polite"
      >
        {preference === 'system'
          ? `Following your device preference. Currently using ${resolvedTheme} mode.`
          : `Your preference is saved. Bagg is using ${resolvedTheme} mode.`}
      </p>
    </section>
  );
}

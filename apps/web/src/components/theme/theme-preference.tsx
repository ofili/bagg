'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { FormSection, RadioGroup } from '@/components/ui';

import { ThemePreference, useTheme } from './theme-provider';

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
    <FormSection
      id="appearance"
      title="Appearance"
      description="Choose how Bagg looks on this device."
      className="scroll-mt-24"
    >
      <RadioGroup
        label="Theme"
        value={preference}
        onChange={(value) => setPreference(value as ThemePreference)}
        variant="cards"
        columns={3}
        options={OPTIONS.map(({ value, label, description, Icon }) => ({
          value,
          label,
          description,
          icon: <Icon className="h-5 w-5" aria-hidden="true" />,
        }))}
      />

      <p className="text-caption text-text-muted" aria-live="polite">
        {preference === 'system'
          ? `Following your device preference. Currently using ${resolvedTheme} mode.`
          : `Your preference is saved. Bagg is using ${resolvedTheme} mode.`}
      </p>
    </FormSection>
  );
}

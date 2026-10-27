import type { Config } from 'tailwindcss';

/**
 * Bagg design tokens (neo-brutalist, see docs/adr/0002-neo-brutalist-ui.md).
 * Values live in CSS variables (globals.css) so light and dark mode share one config.
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Brand
        mango: 'var(--bagg-mango)',
        pink: 'var(--bagg-pink)',
        sun: 'var(--bagg-sun)',
        leaf: 'var(--bagg-leaf)',
        danger: 'var(--bagg-danger)',
        // Ink: outlines, hard shadows and the darkest text
        ink: 'var(--ink)',
        'on-mango': 'var(--on-mango)',
        'on-pink': 'var(--on-pink)',
        // Neutrals
        cream: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-sunken': 'var(--surface-sunken)',
        'surface-tint': 'var(--surface-tint)',
        line: 'var(--border)',
        'line-subtle': 'var(--border-subtle)',
        peach: 'var(--peach)',
        'peach-chip': 'var(--peach-chip)',
        // Text
        text: 'var(--text)',
        'text-soft': 'var(--text-soft)',
        'text-muted': 'var(--text-muted)',
        link: 'var(--link)',
      },
      borderRadius: {
        btn: '10px',
        card: '12px',
        row: '8px',
        input: '8px',
        small: '6px',
        sheet: '16px',
      },
      borderWidth: {
        brut: '2px',
        'brut-thin': '1.5px',
      },
      boxShadow: {
        // Hard offset shadows: no blur, ever.
        'brut-sm': '2px 2px 0 0 var(--brut-shadow)',
        brut: '3px 3px 0 0 var(--brut-shadow)',
        'brut-lg': '5px 5px 0 0 var(--brut-shadow)',
        sheet: '0 -8px 24px rgba(58, 31, 10, 0.12)',
      },
      fontFamily: {
        sans: [
          'var(--font-bricolage)',
          '"Plus Jakarta Sans"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        caption: ['12px', { lineHeight: '16px' }],
        body: ['14px', { lineHeight: '20px' }],
        'body-l': ['16px', { lineHeight: '24px' }],
        heading: ['18px', { lineHeight: '22px', fontWeight: '800' }],
        title: ['22px', { lineHeight: '26px', fontWeight: '800' }],
        'title-l': ['28px', { lineHeight: '30px', fontWeight: '800' }],
        display: ['40px', { lineHeight: '40px', fontWeight: '800' }],
        'amount-s': ['16px', { lineHeight: '20px', fontWeight: '800' }],
        'amount-m': ['20px', { lineHeight: '24px', fontWeight: '800' }],
        'amount-l': ['28px', { lineHeight: '32px', fontWeight: '800' }],
        'amount-xl': ['40px', { lineHeight: '44px', fontWeight: '800' }],
      },
    },
  },
  plugins: [],
};

export default config;

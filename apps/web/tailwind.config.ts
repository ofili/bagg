
import type { Config } from 'tailwindcss';

/**
 * Bagg design tokens.
 *
 * CSS variables are the source of truth for theme-dependent values
 * and shared visual primitives. Tailwind exposes semantic utilities.
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

        // Text on brand surfaces
        ink: 'var(--ink)',
        'on-mango': 'var(--on-mango)',
        'on-pink': 'var(--on-pink)',
        'on-sun': 'var(--on-sun)',

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

        // Semantic statuses
        'status-paid': 'var(--status-paid-bg)',
        'status-paid-fg': 'var(--status-paid-fg)',
        'status-due': 'var(--status-due-bg)',
        'status-due-fg': 'var(--status-due-fg)',
        'status-late': 'var(--status-late-bg)',
        'status-late-fg': 'var(--status-late-fg)',
        'status-draft': 'var(--status-draft-bg)',
        'status-draft-fg': 'var(--status-draft-fg)',
        'status-pending': 'var(--status-pending-bg)',
        'status-pending-fg': 'var(--status-pending-fg)',
        'status-void': 'var(--status-void-bg)',
        'status-void-fg': 'var(--status-void-fg)',
      },

      borderRadius: {
        btn: 'var(--radius-btn)',
        card: 'var(--radius-card)',
        row: 'var(--radius-row)',
        input: 'var(--radius-input)',
        small: 'var(--radius-small)',
        sheet: 'var(--radius-sheet)',
      },

      borderWidth: {
        brut: 'var(--border-width-brut)',
        'brut-thin': 'var(--border-width-brut-thin)',
      },

      boxShadow: {
        'brut-sm': '2px 2px 0 0 var(--brut-shadow)',
        brut: '3px 3px 0 0 var(--brut-shadow)',
        'brut-lg': '5px 5px 0 0 var(--brut-shadow)',
        sheet: 'var(--shadow-sheet)',
        menu: 'var(--shadow-menu)',
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
        display: ['40px', { lineHeight: '40px', fontWeight: '800' }],
        'title-l': ['28px', { lineHeight: '30px', fontWeight: '800' }],
        title: ['22px', { lineHeight: '26px', fontWeight: '800' }],
        heading: ['18px', { lineHeight: '22px', fontWeight: '800' }],
        'body-l': ['16px', { lineHeight: '24px' }],
        body: ['14px', { lineHeight: '20px' }],
        label: ['14px', { lineHeight: '18px', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '16px' }],
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

import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Class-based dark mode: we never add `dark` on `<html>`, so the UI stays
  // light regardless of OS preference (challenge brief: readable first-run).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /** Royal blue — primary CTAs, links, highlights (OPENLANE marketing site). */
        accent: {
          DEFAULT: '#0057ff',
          fg: '#ffffff',
          muted: '#e8f1ff',
          strong: '#0046cc',
        },
        /** Deep navy — headlines, logo, footer (OPENLANE marketing site). */
        brand: {
          navy: '#0c2340',
          footer: '#081a2e',
        },
        /** Cool neutrals — white cards on light gray fields. */
        surface: {
          DEFAULT: '#f4f7fb',
          card: '#ffffff',
          inset: '#eef2f7',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        market: '0 2px 10px rgba(12, 35, 64, 0.07), 0 1px 2px rgba(12, 35, 64, 0.05)',
        dock: '0 -10px 40px rgba(12, 35, 64, 0.1)',
      },
      animation: {
        flash: 'flash 600ms ease-out',
      },
      keyframes: {
        flash: {
          '0%': { backgroundColor: 'rgba(0, 87, 255, 0.18)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

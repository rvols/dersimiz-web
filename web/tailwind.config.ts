import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1E3A8A',
        },
        neutral: {
          white: '#FFFFFF',
          mist: '#F1F5F9',
          carbon: '#0F172A',
          slate: '#64748B',
          outline: '#E2E8F0',
        },
        student: {
          orange: '#F97316',
          lime: '#84CC16',
          coral: '#EF4444',
        },
        tutor: {
          teal: '#0D9488',
          gold: '#F59E0B',
          indigo: '#4F46E5',
        },
      },
      fontFamily: {
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -1px rgba(37, 99, 235, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(37, 99, 235, 0.15)',
        button: '0 4px 12px rgba(37, 99, 235, 0.3)',
      },
      borderRadius: {
        card: '16px',
        button: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config;

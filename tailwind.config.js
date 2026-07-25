/** @type {import('tailwindcss').Config} */
import { colors } from './src/styles/tokens';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ...colors,
        // Tailwind 兼容别名
        'brand': colors.brand[500],
        'brand-50': colors.brand[50],
        'brand-100': colors.brand[100],
        'brand-500': colors.brand[500],
        'brand-600': colors.brand[600],
      },
      borderRadius: {
        pill: '9999px',
      },
      boxShadow: {
        card: '0 4px 16px rgba(15, 23, 42, 0.06)',
        pop: '0 8px 24px rgba(15, 23, 42, 0.12)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Source Han Sans CN"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
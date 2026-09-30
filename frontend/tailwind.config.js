/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Institutional navy — primary brand / chrome
        navy: {
          50: '#EEF3F8',
          100: '#D3E0EC',
          200: '#A7C1D9',
          300: '#7AA2C6',
          400: '#3E70A0',
          500: '#164A7A',
          600: '#10345C',
          700: '#0D2A4A',
          800: '#0A2039',
          900: '#071628',
        },
        // Deep teal — secondary accent, used for active/interactive states
        teal: {
          50: '#E8F5F2',
          100: '#C3E5DD',
          400: '#1E9A82',
          500: '#0F7B6C',
          600: '#0B5F53',
        },
        // Saffron — sparing highlight only (pending/attention), never as base
        saffron: {
          500: '#E8871E',
          600: '#C96F10',
        },
        // Status semantics
        pass: { 50: '#EAF7EE', 500: '#0F7B3F', 600: '#0C6432' },
        fail: { 50: '#FCEAEA', 500: '#B3261E', 600: '#8F1D17' },
        warn: { 50: '#FDF3E3', 500: '#B7791F', 600: '#96620F' },
        surface: '#F6F8FA',
        line: '#DCE3EA',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 52, 92, 0.06), 0 1px 3px rgba(16, 52, 92, 0.08)',
      },
    },
  },
  plugins: [],
};

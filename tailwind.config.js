/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#040812',
          900: '#080E1C',
          800: '#0D1526',
          700: '#111C30',
          600: '#162238',
          500: '#1C2A42',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        surface: '#0F172A',
        border: '#1E2D45',
        'border-light': '#253650',
      },
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(6,182,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.04) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(6,182,212,0.15), transparent)',
      },
      backgroundSize: {
        'grid': '48px 48px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(6,182,212,0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(6,182,212,0.6)' },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(6,182,212,0.25)',
        'glow-sm': '0 0 15px rgba(6,182,212,0.15)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'elevated': '0 8px 48px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};

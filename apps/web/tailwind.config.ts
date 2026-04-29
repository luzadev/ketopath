import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // tighter editorial display sizes
        display: ['clamp(2.75rem, 7vw, 5rem)', { lineHeight: '0.95', letterSpacing: '-0.025em' }],
        'display-lg': [
          'clamp(3.5rem, 10vw, 7.5rem)',
          { lineHeight: '0.92', letterSpacing: '-0.035em' },
        ],
      },
      colors: {
        carta: {
          DEFAULT: 'hsl(var(--carta))',
          light: 'hsl(var(--carta-light))',
          dim: 'hsl(var(--carta-dim))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          soft: 'hsl(var(--ink-soft))',
          dim: 'hsl(var(--ink-dim))',
        },
        oliva: 'hsl(var(--oliva))',
        pomodoro: 'hsl(var(--pomodoro))',
        oro: 'hsl(var(--oro))',
        rule: 'hsl(var(--rule))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 1px)',
        sm: '1px',
      },
      letterSpacing: {
        widest: '0.22em',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(0.75rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'rule-in': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 700ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'rule-in': 'rule-in 800ms cubic-bezier(0.7, 0, 0.3, 1) both',
      },
    },
  },
  plugins: [animate],
};

export default config;

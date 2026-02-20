/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './cli/**/*.{js,ts,jsx,tsx}',
    './vscode-extension/**/*.{js,ts,jsx,tsx}',
    './ide/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          glow: 'hsl(var(--primary-glow))',
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
        // Cognitive Execution Layer specific colors
        cel: {
          core: 'hsl(var(--cel-core))',
          neural: 'hsl(var(--cel-neural))',
          quantum: 'hsl(var(--cel-quantum))',
          matrix: 'hsl(var(--cel-matrix))',
        },
        // AI/ML specific colors
        ai: {
          primary: 'hsl(var(--ai-primary))',
          secondary: 'hsl(var(--ai-secondary))',
          accent: 'hsl(var(--ai-accent))',
          success: 'hsl(var(--ai-success))',
          warning: 'hsl(var(--ai-warning))',
          danger: 'hsl(var(--ai-danger))',
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
        heading: ['var(--font-cal-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px hsl(var(--primary-glow) / 0.3)',
        'glow-strong': '0 0 30px hsl(var(--primary-glow) / 0.5)',
        'glow-subtle': '0 0 10px hsl(var(--primary-glow) / 0.1)',
        'elevated': '0 10px 30px -10px rgba(0, 0, 0, 0.2)',
        'floating': '0 20px 50px -15px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-cel': 'linear-gradient(135deg, hsl(var(--cel-core)) 0%, hsl(var(--cel-neural)) 50%, hsl(var(--cel-quantum)) 100%)',
        'gradient-ai': 'linear-gradient(45deg, hsl(var(--ai-primary)) 0%, hsl(var(--ai-secondary)) 100%)',
        'gradient-matrix': 'linear-gradient(90deg, hsl(var(--cel-matrix)) 0%, transparent 50%, hsl(var(--cel-matrix)) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px hsl(var(--primary-glow) / 0.2)' },
          '100%': { boxShadow: '0 0 20px hsl(var(--primary-glow) / 0.6)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-smooth': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms',
      },
      gridTemplateColumns: {
        'auto-fit-minmax': 'repeat(auto-fit, minmax(300px, 1fr))',
        'auto-fill-minmax': 'repeat(auto-fill, minmax(250px, 1fr))',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
}
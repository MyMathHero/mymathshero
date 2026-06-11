/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{js,jsx}',
      './components/**/*.{js,jsx}',
      './app/**/*.{js,jsx}',
      './src/**/*.{js,jsx}',
    ],
    prefix: "",
    theme: {
        container: {
                center: true,
                padding: '2rem',
                screens: {
                        '2xl': '1400px'
                }
        },
        extend: {
                fontFamily: {
                        sans: ['DM Sans', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
                },
                colors: {
                        navy: '#1B2B4B',
                        electric: '#1B2B4B',
                        skyblue: '#DBEAFE',
                        success: '#16A34A',
                        warning: '#D97706',
                        offwhite: '#F8FAFC',
                        slate: '#1E293B',
                        gold: '#C49A1A',
                        'hero-dark': '#1B2B4B',
                        'hero-gold': '#C49A1A',
                        'hero-bg': '#F0F4F8',
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        primary: {
                                DEFAULT: '#1B2B4B',
                                foreground: '#FFFFFF'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        sidebar: {
                                DEFAULT: 'hsl(var(--sidebar-background))',
                                foreground: 'hsl(var(--sidebar-foreground))',
                                primary: 'hsl(var(--sidebar-primary))',
                                'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                                accent: 'hsl(var(--sidebar-accent))',
                                'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                                border: 'hsl(var(--sidebar-border))',
                                ring: 'hsl(var(--sidebar-ring))'
                        }
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                keyframes: {
                        'accordion-down': {
                                from: { height: '0' },
                                to: { height: 'var(--radix-accordion-content-height)' }
                        },
                        'accordion-up': {
                                from: { height: 'var(--radix-accordion-content-height)' },
                                to: { height: '0' }
                        },
                        'float': {
                                '0%, 100%': { transform: 'translateY(0px)' },
                                '50%': { transform: 'translateY(-20px)' }
                        },
                        'float-slow': {
                                '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                                '50%': { transform: 'translateY(-15px) rotate(3deg)' }
                        },
                        'float-delayed': {
                                '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                                '50%': { transform: 'translateY(-25px) rotate(-2deg)' }
                        },
                        'fade-in-up': {
                                '0%': { opacity: '0', transform: 'translateY(30px)' },
                                '100%': { opacity: '1', transform: 'translateY(0)' }
                        },
                        'fade-in': {
                                '0%': { opacity: '0' },
                                '100%': { opacity: '1' }
                        },
                        'slide-in-right': {
                                '0%': { opacity: '0', transform: 'translateX(30px)' },
                                '100%': { opacity: '1', transform: 'translateX(0)' }
                        },
                        'scale-in': {
                                '0%': { opacity: '0', transform: 'scale(0.9)' },
                                '100%': { opacity: '1', transform: 'scale(1)' }
                        },
                        'pulse-glow': {
                                '0%, 100%': { boxShadow: '0 0 20px rgba(37, 99, 235, 0.3)' },
                                '50%': { boxShadow: '0 0 40px rgba(37, 99, 235, 0.6)' }
                        },
                        'progress-fill': {
                                '0%': { width: '0%' },
                                '100%': { width: 'var(--progress-width)' }
                        },
                        'bounce-subtle': {
                                '0%, 100%': { transform: 'translateY(0)' },
                                '50%': { transform: 'translateY(-5px)' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'float': 'float 6s ease-in-out infinite',
                        'float-slow': 'float-slow 8s ease-in-out infinite',
                        'float-delayed': 'float-delayed 7s ease-in-out infinite 1s',
                        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
                        'fade-in': 'fade-in 0.5s ease-out forwards',
                        'slide-in-right': 'slide-in-right 0.5s ease-out forwards',
                        'scale-in': 'scale-in 0.4s ease-out forwards',
                        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                        'progress-fill': 'progress-fill 1.5s ease-out forwards',
                        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite'
                }
        }
    },
    plugins: [
      require("tailwindcss-animate"),
      // Custom `colorblind:` variant — active when <html> has the .colorblind
      // class (set by the theme system alongside data-theme="colorblind").
      // Lets us write e.g. `colorblind:bg-[#003366]` for the third theme.
      function ({ addVariant }) {
        addVariant('colorblind', '.colorblind &')
      },
    ],
  }

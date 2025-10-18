/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Galo "Precision in Motion" Brand Colors - Light Theme
        brand: {
          white: '#FFFFFF',         // Pure White - Primary background
          gold: '#F5C542',          // Electric Gold - Primary accent
          blue: '#3E6DF4',          // Ultramarine - Secondary accent
          black: '#0E0E0E',         // Deep Charcoal - Text & logo
          surface: '#FAFAFA',       // Off-white - Card backgrounds
          'gray-light': '#F5F5F5',  // Very light gray - Hover states
          'gray-medium': '#E5E5E5', // Light gray - Borders, dividers
          'gray-border': '#E0E0E0', // Border gray - Minimal borders
          'text-primary': '#0E0E0E',   // Dark text - Primary text
          'text-secondary': '#525252', // Medium gray - Secondary text
          'text-tertiary': '#A3A3A3',  // Light gray - Metadata
          success: '#10B981',       // Green - Positive feedback
          danger: '#EF4444',        // Red - Alerts, warnings
        },
      },
      fontFamily: {
        sans: ['Satoshi', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
      spacing: {
        '128': '32rem',
      },
      transitionDuration: {
        '200': '200ms',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-in',
        'slide-up': 'slideUp 300ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
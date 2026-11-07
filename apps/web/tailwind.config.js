/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0C342C',
          'primary-hover': '#076653',
          positive: '#52751D',
          ink: '#183B2D',
          body: '#29351C',
          muted: '#72816D',
          canvas: '#F2F6EB',
          surface: '#FAFCF5',
          soft: '#EDF5D8',
          accent: '#C5E814',
          'accent-soft': '#EDFA8C',
        },
        gray: {
          50: '#F2F6EB',
          100: '#EDF5D8',
          200: '#DDE7D2',
          300: '#D4E4CD',
          400: '#A8C3AF',
          500: '#72816D',
          600: '#52751D',
          700: '#29351C',
          800: '#183B2D',
          900: '#0C342C',
          950: '#06231D',
        },
        forest: {
          800: '#076653',
          900: '#0C342C',
          950: '#06231D',
        },
        bin: {
          yellow: '#CA8A04',
          green: '#15803D',
          blue: '#2563EB',
          red: '#DC2626',
        },
      },
      boxShadow: {
        'eco-sm': '0 2px 8px -1px rgba(12, 52, 44, 0.1)',
        eco: '0 8px 24px -4px rgba(12, 52, 44, 0.1)',
        'eco-lg': '0 16px 36px -6px rgba(12, 52, 44, 0.14)',
        'card-soft': '0 2px 8px rgba(12, 52, 44, 0.04)',
        'card-hover': '0 8px 20px rgba(12, 52, 44, 0.08)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fade-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

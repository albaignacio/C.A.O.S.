/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta celeste (color de acento). El blanco es el fondo predominante.
        celeste: {
          50: '#eff8fe',
          100: '#dcf0fd',
          200: '#c0e6fb',
          300: '#94d6f8',
          400: '#5eb3e4',
          500: '#4aa8e0',
          600: '#2f8fce',
          700: '#2775b0',
          800: '#265f8f',
          900: '#245175',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};

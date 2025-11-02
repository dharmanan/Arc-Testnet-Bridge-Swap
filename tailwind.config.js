export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        'arc-dark': {
          900: '#0D111C',
          800: '#161B22',
          700: '#21262D',
        },
        'arc-accent': {
          'primary': '#38BDF8',
          'secondary': '#F472B6',
        },
        'arc-text': {
          'primary': '#E6EDF3',
          'secondary': '#8B949E',
        },
      },
    },
  },
  plugins: [],
}

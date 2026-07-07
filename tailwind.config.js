/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        casino: {
          900: '#020617', 
          800: '#0f172a', 
          700: '#1e293b', 
          gold: '#a78bfa',
          red: '#fb7185', 
          green: '#34d399',
          accent: '#818cf8', 
        },
        navy: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        lavender: {
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'bounce-short': 'bounce 0.5s infinite',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eef5ff',
          100: '#dbe8fe',
          200: '#bfd7fe',
          300: '#93beec',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0B5ED7', // Deep Medical Blue — #0B5ED7
          700: '#094db2',
          800: '#084093',
          900: '#063172',
          950: '#041f48'
        },
        secondary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0F9D8A', // Healthcare Teal — #0F9D8A
          700: '#0d8070',
          800: '#0b6659',
          900: '#084c42'
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06B6D4', // Cyan — #06B6D4
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63'
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748B', // Slate Gray — #64748B
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a'
        },
        darknavy: {
          50: '#f0f3f8',
          100: '#d9e2ec',
          200: '#bccbdc',
          300: '#9fb3cc',
          400: '#627d98',
          500: '#486581',
          600: '#334e68',
          700: '#243b53',
          800: '#172B4D', // Dark Navy — #172B4D
          900: '#0f1d33',
          950: '#091220'
        },
        med: {
          blue: '#0B5ED7',
          teal: '#0F9D8A',
          cyan: '#06B6D4',
          bg: '#F5F9FF',
          card: '#FFFFFF',
          text: '#172B4D',
          muted: '#64748B',
          success: '#16A34A',
          warning: '#F59E0B',
          error: '#DC2626'
        }
      }
    },
  },
  plugins: [],
}


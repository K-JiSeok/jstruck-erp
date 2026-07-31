/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4fb',
          100: '#d9e6f5',
          200: '#b3cceb',
          300: '#82abdc',
          400: '#5486c9',
          500: '#33629f', // 메인 블루 - 신뢰감
          600: '#274d7f',
          700: '#1f3d66',
          800: '#1a3252',
          900: '#162a44',
          950: '#0d1a2b',
        },
        ink: {
          50: '#f6f7f8',
          100: '#eceef0',
          200: '#d5dade',
          300: '#b0b9c1',
          400: '#84909d',
          500: '#657282',
          600: '#505b6a',
          700: '#424a57',
          800: '#39404b',
          900: '#262b32',
        },
        plate: {
          green: '#1f6e43',
          yellow: '#c9962c',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(22, 42, 68, 0.08), 0 1px 2px -1px rgba(22, 42, 68, 0.08)',
      },
    },
  },
  plugins: [],
};

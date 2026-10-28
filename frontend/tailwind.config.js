/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '375px',
      },
      colors: {
        // Core deep forest pine green from reference photo ("Try TextBack" button & brand accent)
        emerald: {
          50: '#F2F7F4',   // Delicate warm sage-mint tint
          100: '#E1EDE6',  // Soft mint pill/badge background
          200: '#C3DCD0',  // Muted sage border
          300: '#9BC2AB',  // Interactive sage accent
          400: '#6B9E80',  // Mid sage
          500: '#2E754E',  // Forest tone
          600: '#1F5C3B',  // Rich pine green
          700: '#1A472F',  // Core dark forest brand
          800: '#17382B',  // TextBack primary CTA & message bubble ("Try TextBack")
          900: '#122C21',  // Deep forest text & accents
          950: '#0A1B14',  // Deepest pine black
        },
        brand: {
          50: '#F2F7F4',
          100: '#E1EDE6',
          200: '#C3DCD0',
          300: '#9BC2AB',
          400: '#6B9E80',
          500: '#2E754E',
          600: '#1F5C3B',
          700: '#1A472F',
          800: '#17382B',
          900: '#122C21',
          950: '#0A1B14',
        },
        // Warm organic linen canvas & editorial charcoal (Reference photo background & typography)
        slate: {
          50: '#FAF8F5',   // TextBack signature warm ecru / linen canvas background
          100: '#F3EFE8',  // Soft warm pill/input background & table sub-headers
          200: '#E5E0D5',  // Precise warm border
          300: '#D2CBBC',  // Interactive dividers & secondary borders
          400: '#9C9585',  // Soft placeholder & muted elements
          500: '#6B665A',  // Secondary labels & captions
          600: '#4B483E',  // Body text & icons
          700: '#31302A',  // Subheadings & emphasis
          800: '#1F201C',  // Deep hover states
          900: '#121411',  // TextBack primary rich forest charcoal text
          950: '#0A0C0A',
        },
        gray: {
          50: '#FDFCFA',
          100: '#FAF8F5',  // Clean warm app background
          200: '#E8E4DA',  // Soft container borders
          300: '#D6D0C2',
          400: '#9E9889',
          500: '#6C675B',
          600: '#4C483E',
          700: '#323029',
          800: '#1E1D19',
          900: '#12110E',
        },
        // Warm amber with TextBack electric chartreuse lime pop for icons & badges
        amber: {
          50: '#FEF9EE',   // Warm honey cream
          100: '#FCF0D3',
          200: '#F8E0A1',
          300: '#D4F933',  // Vibrant TextBack chartreuse / lime accent
          400: '#C4F22C',  // Electric lime highlight
          500: '#E6A216',  // Warm amber for pending states
          600: '#C4830B',
          700: '#9E6206',
          800: '#7D4A06',
          900: '#5F3507',
          950: '#3B1F03',
        },
        // Vibrant chartreuse / lime from TextBack logo & notification badges
        lime: {
          50: '#F9FEE6',
          100: '#F1FCC4',
          200: '#E4FA92',
          300: '#D4F933',  // TextBack signature electric chartreuse
          400: '#C4F22C',
          500: '#B4E319',
          600: '#8EB80E',
          700: '#6B8B0E',
          800: '#536B11',
          900: '#455813',
          950: '#232E05',
        },
        blue: {
          50: '#F1F7F6',
          100: '#DEEEEB',
          200: '#C0DED8',
          500: '#1E5C4E',
          800: '#17382B',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Inter"', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(23, 56, 43, 0.04)',
        'card': '0 1px 3px 0 rgba(23, 56, 43, 0.06), 0 1px 2px -1px rgba(23, 56, 43, 0.04)',
      }
    },
  },
  plugins: [],
}


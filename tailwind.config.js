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
          primary: {
            50: '#eff6ff',
            100: '#dbeafe',
            200: '#bfdbfe',
            300: '#93c5fd',
            400: '#60a5fa',
            500: '#3b82f6',
            600: '#2563eb',
            700: '#1d4ed8',
            800: '#1e40af',
            900: '#1e3a8a',
          },
          success: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
          warning: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
          },
          danger: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            800: '#991b1b',
            900: '#7f1d1d',
          },
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          serif: ['Georgia', 'serif'],
          mono: ['Fira Code', 'monospace'],
        },
        spacing: {
          '18': '4.5rem',
          '88': '22rem',
          '128': '32rem',
        },
        screens: {
          'xs': '475px',
          '3xl': '1920px',
        },
        animation: {
          'fade-in': 'fadeIn 0.5s ease-in-out',
          'slide-up': 'slideUp 0.3s ease-out',
          'slide-down': 'slideDown 0.3s ease-out',
          'scale-in': 'scaleIn 0.2s ease-out',
          'spin-slow': 'spin 3s linear infinite',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { 
              opacity: '0',
              transform: 'translateY(20px)'
            },
            '100%': { 
              opacity: '1',
              transform: 'translateY(0)'
            },
          },
          slideDown: {
            '0%': { 
              opacity: '0',
              transform: 'translateY(-20px)'
            },
            '100%': { 
              opacity: '1',
              transform: 'translateY(0)'
            },
          },
          scaleIn: {
            '0%': { 
              opacity: '0',
              transform: 'scale(0.9)'
            },
            '100%': { 
              opacity: '1',
              transform: 'scale(1)'
            },
          },
        },
        boxShadow: {
          'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
          'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          'large': '0 10px 50px -12px rgba(0, 0, 0, 0.25)',
          'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        },
        backdropBlur: {
          xs: '2px',
        },
        borderRadius: {
          '4xl': '2rem',
        },
        transitionTimingFunction: {
          'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        },
        zIndex: {
          '60': '60',
          '70': '70',
          '80': '80',
          '90': '90',
          '100': '100',
        },
        maxWidth: {
          '8xl': '88rem',
          '9xl': '96rem',
        },
        aspectRatio: {
          '4/3': '4 / 3',
          '3/2': '3 / 2',
          '2/3': '2 / 3',
          '9/16': '9 / 16',
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms')({
        strategy: 'class',
      }),
      require('@tailwindcss/typography'),
      require('@tailwindcss/aspect-ratio'),
      // Custom plugin for restaurant-specific utilities
      function({ addUtilities, addComponents }) {
        addUtilities({
          '.text-balance': {
            'text-wrap': 'balance',
          },
          '.bg-gradient-radial': {
            'background-image': 'radial-gradient(var(--tw-gradient-stops))',
          },
          '.bg-gradient-conic': {
            'background-image': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
          },
          '.scrollbar-hide': {
            '-ms-overflow-style': 'none',
            'scrollbar-width': 'none',
            '&::-webkit-scrollbar': {
              'display': 'none'
            }
          },
          '.scrollbar-thin': {
            'scrollbar-width': 'thin',
            'scrollbar-color': '#cbd5e1 #f1f5f9',
          },
        })
        
        addComponents({
          '.btn': {
            '@apply inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-150': {},
          },
          '.btn-primary': {
            '@apply btn bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500': {},
          },
          '.btn-secondary': {
            '@apply btn bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500': {},
          },
          '.btn-success': {
            '@apply btn bg-success-600 text-white hover:bg-success-700 focus:ring-success-500': {},
          },
          '.btn-danger': {
            '@apply btn bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500': {},
          },
          '.btn-outline': {
            '@apply btn border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-primary-500': {},
          },
          '.form-input': {
            '@apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm': {},
          },
          '.form-select': {
            '@apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm': {},
          },
          '.form-textarea': {
            '@apply block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm': {},
          },
          '.card': {
            '@apply bg-white overflow-hidden shadow-soft rounded-lg': {},
          },
          '.card-header': {
            '@apply px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50': {},
          },
          '.card-body': {
            '@apply px-4 py-5 sm:p-6': {},
          },
          '.card-footer': {
            '@apply px-4 py-4 sm:px-6 border-t border-gray-200 bg-gray-50': {},
          },
          '.badge': {
            '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium': {},
          },
          '.badge-primary': {
            '@apply badge bg-primary-100 text-primary-800': {},
          },
          '.badge-success': {
            '@apply badge bg-success-100 text-success-800': {},
          },
          '.badge-warning': {
            '@apply badge bg-warning-100 text-warning-800': {},
          },
          '.badge-danger': {
            '@apply badge bg-danger-100 text-danger-800': {},
          },
          '.table-auto-responsive': {
            '@apply min-w-full divide-y divide-gray-200': {},
            'th': {
              '@apply px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50': {},
            },
            'td': {
              '@apply px-6 py-4 whitespace-nowrap text-sm text-gray-900': {},
            },
            'tbody tr:nth-child(even)': {
              '@apply bg-gray-50': {},
            },
            'tbody tr:hover': {
              '@apply bg-gray-100': {},
            },
          },
        })
      },
    ],
  }
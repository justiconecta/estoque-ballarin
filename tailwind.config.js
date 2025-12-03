/** @type {import('tailwindcss').Config} */
module.exports = {
  // ✅ CRÍTICO: Habilita classes dark: baseadas na classe 'dark' no HTML
  darkMode: 'class',
  
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Estética Clínica Ballarin
        'clinic': {
          'black': '#000000',
          'white': '#ffffff',
          'cyan': '#12f6ff',
          'cyan-dark': '#03c8d9',
          'cyan-light': '#7dd3fc',
          'primary': '#12f6ff',
          'secondary': '#03c8d9',
          'gray': {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            750: '#1e293b',
            800: '#1e1e1e',
            850: '#151515',
            900: '#0a0a0a',
            950: '#000000'
          }
        }
      },
      backgroundImage: {
        'clinic-gradient': 'linear-gradient(135deg, #000000 0%, #1e1e1e 100%)',
        'clinic-gradient-cyan': 'linear-gradient(135deg, #12f6ff 0%, #03c8d9 100%)',
        'clinic-gradient-reverse': 'linear-gradient(135deg, #03c8d9 0%, #12f6ff 100%)',
        'clinic-aesthetic': 'linear-gradient(135deg, #000000 0%, rgba(18, 246, 255, 0.05) 50%, #000000 100%)',
      },
      boxShadow: {
        'clinic': '0 10px 25px -5px rgba(18, 246, 255, 0.1), 0 10px 10px -5px rgba(18, 246, 255, 0.04)',
        'clinic-lg': '0 25px 50px -12px rgba(18, 246, 255, 0.15), 0 0 0 1px rgba(18, 246, 255, 0.1)',
        'clinic-xl': '0 35px 60px -12px rgba(18, 246, 255, 0.2), 0 0 0 1px rgba(18, 246, 255, 0.15)',
        'clinic-glow': '0 0 20px rgba(18, 246, 255, 0.4), 0 0 40px rgba(18, 246, 255, 0.2)',
      },
      animation: {
        'float': 'float 15s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { 
            transform: 'translateY(0px) rotate(0deg)',
            opacity: '0.7'
          },
          '25%': { 
            transform: 'translateY(-10px) rotate(5deg)',
            opacity: '0.8'
          },
          '50%': { 
            transform: 'translateY(-5px) rotate(-5deg)',
            opacity: '1'
          },
          '75%': { 
            transform: 'translateY(-15px) rotate(3deg)',
            opacity: '0.9'
          }
        },
        glow: {
          '0%': {
            boxShadow: '0 0 5px rgba(18, 246, 255, 0.5), 0 0 10px rgba(18, 246, 255, 0.3)'
          },
          '100%': {
            boxShadow: '0 0 10px rgba(18, 246, 255, 0.7), 0 0 20px rgba(18, 246, 255, 0.5)'
          }
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta del equipo (decisión PO): gris grafito para las superficies
        // oscuras y las acciones principales, blanco como fondo, y amarillo
        // (accent-*) como color de marca — logo, menú activo, botones
        // primarios y acentos de foco. Se descartó el negro puro (#000):
        // cansaba la vista en pantallas largas.
        brand: {
          50: '#f6f7f9',
          100: '#eceff3',
          200: '#dde2e9',
          300: '#c6cdd8',
          400: '#98a2b3',
          500: '#667085',
          600: '#4b5768',
          700: '#3a4453',
          800: '#2b3341',
          900: '#1f2530',
          950: '#171c24',
        },
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)',
      },
    },
  },
  plugins: [],
}
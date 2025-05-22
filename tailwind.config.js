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
        'core-blue': '#0066cc',
        'core-orange': '#ff6600',
        'core-dark': '#1a1a1a',
      },
      fontFamily: {
        'mono': ['ui-monospace', 'SF Mono', 'Monaco', 'Inconsolata', 'monospace'],
      },
    },
  },
  plugins: [],
}
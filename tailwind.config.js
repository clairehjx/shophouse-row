/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // "Cozy Pastel" palette — soft + earthy, per the art direction.
      colors: {
        sky:    '#bfe3f0',
        skyhi:  '#dcf1f7',
        cream:  '#fbf3e0',
        paper:  '#fff8ea',
        parch:  '#f3e7c9',
        sun:    '#f6c875',
        peach:  '#f4a96b',
        rose:   '#e89aa5',
        mint:   '#9ed6b0',
        sage:   '#8fc7a0',
        lilac:  '#c7b6e8',
        brick:  '#c97b63',
        wood:   '#a9764f',
        woodhi: '#c79468',
        ink:    '#4a3a2e',
        inksoft:'#6f5a47',
      },
      fontFamily: {
        pixel: ['Silkscreen', 'monospace'],
        body:  ['Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cozy: '0 6px 0 rgba(74,58,46,0.15)',
        panel: '0 4px 0 #d9c9a3, 0 10px 22px rgba(74,58,46,0.18)',
      },
    },
  },
  plugins: [],
}

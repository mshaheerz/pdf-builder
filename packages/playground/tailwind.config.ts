import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        editor: {
          bg: '#1e1e2e',
          surface: '#282840',
          border: '#3a3a5c',
          text: '#e0e0ff',
          accent: '#7c3aed',
          hover: '#353550',
        },
      },
    },
  },
  plugins: [],
};

export default config;

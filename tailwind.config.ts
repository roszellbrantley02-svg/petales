import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#faf8f4',
        ink: '#2a2623',
        muted: '#6b6258',
        subtle: '#a89e92',
        line: '#e8e2d6',
        accent: '#8b6f47',
        'accent-dark': '#6d5638',
        warm: '#f0e8d8',
        sage: '#5d7a56',
        'sage-dark': '#3f5639',
        panel: '#ffffff',
        tag: '#efe9db',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

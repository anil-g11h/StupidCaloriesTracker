import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import safeArea from 'tailwindcss-safe-area';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './index.html'
  ],
  theme: {
    extend: {},
  },
  plugins: [
    forms,
    typography,
    safeArea
  ],
};

import { defineConfig } from 'vite';

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
// so built asset URLs need that repo prefix. The deploy workflow passes the
// repo name in BASE_PATH; the fallback keeps local `npm run build` correct.
// The dev server always serves from the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.BASE_PATH ?? '/MycoForm/' : '/',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
}));

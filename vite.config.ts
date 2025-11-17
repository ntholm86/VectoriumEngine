import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        demo: './demo.html'
      }
    }
  },
  server: {
    port: 3000,
    open: '/demo.html'
  }
});

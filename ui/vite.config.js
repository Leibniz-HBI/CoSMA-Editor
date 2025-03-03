import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    build: {
      outDir: 'build',
    },
    server: {
      host: '0.0.0.0',
      hmr: {
        clientPort: 5173,
        host: '127.0.0.1',
        overlay: false
      },
    },
    plugins: [react()],
  };
});

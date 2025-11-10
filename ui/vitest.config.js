import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config'
import { configure } from "@testing-library/react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['**/*.test.tsx','**/*.test.ts'],
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
  },
})

configure({ asyncUtilTimeout: 3000 });

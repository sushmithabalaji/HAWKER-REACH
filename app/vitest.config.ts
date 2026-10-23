import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    passWithNoTests: true,
    globals: true,
    environment: 'node',
    // appkit-ui's chart deps use directory imports that Node ESM can't resolve
    server: { deps: { inline: ['@databricks/appkit-ui', 'echarts-for-react'] } },
    exclude: ['**/node_modules/**', '**/dist/**', '**/.databricks/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});

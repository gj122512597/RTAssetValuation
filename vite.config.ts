import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // 防止 React 多实例（chunk hash 不一致时会出现 'Cannot read properties of null (reading useEffect)'）
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // 显式预构建 React 相关模块，避免 dev 时 Vite 把同一 React 拆到多个 chunk
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
    ],
  },
  server: {
    port: 5173,
    host: true,
  },
});

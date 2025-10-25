import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@hedera-africa/ui': path.resolve(__dirname, '../../packages/ui/src') // ou 'dist' si buildé
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'build', // <-- ajoute cette ligne pour générer le dossier build
  },
});

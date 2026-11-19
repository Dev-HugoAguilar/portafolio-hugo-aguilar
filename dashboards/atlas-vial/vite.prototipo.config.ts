import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Compilación aislada del prototipo de referencia (encabezado, navegación y
 * filtros). No toca el módulo del tablero: genera su propio HTML, JS y CSS en
 * `dist/prototipo/`, que el servidor estático publica en `/prototipo/`.
 */
export default defineConfig({
  plugins: [react()],
  root: 'prototipo',
  base: '/prototipo/',
  build: {
    outDir: '../../../dist/prototipo',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: false,
  },
});


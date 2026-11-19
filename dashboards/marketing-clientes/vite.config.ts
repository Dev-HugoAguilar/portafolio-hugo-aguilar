import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * El tablero se compila a UN módulo ESM (`app.js` con `mount`/`unmount`
 * exportados) más su hoja de estilos (`app.css`) dentro de
 * `dist/dashboards/marketing-clientes/`.
 *
 * El portafolio es un sitio estático sin empaquetador y este módulo sí usa
 * React, TypeScript y D3: `dist/projects/marketing-clientes.js` lo carga con `import()`
 * dinámico al abrir el proyecto, así que el resto del sitio no cambia.
 */
export default defineConfig({
  plugins: [react()],
  // En modo librería Vite no reemplaza NODE_ENV; sin esto se empaquetaría React
  // en su build de desarrollo.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: '../../dist/dashboards/marketing-clientes',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    sourcemap: false,
    lib: {
      entry: 'src/mount.tsx',
      formats: ['es'],
      fileName: () => 'app.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (info) =>
          (info.names?.[0] ?? info.name ?? '').endsWith('.css') ? 'app.css' : 'app.[ext]',
      },
    },
  },
});

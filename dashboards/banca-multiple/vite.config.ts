import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * El módulo se compila a UN archivo ESM (`app.js`, con `mount`/`unmount`
 * exportados) más su hoja de estilos (`app.css`), dentro de
 * `dist/dashboards/banca-multiple/`.
 *
 * ¿Por qué un bundle y no scripts sueltos? Porque el portafolio es un sitio
 * estático sin empaquetador y este módulo sí usa React, TypeScript y D3. El
 * módulo del portafolio (`dist/projects/comparativo-bancario.js`) lo carga con
 * `import()` dinámico al abrir el proyecto: el resto del sitio no cambia.
 */
export default defineConfig({
  plugins: [react()],
  // En modo librería Vite no reemplaza NODE_ENV; sin esto se empaquetaría React
  // en su build de desarrollo (y el bundle pesaría casi 1 MB).
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: '../../dist/dashboards/banca-multiple',
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

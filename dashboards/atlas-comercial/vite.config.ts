import { createRequire } from 'node:module';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * `src/ui/Segmentado.tsx` reexporta el componente del Atlas vial, que vive fuera
 * de esta carpeta. Para que no entren dos copias de React en el mismo bundle (y
 * el dispatcher de hooks quede nulo) se fija una única resolución de React y
 * react-dom a las dependencias de este proyecto.
 */
const requerir = createRequire(import.meta.url);
const unaSolaCopia = (paquete: string) => requerir.resolve(paquete);

/**
 * El tablero se compila a UN módulo ESM con `mount`/`unmount` más su hoja de
 * estilos dentro de `dist/dashboards/atlas-comercial/`, igual que el Atlas vial.
 * `dist/projects/atlas-comercial.js` lo carga con `import()` dinámico.
 *
 * `src/ui/Segmentado.tsx` reexporta el selector segmentado del Atlas vial: es el
 * mismo componente, no una copia, así que su aspecto y su cápsula son idénticos.
 */
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
    alias: [
      { find: /^react$/, replacement: unaSolaCopia('react') },
      { find: /^react\/jsx-runtime$/, replacement: unaSolaCopia('react/jsx-runtime') },
      { find: /^react-dom$/, replacement: unaSolaCopia('react-dom') },
      { find: /^react-dom\/client$/, replacement: unaSolaCopia('react-dom/client') },
    ],
  },
  server: { fs: { allow: ['..'] } },
  build: {
    outDir: '../../dist/dashboards/atlas-comercial',
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

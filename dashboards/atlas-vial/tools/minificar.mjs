/**
 * Minifica el bundle final con esbuild.
 *
 * Vite 8 compila en modo librería sin minificar; este paso deja el archivo listo
 * para el navegador: mismo módulo ESM, con `mount` y `unmount` exportados.
 */

import { build } from 'esbuild';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const salida = fileURLToPath(
  new URL('../../../dist/dashboards/atlas-vial/app.js', import.meta.url),
);

const antes = statSync(salida).size;

await build({
  entryPoints: [salida],
  outfile: salida,
  bundle: false,
  minify: true,
  format: 'esm',
  target: 'es2020',
  legalComments: 'none',
  allowOverwrite: true,
  logLevel: 'warning',
});

const despues = statSync(salida).size;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
console.log(`app.js minificado: ${kb(antes)} → ${kb(despues)}`);

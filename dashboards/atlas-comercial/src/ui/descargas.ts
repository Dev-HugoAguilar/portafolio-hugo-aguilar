/**
 * Descarga de tablas en CSV.
 *
 * El archivo se genera en el navegador a partir exactamente de las filas que la
 * pantalla está mostrando (misma selección, mismas etiquetas), de modo que la
 * descarga nunca contradice la tabla visible. Se incluye una cabecera de
 * metadatos trazable: versión de datos, ejecución, corte y unidad, para que el
 * archivo se pueda interpretar fuera de la aplicación.
 */

export interface DescargaCsv {
  /** Nombre del archivo, sin extensión. */
  nombre: string;
  /** Pares etiqueta/valor que se escriben como comentarios `#` antes de la tabla. */
  metadatos?: [string, string | number][];
  /** Encabezados de columna, en el orden de cada fila. */
  columnas: string[];
  /** Filas de datos; `null` se escribe como celda vacía. */
  filas: (string | number | null)[][];
}

/**
 * Escapa una celda según RFC 4180: comillas dobles y separadores se protegen
 * entre comillas. Un `null` se exporta como celda vacía para no inventar ceros.
 */
function escapar(valor: string | number | null): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  if (/[",;\n\r]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

/** Construye el texto CSV (sin BOM) de una descarga. */
export function construirCsv({ metadatos = [], columnas, filas }: DescargaCsv): string {
  const lineas: string[] = [];
  for (const [etiqueta, valor] of metadatos) {
    lineas.push(`# ${escapar(etiqueta)}: ${escapar(valor)}`);
  }
  lineas.push(columnas.map(escapar).join(','));
  for (const fila of filas) {
    lineas.push(fila.map(escapar).join(','));
  }
  return lineas.join('\r\n');
}

/**
 * Descarga la tabla como CSV. Añade BOM para que Excel en Windows respete los
 * acentos y usa un `objectURL` temporal que se revoca después del clic.
 */
export function descargarCsv(descarga: DescargaCsv): void {
  const texto = construirCsv(descarga);
  const blob = new Blob([`\ufeff${texto}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = descarga.nombre.endsWith('.csv')
    ? descarga.nombre
    : `${descarga.nombre}.csv`;
  enlace.rel = 'noopener';
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

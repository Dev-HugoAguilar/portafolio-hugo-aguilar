/**
 * Cobertura temporal del conjunto publicado.
 *
 * El archivo trae fechas como texto ISO (`AAAA-MM-DD`) y la API filtra por
 * comparación directa de esas cadenas, así que aquí no se construye ninguna
 * fecha local: los límites de mes se calculan con aritmética UTC y se devuelven
 * como texto. Así febrero de 2024 termina el día 29 y ninguna selección se
 * desplaza por zona horaria.
 */

export const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export const MESES_LARGOS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export interface MesCalendario {
  indice: number;
  clave: string;
  corto: string;
  largo: string;
  desde: string;
  hasta: string;
}

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

/** Primer día del mes, en ISO, sin construir fechas locales. */
export function primerDiaMes(anio: number, indice: number): string {
  return `${anio}-${dosDigitos(indice + 1)}-01`;
}

/** Último día real del mes (29 de febrero en 2024), en ISO. */
export function ultimoDiaMes(anio: number, indice: number): string {
  const dia = new Date(Date.UTC(anio, indice + 1, 0)).getUTCDate();
  return `${anio}-${dosDigitos(indice + 1)}-${dosDigitos(dia)}`;
}

/** Año de la cobertura publicada (el conjunto actual solo trae uno). */
export function anioDeCobertura(desde: string | null, hasta: string | null): number {
  const texto = desde ?? hasta ?? '';
  const anio = Number(texto.slice(0, 4));
  return Number.isFinite(anio) && anio > 1900 ? anio : new Date().getUTCFullYear();
}

/** Los doce meses del año de cobertura, con sus límites completos. */
export function mesesDe(anio: number): MesCalendario[] {
  return MESES_CORTOS.map((corto, indice) => ({
    indice,
    clave: `${anio}-${dosDigitos(indice + 1)}`,
    corto,
    largo: MESES_LARGOS[indice] ?? corto,
    desde: primerDiaMes(anio, indice),
    hasta: ultimoDiaMes(anio, indice),
  }));
}

export type TipoPeriodo = 'todo' | 'anio' | 'mes' | 'rango' | 'exacto';

export interface PeriodoActual {
  tipo: TipoPeriodo;
  /** Meses completos cubiertos por el filtro vigente (vacío si no los cubre). */
  indices: number[];
  texto: string;
}

/**
 * Traduce el filtro vigente a meses completos.
 * `exacto` = los límites no coinciden con meses completos (enlaces antiguos):
 * se conservan tal cual y se muestran aparte en el panel.
 */
export function leerPeriodo(
  desde: string | null,
  hasta: string | null,
  anio: number,
): PeriodoActual {
  const meses = mesesDe(anio);
  if (!desde && !hasta) {
    return { tipo: 'todo', indices: [], texto: `Ene–Dic ${anio}` };
  }
  const inicio = meses.findIndex((mes) => mes.desde === desde);
  const fin = meses.findIndex((mes) => mes.hasta === hasta);
  if (inicio >= 0 && fin >= 0 && inicio <= fin) {
    const indices = meses.slice(inicio, fin + 1).map((mes) => mes.indice);
    if (inicio === 0 && fin === meses.length - 1) {
      return { tipo: 'anio', indices, texto: `Ene–Dic ${anio}` };
    }
    if (inicio === fin) {
      return { tipo: 'mes', indices, texto: `${Capitalizar(meses[inicio]?.corto ?? "")} ${anio}` };
    }
    return {
      tipo: 'rango',
      indices,
      texto: `${Capitalizar(meses[inicio]?.corto ?? "")}–${Capitalizar(meses[fin]?.corto ?? "")} ${anio}`,
    };
  }
  const exacto = desde && hasta ? `${desde} → ${hasta}` : desde ? `desde ${desde}` : `hasta ${hasta}`;
  return { tipo: 'exacto', indices: [], texto: exacto };
}

function Capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Etiqueta corta de un intervalo de meses elegido en el panel. */
export function etiquetaMeses(indices: number[], anio: number): string {
  const meses = mesesDe(anio);
  if (indices.length === 0) return `Ene–Dic ${anio}`;
  const orden = [...indices].sort((a, b) => a - b);
  const primero = meses[orden[0] ?? -1];
  const ultimo = meses[orden[orden.length - 1] ?? -1];
  if (!primero || !ultimo) return `Ene–Dic ${anio}`;
  if (orden.length === meses.length) return `Ene–Dic ${anio}`;
  if (primero.indice === ultimo.indice) return `${Capitalizar(primero.corto)} ${anio}`;
  return `${Capitalizar(primero.corto)}–${Capitalizar(ultimo.corto)} ${anio}`;
}

/** Límites de la API para un intervalo de meses (inicio y fin completos). */
export function limitesDeMeses(
  indices: number[],
  anio: number,
): { desde: string | null; hasta: string | null } {
  if (indices.length === 0) return { desde: null, hasta: null };
  const meses = mesesDe(anio);
  const orden = [...indices].sort((a, b) => a - b);
  const primero = meses[orden[0] ?? -1];
  const ultimo = meses[orden[orden.length - 1] ?? -1];
  return { desde: primero?.desde ?? null, hasta: ultimo?.hasta ?? null };
}



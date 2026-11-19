/** Formatos, etiquetas y conversión de filtros — una sola fuente para las vistas. */

import type { ParametrosFiltro } from './api/cliente';

export interface Filtros {
  desde: string | null;
  hasta: string | null;
  canales: string[];
  dispositivos: string[];
  paises: string[];
  buscar: string;
}

export const FILTROS_VACIOS: Filtros = {
  desde: null,
  hasta: null,
  canales: [],
  dispositivos: [],
  paises: [],
  buscar: '',
};

const ENTERO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function numero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'Sin datos';
  return ENTERO.format(valor);
}

export function dinero(valor: number | null | undefined, moneda = 'USD'): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'Sin datos';
  return `${DECIMAL.format(valor)} ${moneda}`;
}

export function porcentaje(valor: number | null | undefined, decimales = 1): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'Sin datos';
  return `${valor.toFixed(decimales)} %`;
}

export function variacion(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'Sin datos';
  const signo = valor > 0 ? '+' : '';
  return `${signo}${valor.toFixed(1)} %`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «2 nov 2020» a partir de una fecha ISO. */
export function etiquetaFecha(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  const [anio, mes, dia] = iso.split('-');
  const indice = Number(mes) - 1;
  if (!anio || !dia || !MESES[indice]) return iso;
  return `${Number(dia)} ${MESES[indice]} ${anio}`;
}

/** «2 nov» — para ejes con muchos días. */
export function etiquetaFechaCorta(iso: string | null | undefined): string {
  if (!iso) return '';
  const [, mes, dia] = iso.split('-');
  const indice = Number(mes) - 1;
  return `${Number(dia)} ${MESES[indice] ?? ''}`.trim();
}

/** «2020-S45» a partir del lunes de la cohorte. */
export function etiquetaSemana(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  const fecha = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return iso;
  const anio = fecha.getUTCFullYear();
  const inicio = new Date(Date.UTC(anio, 0, 4));
  const diaSemana = (inicio.getUTCDay() + 6) % 7;
  const lunes = new Date(inicio);
  lunes.setUTCDate(inicio.getUTCDate() - diaSemana);
  const semanas = Math.floor((fecha.getTime() - lunes.getTime()) / (7 * 86_400_000)) + 1;
  return `${anio}-S${String(semanas).padStart(2, '0')}`;
}

export function etiquetaHora(hora: number | null | undefined): string {
  if (hora === null || hora === undefined) return 'Sin hora';
  return `${String(hora).padStart(2, '0')}:00`;
}

export function etiquetaRango(desde: string | null, hasta: string | null): string {
  if (!desde && !hasta) return 'todo el periodo observado';
  if (desde && hasta) return desde === hasta ? etiquetaFecha(desde) : `${etiquetaFecha(desde)} – ${etiquetaFecha(hasta)}`;
  return desde ? `desde ${etiquetaFecha(desde)}` : `hasta ${etiquetaFecha(hasta)}`;
}

/**
 * Filtros → parámetros de la API.
 *
 * Regla documentada en la interfaz: **dentro** de una dimensión los valores se
 * suman (OR) y **entre** dimensiones se cruzan (AND).
 */
export function parametrosDe(filtros: Filtros): ParametrosFiltro {
  const params: ParametrosFiltro = [];
  if (filtros.desde) params.push(['desde', filtros.desde]);
  if (filtros.hasta) params.push(['hasta', filtros.hasta]);
  for (const valor of filtros.canales) params.push(['canal', valor]);
  for (const valor of filtros.dispositivos) params.push(['dispositivo', valor]);
  for (const valor of filtros.paises) params.push(['pais', valor]);
  if (filtros.buscar.trim()) params.push(['buscar', filtros.buscar.trim()]);
  return params;
}

export function hayFiltros(filtros: Filtros): boolean {
  return parametrosDe(filtros).length > 0;
}

export function claveDe(filtros: Filtros): string {
  return parametrosDe(filtros)
    .map(([clave, valor]) => `${clave}=${valor}`)
    .sort()
    .join('&');
}

/** Nombre de la dimensión de dispositivo en singular y legible. */
export function etiquetaDispositivo(valor: string): string {
  const mapa: Record<string, string> = {
    desktop: 'Escritorio',
    mobile: 'Móvil',
    tablet: 'Tableta',
  };
  return mapa[valor] ?? valor;
}

export const ETIQUETA_EVENTO: Record<string, string> = {
  view_item: 'Vio un artículo',
  add_to_cart: 'Añadió al carrito',
  begin_checkout: 'Inició el pago',
  purchase: 'Compró',
};

export const SIN_DATOS = 'Sin datos';
export const SIN_INFORMACION = 'Sin información';

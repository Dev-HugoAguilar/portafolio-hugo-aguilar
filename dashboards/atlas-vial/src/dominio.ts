/** Formatos, etiquetas y conversión de filtros — una sola fuente para las vistas. */

import type { ParametrosFiltro } from './api/cliente';

export interface Filtros {
  desde: string | null;
  hasta: string | null;
  alcaldias: string[];
  tiposEvento: string[];
  consecuencias: string[];
  tiposUsuario: string[];
  tiposVehiculo: string[];
  vialidades: string[];
  semaforizada: string[];
  sexos: string[];
  edadMin: number | null;
  edadMax: number | null;
  bbox: string | null;
  filtrarPorZona: boolean;
}

export const FILTROS_VACIOS: Filtros = {
  desde: null,
  hasta: null,
  alcaldias: [],
  tiposEvento: [],
  consecuencias: [],
  tiposUsuario: [],
  tiposVehiculo: [],
  vialidades: [],
  semaforizada: [],
  sexos: [],
  edadMin: null,
  edadMax: null,
  bbox: null,
  filtrarPorZona: false,
};

const ENTERO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function numero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'Sin dato';
  return ENTERO.format(valor);
}

export function decimal(valor: number | null | undefined, sufijo = ''): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'Sin dato';
  return `${DECIMAL.format(valor)}${sufijo}`;
}

export function porcentaje(valor: number | null | undefined, decimales = 1): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'Sin dato';
  return `${valor.toFixed(decimales)} %`;
}

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** «31 dic 2024» a partir de una fecha ISO (AAAA-MM-DD). */
export function etiquetaFecha(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  const [anio, mes, dia] = iso.split('-');
  const indice = Number(mes) - 1;
  if (!anio || !dia || Number.isNaN(indice) || !MESES[indice]) return iso;
  return `${Number(dia)} ${MESES[indice]} ${anio}`;
}

export function etiquetaFechaLarga(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  const [anio, mes, dia] = iso.split('-');
  const indice = Number(mes) - 1;
  if (!anio || !dia || Number.isNaN(indice) || !MESES_LARGOS[indice]) return iso;
  return `${Number(dia)} de ${MESES_LARGOS[indice]} de ${anio}`;
}

/** El conjunto publica la hora como entero de 0 a 23. */
export function etiquetaHora(hora: number | null | undefined): string {
  if (hora === null || hora === undefined) return 'Sin hora';
  return `${String(hora).padStart(2, '0')}:00`;
}

/** Etiqueta de un periodo de la serie según su agregación. */
export function etiquetaPeriodo(periodo: string, agregacion: 'dia' | 'semana' | 'mes'): string {
  if (agregacion === 'mes') {
    const [anio, mes] = periodo.split('-');
    const indice = Number(mes) - 1;
    if (MESES[indice]) return `${MESES[indice]} ${anio}`;
    return periodo;
  }
  if (agregacion === 'semana') {
    const [anio, semana] = periodo.split('-S');
    return `semana ${Number(semana)} de ${anio}`;
  }
  return etiquetaFecha(periodo);
}

/** Rango de fechas en texto: «todo 2024», «1 ene – 31 mar 2024». */
export function etiquetaRango(desde: string | null, hasta: string | null): string {
  if (!desde && !hasta) return 'todo el periodo publicado';
  if (desde && hasta) {
    if (desde === hasta) return etiquetaFecha(desde);
    return `${etiquetaFecha(desde)} – ${etiquetaFecha(hasta)}`;
  }
  return desde ? `desde ${etiquetaFecha(desde)}` : `hasta ${etiquetaFecha(hasta)}`;
}

/**
 * Filtros → parámetros de la API.
 *
 * Regla documentada en la interfaz: **dentro** de una dimensión los valores se
 * suman (OR) y **entre** dimensiones se cruzan (AND). El recorte por zona solo
 * viaja si la persona lo activó de forma explícita.
 */
export function parametrosDe(filtros: Filtros): ParametrosFiltro {
  const params: ParametrosFiltro = [];
  if (filtros.desde) params.push(['desde', filtros.desde]);
  if (filtros.hasta) params.push(['hasta', filtros.hasta]);
  for (const valor of filtros.alcaldias) params.push(['alcaldia', valor]);
  for (const valor of filtros.tiposEvento) params.push(['tipo_evento', valor]);
  for (const valor of filtros.consecuencias) params.push(['consecuencia', valor]);
  for (const valor of filtros.tiposUsuario) params.push(['tipo_usuario', valor]);
  for (const valor of filtros.tiposVehiculo) params.push(['tipo_vehiculo', valor]);
  for (const valor of filtros.vialidades) params.push(['vialidad', valor]);
  for (const valor of filtros.semaforizada) params.push(['semaforizada', valor]);
  for (const valor of filtros.sexos) params.push(['sexo', valor]);
  if (filtros.edadMin !== null) params.push(['edad_min', String(filtros.edadMin)]);
  if (filtros.edadMax !== null) params.push(['edad_max', String(filtros.edadMax)]);
  if (filtros.filtrarPorZona && filtros.bbox) {
    params.push(['bbox', filtros.bbox]);
    params.push(['filtrar_por_zona', 'true']);
  }
  return params;
}

/** Clave estable de un conjunto de filtros (para las consultas y el historial). */
export function claveDe(filtros: Filtros): string {
  return parametrosDe(filtros)
    .map(([clave, valor]) => `${clave}=${valor}`)
    .sort()
    .join('&');
}

export function hayFiltros(filtros: Filtros): boolean {
  return parametrosDe(filtros).length > 0;
}

/** Nombre corto de cada dimensión, para los chips de filtros activos. */
export const ETIQUETA_DIMENSION: Record<string, string> = {
  periodo: 'Periodo',
  alcaldia: 'Alcaldía',
  tipo_evento: 'Tipo de evento',
  consecuencia: 'Consecuencia',
  tipo_usuario: 'Tipo de persona',
  tipo_vehiculo: 'Tipo de vehículo',
  vialidad: 'Vialidad',
  sexo: 'Sexo registrado',
  semaforizada: 'Intersección',
  edad: 'Edad',
  zona: 'Zona visible',
  alcaldias: 'Alcaldía',
  tipos_evento: 'Tipo de evento',
  consecuencias: 'Consecuencia',
  tipos_usuario: 'Tipo de persona',
  tipos_vehiculo: 'Tipo de vehículo',
  vialidades: 'Vialidad',
  sexos: 'Sexo registrado',
  edadMin: 'Edad',
  edadMax: 'Edad',
  bbox: 'Zona visible',
  filtrarPorZona: 'Zona visible',
  desde: 'Periodo',
  hasta: 'Periodo',
};

export const ETIQUETA_CONSECUENCIA: Record<string, string> = {
  con_fallecimientos: 'Con personas fallecidas',
  solo_lesionados: 'Solo con personas lesionadas',
};

export const ETIQUETA_SEMAFORO: Record<string, string> = {
  si: 'Semaforizada',
  no: 'Sin semáforo',
  sin_dato: 'Sin dato',
};

/** Orden natural de los meses/días para las series (ISO ordena igual). */
export function ordenarPeriodos<T extends { periodo: string }>(filas: T[]): T[] {
  return [...filas].sort((a, b) => a.periodo.localeCompare(b.periodo));
}


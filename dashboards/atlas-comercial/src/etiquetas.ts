/**
 * Etiquetas de presentación del proyecto.
 *
 * Un solo lugar traduce los códigos de M5 a lenguaje comercial. Los códigos originales se
 * conservan siempre como información secundaria: en el texto accesible, en la búsqueda, en
 * las descargas y en el detalle técnico.
 *
 * No se inventan nombres de producto, marca, dirección ni sucursal: un artículo sin
 * descripción comercial se presenta como «Artículo FOODS_3_090».
 */

const ESTADOS: Record<string, string> = {
  CA: 'California',
  TX: 'Texas',
  WI: 'Wisconsin',
};

const CATEGORIAS: Record<string, string> = {
  FOODS: 'Alimentos',
  HOBBIES: 'Aficiones',
  HOUSEHOLD: 'Hogar',
};

/** CA_1 → «California · Tienda 1». Conserva el código entre paréntesis en el título. */
export function etiquetaTienda(storeId: string | null | undefined): string {
  if (!storeId) return 'Todas las tiendas';
  const [estado = '', numero = ''] = storeId.split('_');
  const nombre = ESTADOS[estado];
  if (!nombre) return storeId;
  return `${nombre} · Tienda ${numero}`.trim();
}

/** Código corto de tienda (CA_1) para columnas estrechas y descargas. */
export const codigoTienda = (storeId: string | null | undefined) => storeId ?? '—';

export function etiquetaEstado(estado: string | null | undefined): string {
  if (!estado) return 'Todos los estados';
  return ESTADOS[estado] ?? estado;
}

/** FOODS → «Alimentos» (el código va aparte donde haga falta). */
export function etiquetaCategoria(catId: string | null | undefined): string {
  if (!catId) return 'Todas las categorías';
  return CATEGORIAS[catId] ?? catId;
}

/** FOODS_1 → «Alimentos · Departamento 1». */
export function etiquetaDepartamento(deptId: string | null | undefined): string {
  if (!deptId) return 'Todos los departamentos';
  const partes = deptId.split('_');
  const nombre = CATEGORIAS[partes[0] ?? ''];
  if (!nombre) return deptId;
  return `${nombre} · Departamento ${partes[1] ?? ''}`.trim();
}

/** CA_1 → «Tienda 1»: nombre corto para paneles agrupados por estado. */
export function etiquetaTiendaCorta(storeId: string | null | undefined): string {
  if (!storeId) return 'Todas las tiendas';
  const partes = storeId.split('_');
  return partes[1] ? `Tienda ${partes[1]}` : storeId;
}

/** CA → «California» (encabezado de grupo). */
export const etiquetaEstadoCorto = (estado: string | null | undefined) =>
  estado ? ESTADOS[estado] ?? estado : 'Todos los estados';

/** FOODS_1 → «Departamento 1»: fila de un grupo ya encabezado por su categoría. */
export function etiquetaDepartamentoCorta(deptId: string | null | undefined): string {
  if (!deptId) return 'Todos los departamentos';
  const partes = deptId.split('_');
  return partes[1] ? `Departamento ${partes[1]}` : deptId;
}

/**
 * Identidad de un departamento para tablas que mezclan categorías.
 *
 * «Departamento 1» aparece en las tres categorías: FOODS_1, HOBBIES_1 y HOUSEHOLD_1. En una tabla
 * mixta la etiqueta corta es ambigua, así que la principal incluye la categoría y el código queda
 * como información secundaria. En una composición ya agrupada por categoría se usa la corta.
 */
export function identidadDepartamento(deptId: string | null | undefined): {
  nombre: string;
  corto: string;
  codigo: string | null;
} {
  if (!deptId) {
    return { nombre: 'Todos los departamentos', corto: 'Todos los departamentos', codigo: null };
  }
  return {
    nombre: etiquetaDepartamento(deptId),
    corto: etiquetaDepartamentoCorta(deptId),
    codigo: deptId,
  };
}

/**
 * Etiqueta de una clave según el nivel al que pertenece.
 *
 * `agrupado` indica que la fila ya está bajo un encabezado de categoría: ahí «Departamento 1» es
 * suficiente. En tablas mixtas se devuelve la identidad completa («Alimentos · Departamento 1»).
 */
export function etiquetaNivel(
  nivel: string | null | undefined,
  clave: string,
  opciones: { agrupado?: boolean } = {},
): string {
  const agrupado = opciones.agrupado ?? false;
  if (!nivel) return clave;
  if (nivel === 'estado') return etiquetaEstado(clave);
  if (nivel === 'tienda') return etiquetaTienda(clave);
  if (nivel === 'categoria') return etiquetaCategoria(clave);
  if (nivel === 'departamento') {
    return agrupado ? etiquetaDepartamentoCorta(clave) : etiquetaDepartamento(clave);
  }
  if (nivel === 'producto') return etiquetaArticulo(clave);
  return clave;
}

/** FOODS → «Alimentos» (encabezado de grupo). */
export const etiquetaCategoriaCorta = (catId: string | null | undefined) =>
  catId ? CATEGORIAS[catId] ?? catId : 'Todas las categorías';

/**
 * Nombre corto de un artículo cuando su categoría y departamento ya están visibles en el
 * mismo contexto: «Artículo 090». No es un nombre comercial: es una forma de identificar la
 * fila sin ambigüedad, y el código completo sigue accesible como información secundaria.
 */
export function etiquetaArticuloCorta(itemId: string | null | undefined): string {
  if (!itemId) return 'Artículo';
  const partes = itemId.split('_');
  const numero = partes[2];
  return numero ? `Artículo ${numero}` : `Artículo ${itemId}`;
}

/** Código corto de artículo (090) para columnas estrechas. */
export function codigoArticuloCorto(itemId: string | null | undefined): string {
  if (!itemId) return '—';
  const partes = itemId.split('_');
  return partes[2] ?? itemId;
}

/**
 * Etiqueta de un corte a partir de su fecha real del calendario.
 *
 * La fecha es la etiqueta principal; el identificador `d_N` queda como información
 * secundaria donde haga falta trazabilidad.
 */
export function etiquetaCorte(fecha: string | null | undefined, origenD?: number | null): string {
  const base = fechaCorta(fecha);
  return origenD === null || origenD === undefined ? base : `${base}`;
}

/** «27 mar 2016 · d_1885» para tablas técnicas donde el identificador sigue siendo útil. */
export function corteConCodigo(fecha: string | null | undefined, origenD: number | null | undefined): string {
  const fechaTexto = fechaCorta(fecha);
  return origenD === null || origenD === undefined ? fechaTexto : `${fechaTexto} · d_${origenD}`;
}

/** FOODS_3_090 → «Artículo FOODS_3_090» (no hay descripción comercial en M5). */
export function etiquetaArticulo(itemId: string | null | undefined): string {
  if (!itemId) return 'Artículo';
  return `Artículo ${itemId}`;
}

/** «Artículo FOODS_3_090 · Alimentos · Departamento 3» para títulos y tooltips. */
export function contextoArticulo(itemId: string, deptId?: string | null, catId?: string | null): string {
  const piezas = [etiquetaArticulo(itemId)];
  if (catId) piezas.push(etiquetaCategoria(catId));
  if (deptId) piezas.push(etiquetaDepartamento(deptId));
  return piezas.join(' · ');
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Fecha ISO → «27 de marzo de 2016».
 *
 * Se construye con Date.UTC y se leen los componentes UTC: ninguna fecha se desplaza por la
 * zona horaria del navegador.
 */
export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return '—';
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!partes) return iso;
  const fecha = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
  return `${fecha.getUTCDate()} de ${MESES[fecha.getUTCMonth()] ?? ''} de ${fecha.getUTCFullYear()}`;
}

/** «27 mar 2016» para ejes y celdas. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!partes) return iso;
  const fecha = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
  return `${fecha.getUTCDate()} ${(MESES[fecha.getUTCMonth()] ?? '').slice(0, 3)} ${fecha.getUTCFullYear()}`;
}

/** Rango corto: «23 may – 19 jun 2016». */
export function fechaRango(desde: string | null | undefined, hasta: string | null | undefined): string {
  if (!desde || !hasta) return '—';
  return `${fechaCorta(desde)} – ${fechaCorta(hasta)}`;
}

export const numero = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? 'n/c' : valor.toLocaleString('es-MX', { maximumFractionDigits: 0 });

export const numero1 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? 'n/c'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const numero2 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? 'n/c'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Variación porcentual con signo; «n/c» cuando la base es cero. */
export const porcentaje = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? 'n/c' : `${valor > 0 ? '+' : ''}${numero1(valor)} %`;

export const signo = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? 'n/c' : `${valor > 0 ? '+' : ''}${numero(valor)}`;

/** Estados descriptivos de evaluación por serie (no son semáforos de confiabilidad). */
export const ESTADO_EVALUACION: Record<string, string> = {
  menor_error: 'Menor error que el baseline en los cortes disponibles',
  mayor_error: 'Mayor error que el baseline',
  mixto: 'Resultado mixto entre cortes',
  empate: 'Empate con el baseline',
  sin_evaluacion: 'Sin evaluación suficiente para calcular la comparación',
};

export const estadoEvaluacion = (clave: string | null | undefined) =>
  ESTADO_EVALUACION[clave ?? 'sin_evaluacion'] ?? 'Sin evaluación suficiente';

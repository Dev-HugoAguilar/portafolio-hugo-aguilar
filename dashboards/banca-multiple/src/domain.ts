/**
 * Reglas de presentación y cálculo de vista.
 *
 * Nada de esto altera las cifras de la CNBV: solo nombra, formatea y prepara
 * comparaciones que son válidas (mismo concepto, misma unidad, mismo periodo
 * base). Los ratios publicados nunca se agregan.
 */

import type {
  Concepto,
  GrupoCartera,
  Naturaleza,
  PuntoSerie,
  Seccion,
  SerieInstitucion,
} from './api/types';
import { PALETA } from './colors';

/* ------------------------------------------------------------------- colores */

/**
 * Tokens de color explícitos para SVG. Se aplican como atributos `fill`/`stroke`
 * y no dependen de reglas globales de CSS (causa del bajo contraste anterior).
 * Todos los valores provienen de `colors.ts`: aquí solo se renombran para el
 * vocabulario de los gráficos.
 */
export const COLOR = {
  texto: PALETA.text,
  textoSuave: PALETA.textSecondary,
  borde: PALETA.border,
  guia: PALETA.guia,
  guiaFuerte: PALETA.guiaFuerte,
  superficie: PALETA.surface,
  fondo: PALETA.bg,
  seleccion: PALETA.primary,
  apoyo: PALETA.teal,
  /** Referencia del sector («Sistema»): naranja quemado, nunca un banco. */
  sistema: PALETA.sistema,
  neutro: PALETA.neutro,
  neutroHover: PALETA.neutroHover,
  banda: PALETA.banda,
} as const;

/* ------------------------------------------------------------------ periodos */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function etiquetaPeriodo(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  return `${MESES[Number(mes) - 1] ?? mes} ${anio}`;
}

export function etiquetaPeriodoLarga(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  return `${MESES_LARGOS[Number(mes) - 1] ?? mes} de ${anio}`;
}

export function mesesEntre(desde: string, hasta: string): number {
  const [a1, m1] = desde.split('-').map(Number);
  const [a2, m2] = hasta.split('-').map(Number);
  return ((a2 ?? 0) - (a1 ?? 0)) * 12 + ((m2 ?? 0) - (m1 ?? 0));
}

export function sonConsecutivos(anterior: string, siguiente: string): boolean {
  return mesesEntre(anterior, siguiente) === 1;
}

/** Periodos sin boletín dentro del rango cubierto. */
export function mesesFaltantes(periodos: string[]): string[] {
  if (periodos.length < 2) return [];
  const ordenados = [...periodos].sort();
  const faltantes: string[] = [];
  for (let i = 0; i < ordenados.length - 1; i += 1) {
    const actual = ordenados[i] as string;
    const siguiente = ordenados[i + 1] as string;
    const salto = mesesEntre(actual, siguiente);
    if (salto <= 1) continue;
    const partes = siguiente.split('-').map(Number);
    let anio = partes[0] ?? 0;
    let mes = partes[1] ?? 1;
    for (let paso = 1; paso < salto; paso += 1) {
      mes -= 1;
      if (mes === 0) {
        mes = 12;
        anio -= 1;
      }
      faltantes.push(`${anio}-${String(mes).padStart(2, '0')}`);
    }
  }
  return faltantes.sort();
}

export function periodoEnVentana(periodo: string, ventana: [string, string] | null): boolean {
  if (!ventana) return true;
  return periodo >= ventana[0] && periodo <= ventana[1];
}

/* ------------------------------------------------------------------ formatos */

const entero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const unDecimal = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dosDecimales = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctSigno = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});
const indice = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const hastaDos = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

export const UNIDAD_IMPORTE = 'millones de pesos';

/** Importe compacto para etiquetas y ejes: millones sin decimales. */
export function importeCompacto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return entero.format(valor);
}

/** Importe con precisión completa para tooltips y panel lateral. */
export function importeExacto(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return dosDecimales.format(valor);
}

/**
 * `≈ 3.3 billones`. La conversión es exacta: 1 billón de pesos = 10¹² pesos =
 * 1 000 000 de millones de pesos, así que se divide entre 10⁶.
 */
export function ayudaBillones(valor: number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const billones = valor / 1_000_000;
  if (Math.abs(billones) < 1) return null;
  return `≈ ${unDecimal.format(billones)} billones`;
}

/* ------------------------------------------------------- unidad de los ejes */

/**
 * Unidad **única** para un gráfico de importes. Se decide una sola vez a partir
 * de la magnitud y se usa a la vez en el eje, el subtítulo del panel y el
 * tooltip: así no se lee «millones» arriba y «billones» abajo.
 */
export interface UnidadImporte {
  /** Divisor aplicado al valor publicado (que siempre viene en millones). */
  factor: number;
  nombre: 'millones' | 'billones';
  /** Texto corto para subtítulos y notas: «billones de pesos». */
  etiqueta: string;
  /** Equivalencia explícita para la nota del eje. */
  nota: string;
}

const UNIDAD_MILLONES: UnidadImporte = {
  factor: 1,
  nombre: 'millones',
  etiqueta: 'millones de pesos',
  nota: 'Valores en millones de MXN, cifra tal como la publica la CNBV',
};

const UNIDAD_BILLONES: UnidadImporte = {
  factor: 1_000_000,
  nombre: 'billones',
  etiqueta: 'billones de pesos',
  nota: 'Valores en billones de MXN; detalle original en millones',
};

/**
 * Equivalencia exacta, para notas y ayudas: 1 billón de pesos = 10¹² pesos =
 * 1 000 000 de millones de pesos. `FACTOR_BILLON` es el divisor aplicado.
 */
export const FACTOR_BILLON = 1_000_000;

export const EQUIVALENCIA_BILLON =
  '1 billón de pesos = 10¹² MXN = 1 000 000 de millones de pesos';

/** Umbral de cambio de unidad: a partir de un billón de pesos se abrevia. */
export function unidadParaMagnitud(magnitud: number | null | undefined): UnidadImporte {
  if (magnitud === null || magnitud === undefined || Number.isNaN(magnitud)) return UNIDAD_MILLONES;
  return Math.abs(magnitud) >= 1_000_000 ? UNIDAD_BILLONES : UNIDAD_MILLONES;
}

/** Magnitud máxima de un conjunto de series (para elegir la unidad). */
export function magnitudDeSeries(series: SerieInstitucion[]): number {
  let maximo = 0;
  for (const serie of series) {
    for (const punto of serie.puntos) {
      if (punto.valor === null) continue;
      maximo = Math.max(maximo, Math.abs(punto.valor));
    }
  }
  return maximo;
}

/** Valor publicado convertido a la unidad del eje. */
export function valorEnUnidad(valor: number, unidad: UnidadImporte): number {
  return valor / unidad.factor;
}

/** Importe en la unidad elegida, con hasta dos decimales. */
export function formatearImporte(
  valor: number | null | undefined,
  unidad: UnidadImporte,
): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return hastaDos.format(valor / unidad.factor);
}

/**
 * Cifra compacta para las tarjetas de indicadores.
 *
 * - Importes: se abrevian a billones cuando la magnitud lo permite y la cifra
 *   original en millones queda disponible para el tooltip.
 * - Porcentajes: se muestran tal como se publican.
 */
export interface ValorKpi {
  /** Cifra visible, ya formateada. */
  principal: string;
  /** Unidad que acompaña a la cifra («billones MXN», «millones MXN», «%»). */
  unidad: string;
  /** Cifra completa original, para el tooltip. */
  exacto: string;
}

export function valorKpi(
  valor: number | null | undefined,
  opciones: { esPorcentaje?: boolean; unidad?: UnidadImporte } = {},
): ValorKpi {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return { principal: '—', unidad: '', exacto: 'sin dato publicado para este periodo' };
  }
  if (opciones.esPorcentaje) {
    return { principal: porcentaje(valor), unidad: '%', exacto: `${porcentaje(valor)} % publicado` };
  }
  const unidad = opciones.unidad ?? unidadParaMagnitud(valor);
  if (unidad.factor > 1) {
    return {
      principal: dosDecimales.format(valor / unidad.factor),
      unidad: 'billones MXN',
      exacto: `${importeExacto(valor)} millones de pesos`,
    };
  }
  return {
    principal: importeCompacto(valor),
    unidad: 'millones MXN',
    exacto: `${importeExacto(valor)} millones de pesos`,
  };
}

export function porcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return pct.format(valor);
}

export function porcentajeConSigno(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return pctSigno.format(valor);
}

export function indice100(valor: number): string {
  return indice.format(valor);
}

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return 'sin fecha';
  const fecha = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

/* ----------------------------------------------------------------- conceptos */

const SECCIONES: Record<Seccion, string> = {
  balance: 'Estado de situación financiera',
  resultados: 'Estado de resultado integral',
  cuentas_orden: 'Cuentas de orden',
  sin_clasificar: 'Sin sección',
};

export const etiquetaSeccion = (seccion: Seccion): string => SECCIONES[seccion] ?? seccion;

export const etiquetaNaturaleza = (naturaleza: Naturaleza): string =>
  naturaleza === 'flujo_acumulado' ? 'Flujo acumulado' : 'Saldo';

export function ocurrenciaDe(conceptoId: string): number {
  const numero = Number(conceptoId.split('#')[1]);
  return Number.isFinite(numero) && numero > 0 ? numero : 1;
}

export function grupoDeCartera(conceptoId: string, grupos: GrupoCartera[]): GrupoCartera | null {
  return grupos.find((grupo) => grupo.conceptos.includes(conceptoId)) ?? null;
}

export function etapaDeCartera(conceptoId: string, grupos: GrupoCartera[]): number | null {
  const grupo = grupoDeCartera(conceptoId, grupos);
  if (!grupo) return null;
  const posicion = grupo.conceptos.indexOf(conceptoId);
  return posicion >= 0 ? posicion + 1 : null;
}

export interface EtiquetaConcepto {
  principal: string;
  detalle: string | null;
  seccion: string;
  completa: string;
}

/** Nombre legible con su sección y, si aplica, su etapa de cartera. */
export function etiquetaConcepto(concepto: Concepto, grupos: GrupoCartera[]): EtiquetaConcepto {
  const ocurrencia = ocurrenciaDe(concepto.concepto_id);
  const grupo = grupoDeCartera(concepto.concepto_id, grupos);
  const etapa = etapaDeCartera(concepto.concepto_id, grupos);
  const seccion = etiquetaSeccion(concepto.seccion);

  let principal = concepto.nombre;
  let detalle: string | null = null;

  if (grupo && etapa !== null) {
    principal = grupo.nombre;
    detalle = `etapa ${etapa}`;
  } else if (ocurrencia > 1) {
    detalle = `aparición ${ocurrencia}`;
  }

  return {
    principal,
    detalle,
    seccion,
    completa: detalle ? `${principal} · ${detalle}` : principal,
  };
}

/* --------------------------------------------------------------- comparación */

export interface TextoBase {
  etiqueta: string;
  criterio: string;
}

export function textoBase(
  tipo: string | null,
  periodoComparado: string | null,
  motivo: string | null,
): TextoBase | null {
  if (motivo || !periodoComparado || !tipo) return null;
  if (tipo === 'mismo_mes_anio_anterior') {
    return {
      etiqueta: `vs. ${etiquetaPeriodo(periodoComparado)} (mismo corte)`,
      criterio:
        'Flujo acumulado: se compara con el mismo corte del año anterior, no con el mes previo.',
    };
  }
  return {
    etiqueta: `vs. ${etiquetaPeriodo(periodoComparado)}`,
    criterio: 'Saldo: se compara con el periodo importado inmediatamente anterior.',
  };
}

export function textoMotivo(motivo: string | null | undefined): string | null {
  if (!motivo) return null;
  const mapa: Record<string, string> = {
    sin_cobertura_periodo_anterior: 'Sin boletín importado del periodo anterior.',
    base_cero: 'El periodo comparable no tiene valor: la variación no es calculable.',
    sin_datos_actuales: 'El periodo actual no tiene datos para este concepto.',
    mismo_mes_anio_anterior: 'Sin boletín del mismo mes del año anterior (flujo acumulado).',
    periodo_anterior: 'Sin periodo anterior importado para comparar.',
  };
  return mapa[motivo] ?? motivo;
}

export function etiquetaAcumulado(periodo: string): string {
  const [, mes] = periodo.split('-');
  return `Acumulado enero–${MESES_LARGOS[Number(mes) - 1] ?? mes}`;
}

/* ----------------------------------------------------------------- base 100 */

export interface ResultadoBase100 {
  series: SerieInstitucion[];
  base: string | null;
  motivo: string | null;
}

/**
 * Normaliza a base 100 **solo** si existe un periodo en el que todas las series
 * visibles tienen valor y no es cero. No se rellenan huecos ni se inventan
 * valores: los puntos sin dato siguen ausentes.
 */
export function calcularBase100(
  series: SerieInstitucion[],
  opciones: { soloMismoCorte?: boolean; mesReferencia?: number } = {},
): ResultadoBase100 {
  const conDatos = series.filter((serie) => serie.puntos.some((punto) => punto.valor !== null));
  if (conDatos.length === 0) {
    return { series: [], base: null, motivo: 'No hay series que normalizar.' };
  }

  const periodosComunes = conDatos[0]?.puntos.map((punto) => punto.periodo) ?? [];
  /** En flujos acumulados la base solo puede ser el mismo corte del año anterior. */
  const corteValido = (periodo: string) => {
    if (!opciones.soloMismoCorte) return true;
    const mes = Number(periodo.split('-')[1] ?? 0);
    return mes === (opciones.mesReferencia ?? 0);
  };
  const base = periodosComunes.filter(corteValido).find((periodo) =>
    conDatos.every((serie) => {
      const punto = serie.puntos.find((item) => item.periodo === periodo);
      return punto && punto.valor !== null && punto.valor !== 0;
    }),
  );

  if (!base) {
    return {
      series: [],
      base: null,
      motivo:
        'No hay un periodo con valor en todas las series comparadas: la base 100 no es válida para esta selección.',
    };
  }

  const normalizadas: SerieInstitucion[] = conDatos.map((serie) => {
    const referencia = serie.puntos.find((punto) => punto.periodo === base)?.valor ?? null;
    return {
      ...serie,
      puntos: serie.puntos.map((punto): PuntoSerie => ({
        ...punto,
        valor:
          punto.valor === null || referencia === null || referencia === 0
            ? null
            : (100 * punto.valor) / referencia,
      })),
    };
  });

  return { series: normalizadas, base, motivo: null };
}

/* ---------------------------------------------------------------- cuantiles */

/** Cuantil simple (interpolación lineal) para encuadres explícitos. */
export function cuantil(valores: number[], q: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const posicion = (ordenados.length - 1) * Math.min(1, Math.max(0, q));
  const inferior = Math.floor(posicion);
  const superior = Math.ceil(posicion);
  const peso = posicion - inferior;
  const a = ordenados[inferior] ?? 0;
  const b = ordenados[superior] ?? a;
  return a + (b - a) * peso;
}

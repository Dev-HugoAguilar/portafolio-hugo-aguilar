/**
 * Paleta y asignación de colores — utilidad única compartida por todas las vistas.
 *
 * Reglas vigentes (dirección visual aprobada):
 *  - **Estado inicial**: el ranking va con barras azules sólidas y el mapa de
 *    rentabilidad (dispersión) con todos sus puntos en el **mismo azul
 *    `#3458F5`**, con borde blanco fino para separar puntos próximos. No hay un
 *    color por institución cuando no hay comparación, y el mapa no tiene paleta
 *    propia: la toma del estado compartido.
 *  - **El «Sistema»** (agregado publicado por la CNBV) va siempre en naranja
 *    quemado `#C05621` y trazo discontinuo, en Crecimiento y en Importe: es el
 *    color exclusivo de la referencia del sector. No expresa alerta, pérdida ni
 *    valoración del desempeño; solo distingue el agregado de los bancos.
 *  - **Al comparar**: azul `#3458F5`, violeta `#8066E8` y turquesa `#087F8C` se
 *    asignan por orden de selección y se conservan mientras dure la comparación
 *    (quitar un banco no recolorea a los demás). Es el mismo par color/estilo en
 *    ranking, serie, dispersión, leyenda y tabla. El naranja del Sistema no entra
 *    en ese reparto: los bancos siguen usando azul, violeta y turquesa.
 *  - Los bancos fuera de la comparación quedan en **contexto neutro legible**.
 *  - A partir del cuarto banco se añade un estilo de trazo discontinuo y la
 *    etiqueta de la serie; solo se compara con color hasta seis bancos. No se
 *    agregan patrones a todo el universo ni se inventan tonos intermedios.
 */

import type { CSSProperties } from 'react';

export const PALETA = {
  bg: '#F7F8FC',
  surface: '#FFFFFF',
  text: '#111318',
  textSecondary: '#596273',
  border: '#DDE2EB',
  primary: '#3458F5',
  secondary: '#8066E8',
  teal: '#087F8C',
  /** Resaltado de controles (fondo) y separador de listas. */
  highlight: '#EEF1FF',
  /** Naranja quemado del agregado «Sistema»: color exclusivo de la referencia. */
  sistema: '#C05621',
  /** Contexto neutro legible (bancos fuera de la comparación). */
  neutro: '#C2CBDC',
  neutroHover: '#96A3BA',
  guia: '#E7EAF1',
  guiaFuerte: '#A9B3C6',
  banda: '#F5F7FB',
} as const;

/** Color de énfasis de cada vista cuando todavía no hay comparación. */
export const ACENTO = {
  ranking: PALETA.primary,
  /** El mapa de rentabilidad usa el mismo azul: no tiene paleta propia. */
  dispersion: PALETA.primary,
} as const;

export interface EstiloSerie {
  color: string;
  /** Trazo discontinuo para la cuarta comparación en adelante. */
  patron: string | null;
  /** Ranura de comparación (0…5); `null` si la institución no está comparada. */
  ranura: number | null;
}

/**
 * Ranuras de comparación: tres colores sólidos y los mismos tres en trazo
 * discontinuo. Seis bancos comparables con color propio y estable.
 */
export const RANURAS: ReadonlyArray<{ color: string; patron: string | null }> = [
  { color: PALETA.primary, patron: null },
  { color: PALETA.secondary, patron: null },
  { color: PALETA.teal, patron: null },
  { color: PALETA.primary, patron: '6 3' },
  { color: PALETA.secondary, patron: '6 3' },
  { color: PALETA.teal, patron: '6 3' },
];

/** Comparaciones con color propio; el resto queda en gris con su etiqueta. */
export const MAX_COMPARABLES = RANURAS.length;

export const SIN_COMPARACION: EstiloSerie = { color: PALETA.neutro, patron: null, ranura: null };

export function estiloPorRanura(ranura: number): EstiloSerie {
  const elegida = RANURAS[ranura];
  if (!elegida) return { ...SIN_COMPARACION, ranura };
  return { color: elegida.color, patron: elegida.patron, ranura };
}

/**
 * Recalcula las ranuras al cambiar la selección:
 *  - conserva la ranura de quien sigue comparado (el color no se mueve),
 *  - libera la de quien sale,
 *  - asigna a los nuevos la primera ranura libre, en orden de llegada.
 * A partir de `MAX_COMPARABLES` la institución sigue seleccionada pero pasa a
 * contexto neutro (sin color propio) para no inventar tonos.
 */
export function reasignarRanuras(
  anteriores: Record<string, number>,
  seleccion: string[],
): Record<string, number> {
  const usadas = new Set<number>();
  const siguientes: Record<string, number> = {};

  for (const id of seleccion) {
    const previa = anteriores[id];
    if (typeof previa === 'number' && previa < MAX_COMPARABLES && !usadas.has(previa)) {
      siguientes[id] = previa;
      usadas.add(previa);
    }
  }

  let siguiente = 0;
  for (const id of seleccion) {
    if (siguientes[id] !== undefined) continue;
    while (usadas.has(siguiente)) siguiente += 1;
    siguientes[id] = siguiente;
    if (siguiente < MAX_COMPARABLES) usadas.add(siguiente);
    siguiente += 1;
  }

  return siguientes;
}

/** Estilo de una institución según su ranura de comparación. */
export function estiloDe(id: string, ranuras: Record<string, number>): EstiloSerie {
  const ranura = ranuras[id];
  if (ranura === undefined) return SIN_COMPARACION;
  return estiloPorRanura(ranura);
}

/** Color de comparación (neutro si no está comparada). */
export function colorDe(id: string, ranuras: Record<string, number>): string {
  return estiloDe(id, ranuras).color;
}

/** Patrón de trazo de comparación (null si no aplica). */
export function patronDe(id: string, ranuras: Record<string, number>): string | null {
  return estiloDe(id, ranuras).patron;
}

export function mapaColores(ranuras: Record<string, number>): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const id of Object.keys(ranuras)) mapa.set(id, colorDe(id, ranuras));
  return mapa;
}

export function mapaPatrones(ranuras: Record<string, number>): Map<string, string | null> {
  const mapa = new Map<string, string | null>();
  for (const id of Object.keys(ranuras)) mapa.set(id, patronDe(id, ranuras));
  return mapa;
}

/**
 * Muestra pequeña (leyenda, tabla, panel): color plano o trazo segmentado, el
 * mismo lenguaje que el gráfico.
 */
export function estiloMuestra(color: string, patron: string | null): CSSProperties {
  if (!patron) return { background: color };
  return {
    background: `repeating-linear-gradient(90deg, ${color} 0 3px, rgba(255, 255, 255, 0.9) 3px 5px)`,
    boxShadow: `inset 0 0 0 1px ${color}`,
  };
}

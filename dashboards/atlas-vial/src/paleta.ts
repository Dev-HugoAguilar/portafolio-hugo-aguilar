/**
 * Paleta del tablero — una sola fuente para las tres vistas.
 *
 * Se reutilizan los tokens del portafolio (fondo claro, azul primario, violeta,
 * turquesa, grises de texto y bordes finos). Los dos colores semánticos del
 * Atlas son fijos y no dependen del orden de selección:
 *
 *  - **personas lesionadas** → turquesa `#087F8C`;
 *  - **personas fallecidas** → violeta profundo `#8066E8`.
 *
 * Los hechos (conteos de eventos) van en el azul primario. Las escalas del mapa
 * usan una rampa secuencial azul construida con el mismo azul, y la escala de
 * fallecimientos usa la rampa del violeta: el color nunca es el único canal —
 * siempre hay etiqueta, leyenda y valor numérico.
 */

export const PALETA = {
  bg: '#F7F8FC',
  surface: '#FFFFFF',
  text: '#111318',
  textSecondary: '#596273',
  border: '#DDE2EB',
  primary: '#3458F5',
  primaryHover: '#2745D7',
  violeta: '#8066E8',
  teal: '#087F8C',
  /** Tintes suaves para fondos de etiquetas y filas resaltadas. */
  tinteAzul: '#EEF1FF',
  tinteVioleta: '#F2EEFC',
  tinteTurquesa: '#E9F5F6',
  /** Contexto neutro legible (alcaldías y series fuera de foco). */
  neutro: '#C2CBDC',
  guia: '#E7EAF1',
  guiaFuerte: '#A9B3C6',
  banda: '#F5F7FB',
} as const;

/** Color semántico por métrica: el mismo en mapa, gráficas, leyenda y tabla. */
export const COLOR_METRICA = {
  hechos: PALETA.primary,
  personas_lesionadas: PALETA.teal,
  personas_fallecidas: PALETA.violeta,
} as const;

export type Metrica = keyof typeof COLOR_METRICA;

export const ETIQUETA_METRICA: Record<Metrica, string> = {
  hechos: 'Hechos',
  personas_lesionadas: 'Personas lesionadas',
  personas_fallecidas: 'Personas fallecidas',
};

/** Rampa secuencial para el coroplético (azul) y para fallecimientos (violeta). */
const RAMPA_AZUL = ['#EDF0FE', '#D5DCFD', '#B4C0FA', '#8C9DF5', '#6178EE', '#3458F5', '#2745D7'];
const RAMPA_VIOLETA = ['#F3EFFC', '#E3DAF8', '#CCBDF2', '#B29CEA', '#967FE2', '#8066E8', '#6349C9'];
const RAMPA_TURQUESA = ['#E8F5F6', '#CBE9EC', '#A3D8DE', '#71C1C9', '#3FA6B0', '#148793', '#087F8C'];

export function rampaDe(metrica: Metrica): readonly string[] {
  if (metrica === 'personas_fallecidas') return RAMPA_VIOLETA;
  if (metrica === 'personas_lesionadas') return RAMPA_TURQUESA;
  return RAMPA_AZUL;
}

/** Escala continua para los rellenos del mapa: 7 pasos discretos, legibles. */
export function colorDeRampa(metrica: Metrica, valor: number, maximo: number): string {
  const rampa = rampaDe(metrica);
  if (!maximo || valor <= 0) return PALETA.banda;
  const proporcion = Math.min(1, Math.max(0, valor / maximo));
  const indice = Math.min(rampa.length - 1, Math.floor(proporcion * (rampa.length - 1)));
  return rampa[indice] as string;
}

/* ---------------------------------------------------------------------------
 * Paleta propio del MAPA y de los rankings de alcaldías.
 *
 * Se declara aparte de `COLOR_METRICA` para no alterar el resto de las vistas:
 *  · hechos → azul;
 *  · personas lesionadas → ámbar oscuro (contraste 5,04:1 sobre blanco);
 *  · personas fallecidas → rojo (contraste 6,1:1 sobre blanco).
 * Cada métrica tiene su propia rampa secuencial de 7 pasos; el paso 0 es el
 * color del **cero** y los datos ausentes usan una trama neutra, nunca este paso.
 * ------------------------------------------------------------------------- */

const RAMPA_MAPA_AZUL = ['#EDF0FE', '#D5DCFD', '#B4C0FA', '#8C9DF5', '#6178EE', '#3458F5', '#2745D7'];
const RAMPA_MAPA_AMBAR = ['#FFF7E6', '#FDE9C4', '#F9D79A', '#F2BE68', '#E9A23B', '#C2700F', '#A85B0A'];
const RAMPA_MAPA_ROJO = ['#FDECEA', '#FAD4CF', '#F3B4AB', '#E98C80', '#DC6253', '#C63A2C', '#B42318'];

/** Relleno de la marca (barra, punto, muestra de leyenda) de cada métrica. */
export const RELLENO_MAPA: Record<Metrica, string> = {
  hechos: '#3458F5',
  personas_lesionadas: '#A85B0A',
  personas_fallecidas: '#B42318',
};

/** Unidad explícita de cada métrica, para rankings y leyendas. */
export const UNIDAD_METRICA: Record<Metrica, string> = {
  hechos: 'hechos',
  personas_lesionadas: 'personas',
  personas_fallecidas: 'personas',
};

export function rampaMapa(metrica: Metrica): readonly string[] {
  if (metrica === 'personas_fallecidas') return RAMPA_MAPA_ROJO;
  if (metrica === 'personas_lesionadas') return RAMPA_MAPA_AMBAR;
  return RAMPA_MAPA_AZUL;
}

/** Color del mapa para un valor concreto de la métrica activa. */
export function colorMapa(metrica: Metrica, valor: number, maximo: number): string {
  const rampa = rampaMapa(metrica);
  if (!maximo || valor <= 0) return rampa[0] as string;
  const proporcion = Math.min(1, Math.max(0, valor / maximo));
  const indice = Math.min(rampa.length - 1, Math.max(1, Math.round(proporcion * (rampa.length - 1))));
  return rampa[indice] as string;
}



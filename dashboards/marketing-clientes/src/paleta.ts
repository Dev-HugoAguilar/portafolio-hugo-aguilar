/**
 * Paleta y colores semánticos del tablero — una sola fuente.
 *
 * Se reutilizan los tokens del portafolio (fondo claro, azul primario, turquesa y
 * violeta como acentos, bordes finos). Los colores de las métricas son fijos y no
 * dependen del orden de selección:
 *
 *  - **usuarios** → azul primario;
 *  - **sesiones** → turquesa;
 *  - **compras / ingresos** → violeta;
 *  - **sin datos / sin información** → gris de contexto.
 *
 * El color nunca es el único canal: siempre hay etiqueta, leyenda y cifra, y los
 * estados «sin datos» se escriben, no se colorean de cero.
 */

export const PALETA = {
  bg: '#F7F8FC',
  surface: '#FFFFFF',
  text: '#111318',
  textSecondary: '#596273',
  border: '#DDE2EB',
  primary: '#3458F5',
  primaryHover: '#2745D7',
  teal: '#087F8C',
  violeta: '#8066E8',
  tinteAzul: '#EEF1FF',
  tinteTeal: '#E9F5F6',
  tinteVioleta: '#F2EEFC',
  neutro: '#C2CBDC',
  /** Gris de «Sin información»: categoría explícita, no ausencia de dato. */
  gris: '#8A93A6',
  guia: '#E7EAF1',
  guiaFuerte: '#A9B3C6',
  banda: '#F5F7FB',
  /** Aviso de datos pendientes (no es una alerta de error del producto). */
  aviso: '#8A5B12',
  tinteAviso: '#FBF3E4',
} as const;

export type Metrica = 'usuarios' | 'sesiones' | 'compras' | 'ingresos';

export const COLOR_METRICA: Record<Metrica, string> = {
  usuarios: PALETA.primary,
  sesiones: PALETA.teal,
  compras: PALETA.violeta,
  ingresos: PALETA.violeta,
};

export const ETIQUETA_METRICA: Record<Metrica, string> = {
  usuarios: 'Usuarios',
  sesiones: 'Sesiones',
  compras: 'Compras',
  ingresos: 'Ingresos (USD)',
};

/** Pasos del embudo, con el color que se conserva en todas las vistas. */
export const COLOR_PASO = [
  PALETA.primary,
  '#4A6BF7',
  '#6E86F2',
  PALETA.violeta,
] as const;

/** Rampa secuencial de la matriz de cohortes (azul → turquesa). */
const RAMPA_RETENCION = ['#EEF1FF', '#D8DEFA', '#B7C4F2', '#8FAAE6', '#5F8FB8', '#2E7E8A', '#087F8C'];

export function colorRetencion(valor: number | null, maximo: number): string {
  if (valor === null || maximo <= 0) return PALETA.banda;
  const proporcion = Math.min(1, Math.max(0, valor / maximo));
  const indice = Math.min(RAMPA_RETENCION.length - 1, Math.floor(proporcion * (RAMPA_RETENCION.length - 1)));
  return RAMPA_RETENCION[indice] as string;
}

/** Contraste del texto sobre la celda de retención. */
export function textoRetencion(valor: number | null, maximo: number): string {
  if (valor === null || maximo <= 0) return PALETA.textSecondary;
  return valor / maximo > 0.55 ? '#FFFFFF' : PALETA.text;
}

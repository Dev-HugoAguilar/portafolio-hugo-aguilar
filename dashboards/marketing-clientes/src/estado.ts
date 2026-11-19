/**
 * Estado de la aplicación (Zustand).
 *
 * Un solo estado para las cuatro vistas: filtros, vista visible, dimensión de la
 * matriz de cohortes y estado de la tabla. La URL es una proyección del estado, de
 * modo que un enlace compartido abre el mismo tablero.
 *
 * El **resaltado** (hover o foco) no forma parte de los filtros y nunca dispara
 * consultas.
 */

import { create } from 'zustand';

import { FILTROS_VACIOS, type Filtros } from './dominio';

export type Vista = 'resumen' | 'adquisicion' | 'conversion' | 'cohortes';
export type DimensionCohorte = 'canal' | 'dispositivo' | 'pais';

export interface EstadoApp {
  vista: Vista;
  filtros: Filtros;
  dimensionCohorte: DimensionCohorte;
  /** Curvas de cohortes elegidas a mano; null = selección automática. */
  seleccionCurvas: string[] | null;
  orden: string;
  sentido: 'asc' | 'desc';
  pagina: number;
  tamano: number;
  resaltado: string | null;
  periodoObservado: { desde: string | null; hasta: string | null };
}

interface Acciones {
  iniciar: (valores: Partial<EstadoApp>) => void;
  setVista: (vista: Vista) => void;
  setDimensionCohorte: (dimension: DimensionCohorte) => void;
  setSeleccionCurvas: (valores: string[] | null) => void;
  setPeriodo: (desde: string | null, hasta: string | null) => void;
  alternarValor: (clave: 'canales' | 'dispositivos' | 'paises', valor: string) => void;
  limpiarDimension: (clave: 'canales' | 'dispositivos' | 'paises') => void;
  setBusqueda: (texto: string) => void;
  setOrden: (orden: string) => void;
  setPagina: (pagina: number) => void;
  setTamanoPagina: (tamano: number) => void;
  setResaltado: (valor: string | null) => void;
  restablecer: () => void;
}

const estadoInicial: EstadoApp = {
  vista: 'resumen',
  filtros: { ...FILTROS_VACIOS },
  dimensionCohorte: 'canal',
  seleccionCurvas: null,
  orden: 'fecha',
  sentido: 'desc',
  pagina: 1,
  tamano: 10,
  resaltado: null,
  periodoObservado: { desde: null, hasta: null },
};

const REINICIO_TABLA = { pagina: 1 } as const;

export const useAppStore = create<EstadoApp & Acciones>((set, get) => ({
  ...estadoInicial,

  iniciar: (valores) => {
    const estado = get();
    if (estado.periodoObservado.desde) return;
    set({ ...estadoInicial, ...valores, resaltado: null });
  },

  setVista: (vista) => set({ vista }),

  setDimensionCohorte: (dimensionCohorte) => set({ dimensionCohorte, seleccionCurvas: null }),
  setSeleccionCurvas: (seleccionCurvas) => set({ seleccionCurvas }),

  setPeriodo: (desde, hasta) =>
    set((estado) => ({ filtros: { ...estado.filtros, desde, hasta }, ...REINICIO_TABLA })),

  alternarValor: (clave, valor) =>
    set((estado) => {
      const actuales = estado.filtros[clave];
      const siguientes = actuales.includes(valor)
        ? actuales.filter((item) => item !== valor)
        : [...actuales, valor];
      return { filtros: { ...estado.filtros, [clave]: siguientes }, ...REINICIO_TABLA };
    }),

  limpiarDimension: (clave) =>
    set((estado) => ({ filtros: { ...estado.filtros, [clave]: [] }, ...REINICIO_TABLA })),

  setBusqueda: (buscar) => set((estado) => ({ filtros: { ...estado.filtros, buscar }, ...REINICIO_TABLA })),

  setOrden: (orden) =>
    set((estado) => ({
      orden,
      sentido: estado.orden === orden && estado.sentido === 'desc' ? 'asc' : 'desc',
      pagina: 1,
    })),

  setPagina: (pagina) => set({ pagina }),
  setTamanoPagina: (tamano) => set({ tamano, pagina: 1 }),

  setResaltado: (resaltado) => set({ resaltado }),

  restablecer: () =>
    set((estado) => ({
      filtros: { ...FILTROS_VACIOS },
      pagina: 1,
      resaltado: null,
      periodoObservado: estado.periodoObservado,
    })),
}));

/* ------------------------------------------------------------------ URL --- */

const PREFIJO = 'mk_';

export function estadoAUrl(estado: EstadoApp): string {
  const params = new URLSearchParams();
  params.set(`${PREFIJO}v`, estado.vista);
  if (estado.dimensionCohorte !== 'canal') params.set(`${PREFIJO}d`, estado.dimensionCohorte);

  const { filtros } = estado;
  if (filtros.desde) params.set(`${PREFIJO}desde`, filtros.desde);
  if (filtros.hasta) params.set(`${PREFIJO}hasta`, filtros.hasta);
  for (const valor of filtros.canales) params.append(`${PREFIJO}canal`, valor);
  for (const valor of filtros.dispositivos) params.append(`${PREFIJO}disp`, valor);
  for (const valor of filtros.paises) params.append(`${PREFIJO}pais`, valor);
  if (filtros.buscar.trim()) params.set(`${PREFIJO}q`, filtros.buscar.trim());

  if (estado.orden !== 'fecha') params.set(`${PREFIJO}orden`, estado.orden);
  if (estado.sentido !== 'desc') params.set(`${PREFIJO}sentido`, estado.sentido);
  if (estado.pagina > 1) params.set(`${PREFIJO}pagina`, String(estado.pagina));
  return params.toString();
}

/** Escribe el estado en la URL sin recargar ni interferir con el enrutador. */
export function sincronizarUrl(estado: EstadoApp): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const clave of [...url.searchParams.keys()]) {
    if (clave.startsWith(PREFIJO)) url.searchParams.delete(clave);
  }
  for (const [clave, valor] of new URLSearchParams(estadoAUrl(estado))) {
    url.searchParams.append(clave, valor);
  }
  const siguiente = `${url.pathname}${url.search}${url.hash}`;
  const actual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (siguiente === actual) return;
  window.history.replaceState(window.history.state, '', siguiente);
}

export function enlaceCompartible(estado: EstadoApp): string {
  const url = new URL(window.location.href);
  for (const clave of [...url.searchParams.keys()]) {
    if (clave.startsWith(PREFIJO)) url.searchParams.delete(clave);
  }
  for (const [clave, valor] of new URLSearchParams(estadoAUrl(estado))) {
    url.searchParams.append(clave, valor);
  }
  return url.toString();
}

export function estadoDesdeUrl(): Partial<EstadoApp> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const leer = (clave: string): string | null => params.get(`${PREFIJO}${clave}`);
  if (![...params.keys()].some((clave) => clave.startsWith(PREFIJO))) return null;

  const lista = (clave: string): string[] => params.getAll(`${PREFIJO}${clave}`).filter(Boolean);
  const vista = leer('v');
  const dimension = leer('d');
  const orden = leer('orden');
  const sentido = leer('sentido');
  const pagina = Number(leer('pagina') ?? 1);

  return {
    vista:
      vista === 'adquisicion' || vista === 'conversion' || vista === 'cohortes' ? vista : 'resumen',
    dimensionCohorte:
      dimension === 'dispositivo' || dimension === 'pais' ? dimension : 'canal',
    filtros: {
      desde: leer('desde'),
      hasta: leer('hasta'),
      canales: lista('canal'),
      dispositivos: lista('disp'),
      paises: lista('pais'),
      buscar: leer('q') ?? '',
    },
    orden: orden ?? 'fecha',
    sentido: sentido === 'asc' ? 'asc' : 'desc',
    pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
  };
}

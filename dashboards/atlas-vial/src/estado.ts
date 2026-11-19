/**
 * Estado de la aplicación (Zustand).
 *
 * Hay **una sola representación del estado** para las tres vistas: los filtros
 * viven aquí, no en cada componente, así que el mapa, la serie, las
 * distribuciones, la tabla y la exportación piden siempre el mismo subconjunto.
 *
 * Además del estado persistente guarda:
 *  - el **resaltado** (hover o foco): no forma parte de los filtros y nunca
 *    dispara consultas nuevas;
 *  - la **vista visible** y el modo del mapa;
 *  - la selección de alcaldía y de hecho (alimenta el panel contextual);
 *  - el estado heredado de la tabla retirada (orden, sentido, página, tamaño),
 *
 * La URL es una proyección del estado: se escribe con `history.replaceState` y
 * se lee al montar, para que un enlace compartido abra el mismo tablero.
 */

import { create } from 'zustand';

import type { Metrica } from './paleta';
import {
  FILTROS_VACIOS,
  type Filtros,
  etiquetaFecha,
  etiquetaRango,
} from './dominio';

export type Vista = 'territorio' | 'tiempo' | 'personas';
export type ModoMapa = 'alcaldias' | 'concentracion' | 'eventos';
export type Agregacion = 'dia' | 'semana' | 'mes';

export interface EstadoApp {
  vista: Vista;
  filtros: Filtros;
  modoMapa: ModoMapa;
  metricaMapa: Metrica;
  agregacion: Agregacion;
  alcaldiaSeleccionada: string | null;
  folioSeleccionado: string | null;
  orden: string;
  sentido: 'asc' | 'desc';
  pagina: number;
  tamano: number;
  resaltado: string | null;
  /** Periodo publicado por la fuente (se fija al cargar el catálogo). */
  periodoPublicado: { desde: string | null; hasta: string | null };
}

interface Acciones {
  iniciar: (valores: Partial<EstadoApp>) => void;
  setVista: (vista: Vista) => void;
  setModoMapa: (modo: ModoMapa) => void;
  setMetricaMapa: (metrica: Metrica) => void;
  setAgregacion: (agregacion: Agregacion) => void;
  setFiltro: <K extends keyof Filtros>(clave: K, valor: Filtros[K]) => void;
  alternarValor: (
    clave: 'alcaldias' | 'tiposEvento' | 'consecuencias' | 'tiposUsuario' | 'tiposVehiculo' | 'vialidades' | 'semaforizada' | 'sexos',
    valor: string,
  ) => void;
  limpiarDimension: (
    clave: 'alcaldias' | 'tiposEvento' | 'consecuencias' | 'tiposUsuario' | 'tiposVehiculo' | 'vialidades' | 'semaforizada' | 'sexos',
  ) => void;
  setPeriodo: (desde: string | null, hasta: string | null) => void;
  /** Activa o desactiva el recorte por la zona visible del mapa. */
  alternarZonaVisible: (bbox: string | null) => void;
  seleccionarAlcaldia: (alcaldia: string | null) => void;
  seleccionarFolio: (folio: string | null) => void;
  setOrden: (orden: string) => void;
  setPagina: (pagina: number) => void;
  setTamano: (tamano: number) => void;
  setResaltado: (valor: string | null) => void;
  restablecerFiltros: () => void;
}

const estadoInicial: EstadoApp = {
  vista: 'territorio',
  filtros: { ...FILTROS_VACIOS },
  modoMapa: 'alcaldias',
  metricaMapa: 'hechos',
  agregacion: 'mes',
  alcaldiaSeleccionada: null,
  folioSeleccionado: null,
  orden: 'fecha',
  sentido: 'desc',
  pagina: 1,
  tamano: 25,
  resaltado: null,
  periodoPublicado: { desde: null, hasta: null },
};

/** Cualquier cambio de filtros vuelve a la primera página (estado heredado). */
const REINICIO_TABLA = { pagina: 1 } as const;

export const useAppStore = create<EstadoApp & Acciones>((set, get) => ({
  ...estadoInicial,

  iniciar: (valores) => {
    const estado = get();
    // Solo se aplica una vez (al montar el módulo).
    if (estado.periodoPublicado.desde) return;
    set({ ...estadoInicial, ...valores, resaltado: null });
  },

  setVista: (vista) => set({ vista }),

  setModoMapa: (modoMapa) => set({ modoMapa }),

  setMetricaMapa: (metricaMapa) => set({ metricaMapa }),

  setAgregacion: (agregacion) => set({ agregacion }),

  setFiltro: (clave, valor) =>
    set((estado) => ({ filtros: { ...estado.filtros, [clave]: valor }, ...REINICIO_TABLA })),

  alternarValor: (clave, valor) =>
    set((estado) => {
      const actuales = estado.filtros[clave];
      const siguientes = actuales.includes(valor)
        ? actuales.filter((item) => item !== valor)
        : [...actuales, valor];
      return {
        filtros: { ...estado.filtros, [clave]: siguientes },
        ...REINICIO_TABLA,
        // Quitar la alcaldía del filtro invalida la selección del panel.
        alcaldiaSeleccionada:
          clave === 'alcaldias' && estado.alcaldiaSeleccionada && !siguientes.includes(estado.alcaldiaSeleccionada)
            ? null
            : estado.alcaldiaSeleccionada,
      };
    }),

  limpiarDimension: (clave) =>
    set((estado) => ({
      filtros: { ...estado.filtros, [clave]: [] },
      ...REINICIO_TABLA,
      alcaldiaSeleccionada: clave === 'alcaldias' ? null : estado.alcaldiaSeleccionada,
    })),

  setPeriodo: (desde, hasta) =>
    set((estado) => ({
      filtros: { ...estado.filtros, desde, hasta },
      ...REINICIO_TABLA,
    })),

  alternarZonaVisible: (bbox) =>
    set((estado) => {
      const activa = estado.filtros.filtrarPorZona;
      return {
        filtros: {
          ...estado.filtros,
          filtrarPorZona: !activa,
          // Al desactivar se olvida la caja: no vuelve a aplicarse por sorpresa.
          bbox: activa ? null : bbox,
        },
        ...REINICIO_TABLA,
      };
    }),

  seleccionarAlcaldia: (alcaldiaSeleccionada) =>
    set({ alcaldiaSeleccionada, folioSeleccionado: null }),

  seleccionarFolio: (folioSeleccionado) => set({ folioSeleccionado }),

  setOrden: (orden) =>
    set((estado) => ({
      orden,
      sentido: estado.orden === orden && estado.sentido === 'desc' ? 'asc' : 'desc',
      pagina: 1,
    })),

  setPagina: (pagina) => set({ pagina }),

  setTamano: (tamano) => set({ tamano, pagina: 1 }),

  setResaltado: (resaltado) => set({ resaltado }),

  restablecerFiltros: () =>
    set((estado) => ({
      filtros: { ...FILTROS_VACIOS },
      alcaldiaSeleccionada: null,
      folioSeleccionado: null,
      pagina: 1,
      resaltado: null,
      periodoPublicado: estado.periodoPublicado,
    })),
}));

/* ------------------------------------------------------------------ URL --- */

const PREFIJO = 'at_';

const CLAVES_FILTRO: Record<string, keyof Filtros> = {
  alcaldia: 'alcaldias',
  tipo_evento: 'tiposEvento',
  consecuencia: 'consecuencias',
  tipo_usuario: 'tiposUsuario',
  tipo_vehiculo: 'tiposVehiculo',
  vialidad: 'vialidades',
  semaforizada: 'semaforizada',
  sexo: 'sexos',
};

/** Proyecta el estado en la barra de consulta de la URL (sin tocar el hash). */
export function estadoAUrl(estado: EstadoApp): string {
  const params = new URLSearchParams();
  params.set(`${PREFIJO}v`, estado.vista);
  params.set(`${PREFIJO}m`, estado.modoMapa);
  params.set(`${PREFIJO}met`, estado.metricaMapa);
  if (estado.agregacion !== 'mes') params.set(`${PREFIJO}ag`, estado.agregacion);

  const { filtros } = estado;
  if (filtros.desde) params.set(`${PREFIJO}desde`, filtros.desde);
  if (filtros.hasta) params.set(`${PREFIJO}hasta`, filtros.hasta);
  for (const [clave, campo] of Object.entries(CLAVES_FILTRO)) {
    for (const valor of filtros[campo] as string[]) {
      params.append(`${PREFIJO}${clave}`, valor);
    }
  }
  if (filtros.edadMin !== null) params.set(`${PREFIJO}emin`, String(filtros.edadMin));
  if (filtros.edadMax !== null) params.set(`${PREFIJO}emax`, String(filtros.edadMax));
  if (filtros.filtrarPorZona && filtros.bbox) params.set(`${PREFIJO}zona`, filtros.bbox);

  if (estado.alcaldiaSeleccionada) params.set(`${PREFIJO}sel`, estado.alcaldiaSeleccionada);
  if (estado.folioSeleccionado) params.set(`${PREFIJO}folio`, estado.folioSeleccionado);
  if (estado.orden !== 'fecha') params.set(`${PREFIJO}orden`, estado.orden);
  if (estado.sentido !== 'desc') params.set(`${PREFIJO}sentido`, estado.sentido);
  if (estado.pagina > 1) params.set(`${PREFIJO}pagina`, String(estado.pagina));
  return params.toString();
}

/** Escribe el estado en la URL sin recargar ni interferir con el enrutador. */
export function sincronizarUrl(estado: EstadoApp): void {
  if (typeof window === 'undefined') return;
  const consulta = estadoAUrl(estado);
  const url = new URL(window.location.href);
  // Se retiran solo los parámetros de este módulo y se conservan los demás.
  for (const clave of [...url.searchParams.keys()]) {
    if (clave.startsWith(PREFIJO)) url.searchParams.delete(clave);
  }
  for (const [clave, valor] of new URLSearchParams(consulta)) {
    url.searchParams.append(clave, valor);
  }
  const siguiente = `${url.pathname}${url.search}${url.hash}`;
  const actual = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (siguiente === actual) return;
  window.history.replaceState(window.history.state, '', siguiente);
}

/** Enlace absoluto que reproduce el estado actual (para «Copiar enlace»). */
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

/** Lee el estado desde la URL (si el enlace venía con filtros aplicados). */
export function estadoDesdeUrl(): Partial<EstadoApp> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const leer = (clave: string): string | null => params.get(`${PREFIJO}${clave}`);
  if (![...params.keys()].some((clave) => clave.startsWith(PREFIJO))) return null;

  const lista = (clave: string): string[] =>
    params.getAll(`${PREFIJO}${clave}`).filter(Boolean);

  const filtros: Filtros = {
    ...FILTROS_VACIOS,
    desde: leer('desde'),
    hasta: leer('hasta'),
    alcaldias: lista('alcaldia'),
    tiposEvento: lista('tipo_evento'),
    consecuencias: lista('consecuencia'),
    tiposUsuario: lista('tipo_usuario'),
    tiposVehiculo: lista('tipo_vehiculo'),
    vialidades: lista('vialidad'),
    semaforizada: lista('semaforizada'),
    sexos: lista('sexo'),
    edadMin: leer('emin') ? Number(leer('emin')) : null,
    edadMax: leer('emax') ? Number(leer('emax')) : null,
    bbox: leer('zona'),
    filtrarPorZona: Boolean(leer('zona')),
  };

  const vista = leer('v');
  const modo = leer('m');
  const metrica = leer('met');
  const agregacion = leer('ag');
  const orden = leer('orden');
  const sentido = leer('sentido');
  const pagina = Number(leer('pagina') ?? 1);

  return {
    vista: vista === 'tiempo' || vista === 'personas' ? vista : 'territorio',
    modoMapa:
      modo === 'concentracion' || modo === 'eventos' ? modo : 'alcaldias',
    metricaMapa:
      metrica === 'personas_lesionadas' || metrica === 'personas_fallecidas'
        ? metrica
        : 'hechos',
    agregacion: agregacion === 'dia' || agregacion === 'semana' ? agregacion : 'mes',
    filtros,
    alcaldiaSeleccionada: leer('sel'),
    folioSeleccionado: leer('folio'),
    orden: orden ?? 'fecha',
    sentido: sentido === 'asc' ? 'asc' : 'desc',
    pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
  };
}

/** Descripción legible de los filtros vigentes (para el encabezado y pruebas). */
export function textoFiltros(filtros: Filtros): string {
  const partes = [etiquetaRango(filtros.desde, filtros.hasta)];
  if (filtros.alcaldias.length === 1) partes.push(filtros.alcaldias[0] as string);
  else if (filtros.alcaldias.length > 1) partes.push(`${filtros.alcaldias.length} alcaldías`);
  if (filtros.tiposEvento.length > 0) partes.push(filtros.tiposEvento.join(' · '));
  if (filtros.filtrarPorZona) partes.push('zona visible del mapa');
  return partes.join(' · ');
}

/** Fecha del día, en formato corto, para sellar la consulta. */
export function hoy(): string {
  return etiquetaFecha(new Date().toISOString().slice(0, 10));
}



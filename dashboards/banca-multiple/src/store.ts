/**
 * Estado de interacción y filtros (Zustand).
 *
 * Un único almacén para toda la aplicación:
 *  - filtros persistentes: periodo de referencia, concepto e instituciones;
 *  - **ranuras de comparación** (ver `colors.ts`): azul, violeta y turquesa se
 *    asignan por orden de selección y se conservan mientras dure la comparación;
 *    no dependen del ranking, del periodo ni del orden de la tabla;
 *  - estado temporal: institución resaltada (hover/foco) y ventana de la serie;
 *  - historial de selecciones para deshacer.
 *
 * El resaltado **no** forma parte del historial ni de las claves de consulta:
 * pasar el cursor nunca dispara peticiones ni cambia los filtros.
 */

import { create } from 'zustand';

import { reasignarRanuras } from './colors';

export type Ventana = [string, string] | null;

/** Fechas de la comparación entre cortes (panel de crecimiento y hallazgos). */
export type FechasComparacion = { desde: string; hasta: string } | null;

export interface Instantanea {
  periodo: string;
  concepto: string;
  instituciones: string[];
  ranuras: Record<string, number>;
  ventana: Ventana;
  comparacion: FechasComparacion;
}

export interface EstadoApp extends Instantanea {
  /** Institución bajo el cursor o con el foco (resaltado temporal). */
  resaltado: string | null;
  /** Pila de estados anteriores (sin incluir el actual). */
  historial: Instantanea[];
  /** Concepto y periodo por omisión del catálogo, para «Restablecer». */
  omision: { periodo: string; concepto: string } | null;
}

interface Acciones {
  iniciar: (valores: {
    periodo: string;
    concepto: string;
    instituciones: string[];
    ventana?: Ventana;
    omision: { periodo: string; concepto: string };
  }) => void;

  setPeriodo: (periodo: string) => void;
  setConcepto: (concepto: string) => void;
  alternarInstitucion: (institucionId: string) => void;
  setInstituciones: (ids: string[] | ((previas: string[]) => string[])) => void;
  setVentana: (ventana: Ventana) => void;
  setComparacion: (comparacion: FechasComparacion) => void;
  setResaltado: (institucionId: string | null) => void;
  deshacer: () => void;
  restablecer: () => void;
}

const CLAVE_ALMACEN = 'portafolio.banca-multiple.estado.v4';
const MAX_HISTORIAL = 40;

const estadoInicial: EstadoApp = {
  periodo: '',
  concepto: '',
  instituciones: [],
  ranuras: {},
  ventana: null,
  comparacion: null,
  resaltado: null,
  historial: [],
  omision: null,
};

function instantanea(estado: EstadoApp): Instantanea {
  return {
    periodo: estado.periodo,
    concepto: estado.concepto,
    instituciones: [...estado.instituciones],
    ranuras: { ...estado.ranuras },
    ventana: estado.ventana ? ([...estado.ventana] as Ventana) : null,
    comparacion: estado.comparacion ? { ...estado.comparacion } : null,
  };
}

function leerRecordado(): Instantanea | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE_ALMACEN);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as Partial<Instantanea>;
    if (typeof datos.periodo !== 'string' || typeof datos.concepto !== 'string') return null;
    const instituciones = Array.isArray(datos.instituciones)
      ? datos.instituciones.filter((id): id is string => typeof id === 'string')
      : [];
    const ranuras: Record<string, number> = {};
    if (datos.ranuras && typeof datos.ranuras === 'object') {
      for (const [id, valor] of Object.entries(datos.ranuras)) {
        if (typeof valor === 'number') ranuras[id] = valor;
      }
    }
    const ventana =
      Array.isArray(datos.ventana) && datos.ventana.length === 2
        ? ([String(datos.ventana[0]), String(datos.ventana[1])] as Ventana)
        : null;
    const comparacion =
      datos.comparacion && typeof datos.comparacion.desde === 'string' && typeof datos.comparacion.hasta === 'string'
        ? { desde: datos.comparacion.desde, hasta: datos.comparacion.hasta }
        : null;
    return {
      periodo: datos.periodo,
      concepto: datos.concepto,
      instituciones,
      ranuras,
      ventana,
      comparacion,
    };
  } catch {
    return null;
  }
}

function recordar(estado: EstadoApp): void {
  try {
    window.sessionStorage.setItem(CLAVE_ALMACEN, JSON.stringify(instantanea(estado)));
  } catch {
    /* almacenamiento no disponible: el estado vive en memoria */
  }
}

/** Aplica un cambio persistente guardando el anterior en el historial. */
function conHistorial(estado: EstadoApp, cambios: Partial<Instantanea>): Partial<EstadoApp> {
  const anterior = instantanea(estado);
  const siguiente: EstadoApp = { ...estado, ...cambios };
  const sinCambio =
    anterior.periodo === siguiente.periodo &&
    anterior.concepto === siguiente.concepto &&
    anterior.ventana?.[0] === siguiente.ventana?.[0] &&
    anterior.ventana?.[1] === siguiente.ventana?.[1] &&
    anterior.comparacion?.desde === siguiente.comparacion?.desde &&
    anterior.comparacion?.hasta === siguiente.comparacion?.hasta &&
    anterior.instituciones.join('|') === siguiente.instituciones.join('|');
  if (sinCambio) return {};

  const historial = [...estado.historial, anterior].slice(-MAX_HISTORIAL);
  recordar({ ...siguiente, historial });
  return { ...cambios, historial };
}

export const useAppStore = create<EstadoApp & Acciones>((set, get) => ({
  ...estadoInicial,

  iniciar: ({ periodo, concepto, instituciones, ventana = null, omision }) => {
    const recordado = leerRecordado();
    const estado = get();
    // Solo se restaura la primera vez (al montar el módulo).
    if (estado.periodo) return;
    const valido = recordado && recordado.periodo && recordado.concepto ? recordado : null;
    set({
      ...estadoInicial,
      omision,
      periodo: valido?.periodo ?? periodo,
      concepto: valido?.concepto ?? concepto,
      instituciones: valido?.instituciones ?? instituciones,
      ranuras: valido?.ranuras ?? {},
      ventana: valido?.ventana ?? ventana,
      comparacion: valido?.comparacion ?? null,
    });
  },

  setPeriodo: (periodo) => set((estado) => conHistorial(estado, { periodo })),

  setConcepto: (concepto) => set((estado) => conHistorial(estado, { concepto })),

  alternarInstitucion: (institucionId) =>
    set((estado) => {
      const instituciones = estado.instituciones.includes(institucionId)
        ? estado.instituciones.filter((id) => id !== institucionId)
        : [...estado.instituciones, institucionId];
      // La ranura de color se conserva al quitar otros bancos: no se recolorea.
      return conHistorial(estado, {
        instituciones,
        ranuras: reasignarRanuras(estado.ranuras, instituciones),
      });
    }),

  setInstituciones: (ids) =>
    set((estado) => {
      const instituciones = [...new Set(typeof ids === 'function' ? ids(estado.instituciones) : ids)];
      return conHistorial(estado, {
        instituciones,
        ranuras: reasignarRanuras(estado.ranuras, instituciones),
      });
    }),

  setVentana: (ventana) => set((estado) => conHistorial(estado, { ventana })),

  setComparacion: (comparacion) => set((estado) => conHistorial(estado, { comparacion })),

  setResaltado: (institucionId) => set({ resaltado: institucionId }),

  deshacer: () =>
    set((estado) => {
      const anterior = estado.historial[estado.historial.length - 1];
      if (!anterior) return {};
      const historial = estado.historial.slice(0, -1);
      const cambios: Partial<Instantanea> = {
        periodo: anterior.periodo,
        concepto: anterior.concepto,
        instituciones: anterior.instituciones,
        ranuras: reasignarRanuras(estado.ranuras, anterior.instituciones),
        ventana: anterior.ventana,
      };
      const siguiente = { ...estado, ...cambios, historial };
      recordar(siguiente);
      return { ...cambios, historial };
    }),

  restablecer: () =>
    set((estado) => {
      const omision = estado.omision;
      return conHistorial(estado, {
        periodo: omision?.periodo || estado.periodo,
        concepto: omision?.concepto || estado.concepto,
        instituciones: [],
        ranuras: {},
        ventana: null,
      });
    }),
}));

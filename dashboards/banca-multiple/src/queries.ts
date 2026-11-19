/**
 * Consultas con TanStack Query.
 *
 * Reglas:
 *  - **Todas** las claves incluyen los filtros que afectan a la respuesta
 *    (periodo, concepto e instituciones seleccionadas).
 *  - `signal` se propaga al `fetch`, así una consulta obsoleta se cancela cuando
 *    cambia la clave.
 *  - El resumen nunca se filtra por institución: el universo de comparación
 *    (ranking y dispersión) se mantiene estable al seleccionar bancos.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { Cliente } from './api/client';
import { crearCliente } from './api/client';
import type { Catalogo, Detalle, Indicadores, Resumen, Series } from './api/types';

let clienteActual: Cliente | null = null;
let baseActual = '';

/** Cliente único por base de API (se recrea si cambia la base). */
export function obtenerCliente(apiBase: string): Cliente {
  if (!clienteActual || baseActual !== apiBase) {
    clienteActual = crearCliente(apiBase);
    baseActual = apiBase;
  }
  return clienteActual;
}

export function claveInstituciones(instituciones: string[]): string {
  return [...instituciones].sort().join('|');
}

export const clavesConsulta = {
  catalogo: () => ['catalogo'] as const,
  resumen: (periodo: string, concepto: string) => ['resumen', periodo, concepto] as const,
  series: (concepto: string, instituciones: string[]) =>
    ['series', concepto, claveInstituciones(instituciones)] as const,
  indicadores: (periodo: string) => ['indicadores', periodo] as const,
  detalle: (periodo: string, concepto: string, instituciones: string[]) =>
    ['detalle', periodo, concepto, claveInstituciones(instituciones)] as const,
};

const TIEMPO_ESTABLE = 5 * 60 * 1000;

export function useCatalogo(cliente: Cliente) {
  return useQuery<Catalogo>({
    queryKey: clavesConsulta.catalogo(),
    queryFn: ({ signal }) => cliente.catalogo(signal),
    staleTime: Infinity,
    retry: 1,
  });
}

export function useResumen(cliente: Cliente, periodo: string, concepto: string, habilitado = true) {
  return useQuery<Resumen>({
    queryKey: clavesConsulta.resumen(periodo, concepto),
    queryFn: ({ signal }) =>
      cliente.resumen({ periodo, concepto, instituciones: [] }, signal),
    enabled: habilitado && Boolean(periodo) && Boolean(concepto),
    staleTime: TIEMPO_ESTABLE,
    placeholderData: keepPreviousData,
  });
}

export function useSeries(cliente: Cliente, concepto: string, instituciones: string[], habilitado = true) {
  return useQuery<Series>({
    queryKey: clavesConsulta.series(concepto, instituciones),
    queryFn: ({ signal }) => cliente.series({ concepto, instituciones }, signal),
    enabled: habilitado && Boolean(concepto),
    staleTime: TIEMPO_ESTABLE,
    placeholderData: keepPreviousData,
  });
}

export function useIndicadores(cliente: Cliente, periodo: string, habilitado = true) {
  return useQuery<Indicadores>({
    queryKey: clavesConsulta.indicadores(periodo),
    queryFn: ({ signal }) => cliente.indicadores({ periodo }, signal),
    enabled: habilitado && Boolean(periodo),
    staleTime: TIEMPO_ESTABLE,
    placeholderData: keepPreviousData,
  });
}

/** Detalle: se piden todas las filas del filtro (≤ 200) para ordenar en la tabla. */
export function useDetalle(
  cliente: Cliente,
  periodo: string,
  concepto: string,
  instituciones: string[],
  habilitado = true,
) {
  return useQuery<Detalle>({
    queryKey: clavesConsulta.detalle(periodo, concepto, instituciones),
    queryFn: ({ signal }) =>
      cliente.detalle(
        { periodo, concepto, instituciones, page: 1, pageSize: 200, orden: 'valor' },
        signal,
      ),
    enabled: habilitado && Boolean(periodo) && Boolean(concepto),
    staleTime: TIEMPO_ESTABLE,
    placeholderData: keepPreviousData,
  });
}

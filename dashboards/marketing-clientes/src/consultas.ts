/** Consultas (TanStack Query) del tablero de marketing. */

import { useQuery } from '@tanstack/react-query';

import type { Cliente } from './api/cliente';
import { parametrosDe, type Filtros } from './dominio';

const COMUN = { staleTime: 60_000, gcTime: 15 * 60_000, retry: 1, refetchOnWindowFocus: false };

export function useEstado(cliente: Cliente) {
  return useQuery({
    queryKey: ['marketing', 'estado'],
    queryFn: ({ signal }) => cliente.estado(signal),
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useCatalogo(cliente: Cliente, filtros: Filtros) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['marketing', 'catalogo', params],
    queryFn: ({ signal }) => cliente.catalogo(params, signal),
    ...COMUN,
  });
}

export function useResumen(cliente: Cliente, filtros: Filtros, habilitado: boolean) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['marketing', 'resumen', params],
    queryFn: ({ signal }) => cliente.resumen(params, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

export function useAdquisicion(cliente: Cliente, filtros: Filtros, habilitado: boolean) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['marketing', 'adquisicion', params],
    queryFn: ({ signal }) => cliente.adquisicion(params, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

export function useConversion(cliente: Cliente, filtros: Filtros, habilitado: boolean) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['marketing', 'conversion', params],
    queryFn: ({ signal }) => cliente.conversion(params, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

export function useCohortes(
  cliente: Cliente,
  filtros: Filtros,
  dimension: string,
  habilitado: boolean,
) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['marketing', 'cohortes', dimension, params],
    queryFn: ({ signal }) => cliente.cohortes(params, dimension, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

export function useProductos(cliente: Cliente, filtros: Filtros, habilitado: boolean) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['marketing', 'productos', params],
    queryFn: ({ signal }) => cliente.productos(params, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

export function useTabla(
  cliente: Cliente,
  filtros: Filtros,
  opciones: { orden: string; sentido: string; pagina: number; tamano: number },
  habilitado: boolean,
) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['marketing', 'tabla', opciones, params],
    queryFn: ({ signal }) => cliente.tabla(params, opciones, signal),
    enabled: habilitado,
    ...COMUN,
  });
}


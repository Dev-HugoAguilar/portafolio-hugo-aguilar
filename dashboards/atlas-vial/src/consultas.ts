/**
 * Consultas (TanStack Query).
 *
 * Todas las claves incluyen los filtros completos: mapa, serie, distribuciones,
 * tabla y exportación no pueden quedar desincronizados aunque se cambien los
 * filtros muy rápido. El resaltado (hover) no aparece en ninguna clave, así que
 * pasar el cursor nunca pide datos.
 */

import { useQuery } from '@tanstack/react-query';

import type { Cliente } from './api/cliente';
import { parametrosDe, type Filtros } from './dominio';

const COMUN = { staleTime: 60_000, gcTime: 15 * 60_000, retry: 1, refetchOnWindowFocus: false };

export function obtenerCliente(cliente: Cliente): Cliente {
  return cliente;
}

export function useCatalogo(cliente: Cliente) {
  return useQuery({
    queryKey: ['atlas', 'catalogo'],
    queryFn: ({ signal }) => cliente.catalogo(signal),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useGeometria(cliente: Cliente) {
  return useQuery({
    queryKey: ['atlas', 'geometria'],
    queryFn: ({ signal }) => cliente.geometria(signal),
    staleTime: 60 * 60_000,
    gcTime: 60 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useResumen(cliente: Cliente, filtros: Filtros, habilitado: boolean) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['atlas', 'resumen', params],
    queryFn: ({ signal }) => cliente.resumen(params, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

/** Agregado por alcaldía para el coroplético (sin puntos: esos van aparte). */
export function useTerritorio(cliente: Cliente, filtros: Filtros, habilitado: boolean) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['atlas', 'territorio', params],
    queryFn: ({ signal }) =>
      cliente.territorio(params, { modo: 'alcaldias', incluirPuntos: false }, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

export function usePuntos(cliente: Cliente, filtros: Filtros, habilitado: boolean) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['atlas', 'puntos', params],
    queryFn: ({ signal }) => cliente.puntos(params, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

export function useTiempo(
  cliente: Cliente,
  filtros: Filtros,
  agregacion: string,
  habilitado: boolean,
) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['atlas', 'tiempo', agregacion, params],
    queryFn: ({ signal }) => cliente.tiempo(params, agregacion, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

export function usePersonas(cliente: Cliente, filtros: Filtros, habilitado: boolean) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['atlas', 'personas', params],
    queryFn: ({ signal }) => cliente.personas(params, signal),
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
    queryKey: ['atlas', 'tabla', opciones, params],
    queryFn: ({ signal }) => cliente.tabla(params, opciones, signal),
    enabled: habilitado,
    ...COMUN,
  });
}

export function useEvento(cliente: Cliente, folio: string | null) {
  return useQuery({
    queryKey: ['atlas', 'evento', folio],
    queryFn: ({ signal }) => cliente.evento(folio as string, signal),
    enabled: Boolean(folio),
    staleTime: 5 * 60_000,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

/** Concentración por celda de la malla métrica estable del conjunto filtrado. */
export function useCeldas(cliente: Cliente, filtros: Filtros, habilitado: boolean) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['atlas', 'celdas', params],
    queryFn: ({ signal }) => cliente.celdas(params, signal),
    enabled: habilitado,
    ...COMUN,
    // Un cambio de filtros cancela la petición anterior: TanStack descarta la
    // respuesta obsoleta en lugar de pintar cifras viejas con etiquetas nuevas.
    placeholderData: (previa) => previa,
  });
}
/** Agregado por colonia, con el ranking pedido al servidor. */
export function useColonias(
  cliente: Cliente,
  filtros: Filtros,
  orden: string,
  limite: number,
  habilitado: boolean,
) {
  const params = parametrosDe(filtros);
  return useQuery({
    queryKey: ['atlas', 'colonias', params, orden, limite],
    queryFn: ({ signal }) => cliente.colonias(params, orden, limite, signal),
    enabled: habilitado,
    ...COMUN,
    // Al cambiar métrica o cantidad, la respuesta anterior se descarta: la
    // consulta nueva tiene otra clave y TanStack no la mezcla con la previa.
    placeholderData: (previa) => previa,
  });
}

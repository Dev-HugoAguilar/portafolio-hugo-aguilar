/**
 * «Hallazgos del análisis»: la sección de la ficha del proyecto se rellena desde
 * la propia aplicación, no desde el HTML del portafolio.
 *
 * El portafolio reserva el hueco (`#hallazgos-host`) y este componente lo ocupa.
 * Los datos se piden **sin filtros** —toda la muestra publicada y su periodo
 * completo—, porque la sección describe la versión activa y no el subconjunto que
 * el visitante elija en el tablero. Se calcula una sola vez al montar.
 */

import { useEffect, useState } from 'react';

import { crearCliente } from '../api/cliente';
import type { Cohortes, Conversion, Productos, Resumen } from '../api/tipos';
import { construirHallazgos, type Hallazgo } from '../hallazgos';

export interface PropsHallazgos {
  apiBase: string;
}

interface EstadoHallazgos {
  cargando: boolean;
  error: string | null;
  alcance: string;
  hallazgos: Hallazgo[];
  omitidos: string[];
}

const INICIAL: EstadoHallazgos = {
  cargando: true,
  error: null,
  alcance: '',
  hallazgos: [],
  omitidos: [],
};

/** Dimensión de cohorte de la comparación de retención: el país de la primera
 *  actividad, que da segmentos con base suficiente y etiquetas estables. */
const DIMENSION_RETENCION = 'pais';

export function Hallazgos({ apiBase }: PropsHallazgos) {
  const [estado, setEstado] = useState<EstadoHallazgos>(INICIAL);

  useEffect(() => {
    const control = new AbortController();
    const cliente = crearCliente(apiBase);

    const cargar = async () => {
      try {
        const [resumen, conversion, cohortes, productos] = await Promise.all([
          cliente.resumen([], control.signal),
          cliente.conversion([], control.signal),
          cliente.cohortes([], DIMENSION_RETENCION, control.signal),
          cliente.productos([], control.signal, 10),
        ]);
        const resultado = construirHallazgos({
          resumen: resumen as Resumen,
          conversion: conversion as Conversion,
          cohortes: cohortes as Cohortes,
          productos: productos as Productos,
        });
        if (!control.signal.aborted) {
          setEstado({
            cargando: false,
            error: null,
            alcance: resultado.alcance,
            hallazgos: resultado.hallazgos,
            omitidos: resultado.omitidos,
          });
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setEstado({
          ...INICIAL,
          cargando: false,
          error:
            'No se pudieron calcular los hallazgos: la API de marketing no respondió. ' +
            'El tablero sigue funcionando con los datos ya publicados.',
        });
      }
    };

    void cargar();
    return () => control.abort();
  }, [apiBase]);

  if (estado.cargando) {
    return <p className="hallazgos-espera">Calculando hallazgos con los datos publicados…</p>;
  }

  if (estado.error) {
    return (
      <p className="hallazgos-espera" role="status" data-testid="hallazgos-error">
        {estado.error}
      </p>
    );
  }

  if (!estado.hallazgos.length) {
    return (
      <p className="hallazgos-espera" role="status">
        Todavía no hay cifras publicadas suficientes para redactar hallazgos.
      </p>
    );
  }

  return (
    <>
      <p className="hallazgos-alcance" data-testid="hallazgos-alcance">
        {estado.alcance}
      </p>
      {estado.hallazgos.map((hallazgo) => (
        <p key={hallazgo.id} data-testid={`hallazgo-${hallazgo.id}`}>
          <strong>{hallazgo.titulo}.</strong> {hallazgo.texto}{' '}
          <span className="hallazgos-nota">{hallazgo.nota}</span>
        </p>
      ))}
    </>
  );
}

/**
 * Cifras de una alcaldía con la misma iconografía de las tarjetas KPI.
 *
 * Una fila por métrica en tres columnas —icono | etiqueta | cifra— con los
 * iconos SVG que ya usa la fila de indicadores: incidente (hechos), persona
 * lesionada (lesionadas) y duelo (fallecidas). No se crean variantes: se
 * reutilizan los componentes. El icono es decorativo (`aria-hidden`) porque la
 * etiqueta ya nombra la métrica, y las filas no son botones ni tienen hover.
 *
 * Lo usan todas las alcaldías: el panel sólo cambia los valores.
 */

import type { ReactElement } from 'react';

import { numero } from '../dominio';
import { IconoDuelo, IconoIncidente, IconoLesionado } from './iconos';

export interface CifrasAlcaldia {
  hechos: number | null | undefined;
  lesionadas: number | null | undefined;
  fallecidas: number | null | undefined;
}

interface Definicion {
  clave: keyof CifrasAlcaldia;
  etiqueta: string;
  icono: (props: { tamano?: number }) => ReactElement;
}

const FILAS: Definicion[] = [
  { clave: 'hechos', etiqueta: 'Hechos registrados', icono: IconoIncidente },
  { clave: 'lesionadas', etiqueta: 'Personas lesionadas', icono: IconoLesionado },
  { clave: 'fallecidas', etiqueta: 'Personas fallecidas', icono: IconoDuelo },
];

export function CifrasMetrica({
  valores,
  etiqueta,
  testid = 'detalle-cifras-alcaldia',
}: {
  valores: CifrasAlcaldia;
  etiqueta: string;
  testid?: string;
}) {
  return (
    <ul className="at-cifras-metrica" aria-label={etiqueta} data-testid={testid}>
      {FILAS.map((fila) => {
        const Icono = fila.icono;
        return (
          <li key={fila.clave}>
            <span className="at-cifras-icono" aria-hidden="true">
              <Icono tamano={21} />
            </span>
            <span className="at-cifras-etiqueta">{fila.etiqueta}</span>
            <span className="at-cifras-valor">{numero(valores[fila.clave])}</span>
          </li>
        );
      })}
    </ul>
  );
}

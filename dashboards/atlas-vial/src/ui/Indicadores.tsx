/**
 * Fila de indicadores.
 *
 * Cuatro cifras con su base explícita: hechos, personas lesionadas, personas
 * fallecidas y hechos con fallecimientos (con su denominador). Se distingue
 * siempre «hechos» de «personas»: son conteos distintos y no se suman entre sí.
 */

import type { ReactElement } from 'react';

import type { Resumen } from '../api/tipos';
import { IconoDuelo, IconoIncidente, IconoIncidenteDuelo, IconoLesionado } from './iconos';
import { numero, porcentaje } from '../dominio';

export interface PropsIndicadores {
  resumen: Resumen | null;
  cargando: boolean;
}

function Tarjeta({
  etiqueta,
  valor,
  detalle,
  icono: Icono,
  base,
  cargando,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  icono: (props: { tamano?: number }) => ReactElement;
  base: string;
  cargando: boolean;
}) {
  return (
    <article className={`at-kpi${cargando ? ' is-cargando' : ''}`}>
      <div className="at-kpi-texto">
        <p className="at-kpi-etiqueta">{etiqueta}</p>
        <p className="at-kpi-valor">{valor}</p>
      </div>
      <span className="at-kpi-icono" aria-hidden="true">
        <Icono tamano={26} />
      </span>
      {detalle ? <p className="at-kpi-detalle">{detalle}</p> : null}
      <p className="at-kpi-base">{base}</p>
      <span className="at-kpi-brillo" aria-hidden="true" />
    </article>
  );
}

export function Indicadores({ resumen, cargando }: PropsIndicadores) {
  const indicadores = resumen?.indicadores;
  return (
    <section className="at-kpis" aria-label="Indicadores del filtro vigente" data-testid="kpis">
      <Tarjeta
        etiqueta="Hechos registrados"
        valor={numero(indicadores?.hechos.valor)}
        icono={IconoIncidente}
        base="una fila por folio del conjunto filtrado"
        cargando={cargando}
      />
      <Tarjeta
        etiqueta="Personas lesionadas"
        valor={numero(indicadores?.personas_lesionadas.valor)}
        detalle={
          resumen?.personas_por_hecho != null
            ? `${resumen.personas_por_hecho.toFixed(2).replace('.', ',')} por hecho`
            : undefined
        }
        icono={IconoLesionado}
        base="suma del campo publicado en el archivo de hechos"
        cargando={cargando}
      />
      <Tarjeta
        etiqueta="Personas fallecidas"
        valor={numero(indicadores?.personas_fallecidas.valor)}
        icono={IconoDuelo}
        base="suma del campo publicado; no se estima ni se imputa"
        cargando={cargando}
      />
      <Tarjeta
        etiqueta="Hechos con fallecimientos"
        valor={numero(indicadores?.hechos_con_fallecimientos.valor)}
        detalle={`${porcentaje(indicadores?.hechos_con_fallecimientos.porcentaje ?? null)} de los hechos`}
        icono={IconoIncidenteDuelo}
        base={`denominador: ${numero(indicadores?.hechos_con_fallecimientos.denominador ?? 0)} hechos`}
        cargando={cargando}
      />
    </section>
  );
}





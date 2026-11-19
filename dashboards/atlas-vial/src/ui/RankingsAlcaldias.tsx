/**
 * Rankings de alcaldías del panel derecho del mapa.
 *
 * Tres rankings independientes —**hechos**, **personas lesionadas** y **personas
 * fallecidas**—, cada uno con **su propia escala** y su unidad explícita: las
 * tres métricas no se apilan ni se reparten como partes de un mismo total,
 * porque hechos y personas son unidades distintas.
 *
 * Reglas:
 *  · cinco alcaldías con el valor más alto por métrica, en orden descendente;
 *  · si la alcaldía seleccionada no está entre esas cinco, se añade al final
 *    con su valor para poder compararla;
 *  · se muestran los valores exactos y la barra se escala con el máximo de **su**
 *    métrica;
 *  · cada cabecera lleva un icono de línea del color de su métrica;
 *  · las cifras van sin recuadro, en una columna numérica alineada a la derecha;
 *  · los datos ausentes se marcan como «Sin dato» y no reciben el color del cero.
 *
 * Datos: `FilaAlcaldia` de `/territorio` (agregado ya existente, sin extracción
 * nueva).
 */

import { useMemo, type ReactElement } from 'react';

import type { FilaAlcaldia } from '../api/tipos';
import { RELLENO_MAPA, UNIDAD_METRICA, type Metrica } from '../paleta';
import { numero } from '../dominio';
import { IconoDuelo, IconoIncidente, IconoLesionado } from './iconos';

export interface PropsRankings {
  filas: FilaAlcaldia[];
  alcaldiaSeleccionada: string | null;
  onAlcaldia: (alcaldia: string | null) => void;
  /** Número de filas visibles en el estado general. */
  visibles?: number;
}

const ORDEN: {
  metrica: Metrica;
  titulo: string;
  icono: (props: { tamano?: number }) => ReactElement;
}[] = [
  { metrica: 'hechos', titulo: 'Hechos registrados', icono: IconoIncidente },
  { metrica: 'personas_lesionadas', titulo: 'Personas lesionadas', icono: IconoLesionado },
  { metrica: 'personas_fallecidas', titulo: 'Personas fallecidas', icono: IconoDuelo },
];

const valorDe = (fila: FilaAlcaldia, metrica: Metrica): number | null => {
  if (metrica === 'hechos') return fila.hechos;
  if (metrica === 'personas_lesionadas') return fila.lesionadas;
  return fila.fallecidas;
};

function Ranking({
  metrica,
  titulo,
  icono: Icono,
  filas,
  seleccionada,
  onAlcaldia,
  visibles,
}: {
  metrica: Metrica;
  titulo: string;
  icono: (props: { tamano?: number }) => ReactElement;
  filas: FilaAlcaldia[];
  seleccionada: string | null;
  onAlcaldia: (alcaldia: string | null) => void;
  visibles: number;
}) {
  const conNombre = filas.filter((fila) => Boolean(fila.alcaldia));
  const ordenadas = useMemo(
    () =>
      [...conNombre].sort((a, b) => (valorDe(b, metrica) ?? 0) - (valorDe(a, metrica) ?? 0)),
    [conNombre, metrica],
  );

  const maximo = Math.max(1, ...ordenadas.map((fila) => valorDe(fila, metrica) ?? 0));
  const cabeza = ordenadas.slice(0, visibles);
  const seleccion =
    seleccionada !== null ? ordenadas.find((fila) => fila.alcaldia === seleccionada) ?? null : null;
  const fueraDeLaCabeza =
    seleccion && !cabeza.some((fila) => fila.alcaldia === seleccion.alcaldia) ? seleccion : null;
  const sinDato = cabeza.filter((fila) => valorDe(fila, metrica) === null).length;

  const pintarFila = (datos: FilaAlcaldia, activa: boolean, fuera = false) => {
    const valor = valorDe(datos, metrica);
    const ancho = valor === null ? 0 : Math.max(1.5, (100 * valor) / maximo);
    return (
      <li key={datos.alcaldia} className={fuera ? 'at-ranking-fuera' : undefined}>
        <button
          type="button"
          className={`at-ranking-fila${activa ? ' is-activa' : ''}`}
          aria-pressed={activa}
          title={`${datos.alcaldia}: ${valor === null ? 'Sin dato' : `${numero(valor)} ${UNIDAD_METRICA[metrica]}`}`}
          onClick={() => onAlcaldia(activa ? null : (datos.alcaldia as string))}
        >
          <span className="at-ranking-nombre-corto">{datos.alcaldia}</span>
          <span className="at-ranking-pista">
            <span
              className="at-ranking-barra"
              style={{ width: `${ancho}%`, background: RELLENO_MAPA[metrica] }}
            />
          </span>
          <span className="at-ranking-valor">{valor === null ? 'Sin dato' : numero(valor)}</span>
        </button>
      </li>
    );
  };

  return (
    <section
      className="at-ranking-metrica"
      aria-labelledby={`at-rank-${metrica}`}
      data-testid={`ranking-${metrica}`}
      data-metrica={metrica}
    >
      <header className="at-ranking-metrica-cab">
        <h4 id={`at-rank-${metrica}`}>
          <span
            className="at-ranking-icono"
            style={{ color: RELLENO_MAPA[metrica] }}
            aria-hidden="true"
          >
            <Icono tamano={24} />
          </span>
          {titulo}
        </h4>
        <span className="at-ranking-unidad">{UNIDAD_METRICA[metrica]}</span>
      </header>

      <ul className="at-ranking-lista">
        {cabeza.map((datos) => pintarFila(datos, datos.alcaldia === seleccionada))}
        {fueraDeLaCabeza ? pintarFila(fueraDeLaCabeza, true, true) : null}
      </ul>

      {sinDato > 0 ? <p className="at-ranking-nota">{sinDato} sin dato en esta métrica.</p> : null}
    </section>
  );
}

export function RankingsAlcaldias({
  filas,
  alcaldiaSeleccionada,
  onAlcaldia,
  visibles = 5,
}: PropsRankings) {
  const total = filas.filter((fila) => Boolean(fila.alcaldia)).length;

  if (!total) {
    return <p className="at-nota">Todavía no hay alcaldías con datos para comparar.</p>;
  }

  return (
    <div className="at-rankings" data-testid="rankings-alcaldias">
      {ORDEN.map(({ metrica, titulo, icono }) => (
        <Ranking
          key={metrica}
          metrica={metrica}
          titulo={titulo}
          icono={icono}
          filas={filas}
          seleccionada={alcaldiaSeleccionada}
          onAlcaldia={onAlcaldia}
          visibles={visibles}
        />
      ))}
    </div>
  );
}

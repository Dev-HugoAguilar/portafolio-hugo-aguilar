/**
 * «Una categoría, tres lecturas»: comparación de posiciones por tipo de persona.
 *
 * Tres columnas con las mismas categorías, cada una ordenada por su métrica. Cada
 * fila es una píldora con la posición, el nombre completo y el valor exacto, y las
 * líneas unen **la misma categoría** entre columnas por su etiqueta: si una
 * categoría cambia de lugar, su conexión sube o baja con ella. No son flujos
 * proporcionales ni una serie temporal.
 *
 * Geometría: rejilla de altura y separación fijas, con un SVG de fondo que dibuja
 * los conectores en coordenadas calculadas (sin medir el DOM fila a fila). El ancho
 * se mide con `ResizeObserver` sobre el contenedor exterior —nunca sobre el lienzo
 * que este mismo componente dimensiona— para que las tres columnas ocupen todo el
 * ancho disponible de la tarjeta.
 */

import { useEffect, useMemo, useState } from 'react';

import type { FilaPersonas } from '../api/tipos';
import { numero } from '../dominio';

type Metrica = 'hechos' | 'lesionadas' | 'fallecidas';

const COLUMNAS: { clave: Metrica; titulo: string }[] = [
  { clave: 'hechos', titulo: 'Hechos' },
  { clave: 'lesionadas', titulo: 'Lesionadas en esos hechos' },
  { clave: 'fallecidas', titulo: 'Fallecidas en esos hechos' },
];

const ALTO_FILA = 28;
const HUECO_FILA = 8;
const ALTO_CABECERA = 26;
const HUECO_CABECERA = 10;
const HUECO_COLUMNA = 20;
const ANCHO_MINIMO = 560;

export function PosicionesTipoPersona({ filas }: { filas: FilaPersonas[] }) {
  const [activa, setActiva] = useState<string | null>(null);
  const [contenedor, setContenedor] = useState<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(0);

  /* El contenedor solo existe cuando hay datos: referencia de estado. */
  useEffect(() => {
    if (!contenedor) return;
    const medir = (valor: number) => setAncho((previo) => (Math.abs(previo - valor) < 1 ? previo : valor));
    const observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja) medir(Math.max(ANCHO_MINIMO, Math.round(caja.width)));
    });
    observador.observe(contenedor);
    medir(Math.max(ANCHO_MINIMO, Math.round(contenedor.getBoundingClientRect().width)));
    return () => observador.disconnect();
  }, [contenedor]);

  /* Orden por métrica; empates por nombre ascendente (regla estable). */
  const columnas = useMemo(
    () =>
      COLUMNAS.map((columna) => ({
        ...columna,
        filas: [...filas].sort(
          (a, b) => b[columna.clave] - a[columna.clave] || a.etiqueta.localeCompare(b.etiqueta),
        ),
      })),
    [filas],
  );

  if (filas.length === 0) {
    return <p className="at-nota">Sin tipos de persona con los filtros actuales.</p>;
  }

  const anchoTotal = Math.max(ANCHO_MINIMO, ancho);
  const anchoColumna = (anchoTotal - HUECO_COLUMNA * (COLUMNAS.length - 1)) / COLUMNAS.length;
  const columnaX = (indice: number) => indice * (anchoColumna + HUECO_COLUMNA);
  const centroY = (posicion: number) =>
    ALTO_CABECERA + HUECO_CABECERA + posicion * (ALTO_FILA + HUECO_FILA) + ALTO_FILA / 2;
  const altoTotal =
    ALTO_CABECERA + HUECO_CABECERA + filas.length * (ALTO_FILA + HUECO_FILA) - HUECO_FILA;

  /* Posición de cada categoría en cada columna, por identidad de etiqueta. */
  const posiciones = columnas.map((columna) => {
    const mapa = new Map<string, { posicion: number }>();
    columna.filas.forEach((fila, posicion) => mapa.set(fila.etiqueta, { posicion }));
    return mapa;
  });

  return (
    <div className="at-pos" ref={setContenedor}>
      <div className="at-pos-scroll">
        <div
          className="at-pos-lienzo"
          style={{ width: anchoTotal, height: altoTotal }}
          data-testid="posiciones-lienzo"
        >
          <svg
            className="at-pos-lineas"
            width={anchoTotal}
            height={altoTotal}
            aria-hidden="true"
            focusable="false"
          >
            {filas.map((categoria) => {
              const etiqueta = categoria.etiqueta;
              const puntos = posiciones.map((mapa) => mapa.get(etiqueta));
              if (puntos.some((punto) => !punto)) return null;
              const resaltada = activa === etiqueta;
              return (
                <g key={`l-${etiqueta}`}>
                  {puntos.slice(1).map((punto, indice) => {
                    const desde = puntos[indice] as { posicion: number };
                    const hasta = punto as { posicion: number };
                    return (
                      <line
                        key={`${etiqueta}-${indice}`}
                        x1={columnaX(indice) + anchoColumna - 2}
                        y1={centroY(desde.posicion)}
                        x2={columnaX(indice + 1) + 2}
                        y2={centroY(hasta.posicion)}
                        stroke={resaltada ? '#3458F5' : '#C7D0E8'}
                        strokeWidth={resaltada ? 1.6 : 1}
                        opacity={activa && !resaltada ? 0.45 : 1}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>

          <div
            className="at-pos-rejilla"
            style={{
              gridTemplateColumns: `repeat(${COLUMNAS.length}, minmax(0, 1fr))`,
              columnGap: HUECO_COLUMNA,
            }}
          >
            {columnas.map((columna) => (
              <div className="at-pos-columna" key={columna.clave}>
                <div className="at-pos-cabecera">{columna.titulo}</div>
                <ul className="at-pos-lista">
                  {columna.filas.map((fila, posicion) => {
                    const resaltada = activa === fila.etiqueta;
                    return (
                      <li key={`${columna.clave}-${fila.etiqueta}`}>
                        <button
                          type="button"
                          className={`at-pos-pildora${resaltada ? ' is-activa' : ''}`}
                          aria-pressed={resaltada}
                          aria-label={`${columna.titulo}: posición ${posicion + 1}, ${
                            fila.etiqueta
                          }, ${numero(fila[columna.clave])}`}
                          onMouseEnter={() => setActiva(fila.etiqueta)}
                          onMouseLeave={() =>
                            setActiva((valor) => (valor === fila.etiqueta ? null : valor))
                          }
                          onFocus={() => setActiva(fila.etiqueta)}
                          onBlur={() => setActiva(null)}
                          onClick={() => setActiva(fila.etiqueta)}
                        >
                          <span className="at-pos-indice" aria-hidden="true">
                            {posicion + 1}
                          </span>
                          <span className="at-pos-nombre">{fila.etiqueta}</span>
                          <span className="at-pos-valor">{numero(fila[columna.clave])}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="at-col-detalle">
        Posición en el ranking · las conexiones identifican la misma categoría. Los empates se ordenan
        por nombre.
      </p>
      <p className="at-col-detalle">
        Las columnas de lesionadas y fallecidas son sumas asociadas a esos hechos: no son
        necesariamente personas de ese tipo de usuario.
      </p>
      <p className="at-sr">
        {columnas
          .map(
            (columna) =>
              `${columna.titulo}: ${columna.filas
                .map((fila, indice) => `${indice + 1} ${fila.etiqueta} ${numero(fila[columna.clave])}`)
                .join(', ')}.`,
          )
          .join(' ')}
      </p>
    </div>
  );
}

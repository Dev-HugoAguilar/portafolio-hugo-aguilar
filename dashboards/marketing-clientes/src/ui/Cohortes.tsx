/**
 * Vista de cohortes y retención.
 *
 * Tres lecturas del mismo dato, cada una con su base declarada:
 *
 *  1. **Curvas por segmento**: retención por semana para cada valor de la
 *     dimensión elegida (canal, dispositivo o país). Se dibuja con la base
 *     elegible —solo cohortes que ya podían observar esa semana— y nunca se
 *     promedian porcentajes.
 *  2. **Matriz de cohortes**: la rejilla completa. S0 se muestra al 100 % como
 *     referencia neutral y la escala de S1 en adelante se indica en la leyenda;
 *     un cero real y la ausencia de ventana se distinguen con texto.
 *  3. **Puntos emparejados**: por cohorte, el retorno en S1 y los usuarios con
 *     compra en S1. Se llama «usuarios con compra», no «recompra», porque la base
 *     es toda la cohorte.
 */

import { scaleLinear } from 'd3-scale';
import { useMemo, useState } from 'react';

import {
  CurvasSegmento,
  LeyendaSegmentos,
  SelectorSegmentos,
  asignarColores,
  type OpcionSegmento,
} from './CurvasSegmento';

import type { CeldaCohorte, Cohortes as Datos } from '../api/tipos';
import { PALETA, colorRetencion, textoRetencion } from '../paleta';
import { etiquetaFecha, numero, porcentaje } from '../dominio';
import type { DimensionCohorte } from '../estado';
import { useAppStore } from '../estado';

export interface PropsCohortes {
  datos: Datos | null;
  dimension: DimensionCohorte;
  onDimension: (dimension: DimensionCohorte) => void;
  vacio: boolean;
  cargando: boolean;
}

const DIMENSIONES: { valor: DimensionCohorte; etiqueta: string }[] = [
  { valor: 'canal', etiqueta: 'Canal' },
  { valor: 'dispositivo', etiqueta: 'Dispositivo' },
  { valor: 'pais', etiqueta: 'País' },
];


export function Cohortes({ datos, dimension, onDimension, vacio, cargando }: PropsCohortes) {
  const [cohorteActiva, setCohorteActiva] = useState<string | null>(null);
  // null = selección automática (los cinco de más base elegible en S1). Vive en el
  // estado central para conservarse al cambiar de vista o al actualizar los datos.
  const seleccion = useAppStore((estado) => estado.seleccionCurvas);
  const setSeleccion = useAppStore((estado) => estado.setSeleccionCurvas);

  const celdas = datos?.celdas ?? [];
  const curvas = datos?.curvas ?? [];
  const puntos = datos?.puntos ?? [];
  const semanas = datos?.semanas ?? [];

  const porCohorte = useMemo(() => {
    const mapa = new Map<string, Map<number, CeldaCohorte>>();
    for (const celda of celdas) {
      if (!mapa.has(celda.cohorte)) mapa.set(celda.cohorte, new Map());
      mapa.get(celda.cohorte)!.set(celda.indice, celda);
    }
    return mapa;
  }, [celdas]);

  const maximoVisible = dimension === 'pais' ? 5 : curvas.length;
  const umbral = datos?.umbral_base_reducida ?? 100;
  const criterio = datos?.criterio_seleccion ?? '';

  const opciones: OpcionSegmento[] = useMemo(
    () =>
      [...curvas]
        .map((curva) => {
          const baseS1 = curva.base_s1 ?? 0;
          const base = curva.base_s0 ?? 0;
          return {
            valor: curva.valor,
            base,
            baseS1,
            pequena: (baseS1 || base) < umbral || Boolean(curva.base_reducida),
          };
        })
        .sort((a, b) => b.baseS1 - a.baseS1 || a.valor.localeCompare(b.valor, 'es')),
    [curvas, umbral],
  );

  // La selección manual se conserva mientras sus valores sigan existiendo con datos.
  const seleccionados = useMemo(() => {
    const validos = new Set(opciones.map((opcion) => opcion.valor));
    const manual = (seleccion ?? []).filter((valor) => validos.has(valor));
    if (manual.length > 0) return manual.slice(0, maximoVisible);
    return opciones.slice(0, maximoVisible).map((opcion) => opcion.valor);
  }, [seleccion, opciones, maximoVisible]);

  const colores = useMemo(() => asignarColores(seleccionados), [seleccionados]);

  const maximoRetencion = useMemo(() => {
    const valores = celdas
      .filter((celda) => celda.indice > 0 && celda.retencion !== null)
      .map((celda) => celda.retencion as number);
    return Math.max(1, ...valores);
  }, [celdas]);

  return (
    <div className="mk-vista" data-testid="vista-cohortes">
      <section className="mk-panel" aria-labelledby="mk-t-curvas" data-testid="panel-curvas">
        <div className="mk-panel-head">
          <div>
            <h3 id="mk-t-curvas">Curvas de retención por segmento</h3>
            <p className="mk-panel-sub">
              Denominador: cohortes que ya podían observar cada semana · sin promediar porcentajes ·
              dimensión de la cohorte: {datos?.etiqueta_dimension ?? dimension}
            </p>
          </div>
          <div className="mk-panel-controls">
            <div className="mk-segmentado" role="group" aria-label="Dimensión de la cohorte">
            {DIMENSIONES.map((opcion) => (
              <button
                key={opcion.valor}
                type="button"
                className={`mk-seg${dimension === opcion.valor ? ' is-activa' : ''}`}
                onClick={() => {
                  setCohorteActiva(null);
                  setSeleccion(null);
                  onDimension(opcion.valor);
                }}
                aria-pressed={dimension === opcion.valor}
              >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
            {curvas.length > maximoVisible ? (
              <SelectorSegmentos
                etiqueta={datos?.etiqueta_dimension ?? 'País'}
                opciones={opciones}
                seleccionados={seleccionados}
                maximo={maximoVisible}
                umbral={umbral}
                onCambiar={(valores) => setSeleccion(valores)}
              />
            ) : null}
          </div>
        </div>

        {curvas.length === 0 ? (
          <p className="mk-vacio">
            {vacio
              ? 'Sin datos publicados: las curvas aparecerán cuando exista una versión cargada.'
              : 'No hay cohortes para los filtros actuales.'}
          </p>
        ) : (
          <>
            <CurvasSegmento
              curvas={curvas}
              seleccionados={seleccionados}
              umbral={umbral}
              criterio={criterio}
            />
            <LeyendaSegmentos
              valores={seleccionados}
              colores={colores}
              umbral={umbral}
              opciones={opciones}
              onQuitar={(valor) =>
                setSeleccion(seleccionados.filter((item) => item !== valor))
              }
            />
          </>
        )}
      </section>

      <section className="mk-panel" aria-labelledby="mk-t-matriz" data-testid="panel-matriz">
        <div className="mk-panel-head">
          <div>
            <h3 id="mk-t-matriz">Matriz de cohortes</h3>
            <p className="mk-panel-sub">
              S0 = 100 % como referencia · escala de S1 en adelante: 0 a {porcentaje(maximoRetencion)} ·
              «sin ventana» significa que la semana aún no se podía observar
            </p>
          </div>
        </div>

        {celdas.length === 0 ? (
          <p className="mk-vacio">{vacio ? 'Sin datos publicados todavía.' : 'Sin cohortes para estos filtros.'}</p>
        ) : (
          <div className="mk-tabla-caja mk-matriz-caja">
            <table className="mk-tabla mk-matriz">
              <caption className="mk-sr">
                Retención por cohorte semanal. Cada celda indica el porcentaje, los usuarios que
                regresaron y la base de la cohorte.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Cohorte</th>
                  <th scope="col" className="mk-num">Usuarios</th>
                  {semanas.map((semana) => (
                    <th key={semana} scope="col" className="mk-num">
                      S{semana}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...porCohorte.entries()].map(([cohorte, filas]) => {
                  const tamano =
                    filas.get(0)?.usuarios ??
                    datos?.cohortes.find((item) => item.cohorte === cohorte)?.usuarios ??
                    0;
                  const resaltada = cohorteActiva === cohorte;
                  return (
                    <tr key={cohorte} className={resaltada ? 'is-resaltada' : undefined}>
                      <th scope="row" className="mk-matriz-cohorte">
                        <button
                          type="button"
                          className="mk-enlace"
                          onClick={() => setCohorteActiva(resaltada ? null : cohorte)}
                          aria-pressed={resaltada}
                          title="Marcar esta cohorte"
                        >
                          {datos?.cohortes.find((item) => item.cohorte === cohorte)?.semana_iso ?? cohorte}
                        </button>
                      </th>
                      <td className="mk-num">{numero(tamano)}</td>
                      {semanas.map((semana) => {
                        const celda = filas.get(semana);
                        if (!celda) {
                          return (
                            <td key={semana} className="mk-num mk-celda-vacia">
                              —
                            </td>
                          );
                        }
                        if (celda.ventana === 'sin_ventana') {
                          return (
                            <td
                              key={semana}
                              className="mk-num mk-celda-vacia"
                              title="La semana no se podía observar todavía"
                            >
                              sin ventana
                            </td>
                          );
                        }
                        if (semana === 0) {
                          return (
                            <td key={semana} className="mk-num mk-celda-neutra">
                              100 %
                            </td>
                          );
                        }
                        const valor = celda.retencion;
                        return (
                          <td
                            key={semana}
                            className="mk-num mk-celda"
                            style={{
                              background: colorRetencion(valor, maximoRetencion),
                              color: textoRetencion(valor, maximoRetencion),
                            }}
                            title={`${numero(celda.usuarios)} de ${numero(tamano)} usuarios · ${porcentaje(valor)} · ${
                              celda.ventana === 'completa' ? 'ventana completa' : 'ventana incompleta'
                            }`}
                          >
                            {valor === null
                              ? celda.ventana === 'incompleta'
                                ? 'incompleta'
                                : '—'
                              : `${valor.toFixed(1)} %`}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {cargando ? <p className="mk-nota">Actualizando la matriz…</p> : null}
      </section>

      <section className="mk-panel" aria-labelledby="mk-t-puntos" data-testid="panel-puntos">
        <div className="mk-panel-head">
          <div>
            <h3 id="mk-t-puntos">Retorno y compra en S1</h3>
            <p className="mk-panel-sub">
              Un punto por cohorte y lectura · base: toda la cohorte · no es «recompra»: mide
              usuarios con al menos una compra en S1
            </p>
          </div>
        </div>
        {puntos.length === 0 ? (
          <p className="mk-vacio">{vacio ? 'Sin datos publicados todavía.' : 'Sin cohortes para estos filtros.'}</p>
        ) : (
          <Puntos datos={puntos} />
        )}
      </section>
    </div>
  );
}

function Puntos({ datos }: { datos: NonNullable<Datos['puntos']> }) {
  const ancho = 620;
  const alto = Math.max(120, datos.length * 22 + 40);
  const margen = { arriba: 20, derecha: 60, abajo: 22, izquierda: 96 };
  const maximo = Math.max(1, ...datos.map((fila) => Math.max(fila.retorno ?? 0, fila.compra ?? 0)));
  const escalaX = scaleLinear()
    .domain([0, maximo * 1.1])
    .range([margen.izquierda, ancho - margen.derecha]);

  return (
    <div className="mk-tabla-caja">
      <svg width={ancho} height={alto} role="img" aria-label="Retorno y compra en S1 por cohorte.">
        {escalaX.ticks(4).map((marca) => (
          <g key={marca}>
            <line
              x1={escalaX(marca)}
              x2={escalaX(marca)}
              y1={margen.arriba - 6}
              y2={alto - margen.abajo}
              stroke={PALETA.guia}
            />
            <text x={escalaX(marca)} y={alto - 6} textAnchor="middle" fill={PALETA.textSecondary} fontSize={9.5}>
              {marca.toFixed(1)} %
            </text>
          </g>
        ))}
        {datos.map((fila, indice) => {
          const y = margen.arriba + indice * 22;
          return (
            <g key={fila.cohorte}>
              <text
                x={margen.izquierda - 8}
                y={y + 4}
                textAnchor="end"
                fill={PALETA.textSecondary}
                fontSize={9.5}
              >
                {etiquetaFecha(fila.cohorte)}
              </text>
              <line
                x1={escalaX(fila.retorno ?? 0)}
                x2={escalaX(fila.compra ?? 0)}
                y1={y}
                y2={y}
                stroke={PALETA.guiaFuerte}
                strokeWidth={1}
              />
              <circle cx={escalaX(fila.retorno ?? 0)} cy={y} r={4} fill={PALETA.primary} />
              <circle cx={escalaX(fila.compra ?? 0)} cy={y} r={4} fill={PALETA.violeta} />
              <title>
                {`${etiquetaFecha(fila.cohorte)} · base ${numero(fila.base)} · volvieron ${numero(
                  fila.volvieron,
                )} (${porcentaje(fila.retorno)}) · compraron ${numero(fila.compraron)} (${porcentaje(
                  fila.compra,
                )})`}
              </title>
            </g>
          );
        })}
      </svg>
      <ul className="mk-leyenda">
        <li>
          <span className="mk-leyenda-color" style={{ background: PALETA.primary }} aria-hidden="true" />
          Volvieron en S1
        </li>
        <li>
          <span className="mk-leyenda-color" style={{ background: PALETA.violeta }} aria-hidden="true" />
          Compraron en S1
        </li>
      </ul>
    </div>
  );
}


/**
 * Ranking horizontal por institución (D3 + SVG).
 *
 * Reglas:
 *  - El eje se ajusta a los bancos visibles: el agregado «Sistema» **no** entra
 *    en el dominio (vive en los indicadores y en el tooltip).
 *  - Con participación válida (saldos en millones) las barras se dibujan sobre un
 *    eje porcentual y el porcentaje se escribe al final de cada barra; el importe
 *    completo sigue en el tooltip. Si la participación no es interpretable, el eje
 *    y las etiquetas pasan a importes.
 *  - Sin comparación todas las barras van en azul sólido; al comparar, cada banco
 *    usa su color (azul, violeta, turquesa) con contorno y marcador, y el resto
 *    queda en contexto neutro legible.
 *  - Hover o foco resaltan sin consultar ni filtrar; el clic alterna la selección.
 */

import { max as d3max } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { useMemo, useState } from 'react';

import type { FilaInstitucion } from '../api/types';
import {
  COLOR,
  ayudaBillones,
  importeCompacto,
  importeExacto,
  porcentaje,
} from '../domain';
import { useMeasure } from './useMeasure';

const ALTO_FILA = 22;
const ALTO_BARRA = 11;
const COL_NUMERO = 18;
const COL_NOMBRE = 104;
const COL_VALOR = 46;

export interface PropsRanking {
  filas: FilaInstitucion[];
  valorSistema: number | null;
  seleccion: string[];
  resaltado: string | null;
  colores: Map<string, string>;
  /** Sin bancos comparados: el ranking usa su color de énfasis (azul). */
  sinSeleccion: boolean;
  /** La participación es interpretable para este concepto. */
  participacionValida: boolean;
  onHover: (institucionId: string | null) => void;
  onAlternar: (institucionId: string) => void;
}

type Recorte = 10 | 20 | 'todas';

export function Ranking({
  filas,
  valorSistema,
  seleccion,
  resaltado,
  colores,
  sinSeleccion,
  participacionValida,
  onHover,
  onAlternar,
}: PropsRanking) {
  const { referencia, ancho } = useMeasure<HTMLDivElement>();
  const [recorte, setRecorte] = useState<Recorte>(10);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; id: string } | null>(null);

  const bancos = useMemo(
    () => filas.filter((fila) => !fila.es_sistema && fila.valor !== null),
    [filas],
  );

  const visibles = useMemo(() => {
    const limite = recorte === 'todas' ? bancos.length : recorte;
    const recorteBase = bancos.slice(0, limite);
    const ids = new Set(recorteBase.map((fila) => fila.institucion_id));
    const extra = bancos.filter(
      (fila) => seleccion.includes(fila.institucion_id) && !ids.has(fila.institucion_id),
    );
    return [...recorteBase, ...extra];
  }, [bancos, recorte, seleccion]);

  const fueraTop =
    visibles.length - (recorte === 'todas' ? visibles.length : Math.min(recorte, bancos.length));

  const margen = {
    arriba: 6,
    derecha: COL_VALOR,
    abajo: 22,
    izquierda: COL_NUMERO + COL_NOMBRE,
  };
  const anchoBarra = Math.max(80, ancho - margen.izquierda - margen.derecha);
  const altoPlot = Math.max(ALTO_FILA, visibles.length * ALTO_FILA);

  /** Medida graficada: porcentaje de participación o importe en millones. */
  const medida = (fila: FilaInstitucion): number =>
    participacionValida ? (fila.participacion_pct ?? 0) : (fila.valor ?? 0);

  const maximo = d3max(visibles, (fila) => medida(fila)) ?? 0;
  const escala = scaleLinear()
    .domain([0, maximo > 0 ? maximo : 1])
    .range([0, anchoBarra])
    .nice(5);
  const ticks = escala.ticks(5);
  const formatoEje = (valor: number) =>
    participacionValida ? `${Math.round(valor)}%` : importeCompacto(valor);
  const formatoBarra = (fila: FilaInstitucion) =>
    participacionValida
      ? fila.participacion_pct === null
        ? '—'
        : `${porcentaje(fila.participacion_pct)}%`
      : importeCompacto(fila.valor);

  const filaTooltip = tooltip ? visibles.find((fila) => fila.institucion_id === tooltip.id) : null;

  return (
    <div className={`bm-chart bm-chart--ranking${recorte === 'todas' ? ' is-scroll' : ''}`} ref={referencia}>
      <div className="bm-chart-tools">
        <div className="bm-seg" role="group" aria-label="Cuántos bancos mostrar en el ranking">
          {([10, 20, 'todas'] as Recorte[]).map((opcion) => (
            <button
              key={String(opcion)}
              type="button"
              className={`bm-seg-btn${recorte === opcion ? ' is-on' : ''}`}
              aria-pressed={recorte === opcion}
              onClick={() => setRecorte(opcion)}
            >
              {opcion === 'todas' ? 'Todas' : `Top ${opcion}`}
            </button>
          ))}
        </div>
        {fueraTop > 0 ? (
          <span className="bm-chart-hint">
            +{fueraTop} seleccionado{fueraTop === 1 ? '' : 's'} fuera del top
          </span>
        ) : null}
      </div>

      <div className="bm-chart-scroll">
        <svg
          width={ancho}
          height={altoPlot + margen.arriba + margen.abajo}
          viewBox={`0 0 ${ancho} ${altoPlot + margen.arriba + margen.abajo}`}
          role="img"
          aria-label={
            participacionValida
              ? `Participación de ${visibles.length} instituciones sobre el total del sistema. El agregado del sistema no se incluye en el ranking.`
              : `Importe de ${visibles.length} instituciones en millones de pesos. El agregado del sistema no se incluye en el ranking.`
          }
        >
          <g transform={`translate(${margen.izquierda},${margen.arriba})`}>
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={escala(tick)}
                  x2={escala(tick)}
                  y1={0}
                  y2={altoPlot}
                  stroke={tick === 0 ? COLOR.guiaFuerte : COLOR.guia}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={escala(tick)}
                  y={altoPlot + 15}
                  textAnchor="middle"
                  fill={COLOR.textoSuave}
                  fontSize={10}
                  fontVariant="tabular-nums"
                >
                  {formatoEje(tick)}
                </text>
              </g>
            ))}

            {visibles.map((fila, indice) => {
              const elegido = seleccion.includes(fila.institucion_id);
              const activo = resaltado === fila.institucion_id;
              const color = sinSeleccion
                ? COLOR.seleccion
                : elegido
                  ? (colores.get(fila.institucion_id) ?? COLOR.neutro)
                  : activo
                    ? COLOR.neutroHover
                    : COLOR.neutro;
              const y = indice * ALTO_FILA;
              const anchoValor = Math.max(1.5, escala(medida(fila)));
              const posicion = fila.posicion ?? indice + 1;
              const etiqueta = `${fila.institucion}: ${importeExacto(fila.valor)} millones de pesos${
                fila.participacion_pct !== null
                  ? `, ${porcentaje(fila.participacion_pct)} % del sistema`
                  : ''
              }. ${elegido ? 'Quitar de la selección' : 'Añadir a la selección'}`;

              return (
                <g
                  key={fila.institucion_id}
                  className="bm-row"
                  tabIndex={0}
                  role="button"
                  aria-pressed={elegido}
                  aria-label={etiqueta}
                  onMouseEnter={(evento) => {
                    onHover(fila.institucion_id);
                    const caja = evento.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    if (caja) {
                      setTooltip({
                        x: evento.clientX - caja.left,
                        y: evento.clientY - caja.top,
                        id: fila.institucion_id,
                      });
                    }
                  }}
                  onMouseMove={(evento) => {
                    const caja = evento.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    if (caja) {
                      setTooltip({
                        x: evento.clientX - caja.left,
                        y: evento.clientY - caja.top,
                        id: fila.institucion_id,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    onHover(null);
                    setTooltip(null);
                  }}
                  onFocus={() => onHover(fila.institucion_id)}
                  onBlur={() => {
                    onHover(null);
                    setTooltip(null);
                  }}
                  onClick={() => onAlternar(fila.institucion_id)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault();
                      onAlternar(fila.institucion_id);
                    }
                  }}
                >
                  <rect x={-margen.izquierda} y={y} width={ancho} height={ALTO_FILA} fill="transparent" />

                  {/* Posición en el boletín */}
                  <text
                    x={-margen.izquierda + 2}
                    y={y + ALTO_FILA / 2 + 3.5}
                    fill={COLOR.textoSuave}
                    fontSize={10}
                    fontVariant="tabular-nums"
                  >
                    {posicion}
                  </text>

                  {/* Nombre */}
                  <text
                    x={-6}
                    y={y + ALTO_FILA / 2 + 3.5}
                    textAnchor="end"
                    fill={COLOR.texto}
                    fontSize={11.5}
                    fontWeight={elegido ? 650 : 500}
                  >
                    {fila.institucion.length > 16
                      ? `${fila.institucion.slice(0, 15)}…`
                      : fila.institucion}
                  </text>

                  {/* Barra */}
                  <rect
                    x={0}
                    y={y + (ALTO_FILA - ALTO_BARRA) / 2}
                    width={anchoValor}
                    height={ALTO_BARRA}
                    rx={3}
                    fill={color}
                    stroke={elegido ? COLOR.texto : 'none'}
                    strokeWidth={elegido ? 1.4 : 0}
                    data-institucion={fila.institucion_id}
                    data-color={color}
                    data-seleccionada={elegido ? 'true' : 'false'}
                  />

                  {/* Valor al final de la barra */}
                  <text
                    x={anchoValor + 8}
                    y={y + ALTO_FILA / 2 + 3.5}
                    fill={COLOR.texto}
                    fontSize={11}
                    fontWeight={elegido ? 650 : 550}
                    fontVariant="tabular-nums"
                  >
                    {formatoBarra(fila)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {tooltip && filaTooltip ? (
          <div
            className="bm-tip"
            style={{
              left: Math.min(tooltip.x + 12, Math.max(8, ancho - 205)),
              top: Math.max(4, tooltip.y - 8),
            }}
            role="presentation"
          >
            <p className="bm-tip-title">{filaTooltip.institucion}</p>
            <p className="bm-tip-line">
              <span>{importeExacto(filaTooltip.valor)}</span> millones de pesos
            </p>
            <p className="bm-tip-soft">
              {filaTooltip.participacion_pct !== null
                ? `${porcentaje(filaTooltip.participacion_pct)} % del sistema`
                : 'participación no calculable'}
            </p>
            <p className="bm-tip-soft">
              {filaTooltip.variacion_pct !== null
                ? `variación ${porcentaje(filaTooltip.variacion_pct)} %`
                : 'sin variación comparable'}
            </p>
            {ayudaBillones(valorSistema) ? (
              <p className="bm-tip-soft">Sistema: {ayudaBillones(valorSistema)}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

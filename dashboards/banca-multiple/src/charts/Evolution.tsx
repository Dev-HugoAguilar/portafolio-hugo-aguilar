/**
 * Evolución temporal de la selección (D3 + SVG).
 *
 * Dos modos:
 *  - **Crecimiento** (predeterminado en saldos positivos): normaliza bancos y
 *    «Sistema» a base 100 en una fecha común; fórmula `valor / valor base × 100`.
 *    El Sistema va en naranja quemado `#C05621` discontinuo y los bancos con sus
 *    colores. Nunca se normaliza una base cero, negativa o ausente; en flujos
 *    acumulados la base solo puede ser el mismo corte del año anterior.
 *  - **Importe**: valores publicados (millones) sin doble eje. El Sistema se añade
 *    con una opción explícita y conserva el mismo naranja discontinuo.
 *
 * Presentación:
 *  - Solo se unen meses consecutivos; la cobertura faltante se marca con muescas
 *    discretas (no con grandes bandas).
 *  - El dominio vertical se ajusta al contenido con margen y etiquetas claras.
 *  - Etiquetas al final de cada serie cuando caben.
 *  - El brush temporal se oculta cuando hay tan pocas observaciones que no aporta.
 *  - Comparación entre dos fechas reales con valor inicial, final y cambio.
 */

import { extent } from 'd3-array';
import { brushX, type BrushBehavior } from 'd3-brush';
import { select } from 'd3-selection';
import { scaleLinear, scaleTime } from 'd3-scale';
import { line } from 'd3-shape';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { PuntoSerie, SerieInstitucion } from '../api/types';
import { estiloMuestra } from '../colors';
import {
  COLOR,
  etiquetaPeriodo,
  formatearImporte,
  importeExacto,
  indice100,
  mesesEntre,
  periodoEnVentana,
  porcentaje,
  sonConsecutivos,
  type ResultadoBase100,
  type UnidadImporte,
} from '../domain';
import { useMeasure } from './useMeasure';

export type Modo = 'crecimiento' | 'importe';

export interface PropsEvolution {
  series: SerieInstitucion[];
  periodos: string[];
  ventana: [string, string] | null;
  periodoReferencia: string;
  modo: Modo;
  base100: ResultadoBase100;
  onModo: (modo: Modo) => void;
  onVentana: (ventana: [string, string] | null) => void;
  onPeriodo: (periodo: string) => void;
  seleccion: string[];
  resaltado: string | null;
  colores: Map<string, string>;
  patrones: Map<string, string | null>;
  onHover: (institucionId: string | null) => void;
  onAlternar: (institucionId: string) => void;
  /** Variación oficial del sistema en el periodo de referencia (API). */
  variacionReferencia: number | null;
  periodoComparado: string | null;
  /** Unidad única del eje y del tooltip (misma que el subtítulo del panel). */
  unidad: UnidadImporte;
  /** El concepto se publica en porcentaje: no hay importes que escalar. */
  esPorcentaje: boolean;
  /** Flujo acumulado: solo se compara con el mismo corte del año anterior. */
  esFlujo: boolean;
  /** Fechas de comparación compartidas con los hallazgos. */
  comparacion: { desde: string; hasta: string } | null;
  onComparacion: (fechas: { desde: string; hasta: string } | null) => void;
}

const ALTO_PLOT = 176;
const ALTO_BRUSH = 18;
/** Por debajo de esta cobertura el brush no aporta y se oculta. */
const MINIMO_PARA_BRUSH = 6;

const SIGLA: Record<string, number> = {};
const mesDe = (periodo: string) => Number(periodo.split('-')[1] ?? 0);

export function Evolution({
  series,
  periodos,
  ventana,
  periodoReferencia,
  modo,
  base100,
  onModo,
  onVentana,
  onPeriodo,
  seleccion,
  resaltado,
  colores,
  patrones,
  onHover,
  onAlternar,
  variacionReferencia,
  periodoComparado,
  unidad,
  esPorcentaje,
  esFlujo,
  comparacion,
  onComparacion,
}: PropsEvolution) {
  const { referencia, ancho } = useMeasure<HTMLDivElement>();
  const brushRef = useRef<SVGGElement | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [sistemaVisible, setSistemaVisible] = useState(true);
  const [comparando, setComparando] = useState(false);

  const esCrecimiento = modo === 'crecimiento';
  const conSeleccion = seleccion.length > 0;

  const visibles = useMemo(
    () => [...periodos].sort().filter((periodo) => periodoEnVentana(periodo, ventana)),
    [periodos, ventana],
  );

  const datos = esCrecimiento && base100.series.length > 0 ? base100.series : series;
  /**
   * En crecimiento el «Sistema» es la referencia del sector y va siempre; en
   * importe solo aparece si no hay selección o si se pide explícitamente.
   */
  const seriesVisibles = useMemo(() => {
    const sistema = datos.filter((serie) => serie.es_sistema);
    const bancos = datos.filter((serie) => !serie.es_sistema && seleccion.includes(serie.institucion_id));
    if (esCrecimiento) return [...bancos, ...sistema];
    if (!conSeleccion) return sistema;
    return sistemaVisible ? [...bancos, ...sistema] : bancos;
  }, [datos, seleccion, esCrecimiento, conSeleccion, sistemaVisible]);

  const margen = { arriba: 12, derecha: 74, abajo: 20, izquierda: 46 };
  const anchoPlot = Math.max(160, ancho - margen.izquierda - margen.derecha);

  const fechas = visibles.map((periodo) => new Date(`${periodo}-01T00:00:00`));
  const escalaX = scaleTime()
    .domain([fechas[0] ?? new Date(), fechas[fechas.length - 1] ?? new Date()])
    .range([margen.izquierda, margen.izquierda + anchoPlot]);

  const valores = seriesVisibles.flatMap((serie) =>
    serie.puntos
      .filter((punto) => periodoEnVentana(punto.periodo, ventana) && punto.valor !== null)
      .map((punto) => punto.valor as number),
  );
  const [minimo, maximo] = valores.length ? (extent(valores) as [number, number]) : [0, 1];

  /* Dominio vertical ajustado al contenido, con margen legible. */
  const escalaY = useMemo(() => {
    if (esCrecimiento) {
      const bajo = Math.min(95, minimo - 3);
      const alto = Math.max(105, maximo + 3);
      return scaleLinear().domain([bajo, alto]).nice(4).range([ALTO_PLOT, margen.arriba]);
    }
    const bajo = Math.min(0, minimo);
    const alto = maximo === 0 ? 1 : maximo * 1.06;
    return scaleLinear().domain([bajo, alto]).nice(4).range([ALTO_PLOT, margen.arriba]);
  }, [esCrecimiento, minimo, maximo]);

  const ticksY = escalaY.ticks(4);

  const formatoTick = (valor: number) => {
    if (esCrecimiento) return indice100(valor);
    if (esPorcentaje) return porcentaje(valor);
    return formatearImporte(valor, unidad);
  };

  const valorEnPantalla = (valor: number | null | undefined) => {
    if (valor === null || valor === undefined) return '—';
    if (esCrecimiento) return indice100(valor);
    if (esPorcentaje) return `${porcentaje(valor)} %`;
    return formatearImporte(valor, unidad);
  };

  const notaUnidad = esCrecimiento
    ? `Índice base 100 · ${etiquetaPeriodo(base100.base ?? '')} = 100 · el Sistema va en naranja discontinuo`
    : esPorcentaje
      ? 'porcentaje publicado por la CNBV (%)'
      : unidad.nota;

  /* Etiquetas de periodo con separación real en píxeles. */
  const xDe = (periodo: string) => escalaX(new Date(`${periodo}-01T00:00:00`));
  const etiquetasVisibles = new Set<string>();
  {
    const elegidas: string[] = [];
    const cabe = (periodo: string, minimo: number) =>
      elegidas.every((otra) => Math.abs(xDe(otra) - xDe(periodo)) >= minimo);
    const agregar = (periodo: string | undefined, minimo: number) => {
      if (!periodo || elegidas.includes(periodo)) return;
      if (!cabe(periodo, minimo)) return;
      elegidas.push(periodo);
      etiquetasVisibles.add(periodo);
    };
    agregar(visibles[0], 0);
    agregar(visibles[visibles.length - 1], 44);
    agregar(periodoReferencia, 44);
    visibles.forEach((periodo) => agregar(periodo, 74));
  }

  const trazo = line<{ x: Date; y: number }>()
    .x((punto) => escalaX(punto.x))
    .y((punto) => escalaY(punto.y));

  /** Tramos: solo entre meses consecutivos. */
  const tramos = (puntos: PuntoSerie[]) => {
    const ordenados = [...puntos]
      .filter((punto) => periodoEnVentana(punto.periodo, ventana))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
    const salida: Array<Array<{ x: Date; y: number }>> = [];
    let actual: Array<{ x: Date; y: number }> = [];
    ordenados.forEach((punto, indice) => {
      if (punto.valor === null) {
        if (actual.length > 1) salida.push(actual);
        actual = [];
        return;
      }
      const anterior = ordenados[indice - 1];
      if (anterior && anterior.valor !== null && !sonConsecutivos(anterior.periodo, punto.periodo)) {
        if (actual.length > 1) salida.push(actual);
        actual = [];
      }
      actual.push({ x: new Date(`${punto.periodo}-01T00:00:00`), y: punto.valor });
    });
    if (actual.length > 1) salida.push(actual);
    return salida;
  };

  /** Cobertura: una muesca discreta por mes sin boletín. */
  const huecos = useMemo(() => {
    const salida: Array<{ x: number; meses: number }> = [];
    const sumaMeses = (periodo: string, delta: number) => {
      const [anio, mes] = periodo.split('-').map(Number);
      return new Date(anio ?? 0, (mes ?? 1) - 1 + delta, 1);
    };
    for (let i = 0; i < visibles.length - 1; i += 1) {
      const actual = visibles[i] as string;
      const siguiente = visibles[i + 1] as string;
      if (sonConsecutivos(actual, siguiente)) continue;
      const meses = Math.max(0, mesesEntre(actual, siguiente) - 1);
      const medio = (sumaMeses(actual, 1).getTime() + sumaMeses(siguiente, -1).getTime()) / 2;
      salida.push({ x: escalaX(new Date(medio)), meses });
    }
    return salida;
  }, [visibles, escalaX]);

  const usarBrush = visibles.length >= MINIMO_PARA_BRUSH && anchoPlot > 220;

  /* brush inferior: ajusta la ventana visible (no suma saldos) */
  useEffect(() => {
    const nodo = brushRef.current;
    if (!nodo || !usarBrush) return;
    const comportamiento: BrushBehavior<unknown> = brushX()
      .extent([
        [margen.izquierda, 0],
        [margen.izquierda + anchoPlot, ALTO_BRUSH],
      ])
      .on('end', (evento) => {
        const seleccionBrush = evento.selection as [number, number] | null;
        if (!evento.sourceEvent) return;
        if (!seleccionBrush || seleccionBrush[1] - seleccionBrush[0] < 6) {
          select(nodo).call(comportamiento.move, null);
          onVentana(null);
          return;
        }
        const [x0, x1] = seleccionBrush;
        const etiquetas = visibles.length ? visibles : periodos;
        const cercano = (fecha: Date) => {
          let mejor = etiquetas[0] as string;
          let distancia = Infinity;
          for (const periodo of etiquetas) {
            const d = Math.abs(new Date(`${periodo}-01T00:00:00`).getTime() - fecha.getTime());
            if (d < distancia) {
              distancia = d;
              mejor = periodo;
            }
          }
          return mejor;
        };
        const a = cercano(escalaX.invert(x0));
        const b = cercano(escalaX.invert(x1));
        select(nodo).call(comportamiento.move, null);
        onVentana(a <= b ? [a, b] : [b, a]);
      });

    const seleccionActual = select(nodo);
    seleccionActual.call(comportamiento);
    return () => {
      seleccionActual.on('.brush', null);
    };
  }, [anchoPlot, escalaX, visibles, periodos, onVentana, usarBrush]);

  /* Fechas reales disponibles para la comparación entre cortes. */
  const fechasComparables = visibles;
  const inicio = comparacion?.desde || (fechasComparables[0] ?? '');
  const fin = comparacion?.hasta || (fechasComparables[fechasComparables.length - 1] ?? '');
  const mesesEntreCortes = inicio && fin ? mesesEntre(inicio, fin) : 0;
  /** En flujo acumulado solo son válidos los cortes del mismo mes. */
  const comparacionCompatible = !esFlujo || mesDe(inicio) === mesDe(fin);

  const filasComparacion = useMemo(() => {
    if (!comparando || !inicio || !fin || !comparacionCompatible) return [];
    return seriesVisibles
      .map((serie) => {
        const inicial = serie.puntos.find((punto) => punto.periodo === inicio)?.valor ?? null;
        const final = serie.puntos.find((punto) => punto.periodo === fin)?.valor ?? null;
        if (inicial === null || final === null) return null;
        const absoluto = final - inicial;
        const relativo = inicial === 0 ? null : (100 * absoluto) / Math.abs(inicial);
        return { serie, inicial, final, absoluto, relativo };
      })
      .filter((fila): fila is NonNullable<typeof fila> => fila !== null);
  }, [comparando, inicio, fin, comparacionCompatible, seriesVisibles]);

  const periodoHover = hover;
  const puntoHover = periodoHover
    ? seriesVisibles
        .map((serie) => ({
          serie,
          punto: serie.puntos.find((item) => item.periodo === periodoHover) ?? null,
        }))
        .filter((item) => item.punto && item.punto.valor !== null)
    : [];

  const moverPeriodo = (delta: number) => {
    const indice = visibles.indexOf(periodoReferencia);
    const destino = visibles[Math.min(visibles.length - 1, Math.max(0, (indice < 0 ? 0 : indice) + delta))];
    if (destino) onPeriodo(destino);
  };

  /**
   * Estilo de cada serie (una sola función para líneas, puntos, tooltip,
   * etiqueta final, leyenda y tabla de comparación): el Sistema va siempre en
   * naranja quemado `#C05621` discontinuo —es la referencia del sector en
   * Crecimiento y en Importe, no una alerta ni una valoración—; los bancos usan
   * su color de comparación.
   */
  const estiloSerie = (serie: SerieInstitucion): { color: string; patron: string | null } => {
    if (serie.es_sistema) {
      return { color: COLOR.sistema, patron: '6 3' };
    }
    return {
      color: colores.get(serie.institucion_id) ?? COLOR.neutro,
      patron: patrones.get(serie.institucion_id) ?? null,
    };
  };

  /** Etiqueta al final de la serie (solo si cabe dentro del área de dibujo). */
  const etiquetaFinal = (serie: SerieInstitucion): { x: number; y: number; texto: string; color: string } | null => {
    const puntos = serie.puntos
      .filter((punto) => periodoEnVentana(punto.periodo, ventana) && punto.valor !== null)
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
    const ultimo = puntos[puntos.length - 1];
    if (!ultimo || ultimo.valor === null) return null;
    const x = escalaX(new Date(`${ultimo.periodo}-01T00:00:00`));
    const y = escalaY(ultimo.valor);
    const nombre = serie.es_sistema ? 'Sistema' : serie.institucion;
    const texto = nombre.length > 14 ? `${nombre.slice(0, 13)}…` : nombre;
    if (x + 8 + texto.length * 5.4 > margen.izquierda + anchoPlot + margen.derecha) return null;
    return { x: x + 8, y: y + 3.5, texto, color: estiloSerie(serie).color };
  };

  return (
    <div className="bm-chart bm-chart--evolution" ref={referencia}>
      <div className="bm-chart-tools">
        <div className="bm-seg" role="group" aria-label="Escala de la serie">
          <button
            type="button"
            className={`bm-seg-btn${esCrecimiento ? ' is-on' : ''}`}
            aria-pressed={esCrecimiento}
            onClick={() => onModo('crecimiento')}
            disabled={base100.series.length === 0}
            title={
              base100.series.length === 0
                ? (base100.motivo ?? 'Sin fecha base común válida')
                : `Base ${etiquetaPeriodo(base100.base ?? '')} = 100`
            }
          >
            Crecimiento
          </button>
          <button
            type="button"
            className={`bm-seg-btn${!esCrecimiento ? ' is-on' : ''}`}
            aria-pressed={!esCrecimiento}
            onClick={() => onModo('importe')}
          >
            Importe
          </button>
        </div>

        {!esCrecimiento && conSeleccion ? (
          <label className="bm-check-inline" title="Añadir el agregado del sistema como referencia">
            <input
              type="checkbox"
              checked={sistemaVisible}
              onChange={(evento) => setSistemaVisible(evento.target.checked)}
            />
            Sistema
          </label>
        ) : null}

        <button
          type="button"
          className={`bm-btn bm-btn--control${comparando ? ' is-open' : ''}`}
          aria-expanded={comparando}
          onClick={() => setComparando((valor) => !valor)}
          data-testid="comparar-fechas"
        >
          {comparando ? 'Ocultar comparación' : 'Comparar fechas'}
        </button>

        {ventana ? (
          <span className="bm-chart-hint">
            Ventana {etiquetaPeriodo(ventana[0])} – {etiquetaPeriodo(ventana[1])}
            <button type="button" className="bm-link" onClick={() => onVentana(null)}>
              Quitar
            </button>
          </span>
        ) : (
          <span className="bm-chart-hint">
            {esCrecimiento
              ? `Base ${etiquetaPeriodo(base100.base ?? '')} = 100`
              : 'Arrastra la franja inferior para acotar el periodo visible'}
          </span>
        )}
      </div>

      {comparando ? (
        <div className="bm-comparacion" data-testid="panel-comparacion">
          <div className="bm-comparacion-fechas">
            <label>
              Desde
              <select value={inicio} onChange={(evento) => onComparacion({ desde: evento.target.value, hasta: fin })}>
                {fechasComparables.map((periodo) => (
                  <option key={periodo} value={periodo}>
                    {etiquetaPeriodo(periodo)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hasta
              <select value={fin} onChange={(evento) => onComparacion({ desde: inicio, hasta: evento.target.value })}>
                {fechasComparables.map((periodo) => (
                  <option key={periodo} value={periodo}>
                    {etiquetaPeriodo(periodo)}
                  </option>
                ))}
              </select>
            </label>
            <span className="bm-comparacion-tipo">
              {comparacionCompatible
                ? mesesEntreCortes === 1
                  ? 'cambio mensual'
                  : `cambio entre fechas · ${mesesEntreCortes} meses`
                : 'flujo acumulado: solo se compara el mismo mes de cada año'}
            </span>
          </div>

          {comparacionCompatible ? (
            <table className="bm-comparacion-tabla">
              <thead>
                <tr>
                  <th scope="col">Institución</th>
                  <th scope="col">{etiquetaPeriodo(inicio)}</th>
                  <th scope="col">{etiquetaPeriodo(fin)}</th>
                  <th scope="col">Cambio</th>
                  <th scope="col">%</th>
                </tr>
              </thead>
              <tbody>
                {filasComparacion.map((fila) => (
                  <tr key={fila.serie.institucion_id}>
                    <th scope="row">
                      <span className="bm-swatch" style={{ background: estiloSerie(fila.serie).color }} aria-hidden="true" />
                      {fila.serie.es_sistema ? 'Sistema (agregado CNBV)' : fila.serie.institucion}
                    </th>
                    <td>{valorEnPantalla(fila.inicial)}</td>
                    <td>{valorEnPantalla(fila.final)}</td>
                    <td>{esCrecimiento ? `${fila.absoluto >= 0 ? '+' : ''}${indice100(fila.absoluto)}` : valorEnPantalla(fila.absoluto)}</td>
                    <td>{fila.relativo === null ? '—' : `${fila.relativo >= 0 ? '+' : ''}${porcentaje(fila.relativo)} %`}</td>
                  </tr>
                ))}
                {filasComparacion.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="bm-empty">
                      Sin datos comparables en esas fechas.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}

      <div className="bm-chart-scroll">
        <svg
          width={ancho}
          height={ALTO_PLOT + margen.abajo + (usarBrush ? ALTO_BRUSH + 6 : 0)}
          viewBox={`0 0 ${ancho} ${ALTO_PLOT + margen.abajo + (usarBrush ? ALTO_BRUSH + 6 : 0)}`}
          role="img"
          aria-label={`Evolución ${esCrecimiento ? `en índice base 100 (${etiquetaPeriodo(base100.base ?? '')} = 100)` : 'de los importes'} entre ${etiquetaPeriodo(visibles[0] ?? '')} y ${etiquetaPeriodo(visibles[visibles.length - 1] ?? '')}. Los meses sin boletín se marcan con muescas y no se unen con líneas.`}
          tabIndex={0}
          onKeyDown={(evento) => {
            if (evento.key === 'ArrowRight') {
              evento.preventDefault();
              moverPeriodo(1);
            } else if (evento.key === 'ArrowLeft') {
              evento.preventDefault();
              moverPeriodo(-1);
            }
          }}
        >
          {/* Cobertura: muescas discretas en el borde superior */}
          {huecos.map((hueco, indice) => (
            <line
              key={`hueco-${indice}`}
              x1={hueco.x}
              x2={hueco.x}
              y1={margen.arriba - 6}
              y2={margen.arriba}
              stroke={COLOR.guiaFuerte}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}

          {ticksY.map((tick) => (
            <g key={tick}>
              <line
                x1={margen.izquierda}
                x2={margen.izquierda + anchoPlot}
                y1={escalaY(tick)}
                y2={escalaY(tick)}
                stroke={tick === 0 && !esCrecimiento ? COLOR.guiaFuerte : COLOR.guia}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={margen.izquierda - 8}
                y={escalaY(tick) + 4}
                textAnchor="end"
                fill={COLOR.textoSuave}
                fontSize={10}
                fontVariant="tabular-nums"
              >
                {formatoTick(tick)}
              </text>
            </g>
          ))}

          {/* Guía de la base 100 */}
          {esCrecimiento ? (
            <line
              x1={margen.izquierda}
              x2={margen.izquierda + anchoPlot}
              y1={escalaY(100)}
              y2={escalaY(100)}
              stroke={COLOR.guiaFuerte}
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          ) : null}

          <rect
            x={margen.izquierda}
            y={margen.arriba}
            width={anchoPlot}
            height={ALTO_PLOT - margen.arriba}
            fill="transparent"
            onMouseMove={(evento) => {
              const caja = evento.currentTarget.getBoundingClientRect();
              const fecha = escalaX.invert(evento.clientX - caja.left);
              let mejor: string | null = null;
              let distancia = Infinity;
              for (const periodo of visibles) {
                const d = Math.abs(new Date(`${periodo}-01T00:00:00`).getTime() - fecha.getTime());
                if (d < distancia) {
                  distancia = d;
                  mejor = periodo;
                }
              }
              setHover(mejor);
            }}
            onMouseLeave={() => setHover(null)}
            onClick={(evento) => {
              const caja = evento.currentTarget.getBoundingClientRect();
              const fecha = escalaX.invert(evento.clientX - caja.left);
              let mejor: string | null = null;
              let distancia = Infinity;
              for (const periodo of visibles) {
                const d = Math.abs(new Date(`${periodo}-01T00:00:00`).getTime() - fecha.getTime());
                if (d < distancia) {
                  distancia = d;
                  mejor = periodo;
                }
              }
              if (mejor) onPeriodo(mejor);
            }}
          />

          {periodoHover ? (
            <line
              x1={escalaX(new Date(`${periodoHover}-01T00:00:00`))}
              x2={escalaX(new Date(`${periodoHover}-01T00:00:00`))}
              y1={margen.arriba}
              y2={ALTO_PLOT}
              stroke={COLOR.guiaFuerte}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ) : null}

          {seriesVisibles.map((serie) => {
            const { color, patron } = estiloSerie(serie);
            const enfocada = resaltado === serie.institucion_id || serie.es_sistema;
            return (
              <g key={serie.institucion_id} opacity={resaltado && !enfocada ? 0.7 : 1}>
                {tramos(serie.puntos).map((tramo, indice) => (
                  <path
                    key={`${serie.institucion_id}-${indice}`}
                    d={trazo(tramo) ?? undefined}
                    fill="none"
                    stroke={color}
                    strokeWidth={serie.es_sistema ? 2 : enfocada ? 2.2 : 1.7}
                    strokeLinecap="round"
                    strokeDasharray={patron ?? undefined}
                    data-institucion={serie.institucion_id}
                    data-color={color}
                    data-sistema={serie.es_sistema ? 'true' : 'false'}
                  />
                ))}
              </g>
            );
          })}

          {seriesVisibles.map((serie) => {
            const { color } = estiloSerie(serie);
            return serie.puntos
              .filter((punto) => periodoEnVentana(punto.periodo, ventana) && punto.valor !== null)
              .map((punto) => (
                <circle
                  key={`${serie.institucion_id}-${punto.periodo}`}
                  cx={escalaX(new Date(`${punto.periodo}-01T00:00:00`))}
                  cy={escalaY(punto.valor as number)}
                  r={punto.periodo === periodoReferencia ? 4 : 3}
                  fill={color}
                  stroke={COLOR.superficie}
                  strokeWidth={1.3}
                  data-institucion={serie.institucion_id}
                  data-color={color}
                  data-millones={punto.valor ?? ''}
                  data-billones={valorEnPantalla(punto.valor)}
                  onMouseEnter={() => {
                    setHover(punto.periodo);
                    onHover(serie.institucion_id);
                  }}
                  onMouseLeave={() => {
                    setHover(null);
                    onHover(null);
                  }}
                >
                  <title>{`${serie.institucion} · ${etiquetaPeriodo(punto.periodo)}: ${valorEnPantalla(
                    punto.valor,
                  )}${
                    !esCrecimiento && !esPorcentaje
                      ? ` (${importeExacto(punto.valor)} millones de pesos)`
                      : ''
                  }`}</title>
                </circle>
              ));
          })}

          {/* Etiqueta al final de cada serie */}
          {seriesVisibles.map((serie) => {
            const etiqueta = etiquetaFinal(serie);
            if (!etiqueta) return null;
            return (
              <text
                key={`fin-${serie.institucion_id}`}
                x={etiqueta.x}
                y={etiqueta.y}
                fill={etiqueta.color}
                fontSize={9.5}
                fontWeight={600}
              >
                {etiqueta.texto}
              </text>
            );
          })}

          {visibles.map((periodo, indicePeriodo) => {
            const esReferencia = periodo === periodoReferencia;
            if (!etiquetasVisibles.has(periodo)) return null;
            return (
              <text
                key={periodo}
                x={escalaX(new Date(`${periodo}-01T00:00:00`))}
                y={ALTO_PLOT + 14}
                textAnchor={
                  indicePeriodo === 0
                    ? 'start'
                    : indicePeriodo === visibles.length - 1
                      ? 'end'
                      : 'middle'
                }
                fill={esReferencia ? COLOR.texto : COLOR.textoSuave}
                fontSize={10}
                fontWeight={esReferencia ? 700 : 400}
              >
                {etiquetaPeriodo(periodo)}
              </text>
            );
          })}

          {usarBrush ? (
            <g transform={`translate(0,${ALTO_PLOT + margen.abajo})`} ref={brushRef} />
          ) : null}

          <text
            x={margen.izquierda}
            y={ALTO_PLOT + margen.abajo + (usarBrush ? ALTO_BRUSH + 2 : 14)}
            fill={COLOR.textoSuave}
            fontSize={9.5}
            data-testid="nota-unidad"
          >
            {notaUnidad}
          </text>
        </svg>

        {puntoHover.length > 0 ? (
          <div className="bm-tip bm-tip--wide" style={{ left: 54, top: 4 }}>
            <p className="bm-tip-title">{etiquetaPeriodo(periodoHover ?? '')}</p>
            {puntoHover.map(({ serie, punto }) => {
              const base = serie.puntos.find((item) => item.periodo === base100.base)?.valor ?? null;
              const indice = punto?.valor ?? null;
              const variacion =
                base !== null && base !== 0 && indice !== null ? 100 * (indice / base - 1) : null;
              const estilo = estiloSerie(serie);
              return (
                <div key={serie.institucion_id} className="bm-tip-bloque">
                  <p className="bm-tip-line">
                    <span className="bm-tip-swatch" style={estiloMuestra(estilo.color, estilo.patron)} />
                    {serie.es_sistema ? 'Sistema' : serie.institucion}
                    <strong>{valorEnPantalla(punto?.valor)}</strong>
                  </p>
                  {esCrecimiento ? (
                    <p className="bm-tip-soft">
                      índice {indice100(indice ?? 0)}
                      {variacion !== null ? ` · Δ base ${variacion >= 0 ? '+' : ''}${porcentaje(variacion)} %` : ''}
                      {punto?.valor !== null && punto?.valor !== undefined
                        ? ` · original ${importeExacto(punto.valor)} millones`
                        : ''}
                    </p>
                  ) : (
                    <p className="bm-tip-soft">
                      {esPorcentaje ? 'porcentaje publicado' : unidad.etiqueta}
                      {punto?.valor !== null && punto?.valor !== undefined
                        ? ` · ${importeExacto(punto.valor)} millones de pesos`
                        : ' · sin dato'}
                    </p>
                  )}
                </div>
              );
            })}
            {periodoHover === periodoReferencia && variacionReferencia !== null && periodoComparado ? (
              <p className="bm-tip-soft">
                Comparación oficial del sistema: {porcentaje(variacionReferencia)} % vs{' '}
                {etiquetaPeriodo(periodoComparado)}
              </p>
            ) : null}
            {!conSeleccion ? (
              <p className="bm-tip-soft">Añade instituciones para comparar su crecimiento.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Leyenda compacta */}
      <ul className="bm-legend" aria-label="Series visibles">
        {seriesVisibles.map((serie) => {
          const { color, patron } = estiloSerie(serie);
          return (
            <li key={serie.institucion_id}>
              <button
                type="button"
                className="bm-legend-btn"
                aria-pressed={serie.es_sistema ? undefined : seleccion.includes(serie.institucion_id)}
                onMouseEnter={() => onHover(serie.institucion_id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(serie.institucion_id)}
                onBlur={() => onHover(null)}
                onClick={() => {
                  if (!serie.es_sistema) onAlternar(serie.institucion_id);
                }}
                disabled={serie.es_sistema}
                title={serie.es_sistema ? 'Agregado publicado por la CNBV (referencia)' : 'Añadir o quitar de la comparación'}
              >
                <span className="bm-legend-marca" aria-hidden="true">
                  <span
                    className="bm-legend-line"
                    style={estiloMuestra(color, patron)}
                    data-institucion={serie.institucion_id}
                    data-color={color}
                  />
                  <span className="bm-legend-dot" style={{ background: color }} />
                </span>
                {serie.es_sistema ? 'Sistema (agregado CNBV)' : serie.institucion}
              </button>
            </li>
          );
        })}
      </ul>

      {base100.motivo && esCrecimiento === false && !esFlujo ? (
        <p className="bm-chart-note">Crecimiento no disponible: {base100.motivo}</p>
      ) : null}
      {esFlujo ? (
        <p className="bm-chart-note">
          Flujo acumulado: el crecimiento solo se calcula contra el mismo corte del año anterior.
        </p>
      ) : null}
      {!conSeleccion ? (
        <p className="bm-chart-note">
          Sin selección se muestra el Sistema del sector · añade instituciones para comparar.
        </p>
      ) : null}
      {huecos.length > 0 ? (
        <p className="bm-chart-note">
          Muescas en el borde: meses sin boletín importado; los puntos solo se unen entre meses
          consecutivos.
        </p>
      ) : null}
    </div>
  );
}

/* Evita el aviso de variable no usada en compilaciones estrictas. */
void SIGLA;

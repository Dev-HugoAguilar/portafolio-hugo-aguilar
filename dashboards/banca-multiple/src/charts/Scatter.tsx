/**
 * Mapa de rentabilidad ROA / ROE (D3 + SVG).
 *
 *  - Gráfico principal amplio + **miniatura de contexto** con todas las
 *    instituciones y el encuadre activo (mover y redimensionar desde ella).
 *  - Controles compactos: *Seleccionar* (brush rectangular) / *Desplazar*
 *    (arrastre del encuadre), +, − y *Ver todos*. Sin menús que tapen el mapa.
 *  - Vista inicial: grupo central por percentiles 10–90 **por eje** sobre pares
 *    válidos, con margen. Es una ampliación visual: no se descarta ningún dato y
 *    la miniatura conserva todos los extremos.
 *  - Coordenadas reales, escalas lineales, sin jitter ni cuadrantes inventados.
 *  - Puntos coincidentes: el tooltip lista las instituciones para elegir una sin
 *    mover las coordenadas.
 */

import { extent } from 'd3-array';
import { brush } from 'd3-brush';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { useEffect, useMemo, useRef, useState } from 'react';

import { COLOR, cuantil, etiquetaPeriodo, porcentaje } from '../domain';
import { useMeasure } from './useMeasure';

export interface PuntoRoa {
  institucion_id: string;
  institucion: string;
  roa: number;
  roe: number;
}

export interface PropsScatter {
  puntos: PuntoRoa[];
  seleccion: string[];
  resaltado: string | null;
  colores: Map<string, string>;
  /** Sin bancos comparados: todos los puntos van en azul, sin color por banco. */
  sinSeleccion: boolean;
  periodo: string;
  /** Instituciones del boletín (para separar «sin datos» de «fuera de encuadre»). */
  totalInstituciones: number;
  onHover: (institucionId: string | null) => void;
  onAlternar: (institucionId: string) => void;
  onSeleccionarVarios: (ids: string[]) => void;
  onLimpiarRecuadro: () => void;
}

interface Dominio {
  x: [number, number];
  y: [number, number];
}

type ModoInteraccion = 'seleccionar' | 'desplazar';

const ALTO = 196;
const ALTO_MINI = 52;
const MARGEN = { arriba: 20, derecha: 12, abajo: 34, izquierda: 40 };
const MINI = { arriba: 4, derecha: 4, abajo: 4, izquierda: 4 };

export function Scatter({
  puntos,
  seleccion,
  resaltado,
  colores,
  sinSeleccion,
  periodo,
  totalInstituciones,
  onHover,
  onAlternar,
  onSeleccionarVarios,
  onLimpiarRecuadro,
}: PropsScatter) {
  const { referencia, ancho } = useMeasure<HTMLDivElement>();
  const brushRef = useRef<SVGGElement | null>(null);
  const mapaRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; id: string } | null>(null);
  const [modo, setModo] = useState<ModoInteraccion>('seleccionar');
  const [encuadre, setEncuadre] = useState<Dominio | null>(null);
  const arrastre = useRef<{ tipo: 'mapa' | 'mini' | 'marco'; x: number; y: number; dominio: Dominio } | null>(
    null,
  );

  const roas = puntos.map((punto) => punto.roa);
  const roes = puntos.map((punto) => punto.roe);
  const [minRoa, maxRoa] = roas.length ? (extent(roas) as [number, number]) : [0, 1];
  const [minRoe, maxRoe] = roes.length ? (extent(roes) as [number, number]) : [0, 1];

  const dominioCompleto: Dominio = useMemo(
    () => ({
      x: [Math.min(0, minRoa) - 1, Math.max(0, maxRoa) + 1],
      y: [Math.min(0, minRoe) - 2, Math.max(0, maxRoe) + 2],
    }),
    [minRoa, maxRoa, minRoe, maxRoe],
  );

  /** Grupo central P10–P90 por eje, con un 8 % de margen. */
  const marcoCentral = (lista: PuntoRoa[]): Dominio | null => {
    if (lista.length < 8) return null;
    const ejeX: [number, number] = [cuantil(lista.map((p) => p.roa), 0.1), cuantil(lista.map((p) => p.roa), 0.9)];
    const ejeY: [number, number] = [cuantil(lista.map((p) => p.roe), 0.1), cuantil(lista.map((p) => p.roe), 0.9)];
    const anchoX = ejeX[1] - ejeX[0];
    const altoY = ejeY[1] - ejeY[0];
    if (anchoX <= 0 || altoY <= 0) return null;
    const marco: Dominio = {
      x: [ejeX[0] - anchoX * 0.08, ejeX[1] + anchoX * 0.08],
      y: [ejeY[0] - altoY * 0.08, ejeY[1] + altoY * 0.08],
    };
    const cubre =
      (marco.x[1] - marco.x[0]) / (dominioCompleto.x[1] - dominioCompleto.x[0]) > 0.92 &&
      (marco.y[1] - marco.y[0]) / (dominioCompleto.y[1] - dominioCompleto.y[0]) > 0.92;
    return cubre ? null : marco;
  };

  useEffect(() => {
    setEncuadre(marcoCentral(puntos));
    setTooltip(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puntos]);

  const dominio = encuadre ?? dominioCompleto;
  const anchoPlot = Math.max(120, ancho - MARGEN.izquierda - MARGEN.derecha);
  const escalaX = scaleLinear().domain(dominio.x).range([MARGEN.izquierda, MARGEN.izquierda + anchoPlot]);
  const escalaY = scaleLinear().domain(dominio.y).range([ALTO, MARGEN.arriba]);

  const miniAncho = anchoPlot;
  const miniEscalaX = scaleLinear()
    .domain(dominioCompleto.x)
    .range([MARGEN.izquierda + MINI.izquierda, MARGEN.izquierda + miniAncho - MINI.derecha]);
  const miniEscalaY = scaleLinear()
    .domain(dominioCompleto.y)
    .range([ALTO_MINI - MINI.abajo, MINI.arriba]);

  const dentro = (punto: PuntoRoa) =>
    punto.roa >= dominio.x[0] &&
    punto.roa <= dominio.x[1] &&
    punto.roe >= dominio.y[0] &&
    punto.roe <= dominio.y[1];

  const visibles = puntos.filter(dentro).length;
  const fuera = puntos.length - visibles;
  const sinDatos = Math.max(0, totalInstituciones - puntos.length);

  const fijarDominio = (siguiente: Dominio) => {
    const anchoX = siguiente.x[1] - siguiente.x[0];
    const altoY = siguiente.y[1] - siguiente.y[0];
    const x0 = Math.max(dominioCompleto.x[0], Math.min(dominioCompleto.x[1] - anchoX, siguiente.x[0]));
    const y0 = Math.max(dominioCompleto.y[0], Math.min(dominioCompleto.y[1] - altoY, siguiente.y[0]));
    const ajustado: Dominio = { x: [x0, x0 + anchoX], y: [y0, y0 + altoY] };
    const completo =
      Math.abs(ajustado.x[0] - dominioCompleto.x[0]) < 1e-9 &&
      Math.abs(ajustado.x[1] - dominioCompleto.x[1]) < 1e-9 &&
      Math.abs(ajustado.y[0] - dominioCompleto.y[0]) < 1e-9 &&
      Math.abs(ajustado.y[1] - dominioCompleto.y[1]) < 1e-9;
    setEncuadre(completo ? null : ajustado);
  };

  const aplicarZoom = (factor: number) => {
    const actual = dominio;
    const anchoX = actual.x[1] - actual.x[0];
    const altoY = actual.y[1] - actual.y[0];
    const baseX = dominioCompleto.x[1] - dominioCompleto.x[0];
    const baseY = dominioCompleto.y[1] - dominioCompleto.y[0];
    const nuevoAnchoX = Math.min(baseX, Math.max(baseX / 40, anchoX * factor));
    const nuevoAltoY = Math.min(baseY, Math.max(baseY / 40, altoY * factor));
    const cx = (actual.x[0] + actual.x[1]) / 2;
    const cy = (actual.y[0] + actual.y[1]) / 2;
    fijarDominio({
      x: [cx - nuevoAnchoX / 2, cx + nuevoAnchoX / 2],
      y: [cy - nuevoAltoY / 2, cy + nuevoAltoY / 2],
    });
  };

  const verTodos = () => {
    setEncuadre(null);
    onLimpiarRecuadro();
  };

  /* Brush rectangular: solo en modo «Seleccionar». */
  useEffect(() => {
    const nodo = brushRef.current;
    if (!nodo || modo !== 'seleccionar') return;
    const comportamiento = brush()
      .extent([
        [MARGEN.izquierda, MARGEN.arriba],
        [MARGEN.izquierda + anchoPlot, ALTO],
      ])
      .on('end', (evento) => {
        if (!evento.sourceEvent) return;
        const caja = evento.selection as [[number, number], [number, number]] | null;
        if (!caja) return;
        const [[x0, y0], [x1, y1]] = caja;
        const ids = puntos
          .filter((punto) => {
            const px = escalaX(punto.roa);
            const py = escalaY(punto.roe);
            return px >= x0 && px <= x1 && py >= y0 && py <= y1;
          })
          .map((punto) => punto.institucion_id);
        select(nodo).call(comportamiento.move, null);
        if (ids.length > 0) onSeleccionarVarios(ids);
      });
    const seleccionD3 = select(nodo);
    seleccionD3.call(comportamiento);
    return () => {
      seleccionD3.on('.brush', null);
    };
  }, [anchoPlot, escalaX, escalaY, puntos, onSeleccionarVarios, modo]);

  /* Desplazar el encuadre arrastrando el mapa. */
  const iniciarArrastreMapa = (evento: React.PointerEvent<SVGRectElement>) => {
    const caja = mapaRef.current?.getBoundingClientRect();
    if (!caja) return;
    arrastre.current = {
      tipo: 'mapa',
      x: evento.clientX - caja.left,
      y: evento.clientY - caja.top,
      dominio: { x: [...dominio.x] as [number, number], y: [...dominio.y] as [number, number] },
    };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  };

  const moverArrastreMapa = (evento: React.PointerEvent<SVGRectElement>) => {
    const estado = arrastre.current;
    if (!estado || estado.tipo !== 'mapa') return;
    const caja = mapaRef.current?.getBoundingClientRect();
    if (!caja) return;
    const deltaX = ((evento.clientX - caja.left - estado.x) / anchoPlot) * (estado.dominio.x[1] - estado.dominio.x[0]);
    const deltaY =
      ((evento.clientY - caja.top - estado.y) / (ALTO - MARGEN.arriba)) * (estado.dominio.y[1] - estado.dominio.y[0]);
    fijarDominio({
      x: [estado.dominio.x[0] - deltaX, estado.dominio.x[1] - deltaX],
      y: [estado.dominio.y[0] + deltaY, estado.dominio.y[1] + deltaY],
    });
  };

  const terminarArrastre = () => {
    arrastre.current = null;
  };

  /* Miniatura: mover el marco o redimensionarlo por su esquina. */
  const iniciarMini = (evento: React.PointerEvent<SVGElement>, tipo: 'mini' | 'marco') => {
    const caja = mapaRef.current?.getBoundingClientRect();
    if (!caja) return;
    evento.preventDefault();
    arrastre.current = {
      tipo,
      x: evento.clientX - caja.left,
      y: evento.clientY - caja.top,
      dominio: { x: [...dominio.x] as [number, number], y: [...dominio.y] as [number, number] },
    };
  };

  const moverMini = (evento: React.PointerEvent<SVGGElement>) => {
    const estado = arrastre.current;
    if (!estado || (estado.tipo !== 'mini' && estado.tipo !== 'marco')) return;
    const caja = mapaRef.current?.getBoundingClientRect();
    if (!caja) return;
    const x = evento.clientX - caja.left;
    const y = evento.clientY - caja.top - (ALTO + MARGEN.abajo + 8);

    if (estado.tipo === 'mini') {
      const centroX = (estado.dominio.x[0] + estado.dominio.x[1]) / 2;
      const centroY = (estado.dominio.y[0] + estado.dominio.y[1]) / 2;
      const deltaX = miniEscalaX.invert(x) - centroX;
      const deltaY = miniEscalaY.invert(y) - centroY;
      fijarDominio({
        x: [estado.dominio.x[0] + deltaX, estado.dominio.x[1] + deltaX],
        y: [estado.dominio.y[0] + deltaY, estado.dominio.y[1] + deltaY],
      });
      return;
    }

    const nuevoFinX = miniEscalaX.invert(x);
    const nuevoFinY = miniEscalaY.invert(y);
    const minimoX = (dominioCompleto.x[1] - dominioCompleto.x[0]) / 60;
    const minimoY = (dominioCompleto.y[1] - dominioCompleto.y[0]) / 60;
    fijarDominio({
      x: [
        estado.dominio.x[0],
        Math.max(estado.dominio.x[0] + minimoX, Math.min(dominioCompleto.x[1], nuevoFinX)),
      ],
      y: [
        Math.min(estado.dominio.y[1] - minimoY, Math.max(dominioCompleto.y[0], nuevoFinY)),
        estado.dominio.y[1],
      ],
    });
  };

  /* Coordenadas coincidentes: se listan para poder elegir la institución. */
  const coincidentes = (punto: PuntoRoa) =>
    puntos.filter(
      (otro) =>
        Math.abs(escalaX(otro.roa) - escalaX(punto.roa)) < 2.5 &&
        Math.abs(escalaY(otro.roe) - escalaY(punto.roe)) < 2.5,
    );

  const desplazamientoEtiqueta = useMemo(() => {
    const mapa = new Map<string, number>();
    const variantes = [-8, 14, -20, 26];
    puntos
      .filter((punto) => seleccion.includes(punto.institucion_id))
      .forEach((punto, indice) => {
        mapa.set(punto.institucion_id, variantes[indice % variantes.length] as number);
      });
    return mapa;
  }, [puntos, seleccion]);

  /**
   * Color de cada punto, sin paleta propia del gráfico:
   *  - sin selección, todos en azul `#3458F5`;
   *  - con selección, el color que el banco ya tiene asignado en el estado
   *    compartido (idéntico al ranking, la evolución, la tabla y las etiquetas) y
   *    el gris neutro `#C2CBDC` para el resto.
   * El hover no altera el color: solo resalta tamaño y etiqueta.
   */
  const colorDe = (punto: PuntoRoa) =>
    sinSeleccion
      ? COLOR.seleccion
      : seleccion.includes(punto.institucion_id)
        ? (colores.get(punto.institucion_id) ?? COLOR.neutro)
        : COLOR.neutro;

  const grupoHover = tooltip ? puntos.find((punto) => punto.institucion_id === tooltip.id) : null;
  const listaHover = grupoHover ? coincidentes(grupoHover) : [];

  const ticksX = escalaX.ticks(4);
  const ticksY = escalaY.ticks(4);
  const formatoValor = (valor: number) => {
    const rango = Math.max(dominio.x[1] - dominio.x[0], dominio.y[1] - dominio.y[0]);
    const decimales = rango > 12 ? 0 : 1;
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(valor);
  };

  const ceroVisibleX = dominio.x[0] <= 0 && dominio.x[1] >= 0;
  const ceroVisibleY = dominio.y[0] <= 0 && dominio.y[1] >= 0;
  const altoTotal = ALTO + MARGEN.arriba + MARGEN.abajo + ALTO_MINI + 10;

  return (
    <div className="bm-chart bm-chart--scatter" ref={referencia}>
      <div className="bm-chart-tools">
        <div className="bm-seg" role="group" aria-label="Modo de interacción del mapa">
          <button
            type="button"
            className={`bm-seg-btn${modo === 'seleccionar' ? ' is-on' : ''}`}
            aria-pressed={modo === 'seleccionar'}
            onClick={() => setModo('seleccionar')}
            data-testid="modo-seleccionar"
          >
            Seleccionar
          </button>
          <button
            type="button"
            className={`bm-seg-btn${modo === 'desplazar' ? ' is-on' : ''}`}
            aria-pressed={modo === 'desplazar'}
            onClick={() => setModo('desplazar')}
            data-testid="modo-desplazar"
          >
            Desplazar
          </button>
        </div>
        <div className="bm-seg" role="group" aria-label="Encuadre del mapa">
          <button type="button" className="bm-seg-btn" onClick={() => aplicarZoom(0.8)} aria-label="Acercar">
            +
          </button>
          <button type="button" className="bm-seg-btn" onClick={() => aplicarZoom(1.25)} aria-label="Alejar">
            −
          </button>
          <button type="button" className="bm-seg-btn" onClick={verTodos} data-testid="ver-todos">
            Ver todos
          </button>
        </div>
      </div>

      <p className="bm-chart-note" data-testid="nota-dispersion">
        {encuadre
          ? `Vista ampliada: ${visibles} de ${puntos.length} instituciones visibles`
          : `Vista completa: ${puntos.length} instituciones`}
        {fuera > 0 ? ` · ${fuera} fuera del encuadre` : ''}
        {sinDatos > 0 ? ` · ${sinDatos} sin ROA/ROE publicados` : ''}
      </p>

      <div className="bm-chart-scroll">
        <svg
          ref={mapaRef}
          width={ancho}
          height={altoTotal}
          viewBox={`0 0 ${ancho} ${altoTotal}`}
          role="img"
          aria-label={`Mapa de rentabilidad: ROA en el eje horizontal y ROE en el vertical, en porcentajes publicados para ${periodo}.`}
        >
          {ticksY.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={MARGEN.izquierda}
                x2={MARGEN.izquierda + anchoPlot}
                y1={escalaY(tick)}
                y2={escalaY(tick)}
                stroke={COLOR.guia}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={MARGEN.izquierda - 6}
                y={escalaY(tick) + 3.5}
                textAnchor="end"
                fill={COLOR.textoSuave}
                fontSize={9.5}
                fontVariant="tabular-nums"
              >
                {formatoValor(tick)}
              </text>
            </g>
          ))}
          {ticksX.map((tick) => (
            <g key={`x-${tick}`}>
              <line
                x1={escalaX(tick)}
                x2={escalaX(tick)}
                y1={MARGEN.arriba}
                y2={ALTO}
                stroke={COLOR.guia}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={escalaX(tick)}
                y={ALTO + 12}
                textAnchor="middle"
                fill={COLOR.textoSuave}
                fontSize={9.5}
                fontVariant="tabular-nums"
              >
                {formatoValor(tick)}
              </text>
            </g>
          ))}

          {ceroVisibleY ? (
            <line
              x1={MARGEN.izquierda}
              x2={MARGEN.izquierda + anchoPlot}
              y1={escalaY(0)}
              y2={escalaY(0)}
              stroke={COLOR.guiaFuerte}
              strokeWidth={1}
            />
          ) : null}
          {ceroVisibleX ? (
            <line
              x1={escalaX(0)}
              x2={escalaX(0)}
              y1={MARGEN.arriba}
              y2={ALTO}
              stroke={COLOR.guiaFuerte}
              strokeWidth={1}
            />
          ) : null}

          {modo === 'seleccionar' ? <g ref={brushRef} /> : null}
          {modo === 'desplazar' ? (
            <rect
              x={MARGEN.izquierda}
              y={MARGEN.arriba}
              width={anchoPlot}
              height={ALTO - MARGEN.arriba}
              fill="transparent"
              style={{ cursor: 'grab', touchAction: 'none' }}
              onPointerDown={iniciarArrastreMapa}
              onPointerMove={moverArrastreMapa}
              onPointerUp={terminarArrastre}
              onPointerCancel={terminarArrastre}
              data-testid="zona-desplazar"
            />
          ) : null}

          <g style={modo === 'desplazar' ? { pointerEvents: 'none' } : undefined}>
            {puntos.map((punto) => {
              const elegido = seleccion.includes(punto.institucion_id);
              const activo = resaltado === punto.institucion_id;
              const color = colorDe(punto);
              const radio = elegido ? 6 : activo ? 5.2 : 4;
              const etiqueta = desplazamientoEtiqueta.get(punto.institucion_id) ?? 4;
              const anchoEtiqueta = Math.min(16, punto.institucion.length) * 5.4;
              const aDerecha = escalaX(punto.roa) + 8 + anchoEtiqueta <= MARGEN.izquierda + anchoPlot;
              const etiquetaY =
                escalaY(punto.roe) + etiqueta < MARGEN.arriba + 8
                  ? escalaY(punto.roe) + 14
                  : escalaY(punto.roe) + etiqueta;
              return (
                <g
                  key={punto.institucion_id}
                  className="bm-point"
                  tabIndex={0}
                  role="button"
                  aria-pressed={elegido}
                  aria-label={`${punto.institucion}: ROA ${porcentaje(punto.roa)} %, ROE ${porcentaje(
                    punto.roe,
                  )} %, ${etiquetaPeriodo(periodo)}. ${elegido ? 'Quitar de la comparación' : 'Añadir a la comparación'}`}
                  onMouseEnter={(evento) => {
                    onHover(punto.institucion_id);
                    const caja = evento.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    if (caja) {
                      setTooltip({ x: evento.clientX - caja.left, y: evento.clientY - caja.top, id: punto.institucion_id });
                    }
                  }}
                  onMouseMove={(evento) => {
                    const caja = evento.currentTarget.ownerSVGElement?.getBoundingClientRect();
                    if (caja) {
                      setTooltip({ x: evento.clientX - caja.left, y: evento.clientY - caja.top, id: punto.institucion_id });
                    }
                  }}
                  onMouseLeave={() => {
                    onHover(null);
                    setTooltip(null);
                  }}
                  onFocus={() => onHover(punto.institucion_id)}
                  onBlur={() => {
                    onHover(null);
                    setTooltip(null);
                  }}
                  onClick={() => onAlternar(punto.institucion_id)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault();
                      onAlternar(punto.institucion_id);
                    }
                  }}
                >
                  {/* Contorno: blanco fino para separar puntos próximos y
                      contorno de selección (grafito) en los comparados. */}
                  <circle
                    cx={escalaX(punto.roa)}
                    cy={escalaY(punto.roe)}
                    r={radio}
                    fill={color}
                    stroke={elegido ? COLOR.texto : COLOR.superficie}
                    strokeWidth={elegido ? 1.6 : 1}
                    data-institucion={punto.institucion_id}
                    data-color={color}
                    data-seleccionada={elegido ? 'true' : 'false'}
                  />
                  {elegido || activo ? (
                    <text
                      x={aDerecha ? escalaX(punto.roa) + 8 : escalaX(punto.roa) - 8}
                      y={etiquetaY}
                      textAnchor={aDerecha ? 'start' : 'end'}
                      fill={COLOR.texto}
                      fontSize={9.5}
                      fontWeight={600}
                    >
                      {punto.institucion.length > 15 ? `${punto.institucion.slice(0, 14)}…` : punto.institucion}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>

          {/* Títulos de eje fuera de las marcas para no solaparse con ellas */}
          <text
            x={MARGEN.izquierda + anchoPlot}
            y={ALTO + MARGEN.abajo - 4}
            textAnchor="end"
            fill={COLOR.textoSuave}
            fontSize={9.5}
          >
            ROA (%)
          </text>
          <text
            x={10}
            y={MARGEN.arriba - 8}
            fill={COLOR.textoSuave}
            fontSize={9.5}
          >
            ROE (%)
          </text>

          {/* Miniatura de contexto: todos los puntos y el encuadre activo */}
          <g
            transform={`translate(0,${ALTO + MARGEN.abajo + 6})`}
            onPointerMove={moverMini}
            onPointerUp={terminarArrastre}
            onPointerLeave={terminarArrastre}
            data-testid="minimapa"
          >
            <rect
              x={MARGEN.izquierda + MINI.izquierda}
              y={MINI.arriba}
              width={miniAncho - MINI.izquierda - MINI.derecha}
              height={ALTO_MINI - MINI.arriba - MINI.abajo}
              fill="#F7F8FC"
              stroke={COLOR.borde}
              rx={5}
            />
            {puntos.map((punto) => (
              <circle
                key={`mini-${punto.institucion_id}`}
                cx={miniEscalaX(punto.roa)}
                cy={miniEscalaY(punto.roe)}
                r={1.6}
                fill={colorDe(punto)}
                stroke={COLOR.superficie}
                strokeWidth={0.5}
                opacity={dentro(punto) ? 1 : 0.5}
              />
            ))}
            <rect
              x={miniEscalaX(dominio.x[0])}
              y={miniEscalaY(dominio.y[1])}
              width={Math.max(8, miniEscalaX(dominio.x[1]) - miniEscalaX(dominio.x[0]))}
              height={Math.max(8, miniEscalaY(dominio.y[0]) - miniEscalaY(dominio.y[1]))}
              fill="rgba(52, 88, 245, 0.08)"
              stroke={COLOR.seleccion}
              strokeWidth={1.2}
              style={{ cursor: 'move', touchAction: 'none' }}
              onPointerDown={(evento) => iniciarMini(evento, 'mini')}
              data-testid="marco-minimapa"
            />
            <rect
              x={miniEscalaX(dominio.x[1]) - 4}
              y={miniEscalaY(dominio.y[0]) - 4}
              width={9}
              height={9}
              fill={COLOR.superficie}
              stroke={COLOR.seleccion}
              strokeWidth={1.2}
              rx={2}
              style={{ cursor: 'nwse-resize', touchAction: 'none' }}
              onPointerDown={(evento) => iniciarMini(evento, 'marco')}
              data-testid="marco-redimensionar"
            />
          </g>
        </svg>

        {tooltip && grupoHover ? (
          <div
            className="bm-tip"
            style={{
              left: Math.min(tooltip.x + 12, Math.max(8, ancho - 210)),
              top: Math.max(4, tooltip.y - 6),
            }}
          >
            <p className="bm-tip-title">{etiquetaPeriodo(periodo)}</p>
            {listaHover.map((punto) => (
              <button
                key={punto.institucion_id}
                type="button"
                className="bm-tip-opcion"
                onClick={() => onAlternar(punto.institucion_id)}
                aria-pressed={seleccion.includes(punto.institucion_id)}
              >
                <span className="bm-tip-swatch" style={{ background: colorDe(punto) }} aria-hidden="true" />
                <span className="bm-tip-opcion-nombre">{punto.institucion}</span>
                <span className="bm-tip-soft">
                  ROA {porcentaje(punto.roa)} % · ROE {porcentaje(punto.roe)} %
                </span>
              </button>
            ))}
            <p className="bm-tip-soft">
              {listaHover.length > 1
                ? `${listaHover.length} instituciones en este punto: elige una.`
                : 'Clic para añadir o quitar de la comparación.'}
            </p>
          </div>
        ) : null}
      </div>

      <ul className="bm-legend bm-legend--puntos" aria-label="Instituciones del mapa">
        {puntos
          .filter((punto) => seleccion.includes(punto.institucion_id))
          .map((punto) => (
            <li key={punto.institucion_id}>
              <span
                className="bm-legend-punto"
                style={{ background: colores.get(punto.institucion_id) ?? COLOR.neutro }}
                data-institucion={punto.institucion_id}
                data-color={colores.get(punto.institucion_id) ?? COLOR.neutro}
              />
              {punto.institucion}
            </li>
          ))}
        <li>
          {/* Misma regla que los puntos: azul sin selección, gris para el resto. */}
          <span
            className="bm-legend-punto"
            style={{ background: sinSeleccion ? COLOR.seleccion : COLOR.neutro }}
            data-color={sinSeleccion ? COLOR.seleccion : COLOR.neutro}
          />
          {sinSeleccion ? `${puntos.length} instituciones` : 'Otras instituciones'}
        </li>
      </ul>
    </div>
  );
}

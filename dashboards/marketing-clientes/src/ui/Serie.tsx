/**
 * Serie temporal del resumen.
 *
 * Una métrica por vez, con el color semántico que le corresponde; el eje y la
 * unidad son los mismos en la línea, el tooltip y el subtítulo. Al hacer clic (o
 * con Enter) en un día se filtra el resto del tablero a ese día.
 */

import { scaleLinear } from 'd3-scale';
import { area, curveMonotoneX, line } from 'd3-shape';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { FilaSerie } from '../api/tipos';
import { COLOR_METRICA, ETIQUETA_METRICA, PALETA, type Metrica } from '../paleta';
import { etiquetaFecha, etiquetaFechaCorta, numero, porcentaje, dinero } from '../dominio';

export interface PropsSerie {
  serie: FilaSerie[];
  metrica: Metrica;
  onMetrica: (metrica: Metrica) => void;
  onDia: (fecha: string) => void;
  cargando: boolean;
  vacio: boolean;
}

const ALTO = 190;
const MARGEN = { arriba: 12, derecha: 14, abajo: 24, izquierda: 48 };

function valorDe(fila: FilaSerie, metrica: Metrica): number {
  if (metrica === 'sesiones') return fila.sesiones;
  if (metrica === 'compras') return fila.compras;
  if (metrica === 'ingresos') return fila.ingresos_usd;
  return fila.usuarios;
}

export function Serie({ serie, metrica, onMetrica, onDia, cargando, vacio }: PropsSerie) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(0);
  const [activo, setActivo] = useState<number | null>(null);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja) setAncho(Math.max(260, Math.round(caja.width)));
    });
    observador.observe(nodo);
    setAncho(Math.max(260, Math.round(nodo.getBoundingClientRect().width)));
    return () => observador.disconnect();
  }, []);

  const datos = useMemo(() => [...serie].sort((a, b) => a.fecha.localeCompare(b.fecha)), [serie]);
  const valores = datos.map((fila) => valorDe(fila, metrica));
  const maximo = Math.max(1, ...valores);
  const color = COLOR_METRICA[metrica];

  const anchoUtil = Math.max(60, ancho - MARGEN.izquierda - MARGEN.derecha);
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const escalaX = scaleLinear().domain([0, Math.max(1, datos.length - 1)]).range([MARGEN.izquierda, MARGEN.izquierda + anchoUtil]);
  const escalaY = scaleLinear().domain([0, maximo * 1.12]).range([MARGEN.arriba + altoUtil, MARGEN.arriba]);

  const puntos = datos.map((fila, indice) => ({ x: escalaX(indice), y: escalaY(valorDe(fila, metrica)), fila }));
  const trazo = line<{ x: number; y: number }>().x((p) => p.x).y((p) => p.y).curve(curveMonotoneX);
  const relleno = area<{ x: number; y: number }>()
    .x((p) => p.x)
    .y0(MARGEN.arriba + altoUtil)
    .y1((p) => p.y)
    .curve(curveMonotoneX);

  const marcas = escalaY.ticks(4);
  const paso = Math.max(1, Math.ceil(datos.length / Math.max(4, Math.floor(anchoUtil / 62))));
  const activoDato = activo !== null ? puntos[activo] ?? null : null;
  const formato = (valor: number) => (metrica === 'ingresos' ? dinero(valor) : numero(valor));

  return (
    <section className="mk-panel mk-panel--serie" aria-labelledby="mk-t-serie" data-testid="panel-serie">
      <div className="mk-panel-head">
        <div>
          <h3 id="mk-t-serie">Evolución diaria</h3>
          <p className="mk-panel-sub">
            {ETIQUETA_METRICA[metrica]} por día · unidad: {metrica === 'ingresos' ? 'USD' : 'conteo'} ·
            haz clic en un día para filtrar el tablero
          </p>
        </div>
        <div className="mk-segmentado" role="group" aria-label="Métrica de la serie">
          {(['usuarios', 'sesiones', 'compras', 'ingresos'] as Metrica[]).map((opcion) => (
            <button
              key={opcion}
              type="button"
              className={`mk-seg${metrica === opcion ? ' is-activa' : ''}`}
              onClick={() => onMetrica(opcion)}
              aria-pressed={metrica === opcion}
            >
              {ETIQUETA_METRICA[opcion]}
            </button>
          ))}
        </div>
      </div>

      <div className="mk-serie-caja" ref={contenedor}>
        {datos.length === 0 ? (
          <p className="mk-vacio">
            {vacio
              ? 'Sin datos publicados: la serie aparecerá cuando exista una versión del conjunto.'
              : 'No hay días con datos para los filtros actuales.'}
          </p>
        ) : (
          <svg
            width={ancho}
            height={ALTO}
            role="img"
            aria-label={`Serie diaria de ${ETIQUETA_METRICA[metrica].toLowerCase()}: ${datos.length} días, máximo ${formato(maximo)}.`}
          >
            {marcas.map((marca) => (
              <g key={marca}>
                <line
                  x1={MARGEN.izquierda}
                  x2={MARGEN.izquierda + anchoUtil}
                  y1={escalaY(marca)}
                  y2={escalaY(marca)}
                  stroke={PALETA.guia}
                  strokeWidth={1}
                />
                <text x={MARGEN.izquierda - 7} y={escalaY(marca) + 3.5} textAnchor="end" fill={PALETA.textSecondary} fontSize={9.5}>
                  {metrica === 'ingresos' ? numero(marca) : numero(marca)}
                </text>
              </g>
            ))}

            <path d={relleno(puntos) ?? ''} fill={color} opacity={0.12} />
            <path d={trazo(puntos) ?? ''} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />

            {puntos.map((punto, indice) =>
              indice % paso === 0 ? (
                <text
                  key={punto.fila.fecha}
                  x={punto.x}
                  y={ALTO - 7}
                  textAnchor={indice === 0 ? 'start' : indice === puntos.length - 1 ? 'end' : 'middle'}
                  fill={PALETA.textSecondary}
                  fontSize={9.5}
                >
                  {etiquetaFechaCorta(punto.fila.fecha)}
                </text>
              ) : null,
            )}

            {activoDato ? (
              <g pointerEvents="none">
                <line
                  x1={activoDato.x}
                  x2={activoDato.x}
                  y1={MARGEN.arriba}
                  y2={MARGEN.arriba + altoUtil}
                  stroke={PALETA.guiaFuerte}
                  strokeDasharray="3 3"
                />
                <circle cx={activoDato.x} cy={activoDato.y} r={3.6} fill={color} stroke="#fff" strokeWidth={1.4} />
              </g>
            ) : null}

            {puntos.map((punto, indice) => (
              <rect
                key={`zona-${punto.fila.fecha}`}
                x={punto.x - anchoUtil / Math.max(1, datos.length) / 2}
                y={MARGEN.arriba}
                width={Math.max(6, anchoUtil / Math.max(1, datos.length))}
                height={altoUtil}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${etiquetaFecha(punto.fila.fecha)}: ${formato(valorDe(punto.fila, metrica))}. Activar para filtrar ese día.`}
                onMouseEnter={() => setActivo(indice)}
                onMouseLeave={() => setActivo(null)}
                onFocus={() => setActivo(indice)}
                onBlur={() => setActivo(null)}
                onClick={() => onDia(punto.fila.fecha)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter' || evento.key === ' ') {
                    evento.preventDefault();
                    onDia(punto.fila.fecha);
                  }
                }}
              />
            ))}
          </svg>
        )}

        {activoDato ? (
          <div
            className="mk-tooltip"
            style={{ left: Math.min(Math.max(8, activoDato.x - 76), Math.max(8, ancho - 176)), top: 4 }}
            role="status"
          >
            <p className="mk-tooltip-title">{etiquetaFecha(activoDato.fila.fecha)}</p>
            <dl className="mk-tooltip-lista">
              <div>
                <dt>Usuarios</dt>
                <dd>{numero(activoDato.fila.usuarios)}</dd>
              </div>
              <div>
                <dt>Sesiones</dt>
                <dd>{numero(activoDato.fila.sesiones)}</dd>
              </div>
              <div>
                <dt>Compras</dt>
                <dd>{numero(activoDato.fila.compras)}</dd>
              </div>
              <div>
                <dt>Ingresos</dt>
                <dd>{dinero(activoDato.fila.ingresos_usd)}</dd>
              </div>
              <div>
                <dt>Conversión</dt>
                <dd>{porcentaje(activoDato.fila.conversion)}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>

      {cargando ? <p className="mk-nota">Actualizando la serie…</p> : null}
    </section>
  );
}

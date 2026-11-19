/**
 * Mapa de desempeño de canales (vista Resumen).
 *
 * Un punto por canal: X = usuarios observados, Y = conversión a comprador, área
 * proporcional a las compras y color por canal. La línea horizontal es la
 * conversión global sobre usuarios únicos y sirve de referencia.
 *
 * Las posiciones son **exactas** (escala lineal en X y en Y): ningún punto se
 * desplaza para evitar solapamientos. Cuando dos burbujas se solapan, la etiqueta
 * se resuelve con una guía corta y la selección sigue siendo por el centro real
 * del punto, así que el gráfico nunca miente sobre la posición de un dato.
 */

import { scaleLinear, scaleSqrt } from 'd3-scale';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { FilaMapa } from '../api/tipos';
import { dinero, numero, porcentaje } from '../dominio';
import { PALETA } from '../paleta';

export interface PropsPanelCanales {
  filas: FilaMapa[];
  conversionGlobal: number | null;
  seleccionados: string[];
  onCanal: (canal: string) => void;
  vacio: boolean;
  cargando: boolean;
}

const ALTO = 320;
const MARGEN = { arriba: 18, derecha: 132, abajo: 38, izquierda: 54 };

/** Colores categóricos estables: el canal con más usuarios siempre es azul. */
const COLORES = [PALETA.primary, PALETA.teal, PALETA.violeta, '#B4712A', '#3E7A46', '#8A4F7D', '#52607A'];

export function PanelCanales({
  filas,
  conversionGlobal,
  seleccionados,
  onCanal,
  vacio,
  cargando,
}: PropsPanelCanales) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(760);
  const [activo, setActivo] = useState<string | null>(null);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja) setAncho(Math.max(360, Math.round(caja.width)));
    });
    observador.observe(nodo);
    setAncho(Math.max(360, Math.round(nodo.getBoundingClientRect().width)));
    return () => observador.disconnect();
  }, []);

  const datos = useMemo(
    () =>
      filas
        .filter((fila) => fila.usuarios > 0)
        .map((fila) => ({
          ...fila,
          conversion: fila.conversion ?? 0,
          compras: Math.max(0, fila.compras),
        }))
        .sort((a, b) => b.usuarios - a.usuarios),
    [filas],
  );

  const colores = useMemo(() => {
    const mapa = new Map<string, string>();
    datos.forEach((fila, indice) => {
      mapa.set(
        fila.canal,
        fila.canal === 'Sin información' ? PALETA.neutro : COLORES[indice % COLORES.length]!,
      );
    });
    return mapa;
  }, [datos]);

  const anchoUtil = Math.max(120, ancho - MARGEN.izquierda - MARGEN.derecha);
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;

  const maxUsuarios = Math.max(1, ...datos.map((fila) => fila.usuarios));
  const maxConversion = Math.max(
    conversionGlobal ?? 0,
    ...datos.map((fila) => fila.conversion),
    0.001,
  );
  const maxCompras = Math.max(1, ...datos.map((fila) => fila.compras));

  const escalaX = scaleLinear().domain([0, maxUsuarios * 1.05]).range([MARGEN.izquierda, MARGEN.izquierda + anchoUtil]);
  const escalaY = scaleLinear()
    .domain([0, maxConversion * 1.15])
    .range([MARGEN.arriba + altoUtil, MARGEN.arriba]);
  const escalaR = scaleSqrt().domain([0, maxCompras]).range([4, 30]);

  const puntos = datos.map((fila) => ({
    fila,
    x: escalaX(fila.usuarios),
    y: escalaY(fila.conversion),
    r: escalaR(fila.compras),
    color: colores.get(fila.canal) ?? PALETA.primary,
  }));

  const activoPunto = puntos.find((punto) => punto.fila.canal === activo) ?? null;
  const marcasY = escalaY.ticks(4);
  const marcasX = escalaX.ticks(5);

  return (
    <section className="mk-panel" aria-labelledby="mk-t-mapa" data-testid="panel-mapa-canales">
      <div className="mk-panel-head">
        <div>
          <h3 id="mk-t-mapa">Mapa de desempeño de canales</h3>
          <p className="mk-panel-sub">
            Usuarios observados (X) frente a conversión a comprador (Y) · área = compras ·
            línea de referencia = conversión global{' '}
            {conversionGlobal === null ? 'sin datos' : porcentaje(conversionGlobal)}
          </p>
        </div>
      </div>

      {datos.length === 0 ? (
        <p className="mk-vacio">
          {vacio
            ? 'Sin datos publicados: el mapa aparecerá cuando exista una versión cargada.'
            : 'No hay canales con usuarios para los filtros actuales.'}
        </p>
      ) : (
        <div className="mk-mapa-caja" ref={contenedor}>
          <svg
            width={ancho}
            height={ALTO}
            role="img"
            aria-label={`Mapa de ${datos.length} canales: usuarios frente a conversión, con la conversión global de referencia.`}
          >
            {marcasY.map((marca) => (
              <g key={`y-${marca}`}>
                <line
                  x1={MARGEN.izquierda}
                  x2={MARGEN.izquierda + anchoUtil}
                  y1={escalaY(marca)}
                  y2={escalaY(marca)}
                  stroke={PALETA.guia}
                />
                <text x={MARGEN.izquierda - 8} y={escalaY(marca) + 3.5} textAnchor="end" fill={PALETA.textSecondary} fontSize={10}>
                  {marca.toFixed(marca >= 10 ? 0 : 1)} %
                </text>
              </g>
            ))}
            {marcasX.map((marca) => (
              <text key={`x-${marca}`} x={escalaX(marca)} y={ALTO - 16} textAnchor="middle" fill={PALETA.textSecondary} fontSize={10}>
                {numero(marca)}
              </text>
            ))}
            <text x={MARGEN.izquierda + anchoUtil / 2} y={ALTO - 2} textAnchor="middle" fill={PALETA.textSecondary} fontSize={10}>
              Usuarios observados
            </text>

            {conversionGlobal !== null ? (
              <g>
                <line
                  x1={MARGEN.izquierda}
                  x2={MARGEN.izquierda + anchoUtil}
                  y1={escalaY(conversionGlobal)}
                  y2={escalaY(conversionGlobal)}
                  stroke={PALETA.textSecondary}
                  strokeDasharray="4 3"
                  strokeWidth={1.2}
                />
                <text
                  x={MARGEN.izquierda + anchoUtil - 4}
                  y={escalaY(conversionGlobal) - 5}
                  textAnchor="end"
                  fill={PALETA.textSecondary}
                  fontSize={10}
                >
                  conversión global {porcentaje(conversionGlobal)}
                </text>
              </g>
            ) : null}

            {puntos.map((punto) => {
              const elegido = seleccionados.includes(punto.fila.canal);
              return (
                <g key={punto.fila.canal}>
                  <circle
                    cx={punto.x}
                    cy={punto.y}
                    r={punto.r}
                    fill={punto.color}
                    fillOpacity={elegido ? 0.55 : 0.22}
                    stroke={elegido ? PALETA.text : punto.color}
                    strokeWidth={elegido ? 2 : 1.2}
                  />
                  <circle
                    cx={punto.x}
                    cy={punto.y}
                    r={punto.r}
                    fill="transparent"
                    role="button"
                    tabIndex={0}
                    aria-label={`${punto.fila.canal}: ${numero(punto.fila.usuarios)} usuarios, ${porcentaje(
                      punto.fila.conversion,
                    )} de conversión, ${numero(punto.fila.compras)} compras. Activar para filtrar por este canal.`}
                    onMouseEnter={() => setActivo(punto.fila.canal)}
                    onMouseLeave={() => setActivo(null)}
                    onFocus={() => setActivo(punto.fila.canal)}
                    onBlur={() => setActivo(null)}
                    onClick={() => onCanal(punto.fila.canal)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter' || evento.key === ' ') {
                        evento.preventDefault();
                        onCanal(punto.fila.canal);
                      }
                    }}
                  />
                </g>
              );
            })}

            {/* Etiquetas fuera del área de datos, con guía hasta el centro real. */}
            {puntos.map((punto, indice) => {
              const xEtiqueta = MARGEN.izquierda + anchoUtil + 12;
              const yEtiqueta = MARGEN.arriba + 12 + indice * 19;
              const nombre = punto.fila.canal.length > 20 ? `${punto.fila.canal.slice(0, 19)}…` : punto.fila.canal;
              return (
                <g key={`et-${punto.fila.canal}`} pointerEvents="none">
                  <line
                    x1={punto.x + punto.r}
                    y1={punto.y}
                    x2={xEtiqueta - 4}
                    y2={yEtiqueta - 3}
                    stroke={PALETA.guiaFuerte}
                    strokeWidth={0.8}
                  />
                  <circle cx={xEtiqueta + 3} cy={yEtiqueta - 3} r={3} fill={punto.color} />
                  <text x={xEtiqueta + 10} y={yEtiqueta} fill={PALETA.text} fontSize={10}>
                    {nombre}
                    {punto.fila.base_reducida ? ' *' : ''}
                  </text>
                </g>
              );
            })}
          </svg>

          {activoPunto ? (
            <div
              className="mk-tooltip"
              style={{
                left: Math.min(Math.max(8, activoPunto.x - 70), Math.max(8, ancho - 210)),
                top: Math.max(4, activoPunto.y - 96),
              }}
              role="status"
            >
              <p className="mk-tooltip-title">{activoPunto.fila.canal}</p>
              <dl className="mk-tooltip-lista">
                <div>
                  <dt>Usuarios</dt>
                  <dd>{numero(activoPunto.fila.usuarios)}</dd>
                </div>
                <div>
                  <dt>Compradores</dt>
                  <dd>{numero(activoPunto.fila.compradores)}</dd>
                </div>
                <div>
                  <dt>Compras</dt>
                  <dd>{numero(activoPunto.fila.compras)}</dd>
                </div>
                <div>
                  <dt>Ingresos</dt>
                  <dd>{dinero(activoPunto.fila.ingresos_usd)}</dd>
                </div>
                <div>
                  <dt>Conversión</dt>
                  <dd>{porcentaje(activoPunto.fila.conversion)}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <p className="mk-nota mk-nota--pie">
            * Base menor a 100 usuarios: la conversión se muestra igual, pero es poco estable.
            «Sin información» es una categoría explícita, no tráfico directo.
          </p>
        </div>
      )}

      {cargando ? <p className="mk-nota">Actualizando el mapa…</p> : null}
    </section>
  );
}

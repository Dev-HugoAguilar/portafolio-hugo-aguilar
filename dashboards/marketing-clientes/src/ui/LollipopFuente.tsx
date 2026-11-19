/**
 * «Conversión por fuente»: lollipop horizontal de compradores ÷ usuarios.
 *
 * Una fila por canal de adquisición del usuario. El eje mide la **conversión de
 * usuario** (compradores únicos ÷ usuarios únicos), no la conversión de sesión; la
 * referencia vertical se calcula con los totales del rango, no promediando tasas.
 *
 * Geometría: el SVG usa el **ancho medido del contenedor** (ResizeObserver), reserva
 * espacio para las etiquetas de la izquierda y para los conteos de la derecha, y la
 * escala D3 cubre exactamente el área de trazado restante. Si la medida es
 * insuficiente no se dibuja, para no mostrar un gráfico comprimido.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';

import type { ConversionFuente, FilaLollipop } from '../api/tipos';
import { numero, porcentaje } from '../dominio';
import { PALETA } from '../paleta';

export interface PropsLollipop {
  datos: ConversionFuente | null;
  onCanal: (canal: string) => void;
  seleccionados: string[];
  vacio: boolean;
  cargando: boolean;
}

type Orden = 'conversion' | 'usuarios' | 'compradores';

const ETIQUETA_ORDEN: Record<Orden, string> = {
  conversion: 'Conversión',
  usuarios: 'Usuarios',
  compradores: 'Compradores',
};

const ALTO_FILA = 26;
const MARGEN_ARRIBA = 26;
const MARGEN_ABAJO = 30;
/** Ancho mínimo legible; por debajo, el contenedor hace scroll horizontal. */
const ANCHO_MINIMO = 620;
/** Reserva a la derecha para «compradores / usuarios». */
const RESERVA_DERECHA = 122;
const RESERVA_ETIQUETA_MAX = 230;
const RESERVA_ETIQUETA_MIN = 138;

const COLORES = [PALETA.primary, PALETA.teal, PALETA.violeta, '#B4712A', '#3E7A46', '#8A4F7D', '#52607A'];

function colorDe(canal: string, indice: number): string {
  if (canal === 'Sin información / Sin información') return PALETA.gris;
  return COLORES[indice % COLORES.length]!;
}

export function LollipopFuente({ datos, onCanal, seleccionados, vacio, cargando }: PropsLollipop) {
  const [orden, setOrden] = useState<Orden>('conversion');
  const [activo, setActivo] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [medido, setMedido] = useState(0);

  const filas = useMemo(() => {
    const lista = [...(datos?.filas ?? [])];
    const valor = (fila: FilaLollipop) =>
      orden === 'conversion' ? fila.conversion ?? 0 : orden === 'usuarios' ? fila.usuarios : fila.compradores;
    return lista.sort((a, b) => valor(b) - valor(a) || a.canal.localeCompare(b.canal));
  }, [datos, orden]);

  /* Se mide el contenedor y se recalcula al abrir la pestaña, al redimensionar la
     ventana y al entrar o salir del modo ampliado. */
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const actualizar = () => setMedido(Math.round(nodo.getBoundingClientRect().width));
    actualizar();
    const observador = new ResizeObserver(actualizar);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [filas.length]);

  const colorPorCanal = useMemo(() => {
    const mapa = new Map<string, string>();
    [...(datos?.filas ?? [])]
      .sort((a, b) => a.canal.localeCompare(b.canal))
      .forEach((fila, indice) => mapa.set(fila.canal, colorDe(fila.canal, indice)));
    return mapa;
  }, [datos]);

  const ancho = Math.max(ANCHO_MINIMO, medido);
  const reservaIzquierda = Math.min(
    RESERVA_ETIQUETA_MAX,
    Math.max(RESERVA_ETIQUETA_MIN, Math.round(ancho * 0.2)),
  );
  const x0 = reservaIzquierda;
  const x1 = Math.max(x0 + 180, ancho - RESERVA_DERECHA);
  const trazado = x1 - x0;

  const alto = MARGEN_ARRIBA + MARGEN_ABAJO + Math.max(1, filas.length) * ALTO_FILA;
  const maximo = Math.max(
    datos?.referencia_global.valor ?? 0,
    ...filas.map((fila) => fila.conversion ?? 0),
    0.1,
  );
  const escala = scaleLinear().domain([0, maximo * 1.12]).range([x0, x1]);
  const numeroTicks = Math.max(2, Math.min(7, Math.floor(trazado / 95)));
  const marcas = escala.ticks(numeroTicks);
  const activoFila = filas.find((fila) => fila.canal === activo) ?? null;
  const umbral = datos?.umbral_base_reducida ?? 100;
  const listo = medido >= 260 && filas.length > 0;

  return (
    <section className="mk-panel" aria-labelledby="mk-t-lollipop" data-testid="panel-lollipop">
      <div className="mk-panel-head">
        <div>
          <h3 id="mk-t-lollipop">Conversión por fuente</h3>
          <p className="mk-panel-sub">
            Compradores únicos ÷ usuarios únicos por canal · referencia global{' '}
            {porcentaje(datos?.referencia_global.valor)}
          </p>
        </div>
        <div className="mk-panel-controls">
          <div className="mk-segmentado" role="group" aria-label="Orden del ranking">
            {(Object.keys(ETIQUETA_ORDEN) as Orden[]).map((opcion) => (
              <button
                key={opcion}
                type="button"
                className={`mk-seg${orden === opcion ? ' is-activa' : ''}`}
                onClick={() => setOrden(opcion)}
                aria-pressed={orden === opcion}
              >
                {ETIQUETA_ORDEN[opcion]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mk-lollipop-caja" ref={contenedor}>
        {filas.length === 0 ? (
          <p className="mk-vacio">
            {vacio
              ? 'Sin datos publicados: el ranking aparecerá cuando exista una versión cargada.'
              : 'No hay fuentes con usuarios para los filtros actuales.'}
          </p>
        ) : listo ? (
            <svg
              width={ancho}
              height={alto}
              viewBox={`0 0 ${ancho} ${alto}`}
              role="img"
              aria-label={`Conversión por fuente: ${filas.length} canales. Referencia global ${porcentaje(
                datos?.referencia_global.valor,
              )}.`}
            >
              {marcas.map((marca) => (
                <g key={marca}>
                  <line
                    x1={escala(marca)}
                    x2={escala(marca)}
                    y1={MARGEN_ARRIBA - 8}
                    y2={alto - MARGEN_ABAJO}
                    stroke={PALETA.guia}
                  />
                  <text
                    x={escala(marca)}
                    y={alto - MARGEN_ABAJO + 15}
                    textAnchor="middle"
                    fill={PALETA.textSecondary}
                    fontSize={9.5}
                  >
                    {marca.toFixed(1)} %
                  </text>
                </g>
              ))}

              {datos?.referencia_global.valor !== null && datos?.referencia_global.valor !== undefined ? (
                <g>
                  <line
                    x1={escala(datos.referencia_global.valor)}
                    x2={escala(datos.referencia_global.valor)}
                    y1={MARGEN_ARRIBA - 10}
                    y2={alto - MARGEN_ABAJO}
                    stroke={PALETA.textSecondary}
                    strokeDasharray="4 3"
                    strokeWidth={1.2}
                  />
                  <text
                    x={Math.min(x1, escala(datos.referencia_global.valor) + 6)}
                    y={MARGEN_ARRIBA - 12}
                    textAnchor={escala(datos.referencia_global.valor) + 74 > x1 ? 'end' : 'start'}
                    fill={PALETA.textSecondary}
                    fontSize={9.5}
                  >
                    global {porcentaje(datos.referencia_global.valor)}
                  </text>
                </g>
              ) : null}

              {filas.map((fila, indice) => {
                const y = MARGEN_ARRIBA + indice * ALTO_FILA + ALTO_FILA / 2;
                const color = colorPorCanal.get(fila.canal) ?? PALETA.primary;
                const elegido = seleccionados.includes(fila.canal);
                const x = escala(fila.conversion ?? 0);
                const nombre = fila.canal.length > 30 ? `${fila.canal.slice(0, 29)}…` : fila.canal;
                // El porcentaje va a la derecha del punto si cabe; si no, a la izquierda.
                const cabeDerecha = x + 8 + 40 <= x1;
                return (
                  <g key={fila.canal} opacity={activo && activo !== fila.canal ? 0.45 : 1}>
                    <text
                      x={x0 - 12}
                      y={y + 3.5}
                      textAnchor="end"
                      fill={PALETA.text}
                      fontSize={10.5}
                      className="mk-lollipop-nombre"
                    >
                      {nombre}
                      {fila.base_reducida ? ' *' : ''}
                      <title>{fila.canal}</title>
                    </text>
                    <line x1={x0} x2={x} y1={y} y2={y} stroke={color} strokeWidth={1.1} opacity={0.75} />
                    <circle
                      cx={x}
                      cy={y}
                      r={elegido ? 6 : 4.4}
                      fill={elegido ? PALETA.text : color}
                      stroke={elegido ? color : '#FFFFFF'}
                      strokeWidth={elegido ? 2 : 1.2}
                    />
                    <text
                      x={cabeDerecha ? x + 9 : x - 9}
                      y={y + 3.5}
                      textAnchor={cabeDerecha ? 'start' : 'end'}
                      fill={PALETA.text}
                      fontSize={10}
                    >
                      {porcentaje(fila.conversion)}
                    </text>
                    <text x={ancho - 6} y={y + 3.5} textAnchor="end" fill={PALETA.textSecondary} fontSize={9.5}>
                      {numero(fila.compradores)} / {numero(fila.usuarios)}
                    </text>
                    <rect
                      x={0}
                      y={y - ALTO_FILA / 2}
                      width={ancho}
                      height={ALTO_FILA}
                      fill="transparent"
                      role="button"
                      tabIndex={0}
                      aria-label={`${fila.canal}: ${porcentaje(fila.conversion)} de conversión, ${numero(
                        fila.compradores,
                      )} compradores de ${numero(fila.usuarios)} usuarios. Activar para filtrar.`}
                      onMouseEnter={() => setActivo(fila.canal)}
                      onMouseLeave={() => setActivo(null)}
                      onFocus={() => setActivo(fila.canal)}
                      onBlur={() => setActivo(null)}
                      onClick={() => onCanal(fila.canal)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter' || evento.key === ' ') {
                          evento.preventDefault();
                          onCanal(fila.canal);
                        }
                      }}
                    />
                  </g>
                );
              })}
            </svg>
        ) : (
          <p className="mk-vacio">
            {medido === 0
              ? 'Midiendo el espacio disponible…'
              : 'El bloque es demasiado estrecho para dibujar el ranking; amplía la ventana.'}
          </p>
        )}

        {activoFila && listo ? (
            <div className="mk-tooltip mk-tooltip--fijo" role="status" style={{ left: 12 }}>
              <p className="mk-tooltip-title">{activoFila.canal}</p>
              <dl className="mk-tooltip-lista">
                <div>
                  <dt>Conversión</dt>
                  <dd>{porcentaje(activoFila.conversion)}</dd>
                </div>
                <div>
                  <dt>Compradores</dt>
                  <dd>{numero(activoFila.compradores)}</dd>
                </div>
                <div>
                  <dt>Usuarios</dt>
                  <dd>{numero(activoFila.usuarios)}</dd>
                </div>
                <div>
                  <dt>Compras</dt>
                  <dd>{numero(activoFila.compras)}</dd>
                </div>
                <div>
                  <dt>Denominador</dt>
                  <dd>usuarios únicos del canal</dd>
                </div>
              </dl>
            </div>
        ) : null}
      </div>

      <details className="mk-detalle">
        <summary>Ver tabla accesible del ranking</summary>
        <div className="mk-tabla-caja">
          <table className="mk-tabla">
            <caption className="mk-sr">
              Conversión de usuario por canal: compradores únicos entre usuarios únicos.
            </caption>
            <thead>
              <tr>
                <th scope="col">Fuente / medio</th>
                <th scope="col" className="mk-num">Usuarios</th>
                <th scope="col" className="mk-num">Compradores</th>
                <th scope="col" className="mk-num">Conversión</th>
                <th scope="col" className="mk-num">Compras</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.canal} className={seleccionados.includes(fila.canal) ? 'is-elegida' : undefined}>
                  <td>
                    {fila.canal}
                    {fila.base_reducida ? ' *' : ''}
                  </td>
                  <td className="mk-num">{numero(fila.usuarios)}</td>
                  <td className="mk-num">{numero(fila.compradores)}</td>
                  <td className="mk-num">{porcentaje(fila.conversion)}</td>
                  <td className="mk-num">{numero(fila.compras)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="mk-nota mk-nota--pie">
        * Base menor a {numero(umbral)} usuarios: la tasa se muestra igual, pero es poco estable.
        La referencia global se calcula con los totales del rango, no promediando tasas.
      </p>
      {cargando ? <p className="mk-nota">Actualizando el ranking…</p> : null}
    </section>
  );
}

/**
 * «De la adquisición a la compra»: diagrama de Sankey de sesiones únicas.
 *
 * Tres columnas — canal de adquisición del usuario → dispositivo → resultado
 * observado de la sesión — con bandas de grosor proporcional a las sesiones.
 *
 * No es un recorrido de navegación ni atribución multicanal: es una distribución
 * de sesiones por atributos y resultado. Cada sesión aporta exactamente una vez a
 * cada transición, así que las entradas y salidas de la columna central cuadran.
 *
 * Los nombres de los nodos se rotulan fuera del área de dibujo (a la izquierda y a
 * la derecha de cada columna) con una guía corta: así no hay líneas que crucen el
 * gráfico y las etiquetas no se solapan con las bandas.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { EnlaceSankey, NodoSankey, Sankey } from '../api/tipos';
import { numero, porcentaje } from '../dominio';
import { PALETA } from '../paleta';

export interface PropsSankey {
  datos: Sankey | null;
  onCanal: (canal: string) => void;
  onDispositivo: (dispositivo: string) => void;
  seleccionados: string[];
  dispositivosSeleccionados: string[];
  vacio: boolean;
  cargando: boolean;
}

const ALTO = 360;
const MARGEN = { arriba: 26, abajo: 26 };
const SEPARACION_NODOS = 14;
const ANCHO_BANDA = 13;
const COLORES = [PALETA.primary, PALETA.teal, PALETA.violeta, '#B4712A', '#3E7A46', '#8A4F7D', '#52607A'];
const COLOR_CON = PALETA.violeta;
const COLOR_SIN = PALETA.neutro;

interface Nodo extends NodoSankey {
  y: number;
  alto: number;
  color: string;
}

function colorDeFuente(canal: string, orden: number): string {
  if (canal === 'Sin información / Sin información') return PALETA.gris;
  return COLORES[orden % COLORES.length]!;
}

export function SankeyAdquisicion({
  datos,
  onCanal,
  onDispositivo,
  seleccionados,
  dispositivosSeleccionados,
  vacio,
  cargando,
}: PropsSankey) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(880);
  const [activo, setActivo] = useState<string | null>(null);
  const [enlaceActivo, setEnlaceActivo] = useState<EnlaceSankey | null>(null);

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

  const modelo = useMemo(() => {
    if (!datos || datos.total_sesiones === 0) return null;
    const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
    const fuentes = datos.nodos.filter((nodo) => nodo.columna === 0);
    const dispositivos = datos.nodos.filter((nodo) => nodo.columna === 1);
    const resultados = datos.nodos.filter((nodo) => nodo.columna === 2);
  
    const colocar = (lista: NodoSankey[], colorDe: (nodo: NodoSankey, i: number) => string) => {
      const total = lista.reduce((suma, nodo) => suma + nodo.sesiones, 0) || 1;
      const disponible = altoUtil - SEPARACION_NODOS * Math.max(0, lista.length - 1);
      let y = MARGEN.arriba;
      return lista.map((nodo, indice) => {
        const alto = Math.max(2, (disponible * nodo.sesiones) / total);
        const resultado: Nodo = { ...nodo, y, alto, color: colorDe(nodo, indice) };
        y += alto + SEPARACION_NODOS;
        return resultado;
      });
    };

    const nodosFuente = colocar(fuentes, (nodo, indice) => colorDeFuente(nodo.etiqueta, indice));
    const nodosDispositivo = colocar(dispositivos, () => PALETA.primary);
    const nodosResultado = colocar(resultados, (nodo) =>
      nodo.etiqueta.startsWith('Con compra') ? COLOR_CON : COLOR_SIN,
    );

    const todos = [...nodosFuente, ...nodosDispositivo, ...nodosResultado];
    const porId = new Map(todos.map((nodo) => [nodo.id, nodo]));

    // Posiciones verticales de cada enlace dentro de su nodo (apilados por orden
    // de destino) para que las bandas no se solapen.
    const ocupado = new Map<string, number>();
    const enlaces = datos.enlaces.map((enlace) => {
      const origen = porId.get(enlace.origen);
      const destino = porId.get(enlace.destino);
      if (!origen || !destino) return null;
      const claveOrigen = `${enlace.origen}`;
      const claveDestino = `${enlace.destino}`;
      const usado = ocupado.get(claveOrigen) ?? 0;
      const totalOrigen = datos.enlaces
        .filter((item) => item.origen === enlace.origen)
        .reduce((suma, item) => suma + item.sesiones, 0) || 1;
      const altoEnlace = (origen.alto * enlace.sesiones) / totalOrigen;
      const yOrigen = origen.y + usado;
      ocupado.set(claveOrigen, usado + altoEnlace);

      const usadoDestino = ocupado.get(claveDestino) ?? 0;
      const totalDestino = datos.enlaces
        .filter((item) => item.destino === enlace.destino)
        .reduce((suma, item) => suma + item.sesiones, 0) || 1;
      const altoDestino = (destino.alto * enlace.sesiones) / totalDestino;
      const yDestino = destino.y + usadoDestino;
      ocupado.set(claveDestino, usadoDestino + altoDestino);

      return {
        ...enlace,
        yOrigen,
        yDestino,
        grosor: Math.max(0.8, Math.min(altoEnlace, altoDestino)),
        color: origen.color,
      };
    }).filter((enlace): enlace is NonNullable<typeof enlace> => Boolean(enlace));

    return { nodosFuente, nodosDispositivo, nodosResultado, enlaces, porId };
  }, [datos]);

  const margenEtiquetas = Math.min(220, Math.max(120, ancho * 0.22));
  const util = Math.max(140, ancho - margenEtiquetas * 2);
  const xColumna: [number, number, number] = [margenEtiquetas, margenEtiquetas + util / 2, margenEtiquetas + util];
  const resaltado = activo ?? (enlaceActivo ? enlaceActivo.origen : null);
  const enlaceMarcado = enlaceActivo
    ? { origen: enlaceActivo.origen, destino: enlaceActivo.destino }
    : null;
  const enlacesResaltados = new Set<string>();
  if (resaltado) {
    for (const enlace of modelo?.enlaces ?? []) {
      if (enlace.origen === resaltado || enlace.destino === resaltado) {
        enlacesResaltados.add(`${enlace.origen}->${enlace.destino}`);
      }
    }
  }
  if (enlaceMarcado) {
    enlacesResaltados.add(`${enlaceMarcado.origen}->${enlaceMarcado.destino}`);
  }

  const nodoActivo = modelo
    ? [...modelo.nodosFuente, ...modelo.nodosDispositivo, ...modelo.nodosResultado].find(
        (nodo) => nodo.id === resaltado,
      ) ?? null
    : null;

  const alternarNodo = (nodo: Nodo) => {
    if (nodo.columna === 0) onCanal(nodo.etiqueta);
    else if (nodo.columna === 1) onDispositivo(nodo.etiqueta);
  };

  return (
    <section className="mk-panel" aria-labelledby="mk-t-sankey" data-testid="panel-sankey">
      <div className="mk-panel-head">
        <div>
          <h3 id="mk-t-sankey">De la adquisición a la compra</h3>
          <p className="mk-panel-sub">
            Sesiones según la adquisición del usuario, el dispositivo y la compra observada
          </p>
        </div>
        <p className="mk-nota-inline">
          Unidad: <strong>sesiones únicas</strong> · {numero(datos?.total_sesiones ?? null)} en el rango
          {datos?.conciliacion?.cuadra ? ' · las columnas cuadran' : ''}
        </p>
      </div>

      {!modelo ? (
        <p className="mk-vacio">
          {vacio
            ? 'Sin datos publicados: el diagrama aparecerá cuando exista una versión cargada.'
            : 'No hay sesiones para los filtros actuales.'}
        </p>
      ) : (
        <div className="mk-sankey-caja" ref={contenedor}>
          <svg
            width={ancho}
            height={ALTO}
            role="img"
            aria-label={`Diagrama de adquisición a compra: ${numero(
              datos!.total_sesiones,
            )} sesiones repartidas en ${modelo.nodosFuente.length} fuentes, ${
              modelo.nodosDispositivo.length
            } dispositivos y ${modelo.nodosResultado.length} resultados.`}
          >
            {/* Bandas */}
            {modelo.enlaces.map((enlace) => {
              const clave = `${enlace.origen}->${enlace.destino}`;
              const x0 = xColumna[enlace.columna] + ANCHO_BANDA;
              const x1 = xColumna[enlace.columna + 1] ?? xColumna[2];
              const resaltadoAhora = enlacesResaltados.has(clave);
              const apagado = Boolean(resaltado || enlaceMarcado) && !resaltadoAhora;
              const medio = (x0 + x1) / 2;
              const ruta = `M${x0},${enlace.yOrigen} C${medio},${enlace.yOrigen} ${medio},${enlace.yDestino} ${x1},${enlace.yDestino} L${x1},${enlace.yDestino + enlace.grosor} C${medio},${enlace.yDestino + enlace.grosor} ${medio},${enlace.yOrigen + enlace.grosor} ${x0},${enlace.yOrigen + enlace.grosor} Z`;
              return (
                <g key={clave}>
                  <path
                    d={ruta}
                    fill={enlace.color}
                    fillOpacity={apagado ? 0.08 : resaltadoAhora ? 0.72 : 0.32}
                    stroke={resaltadoAhora ? enlace.color : 'none'}
                    strokeWidth={resaltadoAhora ? 0.8 : 0}
                    style={{ transition: 'fill-opacity 140ms ease' }}
                  />
                  <path
                    d={ruta}
                    fill="transparent"
                    role="button"
                    tabIndex={0}
                    aria-label={`${etiquetaEnlace(modelo, enlace)}: ${numero(enlace.sesiones)} sesiones, ${porcentaje(
                      enlace.pct_total,
                    )} del total.`}
                    onMouseEnter={() => setEnlaceActivo(enlace)}
                    onMouseLeave={() => setEnlaceActivo(null)}
                    onFocus={() => setEnlaceActivo(enlace)}
                    onBlur={() => setEnlaceActivo(null)}
                  />
                </g>
              );
            })}

            {/* Nodos */}
            {[
              ...modelo.nodosFuente,
              ...modelo.nodosDispositivo,
              ...modelo.nodosResultado,
            ].map((nodo) => {
              const x = xColumna[nodo.columna];
              const activoNodo = resaltado === nodo.id;
              const seleccionado =
                (nodo.columna === 0 && seleccionados.includes(nodo.etiqueta)) ||
                (nodo.columna === 1 && dispositivosSeleccionados.includes(nodo.etiqueta));
              const apagado = Boolean(resaltado) && !activoNodo;
              return (
                <g key={nodo.id}>
                  <rect
                    x={x}
                    y={nodo.y}
                    width={ANCHO_BANDA}
                    height={nodo.alto}
                    rx={2}
                    fill={nodo.color}
                    fillOpacity={apagado ? 0.35 : 1}
                    stroke={seleccionado ? PALETA.text : 'none'}
                    strokeWidth={seleccionado ? 1.6 : 0}
                  />
                  <rect
                    x={x - 6}
                    y={nodo.y - 4}
                    width={ANCHO_BANDA + 12}
                    height={Math.max(10, nodo.alto) + 8}
                    fill="transparent"
                    role={nodo.columna === 2 ? undefined : 'button'}
                    tabIndex={nodo.columna === 2 ? -1 : 0}
                    aria-label={`${nodo.etiqueta}: ${numero(nodo.sesiones)} sesiones${
                      nodo.columna === 2 ? '' : '. Activar para filtrar'
                    }.`}
                    onMouseEnter={() => setActivo(nodo.id)}
                    onMouseLeave={() => setActivo(null)}
                    onFocus={() => setActivo(nodo.id)}
                    onBlur={() => setActivo(null)}
                    onClick={() => alternarNodo(nodo)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter' || evento.key === ' ') {
                        evento.preventDefault();
                        alternarNodo(nodo);
                      }
                    }}
                  />
                  {/* Etiqueta con guía: fuera del área de bandas */}
                  {nodo.columna === 0 ? (
                    <>
                      <line
                        x1={x - 8}
                        y1={nodo.y + Math.min(6, nodo.alto / 2)}
                        x2={x - 16}
                        y2={nodo.y + Math.min(6, nodo.alto / 2)}
                        stroke={PALETA.guiaFuerte}
                      />
                      <text
                        x={x - 20}
                        y={nodo.y + Math.min(9, nodo.alto / 2 + 3)}
                        textAnchor="end"
                        fill={PALETA.text}
                        fontSize={10.5}
                        className="mk-sankey-etiqueta"
                      >
                        {nombreCorto(nodo.etiqueta)}
                      </text>
                    </>
                  ) : null}
                  {nodo.columna === 1 ? (
                    <text
                      x={x + ANCHO_BANDA + 8}
                      y={nodo.y + Math.min(9, nodo.alto / 2 + 3)}
                      textAnchor="start"
                      fill={PALETA.text}
                      fontSize={10.5}
                      className="mk-sankey-etiqueta"
                    >
                      {nombreCorto(nodo.etiqueta)}
                    </text>
                  ) : null}
                  {nodo.columna === 2 ? (
                    <>
                      <line
                        x1={x + ANCHO_BANDA + 8}
                        y1={nodo.y + Math.min(6, nodo.alto / 2)}
                        x2={x + ANCHO_BANDA + 16}
                        y2={nodo.y + Math.min(6, nodo.alto / 2)}
                        stroke={PALETA.guiaFuerte}
                      />
                      <text
                        x={x + ANCHO_BANDA + 20}
                        y={nodo.y + Math.min(9, nodo.alto / 2 + 3)}
                        fill={PALETA.text}
                        fontSize={10.5}
                        className="mk-sankey-etiqueta"
                      >
                        {nodo.etiqueta} · {numero(nodo.sesiones)}
                      </text>
                    </>
                  ) : null}
                </g>
              );
            })}

            {/* Títulos de columna */}
            {['Adquisición del usuario', 'Dispositivo', 'Resultado de la sesión'].map((titulo, indice) => (
              <text
                key={titulo}
                x={(xColumna[indice] ?? 0) + (indice === 1 ? ANCHO_BANDA / 2 : 0)}
                y={14}
                textAnchor={indice === 0 ? 'start' : indice === 2 ? 'start' : 'middle'}
                fill={PALETA.textSecondary}
                fontSize={9.5}
                letterSpacing="0.06em"
              >
                {titulo.toUpperCase()}
              </text>
            ))}
          </svg>

          {nodoActivo ? (
            <div
              className="mk-tooltip mk-tooltip--fijo"
              role="status"
              style={{ left: Math.min(Math.max(8, xColumna[nodoActivo.columna] - 40), ancho - 250) }}
            >
              <p className="mk-tooltip-title">{nodoActivo.etiqueta}</p>
              <dl className="mk-tooltip-lista">
                <div>
                  <dt>Sesiones</dt>
                  <dd>{numero(nodoActivo.sesiones)}</dd>
                </div>
                <div>
                  <dt>Proporción del total</dt>
                  <dd>{porcentaje((100 * nodoActivo.sesiones) / Math.max(1, datos!.total_sesiones))}</dd>
                </div>
                <div>
                  <dt>Denominador</dt>
                  <dd>sesiones únicas del rango</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {enlaceActivo ? (
            <div className="mk-tooltip mk-tooltip--fijo" role="status" style={{ left: 8 }}>
              <p className="mk-tooltip-title">
                {etiquetaEnlace(modelo, enlaceActivo)}
              </p>
              <dl className="mk-tooltip-lista">
                <div>
                  <dt>Sesiones</dt>
                  <dd>{numero(enlaceActivo.sesiones)}</dd>
                </div>
                <div>
                  <dt>Del origen</dt>
                  <dd>{porcentaje(enlaceActivo.pct_origen)}</dd>
                </div>
                <div>
                  <dt>Del total</dt>
                  <dd>{porcentaje(enlaceActivo.pct_total)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      )}

      <p className="mk-nota mk-nota--pie">
        Sin compra observada no implica abandono definitivo. Datos históricos ofuscados de GA4.
        {datos && datos.sesiones_dispositivo_distinto > 0
          ? ` ${numero(datos.sesiones_dispositivo_distinto)} sesiones usaron un dispositivo distinto del de adquisición: se atribuyen al de adquisición.`
          : ''}
      </p>
      {cargando ? <p className="mk-nota">Actualizando el diagrama…</p> : null}
    </section>
  );
}

function nombreCorto(texto: string): string {
  return texto.length > 26 ? `${texto.slice(0, 25)}…` : texto;
}

function etiquetaEnlace(modelo: NonNullable<ReturnType<typeof Object>>, enlace: EnlaceSankey): string {
  const nombre = (id: string) => id.slice(2);
  void modelo;
  return `${nombre(enlace.origen)} → ${nombre(enlace.destino)}`;
}

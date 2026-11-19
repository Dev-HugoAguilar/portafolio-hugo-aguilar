/**
 * Evolución temporal del Atlas vial — una sola tarjeta con dos presentaciones.
 *
 * **Cantidades** (inicial): tres paneles apilados, alineados y con **escala Y
 * propia desde cero** cada uno. Comparten dominio temporal, posición horizontal
 * de cada periodo, márgenes, cursor, tooltip y selección: así la línea de
 * fallecimientos es legible sin recurrir a un doble eje ni a tres tarjetas.
 *
 * **Comparar tendencias**: un único gráfico con las tres series superpuestas en
 * índice base 100, con referencia **común** = primer periodo completo del
 * intervalo consultado. Un periodo parcial nunca sirve de referencia ni se
 * indexa como si fuera completo; si no hay ninguno, se explica.
 *
 * Contrato temporal: los valores salen de `/tiempo` con los mismos filtros y
 * límites; dentro de la cobertura un periodo sin hechos es cero real, un valor
 * no publicado se dibuja como hueco (nunca como cero) y la zona horaria es la
 * del proyecto (fechas ISO sin desplazamiento).
 *
 * Interacción: explorar (cursor de puntero, pulsación o flechas) **no** toca los
 * filtros; acotar el intervalo es un gesto aparte (botón del tooltip o Enter).
 */

import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FilaSerie } from '../api/tipos';
import { decimal, etiquetaPeriodo, numero } from '../dominio';
import { MESES_CORTOS } from '../periodo';
import { PALETA, RELLENO_MAPA } from '../paleta';

export type Agregacion = 'dia' | 'semana' | 'mes';

export interface PropsLineaTiempo {
  serie: FilaSerie[];
  agregacion: Agregacion;
  onAgregacion: (agregacion: Agregacion) => void;
  onPeriodo: (desde: string | null, hasta: string | null) => void;
  /** Límites de fecha realmente consultados; sirven para detectar periodos parciales. */
  rango: { desde: string | null; hasta: string | null };
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
}

type Clave = 'hechos' | 'lesionadas' | 'fallecidas';
type Modo = 'cantidades' | 'tendencias';

interface DefinicionSerie {
  clave: Clave;
  nombre: string;
  color: string;
}

const SERIES: DefinicionSerie[] = [
  { clave: 'hechos', nombre: 'Hechos registrados', color: RELLENO_MAPA.hechos },
  { clave: 'lesionadas', nombre: 'Personas lesionadas', color: RELLENO_MAPA.personas_lesionadas },
  { clave: 'fallecidas', nombre: 'Personas fallecidas', color: RELLENO_MAPA.personas_fallecidas },
];

const ALTO_PANEL = 110;
const ALTO_TENDENCIA = 300;
const ALTO_MINIMO = 420;
const MARGEN = { arriba: 8, derecha: 18, abajo: 18, izquierda: 56 };
const ANCHO_TOOLTIP = 224;
const AGREGACIONES: [Agregacion, string][] = [
  ['dia', 'Día'],
  ['semana', 'Semana'],
  ['mes', 'Mes'],
];
const MODOS: [Modo, string][] = [
  ['cantidades', 'Cantidades'],
  ['tendencias', 'Comparar tendencias'],
];

function valorDe(fila: FilaSerie, clave: Clave): number | null {
  const valor = fila[clave];
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

/** Primer y último día del periodo, para acotar el intervalo y medir completitud. */
function diasDelPeriodo(periodo: string, agregacion: Agregacion): [string, string] {
  if (agregacion === 'dia') return [periodo, periodo];
  if (agregacion === 'mes') {
    const [anio, mes] = periodo.split('-').map(Number);
    const ultimo = new Date(Date.UTC(anio as number, mes as number, 0)).getUTCDate();
    return [`${periodo}-01`, `${periodo}-${String(ultimo).padStart(2, '0')}`];
  }
  const [anio, semana] = periodo.split('-S').map(Number);
  const enero4 = new Date(Date.UTC(anio as number, 0, 4));
  const diaSemana = (enero4.getUTCDay() + 6) % 7;
  const lunes = new Date(enero4);
  lunes.setUTCDate(enero4.getUTCDate() - diaSemana + ((semana as number) - 1) * 7);
  const domingo = new Date(lunes);
  domingo.setUTCDate(lunes.getUTCDate() + 6);
  return [lunes.toISOString().slice(0, 10), domingo.toISOString().slice(0, 10)];
}

/** Etiqueta corta del eje temporal: sin repetir el año en cada marca. */
function etiquetaEje(periodo: string, agregacion: Agregacion, conAnio: boolean): string {
  if (agregacion === 'mes') {
    const indice = Number(periodo.slice(5, 7)) - 1;
    const mes = MESES_CORTOS[indice] ?? periodo;
    return conAnio ? `${mes} ${periodo.slice(2, 4)}` : mes;
  }
  if (agregacion === 'semana') {
    const semana = Number(periodo.split('-S')[1]);
    return Number.isFinite(semana) ? `S${semana}` : periodo;
  }
  const [, mes, dia] = periodo.split('-');
  const corto = MESES_CORTOS[Number(mes) - 1] ?? mes;
  return `${Number(dia)} ${corto}`;
}

export function LineaTiempo({
  serie,
  agregacion,
  onAgregacion,
  onPeriodo,
  rango,
  cargando,
  error,
  onReintentar,
}: PropsLineaTiempo) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(0);
  const [activo, setActivo] = useState<number | null>(null);
  const [fijado, setFijado] = useState(false);
  const [modo, setModo] = useState<Modo>('cantidades');

  /* El lienzo solo existe cuando hay datos: se vuelve a medir cuando aparece o
     cambia la presentación, y un ancho de reserva evita un primer trazo a cero. */
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
  }, [modo, serie.length]);

  const datos = useMemo(() => [...serie].sort((a, b) => a.periodo.localeCompare(b.periodo)), [serie]);

  /* Un periodo es parcial cuando el intervalo consultado lo corta por dentro:
     nunca sirve de referencia base 100 ni se indexa como completo. */
  const esParcial = useCallback(
    (periodo: string): boolean => {
      if (!rango.desde && !rango.hasta) return false;
      const [inicio, fin] = diasDelPeriodo(periodo, agregacion);
      return Boolean((rango.desde && inicio < rango.desde) || (rango.hasta && fin > rango.hasta));
    },
    [agregacion, rango.desde, rango.hasta],
  );

  const parciales = useMemo(() => {
    const mapa: Record<string, boolean> = {};
    for (const fila of datos) mapa[fila.periodo] = esParcial(fila.periodo);
    return mapa;
  }, [datos, esParcial]);

  /* Totales del intervalo (no del periodo bajo el cursor). */
  const totales = useMemo(() => {
    const suma: Record<Clave, number | null> = { hechos: null, lesionadas: null, fallecidas: null };
    for (const definicion of SERIES) {
      let acumulado = 0;
      let hay = false;
      for (const fila of datos) {
        const valor = valorDe(fila, definicion.clave);
        if (valor !== null) {
          acumulado += valor;
          hay = true;
        }
      }
      suma[definicion.clave] = hay ? acumulado : null;
    }
    return suma;
  }, [datos]);

  const maximos = useMemo(() => {
    const valores: Record<Clave, number> = { hechos: 0, lesionadas: 0, fallecidas: 0 };
    for (const fila of datos) {
      for (const definicion of SERIES) {
        const valor = valorDe(fila, definicion.clave);
        if (valor !== null && valor > valores[definicion.clave]) valores[definicion.clave] = valor;
      }
    }
    return valores;
  }, [datos]);

  /* Referencia base 100: primer periodo completo del intervalo consultado. */
  const referencia = useMemo(
    () => datos.find((fila) => !parciales[fila.periodo]) ?? null,
    [datos, parciales],
  );
  const anios = useMemo(() => [...new Set(datos.map((fila) => fila.periodo.slice(0, 4)))], [datos]);
  const variosAnios = anios.length > 1;

  const indiceDe = (fila: FilaSerie, clave: Clave): number | null => {
    if (!referencia) return null;
    const base = valorDe(referencia, clave);
    const valor = valorDe(fila, clave);
    if (base === null || base <= 0 || valor === null) return null;
    return (valor / base) * 100;
  };
  const serieIndexable = (clave: Clave): boolean => {
    if (!referencia) return false;
    const base = valorDe(referencia, clave);
    return base !== null && base > 0;
  };

  const indicesValidos = useMemo(() => {
    const lista: number[] = [];
    for (const fila of datos) {
      if (parciales[fila.periodo]) continue;
      for (const definicion of SERIES) {
        const indice = indiceDe(fila, definicion.clave);
        if (indice !== null) lista.push(indice);
      }
    }
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos, parciales, referencia]);

  const anchoDibujo = ancho > 0 ? ancho : 720;
  const anchoUtil = Math.max(60, anchoDibujo - MARGEN.izquierda - MARGEN.derecha);
  const altoUtil = ALTO_PANEL - MARGEN.arriba - MARGEN.abajo;
  const escalaX = scaleLinear()
    .domain([0, Math.max(1, datos.length - 1)])
    .range([MARGEN.izquierda, MARGEN.izquierda + anchoUtil]);

  const escalaY = (clave: Clave) => {
    const maximo = maximos[clave];
    return scaleLinear()
      .domain([0, maximo > 0 ? maximo * 1.12 : 1])
      .range([MARGEN.arriba + altoUtil, MARGEN.arriba]);
  };

  const escalaIndice = scaleLinear()
    .domain([
      Math.min(100, ...indicesValidos) * 0.94,
      Math.max(100, ...indicesValidos) * 1.06,
    ])
    .range([MARGEN.arriba + ALTO_TENDENCIA - MARGEN.arriba - MARGEN.abajo, MARGEN.arriba]);

  const trazo = line<{ x: number; y: number }>()
    .x((punto) => punto.x)
    .y((punto) => punto.y);

  const marcasX = useMemo(() => {
    const maximoEtiquetas = Math.max(3, Math.floor(anchoUtil / (agregacion === 'mes' ? 62 : 78)));
    const paso = Math.max(1, Math.ceil(datos.length / maximoEtiquetas));
    return datos
      .map((fila, indice) => ({ fila, indice }))
      .filter(({ indice }) => indice % paso === 0 || indice === datos.length - 1);
  }, [datos, anchoUtil, agregacion]);

  const conPuntos = agregacion === 'mes' || datos.length <= 31;
  const activoFila = activo !== null ? datos[activo] ?? null : null;
  const activoX = activo !== null ? escalaX(activo) : 0;

  const valorCantidad = (clave: Clave, indice: number): number | null => {
    const fila = datos[indice];
    return fila ? valorDe(fila, clave) : null;
  };

  const puntosDe = (definicion: DefinicionSerie) =>
    datos
      .map((fila, indice) => ({ x: escalaX(indice), valor: valorDe(fila, definicion.clave), fila }))
      .filter((punto) => punto.valor !== null)
      .map((punto) => ({ x: punto.x, y: escalaY(definicion.clave)(punto.valor as number), fila: punto.fila }));

  const puntosIndice = (definicion: DefinicionSerie) =>
    datos
      .map((fila, indice) => ({ fila, x: escalaX(indice) }))
      .filter((punto) => !parciales[punto.fila.periodo] && indiceDe(punto.fila, definicion.clave) !== null)
      .map((punto) => ({
        x: punto.x,
        y: escalaIndice(indiceDe(punto.fila, definicion.clave) as number),
        fila: punto.fila,
      }));

  const indiceEn = (evento: React.SyntheticEvent<SVGSVGElement> & { clientX: number }): number => {
    const caja = evento.currentTarget.getBoundingClientRect();
    const x = evento.clientX - caja.left;
    const crudo = escalaX.invert(x);
    return Math.min(datos.length - 1, Math.max(0, Math.round(crudo)));
  };

  const explorar = (indice: number) => {
    setActivo(indice);
    setFijado(true);
  };

  const aplicar = (indice: number | null) => {
    if (indice === null) return;
    const fila = datos[indice];
    if (!fila) return;
    const [desde, hasta] = diasDelPeriodo(fila.periodo, agregacion);
    onPeriodo(desde, hasta);
  };

  const alPulsarTecla = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (datos.length === 0) return;
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
      evento.preventDefault();
      const paso = evento.key === 'ArrowRight' ? 1 : -1;
      const base = activo === null ? (paso === 1 ? -1 : datos.length) : activo;
      setActivo(Math.min(datos.length - 1, Math.max(0, base + paso)));
      setFijado(true);
      return;
    }
    if (evento.key === 'Enter') {
      evento.preventDefault();
      aplicar(activo);
      return;
    }
    if (evento.key === 'Escape') {
      setActivo(null);
      setFijado(false);
    }
  };

  const agregacionTexto = agregacion === 'dia' ? 'día' : agregacion === 'semana' ? 'semana' : 'mes';
  const alcance = variosAnios ? `${anios[0]}–${anios[anios.length - 1]}` : anios[0] ?? 'sin periodo';
  const sinIndice = SERIES.filter((definicion) => !serieIndexable(definicion.clave));
  const hayParciales = Object.values(parciales).some(Boolean);

  /* El tooltip se coloca a un lado de la guía para no tapar el punto activo. */
  const anchoTooltip = Math.min(ANCHO_TOOLTIP, Math.max(152, anchoDibujo - 56));
  const tooltipALaDerecha = activoX <= MARGEN.izquierda + anchoUtil * 0.55;
  const tooltipIzquierda = Math.min(
    Math.max(8, tooltipALaDerecha ? activoX + 16 : activoX - anchoTooltip - 16),
    Math.max(8, anchoDibujo - anchoTooltip - 8),
  );

  const lecturaActiva = activoFila
    ? `${etiquetaPeriodo(activoFila.periodo, agregacion)}: ${SERIES.map(
        (definicion) => {
          const valor = valorDe(activoFila, definicion.clave);
          return `${definicion.nombre.toLowerCase()} ${valor === null ? 'no disponible' : numero(valor)}`;
        },
      ).join(', ')}.`
    : '';

  const marcasDeIndice = escalaIndice.ticks(4);

  return (
    <section
      className="at-panel at-panel--tiempo"
      aria-labelledby="at-t-linea"
      data-testid="panel-linea"
      data-modo={modo}
      data-agregacion={agregacion}
    >
      <div className="at-panel-head at-tl-cab">
        <div className="at-tl-cab-texto">
          <h3 id="at-t-linea">Evolución de hechos y personas afectadas</h3>
          <p className="at-panel-sub">
            Por {agregacionTexto} · {datos.length} {datos.length === 1 ? 'periodo' : 'periodos'} ·{' '}
            {alcance} · filtros vigentes
          </p>
        </div>
        <div className="at-tl-controles" data-testid="tl-controles">
          <div className="at-segmentado" role="group" aria-label="Agregación temporal">
            {AGREGACIONES.map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                className={`at-seg${agregacion === valor ? ' is-activa' : ''}`}
                aria-pressed={agregacion === valor}
                onClick={() => onAgregacion(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
          <div className="at-segmentado" role="group" aria-label="Presentación de la gráfica">
            {MODOS.map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                className={`at-seg${modo === valor ? ' is-activa' : ''}`}
                aria-pressed={modo === valor}
                onClick={() => setModo(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>
      </div>

      {cargando ? (
        <p className="at-tl-estado" role="status" aria-live="polite">
          Actualizando la serie…
        </p>
      ) : null}

      {error ? (
        <div className="at-tl-aviso" role="alert">
          <p>No se pudo cargar la serie temporal con los filtros vigentes.</p>
          <button type="button" className="at-btn" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      ) : datos.length === 0 ? (
        <p className="at-nota at-tl-vacio" style={{ minHeight: ALTO_MINIMO }}>
          {cargando
            ? 'Calculando la serie temporal…'
            : 'Con los filtros actuales no hay hechos que mostrar en el intervalo seleccionado.'}
        </p>
      ) : (
        <>
          <div
            className="at-tl-lienzo"
            ref={contenedor}
            tabIndex={0}
            role="group"
            aria-label={`Serie temporal por ${agregacionTexto} de hechos registrados, personas lesionadas y personas fallecidas en ${datos.length} periodos. Usa las flechas para recorrer los periodos y Enter para acotar el intervalo elegido.`}
            onKeyDown={alPulsarTecla}
            onBlur={() => {
              setActivo(null);
              setFijado(false);
            }}
            onMouseLeave={() => {
              if (!fijado) setActivo(null);
            }}
          >
            {modo === 'cantidades' ? (
              <div className="at-tl-paneles" data-testid="tl-paneles">
                {SERIES.map((definicion, posicion) => {
                  const escala = escalaY(definicion.clave);
                  const puntos = puntosDe(definicion);
                  const total = totales[definicion.clave];
                  const maximo = maximos[definicion.clave];
                  const marcasY = maximo > 0 ? escala.ticks(3) : [0];
                  const ultimo = posicion === SERIES.length - 1;
                  return (
                    <div className="at-tl-panel" key={definicion.clave} data-serie={definicion.clave}>
                      <div className="at-tl-panel-cab">
                        <h4 className="at-tl-panel-nombre">
                          <span
                            className="at-tl-muestra"
                            style={{ background: definicion.color }}
                            aria-hidden="true"
                          />
                          {definicion.nombre}
                        </h4>
                        <span className="at-tl-panel-total" title="Total del intervalo consultado">
                          {total === null ? 'Sin dato' : numero(total)}
                        </span>
                      </div>
                      <svg
                        width={anchoDibujo}
                        height={ALTO_PANEL}
                        role="img"
                        aria-label={`${definicion.nombre}: ${datos.length} periodos por ${agregacionTexto}, total ${
                          total === null ? 'sin dato' : numero(total)
                        } en el intervalo.`}
                        onMouseMove={(evento) => {
                          if (!fijado) setActivo(indiceEn(evento));
                        }}
                        onPointerDown={(evento) => explorar(indiceEn(evento))}
                      >
                        {marcasY.map((marca) => (
                          <g key={`${definicion.clave}-${marca}`}>
                            <line
                              x1={MARGEN.izquierda}
                              x2={MARGEN.izquierda + anchoUtil}
                              y1={escala(marca)}
                              y2={escala(marca)}
                              stroke={PALETA.guia}
                              strokeWidth={1}
                            />
                            <text
                              x={MARGEN.izquierda - 8}
                              y={escala(marca) + 3}
                              textAnchor="end"
                              fill={PALETA.textSecondary}
                              fontSize={9.5}
                            >
                              {numero(marca)}
                            </text>
                          </g>
                        ))}

                        {puntos.length >= 2 ? (
                          <path
                            d={trazo(puntos) ?? ''}
                            fill="none"
                            stroke={definicion.color}
                            strokeWidth={2.3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null}

                        {conPuntos
                          ? puntos.map((punto) => (
                              <circle
                                key={`${definicion.clave}-${punto.fila.periodo}`}
                                cx={punto.x}
                                cy={punto.y}
                                r={2.2}
                                fill={parciales[punto.fila.periodo] ? PALETA.surface : definicion.color}
                                stroke={definicion.color}
                                strokeWidth={1.4}
                              />
                            ))
                          : null}

                        {activoFila ? (
                          <g pointerEvents="none">
                            <line
                              x1={activoX}
                              x2={activoX}
                              y1={MARGEN.arriba}
                              y2={MARGEN.arriba + altoUtil}
                              stroke={PALETA.guiaFuerte}
                              strokeWidth={1}
                              strokeDasharray="3 3"
                            />
                            {valorCantidad(definicion.clave, activo as number) !== null ? (
                              <circle
                                cx={activoX}
                                cy={escala(valorCantidad(definicion.clave, activo as number) as number)}
                                r={4}
                                fill={definicion.color}
                                stroke={PALETA.surface}
                                strokeWidth={1.5}
                              />
                            ) : null}
                          </g>
                        ) : null}

                        {ultimo
                          ? marcasX.map(({ fila, indice }) => (
                              <text
                                key={`eje-${fila.periodo}`}
                                x={escalaX(indice)}
                                y={ALTO_PANEL - 4}
                                textAnchor={
                                  indice === 0 ? 'start' : indice >= datos.length - 1 ? 'end' : 'middle'
                                }
                                fill={PALETA.textSecondary}
                                fontSize={9.5}
                              >
                                {etiquetaEje(fila.periodo, agregacion, variosAnios)}
                              </text>
                            ))
                          : null}
                      </svg>
                    </div>
                  );
                })}
              </div>
            ) : referencia === null ? (
              <div className="at-tl-aviso at-tl-aviso--info" data-testid="tl-sin-referencia">
                <p>
                  No hay un periodo completo en el intervalo consultado, así que no es posible
                  comparar tendencias: la referencia base 100 debe ser un periodo entero (
                  {datos.length === 1 ? 'el intervalo tiene uno solo' : 'todos están recortados por las fechas'})
                  .
                </p>
              </div>
            ) : (
              <div className="at-tl-tendencia" data-testid="tl-tendencia">
                <ul className="at-tl-leyenda-tendencia" aria-label="Series comparadas">
                  {SERIES.map((definicion) => (
                    <li
                      key={definicion.clave}
                      className={serieIndexable(definicion.clave) ? '' : 'is-inactiva'}
                    >
                      <span
                        className="at-tl-muestra"
                        style={{ background: definicion.color }}
                        aria-hidden="true"
                      />
                      {definicion.nombre}
                      {serieIndexable(definicion.clave) ? null : (
                        <span className="at-tl-leyenda-nota">sin índice</span>
                      )}
                    </li>
                  ))}
                </ul>
                <svg
                  width={anchoDibujo}
                  height={ALTO_TENDENCIA}
                  role="img"
                  aria-label={`Comparación de tendencias en índice base 100 con referencia ${etiquetaPeriodo(
                    referencia.periodo,
                    agregacion,
                  )}, ${datos.length} periodos.`}
                  onMouseMove={(evento) => {
                    if (!fijado) setActivo(indiceEn(evento));
                  }}
                  onPointerDown={(evento) => explorar(indiceEn(evento))}
                >
                  {marcasDeIndice.map((marca) => (
                    <g key={`indice-${marca}`}>
                      <line
                        x1={MARGEN.izquierda}
                        x2={MARGEN.izquierda + anchoUtil}
                        y1={escalaIndice(marca)}
                        y2={escalaIndice(marca)}
                        stroke={PALETA.guia}
                        strokeWidth={1}
                      />
                      <text
                        x={MARGEN.izquierda - 8}
                        y={escalaIndice(marca) + 3}
                        textAnchor="end"
                        fill={PALETA.textSecondary}
                        fontSize={9.5}
                      >
                        {numero(marca)}
                      </text>
                    </g>
                  ))}

                  <line
                    x1={MARGEN.izquierda}
                    x2={MARGEN.izquierda + anchoUtil}
                    y1={escalaIndice(100)}
                    y2={escalaIndice(100)}
                    stroke={PALETA.guiaFuerte}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />

                  {marcasX.map(({ fila, indice }) => (
                    <text
                      key={`eje-indice-${fila.periodo}`}
                      x={escalaX(indice)}
                      y={ALTO_TENDENCIA - 6}
                      textAnchor={indice === 0 ? 'start' : indice >= datos.length - 1 ? 'end' : 'middle'}
                      fill={PALETA.textSecondary}
                      fontSize={9.5}
                    >
                      {etiquetaEje(fila.periodo, agregacion, variosAnios)}
                    </text>
                  ))}

                  {SERIES.filter((definicion) => serieIndexable(definicion.clave)).map((definicion) => {
                    const puntos = puntosIndice(definicion);
                    if (puntos.length === 0) return null;
                    return (
                      <g key={`indice-serie-${definicion.clave}`} data-serie={definicion.clave}>
                        {puntos.length >= 2 ? (
                          <path
                            d={trazo(puntos) ?? ''}
                            fill="none"
                            stroke={definicion.color}
                            strokeWidth={2.3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null}
                        {puntos.length === 1 || datos.length <= 31
                          ? puntos.map((punto) => (
                              <circle
                                key={`indice-punto-${punto.fila.periodo}`}
                                cx={punto.x}
                                cy={punto.y}
                                r={2.2}
                                fill={definicion.color}
                              />
                            ))
                          : null}
                      </g>
                    );
                  })}

                  {activoFila && !parciales[activoFila.periodo] ? (
                    <g pointerEvents="none">
                      <line
                        x1={activoX}
                        x2={activoX}
                        y1={MARGEN.arriba}
                        y2={ALTO_TENDENCIA - MARGEN.abajo}
                        stroke={PALETA.guiaFuerte}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                      {SERIES.map((definicion) => {
                        const indice = indiceDe(activoFila, definicion.clave);
                        if (indice === null) return null;
                        return (
                          <circle
                            key={`indice-activo-${definicion.clave}`}
                            cx={activoX}
                            cy={escalaIndice(indice)}
                            r={4}
                            fill={definicion.color}
                            stroke={PALETA.surface}
                            strokeWidth={1.5}
                          />
                        );
                      })}
                    </g>
                  ) : null}
                </svg>
              </div>
            )}

            {activoFila ? (
              <div
                className="at-tl-tooltip"
                data-testid="tl-tooltip"
                style={{
                  left: tooltipIzquierda,
                  width: anchoTooltip,
                  top: modo === 'tendencias' || anchoDibujo < 480 ? 26 : 4,
                }}
                role="status"
              >
                <p className="at-tl-tooltip-periodo">
                  {etiquetaPeriodo(activoFila.periodo, agregacion)}
                  {parciales[activoFila.periodo] ? (
                    <span className="at-tl-tooltip-parcial">periodo parcial</span>
                  ) : null}
                </p>
                <ul>
                  {SERIES.map((definicion) => {
                    const valor = valorDe(activoFila, definicion.clave);
                    const indice = indiceDe(activoFila, definicion.clave);
                    return (
                      <li key={`tip-${definicion.clave}`}>
                        <span className="at-tl-tooltip-etq">
                          <span
                            className="at-tl-muestra"
                            style={{ background: definicion.color }}
                            aria-hidden="true"
                          />
                          {definicion.nombre}
                        </span>
                        <span className="at-tl-tooltip-valor">
                          {valor === null ? 'No disponible' : numero(valor)}
                        </span>
                        {modo === 'tendencias' ? (
                          <span className="at-tl-tooltip-indice">
                            {parciales[activoFila.periodo]
                              ? 'parcial · sin índice'
                              : indice === null
                                ? 'sin índice'
                                : `índice ${decimal(indice)}`}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className="at-tl-tooltip-accion"
                  onClick={() => aplicar(activo)}
                  data-testid="tl-acotar"
                >
                  Acotar a este periodo
                </button>
              </div>
            ) : null}

            <p className="at-tl-sr" role="status" aria-live="polite">
              {lecturaActiva}
            </p>
          </div>

          <p className="at-linea-pie">
            {modo === 'cantidades' ? (
              <>
                Escalas independientes: compara la evolución dentro de cada métrica. Los totales son
                del intervalo consultado, no del periodo bajo el cursor.
                {hayParciales
                  ? ' Los puntos huecos marcan periodos recortados por las fechas consultadas.'
                  : ''}
                {datos.length === 1 ? ' Con un solo periodo no hay línea: se muestra el punto real.' : ''}
              </>
            ) : (
              <>
                Índice · Base 100 ·{' '}
                {referencia ? etiquetaPeriodo(referencia.periodo, agregacion) : 'sin periodo completo'}
                {sinIndice.length > 0
                  ? ` · sin índice por referencia cero o ausente: ${sinIndice
                      .map((definicion) => definicion.nombre.toLowerCase())
                      .join(', ')}.`
                  : '.'}
                {hayParciales ? ' Los periodos parciales no se indexan.' : ''}
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}

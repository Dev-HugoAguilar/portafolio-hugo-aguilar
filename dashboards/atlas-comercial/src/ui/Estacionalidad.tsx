/**
 * Estacionalidad del contexto: patrón semanal (lunes a domingo) y patrón mensual
 * (enero a diciembre entre años).
 *
 * Decisiones de lectura
 * --------------------
 * - Todo es descriptivo: se describe un patrón observado en el periodo, no un efecto
 *   causal del día de la semana ni del mes. No hay ingresos, solo unidades vendidas.
 * - Semanal: pequeños múltiplos, una tarjeta por grupo, con **una sola escala común**
 *   (nunca dos series sobre el mismo eje). El eje Y se rotula solo en la primera
 *   columna de cada fila para no repetir marcas.
 * - El selector interno conmuta «Promedio diario» (promedio sobre fechas con
 *   observación) y «Unidades totales»; barras, eje, etiquetas y detalle usan la misma
 *   definición. Como la escala común de la API está expresada en promedios, al pasar a
 *   totales se recalcula sobre los totales visibles y se declara en la cabecera.
 * - Mensual: cuadrícula de celdas con una rampa de un solo tono del azul Atlas, con
 *   dominio calculado sobre los valores visibles de la métrica activa. Un mes parcial
 *   se marca con borde discontinuo, trama diagonal y esquina; un mes sin dato se dibuja
 *   rayado con «sin dato», nunca como cero.
 * - Teclado: la cuadrícula mensual expone cada celda con `tabIndex={0}` y flechas
 *   (arriba/abajo cambia de año, izquierda/derecha de mes); el detalle se anuncia en un
 *   bloque `role="status"`/`aria-live`. Ninguna interacción consulta la red.
 */

import { scaleLinear } from 'd3-scale';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  etiquetaCategoria,
  etiquetaEstadoCorto,
  etiquetaTienda,
} from '../etiquetas';
import type { CSSProperties, KeyboardEvent as EventoTeclado } from 'react';

import type {
  AnioEstacional,
  DimensionEstacionalidad,
  EstacionalidadRespuesta,
  GrupoSemanal,
  MesEstacional,
  PuntoSemanal,
} from '../api';
import { Segmentado } from './Segmentado';
import './estacionalidad.css';

const numero = (valor: number) => Math.round(valor).toLocaleString('es-MX');
const numero1 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Cifra corta para celdas y ejes: 318 101 → «318 k». */
const compacto = (valor: number) =>
  Math.abs(valor) >= 10_000 ? `${numero(valor / 1000)} k` : numero(valor);

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/* Métricas de cada panel: son las que publica la API en `semanal.metricas` y
   `mensual.metricas`. */
type MetricaSemanalPanel = 'promedio' | 'total';
type MetricaMensualPanel = 'total' | 'promedio_diario';

const ANCHO_MINI = 236;
const ALTO_MINI = 126;
const MARGEN_MINI = { arriba: 10, derecha: 6, abajo: 20 };
const ALTO_TRAZADO = ALTO_MINI - MARGEN_MINI.arriba - MARGEN_MINI.abajo;

const valorSemanal = (punto: PuntoSemanal, metrica: MetricaSemanalPanel): number | null =>
  metrica === 'promedio' ? punto.promedio : punto.unidades;

const valorMensual = (mes: MesEstacional, metrica: MetricaMensualPanel): number | null =>
  metrica === 'total' ? mes.unidades : mes.promedio_diario;

const textoUnidad = (metrica: MetricaSemanalPanel) =>
  metrica === 'promedio'
    ? 'unidades vendidas por día observado (promedio)'
    : 'unidades vendidas (total)';

const nombreUnidadMensual = (metrica: MetricaMensualPanel) =>
  metrica === 'total' ? 'unidades totales del mes' : 'unidades vendidas por día observado (promedio)';

/** Cifra del panel mensual: enteros para totales, un decimal para promedios. */
const cifraMensual = (valor: number, metrica: MetricaMensualPanel) =>
  metrica === 'total' ? numero(valor) : numero1(valor);

/** Texto accesible de una barra del panel semanal. */
function textoBarra(grupo: GrupoSemanal, punto: PuntoSemanal, metrica: MetricaSemanalPanel): string {
  const valor = valorSemanal(punto, metrica);
  const cifra =
    valor === null
      ? 'sin dato'
      : metrica === 'promedio'
        ? `${numero1(valor)} u por día observado`
        : `${numero(valor)} u en total`;
  return `${grupo.etiqueta} · ${punto.etiqueta}: ${cifra} · ${punto.fechas_validas} fechas con observación · ${punto.dias_cero} días con cero ventas`;
}

/** Texto accesible de una celda del panel mensual. */
function textoCelda(
  anio: AnioEstacional,
  mes: MesEstacional,
  metrica: MetricaMensualPanel,
): string {
  const valor = valorMensual(mes, metrica);
  const estado = valor === null ? 'sin dato' : mes.parcial ? 'mes parcial' : 'mes completo';
  const cifra = valor === null ? 'sin dato' : `${cifraMensual(valor, metrica)} ${nombreUnidadMensual(metrica)}`;
  const dias = `${mes.dias_observados} días observados de ${mes.dias_del_mes}`;
  return `${anio.anio} · ${mes.etiqueta}: ${cifra} · ${dias} · ${estado}${
    mes.motivo ? ` · ${mes.motivo}` : ''
  }`;
}

/** Nombre visible de un grupo según la dimensión (código conservado en el título). */
function nombreGrupo(dimension: DimensionEstacionalidad, clave: string): string {
  if (dimension === 'tienda') return etiquetaTienda(clave);
  if (dimension === 'estado') return etiquetaEstadoCorto(clave);
  return etiquetaCategoria(clave);
}

export function Estacionalidad({
  datos,
  cargando,
  error,
  dimension,
  onDimension,
  contexto,
  onReintentar,
}: {
  datos: EstacionalidadRespuesta | null;
  cargando: boolean;
  error: string | null;
  dimension: DimensionEstacionalidad;
  onDimension: (dimension: DimensionEstacionalidad) => void;
  contexto: string;
  onReintentar?: () => void;
}) {
  const [metricaSemanal, setMetricaSemanal] = useState<MetricaSemanalPanel>('promedio');
  const [metricaMensual, setMetricaMensual] = useState<MetricaMensualPanel>('total');
  const [diaActivo, setDiaActivo] = useState<number | null>(null);
  const [celdaActiva, setCeldaActiva] = useState<{ anio: number; mes: number } | null>(null);
  const [columnas, setColumnas] = useState(3);
  const rejilla = useRef<HTMLDivElement | null>(null);
  const malla = useRef<HTMLDivElement | null>(null);

  const grupos = datos?.semanal.grupos ?? [];
  const anios = datos?.mensual.anios ?? [];

  /* Columnas reales de la retícula: el eje Y se rotula solo en la primera de cada fila. */
  useEffect(() => {
    const nodo = rejilla.current;
    if (!nodo) return;
    const medir = () => {
      const plantilla = getComputedStyle(nodo).gridTemplateColumns;
      const cuantas = plantilla.split(' ').filter(Boolean).length || 1;
      setColumnas((previo) => (previo === cuantas ? previo : cuantas));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [grupos.length]);

  /* ---- escala común del panel semanal ---------------------------------- */
  const escalaSemanal = useMemo(() => {
    if (metricaSemanal === 'promedio' && datos?.semanal.escala_comun_max != null) {
      return { valor: datos.semanal.escala_comun_max, deRespuesta: true };
    }
    let maximo = 0;
    for (const grupo of grupos) {
      for (const punto of grupo.puntos) {
        const valor = valorSemanal(punto, metricaSemanal);
        if (valor !== null && valor > maximo) maximo = valor;
      }
    }
    return { valor: maximo > 0 ? maximo : 1, deRespuesta: false };
  }, [datos, grupos, metricaSemanal]);

  /* ---- dominio cromático del panel mensual ----------------------------- */
  const escalaMensual = useMemo(() => {
    let minimo = Number.POSITIVE_INFINITY;
    let maximo = Number.NEGATIVE_INFINITY;
    for (const anio of anios) {
      for (const mes of anio.meses) {
        const valor = valorMensual(mes, metricaMensual);
        if (valor === null) continue;
        if (valor < minimo) minimo = valor;
        if (valor > maximo) maximo = valor;
      }
    }
    return Number.isFinite(minimo) && Number.isFinite(maximo) ? { minimo, maximo } : null;
  }, [anios, metricaMensual]);

  const escalaTono = useMemo(() => {
    if (!escalaMensual) return null;
    return scaleLinear().domain([escalaMensual.minimo, escalaMensual.maximo]).range([0.12, 1]);
  }, [escalaMensual]);

  const tono = (valor: number) => {
    if (!escalaMensual || !escalaTono) return 0.5;
    if (escalaMensual.maximo === escalaMensual.minimo) return 0.6;
    return escalaTono(valor);
  };

  const mesActivo = (() => {
    if (!celdaActiva) return null;
    const anio = anios.find((candidato) => candidato.anio === celdaActiva.anio);
    const mes = anio?.meses.find((candidato) => candidato.mes === celdaActiva.mes);
    return anio && mes ? { anio, mes } : null;
  })();

  const etiquetasMes = anios[0]?.meses.map((mes) => mes.etiqueta) ?? MESES_CORTOS;

  /* ---- teclado ---------------------------------------------------------- */
  const navegarSemana = (evento: EventoTeclado<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    setDiaActivo((previo) => {
      const actual = previo ?? 0;
      if (evento.key === 'Home') return 0;
      if (evento.key === 'End') return 6;
      return Math.max(0, Math.min(6, actual + (evento.key === 'ArrowRight' ? 1 : -1)));
    });
  };

  const navegarMalla = (evento: EventoTeclado<HTMLDivElement>) => {
    const flechas = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!flechas.includes(evento.key) || anios.length === 0) return;
    const origen = (evento.target as HTMLElement | null)?.closest<HTMLElement>('[data-celda]');
    const crudo = origen?.dataset.celda;
    const actual = crudo === undefined || crudo === null ? 0 : Number(crudo);
    const fila = Math.floor(actual / 12);
    const columna = actual % 12;
    let destino = actual;
    if (evento.key === 'ArrowRight') destino = fila * 12 + Math.min(11, columna + 1);
    else if (evento.key === 'ArrowLeft') destino = fila * 12 + Math.max(0, columna - 1);
    else if (evento.key === 'ArrowDown') destino = Math.min(anios.length - 1, fila + 1) * 12 + columna;
    else if (evento.key === 'ArrowUp') destino = Math.max(0, fila - 1) * 12 + columna;
    else if (evento.key === 'Home') destino = fila * 12;
    else destino = fila * 12 + 11;
    evento.preventDefault();
    malla.current?.querySelector<HTMLElement>(`[data-celda="${destino}"]`)?.focus();
  };

  /* ---- estados globales -------------------------------------------------- */
  if (error) {
    return (
      <section className="ac-panel ac-panel--error" role="alert">
        <h3>No se pudo calcular la estacionalidad</h3>
        <p>{error}</p>
        {onReintentar ? (
          <button type="button" className="ac-accion" onClick={onReintentar}>
            Reintentar
          </button>
        ) : null}
      </section>
    );
  }

  if (cargando) {
    return (
      <div className="ac-esqueleto" role="status" aria-busy="true">
        <span>Calculando la estacionalidad…</span>
      </div>
    );
  }

  if (!datos) {
    return (
      <p className="ac-vacio">
        Sin estacionalidad para el contexto actual: no se han recibido datos del periodo.
      </p>
    );
  }

  const { semanal, mensual, periodo } = datos;
  const filasTabla = anios.flatMap((anio) =>
    anio.meses.map((mes) => ({ anio: anio.anio, mes, valor: valorMensual(mes, metricaMensual) })),
  );

  return (
    <div className="ac-bloques">
      {/* ---------------- Panel 1 · patrón semanal ------------------------- */}
      <section className="ac-panel" aria-labelledby="ac-t-estacional-semanal">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-estacional-semanal">Estacionalidad semanal · lunes a domingo</h3>
            <p className="ac-panel-sub">
              {contexto} · periodo {periodo.desde} – {periodo.hasta} ({numero(periodo.dias)} días) ·{' '}
              {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'} · escala común{' '}
              {compacto(escalaSemanal.valor)} u
              {escalaSemanal.deRespuesta ? '' : ' (máximo de los totales visibles)'}
            </p>
          </div>
          <div className="ac-es-controles">
            <Segmentado<DimensionEstacionalidad>
              etiqueta="Dimensión de la estacionalidad"
              valor={dimension}
              onElegir={onDimension}
              testid="selector-dimension-estacionalidad"
              opciones={[
                { valor: 'estado', texto: 'Estado' },
                { valor: 'tienda', texto: 'Tienda' },
                { valor: 'categoria', texto: 'Categoría' },
              ]}
            />
            <Segmentado<MetricaSemanalPanel>
              etiqueta="Métrica de la estacionalidad semanal"
              valor={metricaSemanal}
              onElegir={setMetricaSemanal}
              testid="selector-metrica-semanal"
              opciones={[
                { valor: 'promedio', texto: 'Promedio diario' },
                { valor: 'total', texto: 'Unidades totales' },
              ]}
            />
          </div>
        </header>

        <p className="ac-es-unidad">
          Unidad: <strong>{textoUnidad(metricaSemanal)}</strong>
        </p>

        {grupos.length === 0 ? (
          <p className="ac-vacio">
            Sin grupos para esta dimensión en el contexto actual: no hay días con observación que
            promediar.
          </p>
        ) : (
          <>
            <div
              className="ac-es-multiples"
              ref={rejilla}
              tabIndex={0}
              role="group"
              aria-label="Patrón semanal por grupo; usa las flechas para recorrer los días en todas las tarjetas"
              onKeyDown={navegarSemana}
            >
              {grupos.map((grupo, posicion) => (
                <MiniSemanal
                  key={grupo.clave}
                  grupo={grupo}
                  dimension={dimension}
                  metrica={metricaSemanal}
                  escala={escalaSemanal.valor}
                  mostrarY={posicion % Math.max(1, columnas) === 0}
                  diaActivo={diaActivo}
                  onDia={setDiaActivo}
                />
              ))}
            </div>

            <div className="ac-es-detalle" role="status" aria-live="polite">
              {diaActivo !== null && grupos[0] ? (
                <>
                  <strong>{grupos[0].puntos[diaActivo]?.etiqueta ?? ''}</strong>
                  {grupos.map((grupo) => {
                    const punto = grupo.puntos.find((candidato) => candidato.dia_semana === diaActivo + 1);
                    const valor = punto ? valorSemanal(punto, metricaSemanal) : null;
                    return (
                      <span key={grupo.clave}>
                        <span className="ac-es-detalle-grupo" title={`${nombreGrupo(dimension, grupo.clave)} (${grupo.clave})`}>
                          {nombreGrupo(dimension, grupo.clave)}
                        </span>{' '}
                        {valor === null || !punto ? (
                          <span className="ac-es-detalle-sin">sin dato</span>
                        ) : metricaSemanal === 'promedio' ? (
                          `${numero1(valor)} u`
                        ) : (
                          `${numero(valor)} u`
                        )}
                      </span>
                    );
                  })}
                </>
              ) : (
                <span className="ac-es-detalle-ayuda">
                  Pasa el cursor sobre una tarjeta o usa ← → para leer el mismo día en todos los
                  grupos. La escala es común: las alturas de tarjetas distintas son comparables.
                </span>
              )}
            </div>
          </>
        )}

        <p className="ac-hx-aviso">{semanal.advertencia}</p>
        <p className="ac-nota">
          El promedio divide entre fechas con observación: un día con cero ventas cuenta como
          observado y un día sin dato no. {semanal.regla}
          {escalaSemanal.deRespuesta
            ? ''
            : ' La escala común se recalcula sobre los totales visibles porque la escala publicada corresponde al promedio.'}
        </p>
      </section>

      {/* ---------------- Panel 2 · patrón mensual ------------------------- */}
      <section className="ac-panel" aria-labelledby="ac-t-estacional-mensual">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-estacional-mensual">Estacionalidad mensual · enero a diciembre entre años</h3>
            <p className="ac-panel-sub">
              {contexto} · cobertura {mensual.cobertura.desde} – {mensual.cobertura.hasta} ·{' '}
              {anios.length} {anios.length === 1 ? 'año' : 'años'} × 12 meses ·{' '}
              {nombreUnidadMensual(metricaMensual)}
            </p>
          </div>
          <div className="ac-es-controles">
            <Segmentado<MetricaMensualPanel>
              etiqueta="Métrica de la estacionalidad mensual"
              valor={metricaMensual}
              onElegir={setMetricaMensual}
              testid="selector-metrica-mensual"
              opciones={[
                { valor: 'total', texto: 'Unidades totales' },
                { valor: 'promedio_diario', texto: 'Promedio diario' },
              ]}
            />
          </div>
        </header>

        {anios.length === 0 ? (
          <p className="ac-vacio">Sin años con cobertura para construir la cuadrícula mensual.</p>
        ) : (
          <>
            <div
              className="ac-es-mensual"
              ref={malla}
              role="grid"
              aria-label={`Estacionalidad mensual por año, ${nombreUnidadMensual(metricaMensual)}; usa las flechas para recorrer meses y años`}
              onKeyDown={navegarMalla}
            >
              <div className="ac-es-mensual-cab" aria-hidden="true">
                <span />
                {etiquetasMes.map((etiqueta, indice) => (
                  <span key={`${etiqueta}-${indice}`}>{etiqueta}</span>
                ))}
              </div>
              {anios.map((anio, indiceAnio) => (
                <div className="ac-es-mensual-fila" role="row" key={anio.anio}>
                  <div className="ac-es-mensual-anio" role="rowheader">
                    {anio.anio}
                  </div>
                  {anio.meses.map((mes, indiceMes) => {
                    const valor = valorMensual(mes, metricaMensual);
                    const sinDato = valor === null;
                    const estilo = sinDato
                      ? undefined
                      : ({ ['--ac-es-tono' as string]: String(tono(valor)) } as CSSProperties);
                    const indice = indiceAnio * 12 + indiceMes;
                    const activa = celdaActiva?.anio === anio.anio && celdaActiva.mes === mes.mes;
                    const clases = [
                      'ac-es-celda',
                      mes.parcial && !sinDato ? 'is-parcial' : '',
                      sinDato ? 'is-sin-dato' : '',
                      activa ? 'is-activa' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <div
                        key={mes.mes}
                        role="gridcell"
                        tabIndex={0}
                        data-celda={indice}
                        className={clases}
                        style={estilo}
                        title={textoCelda(anio, mes, metricaMensual)}
                        aria-label={textoCelda(anio, mes, metricaMensual)}
                        onFocus={() => setCeldaActiva({ anio: anio.anio, mes: mes.mes })}
                        onMouseEnter={() => setCeldaActiva({ anio: anio.anio, mes: mes.mes })}
                        onClick={() => setCeldaActiva({ anio: anio.anio, mes: mes.mes })}
                      >
                        {sinDato ? null : <span className="ac-es-celda-fill" aria-hidden="true" />}
                        <span className="ac-es-celda-txt">
                          {sinDato ? 'sin dato' : compacto(valor)}
                        </span>
                        {mes.parcial && !sinDato ? (
                          <span className="ac-es-celda-marca" aria-hidden="true" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="ac-es-leyenda">
              <span className="ac-es-leyenda-caja">
                Escala de color
                {escalaMensual ? (
                  <>
                    <span>{compacto(escalaMensual.minimo)}</span>
                    <Rampa tono={tono} min={escalaMensual.minimo} max={escalaMensual.maximo} />
                    <span>{compacto(escalaMensual.maximo)}</span>
                  </>
                ) : (
                  <span>sin valores</span>
                )}
              </span>
              <span className="ac-es-leyenda-caja">
                <span className="ac-es-muestra" aria-hidden="true" /> mes incompleto (parcial)
              </span>
              <span className="ac-es-leyenda-caja">
                <span className="ac-es-muestra ac-es-muestra--sin-dato" aria-hidden="true" /> sin dato
              </span>
            </div>

            <div className="ac-es-detalle" role="status" aria-live="polite">
              {mesActivo ? (
                <>
                  <strong>
                    {mesActivo.anio.anio} · {mesActivo.mes.etiqueta}
                  </strong>
                  <span>
                    {valorMensual(mesActivo.mes, metricaMensual) === null
                      ? 'sin dato'
                      : `${cifraMensual(valorMensual(mesActivo.mes, metricaMensual) as number, metricaMensual)} ${nombreUnidadMensual(metricaMensual)}`}
                  </span>
                  <span className="ac-es-detalle-grupo">
                    {mesActivo.mes.dias_observados} días observados de {mesActivo.mes.dias_del_mes}
                    {mesActivo.mes.dias_en_intervalo !== mesActivo.mes.dias_del_mes
                      ? ` · ${mesActivo.mes.dias_en_intervalo} en el periodo`
                      : ''}
                    {mesActivo.mes.dias_con_cobertura !== mesActivo.mes.dias_en_intervalo
                      ? ` · ${mesActivo.mes.dias_con_cobertura} con cobertura`
                      : ''}
                  </span>
                  <span className="ac-es-detalle-grupo">
                    {valorMensual(mesActivo.mes, metricaMensual) === null
                      ? 'sin dato'
                      : mesActivo.mes.parcial
                        ? 'parcial'
                        : 'completo'}
                  </span>
                  {mesActivo.mes.dias_cero !== null ? (
                    <span className="ac-es-detalle-grupo">
                      {numero(mesActivo.mes.dias_cero)} días con cero ventas
                    </span>
                  ) : null}
                  {mesActivo.mes.motivo ? (
                    <span className="ac-es-detalle-grupo">{mesActivo.mes.motivo}</span>
                  ) : null}
                </>
              ) : (
                <span className="ac-es-detalle-ayuda">
                  Pasa el cursor sobre una celda o usa las flechas (← → meses, ↑ ↓ años) para leer el
                  valor, los días observados de los que tiene el mes y el motivo cuando está incompleto.
                </span>
              )}
            </div>

            <details className="ac-es-tabla">
              <summary>Ver la tabla de cifras exactas</summary>
              <div className="ac-es-tabla-marco">
                <table className="ac-tabla">
                  <caption>
                    {nombreUnidadMensual(metricaMensual)} · cobertura {mensual.cobertura.desde} –{' '}
                    {mensual.cobertura.hasta}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Año</th>
                      <th scope="col">Mes</th>
                      <th scope="col">Valor</th>
                      <th scope="col">Días observados / del mes</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasTabla.map((fila) => (
                      <tr
                        key={`${fila.anio}-${fila.mes.mes}`}
                        className={fila.mes.parcial || fila.valor === null ? 'is-parcial' : undefined}
                      >
                        <th scope="row">{fila.anio}</th>
                        <td>{fila.mes.etiqueta}</td>
                        <td>{fila.valor === null ? 'sin dato' : cifraMensual(fila.valor, metricaMensual)}</td>
                        <td>
                          {fila.mes.dias_observados} / {fila.mes.dias_del_mes}
                          {fila.mes.dias_observados !== fila.mes.dias_del_mes ? (
                            <span className="ac-es-dias-nota">
                              {' '}
                              ({fila.mes.dias_en_intervalo} en el periodo,{' '}
                              {fila.mes.dias_con_cobertura} con cobertura)
                            </span>
                          ) : null}
                        </td>
                        <td>
                          {fila.valor === null
                            ? 'sin dato'
                            : fila.mes.parcial
                              ? 'parcial'
                              : 'completo'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}

        <p className="ac-nota">{mensual.nota}</p>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Tarjeta de un grupo · barras de lunes a domingo con escala común            */
/* --------------------------------------------------------------------------- */

function MiniSemanal({
  grupo,
  dimension,
  metrica,
  escala,
  mostrarY,
  diaActivo,
  onDia,
}: {
  grupo: GrupoSemanal;
  dimension: DimensionEstacionalidad;
  metrica: MetricaSemanalPanel;
  escala: number;
  mostrarY: boolean;
  diaActivo: number | null;
  onDia: (dia: number | null) => void;
}) {
  const izquierda = mostrarY ? 38 : 6;
  const anchoTrazado = ANCHO_MINI - izquierda - MARGEN_MINI.derecha;
  const banda = anchoTrazado / 7;
  const anchoBarra = Math.max(5, banda * 0.62);
  const escalaY = scaleLinear().domain([0, escala > 0 ? escala : 1]).range([ALTO_TRAZADO, 0]);
  const marcas = escalaY.ticks(2).filter((valor) => Number.isFinite(valor));

  return (
    <figure className="ac-es-mini">
      <figcaption className="ac-es-mini-cab">
        <span className="ac-es-mini-nombre" title={`${nombreGrupo(dimension, grupo.clave)} (${grupo.clave})`}>
          {nombreGrupo(dimension, grupo.clave)}
        </span>
        <span title="Unidades del periodo">{numero(grupo.total)}</span>
      </figcaption>
      <p className="ac-es-mini-pie">
        {grupo.tiendas && grupo.tiendas.length > 0
          ? `${grupo.tiendas.length} ${grupo.tiendas.length === 1 ? 'tienda' : 'tiendas'} · `
          : ''}
        {numero(grupo.fechas_validas)} fechas con observación
      </p>
      <svg
        viewBox={`0 0 ${ANCHO_MINI} ${ALTO_MINI}`}
        role="group"
        aria-label={`${nombreGrupo(dimension, grupo.clave)} (${grupo.clave}): patrón semanal de lunes a domingo; escala común de 0 a ${compacto(escala)} unidades`}
        onPointerLeave={() => onDia(null)}
      >
        <g transform={`translate(${izquierda} ${MARGEN_MINI.arriba})`}>
          {marcas.map((valor) => (
            <g key={`y-${valor}`}>
              <line
                x1={0}
                x2={anchoTrazado}
                y1={escalaY(valor)}
                y2={escalaY(valor)}
                className="ac-eje-linea"
              />
              {mostrarY ? (
                <text x={-6} y={escalaY(valor) + 3} textAnchor="end" className="ac-eje-texto">
                  {compacto(valor)}
                </text>
              ) : null}
            </g>
          ))}
          <line
            x1={0}
            x2={anchoTrazado}
            y1={ALTO_TRAZADO}
            y2={ALTO_TRAZADO}
            className="ac-eje-base"
          />

          {grupo.puntos.map((punto, indice) => {
            const valor = valorSemanal(punto, metrica);
            const x = indice * banda + (banda - anchoBarra) / 2;
            const alto = valor === null ? 0 : Math.max(1, ALTO_TRAZADO - escalaY(valor));
            const y = ALTO_TRAZADO - alto;
            const activo = diaActivo !== null && diaActivo === punto.dia_semana - 1;
            const texto = textoBarra(grupo, punto, metrica);
            return (
              <g key={punto.dia_semana}>
                {activo ? (
                  <rect
                    x={indice * banda}
                    y={0}
                    width={banda}
                    height={ALTO_TRAZADO}
                    className="ac-es-banda-activa"
                  />
                ) : null}
                {valor === null ? (
                  <rect
                    x={x}
                    y={ALTO_TRAZADO - 3}
                    width={anchoBarra}
                    height={3}
                    rx={1}
                    className="ac-es-barra--sin-dato"
                    aria-label={texto}
                    onPointerEnter={() => onDia(punto.dia_semana - 1)}
                  >
                    <title>{texto}</title>
                  </rect>
                ) : (
                  <rect
                    x={x}
                    y={y}
                    width={anchoBarra}
                    height={alto}
                    rx={1.5}
                    className={`ac-es-barra${activo ? ' ac-es-barra--activa' : ''}${
                      valor === 0 ? ' ac-es-barra--cero' : ''
                    }`}
                    aria-label={texto}
                    onPointerEnter={() => onDia(punto.dia_semana - 1)}
                  >
                    <title>{texto}</title>
                  </rect>
                )}
                <text
                  x={indice * banda + banda / 2}
                  y={ALTO_TRAZADO + 11}
                  textAnchor="middle"
                  className="ac-eje-texto"
                >
                  {punto.etiqueta.slice(0, 3)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </figure>
  );
}

/* --------------------------------------------------------------------------- */
/* Leyenda de la rampa de color (mismo tono y misma opacidad que las celdas)   */
/* --------------------------------------------------------------------------- */

function Rampa({
  tono,
  min,
  max,
}: {
  tono: (valor: number) => number;
  min: number;
  max: number;
}) {
  const pasos = 22;
  const anchoPaso = 132 / pasos;
  const muestras = Array.from({ length: pasos }, (_, indice) => {
    const valor = max === min ? min : min + ((max - min) * indice) / (pasos - 1);
    return { indice, opacidad: tono(valor) };
  });
  return (
    <svg
      className="ac-es-escala"
      viewBox="0 0 132 9"
      role="img"
      aria-label={`Rampa de color de ${compacto(min)} a ${compacto(max)} unidades`}
    >
      {muestras.map((muestra) => (
        <rect
          key={muestra.indice}
          x={muestra.indice * anchoPaso}
          y={0}
          width={anchoPaso + 0.4}
          height={9}
          fill="var(--at-primary)"
          fillOpacity={muestra.opacidad}
        />
      ))}
    </svg>
  );
}

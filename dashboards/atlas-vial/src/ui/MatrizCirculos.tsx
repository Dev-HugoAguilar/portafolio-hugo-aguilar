/**
 * Bloque A de «Tiempo y entorno vial»: matriz de círculos proporcionales.
 *
 * Filas = tipo de hecho, columnas = clasificación de la vialidad. Cada celda es
 * un cruce **real** calculado en el servidor sobre el mismo documento de hecho
 * (`tipo_evento_norm` × `vialidad_norm`), nunca el producto de dos marginales.
 *
 * Escala: una sola `scaleSqrt` para toda la matriz de la métrica activa, con el
 * área proporcional al valor, así que cuadruplicar el valor duplica el radio. No
 * se normaliza por fila ni columna, no hay radio mínimo y no se recorta nada.
 *
 * Cero y dato desconocido se distinguen: el cero no dibuja círculo (y con
 * «Mostrar cifras» escribe 0); la combinación con un valor no publicado se marca
 * con un guion y se explica como «No disponible».
 *
 * Exploración: el cursor y el foco resaltan fila y columna y abren un tooltip
 * opaco con las tres cifras; activar una celda fija el detalle y solo el botón
 * «Aplicar combinación» toca los filtros globales, sustituyendo tipo de hecho y
 * clasificación vial a la vez.
 */

import { scaleSqrt } from 'd3-scale';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { CruceTiposEntorno } from '../api/tipos';
import { numero } from '../dominio';
import { RELLENO_MAPA, type Metrica as MetricaCompartida } from '../paleta';

type Metrica = 'hechos' | 'lesionadas' | 'fallecidas';

const LOCAL: Record<MetricaCompartida, Metrica> = {
  hechos: 'hechos',
  personas_lesionadas: 'lesionadas',
  personas_fallecidas: 'fallecidas',
};

const METRICAS: { clave: MetricaCompartida; etiqueta: string; color: string; unidad: string }[] = [
  { clave: 'hechos', etiqueta: 'Hechos', color: RELLENO_MAPA.hechos, unidad: 'hechos' },
  {
    clave: 'personas_lesionadas',
    etiqueta: 'Lesionadas',
    color: RELLENO_MAPA.personas_lesionadas,
    unidad: 'personas lesionadas',
  },
  {
    clave: 'personas_fallecidas',
    etiqueta: 'Fallecidas',
    color: RELLENO_MAPA.personas_fallecidas,
    unidad: 'personas fallecidas',
  },
];

const DIAMETRO_MAXIMO = 54;
const ALTO_FILA = 64;

export interface PropsMatriz {
  datos: CruceTiposEntorno | null;
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
  /** Tipo de hecho y clasificación vial vigentes en los filtros globales. */
  seleccion: { tiposEvento: string[]; vialidades: string[] };
  onAplicar: (tipoEvento: string, vialidad: string) => void;
  /** Métrica compartida con la matriz horaria (una sola fuente de estado). */
  metrica: MetricaCompartida;
  onMetrica: (metrica: MetricaCompartida) => void;
}

export function MatrizCirculos({
  datos,
  cargando,
  error,
  onReintentar,
  seleccion,
  onAplicar,
  metrica: metricaCompartida,
  onMetrica,
}: PropsMatriz) {
  const metrica: Metrica = LOCAL[metricaCompartida];
  const [mostrarCifras, setMostrarCifras] = useState(false);
  const [activa, setActiva] = useState<{ fila: number; columna: number } | null>(null);
  const [fijada, setFijada] = useState<{ fila: number; columna: number } | null>(null);
  const [enfocada, setEnfocada] = useState<{ fila: number; columna: number } | null>(null);
  const contenedor = useRef<HTMLDivElement | null>(null);

  const definicion = METRICAS.find((opcion) => opcion.clave === metricaCompartida) as (typeof METRICAS)[number];
  const filas = datos?.filas ?? [];
  const columnas = datos?.columnas ?? [];

  const valores = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const celda of datos?.celdas ?? []) {
      mapa.set(`${celda.fila}-${celda.columna}`, celda[metrica]);
    }
    return mapa;
  }, [datos, metrica]);

  const maximo = useMemo(() => Math.max(1, ...valores.values()), [valores]);
  const escala = scaleSqrt().domain([0, maximo]).range([0, DIAMETRO_MAXIMO / 2]);
  const referencias = useMemo(() => {
    const candidatos = [1, Math.round(maximo / 4), Math.round(maximo / 2), maximo].filter(
      (valor, indice, lista) => valor > 0 && lista.indexOf(valor) === indice,
    );
    return candidatos.slice(-3);
  }, [maximo]);

  /* Una combinación que no aparece en el cruce es un **cero verificado** (ambas
     categorías están publicadas y no hay hechos con esa pareja). El dato no
     disponible se informa en la columna y fila «Sin dato», no como celda. */
  const celdaDe = (fila: number, columna: number) => {
    const valor = valores.get(`${fila}-${columna}`);
    return valor === undefined ? { estado: 'cero' as const, valor: 0 } : { estado: 'valor' as const, valor };
  };

  /* Hechos con una de las dos dimensiones no publicada. */
  const filasSinColumna = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const fila of datos?.sin_columna ?? []) {
      mapa.set(fila.fila, (mapa.get(fila.fila) ?? 0) + fila[metrica]);
    }
    return mapa;
  }, [datos, metrica]);
  const columnasSinFila = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const fila of datos?.sin_fila ?? []) {
      mapa.set(fila.columna, (mapa.get(fila.columna) ?? 0) + fila[metrica]);
    }
    return mapa;
  }, [datos, metrica]);
  const haySinColumna = (datos?.sin_columna.length ?? 0) > 0 || (datos?.sin_ambos[metrica] ?? 0) > 0;
  const haySinFila = (datos?.sin_fila.length ?? 0) > 0 || (datos?.sin_ambos[metrica] ?? 0) > 0;

  const detalleFila = (fila: number) => datos?.celdas.filter((celda) => celda.fila === fila) ?? [];

  /* Escape cierra el detalle fijado. */
  useEffect(() => {
    if (!fijada) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setFijada(null);
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [fijada]);

  /* Si los filtros cambian, la selección fijada puede quedar obsoleta. */
  useEffect(() => {
    setFijada(null);
    setActiva(null);
  }, [datos]);

  const totalFila = (fila: number) =>
    detalleFila(fila).reduce((suma, celda) => suma + celda[metrica], 0);
  const totalColumna = (columna: number) =>
    (datos?.celdas ?? [])
      .filter((celda) => celda.columna === columna)
      .reduce((suma, celda) => suma + celda[metrica], 0);

  const teclas = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (!filas.length || !columnas.length) return;
    const base = enfocada ?? { fila: 0, columna: 0 };
    const mover = (fila: number, columna: number) => {
      evento.preventDefault();
      const destino = {
        fila: Math.min(filas.length - 1, Math.max(0, fila)),
        columna: Math.min(columnas.length - 1, Math.max(0, columna)),
      };
      setEnfocada(destino);
      setActiva(destino);
    };
    if (evento.key === 'ArrowRight') mover(base.fila, base.columna + 1);
    else if (evento.key === 'ArrowLeft') mover(base.fila, base.columna - 1);
    else if (evento.key === 'ArrowDown') mover(base.fila + 1, base.columna);
    else if (evento.key === 'ArrowUp') mover(base.fila - 1, base.columna);
    else if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      setFijada(base);
      setActiva(base);
    } else if (evento.key === 'Escape') {
      setFijada(null);
      setActiva(null);
    }
  };

  const anchoEtiquetas = 148;
  const anchoColumna = Math.max(68, 96);
  const anchoUtil = anchoEtiquetas + columnas.length * anchoColumna;

  /* La cifra cabe dentro del círculo solo si el texto, con margen, mide menos que
     el diámetro: se calcula por longitud del texto, no con un umbral fijo. */
  const cifraDentro = (valor: number) => {
    const texto = numero(valor);
    const anchoTexto = [...texto].length * 6.4;
    return escala(valor) * 2 >= anchoTexto + 8;
  };

  const detalle = fijada ?? null;

  return (
    <section
      className="at-panel at-panel--matriz-circulos"
      aria-labelledby="at-t-entorno"
      data-testid="panel-entorno"
    >
      <div className="at-panel-head at-tl-cab">
        <div className="at-tl-cab-texto">
          <h3 id="at-t-entorno">Tipos de hechos y entorno vial</h3>
          <p className="at-panel-sub">Explora las combinaciones registradas</p>
        </div>
        <div className="at-tl-controles">
          <div className="at-segmentado" role="group" aria-label="Métrica de la matriz">
            {METRICAS.map((opcion) => (
              <button
                key={opcion.clave}
                type="button"
                className={`at-seg${metricaCompartida === opcion.clave ? ' is-activa' : ''}`}
                aria-pressed={metricaCompartida === opcion.clave}
                onClick={() => onMetrica(opcion.clave)}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`at-col-global${mostrarCifras ? ' is-activa' : ''}`}
            aria-pressed={mostrarCifras}
            onClick={() => setMostrarCifras((valor) => !valor)}
            data-testid="matriz-cifras"
          >
            Mostrar cifras
          </button>
        </div>
      </div>

      {error ? (
        <div className="at-tl-aviso" role="alert">
          <p>No se pudo calcular el cruce de tipos de hecho y entorno vial.</p>
          <button type="button" className="at-btn" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      ) : !datos || filas.length === 0 || columnas.length === 0 ? (
        <p className="at-nota at-tl-vacio" style={{ minHeight: 200 }}>
          {cargando ? 'Calculando combinaciones…' : 'Sin combinaciones con los filtros actuales.'}
        </p>
      ) : (
        <div className="at-mx-caja">
          <div className="at-mx-scroll" ref={contenedor}>
            <div
              className="at-mx-grid"
              role="grid"
              tabIndex={0}
              aria-label={`Matriz de ${definicion.unidad} por tipo de hecho y clasificación de la vialidad. Usa las flechas para recorrer las celdas y Enter para ver el detalle.`}
              onKeyDown={teclas}
              style={{ width: anchoUtil }}
              data-testid="matriz-entorno"
            >
              <div className="at-mx-cabecera" role="row">
                <span className="at-mx-esquina" role="columnheader">
                  Tipo de hecho
                </span>
                {columnas.map((columna, indice) => (
                  <span
                    key={columna}
                    role="columnheader"
                    className={`at-mx-cab-col${
                      activa?.columna === indice || fijada?.columna === indice ? ' is-resaltada' : ''
                    }`}
                    title={columna}
                  >
                    {columna}
                  </span>
                ))}
                {haySinColumna ? (
                  <span className="at-mx-cab-col at-mx-cab-sindato" role="columnheader">
                    Sin clasificación vial
                  </span>
                ) : null}
              </div>

              {filas.map((fila, indiceFila) => (
                <div
                  className={`at-mx-fila${
                    activa?.fila === indiceFila || fijada?.fila === indiceFila ? ' is-resaltada' : ''
                  }`}
                  role="row"
                  key={fila}
                  style={{ minHeight: ALTO_FILA }}
                >
                  <span className="at-mx-cab-fila" role="rowheader" title={fila}>
                    {fila}
                  </span>
                  {columnas.map((columna, indiceColumna) => {
                    const { estado, valor } = celdaDe(indiceFila, indiceColumna);
                    const radio = estado === 'valor' ? escala(valor as number) : 0;
                    const esActiva =
                      activa?.fila === indiceFila && activa?.columna === indiceColumna;
                    const esFijada =
                      fijada?.fila === indiceFila && fijada?.columna === indiceColumna;
                    return (
                      <div
                        key={columna}
                        role="gridcell"
                        className={`at-mx-celda${esActiva ? ' is-activa' : ''}${
                          esFijada ? ' is-fijada' : ''
                        }`}
                        tabIndex={-1}
                        aria-label={
                          estado === 'valor'
                            ? `${fila} · ${columna}: ${numero(valor as number)} ${definicion.unidad}`
                            : `${fila} · ${columna}: sin hechos registrados`
                        }
                        data-celda={`${indiceFila}-${indiceColumna}`}
                      >
                        {estado === 'valor' ? (
                          <svg width={DIAMETRO_MAXIMO + 6} height={DIAMETRO_MAXIMO + 6} aria-hidden="true">
                            <circle
                              cx={(DIAMETRO_MAXIMO + 6) / 2}
                              cy={(DIAMETRO_MAXIMO + 6) / 2}
                              r={radio}
                              fill={definicion.color}
                              opacity={0.9}
                              className="at-mx-punto"
                            />
                            <circle
                              cx={(DIAMETRO_MAXIMO + 6) / 2}
                              cy={(DIAMETRO_MAXIMO + 6) / 2}
                              r={radio + 4}
                              className="at-mx-halo"
                              stroke={definicion.color}
                            />
                          </svg>
                        ) : null}
                        {mostrarCifras && estado === 'valor' ? (<span className={cifraDentro(valor as number) ? 'at-mx-cifra at-mx-cifra--dentro' : 'at-mx-cifra at-mx-cifra--fuera'}>{numero(valor as number)}</span>) : null}
                        {mostrarCifras && estado === 'cero' ? (
                          <span className="at-mx-cifra">0</span>
                        ) : null}
                        {/* Área de interacción independiente del círculo. */}
                        <button
                          type="button"
                          className="at-mx-blanco"
                          tabIndex={-1}
                          onClick={() => {
                            setFijada({ fila: indiceFila, columna: indiceColumna });
                            setActiva({ fila: indiceFila, columna: indiceColumna });
                          }}
                          onMouseEnter={() =>
                            setActiva({ fila: indiceFila, columna: indiceColumna })
                          }
                          onFocus={() => setActiva({ fila: indiceFila, columna: indiceColumna })}
                        >
                          <span className="at-sr">
                            Ver detalle de {fila} en {columna}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                  {haySinColumna ? (
                    <div
                      role="gridcell"
                      className="at-mx-celda at-mx-celda--sindato"
                      aria-label={`${fila}: ${filasSinColumna.has(indiceFila) ? `${numero(filasSinColumna.get(indiceFila) as number)} ${definicion.unidad} sin clasificación vial` : 'sin hechos sin clasificación vial'}`}
                    >
                      <span className="at-mx-dato">
                        {filasSinColumna.has(indiceFila)
                          ? numero(filasSinColumna.get(indiceFila) as number)
                          : mostrarCifras
                            ? '0'
                            : '—'}
                      </span>
                    </div>
                  ) : null}
                </div>
              ))}

              {haySinFila ? (
                <div className="at-mx-fila at-mx-fila--sindato" role="row">
                  <span className="at-mx-cab-fila" role="rowheader">
                    Sin tipo de hecho
                  </span>
                  {columnas.map((columna, indice) => (
                    <div
                      key={`sin-fila-${columna}`}
                      role="gridcell"
                      className="at-mx-celda--sindato"
                      aria-label={`${columna}: ${columnasSinFila.has(indice) ? `${numero(columnasSinFila.get(indice) as number)} ${definicion.unidad} sin tipo de hecho` : 'sin hechos sin tipo de hecho'}`}
                    >
                      <span className="at-mx-dato">
                        {columnasSinFila.has(indice) ? numero(columnasSinFila.get(indice) as number) : '—'}
                      </span>
                    </div>
                  ))}
                  {haySinColumna ? (
                    <span className="at-mx-dato">
                      {datos.sin_ambos[metrica] > 0 ? numero(datos.sin_ambos[metrica]) : '—'}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="at-mx-pie" role="row">
                <span className="at-mx-cab-fila at-mx-total-etq">Total por columna</span>
                {columnas.map((columna, indice) => (
                  <span className="at-mx-total" key={columna}>
                    {numero(totalColumna(indice))}
                  </span>
                ))}
                {haySinColumna ? (
                  <span className="at-mx-total">
                    {numero((datos?.sin_columna ?? []).reduce((suma, fila) => suma + fila[metrica], 0))}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="at-mx-leyenda">
            <span className="at-mx-leyenda-etq">Tamaño del círculo</span>
            {referencias.map((valor) => (
              <span key={valor} className="at-mx-referencia">
                <svg width={DIAMETRO_MAXIMO + 6} height={DIAMETRO_MAXIMO + 6} aria-hidden="true">
                  <circle
                    cx={(DIAMETRO_MAXIMO + 6) / 2}
                    cy={(DIAMETRO_MAXIMO + 6) / 2}
                    r={escala(valor) * 0.45}
                    fill={definicion.color}
                    opacity={0.85}
                  />
                </svg>
                <span>{numero(valor)}</span>
              </span>
            ))}
            <span className="at-mx-leyenda-nota">
              Referencias reducidas · área proporcional
            </span>
          </div>

          {detalle ? (
            <div className="at-mx-detalle" role="dialog" aria-label="Detalle de la combinación">
              <div className="at-mx-detalle-texto">
                <p className="at-mx-detalle-titulo">
                  {filas[detalle.fila]} · {columnas[detalle.columna]}
                </p>
                <p className="at-mx-detalle-cifras">
                  <span>
                    <strong>{numero(celdaDe(detalle.fila, detalle.columna).valor ?? 0)}</strong>{' '}
                    hechos
                  </span>
                  <span>
                    <strong>
                      {numero(
                        datos.celdas.find(
                          (celda) =>
                            celda.fila === detalle.fila && celda.columna === detalle.columna,
                        )?.lesionadas ?? 0,
                      )}
                    </strong>{' '}
                    personas lesionadas
                  </span>
                  <span>
                    <strong>
                      {numero(
                        datos.celdas.find(
                          (celda) =>
                            celda.fila === detalle.fila && celda.columna === detalle.columna,
                        )?.fallecidas ?? 0,
                      )}
                    </strong>{' '}
                    personas fallecidas
                  </span>
                </p>
                {seleccion.tiposEvento.length > 1 || seleccion.vialidades.length > 1 ? (
                  <p className="at-mx-detalle-aviso">
                    Aplicar sustituirá los {seleccion.tiposEvento.length} tipos de hecho y las{' '}
                    {seleccion.vialidades.length} clasificaciones viales seleccionadas por esta
                    combinación.
                  </p>
                ) : (
                  <p className="at-mx-detalle-aviso">
                    Aplicar fija estas dos categorías en los filtros globales.
                  </p>
                )}
              </div>
              <div className="at-mx-detalle-acciones">
                <button
                  type="button"
                  className="at-btn at-btn--ghost"
                  onClick={() => setFijada(null)}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="at-btn at-btn--primario"
                  data-testid="aplicar-combinacion"
                  onClick={() => {
                    onAplicar(filas[detalle.fila] as string, columnas[detalle.columna] as string);
                    setFijada(null);
                  }}
                >
                  Aplicar combinación
                </button>
              </div>
            </div>
          ) : null}

          <p className="at-col-detalle">
            {numero(datos.cobertura.con_ambas)} de {numero(datos.cobertura.hechos)} hechos tienen
            tipo de hecho y clasificación vial publicados
            {datos.cobertura.sin_columna > 0
              ? ` · ${numero(datos.cobertura.sin_columna)} sin clasificación vial`
              : ''}
            {datos.cobertura.sin_fila > 0
              ? ` · ${numero(datos.cobertura.sin_fila)} sin tipo de hecho`
              : ''}
            {datos.cobertura.sin_ambos > 0
              ? ` · ${numero(datos.cobertura.sin_ambos)} sin ninguno de los dos`
              : ''}
            . Las celdas vacías son combinaciones sin hechos y el guion es un dato no publicado.
          </p>

          <details className="at-metodo">
            <summary>Cómo se calculan estas combinaciones</summary>
            <p>
              Cada celda cuenta hechos del conjunto filtrado que comparten tipo de hecho y
              clasificación vial en el mismo registro, en una sola consulta de agregación: no hay
              uniones ni se multiplican porcentajes de las distribuciones por separado. El orden de
              filas y columnas se calcula con hechos, así que no cambia al cambiar de métrica. Las
              tres clasificaciones de acceso controlado (anular, radial y viaducto) se mantienen
              separadas porque son categorías distintas del catálogo.
            </p>
          </details>

          <p className="at-sr">
            {filas
              .map(
                (fila, indice) =>
                  `${fila}: ${columnas
                    .map((columna, indiceColumna) => {
                      const valor = celdaDe(indice, indiceColumna);
                      return `${columna} ${valor.valor === null ? 'no disponible' : numero(valor.valor)}`;
                    })
                    .join(', ')}. Total ${numero(totalFila(indice))} ${definicion.unidad}.`,
              )
              .join(' ')}
          </p>
        </div>
      )}
      {cargando && datos ? <p className="at-nota">Actualizando las combinaciones…</p> : null}
    </section>
  );
}









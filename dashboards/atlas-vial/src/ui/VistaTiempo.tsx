/**
 * Pestaña «Tiempo y entorno vial».
 *
 * Orden: «Día de la semana y hora» → «Tipos de hechos y entorno vial» →
 * «Intersecciones y semáforo registrado». La serie temporal ya no se monta aquí;
 * sigue disponible en Territorio con `LineaTiempo`.
 *
 * La métrica de análisis (hechos, personas lesionadas, personas fallecidas) es
 * **una sola fuente de estado** en esta vista y la comparten la matriz horaria y
 * la matriz de círculos: cambiar una actualiza la otra. Es una medida, no un
 * filtro: no toca el conjunto consultado ni los KPI.
 */

import { useMemo, useRef, useState } from 'react';

import type { Tiempo } from '../api/tipos';
import { colorMapa, ETIQUETA_METRICA, rampaMapa, type Metrica } from '../paleta';
import { numero, type Filtros } from '../dominio';
import { BarrasDivergentes } from './BarrasDivergentes';
import { MatrizCirculos } from './MatrizCirculos';

export interface PropsVistaTiempo {
  datos: Tiempo | null;
  filtros: Filtros;
  /** Fija tipo de hecho y clasificación vial a la vez (una sola acción). */
  onCombinacion: (tipoEvento: string, vialidad: string) => void;
  error: boolean;
  onReintentar: () => void;
  cargando: boolean;
}

const diasLargos = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const METRICAS: { clave: Metrica; etiqueta: string }[] = [
  { clave: 'hechos', etiqueta: 'Hechos' },
  { clave: 'personas_lesionadas', etiqueta: 'Lesionadas' },
  { clave: 'personas_fallecidas', etiqueta: 'Fallecidas' },
];

const claveDeMetrica = (metrica: Metrica): 'hechos' | 'lesionadas' | 'fallecidas' =>
  metrica === 'personas_lesionadas'
    ? 'lesionadas'
    : metrica === 'personas_fallecidas'
      ? 'fallecidas'
      : 'hechos';

export function VistaTiempo({
  datos,
  filtros,
  onCombinacion,
  error,
  onReintentar,
  cargando,
}: PropsVistaTiempo) {
  const [metrica, setMetrica] = useState<Metrica>('hechos');
  const [activa, setActiva] = useState<{ dia: number; hora: number } | null>(null);
  const [fijada, setFijada] = useState<{ dia: number; hora: number } | null>(null);
  const contenedorMatriz = useRef<HTMLDivElement | null>(null);

  const clave = claveDeMetrica(metrica);
  const celdaPor = (dia: number, hora: number) =>
    datos?.matriz.celdas.find((celda) => celda.dia_semana === dia && celda.hora === hora) ?? null;

  const maximoMatriz = useMemo(
    () => Math.max(1, ...(datos?.matriz.celdas ?? []).map((celda) => celda[clave])),
    [datos, clave],
  );

  /* Leyenda con la misma escala y dominio que las celdas. */
  const escalaMatriz = useMemo(
    () =>
      [
        0,
        Math.round(maximoMatriz * 0.25),
        Math.round(maximoMatriz * 0.5),
        Math.round(maximoMatriz * 0.75),
        maximoMatriz,
      ]
        .filter((valor, indice, lista) => lista.indexOf(valor) === indice)
        .sort((a, b) => a - b),
    [maximoMatriz],
  );

  const celdaActiva = activa ? celdaPor(activa.dia, activa.hora) : null;

  return (
    <div className="at-vista at-vista--tiempo">
      <section
        className="at-panel at-panel--matriz"
        aria-labelledby="at-t-matriz"
        data-testid="panel-matriz"
      >
        <div className="at-panel-head at-tl-cab">
          <div className="at-tl-cab-texto">
            <h3 id="at-t-matriz">Día de la semana y hora</h3>
            <p className="at-panel-sub">
              {ETIQUETA_METRICA[metrica]} por día y hora · el color indica la cantidad
            </p>
          </div>
          <div className="at-tl-controles">
            <div className="at-segmentado" role="group" aria-label="Métrica de la matriz horaria">
              {METRICAS.map((opcion) => (
                <button
                  key={opcion.clave}
                  type="button"
                  className={`at-seg${metrica === opcion.clave ? ' is-activa' : ''}`}
                  aria-pressed={metrica === opcion.clave}
                  onClick={() => setMetrica(opcion.clave)}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="at-matriz-scroll" ref={contenedorMatriz}>
          <div
            className="at-matriz"
            role="table"
            aria-label={`${ETIQUETA_METRICA[metrica]} por día de la semana y hora`}
          >
            <div className="at-matriz-fila at-matriz-cabecera" role="row">
              <span role="columnheader" className="at-matriz-esquina" />
              {(datos?.matriz.horas ?? []).map((hora) => (
                <span key={hora} role="columnheader" className="at-matriz-hora">
                  {String(hora).padStart(2, '0')}
                </span>
              ))}
            </div>
            {(datos?.matriz.dias ?? []).map((dia, indice) => (
              <div key={dia} className="at-matriz-fila" role="row">
                <span role="rowheader" className="at-matriz-dia">
                  {diasLargos[indice] ?? dia}
                </span>
                {(datos?.matriz.horas ?? []).map((hora) => {
                  const celda = celdaPor(indice, hora);
                  const valor = celda ? celda[clave] : 0;
                  const esActiva = activa?.dia === indice && activa?.hora === hora;
                  const esFijada = fijada?.dia === indice && fijada?.hora === hora;
                  return (
                    <button
                      key={`${dia}-${hora}`}
                      type="button"
                      role="cell"
                      className={`at-matriz-celda${esActiva ? ' is-activa' : ''}${
                        esFijada ? ' is-fijada' : ''
                      }`}
                      style={{
                        background:
                          valor === 0 ? '#f4f6fa' : colorMapa(metrica, valor, maximoMatriz),
                      }}
                      aria-label={`${diasLargos[indice]} de ${String(hora).padStart(2, '0')}:00 a ${String(
                        hora + 1,
                      ).padStart(2, '0')}:00 · ${numero(valor)} ${ETIQUETA_METRICA[metrica].toLowerCase()}`}
                      onMouseEnter={() => setActiva({ dia: indice, hora })}
                      onMouseLeave={() => setActiva(null)}
                      onFocus={() => setActiva({ dia: indice, hora })}
                      onBlur={() => setActiva(null)}
                      onClick={() => setFijada(esFijada ? null : { dia: indice, hora })}
                    >
                      <span className="at-sr">{numero(valor)}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {activa && celdaActiva ? (
            <div className="at-matriz-tip" role="status" data-testid="matriz-horaria-tip">
              <p className="at-matriz-tip-dia">{diasLargos[activa.dia]}</p>
              <p className="at-matriz-tip-franja">
                {String(activa.hora).padStart(2, '0')}:00 –{' '}
                {String(activa.hora + 1).padStart(2, '0')}:00
              </p>
              <p className="at-matriz-tip-valor">
                <strong>{numero(celdaActiva[clave])}</strong>{' '}
                {ETIQUETA_METRICA[metrica].toLowerCase()}
              </p>
              <p className="at-matriz-tip-otras">
                {numero(celdaActiva.hechos)} hechos · {numero(celdaActiva.lesionadas)} lesionadas ·{' '}
                {numero(celdaActiva.fallecidas)} fallecidas
              </p>
            </div>
          ) : null}
        </div>

        <div className="at-matriz-leyenda-num" aria-label="Escala de color de la matriz">
          <span className="at-matriz-leyenda-unidad">
            {ETIQUETA_METRICA[metrica]} por franja horaria
          </span>
          <span className="at-matriz-leyenda-escala">
            {escalaMatriz.map((paso) => (
              <span key={paso} className="at-matriz-leyenda-paso">
                <span
                  className="at-matriz-leyenda-cubo"
                  style={{
                    background: paso === 0 ? '#f4f6fa' : colorMapa(metrica, paso, maximoMatriz),
                  }}
                  aria-hidden="true"
                />
                {numero(paso)}
              </span>
            ))}
          </span>
          <span className="at-matriz-leyenda-rampa" aria-hidden="true">
            {rampaMapa(metrica).map((color) => (
              <span key={color} style={{ background: color }} />
            ))}
          </span>
        </div>
        <p className="at-col-detalle">
          El gris es un cero verificado dentro del periodo publicado; la matriz excluye los hechos sin
          día u hora utilizables y esa cifra está en la cobertura del resumen.
        </p>
      </section>

      <MatrizCirculos
        datos={datos?.cruces.tipos_entorno ?? null}
        cargando={cargando}
        error={error}
        onReintentar={onReintentar}
        metrica={metrica}
        onMetrica={setMetrica}
        seleccion={{ tiposEvento: filtros.tiposEvento, vialidades: filtros.vialidades }}
        onAplicar={onCombinacion}
      />

      <BarrasDivergentes
        datos={datos?.cruces.interseccion_semaforo ?? null}
        cargando={cargando}
        error={error}
        onReintentar={onReintentar}
        metrica={metrica}
        onMetrica={setMetrica}
      />

      {cargando ? <p className="at-nota">Actualizando los análisis de tiempo…</p> : null}

      <p className="at-aviso">
        Ninguna de estas lecturas establece causas. El conjunto registra el hecho, su ubicación y las
        personas involucradas; no documenta velocidad, condiciones del conductor ni estado del semáforo
        en el momento, así que las diferencias entre categorías son descriptivas.
      </p>
    </div>
  );
}


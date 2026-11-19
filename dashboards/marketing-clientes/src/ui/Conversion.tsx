/**
 * Vista de conversión: embudo de cuatro etapas con bandas proporcionales.
 *
 * La unidad es la **sesión**. Cada etapa se dibuja como una banda cuyo grosor es
 * proporcional a las sesiones que la alcanzan; las sesiones que no completan la
 * etapa siguiente salen por el lateral derecho de la banda, con su cifra. No se
 * clasifica esa salida como «abandono definitivo»: el conjunto no dice qué hizo
 * después cada sesión.
 *
 * Al seleccionar una transición se muestra cuántas sesiones avanzaron, cuántas no
 * completaron el paso siguiente, la conversión entre etapas y la distribución del
 * tiempo entre ambas (calculada con las marcas de tiempo reales de la sesión).
 *
 * Ayuda contextual: las sesiones que completan el embudo no tienen que coincidir
 * con las compras totales, porque el embudo exige los cuatro pasos en orden dentro
 * de una misma sesión y de la ventana documentada.
 */

import { scaleLinear } from 'd3-scale';
import { useState } from 'react';

import type { Conversion as Datos, PasoEmbudo, Transicion } from '../api/tipos';
import { MapaFriccion } from './MapaFriccion';
import { COLOR_PASO, PALETA } from '../paleta';
import { numero, porcentaje } from '../dominio';

export interface PropsConversion {
  datos: Datos | null;
  vacio: boolean;
  cargando: boolean;
}

const ALTO_BANDA = 74;
const SEPARACION = 16;
const MARGEN = { izquierda: 128, derecha: 190, arriba: 12, abajo: 16 };

export function Conversion({ datos, vacio, cargando }: PropsConversion) {
  const pasos = datos?.pasos ?? [];
  const inicial = pasos[0]?.sesiones ?? 0;
  const [transicion, setTransicion] = useState<number | null>(null);
  const [comparar, setComparar] = useState<'canal' | 'dispositivo'>('canal');

  const anchoBanda = 460;
  const alto = MARGEN.arriba + pasos.length * (ALTO_BANDA + SEPARACION) + MARGEN.abajo;
  const escalaGrosor = scaleLinear().domain([0, Math.max(1, inicial)]).range([0, ALTO_BANDA]);

  const activa = transicion !== null ? pasos[transicion] : null;
  const siguiente = transicion !== null ? pasos[transicion + 1] : null;
  const detalleTransicion =
    transicion !== null
      ? (datos?.transiciones ?? []).find((fila) => fila.paso === activa?.paso) ?? null
      : null;
  const indiceTransicion = transicion ?? 0;
  const tablaComparacion =
    comparar === 'canal'
      ? (datos?.por_canal ?? []).map((fila) => ({
          valor: fila.canal,
          pasos: fila.pasos,
        }))
      : (datos?.por_dispositivo ?? []).map((fila) => ({ valor: fila.valor, pasos: fila.pasos }));

  return (
    <div className="mk-vista" data-testid="vista-conversion">
      <section className="mk-panel mk-panel--embudo" aria-labelledby="mk-t-embudo" data-testid="panel-embudo">
        <div className="mk-panel-head">
          <div>
            <h3 id="mk-t-embudo">Embudo de conversión</h3>
            <p className="mk-panel-sub">
              Unidad: <strong>sesiones</strong> · ventana: {datos?.ventana_horas ?? 24} horas desde el
              primer paso · los pasos deben ocurrir en orden · base: {numero(inicial)} sesiones
            </p>
          </div>
        </div>

        {pasos.length === 0 ? (
          <p className="mk-vacio">
            {vacio
              ? 'Sin datos publicados: el embudo aparecerá cuando exista una versión cargada.'
              : 'No hay sesiones que cumplan el criterio con los filtros actuales.'}
          </p>
        ) : (
          <>
            <div className="mk-embudo-svg">
              <svg
                width={MARGEN.izquierda + anchoBanda + MARGEN.derecha}
                height={alto}
                role="img"
                aria-label={`Embudo de ${pasos.length} etapas sobre ${numero(inicial)} sesiones.`}
              >
                {pasos.map((paso, indice) => {
                  const y = MARGEN.arriba + indice * (ALTO_BANDA + SEPARACION);
                  const grosor = Math.max(6, escalaGrosor(paso.sesiones));
                  const yBanda = y + (ALTO_BANDA - grosor) / 2;
                  const siguientePaso = pasos[indice + 1];
                  const salieron = siguientePaso ? paso.sesiones - siguientePaso.sesiones : 0;
                  const avance = siguientePaso ? siguientePaso.sesiones / Math.max(1, paso.sesiones) : null;
                  const color = COLOR_PASO[indice] ?? PALETA.primary;
                  const elegida = transicion === indice;
                  return (
                    <g key={paso.paso}>
                      <text x={MARGEN.izquierda - 12} y={y + 18} textAnchor="end" fill={PALETA.text} fontSize={11.5}>
                        {paso.paso}. {paso.etiqueta}
                      </text>
                      <text x={MARGEN.izquierda - 12} y={y + 34} textAnchor="end" fill={PALETA.textSecondary} fontSize={10}>
                        {numero(paso.sesiones)} sesiones
                      </text>

                      <rect
                        x={MARGEN.izquierda}
                        y={yBanda}
                        width={anchoBanda * (paso.sesiones / Math.max(1, inicial))}
                        height={grosor}
                        rx={4}
                        fill={color}
                        fillOpacity={elegida ? 0.95 : 0.82}
                      />
                      <text
                        x={MARGEN.izquierda + 10}
                        y={y + ALTO_BANDA / 2 + 4}
                        fill="#FFFFFF"
                        fontSize={11}
                        fontWeight={600}
                      >
                        {numero(paso.sesiones)} · {porcentaje(paso.porcentaje_del_inicio)}
                      </text>

                      {siguientePaso ? (
                        <g
                          role="button"
                          tabIndex={0}
                          className="mk-embudo-transicion"
                          aria-label={`Transición ${paso.paso} a ${siguientePaso.paso}: ${numero(
                            salieron,
                          )} sesiones no completaron el paso siguiente. Activar para ver el detalle.`}
                          onClick={() => setTransicion(elegida ? null : indice)}
                          onKeyDown={(evento) => {
                            if (evento.key === 'Enter' || evento.key === ' ') {
                              evento.preventDefault();
                              setTransicion(elegida ? null : indice);
                            }
                          }}
                        >
                          <rect
                            x={MARGEN.izquierda + anchoBanda - 4}
                            y={y + 2}
                            width={MARGEN.derecha + 10}
                            height={ALTO_BANDA - 4}
                            fill="transparent"
                            pointerEvents="all"
                          />
                          <line
                            x1={MARGEN.izquierda + anchoBanda * (paso.sesiones / Math.max(1, inicial)) + 4}
                            y1={y + ALTO_BANDA / 2}
                            x2={MARGEN.izquierda + anchoBanda + 74}
                            y2={y + ALTO_BANDA / 2}
                            stroke={PALETA.guiaFuerte}
                            strokeDasharray="3 3"
                          />
                          <text
                            x={MARGEN.izquierda + anchoBanda + 84}
                            y={y + ALTO_BANDA / 2 - 4}
                            fill={PALETA.textSecondary}
                            fontSize={10}
                          >
                            {numero(salieron)} salen
                          </text>
                          <text
                            x={MARGEN.izquierda + anchoBanda + 84}
                            y={y + ALTO_BANDA / 2 + 11}
                            fill={PALETA.textSecondary}
                            fontSize={10}
                          >
                            avance {porcentaje(avance !== null ? avance * 100 : null)}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>

            {datos?.advertencia ? <p className="mk-aviso">{datos.advertencia}</p> : null}
            {datos?.criterio ? <p className="mk-nota">{datos.criterio}</p> : null}
            {datos?.nota_compras ? (
              <p className="mk-nota mk-nota--contexto">
                {datos.nota_compras} Compras totales del rango: {numero(datos.compras_totales ?? null)}.
              </p>
            ) : null}
          </>
        )}
      </section>

      {activa && siguiente ? (
        <section className="mk-panel" aria-labelledby="mk-t-transicion" data-testid="panel-transicion">
          <div className="mk-panel-head">
            <div>
              <h3 id="mk-t-transicion">
                Transición {activa.paso} → {siguiente.paso}
              </h3>
              <p className="mk-panel-sub">
                {activa.etiqueta} → {siguiente.etiqueta} · base: {numero(activa.sesiones)} sesiones
                con la primera etapa
              </p>
            </div>
            <button type="button" className="mk-btn mk-btn--ghost" onClick={() => setTransicion(null)}>
              Cerrar detalle
            </button>
          </div>

          <dl className="mk-cifras-fila">
            <div>
              <dt>Avanzaron</dt>
              <dd>{numero(siguiente.sesiones)}</dd>
            </div>
            <div>
              <dt>No completaron</dt>
              <dd>{numero(Math.max(0, activa.sesiones - siguiente.sesiones))}</dd>
            </div>
            <div>
              <dt>Conversión entre etapas</dt>
              <dd>{porcentaje(activa.porcentaje_del_paso_anterior ?? siguientesPorcentaje(activa, siguiente))}</dd>
            </div>
            <div>
              <dt>Sesiones con el evento siguiente</dt>
              <dd>{numero(siguiente.sesiones_evento ?? 0)}</dd>
            </div>
          </dl>

          <h4 className="mk-subtitulo">Tiempo entre ambas etapas</h4>
          {detalleTransicion && detalleTransicion.base > 0 ? (
            <>
              <Tiempos transicion={detalleTransicion} />
              <p className="mk-nota mk-tenue">
                Tramos calculados fuera de Atlas con las marcas de tiempo reales de cada sesión y
                los mismos filtros del tablero (fecha, canal, dispositivo y país).
              </p>
            </>
          ) : (
            <p className="mk-vacio">
              No hay sesiones con las dos etapas en orden para calcular tiempos con estos filtros.
            </p>
          )}

          <h4 className="mk-subtitulo">Comparación por {comparar}</h4>
          <div className="mk-segmentado" role="group" aria-label="Dimensión de comparación">
            <button
              type="button"
              className={`mk-seg${comparar === 'canal' ? ' is-activa' : ''}`}
              onClick={() => setComparar('canal')}
              aria-pressed={comparar === 'canal'}
            >
              Canal
            </button>
            <button
              type="button"
              className={`mk-seg${comparar === 'dispositivo' ? ' is-activa' : ''}`}
              onClick={() => setComparar('dispositivo')}
              aria-pressed={comparar === 'dispositivo'}
            >
              Dispositivo
            </button>
          </div>
          <div className="mk-tabla-caja">
            <table className="mk-tabla">
              <caption className="mk-sr">Sesiones por etapa y conversión entre etapas.</caption>
              <thead>
                <tr>
                  <th scope="col">{comparar === 'canal' ? 'Canal' : 'Dispositivo'}</th>
                  {pasos.map((paso) => (
                    <th key={paso.paso} scope="col" className="mk-num">
                      {paso.paso}. {paso.etiqueta}
                    </th>
                  ))}
                  <th scope="col" className="mk-num">Avance de la transición</th>
                </tr>
              </thead>
              <tbody>
                {tablaComparacion.map((fila) => {
                  const inicio = fila.pasos[0] ?? 0;
                  const destino = fila.pasos[indiceTransicion + 1] ?? 0;
                  const origen = fila.pasos[indiceTransicion] ?? 0;
                  return (
                    <tr key={fila.valor}>
                      <td>{fila.valor}</td>
                      {pasos.map((paso, indice) => (
                        <td key={paso.paso} className="mk-num">
                          {numero(fila.pasos[indice] ?? 0)}
                        </td>
                      ))}
                      <td className="mk-num">
                        {origen ? porcentaje((100 * destino) / origen) : '—'}
                        <span className="mk-tenue"> ({numero(inicio)} al inicio)</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <MapaFriccion datos={datos?.friccion ?? null} vacio={vacio} cargando={cargando} />

      {cargando ? <p className="mk-nota">Actualizando el embudo…</p> : null}
    </div>
  );
}

function siguientesPorcentaje(actual: PasoEmbudo, siguiente: PasoEmbudo): number | null {
  if (!actual.sesiones) return null;
  return (100 * siguiente.sesiones) / actual.sesiones;
}

function Tiempos({ transicion }: { transicion: Transicion }) {
  const maximo = Math.max(1, ...transicion.tramos.map((tramo) => tramo.sesiones));
  return (
    <ul className="mk-lista-barras mk-lista-barras--ancha">
      {transicion.tramos.map((tramo) => (
        <li key={tramo.tramo}>
          <span>{tramo.tramo}</span>
          <div className="mk-barra-fina" aria-hidden="true">
            <div style={{ width: `${Math.round((100 * tramo.sesiones) / maximo)}%` }} />
          </div>
          <strong>{numero(tramo.sesiones)}</strong>
        </li>
      ))}
    </ul>
  );
}



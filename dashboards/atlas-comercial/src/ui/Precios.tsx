/**
 * «Precios»: distribución del precio medio por artículo y cambios entre semanas.
 *
 * Qué muestra
 * -----------
 * - **Panel A · Distribución**: cajas de bigotes por categoría con mínimo, q1,
 *   mediana, q3 y máximo rotulados con su cifra exacta; cuartiles globales y media
 *   del conjunto; la regla de ponderación completa del servidor; y la tabla exacta
 *   de los 3.049 valores por artículo, paginada en el cliente (25 por página) y
 *   filtrable por categoría. Un artículo **sin precio** se rotula «sin precio en el
 *   periodo», nunca como cero: el precio no existe para ese periodo, no vale 0.
 * - **Panel B · Cambios**: totales de transiciones entre semanas consecutivas, KPI
 *   con la unidad y el periodo, desglose por categoría en barras apiladas y la
 *   tabla de las series con más transiciones. Se dice la tolerancia aplicada y que
 *   una disminución de precio no es una campaña: los datos no traen el motivo.
 *
 * Decisiones de dibujo
 * --------------------
 * - Un solo SVG por bloque, `viewBox` fijo y ancho fluido (la escala del panel ya
 *   hace que el SVG ocupe el 100 %): el trazo no se deforma y no hay desbordes a
 *   390 px.
 * - Las cinco cifras de cada caja se rotulan en dos carriles con detección de
 *   colisión: con la cola derecha de precios (máx. 30 USD frente a una mediana de
 *   3 USD) las etiquetas de q1, mediana y q3 quedan a pocos píxeles, así que la
 *   segunda se sube de carril en lugar de encimarse.
 * - El desglose por categoría se dibuja **dos veces** con escalas propias y ambas
 *   rotuladas: (1) todas las transiciones, donde «sin cambio» domina (98 %), y
 *   (2) solo las transiciones con cambio, que es la lectura útil de aumentos frente
 *   a disminuciones. Mezclar ambas en una sola escala dejaría los cambios en un
 *   píxel, que se vería como «no hay cambios».
 * - Nada de verde/rojo: aumentos en azul Atlas, disminuciones en gris grafito y sin
 *   cambio en gris claro, con leyenda explícita.
 */

import { scaleLinear } from 'd3-scale';
import { useId, useMemo, useState } from 'react';
import type { JSX } from 'react';

import type {
  CajaPrecio,
  CambiosPreciosRespuesta,
  DistribucionPreciosRespuesta,
  SerieCambiosPrecio,
  ValorPrecio,
} from '../api';
import './precios.css';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const POR_PAGINA = 25;

const numero = (valor: number) => Math.round(valor).toLocaleString('es-MX');
const numero2 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Precio con dos a cuatro decimales: exacto sin arrastrar ruido binario. */
const precio = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const pct = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? 'no calculable' : `${numero2(valor)} %`;

const fechaCorta = (iso: string) => {
  const fecha = new Date(`${iso}T00:00:00`);
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

/** `precio_medio` puede llegar nulo en la API: se normaliza sin convertirlo en cero. */
function precioDe(valor: ValorPrecio): number | null {
  const bruto = valor.precio_medio as number | null | undefined;
  if (bruto === null || bruto === undefined || !Number.isFinite(bruto)) return null;
  return bruto;
}

/* --------------------------------------------------------------------------- */
/* Componente principal                                                         */
/* --------------------------------------------------------------------------- */

export function Precios({
  distribucion,
  cambios,
  cargando,
  error,
  contexto,
  tienda,
  onReintentar,
}: {
  distribucion: DistribucionPreciosRespuesta | null;
  cambios: CambiosPreciosRespuesta | null;
  cargando: boolean;
  error: string | null;
  contexto: string;
  tienda: string | null;
  onReintentar?: () => void;
}): JSX.Element {
  const sinDatos = distribucion === null && cambios === null;

  return (
    <div className="ac-bloques ac-pr" aria-busy={cargando}>
      {error ? (
        <p className="ac-pr-error" role="alert">
          <span>{error}</span>
          {onReintentar ? (
            <button type="button" className="ac-accion" onClick={onReintentar}>
              Reintentar
            </button>
          ) : null}
        </p>
      ) : null}

      {cargando && sinDatos ? (
        <p className="ac-esqueleto" role="status" aria-busy="true">
          Calculando precios y transiciones del periodo…
        </p>
      ) : null}

      {!cargando && sinDatos && !error ? (
        <p className="ac-vacio">
          Sin datos de precios para el contexto actual. Ajusta el periodo o la tienda.
        </p>
      ) : null}

      {!sinDatos || cargando ? (
        <>
          <PanelDistribucion
            datos={distribucion}
            contexto={contexto}
            tienda={tienda}
            cargando={cargando}
          />
          <PanelCambios datos={cambios} contexto={contexto} tienda={tienda} cargando={cargando} />
        </>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Panel A · Distribución del precio medio por artículo                        */
/* --------------------------------------------------------------------------- */

function PanelDistribucion({
  datos,
  contexto,
  tienda,
  cargando,
}: {
  datos: DistribucionPreciosRespuesta | null;
  contexto: string;
  tienda: string | null;
  cargando: boolean;
}) {
  const [categoria, setCategoria] = useState<string>('todas');
  const [pagina, setPagina] = useState<number>(1);

  const valores = useMemo(() => datos?.valores ?? [], [datos]);

  const categorias = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const valor of valores) {
      const clave = valor.cat_id ?? 'sin categoría';
      conteo.set(clave, (conteo.get(clave) ?? 0) + 1);
    }
    return [...conteo.entries()]
      .map(([clave, cuantos]) => ({ clave, cuantos }))
      .sort((a, b) => a.clave.localeCompare(b.clave, 'es'));
  }, [valores]);

  const filtrados = useMemo(() => {
    if (categoria === 'todas') return valores;
    return valores.filter((valor) => (valor.cat_id ?? 'sin categoría') === categoria);
  }, [valores, categoria]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaActual = Math.min(Math.max(1, pagina), totalPaginas);
  const desde = (paginaActual - 1) * POR_PAGINA;
  const visibles = filtrados.slice(desde, desde + POR_PAGINA);
  const sinPrecioEnVista = filtrados.filter((valor) => precioDe(valor) === null).length;

  const unidad = datos?.unidad ?? 'USD por unidad';
  const motivoSinCajas = datos?.motivo ?? null;
  const motivoSinCuartiles =
    motivoSinCajas ??
    'Los cuartiles no son calculables con los valores del periodo (hace falta al menos un artículo con precio).';

  return (
    <section className="ac-panel ac-pr-panel" aria-labelledby="ac-t-precios-dist">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-precios-dist">Distribución del precio medio por artículo</h3>
          <p className="ac-panel-sub">
            {contexto}
            {tienda ? ` · tienda ${tienda}` : ''}
            {datos
              ? ` · ${fechaCorta(datos.periodo.desde)} – ${fechaCorta(datos.periodo.hasta)} (${numero(
                  datos.periodo.dias,
                )} días) · ${unidad}`
              : ''}
          </p>
        </div>
        {cargando ? <span className="ac-pr-cargando">Actualizando…</span> : null}
      </header>

      {!datos ? (
        <p className="ac-vacio">
          {cargando ? 'Cargando la distribución de precios…' : 'Sin distribución de precios disponible.'}
        </p>
      ) : (
        <>
          <dl className="ac-metricas ac-pr-metricas">
            <div>
              <dt>Combinaciones incluidas</dt>
              <dd>{numero(datos.combinaciones_incluidas)}</dd>
            </div>
            <div>
              <dt>Artículos con precio</dt>
              <dd>{numero(datos.articulos)}</dd>
            </div>
            <div>
              <dt>Cobertura completa</dt>
              <dd>{numero(datos.cobertura.completa)}</dd>
              <p className="ac-kpi-pie">
                con precio todos los {numero(datos.cobertura.dias_del_intervalo)} días del intervalo
              </p>
            </div>
            <div>
              <dt>Cobertura parcial</dt>
              <dd>{numero(datos.cobertura.parcial)}</dd>
              <p className="ac-kpi-pie">mediana de {numero(datos.cobertura.dias_cubiertos_mediana)} días con precio</p>
            </div>
            <div>
              <dt>Sin precio en el intervalo</dt>
              <dd>{numero(datos.cobertura.sin_precio)}</dd>
              <p className="ac-kpi-pie">ausencia declarada, nunca cero</p>
            </div>
            <div>
              <dt>Días con precio</dt>
              <dd>
                {datos.cobertura.pct_dias_cubiertos === null
                  ? 'no calculable'
                  : `${numero2(datos.cobertura.pct_dias_cubiertos)} %`}
              </dd>
              <p className="ac-kpi-pie">
                {numero(datos.cobertura.dias_cubiertos_total)} de{' '}
                {numero(datos.cobertura.dias_posibles_total)} días-combinación
              </p>
            </div>
            <div>
              <dt>Media del conjunto</dt>
              <dd>{datos.media === null ? 'no calculable' : `${precio(datos.media)} USD`}</dd>
            </div>
          </dl>

          <p className="ac-nota ac-pr-regla">
            <strong>Regla de ponderación:</strong> {datos.regla_ponderacion}
          </p>
          <p className="ac-nota ac-pr-regla">
            {datos.cobertura.nota}
            {datos.sin_precio?.nota ? ` ${datos.sin_precio.nota}` : ''}
            {datos.sin_precio?.con_precio_fuera_del_intervalo ? (
              <>
                {' '}
                De las {numero(datos.sin_precio.combinaciones ?? 0)} combinaciones sin precio en el
                intervalo, {numero(datos.sin_precio.con_precio_fuera_del_intervalo)} tienen precio en
                otras semanas del archivo
                {datos.sin_precio.ultima_semana_con_precio_fuera
                  ? ` (la última, semana ${datos.sin_precio.ultima_semana_con_precio_fuera})`
                  : ''}{' '}
                y {numero(datos.sin_precio.sin_precio_en_toda_la_tienda ?? 0)} no tienen ningún
                precio en la tienda.
              </>
            ) : null}
          </p>

          {datos.cuartiles === null ? (
            <p className="ac-aviso-inline" data-testid="precios-sin-cuartiles">
              Sin cajas ni cuartiles: {motivoSinCuartiles}
            </p>
          ) : (
            <>
              <p className="ac-pr-etq-bloque">Cuartiles globales ({unidad})</p>
              <dl className="ac-pr-globales">
                <div>
                  <dt>mín</dt>
                  <dd>{precio(datos.cuartiles.min)}</dd>
                </div>
                <div>
                  <dt>q1</dt>
                  <dd>{precio(datos.cuartiles.q1)}</dd>
                </div>
                <div>
                  <dt>mediana</dt>
                  <dd>{precio(datos.cuartiles.mediana)}</dd>
                </div>
                <div>
                  <dt>q3</dt>
                  <dd>{precio(datos.cuartiles.q3)}</dd>
                </div>
                <div>
                  <dt>máx</dt>
                  <dd>{precio(datos.cuartiles.max)}</dd>
                </div>
              </dl>

              {datos.cajas.length === 0 ? (
                <p className="ac-vacio">Sin cajas por categoría en el periodo.</p>
              ) : (
                <GraficoCajas cajas={datos.cajas} unidad={unidad} />
              )}

              <details className="ac-pr-tabla-cajas">
                <summary>Tabla exacta de las cajas por categoría</summary>
                <div className="ac-pr-marco">
                  <table className="ac-tabla ac-pr-tabla">
                    <caption>
                      Cifras exactas de cada caja · {unidad} · n = artículos con precio en la categoría
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Categoría</th>
                        <th scope="col" className="ac-tabla-num">
                          n
                        </th>
                        <th scope="col" className="ac-tabla-num">
                          mín
                        </th>
                        <th scope="col" className="ac-tabla-num">
                          q1
                        </th>
                        <th scope="col" className="ac-tabla-num">
                          mediana
                        </th>
                        <th scope="col" className="ac-tabla-num">
                          q3
                        </th>
                        <th scope="col" className="ac-tabla-num">
                          máx
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.cajas.map((caja) => (
                        <tr key={caja.categoria}>
                          <th scope="row">
                            {caja.etiqueta} <span className="ac-pr-cat-id">({caja.categoria})</span>
                          </th>
                          <td className="ac-tabla-num">{numero(caja.n)}</td>
                          <td className="ac-tabla-num">{caja.min === null ? '—' : precio(caja.min)}</td>
                          <td className="ac-tabla-num">{caja.q1 === null ? '—' : precio(caja.q1)}</td>
                          <td className="ac-tabla-num">
                            {caja.mediana === null ? '—' : precio(caja.mediana)}
                          </td>
                          <td className="ac-tabla-num">{caja.q3 === null ? '—' : precio(caja.q3)}</td>
                          <td className="ac-tabla-num">{caja.max === null ? '—' : precio(caja.max)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}

          <div className="ac-pr-controles">
            <label className="ac-pr-campo">
              <span>Categoría</span>
              <select
                value={categoria}
                onChange={(evento) => {
                  setCategoria(evento.target.value);
                  setPagina(1);
                }}
              >
                <option value="todas">Todas ({numero(valores.length)})</option>
                {categorias.map((opcion) => (
                  <option key={opcion.clave} value={opcion.clave}>
                    {opcion.clave} ({numero(opcion.cuantos)})
                  </option>
                ))}
              </select>
            </label>
            <div
              className="ac-pr-paginacion"
              role="group"
              aria-label="Paginación de la tabla de precios por artículo"
            >
              <button
                type="button"
                className="ac-accion ac-accion--secundaria"
                onClick={() => setPagina(paginaActual - 1)}
                disabled={paginaActual <= 1}
              >
                Anterior
              </button>
              <span className="ac-pr-pagina" role="status" aria-live="polite">
                Página {numero(paginaActual)} de {numero(totalPaginas)} ·{' '}
                {numero(filtrados.length)} artículos
                {sinPrecioEnVista > 0 ? ` · ${numero(sinPrecioEnVista)} sin precio` : ''}
              </span>
              <button
                type="button"
                className="ac-accion ac-accion--secundaria"
                onClick={() => setPagina(paginaActual + 1)}
                disabled={paginaActual >= totalPaginas}
              >
                Siguiente
              </button>
            </div>
          </div>

          <div className="ac-pr-marco" data-testid="precios-tabla-valores">
            <table className="ac-tabla ac-pr-tabla">
              <caption>
                Precio medio por artículo · {unidad} · {numero(POR_PAGINA)} filas por página · un
                artículo sin precio publicado se rotula «sin precio en el periodo»
              </caption>
              <thead>
                <tr>
                  <th scope="col">Artículo</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Departamento</th>
                  <th scope="col" className="ac-tabla-num">
                    Precio medio
                  </th>
                  <th scope="col" className="ac-tabla-num">
                    Semanas con precio
                  </th>
                  <th scope="col" className="ac-tabla-num">
                    Días cubiertos
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="ac-tabla-vacia">
                      Sin artículos para la categoría elegida.
                    </td>
                  </tr>
                ) : (
                  visibles.map((valor, posicion) => {
                    const valorPrecio = precioDe(valor);
                    return (
                      <tr key={`${valor.item_id}-${desde + posicion}`}>
                        <th scope="row" className="ac-tabla-id">
                          {valor.item_id}
                        </th>
                        <td>{valor.cat_id ?? '—'}</td>
                        <td>{valor.dept_id ?? '—'}</td>
                        <td className="ac-tabla-num">
                          {valorPrecio === null ? (
                            <span className="ac-pr-sin-precio">sin precio en el periodo</span>
                          ) : (
                            precio(valorPrecio)
                          )}
                        </td>
                        <td className="ac-tabla-num">
                          {valorPrecio === null ? '—' : numero(valor.semanas_con_precio)}
                        </td>
                        <td className="ac-tabla-num">
                          {valorPrecio === null ? '—' : numero(valor.dias_cubiertos)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* --------------------------------------------------------------------------- */
/* Cajas de bigotes                                                            */
/* --------------------------------------------------------------------------- */

const ANCHO_CAJA_TRAZO = 720;
const GUTTER_CAJA = 96;
const DERECHO_CAJA = 16;
const FILA_CAJA = 74;

function GraficoCajas({ cajas, unidad }: { cajas: CajaPrecio[]; unidad: string }) {
  const idTitulo = `ac-pr-cajas-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const maximo = Math.max(
    1,
    ...cajas.map((caja) => caja.max ?? 0),
    ...cajas.map((caja) => caja.q3 ?? 0),
  );
  const escala = scaleLinear()
    .domain([0, Math.max(maximo, 1)])
    .nice()
    .range([0, ANCHO_CAJA_TRAZO - GUTTER_CAJA - DERECHO_CAJA]);
  const anchoTrazado = ANCHO_CAJA_TRAZO - GUTTER_CAJA - DERECHO_CAJA;
  const alto = cajas.length * FILA_CAJA + 26;
  const marcas = escala.ticks(4).filter((valor) => Number.isFinite(valor));

  return (
    <figure className="ac-pr-cajas">
      <svg
        viewBox={`0 0 ${ANCHO_CAJA_TRAZO} ${alto}`}
        role="img"
        aria-labelledby={idTitulo}
        preserveAspectRatio="xMinYMin meet"
      >
        <title id={idTitulo}>
          {`Cajas de precio medio por categoría (${unidad}). Cada caja marca mínimo, cuartil 1, mediana, cuartil 3 y máximo con su cifra exacta; la tabla siguiente repite los valores.`}
        </title>
        <g transform={`translate(0 6)`}>
          {cajas.map((caja, posicion) => {
            const cy = posicion * FILA_CAJA + 30;
            const entradas: { valor: number; texto: string }[] = [];
            if (caja.min !== null) entradas.push({ valor: caja.min, texto: `mín ${precio(caja.min)}` });
            if (caja.q1 !== null) entradas.push({ valor: caja.q1, texto: `q1 ${precio(caja.q1)}` });
            if (caja.mediana !== null)
              entradas.push({ valor: caja.mediana, texto: `med ${precio(caja.mediana)}` });
            if (caja.q3 !== null) entradas.push({ valor: caja.q3, texto: `q3 ${precio(caja.q3)}` });
            if (caja.max !== null) entradas.push({ valor: caja.max, texto: `máx ${precio(caja.max)}` });
            const cifras = entradas.map((entrada) => entrada.texto);
            const completo =
              caja.min !== null &&
              caja.q1 !== null &&
              caja.mediana !== null &&
              caja.q3 !== null &&
              caja.max !== null;
            return (
              <g key={caja.categoria} transform={`translate(${GUTTER_CAJA} ${cy})`}>
                <title>
                  {`${caja.etiqueta}: n=${numero(caja.n)} · mín ${
                    caja.min === null ? 'n/d' : precio(caja.min)
                  } · q1 ${caja.q1 === null ? 'n/d' : precio(caja.q1)} · mediana ${
                    caja.mediana === null ? 'n/d' : precio(caja.mediana)
                  } · q3 ${caja.q3 === null ? 'n/d' : precio(caja.q3)} · máx ${
                    caja.max === null ? 'n/d' : precio(caja.max)
                  } ${unidad}`}
                </title>

                {completo ? (
                  <g className="ac-pr-caja">
                    <line
                      x1={escala(caja.min as number)}
                      x2={escala(caja.max as number)}
                      y1={0}
                      y2={0}
                      className="ac-pr-caja-bigote"
                    />
                    <line
                      x1={escala(caja.min as number)}
                      x2={escala(caja.min as number)}
                      y1={-6}
                      y2={6}
                      className="ac-pr-caja-bigote"
                    />
                    <line
                      x1={escala(caja.max as number)}
                      x2={escala(caja.max as number)}
                      y1={-6}
                      y2={6}
                      className="ac-pr-caja-bigote"
                    />
                    <rect
                      x={escala(caja.q1 as number)}
                      y={-8}
                      width={Math.max(1.5, escala(caja.q3 as number) - escala(caja.q1 as number))}
                      height={16}
                      rx={2}
                      className="ac-pr-caja-rect"
                    />
                    <line
                      x1={escala(caja.mediana as number)}
                      x2={escala(caja.mediana as number)}
                      y1={-8}
                      y2={8}
                      className="ac-pr-caja-mediana"
                    />
                  </g>
                ) : (
                  <text x={0} y={0} className="ac-pr-caja-sin">
                    caja no calculable (faltan cuartiles)
                  </text>
                )}

                {/* Las cinco cifras exactas van en una línea bajo la caja: con la cola
                    derecha del precio (máx 30 USD frente a una mediana de 3 USD) cinco
                    etiquetas sobre el eje se encimarían. */}
                <text x={0} y={26} className="ac-pr-caja-etq">
                  {cifras.join(' · ')}
                </text>
              </g>
            );
          })}
        </g>

        {/* Rótulo de categoría a la izquierda y eje inferior compartido. */}
        {cajas.map((caja, posicion) => (
          <g key={`etq-${caja.categoria}`} transform={`translate(0 ${posicion * FILA_CAJA + 36})`}>
            <text x={0} y={-2} className="ac-pr-caja-cat">
              {caja.etiqueta}
            </text>
            <text x={0} y={11} className="ac-pr-caja-n">
              n = {numero(caja.n)}
            </text>
          </g>
        ))}

        <g transform={`translate(${GUTTER_CAJA} ${alto - 16})`}>
          <line x1={0} x2={anchoTrazado} y1={0} y2={0} className="ac-eje-base" />
          {marcas.map((valor) => (
            <g key={`marca-${valor}`}>
              <line x1={escala(valor)} x2={escala(valor)} y1={0} y2={4} className="ac-eje-linea" />
              <text x={escala(valor)} y={13} textAnchor="middle" className="ac-eje-texto">
                {precio(valor)}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <figcaption className="ac-nota">
        Cada fila es una categoría; la caja va de q1 a q3, la línea gruesa es la mediana y los
        bigotes llegan al mínimo y al máximo observados. Escala lineal en {unidad}; pasa el cursor
        sobre una caja (o lee la tabla) para ver las cifras exactas.
      </figcaption>
    </figure>
  );
}

/* --------------------------------------------------------------------------- */
/* Panel B · Cambios de precio entre semanas consecutivas                      */
/* --------------------------------------------------------------------------- */

function PanelCambios({
  datos,
  contexto,
  tienda,
  cargando,
}: {
  datos: CambiosPreciosRespuesta | null;
  contexto: string;
  tienda: string | null;
  cargando: boolean;
}) {
  const series = useMemo(() => {
    const copia = [...(datos?.series ?? [])];
    copia.sort((a, b) => b.transiciones - a.transiciones || b.aumentos - a.aumentos);
    return copia;
  }, [datos]);

  const totales = datos?.totales ?? null;
  const sinTransiciones = totales !== null && totales.transiciones === 0;

  return (
    <section className="ac-panel ac-pr-panel" aria-labelledby="ac-t-precios-cambios">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-precios-cambios">Cambios de precio entre semanas consecutivas</h3>
          <p className="ac-panel-sub">
            {contexto}
            {tienda ? ` · tienda ${tienda}` : ''}
            {datos
              ? ` · ${fechaCorta(datos.periodo.desde)} – ${fechaCorta(datos.periodo.hasta)} · ${
                  datos.semanas
                } semanas · ${numero(datos.series_con_precio)} series con precio · ${datos.unidad}`
              : ''}
          </p>
        </div>
        {cargando ? <span className="ac-pr-cargando">Actualizando…</span> : null}
      </header>

      {!datos ? (
        <p className="ac-vacio">
          {cargando ? 'Cargando los cambios de precio…' : 'Sin cambios de precio disponibles.'}
        </p>
      ) : (
        <>
          <dl className="ac-metricas ac-pr-metricas">
            <div>
              <dt>Transiciones</dt>
              <dd>{numero(datos.totales.transiciones)}</dd>
            </div>
            <div>
              <dt>Aumentos</dt>
              <dd>{numero(datos.totales.aumentos)}</dd>
            </div>
            <div>
              <dt>Disminuciones</dt>
              <dd>{numero(datos.totales.disminuciones)}</dd>
            </div>
            <div>
              <dt>Sin cambio</dt>
              <dd>{numero(datos.totales.sin_cambio)}</dd>
            </div>
            <div>
              <dt>Aumentos entre cambios</dt>
              <dd>{pct(datos.totales.pct_aumentos_entre_cambios)}</dd>
            </div>
            <div>
              <dt>Sin cambio</dt>
              <dd>{pct(datos.totales.pct_sin_cambio)}</dd>
            </div>
          </dl>

          <p className="ac-nota ac-pr-unidad">
            Unidad de conteo: <strong>transiciones de precio</strong> entre semanas consecutivas con
            precio, para {numero(datos.series_con_precio)} series del {fechaCorta(datos.periodo.desde)}{' '}
            al {fechaCorta(datos.periodo.hasta)}. Cada transición compara el precio de una semana con
            el de la inmediata anterior de la misma serie.
          </p>

          {datos.totales.pct_aumentos_entre_cambios === null ? (
            <p className="ac-aviso-inline">
              Porcentaje de aumentos no calculable: {datos.totales.motivo_pct ?? 'no hay cambios de precio en el periodo.'}
            </p>
          ) : null}

          <p className="ac-aviso-inline ac-pr-tolerancia">
            <strong>Comparación:</strong> en {datos.precision_comparacion} exactos
            ({datos.umbral.precision}).{' '}
            {datos.umbral.valor_usd === 0 ? (
              <>No hay umbral comercial: un cambio de un centavo cuenta como aumento o disminución.</>
            ) : (
              <>
                Umbral comercial declarado de {numero2(datos.umbral.valor_usd)} USD
                ({datos.umbral.tipo}); por debajo de ese importe el par cuenta como «sin cambio».
              </>
            )}{' '}
            {datos.umbral.nota}
          </p>

          <p className="ac-nota ac-pr-nota-datos">{datos.nota}</p>

          {sinTransiciones ? (
            <p className="ac-vacio" data-testid="precios-sin-transiciones">
              No hay transiciones de precio en el periodo: {datos.nota} No se dibujan barras porque
              todas serían cero.
            </p>
          ) : (
            <>
              {datos.por_categoria.length === 0 ? (
                <p className="ac-vacio">Sin desglose por categoría en el periodo.</p>
              ) : (
                <>
                  <p className="ac-pr-etq-bloque">
                    Desglose por categoría · todas las transiciones (escala común)
                  </p>
                  <BarrasApiladas categorias={datos.por_categoria} modo="todas" />
                  <p className="ac-pr-etq-bloque">
                    Desglose por categoría · solo transiciones con cambio (escala propia)
                  </p>
                  <BarrasApiladas categorias={datos.por_categoria} modo="cambios" />
                  <ul className="ac-pr-leyenda">
                    <li>
                      <span className="ac-pr-muestra ac-pr-muestra--aumentos" /> Aumentos de precio
                    </li>
                    <li>
                      <span className="ac-pr-muestra ac-pr-muestra--disminuciones" /> Disminuciones de
                      precio
                    </li>
                    <li>
                      <span className="ac-pr-muestra ac-pr-muestra--sin-cambio" /> Sin cambio (dentro de
                      la tolerancia)
                    </li>
                  </ul>
                </>
              )}

              <p className="ac-pr-etq-bloque">
                Series con más transiciones ({numero(series.length)})
              </p>
              <div className="ac-pr-marco" data-testid="precios-tabla-series">
                <table className="ac-tabla ac-pr-tabla">
                  <caption>
                    Ordenadas de más a menos transiciones · comparación en{' '}
                    {datos.precision_comparacion}
                    {datos.umbral.valor_usd > 0
                      ? ` · umbral comercial ${numero2(datos.umbral.valor_usd)} USD`
                      : ' · sin umbral comercial'}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Artículo</th>
                      <th scope="col" className="ac-tabla-num">
                        Transiciones
                      </th>
                      <th scope="col" className="ac-tabla-num">
                        Aumentos
                      </th>
                      <th scope="col" className="ac-tabla-num">
                        Disminuciones
                      </th>
                      <th scope="col" className="ac-tabla-num">
                        Sin cambio
                      </th>
                      <th scope="col" className="ac-tabla-num">
                        Semanas con precio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="ac-tabla-vacia">
                          Sin series con precio en el periodo.
                        </td>
                      </tr>
                    ) : (
                      series.map((serie: SerieCambiosPrecio) => (
                        <tr key={serie.item_id}>
                          <th scope="row" className="ac-tabla-id">
                            {serie.item_id}
                          </th>
                          <td className="ac-tabla-num">{numero(serie.transiciones)}</td>
                          <td className="ac-tabla-num">{numero(serie.aumentos)}</td>
                          <td className="ac-tabla-num">{numero(serie.disminuciones)}</td>
                          <td className="ac-tabla-num">{numero(serie.sin_cambio)}</td>
                          <td className="ac-tabla-num">{numero(serie.semanas_con_precio)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function BarrasApiladas({
  categorias,
  modo,
}: {
  categorias: CambiosPreciosRespuesta['por_categoria'];
  modo: 'todas' | 'cambios';
}) {
  const ANCHO = 720;
  const IZQUIERDA = 112;
  const DERECHA = 128;
  const FILA = 40;
  const anchoBarra = ANCHO - IZQUIERDA - DERECHA;
  const alto = categorias.length * FILA + 10;
  const maximo = Math.max(
    1,
    ...categorias.map((categoria) =>
      modo === 'todas' ? categoria.transiciones : categoria.aumentos + categoria.disminuciones,
    ),
  );
  const escala = scaleLinear().domain([0, maximo]).range([0, anchoBarra]);
  const idTitulo = `ac-pr-barras-${modo}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <figure className="ac-pr-barras">
      <svg viewBox={`0 0 ${ANCHO} ${alto}`} role="img" aria-labelledby={idTitulo}>
        <title id={idTitulo}>
          {modo === 'todas'
            ? 'Transiciones de precio por categoría, apiladas en aumentos, disminuciones y sin cambio, con escala común al total de transiciones.'
            : 'Transiciones con cambio de precio por categoría, apiladas en aumentos y disminuciones, con escala propia sobre las transiciones con cambio.'}
        </title>
        {categorias.map((categoria, posicion) => {
          const y = posicion * FILA + 14;
          const aumentos = categoria.aumentos;
          const disminuciones = categoria.disminuciones;
          const sinCambio = modo === 'todas' ? categoria.sin_cambio : 0;
          const total = aumentos + disminuciones + sinCambio;
          const xAumentos = escala(aumentos);
          const xDisminuciones = escala(aumentos + disminuciones);
          const xSinCambio = escala(total);
          return (
            <g key={`${categoria.cat_id}-${modo}`}>
              <title>
                {`${categoria.etiqueta}: ${numero(aumentos)} aumentos · ${numero(
                  disminuciones,
                )} disminuciones${
                  modo === 'todas' ? ` · ${numero(sinCambio)} sin cambio` : ''
                } · ${numero(total)} transiciones`}
              </title>
              <text x={IZQUIERDA - 10} y={y + 11} textAnchor="end" className="ac-pr-barra-cat">
                {categoria.etiqueta}
              </text>
              <rect
                x={IZQUIERDA}
                y={y}
                width={anchoBarra}
                height={18}
                rx={3}
                className="ac-pr-barra-pista"
              />
              <rect
                x={IZQUIERDA}
                y={y}
                width={Math.max(0.8, xAumentos)}
                height={18}
                className="ac-pr-barra-aumentos"
              />
              <rect
                x={IZQUIERDA + xAumentos}
                y={y}
                width={Math.max(0, xDisminuciones - xAumentos)}
                height={18}
                className="ac-pr-barra-disminuciones"
              />
              {sinCambio > 0 ? (
                <rect
                  x={IZQUIERDA + xDisminuciones}
                  y={y}
                  width={Math.max(0, xSinCambio - xDisminuciones)}
                  height={18}
                  className="ac-pr-barra-sin-cambio"
                />
              ) : null}
              <text x={IZQUIERDA + anchoBarra + 8} y={y + 9} className="ac-pr-barra-valor">
                {numero(total)}
              </text>
              <text x={IZQUIERDA + anchoBarra + 8} y={y + 18} className="ac-pr-barra-pie">
                {modo === 'todas'
                  ? `${numero(categoria.aumentos)} aum · ${numero(categoria.disminuciones)} dis`
                  : `aum. ${pct(categoria.pct_aumentos_entre_cambios)}`}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

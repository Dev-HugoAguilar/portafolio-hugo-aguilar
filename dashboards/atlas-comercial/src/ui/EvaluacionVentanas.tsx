/**
 * «Evaluación por ventana de 28 días»: la tabla completa del modelo publicado.
 *
 * Dos granos explícitos y no intercambiables:
 *
 * - **detalle artículo × tienda**: el error se mide antes de agregar series, en unidades
 *   por serie y día;
 * - **total del segmento**: se suma predicción y observado del día y después se mide, en
 *   unidades por día del total.
 *
 * Al sumar series, los errores de signo contrario se compensan: una mejora del total no
 * implica que mejore cada serie. WAPE va en razón y en porcentaje, y con denominador cero
 * queda como no calculable.
 */

import { cifraConSigno, interpretarMejora, UNIDAD_SESGO } from '../metricas';
import { etiquetaCategoria, etiquetaEstado } from '../etiquetas';
import type { GranoVentana, VentanasEvaluacionRespuesta } from '../api';
import './evaluacion-ventanas.css';

const numero = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('es-MX');
const numero2 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? '—'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numero3 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? '—'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (iso: string) => {
  const fecha = new Date(`${iso}T00:00:00`);
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

const pct = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? 'n/c' : `${numero2(valor)} %`;

/** WAPE en razón y porcentaje, o «no calculable» sin inventar un cero. */
const wape = (grano: GranoVentana['candidato']) =>
  grano.wape_no_calculable || grano.wape_pct === null
    ? 'n/c'
    : `${numero2(grano.wape_razon)} · ${numero2(grano.wape_pct)} %`;

/**
 * Mejora del grano a partir de los dos MAE publicados.
 *
 * Se recalcula aquí en lugar de confiar en `mejora_relativa_pct`: así el texto y el signo salen
 * siempre de la misma fórmula y un porcentaje negativo no puede leerse como mejora.
 */
const mejoraDeGrano = (grano: GranoVentana) =>
  interpretarMejora(grano.candidato.mae, grano.baseline.mae);

function TablaGrano({ grano }: { grano: GranoVentana }) {
  return (
    <table className="ac-tabla ac-ev-tabla">
      <caption>
        {grano.grano} · sesgo en {UNIDAD_SESGO[grano.grano === 'total del segmento' ? 'agregado' : 'diario']} — {grano.candidato.observaciones
          ? `${numero(grano.candidato.observaciones)} observaciones`
          : 'sin observaciones'}
        {grano.motivo ? ` · ${grano.motivo}` : ''}
      </caption>
      <thead>
        <tr>
          <th scope="col">Método</th>
          <th scope="col" className="ac-tabla-num">MAE</th>
          <th scope="col" className="ac-tabla-num">Sesgo</th>
          <th scope="col" className="ac-tabla-num">WAPE razón · %</th>
          <th scope="col" className="ac-tabla-num">Denominador</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Candidato</th>
          <td className="ac-tabla-num">{numero2(grano.candidato.mae)}</td>
          <td className="ac-tabla-num">{numero3(grano.candidato.sesgo)}</td>
          <td className="ac-tabla-num">{wape(grano.candidato)}</td>
          <td className="ac-tabla-num">{numero(grano.candidato.denominador)}</td>
        </tr>
        <tr>
          <th scope="row">Baseline</th>
          <td className="ac-tabla-num">{numero2(grano.baseline.mae)}</td>
          <td className="ac-tabla-num">{numero3(grano.baseline.sesgo)}</td>
          <td className="ac-tabla-num">{wape(grano.baseline)}</td>
          <td className="ac-tabla-num">{numero(grano.baseline.denominador)}</td>
        </tr>
        <tr>
          <th scope="row">Diferencia · mejora</th>
          <td className="ac-tabla-num">
            {grano.diferencia_absoluta === null
              ? 'n/c'
              : cifraConSigno(grano.diferencia_absoluta)}
          </td>
          <td className="ac-tabla-num" colSpan={2} title={mejoraDeGrano(grano).detalle}>
            {mejoraDeGrano(grano).texto}
          </td>
          <td className="ac-tabla-num">—</td>
        </tr>
      </tbody>
    </table>
  );
}

export function EvaluacionVentanas({
  datos,
  cargando,
  error,
  onReintentar,
}: {
  datos: VentanasEvaluacionRespuesta | null;
  cargando: boolean;
  error: string | null;
  onReintentar?: () => void;
}) {
  const consolidado = datos?.consolidado ?? {};
  const detalleConsolidado = (consolidado.detalle ?? {}) as {
    candidato?: { mae?: number | null; wape_pct?: number | null };
    baseline?: { mae?: number | null; wape_pct?: number | null };
    mejora_relativa_pct?: number | null;
    ventanas?: number;
  };
  const agregadoConsolidado = (consolidado.agregado ?? {}) as typeof detalleConsolidado;

  return (
    <section className="ac-panel ac-ev-panel" aria-labelledby="ac-t-evaluacion-ventanas">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-evaluacion-ventanas">Evaluación por ventana de 28 días</h3>
          <p className="ac-panel-sub">
            {datos
              ? `${datos.ventanas.length} ${datos.ventanas.length === 1 ? 'ventana' : 'ventanas'} · ${datos.granos.join(' y ')} · ejecución ${datos.run_id}`
              : 'Tabla completa del modelo publicado frente al baseline'}
          </p>
        </div>
      </header>

      {error ? (
        <div className="ac-hx-aviso" role="alert">
          <p>{error}</p>
          {onReintentar ? (
            <button type="button" className="ac-accion ac-accion--secundaria" onClick={onReintentar}>
              Reintentar
            </button>
          ) : null}
        </div>
      ) : null}

      {!error && (cargando || !datos) ? (
        <p className="ac-vacio" role="status" aria-busy="true">
          Calculando la evaluación por ventana…
        </p>
      ) : null}

      {!error && datos ? (
        <>
          <ul className="ac-ev-leyenda">
            {datos.ventanas.map((ventana) => (
              <li key={ventana.origen_d}>
                <strong>{fechaCorta(ventana.origen_fecha)}</strong> →{' '}
                {fechaCorta(ventana.fin_fecha)} · {ventana.series.toLocaleString('es-MX')} series ·{' '}
                <span className={`ac-ev-etapa${ventana.etapa === 'final' ? ' is-final' : ''}`}>
                  {ventana.etapa === 'final' ? 'evaluación final' : 'desarrollo'}
                </span>
                {ventana.fallback > 0 ? ` · ${ventana.fallback} con fallback` : ' · sin fallback'}
              </li>
            ))}
          </ul>

          <dl className="ac-ev-consolidado">
            <div>
              <dt>MAE consolidado · detalle</dt>
              <dd>
                {numero2(detalleConsolidado.candidato?.mae)} vs{' '}
                {numero2(detalleConsolidado.baseline?.mae)}
              </dd>
              <p className="ac-kpi-pie">unidades por serie y día</p>
            </div>
            <div>
              <dt>WAPE consolidado · detalle</dt>
              <dd>{pct(detalleConsolidado.candidato?.wape_pct)}</dd>
              <p className="ac-kpi-pie" data-testid="ev-consolidado-detalle-mejora">
                baseline {pct(detalleConsolidado.baseline?.wape_pct)} ·{' '}
                {interpretarMejora(
                  detalleConsolidado.candidato?.mae,
                  detalleConsolidado.baseline?.mae,
                ).texto}
              </p>
            </div>
            <div>
              <dt>MAE consolidado · total</dt>
              <dd>
                {numero2(agregadoConsolidado.candidato?.mae)} vs{' '}
                {numero2(agregadoConsolidado.baseline?.mae)}
              </dd>
              <p className="ac-kpi-pie">unidades por día del total del segmento</p>
            </div>
            <div>
              <dt>WAPE consolidado · total</dt>
              <dd>{pct(agregadoConsolidado.candidato?.wape_pct)}</dd>
              <p className="ac-kpi-pie" data-testid="ev-consolidado-total-mejora">
                baseline {pct(agregadoConsolidado.baseline?.wape_pct)} ·{' '}
                {interpretarMejora(
                  agregadoConsolidado.candidato?.mae,
                  agregadoConsolidado.baseline?.mae,
                ).texto}
              </p>
            </div>
          </dl>

          <div className="ac-ev-ventanas">
            {datos.ventanas.map((ventana, indice) => (
              <article key={ventana.origen_d} className="ac-ev-ventana">
                <h4>
                  {fechaCorta(ventana.origen_fecha)} → {fechaCorta(ventana.fin_fecha)}
                  <span className="ac-plan-codigo">corte d_{ventana.origen_d}</span>
                  <span className="ac-ev-etapa">
                    {indice + 1}.º de {datos.ventanas.length}
                  </span>
                </h4>
                <TablaGrano grano={ventana.detalle} />
                <TablaGrano grano={ventana.agregado} />
              </article>
            ))}
          </div>

          <div className="ac-ev-segmentos">
            {(
              [
                ['Estado', datos.por_estado],
                ['Categoría', datos.por_categoria],
              ] as const
            ).map(([etiqueta, segmentos]) => (
              <div key={etiqueta} className="ac-ev-marco">
                <table className="ac-tabla ac-ev-tabla">
                  <caption>
                    Resultados por {etiqueta.toLowerCase()} · consolidado de la etapa, con los dos
                    granos
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{etiqueta}</th>
                      <th scope="col" className="ac-tabla-num">Series</th>
                      <th scope="col" className="ac-tabla-num">MAE detalle</th>
                      <th scope="col" className="ac-tabla-num">Mejora detalle</th>
                      <th scope="col" className="ac-tabla-num">MAE total</th>
                      <th scope="col" className="ac-tabla-num">Mejora total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segmentos.map((segmento) => (
                      <tr key={segmento.clave}>
                        <th scope="row">
                          {etiqueta === 'Estado'
                            ? etiquetaEstado(segmento.clave)
                            : etiquetaCategoria(segmento.clave)}
                          <span className="ac-plan-codigo">{segmento.clave}</span>
                        </th>
                        <td className="ac-tabla-num">{numero(segmento.series)}</td>
                        <td className="ac-tabla-num">
                          {numero2(segmento.detalle.candidato.mae)} vs{' '}
                          {numero2(segmento.detalle.baseline.mae)}
                        </td>
                        <td
                          className="ac-tabla-num"
                          data-testid={`ev-mejora-detalle-${segmento.clave}`}
                          title={
                            interpretarMejora(
                              segmento.detalle.candidato.mae,
                              segmento.detalle.baseline.mae,
                            ).detalle
                          }
                        >
                          {
                            interpretarMejora(
                              segmento.detalle.candidato.mae,
                              segmento.detalle.baseline.mae,
                            ).textoCorto
                          }
                        </td>
                        <td className="ac-tabla-num">
                          {numero2(segmento.agregado.candidato.mae)} vs{' '}
                          {numero2(segmento.agregado.baseline.mae)}
                        </td>
                        <td
                          className="ac-tabla-num"
                          data-testid={`ev-mejora-total-${segmento.clave}`}
                          title={
                            interpretarMejora(
                              segmento.agregado.candidato.mae,
                              segmento.agregado.baseline.mae,
                            ).detalle
                          }
                        >
                          {
                            interpretarMejora(
                              segmento.agregado.candidato.mae,
                              segmento.agregado.baseline.mae,
                            ).textoCorto
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <p className="ac-nota">
            {datos.formulas.granos}. {datos.formulas.unidades}. {datos.formulas.compensacion}.
            {datos.reconciliacion.cuadra === true
              ? ` Reconciliación: el agregado del corte d_${datos.reconciliacion.origen_d} es la suma de ${numero(datos.reconciliacion.series)} series artículo × tienda (diferencia máxima ${numero2(datos.reconciliacion.max_diferencia_absoluta)}).`
              : datos.reconciliacion.motivo
                ? ` Reconciliación: ${datos.reconciliacion.motivo}.`
                : ''}
          </p>

          <ul className="ac-ev-advertencias">
            {datos.advertencias.map((advertencia) => (
              <li key={advertencia}>{advertencia}</li>
            ))}
          </ul>

          <details className="ac-ev-formulas">
            <summary>Fórmulas y alcance</summary>
            <dl>
              {Object.entries(datos.formulas).map(([clave, texto]) => (
                <div key={clave}>
                  <dt>{clave.replace(/_/g, ' ')}</dt>
                  <dd>{texto}</dd>
                </div>
              ))}
            </dl>
          </details>
        </>
      ) : null}
    </section>
  );
}

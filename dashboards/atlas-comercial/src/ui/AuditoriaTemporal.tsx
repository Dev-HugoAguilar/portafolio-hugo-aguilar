/**
 * Auditoría de separación temporal (evidencia desplegable).
 *
 * Muestra el resumen legible y, debajo, la tabla completa de evidencia: por cada ejecución y corte,
 * qué orígenes de entrenamiento se usaron, hasta qué fecha llegan las **etiquetas** (origen +
 * horizonte), qué ventana se evaluó, para qué se usó el corte y con qué fuente se acreditó cada
 * campo.
 *
 * Tres estados posibles, sin adornos:
 *
 * - `separacion_verificada`: las etiquetas de entrenamiento no superan el corte y los objetivos
 *   evaluados son posteriores.
 * - `contaminada`: hay etiquetas posteriores al corte evaluado.
 * - `no_verificable`: falta evidencia en los registros; no se convierte en aprobación ni en
 *   acusación.
 */

import type { AuditoriaTemporalRespuesta, FilaAuditoriaTemporal } from '../api';

import { fechaCorta, numero } from '../etiquetas';

const ETIQUETA_RESULTADO: Record<string, string> = {
  separacion_verificada: 'Separación verificada',
  contaminada: 'Evaluación contaminada',
  no_verificable: 'No verificable con la evidencia disponible',
};

const CLASE_RESULTADO: Record<string, string> = {
  separacion_verificada: 'is-verificada',
  contaminada: 'is-contaminada',
  no_verificable: 'is-no-verificable',
};

const nombreArtefacto = (fila: FilaAuditoriaTemporal) => {
  if (!fila.artefacto) {
    return fila.entrenado ? 'sin artefacto registrado' : 'regla determinista (sin parámetros)';
  }
  const partes = fila.artefacto.split(/[\\/]/);
  return partes[partes.length - 1] ?? fila.artefacto;
};

export function AuditoriaTemporal({
  datos,
  cargando,
  error,
}: {
  datos: AuditoriaTemporalRespuesta | null;
  cargando: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="ac-hx-aviso" role="alert" data-testid="auditoria-temporal-error">
        <p>No se pudo cargar la auditoría temporal: {error}</p>
      </div>
    );
  }
  if (cargando && !datos) {
    return (
      <p className="ac-cargando" role="status" data-testid="auditoria-temporal-cargando">
        Leyendo la evidencia de separación temporal…
      </p>
    );
  }
  if (!datos) return null;
  if (!datos.disponible) {
    return (
      <div className="ac-vacio" role="status" data-testid="auditoria-temporal-sin-datos">
        <p>{datos.motivo ?? 'No hay auditoría temporal guardada para esta versión.'}</p>
        <p className="ac-nota">
          La ausencia de auditoría no demuestra ni descarta fuga: se clasifica como no verificable
          hasta generar la evidencia.
        </p>
      </div>
    );
  }

  const resumen = datos.resumen ?? {};
  const contaminadas = Number(resumen.contaminadas ?? 0);
  const noVerificables = Number(resumen.no_verificables ?? 0);

  return (
    <div className="ac-auditoria" data-testid="auditoria-temporal">
      <p data-testid="auditoria-temporal-resumen">
        <strong>{numero(resumen.filas ?? datos.filas.length)} evaluaciones auditadas.</strong>{' '}
        {numero(resumen.verificadas ?? 0)} con separación verificada
        {contaminadas > 0 ? `, ${numero(contaminadas)} contaminadas` : ', ninguna contaminada'}
        {noVerificables > 0
          ? ` y ${numero(noVerificables)} no verificables con la evidencia disponible`
          : ' y ninguna no verificable'}
        . La comprobación usa la fecha de las <strong>etiquetas</strong> (origen + horizonte), no solo
        el origen de cada fila, y no exige que el experimento se haya ejecutado antes del corte: lo
        relevante es qué información entró al modelo.
      </p>

      {datos.procedencia_metricas_desarrollo ? (
        <p className="ac-nota" data-testid="auditoria-procedencia">
          Las métricas de desarrollo del manifiesto publicado ({datos.procedencia_metricas_desarrollo.manifiesto_publicado})
          proceden de la ejecución {datos.procedencia_metricas_desarrollo.ejecucion_de_desarrollo}
          {' '}(WAPE {numero(datos.procedencia_metricas_desarrollo.wape_desarrollo ?? 0)} %), no del
          artefacto publicado. Los cortes finales se evalúan aparte con ese artefacto.
        </p>
      ) : null}

      <details className="ac-auditoria-tabla" data-testid="auditoria-temporal-detalle">
        <summary>Tabla de evidencia por ejecución y corte</summary>
        <div className="ac-tabla-marco">
          <table className="ac-tabla">
            <caption>
              Evidencia de separación temporal · {datos.generado_en || 'sin fecha'} · versión{' '}
              {datos.version}
            </caption>
            <thead>
              <tr>
                <th scope="col">Variante · ejecución</th>
                <th scope="col">Artefacto</th>
                <th scope="col">Corte</th>
                <th scope="col">Horizonte evaluado</th>
                <th scope="col">Orígenes de entrenamiento</th>
                <th scope="col">Última etiqueta usada</th>
                <th scope="col">Uso del corte</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {datos.filas.map((fila) => (
                <tr key={`${fila.run_id}-${fila.etapa}-${fila.corte}`}>
                  <th scope="row">
                    {fila.variante}
                    <span className="ac-plan-codigo">{fila.run_id}</span>
                  </th>
                  <td title={fila.artefacto ?? undefined}>{nombreArtefacto(fila)}</td>
                  <td data-testid={`auditoria-corte-${fila.run_id}-${fila.corte}`}>
                    {fechaCorta(fila.fecha_corte)}
                    <span className="ac-plan-codigo">d_{fila.corte}</span>
                  </td>
                  <td>
                    {fechaCorta(fila.inicio_horizonte)} – {fechaCorta(fila.fin_horizonte)}
                  </td>
                  <td>
                    {fila.origenes_entrenamiento.length
                      ? `d_${fila.origenes_entrenamiento.join(', d_')}`
                      : 'sin entrenamiento'}
                  </td>
                  <td>
                    {fila.ultima_etiqueta_entrenamiento === null
                      ? '—'
                      : `d_${fila.ultima_etiqueta_entrenamiento} (${fechaCorta(
                          fila.fecha_ultima_etiqueta,
                        )})`}
                    {fila.dias_entre_etiqueta_y_corte !== null
                      ? ` · ${numero(fila.dias_entre_etiqueta_y_corte)} días antes del corte`
                      : ''}
                  </td>
                  <td>{fila.uso_del_corte}</td>
                  <td>
                    <span className={`ac-auditoria-estado ${CLASE_RESULTADO[fila.resultado] ?? ''}`}>
                      {ETIQUETA_RESULTADO[fila.resultado] ?? fila.resultado}
                    </span>
                    <span className="ac-auditoria-detalle">{fila.detalle}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="ac-auditoria-fuentes">
          <summary>Fuente de cada campo y controles aplicados</summary>
          <dl className="ac-dl">
            {Object.entries(datos.filas[0]?.fuentes ?? {}).map(([campo, fuente]) => (
              <div key={campo}>
                <dt>{campo.replace(/_/g, ' ')}</dt>
                <dd>{fuente}</dd>
              </div>
            ))}
            <div>
              <dt>early stopping</dt>
              <dd>{datos.filas[0]?.early_stopping ?? 'no declarado'}</dd>
            </div>
            <div>
              <dt>selección de hiperparámetros</dt>
              <dd>{datos.filas[0]?.seleccion_de_hiperparametros ?? 'no declarado'}</dd>
            </div>
            <div>
              <dt>transformaciones</dt>
              <dd>{datos.filas[0]?.transformaciones ?? 'no declarado'}</dd>
            </div>
          </dl>
        </details>
      </details>

      {datos.nota ? <p className="ac-nota">{datos.nota}</p> : null}
    </div>
  );
}

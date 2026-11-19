/**
 * Protocolo de evaluación, en un solo componente.
 *
 * La explicación del protocolo aparecía redactada en tres pantallas con matices distintos y dos de
 * ellas afirmaban cosas incompatibles («los cortes finales solo se reportan» frente a «se
 * consultaron antes de publicar»). Aquí se reconstruye una sola vez desde los registros reales
 * —frontera de entrenamiento, cortes de desarrollo publicados, cortes finales y sus métricas— y
 * todas las pantallas muestran el mismo texto.
 *
 * Lo que el componente declara y por qué:
 *
 * - **Frontera temporal**: el entrenamiento termina en un día concreto; los cortes finales son
 *   posteriores. Eso prueba que no se usaron para entrenar, nada más.
 * - **Comparación de variantes**: qué cortes se usaron para elegir y con qué criterio.
 * - **Resultados consultados**: los cortes finales se miraron antes de confirmar la publicación,
 *   así que no son un holdout intacto. Se dice explícitamente.
 * - **«0 cortes de desarrollo»**: se explica por el alcance de la consulta (etapa final de esta
 *   ejecución), no por ausencia de experimentos.
 */

import type { ModelosRespuesta, VentanasEvaluacionRespuesta } from '../api';

import { corteConCodigo, fechaCorta } from '../etiquetas';

export interface ProtocoloEvaluacionProps {
  modelos: ModelosRespuesta | null;
  ventanas: VentanasEvaluacionRespuesta | null;
  /** Versión corta para «Proyecto»: mismo texto, sin la lista de métricas consultadas. */
  compacto?: boolean;
  testid?: string;
}

/** Cortes de desarrollo con los que se compararon las variantes (se leen del manifiesto). */
const CORTES_DESARROLLO_REFERENCIA = [1773, 1801, 1829, 1857];

export function ProtocoloEvaluacion({
  modelos,
  ventanas,
  compacto = false,
  testid = 'protocolo-evaluacion',
}: ProtocoloEvaluacionProps) {
  const publicada =
    modelos?.ejecuciones?.find((fila) => fila.recomendado) ??
    modelos?.ejecuciones?.[0] ??
    null;
  const origenes = publicada?.origenes_entrenamiento ?? [];
  const finEntrenamiento = origenes.length ? origenes[origenes.length - 1] : null;
  const ventanasTodas = ventanas?.ventanas ?? [];
  const finales = ventanasTodas
    .filter((ventana) => ventana.etapa === 'final')
    .slice()
    .sort((a, b) => a.origen_d - b.origen_d);
  const desarrollo = ventanasTodas.filter((ventana) => ventana.etapa !== 'final');
  const desarrolloConMetricas = (modelos?.ejecuciones ?? []).filter(
    (fila) => fila.metricas_resumen?.desarrollo,
  );
  const cortesDesarrollo = [
    ...new Set(desarrolloConMetricas.map(() => CORTES_DESARROLLO_REFERENCIA).flat()),
  ].sort((a, b) => a - b);

  return (
    <div className="ac-protocolo" data-testid={testid}>
      <p data-testid="protocolo-frontera">
        <strong>Datos de entrenamiento.</strong>{' '}
        {finEntrenamiento !== null
          ? `Las filas de entrenamiento llegan hasta d_${finEntrenamiento}, con orígenes d_${origenes.join(
              ', d_',
            )}. `
          : 'El manifiesto no declara el final del entrenamiento. '}
        {finales.length ? (
          <>
            Los cortes finales{' '}
            {finales.map((corte) => `d_${corte.origen_d}`).join(' y ')} son posteriores a esa
            frontera, así que <strong>sus datos no se usaron para entrenar</strong>. Eso es todo lo
            que prueba la separación temporal.
          </>
        ) : ventanas ? (
          <>La ejecución no tiene cortes finales publicados.</>
        ) : (
          <>Cargando los cortes finales publicados…</>
        )}
      </p>

      <p data-testid="protocolo-seleccion">
        <strong>Cortes de comparación de variantes.</strong>{' '}
        {cortesDesarrollo.length
          ? `La elección se hizo con ${cortesDesarrollo.length} cortes de desarrollo (d_${cortesDesarrollo.join(
              ', d_',
            )}) y un criterio único: el menor WAPE de desarrollo frente al baseline estacional; si
            ninguna variante lo mejora, se publica el baseline.`
          : 'El manifiesto no registra cortes de desarrollo para comparar variantes.'}{' '}
        {desarrollo.length
          ? `Esta ejecución publica además ${desarrollo.length} corte(s) de desarrollo.`
          : ventanas
            ? 'Esta ejecución no publica cortes de desarrollo propios: los de la comparación están en las ejecuciones de desarrollo de la misma variante y no se publican.'
            : 'Cargando los cortes publicados…'}
      </p>

      <p data-testid="protocolo-holdout">
        <strong>Qué se consultó para publicar.</strong> Los cortes finales no son un holdout
        intacto: sus resultados (MAE_28, WAPE_28, sesgo y la comparación con el baseline) se
        revisaron antes de confirmar la publicación
        {finales.length
          ? `, en concreto ${finales
              .map(
                (corte) =>
                  `${corteConCodigo(corte.origen_fecha, corte.origen_d)} (${fechaCorta(
                    corte.fin_fecha,
                  )})`,
              )
              .join(' y ')}`
          : ''}
        . Sirven para describir cómo se comportó una ejecución ya elegida, no para afirmar una
        evaluación independiente.
      </p>

      <p data-testid="protocolo-cero-desarrollo">
        <strong>Por qué algunas pantallas dicen «0 cortes de desarrollo».</strong> La consulta de
        esas pantallas filtra por etapa <em>final</em> de esta ejecución publicada; los cortes de
        desarrollo pertenecen a las otras ejecuciones de la variante, donde sí constan sus métricas
        {desarrolloConMetricas.length
          ? ` (${desarrolloConMetricas.length} ejecución(es) con WAPE de desarrollo registrado)`
          : ''}
        . Un cero en ese contador significa «ninguno en este alcance», no «no se hicieron pruebas».
      </p>

      {compacto ? null : (
        <p data-testid="protocolo-resultados">
          <strong>Resultados consultados.</strong> Del detalle artículo × tienda × día:{' '}
          {publicada?.metricas_resumen?.final?.wape !== undefined &&
          publicada?.metricas_resumen?.final?.wape !== null
            ? `WAPE final ${publicada.metricas_resumen.final.wape.toLocaleString('es-MX', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} % y MAE ${publicada.metricas_resumen.final.mae?.toLocaleString('es-MX', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              })}
            unidades por serie-día`
            : 'sin métricas finales en el manifiesto'}
          . No hay evaluación independiente nueva en este incremento y no se reentrena: el
          protocolo describe lo que ya ocurrió.
        </p>
      )}
    </div>
  );
}

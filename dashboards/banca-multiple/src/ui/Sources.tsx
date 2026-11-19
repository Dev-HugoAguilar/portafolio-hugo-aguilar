/** Panel «Fuentes y metodología» (Radix Dialog). */

import * as Dialog from '@radix-ui/react-dialog';

import type { Boletin, Catalogo } from '../api/types';
import {
  etiquetaPeriodo,
  etiquetaPeriodoLarga,
  fechaHora,
  porcentaje,
} from '../domain';

export interface PropsSources {
  abierto: boolean;
  onAbierto: (abierto: boolean) => void;
  catalogo: Catalogo;
  boletin: Boletin | null;
  advertencias: string[];
}

export function Sources({ abierto, onAbierto, catalogo, boletin, advertencias }: PropsSources) {
  const { fuente, boletines, cobertura, periodos, instituciones } = catalogo;
  const bancos = instituciones.filter((institucion) => !institucion.es_sistema).length;

  return (
    <Dialog.Root open={abierto} onOpenChange={onAbierto}>
      <Dialog.Portal>
        <Dialog.Overlay className="bm-overlay" />
        <Dialog.Content className="bm-dialog" aria-describedby="bm-fuentes-desc">
          <div className="bm-dialog-head">
            <Dialog.Title className="bm-dialog-title">Fuentes y metodología</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="bm-btn bm-btn--ghost" aria-label="Cerrar fuentes y metodología">
                Cerrar
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description id="bm-fuentes-desc" className="bm-dialog-desc">
            {cobertura.hechos.toLocaleString('es-MX')} hechos importados de {periodos.length} boletines ·{' '}
            {bancos} instituciones · {porcentaje(null) === '—' ? '' : ''}
            cifras en millones de pesos.
          </Dialog.Description>

          <div className="bm-dialog-body">
            <section>
              <h3>Fuente del periodo activo</h3>
              <dl className="bm-dl">
                <div>
                  <dt>Organismo</dt>
                  <dd>{fuente.organismo}</dd>
                </div>
                <div>
                  <dt>Producto</dt>
                  <dd>{fuente.nombre}</dd>
                </div>
                <div>
                  <dt>Periodo de referencia</dt>
                  <dd>{boletin ? etiquetaPeriodoLarga(boletin.periodo) : '—'}</dd>
                </div>
                <div>
                  <dt>Archivo</dt>
                  <dd>
                    {boletin ? (
                      <a href={boletin.url} target="_blank" rel="noopener noreferrer">
                        {boletin.archivo}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Importado</dt>
                  <dd>
                    {fechaHora(boletin?.importado_en ?? null)} · revisión {boletin?.revision ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt>SHA-256</dt>
                  <dd className="bm-mono" title={boletin?.sha256}>
                    {boletin ? `${boletin.sha256.slice(0, 20)}…` : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Portal</dt>
                  <dd>
                    <a href={fuente.portal} target="_blank" rel="noopener noreferrer">
                      portafolioinfo.cnbv.gob.mx
                    </a>
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3>Metodología y reglas</h3>
              <ul className="bm-list">
                <li>
                  <strong>Unidad:</strong> millones de pesos (MXN) tal como los publica la CNBV. No se
                  convierten unidades ni se ajusta por inflación.
                </li>
                <li>
                  <strong>Saldos y flujos:</strong> los saldos se comparan con el periodo importado
                  anterior; los rubros del estado de resultado integral son acumulados enero–mes y solo
                  se comparan con el mismo corte del año anterior. No se suman saldos entre periodos.
                </li>
                <li>
                  <strong>«Sistema»:</strong> agregado publicado por la CNBV. Es referencia y
                  denominador de participaciones; nunca se suma con las instituciones.
                </li>
                <li>
                  <strong>Participación:</strong> institución ÷ total del sistema publicado. Solo se
                  calcula cuando el sistema tiene valor en el periodo.
                </li>
                <li>
                  <strong>Concentración:</strong> las cinco mayores participaciones sumadas; es
                  contexto global y no cambia con la selección.
                </li>
                <li>
                  <strong>ROA y ROE:</strong> porcentajes publicados por la CNBV (flujo 12 meses). Se
                  muestran institution por institución; no se suman ni se promedian.
                </li>
                <li>
                  <strong>Base 100:</strong> solo se habilita cuando existe un periodo con valor en
                  todas las series comparadas; el periodo base se indica en la vista.
                </li>
                <li>
                  <strong>Revisiones:</strong> la API sirve únicamente la revisión vigente de cada
                  boletín; las anteriores se conservan marcadas como no vigentes.
                </li>
                <li>
                  <strong>Ausentes:</strong> las celdas vacías del boletín no se convierten en cero ni
                  se imputan.
                </li>
              </ul>
            </section>

            <section>
              <h3>Fuente y definiciones de los hallazgos</h3>
              <ul className="bm-list">
                <li>
                  <strong>Concentración:</strong> suma de las participaciones de las cinco mayores
                  instituciones ÷ total publicado por la CNBV. Es contexto del sector: no cambia al
                  seleccionar bancos ni mide desempeño.
                </li>
                <li>
                  <strong>Posición:</strong> orden de la institución por importe del concepto en el
                  boletín del periodo. Participación = institución ÷ total del sistema publicado. Un
                  lugar alto indica tamaño relativo, no mejor desempeño.
                </li>
                <li>
                  <strong>Crecimiento:</strong> valor final ÷ valor inicial − 1, con las mismas dos
                  fechas para el banco y para el Sistema; la diferencia se expresa en puntos
                  porcentuales. En flujos acumulados solo se comparan cortes del mismo mes.
                </li>
                <li>
                  <strong>Rentabilidad:</strong> ROA y ROE publicados (flujo 12 meses), institución por
                  institución; no se suman ni se promedian y un ROE alto no implica por sí solo mayor
                  solidez.
                </li>
                <li>
                  Los hallazgos se recalculan con los filtros activos y no dependen del cursor ni del
                  zoom; cuando una comparación no tiene base válida se indica la limitación en lugar de
                  emitir la conclusión.
                </li>
              </ul>
            </section>

            <section>
              <h3>Metodología y calidad de datos</h3>
              <ul className="bm-list">
                <li>
                  <strong>Conciliación:</strong> {cobertura.hechos.toLocaleString('es-MX')} hechos
                  conciliados celda por celda contra los archivos originales, sin discrepancias.
                </li>
                <li>
                  <strong>Cobertura importada:</strong> {periodos.length} periodos publicados (
                  {etiquetaPeriodo(periodos[0] ?? '')} – {etiquetaPeriodo(periodos[periodos.length - 1] ?? '')}).
                  Los meses sin boletín no se interpolan ni se rellenan.
                </li>
                <li>
                  <strong>Revisiones:</strong> cada boletín se importa con SHA-256 y se conserva la
                  revisión vigente; la tabla inferior lista archivo, revisión y hechos por periodo.
                </li>
                <li>
                  <strong>Pruebas de navegación:</strong> 66 pruebas en escritorio y móvil verifican que
                  ranking, serie, dispersión y tabla responden al mismo estado de selección, incluida la
                  prueba visual de la paleta, de los desplegables y de las unidades, y la de navegación
                  del portafolio.
                </li>
                <li>
                  <strong>Hallazgos del análisis:</strong> se calculan con los filtros activos y
                  plantillas deterministas sobre `resumen`, `series` e `indicadores`; no leen elementos
                  visuales, no dependen del cursor ni del zoom y omiten cualquier conclusión cuya base
                  no sea válida.
                </li>
              </ul>
            </section>

            <section>
              <h3>Revisión de archivos importados</h3>
              <table className="bm-table bm-table--compact">
                <thead>
                  <tr>
                    <th scope="col">Periodo</th>
                    <th scope="col">Archivo</th>
                    <th scope="col">Revisión</th>
                    <th scope="col">Importado</th>
                    <th scope="col" className="bm-num">
                      Hechos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {boletines.map((item) => (
                    <tr key={`${item.periodo}-${item.revision}`}>
                      <th scope="row">{etiquetaPeriodo(item.periodo)}</th>
                      <td className="bm-mono">{item.archivo}</td>
                      <td>{item.revision}</td>
                      <td>{fechaHora(item.importado_en)}</td>
                      <td className="bm-num">{item.hechos.toLocaleString('es-MX')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h3>Advertencias</h3>
              <ul className="bm-list">
                {advertencias.map((texto) => (
                  <li key={texto}>{texto}</li>
                ))}
                <li>
                  Los archivos XLSX originales no se redistribuyen desde esta página: se enlazan desde
                  el portal de la CNBV.
                </li>
              </ul>
            </section>

            <section>
              <h3>Condiciones de uso</h3>
              <ul className="bm-list">
                {fuente.condiciones_uso.map((texto) => (
                  <li key={texto}>{texto}</li>
                ))}
              </ul>
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

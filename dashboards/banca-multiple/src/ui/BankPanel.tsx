/**
 * Panel lateral con la información del banco resaltado o seleccionado.
 *
 * Muestra la cifra exacta (no compacta), la participación contra el Sistema, la
 * variación comparable, la posición en el ranking y los indicadores publicados
 * de ese banco. Si hay varias instituciones seleccionadas, se listan todas.
 */

import type { FilaInstitucion, Indicadores, Resumen } from '../api/types';
import { estiloMuestra } from '../colors';
import {
  COLOR,
  ayudaBillones,
  etiquetaPeriodo,
  importeExacto,
  porcentaje,
  porcentajeConSigno,
  textoBase,
  textoMotivo,
} from '../domain';

export interface PropsBankPanel {
  resumen: Resumen | null;
  indicadores: Indicadores | null;
  filas: FilaInstitucion[];
  seleccion: string[];
  resaltado: string | null;
  colores: Map<string, string>;
  patrones: Map<string, string | null>;
  onAlternar: (institucionId: string) => void;
  onHover: (institucionId: string | null) => void;
  actualizando: boolean;
}

interface DatosBanco {
  fila: FilaInstitucion;
  roa: number | null;
  roe: number | null;
}

export function BankPanel({
  resumen,
  indicadores,
  filas,
  seleccion,
  resaltado,
  colores,
  patrones,
  onAlternar,
  onHover,
  actualizando,
}: PropsBankPanel) {
  const ids = seleccion.length > 0 ? seleccion : resaltado ? [resaltado] : [];
  const modo = seleccion.length > 0 ? 'selección' : 'resaltado';

  const datos: DatosBanco[] = ids
    .map((id) => {
      const fila = filas.find((item) => item.institucion_id === id);
      if (!fila) return null;
      const roa = indicadores?.indicadores
        .find((item) => item.indicador_id.startsWith('roa'))
        ?.valores.find((valor) => valor.institucion_id === id && valor.periodo === resumen?.periodo);
      const roe = indicadores?.indicadores
        .find((item) => item.indicador_id.startsWith('roe'))
        ?.valores.find((valor) => valor.institucion_id === id && valor.periodo === resumen?.periodo);
      return { fila, roa: roa?.valor ?? null, roe: roe?.valor ?? null };
    })
    .filter((item): item is DatosBanco => item !== null);

  const base = resumen ? textoBase(resumen.comparacion.tipo, resumen.comparacion.periodo_comparado, resumen.comparacion.motivo) : null;
  const motivo = resumen ? textoMotivo(resumen.comparacion.motivo) : null;

  return (
    <aside className="bm-bank" aria-label="Detalle del banco" data-testid="panel-banco">
      <p className="bm-bank-title">
        {datos.length === 0 ? 'Detalle del banco' : datos.length === 1 ? 'Banco' : `Bancos (${datos.length})`}
      </p>

      {datos.length === 0 ? (
        <p className="bm-bank-empty">
          Selecciona un banco en el ranking, la serie, la dispersión o la tabla para ver aquí su
          detalle. El resaltado con el cursor no modifica la selección.
        </p>
      ) : (
        <ul className="bm-bank-list">
          {datos.map(({ fila, roa, roe }) => (
            <li key={fila.institucion_id} className={actualizando ? 'is-updating' : undefined}>
              <div className="bm-bank-head">
                <span
                  className="bm-swatch"
                  style={estiloMuestra(
                    colores.get(fila.institucion_id) ?? COLOR.neutro,
                    patrones.get(fila.institucion_id) ?? null,
                  )}
                  aria-hidden="true"
                  data-institucion={fila.institucion_id}
                  data-color={colores.get(fila.institucion_id) ?? COLOR.neutro}
                />
                <strong>{fila.institucion}</strong>
                <button
                  type="button"
                  className="bm-chip-x"
                  aria-label={`Quitar ${fila.institucion}`}
                  onClick={() => onAlternar(fila.institucion_id)}
                  onMouseEnter={() => onHover(fila.institucion_id)}
                  onMouseLeave={() => onHover(null)}
                >
                  ×
                </button>
              </div>
              <dl className="bm-bank-dl">
                <div>
                  <dt>Valor</dt>
                  <dd className="bm-num-strong">
                    {importeExacto(fila.valor)}
                    <span className="bm-unit-inline"> millones</span>
                  </dd>
                </div>
                {fila.participacion_pct !== null ? (
                  <div>
                    <dt>Participación</dt>
                    <dd>{porcentaje(fila.participacion_pct)} % del sistema</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Variación</dt>
                  <dd className={fila.variacion_pct !== null && fila.variacion_pct < 0 ? 'is-down' : undefined}>
                    {fila.variacion_pct === null
                      ? (motivo ?? 'sin comparación')
                      : `${porcentajeConSigno(fila.variacion_pct)} % ${base?.etiqueta ?? ''}`}
                  </dd>
                </div>
                <div>
                  <dt>Posición</dt>
                  <dd>{fila.posicion !== null ? `${fila.posicion} en el boletín` : '—'}</dd>
                </div>
                {roa !== null && roe !== null ? (
                  <div>
                    <dt>ROA / ROE</dt>
                    <dd>
                      {porcentaje(roa)} % / {porcentaje(roe)} %
                      <span className="bm-unit-inline"> publicados</span>
                    </dd>
                  </div>
                ) : null}
                {ayudaBillones(fila.valor) ? (
                  <div>
                    <dt>Equivalente</dt>
                    <dd>{ayudaBillones(fila.valor)}</dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}

      {resumen ? (
        <p className="bm-bank-foot">
          Datos de {etiquetaPeriodo(resumen.periodo)} · {modo === 'selección' ? 'selección activa' : 'bajo el cursor'}
        </p>
      ) : null}
    </aside>
  );
}

/**
 * Sección «Hallazgos del análisis».
 *
 * Dos variantes con el mismo cálculo (`src/hallazgos.ts`):
 *  - `ficha`: párrafos breves con la misma tipografía, color e interlineado que
 *    el resto de apartados de la ficha del proyecto (sin tarjeta, borde, sombra,
 *    fondo propio ni iconos). El encabezado lo aporta la propia ficha.
 *  - `panel`: tarjetas, solo como respaldo cuando no existe la ficha (por
 *    ejemplo, al abrir el módulo aislado en desarrollo).
 *
 * Cambian al mover periodo, concepto, selección o fechas de comparación; el hover
 * y el zoom no las alteran, y mientras la consulta se actualiza las cifras se
 * marcan como no vigentes.
 */

import type { Hallazgo, PanelDestino } from '../hallazgos';
import { IconoFuentes } from './icons';

export interface PropsHallazgos {
  hallazgos: Hallazgo[];
  omitidos: string[];
  invitacion: string | null;
  avisoVigencia: string | null;
  actualizando: boolean;
  onVerEnGrafico: (panel: PanelDestino) => void;
  onAbrirFuentes: () => void;
  /** `ficha` = párrafos dentro de la cuadrícula descriptiva. */
  variante?: 'ficha' | 'panel';
}

const ETIQUETA_PANEL: Record<PanelDestino, string> = {
  ranking: 'Ver en el ranking',
  evolucion: 'Ver en la evolución',
  dispersion: 'Ver en el mapa',
  tabla: 'Ver en la tabla',
};

export function Hallazgos({
  hallazgos,
  omitidos,
  invitacion,
  avisoVigencia,
  actualizando,
  onVerEnGrafico,
  onAbrirFuentes,
  variante = 'panel',
}: PropsHallazgos) {
  const base = `bm-hallazgos bm-hallazgos--${variante}${avisoVigencia ? ' is-stale' : ''}${
    actualizando ? ' is-updating' : ''
  }`;

  /* Variante de ficha: párrafos corridos, con cifra, conclusión y contexto. */
  if (variante === 'ficha') {
    return (
      <section
        className={base}
        aria-label="Hallazgos del análisis"
        aria-busy={avisoVigencia ? true : undefined}
        data-testid="hallazgos"
        data-vigente={avisoVigencia ? 'false' : 'true'}
      >
        {avisoVigencia ? (
          <p className="bm-hallazgo-aviso" role="status" data-testid="hallazgos-aviso">
            {avisoVigencia}
          </p>
        ) : null}

        {hallazgos.map((hallazgo) => (
          <p key={hallazgo.id} className="bm-hallazgo-parrafo" data-testid={`hallazgo-${hallazgo.id}`}>
            <strong title={hallazgo.definicion}>{hallazgo.cifra}</strong>
            {hallazgo.cifraNota ? ` (${hallazgo.cifraNota})` : ''}. {hallazgo.conclusion}{' '}
            <span title={hallazgo.definicion}>({hallazgo.alcance}).</span>
          </p>
        ))}

        {invitacion ? (
          <p className="bm-hallazgo-parrafo bm-hallazgo-invitacion" data-testid="hallazgos-invitacion">
            {invitacion}
          </p>
        ) : null}

        {omitidos.length > 0 ? (
          <ul className="bm-hallazgos-omitidos" data-testid="hallazgos-omitidos">
            {omitidos.map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className={base}
      aria-labelledby="bm-t-hallazgos"
      aria-busy={avisoVigencia ? true : undefined}
      data-testid="hallazgos"
      data-vigente={avisoVigencia ? 'false' : 'true'}
    >
      <div className="bm-hallazgos-head">
        <h3 id="bm-t-hallazgos">Hallazgos del análisis</h3>
        <button type="button" className="bm-link bm-hallazgos-fuente" onClick={onAbrirFuentes}>
          <IconoFuentes tamano={14} />
          Fuente y definiciones
        </button>
      </div>

      {avisoVigencia ? (
        <p className="bm-hallazgos-aviso" role="status" data-testid="hallazgos-aviso">
          {avisoVigencia}
        </p>
      ) : null}

      {hallazgos.length > 0 ? (
        <ul className="bm-hallazgos-grid" data-n={hallazgos.length}>
          {hallazgos.map((hallazgo) => (
            <li key={hallazgo.id} className="bm-hallazgo" data-testid={`hallazgo-${hallazgo.id}`}>
              <div className="bm-hallazgo-top">
                <span className={`bm-hallazgo-ambito is-${hallazgo.ambito}`}>
                  {hallazgo.ambito === 'sistema' ? 'Sector' : 'Selección'}
                </span>
                <p className="bm-hallazgo-titulo">{hallazgo.titulo}</p>
                <p className="bm-hallazgo-cifra" title={hallazgo.definicion}>
                  {hallazgo.cifra}
                  {hallazgo.cifraNota ? <span>{hallazgo.cifraNota}</span> : null}
                </p>
              </div>
              <p className="bm-hallazgo-texto">{hallazgo.conclusion}</p>
              <p className="bm-hallazgo-alcance" title={hallazgo.definicion}>
                {hallazgo.alcance}
              </p>
              <div className="bm-hallazgo-acciones">
                <button
                  type="button"
                  className="bm-link"
                  onClick={() => onVerEnGrafico(hallazgo.panel)}
                  aria-label={`${ETIQUETA_PANEL[hallazgo.panel]}: ${hallazgo.titulo}`}
                >
                  {ETIQUETA_PANEL[hallazgo.panel]}
                </button>
                {hallazgo.detalle && hallazgo.detalle.length > 1 ? (
                  <details className="bm-hallazgo-detalle">
                    <summary>Detalle</summary>
                    <ul>
                      {hallazgo.detalle.map((fila) => (
                        <li key={fila.etiqueta}>
                          <span>{fila.etiqueta}</span>
                          <span className="bm-num">{fila.valor}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {invitacion ? (
        <p className="bm-hallazgos-invitacion" data-testid="hallazgos-invitacion">
          {invitacion}
        </p>
      ) : null}

      {omitidos.length > 0 ? (
        <ul className="bm-hallazgos-omitidos" data-testid="hallazgos-omitidos">
          {omitidos.map((texto) => (
            <li key={texto}>{texto}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

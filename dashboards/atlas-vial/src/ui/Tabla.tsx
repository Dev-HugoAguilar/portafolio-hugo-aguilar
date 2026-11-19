/**
 * Tabla de hechos y exportación.
 *
 * Columnas: folio, fecha y hora, alcaldía, tipo de evento, ubicación disponible
 * y personas. Se puede ordenar y paginar; al elegir una fila, el hecho se marca
 * en el mapa y se abre su detalle en el panel contextual.
 *
 * No hay datos personales: el conjunto publicado no incluye nombre, documento ni
 * ningún identificador de las personas involucradas.
 */

import type { Tabla as DatosTabla } from '../api/tipos';
import { etiquetaFecha, etiquetaHora, numero } from '../dominio';
import { IconoDescarga, IconoFlecha } from './iconos';

export interface PropsTabla {
  datos: DatosTabla | null;
  folioSeleccionado: string | null;
  orden: string;
  sentido: 'asc' | 'desc';
  loading: boolean;
  onOrden: (orden: string) => void;
  onPagina: (pagina: number) => void;
  onFolio: (folio: string) => void;
  onExportar: () => void;
}

const COLUMNAS: { clave: string; etiqueta: string; ordenable: boolean; numerica?: boolean }[] = [
  { clave: 'folio', etiqueta: 'Folio', ordenable: true },
  { clave: 'fecha', etiqueta: 'Fecha y hora', ordenable: true },
  { clave: 'alcaldia', etiqueta: 'Alcaldía', ordenable: true },
  { clave: 'tipo_evento', etiqueta: 'Tipo de evento', ordenable: true },
  { clave: 'ubicacion', etiqueta: 'Ubicación disponible', ordenable: false },
  { clave: 'lesionadas', etiqueta: 'Personas lesionadas', ordenable: true, numerica: true },
  { clave: 'fallecidas', etiqueta: 'Personas fallecidas', ordenable: true, numerica: true },
];

export function Tabla({
  datos,
  folioSeleccionado,
  orden,
  sentido,
  loading,
  onOrden,
  onPagina,
  onFolio,
  onExportar,
}: PropsTabla) {
  const paginas = datos?.paginas ?? 1;
  const pagina = datos?.pagina ?? 1;
  const total = datos?.total ?? 0;

  return (
    <section className="at-panel at-panel--tabla" aria-labelledby="at-t-tabla" data-testid="panel-tabla">
      <div className="at-panel-head">
        <div>
          <h3 id="at-t-tabla">Hechos registrados</h3>
          <p className="at-panel-sub">
            {numero(total)} hechos con los filtros vigentes · elige una fila para ubicarla en el
            mapa
          </p>
        </div>
        <button type="button" className="at-btn at-btn--ghost" onClick={onExportar}>
          <IconoDescarga />
          <span>Exportar CSV filtrado</span>
        </button>
      </div>

      <div className="at-tabla-caja">
        <table className="at-tabla">
          <caption className="at-sr">
            Hechos de tránsito del conjunto filtrado, con folio, fecha, alcaldía, tipo de evento,
            ubicación y personas lesionadas y fallecidas.
          </caption>
          <thead>
            <tr>
              {COLUMNAS.map((columna) => {
                const activa = orden === columna.clave;
                return (
                  <th
                    key={columna.clave}
                    scope="col"
                    className={columna.numerica ? 'at-num' : undefined}
                    aria-sort={activa ? (sentido === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {columna.ordenable ? (
                      <button
                        type="button"
                        className={`at-orden${activa ? ' is-activa' : ''}`}
                        onClick={() => onOrden(columna.clave)}
                      >
                        {columna.etiqueta}
                        <span aria-hidden="true" className="at-orden-flecha">
                          {activa ? (sentido === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    ) : (
                      columna.etiqueta
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {(datos?.filas ?? []).map((fila) => {
              const activa = fila.folio === folioSeleccionado;
              return (
                <tr
                  key={fila.folio}
                  className={activa ? 'is-activa' : undefined}
                  onClick={() => onFolio(fila.folio)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Ver el hecho ${fila.folio} en el mapa`}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault();
                      onFolio(fila.folio);
                    }
                  }}
                >
                  <td className="at-mono">{fila.folio}</td>
                  <td>
                    {etiquetaFecha(fila.fecha)} · {etiquetaHora(fila.hora)}
                  </td>
                  <td>{fila.alcaldia ?? 'Sin dato'}</td>
                  <td>{fila.tipo_evento ?? 'Sin dato'}</td>
                  <td className="at-ubicacion">{fila.ubicacion}</td>
                  <td className="at-num">{numero(fila.lesionadas)}</td>
                  <td className="at-num">{numero(fila.fallecidas)}</td>
                </tr>
              );
            })}
            {!loading && (datos?.filas.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={COLUMNAS.length} className="at-tabla-vacia">
                  No hay hechos que cumplan los filtros actuales. Prueba a quitar alguno.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="at-paginacion">
        <p className="at-paginacion-info">
          {loading
            ? 'Consultando…'
            : `Página ${numero(pagina)} de ${numero(paginas)} · ${numero(total)} hechos`}
        </p>
        <div className="at-paginacion-botones">
          <button type="button" className="at-btn at-btn--mini" onClick={() => onPagina(1)} disabled={pagina <= 1}>
            Primera
          </button>
          <button
            type="button"
            className="at-btn at-btn--mini"
            onClick={() => onPagina(Math.max(1, pagina - 1))}
            disabled={pagina <= 1}
          >
            <IconoFlecha tamano={12} />
            <span>Anterior</span>
          </button>
          <button
            type="button"
            className="at-btn at-btn--mini"
            onClick={() => onPagina(Math.min(paginas, pagina + 1))}
            disabled={pagina >= paginas}
          >
            <span>Siguiente</span>
            <IconoFlecha tamano={12} />
          </button>
          <button
            type="button"
            className="at-btn at-btn--mini"
            onClick={() => onPagina(paginas)}
            disabled={pagina >= paginas}
          >
            Última
          </button>
        </div>
      </div>
    </section>
  );
}

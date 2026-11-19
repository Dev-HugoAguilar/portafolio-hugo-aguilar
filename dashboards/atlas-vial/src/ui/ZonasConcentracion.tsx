/**
 * Zonas con mayor concentración (etapa 1).
 *
 * Lista las diez celdas con más hechos del conjunto filtrado sobre la **malla
 * métrica estable** de 500 m (EPSG:32614) que entrega `/celdas`. El denominador
 * es explícito: hechos ubicables del conjunto filtrado (`coord_estado = ok`), y
 * los excluidos por ubicación se informan aparte para poder reconciliar con el
 * total del tablero.
 *
 * Esta etapa no incluye curva acumulada, miniaturas, selección de celda ni
 * interacciones con el mapa: la lista es informativa y no añade controles que
 * todavía no funcionen.
 */

import type { Celdas } from '../api/tipos';
import { numero } from '../dominio';

export function ZonasConcentracion({
  datos,
  cargando,
  error,
  onReintentar,
}: {
  datos: Celdas | null;
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
}) {
  const malla = datos?.malla;
  const mayores = datos?.mayores ?? [];
  const maximo = Math.max(1, ...mayores.map((celda) => celda.hechos));
  const excluidos = datos
    ? Object.values(datos.excluidos).reduce((suma, valor) => suma + valor, 0)
    : 0;

  return (
    <section
      className="at-zonas"
      aria-labelledby="at-zonas-titulo"
      data-testid="zonas-concentracion"
    >
      <header className="at-zonas-cab">
        <h3 className="at-zonas-titulo" id="at-zonas-titulo">
          Zonas con mayor concentración
        </h3>
        <p className="at-zonas-descripcion">
          {malla
            ? `Celdas de ${malla.resolucion_m} m (${malla.superficie_km2.toLocaleString('es-MX')} km²) en ${malla.proyeccion}; porcentaje sobre los hechos con ubicación válida del conjunto filtrado.`
            : 'Celdas de 500 m sobre una malla métrica fija; porcentaje sobre los hechos con ubicación válida.'}
        </p>
      </header>

      {error ? (
        <div className="at-zonas-estado" role="alert">
          <p>No se pudo calcular la concentración por celda.</p>
          <button type="button" className="at-btn at-btn--ghost" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      ) : !datos && cargando ? (
        <div className="at-zonas-estado" role="status" aria-live="polite">
          <p>Calculando la concentración por celda…</p>
          <ul className="at-zonas-esqueleto" aria-hidden="true">
            {Array.from({ length: 6 }, (_, indice) => (
              <li key={indice} />
            ))}
          </ul>
        </div>
      ) : !datos || datos.ubicables === 0 ? (
        <div className="at-zonas-estado" role="status">
          <p>
            {datos && datos.total > 0
              ? 'Ningún hecho del conjunto filtrado tiene una ubicación válida, así que no hay celdas que comparar.'
              : 'Sin hechos con los filtros actuales.'}
          </p>
          {datos && excluidos > 0 ? (
            <p className="at-zonas-nota">
              {numero(excluidos)} de {numero(datos.total)} hechos quedan fuera de la malla por falta
              de coordenada utilizable.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <ol className="at-zonas-lista" data-testid="zonas-lista">
            {mayores.map((celda, indice) => (
              <li className="at-zonas-fila" key={celda.id}>
                <span className="at-zonas-puesto" aria-hidden="true">
                  {indice + 1}
                </span>
                <span className="at-zonas-id">
                  <span className="at-zonas-id-texto">{celda.id}</span>
                  <span className="at-zonas-barra" aria-hidden="true">
                    <span
                      className="at-zonas-barra-relleno"
                      style={{ width: `${Math.max(2, (100 * celda.hechos) / maximo)}%` }}
                    />
                  </span>
                </span>
                <span className="at-zonas-cifra">{numero(celda.hechos)}</span>
                <span className="at-zonas-pct">
                  {celda.porcentaje.toLocaleString('es-MX', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </span>
              </li>
            ))}
          </ol>

          <p className="at-zonas-pie">
            {numero(datos?.celdas_con_registros ?? 0)} celdas con registros ·{' '}
            {numero(datos?.ubicables ?? 0)} hechos ubicables
            {excluidos > 0
              ? ` · ${numero(excluidos)} sin ubicación utilizable (fuera de la malla)`
              : ''}
            {' · '}total del conjunto: {numero(datos?.total ?? 0)}
          </p>
        </>
      )}
    </section>
  );
}

/**
 * Panorama territorial: los tres estados con sus tiendas, unidades y participación.
 *
 * El denominador de la participación es **el total del contexto territorial** con los
 * filtros comerciales y el periodo vigentes, y se escribe en la cabecera del bloque.
 * Las tarjetas no son una colección de indicadores: cada una resume su estado y es
 * el control que filtra sus tiendas.
 */

import type { Panorama } from '../api';

const numero = (valor: number) => valor.toLocaleString('es-MX');
const numero1 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function TarjetasEstado({
  panorama,
  estadoActivo,
  onElegir,
}: {
  panorama: Panorama;
  estadoActivo: string | null;
  onElegir: (estado: string | null) => void;
}) {
  return (
    <section className="ac-panel ac-panorama" aria-labelledby="ac-t-panorama">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-panorama">Panorama territorial</h3>
          <p className="ac-panel-sub">
            {numero(panorama.estados_incluidos)} de {numero(panorama.estados_catalogo)} estados ·
            participación sobre el total del contexto territorial ({numero(panorama.total_unidades)} u)
            {' · '}
            filtros comerciales y periodo aplicados
          </p>
        </div>
        {estadoActivo ? (
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            onClick={() => onElegir(null)}
          >
            Ver todos los estados
          </button>
        ) : null}
      </header>

      <ul className="ac-tarjetas">
        {panorama.estados.map((estado) => {
          const activo = estadoActivo === estado.estado;
          return (
            <li key={estado.estado}>
              <button
                type="button"
                className={`ac-tarjeta${activo ? ' is-activo' : ''}`}
                aria-pressed={activo}
                onClick={() => onElegir(activo ? null : estado.estado)}
                data-testid={`estado-${estado.estado}`}
              >
                <span className="ac-tarjeta-cab">
                  <span className="ac-tarjeta-nombre">{estado.nombre}</span>
                  <span className="ac-tarjeta-codigo">{estado.estado}</span>
                </span>
                <span className="ac-tarjeta-unidades">{numero(estado.unidades)}</span>
                <span className="ac-tarjeta-pie">
                  <span>{estado.participacion_pct === null ? '—' : `${numero1(estado.participacion_pct)} %`} del total</span>
                  <span>
                    {estado.tiendas_incluidas}{' '}
                    {estado.tiendas_incluidas === 1 ? 'tienda' : 'tiendas'}
                  </span>
                </span>
                <span className="ac-tarjeta-barra" aria-hidden="true">
                  <span style={{ width: `${Math.max(1, Math.min(100, estado.participacion_pct ?? 0))}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Barra de contexto activo: los cuatro filtros compatibles que se conservan al cambiar de
 * pantalla (estado, tienda, categoría, departamento) más el artículo cuando el
 * departamento está abierto.
 *
 * Es la única fuente de esos filtros: cualquier pantalla los lee del mismo estado y los
 * escribe con los mismos resolutores, así que un cambio aquí se refleja en las seis
 * pantallas y en la URL. Los valores imposibles no se ofrecen: si una tienda no pertenece
 * al estado elegido no aparece, y si un departamento no pertenece a la categoría tampoco.
 */

import type { ReactNode } from 'react';

export interface OpcionContexto {
  valor: string;
  texto: string;
}

export function BarraContexto({
  estados,
  tiendas,
  categorias,
  departamentos,
  articulos,
  estado,
  tienda,
  categoria,
  departamento,
  articulo,
  busqueda,
  onBusqueda,
  onEstado,
  onTienda,
  onCategoria,
  onDepartamento,
  onArticulo,
  resumen,
  aviso,
  testid = 'contexto-activo',
}: {
  estados: OpcionContexto[];
  tiendas: OpcionContexto[];
  categorias: OpcionContexto[];
  departamentos: OpcionContexto[];
  articulos?: OpcionContexto[];
  estado: string | null;
  tienda: string | null;
  categoria: string | null;
  departamento: string | null;
  articulo?: string | null;
  /** Búsqueda de artículo de la pantalla activa (opcional). */
  busqueda?: string | null;
  onBusqueda?: (valor: string) => void;
  onEstado: (valor: string | null) => void;
  onTienda: (valor: string | null) => void;
  onCategoria: (valor: string | null) => void;
  onDepartamento: (valor: string | null) => void;
  onArticulo?: (valor: string | null) => void;
  resumen: ReactNode;
  aviso?: string | null;
  testid?: string;
}) {
  return (
    <section className="ac-contexto" aria-label="Contexto activo del análisis" data-testid={testid}>
      <div className="ac-contexto-fila">
        <label className="ac-campo">
          <span>Estado</span>
          <select value={estado ?? ''} onChange={(evento) => onEstado(evento.target.value || null)}>
            {estados.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.texto}
              </option>
            ))}
          </select>
        </label>
        <label className="ac-campo">
          <span>Tienda</span>
          <select value={tienda ?? ''} onChange={(evento) => onTienda(evento.target.value || null)}>
            {tiendas.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.texto}
              </option>
            ))}
          </select>
        </label>
        <label className="ac-campo">
          <span>Categoría</span>
          <select
            value={categoria ?? ''}
            onChange={(evento) => onCategoria(evento.target.value || null)}
          >
            {categorias.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.texto}
              </option>
            ))}
          </select>
        </label>
        <label className="ac-campo">
          <span>Departamento</span>
          <select
            value={departamento ?? ''}
            onChange={(evento) => onDepartamento(evento.target.value || null)}
            disabled={departamentos.length <= 1}
          >
            {departamentos.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.texto}
              </option>
            ))}
          </select>
        </label>
        {onBusqueda ? (
          <label className="ac-campo ac-contexto-busqueda">
            <span>Buscar artículo</span>
            <input
              type="search"
              value={busqueda ?? ''}
              placeholder="Código o etiqueta"
              onChange={(evento) => onBusqueda(evento.target.value)}
              data-testid="contexto-busqueda"
            />
          </label>
        ) : null}
        {articulos && articulos.length > 1 && onArticulo ? (
          <label className="ac-campo">
            <span>Artículo</span>
            <select
              value={articulo ?? ''}
              onChange={(evento) => onArticulo(evento.target.value || null)}
            >
              {articulos.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.texto}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="ac-contexto-resumen">{resumen}</p>
      </div>
      {aviso ? (
        <p className="ac-aviso-inline" role="status" data-testid="aviso-contexto">
          {aviso}
        </p>
      ) : null}
    </section>
  );
}

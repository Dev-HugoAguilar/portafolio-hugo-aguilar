/**
 * «Productos y compra»: un solo bloque con dos vistas conmutables.
 *
 *  · **Afinidad de categorías**: diagrama de cuerdas de compras conjuntas.
 *  · **Tabla**: detalle por categoría con las medidas de línea.
 *
 * Hay un único encabezado y un único selector: se renderiza **solo** la vista
 * elegida (no se dibujan las dos y se ocultan con CSS). La explicación de compras
 * solapadas y la alternativa tabular acompañan a ambas.
 */

import { useState } from 'react';

import type { CategoriaProducto, Productos } from '../api/tipos';
import { dinero, numero } from '../dominio';
import { GraficoCuerdas } from './CuerdasCategorias';

export interface PropsProductosCompra {
  productos: Productos | null;
  categorias?: CategoriaProducto[] | null;
  vacio: boolean;
  cargando: boolean;
}

type Vista = 'afinidad' | 'tabla';

export function ProductosCompra({ productos, categorias, vacio, cargando }: PropsProductosCompra) {
  const [vista, setVista] = useState<Vista>('afinidad');
  const filas = categorias ?? [];

  return (
    <section className="mk-panel" aria-labelledby="mk-t-productos" data-testid="panel-productos">
      <div className="mk-panel-head">
        <div>
          <h3 id="mk-t-productos">Productos y compra</h3>
          <p className="mk-panel-sub">
            Una compra con artículos de dos categorías cuenta en las dos: la suma por categoría
            puede superar las compras totales · el importe es de la línea, nunca el de la compra
            repartida · cada compra se atribuye a la fecha y dimensiones de su primera línea
          </p>
        </div>
        <div className="mk-panel-controls">
          <div className="mk-segmentado" role="group" aria-label="Vista de productos">
            <button
              type="button"
              className={`mk-seg${vista === 'afinidad' ? ' is-activa' : ''}`}
              onClick={() => setVista('afinidad')}
              aria-pressed={vista === 'afinidad'}
            >
              Afinidad de categorías
            </button>
            <button
              type="button"
              className={`mk-seg${vista === 'tabla' ? ' is-activa' : ''}`}
              onClick={() => setVista('tabla')}
              aria-pressed={vista === 'tabla'}
            >
              Tabla
            </button>
          </div>
        </div>
      </div>

      {vista === 'afinidad' ? (
        <GraficoCuerdas datos={productos?.afinidad ?? null} vacio={vacio} cargando={cargando} />
      ) : (
        <>
          {filas.length === 0 ? (
            <p className="mk-vacio">
              {vacio
                ? 'Sin datos publicados todavía.'
                : 'La fuente no expone categorías de producto para estos filtros.'}
            </p>
          ) : (
            <div className="mk-tabla-caja">
              <table className="mk-tabla">
                <caption className="mk-sr">
                  Detalle por categoría: compras que la contienen, artículos, unidades e importe de
                  línea. Cada compra se atribuye a la fecha y dimensiones de su primera línea, de
                  modo que no se cuenta dos veces al filtrar.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Categoría</th>
                    <th scope="col" className="mk-num">Compras (solapadas)</th>
                    <th scope="col" className="mk-num">Artículos</th>
                    <th scope="col" className="mk-num">Unidades</th>
                    <th scope="col" className="mk-num">Ingreso de línea</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.categoria}>
                      <td>{fila.categoria}</td>
                      <td className="mk-num">{numero(fila.compras)}</td>
                      <td className="mk-num">{numero(fila.articulos)}</td>
                      <td className="mk-num">{numero(fila.unidades)}</td>
                      <td className="mk-num">
                        {fila.ingresos_linea_usd === null || fila.ingresos_linea_usd === undefined
                          ? 'No disponible'
                          : dinero(fila.ingresos_linea_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {productos?.conciliacion ? (
            <p className="mk-nota">
              {numero(productos.conciliacion.compras_totales)} compras en el rango ·{' '}
              {numero(productos.conciliacion.suma_compras_por_categoria)} sumadas por categoría ·{' '}
              {numero(productos.conciliacion.solapamiento)} de diferencia por compras que contienen
              varias categorías.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

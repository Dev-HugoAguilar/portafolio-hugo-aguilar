/**
 * Composición comercial: barras horizontales de las tres categorías y sus departamentos.
 *
 * Dos denominadores distintos y rotulados por separado:
 *
 * - categoría: participación en el total del contexto territorial (todas las categorías);
 * - departamento: participación dentro de **su** categoría.
 *
 * Es el selector del catálogo, así que muestra el catálogo completo del territorio
 * aunque haya una categoría o un departamento elegidos; la fila activa se marca.
 */

import { useMemo, useState } from 'react';

import type { ComparacionTiendaCategoriaRespuesta, Composicion, FilaComparacionTiendaCategoria } from '../api';
import {
  etiquetaCategoria,
  etiquetaDepartamento,
  etiquetaDepartamentoCorta,
  etiquetaTienda,
} from '../etiquetas';
import { Segmentado } from './Segmentado';

const numero = (valor: number) => valor.toLocaleString('es-MX');
const numero1 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function ComposicionComercial({
  composicion,
  comparacion,
  contexto,
  periodo,
  categoriaActiva,
  departamentoActivo,
  onCategoria,
  onDepartamento,
  onAbrirCombinacion,
}: {
  composicion: Composicion;
  comparacion?: ComparacionTiendaCategoriaRespuesta | null;
  contexto?: string;
  periodo?: { desde: string; hasta: string } | null;
  categoriaActiva: string | null;
  departamentoActivo: string | null;
  onCategoria: (categoria: string | null) => void;
  onDepartamento: (departamento: string | null) => void;
  onAbrirCombinacion?: (fila: FilaComparacionTiendaCategoria) => void;
}) {
  const [modo, setModo] = useState<'total' | 'tienda'>('total');

  /* Matriz tienda × categoría del periodo principal: se construye con las mismas filas
     reales de la comparación (unidades del periodo completo), nunca repartiendo el
     total estatal ni multiplicando marginales. */
  const matriz = useMemo(() => {
    const filas = comparacion?.filas ?? [];
    if (filas.length === 0) return null;
    const tiendas = [...new Set(filas.map((fila) => fila.store_id))].sort();
    const categorias = [...new Set(filas.map((fila) => fila.cat_id))].sort();
    const celda = new Map<string, FilaComparacionTiendaCategoria>();
    for (const fila of filas) celda.set(`${fila.store_id}|${fila.cat_id}`, fila);
    const totalPorCategoria = new Map<string, number>();
    const totalPorTienda = new Map<string, number>();
    let total = 0;
    for (const fila of filas) {
      totalPorCategoria.set(
        fila.cat_id,
        (totalPorCategoria.get(fila.cat_id) ?? 0) + fila.unidades_periodo,
      );
      totalPorTienda.set(
        fila.store_id,
        (totalPorTienda.get(fila.store_id) ?? 0) + fila.unidades_periodo,
      );
      total += fila.unidades_periodo;
    }
    return { tiendas, categorias, celda, totalPorCategoria, totalPorTienda, total };
  }, [comparacion]);
  const porCategoria = new Map<string, typeof composicion.departamentos>();
  for (const fila of composicion.departamentos) {
    const clave = fila.categoria ?? '—';
    porCategoria.set(clave, [...(porCategoria.get(clave) ?? []), fila]);
  }

  return (
    <section className="ac-panel ac-composicion" aria-labelledby="ac-t-composicion">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-composicion">Composición por categoría y departamento</h3>
          <p className="ac-panel-sub">
            {numero(composicion.total_unidades)} u en el contexto · categorías: participación{' '}
            <strong>sobre el total del contexto</strong> · departamentos: participación{' '}
            <strong>dentro de su categoría</strong>
          </p>
        </div>
        <div className="ac-comp-controles">
          <Segmentado<'total' | 'tienda'>
            etiqueta="Ámbito de la composición"
            valor={modo}
            onElegir={setModo}
            testid="selector-composicion"
            opciones={[
              { valor: 'total', texto: 'Total del contexto' },
              { valor: 'tienda', texto: 'Por tienda' },
            ]}
          />
          {categoriaActiva || departamentoActivo ? (
            <button
              type="button"
              className="ac-accion ac-accion--secundaria"
              onClick={() => {
                onDepartamento(null);
                onCategoria(null);
              }}
            >
              Ver todas las categorías
            </button>
          ) : null}
        </div>
      </header>

      {modo === 'tienda' ? (
        <div className="ac-comp-matriz-marco">
          {matriz ? (
            <>
              <p className="ac-panel-sub ac-comp-matriz-nota">
                Unidades del periodo principal{' '}
                {periodo ? `(${periodo.desde} – ${periodo.hasta})` : ''} por tienda y categoría
                {contexto ? ` · ${contexto}` : ''}. Cada celda abre el detalle de esa tienda ×
                categoría; los totales de fila y columna cierran con el total del contexto.
              </p>
              <table className="ac-tabla ac-comp-matriz">
                <caption>
                  Matriz tienda × categoría · unidades del periodo principal (no del A/B)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Tienda</th>
                    {matriz.categorias.map((categoria) => (
                      <th key={categoria} scope="col" className="ac-tabla-num">
                        {etiquetaCategoria(categoria)}
                      </th>
                    ))}
                    <th scope="col" className="ac-tabla-num">
                      Total de la tienda
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matriz.tiendas.map((tienda) => (
                    <tr key={tienda}>
                      <th scope="row" className="ac-tabla-id">
                        {tienda}
                      </th>
                      {matriz.categorias.map((categoria) => {
                        const fila = matriz.celda.get(`${tienda}|${categoria}`);
                        return (
                          <td key={categoria} className="ac-tabla-num">
                            {fila ? (
                              <button
                                type="button"
                                className="ac-comp-celda"
                                onClick={() => onAbrirCombinacion?.(fila)}
                                title={`Abrir ${etiquetaTienda(tienda)} (${tienda}) · ${etiquetaCategoria(
                                  categoria,
                                )}: ${numero(fila.unidades_periodo)} u del periodo (${fila.dias_validos_periodo}/${fila.dias_esperados_periodo} días observados)`}
                              >
                                {numero(fila.unidades_periodo)}
                              </button>
                            ) : (
                              <span className="ac-comp-sin-dato" title="La combinación no existe">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="ac-tabla-num">
                        <strong>{numero(matriz.totalPorTienda.get(tienda) ?? 0)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total del contexto</th>
                    {matriz.categorias.map((categoria) => (
                      <td key={categoria} className="ac-tabla-num">
                        <strong>{numero(matriz.totalPorCategoria.get(categoria) ?? 0)}</strong>
                      </td>
                    ))}
                    <td className="ac-tabla-num">
                      <strong>{numero(matriz.total)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </>
          ) : (
            <p className="ac-vacio">Calculando la matriz por tienda…</p>
          )}
        </div>
      ) : null}

      {modo === 'total' ? (
      <div className="ac-composicion-lista">
        {composicion.categorias.map((categoria) => {
          const activaCategoria = categoriaActiva === categoria.codigo;
          const departamentos = porCategoria.get(categoria.codigo) ?? [];
          return (
            <div
              className={`ac-comp-grupo${activaCategoria ? ' is-activo' : ''}`}
              key={categoria.codigo}
            >
              <button
                type="button"
                className={`ac-comp-fila ac-comp-fila--categoria${activaCategoria ? ' is-activo' : ''}`}
                aria-pressed={activaCategoria}
                onClick={() => onCategoria(activaCategoria ? null : categoria.codigo)}
                data-testid={`categoria-${categoria.codigo}`}
              >
                <span className="ac-comp-nombre">
                  {etiquetaCategoria(categoria.codigo)}
                  <span className="ac-comp-codigo">{categoria.codigo}</span>
                </span>
                <span className="ac-comp-barra" aria-hidden="true">
                  <span style={{ width: `${Math.max(1, Math.min(100, categoria.participacion_pct ?? 0))}%` }} />
                </span>
                <span className="ac-comp-unidades">{numero(categoria.unidades)}</span>
                <span className="ac-comp-pct">
                  {categoria.participacion_pct === null ? '—' : `${numero1(categoria.participacion_pct)} %`}
                </span>
              </button>

              <ul className="ac-comp-departamentos">
                {departamentos.map((departamento) => {
                  const activo = departamentoActivo === departamento.codigo;
                  return (
                    <li key={departamento.codigo}>
                      <button
                        type="button"
                        className={`ac-comp-fila ac-comp-fila--departamento${activo ? ' is-activo' : ''}`}
                        aria-pressed={activo}
                        onClick={() => onDepartamento(activo ? null : departamento.codigo)}
                        data-testid={`departamento-${departamento.codigo}`}
                        title={departamento.denominador}
                      >
                        <span
                          className="ac-comp-nombre ac-comp-nombre--dept"
                          title={`${etiquetaDepartamento(departamento.codigo)} (${departamento.codigo})`}
                        >
                          {etiquetaDepartamentoCorta(departamento.codigo)}
                          <span className="ac-comp-codigo">{departamento.codigo}</span>
                        </span>
                        <span className="ac-comp-barra ac-comp-barra--dept" aria-hidden="true">
                          <span
                            style={{
                              width: `${Math.max(1, Math.min(100, departamento.participacion_pct ?? 0))}%`,
                            }}
                          />
                        </span>
                        <span className="ac-comp-unidades">{numero(departamento.unidades)}</span>
                        <span className="ac-comp-pct">
                          {departamento.participacion_pct === null
                            ? '—'
                            : `${numero1(departamento.participacion_pct)} %`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      ) : null}

      <p className="ac-comp-leyenda">
        <span>
          <strong>%</strong> de cada categoría: unidades ÷ total del contexto territorial.
        </span>
        <span>
          <strong>%</strong> de cada departamento: unidades ÷ total de su categoría en el contexto.
        </span>
        <span>Selecciona una categoría para filtrar sus departamentos; un departamento abre sus productos.</span>
        {modo === 'tienda' ? (
          <span>
            La matriz «Por tienda» usa el periodo principal; la comparación A/B usa sus propios
            intervalos y no se mezcla con esta tabla.
          </span>
        ) : null}
      </p>
    </section>
  );
}

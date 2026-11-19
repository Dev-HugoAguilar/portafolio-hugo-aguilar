/**
 * Tabla de detalle con TanStack Table.
 *
 *  - Los **filtros** son del servidor (periodo, concepto, instituciones); el
 *    conjunto filtrado llega en una sola consulta (≤ 200 filas) y TanStack Table
 *    se encarga de la ordenación y de la paginación de forma coherente con la
 *    API.
 *  - La selección está conectada con los gráficos: clic en una fila alterna el
 *    banco; el hover resalta.
 *  - La procedencia (archivo y fila del boletín) y los campos técnicos viven en
 *    una fila desplegable, no en una segunda tabla.
 */

import {
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,

  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy';
import { useMemo, useState } from 'react';

import type { Concepto, Detalle, FilaInstitucion, Indicadores, Resumen } from '../api/types';
import {
  COLOR,
  etiquetaConcepto,
  etiquetaSeccion,
  porcentaje,
  valorKpi,
} from '../domain';

export interface PropsTabla {
  detalle: Detalle | null;
  resumen: Resumen | null;
  indicadores: Indicadores | null;
  seleccion: string[];
  resaltado: string | null;
  colores: Map<string, string>;
  patrones: Map<string, string | null>;
  /** Concepto activo: da nombre y unidad a la columna de importe. */
  concepto: Concepto | null;
  grupos?: never;
  onHover: (institucionId: string | null) => void;
  onAlternar: (institucionId: string) => void;
  actualizando: boolean;
}

export interface FilaTabla {
  institucion_id: string;
  institucion: string;
  valor: number;
  participacion: number | null;
  variacion: number | null;
  roa: number | null;
  roe: number | null;
  archivo: string;
  filaOrigen: number;
  concepto: string;
  conceptoId: string;
  seccion: string;
  unidad: string;
  periodo: string;
  esSistema: boolean;
}

export function DetailTable({
  detalle,
  resumen,
  indicadores,
  seleccion,
  resaltado,
  colores,
  patrones,
  concepto,
  onHover,
  onAlternar,
  actualizando,
}: PropsTabla) {
  const [pagina, setPagina] = useState(0);

  /** ROA y ROE publicados del periodo, por institución (sin agregados). */
  const ratios = useMemo(() => {
    const mapa = new Map<string, { roa: number | null; roe: number | null }>();
    if (!indicadores) return mapa;
    const periodoDetalle = detalle?.items[0]?.periodo ?? resumen?.periodo ?? '';
    for (const indicador of indicadores.indicadores) {
      const clave = indicador.indicador_id.startsWith('roa') ? 'roa' : indicador.indicador_id.startsWith('roe') ? 'roe' : null;
      if (!clave) continue;
      for (const valor of indicador.valores) {
        if (valor.es_sistema || valor.periodo !== periodoDetalle) continue;
        const actual = mapa.get(valor.institucion_id) ?? { roa: null, roe: null };
        actual[clave] = valor.valor;
        mapa.set(valor.institucion_id, actual);
      }
    }
    return mapa;
  }, [indicadores, detalle, resumen]);

  const filas = useMemo<FilaTabla[]>(() => {
    if (!detalle) return [];
    const sistema = resumen?.kpis.valor_sistema ?? null;
    const porInstitucion = new Map(
      (resumen?.por_institucion ?? []).map((fila: FilaInstitucion) => [fila.institucion_id, fila]),
    );
    return detalle.items.map((item) => {
      const referencia = porInstitucion.get(item.institucion_id);
      const ratio = ratios.get(item.institucion_id);
      return {
        institucion_id: item.institucion_id,
        institucion: item.institucion,
        valor: item.valor,
        participacion:
          sistema && sistema !== 0 && !item.es_sistema ? (100 * item.valor) / sistema : null,
        variacion: referencia?.variacion_pct ?? null,
        roa: ratio?.roa ?? null,
        roe: ratio?.roe ?? null,
        archivo: item.archivo,
        filaOrigen: item.fila_origen,
        concepto: item.concepto,
        conceptoId: item.concepto_id,
        seccion: item.seccion,
        unidad: item.unidad,
        periodo: item.periodo,
        esSistema: item.es_sistema,
      };
    });
  }, [detalle, resumen, ratios]);

  /**
   * Columnas con tipo de valor `unknown`: la tabla es heterogénea (texto,
   * importes, porcentajes), así que cada celda estrecha su valor al renderizar.
   */
  /* Encabezado de la columna de importe: nombre del concepto y unidad. */
  const etiquetaConceptoActual = concepto
    ? etiquetaConcepto(concepto, []).principal.split(' ')[0]
    : 'Importe';

  const columnas = useMemo<LegacyColumnDef<FilaTabla, unknown>[]>(
    () => [
      {
        id: 'institucion',
        accessorKey: 'institucion',
        header: 'Institución',
        cell: (info) => {
          const fila = info.row.original;
          const elegido = seleccion.includes(fila.institucion_id);
          const color = colores.get(fila.institucion_id) ?? COLOR.neutro;
          return (
            <span className="bm-cell-inst">
              {/* Indicador explícito de selección: color + marca, no solo color. */}
              <span
                className={`bm-check${elegido ? ' is-on' : ''}`}
                style={elegido ? { background: color, borderColor: color } : undefined}
                aria-hidden="true"
                data-institucion={fila.institucion_id}
                data-color={color}
                title={elegido ? 'En la comparación' : 'Añadir a la comparación'}
              >
                {elegido ? '✓' : ''}
              </span>
              <span
                className="bm-swatch"
                style={{ background: color }}
                aria-hidden="true"
                data-institucion={fila.institucion_id}
                data-color={color}
              />
              <span className="bm-cell-nombre">{fila.institucion}</span>
            </span>
          );
        },
      },
      {
        id: 'valor',
        accessorKey: 'valor',
        header: `${etiquetaConceptoActual} · billones MXN`,
        sortDescFirst: true,
        cell: (info) => {
          const valor = info.getValue() as number;
          const compacto = valorKpi(valor);
          return (
            <span className="bm-num-strong" title={compacto.exacto}>
              {compacto.principal}
            </span>
          );
        },
      },
      {
        id: 'participacion',
        accessorKey: 'participacion',
        header: 'Participación',
        cell: (info) => {
          const valor = info.getValue() as number | null;
          return valor === null ? '—' : `${porcentaje(valor)} %`;
        },
      },

      {
        id: 'roa',
        accessorKey: 'roa',
        header: 'ROA',
        cell: (info) => {
          const valor = info.getValue() as number | null;
          return valor === null ? '—' : `${porcentaje(valor)} %`;
        },
      },
      {
        id: 'roe',
        accessorKey: 'roe',
        header: 'ROE',
        cell: (info) => {
          const valor = info.getValue() as number | null;
          return valor === null ? '—' : `${porcentaje(valor)} %`;
        },
      },

    ],
    [colores, patrones, seleccion, etiquetaConceptoActual],
  );

  const tabla = useLegacyTable<FilaTabla>({
    data: filas,
    columns: columnas,
    state: { pagination: { pageIndex: pagina, pageSize: 10 } },
    onPaginationChange: (actualizador) => {
      const siguiente =
        typeof actualizador === 'function'
          ? actualizador({ pageIndex: pagina, pageSize: 10 })
          : actualizador;
      setPagina(siguiente.pageIndex);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    enableSortingRemoval: false,
    initialState: { sorting: [{ id: 'valor', desc: true }] },
  });

  const total = detalle?.total ?? 0;
  const paginas = tabla.getPageCount();

  return (
    <div className={`bm-table-wrap${actualizando ? ' is-updating' : ''}`} data-testid="tabla-detalle">
      <div className="bm-table-bar">
        <p className="bm-table-info" data-testid="tabla-alcance">
          <strong>{filas.length}</strong> filas
          {seleccion.length > 0 ? ` · solo la selección (${seleccion.length})` : ' · todas las instituciones'}
          {total > filas.length ? ' · conjunto acotado por la API' : ''}
        </p>
        <span className="bm-chart-hint">orden y paginación sobre el conjunto filtrado</span>
      </div>

      <div className="bm-table-scroll">
        <table className="bm-table" aria-label="Detalle por institución">
          <thead>
            {tabla.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id}>
                <th scope="col" className="bm-th-tight">
                  <span className="bm-sr">Detalle</span>
                </th>
                {grupo.headers.map((header) => {
                  const puedeOrdenar = header.column.getCanSort();
                  const orden = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={['valor', 'participacion', 'variacion', 'roa', 'roe'].includes(header.column.id) ? 'bm-num' : undefined}
                      aria-sort={orden === 'asc' ? 'ascending' : orden === 'desc' ? 'descending' : undefined}
                    >
                      {puedeOrdenar ? (
                        <button
                          type="button"
                          className="bm-sort"
                          onClick={header.column.getToggleSortingHandler()}
                          title="Ordenar (servidor: mismas filas; orden sobre el conjunto filtrado)"
                        >
                          {String(header.column.columnDef.header)}
                          <span aria-hidden="true">
                            {orden === 'asc' ? ' ↑' : orden === 'desc' ? ' ↓' : ' ↕'}
                          </span>
                        </button>
                      ) : (
                        String(header.column.columnDef.header)
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tabla.getRowModel().rows.map((row) => {
              const fila = row.original;
              const elegido = seleccion.includes(fila.institucion_id);
              const colorFila = colores.get(fila.institucion_id) ?? COLOR.neutro;
              return (
                <>
                  <tr
                    key={row.id}
                    className={`${elegido ? 'is-selected' : ''}${resaltado === fila.institucion_id ? ' is-hover' : ''}`}
                    /* Fondo tenue derivado del color de la institución. */
                    style={
                      elegido
                        ? { background: `color-mix(in srgb, ${colorFila} 9%, #FFFFFF)` }
                        : undefined
                    }
                    onMouseEnter={() => onHover(fila.institucion_id)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onAlternar(fila.institucion_id)}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter' || evento.key === ' ') {
                        evento.preventDefault();
                        onAlternar(fila.institucion_id);
                      }
                    }}
                    tabIndex={0}
                    aria-pressed={elegido}
                    data-testid={`fila-${fila.institucion_id}`}
                  >
                    <td className="bm-th-tight">
                      <button
                        type="button"
                        className="bm-expand"
                        aria-label={`Ver procedencia de ${fila.institucion}`}
                        aria-expanded={row.getIsExpanded()}
                        onClick={(evento) => {
                          evento.stopPropagation();
                          row.toggleExpanded();
                        }}
                      >
                        {row.getIsExpanded() ? '−' : '+'}
                      </button>
                    </td>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {typeof cell.column.columnDef.cell === 'function'
                          ? (cell.column.columnDef.cell as (contexto: unknown) => React.ReactNode)(cell.getContext())
                          : String(cell.getValue() ?? '')}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() ? (
                    <tr key={`${row.id}-detalle`} className="bm-row-detail">
                      <td colSpan={6}>
                        <dl className="bm-dl bm-dl--inline">
                          <div>
                            <dt>Concepto</dt>
                            <dd>
                              {fila.concepto} <span className="bm-mono">({fila.conceptoId})</span>
                            </dd>
                          </div>
                          <div>
                            <dt>Sección</dt>
                            <dd>{etiquetaSeccion(fila.seccion as 'balance')}</dd>
                          </div>
                          <div>
                            <dt>Procedencia</dt>
                            <dd>
                              {fila.archivo} · fila {fila.filaOrigen}
                            </dd>
                          </div>
                          <div>
                            <dt>Periodo / unidad</dt>
                            <dd>
                              {fila.periodo} · {fila.unidad}
                            </dd>
                          </div>
                        </dl>
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}
            {filas.length === 0 ? (
              <tr>
                <td colSpan={6} className="bm-empty">
                  Ningún registro coincide con los filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="bm-pager">
        <button
          type="button"
          className="bm-btn bm-btn--ghost"
          onClick={() => tabla.previousPage()}
          disabled={!tabla.getCanPreviousPage()}
        >
          Anterior
        </button>
        <span className="bm-pager-info" data-testid="tabla-pagina">
          Página {paginas === 0 ? 0 : pagina + 1} de {paginas}
        </span>
        <button
          type="button"
          className="bm-btn bm-btn--ghost"
          onClick={() => tabla.nextPage()}
          disabled={!tabla.getCanNextPage()}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

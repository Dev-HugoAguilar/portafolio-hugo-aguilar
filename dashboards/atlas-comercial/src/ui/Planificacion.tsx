/**
 * «Plan de ventas · Próximas cuatro semanas»: el recorrido comercial completo.
 *
 * Orden de la pantalla:
 *   A. Contexto (tienda, categoría, departamento, búsqueda, corte y horizonte).
 *   B. Resumen del conjunto filtrado (no de la página visible).
 *   C. Tabla de planificación: una fila por artículo × tienda, con lo observado en los 28
 *      días anteriores, el pronóstico del horizonte, la diferencia, la variación y las cuatro
 *      semanas del horizonte (días 1–7, 8–14, 15–21, 22–28).
 *   D. Detalle del artículo seleccionado: histórico reciente, pronóstico diario con el corte
 *      marcado, cuatro totales semanales y evaluación a 28 días de esa misma serie.
 *   E. Descarga del plan filtrado y enlace a la evaluación completa.
 *
 * Reglas que la interfaz respeta:
 * - Nunca se convierte el pronóstico en una orden de compra.
 * - Lo observado en los 28 días anteriores es una comparación **descriptiva**: distinta
 *   duración de mes, festivos y SINE el modelo. No mide la mejora del modelo.
 * - Las semanas son bloques de siete días del horizonte, no semanas ISO.
 * - Los totales son del conjunto filtrado completo; la paginación no los altera.
 */

import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  DetallePlanRespuesta,
  EstadoRespuesta,
  OrdenPlan,
  PlanificacionRespuesta,
} from '../api';
import {
  cifra,
  cifraAmpliada,
  cifraConSigno,
  DECIMALES_VISIBLES,
  toleranciaRedondeo,
} from '../metricas';
import {
  etiquetaArticulo,
  etiquetaArticuloCorta,
  etiquetaCategoria,
  etiquetaCategoriaCorta,
  etiquetaDepartamentoCorta,
  etiquetaDepartamento,
  etiquetaTienda,
  estadoEvaluacion,
  fechaCorta,
  fechaLarga,
  fechaRango,
  numero,
  porcentaje,
  signo,
} from '../etiquetas';
import './planificacion.css';

const ORDENES: { valor: OrdenPlan; texto: string }[] = [
  { valor: 'volumen_previsto', texto: 'Mayor volumen previsto' },
  { valor: 'aumento_absoluto', texto: 'Mayor aumento absoluto' },
  { valor: 'disminucion_absoluta', texto: 'Mayor disminución absoluta' },
  { valor: 'aumento_porcentual', texto: 'Mayor aumento porcentual' },
  { valor: 'disminucion_porcentual', texto: 'Mayor disminución porcentual' },
  { valor: 'volumen_observado', texto: 'Mayor volumen observado' },
];

export function Planificacion({
  datos,
  detalle,
  cargando,
  cargandoDetalle,
  error,
  errorDetalle,
  estadoApi,
  modelo,
  texto,
  orden,
  minimoObservado,
  seleccion,
  vista,
  onVista,
  onOrden,
  onPagina,
  onMinimoObservado,
  onSeleccion,
  onReintentar,
  onExplorarArticulo,
  onIrEvaluacion,
  onDescargar,
  descargando,
  avisoDescarga,
}: {
  datos: PlanificacionRespuesta | null;
  detalle: DetallePlanRespuesta | null;
  cargando: boolean;
  cargandoDetalle: boolean;
  error: string | null;
  errorDetalle: string | null;
  estadoApi: EstadoRespuesta | null;
  /** Modelo publicado: etiqueta legible y variante (no la versión del conjunto). */
  modelo: { etiqueta?: string; variante?: string; run_id?: string } | null;
  texto: string;
  orden: OrdenPlan;
  minimoObservado: number | null;
  seleccion: { store_id: string; item_id: string } | null;
  /** «Plan semanal» o «Comparación histórica»: comparten filtros, orden y página. */
  vista: 'semanal' | 'historica';
  onVista: (vista: 'semanal' | 'historica') => void;
  onOrden: (valor: OrdenPlan) => void;
  onPagina: (valor: number) => void;
  onMinimoObservado: (valor: number | null) => void;
  onSeleccion: (fila: { store_id: string; item_id: string } | null) => void;
  onReintentar: () => void;
  onExplorarArticulo: (item: string, tienda: string) => void;
  onIrEvaluacion: () => void;
  onDescargar: () => void;
  descargando: boolean;
  avisoDescarga: string | null;
}) {
  const resumen = datos?.resumen ?? null;
  /* Con una sola tienda elegida, la tienda se declara en el encabezado y no se repite por
     fila; con varias (o ninguna) se muestra su columna. */
  const tiendasFiltradas = (datos?.filtros?.tiendas as string[] | undefined) ?? [];
  const tiendaUnica = tiendasFiltradas.length === 1 ? tiendasFiltradas[0] : null;
  const variasTiendas = !tiendaUnica;
  /* El contador del contexto cuenta las tiendas del resultado completo del filtro, no las del
     selector: con «todas las tiendas» el filtro llega vacío y aun así hay diez tiendas dentro. */
  const tiendasContexto = datos?.tiendas_contexto ?? [];
  const tiendasEnContexto = tiendasContexto.length > 0 ? tiendasContexto.length : null;
  const contextoPendiente = cargando && !datos;

  return (
    <div className="ac-bloques ac-plan">
      <header className="ac-plan-cab">
        <div>
          <h2 className="ac-plan-titulo">Plan de ventas · Próximas cuatro semanas</h2>
          <p className="ac-plan-sub">
            Unidades previstas por artículo y tienda para los 28 días posteriores al corte
            histórico.
          </p>
          <p className="ac-plan-aviso">
            Simulación histórica basada en M5: el corte es el fin del histórico publicado, no la
            fecha de hoy. Las cifras estiman unidades vendidas, no órdenes de compra.
          </p>
        </div>
        <div className="ac-plan-cab-datos">
          <p data-testid="plan-corte">
            Corte: <strong>{fechaLarga(datos?.origen_fecha ?? null)}</strong>
          </p>
          <p data-testid="plan-horizonte">
            Horizonte: <strong>{fechaRango(datos?.horizonte_inicio, datos?.horizonte_fin)}</strong> ·
            28 días
          </p>
          <p data-testid="plan-modelo">
            Modelo: <strong>{modelo?.etiqueta ?? 'sin modelo publicado'}</strong>
            {modelo?.variante ? ` · variante ${modelo.variante}` : ''}
          </p>
          <p data-testid="plan-tienda-contexto">
            {tiendaUnica ? (
              <>
                Tienda: <strong>{etiquetaTienda(tiendaUnica)}</strong>
              </>
            ) : contextoPendiente ? (
              <>
                Tiendas: <strong aria-busy="true">…</strong> en el contexto
              </>
            ) : (
              <>
                Tiendas:{' '}
                <strong>{tiendasEnContexto === null ? 'sin datos' : numero(tiendasEnContexto)}</strong>{' '}
                en el contexto
              </>
            )}
          </p>
          <p data-testid="plan-revision">
            Revisión: <strong>{datos?.revision ?? '—'}</strong>
            {datos?.revision_politica ? ` · ${datos.revision_politica}` : ''}
          </p>
        </div>
      </header>

      {/* Controles propios de la tabla (los filtros viven en la barra de contexto) */}
      <section className="ac-panel" aria-labelledby="ac-t-plan-controles">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-plan-controles">Controles de la tabla</h3>
            <p className="ac-panel-sub">
              Los filtros (estado, tienda, categoría, departamento y búsqueda) están en la barra de
              contexto: aquí solo se ajusta cómo se lee la tabla.
            </p>
          </div>
        </header>
        <div className="ac-plan-filtros">
          <label className="ac-campo">
            <span>Orden</span>
            <select
              value={orden}
              onChange={(evento) => onOrden(evento.target.value as OrdenPlan)}
              data-testid="plan-orden"
            >
              {ORDENES.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.texto}
                </option>
              ))}
            </select>
          </label>
          <label className="ac-campo">
            <span>Volumen histórico mínimo</span>
            <select
              value={minimoObservado ?? ''}
              onChange={(evento) =>
                onMinimoObservado(evento.target.value ? Number(evento.target.value) : null)
              }
              data-testid="plan-minimo"
            >
              <option value="">Sin mínimo</option>
              <option value="1">Al menos 1 unidad en 28 días</option>
              <option value="28">Al menos 28 unidades (1/día)</option>
              <option value="140">Al menos 140 unidades (5/día)</option>
            </select>
          </label>
          <label className="ac-campo">
            <span>Vista</span>
            <select
              value={vista}
              onChange={(evento) => onVista(evento.target.value as 'semanal' | 'historica')}
              data-testid="plan-vista"
            >
              <option value="semanal">Plan semanal</option>
              <option value="historica">Comparación histórica</option>
            </select>
          </label>
          {texto ? (
            <p className="ac-nota" data-testid="plan-busqueda-activa">
              Búsqueda activa: «{texto}»
            </p>
          ) : null}
        </div>
      </section>

      {/* B. Resumen -------------------------------------------------------- */}
      <section className="ac-panel" aria-labelledby="ac-t-plan-resumen" data-testid="plan-resumen">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-plan-resumen">B · Resumen del plan filtrado</h3>
            <p className="ac-panel-sub">
              Totales del conjunto filtrado completo ({numero(resumen?.series ?? 0)} series
              artículo × tienda), no de la página visible.
            </p>
          </div>
        </header>
        {error ? (
          <div className="ac-estado ac-estado--error" role="alert" data-testid="plan-error">
            <h4>No se pudo cargar el plan</h4>
            <p>{error}</p>
            <div className="ac-acciones">
              <button type="button" className="ac-accion" onClick={onReintentar}>
                Reintentar
              </button>
            </div>
          </div>
        ) : cargando && !datos ? (
          <div className="ac-esqueleto" role="status" aria-busy="true" data-testid="plan-cargando">
            <span>Calculando el plan de las próximas cuatro semanas…</span>
          </div>
        ) : resumen ? (
          <div className="ac-plan-resumen">
            <div className="ac-tarjeta">
              <span className="ac-tarjeta-etq">Unidades previstas · 28 días</span>
              <span
                className="ac-tarjeta-valor"
                data-testid="plan-total-previsto"
                data-cifra={resumen.pronostico_28}
                title={cifraAmpliada(resumen.pronostico_28)}
              >
                {cifra(resumen.pronostico_28)}
              </span>
              <p className="ac-tarjeta-pie">
                Total del horizonte calculado con la serie sin redondear (
                {fechaRango(datos?.horizonte_inicio, datos?.horizonte_fin)}); no es la suma de las
                cifras redondeadas que se muestran
              </p>
            </div>
            <div className="ac-tarjeta">
              <span className="ac-tarjeta-etq">Unidades observadas · 28 días anteriores</span>
              <span className="ac-tarjeta-valor">{numero(resumen.observado_28)}</span>
              <p className="ac-tarjeta-pie">
                {fechaRango(datos?.observado_desde, datos?.observado_hasta)} · comparación
                descriptiva, no mejora del modelo
              </p>
            </div>
            <div className="ac-tarjeta">
              <span className="ac-tarjeta-etq">Diferencia</span>
              <span className="ac-tarjeta-valor">{signo(resumen.diferencia)}</span>
              <p className="ac-tarjeta-pie">{porcentaje(resumen.variacion_pct)} frente a lo observado</p>
            </div>
            <div className="ac-tarjeta">
              <span className="ac-tarjeta-etq">Series incluidas</span>
              <span className="ac-tarjeta-valor">{numero(resumen.series)}</span>
              <p className="ac-tarjeta-pie">
                {numero(resumen.series_con_evaluacion)} con evaluación a 28 días
                {resumen.series_sin_base > 0
                  ? ` · ${numero(resumen.series_sin_base)} sin base histórica`
                  : ''}
              </p>
            </div>
          </div>
        ) : null}
        <p className="ac-nota">
          La comparación con los 28 días anteriores es descriptiva: no representa una mejora del
          modelo ni elimina diferencias de calendario entre ambos periodos.
        </p>
      </section>

      {/* C. Tabla de planificación ---------------------------------------- */}
      <section className="ac-panel" aria-labelledby="ac-t-plan-tabla" data-testid="plan-tabla-panel">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-plan-tabla">C · Tabla de planificación</h3>
            <p className="ac-panel-sub">
              {datos
                ? `${numero(datos.total)} series · página ${numero(datos.pagina)} de ${numero(datos.paginas)} · orden: ${
                    ORDENES.find((opcion) => opcion.valor === datos.orden)?.texto ?? datos.orden
                  }`
                : 'Sin datos'}
              {datos?.excluidas_por_orden
                ? ` · ${numero(datos.excluidas_por_orden)} series sin base quedan fuera de este orden porcentual y se explican más abajo`
                : ''}
            </p>
          </div>
          <div className="ac-plan-acciones">
            <button
              type="button"
              className="ac-accion"
              onClick={onDescargar}
              disabled={descargando || !datos?.total}
              data-testid="plan-descargar"
            >
              {descargando ? 'Generando…' : 'Descargar plan filtrado'}
            </button>
          </div>
        </header>

        {avisoDescarga ? (
          <p className="ac-aviso-inline" role="status" data-testid="plan-aviso-descarga">
            {avisoDescarga}
          </p>
        ) : null}

        {datos ? (
          <>
            <div className="ac-tabla-marco ac-plan-marco">
              <table className={`ac-tabla ac-plan-tabla ac-plan-tabla--${vista}`}>
                <caption>
                  {vista === 'semanal'
                    ? 'Plan semanal por artículo × tienda'
                    : 'Comparación histórica: 28 días anteriores frente a 28 previstos'}{' '}
                  · corte {fechaLarga(datos.origen_fecha)} · horizonte{' '}
                  {fechaRango(datos.horizonte_inicio, datos.horizonte_fin)}
                  {tiendaUnica ? ` · ${etiquetaTienda(tiendaUnica)}` : ''} · semanas y total se
                  calculan con la serie canónica y se redondean a {DECIMALES_VISIBLES} decimales al
                  mostrarse
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Artículo</th>
                    {variasTiendas ? <th scope="col">Tienda</th> : null}
                    {vista === 'semanal' ? (
                      <>
                        <th scope="col" className="ac-tabla-num">Previsto 28 d</th>
                        {datos.semanas_fechas.map((semana, indice) => (
                          <th key={semana.etiqueta} scope="col" className="ac-tabla-num ac-plan-semana">
                            Semana {indice + 1}
                            <span className="ac-plan-semana-fechas">
                              {fechaRango(semana.desde, semana.hasta)}
                            </span>
                          </th>
                        ))}
                      </>
                    ) : (
                      <>
                        <th scope="col" className="ac-tabla-num">Observado 28 d</th>
                        <th scope="col" className="ac-tabla-num">Previsto 28 d</th>
                        <th scope="col" className="ac-tabla-num">Diferencia</th>
                        <th scope="col" className="ac-tabla-num">Variación</th>
                      </>
                    )}
                    <th scope="col">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.filas.map((fila) => {
                    const activa =
                      seleccion?.item_id === fila.item_id && seleccion?.store_id === fila.store_id;
                    return (
                      <tr
                        key={`${fila.store_id}|${fila.item_id}`}
                        className={activa ? 'is-activa' : undefined}
                        data-clave={`${fila.store_id}|${fila.item_id}`}
                      >
                        <th scope="row">
                          <button
                            type="button"
                            className="ac-enlace ac-plan-articulo"
                            aria-expanded={activa}
                            aria-controls="ac-plan-detalle"
                            aria-label={`${etiquetaArticulo(fila.item_id)} · ${etiquetaTienda(
                              fila.store_id,
                            )} · ${etiquetaCategoria(fila.cat_id)} · ${etiquetaDepartamento(
                              fila.dept_id,
                            )}`}
                            onClick={() => onSeleccion({ store_id: fila.store_id, item_id: fila.item_id })}
                            data-clave={`${fila.store_id}|${fila.item_id}`}
                          >
                            <span className="ac-plan-articulo-corto">
                              {etiquetaArticuloCorta(fila.item_id)}
                            </span>
                            <span className="ac-plan-codigo">{fila.item_id}</span>
                          </button>
                          <span className="ac-plan-contexto">
                            {etiquetaCategoriaCorta(fila.cat_id)} ·{' '}
                            {etiquetaDepartamentoCorta(fila.dept_id)}
                          </span>
                        </th>
                        {variasTiendas ? (
                          <th scope="row" className="ac-plan-tienda">
                            {etiquetaTienda(fila.store_id)}
                            <span className="ac-plan-codigo">{fila.store_id}</span>
                          </th>
                        ) : null}
                        {vista === 'semanal' ? (
                          <>
                            <td
                              className="ac-tabla-num ac-plan-fuerte"
                              data-cifra={fila.pronostico_28}
                              title={cifraAmpliada(fila.pronostico_28)}
                            >
                              {cifra(fila.pronostico_28)}
                            </td>
                            {fila.semanas.map((valor, indice) => (
                              <td
                                key={indice}
                                className="ac-tabla-num"
                                data-cifra={valor}
                                title={cifraAmpliada(valor)}
                              >
                                {cifra(valor)}
                              </td>
                            ))}
                          </>
                        ) : (
                          <>
                            <td
                              className="ac-tabla-num"
                              data-cifra={fila.observado_28}
                              title={`${numero(fila.observado_28)} u observadas (unidades enteras de la fuente)`}
                            >
                              {cifra(fila.observado_28)}
                            </td>
                            <td
                              className="ac-tabla-num ac-plan-fuerte"
                              data-cifra={fila.pronostico_28}
                              title={cifraAmpliada(fila.pronostico_28)}
                            >
                              {cifra(fila.pronostico_28)}
                            </td>
                            <td
                              className="ac-tabla-num"
                              data-cifra={fila.diferencia}
                              title={cifraAmpliada(fila.diferencia)}
                            >
                              {cifraConSigno(fila.diferencia)}
                            </td>
                            <td className="ac-tabla-num">{porcentaje(fila.variacion_pct)}</td>
                          </>
                        )}
                        <td>
                          <button
                            type="button"
                            className="ac-enlace"
                            onClick={() => onSeleccion({ store_id: fila.store_id, item_id: fila.item_id })}
                            aria-expanded={activa}
                            aria-controls="ac-plan-detalle"
                          >
                            {activa ? 'Ocultar' : 'Ver detalle'}
                          </button>
                          <span
                            className={`ac-plan-estado ac-plan-estado--${fila.evaluacion.estado}`}
                            title={`${estadoEvaluacion(fila.evaluacion.estado)} · ${fila.evaluacion.cortes} cortes`}
                          >
                            {fila.evaluacion.estado === 'menor_error'
                              ? 'Menor error'
                              : fila.evaluacion.estado === 'mayor_error'
                                ? 'Mayor error'
                                : fila.evaluacion.estado === 'mixto'
                                  ? 'Mixto'
                                  : fila.evaluacion.estado === 'empate'
                                    ? 'Empate'
                                    : 'Sin evaluación'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {datos.filas.length === 0 ? (
              <p className="ac-vacio" data-testid="plan-vacio">
                El filtro no devolvió series. Ajusta tienda, departamento o el texto de búsqueda:
                la consulta es válida y no hay filas que mostrar.
              </p>
            ) : null}

            <div className="ac-plan-paginacion">
              <button
                type="button"
                className="ac-accion ac-accion--secundaria"
                onClick={() => onPagina(Math.max(1, datos.pagina - 1))}
                disabled={datos.pagina <= 1}
                data-testid="plan-anterior"
              >
                Anterior
              </button>
              <span className="ac-plan-pagina">
                Página {numero(datos.pagina)} de {numero(datos.paginas)} · {numero(datos.tamano)} por
                página
              </span>
              <button
                type="button"
                className="ac-accion ac-accion--secundaria"
                onClick={() => onPagina(Math.min(datos.paginas, datos.pagina + 1))}
                disabled={datos.pagina >= datos.paginas}
                data-testid="plan-siguiente"
              >
                Siguiente
              </button>
            </div>

            <p className="ac-nota" data-testid="plan-nota-redondeo">
              Las semanas son bloques consecutivos de siete días del horizonte (1–7, 8–14, 15–21,
              22–28), no semanas ISO. Los totales se calculan con valores sin redondear; la suma de
              las cifras mostradas puede presentar pequeñas diferencias por redondeo: el total de
              una fila coincide con la suma de sus cuatro semanas en el valor canónico, no
              necesariamente en las cifras redondeadas a {DECIMALES_VISIBLES} decimales (tolerancia
              máxima ±{cifra(toleranciaRedondeo(5, DECIMALES_VISIBLES), 3)} u por fila). Estas cifras
              estiman unidades vendidas: para calcular abastecimiento se requieren inventario,
              pedidos en tránsito, plazos de entrega y reglas de compra.
            </p>
            {datos.excluidas_por_orden ? (
              <p className="ac-nota" data-testid="plan-excluidas">
                {numero(datos.excluidas_por_orden)} series tienen base histórica cero y no admiten
                variación porcentual: quedan fuera de los órdenes porcentuales y siguen disponibles
                en los órdenes por volumen y por diferencia absoluta.
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      {/* D. Detalle del artículo ------------------------------------------ */}
      <section
        className="ac-panel"
        aria-labelledby="ac-t-plan-detalle"
        id="ac-plan-detalle"
        data-testid="plan-detalle"
      >
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-plan-detalle">D · Detalle del artículo</h3>
            <p className="ac-panel-sub">
              {seleccion
                ? `${etiquetaArticulo(seleccion.item_id)} · ${etiquetaTienda(seleccion.store_id)}`
                : 'Selecciona una fila de la tabla para ver su histórico y su pronóstico diario.'}
            </p>
          </div>
          {seleccion ? (
            <div className="ac-plan-acciones">
              <button
                type="button"
                className="ac-accion ac-accion--secundaria"
                onClick={() => onExplorarArticulo(seleccion.item_id, seleccion.store_id)}
              >
                Abrir en Exploración
              </button>
              <button
                type="button"
                className="ac-accion ac-accion--secundaria"
                onClick={() => onSeleccion(null)}
              >
                Cerrar detalle
              </button>
            </div>
          ) : null}
        </header>

        {!seleccion ? (
          <p className="ac-vacio">Elige un artículo de la tabla para ver su serie completa.</p>
        ) : errorDetalle ? (
          <div className="ac-estado ac-estado--error" role="alert">
            <h4>No se pudo cargar el detalle</h4>
            <p>{errorDetalle}</p>
            <div className="ac-acciones">
              <button type="button" className="ac-accion" onClick={onReintentar}>
                Reintentar
              </button>
            </div>
          </div>
        ) : cargandoDetalle && !detalle ? (
          <div className="ac-esqueleto" role="status" aria-busy="true">
            <span>Cargando el detalle de la serie…</span>
          </div>
        ) : detalle ? (
          <DetalleArticuloPlan
            detalle={detalle}
            onExplorarArticulo={onExplorarArticulo}
          />
        ) : null}
      </section>

      {/* E. Enlace a la evaluación (la descarga está junto a la tabla) ----- */}
      <section className="ac-panel">
        <header className="ac-panel-cab">
          <div>
            <h3>E · Evaluación y alcance</h3>
            <p className="ac-panel-sub">
              La descarga del plan está junto a la tabla y contiene todas las filas del filtro, no
              solo la página.
            </p>
          </div>
          <div className="ac-plan-acciones">
            <button type="button" className="ac-accion ac-accion--secundaria" onClick={onIrEvaluacion}>
              Ver evaluación completa
            </button>
          </div>
        </header>
        {avisoDescarga ? (
          <p className="ac-aviso-inline" role="status" data-testid="plan-aviso-descarga-final">
            {avisoDescarga}
          </p>
        ) : null}
        <details className="ac-plan-trazabilidad" data-testid="plan-trazabilidad">
          <summary>Trazabilidad técnica del plan</summary>
          <dl className="ac-dl">
            <dt>Ejecución del modelo</dt>
            <dd>{datos?.run_id ?? modelo?.run_id ?? '—'}</dd>
            <dt>Versión de datos</dt>
            <dd>{datos?.version ?? estadoApi?.version ?? '—'}</dd>
            <dt>Modelo</dt>
            <dd>
              {modelo?.etiqueta ?? 'sin modelo publicado'}
              {modelo?.variante ? ` · variante ${modelo.variante}` : ''}
            </dd>
            <dt>Corte</dt>
            <dd>{fechaLarga(datos?.origen_fecha ?? null)}</dd>
            <dt>Horizonte</dt>
            <dd>{fechaRango(datos?.horizonte_inicio, datos?.horizonte_fin)} · 28 días</dd>
            <dt>Orden aplicado</dt>
            <dd>
              {(datos?.orden_aplicado ?? [])
                .map((campo) => `${campo.campo} ${campo.sentido === 'desc' ? 'descendente' : 'ascendente'}`)
                .join(' · ')}
              {' · desempate '}
              {datos?.desempate ?? 'tienda y artículo'}
            </dd>
            <dt>Revisión publicada</dt>
            <dd>
              {datos?.revision ?? 'sin revisión declarada'}
              {datos?.revision_politica ? ` · política ${datos.revision_politica}` : ''}
              {datos?.revision_anterior
                ? ` · sustituye a ${datos.revision_anterior}, que sigue guardada y permite volver a ella`
                : ''}
            </dd>
            <dt>Precisión</dt>
            <dd>
              {datos?.politica_precision ??
                'decimal-v1: una sola serie canónica en decimales'}{' '}
              · las series, las semanas y los agregados salen de la misma predicción sin redondear,
              y el redondeo se aplica solo al mostrarla. Por eso el total del plan y la suma de las
              cuatro semanas coinciden, y las métricas de evaluación usan exactamente esas cifras.
            </dd>
            <dt>Identificadores</dt>
            <dd>
              Los códigos originales (artículo, tienda, categoría y departamento) se conservan en la
              tabla como línea secundaria, en la búsqueda y en la descarga.
            </dd>
          </dl>
        </details>
        <p className="ac-nota">
          El CSV conserva los identificadores originales junto a las etiquetas legibles, las fechas
          de cada semana, lo observado, lo previsto por semana, el total, la diferencia, la
          variación, el modelo, la versión, el corte y si la serie tiene evaluación. No incluye
          filas de totales que puedan sumarse como si fueran artículos.
        </p>
      </section>
    </div>
  );
}

/** Detalle de la serie: histórico + pronóstico diario, semanas y evaluación a 28 días. */
function DetalleArticuloPlan({
  detalle,
  onExplorarArticulo,
}: {
  detalle: DetallePlanRespuesta;
  onExplorarArticulo: (item: string, tienda: string) => void;
}) {
  const [verBaseline, setVerBaseline] = useState(true);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(720);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo || typeof ResizeObserver === 'undefined') return;
    const medir = () => setAncho(nodo.clientWidth < 520 ? 360 : 720);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const alto = ancho < 520 ? 200 : 240;
  const margen = { arriba: 16, derecha: 14, abajo: 34, izquierda: 46 };

  const serie = useMemo(() => {
    const historico = detalle.historico.slice(-56).map((punto) => ({
      fecha: punto.fecha,
      valor: punto.unidades,
      tipo: 'observado' as const,
    }));
    const pronostico = detalle.pronostico_diario.map((punto) => ({
      fecha: punto.fecha,
      valor: punto.pronostico ?? 0,
      baseline: punto.baseline ?? 0,
      tipo: 'pronostico' as const,
    }));
    // El histórico y el pronóstico comparten la fecha del corte: se empalma el último
    // observado con el primer pronóstico para que la línea sea continua.
    const puntos = [
      ...historico.map((punto) => ({ fecha: punto.fecha, valor: punto.valor, tipo: punto.tipo })),
      ...pronostico.map((punto) => ({ fecha: punto.fecha, valor: punto.valor, tipo: punto.tipo })),
    ];
    return { historico, pronostico, puntos };
  }, [detalle]);

  const maximo = Math.max(1, ...serie.puntos.map((punto) => punto.valor ?? 0));
  const escalaX = scaleLinear()
    .domain([0, Math.max(1, serie.puntos.length - 1)])
    .range([margen.izquierda, ancho - margen.derecha]);
  const escalaY = scaleLinear()
    .domain([0, maximo])
    .range([alto - margen.abajo, margen.arriba]);

  const trazado = (puntos: { valor: number }[]) =>
    line<{ valor: number }>()
      .x((_punto, indice) => escalaX(indice))
      .y((punto) => escalaY(punto.valor ?? 0))(puntos) ?? '';

  const indiceCorte = serie.historico.length - 1;
  const marcasY = [0, 0.25, 0.5, 0.75, 1].map((parte) => Math.round(maximo * parte));

  return (
    <div className="ac-plan-detalle">
      <div className="ac-plan-detalle-cab">
        <p>
          <strong>{etiquetaArticulo(detalle.serie.item_id)}</strong> ·{' '}
          {etiquetaTienda(detalle.serie.store_id)} · {etiquetaCategoria(detalle.serie.cat_id)} ·{' '}
          {etiquetaDepartamento(detalle.serie.dept_id)}
        </p>
        <p className="ac-nota">
          Corte {fechaLarga(detalle.origen_fecha)} · pronóstico {fechaRango(detalle.horizonte_inicio, detalle.horizonte_fin)} ·
          histórico mostrado {fechaRango(detalle.historico[0]?.fecha, detalle.historico.at(-1)?.fecha)}
        </p>
      </div>

      <figure className="ac-plan-figura" ref={contenedor}>
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          role="img"
          aria-label={`Serie ${detalle.serie.item_id} en ${detalle.serie.store_id}: histórico hasta ${fechaCorta(
            detalle.origen_fecha,
          )} y pronóstico de 28 días hasta ${fechaCorta(detalle.horizonte_fin)}`}
          data-testid="plan-grafico"
        >
          {marcasY.map((valor) => (
            <g key={`y-${valor}`}>
              <line
                className="ac-plan-guia"
                x1={margen.izquierda}
                x2={ancho - margen.derecha}
                y1={escalaY(valor)}
                y2={escalaY(valor)}
              />
              <text className="ac-plan-eje" x={margen.izquierda - 6} y={escalaY(valor) + 3} textAnchor="end">
                {numero(valor)}
              </text>
            </g>
          ))}
          <line
            className="ac-plan-corte"
            x1={escalaX(indiceCorte)}
            x2={escalaX(indiceCorte)}
            y1={margen.arriba}
            y2={alto - margen.abajo}
            data-testid="plan-corte-marca"
          />
          <text
            className="ac-plan-corte-etq"
            x={escalaX(indiceCorte) + 4}
            y={margen.arriba + 10}
            textAnchor="start"
          >
            corte {fechaCorta(detalle.origen_fecha)}
          </text>
          {verBaseline ? (
            <path
              className="ac-plan-baseline"
              d={trazado(serie.pronostico.map((punto) => ({ valor: punto.baseline })))}
              transform={`translate(${escalaX(indiceCorte)},0)`}
              style={{ transform: `translateX(${escalaX(indiceCorte)}px)`, transformBox: 'view-box' }}
            />
          ) : null}
          <path className="ac-plan-historico" d={trazado(serie.historico.map((p) => ({ valor: p.valor })))} />
          <path
            className="ac-plan-pronostico"
            d={trazado([
              { valor: serie.historico.at(-1)?.valor ?? 0 },
              ...serie.pronostico.map((punto) => ({ valor: punto.valor })),
            ])}
            transform={`translate(${escalaX(indiceCorte)},0)`}
            style={{ transform: `translateX(${escalaX(indiceCorte)}px)`, transformBox: 'view-box' }}
          />
          <text className="ac-plan-eje" x={margen.izquierda} y={alto - 4} textAnchor="start">
            unidades por día · histórico y pronóstico
          </text>
        </svg>
        <ul className="ac-plan-leyenda">
          <li>
            <span className="ac-plan-muestra ac-plan-muestra--observado" /> Observado
          </li>
          <li>
            <span className="ac-plan-muestra ac-plan-muestra--pronostico" /> Pronóstico del modelo
          </li>
          <li>
            <label className="ac-plan-baseline-toggle">
              <input
                type="checkbox"
                checked={verBaseline}
                onChange={(evento) => setVerBaseline(evento.target.checked)}
              />
              Baseline estacional
            </label>
          </li>
        </ul>
      </figure>

      <div className="ac-plan-totales">
        <div className="ac-tarjeta">
          <span className="ac-tarjeta-etq">Observado · 28 días previos</span>
          <span
            className="ac-tarjeta-valor"
            data-cifra={detalle.fila.observado_28}
            title={`${numero(detalle.fila.observado_28)} u observadas (unidades enteras de la fuente)`}
          >
            {cifra(detalle.fila.observado_28)}
          </span>
          <p className="ac-tarjeta-pie">{fechaRango(detalle.observado_desde, detalle.observado_hasta)}</p>
        </div>
        <div className="ac-tarjeta">
          <span className="ac-tarjeta-etq">Previsto · 28 días</span>
          <span
            className="ac-tarjeta-valor"
            data-testid="plan-detalle-total"
            data-cifra={detalle.fila.pronostico_28}
            title={cifraAmpliada(detalle.fila.pronostico_28)}
          >
            {cifra(detalle.fila.pronostico_28)}
          </span>
          <p className="ac-tarjeta-pie">
            {cifraConSigno(detalle.fila.diferencia)} · {porcentaje(detalle.fila.variacion_pct)}
          </p>
        </div>
        <div className="ac-tarjeta">
          <span className="ac-tarjeta-etq">Baseline · 28 días</span>
          <span
            className="ac-tarjeta-valor"
            data-cifra={detalle.fila.baseline_28}
            title={cifraAmpliada(detalle.fila.baseline_28)}
          >
            {cifra(detalle.fila.baseline_28)}
          </span>
          <p className="ac-tarjeta-pie">Comparación opcional del mismo horizonte</p>
        </div>
      </div>

      <div className="ac-tabla-marco">
        <table className="ac-tabla">
          <caption>
            Cuatro semanas del horizonte · el total previsto se calcula con la serie sin redondear, no
            sumando esta columna
          </caption>
          <thead>
            <tr>
              <th scope="col">Semana</th>
              <th scope="col">Fechas</th>
              <th scope="col" className="ac-tabla-num">Previsto</th>
              <th scope="col" className="ac-tabla-num">Baseline</th>
              <th scope="col" className="ac-tabla-num">Observado previo</th>
            </tr>
          </thead>
          <tbody>
            {detalle.semanas.map((semana, indice) => (
              <tr key={semana.etiqueta}>
                <th scope="row">Semana {indice + 1}</th>
                <td>{fechaRango(semana.desde, semana.hasta)}</td>
                <td className="ac-tabla-num" data-cifra={semana.pronostico} title={cifraAmpliada(semana.pronostico)}>
                  {cifra(semana.pronostico)}
                </td>
                <td className="ac-tabla-num" data-cifra={semana.baseline} title={cifraAmpliada(semana.baseline)}>
                  {cifra(semana.baseline)}
                </td>
                <td className="ac-tabla-num">{cifra(semana.observado_previo)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total 28 días</th>
              <td>{fechaRango(detalle.horizonte_inicio, detalle.horizonte_fin)}</td>
              <td className="ac-tabla-num" data-cifra={detalle.fila.pronostico_28} title={cifraAmpliada(detalle.fila.pronostico_28)}>
                {cifra(detalle.fila.pronostico_28)}
              </td>
              <td className="ac-tabla-num" data-cifra={detalle.fila.baseline_28} title={cifraAmpliada(detalle.fila.baseline_28)}>
                {cifra(detalle.fila.baseline_28)}
              </td>
              <td className="ac-tabla-num">{cifra(detalle.fila.observado_28)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <details className="ac-plan-precision" data-testid="plan-precision-ampliada">
        <summary>Precisión ampliada de esta serie</summary>
        <dl className="ac-dl">
          <dt>Previsto 28 días (serie canónica)</dt>
          <dd data-testid="plan-precision-total">{cifraAmpliada(detalle.fila.pronostico_28)}</dd>
          <dt>Suma de las cuatro semanas de la serie canónica</dt>
          <dd>{cifraAmpliada(detalle.semanas.reduce((suma, semana) => suma + semana.pronostico, 0))}</dd>
          <dt>Suma de los 28 días de la serie canónica</dt>
          <dd>
            {cifraAmpliada(
              detalle.pronostico_diario.reduce((suma, dia) => suma + (dia.pronostico ?? 0), 0),
            )}
          </dd>
          <dt>Baseline 28 días (serie canónica)</dt>
          <dd>{cifraAmpliada(detalle.fila.baseline_28)}</dd>
        </dl>
        <p className="ac-nota">
          Las tres primeras cifras coinciden hasta la precisión mostrada; la tabla redondea a{' '}
          {DECIMALES_VISIBLES} decimales y por eso su suma puede diferir en centésimas. El observado
          se conserva en unidades enteras de la fuente y no se redondea.
        </p>
      </details>

      <div className="ac-plan-evaluacion" data-testid="plan-detalle-evaluacion">
        <h4>Desempeño histórico de esta serie</h4>
        {detalle.evaluacion_horizonte.length === 0 ? (
          <p className="ac-nota">
            Sin evaluación suficiente para esta serie: no se declara un buen desempeño por falta de
            datos.
          </p>
        ) : (
          <>
            <p className="ac-nota">
              {estadoEvaluacion(detalle.evaluacion_resumen.estado)} ·{' '}
              {detalle.evaluacion_resumen.cortes} corte(s) disponible(s) para esta serie. «Menor
              error» no es aprobación operativa ni garantía futura.
            </p>
            <div className="ac-tabla-marco">
              <table className="ac-tabla">
                <caption>Error del total de 28 días por corte · esta serie</caption>
                <thead>
                  <tr>
                    <th scope="col">Corte</th>
                    <th scope="col">Horizonte</th>
                    <th scope="col" className="ac-tabla-num">Observado 28 d</th>
                    <th scope="col" className="ac-tabla-num">Previsto 28 d</th>
                    <th scope="col" className="ac-tabla-num">Error</th>
                    <th scope="col" className="ac-tabla-num">Error baseline</th>
                    <th scope="col">Comparación</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.evaluacion_horizonte.map((registro) => (
                    <tr key={registro.origen_d}>
                      <th scope="row">
                        {fechaLarga(registro.origen_fecha)}
                        <span className="ac-plan-codigo">d_{registro.origen_d}</span>
                      </th>
                      <td>{fechaRango(registro.origen_fecha, registro.fin_fecha)}</td>
                      <td className="ac-tabla-num">{cifra(registro.observado_28)}</td>
                      <td className="ac-tabla-num" title={cifraAmpliada(registro.pronostico_28)}>
                        {cifra(registro.pronostico_28)}
                      </td>
                      <td className="ac-tabla-num">{cifraConSigno(registro.error_28)}</td>
                      <td className="ac-tabla-num">{cifraConSigno(registro.baseline_error_28)}</td>
                      <td>{registro.mejor_que_baseline ? 'Menor error' : 'Mayor error'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="ac-nota">
          Cobertura: histórico observado desde {fechaCorta(detalle.historico[0]?.fecha)} hasta el
          corte; pronóstico de 28 días publicado. El error del horizonte se calcula sumando primero
          y restando después, no sumando errores diarios, y se expresa en unidades por
          serie-horizonte de 28 días: un valor positivo indica sobreestimación y uno negativo,
          subestimación.
        </p>
        <div className="ac-acciones">
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            onClick={() => onExplorarArticulo(detalle.serie.item_id, detalle.serie.store_id)}
          >
            Ver el análisis exploratorio de esta serie
          </button>
        </div>
      </div>
    </div>
  );
}

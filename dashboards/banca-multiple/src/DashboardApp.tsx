/**
 * Dashboard «Banca múltiple mexicana — Comparativo financiero».
 *
 * Composición compacta y coordinada:
 *   cabecera · filtros · 4 indicadores · [ranking 5 | evolución 7] ·
 *   [dispersión 5 | tabla 7] · pie con cobertura y fuentes.
 *
 * Todos los datos vienen de la API real de la CNBV. El estado compartido vive en
 * Zustand y las consultas en TanStack Query con claves que incluyen los filtros.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Catalogo, Concepto, Institucion } from './api/types';
import { Evolution, type Modo } from './charts/Evolution';
import { Ranking } from './charts/Ranking';
import { Scatter, type PuntoRoa } from './charts/Scatter';
import { mapaColores, mapaPatrones } from './colors';
import {
  calcularBase100,
  etiquetaConcepto,
  etiquetaPeriodo,
  magnitudDeSeries,
  mesesFaltantes,
  unidadParaMagnitud,
} from './domain';
import {
  obtenerCliente,
  useCatalogo,
  useDetalle,
  useIndicadores,
  useResumen,
  useSeries,
} from './queries';
import { useAppStore } from './store';
import { BankPanel } from './ui/BankPanel';
import { DetailTable } from './ui/DetailTable';
import { FilterBar } from './ui/FilterBar';
import {
  avisoDeVigencia,
  construirHallazgos,
  fechasPorOmision,
  type PanelDestino,
} from './hallazgos';
import { AppBar, TitleBlock } from './ui/Header';
import { Hallazgos } from './ui/Hallazgos';
import { IconoDesplegar } from './ui/icons';
import { Kpis } from './ui/Kpis';
import { Sources } from './ui/Sources';

export interface PropsApp {
  apiBase: string;
}

const clienteConsulta = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function App({ apiBase }: PropsApp) {
  const cliente = useMemo(() => obtenerCliente(apiBase), [apiBase]);
  const catalogoQuery = useCatalogo(cliente);
  const catalogo: Catalogo | null = catalogoQuery.data ?? null;

  const periodo = useAppStore((estado) => estado.periodo);
  const conceptoId = useAppStore((estado) => estado.concepto);
  const institucionesSeleccionadas = useAppStore((estado) => estado.instituciones);
  const ranuras = useAppStore((estado) => estado.ranuras);
  const ventana = useAppStore((estado) => estado.ventana);
  const resaltado = useAppStore((estado) => estado.resaltado);
  const historial = useAppStore((estado) => estado.historial);
  const iniciar = useAppStore((estado) => estado.iniciar);
  const setPeriodo = useAppStore((estado) => estado.setPeriodo);
  const setConcepto = useAppStore((estado) => estado.setConcepto);
  const alternarInstitucion = useAppStore((estado) => estado.alternarInstitucion);
  const setInstituciones = useAppStore((estado) => estado.setInstituciones);
  const setVentana = useAppStore((estado) => estado.setVentana);
  const comparacion = useAppStore((estado) => estado.comparacion);
  const setComparacion = useAppStore((estado) => estado.setComparacion);
  const setResaltado = useAppStore((estado) => estado.setResaltado);
  const deshacer = useAppStore((estado) => estado.deshacer);
  const restablecer = useAppStore((estado) => estado.restablecer);

  const [fuentesAbierto, setFuentesAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>('crecimiento');
  const [enDialogo, setEnDialogo] = useState(false);
  /** Contenedor de los hallazgos en la ficha del proyecto (fuera del dashboard). */
  const [hostHallazgos, setHostHallazgos] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const host = document.getElementById('hallazgos-host');
    if (!host) return;
    /* El contenedor llega con un aviso de espera del sitio: se retira para que
       React sea el único dueño de su contenido. */
    host.textContent = '';
    setHostHallazgos(host);
  }, []);

  /* El botón «ampliar» del módulo usa el mismo mecanismo del portafolio. */
  useEffect(() => {
    const actualizar = () =>
      setEnDialogo(Boolean(document.querySelector('dialog.demo-dialog[open]')));
    actualizar();
    const observador = new MutationObserver(actualizar);
    observador.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => observador.disconnect();
  }, []);

  /**
   * Única acción de ampliación/reducción: usa el mecanismo que expone el
   * portafolio (window.PORTFOLIO_DEMO). No hay botón externo duplicado.
   */
  const ampliar = useCallback(() => {
    const api = (window as unknown as {
      PORTFOLIO_DEMO?: { alternar?: () => void; ampliado?: () => boolean };
    }).PORTFOLIO_DEMO;
    if (api?.alternar) {
      api.alternar();
      return;
    }
    const cerrar = document.querySelector<HTMLButtonElement>('#demo-close');
    if (enDialogo && cerrar) cerrar.click();
  }, [enDialogo]);

  /* arranque: primer periodo, concepto por omisión y estado recordado */
  useEffect(() => {
    if (!catalogo || catalogo.periodos.length === 0) return;
    const ultimo = catalogo.periodos[catalogo.periodos.length - 1] as string;
    const porOmision = catalogo.cobertura.concepto_por_omision || catalogo.conceptos[0]?.concepto_id;
    if (!porOmision) return;
    iniciar({
      periodo: ultimo,
      concepto: porOmision,
      instituciones: [],
      omision: { periodo: ultimo, concepto: porOmision },
    });
  }, [catalogo, iniciar]);

  const habilitado = Boolean(catalogo && periodo && conceptoId);

  const resumenQuery = useResumen(cliente, periodo, conceptoId, habilitado);
  const seriesQuery = useSeries(cliente, conceptoId, institucionesSeleccionadas, habilitado);
  const indicadoresQuery = useIndicadores(cliente, periodo, habilitado);
  const detalleQuery = useDetalle(cliente, periodo, conceptoId, institucionesSeleccionadas, habilitado);

  const resumen = resumenQuery.data ?? null;
  const series = seriesQuery.data ?? null;
  const indicadores = indicadoresQuery.data ?? null;
  const detalle = detalleQuery.data ?? null;

  const actualizando =
    resumenQuery.isFetching ||
    seriesQuery.isFetching ||
    indicadoresQuery.isFetching ||
    detalleQuery.isFetching ||
    catalogoQuery.isFetching;

  const grupos = catalogo?.cobertura.tipos_cartera ?? [];
  const institucionesCatalogo: Institucion[] = catalogo?.instituciones ?? [];
  const bancos = institucionesCatalogo.filter((institucion) => !institucion.es_sistema);

  /**
   * Colores de comparación (una sola fuente: `colors.ts`). Sin bancos
   * seleccionados no hay color por institución: cada vista usa su acento
   * (azul en el ranking, turquesa en la dispersión) y «Sistema» va siempre en
   * naranja quemado discontinuo, el color exclusivo de la referencia.
   */
  const colores = useMemo(() => mapaColores(ranuras), [ranuras]);
  const patrones = useMemo(() => mapaPatrones(ranuras), [ranuras]);

  const concepto: Concepto | null = useMemo(
    () => catalogo?.conceptos.find((item) => item.concepto_id === conceptoId) ?? null,
    [catalogo, conceptoId],
  );

  const boletin = useMemo(
    () => catalogo?.boletines.find((item) => item.periodo === periodo) ?? null,
    [catalogo, periodo],
  );

  const faltantes = useMemo(() => mesesFaltantes(catalogo?.periodos ?? []), [catalogo]);

  /** Unidad del gráfico temporal: una sola, compartida por eje, subtítulo y tooltip. */
  const esPorcentaje = concepto?.unidad === 'porcentaje';
  /**
   * La participación solo se grafica cuando tiene interpretación válida: saldos
   * en millones. En flujos acumulados o porcentajes el ranking usa importes.
   */
  const participacionValida = Boolean(
    concepto && concepto.naturaleza === 'saldo' && concepto.unidad === 'millones_mxn',
  );
  const unidadEvolucion = useMemo(
    () => unidadParaMagnitud(magnitudDeSeries(series?.series ?? [])),
    [series],
  );

  /** Selección: suma de los valores de los bancos elegidos (sin Sistema). */
  const seleccion = useMemo(() => {
    const filas = (resumen?.por_institucion ?? []).filter(
      (fila) => !fila.es_sistema && institucionesSeleccionadas.includes(fila.institucion_id),
    );
    const total = filas.reduce((suma, fila) => suma + (fila.valor ?? 0), 0);
    const sistema = resumen?.kpis.valor_sistema ?? null;
    return {
      cantidad: filas.length,
      total: filas.length > 0 ? total : null,
      participacionPct: filas.length > 0 && sistema ? (100 * total) / sistema : null,
    };
  }, [resumen, institucionesSeleccionadas]);

  /** Puntos de la dispersión: instituciones con ROA y ROE del periodo. */
  const puntosDispersion: PuntoRoa[] = useMemo(() => {
    if (!indicadores || !periodo) return [];
    const roa = indicadores.indicadores.find((item) => item.indicador_id.startsWith('roa'));
    const roe = indicadores.indicadores.find((item) => item.indicador_id.startsWith('roe'));
    if (!roa || !roe) return [];

    const acumulado = new Map<string, { institucion: string; roa?: number; roe?: number }>();
    const sumar = (valores: typeof roa.valores, clave: 'roa' | 'roe') => {
      for (const valor of valores) {
        if (valor.es_sistema || valor.periodo !== periodo) continue;
        const actual = acumulado.get(valor.institucion_id) ?? { institucion: valor.institucion };
        actual[clave] = valor.valor;
        acumulado.set(valor.institucion_id, actual);
      }
    };
    sumar(roa.valores, 'roa');
    sumar(roe.valores, 'roe');

    const puntos: PuntoRoa[] = [];
    for (const [institucionId, datos] of acumulado) {
      if (datos.roa === undefined || datos.roe === undefined) continue;
      puntos.push({
        institucion_id: institucionId,
        institucion: datos.institucion,
        roa: datos.roa,
        roe: datos.roe,
      });
    }
    return puntos.sort((a, b) => b.roe - a.roe);
  }, [indicadores, periodo]);

  const esFlujo = concepto?.naturaleza === 'flujo_acumulado';
  const mesReferencia = Number(periodo.split('-')[1] ?? 0);
  const base100 = useMemo(
    () =>
      calcularBase100(series?.series ?? [], {
        soloMismoCorte: esFlujo,
        mesReferencia,
      }),
    [series, esFlujo, mesReferencia],
  );

  /* Crecimiento solo cuando hay una fecha base común válida: mientras no la
     haya, la vista cae a Importe sin cambiar la preferencia del usuario. */
  const modoEfectivo: Modo = modo === 'crecimiento' && base100.series.length === 0 ? 'importe' : modo;

  const onHover = useCallback((id: string | null) => setResaltado(id), [setResaltado]);
  const onAlternar = useCallback((id: string) => alternarInstitucion(id), [alternarInstitucion]);

  /** Fechas de comparación efectivas: las elegidas o la primera y la última. */
  const comparacionEfectiva = comparacion ?? fechasPorOmision(series?.series ?? []);

  /**
   * Hallazgos: se calculan con los mismos datos y filtros que los gráficos.
   * No dependen del hover ni del zoom, y mientras la consulta del periodo no
   * corresponda a los filtros activos se marcan como no vigentes.
   */
  const vigente = Boolean(
    resumen && resumen.periodo === periodo && resumen.concepto?.concepto_id === conceptoId,
  );
  const resultadoHallazgos = useMemo(
    () =>
      construirHallazgos({
        concepto: concepto ? etiquetaConcepto(concepto, grupos).principal : conceptoId,
        periodo,
        participacionValida,
        kpis: resumen?.kpis ?? null,
        filas: resumen?.por_institucion ?? [],
        seleccion: institucionesSeleccionadas,
        series: series?.series ?? [],
        comparacion: comparacionEfectiva,
        indicadores,
        indicadoresPeriodo: periodo,
        esFlujo: Boolean(esFlujo),
      }),
    [
      concepto,
      grupos,
      conceptoId,
      periodo,
      participacionValida,
      resumen,
      institucionesSeleccionadas,
      series,
      comparacionEfectiva,
      indicadores,
      esFlujo,
    ],
  );
  const avisoVigencia = avisoDeVigencia(vigente, actualizando);

  /** Enfoca el panel correspondiente sin tocar los filtros. */
  const enfocarPanel = useCallback((panel: PanelDestino) => {
    const nodo = document.querySelector<HTMLElement>(`[data-testid="panel-${panel}"]`);
    if (!nodo) return;
    nodo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    nodo.classList.add('is-enfocado');
    window.setTimeout(() => nodo.classList.remove('is-enfocado'), 1800);
  }, []);

  const filtrosTexto = useMemo(() => {
    const etiqueta = concepto ? etiquetaConcepto(concepto, grupos) : null;
    return `${etiqueta?.completa ?? conceptoId} · ${etiquetaPeriodo(periodo)} · ${
      institucionesSeleccionadas.length > 0
        ? `${institucionesSeleccionadas.length} bancos`
        : 'sector completo'
    }`;
  }, [concepto, grupos, conceptoId, periodo, institucionesSeleccionadas]);

  if (catalogoQuery.isError) {
    return (
      <div className="bm-app">
        <div className="bm-banner bm-banner--error" role="alert">
          <p className="bm-banner-title">No se pudo cargar el catálogo de la CNBV</p>
          <p>
            {(catalogoQuery.error as Error)?.message ??
              'La API no responde. Levántala con `python -m uvicorn app.main:app --port 8010`.'}
          </p>
          <button type="button" className="bm-btn" onClick={() => catalogoQuery.refetch()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!catalogo || !periodo || !conceptoId) {
    return (
      <div className="bm-app">
        <div className="bm-skeleton bm-skeleton--head" />
        <div className="bm-skeleton bm-skeleton--kpis" />
        <div className="bm-grid">
          <div className="bm-skeleton bm-skeleton--panel" />
          <div className="bm-skeleton bm-skeleton--panel" />
        </div>
        <p className="bm-loading" role="status">
          <span className="bm-spinner" aria-hidden="true" /> Consultando la API de la CNBV…
        </p>
      </div>
    );
  }

  return (
    <div className="bm-app" data-testid="app" data-filtros={filtrosTexto}>
      <AppBar
        area="Visualización"
        enDialogo={enDialogo}
        onAbrirFuentes={() => setFuentesAbierto(true)}
        onAmpliar={ampliar}
      />

      <TitleBlock
        periodo={periodo}
        concepto={concepto}
        grupos={grupos}
        periodos={catalogo.periodos}
        faltantes={faltantes}
        actualizando={actualizando}
      />

      <FilterBar
        catalogo={catalogo}
        periodo={periodo}
        concepto={concepto}
        grupos={grupos}
        instituciones={institucionesCatalogo}
        seleccion={institucionesSeleccionadas}
        resaltado={resaltado}
        puedeDeshacer={historial.length > 0}
        deshabilitado={false}
        colores={colores}
        patrones={patrones}
        onPeriodo={setPeriodo}
        onConcepto={setConcepto}
        onAlternar={onAlternar}
        onSeleccionarTodas={() => setInstituciones(bancos.map((banco) => banco.institucion_id))}
        onLimpiarSeleccion={() => setInstituciones([])}
        onDeshacer={deshacer}
        onRestablecer={restablecer}
      />

      {resumen && resumen.kpis ? (
        <Kpis
          kpis={resumen.kpis}
          comparacion={resumen.comparacion}
          concepto={concepto}
          grupos={grupos}
          periodo={periodo}
          seleccion={seleccion}
          totalInstituciones={bancos.length}
          actualizando={resumenQuery.isFetching}
        />
      ) : (
        <div className="bm-skeleton bm-skeleton--kpis" />
      )}

      {/* Una sola sección de hallazgos: se monta en el bloque superior de la
          ficha (antes del dashboard) con el mismo estado y los mismos datos. */}
      {hostHallazgos
        ? createPortal(
            <Hallazgos
              hallazgos={resultadoHallazgos.hallazgos}
              omitidos={resultadoHallazgos.omitidos}
              invitacion={resultadoHallazgos.invitacion}
              avisoVigencia={avisoVigencia}
              actualizando={actualizando}
              onVerEnGrafico={enfocarPanel}
              onAbrirFuentes={() => setFuentesAbierto(true)}
              variante="ficha"
            />,
            hostHallazgos,
          )
        : (
            <Hallazgos
              hallazgos={resultadoHallazgos.hallazgos}
              omitidos={resultadoHallazgos.omitidos}
              invitacion={resultadoHallazgos.invitacion}
              avisoVigencia={avisoVigencia}
              actualizando={actualizando}
              onVerEnGrafico={enfocarPanel}
              onAbrirFuentes={() => setFuentesAbierto(true)}
            />
          )}

      <div className="bm-grid">
        <section className="bm-panel bm-panel--rank" aria-labelledby="bm-t-rank" data-testid="panel-ranking">
          <div className="bm-panel-head">
            <h3 id="bm-t-rank">
              {participacionValida ? 'Participación por institución' : 'Importe por institución'}
            </h3>
            <p className="bm-panel-sub">
              {concepto ? etiquetaConcepto(concepto, grupos).principal : ''} ·{' '}
              {etiquetaPeriodo(periodo)}
            </p>
          </div>
          {resumen ? (
            <Ranking
              filas={resumen.por_institucion}
              valorSistema={resumen.kpis.valor_sistema}
              seleccion={institucionesSeleccionadas}
              resaltado={resaltado}
              colores={colores}
              sinSeleccion={institucionesSeleccionadas.length === 0}
              participacionValida={participacionValida}
              onHover={onHover}
              onAlternar={onAlternar}
            />
          ) : (
            <div className="bm-skeleton bm-skeleton--panel" />
          )}
        </section>

        <section className="bm-panel bm-panel--evol" aria-labelledby="bm-t-evol" data-testid="panel-evolucion">
          <div className="bm-panel-head">
            <h3 id="bm-t-evol">Crecimiento frente al sector</h3>
            <p className="bm-panel-sub">
              {modoEfectivo === 'crecimiento'
                ? `Índice base 100 · ${etiquetaPeriodo(base100.base ?? '')} = 100 · sistema y selección`
                : `${esPorcentaje ? '% publicado' : unidadEvolucion.etiqueta} · ${
                    institucionesSeleccionadas.length > 0 ? 'instituciones seleccionadas' : 'sistema'
                  }`}
            </p>
          </div>
          {series && resumen ? (
            <Evolution
              series={series.series}
              periodos={series.periodos}
              ventana={ventana}
              periodoReferencia={periodo}
              modo={modoEfectivo}
              base100={base100}
              onModo={setModo}
              onVentana={setVentana}
              onPeriodo={setPeriodo}
              seleccion={institucionesSeleccionadas}
              resaltado={resaltado}
              colores={colores}
              patrones={patrones}
              onHover={onHover}
              onAlternar={onAlternar}
              variacionReferencia={resumen.comparacion.variacion_sistema_pct}
              periodoComparado={resumen.comparacion.periodo_comparado}
              unidad={unidadEvolucion}
              esPorcentaje={esPorcentaje}
              esFlujo={Boolean(esFlujo)}
              comparacion={comparacionEfectiva}
              onComparacion={setComparacion}
            />
          ) : (
            <div className="bm-skeleton bm-skeleton--panel" />
          )}
        </section>

        <section className="bm-panel bm-panel--scatter" aria-labelledby="bm-t-scatter" data-testid="panel-dispersion">
          <div className="bm-panel-head">
            <h3 id="bm-t-scatter">Mapa de rentabilidad</h3>
            <p className="bm-panel-sub">
              ROA frente a ROE · {etiquetaPeriodo(periodo)}
            </p>
          </div>
          {puntosDispersion.length >= 2 ? (
            <Scatter
              puntos={puntosDispersion}
              seleccion={institucionesSeleccionadas}
              resaltado={resaltado}
              colores={colores}
              sinSeleccion={institucionesSeleccionadas.length === 0}
              periodo={periodo}
              totalInstituciones={bancos.length}
              onHover={onHover}
              onAlternar={onAlternar}
              onSeleccionarVarios={(ids) =>
                setInstituciones((previas) => [...new Set([...previas, ...ids])])
              }
              onLimpiarRecuadro={() => undefined}
            />
          ) : (
            <p className="bm-panel-note">
              El boletín de este periodo no publica ROA y ROE para al menos dos instituciones.
            </p>
          )}
        </section>

        <section className="bm-panel bm-panel--tabla" aria-labelledby="bm-t-tabla" data-testid="panel-tabla">
          <div className="bm-panel-head">
            <h3 id="bm-t-tabla">Instituciones</h3>
            <p className="bm-panel-sub">
              {institucionesSeleccionadas.length > 0
                ? `selección de ${institucionesSeleccionadas.length} · clic en la fila para quitar`
                : 'universo del boletín · clic en una fila para comparar'}
            </p>
          </div>
          <div className="bm-split">
            <DetailTable
              detalle={detalle}
              resumen={resumen}
              indicadores={indicadores}
              seleccion={institucionesSeleccionadas}
              resaltado={resaltado}
              colores={colores}
              patrones={patrones}
              concepto={concepto}
              onHover={onHover}
              onAlternar={onAlternar}
              actualizando={detalleQuery.isFetching}
            />
            {/* El panel lateral aparece al señalar una fila o con un solo banco
                comparado; con dos o más la tabla ocupa todo el ancho. */}
            {institucionesSeleccionadas.length === 1 ||
            (institucionesSeleccionadas.length === 0 && resaltado) ? (
              <BankPanel
                resumen={resumen}
                indicadores={indicadores}
                filas={resumen?.por_institucion ?? []}
                seleccion={institucionesSeleccionadas}
                resaltado={resaltado}
                colores={colores}
                patrones={patrones}
                onAlternar={onAlternar}
                onHover={onHover}
                actualizando={resumenQuery.isFetching}
              />
            ) : null}
          </div>
        </section>
      </div>

      <footer className="bm-foot">
        <p className="bm-foot-coverage" data-testid="pie-cobertura">
          {catalogo.periodos.length} periodos disponibles ·{' '}
          {etiquetaPeriodo(catalogo.periodos[0] ?? '')}–{etiquetaPeriodo(catalogo.periodos[catalogo.periodos.length - 1] ?? '')}
          {faltantes.length > 0 ? ` · faltan ${faltantes.length} meses de boletín` : ''} · importado{' '}
          {boletin?.importado_en ? new Date(boletin.importado_en).toLocaleDateString('es-MX') : '—'}
        </p>
        <button type="button" className="bm-foot-link" onClick={() => setFuentesAbierto(true)}>
          <IconoDesplegar tamano={14} />
          Fuentes y metodología
        </button>
      </footer>

      <Sources
        abierto={fuentesAbierto}
        onAbierto={setFuentesAbierto}
        catalogo={catalogo}
        boletin={boletin}
        advertencias={resumen?.advertencias ?? catalogo.advertencias}
      />
    </div>
  );
}

export function DashboardApp({ apiBase }: PropsApp) {
  return (
    <QueryClientProvider client={clienteConsulta}>
      <App apiBase={apiBase} />
    </QueryClientProvider>
  );
}

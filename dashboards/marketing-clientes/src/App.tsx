/**
 * Tablero «Marketing y clientes · Adquisición, conversión y retención».
 *
 * Cuatro vistas conectadas por un mismo estado de filtros:
 *
 *  · **Resumen**: indicadores, evolución diaria y comparación con el periodo
 *    anterior cuando la ventana existe completa; tabla de detalle y exportación.
 *  · **Adquisición**: fuente y medio de adquisición del usuario, con compradores y
 *    conversión por canal.
 *  · **Conversión**: embudo por sesiones con orden y ventana documentados.
 *  · **Cohortes y retención**: matriz semanal de primera actividad observada, con
 *    retención y recompra separadas.
 *
 * Si no hay una versión publicada (este entorno no tiene acceso a BigQuery), cada
 * vista muestra su estructura y el estado «datos pendientes»: nunca cifras
 * inventadas ni ceros que parezcan resultados.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Cliente } from './api/cliente';
import { crearCliente } from './api/cliente';
import {
  useAdquisicion,
  useCatalogo,
  useCohortes,
  useConversion,
  useEstado,
  useProductos,
  useResumen,
} from './consultas';
import { claveDe, etiquetaRango, hayFiltros, parametrosDe } from './dominio';
import { enlaceCompartible, estadoDesdeUrl, sincronizarUrl, useAppStore } from './estado';
import type { Metrica } from './paleta';
import { Adquisicion } from './ui/Adquisicion';
import { Cohortes } from './ui/Cohortes';
import { Conversion } from './ui/Conversion';
import { Encabezado } from './ui/Encabezado';
import { BarraFiltros } from './ui/Filtros';
import { Cobertura } from './ui/Cobertura';
import { Kpis } from './ui/Kpis';
import { Metodologia } from './ui/Metodologia';
import { LollipopFuente } from './ui/LollipopFuente';
import { SankeyAdquisicion } from './ui/SankeyAdquisicion';
import { Serie } from './ui/Serie';
import { SinDatos } from './ui/SinDatos';

export interface PropsApp {
  apiBase: string;
}

const clienteConsulta = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, gcTime: 15 * 60 * 1000 },
  },
});

function App({ apiBase }: PropsApp) {
  const cliente: Cliente = useMemo(() => crearCliente(apiBase), [apiBase]);
  const estadoQuery = useEstado(cliente);

  const vista = useAppStore((s) => s.vista);
  const filtros = useAppStore((s) => s.filtros);
  const dimensionCohorte = useAppStore((s) => s.dimensionCohorte);
  const sentido = useAppStore((s) => s.sentido);
  const periodoObservado = useAppStore((s) => s.periodoObservado);

  const iniciar = useAppStore((s) => s.iniciar);
  const setVista = useAppStore((s) => s.setVista);
  const setDimensionCohorte = useAppStore((s) => s.setDimensionCohorte);
  const setPeriodo = useAppStore((s) => s.setPeriodo);
  const alternarValor = useAppStore((s) => s.alternarValor);
  const limpiarDimension = useAppStore((s) => s.limpiarDimension);
  const restablecer = useAppStore((s) => s.restablecer);

  const [metodologiaAbierta, setMetodologiaAbierta] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  const [metrica, setMetrica] = useState<Metrica>('usuarios');

  const catalogoQuery = useCatalogo(cliente, filtros);
  const estado = estadoQuery.data;
  const catalogo = catalogoQuery.data ?? null;
  const disponible = Boolean(estado?.datos_disponibles);

  /* Enlace compartido: se lee una sola vez, antes de que algún efecto reescriba
     la URL; si se leyera después, la proyección del estado ya la habría limpiado. */
  const instantaneaUrl = useMemo(() => estadoDesdeUrl(), []);

  useEffect(() => {
    if (!estado) return;
    iniciar({
      periodoObservado: estado.periodo ?? { desde: null, hasta: null },
      ...(instantaneaUrl ?? {}),
    });
  }, [estado, iniciar, instantaneaUrl]);

  useEffect(() => {
    if (!periodoObservado.desde && !estado) return;
    sincronizarUrl(useAppStore.getState());
  }, [
    estado,
    periodoObservado,
    vista,
    filtros,
    dimensionCohorte,
    sentido,
  ]);

  useEffect(() => {
    const actualizar = () => setAmpliado(Boolean(document.querySelector('dialog.demo-dialog[open]')));
    actualizar();
    const observador = new MutationObserver(actualizar);
    observador.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => observador.disconnect();
  }, []);

  const resumenQuery = useResumen(cliente, filtros, disponible);
  const adquisicionQuery = useAdquisicion(cliente, filtros, disponible && vista === 'adquisicion');
  const conversionQuery = useConversion(cliente, filtros, disponible && vista === 'conversion');
  const cohortesQuery = useCohortes(
    cliente,
    filtros,
    dimensionCohorte,
    disponible && vista === 'cohortes',
  );
  const productosQuery = useProductos(cliente, filtros, disponible && vista === 'adquisicion');

  const actualizando =
    estadoQuery.isFetching ||
    resumenQuery.isFetching ||
    adquisicionQuery.isFetching ||
    conversionQuery.isFetching ||
    cohortesQuery.isFetching;

  const onCompartir = useCallback(() => {
    const url = enlaceCompartible(useAppStore.getState());
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 2200);
        })
        .catch(() => window.prompt('Copia el enlace del tablero:', url));
      return;
    }
    window.prompt('Copia el enlace del tablero:', url);
  }, []);

  const onExportar = useCallback(() => {
    if (!disponible) return;
    window.location.assign(cliente.urlExportar(parametrosDe(filtros)));
  }, [cliente, disponible, filtros]);

  const onAmpliar = useCallback(() => {
    const api = (window as unknown as { PORTFOLIO_DEMO?: { alternar?: () => void } }).PORTFOLIO_DEMO;
    if (api?.alternar) {
      api.alternar();
      return;
    }
    const cerrar = document.querySelector<HTMLButtonElement>('#demo-close');
    if (ampliado && cerrar) cerrar.click();
  }, [ampliado]);

  if (estadoQuery.isError) {
    return (
      <div className="mk-app">
        <div className="mk-aviso mk-aviso--error" role="alert">
          <p className="mk-aviso-title">No se pudo consultar el estado del tablero</p>
          <p>
            {(estadoQuery.error as Error)?.message ??
              'La API no responde. Levántala con `python -m uvicorn app.main:app --port 8010`.'}
          </p>
          <button type="button" className="mk-btn mk-btn--primario" onClick={() => estadoQuery.refetch()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!estado) {
    return (
      <div className="mk-app">
        <div className="mk-skeleton mk-skeleton--head" />
        <div className="mk-skeleton mk-skeleton--kpis" />
        <div className="mk-skeleton mk-skeleton--panel" />
        <p className="mk-cargando" role="status">
          <span className="mk-spinner" aria-hidden="true" /> Consultando la API de marketing…
        </p>
      </div>
    );
  }

  const resumen = resumenQuery.data ?? null;
  const vacio = !disponible;

  return (
    <div className="mk-app" data-testid="app" data-filtros={claveDe(filtros)} data-disponible={disponible}>
      <Encabezado
        vista={vista}
        onVista={setVista}
        estado={estado}
        hayFiltros={hayFiltros(filtros)}
        onRestablecer={restablecer}
        onCompartir={onCompartir}
        onMetodologia={() => setMetodologiaAbierta(true)}
        onExportar={onExportar}
        onAmpliar={onAmpliar}
        ampliado={ampliado}
        copiado={copiado}
        actualizando={actualizando}
        exportable={disponible}
      />

      <BarraFiltros
        catalogo={catalogo}
        filtros={filtros}
        onPeriodo={setPeriodo}
        onAlternar={alternarValor}
        onLimpiar={limpiarDimension}
        onRestablecer={restablecer}
      />

      {vacio ? <SinDatos estado={estado} /> : null}

      <Kpis resumen={resumen} cargando={resumenQuery.isFetching} />

      <Cobertura estado={estado} resumen={resumen} cargando={resumenQuery.isFetching} />

      {vista === 'resumen' ? (
        <>
          <Serie
            serie={resumen?.serie ?? []}
            metrica={metrica}
            onMetrica={setMetrica}
            onDia={(fecha) => setPeriodo(fecha, fecha)}
            cargando={resumenQuery.isFetching}
            vacio={vacio}
          />

          <SankeyAdquisicion
            datos={resumen?.sankey ?? null}
            onCanal={(canal) => alternarValor('canales', canal)}
            onDispositivo={(dispositivo) => alternarValor('dispositivos', dispositivo)}
            seleccionados={filtros.canales}
            dispositivosSeleccionados={filtros.dispositivos}
            vacio={vacio}
            cargando={resumenQuery.isFetching}
          />

          <LollipopFuente
            datos={resumen?.conversion_fuente ?? null}
            onCanal={(canal) => alternarValor('canales', canal)}
            seleccionados={filtros.canales}
            vacio={vacio}
            cargando={resumenQuery.isFetching}
          />

          {/* El modelo compacto no almacena eventos: no hay tabla de detalle. */}
        </>
      ) : null}

      {vista === 'adquisicion' ? (
        <Adquisicion
          datos={adquisicionQuery.data ?? null}
          productos={productosQuery.data ?? null}
          vacio={vacio}
          seleccionados={filtros.canales}
          onCanal={(canal) => alternarValor('canales', canal)}
          cargando={adquisicionQuery.isFetching}
        />
      ) : null}

      {vista === 'conversion' ? (
        <Conversion
          datos={conversionQuery.data ?? null}
          vacio={vacio}
          cargando={conversionQuery.isFetching}
        />
      ) : null}

      {vista === 'cohortes' ? (
        <Cohortes
          datos={cohortesQuery.data ?? null}
          dimension={dimensionCohorte}
          onDimension={setDimensionCohorte}
          vacio={vacio}
          cargando={cohortesQuery.isFetching}
        />
      ) : null}

      <footer className="mk-foot">
        <p className="mk-foot-texto">
          {estado.fuente.conjunto} · datos ofuscados · {etiquetaRango(estado.periodo?.desde ?? null, estado.periodo?.hasta ?? null)} ·{' '}
          {estado.version ?? 'sin versión publicada'}
        </p>
        <button type="button" className="mk-foot-link" onClick={() => setMetodologiaAbierta(true)}>
          Metodología y datos
        </button>
      </footer>

      <Metodologia
        abierto={metodologiaAbierta}
        onAbierto={setMetodologiaAbierta}
        catalogo={catalogo}
        estado={estado}
      />
    </div>
  );
}

export function MarketingApp({ apiBase }: PropsApp) {
  return (
    <QueryClientProvider client={clienteConsulta}>
      <App apiBase={apiBase} />
    </QueryClientProvider>
  );
}


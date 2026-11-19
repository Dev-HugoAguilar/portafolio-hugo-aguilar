/**
 * Tablero «Atlas vial · Ciudad de México».
 *
 * Composición por vista, siempre con el mismo encabezado, los mismos filtros y
 * los mismos indicadores:
 *
 *  · **Territorio** (inicial): indicadores · mapa (2/3) + panel contextual (1/3) ·
 *    línea temporal · comparación de dos alcaldías · tabla y exportación;
 *  · **Tiempo y entorno vial**: serie con selección de intervalo, matriz día ×
 *    hora y distribuciones del entorno;
 *  · **Personas y vehículos**: cobertura y desgloses de personas y vehículos.
 *
 * Los datos vienen siempre de la API real del backend. El estado es uno solo
 * (Zustand) y todas las consultas comparten los mismos filtros.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Cliente } from './api/cliente';
import { crearCliente } from './api/cliente';
import {
  useCatalogo,
  useComparacion,
  useGeometria,
  usePersonas,
  usePuntos,
  useResumen,
  useTabla,
  useTerritorio,
  useTiempo,
} from './consultas';
import {
  claveDe,
  etiquetaRango,
  numero,
  parametrosDe,
} from './dominio';
import { estadoDesdeUrl, sincronizarUrl, useAppStore } from './estado';
import { BarraFiltros } from './ui/BarraFiltros';
import { Comparador } from './ui/Comparador';
import { Encabezado } from './ui/Encabezado';
import { Hallazgos } from './ui/Hallazgos';
import { Indicadores } from './ui/Indicadores';
import { LineaTiempo } from './ui/LineaTiempo';
import { Mapa } from './ui/Mapa';
import { Metodologia } from './ui/Metodologia';
import { PanelContextual } from './ui/PanelContextual';
import { Tabla } from './ui/Tabla';
import { VistaPersonas } from './ui/VistaPersonas';
import { VistaTiempo } from './ui/VistaTiempo';

export interface PropsApp {
  apiBase: string;
}

const clienteConsulta = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      gcTime: 15 * 60 * 1000,
    },
  },
});

function App({ apiBase }: PropsApp) {
  const cliente: Cliente = useMemo(() => crearCliente(apiBase), [apiBase]);
  const catalogoQuery = useCatalogo(cliente);
  const geometriaQuery = useGeometria(cliente);

  const vista = useAppStore((estado) => estado.vista);
  const filtros = useAppStore((estado) => estado.filtros);
  const modoMapa = useAppStore((estado) => estado.modoMapa);
  const metricaMapa = useAppStore((estado) => estado.metricaMapa);
  const agregacion = useAppStore((estado) => estado.agregacion);
  const alcaldiaSeleccionada = useAppStore((estado) => estado.alcaldiaSeleccionada);
  const folioSeleccionado = useAppStore((estado) => estado.folioSeleccionado);
  const compararA = useAppStore((estado) => estado.compararA);
  const compararB = useAppStore((estado) => estado.compararB);
  const orden = useAppStore((estado) => estado.orden);
  const sentido = useAppStore((estado) => estado.sentido);
  const pagina = useAppStore((estado) => estado.pagina);
  const tamano = useAppStore((estado) => estado.tamano);
  const periodoPublicado = useAppStore((estado) => estado.periodoPublicado);

  const iniciar = useAppStore((estado) => estado.iniciar);
  const setVista = useAppStore((estado) => estado.setVista);
  const setModoMapa = useAppStore((estado) => estado.setModoMapa);
  const setMetricaMapa = useAppStore((estado) => estado.setMetricaMapa);
  const setAgregacion = useAppStore((estado) => estado.setAgregacion);
  const alternarValor = useAppStore((estado) => estado.alternarValor);
  const limpiarDimension = useAppStore((estado) => estado.limpiarDimension);
  const setPeriodo = useAppStore((estado) => estado.setPeriodo);
  const setFiltro = useAppStore((estado) => estado.setFiltro);
  const alternarZonaVisible = useAppStore((estado) => estado.alternarZonaVisible);
  const seleccionarAlcaldia = useAppStore((estado) => estado.seleccionarAlcaldia);
  const seleccionarFolio = useAppStore((estado) => estado.seleccionarFolio);
  const setComparar = useAppStore((estado) => estado.setComparar);
  const setOrden = useAppStore((estado) => estado.setOrden);
  const setPagina = useAppStore((estado) => estado.setPagina);
  const setResaltado = useAppStore((estado) => estado.setResaltado);
  const restablecerFiltros = useAppStore((estado) => estado.restablecerFiltros);

  const [fuentesAbierto, setFuentesAbierto] = useState(false);
  const [comparacionModo, setComparacionModo] = useState<'volumen' | 'composicion'>('volumen');
  const [copiado, setCopiado] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  /** Contenedor de «Hallazgos del análisis» en la ficha del proyecto. */
  const [hostHallazgos, setHostHallazgos] = useState<HTMLElement | null>(null);

  /* La ficha reserva el bloque «Hallazgos del análisis» antes del tablero y el
     propio módulo lo rellena: aquí se toma el nodo y se retira el aviso de
     espera para que React sea el único dueño del contenido. */
  useEffect(() => {
    const host = document.getElementById('hallazgos-host');
    if (!host) return;
    host.textContent = '';
    setHostHallazgos(host);
  }, []);

  /* «Ampliar» usa el único mecanismo del portafolio (window.PORTFOLIO_DEMO):
     el tablero se lleva a un panel a pantalla completa dentro del mismo sitio. */
  useEffect(() => {
    const actualizar = () =>
      setAmpliado(Boolean(document.querySelector('dialog.demo-dialog[open]')));
    actualizar();
    const observador = new MutationObserver(actualizar);
    observador.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    return () => observador.disconnect();
  }, []);

  const alternarAmpliado = useCallback(() => {
    const api = (window as unknown as {
      PORTFOLIO_DEMO?: { alternar?: () => void };
    }).PORTFOLIO_DEMO;
    if (api?.alternar) {
      api.alternar();
      return;
    }
    const cerrar = document.querySelector<HTMLButtonElement>('#demo-close');
    if (ampliado && cerrar) cerrar.click();
  }, [ampliado]);

  /* Se lee la URL **una sola vez, antes de cualquier efecto**: si se leyera más
     tarde, el efecto que proyecta el estado en la URL ya habría borrado los
     parámetros del enlace compartido. */
  const instantaneaUrl = useMemo(() => estadoDesdeUrl(), []);

  /* Arranque: se restaura el enlace compartido o se usa el periodo publicado. */
  useEffect(() => {
    const catalogo = catalogoQuery.data;
    if (!catalogo) return;
    iniciar({
      periodoPublicado: catalogo.filtros.periodo,
      ...(instantaneaUrl ?? {}),
    });
  }, [catalogoQuery.data, iniciar, instantaneaUrl]);

  /* La URL es una proyección del estado: se actualiza sin recargar. Se lee el
     estado del almacén en el momento del efecto para no suscribir a todo, y no
     se escribe hasta que el estado está inicializado (si no, se borraría el
     enlace compartido antes de restaurarlo). */
  useEffect(() => {
    if (!periodoPublicado.desde) return;
    sincronizarUrl(useAppStore.getState());
  }, [
    periodoPublicado,
    vista,
    filtros,
    modoMapa,
    metricaMapa,
    agregacion,
    alcaldiaSeleccionada,
    folioSeleccionado,
    compararA,
    compararB,
    orden,
    sentido,
    pagina,
  ]);

  const habilitado = Boolean(catalogoQuery.data && periodoPublicado.desde);

  const resumenQuery = useResumen(cliente, filtros, habilitado);
  const puntosQuery = usePuntos(cliente, filtros, habilitado && vista === 'territorio');
  const territorioQuery = useTerritorio(cliente, filtros, habilitado);
  const tiempoQuery = useTiempo(cliente, filtros, agregacion, habilitado);
  /* Agregado por alcaldía **sin** el filtro de alcaldía: es lo que permite
     comparar las 16 alcaldías en el panel derecho aunque haya una seleccionada.
     Mismo endpoint y mismos datos, solo sin esa dimensión. */
  const territorioComparacionQuery = useTerritorio(cliente, { ...filtros, alcaldias: [] }, habilitado);
  const personasQuery = usePersonas(cliente, filtros, habilitado && vista === 'personas');
  const tablaQuery = useTabla(
    cliente,
    filtros,
    { orden, sentido, pagina, tamano },
    habilitado && vista === 'territorio',
  );
  const comparacionQuery = useComparacion(
    cliente,
    filtros,
    [compararA, compararB].filter((valor): valor is string => Boolean(valor)),
    habilitado && Boolean(compararA) && Boolean(compararB) && compararA !== compararB,
  );

  const actualizando =
    resumenQuery.isFetching ||
    puntosQuery.isFetching ||
    territorioQuery.isFetching ||
    tiempoQuery.isFetching;

  const onAlternar = useCallback(
    (
      dimension:
        | 'alcaldias'
        | 'tiposEvento'
        | 'consecuencias'
        | 'tiposUsuario'
        | 'tiposVehiculo'
        | 'vialidades'
        | 'semaforizada'
        | 'sexos',
      valor: string,
    ) => alternarValor(dimension, valor),
    [alternarValor],
  );

  const onCompartir = useCallback(() => {
    const url = window.location.href;
    const copiar = navigator.clipboard?.writeText(url);
    if (copiar) {
      copiar
        .then(() => {
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 2200);
        })
        .catch(() => setCopiado(false));
      return;
    }
    window.prompt('Copia el enlace del tablero con los filtros actuales:', url);
  }, []);

  /* Selección de alcaldía desde el mapa o desde los rankings del panel derecho:
     una sola alcaldía a la vez, aplicada al filtro global del tablero. */
  const seleccionarOFiltrarAlcaldia = useCallback(
    (alcaldia: string | null) => {
      const yaActiva =
        alcaldia !== null && filtros.alcaldias.length === 1 && filtros.alcaldias[0] === alcaldia;
      if (yaActiva || alcaldia === null) {
        setFiltro('alcaldias', []);
        seleccionarAlcaldia(null);
        return;
      }
      setFiltro('alcaldias', [alcaldia]);
      seleccionarAlcaldia(alcaldia);
    },
    [filtros.alcaldias, seleccionarAlcaldia, setFiltro],
  );

  const onExportar = useCallback(() => {
    const url = cliente.urlExportar(parametrosDe(filtros));
    window.location.assign(url);
  }, [cliente, filtros]);

  const alcaldiasDisponibles = useMemo(
    () => catalogoQuery.data?.filtros.alcaldias ?? [],
    [catalogoQuery.data],
  );

  if (catalogoQuery.isError) {
    return (
      <div className="at-app">
        <div className="at-aviso at-aviso--error" role="alert">
          <p className="at-aviso-title">No se pudo cargar el catálogo del Atlas vial</p>
          <p>
            {(catalogoQuery.error as Error)?.message ??
              'La API no responde. Levántala con `python -m uvicorn app.main:app --port 8010`.'}
          </p>
          <button type="button" className="at-btn at-btn--primario" onClick={() => catalogoQuery.refetch()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!catalogoQuery.data || !periodoPublicado.desde) {
    return (
      <div className="at-app">
        <div className="at-skeleton at-skeleton--head" />
        <div className="at-skeleton at-skeleton--kpis" />
        <div className="at-grid-mapa">
          <div className="at-skeleton at-skeleton--mapa" />
          <div className="at-skeleton at-skeleton--panel" />
        </div>
        <p className="at-cargando" role="status">
          <span className="at-spinner" aria-hidden="true" /> Consultando la API del Atlas vial…
        </p>
      </div>
    );
  }

  const catalogo = catalogoQuery.data;
  const resumen = resumenQuery.data ?? null;
  const territorio = territorioQuery.data ?? null;
  const tiempo = tiempoQuery.data ?? null;

  return (
    <div className="at-app" data-testid="app" data-filtros={claveDe(filtros)}>
      <Encabezado
        vista={vista}
        onVista={setVista}
        periodo={periodoPublicado}
        ultimaSincronizacion={catalogo.fuente.ultima_sincronizacion}
        version={catalogo.fuente.version}
        licencia={catalogo.fuente.licencia}
        onCompartir={onCompartir}
        onMetodologia={() => setFuentesAbierto(true)}
        onExportar={onExportar}
        onAmpliar={alternarAmpliado}
        ampliado={ampliado}
        copiado={copiado}
        actualizando={actualizando}
      />

      <BarraFiltros
        catalogo={catalogo}
        filtros={filtros}
        onAlternar={onAlternar}
        onLimpiar={limpiarDimension}
        onPeriodo={setPeriodo}
        onEdad={(min, max) => {
          setFiltro('edadMin', min);
          setFiltro('edadMax', max);
        }}
        onQuitarZona={() => alternarZonaVisible(null)}
        onRestablecer={restablecerFiltros}
      />

      <Indicadores resumen={resumen} cargando={resumenQuery.isFetching} />

      {/* Una sola sección de hallazgos: se monta en el bloque de la ficha del
          proyecto (antes del tablero) con el mismo estado y los mismos datos. */}
      {hostHallazgos
        ? createPortal(
            <Hallazgos
              resumen={resumen}
              alcaldias={territorio?.alcaldias ?? []}
              tiempo={tiempo}
              personas={personasQuery.data ?? null}
              cargando={resumenQuery.isFetching || territorioQuery.isFetching}
            />,
            hostHallazgos,
          )
        : null}

      {!hostHallazgos && vista === 'territorio' ? (
        <section className="at-panel at-panel--hallazgos" aria-labelledby="at-t-hallazgos">
          <div className="at-panel-head">
            <div>
              <h3 id="at-t-hallazgos">Hallazgos del análisis</h3>
              <p className="at-panel-sub">Calculados con los filtros vigentes</p>
            </div>
          </div>
          <Hallazgos
            resumen={resumen}
            alcaldias={territorio?.alcaldias ?? []}
            tiempo={tiempo}
            personas={personasQuery.data ?? null}
            cargando={resumenQuery.isFetching || territorioQuery.isFetching}
          />
        </section>
      ) : null}

      {vista === 'territorio' ? (
        <>
          <div className="at-grid-mapa">
            <Mapa
              geometria={geometriaQuery.data ?? null}
              alcaldias={territorio?.alcaldias ?? []}
              puntos={puntosQuery.data ?? null}
              metrica={metricaMapa}
              modo={modoMapa}
              alcaldiaSeleccionada={alcaldiaSeleccionada}
              alcaldiasFiltradas={filtros.alcaldias}
              folioSeleccionado={folioSeleccionado}
              filtrarPorZona={filtros.filtrarPorZona}
              cargando={puntosQuery.isFetching}
              onResaltado={setResaltado}
              onAlcaldia={seleccionarOFiltrarAlcaldia}
              onFolio={seleccionarFolio}
              onFiltrarZona={alternarZonaVisible}
              onModo={setModoMapa}
              onMetrica={setMetricaMapa}
            />

            <PanelContextual
              cliente={cliente}
              resumen={resumen}
              alcaldias={territorio?.alcaldias ?? []}
              alcaldiasComparacion={territorioComparacionQuery.data?.alcaldias ?? territorio?.alcaldias ?? []}
              alcaldiaSeleccionada={alcaldiaSeleccionada}
              folioSeleccionado={folioSeleccionado}
              onAlcaldia={seleccionarAlcaldia}
              onSeleccionarAlcaldia={seleccionarOFiltrarAlcaldia}
              tiposEvento={tiempoQuery.data?.distribuciones.tipo_evento ?? []}
              onFolio={seleccionarFolio}

            />
          </div>

          <LineaTiempo
            serie={tiempo?.serie ?? []}
            agregacion={tiempo?.agregacion ?? 'mes'}
            metrica={metricaMapa}
            onMetrica={setMetricaMapa}
            onPeriodo={setPeriodo}
            cargando={tiempoQuery.isFetching}
          />

          <Comparador
            alcaldiasDisponibles={alcaldiasDisponibles}
            compararA={compararA}
            compararB={compararB}
            onComparar={setComparar}
            comparacion={comparacionQuery.data ?? null}
            modo={comparacionModo}
            onModo={setComparacionModo}
            cargando={comparacionQuery.isFetching}
          />

          <Tabla
            datos={tablaQuery.data ?? null}
            folioSeleccionado={folioSeleccionado}
            orden={orden}
            sentido={sentido}
            loading={tablaQuery.isFetching}
            onOrden={setOrden}
            onPagina={setPagina}
            onFolio={(folio) => {
              /* Primero la alcaldía (que limpia el folio) y después el folio:
                 el panel debe abrir el hecho elegido en la tabla. */
              const fila = tablaQuery.data?.filas.find((item) => item.folio === folio);
              if (fila?.alcaldia) seleccionarAlcaldia(fila.alcaldia);
              seleccionarFolio(folio);
            }}
            onExportar={onExportar}
          />
        </>
      ) : null}

      {vista === 'tiempo' ? (
        <VistaTiempo
          datos={tiempo}
          filtros={filtros}
          metrica={metricaMapa}
          onMetrica={setMetricaMapa}
          agregacion={agregacion}
          onAgregacion={setAgregacion}
          onPeriodo={setPeriodo}
          onFiltro={(dimension, valor) => alternarValor(dimension, valor)}
          cargando={tiempoQuery.isFetching}
        />
      ) : null}

      {vista === 'personas' ? (
        <VistaPersonas
          datos={personasQuery.data ?? null}
          filtros={filtros}
          onFiltro={(dimension, valor) => alternarValor(dimension, valor)}
          cargando={personasQuery.isFetching}
        />
      ) : null}

      <footer className="at-foot">
        <p className="at-foot-texto">
          {numero(resumen?.indicadores.hechos.valor)} hechos ·{' '}
          {etiquetaRango(filtros.desde, filtros.hasta)} · fuente: SSC CDMX ·{' '}
          {catalogo.fuente.licencia} · versión {catalogo.fuente.version}
        </p>
        <button type="button" className="at-foot-link" onClick={() => setFuentesAbierto(true)}>
          Fuentes y metodología
        </button>
      </footer>

      <Metodologia abierto={fuentesAbierto} onAbierto={setFuentesAbierto} catalogo={catalogo} />
    </div>
  );
}

export function AtlasApp({ apiBase }: PropsApp) {
  return (
    <QueryClientProvider client={clienteConsulta}>
      <App apiBase={apiBase} />
    </QueryClientProvider>
  );
}









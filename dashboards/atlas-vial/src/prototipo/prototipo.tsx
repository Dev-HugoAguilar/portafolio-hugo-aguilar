/**
 * Prototipo aislado — encabezado, navegación y filtros de Atlas vial.
 *
 * Composición de referencia (no modifica el tablero):
 *  · navegación abierta sobre el fondo de la página, con línea inferior animada;
 *  · barra de filtros continua, dividida en zonas por divisores suaves;
 *  · fila contextual de etiquetas + una acción «Limpiar filtros» y ayuda OR/AND.
 *
 * Los datos son los reales del tablero (catálogo y resumen de la API). Los
 * filtros secundarios de «Más filtros» se representan con sus catálogos reales;
 * las interacciones analíticas del cuerpo del tablero (mapa, tablas, gráficos)
 * no forman parte de este prototipo.
 */

import * as Popover from '@radix-ui/react-popover';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react';

import { crearCliente, resolverApiBase, type ParametrosFiltro } from '../api/cliente';
import type { Catalogo, OpcionFiltro, Resumen } from '../api/tipos';
import { etiquetaFecha } from '../dominio';
import {
  anioDeCobertura,
  etiquetaMeses,
  leerPeriodo,
  limitesDeMeses,
  mesesDe,
} from '../periodo';
import {
  IconoAmpliar,
  IconoBuscar,
  IconoChevron,
  IconoDescarga,
  IconoEnlace,
  IconoFiltro,
  IconoInformacion,
  IconoMapa,
  IconoPersonas,
  IconoReiniciar,
  IconoTiempo,
} from '../ui/iconos';

import './prototipo.css';

type Vista = 'territorio' | 'tiempo' | 'personas';

interface Estado {
  desde: string | null;
  hasta: string | null;
  alcaldias: string[];
  tiposEvento: string[];
  consecuencias: string[];
  tiposUsuario: string[];
  tiposVehiculo: string[];
  vialidades: string[];
  semaforizada: string[];
  sexos: string[];
  edadMin: number | null;
  edadMax: number | null;
}

const ESTADO_INICIAL: Estado = {
  desde: null,
  hasta: null,
  alcaldias: [],
  tiposEvento: [],
  consecuencias: [],
  tiposUsuario: [],
  tiposVehiculo: [],
  vialidades: [],
  semaforizada: [],
  sexos: [],
  edadMin: null,
  edadMax: null,
};

const VISTAS: { id: Vista; etiqueta: string; icono: (p: { tamano?: number }) => ReactElement }[] = [
  { id: 'territorio', etiqueta: 'Territorio', icono: IconoMapa },
  { id: 'tiempo', etiqueta: 'Tiempo y entorno vial', icono: IconoTiempo },
  { id: 'personas', etiqueta: 'Personas y vehículos', icono: IconoPersonas },
];

const ETIQUETA_CONSECUENCIA: Record<string, string> = {
  solo_danos: 'Solo daños',
  con_lesionados: 'Con personas lesionadas',
  con_fallecidos: 'Con personas fallecidas',
};

const ETIQUETA_SEMAFORO: Record<string, string> = {
  si: 'Sí',
  no: 'No',
  sin_dato: 'Sin dato',
};

interface Opcion {
  valor: string;
  etiqueta: string;
}

function aNumero(valor: number | null | undefined): string {
  return typeof valor === 'number' ? new Intl.NumberFormat('es-MX').format(Math.round(valor)) : 'Sin dato';
}

function parametrosDe(estado: Estado): ParametrosFiltro {
  const params: ParametrosFiltro = [];
  if (estado.desde) params.push(['desde', estado.desde]);
  if (estado.hasta) params.push(['hasta', estado.hasta]);
  for (const valor of estado.alcaldias) params.push(['alcaldia', valor]);
  for (const valor of estado.tiposEvento) params.push(['tipo_evento', valor]);
  for (const valor of estado.consecuencias) params.push(['consecuencia', valor]);
  for (const valor of estado.tiposUsuario) params.push(['tipo_usuario', valor]);
  for (const valor of estado.tiposVehiculo) params.push(['tipo_vehiculo', valor]);
  for (const valor of estado.vialidades) params.push(['vialidad', valor]);
  for (const valor of estado.semaforizada) params.push(['semaforizada', valor]);
  for (const valor of estado.sexos) params.push(['sexo', valor]);
  if (estado.edadMin !== null) params.push(['edad_min', String(estado.edadMin)]);
  if (estado.edadMax !== null) params.push(['edad_max', String(estado.edadMax)]);
  return params;
}

function resumenDe(opciones: Opcion[], seleccion: string[]): string {
  if (seleccion.length === 0) return 'Todas';
  const nombre = (valor: string) => opciones.find((o) => o.valor === valor)?.etiqueta ?? valor;
  const primero = seleccion[0] ?? '';
  return seleccion.length === 1 ? nombre(primero) : `${nombre(primero)} +${seleccion.length - 1}`;
}

/* ---------------------------------------------------------------- iconos */

function IconoCalendario({ tamano = 18 }: { tamano?: number }) {
  return (
    <svg className="pt-icono" width={tamano} height={tamano} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12.5" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconoPin({ tamano = 18 }: { tamano?: number }) {
  return (
    <svg className="pt-icono" width={tamano} height={tamano} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 17s5.5-5.1 5.5-8.6A5.5 5.5 0 1 0 4.5 8.4C4.5 11.9 10 17 10 17Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8.3" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconoTriangulo({ tamano = 18 }: { tamano?: number }) {
  return (
    <svg className="pt-icono" width={tamano} height={tamano} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3.5 17.5 16.5H2.5L10 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconoBalanza({ tamano = 18 }: { tamano?: number }) {
  return (
    <svg className="pt-icono" width={tamano} height={tamano} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3v14M4 6.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 6.5 4 12h5L6.5 6.5ZM13.5 6.5 11 12h5l-2.5-5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------- pestañas */

function Navegacion({ vista, onVista }: { vista: Vista; onVista: (v: Vista) => void }) {
  const raiz = useRef<HTMLDivElement>(null);
  const [linea, setLinea] = useState({ x: 0, w: 0, lista: false });

  const medir = useCallback(() => {
    const contenedor = raiz.current;
    const activo = contenedor?.querySelector<HTMLButtonElement>('.pt-nav-btn[aria-current="page"]');
    if (!contenedor || !activo) return;
    setLinea((previa) => {
      const siguiente = { x: activo.offsetLeft, w: activo.offsetWidth, lista: true };
      return previa.lista && Math.abs(previa.x - siguiente.x) < 0.5 && Math.abs(previa.w - siguiente.w) < 0.5
        ? previa
        : siguiente;
    });
  }, []);

  useEffect(() => {
    medir();
    const contenedor = raiz.current;
    if (!contenedor || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(contenedor);
    for (const boton of contenedor.querySelectorAll('button')) observador.observe(boton);
    window.addEventListener('resize', medir);
    void document.fonts?.ready.then(medir).catch(() => undefined);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [medir, vista]);

  return (
    <div className="pt-nav" ref={raiz} role="tablist" aria-label="Vistas del tablero">
      {VISTAS.map(({ id, etiqueta, icono: Icono }) => (
        <button
          key={id}
          type="button"
          role="tab"
          className="pt-nav-btn"
          aria-current={vista === id ? 'page' : undefined}
          aria-selected={vista === id}
          tabIndex={vista === id ? 0 : -1}
          onClick={() => onVista(id)}
        >
          <Icono tamano={19} />
          <span className="pt-nav-etq">{etiqueta}</span>
          <span className="pt-nav-corta">{etiqueta.split(' ')[0]}</span>
        </button>
      ))}
      <span
        className="pt-nav-linea"
        aria-hidden="true"
        data-lista={linea.lista ? 'si' : 'no'}
        style={{ ['--x' as string]: `${linea.x}px`, ['--w' as string]: `${linea.w}px` }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- panel */

function PanelOpciones({
  titulo,
  opciones,
  seleccion,
  onAlternar,
  onLimpiar,
  onVolver,
}: {
  titulo: string;
  opciones: Opcion[];
  seleccion: string[];
  onAlternar: (valor: string) => void;
  onLimpiar: () => void;
  onVolver?: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const idTitulo = useId();
  const conBuscador = opciones.length > 6;
  const termino = busqueda.trim().toLowerCase();
  const visibles = useMemo(
    () => (termino ? opciones.filter((o) => o.etiqueta.toLowerCase().includes(termino)) : opciones),
    [opciones, termino],
  );

  const teclas = (evento: React.KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(evento.key)) return;
    const botones = Array.from(evento.currentTarget.querySelectorAll<HTMLButtonElement>('.pt-opcion'));
    if (!botones.length) return;
    evento.preventDefault();
    const actual = botones.indexOf(document.activeElement as HTMLButtonElement);
    const ultimo = botones.length - 1;
    const destino =
      evento.key === 'Home'
        ? 0
        : evento.key === 'End'
          ? ultimo
          : evento.key === 'ArrowDown'
            ? Math.min(ultimo, actual + 1)
            : Math.max(0, actual - 1);
    botones[Math.max(0, destino)]?.focus();
  };

  return (
    <div className="pt-panel-vista">
      <div className="pt-panel-cabecera">
        {onVolver ? (
          <button type="button" className="pt-panel-volver" onClick={onVolver} aria-label="Volver">
            <IconoChevron tamano={14} className="pt-volver-icono" />
          </button>
        ) : null}
        <div className="pt-panel-texto">
          <h3 className="pt-panel-titulo" id={idTitulo}>
            {titulo}
          </h3>
          <p className="pt-panel-cuenta">
            {seleccion.length === 0 ? 'Sin selección' : `${seleccion.length} seleccionada${seleccion.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <Popover.Close asChild>
          <button type="button" className="pt-panel-cerrar" aria-label="Cerrar panel">
            ×
          </button>
        </Popover.Close>
      </div>

      {conBuscador ? (
        <div className="pt-panel-buscar">
          <IconoBuscar tamano={15} />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar…"
            aria-label={`Buscar en ${titulo.toLowerCase()}`}
            autoFocus
          />
          {busqueda ? (
            <button type="button" className="pt-buscar-borrar" onClick={() => setBusqueda('')} aria-label="Borrar búsqueda">
              ×
            </button>
          ) : null}
        </div>
      ) : null}

      <ul className="pt-opciones" role="group" aria-label={titulo} onKeyDown={teclas}>
        {visibles.map((opcion) => {
          const activa = seleccion.includes(opcion.valor);
          return (
            <li key={opcion.valor}>
              <button
                type="button"
                className={`pt-opcion${activa ? ' is-marcada' : ''}`}
                aria-pressed={activa}
                onClick={() => onAlternar(opcion.valor)}
              >
                <span className="pt-casilla" aria-hidden="true">
                  <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                    <path d="M3 8.5 6.2 11.5 13 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="pt-opcion-nombre">{opcion.etiqueta}</span>
              </button>
            </li>
          );
        })}
        {visibles.length === 0 ? (
          <li className="pt-vacio">
            <p>No hay opciones que coincidan con «{busqueda.trim()}».</p>
            <button type="button" onClick={() => setBusqueda('')}>
              Borrar búsqueda
            </button>
          </li>
        ) : null}
      </ul>

      <div className="pt-panel-pie">
        <button type="button" className="pt-pie-accion" onClick={onLimpiar} disabled={seleccion.length === 0}>
          Limpiar selección
        </button>
        <span className="pt-pie-nota">Se aplica al elegir</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- periodo */

function PanelPeriodo({
  anio,
  desde,
  hasta,
  onPeriodo,
}: {
  anio: number;
  desde: string | null;
  hasta: string | null;
  onPeriodo: (desde: string | null, hasta: string | null) => void;
}) {
  const meses = useMemo(() => mesesDe(anio), [anio]);
  const actual = useMemo(() => leerPeriodo(desde, hasta, anio), [desde, hasta, anio]);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [previa, setPrevia] = useState<number | null>(null);

  useEffect(() => {
    setInicio(actual.indices.length ? Math.min(...actual.indices) : null);
    setFin(actual.indices.length ? Math.max(...actual.indices) : null);
    setPrevia(null);
  }, [actual.indices.join(',')]);

  const rango = useMemo(() => {
    if (inicio === null) return [];
    const final = fin ?? previa ?? inicio;
    const a = Math.min(inicio, final);
    const b = Math.max(inicio, final);
    return meses.filter((m) => m.indice >= a && m.indice <= b).map((m) => m.indice);
  }, [inicio, fin, previa, meses]);

  const elegir = (indice: number) => {
    if (inicio === null || fin !== null) {
      setInicio(indice);
      setFin(null);
      setPrevia(null);
      return;
    }
    setFin(indice);
  };

  const resumen = rango.length === 0 ? 'Todo el año' : etiquetaMeses(rango, anio);

  return (
    <div className="pt-panel-vista">
      <div className="pt-panel-cabecera">
        <div className="pt-panel-texto">
          <h3 className="pt-panel-titulo">Periodo</h3>
          <p className="pt-panel-cuenta">{resumen}</p>
        </div>
        <Popover.Close asChild>
          <button type="button" className="pt-panel-cerrar" aria-label="Cerrar periodo">
            ×
          </button>
        </Popover.Close>
      </div>

      <p className="pt-panel-anio">
        Cobertura <strong>{anio}</strong> · enero a diciembre
      </p>

      {actual.tipo === 'exacto' ? (
        <p className="pt-panel-aviso">
          El filtro vigente usa fechas exactas: <strong>{desde}</strong> → <strong>{hasta}</strong>. Se
          conservan hasta que apliques un intervalo de meses.
        </p>
      ) : null}

      <div className="pt-meses" role="group" aria-label="Meses">
        {meses.map((mes) => {
          const enRango = rango.includes(mes.indice);
          const esInicio = enRango && mes.indice === Math.min(...rango);
          const esFin = enRango && fin !== null && mes.indice === Math.max(...rango);
          return (
            <button
              key={mes.clave}
              type="button"
              className={`pt-mes${enRango ? ' is-rango' : ''}${esInicio ? ' is-inicio' : ''}${esFin ? ' is-fin' : ''}`}
              aria-pressed={enRango}
              aria-label={`${mes.largo} ${anio}`}
              onClick={() => elegir(mes.indice)}
              onMouseEnter={() => inicio !== null && fin === null && setPrevia(mes.indice)}
              onFocus={() => inicio !== null && fin === null && setPrevia(mes.indice)}
            >
              {mes.corto}
            </button>
          );
        })}
      </div>

      <p className="pt-panel-nota">
        {inicio === null
          ? 'Elige el mes inicial; después, el final del intervalo.'
          : fin === null
            ? 'Elige el mes final o repite el inicial para un solo mes.'
            : 'Intervalo listo: aplícalo para filtrar.'}
      </p>

      <div className="pt-panel-pie">
        <button
          type="button"
          className="pt-pie-accion"
          onClick={() => {
            setInicio(null);
            setFin(null);
            setPrevia(null);
          }}
        >
          Todo el año
        </button>
        <span className="pt-pie-sep" />
        <Popover.Close asChild>
          <button type="button" className="pt-pie-secundaria">
            Cancelar
          </button>
        </Popover.Close>
        <button
          type="button"
          className="pt-pie-primaria"
          onClick={() => {
            const limites = limitesDeMeses(rango, anio);
            onPeriodo(limites.desde, limites.hasta);
          }}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- más filtros */

type Campo = 'tiposUsuario' | 'sexos' | 'tiposVehiculo' | 'vialidades' | 'semaforizada' | 'edad';

const TEMAS: { titulo: string; campos: Campo[] }[] = [
  { titulo: 'Personas', campos: ['tiposUsuario', 'sexos'] },
  { titulo: 'Vehículo y vía', campos: ['tiposVehiculo', 'vialidades', 'semaforizada'] },
  { titulo: 'Edad', campos: ['edad'] },
];

const NOMBRE_CAMPO: Record<Campo, string> = {
  tiposUsuario: 'Tipo de persona',
  sexos: 'Sexo registrado',
  tiposVehiculo: 'Tipo de vehículo',
  vialidades: 'Vialidad',
  semaforizada: 'Intersección',
  edad: 'Edad registrada',
};

function PanelMasFiltros({
  catalogo,
  estado,
  onAlternar,
  onLimpiar,
  onEdad,
}: {
  catalogo: Catalogo;
  estado: Estado;
  onAlternar: (campo: Exclude<Campo, 'edad'>, valor: string) => void;
  onLimpiar: (campo: Exclude<Campo, 'edad'>) => void;
  onEdad: (min: number | null, max: number | null) => void;
}) {
  const [abierto, setAbierto] = useState<Campo | null>(null);

  const opcionesDe = (campo: Exclude<Campo, 'edad'>): Opcion[] => {
    if (campo === 'tiposUsuario') return catalogo.filtros.tipos_usuario.map((v) => ({ valor: v, etiqueta: v }));
    if (campo === 'sexos') return catalogo.filtros.sexos.map((v) => ({ valor: v, etiqueta: v }));
    if (campo === 'tiposVehiculo') return catalogo.filtros.tipos_vehiculo.map((v) => ({ valor: v, etiqueta: v }));
    if (campo === 'vialidades') return catalogo.filtros.vialidades.map((v) => ({ valor: v, etiqueta: v }));
    return catalogo.filtros.semaforizada.map((o: OpcionFiltro) => ({
      valor: o.valor,
      etiqueta: ETIQUETA_SEMAFORO[o.valor] ?? o.etiqueta,
    }));
  };

  if (abierto === 'edad') {
    return (
      <div className="pt-panel-vista">
        <div className="pt-panel-cabecera">
          <button type="button" className="pt-panel-volver" onClick={() => setAbierto(null)} aria-label="Volver">
            <IconoChevron tamano={14} className="pt-volver-icono" />
          </button>
          <div className="pt-panel-texto">
            <h3 className="pt-panel-titulo">Edad registrada</h3>
            <p className="pt-panel-cuenta">
              {estado.edadMin === null && estado.edadMax === null
                ? 'Cualquiera'
                : `${estado.edadMin ?? 0}–${estado.edadMax ?? 'más'} años`}
            </p>
          </div>
        </div>
        <div className="pt-campos">
          <label>
            <span>Desde</span>
            <input
              type="number"
              min={0}
              max={120}
              value={estado.edadMin ?? ''}
              onChange={(e) => onEdad(e.target.value === '' ? null : Number(e.target.value), estado.edadMax)}
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              type="number"
              min={0}
              max={120}
              value={estado.edadMax ?? ''}
              onChange={(e) => onEdad(estado.edadMin, e.target.value === '' ? null : Number(e.target.value))}
            />
          </label>
        </div>
        <div className="pt-panel-pie">
          <button type="button" className="pt-pie-accion" onClick={() => onEdad(null, null)}>
            Limpiar selección
          </button>
          <span className="pt-pie-nota">Se aplica al elegir</span>
        </div>
      </div>
    );
  }

  if (abierto) {
    return (
      <PanelOpciones
        titulo={NOMBRE_CAMPO[abierto]}
        opciones={opcionesDe(abierto)}
        seleccion={estado[abierto]}
        onAlternar={(valor) => onAlternar(abierto, valor)}
        onLimpiar={() => onLimpiar(abierto)}
        onVolver={() => setAbierto(null)}
      />
    );
  }

  const activos = (Object.keys(NOMBRE_CAMPO) as Campo[]).filter((campo) =>
    campo === 'edad'
      ? estado.edadMin !== null || estado.edadMax !== null
      : estado[campo].length > 0,
  ).length;

  return (
    <div className="pt-panel-vista">
      <div className="pt-panel-cabecera">
        <div className="pt-panel-texto">
          <h3 className="pt-panel-titulo">Más filtros</h3>
          <p className="pt-panel-cuenta">
            {activos === 0 ? 'Ninguno activo' : `${activos} campo${activos === 1 ? '' : 's'} activo${activos === 1 ? '' : 's'}`}
          </p>
        </div>
        <Popover.Close asChild>
          <button type="button" className="pt-panel-cerrar" aria-label="Cerrar más filtros">
            ×
          </button>
        </Popover.Close>
      </div>
      <div className="pt-grupos">
        {TEMAS.map((tema) => (
          <section className="pt-grupo" key={tema.titulo}>
            <h4 className="pt-grupo-titulo">{tema.titulo}</h4>
            <ul className="pt-lista">
              {tema.campos.map((campo) => {
                const seleccion = campo === 'edad' ? [] : estado[campo];
                const resumen =
                  campo === 'edad'
                    ? estado.edadMin === null && estado.edadMax === null
                      ? 'Cualquiera'
                      : `${estado.edadMin ?? 0}–${estado.edadMax ?? 'más'} años`
                    : resumenDe(opcionesDe(campo), seleccion);
                const cuantos = campo === 'edad' ? (estado.edadMin !== null || estado.edadMax !== null ? 1 : 0) : seleccion.length;
                return (
                  <li key={campo}>
                    <button
                      type="button"
                      className={`pt-fila${cuantos > 0 ? ' is-activo' : ''}`}
                      onClick={() => setAbierto(campo)}
                    >
                      <span className="pt-fila-texto">
                        <span className="pt-fila-nombre">{NOMBRE_CAMPO[campo]}</span>
                        <span className="pt-fila-valor">{resumen}</span>
                      </span>
                      {cuantos > 0 ? <span className="pt-fila-cuenta">{cuantos}</span> : null}
                      <IconoChevron tamano={13} className="pt-fila-flecha" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <div className="pt-panel-pie">
        <span className="pt-pie-nota">Se suman (OR) dentro de un campo; se cruzan (AND) entre campos.</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ aplicación */

export function Prototipo() {
  const cliente = useMemo(() => crearCliente(resolverApiBase()), []);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<Vista>('territorio');
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [ayuda, setAyuda] = useState(false);
  const [compartido, setCompartido] = useState(false);

  useEffect(() => {
    const control = new AbortController();
    cliente
      .catalogo(control.signal)
      .then(setCatalogo)
      .catch(() => undefined);
    return () => control.abort();
  }, [cliente]);

  useEffect(() => {
    const control = new AbortController();
    setCargando(true);
    cliente
      .resumen(parametrosDe(estado), control.signal)
      .then((datos) => {
        setResumen(datos);
        setCargando(false);
      })
      .catch(() => setCargando(false));
    return () => control.abort();
  }, [cliente, estado]);

  const alternar = (campo: keyof Omit<Estado, 'desde' | 'hasta' | 'edadMin' | 'edadMax'>, valor: string) => {
    setEstado((previo) => {
      const actuales = previo[campo];
      return {
        ...previo,
        [campo]: actuales.includes(valor) ? actuales.filter((v) => v !== valor) : [...actuales, valor],
      };
    });
  };

  const limpiarCampo = (campo: keyof Omit<Estado, 'desde' | 'hasta' | 'edadMin' | 'edadMax'>) =>
    setEstado((previo) => ({ ...previo, [campo]: [] }));

  if (!catalogo) {
    return (
      <main className="pt-marco">
        <p className="pt-cargando" role="status">
          Cargando catálogo…
        </p>
      </main>
    );
  }

  const alcaldias = catalogo.filtros.alcaldias.map((valor) => ({ valor, etiqueta: valor }));
  const eventos = catalogo.filtros.tipos_evento.map((valor) => ({ valor, etiqueta: valor }));
  const consecuencias = catalogo.filtros.consecuencias.map((o: OpcionFiltro) => ({
    valor: o.valor,
    etiqueta: ETIQUETA_CONSECUENCIA[o.valor] ?? o.etiqueta,
  }));
  const anio = anioDeCobertura(catalogo.filtros.periodo.desde, catalogo.filtros.periodo.hasta);
  const periodo = leerPeriodo(estado.desde, estado.hasta, anio);

  const activos: { clave: string; campo: string; texto: string; quitar: () => void }[] = [];
  if (estado.desde || estado.hasta) {
    activos.push({
      clave: 'periodo',
      campo: 'Periodo',
      texto: periodo.tipo === 'exacto' ? `${estado.desde} → ${estado.hasta}` : periodo.texto,
      quitar: () => setEstado((p) => ({ ...p, desde: null, hasta: null })),
    });
  }
  for (const valor of estado.alcaldias) {
    activos.push({ clave: `a-${valor}`, campo: 'Alcaldía', texto: valor, quitar: () => alternar('alcaldias', valor) });
  }
  for (const valor of estado.tiposEvento) {
    activos.push({ clave: `e-${valor}`, campo: 'Evento', texto: valor, quitar: () => alternar('tiposEvento', valor) });
  }
  for (const valor of estado.consecuencias) {
    activos.push({
      clave: `c-${valor}`,
      campo: 'Consecuencia',
      texto: ETIQUETA_CONSECUENCIA[valor] ?? valor,
      quitar: () => alternar('consecuencias', valor),
    });
  }
  for (const valor of estado.tiposUsuario) {
    activos.push({ clave: `u-${valor}`, campo: 'Persona', texto: valor, quitar: () => alternar('tiposUsuario', valor) });
  }
  for (const valor of estado.sexos) {
    activos.push({ clave: `s-${valor}`, campo: 'Sexo', texto: valor, quitar: () => alternar('sexos', valor) });
  }
  for (const valor of estado.tiposVehiculo) {
    activos.push({ clave: `v-${valor}`, campo: 'Vehículo', texto: valor, quitar: () => alternar('tiposVehiculo', valor) });
  }
  for (const valor of estado.vialidades) {
    activos.push({ clave: `vi-${valor}`, campo: 'Vialidad', texto: valor, quitar: () => alternar('vialidades', valor) });
  }
  for (const valor of estado.semaforizada) {
    activos.push({
      clave: `sf-${valor}`,
      campo: 'Intersección',
      texto: ETIQUETA_SEMAFORO[valor] ?? valor,
      quitar: () => alternar('semaforizada', valor),
    });
  }
  if (estado.edadMin !== null || estado.edadMax !== null) {
    activos.push({
      clave: 'edad',
      campo: 'Edad',
      texto: `${estado.edadMin ?? 0}–${estado.edadMax ?? 'más'} años`,
      quitar: () => setEstado((p) => ({ ...p, edadMin: null, edadMax: null })),
    });
  }

  const secundariosActivos =
    (['tiposUsuario', 'sexos', 'tiposVehiculo', 'vialidades', 'semaforizada'] as const).filter(
      (campo) => estado[campo].length > 0,
    ).length + (estado.edadMin !== null || estado.edadMax !== null ? 1 : 0);

  const zona = (etiqueta: string, icono: ReactElement, valor: string, activo: boolean) => (
    <>
      <span className="pt-zona-icono" aria-hidden="true">
        {icono}
      </span>
      <span className="pt-zona-texto">
        <span className="pt-zona-etiqueta">{etiqueta}</span>
        <span className="pt-zona-valor">
          {activo ? <span className="pt-zona-marca" aria-hidden="true" /> : null}
          {valor}
        </span>
      </span>
      <IconoChevron tamano={13} className="pt-zona-flecha" />
    </>
  );

  return (
    <main className="pt-marco">
      <header className="pt-head">
        <div className="pt-head-sup">
          <div className="pt-marca">
            <p className="pt-marca-nombre">Atlas vial · Ciudad de México</p>
            <p className="pt-marca-fuente">
              SSC · datos abiertos · Fuente: Secretaría de Seguridad Ciudadana de la CDMX (
              {catalogo.fuente.licencia})
            </p>
          </div>
          <div className="pt-acciones">
            <button
              type="button"
              className="pt-accion"
              onClick={() => {
                setCompartido(true);
                window.setTimeout(() => setCompartido(false), 1600);
              }}
            >
              <IconoEnlace tamano={16} />
              <span>{compartido ? 'Enlace copiado' : 'Compartir'}</span>
            </button>
            <button type="button" className="pt-accion">
              <IconoDescarga tamano={16} />
              <span>Exportar CSV</span>
            </button>
            <button type="button" className="pt-accion">
              <IconoInformacion tamano={16} />
              <span>Metodología</span>
            </button>
            <button type="button" className="pt-accion">
              <IconoAmpliar tamano={16} />
              <span>Ampliar</span>
            </button>
            <a className="pt-accion pt-accion--enlace" href="#/area/dashboards">
              Volver al portafolio
            </a>
          </div>
        </div>

        <h1 className="pt-titulo">Hechos de tránsito registrados en la Ciudad de México</h1>
        <p className="pt-meta">
          Periodo de los eventos: <strong>{etiquetaFecha(catalogo.filtros.periodo.desde)}</strong> a{' '}
          <strong>{etiquetaFecha(catalogo.filtros.periodo.hasta)}</strong> · Fuente: Secretaría de
          Seguridad Ciudadana de la CDMX ({catalogo.fuente.licencia}) · Última sincronización correcta:{' '}
          {catalogo.fuente.ultima_sincronizacion
            ? new Date(catalogo.fuente.ultima_sincronizacion).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'sin registro'}
        </p>
      </header>

      <div className="pt-nav-envoltorio">
        <Navegacion vista={vista} onVista={setVista} />
      </div>

      <section className="pt-banda" aria-label="Filtros globales">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button type="button" className={`pt-zona${periodo.tipo !== 'todo' ? ' is-activo' : ''}`} data-testid="zona-periodo">
              {zona('Periodo', <IconoCalendario />, periodo.texto, periodo.tipo !== 'todo')}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="pt-panel pt-panel--periodo" sideOffset={10} align="start" collisionPadding={12}>
              <PanelPeriodo
                anio={anio}
                desde={estado.desde}
                hasta={estado.hasta}
                onPeriodo={(desde, hasta) => setEstado((p) => ({ ...p, desde, hasta }))}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={`pt-zona${estado.alcaldias.length ? ' is-activo' : ''}`}
              data-testid="zona-alcaldia"
            >
              {zona('Alcaldía', <IconoPin />, resumenDe(alcaldias, estado.alcaldias), estado.alcaldias.length > 0)}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="pt-panel" sideOffset={10} align="start" collisionPadding={12}>
              <PanelOpciones
                titulo="Alcaldía"
                opciones={alcaldias}
                seleccion={estado.alcaldias}
                onAlternar={(valor) => alternar('alcaldias', valor)}
                onLimpiar={() => limpiarCampo('alcaldias')}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={`pt-zona${estado.tiposEvento.length ? ' is-activo' : ''}`}
              data-testid="zona-evento"
            >
              {zona('Tipo de evento', <IconoTriangulo />, resumenDe(eventos, estado.tiposEvento), estado.tiposEvento.length > 0)}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="pt-panel" sideOffset={10} align="start" collisionPadding={12}>
              <PanelOpciones
                titulo="Tipo de evento"
                opciones={eventos}
                seleccion={estado.tiposEvento}
                onAlternar={(valor) => alternar('tiposEvento', valor)}
                onLimpiar={() => limpiarCampo('tiposEvento')}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={`pt-zona${estado.consecuencias.length ? ' is-activo' : ''}`}
              data-testid="zona-consecuencia"
            >
              {zona(
                'Consecuencia',
                <IconoBalanza />,
                resumenDe(consecuencias, estado.consecuencias),
                estado.consecuencias.length > 0,
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="pt-panel" sideOffset={10} align="start" collisionPadding={12}>
              <PanelOpciones
                titulo="Consecuencia"
                opciones={consecuencias}
                seleccion={estado.consecuencias}
                onAlternar={(valor) => alternar('consecuencias', valor)}
                onLimpiar={() => limpiarCampo('consecuencias')}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={`pt-zona pt-zona--accion${secundariosActivos ? ' is-activo' : ''}`}
              data-testid="zona-mas"
            >
              <span className="pt-zona-icono" aria-hidden="true">
                <IconoFiltro tamano={18} />
              </span>
              <span className="pt-zona-texto">
                <span className="pt-zona-etiqueta">Más filtros</span>
                <span className="pt-zona-valor">
                  {secundariosActivos > 0 ? `${secundariosActivos} activo${secundariosActivos === 1 ? '' : 's'}` : 'Persona, vehículo, vía'}
                </span>
              </span>
              <IconoChevron tamano={13} className="pt-zona-flecha" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="pt-panel pt-panel--ancho" sideOffset={10} align="start" collisionPadding={12}>
              <PanelMasFiltros
                catalogo={catalogo}
                estado={estado}
                onAlternar={(campo, valor) => alternar(campo, valor)}
                onLimpiar={(campo) => limpiarCampo(campo)}
                onEdad={(min, max) => setEstado((p) => ({ ...p, edadMin: min, edadMax: max }))}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </section>

      {activos.length > 0 ? (
        <div className="pt-selecciones">
          <ul className="pt-chips" aria-label="Filtros activos">
            {activos.map((activo) => (
              <li key={activo.clave}>
                <button type="button" className="pt-chip" onClick={activo.quitar}>
                  <span className="pt-chip-campo">{activo.campo}</span>
                  <span className="pt-chip-valor">{activo.texto}</span>
                  <span className="pt-chip-x" aria-hidden="true">
                    ×
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="pt-selecciones-acciones">
            <Popover.Root open={ayuda} onOpenChange={setAyuda}>
              <Popover.Trigger asChild>
                <button type="button" className="pt-ayuda" aria-label="Cómo se combinan los filtros">
                  <IconoInformacion tamano={15} />
                  <span>Cómo se combinan</span>
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="pt-panel pt-panel--ayuda" sideOffset={10} align="end" collisionPadding={12}>
                  <div className="pt-panel-vista">
                    <div className="pt-panel-cabecera">
                      <div className="pt-panel-texto">
                        <h3 className="pt-panel-titulo">Cómo se combinan</h3>
                        <p className="pt-panel-cuenta">Regla de combinación</p>
                      </div>
                      <Popover.Close asChild>
                        <button type="button" className="pt-panel-cerrar" aria-label="Cerrar ayuda">
                          ×
                        </button>
                      </Popover.Close>
                    </div>
                    <ul className="pt-ayuda-lista">
                      <li>
                        <strong>Dentro de un filtro los valores se suman (OR).</strong> Dos alcaldías
                        muestran los hechos de ambas.
                      </li>
                      <li>
                        <strong>Entre filtros distintos se cruzan (AND).</strong> Alcaldía y tipo de evento
                        acotan a la vez.
                      </li>
                    </ul>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <button type="button" className="pt-limpiar" onClick={() => setEstado(ESTADO_INICIAL)}>
              <IconoReiniciar tamano={16} />
              <span>Limpiar filtros</span>
            </button>
          </div>
        </div>
      ) : null}

      <section className="pt-kpis" aria-label="Indicadores del conjunto filtrado">
        <article className="pt-kpi">
          <p className="pt-kpi-etiqueta">Hechos registrados</p>
          <p className="pt-kpi-valor pt-kpi-valor--hechos">{cargando ? '…' : aNumero(resumen?.indicadores.hechos.valor)}</p>
          <p className="pt-kpi-pie">con los filtros vigentes</p>
        </article>
        <article className="pt-kpi">
          <p className="pt-kpi-etiqueta">Personas lesionadas</p>
          <p className="pt-kpi-valor pt-kpi-valor--lesionadas">
            {cargando ? '…' : aNumero(resumen?.indicadores.personas_lesionadas.valor)}
          </p>
          <p className="pt-kpi-pie">suma del campo publicado</p>
        </article>
        <article className="pt-kpi">
          <p className="pt-kpi-etiqueta">Personas fallecidas</p>
          <p className="pt-kpi-valor pt-kpi-valor--fallecidas">
            {cargando ? '…' : aNumero(resumen?.indicadores.personas_fallecidas.valor)}
          </p>
          <p className="pt-kpi-pie">no se estima ni se imputa</p>
        </article>
      </section>

      <section className="pt-lienzo" aria-label="Área de contenido del tablero">
        <p className="pt-lienzo-texto">
          Vista «{VISTAS.find((v) => v.id === vista)?.etiqueta}» · el cuerpo analítico del tablero
          (mapa, gráficos y tablas) no forma parte de este prototipo.
        </p>
      </section>
    </main>
  );
}




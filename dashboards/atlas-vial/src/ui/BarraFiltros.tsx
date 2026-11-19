/**
 * Banda de filtros globales del Atlas vial.
 *
 * Capas de control (cada una con su lenguaje):
 *  · la navegación entre vistas es una banda azul tinta con cápsula blanca;
 *  · esta banda reúne los filtros globales sobre fondo gris azulado;
 *  · los controles locales del mapa y de las gráficas son grises con cápsula
 *    blanca (se definen en su propio bloque de estilos).
 *
 * Contrato de comportamiento (sin cambios con el rediseño):
 *  · dentro de una dimensión los valores se suman (OR);
 *  · entre dimensiones se cruzan (AND);
 *  · cada elección se aplica al instante, sin confirmación;
 *  · una sola acción global, «Limpiar filtros», visible solo con filtros activos;
 *  · el estado se refleja en la URL y el enlace es reproducible.
 */

import * as Popover from '@radix-ui/react-popover';
import { ControlPeriodo } from './ControlPeriodo';
import { anioDeCobertura, leerPeriodo } from '../periodo';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

import type { Catalogo, OpcionFiltro } from '../api/tipos';
import {
  ETIQUETA_CONSECUENCIA,
  ETIQUETA_SEMAFORO,
  etiquetaFecha,
  type Filtros,
} from '../dominio';
import {
  IconoActividad,
  IconoBorrador,
  IconoBuscar,
  IconoChevron,
  IconoFiltro,
  IconoFlecha,
  IconoIncidente,
  IconoMapa,
  IconoPersonas,
  IconoReiniciar,
} from './iconos';

type Dimension =
  | 'alcaldias'
  | 'tiposEvento'
  | 'consecuencias'
  | 'tiposUsuario'
  | 'tiposVehiculo'
  | 'vialidades'
  | 'semaforizada'
  | 'sexos';

/** Lo que se puede abrir dentro de «Más filtros»: dimensiones + rango de edad. */
type Vista = Dimension | 'edad';

export interface PropsBarraFiltros {
  catalogo: Catalogo;
  filtros: Filtros;
  onAlternar: (dimension: Dimension, valor: string) => void;
  onLimpiar: (dimension: Dimension) => void;
  onPeriodo: (desde: string | null, hasta: string | null) => void;
  onEdad: (min: number | null, max: number | null) => void;
  onQuitarZona: () => void;
  onRestablecer: () => void;
}

interface Opcion {
  valor: string;
  etiqueta: string;
}

/** Alto de la banda compacta: el relleno de compensación lo usa. */
const ALTO_COMPACTA = 56;

function opcionesDe(catalogo: Catalogo, dimension: Dimension): Opcion[] {
  switch (dimension) {
    case 'alcaldias':
      return catalogo.filtros.alcaldias.map((valor) => ({ valor, etiqueta: valor }));
    case 'tiposEvento':
      return catalogo.filtros.tipos_evento.map((valor) => ({ valor, etiqueta: valor }));
    case 'consecuencias':
      return catalogo.filtros.consecuencias.map((opcion: OpcionFiltro) => ({
        valor: opcion.valor,
        etiqueta: ETIQUETA_CONSECUENCIA[opcion.valor] ?? opcion.etiqueta,
      }));
    case 'tiposUsuario':
      return catalogo.filtros.tipos_usuario.map((valor) => ({ valor, etiqueta: valor }));
    case 'tiposVehiculo':
      return catalogo.filtros.tipos_vehiculo.map((valor) => ({ valor, etiqueta: valor }));
    case 'vialidades':
      return catalogo.filtros.vialidades.map((valor) => ({ valor, etiqueta: valor }));
    case 'semaforizada':
      return catalogo.filtros.semaforizada.map((opcion: OpcionFiltro) => ({
        valor: opcion.valor,
        etiqueta: ETIQUETA_SEMAFORO[opcion.valor] ?? opcion.etiqueta,
      }));
    case 'sexos':
      return catalogo.filtros.sexos.map((valor) => ({ valor, etiqueta: valor }));
    default:
      return [];
  }
}

const ICONO_DIMENSION: Record<Dimension, (p: { tamano?: number }) => ReactElement> = {
  alcaldias: IconoMapa,
  tiposEvento: IconoIncidente,
  consecuencias: IconoActividad,
  tiposUsuario: IconoPersonas,
  tiposVehiculo: IconoFiltro,
  vialidades: IconoMapa,
  semaforizada: IconoActividad,
  sexos: IconoPersonas,
};

const ETIQUETA_CONTROL: Record<Dimension, string> = {
  alcaldias: 'Alcaldía',
  tiposEvento: 'Tipo de evento',
  consecuencias: 'Consecuencia',
  tiposUsuario: 'Tipo de persona',
  tiposVehiculo: 'Tipo de vehículo',
  vialidades: 'Vialidad',
  semaforizada: 'Intersección',
  sexos: 'Sexo registrado',
};

/** Campos secundarios agrupados por tema dentro de «Más filtros». */
const TEMAS: { titulo: string; vistas: Vista[] }[] = [
  { titulo: 'Personas', vistas: ['tiposUsuario', 'sexos'] },
  { titulo: 'Vehículo y vía', vistas: ['tiposVehiculo', 'vialidades', 'semaforizada'] },
  { titulo: 'Edad', vistas: ['edad'] },
];

function seleccionDe(filtros: Filtros, dimension: Dimension): string[] {
  switch (dimension) {
    case 'alcaldias':
      return filtros.alcaldias;
    case 'tiposEvento':
      return filtros.tiposEvento;
    case 'consecuencias':
      return filtros.consecuencias;
    case 'tiposUsuario':
      return filtros.tiposUsuario;
    case 'tiposVehiculo':
      return filtros.tiposVehiculo;
    case 'vialidades':
      return filtros.vialidades;
    case 'semaforizada':
      return filtros.semaforizada;
    case 'sexos':
      return filtros.sexos;
    default:
      return [];
  }
}

/** «Todas» · «Azcapotzalco» · «Iztapalapa +1» (el resumen del control). */
function resumenDe(opciones: Opcion[], seleccion: string[]): string {
  if (seleccion.length === 0) return 'Todas';
  const nombre = (valor: string) => opciones.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor;
  const primero = seleccion[0] ?? '';
  if (seleccion.length === 1) return nombre(primero);
  return `${nombre(primero)} +${seleccion.length - 1}`;
}

/** Recorre la lista de opciones con las flechas, Inicio y Fin. */
function alPulsarTecla(evento: KeyboardEvent<HTMLUListElement>) {
  const teclas = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
  if (!teclas.includes(evento.key)) return;
  const botones = Array.from(
    evento.currentTarget.querySelectorAll<HTMLButtonElement>('.at-opcion'),
  );
  if (botones.length === 0) return;
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
}

/* --------------------------------------------------------------------------
   Piezas comunes
   -------------------------------------------------------------------------- */

/** Disparador de un desplegable: prefijo, valor y flecha en una línea. */
function Disparador({
  etiqueta,
  valor,
  activo,
  compacto,
  testid,
  icono: Icono,
}: {
  etiqueta: string;
  valor: string;
  activo: boolean;
  compacto?: boolean;
  testid?: string;
  icono?: (props: { tamano?: number }) => ReactElement;
}) {
  return (
    <Popover.Trigger asChild>
      <button
        type="button"
        data-testid={testid}
        className={`at-ctrl${activo ? ' is-activo' : ''}${compacto ? ' at-ctrl--compacto' : ''}`}
        aria-label={`${etiqueta}: ${valor}`}
        title={`${etiqueta}: ${valor}`}
      >
        <span className="at-ctrl-icono" aria-hidden="true">
          {Icono ? <Icono tamano={16} /> : null}
        </span>
        <span className="at-ctrl-label">{etiqueta}</span>
        <IconoChevron tamano={12} className="at-ctrl-chevron" />
      </button>
    </Popover.Trigger>
  );
}

/** Panel de opciones: encabezado, buscador fijo, lista desplazable y pie. */
function VistaOpciones({
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
  const idCuenta = useId();
  const conBuscador = opciones.length > 6;
  const termino = busqueda.trim().toLowerCase();
  const visibles = useMemo(
    () =>
      termino
        ? opciones.filter((opcion) => opcion.etiqueta.toLowerCase().includes(termino))
        : opciones,
    [opciones, termino],
  );

  return (
    <div className="atf-vista" role="group" aria-labelledby={idTitulo}>
      <div className="atf-head">
        {onVolver ? (
          <button type="button" className="atf-volver" onClick={onVolver} aria-label="Volver a más filtros">
            <IconoFlecha tamano={14} className="atf-volver-icono" />
          </button>
        ) : null}
        <div className="atf-head-texto">
          <h3 className="atf-titulo" id={idTitulo}>
            {titulo}
          </h3>
          <p className="atf-cuenta" id={idCuenta}>
            {seleccion.length === 0
              ? 'Sin selección'
              : `${seleccion.length} seleccionada${seleccion.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {seleccion.length > 0 ? (
          <button
            type="button"
            className="atf-borrar"
            onClick={onLimpiar}
            aria-label={`Limpiar selección de ${titulo.toLowerCase()}`}
            data-tooltip="Limpiar selección"
            data-testid="limpiar-seleccion"
          >
            <IconoBorrador tamano={17} />
          </button>
        ) : null}
        <Popover.Close asChild>
          <button type="button" className="atf-cerrar" aria-label="Cerrar panel">
            ×
          </button>
        </Popover.Close>
      </div>

      {conBuscador ? (
        <div className="atf-buscar">
          <IconoBuscar tamano={14} />
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar…"
            aria-label={`Buscar en ${titulo.toLowerCase()}`}
            autoFocus
          />
          {busqueda ? (
            <button
              type="button"
              className="atf-buscar-borrar"
              onClick={() => setBusqueda('')}
              aria-label="Borrar búsqueda"
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}

      <ul
        className="atf-opciones"
        role="group"
        aria-label={titulo}
        aria-describedby={idCuenta}
        onKeyDown={alPulsarTecla}
      >
        {visibles.map((opcion) => {
          const activa = seleccion.includes(opcion.valor);
          return (
            <li key={opcion.valor}>
              <button
                type="button"
                className={`at-opcion${activa ? ' is-marcada' : ''}`}
                aria-pressed={activa}
                onClick={() => onAlternar(opcion.valor)}
              >
                <span className="at-caja" aria-hidden="true">
                  {activa ? '✓' : ''}
                </span>
                <span className="at-opcion-nombre">{opcion.etiqueta}</span>
              </button>
            </li>
          );
        })}
        {visibles.length === 0 ? (
          <li className="atf-vacio">
            <p className="atf-vacio-texto">No hay opciones que coincidan con «{busqueda.trim()}».</p>
            <button type="button" className="atf-vacio-accion" onClick={() => setBusqueda('')}>
              Borrar búsqueda
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Desplegable de selección múltiple de la banda. */
function ControlMultiple({
  dimension,
  opciones,
  seleccion,
  onAlternar,
  onLimpiar,
}: {
  dimension: Dimension;
  opciones: Opcion[];
  seleccion: string[];
  onAlternar: (valor: string) => void;
  onLimpiar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const resumen = resumenDe(opciones, seleccion);

  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Disparador
        icono={ICONO_DIMENSION[dimension]}
        etiqueta={ETIQUETA_CONTROL[dimension]}
        valor={resumen}
        activo={seleccion.length > 0}
        testid={`ctrl-${dimension}`}
      />
      <Popover.Portal>
        <Popover.Content className="atf-panel" sideOffset={8} align="start" collisionPadding={12}>
          <VistaOpciones
            titulo={ETIQUETA_CONTROL[dimension]}
            opciones={opciones}
            seleccion={seleccion}
            onAlternar={onAlternar}
            onLimpiar={onLimpiar}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Vista de edad registrada (rango inclusivo; «Sin dato» nunca se incluye). */
function VistaEdad({
  edadMin,
  edadMax,
  onEdad,
  onVolver,
}: {
  edadMin: number | null;
  edadMax: number | null;
  onEdad: (min: number | null, max: number | null) => void;
  onVolver: () => void;
}) {
  const idTitulo = useId();
  const activo = edadMin !== null || edadMax !== null;

  const cambiar = (valor: string, extremo: 'min' | 'max') => {
    const numero = valor === '' ? null : Math.max(0, Math.min(120, Number(valor)));
    if (extremo === 'min') onEdad(numero, edadMax);
    else onEdad(edadMin, numero);
  };

  return (
    <div className="atf-vista" role="group" aria-labelledby={idTitulo}>
      <div className="atf-head">
        <button type="button" className="atf-volver" onClick={onVolver} aria-label="Volver a más filtros">
          <IconoFlecha tamano={14} className="atf-volver-icono" />
        </button>
        <div className="atf-head-texto">
          <h3 className="atf-titulo" id={idTitulo}>
            Edad registrada
          </h3>
          <p className="atf-cuenta">
            {activo ? `${edadMin ?? 0}–${edadMax ?? 'más'} años` : 'Cualquiera'}
          </p>
        </div>
        <Popover.Close asChild>
          <button type="button" className="atf-cerrar" aria-label="Cerrar panel">
            ×
          </button>
        </Popover.Close>
      </div>
      <div className="atf-campos">
        <label>
          <span>Desde</span>
          <input
            type="number"
            min={0}
            max={120}
            value={edadMin ?? ''}
            onChange={(evento) => cambiar(evento.target.value, 'min')}
          />
        </label>
        <label>
          <span>Hasta</span>
          <input
            type="number"
            min={0}
            max={120}
            value={edadMax ?? ''}
            onChange={(evento) => cambiar(evento.target.value, 'max')}
          />
        </label>
      </div>
      <p className="atf-nota">
        Filtra los hechos cuyo registro de persona trae una edad dentro del rango. Los registros con
        «Sin dato» (1 654 hechos) quedan fuera al usar este filtro: no se suponen edades.
      </p>
    </div>
  );
}
interface CampoActivo {
  vista: Vista;
  etiqueta: string;
  resumen: string;
  cuantos: number;
}

/** Lista de campos secundarios por tema. */
function VistaSecundarios({
  filas,
  activos,
  onElegir,
}: {
  filas: CampoActivo[];
  activos: number;
  onElegir: (vista: Vista) => void;
}) {
  const idTitulo = useId();

  return (
    <div className="atf-vista">
      <div className="atf-head">
        <div className="atf-head-texto">
          <h3 className="atf-titulo" id={idTitulo}>
            Más filtros
          </h3>
          <p className="atf-cuenta">
            {activos === 0
              ? 'Ninguno activo'
              : `${activos} campo${activos === 1 ? '' : 's'} activo${activos === 1 ? '' : 's'}`}
          </p>
        </div>
        <Popover.Close asChild>
          <button type="button" className="atf-cerrar" aria-label="Cerrar más filtros">
            ×
          </button>
        </Popover.Close>
      </div>
      <div className="atf-grupos">
        {TEMAS.map((tema) => (
          <section className="atf-grupo" key={tema.titulo} aria-label={tema.titulo}>
            <h4 className="atf-grupo-titulo">{tema.titulo}</h4>
            <ul className="atf-lista">
              {filas
                .filter((fila) => tema.vistas.includes(fila.vista))
                .map((fila) => (
                  <li key={fila.vista}>
                    <button
                      type="button"
                      data-testid={`mf-${fila.vista}`}
                      className={`atf-fila${fila.cuantos > 0 ? ' is-activo' : ''}`}
                      onClick={() => onElegir(fila.vista)}
                      aria-label={`${fila.etiqueta}: ${fila.resumen}`}
                    >
                      <span className="atf-fila-texto">
                        <span className="atf-fila-label">{fila.etiqueta}</span>
                        <span className="atf-fila-valor">{fila.resumen}</span>
                      </span>
                      {fila.cuantos > 0 ? (
                        <span className="atf-fila-cuenta" aria-hidden="true">
                          {fila.cuantos}
                        </span>
                      ) : null}
                      <IconoChevron tamano={12} className="atf-chevron" />
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="atf-pie">
        <span className="atf-pie-nota">
          Se suman (OR) dentro de un campo; se cruzan (AND) entre campos.
        </span>
      </div>
    </div>
  );
}

/** Un renglón por campo secundario, con su resumen y cuántos valores tiene. */
function camposSecundarios(catalogo: Catalogo, filtros: Filtros): CampoActivo[] {
  const filas: CampoActivo[] = TEMAS.flatMap((tema) => tema.vistas)
    .filter((vista): vista is Dimension => vista !== 'edad')
    .map((dimension) => {
      const opciones = opcionesDe(catalogo, dimension);
      const seleccion = seleccionDe(filtros, dimension);
      return {
        vista: dimension,
        etiqueta: ETIQUETA_CONTROL[dimension],
        resumen: resumenDe(opciones, seleccion),
        cuantos: seleccion.length,
      };
    });
  const edadActiva = filtros.edadMin !== null || filtros.edadMax !== null;
  filas.push({
    vista: 'edad',
    etiqueta: 'Edad registrada',
    resumen: edadActiva ? `${filtros.edadMin ?? 0}–${filtros.edadMax ?? 'más'} años` : 'Cualquiera',
    cuantos: edadActiva ? 1 : 0,
  });
  return filas;
}

/** Botón «Más filtros» con su panel agrupado por tema. */
function MasFiltros({
  catalogo,
  filtros,
  onAlternar,
  onLimpiar,
  onEdad,
}: {
  catalogo: Catalogo;
  filtros: Filtros;
  onAlternar: (dimension: Dimension, valor: string) => void;
  onLimpiar: (dimension: Dimension) => void;
  onEdad: (min: number | null, max: number | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista | null>(null);

  useEffect(() => {
    if (!abierto) setVista(null);
  }, [abierto]);

  const filas = camposSecundarios(catalogo, filtros);
  const activos = filas.filter((fila) => fila.cuantos > 0).length;

  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-testid="mas-filtros"
          className={`at-banda-mas${activos > 0 ? ' is-activo' : ''}`}
          aria-label={`Más filtros: ${activos} campo${activos === 1 ? '' : 's'} activo${activos === 1 ? '' : 's'}`}
        >
          <IconoFiltro tamano={16} />
          <span className="at-banda-mas-texto">Más filtros</span>
          {activos > 0 ? (
            <span className="at-banda-mas-globo" aria-hidden="true">
              {activos}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="atf-panel atf-panel--ancho"
          data-testid="panel-mas-filtros"
          sideOffset={8}
          align="start"
          collisionPadding={12}
          aria-label="Más filtros"
        >
          {vista === null ? (
            <VistaSecundarios filas={filas} activos={activos} onElegir={setVista} />
          ) : vista === 'edad' ? (
            <VistaEdad
              edadMin={filtros.edadMin}
              edadMax={filtros.edadMax}
              onEdad={onEdad}
              onVolver={() => setVista(null)}
            />
          ) : (
            <VistaOpciones
              titulo={ETIQUETA_CONTROL[vista]}
              opciones={opcionesDe(catalogo, vista)}
              seleccion={seleccionDe(filtros, vista)}
              onAlternar={(valor) => onAlternar(vista, valor)}
              onLimpiar={() => onLimpiar(vista)}
              onVolver={() => setVista(null)}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/* --------------------------------------------------------------------------
   Banda
   -------------------------------------------------------------------------- */

export function BarraFiltros({
  catalogo,
  filtros,
  onAlternar,
  onLimpiar,
  onPeriodo,
  onEdad,
  onQuitarZona,
  onRestablecer,
}: PropsBarraFiltros) {
  const banda = useRef<HTMLElement>(null);
  const centinela = useRef<HTMLDivElement>(null);
  const [pegada, setPegada] = useState(false);
  const [desplegada, setDesplegada] = useState(false);
  const [altoExpandido, setAltoExpandido] = useState(0);
  const [offsetSuperior, setOffsetSuperior] = useState(0);

  /* El encabezado del portafolio puede ser adhesivo: la banda se pega debajo. */
  useEffect(() => {
    const medir = () => {
      const cabecera = document.querySelector('.site-header');
      if (!cabecera) {
        setOffsetSuperior(0);
        return;
      }
      const estilo = getComputedStyle(cabecera);
      const adhesiva = estilo.position === 'sticky' || estilo.position === 'fixed';
      setOffsetSuperior(adhesiva ? Math.round(cabecera.getBoundingClientRect().height) : 0);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  /* Pegada = el centinela previo salió por arriba del todo adhesivo. */
  useEffect(() => {
    const nodo = centinela.current;
    if (!nodo || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(
      ([entrada]) =>
        setPegada(Boolean(entrada && !entrada.isIntersecting && entrada.boundingClientRect.top < offsetSuperior)),
      { rootMargin: `-${offsetSuperior}px 0px 0px 0px`, threshold: 0 },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [offsetSuperior]);

  useEffect(() => {
    if (!pegada) setDesplegada(false);
  }, [pegada]);

  const compacta = pegada && !desplegada;

  /* Alto de la banda desplegada: se reserva para que el contenido no salte. */
  useEffect(() => {
    const nodo = banda.current;
    if (!nodo || compacta) return;
    const actualizar = () => setAltoExpandido(nodo.offsetHeight);
    actualizar();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(actualizar);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [compacta]);

  const activos: { clave: string; campo: string; texto: string; quitar: () => void }[] = [];
  if (filtros.desde || filtros.hasta) {
    activos.push({
      clave: 'periodo',
      campo: 'Periodo',
      texto: `${etiquetaFecha(filtros.desde)} – ${etiquetaFecha(filtros.hasta)}`,
      quitar: () => onPeriodo(null, null),
    });
  }
  for (const valor of filtros.alcaldias) {
    activos.push({
      clave: `alcaldia-${valor}`,
      campo: 'Alcaldía',
      texto: valor,
      quitar: () => onAlternar('alcaldias', valor),
    });
  }
  for (const valor of filtros.tiposEvento) {
    activos.push({
      clave: `evento-${valor}`,
      campo: 'Evento',
      texto: valor,
      quitar: () => onAlternar('tiposEvento', valor),
    });
  }
  for (const valor of filtros.consecuencias) {
    activos.push({
      clave: `consecuencia-${valor}`,
      campo: 'Consecuencia',
      texto: ETIQUETA_CONSECUENCIA[valor] ?? valor,
      quitar: () => onAlternar('consecuencias', valor),
    });
  }
  for (const valor of filtros.tiposUsuario) {
    activos.push({
      clave: `usuario-${valor}`,
      campo: 'Persona',
      texto: valor,
      quitar: () => onAlternar('tiposUsuario', valor),
    });
  }
  for (const valor of filtros.tiposVehiculo) {
    activos.push({
      clave: `vehiculo-${valor}`,
      campo: 'Vehículo',
      texto: valor,
      quitar: () => onAlternar('tiposVehiculo', valor),
    });
  }
  for (const valor of filtros.vialidades) {
    activos.push({
      clave: `vialidad-${valor}`,
      campo: 'Vialidad',
      texto: valor,
      quitar: () => onAlternar('vialidades', valor),
    });
  }
  for (const valor of filtros.semaforizada) {
    activos.push({
      clave: `semaforo-${valor}`,
      campo: 'Intersección',
      texto: ETIQUETA_SEMAFORO[valor] ?? valor,
      quitar: () => onAlternar('semaforizada', valor),
    });
  }
  for (const valor of filtros.sexos) {
    activos.push({
      clave: `sexo-${valor}`,
      campo: 'Sexo',
      texto: valor,
      quitar: () => onAlternar('sexos', valor),
    });
  }
  if (filtros.edadMin !== null || filtros.edadMax !== null) {
    activos.push({
      clave: 'edad',
      campo: 'Edad',
      texto: `${filtros.edadMin ?? 0}–${filtros.edadMax ?? 'más'} años`,
      quitar: () => onEdad(null, null),
    });
  }
  if (filtros.filtrarPorZona) {
    activos.push({ clave: 'zona', campo: 'Zona', texto: 'visible del mapa', quitar: onQuitarZona });
  }

  const resumenFiltros =
    activos.length === 0
      ? 'Sin filtros'
      : activos.length === 1
        ? `${activos[0]?.campo ?? ''}: ${activos[0]?.texto ?? ''}`
        : `${activos.length} filtros activos`;

  const relleno = compacta ? Math.max(0, altoExpandido - ALTO_COMPACTA) : 0;
  const periodoTexto = leerPeriodo(filtros.desde, filtros.hasta, anioDeCobertura(catalogo.filtros.periodo.desde, catalogo.filtros.periodo.hasta)).texto;

  return (
    <>
      <div ref={centinela} className="at-banda-centinela" aria-hidden="true" />
      <section
        ref={banda}
        className={`at-filtros${compacta ? ' is-compacta' : ''}`}
        style={{ top: offsetSuperior }}
        aria-label="Filtros globales del tablero"
        data-testid="filtros"
      >
        {compacta ? (
          <div className="at-banda-compacta">
            <span className="at-banda-compacta-periodo">{periodoTexto}</span>
            <span className="at-banda-compacta-resumen">{resumenFiltros}</span>
            <button
              type="button"
              className="at-banda-editar"
              onClick={() => {
                setDesplegada(true);
                banda.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
              }}
            >
              Editar filtros
            </button>
          </div>
        ) : (
          <div className="at-banda-cuerpo">
            <div className="at-banda-fila">
              <div className="at-banda-controles">
                <ControlPeriodo
                  limites={catalogo.filtros.periodo}
                  desde={filtros.desde}
                  hasta={filtros.hasta}
                  onPeriodo={onPeriodo}
                />
                <ControlMultiple
                  dimension="alcaldias"
                  opciones={opcionesDe(catalogo, 'alcaldias')}
                  seleccion={filtros.alcaldias}
                  onAlternar={(valor) => onAlternar('alcaldias', valor)}
                  onLimpiar={() => onLimpiar('alcaldias')}
                />
                <ControlMultiple
                  dimension="tiposEvento"
                  opciones={opcionesDe(catalogo, 'tiposEvento')}
                  seleccion={filtros.tiposEvento}
                  onAlternar={(valor) => onAlternar('tiposEvento', valor)}
                  onLimpiar={() => onLimpiar('tiposEvento')}
                />
                <ControlMultiple
                  dimension="consecuencias"
                  opciones={opcionesDe(catalogo, 'consecuencias')}
                  seleccion={filtros.consecuencias}
                  onAlternar={(valor) => onAlternar('consecuencias', valor)}
                  onLimpiar={() => onLimpiar('consecuencias')}
                />
                <MasFiltros
                  catalogo={catalogo}
                  filtros={filtros}
                  onAlternar={onAlternar}
                  onLimpiar={onLimpiar}
                  onEdad={onEdad}
                />
              </div>
            </div>

            {activos.length > 0 ? (
              <div className="at-banda-pie">
                <ul className="at-chips" aria-label="Filtros activos">
                  {activos.map((activo) => (
                    <li key={activo.clave}>
                      <button
                        type="button"
                        className="at-chip"
                        onClick={activo.quitar}
                        title={`Quitar ${activo.campo}: ${activo.texto}`}
                      >
                        <span className="at-chip-campo">{activo.campo}</span>
                        <span className="at-chip-texto">{activo.texto}</span>
                        <span aria-hidden="true" className="at-chip-x">
                          ×
                        </span>
                        <span className="at-sr">Quitar filtro</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="at-btn at-btn--ghost at-btn--reset"
                  onClick={onRestablecer}
                >
                  <IconoReiniciar />
                  <span>Limpiar filtros</span>
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>
      {relleno > 0 ? <div className="at-banda-relleno" style={{ height: relleno }} aria-hidden="true" /> : null}
    </>
  );
}




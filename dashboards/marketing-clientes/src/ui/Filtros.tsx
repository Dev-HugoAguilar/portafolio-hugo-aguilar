/**
 * Barra de filtros.
 *
 * Reutiliza el lenguaje de controles del comparativo bancario y del Atlas vial
 * (fondo lavanda, borde e icono azules; el control activo pasa a blanco). Reglas
 * documentadas en la propia interfaz:
 *
 *  - dentro de una dimensión los valores se **suman** (OR);
 *  - entre dimensiones se **cruzan** (AND);
 *  - los filtros activos se muestran como etiquetas que se quitan una a una.
 */

import * as Popover from '@radix-ui/react-popover';
import { useMemo, useState } from 'react';

import type { Catalogo } from '../api/tipos';
import { etiquetaDispositivo, etiquetaFecha, type Filtros } from '../dominio';
import { IconoBuscar, IconoChevron, IconoFiltro, IconoReiniciar } from './iconos';

type Dimension = 'canales' | 'dispositivos' | 'paises';

export interface PropsFiltros {
  catalogo: Catalogo | null;
  filtros: Filtros;
  onPeriodo: (desde: string | null, hasta: string | null) => void;
  onAlternar: (dimension: Dimension, valor: string) => void;
  onLimpiar: (dimension: Dimension) => void;
  onRestablecer: () => void;
}

const ETIQUETA_CONTROL: Record<Dimension, string> = {
  canales: 'Canal',
  dispositivos: 'Dispositivo',
  paises: 'País',
};

function opcionesDe(catalogo: Catalogo | null, dimension: Dimension): string[] {
  if (!catalogo || !catalogo.datos_disponibles) return [];
  if (dimension === 'canales') return catalogo.filtros.canales;
  if (dimension === 'dispositivos') return catalogo.filtros.dispositivos;
  return catalogo.filtros.paises;
}


function ControlMultiple({
  etiqueta,
  opciones,
  seleccion,
  onAlternar,
  onLimpiar,
  etiquetaDe,
  vacio,
}: {
  etiqueta: string;
  opciones: string[];
  seleccion: string[];
  onAlternar: (valor: string) => void;
  onLimpiar: () => void;
  etiquetaDe?: (valor: string) => string;
  vacio?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const resolver = etiquetaDe ?? ((valor: string) => valor);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return opciones;
    return opciones.filter((opcion) => resolver(opcion).toLowerCase().includes(termino));
  }, [opciones, busqueda, resolver]);

  const resumen =
    seleccion.length === 0
      ? 'Todos'
      : seleccion.length === 1
        ? resolver(seleccion[0] as string)
        : `${seleccion.length} seleccionados`;

  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`mk-ctrl${seleccion.length > 0 ? ' is-activo' : ''}`}
          aria-label={`${etiqueta}: ${resumen}`}
          disabled={opciones.length === 0}
          title={opciones.length === 0 ? vacio ?? 'Sin valores disponibles' : undefined}
        >
          <span className="mk-ctrl-label">{etiqueta}</span>
          <span className="mk-ctrl-value">{opciones.length === 0 ? 'Sin datos' : resumen}</span>
          <IconoChevron tamano={12} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="mk-pop" sideOffset={6} align="start" collisionPadding={10}>
          <div className="mk-pop-head">
            <p className="mk-pop-title">{etiqueta}</p>
            <button type="button" className="mk-pop-limpiar" onClick={onLimpiar}>
              Limpiar
            </button>
          </div>
          {opciones.length > 6 ? (
            <label className="mk-pop-buscar">
              <IconoBuscar tamano={13} />
              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder={`Buscar en ${etiqueta.toLowerCase()}…`}
                aria-label={`Buscar en ${etiqueta.toLowerCase()}`}
              />
            </label>
          ) : null}
          <ul className="mk-pop-lista" role="group" aria-label={etiqueta}>
            {visibles.map((opcion) => {
              const activa = seleccion.includes(opcion);
              return (
                <li key={opcion}>
                  <button
                    type="button"
                    className={`mk-opcion${activa ? ' is-marcada' : ''}`}
                    aria-pressed={activa}
                    onClick={() => onAlternar(opcion)}
                  >
                    <span className="mk-caja" aria-hidden="true">
                      {activa ? '✓' : ''}
                    </span>
                    <span>{resolver(opcion)}</span>
                  </button>
                </li>
              );
            })}
            {visibles.length === 0 ? <li className="mk-pop-vacio">Sin coincidencias</li> : null}
          </ul>
          <p className="mk-pop-nota">
            Puedes elegir varios: se suman (OR). Entre filtros distintos se cruzan (AND).
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ControlPeriodo({
  limites,
  desde,
  hasta,
  onPeriodo,
  habilitado,
}: {
  limites: { desde: string | null; hasta: string | null };
  desde: string | null;
  hasta: string | null;
  onPeriodo: (desde: string | null, hasta: string | null) => void;
  habilitado: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const resumen =
    !desde && !hasta
      ? `${etiquetaFecha(limites.desde)} – ${etiquetaFecha(limites.hasta)}`
      : `${etiquetaFecha(desde)} – ${etiquetaFecha(hasta)}`;

  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`mk-ctrl mk-ctrl--ancho${desde || hasta ? ' is-activo' : ''}`}
          aria-label={`Periodo: ${resumen}`}
          disabled={!habilitado}
        >
          <span className="mk-ctrl-label">Periodo</span>
          <span className="mk-ctrl-value">{habilitado ? resumen : 'Sin datos'}</span>
          <IconoChevron tamano={12} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="mk-pop" sideOffset={6} align="start" collisionPadding={10}>
          <div className="mk-pop-head">
            <p className="mk-pop-title">Periodo</p>
            <button type="button" className="mk-pop-limpiar" onClick={() => onPeriodo(null, null)}>
              Todo el periodo
            </button>
          </div>
          <div className="mk-fechas">
            <label>
              <span>Desde</span>
              <input
                type="date"
                value={desde ?? limites.desde ?? ''}
                min={limites.desde ?? undefined}
                max={hasta ?? limites.hasta ?? undefined}
                onChange={(evento) => onPeriodo(evento.target.value || null, hasta)}
              />
            </label>
            <label>
              <span>Hasta</span>
              <input
                type="date"
                value={hasta ?? limites.hasta ?? ''}
                min={desde ?? limites.desde ?? undefined}
                max={limites.hasta ?? undefined}
                onChange={(evento) => onPeriodo(desde, evento.target.value || null)}
              />
            </label>
          </div>
          <p className="mk-pop-nota">
            El conjunto cubre del {etiquetaFecha(limites.desde)} al {etiquetaFecha(limites.hasta)}.
            Fuera de ese rango no hay observación, así que no se rellena con ceros.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function BarraFiltros({
  catalogo,
  filtros,
  onPeriodo,
  onAlternar,
  onLimpiar,
  onRestablecer,
}: PropsFiltros) {
  const habilitado = Boolean(catalogo?.datos_disponibles);
  const limites = catalogo?.filtros.periodo ?? { desde: null, hasta: null };

  const activos: { clave: string; texto: string; quitar: () => void }[] = [];
  if (filtros.desde || filtros.hasta) {
    activos.push({
      clave: 'periodo',
      texto: `${etiquetaFecha(filtros.desde)} – ${etiquetaFecha(filtros.hasta)}`,
      quitar: () => onPeriodo(null, null),
    });
  }
  for (const valor of filtros.canales) {
    activos.push({ clave: `canal-${valor}`, texto: valor, quitar: () => onAlternar('canales', valor) });
  }
  for (const valor of filtros.dispositivos) {
    activos.push({
      clave: `disp-${valor}`,
      texto: etiquetaDispositivo(valor),
      quitar: () => onAlternar('dispositivos', valor),
    });
  }
  for (const valor of filtros.paises) {
    activos.push({ clave: `pais-${valor}`, texto: valor, quitar: () => onAlternar('paises', valor) });
  }

  return (
    <section className="mk-filtros" aria-label="Filtros del tablero" data-testid="filtros">
      <div className="mk-filtros-fila">
        <span className="mk-filtros-icono" aria-hidden="true">
          <IconoFiltro tamano={14} />
        </span>

        <ControlPeriodo
          limites={limites}
          desde={filtros.desde}
          hasta={filtros.hasta}
          onPeriodo={onPeriodo}
          habilitado={habilitado}
        />

        {(['canales', 'dispositivos', 'paises'] as Dimension[]).map((dimension) => (
          <ControlMultiple
            key={dimension}
            etiqueta={ETIQUETA_CONTROL[dimension]}
            opciones={opcionesDe(catalogo, dimension)}
            seleccion={filtros[dimension]}
            onAlternar={(valor) => onAlternar(dimension, valor)}
            onLimpiar={() => onLimpiar(dimension)}
            etiquetaDe={
              dimension === 'dispositivos'
                ? (valor: string) => etiquetaDispositivo(valor)
                : undefined
            }
            vacio="Se habilita cuando el esquema y los datos lo permitan"
          />
        ))}

        <button
          type="button"
          className="mk-btn mk-btn--ghost mk-btn--reset"
          onClick={onRestablecer}
          disabled={activos.length === 0}
        >
          <IconoReiniciar />
          <span>Restablecer</span>
        </button>
      </div>

      {activos.length > 0 ? (
        <ul className="mk-chips" aria-label="Filtros activos">
          {activos.map((activo) => (
            <li key={activo.clave}>
              <button
                type="button"
                className="mk-chip"
                onClick={activo.quitar}
                title={`Quitar ${activo.texto}`}
              >
                <span>{activo.texto}</span>
                <span aria-hidden="true" className="mk-chip-x">
                  ×
                </span>
                <span className="mk-sr">Quitar filtro</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="mk-chip mk-chip--todo" onClick={onRestablecer}>
              Quitar todos
            </button>
          </li>
        </ul>
      ) : (
        <p className="mk-filtros-nota">
          Sin filtros. Dentro de un filtro los valores se suman (OR); entre filtros distintos se
          cruzan (AND). Los filtros afectan a las cuatro vistas del tablero.
        </p>
      )}
    </section>
  );
}

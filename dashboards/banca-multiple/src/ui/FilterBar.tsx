/**
 * Barra de filtros compartida (Radix UI + CSS propio).
 *
 *  - Una fila de controles con la misma altura: periodo, concepto e
 *    instituciones se comportan como selectores; deshacer es un botón de icono y
 *    restablecer, la acción principal.
 *  - Debajo, las etiquetas de los bancos seleccionados (con su color) y el
 *    recuento. El desglose de cartera solo aparece cuando el concepto lo admite.
 *  - Los desplegables son blancos, opacos y con scroll interno.
 */

import * as Checkbox from '@radix-ui/react-checkbox';
import * as Popover from '@radix-ui/react-popover';
import { useMemo, useState } from 'react';

import type { Catalogo, Concepto, GrupoCartera, Institucion } from '../api/types';
import { estiloMuestra } from '../colors';
import {
  COLOR,
  etapaDeCartera,
  etiquetaConcepto,
  etiquetaSeccion,
  grupoDeCartera,
  etiquetaPeriodo,
} from '../domain';
import {
  IconoDeshacer,
  IconoDesplegar,
  IconoInstituciones,
  IconoPeriodo,
  IconoPlegar,
  IconoRestablecer,
  IconoConcepto,
} from './icons';

export interface PropsFilterBar {
  catalogo: Catalogo;
  periodo: string;
  concepto: Concepto | null;
  grupos: GrupoCartera[];
  instituciones: Institucion[];
  seleccion: string[];
  resaltado: string | null;
  puedeDeshacer: boolean;
  deshabilitado: boolean;
  colores: Map<string, string>;
  patrones: Map<string, string | null>;
  onPeriodo: (periodo: string) => void;
  onConcepto: (concepto: string) => void;
  onAlternar: (institucionId: string) => void;
  onSeleccionarTodas: () => void;
  onLimpiarSeleccion: () => void;
  onDeshacer: () => void;
  onRestablecer: () => void;
}

export function FilterBar({
  catalogo,
  periodo,
  concepto,
  grupos,
  instituciones,
  seleccion,
  resaltado,
  puedeDeshacer,
  deshabilitado,
  colores,
  patrones,
  onPeriodo,
  onConcepto,
  onAlternar,
  onSeleccionarTodas,
  onLimpiarSeleccion,
  onDeshacer,
  onRestablecer,
}: PropsFilterBar) {
  const [abiertoPeriodo, setAbiertoPeriodo] = useState(false);
  const [abiertoConcepto, setAbiertoConcepto] = useState(false);
  const [abiertoInstituciones, setAbiertoInstituciones] = useState(false);
  const [busquedaConcepto, setBusquedaConcepto] = useState('');
  const [busquedaInstitucion, setBusquedaInstitucion] = useState('');

  const conceptosFiltrados = useMemo(() => {
    const termino = busquedaConcepto.trim().toLowerCase();
    return catalogo.conceptos
      .filter((item) => {
        if (!termino) return true;
        const etiqueta = etiquetaConcepto(item, grupos);
        return (
          etiqueta.completa.toLowerCase().includes(termino) ||
          etiqueta.seccion.toLowerCase().includes(termino)
        );
      })
      .sort((a, b) => {
        if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
        return a.orden - b.orden;
      });
  }, [catalogo.conceptos, grupos, busquedaConcepto]);

  const bancos = useMemo(
    () => instituciones.filter((institucion) => !institucion.es_sistema),
    [instituciones],
  );

  const bancosFiltrados = useMemo(() => {
    const termino = busquedaInstitucion.trim().toLowerCase();
    if (!termino) return bancos;
    return bancos.filter((institucion) => institucion.nombre.toLowerCase().includes(termino));
  }, [bancos, busquedaInstitucion]);

  const grupoActual = concepto ? grupoDeCartera(concepto.concepto_id, grupos) : null;
  const etapaActual = concepto ? etapaDeCartera(concepto.concepto_id, grupos) : null;
  const etiquetaActual = concepto ? etiquetaConcepto(concepto, grupos) : null;

  return (
    <div className="bm-filters" role="group" aria-label="Filtros compartidos">
      <div className="bm-filters-row">
        {/* ---------------------------------------------------------- periodo */}
        <Popover.Root open={abiertoPeriodo} onOpenChange={setAbiertoPeriodo}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="bm-select"
              data-testid="filtro-periodo"
              aria-label={`Periodo: ${etiquetaPeriodo(periodo)}`}
              aria-haspopup="dialog"
              aria-expanded={abiertoPeriodo}
              disabled={deshabilitado}
            >
              <IconoPeriodo className="bm-select-icono" />
              <span className="bm-select-texto">
                <span className="bm-select-label">Periodo</span>
                <span className="bm-select-value">{etiquetaPeriodo(periodo)}</span>
              </span>
              {abiertoPeriodo ? (
                <IconoPlegar tamano={16} className="bm-select-chevron" />
              ) : (
                <IconoDesplegar tamano={16} className="bm-select-chevron" />
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="bm-pop" sideOffset={6} align="start" aria-label="Periodo de referencia">
              <p className="bm-pop-title">Periodo de referencia</p>
              <div className="bm-pop-list">
                {[...catalogo.periodos].reverse().map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`bm-option${item === periodo ? ' is-on' : ''}`}
                    aria-pressed={item === periodo}
                    onClick={() => {
                      onPeriodo(item);
                      setAbiertoPeriodo(false);
                    }}
                  >
                    {etiquetaPeriodo(item)}
                    {item === catalogo.periodos[catalogo.periodos.length - 1] ? (
                      <span className="bm-option-tag">último</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* --------------------------------------------------------- concepto */}
        <Popover.Root open={abiertoConcepto} onOpenChange={setAbiertoConcepto}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="bm-select bm-select--wide"
              data-testid="filtro-concepto"
              aria-label={`Concepto: ${etiquetaActual?.completa ?? 'elegir'}`}
              aria-haspopup="dialog"
              aria-expanded={abiertoConcepto}
              disabled={deshabilitado}
            >
              <IconoConcepto className="bm-select-icono" />
              <span className="bm-select-texto">
                <span className="bm-select-label">Concepto</span>
                <span className="bm-select-value">{etiquetaActual?.completa ?? 'Elegir concepto'}</span>
              </span>
              {abiertoConcepto ? (
                <IconoPlegar tamano={16} className="bm-select-chevron" />
              ) : (
                <IconoDesplegar tamano={16} className="bm-select-chevron" />
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="bm-pop bm-pop--wide" sideOffset={6} align="start" aria-label="Concepto financiero">
              <label className="bm-pop-search">
                <span className="bm-sr">Buscar concepto</span>
                <input
                  type="search"
                  value={busquedaConcepto}
                  placeholder="Buscar concepto o sección…"
                  onChange={(evento) => setBusquedaConcepto(evento.target.value)}
                  autoFocus
                />
              </label>
              <div className="bm-pop-list">
                {conceptosFiltrados.map((item) => {
                  const etiqueta = etiquetaConcepto(item, grupos);
                  return (
                    <button
                      key={item.concepto_id}
                      type="button"
                      className={`bm-option bm-option--concepto${item.concepto_id === concepto?.concepto_id ? ' is-on' : ''}`}
                      aria-pressed={item.concepto_id === concepto?.concepto_id}
                      onClick={() => {
                        onConcepto(item.concepto_id);
                        setAbiertoConcepto(false);
                      }}
                    >
                      <span>
                        {item.destacado ? '★ ' : ''}
                        {etiqueta.completa}
                      </span>
                      <span className="bm-option-sub">{etiquetaSeccion(item.seccion)}</span>
                    </button>
                  );
                })}
                {conceptosFiltrados.length === 0 ? <p className="bm-pop-empty">Sin coincidencias.</p> : null}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* ----------------------------------------------------- instituciones */}
        <Popover.Root open={abiertoInstituciones} onOpenChange={setAbiertoInstituciones}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="bm-select bm-select--inst"
              data-testid="filtro-instituciones"
              aria-label={
                seleccion.length === 0
                  ? 'Instituciones: ninguna seleccionada'
                  : `Instituciones: ${seleccion.length} seleccionadas`
              }
              aria-haspopup="dialog"
              aria-expanded={abiertoInstituciones}
              disabled={deshabilitado}
            >
              <IconoInstituciones className="bm-select-icono" />
              <span className="bm-select-texto">
                <span className="bm-select-label">Instituciones</span>
                <span className="bm-select-value">
                  {seleccion.length === 0 ? 'Todas' : `${seleccion.length} seleccionada${seleccion.length === 1 ? '' : 's'}`}
                </span>
              </span>
              {abiertoInstituciones ? (
                <IconoPlegar tamano={16} className="bm-select-chevron" />
              ) : (
                <IconoDesplegar tamano={16} className="bm-select-chevron" />
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="bm-pop bm-pop--inst" sideOffset={6} align="start" aria-label="Selección de instituciones">
              <label className="bm-pop-search">
                <span className="bm-sr">Buscar institución</span>
                <input
                  type="search"
                  value={busquedaInstitucion}
                  placeholder="Buscar institución…"
                  onChange={(evento) => setBusquedaInstitucion(evento.target.value)}
                />
              </label>
              <div className="bm-pop-actions">
                <button type="button" className="bm-link" onClick={onSeleccionarTodas}>
                  Seleccionar todas
                </button>
                <button
                  type="button"
                  className="bm-link"
                  onClick={onLimpiarSeleccion}
                  disabled={seleccion.length === 0}
                >
                  Quitar selección
                </button>
              </div>
              <div className="bm-pop-list bm-pop-list--checks">
                {bancosFiltrados.map((institucion) => {
                  const marcado = seleccion.includes(institucion.institucion_id);
                  const color = colores.get(institucion.institucion_id) ?? COLOR.neutro;
                  return (
                    <label
                      key={institucion.institucion_id}
                      className={`bm-check-row${resaltado === institucion.institucion_id ? ' is-hover' : ''}`}
                    >
                      <Checkbox.Root
                        className="bm-checkbox"
                        checked={marcado}
                        onCheckedChange={() => onAlternar(institucion.institucion_id)}
                        aria-label={`Seleccionar ${institucion.nombre}`}
                      >
                        <Checkbox.Indicator className="bm-checkbox-dot" />
                      </Checkbox.Root>
                      <span
                        className="bm-swatch"
                        style={estiloMuestra(color, patrones.get(institucion.institucion_id) ?? null)}
                        aria-hidden="true"
                        data-institucion={institucion.institucion_id}
                        data-color={color}
                      />
                      <span className="bm-check-name">{institucion.nombre}</span>
                    </label>
                  );
                })}
                {bancosFiltrados.length === 0 ? <p className="bm-pop-empty">Sin coincidencias.</p> : null}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Dos funciones distintas, con el mismo acabado que los filtros:
            «Deshacer» revierte el último cambio (necesita historial) y
            «Restablecer» recupera los filtros iniciales. */}
        <div className="bm-actions">
          <button
            type="button"
            className="bm-btn bm-btn--accion bm-btn--accion-icono"
            onClick={onDeshacer}
            disabled={!puedeDeshacer}
            data-testid="deshacer"
            aria-label="Deshacer el último cambio"
            aria-disabled={!puedeDeshacer}
            title={puedeDeshacer ? 'Deshacer el último cambio' : 'No hay cambios que deshacer'}
          >
            <IconoDeshacer tamano={18} />
          </button>
          <button
            type="button"
            className="bm-btn bm-btn--accion"
            onClick={onRestablecer}
            data-testid="restablecer"
            aria-label="Restablecer los filtros iniciales"
            title="Recuperar periodo, concepto y selección iniciales"
          >
            <IconoRestablecer tamano={18} />
            Restablecer
          </button>
        </div>
      </div>

      {/* --------------------------------------------------- etiquetas y cartera */}
      <div className="bm-chips-row">
        <div className="bm-chips" aria-label="Instituciones seleccionadas" data-testid="etiquetas-seleccion">
          {seleccion.length === 0 ? (
            <span className="bm-chips-empty">
              Sin selección: el ranking y la dispersión muestran todo el universo del boletín.
            </span>
          ) : (
            seleccion.map((institucionId) => {
              const institucion = instituciones.find((item) => item.institucion_id === institucionId);
              const color = colores.get(institucionId) ?? COLOR.neutro;
              return (
                <span key={institucionId} className="bm-chip" data-testid={`chip-${institucionId}`}>
                  <span
                    className="bm-swatch"
                    style={{ background: color }}
                    aria-hidden="true"
                    data-institucion={institucionId}
                    data-color={color}
                  />
                  {institucion?.nombre ?? institucionId}
                  <button
                    type="button"
                    className="bm-chip-x"
                    aria-label={`Quitar ${institucion?.nombre ?? institucionId} de la selección`}
                    onClick={() => onAlternar(institucionId)}
                  >
                    ×
                  </button>
                </span>
              );
            })
          )}
        </div>

        {seleccion.length > 0 ? (
          <span className="bm-chips-count" data-testid="chips-count">
            {seleccion.length} instituci{seleccion.length === 1 ? 'ón' : 'ones'} seleccionada
            {seleccion.length === 1 ? '' : 's'}
          </span>
        ) : null}

        {grupoActual && etapaActual ? (
          <div className="bm-inline-group" data-testid="filtro-cartera">
            <span className="bm-inline-label">Cartera</span>
            {grupos.map((grupo) => {
              const activo = grupo.clave === grupoActual.clave;
              return (
                <button
                  key={grupo.clave}
                  type="button"
                  className={`bm-chip-btn${activo ? ' is-on' : ''}`}
                  aria-pressed={activo}
                  onClick={() => {
                    const etapa = Math.min(etapaActual, grupo.conceptos.length);
                    const destino = grupo.conceptos[etapa - 1];
                    if (destino) onConcepto(destino);
                  }}
                >
                  {grupo.nombre.replace('Cartera ', '')}
                </button>
              );
            })}
            <span className="bm-inline-sep" aria-hidden="true" />
            {grupoActual.conceptos.map((conceptoId, indice) => (
              <button
                key={conceptoId}
                type="button"
                className={`bm-chip-btn${indice + 1 === etapaActual ? ' is-on' : ''}`}
                aria-pressed={indice + 1 === etapaActual}
                onClick={() => onConcepto(conceptoId)}
              >
                Etapa {indice + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

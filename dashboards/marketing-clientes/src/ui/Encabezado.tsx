/**
 * Encabezado del tablero.
 *
 * Siempre visible: nombre, condición de los datos (muestra histórica y ofuscada),
 * periodo observado, fuente, acciones (compartir, exportar, restablecer,
 * metodología, ampliar) y regreso al portafolio. La navegación entre las cuatro
 * vistas vive aquí y comparte el mismo estado de filtros.
 */

import type { ReactElement } from 'react';

import type { Estado } from '../api/tipos';
import type { Vista } from '../estado';
import { etiquetaFecha } from '../dominio';
import {
  IconoAdquisicion,
  IconoCohortes,
  IconoDescarga,
  IconoEmbudo,
  IconoEnlace,
  IconoInformacion,
  IconoReiniciar,
  IconoResumen,
  IconoAmpliar,
  IconoReducir,
} from './iconos';

export interface PropsEncabezado {
  vista: Vista;
  onVista: (vista: Vista) => void;
  estado: Estado;
  hayFiltros: boolean;
  onRestablecer: () => void;
  onCompartir: () => void;
  onMetodologia: () => void;
  onExportar: () => void;
  onAmpliar: () => void;
  ampliado: boolean;
  copiado: boolean;
  actualizando: boolean;
  exportable: boolean;
}

const VISTAS: { id: Vista; etiqueta: string; icono: (p: { tamano?: number }) => ReactElement }[] = [
  { id: 'resumen', etiqueta: 'Resumen', icono: IconoResumen },
  { id: 'adquisicion', etiqueta: 'Adquisición', icono: IconoAdquisicion },
  { id: 'conversion', etiqueta: 'Conversión', icono: IconoEmbudo },
  { id: 'cohortes', etiqueta: 'Cohortes y retención', icono: IconoCohortes },
];

function fechaHora(iso: string | null | undefined): string {
  if (!iso) return 'sin registro';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dia = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return `${dia}, ${hora} h`;
}

export function Encabezado({
  vista,
  onVista,
  estado,
  hayFiltros,
  onRestablecer,
  onCompartir,
  onMetodologia,
  onExportar,
  onAmpliar,
  ampliado,
  copiado,
  actualizando,
  exportable,
}: PropsEncabezado) {
  const periodo = estado.periodo ?? { desde: null, hasta: null };
  return (
    <header className="mk-head">
      <div className="mk-head-top">
        <div className="mk-brand">
          <p className="mk-brand-name">Marketing y clientes</p>
          <span className="mk-brand-chip">Muestra de usuarios · datos históricos ofuscados de GA4</span>
        </div>
        <nav className="mk-nav" aria-label="Vistas del tablero">
          {VISTAS.map(({ id, etiqueta, icono: Icono }) => (
            <button
              key={id}
              type="button"
              className={`mk-nav-btn${vista === id ? ' is-activa' : ''}`}
              aria-current={vista === id ? 'page' : undefined}
              onClick={() => onVista(id)}
            >
              <Icono tamano={15} />
              <span>{etiqueta}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mk-head-body">
        <div className="mk-head-text">
          <h2 className="mk-titulo">Adquisición, conversión y retención</h2>
          <p className="mk-sub" data-testid="periodo-consultado">
            Periodo observado: <strong>{etiquetaFecha(periodo.desde)}</strong> a{' '}
            <strong>{etiquetaFecha(periodo.hasta)}</strong> · Fuente: muestra pública de eventos
            de comercio electrónico en BigQuery · Datos <strong>ofuscados y no actuales</strong>
            {estado.muestra && (estado.muestra.porcentaje ?? 0) > 0 ? (
              <>
                {' '}· <strong>muestra del {estado.muestra.porcentaje} % de usuarios</strong> (
                {estado.muestra.usuarios} usuarios)
              </>
            ) : null}
            {estado.version ? ` · versión ${estado.version}` : ''} · Última lectura:{' '}
            {fechaHora(estado.ultima_sincronizacion)}
          </p>
        </div>

        <div className="mk-head-acciones">
          <button type="button" className="mk-btn mk-btn--ghost" onClick={onCompartir}>
            <IconoEnlace />
            <span>{copiado ? 'Enlace copiado' : 'Compartir'}</span>
          </button>
          <button
            type="button"
            className="mk-btn mk-btn--ghost"
            onClick={onExportar}
            disabled={!exportable}
            title={
              exportable
                ? 'Descarga los agregados del rango (serie diaria, canales y total) con su fuente, muestra y definiciones'
                : 'Sin datos publicados no hay nada que exportar'
            }
          >
            <IconoDescarga />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            className="mk-btn mk-btn--ghost"
            onClick={onRestablecer}
            disabled={!hayFiltros}
          >
            <IconoReiniciar />
            <span>Restablecer</span>
          </button>
          <button type="button" className="mk-btn mk-btn--ghost" onClick={onMetodologia}>
            <IconoInformacion />
            <span>Metodología y datos</span>
          </button>
          <button
            type="button"
            className="mk-btn mk-btn--ghost"
            onClick={onAmpliar}
            aria-pressed={ampliado}
            title={ampliado ? 'Volver a la aplicación a su sitio' : 'Ver el tablero a pantalla completa'}
          >
            {ampliado ? <IconoReducir /> : <IconoAmpliar />}
            <span>{ampliado ? 'Reducir' : 'Ampliar'}</span>
          </button>
          <a className="mk-btn mk-btn--link" href="#/area/dashboards">
            Volver al portafolio
          </a>
        </div>
      </div>

      {estado.datos_disponibles ? null : (
        <p className="mk-head-aviso" role="status" data-testid="aviso-datos">
          Sin datos publicados: {estado.acceso_bigquery?.disponible ? 'falta ejecutar la ingesta' : 'este entorno no tiene acceso a BigQuery'}.
          El tablero muestra el estado pendiente y no cifras inventadas.
        </p>
      )}

      {actualizando ? (
        <p className="mk-cargando" role="status">
          <span className="mk-spinner" aria-hidden="true" /> Actualizando cifras…
        </p>
      ) : null}
    </header>
  );
}

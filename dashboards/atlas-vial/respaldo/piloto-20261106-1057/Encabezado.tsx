/**
 * Encabezado compacto del tablero.
 *
 * Siempre visible: nombre del tablero, periodo consultado real, fuente,
 * acceso a la metodología y regreso al portafolio. La
 * navegación entre las tres vistas vive aquí y comparte el mismo estado.
 */


import type { EstadoApp, Vista } from '../estado';
import { TabsVistas, type OpcionTabs } from './TabsVistas';
import { etiquetaFecha } from '../dominio';
import {
  IconoAmpliar,
  IconoDescarga,
  IconoEnlace,
  IconoInformacion,
  IconoMapa,
  IconoPersonas,
  IconoReducir,
  IconoTiempo,
} from './iconos';

export interface PropsEncabezado {
  vista: Vista;
  onVista: (vista: Vista) => void;
  periodo: { desde: string | null; hasta: string | null };
  ultimaSincronizacion: string | null;
  version: string | null;
  licencia: string;
  onCompartir: () => void;
  onMetodologia: () => void;
  onExportar: () => void;
  onAmpliar: () => void;
  ampliado: boolean;
  copiado: boolean;
  actualizando: boolean;
}

const VISTAS: OpcionTabs[] = [
  { id: 'territorio', etiqueta: 'Territorio', icono: IconoMapa },
  { id: 'tiempo', etiqueta: 'Tiempo y entorno vial', icono: IconoTiempo },
  { id: 'personas', etiqueta: 'Personas y vehículos', icono: IconoPersonas },
];

function fechaHora(iso: string | null): string {
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
  periodo,
  ultimaSincronizacion,
  version,
  licencia,
  onCompartir,
  onMetodologia,
  onExportar,
  onAmpliar,
  ampliado,
  copiado,
  actualizando,
}: PropsEncabezado) {
  return (
    <header className="at-head">
      <div className="at-head-top">
        <div className="at-brand">
          <p className="at-brand-name">Atlas vial · Ciudad de México</p>
          <span className="at-brand-chip">SSC · datos abiertos</span>
        </div>

        <div className="at-head-acciones">
          <button
            type="button"
            className="at-btn at-btn--ghost"
            onClick={onCompartir}
            title="Copia un enlace con los filtros actuales"
          >
            <IconoEnlace />
            <span>{copiado ? 'Enlace copiado' : 'Compartir'}</span>
          </button>
          <button type="button" className="at-btn at-btn--ghost" onClick={onExportar}>
            <IconoDescarga />
            <span>Exportar CSV</span>
          </button>
          <button type="button" className="at-btn at-btn--ghost" onClick={onMetodologia}>
            <IconoInformacion />
            <span>Metodología</span>
          </button>
          <button
            type="button"
            className="at-btn at-btn--ghost"
            onClick={onAmpliar}
            aria-pressed={ampliado}
            title={
              ampliado
                ? 'Volver a la aplicación a su sitio'
                : 'Ver el tablero a pantalla completa dentro del portafolio'
            }
          >
            {ampliado ? <IconoReducir /> : <IconoAmpliar />}
            <span>{ampliado ? 'Reducir' : 'Ampliar'}</span>
          </button>
          <a className="at-btn at-btn--link at-head-volver" href="#/area/dashboards">
            Volver al portafolio
          </a>
        </div>
      </div>

      <div className="at-head-titulo">
        <h2 className="at-titulo">Hechos de tránsito registrados en la Ciudad de México</h2>
        <p className="at-sub" data-testid="periodo-consultado">
          Periodo de los eventos: <strong>{etiquetaFecha(periodo.desde)}</strong> a{' '}
          <strong>{etiquetaFecha(periodo.hasta)}</strong> · Fuente: Secretaría de Seguridad
          Ciudadana de la CDMX ({licencia}) · Última sincronización correcta:{' '}
          {fechaHora(ultimaSincronizacion)}
          {version ? ` · versión ${version}` : ''}
        </p>
      </div>

      <div className="at-head-nav">
        <TabsVistas
          opciones={VISTAS}
          activa={vista}
          onElegir={onVista}
          etiquetaGrupo="Vistas del tablero"
        />
      </div>

      {actualizando ? (
        <p className="at-cargando" role="status">
          <span className="at-spinner" aria-hidden="true" /> Actualizando cifras…
        </p>
      ) : null}
    </header>
  );
}

/** Texto del rango de la consulta, para el pie y la exportación. */
export function textoConsulta(estado: EstadoApp): string {
  const { desde, hasta } = estado.filtros;
  return `${desde ?? estado.periodoPublicado.desde ?? 'inicio'} → ${
    hasta ?? estado.periodoPublicado.hasta ?? 'fin'
  }`;
}



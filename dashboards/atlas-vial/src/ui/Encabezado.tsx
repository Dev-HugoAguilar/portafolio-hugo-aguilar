/**
 * Encabezado compacto del tablero.
 *
 * Siempre visible: nombre del tablero, periodo consultado real, fuente,
 * acceso a la metodología y regreso al portafolio. La
 * navegación entre las tres vistas vive aquí y comparte el mismo estado.
 */


import type { Vista } from '../estado';
import { TabsWalmex, type OpcionTabsWalmex } from './TabsWalmex';
import { anioDeCobertura, leerPeriodo } from '../periodo';
import {
  IconoAmpliar,
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
  onMetodologia: () => void;
  onAmpliar: () => void;
  ampliado: boolean;
  actualizando: boolean;
}

const VISTAS: OpcionTabsWalmex<Vista>[] = [
  { clave: 'territorio', etiqueta: 'Territorio', icono: IconoMapa },
  { clave: 'tiempo', etiqueta: 'Tiempo y entorno vial', icono: IconoTiempo },
  { clave: 'personas', etiqueta: 'Personas y vehículos', icono: IconoPersonas },
];

export function Encabezado({
  vista,
  onVista,
  periodo,
  onMetodologia,
  onAmpliar,
  ampliado,
  actualizando,
}: PropsEncabezado) {
  const cobertura = leerPeriodo(
    periodo.desde,
    periodo.hasta,
    anioDeCobertura(periodo.desde, periodo.hasta),
  ).texto;
  return (
    <header className="at-head">
      <div className="at-head-top">
        <div className="at-brand">
          <p className="at-brand-eyebrow">ATLAS VIAL · CIUDAD DE MÉXICO</p>
          <span className="at-brand-chip">SSC · Datos abiertos</span>
        </div>

        <div className="at-head-acciones">
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
        </div>
      </div>

      <div className="at-head-titulo">
        <h2 className="at-titulo">Radiografía de los hechos de tránsito</h2>
        <p className="at-subtitulo">
          Explora dónde y cuándo ocurren, y las personas lesionadas y fallecidas registradas.
        </p>
        <p className="at-sub" data-testid="periodo-consultado">
          Periodo: <strong>{cobertura.toLowerCase()}</strong> · Fuente: SSC CDMX
        </p>
      </div>
      <div className="at-head-nav">
        <TabsWalmex<Vista>
          opciones={VISTAS}
          vista={vista}
          onVista={onVista}
          etiquetaGrupo="Vistas del tablero"
          variante="atlas"
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







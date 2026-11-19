/** Iconos en línea (SVG) del tablero: pocos, con el mismo grosor de trazo. */

interface PropsIcono {
  tamano?: number;
  className?: string;
}

const BASE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function IconoFlecha({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function IconoChevron({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function IconoDescarga({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M8 2v8M5 7.5L8 10.5l3-3M3 13h10" />
    </svg>
  );
}

export function IconoEnlace({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1a2.5 2.5 0 01-3.5-3.5l1-1" />
    </svg>
  );
}

export function IconoReiniciar({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M3 8a5 5 0 105-5H5.5M3 3v3h3" />
    </svg>
  );
}

export function IconoFiltro({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M2.5 3.5h11l-4.2 4.8v4.2l-2.6 1v-5.2z" />
    </svg>
  );
}

export function IconoBuscar({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <circle cx="7" cy="7" r="4" />
      <path d="M10 10l3 3" />
    </svg>
  );
}

export function IconoInformacion({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 7.2v4M8 5.1v.6" />
    </svg>
  );
}

export function IconoMapa({ tamano = 15, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M2.5 4.2l3.6-1.4 3.8 1.4 3.6-1.4v9l-3.6 1.4-3.8-1.4-3.6 1.4z" />
      <path d="M6.1 2.8v8.6M9.9 4.2V12" />
    </svg>
  );
}

export function IconoTiempo({ tamano = 15, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 4.8V8l2.4 1.6" />
    </svg>
  );
}

export function IconoPersonas({ tamano = 15, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <circle cx="6" cy="5.4" r="2.1" />
      <path d="M2.4 12.6c0-2 1.6-3.3 3.6-3.3s3.6 1.3 3.6 3.3" />
      <path d="M10.6 4.1a2 2 0 010 3.4M11.4 9.6c1.4.4 2.4 1.5 2.4 3" />
    </svg>
  );
}

export function IconoZoom({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <circle cx="7" cy="7" r="4" />
      <path d="M7 5.4v3.2M5.4 7h3.2M10 10l3 3" />
    </svg>
  );
}

export function IconoAmpliar({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10" />
    </svg>
  );
}

export function IconoReducir({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M2.5 6H6V2.5M13.5 6H10V2.5M2.5 10H6v3.5M13.5 10H10v3.5" />
    </svg>
  );
}

/** Borrador: acción de limpiar una selección dentro de un panel. */
export function IconoBorrador({ tamano = 16, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M5.6 13.2 2.4 10a1.6 1.6 0 0 1 0-2.3l5.3-5.3a1.6 1.6 0 0 1 2.3 0l3.2 3.2a1.6 1.6 0 0 1 0 2.3l-5.3 5.3a1.6 1.6 0 0 1-2.3 0Z" />
      <path d="M6.2 3.6 12.4 9.8M8 13.6h5.6" />
    </svg>
  );
}

/** Calendario: filtro de periodo por año y mes. */
export function IconoCalendario({ tamano = 16, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <rect x="2.4" y="3.6" width="11.2" height="10" rx="2" />
      <path d="M2.4 6.8h11.2M5.6 2.4v2.4M10.4 2.4v2.4" />
    </svg>
  );
}

/** Incidente vial: tipo de evento. */
export function IconoIncidente({ tamano = 16, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M8 2.2 14.4 13.4H1.6L8 2.2Z" />
      <path d="M8 6.2v3.1M8 11.4v.2" />
    </svg>
  );
}

/** Actividad: consecuencia del hecho (pulso). */
export function IconoActividad({ tamano = 16, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M1.6 8h2.6l1.6-4 2.4 8 1.6-4h4.6" />
    </svg>
  );
}

/** Persona con vendaje: personas lesionadas (métrica, 24px). */
export function IconoLesionado({ tamano = 24, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 24 24" {...BASE}>
      <circle cx="10" cy="7" r="3" />
      <path d="M4.5 20v-2.4a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4V20" />
      <path d="M16.2 9.4l4.4 4.4M18.4 7.2l-2.2 2.2M20.6 11.6l-2.2 2.2" />
    </svg>
  );
}

/** Símbolo de duelo: personas fallecidas (métrica, 24px). */
export function IconoDuelo({ tamano = 24, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 24 24" {...BASE}>
      <path d="M12 3c2.6 2.4 4 4.6 4 7a4 4 0 0 1-8 0c0-2.4 1.4-4.6 4-7Z" />
      <path d="M6.5 20c1.4-2.6 3.2-3.8 5.5-3.8s4.1 1.2 5.5 3.8" />
    </svg>
  );
}

/** Incidente vial con distintivo de duelo: hechos con fallecimientos. */
export function IconoIncidenteDuelo({ tamano = 24, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 24 24" {...BASE}>
      <path d="M9 3.4 2.6 14.2h12.8L9 3.4Z" />
      <path d="M9 7.6v4.2M9 13.6v.2" />
      <path d="M16.6 12.4c1.5 1.5 2.3 2.7 2.3 3.9a2.3 2.3 0 0 1-4.6 0c0-1.2.8-2.4 2.3-3.9Z" />
    </svg>
  );
}

/** Cerrar / descartar cambios. */
export function IconoCerrar({ tamano = 18, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 18 18" {...BASE}>
      <path d="M4.6 4.6l8.8 8.8M13.4 4.6l-8.8 8.8" />
    </svg>
  );
}

/** Confirmar / verificación. */
export function IconoVerificar({ tamano = 18, className }: PropsIcono) {
  return (
    <svg className={className ?? 'at-icono'} width={tamano} height={tamano} viewBox="0 0 18 18" {...BASE}>
      <path d="M3.4 9.6l3.6 3.6 7.6-8" />
    </svg>
  );
}

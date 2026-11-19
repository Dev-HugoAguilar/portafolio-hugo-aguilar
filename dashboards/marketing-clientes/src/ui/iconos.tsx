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
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function IconoChevron({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

export function IconoDescarga({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M8 2v8M5 7.5L8 10.5l3-3M3 13h10" />
    </svg>
  );
}

export function IconoEnlace({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1a2.5 2.5 0 01-3.5-3.5l1-1" />
    </svg>
  );
}

export function IconoReiniciar({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M3 8a5 5 0 105-5H5.5M3 3v3h3" />
    </svg>
  );
}

export function IconoFiltro({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M2.5 3.5h11l-4.2 4.8v4.2l-2.6 1v-5.2z" />
    </svg>
  );
}

export function IconoBuscar({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <circle cx="7" cy="7" r="4" />
      <path d="M10 10l3 3" />
    </svg>
  );
}

export function IconoInformacion({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 7.2v4M8 5.1v.6" />
    </svg>
  );
}

export function IconoTiempo({ tamano = 15, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 4.8V8l2.4 1.6" />
    </svg>
  );
}

export function IconoPersonas({ tamano = 15, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <circle cx="6" cy="5.4" r="2.1" />
      <path d="M2.4 12.6c0-2 1.6-3.3 3.6-3.3s3.6 1.3 3.6 3.3" />
      <path d="M10.6 4.1a2 2 0 010 3.4M11.4 9.6c1.4.4 2.4 1.5 2.4 3" />
    </svg>
  );
}

export function IconoAmpliar({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10" />
    </svg>
  );
}

export function IconoReducir({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M2.5 6H6V2.5M13.5 6H10V2.5M2.5 10H6v3.5M13.5 10H10v3.5" />
    </svg>
  );
}

export function IconoResumen({ tamano = 15, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M2.5 13.5h11M4 13.5V7M8 13.5V3.5M12 13.5V9.5" />
    </svg>
  );
}

export function IconoAdquisicion({ tamano = 15, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M2.5 12.5l4-4 2.5 2.5 4.5-5" />
      <path d="M9.5 6h4v4" />
    </svg>
  );
}

export function IconoEmbudo({ tamano = 15, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M2 3h12l-4.5 5v4l-3 1.5V8z" />
    </svg>
  );
}

export function IconoCohortes({ tamano = 15, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <path d="M2.5 6.5h11M2.5 10h11M6.5 2.5v11" />
    </svg>
  );
}

export function IconoAviso({ tamano = 14, className }: PropsIcono) {
  return (
    <svg className={className ?? 'mk-icono'} width={tamano} height={tamano} viewBox="0 0 16 16" {...BASE}>
      <path d="M8 2.5l5.5 10h-11z" />
      <path d="M8 6.5v3M8 11.2v.4" />
    </svg>
  );
}
/**
 * Iconografía del módulo: una sola familia, **Phosphor Icons**
 * (`@phosphor-icons/react`, peso `regular`).
 *
 * Reglas de uso (dirección visual):
 *  - Controles: 18–20 px. Indicadores: máximo 22 px, solo si aclaran algo.
 *  - Color habitual `#596273`; azul `#3458F5` para acciones destacadas.
 *  - Sin cuadrados pastel, degradados, sombras ni animaciones decorativas.
 *  - Los iconos son decorativos (`aria-hidden`): el nombre accesible lo aporta
 *    el texto del botón o su `aria-label`.
 */

import {
  ArrowCounterClockwise,
  ArrowUUpLeft,
  ArrowsInSimple,
  ArrowsOutSimple,
  Buildings,
  CalendarBlank,
  CaretDown,
  CaretUp,
  ChartPie,
  Coins,
  FileText,
  SelectionPlus,
  StackSimple,
  X,
} from '@phosphor-icons/react';

export interface PropsIcono {
  tamano?: number;
  className?: string;
}

const base = (tamano: number, className?: string) => ({
  size: tamano,
  weight: 'regular' as const,
  className: `bm-icono${className ? ` ${className}` : ''}`,
  'aria-hidden': true as const,
  focusable: 'false' as const,
});

/** Periodo: calendario. */
export const IconoPeriodo = ({ tamano = 18, className }: PropsIcono) => (
  <CalendarBlank {...base(tamano, className)} />
);

/** Concepto y fuentes: documento. */
export const IconoConcepto = ({ tamano = 18, className }: PropsIcono) => (
  <FileText {...base(tamano, className)} />
);
export const IconoFuentes = IconoConcepto;

/** Instituciones: edificio institucional. */
export const IconoInstituciones = ({ tamano = 18, className }: PropsIcono) => (
  <Buildings {...base(tamano, className)} />
);

/** Deshacer: flecha de retorno. */
export const IconoDeshacer = ({ tamano = 18, className }: PropsIcono) => (
  <ArrowUUpLeft {...base(tamano, className)} />
);

/** Restablecer: flecha circular. */
export const IconoRestablecer = ({ tamano = 18, className }: PropsIcono) => (
  <ArrowCounterClockwise {...base(tamano, className)} />
);

/** Ampliar / reducir: esquinas de expansión. */
export const IconoAmpliar = ({ tamano = 18, className }: PropsIcono) => (
  <ArrowsOutSimple {...base(tamano, className)} />
);
export const IconoReducir = ({ tamano = 18, className }: PropsIcono) => (
  <ArrowsInSimple {...base(tamano, className)} />
);

/** Desplegable cerrado / abierto. */
export const IconoDesplegar = ({ tamano = 16, className }: PropsIcono) => (
  <CaretDown {...base(tamano, className)} />
);
export const IconoPlegar = ({ tamano = 16, className }: PropsIcono) => (
  <CaretUp {...base(tamano, className)} />
);

/** Indicador «Activo del sistema»: símbolo financiero discreto. */
export const IconoSistema = ({ tamano = 20, className }: PropsIcono) => (
  <Coins {...base(tamano, className)} />
);

/** Indicador «Selección»: selección múltiple. */
export const IconoSeleccion = ({ tamano = 20, className }: PropsIcono) => (
  <SelectionPlus {...base(tamano, className)} />
);

/** Indicador «Participación»: gráfico de proporción. */
export const IconoParticipacion = ({ tamano = 20, className }: PropsIcono) => (
  <ChartPie {...base(tamano, className)} />
);

/** Indicador «Concentración Top 5»: agrupación (sin trofeo). */
export const IconoConcentracion = ({ tamano = 20, className }: PropsIcono) => (
  <StackSimple {...base(tamano, className)} />
);

/** Cerrar. */
export const IconoCerrar = ({ tamano = 18, className }: PropsIcono) => (
  <X {...base(tamano, className)} />
);

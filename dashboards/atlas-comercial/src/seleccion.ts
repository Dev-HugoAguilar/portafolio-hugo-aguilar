/**
 * Resolución y validación de la selección del pronóstico.
 *
 * Un solo lugar decide qué nivel y qué artículos se piden. Las reglas son las mismas que
 * valida la API, pero se aplican **antes** de enviar la petición:
 *
 * - Los niveles agregados (`total`, `estado`, `tienda`, `categoria`, `departamento`) aceptan
 *   cualquier contexto territorial o de catálogo, incluido el vacío.
 * - El nivel `producto` exige **tienda** y **al menos un artículo**; sin ellos, la selección
 *   está incompleta y no se consulta nada.
 * - Si el contexto cambia y deja inválida una selección de artículo que era válida, se
 *   propone un nivel agregado coherente en lugar de dejar un nivel residual.
 *
 * La API conserva sus validaciones: aquí no se «arregla» una petición inválida
 * convirtiéndola en «todos», solo se evita enviarla y se explica por qué.
 */

import type { NivelPronosticoNivel } from './api';

export type EstadoSeleccion = 'listo' | 'incompleta';

export interface SeleccionPronostico {
  estado: EstadoSeleccion;
  /** Nivel que se consulta (igual al pedido cuando está listo). */
  nivel: NivelPronosticoNivel;
  /** Artículos que viajan en `items` (vacío fuera del nivel producto). */
  items: string[];
  /** Campos que faltan para poder consultar. */
  faltan: ('tienda' | 'articulo')[];
  /** Explicación breve cuando la selección no permite consultar. */
  mensaje: string | null;
}

/** Niveles que la API sirve sin condiciones adicionales. */
const AGREGADOS: NivelPronosticoNivel[] = [
  'total',
  'estado',
  'tienda',
  'categoria',
  'departamento',
];

export const esNivelAgregado = (nivel: NivelPronosticoNivel) => AGREGADOS.includes(nivel);

/**
 * Nivel agregado equivalente cuando el artículo deja de ser posible.
 *
 * Se conserva el detalle que sí tiene sentido con el contexto actual: si hay departamento,
 * ese departamento; si hay categoría, la categoría; si no, el total del contexto.
 */
export function nivelAgregadoSugerido({
  departamento,
  categoria,
}: {
  departamento: string | null;
  categoria: string | null;
}): NivelPronosticoNivel {
  if (departamento) return 'departamento';
  if (categoria) return 'categoria';
  return 'total';
}

export function resolverSeleccionPronostico({
  nivel,
  tienda,
  articulo,
  /** `false` cuando el artículo cargado pertenece a otro departamento del contexto. */
  articuloCompatible = true,
}: {
  nivel: NivelPronosticoNivel;
  tienda: string | null;
  articulo: string | null;
  articuloCompatible?: boolean;
}): SeleccionPronostico {
  if (esNivelAgregado(nivel)) {
    return { estado: 'listo', nivel, items: [], faltan: [], mensaje: null };
  }

  if (nivel !== 'producto') {
    // Niveles cruzados que la interfaz no ofrece: se resuelven al total, nunca se envían.
    return {
      estado: 'listo',
      nivel: 'total',
      items: [],
      faltan: [],
      mensaje:
        'El nivel elegido no está disponible en esta pantalla: se muestra el total del contexto.',
    };
  }

  const faltan: ('tienda' | 'articulo')[] = [];
  if (!tienda) faltan.push('tienda');
  if (!articulo) faltan.push('articulo');

  if (faltan.length) {
    const piezas: string[] = [];
    if (faltan.includes('tienda')) piezas.push('una tienda');
    if (faltan.includes('articulo')) piezas.push('un artículo');
    return {
      estado: 'incompleta',
      nivel: 'producto',
      items: [],
      faltan,
      mensaje: `El pronóstico por artículo necesita ${piezas.join(' y ')}. Elige ${
        piezas.length > 1 ? 'ambos' : piezas[0]
      } en el contexto para consultarlo.`,
    };
  }

  if (!articuloCompatible) {
    return {
      estado: 'incompleta',
      nivel: 'producto',
      items: [],
      faltan: ['articulo'],
      mensaje:
        'El artículo seleccionado no pertenece al departamento del contexto. Elige uno de la lista.',
    };
  }

  return { estado: 'listo', nivel: 'producto', items: [articulo as string], faltan: [], mensaje: null };
}

/**
 * Estados excluyentes de una consulta. Uno y solo uno se muestra a la vez:
 * no se puede afirmar «sin pronóstico publicado» mientras se está cargando o cuando la
 * selección está incompleta.
 */
export type EstadoConsulta =
  | 'cargando'
  | 'incompleta'
  | 'error_validacion'
  | 'error_conexion'
  | 'sin_resultados'
  | 'listo';

export function estadoDeConsulta({
  seleccion,
  cargando,
  tipoError,
  hayDatos,
  series,
}: {
  seleccion: SeleccionPronostico;
  cargando: boolean;
  tipoError: 'validacion' | 'conexion' | null;
  hayDatos: boolean;
  series: number;
}): EstadoConsulta {
  if (seleccion.estado === 'incompleta') return 'incompleta';
  if (tipoError === 'validacion') return 'error_validacion';
  if (tipoError === 'conexion') return 'error_conexion';
  if (cargando) return 'cargando';
  if (!hayDatos) return 'cargando';
  if (series === 0) return 'sin_resultados';
  return 'listo';
}

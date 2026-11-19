/**
 * Concentración de unidades: cálculo exacto del umbral.
 *
 * La pregunta que responde el bloque es «¿cuántos productos concentran al menos el X % de
 * las unidades vendidas?». La respuesta se calcula aquí, sobre la lista **exacta** de
 * productos que publica la API (`concentracion.exacto`), no sobre la curva reducida que se
 * dibuja: muestrear la curva cambiaría el número de productos del grupo.
 *
 * Reglas del cálculo:
 * - Se recorre la lista ya ordenada de mayor a menor (desempate por identificador en el
 *   servidor) y se toma el **primer producto cuyo acumulado alcanza o supera** el objetivo.
 * - No se interpola ninguna fracción de producto.
 * - Se distinguen el objetivo pedido y el porcentaje realmente alcanzado, que puede ser
 *   mayor porque las unidades son enteras.
 * - El universo y el total no cambian al mover el objetivo: solo cambia el grupo.
 */

export interface ProductoExacto {
  item_id: string;
  unidades: number;
  cat_id: string | null;
  dept_id: string | null;
}

export interface UniversoConcentracion {
  productos: ProductoExacto[];
  total: number;
}

export interface LecturaUmbral {
  /** Objetivo pedido en porcentaje de unidades (1–100). */
  objetivo: number;
  /** Mínimo número de productos (entero) que alcanza el objetivo. */
  productos: number;
  /** Productos del universo. */
  universo: number;
  /** Porcentaje del universo que representan esos productos. */
  porcentajeProductos: number;
  /** Unidades acumuladas por ese grupo. */
  unidades: number;
  /** Porcentaje de unidades realmente alcanzado (≥ objetivo salvo objetivo 100). */
  porcentajeUnidades: number;
  /** Unidades necesarias según el objetivo, sin redondear. */
  unidadesObjetivo: number;
  /** Grupo de productos que forma el umbral, en el orden de la curva. */
  grupo: ProductoExacto[];
}

/** Convierte las filas compactas de la API en productos tipados. */
export function productosExactos(filas: (string | number | null)[][] | undefined | null): ProductoExacto[] {
  if (!filas?.length) return [];
  return filas.map((fila) => ({
    item_id: String(fila[0] ?? ''),
    unidades: Number(fila[1] ?? 0),
    cat_id: fila[2] === null || fila[2] === undefined ? null : String(fila[2]),
    dept_id: fila[3] === null || fila[3] === undefined ? null : String(fila[3]),
  }));
}

/**
 * Lectura exacta del umbral.
 *
 * `objetivo` se acota a 1–100. Con universo vacío o total no positivo devuelve `null`:
 * no hay curva ni grupo que calcular.
 */
export function lecturaUmbral(
  universo: UniversoConcentracion,
  objetivo: number,
): LecturaUmbral | null {
  const total = universo.total;
  const productos = universo.productos;
  if (!productos.length || !(total > 0)) return null;

  const meta = (Math.min(100, Math.max(1, Math.round(objetivo))) / 100) * total;
  let acumulado = 0;
  let posicion = 0;
  for (const producto of productos) {
    acumulado += producto.unidades;
    posicion += 1;
    // Primer producto que alcanza o supera el objetivo: nunca se interpola.
    if (acumulado >= meta) break;
  }

  return {
    objetivo: Math.min(100, Math.max(1, Math.round(objetivo))),
    productos: posicion,
    universo: productos.length,
    porcentajeProductos: (100 * posicion) / productos.length,
    unidades: acumulado,
    porcentajeUnidades: (100 * acumulado) / total,
    unidadesObjetivo: meta,
    grupo: productos.slice(0, posicion),
  };
}

/** Texto calculado del bloque; no contiene cifras fijas. */
export function textoUmbral(lectura: LecturaUmbral, numero: (valor: number) => string): string {
  return (
    `Para alcanzar al menos el ${lectura.objetivo} % de las unidades se necesitan ` +
    `${numero(lectura.productos)} ${lectura.productos === 1 ? 'producto' : 'productos'}, ` +
    `equivalentes al ${lectura.porcentajeProductos.toLocaleString('es-MX', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} % del universo.`
  );
}

/** Opciones rápidas de objetivo (porcentaje de unidades, no de productos). */
export const OBJETIVOS_RAPIDOS = [50, 70, 80, 90, 95];

/** Objetivo por omisión del bloque. */
export const OBJETIVO_INICIAL = 80;

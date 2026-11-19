/**
 * Cliente HTTP de la API de marketing.
 *
 * El navegador solo habla con la API del backend; nunca con BigQuery y nunca con
 * credenciales de Google. Los parámetros de filtro son los mismos en todas las
 * vistas, así que tarjetas, gráficas, tabla y exportación piden el mismo
 * subconjunto.
 */

import type { Adquisicion, Catalogo, Cohortes, Conversion, Estado, Productos, Resumen, Tabla } from './tipos';

export const RUTA_API_POR_OMISION = 'http://127.0.0.1:8010/api/v1/marketing';

export function resolverApiBase(explicita?: string): string {
  const global = (window as unknown as { PORTFOLIO_MARKETING_API?: string }).PORTFOLIO_MARKETING_API;
  const base = explicita || global || RUTA_API_POR_OMISION;
  return base.replace(/\/+$/, '');
}

export class ErrorApi extends Error {
  readonly status: number;

  constructor(mensaje: string, status = 0) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.status = status;
  }
}

export type ParametrosFiltro = Array<[string, string]>;

async function pedir<T>(url: string, senal: AbortSignal): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      signal: senal,
      headers: { Accept: 'application/json' },
      mode: 'cors',
      credentials: 'omit',
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ErrorApi(
      'No se pudo contactar con la API de marketing. Comprueba que el backend esté en ' +
        'marcha (uvicorn app.main:app --port 8010) y que el origen esté permitido por CORS.',
    );
  }

  if (!respuesta.ok) {
    let detalle = `La API respondió ${respuesta.status}.`;
    try {
      const cuerpo = (await respuesta.json()) as { detail?: unknown };
      if (typeof cuerpo.detail === 'string') detalle = cuerpo.detail;
      else if (Array.isArray(cuerpo.detail) && cuerpo.detail.length) {
        const primero = cuerpo.detail[0] as { msg?: string };
        detalle = primero.msg ?? detalle;
      }
    } catch {
      /* el cuerpo no era JSON: se usa el mensaje genérico */
    }
    throw new ErrorApi(detalle, respuesta.status);
  }

  return (await respuesta.json()) as T;
}

function conParametros(
  base: string,
  ruta: string,
  params: ParametrosFiltro,
  extra: ParametrosFiltro = [],
): string {
  const consulta = new URLSearchParams();
  for (const [clave, valor] of [...params, ...extra]) consulta.append(clave, valor);
  const texto = consulta.toString();
  return `${base}${ruta}${texto ? `?${texto}` : ''}`;
}

export function crearCliente(apiBase: string) {
  return {
    apiBase,

    estado: (senal: AbortSignal) => pedir<Estado>(`${apiBase}/estado`, senal),

    catalogo: (filtros: ParametrosFiltro, senal: AbortSignal) =>
      pedir<Catalogo>(conParametros(apiBase, '/catalogo', filtros), senal),

    resumen: (filtros: ParametrosFiltro, senal: AbortSignal) =>
      pedir<Resumen>(conParametros(apiBase, '/resumen', filtros), senal),

    adquisicion: (filtros: ParametrosFiltro, senal: AbortSignal) =>
      pedir<Adquisicion>(conParametros(apiBase, '/adquisicion', filtros), senal),

    conversion: (filtros: ParametrosFiltro, senal: AbortSignal) =>
      pedir<Conversion>(conParametros(apiBase, '/conversion', filtros), senal),

    cohortes: (filtros: ParametrosFiltro, dimension: string, senal: AbortSignal) =>
      pedir<Cohortes>(
        conParametros(apiBase, '/cohortes', filtros, [['dimension', dimension]]),
        senal,
      ),

    productos: (filtros: ParametrosFiltro, senal: AbortSignal, limite = 10) =>
      pedir<Productos>(
        conParametros(apiBase, '/productos', filtros, [['limite', String(limite)]]),
        senal,
      ),

    tabla: (
      filtros: ParametrosFiltro,
      opciones: { orden: string; sentido: string; pagina: number; tamano: number },
      senal: AbortSignal,
    ) =>
      pedir<Tabla>(
        conParametros(apiBase, '/tabla', filtros, [
          ['orden', opciones.orden],
          ['sentido', opciones.sentido],
          ['pagina', String(opciones.pagina)],
          ['tamano', String(opciones.tamano)],
        ]),
        senal,
      ),

    urlExportar: (filtros: ParametrosFiltro) => conParametros(apiBase, '/exportar', filtros),
  };
}

export type Cliente = ReturnType<typeof crearCliente>;


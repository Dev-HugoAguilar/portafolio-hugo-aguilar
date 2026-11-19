/** Cliente HTTP de la API de la CNBV (misma API del backend; nunca MongoDB). */

import type {
  Catalogo,
  Detalle,
  Indicadores,
  Resumen,
  Series,
} from './types';

export const RUTA_API_POR_OMISION = 'http://127.0.0.1:8010/api/v1/cnbv/banca-multiple';

/**
 * Orden de resolución de la base de la API:
 *  1. lo que pase el módulo del portafolio al montar (`opts.apiBase`),
 *  2. `window.PORTFOLIO_BANCA_API` (útil si la API corre en otro puerto),
 *  3. valor local por omisión.
 */
export function resolverApiBase(explicita?: string): string {
  const global = (window as unknown as { PORTFOLIO_BANCA_API?: string }).PORTFOLIO_BANCA_API;
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
      'No se pudo contactar con la API de la CNBV. Comprueba que el backend esté en marcha ' +
        '(uvicorn app.main:app --port 8010) y que el origen esté permitido por CORS.',
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

function conParametros(base: string, ruta: string, params: Array<[string, string]>): string {
  const consulta = new URLSearchParams();
  for (const [clave, valor] of params) consulta.append(clave, valor);
  const texto = consulta.toString();
  return `${base}${ruta}${texto ? `?${texto}` : ''}`;
}

export interface ParametrosResumen {
  periodo: string;
  concepto: string;
  instituciones: string[];
}

export function crearCliente(apiBase: string) {
  return {
    apiBase,

    catalogo: (senal: AbortSignal) => pedir<Catalogo>(`${apiBase}/catalogo`, senal),

    resumen: ({ periodo, concepto, instituciones }: ParametrosResumen, senal: AbortSignal) =>
      pedir<Resumen>(
        conParametros(apiBase, '/resumen', [
          ['periodo', periodo],
          ['concepto', concepto],
          ...instituciones.map((id): [string, string] => ['institucion', id]),
        ]),
        senal,
      ),

    series: (
      { concepto, instituciones }: { concepto: string; instituciones: string[] },
      senal: AbortSignal,
    ) =>
      pedir<Series>(
        conParametros(apiBase, '/series', [
          ['concepto', concepto],
          // El agregado del sector se pide siempre: es la referencia de la serie.
          ['institucion', 'sistema'],
          ...instituciones.map((id): [string, string] => ['institucion', id]),
        ]),
        senal,
      ),

    detalle: (
      {
        periodo,
        concepto,
        instituciones,
        page,
        pageSize,
        orden,
      }: ParametrosResumen & { page: number; pageSize: number; orden: 'valor' | 'institucion' },
      senal: AbortSignal,
    ) =>
      pedir<Detalle>(
        conParametros(apiBase, '/detalle', [
          ['periodo', periodo],
          ['concepto', concepto],
          ...instituciones.map((id): [string, string] => ['institucion', id]),
          ['page', String(page)],
          ['page_size', String(pageSize)],
          ['orden', orden],
        ]),
        senal,
      ),

    indicadores: ({ periodo }: { periodo: string }, senal: AbortSignal) =>
      pedir<Indicadores>(
        conParametros(apiBase, '/indicadores', [['periodo', periodo]]),
        senal,
      ),
  };
}

export type Cliente = ReturnType<typeof crearCliente>;

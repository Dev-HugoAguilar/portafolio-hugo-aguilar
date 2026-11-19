/**
 * Cliente HTTP de la API del Atlas vial.
 *
 * El navegador solo habla con la API del backend; nunca descarga los CSV
 * oficiales ni se conecta a MongoDB. Los parámetros son los mismos en todas las
 * vistas, de modo que mapa, gráficas, tabla y exportación piden el mismo
 * subconjunto y no pueden discrepar.
 */

import type {
  Catalogo,
  EstadoPublico,
  EventoDetalle,
  Geometria,
  Personas,
  PuntosMapa,
  Resumen,
  Tabla,
  Celdas,
  Colonias,
  Tiempo,
  Territorio,
} from './tipos';

export const RUTA_API_POR_OMISION = 'http://127.0.0.1:8010/api/v1/atlas-vial';

/**
 * Base de la API, en orden:
 *  1. lo que pase el módulo del portafolio al montar (`opts.apiBase`),
 *  2. `window.PORTFOLIO_ATLAS_API`,
 *  3. valor local por omisión.
 */
export function resolverApiBase(explicita?: string): string {
  const global = (window as unknown as { PORTFOLIO_ATLAS_API?: string }).PORTFOLIO_ATLAS_API;
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

/** Filtros tal como viajan a la API (listas paralelas y nombres de la API). */
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
      'No se pudo contactar con la API del Atlas vial. Comprueba que el backend esté en ' +
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

    estado: (senal: AbortSignal) => pedir<EstadoPublico>(`${apiBase}/estado`, senal),

    catalogo: (senal: AbortSignal) => pedir<Catalogo>(`${apiBase}/catalogo`, senal),

    resumen: (filtros: ParametrosFiltro, senal: AbortSignal) =>
      pedir<Resumen>(conParametros(apiBase, '/resumen', filtros), senal),

    territorio: (
      filtros: ParametrosFiltro,
      opciones: { modo: string; celda?: number | null; incluirPuntos?: boolean },
      senal: AbortSignal,
    ) => {
      const extra: ParametrosFiltro = [['modo', opciones.modo]];
      if (opciones.celda) extra.push(['celda', String(opciones.celda)]);
      // El coroplético solo necesita el agregado por alcaldía: los puntos se
      // piden aparte a /puntos para agruparlos por zoom en el navegador.
      if (opciones.incluirPuntos === false) extra.push(['incluir_puntos', 'false']);
      return pedir<Territorio>(conParametros(apiBase, '/territorio', filtros, extra), senal);
    },

    colonias: (filtros: ParametrosFiltro, orden: string, limite: number, senal: AbortSignal) =>
      pedir<Colonias>(
        conParametros(apiBase, '/colonias', filtros, [
          ['orden', orden],
          ['limite', String(limite)],
        ]),
        senal,
      ),

    celdas: (filtros: ParametrosFiltro, senal: AbortSignal) =>
      pedir<Celdas>(conParametros(apiBase, '/celdas', filtros), senal),

    puntos: (filtros: ParametrosFiltro, senal: AbortSignal) =>
      pedir<PuntosMapa>(conParametros(apiBase, '/puntos', filtros), senal),

    geometria: (senal: AbortSignal) => pedir<Geometria>(`${apiBase}/geometria`, senal),

    tiempo: (filtros: ParametrosFiltro, agregacion: string, senal: AbortSignal) =>
      pedir<Tiempo>(
        conParametros(apiBase, '/tiempo', filtros, [['agregacion', agregacion]]),
        senal,
      ),

    personas: (filtros: ParametrosFiltro, senal: AbortSignal) =>
      pedir<Personas>(conParametros(apiBase, '/personas', filtros), senal),

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

    evento: (folio: string, senal: AbortSignal) =>
      pedir<EventoDetalle>(
        `${apiBase}/evento/${folio.split('/').map(encodeURIComponent).join('/')}`,
        senal,
      ),

    urlExportar: (filtros: ParametrosFiltro) => conParametros(apiBase, '/exportar', filtros),
  };
}

export type Cliente = ReturnType<typeof crearCliente>;



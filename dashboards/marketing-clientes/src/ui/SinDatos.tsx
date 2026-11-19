/**
 * Panel de «sin versión publicada».
 *
 * Se muestra solo cuando la API no encuentra una versión publicada: no hay
 * cifras y no se sustituyen por datos de ejemplo. Explica cómo publicar una y
 * qué mostrará el tablero cuando exista. La extracción de BigQuery es una tarea
 * de preparación, no un requisito del tablero en uso.
 */

import type { Estado } from '../api/tipos';
import { IconoAviso } from './iconos';

export interface PropsSinDatos {
  estado: Estado;
  detalle?: string;
}

export function SinDatos({ estado, detalle }: PropsSinDatos) {
  return (
    <section className="mk-panel mk-panel--pendiente" data-testid="sin-datos" role="status">
      <div className="mk-pendiente-cabeza">
        <span className="mk-pendiente-icono" aria-hidden="true">
          <IconoAviso tamano={16} />
        </span>
        <div>
          <h3>Sin versión publicada</h3>
          <p className="mk-panel-sub">
            No se muestra ninguna cifra porque la API no encuentra una versión publicada en MongoDB.
            No se sustituye la fuente por datos de ejemplo.
          </p>
        </div>
      </div>

      <dl className="mk-pendiente-datos">
        <div>
          <dt>Conjunto</dt>
          <dd className="mk-mono">{estado.fuente.conjunto}</dd>
        </div>
        <div>
          <dt>Periodo documentado</dt>
          <dd>
            {estado.fuente.periodo_documentado.desde} a {estado.fuente.periodo_documentado.hasta}
          </dd>
        </div>
        <div>
          <dt>Condición de los datos</dt>
          <dd>{estado.fuente.condicion}</dd>
        </div>
        <div>
          <dt>Extracción</dt>
          <dd>
            Tarea de preparación con{' '}
            <span className="mk-mono">scripts.importar_marketing</span>; el tablero no consulta
            BigQuery mientras se usa.
          </dd>
        </div>
      </dl>

      {estado.motivo ? <p className="mk-pendiente-motivo">{estado.motivo}</p> : null}
      {detalle ? <p className="mk-nota">{detalle}</p> : null}

      <div className="mk-pendiente-pasos">
        <p className="mk-pendiente-titulo">Cómo se publica una versión</p>
        <ol>
          <li>
            Publicar desde una copia original documentada (no necesita credenciales de Google):
            <pre className="mk-mono">{`.venv\\Scripts\\python.exe -m scripts.importar_marketing --desde-local data\\marketing\\muestra5 --forzar`}</pre>
          </li>
          <li>
            O extraer una copia nueva; el esquema se valida antes de calcular:
            <pre className="mk-mono">{`.venv\\Scripts\\python.exe -m scripts.importar_marketing --extraer --muestra 5`}</pre>
          </li>
          <li>
            Compactar y conciliar los agregados contra el original:
            <pre className="mk-mono">{`.venv\\Scripts\\python.exe -m scripts.compactar_marketing --aplicar`}</pre>
          </li>
        </ol>
        <p className="mk-nota">
          Hasta que exista una versión publicada, las cuatro vistas muestran su estructura y su
          definición, sin cifras.
        </p>
      </div>
    </section>
  );
}

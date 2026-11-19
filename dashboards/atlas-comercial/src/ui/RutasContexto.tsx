/**
 * Rutas de contexto: territorio y catálogo en dos líneas independientes.
 *
 * Son dimensiones que se cruzan (una categoría no pertenece a una tienda), así que
 * se muestran separadas y cada segmento es navegable: el territorio lleva a
 * Estados Unidos → estado → tienda y el catálogo a categoría → departamento.
 */

export interface SegmentoRuta {
  etiqueta: string;
  onClick?: () => void;
  actual?: boolean;
  titulo?: string;
}

export function Ruta({
  etiqueta,
  segmentos,
  testid,
}: {
  etiqueta: string;
  segmentos: SegmentoRuta[];
  testid?: string;
}) {
  return (
    <div className="ac-ruta" data-testid={testid}>
      <span className="ac-ruta-etq">{etiqueta}</span>
      <nav aria-label={`Ruta de ${etiqueta.toLowerCase()}`}>
        <ol>
          {segmentos.map((segmento, posicion) => (
            <li key={`${segmento.etiqueta}-${posicion}`}>
              {segmento.onClick && !segmento.actual ? (
                <button
                  type="button"
                  className="ac-miga"
                  onClick={segmento.onClick}
                  title={segmento.titulo}
                  aria-label={`${etiqueta}: ir a ${segmento.etiqueta}`}
                >
                  {segmento.etiqueta}
                </button>
              ) : (
                <span
                  className={`ac-miga${segmento.actual ? ' is-actual' : ''}`}
                  aria-current={segmento.actual ? 'true' : undefined}
                  title={segmento.titulo}
                >
                  {segmento.etiqueta}
                </span>
              )}
              {posicion < segmentos.length - 1 ? (
                <span className="ac-miga-sep" aria-hidden="true">
                  ›
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

export function RutasContexto({
  territorio,
  catalogo,
}: {
  territorio: SegmentoRuta[];
  catalogo: SegmentoRuta[];
}) {
  return (
    <div className="ac-rutas" data-testid="rutas-contexto">
      <Ruta etiqueta="Territorio" segmentos={territorio} testid="ruta-territorio" />
      <Ruta etiqueta="Catálogo" segmentos={catalogo} testid="ruta-catalogo" />
    </div>
  );
}

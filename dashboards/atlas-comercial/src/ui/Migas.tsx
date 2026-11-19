/**
 * Migas compactas y navegables de la exploración.
 *
 * Cada miga describe el **estado** al que vuelve (`nivel`, `tienda`,
 * `departamento`), no solo una etiqueta: así el regreso restaura el contexto
 * anterior sin limpiar los filtros. La última miga es la posición actual y se
 * anuncia con `aria-current`.
 */

import type { MigaNavegacion } from '../api';

export function Migas({
  migas,
  onNavegar,
}: {
  migas: MigaNavegacion[];
  onNavegar: (miga: MigaNavegacion) => void;
}) {
  if (migas.length === 0) return null;
  return (
    <nav className="ac-migas" aria-label="Ruta de exploración">
      <ol>
        {migas.map((miga, posicion) => {
          const actual = posicion === migas.length - 1;
          return (
            <li key={`${miga.nivel}-${miga.tienda ?? ''}-${miga.departamento ?? ''}-${posicion}`}>
              {actual ? (
                <span className="ac-miga is-actual" aria-current="page">
                  {miga.etiqueta}
                </span>
              ) : (
                <button
                  type="button"
                  className="ac-miga"
                  onClick={() => onNavegar(miga)}
                  aria-label={`Volver a ${miga.etiqueta}`}
                >
                  {miga.etiqueta}
                </button>
              )}
              {posicion < migas.length - 1 ? (
                <span className="ac-miga-sep" aria-hidden="true">
                  ›
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

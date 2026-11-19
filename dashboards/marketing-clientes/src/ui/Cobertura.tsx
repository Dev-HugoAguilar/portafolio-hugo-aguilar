/**
 * «Muestra y cobertura»: qué población hay detrás, qué se publica y si las
 * tarjetas y los gráficos hablan del mismo conjunto.
 *
 * Tres capas, siempre en el mismo orden:
 *
 *  1. **Población original** — usuarios distintos del conjunto completo en el
 *     periodo (medidos en la extracción sin muestreo; no viven en Atlas).
 *  2. **Muestra publicada** — usuarios publicados y proporción efectiva,
 *     calculada con las dos cifras y no copiada del manifiesto.
 *  3. **Método de selección** — el predicado exacto, para que se pueda repetir.
 *
 * Debajo, la conciliación que devuelve la API: cada indicador frente al total
 * que suman las gráficas del mismo rango. Si algo no cuadra se muestra la
 * diferencia; no se oculta ni se redondea a cero.
 */

import type { Estado, Resumen } from '../api/tipos';
import { numero } from '../dominio';

export interface PropsCobertura {
  estado: Estado | null;
  resumen: Resumen | null;
  cargando: boolean;
}

export function Cobertura({ estado, resumen, cargando }: PropsCobertura) {
  const cobertura = estado?.cobertura_muestra ?? null;
  const consistencia = resumen?.cobertura?.consistencia ?? [];
  if (!cobertura) return null;

  const poblacion = cobertura.poblacion_original;
  const muestra = cobertura.muestra_publicada;
  const metodo = cobertura.metodo;
  const alcance = cobertura.alcance;
  const cuadran = consistencia.filter((fila) => fila.cuadra).length;

  return (
    <section className="mk-panel mk-cobertura" aria-labelledby="mk-t-cobertura" data-testid="panel-cobertura">
      <div className="mk-panel-head">
        <div>
          <h3 id="mk-t-cobertura">Muestra y cobertura</h3>
          <p className="mk-panel-sub">
            Qué población hay detrás, qué se publica y si las tarjetas y los gráficos hablan del
            mismo conjunto
          </p>
        </div>
      </div>

      <dl className="mk-cobertura-cifras">
        <div>
          <dt>Población original</dt>
          <dd>
            {numero(poblacion.usuarios)} <span className="mk-tenue">usuarios</span>
          </dd>
          <p className="mk-tenue">
            {poblacion.periodo.desde} – {poblacion.periodo.hasta} · contados en la extracción sin
            muestreo
          </p>
        </div>
        <div>
          <dt>Muestra publicada</dt>
          <dd>
            {numero(muestra.usuarios)} <span className="mk-tenue">usuarios</span>
          </dd>
          <p className="mk-tenue">
            {muestra.porcentaje_efectivo ?? muestra.porcentaje_declarado} % del total · unidad de
            muestreo: {muestra.unidad}
          </p>
        </div>
        <div>
          <dt>Método de selección</dt>
          <dd className="mk-cobertura-metodo">
            {metodo.predicado ?? 'Conjunto completo (sin muestreo)'}
          </dd>
          <p className="mk-tenue">
            Semilla «{muestra.semilla}» · reproducible: la misma semilla devuelve la misma muestra
          </p>
        </div>
      </dl>

      <p className="mk-nota mk-tenue">
        {metodo.explicacion} {alcance?.verificacion}
      </p>

      <details className="mk-detalle mk-cobertura-detalle">
        <summary>
          Consistencia de indicadores y gráficas
          {consistencia.length > 0
            ? ` · ${cuadran} de ${consistencia.length} cuadran`
            : cargando
              ? ' · calculando…'
              : ''}
        </summary>
        {consistencia.length > 0 ? (
          <div className="mk-tabla-caja">
            <table className="mk-tabla">
              <caption className="mk-sr">
                Cada indicador frente al total que suman las gráficas del mismo rango y filtros.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Indicador</th>
                  <th scope="col" className="mk-num">Tarjeta</th>
                  <th scope="col">Gráfica</th>
                  <th scope="col" className="mk-num">Total de la gráfica</th>
                  <th scope="col" className="mk-num">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {consistencia.map((fila) => (
                  <tr key={fila.clave}>
                    <td>{fila.etiqueta}</td>
                    <td className="mk-num">{numero(fila.indicador)}</td>
                    <td>{fila.grafica}</td>
                    <td className="mk-num">{numero(fila.grafica_total)}</td>
                    <td className="mk-num">
                      {fila.cuadra ? '0 (cuadra)' : `${fila.diferencia > 0 ? '+' : ''}${numero(fila.diferencia)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mk-vacio">
            {cargando
              ? 'Calculando la conciliación del rango…'
              : 'Sin datos publicados para conciliar.'}
          </p>
        )}
      </details>
    </section>
  );
}

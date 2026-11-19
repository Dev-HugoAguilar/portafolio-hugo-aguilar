/**
 * «Mapa de fricción del embudo».
 *
 * Filas: canales de adquisición del usuario. Columnas: las tres transiciones del
 * embudo. Dos modos conmutables:
 *
 *  · **Brecha de avance**: barra divergente en puntos porcentuales respecto a la
 *    referencia global (calculada con los totales del universo de comparación).
 *  · **Volumen sin avance**: sesiones que no completaron el siguiente paso, con su
 *    porcentaje sobre la base de entrada de esa transición.
 *
 * Una celda sin base muestra «Sin base»: no se dibuja una tasa de cero. Las
 * diferencias son descriptivas: no son ventas perdidas ni abandono definitivo.
 */

import { useMemo, useState } from 'react';
import { scaleLinear } from 'd3-scale';

import type { Conversion } from '../api/tipos';
import { numero, porcentaje } from '../dominio';
import { PALETA } from '../paleta';

type Modo = 'brecha' | 'volumen';
type Orden = 'entrada' | 'brecha' | 'sin_avance';

export interface PropsFriccion {
  datos: Conversion['friccion'] | null;
  vacio: boolean;
  cargando: boolean;
}

const ETIQUETA_ORDEN: Record<Orden, string> = {
  entrada: 'Volumen de entrada',
  brecha: 'Brecha de una transición',
  sin_avance: 'Volumen sin avance',
};

export function MapaFriccion({ datos, vacio, cargando }: PropsFriccion) {
  const [modo, setModo] = useState<Modo>('brecha');
  const [orden, setOrden] = useState<Orden>('entrada');
  const [transicionOrden, setTransicionOrden] = useState('vista_carrito');
  const [celda, setCelda] = useState<{ canal: string; clave: string } | null>(null);
  const [resaltado, setResaltado] = useState<string | null>(null);

  const transiciones = datos?.transiciones ?? [];
  const canales = useMemo(() => {
    const lista = [...(datos?.canales ?? [])];
    const valor = (fila: (typeof lista)[number]) => {
      if (orden === 'entrada') return fila.entrada;
      const t = fila.transiciones.find((item) => item.clave === transicionOrden);
      if (!t) return 0;
      return orden === 'brecha' ? Math.abs(t.brecha_pp ?? 0) : t.sin_avance;
    };
    return lista.sort((a, b) => valor(b) - valor(a) || a.canal.localeCompare(b.canal));
  }, [datos, orden, transicionOrden]);

  // Dominios: simétrico común para las brechas; común para los conteos.
  const maxBrecha = Math.max(1, ...(datos?.canales ?? []).flatMap((f) => f.transiciones.map((t) => Math.abs(t.brecha_pp ?? 0))));
  const limiteBrecha = Math.ceil(maxBrecha / 2) * 2 || 2;
  const maxSinAvance = Math.max(1, ...(datos?.canales ?? []).flatMap((f) => f.transiciones.map((t) => t.sin_avance)));
  const escalaBrecha = scaleLinear().domain([-limiteBrecha, limiteBrecha]).range([-1, 1]);
  const escalaVolumen = scaleLinear().domain([0, maxSinAvance]).range([0, 1]);

  const celdaActiva =
    celda &&
    (datos?.canales ?? []).find((fila) => fila.canal === celda.canal)?.transiciones.find(
      (t) => t.clave === celda.clave,
    );
  const canalActivo = celda ? (datos?.canales ?? []).find((fila) => fila.canal === celda.canal) : null;
  const referencia = celda ? datos?.referencia[celda.clave] : null;

  return (
    <section className="mk-panel" aria-labelledby="mk-t-friccion" data-testid="panel-friccion">
      <div className="mk-panel-head">
        <div>
          <h3 id="mk-t-friccion">Mapa de fricción del embudo</h3>
          <p className="mk-panel-sub">
            {modo === 'brecha'
              ? 'Brecha de avance en puntos porcentuales frente a la referencia del universo de comparación'
              : 'Sesiones que no completaron el siguiente paso observado (no son ventas perdidas)'}
            {datos?.universo ? ` · referencia: ${datos.universo.descripcion}` : ''}
          </p>
        </div>
        <div className="mk-panel-controls">
          <div className="mk-segmentado" role="group" aria-label="Modo del mapa">
            <button
              type="button"
              className={`mk-seg${modo === 'brecha' ? ' is-activa' : ''}`}
              onClick={() => setModo('brecha')}
              aria-pressed={modo === 'brecha'}
            >
              Brecha de avance
            </button>
            <button
              type="button"
              className={`mk-seg${modo === 'volumen' ? ' is-activa' : ''}`}
              onClick={() => setModo('volumen')}
              aria-pressed={modo === 'volumen'}
            >
              Volumen sin avance
            </button>
          </div>
          <label className="mk-casilla">
            Orden
            <select
              value={orden}
              onChange={(evento) => setOrden(evento.target.value as Orden)}
              aria-label="Criterio de orden"
            >
              {(Object.keys(ETIQUETA_ORDEN) as Orden[]).map((clave) => (
                <option key={clave} value={clave}>
                  {ETIQUETA_ORDEN[clave]}
                </option>
              ))}
            </select>
          </label>
          {orden !== 'entrada' ? (
            <label className="mk-casilla">
              Transición
              <select
                value={transicionOrden}
                onChange={(evento) => setTransicionOrden(evento.target.value)}
                aria-label="Transición para ordenar"
              >
                {transiciones.map((t) => (
                  <option key={t.clave} value={t.clave}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      {(datos?.canales ?? []).length === 0 ? (
        <p className="mk-vacio">
          {vacio
            ? 'Sin datos publicados: el mapa aparecerá cuando exista una versión cargada.'
            : 'No hay canales con sesiones que cumplan el embudo para estos filtros.'}
        </p>
      ) : (
        <div className="mk-friccion-caja">
          <div className="mk-friccion-rejilla" role="table" aria-label="Mapa de fricción por canal y transición">
            <div className="mk-friccion-fila mk-friccion-cabecera" role="row">
              <span role="columnheader">Canal</span>
              {transiciones.map((t) => (
                <span key={t.clave} role="columnheader" className="mk-friccion-col">
                  {t.etiqueta}
                  <small>
                    ref. {porcentaje(
                      (datos?.referencia[t.clave]?.tasa ?? null) === null
                        ? null
                        : (datos!.referencia[t.clave]!.tasa as number) * 100,
                    )}
                  </small>
                </span>
              ))}
            </div>

            {canales.map((fila) => (
              <div
                key={fila.canal}
                role="row"
                className={`mk-friccion-fila${resaltado === fila.canal || celda?.canal === fila.canal ? ' is-resaltada' : ''}`}
                onMouseEnter={() => setResaltado(fila.canal)}
                onMouseLeave={() => setResaltado(null)}
              >
                <span role="rowheader" className="mk-friccion-canal">
                  {fila.canal}
                  {fila.base_pequena ? ' *' : ''}
                </span>
                {fila.transiciones.map((t) => {
                  const sinBase = t.denominador === 0 || t.tasa === null;
                  const activa = celda?.canal === fila.canal && celda?.clave === t.clave;
                  return (
                    <button
                      key={t.clave}
                      type="button"
                      className={`mk-friccion-celda${sinBase ? ' is-sin-base' : ''}${activa ? ' is-activa' : ''}`}
                      role="cell"
                      aria-label={
                        sinBase
                          ? `${fila.canal}, ${t.etiqueta}: sin base`
                          : `${fila.canal}, ${t.etiqueta}: tasa ${porcentaje((t.tasa as number) * 100)}, ${
                              modo === 'brecha'
                                ? `brecha ${t.brecha_pp ?? 'sin datos'} pp`
                                : `${numero(t.sin_avance)} sesiones sin avance`
                            }`
                      }
                      onClick={() => setCelda({ canal: fila.canal, clave: t.clave })}
                    >
                      {sinBase ? (
                        <span className="mk-friccion-sinbase">Sin base</span>
                      ) : modo === 'brecha' ? (
                        <span className="mk-friccion-barra" aria-hidden="true">
                          <span className="mk-friccion-eje" />
                          <span
                            className="mk-friccion-relleno"
                            style={{
                              left: t.brecha_pp !== null && t.brecha_pp >= 0 ? '50%' : `${50 + 50 * escalaBrecha(t.brecha_pp ?? 0)}%`,
                              width: `${Math.min(50, Math.abs(50 * escalaBrecha(t.brecha_pp ?? 0)))}%`,
                              background: (t.brecha_pp ?? 0) >= 0 ? PALETA.teal : PALETA.violeta,
                            }}
                          />
                        </span>
                      ) : (
                        <span className="mk-friccion-barra" aria-hidden="true">
                          <span
                            className="mk-friccion-relleno mk-friccion-relleno--volumen"
                            style={{ left: 0, width: `${100 * escalaVolumen(t.sin_avance)}%` }}
                          />
                        </span>
                      )}
                      <span className="mk-friccion-valor">
                        {modo === 'brecha'
                          ? `${(t.brecha_pp ?? 0) > 0 ? '+' : ''}${(t.brecha_pp ?? 0).toFixed(1)} pp`
                          : `${numero(t.sin_avance)} · ${porcentaje(100 - (t.tasa as number) * 100)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="mk-nota mk-nota--pie">
            {modo === 'brecha'
              ? `Escala común ${limiteBrecha} pp a cada lado de la referencia · flechas: + superior, − inferior.`
              : `Escala común de 0 a ${numero(maxSinAvance)} sesiones sin avance.`}{' '}
            * Base menor a {numero(datos?.umbral_base_reducida ?? 100)} sesiones en la primera etapa.
            Brechas descriptivas: no prueban diferencias significativas.
          </p>
        </div>
      )}

      {celda && celdaActiva && canalActivo ? (
        <section className="mk-subpanel" aria-label="Detalle de la celda" data-testid="panel-friccion-detalle">
          <div className="mk-panel-head">
            <div>
              <h4 className="mk-subtitulo">
                {canalActivo.canal} · {celdaActiva.etiqueta}
              </h4>
            </div>
            <button type="button" className="mk-btn mk-btn--ghost" onClick={() => setCelda(null)}>
              Cerrar detalle
            </button>
          </div>
          <dl className="mk-cifras-fila">
            <div>
              <dt>Sesiones de entrada</dt>
              <dd>{numero(celdaActiva.denominador)}</dd>
            </div>
            <div>
              <dt>Avanzaron</dt>
              <dd>{numero(celdaActiva.numerador)}</dd>
            </div>
            <div>
              <dt>Sin avance observado</dt>
              <dd>{numero(celdaActiva.sin_avance)}</dd>
            </div>
            <div>
              <dt>Tasa del canal</dt>
              <dd>{porcentaje((celdaActiva.tasa as number) * 100)}</dd>
            </div>
            <div>
              <dt>Referencia del universo</dt>
              <dd>
                {porcentaje(
                  (referencia?.tasa ?? null) === null ? null : (referencia!.tasa as number) * 100,
                )}
              </dd>
            </div>
            <div>
              <dt>Brecha</dt>
              <dd>
                {(celdaActiva.brecha_pp ?? 0) > 0 ? '+' : ''}
                {(celdaActiva.brecha_pp ?? 0).toFixed(1)} pp
              </dd>
            </div>
          </dl>
          <p className="mk-nota mk-tenue">
            {datos?.universo?.descripcion} · {numero(datos?.universo?.sesiones_entrada ?? null)}{' '}
            sesiones en el universo.{' '}
            {celdaActiva.base_pequena
              ? `Base reducida (menos de ${numero(datos?.umbral_base_reducida ?? 100)} sesiones): la tasa puede ser inestable. `
              : ''}
            El desglose por dispositivo y la evolución semanal de la transición no se calculan en
            este bloque: requieren una consulta por sesión y semana que hoy no se sirve.
          </p>
        </section>
      ) : null}

      <details className="mk-detalle">
        <summary>Ver tabla accesible del mapa</summary>
        <div className="mk-tabla-caja">
          <table className="mk-tabla">
            <caption className="mk-sr">
              Tasas, brechas y sesiones sin avance por canal y transición.
            </caption>
            <thead>
              <tr>
                <th scope="col">Canal</th>
                {transiciones.map((t) => (
                  <th key={t.clave} scope="col" className="mk-num">
                    {t.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {canales.map((fila) => (
                <tr key={fila.canal}>
                  <td>
                    {fila.canal}
                    {fila.base_pequena ? ' *' : ''}
                  </td>
                  {fila.transiciones.map((t) => (
                    <td key={t.clave} className="mk-num">
                      {t.tasa === null ? (
                        'Sin base'
                      ) : (
                        <>
                          {porcentaje((t.tasa as number) * 100)}
                          <span className="mk-tenue">
                            {' '}
                            ({numero(t.numerador)}/{numero(t.denominador)})
                          </span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {cargando ? <p className="mk-nota">Actualizando el mapa…</p> : null}
    </section>
  );
}

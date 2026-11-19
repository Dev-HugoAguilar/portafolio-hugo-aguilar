/**
 * «Vehículo principal: comparación entre periodos».
 *
 * Dos vistas con la misma escala compartida por fila-grupo y el mismo par A/B:
 *  · **Volumen** — dos puntos conectados (A hueco, B sólido) sobre un eje lineal
 *    desde cero, con columnas de «Cambio» y «Variación %».
 *  · **Cambio entre periodos** — un punto por vehículo con la variación porcentual
 *    sobre un eje simétrico centrado en cero.
 *
 * A/B son estados locales derivados del intervalo global: no modifican el filtro
 * temporal. Las filas con A=0 no calculan porcentaje y se agrupan aparte.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import type { FilaPersonas } from '../api/tipos';
import { decimal, numero } from '../dominio';
import { RELLENO_MAPA, type Metrica } from '../paleta';

export interface Periodo {
  desde: string;
  hasta: string;
  etiqueta: string;
  dias: number;
}

const ALTO_FILA = 38;
const ALTO_EJE = 28;

const localDe = (metrica: Metrica): 'hechos' | 'lesionadas' | 'fallecidas' =>
  metrica === 'personas_lesionadas' ? 'lesionadas' : metrica === 'personas_fallecidas' ? 'fallecidas' : 'hechos';

function IconoVehiculo({ nombre }: { nombre: string }) {
  const texto = nombre.toLowerCase();
  const dibujo = texto.includes('moto')
    ? 'M3 14h3l3-5h5l2 5h3M6 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm11 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z'
    : texto.includes('bici')
      ? 'M6 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 14l3-5h3'
      : texto.includes('autob') || texto.includes('microb')
        ? 'M3 16V8h12l4 4v4H3Zm2-8V6h8v2M7 16a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 7 16Zm9 0a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 16 16Z'
        : texto.includes('cami')
          ? 'M2 16V9h10v7H2Zm10-3h4l3 3h-7M5 16a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 5 16Z'
          : 'M3 16v-4l2-4h9l3 4h2v4M6 16a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 6 16Zm10 0a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 16 16Z';
  return (
    <svg width={18} height={18} viewBox="0 0 22 22" aria-hidden="true" className="at-veh-icono">
      <path d={dibujo} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VehiculosPeriodos({
  serieA,
  serieB,
  metrica,
  periodos,
  vista,
}: {
  serieA: FilaPersonas[] | null;
  serieB: FilaPersonas[] | null;
  metrica: Metrica;
  periodos: { a: Periodo; b: Periodo } | null;
  vista: 'volumen' | 'cambio';
}) {
  const local = localDe(metrica);
  const color = RELLENO_MAPA[metrica];
  const [activa, setActiva] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja) setAncho(Math.max(140, Math.round(caja.width)));
    });
    observador.observe(nodo);
    setAncho(Math.max(140, Math.round(nodo.getBoundingClientRect().width)));
    return () => observador.disconnect();
  }, [serieA, serieB, metrica]);

  const filas = useMemo(() => {
    const mapa = new Map<string, { etiqueta: string; a: number; b: number }>();
    for (const fila of serieA ?? []) mapa.set(fila.etiqueta, { etiqueta: fila.etiqueta, a: fila[local], b: 0 });
    for (const fila of serieB ?? []) {
      const actual = mapa.get(fila.etiqueta);
      if (actual) actual.b = fila[local];
      else mapa.set(fila.etiqueta, { etiqueta: fila.etiqueta, a: 0, b: fila[local] });
    }
    return [...mapa.values()]
      .map((fila) => {
        const diferencia = fila.b - fila.a;
        const variacion = fila.a > 0 ? (100 * diferencia) / fila.a : null;
        return { ...fila, diferencia, variacion };
      })
      .sort((x, y) => y.b - x.b || y.a - x.a || x.etiqueta.localeCompare(y.etiqueta));
  }, [serieA, serieB, local]);

  const conBase = filas.filter((fila) => fila.variacion !== null);
  const sinBase = filas.filter((fila) => fila.variacion === null);

  const maximoVolumen = Math.max(1, ...filas.flatMap((fila) => [fila.a, fila.b]));
  const pasoVolumen =
    maximoVolumen <= 20 ? 5 : maximoVolumen <= 50 ? 10 : maximoVolumen <= 200 ? 50 : maximoVolumen <= 500 ? 100 : maximoVolumen <= 2000 ? 500 : 1000;
  const limiteVolumen = Math.ceil(maximoVolumen / pasoVolumen) * pasoVolumen;
  const marcasVolumen = Array.from({ length: Math.floor(limiteVolumen / pasoVolumen) + 1 }, (_, indice) => indice * pasoVolumen);

  const maximoCambio = Math.max(1, ...conBase.map((fila) => Math.abs(fila.variacion as number)));
  const pasoCambio = maximoCambio <= 10 ? 2 : maximoCambio <= 25 ? 5 : maximoCambio <= 60 ? 10 : maximoCambio <= 150 ? 25 : 50;
  const limiteCambio = Math.ceil(maximoCambio / pasoCambio) * pasoCambio;
  const marcasCambio = Array.from(
    { length: Math.floor((limiteCambio * 2) / pasoCambio) + 1 },
    (_, indice) => -limiteCambio + indice * pasoCambio,
  );

  const anchoTotal = ancho > 0 ? ancho : 480;
  const xVolumen = (valor: number) => (valor / limiteVolumen) * anchoTotal;
  const xCambio = (valor: number) => ((valor + limiteCambio) / (limiteCambio * 2)) * anchoTotal;

  const filasVolumen = vista === 'volumen' ? filas : conBase;
  const altoLienzo = filasVolumen.length * ALTO_FILA + ALTO_EJE;

  if (!periodos) {
    return (
      <p className="at-nota">
        El intervalo vigente no permite dos periodos comparables. Ajusta el filtro <strong>Periodo</strong> a un
        rango mayor.
      </p>
    );
  }
  if (filas.length === 0) {
    return <p className="at-nota">Sin vehículos registrados en los periodos comparados.</p>;
  }

  return (
    <div className="at-veh">
      <div className="at-veh-leyenda">
        {vista === 'volumen' ? (
          <>
            <span className="at-veh-clave">
              <svg width={14} height={14} aria-hidden="true">
                <circle cx={7} cy={7} r={4.5} fill="#ffffff" stroke={color} strokeWidth={1.8} />
              </svg>
              Periodo A
            </span>
            <span className="at-veh-clave">
              <svg width={14} height={14} aria-hidden="true">
                <circle cx={7} cy={7} r={4.5} fill={color} />
              </svg>
              Periodo B
            </span>
          </>
        ) : (
          <span className="at-veh-clave">
            <svg width={14} height={14} aria-hidden="true">
              <circle cx={7} cy={7} r={4.5} fill={color} />
            </svg>
            Variación porcentual (B − A) / A
          </span>
        )}
      </div>

      {vista === 'cambio' && conBase.length === 0 ? (
        <p className="at-nota">Ningún vehículo tiene base en A: no hay variación porcentual calculable.</p>
      ) : (
        <>
        <div className="at-veh-cabeceras">
          <span>Vehículo</span>
          <span />
          <span>Cambio</span>
          <span>Variación %</span>
        </div>
        <div className="at-veh-lienzo at-veh-lienzo--3">
          <ul className="at-veh-nombres">
            {filasVolumen.map((fila) => (
              <li
                key={fila.etiqueta}
                className={`at-veh-nombre${activa === fila.etiqueta ? ' is-activa' : ''}`}
                onMouseEnter={() => setActiva(fila.etiqueta)}
                onMouseLeave={() => setActiva((previo) => (previo === fila.etiqueta ? null : previo))}
              >
                <IconoVehiculo nombre={fila.etiqueta} />
                <span className="at-veh-texto">{fila.etiqueta}</span>
              </li>
            ))}
          </ul>

          <div className="at-veh-area" ref={contenedor}>
            <svg
              width={anchoTotal}
              height={altoLienzo}
              role="img"
              aria-label={`${vista === 'volumen' ? 'Comparación de volumen' : 'Cambio porcentual'} por vehículo entre los periodos A y B`}
            >
              {(vista === 'volumen' ? marcasVolumen : marcasCambio).map((marca) => {
                const x = vista === 'volumen' ? xVolumen(marca) : xCambio(marca);
                return (
                  <line
                    key={`g-${marca}`}
                    x1={x}
                    x2={x}
                    y1={0}
                    y2={filasVolumen.length * ALTO_FILA}
                    stroke={marca === 0 ? '#B6BECF' : '#EEF1F6'}
                    strokeWidth={1}
                  />
                );
              })}

              {filasVolumen.map((fila, indice) => {
                const centro = indice * ALTO_FILA + ALTO_FILA / 2;
                const resaltada = activa === fila.etiqueta;
                if (vista === 'volumen') {
                  const xa = xVolumen(fila.a);
                  const xb = xVolumen(fila.b);
                  const cerca = Math.abs(xb - xa) < 44;
                  const iguales = fila.a === fila.b;
                  return (
                    <g key={fila.etiqueta}>
                      {resaltada ? <rect x={0} y={indice * ALTO_FILA} width={anchoTotal} height={ALTO_FILA} fill="#f7f8fc" /> : null}
                      {!iguales ? (
                        <line
                          x1={Math.min(xa, xb)}
                          x2={Math.max(xa, xb)}
                          y1={centro}
                          y2={centro}
                          stroke={resaltada ? color : '#9AA6BC'}
                          strokeWidth={2}
                        />
                      ) : null}
                      <circle cx={xa} cy={centro} r={4.5} fill="#ffffff" stroke={color} strokeWidth={2} />
                      <circle cx={xb} cy={centro} r={4.5} fill={color} />
                      <text
                        x={xa < 34 ? xa + 10 : xa - 8}
                        y={centro - 7}
                        textAnchor={xa < 34 ? 'start' : 'end'}
                        fontSize={9.5}
                        fill="#111318"
                      >
                        {iguales ? `A = B · ${numero(fila.a)}` : numero(fila.a)}
                      </text>
                      {!iguales ? (
                        <text
                          x={xb + 9}
                          y={cerca ? centro + 15 : centro - 7}
                          textAnchor="start"
                          fontSize={9.5}
                          fontWeight={600}
                          fill="#111318"
                        >
                          {numero(fila.b)}
                        </text>
                      ) : null}
                    </g>
                  );
                }

                const variacion = fila.variacion as number;
                const xv = xCambio(variacion);
                const cero = xCambio(0);
                return (
                  <g key={fila.etiqueta}>
                    {resaltada ? <rect x={0} y={indice * ALTO_FILA} width={anchoTotal} height={ALTO_FILA} fill="#f7f8fc" /> : null}
                    <line x1={cero} x2={xv} y1={centro} y2={centro} stroke={color} strokeWidth={1.4} opacity={0.5} />
                    <circle cx={xv} cy={centro} r={4.5} fill={color} />
                    <text
                      x={xv + (variacion >= 0 ? 10 : -10)}
                      y={centro + 3.5}
                      textAnchor={variacion >= 0 ? 'start' : 'end'}
                      fontSize={9.5}
                      fontWeight={600}
                      fill="#111318"
                    >
                      {variacion >= 0 ? '+' : ''}
                      {decimal(variacion).replace('.', ',')} %
                    </text>
                  </g>
                );
              })}

              {(vista === 'volumen' ? marcasVolumen : marcasCambio).map((marca) => {
                const x = vista === 'volumen' ? xVolumen(marca) : xCambio(marca);
                return (
                  <text key={`t-${marca}`} x={x} y={filasVolumen.length * ALTO_FILA + 14} textAnchor="middle" fontSize={9.5} fill="#596273">
                    {vista === 'volumen' ? numero(marca) : `${marca > 0 ? '+' : ''}${numero(marca)} %`}
                  </text>
                );
              })}
            </svg>
          </div>

          <ul className="at-veh-cambios">
            {filasVolumen.map((fila) => (
              <li
                key={`c-${fila.etiqueta}`}
                className={activa === fila.etiqueta ? 'is-activa' : ''}
                onMouseEnter={() => setActiva(fila.etiqueta)}
                onMouseLeave={() => setActiva((previo) => (previo === fila.etiqueta ? null : previo))}
              >
                <span>
                  {fila.diferencia > 0 ? '+' : ''}
                  {numero(fila.diferencia)}
                </span>
                <span>
                  {fila.variacion === null
                    ? 'No calculable'
                    : `${fila.variacion > 0 ? '+' : ''}${decimal(fila.variacion).replace('.', ',')} %`}
                </span>
              </li>
            ))}
          </ul>
        </div>
        </>
      )}

      {sinBase.length > 0 ? (
        <section className="at-veh-sinbase" aria-label="Vehículos sin base en el periodo A">
          <h4>Sin base en A</h4>
          <ul>
            {sinBase.map((fila) => (
              <li key={`sb-${fila.etiqueta}`}>
                <span>{fila.etiqueta}</span>
                <span>
                  A {numero(fila.a)} · B {numero(fila.b)}
                </span>
                <span>{fila.a === 0 && fila.b === 0 ? '0 en ambos periodos' : 'Sin base en A'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="at-col-detalle">
        Un vehículo principal por hecho · no describe a todos los vehículos involucrados · A{' '}
        {periodos.a.desde} a {periodos.a.hasta} · B {periodos.b.desde} a {periodos.b.hasta}. Aumentos y
        disminuciones son diferencias de conteo, no mejoras ni riesgos.
      </p>
      <p className="at-sr">
        {filas
          .map(
            (fila) =>
              `${fila.etiqueta}: A ${numero(fila.a)}, B ${numero(fila.b)}, cambio ${fila.diferencia}, variación ${
                fila.variacion === null ? 'no calculable' : `${fila.variacion.toFixed(1)} por ciento`
              }.`,
          )
          .join(' ')}
      </p>
    </div>
  );
}


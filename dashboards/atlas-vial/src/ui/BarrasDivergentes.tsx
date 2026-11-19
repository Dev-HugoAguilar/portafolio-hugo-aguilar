/**
 * Bloque B de «Tiempo y entorno vial»: barras divergentes.
 *
 * Una fila por tipo de intersección con un origen vertical común: a la izquierda
 * lo **sin semáforo registrado** (gris pizarra) y a la derecha lo **con semáforo
 * registrado** (color de la métrica activa). La posición izquierda no es un valor
 * negativo: etiquetas y lecturas usan cifras positivas.
 *
 * Métrica compartida: hechos, personas lesionadas o personas fallecidas. Las tres
 * medidas vienen de la **misma** agregación sobre el conjunto filtrado (sumas
 * publicadas de personas, nunca derivadas del conteo de hechos). La métrica es
 * estado compartido de la pestaña; el modo Cantidad / Composición % es local.
 *
 * Geometría: una única `scaleLinear` simétrica `[-M, M]` para la métrica activa,
 * un solo origen y las mismas marcas para el eje. El margen lateral solo reserva
 * sitio para las etiquetas.
 *
 * El detalle vive dentro de la fila (segunda línea con altura reservada); no hay
 * tarjeta inferior ni tooltip flotante.
 */

import { scaleLinear } from 'd3-scale';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { CruceSemaforo } from '../api/tipos';
import { decimal, numero } from '../dominio';
import { ETIQUETA_METRICA, RELLENO_MAPA, type Metrica } from '../paleta';

type Modo = 'cantidad' | 'porcentaje';

const COLOR_SIN = '#64748B';
const ALTO_FILA = 52;
const ALTO_BARRA = 14;
const MEDIDAS: {
  clave: Metrica;
  etiqueta: string;
  local: 'hechos' | 'lesionadas' | 'fallecidas';
}[] = [
  { clave: 'hechos', etiqueta: 'Hechos', local: 'hechos' },
  { clave: 'personas_lesionadas', etiqueta: 'Lesionadas', local: 'lesionadas' },
  { clave: 'personas_fallecidas', etiqueta: 'Fallecidas', local: 'fallecidas' },
];

export interface PropsBarras {
  datos: CruceSemaforo | null;
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
  metrica: Metrica;
  onMetrica: (metrica: Metrica) => void;
}

export function BarrasDivergentes({
  datos,
  cargando,
  error,
  onReintentar,
  metrica,
  onMetrica,
}: PropsBarras) {
  const [modo, setModo] = useState<Modo>('cantidad');
  const [activa, setActiva] = useState<number | null>(null);
  const [fijada, setFijada] = useState<number | null>(null);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja) setAncho(Math.max(240, Math.round(caja.width)));
    });
    observador.observe(nodo);
    setAncho(Math.max(240, Math.round(nodo.getBoundingClientRect().width)));
    return () => observador.disconnect();
  }, [datos, modo, metrica]);

  const local: 'hechos' | 'lesionadas' | 'fallecidas' =
    metrica === 'personas_lesionadas'
      ? 'lesionadas'
      : metrica === 'personas_fallecidas'
        ? 'fallecidas'
        : 'hechos';
  const colorCon = RELLENO_MAPA[metrica];
  const series = datos?.series ?? [];

  /* Lectura tolerante: el contrato actual anida las medidas por métrica; si
     llegara una respuesta con forma plana se lee igual, sin inventar cifras. */
  const valoresDe = (fila: (typeof series)[number]) => {
    const anidado = fila.medidas as unknown as
      | Record<'con' | 'sin' | 'sin_dato', Record<string, number>>
      | undefined;
    const plana = fila as unknown as { con?: number; sin?: number; sin_dato?: number };
    return {
      con: anidado?.con?.[local] ?? plana.con ?? 0,
      sin: anidado?.sin?.[local] ?? plana.sin ?? 0,
      sin_dato: anidado?.sin_dato?.[local] ?? plana.sin_dato ?? 0,
    };
  };
  const maximo = useMemo(
    () =>
      Math.max(
        1,
        ...series.flatMap((fila) => [valoresDe(fila).con, valoresDe(fila).sin]),
      ),
    [series, local],
  );
  const escala = scaleLinear().domain([-maximo, maximo]).range([-0.5, 0.5]);
  const escalaPorcentaje = scaleLinear().domain([-100, 100]).range([-0.5, 0.5]);
  const mitad = Math.max(1, Math.round(maximo / 2));

  const anchoBarra = Math.max(240, ancho > 0 ? ancho : 640);
  const medio = Math.max(24, anchoBarra / 2 - 48);

  const largoBarra = (valor: number, proporcion: boolean) => {
    const fraccion = proporcion ? escalaPorcentaje(valor) : escala(valor);
    return Math.min(medio, Math.abs(fraccion) * medio * 2);
  };

  /** Denominador de la composición: lados con semáforo conocido de esa fila. */
  const porcentajes = (fila: (typeof series)[number]) => {
    const con = valoresDe(fila).con;
    const sin = valoresDe(fila).sin;
    const denominador = con + sin;
    if (denominador <= 0) return null;
    return { denominador, con: (100 * con) / denominador, sin: (100 * sin) / denominador };
  };

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        setFijada(null);
        setActiva(null);
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);

  useEffect(() => {
    setFijada(null);
    setActiva(null);
  }, [datos, metrica]);

  const resaltada = (indice: number) =>
    fijada === indice || (fijada === null && activa === indice);

  const detalleDe = (fila: (typeof series)[number]) => {
    const valores = valoresDe(fila);
    const proporcion = porcentajes(fila);
    if (!proporcion) return 'Sin valores para calcular composición';
    if (modo === 'cantidad') {
      return `${decimal(proporcion.sin).replace('.', ',')} % sin semáforo · ${decimal(
        proporcion.con,
      ).replace('.', ',')} % con semáforo`;
    }
    return `${numero(valores.sin)} sin semáforo · ${numero(
      valores.con,
    )} con semáforo · denominador ${numero(proporcion.denominador)}`;
  };

  return (
    <section
      className="at-panel at-panel--barras-semaforo"
      aria-labelledby="at-t-semaforo"
      data-testid="panel-semaforo"
    >
      <div className="at-panel-head at-tl-cab">
        <div className="at-tl-cab-texto">
          <h3 id="at-t-semaforo">Intersecciones y semáforo registrado</h3>
          <p className="at-panel-sub">
            Describe el punto registrado · no establece causa ni incumplimiento
          </p>
        </div>
        <div className="at-tl-controles">
          <div className="at-segmentado" role="group" aria-label="Métrica de las intersecciones">
            {MEDIDAS.map((opcion) => (
              <button
                key={opcion.clave}
                type="button"
                className={`at-seg${metrica === opcion.clave ? ' is-activa' : ''}`}
                aria-pressed={metrica === opcion.clave}
                onClick={() => onMetrica(opcion.clave)}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          <div className="at-segmentado" role="group" aria-label="Lectura de las barras">
            <button
              type="button"
              className={`at-seg${modo === 'cantidad' ? ' is-activa' : ''}`}
              aria-pressed={modo === 'cantidad'}
              onClick={() => setModo('cantidad')}
            >
              Cantidad
            </button>
            <button
              type="button"
              className={`at-seg${modo === 'porcentaje' ? ' is-activa' : ''}`}
              aria-pressed={modo === 'porcentaje'}
              onClick={() => setModo('porcentaje')}
            >
              Composición %
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="at-tl-aviso" role="alert">
          <p>No se pudo calcular el cruce de intersecciones y semáforo.</p>
          <button type="button" className="at-btn" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      ) : !datos || series.length === 0 ? (
        <p className="at-nota at-tl-vacio" style={{ minHeight: 180 }}>
          {cargando ? 'Calculando intersecciones…' : 'Sin intersecciones con los filtros actuales.'}
        </p>
      ) : (
        <div className="at-div-barras">
          <div className="at-div-leyenda">
            <span className="at-div-clave">
              <span className="at-div-muestra" style={{ background: COLOR_SIN }} aria-hidden="true" />
              Sin semáforo registrado
            </span>
            <span className="at-div-clave">
              <span className="at-div-muestra" style={{ background: colorCon }} aria-hidden="true" />
              Con semáforo registrado
            </span>
            <span className="at-div-clave at-div-clave--nota">
              Semáforo sin dato queda fuera del denominador
            </span>
          </div>

          <div className="at-div-cab">
            <span>Tipo de intersección</span>
            <span className="at-div-cab-eje">
              {modo === 'cantidad'
                ? `${ETIQUETA_METRICA[metrica]} por condición registrada`
                : `Composición de ${ETIQUETA_METRICA[metrica].toLowerCase()} con dato`}
            </span>
            <span className="at-div-cab-num">Semáforo sin dato</span>
          </div>

          <div ref={contenedor}>
            <ul className="at-div-lista">
              {series.map((fila, indice) => {
                const valores = valoresDe(fila);
                const proporcion = porcentajes(fila);
                const centro = Math.round(anchoBarra / 2);
                /* En «Cantidad» manda la escala de la métrica; los porcentajes
                   solo se usan en «Composición %». */
                const anchoSin =
                  modo === 'porcentaje' && proporcion
                    ? largoBarra(proporcion.sin, true)
                    : largoBarra(valores.sin, false);
                const anchoCon =
                  modo === 'porcentaje' && proporcion
                    ? largoBarra(proporcion.con, true)
                    : largoBarra(valores.con, false);
                const activaFila = resaltada(indice);
                const detalle = detalleDe(fila);
                return (
                  <li
                    key={fila.etiqueta}
                    className={`at-div-fila${activaFila ? ' is-activa' : ''}${
                      fijada === indice ? ' is-fijada' : ''
                    }`}
                    style={{ minHeight: ALTO_FILA }}
                    data-fila={fila.etiqueta}
                    onMouseEnter={() => setActiva(indice)}
                    onMouseLeave={() => setActiva((valor) => (valor === indice ? null : valor))}
                  >
                    <span className="at-div-info">
                      <span className="at-div-nombre">{fila.etiqueta}</span>
                      <span
                        className={`at-div-detalle${activaFila ? ' is-visible' : ''}`}
                        data-testid={`detalle-fila-${indice}`}
                      >
                        {detalle}
                      </span>
                    </span>
                    <span className="at-div-area">
                      <svg
                        width={anchoBarra}
                        height={ALTO_FILA}
                        role="img"
                        aria-label={`${fila.etiqueta}: ${numero(valores.sin)} ${ETIQUETA_METRICA[
                          metrica
                        ].toLowerCase()} sin semáforo registrado y ${numero(
                          valores.con,
                        )} con semáforo registrado; ${detalle}${
                          valores.sin_dato > 0
                            ? `; ${numero(valores.sin_dato)} con semáforo sin dato, fuera del denominador`
                            : ''
                        }.`}
                        tabIndex={0}
                        onFocus={() => setActiva(indice)}
                        onBlur={() => setActiva(null)}
                        onClick={() => setFijada(fijada === indice ? null : indice)}
                      >
                        <line
                          x1={centro}
                          x2={centro}
                          y1={6}
                          y2={ALTO_FILA - 6}
                          stroke="#A9B3C6"
                          strokeWidth={1}
                        />
                        <rect
                          className="at-div-barra"
                          x={centro - anchoSin}
                          y={ALTO_FILA / 2 - ALTO_BARRA / 2}
                          width={anchoSin}
                          height={ALTO_BARRA}
                          rx={3}
                          fill={COLOR_SIN}
                        />
                        <rect
                          className="at-div-barra"
                          x={centro}
                          y={ALTO_FILA / 2 - ALTO_BARRA / 2}
                          width={anchoCon}
                          height={ALTO_BARRA}
                          rx={3}
                          fill={colorCon}
                        />
                        <text
                          x={centro - anchoSin - 6}
                          y={ALTO_FILA / 2 + 3.5}
                          textAnchor="end"
                          fontSize={10}
                          fill="#111318"
                        >
                          {modo === 'cantidad'
                            ? numero(valores.sin)
                            : proporcion
                              ? `${decimal(proporcion.sin).replace('.', ',')} %`
                              : '—'}
                        </text>
                        <text
                          x={centro + anchoCon + 6}
                          y={ALTO_FILA / 2 + 3.5}
                          textAnchor="start"
                          fontSize={10}
                          fill="#111318"
                        >
                          {modo === 'cantidad'
                            ? numero(valores.con)
                            : proporcion
                              ? `${decimal(proporcion.con).replace('.', ',')} %`
                              : '—'}
                        </text>
                      </svg>
                    </span>
                    <span className={`at-div-sindato${valores.sin_dato === 0 ? ' is-cero' : ''}`}>
                      {numero(valores.sin_dato)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="at-div-eje">
            <span className="at-div-eje-etq">
              {modo === 'cantidad' ? ETIQUETA_METRICA[metrica] : 'Porcentaje'}
            </span>
            <span className="at-div-eje-marcas">
              {modo === 'cantidad' ? (
                <>
                  <span>{numero(maximo)}</span>
                  <span>{numero(mitad)}</span>
                  <span>0</span>
                  <span>{numero(mitad)}</span>
                  <span>{numero(maximo)}</span>
                </>
              ) : (
                <>
                  <span>100 %</span>
                  <span>50 %</span>
                  <span>0</span>
                  <span>50 %</span>
                  <span>100 %</span>
                </>
              )}
            </span>
            <span className="at-div-eje-num" />
          </div>

          <details className="at-metodo">
            <summary>Cómo se leen estas barras</summary>
            <p>
              Cada fila cuenta {ETIQUETA_METRICA[metrica].toLowerCase()} del conjunto filtrado con el
              mismo tipo de intersección, en una sola agregación y sin uniones; las sumas de personas
              son las publicadas en los hechos, no derivadas del conteo de hechos. Las longitudes usan
              una escala lineal común y simétrica para todas las filas y el cero del eje coincide con
              el origen de las barras. En «Composición %» el denominador de cada fila es la suma de
              ambos lados con semáforo conocido —{numero(datos.cobertura?.[local]?.conocido ?? 0)} en total
              para esta métrica—: los registros con semáforo sin dato se informan en su columna y
              quedan fuera del denominador. Sin denominador se indica «Sin valores para calcular
              composición». Estos porcentajes describen la composición registrada: no son riesgo,
              probabilidad de lesión ni efecto causal del semáforo.
            </p>
          </details>

          <p className="at-col-detalle">
            {numero(datos.cobertura?.[local]?.conocido ?? 0)} de {numero(datos.cobertura?.[local]?.total ?? 0)}{' '}
            {ETIQUETA_METRICA[metrica].toLowerCase()} tienen condición de semáforo conocida
            {(datos.cobertura?.[local]?.sin_dato ?? 0) > 0
              ? ` · ${numero((datos.cobertura?.[local]?.sin_dato ?? 0))} con semáforo sin dato (fuera del % de composición)`
              : ''}
            . La ausencia de semáforo es una condición registrada del punto, no un incumplimiento.
          </p>

          <p className="at-sr">
            {series
              .map((fila) => {
                const valores = valoresDe(fila);
                const proporcion = porcentajes(fila);
                return `${fila.etiqueta}: ${numero(valores.sin)} sin semáforo, ${numero(
                  valores.con,
                )} con semáforo, ${numero(valores.sin_dato)} con semáforo sin dato${
                  proporcion
                    ? `; denominador ${numero(proporcion.denominador)}, ${decimal(
                        proporcion.con,
                      )} % con semáforo`
                    : '; sin valores para calcular composición'
                }.`;
              })
              .join(' ')}
          </p>
        </div>
      )}
      {cargando && datos ? <p className="at-nota">Actualizando las intersecciones…</p> : null}
    </section>
  );
}






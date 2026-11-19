/**
 * Gráfica editorial de comparación histórica.
 *
 * Lectura: año analizado (línea azul) contra el promedio de años anteriores completos
 * (línea gris), con el **rango histórico observado** (mínimo–máximo de esos años) como
 * banda tenue. Es una comparación descriptiva: no es un intervalo de confianza, no es
 * una predicción y no procede de ningún modelo (para eso están «Modelado» y «Resultados»).
 *
 * Decisiones
 * ----------
 * - Escalas calculadas: el eje Y usa un dominio «redondo» y marcas legibles, no el
 *   máximo crudo del dato.
 * - Etiquetas directas con control de colisiones: el valor observado y el promedio se
 *   separan verticalmente si coinciden, y se reservan 104 px a la derecha para que no
 *   se recorten.
 * - La banda se omite si no hay referencia o si solo hay un año (una banda degenerada
 *   no es evidencia de variabilidad).
 * - La lectura interactiva no consulta la red: usa los puntos ya recibidos.
 * - Tabla accesible con los mismos valores, dentro de un bloque desplegable.
 */

import { scaleLinear, scalePoint } from 'd3-scale';
import { area, line } from 'd3-shape';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { HistoricoRespuesta, ModoHistorico, PuntoHistorico } from '../api';
import { Segmentado } from './Segmentado';

const numero = (valor: number) => Math.round(valor).toLocaleString('es-MX');
const numero1 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const fechaCorta = (iso: string) => {
  const fecha = new Date(`${iso}T00:00:00`);
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
};

/** Etiqueta del eje X: fecha real del año analizado. */
function etiquetaEje(punto: PuntoHistorico): string {
  return fechaCorta(punto.fecha_desde);
}

export function HistoricoEditorial({
  datos,
  cargando,
  error,
  anio,
  modo,
  onAnio,
  onModo,
  onReintentar,
}: {
  datos: HistoricoRespuesta | null;
  cargando: boolean;
  error: string | null;
  anio: number;
  modo: ModoHistorico;
  onAnio: (anio: number) => void;
  onModo: (modo: ModoHistorico) => void;
  onReintentar: () => void;
}) {
  const [ancho, setAncho] = useState(720);
  const [activo, setActivo] = useState<number | null>(null);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const medirNodo = useCallback((nodo: HTMLDivElement | null) => {
    contenedor.current = nodo;
    if (!nodo) return;
    const medir = () => {
      const disponible = nodo.clientWidth;
      if (disponible > 0) setAncho((previo) => (Math.abs(previo - disponible) < 1 ? previo : disponible));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    (nodo as HTMLDivElement & { _observador?: ResizeObserver })._observador = observador;
  }, []);

  useEffect(() => {
    return () => {
      const nodo = contenedor.current as (HTMLDivElement & { _observador?: ResizeObserver }) | null;
      nodo?._observador?.disconnect();
    };
  }, []);

  const compacto = ancho < 720;
  const alto = compacto ? 330 : 400;
  const margen = {
    arriba: compacto ? 22 : 28,
    derecha: compacto ? 112 : 158,
    abajo: compacto ? 52 : 46,
    izquierda: compacto ? 48 : 62,
  };
  const anchoTrazado = Math.max(120, ancho - margen.izquierda - margen.derecha);
  const altoTrazado = alto - margen.arriba - margen.abajo;

  const puntos = datos?.puntos ?? [];
  const maximo = useMemo(() => {
    const valores = puntos.flatMap((punto) => [
      punto.observado ?? 0,
      punto.referencia_max ?? 0,
      punto.referencia_promedio ?? 0,
    ]);
    return Math.max(1, ...valores);
  }, [puntos]);

  const escalaY = useMemo(
    () => scaleLinear().domain([0, maximo]).nice().range([altoTrazado, 0]),
    [maximo, altoTrazado],
  );
  const escalaX = useMemo(
    () => scalePoint<string>().domain(puntos.map((punto) => punto.clave)).range([0, anchoTrazado]),
    [puntos, anchoTrazado],
  );
  const posiciones = useMemo(
    () => puntos.map((punto) => escalaX(punto.clave) ?? 0),
    [puntos, escalaX],
  );
  const marcasY = escalaY.ticks(compacto ? 3 : 4).filter((valor) => Number.isFinite(valor));

  const conBanda = Boolean(datos && !datos.sin_referencia && !datos.una_referencia);
  const conPromedio = Boolean(datos && !datos.sin_referencia);

  const coordenada = (punto: PuntoHistorico) => escalaX(punto.clave) ?? 0;

  const trayectoriaObservada = line<PuntoHistorico>()
    .defined((punto) => punto.observado !== null)
    .x((punto) => coordenada(punto))
    .y((punto) => escalaY(punto.observado as number))(puntos);

  const trayectoriaPromedio = line<PuntoHistorico>()
    .defined((punto) => punto.referencia_promedio !== null)
    .x((punto) => coordenada(punto))
    .y((punto) => escalaY(punto.referencia_promedio as number))(puntos);

  const banda = area<PuntoHistorico>()
    .defined((punto) => punto.referencia_min !== null && punto.referencia_max !== null)
    .x((punto) => coordenada(punto))
    .y0((punto) => escalaY(punto.referencia_min as number))
    .y1((punto) => escalaY(punto.referencia_max as number))(puntos);

  const relleno = area<PuntoHistorico>()
    .defined((punto) => punto.observado !== null && punto.referencia_promedio !== null)
    .x((punto) => coordenada(punto))
    .y0((punto) => escalaY(punto.referencia_promedio as number))
    .y1((punto) => escalaY(punto.observado as number))(puntos);

  /* ---- etiquetas directas del final -------------------------------- */
  const ultimo = datos?.ultimo_con_dato ?? null;
  const etiquetasFinales = useMemo(() => {
    if (!ultimo) return [];
    const x = coordenada(ultimo);
    const yObservado = ultimo.observado !== null ? escalaY(ultimo.observado) : null;
    const yPromedio =
      ultimo.referencia_promedio !== null ? escalaY(ultimo.referencia_promedio) : null;
    const cerca =
      yObservado !== null && yPromedio !== null && Math.abs(yObservado - yPromedio) < 20;
    const salida: { x: number; y: number; texto: string; clase: string }[] = [];
    if (yObservado !== null) {
      salida.push({
        x: x + 7,
        y: cerca ? yObservado - 9 : yObservado + 3,
        texto: `${numero(ultimo.observado as number)}`,
        clase: 'ac-hx-etiqueta--observado',
      });
    }
    if (yPromedio !== null && conPromedio) {
      salida.push({
        x: x + 7,
        y: cerca ? yPromedio + 14 : yPromedio + 3,
        texto: `prom. ${numero(ultimo.referencia_promedio as number)}`,
        clase: 'ac-hx-etiqueta--promedio',
      });
    }
    return salida;
  }, [ultimo, escalaY, conPromedio, puntos]);

  /* ---- anotaciones calculadas (con control de colisiones) ------------ */
  const anotaciones = useMemo(() => {
    if (!datos) return [];
    const ANCHO_CAJA = compacto ? 158 : 190;
    const ALTO_CAJA = 46;
    const ocupadas: { x: number; y: number; w: number; h: number }[] = [];

    /* Zona reservada para las etiquetas directas del final: las cajas no entran ahí. */
    if (ultimo) {
      const xFinal = coordenada(ultimo);
      const yObs = ultimo.observado !== null ? escalaY(ultimo.observado) : altoTrazado / 2;
      const yProm =
        ultimo.referencia_promedio !== null ? escalaY(ultimo.referencia_promedio) : yObs;
      ocupadas.push({
        x: xFinal - 6,
        y: Math.min(yObs, yProm) - 26,
        w: anchoTrazado - xFinal + margen.derecha + 30,
        h: Math.abs(yObs - yProm) + 58,
      });
    }

    const salida: {
      clave: string;
      x: number;
      y: number;
      cajaX: number;
      cajaY: number;
      titulo: string;
      detalle: string;
      diferencia: string;
      tipo: string;
      anchoCaja: number;
      altoCaja: number;
    }[] = [];

    const limitar = (valor: number, minimo: number, maximo: number) =>
      Math.max(minimo, Math.min(maximo, valor));

    for (const anotacion of datos.anotaciones.slice(0, 2)) {
      const punto = puntos.find((candidato) => candidato.clave === anotacion.clave);
      if (!punto) continue;
      const x = coordenada(punto);
      const y = punto.observado !== null ? escalaY(punto.observado) : escalaY(maximo * 0.5);
      const diferencia = anotacion.diferencia;
      const signo = diferencia !== null && diferencia > 0 ? '+' : '';
      const textoDiferencia =
        diferencia === null
          ? 'sin referencia'
          : `${signo}${numero(diferencia)} u${
              anotacion.diferencia_pct === null
                ? ''
                : ` · ${signo}${numero1(anotacion.diferencia_pct)} %`
            }`;

      /* Se prueban posiciones cercanas al punto y, si chocan, bandas despejadas
         arriba y abajo: nunca se apilan dos cajas ni tapan las etiquetas finales. */
      const candidatos = [
        { x: x + 14, y: y - ALTO_CAJA - 16 },
        { x: x - ANCHO_CAJA - 14, y: y - ALTO_CAJA - 16 },
        { x: x + 14, y: y + 18 },
        { x: x - ANCHO_CAJA - 14, y: y + 18 },
        { x: x + 14, y: altoTrazado - ALTO_CAJA - 10 },
        { x: x - ANCHO_CAJA - 14, y: altoTrazado - ALTO_CAJA - 10 },
        { x: x + 14, y: 6 },
        { x: x - ANCHO_CAJA - 14, y: 6 },
        { x: anchoTrazado * 0.5 - ANCHO_CAJA / 2, y: altoTrazado - ALTO_CAJA - 10 },
      ];

      const chocaCon = (caja: { x: number; y: number; w: number; h: number }) =>
        ocupadas.some(
          (otra) =>
            caja.x < otra.x + otra.w + 6 &&
            caja.x + caja.w + 6 > otra.x &&
            caja.y < otra.y + otra.h + 6 &&
            caja.y + caja.h + 6 > otra.y,
        );

      let elegida = {
        x: limitar(x + 14, 0, anchoTrazado - ANCHO_CAJA),
        y: limitar(y - ALTO_CAJA - 16, 0, altoTrazado - ALTO_CAJA),
      };
      for (const candidato of candidatos) {
        const caja = {
          x: limitar(candidato.x, 0, anchoTrazado - ANCHO_CAJA),
          y: limitar(candidato.y, 0, altoTrazado - ALTO_CAJA),
        };
        if (!chocaCon({ ...caja, w: ANCHO_CAJA, h: ALTO_CAJA })) {
          elegida = caja;
          break;
        }
      }
      ocupadas.push({ ...elegida, w: ANCHO_CAJA, h: ALTO_CAJA });
      salida.push({
        clave: anotacion.clave,
        x,
        y,
        cajaX: elegida.x,
        cajaY: elegida.y,
        titulo: anotacion.etiqueta,
        detalle: `${fechaCorta(anotacion.fecha)} · ${numero(anotacion.observado ?? 0)} u`,
        diferencia: textoDiferencia,
        tipo: anotacion.tipo,
        anchoCaja: ANCHO_CAJA,
        altoCaja: ALTO_CAJA,
      });
    }
    return salida;
  }, [datos, puntos, escalaY, maximo, anchoTrazado, altoTrazado, compacto, ultimo, margen.derecha, puntos.length]);

  const ticksX = useMemo(() => {
    if (puntos.length === 0) return [];
    const cuantos = compacto ? 3 : 7;
    const paso = Math.max(1, Math.round((puntos.length - 1) / (cuantos - 1)));
    const indices = new Set<number>();
    for (let indice = 0; indice < puntos.length; indice += paso) indices.add(indice);
    indices.add(puntos.length - 1);
    return [...indices].map((indice) => ({
      x: posiciones[indice] ?? 0,
      texto: etiquetaEje(puntos[indice] as PuntoHistorico),
      ancla:
        indice === 0 ? 'start' : indice === puntos.length - 1 ? 'end' : 'middle',
    }));
  }, [puntos, posiciones, compacto]);

  const cercano = (clientX: number, caja: DOMRect) => {
    if (puntos.length === 0) return null;
    const relativo = ((clientX - caja.left) / caja.width) * ancho - margen.izquierda;
    let indice = 0;
    let distancia = Infinity;
    posiciones.forEach((posicion, orden) => {
      const delta = Math.abs(posicion - relativo);
      if (delta < distancia) {
        distancia = delta;
        indice = orden;
      }
    });
    return indice;
  };

  const mover = (evento: React.PointerEvent<SVGSVGElement>) => {
    const indice = cercano(evento.clientX, evento.currentTarget.getBoundingClientRect());
    if (indice !== null) setActivo(indice);
  };

  const teclas = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    setActivo((previo) => {
      const actual = previo ?? 0;
      if (evento.key === 'Home') return 0;
      if (evento.key === 'End') return puntos.length - 1;
      return Math.max(0, Math.min(puntos.length - 1, actual + (evento.key === 'ArrowRight' ? 1 : -1)));
    });
  };

  const puntoActivo = activo !== null ? puntos[activo] : null;
  const anios = datos?.anios_disponibles ?? [];
  const referenciaTexto = datos
    ? datos.sin_referencia
      ? 'sin referencia histórica comparable'
      : datos.una_referencia
        ? `referencia: ${datos.referencias.anios_incluidos[0]} (un solo año)`
        : `referencia: ${datos.referencias.anios_incluidos.join(', ')} (${datos.referencias.n_anios} años)`
    : '';

  return (
    <section className="ac-panel ac-historico" aria-labelledby="ac-t-historico">
      <header className="ac-panel-cab ac-historico-cab">
        <div>
          <h3 id="ac-t-historico">Evolución y comparación histórica</h3>
          <p className="ac-panel-sub">
            {datos?.filtros.descripcion ?? 'Contexto en curso'} · unidades vendidas ·{' '}
            {modo === 'semana' ? 'semanas ISO de lunes a domingo' : 'acumulado del año por mes y día'}
          </p>
          {datos ? (
            <p className="ac-hx-alcance" data-testid="alcance-historico">
              Año analizado: <strong>{datos.anio}</strong> · {referenciaTexto}
              {datos.acumulado && !datos.acumulado.completo ? ` · ${datos.acumulado.etiqueta}` : ''}
            </p>
          ) : null}
        </div>
        <div className="ac-hx-controles">
          <div className="ac-hx-anios" role="group" aria-label="Año analizado">
            {anios.map((opcion) => (
              <button
                key={opcion}
                type="button"
                className={`ac-hx-anio${opcion === anio ? ' is-activo' : ''}`}
                aria-pressed={opcion === anio}
                onClick={() => onAnio(opcion)}
              >
                {opcion}
              </button>
            ))}
          </div>
          <Segmentado<ModoHistorico>
            etiqueta="Modo de la comparación histórica"
            valor={modo}
            onElegir={onModo}
            testid="selector-modo-historico"
            opciones={[
              { valor: 'semana', texto: 'Por semana' },
              { valor: 'acumulado', texto: 'Acumulado del año' },
            ]}
          />
        </div>
      </header>

      {error ? (
        <p className="ac-hx-aviso" role="alert">
          {error}{' '}
          <button type="button" className="ac-accion ac-accion--secundaria" onClick={onReintentar}>
            Reintentar
          </button>
        </p>
      ) : null}

      {datos?.sin_referencia ? (
        <p className="ac-hx-aviso" data-testid="sin-referencia">
          Sin referencia histórica comparable: no hay años anteriores con cobertura completa. Se
          muestra solo la serie observada; no se dibuja banda ni promedio.
        </p>
      ) : null}
      {datos?.una_referencia ? (
        <p className="ac-hx-aviso" data-testid="una-referencia">
          Un solo año de referencia ({datos.referencias.anios_incluidos[0]}): la línea gris es ese
          año y no se dibuja rango, porque un único año no muestra variabilidad.
        </p>
      ) : null}
      {datos && !datos.cobertura_anio.completa ? (
        <p className="ac-hx-aviso">
          {datos.modo === 'acumulado'
            ? 'El año analizado no tiene cobertura completa: el acumulado empieza en la primera fecha disponible.'
            : 'El año analizado no tiene cobertura completa: la serie observada termina en su último dato.'}
        </p>
      ) : null}

      <div className={`ac-hx-marco${cargando ? ' is-cargando' : ''}`} aria-busy={cargando}>
        <div
          className="ac-hx-centro"
          ref={medirNodo}
          tabIndex={0}
          role="group"
          aria-label="Gráfica de comparación histórica; usa las flechas para recorrer los periodos"
          onKeyDown={teclas}
        >
          <svg
            width={ancho}
            height={alto}
            role="img"
            aria-label={`Unidades vendidas del año ${anio} frente al promedio de años anteriores, con el rango histórico observado`}
            onPointerMove={mover}
            onPointerLeave={() => setActivo(null)}
          >
            <g transform={`translate(${margen.izquierda} ${margen.arriba})`}>
              {marcasY.map((valor) => (
                <g key={`y-${valor}`}>
                  <line
                    x1={0}
                    x2={anchoTrazado}
                    y1={escalaY(valor)}
                    y2={escalaY(valor)}
                    className="ac-eje-linea"
                  />
                  <text x={-8} y={escalaY(valor) + 3} textAnchor="end" className="ac-eje-texto">
                    {numero(valor)}
                  </text>
                </g>
              ))}
              <line x1={0} x2={anchoTrazado} y1={escalaY(0)} y2={escalaY(0)} className="ac-eje-base" />

              {conBanda && banda ? (
                <path d={banda} className="ac-hx-banda" data-testid="banda-historica" />
              ) : null}

              {relleno ? <path d={relleno} className="ac-hx-relleno" /> : null}

              {conPromedio && trayectoriaPromedio ? (
                <path d={trayectoriaPromedio} className="ac-hx-promedio" data-testid="linea-promedio" />
              ) : null}

              {trayectoriaObservada ? (
                <path d={trayectoriaObservada} className="ac-hx-observado" data-testid="linea-observado" />
              ) : null}

              {ultimo && ultimo.observado !== null ? (
                <circle
                  cx={coordenada(ultimo)}
                  cy={escalaY(ultimo.observado)}
                  r={3}
                  className="ac-hx-punto-final"
                />
              ) : null}

              {etiquetasFinales.map((etiqueta) => (
                <g key={etiqueta.clase}>
                  <rect
                    x={etiqueta.x - 1}
                    y={etiqueta.y - 8.5}
                    width={Math.max(20, etiqueta.texto.length * 5.6 + 4)}
                    height={11.5}
                    rx={2}
                    className="ac-hx-etiqueta-fondo"
                  />
                  <text
                    x={etiqueta.x}
                    y={etiqueta.y}
                    textAnchor="start"
                    className={`ac-hx-etiqueta ${etiqueta.clase}`}
                  >
                    {etiqueta.texto}
                  </text>
                </g>
              ))}

              {anotaciones.map((anotacion) => (
                <g key={anotacion.clave} className="ac-hx-anotacion">
                  <line
                    x1={anotacion.x}
                    x2={Math.max(
                      anotacion.cajaX,
                      Math.min(anotacion.cajaX + anotacion.anchoCaja, anotacion.x),
                    )}
                    y1={anotacion.cajaY + (anotacion.cajaY < anotacion.y ? anotacion.altoCaja : 0)}
                    y2={anotacion.y}
                    className="ac-hx-anotacion-guia"
                  />
                  <circle cx={anotacion.x} cy={anotacion.y} r={3.2} className="ac-hx-anotacion-punto" />
                  <g transform={`translate(${anotacion.cajaX} ${anotacion.cajaY})`}>
                    <rect
                      width={anotacion.anchoCaja}
                      height={anotacion.altoCaja}
                      rx={7}
                      className="ac-hx-anotacion-caja"
                    />
                    <text x={9} y={15} className="ac-hx-anotacion-titulo">
                      {anotacion.titulo}
                    </text>
                    <text x={9} y={29} className="ac-hx-anotacion-detalle">
                      {anotacion.detalle}
                    </text>
                    <text x={9} y={41} className="ac-hx-anotacion-diferencia">
                      {anotacion.diferencia}
                    </text>
                  </g>
                </g>
              ))}

              {puntoActivo ? (
                <g>
                  <line
                    x1={coordenada(puntoActivo)}
                    x2={coordenada(puntoActivo)}
                    y1={0}
                    y2={altoTrazado}
                    className="ac-hx-guia"
                  />
                  {puntoActivo.observado !== null ? (
                    <circle
                      cx={coordenada(puntoActivo)}
                      cy={escalaY(puntoActivo.observado)}
                      r={3.4}
                      className="ac-hx-punto-activo"
                    />
                  ) : null}
                  {puntoActivo.referencia_promedio !== null && conPromedio ? (
                    <circle
                      cx={coordenada(puntoActivo)}
                      cy={escalaY(puntoActivo.referencia_promedio)}
                      r={2.6}
                      className="ac-hx-punto-activo--promedio"
                    />
                  ) : null}
                </g>
              ) : null}

              {ticksX.map((marca, indice) => (
                <text
                  key={`x-${indice}`}
                  x={marca.x}
                  y={altoTrazado + 16}
                  textAnchor={marca.ancla as 'start' | 'middle' | 'end'}
                  className="ac-eje-texto"
                >
                  {marca.texto}
                </text>
              ))}

              <text x={-8} y={-10} textAnchor="end" className="ac-eje-texto">
                u
              </text>
            </g>
          </svg>
        </div>

        <ul className="ac-hx-leyenda">
          <li>
            <span className="ac-hx-muestra ac-hx-muestra--observado" /> Año {anio}
          </li>
          {conPromedio ? (
            <li>
              <span className="ac-hx-muestra ac-hx-muestra--promedio" /> Promedio de años anteriores
            </li>
          ) : null}
          {conBanda ? (
            <li>
              <span className="ac-hx-muestra ac-hx-muestra--banda" /> Rango histórico observado
              (mín–máx)
            </li>
          ) : null}
        </ul>
      </div>

      <p className="ac-hx-lectura" role="status" aria-live="polite">
        {puntoActivo ? (
          <>
            <strong>{puntoActivo.etiqueta}</strong> · {puntoActivo.fecha_desde}
            {puntoActivo.fecha_hasta !== puntoActivo.fecha_desde ? ` – ${puntoActivo.fecha_hasta}` : ''} ·{' '}
            observado {puntoActivo.observado === null ? 'sin dato' : `${numero(puntoActivo.observado)} u`}
            {conPromedio && puntoActivo.referencia_promedio !== null ? (
              <>
                {' '}
                · promedio {numero(puntoActivo.referencia_promedio)} u
                {puntoActivo.referencias > 0 ? ` (n=${puntoActivo.referencias})` : ''}
                {puntoActivo.referencia_min !== null && puntoActivo.referencia_max !== null
                  ? ` · rango ${numero(puntoActivo.referencia_min)}–${numero(puntoActivo.referencia_max)}`
                  : ''}
              </>
            ) : null}
            {puntoActivo.diferencia !== null ? (
              <>
                {' '}
                · diferencia {puntoActivo.diferencia > 0 ? '+' : ''}
                {numero(puntoActivo.diferencia)} u
                {puntoActivo.diferencia_pct === null
                  ? ' (porcentaje no calculable)'
                  : ` (${puntoActivo.diferencia_pct > 0 ? '+' : ''}${numero1(puntoActivo.diferencia_pct)} %)`}
              </>
            ) : null}
            {puntoActivo.parcial ? ' · periodo parcial' : ''}
            {puntoActivo.motivo ? ` · ${puntoActivo.motivo}` : ''}
          </>
        ) : (
          <>
            Pasa el cursor sobre la gráfica o usa ← → para leer cada periodo. La banda es el rango
            histórico observado, no un intervalo de confianza.
          </>
        )}
      </p>

      <details className="ac-hx-tabla">
        <summary>Tabla de datos del año {anio}</summary>
        <div className="ac-hx-tabla-marco">
          <table>
            <caption>
              {datos?.etiqueta_modo ?? ''} · {datos?.regla_alineacion ?? ''}
            </caption>
            <thead>
              <tr>
                <th scope="col">Periodo</th>
                <th scope="col">Fechas</th>
                <th scope="col">Observado</th>
                <th scope="col">Promedio</th>
                <th scope="col">Mín.</th>
                <th scope="col">Máx.</th>
                <th scope="col">n</th>
                <th scope="col">Diferencia</th>
                <th scope="col">%</th>
              </tr>
            </thead>
            <tbody>
              {puntos.map((punto) => (
                <tr key={punto.clave} className={punto.estado !== 'ok' ? 'is-parcial' : undefined}>
                  <th scope="row">{punto.etiqueta}</th>
                  <td>
                    {punto.fecha_desde}
                    {punto.fecha_hasta !== punto.fecha_desde ? ` – ${punto.fecha_hasta}` : ''}
                  </td>
                  <td>{punto.observado === null ? 'sin dato' : numero(punto.observado)}</td>
                  <td>{punto.referencia_promedio === null ? '—' : numero(punto.referencia_promedio)}</td>
                  <td>{punto.referencia_min === null ? '—' : numero(punto.referencia_min)}</td>
                  <td>{punto.referencia_max === null ? '—' : numero(punto.referencia_max)}</td>
                  <td>{punto.referencias}</td>
                  <td>
                    {punto.diferencia === null
                      ? '—'
                      : `${punto.diferencia > 0 ? '+' : ''}${numero(punto.diferencia)}`}
                  </td>
                  <td>
                    {punto.diferencia_pct === null
                      ? '—'
                      : `${punto.diferencia_pct > 0 ? '+' : ''}${numero1(punto.diferencia_pct)} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="ac-nota">
        {datos?.nota_banda ?? ''} {datos?.nota_alcance ?? ''}{' '}
        Esta comparación es descriptiva y no sustituye al pronóstico de «Resultados».
      </p>
    </section>
  );
}

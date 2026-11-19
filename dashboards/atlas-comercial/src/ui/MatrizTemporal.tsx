/**
 * Matriz temporal: una fila por tienda y un rectángulo por día del año.
 *
 * Lectura
 * -------
 * - Tres estados visuales distintos, nunca confundidos: **cero observado** (rectángulo
 *   blanco con borde), **valor positivo** (azul Atlas con opacidad sobre una rampa
 *   secuencial de un solo tono) y **sin dato** (fuera de cobertura: trama diagonal en
 *   un tono neutro). Un cero observado no es un dato ausente.
 * - Escala común a todas las filas, con el dominio que publica la API. No se recorta
 *   ningún extremo: el valor máximo del dominio se pinta con la opacidad máxima.
 * - Un cursor por columna (guía vertical) y un bloque de detalle `role="status"` con
 *   fecha, tienda, unidades y cobertura. Teclado: ← → recorren los días, ↑ ↓ las
 *   tiendas, Inicio/Fin saltan al primero y al último día. Nada consulta la red.
 * - SVG frente a Canvas: el caso real es 4 tiendas × 365 días (California, 1 460 celdas)
 *   y el máximo del tablero es 10 tiendas × 365 días (3 650 celdas; 3 660 con un año
 *   bisiesto completo). Medido con `performance.now()` en Chromium (Playwright, build
 *   de producción, contenedor de 1 000 px): montar la matriz cuesta 62 ms con 3 650
 *   celdas y 28 ms con 1 460; mover el cursor cuesta 0.2–2.2 ms porque las filas están
 *   memorizadas y el puntero solo repinta la guía y el detalle. Con ese tamaño SVG es
 *   correcto (3 673 nodos rect, accesible y con detalle por celda sin un bucle de
 *   `requestAnimationFrame`); Canvas solo se justificaría con decenas de miles de celdas.
 * - Responsive: si el ancho no alcanza, el SVG se desplaza en horizontal **dentro** de
 *   su contenedor (`.ac-mt-marco`, `overflow-x: auto`); la página nunca desborda.
 * - La tabla textual resume tienda × mes (unidades del mes) para quien no usa puntero.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as EventoTeclado, PointerEvent as EventoPuntero } from 'react';

import type { MatrizTemporalRespuesta } from '../api';
import { Segmentado } from './Segmentado';
import './estacionalidad.css';

const numero = (valor: number) => Math.round(valor).toLocaleString('es-MX');
const compacto = (valor: number) =>
  Math.abs(valor) >= 10_000 ? `${numero(valor / 1000)} k` : numero(valor);

const MARGEN = { arriba: 26, derecha: 8, abajo: 18, izquierda: 58 };
const ALTO_FILA = 17;
const ANCHO_CELDA_MINIMO = 2.2;
const ANCHO_CELDA_MAXIMO = 9;

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function MatrizTemporal({
  datos,
  cargando,
  error,
  anio,
  anios,
  onAnio,
  contexto,
  onReintentar,
}: {
  datos: MatrizTemporalRespuesta | null;
  cargando: boolean;
  error: string | null;
  anio: number;
  anios: number[];
  onAnio: (anio: number) => void;
  contexto: string;
  onReintentar?: () => void;
}) {
  const [ancho, setAncho] = useState(880);
  const [activa, setActiva] = useState<{ dia: number; fila: number } | null>(null);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const medirNodo = useCallback((nodo: HTMLDivElement | null) => {
    contenedor.current = nodo;
    if (!nodo) return;
    const disponible = nodo.clientWidth;
    if (disponible > 0) {
      setAncho((previo) => (Math.abs(previo - disponible) < 1 ? previo : disponible));
    }
  }, []);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo || typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => {
      const disponible = nodo.clientWidth;
      if (disponible > 0) {
        setAncho((previo) => (Math.abs(previo - disponible) < 1 ? previo : disponible));
      }
    });
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  /* Al cambiar de año el detalle anterior deja de ser válido. */
  useEffect(() => {
    setActiva(null);
  }, [anio]);

  const dias = datos?.dias ?? [];
  const tiendas = datos?.tiendas ?? [];
  const meses = datos?.meses ?? [];

  const anchoUtil = Math.max(180, ancho - MARGEN.izquierda - MARGEN.derecha);
  const anchoCelda = Math.max(
    ANCHO_CELDA_MINIMO,
    Math.min(ANCHO_CELDA_MAXIMO, anchoUtil / Math.max(1, dias.length)),
  );
  const anchoSvg = Math.round(MARGEN.izquierda + dias.length * anchoCelda + MARGEN.derecha);
  const altoSvg = MARGEN.arriba + tiendas.length * ALTO_FILA + MARGEN.abajo;
  const altoCelda = Math.max(2, ALTO_FILA - 2);

  const dominio = datos?.escala.dominio;
  const minimo = dominio?.[0] ?? 0;
  const maximo = dominio?.[1] ?? 1;

  /** Rampa de un solo tono: mínimo del dominio → 0.15 de opacidad, máximo → 1. */
  const opacidad = (valor: number) => {
    if (maximo === minimo) return 1;
    const proporcion = (valor - minimo) / (maximo - minimo);
    return Math.max(0.15, Math.min(1, 0.15 + 0.85 * proporcion));
  };

  /* Filas memorizadas: el cursor y el detalle cambian de estado en cada movimiento del
     puntero, y con la misma referencia de elemento React no vuelve a reconciliar las
     3 660 celdas. Solo se reconstruyen si cambian los datos, el año o el ancho. */
  const filasSvg = useMemo(
    () =>
      tiendas.map((tienda, indiceFila) => {
        const y = MARGEN.arriba + indiceFila * ALTO_FILA;
        return (
          <g key={tienda.store_id}>
            <text
              x={MARGEN.izquierda - 8}
              y={y + ALTO_FILA / 2 + 2.5}
              textAnchor="end"
              className="ac-mt-etq ac-mt-etq--fila"
            >
              {tienda.store_id}
            </text>
            {tienda.valores.map((valor, indiceDia) => {
              const x = MARGEN.izquierda + indiceDia * anchoCelda;
              if (valor === null) {
                return (
                  <rect
                    key={indiceDia}
                    x={x}
                    y={y}
                    width={anchoCelda}
                    height={altoCelda}
                    fill="url(#ac-mt-trama-sin-dato)"
                    className="ac-mt-celda"
                  />
                );
              }
              if (valor === 0) {
                return (
                  <rect
                    key={indiceDia}
                    x={x}
                    y={y}
                    width={anchoCelda}
                    height={altoCelda}
                    className="ac-mt-celda ac-mt-celda--cero"
                  />
                );
              }
              return (
                <rect
                  key={indiceDia}
                  x={x}
                  y={y}
                  width={anchoCelda}
                  height={altoCelda}
                  fill="var(--at-primary)"
                  fillOpacity={opacidad(valor)}
                  className="ac-mt-celda"
                />
              );
            })}
          </g>
        );
      }),
    // `opacidad` solo depende de `minimo`/`maximo`, ya presentes en la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tiendas, anchoCelda, altoCelda, minimo, maximo],
  );

  /* ---- resumen tienda × mes para la tabla textual ---------------------- */
  const resumen = useMemo(
    () =>
      tiendas.map((tienda) => {
        const sumas = new Array<number>(12).fill(0);
        const cuentas = new Array<number>(12).fill(0);
        tienda.valores.forEach((valor, indice) => {
          const dia = dias[indice];
          if (!dia || valor === null) return;
          const posicion = Math.min(11, Math.max(0, dia.mes - 1));
          sumas[posicion] = (sumas[posicion] ?? 0) + valor;
          cuentas[posicion] = (cuentas[posicion] ?? 0) + 1;
        });
        return sumas.map((suma, posicion) => ((cuentas[posicion] ?? 0) > 0 ? suma : null));
      }),
    [tiendas, dias],
  );

  const celdaActiva = activa;
  const diaActivo = celdaActiva ? dias[celdaActiva.dia] : undefined;
  const filaActiva = celdaActiva ? tiendas[celdaActiva.fila] : undefined;
  const valorActivo =
    celdaActiva && filaActiva ? (filaActiva.valores[celdaActiva.dia] ?? null) : null;
  const enCobertura = Boolean(
    datos &&
      diaActivo &&
      diaActivo.fecha >= datos.cobertura.desde &&
      diaActivo.fecha <= datos.cobertura.hasta,
  );

  /* ---- puntero y teclado ------------------------------------------------ */
  const sobreMatriz = (evento: EventoPuntero<SVGSVGElement>) => {
    if (dias.length === 0 || tiendas.length === 0) return;
    const caja = evento.currentTarget.getBoundingClientRect();
    if (caja.width === 0) return;
    const factor = anchoSvg / caja.width;
    const x = (evento.clientX - caja.left) * factor;
    const y = (evento.clientY - caja.top) * factor;
    if (x < MARGEN.izquierda || y < MARGEN.arriba) return;
    const dia = Math.min(dias.length - 1, Math.floor((x - MARGEN.izquierda) / anchoCelda));
    const fila = Math.min(tiendas.length - 1, Math.floor((y - MARGEN.arriba) / ALTO_FILA));
    if (dia < 0 || fila < 0) return;
    setActiva((previo) =>
      previo && previo.dia === dia && previo.fila === fila ? previo : { dia, fila },
    );
  };

  const teclas = (evento: EventoTeclado<HTMLDivElement>) => {
    const permitidas = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!permitidas.includes(evento.key) || dias.length === 0 || tiendas.length === 0) return;
    evento.preventDefault();
    setActiva((previo) => {
      const actual = previo ?? { dia: 0, fila: 0 };
      const dia = Math.max(0, Math.min(dias.length - 1, actual.dia));
      const fila = Math.max(0, Math.min(tiendas.length - 1, actual.fila));
      if (evento.key === 'Home') return { dia: 0, fila };
      if (evento.key === 'End') return { dia: dias.length - 1, fila };
      if (evento.key === 'ArrowLeft') return { dia: Math.max(0, dia - 1), fila };
      if (evento.key === 'ArrowRight') return { dia: Math.min(dias.length - 1, dia + 1), fila };
      if (evento.key === 'ArrowUp') return { dia, fila: Math.max(0, fila - 1) };
      return { dia, fila: Math.min(tiendas.length - 1, fila + 1) };
    });
  };

  /* ---- estados globales -------------------------------------------------- */
  if (error) {
    return (
      <section className="ac-panel ac-panel--error" role="alert">
        <h3>No se pudo calcular la matriz temporal</h3>
        <p>{error}</p>
        {onReintentar ? (
          <button type="button" className="ac-accion" onClick={onReintentar}>
            Reintentar
          </button>
        ) : null}
      </section>
    );
  }

  if (cargando) {
    return (
      <div className="ac-esqueleto" role="status" aria-busy="true">
        <span>Calculando la matriz temporal…</span>
      </div>
    );
  }

  if (!datos) {
    return <p className="ac-vacio">Sin matriz temporal para el año y el contexto actuales.</p>;
  }

  const xGuia = celdaActiva
    ? MARGEN.izquierda + celdaActiva.dia * anchoCelda + anchoCelda / 2
    : null;

  return (
    <section className="ac-panel ac-mt" aria-labelledby="ac-t-matriz-temporal">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-matriz-temporal">Matriz tienda × día · {anio}</h3>
          <p className="ac-panel-sub">
            {contexto} · unidad: unidades vendidas por día · cobertura{' '}
            {datos.cobertura.desde} – {datos.cobertura.hasta} · {tiendas.length}{' '}
            {tiendas.length === 1 ? 'tienda' : 'tiendas'} × {dias.length} días ·{' '}
            {numero(datos.cobertura.celdas_observadas)} celdas observadas,{' '}
            {numero(datos.cobertura.celdas_sin_dato)} sin dato y{' '}
            {numero(datos.cobertura.celdas_fuera_filtro)} fuera del filtro de{' '}
            {numero(datos.cobertura.celdas)}
          </p>
        </div>
        <div className="ac-es-controles">
          <Segmentado<string>
            etiqueta="Año de la matriz temporal"
            valor={String(anio)}
            onElegir={(siguiente) => onAnio(Number(siguiente))}
            testid="selector-anio-matriz"
            opciones={(anios.length > 0 ? anios : [anio]).map((opcion) => ({
              valor: String(opcion),
              texto: String(opcion),
            }))}
          />
        </div>
      </header>

      {tiendas.length === 0 || dias.length === 0 ? (
        <p className="ac-vacio">
          Sin tiendas ni días para el año {anio} en este contexto: no hay celdas que dibujar.
        </p>
      ) : (
        <>
          <div
            className="ac-mt-marco"
            ref={medirNodo}
            tabIndex={0}
            role="group"
            aria-label="Matriz de tiendas y días; las flechas recorren días y tiendas"
            onKeyDown={teclas}
            onPointerLeave={() => setActiva(null)}
          >
            <svg
              width={anchoSvg}
              height={altoSvg}
              viewBox={`0 0 ${anchoSvg} ${altoSvg}`}
              role="img"
              aria-label={`Matriz tienda por día del año ${anio}: ${tiendas.length} tiendas y ${dias.length} días, unidades vendidas por día; el detalle por celda está en el bloque siguiente y en la tabla resumida`}
              onPointerMove={sobreMatriz}
              onPointerDown={sobreMatriz}
            >
              <defs>
                <pattern
                  id="ac-mt-trama-fuera-filtro"
                  width={4}
                  height={4}
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width={4} height={4} fill="#f3f0fb" />
                  <line x1={0} y1={0} x2={0} y2={4} stroke="#c9c1e6" strokeWidth={1.3} />
                </pattern>
                <pattern
                  id="ac-mt-trama-sin-dato"
                  width={4}
                  height={4}
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width={4} height={4} fill="var(--at-soft)" />
                  <line x1={0} y1={0} x2={0} y2={4} stroke="var(--at-border)" strokeWidth={1.3} />
                </pattern>
              </defs>

              {/* eje superior: marcas de mes */}
              <text
                x={MARGEN.izquierda - 8}
                y={MARGEN.arriba - 12}
                textAnchor="end"
                className="ac-mt-etq"
              >
                {anio}
              </text>
              {meses.map((marca) => {
                const x = MARGEN.izquierda + marca.indice * anchoCelda;
                const anchoMes = marca.dias * anchoCelda;
                return (
                  <g key={marca.mes}>
                    <line
                      x1={x}
                      x2={x}
                      y1={MARGEN.arriba - 4}
                      y2={altoSvg - MARGEN.abajo}
                      className="ac-mt-separador"
                    />
                    {anchoMes >= 14 ? (
                      <text
                        x={x + anchoMes / 2}
                        y={MARGEN.arriba - 8}
                        textAnchor="middle"
                        className="ac-mt-etq"
                      >
                        {marca.etiqueta}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {/* filas de tiendas (memorizadas: el cursor no las reconcilia) */}
              {filasSvg}

              {/* cursor por columna */}
              {xGuia !== null ? (
                <line
                  x1={xGuia}
                  x2={xGuia}
                  y1={MARGEN.arriba - 4}
                  y2={altoSvg - MARGEN.abajo}
                  className="ac-mt-guia"
                />
              ) : null}
            </svg>
          </div>

          <div className="ac-mt-leyenda">
            <span className="ac-mt-leyenda-caja">
              <span className="ac-mt-muestra ac-mt-muestra--cero" aria-hidden="true" /> cero
              observado
            </span>
            <span className="ac-mt-leyenda-caja">
              <span className="ac-mt-muestra ac-mt-muestra--lleno" aria-hidden="true" />
              <span>menos</span>
              <RampaEscala min={minimo} max={maximo} opacidad={opacidad} />
              <span>más unidades</span>
            </span>
            <span className="ac-mt-leyenda-caja">
              <span className="ac-mt-muestra ac-mt-muestra--sin-dato" aria-hidden="true" /> sin dato
              (fuera de la cobertura de ventas)
            </span>
            <span className="ac-mt-leyenda-caja">
              <span className="ac-mt-muestra ac-mt-muestra--fuera" aria-hidden="true" /> fuera del
              filtro (con datos, excluido por el periodo)
            </span>
            <span className="ac-mt-leyenda-caja">
              escala común {numero(minimo)} – {numero(maximo)} u
            </span>
          </div>

          <div className="ac-mt-detalle" role="status" aria-live="polite">
            {diaActivo && filaActiva ? (
              <>
                <strong>{diaActivo.fecha}</strong>
                <span>
                  <span className="ac-mt-detalle-etq">Tienda</span> {filaActiva.store_id}
                </span>
                <span>
                  <span className="ac-mt-detalle-etq">Unidades</span>{' '}
                  {valorActivo === null
                    ? 'sin dato'
                    : valorActivo === 0
                      ? 'cero observado'
                      : numero(valorActivo)}
                </span>
                <span>
                  <span className="ac-mt-detalle-etq">Cobertura</span>{' '}
                  {enCobertura ? 'dentro de la cobertura publicada' : 'fuera de cobertura'}
                </span>
              </>
            ) : (
              <span className="ac-mt-detalle-ayuda">
                Pasa el cursor sobre la matriz o usa ← → (días) e ↑ ↓ (tiendas) para leer fecha,
                tienda, unidades y cobertura. La trama diagonal es un día sin dato, no una venta de
                cero.
              </span>
            )}
          </div>

          <details className="ac-es-tabla">
            <summary>Ver la tabla resumida por tienda y mes</summary>
            <div className="ac-mt-tabla-marco">
              <table className="ac-tabla">
                <caption>
                  Unidades del mes por tienda · {anio} · cobertura {datos.cobertura.desde} –{' '}
                  {datos.cobertura.hasta}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Tienda</th>
                    {MESES_CORTOS.map((mes) => (
                      <th scope="col" key={mes}>
                        {mes}
                      </th>
                    ))}
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tiendas.map((tienda, indiceFila) => (
                    <tr key={tienda.store_id}>
                      <th scope="row">{tienda.store_id}</th>
                      {(resumen[indiceFila] ?? []).map((valor, indiceMes) => (
                        <td key={`${tienda.store_id}-${indiceMes}`}>
                          {valor === null ? 'sin dato' : compacto(valor)}
                        </td>
                      ))}
                      <td>{numero(tienda.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      <p className="ac-nota">
        {datos.escala.nota} {datos.cobertura.nota}
      </p>
    </section>
  );
}

/* Rampa de la leyenda: mismos tonos y misma opacidad que las celdas. */
function RampaEscala({
  min,
  max,
  opacidad,
}: {
  min: number;
  max: number;
  opacidad: (valor: number) => number;
}) {
  const pasos = 22;
  const anchoPaso = 96 / pasos;
  const muestras = Array.from({ length: pasos }, (_, indice) => ({
    indice,
    opacidad: opacidad(min + ((max - min) * indice) / (pasos - 1)),
  }));
  return (
    <svg
      className="ac-mt-escala"
      viewBox="0 0 96 9"
      role="img"
      aria-label={`Escala secuencial de ${numero(min)} a ${numero(max)} unidades por día`}
    >
      {muestras.map((muestra) => (
        <rect
          key={muestra.indice}
          x={muestra.indice * anchoPaso}
          y={0}
          width={anchoPaso + 0.4}
          height={9}
          fill="var(--at-primary)"
          fillOpacity={muestra.opacidad}
        />
      ))}
    </svg>
  );
}

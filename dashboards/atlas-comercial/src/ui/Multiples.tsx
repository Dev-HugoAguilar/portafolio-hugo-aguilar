/**
 * Pequeños múltiplos compartidos por el tablero y la comparación de productos.
 *
 * Decisiones de lectura
 * --------------------
 * - Retícula responsive: 5 columnas en escritorio amplio, 2 en anchos intermedios y 1
 *   en móvil; el ancho se mide y el alto de dibujo se mantiene, así la línea no se
 *   deforma en ningún tamaño.
 * - Una sola escala Y desde cero para los paneles visibles, con un dominio «redondo»:
 *   las marcas son calculadas y legibles (0 · 5 000 · 10 000), no el máximo crudo.
 * - Dominio temporal, márgenes y cursor compartidos. Los bloques se pueden agrupar
 *   (por estado) para no mezclar tiendas de territorios distintos sin separación.
 * - El último valor no se rotula dentro del trazado (se superpondría a la línea): va
 *   en la cabecera de cada panel.
 * - El cursor no consulta la red: trabaja con los datos ya recibidos.
 */

import { bisector } from 'd3-array';
import { scaleLinear, scalePoint, type ScaleLinear, type ScalePoint } from 'd3-scale';
import { area, line } from 'd3-shape';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { Agregacion, CuboSerie, ModoSerie, SerieTienda } from '../api';
import {
  etiquetaArticulo,
  etiquetaDepartamento,
  etiquetaEstadoCorto,
  etiquetaTienda,
} from '../etiquetas';

const ANCHO_MINIMO = 190;
const ALTO_DIBUJO = 122;
const MARGEN = { arriba: 10, derecha: 12, abajo: 26, izquierda: 46 };

const numero = (valor: number) => valor.toLocaleString('es-MX');
const numero1 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Clave de una serie en su nivel (identificador real de M5). */
export const claveDe = (serie: SerieTienda) => serie.clave ?? serie.store_id;

/** Etiqueta corta del periodo para los ejes. */
function etiquetaEje(cubo: CuboSerie, agregacion: Agregacion): string {
  const inicio = new Date(`${cubo.clave}T00:00:00`);
  if (agregacion === 'dia') {
    return inicio.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }
  return inicio.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
}

export interface GrupoSeries {
  titulo: string;
  detalle?: string;
  claves: string[];
}

export function Multiples({
  series,
  agregacion,
  modo,
  grupos,
  onExplorar,
  conRelleno = false,
  ariaLabel,
  etiquetaTotal = 'Unidades del periodo',
}: {
  series: SerieTienda[];
  agregacion: Agregacion;
  modo: ModoSerie;
  /** Bloques con encabezado propio (por ejemplo, un estado por bloque). */
  grupos?: GrupoSeries[];
  /** Un solo control por panel: el encabezado abre el nivel siguiente. */
  onExplorar?: ((serie: SerieTienda) => void) | null;
  conRelleno?: boolean;
  ariaLabel: string;
  etiquetaTotal?: string;
}) {
  const [indice, setIndice] = useState<number | null>(null);
  const [anchoPanel, setAnchoPanel] = useState(280);
  const [columnas, setColumnas] = useState(5);
  const rejilla = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nodo = rejilla.current;
    if (!nodo) return;
    const medir = () => {
      const rejillaInterna = nodo.querySelector<HTMLElement>('.ac-grupo-rejilla') ?? nodo;
      const primero = rejillaInterna.querySelector<HTMLElement>('.ac-mini');
      const ancho = primero?.clientWidth ?? rejillaInterna.clientWidth;
      if (ancho > 0) {
        setAnchoPanel((previo) => (Math.abs(previo - ancho) < 1 ? previo : Math.max(ANCHO_MINIMO, ancho)));
      }
      const plantilla = getComputedStyle(rejillaInterna).gridTemplateColumns;
      const cuantas = plantilla.split(' ').filter(Boolean).length || 1;
      setColumnas((previo) => (previo === cuantas ? previo : cuantas));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [series.length]);

  const anchoTrazado = Math.max(60, anchoPanel - MARGEN.izquierda - MARGEN.derecha);
  const primera = series[0];
  const cubos = primera ? primera.valores : [];
  const totalCubos = cubos.length;

  /* ---- referencia común para el índice base 100 ------------------------- */
  const referencia = useMemo(() => {
    const posicion = cubos.findIndex((cubo) => !cubo.parcial && cubo.dias > 0);
    if (posicion < 0) return null;
    const valores = series.map((serie) => ({
      clave: claveDe(serie),
      valor: serie.valores[posicion]?.total ?? 0,
    }));
    return { posicion, cubo: cubos[posicion] as CuboSerie, valores };
  }, [cubos, series]);

  const sinReferencia = modo === 'tendencias' && referencia === null;
  const seriesSinBase = useMemo(() => {
    if (!referencia) return [];
    return referencia.valores.filter((valor) => valor.valor <= 0).map((valor) => valor.clave);
  }, [referencia]);

  const porClave = useMemo(() => {
    const mapa = new Map<string, (number | null)[]>();
    for (const serie of series) {
      const clave = claveDe(serie);
      const base = referencia?.valores.find((valor) => valor.clave === clave)?.valor ?? 0;
      mapa.set(
        clave,
        serie.valores.map((cubo) => {
          if (modo === 'comun') return cubo.dias > 0 ? cubo.total : null;
          if (!referencia || cubo.parcial || cubo.dias === 0 || base <= 0) return null;
          return (100 * cubo.total) / base;
        }),
      );
    }
    return mapa;
  }, [series, modo, referencia]);

  /* Dominio redondo: las marcas deben leerse (0 · 5 000 · 10 000). */
  const escalaY = useMemo(() => {
    const valores =
      modo === 'comun'
        ? series.flatMap((serie) => serie.valores.map((cubo) => cubo.total))
        : [...porClave.values()].flat().filter((valor): valor is number => valor !== null);
    const maximo = Math.max(modo === 'comun' ? 1 : 120, ...valores);
    return scaleLinear().domain([0, maximo]).nice().range([ALTO_DIBUJO, 0]);
  }, [series, modo, porClave]);

  const escalaX = useMemo(
    () =>
      scalePoint<string>()
        .domain(cubos.map((cubo) => cubo.clave))
        .range([0, anchoTrazado]),
    [cubos, anchoTrazado],
  );
  const posiciones = useMemo(() => cubos.map((cubo) => escalaX(cubo.clave) ?? 0), [cubos, escalaX]);
  const bisecar = useMemo(() => bisector((posicion: number) => posicion).left, []);

  const mover = (evento: React.PointerEvent<SVGSVGElement>) => {
    if (totalCubos === 0) return;
    const caja = evento.currentTarget.getBoundingClientRect();
    const relativo = ((evento.clientX - caja.left) / caja.width) * anchoPanel - MARGEN.izquierda;
    const limite = Math.max(0, Math.min(posiciones[posiciones.length - 1] ?? 0, relativo));
    const siguiente = Math.min(totalCubos - 1, bisecar(posiciones, limite));
    const anterior = Math.max(0, siguiente - 1);
    const cercano =
      Math.abs((posiciones[anterior] ?? 0) - limite) <= Math.abs((posiciones[siguiente] ?? 0) - limite)
        ? anterior
        : siguiente;
    setIndice(cercano);
  };

  const teclas = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    setIndice((previo) => {
      const actual = previo ?? 0;
      if (evento.key === 'Home') return 0;
      if (evento.key === 'End') return totalCubos - 1;
      return Math.max(0, Math.min(totalCubos - 1, actual + (evento.key === 'ArrowRight' ? 1 : -1)));
    });
  };

  const cuboActivo = indice !== null ? (cubos[indice] as CuboSerie | undefined) : undefined;

  const ticksX = useMemo(() => {
    if (totalCubos === 0) return [];
    const indices = [0, Math.floor((totalCubos - 1) / 2), totalCubos - 1];
    return [...new Set(indices)].map((posicion) => ({
      posicion,
      x: posiciones[posicion] ?? 0,
      texto: etiquetaEje(cubos[posicion] as CuboSerie, agregacion),
    }));
  }, [cubos, totalCubos, agregacion, posiciones]);

  const porClaveMap = useMemo(() => new Map(series.map((serie) => [claveDe(serie), serie])), [series]);
  const bloques: GrupoSeries[] = grupos && grupos.length > 0
    ? grupos
    : [{ titulo: '', claves: series.map(claveDe) }];

  if (!primera) {
    return <p className="ac-vacio">Sin series para los filtros actuales.</p>;
  }

  return (
    <div>
      {sinReferencia ? (
        <p className="ac-aviso-inline">
          No hay ningún periodo completo en el intervalo consultado, así que no puede construirse el
          índice base 100. Amplía el periodo o cambia la agregación.
        </p>
      ) : null}
      {modo === 'tendencias' && seriesSinBase.length > 0 ? (
        <p className="ac-aviso-inline">
          Sin índice: {seriesSinBase.join(', ')} no registra unidades en el periodo de referencia, así
          que su base sería cero. Sus datos siguen disponibles en «Escala común».
        </p>
      ) : null}

      <div
        className="ac-rejilla-tiendas"
        ref={rejilla}
        tabIndex={0}
        role="group"
        aria-label={ariaLabel}
        onKeyDown={teclas}
      >
        {bloques.map((bloque) => {
          const paneles = bloque.claves
            .map((clave) => porClaveMap.get(clave))
            .filter((serie): serie is SerieTienda => serie !== undefined);
          if (paneles.length === 0) return null;
          return (
            <div className={`ac-grupo-series${bloque.titulo ? ' ac-grupo-series--con-titulo' : ''}`} key={bloque.titulo || 'todos'}>
              {bloque.titulo ? (
                <div className="ac-grupo-cab">
                  <h4>{bloque.titulo}</h4>
                  {bloque.detalle ? <span>{bloque.detalle}</span> : null}
                </div>
              ) : null}
              <div className="ac-grupo-rejilla">
                {paneles.map((serie, posicion) => (
                  <PanelSerie
                    key={claveDe(serie)}
                    serie={serie}
                    ancho={anchoPanel}
                    mostrarY={posicion % Math.max(1, columnas) === 0}
                    conRelleno={conRelleno && modo === 'comun'}
                    valores={porClave.get(claveDe(serie)) ?? []}
                    modo={modo}
                    escalaY={escalaY}
                    escalaX={escalaX}
                    ticksX={ticksX}
                    indice={indice}
                    onMover={mover}
                    onSalir={() => setIndice(null)}
                    onExplorar={onExplorar ?? null}
                    etiquetaTotal={etiquetaTotal}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ac-detalle" role="status" aria-live="polite">
        {cuboActivo ? (
          <>
            <span className="ac-detalle-periodo">
              <strong>{cuboActivo.etiqueta}</strong>
              {cuboActivo.parcial ? ' · periodo parcial' : ''}
            </span>
            {series.map((serie) => {
              const cubo = serie.valores[indice ?? 0];
              const indexado = (porClave.get(claveDe(serie)) ?? [])[indice ?? 0] ?? null;
              return (
                <span className="ac-detalle-item" key={claveDe(serie)}>
                  <span className="ac-detalle-tienda">{claveDe(serie)}</span>
                  {cubo && cubo.dias > 0 ? (
                    modo === 'comun' ? (
                      <span>{numero(cubo.total)}</span>
                    ) : indexado === null ? (
                      <span className="ac-detalle-sin">sin índice</span>
                    ) : (
                      <span>
                        {numero1(indexado)} · {numero(cubo.total)} u
                      </span>
                    )
                  ) : (
                    <span className="ac-detalle-sin">sin dato</span>
                  )}
                </span>
              );
            })}
          </>
        ) : (
          <span className="ac-detalle-ayuda">
            Pasa el cursor sobre cualquier panel o usa ← → para comparar el mismo periodo en todos los
            paneles. Los totales de la cabecera corresponden al intervalo completo; esta tira muestra el
            valor del periodo señalado.
          </span>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */
/* Panel                                                                       */
/* --------------------------------------------------------------------------- */

function PanelSerie({
  serie,
  ancho,
  mostrarY,
  conRelleno,
  valores,
  modo,
  escalaY,
  escalaX,
  ticksX,
  indice,
  onMover,
  onSalir,
  onExplorar,
  etiquetaTotal,
}: {
  serie: SerieTienda;
  ancho: number;
  mostrarY: boolean;
  conRelleno: boolean;
  valores: (number | null)[];
  modo: ModoSerie;
  escalaY: ScaleLinear<number, number>;
  escalaX: ScalePoint<string>;
  ticksX: { posicion: number; x: number; texto: string }[];
  indice: number | null;
  onMover: (evento: React.PointerEvent<SVGSVGElement>) => void;
  onSalir: () => void;
  onExplorar: ((serie: SerieTienda) => void) | null;
  etiquetaTotal: string;
}) {
  const cubos = serie.valores;
  const clave = claveDe(serie);
  const idGradiente = `ac-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const puntos = valores.map((valor, posicion) => ({
    x: escalaX(cubos[posicion]?.clave ?? '') ?? 0,
    y: valor,
    posicion,
  }));
  const trazado = line<{ x: number; y: number | null }>()
    .defined((punto) => punto.y !== null)
    .x((punto) => punto.x)
    .y((punto) => escalaY(punto.y as number))(puntos);
  const relleno = area<{ x: number; y: number | null }>()
    .defined((punto) => punto.y !== null)
    .x((punto) => punto.x)
    .y0(escalaY(0))
    .y1((punto) => escalaY(punto.y as number))(puntos);

  const ultimoValido = (() => {
    for (let posicion = valores.length - 1; posicion >= 0; posicion -= 1) {
      if (valores[posicion] !== null) return posicion;
    }
    return -1;
  })();
  const cuboFinal = ultimoValido >= 0 ? cubos[ultimoValido] : undefined;
  const fechaFinal = cuboFinal
    ? new Date(`${cuboFinal.clave}T00:00:00`).toLocaleDateString('es-MX', {
        month: 'short',
        year: '2-digit',
      })
    : '';
  const textoFinal =
    ultimoValido >= 0 && valores[ultimoValido] !== null
      ? modo === 'comun'
        ? numero(Math.round(valores[ultimoValido] as number))
        : numero1(valores[ultimoValido] as number)
      : '';

  const grosor = ancho < 240 ? 1.5 : 1.8;
  const alto = ALTO_DIBUJO + MARGEN.arriba + MARGEN.abajo;
  const anchoTrazado = Math.max(60, ancho - MARGEN.izquierda - MARGEN.derecha);
  const marcasY = escalaY.ticks(2).filter((valor) => Number.isFinite(valor));

  /* El título del panel usa la etiqueta comercial de la dimensión: «California · Tienda 1»,
     «Alimentos · Departamento 3» o el artículo con su contexto. */
  const nombrePanel =
    serie.nivel === 'tienda'
      ? etiquetaTienda(clave)
      : serie.nivel === 'departamento'
        ? etiquetaDepartamento(clave)
        : serie.nivel === 'producto'
          ? etiquetaArticulo(clave)
          : etiquetaEstadoCorto(clave);

  const activo: number | null = indice !== null ? (valores[indice] ?? null) : null;
  const puntoActivo = indice !== null ? escalaX(cubos[indice]?.clave ?? '') ?? 0 : 0;

  return (
    <figure className="ac-mini" data-clave={clave}>
      <figcaption>
        {onExplorar ? (
          <button
            type="button"
            className="ac-mini-nombre ac-mini-nombre--control"
            onClick={() => onExplorar(serie)}
            aria-label={
              serie.nivel === 'departamento'
                ? `Explorar los productos de ${nombrePanel} (${clave})`
                : serie.nivel === 'producto'
                  ? `Ver ${nombrePanel} (${clave})`
                  : `Explorar los departamentos de ${nombrePanel} (${clave})`
            }
            title={`${nombrePanel} (${clave})`}
            data-testid={`explorar-${clave}`}
          >
            {nombrePanel}
            <span className="ac-mini-flecha" aria-hidden="true">
              ›
            </span>
          </button>
        ) : (
          <span className="ac-mini-nombre" title={`${nombrePanel} (${clave})`}>
            {nombrePanel}
          </span>
        )}
        <span className="ac-mini-total" title={etiquetaTotal}>
          {numero(serie.total)}
        </span>
      </figcaption>
      <p className="ac-mini-pie">
        {etiquetaTotal}
        {textoFinal ? ` · último ${textoFinal}${fechaFinal ? ` (${fechaFinal})` : ''}` : ''}
      </p>
      <svg
        width={ancho}
        height={alto}
        role="img"
        aria-label={`${nombrePanel} (${clave}): ${numero(serie.total)} unidades en el intervalo; ${
          modo === 'comun' ? 'escala común desde cero' : 'índice base 100'
        }`}
        onPointerMove={onMover}
        onPointerDown={onMover}
        onPointerLeave={onSalir}
      >
        <defs>
          <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--at-primary)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--at-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform={`translate(${MARGEN.izquierda} ${MARGEN.arriba})`}>
          {marcasY.map((valor) => (
            <g key={`y-${valor}`}>
              <line x1={0} x2={anchoTrazado} y1={escalaY(valor)} y2={escalaY(valor)} className="ac-eje-linea" />
              {mostrarY ? (
                <text x={-6} y={escalaY(valor) + 3} textAnchor="end" className="ac-eje-texto">
                  {numero(Math.round(valor))}
                </text>
              ) : null}
            </g>
          ))}

          {modo === 'tendencias' ? (
            <g>
              <line x1={0} x2={anchoTrazado} y1={escalaY(100)} y2={escalaY(100)} className="ac-guia-100" />
              <text x={anchoTrazado} y={escalaY(100) - 3} textAnchor="end" className="ac-guia-100-texto">
                100
              </text>
            </g>
          ) : null}

          {conRelleno && relleno ? (
            <path d={relleno} fill={`url(#${idGradiente})`} stroke="none" className="ac-relleno" />
          ) : null}

          <path d={trazado ?? ''} className="ac-linea" style={{ strokeWidth: grosor }} />

          {ultimoValido >= 0 && valores[ultimoValido] !== null ? (
            <circle
              cx={escalaX(cubos[ultimoValido]?.clave ?? '') ?? 0}
              cy={escalaY(valores[ultimoValido] as number)}
              r={2.7}
              className="ac-punto-final"
            />
          ) : null}

          {indice !== null && activo !== null ? (
            <circle cx={puntoActivo} cy={escalaY(activo)} r={2.6} className="ac-punto-cursor" />
          ) : null}

          {indice !== null ? (
            <line x1={puntoActivo} x2={puntoActivo} y1={0} y2={ALTO_DIBUJO} className="ac-guia-linea" />
          ) : null}

          {ticksX.map((marca) => (
            <text
              key={`x-${marca.posicion}`}
              x={marca.x}
              y={ALTO_DIBUJO + 14}
              textAnchor={marca.posicion === 0 ? 'start' : marca.posicion === cubos.length - 1 ? 'end' : 'middle'}
              className="ac-eje-texto"
            >
              {marca.texto}
            </text>
          ))}
        </g>
      </svg>
    </figure>
  );
}


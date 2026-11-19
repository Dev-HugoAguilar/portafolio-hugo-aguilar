/**
 * Curvas de retención por segmento, con selector de segmentos.
 *
 * Reglas que implementa esta vista:
 *
 *  - **S0 = 100 %** en cada curva: el denominador es la propia base del segmento
 *    (usuarios de ese valor en la semana 0 de las cohortes elegibles), no la base
 *    de toda la cohorte. La comparación visual empieza en **S1**.
 *  - Solo se dibujan los segmentos **seleccionados**: la selección se aplica antes
 *    de construir las series, no se ocultan trazados con CSS.
 *  - Escala común a todos los segmentos visibles.
 *  - Una semana sin ventana de observación **no** se dibuja como cero: la línea se
 *    corta y queda una marca hueca con su motivo.
 *  - No existe la categoría «Otros»: nunca se promedian porcentajes de segmentos.
 */

import * as Popover from '@radix-ui/react-popover';
import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';

import type { CurvaRetencion, PuntoCurva } from '../api/tipos';
import { numero, porcentaje } from '../dominio';
import { PALETA } from '../paleta';

export interface OpcionSegmento {
  valor: string;
  /** Usuarios elegibles en S0 (base de la semana 0). */
  base: number;
  /** Usuarios elegibles en S1: denominador de esa semana. */
  baseS1: number;
  pequena: boolean;
}

const COLORES = [
  PALETA.primary,
  PALETA.teal,
  PALETA.violeta,
  '#B4712A',
  '#3E7A46',
  '#8A4F7D',
  '#52607A',
  '#2E7E8A',
];

/** Color estable por nombre: no depende del orden ni de la selección actual. */
export function asignarColores(valores: string[]): Map<string, string> {
  const mapa = new Map<string, string>();
  const usados = new Set<number>();
  for (const valor of [...valores].sort((a, b) => a.localeCompare(b, 'es'))) {
    let hash = 0;
    for (let i = 0; i < valor.length; i += 1) hash = (hash * 31 + valor.charCodeAt(i)) % 997;
    let indice = hash % COLORES.length;
    let intentos = 0;
    while (usados.has(indice) && intentos < COLORES.length) {
      indice = (indice + 1) % COLORES.length;
      intentos += 1;
    }
    usados.add(indice);
    mapa.set(valor, COLORES[indice]!);
  }
  return mapa;
}

const ALTO = 230;

interface Activo {
  valor: string;
  indice: number;
  usuarios: number;
  base: number;
  retencion: number | null;
  x: number;
  y: number;
}

export function CurvasSegmento({
  curvas,
  seleccionados,
  umbral,
  criterio,
}: {
  curvas: CurvaRetencion[];
  seleccionados: string[];
  umbral: number;
  criterio: string;
}) {
  const [activo, setActivo] = useState<Activo | null>(null);
  const [resaltado, setResaltado] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement | null>(null);
  const [medido, setMedido] = useState(0);

  /* El ancho sale del contenedor real: al abrir la pestaña, al redimensionar la
     ventana y al cambiar el layout responsive. */
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const actualizar = () => setMedido(Math.round(nodo.getBoundingClientRect().width));
    actualizar();
    const observador = new ResizeObserver(actualizar);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [medido === 0]);

  const serie = useMemo(
    () => curvas.filter((curva) => seleccionados.includes(curva.valor)),
    [curvas, seleccionados],
  );
  const colores = useMemo(() => asignarColores(seleccionados), [seleccionados]);

  const ancho = Math.max(420, medido);
  const margen = {
    arriba: 18,
    derecha: Math.max(16, Math.round(ancho * 0.03)),
    abajo: 30,
    izquierda: 46,
  };
  // Se comparan solo las semanas posteriores a la de primera actividad (S1+).
  const indices = useMemo(
    () =>
      [...new Set(serie.flatMap((curva) => curva.puntos.map((punto) => punto.indice)))]
        .filter((indice) => indice >= 1)
        .sort((a, b) => a - b),
    [serie],
  );
  const maximo = Math.max(
    1,
    ...serie.flatMap((curva) =>
      curva.puntos.filter((punto) => punto.indice >= 1).map((punto) => punto.retencion ?? 0),
    ),
  );
  const escalaX = scaleLinear()
    .domain([0, Math.max(1, indices.length - 1)])
    .range([margen.izquierda, ancho - margen.derecha]);
  const escalaY = scaleLinear()
    .domain([0, maximo * 1.12])
    .range([ALTO - margen.abajo, margen.arriba]);
  const trazo = line<{ x: number; y: number }>()
    .x((punto) => punto.x)
    .y((punto) => punto.y)
    .curve(curveMonotoneX);

  return (
    <div className="mk-curvas">
      <div className="mk-curvas-caja" ref={contenedor}>
        <p className="mk-curvas-referencia">
          <span className="mk-curvas-ref-marca" aria-hidden="true" />
          S0 = 100 % de cada base (referencia) · se compara desde S1
        </p>
        <svg
          width={ancho}
          height={ALTO}
          viewBox={`0 0 ${ancho} ${ALTO}`}
          role="img"
          aria-label={`Curvas de retención de ${serie.length} segmentos desde la semana 1; escala común de 0 a ${porcentaje(
            maximo,
          )}.`}
        >
          {escalaY.ticks(4).map((marca) => (
            <g key={marca}>
              <line
                x1={margen.izquierda}
                x2={ancho - margen.derecha}
                y1={escalaY(marca)}
                y2={escalaY(marca)}
                stroke={PALETA.guia}
              />
              <text
                x={margen.izquierda - 6}
                y={escalaY(marca) + 3.5}
                textAnchor="end"
                fill={PALETA.textSecondary}
                fontSize={9.5}
              >
                {marca.toFixed(0)} %
              </text>
            </g>
          ))}

          {indices.map((indice, posicion) => (
            <text
              key={`s-${indice}`}
              x={escalaX(posicion)}
              y={ALTO - 10}
              textAnchor="middle"
              fill={PALETA.textSecondary}
              fontSize={9.5}
            >
              S{indice}
            </text>
          ))}

          {serie.map((curva) => {
            const color = colores.get(curva.valor) ?? PALETA.primary;
            const atenuada = Boolean(resaltado) && resaltado !== curva.valor;
            const porIndice = new Map<number, PuntoCurva>(
              curva.puntos.map((punto) => [punto.indice, punto]),
            );
            const disponibles = indices.filter((indice) => {
              const punto = porIndice.get(indice);
              return punto && punto.retencion !== null;
            });
            const puntos = disponibles.map((indice) => ({
              x: escalaX(indices.indexOf(indice)),
              y: escalaY(porIndice.get(indice)!.retencion as number),
            }));
            return (
              <g
                key={curva.valor}
                opacity={atenuada ? 0.25 : 1}
                style={{ transition: 'opacity 140ms ease' }}
                onMouseEnter={() => setResaltado(curva.valor)}
                onMouseLeave={() => setResaltado(null)}
              >
                <path d={trazo(puntos) ?? ''} fill="none" stroke={color} strokeWidth={1.9} />
                {disponibles.map((indice) => {
                  const punto = porIndice.get(indice)!;
                  const x = escalaX(indices.indexOf(indice));
                  const y = escalaY(punto.retencion as number);
                  return (
                    <circle
                      key={`p-${indice}`}
                      cx={x}
                      cy={y}
                      r={3}
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth={0.8}
                      role="button"
                      tabIndex={0}
                      aria-label={`${curva.valor}, semana ${indice}: ${numero(
                        punto.usuarios,
                      )} de ${numero(punto.base)} usuarios, ${porcentaje(punto.retencion)}.`}
                      onMouseEnter={() =>
                        setActivo({
                          valor: curva.valor,
                          indice,
                          usuarios: punto.usuarios,
                          base: punto.base,
                          retencion: punto.retencion,
                          x,
                          y,
                        })
                      }
                      onMouseLeave={() => setActivo(null)}
                      onFocus={() => {
                        setResaltado(curva.valor);
                        setActivo({
                          valor: curva.valor,
                          indice,
                          usuarios: punto.usuarios,
                          base: punto.base,
                          retencion: punto.retencion,
                          x,
                          y,
                        });
                      }}
                      onBlur={() => {
                        setResaltado(null);
                        setActivo(null);
                      }}
                    />
                  );
                })}
                {/* Semanas sin ventana de observación: marca hueca, nunca cero. */}
                {indices
                  .filter((indice) => {
                    const punto = porIndice.get(indice);
                    return !punto || punto.retencion === null;
                  })
                  .map((indice) => (
                    <rect
                      key={`vacio-${indice}`}
                      x={escalaX(indices.indexOf(indice)) - 2.5}
                      y={ALTO - margen.abajo - 2.5}
                      width={5}
                      height={5}
                      fill="none"
                      stroke={color}
                      strokeDasharray="2 2"
                      opacity={0.75}
                    >
                      <title>{`${curva.valor}, S${indice}: sin ventana de observación`}</title>
                    </rect>
                  ))}
              </g>
            );
          })}
        </svg>

        {activo ? (
          <div
            className="mk-tooltip mk-tooltip--fijo"
            role="status"
            style={{ left: Math.min(Math.max(8, activo.x - 80), ancho - 250) }}
          >
            <p className="mk-tooltip-title">
              {activo.valor} · S{activo.indice}
            </p>
            <dl className="mk-tooltip-lista">
              <div>
                <dt>Regresaron</dt>
                <dd>{numero(activo.usuarios)}</dd>
              </div>
              <div>
                <dt>Denominador elegible</dt>
                <dd>{numero(activo.base)}</dd>
              </div>
              <div>
                <dt>Retención</dt>
                <dd>{porcentaje(activo.retencion)}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>

      <p className="mk-nota mk-nota--pie">
        Escala común para los {serie.length} segmentos visibles · los cuadros huecos son semanas sin
        ventana de observación (no son cero) · {criterio}
        {serie.some((curva) => (curva.base_s1 ?? curva.base_s0 ?? 0) < umbral)
          ? ` · base pequeña: menos de ${numero(umbral)} usuarios.`
          : ''}
      </p>
    </div>
  );
}

export function SelectorSegmentos({
  etiqueta,
  opciones,
  seleccionados,
  maximo,
  umbral,
  onCambiar,
}: {
  etiqueta: string;
  opciones: OpcionSegmento[];
  seleccionados: string[];
  maximo: number;
  umbral: number;
  onCambiar: (valores: string[]) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  // Plural para el resumen del botón («Países · 5 seleccionados»).
  const plural = etiqueta === 'Canal' ? 'Canales' : etiqueta === 'País' ? 'Países' : `${etiqueta}s`;

  const filtradas = useMemo(() => {
    const termino = normalizar(busqueda);
    if (!termino) return opciones;
    return opciones.filter((opcion) => normalizar(opcion.valor).includes(termino));
  }, [opciones, busqueda]);

  const alternar = (valor: string) => {
    if (seleccionados.includes(valor)) {
      onCambiar(seleccionados.filter((item) => item !== valor));
      return;
    }
    if (seleccionados.length >= maximo) return;
    onCambiar([...seleccionados, valor]);
  };

  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="mk-selector-trigger"
          aria-label={`${plural}: ${seleccionados.length} seleccionados de ${maximo} visibles. Abrir selector.`}
        >
          {plural} · {seleccionados.length} {seleccionados.length === 1 ? 'seleccionado' : 'seleccionados'}
          <span aria-hidden="true">▾</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="mk-dialog-popover" sideOffset={6} align="end">
          <div className="mk-selector-cabecera">
            <p className="mk-selector-titulo">Elegir {etiqueta.toLowerCase()}</p>
            <p className="mk-nota mk-tenue">
              Máximo {maximo} visibles · {opciones.length} disponibles · base pequeña: menos de{' '}
              {numero(umbral)} usuarios
            </p>
            <input
              type="search"
              className="mk-buscador"
              placeholder={`Buscar ${etiqueta.toLowerCase()}…`}
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              aria-label={`Buscar ${etiqueta.toLowerCase()}`}
            />
          </div>
          <ul className="mk-selector-lista" role="listbox" aria-multiselectable>
            {filtradas.length === 0 ? (
              <li className="mk-selector-vacio">Sin resultados para «{busqueda}».</li>
            ) : (
              filtradas.map((opcion) => {
                const elegido = seleccionados.includes(opcion.valor);
                const bloqueado = !elegido && seleccionados.length >= maximo;
                return (
                  <li key={opcion.valor}>
                    <label className={`mk-selector-opcion${bloqueado ? ' is-bloqueada' : ''}`}>
                      <input
                        type="checkbox"
                        checked={elegido}
                        disabled={bloqueado}
                        onChange={() => alternar(opcion.valor)}
                      />
                      <span className="mk-selector-nombre">{opcion.valor}</span>
                      <span className="mk-selector-base">
                        {numero(opcion.baseS1)} elegibles
                        {opcion.pequena ? ' · base pequeña' : ''}
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
          <div className="mk-selector-pie">
            <button
              type="button"
              className="mk-btn mk-btn--ghost"
              onClick={() => onCambiar(opciones.slice(0, maximo).map((opcion) => opcion.valor))}
            >
              Los {maximo} de más base
            </button>
            <button type="button" className="mk-btn mk-btn--primario" onClick={() => setAbierto(false)}>
              Listo
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function LeyendaSegmentos({
  valores,
  colores,
  umbral,
  opciones,
  onQuitar,
}: {
  valores: string[];
  colores: Map<string, string>;
  umbral: number;
  opciones: OpcionSegmento[];
  onQuitar: (valor: string) => void;
}) {
  return (
    <ul className="mk-leyenda mk-leyenda--compacta">
      {valores.map((valor) => {
        const opcion = opciones.find((item) => item.valor === valor);
        return (
          <li key={valor}>
            <span className="mk-chip-curva">
              <span
                className="mk-leyenda-color"
                style={{ background: colores.get(valor) ?? PALETA.primary }}
                aria-hidden="true"
              />
              {valor}
              {opcion && opcion.pequena ? <span className="mk-tenue"> · base pequeña</span> : null}
              <button
                type="button"
                className="mk-chip-quitar"
                onClick={() => onQuitar(valor)}
                aria-label={`Quitar ${valor} de las curvas (${numero(opcion?.baseS1 ?? 0)} elegibles en S1)`}
                title={`Quitar ${valor}`}
              >
                ×
              </button>
            </span>
          </li>
        );
      })}
      {valores.length < 5 ? null : (
        <li className="mk-tenue">Máximo visible: 5 · usa el selector para cambiar.</li>
      )}
      {umbral ? null : null}
    </ul>
  );
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * «Detalle de artículo × tienda»: ventas diarias y precio semanal en dos paneles alineados.
 *
 * Qué muestra
 * -----------
 * - **Cabecera**: artículo, tienda y estado, categoría y departamento, periodo y cobertura.
 * - **Buscador** conectado al buscador de productos existente: solo emite el texto y la
 *   selección; la petición la hace la aplicación, así que aquí no hay red.
 * - **Dos paneles con el mismo dominio temporal**: ventas diarias (unidades) y precio
 *   semanal en trazo escalonado (USD por unidad). Cada panel tiene su propio eje y su
 *   unidad: nunca se superponen en un doble eje ambiguo.
 * - **Cursor compartido**: al mover el puntero o con las flechas se marcan los mismos días
 *   en ambos paneles y el detalle muestra fecha, unidades y precio de esa semana.
 * - **Capas opcionales**: SNAP del estado de la tienda y eventos del calendario. Son
 *   coincidencias temporales, no causas.
 * - **Intermitencia**: resumen de la serie y tabla paginada de todas las series de la
 *   tienda, con el orden elegido. Un día sin dato no es un cero.
 */

import { curveStepAfter, line } from 'd3-shape';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ArticuloRespuesta, IntermitenciaRespuesta, ProductoConUnidades } from '../api';
import {
  etiquetaArticulo,
  etiquetaCategoriaCorta,
  etiquetaDepartamento,
  etiquetaTienda,
} from '../etiquetas';
import './precios.css';

const numero = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : valor.toLocaleString('es-MX');
const numero1 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? '—'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const numero2 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? '—'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const fechaCorta = (iso: string | null) => {
  if (!iso) return '—';
  const fecha = new Date(`${iso}T00:00:00`);
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

const ANCHO = 760;
const MARGEN = { arriba: 16, derecha: 96, abajo: 26, izquierda: 52 };
const ALTO_VENTAS = 150;
const ALTO_PRECIO = 104;

export function DetalleArticulo({
  articulo,
  intermitencia,
  cargando,
  error,
  contexto,
  tienda,
  item,
  productos,
  buscando,
  onBuscar,
  onElegirItem,
  pagina,
  onPagina,
  orden,
  onOrden,
  onReintentar,
}: {
  articulo: ArticuloRespuesta | null;
  intermitencia: IntermitenciaRespuesta | null;
  cargando: boolean;
  error: string | null;
  contexto: string;
  tienda: string | null;
  item: string | null;
  productos: ProductoConUnidades[];
  buscando: boolean;
  onBuscar: (texto: string) => void;
  onElegirItem: (item: string) => void;
  pagina: number;
  onPagina: (pagina: number) => void;
  orden: 'ceros' | 'unidades' | 'racha';
  onOrden: (orden: 'ceros' | 'unidades' | 'racha') => void;
  onReintentar?: () => void;
}) {
  const [texto, setTexto] = useState('');
  const [capaSnap, setCapaSnap] = useState(false);
  const [capaEventos, setCapaEventos] = useState(false);
  const [activo, setActivo] = useState<number | null>(null);
  const temporizador = useRef<number | null>(null);

  useEffect(() => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => onBuscar(texto.trim()), 260);
    return () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const dias = articulo?.ventas ?? [];
  const indicePorFecha = useMemo(() => {
    const mapa = new Map<string, number>();
    dias.forEach((dia, indice) => mapa.set(dia.fecha, indice));
    return mapa;
  }, [dias]);

  const series = useMemo(() => {
    if (!articulo || dias.length === 0) return null;
    const total = dias.length;
    const anchoTrazado = ANCHO - MARGEN.izquierda - MARGEN.derecha;
    const x = (indice: number) =>
      MARGEN.izquierda + (total <= 1 ? 0 : (indice / (total - 1)) * anchoTrazado);
    const maxVentas = Math.max(1, ...dias.map((dia) => dia.unidades ?? 0));
    const altoVentas = ALTO_VENTAS - MARGEN.arriba - MARGEN.abajo;
    const yVentas = (valor: number) => MARGEN.arriba + altoVentas - (valor / maxVentas) * altoVentas;

    const precios = articulo.precios.puntos
      .map((punto) => {
        const desde = punto.inicio ? indicePorFecha.get(punto.inicio) : undefined;
        const hasta = punto.fin ? indicePorFecha.get(punto.fin) : undefined;
        const inicio = desde ?? hasta;
        const fin = hasta ?? desde;
        if (inicio === undefined || fin === undefined) return null;
        return { inicio, fin, precio: punto.precio, wm_yr_wk: punto.wm_yr_wk };
      })
      .filter(
        (punto): punto is { inicio: number; fin: number; precio: number; wm_yr_wk: number } =>
          Boolean(punto),
      )
      .sort((a, b) => a.inicio - b.inicio);

    const precioMin = precios.length ? Math.min(...precios.map((punto) => punto.precio)) : 0;
    const precioMax = precios.length ? Math.max(...precios.map((punto) => punto.precio)) : 1;
    const rango = Math.max(0.02, precioMax - precioMin);
    const altoPrecio = ALTO_PRECIO - MARGEN.arriba - MARGEN.abajo;
    const yPrecio = (valor: number) =>
      MARGEN.arriba + altoPrecio * 0.92 - ((valor - precioMin) / rango) * (altoPrecio * 0.84);

    const trayectoriaVentas =
      line<{ x: number; y: number }>()
        .x((punto) => punto.x)
        .y((punto) => punto.y)(
        dias
          .map((dia, indice) =>
            dia.unidades === null ? null : { x: x(indice), y: yVentas(dia.unidades) },
          )
          .filter((punto): punto is { x: number; y: number } => Boolean(punto)),
      ) ?? '';

    const escalon: { x: number; y: number }[] = [];
    precios.forEach((punto) => {
      escalon.push({ x: x(punto.inicio), y: yPrecio(punto.precio) });
      escalon.push({ x: x(punto.fin), y: yPrecio(punto.precio) });
    });
    const trayectoriaPrecio =
      line<{ x: number; y: number }>()
        .x((punto) => punto.x)
        .y((punto) => punto.y)
        .curve(curveStepAfter)(escalon) ?? '';

    const snap = new Set(
      (articulo.capas.snap ?? [])
        .map((marca) => indicePorFecha.get(marca.fecha))
        .filter((valor): valor is number => valor !== undefined),
    );
    const eventos = new Map<number, { nombre: string; tipo: string | null }[]>();
    for (const evento of articulo.capas.eventos ?? []) {
      const indice = indicePorFecha.get(evento.fecha);
      if (indice === undefined) continue;
      eventos.set(indice, [
        ...(eventos.get(indice) ?? []),
        { nombre: evento.nombre, tipo: evento.tipo },
      ]);
    }

    return {
      total,
      anchoTrazado,
      x,
      yVentas,
      yPrecio,
      trayectoriaVentas,
      trayectoriaPrecio,
      marcasY: [0, 0.5, 1].map((parte) => maxVentas * parte),
      marcasPrecio: precios.length ? [precioMin, precioMin + rango / 2, precioMax] : [],
      snap,
      eventos,
      precios,
    };
  }, [articulo, dias, indicePorFecha]);

  const diaActivo = activo === null ? null : (dias[activo] ?? null);
  const precioActivo = useMemo(() => {
    if (!series || activo === null) return null;
    return series.precios.find((punto) => activo >= punto.inicio && activo <= punto.fin) ?? null;
  }, [series, activo]);
  const eventosActivos = activo === null ? undefined : series?.eventos.get(activo);

  const cercano = (clientX: number, caja: DOMRect) => {
    if (!series) return 0;
    const relativo = ((clientX - caja.left) / caja.width) * ANCHO;
    const proporcion = (relativo - MARGEN.izquierda) / Math.max(1, series.anchoTrazado);
    const indice = Math.round(proporcion * (series.total - 1));
    return Math.max(0, Math.min(series.total - 1, indice));
  };

  const teclado = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (!series) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    setActivo((previo) => {
      const actual = previo ?? 0;
      if (evento.key === 'Home') return 0;
      if (evento.key === 'End') return series.total - 1;
      return Math.max(0, Math.min(series.total - 1, actual + (evento.key === 'ArrowRight' ? 1 : -1)));
    });
  };

  /* Marcas de mes sin encimarse: se conservan todos los eneros y, si el periodo es corto,
     algún mes intermedio. Con 1 941 días no caben 64 etiquetas. */
  const etiquetasMes = useMemo(() => {
    const todos: { indice: number; texto: string; mes: number }[] = [];
    const vistos = new Set<string>();
    dias.forEach((dia, indice) => {
      const clave = dia.fecha.slice(0, 7);
      if (vistos.has(clave)) return;
      vistos.add(clave);
      const fecha = new Date(`${dia.fecha}T00:00:00`);
      todos.push({
        indice,
        mes: fecha.getMonth(),
        texto: `${MESES[fecha.getMonth()]} ${String(fecha.getFullYear()).slice(2)}`,
      });
    });
    if (todos.length <= 10) return todos;
    const paso = Math.ceil(todos.length / 8);
    return todos.filter((etiqueta, posicion) => etiqueta.mes === 0 || posicion % paso === 0);
  }, [dias]);

  return (
    <section className="ac-panel ac-pr-panel" aria-labelledby="ac-t-articulo">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-articulo">Detalle de artículo × tienda</h3>
          <p className="ac-panel-sub">
            {articulo
              ? `${etiquetaArticulo(articulo.articulo.item_id)} · ${etiquetaCategoriaCorta(
                  articulo.articulo.cat_id,
                )} · ${etiquetaDepartamento(articulo.articulo.dept_id)} · ${etiquetaTienda(
                  articulo.articulo.tienda,
                )}`
              : contexto}
          </p>
          {articulo ? (
            <p className="ac-pr-unidad">
              Periodo {fechaCorta(articulo.periodo.desde)} – {fechaCorta(articulo.periodo.hasta)} ·{' '}
              {numero(articulo.periodo.dias)} días · {numero(articulo.intermitencia.dias_validos)} con
              observación · ventas en unidades vendidas, precio en USD por unidad
            </p>
          ) : null}
        </div>
        <div className="ac-pr-controles">
          <label className="ac-pr-campo">
            Buscar artículo
            <input
              type="search"
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder={
                tienda ? `Código de artículo en ${etiquetaTienda(tienda)}` : 'Elige una tienda'
              }
              disabled={!tienda}
              aria-label="Buscar artículo por identificador"
            />
          </label>
        </div>
      </header>

      {tienda ? (
        <div className="ac-pr-controles" role="group" aria-label="Resultados del buscador">
          {buscando ? <span className="ac-pr-cargando">Buscando…</span> : null}
          {productos.length > 0 ? (
            <ul className="ac-pr-leyenda">
              {productos.map((producto) => (
                <li key={producto.item_id}>
                  <button
                    type="button"
                    className="ac-pr-pagina"
                    aria-pressed={producto.item_id === item}
                    onClick={() => onElegirItem(producto.item_id)}
                  >
                    {producto.item_id} · {numero(producto.unidades)} u
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="ac-pr-error" role="alert">
          <p>{error}</p>
          {onReintentar ? (
            <button type="button" className="ac-pr-pagina" onClick={onReintentar}>
              Reintentar
            </button>
          ) : null}
        </div>
      ) : null}

      {!error && (cargando || !articulo) ? (
        <p className="ac-pr-cargando" role="status" aria-busy="true">
          {cargando
            ? 'Cargando ventas y precio del artículo…'
            : 'Elige un artículo para ver su detalle.'}
        </p>
      ) : null}

      {articulo && series ? (
        <>
          <div className="ac-pr-controles" role="group" aria-label="Capas de contexto temporal">
            <button
              type="button"
              className="ac-pr-pagina"
              aria-pressed={capaSnap}
              onClick={() => setCapaSnap((previo) => !previo)}
            >
              {capaSnap ? 'Ocultar SNAP del estado' : 'Ver SNAP del estado'}
            </button>
            <button
              type="button"
              className="ac-pr-pagina"
              aria-pressed={capaEventos}
              onClick={() => setCapaEventos((previo) => !previo)}
            >
              {capaEventos ? 'Ocultar eventos' : 'Ver eventos del calendario'}
            </button>
          </div>

          <div
            className="ac-pr-cajas"
            tabIndex={0}
            role="group"
            aria-label="Ventas diarias y precio semanal; usa las flechas para recorrer los días"
            onKeyDown={teclado}
            data-testid="detalle-paneles"
          >
            <svg
              viewBox={`0 0 ${ANCHO} ${ALTO_VENTAS}`}
              role="img"
              aria-label={`Ventas diarias de ${articulo.articulo.item_id} en ${articulo.articulo.tienda}: unidades vendidas por día`}
              onPointerMove={(evento) =>
                setActivo(cercano(evento.clientX, evento.currentTarget.getBoundingClientRect()))
              }
              onPointerLeave={() => setActivo(null)}
            >
              <text x={8} y={12} className="ac-pr-caja-cat">
                Ventas diarias · unidades vendidas
              </text>
              {series.marcasY.map((valor) => (
                <g key={`v-${valor}`}>
                  <line
                    x1={MARGEN.izquierda}
                    x2={ANCHO - MARGEN.derecha}
                    y1={series.yVentas(valor)}
                    y2={series.yVentas(valor)}
                    className="ac-eje-linea"
                  />
                  <text
                    x={MARGEN.izquierda - 8}
                    y={series.yVentas(valor) + 3}
                    textAnchor="end"
                    className="ac-eje-texto"
                  >
                    {numero(Math.round(valor))}
                  </text>
                </g>
              ))}
              <path
                d={series.trayectoriaVentas}
                fill="none"
                stroke="var(--at-primary)"
                strokeWidth={1.6}
              />
              {capaSnap
                ? [...series.snap].map((indice) => (
                    <rect
                      key={`snap-${indice}`}
                      x={series.x(indice) - 1}
                      y={MARGEN.arriba}
                      width={2}
                      height={ALTO_VENTAS - MARGEN.arriba - MARGEN.abajo}
                      fill="rgba(55, 65, 81, 0.16)"
                    />
                  ))
                : null}
              {capaEventos
                ? [...series.eventos.keys()].map((indice) => (
                    <circle
                      key={`ev-${indice}`}
                      cx={series.x(indice)}
                      cy={ALTO_VENTAS - MARGEN.abajo + 6}
                      r={2.4}
                      fill="var(--control-active)"
                    />
                  ))
                : null}
              {etiquetasMes.map((etiqueta) => (
                <text
                  key={`mes-${etiqueta.indice}`}
                  x={series.x(etiqueta.indice)}
                  y={ALTO_VENTAS - 6}
                  className="ac-eje-texto"
                >
                  {etiqueta.texto}
                </text>
              ))}
              {activo !== null ? (
                <line
                  x1={series.x(activo)}
                  x2={series.x(activo)}
                  y1={MARGEN.arriba}
                  y2={ALTO_VENTAS - MARGEN.abajo}
                  className="ac-corte"
                />
              ) : null}
            </svg>

            <svg
              viewBox={`0 0 ${ANCHO} ${ALTO_PRECIO}`}
              role="img"
              aria-label={`Precio semanal de ${articulo.articulo.item_id} en ${articulo.articulo.tienda}, en USD por unidad`}
              onPointerMove={(evento) =>
                setActivo(cercano(evento.clientX, evento.currentTarget.getBoundingClientRect()))
              }
              onPointerLeave={() => setActivo(null)}
            >
              <text x={8} y={12} className="ac-pr-caja-cat">
                Precio semanal · USD por unidad
              </text>
              {series.marcasPrecio.map((valor) => (
                <g key={`p-${valor}`}>
                  <line
                    x1={MARGEN.izquierda}
                    x2={ANCHO - MARGEN.derecha}
                    y1={series.yPrecio(valor)}
                    y2={series.yPrecio(valor)}
                    className="ac-eje-linea"
                  />
                  <text
                    x={MARGEN.izquierda - 8}
                    y={series.yPrecio(valor) + 3}
                    textAnchor="end"
                    className="ac-eje-texto"
                  >
                    {numero2(valor)}
                  </text>
                </g>
              ))}
              {series.precios.length > 0 ? (
                <path
                  d={series.trayectoriaPrecio}
                  fill="none"
                  stroke="var(--control-active)"
                  strokeWidth={1.6}
                />
              ) : (
                <text x={MARGEN.izquierda} y={ALTO_PRECIO / 2} className="ac-eje-texto">
                  {articulo.precios.motivo ?? 'sin precio publicado en el periodo'}
                </text>
              )}
              {activo !== null ? (
                <line
                  x1={series.x(activo)}
                  x2={series.x(activo)}
                  y1={8}
                  y2={ALTO_PRECIO - 8}
                  className="ac-corte"
                />
              ) : null}
            </svg>
          </div>

          <p className="ac-pr-tolerancia" role="status" aria-live="polite" data-testid="detalle-dia">
            {diaActivo
              ? `${fechaCorta(diaActivo.fecha)} · ${
                  diaActivo.unidades === null ? 'sin dato de ventas' : `${numero(diaActivo.unidades)} u`
                } · ${
                  precioActivo
                    ? `${numero2(precioActivo.precio)} USD por unidad (semana ${precioActivo.wm_yr_wk})`
                    : 'sin precio esa semana'
                }${eventosActivos ? ` · evento: ${eventosActivos.map((evento) => `${evento.nombre}${evento.tipo ? ` (${evento.tipo})` : ''}`).join(', ')}` : ''}`
              : 'Pasa el cursor sobre la gráfica o usa las flechas para leer cada día.'}
          </p>

          <p className="ac-pr-regla">
            {articulo.capas.nota ??
              'Las marcas muestran coincidencias temporales; no identifican efectos causales.'}{' '}
            Ventas y precio son métricas separadas: no se multiplican ni se convierten en ingresos.
          </p>

          <dl className="ac-pr-globales">
            <div>
              <dt>Días con observación</dt>
              <dd>{numero(articulo.intermitencia.dias_validos)}</dd>
            </div>
            <div>
              <dt>Días con venta positiva</dt>
              <dd>{numero(articulo.intermitencia.dias_positivos)}</dd>
            </div>
            <div>
              <dt>Días con cero</dt>
              <dd>{numero(articulo.intermitencia.dias_cero)}</dd>
            </div>
            <div>
              <dt>% de ceros</dt>
              <dd>{numero1(articulo.intermitencia.pct_cero)} %</dd>
            </div>
            <div>
              <dt>Mayor racha de ceros</dt>
              <dd>{numero(articulo.intermitencia.racha_maxima_ceros)}</dd>
            </div>
            <div>
              <dt>Primera venta positiva</dt>
              <dd>{fechaCorta(articulo.intermitencia.primera_venta_positiva)}</dd>
            </div>
            <div>
              <dt>Última venta positiva</dt>
              <dd>{fechaCorta(articulo.intermitencia.ultima_venta_positiva)}</dd>
            </div>
            <div>
              <dt>Unidades del periodo</dt>
              <dd>{numero(articulo.intermitencia.unidades)}</dd>
            </div>
          </dl>
          <p className="ac-pr-nota-datos">
            «Primera» y «última venta positiva observada» son fechas con venta, no apertura,
            cierre, inventario ni rotura de stock. Un día sin dato no cuenta como cero e interrumpe
            la racha.
          </p>
        </>
      ) : null}

      {intermitencia ? (
        <>
          <header className="ac-panel-cab">
            <div>
              <h4>Intermitencia de las series · {intermitencia.tienda}</h4>
              <p className="ac-panel-sub">
                {numero(intermitencia.resumen.series)} series ·{' '}
                {numero(intermitencia.resumen.series_todas_cero)} con ventas siempre cero · mediana
                de ceros {numero1(intermitencia.resumen.pct_cero_mediana)} %
              </p>
            </div>
            <div className="ac-pr-controles">
              {(
                [
                  ['ceros', 'Más ceros'],
                  ['unidades', 'Más unidades'],
                  ['racha', 'Racha más larga'],
                ] as const
              ).map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  className="ac-pr-pagina"
                  aria-pressed={orden === valor}
                  onClick={() => onOrden(valor)}
                >
                  {texto}
                </button>
              ))}
            </div>
          </header>

          <div className="ac-pr-marco">
            <table className="ac-pr-tabla">
              <caption>
                Series artículo × tienda ordenadas por {intermitencia.paginacion.orden}; se incluyen
                las de ventas siempre cero
              </caption>
              <thead>
                <tr>
                  <th scope="col">Artículo</th>
                  <th scope="col">Departamento</th>
                  <th scope="col">Días válidos</th>
                  <th scope="col">Positivos</th>
                  <th scope="col">Ceros</th>
                  <th scope="col">% ceros</th>
                  <th scope="col">Racha</th>
                  <th scope="col">Primera venta</th>
                  <th scope="col">Última venta</th>
                </tr>
              </thead>
              <tbody>
                {intermitencia.filas.map((fila) => (
                  <tr
                    key={fila.item_id}
                    style={fila.item_id === item ? { background: 'var(--at-soft)' } : undefined}
                  >
                    <th scope="row">
                      <button
                        type="button"
                        className="ac-pr-pagina"
                        onClick={() => onElegirItem(fila.item_id)}
                        title={`Ver el detalle de ${fila.item_id}`}
                      >
                        {fila.item_id}
                      </button>
                    </th>
                    <td>{fila.dept_id ?? '—'}</td>
                    <td>{numero(fila.dias_validos)}</td>
                    <td>{numero(fila.dias_positivos)}</td>
                    <td>{numero(fila.dias_cero)}</td>
                    <td>{numero1(fila.pct_cero)} %</td>
                    <td>{numero(fila.racha_maxima_ceros)}</td>
                    <td>
                      {fila.primera_venta_positiva ? fechaCorta(fila.primera_venta_positiva) : '—'}
                    </td>
                    <td>
                      {fila.ultima_venta_positiva ? fechaCorta(fila.ultima_venta_positiva) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ac-pr-paginacion">
            <button
              type="button"
              className="ac-pr-pagina"
              disabled={pagina <= 1}
              onClick={() => onPagina(pagina - 1)}
            >
              Anterior
            </button>
            <span>
              Página {intermitencia.paginacion.pagina} de {intermitencia.paginacion.paginas} ·{' '}
              {numero(intermitencia.paginacion.total)} series
            </span>
            <button
              type="button"
              className="ac-pr-pagina"
              disabled={pagina >= intermitencia.paginacion.paginas}
              onClick={() => onPagina(pagina + 1)}
            >
              Siguiente
            </button>
          </div>

          <p className="ac-pr-nota-datos">{intermitencia.reglas}</p>
        </>
      ) : null}
    </section>
  );
}

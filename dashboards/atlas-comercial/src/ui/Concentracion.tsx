/**
 * Concentración de unidades vendidas: bloque compacto y explorable.
 *
 * Pregunta: «¿cuántos productos concentran al menos el X % de las unidades vendidas?».
 *
 * - Curva acumulada descendente por producto, con dominio 0–100 % en ambos ejes y cierre en
 *   (100 %, 100 %). El área de trazado es compacta (≈260 px en escritorio, ≈220 px en móvil):
 *   no se escala el SVG completo, se ajustan alto y márgenes.
 * - El objetivo se mueve con cinco opciones rápidas y un rango de 1 % a 100 % (paso 1): todos
 *   se refieren al **porcentaje de unidades**, no al de productos.
 * - El número mínimo de productos se calcula sobre la lista exacta que publica la API
 *   (`concentracion.exacto`), no sobre la curva reducida, y en el navegador: mover el control
 *   no genera peticiones.
 * - El detalle del grupo se abre en una tabla paginada. El detalle por artículo × tienda
 *   requiere una tienda explícita: con varias tiendas en el contexto se pide elegir una.
 */

import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { PulsoRespuesta } from '../api';
import {
  OBJETIVO_INICIAL,
  OBJETIVOS_RAPIDOS,
  lecturaUmbral,
  productosExactos,
  textoUmbral,
} from '../concentracion';
import {
  etiquetaArticuloCorta,
  etiquetaCategoria,
  etiquetaDepartamentoCorta,
} from '../etiquetas';
import './concentracion.css';

const numero = (valor: number) => valor.toLocaleString('es-MX');
const numero1 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const FILAS_PAGINA = 12;

export function ConcentracionProductos({
  datos,
  onExplorarArticulo,
}: {
  datos: PulsoRespuesta;
  /** Abre el detalle de artículo × tienda conservando territorio, catálogo y periodo. */
  onExplorarArticulo?: (item: string) => void;
}) {
  const { concentracion } = datos;
  const [objetivo, setObjetivo] = useState(OBJETIVO_INICIAL);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [pagina, setPagina] = useState(1);
  /* El SVG se dibuja en su propio sistema de coordenadas: en pantallas estrechas se usa un
     lienzo más corto para que las etiquetas del eje sigan siendo legibles (no se escala el
     dibujo completo reduciendo el texto a la mitad). */
  const figura = useRef<HTMLElement | null>(null);
  const [anchoLienzo, setAnchoLienzo] = useState(720);

  useEffect(() => {
    const nodo = figura.current;
    if (!nodo || typeof ResizeObserver === 'undefined') return;
    const medir = () => setAnchoLienzo(nodo.clientWidth < 520 ? 360 : 720);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  const universo = useMemo(
    () => ({
      productos: productosExactos(concentracion.exacto?.productos),
      total: concentracion.exacto?.total ?? concentracion.total,
    }),
    [concentracion],
  );

  const lectura = useMemo(() => lecturaUmbral(universo, objetivo), [universo, objetivo]);
  const exacto = universo.productos.length > 0;

  // Curva dibujada: la muestra que publica la API (forma) más el marcador del objetivo, que
  // sí se calcula con los productos exactos. Con universo exacto se dibuja la curva exacta.
  const puntos = useMemo(() => {
    if (exacto && lectura) {
      const paso = Math.max(1, Math.ceil(universo.productos.length / 400));
      const serie: { x: number; y: number }[] = [{ x: 0, y: 0 }];
      let acumulado = 0;
      universo.productos.forEach((producto, indice) => {
        acumulado += producto.unidades;
        const ultimo = indice === universo.productos.length - 1;
        if (indice % paso === 0 || ultimo || indice + 1 === lectura.productos) {
          serie.push({
            x: (100 * (indice + 1)) / universo.productos.length,
            y: (100 * acumulado) / universo.total,
          });
        }
      });
      return serie;
    }
    return concentracion.puntos.map((punto) => ({
      x: punto.porcentaje_productos ?? 0,
      y: punto.porcentaje ?? 0,
    }));
  }, [concentracion, exacto, lectura, universo]);

  const ancho = anchoLienzo;
  const alto = anchoLienzo < 520 ? 200 : 236;
  const margen = { arriba: 14, derecha: 16, abajo: 34, izquierda: 44 };
  const escalaX = scaleLinear()
    .domain([0, 100])
    .range([margen.izquierda, ancho - margen.derecha]);
  const escalaY = scaleLinear()
    .domain([0, 100])
    .range([alto - margen.abajo, margen.arriba]);

  if (concentracion.estado === 'vacio' || concentracion.puntos.length === 0 || !lectura) {
    return (
      <div className="ac-conc" data-testid="concentracion">
        <p className="ac-vacio" data-testid="concentracion-vacia">
          {datos.nivel === 'producto'
            ? 'Ningún producto de la selección tiene unidades en el intervalo: no hay curva ni umbral que calcular.'
            : 'Total cero en el intervalo: no hay curva de concentración. Los controles quedan deshabilitados porque el porcentaje no estaría definido.'}
        </p>
        <fieldset className="ac-conc-controles" disabled>
          <legend>Proporción objetivo de unidades</legend>
          <div className="ac-conc-rapidos">
            {OBJETIVOS_RAPIDOS.map((valor) => (
              <button key={valor} type="button" className="ac-conc-rapido" disabled>
                {valor} %
              </button>
            ))}
          </div>
          <label className="ac-campo">
            <span>Objetivo</span>
            <input type="range" min={1} max={100} step={1} value={objetivo} disabled readOnly />
          </label>
        </fieldset>
      </div>
    );
  }

  const marca = {
    x: escalaX(lectura.porcentajeProductos),
    y: escalaY(lectura.porcentajeUnidades),
  };
  const trazado = line<{ x: number; y: number }>()
    .x((punto) => escalaX(punto.x))
    .y((punto) => escalaY(punto.y))(puntos);

  const totalPaginas = Math.max(1, Math.ceil(lectura.grupo.length / FILAS_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filas = lectura.grupo.slice((paginaActual - 1) * FILAS_PAGINA, paginaActual * FILAS_PAGINA);
  const variasTiendas = (datos.series?.length ?? 0) > 1 || (datos.parametros?.tiendas?.length ?? 0) > 1;
  const tiendaUnica = datos.parametros?.tienda ?? (variasTiendas ? null : datos.parametros?.tiendas?.[0]);

  const cambiarObjetivo = (siguiente: number) => {
    setObjetivo(Math.min(100, Math.max(1, Math.round(siguiente))));
    setPagina(1);
  };

  return (
    <div className="ac-conc" data-testid="concentracion">
      <p className="ac-conc-pregunta">
        ¿Cuántos productos concentran una proporción determinada de las unidades vendidas?
        <span className="ac-conc-universo"> · {concentracion.alcance || concentracion.universo}</span>
      </p>

      <div className="ac-conc-rejilla">
        <figure className="ac-conc-figura" ref={figura}>
          <svg
            viewBox={`0 0 ${ancho} ${alto}`}
            role="img"
            aria-label={`Curva acumulada de unidades por producto: el ${numero1(lectura.porcentajeProductos)} % de los productos acumula el ${numero1(lectura.porcentajeUnidades)} % de las unidades`}
          >
            {[0, 25, 50, 75, 100].map((valor) => (
              <g key={`y-${valor}`}>
                <line
                  className="ac-conc-guia"
                  x1={margen.izquierda}
                  x2={ancho - margen.derecha}
                  y1={escalaY(valor)}
                  y2={escalaY(valor)}
                />
                <text className="ac-conc-eje" x={margen.izquierda - 8} y={escalaY(valor) + 4} textAnchor="end">
                  {valor} %
                </text>
              </g>
            ))}
            {(ancho < 520 ? [0, 50, 100] : [0, 25, 50, 75, 100]).map((valor) => (
              <text
                key={`x-${valor}`}
                className="ac-conc-eje"
                x={escalaX(valor)}
                y={alto - margen.abajo + 16}
                textAnchor="middle"
              >
                {valor} %
              </text>
            ))}
            <text
              className="ac-conc-etq-eje"
              x={margen.izquierda}
              y={alto - 4}
              textAnchor="start"
            >
              % acumulado de productos
            </text>
            <path className="ac-conc-curva" d={trazado ?? ''} />
            <line
              className="ac-conc-marca-guia"
              x1={marca.x}
              x2={marca.x}
              y1={marca.y}
              y2={alto - margen.abajo}
              data-testid="concentracion-guia-x"
            />
            <line
              className="ac-conc-marca-guia"
              x1={margen.izquierda}
              x2={marca.x}
              y1={marca.y}
              y2={marca.y}
              data-testid="concentracion-guia-y"
            />
            <circle className="ac-conc-marca" cx={marca.x} cy={marca.y} r={4.5} />
            {/* Etiqueta centrada y acotada al área de trazado: nunca se sale del lienzo. */}
            <text
              className="ac-conc-etq-marca"
              x={Math.min(
                Math.max(marca.x, margen.izquierda + (ancho < 520 ? 74 : 110)),
                ancho - margen.derecha - (ancho < 520 ? 74 : 110),
              )}
              y={Math.min(marca.y + 18, alto - margen.abajo - 6)}
              textAnchor="middle"
            >
              {ancho < 520
                ? `${numero(lectura.productos)} prods · ${numero1(lectura.porcentajeUnidades)} %`
                : `${numero(lectura.productos)} productos · ${numero1(lectura.porcentajeUnidades)} % de unidades`}
            </text>
          </svg>
        </figure>

        <div className="ac-conc-lectura">
          <p className="ac-conc-texto" data-testid="concentracion-texto">
            {textoUmbral(lectura, numero)}
          </p>
          <dl className="ac-conc-datos">
            <div>
              <dt>Productos del grupo</dt>
              <dd>{numero(lectura.productos)}</dd>
            </div>
            <div>
              <dt>Universo</dt>
              <dd>{numero(lectura.universo)}</dd>
            </div>
            <div>
              <dt>Unidades acumuladas</dt>
              <dd>{numero(lectura.unidades)}</dd>
            </div>
            <div>
              <dt>Porcentaje alcanzado</dt>
              <dd>{numero1(lectura.porcentajeUnidades)} %</dd>
            </div>
          </dl>
          <p className="ac-conc-nota">
            El objetivo se mide sobre unidades, no sobre número de productos. El porcentaje
            alcanzado puede superar al objetivo porque las unidades son enteras.
          </p>
        </div>
      </div>

      <fieldset className="ac-conc-controles">
        <legend>Proporción objetivo de unidades</legend>
        <div className="ac-conc-rapidos" role="group" aria-label="Objetivos rápidos de unidades">
          {OBJETIVOS_RAPIDOS.map((valor) => (
            <button
              key={valor}
              type="button"
              className={`ac-conc-rapido${objetivo === valor ? ' is-activa' : ''}`}
              aria-pressed={objetivo === valor}
              onClick={() => cambiarObjetivo(valor)}
            >
              {valor} %
            </button>
          ))}
        </div>
        <label className="ac-conc-rango">
          <span>Objetivo: {objetivo} % de las unidades</span>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={objetivo}
            aria-valuemin={1}
            aria-valuemax={100}
            aria-valuenow={objetivo}
            aria-valuetext={`${objetivo} % de las unidades`}
            onChange={(evento) => cambiarObjetivo(Number(evento.target.value))}
            data-testid="concentracion-objetivo"
          />
        </label>
      </fieldset>

      <div className="ac-conc-acciones">
        <button
          type="button"
          className="ac-accion ac-accion--secundaria"
          aria-expanded={detalleAbierto}
          aria-controls="ac-conc-detalle"
          onClick={() => setDetalleAbierto((previo) => !previo)}
        >
          {detalleAbierto
            ? 'Ocultar productos del grupo'
            : `Ver productos que forman este grupo (${numero(lectura.productos)})`}
        </button>
        {detalleAbierto && variasTiendas && !tiendaUnica ? (
          <p className="ac-conc-nota" data-testid="concentracion-varias-tiendas">
            El contexto incluye {numero(datos.parametros?.tiendas?.length ?? 0)} tiendas: para abrir
            el detalle artículo × tienda elige una tienda en el territorio. La concentración de
            unidades no inventa una tienda implícita.
          </p>
        ) : null}
      </div>

      {detalleAbierto ? (
        <div className="ac-tabla-marco ac-conc-tabla" id="ac-conc-detalle">
          <table className="ac-tabla">
            <caption>
              Productos que forman el grupo del {lectura.objetivo} % · {numero(lectura.productos)} de{' '}
              {numero(lectura.universo)} productos · unidades del periodo
            </caption>
            <thead>
              <tr>
                <th scope="col" className="ac-tabla-num">#</th>
                <th scope="col">Artículo</th>
                <th scope="col">Categoría / departamento</th>
                <th scope="col" className="ac-tabla-num">Unidades</th>
                <th scope="col" className="ac-tabla-num">Participación</th>
                <th scope="col" className="ac-tabla-num">Acumulada</th>
                <th scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((producto, indice) => {
                const posicion = (paginaActual - 1) * FILAS_PAGINA + indice + 1;
                const acumulada =
                  lectura.grupo
                    .slice(0, posicion)
                    .reduce((suma, fila) => suma + fila.unidades, 0) / universo.total;
                return (
                  <tr key={producto.item_id}>
                    <td className="ac-tabla-num">{numero(posicion)}</td>
                    <th scope="row" className="ac-conc-articulo">
                      {etiquetaArticuloCorta(producto.item_id)}
                      <span className="ac-plan-codigo">{producto.item_id}</span>
                    </th>
                    <td>
                      {etiquetaCategoria(producto.cat_id)} ·{' '}
                      {etiquetaDepartamentoCorta(producto.dept_id)}
                    </td>
                    <td className="ac-tabla-num">{numero(producto.unidades)}</td>
                    <td className="ac-tabla-num">
                      {numero1((100 * producto.unidades) / universo.total)} %
                    </td>
                    <td className="ac-tabla-num">{numero1(100 * acumulada)} %</td>
                    <td>
                      {onExplorarArticulo && tiendaUnica ? (
                        <button
                          type="button"
                          className="ac-enlace"
                          onClick={() => onExplorarArticulo(producto.item_id)}
                        >
                          Ver detalle
                        </button>
                      ) : (
                        <span className="ac-conc-sin-detalle">
                          {tiendaUnica ? 'sin detalle' : 'requiere tienda'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="ac-conc-paginacion">
            <button
              type="button"
              className="ac-accion ac-accion--secundaria"
              onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
              disabled={paginaActual <= 1}
            >
              Anterior
            </button>
            <span className="ac-conc-pagina">
              Página {numero(paginaActual)} de {numero(totalPaginas)} · {numero(FILAS_PAGINA)} por
              página
            </span>
            <button
              type="button"
              className="ac-accion ac-accion--secundaria"
              onClick={() => setPagina((valor) => Math.min(totalPaginas, valor + 1))}
              disabled={paginaActual >= totalPaginas}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

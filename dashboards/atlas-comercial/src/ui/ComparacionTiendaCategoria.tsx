/**
 * «Comparación entre periodos por tienda y categoría».
 *
 * Cada fila es una combinación **real** tienda × categoría del contexto (California sin
 * filtros comerciales: 4 tiendas × 3 categorías = 12 filas). Los extremos son dos
 * periodos, no un rango estadístico:
 *
 * - círculo hueco: periodo A;
 * - círculo sólido: periodo B (aunque quede a la izquierda de A);
 * - segmento horizontal: distancia entre ambos valores sobre un eje común desde cero.
 *
 * El bloque es **colapsable**: la cabecera (título, periodos, métrica activa, número de
 * tiendas y combinaciones, resumen de aumentos/disminuciones/empates/no calculables y el
 * botón) permanece visible. Colapsar no vuelve a consultar ni recalcula: solo oculta el
 * cuerpo, y conserva filtros, orden y selección.
 *
 * En el orden «Por tienda» cada tienda es un encabezado expandible con el número de
 * categorías que contiene; expandir es una acción distinta de navegar al detalle. En los
 * órdenes globales (volumen, aumento, disminución) se usa una lista plana con ambas
 * identificaciones, porque agrupar destruiría el orden.
 *
 * La escala del eje se calcula con **todas** las filas del contexto filtrado: expandir una
 * tienda no cambia el tamaño relativo de las demás.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { FilaComparacionTiendaCategoria, MetricaAB } from '../api';
import { Segmentado } from './Segmentado';
import './comparacion.css';

export type OrdenAB = 'tienda' | 'volumen_b' | 'aumento' | 'disminucion';

const ORDENES: { valor: OrdenAB; texto: string }[] = [
  { valor: 'tienda', texto: 'Por tienda' },
  { valor: 'volumen_b', texto: 'Mayor volumen B' },
  { valor: 'aumento', texto: 'Mayor aumento' },
  { valor: 'disminucion', texto: 'Mayor disminución' },
];

const METRICAS: { valor: MetricaAB; texto: string }[] = [
  { valor: 'total', texto: 'Unidades totales' },
  { valor: 'promedio_diario', texto: 'Promedio diario' },
];

const numero = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? 'n/c' : valor.toLocaleString('es-MX');
const numero1 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? 'n/c'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Marca del eje abreviada con una unidad consistente.
 *
 * El millón se divide entre 1 000 000 **antes** de añadir «M»: mostrar el valor completo con
 * sufijo producía etiquetas como «1,969,700.0 M». Las cifras exactas siguen en las columnas,
 * en la tabla y en el detalle de cada fila.
 */
export const marcaEje = (valor: number): string => {
  if (!Number.isFinite(valor)) return '';
  const signo = valor < 0 ? '−' : '';
  const absoluto = Math.abs(valor);
  if (absoluto >= 1_000_000) {
    return `${signo}${(absoluto / 1_000_000).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })} M`;
  }
  if (absoluto >= 1_000) {
    return `${signo}${(absoluto / 1_000).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })} mil`;
  }
  return `${signo}${absoluto.toLocaleString('es-MX', { maximumFractionDigits: 1 })}`;
};

const fechaCorta = (iso: string) => {
  const fecha = new Date(`${iso}T00:00:00`);
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

const ETIQUETA_CATEGORIA: Record<string, string> = {
  FOODS: 'Alimentos',
  HOBBIES: 'Aficiones',
  HOUSEHOLD: 'Hogar',
};

/** Días inclusivos entre dos fechas ISO. */
const diasEntre = (desde: string, hasta: string) => {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000) + 1;
};

/**
 * Resumen de la comparación para la métrica activa: aumentos, disminuciones, empates y casos
 * no calculables. Se calcula sobre las filas del contexto filtrado, no sobre el subconjunto
 * expandido.
 */
export function resumenComparacion(
  filas: FilaComparacionTiendaCategoria[],
  metrica: MetricaAB,
): { aumentos: number; disminuciones: number; empates: number; noCalculables: number; total: number } {
  let aumentos = 0;
  let disminuciones = 0;
  let empates = 0;
  let noCalculables = 0;
  for (const fila of filas) {
    const variacion = fila.metricas[metrica]?.variacion_pct;
    if (variacion === null || variacion === undefined) {
      noCalculables += 1;
    } else if (Math.abs(variacion) < 1e-9) {
      empates += 1;
    } else if (variacion > 0) {
      aumentos += 1;
    } else {
      disminuciones += 1;
    }
  }
  return { aumentos, disminuciones, empates, noCalculables, total: filas.length };
}

export function ComparacionTiendaCategoria({
  datos,
  cargando,
  error,
  metrica,
  onMetrica,
  orden,
  onOrden,
  onAbrir,
  contexto,
  abierto,
  onAbierto,
  tiendaSeleccionada,
  onReintentar,
}: {
  datos: import('../api').ComparacionTiendaCategoriaRespuesta | null;
  cargando: boolean;
  error: string | null;
  metrica: MetricaAB;
  onMetrica: (metrica: MetricaAB) => void;
  orden: OrdenAB;
  onOrden: (orden: OrdenAB) => void;
  onAbrir: (fila: FilaComparacionTiendaCategoria) => void;
  contexto: string;
  /** Estado de plegado; vive en la aplicación para conservarse al navegar. */
  abierto: boolean;
  onAbierto: (abierto: boolean) => void;
  /** Tienda elegida en el territorio: se abre por omisión al agrupar por tienda. */
  tiendaSeleccionada?: string | null;
  onReintentar?: () => void;
}) {
  const [atenuado, setAtenuado] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(() => new Set());
  const [detalle, setDetalle] = useState<string | null>(null);
  const inicializado = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducido) return;
    setAtenuado(true);
    const temporizador = window.setTimeout(() => setAtenuado(false), 150);
    return () => window.clearTimeout(temporizador);
  }, [orden, metrica]);

  const filas = datos?.filas ?? [];

  /** Valor de la métrica activa; `null` si no es calculable. */
  const valor = (fila: FilaComparacionTiendaCategoria, lado: 'a' | 'b') =>
    fila.metricas[metrica]?.[lado] ?? null;

  const visibles = useMemo(() => {
    const copia = [...filas];
    const calculable = (fila: FilaComparacionTiendaCategoria) => {
      const m = fila.metricas[metrica];
      return m && m.a !== null && m.b !== null;
    };
    const alFinal = (a: FilaComparacionTiendaCategoria, b: FilaComparacionTiendaCategoria) =>
      Number(!calculable(a)) - Number(!calculable(b)) || a.clave.localeCompare(b.clave);
    if (orden === 'volumen_b') {
      copia.sort((a, b) => (valor(b, 'b') ?? -1) - (valor(a, 'b') ?? -1) || alFinal(a, b));
    } else if (orden === 'aumento') {
      copia.sort(
        (a, b) =>
          (b.metricas[metrica]?.variacion_pct ?? Number.NEGATIVE_INFINITY) -
            (a.metricas[metrica]?.variacion_pct ?? Number.NEGATIVE_INFINITY) || alFinal(a, b),
      );
    } else if (orden === 'disminucion') {
      copia.sort(
        (a, b) =>
          (a.metricas[metrica]?.variacion_pct ?? Number.POSITIVE_INFINITY) -
            (b.metricas[metrica]?.variacion_pct ?? Number.POSITIVE_INFINITY) || alFinal(a, b),
      );
    } else {
      copia.sort(
        (a, b) =>
          a.store_id.localeCompare(b.store_id) ||
          a.cat_id.localeCompare(b.cat_id) ||
          a.clave.localeCompare(b.clave),
      );
    }
    return copia;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, metrica, orden]);

  /* La escala usa TODAS las filas del contexto, no solo las tiendas expandidas. */
  const maximo = useMemo(() => {
    const valores = visibles.flatMap((fila) => [valor(fila, 'a'), valor(fila, 'b')]);
    return Math.max(1, ...valores.map((v) => v ?? 0));
  }, [visibles, metrica]);

  const marcas = useMemo(() => {
    const escala = (valor: number) => (valor / maximo) * 100;
    const crudo = [0, 0.25, 0.5, 0.75, 1].map((parte) => maximo * parte);
    return crudo.map((valor) => ({ valor, posicion: escala(valor) }));
  }, [maximo]);

  const grupos = useMemo(() => {
    if (orden !== 'tienda') return null;
    const mapa = new Map<string, FilaComparacionTiendaCategoria[]>();
    for (const fila of visibles) {
      mapa.set(fila.store_id, [...(mapa.get(fila.store_id) ?? []), fila]);
    }
    return [...mapa.entries()];
  }, [orden, visibles]);

  /* Al entrar en «Por tienda» se abre la tienda elegida en el territorio (una sola vez),
     sin perder las expansiones que el usuario ya hubiera hecho. */
  useEffect(() => {
    if (orden !== 'tienda' || inicializado.current || !filas.length) return;
    inicializado.current = true;
    const tienda = tiendaSeleccionada ?? filas[0]?.store_id ?? null;
    if (tienda) setExpandidas(new Set([tienda]));
  }, [orden, filas, tiendaSeleccionada]);

  const alternarTienda = (tienda: string) =>
    setExpandidas((previas) => {
      const siguiente = new Set(previas);
      if (siguiente.has(tienda)) siguiente.delete(tienda);
      else siguiente.add(tienda);
      return siguiente;
    });

  const expandirTodas = () => setExpandidas(new Set((grupos ?? []).map(([tienda]) => tienda)));
  const contraerTodas = () => setExpandidas(new Set());

  const etiquetaFila = (fila: FilaComparacionTiendaCategoria) =>
    orden === 'tienda'
      ? ETIQUETA_CATEGORIA[fila.cat_id] ?? fila.cat_id
      : `${fila.store_id} · ${ETIQUETA_CATEGORIA[fila.cat_id] ?? fila.cat_id}`;

  const resumen = useMemo(() => resumenComparacion(visibles, metrica), [visibles, metrica]);

  const filaRender = (fila: FilaComparacionTiendaCategoria) => {
    const metricas = fila.metricas[metrica];
    const a = valor(fila, 'a');
    const b = valor(fila, 'b');
    const iguales = a !== null && b !== null && Math.abs(a - b) < 1e-9;
    const posicionA = a === null ? null : (a / maximo) * 100;
    const posicionB = b === null ? null : (b / maximo) * 100;
    const variacion = metricas?.variacion_pct;
    const motivo = metricas?.motivo ?? 'no calculable porque A = 0';
    const detalleAbierto = detalle === fila.clave;
    const categoria = ETIQUETA_CATEGORIA[fila.cat_id] ?? fila.cat_id;

    const detalleTexto =
      `${fila.store_id} · ${categoria}. ` +
      `Periodo A: ${metrica === 'total' ? numero(a) : numero1(a)} unidades, cobertura ${fila.cobertura}. ` +
      `Periodo B: ${metrica === 'total' ? numero(b) : numero1(b)} unidades. ` +
      `Diferencia: ${numero1(metricas?.diferencia ?? null)}. ` +
      `Variación: ${variacion === null || variacion === undefined ? motivo : `${numero1(variacion)} %`}.`;

    return (
      <li key={fila.clave} className="ac-ab2-fila-caja">
        <div className="ac-ab2-fila-caja-interior">
          <button
            type="button"
            className="ac-ab2-fila"
            onClick={() => onAbrir(fila)}
            aria-label={`Abrir los departamentos de ${fila.store_id} en ${categoria}. ${detalleTexto}`}
            data-clave={fila.clave}
          >
            <span className="ac-ab2-etiqueta">
              <span className="ac-ab2-nombre">{etiquetaFila(fila)}</span>
              {fila.cobertura !== 'completa' ? (
                <span className="ac-ab2-cobertura">
                  {fila.cobertura === 'sin_datos' ? 'sin datos' : 'parcial'}
                </span>
              ) : null}
            </span>

            <span className="ac-ab2-pista" aria-hidden="true">
              {marcas.map((marca) => (
                <span
                  key={`g-${marca.valor}`}
                  className="ac-ab2-guia"
                  style={{ left: `${marca.posicion}%` }}
                />
              ))}
              {posicionA !== null && posicionB !== null && !iguales ? (
                <span
                  className="ac-ab2-conector"
                  style={{
                    left: `${Math.min(posicionA, posicionB)}%`,
                    width: `${Math.abs(posicionB - posicionA)}%`,
                  }}
                />
              ) : null}
              {posicionA !== null ? (
                <span className="ac-ab2-punto ac-ab2-punto--a" style={{ left: `${posicionA}%` }} />
              ) : null}
              {posicionB !== null ? (
                <span className="ac-ab2-punto ac-ab2-punto--b" style={{ left: `${posicionB}%` }} />
              ) : null}
              {iguales && posicionA !== null ? (
                <span
                  className="ac-ab2-punto ac-ab2-punto--igual"
                  style={{ left: `${posicionA}%` }}
                />
              ) : null}
            </span>

            <span className="ac-ab2-cifra">{metrica === 'total' ? numero(a) : numero1(a)}</span>
            <span className="ac-ab2-cifra">{metrica === 'total' ? numero(b) : numero1(b)}</span>
            <span className="ac-ab2-cifra">{numero1(metricas?.diferencia ?? null)}</span>
            <span className="ac-ab2-cifra ac-ab2-cifra--var">
              {variacion === null || variacion === undefined ? (
                <span className="ac-ab2-nc">
                  {metricas?.motivo === 'cero en ambos periodos' ? '0 en ambos' : 'n/c'}
                </span>
              ) : (
                `${numero1(variacion)} %`
              )}
            </span>
          </button>

          {/* Detalle compacto: se abre con hover, foco o toque en su propio botón; no
              atraviesa la tabla ni bloquea la navegación de la fila. */}
          <button
            type="button"
            className="ac-ab2-info"
            aria-expanded={detalleAbierto}
            aria-controls={`ac-ab2-detalle-${fila.clave}`}
            aria-label={`Detalle de ${fila.store_id} · ${categoria}`}
            data-clave={fila.clave}
            onMouseEnter={() => setDetalle(fila.clave)}
            onFocus={() => setDetalle(fila.clave)}
            onClick={() => setDetalle((previo) => (previo === fila.clave ? null : fila.clave))}
          >
            ⓘ
          </button>
        </div>

        {detalleAbierto ? (
          <div
            className="ac-ab2-detalle"
            id={`ac-ab2-detalle-${fila.clave}`}
            role="tooltip"
            data-testid="ab-detalle"
          >
            <p className="ac-ab2-detalle-cab">
              <strong>{fila.store_id}</strong> · {categoria}
            </p>
            <dl>
              <div>
                <dt>Periodo A</dt>
                <dd>
                  {metrica === 'total' ? numero(a) : numero1(a)} · cobertura {fila.cobertura} (
                  {numero(fila.dias_validos_a ?? null)}/{numero(fila.dias_esperados_a ?? null)} días)
                </dd>
              </div>
              <div>
                <dt>Periodo B</dt>
                <dd>
                  {metrica === 'total' ? numero(b) : numero1(b)} ·{' '}
                  {numero(fila.dias_validos_b ?? null)}/{numero(fila.dias_esperados_b ?? null)} días
                </dd>
              </div>
              <div>
                <dt>Diferencia (B − A)</dt>
                <dd>{numero1(metricas?.diferencia ?? null)}</dd>
              </div>
              <div>
                <dt>Variación</dt>
                <dd>
                  {variacion === null || variacion === undefined ? motivo : `${numero1(variacion)} %`}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </li>
    );
  };

  const idCuerpo = 'ac-ab-cuerpo';
  const periodos = datos
    ? `A: ${fechaCorta(datos.a.desde)} – ${fechaCorta(datos.a.hasta)} (${
        diasEntre(datos.a.desde, datos.a.hasta) ?? datos.a.dias
      } días) · B: ${fechaCorta(datos.b.desde)} – ${fechaCorta(datos.b.hasta)} (${
        diasEntre(datos.b.desde, datos.b.hasta) ?? datos.b.dias
      } días)`
    : cargando
      ? 'cargando periodos…'
      : 'sin periodos definidos';

  return (
    <section className="ac-panel" aria-labelledby="ac-t-comparacion" data-testid="comparacion-ab">
      <header className="ac-panel-cab ac-ab2-cab ac-abp-cab">
        <div className="ac-abp-texto">
          <h3 id="ac-t-comparacion">Comparación entre periodos por tienda y categoría</h3>
          <p className="ac-panel-sub" data-testid="ab-periodos">
            {periodos}
          </p>
          <p className="ac-panel-sub">
            {contexto} ·{' '}
            {datos
              ? `${datos.conteos.tiendas} tiendas · ${datos.resumen_filas.combinaciones} combinaciones`
              : 'contexto efectivo'}{' '}
            · métrica <strong>{METRICAS.find((m) => m.valor === metrica)?.texto}</strong>
          </p>
          {datos ? (
            <p className="ac-abp-resumen" data-testid="ab-resumen">
              {numero(resumen.aumentos)} aumentos · {numero(resumen.disminuciones)} disminuciones ·{' '}
              {numero(resumen.empates)} empates ·{' '}
              {resumen.noCalculables === 0
                ? 'sin casos no calculables'
                : `${numero(resumen.noCalculables)} no calculables`}{' '}
              <span className="ac-abp-resumen-total">
                (sobre {numero(resumen.total)} combinaciones)
              </span>
            </p>
          ) : null}
        </div>
        <div className="ac-abp-acciones">
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            aria-expanded={abierto}
            aria-controls={idCuerpo}
            data-testid="ab-boton"
            onClick={() => onAbierto(!abierto)}
          >
            {abierto ? 'Ocultar comparación' : 'Mostrar comparación'}
          </button>
          {abierto ? (
            <div className="ac-ab2-controles">
              <Segmentado<MetricaAB>
                etiqueta="Métrica de la comparación"
                valor={metrica}
                onElegir={onMetrica}
                testid="selector-metrica-ab"
                opciones={METRICAS}
              />
              <Segmentado<OrdenAB>
                etiqueta="Orden de las filas"
                valor={orden}
                onElegir={onOrden}
                testid="selector-orden-ab"
                opciones={ORDENES}
              />
            </div>
          ) : null}
        </div>
      </header>

      <div id={idCuerpo} hidden={!abierto}>
        {error ? (
          <div className="ac-hx-aviso" role="alert">
            <p>{error}</p>
            {onReintentar ? (
              <button type="button" className="ac-accion ac-accion--secundaria" onClick={onReintentar}>
                Reintentar
              </button>
            ) : null}
          </div>
        ) : null}

        {!error && (cargando || !datos) ? (
          <p className="ac-vacio" role="status" aria-busy="true">
            Calculando la comparación por tienda y categoría…
          </p>
        ) : null}

        {!error && datos ? (
          <>
            <div className="ac-ab2-fila-herramientas">
              <ul className="ac-ab2-leyenda">
                <li>
                  <span className="ac-ab2-muestra ac-ab2-muestra--a" /> Periodo A
                </li>
                <li>
                  <span className="ac-ab2-muestra ac-ab2-muestra--b" /> Periodo B
                </li>
                <li>
                  <span className="ac-ab2-muestra ac-ab2-muestra--conector" /> Distancia entre ambos
                </li>
              </ul>
              {orden === 'tienda' && grupos ? (
                <div className="ac-ab2-grupo-acciones">
                  <button
                    type="button"
                    className="ac-accion ac-accion--secundaria"
                    onClick={expandirTodas}
                  >
                    Expandir todas
                  </button>
                  <button
                    type="button"
                    className="ac-accion ac-accion--secundaria"
                    onClick={contraerTodas}
                  >
                    Contraer todas
                  </button>
                </div>
              ) : (
                <p className="ac-ab2-plana">
                  Lista plana con ambas identificaciones: agrupar por tienda destruiría este orden.
                </p>
              )}
            </div>

            <div className="ac-ab2-marco">
              <div className="ac-ab2-eje" aria-hidden="true">
                <span />
                <span className="ac-ab2-eje-pista">
                  {marcas.map((marca, indice) => (
                    <span
                      key={`e-${marca.valor}`}
                      className={`ac-ab2-eje-marca${indice === 0 ? ' is-inicio' : ''}${
                        indice === marcas.length - 1 ? ' is-fin' : ''
                      }`}
                      style={{ left: `${marca.posicion}%` }}
                      data-testid="ab-marca-eje"
                    >
                      {metrica === 'total'
                        ? marcaEje(marca.valor)
                        : marca.valor.toLocaleString('es-MX', { maximumFractionDigits: 1 })}
                    </span>
                  ))}
                </span>
                <span className="ac-ab2-eje-unidad">
                  {metrica === 'total' ? 'unidades vendidas' : 'unidades por día observado'}
                </span>
              </div>

              <div className="ac-ab2-encabezado" aria-hidden="true">
                <span>Tienda · categoría</span>
                <span />
                <span className="ac-ab2-num">A</span>
                <span className="ac-ab2-num">B</span>
                <span className="ac-ab2-num">Diferencia</span>
                <span className="ac-ab2-num">Variación %</span>
              </div>

              <ul className={`ac-ab2-lista${atenuado ? ' is-atenuada' : ''}`}>
                {orden === 'tienda' && grupos
                  ? grupos.map(([tienda, lista]) => {
                      const abierta = expandidas.has(tienda);
                      const estado = filas.find((fila) => fila.store_id === tienda)?.state_id ?? '';
                      return (
                        <li key={`grupo-${tienda}`} className="ac-ab2-grupo">
                          <button
                            type="button"
                            className="ac-ab2-grupo-cab"
                            aria-expanded={abierta}
                            aria-controls={`ac-ab2-grupo-${tienda}`}
                            onClick={() => alternarTienda(tienda)}
                            data-testid={`ab-grupo-${tienda}`}
                          >
                            <span className="ac-ab2-grupo-flecha" aria-hidden="true">
                              {abierta ? '▾' : '▸'}
                            </span>
                            <span className="ac-ab2-grupo-nombre">{tienda}</span>
                            <span className="ac-ab2-grupo-estado">{estado}</span>
                            <span className="ac-ab2-grupo-cuenta">
                              {numero(lista.length)} {lista.length === 1 ? 'categoría' : 'categorías'}
                            </span>
                          </button>
                          <ul
                            className="ac-ab2-grupo-lista"
                            id={`ac-ab2-grupo-${tienda}`}
                            hidden={!abierta}
                          >
                            {lista.map(filaRender)}
                          </ul>
                        </li>
                      );
                    })
                  : visibles.map(filaRender)}
              </ul>
            </div>

            <p className="ac-nota">
              {datos.regla_promedio} La diferencia es B − A y la variación es relativa a A; si A es
              cero, la variación no es calculable y se indica el motivo. Cifras de unidades
              vendidas, no de ingresos. La escala del eje considera todas las filas del contexto:
              expandir una tienda no cambia el tamaño relativo de las demás.
            </p>

            <p className="ac-nota">
              Reconciliación: la suma de las filas da{' '}
              <strong>{numero(datos.reconciliacion.filas_a)}</strong> en A y{' '}
              <strong>{numero(datos.reconciliacion.filas_b)}</strong> en B; el total del contexto es{' '}
              <strong>{numero(datos.reconciliacion.contexto_a)}</strong> y{' '}
              <strong>{numero(datos.reconciliacion.contexto_b)}</strong>{' '}
              {datos.reconciliacion.cuadra_a && datos.reconciliacion.cuadra_b
                ? '(cuadra)'
                : '(no cuadra: se declara la diferencia, no se ajusta)'}
              . {numero(datos.conteos.articulos_unicos)} artículos únicos y{' '}
              {numero(datos.conteos.series_articulo_tienda)} series artículo × tienda en el contexto.
            </p>

            <p className="ac-nota">
              Selecciona una fila para abrir los departamentos de esa categoría en esa tienda. El
              botón ⓘ abre el detalle de la fila sin navegar; expandir una tienda tampoco navega.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}

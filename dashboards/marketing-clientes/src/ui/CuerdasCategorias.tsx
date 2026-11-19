/**
 * «Categorías que se compran juntas»: diagrama de cuerdas.
 *
 * Unidad de cada conexión: **compras distintas que contienen ambas categorías**.
 * Se parte de la compra deduplicada, se obtiene el conjunto de categorías de cada
 * compra y se cuentan los pares no ordenados una sola vez por compra. Una compra
 * con tres categorías aporta tres pares: la suma de conexiones **no** es una
 * partición de las compras.
 *
 * Los dos porcentajes condicionales (de A hacia B y de B hacia A) pueden diferir:
 * se muestran por separado y nunca como tasa simétrica.
 */

import { useMemo, useState } from 'react';
import { chord, ribbon } from 'd3-chord';
import { arc } from 'd3-shape';

import type { AfinidadCategorias, ParCategorias } from '../api/tipos';
import { numero, porcentaje } from '../dominio';
import { PALETA } from '../paleta';

export interface PropsCuerdas {
  datos: AfinidadCategorias | null;
  vacio: boolean;
  cargando: boolean;
}

const LADO = 460;
const RADIO = 150;
const COLORES = [PALETA.primary, PALETA.teal, PALETA.violeta, '#B4712A', '#3E7A46', '#8A4F7D', '#52607A', '#7C5A3C'];

/**
 * Cuerpo del diagrama de cuerdas, sin panel ni cabecera: se embebe en el bloque
 * «Productos y compra», que es el único que decide qué vista se muestra.
 */
export function GraficoCuerdas({ datos, vacio, cargando }: PropsCuerdas) {
  const [activa, setActiva] = useState<string | null>(null);
  const [comparada, setComparada] = useState<string | null>(null);
  const [parActivo, setParActivo] = useState<ParCategorias | null>(null);

  const modelo = useMemo(() => {
    const categorias = (datos?.categorias ?? []).filter((fila) => fila.incluida);
    if (categorias.length === 0 || (datos?.pares ?? []).length === 0) return null;
    const indice = new Map(categorias.map((fila, posicion) => [fila.categoria, posicion]));
    const matriz = Array.from({ length: categorias.length }, () => new Array(categorias.length).fill(0));
    for (const par of datos?.pares ?? []) {
      const a = indice.get(par.a);
      const b = indice.get(par.b);
      if (a === undefined || b === undefined) continue;
      matriz[a]![b] = par.compras_conjuntas;
      matriz[b]![a] = par.compras_conjuntas;
    }
    const generador = chord().padAngle(0.05).sortSubgroups((a, b) => b - a);
    const cuerdas = generador(matriz) as unknown as Array<{
      source: { index: number; startAngle: number; endAngle: number; value: number };
      target: { index: number; startAngle: number; endAngle: number; value: number };
    }>;
    // Los ángulos de cada grupo se derivan de sus propias cuerdas: así coinciden
    // con la geometría que produce d3 y no dependen de propiedades internas.
    const grupos = categorias.map((_, indice) => {
      let startAngle = Number.POSITIVE_INFINITY;
      let endAngle = Number.NEGATIVE_INFINITY;
      for (const enlace of cuerdas) {
        if (enlace.source.index === indice) {
          startAngle = Math.min(startAngle, enlace.source.startAngle);
          endAngle = Math.max(endAngle, enlace.source.endAngle);
        }
        if (enlace.target.index === indice) {
          startAngle = Math.min(startAngle, enlace.target.startAngle);
          endAngle = Math.max(endAngle, enlace.target.endAngle);
        }
      }
      const value = matriz[indice]!.reduce((suma, valor) => suma + valor, 0);
      if (!Number.isFinite(startAngle) || endAngle <= startAngle) {
        return { index: indice, startAngle: 0, endAngle: 0, value, visible: false };
      }
      return { index: indice, startAngle, endAngle, value, visible: true };
    });
    const generadorArco = arc<{ startAngle: number; endAngle: number; value: number }>()
      .innerRadius(RADIO - 26)
      .outerRadius(RADIO);
    const generadorCuerda = (enlace: unknown): string => {
      const generadorCinta = (
        ribbon() as unknown as { radius: (valor: number) => (enlace: unknown) => string | null }
      ).radius(RADIO - 26);
      return generadorCinta(enlace) ?? '';
    };
    return { categorias, matriz, cuerdas, grupos, generadorArco, generadorCuerda, indice };
  }, [datos]);

  const color = (categoria: string) => {
    const posicion = (datos?.categorias ?? []).filter((f) => f.incluida).findIndex((f) => f.categoria === categoria);
    if (categoria === 'Sin información') return PALETA.gris;
    return COLORES[Math.max(0, posicion) % COLORES.length]!;
  };

  const parEntre = (a: string, b: string): ParCategorias | null =>
    (datos?.pares ?? []).find(
      (par) => (par.a === a && par.b === b) || (par.a === b && par.b === a),
    ) ?? null;

  const alSeleccionar = (categoria: string) => {
    if (activa === categoria) {
      setActiva(null);
      setComparada(null);
      setParActivo(null);
      return;
    }
    if (activa && comparada === null) {
      if (categoria === activa) return;
      setComparada(categoria);
      setParActivo(parEntre(activa, categoria));
      return;
    }
    setActiva(categoria);
    setComparada(null);
    setParActivo(null);
  };

  const cuerdasResaltadas = new Set<string>();
  if (activa && modelo) {
    for (const enlace of modelo.cuerdas) {
      const origen = enlace.source.index;
      const destino = enlace.target.index;
      const nombres = [
        modelo.categorias[origen]?.categoria ?? 'Sin información',
        modelo.categorias[destino]?.categoria ?? 'Sin información',
      ];
      if (nombres.includes(activa)) {
        cuerdasResaltadas.add(`${Math.min(origen, destino)}-${Math.max(origen, destino)}`);
      }
    }
  }

  return (
    <div className="mk-cuerdas" data-testid="panel-cuerdas">
      <p className="mk-nota-inline mk-cuerdas-cobertura">
        {numero(datos?.cobertura.compras_analizadas ?? null)} compras ·{' '}
        {numero(datos?.cobertura.pares_representados ?? null)} pares representados de{' '}
        {numero(datos?.cobertura.pares_posibles ?? null)} posibles
      </p>
      {datos?.alcance ? (
        <div className="mk-alcance" data-testid="cuerdas-alcance">
          <p className="mk-alcance-linea">
            <span className="mk-etiqueta-sin-filtros">No depende de los filtros</span>
            <span>
              {datos.alcance.periodo
                ? `Periodo completo publicado: ${datos.alcance.periodo.desde ?? '—'} – ${
                    datos.alcance.periodo.hasta ?? '—'
                  }`
                : 'Periodo completo publicado'}
              {datos.alcance.periodo ? ' · ' : ''}
              {numero(datos.cobertura.categorias_distintas)} categorías con compras ·{' '}
              {numero(datos.cobertura.pares_posibles)} pares posibles
            </span>
          </p>
          <p className="mk-nota mk-tenue">{datos.alcance.descripcion}</p>
        </div>
      ) : null}

      {!modelo ? (
        <p className="mk-vacio">
          {vacio
            ? 'Sin datos publicados: el diagrama aparecerá cuando exista una versión cargada.'
            : 'Las compras de estos filtros no contienen artículos de dos o más categorías: no hay relaciones que mostrar.'}
        </p>
      ) : (
        <div className="mk-cuerdas-caja">
          <svg
            width="100%"
            height={LADO}
            viewBox={`${-LADO / 2} ${-LADO / 2} ${LADO} ${LADO}`}
            role="img"
            aria-label={`Diagrama de cuerdas de ${modelo.categorias.length} categorías con ${datos!.pares.length} relaciones de compra conjunta.`}
          >
            <g>
              {modelo.grupos.filter((grupo) => grupo.visible).map((grupo) => {
                const origen = grupo.index;
                return (
                <g key={`arco-${origen}`}>
                  <path
                    d={
                      modelo.generadorArco({
                        startAngle: grupo.startAngle,
                        endAngle: grupo.endAngle,
                        value: grupo.value,
                      }) ?? ''
                    }
                    fill={color((modelo.categorias[origen]?.categoria ?? 'Sin información'))}
                    fillOpacity={activa && (modelo.categorias[origen]?.categoria ?? 'Sin información') !== activa ? 0.35 : 0.95}
                    stroke="#FFFFFF"
                    strokeWidth={0.6}
                    role="button"
                    tabIndex={0}
                    aria-label={`${(modelo.categorias[origen]?.categoria ?? 'Sin información')}: ${numero(
                      (modelo.categorias[origen]?.compras ?? 0),
                    )} compras únicas. Activar para ver sus relaciones.`}
                    onClick={() => alSeleccionar((modelo.categorias[origen]?.categoria ?? 'Sin información'))}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter' || evento.key === ' ') {
                        evento.preventDefault();
                        alSeleccionar((modelo.categorias[origen]?.categoria ?? 'Sin información'));
                      }
                    }}
                  />
                  <text
                    transform={`translate(${Math.cos((grupo.startAngle + grupo.endAngle) / 2 - Math.PI / 2) * (RADIO + 16)},${Math.sin((grupo.startAngle + grupo.endAngle) / 2 - Math.PI / 2) * (RADIO + 16)})`}
                    textAnchor={Math.cos((grupo.startAngle + grupo.endAngle) / 2 - Math.PI / 2) > 0.1 ? 'start' : Math.cos((grupo.startAngle + grupo.endAngle) / 2 - Math.PI / 2) < -0.1 ? 'end' : 'middle'}
                    dominantBaseline="middle"
                    fill={PALETA.text}
                    fontSize={10.5}
                    className="mk-cuerdas-etiqueta"
                  >
                    {nombreCorto((modelo.categorias[origen]?.categoria ?? 'Sin información'))}
                    <tspan fill={PALETA.textSecondary}> · {numero((modelo.categorias[origen]?.compras ?? 0))}</tspan>
                  </text>
                </g>
                );
              })}

              {modelo.cuerdas.map((enlace, posicion) => {
                  const origen = enlace.source.index;
                  const destino = enlace.target.index;
                  const clave = `${Math.min(origen, destino)}-${Math.max(origen, destino)}`;
                  if (origen >= destino) return null;
                  const par = parEntre((modelo.categorias[origen]?.categoria ?? 'Sin información'), (modelo.categorias[destino]?.categoria ?? 'Sin información'));
                  const resaltada = cuerdasResaltadas.has(clave);
                  return (
                    <path
                      key={`cuerda-${clave}-${posicion}`}
                      d={modelo.generadorCuerda(enlace)}
                      fill={color((modelo.categorias[origen]?.categoria ?? 'Sin información'))}
                      fillOpacity={
                        activa ? (resaltada ? 0.62 : 0.08) : parActivo && parActivo === par ? 0.7 : 0.34
                      }
                      stroke="none"
                      style={{ transition: 'fill-opacity 150ms ease' }}
                      onMouseEnter={() => par && setParActivo(par)}
                      onMouseLeave={() => setParActivo(null)}
                    >
                      <title>
                        {par
                          ? `${par.a} + ${par.b}: ${numero(par.compras_conjuntas)} compras conjuntas · ${par.a}→${par.b} ${porcentaje(
                              par.pct_de_a,
                            )} · ${par.b}→${par.a} ${porcentaje(par.pct_de_b)}`
                          : ''}
                      </title>
                    </path>
                  );
                })}
            </g>
          </svg>

          <div className="mk-cuerdas-ayuda">
            <p className="mk-nota">
              Cada arco es una categoría; el grosor del arco mide sus compras únicas y la banda
              entre dos categorías, las compras que contienen a ambas. Con {numero(datos?.cobertura.compras_con_varias_categorias ?? null)}{' '}
              compras con varias categorías, la suma de bandas supera las compras porque una compra
              con tres categorías aporta tres pares.
            </p>
            {datos?.cobertura.categorias_excluidas ? (
              <p className="mk-nota mk-tenue">
                Se representan las {datos.cobertura.categorias_representadas} categorías con más
                compras; {datos.cobertura.categorias_excluidas} quedan fuera de la figura (siguen en
                la tabla) y solo se muestran relaciones con {datos.cobertura.minimo_compras_conjuntas}{' '}
                o más compras conjuntas.
              </p>
            ) : null}
          </div>
        </div>
      )}

      {parActivo || activa ? (
        <section className="mk-subpanel" aria-label="Detalle de la selección">
          <h4 className="mk-subtitulo">
            {parActivo ? `${parActivo.a} + ${parActivo.b}` : activa}
          </h4>
          {parActivo ? (
            <dl className="mk-cifras-fila">
              <div>
                <dt>Compras con ambas</dt>
                <dd>{numero(parActivo.compras_conjuntas)}</dd>
              </div>
              <div>
                <dt>De las de {parActivo.a}</dt>
                <dd>{porcentaje(parActivo.pct_de_a)}</dd>
              </div>
              <div>
                <dt>De las de {parActivo.b}</dt>
                <dd>{porcentaje(parActivo.pct_de_b)}</dd>
              </div>
              <div>
                <dt>Compras únicas de cada una</dt>
                <dd>
                  {numero(parActivo.compras_a)} / {numero(parActivo.compras_b)}
                </dd>
              </div>
            </dl>
          ) : (
            <ul className="mk-lista-barras">
              {(datos?.pares ?? [])
                .filter((par) => par.a === activa || par.b === activa)
                .slice(0, 6)
                .map((par) => {
                  const otra = par.a === activa ? par.b : par.a;
                  const pct = par.a === activa ? par.pct_de_a : par.pct_de_b;
                  return (
                    <li key={`${par.a}-${par.b}`}>
                      <button type="button" className="mk-enlace" onClick={() => setParActivo(par)}>
                        {otra}
                      </button>
                      <div className="mk-barra-fina" aria-hidden="true">
                        <div
                          style={{
                            width: `${Math.min(100, Math.round(((pct ?? 0) / 100) * 100))}%`,
                          }}
                        />
                      </div>
                      <strong>{porcentaje(pct)}</strong>
                    </li>
                  );
                })}
            </ul>
          )}
          <p className="mk-nota mk-tenue">
            Afinidad observada, no causalidad ni recomendación comercial validada. La selección no
            cambia los filtros globales del tablero.
          </p>
        </section>
      ) : null}

      <details className="mk-detalle">
        <summary>Ver tabla accesible de pares</summary>
        <div className="mk-tabla-caja">
          <table className="mk-tabla">
            <caption className="mk-sr">
              Pares de categorías con compras conjuntas y porcentajes condicionales en cada
              dirección.
            </caption>
            <thead>
              <tr>
                <th scope="col">Categoría A</th>
                <th scope="col">Categoría B</th>
                <th scope="col" className="mk-num">Compras con ambas</th>
                <th scope="col" className="mk-num">A → B</th>
                <th scope="col" className="mk-num">B → A</th>
              </tr>
            </thead>
            <tbody>
              {(datos?.pares ?? []).map((par) => (
                <tr key={`${par.a}-${par.b}`}>
                  <td>{par.a}</td>
                  <td>{par.b}</td>
                  <td className="mk-num">{numero(par.compras_conjuntas)}</td>
                  <td className="mk-num">{porcentaje(par.pct_de_a)}</td>
                  <td className="mk-num">{porcentaje(par.pct_de_b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {cargando ? <p className="mk-nota">Actualizando las relaciones…</p> : null}
    </div>
  );
}

function nombreCorto(texto: string): string {
  return texto.length > 20 ? `${texto.slice(0, 19)}…` : texto;
}

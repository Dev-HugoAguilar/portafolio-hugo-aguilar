/**
 * Vista de adquisición: ranking interactivo de canales.
 *
 * La unidad es el **usuario** y el canal es el de su primera actividad observada,
 * así que cada persona pertenece a un solo canal y las filas suman el total de
 * usuarios únicos (la conciliación se muestra explícita).
 *
 * El ranking combina dos lecturas alineadas con escalas independientes y
 * rotuladas: barras de usuarios y panel de puntos de conversión. El orden se puede
 * cambiar por volumen, conversión, compradores o ingresos; la base del segmento
 * está siempre visible porque una conversión del 100 % con 3 usuarios no es una
 * buena noticia.
 *
 * Al seleccionar un canal se abre un panel contextual con su evolución,
 * dispositivos, países e indicadores conciliados. La tabla completa se conserva
 * como alternativa accesible.
 */

import { scaleLinear } from 'd3-scale';
import { line, curveMonotoneX } from 'd3-shape';
import { useMemo, useState } from 'react';

import type { Adquisicion as Datos, FilaCanal, Productos } from '../api/tipos';
import { ProductosCompra } from './ProductosCompra';
import { dinero, numero, porcentaje, etiquetaFechaCorta } from '../dominio';
import { PALETA } from '../paleta';

export interface PropsAdquisicion {
  datos: Datos | null;
  productos?: Productos | null;
  vacio: boolean;
  onCanal: (canal: string) => void;
  seleccionados: string[];
  cargando: boolean;
}

type Orden = 'usuarios' | 'conversion' | 'compradores' | 'ingresos';

const ETIQUETA_ORDEN: Record<Orden, string> = {
  usuarios: 'Usuarios',
  conversion: 'Conversión',
  compradores: 'Compradores',
  ingresos: 'Ingresos',
};

function valorDe(fila: FilaCanal, orden: Orden): number {
  if (orden === 'conversion') return fila.conversion ?? 0;
  if (orden === 'compradores') return fila.compradores;
  if (orden === 'ingresos') return fila.ingresos_usd;
  return fila.usuarios;
}

export function Adquisicion({ datos, productos, vacio, onCanal, seleccionados, cargando }: PropsAdquisicion) {
  const [orden, setOrden] = useState<Orden>('usuarios');

  const canales = useMemo(() => {
    const filas = datos?.canales ?? [];
    return [...filas].sort((a, b) => valorDe(b, orden) - valorDe(a, orden));
  }, [datos, orden]);

  const maxUsuarios = Math.max(1, ...canales.map((fila) => fila.usuarios));
  const maxConversion = Math.max(0.001, ...canales.map((fila) => fila.conversion ?? 0));
  const escalaUsuarios = scaleLinear().domain([0, maxUsuarios]).range([0, 100]);
  const escalaConversion = scaleLinear().domain([0, maxConversion]).range([0, 100]);
  const activo = seleccionados.length === 1 ? canales.find((fila) => fila.canal === seleccionados[0]) : null;
  const totales = datos?.totales ?? null;

  return (
    <div className="mk-vista" data-testid="vista-adquisicion">
      <section className="mk-panel" aria-labelledby="mk-t-ranking" data-testid="panel-ranking">
        <div className="mk-panel-head">
          <div>
            <h3 id="mk-t-ranking">Ranking de canales</h3>
            <p className="mk-panel-sub">
              Usuarios (barra) y conversión a comprador (punto) con escalas independientes ·
              base de cada canal a la derecha · pulsa un canal para filtrar el tablero
            </p>
          </div>
          <div className="mk-panel-controls">
            <div className="mk-segmentado" role="group" aria-label="Orden del ranking">
              {(Object.keys(ETIQUETA_ORDEN) as Orden[]).map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  className={`mk-seg${orden === opcion ? ' is-activa' : ''}`}
                  onClick={() => setOrden(opcion)}
                  aria-pressed={orden === opcion}
                >
                  {ETIQUETA_ORDEN[opcion]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {canales.length === 0 ? (
          <p className="mk-vacio">
            {vacio
              ? 'Sin datos publicados: el ranking aparecerá cuando exista una versión cargada.'
              : 'No hay canales con usuarios para los filtros actuales.'}
          </p>
        ) : (
          <div className="mk-ranking" role="list">
            <div className="mk-ranking-ejes" aria-hidden="true">
              <span />
              <span className="mk-ranking-eje">Usuarios</span>
              <span className="mk-ranking-eje mk-ranking-eje--conv">Conversión</span>
              <span className="mk-ranking-eje mk-ranking-eje--base">Base</span>
            </div>
            {canales.map((fila) => {
              const elegido = seleccionados.includes(fila.canal);
              return (
                <div
                  key={fila.canal}
                  className={`mk-ranking-fila${elegido ? ' is-elegida' : ''}`}
                  role="listitem"
                >
                  <button
                    type="button"
                    className="mk-ranking-nombre"
                    onClick={() => onCanal(fila.canal)}
                    aria-pressed={elegido}
                    title={`Filtrar por ${fila.canal}`}
                  >
                    {fila.canal}
                    {fila.usuarios < 100 ? <span className="mk-base-reducida"> *</span> : null}
                  </button>

                  <div className="mk-ranking-barra" aria-hidden="true">
                    <div
                      className="mk-ranking-relleno"
                      style={{ width: `${escalaUsuarios(fila.usuarios)}%` }}
                    />
                    <span className="mk-ranking-cifra">{numero(fila.usuarios)}</span>
                  </div>

                  <div className="mk-ranking-puntos" aria-hidden="true">
                    <div
                      className="mk-ranking-punto"
                      style={{ left: `${escalaConversion(fila.conversion ?? 0)}%` }}
                    />
                    <span className="mk-ranking-conv">{porcentaje(fila.conversion)}</span>
                  </div>

                  <div className="mk-ranking-base">
                    <span>{numero(fila.compradores)} compradores</span>
                    <span>{numero(fila.compras)} compras</span>
                    <span>{dinero(fila.ingresos_usd)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mk-nota">
          * Base menor a 100 usuarios. Total del ranking: {numero(totales?.usuarios ?? null)} usuarios,
          {' '}{numero(totales?.usuarios_unicos ?? null)} usuarios únicos
          {totales && totales.usuarios === totales.usuarios_unicos
            ? ' (coinciden: cada usuario pertenece a un solo canal).'
            : ' (si no coinciden, la atribución de canal no es única).'}
        </p>
        {cargando ? <p className="mk-nota">Actualizando el ranking…</p> : null}
      </section>

      {activo && datos?.detalle ? (
        <section className="mk-panel" aria-labelledby="mk-t-panel-canal" data-testid="panel-canal">
          <div className="mk-panel-head">
            <div>
              <h3 id="mk-t-panel-canal">{activo.canal}</h3>
              <p className="mk-panel-sub">
                {numero(activo.usuarios)} usuarios · {numero(activo.compradores)} compradores ·{' '}
                {numero(activo.compras)} compras · {dinero(activo.ingresos_usd)} ·{' '}
                {porcentaje(activo.conversion)} de conversión
              </p>
            </div>
            <button type="button" className="mk-btn mk-btn--ghost" onClick={() => onCanal(activo.canal)}>
              Quitar filtro
            </button>
          </div>

          <div className="mk-doble">
            <div>
              <h4 className="mk-subtitulo">Evolución del canal</h4>
              <MiniSerie serie={datos.detalle.serie} />
            </div>
            <div>
              <h4 className="mk-subtitulo">Dispositivos</h4>
              <ul className="mk-lista-barras">
                {datos.detalle.dispositivos.map((fila) => (
                  <li key={fila.dispositivo}>
                    <span>{fila.dispositivo}</span>
                    <div className="mk-barra-fina" aria-hidden="true">
                      <div
                        style={{
                          width: `${Math.round(
                            (100 * fila.usuarios) /
                              Math.max(1, ...datos.detalle!.dispositivos.map((d) => d.usuarios)),
                          )}%`,
                        }}
                      />
                    </div>
                    <strong>{numero(fila.usuarios)}</strong>
                  </li>
                ))}
              </ul>
              <h4 className="mk-subtitulo">Países</h4>
              <ul className="mk-lista-barras">
                {datos.detalle.paises.map((fila) => (
                  <li key={fila.pais}>
                    <span>{fila.pais}</span>
                    <div className="mk-barra-fina" aria-hidden="true">
                      <div
                        style={{
                          width: `${Math.round(
                            (100 * fila.usuarios) /
                              Math.max(1, ...datos.detalle!.paises.map((d) => d.usuarios)),
                          )}%`,
                        }}
                      />
                    </div>
                    <strong>{numero(fila.usuarios)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <ProductosCompra
        productos={productos ?? null}
        categorias={datos?.categorias ?? null}
        vacio={vacio}
        cargando={cargando}
      />

      {activo && datos?.detalle ? (
        <section className="mk-panel" aria-labelledby="mk-t-panel-canal" data-testid="panel-canal">
          <div className="mk-panel-head">
            <div>
              <h3 id="mk-t-panel-canal">{activo.canal}</h3>
              <p className="mk-panel-sub">
                {numero(activo.usuarios)} usuarios · {numero(activo.compradores)} compradores ·{' '}
                {numero(activo.compras)} compras · {dinero(activo.ingresos_usd)} ·{' '}
                {porcentaje(activo.conversion)} de conversión
              </p>
            </div>
            <button type="button" className="mk-btn mk-btn--ghost" onClick={() => onCanal(activo.canal)}>
              Quitar filtro
            </button>
          </div>

          <div className="mk-doble">
            <div>
              <h4 className="mk-subtitulo">Evolución del canal</h4>
              <MiniSerie serie={datos.detalle.serie} />
            </div>
            <div>
              <h4 className="mk-subtitulo">Dispositivos</h4>
              <ul className="mk-lista-barras">
                {datos.detalle.dispositivos.map((fila) => (
                  <li key={fila.dispositivo}>
                    <span>{fila.dispositivo}</span>
                    <div className="mk-barra-fina" aria-hidden="true">
                      <div
                        style={{
                          width: `${Math.round(
                            (100 * fila.usuarios) /
                              Math.max(1, ...datos.detalle!.dispositivos.map((d) => d.usuarios)),
                          )}%`,
                        }}
                      />
                    </div>
                    <strong>{numero(fila.usuarios)}</strong>
                  </li>
                ))}
              </ul>
              <h4 className="mk-subtitulo">Países</h4>
              <ul className="mk-lista-barras">
                {datos.detalle.paises.map((fila) => (
                  <li key={fila.pais}>
                    <span>{fila.pais}</span>
                    <div className="mk-barra-fina" aria-hidden="true">
                      <div
                        style={{
                          width: `${Math.round(
                            (100 * fila.usuarios) /
                              Math.max(1, ...datos.detalle!.paises.map((d) => d.usuarios)),
                          )}%`,
                        }}
                      />
                    </div>
                    <strong>{numero(fila.usuarios)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

    </div>
  );
}

function MiniSerie({ serie }: { serie: { fecha: string; sesiones: number; eventos: number }[] }) {
  const datos = useMemo(() => [...serie].sort((a, b) => a.fecha.localeCompare(b.fecha)), [serie]);
  const ancho = 320;
  const alto = 96;
  const margen = { arriba: 8, derecha: 8, abajo: 16, izquierda: 30 };
  const maximo = Math.max(1, ...datos.map((fila) => fila.sesiones));
  const escalaX = scaleLinear()
    .domain([0, Math.max(1, datos.length - 1)])
    .range([margen.izquierda, ancho - margen.derecha]);
  const escalaY = scaleLinear().domain([0, maximo * 1.1]).range([alto - margen.abajo, margen.arriba]);
  const trazo = line<{ x: number; y: number }>()
    .x((punto) => punto.x)
    .y((punto) => punto.y)
    .curve(curveMonotoneX);
  const puntos = datos.map((fila, indice) => ({
    x: escalaX(indice),
    y: escalaY(fila.sesiones),
  }));

  if (datos.length === 0) return <p className="mk-vacio">Sin serie para este canal.</p>;

  return (
    <svg width={ancho} height={alto} role="img" aria-label={`Sesiones por día del canal: máximo ${maximo}.`}>
      <path d={trazo(puntos) ?? ''} fill="none" stroke={PALETA.teal} strokeWidth={1.6} />
      <text x={2} y={margen.arriba + 4} fill={PALETA.textSecondary} fontSize={9}>
        {numero(maximo)}
      </text>
      <text x={2} y={alto - 4} fill={PALETA.textSecondary} fontSize={9}>
        0
      </text>
      <text x={margen.izquierda} y={alto - 2} fill={PALETA.textSecondary} fontSize={9}>
        {etiquetaFechaCorta(datos[0]?.fecha)}
      </text>
      <text x={ancho - margen.derecha} y={alto - 2} textAnchor="end" fill={PALETA.textSecondary} fontSize={9}>
        {etiquetaFechaCorta(datos[datos.length - 1]?.fecha)}
      </text>
    </svg>
  );
}

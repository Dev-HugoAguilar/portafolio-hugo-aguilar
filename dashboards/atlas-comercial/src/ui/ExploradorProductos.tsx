/**
 * Exploración de productos del departamento seleccionado.
 *
 * - Buscador por identificador real de M5 y tabla paginada con unidades y
 *   **participación sobre el universo del departamento** (mismo contexto y periodo).
 * - Orden estable y explícito: unidades (desc, desempate por identificador) o
 *   identificador.
 * - Hasta cinco productos para la comparación de series. La propuesta automática se
 *   rotula «Top 5 por unidades» y muestra su participación conjunta.
 * - La suma de los cinco **no** es el total del departamento: el universo se muestra
 *   aparte y siempre visible.
 * - Alcance declarado: la selección afecta solo a la comparación de series de esta
 *   sección; el resto del tablero sigue mostrando el departamento completo.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { api, ErrorApi, type ProductosRespuesta } from '../api';

const PAGINA = 10;
const ESPERA_TECLEO_MS = 280;

const numero = (valor: number) => valor.toLocaleString('es-MX');
const numero1 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function ExploradorProductos({
  base,
  tiendas,
  estado,
  departamento,
  categorias,
  desde,
  hasta,
  seleccion,
  maximo,
  onSeleccion,
}: {
  base: string;
  tiendas: string[];
  estado: string | null;
  departamento: string;
  categorias: string[];
  desde: string;
  hasta: string;
  /** Selección explícita; vacía significa propuesta automática del servidor. */
  seleccion: string[];
  maximo: number;
  automatica: boolean;
  onSeleccion: (productos: string[] | null) => void;
}) {
  const idBase = useId();
  const [texto, setTexto] = useState('');
  const [textoAplicado, setTextoAplicado] = useState('');
  const [orden, setOrden] = useState<'unidades' | 'item_id'>('unidades');
  const [desplazamiento, setDesplazamiento] = useState(0);
  const [datos, setDatos] = useState<ProductosRespuesta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const turno = useRef(0);

  useEffect(() => {
    const temporizador = setTimeout(() => setTextoAplicado(texto.trim()), ESPERA_TECLEO_MS);
    return () => clearTimeout(temporizador);
  }, [texto]);

  useEffect(() => {
    setDesplazamiento(0);
  }, [departamento, textoAplicado, orden, tiendas.join(',')]);

  const cargar = useCallback(
    async (senal: AbortSignal) => {
      const actual = ++turno.current;
      setCargando(true);
      setError(null);
      try {
        const respuesta = await api.productos(
          base,
          {
            tiendas,
            estado,
            departamento,
            categorias,
            desde,
            hasta,
            texto: textoAplicado || undefined,
            orden,
            limite: PAGINA,
            desplazamiento,
          },
          senal,
        );
        if (actual !== turno.current || senal.aborted) return;
        setDatos(respuesta);
        setCargando(false);
      } catch (fallo) {
        if (senal.aborted || actual !== turno.current) return;
        setError(fallo instanceof ErrorApi ? fallo.message : 'No se pudo consultar el catálogo');
        setCargando(false);
      }
    },
    [base, tiendas, estado, departamento, categorias, desde, hasta, textoAplicado, orden, desplazamiento],
  );

  useEffect(() => {
    const control = new AbortController();
    void cargar(control.signal);
    return () => control.abort();
  }, [cargar]);

  /* La casilla refleja la selección **efectiva**: en modo automático, el Top 5. */
  const efectiva = useMemo(() => {
    if (seleccion.length > 0) return seleccion;
    return (datos?.seleccion_inicial ?? []).map((item) => item.item_id);
  }, [seleccion, datos]);

  const alternar = (itemId: string) => {
    if (efectiva.includes(itemId)) {
      onSeleccion(efectiva.filter((valor) => valor !== itemId));
      return;
    }
    if (efectiva.length >= maximo) return;
    onSeleccion([...efectiva, itemId]);
  };

  const universo = datos?.universo ?? { unidades: 0, productos: 0, productos_catalogo: 0 };
  const completo = efectiva.length >= maximo;
  const total = datos?.total ?? 0;
  const inicio = total === 0 ? 0 : desplazamiento + 1;
  const fin = Math.min(desplazamiento + (datos?.productos.length ?? 0), total);
  const seleccionUnidades = useMemo(
    () => seleccionEfectivaUnidades(datos, efectiva),
    [datos, efectiva],
  );

  return (
    <section className="ac-explorador ac-explorador--productos" aria-labelledby={`${idBase}-titulo`} data-testid="explorador-productos">
      <header className="ac-explorador-cab">
        <div>
          <h4 id={`${idBase}-titulo`}>Productos de {departamento}</h4>
          <p className="ac-explorador-sub">
            Universo del departamento en el contexto y periodo: <strong>{numero(universo.unidades)} u</strong> en{' '}
            {numero(universo.productos)} productos con ventas · catálogo {numero(universo.productos_catalogo)}
          </p>
          <p className="ac-explorador-sub ac-explorador-sub--alcance">
            La selección afecta <strong>solo a la comparación de series</strong> de esta sección; las demás
            vistas muestran el departamento completo.
          </p>
        </div>
        <div className="ac-explorador-acciones">
          <span className="ac-explorador-contador" role="status" aria-live="polite">
            {seleccion.length === 0
              ? `Top ${maximo} por unidades`
              : `${seleccion.length} de ${maximo} seleccionados`}
            {completo ? ' · límite alcanzado' : ''}
          </span>
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            onClick={() => onSeleccion(null)}
            disabled={seleccion.length === 0}
          >
            Volver al Top {maximo} por unidades
          </button>
        </div>
      </header>

      <div className="ac-explorador-filtros">
        <label className="ac-campo ac-campo--texto">
          <span className="ac-campo-etq">Buscar por identificador</span>
          <input
            type="search"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Por ejemplo FOODS_3_090"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="ac-buscador-orden" role="group" aria-label="Orden de los productos">
          {(
            [
              ['unidades', 'Más unidades'],
              ['item_id', 'Identificador'],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              className={`ac-buscador-orden-btn${orden === valor ? ' is-activo' : ''}`}
              aria-pressed={orden === valor}
              onClick={() => setOrden(valor)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="ac-buscador-aviso" role="alert">
          {error}{' '}
          <button type="button" className="ac-accion ac-accion--secundaria" onClick={() => void cargar(new AbortController().signal)}>
            Reintentar
          </button>
        </p>
      ) : null}

      <div className="ac-tabla-marco" aria-busy={cargando}>
        <table className="ac-tabla-productos">
          <caption>
            Productos del departamento ordenados por {orden === 'unidades' ? 'unidades (de mayor a menor)' : 'identificador'}.
            Participación calculada sobre {numero(universo.unidades)} u del departamento en el contexto.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="ac-tabla-sel">
                Comparar
              </th>
              <th scope="col">Identificador</th>
              <th scope="col" className="ac-tabla-num">
                Unidades del periodo
              </th>
              <th scope="col" className="ac-tabla-num">
                Participación
              </th>
            </tr>
          </thead>
          <tbody>
            {datos?.productos.map((producto) => {
              const marcado = efectiva.includes(producto.item_id);
              const bloqueado = !marcado && completo;
              return (
                <tr key={producto.item_id} className={marcado ? 'is-marcada' : undefined}>
                  <td className="ac-tabla-sel">
                    <label className="ac-tabla-check">
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={bloqueado}
                        onChange={() => alternar(producto.item_id)}
                        aria-label={`Comparar ${producto.item_id} en las series`}
                        aria-describedby={bloqueado ? `${idBase}-tope` : undefined}
                      />
                    </label>
                  </td>
                  <th scope="row" className="ac-tabla-id">
                    {producto.item_id}
                  </th>
                  <td className="ac-tabla-num">{numero(producto.unidades)}</td>
                  <td className="ac-tabla-num">
                    {producto.participacion_pct === null ? '—' : `${numero1(producto.participacion_pct)} %`}
                  </td>
                </tr>
              );
            })}
            {datos && datos.productos.length === 0 && !cargando ? (
              <tr>
                <td colSpan={4} className="ac-tabla-vacia">
                  {textoAplicado
                    ? `Ningún producto del departamento coincide con «${textoAplicado}».`
                    : 'El departamento no tiene productos en el catálogo.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="ac-buscador-pie">
        <span className="ac-buscador-rango">
          {total === 0 ? 'Sin productos' : `${inicio}–${fin} de ${numero(total)} coincidencias`}
          {seleccion.length > 0
            ? ` · selección: ${numero(seleccionUnidades)} u`
            : datos?.seleccion_inicial_participacion_pct !== null && datos
              ? ` · participación conjunta del Top ${maximo}: ${numero1(datos.seleccion_inicial_participacion_pct)} %`
              : ''}
        </span>
        <div className="ac-buscador-paginacion">
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            onClick={() => setDesplazamiento((previo) => Math.max(0, previo - PAGINA))}
            disabled={desplazamiento === 0 || cargando}
          >
            Anterior
          </button>
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            onClick={() => setDesplazamiento((previo) => previo + PAGINA)}
            disabled={!datos?.paginacion.hay_mas || cargando}
          >
            Siguiente
          </button>
        </div>
      </div>
      <p className="ac-buscador-tope" id={`${idBase}-tope`}>
        Máximo {maximo} productos para comparar series. La suma de la selección no es el total del
        departamento: ese total se muestra en el universo de arriba.
      </p>
    </section>
  );
}

/** Unidades de la selección vigente (explícita o del Top automático). */
function seleccionEfectivaUnidades(datos: ProductosRespuesta | null, seleccion: string[]): number {
  if (!datos) return 0;
  const porId = new Map(datos.productos.map((producto) => [producto.item_id, producto.unidades]));
  for (const item of datos.seleccion_inicial) porId.set(item.item_id, item.unidades);
  return seleccion.reduce((total, item) => total + (porId.get(item) ?? 0), 0);
}

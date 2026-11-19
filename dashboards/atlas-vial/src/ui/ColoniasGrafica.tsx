/**
 * «Hechos y personas afectadas por colonia» (pestaña Territorio).
 *
 * Tres series **independientes** por colonia —hechos registrados (azul),
 * personas lesionadas (ámbar) y personas fallecidas (rojo)—, calculadas sobre los
 * mismos hechos asignados a la colonia. No se apilan: hechos y personas son
 * unidades distintas.
 *
 * Presentación en **acordeón**: cada colonia ocupa una fila compacta con su
 * posición, nombre completo, alcaldía de referencia y las tres cifras; al abrirla
 * se añaden las barras. Varias colonias pueden quedar abiertas a la vez para
 * compararlas.
 *
 * Escalas: se calculan **siempre con todas las colonias visibles del ranking**,
 * abiertas o cerradas, de modo que abrir o cerrar no mueve ninguna barra.
 *
 * Fuente territorial: la **colonia declarada** en el archivo de hechos, agrupada
 * por `(alcaldía, colonia)` para no fusionar nombres repetidos en alcaldías
 * distintas; la identidad de cada fila es el `id` estable que entrega el servidor,
 * nunca su posición. El proyecto no incluye polígonos de colonia, así que esta
 * entrega no dibuja límites ni conecta la gráfica con el mapa: expandir no filtra,
 * no selecciona el mapa y no pide datos nuevos.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useId } from 'react';

import type { Colonias, FilaColonia } from '../api/tipos';
import { numero } from '../dominio';
import { IconoChevron } from './iconos';

type Metrica = 'hechos' | 'lesionadas' | 'fallecidas';

const SERIES: { clave: Metrica; etiqueta: string; corta: string; color: string }[] = [
  { clave: 'hechos', etiqueta: 'Hechos registrados', corta: 'Hechos', color: '#3458f5' },
  { clave: 'lesionadas', etiqueta: 'Personas lesionadas', corta: 'Lesionadas', color: '#a85b0a' },
  { clave: 'fallecidas', etiqueta: 'Personas fallecidas', corta: 'Fallecidas', color: '#b42318' },
];

function Segmentado<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambio,
}: {
  etiqueta: string;
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (valor: T) => void;
}) {
  return (
    <div className="at-col-segmentado" role="group" aria-label={etiqueta}>
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          className={`at-col-seg${valor === opcion.valor ? ' is-activa' : ''}`}
          aria-pressed={valor === opcion.valor}
          onClick={() => onCambio(opcion.valor)}
        >
          {opcion.texto}
        </button>
      ))}
    </div>
  );
}

interface PropsFila {
  colonia: FilaColonia;
  indice: number;
  abierta: boolean;
  modo: 'comun' | 'metrica';
  maximoComun: number;
  maximos: Record<Metrica, number>;
  onAlternar: (id: string) => void;
  registrarCabecera: (id: string, nodo: HTMLButtonElement | null) => void;
}

function Fila({
  colonia,
  indice,
  abierta,
  modo,
  maximoComun,
  maximos,
  onAlternar,
  registrarCabecera,
}: PropsFila) {
  const idDetalle = useId();
  const idCabecera = useId();
  const grupos = modo === 'comun' ? [SERIES] : SERIES.map((serie) => [serie]);

  return (
    <li className={`at-col-fila${abierta ? ' is-abierta' : ''}`} data-id={colonia.id}>
      <button
        type="button"
        id={idCabecera}
        ref={(nodo) => registrarCabecera(colonia.id, nodo)}
        className="at-col-expandir"
        aria-expanded={abierta}
        aria-controls={idDetalle}
        aria-label={`${abierta ? 'Contraer' : 'Expandir'} ${colonia.colonia}${
          colonia.alcaldia ? ` (${colonia.alcaldia})` : ''
        }`}
        onClick={() => onAlternar(colonia.id)}
      >
        <span className={`at-col-chevron${abierta ? ' is-abierta' : ''}`}>
          <IconoChevron tamano={13} />
        </span>
      </button>

      <span className="at-col-puesto" aria-hidden="true">
        {indice + 1}
      </span>

      <span className="at-col-texto">
        <span className="at-col-colonia">{colonia.colonia}</span>
        {colonia.alcaldia ? <span className="at-col-alcaldia">{colonia.alcaldia}</span> : null}
      </span>

      {SERIES.map((serie) => (
        <span className="at-col-cifra" key={serie.clave}>
          <span className="at-col-trazo" style={{ background: serie.color }} aria-hidden="true" />
          <span className="at-col-cifra-etq">{serie.corta}</span>
          <span className="at-col-cifra-valor">{numero(colonia[serie.clave])}</span>
          <span className="at-sr"> {serie.etiqueta}</span>
        </span>
      ))}

      <div
        className={`at-col-detalle-caja${abierta ? ' is-abierta' : ''}`}
        id={idDetalle}
        data-col-detalle={colonia.id}
        inert={!abierta ? true : undefined}
      >
        <div className="at-col-detalle-interior" tabIndex={-1}>
          <div className={`at-col-paneles${modo === 'metrica' ? ' is-por-metrica' : ''}`}>
            {grupos.map((grupo, indiceGrupo) => {
              const maximo = modo === 'comun' ? maximoComun : maximos[grupo[0]!.clave];
              return (
                <div className="at-col-detalle-grupo" key={indiceGrupo}>
                  {grupo.map((serie) => {
                    const valor = colonia[serie.clave];
                    const ancho = maximo > 0 ? (100 * valor) / maximo : 0;
                    return (
                      <div className="at-col-serie" key={serie.clave}>
                        <span className="at-col-serie-etq">
                          <span
                            className="at-col-trazo"
                            style={{ background: serie.color }}
                            aria-hidden="true"
                          />
                          {serie.corta}
                        </span>
                        <span className="at-col-pista">
                          <span
                            className="at-col-barra"
                            style={{ width: `${ancho}%`, background: serie.color }}
                          />
                        </span>
                        <span className="at-col-valor">{numero(valor)}</span>
                      </div>
                    );
                  })}
                  <p className="at-col-escala">0 – {numero(maximo)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </li>
  );
}

export function ColoniasGrafica({
  datos,
  cargando,
  error,
  cantidad,
  onCantidad,
  onReintentar,
}: {
  datos: Colonias | null;
  cargando: boolean;
  error: boolean;
  cantidad: 10 | 20;
  onCantidad: (cantidad: 10 | 20) => void;
  onReintentar: () => void;
}) {
  const [modo, setModo] = useState<'comun' | 'metrica'>('comun');
  /* Expansión por identidad estable: sobrevive a reordenar, cambiar de 10 a 20,
     cambiar filtros y actualizar cifras. Cerrada es el estado inicial. */
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
  const cabeceras = useRef(new Map<string, HTMLButtonElement | null>());
  /* Última colonia cuyo contenido recibió el foco: permite devolverlo a su
     encabezado cuando una acción global cierra ese contenido. */
  const ultimoFocoDetalle = useRef<string | null>(null);

  const registrarCabecera = useCallback((id: string, nodo: HTMLButtonElement | null) => {
    if (nodo) cabeceras.current.set(id, nodo);
    else cabeceras.current.delete(id);
  }, []);

  /* El ranking lo calcula y lo recorta el servidor: aquí no se reordena ni se
     rebanan colonias, para no presentar un top-10 ajeno como si fuera el de la
     métrica seleccionada. */
  const visibles = useMemo(() => datos?.colonias ?? [], [datos]);

  /* Escalas sobre **todas** las colonias visibles, nunca solo las abiertas. */
  const maximoComun = Math.max(
    1,
    ...visibles.flatMap((fila) => [fila.hechos, fila.lesionadas, fila.fallecidas]),
  );
  const maximos = {
    hechos: Math.max(1, ...visibles.map((fila) => fila.hechos)),
    lesionadas: Math.max(1, ...visibles.map((fila) => fila.lesionadas)),
    fallecidas: Math.max(1, ...visibles.map((fila) => fila.fallecidas)),
  } as Record<Metrica, number>;

  const todasAbiertas = visibles.length > 0 && visibles.every((fila) => abiertas.has(fila.id));

  const alternar = useCallback((id: string) => {
    setAbiertas((previas) => {
      const siguientes = new Set(previas);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  }, []);

  /* Afecta solo a las colonias visibles. Si el foco estaba dentro del contenido
     que se cierra, vuelve al encabezado de esa colonia. */
  const alternarTodas = () => {
    const idsVisibles = visibles.map((fila) => fila.id);
    if (todasAbiertas) {
      const enfocado = document.activeElement as HTMLElement | null;
      const contenedor = enfocado?.closest('[data-col-detalle]');
      const idFoco =
        contenedor?.getAttribute('data-col-detalle') ?? ultimoFocoDetalle.current ?? null;
      ultimoFocoDetalle.current = null;
      setAbiertas((previas) => {
        const siguientes = new Set(previas);
        for (const id of idsVisibles) siguientes.delete(id);
        return siguientes;
      });
      if (idFoco) {
        requestAnimationFrame(() => cabeceras.current.get(idFoco)?.focus());
      }
      return;
    }
    setAbiertas((previas) => new Set([...previas, ...idsVisibles]));
  };

  const limiteVisibles = Math.min(cantidad, visibles.length);
  const cobertura = datos?.cobertura;
  const sinColonia = cobertura?.sin_colonia ?? 0;

  return (
    <section
      className="at-colonias"
      aria-labelledby="at-colonias-titulo"
      data-testid="colonias-grafica"
    >
      <header className="at-col-cab">
        <div className="at-col-cab-texto">
          <h3 className="at-col-titulo" id="at-colonias-titulo">
            Hechos y personas afectadas por colonia
          </h3>
          <p className="at-col-subtitulo">
            Las {limiteVisibles} colonias con más hechos registrados · filtros vigentes · expande
            una colonia para ver sus barras
          </p>
        </div>
        <div className="at-col-controles">
          <Segmentado
            etiqueta="Escala"
            opciones={[
              { valor: 'comun', texto: 'Escala común' },
              { valor: 'metrica', texto: 'Por métrica' },
            ]}
            valor={modo}
            onCambio={(valor) => setModo(valor as 'comun' | 'metrica')}
          />
          <span className="at-col-etiqueta-control">Colonias</span>
          <Segmentado
            etiqueta="Colonias visibles"
            opciones={[
              { valor: '10', texto: '10 colonias' },
              { valor: '20', texto: '20 colonias' },
            ]}
            valor={String(cantidad)}
            onCambio={(valor) => onCantidad(valor === '20' ? 20 : 10)}
          />
          <button
            type="button"
            className="at-col-global"
            onClick={alternarTodas}
            data-testid="colonias-expandir-todas"
            disabled={visibles.length === 0}
          >
            {todasAbiertas ? 'Colapsar todas' : 'Expandir todas'}
          </button>
        </div>
      </header>
      {cargando && datos ? (
        <p className="at-col-actualizando" role="status" aria-live="polite">
          Actualizando el ranking…
        </p>
      ) : null}

      <ul className="at-col-leyenda">
        {SERIES.map((serie) => (
          <li key={serie.clave}>
            <span className="at-col-muestra" style={{ background: serie.color }} aria-hidden="true" />
            {serie.etiqueta}
          </li>
        ))}
      </ul>
      <p className="at-col-nota">
        {modo === 'comun'
          ? 'Escala común desde cero: hechos y personas son conteos de unidades distintas, se comparan longitudes, no se suman.'
          : 'Escalas independientes: compara dentro de cada métrica; las tres columnas comparten colonias y orden.'}{' '}
        Las escalas se calculan con las {limiteVisibles} colonias del ranking, no solo con las
        abiertas.
      </p>

      {error ? (
        <div className="at-col-estado" role="alert">
          <p>No se pudo calcular el agregado por colonia.</p>
          <button type="button" className="at-btn at-btn--ghost" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      ) : !datos && cargando ? (
        <div className="at-col-estado" role="status" aria-live="polite">
          <p>Calculando el agregado por colonia…</p>
          <ul className="at-col-esqueleto" aria-hidden="true">
            {Array.from({ length: 8 }, (_, indice) => (
              <li key={indice} />
            ))}
          </ul>
        </div>
      ) : visibles.length === 0 ? (
        <div className="at-col-estado" role="status">
          <p>Sin hechos con los filtros actuales.</p>
        </div>
      ) : (
        <>
          <div className="at-col-cab-figuras" aria-hidden="true">
            <span />
            <span />
            <span className="at-col-cab-nombre">Colonia</span>
            {SERIES.map((serie) => (
              <span className="at-col-cab-cifra" key={serie.clave}>
                {serie.corta}
              </span>
            ))}
          </div>

          <ul
            className="at-col-lista"
            onFocusCapture={(evento) => {
              const contenedor = (evento.target as HTMLElement).closest('[data-col-detalle]');
              if (contenedor) {
                ultimoFocoDetalle.current = contenedor.getAttribute('data-col-detalle');
              }
            }}
          >
            {visibles.map((colonia, indice) => (
              <Fila
                key={colonia.id}
                colonia={colonia}
                indice={indice}
                abierta={abiertas.has(colonia.id)}
                modo={modo}
                maximoComun={maximoComun}
                maximos={maximos}
                onAlternar={alternar}
                registrarCabecera={registrarCabecera}
              />
            ))}
          </ul>

          <div className="at-col-ejes" aria-hidden="true">
            {(modo === 'comun'
              ? [{ etiqueta: 'Escala común', maximo: maximoComun }]
              : SERIES.map((serie) => ({ etiqueta: serie.corta, maximo: maximos[serie.clave] }))
            ).map((eje) => (
              <div className="at-col-eje" key={eje.etiqueta}>
                <span className="at-col-eje-etq">{eje.etiqueta}</span>
                <span>0</span>
                <span>{numero(eje.maximo)}</span>
              </div>
            ))}
          </div>

          <div className="at-col-pie">
            <p className="at-col-detalle">
              {numero(cobertura?.asignados ?? 0)} hechos con colonia identificada
              {sinColonia > 0
                ? ` · ${numero(sinColonia)} sin colonia en la fuente (fuera de la gráfica)`
                : ' · todos los hechos del conjunto traen colonia en la fuente'}
              {' · '}
              {numero(datos?.total_colonias ?? 0)} colonias distintas
            </p>
          </div>

          <p className="at-sr">
            {visibles
              .map(
                (colonia) =>
                  `${colonia.colonia}${colonia.alcaldia ? ` (${colonia.alcaldia})` : ''}: ${numero(colonia.hechos)} hechos, ${numero(colonia.lesionadas)} personas lesionadas, ${numero(colonia.fallecidas)} personas fallecidas.`,
              )
              .join(' ')}
          </p>
          <p className="at-col-limitacion">
            Sin polígonos de colonia en el proyecto: la gráfica no dibuja límites ni filtra por
            colonia desde el mapa. La colonia es la declarada en el archivo de hechos, agrupada con
            su alcaldía para no fusionar nombres repetidos.
          </p>
        </>
      )}
    </section>
  );
}

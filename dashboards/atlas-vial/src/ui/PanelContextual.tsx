/**
 * Panel contextual del mapa (un tercio del ancho en escritorio).
 *
 * Tres estados, en este orden de prioridad:
 *  1. **hecho seleccionado** → fecha, hora, tipo, ubicación y cifras del folio;
 *  2. **alcaldía seleccionada** → cifras de esa alcaldía con su denominador;
 *  3. **sin selección** → resumen del conjunto filtrado y ranking de alcaldías.
 *
 * El panel nunca calcula por su cuenta: todo viene del mismo estado de filtros
 * que el mapa, la serie y la tabla.
 */

import { useEvento } from '../consultas';
import type { Cliente } from '../api/cliente';
import type { FilaAlcaldia, FilaDistribucion, Resumen } from '../api/tipos';
import { COLOR_METRICA } from '../paleta';
import { etiquetaFecha, etiquetaHora, numero } from '../dominio';
import { CifrasMetrica } from './CifrasMetrica';
import { IconoFlecha, IconoIncidente } from './iconos';
import { RankingsAlcaldias } from './RankingsAlcaldias';

export interface PropsPanel {
  cliente: Cliente;
  resumen: Resumen | null;
  alcaldias: FilaAlcaldia[];
  alcaldiaSeleccionada: string | null;
  folioSeleccionado: string | null;
  onAlcaldia: (alcaldia: string | null) => void;
  /** Selecciona la alcaldía **y** aplica el filtro global (rankings del panel). */
  onSeleccionarAlcaldia: (alcaldia: string | null) => void;
  /** Distribución por tipo de hecho del conjunto filtrado (incluye la alcaldía). */
  tiposEvento?: FilaDistribucion[];
  /** Agregado por alcaldía sin el filtro de alcaldía: base de los rankings. */
  alcaldiasComparacion?: FilaAlcaldia[];
  onFolio: (folio: string | null) => void;
}

export function PanelContextual({
  cliente,
  resumen,
  alcaldias,
  alcaldiaSeleccionada,
  folioSeleccionado,
  onAlcaldia,
  onSeleccionarAlcaldia,
  tiposEvento = [],
  alcaldiasComparacion,
  onFolio,
}: PropsPanel) {
  const evento = useEvento(cliente, folioSeleccionado);
  /* Solo hay alcaldía seleccionada si hay nombre: el conjunto incluye una fila
     con alcaldía desconocida (el texto del archivo no coincide con ningún
     polígono) y no debe confundirse con «sin selección». */
  const fila = alcaldiaSeleccionada
    ? alcaldias.find((item) => item.alcaldia === alcaldiaSeleccionada) ?? null
    : null;
  const sinAsignar = alcaldias.find((item) => !item.alcaldia) ?? null;
  const total = resumen?.indicadores.hechos.valor ?? 0;

  return (
    <aside
      className={`at-panel at-panel--contexto${fila ? ' is-alcaldia' : ''}${
        !fila && !folioSeleccionado ? ' is-comparacion' : ''
      }`}
      aria-labelledby="at-t-contexto"
      data-testid="panel-contexto"
    >
      <div className="at-panel-head">
        <div>
          <h3 id="at-t-contexto">
            {folioSeleccionado ? 'Hecho seleccionado' : fila ? fila.alcaldia : 'Comparación por alcaldía'}
          </h3>
          <p className="at-panel-sub">
            {folioSeleccionado
              ? 'Detalle del folio en la versión publicada'
              : fila
                ? 'Cifras de esta alcaldía con los filtros vigentes'
                : 'Las cinco primeras por cada métrica'}
          </p>
        </div>
        {folioSeleccionado || fila ? (
          <button
            type="button"
            className="at-btn at-btn--mini"
            onClick={() => {
              onFolio(null);
              onAlcaldia(null);
            }}
          >
            Cerrar
          </button>
        ) : null}
      </div>

      {folioSeleccionado ? (
        <div className="at-contexto-cuerpo">
          {evento.isLoading ? <p className="at-nota">Consultando el folio…</p> : null}
          {evento.isError ? (
            <p className="at-nota at-nota--error">
              No se pudo leer el folio {folioSeleccionado}. {(evento.error as Error)?.message}
            </p>
          ) : null}
          {evento.data ? (
            <>
              <p className="at-folio">{evento.data.folio}</p>
              <dl className="at-datos">
                <div>
                  <dt>Fecha</dt>
                  <dd>{etiquetaFecha(evento.data.fecha)}</dd>
                </div>
                <div>
                  <dt>Hora</dt>
                  <dd>{etiquetaHora(evento.data.hora)}</dd>
                </div>
                <div>
                  <dt>Tipo de evento</dt>
                  <dd>
                    {(typeof evento.data.tipo_evento_norm === 'string' && evento.data.tipo_evento_norm) ||
                      evento.data.tipo_evento ||
                      'Sin dato'}
                  </dd>
                </div>
                <div>
                  <dt>Alcaldía (archivo)</dt>
                  <dd>{evento.data.alcaldia ?? 'Sin dato'}</dd>
                </div>
                <div className="at-datos--ancho">
                  <dt>Ubicación registrada</dt>
                  <dd>
                    {[evento.data.punto_1, evento.data.punto_2, evento.data.colonia]
                      .filter((parte): parte is string => Boolean(parte))
                      .join(' · ') || 'Sin ubicación en el expediente'}
                  </dd>
                </div>
              </dl>
              <div className="at-contexto-cifras">
                <div>
                  <span className="at-cifra-numero" style={{ color: COLOR_METRICA.personas_lesionadas }}>
                    {numero(evento.data.personas_lesionadas)}
                  </span>
                  <span className="at-cifra-etiqueta">personas lesionadas</span>
                </div>
                <div>
                  <span className="at-cifra-numero" style={{ color: COLOR_METRICA.personas_fallecidas }}>
                    {numero(evento.data.personas_fallecidas)}
                  </span>
                  <span className="at-cifra-etiqueta">personas fallecidas</span>
                </div>
              </div>
              <p className="at-nota">
                Las cifras de personas son las del hecho completo; no se reparten por tipo de
                persona ni por vehículo.
              </p>
              {fila ? (
                <button type="button" className="at-btn at-btn--ghost" onClick={() => onFolio(null)}>
                  <IconoFlecha tamano={13} />
                  <span>Volver a la alcaldía</span>
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : fila ? (
        <div className="at-contexto-cuerpo">
          <CifrasMetrica
            valores={{ hechos: fila.hechos, lesionadas: fila.lesionadas, fallecidas: fila.fallecidas }}
            etiqueta={`Cifras de ${fila.alcaldia} con los filtros vigentes`}
          />

          <section className="at-tipos-hecho" aria-labelledby="at-t-tipos">
            <h4 id="at-t-tipos">Tipos de hechos en {fila.alcaldia}</h4>
            <p className="at-contexto-nota">
              Denominador: {numero(fila.hechos)} hechos registrados en {fila.alcaldia} con los
              filtros vigentes.
            </p>
            <ul className="at-tipos-lista">
              {[...tiposEvento]
                .sort((a, b) => b.hechos - a.hechos)
                .map((tipo) => {
                  const maximo = Math.max(1, ...tiposEvento.map((x) => x.hechos));
                  return (
                    <li key={tipo.valor ?? 'sin-dato'}>
                      <span className="at-tipos-icono" aria-hidden="true">
                        <IconoIncidente tamano={16} />
                      </span>
                      <span className="at-tipos-nombre">{tipo.valor ?? 'Sin dato'}</span>
                      <span className="at-tipos-pista">
                        <span
                          className="at-tipos-barra"
                          style={{ width: `${Math.max(1.5, (100 * tipo.hechos) / maximo)}%` }}
                        />
                      </span>
                      <span className="at-tipos-cifra">{numero(tipo.hechos)}</span>
                      <span className="at-tipos-pct">
                        {fila.hechos
                          ? `${((100 * tipo.hechos) / fila.hechos).toFixed(1).replace('.', ',')} %`
                          : 'Sin dato'}
                      </span>
                    </li>
                  );
                })}
            </ul>
          </section>
        </div>
      ) : (
        <div className="at-contexto-cuerpo">
          <div className="at-rankings-cab">
            <p className="at-rankings-alcance">
              <span className="at-rankings-etq">Alcance</span> Todas las alcaldías; se aplican los
              demás filtros.
            </p>
            <p className="at-rankings-escala">Cada ranking utiliza su propia escala</p>
          </div>
          <RankingsAlcaldias
            filas={alcaldiasComparacion ?? alcaldias}
            alcaldiaSeleccionada={alcaldiaSeleccionada}
            onAlcaldia={onSeleccionarAlcaldia}
          />
          {sinAsignar ? (
            <p className="at-nota">
              {numero(sinAsignar.hechos)} hecho{sinAsignar.hechos === 1 ? '' : 's'} del filtro no
              tiene una alcaldía reconocible: el texto del archivo no coincide con ningún polígono.
              Se conserva en los totales y en los rankings, y no se asigna a ninguna alcaldía.
            </p>
          ) : null}

          <div className="at-cobertura">
            <p className="at-contexto-titulo">Cobertura del conjunto filtrado</p>
            <dl className="at-datos">
              <div>
                <dt>Con coordenadas</dt>
                <dd>
                  {numero(resumen?.cobertura.con_coordenadas)} de {numero(total)}
                  {resumen?.cobertura.sin_coordenadas
                    ? ` · ${numero(resumen.cobertura.sin_coordenadas)} sin ellas`
                    : ''}
                </dd>
              </div>
              <div>
                <dt>Con sexo registrado</dt>
                <dd>
                  {numero(resumen?.cobertura.con_sexo)} de {numero(total)}
                </dd>
              </div>
              <div>
                <dt>Con edad registrada</dt>
                <dd>
                  {numero(resumen?.cobertura.con_edad)} de {numero(total)}
                </dd>
              </div>
              <div>
                <dt>Tipo de persona</dt>
                <dd>
                  {numero(resumen?.cobertura.con_tipo_usuario)} de {numero(total)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </aside>
  );
}




















/**
 * Pantalla «Datos y calidad».
 *
 * Responde tres preguntas en orden: de dónde salen los datos (fuentes), cómo están
 * organizados (estructura) y cuánto se puede confiar en ellos (cobertura, ceros,
 * ausencias, precios, reconciliación y trazabilidad).
 *
 * Tres estados que no se mezclan nunca en pantalla:
 * - **0**: la fuente registra cero unidades ese día.
 * - **sin dato**: ese día no hay observación para la combinación.
 * - **fuera del filtro**: el día existe pero queda fuera del periodo o del contexto pedido.
 */

import type {
  CatalogoRespuesta,
  ComparacionTiendaCategoriaRespuesta,
  DistribucionPreciosRespuesta,
  EstadoRespuesta,
  IntermitenciaRespuesta,
} from '../api';
import { etiquetaTienda } from '../etiquetas';
import {
  Bloque,
  CabeceraPantalla,
  Nota,
  fechaCorta,
  numero,
  numero1,
} from './pantallas-comun';

export function PantallaDatos({
  estadoApi,
  catalogo,
  comparacion,
  distribucion,
  intermitencia,
  tiendaPrecios,
  tiendas,
  onTienda,
  cargando,
  error,
  onReintentar,
}: {
  estadoApi: EstadoRespuesta | null;
  catalogo: CatalogoRespuesta | null;
  comparacion: ComparacionTiendaCategoriaRespuesta | null;
  distribucion: DistribucionPreciosRespuesta | null;
  intermitencia: IntermitenciaRespuesta | null;
  tiendaPrecios: string | null;
  tiendas: string[];
  onTienda: (tienda: string) => void;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
}) {
  const cobertura = estadoApi?.cobertura ?? catalogo?.cobertura ?? null;
  const conteos = comparacion?.conteos ?? null;
  const reconciliacion = comparacion?.reconciliacion ?? null;
  const resumen = intermitencia?.resumen ?? null;
  const cobPrecios = distribucion?.cobertura ?? null;
  /* Nombre legible de la tienda del subanálisis; el código original se conserva al lado. */
  const tiendaEtiqueta = tiendaPrecios ? etiquetaTienda(tiendaPrecios) : null;
  const tiendaConCodigo = tiendaPrecios
    ? `${tiendaEtiqueta} (${tiendaPrecios})`
    : 'sin tienda elegida';
  /* Mientras una sección está en vuelo no se escribe «—» ni 0: se declara que se está calculando
     y, si no hay carga ni dato, que el valor no está disponible. */
  const pendiente = (hayDato: boolean, queCalcula: string) =>
    hayDato ? null : cargando ? `Calculando ${queCalcula}…` : `Sin ${queCalcula} disponible`;

  return (
    <div className="ac-bloques">
      <CabeceraPantalla
        titulo="Datos y calidad"
        proposito="Verificar de dónde sale cada cifra y qué parte del universo observado queda cubierta antes de analizarla: fuentes, estructura, ceros, ausencias, precios y trazabilidad."
        contexto={
          cobertura
            ? `Cobertura con ventas ${fechaCorta(cobertura.desde)} – ${fechaCorta(cobertura.hasta)} · ${numero(cobertura.dias)} días`
            : null
        }
      />

      {error ? (
        <section className="ac-panel ac-panel--error" role="alert">
          <h3>No se pudieron cargar los datos de calidad</h3>
          <p>{error}</p>
          <button type="button" className="ac-accion" onClick={onReintentar}>
            Reintentar
          </button>
        </section>
      ) : null}

      {/* A. Fuentes ------------------------------------------------------- */}
      <Bloque
        titulo="A · Fuentes"
        descripcion="Tres archivos públicos de la competencia M5, importados a MongoDB local sin recortes ni imputaciones"
        testid="datos-fuentes"
      >
        <div className="ac-tabla-marco">
          <table className="ac-tabla">
            <caption>Origen, grano y contenido de cada fuente</caption>
            <thead>
              <tr>
                <th scope="col">Fuente</th>
                <th scope="col">Grano</th>
                <th scope="col">Qué aporta</th>
                <th scope="col">Cobertura en esta versión</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Ventas diarias</th>
                <td>Artículo × tienda × día</td>
                <td>Unidades vendidas observadas; es la variable objetivo del modelo</td>
                <td>
                  {cobertura
                    ? `${fechaCorta(cobertura.desde)} – ${fechaCorta(cobertura.hasta)} · ${numero(cobertura.dias)} días`
                    : 'sin publicar'}
                </td>
              </tr>
              <tr>
                <th scope="row">Calendario</th>
                <td>Día</td>
                <td>Fecha, día de la semana y eventos; se comparte entre tiendas</td>
                <td>
                  {estadoApi?.calendario?.dias_de_calendario
                    ? `${numero(estadoApi.calendario.dias_de_calendario)} días`
                    : 'sin publicar'}
                  {estadoApi?.calendario?.dias_calendario_sin_ventas
                    ? ` · ${numero(estadoApi.calendario.dias_calendario_sin_ventas)} sin ventas, excluidos`
                    : ''}
                </td>
              </tr>
              <tr>
                <th scope="row">Precios de venta</th>
                <td>Artículo × tienda × semana</td>
                <td>
                  Precio de lista semanal; alimenta variables de precio cuando existe para la
                  combinación
                </td>
                <td>
                  {cobPrecios
                    ? `${numero(distribucion?.combinaciones_incluidas ?? 0)} combinaciones de ${tiendaConCodigo}`
                    : pendiente(false, 'la cobertura de precios')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="ac-nota">
          Fuente: «M5 Forecasting - Accuracy» (Walmart, Kaggle). Los archivos originales no se
          versionan en el repositorio; lo que se publica es la versión importada y validada en la
          base local.
        </p>
      </Bloque>

      {/* B. Estructura ---------------------------------------------------- */}
      <Bloque
        titulo="B · Estructura"
        descripcion="Dos jerarquías que se cruzan y los tres granos que usa el análisis"
        testid="datos-estructura"
      >
        <dl className="ac-dl">
          <dt>Territorio</dt>
          <dd>
            Estados Unidos → estado → tienda ·{' '}
            {conteos
              ? `${numero(conteos.estados)} estados y ${numero(conteos.tiendas)} tiendas en el contexto`
              : `${numero(catalogo?.estados.length ?? 0)} estados y ${numero(catalogo?.tiendas.length ?? 0)} tiendas en el catálogo`}
            .
          </dd>
          <dt>Catálogo</dt>
          <dd>
            Categoría → departamento → artículo ·{' '}
            {conteos
              ? `${numero(conteos.categorias_unicas)} categorías, ${numero(conteos.departamentos_unicos)} departamentos y ${numero(conteos.articulos_unicos)} artículos`
              : `${numero(catalogo?.categorias.length ?? 0)} categorías, ${numero(catalogo?.departamentos.length ?? 0)} departamentos y ${numero(catalogo?.productos_total ?? 0)} artículos`}
            .
          </dd>
          <dt>Grano de ventas</dt>
          <dd>
            Artículo × tienda × fecha ·{' '}
            {conteos
              ? `${numero(conteos.series_articulo_tienda)} series artículo × tienda`
              : 'series artículo × tienda'}
            . Es el grano mínimo del pronóstico y de la evaluación.
          </dd>
          <dt>Grano de precios</dt>
          <dd>
            Artículo × tienda × semana. No hay precio diario: el análisis compara semanas
            completas y declara el hueco cuando falta.
          </dd>
          <dt>Combinaciones del contexto</dt>
          <dd>
            {conteos
              ? `${numero(conteos.combinaciones_tienda_categoria)} combinaciones tienda × categoría y ${numero(conteos.combinaciones_tienda_departamento)} tienda × departamento`
              : pendiente(false, 'las combinaciones del contexto')}
            . Una combinación no es un valor único del catálogo:{' '}
            {conteos
              ? `${numero(conteos.categorias_unicas)} categorías aparecen en varias tiendas.`
              : 'las categorías se repiten en cada tienda.'}
          </dd>
        </dl>
        {conteos?.regla ? <p className="ac-nota">{conteos.regla}</p> : null}
        {cargando && !conteos ? (
          <p className="ac-cargando" role="status">
            Calculando la estructura del contexto…
          </p>
        ) : null}
      </Bloque>

      {/* C. Calidad y cobertura ------------------------------------------- */}
      <Bloque
        titulo="C · Cobertura observada y ausencias"
        descripcion="Cuántos días hay observación real, cuántos son cero y cuántos simplemente no existen en la fuente"
        testid="datos-cobertura"
      >
        {/* La intermitencia se calcula por tienda: el alcance se declara junto al título para
            no confundir el subanálisis con el contexto global del resto de la pantalla. */}
        <p className="ac-aviso-inline" data-testid="datos-ambito-intermitencia">
          <strong>Ámbito de este bloque:</strong> subanálisis por tienda ·{' '}
          <strong>{tiendaConCodigo}</strong>
          {intermitencia
            ? ` · ${fechaCorta(intermitencia.periodo.desde)} – ${fechaCorta(intermitencia.periodo.hasta)} (${numero(intermitencia.periodo.dias)} días)`
            : ' · periodo pendiente'}{' '}
          · cambia la tienda con el selector de este bloque. El contexto global de la pantalla se
          declara en las demás secciones.
        </p>
        <div className="ac-filtros-fila">
          <label className="ac-campo">
            <span>Tienda del análisis de intermitencia y precios</span>
            <select value={tiendaPrecios ?? ''} onChange={(evento) => onTienda(evento.target.value)}>
              {tiendas.map((tienda) => (
                <option key={tienda} value={tienda}>
                  {etiquetaTienda(tienda)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="ac-rejilla">
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Días con ventas en la versión</span>
            <span className="ac-tarjeta-valor">
              {cobertura ? numero(cobertura.dias) : pendiente(false, 'los días')}
            </span>
            <p className="ac-tarjeta-pie">
              {cobertura
                ? `${fechaCorta(cobertura.desde)} – ${fechaCorta(cobertura.hasta)}`
                : 'Sin versión publicada'}
            </p>
          </div>
          <div className="ac-tarjeta" data-testid="datos-mediana-ceros">
            <span className="ac-tarjeta-etq">Mediana del porcentaje de días en cero</span>
            <span className="ac-tarjeta-valor">
              {resumen ? `${numero1(resumen.pct_cero_mediana ?? 0)} %` : pendiente(false, 'la mediana')}
            </span>
            <p className="ac-tarjeta-pie">
              {resumen
                ? `Por serie: días con 0 unidades ÷ días con dato de esa serie. Mediana sobre ${numero(resumen.series_con_datos)} series con datos · media ${numero1(resumen.pct_cero_media ?? 0)} % · ${numero(resumen.series_todas_cero)} series con todos los días en cero`
                : 'Sin cálculo de intermitencia'}
            </p>
          </div>
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Series de la tienda analizada</span>
            <span className="ac-tarjeta-valor">
              {resumen ? numero(resumen.series) : pendiente(false, 'las series')}
            </span>
            <p className="ac-tarjeta-pie">
              {resumen
                ? `${numero(resumen.series_con_datos)} con datos · ${numero(resumen.series_sin_datos)} sin datos`
                : 'Sin cálculo de intermitencia'}
            </p>
          </div>
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Periodo del cálculo</span>
            <span className="ac-tarjeta-valor">
              {intermitencia ? `${numero(intermitencia.periodo.dias)} días` : pendiente(false, 'el periodo')}
            </span>
            <p className="ac-tarjeta-pie">
              {intermitencia
                ? `${fechaCorta(intermitencia.periodo.desde)} – ${fechaCorta(intermitencia.periodo.hasta)}`
                : 'Ajusta el periodo en «Exploración»'}
            </p>
          </div>
        </div>

        <div className="ac-rejilla">
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Cero observado</span>
            <p className="ac-tarjeta-pie">
              La fuente registra 0 unidades ese día. Se cuenta como cero y entra en los
              denominadores y en el error del modelo.
            </p>
          </div>
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Sin dato</span>
            <p className="ac-tarjeta-pie">
              No hay observación para ese día en esa serie. No se imputa, no se suaviza y no se
              trata como cero: queda fuera de los promedios.
            </p>
          </div>
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Fuera del filtro</span>
            <p className="ac-tarjeta-pie">
              El día existe pero cae fuera del periodo o del contexto solicitado. Se marca para no
              confundirlo con una ausencia de la fuente.
            </p>
          </div>
        </div>

        {resumen?.distribucion?.length ? (
          <div className="ac-tabla-marco">
            <table className="ac-tabla">
              <caption>
                Distribución de series según el porcentaje de días en cero · tienda{' '}
                {tiendaPrecios ?? 'sin elegir'}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tramo de días en cero</th>
                  <th scope="col" className="ac-tabla-num">Series</th>
                </tr>
              </thead>
              <tbody>
                {resumen.distribucion.map((tramo) => (
                  <tr key={tramo.etiqueta}>
                    <th scope="row">{tramo.etiqueta}</th>
                    <td className="ac-tabla-num">{numero(tramo.series)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {intermitencia?.reglas ? <p className="ac-nota">{intermitencia.reglas}</p> : null}
      </Bloque>

      <Bloque
        titulo="D · Cobertura de precios"
        descripcion="Completa, parcial o ausente: los tres casos se cuentan por separado y la ausencia no se interpreta como inventario"
        testid="datos-precios"
      >
        <div className="ac-filtros-fila">
          <label className="ac-campo">
            <span>Tienda del análisis de precios</span>
            <select
              value={tiendaPrecios ?? ''}
              onChange={(evento) => onTienda(evento.target.value)}
            >
              {tiendas.map((tienda) => (
                <option key={tienda} value={tienda}>
                  {etiquetaTienda(tienda)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="ac-aviso-inline" data-testid="datos-tienda-precios">
          <strong>Tienda de este bloque:</strong> {tiendaConCodigo}
        </p>

        {cobPrecios ? (
          <>
            <div className="ac-cob-precios">
              <div className="ac-tarjeta">
                <span className="ac-tarjeta-etq">Cobertura completa</span>
                <span className="ac-tarjeta-valor">
                  {numero(cobPrecios.completa)}
                  <span className="ac-tarjeta-unidad">
                    {' '}
                    · {cobPrecios.pct_completa === null ? 'n/c' : `${numero1(cobPrecios.pct_completa)} %`}
                  </span>
                </span>
                <p className="ac-tarjeta-pie">
                  Combinaciones con precio en todas las semanas del intervalo
                </p>
              </div>
              <div className="ac-tarjeta">
                <span className="ac-tarjeta-etq">Cobertura parcial</span>
                <span className="ac-tarjeta-valor">{numero(cobPrecios.parcial)}</span>
                <p className="ac-tarjeta-pie">
                  Tienen precio en algunas semanas y en otras no: el hueco se declara
                </p>
              </div>
              <div className="ac-tarjeta">
                <span className="ac-tarjeta-etq">Sin precio en el intervalo</span>
                <span className="ac-tarjeta-valor">{numero(cobPrecios.sin_precio)}</span>
                <p className="ac-tarjeta-pie">
                  Ninguna semana con precio: no se imputa ni se asume precio cero
                </p>
              </div>
              <div className="ac-tarjeta">
                <span className="ac-tarjeta-etq">Días cubiertos por precio</span>
                <span className="ac-tarjeta-valor">
                  {cobPrecios.pct_dias_cubiertos === null
                    ? 'n/c'
                    : `${numero1(cobPrecios.pct_dias_cubiertos)} %`}
                </span>
                <p className="ac-tarjeta-pie">
                  {numero(cobPrecios.dias_cubiertos_total)} de{' '}
                  {numero(cobPrecios.dias_posibles_total)} días · mediana{' '}
                  {numero(cobPrecios.dias_cubiertos_mediana)} días por combinación
                </p>
              </div>
            </div>
            {distribucion?.sin_precio?.nota ? (
              <Nota>{distribucion.sin_precio.nota}</Nota>
            ) : null}
            <p className="ac-nota">{cobPrecios.nota}</p>
          </>
        ) : (
          <p className="ac-cargando" role="status">
            {cargando ? 'Calculando la cobertura de precios…' : 'Sin cobertura de precios calculada.'}
          </p>
        )}
      </Bloque>

      <Bloque
        titulo="E · Reconciliación y trazabilidad"
        descripcion="Las cifras que se muestran cuadran con las filas que las producen, y la versión queda identificada"
        testid="datos-reconciliacion"
      >
        {reconciliacion ? (
          <div className="ac-tabla-marco">
            <table className="ac-tabla">
              <caption>
                Reconciliación del intervalo A y B: filas calculadas frente al total del contexto
              </caption>
              <thead>
                <tr>
                  <th scope="col">Intervalo</th>
                  <th scope="col" className="ac-tabla-num">Filas calculadas</th>
                  <th scope="col" className="ac-tabla-num">Total del contexto</th>
                  <th scope="col">Cuadra</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">A · {fechaCorta(comparacion?.a.desde)} – {fechaCorta(comparacion?.a.hasta)}</th>
                  <td className="ac-tabla-num">{numero(reconciliacion.filas_a)}</td>
                  <td className="ac-tabla-num">{numero(reconciliacion.contexto_a)}</td>
                  <td>{reconciliacion.cuadra_a ? 'Sí' : 'No'}</td>
                </tr>
                <tr>
                  <th scope="row">B · {fechaCorta(comparacion?.b.desde)} – {fechaCorta(comparacion?.b.hasta)}</th>
                  <td className="ac-tabla-num">{numero(reconciliacion.filas_b)}</td>
                  <td className="ac-tabla-num">{numero(reconciliacion.contexto_b)}</td>
                  <td>{reconciliacion.cuadra_b ? 'Sí' : 'No'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ac-cargando" role="status">
            {cargando ? 'Verificando la reconciliación…' : 'Sin reconciliación calculada.'}
          </p>
        )}
        {reconciliacion?.nota ? <p className="ac-nota">{reconciliacion.nota}</p> : null}

        <dl className="ac-dl">
          <dt>Versión de datos</dt>
          <dd>{estadoApi?.version ?? 'sin publicar'}</dd>
          <dt>Estado de la versión</dt>
          <dd>{estadoApi?.estado ?? pendiente(false, 'el estado de la versión')}</dd>
          <dt>Esquema</dt>
          <dd>{estadoApi?.esquema ?? pendiente(false, 'el esquema')}</dd>
          <dt>Unidad</dt>
          <dd>{estadoApi?.unidad ?? 'unidades vendidas'}</dd>
          <dt>Calendario compartido</dt>
          <dd>
            {estadoApi?.calendario
              ? estadoApi.calendario.compartido
                ? 'Sí, un solo calendario para las diez tiendas'
                : 'No: cada tienda trae su propio calendario'
              : pendiente(false, 'el calendario compartido')}
          </dd>
          <dt>Derivado tienda × departamento</dt>
          <dd>
            {estadoApi?.derivado
              ? `${estadoApi.derivado.estado ?? 'publicado'} · ${numero(estadoApi.derivado.documentos ?? 0)} documentos · ${
                  estadoApi.derivado.dias === null || estadoApi.derivado.dias === undefined
                    ? 'días sin declarar'
                    : `${numero(estadoApi.derivado.dias)} días`
                }`
              : pendiente(false, 'el derivado tienda × departamento')}
          </dd>
        </dl>
        <p className="ac-nota">
          Cada respuesta de la API viaja con la versión de datos que la produjo; el pronóstico y su
          evaluación añaden además la ejecución del modelo. No se muestran rutas locales ni
          credenciales como información principal.
        </p>
      </Bloque>
    </div>
  );
}

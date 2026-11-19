/**
 * Pantalla «Proyecto»: entrada del ciclo.
 *
 * Explica el problema comercial, qué se mide exactamente, quién lo usaría, de qué
 * fuentes sale, cuál es el alcance, cómo se resuelve y qué se obtuvo. Todas las cifras
 * salen de la API o de los artefactos de evaluación del run publicado: no hay constantes
 * escritas en el código. Si un dato no está disponible, se dice en lugar de inventarlo.
 */

import type {
  CatalogoRespuesta,
  EstadoRespuesta,
  EvaluacionRespuesta,
  ModelosRespuesta,
  PronosticosRespuesta,
  VentanasEvaluacionRespuesta,
} from '../api';
import { interpretarMejora } from '../metricas';
import type { PantallaId } from './NavPantallas';
import { ProtocoloEvaluacion } from './ProtocoloEvaluacion';
import {
  Bloque,
  CabeceraPantalla,
  Nota,
  fechaCorta,
  numero,
  numero1,
  numero2,
} from './pantallas-comun';

const ETAPAS: { id: PantallaId; etiqueta: string }[] = [
  { id: 'datos', etiqueta: '1 · Datos y calidad' },
  { id: 'exploracion', etiqueta: '2 · Exploración' },
  { id: 'modelado', etiqueta: '3 · Modelado' },
  { id: 'evaluacion', etiqueta: '4 · Evaluación' },
  { id: 'resultados', etiqueta: '5 · Resultados' },
];

export function PantallaProyecto({
  estadoApi,
  catalogo,
  modelos,
  evaluacion,
  ventanas,
  pronosticos,
  cargando,
  error,
  onIr,
  onReintentar,
  actualizadoEn,
}: {
  estadoApi: EstadoRespuesta | null;
  catalogo: CatalogoRespuesta | null;
  modelos: ModelosRespuesta | null;
  evaluacion: EvaluacionRespuesta | null;
  /** Ventanas publicadas: granos, mejora y ventanas de la misma fuente que «Evaluación». */
  ventanas: VentanasEvaluacionRespuesta | null;
  pronosticos: PronosticosRespuesta | null;
  cargando: boolean;
  error: string | null;
  onIr: (pantalla: PantallaId) => void;
  onReintentar: () => void;
  actualizadoEn: string | null;
}) {
  const cobertura = estadoApi?.cobertura ?? catalogo?.cobertura ?? null;
  const tiendas = catalogo?.tiendas.length ?? 0;
  const estados = catalogo?.estados.length ?? 0;
  const categorias = catalogo?.categorias.length ?? 0;
  const departamentos = catalogo?.departamentos.length ?? 0;
  const articulos = catalogo?.productos_total ?? 0;
  const series = articulos && tiendas ? articulos * tiendas : null;

  const ejecucion = modelos?.ejecuciones.find((fila) => fila.recomendado) ?? null;
  const runId = modelos?.recomendado ?? ejecucion?.run_id ?? evaluacion?.run_id ?? null;

  // Resultados principales del run publicado: grano «total diario del contexto».
  /* Las cifras salen del consolidado de ventanas publicadas, que declara su grano. El
     resumen de `/evaluacion` usa el grano de detalle (artículo × tienda × día), así que no
     puede rotularse como «total diario». */
  const detalle = (ventanas?.consolidado?.detalle ?? null) as
    | { candidato?: { mae?: number | null; wape_pct?: number | null }; baseline?: { mae?: number | null; wape_pct?: number | null }; mejora_relativa_pct?: number | null; diferencia_absoluta?: number | null; ventanas?: number }
    | null;
  const agregado = (ventanas?.consolidado?.agregado ?? null) as
    | { candidato?: { mae?: number | null; wape_pct?: number | null }; baseline?: { mae?: number | null; wape_pct?: number | null }; mejora_relativa_pct?: number | null; diferencia_absoluta?: number | null; ventanas?: number }
    | null;
  const ventanasFinales = ventanas?.ventanas?.length ?? 0;
  const maeCandidato = detalle?.candidato?.mae ?? evaluacion?.resumen?.mae ?? null;
  const maeBaseline = detalle?.baseline?.mae ?? evaluacion?.baseline_resumen?.mae ?? null;
  const wapeCandidato = detalle?.candidato?.wape_pct ?? evaluacion?.resumen?.wape ?? null;
  const wapeBaseline = detalle?.baseline?.wape_pct ?? evaluacion?.baseline_resumen?.wape ?? null;
  const maeAgregado = agregado?.candidato?.mae ?? null;
  const maeAgregadoBaseline = agregado?.baseline?.mae ?? null;
  /* Una sola interpretación para toda la pantalla: el texto y el signo salen de los dos MAE. */
  const mejoraDetalle = interpretarMejora(maeCandidato, maeBaseline);
  const mejoraAgregada = interpretarMejora(maeAgregado, maeAgregadoBaseline);
  const cortesFinales = evaluacion?.ventanas?.length ?? 0;
  const totalHorizonte = pronosticos
    ? pronosticos.series.reduce(
        (total, serie) => total + serie.pronostico.reduce((suma, valor) => suma + (valor ?? 0), 0),
        0,
      )
    : null;
  const desgloseVentanas = evaluacion?.ventanas ?? [];
  /* ¿La variante publicada usa precios? Se decide con sus variables reales, no con un texto fijo. */
  const usaPreciosModelo = (
    modelos?.ejecuciones?.find((fila) => fila.recomendado)?.variables ?? []
  ).some((variable) => String(variable).startsWith('precio'));

  return (
    <div className="ac-bloques">
      <CabeceraPantalla
        titulo="Proyecto · Walmart M5"
        proposito="Análisis de ventas históricas y pronóstico diario a 28 días con Walmart M5. Esta pantalla presenta el problema, los datos, el método y el resultado antes de entrar en el detalle."
        contexto={
          cobertura
            ? `Cobertura de ventas ${fechaCorta(cobertura.desde)} – ${fechaCorta(cobertura.hasta)} (${numero(cobertura.dias)} días) · versión ${estadoApi?.version ?? catalogo?.version ?? 'sin publicar'}`
            : null
        }
      />

      {error ? (
        <section className="ac-panel ac-panel--error" role="alert">
          <h3>No se pudo cargar el resumen del proyecto</h3>
          <p>{error}</p>
          <button type="button" className="ac-accion" onClick={onReintentar}>
            Reintentar
          </button>
        </section>
      ) : null}

      {!error && cargando && !evaluacion ? (
        <div className="ac-esqueleto" role="status" aria-busy="true">
          <span>Cargando el resumen del proyecto…</span>
        </div>
      ) : null}

      <Bloque
        titulo="El problema comercial"
        descripcion="Qué decisión necesita el pronóstico y por qué importa el grano artículo × tienda"
      >
        <p>
          Una cadena de autoservicio con tiendas en tres estados necesita planear la semana
          siguiente de cada uno de sus artículos, tienda por tienda. La pregunta operativa no es
          cuánto se vendió en total, sino <strong>cuántas unidades de un artículo concreto se
          venderán en una tienda concreta en cada uno de los próximos 28 días</strong>.
        </p>
        <p>
          Responderla con el promedio general de la cadena esconde justo lo que hace difícil el
          problema: la mayoría de las series artículo × tienda vende en pocas unidades al día y
          con muchos días en cero. Un pronóstico útil tiene que convivir con esa intermitencia y
          tiene que poder desagregarse hasta el artículo sin recalcular nada.
        </p>
        <dl className="ac-dl">
          <dt>Qué se pronostica</dt>
          <dd>Unidades vendidas observadas por artículo y tienda, día a día.</dd>
          <dt>Horizonte</dt>
          <dd>28 días consecutivos después de la fecha de corte.</dd>
          <dt>Grano</dt>
          <dd>
            Artículo × tienda × día. Los niveles agregados (estado, tienda, categoría,
            departamento) se obtienen sumando esas mismas series.
          </dd>
          <dt>Quién lo usa</dt>
          <dd>
            Planeación comercial y análisis de demanda: revisar el comportamiento histórico y
            consultar un pronóstico reproducible antes de comprometer un plan.
          </dd>
          <dt>Qué no es</dt>
          <dd>
            No es un sistema de inventarios, compras ni precios: no calcula demanda insatisfecha,
            utilidad ni recomendaciones de abasto.
          </dd>
        </dl>
      </Bloque>

      <Bloque
        titulo="Fuentes y cobertura real"
        descripcion="Datos abiertos de la competencia M5 de Walmart (Kaggle), cargados en MongoDB local"
      >
        <div className="ac-rejilla">
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Ventas</span>
            <span className="ac-tarjeta-valor">{articulos ? numero(articulos) : '—'} artículos</span>
            <p className="ac-tarjeta-pie">
              Serie diaria por artículo y tienda · {series ? numero(series) : '—'} series
              artículo × tienda
            </p>
          </div>
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Calendario</span>
            <span className="ac-tarjeta-valor">
              {estadoApi?.calendario?.dias_de_calendario
                ? `${numero(estadoApi.calendario.dias_de_calendario)} días`
                : '—'}
            </span>
            <p className="ac-tarjeta-pie">
              Fechas, día de la semana y eventos
              {estadoApi?.calendario?.dias_calendario_sin_ventas
                ? ` · ${numero(estadoApi.calendario.dias_calendario_sin_ventas)} días de calendario sin ventas excluidos`
                : ''}
            </p>
          </div>
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Precios</span>
            <span className="ac-tarjeta-valor">Semanal</span>
            <p className="ac-tarjeta-pie">
              Precio de venta por artículo, tienda y semana; la ausencia de precio no implica
              inventario cero y se contabiliza aparte
            </p>
          </div>
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Cobertura con ventas</span>
            <span className="ac-tarjeta-valor">
              {cobertura ? `${numero(cobertura.dias)} días` : '—'}
            </span>
            <p className="ac-tarjeta-pie">
              {cobertura
                ? `${fechaCorta(cobertura.desde)} – ${fechaCorta(cobertura.hasta)}`
                : 'Sin versión publicada'}
            </p>
          </div>
        </div>
        <p className="ac-nota">
          Fuente: «M5 Forecasting - Accuracy» (Walmart, competencia de Kaggle). Este proyecto no
          está vinculado ni patrocinado por Walmart. Los datos son históricos: el pronóstico
          corresponde al corte publicado dentro del conjunto, no a las ventas de hoy.
        </p>
      </Bloque>

      <Bloque
        titulo="Alcance territorial y comercial"
        descripcion="Qué se incluye y qué queda fuera del alcance analizado"
      >
        <dl className="ac-dl">
          <dt>Territorio</dt>
          <dd>
            {estados} estados · {tiendas} tiendas · Estados Unidos. La cobertura por tienda no es
            homogénea: el detalle está en «Datos y calidad».
          </dd>
          <dt>Catálogo</dt>
          <dd>
            {categorias} categorías · {departamentos} departamentos ·{' '}
            {articulos ? numero(articulos) : '—'} artículos.
          </dd>
          <dt>Grano de precios</dt>
          <dd>Artículo × tienda × semana; no hay precio diario ni por mayoreo.</dd>
          <dt>Fuera del alcance</dt>
          <dd>
            Inventario, tráfico de tienda, margen, promociones y campañas: el conjunto M5 no los
            publica, así que no se infieren ni se simulan.
          </dd>
        </dl>
      </Bloque>

      <Bloque
        titulo="Método, en una frase"
        descripcion="El detalle técnico está en «Modelado»; aquí solo la idea"
      >
        <p>
          Un modelo global de <strong>LightGBM</strong> entrenado sobre todas las series
          artículo × tienda aprende un patrón diario condicionado al horizonte (día 1 a 28) con
          variables de calendario, historial reciente e identificadores de tienda, categoría y
          departamento.{' '}
          {usaPreciosModelo
            ? 'Esta variante añade precios conocidos hasta el corte.'
            : 'La variante publicada no usa precios; el proyecto sí explora precios en su pantalla correspondiente y existe otra variante con ellos, evaluada y no publicada.'}{' '}
          Se compara contra un <strong>baseline estacional semanal</strong> con la misma
          información. El pronóstico se construye en 28 pasos hacia adelante, sin usar información
          posterior a la fecha de corte.
        </p>
        <dl className="ac-dl">
          <dt>Modelo publicado</dt>
          <dd>
            {ejecucion?.etiqueta ?? evaluacion?.modelo?.etiqueta ?? 'sin publicar'}
            {runId ? ` · ejecución ${runId}` : ''}
          </dd>
          <dt>Baseline</dt>
          <dd>Estacional semanal ingenuo: mismo día de la semana de la semana anterior.</dd>
          <dt>Evaluación</dt>
          <dd>
            {cortesFinales > 0
              ? `${cortesFinales} ventanas de evaluación final, cada una de 28 días, con el error medido en dos granos: total diario del contexto y artículo × tienda × día.`
              : 'Ventanas de evaluación publicadas: ver «Evaluación».'}
          </dd>
        </dl>
        <ProtocoloEvaluacion modelos={modelos} ventanas={ventanas} compacto testid="proyecto-protocolo" />
      </Bloque>

      <Bloque
        titulo="Resultados principales"
        descripcion="Cifras del run publicado; el detalle por ventana, segmento y horizonte está en «Evaluación»"
        testid="proyecto-resultados"
      >
        {maeCandidato !== null && maeBaseline !== null ? (
          <div className="ac-rejilla">
            <div className="ac-tarjeta" data-testid="proyecto-grano-detalle">
              <span className="ac-tarjeta-etq">MAE · por artículo × tienda × día</span>
              <span className="ac-tarjeta-valor">{numero2(maeCandidato)}</span>
              <p className="ac-tarjeta-pie">
                Unidades por serie-día · modelo frente a baseline {numero2(maeBaseline)} ·{' '}
                {numero(ventanasFinales)} ventanas finales · ejecución{' '}
                {ventanas?.run_id ?? ejecucion?.run_id ?? '—'}
              </p>
            </div>
            <div className="ac-tarjeta" data-testid="proyecto-grano-agregado">
              <span className="ac-tarjeta-etq">MAE · total del segmento por día</span>
              <span className="ac-tarjeta-valor">
                {maeAgregado === null ? 'n/c' : numero2(maeAgregado)}
              </span>
              <p className="ac-tarjeta-pie" data-testid="proyecto-mejora-agregada">
                Suma de la predicción y del observado antes de medir · baseline{' '}
                {maeAgregadoBaseline === null ? 'n/c' : numero2(maeAgregadoBaseline)} ·{' '}
                {mejoraAgregada.texto}
              </p>
            </div>
            <div className="ac-tarjeta" data-testid="proyecto-mejora-detalle">
              <span className="ac-tarjeta-etq">Mejora · por artículo × tienda × día</span>
              <span className="ac-tarjeta-valor" title={mejoraDetalle.detalle}>
                {mejoraDetalle.tipo === 'menor_error' || mejoraDetalle.tipo === 'mayor_error'
                  ? `${numero2(mejoraDetalle.magnitudPct ?? 0)} %`
                  : mejoraDetalle.textoCorto}
              </span>
              <p className="ac-tarjeta-pie">
                {mejoraDetalle.tipo === 'menor_error'
                  ? 'menos error que el baseline'
                  : mejoraDetalle.tipo === 'mayor_error'
                    ? 'más error que el baseline'
                    : mejoraDetalle.tipo === 'sin_diferencia_numerica'
                      ? 'sin diferencia numérica con el baseline'
                      : mejoraDetalle.tipo === 'diferencia_pequena'
                        ? 'diferencia por debajo del umbral de 0,05 %'
                        : mejoraDetalle.motivo ?? 'no calculable'}
                {mejoraAgregada.tipo === 'no_calculable'
                  ? ''
                  : ` · en el total del segmento, ${mejoraAgregada.textoCorto.toLowerCase()}`}
              </p>
            </div>
            <div className="ac-tarjeta">
              <span className="ac-tarjeta-etq">WAPE · por artículo × tienda × día</span>
              <span className="ac-tarjeta-valor">
                {wapeCandidato === null ? 'n/c' : `${numero2(wapeCandidato)} %`}
              </span>
              <p className="ac-tarjeta-pie">
                Baseline {wapeBaseline === null ? 'n/c' : `${numero2(wapeBaseline)} %`} · error
                absoluto sobre unidades observadas. Los dos granos no son comparables entre sí.
              </p>
            </div>
          </div>
        ) : (
          <Nota>
            La evaluación del run publicado todavía no está disponible; las pantallas
            «Evaluación» y «Resultados» muestran lo que sí está calculado.
          </Nota>
        )}

        {totalHorizonte !== null && pronosticos ? (
          <p>
            <strong>Total pronosticado en los próximos {pronosticos.horizonte} días:</strong>{' '}
            {numero(totalHorizonte)} unidades a partir del corte{' '}
            {fechaCorta(pronosticos.origen_fecha)} · promedio diario{' '}
            {numero1(totalHorizonte / Math.max(1, pronosticos.horizonte))} unidades.
          </p>
        ) : null}

        {desgloseVentanas.length > 0 ? (
          <p className="ac-nota">
            Ventanas usadas en la evaluación final:{' '}
            {desgloseVentanas
              .map(
                (ventana) =>
                  `${fechaCorta(ventana.origen_fecha)} → ${fechaCorta(ventana.fin_fecha)} (d_${ventana.origen_d})`,
              )
              .join(' · ')}
            . Con dos cortes finales no se afirma significancia estadística ni superioridad
            universal: se informan las ventanas disponibles, incluidas las que no mejoran.
          </p>
        ) : null}

        <dl className="ac-dl">
          <dt>Limitaciones declaradas</dt>
          <dd>
            Series intermitentes con error relativo alto por artículo; dos ventanas finales no
            alcanzan para inferencia estadística; no hay intervalos de predicción ni WRMSSE; los
            granos detalle y agregado no son comparables entre sí.
          </dd>
          <dt>Actualización</dt>
          <dd>
            Versión de datos <strong>{estadoApi?.version ?? 'sin publicar'}</strong>
            {' · revisión '}
            <strong>{ventanas?.revision ?? 'sin declarar'}</strong>
            {actualizadoEn ? ` · calculada el ${actualizadoEn}` : ''}
            {' · evaluación en nivel total del contexto'}
          </dd>
        </dl>
      </Bloque>

      <section className="ac-panel" aria-labelledby="ac-t-ruta">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-ruta">Ruta del proceso</h3>
            <p className="ac-panel-sub">
              Cada paso es una pantalla con su propia dirección: se puede abrir directamente,
              recargar y compartir
            </p>
          </div>
        </header>
        <ol className="ac-proceso">
          {ETAPAS.map((etapa) => (
            <li key={etapa.id}>
              <button
                type="button"
                className="ac-proceso-btn"
                onClick={() => onIr(etapa.id)}
                data-pantalla-destino={etapa.id}
              >
                {etapa.etiqueta}
              </button>
              <span className="ac-proceso-flecha" aria-hidden="true">
                →
              </span>
            </li>
          ))}
        </ol>
        <div className="ac-acciones">
          <button type="button" className="ac-accion" onClick={() => onIr('datos')}>
            Explorar el proceso
          </button>
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            onClick={() => onIr('resultados')}
          >
            Consultar resultados
          </button>
        </div>
      </section>
    </div>
  );
}

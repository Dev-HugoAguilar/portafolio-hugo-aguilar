/**
 * Paneles del pronóstico: resultado consultable y detalle de su evaluación.
 *
 * `PanelPronostico` sirve la pantalla «Resultados» (y también el corte histórico de
 * «Evaluación»): contexto, corte, rango de 28 días, total pronosticado, promedio diario,
 * desglose por segmento, gráfica y descarga de la selección.
 *
 * `PanelEvaluacion` reúne la comparación candidato/baseline por horizonte y por segmento y
 * las ventanas evaluadas. Es el único lugar donde se publican esas tablas: no se repiten en
 * otras pantallas.
 *
 * Qué muestra
 * -----------
 * - **Cabecera**: horizonte, fecha de corte, rango exacto de fechas pronosticadas,
 *   modelo y baseline, estado (pronóstico posterior al último dato o corte de
 *   evaluación histórica) y el supuesto de precios futuros.
 * - **Gráfica**: histórico observado (trazo sólido), zona del pronóstico con fondo
 *   gris muy tenue, candidato y baseline con trazos distintos, y el observado
 *   posterior al corte **solo** cuando existe (evaluación histórica). Cursor por día
 *   con valores y fechas exactos. Sin bandas de incertidumbre: no se han calculado.
 * - **Evaluación**: tabla candidato frente a baseline, error por horizonte (día 1–28),
 *   segmentos con la cuenta de los que mejoran y empeoran, y detalle por segmento.
 * - **Metodología**: qué predice, qué variables usa, qué se supone conocido, cómo se
 *   evalúa y qué limitaciones conserva.
 */

import { scaleLinear, scalePoint } from 'd3-scale';
import { line } from 'd3-shape';
import { useMemo, useState } from 'react';

import type {
  EvaluacionRespuesta,
  NivelPronosticoNivel,
  PronosticosRespuesta,
  SegmentoEvaluacion,
} from '../api';
import { interpretarMejora, UNIDAD_SESGO } from '../metricas';
import {
  etiquetaArticulo,
  etiquetaArticuloCorta,
  etiquetaCategoria,
  etiquetaCategoriaCorta,
  etiquetaDepartamento,
  etiquetaEstado,
  etiquetaEstadoCorto,
  etiquetaNivel,
  etiquetaTienda,
  numero2,
} from '../etiquetas';
import type { EstadoConsulta, SeleccionPronostico } from '../seleccion';
import { Segmentado } from './Segmentado';
import { descargarCsv } from './descargas';

const numero = (valor: number) => valor.toLocaleString('es-MX');
const numero1 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const fechaCorta = (iso: string) => {
  const fecha = new Date(`${iso}T00:00:00`);
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

const pct = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? 'n/c' : `${numero1(valor)} %`;

/**
 * Nombre legible de la clave de un nivel; el código queda como información secundaria.
 *
 * Las tablas que usan esta función mezclan categorías (el nivel departamento incluye FOODS_1,
 * HOBBIES_1 y HOUSEHOLD_1), así que el departamento se rotula con su categoría.
 */
function etiquetaClave(nivel: string, clave: string): string {
  if (nivel === 'producto') return etiquetaArticuloCorta(clave);
  return etiquetaNivel(nivel, clave);
}

const NIVEL_ETIQUETA: Record<string, string> = {
  total: 'Total del contexto',
  estado: 'Estado',
  tienda: 'Tienda',
  categoria: 'Categoría',
  departamento: 'Departamento',
  producto: 'Artículo',
};

export function PanelPronostico({
  pronosticos,
  evaluacion,
  cargando,
  nivel,
  etapa,
  origen,
  onNivel,
  onEtapa,
  onOrigen,
  contextoTerritorio,
  contextoCatalogo,
  error,
  estado,
  seleccion,
  onCompletar,
  onReintentar,
  onIrEvaluacion,
  descarga = false,
  simple = false,
}: {
  pronosticos: PronosticosRespuesta | null;
  evaluacion: EvaluacionRespuesta | null;
  cargando: boolean;
  nivel: NivelPronosticoNivel;
  etapa: 'desarrollo' | 'final';
  origen: 'futuro' | number;
  onNivel: (nivel: NivelPronosticoNivel) => void;
  onEtapa: (etapa: 'desarrollo' | 'final') => void;
  onOrigen: (origen: 'futuro' | number) => void;
  contextoTerritorio: string;
  contextoCatalogo: string;
  error: string | null;
  /** Estado excluyente de la consulta: cargando, incompleta, error, vacío o resultado. */
  estado: EstadoConsulta;
  /** Resolución de nivel y artículos, la misma que se envió a la API. */
  seleccion: SeleccionPronostico;
  /** Lleva al usuario a completar la selección (contexto activo). */
  onCompletar?: () => void;
  /** Reintenta la misma consulta: solo tiene sentido cuando la petición puede resolverse. */
  onReintentar: () => void;
  /** Enlace a «Evaluación»; en «Resultados» evita duplicar sus tablas. */
  onIrEvaluacion?: () => void;
  /** Muestra el botón de descarga del resultado filtrado (pantalla «Resultados»). */
  descarga?: boolean;
  /**
   * Deja solo el selector de nivel. En «Resultados» se consulta el pronóstico publicado;
   * los cortes de evaluación se eligen en la pantalla «Evaluación», no aquí.
   */
  simple?: boolean;
}) {
  const [segmento, setSegmento] = useState<SegmentoEvaluacion | null>(null);
  // La carga se expresa con `estado`; la bandera se conserva por compatibilidad de la API
  // del componente y se usa para el estado de espera cuando aún no hay resolución.
  void cargando;

  // Dos modos explícitos: «Pronóstico» (sin observaciones posteriores) y «Evaluación
  // histórica» (cortes completados, con el observado real detrás).
  const cortes = useMemo(() => {
    const lista = [{ valor: 'futuro', texto: 'Futuro' }];
    for (const ventana of evaluacion?.ventanas ?? []) {
      lista.push({
        // La fecha real del corte es la etiqueta principal; el identificador queda en el
        // valor y en el título accesible.
        valor: String(ventana.origen_d),
        texto: fechaCorta(ventana.origen_fecha),
      });
    }
    return lista;
  }, [evaluacion]);

  const cortesEvaluacion = useMemo(
    () => cortes.filter((corte) => corte.valor !== 'futuro'),
    [cortes],
  );
  const modo: 'pronostico' | 'evaluacion' = origen === 'futuro' ? 'pronostico' : 'evaluacion';

  /* Resultado ausente: se explica el estado real, no se afirma una ausencia que no se ha
     comprobado. Los controles (nivel, etapa y corte) siguen visibles para poder corregir. */
  if (!pronosticos || estado !== 'listo') {
    return (
      <section className="ac-panel" aria-labelledby="ac-t-pronostico-estado" data-estado={estado}>
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-pronostico-estado">Pronóstico diario de unidades · horizonte de 28 días</h3>
            <p className="ac-panel-sub">
              {contextoTerritorio} · {contextoCatalogo} ·{' '}
              {NIVEL_ETIQUETA[seleccion.nivel] ?? seleccion.nivel}
            </p>
          </div>
          <div className="ac-df-controles">
            <Segmentado<NivelPronosticoNivel>
              etiqueta="Nivel del pronóstico"
              valor={nivel}
              onElegir={onNivel}
              testid="selector-nivel"
              opciones={[
                { valor: 'total', texto: 'Total' },
                { valor: 'estado', texto: 'Estado' },
                { valor: 'tienda', texto: 'Tienda' },
                { valor: 'categoria', texto: 'Categoría' },
                { valor: 'departamento', texto: 'Departamento' },
                { valor: 'producto', texto: 'Artículo' },
              ]}
            />
          </div>
        </header>
        <EstadoConsultaPanel
          estado={estado}
          mensaje={estado === 'incompleta' ? seleccion.mensaje : error}
          seleccion={seleccion}
          onReintentar={onReintentar}
          onCompletar={onCompletar}
        />
        {/* La explicación general no depende del resultado: se conserva siempre. */}
        <details className="ac-metodologia">
          <summary>Qué predice este panel y con qué reglas</summary>
          <div className="ac-metodologia-cuerpo">
            <p>
              <strong>Qué predice.</strong> Unidades vendidas por día para el nivel elegido en
              los 28 días siguientes al fin del histórico, con su baseline estacional semanal
              calculado sobre las mismas fechas.
            </p>
            <p>
              <strong>Información permitida.</strong> En cada corte solo se usan días anteriores al
              corte; el observado posterior se emplea únicamente para medir y el precio de los 28
              días se congela en el último precio conocido. **Esta ejecución no usa precios**: ese
              supuesto pertenece a la variante con precios, que no se publicó.
            </p>
            <p>
              <strong>Grano.</strong> El detalle es artículo × tienda × día; cualquier nivel
              agregado se obtiene sumando esas mismas series, no con un modelo aparte.
            </p>
            <p>
              <strong>Límites.</strong> No hay intervalos de predicción calculados, ni WRMSSE, ni
              recomendaciones de compra o inventario. Los datos son históricos: el corte es el fin
              del histórico publicado, no la fecha de hoy.
            </p>
          </div>
        </details>
      </section>
    );
  }

  const modelo = pronosticos.modelo;
  const cobertura = pronosticos.cobertura;
  const evaluando = pronosticos.estado_evaluacion === 'con_observaciones';
  // Si el corte mostrado no tiene observaciones, los KPI usan la evaluación de los
  // cortes finales y lo dicen: nunca se presentan cifras de otro corte como propias.
  const metricasCandidato = pronosticos.metricas ?? evaluacion?.resumen ?? null;
  const metricasBaseline = pronosticos.baseline_metricas ?? evaluacion?.baseline_resumen ?? null;
  const origenKpi = pronosticos.metricas
    ? 'en este corte'
    : etapa === 'final'
      ? 'en los cortes finales'
      : 'en los cortes de desarrollo';

  // Resultado consultable: total del horizonte y promedio diario, sumando las series
  // publicadas (el agregado del nivel elegido, no una estimación aparte).
  const totalHorizonte = pronosticos.series.reduce(
    (total, serie) => total + serie.pronostico.reduce((suma, valor) => suma + (valor ?? 0), 0),
    0,
  );
  const promedioDiario = totalHorizonte / Math.max(1, pronosticos.horizonte);
  const resumenClaves =
    pronosticos.series.length === 1
      ? `clave ${pronosticos.series[0]?.clave ?? '—'}`
      : `${pronosticos.series.length} series del nivel ${pronosticos.nivel}`;

  const alDescargar = () => {
    const filas: (string | number | null)[][] = [];
    for (const serie of pronosticos.series) {
      pronosticos.dias.forEach((dia, posicion) => {
        filas.push([
          dia.fecha,
          dia.d,
          pronosticos.nivel,
          serie.clave,
          serie.pronostico[posicion] ?? null,
          serie.baseline[posicion] ?? null,
          serie.observado[posicion + pronosticos.historico_dias.length] ?? null,
        ]);
      });
    }
    descargarCsv({
      nombre: `atlas-comercial-pronostico-${pronosticos.nivel}-d${pronosticos.origen_d}`,
      metadatos: [
        [
          'Proyecto',
          'Walmart M5 — Planeación de demanda y evaluación de pronósticos · demanda y ventas',
        ],
        ['Ejecución', pronosticos.run_id ?? pronosticos.modelo?.run_id ?? ''],
        ['Modelo', pronosticos.modelo?.etiqueta ?? pronosticos.metodo],
        ['Variante', pronosticos.modelo?.variante ?? ''],
        ['Versión de datos', pronosticos.version],
        ['Versión de precios', pronosticos.modelo?.version_precios ?? 'sin precios'],
        ['Corte (fin del histórico)', pronosticos.origen_fecha],
        ['Inicio del pronóstico', pronosticos.dias[0]?.fecha ?? ''],
        ['Fin del pronóstico', pronosticos.dias.at(-1)?.fecha ?? ''],
        ['Horizonte (días)', pronosticos.horizonte],
        ['Nivel', pronosticos.nivel],
        ['Unidad', pronosticos.unidad],
        [
          'Supuesto de precios futuros',
          String(pronosticos.supuestos?.precio_futuro ?? 'no se usan precios'),
        ],
        ['Aviso', 'Datos históricos de M5; no son ventas actuales'],
      ],
      columnas: [
        'fecha',
        'd',
        'nivel',
        'clave',
        'unidades_pronosticadas',
        'unidades_baseline',
        'unidades_observadas',
      ],
      filas,
    });
  };

  return (
    <div className="ac-bloques">
      <section className="ac-panel" aria-labelledby="ac-t-futuro">
        <header className="ac-panel-cab ac-df-cab">
          <div>
            <h3 id="ac-t-futuro">Pronóstico diario de unidades · horizonte de 28 días</h3>
            <p className="ac-panel-sub">
              {contextoTerritorio} · {contextoCatalogo} · {NIVEL_ETIQUETA[pronosticos.nivel] ?? pronosticos.nivel}
            </p>
            <p className="ac-df-datos" data-testid="datos-corte">
              Fin del histórico: <strong>{fechaCorta(pronosticos.origen_fecha)}</strong> · Pronóstico:{' '}
              <strong>
                {pronosticos.rango_objetivo
                  ? `${fechaCorta(pronosticos.rango_objetivo.desde)} – ${fechaCorta(pronosticos.rango_objetivo.hasta)}`
                  : '—'}
              </strong>{' '}
              · {pronosticos.horizonte} días
            </p>
            <p className="ac-df-datos">
              Modelo: <strong>{modelo?.etiqueta ?? pronosticos.metodo}</strong> · Baseline:{' '}
              <strong>estacional semanal</strong>
              {modelo?.version_precios ? ` · precios ${modelo.version_precios}` : ''}
            </p>
            <p className="ac-df-datos" data-testid="grafico-alcance">
              Agregación de la gráfica: <strong>{alcanceGrafico(pronosticos)}</strong>
            </p>
          </div>
          <div className="ac-df-controles">
            <Segmentado<NivelPronosticoNivel>
              etiqueta="Nivel del pronóstico"
              valor={nivel}
              onElegir={onNivel}
              testid="selector-nivel"
              opciones={[
                { valor: 'total', texto: 'Total' },
                { valor: 'estado', texto: 'Estado' },
                { valor: 'tienda', texto: 'Tienda' },
                { valor: 'categoria', texto: 'Categoría' },
                { valor: 'departamento', texto: 'Departamento' },
                { valor: 'producto', texto: 'Artículo' },
              ]}
            />
            {simple ? null : (
            <Segmentado<'desarrollo' | 'final'>
              etiqueta="Cortes de la evaluación"
              valor={etapa}
              onElegir={onEtapa}
              testid="selector-etapa"
              opciones={[
                { valor: 'final', texto: 'Cortes finales' },
                { valor: 'desarrollo', texto: 'Desarrollo' },
              ]}
            />
            )}
            {simple ? null : (
            <Segmentado<'pronostico' | 'evaluacion'>
              etiqueta="Modo del análisis"
              valor={modo}
              onElegir={(siguiente) => {
                if (siguiente === 'pronostico') {
                  onOrigen('futuro');
                  return;
                }
                const primero = cortes.find((corte) => corte.valor !== 'futuro');
                onOrigen(primero ? Number(primero.valor) : 'futuro');
              }}
              testid="selector-modo-pronostico"
              opciones={[
                { valor: 'pronostico', texto: 'Pronóstico' },
                { valor: 'evaluacion', texto: 'Evaluación histórica' },
              ]}
            />
            )}
            {!simple && modo === 'evaluacion' && cortesEvaluacion.length > 0 ? (
              <Segmentado<string>
                etiqueta="Corte evaluado"
                valor={String(origen)}
                onElegir={(valor) => onOrigen(Number(valor))}
                testid="selector-corte"
                opciones={cortesEvaluacion}
              />
            ) : null}
          </div>
        </header>

        <p
          className={`ac-insignia${evaluando ? ' ac-insignia--evaluacion' : ''}`}
          data-testid="estado-pronostico"
        >
          {evaluando
            ? 'Evaluación histórica: el corte ya tiene observaciones posteriores, así que se puede puntuar'
            : 'Pronóstico: posterior al último dato observado. No hay observaciones de estas fechas, así que no se puntúa'}
        </p>

        {error ? <p className="ac-hx-aviso" role="alert">{error}</p> : null}

        <GraficoPronostico datos={pronosticos} />

        <ul className="ac-df-leyenda" data-testid="leyenda-pronostico">
          <li>
            <span className="ac-df-muestra ac-df-muestra--observado" /> Ventas observadas antes del
            corte
          </li>
          <li>
            <span className="ac-df-muestra ac-df-muestra--modelo" /> Pronóstico del modelo
          </li>
          <li>
            <span className="ac-df-muestra ac-df-muestra--baseline" /> Referencia estacional
          </li>
          {evaluando ? (
            <li>
              <span className="ac-df-muestra ac-df-muestra--real" /> Ventas observadas después del
              corte
            </li>
          ) : null}
        </ul>
        <details className="ac-df-agregacion" data-testid="leyenda-agregacion">
          <summary>Cómo se agrega esta gráfica</summary>
          <p>{definicionAgregacion(pronosticos)}</p>
        </details>

        <p className="ac-nota">
          Unidades vendidas del conjunto histórico de M5, no ventas actuales. La fecha de corte sale de las
          ventas observadas. No se dibuja banda de incertidumbre porque no se han calculado ni evaluado
          intervalos. Supuesto de precios: {pronosticos.supuestos?.precio_futuro ?? 'no se usan precios'}.
        </p>

        <dl className="ac-metricas ac-metricas--modelo">
          <div>
            <dt>Total pronosticado</dt>
            <dd>{numero(totalHorizonte)}</dd>
            <p className="ac-kpi-pie">
              unidades en los {pronosticos.horizonte} días · {resumenClaves}
            </p>
          </div>
          <div>
            <dt>Promedio diario</dt>
            <dd>{numero1(promedioDiario)}</dd>
            <p className="ac-kpi-pie">total ÷ {pronosticos.horizonte} días del horizonte</p>
          </div>
          <div>
            <dt>Cobertura del modelo</dt>
            <dd>
              {cobertura?.series_modelo ?? '—'}/{cobertura?.series ?? '—'}
            </dd>
            <p className="ac-kpi-pie">
              series pronosticadas · {cobertura?.fallback ?? 0} con fallback al baseline
            </p>
          </div>
          <div>
            <dt>MAE del candidato</dt>
            <dd>{metricasCandidato?.mae === null || !metricasCandidato ? 'n/c' : numero1(metricasCandidato.mae)}</dd>
            <p className="ac-kpi-pie">unidades por serie-día {origenKpi}</p>
          </div>
          <div>
            <dt>MAE del baseline</dt>
            <dd>
              {metricasBaseline?.mae === null || !metricasBaseline ? 'n/c' : numero1(metricasBaseline.mae)}
            </dd>
            <p className="ac-kpi-pie">misma serie y fechas {origenKpi}</p>
          </div>
          <div>
            <dt>WAPE</dt>
            <dd>
              {metricasCandidato?.wape === null || !metricasCandidato
                ? 'n/c'
                : `${numero1(metricasCandidato.wape)} %`}
            </dd>
            <p className="ac-kpi-pie">
              Σ|error| ÷ Σobservado · baseline{' '}
              {metricasBaseline?.wape === null || !metricasBaseline
                ? 'n/c'
                : `${numero1(metricasBaseline.wape)} %`}
              {' '}{origenKpi}
            </p>
          </div>
        </dl>
        <p className="ac-kpi-alcance">
          {evaluando
            ? 'Métricas del corte mostrado: error al grano artículo × tienda, calculado con las 30 490 series y los 28 días de esa ventana.'
            : 'Este corte no tiene observaciones posteriores, así que no se puntúa: los KPI muestran la evaluación de los cortes finales, no la de este pronóstico.'}
        </p>
      </section>

      <section className="ac-panel" aria-labelledby="ac-t-desglose">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-desglose">Desglose del resultado · nivel {pronosticos.nivel}</h3>
            <p className="ac-panel-sub">
              Total pronosticado por clave en los {pronosticos.horizonte} días · baseline en las
              mismas fechas
              {evaluando ? ' · observado del corte ya disponible' : ''}
            </p>
          </div>
          {descarga ? (
            <button type="button" className="ac-accion ac-accion--secundaria" onClick={alDescargar}>
              Descargar CSV de la selección
            </button>
          ) : null}
        </header>
        <div className="ac-tabla-marco">
          <table className="ac-tabla">
            <caption>
              Unidades del horizonte por clave · nivel {pronosticos.nivel} · corte{' '}
              {pronosticos.origen_fecha} · ejecución {pronosticos.run_id ?? '—'}
            </caption>
            <thead>
              <tr>
                <th scope="col">Clave</th>
                <th scope="col" className="ac-tabla-num">Total pronosticado</th>
                <th scope="col" className="ac-tabla-num">Promedio diario</th>
                <th scope="col" className="ac-tabla-num">Total baseline</th>
                <th scope="col" className="ac-tabla-num">Participación</th>
                {evaluando ? <th scope="col" className="ac-tabla-num">Total observado</th> : null}
              </tr>
            </thead>
            <tbody>
              {[...pronosticos.series]
                .map((serie) => {
                  const total = serie.pronostico.reduce((suma, valor) => suma + (valor ?? 0), 0);
                  const totalBase = serie.baseline.reduce((suma, valor) => suma + (valor ?? 0), 0);
                  const observado = serie.observado
                    .slice(pronosticos.historico_dias.length)
                    .reduce<number>((suma, valor) => suma + (valor ?? 0), 0);
                  return { clave: serie.clave, total, totalBase, observado };
                })
                .sort((a, b) => b.total - a.total)
                .map((fila) => (
                  <tr key={fila.clave}>
                    <th scope="row" title={fila.clave}>
                      {etiquetaClave(pronosticos.nivel, fila.clave)}
                      <span className="ac-plan-codigo">{fila.clave}</span>
                    </th>
                    <td className="ac-tabla-num">{numero(fila.total)}</td>
                    <td className="ac-tabla-num">
                      {numero1(fila.total / Math.max(1, pronosticos.horizonte))}
                    </td>
                    <td className="ac-tabla-num">{numero(fila.totalBase)}</td>
                    <td className="ac-tabla-num">
                      {totalHorizonte > 0
                        ? `${numero1((100 * fila.total) / totalHorizonte)} %`
                        : 'n/c'}
                    </td>
                    {evaluando ? (
                      <td className="ac-tabla-num">{numero(fila.observado)}</td>
                    ) : null}
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total del nivel</th>
                <td className="ac-tabla-num">{numero(totalHorizonte)}</td>
                <td className="ac-tabla-num">{numero1(promedioDiario)}</td>
                <td className="ac-tabla-num">
                  {numero(
                    pronosticos.series.reduce(
                      (suma, serie) =>
                        suma + serie.baseline.reduce((total, valor) => total + (valor ?? 0), 0),
                      0,
                    ),
                  )}
                </td>
                <td className="ac-tabla-num">{totalHorizonte > 0 ? '100 %' : 'n/c'}</td>
                {evaluando ? (
                  <td className="ac-tabla-num">
                    {numero(
                      pronosticos.series.reduce(
                        (suma, serie) =>
                          suma +
                          serie.observado
                            .slice(pronosticos.historico_dias.length)
                            .reduce<number>((total, valor) => total + (valor ?? 0), 0),
                        0,
                      ),
                    )}
                  </td>
                ) : null}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="ac-nota">
          El total del nivel es la suma de las claves mostradas; el baseline se calcula sobre las
          mismas fechas. Unidades vendidas históricas de M5, no ventas actuales: el corte es el fin
          del histórico publicado, no la fecha de hoy.
        </p>
      </section>

      {simple ? (
        <ResumenEvaluacion evaluacion={evaluacion} onIrEvaluacion={onIrEvaluacion} />
      ) : (
      <PanelEvaluacion
        evaluacion={evaluacion}
        etapa={etapa}
        segmento={segmento}
        onSegmento={setSegmento}
      />
      )}

      {simple ? null : (
      <section className="ac-panel" aria-labelledby="ac-t-metodo">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-metodo">Metodología del pronóstico</h3>
            <p className="ac-panel-sub">
              Qué predice, con qué variables, qué se supone conocido y cómo se evalúa
            </p>
          </div>
        </header>
        <div className="ac-df-metodo">
          <p>
            <strong>Qué predice.</strong> Unidades vendidas por día, para cada combinación artículo ×
            tienda, a 28 días. Los agregados (total, estado, tienda, categoría, departamento y sus cruces)
            se obtienen <strong>sumando esas predicciones</strong>, no entrenando modelos por nivel.
          </p>
          <p>
            <strong>Modelo.</strong> {modelo?.metodo ?? 'Modelo global de árboles'}. Estrategia{' '}
            <strong>global condicionada al horizonte</strong>: el día a predecir (1–28) es una variable más,
            y todas las variables de ventas se calculan con información hasta el origen, así que los días 8 a
            28 no usan ventas reales futuras.
          </p>
          <p>
            <strong>Variables.</strong>{' '}
            {modelo?.variables && modelo.variables.length > 0
              ? `${modelo.variables.length} en total: ${modelo.variables.slice(0, 12).join(', ')}…`
              : 'rezagos, medias móviles, calendario, eventos, SNAP y precios'}
            .
          </p>
          <p>
            <strong>Qué se supone conocido.</strong> El calendario del día objetivo (día de la semana, mes,
            semana del año, eventos y SNAP del estado de cada tienda) se conoce por adelantado.{' '}
            {modelo?.supuestos?.precio_futuro ?? 'Esta ejecución no usa precios.'}
          </p>
          <p>
            <strong>Cómo se evalúa.</strong> Cuatro cortes de desarrollo (d_1773, d_1801, d_1829 y d_1857)
            comparan las variantes con un criterio único: el menor WAPE de desarrollo frente al baseline. Los
            cortes finales d_1885 y d_1913 son posteriores al entrenamiento (que llega a d_1857), pero se
            consultaron antes de confirmar la publicación: <strong>no son un holdout intacto</strong>. Cada
            corte pronostica 28 días sin incorporar observaciones intermedias y compara candidato y baseline
            sobre las mismas series, fechas y filtros.
          </p>
          <p>
            <strong>Precios.</strong> El archivo de precios se importa por tienda × artículo × semana. Los
            cambios de precio <strong>no</strong> se etiquetan como promociones: M5 no contiene promociones ni
            inventario. La variante con precios se evaluó y no superó a la de calendario en los cortes de
            desarrollo, así que el modelo recomendado es la de calendario.
          </p>
          {modelo?.importancias && modelo.importancias.length > 0 ? (
            <div>
              <p>
                <strong>Importancia de variables</strong> (ganancia de LightGBM, no causalidad):
              </p>
              <ul className="ac-df-importancias">
                {modelo.importancias.slice(0, 8).map((fila) => (
                  <li key={fila.variable}>
                    <span className="ac-df-imp-nombre">{fila.variable}</span>
                    <span className="ac-df-imp-barra" aria-hidden="true">
                      <span
                        style={{
                          width: `${Math.max(
                            2,
                            (100 * fila.ganancia) / (modelo.importancias[0]?.ganancia || 1),
                          )}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <ul className="ac-limites">
            {(evaluacion?.limitaciones ?? []).map((limite) => (
              <li key={limite}>{limite}</li>
            ))}
          </ul>
        </div>
      </section>
      )}
    </div>
  );
}

/**
 * Resumen breve de evaluación para «Resultados».
 *
 * Solo las cifras que pertenecen al corte consultado y un enlace a «Evaluación», donde viven
 * la comparación completa, la matriz por horizonte, los segmentos y la tabla exacta. No se
 * repiten tablas ni la metodología.
 */
function ResumenEvaluacion({
  evaluacion,
  onIrEvaluacion,
}: {
  evaluacion: EvaluacionRespuesta | null;
  onIrEvaluacion?: () => void;
}) {
  const metricas = evaluacion?.resumen ?? null;
  const baseline = evaluacion?.baseline_resumen ?? null;
  return (
    <section className="ac-panel" aria-labelledby="ac-t-resumen-eval" data-testid="resultados-resumen-evaluacion">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-resumen-eval">Resumen de evaluación</h3>
          <p className="ac-panel-sub">
            Error del modelo frente al baseline en el grano de detalle (artículo × tienda × día),
            sobre {evaluacion?.ventanas.length ?? 0} ventanas de la etapa{' '}
            {evaluacion?.etapa ?? 'final'}
          </p>
        </div>
        {onIrEvaluacion ? (
          <button type="button" className="ac-accion ac-accion--secundaria" onClick={onIrEvaluacion}>
            Ver evaluación completa
          </button>
        ) : null}
      </header>
      <dl className="ac-dl">
        <dt>MAE · por artículo × tienda × día</dt>
        <dd>
          {metricas?.mae === null || metricas?.mae === undefined ? 'n/c' : numero1(metricas.mae)} · baseline{' '}
          {baseline?.mae === null || baseline?.mae === undefined ? 'n/c' : numero1(baseline.mae)}
        </dd>
        <dt>WAPE · por artículo × tienda × día</dt>
        <dd>
          {metricas?.wape === null || metricas?.wape === undefined
            ? 'n/c'
            : `${numero1(metricas.wape)} %`}{' '}
          · baseline{' '}
          {baseline?.wape === null || baseline?.wape === undefined ? 'n/c' : `${numero1(baseline.wape)} %`}
        </dd>
        <dt>Mejora del error</dt>
        <dd>
          {interpretarMejora(evaluacion?.resumen?.mae, evaluacion?.baseline_resumen?.mae).texto}
        </dd>
        <dt>Dónde está el detalle</dt>
        <dd>
          Comparación por horizonte, segmentos, matriz ventana × horizonte y tabla exacta: pantalla
          «Evaluación». Metodología, variables y ejecución: pantalla «Modelado».
        </dd>
      </dl>
    </section>
  );
}

/* --------------------------------------------------------------------------- */
/* Gráfica principal                                                           */
/* --------------------------------------------------------------------------- */

/**
 * Título de la gráfica en lenguaje comercial.
 *
 * La curva es una **suma por fecha** de las series del nivel elegido. El título dice qué se está
 * mirando (una tienda, un departamento, el total de N segmentos) sin vocabulario de
 * implementación; la definición de la agregación vive en la ayuda secundaria.
 */
export function alcanceGrafico(datos: PronosticosRespuesta): string {
  const series = datos.series.length;
  const nivel = datos.nivel;
  const claves = datos.series.map((serie) => serie.clave);
  const una = series === 1;
  if (nivel === 'tienda') {
    return una
      ? `Ventas de ${etiquetaTienda(claves[0] ?? '')}`
      : `Ventas totales de las ${numero(series)} tiendas seleccionadas`;
  }
  if (nivel === 'departamento') {
    return una
      ? `Ventas de ${etiquetaDepartamento(claves[0] ?? '')}`
      : `Ventas totales de los ${numero(series)} departamentos seleccionados`;
  }
  if (nivel === 'categoria') {
    return una
      ? `Ventas de ${etiquetaCategoria(claves[0] ?? '')}`
      : `Ventas totales de las ${numero(series)} categorías seleccionadas`;
  }
  if (nivel === 'estado') {
    return una
      ? `Ventas de ${etiquetaEstado(claves[0] ?? '')}`
      : `Ventas totales de los ${numero(series)} estados seleccionados`;
  }
  if (nivel === 'producto') {
    return una
      ? `Ventas de ${etiquetaArticulo(claves[0] ?? '')}`
      : `Ventas totales de los ${numero(series)} artículos seleccionados`;
  }
  return 'Ventas totales de todas las tiendas del contexto';
}

/** Definición de la agregación, para la ayuda secundaria de la gráfica. */
export function definicionAgregacion(datos: PronosticosRespuesta): string {
  const series = datos.series.length;
  const nivel = (NIVEL_ETIQUETA[datos.nivel] ?? datos.nivel).toLowerCase();
  if (series === 1) {
    return `La línea es la serie del nivel ${nivel}; no hay suma de segmentos.`;
  }
  return `Cada línea de la gráfica es la suma, fecha por fecha, de las ${numero(
    series,
  )} series del nivel ${nivel}. El número de series no es el número de líneas.`;
}

export function GraficoPronostico({
  datos,
  titulo,
}: {
  datos: PronosticosRespuesta;
  /** Título visible del bloque; si falta se usa el alcance deducido de los datos. */
  titulo?: string;
}) {
  const [indice, setIndice] = useState<number | null>(null);
  const alcance = alcanceGrafico(datos);
  const claves = [
    ...datos.historico_dias.map((d) => `d_${d}`),
    ...datos.dias.map((dia) => `d_${dia.d}`),
  ];
  const horizonte = datos.dias.length;
  const inicial = datos.historico_dias.length;

  /* Suma por día devolviendo un arreglo **denso**: un hueco (día sin dato) es ``null``,
     nunca un índice ausente, para que las escalas no reciban ``undefined``. */
  const total = inicial + horizonte;
  const sumar = (campo: 'observado' | 'pronostico' | 'baseline', desplazamiento: number) => {
    const suma = new Array<number>(total).fill(0);
    const conDato = new Array<boolean>(total).fill(false);
    for (const serie of datos.series) {
      const vector = serie[campo] as (number | null)[];
      vector.forEach((valor, posicion) => {
        const destino = posicion + desplazamiento;
        if (valor === null || valor === undefined || destino < 0 || destino >= total) return;
        suma[destino] = (suma[destino] ?? 0) + valor;
        conDato[destino] = true;
      });
    }
    return suma.map((valor, posicion) => (conDato[posicion] ? valor : null)) as (number | null)[];
  };

  // ``series[].observado`` trae la historia y los 28 días del horizonte: el
  // observado posterior al corte solo existe en los cortes de evaluación.
  const observado = sumar('observado', 0);
  const pronostico = sumar('pronostico', inicial);
  const baseline = sumar('baseline', inicial);
  const observadoPosterior = observado;

  const maximo = Math.max(
    1,
    ...observado.map((valor) => valor ?? 0),
    ...pronostico.map((valor) => valor ?? 0),
    ...baseline.map((valor) => valor ?? 0),
    ...observadoPosterior.map((valor) => valor ?? 0),
  );
  const ancho = 720;
  const alto = 260;
  const margen = { arriba: 16, derecha: 16, abajo: 30, izquierda: 54 };
  const anchoTrazado = ancho - margen.izquierda - margen.derecha;
  const altoTrazado = alto - margen.arriba - margen.abajo;
  const escalaX = scalePoint<string>().domain(claves).range([0, anchoTrazado]);
  const escalaY = scaleLinear().domain([0, maximo]).nice().range([altoTrazado, 0]);
  const x = (posicion: number) => escalaX(claves[posicion] ?? '') ?? 0;

  const trayectoria = (valores: (number | null)[], desde: number, hasta: number) => {
    const puntos = valores
      .slice(desde, hasta)
      .map((valor, indice2) => ({ x: x(desde + indice2), y: escalaY(valor ?? Number.NaN) }))
      .filter((punto) => Number.isFinite(punto.y));
    return line<{ x: number; y: number }>()
      .x((punto) => punto.x)
      .y((punto) => punto.y)(puntos);
  };

  const corteX = x(inicial - 1);
  const finX = x(claves.length - 1);
  const marcasY = escalaY.ticks(4);
  const ANCHO_ANOTACION = 182;
  const xAnotacion =
    corteX + 8 + ANCHO_ANOTACION <= anchoTrazado
      ? Math.max(corteX + 8, 0)
      : Math.max(0, corteX - 8 - ANCHO_ANOTACION);

  const cercano = (clientX: number, caja: DOMRect) => {
    const relativo = ((clientX - caja.left) / caja.width) * ancho - margen.izquierda;
    let elegido = 0;
    let distancia = Infinity;
    claves.forEach((clave, posicion) => {
      const delta = Math.abs((escalaX(clave) ?? 0) - relativo);
      if (delta < distancia) {
        distancia = delta;
        elegido = posicion;
      }
    });
    return elegido;
  };

  const activo = indice !== null ? indice : null;
  const fechaActiva = activo !== null ? claveFecha(claves[activo] ?? '', datos) : null;
  const esFuturo = activo !== null && activo >= inicial;

  return (
    <div className="ac-df-grafico">
      <div
        className="ac-hx-centro"
        tabIndex={0}
        role="group"
        aria-label="Gráfica de pronóstico diario; usa las flechas para recorrer los días"
        onKeyDown={(evento) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
          evento.preventDefault();
          setIndice((previo) => {
            const actual = previo ?? 0;
            if (evento.key === 'Home') return 0;
            if (evento.key === 'End') return claves.length - 1;
            return Math.max(0, Math.min(claves.length - 1, actual + (evento.key === 'ArrowRight' ? 1 : -1)));
          });
        }}
      >
        <svg
          viewBox={`0 0 ${ancho} ${alto}`}
          role="img"
          aria-label={`${titulo ?? alcance}. Histórico observado y pronóstico de ${horizonte} días del modelo y del baseline, con la fecha de corte. Cuatro líneas: observado hasta el corte, modelo, baseline y observado posterior.`}
          onPointerMove={(evento) => setIndice(cercano(evento.clientX, evento.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setIndice(null)}
        >
          <g transform={`translate(${margen.izquierda} ${margen.arriba})`}>
            {marcasY.map((valor) => (
              <g key={`y-${valor}`}>
                <line x1={0} x2={anchoTrazado} y1={escalaY(valor)} y2={escalaY(valor)} className="ac-eje-linea" />
                <text x={-8} y={escalaY(valor) + 3} textAnchor="end" className="ac-eje-texto">
                  {numero(valor)}
                </text>
              </g>
            ))}

            {/* Zona del pronóstico: gris muy tenue, detrás de todo. */}
            <rect
              x={corteX}
              y={0}
              width={Math.max(0, finX - corteX)}
              height={altoTrazado}
              className="ac-banda-pronostico"
              data-testid="banda-pronostico"
            />
            <text x={corteX + 6} y={12} className="ac-banda-etq">
              Pronóstico · 28 días
            </text>

            <path d={trayectoria(observado, 0, inicial) ?? ''} className="ac-linea ac-df-observado" />
            <path d={trayectoria(baseline, inicial - 1, inicial + horizonte) ?? ''} className="ac-df-baseline" />
            <path d={trayectoria(pronostico, inicial - 1, inicial + horizonte) ?? ''} className="ac-df-modelo" />
            {observadoPosterior.slice(inicial).some((valor) => valor !== null) ? (
              <path
                d={trayectoria(observadoPosterior, inicial - 1, inicial + horizonte) ?? ''}
                className="ac-df-real"
                data-testid="observado-posterior"
              />
            ) : null}

            {/* Guía del corte y su anotación. La caja se coloca a la derecha del corte
                salvo que no quepa: entonces pasa a la izquierda para no salir del área. */}
            <line x1={corteX} x2={corteX} y1={0} y2={altoTrazado} className="ac-corte" data-testid="corte" />
            <g transform={`translate(${xAnotacion} ${altoTrazado - 44})`}>
              <rect width={ANCHO_ANOTACION} height={30} rx={6} className="ac-anotacion-caja" />
              <text x={7} y={12} className="ac-anotacion-titulo">
                Fin de datos observados
              </text>
              <text x={7} y={24} className="ac-anotacion-fecha">
                {fechaCorta(datos.origen_fecha)}
              </text>
            </g>

            {activo !== null ? (
              <g>
                <line x1={x(activo)} x2={x(activo)} y1={0} y2={altoTrazado} className="ac-hx-guia" />
                {observado[activo] !== null && observado[activo] !== undefined ? (
                  <circle cx={x(activo)} cy={escalaY(observado[activo] as number)} r={3.2} className="ac-df-punto" />
                ) : null}
                {esFuturo && pronostico[activo] !== null && pronostico[activo] !== undefined ? (
                  <circle cx={x(activo)} cy={escalaY(pronostico[activo] as number)} r={3.2} className="ac-df-punto--modelo" />
                ) : null}
                {esFuturo && baseline[activo] !== null && baseline[activo] !== undefined ? (
                  <circle cx={x(activo)} cy={escalaY(baseline[activo] as number)} r={2.6} className="ac-df-punto--base" />
                ) : null}
                {esFuturo && observadoPosterior[activo] !== null && observadoPosterior[activo] !== undefined ? (
                  <circle cx={x(activo)} cy={escalaY(observadoPosterior[activo] as number)} r={3.2} className="ac-df-punto--real" />
                ) : null}
              </g>
            ) : null}

            {[0, Math.floor(claves.length / 2), claves.length - 1].map((posicion) => (
              <text
                key={`x-${posicion}`}
                x={x(posicion)}
                y={altoTrazado + 16}
                textAnchor={posicion === 0 ? 'start' : posicion === claves.length - 1 ? 'end' : 'middle'}
                className="ac-eje-texto"
              >
                {claveFechaEtiqueta(claves[posicion] ?? '', datos)}
              </text>
            ))}
            <text x={-8} y={-4} textAnchor="end" className="ac-eje-texto">
              u
            </text>
          </g>
        </svg>
      </div>

      <p className="ac-hx-lectura" role="status" aria-live="polite">
        {activo !== null && fechaActiva ? (
          <>
            <strong>{fechaActiva}</strong> ·{' '}
            {esFuturo ? (
              <>
                modelo {numero1(pronostico[activo] ?? 0)} u · baseline {numero1(baseline[activo] ?? 0)} u
                {observadoPosterior[activo] !== null && observadoPosterior[activo] !== undefined
                  ? ` · observado ${numero1(observadoPosterior[activo] as number)} u`
                  : ' · sin observación todavía'}
              </>
            ) : (
              <>observado {numero1(observado[activo] ?? 0)} u</>
            )}
          </>
        ) : (
          <>
            Pasa el cursor por la gráfica o usa ← → para leer cada día. El fondo gris marca los 28 días
            pronosticados; la línea gris gruesa es el baseline.
          </>
        )}
      </p>
    </div>
  );
}

function claveFecha(clave: string, datos: PronosticosRespuesta): string {
  const dia = Number(clave.replace('d_', ''));
  const encontrado = datos.dias.find((fila) => fila.d === dia);
  if (encontrado) return fechaCorta(encontrado.fecha);
  const posicion = datos.historico_dias.indexOf(dia);
  if (posicion >= 0) {
    const origen = new Date(`${datos.origen_fecha}T00:00:00`);
    const fecha = new Date(origen);
    fecha.setDate(origen.getDate() - (datos.historico_dias.length - 1 - posicion));
    return fechaCorta(fecha.toISOString().slice(0, 10));
  }
  return clave;
}

function claveFechaEtiqueta(clave: string, datos: PronosticosRespuesta): string {
  const texto = claveFecha(clave, datos);
  return texto.replace(` ${new Date().getFullYear()}`, '');
}

/* --------------------------------------------------------------------------- */
/* Evaluación                                                                  */
/* --------------------------------------------------------------------------- */

function Metrica({ etiqueta, valor, pie }: { etiqueta: string; valor: string; pie: string }) {
  return (
    <div>
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
      <p className="ac-kpi-pie">{pie}</p>
    </div>
  );
}

/**
 * Estados excluyentes de la consulta del pronóstico.
 *
 * Cada estado ofrece solo la salida que puede resolverlo: reintentar cuando la petición
 * puede volver a intentarse, completar los controles cuando falta una selección y ajustar
 * el nivel cuando la API rechaza la consulta. Nunca se anuncia «sin pronóstico publicado»
 * si no hay una respuesta válida que lo confirme.
 */
function EstadoConsultaPanel({
  estado,
  mensaje,
  seleccion,
  onReintentar,
  onCompletar,
}: {
  estado: EstadoConsulta;
  mensaje: string | null;
  seleccion: SeleccionPronostico;
  onReintentar: () => void;
  onCompletar?: () => void;
}) {
  if (estado === 'cargando') {
    return (
      <div className="ac-esqueleto" role="status" aria-busy="true" data-testid="estado-cargando">
        <span>Calculando el pronóstico…</span>
      </div>
    );
  }

  if (estado === 'incompleta') {
    return (
      <div className="ac-estado" role="status" data-testid="estado-incompleta">
        <h4>Selección incompleta</h4>
        <p>{mensaje ?? 'Faltan datos para consultar el pronóstico por artículo.'}</p>
        <p className="ac-nota">
          El nivel <strong>Artículo</strong> necesita una tienda y un artículo del catálogo. Los
          controles del contexto activo están arriba: al completarlos la consulta se hace sola,
          sin enviar peticiones inválidas.
        </p>
        <div className="ac-acciones">
          {onCompletar ? (
            <button type="button" className="ac-accion" onClick={onCompletar}>
              Completar selección
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (estado === 'error_validacion') {
    return (
      <div className="ac-estado ac-estado--error" role="alert" data-testid="estado-error-validacion">
        <h4>La consulta no es válida para el nivel elegido</h4>
        <p>{mensaje ?? 'La API rechazó la combinación de nivel y filtros.'}</p>
        <p className="ac-nota">
          Reintentar no cambia el resultado: hay que ajustar el nivel o el contexto. Las
          validaciones de la API se conservan y aquí no se sustituyen por «todos».
        </p>
        {onCompletar ? (
          <div className="ac-acciones">
            <button type="button" className="ac-accion" onClick={onCompletar}>
              Ajustar la selección
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (estado === 'error_conexion') {
    return (
      <div className="ac-estado ac-estado--error" role="alert" data-testid="estado-error-conexion">
        <h4>No se pudo cargar el pronóstico</h4>
        <p>{mensaje ?? 'No se pudo contactar la API del pronóstico.'}</p>
        <div className="ac-acciones">
          <button type="button" className="ac-accion" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (estado === 'sin_resultados') {
    return (
      <div className="ac-vacio" role="status" data-testid="estado-sin-resultados">
        <p>
          La consulta es válida y no devolvió series para este contexto. No es un error: la API
          respondió correctamente y el nivel «{NIVEL_ETIQUETA[seleccion.nivel] ?? seleccion.nivel}»
          no tiene datos con estos filtros.
        </p>
        <p className="ac-nota">
          Revisa el contexto (territorio y catálogo) o vuelve a un nivel agregado para ver el
          pronóstico disponible.
        </p>
      </div>
    );
  }

  return null;
}

type NivelSegmento = 'tienda' | 'departamento' | 'categoria' | 'estado';

/** Orden en que se prefieren los niveles: del más operativo (tienda) al más agregado. */
const ORDEN_NIVELES_SEGMENTO: NivelSegmento[] = ['tienda', 'departamento', 'categoria', 'estado'];

const ETIQUETA_NIVEL_SEGMENTO: Record<NivelSegmento, string> = {
  tienda: 'Tiendas',
  departamento: 'Departamentos',
  categoria: 'Categorías',
  estado: 'Estados',
};

/** Clave del segmento con nombre legible; el código original queda en el título. */
/* La tabla de segmentos mezcla niveles y, dentro de departamento, mezcla categorías:
   «Alimentos · Departamento 1» es la identidad principal; el código va aparte. */
function etiquetaSegmento(nivel: string, clave: string): string {
  if (nivel === 'categoria') return etiquetaCategoriaCorta(clave);
  if (nivel === 'estado') return etiquetaEstadoCorto(clave);
  return etiquetaNivel(nivel, clave);
}

export function PanelEvaluacion({
  evaluacion,
  etapa,
  cargando = false,
  onEtapa,
  etapas,
  nivel,
  onNivel,
  segmento,
  onSegmento,
}: {
  evaluacion: EvaluacionRespuesta | null;
  etapa: 'desarrollo' | 'final';
  cargando?: boolean;
  /** Si se entrega, el bloque expone su propio control de etapa (misma fuente de estado). */
  onEtapa?: (etapa: 'desarrollo' | 'final') => void;
  etapas?: { valor: 'desarrollo' | 'final'; texto: string }[];
  /** Nivel compartido con la gráfica: si se entregan ambos, la dimensión del desglose es el mismo
   *  estado y los dos selectores no pueden divergir. */
  nivel?: NivelPronosticoNivel;
  onNivel?: (nivel: NivelPronosticoNivel) => void;
  segmento: SegmentoEvaluacion | null;
  onSegmento: (segmento: SegmentoEvaluacion | null) => void;
}) {
  const horizontes = evaluacion?.por_horizonte ?? [];
  const segmentos = evaluacion?.segmentos ?? [];

  /* El informe no trae siempre los cuatro niveles: con un filtro de departamento, el nivel
     «tienda» puede no existir. Se ofrecen solo los niveles que el propio informe publica y el
     nivel activo se resuelve contra ellos, de modo que la tabla nunca queda vacía por pedir un
     nivel ausente. */
  const nivelesDisponibles = useMemo(() => {
    const presentes = new Set(segmentos.map((fila) => fila.nivel));
    return ORDEN_NIVELES_SEGMENTO.filter((nivel) => presentes.has(nivel));
  }, [segmentos]);

  const [nivelElegido, setNivelElegido] = useState<NivelSegmento | null>(null);
  /* Con nivel compartido manda ese estado; «Total» no es una dimensión del desglose, así que se
     muestra la primera dimensión disponible y elegir otra mueve el mismo estado. */
  const compartido = Boolean(onNivel) && nivel !== undefined;
  const nivelCompartido: NivelSegmento | null =
    compartido && nivel && nivel !== 'total' && nivelesDisponibles.includes(nivel as NivelSegmento)
      ? (nivel as NivelSegmento)
      : (nivelesDisponibles[0] ?? null);
  const nivelSegmento: NivelSegmento | null = compartido
    ? nivelCompartido
    : nivelElegido && nivelesDisponibles.includes(nivelElegido)
      ? nivelElegido
      : (nivelesDisponibles[0] ?? null);

  const visibles = useMemo(
    () => (nivelSegmento ? segmentos.filter((fila) => fila.nivel === nivelSegmento) : []),
    [segmentos, nivelSegmento],
  );

  /* Orden y filtro del detalle: sirven para revisar primero los segmentos con más error que el
     baseline. El recuento de cabecera sigue siendo el del nivel completo; aquí se declara cuántos
     se están mostrando. */
  const [ordenSegmento, setOrdenSegmento] = useState<'identidad' | 'mae' | 'mejora'>('identidad');
  const [soloPeores, setSoloPeores] = useState(false);
  const peores = useMemo(
    () =>
      visibles.filter((fila) => {
        const diferencia = interpretarMejora(fila.candidato.mae, fila.baseline.mae);
        return diferencia.tipo === 'mayor_error';
      }),
    [visibles],
  );
  const mostrados = useMemo(() => {
    const base = soloPeores ? peores : [...visibles];
    if (ordenSegmento === 'mae') {
      return base.sort((a, b) => (b.candidato.mae ?? 0) - (a.candidato.mae ?? 0));
    }
    if (ordenSegmento === 'mejora') {
      return base.sort(
        (a, b) => (a.mejora_pct ?? Number.POSITIVE_INFINITY) - (b.mejora_pct ?? Number.POSITIVE_INFINITY),
      );
    }
    return base;
  }, [visibles, peores, soloPeores, ordenSegmento]);

  /* Recuento sobre el nivel activo: el informe trae segmentos de varios niveles y citar el
     total del informe como si fuera el de la pestaña visible es lo que confundía diez
     tiendas con veintitrés segmentos. Se distinguen mejora, empate, deterioro y no
     calculable, siempre al grano de detalle. */
  const recuento = useMemo(() => {
    let mejoran = 0;
    let empatan = 0;
    let empeoran = 0;
    let sinCalcular = 0;
    for (const fila of visibles) {
      const mejora = fila.mejora_pct;
      if (mejora === null || mejora === undefined) sinCalcular += 1;
      else if (Math.abs(mejora) < 1e-9) empatan += 1;
      else if (mejora > 0) mejoran += 1;
      else empeoran += 1;
    }
    return { mejoran, empatan, empeoran, sinCalcular, total: visibles.length };
  }, [visibles]);

  if (!evaluacion) {
    return (
      <section className="ac-panel" aria-labelledby="ac-t-eval" data-testid="evaluacion-panel-vacio">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-eval">Evaluación del pronóstico</h3>
            <p className="ac-panel-sub">
              {cargando
                ? 'Calculando el desglose por segmento…'
                : etapa === 'desarrollo'
                  ? 'Esta ejecución no publica cortes de desarrollo: no hay desglose que mostrar.'
                  : 'Sin evaluación publicada para esta ejecución.'}
            </p>
          </div>
          {onEtapa && etapas?.length ? (
            <Segmentado<'desarrollo' | 'final'>
              etiqueta="Etapa del desglose"
              valor={etapa}
              onElegir={onEtapa}
              testid="selector-etapa-segmentos"
              opciones={etapas}
            />
          ) : null}
        </header>
      </section>
    );
  }

  const candidato = evaluacion.resumen;
  const baseline = evaluacion.baseline_resumen;

  return (
    <section className="ac-panel" aria-labelledby="ac-t-eval">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-eval">
            Evaluación del pronóstico · {etapa === 'final' ? 'cortes finales' : 'cortes de desarrollo'}
          </h3>
          <p className="ac-panel-sub">
            Consolidado de {numero(evaluacion.ventanas.length)}{' '}
            {evaluacion.ventanas.length === 1 ? 'ventana' : 'ventanas'} de {evaluacion.horizonte}{' '}
            días de la etapa <strong>{etapa === 'final' ? 'cortes finales' : 'desarrollo'}</strong> ·{' '}
            {evaluacion.ventanas.map((ventana) => fechaCorta(ventana.origen_fecha)).join(' · ')} ·
            error al grano artículo × tienda. Esta tabla no se filtra por el corte de la gráfica.
          </p>
        </div>
        <p className="ac-insignia" data-testid="mejora-wape">
          {interpretarMejora(candidato.mae, baseline?.mae).texto}
        </p>
      </header>

      <div className="ac-tabla-marco ac-tabla-marco--comparativa">
        <table className="ac-tabla ac-tabla--comparativa">
          <caption>
            Candidato frente al baseline en las mismas series, fechas y filtros
            {etapa === 'final'
              ? ' · cortes finales ya vistos al confirmar la publicación: no son un holdout intacto'
              : ' · cortes usados para elegir la variante'}
          </caption>
          <thead>
            <tr>
              <th scope="col">Métrica</th>
              <th scope="col">Candidato</th>
              <th scope="col">Baseline</th>
              <th scope="col">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">MAE (unidades por serie-día)</th>
              <td>{candidato.mae === null ? 'n/c' : numero1(candidato.mae)}</td>
              <td>{baseline?.mae === null || !baseline ? 'n/c' : numero1(baseline.mae)}</td>
              <td>
                {baseline?.mae === null || !baseline || candidato.mae === null
                  ? '—'
                  : `${candidato.mae - baseline.mae > 0 ? '+' : ''}${numero1(candidato.mae - baseline.mae)}`}
              </td>
            </tr>
            <tr>
              <th scope="row">
                Sesgo (pronóstico − observado)
                <span className="ac-plan-codigo">{UNIDAD_SESGO.diario}</span>
              </th>
              <td>{candidato.sesgo === null ? 'n/c' : numero2(candidato.sesgo)}</td>
              <td>{baseline?.sesgo === null || !baseline ? 'n/c' : numero2(baseline.sesgo)}</td>
              <td>—</td>
            </tr>
            <tr>
              <th scope="row">WAPE (Σ|error| ÷ Σobservado)</th>
              <td>{candidato.wape === null ? 'n/c' : `${numero1(candidato.wape)} %`}</td>
              <td>{baseline?.wape === null || !baseline ? 'n/c' : `${numero1(baseline.wape)} %`}</td>
              <td>
                {baseline?.wape === null || !baseline || candidato.wape === null
                  ? '—'
                  : `${candidato.wape - baseline.wape > 0 ? '+' : ''}${numero1(candidato.wape - baseline.wape)} pp`}
              </td>
            </tr>
            <tr>
              <th scope="row">Observaciones evaluadas</th>
              <td>{numero(candidato.n)}</td>
              <td>{baseline ? numero(baseline.n) : '—'}</td>
              <td>—</td>
            </tr>
            <tr>
              <th scope="row">Denominador observado</th>
              <td>{numero(candidato.denominador)}</td>
              <td>{baseline ? numero(baseline.denominador) : '—'}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="ac-nota">
        Mejora = (error baseline − error modelo) ÷ error baseline: positiva se escribe «% menos error» y
        negativa «% más error»; por debajo de 0,05 % se declara «mismo error» y con baseline en cero no se
        calcula porcentaje. Es precisión, no crecimiento de ventas. Los agregados se obtienen sumando
        predicción y observado antes de medir, de modo que sus errores no coinciden con el promedio de los
        errores por serie: sumar MAE de segmentos no da el MAE nacional.
      </p>

      {horizontes.length > 0 ? (
        <div className="ac-df-horizontes">
          <div className="ac-df-horizontes-cab">
            <h4>Error por horizonte (día 1 a {horizontes.length})</h4>
            <p className="ac-panel-sub">
              Cada barra es el MAE del día correspondiente, sumando las ventanas evaluadas.
            </p>
          </div>
          <div className="ac-df-barras" role="img" aria-label="MAE por horizonte del candidato y del baseline">
            {horizontes.map((punto) => {
              const maximo = Math.max(...horizontes.map((fila) => fila.baseline.mae ?? 0), 1);
              return (
                <div className="ac-df-barra-col" key={punto.horizonte} title={`Día ${punto.horizonte}`}>
                  <div className="ac-df-barra-par">
                    <span
                      className="ac-df-barra ac-df-barra--modelo"
                      style={{ height: `${Math.max(2, (100 * (punto.candidato.mae ?? 0)) / maximo)}%` }}
                    />
                    <span
                      className="ac-df-barra ac-df-barra--baseline"
                      style={{ height: `${Math.max(2, (100 * (punto.baseline.mae ?? 0)) / maximo)}%` }}
                    />
                  </div>
                  <span className="ac-df-barra-etq">{punto.horizonte}</span>
                </div>
              );
            })}
          </div>
          <ul className="ac-df-leyenda">
            <li>
              <span className="ac-df-muestra ac-df-muestra--modelo" /> Modelo
            </li>
            <li>
              <span className="ac-df-muestra ac-df-muestra--baseline" /> Baseline
            </li>
            <li>MAE en unidades por serie-día</li>
          </ul>
        </div>
      ) : null}

      <div className="ac-df-segmentos">
        <div className="ac-df-segmentos-cab">
          <div>
            <h4>Resultados por segmento</h4>
            <p className="ac-panel-sub" data-testid="resumen-segmentos">
              {nivelSegmento ? (
                <>
                  Nivel <strong>{ETIQUETA_NIVEL_SEGMENTO[nivelSegmento]}</strong> ·{' '}
                  {numero(recuento.total)}{' '}
                  {recuento.total === 1 ? 'segmento' : 'segmentos'} con error al grano artículo ×
                  tienda × día: {numero(recuento.mejoran)} mejoran · {numero(recuento.empatan)}{' '}
                  empatan · {numero(recuento.empeoran)} con más error ·{' '}
                  {numero(recuento.sinCalcular)} sin mejora calculable. Se muestran{' '}
                  {numero(mostrados.length)}. El recuento cubre el mismo conjunto y grano que la
                  tabla (los filtros activos) y se recalcula al cambiar de dimensión; no es el total
                  del informe completo.{' '}
                  {compartido
                    ? 'La dimensión comparte estado con el nivel de la gráfica; «Total» no es una dimensión del desglose.'
                    : ''}
                </>
              ) : (
                <>El informe no publica segmentos para estos filtros.</>
              )}
            </p>
          </div>
        </div>

        <div className="ac-df-segmentos-controles" data-testid="controles-segmentos">
          {onEtapa && etapas?.length ? (
            <Segmentado<'desarrollo' | 'final'>
              etiqueta="Etapa del desglose"
              valor={etapa}
              onElegir={onEtapa}
              testid="selector-etapa-segmentos"
              opciones={etapas}
            />
          ) : null}
          {nivelesDisponibles.length > 1 ? (
            <Segmentado<NivelSegmento>
              etiqueta="Dimensión del desglose"
              valor={(nivelSegmento ?? nivelesDisponibles[0]) as NivelSegmento}
              onElegir={(valor) => {
                if (compartido && onNivel) {
                  onNivel(valor as NivelPronosticoNivel);
                } else {
                  setNivelElegido(valor);
                }
                onSegmento(null);
              }}
              testid="selector-segmento"
              opciones={nivelesDisponibles.map((opcion) => ({
                valor: opcion,
                texto: ETIQUETA_NIVEL_SEGMENTO[opcion],
              }))}
            />
          ) : null}
          <label className="ac-campo">
            <span>Orden del detalle</span>
            <select
              value={ordenSegmento}
              onChange={(evento) =>
                setOrdenSegmento(evento.target.value as 'identidad' | 'mae' | 'mejora')
              }
              data-testid="orden-segmentos"
            >
              <option value="identidad">Por nombre</option>
              <option value="mae">Mayor MAE del modelo</option>
              <option value="mejora">Peor mejora frente al baseline</option>
            </select>
          </label>
          <label className="ac-campo ac-campo--casilla">
            <input
              type="checkbox"
              checked={soloPeores}
              onChange={(evento) => setSoloPeores(evento.target.checked)}
              data-testid="filtro-peores"
            />
            <span>Solo segmentos con más error que el baseline ({numero(peores.length)})</span>
          </label>
        </div>

        <div className="ac-tabla-marco ac-tabla-marco--segmentos">
          <table className="ac-tabla-productos">
            <caption>
              {nivelSegmento ? ETIQUETA_NIVEL_SEGMENTO[nivelSegmento] : 'Segmentos'} · MAE y WAPE por
              serie y del segmento agregado. «Más error» compara el MAE del segmento con el del
              baseline estacional en las mismas series, fechas y filtros (grano artículo × tienda ×
              día); no es una recomendación de compra ni una decisión de abastecimiento.
            </caption>
            <thead>
              <tr>
                <th scope="col">Segmento</th>
                <th scope="col" className="ac-tabla-num">
                  Series
                </th>
                <th scope="col" className="ac-tabla-num">
                  MAE modelo
                </th>
                <th scope="col" className="ac-tabla-num">
                  MAE baseline
                </th>
                <th scope="col" className="ac-tabla-num">
                  WAPE modelo
                </th>
                <th scope="col" className="ac-tabla-num">
                  WAPE baseline
                </th>
                <th scope="col" className="ac-tabla-num">
                  Mejora
                </th>
                <th scope="col" className="ac-tabla-num">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {mostrados.map((fila) => (
                <tr key={`${fila.nivel}-${fila.clave}`}>
                  <th scope="row" className="ac-tabla-id" title={fila.clave}>
                    {etiquetaSegmento(fila.nivel, fila.clave)}
                  </th>
                  <td className="ac-tabla-num">{numero(fila.series)}</td>
                  <td className="ac-tabla-num">{fila.candidato.mae === null ? 'n/c' : numero1(fila.candidato.mae)}</td>
                  <td className="ac-tabla-num">{fila.baseline.mae === null ? 'n/c' : numero1(fila.baseline.mae)}</td>
                  <td className="ac-tabla-num">{fila.candidato.wape === null ? 'n/c' : `${numero1(fila.candidato.wape)} %`}</td>
                  <td className="ac-tabla-num">{fila.baseline.wape === null ? 'n/c' : `${numero1(fila.baseline.wape)} %`}</td>
                  <td
                    className="ac-tabla-num"
                    title={interpretarMejora(fila.candidato.mae, fila.baseline.mae).detalle}
                  >
                    {interpretarMejora(fila.candidato.mae, fila.baseline.mae).textoCorto}
                  </td>
                  <td className="ac-tabla-num">
                    <button
                      type="button"
                      className="ac-accion ac-accion--secundaria"
                      onClick={() => onSegmento(segmento === fila ? null : fila)}
                      aria-expanded={segmento === fila}
                    >
                      {segmento === fila ? 'Ocultar' : 'Ver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {soloPeores && peores.length === 0 ? (
          <p className="ac-vacio" role="status" data-testid="segmentos-sin-peores">
            Ningún segmento de este nivel tiene más error que el baseline con los filtros activos.
          </p>
        ) : null}

        {nivelSegmento && visibles.length === 0 ? (
          <p className="ac-vacio" role="status" data-testid="segmentos-vacio">
            El nivel «{ETIQUETA_NIVEL_SEGMENTO[nivelSegmento]}» no devolvió segmentos con estos
            filtros. Elige otro nivel disponible o amplía el contexto.
          </p>
        ) : null}

        {segmento ? (
          <div className="ac-df-segmento-detalle" data-testid="detalle-segmento">
            <h5>
              {NIVEL_ETIQUETA[segmento.nivel] ?? segmento.nivel}{' '}
              {etiquetaSegmento(segmento.nivel, segmento.clave)} · {numero(segmento.series)} series
              <span className="ac-nota"> · código {segmento.clave}</span>
            </h5>
            <dl className="ac-metricas ac-metricas--modelo">
              <Metrica
                etiqueta="MAE modelo"
                valor={segmento.candidato.mae === null ? 'n/c' : numero1(segmento.candidato.mae)}
                pie="unidades por serie-día"
              />
              <Metrica
                etiqueta="MAE baseline"
                valor={segmento.baseline.mae === null ? 'n/c' : numero1(segmento.baseline.mae)}
                pie="unidades por serie-día"
              />
              <Metrica
                etiqueta="WAPE modelo"
                valor={pct(segmento.candidato.wape)}
                pie={`Σ|error| ${numero(segmento.candidato.denominador ? Math.round((segmento.candidato.wape ?? 0) * segmento.candidato.denominador / 100) : 0)} u`}
              />
              <Metrica
                etiqueta="WAPE del agregado"
                valor={pct(segmento.agregado?.candidato.wape)}
                pie="error de la serie sumada, no promedio de errores"
              />
            </dl>
            <p className="ac-nota">
              Agregado: modelo {numero1(segmento.agregado?.candidato.wape ?? 0)} % · baseline{' '}
              {numero1(segmento.agregado?.baseline.wape ?? 0)} % ·{' '}
              {interpretarMejora(
                segmento.agregado?.candidato.mae,
                segmento.agregado?.baseline.mae,
              ).texto}
              . El error por serie y el de la serie agregada no son intercambiables: al sumar, los
              errores pueden compensarse. Aquí el sesgo se mide en {UNIDAD_SESGO.agregado}.
            </p>
          </div>
        ) : null}
      </div>

      <div className="ac-df-ventanas">
        <table className="ac-tabla">
          <caption>Ventanas evaluadas ({etapa})</caption>
          <thead>
            <tr>
              <th scope="col">Origen</th>
              <th scope="col">Fin</th>
              <th scope="col">MAE modelo</th>
              <th scope="col">MAE baseline</th>
              <th scope="col">WAPE modelo</th>
              <th scope="col">WAPE baseline</th>
              <th scope="col">Mejora</th>
            </tr>
          </thead>
          <tbody>
            {evaluacion.ventanas.map((ventana) => (
              <tr key={`${ventana.origen_d}`}>
                <td>{ventana.origen_fecha}</td>
                <td>{ventana.fin_fecha}</td>
                <td>{ventana.metricas.mae === null ? 'n/c' : numero1(ventana.metricas.mae)}</td>
                <td>
                  {ventana.baseline?.mae === null || !ventana.baseline ? 'n/c' : numero1(ventana.baseline.mae)}
                </td>
                <td>{ventana.metricas.wape === null ? 'n/c' : `${numero1(ventana.metricas.wape)} %`}</td>
                <td>
                  {ventana.baseline?.wape === null || !ventana.baseline
                    ? 'n/c'
                    : `${numero1(ventana.baseline.wape)} %`}
                </td>
                <td>
                  <span
                    title={
                      interpretarMejora(ventana.metricas.mae, ventana.baseline?.mae ?? null).detalle
                    }
                  >
                    {
                      interpretarMejora(ventana.metricas.mae, ventana.baseline?.mae ?? null)
                        .textoCorto
                    }
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

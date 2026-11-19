/**
 * Pantalla «Modelado».
 *
 * Divulgación progresiva en dos niveles:
 * 1. Qué hace el modelo, en lenguaje llano: qué datos entran, qué variables usa, cómo se
 *    construyen los 28 pasos, cuál es el baseline y qué información queda prohibida.
 * 2. Detalle técnico dentro de `<details>`: algoritmo y parámetros, ventanas de
 *    entrenamiento, estrategia, variables y su disponibilidad al emitir, ejecución y
 *    versión, política de precios futuros y cobertura con fallback.
 *
 * La importancia por ganancia se publica como lo que es —cuánto aporta una variable a
 * partir los árboles— y nunca como SHAP ni como relación causal. Ninguna cifra se
 * recalcula para la interfaz: se leen la ejecución y los artefactos publicados.
 */

import type {
  EvaluacionRespuesta,
  ModelosRespuesta,
  PronosticosRespuesta,
  VentanasEvaluacionRespuesta,
} from '../api';
import type { PantallaId } from './NavPantallas';
import { ProtocoloEvaluacion } from './ProtocoloEvaluacion';
import { Bloque, CabeceraPantalla, Nota, fechaCorta, numero, numero1 } from './pantallas-comun';

/** Agrupa las variables del modelo por familia, sin inventar nombres nuevos. */
function familia(variable: string): string {
  if (variable === 'h') return 'Horizonte';
  if (['dow', 'month', 'day', 'doy', 'semana_anio', 'fin_de_semana'].includes(variable))
    return 'Calendario';
  if (variable.startsWith('evento') || variable.startsWith('tipo') || variable === 'snap')
    return 'Eventos y SNAP';
  if (variable.startsWith('precio') || variable === 'semanas_sin_cambio' || variable === 'tiene_precio')
    return 'Precios';
  if (variable.startsWith('lag_')) return 'Rezagos';
  if (variable.startsWith('media_')) return 'Medias móviles';
  if (variable.startsWith('std_')) return 'Desviaciones';
  if (variable.startsWith('dow_media_')) return 'Perfil semanal';
  if (variable.startsWith('ratio_')) return 'Razones';
  if (
    ['ceros_28', 'ceros_56', 'positivos_28', 'ultimo_positivo', 'dias_desde_venta'].includes(
      variable,
    )
  )
    return 'Intermitencia';
  if (['tienda', 'estado', 'categoria', 'departamento', 'item'].includes(variable))
    return 'Jerarquía';
  return 'Otras';
}

export function PantallaModelado({
  modelos,
  pronosticos,
  evaluacion,
  ventanas,
  cargando,
  error,
  onReintentar,
  onIr,
}: {
  modelos: ModelosRespuesta | null;
  pronosticos: PronosticosRespuesta | null;
  evaluacion: EvaluacionRespuesta | null;
  ventanas: VentanasEvaluacionRespuesta | null;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onIr: (pantalla: PantallaId) => void;
}) {
  const recomendada = modelos?.ejecuciones.find((fila) => fila.recomendado) ?? null;
  const baseline = modelos?.ejecuciones.find((fila) => fila.variante === 'baseline') ?? null;
  const candidatas = (modelos?.ejecuciones ?? []).filter(
    (fila) => fila.variante !== 'baseline' && !fila.recomendado,
  );
  const variables = recomendada?.variables ?? [];
  const familias = new Map<string, string[]>();
  for (const variable of variables) {
    const clave = familia(variable);
    familias.set(clave, [...(familias.get(clave) ?? []), variable]);
  }
  const entrenamiento = recomendada?.ventana_entrenamiento ?? {};
  const supuestos = recomendada?.supuestos ?? {};
  const cobertura = (recomendada?.cobertura ?? {}) as Record<string, unknown>;
  const usaPrecios = variables.some((variable) => variable.startsWith('precio') || variable === 'tiene_precio');

  /** Métrica de desarrollo por ejecución, tal y como la publica el manifiesto. */
  const wapeDesarrollo = (fila: (typeof candidatas)[number] | typeof recomendada) =>
    fila?.metricas_resumen?.desarrollo?.wape ?? null;

  /** Rol real de cada ejecución: publicada, evaluada sin publicar o solo registrada. */
  const rolDe = (fila: (typeof candidatas)[number] | typeof recomendada) => {
    if (fila?.recomendado) return 'publicada';
    if (fila?.variante === 'baseline') return 'referencia';
    const desarrollo = fila?.metricas_resumen?.desarrollo;
    const final = fila?.metricas_resumen?.final;
    if (desarrollo || final) return 'evaluada y no publicada';
    return 'registrada sin métricas';
  };
  const descartadasConEvidencia = candidatas.filter((fila) => rolDe(fila) === 'evaluada y no publicada');
  const soloRegistradas = candidatas.filter((fila) => rolDe(fila) === 'registrada sin métricas');

  return (
    <div className="ac-bloques">
      <CabeceraPantalla
        titulo="Modelado"
        proposito="Cómo se convierte el histórico en un pronóstico de 28 días: datos de entrada, variables, construcción paso a paso, baseline de comparación y límites del método."
        contexto={
          recomendada
            ? `Ejecución publicada ${recomendada.run_id} · semilla ${recomendada.semilla ?? '—'} · ${variables.length} variables`
            : null
        }
      />

      {error ? (
        <section className="ac-panel ac-panel--error" role="alert">
          <h3>No se pudo cargar la información del modelo</h3>
          <p>{error}</p>
          <button type="button" className="ac-accion" onClick={onReintentar}>
            Reintentar
          </button>
        </section>
      ) : null}

      {!error && cargando && !recomendada ? (
        <div className="ac-esqueleto" role="status" aria-busy="true">
          <span>Cargando la ejecución publicada…</span>
        </div>
      ) : null}

      {/* Nivel 1: lenguaje llano ----------------------------------------- */}
      <Bloque
        titulo="1 · Qué entra y qué sale"
        descripcion="Sin tecnicismos: el modelo aprende de todo el histórico y produce un número por artículo y tienda para cada uno de los 28 días"
        testid="modelado-llano"
      >
        <div className="ac-flujo">
          <div className="ac-flujo-paso" data-testid="modelado-paso-datos">
            <span className="ac-flujo-num">Paso 1</span>
            <span className="ac-flujo-titulo">Datos de entrada</span>
            <p className="ac-flujo-detalle">
              Ventas diarias de cada artículo en cada tienda y el calendario con eventos y SNAP
              hasta el corte
              {usaPrecios
                ? ', más los precios semanales que esta variante sí utiliza.'
                : '. El proyecto también tiene precios semanales importados para la exploración, pero esta ejecución no los usa.'}
            </p>
          </div>
          <div className="ac-flujo-paso" data-testid="modelado-paso-variables">
            <span className="ac-flujo-num">Paso 2</span>
            <span className="ac-flujo-titulo">Variables</span>
            <p className="ac-flujo-detalle">
              Lo que ya se sabe antes de pronosticar: día de la semana, eventos, rezagos de ventas,
              promedios recientes, intermitencia, tienda, categoría y departamento
              {usaPrecios
                ? ' y las variables de precio de esta variante.'
                : '. Esta variante no incluye variables de precio; la de precios existe aparte y queda identificada.'}
            </p>
          </div>
          <div className="ac-flujo-paso">
            <span className="ac-flujo-num">Paso 3</span>
            <span className="ac-flujo-titulo">Entrenamiento global</span>
            <p className="ac-flujo-detalle">
              Un solo modelo para las {numero(cobertura.series ? Number(cobertura.series) : 0)}{' '}
              series artículo × tienda: aprende el patrón común y usa la jerarquía para distinguir
              cada serie.
            </p>
          </div>
          <div className="ac-flujo-paso">
            <span className="ac-flujo-num">Paso 4</span>
            <span className="ac-flujo-titulo">28 pasos</span>
            <p className="ac-flujo-detalle">
              Se pronostica el día 1, luego el 2 y así hasta el 28; el horizonte entra como
              variable para que el modelo sepa cuán lejos está del corte.
            </p>
          </div>
          <div className="ac-flujo-paso">
            <span className="ac-flujo-num">Paso 5</span>
            <span className="ac-flujo-titulo">Baseline</span>
            <p className="ac-flujo-detalle">
              La misma tarea resuelta con la regla estacional semanal: si el modelo no la supera,
              no aporta nada.
            </p>
          </div>
          <div className="ac-flujo-paso">
            <span className="ac-flujo-num">Paso 6</span>
            <span className="ac-flujo-titulo">Agregación</span>
            <p className="ac-flujo-detalle">
              Estado, tienda, categoría y departamento se obtienen sumando las mismas series: no
              hay un segundo cálculo que pueda contradecir el detalle.
            </p>
          </div>
        </div>
        <p className="ac-nota">
          Si la ejecución publicada cambia, esta pantalla cambia con ella: no hay cifras escritas a
          mano ni un reentrenamiento que solo sirva para la interfaz.
        </p>
      </Bloque>

      {/* Baseline, candidatos y modelo elegido ---------------------------- */}
      <Bloque
        titulo="2 · Baseline, candidatos y modelo seleccionado"
        descripcion="Tres cosas distintas que no se deben confundir: la regla de referencia, las variantes probadas y la que se publica"
        testid="modelado-comparacion"
      >
        <div className="ac-rejilla">
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Baseline · referencia</span>
            <span className="ac-tarjeta-valor">
              {baseline?.etiqueta ?? 'Estacional semanal'}
            </span>
            <p className="ac-tarjeta-pie">
              {baseline?.metodo ??
                'Repite los últimos 7 días observados: no entrena, no usa variables y sirve de piso.'}
            </p>
          </div>
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Modelo seleccionado</span>
            <span className="ac-tarjeta-valor">
              {recomendada?.etiqueta ?? 'sin publicar'}
            </span>
            <p className="ac-tarjeta-pie">
              {recomendada
                ? `Variante ${recomendada.variante} · ${recomendada.estado}${recomendada.recomendado ? ' · recomendada: se confirmó con los cortes finales antes de publicar' : ''}`
                : 'Sin ejecución publicada'}
            </p>
          </div>
          <div className="ac-tarjeta">
            <span className="ac-tarjeta-etq">Variantes evaluadas y no publicadas</span>
            <span className="ac-tarjeta-valor">{numero(descartadasConEvidencia.length)}</span>
            <p className="ac-tarjeta-pie">
              {descartadasConEvidencia.length
                ? descartadasConEvidencia
                    .map(
                      (fila) =>
                        `${fila.variante} (${fila.variables.length} variables, WAPE desarrollo ${
                          wapeDesarrollo(fila) === null ? 'n/c' : `${numero1(wapeDesarrollo(fila) as number)} %`
                        })`,
                    )
                    .join(' · ')
                : 'Ninguna variante con métricas quedó sin publicar'}
              {soloRegistradas.length
                ? ` · ${numero(soloRegistradas.length)} registrada(s) sin métricas publicadas: existen, pero no hay evidencia de descarte`
                : ''}
            </p>
          </div>
        </div>

        {/* Manifiesto real: rol de cada ejecución y sus métricas publicadas. */}
        <div className="ac-tabla-marco">
          <table className="ac-tabla">
            <caption>
              Ejecuciones registradas en esta versión · el rol y las métricas salen del manifiesto,
              no de una preselección de la interfaz
            </caption>
            <thead>
              <tr>
                <th scope="col">Ejecución</th>
                <th scope="col">Variante</th>
                <th scope="col" className="ac-tabla-num">Variables</th>
                <th scope="col" className="ac-tabla-num">MAE desarrollo</th>
                <th scope="col" className="ac-tabla-num">WAPE desarrollo</th>
                <th scope="col" className="ac-tabla-num">WAPE final</th>
                <th scope="col">Rol</th>
              </tr>
            </thead>
            <tbody>
              {(modelos?.ejecuciones ?? []).map((fila) => (
                <tr key={fila.run_id} data-testid={`modelado-run-${fila.variante}`}>
                  <th scope="row">{fila.run_id}</th>
                  <td>{fila.variante}</td>
                  <td className="ac-tabla-num">{numero(fila.variables.length)}</td>
                  <td className="ac-tabla-num">
                    {fila.metricas_resumen?.desarrollo?.mae === null ||
                    fila.metricas_resumen?.desarrollo?.mae === undefined
                      ? 'n/c'
                      : numero1(fila.metricas_resumen.desarrollo.mae)}
                  </td>
                  <td className="ac-tabla-num">
                    {wapeDesarrollo(fila) === null ? 'n/c' : `${numero1(wapeDesarrollo(fila) as number)} %`}
                  </td>
                  <td className="ac-tabla-num">
                    {fila.metricas_resumen?.final?.wape === null ||
                    fila.metricas_resumen?.final?.wape === undefined
                      ? 'n/c'
                      : `${numero1(fila.metricas_resumen.final.wape)} %`}
                  </td>
                  <td>{rolDe(fila)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ac-nota">
          Que una variante exista no significa que se haya descartado: solo las que tienen
          métricas publicadas y no son la recomendada se presentan como evaluadas y no
          publicadas. La comparación de desarrollo de arriba se lee en su propio grano; las
          cifras finales se reportan aparte, en «Evaluación».
        </p>
      </Bloque>

      {/* Información permitida ------------------------------------------- */}
      <Bloque
        titulo="3 · Sin información posterior al corte"
        descripcion="La regla que hace válido el pronóstico: en el día t solo se usa lo que se sabía en el día t"
        testid="modelado-fuga"
      >
        <dl className="ac-dl">
          <dt>Rezagos y promedios</dt>
          <dd>
            Cada fila de entrenamiento usa únicamente los días anteriores al origen del
            pronóstico; no se solapan ventanas ni se filtra el futuro hacia el pasado.
          </dd>
          <dt>Calendario</dt>
          <dd>
            Día de la semana, mes y eventos se conocen de antemano: usarlos no es fuga de
            información.
          </dd>
          <dt>Precios</dt>
          <dd>
            {usaPrecios
              ? supuestos.precio_futuro ?? 'El precio del horizonte se congela en el último conocido al corte.'
              : 'No aplica: la ejecución publicada no usa variables de precio. La política de congelación pertenece a la variante con precios, que se evaluó y no se publicó.'}
          </dd>
          <dt>Observaciones posteriores</dt>
          <dd>
            Nunca entran al pronóstico; se usan solo para medirlo cuando el corte ya ocurrió en el
            histórico.
          </dd>
          <dt>Recorte</dt>
          <dd>{supuestos.recorte ?? 'Las predicciones negativas se recortan a cero.'}</dd>
        </dl>
        <p className="ac-nota">
          Esta política se comprueba con pruebas automáticas de invariancia: cambiar los datos
          posteriores al corte no altera ni una unidad del pronóstico emitido.
        </p>
      </Bloque>

      {/* Nivel 2: detalle técnico ---------------------------------------- */}
      <details className="ac-metodologia" data-testid="modelado-tecnico">
        <summary>Detalle técnico de la ejecución publicada</summary>
        <div className="ac-metodologia-cuerpo">
          <dl className="ac-dl">
            <dt>Algoritmo</dt>
            <dd>
              {recomendada?.metodo ?? 'LightGBM global condicionado al horizonte'} · objetivo
              tweedie (varianza 1.1) para series con muchos ceros
            </dd>
            <dt>Parámetros</dt>
            <dd>
              320 iteraciones · tasa de aprendizaje 0.05 · 63 hojas · 8 hilos · semilla{' '}
              {recomendada?.semilla ?? '—'}
            </dd>
            <dt>Estrategia</dt>
            <dd>
              Un solo modelo global para las 30 490 series; el horizonte entra como variable y la
              jerarquía (tienda, estado, categoría, departamento, artículo) permite distinguir
              cada serie.
            </dd>
            <dt>Muestreo</dt>
            <dd>
              {entrenamiento.filas
                ? `${numero(Number(entrenamiento.filas))} filas de entrenamiento · ${numero1(Number(entrenamiento.fraccion_ceros_muestreada ?? 0) * 100)} % de las filas en cero muestreadas y reponderadas`
                : 'Sin detalle de muestreo'}
            </dd>
            <dt>Ventanas de entrenamiento</dt>
            <dd>
              {recomendada?.origenes_entrenamiento.length
                ? `Orígenes d_${recomendada.origenes_entrenamiento.join(', d_')} · ${String(entrenamiento.desde ?? '')}`
                : '—'}
            </dd>
            <dt>Protocolo de selección y evaluación</dt>
            <dd data-testid="modelado-protocolo">
              <ProtocoloEvaluacion
                modelos={modelos}
                ventanas={ventanas}
                testid="modelado-protocolo-texto"
              />
            </dd>
            <dt>Ejecución</dt>
            <dd>
              {recomendada?.run_id ?? '—'} · creada el{' '}
              {recomendada?.creado_en ? fechaCorta(recomendada.creado_en.slice(0, 10)) : '—'}
              {recomendada?.duracion_s ? ` · ${numero1(recomendada.duracion_s)} s de entrenamiento` : ''}
              {recomendada?.memoria?.entrenamiento_mb
                ? ` · ${numero1(recomendada.memoria.entrenamiento_mb)} MB`
                : ''}
            </dd>
            <dt>Versión de datos</dt>
            <dd>
              {modelos?.version ?? '—'} ·{' '}
              {usaPrecios
                ? `precios usados por la ejecución publicada (${modelos?.version_precios ?? 'sin versión'})`
                : 'la ejecución publicada no usa variables de precio'}
            </dd>
            <dt>Cobertura y fallback</dt>
            <dd>
              {cobertura.series
                ? `${numero(Number(cobertura.series_modelo ?? 0))} de ${numero(Number(cobertura.series))} series pronosticadas por el modelo · ${numero(Number(cobertura.fallback ?? 0))} en fallback al baseline`
                : 'sin detalle'}
              {cobertura.nota ? ` · ${String(cobertura.nota)}` : ''}
            </dd>
            <dt>Precios futuros</dt>
            <dd>
              {usaPrecios ? supuestos.precio_futuro ?? 'precio congelado al corte' : 'no se usan precios'}
            </dd>
            <dt>Promociones</dt>
            <dd>
              {supuestos.promociones ??
                'El conjunto no contiene promociones: los cambios de precio no se etiquetan como campañas.'}
            </dd>
          </dl>

          <h4>Variables y su disponibilidad al emitir</h4>
          <div className="ac-tabla-marco">
            <table className="ac-tabla">
              <caption>
                Familias de variables de la ejecución {recomendada?.run_id ?? 'publicada'}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Familia</th>
                  <th scope="col" className="ac-tabla-num">Variables</th>
                  <th scope="col">Disponible al emitir</th>
                </tr>
              </thead>
              <tbody>
                {[...familias.entries()].map(([nombre, lista]) => (
                  <tr key={nombre}>
                    <th scope="row">{nombre}</th>
                    <td className="ac-tabla-num">{numero(lista.length)}</td>
                    <td>
                      {nombre === 'Calendario' || nombre === 'Eventos y SNAP'
                        ? 'Sí, se conoce por adelantado'
                        : nombre === 'Precios'
                          ? 'Sí, congelado en el último precio conocido al corte (variante con precios)'
                          : 'Sí, calculado solo con días anteriores al corte'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details>
            <summary>
              Lista completa de las {numero(variables.length)} variables
            </summary>
            <p className="ac-nota">{variables.join(' · ') || 'sin variables registradas'}</p>
          </details>

          <h4>Importancia por ganancia</h4>
          <p className="ac-nota">
            La ganancia mide cuánto aporta cada variable a las particiones de los árboles. No es
            SHAP, no indica dirección del efecto y no implica causalidad.
          </p>
          <div className="ac-tabla-marco">
            <table className="ac-tabla">
              <caption>Variables con mayor ganancia acumulada en la ejecución publicada</caption>
              <thead>
                <tr>
                  <th scope="col">Variable</th>
                  <th scope="col" className="ac-tabla-num">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {(recomendada?.importancias ?? []).map((fila) => (
                  <tr key={fila.variable}>
                    <th scope="row">{fila.variable}</th>
                    <td className="ac-tabla-num">{numero(Math.round(fila.ganancia))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      <section className="ac-panel">
        <div className="ac-acciones">
          <button type="button" className="ac-accion" onClick={() => onIr('evaluacion')}>
            Ver la evaluación del modelo
          </button>
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            onClick={() => onIr('resultados')}
          >
            Consultar el pronóstico publicado
          </button>
        </div>
        {evaluacion?.modelo ? (
          <Nota>
            Evaluación enlazada: nivel {evaluacion.nivel} · etapa {evaluacion.etapa ?? 'final'} ·{' '}
            {evaluacion.ventanas.length} ventanas · modelo {evaluacion.modelo.etiqueta}.
          </Nota>
        ) : null}
        {pronosticos?.modelo ? (
          <Nota>
            El pronóstico que se consulta en «Resultados» usa esta misma ejecución (
            {pronosticos.modelo.run_id}) y estos mismos supuestos.
          </Nota>
        ) : null}
      </section>
    </div>
  );
}

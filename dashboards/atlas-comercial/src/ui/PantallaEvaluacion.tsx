/**
 * Pantalla «Evaluación».
 *
 * Ordena la lectura en cuatro partes: protocolo (qué se evalúa y con qué reglas),
 * comparación de modelos (MAE, sesgo, WAPE y mejora), desempeño por segmento
 * (ventana × horizonte × estado × categoría) y tabla exacta con la selección visible.
 *
 * Los paneles reutilizan los componentes ya verificados: `PanelEvaluacion` (comparación
 * por horizonte y segmento), `MatrizDesempeno` (ventana × horizonte) y
 * `EvaluacionVentanas` (tabla completa en dos granos). Esta pantalla solo añade el
 * protocolo y la lectura de conjunto; no duplica tablas.
 */

import {
  FORMULA_SESGO,
  interpretarMejora,
  UNIDAD_SESGO,
} from '../metricas';
import { useState } from 'react';

import type {
  AuditoriaTemporalRespuesta,
  EvaluacionHorizonteRespuesta,
  EvaluacionRespuesta,
  MatrizDesempenoRespuesta,
  ModelosRespuesta,
  NivelPronosticoNivel,
  PronosticosRespuesta,
  SegmentoEvaluacion,
  VentanasEvaluacionRespuesta,
} from '../api';
import { etiquetaCategoria, etiquetaEstado } from '../etiquetas';
import { AuditoriaTemporal } from './AuditoriaTemporal';
import { ProtocoloEvaluacion } from './ProtocoloEvaluacion';
import { EvaluacionVentanas } from './EvaluacionVentanas';
import { MatrizDesempeno, type LecturaMatriz, type MetodoSesgo } from './MatrizDesempeno';
import type { PantallaId } from './NavPantallas';
import {
  alcanceGrafico,
  definicionAgregacion,
  GraficoPronostico,
  PanelEvaluacion,
} from './Pronostico';
import { Segmentado } from './Segmentado';
import { Bloque, CabeceraPantalla, Nota, fechaCorta, numero, numero1, numero2 } from './pantallas-comun';

export function PantallaEvaluacion({
  modelos,
  auditoria,
  cargandoAuditoria,
  errorAuditoria,
  pronosticos,
  evaluacion,
  cargando,
  error,
  tipoError,
  nivel,
  etapa,
  evaluacion28,
  cargando28,
  error28,
  origen,
  onEtapa,
  onOrigen,
  onNivel,
  contextoTerritorio,
  contextoCatalogo,
  matrizDesempeno,
  cargandoMatriz,
  errorMatriz,
  lecturaMatriz,
  onLecturaMatriz,
  metodoSesgo,
  onMetodoSesgo,
  ventanas,
  cargandoVentanas,
  errorVentanas,
  onReintentar,
  onIr,
}: {
  /** Manifiesto de ejecuciones: el protocolo se redacta desde sus datos. */
  modelos: ModelosRespuesta | null;
  /** Auditoría de separación temporal guardada por el script de auditoría. */
  auditoria: AuditoriaTemporalRespuesta | null;
  cargandoAuditoria: boolean;
  errorAuditoria: string | null;
  pronosticos: PronosticosRespuesta | null;
  evaluacion: EvaluacionRespuesta | null;
  cargando: boolean;
  error: string | null;
  /** `validacion` cuando la API rechaza la consulta: reintentar no la arregla. */
  tipoError: 'validacion' | 'conexion' | null;
  nivel: NivelPronosticoNivel;
  etapa: 'desarrollo' | 'final';
  evaluacion28: EvaluacionHorizonteRespuesta | null;
  cargando28: boolean;
  error28: string | null;
  origen: 'futuro' | number;
  onEtapa: (etapa: 'desarrollo' | 'final') => void;
  onOrigen: (origen: 'futuro' | number) => void;
  onNivel: (nivel: NivelPronosticoNivel) => void;
  contextoTerritorio: string;
  contextoCatalogo: string;
  matrizDesempeno: MatrizDesempenoRespuesta | null;
  cargandoMatriz: boolean;
  errorMatriz: string | null;
  lecturaMatriz: LecturaMatriz;
  onLecturaMatriz: (lectura: LecturaMatriz) => void;
  metodoSesgo: MetodoSesgo;
  onMetodoSesgo: (metodo: MetodoSesgo) => void;
  ventanas: VentanasEvaluacionRespuesta | null;
  cargandoVentanas: boolean;
  errorVentanas: string | null;
  onReintentar: () => void;
  onIr: (pantalla: PantallaId) => void;
}) {

  /* La metodología es un desplegable; se abre si un enlace directo apunta a su contenido
     (`?ac_abrir=metodologia`, `#evaluacion-metodologia`) o si se pulsa el botón del bloque A. */
  const [metodologiaAbierta, setMetodologiaAbierta] = useState(() => {
    if (typeof window === 'undefined') return false;
    const parametros = new URLSearchParams(window.location.search);
    const abrir = parametros.get('ac_abrir');
    return (
      abrir === 'metodologia' ||
      window.location.hash.includes('evaluacion-metodologia') ||
      window.location.hash.includes('metodologia')
    );
  });

  const abrirMetodologia = () => {
    setMetodologiaAbierta(true);
    window.setTimeout(() => {
      document.getElementById('evaluacion-metodologia')?.scrollIntoView({ block: 'start' });
    }, 0);
  };
  const [segmento, setSegmento] = useState<SegmentoEvaluacion | null>(null);
  const cortes = ventanas?.ventanas ?? [];
  /* La etapa tiene una sola fuente de estado (la de App) y se expone donde sus cifras cambian.
     La gráfica solo puede dibujar cortes con predicciones por día publicadas; el resumen y el
     desglose pueden consolidar cortes que la gráfica no dibuja (desarrollo). */
  const publicados = new Set(ventanas?.origenes_graficables ?? []);
  const cortesGrafico = cortes.filter((corte) => publicados.has(corte.origen_d));
  const etapaConCortes = cortesGrafico.length > 0;
  const etapasDisponibles: { valor: 'final' | 'desarrollo'; texto: string }[] = [
    { valor: 'final', texto: 'Cortes finales' },
    { valor: 'desarrollo', texto: 'Desarrollo' },
  ];
  const numeralNivel = (valor: NivelPronosticoNivel) =>
    valor === 'total'
      ? 'todas las tiendas del contexto'
      : valor === 'estado'
        ? 'por estado'
        : valor === 'tienda'
          ? 'por tienda'
          : valor === 'categoria'
            ? 'por categoría'
            : valor === 'departamento'
              ? 'por departamento'
              : 'por artículo';
  const NivelesElegibles: { valor: NivelPronosticoNivel; texto: string }[] = [
    { valor: 'total', texto: 'Total' },
    { valor: 'estado', texto: 'Estado' },
    { valor: 'tienda', texto: 'Tienda' },
    { valor: 'categoria', texto: 'Categoría' },
    { valor: 'departamento', texto: 'Departamento' },
  ];
  const finales = cortes.filter((corte) => corte.etapa === 'final');
  const desarrollo = cortes.filter((corte) => corte.etapa !== 'final');
  const detalleFinal = finales.map((corte) => corte.detalle);
  const agregadoFinal = finales.map((corte) => corte.agregado);
  const promedio = (valores: (number | null)[]) => {
    const validos = valores.filter((valor): valor is number => valor !== null);
    return validos.length ? validos.reduce((suma, valor) => suma + valor, 0) / validos.length : null;
  };
  /* Definición principal: el consolidado de las ventanas (Σ|error| ÷ Σobservado y MAE en
     unidades sumando errores). El promedio simple de ventanas es otra medida y no se usa
     como cifra de cabecera. */
  const consolidadoDetalle = (ventanas?.consolidado?.detalle ?? null) as
    | { candidato?: { mae?: number | null; wape_pct?: number | null; sesgo?: number | null }; baseline?: { mae?: number | null; wape_pct?: number | null }; mejora_relativa_pct?: number | null }
    | null;
  const consolidadoAgregado = (ventanas?.consolidado?.agregado ?? null) as
    | { candidato?: { mae?: number | null; wape_pct?: number | null }; baseline?: { mae?: number | null; wape_pct?: number | null }; mejora_relativa_pct?: number | null }
    | null;
  const maeDetalleCandidato = consolidadoDetalle?.candidato?.mae ?? promedio(detalleFinal.map((grano) => grano.candidato.mae));
  const maeDetalleBaseline = consolidadoDetalle?.baseline?.mae ?? promedio(detalleFinal.map((grano) => grano.baseline.mae));
  const wapeDetalleCandidato =
    consolidadoDetalle?.candidato?.wape_pct ?? promedio(detalleFinal.map((grano) => grano.candidato.wape_pct));
  const wapeDetalleBaseline =
    consolidadoDetalle?.baseline?.wape_pct ?? promedio(detalleFinal.map((grano) => grano.baseline.wape_pct));
  const maeAgregadoCandidato =
    consolidadoAgregado?.candidato?.mae ?? promedio(agregadoFinal.map((grano) => grano.candidato.mae));
  const maeAgregadoBaseline =
    consolidadoAgregado?.baseline?.mae ?? promedio(agregadoFinal.map((grano) => grano.baseline.mae));

  /* Deterioros en el grano agregado, uno por segmento de estado y categoría. */
  const deteriorosAgregados = [
    ...(ventanas?.por_estado ?? []).map((fila) => ({
      etiqueta: etiquetaEstado(fila.clave),
      maeCandidato: fila.agregado?.candidato.mae ?? null,
      maeBaseline: fila.agregado?.baseline.mae ?? null,
    })),
    ...(ventanas?.por_categoria ?? []).map((fila) => ({
      etiqueta: etiquetaCategoria(fila.clave),
      maeCandidato: fila.agregado?.candidato.mae ?? null,
      maeBaseline: fila.agregado?.baseline.mae ?? null,
    })),
  ].filter(
    (fila) =>
      interpretarMejora(fila.maeCandidato, fila.maeBaseline).tipo === 'mayor_error',
  );

  return (
    <div className="ac-bloques">
      <CabeceraPantalla
        titulo="Evaluación"
        proposito="Medir el pronóstico contra lo que realmente pasó: protocolo de cortes, comparación con el baseline en dos granos y desempeño por ventana, horizonte, estado y categoría."
        contexto={`${contextoTerritorio} · ${contextoCatalogo}${
          cargando ? ' · actualizando…' : ''
        }`}
      >
      </CabeceraPantalla>

      {error ? (
        <section className="ac-panel ac-panel--error" role="alert">
          <h3>
            {tipoError === 'validacion'
              ? 'La consulta no es válida para el nivel elegido'
              : 'No se pudo cargar la evaluación'}
          </h3>
          <p>{error}</p>
          {tipoError === 'validacion' ? (
            <p className="ac-nota">
              Reintentar no cambia el resultado: ajusta el nivel o el contexto con los controles
              de la cabecera.
            </p>
          ) : (
            <button type="button" className="ac-accion" onClick={onReintentar}>
              Reintentar
            </button>
          )}
        </section>
      ) : null}

      {/* A. Contexto y alcance -------------------------------------------- */}
      <Bloque
        titulo="1 · Contexto y alcance"
        descripcion="Qué se evalúa y con qué información; la limitación de independencia se declara aquí, sin abrir la metodología"
        testid="evaluacion-contexto"
      >
        <dl className="ac-dl">
          <dt>Filtros activos</dt>
          <dd>
            {contextoTerritorio} · {contextoCatalogo}
          </dd>
          <dt>Cortes evaluados</dt>
          <dd>
            {cortes.length
              ? `${numero(cortes.length)} cortes de la etapa «${etapa}»: ${numero(desarrollo.length)} de desarrollo y ${numero(finales.length)} finales`
              : 'sin cortes publicados'}
            {finales.length
              ? ` · ${finales
                  .map((corte) => `${fechaCorta(corte.origen_fecha)} → ${fechaCorta(corte.fin_fecha)}`)
                  .join(' · ')}`
              : ''}
          </dd>
          <dt>Nivel y horizonte</dt>
          <dd>
            {nivel} · {ventanas?.horizonte ?? pronosticos?.horizonte ?? 28} días por corte ·{' '}
            {finales.length
              ? `${numero(Math.max(...finales.map((corte) => corte.series)))} series artículo × tienda`
              : 'series según el detalle'}
          </dd>
          <dt>Tipo de evaluación</dt>
          <dd>
            Evaluación histórica: cada corte se puntúa con lo que ya ocurrió, no es una previsión del
            presente.
          </dd>
          <dt>Revisión publicada</dt>
          <dd data-testid="evaluacion-revision">
            <strong>{ventanas?.revision ?? 'sin revisión declarada'}</strong>
            {ventanas?.politica_precision ? ` · ${ventanas.politica_precision}` : ''}
          </dd>
        </dl>
        <p className="ac-aviso-inline" data-testid="evaluacion-independencia">
          <strong>Limitación de independencia:</strong>{' '}
          {etapa === 'final'
            ? 'los cortes finales se consultaron antes de confirmar la publicación, así que no son un holdout intacto.'
            : 'los cortes de desarrollo comparan y eligen la variante, así que su resultado no es independiente de esa elección.'}{' '}
          La separación temporal de cada corte se audita en el detalle metodológico.
        </p>
        <div className="ac-acciones">
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            onClick={abrirMetodologia}
            data-testid="evaluacion-abrir-metodologia"
            aria-expanded={metodologiaAbierta}
            aria-controls="evaluacion-metodologia"
          >
            Ver metodología, fórmulas y auditoría temporal
          </button>
        </div>
      </Bloque>

      {/* B. Resumen del desempeño ---------------------------------------- */}
      <Bloque
        titulo="2 · Resumen del desempeño"
        descripcion="Qué tan cerca queda el pronóstico; cada bloque declara si responde a los filtros de la cabecera o al universo completo"
        testid="evaluacion-resumen"
      >
        <div className="ac-df-controles ac-controles-locales" data-testid="controles-resumen">
          <Segmentado<'desarrollo' | 'final'>
            etiqueta="Etapa de los cortes del resumen"
            valor={etapa}
            onElegir={onEtapa}
            testid="selector-etapa-evaluacion"
            opciones={etapasDisponibles}
          />
          <p className="ac-controles-nota" data-testid="resumen-etapa">
            Resumen consolidado de {numero(cortes.length)}{' '}
            {cortes.length === 1 ? 'corte' : 'cortes'} de la etapa{' '}
            <strong>{etapa === 'final' ? 'cortes finales' : 'desarrollo'}</strong>. No depende del
            corte individual elegido en la gráfica.
          </p>
        </div>

        <h4 data-testid="resumen-alcance-filtros">
          Horizonte de 28 días · responde a los filtros de la cabecera
        </h4>
        <div data-testid="evaluacion-horizonte-28">
        {error28 ? (
          <div className="ac-estado ac-estado--error" role="alert">
            <h4>No se pudo cargar la evaluación a 28 días</h4>
            <p>{error28}</p>
            <div className="ac-acciones">
              <button type="button" className="ac-accion" onClick={onReintentar}>
                Reintentar
              </button>
            </div>
          </div>
        ) : cargando28 && !evaluacion28 ? (
          <div className="ac-esqueleto" role="status" aria-busy="true">
            <span>Calculando el error del horizonte de 28 días…</span>
          </div>
        ) : evaluacion28 && !evaluacion28.disponible ? (
          <Nota>{evaluacion28.motivo ?? 'Sin evaluación a 28 días derivada para esta versión.'}</Nota>
        ) : evaluacion28?.consolidado ? (
          <>
            <div className="ac-rejilla">
              <div className="ac-tarjeta">
                <span className="ac-tarjeta-etq">MAE_28 · por serie</span>
                <span className="ac-tarjeta-valor" data-testid="eval28-mae">
                  {numero2(evaluacion28.consolidado.mae_28 as number | null)}
                </span>
                <p className="ac-tarjeta-pie">
                  Promedio de |error del horizonte| por serie y corte · baseline{' '}
                  {numero2(evaluacion28.consolidado.mae_28_baseline as number | null)}
                </p>
              </div>
              <div className="ac-tarjeta">
                <span className="ac-tarjeta-etq">WAPE_28</span>
                <span className="ac-tarjeta-valor" data-testid="eval28-wape">
                  {evaluacion28.consolidado.wape_28 === null
                    ? 'n/c'
                    : `${numero2(evaluacion28.consolidado.wape_28 as number)} %`}
                </span>
                <p className="ac-tarjeta-pie">
                  Σ|error del horizonte| ÷ Σ observado del horizonte · baseline{' '}
                  {evaluacion28.consolidado.wape_28_baseline === null
                    ? 'n/c'
                    : `${numero2(evaluacion28.consolidado.wape_28_baseline as number)} %`}
                </p>
              </div>
              <div className="ac-tarjeta" data-testid="eval28-sesgo">
                <span className="ac-tarjeta-etq">
                  Sesgo del horizonte · {UNIDAD_SESGO.horizonte}
                </span>
                <span className="ac-tarjeta-valor">
                  {numero2(evaluacion28.consolidado.sesgo_28 as number | null)}
                </span>
                <p className="ac-tarjeta-pie">
                  {FORMULA_SESGO.horizonte}. Positivo = sobreestimación, negativo = subestimación,
                  cero = sin sesgo neto (no ausencia de error).
                </p>
              </div>
              <div className="ac-tarjeta">
                <span className="ac-tarjeta-etq">Cortes y cobertura</span>
                <span className="ac-tarjeta-valor">
                  {numero(evaluacion28.cortes.length)} cortes
                </span>
                <p className="ac-tarjeta-pie">
                  {numero(evaluacion28.cobertura.series_evaluadas)} de{' '}
                  {numero(evaluacion28.cobertura.series_universo)} series evaluadas (
                  {numero1(evaluacion28.cobertura.pct_evaluadas ?? 0)} %)
                </p>
              </div>
            </div>

            

            <div className="ac-tabla-marco">
              <table className="ac-tabla">
                <caption>Error del horizonte por corte · candidato frente a baseline</caption>
                <thead>
                  <tr>
                    <th scope="col">Corte</th>
                    <th scope="col">Horizonte</th>
                    <th scope="col" className="ac-tabla-num">MAE_28</th>
                    <th scope="col" className="ac-tabla-num">WAPE_28</th>
                    <th scope="col" className="ac-tabla-num">Sesgo ({UNIDAD_SESGO.horizonte})</th>
                    <th scope="col" className="ac-tabla-num">MAE_28 baseline</th>
                    <th scope="col" className="ac-tabla-num">MAE_28 · mejora</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluacion28.cortes.map((corte) => (
                    <tr key={corte.origen_d}>
                      <th scope="row">
                        {fechaCorta(corte.origen_fecha)}
                        <span className="ac-plan-codigo">d_{corte.origen_d}</span>
                      </th>
                      <td>{fechaCorta(corte.fin_fecha)}</td>
                      <td className="ac-tabla-num">{numero2(corte.mae_28)}</td>
                      <td className="ac-tabla-num">
                        {corte.wape_28 === null ? 'n/c' : `${numero2(corte.wape_28)} %`}
                      </td>
                      <td className="ac-tabla-num">{numero2(corte.sesgo_28)}</td>
                      <td className="ac-tabla-num">{numero2(corte.mae_28_baseline)}</td>
                      <td className="ac-tabla-num" data-testid={`eval28-mejora-${corte.origen_d}`}>
                        {interpretarMejora(corte.mae_28, corte.mae_28_baseline).textoCorto}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4>Grupos descriptivos con información anterior a cada corte</h4>
            <div className="ac-tabla-marco">
              <table className="ac-tabla">
                <caption>
                  Error del horizonte por volumen e intermitencia previos (8 semanas antes del
                  corte)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Grupo</th>
                    <th scope="col" className="ac-tabla-num">Series</th>
                    <th scope="col" className="ac-tabla-num">MAE_28</th>
                    <th scope="col" className="ac-tabla-num">WAPE_28</th>
                    <th scope="col" className="ac-tabla-num">Mejora</th>
                  </tr>
                </thead>
                <tbody>
                  {[...evaluacion28.por_volumen, ...evaluacion28.por_intermitencia].map((grupo) => (
                    <tr key={grupo.clave}>
                      <th scope="row">{grupo.clave}</th>
                      <td className="ac-tabla-num">{numero(grupo.series)}</td>
                      <td className="ac-tabla-num">{numero2(grupo.mae_28)}</td>
                      <td className="ac-tabla-num">
                        {grupo.wape_28 === null ? 'n/c' : `${numero2(grupo.wape_28)} %`}
                      </td>
                      <td className="ac-tabla-num">
                        {interpretarMejora(grupo.mae_28, grupo.mae_28_baseline).textoCorto}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ac-tabla-marco">
              <table className="ac-tabla">
                <caption>Estado descriptivo por serie · cortes que lo sustentan</caption>
                <thead>
                  <tr>
                    <th scope="col">Estado</th>
                    <th scope="col" className="ac-tabla-num">Series</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluacion28.estados.map((estado) => (
                    <tr key={estado.clave}>
                      <th scope="row">{estado.etiqueta}</th>
                      <td className="ac-tabla-num">{numero(estado.series)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="ac-dl">
              <dt>Sobreestimación / subestimación</dt>
              <dd>
                {numero(evaluacion28.sesgo?.sobreestima ?? 0)} registros con error positivo ·{' '}
                {numero(evaluacion28.sesgo?.subestima ?? 0)} con error negativo ·{' '}
                {numero(evaluacion28.sesgo?.exactos ?? 0)} exactos
              </dd>
              <dt>Granos</dt>
              <dd>
                El error diario por serie es otra métrica: no se obtiene sumando errores diarios el
                error del horizonte. El total agregado de todas las series se mide en el bloque de
                ventanas.
              </dd>
            </dl>
            <Nota>{evaluacion28.nota ?? ''}</Nota>
          </>
        ) : null}
      

        </div>

        <h4 data-testid="resumen-alcance-global">
          Comparación global del universo · no responde a los filtros
        </h4>
        <div data-testid="evaluacion-comparacion">
        {finales.length ? (
          <>
            <div className="ac-rejilla">
              <div className="ac-tarjeta">
                <span className="ac-tarjeta-etq">MAE · artículo × tienda × día</span>
                <span className="ac-tarjeta-valor">
                  {maeDetalleCandidato === null ? 'n/c' : numero2(maeDetalleCandidato)}
                </span>
                <p className="ac-tarjeta-pie">
                  Baseline {maeDetalleBaseline === null ? 'n/c' : numero2(maeDetalleBaseline)} ·
                  consolidado de {numero(finales.length)} ventanas finales (unidades por serie-día)
                </p>
              </div>
              <div className="ac-tarjeta" data-testid="evaluacion-wape">
                <span className="ac-tarjeta-etq">WAPE consolidado · artículo × tienda × día</span>
                <span className="ac-tarjeta-valor">
                  {wapeDetalleCandidato === null ? 'n/c' : `${numero2(wapeDetalleCandidato)} %`}
                </span>
                <p className="ac-tarjeta-pie">
                  Baseline {wapeDetalleBaseline === null ? 'n/c' : `${numero2(wapeDetalleBaseline)} %`}
                  {' · '}
                  <strong>WAPE = Σ|error| ÷ Σobservado</strong> sumando todas las series y días de
                  las ventanas. El promedio simple de las ventanas es una medida distinta y no se
                  usa como cifra principal.
                </p>
              </div>
              <div className="ac-tarjeta" data-testid="evaluacion-mae-agregado">
                <span className="ac-tarjeta-etq">
                  MAE · total del segmento por día · unidades por día del segmento
                </span>
                <span className="ac-tarjeta-valor">
                  {maeAgregadoCandidato === null ? 'n/c' : numero2(maeAgregadoCandidato)}
                </span>
                <p className="ac-tarjeta-pie">
                  Baseline {maeAgregadoBaseline === null ? 'n/c' : numero2(maeAgregadoBaseline)} ·{' '}
                  {interpretarMejora(maeAgregadoCandidato, maeAgregadoBaseline).texto}. Sumar las
                  series antes de comparar cambia el error; el error de este grano no se obtiene
                  sumando los MAE de los segmentos.
                </p>
              </div>
              <div className="ac-tarjeta" data-testid="evaluacion-sesgo-diario">
                <span className="ac-tarjeta-etq">Sesgo del modelo · {UNIDAD_SESGO.diario}</span>
                <span className="ac-tarjeta-valor">
                  {consolidadoDetalle?.candidato?.sesgo === null ||
                  consolidadoDetalle?.candidato?.sesgo === undefined
                    ? 'n/c'
                    : numero2(consolidadoDetalle.candidato.sesgo)}
                </span>
                <p className="ac-tarjeta-pie">
                  {FORMULA_SESGO.diario} · positivo = sobreestimación, negativo = subestimación, cero
                  = sin sesgo neto (no ausencia de error)
                </p>
              </div>
            </div>

            <div className="ac-tabla-marco">
              <table className="ac-tabla">
                <caption>
                  Comparación por ventana final y grano · modelo frente a baseline estacional
                  semanal
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Ventana</th>
                    <th scope="col">Grano</th>
                    <th scope="col" className="ac-tabla-num">MAE modelo</th>
                    <th scope="col" className="ac-tabla-num">MAE baseline</th>
                    <th scope="col" className="ac-tabla-num">Diferencia</th>
                    <th scope="col" className="ac-tabla-num">Mejora</th>
                    <th scope="col" className="ac-tabla-num">WAPE modelo</th>
                    <th scope="col" className="ac-tabla-num">WAPE baseline</th>
                  </tr>
                </thead>
                <tbody>
                  {finales.map((corte) => (
                    <VentanaFilas key={corte.origen_d} corte={corte} />
                  ))}
                </tbody>
              </table>
            </div>
            <Nota>
              Con {numero(finales.length)} ventanas finales no se afirma significancia estadística
              ni superioridad universal: se reportan las ventanas publicadas, incluidas las que
              empeoran.
            </Nota>
            {deteriorosAgregados.length ? (
              <Nota>
                En el grano <strong>total del segmento por día</strong> el candidato empeora en{' '}
                {deteriorosAgregados
                  .map(
                    (fila) =>
                      `${fila.etiqueta} (${interpretarMejora(
                        fila.maeCandidato,
                        fila.maeBaseline,
                      ).textoCorto})`,
                  )
                  .join(' · ')}
                . Son cifras del grano agregado y no describen el error por artículo × tienda ×
                día.
              </Nota>
            ) : null}
          </>
        ) : (
          <p className="ac-cargando" role="status">
            {errorVentanas
              ? errorVentanas
              : cargandoVentanas
                ? 'Calculando la comparación por ventana…'
                : 'Sin ventanas finales publicadas para esta etapa.'}
          </p>
        )}
      
        </div>
      </Bloque>

      {/* C. Resultados por segmento --------------------------------------- */}
      <Bloque
        titulo="3 · Resultados por segmento"
        descripcion="Quién concentra el error, con identidad comercial completa; el recuento y la tabla cubren el mismo conjunto y grano"
        testid="evaluacion-segmentos"
      >
      <PanelEvaluacion
        evaluacion={evaluacion}
        etapa={etapa}
        cargando={cargando}
        onEtapa={onEtapa}
        etapas={etapasDisponibles}
        nivel={nivel}
        onNivel={onNivel}
        segmento={segmento}
        onSegmento={setSegmento}
      />
      </Bloque>

      {/* 3. Ventana histórica: observado, baseline y modelo ---------------- */}
      <Bloque
        titulo="4 · Comparación visual del corte"
        descripcion="Las 28 fechas del corte elegido ya ocurrieron, así que el observado real se puede dibujar junto a las dos predicciones"
        testid="evaluacion-corte"
      >
        <div className="ac-df-controles ac-controles-locales" data-testid="controles-corte">
          <Segmentado<NivelPronosticoNivel>
            etiqueta="Agrupar por"
            valor={nivel}
            onElegir={onNivel}
            testid="selector-nivel-evaluacion"
            opciones={NivelesElegibles}
          />
          <Segmentado<'desarrollo' | 'final'>
            etiqueta="Etapa del corte mostrado"
            valor={etapa}
            onElegir={onEtapa}
            testid="selector-etapa-corte"
            opciones={etapasDisponibles}
          />
          {etapaConCortes ? (
            <Segmentado<string>
              etiqueta="Corte mostrado"
              valor={String(origen)}
              onElegir={(valor) => onOrigen(Number(valor))}
              testid="selector-corte-evaluacion"
              opciones={cortesGrafico.map((corte) => ({
                valor: String(corte.origen_d),
                texto: fechaCorta(corte.origen_fecha),
              }))}
            />
          ) : null}
        </div>
        {!etapaConCortes ? (
          <p className="ac-aviso-inline" role="status" data-testid="corte-sin-etapa">
            <strong>
              Sin corte dibujable en «{etapa === 'final' ? 'Cortes finales' : 'Desarrollo'}»:
            </strong>{' '}
            {etapa === 'desarrollo'
              ? 'esta ejecución tiene métricas de desarrollo en las tablas, pero no publica predicciones por día para esos cortes, así que no hay fechas que dibujar. No se reutilizan fechas de otra etapa.'
              : 'esta etapa no publica cortes con predicciones por día.'}{' '}
            {etapa === 'desarrollo'
              ? 'Cambia a «Cortes finales» para ver la comparación visual.'
              : 'Revisa el resumen y el desglose de esta etapa.'}
          </p>
        ) : null}

        {pronosticos ? (
          <>
            <h4 data-testid="grafico-alcance">
              {alcanceGrafico(pronosticos)}
            </h4>
            <p className="ac-nota">
              Corte seleccionado: <strong>{fechaCorta(pronosticos.origen_fecha)}</strong> · ventana{' '}
              {pronosticos.rango_objetivo
                ? `${fechaCorta(pronosticos.rango_objetivo.desde)} – ${fechaCorta(pronosticos.rango_objetivo.hasta)}`
                : '—'}{' '}
              · {numeralNivel(nivel)} · {numero(pronosticos.series.length)} series incluidas en la
              suma
            </p>
            <GraficoPronostico datos={pronosticos} titulo={alcanceGrafico(pronosticos)} />
            <ul className="ac-df-leyenda" data-testid="leyenda-corte">
              <li>
                <span className="ac-df-muestra ac-df-muestra--observado" /> Ventas observadas antes
                del corte
              </li>
              <li>
                <span className="ac-df-muestra ac-df-muestra--modelo" /> Pronóstico del modelo
              </li>
              <li>
                <span className="ac-df-muestra ac-df-muestra--baseline" /> Referencia estacional
              </li>
              <li>
                <span className="ac-df-muestra ac-df-muestra--real" /> Ventas observadas después del
                corte
              </li>
            </ul>
            <details className="ac-df-agregacion" data-testid="corte-agregacion">
              <summary>Cómo se agrega esta gráfica</summary>
              <p>{definicionAgregacion(pronosticos)}</p>
            </details>
            <Nota>
              Unidades vendidas históricas de M5. No se dibujan bandas de incertidumbre porque no
              se han calculado intervalos; la zona del pronóstico se distingue del histórico
              observado.
            </Nota>
          </>
        ) : etapaConCortes ? (
          <p className="ac-cargando" role="status" data-testid="corte-cargando">
            {cargando ? 'Calculando el corte seleccionado…' : 'Sin corte cargado.'}
          </p>
        ) : null}
      </Bloque>

      {/* E. Metodología, fórmulas y auditoría (desplegable) ---------------- */}
      <details
        className="ac-panel ac-evaluacion-metodologia"
        id="evaluacion-metodologia"
        data-testid="evaluacion-metodologia"
        open={metodologiaAbierta}
        onToggle={(evento) => setMetodologiaAbierta(evento.currentTarget.open)}
      >
        <summary data-testid="evaluacion-metodologia-resumen">
          <strong>5 · Metodología, fórmulas y auditoría temporal</strong>
          <span className="ac-panel-sub">
            Protocolo, definiciones del sesgo y la mejora, matriz por horizonte, tablas extensas por
            ventana y evidencia de separación temporal entre entrenamiento y evaluación.
          </span>
        </summary>

        <section className="ac-panel ac-panel--anidado" data-testid="evaluacion-protocolo">
          <h4>Protocolo de evaluación</h4>
        <ProtocoloEvaluacion
          modelos={modelos}
          ventanas={ventanas}
          testid="evaluacion-protocolo-texto"
        />

        <dl className="ac-dl">
          <dt>Cortes evaluados en esta vista</dt>
          <dd>
            {cortes.length
              ? `${numero(cortes.length)} cortes de la etapa «${etapa}»: ${numero(desarrollo.length)} de desarrollo y ${numero(finales.length)} de evaluación final`
              : 'sin cortes publicados'}
            {finales.length
              ? ` · finales: ${finales
                  .map(
                    (corte) =>
                      `${fechaCorta(corte.origen_fecha)} → ${fechaCorta(corte.fin_fecha)} (d_${corte.origen_d})`,
                  )
                  .join(' · ')}`
              : ''}
          </dd>
          <dt>Horizonte</dt>
          <dd>{ventanas?.horizonte ?? pronosticos?.horizonte ?? 28} días por corte.</dd>
          <dt>Series</dt>
          <dd>
            {finales.length
              ? `${numero(Math.max(...finales.map((corte) => corte.series)))} series artículo × tienda por corte`
              : 'detalle en la tabla completa'}
          </dd>
          <dt>Información permitida</dt>
          <dd>
            En cada corte el modelo usa solo días anteriores al corte; el observado posterior se
            emplea exclusivamente para medir.{' '}
            {modelos?.ejecuciones?.find((fila) => fila.recomendado)?.supuestos?.precio_futuro ??
              'La ejecución publicada no usa precios.'}
          </dd>
          <dt>Alcance de esta pantalla</dt>
          <dd>
            Los bloques de comparación muestran la evaluación <strong>global</strong> de la ventana
            en cada grano; cambiar el nivel de la cabecera cambia la gráfica del corte histórico y
            la tabla de segmentos, no el consolidado global, que se rotula como tal.
          </dd>
          <dt>Granos</dt>
          <dd>
            {ventanas?.granos?.length
              ? ventanas.granos.map((grano) => (grano === 'detalle' ? 'artículo × tienda × día' : 'total del segmento por día')).join(' y ')
              : 'artículo × tienda × día y total del segmento por día'}
            . No son comparables entre sí: el error de una serie suelta y el del total diario miden
            cosas distintas.
          </dd>
        </dl>
        {ventanas?.advertencias?.length ? (
          <ul className="ac-nota">
            {ventanas.advertencias.map((advertencia) => (
              <li key={advertencia}>{advertencia}</li>
            ))}
          </ul>
        ) : null}
      
        </section>

        <section className="ac-panel ac-panel--anidado" data-testid="evaluacion-definiciones">
          <h4>Cómo se lee el sesgo y la mejora</h4>
          <p className="ac-nota">
            Mejora = (error baseline − error modelo) ÷ error baseline. «Mismo error» se reserva a los
            errores numéricamente iguales dentro de la precisión del cálculo; por debajo del umbral de
            0,05 % (0,0005 en razón) se informa «diferencia inferior a 0,05 %» sin declarar empate ni
            equivalencia estadística o comercial.
          </p>
<details className="ac-panel ac-panel--nota" data-testid="sesgo-convencion">
              <summary>
                Cómo se lee el sesgo: <strong>pronóstico − observado</strong>, en media (positivo =
                sobreestimación, negativo = subestimación)
              </summary>
              <p>
                Los tres granos se miden con la misma convención de signo pero en unidades distintas,
                y no son intercambiables:
              </p>
              <ul>
                <li>
                  <strong>Sesgo diario</strong> ({UNIDAD_SESGO.diario}): {FORMULA_SESGO.diario}.
                </li>
                <li>
                  <strong>Sesgo del horizonte</strong> ({UNIDAD_SESGO.horizonte}):{' '}
                  {FORMULA_SESGO.horizonte}.
                </li>
                <li>
                  <strong>Sesgo de un agregado diario</strong> ({UNIDAD_SESGO.agregado}):{' '}
                  {FORMULA_SESGO.agregado}.
                </li>
              </ul>
              <p>Ejemplos verificables:</p>
              <ul>
                <li>
                  Pronóstico 12 u frente a 10 u observadas → sesgo <strong>+2</strong>: el modelo
                  sobreestima 2 unidades.
                </li>
                <li>
                  Pronóstico 8 u frente a 10 u observadas → sesgo <strong>−2</strong>: el modelo
                  subestima 2 unidades.
                </li>
                <li>
                  Pronóstico igual a lo observado → sesgo <strong>0</strong>: sin sesgo neto en ese
                  agregado, que no significa error cero (los errores con signo opuesto se
                  compensan).
                </li>
              </ul>
            </details>
        </section>

        <section className="ac-panel ac-panel--anidado" data-testid="evaluacion-matriz">
          <h4>Matriz ventana × horizonte</h4>
      <MatrizDesempeno
        datos={matrizDesempeno}
        cargando={cargandoMatriz}
        error={errorMatriz}
        lectura={lecturaMatriz}
        onLectura={onLecturaMatriz}
        metodo={metodoSesgo}
        onMetodo={onMetodoSesgo}
        onReintentar={onReintentar}
      />

        </section>

        <section className="ac-panel ac-panel--anidado" data-testid="evaluacion-ventanas-tablas">
          <h4>Tablas completas por ventana y grano</h4>
      <EvaluacionVentanas
        datos={ventanas}
        cargando={cargandoVentanas}
        error={errorVentanas}
        onReintentar={onReintentar}
      />

        </section>

        <section className="ac-panel ac-panel--anidado" data-testid="evaluacion-auditoria-temporal">
          <h4>Auditoría de separación temporal</h4>
          <AuditoriaTemporal
            datos={auditoria}
            cargando={cargandoAuditoria}
            error={errorAuditoria}
          />
        </section>
      </details>

      <section className="ac-panel">
        <div className="ac-acciones">
          <button type="button" className="ac-accion" onClick={() => onIr('resultados')}>
            Ver el pronóstico publicado
          </button>
          <button
            type="button"
            className="ac-accion ac-accion--secundaria"
            onClick={() => onIr('modelado')}
          >
            Revisar el modelado
          </button>
        </div>
        {evaluacion?.modelo ? (
          <Nota>
            Evaluación de la ejecución {evaluacion.modelo.run_id} · método{' '}
            {evaluacion.modelo.metodo} · nivel {nivel} · etapa {etapa}. Cambiar de etapa o de
            corte actualiza estas tablas, no recalcula el modelo.
          </Nota>
        ) : null}
      </section>
    </div>
  );
}

/** Dos filas por ventana: grano de detalle y grano agregado, nunca mezclados. */
function VentanaFilas({ corte }: { corte: VentanasEvaluacionRespuesta['ventanas'][number] }) {
  const filas = [
    { etiqueta: 'artículo × tienda × día', grano: corte.detalle },
    { etiqueta: 'total del segmento por día', grano: corte.agregado },
  ];
  return (
    <>
      {filas.map((fila) => (
        <tr key={`${corte.origen_d}-${fila.etiqueta}`}>
          <th scope="row">
            {fechaCorta(corte.origen_fecha)} → {fechaCorta(corte.fin_fecha)}
          </th>
          <td>{fila.etiqueta}</td>
          <td className="ac-tabla-num">
            {fila.grano.candidato.mae === null ? 'n/c' : numero1(fila.grano.candidato.mae)}
          </td>
          <td className="ac-tabla-num">
            {fila.grano.baseline.mae === null ? 'n/c' : numero1(fila.grano.baseline.mae)}
          </td>
          <td className="ac-tabla-num">
            {fila.grano.diferencia_absoluta === null
              ? 'n/c'
              : numero1(fila.grano.diferencia_absoluta)}
          </td>
          <td className="ac-tabla-num">
            {interpretarMejora(fila.grano.candidato.mae, fila.grano.baseline.mae).textoCorto}
          </td>
          <td className="ac-tabla-num">
            {fila.grano.candidato.wape_pct === null
              ? 'n/c'
              : `${numero1(fila.grano.candidato.wape_pct)} %`}
          </td>
          <td className="ac-tabla-num">
            {fila.grano.baseline.wape_pct === null
              ? 'n/c'
              : `${numero1(fila.grano.baseline.wape_pct)} %`}
          </td>
        </tr>
      ))}
    </>
  );
}

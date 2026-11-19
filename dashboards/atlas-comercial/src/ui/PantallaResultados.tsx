/**
 * Pantalla «Resultados».
 *
 * Consulta del pronóstico publicado: unidades, fechas, nivel del selector, corte, total y
 * promedio diario, evolución diaria, desglose por segmento y descarga de exactamente la
 * selección mostrada.
 *
 * Todo el contenido procede de `PanelPronostico` (gráfica, controles, desglose y CSV).
 * Esta pantalla añade la lectura de conjunto y las limitaciones que hay que tener
 * presentes antes de usar las cifras, y enlaza a «Evaluación» para el error medido.
 */

import type {
  EvaluacionRespuesta,
  NivelPronosticoNivel,
  PronosticosRespuesta,
} from '../api';
import type {
  DetallePlanRespuesta,
  EstadoRespuesta,
  OrdenPlan,
  PlanificacionRespuesta,
} from '../api';
import type { EstadoConsulta, SeleccionPronostico } from '../seleccion';
import { Planificacion } from './Planificacion';
import type { PantallaId } from './NavPantallas';
import { PanelPronostico } from './Pronostico';
import { Bloque, Nota } from './pantallas-comun';

export function PantallaResultados({
  pronosticos,
  evaluacion,
  cargando,
  error,
  estado,
  seleccion,
  onCompletar,
  onIrEvaluacion,
  nivel,
  etapa,
  origen,
  onNivel,
  onEtapa,
  onOrigen,
  contextoTerritorio,
  contextoCatalogo,
  onIr,
  onReintentar,
  estadoApi,
  plan,
  planDetalle,
  cargandoPlan,
  cargandoPlanDetalle,
  errorPlan,
  errorPlanDetalle,
  planTexto,
  planOrden,
  planMinimo,
  planSeleccion,
  descargandoPlan,
  avisoDescarga,
  vistaPlan,
  onVistaPlan,
  onPlanOrden,
  onPlanPagina,
  onPlanMinimo,
  onPlanSeleccion,
  onPlanDescargar,
  onExplorarArticulo,
}: {
  pronosticos: PronosticosRespuesta | null;
  evaluacion: EvaluacionRespuesta | null;
  cargando: boolean;
  error: string | null;
  /** Estado excluyente de la consulta del pronóstico. */
  estado: EstadoConsulta;
  /** Resolución de nivel y artículos: la misma que viaja en la petición. */
  seleccion: SeleccionPronostico;
  /** Lleva al contexto activo para completar la selección. */
  onCompletar?: () => void;
  /** Enlace a la pantalla donde vive la evaluación completa. */
  onIrEvaluacion?: () => void;
  nivel: NivelPronosticoNivel;
  etapa: 'desarrollo' | 'final';
  origen: 'futuro' | number;
  onNivel: (nivel: NivelPronosticoNivel) => void;
  onEtapa: (etapa: 'desarrollo' | 'final') => void;
  onOrigen: (origen: 'futuro' | number) => void;
  contextoTerritorio: string;
  contextoCatalogo: string;
  onIr: (pantalla: PantallaId) => void;
  onReintentar: () => void;
  estadoApi: EstadoRespuesta | null;
  plan: PlanificacionRespuesta | null;
  planDetalle: DetallePlanRespuesta | null;
  cargandoPlan: boolean;
  cargandoPlanDetalle: boolean;
  errorPlan: string | null;
  errorPlanDetalle: string | null;
  planTexto: string;
  planOrden: OrdenPlan;
  planMinimo: number | null;
  planSeleccion: { store_id: string; item_id: string } | null;
  descargandoPlan: boolean;
  avisoDescarga: string | null;
  vistaPlan: 'semanal' | 'historica';
  onVistaPlan: (vista: 'semanal' | 'historica') => void;
  onPlanOrden: (valor: OrdenPlan) => void;
  onPlanPagina: (valor: number) => void;
  onPlanMinimo: (valor: number | null) => void;
  onPlanSeleccion: (fila: { store_id: string; item_id: string } | null) => void;
  onPlanDescargar: () => void;
  onExplorarArticulo: (item: string, tienda: string) => void;
}) {
  return (
    <div className="ac-bloques" data-testid="resultados-estado" data-estado={estado}>
      <Planificacion
        datos={plan}
        detalle={planDetalle}
        cargando={cargandoPlan}
        cargandoDetalle={cargandoPlanDetalle}
        error={errorPlan}
        errorDetalle={errorPlanDetalle}
        estadoApi={estadoApi}
        modelo={pronosticos?.modelo ?? null}
        texto={planTexto}
        orden={planOrden}
        minimoObservado={planMinimo}
        seleccion={planSeleccion}
        vista={vistaPlan}
        onVista={onVistaPlan}
        onOrden={onPlanOrden}
        onPagina={onPlanPagina}
        onMinimoObservado={onPlanMinimo}
        onSeleccion={onPlanSeleccion}
        onReintentar={onReintentar}
        onExplorarArticulo={onExplorarArticulo}
        onIrEvaluacion={() => onIr('evaluacion')}
        onDescargar={onPlanDescargar}
        descargando={descargandoPlan}
        avisoDescarga={avisoDescarga}
      />

      <details className="ac-plan-nacional" data-testid="plan-curva-nacional">
        <summary>Ver la curva del total nacional (vista secundaria)</summary>
        <p className="ac-nota">
          Vista agregada del pronóstico publicado. El plan de ventas de arriba es la vista
          principal; esta curva sirve para leer el total del conjunto y su baseline.
        </p>
        <PanelPronostico
          pronosticos={pronosticos}
          evaluacion={evaluacion}
          cargando={cargando}
          nivel={nivel}
          etapa={etapa}
          origen={origen}
          onNivel={onNivel}
          onEtapa={onEtapa}
          onOrigen={onOrigen}
          contextoTerritorio={contextoTerritorio}
          contextoCatalogo={contextoCatalogo}
          error={error}
          estado={estado}
          seleccion={seleccion}
          onCompletar={onCompletar}
          onReintentar={onReintentar}
          onIrEvaluacion={onIrEvaluacion}
          descarga
          simple
        />
      </details>
      <Bloque
        titulo="Ventas previstas no son órdenes de compra"
        descripcion="Qué miden estas cifras y qué haría falta para abastecer"
        testid="resultados-lectura"
      >
        <p>
          Estas cifras estiman unidades vendidas. Para calcular abastecimiento se requieren
          inventario, pedidos en tránsito, plazos de entrega y reglas de compra.
        </p>
        <dl className="ac-dl">
          <dt>Qué se muestra</dt>
          <dd>
            Unidades previstas por artículo × tienda para los 28 días posteriores al corte
            histórico, con el total del horizonte, las cuatro semanas y su comparación descriptiva
            con los 28 días anteriores.
          </dd>
          <dt>Unidad</dt>
          <dd>Unidades vendidas del conjunto histórico de M5; no son ingresos ni pedidos.</dd>
          <dt>Precisión</dt>
          <dd>
            La revisión publicada conserva la serie canónica en decimales y el redondeo se aplica
            solo al presentar (dos decimales en la tabla; cuatro en el CSV). Los totales se calculan
            con la serie sin redondear: la suma de las cifras visibles puede diferir del total en
            centésimas, y la igualdad exacta existe entre valores canónicos, no entre los
            redondeados. La evaluación usa esas mismas cifras.
          </dd>
          <dt>Integración futura para abastecimiento</dt>
          <dd>
            Inventario utilizable · entradas confirmadas y sus fechas · compromisos · plazos de
            entrega · múltiplos y mínimos de compra · nivel de servicio objetivo · capacidad y
            caducidad cuando aplique. Este incremento no simula compras ni rellena esos campos.
          </dd>
        </dl>
        <Nota>
          Datos históricos de M5: el corte es el fin del histórico del conjunto, no la fecha de
          hoy. No hay intervalos de predicción calculados y no se generan recomendaciones de
          compra, inventario ni precios.
        </Nota>
        <div className="ac-acciones">
          <button type="button" className="ac-accion ac-accion--secundaria" onClick={() => onIr('evaluacion')}>
            Ver la evaluación completa
          </button>
          <button type="button" className="ac-accion ac-accion--secundaria" onClick={() => onIr('modelado')}>
            Revisar el modelo
          </button>
        </div>
      </Bloque>
    </div>
  );
}

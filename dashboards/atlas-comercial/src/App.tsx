/**
 * Aplicación «Atlas Comercial» (Walmart M5).
 *
 * Seis pantallas que siguen el ciclo de un proyecto de ciencia de datos, cada una con su
 * propia dirección:
 *
 *   Proyecto → Datos y calidad → Exploración → Modelado → Evaluación → Resultados
 *
 * Dos jerarquías se cruzan, con **un único estado de filtros**:
 *
 * - Territorio: Estados Unidos → estado → tienda (panorama territorial).
 * - Catálogo: categoría → departamento → producto (composición comercial).
 *
 * La pantalla «Exploración» conserva las cuatro subsecciones descriptivas (panorama,
 * estacionalidad, precios y detalle de artículo); «Resultados» y «Evaluación» reutilizan
 * los paneles del pronóstico, y «Datos y calidad» y «Modelado» leen sus propias fuentes.
 *
 * - Cada carga lleva un turno: una respuesta antigua se descarta y nunca se mezcla con
 *   un contexto nuevo.
 * - El estado vive en la URL (`ac_pantalla`, `ac_sub`, `ac_estado`, `ac_tienda`, `ac_cat`,
 *   `ac_dept`, `ac_skus`, `ac_anio`, `ac_modo`, periodo y A/B): recargar, compartir y
 *   Atrás/Adelante reproducen la misma vista. Las direcciones antiguas (`ac_sec`) se
 *   redirigen a la pantalla equivalente conservando el resto de parámetros.
 * - Los filtros incompatibles se resuelven de forma explícita y visible, nunca en
 *   silencio.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  api,
  baseApi,
  ErrorApi,
  type Agregacion,
  type CatalogoRespuesta,
  type EstadoRespuesta,
  type EvaluacionRespuesta,
  type HistoricoRespuesta,
  type ModoHistorico,
  type ModoSerie,
  type NivelExploracion,
  type NivelPronosticoNivel,
  type PronosticosRespuesta,
  type PulsoRespuesta,
  type SerieTienda,
  type ArticuloRespuesta,
  type CambiosPreciosRespuesta,
  type ComparacionTiendaCategoriaRespuesta,
  type DimensionEstacionalidad,
  type DistribucionPreciosRespuesta,
  type EstacionalidadRespuesta,
  type IntermitenciaRespuesta,
  type MatrizDesempenoRespuesta,
  type MatrizTemporalRespuesta,
  type FilaComparacionTiendaCategoria,
  type DetallePlanRespuesta,
  type MetricaAB,
  type ModelosRespuesta,
  type OrdenPlan,
  type EvaluacionHorizonteRespuesta,
  type PlanificacionRespuesta,
  type ProductoConUnidades,
  type AuditoriaTemporalRespuesta,
  type VentanasEvaluacionRespuesta,
} from './api';
import { ComparacionTiendaCategoria, type OrdenAB } from './ui/ComparacionTiendaCategoria';
import { ComposicionComercial } from './ui/Composicion';
import { DetalleArticulo } from './ui/DetalleArticulo';
import { Estacionalidad } from './ui/Estacionalidad';
import type { LecturaMatriz, MetodoSesgo } from './ui/MatrizDesempeno';
import { MatrizTemporal } from './ui/MatrizTemporal';
import {
  estadoDeConsulta,
  nivelAgregadoSugerido,
  resolverSeleccionPronostico,
} from './seleccion';
import { cifra, DECIMALES_CSV, toleranciaCsv } from './metricas';
import {
  etiquetaArticulo,
  etiquetaCategoria,
  etiquetaEstado,
  etiquetaDepartamento,
  etiquetaTienda,
  fechaLarga,
  fechaRango,
  numero as numeroEtiqueta,
  estadoEvaluacion,
} from './etiquetas';
import { descargarCsv } from './ui/descargas';
import { BarraContexto } from './ui/BarraContexto';
import { NavPantallas, type PantallaId } from './ui/NavPantallas';
import { PantallaDatos } from './ui/PantallaDatos';
import { PantallaEvaluacion } from './ui/PantallaEvaluacion';
import { PantallaModelado } from './ui/PantallaModelado';
import { PantallaProyecto } from './ui/PantallaProyecto';
import { PantallaResultados } from './ui/PantallaResultados';
import { Precios } from './ui/Precios';
import { ExploradorProductos } from './ui/ExploradorProductos';
import { HistoricoEditorial } from './ui/HistoricoEditorial';
import { Multiples, claveDe } from './ui/Multiples';
import { TarjetasEstado } from './ui/Panorama';
import { ComparacionConcentracion, PulsoVentas } from './ui/PulsoVentas';
import { RutasContexto, type SegmentoRuta } from './ui/RutasContexto';
import { Segmentado } from './ui/Segmentado';
import {
  DesplegableComparar,
  DesplegablePeriodo,
  formatFecha,
  resumenPeriodo,
} from './ui/Controles';

/** Subsecciones de la pantalla «Exploración» (una sola tira, nunca filas apiladas). */
type SubExploracion = 'panorama' | 'estacionalidad' | 'precios' | 'articulo';

/** Orden del ciclo de trabajo; el índice se usa para el resumen de contexto. */
const ORDEN_PANTALLAS: PantallaId[] = [
  'proyecto',
  'datos',
  'exploracion',
  'modelado',
  'evaluacion',
  'resultados',
];

const SECCIONES: { valor: SubExploracion; texto: string }[] = [
  { valor: 'panorama', texto: 'Panorama' },
  { valor: 'estacionalidad', texto: 'Estacionalidad' },
  { valor: 'precios', texto: 'Precios' },
  { valor: 'articulo', texto: 'Detalle de artículo' },
];
type Intervalo = { desde: string; hasta: string };

const MAX_PRODUCTOS = 5;
const ESTADO_NOMBRE: Record<string, string> = { CA: 'California', TX: 'Texas', WI: 'Wisconsin' };
const CATEGORIA_NOMBRE: Record<string, string> = {
  FOODS: 'Alimentos',
  HOBBIES: 'Aficiones',
  HOUSEHOLD: 'Hogar',
};

/** Estado persistido en la URL (prefijo `ac_` para no chocar con el sitio). */
interface EstadoUrl {
  agregacion: Agregacion;
  periodo: Intervalo | null;
  ab: { a: Intervalo; b: Intervalo } | null;
  estado: string | null;
  tienda: string | null;
  categoria: string | null;
  departamento: string | null;
  productos: string[];
  anio: number | null;
  modo: ModoHistorico;
  pantalla: PantallaId;
  sub: SubExploracion;
  /** Tienda del análisis de precios de «Datos y calidad» (independiente del territorio). */
  tiendaPrecios: string | null;
  /** Nivel pedido en «Resultados»; se normaliza al resolver la selección. */
  nivel: NivelPronosticoNivel;
  item: string | null;
  /* Plan de ventas: solo lo propio de la tabla; los filtros son los compartidos. */
  planOrden: OrdenPlan;
  planPagina: number;
  planItem: string | null;
  planVista: 'semanal' | 'historica';
  /** Texto de búsqueda del plan: también vive en la URL para sobrevivir a la recarga. */
  planTexto: string;
  /** Etapa y corte de la evaluación: se conservan en la URL para recarga e historial. */
  etapa: 'desarrollo' | 'final';
  origenEval: number | null;
}

function leerUrl(): EstadoUrl {
  const vacio: EstadoUrl = {
    agregacion: 'semana',
    periodo: null,
    ab: null,
    estado: null,
    tienda: null,
    categoria: null,
    departamento: null,
    productos: [],
    anio: null,
    modo: 'semana',
    pantalla: 'proyecto',
    sub: 'panorama',
    tiendaPrecios: null,
    nivel: 'total',
    item: null,
    planOrden: 'volumen_previsto',
    planPagina: 1,
    planItem: null,
    planVista: 'semanal',
    planTexto: '',
    etapa: 'final',
    origenEval: null,
  };
  if (typeof window === 'undefined') return vacio;
  const params = new URLSearchParams(window.location.search);
  const agregacion = params.get('ac_agr');
  const desde = params.get('ac_desde');
  const hasta = params.get('ac_hasta');
  const aDesde = params.get('ac_ad');
  const aHasta = params.get('ac_ah');
  const bDesde = params.get('ac_bd');
  const bHasta = params.get('ac_bh');
  const modo = params.get('ac_modo');
  const anio = Number(params.get('ac_anio'));
  return {
    agregacion: agregacion === 'dia' || agregacion === 'mes' ? agregacion : 'semana',
    periodo: desde && hasta ? { desde, hasta } : null,
    ab:
      aDesde && aHasta && bDesde && bHasta
        ? { a: { desde: aDesde, hasta: aHasta }, b: { desde: bDesde, hasta: bHasta } }
        : null,
    estado: params.get('ac_estado'),
    tienda: params.get('ac_tienda'),
    categoria: params.get('ac_cat'),
    departamento: params.get('ac_dept'),
    productos: params.getAll('ac_skus').slice(0, MAX_PRODUCTOS),
    anio: Number.isFinite(anio) && anio > 2000 ? anio : null,
    modo: modo === 'acumulado' ? 'acumulado' : 'semana',
    ...destinoDesdeUrl(params),
    tiendaPrecios: params.get('ac_tienda_precios'),
    nivel: nivelValido(params.get('ac_nivel')),
    item: params.get('ac_item'),
    planOrden: (params.get('ac_plan_orden') as OrdenPlan) || 'volumen_previsto',
    planPagina: Math.max(1, Number(params.get('ac_plan_pag') ?? 1) || 1),
    planItem: params.get('ac_plan_item'),
    planVista: params.get('ac_plan_vista') === 'historica' ? 'historica' : 'semanal',
    planTexto: params.get('ac_texto') ?? '',
    etapa: params.get('ac_etapa') === 'desarrollo' ? 'desarrollo' : 'final',
    origenEval: (() => {
      const crudo = params.get('ac_origen');
      if (crudo === null) return null;
      const valor = Number(crudo);
      return Number.isFinite(valor) && valor > 0 ? valor : null;
    })(),
  };
}

/**
 * Pantalla y subsección a partir de la URL.
 *
 * - `ac_pantalla` elige la pantalla; `ac_sub` la subsección de «Exploración».
 * - Las direcciones anteriores al reorganizar el tablero solo tenían `ac_sec`: se
 *   traducen a la subsección equivalente de «Exploración» sin perder el resto del estado.
 */
function destinoDesdeUrl(params: URLSearchParams): {
  pantalla: PantallaId;
  sub: SubExploracion;
} {
  const subValida = (valor: string | null): SubExploracion =>
    valor === 'estacionalidad' || valor === 'precios' || valor === 'articulo' ? valor : 'panorama';
  const pantallaValida = (valor: string | null): PantallaId | null =>
    valor && (ORDEN_PANTALLAS as string[]).includes(valor) ? (valor as PantallaId) : null;

  const pedida = pantallaValida(params.get('ac_pantalla'));
  const antigua = params.get('ac_sec');
  // `ac_sub` manda; si falta, la dirección antigua `ac_sec` sigue sirviendo de subsección.
  const sub = subValida(params.get('ac_sub') ?? antigua);
  if (pedida) return { pantalla: pedida, sub };
  if (antigua) return { pantalla: 'exploracion', sub };
  return { pantalla: 'proyecto', sub: 'panorama' };
}

/** Nivel restaurado desde la URL; cualquier valor desconocido vuelve al total agregado. */
function nivelValido(valor: string | null): NivelPronosticoNivel {
  const permitidos: NivelPronosticoNivel[] = [
    'total',
    'estado',
    'tienda',
    'categoria',
    'departamento',
    'producto',
  ];
  return valor && (permitidos as string[]).includes(valor)
    ? (valor as NivelPronosticoNivel)
    : 'total';
}

function urlDesde(estado: EstadoUrl): string {
  const params = new URLSearchParams();
  if (typeof window !== 'undefined') {
    const relleno = new URLSearchParams(window.location.search).get('relleno');
    if (relleno) params.set('relleno', relleno);
  }
  if (estado.agregacion !== 'semana') params.set('ac_agr', estado.agregacion);
  if (estado.periodo) {
    params.set('ac_desde', estado.periodo.desde);
    params.set('ac_hasta', estado.periodo.hasta);
  }
  if (estado.ab) {
    params.set('ac_ad', estado.ab.a.desde);
    params.set('ac_ah', estado.ab.a.hasta);
    params.set('ac_bd', estado.ab.b.desde);
    params.set('ac_bh', estado.ab.b.hasta);
  }
  if (estado.estado) params.set('ac_estado', estado.estado);
  if (estado.tienda) params.set('ac_tienda', estado.tienda);
  if (estado.categoria) params.set('ac_cat', estado.categoria);
  if (estado.departamento) params.set('ac_dept', estado.departamento);
  for (const producto of estado.productos) params.append('ac_skus', producto);
  // 2015 es el año por omisión de la comparación histórica: no ensucia la URL.
  if (estado.anio && estado.anio !== 2015) params.set('ac_anio', String(estado.anio));
  if (estado.modo !== 'semana') params.set('ac_modo', estado.modo);
  if (estado.pantalla !== 'proyecto') params.set('ac_pantalla', estado.pantalla);
  if (estado.sub !== 'panorama') params.set('ac_sub', estado.sub);
  if (estado.tiendaPrecios) params.set('ac_tienda_precios', estado.tiendaPrecios);
  if (estado.nivel !== 'total') params.set('ac_nivel', estado.nivel);
  if (estado.planOrden !== 'volumen_previsto') params.set('ac_plan_orden', estado.planOrden);
  if (estado.planPagina > 1) params.set('ac_plan_pag', String(estado.planPagina));
  if (estado.planItem) params.set('ac_plan_item', estado.planItem);
  if (estado.planVista !== 'semanal') params.set('ac_plan_vista', estado.planVista);
  if (estado.planTexto) params.set('ac_texto', estado.planTexto);
  /* Etapa y corte solo se publican en la dirección de «Evaluación». */
  if (estado.pantalla === 'evaluacion' && estado.etapa === 'desarrollo') {
    params.set('ac_etapa', 'desarrollo');
  }
  if (estado.origenEval !== null) params.set('ac_origen', String(estado.origenEval));
  if (estado.item) params.set('ac_item', estado.item);
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

export function AplicacionComercial({ apiBase }: { apiBase?: string }) {
  const base = useMemo(() => baseApi(apiBase), [apiBase]);
  const inicial = useMemo(() => leerUrl(), []);

  const [estadoApi, setEstadoApi] = useState<EstadoRespuesta | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoRespuesta | null>(null);
  const [pulso, setPulso] = useState<PulsoRespuesta | null>(null);
  const [pulsoProductos, setPulsoProductos] = useState<PulsoRespuesta | null>(null);
  const [historico, setHistorico] = useState<HistoricoRespuesta | null>(null);
  const [pronosticos, setPronosticos] = useState<PronosticosRespuesta | null>(null);
  const [evaluacion, setEvaluacion] = useState<EvaluacionRespuesta | null>(null);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [errorHistorico, setErrorHistorico] = useState<string | null>(null);
  const [cargandoHistorico, setCargandoHistorico] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargandoPronostico, setCargandoPronostico] = useState(false);
  const [errorPronostico, setErrorPronostico] = useState<string | null>(null);

  const [pantalla, setPantalla] = useState<PantallaId>(inicial.pantalla);
  const [agregacion, setAgregacion] = useState<Agregacion>(inicial.agregacion);
  const [periodo, setPeriodo] = useState<Intervalo | null>(inicial.periodo);
  const [ab, setAb] = useState<{ a: Intervalo; b: Intervalo } | null>(inicial.ab);
  const [estadoSel, setEstadoSel] = useState<string | null>(inicial.estado);
  const [tiendaSel, setTiendaSel] = useState<string | null>(inicial.tienda);
  const [categoriaSel, setCategoriaSel] = useState<string | null>(inicial.categoria);
  const [departamentoSel, setDepartamentoSel] = useState<string | null>(inicial.departamento);
  const [productos, setProductos] = useState<string[]>(inicial.productos);
  const [anio, setAnio] = useState<number>(inicial.anio ?? 2015);
  const [modoHistorico, setModoHistorico] = useState<ModoHistorico>(inicial.modo);
  const [modoSeries, setModoSeries] = useState<ModoSerie>('comun');
  /* Nivel de cada pantalla de pronóstico: «Resultados» y «Evaluación» no comparten nivel
     para que el detalle de artículo no contamine la evaluación (ni al revés). */
  const [nivelResultados, setNivelResultados] = useState<NivelPronosticoNivel>(inicial.nivel);
  const [nivelEvaluacion, setNivelEvaluacion] = useState<NivelPronosticoNivel>('total');
  /* Marca de elección explícita: el usuario pidió «Artículo» y se le pide completar. */
  const [pendienteProducto, setPendienteProducto] = useState(false);
  /* Plan de ventas: los filtros son los compartidos (estado, tienda, categoría, departamento).
     Solo el orden, el mínimo histórico, la página, la vista y la selección son propios. */
  /* La búsqueda del plan se restaura desde la URL: recargar no debe perderla. */
  const [planTexto, setPlanTexto] = useState(inicial.planTexto ?? '');
  const [vistaPlan, setVistaPlan] = useState<'semanal' | 'historica'>(
    inicial.planVista === 'historica' ? 'historica' : 'semanal',
  );
  const [planOrden, setPlanOrden] = useState<OrdenPlan>(inicial.planOrden);
  const [planPagina, setPlanPagina] = useState(inicial.planPagina);
  const [planMinimo, setPlanMinimo] = useState<number | null>(null);
  const [planSeleccion, setPlanSeleccion] = useState<{ store_id: string; item_id: string } | null>(
    inicial.planItem && inicial.tienda
      ? { store_id: inicial.tienda, item_id: inicial.planItem }
      : null,
  );
  const [plan, setPlan] = useState<PlanificacionRespuesta | null>(null);
  const [planDetalle, setPlanDetalle] = useState<DetallePlanRespuesta | null>(null);
  const [cargandoPlan, setCargandoPlan] = useState(false);
  const [cargandoPlanDetalle, setCargandoPlanDetalle] = useState(false);
  const [errorPlan, setErrorPlan] = useState<string | null>(null);
  const [errorPlanDetalle, setErrorPlanDetalle] = useState<string | null>(null);
  const [eval28, setEval28] = useState<EvaluacionHorizonteRespuesta | null>(null);
  const [cargandoEval28, setCargandoEval28] = useState(false);
  const [errorEval28, setErrorEval28] = useState<string | null>(null);
  const turnoEval28 = useRef(0);
  const [descargandoPlan, setDescargandoPlan] = useState(false);
  const [avisoDescarga, setAvisoDescarga] = useState<string | null>(null);
  const turnoPlan = useRef(0);
  const turnoPlanDetalle = useRef(0);

  const [tipoErrorPronostico, setTipoErrorPronostico] = useState<
    'validacion' | 'conexion' | null
  >(null);
  const [etapa, setEtapa] = useState<'desarrollo' | 'final'>(inicial.etapa);
  /* Corte que se dibuja: el pronóstico posterior al último dato o un corte de
     evaluación publicado (con observaciones reales detrás). */
  const [origenPronostico, setOrigenPronostico] = useState<'futuro' | number>(
    inicial.origenEval ?? 'futuro',
  );

  /* ---- exploración descriptiva (pulso) ---------------------------------- */
  const [sub, setSub] = useState<SubExploracion>(inicial.sub);
  /* Contexto propio de «Datos y calidad»: precios e intermitencia se calculan por tienda. */
  const [tiendaDatos, setTiendaDatos] = useState<string | null>(inicial.tiendaPrecios);
  const [datosComparacion, setDatosComparacion] =
    useState<ComparacionTiendaCategoriaRespuesta | null>(null);
  const [datosDistribucion, setDatosDistribucion] = useState<DistribucionPreciosRespuesta | null>(
    null,
  );
  const [datosIntermitencia, setDatosIntermitencia] = useState<IntermitenciaRespuesta | null>(null);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);
  /* Ejecuciones y resumen del proyecto: se leen aparte para no mezclarse con el corte
     que el usuario esté consultando en «Resultados» o «Evaluación». */
  const [modelos, setModelos] = useState<ModelosRespuesta | null>(null);
  const [modelosError, setModelosError] = useState<string | null>(null);
  const [cargandoModelos, setCargandoModelos] = useState(false);
  const [proyectoPronosticos, setProyectoPronosticos] = useState<PronosticosRespuesta | null>(null);
  const [proyectoEvaluacion, setProyectoEvaluacion] = useState<EvaluacionRespuesta | null>(null);
  const [cargandoProyecto, setCargandoProyecto] = useState(false);
  const [errorProyecto, setErrorProyecto] = useState<string | null>(null);
  const [itemDetalle, setItemDetalle] = useState<string | null>(inicial.item);
  const [metricaAB, setMetricaAB] = useState<MetricaAB>('total');
  /* El bloque A/B arranca colapsado en una visita nueva y, si la URL trae periodos A/B
     explícitos, se abre: es un enlace dirigido a la comparación. */
  const [abAbierto, setAbAbierto] = useState<boolean>(() => Boolean(inicial.ab));
  const [ordenAB, setOrdenAB] = useState<OrdenAB>('tienda');
  const [dimensionEst, setDimensionEst] = useState<DimensionEstacionalidad>(
    inicial.estado ? 'tienda' : 'estado',
  );
  const dimensionTocada = useRef(false);
  const elegirDimension = useCallback((siguiente: DimensionEstacionalidad) => {
    dimensionTocada.current = true;
    setDimensionEst(siguiente);
  }, []);
  const [anioMatriz, setAnioMatriz] = useState<number>(inicial.anio ?? 2015);
  const [paginaInter, setPaginaInter] = useState(1);
  const [ordenInter, setOrdenInter] = useState<'ceros' | 'unidades' | 'racha'>('ceros');
  const [lecturaMatriz, setLecturaMatriz] = useState<LecturaMatriz>('ventaja');
  const [refresco, setRefresco] = useState(0);
  const [metodoSesgo, setMetodoSesgo] = useState<MetodoSesgo>('candidato');

  const [comparacion, setComparacion] = useState<ComparacionTiendaCategoriaRespuesta | null>(null);
  const [cargandoComparacion, setCargandoComparacion] = useState(false);
  const [errorComparacion, setErrorComparacion] = useState<string | null>(null);
  const [estacionalidad, setEstacionalidad] = useState<EstacionalidadRespuesta | null>(null);
  const [cargandoEstacionalidad, setCargandoEstacionalidad] = useState(false);
  const [errorEstacionalidad, setErrorEstacionalidad] = useState<string | null>(null);
  const [matrizTemporal, setMatrizTemporal] = useState<MatrizTemporalRespuesta | null>(null);
  const [cargandoMatrizTemporal, setCargandoMatrizTemporal] = useState(false);
  const [errorMatrizTemporal, setErrorMatrizTemporal] = useState<string | null>(null);
  const [preciosDistribucion, setPreciosDistribucion] = useState<DistribucionPreciosRespuesta | null>(null);
  const [preciosCambios, setPreciosCambios] = useState<CambiosPreciosRespuesta | null>(null);
  const [cargandoPrecios, setCargandoPrecios] = useState(false);
  const [errorPrecios, setErrorPrecios] = useState<string | null>(null);
  const [articulo, setArticulo] = useState<ArticuloRespuesta | null>(null);
  const [intermitencia, setIntermitencia] = useState<IntermitenciaRespuesta | null>(null);
  const [cargandoArticulo, setCargandoArticulo] = useState(false);
  const [errorArticulo, setErrorArticulo] = useState<string | null>(null);
  const [matrizDesempeno, setMatrizDesempeno] = useState<MatrizDesempenoRespuesta | null>(null);
  const [cargandoMatrizDesempeno, setCargandoMatrizDesempeno] = useState(false);
  const [errorMatrizDesempeno, setErrorMatrizDesempeno] = useState<string | null>(null);
  const [evaluacionVentanas, setEvaluacionVentanas] = useState<VentanasEvaluacionRespuesta | null>(null);
  const [auditoriaTemporal, setAuditoriaTemporal] = useState<AuditoriaTemporalRespuesta | null>(null);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);
  const [errorAuditoria, setErrorAuditoria] = useState<string | null>(null);
  const [cargandoEvaluacionVentanas, setCargandoEvaluacionVentanas] = useState(false);
  const [errorEvaluacionVentanas, setErrorEvaluacionVentanas] = useState<string | null>(null);
  const [busquedaItem, setBusquedaItem] = useState('');
  const [resultadosItem, setResultadosItem] = useState<ProductoConUnidades[]>([]);
  const [buscandoItem, setBuscandoItem] = useState(false);

  const turno = useRef(0);
  const turnoHistorico = useRef(0);
  const turnoPronostico = useRef(0);
  const turnoSeccion = useRef(0);
  const turnoMatrizDesempeno = useRef(0);
  const turnoEvaluacionVentanas = useRef(0);
  const turnoAuditoria = useRef(0);
  const turnoBusqueda = useRef(0);
  const turnoModelos = useRef(0);
  const turnoProyecto = useRef(0);
  const turnoDatos = useRef(0);
  const montado = useRef(true);
  const desdeUrl = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  /* ---- catálogo derivado ------------------------------------------------ */
  const tiendasPorEstado = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const tienda of catalogo?.tiendas ?? []) {
      mapa.set(tienda.state_id, [...(mapa.get(tienda.state_id) ?? []), tienda.store_id]);
    }
    return mapa;
  }, [catalogo]);

  const estadoDeTienda = useMemo(
    () => new Map((catalogo?.tiendas ?? []).map((tienda) => [tienda.store_id, tienda.state_id])),
    [catalogo],
  );

  const categoriaDeDepartamento = useMemo(
    () => new Map((catalogo?.departamentos ?? []).map((fila) => [fila.dept_id, fila.cat_id])),
    [catalogo],
  );

  const tiendasFiltro = useMemo(() => {
    if (tiendaSel) return [tiendaSel];
    if (estadoSel) return tiendasPorEstado.get(estadoSel) ?? [];
    return (catalogo?.tiendas ?? []).map((tienda) => tienda.store_id);
  }, [tiendaSel, estadoSel, tiendasPorEstado, catalogo]);

  const categoriasFiltro = useMemo(() => (categoriaSel ? [categoriaSel] : []), [categoriaSel]);
  const departamentosFiltro = useMemo(
    () => (departamentoSel ? [departamentoSel] : []),
    [departamentoSel],
  );

  /* El nivel de los paneles depende del territorio: tiendas → departamentos. */
  const nivelPaneles: NivelExploracion = tiendaSel ? 'departamento' : 'tienda';
  const contextoProductos = Boolean(departamentoSel && (tiendaSel || estadoSel));

  /* ---- URL -------------------------------------------------------------- */
  const estadoUrl: EstadoUrl = useMemo(
    () => ({
      agregacion,
      periodo,
      ab,
      estado: estadoSel,
      tienda: tiendaSel,
      categoria: categoriaSel,
      departamento: departamentoSel,
      productos,
      anio,
      modo: modoHistorico,
      pantalla,
      sub,
      tiendaPrecios: tiendaDatos,
      nivel: nivelResultados,
      item: itemDetalle,
      planOrden,
      planPagina,
      planItem: planSeleccion?.item_id ?? null,
      planVista: vistaPlan,
      planTexto: planTexto.trim(),
      etapa,
      origenEval:
        pantalla === 'evaluacion' && typeof origenPronostico === 'number' ? origenPronostico : null,
    }),
    [
      agregacion,
      periodo,
      ab,
      estadoSel,
      tiendaSel,
      categoriaSel,
      departamentoSel,
      productos,
      anio,
      modoHistorico,
      pantalla,
      sub,
      tiendaDatos,
      nivelResultados,
      itemDetalle,
      planOrden,
      planPagina,
      planSeleccion,
      vistaPlan,
      planTexto,
      etapa,
      origenPronostico,
      pantalla,
    ],
  );
  const serializado = useMemo(() => urlDesde(estadoUrl), [estadoUrl]);

  const pantallaAnterior = useRef(pantalla);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (desdeUrl.current) {
      desdeUrl.current = false;
      pantallaAnterior.current = pantalla;
      return;
    }
    if (serializado === window.location.search) return;
    const destino = `${window.location.pathname}${serializado}${window.location.hash}`;
    // Cambiar de pantalla crea una entrada de historial (Atrás/Adelante funcionan); ajustar
    // filtros dentro de la misma pantalla la reemplaza para no llenar el historial.
    if (pantallaAnterior.current !== pantalla) {
      pantallaAnterior.current = pantalla;
      window.history.pushState({ comercial: true }, '', destino);
      return;
    }
    window.history.replaceState({ comercial: true }, '', destino);
  }, [serializado, pantalla]);

  /* ---- navegación explícita -------------------------------------------- */
  const aplicar = useCallback(
    (
      cambios: Partial<{
        estado: string | null;
        tienda: string | null;
        categoria: string | null;
        departamento: string | null;
        productos: string[] | null;
        anio: number;
        modo: ModoHistorico;
        sub: SubExploracion;
        item: string | null;
      }>,
      mensaje: string | null = null,
    ) => {
      if ('estado' in cambios) setEstadoSel(cambios.estado ?? null);
      if ('tienda' in cambios) setTiendaSel(cambios.tienda ?? null);
      if ('categoria' in cambios) setCategoriaSel(cambios.categoria ?? null);
      if ('departamento' in cambios) setDepartamentoSel(cambios.departamento ?? null);
      if ('productos' in cambios) setProductos(cambios.productos ?? []);
      if ('anio' in cambios && cambios.anio) setAnio(cambios.anio);
      if ('modo' in cambios && cambios.modo) setModoHistorico(cambios.modo);
      if ('sub' in cambios && cambios.sub) setSub(cambios.sub);
      if ('item' in cambios) setItemDetalle(cambios.item ?? null);
      setAviso(mensaje);
      setError(null);
    },
    [],
  );

  const elegirEstado = useCallback(
    (estado: string | null) => {
      if (estado === null) {
        aplicar({ estado: null, tienda: null }, null);
        return;
      }
      const tiendas = tiendasPorEstado.get(estado) ?? [];
      if (tiendaSel && !tiendas.includes(tiendaSel)) {
        aplicar(
          { estado, tienda: null },
          `La tienda ${tiendaSel} no está en ${ESTADO_NOMBRE[estado] ?? estado}: el contexto baja al estado y se mantiene el catálogo.`,
        );
        return;
      }
      aplicar({ estado }, null);
    },
    [aplicar, tiendaSel, tiendasPorEstado],
  );

  const elegirTienda = useCallback(
    (tienda: string | null) => {
      if (tienda === null) {
        aplicar({ tienda: null }, null);
        return;
      }
      aplicar({ tienda, estado: estadoDeTienda.get(tienda) ?? estadoSel }, null);
    },
    [aplicar, estadoDeTienda, estadoSel],
  );

  const elegirCategoria = useCallback(
    (categoria: string | null) => {
      if (!categoria) {
        aplicar({ categoria: null, departamento: null }, null);
        return;
      }
      if (departamentoSel && categoriaDeDepartamento.get(departamentoSel) !== categoria) {
        aplicar(
          { categoria, departamento: null },
          `El departamento ${departamentoSel} no pertenece a ${CATEGORIA_NOMBRE[categoria] ?? categoria}: se mantiene la categoría y se cierra el detalle de productos.`,
        );
        return;
      }
      aplicar({ categoria }, null);
    },
    [aplicar, categoriaDeDepartamento, departamentoSel],
  );

  const elegirDepartamento = useCallback(
    (departamento: string | null) => {
      if (!departamento) {
        aplicar({ departamento: null }, null);
        return;
      }
      const categoria = categoriaDeDepartamento.get(departamento) ?? categoriaSel;
      aplicar({ departamento, categoria, productos: [] }, null);
    },
    [aplicar, categoriaDeDepartamento, categoriaSel],
  );

  const explorarSerie = useCallback(
    (serie: SerieTienda) => {
      const clave = claveDe(serie);
      if (serie.nivel === 'departamento') {
        elegirDepartamento(clave);
        return;
      }
      if (serie.nivel === 'producto') return;
      elegirTienda(clave);
    },
    [elegirDepartamento, elegirTienda],
  );

  const subirNivel = useCallback(() => {
    if (departamentoSel) {
      aplicar({ departamento: null }, null);
      return;
    }
    if (categoriaSel) {
      aplicar({ categoria: null }, null);
      return;
    }
    if (tiendaSel) {
      elegirTienda(null);
      return;
    }
    if (estadoSel) elegirEstado(null);
  }, [aplicar, categoriaSel, departamentoSel, elegirEstado, elegirTienda, estadoSel, tiendaSel]);

  /* ---- navegación entre pantallas -------------------------------------- */
  const irAPantalla = useCallback(
    (siguiente: PantallaId) => {
      setPantalla(siguiente);
      setAviso(null);
      setError(null);
      // «Resultados» solo consulta el pronóstico posterior al último dato; el detalle de
      // un corte histórico se revisa en «Evaluación».
      if (siguiente === 'resultados') setOrigenPronostico('futuro');
    },
    [],
  );

  /* ---- Escape: primero lo abierto, después el nivel --------------------- */
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      const objetivo = evento.target as HTMLElement | null;
      if (objetivo && objetivo.closest('[role="dialog"]')) return;
      subirNivel();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [subirNivel]);

  /* ---- Atrás / Adelante ------------------------------------------------ */
  useEffect(() => {
    const alVolver = () => {
      const leido = leerUrl();
      desdeUrl.current = true;
      setAgregacion(leido.agregacion);
      setPeriodo(leido.periodo);
      setAb(leido.ab);
      setEstadoSel(leido.estado);
      setTiendaSel(leido.tienda);
      setCategoriaSel(leido.categoria);
      setDepartamentoSel(leido.departamento);
      setProductos(leido.productos);
      if (leido.anio) setAnio(leido.anio);
      setModoHistorico(leido.modo);
      setPantalla(leido.pantalla);
      setSub(leido.sub);
      setItemDetalle(leido.item);
      setPlanOrden(leido.planOrden);
      setPlanPagina(leido.planPagina);
      setVistaPlan(leido.planVista);
      setPlanSeleccion(
        leido.planItem && leido.tienda
          ? { store_id: leido.tienda, item_id: leido.planItem }
          : null,
      );
      setAviso(null);
      setError(null);
    };
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, []);

  /* ---- carga del tablero ----------------------------------------------- */
  const cargar = useCallback(async () => {
    const actual = ++turno.current;
    setCargando((previo) => previo || pulso === null);
    setActualizando(pulso !== null);
    setError(null);
    try {
      const estadoRespuesta = await api.estado(base);
      if (!montado.current || actual !== turno.current) return;
      setEstadoApi(estadoRespuesta);
      if (!estadoRespuesta.con_datos) {
        setPulso(null);
        setPulsoProductos(null);
        setHistorico(null);
        setCargando(false);
        setActualizando(false);
        return;
      }
      const catalogoApi = await api.catalogo(base);
      if (!montado.current || actual !== turno.current) return;
      setCatalogo(catalogoApi);
      const cobertura = catalogoApi.cobertura;
      // Estado y catálogo hacen falta en las seis pantallas; el pulso de ventas solo
      // pertenece a «Exploración» y no se pide desde las demás.
      if (pantalla !== 'exploracion') {
        setCargando(false);
        setActualizando(false);
        return;
      }
      const ventanaSolicitada = periodo ?? { desde: cobertura.desde, hasta: cobertura.hasta };
      // Pulso de ventas solo puede leer días con ventas. Si el periodo pedido arranca antes
      // de la cobertura (por ejemplo el 1 de enero de 2011), se recorta aquí y se avisa en
      // la cabecera; las vistas descriptivas sí reciben el periodo completo.
      const ventana = {
        desde:
          ventanaSolicitada.desde < cobertura.desde
            ? cobertura.desde
            : ventanaSolicitada.desde,
        hasta:
          ventanaSolicitada.hasta > cobertura.hasta ? cobertura.hasta : ventanaSolicitada.hasta,
      };
      const tiendasElegidas = tiendaSel
        ? [tiendaSel]
        : estadoSel
          ? (tiendasPorEstado.get(estadoSel) ?? [])
          : catalogoApi.tiendas.map((tienda) => tienda.store_id);

      const principal = api.pulso(base, {
        desde: ventana.desde,
        hasta: ventana.hasta,
        agregacion,
        tiendas: tiendasElegidas,
        categorias: categoriasFiltro,
        estado: estadoSel,
        nivel: nivelPaneles === 'departamento' ? 'departamento' : 'tienda',
        tienda: nivelPaneles === 'departamento' ? tiendaSel : null,
        departamento: null,
        productos: [],
        a: ab?.a,
        b: ab?.b,
      });

      const productosApi =
        contextoProductos && departamentoSel
          ? api.pulso(base, {
              desde: ventana.desde,
              hasta: ventana.hasta,
              agregacion,
              tiendas: tiendasElegidas,
              categorias: categoriasFiltro,
              estado: estadoSel,
              nivel: 'producto',
              tienda: tiendaSel,
              departamento: departamentoSel,
              productos,
            })
          : Promise.resolve(null);

      const [pulsoApi, productosRespuesta] = await Promise.all([principal, productosApi]);
      if (!montado.current || actual !== turno.current) return;
      setPulso(pulsoApi);
      setPulsoProductos(productosRespuesta);
      if (!periodo) setPeriodo({ desde: pulsoApi.parametros.desde, hasta: pulsoApi.parametros.hasta });
      setCargando(false);
      setActualizando(false);
    } catch (fallo) {
      if (!montado.current || actual !== turno.current) return;
      setError(fallo instanceof ErrorApi ? fallo : new ErrorApi(0, 'No se pudo consultar la API'));
      setCargando(false);
      setActualizando(false);
    }
  }, [
    base,
    pantalla,
    agregacion,
    periodo,
    ab,
    tiendaSel,
    estadoSel,
    categoriasFiltro,
    departamentoSel,
    productos,
    nivelPaneles,
    contextoProductos,
    tiendasPorEstado,
    pulso,
  ]);

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    base,
    pantalla,
    agregacion,
    periodo,
    ab,
    tiendaSel,
    estadoSel,
    categoriasFiltro,
    departamentoSel,
    productos,
    nivelPaneles,
  ]);

  /* ---- comparación histórica ------------------------------------------- */
  const cargarHistorico = useCallback(async () => {
    const actual = ++turnoHistorico.current;
    setCargandoHistorico(true);
    setErrorHistorico(null);
    try {
      const respuesta = await api.historico(base, {
        anio,
        modo: modoHistorico,
        tiendas: tiendasFiltro,
        categorias: categoriasFiltro,
        departamentos: departamentosFiltro,
        estado: estadoSel,
      });
      if (!montado.current || actual !== turnoHistorico.current) return;
      setHistorico(respuesta);
      setCargandoHistorico(false);
    } catch (fallo) {
      if (!montado.current || actual !== turnoHistorico.current) return;
      setErrorHistorico(
        fallo instanceof ErrorApi ? fallo.message : 'No se pudo cargar la comparación histórica',
      );
      setCargandoHistorico(false);
    }
  }, [base, anio, modoHistorico, tiendasFiltro, categoriasFiltro, departamentosFiltro, estadoSel]);

  useEffect(() => {
    if (!estadoApi?.con_datos) return;
    void cargarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, anio, modoHistorico, tiendasFiltro.join(','), categoriasFiltro.join(','), departamentosFiltro.join(','), estadoSel, estadoApi?.con_datos]);

  /* ---- selección del pronóstico (una sola resolución) ------------------- */
  /* Nivel y artículos se resuelven aquí, antes de cualquier petición: es el único lugar
     que decide si la consulta es válida. Los controles, el título del panel y la URL leen
     esta misma resolución. */
  const articuloPronostico = itemDetalle ?? resultadosItem[0]?.item_id ?? null;
  const seleccionResultados = useMemo(
    () =>
      resolverSeleccionPronostico({
        nivel: nivelResultados,
        tienda: tiendaSel,
        articulo: articuloPronostico,
      }),
    [nivelResultados, tiendaSel, articuloPronostico],
  );

  const nivelConsulta = pantalla === 'evaluacion' ? nivelEvaluacion : seleccionResultados.nivel;
  /* Cortes dibujables de la etapa: ventana evaluada **y** predicciones por día publicadas.
     `null` = todavía no se conoce el informe de esta etapa; si el informe es de otra etapa, sus
     cortes no se usan (evitaría dibujar fechas de otra etapa). */
  const cortesGraficables = useMemo<number[] | null>(() => {
    if (!evaluacionVentanas || evaluacionVentanas.etapa !== etapa) return null;
    const publicados = new Set(evaluacionVentanas.origenes_graficables ?? []);
    return evaluacionVentanas.ventanas
      .map((ventana) => ventana.origen_d)
      .filter((origen) => publicados.has(origen));
  }, [evaluacionVentanas, etapa]);
  /* En «Evaluación» la gráfica solo se pide cuando hay un corte histórico elegido y dibujable: ni
     antes de saber qué cortes existen, ni con cortes de otra etapa, ni con el pronóstico posterior
     al último dato (que no es una evaluación). */
  const graficaOmitida =
    pantalla === 'evaluacion' &&
    (cortesGraficables === null ||
      cortesGraficables.length === 0 ||
      typeof origenPronostico !== 'number');
  /* La selección se memoiza: si se recalculara en cada render, su identidad cambiaría y el efecto
     de carga volvería a pedir la gráfica indefinidamente. */
  const seleccionConsulta = useMemo(
    () =>
      pantalla === 'evaluacion'
        ? resolverSeleccionPronostico({ nivel: nivelEvaluacion, tienda: tiendaSel, articulo: null })
        : seleccionResultados,
    [pantalla, nivelEvaluacion, tiendaSel, seleccionResultados],
  );

  const elegirNivelResultados = useCallback((nivel: NivelPronosticoNivel) => {
    setNivelResultados(nivel);
    setPendienteProducto(nivel === 'producto');
    setAviso(null);
  }, []);

  /* ---- pronósticos (solo en su pestaña) -------------------------------- */
  const cargarPronosticos = useCallback(async () => {
    const actual = ++turnoPronostico.current;
    // Selección incompleta: no se envía una petición inválida. La API conserva sus
    // validaciones; aquí simplemente no se llega a ella.
    if (seleccionConsulta.estado === 'incompleta') {
      setPronosticos(null);
      setEvaluacion(null);
      setErrorPronostico(null);
      setTipoErrorPronostico(null);
      setCargandoPronostico(false);
      return;
    }
    setCargandoPronostico(true);
    setErrorPronostico(null);
    setTipoErrorPronostico(null);
    try {
      const contexto = {
        nivel: nivelConsulta,
        dias_historico: 90,
        origen: origenPronostico === 'futuro' ? null : String(origenPronostico),
        tienda: tiendaSel,
        estado: estadoSel,
        categoria: categoriaSel,
        departamento: departamentoSel,
        items: seleccionConsulta.items,
      };
      // La evaluación publicada no existe por artículo: pedirla con ese nivel solo
      // produciría un 422 en la consola. Con nivel producto los KPI vienen del propio
      // pronóstico, que los trae de su corte cuando está evaluado.
      /* El informe de segmentos se pide con todos los niveles: la tabla elige su dimensión y no
         debe quedar recortada por el nivel de la gráfica. El nivel de la gráfica solo afecta a
         `/pronosticos` y a la matriz. */
      const nivelInforme = pantalla === 'evaluacion' ? 'total' : nivelConsulta;
      const evaluacionPedida =
        nivelConsulta === 'producto'
          ? Promise.resolve(null)
          : api
              .evaluacion(base, { nivel: nivelInforme, etapa })
              .catch((fallo: unknown) => {
                if (fallo instanceof ErrorApi && fallo.estado === 503) return null;
                if (fallo instanceof ErrorApi && fallo.estado === 422) return null;
                throw fallo;
              });
      const [pronosticosApi, evaluacionApi] = await Promise.all([
        graficaOmitida ? Promise.resolve(null) : api.pronosticos(base, contexto),
        evaluacionPedida,
      ]);
      if (!montado.current || actual !== turnoPronostico.current) return;
      setPronosticos(pronosticosApi);
      setEvaluacion(evaluacionApi);
      setCargandoPronostico(false);
    } catch (fallo) {
      if (!montado.current || actual !== turnoPronostico.current) return;
      setPronosticos(null);
      setEvaluacion(null);
      // Un 422 es una selección que la API rechaza: reintentar no la arregla, hay que
      // ajustar los controles. El resto (red, 5xx) sí puede resolverse reintentando.
      const validacion = fallo instanceof ErrorApi && (fallo.estado === 422 || fallo.estado === 400);
      setTipoErrorPronostico(validacion ? 'validacion' : 'conexion');
      setErrorPronostico(
        fallo instanceof ErrorApi
          ? fallo.message
          : 'No se pudo contactar la API del pronóstico. Revisa la conexión y vuelve a intentar.',
      );
      setCargandoPronostico(false);
    }
  }, [
    base,
    nivelConsulta,
    seleccionConsulta,
    etapa,
    origenPronostico,
    tiendaSel,
    estadoSel,
    categoriaSel,
    departamentoSel,
    pantalla,
    graficaOmitida,
  ]);

  useEffect(() => {
    if (!['resultados', 'evaluacion'].includes(pantalla) || !estadoApi?.con_datos) return;
    void cargarPronosticos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pantalla,
    base,
    nivelConsulta,
    seleccionConsulta,
    etapa,
    origenPronostico,
    tiendaSel,
    estadoSel,
    categoriaSel,
    departamentoSel,
    estadoApi?.con_datos,
    graficaOmitida,
    // Reintento explícito desde el estado de error de «Resultados» y «Evaluación».
    refresco,
  ]);

  /* Si el periodo cambia de año, el selector de la matriz se mueve al primer año del
     periodo para no pedir un año sin días dentro de él. */
  useEffect(() => {
    if (!periodo) return;
    const inicio = Number(periodo.desde.slice(0, 4));
    const fin = Number(periodo.hasta.slice(0, 4));
    if (anioMatriz < inicio || anioMatriz > fin) setAnioMatriz(inicio);
  }, [periodo, anioMatriz]);

  /* Con un estado elegido, el perfil semanal por estado tendría un solo grupo: se abre
     por tienda. Solo se ajusta si el usuario no eligió la dimensión a mano. */
  useEffect(() => {
    if (dimensionTocada.current) return;
    setDimensionEst(estadoSel ? 'tienda' : 'estado');
  }, [estadoSel]);

  /* Fuera de «Evaluación» el corte es el pronóstico posterior al último dato observado; al
     cambiar de nivel o de contexto territorial se vuelve a ese valor. En «Evaluación» el corte
     se conserva si sigue existiendo en la etapa vigente (ver el efecto siguiente). */
  useEffect(() => {
    if (pantalla === 'evaluacion') return;
    setOrigenPronostico('futuro');
  }, [pantalla, nivelConsulta, etapa, tiendaSel, estadoSel, categoriaSel, departamentoSel]);

  /* Si el contexto deja inválida una selección de artículo que era válida, se resuelve a un
     nivel agregado coherente y se comunica. Si el usuario acaba de pedir «Artículo» y aún
     le faltan campos, se respeta su elección y se le pide completarla. */
  useEffect(() => {
    if (seleccionResultados.estado === 'listo') {
      if (pendienteProducto) setPendienteProducto(false);
      return;
    }
    if (pendienteProducto) return;
    const sugerido = nivelAgregadoSugerido({
      departamento: departamentoSel,
      categoria: categoriaSel,
    });
    setNivelResultados(sugerido);
    setAviso(
      'El detalle por artículo necesita una tienda y un artículo: al cambiar el contexto se ajustó el nivel del pronóstico. Puedes volver a elegir «Artículo» cuando tengas tienda y artículo.',
    );
  }, [seleccionResultados, pendienteProducto, departamentoSel, categoriaSel]);

  /* El corte se conserva mientras siga siendo dibujable en la etapa elegida. Si dejó de serlo se
     elige uno disponible de forma determinista: el primero publicado de esa etapa. Si la etapa no
     tiene cortes dibujables, no se inventa una fecha ni se reutiliza la de otra etapa. */
  useEffect(() => {
    if (pantalla !== 'evaluacion' || !cortesGraficables || cortesGraficables.length === 0) return;
    if (typeof origenPronostico === 'number' && cortesGraficables.includes(origenPronostico)) return;
    const primero = cortesGraficables[0];
    if (primero !== undefined) setOrigenPronostico(primero);
  }, [pantalla, cortesGraficables, origenPronostico]);

  /* ---- exploración descriptiva (carga progresiva por sección) ----------- */
  const contextoComercial = {
    desde: periodo?.desde,
    hasta: periodo?.hasta,
    estado: estadoSel,
    tienda: tiendaSel,
    categorias: categoriasFiltro,
    departamentos: departamentoSel ? [departamentoSel] : [],
    productos,
  };

  useEffect(() => {
    if (pantalla !== 'exploracion' || !estadoApi?.con_datos || sub !== 'panorama') return;
    const actual = ++turnoSeccion.current;
    const control = new AbortController();
    setCargandoComparacion(true);
    setErrorComparacion(null);
    api
      .comparacion(
        base,
        {
          desde: contextoComercial.desde,
          hasta: contextoComercial.hasta,
          a_desde: ab?.a.desde,
          a_hasta: ab?.a.hasta,
          b_desde: ab?.b.desde,
          b_hasta: ab?.b.hasta,
          tiendas: tiendaSel ? undefined : tiendasFiltro,
          estado: estadoSel,
          tienda: tiendaSel,
          categorias: categoriasFiltro,
          departamentos: contextoComercial.departamentos,
          productos,
        },
        control.signal,
      )
      .then((respuesta) => {
        if (actual !== turnoSeccion.current) return;
        setComparacion(respuesta);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoSeccion.current || control.signal.aborted) return;
        setComparacion(null);
        setErrorComparacion(
          fallo instanceof ErrorApi ? fallo.message : 'No se pudo cargar la comparación',
        );
      })
      .finally(() => {
        if (actual === turnoSeccion.current) setCargandoComparacion(false);
      });
    return () => control.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pantalla,
    sub,
    base,
    estadoApi?.con_datos,
    periodo?.desde,
    periodo?.hasta,
    ab?.a.desde,
    ab?.a.hasta,
    ab?.b.desde,
    ab?.b.hasta,
    estadoSel,
    tiendaSel,
    categoriaSel,
    departamentoSel,
    productos,
    refresco,
  ]);

  useEffect(() => {
    if (pantalla !== 'exploracion' || !estadoApi?.con_datos || sub !== 'estacionalidad') return;
    const actual = ++turnoSeccion.current;
    const control = new AbortController();
    setCargandoEstacionalidad(true);
    setCargandoMatrizTemporal(true);
    setErrorEstacionalidad(null);
    setErrorMatrizTemporal(null);
    const contexto = {
      desde: contextoComercial.desde,
      hasta: contextoComercial.hasta,
      tiendas: tiendaSel ? undefined : tiendasFiltro,
      estado: estadoSel,
      tienda: tiendaSel,
      categorias: categoriasFiltro,
      departamentos: contextoComercial.departamentos,
    };
    const mensajeDe = (fallo: unknown, porOmision: string) =>
      fallo instanceof ErrorApi ? fallo.message : porOmision;

    // Cada panel tiene su propio estado: si un año queda fuera del periodo, la matriz
    // avisa sin ocultar la estacionalidad (y al revés).
    api
      .estacionalidad(base, { ...contexto, dimension: dimensionEst }, control.signal)
      .then((est) => {
        if (actual !== turnoSeccion.current) return;
        setEstacionalidad(est);
        setErrorEstacionalidad(null);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoSeccion.current || control.signal.aborted) return;
        setEstacionalidad(null);
        setErrorEstacionalidad(mensajeDe(fallo, 'No se pudo calcular la estacionalidad'));
      })
      .finally(() => {
        if (actual === turnoSeccion.current) setCargandoEstacionalidad(false);
      });

    api
      .matrizTemporal(base, { ...contexto, anio: anioMatriz }, control.signal)
      .then((matriz) => {
        if (actual !== turnoSeccion.current) return;
        setMatrizTemporal(matriz);
        setErrorMatrizTemporal(null);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoSeccion.current || control.signal.aborted) return;
        setMatrizTemporal(null);
        setErrorMatrizTemporal(mensajeDe(fallo, 'No se pudo calcular la matriz temporal'));
      })
      .finally(() => {
        if (actual === turnoSeccion.current) setCargandoMatrizTemporal(false);
      });
    return () => control.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pantalla,
    sub,
    base,
    estadoApi?.con_datos,
    periodo?.desde,
    periodo?.hasta,
    estadoSel,
    tiendaSel,
    categoriaSel,
    departamentoSel,
    dimensionEst,
    anioMatriz,
    refresco,
  ]);

  useEffect(() => {
    if (pantalla !== 'exploracion' || !estadoApi?.con_datos || sub !== 'precios') return;
    if (!tiendaSel) {
      setPreciosDistribucion(null);
      setPreciosCambios(null);
      setCargandoPrecios(false);
      setErrorPrecios('Elige una tienda del territorio para ver sus precios.');
      return;
    }
    const actual = ++turnoSeccion.current;
    const control = new AbortController();
    setCargandoPrecios(true);
    setErrorPrecios(null);
    Promise.all([
      api.preciosDistribucion(
        base,
        {
          tienda: tiendaSel,
          desde: periodo?.desde,
          hasta: periodo?.hasta,
          categorias: categoriasFiltro,
          departamentos: contextoComercial.departamentos,
        },
        control.signal,
      ),
      api.preciosCambios(
        base,
        {
          tienda: tiendaSel,
          desde: periodo?.desde,
          hasta: periodo?.hasta,
          categorias: categoriasFiltro,
          departamentos: contextoComercial.departamentos,
        },
        control.signal,
      ),
    ])
      .then(([distribucion, cambios]) => {
        if (actual !== turnoSeccion.current) return;
        setPreciosDistribucion(distribucion);
        setPreciosCambios(cambios);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoSeccion.current || control.signal.aborted) return;
        setPreciosDistribucion(null);
        setPreciosCambios(null);
        setErrorPrecios(fallo instanceof ErrorApi ? fallo.message : 'No se pudieron cargar los precios');
      })
      .finally(() => {
        if (actual === turnoSeccion.current) setCargandoPrecios(false);
      });
    return () => control.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pantalla,
    sub,
    base,
    estadoApi?.con_datos,
    periodo?.desde,
    periodo?.hasta,
    tiendaSel,
    categoriaSel,
    departamentoSel,
    refresco,
  ]);

  useEffect(() => {
    if (pantalla !== 'exploracion' || !estadoApi?.con_datos || sub !== 'articulo') return;
    if (!tiendaSel) {
      setArticulo(null);
      setIntermitencia(null);
      setErrorArticulo('Elige una tienda del territorio para ver el detalle de un artículo.');
      return;
    }
    const actual = ++turnoSeccion.current;
    const control = new AbortController();
    setCargandoArticulo(true);
    setErrorArticulo(null);
    const tareas: Promise<unknown>[] = [
      api
        .intermitencia(
          base,
          {
            tienda: tiendaSel,
            desde: periodo?.desde,
            hasta: periodo?.hasta,
            categorias: categoriasFiltro,
            departamentos: contextoComercial.departamentos,
            pagina: paginaInter,
            tamano: 25,
            orden: ordenInter,
          },
          control.signal,
        )
        .then((respuesta) => {
          if (actual === turnoSeccion.current) setIntermitencia(respuesta);
        }),
    ];
    if (itemDetalle) {
      tareas.push(
        api
          .articulo(
            base,
            {
              item: itemDetalle,
              tienda: tiendaSel,
              desde: periodo?.desde,
              hasta: periodo?.hasta,
            },
            control.signal,
          )
          .then((respuesta) => {
            if (actual === turnoSeccion.current) setArticulo(respuesta);
          }),
      );
    } else {
      setArticulo(null);
    }
    Promise.all(tareas)
      .catch((fallo: unknown) => {
        if (actual !== turnoSeccion.current || control.signal.aborted) return;
        setErrorArticulo(
          fallo instanceof ErrorApi ? fallo.message : 'No se pudo cargar el detalle del artículo',
        );
      })
      .finally(() => {
        if (actual === turnoSeccion.current) setCargandoArticulo(false);
      });
    return () => control.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pantalla,
    sub,
    base,
    estadoApi?.con_datos,
    periodo?.desde,
    periodo?.hasta,
    tiendaSel,
    categoriaSel,
    departamentoSel,
    itemDetalle,
    paginaInter,
    ordenInter,
    refresco,
  ]);

  /* Búsqueda de artículos del detalle: se emite desde el componente y se descarta la
     respuesta vieja al teclear de nuevo. */
  const buscarArticulos = useCallback(
    (texto: string) => {
      setBusquedaItem(texto);
    },
    [],
  );

  useEffect(() => {
    const enArticulo = pantalla === 'exploracion' && sub === 'articulo';
    const enPronostico = pantalla === 'resultados' || pantalla === 'evaluacion';
    if ((!enArticulo && !enPronostico) || !tiendaSel) return;
    const consultaTexto = busquedaItem.trim();
    const actual = ++turnoBusqueda.current;
    const control = new AbortController();
    const temporizador = window.setTimeout(() => {
      setBuscandoItem(true);
      api
        .productos(
          base,
          {
            tienda: tiendaSel,
            categorias: categoriasFiltro,
            departamento: departamentoSel,
            desde: periodo?.desde,
            hasta: periodo?.hasta,
            texto: consultaTexto || undefined,
            orden: 'unidades',
            limite: 8,
          },
          control.signal,
        )
        .then((respuesta) => {
          if (actual !== turnoBusqueda.current) return;
          setResultadosItem(respuesta.productos);
          if (!itemDetalle && respuesta.productos[0]) {
            setItemDetalle(respuesta.productos[0].item_id);
          }
        })
        .catch(() => {
          if (actual === turnoBusqueda.current) setResultadosItem([]);
        })
        .finally(() => {
          if (actual === turnoBusqueda.current) setBuscandoItem(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(temporizador);
      control.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantalla, sub, base, tiendaSel, categoriaSel, departamentoSel, busquedaItem]);

  /* Matriz de desempeño de «Demanda futura» (independiente del corte dibujado). */
  useEffect(() => {
    if (pantalla !== 'evaluacion' || !estadoApi?.con_datos) return;
    const actual = ++turnoMatrizDesempeno.current;
    const control = new AbortController();
    setCargandoMatrizDesempeno(true);
    setErrorMatrizDesempeno(null);
    api
      .matrizHorizontes(base, { nivel: nivelEvaluacion, etapa }, control.signal)
      .then((respuesta) => {
        if (actual !== turnoMatrizDesempeno.current) return;
        setMatrizDesempeno(respuesta);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoMatrizDesempeno.current || control.signal.aborted) return;
        setMatrizDesempeno(null);
        setErrorMatrizDesempeno(
          fallo instanceof ErrorApi && fallo.estado === 503
            ? 'Sin cortes de evaluación publicados para esta etapa.'
            : fallo instanceof ErrorApi
              ? fallo.message
              : 'No se pudo cargar la matriz de desempeño',
        );
      })
      .finally(() => {
        if (actual === turnoMatrizDesempeno.current) setCargandoMatrizDesempeno(false);
      });
    return () => control.abort();
  }, [pantalla, base, estadoApi?.con_datos, etapa, nivelEvaluacion, refresco]);

  /* Precios y detalle de artículo se calculan por tienda: si el contexto tiene tiendas y
     no hay una elegida, se abre la primera y se dice explícitamente. */
  useEffect(() => {
    if (pantalla !== 'exploracion') return;
    if (sub !== 'precios' && sub !== 'articulo') return;
    if (tiendaSel) return;
    const candidata = tiendasFiltro[0];
    if (!candidata) return;
    aplicar(
      { tienda: candidata },
      `Precios y detalle de artículo se calculan por tienda: se abrió ${candidata} del contexto. Puedes cambiarla en el territorio.`,
    );
  }, [pantalla, sub, tiendaSel, tiendasFiltro, aplicar]);

  /* Tabla completa de evaluación por ventana: mismo run y etapa que el resto. */
  useEffect(() => {
    /* También en «Modelado»: el protocolo declara los cortes finales con las ventanas
       publicadas, así que no puede depender de haber visitado antes «Evaluación». */
    if (!['evaluacion', 'proyecto', 'modelado'].includes(pantalla) || !estadoApi?.con_datos) return;
    const actual = ++turnoEvaluacionVentanas.current;
    const control = new AbortController();
    setCargandoEvaluacionVentanas(true);
    setErrorEvaluacionVentanas(null);
    api
      .evaluacionVentanas(base, { etapa }, control.signal)
      .then((respuesta) => {
        if (actual !== turnoEvaluacionVentanas.current) return;
        setEvaluacionVentanas(respuesta);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoEvaluacionVentanas.current || control.signal.aborted) return;
        setEvaluacionVentanas(null);
        setErrorEvaluacionVentanas(
          fallo instanceof ErrorApi && fallo.estado === 503
            ? 'Sin ventanas de evaluación publicadas para esta etapa.'
            : fallo instanceof ErrorApi
              ? fallo.message
              : 'No se pudo cargar la evaluación por ventana',
        );
      })
      .finally(() => {
        if (actual === turnoEvaluacionVentanas.current) setCargandoEvaluacionVentanas(false);
      });
    return () => control.abort();
  }, [pantalla, base, estadoApi?.con_datos, etapa, refresco]);

  /* Auditoría de separación temporal: evidencia guardada por
     scripts/auditar_separacion_temporal.py. Solo se pide en «Evaluación». */
  useEffect(() => {
    if (pantalla !== 'evaluacion' || !estadoApi?.con_datos) return;
    const actual = ++turnoAuditoria.current;
    const control = new AbortController();
    setCargandoAuditoria(true);
    setErrorAuditoria(null);
    api
      .auditoriaTemporal(base, control.signal)
      .then((respuesta) => {
        if (actual !== turnoAuditoria.current) return;
        setAuditoriaTemporal(respuesta);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoAuditoria.current || control.signal.aborted) return;
        setAuditoriaTemporal(null);
        setErrorAuditoria(
          fallo instanceof ErrorApi ? fallo.message : 'No se pudo cargar la auditoría temporal',
        );
      })
      .finally(() => {
        if (actual === turnoAuditoria.current) setCargandoAuditoria(false);
      });
    return () => control.abort();
  }, [pantalla, base, estadoApi?.con_datos, refresco]);

  /* ---- ejecuciones del modelo (Modelado, Proyecto y Evaluación) -------- */
  useEffect(() => {
    /* «Evaluación» también lo necesita: el protocolo se redacta con la frontera de
       entrenamiento y los cortes del manifiesto, no con texto fijo. */
    if (!['modelado', 'proyecto', 'evaluacion'].includes(pantalla) || !estadoApi?.con_datos) return;
    if (modelos) return;
    const actual = ++turnoModelos.current;
    setCargandoModelos(true);
    setModelosError(null);
    api
      .modelos(base)
      .then((respuesta) => {
        if (actual !== turnoModelos.current) return;
        setModelos(respuesta);
        setModelosError(null);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoModelos.current) return;
        setModelos(null);
        setModelosError(
          fallo instanceof ErrorApi ? fallo.message : 'No se pudieron cargar las ejecuciones',
        );
      })
      .finally(() => {
        if (actual === turnoModelos.current) setCargandoModelos(false);
      });
  }, [pantalla, base, estadoApi?.con_datos, modelos, refresco]);

  /* ---- resumen del proyecto (nivel total, etapa final, corte futuro) ---- */
  useEffect(() => {
    if (pantalla !== 'proyecto' || !estadoApi?.con_datos) return;
    const actual = ++turnoProyecto.current;
    setCargandoProyecto(true);
    setErrorProyecto(null);
    Promise.all([
      api.pronosticos(base, { nivel: 'total', dias_historico: 90, origen: null }),
      api.evaluacion(base, { nivel: 'total', etapa: 'final' }).catch((fallo: unknown) => {
        if (fallo instanceof ErrorApi && (fallo.estado === 503 || fallo.estado === 422)) return null;
        throw fallo;
      }),
    ])
      .then(([pronosticosApi, evaluacionApi]) => {
        if (actual !== turnoProyecto.current) return;
        setProyectoPronosticos(pronosticosApi);
        setProyectoEvaluacion(evaluacionApi);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoProyecto.current) return;
        setProyectoPronosticos(null);
        setProyectoEvaluacion(null);
        setErrorProyecto(
          fallo instanceof ErrorApi ? fallo.message : 'No se pudo cargar el resumen del proyecto',
        );
      })
      .finally(() => {
        if (actual === turnoProyecto.current) setCargandoProyecto(false);
      });
  }, [pantalla, base, estadoApi?.con_datos, refresco]);

  /* ---- «Datos y calidad»: estructura, cobertura de precios e intermitencia */
  useEffect(() => {
    if (pantalla !== 'datos') return;
    if (!tiendaDatos) {
      const candidata = tiendaSel ?? tiendasFiltro[0] ?? null;
      if (candidata) setTiendaDatos(candidata);
      return;
    }
    if (!estadoApi?.con_datos) return;
    const actual = ++turnoDatos.current;
    const control = new AbortController();
    setCargandoDatos(true);
    setErrorDatos(null);
    Promise.all([
      api.comparacion(
        base,
        {
          desde: periodo?.desde,
          hasta: periodo?.hasta,
          tiendas: tiendaSel ? undefined : tiendasFiltro,
          estado: estadoSel,
          tienda: tiendaSel,
          categorias: categoriasFiltro,
          departamentos: departamentoSel ? [departamentoSel] : [],
          productos,
        },
        control.signal,
      ),
      api.preciosDistribucion(
        base,
        {
          tienda: tiendaDatos,
          desde: periodo?.desde,
          hasta: periodo?.hasta,
          categorias: categoriasFiltro,
          departamentos: departamentoSel ? [departamentoSel] : [],
        },
        control.signal,
      ),
      api.intermitencia(
        base,
        {
          tienda: tiendaDatos,
          desde: periodo?.desde,
          hasta: periodo?.hasta,
          categorias: categoriasFiltro,
          departamentos: departamentoSel ? [departamentoSel] : [],
          pagina: 1,
          tamano: 1,
          orden: 'ceros',
        },
        control.signal,
      ),
    ])
      .then(([comparacionApi, distribucionApi, intermitenciaApi]) => {
        if (actual !== turnoDatos.current) return;
        setDatosComparacion(comparacionApi);
        setDatosDistribucion(distribucionApi);
        setDatosIntermitencia(intermitenciaApi);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoDatos.current || control.signal.aborted) return;
        setErrorDatos(
          fallo instanceof ErrorApi ? fallo.message : 'No se pudieron cargar los datos de calidad',
        );
      })
      .finally(() => {
        if (actual === turnoDatos.current) setCargandoDatos(false);
      });
    return () => control.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pantalla,
    base,
    estadoApi?.con_datos,
    // El catálogo llega después del estado: sin esta dependencia la tienda por omisión
    // nunca se resuelve y la cobertura de precios queda vacía.
    catalogo,
    tiendaDatos,
    tiendaSel,
    estadoSel,
    categoriaSel,
    departamentoSel,
    periodo?.desde,
    periodo?.hasta,
    refresco,
  ]);

  /* Un solo estado visible para la consulta del pronóstico: cargando, selección
     incompleta, error de validación, error de conexión, consulta válida sin resultados o
     resultado disponible. «Sin pronóstico publicado» solo puede salir de una respuesta
     válida que lo confirme. */
  const estadoPronostico = estadoDeConsulta({
    seleccion: seleccionConsulta,
    cargando: cargandoPronostico,
    tipoError: tipoErrorPronostico,
    hayDatos: pronosticos !== null,
    series: pronosticos?.series.length ?? 0,
  });

  /* Si la tienda de precios deja de existir en el contexto, se reajusta a la primera. */
  useEffect(() => {
    if (!tiendaDatos) return;
    if (tiendasFiltro.includes(tiendaDatos)) return;
    setTiendaDatos(tiendasFiltro[0] ?? null);
  }, [tiendaDatos, tiendasFiltro]);

  /* ---- plan de ventas: carga y detalle ---------------------------------- */
  /* Un solo origen de filtros: los compartidos de la aplicación. Al cambiar cualquiera de
     ellos se vuelve a la primera página del plan. */
  useEffect(() => {
    setPlanPagina(1);
  }, [estadoSel, tiendaSel, categoriaSel, departamentoSel, planTexto, planOrden, planMinimo]);

  useEffect(() => {
    if (!planSeleccion) return;
    const filas = plan?.filas ?? [];
    if (!filas.length) return;
    const sigue = filas.some(
      (fila) =>
        fila.item_id === planSeleccion.item_id && fila.store_id === planSeleccion.store_id,
    );
    if (!sigue && plan?.total) {
      // La serie seleccionada ya no está en la página visible: el detalle se mantiene, la
      // selección no se borra. Solo se limpia si el plan completo no la contiene.
      return;
    }
    if (!sigue && plan && plan.total === 0) setPlanSeleccion(null);
  }, [plan, planSeleccion]);

  useEffect(() => {
    if (pantalla !== 'resultados' || !estadoApi?.con_datos) return;
    const actual = ++turnoPlan.current;
    const control = new AbortController();
    const temporizador = window.setTimeout(() => {
      setCargandoPlan(true);
      setErrorPlan(null);
      api
        .planificacion(
          base,
          {
            tiendas: tiendaSel ? [tiendaSel] : estadoSel ? (tiendasPorEstado.get(estadoSel) ?? []) : [],
            categorias: categoriaSel ? [categoriaSel] : [],
            departamentos: departamentoSel ? [departamentoSel] : [],
            texto: planTexto.trim() || null,
            orden: planOrden,
            minimo_observado: planMinimo,
            pagina: planPagina,
            tamano: 25,
          },
          control.signal,
        )
        .then((respuesta) => {
          if (actual !== turnoPlan.current) return;
          setPlan(respuesta);
          setErrorPlan(null);
        })
        .catch((fallo: unknown) => {
          if (actual !== turnoPlan.current || control.signal.aborted) return;
          setPlan(null);
          setErrorPlan(
            fallo instanceof ErrorApi ? fallo.message : 'No se pudo cargar el plan de ventas',
          );
        })
        .finally(() => {
          if (actual === turnoPlan.current) setCargandoPlan(false);
        });
    }, planTexto ? 250 : 0);
    return () => {
      window.clearTimeout(temporizador);
      control.abort();
    };
  }, [
    pantalla,
    base,
    estadoApi?.con_datos,
    estadoSel,
    tiendaSel,
    categoriaSel,
    departamentoSel,
    tiendasPorEstado,
    planTexto,
    planOrden,
    planPagina,
    planMinimo,
    refresco,
  ]);

  useEffect(() => {
    if (pantalla !== 'resultados' || !planSeleccion) {
      setPlanDetalle(null);
      return;
    }
    const actual = ++turnoPlanDetalle.current;
    const control = new AbortController();
    setCargandoPlanDetalle(true);
    setErrorPlanDetalle(null);
    api
      .detallePlan(
        base,
        { tienda: planSeleccion.store_id, item: planSeleccion.item_id },
        control.signal,
      )
      .then((respuesta) => {
        if (actual !== turnoPlanDetalle.current) return;
        setPlanDetalle(respuesta);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoPlanDetalle.current || control.signal.aborted) return;
        setPlanDetalle(null);
        setErrorPlanDetalle(
          fallo instanceof ErrorApi ? fallo.message : 'No se pudo cargar el detalle de la serie',
        );
      })
      .finally(() => {
        if (actual === turnoPlanDetalle.current) setCargandoPlanDetalle(false);
      });
    return () => control.abort();
  }, [pantalla, base, planSeleccion, refresco]);

  /* Descarga del plan filtrado: se piden todas las filas del filtro (no la página) y se
     generan las columnas con identificadores originales **y** etiquetas legibles. */
  const descargarPlan = useCallback(async () => {
    setDescargandoPlan(true);
    setAvisoDescarga(null);
    try {
      const respuesta = await api.exportarPlan(base, {
        tiendas: tiendaSel ? [tiendaSel] : estadoSel ? (tiendasPorEstado.get(estadoSel) ?? []) : [],
        categorias: categoriaSel ? [categoriaSel] : [],
        departamentos: departamentoSel ? [departamentoSel] : [],
        texto: planTexto.trim() || null,
        orden: planOrden,
        minimo_observado: planMinimo,
      });
      const semanas = respuesta.semanas.map((etiqueta) => etiqueta.replace(' · ', ' '));
      /* El CSV exporta la cifra canónica con cuatro decimales (no un entero por fila): así la
         suma de las filas coincide con el total publicado y con lo que muestra la tabla. */
      /* Cuatro decimales por valor: la suma de las filas queda dentro de una tolerancia que
         depende del número de filas y de la precisión exportada, no de la precisión interna. */
      const decimal = (valor: number) => Number(valor.toFixed(DECIMALES_CSV));
      const filas = respuesta.filas.map((fila) => [
        fila.item_id,
        etiquetaArticulo(fila.item_id),
        fila.store_id,
        etiquetaTienda(fila.store_id),
        fila.cat_id ?? '',
        etiquetaCategoria(fila.cat_id),
        fila.dept_id ?? '',
        etiquetaDepartamento(fila.dept_id),
        decimal(fila.observado_28),
        ...fila.semanas.map((valor) => decimal(valor)),
        decimal(fila.pronostico_28),
        decimal(fila.diferencia),
        fila.variacion_pct === null ? '' : fila.variacion_pct.toFixed(2),
        respuesta.run_id,
        respuesta.version,
        fila.evaluacion.cortes > 0 ? 'sí' : 'no',
        estadoEvaluacion(fila.evaluacion.estado),
        fila.evaluacion.cortes,
      ]);
      const tolerancia = toleranciaCsv(respuesta.filas.length);
      const sumaExportada = respuesta.filas.reduce((suma, fila) => suma + decimal(fila.pronostico_28), 0);
      const desvio = Math.abs(sumaExportada - respuesta.resumen.pronostico_28);
      descargarCsv({
        nombre: `atlas-comercial-plan-${tiendaSel ?? (estadoSel ? estadoSel : 'todas-las-tiendas')}${departamentoSel ? `-${departamentoSel}` : ''}-${respuesta.filas[0] ? 'corte' : 'sin-filas'}`,
        metadatos: [
          [
            'Proyecto',
            'Walmart M5 — Planeación de demanda y evaluación de pronósticos · plan de ventas a cuatro semanas',
          ],
          ['Ejecución', respuesta.run_id],
          ['Revisión publicada', respuesta.revision ?? 'sin revisión declarada'],
          ['Política de precisión', respuesta.politica_precision ?? 'decimal-v1'],
          ['Versión de datos', respuesta.version],
          ['Unidad', respuesta.unidad],
          ['Corte (fin del histórico)', fechaLarga(plan?.origen_fecha ?? null)],
          ['Horizonte', fechaRango(plan?.horizonte_inicio, plan?.horizonte_fin)],
          ['Observado previo', fechaRango(plan?.observado_desde, plan?.observado_hasta)],
          ['Tienda', tiendaSel ? `${etiquetaTienda(tiendaSel)} (${tiendaSel})` : estadoSel ? `tiendas de ${etiquetaEstado(estadoSel)}` : 'todas'],
          ['Departamento', departamentoSel ? `${etiquetaDepartamento(departamentoSel)} (${departamentoSel})` : 'todos'],
          ['Orden', planOrden],
          ['Series incluidas', `${respuesta.incluidas} de ${respuesta.total}`],
          ['Recortado', respuesta.recortado ? 'sí' : 'no'],
          [
            'Precisión',
            `Cada valor se exporta con ${DECIMALES_CSV} decimales a partir de la serie canónica sin redondear. La suma de la columna pronostico_28d no es exactamente igual al total publicado: su diferencia máxima esperable es ${tolerancia.toFixed(
              4,
            )} u = ${respuesta.filas.length} filas × 0,5 × 10^-${DECIMALES_CSV}. La interfaz redondea solo al mostrar (2 decimales). Variación vacía = sin base histórica.`,
          ],
          [
            'Total del conjunto filtrado (canónico)',
            `${respuesta.resumen.pronostico_28.toFixed(6)} u en ${respuesta.resumen.series} series`,
          ],
          [
            'Suma de la columna pronostico_28d',
            `${sumaExportada.toFixed(6)} u · diferencia ${desvio.toFixed(6)} u · tolerancia ${tolerancia.toFixed(
              4,
            )} u`,
          ],
          ['Semanas', semanas.join(' | ')],
          ['Aviso', 'Unidades vendidas previstas, no órdenes de compra.'],
        ],
        columnas: [
          'item_id',
          'articulo',
          'store_id',
          'tienda',
          'cat_id',
          'categoria',
          'dept_id',
          'departamento',
          'observado_28d',
          'semana_1',
          'semana_2',
          'semana_3',
          'semana_4',
          'pronostico_28d',
          'diferencia',
          'variacion_pct',
          'run_id',
          'version',
          'evaluacion_disponible',
          'estado_evaluacion',
          'cortes_evaluados',
        ],
        filas,
      });
      setAvisoDescarga(
        `Descarga con ${numeroEtiqueta(respuesta.incluidas)} de ${numeroEtiqueta(
          respuesta.total,
        )} series del filtro${
          respuesta.recortado ? ' (el filtro supera el máximo de 20 000 filas)' : ''
        }. Suma del CSV ${cifra(sumaExportada, 2)} u frente al total canónico ${cifra(
          respuesta.resumen.pronostico_28,
          2,
        )} u: diferencia ${cifra(desvio, 4)} u, dentro de la tolerancia de ${cifra(tolerancia, 4)} u.`,
      );
    } catch (fallo) {
      setAvisoDescarga(
        fallo instanceof ErrorApi ? fallo.message : 'No se pudo generar la descarga del plan',
      );
    } finally {
      setDescargandoPlan(false);
    }
  }, [base, estadoSel, tiendaSel, categoriaSel, departamentoSel, tiendasPorEstado, planTexto, planOrden, planMinimo, plan]);

  /* ---- evaluación al horizonte de 28 días (pantalla «Evaluación») -------- */
  useEffect(() => {
    if (pantalla !== 'evaluacion' || !estadoApi?.con_datos) return;
    const actual = ++turnoEval28.current;
    const control = new AbortController();
    setCargandoEval28(true);
    setErrorEval28(null);
    api
      .evaluacionHorizonte(
        base,
        { tienda: tiendaSel, categoria: categoriaSel, departamento: departamentoSel },
        control.signal,
      )
      .then((respuesta) => {
        if (actual !== turnoEval28.current) return;
        setEval28(respuesta);
      })
      .catch((fallo: unknown) => {
        if (actual !== turnoEval28.current || control.signal.aborted) return;
        setEval28(null);
        setErrorEval28(
          fallo instanceof ErrorApi ? fallo.message : 'No se pudo cargar la evaluación a 28 días',
        );
      })
      .finally(() => {
        if (actual === turnoEval28.current) setCargandoEval28(false);
      });
    return () => control.abort();
  }, [pantalla, base, estadoApi?.con_datos, tiendaSel, categoriaSel, departamentoSel, refresco]);

  /* ---- datos derivados de la respuesta --------------------------------- */
  const cobertura = estadoApi?.cobertura ?? catalogo?.cobertura ?? null;
  const pendiente = estadoApi !== null && !estadoApi.con_datos;
  const version = estadoApi?.version ?? null;

  const rutasTerritorio: SegmentoRuta[] = [
    { etiqueta: 'Estados Unidos', onClick: () => aplicar({ estado: null, tienda: null }), actual: !estadoSel && !tiendaSel },
  ];
  if (estadoSel) {
    rutasTerritorio.push({
      etiqueta: ESTADO_NOMBRE[estadoSel] ?? estadoSel,
      onClick: () => elegirEstado(estadoSel),
      actual: !tiendaSel,
    });
  }
  if (tiendaSel) {
    rutasTerritorio.push({ etiqueta: tiendaSel, actual: true });
  }

  const rutasCatalogo: SegmentoRuta[] = [
    {
      etiqueta: categoriaSel ? CATEGORIA_NOMBRE[categoriaSel] ?? categoriaSel : 'Todas las categorías',
      onClick: () => aplicar({ categoria: null, departamento: null }),
      actual: !categoriaSel && !departamentoSel,
    },
  ];
  if (categoriaSel && departamentoSel) {
    rutasCatalogo.push({ etiqueta: departamentoSel, actual: true });
  } else if (categoriaSel) {
    rutasCatalogo.push({ etiqueta: `${CATEGORIA_NOMBRE[categoriaSel] ?? categoriaSel} · departamentos`, actual: true });
  }

  const contarDepartamentos = () => {
    if (departamentoSel) return 1;
    if (categoriaSel) {
      return (catalogo?.departamentos ?? []).filter((fila) => fila.cat_id === categoriaSel).length;
    }
    return catalogo?.departamentos.length ?? 0;
  };
  const totalEstados = catalogo?.estados.length ?? 0;
  const totalTiendas = catalogo?.tiendas.length ?? 0;
  const totalCategorias = catalogo?.categorias.length ?? 0;
  const totalDepartamentos = catalogo?.departamentos.length ?? 0;
  const estadosIncluidos = estadoSel ? 1 : totalEstados;
  const categoriasIncluidas = categoriaSel ? 1 : totalCategorias;
  const departamentosIncluidos = contarDepartamentos();
  const resumenCobertura = `${estadosIncluidos} de ${totalEstados} estados · ${tiendasFiltro.length} de ${totalTiendas} tiendas · ${categoriasIncluidas} de ${totalCategorias} categorías · ${departamentosIncluidos} de ${totalDepartamentos} departamentos`;

  const avisoCobertura =
    periodo && cobertura && (periodo.desde < cobertura.desde || periodo.hasta > cobertura.hasta)
      ? `El periodo elegido (${periodo.desde} – ${periodo.hasta}) sale de la cobertura de ventas (${cobertura.desde} – ${cobertura.hasta}): las series y la composición se calculan dentro de la cobertura, y las vistas descriptivas marcan esos días como «sin dato».`
      : null;

  const seleccionEfectiva = pulsoProductos?.contexto?.productos ?? [];
  const errorProductos =
    error?.estado === 422 && /producto/i.test(error.message) ? error.message : null;
  const avisoAB =
    error?.estado === 422 && /intervalo/i.test(error.message)
      ? 'Los intervalos A/B quedaron fuera del periodo consultado. Ajusta la comparación o vuelve a la propuesta automática.'
      : null;

  const abrirComparacion = useCallback(
    (fila: FilaComparacionTiendaCategoria) => {
      aplicar(
        {
          tienda: fila.store_id,
          estado: fila.state_id ?? estadoSel,
          categoria: fila.cat_id,
          departamento: null,
          productos: [],
        },
        `${fila.store_id} · ${CATEGORIA_NOMBRE[fila.cat_id] ?? fila.cat_id}: se abren los departamentos de esa categoría en esa tienda.`,
      );
    },
    [aplicar, estadoSel],
  );

  const contextoTerritorioCatalogo = `${rutasTerritorio
    .map((segmento) => segmento.etiqueta)
    .join(' › ')} · ${rutasCatalogo.map((segmento) => segmento.etiqueta).join(' › ')}`;

  /* Opciones de la barra de contexto: solo valores compatibles con lo ya elegido. */
  const opcionesEstados = useMemo(
    () => [
      { valor: '', texto: 'Todos los estados' },
      ...(catalogo?.estados ?? []).map((valor) => ({
        valor,
        texto: ESTADO_NOMBRE[valor] ?? valor,
      })),
    ],
    [catalogo],
  );
  const opcionesTiendas = useMemo(
    () => [
      { valor: '', texto: estadoSel ? 'Todas las tiendas del estado' : 'Todas las tiendas' },
      ...(catalogo?.tiendas ?? [])
        .filter((tienda) => !estadoSel || tienda.state_id === estadoSel)
        .map((tienda) => ({
          valor: tienda.store_id,
          texto: `${etiquetaTienda(tienda.store_id)} (${tienda.store_id})`,
        })),
    ],
    [catalogo, estadoSel],
  );
  const opcionesCategorias = useMemo(
    () => [
      { valor: '', texto: 'Todas las categorías' },
      ...(catalogo?.categorias ?? []).map((valor) => ({
        valor,
        texto: `${etiquetaCategoria(valor)} (${valor})`,
      })),
    ],
    [catalogo],
  );
  const opcionesDepartamentos = useMemo(
    () => [
      { valor: '', texto: categoriaSel ? 'Todos los departamentos de la categoría' : 'Todos los departamentos' },
      ...(catalogo?.departamentos ?? [])
        .filter((fila) => !categoriaSel || fila.cat_id === categoriaSel)
        .map((fila) => ({
          valor: fila.dept_id,
          texto: `${etiquetaDepartamento(fila.dept_id)} (${fila.dept_id})`,
        })),
    ],
    [catalogo, categoriaSel],
  );
  const opcionesArticulos = useMemo(
    () =>
      resultadosItem.slice(0, 25).map((producto) => ({
        valor: producto.item_id,
        texto: `${etiquetaArticulo(producto.item_id)} · ${(producto.unidades ?? 0).toLocaleString('es-MX')} u`,
      })),
    [resultadosItem],
  );

  const aniosMatriz = useMemo(() => {
    const desde = catalogo?.cobertura?.desde;
    const hasta = catalogo?.cobertura?.hasta;
    if (!desde || !hasta) return [anioMatriz];
    const inicio = Number(desde.slice(0, 4));
    const fin = Number(hasta.slice(0, 4));
    const lista: number[] = [];
    for (let anioActual = inicio; anioActual <= fin; anioActual += 1) lista.push(anioActual);
    return lista;
  }, [catalogo, anioMatriz]);

  return (
    <div className="ac-app">
      {/* A. Cabecera y contexto ------------------------------------------- */}
      <header className="ac-cab">
        <div className="ac-cab-texto">
          <p className="ac-sobrelinea">Ciencia de datos · competencia M5 de Kaggle</p>
          <h2 className="ac-titulo">
            Walmart M5
            <span className="ac-titulo-caso">
              Planeación de demanda y evaluación de pronósticos
            </span>
          </h2>
          <p className="ac-sub">
            Analítica de ventas históricas y pronóstico diario a 28 días con datos de la
            competencia M5 de Kaggle.
          </p>
          <p className="ac-nota-afiliacion">
            Proyecto independiente con datos públicos de la competencia M5; no está afiliado ni
            patrocinado por Walmart.
          </p>
          {cobertura ? (
            <p className="ac-cobertura">
              {periodo
                ? `${resumenPeriodo(periodo.desde, periodo.hasta, diasEntre(periodo.desde, periodo.hasta))} · `
                : `Cobertura con ventas ${formatFecha(cobertura.desde)} – ${formatFecha(cobertura.hasta)} · ${cobertura.dias.toLocaleString('es-MX')} ${cobertura.dias === 1 ? 'día' : 'días'} · `}
              {resumenCobertura}
            </p>
          ) : null}
        </div>
        <div className="ac-cab-controles">
          <NavPantallas activa={pantalla} onElegir={irAPantalla} />
          {pantalla === 'exploracion' ? (
            <Segmentado<Agregacion>
              etiqueta="Agregación temporal"
              valor={agregacion}
              onElegir={setAgregacion}
              testid="selector-agregacion"
              opciones={[
                { valor: 'dia', texto: 'Día' },
                { valor: 'semana', texto: 'Semana' },
                { valor: 'mes', texto: 'Mes' },
              ]}
            />
          ) : null}
        </div>
      </header>

      {pendiente ? (
        <section className="ac-panel ac-panel--pendiente" role="status" data-testid="estado-pendiente">
          <h3>Datos pendientes de importar</h3>
          <p>
            La aplicación está lista, pero no hay una versión publicada del conjunto M5 en MongoDB local. No se
            muestran cifras mientras falten los datos.
          </p>
          <ol>
            <li>
              Descarga <code>sales_train_evaluation.csv</code> y <code>calendar.csv</code> en{' '}
              <code>backend/data/m5</code>.
            </li>
            <li>
              Ejecuta <code>python -m scripts.importar_m5</code>, <code>python -m scripts.agregar_m5</code> y{' '}
              <code>python -m scripts.pronosticar_m5</code>.
            </li>
            <li>Recarga esta página.</li>
          </ol>
        </section>
      ) : null}

      {error && !pendiente ? (
        <section className="ac-panel ac-panel--error" role="alert">
          <h3>No se pudo cargar el análisis</h3>
          <p>{error.message}</p>
          {avisoAB ? <p className="ac-nota">{avisoAB}</p> : null}
          {errorProductos ? (
            <p className="ac-nota">
              La selección de productos ya no es válida para este contexto. Vuelve al Top {MAX_PRODUCTOS} por
              unidades o elige otros productos.
            </p>
          ) : null}
          <div className="ac-error-acciones">
            <button type="button" className="ac-accion" onClick={() => void cargar()}>
              Reintentar
            </button>
            {avisoAB ? (
              <button type="button" className="ac-accion ac-accion--secundaria" onClick={() => setAb(null)}>
                Volver a la comparación automática
              </button>
            ) : null}
            {errorProductos ? (
              <button
                type="button"
                className="ac-accion ac-accion--secundaria"
                onClick={() => {
                  setProductos([]);
                  setError(null);
                }}
              >
                Volver al Top {MAX_PRODUCTOS}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {!pendiente && !error ? (
        <>
          <RutasContexto territorio={rutasTerritorio} catalogo={rutasCatalogo} />

          <BarraContexto
            estados={opcionesEstados}
            tiendas={opcionesTiendas}
            categorias={opcionesCategorias}
            departamentos={opcionesDepartamentos}
            articulos={opcionesArticulos}
            estado={estadoSel}
            tienda={tiendaSel}
            categoria={categoriaSel}
            departamento={departamentoSel}
            articulo={itemDetalle}
            onEstado={elegirEstado}
            onTienda={elegirTienda}
            onCategoria={elegirCategoria}
            onDepartamento={elegirDepartamento}
            onArticulo={(siguiente) => aplicar({ item: siguiente }, null)}
            busqueda={pantalla === 'resultados' ? planTexto : undefined}
            onBusqueda={pantalla === 'resultados' ? setPlanTexto : undefined}
            resumen={contextoTerritorioCatalogo}
            aviso={aviso}
          />

          {pantalla === 'exploracion' || pantalla === 'datos' ? (
          <section className="ac-filtros ac-filtros--compacta" aria-label="Filtros del análisis">
            <div className="ac-filtros-fila">
              <DesplegablePeriodo
                desde={periodo?.desde ?? ''}
                hasta={periodo?.hasta ?? ''}
                cobertura={cobertura}
                resumen={
                  periodo
                    ? resumenPeriodo(periodo.desde, periodo.hasta, diasEntre(periodo.desde, periodo.hasta))
                    : 'Todo el histórico'
                }
                onAplicar={(desde, hasta) => setPeriodo({ desde, hasta })}
              />
              {pantalla === 'exploracion' ? (
              <DesplegableComparar
                a={
                  ab?.a ??
                  (pulso?.comparacion?.a
                    ? { desde: pulso.comparacion.a.desde, hasta: pulso.comparacion.a.hasta }
                    : null)
                }
                automatico={ab === null}
                b={
                  ab?.b ??
                  (pulso?.comparacion?.b
                    ? { desde: pulso.comparacion.b.desde, hasta: pulso.comparacion.b.hasta }
                    : null)
                }
                cobertura={cobertura}
                periodo={periodo ?? { desde: cobertura?.desde ?? '', hasta: cobertura?.hasta ?? '' }}
                onAplicar={(a, b) => setAb(a && b ? { a, b } : null)}
              />
              ) : null}
            </div>
            <p className="ac-filtros-resumen">
              {pantalla === 'exploracion'
                ? pulso?.comparacion?.a && pulso?.comparacion?.b
                  ? `A: ${formatFecha(pulso.comparacion.a.desde)} – ${formatFecha(pulso.comparacion.a.hasta)} · ${pulso.comparacion.a.dias} días | B: ${formatFecha(pulso.comparacion.b.desde)} – ${formatFecha(pulso.comparacion.b.hasta)} · ${pulso.comparacion.b.dias} días${pulso.parametros.ab_por_omision ? ' · propuesta automática (dos mitades del periodo)' : ''}`
                  : 'Sin comparación A/B definida.'
                : `Periodo descriptivo: ${
                    periodo
                      ? `${formatFecha(periodo.desde)} – ${formatFecha(periodo.hasta)}`
                      : cobertura
                        ? `${formatFecha(cobertura.desde)} – ${formatFecha(cobertura.hasta)}`
                        : 'todo el histórico'
                  } · el corte del pronóstico y las ventanas de evaluación se eligen en sus pantallas`}
              {pantalla === 'exploracion' && pulso?.contexto ? ` · ${pulso.contexto.descripcion}` : ''}
              {actualizando ? <span className="ac-actualizando"> · actualizando…</span> : null}
            </p>
            {avisoCobertura ? (
              <p className="ac-aviso-inline" role="status" data-testid="aviso-cobertura">
                {avisoCobertura}
              </p>
            ) : null}
          </section>
          ) : null}

          {pantalla === 'exploracion' ? (
            <nav className="ac-sec-nav" aria-label="Subsecciones de la exploración">
              <Segmentado<SubExploracion>
                etiqueta="Subsección de la exploración"
                valor={sub}
                onElegir={(siguiente) => aplicar({ sub: siguiente }, null)}
                testid="selector-seccion"
                opciones={SECCIONES}
              />
            </nav>
          ) : null}

          {/* D. Pantalla «Exploración» ------------------------------------ */}
          {pantalla === 'exploracion' ? (
            <>
              {sub === 'panorama' ? (
                <>
              {/* B. Panorama territorial ------------------------------- */}
              {pulso?.panorama ? (
                <TarjetasEstado
                  panorama={pulso.panorama}
                  estadoActivo={estadoSel}
                  onElegir={elegirEstado}
                />
              ) : null}

              {cargando && !pulso ? (
                <div className="ac-esqueleto" role="status" aria-busy="true">
                  <span>Calculando el panorama de ventas…</span>
                </div>
              ) : pulso ? (
                <div aria-busy={actualizando}>
                  <PulsoVentas
                    datos={pulso}
                    catalogo={catalogo}
                    onExplorar={explorarSerie}
                    explorable
                    tituloSeccion={
                      nivelPaneles === 'departamento'
                        ? `Departamentos de ${tiendaSel}`
                        : 'Pequeños múltiplos por tienda, agrupados por estado'
                    }
                  />
                </div>
              ) : null}

              {/* C. Composición comercial ------------------------------ */}
              {pulso?.composicion ? (
                <ComposicionComercial
                  composicion={pulso.composicion}
                  comparacion={comparacion}
                  contexto={contextoTerritorioCatalogo}
                  periodo={periodo}
                  categoriaActiva={categoriaSel}
                  departamentoActivo={departamentoSel}
                  onCategoria={elegirCategoria}
                  onDepartamento={elegirDepartamento}
                  onAbrirCombinacion={abrirComparacion}
                />
              ) : null}

              {pulso ? (
                <ComparacionConcentracion
                  datos={pulso}
                  onExplorarArticulo={(item) =>
                    aplicar(
                      { sub: 'articulo', item },
                      `Se abre el detalle de ${item} en el artículo seleccionado del contexto.`,
                    )
                  }
                />
              ) : null}

              {/* C2. Comparación entre periodos por tienda × categoría ------ */}
              <ComparacionTiendaCategoria
                datos={comparacion}
                cargando={cargandoComparacion}
                error={errorComparacion}
                metrica={metricaAB}
                onMetrica={setMetricaAB}
                orden={ordenAB}
                onOrden={setOrdenAB}
                contexto={contextoTerritorioCatalogo}
                abierto={abAbierto}
                onAbierto={setAbAbierto}
                tiendaSeleccionada={tiendaSel}
                onAbrir={abrirComparacion}
                onReintentar={() => setRefresco((n) => n + 1)}
              />

              {/* D. Comparación histórica ------------------------------ */}
              <HistoricoEditorial
                datos={historico}
                cargando={cargandoHistorico}
                error={errorHistorico}
                anio={anio}
                modo={modoHistorico}
                onAnio={(siguiente) => aplicar({ anio: siguiente })}
                onModo={(siguiente) => aplicar({ modo: siguiente })}
                onReintentar={() => void cargarHistorico()}
              />

              {/* E. Exploración de productos ---------------------------- */}
              {departamentoSel && contextoProductos ? (
                <div className="ac-bloques" data-testid="seccion-productos">
                  <ExploradorProductos
                    base={base}
                    tiendas={tiendasFiltro}
                    estado={estadoSel}
                    departamento={departamentoSel}
                    categorias={categoriasFiltro}
                    desde={periodo?.desde ?? ''}
                    hasta={periodo?.hasta ?? ''}
                    seleccion={productos}
                    maximo={MAX_PRODUCTOS}
                    automatica={Boolean(pulsoProductos?.contexto?.seleccion_automatica)}
                    onSeleccion={(siguiente) =>
                      aplicar(
                        { productos: siguiente ?? [] },
                        siguiente === null
                          ? `Se restauró el Top ${MAX_PRODUCTOS} por unidades del periodo.`
                          : null,
                      )
                    }
                  />
                  {pulsoProductos ? (
                    <section className="ac-panel" aria-labelledby="ac-t-series-productos">
                      <header className="ac-panel-cab">
                        <div>
                          <h3 id="ac-t-series-productos">
                            Series de los productos seleccionados · {departamentoSel}
                          </h3>
                          <p className="ac-panel-sub">
                            Comparación local: no cambia las vistas de territorio ni la composición
                          </p>
                        </div>
                        <Segmentado<ModoSerie>
                          etiqueta="Modo de lectura de las series de producto"
                          valor={modoSeries}
                          onElegir={setModoSeries}
                          testid="selector-modo-productos"
                          opciones={[
                            { valor: 'comun', texto: 'Escala común' },
                            { valor: 'tendencias', texto: 'Comparar tendencias' },
                          ]}
                        />
                      </header>
                      <Multiples
                        series={pulsoProductos.series}
                        agregacion={pulsoProductos.parametros.agregacion}
                        modo={modoSeries}
                        ariaLabel="Series de los productos seleccionados; usa las flechas para mover la guía"
                        etiquetaTotal="Unidades del periodo"
                      />
                      <p className="ac-nota">
                        {pulsoProductos.contexto?.descripcion ?? ''} · suma de las series:{' '}
                        {(
                          pulsoProductos.resumen.total_seleccion ?? 0
                        ).toLocaleString('es-MX')}{' '}
                        u de {(pulsoProductos.resumen.total_contexto ?? 0).toLocaleString('es-MX')} u del
                        departamento ({pulsoProductos.resumen.participacion_pct?.toLocaleString('es-MX') ?? '—'} %).
                        La selección no es el total del departamento.
                      </p>
                    </section>
                  ) : (
                    <p className="ac-vacio">
                      Sin series de producto: {seleccionEfectiva.length} productos seleccionados.
                    </p>
                  )}
                </div>
              ) : departamentoSel ? (
                <p className="ac-aviso-inline" data-testid="productos-sin-territorio">
                  Para explorar los productos de {departamentoSel} elige antes un estado o una tienda en la ruta
                  de territorio: las series de producto se calculan sobre un contexto territorial explícito.
                </p>
              ) : null}

              <details className="ac-metodologia">
                <summary>Fuente, reglas y metodología</summary>
                <div className="ac-metodologia-cuerpo">
                  <p>
                    <strong>Fuente.</strong> «M5 Forecasting - Accuracy» (Walmart, competición de Kaggle): ventas
                    diarias por producto y tienda en Estados Unidos (CA, TX, WI). Este proyecto no está vinculado
                    ni patrocinado por Walmart.
                  </p>
                  <p>
                    <strong>Versión de datos.</strong> {version ?? 'sin versión publicada'} · cobertura con ventas{' '}
                    {cobertura
                      ? `${formatFecha(cobertura.desde)} – ${formatFecha(cobertura.hasta)} (${cobertura.dias} días)`
                      : '—'}
                    {estadoApi?.calendario?.dias_calendario_sin_ventas
                      ? ` · ${estadoApi.calendario.dias_calendario_sin_ventas} días de calendario sin ventas, excluidos`
                      : ''}
                    .
                  </p>
                  <p>
                    <strong>Dos jerarquías.</strong> Territorio: Estados Unidos → estado → tienda. Catálogo:
                    categoría → departamento → producto. Se cruzan en un único estado de filtros: los totales de
                    cada bloque son la intersección territorio × catálogo × periodo, no la suma de marginales.
                  </p>
                  <p>
                    <strong>Denominadores.</strong> Estado: total del contexto territorial. Categoría: total del
                    contexto territorial. Departamento: total de su categoría. Producto: universo del departamento
                    (productos con ventas) en el mismo contexto y periodo.
                  </p>
                  <p>
                    <strong>Comparación histórica.</strong> Solo años anteriores completos (1 de enero – 31 de
                    diciembre); los incompletos se excluyen y se declaran. Semanas ISO de lunes a domingo
                    comparadas por número de semana; el acumulado se alinea por mes y día y se calcula año por año
                    antes de promediar. La banda es el rango observado mínimo–máximo: no es un intervalo de
                    confianza ni una predicción. Los años bisiestos pueden incluir un día adicional y el 29 de
                    febrero solo promedia referencias con esa fecha.
                  </p>
                  <p>
                    <strong>Derivado tienda × departamento.</strong>{' '}
                    {estadoApi?.derivado
                      ? `Estado «${estadoApi.derivado.estado}» · ${estadoApi.derivado.documentos ?? '—'} documentos · calculado en ${estadoApi.derivado.duracion_s ?? '—'} s · ${estadoApi.derivado.dias ?? '—'} días, reconciliado contra los agregados de tienda y de departamento antes de publicarse.`
                      : 'No publicado: la vista de departamentos se calcula al vuelo desde los bloques y no se sirve nada parcial.'}
                  </p>
                  <p>
                    <strong>Ausentes y ceros.</strong> Un día sin observación se muestra como «sin dato»; el cero
                    solo aparece cuando la fuente registra cero. No se imputa nada ni se suavizan las series.
                  </p>
                  <p>
                    <strong>Comparación A/B.</strong> Mismos filtros en ambos intervalos; diferencia = B − A y
                    variación = (B − A) / A × 100, no calculable si A = 0. Son diferencias de conteos: no ajustan
                    por duración ni implican causalidad.
                  </p>
                  <p>
                    <strong>Concentración.</strong> Productos con ventas positivas en el intervalo y en el alcance
                    del nivel activo, ordenados de mayor a menor. La lectura del 80 % usa las cantidades originales
                    y el menor número entero de productos que alcanza ese 80 %. No es la curva de Lorenz.
                  </p>
                </div>
              </details>
                </>
              ) : null}

              {sub === 'estacionalidad' ? (
                <div className="ac-bloques" data-testid="seccion-estacionalidad">
                  <Estacionalidad
                    datos={estacionalidad}
                    cargando={cargandoEstacionalidad}
                    error={errorEstacionalidad}
                    dimension={dimensionEst}
                    onDimension={elegirDimension}
                    contexto={contextoTerritorioCatalogo}
                    onReintentar={() => setRefresco((n) => n + 1)}
                  />
                  <MatrizTemporal
                    datos={matrizTemporal}
                    cargando={cargandoMatrizTemporal}
                    error={errorMatrizTemporal}
                    anio={anioMatriz}
                    anios={aniosMatriz}
                    onAnio={setAnioMatriz}
                    contexto={contextoTerritorioCatalogo}
                    onReintentar={() => setRefresco((n) => n + 1)}
                  />
                </div>
              ) : null}

              {sub === 'precios' ? (
                <div className="ac-bloques" data-testid="seccion-precios">
                  <Precios
                    distribucion={preciosDistribucion}
                    cambios={preciosCambios}
                    cargando={cargandoPrecios}
                    error={errorPrecios}
                    contexto={contextoTerritorioCatalogo}
                    tienda={tiendaSel}
                    onReintentar={() => setRefresco((n) => n + 1)}
                  />
                </div>
              ) : null}

              {sub === 'articulo' ? (
                <div className="ac-bloques" data-testid="seccion-articulo">
                  <DetalleArticulo
                    articulo={articulo}
                    intermitencia={intermitencia}
                    cargando={cargandoArticulo}
                    error={errorArticulo}
                    contexto={contextoTerritorioCatalogo}
                    tienda={tiendaSel}
                    item={itemDetalle}
                    productos={resultadosItem}
                    buscando={buscandoItem}
                    onBuscar={buscarArticulos}
                    onElegirItem={(siguiente) => aplicar({ item: siguiente }, null)}
                    pagina={paginaInter}
                    onPagina={setPaginaInter}
                    orden={ordenInter}
                    onOrden={(siguiente) => {
                      setOrdenInter(siguiente);
                      setPaginaInter(1);
                    }}
                    onReintentar={() => setRefresco((n) => n + 1)}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {/* E. Pantalla «Proyecto» --------------------------------------- */}
          {pantalla === 'proyecto' ? (
            <PantallaProyecto
              estadoApi={estadoApi}
              catalogo={catalogo}
              modelos={modelos}
              evaluacion={proyectoEvaluacion}
              ventanas={evaluacionVentanas}
              pronosticos={proyectoPronosticos}
              cargando={cargandoProyecto}
              error={errorProyecto}
              onIr={irAPantalla}
              onReintentar={() => setRefresco((n) => n + 1)}
              actualizadoEn={null}
            />
          ) : null}

          {/* F. Pantalla «Datos y calidad» -------------------------------- */}
          {pantalla === 'datos' ? (
            <PantallaDatos
              estadoApi={estadoApi}
              catalogo={catalogo}
              comparacion={datosComparacion}
              distribucion={datosDistribucion}
              intermitencia={datosIntermitencia}
              tiendaPrecios={tiendaDatos}
              tiendas={tiendasFiltro}
              onTienda={setTiendaDatos}
              cargando={cargandoDatos}
              error={errorDatos}
              onReintentar={() => setRefresco((n) => n + 1)}
            />
          ) : null}

          {/* G. Pantalla «Modelado» -------------------------------------- */}
          {pantalla === 'modelado' ? (
            <PantallaModelado
              modelos={modelos}
              pronosticos={pronosticos ?? proyectoPronosticos}
              evaluacion={evaluacion ?? proyectoEvaluacion}
              ventanas={evaluacionVentanas}
              cargando={cargandoModelos}
              error={modelosError}
              onReintentar={() => setRefresco((n) => n + 1)}
              onIr={irAPantalla}
            />
          ) : null}

          {/* H. Pantalla «Evaluación» ------------------------------------ */}
          {pantalla === 'evaluacion' ? (
            <PantallaEvaluacion
              modelos={modelos}
              auditoria={auditoriaTemporal}
              cargandoAuditoria={cargandoAuditoria}
              errorAuditoria={errorAuditoria}
              pronosticos={pronosticos}
              evaluacion={evaluacion}
              cargando={cargandoPronostico}
              error={errorPronostico}
              tipoError={tipoErrorPronostico}
              nivel={nivelEvaluacion}
              etapa={etapa}
              origen={origenPronostico}
              onEtapa={setEtapa}
              onOrigen={setOrigenPronostico}
              onNivel={setNivelEvaluacion}
              contextoTerritorio={rutasTerritorio.map((segmento) => segmento.etiqueta).join(' › ')}
              contextoCatalogo={rutasCatalogo.map((segmento) => segmento.etiqueta).join(' › ')}
              evaluacion28={eval28}
              cargando28={cargandoEval28}
              error28={errorEval28}
              matrizDesempeno={matrizDesempeno}
              cargandoMatriz={cargandoMatrizDesempeno}
              errorMatriz={errorMatrizDesempeno}
              lecturaMatriz={lecturaMatriz}
              onLecturaMatriz={setLecturaMatriz}
              metodoSesgo={metodoSesgo}
              onMetodoSesgo={setMetodoSesgo}
              ventanas={evaluacionVentanas}
              cargandoVentanas={cargandoEvaluacionVentanas}
              errorVentanas={errorEvaluacionVentanas}
              onReintentar={() => setRefresco((n) => n + 1)}
              onIr={irAPantalla}
            />
          ) : null}

          {/* I. Pantalla «Resultados» ------------------------------------ */}
          {pantalla === 'resultados' ? (
            <PantallaResultados
              estadoApi={estadoApi}
              plan={plan}
              planDetalle={planDetalle}
              cargandoPlan={cargandoPlan}
              cargandoPlanDetalle={cargandoPlanDetalle}
              errorPlan={errorPlan}
              errorPlanDetalle={errorPlanDetalle}
              planTexto={planTexto}
              planOrden={planOrden}
              planMinimo={planMinimo}
              planSeleccion={planSeleccion}
              vistaPlan={vistaPlan}
              onVistaPlan={setVistaPlan}
              descargandoPlan={descargandoPlan}
              avisoDescarga={avisoDescarga}
              onPlanOrden={setPlanOrden}
              onPlanPagina={setPlanPagina}
              onPlanMinimo={setPlanMinimo}
              onPlanSeleccion={(fila) => {
                setPlanSeleccion(fila);
                if (!fila) setPlanDetalle(null);
              }}
              onPlanDescargar={() => void descargarPlan()}
              onExplorarArticulo={(item, tienda) =>
                aplicar(
                  { sub: 'articulo', tienda, estado: estadoDeTienda.get(tienda) ?? estadoSel, item },
                  `Se abre el detalle de ${item} en ${tienda} dentro de Exploración.`,
                )
              }
              pronosticos={pronosticos}
              evaluacion={evaluacion}
              cargando={cargandoPronostico}
              error={errorPronostico}
              estado={estadoPronostico}
              seleccion={seleccionResultados}
              onIrEvaluacion={() => irAPantalla('evaluacion')}
              onCompletar={() => {
                setAviso(
                  'Completa la selección: elige una tienda y un artículo con los controles del contexto activo.',
                );
                if (typeof window === 'undefined') return;
                const barra = document.querySelector('.ac-contexto');
                barra?.scrollIntoView({ block: 'center' });
                const vacio = [
                  ...(barra?.querySelectorAll<HTMLSelectElement>('select') ?? []),
                ].find((select) => !select.value);
                vacio?.focus();
              }}
              nivel={nivelResultados}
              etapa={etapa}
              origen={origenPronostico}
              onNivel={elegirNivelResultados}
              onEtapa={setEtapa}
              onOrigen={setOrigenPronostico}
              contextoTerritorio={rutasTerritorio.map((segmento) => segmento.etiqueta).join(' › ')}
              contextoCatalogo={rutasCatalogo.map((segmento) => segmento.etiqueta).join(' › ')}
              onIr={irAPantalla}
              onReintentar={() => setRefresco((n) => n + 1)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Días inclusivos entre dos fechas ISO. */
function diasEntre(desde: string, hasta: string): number | null {
  if (!desde || !hasta) return null;
  const inicio = Date.parse(`${desde}T00:00:00`);
  const fin = Date.parse(`${hasta}T00:00:00`);
  if (Number.isNaN(inicio) || Number.isNaN(fin) || fin < inicio) return null;
  return Math.round((fin - inicio) / 86_400_000) + 1;
}

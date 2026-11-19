/**
 * Tipos y acceso a la API del proyecto «Atlas comercial · Demanda y ventas».
 *
 * La API vive en `/api/v1/comercial/m5`. Base en orden de preferencia:
 * `opts.apiBase` → `window.PORTFOLIO_COMERCIAL_API` → `http://127.0.0.1:8010/api/v1/comercial/m5`.
 *
 * Cuando no hay datos importados la API responde 503 con `estado: "pendiente"`.
 * Ese caso **no** se convierte en ceros: la interfaz lo dice y no dibuja cifras.
 */

export type Agregacion = 'dia' | 'semana' | 'mes';
export type Nivel = 'total' | 'tienda' | 'categoria';

/** Nivel del explorador de «Pulso de ventas»: tiendas → departamentos → productos. */
export type NivelExploracion = 'tienda' | 'departamento' | 'producto';

/** Modo de la comparación histórica. */
export type ModoHistorico = 'semana' | 'acumulado';

/** Modo de lectura de las series: escala común desde cero o índice base 100. */
export type ModoSerie = 'comun' | 'tendencias';

export interface EstadoPanorama {
  estado: string;
  nombre: string;
  tiendas: string[];
  tiendas_incluidas: number;
  unidades: number;
  participacion_pct: number | null;
}

export interface Panorama {
  total_unidades: number;
  denominador: string;
  estados: EstadoPanorama[];
  estados_incluidos: number;
  estados_catalogo: number;
  unidad: string;
}

export interface FilaComposicion {
  codigo: string;
  etiqueta: string;
  categoria?: string | null;
  unidades: number;
  participacion_pct: number | null;
  denominador: string;
}

export interface Composicion {
  total_unidades: number;
  unidad: string;
  categorias: FilaComposicion[];
  departamentos: FilaComposicion[];
  denominador_categorias: string;
  denominador_departamentos: string;
  nota: string;
}

export interface PuntoHistorico {
  clave: string;
  etiqueta: string;
  semana: number | null;
  mes_dia: string | null;
  fecha_desde: string;
  fecha_hasta: string;
  observado: number | null;
  referencia_promedio: number | null;
  referencia_min: number | null;
  referencia_max: number | null;
  referencias: number;
  parcial: boolean;
  estado: 'ok' | 'sin_referencia' | 'ausente';
  motivo: string | null;
  diferencia: number | null;
  diferencia_pct: number | null;
}

export interface AnotacionHistorica {
  tipo: string;
  etiqueta: string;
  clave: string;
  fecha: string;
  observado: number | null;
  referencia_promedio: number | null;
  diferencia: number | null;
  diferencia_pct: number | null;
  texto: string;
}

export interface HistoricoRespuesta {
  version: string;
  generado_en: string;
  anio: number;
  anios_disponibles: number[];
  modo: ModoHistorico;
  etiqueta_modo: string;
  regla_alineacion: string;
  cobertura_anio: { desde: string; hasta: string; completa: boolean; motivo: string | null };
  referencias: {
    anios_incluidos: number[];
    anios_excluidos: { anio: number; motivo: string }[];
    n_anios: number;
    criterio: string;
  };
  sin_referencia: boolean;
  una_referencia: boolean;
  unidad: string;
  filtros: {
    tiendas: string[];
    categorias: string[];
    departamentos: string[];
    estado: string | null;
    tienda: string | null;
    descripcion: string;
    periodo_global: Cobertura;
    alcance_temporal: string;
  };
  puntos: PuntoHistorico[];
  puntos_con_referencia: number;
  anotaciones: AnotacionHistorica[];
  ultimo_con_dato: PuntoHistorico | null;
  acumulado: { completo: boolean; desde: string; etiqueta: string; nota: string | null } | null;
  nota_banda: string;
  nota_alcance: string;
}

export const BASE_POR_OMISION = 'http://127.0.0.1:8010/api/v1/comercial/m5';

export function baseApi(override?: string): string {
  const global = (window as unknown as { PORTFOLIO_COMERCIAL_API?: string }).PORTFOLIO_COMERCIAL_API;
  return (override || global || BASE_POR_OMISION).replace(/\/+$/, '');
}

export interface Cobertura {
  desde: string;
  hasta: string;
  dias: number;
}

export interface EstadoRespuesta {
  version: string | null;
  con_datos: boolean;
  estado: 'pendiente' | 'validada' | 'publicada';
  mensaje: string | null;
  cobertura: Cobertura | null;
  unidad: string | null;
  esquema: string | null;
  destino?: string | null;
  base?: string | null;
  calendario?: {
    compartido?: boolean;
    dias_de_calendario?: number;
    dias_con_ventas?: number;
    dias_calendario_sin_ventas?: number;
  } | null;
  derivado?: {
    nombre?: string;
    estado?: string;
    publicado?: boolean;
    documentos?: number | null;
    dias?: number | null;
    duracion_s?: number | null;
    reconciliacion?: Record<string, unknown> | null;
  } | null;
}

export interface Capacidades {
  agregaciones: Agregacion[];
  filtros: string[];
  niveles_pronostico: Nivel[];
  niveles_exploracion?: NivelExploracion[];
  derivado_departamento_tienda?: boolean;
  detalle_producto_tienda: boolean;
  ingresos: boolean;
}

export interface Tienda {
  store_id: string;
  state_id: string;
}

export interface CatalogoRespuesta {
  version: string;
  tiendas: Tienda[];
  estados: string[];
  categorias: string[];
  departamentos: { cat_id: string; dept_id: string }[];
  productos_total: number;
  productos: { item_id: string; cat_id: string; dept_id: string }[];
  cobertura: Cobertura;
  capacidades: Capacidades;
  nota: string;
}

export interface CuboSerie {
  clave: string;
  etiqueta: string;
  total: number;
  dias: number;
  dias_sin_observacion: number;
  parcial: boolean;
}

export interface SerieTienda {
  /** Identificador real de la serie en su nivel (store_id, dept_id o item_id). */
  clave?: string | null;
  nombre?: string | null;
  nivel?: NivelExploracion | null;
  store_id: string;
  total: number;
  dias_con_dato: number;
  valores: CuboSerie[];
}

export interface FilaAB {
  clave?: string;
  etiqueta?: string;
  nivel?: NivelExploracion | null;
  categoria: string | null;
  a: number;
  b: number;
  diferencia: number;
  variacion_pct: number | null;
  nota: string | null;
}

export interface PuntoConcentracion {
  producto: string | null;
  posicion?: number | null;
  unidades?: number | null;
  acumulado: number;
  participacion?: number | null;
  porcentaje: number;
  porcentaje_productos?: number;
  cierre?: boolean;
}

export interface MigaNavegacion {
  nivel: NivelExploracion;
  etiqueta: string;
  tienda?: string | null;
  departamento?: string | null;
}

export interface ContextoPulso {
  nivel: NivelExploracion;
  estado: string | null;
  tienda: string | null;
  tiendas_contexto: string[];
  departamento: string | null;
  departamentos: string[];
  productos: string[];
  productos_disponibles: number;
  seleccion_automatica: boolean;
  total_contexto: number;
  total_seleccion: number;
  participacion_pct: number | null;
  descripcion: string;
}

export interface DerivadoInfo {
  nombre: string;
  estado: string;
  publicado: boolean;
  origen: string;
  version_datos: string;
  huella: string | null;
  documentos: number | null;
  dias: number | null;
  duracion_s: number | null;
  reutilizado: boolean;
  reconciliacion: Record<string, unknown> | null;
}

export interface PulsoRespuesta {
  version: string;
  version_derivado?: string | null;
  generado_en: string;
  nivel: NivelExploracion;
  parametros: {
    desde: string;
    hasta: string;
    agregacion: Agregacion;
    tiendas: string[];
    categorias: string[];
    departamentos: string[];
    productos: string[];
    nivel: NivelExploracion;
    tienda: string | null;
    departamento: string | null;
    a: Cobertura | null;
    b: Cobertura | null;
    ab_por_omision?: boolean;
  };
  contexto: ContextoPulso | null;
  migas: MigaNavegacion[];
  derivado: DerivadoInfo | null;
  cobertura: Cobertura | null;
  resumen: {
    total: number;
    nivel: NivelExploracion;
    series: number;
    tiendas: number;
    total_contexto: number;
    total_seleccion: number;
    participacion_pct: number | null;
    dias: number;
    promedio_diario: number | null;
    unidad: string;
    concentracion_total: number;
    reconcilia_con_concentracion: boolean;
  };
  dominio: { desde: string; hasta: string; dias: number; agregacion: Agregacion };
  series: SerieTienda[];
  comparacion: {
    nivel?: NivelExploracion | null;
    a: Cobertura | null;
    b: Cobertura | null;
    filas: FilaAB[];
    no_causal: string;
  } | null;
  concentracion: {
    universo: string;
    alcance?: string;
    productos: number;
    total: number;
    puntos: PuntoConcentracion[];
    cola: number;
    cierre: { porcentaje_productos: number; porcentaje_unidades: number } | null;
    /**
     * Productos exactos del universo en orden descendente con desempate por identificador:
     * `[item_id, unidades, cat_id, dept_id]`. Permite calcular el mínimo número de productos
     * para cualquier objetivo sin interpolar. No contiene series diarias.
     */
    exacto?: {
      productos: (string | number | null)[][];
      total: number;
      n: number;
      orden: string;
      lectura_80: Record<string, unknown> | null;
    } | null;
    lectura_80?: {
      productos: number;
      universo: number;
      porcentaje_productos: number;
      unidades: number;
      porcentaje_unidades: number;
      umbral_unidades?: number;
      texto?: string;
    } | null;
    estado: string;
    nota: string;
  };
  panorama?: Panorama | null;
  composicion?: Composicion | null;
  nota: string;
}

export interface ProductoConUnidades {
  item_id: string;
  dept_id: string;
  cat_id: string;
  unidades: number;
  participacion_pct: number | null;
}

export interface ProductosRespuesta {
  version: string;
  contexto: {
    tiendas: string[];
    departamento: string | null;
    categorias: string[];
    desde: string;
    hasta: string;
  };
  orden: string;
  total: number;
  productos: ProductoConUnidades[];
  universo: { unidades: number; productos: number; productos_catalogo: number };
  seleccion_inicial: { item_id: string; unidades: number; participacion_pct: number | null }[];
  seleccion_inicial_participacion_pct: number | null;
  paginacion: { limite: number; desplazamiento: number; total: number; hay_mas: boolean };
  cobertura: Cobertura | null;
  nota: string;
}

export interface CoberturaModelo {
  series: number;
  series_modelo: number;
  fallback: number;
  cobertura_candidato_pct: number | null;
  cobertura_sistema_pct: number | null;
  motivo_fallback: string | null;
  nota: string | null;
}

export interface ModeloResumen {
  run_id: string;
  variante: string;
  etiqueta: string;
  metodo: string;
  estado: string;
  recomendado: boolean;
  horizonte: number;
  semilla: number | null;
  version_precios: string | null;
  supuestos: Record<string, string>;
  importancias: { variable: string; ganancia: number }[];
  variables: string[];
}

export interface SeriePronosticoCompleta {
  clave: string;
  observado: (number | null)[];
  pronostico: number[];
  baseline: number[];
  metodo: string;
}

export interface PronosticosRespuesta {
  version: string;
  /** Revisión de publicación de la que salen predicción y observado. */
  revision?: string | null;
  politica_precision?: string | null;
  nivel: NivelPronosticoNivel;
  metodo: string;
  unidad: string;
  origen_fecha: string;
  origen_d: number;
  horizonte: number;
  corte: string;
  es_futuro: boolean;
  nota: string;
  dias: { d: number; fecha: string }[];
  historico_dias: number[];
  series: SeriePronosticoCompleta[];
  run_id?: string | null;
  modelo?: ModeloResumen | null;
  baseline_metodo?: string;
  rango_objetivo?: Cobertura | null;
  cobertura?: CoberturaModelo | null;
  supuestos?: Record<string, string>;
  estado_evaluacion?: 'sin_observaciones' | 'con_observaciones';
  metricas?: Metricas | null;
  baseline_metricas?: Metricas | null;
  filtros?: Record<string, unknown>;
}

/** Niveles del pronóstico y de su evaluación. */
export type NivelPronosticoNivel =
  | 'total'
  | 'estado'
  | 'tienda'
  | 'categoria'
  | 'departamento'
  | 'categoria_tienda'
  | 'departamento_tienda'
  | 'producto';

export interface Metricas {
  n: number;
  mae: number | null;
  sesgo: number | null;
  wape: number | null;
  denominador: number;
  denominador_cero?: boolean;
  ventanas_sin_base?: number | null;
  ventanas?: number | null;
  nota?: string | null;
}

export interface PuntoHorizonte {
  horizonte: number;
  candidato: Metricas;
  baseline: Metricas;
  mejora_pct: number | null;
}

export interface SegmentoEvaluacion {
  nivel: string;
  clave: string;
  series: number;
  candidato: Metricas;
  baseline: Metricas;
  mejora_pct: number | null;
  agregado: {
    candidato: Metricas;
    baseline: Metricas;
    mejora_pct: number | null;
  } | null;
}

export interface EvaluacionRespuesta {
  version: string;
  nivel: NivelPronosticoNivel;
  metodo: string;
  unidad: string;
  horizonte: number;
  resumen: Metricas;
  definiciones: Record<string, string>;
  ventanas: {
    nivel: NivelPronosticoNivel;
    origen_d: number;
    origen_fecha: string;
    fin_fecha: string;
    horizonte: number;
    series: number;
    metricas: Metricas;
    baseline?: Metricas | null;
    mejora_pct?: number | null;
  }[];
  calculada_en: string | null;
  limitaciones: string[];
  run_id?: string | null;
  variante?: string | null;
  etapa?: 'desarrollo' | 'final';
  baseline_resumen?: Metricas | null;
  mejora_pct?: number | null;
  por_horizonte?: PuntoHorizonte[];
  segmentos?: SegmentoEvaluacion[];
  mejoras?: {
    segmentos_mejoran: number;
    segmentos_empeoran: number;
    segmentos_sin_mejora_calculable: number;
    nivel: string;
    criterio: string;
  } | null;
  cobertura?: CoberturaModelo | null;
  modelo?: ModeloResumen | null;
  supuestos?: Record<string, string>;
}

export interface EjecucionModelo {
  run_id: string;
  variante: string;
  etiqueta: string;
  metodo: string;
  estado: string;
  recomendado: boolean;
  version_precios: string | null;
  horizonte: number;
  semilla: number | null;
  origenes_entrenamiento: number[];
  ventana_entrenamiento: Record<string, unknown>;
  variables: string[];
  importancias: { variable: string; ganancia: number }[];
  supuestos: Record<string, string>;
  cobertura: Record<string, unknown>;
  metricas_resumen: Record<string, Metricas | null | undefined>;
  duracion_s: number | null;
  memoria: Record<string, number>;
  entorno: Record<string, string>;
  artefacto: string | null;
  creado_en: string | null;
}

export interface ModelosRespuesta {
  version: string;
  version_precios: string | null;
  recomendado: string | null;
  ejecuciones: EjecucionModelo[];
  nota: string;
}

/** Error con estado, para distinguir «pendiente» (503) de un fallo real. */
export class ErrorApi extends Error {
  estado: number;
  detalle: { estado?: string; mensaje?: string; detalle?: string; accion?: string } | null;

  constructor(estado: number, mensaje: string, detalle: ErrorApi['detalle'] = null) {
    super(mensaje);
    this.estado = estado;
    this.detalle = detalle;
  }
}

async function pedir<T>(ruta: string, base: string, senal?: AbortSignal): Promise<T> {
  const respuesta = await fetch(`${base}${ruta}`, { signal: senal, headers: { Accept: 'application/json' } });
  if (!respuesta.ok) {
    let detalle: ErrorApi['detalle'] = null;
    try {
      const cuerpo = (await respuesta.json()) as { detail?: ErrorApi['detalle'] };
      detalle = cuerpo?.detail ?? null;
    } catch {
      detalle = null;
    }
    throw new ErrorApi(
      respuesta.status,
      detalle?.mensaje ?? `La API respondió ${respuesta.status}`,
      detalle,
    );
  }
  return (await respuesta.json()) as T;
}

function consulta(params: Record<string, string | string[] | undefined>): string {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === undefined) continue;
    if (Array.isArray(valor)) {
      for (const item of valor) if (item) busqueda.append(clave, item);
    } else if (valor) {
      busqueda.append(clave, valor);
    }
  }
  const texto = busqueda.toString();
  return texto ? `?${texto}` : '';
}

/* -------------------------------------------------------------------------- */
/* Exploración descriptiva: comparación A/B, estacionalidad, matriz y artículo */
/* -------------------------------------------------------------------------- */

export type DimensionEstacionalidad = 'estado' | 'tienda' | 'categoria';
export type MetricaAB = 'total' | 'promedio_diario';

export interface PeriodoInclusivo {
  desde: string;
  hasta: string;
  dias: number;
}

export interface MetricaFila {
  a: number | null;
  b: number | null;
  diferencia: number | null;
  variacion_pct: number | null;
  motivo: string | null;
}

export interface FilaComparacionTiendaCategoria {
  clave: string;
  store_id: string;
  state_id: string | null;
  cat_id: string;
  etiqueta: string;
  series: number;
  unidades_a: number;
  unidades_b: number;
  dias_validos_a: number;
  dias_esperados_a: number;
  dias_validos_b: number;
  dias_esperados_b: number;
  dias_cero_a: number;
  dias_cero_b: number;
  unidades_periodo: number;
  dias_validos_periodo: number;
  dias_esperados_periodo: number;
  cobertura: 'completa' | 'parcial' | 'sin_datos';
  metricas: Record<MetricaAB, MetricaFila>;
  motivo: string | null;
}

export interface GrupoTiendaAB {
  store_id: string;
  state_id: string | null;
  filas: string[];
}

export interface ConteosContexto {
  tiendas: number;
  estados: number;
  categorias_unicas: number;
  combinaciones_tienda_categoria: number;
  departamentos_unicos: number;
  combinaciones_tienda_departamento: number;
  articulos_unicos: number;
  series_articulo_tienda: number;
  regla: string;
}

export interface ReconciliacionAB {
  filas_a: number;
  contexto_a: number;
  cuadra_a: boolean;
  filas_b: number;
  contexto_b: number;
  cuadra_b: boolean;
  nota: string;
}

export interface ComparacionTiendaCategoriaRespuesta {
  version: string;
  unidad: string;
  metrica_inicial: MetricaAB;
  metricas: MetricaAB[];
  regla_promedio: string;
  periodo: PeriodoInclusivo;
  a: PeriodoInclusivo;
  b: PeriodoInclusivo;
  por_omision: boolean;
  filas: FilaComparacionTiendaCategoria[];
  tiendas: GrupoTiendaAB[];
  conteos: ConteosContexto;
  resumen_filas: {
    tiendas: number;
    categorias: number;
    combinaciones: number;
    filas_con_cobertura_completa: number;
    filas_con_cobertura_parcial: number;
    filas_sin_datos: number;
  };
  reconciliacion: ReconciliacionAB;
  filtros: Record<string, unknown>;
  calculo_ms: number | null;
}

export interface PuntoSemanal {
  dia_semana: number;
  etiqueta: string;
  unidades: number;
  fechas_validas: number;
  promedio: number | null;
  dias_cero: number;
}

export interface GrupoSemanal {
  clave: string;
  etiqueta: string;
  tiendas: string[] | null;
  puntos: PuntoSemanal[];
  total: number;
  fechas_validas: number;
}

export interface SemanalInfo {
  grupos: GrupoSemanal[];
  escala_comun_max: number | null;
  metrica_inicial: string;
  metricas: string[];
  regla: string;
  advertencia: string;
}

/** Un mes con cuatro conteos distintos: del mes, del intervalo, con cobertura y observados. */
export interface MesEstacional {
  mes: number;
  etiqueta: string;
  dias_del_mes: number;
  dias_en_intervalo: number;
  dias_con_cobertura: number;
  dias_observados: number;
  dias_sin_dato: number;
  dias_fuera_intervalo: number;
  unidades: number | null;
  promedio_diario: number | null;
  dias_cero: number | null;
  completo: boolean;
  parcial: boolean;
  motivo: string | null;
}

export interface AnioEstacional {
  anio: number;
  meses: MesEstacional[];
}

export interface MensualInfo {
  anios: AnioEstacional[];
  metrica_inicial: string;
  metricas: string[];
  nota: string;
  cobertura: {
    desde: string;
    hasta: string;
    periodo_desde: string;
    periodo_hasta: string;
  };
}

export interface EstacionalidadRespuesta {
  version: string;
  unidad: string;
  dimension: DimensionEstacionalidad;
  dimensiones: DimensionEstacionalidad[];
  periodo: PeriodoInclusivo;
  dominio: { desde?: string; hasta?: string; nota?: string };
  cobertura_ventas: {
    desde?: string;
    hasta?: string;
    dias_solicitados?: number;
    dias_fuera_de_cobertura?: number;
  };
  semanal: SemanalInfo;
  mensual: MensualInfo;
  filtros: Record<string, unknown>;
  calculo_ms: number | null;
}

export type EstadoDiaMatriz = 'observado' | 'sin_dato' | 'fuera_del_filtro';

export interface DiaMatriz {
  d: number | null;
  fecha: string;
  mes: number;
  estado: EstadoDiaMatriz;
}

export interface MarcaMes {
  mes: number;
  etiqueta: string;
  indice: number;
  dias: number;
}

export interface FilaMatrizTemporal {
  store_id: string;
  state_id: string | null;
  valores: (number | null)[];
  total: number;
  dias_observados: number;
}

export interface MatrizTemporalRespuesta {
  version: string;
  anio: number;
  unidad: string;
  dias: DiaMatriz[];
  meses: MarcaMes[];
  tiendas: FilaMatrizTemporal[];
  escala: { dominio: [number, number]; tipo: string; nota: string };
  cobertura: {
    desde: string;
    hasta: string;
    periodo_desde: string | null;
    periodo_hasta: string | null;
    dias_del_anio: number;
    celdas: number;
    celdas_observadas: number;
    celdas_sin_dato: number;
    celdas_fuera_filtro: number;
    nota: string;
  };
  calculo_ms: number | null;
}

export interface PuntoVentaDiaria {
  d: number;
  fecha: string;
  unidades: number | null;
}

export interface PuntoPrecio {
  wm_yr_wk: number;
  inicio: string | null;
  fin: string | null;
  precio: number;
}

export interface InfoPrecios {
  version_precios: string | null;
  puntos: PuntoPrecio[];
  motivo: string | null;
}

export interface MarcaSnap {
  fecha: string;
  d: number;
}

export interface EventoCalendario {
  fecha: string;
  d: number;
  nombre: string;
  tipo: string | null;
}

export interface CapasCalendario {
  snap: MarcaSnap[];
  eventos: EventoCalendario[];
  estado: string | null;
  nota: string | null;
  motivo: string | null;
}

export interface IntermitenciaSerie {
  dias_validos: number;
  dias_positivos: number;
  dias_cero: number;
  pct_cero: number | null;
  racha_maxima_ceros: number;
  primera_venta_positiva: string | null;
  ultima_venta_positiva: string | null;
  unidades: number;
}

export interface ArticuloRespuesta {
  version: string;
  articulo: {
    item_id: string;
    tienda: string;
    estado: string | null;
    cat_id: string;
    dept_id: string;
    categoria: string;
  };
  periodo: PeriodoInclusivo;
  unidad: string;
  ventas: PuntoVentaDiaria[];
  precios: InfoPrecios;
  capas: CapasCalendario;
  intermitencia: IntermitenciaSerie;
  nota: string;
  filtros: Record<string, unknown>;
}

export interface TramoDistribucion {
  etiqueta: string;
  series: number;
}

export interface ResumenIntermitencia {
  series: number;
  series_con_datos: number;
  series_sin_datos: number;
  series_todas_cero: number;
  pct_cero_mediana: number | null;
  pct_cero_media: number | null;
  distribucion: TramoDistribucion[];
}

export interface FilaIntermitencia {
  item_id: string;
  cat_id: string | null;
  dept_id: string | null;
  store_id: string;
  dias_validos: number;
  dias_positivos: number;
  dias_cero: number;
  pct_cero: number | null;
  racha_maxima_ceros: number;
  unidades: number;
  primera_venta_positiva: string | null;
  ultima_venta_positiva: string | null;
}

export interface IntermitenciaRespuesta {
  version: string;
  tienda: string;
  unidad: string;
  periodo: PeriodoInclusivo;
  resumen: ResumenIntermitencia;
  filas: FilaIntermitencia[];
  paginacion: { pagina: number; tamano: number; total: number; paginas: number; orden: string };
  reglas: string;
  calculo_ms: number | null;
}

export interface CeldaHorizonte {
  horizonte: number;
  fecha: string | null;
  n: number;
  denominador: number;
  mae_candidato: number | null;
  mae_baseline: number | null;
  ventaja: number | null;
  sesgo_candidato: number | null;
  sesgo_baseline: number | null;
  motivo: string | null;
}

export interface FilaOrigenHorizontes {
  origen_d: number;
  origen_fecha: string;
  fin_fecha: string | null;
  etapa: string;
  series: number;
  celdas: CeldaHorizonte[];
}

export interface MatrizDesempenoRespuesta {
  version: string;
  run_id: string;
  variante: string | null;
  horizonte: number;
  etapa: string;
  nivel: string;
  origenes: FilaOrigenHorizontes[];
  escala: { max_abs_ventaja: number; max_abs_sesgo: number; nota: string };
  formulas: Record<string, string>;
  cobertura: CoberturaModelo | null;
  modelo: ModeloResumen | null;
  calculo_ms: number | null;
}

export interface MetricasVentana {
  n: number;
  observaciones: number;
  mae: number | null;
  sesgo: number | null;
  wape_pct: number | null;
  wape_razon: number | null;
  denominador: number;
  wape_no_calculable: boolean;
}

export interface GranoVentana {
  grano: string;
  candidato: MetricasVentana;
  baseline: MetricasVentana;
  diferencia_absoluta: number | null;
  mejora_relativa_pct: number | null;
  motivo: string | null;
}

export interface VentanaEvaluada {
  origen_d: number;
  origen_fecha: string;
  fin_fecha: string;
  etapa: string;
  series: number;
  dias: number;
  detalle: GranoVentana;
  agregado: GranoVentana;
  cobertura: Record<string, unknown>;
  fallback: number;
}

export interface SegmentoVentana {
  nivel: string;
  clave: string;
  series: number;
  detalle: GranoVentana;
  agregado: GranoVentana;
}

/** Fila de la auditoría de separación temporal (evidencia por ejecución y corte). */
export interface FilaAuditoriaTemporal {
  version?: string | null;
  run_id: string;
  variante: string;
  etapa: string;
  artefacto: string | null;
  origenes_entrenamiento: number[];
  horizonte: number;
  corte: number;
  fecha_corte: string | null;
  inicio_horizonte: string | null;
  fin_horizonte: string | null;
  ultima_etiqueta_entrenamiento: number | null;
  fecha_ultima_etiqueta: string | null;
  dias_entre_etiqueta_y_corte: number | null;
  entrenado: boolean;
  resultado: 'separacion_verificada' | 'contaminada' | 'no_verificable' | string;
  detalle: string;
  uso_del_corte: string;
  early_stopping: string;
  seleccion_de_hiperparametros: string;
  transformaciones: string;
  fuentes: Record<string, string>;
  series_evaluadas: number;
}

export interface AuditoriaTemporalRespuesta {
  version: string;
  esquema: string;
  generado_en: string;
  disponible: boolean;
  resumen: Record<string, number>;
  procedencia_metricas_desarrollo: {
    manifiesto_publicado: string;
    wape_desarrollo: number | null;
    ejecucion_de_desarrollo: string;
    nota: string;
  } | null;
  filas: FilaAuditoriaTemporal[];
  nota?: string | null;
  motivo?: string | null;
}

export interface VentanasEvaluacionRespuesta {
  version: string;
  revision?: string | null;
  politica_precision?: string | null;
  run_id: string;
  variante: string | null;
  etapa: string;
  horizonte: number;
  granos: string[];
  formulas: Record<string, string>;
  advertencias: string[];
  ventanas: VentanaEvaluada[];
  /** Orígenes con predicciones por día publicadas: los que la gráfica puede dibujar. */
  origenes_graficables?: number[];
  consolidado: {
    detalle?: Record<string, unknown>;
    agregado?: Record<string, unknown>;
    ventanas?: number;
    nota?: string;
  };
  por_estado: SegmentoVentana[];
  por_categoria: SegmentoVentana[];
  reconciliacion: {
    cuadra?: boolean | null;
    origen_d?: number;
    series?: number;
    max_diferencia_absoluta?: number;
    motivo?: string;
    nota?: string;
  };
  cobertura_modelo: CoberturaModelo | null;
  modelo: ModeloResumen | null;
  calculo_ms: number | null;
}

export interface CajaPrecio {
  categoria: string;
  etiqueta: string;
  n: number;
  min: number | null;
  q1: number | null;
  mediana: number | null;
  q3: number | null;
  max: number | null;
}

export interface ValorPrecio {
  item_id: string;
  cat_id: string | null;
  dept_id: string | null;
  precio_medio: number;
  semanas_con_precio: number;
  dias_cubiertos: number;
}

export interface DistribucionPreciosRespuesta {
  unidad: string;
  tienda: string;
  periodo: { desde: string; hasta: string; dias: number };
  regla_ponderacion: string;
  combinaciones_incluidas: number;
  articulos: number;
  cobertura: {
    completa: number;
    parcial: number;
    sin_precio: number;
    pct_completa: number | null;
    pct_con_algun_precio: number | null;
    dias_del_intervalo: number;
    dias_cubiertos_total: number;
    dias_posibles_total: number;
    pct_dias_cubiertos: number | null;
    dias_cubiertos_mediana: number;
    nota: string;
  };
  sin_precio: {
    combinaciones?: number;
    con_precio_fuera_del_intervalo?: number;
    sin_precio_en_toda_la_tienda?: number;
    semanas_totales_tienda?: number;
    ultima_semana_con_precio_fuera?: number | null;
    nota?: string;
  };
  cuartiles: {
    min: number;
    q1: number;
    mediana: number;
    q3: number;
    max: number;
  } | null;
  media: number | null;
  cajas: CajaPrecio[];
  valores: ValorPrecio[];
  motivo?: string | null;
}

export interface TotalesCambiosPrecio {
  transiciones: number;
  aumentos: number;
  disminuciones: number;
  sin_cambio: number;
  pct_aumentos_entre_cambios: number | null;
  motivo_pct: string | null;
  pct_sin_cambio: number | null;
}

export interface SerieCambiosPrecio {
  item_id: string;
  cat_id?: string | null;
  aumentos: number;
  disminuciones: number;
  sin_cambio: number;
  transiciones: number;
  semanas_con_precio: number;
  primera_semana: number | null;
  ultima_semana: number | null;
}

export interface UmbralPrecio {
  valor_usd: number;
  tipo: string;
  precision: string;
  nota: string;
}

export interface CambiosPreciosRespuesta {
  unidad: string;
  tienda: string;
  periodo: { desde: string; hasta: string; dias: number };
  umbral: UmbralPrecio;
  semanas: number;
  semanas_del_intervalo: number;
  precision_comparacion: string;
  series_con_precio: number;
  totales: TotalesCambiosPrecio;
  por_categoria: {
    cat_id: string;
    etiqueta: string;
    transiciones: number;
    aumentos: number;
    disminuciones: number;
    sin_cambio: number;
    pct_aumentos_entre_cambios: number | null;
  }[];
  series: SerieCambiosPrecio[];
  nota: string;
}

export interface EvolucionPrecioRespuesta {
  unidad: string;
  tienda: string;
  item_id: string;
  periodo: { desde: string; hasta: string; dias: number };
  puntos: PuntoPrecio[];
  semanas_con_precio: number;
  semanas_sin_precio: number;
  cambios: { aumentos: number; disminuciones: number; sin_cambio: number; transiciones: number };
  umbral: UmbralPrecio;
  motivo: string | null;
}


/* -------------------------------------------------------------------------- */
/* Planificación de ventas a cuatro semanas y evaluación al horizonte          */
/* -------------------------------------------------------------------------- */

export interface FilaPlan {
  item_id: string;
  store_id: string;
  cat_id: string | null;
  dept_id: string | null;
  observado_28: number;
  pronostico_28: number;
  baseline_28: number;
  diferencia: number;
  variacion_pct: number | null;
  semanas: number[];
  semanas_baseline: number[];
  semanas_observado: number[];
  suma_semanas: number;
  evaluacion: {
    estado: string;
    cortes: number;
    mejoran: number;
    empeoran: number;
    empatan: number;
  };
}

export interface PlanificacionRespuesta {
  version: string;
  run_id: string;
  /** Revisión publicada de la que salen las cifras (trazabilidad y reversión). */
  revision?: string | null;
  revision_politica?: string | null;
  revision_anterior?: string | null;
  politica_precision?: string | null;
  /** Tiendas presentes en el resultado completo del filtro compartido. */
  tiendas_contexto?: string[];
  unidad: string;
  origen_fecha: string | null;
  horizonte_inicio: string | null;
  horizonte_fin: string | null;
  observado_desde: string | null;
  observado_hasta: string | null;
  orden: string;
  orden_aplicado: { campo: string; sentido: string }[];
  desempate: string;
  filtros: Record<string, unknown>;
  pagina: number;
  tamano: number;
  total: number;
  paginas: number;
  filas_ordenables: number;
  excluidas_por_orden: number;
  semanas: string[];
  semanas_fechas: { etiqueta: string; desde: string | null; hasta: string | null }[];
  resumen: {
    series: number;
    pronostico_28: number;
    observado_28: number;
    baseline_28: number;
    diferencia: number;
    variacion_pct: number | null;
    series_con_evaluacion: number;
    series_sin_base: number;
  };
  filas: FilaPlan[];
  nota: string;
}

export interface DetallePlanRespuesta {
  version: string;
  run_id: string;
  revision?: string | null;
  unidad: string;
  origen_fecha: string;
  horizonte_inicio: string;
  horizonte_fin: string;
  observado_desde: string;
  observado_hasta: string;
  serie: { item_id: string; store_id: string; cat_id: string | null; dept_id: string | null };
  fila: FilaPlan;
  historico: { d: number; fecha: string; unidades: number }[];
  pronostico_diario: {
    d: number;
    fecha: string;
    pronostico: number | null;
    baseline: number | null;
    semana: number;
  }[];
  semanas: {
    etiqueta: string;
    pronostico: number;
    baseline: number;
    observado_previo: number;
    desde: string;
    hasta: string;
  }[];
  evaluacion_horizonte: {
    origen_d: number;
    origen_fecha: string;
    fin_fecha: string;
    observado_28: number;
    pronostico_28: number;
    error_28: number;
    error_absoluto_28: number;
    baseline_28: number;
    baseline_error_28: number;
    mejor_que_baseline: boolean;
  }[];
  evaluacion_resumen: FilaPlan["evaluacion"];
  nota: string;
}

/** Grupo del informe de evaluación a 28 días: horizonte medido por serie y corte. */
export interface GrupoEvaluacion28 {
  clave: string;
  series: number;
  registros?: number;
  cortes?: number;
  /** MAE del total de 28 días por serie (unidades por serie-horizonte). */
  mae_28: number | null;
  mae_28_baseline?: number | null;
  wape_28: number | null;
  wape_28_baseline?: number | null;
  sesgo_28?: number | null;
  mejora_wape_pct: number | null;
  no_calculable?: boolean;
}

export interface EvaluacionHorizonteRespuesta {
  version: string;
  run_id: string;
  revision?: string | null;
  unidad: string;
  disponible: boolean;
  motivo?: string | null;
  granos?: Record<string, string> | null;
  cortes: {
    origen_d: number;
    origen_fecha: string;
    fin_fecha: string;
    series: number;
    registros: number;
    cortes: number;
    mae_28: number | null;
    wape_28: number | null;
    sesgo_28: number | null;
    denominador: number;
    mae_28_baseline: number | null;
    wape_28_baseline: number | null;
    mejora_wape_pct: number | null;
    no_calculable: boolean;
  }[];
  consolidado: Record<string, number | null> | null;
  por_estado: GrupoEvaluacion28[];
  por_categoria: GrupoEvaluacion28[];
  por_departamento: GrupoEvaluacion28[];
  por_volumen: GrupoEvaluacion28[];
  por_intermitencia: GrupoEvaluacion28[];
  sesgo: { sobreestima: number; subestima: number; exactos: number } | null;
  estados: { clave: string; etiqueta: string; series: number }[];
  cobertura: {
    series_universo: number;
    series_evaluadas: number;
    pct_evaluadas: number | null;
    registros_usados: number;
  };
  nota?: string | null;
}

export type OrdenPlan =
  | 'volumen_previsto'
  | 'volumen_observado'
  | 'aumento_absoluto'
  | 'disminucion_absoluta'
  | 'aumento_porcentual'
  | 'disminucion_porcentual';

export const ORDENES_PLAN: { valor: OrdenPlan; texto: string }[] = [
  { valor: 'volumen_previsto', texto: 'Mayor volumen previsto' },
  { valor: 'aumento_absoluto', texto: 'Mayor aumento absoluto' },
  { valor: 'disminucion_absoluta', texto: 'Mayor disminución absoluta' },
  { valor: 'aumento_porcentual', texto: 'Mayor aumento porcentual' },
  { valor: 'disminucion_porcentual', texto: 'Mayor disminución porcentual' },
  { valor: 'volumen_observado', texto: 'Mayor volumen observado' },
];

export const api = {
  estado: (base: string, senal?: AbortSignal) => pedir<EstadoRespuesta>('/estado', base, senal),
  catalogo: (base: string, senal?: AbortSignal) => pedir<CatalogoRespuesta>('/catalogo?limite=1', base, senal),
  pulso: (
    base: string,
    params: {
      desde?: string;
      hasta?: string;
      agregacion: Agregacion;
      tiendas: string[];
      categorias: string[];
      nivel?: NivelExploracion;
      tienda?: string | null;
      estado?: string | null;
      departamento?: string | null;
      productos?: string[];
      a?: { desde: string; hasta: string };
      b?: { desde: string; hasta: string };
    },
    senal?: AbortSignal,
  ) =>
    pedir<PulsoRespuesta>(
      `/pulso${consulta({
        desde: params.desde,
        hasta: params.hasta,
        agregacion: params.agregacion,
        tiendas: params.tiendas,
        categorias: params.categorias,
        nivel: params.nivel && params.nivel !== 'tienda' ? params.nivel : undefined,
        tienda: params.tienda ?? undefined,
        estado: params.estado ?? undefined,
        departamento: params.departamento ?? undefined,
        productos: params.productos,
        a_desde: params.a?.desde,
        a_hasta: params.a?.hasta,
        b_desde: params.b?.desde,
        b_hasta: params.b?.hasta,
      })}`,
      base,
      senal,
    ),
  historico: (
    base: string,
    params: {
      anio: number;
      modo: ModoHistorico;
      tiendas: string[];
      categorias: string[];
      departamentos: string[];
      estado?: string | null;
    },
    senal?: AbortSignal,
  ) =>
    pedir<HistoricoRespuesta>(
      `/historico${consulta({
        anio: String(params.anio),
        modo: params.modo,
        tiendas: params.tiendas,
        categorias: params.categorias,
        departamentos: params.departamentos,
        estado: params.estado ?? undefined,
      })}`,
      base,
      senal,
    ),
  productos: (
    base: string,
    params: {
      tienda?: string | null;
      estado?: string | null;
      tiendas?: string[];
      departamento?: string | null;
      categorias: string[];
      desde?: string;
      hasta?: string;
      texto?: string;
      orden?: 'unidades' | 'item_id';
      limite?: number;
      desplazamiento?: number;
    },
    senal?: AbortSignal,
  ) =>
    pedir<ProductosRespuesta>(
      `/productos${consulta({
        tienda: params.tienda ?? undefined,
        estado: params.estado ?? undefined,
        tiendas: params.tiendas,
        departamento: params.departamento ?? undefined,
        categorias: params.categorias,
        desde: params.desde,
        hasta: params.hasta,
        texto: params.texto,
        orden: params.orden ?? 'unidades',
        limite: params.limite !== undefined ? String(params.limite) : undefined,
        desplazamiento: params.desplazamiento !== undefined ? String(params.desplazamiento) : undefined,
      })}`,
      base,
      senal,
    ),
  pronosticos: (
    base: string,
    params: {
      nivel: NivelPronosticoNivel;
      dias_historico?: number;
      run_id?: string | null;
      origen?: string | null;
      tienda?: string | null;
      estado?: string | null;
      categoria?: string | null;
      departamento?: string | null;
      items?: string[];
    },
    senal?: AbortSignal,
  ) =>
    pedir<PronosticosRespuesta>(
      `/pronosticos${consulta({
        nivel: params.nivel,
        dias_historico: params.dias_historico !== undefined ? String(params.dias_historico) : undefined,
        run_id: params.run_id ?? undefined,
        origen: params.origen ?? undefined,
        tienda: params.tienda ?? undefined,
        estado: params.estado ?? undefined,
        categoria: params.categoria ?? undefined,
        departamento: params.departamento ?? undefined,
        items: params.items,
      })}`,
      base,
      senal,
    ),
  evaluacion: (
    base: string,
    params: {
      nivel: NivelPronosticoNivel;
      etapa?: 'desarrollo' | 'final';
      run_id?: string | null;
      clave?: string | null;
    },
    senal?: AbortSignal,
  ) =>
    pedir<EvaluacionRespuesta>(
      `/evaluacion${consulta({
        nivel: params.nivel,
        etapa: params.etapa,
        run_id: params.run_id ?? undefined,
        clave: params.clave ?? undefined,
      })}`,
      base,
      senal,
    ),
  modelos: (base: string, senal?: AbortSignal) =>
    pedir<ModelosRespuesta>('/modelos', base, senal),

  /* -- exploración descriptiva ------------------------------------------- */
  comparacion: (
    base: string,
    params: {
      desde?: string | null;
      hasta?: string | null;
      a_desde?: string | null;
      a_hasta?: string | null;
      b_desde?: string | null;
      b_hasta?: string | null;
      tiendas?: string[];
      estado?: string | null;
      tienda?: string | null;
      categorias?: string[];
      departamentos?: string[];
      productos?: string[];
    },
    senal?: AbortSignal,
  ) =>
    pedir<ComparacionTiendaCategoriaRespuesta>(
      `/comparacion${consulta({
        desde: params.desde ?? undefined,
        hasta: params.hasta ?? undefined,
        a_desde: params.a_desde ?? undefined,
        a_hasta: params.a_hasta ?? undefined,
        b_desde: params.b_desde ?? undefined,
        b_hasta: params.b_hasta ?? undefined,
        tiendas: params.tiendas ?? undefined,
        estado: params.estado ?? undefined,
        tienda: params.tienda ?? undefined,
        categorias: params.categorias ?? undefined,
        departamentos: params.departamentos ?? undefined,
        productos: params.productos ?? undefined,
      })}`,
      base,
      senal,
    ),

  estacionalidad: (
    base: string,
    params: {
      dimension: DimensionEstacionalidad;
      desde?: string | null;
      hasta?: string | null;
      tiendas?: string[];
      estado?: string | null;
      tienda?: string | null;
      categorias?: string[];
      departamentos?: string[];
    },
    senal?: AbortSignal,
  ) =>
    pedir<EstacionalidadRespuesta>(
      `/estacionalidad${consulta({
        dimension: params.dimension,
        desde: params.desde ?? undefined,
        hasta: params.hasta ?? undefined,
        tiendas: params.tiendas ?? undefined,
        estado: params.estado ?? undefined,
        tienda: params.tienda ?? undefined,
        categorias: params.categorias ?? undefined,
        departamentos: params.departamentos ?? undefined,
      })}`,
      base,
      senal,
    ),

  matrizTemporal: (
    base: string,
    params: {
      anio: number;
      desde?: string | null;
      hasta?: string | null;
      tiendas?: string[];
      estado?: string | null;
      tienda?: string | null;
      categorias?: string[];
      departamentos?: string[];
    },
    senal?: AbortSignal,
  ) =>
    pedir<MatrizTemporalRespuesta>(
      `/matriz-temporal${consulta({
        anio: String(params.anio),
        desde: params.desde ?? undefined,
        hasta: params.hasta ?? undefined,
        tiendas: params.tiendas ?? undefined,
        estado: params.estado ?? undefined,
        tienda: params.tienda ?? undefined,
        categorias: params.categorias ?? undefined,
        departamentos: params.departamentos ?? undefined,
      })}`,
      base,
      senal,
    ),

  articulo: (
    base: string,
    params: {
      item: string;
      tienda: string;
      desde?: string | null;
      hasta?: string | null;
      categorias?: string[];
      departamentos?: string[];
    },
    senal?: AbortSignal,
  ) =>
    pedir<ArticuloRespuesta>(
      `/articulo${consulta({
        item: params.item,
        tienda: params.tienda,
        desde: params.desde ?? undefined,
        hasta: params.hasta ?? undefined,
        categorias: params.categorias ?? undefined,
        departamentos: params.departamentos ?? undefined,
      })}`,
      base,
      senal,
    ),

  intermitencia: (
    base: string,
    params: {
      tienda: string;
      desde?: string | null;
      hasta?: string | null;
      categorias?: string[];
      departamentos?: string[];
      pagina?: number;
      tamano?: number;
      orden?: 'ceros' | 'unidades' | 'racha';
    },
    senal?: AbortSignal,
  ) =>
    pedir<IntermitenciaRespuesta>(
      `/intermitencia${consulta({
        tienda: params.tienda,
        desde: params.desde ?? undefined,
        hasta: params.hasta ?? undefined,
        categorias: params.categorias ?? undefined,
        departamentos: params.departamentos ?? undefined,
        pagina: params.pagina !== undefined ? String(params.pagina) : undefined,
        tamano: params.tamano !== undefined ? String(params.tamano) : undefined,
        orden: params.orden,
      })}`,
      base,
      senal,
    ),

  evaluacionVentanas: (
    base: string,
    params: { etapa?: string; run_id?: string | null },
    senal?: AbortSignal,
  ) =>
    pedir<VentanasEvaluacionRespuesta>(
      `/evaluacion-ventanas${consulta({
        etapa: params.etapa,
        run_id: params.run_id ?? undefined,
      })}`,
      base,
      senal,
    ),

  auditoriaTemporal: (base: string, senal?: AbortSignal) =>
    pedir<AuditoriaTemporalRespuesta>(`/auditoria-temporal`, base, senal),

  matrizHorizontes: (
    base: string,
    params: { nivel?: string; etapa?: string; run_id?: string | null },
    senal?: AbortSignal,
  ) =>
    pedir<MatrizDesempenoRespuesta>(
      `/matriz-horizontes${consulta({
        nivel: params.nivel,
        etapa: params.etapa,
        run_id: params.run_id ?? undefined,
      })}`,
      base,
      senal,
    ),

  preciosDistribucion: (
    base: string,
    params: {
      tienda: string;
      desde?: string | null;
      hasta?: string | null;
      categorias?: string[];
      departamentos?: string[];
      items?: string[];
    },
    senal?: AbortSignal,
  ) =>
    pedir<DistribucionPreciosRespuesta>(
      `/precios/distribucion${consulta({
        tienda: params.tienda,
        desde: params.desde ?? undefined,
        hasta: params.hasta ?? undefined,
        categorias: params.categorias ?? undefined,
        departamentos: params.departamentos ?? undefined,
        items: params.items ?? undefined,
      })}`,
      base,
      senal,
    ),

  preciosCambios: (
    base: string,
    params: {
      tienda: string;
      desde?: string | null;
      hasta?: string | null;
      categorias?: string[];
      departamentos?: string[];
    },
    senal?: AbortSignal,
  ) =>
    pedir<CambiosPreciosRespuesta>(
      `/precios/cambios${consulta({
        tienda: params.tienda,
        desde: params.desde ?? undefined,
        hasta: params.hasta ?? undefined,
        categorias: params.categorias ?? undefined,
        departamentos: params.departamentos ?? undefined,
      })}`,
      base,
      senal,
    ),

  preciosEvolucion: (
    base: string,
    params: { tienda: string; item: string; desde?: string | null; hasta?: string | null },
    senal?: AbortSignal,
  ) =>
    pedir<EvolucionPrecioRespuesta>(
      `/precios/evolucion${consulta({
        tienda: params.tienda,
        item: params.item,
        desde: params.desde ?? undefined,
        hasta: params.hasta ?? undefined,
      })}`,
      base,
      senal,
    ),

  /* -- planificación de ventas -------------------------------------------- */
  planificacion: (
    base: string,
    params: {
      tiendas?: string[];
      categorias?: string[];
      departamentos?: string[];
      texto?: string | null;
      orden?: OrdenPlan;
      minimo_observado?: number | null;
      pagina?: number;
      tamano?: number;
      run_id?: string | null;
    },
    senal?: AbortSignal,
  ) =>
    pedir<PlanificacionRespuesta>(
      `/planificacion${consulta({
        tiendas: params.tiendas,
        categorias: params.categorias,
        departamentos: params.departamentos,
        texto: params.texto ?? undefined,
        orden: params.orden,
        minimo_observado:
          params.minimo_observado === null || params.minimo_observado === undefined
            ? undefined
            : String(params.minimo_observado),
        pagina: params.pagina !== undefined ? String(params.pagina) : undefined,
        tamano: params.tamano !== undefined ? String(params.tamano) : undefined,
        run_id: params.run_id ?? undefined,
      })}`,
      base,
      senal,
    ),

  detallePlan: (
    base: string,
    params: { tienda: string; item: string; run_id?: string | null },
    senal?: AbortSignal,
  ) =>
    pedir<DetallePlanRespuesta>(
      `/planificacion/serie${consulta({
        tienda: params.tienda,
        item: params.item,
        run_id: params.run_id ?? undefined,
      })}`,
      base,
      senal,
    ),

  exportarPlan: (
    base: string,
    params: {
      tiendas?: string[];
      categorias?: string[];
      departamentos?: string[];
      texto?: string | null;
      orden?: OrdenPlan;
      minimo_observado?: number | null;
      run_id?: string | null;
    },
    senal?: AbortSignal,
  ) =>
    pedir<{
      version: string;
      run_id: string;
      revision?: string | null;
      revision_politica?: string | null;
      politica_precision?: string | null;
      unidad: string;
      orden: string;
      semanas: string[];
      total: number;
      incluidas: number;
      recortado: boolean;
      resumen: PlanificacionRespuesta['resumen'];
      filas: FilaPlan[];
      nota: string;
    }>(
      `/planificacion/exportar${consulta({
        tiendas: params.tiendas,
        categorias: params.categorias,
        departamentos: params.departamentos,
        texto: params.texto ?? undefined,
        orden: params.orden,
        minimo_observado:
          params.minimo_observado === null || params.minimo_observado === undefined
            ? undefined
            : String(params.minimo_observado),
        run_id: params.run_id ?? undefined,
      })}`,
      base,
      senal,
    ),

  evaluacionHorizonte: (
    base: string,
    params: { tienda?: string | null; categoria?: string | null; departamento?: string | null; run_id?: string | null },
    senal?: AbortSignal,
  ) =>
    pedir<EvaluacionHorizonteRespuesta>(
      `/evaluacion-horizonte${consulta({
        tienda: params.tienda ?? undefined,
        categoria: params.categoria ?? undefined,
        departamento: params.departamento ?? undefined,
        run_id: params.run_id ?? undefined,
      })}`,
      base,
      senal,
    ),
};

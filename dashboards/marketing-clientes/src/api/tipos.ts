/** Tipos de la API de «Marketing y clientes» (los campos que devuelve FastAPI). */

export interface Fuente {
  conjunto: string;
  documentacion: string;
  esquema: string;
  licencia: string;
  condicion: string;
  periodo_documentado: { desde: string | null; hasta: string | null };
  origen?: string | null;
  publicado_en?: string | null;
}

export interface AccesoBigQuery {
  disponible: boolean;
  via?: string | null;
  motivo: string;
  detalle?: Record<string, unknown>;
  remedio: string[];
}

export interface IndicadorValor {
  valor: number | null;
  base: string;
  moneda?: string;
  numerador?: number;
  denominador?: number;
  unidad?: string;
}

export interface MuestraDatos {
  semilla: string | null;
  porcentaje: number;
  unidad?: string;
  usuarios?: number | null;
}

/** Población, muestra publicada y método de selección que declara la API. */
export interface CoberturaMuestra {
  poblacion_original: {
    usuarios: number;
    filas_usuario_dia: number;
    periodo: { desde: string; hasta: string };
    origen: string;
    nota: string;
  };
  muestra_publicada: {
    usuarios: number | null;
    porcentaje_declarado: number;
    porcentaje_efectivo: number | null;
    unidad: string;
    semilla: string | null;
  };
  metodo: {
    seleccion: string;
    predicado: string | null;
    reproducible: boolean;
    explicacion: string;
  };
  alcance: {
    cifras_describen: string;
    no_extrapolable: boolean;
    verificacion: string;
  };
}

/** Cada indicador frente al total que suman las gráficas del mismo rango. */
export interface ConsistenciaCifra {
  clave: string;
  etiqueta: string;
  indicador: number;
  grafica: string;
  grafica_total: number;
  diferencia: number;
  cuadra: boolean;
}

export interface Estado {
  datos_disponibles: boolean;
  version: string | null;
  ultima_sincronizacion: string | null;
  periodo: { desde: string | null; hasta: string | null };
  muestra?: MuestraDatos;
  cobertura_muestra?: CoberturaMuestra;
  cifras: Record<string, unknown> | null;
  capacidades: Record<string, boolean> | null;
  motivo: string;
  fuente: Fuente;
  acceso_bigquery: AccesoBigQuery;
  ultimo_intento: { version: string; estado: string; creado_en: string } | null;
  validacion?: { errores?: string[]; avisos?: string[] } | null;
  esquema?: { columnas_detectadas?: number; columnas?: Record<string, string> } | null;
}

export interface FiltroActivo {
  clave: string;
  etiqueta: string;
  valores: (string | number)[];
  quitar: Record<string, unknown>;
}

export interface Catalogo {
  datos_disponibles: boolean;
  version: string | null;
  motivo?: string;
  fuente: Fuente;
  acceso_bigquery?: AccesoBigQuery;
  periodo: { desde: string | null; hasta: string | null; consulta_desde?: string | null; consulta_hasta?: string | null };
  filtros: {
    canales: string[];
    dispositivos: string[];
    paises: string[];
    periodo: { desde: string | null; hasta: string | null };
    dimensiones_cohorte?: { valor: string; etiqueta: string }[];
  };
  capacidades: Record<string, boolean>;
  dias_observados: number;
  definiciones: Record<string, string>;
  avisos: string[];
  validacion?: { errores?: string[]; avisos?: string[] };
  esquema?: { columnas_detectadas?: number; columnas?: Record<string, string> };
}

export interface FilaSerie {
  fecha: string;
  eventos: number;
  sesiones: number;
  compras: number;
  ingresos_usd: number;
  usuarios: number;
  compradores: number;
  conversion: number | null;
}

export interface Comparacion {
  valida: boolean;
  motivo?: string;
  desde?: string;
  hasta?: string;
  indicadores?: Record<string, number | null>;
  variacion?: Record<string, number | null>;
}

export interface FilaMapa {
  canal: string;
  usuarios: number;
  compradores: number;
  compras: number;
  ingresos_usd: number;
  conversion: number | null;
  /** Base menor a 100 usuarios: se marca, no se oculta. */
  base_reducida: boolean;
}

export interface NodoSankey {
  id: string;
  etiqueta: string;
  /** 0 = fuente/medio, 1 = dispositivo, 2 = resultado de la sesión. */
  columna: 0 | 1 | 2;
  sesiones: number;
}

export interface EnlaceSankey {
  origen: string;
  destino: string;
  columna: 0 | 1;
  sesiones: number;
  pct_origen: number | null;
  pct_total: number | null;
}

export interface Sankey {
  nodos: NodoSankey[];
  enlaces: EnlaceSankey[];
  total_sesiones: number;
  sesiones_con_compra: number;
  sesiones_sin_compra: number;
  sesiones_dispositivo_distinto: number;
  conciliacion: {
    unidad: string;
    salida_fuentes: number;
    salida_dispositivos: number;
    cuadra: boolean;
    regla_dispositivo: string;
  };
  definicion: string;
}

export interface FilaLollipop {
  canal: string;
  usuarios: number;
  compradores: number;
  compras: number;
  ingresos_usd: number;
  conversion: number | null;
  base_reducida: boolean;
}

export interface ConversionFuente {
  filas: FilaLollipop[];
  referencia_global: {
    valor: number | null;
    compradores: number;
    usuarios: number;
    denominador: string;
  };
  umbral_base_reducida: number;
  definicion: string;
}

export interface Resumen {
  datos_disponibles: boolean;
  version: string | null;
  motivo?: string;
  indicadores: Record<string, IndicadorValor> | null;
  serie: FilaSerie[];
  sankey?: Sankey;
  conversion_fuente?: ConversionFuente;
  conversion_global?: {
    valor: number | null;
    numerador: number;
    denominador: number;
    unidad: string;
  };
  comparacion: Comparacion | null;
  cobertura?: {
    eventos_sin_sesion: number;
    compras_sin_importe: number;
    dias_con_datos: number;
    eventos_en_tabla: number;
    eventos_registrados: number;
    consistencia?: ConsistenciaCifra[];
    muestra?: { usuarios: number; unidad: string; describen: string };
  };
  periodo?: { desde: string | null; hasta: string | null; documentado: { desde: string | null; hasta: string | null } };
  filtros_activos?: FiltroActivo[];
  avisos?: string[];
  fuente?: Fuente;
  acceso_bigquery?: AccesoBigQuery;
}

export interface FilaCanal {
  canal: string;
  eventos: number;
  sesiones: number;
  compras: number;
  ingresos_usd: number;
  usuarios: number;
  compradores: number;
  conversion: number | null;
  porcentaje_usuarios: number | null;
  ingreso_por_comprador_usd: number | null;
}

export interface Adquisicion {
  datos_disponibles: boolean;
  version: string | null;
  motivo?: string;
  semantica?: { tipo: string; etiqueta: string; explicacion: string; nota: string };
  canales: FilaCanal[];
  totales?: Record<string, number | null> | null;
  detalle?: {
    serie: { fecha: string; sesiones: number; eventos: number }[];
    dispositivos: { dispositivo: string; usuarios: number }[];
    paises: { pais: string; usuarios: number }[];
  } | null;
  categorias?: {
    categoria: string;
    compras: number;
    articulos: number;
    unidades: number;
    ingresos_linea_usd: number;
  }[];
  categorias_disponibles?: boolean;
  filtros_activos?: FiltroActivo[];
  avisos?: string[];
}

export interface Transicion {
  paso: number;
  base: number;
  tramos: { tramo: string; horas: number | null; sesiones: number }[];
}

export interface Producto {
  articulo: string;
  categoria: string;
  compras: number;
  unidades: number;
  ingresos_linea_usd: number;
}

export interface CategoriaProducto {
  categoria: string;
  compras: number;
  articulos: number;
  unidades: number;
  ingresos_linea_usd: number;
}

export interface Productos {
  datos_disponibles: boolean;
  version: string | null;
  motivo?: string;
  articulos: Producto[];
  categorias: CategoriaProducto[];
  afinidad?: AfinidadCategorias | null;
  conciliacion?: {
    compras_totales: number;
    suma_compras_por_categoria: number;
    solapamiento: number;
    explicacion: string;
  };
  definiciones?: Record<string, string>;
  avisos?: string[];
}

export interface PasoEmbudo {
  paso: number;
  etiqueta: string;
  sesiones: number;
  /** Sesiones que registraron el evento del paso, sin exigir el orden. */
  sesiones_evento?: number;
  /** Eventos de ese tipo observados en el rango filtrado. */
  eventos?: number;
  porcentaje_del_inicio: number | null;
  porcentaje_del_paso_anterior: number | null;
  diferencia_con_el_paso_anterior: number | null;
  porcentaje_sesiones_con_evento?: number | null;
  eventos_por_sesion_con_evento?: number | null;
}

export interface Conversion {
  datos_disponibles: boolean;
  version: string | null;
  motivo?: string;
  unidad?: string;
  ventana_horas?: number;
  criterio?: string;
  advertencia?: string;
  pasos: PasoEmbudo[];
  por_canal?: {
    canal: string;
    pasos: number[];
    sesiones_inicio: number;
    sesiones_compra: number;
    conversion_sesion: number | null;
  }[];
  por_dispositivo?: { valor: string; pasos: number[] }[];
  transiciones?: Transicion[];
  perfil?: PerfilConversion;
  friccion?: Friccion;
  compras_totales?: number;
  nota_compras?: string;
  filtros_activos?: FiltroActivo[];
  avisos?: string[];
}

export interface CeldaCohorte {
  cohorte: string;
  indice: number;
  usuarios: number;
  compradores: number;
  retencion: number | null;
  recompra: number | null;
  ventana: 'completa' | 'incompleta' | 'sin_ventana';
}

export interface PuntoCurva {
  indice: number;
  base: number;
  usuarios: number;
  compradores: number;
  retencion: number | null;
  compra: number | null;
}

export interface CurvaRetencion {
  valor: string;
  puntos: PuntoCurva[];
  /** Usuarios elegibles en S0 (base de la semana 0). */
  base_s0?: number;
  /** Usuarios elegibles en S1: denominador de esa semana. */
  base_s1?: number;
  base_reducida?: boolean;
}

export interface PuntoCohorte {
  cohorte: string;
  base: number;
  volvieron: number;
  compraron: number;
  retorno: number | null;
  compra: number | null;
  ventana: 'completa' | 'incompleta' | 'sin_ventana';
}

export interface Cohortes {
  datos_disponibles: boolean;
  version: string | null;
  motivo?: string;
  dimension?: string;
  etiqueta_dimension?: string;
  unidad?: string;
  granularidad?: string;
  definicion?: string;
  cohortes: { cohorte: string; usuarios: number; semana_iso: string }[];
  semanas: number[];
  celdas: CeldaCohorte[];
  curvas?: CurvaRetencion[];
  umbral_base_reducida?: number;
  criterio_seleccion?: string;
  puntos?: PuntoCohorte[];
  valores_disponibles?: string[];
  ultimo_dia_observado?: string | null;
  filtros_activos?: FiltroActivo[];
  avisos?: string[];
}

export interface FilaTabla {
  fecha: string | null;
  hora: number | null;
  evento: string | null;
  evento_etiqueta: string | null;
  dispositivo: string | null;
  pais: string | null;
  canal: string | null;
  fuente: string | null;
  medio: string | null;
  articulo: string | null;
  categoria: string | null;
  ingresos_usd: number;
}

export interface Tabla {
  datos_disponibles: boolean;
  version: string | null;
  motivo?: string;
  filas: FilaTabla[];
  total: number;
  pagina: number;
  tamano: number;
  paginas: number;
  orden?: string;
  sentido?: string;
  muestra?: {
    eventos_en_tabla: number;
    eventos_registrados: number;
    cobertura: number | null;
    criterio: string;
  };
  filtros_activos?: FiltroActivo[];
}

export interface ParCategorias {
  a: string;
  b: string;
  compras_conjuntas: number;
  compras_a: number;
  compras_b: number;
  pct_de_a: number | null;
  pct_de_b: number | null;
}

export interface AfinidadCategorias {
  categorias: { categoria: string; compras: number; incluida: boolean }[];
  pares: ParCategorias[];
  cobertura: {
    compras_analizadas: number;
    // Solo las publica la versión con detalle de artículos; el modelo compacto
    // guarda los pares por compra y no estos recuentos.
    compras_con_una_categoria?: number;
    compras_con_varias_categorias?: number;
    categorias_distintas: number;
    maximo_categorias_por_compra?: number;
    pares_posibles: number;
    pares_representados: number;
    categorias_representadas: number;
    categorias_excluidas: number;
    minimo_compras_conjuntas: number;
    limite_categorias: number;
  };
  alcance?: {
    aplica_filtros: boolean;
    descripcion: string;
    periodo?: { desde: string | null; hasta: string | null };
    responde_a_filtros?: boolean;
    por_que?: string;
  };
}

export interface TasaPerfil {
  n2_n1: number | null;
  n3_n2: number | null;
  n4_n3: number | null;
  n4_n1: number | null;
}

export interface CanalPerfil {
  canal: string;
  n1: number;
  n2: number;
  n3: number;
  n4: number;
  tasas: TasaPerfil;
  monotono: boolean;
  base_reducida: boolean;
}

export interface PerfilConversion {
  canales: CanalPerfil[];
  global: { n1: number; n2: number; n3: number; n4: number; tasas: TasaPerfil };
  umbral_base_reducida: number;
  definicion: string;
}
export interface TransicionFriccion {
  clave: string;
  etiqueta: string;
  numerador: number;
  denominador: number;
  tasa: number | null;
  sin_avance: number;
  brecha_pp: number | null;
  base_pequena: boolean;
}

export interface Friccion {
  transiciones: { clave: string; etiqueta: string; desde: number; hasta: number }[];
  referencia: Record<
    string,
    { etiqueta: string; numerador: number; denominador: number; tasa: number | null; sin_avance: number }
  >;
  canales: {
    canal: string;
    entrada: number;
    n: Record<string, number>;
    transiciones: TransicionFriccion[];
    base_pequena: boolean;
  }[];
  universo: {
    canales: number;
    sesiones_entrada: number;
    filtro_canal_activo: boolean;
    descripcion: string;
  };
  umbral_base_reducida: number;
  definicion: string;
}

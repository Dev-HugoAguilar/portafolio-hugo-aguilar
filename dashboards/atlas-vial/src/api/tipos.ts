/** Tipos de la API del Atlas vial (los campos son los que devuelve FastAPI). */

export interface IndicadorValor {
  valor: number;
  base: string;
  porcentaje?: number | null;
  denominador?: number | null;
}

export interface Indicadores {
  hechos: IndicadorValor;
  personas_lesionadas: IndicadorValor;
  personas_fallecidas: IndicadorValor;
  hechos_con_fallecimientos: IndicadorValor;
}

export interface Cobertura {
  hechos: number;
  con_coordenadas: number;
  sin_coordenadas: number;
  fuera_de_cdmx: number;
  porcentaje_con_coordenadas: number | null;
  con_sexo: number;
  con_edad: number;
  con_tipo_usuario: number;
  con_vehiculo: number;
  porcentaje_con_tipo_usuario: number | null;
  sin_fecha: number;
  sin_hora: number;
}

export interface Resumen {
  indicadores: Indicadores;
  personas_por_hecho: number | null;
  cobertura: Cobertura;
  alcaldias: string[];
  periodo: {
    eventos_desde: string | null;
    eventos_hasta: string | null;
    fuente: { desde: string | null; hasta: string | null; consulta_desde: string | null; consulta_hasta: string | null };
  };
  filtros_activos: FiltroActivo[];
}

export interface FiltroActivo {
  clave: string;
  etiqueta: string;
  valores: (string | number)[];
  quitar: Record<string, unknown>;
}

export interface RecursoFuente {
  nombre: string | null;
  url: string | null;
  bytes: number | null;
  sha256: string | null;
  modificado_en_catalogo: string | null;
}

export interface Fuente {
  conjunto: string;
  titulo: string;
  portal: string;
  licencia: string;
  notas: string;
  catalogo_modificado: string | null;
  version: string;
  ultima_sincronizacion: string | null;
  periodo: { desde: string | null; hasta: string | null } | null;
  recursos: Record<string, RecursoFuente>;
}

export interface AtribucionGeometria {
  conjunto: string;
  portal: string;
  licencia: string;
  version: string;
  catalogo_modificado: string;
  recurso_modificado: string;
}

export interface CoberturaCatalogo {
  hechos: number;
  personas_lesionadas: number;
  personas_fallecidas: number;
  hechos_con_fallecimientos: number;
  con_coordenadas: number;
  sin_coordenadas: number;
  fuera_de_cdmx: number;
  con_sexo: number;
  con_edad: number;
  con_tipo_usuario: number;
  con_vehiculo: number;
  sin_fecha: number;
  sin_hora: number;
  coordenadas: Record<string, number> | null;
  avisos: string[];
}

export interface OpcionFiltro {
  valor: string;
  etiqueta: string;
}

export interface Catalogo {
  fuente: Fuente;
  cobertura: CoberturaCatalogo;
  filtros: {
    alcaldias: string[];
    tipos_evento: string[];
    vialidades: string[];
    tipos_usuario: string[];
    tipos_vehiculo: string[];
    sexos: string[];
    intersecciones: string[];
    consecuencias: OpcionFiltro[];
    semaforizada: OpcionFiltro[];
    grupos_edad: { etiqueta: string; desde: number; hasta: number }[];
    periodo: { desde: string | null; hasta: string | null; consulta_desde: string | null; consulta_hasta: string | null };
  };
  avisos: string[];
  metodologia: Metodologia;
}

export interface Metodologia {
  fuente: {
    conjunto: string;
    portal: string;
    autoridad: string;
    licencia: string;
    geometria: AtribucionGeometria;
  };
  fechas: Record<string, string>;
  granularidad: Record<string, string>;
  metricas: Record<string, string>;
  tratamiento: Record<string, string>;
  limitaciones: string[];
}

export interface FilaAlcaldia {
  alcaldia: string | null;
  hechos: number;
  lesionadas: number;
  fallecidas: number;
  con_fallecimientos: number;
  con_coordenadas: number;
  porcentaje_hechos?: number | null;
  denominador?: number;
  lesionadas_por_hecho?: number | null;
  fallecidas_por_100_hechos?: number | null;
}

export interface PuntoMapa {
  folio: string | null;
  lat: number | null;
  lon: number | null;
  fecha: string | null;
  hora: number | null;
  tipo_evento: string | null;
  alcaldia: string | null;
  lesionadas: number;
  fallecidas: number;
}

export interface Territorio {
  modo: string;
  resumen: Resumen;
  alcaldias: FilaAlcaldia[];
  geometria: {
    atribucion: AtribucionGeometria;
    extension: Extension;
    alcaldias: string[];
  };
  puntos: { tipo: string; puntos: PuntoMapa[]; total: number; limite: number };
  metricas: Record<string, string>;
  filtros_activos: FiltroActivo[];
}

export interface Extension {
  lon_min: number;
  lat_min: number;
  lon_max: number;
  lat_max: number;
}

export interface PuntosMapa {
  folios: string[];
  lat: number[];
  lon: number[];
  lesionadas: number[];
  fallecidas: number[];
  total: number;
  mostrados: number;
  truncado: boolean;
  extension: Extension;
  filtros_activos: FiltroActivo[];
}

export interface FeatureAlcaldia {
  type: 'Feature';
  properties: { nombre: string; cvegeo: string | null };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface Geometria {
  type: 'FeatureCollection';
  atribucion: AtribucionGeometria;
  extension: Extension;
  features: FeatureAlcaldia[];
}

export interface FilaSerie {
  periodo: string;
  hechos: number;
  lesionadas: number;
  fallecidas: number;
  con_fallecimientos: number;
}

export interface FilaDistribucion {
  valor: string | null;
  hechos: number;
  lesionadas: number;
  fallecidas: number;
}

/** Celda de un cruce real: ambas categorías publicadas en el mismo hecho. */
export interface CeldaCruce {
  fila: number;
  columna: number;
  hechos: number;
  lesionadas: number;
  fallecidas: number;
}

/** Cruce tipo de evento × clasificación vial (una sola pasada sobre los hechos). */
export interface CruceTiposEntorno {
  filas: string[];
  columnas: string[];
  celdas: CeldaCruce[];
  /** Hechos con tipo de evento conocido y clasificación vial no publicada. */
  sin_columna: { fila: number; hechos: number; lesionadas: number; fallecidas: number }[];
  /** Hechos con clasificación vial conocida y tipo de evento no publicado. */
  sin_fila: { columna: number; hechos: number; lesionadas: number; fallecidas: number }[];
  sin_ambos: { hechos: number; lesionadas: number; fallecidas: number };
  cobertura: {
    hechos: number;
    con_ambas: number;
    sin_columna: number;
    sin_fila: number;
    sin_ambos: number;
  };
}

/** Cruce tipo de intersección × semáforo registrado, con las tres medidas. */
export interface MedidaSemaforo {
  con: number;
  sin: number;
  sin_dato: number;
}

export interface CruceSemaforo {
  filas: string[];
  series: {
    fila: number;
    etiqueta: string;
    medidas: Record<'hechos' | 'lesionadas' | 'fallecidas', MedidaSemaforo>;
  }[];
  cobertura: Record<
    'hechos' | 'lesionadas' | 'fallecidas',
    { total: number; conocido: number; sin_dato: number }
  >;
}
export interface Tiempo {
  agregacion: 'dia' | 'semana' | 'mes';
  serie: FilaSerie[];
  matriz: {
    dias: string[];
    horas: number[];
    celdas: { dia_semana: number; hora: number; hechos: number; lesionadas: number; fallecidas: number }[];
    total_hechos: number;
  };
  distribuciones: {
    tipo_evento: FilaDistribucion[];
    vialidad: FilaDistribucion[];
    interseccion: FilaDistribucion[];
    semaforizada: FilaDistribucion[];
  };
  cruces: {
    tipos_entorno: CruceTiposEntorno;
    interseccion_semaforo: CruceSemaforo;
  };
  filtros_activos: FiltroActivo[];
}

export interface FilaPersonas {
  valor: string | null;
  hechos: number;
  lesionadas: number;
  fallecidas: number;
  etiqueta: string;
  porcentaje: number | null;
  denominador: number;
  lesionadas_en_esos_hechos: number;
  fallecidas_en_esos_hechos: number;
  metrica: string;
}

export interface FilaEdad {
  etiqueta: string;
  hechos: number;
  lesionadas: number;
  fallecidas: number;
  porcentaje?: number | null;
}

export interface Personas {
  total_hechos: number;
  cobertura: {
    con_sexo: number;
    con_edad: number;
    con_tipo_usuario: number;
    con_vehiculo: number;
    porcentaje_con_sexo: number | null;
    porcentaje_con_edad: number | null;
    porcentaje_con_tipo_usuario: number | null;
    porcentaje_con_vehiculo: number | null;
  };
  por_tipo_usuario: FilaPersonas[];
  por_sexo: FilaPersonas[];
  por_edad: FilaEdad[];
  por_vehiculo: FilaPersonas[];
  /** Cruce real personas_sexo × personas_edad del mismo registro (persona principal). */
  cruce_edad_sexo: {
    grupos: {
      sexo: string;
      hechos: number;
      celdas: { etiqueta: string; hechos: number; lesionadas: number; fallecidas: number }[];
    }[];
    sin_edad: { hechos: number; lesionadas: number; fallecidas: number };
    sin_sexo: { hechos: number; lesionadas: number; fallecidas: number };
    cobertura: { hechos: number; con_edad_y_sexo: number; sin_edad: number; sin_sexo: number };
    unidad: string;
  };
  filtros_activos: FiltroActivo[];
}

export interface FilaTabla {
  folio: string;
  fecha: string | null;
  hora: number | null;
  alcaldia: string | null;
  tipo_evento: string | null;
  ubicacion: string;
  lesionadas: number;
  fallecidas: number;
  consecuencia: string;
  lat: number | null;
  lon: number | null;
  coord_estado: string | null;
}

export interface Tabla {
  filas: FilaTabla[];
  total: number;
  paginas: number;
  pagina: number;
  tamano: number;
  orden: string;
  sentido: string;
  filtros_activos: FiltroActivo[];
}

export interface EventoDetalle {
  folio: string;
  fecha: string | null;
  hora: number | null;
  alcaldia: string | null;
  tipo_evento: string | null;
  ubicacion?: string;
  personas_lesionadas: number;
  personas_fallecidas: number;
  lat: number | null;
  lon: number | null;
  coord_estado: string | null;
  [clave: string]: unknown;
}

export interface EstadoPublico {
  publicada: boolean;
  version: string | null;
  ultima_sincronizacion: string | null;
  ultimo_intento: { version: string; creado_en: string; estado: string } | null;
  periodo: { desde: string | null; hasta: string | null };
  cifras: Record<string, unknown>;
  fuente: {
    titulo: string;
    portal: string;
    licencia: string;
    catalogo_modificado: string | null;
    recursos: Record<string, { nombre: string; url: string; bytes: number; modificado: string }>;
  } | null;
}

/** Celda de la malla métrica estable (500 m UTM 14N). */
export interface CeldaMayor {
  id: string;
  ix: number;
  iy: number;
  hechos: number;
  porcentaje: number;
  anillo: [number, number][];
}

export interface Celdas {
  malla: {
    resolucion_m: number;
    superficie_km2: number;
    proyeccion: string;
    zona_utm: string;
    origen: { x: number; y: number; unidad: string };
    pertenencia: string;
  };
  total: number;
  ubicables: number;
  incluidas: number;
  excluidos: {
    ausente: number;
    no_numerica: number;
    fuera_de_rango: number;
    fuera_de_cdmx: number;
  };
  celdas_con_registros: number;
  /** [ix, iy, hechos] de todas las celdas con registros, ordenadas de mayor a menor. */
  celdas: [number, number, number][];
  mayores: CeldaMayor[];
  denominador: { descripcion: string; valor: number };
  filtros_activos: Record<string, string[] | string | number>;
}

/** Agregado por colonia declarada en la fuente. */
export interface FilaColonia {
  id: string;
  colonia: string;
  alcaldia: string | null;
  hechos: number;
  lesionadas: number;
  fallecidas: number;
}

export interface Colonias {
  colonias: FilaColonia[];
  total: number;
  total_colonias: number;
  total_lesionadas: number;
  total_fallecidas: number;
  cobertura: {
    asignados: number;
    lesionadas_asignadas: number;
    fallecidas_asignadas: number;
    sin_colonia: number;
    lesionadas_sin_colonia: number;
    fallecidas_sin_colonia: number;
    fuente: string;
    poligonos: boolean;
  };
}



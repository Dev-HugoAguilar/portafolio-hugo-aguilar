/**
 * Tipos del contrato de la API de la CNBV.
 *
 * Se transcriben **solo** los campos que la interfaz usa; están tomados de las
 * respuestas reales de `/api/v1/cnbv/banca-multiple/{catalogo,resumen,series,detalle,indicadores}`.
 * Importes en millones de pesos (`millones_mxn`), porcentajes en puntos,
 * periodos en formato `AAAA-MM`.
 */

export type Seccion = 'balance' | 'resultados' | 'cuentas_orden' | 'sin_clasificar';
export type Naturaleza = 'saldo' | 'flujo_acumulado';
export type Unidad = 'millones_mxn' | 'porcentaje';

export interface Fuente {
  dataset_id: string;
  nombre: string;
  organismo: string;
  portal: string;
  pagina_estadistica: string;
  sector: string;
  sector_nombre: string;
  url_base_archivos: string;
  patron_archivo: string;
  moneda: string;
  unidad_saldos: string;
  unidad_indicadores: string;
  atribucion: string;
  condiciones_uso: string[];
  advertencias_metrica: string[];
  es_sintetico: boolean;
  periodos_verificados: string[];
  periodos_por_omision: string[];
}

export interface Boletin {
  periodo: string;
  fecha: string;
  archivo: string;
  url: string;
  sha256: string;
  revision: number;
  bytes: number;
  titulo_hoja: string | null;
  unidad_declarada: string | null;
  importado_en: string | null;
  instituciones: number;
  conceptos: number;
  hechos: number;
  indicadores: number;
  celdas_ausentes: number;
  rechazados: number;
}

export interface Concepto {
  concepto_id: string;
  nombre: string;
  seccion: Seccion;
  naturaleza: Naturaleza;
  unidad: Unidad;
  orden: number;
  periodos_con_dato: number;
  destacado: boolean;
}

export interface Institucion {
  institucion_id: string;
  nombre: string;
  es_sistema: boolean;
  periodos_con_dato: number;
}

export interface IndicadorCatalogo {
  indicador_id: string;
  nombre: string;
  nota: string | null;
  unidad: Unidad;
  periodos_con_dato: number;
}

export interface GrupoCartera {
  clave: string;
  nombre: string;
  nota: string;
  conceptos: string[];
}

export interface CoberturaCatalogo {
  dataset_id: string;
  periodos_importados: number;
  periodo_min: string | null;
  periodo_max: string | null;
  hechos: number;
  filas_originales: number;
  indicadores: number;
  fuente: string;
  tipos_cartera: GrupoCartera[];
  concepto_por_omision: string;
  conceptos_destacados: string[];
}

export interface Catalogo {
  fuente: Fuente;
  boletines: Boletin[];
  periodos: string[];
  conceptos: Concepto[];
  instituciones: Institucion[];
  indicadores: IndicadorCatalogo[];
  cobertura: CoberturaCatalogo;
  advertencias: string[];
}

export interface Kpis {
  valor_sistema: number | null;
  unidad: Unidad;
  naturaleza: Naturaleza;
  instituciones_con_dato: number;
  instituciones_sin_dato: number;
  participacion_mayor_pct: number | null;
  institucion_mayor: string | null;
  concentracion_top5_pct: number | null;
  mediana_instituciones: number | null;
  maximo_institucion: number | null;
  minimo_institucion: number | null;
}

export interface Comparacion {
  periodo_comparado: string | null;
  tipo: 'periodo_anterior' | 'mismo_mes_anio_anterior' | null;
  valor_sistema_periodo_comparado: number | null;
  variacion: number | null;
  variacion_sistema: number | null;
  variacion_sistema_pct: number | null;
  motivo: string | null;
}

export interface FilaInstitucion {
  institucion_id: string;
  institucion: string;
  es_sistema: boolean;
  valor: number | null;
  participacion_pct: number | null;
  valor_periodo_comparado: number | null;
  variacion: number | null;
  variacion_pct: number | null;
  posicion: number | null;
}

export interface PuntoSerie {
  periodo: string;
  fecha: string;
  valor: number | null;
  valor_sistema: number | null;
  instituciones_con_dato: number;
}

export interface Resumen {
  fuente: Fuente;
  boletin: Boletin;
  filtros: Record<string, unknown>;
  concepto: Concepto;
  periodo: string;
  fecha: string;
  kpis: Kpis;
  comparacion: Comparacion;
  por_institucion: FilaInstitucion[];
  serie: PuntoSerie[];
  valores_ausentes: {
    celdas_ausentes_boletin: number;
    instituciones_sin_dato: number;
    nota: string;
  };
  cobertura: Record<string, unknown>;
  advertencias: string[];
  generado_en: string;
}

export interface SerieInstitucion {
  institucion_id: string;
  institucion: string;
  es_sistema: boolean;
  puntos: PuntoSerie[];
}

export interface Series {
  fuente: Fuente;
  filtros: Record<string, unknown>;
  concepto: Concepto;
  periodos: string[];
  series: SerieInstitucion[];
  advertencias: string[];
  generado_en: string;
}

export interface DetalleFila {
  periodo: string;
  fecha: string;
  concepto_id: string;
  concepto: string;
  seccion: Seccion;
  naturaleza: Naturaleza;
  institucion_id: string;
  institucion: string;
  es_sistema: boolean;
  valor: number;
  unidad: Unidad;
  moneda: string;
  archivo: string;
  fila_origen: number;
}

export interface Detalle {
  items: DetalleFila[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  orden: string;
  filtros: Record<string, unknown>;
  unidad: Unidad;
  advertencias: string[];
  generado_en: string;
}

export interface ValorIndicador {
  periodo: string;
  fecha: string;
  institucion_id: string;
  institucion: string;
  es_sistema: boolean;
  valor: number;
  unidad: Unidad;
}

export interface Indicador {
  indicador_id: string;
  nombre: string;
  nota: string | null;
  unidad: Unidad;
  periodo: string;
  valores: ValorIndicador[];
}

export interface Indicadores {
  fuente: Fuente;
  periodo_boletin: string;
  indicadores: Indicador[];
  advertencias: string[];
  generado_en: string;
}

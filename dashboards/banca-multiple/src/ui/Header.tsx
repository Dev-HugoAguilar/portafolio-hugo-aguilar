/**
 * Cabecera compacta del módulo.
 *
 * Dos piezas, sin duplicar la cabecera del portafolio anfitrión:
 *  - `AppBar`: identidad, migas «Portafolio / Visualización», acceso a fuentes y
 *    al modo ampliado. No repite la navegación del sitio.
 *  - `TitleBlock`: título del caso, subtítulo e insignia de cobertura histórica.
 */

import type { Concepto, GrupoCartera } from '../api/types';
import { etiquetaConcepto, etiquetaPeriodo, porcentaje } from '../domain';
import { IconoAmpliar, IconoFuentes, IconoInstituciones, IconoReducir } from './icons';

export interface PropsAppBar {
  area: string;
  onAbrirFuentes: () => void;
  onAmpliar: () => void;
  enDialogo: boolean;
}

export function AppBar({ area, onAbrirFuentes, onAmpliar, enDialogo }: PropsAppBar) {
  return (
    <div className="bm-appbar">
      {/* Identidad mínima: el portafolio ya tiene su cabecera con el nombre, así
          que aquí solo se conserva la marca y las migas. */}
      <a className="bm-brand" href="#inicio" aria-label="Hugo Aguilar — inicio">
        <span className="bm-brand-mark" aria-hidden="true">
          HA
        </span>
      </a>
      <nav className="bm-crumbs" aria-label="Ruta de navegación">
        <a href="#portafolio">Portafolio</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{area}</span>
      </nav>
      <div className="bm-appbar-actions">
        <button
          type="button"
          className="bm-btn bm-btn--ghost bm-btn--icon"
          onClick={onAbrirFuentes}
          data-testid="abrir-fuentes"
          title="Fuentes y metodología"
        >
          <IconoFuentes tamano={18} />
          <span>Fuentes</span>
        </button>
        <button
          type="button"
          className="bm-btn bm-btn--icon-cuadrado"
          onClick={onAmpliar}
          aria-label={enDialogo ? 'Reducir la aplicación' : 'Ampliar la aplicación'}
          title={enDialogo ? 'Reducir' : 'Ampliar'}
          data-testid="ampliar"
        >
          {enDialogo ? <IconoReducir tamano={18} /> : <IconoAmpliar tamano={18} />}
        </button>
      </div>
    </div>
  );
}

export interface PropsTitleBlock {
  periodo: string;
  concepto: Concepto | null;
  grupos: GrupoCartera[];
  periodos: string[];
  faltantes: string[];
  actualizando: boolean;
}

export function TitleBlock({
  periodo,
  concepto,
  grupos,
  periodos,
  faltantes,
  actualizando,
}: PropsTitleBlock) {
  const etiqueta = concepto ? etiquetaConcepto(concepto, grupos) : null;

  return (
    <header className="bm-title">
      <IconoInstituciones tamano={22} className="bm-title-icon" />
      <div className="bm-title-main">
        <h2 className="bm-title-text">
          Banca múltiple mexicana
          <span className="bm-title-sub">Comparativo financiero</span>
        </h2>
        <p className="bm-title-meta">
          <span className="bm-badge" title={`Cobertura: ${periodos.length} boletines CNBV`}>
            <span className="bm-badge-dot" aria-hidden="true" />
            Histórico CNBV ·{' '}
            <strong data-testid="meta-periodo">{etiquetaPeriodo(periodo)}</strong>
          </span>
          <span className="bm-pill" data-testid="meta-concepto" title={etiqueta?.seccion}>
            {etiqueta?.completa ?? 'Concepto'}
          </span>
          <span className="bm-coverage" data-testid="nota-cobertura">
            {periodos.length} boletines · {etiquetaPeriodo(periodos[0] ?? '')}–
            {etiquetaPeriodo(periodos[periodos.length - 1] ?? '')}
            {faltantes.length > 0 ? ` · faltan ${faltantes.length} meses` : ''}
          </span>
          {actualizando ? (
            <span className="bm-updating" data-testid="actualizando" role="status">
              <span className="bm-live-dot" aria-hidden="true" />
              actualizando
            </span>
          ) : null}
        </p>
      </div>
    </header>
  );
}

/**
 * Cifra de apoyo reutilizable.
 *
 * El valor principal va en grafito (es la cifra publicada) y el tono semántico
 * se aplica solo a la comparación, cuando la interpretación lo justifica.
 */
export function Indicador({
  etiqueta,
  valor,
  unidad,
  detalle,
  tono = 'neutro',
  testid,
  icono,
  exacto,
}: {
  etiqueta: string;
  valor: string;
  unidad?: string;
  detalle?: string;
  tono?: 'neutro' | 'positivo' | 'negativo';
  testid?: string;
  icono?: React.ReactNode;
  /** Cifra original completa, disponible en el tooltip. */
  exacto?: string;
}) {
  return (
    <div className="bm-kpi" data-testid={testid}>
      <div className="bm-kpi-body">
        <p className="bm-kpi-label">
          {icono}
          {etiqueta}
        </p>
        <p className="bm-kpi-value" title={exacto}>
          {valor}
          {unidad ? <span className="bm-kpi-unit">{unidad}</span> : null}
        </p>
        {detalle ? <p className={`bm-kpi-note bm-kpi-note--${tono}`}>{detalle}</p> : null}
      </div>
    </div>
  );
}

/**
 * Conceptos en los que **crecer no es una buena noticia**: cartera vencida,
 * estimaciones preventivas, provisiones, gastos, castigos o costos. En ellos la
 * variación se queda en grafito: el turquesa se reserva para mejoras
 * interpretables.
 */
const CONCEPTOS_NO_FAVORABLES = [
  /vencid/i,
  /impa(g|go)/i,
  /estimaci/i,
  /preventiv/i,
  /provisi/i,
  /castig/i,
  /gasto/i,
  /costo/i,
  /quebranto/i,
];

export function variacionTono(
  valor: number | null,
  concepto?: Concepto | null,
): 'neutro' | 'positivo' | 'negativo' {
  if (valor === null || !Number.isFinite(valor)) return 'neutro';
  const nombre = concepto ? `${concepto.nombre} ${concepto.concepto_id}` : '';
  if (nombre && CONCEPTOS_NO_FAVORABLES.some((patron) => patron.test(nombre))) return 'neutro';
  return valor >= 0 ? 'positivo' : 'negativo';
}

export const textoVariacion = (valor: number | null, base: string | null): string => {
  if (valor === null) return 'sin comparación';
  return `${porcentaje(valor)} %${base ? ` ${base}` : ''}`;
};

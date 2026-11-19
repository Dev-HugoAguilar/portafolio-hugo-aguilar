/**
 * Cuatro indicadores en una fila.
 *
 * Cada tarjeta: icono lineal sobre una superficie tenue, etiqueta pequeña, cifra
 * principal en grafito (compacta en billones cuando corresponde) y una
 * comparación temporal identificada. La cifra original completa queda en el
 * tooltip. El total del sistema y la concentración son contexto global: **no**
 * cambian de significado al seleccionar bancos.
 */

import type { Concepto, Comparacion, GrupoCartera, Kpis as KpisApi } from '../api/types';
import {
  ayudaBillones,
  etiquetaAcumulado,
  etiquetaConcepto,
  etiquetaNaturaleza,
  porcentaje,
  textoBase,
  textoMotivo,
  valorKpi,
} from '../domain';
import {
  IconoConcentracion,
  IconoParticipacion,
  IconoSeleccion,
  IconoSistema,
} from './icons';
import { Indicador, textoVariacion, variacionTono } from './Header';

export interface PropsKpis {
  kpis: KpisApi;
  comparacion: Comparacion;
  concepto: Concepto | null;
  grupos: GrupoCartera[];
  periodo: string;
  seleccion: { cantidad: number; total: number | null; participacionPct: number | null };
  totalInstituciones: number;
  actualizando: boolean;
}

export function Kpis({
  kpis,
  comparacion,
  concepto,
  grupos,
  periodo,
  seleccion,
  totalInstituciones,
  actualizando,
}: PropsKpis) {
  const etiqueta = concepto ? etiquetaConcepto(concepto, grupos) : null;
  const base = textoBase(comparacion.tipo, comparacion.periodo_comparado, comparacion.motivo);
  const motivo = textoMotivo(comparacion.motivo);
  const esFlujo = kpis.naturaleza === 'flujo_acumulado';
  const esPorcentaje = concepto?.unidad === 'porcentaje';

  const sistema = valorKpi(kpis.valor_sistema, { esPorcentaje });
  const seleccionValor = valorKpi(seleccion.total, { esPorcentaje });
  const etiquetaSistema =
    etiqueta && /^activo/i.test(etiqueta.principal)
      ? 'Activo del sistema'
      : `Sistema${etiqueta ? ` · ${etiqueta.principal}` : ''}`;

  return (
    <section className={`bm-kpis${actualizando ? ' is-updating' : ''}`} aria-label="Indicadores del periodo">
      <Indicador
        etiqueta={etiquetaSistema}
        valor={sistema.principal}
        unidad={sistema.unidad}
        exacto={sistema.exacto}
        icono={<IconoSistema />}
        detalle={`${textoVariacion(comparacion.variacion_sistema_pct, base?.etiqueta ?? null)}${
          esFlujo ? ` · ${etiquetaAcumulado(periodo)}` : ''
        }`}
        tono={variacionTono(comparacion.variacion_sistema_pct, concepto)}
        testid="kpi-sistema"
      />

      <Indicador
        etiqueta="Selección"
        valor={seleccionValor.principal}
        unidad={seleccionValor.unidad}
        exacto={seleccionValor.exacto}
        icono={<IconoSeleccion />}
        detalle={
          seleccion.cantidad === 0
            ? 'sin instituciones seleccionadas'
            : `${seleccion.cantidad} de ${totalInstituciones} · no incluye el Sistema`
        }
        testid="kpi-seleccion"
      />

      <Indicador
        etiqueta="Participación"
        valor={seleccion.participacionPct === null ? '—' : porcentaje(seleccion.participacionPct)}
        unidad={seleccion.participacionPct === null ? undefined : '%'}
        exacto={
          seleccion.participacionPct === null
            ? 'sin selección activa'
            : `${porcentaje(seleccion.participacionPct)} % del total del sistema`
        }
        icono={<IconoParticipacion />}
        detalle={
          seleccion.participacionPct === null
            ? 'se calcula contra el total publicado'
            : 'selección ÷ total del sistema'
        }
        testid="kpi-participacion"
      />

      <Indicador
        etiqueta="Concentración Top 5"
        valor={porcentaje(kpis.concentracion_top5_pct)}
        unidad="%"
        exacto={`Las cinco mayores instituciones concentran ${porcentaje(
          kpis.concentracion_top5_pct,
        )} % del sistema`}
        icono={<IconoConcentracion />}
        detalle={`${kpis.instituciones_con_dato} instituciones · mayor ${porcentaje(
          kpis.participacion_mayor_pct,
        )} %`}
        testid="kpi-contexto"
      />

      <p className="bm-kpis-foot" data-testid="kpi-base">
        {etiquetaNaturaleza(kpis.naturaleza)} · {etiqueta?.seccion ?? ''}
        {base ? ` · ${base.criterio}` : motivo ? ` · ${motivo}` : ''}
        {ayudaBillones(kpis.valor_sistema) ? ` · ${ayudaBillones(kpis.valor_sistema)} de pesos` : ''}
      </p>
    </section>
  );
}

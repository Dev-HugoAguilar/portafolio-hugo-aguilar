/**
 * Tarjetas de indicadores.
 *
 * Cada tarjeta lleva su definición accesible (`title` + texto de base) y su
 * unidad. Si no hay datos, se escribe «Sin datos»: nunca un cero que parezca un
 * resultado.
 */

import type { IndicadorValor, Resumen } from '../api/tipos';
import { COLOR_METRICA, PALETA } from '../paleta';
import { numero, porcentaje, dinero, variacion } from '../dominio';

export interface PropsKpis {
  resumen: Resumen | null;
  cargando: boolean;
}

const ORDEN: { clave: string; etiqueta: string; color: string; formato: 'entero' | 'dinero' | 'porcentaje' }[] = [
  { clave: 'eventos', etiqueta: 'Eventos', color: PALETA.text, formato: 'entero' },
  { clave: 'usuarios', etiqueta: 'Usuarios', color: COLOR_METRICA.usuarios, formato: 'entero' },
  { clave: 'sesiones', etiqueta: 'Sesiones', color: COLOR_METRICA.sesiones, formato: 'entero' },
  { clave: 'compradores', etiqueta: 'Compradores', color: COLOR_METRICA.compras, formato: 'entero' },
  { clave: 'compras', etiqueta: 'Compras', color: COLOR_METRICA.compras, formato: 'entero' },
  { clave: 'ingresos_usd', etiqueta: 'Ingresos', color: COLOR_METRICA.ingresos, formato: 'dinero' },
  { clave: 'conversion', etiqueta: 'Conversión', color: COLOR_METRICA.usuarios, formato: 'porcentaje' },
  { clave: 'ticket_medio_usd', etiqueta: 'Ticket medio', color: PALETA.textSecondary, formato: 'dinero' },
];

function formatear(valor: number | null | undefined, formato: 'entero' | 'dinero' | 'porcentaje') {
  if (formato === 'dinero') return dinero(valor);
  if (formato === 'porcentaje') return porcentaje(valor);
  return numero(valor);
}

export function Kpis({ resumen, cargando }: PropsKpis) {
  const indicadores = resumen?.indicadores ?? null;
  const comparacion = resumen?.comparacion;
  const variaciones = comparacion?.valida ? comparacion.variacion ?? {} : {};

  return (
    <section className="mk-kpis" aria-label="Indicadores del rango filtrado" data-testid="kpis">
      {ORDEN.map(({ clave, etiqueta, color, formato }) => {
        const dato: IndicadorValor | undefined = indicadores?.[clave];
        const valor = dato?.valor ?? null;
        const cambio = variaciones[clave];
        return (
          <article
            key={clave}
            className={`mk-kpi${cargando ? ' is-cargando' : ''}`}
            title={dato?.base ?? 'Sin datos publicados'}
          >
            <p className="mk-kpi-etiqueta">{etiqueta}</p>
            <p className="mk-kpi-valor" style={{ color: indicadores ? color : PALETA.textSecondary }}>
              {indicadores ? formatear(valor, formato) : 'Sin datos'}
            </p>
            {cambio !== undefined && cambio !== null ? (
              <p className={`mk-kpi-cambio${(cambio as number) < 0 ? ' is-baja' : ''}`}>
                {variacion(cambio as number)} vs. periodo anterior
              </p>
            ) : null}
            <p className="mk-kpi-base">
              {dato?.base ?? 'Disponible cuando exista una versión publicada'}
            </p>
          </article>
        );
      })}
    </section>
  );
}

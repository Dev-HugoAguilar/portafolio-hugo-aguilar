/**
 * «Pulso de ventas»: pequeños múltiplos del nivel activo (tiendas agrupadas por estado o
 * departamentos del contexto territorial) y concentración por producto.
 *
 * La comparación entre periodos por categoría se sustituyó por la sección «Comparación
 * entre periodos por tienda y categoría», que mide las doce combinaciones reales de
 * California en lugar de tres categorías agregadas.
 *
 * - La retícula y el cursor viven en `Multiples` (compartido con la comparación de
 *   productos), con una sola escala desde cero y marcas calculadas.
 * - Los paneles de tienda se agrupan bajo el encabezado de su estado: no se mezclan
 *   TX_3 y WI_1 en una fila sin separación territorial.
 * - El encabezado de cada panel es el único control de exploración; el área de trazado
 *   sigue sirviendo para leer datos con el cursor.
 */

import { useMemo, useState } from 'react';

import type { CatalogoRespuesta, ModoSerie, PulsoRespuesta, SerieTienda } from '../api';
import { ConcentracionProductos } from './Concentracion';
import { claveDe, Multiples, type GrupoSeries } from './Multiples';
import { Segmentado } from './Segmentado';

const numero = (valor: number) => valor.toLocaleString('es-MX');
const numero1 = (valor: number) =>
  valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const ESTADO_NOMBRE: Record<string, string> = { CA: 'California', TX: 'Texas', WI: 'Wisconsin' };

function tituloSeries(datos: PulsoRespuesta): string {
  if (datos.nivel === 'departamento') {
    const contexto = datos.contexto;
    const donde = contexto?.tienda ?? (contexto?.estado ? ESTADO_NOMBRE[contexto.estado] ?? contexto.estado : null);
    return `Unidades por departamento${donde ? ` · ${donde}` : ''}`;
  }
  if (datos.nivel === 'producto') {
    return `Unidades por producto · ${datos.contexto?.departamento ?? ''}`;
  }
  return 'Unidades por tienda';
}

export function PulsoVentas({
  datos,
  catalogo,
  onExplorar,
  explorable,
  tituloSeccion = 'Panorama territorial y series',
}: {
  datos: PulsoRespuesta;
  catalogo: CatalogoRespuesta | null;
  onExplorar: (serie: SerieTienda) => void;
  explorable: boolean;
  tituloSeccion?: string;
}) {
  const [modo, setModo] = useState<ModoSerie>('comun');

  const grupos = useMemo<GrupoSeries[] | undefined>(() => {
    if (datos.nivel !== 'tienda' || !catalogo) return undefined;
    const estadoDe = new Map(catalogo.tiendas.map((tienda) => [tienda.store_id, tienda.state_id]));
    const panorama = datos.panorama?.estados ?? [];
    const bloques: GrupoSeries[] = [];
    for (const estado of panorama) {
      const claves = datos.series
        .map(claveDe)
        .filter((clave) => estadoDe.get(clave) === estado.estado && estado.tiendas.includes(clave));
      if (claves.length === 0) continue;
      bloques.push({
        titulo: `${estado.nombre} · ${estado.estado}`,
        detalle: `${estado.tiendas_incluidas} ${
          estado.tiendas_incluidas === 1 ? 'tienda' : 'tiendas'
        } · ${numero(estado.unidades)} u · ${
          estado.participacion_pct === null ? '—' : `${numero1(estado.participacion_pct)} %`
        } del contexto`,
        claves,
      });
    }
    return bloques.length > 0 ? bloques : undefined;
  }, [datos, catalogo]);

  const agregacion = datos.parametros.agregacion;
  const contexto = datos.contexto;
  const seleccionParcial =
    datos.nivel === 'producto' && contexto !== null && contexto.total_seleccion !== contexto.total_contexto;

  if (datos.series.length === 0) {
    return (
      <section className="ac-panel" aria-labelledby="ac-t-multiples">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-multiples">{tituloSeries(datos)}</h3>
            <p className="ac-panel-sub">Sin series para los filtros vigentes.</p>
          </div>
        </header>
        <p className="ac-vacio">
          {datos.nivel === 'producto'
            ? 'Ningún producto de la selección tiene unidades en el intervalo. Prueba otra selección o amplía el periodo.'
            : 'No hay series que mostrar con el contexto actual. Revisa el territorio y el catálogo.'}
        </p>
      </section>
    );
  }

  return (
    <div className="ac-bloques">
      <section className="ac-panel" aria-labelledby="ac-t-multiples">
        <header className="ac-panel-cab">
          <div>
            <h3 id="ac-t-multiples">{tituloSeries(datos)}</h3>
            <p className="ac-panel-sub">
              {tituloSeccion} ·{' '}
              {agregacion === 'dia' ? 'por día' : agregacion === 'semana' ? 'por semana (lunes a domingo)' : 'por mes'} ·{' '}
              {modo === 'comun' ? 'escala común desde cero para los paneles visibles' : 'índice base 100'}
              {explorable ? ' · abre un encabezado para explorar' : ''}
            </p>
          </div>
          <Segmentado<ModoSerie>
            etiqueta="Modo de lectura de las series"
            valor={modo}
            onElegir={setModo}
            testid="selector-modo"
            opciones={[
              { valor: 'comun', texto: 'Escala común' },
              { valor: 'tendencias', texto: 'Comparar tendencias' },
            ]}
          />
        </header>

        {seleccionParcial && contexto ? (
          <p className="ac-alcance" data-testid="alcance-productos">
            Total del departamento {contexto.departamento}:{' '}
            <strong>{numero(contexto.total_contexto)} u</strong> · selección de {contexto.productos.length} de{' '}
            {contexto.productos_disponibles} productos: <strong>{numero(contexto.total_seleccion)} u</strong>
            {contexto.participacion_pct !== null ? ` (${numero1(contexto.participacion_pct)} %)` : ''}
          </p>
        ) : null}

        {datos.nivel === 'producto' && contexto && contexto.seleccion_automatica ? (
          <p className="ac-alcance ac-alcance--nota" data-testid="seleccion-inicial">
            Selección inicial: los {contexto.productos.length} productos con más unidades del periodo y los
            filtros vigentes. Puedes sustituirlos en el explorador de productos.
          </p>
        ) : null}

        <Multiples
          series={datos.series}
          agregacion={agregacion}
          modo={modo}
          grupos={grupos}
          onExplorar={explorable ? onExplorar : null}
          ariaLabel="Series de unidades vendidas; usa las flechas para mover la guía temporal"
          etiquetaTotal="Unidades del periodo"
        />
      </section>
    </div>
  );
}

/** Comparación A/B y concentración: bloque propio, después de la composición. */
export function ComparacionConcentracion({
  datos,
  onExplorarArticulo,
}: {
  datos: PulsoRespuesta;
  onExplorarArticulo?: (item: string) => void;
}) {
  /* La comparación entre periodos por categoría se sustituyó por la sección
     «Comparación entre periodos por tienda y categoría» (doce filas reales). Aquí queda
     solo la concentración, para no duplicar el mismo A/B con otro grano. */
  return (
    <section className="ac-panel" aria-labelledby="ac-t-conc">
      <header className="ac-panel-cab">
        <div>
          <h3 id="ac-t-conc">Concentración por producto</h3>
          <p className="ac-panel-sub">
            Acumulado descendente · {numero(datos.concentracion.productos)} productos ·{' '}
            {numero(datos.concentracion.total)} unidades
          </p>
          {datos.concentracion.alcance ? (
            <p className="ac-panel-sub">Alcance: {datos.concentracion.alcance}</p>
          ) : null}
        </div>
      </header>
      <ConcentracionProductos datos={datos} onExplorarArticulo={onExplorarArticulo} />
    </section>
  );
}

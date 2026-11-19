/**
 * Controles del Atlas comercial con el lenguaje del Atlas vial.
 *
 * - `Desplegable`: filtros de lista (tiendas, categorías). Abrir no aplica nada.
 * - `DesplegablePeriodo`: el periodo global vive en un panel de fechas; hasta pulsar
 *   «Aplicar» no se ejecuta ninguna consulta.
 * - `DesplegableComparar`: intervalos A/B con validación dentro del alcance global,
 *   acciones de aplicar y cancelar, y edición provisional sin consultas por pulsación.
 *
 * Todos comparten superficie blanca, borde neutro, altura 34 px, radio 10 px y estado
 * aplicado grafito del Atlas.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Cobertura } from '../api';

const FECHA_CORTA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
const formatFecha = (iso: string) => FECHA_CORTA.format(new Date(`${iso}T00:00:00`));

/**
 * Escape cierra el panel abierto y detiene la propagación.
 *
 * Se registra en fase de captura: así el panel se cierra **antes** que cualquier
 * otro atajo de la página (por ejemplo, retroceder de nivel en la exploración) y
 * no se queda con la tecla cuando no hay nada abierto.
 */
function useCerrarConEscape(abierto: boolean, cerrar: () => void) {
  useEffect(() => {
    if (!abierto) return;
    const manejar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      evento.stopPropagation();
      cerrar();
    };
    document.addEventListener('keydown', manejar, true);
    return () => document.removeEventListener('keydown', manejar, true);
  }, [abierto, cerrar]);
}

export function Desplegable({
  etiqueta,
  opciones,
  seleccion,
  onCambiar,
  vacio,
}: {
  etiqueta: string;
  opciones: string[];
  seleccion: string[];
  onCambiar: (valores: string[]) => void;
  vacio: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const aplicado = seleccion.length > 0;
  const cerrarPanel = useCallback(() => setAbierto(false), []);
  useCerrarConEscape(abierto, cerrarPanel);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (evento: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const alternar = (valor: string) => {
    onCambiar(seleccion.includes(valor) ? seleccion.filter((v) => v !== valor) : [...seleccion, valor]);
  };

  return (
    <div className="ac-ctrl-caja" ref={raiz}>
      <button
        type="button"
        className={`ac-ctrl${aplicado ? ' is-activo' : ''}`}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        onClick={() => setAbierto((previo) => !previo)}
      >
        <span className="ac-ctrl-label">{etiqueta}</span>
        <span className="ac-ctrl-valor">
          {aplicado ? (seleccion.length <= 2 ? seleccion.join(', ') : `${seleccion.length} seleccionadas`) : vacio}
        </span>
        <span className="ac-ctrl-flecha" aria-hidden="true">
          ▾
        </span>
      </button>
      {abierto ? (
        <div className="ac-pop" role="dialog" aria-label={etiqueta}>
          <ul className="ac-pop-lista">
            {opciones.map((opcion) => {
              const marcada = seleccion.includes(opcion);
              return (
                <li key={opcion}>
                  <button
                    type="button"
                    className={`ac-opcion${marcada ? ' is-marcada' : ''}`}
                    aria-pressed={marcada}
                    onClick={() => alternar(opcion)}
                  >
                    <span className="ac-caja" aria-hidden="true">
                      {marcada ? '✓' : ''}
                    </span>
                    {opcion}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="ac-pop-pie">
            <button type="button" className="ac-pop-accion" onClick={() => onCambiar([])}>
              Quitar selección
            </button>
            <button type="button" className="ac-pop-primaria" onClick={() => setAbierto(false)}>
              Listo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CampoFecha({
  etiqueta,
  valor,
  onCambiar,
  minimo,
  maximo,
}: {
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  minimo?: string;
  maximo?: string;
}) {
  return (
    <label className="ac-campo">
      <span className="ac-campo-etq">{etiqueta}</span>
      <input
        type="date"
        value={valor}
        min={minimo}
        max={maximo}
        onChange={(evento) => onCambiar(evento.target.value)}
      />
    </label>
  );
}

/** Periodo global: panel de fechas con aplicar y cancelar. */
export function DesplegablePeriodo({
  desde,
  hasta,
  cobertura,
  resumen,
  onAplicar,
}: {
  desde: string;
  hasta: string;
  cobertura: Cobertura | null;
  resumen: string;
  onAplicar: (desde: string, hasta: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [provisional, setProvisional] = useState({ desde, hasta });
  const raiz = useRef<HTMLDivElement>(null);
  const cerrarPanel = useCallback(() => setAbierto(false), []);
  useCerrarConEscape(abierto, cerrarPanel);

  useEffect(() => {
    if (abierto) setProvisional({ desde, hasta });
  }, [abierto, desde, hasta]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (evento: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const valido = useMemo(() => {
    if (!provisional.desde || !provisional.hasta) return 'Elige fecha de inicio y de fin.';
    if (provisional.desde > provisional.hasta) return 'El inicio no puede ser posterior al fin.';
    if (cobertura && (provisional.desde < cobertura.desde || provisional.hasta > cobertura.hasta)) {
      return `Fuera de la cobertura: ${formatFecha(cobertura.desde)} – ${formatFecha(cobertura.hasta)}.`;
    }
    return null;
  }, [provisional, cobertura]);

  return (
    <div className="ac-ctrl-caja" ref={raiz}>
      <button
        type="button"
        className={`ac-ctrl ac-ctrl--periodo${abierto ? ' is-abierto' : ''}`}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        onClick={() => setAbierto((previo) => !previo)}
      >
        <span className="ac-ctrl-label">Periodo</span>
        <span className="ac-ctrl-valor">{resumen}</span>
        <span className="ac-ctrl-flecha" aria-hidden="true">
          ▾
        </span>
      </button>
      {abierto ? (
        <div className="ac-pop ac-pop--periodo" role="dialog" aria-label="Periodo del análisis">
          <div className="ac-pop-cab">
            <h4>Periodo</h4>
            <p>Fechas históricas incluidas; no reinicia los demás filtros.</p>
          </div>
          <div className="ac-pop-campos">
            <CampoFecha
              etiqueta="Desde"
              valor={provisional.desde}
              onCambiar={(valor) => setProvisional((previo) => ({ ...previo, desde: valor }))}
              minimo={cobertura?.desde}
              maximo={cobertura?.hasta}
            />
            <CampoFecha
              etiqueta="Hasta"
              valor={provisional.hasta}
              onCambiar={(valor) => setProvisional((previo) => ({ ...previo, hasta: valor }))}
              minimo={cobertura?.desde}
              maximo={cobertura?.hasta}
            />
          </div>
          {valido ? <p className="ac-pop-aviso">{valido}</p> : null}
          <div className="ac-pop-pie">
            <button type="button" className="ac-pop-accion" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="ac-pop-primaria"
              disabled={Boolean(valido)}
              onClick={() => {
                onAplicar(provisional.desde, provisional.hasta);
                setAbierto(false);
              }}
            >
              Aplicar periodo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Comparación A/B: panel compacto con las dos ventanas y su validación. */
export function DesplegableComparar({
  a,
  b,
  automatico = false,
  cobertura,
  periodo,
  onAplicar,
}: {
  a: { desde: string; hasta: string } | null;
  b: { desde: string; hasta: string } | null;
  /** true = A y B son la propuesta del servidor (dos mitades), no una elección. */
  automatico?: boolean;
  cobertura: Cobertura | null;
  periodo: { desde: string; hasta: string };
  onAplicar: (a: { desde: string; hasta: string } | null, b: { desde: string; hasta: string } | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const cerrarPanel = useCallback(() => setAbierto(false), []);
  useCerrarConEscape(abierto, cerrarPanel);
  const [provisional, setProvisional] = useState({
    aDesde: a?.desde ?? periodo.desde,
    aHasta: a?.hasta ?? periodo.hasta,
    bDesde: b?.desde ?? periodo.desde,
    bHasta: b?.hasta ?? periodo.hasta,
  });

  useEffect(() => {
    if (abierto) {
      setProvisional({
        aDesde: a?.desde ?? periodo.desde,
        aHasta: a?.hasta ?? periodo.hasta,
        bDesde: b?.desde ?? periodo.desde,
        bHasta: b?.hasta ?? periodo.hasta,
      });
    }
  }, [abierto, a, b, periodo]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (evento: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const error = useMemo(() => {
    const dentro = (desde: string, hasta: string, etiqueta: string) => {
      if (!desde || !hasta) return `El intervalo ${etiqueta} necesita inicio y fin.`;
      if (desde > hasta) return `El intervalo ${etiqueta} termina antes de empezar.`;
      if (
        cobertura &&
        (desde < cobertura.desde || hasta > cobertura.hasta || desde < periodo.desde || hasta > periodo.hasta)
      ) {
        return `El intervalo ${etiqueta} debe quedar dentro del periodo consultado (${formatFecha(periodo.desde)} – ${formatFecha(periodo.hasta)}).`;
      }
      return null;
    };
    return dentro(provisional.aDesde, provisional.aHasta, 'A') ?? dentro(provisional.bDesde, provisional.bHasta, 'B');
  }, [provisional, cobertura, periodo]);

  const dias = (desde: string, hasta: string) =>
    desde && hasta && desde <= hasta
      ? Math.round((Date.parse(`${hasta}T00:00:00`) - Date.parse(`${desde}T00:00:00`)) / 86_400_000) + 1
      : 0;

  const activo = Boolean(a && b) && !automatico;

  return (
    <div className="ac-ctrl-caja" ref={raiz}>
      <button
        type="button"
        className={`ac-ctrl${activo ? ' is-activo' : ''}`}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        onClick={() => setAbierto((previo) => !previo)}
      >
        <span className="ac-ctrl-label">Comparar periodos</span>
        <span className="ac-ctrl-valor">
          {activo ? 'A / B propios' : automatico ? 'Automático' : 'Sin definir'}
        </span>
        <span className="ac-ctrl-flecha" aria-hidden="true">
          ▾
        </span>
      </button>
      {abierto ? (
        <div className="ac-pop ac-pop--comparar" role="dialog" aria-label="Comparar periodos">
          <div className="ac-pop-cab">
            <h4>Comparar periodos</h4>
            <p>Mismos filtros de tienda y categoría; A y B dentro del periodo consultado.</p>
          </div>
          <div className="ac-pop-grupo">
            <span className="ac-pop-grupo-titulo">Intervalo A</span>
            <div className="ac-pop-campos">
              <CampoFecha
                etiqueta="Desde"
                valor={provisional.aDesde}
                onCambiar={(valor) => setProvisional((previo) => ({ ...previo, aDesde: valor }))}
                minimo={periodo.desde}
                maximo={periodo.hasta}
              />
              <CampoFecha
                etiqueta="Hasta"
                valor={provisional.aHasta}
                onCambiar={(valor) => setProvisional((previo) => ({ ...previo, aHasta: valor }))}
                minimo={periodo.desde}
                maximo={periodo.hasta}
              />
            </div>
            <p className="ac-pop-duracion">{dias(provisional.aDesde, provisional.aHasta)} días</p>
          </div>
          <div className="ac-pop-grupo">
            <span className="ac-pop-grupo-titulo">Intervalo B</span>
            <div className="ac-pop-campos">
              <CampoFecha
                etiqueta="Desde"
                valor={provisional.bDesde}
                onCambiar={(valor) => setProvisional((previo) => ({ ...previo, bDesde: valor }))}
                minimo={periodo.desde}
                maximo={periodo.hasta}
              />
              <CampoFecha
                etiqueta="Hasta"
                valor={provisional.bHasta}
                onCambiar={(valor) => setProvisional((previo) => ({ ...previo, bHasta: valor }))}
                minimo={periodo.desde}
                maximo={periodo.hasta}
              />
            </div>
            <p className="ac-pop-duracion">{dias(provisional.bDesde, provisional.bHasta)} días</p>
          </div>
          {error ? <p className="ac-pop-aviso">{error}</p> : null}
          <div className="ac-pop-pie">
            <button type="button" className="ac-pop-accion" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="ac-pop-primaria"
              disabled={Boolean(error)}
              onClick={() => {
                onAplicar(
                  { desde: provisional.aDesde, hasta: provisional.aHasta },
                  { desde: provisional.bDesde, hasta: provisional.bHasta },
                );
                setAbierto(false);
              }}
            >
              Aplicar comparación
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { formatFecha };

/** Etiquetas en español de las categorías, conservando el código en los datos. */
export const ETIQUETA_CATEGORIA: Record<string, string> = {
  FOODS: 'Alimentos',
  HOBBIES: 'Aficiones',
  HOUSEHOLD: 'Hogar',
};

export const etiquetaCategoria = (codigo: string) => ETIQUETA_CATEGORIA[codigo] ?? codigo;

/**
 * Texto legible de la cobertura del intervalo consultado.
 *
 * La cifra que se recibe son **días observados** de cobertura, no cubos de la gráfica: la
 * unidad se escribe siempre en días aunque la agregación de la serie sea semanal o mensual.
 * La agregación se declara aparte (en el control de agregación y en el pie de la gráfica),
 * de modo que cambiar Día/Semana/Mes no puede reetiquetar la cobertura.
 */
export function resumenPeriodo(
  desde: string,
  hasta: string,
  dias: number | null,
): string {
  const partes = `${formatFecha(desde)} – ${formatFecha(hasta)}`;
  if (!dias) return partes;
  return `${partes} · ${dias.toLocaleString('es-MX')} ${dias === 1 ? 'día' : 'días'}`;
}

/**
 * Comprobación de la unidad de cobertura: se usa en las pruebas y como salvaguarda contra
 * reutilizar el resumen con otra unidad.
 */
export const UNIDAD_COBERTURA = 'días';

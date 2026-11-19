/**
 * Pestañas de vista — versión reutilizable del componente de «Pulso comercial ·
 * Walmex».
 *
 * Conserva el aspecto y la animación del original: contenedor en píldora con
 * fondo gris muy claro, indicador blanco con sombra que se desplaza por pasos de
 * 1/N y transición de 260ms, texto inactivo secundario y activo en tinta.
 *
 * Lo único que cambia respecto a Walmex es lo que aporta el Atlas: las etiquetas
 * de sus tres vistas, los iconos del tablero y el estado compartido (la vista se
 * guarda en el store y en la URL). El resto de los valores están copiados tal
 * cual del tablero de Walmex para que ambos se vean iguales.
 *
 * Para compartirlo de verdad entre los dos tableros basta mover este archivo y
 * su bloque `.wm-tabs` a un paquete común; aquí se mantiene autocontenido.
 */

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

export interface OpcionTabsWalmex<T extends string> {
  clave: T;
  etiqueta: string;
  icono?: (props: { tamano?: number }) => ReactElement;
  /** Texto de apoyo para el atributo `title`, como en Walmex. */
  resumen?: string;
}

export function TabsWalmex<T extends string>({
  opciones,
  vista,
  onVista,
  etiquetaGrupo,
  reducirMovimiento = false,
  variante = 'walmex',
}: {
  opciones: OpcionTabsWalmex<T>[];
  vista: T;
  onVista: (clave: T) => void;
  etiquetaGrupo: string;
  reducirMovimiento?: boolean;
  /** walmex conserva la apariencia original; tlas pinta la cápsula con el azul del tablero. */
  variante?: 'walmex' | 'atlas';
}) {
  const raiz = useRef<HTMLElement>(null);
  const indice = Math.max(
    0,
    opciones.findIndex((opcion) => opcion.clave === vista),
  );

  /* La cápsula de Walmex se coloca por pasos de 1/N; como el Atlas añade iconos,
     los botones no miden exactamente lo mismo y se mide la opción activa para
     que la cápsula coincida con ella. El resto del aspecto (superficie, sombra y
     transición de 260ms) es el de Walmex. */
  const [caja, setCaja] = useState({ x: 0, w: 0 });
  const medir = useCallback(() => {
    const contenedor = raiz.current;
    const activo = contenedor?.querySelector<HTMLButtonElement>('.wm-tab.is-activa');
    if (!contenedor || !activo) return;
    setCaja({ x: activo.offsetLeft, w: activo.offsetWidth });
  }, []);

  useEffect(() => {
    medir();
    const contenedor = raiz.current;
    if (!contenedor || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(contenedor);
    for (const boton of contenedor.querySelectorAll('button')) observador.observe(boton);
    window.addEventListener('resize', medir);
    void document.fonts?.ready.then(medir).catch(() => undefined);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [medir, vista, opciones.length]);

  /* Misma semántica que Walmex (nav + aria-current) y flechas para el teclado. */
  const alPulsarTecla = (evento: React.KeyboardEvent<HTMLElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    const destino =
      evento.key === 'Home'
        ? 0
        : evento.key === 'End'
          ? opciones.length - 1
          : evento.key === 'ArrowRight'
            ? (indice + 1) % opciones.length
            : (indice - 1 + opciones.length) % opciones.length;
    const siguiente = opciones[destino];
    if (!siguiente) return;
    onVista(siguiente.clave);
    raiz.current?.querySelectorAll<HTMLButtonElement>('.wm-tab')[destino]?.focus();
  };

  return (
    <nav
      className={`wm-tabs${variante === 'atlas' ? ' wm-tabs--atlas' : ''}`}
      ref={raiz}
      role="tablist"
      aria-label={etiquetaGrupo}
      onKeyDown={alPulsarTecla}
      data-testid="tabs-vistas"
    >
      <span
        className={`wm-tabs-indicador${reducirMovimiento ? ' sin-movimiento' : ''}`}
        style={{
          width: `${caja.w}px`,
          transform: `translateX(${caja.x}px)`,
        }}
        aria-hidden="true"
      />
      {opciones.map((opcion) => {
        const Icono = opcion.icono;
        return (
          <button
            key={opcion.clave}
            type="button"
            role="tab"
            className={`wm-tab${vista === opcion.clave ? ' is-activa' : ''}`}
            aria-selected={vista === opcion.clave}
            aria-current={vista === opcion.clave ? 'page' : undefined}
            title={opcion.resumen}
            onClick={() => onVista(opcion.clave)}
          >
            {Icono ? <Icono tamano={16} /> : null}
            <span>{opcion.etiqueta}</span>
          </button>
        );
      })}
    </nav>
  );
}



/**
 * Pestañas de vista con cápsula compartida.
 *
 * El movimiento sigue el patrón de la receta de Build UI (una sola cápsula que
 * se desplaza y cambia de ancho) sin añadir una biblioteca de animación: la
 * posición y el ancho se miden en el navegador y se animan con transiciones
 * de `transform` y `width`, que se pueden interrumpir y redirigir en cualquier
 * momento.
 *
 * Cada grupo de pestañas mide su propia cápsula: el contenedor declara su
 * ámbito (`.at-tabs`) y no comparte estado con otros grupos.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';

import type { Vista } from '../estado';

export interface OpcionTabs {
  id: Vista;
  etiqueta: string;
  icono: (props: { tamano?: number }) => ReactElement;
}

export function TabsVistas({
  opciones,
  activa,
  onElegir,
  etiquetaGrupo,
}: {
  opciones: OpcionTabs[];
  activa: Vista;
  onElegir: (vista: Vista) => void;
  etiquetaGrupo: string;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [caja, setCaja] = useState<{ x: number; ancho: number; lista: boolean }>({
    x: 0,
    ancho: 0,
    lista: false,
  });

  const medir = useCallback(() => {
    const raiz = contenedor.current;
    if (!raiz) return;
    const boton = raiz.querySelector<HTMLButtonElement>('.at-tabs-btn[aria-selected="true"]');
    if (!boton) return;
    setCaja((previa) => {
      const siguiente = { x: boton.offsetLeft, ancho: boton.offsetWidth, lista: true };
      return previa.lista &&
        Math.abs(previa.x - siguiente.x) < 0.5 &&
        Math.abs(previa.ancho - siguiente.ancho) < 0.5
        ? previa
        : siguiente;
    });
  }, []);

  /* Medición inicial, cambio de vista, tamaño de ventana y carga de fuentes.
     En pantallas estrechas la tira se desplaza: la activa queda a la vista. */
  useLayoutEffect(() => {
    medir();
    const raiz = contenedor.current;
    const boton = raiz?.querySelector<HTMLButtonElement>('.at-tabs-btn[aria-selected="true"]');
    if (boton && raiz && raiz.scrollWidth > raiz.clientWidth) {
      boton.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [medir, activa]);

  useEffect(() => {
    medir();
    const raiz = contenedor.current;
    if (!raiz) return;
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(raiz);
    for (const boton of raiz.querySelectorAll('button')) observador.observe(boton);
    window.addEventListener('resize', medir);
    void document.fonts?.ready.then(medir).catch(() => undefined);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [medir]);

  /* Flechas para recorrer las vistas cuando el foco está en el grupo. */
  const alPulsarTecla = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    const teclas = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!teclas.includes(evento.key)) return;
    const indice = opciones.findIndex((opcion) => opcion.id === activa);
    if (indice < 0) return;
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
    onElegir(siguiente.id);
    const raiz = contenedor.current;
    raiz?.querySelectorAll<HTMLButtonElement>('.at-tabs-btn')[destino]?.focus();
  };

  return (
    <div
      className="at-tabs"
      ref={contenedor}
      role="tablist"
      aria-label={etiquetaGrupo}
      onKeyDown={alPulsarTecla}
    >
      {opciones.map(({ id, etiqueta, icono: Icono }) => (
        <button
          key={id}
          type="button"
          role="tab"
          className="at-tabs-btn"
          aria-selected={activa === id}
          tabIndex={activa === id ? 0 : -1}
          onClick={() => onElegir(id)}
        >
          <Icono tamano={18} />
          <span className="at-tabs-etq">{etiqueta}</span>
          <span className="at-tabs-etq-corta">{etiqueta.split(' ')[0]}</span>
        </button>
      ))}
      <span
        className="at-tabs-capsula"
        aria-hidden="true"
        data-medida={caja.lista ? 'si' : 'no'}
        style={{ ['--x' as string]: `${caja.x}px`, ['--w' as string]: `${caja.ancho}px` }}
      />
    </div>
  );
}




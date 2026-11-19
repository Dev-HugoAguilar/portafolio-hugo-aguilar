/**
 * Punto de entrada del módulo empaquetado.
 *
 * El portafolio (sitio estático, sin empaquetador) lo carga con `import()`
 * dinámico desde `dist/projects/atlas-vial.js` y le pasa el nodo donde debe
 * vivir la aplicación. El tablero se dibuja **dentro** del portafolio: no abre
 * pestañas ni sitios externos.
 */

import { createRoot, type Root } from 'react-dom/client';

import { AtlasApp } from './AtlasApp';
import { resolverApiBase } from './api/cliente';
import { aplicarTema } from './theme';
import './estilos.css';

/** El tema debe existir en `:root` antes de que Radix abra cualquier portal. */
aplicarTema();

export interface OpcionesMontaje {
  /** Base de la API; si se omite se usa `window.PORTFOLIO_ATLAS_API` o el valor local. */
  apiBase?: string;
}

export interface InstanciaTablero {
  unmount: () => void;
  /** Compatibilidad con el contrato del portafolio: los gráficos ya son reactivos. */
  resize: () => void;
}

let raiz: Root | null = null;
let contenedor: HTMLElement | null = null;

export function unmount(): void {
  if (raiz) {
    raiz.unmount();
    raiz = null;
  }
  if (contenedor && contenedor.parentNode) {
    contenedor.parentNode.removeChild(contenedor);
  }
  contenedor = null;
}

export function mount(host: HTMLElement, opciones: OpcionesMontaje = {}): InstanciaTablero {
  unmount();

  contenedor = document.createElement('div');
  contenedor.className = 'at-root';
  host.appendChild(contenedor);

  raiz = createRoot(contenedor);
  raiz.render(<AtlasApp apiBase={resolverApiBase(opciones.apiBase)} />);

  return {
    unmount,
    // El mapa mide su contenedor con ResizeObserver y la tabla es React: no hay
    // nada que recalcular a mano cuando el portafolio cambia de tamaño.
    resize: () => undefined,
  };
}

export default { mount, unmount };



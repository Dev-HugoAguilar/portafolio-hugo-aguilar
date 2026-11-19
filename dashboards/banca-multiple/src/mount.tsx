/**
 * Punto de entrada del módulo empaquetado.
 *
 * El portafolio (sitio estático, sin empaquetador) lo carga con `import()`
 * dinámico desde `dist/projects/comparativo-bancario.js` y le pasa el nodo
 * donde debe vivir la aplicación. La aplicación se dibuja **dentro** del
 * portafolio: no abre pestañas ni sitios externos.
 */

import { createRoot, type Root } from 'react-dom/client';

import { DashboardApp } from './DashboardApp';
import { resolverApiBase } from './api/client';
import './styles.css';
import { aplicarTema } from './theme';

/** El tema debe existir en `:root` antes de que Radix abra cualquier portal. */
aplicarTema();

export interface OpcionesMontaje {
  /** Base de la API; si se omite se usa `window.PORTFOLIO_BANCA_API` o el valor local. */
  apiBase?: string;
}

export interface InstanciaDashboard {
  /** Desmonta React y retira el contenedor del host. */
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

export function mount(host: HTMLElement, opciones: OpcionesMontaje = {}): InstanciaDashboard {
  unmount();

  contenedor = document.createElement('div');
  contenedor.className = 'bm-root';
  host.appendChild(contenedor);

  raiz = createRoot(contenedor);
  raiz.render(<DashboardApp apiBase={resolverApiBase(opciones.apiBase)} />);

  return {
    unmount,
    // Los gráficos miden su contenedor con ResizeObserver: no hay nada que
    // recalcular a mano cuando el portafolio cambia de tamaño o amplía la vista.
    resize: () => undefined,
  };
}

export default { mount, unmount };

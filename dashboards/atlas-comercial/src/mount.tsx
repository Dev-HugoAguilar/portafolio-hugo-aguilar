/**
 * Montaje del tablero dentro del portafolio.
 *
 * `mount(host, opts)` dibuja la aplicación en `host` y devuelve `{ unmount, resize }`,
 * igual que el resto de proyectos. El portafolio nunca abre otra pestaña.
 */

import { createRoot, type Root } from 'react-dom/client';

import { AplicacionComercial } from './App';
import './estilos.css';

export interface OpcionesMontaje {
  apiBase?: string;
}

export interface Instancia {
  unmount: () => void;
  resize: () => void;
}

export function mount(host: HTMLElement, opciones: OpcionesMontaje = {}): Instancia {
  host.innerHTML = '';
  const raiz: Root = createRoot(host);
  raiz.render(<AplicacionComercial apiBase={opciones.apiBase} />);
  return {
    unmount: () => {
      raiz.unmount();
      host.innerHTML = '';
    },
    resize: () => {
      window.dispatchEvent(new Event('resize'));
    },
  };
}

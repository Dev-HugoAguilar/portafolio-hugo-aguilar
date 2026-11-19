/**
 * Punto de entrada del módulo empaquetado.
 *
 * El portafolio lo carga con `import()` dinámico desde
 * `dist/projects/marketing-clientes.js` y le pasa el nodo donde debe vivir la
 * aplicación. El tablero se dibuja **dentro** del portafolio.
 *
 * Además del tablero, este módulo rellena la sección «Hallazgos del análisis» de
 * la ficha del proyecto: el portafolio reserva el hueco (`#hallazgos-host`) y
 * aquí se monta un segundo árbol de React que lo ocupa con los hallazgos
 * calculados sobre toda la muestra publicada. Si la página no tiene ese hueco
 * (por ejemplo, una vista sin ficha), no se monta nada.
 */

import { createRoot, type Root } from 'react-dom/client';

import { MarketingApp } from './App';
import { resolverApiBase } from './api/cliente';
import { aplicarTema } from './theme';
import { Hallazgos } from './ui/Hallazgos';
import './estilos.css';

aplicarTema();

export interface OpcionesMontaje {
  apiBase?: string;
}

export interface InstanciaTablero {
  unmount: () => void;
  resize: () => void;
}

let raiz: Root | null = null;
let contenedor: HTMLElement | null = null;
let raizHallazgos: Root | null = null;
let hostHallazgos: HTMLElement | null = null;
let observadorHallazgos: MutationObserver | null = null;
let esperaHallazgos: number | null = null;

export function unmount(): void {
  if (observadorHallazgos) {
    observadorHallazgos.disconnect();
    observadorHallazgos = null;
  }
  if (esperaHallazgos !== null) {
    window.clearTimeout(esperaHallazgos);
    esperaHallazgos = null;
  }

  if (raiz) {
    raiz.unmount();
    raiz = null;
  }
  if (contenedor && contenedor.parentNode) {
    contenedor.parentNode.removeChild(contenedor);
  }
  contenedor = null;

  if (raizHallazgos) {
    raizHallazgos.unmount();
    raizHallazgos = null;
  }
  if (hostHallazgos) {
    hostHallazgos.textContent = '';
    hostHallazgos = null;
  }
}

/** El tablero ya pintó sus tarjetas con cifras (no con «Sin datos»). */
function tableroConDatos(): boolean {
  const valores = [...document.querySelectorAll('.mk-kpi-valor')];
  return valores.length > 0 && valores.every((nodo) => !(nodo.textContent ?? '').includes('Sin datos'));
}

/**
 * Monta los hallazgos **cuando el tablero ya tiene cifras**.
 *
 * Los hallazgos son consultas adicionales (resumen, conversión, cohortes por país
 * y productos sin filtros). Si se pidieran al mismo tiempo que las del tablero,
 * competirían por la API y las tarjetas tardarían más en mostrar cifras. Por eso
 * se espera a la primera lectura y, si no llega, se monta igualmente pasados unos
 * segundos: la sección nunca queda vacía por un fallo del tablero.
 */
function montarHallazgos(apiBase: string): void {
  const hueco = document.getElementById('hallazgos-host');
  if (!hueco) return;

  const empezar = () => {
    observadorHallazgos?.disconnect();
    observadorHallazgos = null;
    if (esperaHallazgos !== null) {
      window.clearTimeout(esperaHallazgos);
      esperaHallazgos = null;
    }
    /* El hueco puede haberse ido si el visitante cambió de página. */
    if (!hueco.isConnected) return;
    hueco.textContent = '';
    hostHallazgos = hueco;
    raizHallazgos = createRoot(hueco);
    raizHallazgos.render(<Hallazgos apiBase={apiBase} />);
  };

  if (tableroConDatos()) {
    empezar();
    return;
  }

  observadorHallazgos = new MutationObserver(() => {
    if (tableroConDatos()) empezar();
  });
  observadorHallazgos.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  esperaHallazgos = window.setTimeout(empezar, 6000);
}

export function mount(host: HTMLElement, opciones: OpcionesMontaje = {}): InstanciaTablero {
  unmount();

  const apiBase = resolverApiBase(opciones.apiBase);

  contenedor = document.createElement('div');
  contenedor.className = 'mk-root';
  host.appendChild(contenedor);

  raiz = createRoot(contenedor);
  raiz.render(<MarketingApp apiBase={apiBase} />);

  /* «Hallazgos del análisis» de la ficha: se ocupa el hueco que deja el
     portafolio cuando el tablero ya tiene cifras. */
  montarHallazgos(apiBase);

  return { unmount, resize: () => undefined };
}

export default { mount, unmount };

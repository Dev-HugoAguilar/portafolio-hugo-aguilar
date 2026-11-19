/**
 * Tema para el contenido **portalado** del tablero.
 *
 * Radix monta Popover y Dialog en `document.body`, fuera de `.at-app`. Si las
 * variables de color solo se declaran dentro del tablero, el contenido portalado
 * las resuelve vacías y su fondo queda transparente. Por eso los alias `--at-*`
 * se declaran en `:root` (prefijo propio, no pisa el tema del portafolio) y los
 * nombres cortos de la paleta se declaran también en los contenedores portalados.
 */

import { PALETA } from './paleta';

export const ID_ESTILOS_TEMA = 'at-tema-portales';

const CAPAS = {
  panel: 1,
  tooltip: 5,
  flotante: 60,
  velo: 70,
  dialogo: 71,
} as const;

const ALCANCE_PORTALES = [
  '.at-app',
  '.at-pop',
  '.at-dialog',
  '.at-overlay',
  '[data-radix-popper-content-wrapper]',
].join(',\n');

const CSS = `
:root {
  --at-bg: ${PALETA.bg};
  --at-surface: ${PALETA.surface};
  --at-text: ${PALETA.text};
  --at-text2: ${PALETA.textSecondary};
  --at-border: ${PALETA.border};
  --at-primary: ${PALETA.primary};
  --at-violeta: ${PALETA.violeta};
  --at-teal: ${PALETA.teal};
  --at-neutro: ${PALETA.neutro};
  --at-guia: ${PALETA.guia};
  --at-guia-fuerte: ${PALETA.guiaFuerte};
  --at-banda: ${PALETA.banda};

  --at-z-panel: ${CAPAS.panel};
  --at-z-tooltip: ${CAPAS.tooltip};
  --at-z-flotante: ${CAPAS.flotante};
  --at-z-velo: ${CAPAS.velo};
  --at-z-dialogo: ${CAPAS.dialogo};
}

${ALCANCE_PORTALES} {
  --bg: ${PALETA.bg};
  --surface: ${PALETA.surface};
  --text: ${PALETA.text};
  --text-secondary: ${PALETA.textSecondary};
  --border: ${PALETA.border};
  --primary: ${PALETA.primary};
  --viz-purple: ${PALETA.violeta};
  --viz-teal: ${PALETA.teal};
}
`;

/** Declara el tema una sola vez por documento. */
export function aplicarTema(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ID_ESTILOS_TEMA)) return;
  const estilo = document.createElement('style');
  estilo.id = ID_ESTILOS_TEMA;
  estilo.textContent = CSS;
  document.head.appendChild(estilo);
}

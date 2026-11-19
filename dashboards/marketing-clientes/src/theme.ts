/**
 * Tema para el contenido **portalado** del tablero.
 *
 * Radix monta Popover y Dialog en `document.body`, fuera de `.mk-app`. Si las
 * variables de color solo se declaran dentro del tablero, el contenido portalado
 * las resuelve vacías y su fondo queda transparente. Por eso los alias `--mk-*`
 * se declaran en `:root` (prefijo propio, no pisa el tema del portafolio) y los
 * nombres cortos de la paleta se declaran también en los contenedores portalados.
 */

import { PALETA } from './paleta';

export const ID_ESTILOS_TEMA = 'mk-tema-portales';

const CAPAS = {
  panel: 1,
  tooltip: 5,
  flotante: 60,
  velo: 70,
  dialogo: 71,
} as const;

const ALCANCE_PORTALES = [
  '.mk-app',
  '.mk-pop',
  '.mk-dialog',
  '.mk-overlay',
  '[data-radix-popper-content-wrapper]',
].join(',\n');

const CSS = `
:root {
  --mk-bg: ${PALETA.bg};
  --mk-surface: ${PALETA.surface};
  --mk-text: ${PALETA.text};
  --mk-text2: ${PALETA.textSecondary};
  --mk-border: ${PALETA.border};
  --mk-primary: ${PALETA.primary};
  --mk-violeta: ${PALETA.violeta};
  --mk-teal: ${PALETA.teal};
  --mk-neutro: ${PALETA.neutro};
  --mk-guia: ${PALETA.guia};
  --mk-guia-fuerte: ${PALETA.guiaFuerte};
  --mk-banda: ${PALETA.banda};

  --mk-z-panel: ${CAPAS.panel};
  --mk-z-tooltip: ${CAPAS.tooltip};
  --mk-z-flotante: ${CAPAS.flotante};
  --mk-z-velo: ${CAPAS.velo};
  --mk-z-dialogo: ${CAPAS.dialogo};
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

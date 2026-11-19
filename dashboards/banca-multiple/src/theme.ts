/**
 * Tema del dashboard para contenido **portalado**.
 *
 * Radix monta Popover, Select, DropdownMenu y Dialog en `document.body`, fuera de
 * `.bm-app`. Si las variables de color se declaran solo dentro del dashboard, el
 * contenido portalado las resuelve como vacías y su `background` queda
 * transparente: esa era la causa del «desplegable opaco».
 *
 * Solución: los alias `--bm-*` se declaran en `:root` y los nombres cortos de la
 * paleta (`--bg`, `--surface`, …) en los contenedores que existen tanto dentro
 * del dashboard como en el portal. No se declaran los nombres cortos en `:root`
 * a propósito: el portafolio anfitrión usa esos mismos nombres para su propio
 * tema y no se deben pisar.
 */

import { PALETA } from './colors';

export const ID_ESTILOS_TEMA = 'bm-tema-portales';

const CAPAS = {
  /** Guías y marcas dentro del panel. */
  panel: 1,
  /** Tooltips propios de los gráficos. */
  tooltip: 5,
  /** Contenido portalado de Radix (Select, Popover, DropdownMenu). */
  flotante: 60,
  /** Velo del diálogo. */
  velo: 70,
  /** Diálogo de fuentes y metodología. */
  dialogo: 71,
} as const;

const ALCANCE_PORTALES = [
  '.bm-app',
  '.bm-pop',
  '.bm-dialog',
  '.bm-overlay',
  // Contenedor que Radix interpone para posicionar el contenido portalado.
  '[data-radix-popper-content-wrapper]',
].join(',\n');

const CSS = `
:root {
  /* Alias del módulo: prefijo propio para no chocar con el portafolio. */
  --bm-bg: ${PALETA.bg};
  --bm-surface: ${PALETA.surface};
  --bm-text: ${PALETA.text};
  --bm-text2: ${PALETA.textSecondary};
  --bm-border: ${PALETA.border};
  --bm-primary: ${PALETA.primary};
  --bm-secondary: ${PALETA.secondary};
  --bm-teal: ${PALETA.teal};
  --bm-highlight: ${PALETA.highlight};
  --bm-neutro: ${PALETA.neutro};
  --bm-neutro-hover: ${PALETA.neutroHover};
  --bm-guia: ${PALETA.guia};
  --bm-guia-fuerte: ${PALETA.guiaFuerte};
  --bm-banda: ${PALETA.banda};

  /* Escala de capas coherente para todo el módulo. */
  --bm-z-panel: ${CAPAS.panel};
  --bm-z-tooltip: ${CAPAS.tooltip};
  --bm-z-flotante: ${CAPAS.flotante};
  --bm-z-velo: ${CAPAS.velo};
  --bm-z-dialogo: ${CAPAS.dialogo};
}

/* Tokens con los nombres del contrato visual, disponibles en el dashboard y en
   todo lo que Radix portaliza (mismos valores, una sola fuente). */
${ALCANCE_PORTALES} {
  --bg: ${PALETA.bg};
  --surface: ${PALETA.surface};
  --text: ${PALETA.text};
  --text-secondary: ${PALETA.textSecondary};
  --border: ${PALETA.border};
  --primary: ${PALETA.primary};
  --secondary: ${PALETA.secondary};
  --teal: ${PALETA.teal};
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

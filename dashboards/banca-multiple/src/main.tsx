/** Arnés de desarrollo (`npm run dev`). No se empaqueta ni se publica. */

import { createRoot } from 'react-dom/client';

import { DashboardApp } from './DashboardApp';
import { resolverApiBase } from './api/client';
import './styles.css';
import { aplicarTema } from './theme';

aplicarTema();

const host = document.getElementById('raiz');
if (host) {
  createRoot(host).render(<DashboardApp apiBase={resolverApiBase()} />);
}

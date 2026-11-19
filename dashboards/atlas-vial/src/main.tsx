/** Arnés de desarrollo (`npm run dev`). No se empaqueta ni se publica. */

import { createRoot } from 'react-dom/client';

import { AtlasApp } from './AtlasApp';
import { resolverApiBase } from './api/cliente';
import { aplicarTema } from './theme';
import './estilos.css';

aplicarTema();

const host = document.getElementById('raiz');
if (host) {
  createRoot(host).render(<AtlasApp apiBase={resolverApiBase()} />);
}



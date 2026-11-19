import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Prototipo } from './prototipo';

const host = document.getElementById('prototipo');
if (host) {
  createRoot(host).render(
    <StrictMode>
      <Prototipo />
    </StrictMode>,
  );
}

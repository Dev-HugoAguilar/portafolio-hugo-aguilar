import { useLayoutEffect, useRef, useState } from 'react';

/** Mide el ancho disponible del contenedor (gráficos responsivos sin librerías). */
export function useMeasure<T extends HTMLElement>() {
  const referencia = useRef<T | null>(null);
  const [ancho, setAncho] = useState(640);

  useLayoutEffect(() => {
    const nodo = referencia.current;
    if (!nodo) return;
    const medir = () => {
      const { width } = nodo.getBoundingClientRect();
      if (width > 0) setAncho(width);
    };
    medir();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return { referencia, ancho };
}

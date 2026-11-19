/**
 * Selector segmentado del Atlas con cápsula deslizante.
 *
 * Reutiliza el lenguaje visual ya existente (`.at-segmentado`: pista gris
 * `--control-track`, cápsula grafito `--control-active` y texto activo blanco) y le
 * añade el movimiento que ya usan las pestañas: una sola cápsula que se mide en el
 * navegador y se desplaza con `transform`/`width` en 200 ms. Cada instancia tiene su
 * propio identificador (`useId`), así que mover un selector no anima a otro.
 *
 * Semántica: grupo de botones de selección exclusiva (`aria-pressed`), con flechas,
 * Inicio y Fin para el teclado. No envuelve ni sustituye a los filtros desplegables.
 */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export interface OpcionSegmentado<T extends string> {
  valor: T;
  texto: string;
}

export function Segmentado<T extends string>({
  opciones,
  valor,
  onElegir,
  etiqueta,
  testid,
}: {
  opciones: OpcionSegmentado<T>[];
  valor: T;
  onElegir: (valor: T) => void;
  etiqueta: string;
  testid?: string;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const id = useId();
  const [caja, setCaja] = useState<{ x: number; ancho: number; medida: boolean }>({
    x: 0,
    ancho: 0,
    medida: false,
  });

  const medir = useCallback(() => {
    const contenedor = raiz.current;
    if (!contenedor) return;
    const activo = contenedor.querySelector<HTMLButtonElement>('.at-seg.is-activa');
    if (!activo) return;
    setCaja((previa) => {
      const siguiente = { x: activo.offsetLeft, ancho: activo.offsetWidth, medida: true };
      return previa.medida &&
        Math.abs(previa.x - siguiente.x) < 0.5 &&
        Math.abs(previa.ancho - siguiente.ancho) < 0.5
        ? previa
        : siguiente;
    });
  }, []);

  useLayoutEffect(() => {
    medir();
  }, [medir, valor]);

  useEffect(() => {
    medir();
    const contenedor = raiz.current;
    if (!contenedor) return;
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(contenedor);
    for (const boton of contenedor.querySelectorAll('button')) observador.observe(boton);
    window.addEventListener('resize', medir);
    void document.fonts?.ready.then(medir).catch(() => undefined);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [medir]);

  const alPulsarTecla = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(evento.key)) return;
    const indice = opciones.findIndex((opcion) => opcion.valor === valor);
    if (indice < 0) return;
    evento.preventDefault();
    const destino =
      evento.key === 'Home'
        ? 0
        : evento.key === 'End'
          ? opciones.length - 1
          : evento.key === 'ArrowRight'
            ? (indice + 1) % opciones.length
            : (indice - 1 + opciones.length) % opciones.length;
    const siguiente = opciones[destino];
    if (!siguiente) return;
    onElegir(siguiente.valor);
    raiz.current?.querySelectorAll<HTMLButtonElement>('.at-seg')[destino]?.focus();
  };

  return (
    <div
      className="at-segmentado at-segmentado--capsula"
      role="group"
      aria-label={etiqueta}
      data-con-capsula={id}
      data-testid={testid}
      ref={raiz}
      onKeyDown={alPulsarTecla}
    >
      <span
        className="at-seg-capsula"
        aria-hidden="true"
        data-capsula={id}
        data-medida={caja.medida ? 'si' : 'no'}
        style={{ ['--x' as string]: `${caja.x}px`, ['--w' as string]: `${caja.ancho}px` }}
      />
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            className={`at-seg${activa ? ' is-activa' : ''}`}
            aria-pressed={activa}
            onClick={() => onElegir(opcion.valor)}
          >
            {opcion.texto}
          </button>
        );
      })}
    </div>
  );
}

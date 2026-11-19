/**
 * Navegación principal entre las seis pantallas del proyecto.
 *
 * Reproduce el patrón de pestañas del Atlas vial (una sola cápsula que se mide y
 * se desplaza) con el estado activo en grafito, coherente con el selector
 * segmentado del proyecto. No hay filas de pestañas apiladas: esta es la única
 * navegación de secciones del tablero y en pantallas estrechas se desplaza en
 * horizontal dejando la activa a la vista.
 *
 * Cada pestaña es un botón real dentro de un `tablist`: las flechas, Inicio y Fin
 * mueven el foco, y el cambio de pantalla se refleja en la URL (`ac_pantalla`),
 * de modo que recargar, compartir y Atrás/Adelante reproducen la misma vista.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';

export type PantallaId = 'proyecto' | 'datos' | 'exploracion' | 'modelado' | 'evaluacion' | 'resultados';

export interface OpcionPantalla {
  id: PantallaId;
  /** Nombre de la pantalla en la navegación. */
  etiqueta: string;
  /** Etiqueta corta para pantallas estrechas. */
  corta: string;
  /** Descripción corta, usada como `title` accesible. */
  descripcion: string;
  icono: (props: { tamano?: number }) => ReactElement;
}

const trazo = (tamano = 18) => ({
  width: tamano,
  height: tamano,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: 'false' as const,
});

export const PANTALLAS: OpcionPantalla[] = [
  {
    id: 'proyecto',
    etiqueta: 'Proyecto',
    corta: 'Proyecto',
    descripcion: 'Problema, fuentes, alcance y resultados principales',
    icono: ({ tamano }) => (
      <svg {...trazo(tamano)}>
        <path d="M5 4h9l5 5v11H5z" />
        <path d="M14 4v5h5" />
        <path d="M8 13h8M8 16h5" />
      </svg>
    ),
  },
  {
    id: 'datos',
    etiqueta: 'Datos y calidad',
    corta: 'Datos',
    descripcion: 'Fuentes, estructura, cobertura y trazabilidad',
    icono: ({ tamano }) => (
      <svg {...trazo(tamano)}>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
        <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </svg>
    ),
  },
  {
    id: 'exploracion',
    etiqueta: 'Exploración',
    corta: 'Explorar',
    descripcion: 'Panorama, estacionalidad, precios y detalle de artículo',
    icono: ({ tamano }) => (
      <svg {...trazo(tamano)}>
        <path d="M4 19h16" />
        <path d="M7 16v-5M12 16V7M17 16v-8" />
      </svg>
    ),
  },
  {
    id: 'modelado',
    etiqueta: 'Modelado',
    corta: 'Modelo',
    descripcion: 'Datos de entrenamiento, variables, baseline y modelo elegido',
    icono: ({ tamano }) => (
      <svg {...trazo(tamano)}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M17.7 6.3l-2.1 2.1M8.4 15.6l-2.1 2.1" />
      </svg>
    ),
  },
  {
    id: 'evaluacion',
    etiqueta: 'Evaluación',
    corta: 'Evaluar',
    descripcion: 'Protocolo, comparación de modelos y desempeño por segmento',
    icono: ({ tamano }) => (
      <svg {...trazo(tamano)}>
        <path d="M4 15l4-5 4 3 4-6 4 4" />
        <path d="M4 20h16" />
      </svg>
    ),
  },
  {
    id: 'resultados',
    etiqueta: 'Resultados',
    corta: 'Resultados',
    descripcion: 'Pronóstico diario a 28 días y descarga de la selección',
    icono: ({ tamano }) => (
      <svg {...trazo(tamano)}>
        <path d="M4 18h16" />
        <path d="M6 18v-4M10 18v-7M14 18v-3M18 18V8" />
        <path d="M8 12l4-5 3 2 4-5" strokeDasharray="3 2" />
      </svg>
    ),
  },
];

export function NavPantallas({
  activa,
  onElegir,
}: {
  activa: PantallaId;
  onElegir: (pantalla: PantallaId) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [caja, setCaja] = useState<{ x: number; ancho: number; lista: boolean }>({
    x: 0,
    ancho: 0,
    lista: false,
  });

  const medir = useCallback(() => {
    const raiz = contenedor.current;
    if (!raiz) return;
    const boton = raiz.querySelector<HTMLButtonElement>('.ac-tabs-btn[aria-selected="true"]');
    if (!boton) return;
    setCaja((previa) => {
      const siguiente = { x: boton.offsetLeft, ancho: boton.offsetWidth, lista: true };
      return previa.lista &&
        Math.abs(previa.x - siguiente.x) < 0.5 &&
        Math.abs(previa.ancho - siguiente.ancho) < 0.5
        ? previa
        : siguiente;
    });
  }, []);

  useLayoutEffect(() => {
    medir();
    const raiz = contenedor.current;
    const boton = raiz?.querySelector<HTMLButtonElement>('.ac-tabs-btn[aria-selected="true"]');
    if (boton && raiz && raiz.scrollWidth > raiz.clientWidth) {
      boton.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [medir, activa]);

  useEffect(() => {
    medir();
    const raiz = contenedor.current;
    if (!raiz) return;
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(raiz);
    for (const boton of raiz.querySelectorAll('button')) observador.observe(boton);
    window.addEventListener('resize', medir);
    void document.fonts?.ready.then(medir).catch(() => undefined);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [medir]);

  const alPulsarTecla = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    const teclas = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!teclas.includes(evento.key)) return;
    const indice = PANTALLAS.findIndex((pantalla) => pantalla.id === activa);
    if (indice < 0) return;
    evento.preventDefault();
    const destino =
      evento.key === 'Home'
        ? 0
        : evento.key === 'End'
          ? PANTALLAS.length - 1
          : evento.key === 'ArrowRight'
            ? (indice + 1) % PANTALLAS.length
            : (indice - 1 + PANTALLAS.length) % PANTALLAS.length;
    const siguiente = PANTALLAS[destino];
    if (!siguiente) return;
    onElegir(siguiente.id);
    contenedor.current?.querySelectorAll<HTMLButtonElement>('.ac-tabs-btn')[destino]?.focus();
  };

  return (
    <nav className="ac-nav-pantallas" aria-label="Pantallas del proyecto">
      <div
        className="ac-tabs"
        ref={contenedor}
        role="tablist"
        aria-label="Pantallas del proyecto"
        onKeyDown={alPulsarTecla}
        data-testid="nav-pantallas"
      >
        {PANTALLAS.map(({ id, etiqueta, corta, descripcion, icono: Icono }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="ac-tabs-btn"
            aria-selected={activa === id}
            tabIndex={activa === id ? 0 : -1}
            title={descripcion}
            data-pantalla={id}
            onClick={() => onElegir(id)}
          >
            <Icono tamano={17} />
            <span className="ac-tabs-etq">{etiqueta}</span>
            <span className="ac-tabs-etq-corta" aria-hidden="true">
              {corta}
            </span>
          </button>
        ))}
        <span
          className="ac-tabs-capsula"
          aria-hidden="true"
          data-medida={caja.lista ? 'si' : 'no'}
          style={{ ['--x' as string]: `${caja.x}px`, ['--w' as string]: `${caja.ancho}px` }}
        />
      </div>
    </nav>
  );
}

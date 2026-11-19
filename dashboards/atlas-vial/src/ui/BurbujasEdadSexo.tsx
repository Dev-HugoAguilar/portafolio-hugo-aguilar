/**
 * «Edad y sexo de la persona principal»: burbujas reagrupables.
 *
 * Modelo plano: un nodo por combinación real `edad × sexo` con clave estable
 * `edad|sexo`. Una sola escala de área para todas las vistas: `r = k·√valor`, con
 * la misma `k` en Conjunto, Por edad y Por sexo (se elige la mayor con la que las
 * tres caben en la región de dibujo). Nada de filas, columnas ni posiciones por
 * índice: la geometría viene de un empaquetado circular real (`packSiblings`), que
 * coloca los círculos en una masa compacta reservando una separación constante
 * mediante radios de colisión `r + separacion/2`.
 *
 * React dibuja una única colección de nodos y una sola capa de etiquetas; el SVG no
 * recibe texto ajeno a los nodos salvo los encabezados de grupo.
 */

import { packSiblings } from 'd3-hierarchy';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { Personas } from '../api/tipos';
import { decimal, numero } from '../dominio';
import { ETIQUETA_METRICA, PALETA, type Metrica } from '../paleta';

type Cruce = Personas['cruce_edad_sexo'];
type Vista = 'conjunto' | 'edad' | 'sexo';

/* Rosa propio del sexo «Mujer» en este tablero; nunca violeta ni vino. */
const ROSA = '#EC4899';
const GRIS = '#9AA3B2';
const AZUL = PALETA.primary;

/** Separación visual entre círculos (px): se reserva con el radio de colisión. */
const SEPARACION = 4;
/** Holgura mínima entre nodos durante el arrastre. */
const HOLGURA_ARRASTRE = 2;
const ALTO_REGION = 470;
const ALTO_REGION_ESTRECHA = 400;
const ALTO_ENCABEZADO = 20;
const HUECO_GRUPO = 16;

interface Nodo {
  clave: string;
  edad: string;
  sexo: string;
  hechos: number;
  lesionadas: number;
  fallecidas: number;
  valor: number;
}

interface Colocado extends Nodo {
  x: number;
  y: number;
  r: number;
}

interface Encabezado {
  clave: string;
  titulo: string;
  total: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

interface Disposicion {
  nodos: Colocado[];
  encabezados: Encabezado[];
  alto: number;
}

interface Limites {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const localDe = (metrica: Metrica): 'hechos' | 'lesionadas' | 'fallecidas' =>
  metrica === 'personas_lesionadas' ? 'lesionadas' : metrica === 'personas_fallecidas' ? 'fallecidas' : 'hechos';

const COLOR: Record<string, { relleno: string; borde: string }> = {
  hombre: { relleno: AZUL, borde: '#2846CC' },
  mujer: { relleno: ROSA, borde: '#C22C7D' },
  sindato: { relleno: GRIS, borde: '#7C8697' },
  otro: { relleno: '#4B5563', borde: '#39404B' },
};

function tonoSexo(sexo: string) {
  const texto = sexo.toLowerCase();
  if (texto.startsWith('hombre')) return COLOR.hombre!;
  if (texto.startsWith('mujer')) return COLOR.mujer!;
  if (texto.includes('sin dato')) return COLOR.sindato!;
  return COLOR.otro!;
}

function rangoSexo(sexo: string): number {
  const texto = sexo.toLowerCase();
  if (texto.startsWith('hombre')) return 0;
  if (texto.startsWith('mujer')) return 1;
  if (texto.includes('sin dato')) return 2;
  return 3;
}

const ordenEdad = (etiqueta: string) => {
  if (etiqueta.startsWith('Sin edad')) return 999;
  const valor = Number.parseInt(etiqueta.replace(/[^0-9].*$/, ''), 10);
  return Number.isFinite(valor) ? valor : 500;
};

/**
 * Empaquetado circular real: `packSiblings` (d3-hierarchy) coloca los círculos en una
 * masa compacta sin solapes. Se empaqueta con `r + SEPARACION/2` y se conserva `r`
 * como radio visible, de modo que la separación entre bordes queda en SEPARACION.
 */
function empaquetar(items: { clave: string; r: number }[]) {
  if (items.length === 0) {
    return { circulos: [] as { clave: string; x: number; y: number; r: number }[], minX: 0, minY: 0, ancho: 0, alto: 0 };
  }
  const colision = items
    .map((item) => ({ clave: item.clave, r: item.r + SEPARACION / 2 }))
    .sort((a, b) => b.r - a.r || a.clave.localeCompare(b.clave));
  const salida = packSiblings(colision as never) as unknown as {
    clave: string;
    r: number;
    x: number;
    y: number;
  }[];
  const circulos = salida.map((c) => ({
    clave: c.clave,
    x: c.x,
    y: c.y,
    r: Math.max(1, c.r - SEPARACION / 2),
  }));
  const minX = Math.min(...circulos.map((c) => c.x - c.r));
  const maxX = Math.max(...circulos.map((c) => c.x + c.r));
  const minY = Math.min(...circulos.map((c) => c.y - c.r));
  const maxY = Math.max(...circulos.map((c) => c.y + c.r));
  return { circulos, minX, minY, ancho: maxX - minX, alto: maxY - minY };
}

export function BurbujasEdadSexo({
  cruce,
  metrica,
  vista,
  total,
}: {
  cruce: Cruce | null;
  metrica: Metrica;
  /** Agrupación activa; el selector vive en la cabecera de la tarjeta. */
  vista: Vista;
  total: number;
}) {
  const local = localDe(metrica);
  const [contenedor, setContenedor] = useState<HTMLDivElement | null>(null);
  const [ancho, setAncho] = useState(0);
  const [activa, setActiva] = useState<string | null>(null);
  const [arrastre, setArrastre] = useState<string | null>(null);
  const [desplazamientos, setDesplazamientos] = useState<Record<string, { dx: number; dy: number }>>({});
  const puntero = useRef<{
    id: number;
    clave: string;
    x0: number;
    y0: number;
    nodoX: number;
    nodoY: number;
    movido: boolean;
  } | null>(null);

  /* La región solo existe con datos: se mide con una referencia de estado. */
  useEffect(() => {
    if (!contenedor) return;
    const medir = (valor: number) => setAncho((previo) => (Math.abs(previo - valor) < 1 ? previo : valor));
    const observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja) medir(Math.max(240, Math.round(caja.width)));
    });
    observador.observe(contenedor);
    medir(Math.max(240, Math.round(contenedor.getBoundingClientRect().width)));
    return () => observador.disconnect();
  }, [contenedor]);

  const nodos: Nodo[] = useMemo(() => {
    const lista: Nodo[] = [];
    for (const grupo of cruce?.grupos ?? []) {
      for (const celda of grupo.celdas) {
        lista.push({
          clave: `${celda.etiqueta}|${grupo.sexo}`,
          edad: celda.etiqueta,
          sexo: grupo.sexo,
          hechos: celda.hechos,
          lesionadas: celda.lesionadas,
          fallecidas: celda.fallecidas,
          valor: celda[local],
        });
      }
    }
    return lista.sort(
      (a, b) => ordenEdad(a.edad) - ordenEdad(b.edad) || rangoSexo(a.sexo) - rangoSexo(b.sexo),
    );
  }, [cruce, local]);

  const visibles = useMemo(() => nodos.filter((nodo) => nodo.valor > 0), [nodos]);
  const sexos = useMemo(
    () => [...new Set(nodos.map((nodo) => nodo.sexo))].sort((a, b) => rangoSexo(a) - rangoSexo(b)),
    [nodos],
  );

  const agrupar = (por: 'edad' | 'sexo') => {
    const mapa = new Map<string, { clave: string; titulo: string; total: number; nodos: Nodo[] }>();
    for (const nodo of visibles) {
      const clave = nodo[por];
      const actual = mapa.get(clave) ?? { clave, titulo: clave, total: 0, nodos: [] };
      actual.total += nodo.valor;
      actual.nodos.push(nodo);
      mapa.set(clave, actual);
    }
    return [...mapa.values()].sort((a, b) =>
      por === 'edad'
        ? ordenEdad(a.clave) - ordenEdad(b.clave)
        : rangoSexo(a.clave) - rangoSexo(b.clave) || a.clave.localeCompare(b.clave),
    );
  };

  /** Ancho de la región de dibujo: el contenedor menos la columna explicativa. */
  const anchoRegion = Math.max(220, ancho);
  /* En pantallas estrechas la región es más baja para no llenar la página. */
  const altoRegion = ancho > 0 && ancho < 520 ? ALTO_REGION_ESTRECHA : ALTO_REGION;
  /* Banda inferior reservada para las leyendas: el dibujo no la invade. */
  const altoDibujo = altoRegion;
  const maximo = Math.max(1, ...visibles.map((nodo) => nodo.valor));
  /**
   * Geometría de una vista con una constante k dada. Devuelve nodos, encabezados y
   * la altura que ocupa el contenido. Los grupos se calculan para la vista pedida
   * (no para la activa), porque la búsqueda de k evalúa las tres.
   */
  const construir = (k: number, v: Vista): Disposicion => {
    const radio = new Map(visibles.map((nodo) => [nodo.clave, Math.sqrt(nodo.valor) * k]));
    const porClave = new Map(visibles.map((nodo) => [nodo.clave, nodo]));
    const conRadio = (clave: string) => radio.get(clave) ?? 1;

    if (v === 'conjunto') {
      const paquete = empaquetar(visibles.map((nodo) => ({ clave: nodo.clave, r: conRadio(nodo.clave) })));
      const centrarX = (anchoRegion - paquete.ancho) / 2 - paquete.minX;
      const centrarY = (altoDibujo - paquete.alto) / 2 - paquete.minY;
      const nodos: Colocado[] = paquete.circulos.map((circulo) => ({
        ...(porClave.get(circulo.clave) as Nodo),
        x: circulo.x + centrarX,
        y: circulo.y + centrarY,
        r: circulo.r,
      }));
      return { nodos, encabezados: [], alto: altoDibujo };
    }

    const bloques = agrupar(v as 'edad' | 'sexo').map((grupo) => {
      const paquete = empaquetar(grupo.nodos.map((nodo) => ({ clave: nodo.clave, r: conRadio(nodo.clave) })));
      /* El bloque reserva también el ancho del encabezado «título · total». */
      const anchoTitulo = (grupo.titulo.length + 3 + numero(grupo.total).length) * 5.7;
      return {
        grupo,
        paquete,
        ancho: Math.max(paquete.ancho, anchoTitulo),
        alto: paquete.alto + ALTO_ENCABEZADO,
      };
    });

    /* Estanterías de bloques: los círculos siguen empaquetados dentro de cada bloque. */
    const filas: (typeof bloques)[] = [];
    let fila: typeof bloques = [];
    let usado = 0;
    for (const bloque of bloques) {
      if (fila.length > 0 && usado + bloque.ancho + HUECO_GRUPO > anchoRegion - 8) {
        filas.push(fila);
        fila = [];
        usado = 0;
      }
      fila.push(bloque);
      usado += bloque.ancho + HUECO_GRUPO;
    }
    if (fila.length > 0) filas.push(fila);

    const salida: Colocado[] = [];
    const encabezados: Encabezado[] = [];
    let y = 0;
    for (const actual of filas) {
      const altoFila = Math.max(...actual.map((bloque) => bloque.alto));
      const anchoFila = actual.reduce((suma, bloque) => suma + bloque.ancho + HUECO_GRUPO, -HUECO_GRUPO);
      let x = Math.max(4, (anchoRegion - anchoFila) / 2);
      for (const bloque of actual) {
        encabezados.push({
          clave: bloque.grupo.clave,
          titulo: bloque.grupo.titulo,
          total: bloque.grupo.total,
          x,
          y: y + 12,
          ancho: bloque.ancho,
          alto: altoFila,
        });
        const dx = x + (bloque.ancho - bloque.paquete.ancho) / 2 - bloque.paquete.minX;
        const dy = y + ALTO_ENCABEZADO - bloque.paquete.minY;
        for (const circulo of bloque.paquete.circulos) {
          salida.push({
            ...(porClave.get(circulo.clave) as Nodo),
            x: circulo.x + dx,
            y: circulo.y + dy,
            r: circulo.r,
          });
        }
        x += bloque.ancho + HUECO_GRUPO;
      }
      y += altoFila + HUECO_GRUPO;
    }
    return { nodos: salida, encabezados, alto: y - HUECO_GRUPO };
  };

  /** Una sola k para las tres vistas: la mayor con la que las tres caben enteras. */
  const k = useMemo(() => {
    const cabe = (v: Vista, valor: number) => {
      const disposicion = construir(valor, v);
      if (disposicion.nodos.length === 0) return true;
      const margen = v === 'conjunto' ? 0 : Math.max(0, (altoDibujo - disposicion.alto) / 2);
      const abajo = Math.max(...disposicion.nodos.map((nodo) => nodo.y + margen + nodo.r));
      const arriba = Math.min(...disposicion.nodos.map((nodo) => nodo.y + margen - nodo.r));
      const derecha = Math.max(...disposicion.nodos.map((nodo) => nodo.x + nodo.r));
      const izquierda = Math.min(...disposicion.nodos.map((nodo) => nodo.x - nodo.r));
      return arriba >= 2 && abajo <= altoDibujo - 2 && izquierda >= 2 && derecha <= anchoRegion - 2;
    };
    let bajo = 0.05;
    let alto = 6;
    for (let intento = 0; intento < 24; intento += 1) {
      const medio = (bajo + alto) / 2;
      if (cabe('conjunto', medio) && cabe('edad', medio) && cabe('sexo', medio)) bajo = medio;
      else alto = medio;
    }
    return bajo;
  }, [visibles, anchoRegion, altoDibujo]);

  const disposicion = useMemo(() => {
    const base = construir(k, vista);
    if (vista === 'conjunto') return base;
    /* Centrado vertical de la composición agrupada dentro de la región. */
    const margen = Math.max(0, (altoDibujo - base.alto) / 2);
    if (margen < 1) return base;
    return {
      ...base,
      nodos: base.nodos.map((nodo) => ({ ...nodo, y: nodo.y + margen })),
      encabezados: base.encabezados.map((encabezado) => ({ ...encabezado, y: encabezado.y + margen })),
    };
  }, [k, vista, visibles, anchoRegion, altoDibujo]);

  const posicion = (nodo: Colocado) => {
    const desplazamiento = desplazamientos[nodo.clave] ?? { dx: 0, dy: 0 };
    return { x: nodo.x + desplazamiento.dx, y: nodo.y + desplazamiento.dy };
  };

  const limitesDe = (nodo: Colocado): Limites => {
    if (vista === 'conjunto') return { minX: 0, maxX: anchoRegion, minY: 0, maxY: altoDibujo };
    const claveGrupo = vista === 'edad' ? nodo.edad : nodo.sexo;
    const bloque = disposicion.encabezados.find((encabezado) => encabezado.clave === claveGrupo);
    if (!bloque) return { minX: 0, maxX: anchoRegion, minY: 0, maxY: altoDibujo };
    return {
      minX: Math.max(0, bloque.x - 6),
      maxX: Math.min(anchoRegion, bloque.x + bloque.ancho + 6),
      minY: Math.max(0, bloque.y - 16),
      maxY: Math.min(altoDibujo, bloque.y + bloque.alto + 6),
    };
  };

  const acotar = (valor: number, minimo: number, maximo: number, radio: number) =>
    maximo - minimo < radio * 2
      ? (minimo + maximo) / 2
      : Math.min(maximo - radio, Math.max(minimo + radio, valor));

  const alPulsar = (evento: React.PointerEvent<SVGCircleElement>, nodo: Colocado) => {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    puntero.current = {
      id: evento.pointerId,
      clave: nodo.clave,
      x0: evento.clientX,
      y0: evento.clientY,
      nodoX: nodo.x,
      nodoY: nodo.y,
      movido: false,
    };
  };

  const alMover = (evento: React.PointerEvent<SVGSVGElement>) => {
    const actual = puntero.current;
    if (!actual) return;
    /* Desplazamiento total desde el inicio del gesto: no se acumula. */
    const dx = evento.clientX - actual.x0;
    const dy = evento.clientY - actual.y0;
    if (!actual.movido && Math.hypot(dx, dy) > 3) {
      actual.movido = true;
      setArrastre(actual.clave);
      setActiva(null);
    }
    if (!actual.movido) return;
    const nodo = disposicion.nodos.find((candidato) => candidato.clave === actual.clave);
    if (!nodo) return;
    const limites = limitesDe(nodo);
    const destino = {
      dx: acotar(actual.nodoX + dx, limites.minX, limites.maxX, nodo.r) - nodo.x,
      dy: acotar(actual.nodoY + dy, limites.minY, limites.maxY, nodo.r) - nodo.y,
    };
    setDesplazamientos(recolocarCon(actual.clave, destino));
  };

  /**
   * Coloca el nodo tomado en `destino` y separa a los demás hasta eliminar cualquier
   * superposición dentro de los límites de su región. Si el acotado deja un par
   * pegado, se prueba un abanico de posiciones libres alrededor del nodo fijo.
   */
  function recolocarCon(fijo: string, destino: { dx: number; dy: number }) {
    const puntos = disposicion.nodos.map((nodo) => {
      const actual = nodo.clave === fijo ? { x: nodo.x + destino.dx, y: nodo.y + destino.dy } : posicion(nodo);
      return { clave: nodo.clave, x: actual.x, y: actual.y, r: nodo.r, base: nodo };
    });
    for (let pasada = 0; pasada < 60; pasada += 1) {
      let movido = false;
      for (let i = 0; i < puntos.length; i += 1) {
        for (let j = i + 1; j < puntos.length; j += 1) {
          const a = puntos[i]!;
          const b = puntos[j]!;
          const ddx = b.x - a.x;
          const ddy = b.y - a.y;
          const distancia = Math.hypot(ddx, ddy) || 0.001;
          const minimo = a.r + b.r + HOLGURA_ARRASTRE;
          if (distancia >= minimo) continue;
          const empuje = minimo - distancia;
          const ux = ddx / distancia;
          const uy = ddy / distancia;
          if (a.clave === fijo) {
            b.x += ux * empuje;
            b.y += uy * empuje;
          } else if (b.clave === fijo) {
            a.x -= ux * empuje;
            a.y -= uy * empuje;
          } else {
            a.x -= (ux * empuje) / 2;
            a.y -= (uy * empuje) / 2;
            b.x += (ux * empuje) / 2;
            b.y += (uy * empuje) / 2;
          }
          movido = true;
        }
      }
      for (const punto of puntos) {
        if (punto.clave === fijo) continue;
        const limites = limitesDe(punto.base);
        punto.x = acotar(punto.x, limites.minX, limites.maxX, punto.r);
        punto.y = acotar(punto.y, limites.minY, limites.maxY, punto.r);
      }
      if (!movido) break;
    }

    /* Reparación: si el acotado dejó un par pegado, se busca una posición libre. */
    const dentro = (punto: { x: number; y: number; r: number; base: Colocado }) => {
      const limites = limitesDe(punto.base);
      return (
        punto.x - punto.r >= limites.minX - 0.5 &&
        punto.x + punto.r <= limites.maxX + 0.5 &&
        punto.y - punto.r >= limites.minY - 0.5 &&
        punto.y + punto.r <= limites.maxY + 0.5
      );
    };
    const libre = (candidato: { x: number; y: number }, punto: (typeof puntos)[number]) =>
      puntos.every((otro) => {
        if (otro.clave === punto.clave) return true;
        return Math.hypot(candidato.x - otro.x, candidato.y - otro.y) >= punto.r + otro.r + HOLGURA_ARRASTRE - 0.5;
      });
    for (const punto of puntos) {
      if (punto.clave === fijo) continue;
      const solapado = puntos.some(
        (otro) =>
          otro.clave !== punto.clave &&
          Math.hypot(punto.x - otro.x, punto.y - otro.y) < punto.r + otro.r + HOLGURA_ARRASTRE - 0.5,
      );
      if (!solapado) continue;
      const vecino = puntos.find(
        (otro) =>
          otro.clave !== punto.clave &&
          Math.hypot(punto.x - otro.x, punto.y - otro.y) < punto.r + otro.r + HOLGURA_ARRASTRE - 0.5,
      );
      if (!vecino) continue;
      const base = Math.atan2(punto.y - vecino.y, punto.x - vecino.x);
      const distancia = punto.r + vecino.r + HOLGURA_ARRASTRE + 0.5;
      for (let intento = 0; intento < 48; intento += 1) {
        const signo = intento % 2 === 0 ? 1 : -1;
        const paso = Math.ceil(intento / 2) * (Math.PI / 24);
        const angulo = base + signo * paso;
        const candidato = {
          x: vecino.x + Math.cos(angulo) * distancia,
          y: vecino.y + Math.sin(angulo) * distancia,
        };
        const acotadoCandidato = {
          ...punto,
          x: acotar(candidato.x, limitesDe(punto.base).minX, limitesDe(punto.base).maxX, punto.r),
          y: acotar(candidato.y, limitesDe(punto.base).minY, limitesDe(punto.base).maxY, punto.r),
        };
        if (!dentro(acotadoCandidato) || !libre(acotadoCandidato, punto)) continue;
        punto.x = acotadoCandidato.x;
        punto.y = acotadoCandidato.y;
        break;
      }
    }
    const siguiente: Record<string, { dx: number; dy: number }> = {};
    for (const punto of puntos) {
      siguiente[punto.clave] = { dx: punto.x - punto.base.x, dy: punto.y - punto.base.y };
    }
    return siguiente;
  }

  const alSoltar = (evento: React.PointerEvent<SVGSVGElement>) => {
    const actual = puntero.current;
    puntero.current = null;
    if (!actual) return;
    if (evento.currentTarget.hasPointerCapture?.(actual.id)) {
      evento.currentTarget.releasePointerCapture(actual.id);
    }
    if (!actual.movido) setActiva((previo) => (previo === actual.clave ? null : actual.clave));
    setArrastre(null);
  };

  /* Cambiar de agrupación o de métrica vuelve a la composición calculada. */
  useEffect(() => {
    setDesplazamientos({});
    setActiva(null);
  }, [vista, metrica]);

  const detalle = activa ? visibles.find((nodo) => nodo.clave === activa) ?? null : null;
  const nodoActivo = detalle ? disposicion.nodos.find((nodo) => nodo.clave === detalle.clave) ?? null : null;
  const totalEdad = (edad: string) =>
    visibles.filter((nodo) => nodo.edad === edad).reduce((suma, nodo) => suma + nodo.valor, 0);

  if (!cruce || nodos.length === 0) {
    return <p className="at-nota">Sin cruce de edad y sexo con los filtros actuales.</p>;
  }
  if (visibles.length === 0) {
    return (
      <p className="at-nota">
        Todas las combinaciones de edad y sexo están en cero para {ETIQUETA_METRICA[metrica].toLowerCase()}.
      </p>
    );
  }

  const posicionTooltip = () => {
    if (!nodoActivo) return null;
    const punto = posicion(nodoActivo);
    const anchoCaja = 196;
    const altoCaja = 74;
    const izquierda = Math.min(
      anchoRegion - anchoCaja - 4,
      Math.max(4, punto.x + nodoActivo.r + 10),
    );
    const arriba = Math.min(altoDibujo - altoCaja - 4, Math.max(4, punto.y - nodoActivo.r - 8));
    return { left: izquierda, top: arriba };
  };
  const caja = posicionTooltip();

  return (
    <div className="at-bur">
      <div className="at-nr-cuerpo">
        <aside className="at-nr-guia">
          <h4>Cómo leer la gráfica</h4>
          <p>Área: cantidad de la métrica seleccionada.</p>
          <p>Color: sexo de la persona principal.</p>
          <p className="at-nr-pista">Arrastra un círculo para reorganizar su zona.</p>
        </aside>

        <div className="at-nr-region" ref={setContenedor}>
          <svg
            width={anchoRegion}
            height={altoDibujo}
            role="img"
            aria-label={`Burbujas de edad y sexo registrado agrupadas por ${vista === 'conjunto' ? 'el conjunto' : vista}; el área es la cantidad de ${ETIQUETA_METRICA[metrica].toLowerCase()}`}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
            onPointerLeave={alSoltar}
          >
            {disposicion.encabezados.map((encabezado) => (
              <text
                key={encabezado.clave}
                x={encabezado.x}
                y={encabezado.y}
                fontSize={11}
                fontWeight={600}
                fill="#111318"
              >
                {encabezado.titulo} · {numero(encabezado.total)}
              </text>
            ))}

            {disposicion.nodos.map((nodo) => {
              const punto = posicion(nodo);
              const resaltado = activa === nodo.clave;
              /* Texto proporcional al radio, dentro de límites legibles. */
              const tamanoValor = Math.max(10, Math.min(17, nodo.r * 0.26));
              const tamanoEdad = Math.max(8.5, Math.min(13.5, nodo.r * 0.2));
              const anchoValor = numero(nodo.valor).length * tamanoValor * 0.56;
              const anchoEdad = nodo.edad.length * tamanoEdad * 0.52;
              const valorCabe = anchoValor <= nodo.r * 1.6;
              const edadCabe = vista !== 'edad' && anchoEdad <= nodo.r * 1.5;
              const tono = tonoSexo(nodo.sexo);
              return (
                <g
                  key={nodo.clave}
                  style={{
                    transform: `translate(${Math.round(punto.x)}px, ${Math.round(punto.y)}px)`,
                  }}
                  className={`at-nr-nodo${arrastre === nodo.clave ? ' is-arrastrando' : ''}${
                    resaltado ? ' is-activa' : ''
                  }`}
                  data-nodo={nodo.clave}
                >
                  <circle
                    r={nodo.r}
                    fill={tono.relleno}
                    stroke={resaltado ? '#111318' : tono.borde}
                    strokeWidth={resaltado ? 2 : 1}
                    className="at-nr-circulo"
                    tabIndex={0}
                    role="button"
                    aria-label={`${nodo.edad}, ${nodo.sexo}: ${numero(nodo.valor)} ${ETIQUETA_METRICA[metrica].toLowerCase()}`}
                    onPointerDown={(evento) => alPulsar(evento, nodo)}
                    onMouseEnter={() => setActiva(nodo.clave)}
                    onMouseLeave={() => setActiva((previo) => (previo === nodo.clave ? null : previo))}
                    onFocus={() => setActiva(nodo.clave)}
                    onBlur={() => setActiva(null)}
                  />
                  {edadCabe && valorCabe ? (
                    <>
                      <text
                        y={-tamanoEdad * 0.5}
                        textAnchor="middle"
                        fontSize={tamanoEdad}
                        fill="#ffffff"
                        pointerEvents="none"
                      >
                        {nodo.edad}
                      </text>
                      <text
                        y={tamanoValor * 0.78}
                        textAnchor="middle"
                        fontSize={tamanoValor}
                        fontWeight={600}
                        fill="#ffffff"
                        pointerEvents="none"
                      >
                        {numero(nodo.valor)}
                      </text>
                    </>
                  ) : valorCabe || edadCabe ? (
                    <text
                      y={tamanoValor * 0.36}
                      textAnchor="middle"
                      fontSize={tamanoValor}
                      fontWeight={600}
                      fill="#ffffff"
                      pointerEvents="none"
                    >
                      {valorCabe ? numero(nodo.valor) : nodo.edad}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>

          {caja && detalle && !arrastre ? (
            <div
              className="at-nr-tooltip"
              role="status"
              data-testid="burbujas-detalle"
              style={{ left: caja.left, top: caja.top }}
            >
              <p className="at-nr-tooltip-titulo">
                {detalle.edad} · {detalle.sexo}
              </p>
              <p className="at-nr-tooltip-valor">
                {numero(detalle.valor)} {ETIQUETA_METRICA[metrica].toLowerCase()}
                {total > 0 ? ` · ${decimal((100 * detalle.valor) / total).replace('.', ',')} %` : ''}
              </p>
              <p className="at-nr-tooltip-nota">
                {total > 0 ? `de ${numero(total)} del conjunto · ` : ''}
                {numero(detalle.valor)} de {numero(totalEdad(detalle.edad))} en su edad
              </p>
            </div>
          ) : null}

          {/* Leyendas compactas dentro de la región: tamaños arriba, sexo debajo. */}
          <div className="at-nr-leyendas">
            <div className="at-nr-leyenda at-nr-leyenda--tamano">
              <span className="at-nr-leyenda-titulo">Tamaño · {ETIQUETA_METRICA[metrica]}</span>
              {[0.25, 0.5, 1].map((fraccion) => (
                <span className="at-nr-leyenda-item" key={fraccion}>
                  <svg width={22} height={22} aria-hidden="true">
                    <circle cx={11} cy={11} r={Math.max(1.5, Math.sqrt(fraccion) * 9)} fill={GRIS} />
                  </svg>
                  <span>{numero(Math.round(maximo * fraccion))}</span>
                </span>
              ))}
            </div>
            <div className="at-nr-leyenda at-nr-leyenda--sexo">
              <span className="at-nr-leyenda-titulo">Sexo registrado</span>
              {sexos.map((sexo) => (
                <span className="at-nr-leyenda-item" key={sexo}>
                  <span
                    className="at-nr-punto"
                    style={{ background: tonoSexo(sexo).relleno }}
                    aria-hidden="true"
                  />
                  <span>{sexo}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="at-nr-notas">
        <p>
          Valores publicados · {numero(cruce.cobertura.con_edad_y_sexo)} de {numero(cruce.cobertura.hechos)} hechos
          con edad y sexo · {numero(cruce.cobertura.sin_edad)} sin edad · {numero(cruce.cobertura.sin_sexo)} sin sexo.
        </p>
        <p>
          La edad y el sexo describen a la persona principal del expediente. Las personas lesionadas y fallecidas se
          contabilizan en esos hechos; no necesariamente comparten ese perfil.
        </p>
      </div>

      <table className="at-sr">
        <caption>Edad, sexo registrado y cantidades por métrica</caption>
        <thead>
          <tr>
            <th scope="col">Edad</th>
            <th scope="col">Sexo registrado</th>
            <th scope="col">Hechos</th>
            <th scope="col">Lesionadas</th>
            <th scope="col">Fallecidas</th>
          </tr>
        </thead>
        <tbody>
          {nodos.map((nodo) => (
            <tr key={`t-${nodo.clave}`}>
              <td>{nodo.edad}</td>
              <td>{nodo.sexo}</td>
              <td>{numero(nodo.hechos)}</td>
              <td>{numero(nodo.lesionadas)}</td>
              <td>{numero(nodo.fallecidas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

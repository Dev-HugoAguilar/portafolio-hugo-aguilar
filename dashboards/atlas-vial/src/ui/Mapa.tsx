/**
 * Mapa del Atlas vial.
 *
 * Motor: **D3 solo para escalas y formas** y un `canvas` para el dibujo. No hay
 * proveedor de teselas, ni tokens, ni peticiones a terceros: los límites de las
 * 16 alcaldías vienen del GeoJSON oficial servido por la propia API
 * (`/geometria`, CC-BY-4.0-ESP, Marco Geoestadístico 2020 del INEGI) y los
 * puntos, de `/puntos`.
 *
 * Los 30 652 puntos del conjunto se agrupan **en el navegador** según la
 * extensión visible: mover o acercar el mapa no pide datos nuevos y no cambia
 * ningún total. El recorte por la zona visible solo se aplica si la persona lo
 * pide con el botón explícito.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { Extension, FeatureAlcaldia, Geometria, PuntosMapa, FilaAlcaldia } from '../api/tipos';
import { ETIQUETA_METRICA, PALETA, RELLENO_MAPA, UNIDAD_METRICA, colorMapa, rampaMapa, type Metrica } from '../paleta';
import { numero } from '../dominio';
import type { ModoMapa } from '../estado';
import { IconoReiniciar, IconoZoom } from './iconos';

export interface PropsMapa {
  geometria: Geometria | null;
  alcaldias: FilaAlcaldia[];
  puntos: PuntosMapa | null;
  metrica: Metrica;
  modo: ModoMapa;
  alcaldiaSeleccionada: string | null;
  /** Alcaldías del filtro global: si hay una, el mapa la marca como seleccionada. */
  alcaldiasFiltradas: string[];
  folioSeleccionado: string | null;
  filtrarPorZona: boolean;
  cargando: boolean;
  onResaltado: (valor: string | null) => void;
  /** Aplica (o retira) el filtro global de alcaldía desde el mapa. */
  onAlcaldia: (alcaldia: string | null) => void;
  onFolio: (folio: string) => void;
  onFiltrarZona: (bbox: string | null) => void;
  onModo: (modo: ModoMapa) => void;
  onMetrica: (metrica: Metrica) => void;
}

interface Caja {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

interface Grupo {
  x: number;
  y: number;
  n: number;
  folio: string | null;
  lesionadas: number;
  fallecidas: number;
}

const EXTENSION_POR_OMISION: Caja = {
  lonMin: -99.365,
  lonMax: -98.94,
  latMin: 19.048,
  latMax: 19.593,
};

/** Holgura alrededor de la ciudad: el desplazamiento nunca sale de aquí. */
const HOLGURA_CIUDAD = 0.035;
/** Área de la ciudad sin holgura: límite estricto del desplazamiento. */
function ciudadDe(extension: Extension | null | undefined): Caja {
  return cajaDe(extension);
}
/** Acercamiento máximo respecto a la vista que muestra toda la ciudad. */
const ZOOM_MAXIMO = 14;

function cajaDe(extension: Extension | null | undefined): Caja {
  if (!extension) return { ...EXTENSION_POR_OMISION };
  return {
    lonMin: extension.lon_min,
    lonMax: extension.lon_max,
    latMin: extension.lat_min,
    latMax: extension.lat_max,
  };
}

interface Transformacion {
  x: (lon: number) => number;
  y: (lat: number) => number;
  invertir: (x: number, y: number) => { lon: number; lat: number };
  metrosPorPixel: number;
}

/** Proyección equirectangular con corrección por latitud (suficiente a escala urbana). */
function transformacion(caja: Caja, ancho: number, alto: number): Transformacion {
  const latMedia = (caja.latMin + caja.latMax) / 2;
  const cos = Math.cos((latMedia * Math.PI) / 180);
  const rangoLon = Math.max(1e-6, caja.lonMax - caja.lonMin);
  const rangoLat = Math.max(1e-6, caja.latMax - caja.latMin);
  const escalaX = ancho / rangoLon;
  const escalaY = alto / rangoLat;
  const x = (lon: number) => (lon - caja.lonMin) * escalaX;
  const y = (lat: number) => (caja.latMax - lat) * escalaY;
  return {
    x,
    y,
    invertir: (px: number, py: number) => ({
      lon: caja.lonMin + px / escalaX,
      lat: caja.latMax - py / escalaY,
    }),
    metrosPorPixel: (111_320 * cos) / escalaX,
  };
}

/** Ajusta la caja al aspecto del lienzo para no deformar la ciudad. */
function ajustarAspecto(caja: Caja, ancho: number, alto: number): Caja {
  if (!ancho || !alto) return caja;
  const latMedia = (caja.latMin + caja.latMax) / 2;
  const cos = Math.cos((latMedia * Math.PI) / 180);
  const rangoX = (caja.lonMax - caja.lonMin) * cos;
  const rangoY = caja.latMax - caja.latMin;
  const objetivo = ancho / alto;
  const centroLon = (caja.lonMin + caja.lonMax) / 2;
  const centroLat = (caja.latMin + caja.latMax) / 2;
  if (rangoX / rangoY > objetivo) {
    const faltante = rangoX / objetivo - rangoY;
    return {
      lonMin: caja.lonMin,
      lonMax: caja.lonMax,
      latMin: centroLat - rangoY / 2 - faltante / 2,
      latMax: centroLat + rangoY / 2 + faltante / 2,
    };
  }
  const faltante = (rangoY * objetivo) / cos - (caja.lonMax - caja.lonMin);
  return {
    ...caja,
    lonMin: centroLon - (caja.lonMax - caja.lonMin + faltante) / 2,
    lonMax: centroLon + (caja.lonMax - caja.lonMin + faltante) / 2,
    latMin: centroLat - rangoY / 2,
    latMax: centroLat + rangoY / 2,
  };
}

function anillosDe(feature: FeatureAlcaldia): number[][][] {
  return feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.map((poligono) => poligono[0] as number[][]);
}

/**
 * Caja de referencia de la ciudad (extensión oficial + holgura).
 *
 * Es el límite de todo: la vista nunca puede ser mayor que esta caja ni salirse
 * de ella, así que el mapa no se pierde fuera de la Ciudad de México.
 */
function cajaCiudad(extension: Extension | null | undefined): Caja {
  const caja = cajaDe(extension);
  const holguraLon = (caja.lonMax - caja.lonMin) * HOLGURA_CIUDAD;
  const holguraLat = (caja.latMax - caja.latMin) * HOLGURA_CIUDAD;
  return {
    lonMin: caja.lonMin - holguraLon,
    lonMax: caja.lonMax + holguraLon,
    latMin: caja.latMin - holguraLat,
    latMax: caja.latMax + holguraLat,
  };
}

/**
 * Encierra una vista dentro de los límites de la ciudad y del zoom permitido.
 *
 * · `base` es la vista que muestra toda la ciudad en el lienzo actual;
 * · una vista mayor que `base` se reduce a `base` (no se puede alejar más);
 * · una vista menor que `base / ZOOM_MAXIMO` se agranda hasta ese mínimo;
 * · el centro se limita para que el borde de la vista no cruce el de la ciudad.
 */
function limitarVista(candidata: Caja, ciudad: Caja, base: Caja, zoomMaximo = ZOOM_MAXIMO): Caja {
  const anchoBase = base.lonMax - base.lonMin;
  const altoBase = base.latMax - base.latMin;
  let ancho = candidata.lonMax - candidata.lonMin;
  let alto = candidata.latMax - candidata.latMin;
  if (!(ancho > 0) || !(alto > 0)) return base;

  const factor = ancho / anchoBase;
  if (factor > 1) {
    ancho = anchoBase;
    alto = altoBase;
  } else if (factor < 1 / zoomMaximo) {
    const escala = 1 / zoomMaximo;
    ancho = anchoBase * escala;
    alto = altoBase * escala;
  }
  /* Sin acercamiento la vista es exactamente el encuadre de la ciudad: el mapa
     queda estático y ningún gesto —arrastre, rueda o flechas— lo mueve. */
  if (ancho >= anchoBase * 0.999) return base;

  const centrar = (valor: number, minimo: number, maximo: number, tamano: number) => {
    const mitad = tamano / 2;
    const desde = minimo + mitad;
    const hasta = maximo - mitad;
    if (hasta <= desde) return (minimo + maximo) / 2;
    return Math.min(hasta, Math.max(desde, valor));
  };

  /* El centro se limita al **área de la ciudad**: la vista nunca queda fuera de
     la CDMX aunque el encuadre tenga holgura por la proporción del lienzo. */
  const centroLon = centrar((candidata.lonMin + candidata.lonMax) / 2, ciudad.lonMin, ciudad.lonMax, ancho);
  const centroLat = centrar((candidata.latMin + candidata.latMax) / 2, ciudad.latMin, ciudad.latMax, alto);
  return {
    lonMin: centroLon - ancho / 2,
    lonMax: centroLon + ancho / 2,
    latMin: centroLat - alto / 2,
    latMax: centroLat + alto / 2,
  };
}

function puntoEnAnillo(lon: number, lat: number, anillo: number[][]): boolean {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const punto = anillo[i] as number[];
    const previo = anillo[j] as number[];
    const yi = punto[1] as number;
    const yj = previo[1] as number;
    const xi = punto[0] as number;
    const xj = previo[0] as number;
    if (yi > lat !== yj > lat) {
      const cruce = ((xj - xi) * (lat - yi)) / (yj - yi + 1e-15) + xi;
      if (lon < cruce) dentro = !dentro;
    }
  }
  return dentro;
}

export function Mapa({
  geometria,
  alcaldias,
  puntos,
  metrica,
  modo,
  alcaldiaSeleccionada,
  alcaldiasFiltradas,
  folioSeleccionado,
  filtrarPorZona,
  cargando,
  onResaltado,
  onAlcaldia,
  onFolio,
  onFiltrarZona,
  onModo,
  onMetrica,
}: PropsMapa) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const gruposRef = useRef<Grupo[]>([]);
  const cajaRef = useRef<Caja | null>(null);
  const arrastre = useRef<{ x: number; y: number; caja: Caja; movido: boolean } | null>(null);
  /** Un arrastre real no debe terminar en selección. */
  const huboArrastre = useRef(false);

  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  const [vista, setVista] = useState<Caja | null>(null);
  const [hover, setHover] = useState<{
    tipo: 'alcaldia' | 'grupo';
    x: number;
    y: number;
    /** Nombre oficial de la alcaldía, tomado de `properties.nombre` de la geometría. */
    nombre: string;
    grupo?: Grupo;
  } | null>(null);
  const [celdaMetros, setCeldaMetros] = useState<number | null>(null);

  const extension = geometria?.extension ?? puntos?.extension ?? null;

  /** Vista que muestra toda la ciudad: límite de alejamiento y de desplazamiento. */
  const vistaBase = useMemo<Caja | null>(() => {
    if (!tamano.ancho || !tamano.alto) return null;
    return ajustarAspecto(cajaCiudad(extension), tamano.ancho, tamano.alto);
  }, [extension, tamano]);

  /** Alcaldía marcada: la del filtro global si hay exactamente una. */
  const alcaldiaActiva = alcaldiasFiltradas.length === 1 ? alcaldiasFiltradas[0] ?? null : alcaldiaSeleccionada;

  /* Medición del contenedor. */
  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (!caja) return;
      setTamano({ ancho: Math.round(caja.width), alto: Math.round(caja.height) });
    });
    observador.observe(nodo);
    const rect = nodo.getBoundingClientRect();
    setTamano({ ancho: Math.round(rect.width), alto: Math.round(rect.height) });
    return () => observador.disconnect();
  }, []);

  /* Extensión inicial (y al restablecer) ajustada al aspecto del lienzo. */
  useEffect(() => {
    if (vista || !vistaBase) return;
    setVista(vistaBase);
  }, [vistaBase, vista]);

  const porAlcaldia = useMemo(() => {
    const mapa = new Map<string, FilaAlcaldia>();
    for (const fila of alcaldias) {
      if (fila.alcaldia) mapa.set(fila.alcaldia, fila);
    }
    return mapa;
  }, [alcaldias]);

  const maximo = useMemo(() => {
    let tope = 0;
    for (const fila of alcaldias) {
      const valor = metrica === 'hechos' ? fila.hechos : metrica === 'personas_lesionadas' ? fila.lesionadas : fila.fallecidas;
      if (valor > tope) tope = valor;
    }
    return tope;
  }, [alcaldias, metrica]);

  const restablecer = () => {
    setVista(vistaBase ?? ajustarAspecto(cajaCiudad(extension), tamano.ancho, tamano.alto));
    onResaltado(null);
  };

  const desplazar = (factor: number, centro?: { x: number; y: number }) => {
    if (!vista || !tamano.ancho) return;
    const base = vistaBase ?? vista;
    const ancho = vista.lonMax - vista.lonMin;
    const alto = vista.latMax - vista.latMin;
    const puntoX = centro ? centro.x / tamano.ancho : 0.5;
    const puntoY = centro ? centro.y / tamano.alto : 0.5;
    const anclaX = vista.lonMin + ancho * puntoX;
    const anclaY = vista.latMax - alto * puntoY;
    const candidata: Caja = {
      lonMin: anclaX - ancho * factor * puntoX,
      lonMax: anclaX + ancho * factor * (1 - puntoX),
      latMin: anclaY - alto * factor * (1 - puntoY),
      latMax: anclaY + alto * factor * puntoY,
    };
    setVista(limitarVista(candidata, ciudadDe(extension), base));
  };

  /** ¿Se puede acercar / alejar más? Deshabilita los botones en los extremos. */
  const puedeAcercar = Boolean(vista && vistaBase) &&
    (vista!.lonMax - vista!.lonMin) > (vistaBase!.lonMax - vistaBase!.lonMin) / (ZOOM_MAXIMO * 0.999);
  const puedeAlejar = Boolean(vista && vistaBase) &&
    (vista!.lonMax - vista!.lonMin) < (vistaBase!.lonMax - vistaBase!.lonMin) * 0.995;
  /** Solo se puede desplazar cuando hay acercamiento real. */
  const puedeDesplazar = Boolean(vista && vistaBase) &&
    (vista!.lonMax - vista!.lonMin) < (vistaBase!.lonMax - vistaBase!.lonMin) * 0.995;

  /* Dibujo. */
  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo || !vista || !tamano.ancho || !tamano.alto) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    nodo.width = Math.round(tamano.ancho * dpr);
    nodo.height = Math.round(tamano.alto * dpr);
    nodo.style.width = `${tamano.ancho}px`;
    nodo.style.height = `${tamano.alto}px`;
    const contexto = nodo.getContext('2d');
    if (!contexto) return;
    contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
    contexto.clearRect(0, 0, tamano.ancho, tamano.alto);
    contexto.fillStyle = PALETA.bg;
    contexto.fillRect(0, 0, tamano.ancho, tamano.alto);

    const t = transformacion(vista, tamano.ancho, tamano.alto);
    cajaRef.current = vista;

    /* Trama para «Sin dato»: rayado diagonal, distinto del color del cero. */
    const crearTrama = () => {
      const patron = document.createElement('canvas');
      patron.width = 8;
      patron.height = 8;
      const trazo = patron.getContext('2d');
      if (!trazo) return null;
      trazo.fillStyle = '#EDF0F5';
      trazo.fillRect(0, 0, 8, 8);
      trazo.strokeStyle = '#AEB8C7';
      trazo.lineWidth = 1.6;
      trazo.beginPath();
      trazo.moveTo(-2, 6);
      trazo.lineTo(6, -2);
      trazo.moveTo(2, 10);
      trazo.lineTo(10, 2);
      trazo.stroke();
      return contexto.createPattern(patron, 'repeat');
    };
    const tramaSinDato = crearTrama();

    /* --- alcaldías (coroplético o contexto) --- */
    const features = geometria?.features ?? [];
    for (const feature of features) {
      const nombre = feature.properties.nombre;
      const fila = porAlcaldia.get(nombre);
      const seleccionada = alcaldiaActiva === nombre;
      const resaltada = hover?.nombre === nombre;
      const sinDato = !fila;
      let relleno: string | CanvasPattern = sinDato ? tramaSinDato ?? PALETA.banda : PALETA.banda;
      if (modo === 'alcaldias' && fila) {
        const valor = metrica === 'hechos' ? fila.hechos : metrica === 'personas_lesionadas' ? fila.lesionadas : fila.fallecidas;
        /* El cero usa el paso más claro de la escala de su métrica; el valor
           ausente (sin fila) usa la trama. Nunca comparten representación. */
        relleno = valor <= 0 ? (rampaMapa(metrica)[0] as string) : colorMapa(metrica, valor, maximo);
      } else if (seleccionada && !sinDato) {
        relleno = PALETA.tinteAzul;
      } else if (!sinDato) {
        relleno = '#EDF0F6';
      }
      contexto.beginPath();
      for (const anillo of anillosDe(feature)) {
        anillo.forEach((punto, indice) => {
          const px = t.x(punto[0] as number);
          const py = t.y(punto[1] as number);
          if (indice === 0) contexto.moveTo(px, py);
          else contexto.lineTo(px, py);
        });
        contexto.closePath();
      }
      contexto.fillStyle = relleno;
      contexto.fill();
      contexto.strokeStyle = '#FFFFFF';
      contexto.lineWidth = 2.4;
      contexto.stroke();

      /* Límite entre alcaldías: trazo oscuro y constante para que la frontera
         se lea siempre, también sobre los rellenos más intensos. */
      contexto.strokeStyle = seleccionada
        ? PALETA.primary
        : resaltada
          ? PALETA.text
          : '#596273';
      contexto.lineWidth = seleccionada ? 2.6 : resaltada ? 2.2 : 1.3;
      contexto.lineJoin = 'round';
      contexto.stroke();
    }

    /* --- puntos --- */
    const datos = puntos;
    const grupos: Grupo[] = [];
    if (datos && datos.folios.length > 0) {
      const celda = modo === 'concentracion' ? 12 : modo === 'eventos' ? 18 : 6;
      const mapa = new Map<string, Grupo>();
      const total = datos.folios.length;
      for (let i = 0; i < total; i++) {
        const lat = datos.lat[i];
        const lon = datos.lon[i];
        if (lat === undefined || lon === undefined) continue;
        const px = t.x(lon);
        const py = t.y(lat);
        if (px < -20 || py < -20 || px > tamano.ancho + 20 || py > tamano.alto + 20) continue;
        const clave = `${Math.floor(px / celda)}:${Math.floor(py / celda)}`;
        const existente = mapa.get(clave);
        const les = datos.lesionadas[i] ?? 0;
        const fal = datos.fallecidas[i] ?? 0;
        if (existente) {
          existente.n += 1;
          existente.lesionadas += les;
          existente.fallecidas += fal;
          existente.folio = null;
        } else {
          mapa.set(clave, {
            x: px,
            y: py,
            n: 1,
            folio: datos.folios[i] ?? null,
            lesionadas: les,
            fallecidas: fal,
          });
        }
      }
      grupos.push(...mapa.values());
      gruposRef.current = grupos;

      const color = RELLENO_MAPA[metrica];
      if (modo === 'alcaldias') {
        contexto.globalAlpha = 0.28;
        contexto.fillStyle = color;
        for (const grupo of grupos) {
          contexto.beginPath();
          contexto.arc(grupo.x, grupo.y, 1.6, 0, Math.PI * 2);
          contexto.fill();
        }
        contexto.globalAlpha = 1;
      } else if (modo === 'concentracion') {
        const mayor = grupos.reduce((tope, grupo) => Math.max(tope, grupo.n), 1);
        for (const grupo of grupos) {
          const proporcion = Math.sqrt(grupo.n / mayor);
          const radio = 2 + proporcion * 16;
          contexto.globalAlpha = 0.22 + 0.6 * proporcion;
          contexto.fillStyle = color;
          contexto.beginPath();
          contexto.arc(grupo.x, grupo.y, radio, 0, Math.PI * 2);
          contexto.fill();
        }
        contexto.globalAlpha = 1;
        setCeldaMetros(Math.round(celda * t.metrosPorPixel));
      } else {
        const mayor = grupos.reduce((tope, grupo) => Math.max(tope, grupo.n), 1);
        for (const grupo of grupos) {
          if (grupo.n === 1) {
            contexto.fillStyle = color;
            contexto.beginPath();
            contexto.arc(grupo.x, grupo.y, 2.4, 0, Math.PI * 2);
            contexto.fill();
            continue;
          }
          const proporcion = Math.sqrt(grupo.n / mayor);
          const radio = 5 + proporcion * 9;
          contexto.fillStyle = color;
          contexto.globalAlpha = 0.9;
          contexto.beginPath();
          contexto.arc(grupo.x, grupo.y, radio, 0, Math.PI * 2);
          contexto.fill();
          contexto.globalAlpha = 1;
          contexto.strokeStyle = '#FFFFFF';
          contexto.lineWidth = 1.2;
          contexto.stroke();
          if (radio >= 9.5) {
            contexto.fillStyle = '#FFFFFF';
            contexto.font = '600 10px Inter, system-ui, sans-serif';
            contexto.textAlign = 'center';
            contexto.textBaseline = 'middle';
            contexto.fillText(String(grupo.n), grupo.x, grupo.y);
          }
        }
        setCeldaMetros(null);
      }

      /* Hecho seleccionado: anillo discreto, sin animación continua. */
      if (folioSeleccionado) {
        const indice = datos.folios.indexOf(folioSeleccionado);
        if (indice >= 0) {
          const lat = datos.lat[indice] as number;
          const lon = datos.lon[indice] as number;
          contexto.strokeStyle = PALETA.text;
          contexto.lineWidth = 1.6;
          contexto.beginPath();
          contexto.arc(t.x(lon), t.y(lat), 7, 0, Math.PI * 2);
          contexto.stroke();
          contexto.fillStyle = PALETA.text;
          contexto.beginPath();
          contexto.arc(t.x(lon), t.y(lat), 2.6, 0, Math.PI * 2);
          contexto.fill();
        }
      }
    }
  }, [
    vista,
    tamano,
    geometria,
    porAlcaldia,
    puntos,
    modo,
    metrica,
    maximo,
    alcaldiaActiva,
    folioSeleccionado,
    hover?.nombre,
  ]);

  /* --- interacción --- */
  const aCoordenadas = (evento: React.PointerEvent | React.MouseEvent) => {
    const rect = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
  };

  const alcaldiaEn = (x: number, y: number): string | null => {
    if (!vista || !geometria || !tamano.ancho) return null;
    const t = transformacion(vista, tamano.ancho, tamano.alto);
    const { lon, lat } = t.invertir(x, y);
    for (const feature of geometria.features) {
      for (const anillo of anillosDe(feature)) {
        if (puntoEnAnillo(lon, lat, anillo)) return feature.properties.nombre;
      }
    }
    return null;
  };

  const grupoEn = (x: number, y: number): Grupo | null => {
    let mejor: Grupo | null = null;
    let distancia = 18;
    for (const grupo of gruposRef.current) {
      const dx = grupo.x - x;
      const dy = grupo.y - y;
      const d = Math.hypot(dx, dy);
      const radio = grupo.n === 1 ? 6 : 10;
      if (d < Math.max(radio, distancia * 0.5) && d < distancia) {
        distancia = d;
        mejor = grupo;
      }
    }
    return mejor;
  };

  const onMove = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    if (arrastre.current) {
      const dx = evento.clientX - arrastre.current.x;
      const dy = evento.clientY - arrastre.current.y;
      /* Umbral de 4 px: un clic con temblor del puntero no mueve el mapa. */
      if (!arrastre.current.movido && Math.hypot(dx, dy) < 4) return;
      /* En la vista completa el mapa es estático: sin acercamiento no se arrastra. */
      if (!puedeDesplazar) return;
      arrastre.current.movido = true;
      huboArrastre.current = true;
      const ancho = arrastre.current.caja.lonMax - arrastre.current.caja.lonMin;
      const alto = arrastre.current.caja.latMax - arrastre.current.caja.latMin;
      const unidadX = ancho / tamano.ancho;
      const unidadY = alto / tamano.alto;
      const candidata: Caja = {
        lonMin: arrastre.current.caja.lonMin - dx * unidadX,
        lonMax: arrastre.current.caja.lonMax - dx * unidadX,
        latMin: arrastre.current.caja.latMin + dy * unidadY,
        latMax: arrastre.current.caja.latMax + dy * unidadY,
      };
      /* El arrastre está acotado: no se puede salir de la Ciudad de México. */
      setVista(limitarVista(candidata, ciudadDe(extension), vistaBase ?? candidata));
      return;
    }
    const { x, y } = aCoordenadas(evento);
    /* El tooltip siempre declara la alcaldía: si el punto no cae en ningún
       polígono no se muestra nada, en lugar de un globo sin nombre. */
    const nombre = alcaldiaEn(x, y);
    const grupo = grupoEn(x, y);
    if (grupo && nombre) {
      setHover({ tipo: 'grupo', x, y, nombre, grupo });
      onResaltado(nombre);
      return;
    }
    if (nombre) {
      setHover({ tipo: 'alcaldia', x, y, nombre });
      onResaltado(nombre);
    } else {
      setHover(null);
      onResaltado(null);
    }
  };

  const onLeave = () => {
    setHover(null);
    onResaltado(null);
    arrastre.current = null;
  };

  const onClick = (evento: React.MouseEvent<HTMLCanvasElement>) => {
    /* Un arrastre no selecciona: el gesto de explorar no debe cambiar el filtro. */
    if (huboArrastre.current) {
      huboArrastre.current = false;
      return;
    }
    const { x, y } = aCoordenadas(evento);
    /* El clic **nunca** cambia el zoom ni el centro. En el modo «Eventos», un
       clic sobre un hecho concreto abre su detalle; en el resto, elige la
       alcaldía y aplica el filtro global. */
    if (modo === 'eventos') {
      const grupo = grupoEn(x, y);
      if (grupo && grupo.n === 1 && grupo.folio) {
        onFolio(grupo.folio);
        return;
      }
    }
    const nombre = alcaldiaEn(x, y);
    onAlcaldia(nombre);
  };

  const onRueda = (evento: React.WheelEvent<HTMLCanvasElement>) => {
    evento.preventDefault();
    const { x, y } = aCoordenadas(evento);
    desplazar(evento.deltaY > 0 ? 1.25 : 0.8, { x, y });
  };

  const onTeclado = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    if (!vista) return;
    const paso = 0.12;
    const mover = (factorX: number, factorY: number) => {
      const ancho = vista.lonMax - vista.lonMin;
      const alto = vista.latMax - vista.latMin;
      const candidata: Caja = {
        lonMin: vista.lonMin + ancho * factorX,
        lonMax: vista.lonMax + ancho * factorX,
        latMin: vista.latMin + alto * factorY,
        latMax: vista.latMax + alto * factorY,
      };
      /* Teclado, rueda y arrastre comparten el mismo límite. */
      setVista(limitarVista(candidata, ciudadDe(extension), vistaBase ?? candidata));
    };
    switch (evento.key) {
      case 'ArrowLeft':
        mover(-paso, 0);
        break;
      case 'ArrowRight':
        mover(paso, 0);
        break;
      case 'ArrowUp':
        mover(0, paso);
        break;
      case 'ArrowDown':
        mover(0, -paso);
        break;
      case '+':
      case '=':
        desplazar(0.8);
        break;
      case '-':
        desplazar(1.25);
        break;
      case 'Home':
        restablecer();
        break;
      default:
        return;
    }
    evento.preventDefault();
  };

  /** Valor de la métrica activa por alcaldía; `null` = sin dato con estos filtros. */
  const valorDe = (nombre: string): number | null => {
    const fila = porAlcaldia.get(nombre);
    if (!fila) return null;
    return metrica === 'hechos' ? fila.hechos : metrica === 'personas_lesionadas' ? fila.lesionadas : fila.fallecidas;
  };

  const etiquetaValor = (nombre: string): string => {
    const valor = valorDe(nombre);
    return valor === null ? 'Sin dato' : `${numero(valor)}`;
  };

  /** Cifra de una métrica concreta; «Sin dato» si la alcaldía no tiene registro. */
  const cifraDe = (nombre: string, cual: Metrica): string => {
    const fila = porAlcaldia.get(nombre);
    if (!fila) return 'Sin dato';
    const valor = cual === 'hechos' ? fila.hechos : cual === 'personas_lesionadas' ? fila.lesionadas : fila.fallecidas;
    return numero(valor);
  };

  const extensionTexto = useMemo(() => {
    if (!vista) return '';
    const km = Math.round(((vista.lonMax - vista.lonMin) * 111.32 * Math.cos((19.3 * Math.PI) / 180)));
    return `${km} km de ancho aproximado`;
  }, [vista]);

  const cajaVisible = vista
    ? `${vista.lonMin.toFixed(5)},${vista.latMin.toFixed(5)},${vista.lonMax.toFixed(5)},${vista.latMax.toFixed(5)}`
    : null;

  return (
    <section className="at-panel at-panel--mapa" aria-labelledby="at-t-mapa" data-testid="panel-mapa">
      <div className="at-panel-head">
        <div>
          <h3 id="at-t-mapa">Dónde ocurren los hechos</h3>
          <p className="at-panel-sub">
            {modo === 'alcaldias'
              ? `${ETIQUETA_METRICA[metrica]} por alcaldía · los puntos son los hechos geolocalizados`
              : modo === 'concentracion'
                ? 'Densidad de hechos por celda · la celda cambia con el zoom'
                : 'Hechos agrupados por cercanía · un círculo con número reúne varios hechos'}
          </p>
        </div>
        <div className="at-mapa-acciones">
          <button
            type="button"
            className="at-btn at-btn--mini"
            onClick={() => desplazar(0.8)}
            aria-label="Acercar"
            data-testid="mapa-acercar"
            disabled={!puedeAcercar}
          >
            <IconoZoom />
          </button>
          <button
            type="button"
            className="at-btn at-btn--mini"
            onClick={() => desplazar(1.25)}
            aria-label="Alejar"
            data-testid="mapa-alejar"
            disabled={!puedeAlejar}
          >
            <IconoZoom />
            <span aria-hidden="true">−</span>
          </button>
          <button
            type="button"
            className="at-btn at-btn--mini"
            onClick={restablecer}
            data-testid="mapa-encuadrar"
          >
            <IconoReiniciar />
            <span>Extensión CDMX</span>
          </button>
        </div>
      </div>

      {/* Controles en dos filas alineadas: modos + selector de alcaldía arriba,
          métrica del mapa abajo. Alturas y líneas base comunes. */}
      <div className="at-mapa-barra">
        <div className="at-mapa-fila">
          <div className="at-segmentado" role="group" aria-label="Modo del mapa">
            {(
              [
                ['alcaldias', 'Alcaldías'],
                ['concentracion', 'Concentración'],
                ['eventos', 'Eventos'],
              ] as [ModoMapa, string][]
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                className={`at-seg${modo === valor ? ' is-activa' : ''}`}
                onClick={() => onModo(valor)}
                aria-pressed={modo === valor}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className="at-mapa-fila">
          <div className="at-segmentado" role="group" aria-label="Métrica del mapa">
            {(
              [
                ['hechos', 'Hechos'],
                ['personas_lesionadas', 'Lesionadas'],
                ['personas_fallecidas', 'Fallecidas'],
              ] as [Metrica, string][]
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                className={`at-seg${metrica === valor ? ' is-activa' : ''}`}
                onClick={() => onMetrica(valor)}
                aria-pressed={metrica === valor}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="at-mapa-caja"
        ref={contenedor}
        tabIndex={0}
        onKeyDown={onTeclado}
        aria-label="Área del mapa: usa los botones para acercar y alejar, y las flechas para moverlo cuando esté acercado"
        data-vista={vista ? `${vista.lonMin.toFixed(5)},${vista.latMin.toFixed(5)},${vista.lonMax.toFixed(5)},${vista.latMax.toFixed(5)}` : ''}
        data-desplazable={puedeDesplazar ? 'si' : 'no'}
      >
        <canvas
          ref={lienzo}
          className="at-mapa-lienzo"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onPointerDown={(evento) => {
            huboArrastre.current = false;
            arrastre.current = {
              x: evento.clientX,
              y: evento.clientY,
              caja: vista ?? cajaDe(extension),
              movido: false,
            };
            (evento.currentTarget as HTMLCanvasElement).setPointerCapture(evento.pointerId);
          }}
          onPointerUp={() => {
            arrastre.current = null;
          }}
          onPointerCancel={() => {
            arrastre.current = null;
          }}
          onClick={onClick}
          onWheel={onRueda}
          role="img"
          aria-label={`Mapa de la Ciudad de México con ${numero(puntos?.mostrados ?? 0)} hechos geolocalizados. Usa las flechas para mover el mapa, + y − para acercar o alejar, y el botón «Extensión CDMX» para volver.`}
        />

        {hover ? (
          <div
            className={`at-tooltip at-tooltip--mapa${hover.x > tamano.ancho - 190 ? ' at-tooltip--izquierda' : ''}`}
            style={{ left: hover.x + 12, top: Math.max(8, hover.y - 8) }}
            role="status"
          >
            {hover.tipo === 'alcaldia' ? (
              <>
                <p className="at-tooltip-title">{hover.nombre}</p>
                <dl className="at-tooltip-lista">
                  <div>
                    <dt>{ETIQUETA_METRICA[metrica]}</dt>
                    <dd>{etiquetaValor(hover.nombre ?? '')}</dd>
                  </div>
                  {(['hechos', 'personas_lesionadas', 'personas_fallecidas'] as Metrica[])
                    .filter((cual) => cual !== metrica)
                    .map((cual) => (
                      <div key={cual}>
                        <dt>
                          {cual === 'hechos' ? 'Hechos' : cual === 'personas_lesionadas' ? 'Lesionadas' : 'Fallecidas'}
                        </dt>
                        <dd>{cifraDe(hover.nombre, cual)}</dd>
                      </div>
                    ))}
                </dl>
                <p className="at-tooltip-nota">
                  {porAlcaldia.get(hover.nombre)
                    ? `${porAlcaldia.get(hover.nombre)?.porcentaje_hechos ?? '—'} % de los hechos filtrados · Haz clic para seleccionar la alcaldía`
                    : 'Sin dato con los filtros actuales'}
                </p>
              </>
            ) : (
              <>
                <p className="at-tooltip-title">{hover.nombre}</p>
                <dl className="at-tooltip-lista">
                  <div>
                    <dt>{ETIQUETA_METRICA[metrica]}</dt>
                    <dd>{etiquetaValor(hover.nombre)}</dd>
                  </div>
                  {(['hechos', 'personas_lesionadas', 'personas_fallecidas'] as Metrica[])
                    .filter((cual) => cual !== metrica)
                    .map((cual) => (
                      <div key={cual}>
                        <dt>
                          {cual === 'hechos' ? 'Hechos' : cual === 'personas_lesionadas' ? 'Lesionadas' : 'Fallecidas'}
                        </dt>
                        <dd>{cifraDe(hover.nombre, cual)}</dd>
                      </div>
                    ))}
                </dl>
                <p className="at-tooltip-nota">
                  {hover.grupo?.n === 1
                    ? 'Haz clic para ver el detalle del hecho'
                    : `Haz clic para seleccionar la alcaldía · ${numero(hover.grupo?.n ?? 0)} hechos en este grupo`}
                </p>
              </>
            )}
          </div>
        ) : null}

      </div>

      {/* El pie va fuera del lienzo: así no tapa ninguna alcaldía. */}
      <div className="at-mapa-pie">
        <button
          type="button"
          className={`at-btn at-btn--zona${filtrarPorZona ? ' is-activo' : ''}`}
          onClick={() => onFiltrarZona(filtrarPorZona ? null : cajaVisible)}
          disabled={!cajaVisible}
        >
          {filtrarPorZona ? 'Quitar filtro por zona visible' : 'Filtrar por zona visible'}
        </button>
        <p className="at-mapa-nota">
          {filtrarPorZona
            ? 'Las cifras están recortadas a la zona visible del mapa.'
            : 'Mover o acercar el mapa no cambia las cifras; el recorte se aplica solo si lo pides.'}
          {extensionTexto ? ` · ${extensionTexto}` : ''}
        </p>
      </div>

      <div className="at-leyenda" aria-label="Leyenda del mapa">
        {modo === 'alcaldias' ? (
          <>
            <div className="at-leyenda-rampa">
              <span className="at-leyenda-titulo">{ETIQUETA_METRICA[metrica]} por alcaldía</span>
              <span className="at-leyenda-min">0</span>
              <span
                className="at-leyenda-barra"
                style={{
                  background: `linear-gradient(90deg, ${rampaMapa(metrica)[0]}, ${rampaMapa(metrica)[3]}, ${
                    rampaMapa(metrica)[6]
                  })`,
                }}
                aria-hidden="true"
              />
              <span className="at-leyenda-max">`n                {numero(maximo)} {UNIDAD_METRICA[metrica]}`n              </span>
            </div>
            <span className="at-leyenda-sindato">
              <span className="at-leyenda-sindato-muestra" aria-hidden="true" />
              Sin dato
            </span>
          </>
        ) : (
          <span className="at-leyenda-titulo">
            {modo === 'concentracion'
              ? 'Densidad de hechos por celda'
              : 'Hechos agrupados por cercanía'}
          </span>
        )}
        <ul className="at-leyenda-items">
          <li>
            <span className="at-punto" style={{ background: RELLENO_MAPA[metrica] }} aria-hidden="true" />
            {modo === 'alcaldias'
              ? `Puntos: ${ETIQUETA_METRICA[metrica]}`
              : `Círculos: color de ${ETIQUETA_METRICA[metrica].toLowerCase()}`}
          </li>
          {modo !== 'alcaldias' ? (
            <li>El número del círculo cuenta hechos agrupados</li>
          ) : null}
          {celdaMetros ? (
            <li className="at-leyenda-celda">celda de ≈ {numero(celdaMetros)} m en esta vista</li>
          ) : null}
        </ul>
        {geometria ? (
          <p className="at-mapa-atribucion">
            Límites: {geometria.atribucion.conjunto} · {geometria.atribucion.licencia} ·{' '}
            {geometria.atribucion.version} ·{' '}
            <a href={geometria.atribucion.portal} target="_blank" rel="noreferrer">
              datos.cdmx.gob.mx
            </a>
          </p>
        ) : null}
      </div>

      {cargando ? <p className="at-mapa-cargando">Consultando los puntos del mapa…</p> : null}
    </section>
  );
}























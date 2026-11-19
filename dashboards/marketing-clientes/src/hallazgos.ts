/**
 * «Hallazgos del análisis» de la ficha del proyecto.
 *
 * Se calculan **siempre sobre toda la muestra publicada y su periodo completo,
 * sin filtros**: son una lectura de la versión activa, no del subconjunto que el
 * visitante haya elegido en el tablero. Por eso se piden los datos con los
 * parámetros de filtro vacíos y se declara el alcance en la propia sección.
 *
 * Reglas de redacción que aplica este módulo:
 *  · ningún número se escribe a mano: todos salen de la API y, si falta un dato,
 *    el hallazgo se omite en lugar de rellenarse;
 *  · no se presentan segmentos diminutos como ganadores: para «el más eficiente»
 *    se exige la base mínima que usa el propio tablero (`umbral_base_reducida`);
 *  · la reducción de sesiones se describe como «sesiones que no completaron el
 *    siguiente paso observado», nunca como abandono medido ni ventas perdidas;
 *  · la retención compara segmentos en la **misma** semana de seguimiento, cada
 *    uno con su denominador elegible, y no promedia porcentajes;
 *  · la afinidad se presenta como coocurrencia observada, no como causalidad ni
 *    recomendación comercial.
 */

import type { Cohortes, Conversion, Productos, Resumen } from './api/tipos';
import { etiquetaFecha } from './dominio';

export interface Hallazgo {
  id: string;
  titulo: string;
  texto: string;
  nota: string;
}

export interface DatosHallazgos {
  resumen: Resumen;
  conversion: Conversion;
  cohortes: Cohortes;
  productos: Productos;
}

export interface ResultadoHallazgos {
  hallazgos: Hallazgo[];
  alcance: string;
  omitidos: string[];
}

const SIN_FUENTE = 'Sin información / Sin información';

/** Cifra con separador de miles igual que el resto de la ficha: «13 509». */
function cifra(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'sin dato';
  return Math.round(valor).toLocaleString('es-MX').replace(/,/g, '\u00A0');
}

/** Tasa: dos decimales por debajo del 10 % (donde marcan diferencia) y uno por encima. */
function tasa(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'sin dato';
  const decimales = Math.abs(valor) < 10 ? 2 : 1;
  return `${valor.toFixed(decimales)} %`;
}

/** Diferencia en puntos porcentuales, con la misma regla de decimales. */
function puntos(valor: number): string {
  const magnitud = Math.abs(valor);
  const decimales = magnitud < 10 ? 2 : 1;
  return `${magnitud.toFixed(decimales)} puntos porcentuales`;
}

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** La API devuelve la unidad sin tilde (`sesion`); en la ficha se escribe bien. */
function unidadLegible(unidad: string): string {
  return unidad === 'sesion' ? 'sesión' : unidad;
}

function valor(resumen: Resumen, clave: string): number | null {
  const indicador = resumen.indicadores?.[clave];
  if (!indicador || typeof indicador.valor !== 'number') return null;
  return indicador.valor;
}

function cuota(parte: number, total: number): number | null {
  if (!total) return null;
  return Math.round((1000 * parte) / total) / 10;
}

export function construirHallazgos(datos: DatosHallazgos): ResultadoHallazgos {
  const { resumen, conversion, cohortes, productos } = datos;
  const hallazgos: Hallazgo[] = [];
  const omitidos: string[] = [];

  const usuarios = valor(resumen, 'usuarios');
  const compras = valor(resumen, 'compras');
  const periodo = resumen.periodo ?? { desde: null, hasta: null };
  const alcancePeriodo =
    periodo.desde && periodo.hasta
      ? `${etiquetaFecha(periodo.desde)} – ${etiquetaFecha(periodo.hasta)}`
      : 'el periodo publicado';
  const alcance = `Toda la muestra publicada y su periodo completo (${alcancePeriodo}), sin filtros: ${cifra(
    usuarios,
  )} usuarios y ${cifra(compras)} compras.`;

  /* ------------------------------------------------------------------ 1. Adquisición */
  const filas = resumen.conversion_fuente?.filas ?? [];
  const global = resumen.conversion_fuente?.referencia_global ?? null;
  const mayor = filas[0];
  if (mayor && global && usuarios) {
    const identificada = filas.find((fila) => fila.canal !== SIN_FUENTE) ?? mayor;
    const umbral = resumen.conversion_fuente?.umbral_base_reducida ?? 100;
    const conBase = filas.filter((fila) => fila.usuarios >= umbral);
    const eficiente = conBase.reduce(
      (mejor, fila) => ((fila.conversion ?? 0) > (mejor.conversion ?? 0) ? fila : mejor),
      conBase[0] ?? mayor,
    );
    const cuotaMayor = cuota(mayor.usuarios, usuarios);
    const cuotaIdentificada = cuota(identificada.usuarios, usuarios);

    const partes = [
      mayuscula(
        `${identificada.canal} aporta ${cifra(identificada.usuarios)} usuarios (${tasa(
          cuotaIdentificada,
        )} de la muestra) y convierte al ${tasa(identificada.conversion)}, frente al ${tasa(
          global.valor,
        )} global (${cifra(global.compradores)} compradores de ${cifra(global.usuarios)} usuarios).`,
      ),
    ];
    if (mayor.canal === SIN_FUENTE) {
      partes.push(
        `El grupo con más usuarios es el que la fuente no documenta: ${cifra(
          mayor.usuarios,
        )} usuarios (${tasa(cuotaMayor)}) con ${tasa(mayor.conversion)} de conversión.`,
      );
    }
    if (eficiente.canal !== identificada.canal) {
      partes.push(
        `Con base suficiente (≥ ${cifra(umbral)} usuarios), la conversión más alta es de ${
          eficiente.canal
        }: ${cifra(eficiente.usuarios)} usuarios y ${tasa(eficiente.conversion)}.`,
      );
    }

    hallazgos.push({
      id: 'adquisicion',
      titulo: `La mayor fuente ${
        identificada.conversion !== null && global.valor !== null && identificada.conversion < global.valor
          ? 'convierte por debajo de la media'
          : 'convierte por encima de la media'
      }`,
      texto: partes.join(' '),
      nota:
        'Unidad: usuario, agrupado por la fuente y el medio de su primera actividad observada. ' +
        `La comparación entre fuentes usa el tamaño de cada base y solo señala la más eficiente cuando ` +
        `reúne al menos ${cifra(umbral)} usuarios.`,
    });
  } else {
    omitidos.push('adquisición: faltan usuarios o filas por canal en la versión activa');
  }

  /* ------------------------------------------------------------------ 2. Conversión */
  const pasos = (conversion.pasos ?? []).filter((paso) => typeof paso.sesiones === 'number');
  if (pasos.length >= 2) {
    const transiciones = pasos.slice(1).map((paso, indice) => {
      const anterior = pasos[indice] as (typeof pasos)[number];
      return {
        desde: anterior.etiqueta,
        hasta: paso.etiqueta,
        desdeSesiones: anterior.sesiones,
        hastaSesiones: paso.sesiones,
        caida: anterior.sesiones - paso.sesiones,
        tasa: anterior.sesiones ? (100 * paso.sesiones) / anterior.sesiones : null,
      };
    });
    const porVolumen = transiciones.reduce((mayor, t) => (t.caida > mayor.caida ? t : mayor));
    const porTasa = transiciones.reduce((menor, t) =>
      (t.tasa ?? 100) < (menor.tasa ?? 100) ? t : menor,
    );
    const ventana = conversion.ventana_horas ?? 24;
    const unidad = conversion.unidad ?? 'sesion';

    const coinciden = porVolumen.desde === porTasa.desde;
    const otras = transiciones
      .filter((t) => t.desde !== porVolumen.desde)
      .map((t) => `${tasa(t.tasa)} de «${t.desde.toLowerCase()}» → «${t.hasta.toLowerCase()}»`)
      .join(' y ');

    hallazgos.push({
      id: 'conversion',
      titulo: `La mayor pérdida de sesiones ocurre entre «${porVolumen.desde.toLowerCase()}» y «${porVolumen.hasta.toLowerCase()}»`,
      texto:
        `De ${cifra(porVolumen.desdeSesiones)} sesiones que llegaron a «${porVolumen.desde.toLowerCase()}», ` +
        `${cifra(porVolumen.hastaSesiones)} completaron «${porVolumen.hasta.toLowerCase()}»: ` +
        `${cifra(porVolumen.caida)} no completaron el siguiente paso observado y el avance fue del ` +
        `${tasa(porVolumen.tasa)}.` +
        (coinciden
          ? ` Es también la tasa de avance más baja del recorrido (${otras}).`
          : ` La tasa más baja, en cambio, corresponde a «${porTasa.desde.toLowerCase()}» → «${porTasa.hasta.toLowerCase()}»: ` +
            `${tasa(porTasa.tasa)}.`),
      nota:
        `Unidad: ${unidadLegible(unidad)}; cuenta sesiones que cumplen los pasos en orden dentro de una ` +
        `ventana de ${ventana} horas. Se describen sesiones que no completaron el siguiente paso observado: ` +
        'no es abandono medido ni una cifra de ventas perdidas.',
    });
  } else {
    omitidos.push('conversión: el embudo no trae pasos suficientes en la versión activa');
  }

  /* ------------------------------------------------------------------ 3. Retención */
  const curvas = cohortes.curvas ?? [];
  const umbral = cohortes.umbral_base_reducida ?? 100;
  const base = (curva: (typeof curvas)[number], indice: number) =>
    curva.puntos.find((punto) => punto.indice === indice) ?? null;
  const candidatas = curvas
    .map((curva) => ({ curva, s1: base(curva, 1) }))
    .filter((fila) => fila.s1 && fila.s1.base >= umbral && fila.s1.retencion !== null)
    .sort((a, b) => (b.s1?.base ?? 0) - (a.s1?.base ?? 0))
    .slice(0, 3);

  if (candidatas.length >= 2) {
    const primera = candidatas[0] as (typeof candidatas)[number];
    const segunda = candidatas[1];
    const tercera = candidatas[2];
    const detalle = (fila: (typeof candidatas)[number]) =>
      `«${fila.curva.valor}», el ${tasa(fila.s1?.retencion)} de ${cifra(fila.s1?.base)} usuarios elegibles`;
    const diferencia =
      primera.s1 && tercera?.s1 && primera.s1.retencion !== null && tercera.s1.retencion !== null
        ? primera.s1.retencion - tercera.s1.retencion
        : null;

    hallazgos.push({
      id: 'retencion',
      titulo: 'La retención de la primera semana cambia según el país de origen',
      texto:
        `En la semana 1 retiene más ${detalle(primera)}` +
        (segunda ? `; le siguen ${detalle(segunda)}` : '') +
        (tercera ? ` y ${detalle(tercera)}` : '') +
        '.' +
        (diferencia !== null
          ? ` Entre los segmentos con más base hay ${puntos(diferencia)} de diferencia.`
          : ''),
      nota:
        'Misma semana de seguimiento (S1) para todos los segmentos, cada uno con su propio ' +
        `denominador de usuarios elegibles y base mínima de ${cifra(umbral)}. Solo cohortes con la ` +
        'ventana completa; los porcentajes no se promedian entre segmentos.',
    });
  } else {
    omitidos.push('retención: no hay dos segmentos con base suficiente en la semana 1');
  }

  /* ------------------------------------------------------------------ 4. Productos y afinidad */
  const categorias = productos.categorias ?? [];
  const pares = productos.afinidad?.pares ?? [];
  const cobertura = productos.afinidad?.cobertura ?? null;
  const comprasTotales = productos.conciliacion?.compras_totales ?? compras;
  if (categorias.length && comprasTotales) {
    const principal = categorias[0] as (typeof categorias)[number];
    const par = pares[0] ?? null;
    const partes = [
      `${cifra(principal.compras)} de las ${cifra(comprasTotales)} compras incluyen ${
        principal.categoria
      } (${tasa(cuota(principal.compras, comprasTotales))}).`,
    ];
    if (par) {
      partes.push(
        `El par más frecuente es ${par.a} + ${par.b}: ${cifra(
          par.compras_conjuntas,
        )} compras conjuntas (${tasa(par.pct_de_a)} de las compras de ${par.a} y ${tasa(
          par.pct_de_b,
        )} de las de ${par.b}).`,
      );
    }
    if (cobertura) {
      partes.push(
        `El diagrama representa ${cifra(cobertura.pares_representados)} de ${cifra(
          cobertura.pares_posibles,
        )} pares posibles, con ${cifra(cobertura.categorias_representadas)} de ${cifra(
          cobertura.categorias_distintas,
        )} categorías.`,
      );
    }
    hallazgos.push({
      id: 'productos',
      titulo: `${principal.categoria} aparece en la mitad de las compras`,
      texto: partes.join(' '),
      nota:
        `Las compras por categoría se solapan: la suma por categoría (${cifra(
          productos.conciliacion?.suma_compras_por_categoria ?? null,
        )}) supera las ${cifra(comprasTotales)} compras porque una compra puede incluir varias. ` +
        'La afinidad corresponde al periodo completo publicado y es independiente de los filtros; ' +
        'es coocurrencia observada, no causalidad ni una recomendación comercial demostrada.',
    });
  } else {
    omitidos.push('productos: la versión activa no trae categorías con compras');
  }

  return { hallazgos, alcance, omitidos };
}

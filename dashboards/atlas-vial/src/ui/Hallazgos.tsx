/**
 * Hallazgos del análisis.
 *
 * Se calculan **con los datos y los filtros vigentes**, no con un texto fijo: si
 * el filtro cambia, cambian las cifras. Todas las frases son descriptivas y
 * verificables con la propia interfaz; ninguna afirma una causa, porque el
 * conjunto no la registra.
 *
 * Cuando un hallazgo no se puede sostener (por ejemplo, con cero hechos) se
 * omite en lugar de rellenarse con texto genérico.
 */

import type { Resumen, Tiempo, FilaAlcaldia, Personas } from '../api/tipos';
import { etiquetaHora, numero, porcentaje } from '../dominio';

export interface Hallazgo {
  clave: string;
  titulo: string;
  detalle: string;
}

export interface PropsHallazgos {
  resumen: Resumen | null;
  alcaldias: FilaAlcaldia[];
  tiempo: Tiempo | null;
  personas: Personas | null;
  cargando: boolean;
}

/** Fallecidas por cada 100 hechos de la categoría (tasa descriptiva interna). */
function porCien(fallecidas: number, hechos: number): number | null {
  if (!hechos) return null;
  return (100 * fallecidas) / hechos;
}

export function calcularHallazgos({
  resumen,
  alcaldias,
  tiempo,
  personas,
}: Omit<PropsHallazgos, 'cargando'>): Hallazgo[] {
  if (!resumen) return [];
  const total = resumen.indicadores.hechos.valor;
  if (total === 0) return [];

  const hallazgos: Hallazgo[] = [];

  /* 1. Dónde se concentran los hechos. */
  const conNombre = alcaldias.filter((fila) => Boolean(fila.alcaldia));
  if (conNombre.length >= 2) {
    const ordenadas = [...conNombre].sort((a, b) => b.hechos - a.hechos);
    const primera = ordenadas[0];
    const ultima = ordenadas[ordenadas.length - 1];
    if (primera && ultima && primera.hechos > 0) {
      hallazgos.push({
        clave: 'territorio',
        titulo: 'Concentración territorial',
        detalle:
          `${primera.alcaldia} reúne ${numero(primera.hechos)} hechos ` +
          `(${porcentaje((100 * primera.hechos) / total)} del filtro) frente a ` +
          `${numero(ultima.hechos)} de ${ultima.alcaldia}. ` +
          `Son volúmenes registrados, no tasas: el conjunto no publica población.`,
      });
    }
  }

  /* 2. Peso de los hechos con personas fallecidas. */
  const conFallecimientos = resumen.indicadores.hechos_con_fallecimientos.valor;
  if (conFallecimientos > 0) {
    hallazgos.push({
      clave: 'fallecimientos',
      titulo: 'Hechos con personas fallecidas',
      detalle:
        `${numero(conFallecimientos)} de ${numero(total)} hechos ` +
        `(${porcentaje(resumen.indicadores.hechos_con_fallecimientos.porcentaje ?? null)}) ` +
        `registran al menos una persona fallecida, con ` +
        `${numero(resumen.indicadores.personas_fallecidas.valor)} personas fallecidas en total ` +
        `y ${numero(resumen.indicadores.personas_lesionadas.valor)} lesionadas.`,
    });
  }

  /* 3. Tipo de evento más frecuente frente al de mayor letalidad registrada. */
  const tipos = tiempo?.distribuciones.tipo_evento ?? [];
  if (tipos.length >= 2) {
    const masFrecuente = [...tipos].sort((a, b) => b.hechos - a.hechos)[0];
    const conTasa = tipos
      .filter((fila) => fila.hechos >= 50)
      .map((fila) => ({ fila, tasa: porCien(fila.fallecidas, fila.hechos) ?? 0 }))
      .sort((a, b) => b.tasa - a.tasa)[0];
    if (masFrecuente) {
      const parte =
        `${masFrecuente.valor ?? 'Sin dato'} es el tipo más frecuente: ` +
        `${numero(masFrecuente.hechos)} hechos (${porcentaje((100 * masFrecuente.hechos) / total)}).`;
      const contraste =
        conTasa && conTasa.fila.valor !== masFrecuente.valor
          ? ` El mayor registro de fallecidas por cada 100 hechos está en ` +
            `${conTasa.fila.valor ?? 'Sin dato'} (${conTasa.tasa.toFixed(2).replace('.', ',')}), ` +
            `frente a ${(porCien(masFrecuente.fallecidas, masFrecuente.hechos) ?? 0)
              .toFixed(2)
              .replace('.', ',')} de ${masFrecuente.valor ?? 'Sin dato'}: ` +
            `frecuencia y letalidad registrada no coinciden.`
          : '';
      hallazgos.push({
        clave: 'tipo-evento',
        titulo: 'Tipo de evento',
        detalle: parte + contraste,
      });
    }
  }

  /* 4. Momento del día y de la semana con más registros. */
  const celdas = tiempo?.matriz.celdas ?? [];
  if (celdas.length > 0) {
    const porHora = new Map<number, number>();
    const porDia = new Map<number, number>();
    for (const celda of celdas) {
      porHora.set(celda.hora, (porHora.get(celda.hora) ?? 0) + celda.hechos);
      porDia.set(celda.dia_semana, (porDia.get(celda.dia_semana) ?? 0) + celda.hechos);
    }
    const totalMatriz = tiempo?.matriz.total_hechos ?? 0;
    const horaTop = [...porHora.entries()].sort((a, b) => b[1] - a[1])[0];
    const diaTop = [...porDia.entries()].sort((a, b) => b[1] - a[1])[0];
    const dias = tiempo?.matriz.dias ?? [];
    if (horaTop && diaTop && totalMatriz > 0) {
      const tarde = (porHora.get(18) ?? 0) + (porHora.get(19) ?? 0) + (porHora.get(20) ?? 0);
      hallazgos.push({
        clave: 'tiempo',
        titulo: 'Cuándo ocurren',
        detalle:
          `La hora con más hechos registrados es ${etiquetaHora(horaTop[0])} ` +
          `(${numero(horaTop[1])}) y el día con más registros es ` +
          `${dias[diaTop[0]] ?? 'sin dato'} (${numero(diaTop[1])}). ` +
          `Entre las 18:00 y las 20:59 se concentra el ${porcentaje((100 * tarde) / totalMatriz)}.`,
      });
    }
  }

  /* 5. Tipo de persona registrado y cobertura del dato. */
  const usuarios = personas?.por_tipo_usuario ?? [];
  if (usuarios.length >= 2 && personas) {
    const principal = usuarios[0];
    if (principal) {
      hallazgos.push({
        clave: 'personas',
        titulo: 'Tipo de persona registrado',
        detalle:
          `${principal.etiqueta} es el registro más frecuente: ${numero(principal.hechos)} hechos ` +
          `(${porcentaje(principal.porcentaje)}). El archivo trae una persona por hecho ` +
          `(la principal del expediente), así que estas cifras no reparten a todas las víctimas.`,
      });
    }
  }

  return hallazgos.slice(0, 4);
}

export function Hallazgos({ resumen, alcaldias, tiempo, personas, cargando }: PropsHallazgos) {
  const hallazgos = calcularHallazgos({ resumen, alcaldias, tiempo, personas });

  if (hallazgos.length === 0) {
    return (
      <p className="at-hallazgos-vacio">
        {cargando
          ? 'Calculando hallazgos con los filtros activos…'
          : 'Con los filtros actuales no hay hechos suficientes para describir un hallazgo.'}
      </p>
    );
  }

  return (
    <ul className="at-hallazgos" data-testid="hallazgos">
      {hallazgos.map((hallazgo) => (
        <li key={hallazgo.clave}>
          <p className="at-hallazgo-titulo">
            {hallazgo.titulo}
          </p>
          <p className="at-hallazgo-texto">{hallazgo.detalle}</p>
        </li>
      ))}
    </ul>
  );
}

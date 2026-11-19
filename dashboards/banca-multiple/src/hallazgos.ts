/**
 * Hallazgos del análisis.
 *
 * Cálculo **determinista** (sin LLM) sobre los mismos datos que alimentan los
 * gráficos: `resumen`, `series` e `indicadores` de la API más los filtros
 * activos. No lee elementos visuales, no depende del hover ni del zoom, y no
 * inventa cifras: cada conclusión se arma con una plantilla y solo se emite
 * cuando su base es válida; si no lo es, se explica la limitación.
 *
 * Reglas financieras respetadas:
 *  - La participación solo se usa cuando es interpretable (saldos en millones).
 *  - Las diferencias entre porcentajes se expresan en **puntos porcentuales**.
 *  - ROA y ROE no se suman ni se promedian: se muestran por institución.
 *  - No se atribuyen causas ni se equipara tamaño con desempeño.
 */

import type {
  FilaInstitucion,
  Indicadores,
  Kpis,
  SerieInstitucion,
} from './api/types';
import { etiquetaPeriodo, indice100, mesesEntre, porcentaje } from './domain';

export type PanelDestino = 'ranking' | 'evolucion' | 'dispersion' | 'tabla';

export interface Hallazgo {
  id: 'concentracion' | 'posicion' | 'crecimiento' | 'rentabilidad';
  /** «Sistema» o «Selección»: separa el contexto global del comparado. */
  ambito: 'sistema' | 'seleccion';
  titulo: string;
  conclusion: string;
  /** Cifra destacada de la tarjeta. */
  cifra: string;
  cifraNota?: string;
  /** Concepto, fechas y alcance de la comparación. */
  alcance: string;
  panel: PanelDestino;
  /** Definición y fuente, para el tooltip y la nota de la tarjeta. */
  definicion: string;
  /** Filas de detalle (se muestran plegadas). */
  detalle?: Array<{ etiqueta: string; valor: string }>;
}

export interface EntradaHallazgos {
  /** Nombre legible del concepto activo. */
  concepto: string;
  periodo: string;
  /** Participación interpretable (saldos en millones). */
  participacionValida: boolean;
  kpis: Kpis | null;
  filas: FilaInstitucion[];
  seleccion: string[];
  series: SerieInstitucion[];
  /** Fechas de comparación elegidas en el panel de crecimiento. */
  comparacion: { desde: string; hasta: string } | null;
  indicadores: Indicadores | null;
  indicadoresPeriodo: string;
  /** Flujo acumulado: solo se comparan cortes del mismo mes. */
  esFlujo: boolean;
}

export interface ResultadoHallazgos {
  hallazgos: Hallazgo[];
  /** Hallazgos que no se emiten y por qué (solo con selección activa). */
  omitidos: string[];
  /** Invitación única cuando no hay instituciones seleccionadas. */
  invitacion: string | null;
  /** Aviso sobre la vigencia de las cifras mostradas. */
  avisoVigencia: string | null;
}

const pp = (valor: number) => `${Math.abs(valor) < 0.005 ? '0.00' : porcentaje(Math.abs(valor))}`;
const conSigno = (valor: number) => `${valor > 0 ? '+' : valor < 0 ? '−' : ''}${pp(valor)}`;
const nombreDe = (fila: FilaInstitucion) => fila.institucion;

/** Posición ordinal en español («1.º», «2.º»…). */
const ordinal = (posicion: number) => `${posicion}.º`;

export function construirHallazgos(entrada: EntradaHallazgos): ResultadoHallazgos {
  const {
    concepto,
    periodo,
    participacionValida,
    kpis,
    filas,
    seleccion,
    series,
    comparacion,
    indicadores,
    indicadoresPeriodo,
    esFlujo,
  } = entrada;

  const hallazgos: Hallazgo[] = [];
  const omitidos: string[] = [];
  const sinSeleccion = seleccion.length === 0;

  const bancos = filas.filter((fila) => !fila.es_sistema && fila.valor !== null);
  const seleccionados = bancos.filter((fila) => seleccion.includes(fila.institucion_id));
  const alcanceBase = `${concepto} · ${etiquetaPeriodo(periodo)}`;

  /* ------------------------------------------------------------ 1. concentración */
  if (participacionValida && kpis?.concentracion_top5_pct !== null && kpis?.concentracion_top5_pct !== undefined) {
    const top5 = kpis.concentracion_top5_pct;
    const total = kpis.instituciones_con_dato;
    const resto = Math.max(0, total - 5);
    const ordenadas = [...bancos].sort(
      (a, b) => (b.participacion_pct ?? 0) - (a.participacion_pct ?? 0),
    );
    hallazgos.push({
      id: 'concentracion',
      ambito: 'sistema',
      titulo: 'Concentración del sector',
      /* La cifra destacada es el top 5; el texto añade quién pesa más y cuántas
         instituciones quedan fuera, sin repetir el porcentaje. */
      conclusion: ordenadas[0]
        ? `El mayor peso es de ${nombreDe(ordenadas[0] as FilaInstitucion)} (${porcentaje(
            (ordenadas[0] as FilaInstitucion).participacion_pct,
          )} %); las cuatro siguientes completan el grupo y ${resto} instituciones más con dato se reparten el resto.`
        : 'No hay participaciones publicadas que sumar en el grupo de las cinco mayores.',
      cifra: `${porcentaje(top5)} %`,
      cifraNota: 'top 5 sobre el total publicado',
      alcance: `${alcanceBase} · sistema completo, no depende de la selección`,
      panel: 'ranking',
      definicion:
        'Suma de las participaciones de las cinco mayores instituciones frente al total publicado por la CNBV. Es contexto del sector: no cambia al seleccionar bancos ni mide desempeño.',
      detalle: ordenadas.slice(0, 5).map((fila) => ({
        etiqueta: `${fila.posicion ? ordinal(fila.posicion) + ' ' : ''}${nombreDe(fila)}`,
        valor: `${porcentaje(fila.participacion_pct)} %`,
      })),
    });
  } else {
    omitidos.push(
      'Concentración: la participación sobre el total no es interpretable para este concepto (flujos o porcentajes).',
    );
  }

  /* ---------------------------------------------------------------- 2. posición */
  if (sinSeleccion) {
    /* Sin selección no se enumeran advertencias: se invita una sola vez al final. */
  } else if (!participacionValida) {
    omitidos.push(
      'Posición con participación: el concepto no se expresa en saldos, así que solo se ordena por importe.',
    );
  } else {
    const conPosicion = [...seleccionados].sort(
      (a, b) => (a.posicion ?? 999) - (b.posicion ?? 999),
    );
    const top5 = conPosicion.filter((fila) => (fila.posicion ?? 999) <= 5).length;
    const primera = conPosicion[0] as FilaInstitucion;
    const ultima = conPosicion[conPosicion.length - 1] as FilaInstitucion;
    const frase =
      conPosicion.length <= 2
        ? conPosicion
            .map(
              (fila) =>
                `${nombreDe(fila)} ${fila.posicion ? `ocupa el ${ordinal(fila.posicion)} lugar` : 'no tiene posición publicada'}${
                  fila.participacion_pct !== null
                    ? ` con ${porcentaje(fila.participacion_pct)} % del sistema`
                    : ''
                }`,
            )
            .join('; ')
        : `De ${conPosicion.length} bancos comparados, ${top5} están entre los cinco mayores; el mayor es ${nombreDe(
            primera,
          )} (${primera.posicion ? ordinal(primera.posicion) : 's/p'}, ${porcentaje(
            primera.participacion_pct,
          )} %) y el menor es ${nombreDe(ultima)} (${
            ultima.posicion ? ordinal(ultima.posicion) : 's/p'
          }, ${porcentaje(ultima.participacion_pct)} %).`;

    hallazgos.push({
      id: 'posicion',
      ambito: 'seleccion',
      titulo: 'Posición en el universo comparable',
      conclusion: `${frase}.`,
      cifra:
        conPosicion.length === 1
          ? primera.posicion
            ? ordinal(primera.posicion)
            : '—'
          : `${top5} de ${conPosicion.length} en el top 5`,
      cifraNota:
        conPosicion.length === 1
          ? 'lugar en el boletín del periodo'
          : 'bancos comparados dentro de los cinco mayores',
      alcance: `${alcanceBase} · selección de ${conPosicion.length} ${
        conPosicion.length === 1 ? 'institución' : 'instituciones'
      }`,
      panel: 'ranking',
      definicion:
        'Posición = orden de la institución por importe del concepto en el boletín del periodo. Participación = institución ÷ total del sistema publicado. Un lugar alto indica tamaño relativo, no mejor desempeño.',
      detalle: conPosicion.map((fila) => ({
        etiqueta: nombreDe(fila),
        valor: `${fila.posicion ? ordinal(fila.posicion) : 's/p'} · ${porcentaje(fila.participacion_pct)} %`,
      })),
    });
  }

  /* -------------------------------------------------------------- 3. crecimiento */
  const sistema = series.find((serie) => serie.es_sistema) ?? null;
  const desde = comparacion?.desde ?? '';
  const hasta = comparacion?.hasta ?? '';
  const meses = desde && hasta ? mesesEntre(desde, hasta) : 0;
  const mismoCorte = !esFlujo || desde.split('-')[1] === hasta.split('-')[1];

  if (!comparacion || !desde || !hasta || desde === hasta) {
    omitidos.push(
      'Crecimiento: elige dos fechas distintas en «Comparar fechas» para calcular la variación frente al sector.',
    );
  } else if (!mismoCorte) {
    omitidos.push(
      'Crecimiento: en flujos acumulados solo se comparan cortes del mismo mes, no meses distintos.',
    );
  } else {
    const valorEn = (serie: SerieInstitucion, fecha: string) =>
      serie.puntos.find((punto) => punto.periodo === fecha)?.valor ?? null;

    const calcular = (serie: SerieInstitucion) => {
      const inicial = valorEn(serie, desde);
      const final = valorEn(serie, hasta);
      if (inicial === null || final === null || inicial <= 0) return null;
      return { inicial, final, relativo: 100 * (final / inicial - 1) };
    };

    const crecimientoSistema = sistema ? calcular(sistema) : null;
    const filasCrecimiento = series
      .filter((serie) => !serie.es_sistema && seleccion.includes(serie.institucion_id))
      .map((serie) => ({ serie, datos: calcular(serie) }))
      .filter((fila): fila is { serie: SerieInstitucion; datos: NonNullable<ReturnType<typeof calcular>> } =>
        Boolean(fila.datos),
      );

    if (filasCrecimiento.length === 0) {
      omitidos.push(
        'Crecimiento: no hay valores positivos comparables de los bancos seleccionados en ambas fechas.',
      );
    } else if (!crecimientoSistema) {
      omitidos.push('Crecimiento: el Sistema no tiene una base válida (cero o ausente) en esas fechas.');
    } else {
      const conDiferencia = filasCrecimiento.map((fila) => ({
        ...fila,
        diferencia: fila.datos.relativo - crecimientoSistema.relativo,
      }));
      conDiferencia.sort((a, b) => b.diferencia - a.diferencia);
      const mejor = conDiferencia[0] as (typeof conDiferencia)[number];
      const tipo = meses === 1 ? 'variación mensual' : `variación entre fechas (${meses} meses)`;
      /* La cifra destacada ya resume la diferencia principal; el texto reparte
         el resultado entre los bancos comparados sin repetirla. */
      const frase = `Entre ${etiquetaPeriodo(desde)} y ${etiquetaPeriodo(hasta)} el Sistema varió ${conSigno(
        crecimientoSistema.relativo,
      )} %, frente a ${conDiferencia
        .map((fila, indice) =>
          /* La diferencia del primer banco ya es la cifra destacada: no se repite. */
          indice === 0
            ? `${fila.serie.institucion} ${conSigno(fila.datos.relativo)} %`
            : `${fila.serie.institucion} ${conSigno(fila.datos.relativo)} % (${
                fila.diferencia >= 0 ? '+' : '−'
              }${pp(fila.diferencia)} pp)`,
        )
        .join(' y ')}.`;

      hallazgos.push({
        id: 'crecimiento',
        ambito: 'seleccion',
        titulo: 'Crecimiento frente al sector',
        conclusion: `${frase}`,
        cifra: `${mejor.diferencia >= 0 ? '+' : '−'}${pp(mejor.diferencia)} pp`,
        cifraNota: `${mejor.serie.institucion} menos el Sistema`,
        alcance: `${concepto} · ${etiquetaPeriodo(desde)} → ${etiquetaPeriodo(hasta)} · ${tipo}${
          esFlujo ? ' · mismo corte del año anterior' : ''
        }`,
        panel: 'evolucion',
        definicion:
          'Variación = valor final ÷ valor inicial − 1, con las mismas dos fechas para el banco y para el Sistema publicado. La diferencia se expresa en puntos porcentuales; no se atribuye a ninguna causa.',
        detalle: conDiferencia.map((fila) => ({
          etiqueta: fila.serie.institucion,
          valor: `${conSigno(fila.datos.relativo)} % · ${fila.diferencia >= 0 ? '+' : '−'}${pp(
            fila.diferencia,
          )} pp vs Sistema`,
        })),
      });
    }
  }

  /* ------------------------------------------------------------ 4. rentabilidad */
  const roa = indicadores?.indicadores.find((item) => item.indicador_id.startsWith('roa')) ?? null;
  const roe = indicadores?.indicadores.find((item) => item.indicador_id.startsWith('roe')) ?? null;
  const valoresRoa = (roa?.valores ?? []).filter((valor) => valor.periodo === indicadoresPeriodo);
  const valoresRoe = (roe?.valores ?? []).filter((valor) => valor.periodo === indicadoresPeriodo);
  const sistemaRoe = valoresRoe.find((valor) => valor.es_sistema)?.valor ?? null;

  const ratios = seleccion
    .map((id) => {
      const fila = bancos.find((item) => item.institucion_id === id);
      const valorRoa = valoresRoa.find((valor) => valor.institucion_id === id)?.valor ?? null;
      const valorRoe = valoresRoe.find((valor) => valor.institucion_id === id)?.valor ?? null;
      if (!fila || (valorRoa === null && valorRoe === null)) return null;
      return { nombre: fila.institucion, roa: valorRoa, roe: valorRoe };
    })
    .filter((fila): fila is { nombre: string; roa: number | null; roe: number | null } => fila !== null);

  if (ratios.length === 0) {
    /* Sin selección no se advierte aquí: la invitación única lo cubre al final. */
    if (!sinSeleccion) {
      omitidos.push(
        'Rentabilidad: el boletín del periodo no publica ROA/ROE para las instituciones seleccionadas.',
      );
    }
  } else {
    const conRoe = ratios.filter((fila) => fila.roe !== null);
    type Ratio = { nombre: string; roa: number | null; roe: number | null };
    const primera = (conRoe[0] ?? ratios[0]) as Ratio;
    const segunda = conRoe[1] ?? null;
    const diferenciaSistema =
      primera.roe !== null && sistemaRoe !== null ? primera.roe - sistemaRoe : null;
    const diferenciaEntre =
      primera.roe !== null && segunda?.roe !== null && segunda?.roe !== undefined
        ? primera.roe - segunda.roe
        : null;

    /* El texto reparte ROA y ROE por institución; la cifra destacada resume la
       diferencia, así que no se repite en la frase. */
    const partes = ratios
      .slice(0, 2)
      .map((fila) =>
        fila.roe !== null
          ? `${fila.nombre} ROE ${porcentaje(fila.roe)} %${
              fila.roa !== null ? ` y ROA ${porcentaje(fila.roa)} %` : ''
            }`
          : `${fila.nombre} ROA ${porcentaje(fila.roa)} %`,
      );
    if (ratios.length > 2) {
      partes.push(`${ratios.length - 2} instituciones más en el detalle`);
    }

    const cifra =
      diferenciaSistema !== null
        ? `${diferenciaSistema >= 0 ? '+' : '−'}${pp(diferenciaSistema)} pp`
        : primera.roe !== null
          ? `${porcentaje(primera.roe)} %`
          : `${porcentaje(primera.roa)} %`;

    hallazgos.push({
      id: 'rentabilidad',
      ambito: 'seleccion',
      titulo: 'Rentabilidad publicada',
      conclusion:
        diferenciaSistema !== null
          ? `${partes.join('; ')}. El ROE del Sistema en el periodo es ${porcentaje(sistemaRoe)} %.`
          : diferenciaEntre !== null && segunda
            ? `${partes.join('; ')}.`
            : `${partes.join('; ')}.`,
      cifra,
      cifraNota:
        diferenciaSistema !== null
          ? 'ROE frente al Sistema, en puntos porcentuales'
          : 'ROE publicado',
      alcance: `${concepto} · ${etiquetaPeriodo(indicadoresPeriodo)} · ${ratios.length} ${
        ratios.length === 1 ? 'institución' : 'instituciones'
      }`,
      panel: 'dispersion',
      definicion:
        'ROA y ROE son porcentajes publicados por la CNBV (flujo 12 meses). Se muestran por institución: no se suman ni se promedian, y un ROE alto no implica por sí solo mayor solidez.',
      detalle: ratios.map((fila) => ({
        etiqueta: fila.nombre,
        valor: `ROA ${porcentaje(fila.roa)} % · ROE ${porcentaje(fila.roe)} %`,
      })),
    });
  }

  /* Máximo tres o cuatro tarjetas, en el orden de prioridad pedido. */
  const orden: Hallazgo['id'][] = ['concentracion', 'posicion', 'crecimiento', 'rentabilidad'];
  const elegidos = orden
    .map((id) => hallazgos.find((hallazgo) => hallazgo.id === id))
    .filter((hallazgo): hallazgo is Hallazgo => Boolean(hallazgo))
    .slice(0, 4);

  /**
   * Sin selección solo se muestran los hallazgos del sector y **una** invitación
   * breve; no se acumulan advertencias de posición, crecimiento y rentabilidad.
   * Con selección, las ausencias sí se explican (falta de datos comparables).
   */
  const invitacion = sinSeleccion
    ? 'Selecciona instituciones en el tablero para ampliar la comparación'
    : null;

  return {
    hallazgos: elegidos,
    omitidos: sinSeleccion ? [] : omitidos,
    invitacion,
    avisoVigencia: null,
  };
}

/** Aviso cuando las cifras visibles aún no corresponden a los filtros activos. */
export function avisoDeVigencia(vigente: boolean, actualizando: boolean): string | null {
  if (vigente) return null;
  return actualizando
    ? 'Actualizando cifras: los hallazgos mostrados corresponden a los filtros anteriores.'
    : 'Las cifras de la API no coinciden con los filtros activos; revisa la conexión con el servidor.';
}

/** Fechas de comparación por omisión: primera y última observación con dato. */
export function fechasPorOmision(series: SerieInstitucion[]): { desde: string; hasta: string } | null {
  const periodos = [...new Set(series.flatMap((serie) => serie.puntos.map((punto) => punto.periodo)))].sort();
  if (periodos.length < 2) return null;
  return { desde: periodos[0] as string, hasta: periodos[periodos.length - 1] as string };
}

/** Índice base 100 de un valor, para el detalle de crecimiento. */
export const indiceBase100 = (valor: number, base: number): string =>
  base === 0 ? '—' : indice100((100 * valor) / base);

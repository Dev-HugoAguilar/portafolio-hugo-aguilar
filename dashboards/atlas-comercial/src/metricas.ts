/**
 * Reglas de presentación y de interpretación de métricas del proyecto comercial.
 *
 * Un solo lugar decide cómo se redondea una cifra, qué tolerancia tiene una comparación y cómo se
 * lee una mejora. Las pantallas no vuelven a escribir «menos error» a mano: piden el texto aquí,
 * de modo que un signo negativo no pueda presentarse como mejora.
 *
 * Tres precisiones distintas conviven y no son intercambiables:
 *
 * 1. **Serie canónica**: la predicción publicada conserva todos sus decimales (política
 *    `decimal-v1`). Los totales se calculan sumando esos valores, nunca sumando textos.
 * 2. **Cifra visible**: la interfaz redondea solo al presentar. Dos decimales en las tablas de
 *    planificación; el total de una fila puede diferir de la suma de sus semanas visibles por
 *    fracciones de unidad, porque cada cifra se redondea por separado.
 * 3. **CSV**: exporta con cuatro decimales; la suma de sus filas queda dentro de una tolerancia
 *    que depende del número de filas y de la precisión exportada (ver `toleranciaCsv`).
 */

/** Decimales por omisión en las cifras de unidades de la interfaz. */
export const DECIMALES_VISIBLES = 2;
/** Decimales de la vista ampliada (inspección de una cifra concreta). */
export const DECIMALES_AMPLIADOS = 6;
/** Decimales que exporta el CSV. */
export const DECIMALES_CSV = 4;

/**
 * Tolerancia de **igualdad numérica** entre dos errores.
 *
 * Las métricas se publican con cuatro decimales, así que dos cifras que difieren en menos de medio
 * dígito de esa precisión son indistinguibles en el dato publicado. Se combina con una tolerancia
 * relativa para absorber el ruido de coma flotante al sumar millones de observaciones. Es la única
 * condición que permite decir «mismo error».
 */
export const TOLERANCIA_IGUALDAD_ABSOLUTA = 5e-5;
export const TOLERANCIA_IGUALDAD_RELATIVA = 1e-9;

/**
 * Umbral de **diferencia relativa pequeña**, en puntos porcentuales.
 *
 * `mejora = (error_baseline − error_modelo) / error_baseline`. Con `mejora = 0,05 %` el
 * cociente vale 0,0005. El umbral se aplica al valor absoluto: por debajo no se declara empate
 * —los errores no son numéricamente iguales—, solo que la diferencia es inferior al umbral.
 */
export const UMBRAL_DIFERENCIA_PEQUENA_PCT = 0.05;
/** El mismo umbral expresado como razón (0,05 % = 0,0005). */
export const UMBRAL_DIFERENCIA_PEQUENA_RAZON = UMBRAL_DIFERENCIA_PEQUENA_PCT / 100;

const decimales = (valor: number, cuantos: number) =>
  valor.toLocaleString('es-MX', {
    minimumFractionDigits: cuantos,
    maximumFractionDigits: cuantos,
  });

/** Cifra visible con decimales fijos (2 por omisión). */
export const cifra = (valor: number | null | undefined, cuantos = DECIMALES_VISIBLES) =>
  valor === null || valor === undefined || !Number.isFinite(valor) ? 'n/c' : decimales(valor, cuantos);

/** Precisión ampliada para inspeccionar una cifra sin cambiar el diseño de la tabla. */
export const cifraAmpliada = (valor: number | null | undefined) =>
  valor === null || valor === undefined || !Number.isFinite(valor)
    ? 'sin dato'
    : `${valor.toLocaleString('es-MX', {
        minimumFractionDigits: DECIMALES_AMPLIADOS,
        maximumFractionDigits: DECIMALES_AMPLIADOS,
      })} u (serie canónica sin redondear)`;

/** Cifra con signo explícito, para diferencias y sesgos. */
export const cifraConSigno = (valor: number | null | undefined, cuantos = DECIMALES_VISIBLES) => {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return 'n/c';
  const texto = decimales(Math.abs(valor), cuantos);
  if (valor > 0) return `+${texto}`;
  if (valor < 0) return `−${texto}`;
  return texto;
};

/**
 * Máxima diferencia esperable entre una suma de cifras redondeadas y el total canónico.
 *
 * Cada valor redondeado a `cuantos` decimales se desvía como mucho media unidad del último dígito;
 * al sumar `valores` términos el error máximo es `valores × 0,5 × 10^(−cuantos)`. Se usa para
 * declarar la tolerancia del CSV y para no afirmar igualdad exacta donde solo hay igualdad dentro
 * de una tolerancia.
 */
export const toleranciaRedondeo = (valores: number, cuantos = DECIMALES_CSV) =>
  valores * 0.5 * 10 ** -cuantos;

/** Tolerancia de reconciliación del CSV del plan: una fila aporta un valor de pronóstico. */
export const toleranciaCsv = (filas: number) => toleranciaRedondeo(filas, DECIMALES_CSV);

export type TipoDiferencia =
  /** Los dos errores son iguales dentro de la precisión con la que se publican. */
  | 'sin_diferencia_numerica'
  /** No son iguales, pero la mejora relativa no alcanza el umbral de 0,05 %. */
  | 'diferencia_pequena'
  | 'menor_error'
  | 'mayor_error'
  | 'no_calculable';

export interface DiferenciaError {
  tipo: TipoDiferencia;
  /** Magnitud de la mejora en puntos porcentuales, siempre positiva cuando existe. */
  magnitudPct: number | null;
  /** Mejora con signo (positivo = menos error), para el detalle accesible. */
  signoPct: number | null;
  /** Diferencia absoluta de error: modelo − baseline (negativo = menos error). */
  diferenciaAbsoluta: number | null;
  /** Frase principal para tablas y tarjetas. */
  texto: string;
  /** Frase corta para celdas estrechas. */
  textoCorto: string;
  /** Explicación con el valor preciso y el signo, para tooltips y ayuda. */
  detalle: string;
  motivo: string | null;
  /** True solo cuando se cumple la tolerancia numérica de igualdad. */
  igualdadNumerica: boolean;
  /** Umbral de diferencia pequeña aplicado, en puntos porcentuales. */
  umbralPct: number;
}

const noCalculable = (motivo: string, detalle: string, diferenciaAbsoluta: number | null = null): DiferenciaError => ({
  tipo: 'no_calculable',
  magnitudPct: null,
  signoPct: null,
  diferenciaAbsoluta,
  texto: `Mejora porcentual no calculable: ${motivo}`,
  textoCorto: 'Mejora no calculable',
  detalle,
  motivo,
  igualdadNumerica: false,
  umbralPct: UMBRAL_DIFERENCIA_PEQUENA_PCT,
});

const conSigno = (valor: number, decimales = 4) =>
  `${valor > 0 ? '+' : valor < 0 ? '−' : ''}${Math.abs(valor).toLocaleString('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })}`;

/**
 * Interpreta la diferencia entre el error del modelo y el del baseline.
 *
 * Distingue tres cosas que antes se confundían:
 *
 * 1. **Igualdad numérica**: `|modelo − baseline|` cabe en la precisión de publicación
 *    (`5·10⁻⁵` absoluto, `10⁻⁹` relativo). Solo aquí se dice «mismo error».
 * 2. **Diferencia relativa pequeña**: los errores no son iguales, pero `|mejora| < 0,05 %`
 *    (0,0005 en razón). Se informa el umbral sin declarar empate, equivalencia estadística ni
 *    equivalencia comercial; el signo y el valor preciso quedan en `detalle`.
 * 3. **Diferencia apreciable**: «X % menos error» o «X % más error», siempre con magnitud
 *    positiva y la dirección en palabras.
 *
 * Casos límite: ausentes o no finitos → no calculable; ambos errores cero → mejora porcentual no
 * definida; solo el baseline en cero → diferencia absoluta y mejora porcentual no calculable.
 * Nunca se devuelve infinito ni un porcentaje inventado. El umbral se aplica al valor absoluto y
 * es estricto: exactamente 0,05 % ya no es «diferencia pequeña».
 */
export function interpretarDiferencia(
  errorCandidato: number | null | undefined,
  errorBaseline: number | null | undefined,
): DiferenciaError {
  if (
    errorCandidato === null ||
    errorCandidato === undefined ||
    errorBaseline === null ||
    errorBaseline === undefined ||
    !Number.isFinite(errorCandidato) ||
    !Number.isFinite(errorBaseline)
  ) {
    return noCalculable('falta el error del modelo o del baseline', 'Sin datos suficientes para comparar.');
  }
  const cand = Number(errorCandidato);
  const base = Number(errorBaseline);
  const diferencia = cand - base;

  if (cand === 0 && base === 0) {
    return noCalculable(
      'ambos errores son cero',
      'Los dos errores son exactamente cero; la mejora porcentual no está definida porque el denominador es cero.',
    );
  }

  const margenIgualdad = Math.max(
    TOLERANCIA_IGUALDAD_ABSOLUTA,
    TOLERANCIA_IGUALDAD_RELATIVA * Math.max(Math.abs(cand), Math.abs(base)),
  );
  if (Math.abs(diferencia) <= margenIgualdad) {
    return {
      tipo: 'sin_diferencia_numerica',
      magnitudPct: 0,
      signoPct: 0,
      diferenciaAbsoluta: diferencia,
      texto: 'Mismo error dentro de la precisión del cálculo',
      textoCorto: 'Mismo error',
      detalle: `Modelo ${cifra(cand, 4)} y baseline ${cifra(base, 4)}; la diferencia (${conSigno(
        diferencia,
      )}) cabe en la tolerancia de igualdad de ${margenIgualdad.toExponential(1)}.`,
      motivo: null,
      igualdadNumerica: true,
      umbralPct: UMBRAL_DIFERENCIA_PEQUENA_PCT,
    };
  }

  if (base === 0) {
    return noCalculable(
      'el baseline tiene error cero',
      `Diferencia absoluta de ${conSigno(diferencia, 4)} unidades de error a favor del modelo; el porcentaje no está definido porque el baseline vale cero.`,
      diferencia,
    );
  }

  const pct = (100 * (base - cand)) / base;
  const magnitud = Math.abs(pct);

  /* El umbral es inclusivo: exactamente 0,05 % ya es diferencia apreciable. Se compara con un
     margen de 1e-12 porque los decimales de entrada (199,9 frente a 200) no tienen representación
     exacta en coma flotante y el límite no debe depender de ese ruido. */
  if (magnitud < UMBRAL_DIFERENCIA_PEQUENA_PCT - 1e-12) {
    const direccion = pct > 0 ? 'menos' : 'más';
    return {
      tipo: 'diferencia_pequena',
      magnitudPct: magnitud,
      signoPct: pct,
      diferenciaAbsoluta: diferencia,
      texto: 'Diferencia inferior a 0,05 %',
      textoCorto: 'Diferencia < 0,05 %',
      detalle: `Mejora de ${conSigno(pct)} % (${direccion} error), por debajo del umbral de 0,05 % (= ${UMBRAL_DIFERENCIA_PEQUENA_RAZON} en razón). Los errores no son numéricamente iguales; no se declara empate ni equivalencia estadística o comercial.`,
      motivo: null,
      igualdadNumerica: false,
      umbralPct: UMBRAL_DIFERENCIA_PEQUENA_PCT,
    };
  }

  if (pct > 0) {
    return {
      tipo: 'menor_error',
      magnitudPct: magnitud,
      signoPct: pct,
      diferenciaAbsoluta: diferencia,
      texto: `${decimales(magnitud, 2)} % menos error que el baseline`,
      textoCorto: `${decimales(magnitud, 2)} % menos error`,
      detalle: `Mejora de ${conSigno(pct)} %: el modelo tiene menos error que el baseline.`,
      motivo: null,
      igualdadNumerica: false,
      umbralPct: UMBRAL_DIFERENCIA_PEQUENA_PCT,
    };
  }
  return {
    tipo: 'mayor_error',
    magnitudPct: magnitud,
    signoPct: pct,
    diferenciaAbsoluta: diferencia,
    texto: `${decimales(magnitud, 2)} % más error que el baseline`,
    textoCorto: `${decimales(magnitud, 2)} % más error`,
    detalle: `Mejora de ${conSigno(pct)} %: el modelo tiene más error que el baseline.`,
    motivo: null,
    igualdadNumerica: false,
    umbralPct: UMBRAL_DIFERENCIA_PEQUENA_PCT,
  };
}

/** Nombre anterior de la misma regla; se conserva para no tocar los puntos de uso. */
export const interpretarMejora = interpretarDiferencia;

/** Mejora a partir de dos MAE (misma unidad y mismas observaciones). */
export const mejorarDesdeMae = (
  maeCandidato: number | null | undefined,
  maeBaseline: number | null | undefined,
) => interpretarMejora(maeCandidato, maeBaseline);

/** Granos de evaluación: cada uno tiene su fórmula, su unidad y no sustituye a los demás. */
export type GranoEvaluacion = 'diario' | 'horizonte' | 'agregado';

export const UNIDAD_SESGO: Record<GranoEvaluacion, string> = {
  diario: 'unidades por serie-día',
  horizonte: 'unidades por serie-horizonte de 28 días',
  agregado: 'unidades por día del segmento',
};

export const FORMULA_SESGO: Record<GranoEvaluacion, string> = {
  diario: 'media de (pronóstico − observado) por serie y día',
  horizonte:
    'para cada serie y corte se suman los errores con signo de sus 28 días y después se promedia entre pares serie-corte',
  agregado:
    'primero se suman las series del segmento por fecha y después se promedia el error diario',
};

/**
 * Compara una cifra visible con su valor canónico y devuelve si la diferencia cabe en el redondeo.
 * Se usa en las pruebas de aceptación y en las notas de tolerancia.
 */
export const dentroDeRedondeo = (
  sumaVisible: number,
  totalCanonico: number,
  terminos: number,
  cuantos = DECIMALES_VISIBLES,
) => Math.abs(sumaVisible - totalCanonico) <= toleranciaRedondeo(terminos, cuantos) + 1e-9;

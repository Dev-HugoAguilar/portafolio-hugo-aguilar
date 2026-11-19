/**
 * Pruebas de la regla de interpretación de mejora y de las tolerancias de redondeo.
 *
 * Compila `src/metricas.ts` con esbuild (ya es dependencia del proyecto) para ejecutar el mismo
 * código que usa la interfaz: si una pantalla vuelve a escribir «menos error» a mano, esta prueba
 * no lo detecta; pero si la regla central cambia de signo o de tolerancia, aquí falla.
 *
 * Casos obligatorios del encargo: mejora positiva, mejora negativa, empate y baseline con error
 * cero. Además se comprueba la tolerancia de reconciliación del CSV.
 */
import { build } from "esbuild";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const fallos = [];
const comprobar = (condicion, mensaje) => {
  if (!condicion) fallos.push(mensaje);
};

const carpeta = await mkdtemp(join(tmpdir(), "metricas-"));
const salida = join(carpeta, "metricas.mjs");
await build({
  entryPoints: ["src/metricas.ts"],
  outfile: salida,
  bundle: true,
  format: "esm",
  platform: "neutral",
  logLevel: "silent",
});
const metricas = await import(pathToFileURL(salida).href);
await writeFile(join(carpeta, "usado.txt"), "ok");
await rm(carpeta, { recursive: true, force: true });

const {
  interpretarDiferencia,
  toleranciaCsv,
  toleranciaRedondeo,
  dentroDeRedondeo,
  cifra,
  TOLERANCIA_IGUALDAD_ABSOLUTA,
  UMBRAL_DIFERENCIA_PEQUENA_PCT,
  UMBRAL_DIFERENCIA_PEQUENA_RAZON,
} = metricas;

/* ------------------------------------------------- igualdad numérica */
const identicos = interpretarDiferencia(1.24, 1.24);
comprobar(
  identicos.tipo === "sin_diferencia_numerica" && identicos.igualdadNumerica === true,
  `Dos errores idénticos deben ser igualdad numérica: ${identicos.tipo}`,
);
comprobar(
  /Mismo error dentro de la precisión del cálculo/.test(identicos.texto),
  `Texto de igualdad inesperado: ${identicos.texto}`,
);

const enElMargen = interpretarDiferencia(1.24, 1.24 + TOLERANCIA_IGUALDAD_ABSOLUTA / 2);
comprobar(
  enElMargen.tipo === "sin_diferencia_numerica",
  `Una diferencia dentro de la tolerancia de publicación es igualdad numérica: ${enElMargen.tipo}`,
);
const fueraDelMargen = interpretarDiferencia(1.24, 1.24 + TOLERANCIA_IGUALDAD_ABSOLUTA * 4);
comprobar(
  fueraDelMargen.tipo !== "sin_diferencia_numerica",
  `Una diferencia mayor que la tolerancia de publicación no es igualdad: ${fueraDelMargen.tipo}`,
);

/* ------------------------------------------- diferencia relativa pequeña */
/* mejora = (baseline − modelo) / baseline. 0,05 % de 200 = 0,1. */
const pequenaPositiva = interpretarDiferencia(199.95, 200);
comprobar(
  pequenaPositiva.tipo === "diferencia_pequena",
  `Una mejora de 0,025 % no es igualdad numérica sino diferencia pequeña: ${pequenaPositiva.tipo}`,
);
comprobar(
  /Diferencia inferior a 0,05 %/.test(pequenaPositiva.texto),
  `Texto de diferencia pequeña inesperado: ${pequenaPositiva.texto}`,
);
comprobar(
  pequenaPositiva.magnitudPct !== null && pequenaPositiva.magnitudPct < UMBRAL_DIFERENCIA_PEQUENA_PCT,
  `La magnitud debe ser inferior al umbral: ${pequenaPositiva.magnitudPct}`,
);
comprobar(
  pequenaPositiva.detalle.includes("+0.0250") && /menos error/.test(pequenaPositiva.detalle),
  `El detalle debe conservar el signo y el valor preciso: ${pequenaPositiva.detalle}`,
);
comprobar(
  /no se declara empate/i.test(pequenaPositiva.detalle),
  "El detalle debe aclarar que no se declara empate",
);

const pequenaNegativa = interpretarDiferencia(200.05, 200);
comprobar(
  pequenaNegativa.tipo === "diferencia_pequena",
  `Una mejora negativa pequeña sigue siendo diferencia pequeña: ${pequenaNegativa.tipo}`,
);
comprobar(
  /-0.0250/.test(pequenaNegativa.detalle.replace("−", "-")) &&
    /más error/.test(pequenaNegativa.detalle),
  `El detalle de la diferencia pequeña negativa debe conservar signo y dirección: ${pequenaNegativa.detalle}`,
);

/* Límite exacto del umbral: 0,05 % de 200 = 0,1 → ya es diferencia apreciable. */
const enElLimite = interpretarDiferencia(199.9, 200);
comprobar(
  Math.abs(enElLimite.magnitudPct - UMBRAL_DIFERENCIA_PEQUENA_PCT) < 1e-9,
  `El caso límite debe dar exactamente el umbral: ${enElLimite.magnitudPct}`,
);
comprobar(
  enElLimite.tipo === "menor_error",
  `En el límite exacto (0,05 %) ya no es «diferencia pequeña»: ${enElLimite.tipo}`,
);
const sobreElLimite = interpretarDiferencia(199.89, 200);
comprobar(
  sobreElLimite.tipo === "menor_error" &&
    sobreElLimite.magnitudPct > UMBRAL_DIFERENCIA_PEQUENA_PCT,
  `Por encima del umbral debe ser mejora apreciable: ${sobreElLimite.tipo} ${sobreElLimite.magnitudPct}`,
);
const bajoElLimite = interpretarDiferencia(199.91, 200);
comprobar(
  bajoElLimite.tipo === "diferencia_pequena",
  `Por debajo del umbral debe ser diferencia pequeña: ${bajoElLimite.tipo}`,
);
comprobar(
  Math.abs(UMBRAL_DIFERENCIA_PEQUENA_RAZON - 0.0005) < 1e-12,
  `0,05 % debe equivaler a 0,0005 en razón: ${UMBRAL_DIFERENCIA_PEQUENA_RAZON}`,
);

/* ------------------------------------------------- baseline en cero */
const ambosCero = interpretarDiferencia(0, 0);
comprobar(
  ambosCero.tipo === "no_calculable" && /ambos errores son cero/i.test(ambosCero.texto),
  `Con ambos errores en cero debe declararse que la mejora no está definida: ${ambosCero.texto}`,
);
const soloBaseCero = interpretarDiferencia(12, 0);
comprobar(
  soloBaseCero.tipo === "no_calculable" &&
    /no calculable/i.test(soloBaseCero.texto) &&
    soloBaseCero.diferenciaAbsoluta === 12,
  `Con el baseline en cero debe mostrarse la diferencia absoluta sin porcentaje: ${JSON.stringify(
    soloBaseCero,
  )}`,
);
comprobar(
  !/Infinity|NaN/.test(JSON.stringify(soloBaseCero)),
  "No debe aparecer infinito ni NaN cuando el baseline es cero",
);
comprobar(
  interpretarDiferencia(0, 12).tipo === "menor_error",
  "Error del modelo en cero con baseline positivo es una mejora del 100 %",
);

/* ------------------------------------------------- ausentes y no finitos */
for (const [cand, base] of [
  [null, 1.2],
  [1.2, undefined],
  [Number.NaN, 1.2],
  [1.2, Number.POSITIVE_INFINITY],
]) {
  const resultado = interpretarDiferencia(cand, base);
  comprobar(
    resultado.tipo === "no_calculable",
    `Un valor ausente o no finito debe ser no calculable (${cand}, ${base}): ${resultado.tipo}`,
  );
  comprobar(
    !/Infinity|NaN/.test(resultado.texto + resultado.detalle),
    `Texto con infinito/NaN para (${cand}, ${base})`,
  );
}

/* --------------------------------------------------- diferencias claras */
const mejor = interpretarDiferencia(1.07, 1.2382);
comprobar(mejor.tipo === "menor_error", `1,07 vs 1,2382 debería ser mejora: ${mejor.tipo}`);
comprobar(
  /13\.5\d % menos error que el baseline/.test(mejor.texto),
  `Texto de mejora inesperado: ${mejor.texto}`,
);
const peor = interpretarDiferencia(3997.3064, 3231.1429);
comprobar(peor.tipo === "mayor_error", `3 997 vs 3 231 debería ser deterioro: ${peor.tipo}`);
comprobar(
  peor.texto === "23.71 % más error que el baseline",
  `El deterioro debe escribirse «% más error»: ${peor.texto}`,
);
comprobar(
  !/menos error/.test(peor.texto) && !/^-/.test(peor.texto),
  `El deterioro no puede llevar signo negativo ni decir «menos error»: ${peor.texto}`,
);

/* ------------------------------------------------------------ tolerancias */
const tolCsv = toleranciaCsv(1437);
comprobar(
  Math.abs(tolCsv - 1437 * 0.5e-4) < 1e-12,
  `Tolerancia del CSV mal calculada: ${tolCsv}`,
);
comprobar(
  Math.abs(toleranciaRedondeo(5, 2) - 0.025) < 1e-12,
  "La tolerancia de cinco cifras a dos decimales debe ser 0,025",
);
comprobar(
  dentroDeRedondeo(2907.98, 2908.02, 4, 2) === false,
  "Una suma visible que difiere 0,04 con cuatro términos a dos decimales excede la tolerancia",
);
comprobar(
  dentroDeRedondeo(2908.02, 2908.02, 4, 2) === true,
  "Una suma visible igual al total debe quedar dentro de la tolerancia",
);

/* ------------------------------------------------------------- formato */
comprobar(cifra(2908.0241) === "2,908.02", `Formato de dos decimales inesperado: ${cifra(2908.0241)}`);
comprobar(cifra(731.1438) === "731.14", `Formato de dos decimales inesperado: ${cifra(731.1438)}`);
comprobar(cifra(null) === "n/c", "Un valor ausente debe presentarse como n/c");

if (fallos.length) {
  console.log(`✗ ${fallos.length} fallo(s) en las reglas de métricas:`);
  for (const fallo of fallos) console.log(`  · ${fallo}`);
  process.exit(1);
}
console.log("✓ Reglas de mejora, tolerancias y formato verificadas");

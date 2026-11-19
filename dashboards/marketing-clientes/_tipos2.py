from pathlib import Path
p = Path("src/hallazgos.ts")
t = p.read_text(encoding="utf-8")

t = t.replace(
"""  const filas = resumen.conversion_fuente?.filas ?? [];
  const global = resumen.conversion_fuente?.referencia_global ?? null;
  if (filas.length && global && usuarios) {
    const mayor = filas[0];
    const identificada = filas.find((fila) => fila.canal !== SIN_FUENTE) ?? mayor;
    const umbral = resumen.conversion_fuente?.umbral_base_reducida ?? 100;
    const conBase = filas.filter((fila) => fila.usuarios >= umbral);
    const eficiente = conBase.reduce(
      (mejor, fila) => ((fila.conversion ?? 0) > (mejor.conversion ?? 0) ? fila : mejor),
      conBase[0] ?? mayor,
    );""",
"""  const filas = resumen.conversion_fuente?.filas ?? [];
  const global = resumen.conversion_fuente?.referencia_global ?? null;
  const mayor = filas[0];
  if (mayor && global && usuarios) {
    const identificada = filas.find((fila) => fila.canal !== SIN_FUENTE) ?? mayor;
    const umbral = resumen.conversion_fuente?.umbral_base_reducida ?? 100;
    const conBase = filas.filter((fila) => fila.usuarios >= umbral);
    const eficiente = conBase.reduce(
      (mejor, fila) => ((fila.conversion ?? 0) > (mejor.conversion ?? 0) ? fila : mejor),
      conBase[0] ?? mayor,
    );""",
)
p.write_text(t, encoding="utf-8")
print("guarda de mayor")

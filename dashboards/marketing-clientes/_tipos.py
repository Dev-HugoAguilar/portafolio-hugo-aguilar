from pathlib import Path
p = Path("src/hallazgos.ts")
t = p.read_text(encoding="utf-8")

t = t.replace(
"""    const transiciones = pasos.slice(1).map((paso, indice) => {
      const anterior = pasos[indice];
      return {""",
"""    const transiciones = pasos.slice(1).map((paso, indice) => {
      const anterior = pasos[indice] as (typeof pasos)[number];
      return {""",
)

t = t.replace(
"""    const [primera, segunda, tercera] = candidatas;""",
"""    const primera = candidatas[0] as (typeof candidatas)[number];
    const segunda = candidatas[1];
    const tercera = candidatas[2];""",
)

t = t.replace(
"""    const detalle = (fila: (typeof candidatas)[number]) =>""",
"""    const detalle = (fila: (typeof candidatas)[number]) =>""",
)

t = t.replace(
"""    const principal = categorias[0];""",
"""    const principal = categorias[0] as (typeof categorias)[number];""",
)
p.write_text(t, encoding="utf-8")
print("ajustes de tipos")

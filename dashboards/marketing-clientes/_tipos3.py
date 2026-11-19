from pathlib import Path
p = Path("src/hallazgos.ts")
t = p.read_text(encoding="utf-8")
t = t.replace("  const compradores = valor(resumen, 'compradores');\n", "")
p.write_text(t, encoding="utf-8")
print("variable sin uso retirada")

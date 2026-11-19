from pathlib import Path
p = Path("ui/Metodologia.tsx")
t = p.read_text(encoding="utf-8")
antes = t
t = t.replace("'La tabla de detalle es un extracto determinista, no el universo de eventos.',",
              "'No hay tabla de detalle: el modelo compacto guarda agregados y no eventos uno a uno.',")
t = t.replace("Los filtros afectan a las cuatro vistas, la tabla y la exportación.",
              "Los filtros afectan a las cuatro vistas del tablero.")
p.write_text(t, encoding="utf-8")
print("Metodologia:", "cambiada" if t != antes else "sin cambios")
p = Path("ui/Filtros.tsx")
t = p.read_text(encoding="utf-8")
t = t.replace("cruzan (AND). Los filtros afectan a las cuatro vistas, la tabla y la exportación.",
              "cruzan (AND). Los filtros afectan a las cuatro vistas del tablero.")
p.write_text(t, encoding="utf-8")
print("Filtros: textos actualizados")

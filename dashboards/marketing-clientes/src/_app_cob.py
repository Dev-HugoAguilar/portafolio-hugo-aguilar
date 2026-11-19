from pathlib import Path
p = Path("App.tsx")
t = p.read_text(encoding="utf-8")
t = t.replace("import { Kpis } from './ui/Kpis';", "import { Cobertura } from './ui/Cobertura';\nimport { Kpis } from './ui/Kpis';")
t = t.replace(
    "      <Kpis resumen={resumen} cargando={resumenQuery.isFetching} />\n",
    "      <Kpis resumen={resumen} cargando={resumenQuery.isFetching} />\n\n"
    "      <Cobertura estado={estado} resumen={resumen} cargando={resumenQuery.isFetching} />\n",
)
p.write_text(t, encoding="utf-8")
print("App.tsx: panel de cobertura montado")

"""Extrae de la referencia la implementación y los datos de «Cada punto, una vida».

El array `people` tiene 72 835 filas; se delimita con un escáner que cuenta
corchetes y respeta las cadenas, en lugar de buscar el primer `];` (que puede
aparecer dentro de un nombre).

Salida en `entregas/referencia-cada-punto/`:
  - `personas.json`  · registros `[nombre_ar, transliteración, edad]`;
  - `panel.js.txt`   · plantilla HTML del panel `#memoria`;
  - `memoria.js`     · lógica de la vista (sin el array);
  - `memoria.css`    · reglas `.mem*` de la referencia.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
REFERENCIA = RAIZ / "entregas" / "gaza-cada-punto-referencia.html"
SALIDA = RAIZ / "entregas" / "referencia-cada-punto"
SALIDA.mkdir(parents=True, exist_ok=True)

html = REFERENCIA.read_text(encoding="utf-8")
print(f"referencia: {len(html):,} caracteres")


def delimitar_array(texto: str, desde: int) -> tuple[int, int]:
    """Devuelve (inicio, fin) del array que empieza en el primer `[` tras `desde`."""
    inicio = texto.index("[", desde)
    nivel = 0
    en_cadena = False
    escape = False
    for posicion in range(inicio, len(texto)):
        caracter = texto[posicion]
        if en_cadena:
            if escape:
                escape = False
            elif caracter == "\\":
                escape = True
            elif caracter == '"':
                en_cadena = False
            continue
        if caracter == '"':
            en_cadena = True
        elif caracter == "[":
            nivel += 1
        elif caracter == "]":
            nivel -= 1
            if nivel == 0:
                return inicio, posicion + 1
    raise SystemExit("no se pudo delimitar el array de personas")


inicio_declaracion = html.index("const people=")
inicio_array, fin_array = delimitar_array(html, inicio_declaracion)
personas = json.loads(html[inicio_array:fin_array])
print(f"personas: {len(personas):,} filas · ejemplo {personas[0]}")

edades = [fila[2] for fila in personas]
print(f"menores de 18: {sum(1 for a in edades if a < 18):,}")
print(f"menores de 5:  {sum(1 for a in edades if a < 5):,}")
print(f"adultos:       {sum(1 for a in edades if a >= 18):,}")
print(f"sin edad numérica: {sum(1 for a in edades if not isinstance(a, (int, float))):,}")

(SALIDA / "personas.json").write_text(
    json.dumps(personas, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
)

# ------------------------------------------------------------------ panel
inicio_panel = html.index("panel.innerHTML=`")
fin_panel = html.index("`;", inicio_panel)
(SALIDA / "panel.js.txt").write_text(html[inicio_panel + len("panel.innerHTML=") : fin_panel + 1], encoding="utf-8")

# ------------------------------------------------------------------ lógica
inicio_js = html.index("/* Cada punto corresponde a una fila nominal.")
fin_js = html.index("</script>", html.index("const btn=document.createElement('button');", inicio_js))
(SALIDA / "memoria.js").write_text(html[inicio_js:fin_js], encoding="utf-8")
print(f"lógica extraída: {fin_js - inicio_js:,} caracteres")

# ------------------------------------------------------------------ estilos
reglas = []
for regla in re.findall(r"\.mem[A-Za-z]+\{[^}]*\}", html):
    if regla not in reglas:
        reglas.append(regla)
(SALIDA / "memoria.css").write_text("\n".join(reglas), encoding="utf-8")
print(f"reglas .mem* encontradas: {len(reglas)}")

for ruta in sorted(SALIDA.iterdir()):
    print(f"  {ruta.name}: {ruta.stat().st_size:,} bytes")

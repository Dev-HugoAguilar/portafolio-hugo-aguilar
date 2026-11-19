"""Incorpora la vista «Cada punto, una vida» al HTML del observatorio.

Se ejecuta después de los constructores v0.2 y v0.3 y aplica cuatro inserciones
sobre el documento ya armado:

  1. la hoja de estilos de la vista, al final del último bloque `<style>`;
  2. el botón de pestaña, justo después de «Edades y prensa» —queda estático, así
     la navegación por teclado de la barra lo incluye desde el arranque—;
  3. la sección `#memoria` antes de `#personas`;
  4. el script de la vista con los 72 835 registros nominales incrustados.

La sección y el guion viven en `fuente/memoria/`. No se toca ninguna otra vista.
"""
from __future__ import annotations

import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
FUENTE = RAIZ / "dashboards" / "gaza-observatorio" / "fuente"
MEMORIA = FUENTE / "memoria"
DOCUMENTO = FUENTE / "dist" / "index.html"

# Las consultas de medios viven ya en `memoria.css`; aquí solo lo que añade el
# constructor (aviso de alcance bajo la leyenda).
CSS_ADICIONAL = """
.memNotice{margin-top:22px}
"""

BOTON = '<button role="tab" aria-selected="false" data-tab="memoria">Cada punto, una vida</button>'


def principal() -> int:
    if not DOCUMENTO.exists():
        raise SystemExit(f"falta el documento base: {DOCUMENTO}")
    html = DOCUMENTO.read_text(encoding="utf-8")

    personas = json.loads((MEMORIA / "personas.json").read_text(encoding="utf-8"))
    if len(personas) != 72835:
        raise SystemExit(f"se esperaban 72 835 registros nominales, hay {len(personas):,}")

    seccion = (MEMORIA / "seccion.html").read_text(encoding="utf-8").strip()
    guion = (MEMORIA / "memoria.js").read_text(encoding="utf-8")
    estilo = (MEMORIA / "memoria.css").read_text(encoding="utf-8") + CSS_ADICIONAL

    # 1. estilos al final del último bloque <style>
    corte = html.rfind("</style>")
    if corte < 0:
        raise SystemExit("no se encontró un bloque <style> donde insertar los estilos")
    html = html[:corte] + estilo + html[corte:]

    # 2. pestaña después de «Edades y prensa»
    ancla_pestana = '<button role="tab" aria-selected="false" data-tab="personas">Edades y prensa</button>'
    if ancla_pestana not in html:
        raise SystemExit("no se encontró la pestaña «Edades y prensa»")
    html = html.replace(ancla_pestana, ancla_pestana + BOTON, 1)

    # 3. sección antes de #personas
    ancla_seccion = '<section id="personas" role="tabpanel" hidden>'
    if ancla_seccion not in html:
        raise SystemExit("no se encontró la sección «personas»")
    html = html.replace(ancla_seccion, seccion + ancla_seccion, 1)

    # 4. guion con los datos incrustados
    datos = json.dumps(personas, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html += "\n<script>" + guion.replace("__PERSONAS__", datos) + "</script>"

    DOCUMENTO.write_text(html, encoding="utf-8", newline="")
    print(
        f"Cada punto, una vida: {len(personas):,} registros · documento {len(html.encode('utf-8')):,} bytes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())

# -*- coding: utf-8 -*-
"""Inyecta las etiquetas de grupo y los atributos por sitio en el observatorio.

Los datos se derivan de lo ya calculado (`territorio/grupos.json` sale de
`report.profiles` de `visual.json`) y del panel UNOSAT (`territorio/sitios.json`,
unión por `fid`). Se insertan como globo antes de los guiones de la plantilla,
que es donde el mapa de la muestra los consume; no se altera ningún cálculo.
"""
from __future__ import annotations

from pathlib import Path

R = Path(__file__).resolve().parent
DOCUMENTO = R / "dist" / "index.html"
TERRITORIO = R / "territorio"


def principal() -> int:
    html = DOCUMENTO.read_text(encoding="utf-8")
    if "<script>window.GRUPOS_TERRITORIO=" in html:
        raise SystemExit("las etiquetas ya estaban inyectadas")

    grupos = (TERRITORIO / "grupos.json").read_text(encoding="utf-8")
    sitios = (TERRITORIO / "sitios.json").read_text(encoding="utf-8")
    css = (TERRITORIO / "etiquetas.css").read_text(encoding="utf-8")

    datos = (
        "<script>window.GRUPOS_TERRITORIO="
        + grupos.replace("</", "<\\/")
        + ";window.SITIOS_TERRITORIO="
        + sitios.replace("</", "<\\/")
        + ";</script>"
    )
    ancla = "<main>"
    if html.count(ancla) != 1:
        raise SystemExit(f"se esperaba un <main> y hay {html.count(ancla)}")
    html = html.replace(ancla, ancla + datos, 1)

    corte = html.rfind("</style>")
    if corte < 0:
        raise SystemExit("no hay bloque <style> donde añadir los estilos")
    html = html[:corte] + css + html[corte:]

    DOCUMENTO.write_text(html, encoding="utf-8", newline="")
    print("etiquetas de grupo y atributos por sitio inyectados:", f"{len(html.encode('utf-8')):,}", "bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())


"""Sustituye el contenido del panel «Experimento» por el módulo de pronóstico y
validación, e incrusta sus datos y su guion en el documento del observatorio.

La pestaña, su etiqueta, su posición y la navegación del proyecto no cambian: solo
cambia lo que se muestra al seleccionarla. Los datos provienen de las salidas
empaquetadas del paquete (`pronostico/datos.json`); no se reconstruye ni se
reentrena nada en el navegador.
"""
from __future__ import annotations

import json
from pathlib import Path

R = Path(__file__).resolve().parent
DOCUMENTO = R / "dist" / "index.html"
MODULO = R / "pronostico"


def principal() -> int:
    html = DOCUMENTO.read_text(encoding="utf-8")
    inicio = html.index('<section id="experimento"')
    fin = html.index("</section>", inicio) + len("</section>")
    anterior = html[inicio:fin]
    if 'id="scores"' not in anterior:
        raise SystemExit("el panel «Experimento» no es el esperado: no contiene #scores")

    seccion = (MODULO / "seccion.html").read_text(encoding="utf-8").strip()
    html = html[:inicio] + seccion + html[fin:]

    datos = (MODULO / "datos.json").read_text(encoding="utf-8").replace("</", "<\\/")
    js = (MODULO / "pronostico.js").read_text(encoding="utf-8").replace("__PRONOSTICO__", datos)
    css = (MODULO / "pronostico.css").read_text(encoding="utf-8")

    html += "\n<style>" + css + "</style>\n<script>" + js + "</script>"
    DOCUMENTO.write_text(html, encoding="utf-8", newline="")
    print(
        "pronóstico: panel reemplazado · documento",
        f"{len(html.encode('utf-8')):,}",
        "bytes",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())


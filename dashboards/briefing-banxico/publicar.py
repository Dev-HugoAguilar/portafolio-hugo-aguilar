# -*- coding: utf-8 -*-
"""Publica la demo estática de «Briefing con evidencia» en ``dist``.

Copia ``runtime/`` (HTML, CSS, JS, corpus y D3 local) a
``dist/dashboards/briefing-banxico/``. No genera ni transforma datos: el corpus
versionable es la fuente y se copia tal cual.

Uso:
    python dashboards/briefing-banxico/publicar.py
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

AQUI = Path(__file__).resolve().parent
REPO = AQUI.parents[1]
RUNTIME = AQUI / "runtime"
DESTINO = REPO / "dist" / "dashboards" / "briefing-banxico"
ARCHIVOS = [
    "index.html",
    "styles.css",
    "app.js",
    "corpus.json",
    "vendor/d3.min.js",
]


def hash_de(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def principal() -> int:
    for relativo in ARCHIVOS:
        origen = RUNTIME / relativo
        if not origen.exists():
            raise SystemExit(f"falta runtime/{relativo}")
        destino = DESTINO / relativo
        destino.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(origen, destino)
        if hash_de(destino) != hash_de(origen):
            raise SystemExit(f"la copia de {relativo} no coincide")
    total = sum((DESTINO / relativo).stat().st_size for relativo in ARCHIVOS)
    print(
        "publicado: dist/dashboards/briefing-banxico ·",
        f"{len(ARCHIVOS)} archivos · {total:,} bytes",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())

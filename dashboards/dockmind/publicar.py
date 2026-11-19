# -*- coding: utf-8 -*-
"""Publica el runtime modular de DockMind en ``dist``.

Solo se copian los cinco artefactos del runtime. Los joblib, scripts de
entrenamiento, QA y research quedan fuera del sitio servido.
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

AQUI = Path(__file__).resolve().parent
REPO = AQUI.parents[1]
ORIGEN = AQUI / "runtime"
DESTINO = REPO / "dist" / "dashboards" / "dockmind"
ARCHIVOS = (
    "index.html",
    "styles.css",
    "app.js",
    "data.json",
    "vendor/d3.min.js",
)


def hash_de(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def principal() -> int:
    if not (ORIGEN / "index.html").exists():
        raise SystemExit("falta runtime/index.html")
    DESTINO.mkdir(parents=True, exist_ok=True)
    for relativo in ARCHIVOS:
        origen = ORIGEN / relativo
        destino = DESTINO / relativo
        destino.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(origen, destino)
        if hash_de(origen) != hash_de(destino):
            raise SystemExit(f"copia incompleta: {relativo}")
    print(f"publicado: {DESTINO.relative_to(REPO)} · {sum((DESTINO / r).stat().st_size for r in ARCHIVOS):,} bytes")
    print("runtime: " + " · ".join(ARCHIVOS))
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())

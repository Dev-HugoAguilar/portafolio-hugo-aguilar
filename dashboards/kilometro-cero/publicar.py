# -*- coding: utf-8 -*-
"""Publica la demo autónoma de «Kilómetro Cero» en ``dist``.

La salida autónoma embebe HTML, CSS, MapLibre, D3, datos y geometrías; el
único archivo necesario para renderizar es ``index.html``. La licencia de
MapLibre se copia junto al artefacto como parte de su distribución.
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

AQUI = Path(__file__).resolve().parent
REPO = AQUI.parents[1]
ORIGEN = AQUI / "runtime" / "index.html"
DESTINO = REPO / "dist" / "dashboards" / "kilometro-cero" / "index.html"
LICENCIA = AQUI / "source" / "vendor" / "MAPLIBRE-LICENSE.txt"
LICENCIA_DESTINO = DESTINO.parent / "MAPLIBRE-LICENSE.txt"


def hash_de(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def principal() -> int:
    if not ORIGEN.exists():
        raise SystemExit("falta runtime/index.html; ejecuta source/build_preview.py y copia la salida")
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ORIGEN, DESTINO)
    if hash_de(DESTINO) != hash_de(ORIGEN):
        raise SystemExit("la copia publicada no coincide con runtime/index.html")
    if LICENCIA.exists():
        shutil.copyfile(LICENCIA, LICENCIA_DESTINO)
    print(f"publicado: {DESTINO.relative_to(REPO)} · {DESTINO.stat().st_size:,} bytes")
    print(f"licencia: {LICENCIA_DESTINO.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())

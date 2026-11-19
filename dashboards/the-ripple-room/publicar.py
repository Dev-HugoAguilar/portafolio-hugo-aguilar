# -*- coding: utf-8 -*-
"""Publica la demo autónoma de «The Ripple Room» en ``dist``.

La salida autónoma embebe HTML, CSS, JavaScript, D3, datos y geometría; por eso
el único archivo necesario en ``dist/dashboards/the-ripple-room/`` es
``index.html``.

Uso:
    python dashboards/the-ripple-room/publicar.py
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

AQUI = Path(__file__).resolve().parent
REPO = AQUI.parents[1]
ORIGEN = AQUI / "runtime" / "index.html"
DESTINO = REPO / "dist" / "dashboards" / "the-ripple-room" / "index.html"


def hash_de(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def principal() -> int:
    if not ORIGEN.exists():
        raise SystemExit("falta runtime/index.html; ejecuta source/build_preview.py y copia la salida")
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ORIGEN, DESTINO)
    if hash_de(DESTINO) != hash_de(ORIGEN):
        raise SystemExit("la copia publicada no coincide con runtime/index.html")
    print(f"publicado: {DESTINO.relative_to(REPO)} · {DESTINO.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())

# -*- coding: utf-8 -*-
"""Publica el artefacto estático de ORBITA en ``dist`` sin incluirlo en el bundle."""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

AQUI = Path(__file__).resolve().parent
REPO = AQUI.parents[1]
ORIGEN = AQUI / "index.html"
DESTINO = REPO / "dist" / "dashboards" / "orbita" / "index.html"


def hash_de(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def principal() -> int:
    if not ORIGEN.exists():
        raise SystemExit("falta dashboards/orbita/index.html")
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ORIGEN, DESTINO)
    if hash_de(ORIGEN) != hash_de(DESTINO):
        raise SystemExit("la copia publicada no coincide con el HTML fuente")
    print(f"publicado: {DESTINO.relative_to(REPO)} · {DESTINO.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())

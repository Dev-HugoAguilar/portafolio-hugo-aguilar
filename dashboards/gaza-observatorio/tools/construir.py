"""Construye y publica el observatorio «Gaza · Vidas y territorio».

El procedimiento es el de la entrega, sin reescribirlo: se ejecutan los dos
constructores originales en orden —`fuente/construir_observatorio.py` (v0.2) y
`fuente/construir_redesign.py` (v0.3)— y el resultado de `fuente/dist/index.html`
se publica en `dist/dashboards/gaza-observatorio/index.html`.

Todo lo editable está en `fuente/` (plantilla, secciones, guiones de vista y JSON
de datos). Este script solo orquesta y publica; no aplica transformaciones
propias, de modo que el HTML servido es exactamente lo que producen las fuentes.

Uso:
    python dashboards/gaza-observatorio/tools/construir.py
    python dashboards/gaza-observatorio/tools/construir.py --comprobar
"""
from __future__ import annotations

import hashlib
import shutil
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
MODULO = RAIZ / "dashboards" / "gaza-observatorio"
FUENTE = MODULO / "fuente"
INTERMEDIO = FUENTE / "dist" / "index.html"
SALIDA = RAIZ / "dist" / "dashboards" / "gaza-observatorio" / "index.html"
# El constructor v0.3 deja una copia junto a `fuente/`; no forma parte del sitio.
COPIA_LATERAL = MODULO / "Gaza_Huellas_del_dano_v1.html"


def construir() -> Path:
    if not (MODULO / "gaza_panel" / "validacion.json").exists():
        raise SystemExit("falta gaza_panel/validacion.json: lo necesita el constructor v0.2")
    for constructor in (
        "construir_observatorio.py",
        "construir_redesign.py",
        "construir_territorio_etiquetas.py",
        "construir_memoria.py",
        "construir_pronostico.py",
    ):
        ruta = FUENTE / constructor
        if not ruta.exists():
            raise SystemExit(f"falta el constructor {ruta}")
        resultado = subprocess.run(
            [sys.executable, str(ruta)],
            cwd=str(FUENTE),
            capture_output=True,
            text=True,
        )
        if resultado.returncode != 0:
            print(resultado.stdout)
            print(resultado.stderr, file=sys.stderr)
            raise SystemExit(f"falló {constructor}")
        if resultado.stdout.strip():
            print(resultado.stdout.strip().splitlines()[-1])
    if COPIA_LATERAL.exists():
        COPIA_LATERAL.unlink()
    if not INTERMEDIO.exists():
        raise SystemExit(f"el constructor no produjo {INTERMEDIO}")
    return INTERMEDIO


def principal(argumentos: list[str]) -> int:
    intermedio = construir()
    documento = intermedio.read_bytes()
    if "--comprobar" in argumentos:
        if not SALIDA.exists():
            print(f"no hay build publicado en {SALIDA}")
            return 1
        if SALIDA.read_bytes() == documento:
            print(f"el build reproduce el HTML servido: {len(documento):,} bytes · sha256 {hashlib.sha256(documento).hexdigest()[:16]}…")
            return 0
        print("el build NO coincide con el HTML servido")
        return 1
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(intermedio, SALIDA)
    print(
        f"publicado: {SALIDA.relative_to(RAIZ).as_posix()} · {len(documento):,} bytes · "
        f"sha256 {hashlib.sha256(documento).hexdigest()[:16]}…"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(principal(sys.argv[1:]))


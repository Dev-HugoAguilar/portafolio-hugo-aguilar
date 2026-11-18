"""Verificación de la integración local de «Clientes en movimiento».

Comprueba, sobre el repositorio:

1. que la página servida (`dist/dashboards/clientes-en-movimiento/index.html`) es
   exactamente la plantilla aprobada con los datos inyectados (misma secuencia de
   bytes, sin traducción de fin de línea);
2. las cifras del contrato analítico: universos 2300 / 2317 / 2311, cohorte común
   2207, 364 hogares que cambian de perfil y las comprobaciones por hogar;
3. el estado del manifiesto del paquete, declarando las diferencias intencionales
   del repositorio (los dos scripts prospectivos conservan las correcciones de
   seguridad del incremento anterior).

Uso::

    python tools/verify_clientes_en_movimiento.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
PAQUETE = RAIZ / "marketing_customer_project" / "dashboard"
SERVIDA = RAIZ / "dist" / "dashboards" / "clientes-en-movimiento" / "index.html"
MANIFIESTO = RAIZ / "MANIFEST.json"

#: Archivos que el repositorio mantiene distintos a propósito, con su motivo.
DIFERENCIAS_DOCUMENTADAS = {
    "marketing_customer_project/dashboard/template-v2.html": (
        "revisión 2: pestañas con el patrón del portafolio, etiquetas sin numeración y "
        "gráficas de trayectorias y corrientes ampliadas a todo el ancho con vista "
        "ampliada; ver dashboard/REVISION-2.md"
    ),
    "marketing_customer_project/dashboard/index.html": (
        "revisión 2: se reconstruye desde la plantilla y los datos con el "
        "constructor determinista (bytes exactos, sin traducir el fin de línea)"
    ),
    "tools/build_dashboard.py": (
        "revisión 2: escribe bytes exactos (write_bytes) para que el HTML sea "
        "reproducible en cualquier sistema operativo"
    ),
    "marketing_customer_project/src/randomize_segment_campaign_trial.py": (
        "conserva la corrección de seguridad: el aleatorizador ya no afirma "
        "randomization_confirmed y guarda el sha256 del manifiesto"
    ),
    "marketing_customer_project/src/evaluate_segment_campaign_trial.py": (
        "conserva la corrección: exige el manifiesto, verifica el sha256 y aplica "
        "corrección de Holm a las comparaciones primarias"
    ),
}

fallos: list[str] = []


def comprobar(condicion: bool, mensaje: str) -> None:
    print(("  ok   " if condicion else "  FALLO") + f" {mensaje}")
    if not condicion:
        fallos.append(mensaje)


def main() -> int:
    print("Clientes en movimiento · verificación de la integración")

    plantilla = (PAQUETE / "template-v2.html").read_text(encoding="utf-8")
    datos_texto = (PAQUETE / "data-v2.json").read_text(encoding="utf-8")
    comprobar(plantilla.count("__DATA__") == 1, "la plantilla tiene un único marcador __DATA__")
    html_esperado = plantilla.replace("__DATA__", datos_texto).encode("utf-8")
    servida = SERVIDA.read_bytes()
    comprobar(
        hashlib.sha256(html_esperado).hexdigest() == hashlib.sha256(servida).hexdigest(),
        "la página servida es la plantilla aprobada con los datos inyectados (bytes idénticos)",
    )

    datos = json.loads(datos_texto)
    mapas = [{fila["household_id"]: fila for fila in snapshot["rows"]} for snapshot in datos["snapshots"]]
    comprobar([len(mapa) for mapa in mapas] == [2300, 2317, 2311], "universos por corte 2300 / 2317 / 2311")
    comunes = set.intersection(*(set(mapa) for mapa in mapas))
    comprobar(len(comunes) == 2207, f"cohorte común de 2207 hogares (obtenido: {len(comunes)})")
    cambian = sum(1 for hogar in comunes if len({mapa[hogar]["segment"] for mapa in mapas}) > 1)
    comprobar(cambian == 364, f"364 hogares cambian de perfil en la cohorte (obtenido: {cambian})")

    agosto = mapas[1]["19"]
    comprobar(agosto["baskets"] == 96, f"hogar 19 en agosto: 96 canastas (obtenido: {agosto['baskets']})")
    comprobar(
        abs(agosto["sales"] - 2250.38) < 1e-9,
        f"hogar 19 en agosto: gasto 2250.38 (obtenido: {agosto['sales']})",
    )

    # Semana 13 del hogar 1 en agosto: bloque final de seis días, 1 canasta y 96.71 de gasto.
    snapshot = datos["snapshots"][1]
    columnas = snapshot["weekly_columns"]
    indice = {nombre: posicion for posicion, nombre in enumerate(columnas)}
    filas = [fila for fila in snapshot["weekly"] if fila[indice["household_id"]] == "1"]
    semana13 = [fila for fila in filas if fila[indice["week"]] == 12]
    comprobar(len(semana13) == 1, "el hogar 1 tiene un único bloque semanal 13 en agosto")
    if semana13:
        bloque = semana13[0]
        comprobar(bloque[indice["baskets"]] == 1, f"S13 del hogar 1: 1 canasta (obtenido: {bloque[indice['baskets']]})")
        comprobar(
            abs(bloque[indice["sales"]] - 96.71) < 1e-9,
            f"S13 del hogar 1: gasto 96.71 (obtenido: {bloque[indice['sales']]})",
        )

    # Reconciliación semanal ↔ snapshot para los tres cortes.
    for numero_corte, (mapa, corte) in enumerate(zip(mapas, datos["snapshots"]), start=1):
        acumulado: dict[str, list[float]] = {}
        for hogar, semana, venta, canastas, lineas, cupones in corte["weekly"]:
            if not 0 <= semana <= 12 or hogar not in mapa:
                fallos.append(f"corte {numero_corte}: bloque semanal inválido ({hogar}, {semana})")
            valores = acumulado.setdefault(hogar, [0.0, 0, 0, 0])
            valores[0] += venta
            valores[1] += canastas
            valores[2] += lineas
            valores[3] += cupones
        for hogar, fila in mapa.items():
            valores = acumulado[hogar]
            if abs(valores[0] - fila["sales"]) > 1e-5 or valores[1] != fila["baskets"]:
                fallos.append(f"corte {numero_corte}: la semana no reconcilia con el hogar {hogar}")
                break
    comprobar(
        not any("reconcilia" in fallo for fallo in fallos),
        "los bloques semanales reconcilian con el snapshot de cada hogar en los tres cortes",
    )

    revisada = (RAIZ / "marketing_customer_project" / "dashboard" / "index.html").read_bytes()
    comprobar(
        hashlib.sha256(revisada).hexdigest() == hashlib.sha256(html_esperado).hexdigest(),
        "el HTML del repositorio se reconstruye igual desde la plantilla y los datos (bytes)",
    )

    print("\nManifiesto del paquete")
    manifiesto = json.loads(MANIFIESTO.read_text(encoding="utf-8"))
    coinciden = 0
    for nombre, esperado in manifiesto["sha256"].items():
        ruta = RAIZ / nombre
        if not ruta.exists():
            print(f"  ausente {nombre}")
            continue
        if hashlib.sha256(ruta.read_bytes()).hexdigest() == esperado:
            coinciden += 1
        elif nombre in DIFERENCIAS_DOCUMENTADAS:
            print(f"  diferencia documentada {nombre}\n      {DIFERENCIAS_DOCUMENTADAS[nombre]}")
        else:
            fallos.append(f"hash distinto sin justificar: {nombre}")
            print(f"  distinto {nombre}")
    total = len(manifiesto["sha256"])
    print(f"  {coinciden} de {total} archivos coinciden con el manifiesto aprobado")

    print()
    if fallos:
        print(f"✗ {len(fallos)} fallo(s)")
        for fallo in fallos:
            print(f"  · {fallo}")
        return 1
    print("✓ Integración verificada: página servida reproducible y contrato analítico intacto.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

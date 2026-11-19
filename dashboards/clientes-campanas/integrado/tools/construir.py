"""Construye el tablero integrado de «Clientes y campañas» que sirve el portafolio.

Fuente de datos: los artefactos reales del repositorio
(`dist/dashboards/clientes-campanas/data/*.json`, exportados por
`marketing_customer_project/src/export_dashboard_artifacts.py`).

El rediseño recibido consume un diccionario con la forma de los 23 CSV de la
entrega. Este script **los vuelve a tabular desde los artefactos** con el mismo
código que produjo esos CSV en la auditoría, comprueba que cada tabla coincide
byte a byte con la referencia de `paridad/` y solo entonces genera el HTML
autónomo en `dist/dashboards/clientes-campanas/index.html`.

Cinco tablas son narrativas o provienen del DOM servido (indicadores de portada,
contexto de Criteo, referencias de julio, artefactos e inventario de bloques):
esas se leen de `paridad/`, que es su fuente canónica, y se declaran como tales.

Uso:
    python integrado/tools/construir.py            # construye y verifica paridad
    python integrado/tools/construir.py --solo-html
"""
from __future__ import annotations

import contextlib
import csv
import hashlib
import io
import json
import sys
import tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[4]
MODULO = RAIZ / "dashboards" / "clientes-campanas"
FUENTES_JSON = MODULO / "data" if (MODULO / "data").exists() else RAIZ / "dist" / "dashboards" / "clientes-campanas" / "data"
ARTEFACTOS = RAIZ / "dist" / "dashboards" / "clientes-campanas" / "data"
HERRAMIENTAS = RAIZ / "dashboards" / "clientes-campanas" / "tools"
INTEGRADO = MODULO / "integrado"
PARIDAD = INTEGRADO / "paridad"
SRC = INTEGRADO / "src"
SALIDA = RAIZ / "dist" / "dashboards" / "clientes-campanas" / "index.html"

# clave del dataset → archivo CSV de la entrega
FICHEROS = {
    "hogares": "02c2_hogares_datos_reales.csv",
    "segmentos": "02a2_medianas_datos_reales.csv",
    "cuantiles": "02b2_cuantiles_datos_reales.csv",
    "departamentos": "02d2_departamentos_datos_reales.csv",
    "k": "02e_diagnostico_k_datos_reales.csv",
    "flujos": "03a2_transiciones_datos_reales.csv",
    "estabilidad": "03b_estabilidad_datos_reales.csv",
    "metricas": "04a2_metricas_datos_reales.csv",
    "targeting": "04b_targeting_datos_reales.csv",
    "calibracion": "04c_calibracion_datos_reales.csv",
    "campanas": "04d_campanas_datos_reales.csv",
    "carreras": "05b2_carreras_datos_reales.csv",
    "resumen": "05b3_resumen_datos_reales.csv",
    "uplift": "05c_curvas_datos_reales.csv",
    "rangos": "05d2_rangos_datos_reales.csv",
    "escenarios": "06d_escenarios_datos_reales.csv",
    "capacidad": "06e_capacidad_datos_reales.csv",
    "proyecto_kpis": "01_indicadores.csv",
    "artefactos": "01f_artefactos.csv",
    "criteo_contexto": "05a_contexto_criteo.csv",
    "inventario": "inventario_visualizaciones.csv",
    "perfil_otro_corte": "02a_indicadores_tamano_otro_corte.csv",
    "procedencia": "procedencia_analisis.csv",
}

# Tablas que se vuelven a tabular desde los artefactos JSON del repositorio.
DERIVADAS = {clave for clave in FICHEROS if clave not in
             {"proyecto_kpis", "artefactos", "criteo_contexto", "inventario", "perfil_otro_corte"}}

# Tablas narrativas o medidas sobre el DOM servido: su fuente canónica es paridad/.
NARRATIVAS = {clave for clave in FICHEROS if clave not in DERIVADAS}


def _tabular_desde_artefactos(destino: Path) -> None:
    """Reutiliza el tabulador verificado de la auditoría (JSON → CSV)."""
    sys.path.insert(0, str(HERRAMIENTAS))
    import auditar_datos  # noqa: PLC0415  (se importa aquí para no exigir pandas al solo leer)

    with contextlib.redirect_stdout(io.StringIO()):
        auditar_datos.main(destino)


def _leer_csv(texto: str) -> list[dict[str, str]]:
    return list(csv.DictReader(io.StringIO(texto)))


def _sha256(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def dataset() -> tuple[dict, dict]:
    """Devuelve (dataset del tablero, informe de paridad por tabla)."""
    if not ARTEFACTOS.exists():
        raise SystemExit(f"faltan los artefactos del tablero: {ARTEFACTOS}")

    with tempfile.TemporaryDirectory() as temporal:
        temporal = Path(temporal)
        _tabular_desde_artefactos(temporal)
        generado = temporal / "datos_graficas"

        datos: dict[str, object] = {}
        paridad: dict[str, dict] = {}

        for clave, archivo in FICHEROS.items():
            referencia = PARIDAD / archivo
            if not referencia.exists():
                raise SystemExit(f"falta la referencia de paridad: {referencia}")
            if clave in DERIVADAS:
                candidato = generado / archivo
                if not candidato.exists():
                    raise SystemExit(f"el tabulador no generó {archivo}")
                mismo = _sha256(candidato) == _sha256(referencia)
                origen = "artefactos JSON del repositorio"
                texto = candidato.read_text(encoding="utf-8")
                if not mismo:
                    raise SystemExit(
                        f"paridad rota en {archivo}: los artefactos del repositorio ya no producen "
                        f"la tabla de referencia. Revisa export_dashboard_artifacts.py antes de publicar."
                    )
            else:
                mismo = True
                origen = "referencia de la entrega (tabla narrativa o medida sobre el DOM servido)"
                texto = referencia.read_text(encoding="utf-8")
            datos[clave] = _leer_csv(texto)
            paridad[archivo] = {
                "clave": clave,
                "origen": origen,
                "filas": len(datos[clave]),
                "sha256": hashlib.sha256(texto.encode("utf-8")).hexdigest(),
                "identica": mismo,
            }

        manifiesto_repo = json.loads((ARTEFACTOS / "manifiesto.json").read_text(encoding="utf-8"))
        manifiesto_ref = json.loads((PARIDAD / "00_manifiesto_artefactos.json").read_text(encoding="utf-8"))
        if manifiesto_repo != manifiesto_ref:
            raise SystemExit("el manifiesto del repositorio difiere del publicado en la entrega")
        # El orden de las claves replica el del artefacto de referencia para que el
        # HTML generado pueda compararse byte a byte con él.
        datos["fuentes"] = dict(FICHEROS)
        datos["manifiesto"] = manifiesto_repo
        paridad["00_manifiesto_artefactos.json"] = {
            "clave": "manifiesto",
            "origen": "artefactos JSON del repositorio",
            "filas": 1,
            "sha256": _sha256(ARTEFACTOS / "manifiesto.json"),
            "identica": True,
        }

    return datos, paridad


def dataset_json(datos: dict) -> str:
    crudo = json.dumps(datos, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return crudo


def html(datos: dict) -> str:
    plantilla = (SRC / "template.html").read_text(encoding="utf-8")
    assert plantilla.count("__CSS__") == 1 and plantilla.count("__DATA__") == 1 and plantilla.count("__JS__") == 1
    estilos = (SRC / "styles.css").read_text(encoding="utf-8") + "\n" + (SRC / "integracion.css").read_text(encoding="utf-8")
    guion = (
        (SRC / "app.js").read_text(encoding="utf-8")
        + "\n"
        + (SRC / "integracion.js").read_text(encoding="utf-8")
        + "\n"
        + (SRC / "laboratorio.js").read_text(encoding="utf-8")
    )
    return (
        plantilla.replace("__CSS__", estilos)
        .replace("__DATA__", dataset_json(datos))
        .replace("__JS__", guion)
    )


def construir(solo_html: bool = False) -> dict:
    datos, paridad = dataset()
    documento = html(datos)
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    # Se escribe con salto de línea LF, igual que el artefacto de referencia de la
    # entrega: así el HTML servido reproduce byte a byte el documento aprobado.
    SALIDA.write_text(documento, encoding="utf-8", newline="\n")
    informe = {
        "salida": str(SALIDA.relative_to(RAIZ)).replace("\\", "/"),
        "bytes": len(documento.encode("utf-8")),
        "hogares": len(datos["hogares"]),
        "tablas": len(FICHEROS),
        "derivadas_de_artefactos": sum(1 for fila in paridad.values() if fila["origen"].startswith("artefactos")),
        "paridad": paridad,
    }
    if not solo_html:
        (INTEGRADO / "build").mkdir(exist_ok=True)
        (INTEGRADO / "build" / "paridad.json").write_text(
            json.dumps(informe, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    return informe


def main(argumentos: list[str]) -> int:
    informe = construir("--solo-html" in argumentos)
    print(
        f"tablero integrado: {informe['salida']} · {informe['bytes']:,} bytes · "
        f"{informe['hogares']:,} hogares · {informe['tablas']} tablas "
        f"({informe['derivadas_de_artefactos']} desde artefactos del repositorio, "
        f"{informe['tablas'] + 1 - informe['derivadas_de_artefactos'] - 1} desde la referencia)"
    )
    if "--solo-html" not in argumentos:
        print("paridad: las 18 tablas derivadas coinciden byte a byte con la entrega")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

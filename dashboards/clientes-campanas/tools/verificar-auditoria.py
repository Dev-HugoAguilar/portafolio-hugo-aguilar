"""Verifica el paquete de auditoría visual: enlaces, capturas, datos y consistencia del CSV.

Se ejecuta sobre el ZIP entregado (no sobre la carpeta de trabajo) para garantizar que el
paquete es autocontenido.

Uso:
    python tools/verificar-auditoria.py <ruta_del_zip>
"""
from __future__ import annotations

import csv
import io
import re
import sys
import urllib.parse
import zipfile
from pathlib import Path

FALLOS: list[str] = []
AVISOS: list[str] = []


def fallo(mensaje: str) -> None:
    FALLOS.append(mensaje)


def aviso(mensaje: str) -> None:
    AVISOS.append(mensaje)


def main(ruta_zip: Path) -> int:
    if not ruta_zip.exists():
        print(f"no existe el ZIP: {ruta_zip}")
        return 2

    with zipfile.ZipFile(ruta_zip) as paquete:
        nombres = {nombre for nombre in paquete.namelist() if not nombre.endswith("/")}
        raiz = sorted({nombre.split("/")[0] for nombre in nombres})
        if len(raiz) != 1:
            fallo(f"el ZIP debería tener una sola carpeta raíz, tiene {raiz}")
        carpeta = raiz[0] if raiz else ""

        def leer(nombre: str) -> bytes:
            return paquete.read(nombre)

        def existe(relativa: str) -> bool:
            return f"{carpeta}/{relativa.lstrip('/')}" in nombres

        # ---------------------------------------------------- estructura mínima
        for obligatorio in ["LEEME.md", "inventario_visualizaciones.csv", "informe_auditoria.md", "galeria.html"]:
            if not existe(obligatorio):
                fallo(f"falta {obligatorio}")
        for carpeta_esperada in ["capturas/", "datos_graficas/", "codigo/", "reproduccion/"]:
            if not any(nombre.startswith(f"{carpeta}/{carpeta_esperada}") for nombre in nombres):
                fallo(f"falta la carpeta {carpeta_esperada}")

        capturas = [nombre for nombre in nombres if nombre.startswith(f"{carpeta}/capturas/")]
        datos = [nombre for nombre in nombres if nombre.startswith(f"{carpeta}/datos_graficas/")]
        codigo = [nombre for nombre in nombres if nombre.startswith(f"{carpeta}/codigo/")]
        print(f"contenido: {len(capturas)} capturas · {len(datos)} archivos de datos · {len(codigo)} de código")

        # ---------------------------------------------------- inventario
        texto_inventario = leer(f"{carpeta}/inventario_visualizaciones.csv").decode("utf-8-sig")
        filas = list(csv.DictReader(io.StringIO(texto_inventario)))
        if len(filas) < 40:
            fallo(f"el inventario tiene solo {len(filas)} filas")
        estados = {}
        for fila in filas:
            estados[fila["estado"]] = estados.get(fila["estado"], 0) + 1
        print("estados:", ", ".join(f"{k}={v}" for k, v in sorted(estados.items())))

        for fila in filas:
            identificador = fila["id"]
            if not fila["pregunta_negocio"].strip():
                fallo(f"{identificador}: sin pregunta de negocio")
            if not fila["fuente_y_corte"].strip():
                fallo(f"{identificador}: sin fuente")
            if not fila["componente"].strip() and fila["estado"] == "implementada":
                fallo(f"{identificador}: implementada sin componente")
            capturas_fila = [c.strip() for c in fila["capturas"].split(";") if c.strip()]
            if fila["estado"] == "implementada":
                if not capturas_fila:
                    fallo(f"{identificador}: implementada sin captura y sin bloqueador")
                for captura in capturas_fila:
                    if not existe(f"capturas/{captura}"):
                        fallo(f"{identificador}: captura inexistente {captura}")
            for dato in [d.strip() for d in fila["datos"].split(";") if d.strip()]:
                if not existe(f"datos_graficas/{dato}"):
                    fallo(f"{identificador}: dato inexistente {dato}")
            for codigo_fila in [fila["componente"], fila["archivo_generador"]]:
                if codigo_fila and codigo_fila not in ("—", "") and not existe(codigo_fila):
                    fallo(f"{identificador}: código inexistente {codigo_fila}")

        # ---------------------------------------------------- galería
        html = leer(f"{carpeta}/galeria.html").decode("utf-8")
        referencias = set()
        for coincidencia in re.finditer(r'(?:href|src)="([^"#:]+)"', html):
            destino = urllib.parse.unquote(coincidencia.group(1))
            if destino.startswith(("http", "mailto", "data:")):
                continue
            referencias.add(destino.split("#")[0])
        if not referencias:
            fallo("la galería no tiene enlaces relativos")
        for destino in sorted(referencias):
            if destino.endswith(".png") and not existe(f"capturas/{Path(destino).name}"):
                fallo(f"galería: imagen inexistente {destino}")
            elif not existe(destino):
                fallo(f"galería: enlace roto {destino}")
        imagenes = len(re.findall(r'<img\s', html))
        print(f"galería: {imagenes} imágenes · {len(referencias)} enlaces relativos verificados")
        if imagenes < 40:
            fallo(f"la galería muestra solo {imagenes} imágenes")

        # ---------------------------------------------------- informe
        informe = leer(f"{carpeta}/informe_auditoria.md").decode("utf-8")
        for seccion in ["Problemas verificados", "Sugerencias", "Poblaciones por módulo", "Bloqueadores", "Comprobaciones automáticas"]:
            if seccion not in informe:
                fallo(f"el informe no contiene la sección «{seccion}»")
        for captura in re.findall(r"`([0-9a-z_]+\.png)`", informe):
            if not existe(f"capturas/{captura}"):
                fallo(f"informe: captura citada inexistente {captura}")
        for dato in re.findall(r"`([0-9a-z_]+\.(?:csv|json))`", informe):
            if not existe(f"datos_graficas/{dato}") and not existe(dato):
                fallo(f"informe: dato citado inexistente {dato}")

        # ---------------------------------------------------- datos
        for nombre in datos:
            relativa = nombre.split(f"{carpeta}/", 1)[1]
            contenido = leer(nombre)
            if relativa.endswith(".csv"):
                filas_dato = list(csv.reader(io.StringIO(contenido.decode("utf-8-sig"))))
                if not filas_dato:
                    fallo(f"{relativa}: CSV vacío")
                    continue
                ancho = len(filas_dato[0])
                irregulares = [indice for indice, fila in enumerate(filas_dato) if len(fila) != ancho]
                if len(irregulares) > 3:
                    fallo(f"{relativa}: {len(irregulares)} filas con columnas distintas ({irregulares[:3]})")
                elif irregulares:
                    # Las tablas copiadas del DOM pueden traer una fila de totales con
                    # menos columnas: se conserva tal cual y se avisa.
                    aviso(f"{relativa}: {len(irregulares)} fila(s) de totales con menos columnas (copiadas tal cual de la interfaz)")
            elif relativa.endswith(".json"):
                import json

                try:
                    json.loads(contenido.decode("utf-8"))
                except json.JSONDecodeError as error:
                    fallo(f"{relativa}: JSON inválido ({error})")

        # ------------------------------------- comprobaciones de contenido clave
        def filas_de(relativa: str) -> list[list[str]]:
            return list(csv.reader(io.StringIO(leer(f"{carpeta}/datos_graficas/{relativa}").decode("utf-8-sig"))))

        targeting = filas_de("04b_targeting_datos_reales.csv")
        cortes = {fila[0] for fila in targeting[1:]}
        if len(targeting) - 1 != 303 or len(cortes) != 3:
            fallo(f"targeting: se esperaban 303 filas en 3 cortes, hay {len(targeting) - 1} en {len(cortes)}")

        curvas = filas_de("05c_curvas_datos_reales.csv")
        series = {(fila[0], fila[1]) for fila in curvas[1:]}
        if len(curvas) - 1 != 700:
            fallo(f"curvas de uplift: se esperaban 700 puntos, hay {len(curvas) - 1}")
        if not any("qini_por_usuario" in fila for fila in [curvas[0]]):
            fallo("curvas de uplift: falta la columna qini_por_usuario")

        calibracion = filas_de("04c_calibracion_datos_reales.csv")
        if len(calibracion) - 1 != 30:
            fallo(f"calibración: se esperaban 30 filas (3 cortes × 10 deciles), hay {len(calibracion) - 1}")

        mediciones = leer(f"{carpeta}/datos_graficas/00_mediciones_layout.json").decode("utf-8")
        for clave in ["cortados", "solapesPunto", "huecos", "usoEspacio"]:
            if clave not in mediciones:
                fallo(f"mediciones: falta la clave {clave}")

        procedencia = filas_de("procedencia_datos.csv")
        if len(procedencia) < 40:
            fallo(f"procedencia: solo {len(procedencia)} filas")

        # ---------------------------------------------------- autocontenido
        for nombre in nombres:
            if nombre.endswith((".html", ".md", ".csv")):
                try:
                    texto = leer(nombre).decode("utf-8", errors="ignore")
                except KeyError:
                    continue
                if re.search(r"[A-Z]:\\\\Portafolio", texto) or "file:///" in texto:
                    fallo(f"{nombre}: contiene rutas absolutas")

        # ---------------------------------------------------- LEEME
        leeme = leer(f"{carpeta}/LEEME.md").decode("utf-8")
        for palabra in ["galeria.html", "inventario_visualizaciones.csv", "informe_auditoria.md", "datos_graficas/", "reproduccion/"]:
            if palabra not in leeme:
                fallo(f"LEEME no menciona {palabra}")

    print()
    for mensaje in AVISOS:
        print(f"AVISO: {mensaje}")
    if FALLOS:
        print(f"{len(FALLOS)} fallos:")
        for mensaje in FALLOS:
            print(f"  - {mensaje}")
        return 1
    print("verificación OK: estructura, enlaces, capturas, datos y CSV consistentes")
    return 0


if __name__ == "__main__":
    argumento = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path("entregas") / "Clientes_y_campanas_auditoria_visual.zip"
    raise SystemExit(main(argumento))

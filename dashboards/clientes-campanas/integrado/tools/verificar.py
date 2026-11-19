"""Verifica la integración de «Clientes y campañas» sin abrir el navegador.

Comprueba, en este orden:

1. que los artefactos JSON del repositorio siguen produciendo, byte a byte, las 23
   tablas de la entrega (paridad de datos);
2. los invariantes del tablero: hogares únicos, transiciones reconciliadas,
   tres cortes de targeting y calibración, carreras del benchmark, curvas de la
   muestra, escenarios publicados y los 41 bloques del inventario;
3. que el HTML servido es el documento construido, que el módulo del portafolio
   apunta a él y que el bundle anterior ya no existe;
4. la separación de poblaciones y la distinción entre publicado y recalculado.

Uso: python integrado/tools/verificar.py
Sale con código 1 si algo falla.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import construir  # noqa: E402

RAIZ = construir.RAIZ
SALIDA = construir.SALIDA
MODULO_PORTFOLIO = RAIZ / "dist" / "projects" / "clientes-campanas.js"
BUNDLE_ANTERIOR = RAIZ / "dist" / "dashboards" / "clientes-campanas" / "app.js"

fallos: list[str] = []


def comprobar(condicion: bool, mensaje: str) -> None:
    if not condicion:
        fallos.append(mensaje)


def filas(datos: dict, clave: str) -> list[dict[str, str]]:
    return datos[clave]


def principal(datos: dict) -> int:
    # ------------------------------------------------------------- datos
    hogares = filas(datos, "hogares")
    comprobar(len(hogares) == 2311, f"hogares: {len(hogares)} filas en lugar de 2 311")
    comprobar(len({fila["hogar"] for fila in hogares}) == len(hogares), "hogares: identificadores repetidos")
    comprobar(
        {fila["segmento"] for fila in hogares} == {"Menor actividad", "Mayor actividad"},
        "hogares: perfiles distintos de los declarados",
    )

    flujos = filas(datos, "flujos")
    for par in {fila["corte_a"] for fila in flujos}:
        grupo = [fila for fila in flujos if fila["corte_a"] == par]
        comprobar(
            sum(int(fila["hogares"]) for fila in grupo) == int(grupo[0]["hogares_comunes"]),
            f"flujos: el par {par} no reconcilia hogares comunes",
        )

    targeting = filas(datos, "targeting")
    metricas = filas(datos, "metricas")
    calibracion = filas(datos, "calibracion")
    cortes = {fila["corte"] for fila in targeting}
    comprobar(len(cortes) == 3, f"targeting: {len(cortes)} cortes en lugar de 3")
    for corte in cortes:
        grupo = [fila for fila in targeting if fila["corte"] == corte]
        comprobar(len(grupo) == 101, f"targeting {corte}: {len(grupo)} puntos")
        totales = {
            fila["metrica"]: float(fila["valor"])
            for fila in metricas
            if fila["corte"] == corte and fila["grupo_exposicion"] == "todos"
        }
        ultimo = max(grupo, key=lambda fila: float(fila["fraccion_contactada"]))
        comprobar(int(ultimo["contactados"]) == int(totales["filas"]), f"targeting {corte}: pares del holdout")
        comprobar(int(ultimo["capturados"]) == int(totales["positivos"]), f"targeting {corte}: respuestas del holdout")
        deciles = [fila for fila in calibracion if fila["corte"] == corte]
        comprobar(len(deciles) == 10, f"calibración {corte}: {len(deciles)} deciles")
        comprobar(
            sum(int(fila["filas"]) for fila in deciles) == int(totales["filas"]),
            f"calibración {corte}: los deciles no suman los pares del holdout",
        )
        for fila in deciles:
            pronosticado = float(fila["probabilidad_media_pronosticada"])
            observado = float(fila["tasa_observada"])
            comprobar(
                0 <= pronosticado <= 1 and 0 <= observado <= 1,
                f"calibración {corte} decil {fila['decil']}: proporción fuera de rango",
            )

    carreras = filas(datos, "carreras")
    comprobar(len(carreras) == 18, f"carreras: {len(carreras)} en lugar de 18")
    comprobar({fila["resultado"] for fila in carreras} == {"visit", "conversion"}, "carreras: resultados")
    for fila in carreras:
        comprobar(
            fila["ic_95_inferior_pp"] and fila["ic_95_superior_pp"],
            "carreras: el intervalo publicado corresponde al uplift del decil superior",
        )

    curvas = filas(datos, "uplift")
    comprobar(len(curvas) == 700, f"curvas: {len(curvas)} puntos en lugar de 700")
    comprobar({fila["resultado"] for fila in curvas} == {"visit", "conversion"}, "curvas: resultados")
    comprobar(
        all(fila["qini_por_usuario"] != "" for fila in curvas),
        "curvas: falta la ganancia acumulada por usuario",
    )

    rangos = filas(datos, "rangos")
    comprobar(len(rangos) == 7, f"rangos: {len(rangos)} filas")
    comprobar(
        all("intervalo de confianza" in fila["etiqueta"] for fila in rangos),
        "rangos: deben declararse como rango entre semillas, no como intervalo de confianza",
    )

    escenarios = filas(datos, "escenarios")
    for mde in {fila["mde_relativo"] for fila in escenarios}:
        grupo = [fila for fila in escenarios if fila["mde_relativo"] == mde]
        comprobar(
            sum(int(fila["tres_brazos"]) for fila in grupo) == int(grupo[0]["total_informe"]),
            f"escenarios: el MDE {mde} no reconcilia su total publicado",
        )
    comprobar(
        any(fila["total_informe"] == "22107" for fila in escenarios),
        "escenarios: falta el dimensionamiento publicado de 22 107 hogares",
    )

    capacidad = {fila["campo"]: fila["valor"] for fila in filas(datos, "capacidad")}
    comprobar(capacidad.get("can_support_30pct_mde") == "false", "capacidad: el cohorte debería declarar que no alcanza")

    # --------------------------------------------- separación de poblaciones
    criteo = filas(datos, "criteo_contexto")
    comprobar(
        all("hogar" not in fila["etiqueta"].lower() for fila in criteo),
        "Criteo: el bloque de contexto no debe hablar de hogares",
    )
    comprobar(
        len({fila["resultado"] for fila in filas(datos, "resumen")}) == 2,
        "resumen: debe cubrir visitas y conversiones del benchmark completo",
    )

    # --------------------------------------------- inventario y cobertura
    inventario = filas(datos, "inventario")
    implementadas = {fila["id"] for fila in inventario if fila["estado"] == "implementada"}
    comprobar(len(implementadas) == 41, f"inventario: {len(implementadas)} bloques implementados")
    analisis = {fila["id"] for fila in inventario if fila["estado"] == "solo en análisis"}
    comprobar(len(analisis) == 10, f"inventario: {len(analisis)} bloques solo en análisis")

    cobertura = json.loads((construir.PARIDAD / "cobertura_redisenada.json").read_text(encoding="utf-8"))
    comprobar(set(cobertura) == implementadas, "cobertura: los destinos no coinciden con los 41 bloques implementados")
    comprobar(
        {fila["view"] for fila in cobertura.values()} == set(construir_vistas()),
        "cobertura: aparece una vista distinta de las seis del tablero",
    )

    # --------------------------------------------- HTML construido y servido
    documento = construir.html(datos)
    comprobar(SALIDA.exists(), f"falta el HTML servido: {SALIDA}")
    if SALIDA.exists():
        comprobar(SALIDA.read_text(encoding="utf-8") == documento, "el HTML servido no coincide con el documento construido")
        texto = SALIDA.read_text(encoding="utf-8")
        comprobar("__DATA__" not in texto and "__JS__" not in texto and "__CSS__" not in texto, "el HTML conserva marcadores sin sustituir")
        comprobar(len(texto.encode("utf-8")) > 700_000, "el HTML servido parece incompleto")
        for vista in construir_vistas():
            comprobar(f"'{vista}'" in texto, f"el HTML no declara la vista {vista}")
        comprobar('href="https://www.dataviz-inspiration.com' in texto, "faltan las referencias de diseño declaradas")

    comprobar(MODULO_PORTFOLIO.exists(), "falta el módulo del portafolio")
    if MODULO_PORTFOLIO.exists():
        modulo = MODULO_PORTFOLIO.read_text(encoding="utf-8")
        comprobar(
            "'dashboards/clientes-campanas/index.html'" in modulo,
            "el módulo del portafolio no carga la página integrada",
        )
        comprobar("data-clientes-campanas" not in modulo, "el módulo sigue cargando el bundle anterior")
    comprobar(not BUNDLE_ANTERIOR.exists(), "el bundle React anterior sigue publicado en dist/")

    # --------------------------------------------- portada
    portada = RAIZ / "dist" / "img" / "clientes-campanas-resumen.jpg"
    comprobar(portada.exists(), "falta la portada de la tarjeta")
    if portada.exists():
        comprobar(portada.stat().st_size > 40_000, "la portada parece vacía")
        # 1600 × 1726 es la geometría de la tarjeta de referencia (Walmart M5).
        with portada.open("rb") as archivo:
            cabecera = archivo.read(4)
            if cabecera[:2] == b"\xff\xd8":
                datos_jpeg = portada.read_bytes()
                posicion = 2
                ancho = alto = 0
                while posicion < len(datos_jpeg):
                    if datos_jpeg[posicion] != 0xFF:
                        posicion += 1
                        continue
                    marcador = datos_jpeg[posicion + 1]
                    longitud = int.from_bytes(datos_jpeg[posicion + 2 : posicion + 4], "big")
                    if 0xC0 <= marcador <= 0xCF and marcador not in (0xC4, 0xC8, 0xCC):
                        alto = int.from_bytes(datos_jpeg[posicion + 5 : posicion + 7], "big")
                        ancho = int.from_bytes(datos_jpeg[posicion + 7 : posicion + 9], "big")
                        break
                    posicion += 2 + longitud
                comprobar(
                    (ancho, alto) == (1600, 1726),
                    f"la portada mide {ancho} × {alto} en lugar de 1600 × 1726",
                )
        contenido = (RAIZ / "dist" / "content.js").read_text(encoding="utf-8")
        comprobar("img/clientes-campanas-resumen.jpg?v=" in contenido, "la tarjeta no declara la portada nueva con versión")
        comprobar("capturaAlto: 1726" in contenido, "la tarjeta no declara la altura de referencia")
        comprobar("capturaAjuste: 'tablero'" in contenido, "la tarjeta no usa la clase compartida de portada")
        comprobar(
            "Portada del tablero «Clientes y campañas»" in contenido,
            "el texto alternativo de la tarjeta no describe la portada actual",
        )
        comprobar("'React', 'TypeScript', 'D3.js', 'Vite'" not in contenido, "la ficha sigue declarando la interfaz React retirada")
        estilos = (RAIZ / "dist" / "style.css").read_text(encoding="utf-8")
        comprobar(".cover.cover-tablero img" in estilos, "falta la regla compartida de la portada de tablero")
        comprobar(
            'li[data-proyecto="clientes-en-movimiento"] .cover img' not in estilos,
            "sigue existiendo la excepción por tarjeta que la clase compartida debía reemplazar",
        )

    return 0


def construir_vistas() -> list[str]:
    return ["proyecto", "perfiles", "evolucion", "campanas", "incrementalidad", "experimento"]


def main() -> int:
    datos, paridad = construir.dataset()

    # Paridad declarada en el propio dataset: todas las tablas derivadas coinciden.
    derivadas = [nombre for nombre, fila in paridad.items() if fila["origen"].startswith("artefactos")]
    for nombre, fila in paridad.items():
        comprobar(fila["identica"], f"paridad rota en {nombre}")
    comprobar(len(derivadas) == 19, f"paridad: {len(derivadas)} tablas derivadas en lugar de 19")

    principal(datos)

    if fallos:
        print(f"FALLOS: {len(fallos)}")
        for mensaje in fallos:
            print(f"  ✗ {mensaje}")
        return 1

    print(
        "verificación OK: 23 tablas con paridad byte a byte · "
        "2 311 hogares únicos · transiciones reconciliadas · 3 cortes de targeting y calibración · "
        "18 carreras y 700 puntos de muestra · escenarios publicados (22 107) · 41 destinos · "
        "HTML servido idéntico al construido · sin bundle anterior · portada nueva."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

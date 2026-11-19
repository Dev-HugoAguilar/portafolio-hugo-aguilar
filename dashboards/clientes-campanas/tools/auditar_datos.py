"""Exporta los datos reales de cada gráfica de «Clientes y campañas» para la auditoría.

Lee los artefactos servidos en `dist/dashboards/clientes-campanas/data/` y escribe,
sin redondear salvo indicación, los puntos y tablas que alimentan cada visualización:

* curvas de targeting (101 puntos por corte) y calibración (10 deciles por corte);
* curvas de uplift (100 puntos por modelo y resultado) y carreras del benchmark;
* enjambre de puntos, coordenadas paralelas, cuantiles y matriz de departamentos;
* transiciones entre cortes, diagnóstico de k, escenarios y capacidad del experimento.

También genera el diccionario de campos y la tabla de procedencia (corte, filtros y
versión de datos usada en cada captura).

Uso:
    python tools/auditar_datos.py <carpeta_auditoria>
"""
from __future__ import annotations

import csv
import json
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
DATOS_TABLERO = RAIZ / "dist" / "dashboards" / "clientes-campanas" / "data"
REPORTES = RAIZ / "marketing_customer_project" / "reports"

TRADUCCION_MODELO = {
    "s_learner": "S-learner",
    "t_learner": "T-learner",
    "propension": "Propensión",
    "response_propensity": "Propensión",
    "azar": "Ranking aleatorio",
    "random_targeting": "Ranking aleatorio",
}
TRADUCCION_SEGMENTO = {"menor_actividad": "Menor actividad", "mayor_actividad": "Mayor actividad"}


def leer_json(ruta: Path) -> dict:
    with ruta.open(encoding="utf-8") as archivo:
        return json.load(archivo)


def numero(valor):
    """Devuelve el número sin perder precisión: enteros como enteros, flotantes tal cual."""
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return "true" if valor else "false"
    if isinstance(valor, int):
        return valor
    if isinstance(valor, float):
        return repr(valor)
    return valor


def escribir_csv(ruta: Path, encabezado: list[str], filas: list[list]) -> int:
    with ruta.open("w", encoding="utf-8", newline="") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(encabezado)
        for fila in filas:
            escritor.writerow([numero(valor) if not isinstance(valor, str) else valor for valor in fila])
    return len(filas)


def main(salida: Path) -> int:
    datos = salida / "datos_graficas"
    datos.mkdir(parents=True, exist_ok=True)

    manifiesto = leer_json(DATOS_TABLERO / "manifiesto.json")
    perfiles = leer_json(DATOS_TABLERO / "perfiles.json")
    evolucion = leer_json(DATOS_TABLERO / "evolucion.json")
    campanas = leer_json(DATOS_TABLERO / "campanas.json")
    incrementalidad = leer_json(DATOS_TABLERO / "incrementalidad.json")
    experimento = leer_json(DATOS_TABLERO / "experimento.json")

    generados: dict[str, int] = {}
    procedencia: list[list] = []

    def anotar(archivo: str, filas: int, origen: str, corte: str, unidad: str) -> None:
        generados[archivo] = filas
        procedencia.append([archivo, origen, corte, unidad, filas])

    # ---------------------------------------------------------------- manifiesto
    shutil.copyfile(DATOS_TABLERO / "manifiesto.json", datos / "00_manifiesto_artefactos.json")
    anotar("00_manifiesto_artefactos.json", 1, "data/manifiesto.json (copia literal)", "todos", "metadatos del paquete")

    # ---------------------------------------------------------------- perfiles
    corte_activo = next((c for c in perfiles["cortes"] if c["corte"] == "2017-09-01"), perfiles["cortes"][-1])

    filas = []
    for segmento in corte_activo["segmentos"]:
        filas.append(
            [
                segmento["id"],
                segmento["nombre"],
                segmento["hogares"],
                segmento["participacion"],
                segmento["gasto_total_share"],
                segmento["medianas"]["canastas"],
                segmento["medianas"]["gasto"],
                segmento["medianas"]["recencia_dias"],
                segmento["medianas"]["productos"],
                segmento["medianas"]["canasta_media"],
                segmento["medianas"]["tasa_cupon"],
                segmento["medianas"]["descuento_linea"],
            ]
        )
    anotar(
        "02a2_medianas_datos_reales.csv",
        escribir_csv(
            datos / "02a2_medianas_datos_reales.csv",
            [
                "segmento_id",
                "segmento",
                "hogares",
                "participacion_universo",
                "participacion_gasto",
                "mediana_canastas",
                "mediana_gasto_usd",
                "mediana_recencia_dias",
                "mediana_productos",
                "mediana_canasta_media_usd",
                "mediana_tasa_cupon",
                "mediana_descuento_linea",
            ],
            filas,
        ),
        "data/perfiles.json → cortes[corte=2017-09-01].segmentos[].medianas",
        corte_activo["corte"],
        "hogar comprador del corte (90 días)",
    )

    muestra = corte_activo["muestra_beeswarm"]
    filas = []
    for indice, hogar in enumerate(muestra["hogar"]):
        filas.append(
            [
                hogar,
                corte_activo["segmentos"][muestra["segmento"][indice]]["nombre"],
                muestra["recencia_dias"][indice],
                muestra["canastas"][indice],
                muestra["gasto"][indice],
                muestra["productos"][indice],
                muestra["canasta_media"][indice],
                muestra["tasa_cupon"][indice],
                muestra["descuento_linea"][indice],
            ]
        )
    anotar(
        "02b_beeswarm_datos_reales.csv",
        escribir_csv(
            datos / "02b_beeswarm_datos_reales.csv",
            [
                "hogar",
                "segmento",
                "recencia_dias",
                "canastas",
                "gasto_usd",
                "productos",
                "canasta_media_usd",
                "tasa_cupon",
                "descuento_linea",
            ],
            filas,
        ),
        "data/perfiles.json → cortes[corte=2017-09-01].muestra_beeswarm",
        corte_activo["corte"],
        "hogar comprador (muestra visual de hasta 320 por segmento)",
    )

    filas = []
    for metrica, valores in corte_activo["distribuciones"].items():
        universo = valores["universo"]
        fila = [metrica, "universo", universo["n"], universo["p10"], universo["p25"], universo["p50"], universo["p75"], universo["p90"], universo["media"]]
        filas.append(fila)
        for posicion, por_segmento in enumerate(valores["por_segmento"]):
            nombre = corte_activo["segmentos"][posicion]["nombre"]
            filas.append(
                [
                    metrica,
                    nombre,
                    por_segmento["n"],
                    por_segmento["p10"],
                    por_segmento["p25"],
                    por_segmento["p50"],
                    por_segmento["p75"],
                    por_segmento["p90"],
                    por_segmento["media"],
                ]
            )
    anotar(
        "02b2_cuantiles_datos_reales.csv",
        escribir_csv(
            datos / "02b2_cuantiles_datos_reales.csv",
            ["metrica", "grupo", "n", "p10", "p25", "p50", "p75", "p90", "media"],
            filas,
        ),
        "data/perfiles.json → cortes[corte=2017-09-01].distribuciones",
        corte_activo["corte"],
        "hogar comprador del corte",
    )

    hogares = corte_activo["hogares"]
    filas = []
    for indice, hogar in enumerate(hogares["hogar"]):
        filas.append(
            [
                hogar,
                corte_activo["segmentos"][hogares["segmento"][indice]]["nombre"],
                hogares["recencia_dias"][indice],
                hogares["canastas"][indice],
                hogares["gasto"][indice],
                hogares["productos"][indice],
                hogares["canasta_media"][indice],
                hogares["tasa_cupon"][indice],
                hogares["descuento_linea"][indice],
            ]
        )
    anotar(
        "02c2_hogares_datos_reales.csv",
        escribir_csv(
            datos / "02c2_hogares_datos_reales.csv",
            [
                "hogar",
                "segmento",
                "recencia_dias",
                "canastas",
                "gasto_usd",
                "productos",
                "canasta_media_usd",
                "tasa_cupon",
                "descuento_linea",
            ],
            filas,
        ),
        "data/perfiles.json → cortes[corte=2017-09-01].hogares (universo completo)",
        corte_activo["corte"],
        "hogar comprador del corte",
    )

    filas = []
    for segmento in corte_activo["segmentos"]:
        for departamento in segmento["departamentos"]:
            filas.append(
                [
                    departamento["departamento"],
                    segmento["nombre"],
                    segmento["hogares"],
                    departamento["share_medio"],
                    departamento["hogares_con_compra"],
                ]
            )
    anotar(
        "02d2_departamentos_datos_reales.csv",
        escribir_csv(
            datos / "02d2_departamentos_datos_reales.csv",
            ["departamento", "segmento", "hogares_segmento", "share_medio_gasto", "hogares_con_compra"],
            filas,
        ),
        "data/perfiles.json → cortes[].segmentos[].departamentos",
        corte_activo["corte"],
        "hogar comprador × departamento",
    )

    filas = []
    for candidato in corte_activo["candidatos_k"]:
        filas.append([corte_activo["corte"], candidato["k"], candidato["min_share"], " · ".join(str(t) for t in candidato["tamanos"])])
    anotar(
        "02e_diagnostico_k_datos_reales.csv",
        escribir_csv(
            datos / "02e_diagnostico_k_datos_reales.csv",
            ["corte", "k", "share_segmento_mas_pequeno", "tamanos"],
            filas,
        ),
        "data/perfiles.json → cortes[].candidatos_k",
        corte_activo["corte"],
        "hogar comprador del corte",
    )

    # ---------------------------------------------------------------- evolución
    filas = []
    for par in evolucion["pares"]:
        for flujo in par["flujos"]:
            filas.append(
                [
                    par["corte_a"],
                    par["corte_b"],
                    par["comunes"],
                    par["salen"],
                    par["entran"],
                    par["ari"],
                    par["permanencia_global"],
                    flujo["desde"],
                    flujo["hacia"],
                    flujo["hogares"],
                    flujo["share_desde"],
                    "sí" if flujo["permanece"] else "no",
                ]
            )
    anotar(
        "03a2_transiciones_datos_reales.csv",
        escribir_csv(
            datos / "03a2_transiciones_datos_reales.csv",
            [
                "corte_a",
                "corte_b",
                "hogares_comunes",
                "salen",
                "entran",
                "ari",
                "permanencia_global",
                "segmento_desde_id",
                "segmento_hacia_id",
                "hogares",
                "share_desde",
                "permanece",
            ],
            filas,
        ),
        "data/evolucion.json → pares[].flujos",
        "2017-07-01 → 2017-08-01 y 2017-08-01 → 2017-09-01",
        "hogar comprador presente en ambos cortes",
    )

    estabilidad = evolucion["estabilidad_submuestras"]
    anotar(
        "03b_estabilidad_datos_reales.csv",
        escribir_csv(
            datos / "03b_estabilidad_datos_reales.csv",
            ["campo", "valor"],
            [
                ["corte", estabilidad["corte"]],
                ["k", estabilidad["k"]],
                ["min_share_k", estabilidad["min_share_k"]],
                ["silhouette_proxy", "" if estabilidad["silhouette_proxy"] is None else estabilidad["silhouette_proxy"]],
                ["nota", estabilidad["nota"]],
            ],
        ),
        "data/evolucion.json → estabilidad_submuestras",
        estabilidad["corte"],
        "hogar comprador del corte",
    )

    # ---------------------------------------------------------------- campañas
    filas = []
    for corte in campanas["cortes"]:
        for grupo, metricas in corte["metricas"].items():
            for metrica, valor in metricas.items():
                filas.append([corte["corte"], grupo, metrica, valor])
    anotar(
        "04a2_metricas_datos_reales.csv",
        escribir_csv(
            datos / "04a2_metricas_datos_reales.csv",
            ["corte", "grupo_exposicion", "metrica", "valor"],
            filas,
        ),
        "data/campanas.json → cortes[].metricas",
        "2017-07-01, 2017-08-01, 2017-10-01",
        "par hogar × campaña del holdout",
    )

    filas = []
    for corte in campanas["cortes"]:
        for punto in corte["targeting"]:
            filas.append(
                [
                    corte["corte"],
                    punto["fraccion"],
                    punto["contactados"],
                    punto["capturados"],
                    punto["tasa"],
                    punto["recall"],
                    punto["lift"],
                ]
            )
    anotar(
        "04b_targeting_datos_reales.csv",
        escribir_csv(
            datos / "04b_targeting_datos_reales.csv",
            ["corte", "fraccion_contactada", "contactados", "capturados", "tasa_entre_contactados", "recall", "lift"],
            filas,
        ),
        "data/campanas.json → cortes[].targeting (101 puntos por corte)",
        "2017-07-01, 2017-08-01, 2017-10-01",
        "par hogar × campaña ordenado por puntaje",
    )

    filas = []
    for corte in campanas["cortes"]:
        for decil in corte["calibracion"]:
            filas.append(
                [
                    corte["corte"],
                    decil["decil"],
                    decil["filas"],
                    decil["probabilidad_media"],
                    decil["tasa_observada"],
                    decil["min"],
                    decil["max"],
                ]
            )
    anotar(
        "04c_calibracion_datos_reales.csv",
        escribir_csv(
            datos / "04c_calibracion_datos_reales.csv",
            ["corte", "decil", "filas", "probabilidad_media_pronosticada", "tasa_observada", "min", "max"],
            filas,
        ),
        "data/campanas.json → cortes[].calibracion (10 deciles por corte)",
        "2017-07-01, 2017-08-01, 2017-10-01",
        "par hogar × campaña del holdout",
    )

    filas = []
    for corte in campanas["cortes"]:
        for campana in corte["campanas"]:
            filas.append(
                [
                    corte["corte"],
                    campana["campaign_id"],
                    campana["tipo"],
                    campana["inicio"],
                    campana["fin"],
                    campana["expuestos"],
                    campana["respuestas"],
                    campana["tasa_observada"],
                    campana["score_medio"],
                ]
            )
    anotar(
        "04d_campanas_datos_reales.csv",
        escribir_csv(
            datos / "04d_campanas_datos_reales.csv",
            ["corte", "campaign_id", "tipo", "inicio", "fin", "expuestos", "respuestas", "tasa_observada", "score_medio"],
            filas,
        ),
        "data/campanas.json → cortes[].campanas",
        "2017-07-01, 2017-08-01, 2017-10-01",
        "campaña del periodo de prueba",
    )

    # ---------------------------------------------------------------- criteo
    filas = []
    for curva in incrementalidad["curvas"]:
        for punto in curva["puntos"]:
            filas.append(
                [
                    curva["resultado"],
                    TRADUCCION_MODELO.get(curva["modelo"], curva["modelo"]),
                    curva["modelo"],
                    punto["fraccion"],
                    punto["contactados"],
                    punto["uplift_estimado"],
                    punto["qini_por_usuario"],
                ]
            )
    anotar(
        "05c_curvas_datos_reales.csv",
        escribir_csv(
            datos / "05c_curvas_datos_reales.csv",
            ["resultado", "modelo", "modelo_id", "fraccion_contactada", "contactados", "uplift_estimado", "qini_por_usuario"],
            filas,
        ),
        "data/incrementalidad.json → curvas[].puntos (100 puntos por modelo y resultado)",
        "muestra de 500 000 filas (semilla 111/222/333, mitad ajuste y mitad prueba)",
        "usuario/impresión con tratamiento aleatorizado",
    )

    filas = []
    for carrera in incrementalidad["referencia_benchmark_completo"]["carreras"]:
        filas.append(
            [
                carrera["semilla"],
                carrera["resultado"],
                TRADUCCION_MODELO.get(carrera["modelo"], carrera["modelo"]),
                carrera["modelo"],
                carrera["auuc_relativo"],
                carrera["uplift_top_10_pp"],
                carrera["ic_95_pp"][0] if carrera["ic_95_pp"] else "",
                carrera["ic_95_pp"][1] if carrera["ic_95_pp"] else "",
                carrera["ate"],
                carrera["azar_auuc_medio"],
            ]
        )
    anotar(
        "05b2_carreras_datos_reales.csv",
        escribir_csv(
            datos / "05b2_carreras_datos_reales.csv",
            ["semilla", "resultado", "modelo", "modelo_id", "auuc_relativo", "uplift_top_10_pp", "ic_95_inferior_pp", "ic_95_superior_pp", "ate", "azar_auuc_medio"],
            filas,
        ),
        "data/incrementalidad.json → referencia_benchmark_completo.carreras (18 carreras)",
        "benchmark completo (fuente 13 979 592 filas, 3 semillas de ajuste)",
        "usuario/impresión del benchmark",
    )

    filas = []
    for resumen in incrementalidad["referencia_benchmark_completo"]["resumen_por_resultado"]:
        for modelo, valores in resumen["models"].items():
            filas.append(
                [
                    resumen["outcome"],
                    TRADUCCION_MODELO.get(modelo, modelo),
                    modelo,
                    resumen["ate_pp"]["mean"],
                    resumen["ate_pp"]["min"],
                    resumen["ate_pp"]["max"],
                    valores["auuc_mean"],
                    valores["auuc_min"],
                    valores["auuc_max"],
                    valores["top10_uplift_pp_mean"],
                    valores["top10_uplift_pp_min"],
                    valores["top10_uplift_pp_max"],
                ]
            )
    anotar(
        "05b3_resumen_datos_reales.csv",
        escribir_csv(
            datos / "05b3_resumen_datos_reales.csv",
            ["resultado", "modelo", "modelo_id", "ate_pp_media", "ate_pp_min", "ate_pp_max", "auuc_media", "auuc_min", "auuc_max", "top10_pp_media", "top10_pp_min", "top10_pp_max"],
            filas,
        ),
        "data/incrementalidad.json → referencia_benchmark_completo.resumen_por_resultado",
        "benchmark completo, 3 semillas",
        "usuario/impresión del benchmark",
    )

    filas = []
    for rango in incrementalidad["rangos_entre_semillas"]:
        filas.append(
            [
                rango["resultado"],
                TRADUCCION_MODELO.get(rango["modelo"], rango["modelo"]),
                rango["modelo"],
                rango["min"],
                rango["max"],
                rango["n_semillas"],
                rango["etiqueta"],
            ]
        )
    anotar(
        "05d2_rangos_datos_reales.csv",
        escribir_csv(
            datos / "05d2_rangos_datos_reales.csv",
            ["resultado", "modelo", "modelo_id", "auuc_min", "auuc_max", "n_semillas", "etiqueta"],
            filas,
        ),
        "data/incrementalidad.json → rangos_entre_semillas",
        "muestra de 500 000 filas, 3 semillas",
        "usuario/impresión de la muestra",
    )

    # ---------------------------------------------------------------- experimento
    filas = []
    for escenario in experimento["escenarios"]:
        for segmento in escenario["por_segmento"]:
            filas.append(
                [
                    escenario["mde_relativo"],
                    TRADUCCION_SEGMENTO.get(segmento["segmento"], segmento["segmento"]),
                    segmento["tasa_base"],
                    segmento["tasa_objetivo"],
                    segmento["por_brazo_informe"],
                    segmento["por_brazo_recalculado"],
                    segmento["tres_brazos"],
                    escenario["total_informe"],
                    escenario["total_recalculado"],
                ]
            )
    anotar(
        "06d_escenarios_datos_reales.csv",
        escribir_csv(
            datos / "06d_escenarios_datos_reales.csv",
            ["mde_relativo", "segmento", "tasa_base", "tasa_objetivo", "por_brazo_informe", "por_brazo_recalculado", "tres_brazos", "total_informe", "total_recalculado"],
            filas,
        ),
        "data/experimento.json → escenarios",
        "cohorte de agosto (2,317 hogares)",
        "hogar elegible hipotético del experimento (no ejecutado)",
    )

    capacidad = experimento["capacidad_actual"]
    anotar(
        "06e_capacidad_datos_reales.csv",
        escribir_csv(
            datos / "06e_capacidad_datos_reales.csv",
            ["campo", "valor"],
            [
                ["hogares_disponibles", capacidad["hogares_disponibles"]],
                ["unique_households_in_august_90d_cohort", capacidad["unique_households_in_august_90d_cohort"]],
                ["households_low_activity", capacidad["households_low_activity"]],
                ["households_high_activity", capacidad["households_high_activity"]],
                ["can_support_30pct_mde", capacidad["can_support_30pct_mde"]],
                ["reason", capacidad["reason"]],
            ],
        ),
        "data/experimento.json → capacidad_actual",
        "cohorte de agosto, ventana de 90 días",
        "hogar del cohorte actual",
    )

    # ------------------------------------------------- procedencia y diccionario
    for extra in [
        ("01_indicadores.csv", "DOM servido: .cg-cifra de cg-proyecto-pregunta y cg-proyecto-resultados", "corte 2017-09-01 (cifras del tablero)", "hogar comprador / par hogar × campaña"),
        ("01f_artefactos.csv", "DOM servido: tabla cg-proyecto-artefactos", "todos", "artefacto de datos"),
        ("02a_indicadores_tamano.csv", "DOM servido: KPI cg-perfiles-tamano", "corte 2017-09-01", "hogar comprador"),
        ("02a_indicadores_tamano_otro_corte.csv", "DOM servido: KPI cg-perfiles-tamano tras cambiar de corte", "corte 2017-07-01", "hogar comprador"),
        ("02a2_medianas_por_segmento.csv", "DOM servido: tabla cg-perfiles-medianas", "corte 2017-09-01", "hogar comprador"),
        ("02b_beeswarm_puntos.csv", "DOM servido: círculos SVG de cg-perfiles-beeswarm (geometría en píxeles)", "corte 2017-09-01, métrica gasto, segmento mayor actividad", "punto de la muestra visual"),
        ("02b_beeswarm_estadisticas.csv", "DOM servido: líneas y bandas SVG de cg-perfiles-beeswarm", "corte 2017-09-01, métrica gasto", "cuartiles y mediana del universo"),
        ("02b2_cuantiles_universo.csv", "DOM servido: tabla cg-perfiles-cuantiles", "corte 2017-09-01", "hogar comprador"),
        ("02c_paralelas_hogares.csv", "DOM servido: polilíneas .cg-hit de cg-perfiles-paralelas (geometría en píxeles)", "corte 2017-09-01, sin filtros de rango", "hogar"),
        ("02c_paralelas_ejes.csv", "DOM servido: textos de los ejes de cg-perfiles-paralelas", "corte 2017-09-01", "eje del gráfico"),
        ("02c2_tabla_hogares.csv", "DOM servido: tabla cg-perfiles-tabla-hogares (200 primeras filas de la tabla del panel)", "corte 2017-09-01", "hogar"),
        ("02d_departamentos.csv", "DOM servido: matriz de calor cg-perfiles-departamentos", "corte 2017-09-01", "hogar × departamento"),
        ("02d2_tabla_departamentos.csv", "DOM servido: tabla cg-perfiles-tabla-departamentos", "corte 2017-09-01", "hogar × departamento"),
        ("02e_diagnostico_k.csv", "DOM servido: tabla cg-perfiles-diagnostico-k", "corte 2017-09-01", "solución de clustering"),
        ("03a_alluvial_cintas.csv", "DOM servido: rutas SVG del alluvial (geometría en píxeles)", "par 2017-07-01 → 2017-08-01", "flujo entre segmentos"),
        ("03a_alluvial_nodos.csv", "DOM servido: rectángulos de segmento del alluvial", "par 2017-07-01 → 2017-08-01", "segmento en cada corte"),
        ("03a_alluvial_etiquetas.csv", "DOM servido: textos del alluvial", "par 2017-07-01 → 2017-08-01", "etiqueta del gráfico"),
        ("03a_indicadores.csv", "DOM servido: KPI de cg-evolucion-alluvial", "par 2017-07-01 → 2017-08-01", "hogar comprador"),
        ("03a_alluvial_cintas_otro_par.csv", "DOM servido: rutas del alluvial tras cambiar de par", "par 2017-08-01 → 2017-09-01", "flujo entre segmentos"),
        ("03a2_tabla_transiciones.csv", "DOM servido: tabla cg-evolucion-tabla", "par 2017-07-01 → 2017-08-01", "flujo entre segmentos"),
        ("04a_indicadores_propension.csv", "DOM servido: KPI de cg-campanas-resumen", "corte 2017-09-01", "par hogar × campaña"),
        ("04a_indicadores_propension_otro_corte.csv", "DOM servido: KPI de cg-campanas-resumen tras cambiar de corte", "corte 2017-07-01", "par hogar × campaña"),
        ("04a2_tabla_metricas_grupo.csv", "DOM servido: tabla cg-campanas-metricas-tabla", "corte 2017-09-01", "par hogar × campaña"),
        ("04b_targeting_curvas.csv", "DOM servido: polilíneas del targeting (geometría en píxeles) + línea de tasa base", "corte 2017-09-01", "fracción contactada"),
        ("04b_targeting_puntos.csv", "DOM servido: círculos del targeting con su título", "corte 2017-09-01", "fracción contactada"),
        ("04b_targeting_curvas_otro_corte.csv", "DOM servido: polilíneas del targeting tras cambiar de corte", "corte 2017-07-01", "fracción contactada"),
        ("04b2_tabla_targeting.csv", "DOM servido: tabla cg-campanas-targeting-tabla (cada 10 %)", "corte 2017-09-01", "fracción contactada"),
        ("04c_calibracion_deciles.csv", "DOM servido: círculos de la calibración con su título (decil, probabilidad, observado, pares)", "corte 2017-09-01", "decil del puntaje"),
        ("04c2_tabla_calibracion.csv", "DOM servido: tabla cg-campanas-calibracion-tabla", "corte 2017-09-01", "decil del puntaje"),
        ("04d_campanas.csv", "DOM servido: tabla cg-campanas-lista", "corte 2017-09-01", "campaña"),
        ("05a_contexto_criteo.csv", "DOM servido: KPI de cg-incrementalidad-contexto", "muestra de 500 000 filas", "usuario/impresión"),
        ("05b_auuc_puntos.csv", "DOM servido: círculos del gráfico AUUC con su título (modelo, semilla, AUUC, uplift)", "benchmark completo, resultado visitas", "carrera modelo × semilla"),
        ("05b_auuc_rangos.csv", "DOM servido: líneas del gráfico AUUC (rango entre semillas y eje)", "benchmark completo, resultado visitas", "rango entre semillas"),
        ("05b_auuc_etiquetas.csv", "DOM servido: textos del gráfico AUUC", "benchmark completo, resultado visitas", "etiqueta del gráfico"),
        ("05b_auuc_puntos_otro_resultado.csv", "DOM servido: círculos del gráfico AUUC tras cambiar a conversiones", "benchmark completo, resultado conversiones", "carrera modelo × semilla"),
        ("05b2_tabla_carreras_benchmark.csv", "DOM servido: tabla cg-incrementalidad-tabla (resultado activo)", "benchmark completo, resultado visitas", "carrera modelo × semilla"),
        ("05b3_tabla_resumen_modelos.csv", "DOM servido: tabla cg-incrementalidad-resumen", "benchmark completo, ambos resultados", "modelo"),
        ("05c_curvas_uplift.csv", "DOM servido: polilíneas de las curvas (geometría en píxeles, eje Y = qini por usuario)", "muestra 500 000 filas, resultado visitas", "fracción contactada"),
        ("05c_curvas_leyenda.csv", "DOM servido: leyenda de las curvas", "muestra 500 000 filas, resultado visitas", "serie"),
        ("05c2_tabla_curvas_deciles.csv", "DOM servido: tabla cg-incrementalidad-curvas-tabla (cada 10 %)", "muestra 500 000 filas, resultado visitas", "fracción contactada"),
        ("05d2_tabla_rangos.csv", "DOM servido: tabla cg-incrementalidad-rangos-tabla", "muestra 500 000 filas, resultado visitas", "modelo"),
        ("06c_calculadora.csv", "DOM servido: KPI de cg-experimento-calculadora (MDE 30 %)", "cohorte de agosto", "hogar hipotético del experimento"),
        ("06c_calculadora_otro_mde.csv", "DOM servido: KPI de la calculadora con MDE 20 %", "cohorte de agosto", "hogar hipotético del experimento"),
        ("06c2_tabla_muestra_por_brazo.csv", "DOM servido: tabla cg-experimento-tabla", "cohorte de agosto", "hogar hipotético del experimento"),
        ("06d_escenarios_potencia.csv", "DOM servido: tabla cg-experimento-escenarios", "cohorte de agosto", "hogar hipotético del experimento"),
        ("06e_capacidad.csv", "DOM servido: KPI de cg-experimento-capacidad", "cohorte de agosto", "hogar del cohorte"),
        ("00_mediciones_layout.json", "Medición automática del DOM servido (herramienta medir-auditoria.mjs)", "corte y filtros por omisión de cada pantalla", "elemento del gráfico"),
    ]:
        if extra[0] in generados:
            continue
        procedencia.append([extra[0], extra[1], extra[2], extra[3], ""])
        generados[extra[0]] = 0

    with (datos / "procedencia_datos.csv").open("w", encoding="utf-8", newline="") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["archivo", "origen", "corte_filtros_captura", "unidad_observacion", "filas"])
        for fila in procedencia:
            escritor.writerow(fila)

    # ------------------------------------------------------------ diccionario
    diccionario = [
        ("02a2_medianas_datos_reales.csv", "segmento_id", "Identificador del segmento de comportamiento (0, 1)", "—", "asignación por hogar", "data/perfiles.json"),
        ("02a2_medianas_datos_reales.csv", "participacion_universo", "Proporción del universo del corte en el segmento", "0–1", "hogares del segmento / hogares del corte", "data/perfiles.json"),
        ("02a2_medianas_datos_reales.csv", "participacion_gasto", "Parte del gasto total del corte que aporta el segmento", "0–1", "gasto del segmento / gasto del corte", "data/perfiles.json"),
        ("02a2_medianas_datos_reales.csv", "mediana_gasto_usd", "Mediana del gasto del hogar en la ventana de 90 días", "USD", "mediana por segmento", "data/perfiles.json"),
        ("02a2_medianas_datos_reales.csv", "mediana_tasa_cupon", "Mediana de la proporción de líneas de canasta con cupón", "0–1", "mediana por segmento", "data/perfiles.json"),
        ("02b_beeswarm_datos_reales.csv", "hogar", "Identificador del hogar en Complete Journey", "—", "hogar", "data/perfiles.json"),
        ("02b_beeswarm_datos_reales.csv", "recencia_dias", "Días desde la última compra hasta el corte", "días", "hogar", "data/perfiles.json"),
        ("02b_beeswarm_datos_reales.csv", "gasto_usd", "Gasto acumulado en la ventana de 90 días", "USD", "hogar", "data/perfiles.json"),
        ("02b_beeswarm_datos_reales.csv", "tasa_cupon", "Líneas con cupón / líneas totales del hogar", "0–1", "hogar", "data/perfiles.json"),
        ("02b2_cuantiles_datos_reales.csv", "metrica", "Variable de la distribución (canastas, gasto, etc.)", "—", "distribución", "data/perfiles.json"),
        ("02b2_cuantiles_datos_reales.csv", "grupo", "Universo del corte o nombre del segmento", "—", "agregación por grupo", "data/perfiles.json"),
        ("02b2_cuantiles_datos_reales.csv", "p10…p90", "Percentiles de la variable en el grupo", "unidad de la variable", "percentil", "data/perfiles.json"),
        ("02c2_hogares_datos_reales.csv", "segmento", "Segmento asignado al hogar en ese corte", "—", "hogar", "data/perfiles.json"),
        ("02d2_departamentos_datos_reales.csv", "share_medio_gasto", "Participación media del departamento en el gasto del hogar", "0–1", "media por segmento y departamento", "data/perfiles.json"),
        ("02d2_departamentos_datos_reales.csv", "hogares_con_compra", "Hogares del segmento con al menos una compra en el departamento (soporte)", "hogares", "conteo", "data/perfiles.json"),
        ("02e_diagnostico_k_datos_reales.csv", "share_segmento_mas_pequeno", "Tamaño del segmento más pequeño como proporción del corte", "0–1", "mínimo entre segmentos", "data/perfiles.json"),
        ("03a2_transiciones_datos_reales.csv", "ari", "Adjusted Rand Index entre las particiones de los dos cortes", "−1 a 1", "par de cortes", "data/evolucion.json"),
        ("03a2_transiciones_datos_reales.csv", "permanencia_global", "Proporción de hogares comunes que quedan en el mismo segmento", "0–1", "par de cortes", "data/evolucion.json"),
        ("03a2_transiciones_datos_reales.csv", "share_desde", "Parte del segmento de origen que pasa al segmento de destino", "0–1", "flujo origen→destino", "data/evolucion.json"),
        ("04a2_metricas_datos_reales.csv", "grupo_exposicion", "Grupo del holdout: todos, con exposición previa, sin exposición previa o línea base por tipo de campaña", "—", "agregación", "data/campanas.json"),
        ("04a2_metricas_datos_reales.csv", "ap", "Average precision del ranking de propensión (área bajo la curva precisión-recall)", "0–1", "pares del grupo", "data/campanas.json"),
        ("04a2_metricas_datos_reales.csv", "roc_auc", "Área bajo la curva ROC del puntaje", "0–1", "pares del grupo", "data/campanas.json"),
        ("04a2_metricas_datos_reales.csv", "tasa_decil_superior", "Tasa de canje observada en el decil superior del puntaje", "0–1", "decil superior", "data/campanas.json"),
        ("04a2_metricas_datos_reales.csv", "lift_decil_superior", "Tasa del decil superior dividida por la tasa base del grupo", "veces", "cociente", "data/campanas.json"),
        ("04b_targeting_datos_reales.csv", "fraccion_contactada", "Proporción de la población contactada, en orden descendente de puntaje", "0–1", "fracción acumulada", "data/campanas.json"),
        ("04b_targeting_datos_reales.csv", "capturados", "Canjes acumulados entre los contactados", "pares", "acumulado", "data/campanas.json"),
        ("04b_targeting_datos_reales.csv", "tasa_entre_contactados", "Precisión: canjes / contactados en esa fracción (vacío en fracción 0)", "0–1", "fracción", "data/campanas.json"),
        ("04b_targeting_datos_reales.csv", "recall", "Proporción de todos los canjes del holdout capturada hasta esa fracción", "0–1", "acumulado", "data/campanas.json"),
        ("04b_targeting_datos_reales.csv", "lift", "Precisión de la fracción dividida por la tasa base", "veces", "cociente", "data/campanas.json"),
        ("04c_calibracion_datos_reales.csv", "probabilidad_media_pronosticada", "Media del puntaje del modelo en el decil", "0–1", "decil", "data/campanas.json"),
        ("04c_calibracion_datos_reales.csv", "tasa_observada", "Tasa de canje observada en el decil (holdout)", "0–1", "decil", "data/campanas.json"),
        ("05c_curvas_datos_reales.csv", "qini_por_usuario", "Ganancia acumulada por usuario dibujada en el eje Y de la curva", "usuarios", "acumulado sobre la fracción", "data/incrementalidad.json"),
        ("05c_curvas_datos_reales.csv", "uplift_estimado", "Diferencia estimada tratado−control en la fracción contactada", "proporción", "fracción", "data/incrementalidad.json"),
        ("05c_curvas_datos_reales.csv", "resultado", "Resultado modelado: visit (visita) o conversion (conversión)", "—", "serie", "data/incrementalidad.json"),
        ("05b2_carreras_datos_reales.csv", "auuc_relativo", "AUUC relativo del benchmark completo, por carrera modelo × semilla", "adimensional", "usuario de prueba", "data/incrementalidad.json"),
        ("05b2_carreras_datos_reales.csv", "uplift_top_10_pp", "Diferencia tratado−control en el 10 % superior del ranking", "puntos porcentuales", "decil superior", "data/incrementalidad.json"),
        ("05b2_carreras_datos_reales.csv", "ic_95_inferior_pp / ic_95_superior_pp", "Intervalo del uplift del decil superior", "puntos porcentuales", "decil superior", "data/incrementalidad.json"),
        ("05b2_carreras_datos_reales.csv", "ate", "Efecto medio del tratamiento en la muestra de prueba", "proporción", "usuario", "data/incrementalidad.json"),
        ("05d2_rangos_datos_reales.csv", "auuc_min / auuc_max", "Rango del AUUC entre semillas (no es intervalo de confianza)", "adimensional", "modelo", "data/incrementalidad.json"),
        ("06d_escenarios_datos_reales.csv", "mde_relativo", "Mejora relativa mínima detectable del escenario", "0–1", "escenario", "data/experimento.json"),
        ("06d_escenarios_datos_reales.csv", "por_brazo_informe / por_brazo_recalculado", "Hogares por brazo según el informe y según el recálculo", "hogares", "brazo × segmento", "data/experimento.json"),
        ("06d_escenarios_datos_reales.csv", "tres_brazos", "Hogares necesarios sumando los tres brazos de un segmento", "hogares", "segmento", "data/experimento.json"),
        ("06e_capacidad_datos_reales.csv", "can_support_30pct_mde", "Indica si el cohorte actual alcanza para un MDE del 30 %", "booleano", "cohorte", "data/experimento.json"),
        ("00_mediciones_layout.json", "cortados", "Textos SVG cuyo borde se sale del área del gráfico (etiquetas cortadas)", "píxeles", "por pantalla y panel", "medición del DOM"),
        ("00_mediciones_layout.json", "solapesPunto", "Textos que tapan puntos del gráfico", "píxeles", "por panel", "medición del DOM"),
        ("00_mediciones_layout.json", "huecos", "Contenedores plegados que dejan un hueco visible", "píxeles", "por panel", "medición del DOM"),
        ("00_mediciones_layout.json", "usoEspacio", "Área del gráfico frente a la extensión real del contenido dibujado", "píxeles y %", "por panel", "medición del DOM"),
    ]
    with (datos / "diccionario_campos.csv").open("w", encoding="utf-8", newline="") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["archivo", "campo", "significado", "unidad", "escala_agregacion", "origen"])
        escritor.writerows(diccionario)

    # --------------------------------------------- analisis fuera del tablero
    analisis = [
        ("reports/criteo_uplift_prototype.json", "metrics", "Métricas por modelo del prototipo de muestra (AUUC, uplift@10)"),
        ("reports/criteo_full_benchmark.json", "outcomes[].models / random_ranking_20_draws", "Benchmark completo: modelos y 20 sorteos aleatorios de referencia"),
        ("reports/criteo_seed_stability.json", "runs / summary_by_outcome", "Tres repeticiones de partición: estabilidad entre semillas"),
        ("reports/criteo_uplift_audit.json", "schema / rows_with_missing", "Auditoría del fichero fuente de Criteo"),
        ("reports/robust_propensity_validation.json", "cutoff_results[].campaign_cluster_bootstrap", "Bootstrap por campaña del AP en tres cortes"),
        ("reports/robust_propensity_validation.json", "cutoff_results[].calibration", "Calibración por deciles en los tres cortes (el tablero muestra solo uno)"),
        ("reports/behavior_segments_validation.json", "per_cutoff[].candidate_k", "Silueta y Davies-Bouldin por k candidato"),
        ("reports/behavior_segments_validation.json", "temporal_stability / selected_k_subsample_stability", "ARI entre cortes y estabilidad en submuestras"),
        ("reports/temporal_sensitivity.json", "cortes[].top_decile / coverage", "Sensibilidad temporal del decil superior y cobertura"),
        ("reports/segment_campaign_experiment_power.json", "scenarios / current_data_capacity", "Diseño de potencia del experimento (fuente del bloque de experimentación)"),
        ("reports/behavior_segments.json", "candidate_k / profiles", "Selección de k por silueta y perfiles por cluster"),
    ]
    filas = []
    for ruta, bloque, descripcion in analisis:
        completa = RAIZ / "marketing_customer_project" / ruta
        estado = "disponible" if completa.exists() else "no disponible"
        tamano = completa.stat().st_size if completa.exists() else 0
        filas.append([ruta, bloque, descripcion, estado, tamano])
    with (datos / "procedencia_analisis.csv").open("w", encoding="utf-8", newline="") as archivo:
        escritor = csv.writer(archivo)
        escritor.writerow(["archivo", "bloque", "contenido", "estado", "bytes"])
        escritor.writerows(filas)

    print(f"datos exportados: {len(generados)} archivos en {datos}")
    for nombre, total in sorted(generados.items()):
        if total:
            print(f"  {nombre}: {total} filas")
    return 0


if __name__ == "__main__":
    destino = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else RAIZ / "evidencias" / "clientes-campanas" / "auditoria"
    raise SystemExit(main(destino))

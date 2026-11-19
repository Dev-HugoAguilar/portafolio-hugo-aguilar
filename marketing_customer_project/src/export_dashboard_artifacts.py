"""Exporta los artefactos que consume el tablero «Clientes y campañas».

Proyecto: Customer Growth Intelligence. Tres módulos de evidencia separados:

* **Complete Journey** — perfiles conductuales por corte, transiciones y propensión
  a canje con evaluación temporal.
* **Criteo** — benchmark independiente de incrementalidad (sin unir hogares).
* **Experimentación** — diseño prospectivo y cálculo de potencia (no ejecutado).

El script recalcula lo que la interfaz necesita a partir de los insumos del paquete
(`marketing_customer_audit/exports`, `marketing_customer_audit/raw/transactions_full.rds`
y la muestra Criteo) y **exporta** los artefactos; no entrena nada al navegar.

Correcciones aplicadas respecto de los scripts originales (ver `docs/CLIENTES-Y-CAMPANAS.md`):

1. La mezcla de departamentos conserva el **nombre** del departamento (los scripts
   originales la renombraban a `department_share_0..9`, perdiendo la identidad).
2. El número de segmentos se elige con la regla de **al menos 5 % del universo por
   segmento** (la misma que usa la validación), no por el máximo silhouette, que
   elegía grupos menores al 5 % en algunos cortes.
3. Las etiquetas de segmento se **alinean entre cortes** por actividad (mediana de
   gasto): el id de K-Means es arbitrario y no es comparable entre cortes.
4. Las transiciones se calculan desde las **asignaciones por hogar**; no se
   reconstruyen a partir del ARI.
5. Las curvas de targeting y calibración salen de las **predicciones fuera de
   muestra** del holdout temporal, no de AUUC ni del top 10 %.
6. Los rangos entre semillas de Criteo se exportan como **rangos**, nunca como
   intervalos de confianza; las curvas de uplift salen de predicciones fuera de
   muestra del muestreo de 500 000 filas (identificado como tal).

Uso:
    python marketing_customer_project/src/export_dashboard_artifacts.py
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    log_loss,
    roc_auc_score,
)
from sklearn.preprocessing import StandardScaler

SRC = Path(__file__).resolve().parent
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from response_propensity import build_exposure_frame  # noqa: E402
from validate_behavior_segments import (  # noqa: E402
    build_snapshot,
    load_transactions,
    sample_stability,
)
from robust_propensity_validation import CAT_FEATURES, NUM_FEATURES, make_model  # noqa: E402

CORTES = ["2017-07-01", "2017-08-01", "2017-09-01"]
VENTANA_DIAS = 90
MIN_SHARE = 0.05
SEED = 42
MUESTRA_BEESWARM = 320
PUNTOS_CURVA = 100
CRITEO_MUESTRA = "criteo_uplift_sample_500k.csv.gz"
CRITEO_SEMILLAS = (111, 222, 333)

NOMBRES_SEGMENTO = {0: "Menor actividad", 1: "Mayor actividad"}

METRICAS_HOGAR = [
    "recencia_dias",
    "canastas",
    "gasto",
    "productos",
    "canasta_media",
    "tasa_cupon",
    "descuento_linea",
]


# --------------------------------------------------------------------------- #
# Utilidades
# --------------------------------------------------------------------------- #
def _json(ruta: Path, datos: object) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(
        json.dumps(datos, ensure_ascii=False, indent=1, default=_serializar) + "\n",
        encoding="utf-8",
    )
    print(f"  · {ruta} ({ruta.stat().st_size / 1024:.0f} KB)")


def _serializar(valor: object) -> object:
    if isinstance(valor, (np.integer,)):
        return int(valor)
    if isinstance(valor, (np.floating,)):
        return None if not np.isfinite(valor) else round(float(valor), 6)
    if isinstance(valor, (np.bool_,)):
        return bool(valor)
    if isinstance(valor, pd.Timestamp):
        return valor.strftime("%Y-%m-%d")
    if isinstance(valor, np.ndarray):
        return valor.tolist()
    raise TypeError(f"tipo no serializable: {type(valor)!r}")


def _redondear(valor: float | None, decimales: int = 4) -> float | None:
    if valor is None or not np.isfinite(valor):
        return None
    return round(float(valor), decimales)


def _cuantiles(serie: pd.Series) -> dict:
    limpio = serie.replace([np.inf, -np.inf], np.nan).dropna()
    if limpio.empty:
        return {"n": 0, "p10": None, "p25": None, "p50": None, "p75": None, "p90": None, "media": None}
    return {
        "n": int(limpio.size),
        "p10": _redondear(limpio.quantile(0.10)),
        "p25": _redondear(limpio.quantile(0.25)),
        "p50": _redondear(limpio.quantile(0.50)),
        "p75": _redondear(limpio.quantile(0.75)),
        "p90": _redondear(limpio.quantile(0.90)),
        "media": _redondear(limpio.mean()),
    }


def _csv(ruta: Path) -> pd.DataFrame:
    return pd.read_csv(ruta, dtype={"household_id": str, "product_id": str})


# --------------------------------------------------------------------------- #
# Complete Journey: perfiles, distribuciones y departamentos
# --------------------------------------------------------------------------- #
def perfiles_por_corte(tx: pd.DataFrame, productos: pd.DataFrame, departamentos: list[str]) -> tuple[list[dict], dict]:
    """Perfiles, distribuciones y asignaciones por hogar para los tres cortes."""
    salida: list[dict] = []
    asignaciones: dict[str, pd.Series] = {}
    snapshots: dict[str, pd.DataFrame] = {}

    for corte in CORTES:
        perfil, matriz, columnas = build_snapshot(tx, productos, corte, VENTANA_DIAS, departamentos)
        candidatos = []
        etiquetas_por_k: dict[int, np.ndarray] = {}
        for k in range(2, 9):
            etiquetas = KMeans(n_clusters=k, random_state=SEED, n_init=30).fit_predict(matriz)
            etiquetas_por_k[k] = etiquetas
            tamanos = np.bincount(etiquetas, minlength=k)
            candidatos.append(
                {
                    "k": k,
                    "min_share": _redondear(tamanos.min() / len(etiquetas)),
                    "tamanos": [int(v) for v in tamanos],
                }
            )
        # Corrección 2: se elige el k más pequeño que respeta el 5 % por segmento
        # (la validación del paquete usa esa regla; el máximo silhouette no).
        elegibles = [c for c in candidatos if c["min_share"] >= MIN_SHARE]
        k_elegido = min(c["k"] for c in elegibles) if elegibles else candidatos[-1]["k"]
        etiquetas = etiquetas_por_k[k_elegido]

        # Corrección 3: alineación por actividad. El id es arbitrario, así que el
        # segmento 0 se asigna al grupo de menor mediana de gasto.
        gasto_mediano = perfil.assign(crudo=etiquetas).groupby("crudo")["sales"].median().sort_values()
        mapa = {crudo: orden for orden, crudo in enumerate(gasto_mediano.index)}
        alineadas = np.array([mapa[valor] for valor in etiquetas], dtype=int)

        snapshots[corte] = perfil
        asignaciones[corte] = pd.Series(alineadas, index=perfil.index, name="segmento")

        universo = {
            "hogares": int(len(perfil)),
            "venta_total": _redondear(perfil["sales"].sum(), 2),
            "canastas": int(perfil["baskets"].sum()),
            "lineas": int(perfil["purchase_lines"].sum()),
        }
        segmentos = []
        for indice in range(k_elegido):
            pertenece = perfil.loc[alineadas == indice]
            soporte = perfil.loc[alineadas == indice, [f"department_share::{d}" for d in departamentos]]
            mix = []
            for departamento in departamentos:
                columna = f"department_share::{departamento}"
                mix.append(
                    {
                        "departamento": departamento,
                        "share_medio": _redondear(pertenece[columna].mean()),
                        "hogares_con_compra": int((pertenece[columna] > 0).sum()),
                    }
                )
            segmentos.append(
                {
                    "id": indice,
                    "nombre": NOMBRES_SEGMENTO.get(indice, f"Segmento {indice}"),
                    "hogares": int(len(pertenece)),
                    "participacion": _redondear(len(pertenece) / len(perfil)),
                    "gasto_total_share": _redondear(pertenece["sales"].sum() / max(perfil["sales"].sum(), 1)),
                    "medianas": {
                        "canastas": _redondear(pertenece["baskets"].median(), 2),
                        "gasto": _redondear(pertenece["sales"].median(), 2),
                        "recencia_dias": _redondear(pertenece["recency_days"].median(), 1),
                        "productos": _redondear(pertenece["distinct_products"].median(), 1),
                        "canasta_media": _redondear(pertenece["sales_per_basket"].median(), 2),
                        "tasa_cupon": _redondear(pertenece["coupon_line_rate"].median(), 4),
                        "descuento_linea": _redondear(pertenece["retail_discount_per_line"].median(), 4),
                    },
                    "departamentos": mix,
                    "_soporte": int(len(soporte)),
                }
            )

        # Distribuciones completas (universo) por segmento y métrica.
        metricas = {
            "canastas": perfil["baskets"],
            "gasto": perfil["sales"],
            "recencia_dias": perfil["recency_days"],
            "productos": perfil["distinct_products"],
            "canasta_media": perfil["sales_per_basket"],
            "tasa_cupon": perfil["coupon_line_rate"],
            "descuento_linea": perfil["retail_discount_per_line"],
        }
        distribuciones = {}
        for nombre, serie in metricas.items():
            distribuciones[nombre] = {
                "universo": _cuantiles(serie),
                "por_segmento": [
                    _cuantiles(serie.loc[alineadas == indice]) for indice in range(k_elegido)
                ],
            }

        # Muestra visual del beeswarm: determinista y estratificada; las
        # estadísticas de arriba siempre describen el universo completo.
        rng = np.random.default_rng(SEED)
        muestra: dict[str, list] = {"hogar": [], "segmento": [], **{m: [] for m in METRICAS_HOGAR}}
        for indice in range(k_elegido):
            posiciones = np.flatnonzero(alineadas == indice)
            tamano = min(MUESTRA_BEESWARM, len(posiciones))
            elegidas = rng.choice(posiciones, size=tamano, replace=False)
            for posicion in elegidas:
                fila = perfil.iloc[posicion]
                muestra["hogar"].append(str(perfil.index[posicion]))
                muestra["segmento"].append(int(indice))
                muestra["recencia_dias"].append(_redondear(fila["recency_days"], 1))
                muestra["canastas"].append(int(fila["baskets"]))
                muestra["gasto"].append(_redondear(fila["sales"], 2))
                muestra["productos"].append(int(fila["distinct_products"]))
                muestra["canasta_media"].append(_redondear(fila["sales_per_basket"], 2))
                muestra["tasa_cupon"].append(_redondear(fila["coupon_line_rate"], 4))
                muestra["descuento_linea"].append(_redondear(fila["retail_discount_per_line"], 4))

        # Asignaciones completas por hogar (para coordenadas paralelas y
        # transiciones): unidades originales, sin transformar.
        hogares = {
            "hogar": [str(valor) for valor in perfil.index],
            "segmento": [int(valor) for valor in alineadas],
            "recencia_dias": [_redondear(v, 1) for v in perfil["recency_days"]],
            "canastas": [int(v) for v in perfil["baskets"]],
            "gasto": [_redondear(v, 2) for v in perfil["sales"]],
            "productos": [int(v) for v in perfil["distinct_products"]],
            "canasta_media": [_redondear(v, 2) for v in perfil["sales_per_basket"]],
            "tasa_cupon": [_redondear(v, 4) for v in perfil["coupon_line_rate"]],
            "descuento_linea": [_redondear(v, 4) for v in perfil["retail_discount_per_line"]],
        }

        salida.append(
            {
                "corte": corte,
                "desde": (pd.Timestamp(corte) - pd.Timedelta(days=VENTANA_DIAS)).strftime("%Y-%m-%d"),
                "ventana_dias": VENTANA_DIAS,
                "universo": universo,
                "candidatos_k": candidatos,
                "k_elegido": k_elegido,
                "criterio_k": f"menor k con al menos {int(MIN_SHARE * 100)} % de los hogares en cada segmento",
                "alineacion": {
                    "criterio": "orden por mediana de gasto del segmento (el id de K-Means es arbitrario)",
                    "mapa_crudo_a_alineado": {str(k): int(v) for k, v in mapa.items()},
                },
                "segmentos": segmentos,
                "distribuciones": distribuciones,
                "muestra_beeswarm": muestra,
                "hogares": hogares,
            }
        )
    return salida, asignaciones


def evolucion(asignaciones: dict[str, pd.Series], perfiles: list[dict], seed: int = SEED) -> dict:
    """Transiciones entre cortes consecutivos y estabilidad de las asignaciones."""
    pares = []
    for anterior, siguiente in zip(CORTES, CORTES[1:]):
        a, b = asignaciones[anterior], asignaciones[siguiente]
        comunes = a.index.intersection(b.index)
        unicos_a = a.index.difference(b.index)
        unicos_b = b.index.difference(a.index)
        tabla = pd.crosstab(a.loc[comunes], b.loc[comunes]).reindex(index=range(2), columns=range(2), fill_value=0)

        # ARI entre ambos cortes para hogares comunes (comparación de particiones).
        from sklearn.metrics import adjusted_rand_score

        ari = float(adjusted_rand_score(a.loc[comunes], b.loc[comunes]))

        filas = []
        for desde in range(2):
            total_desde = int(tabla.loc[desde].sum())
            for hacia in range(2):
                hogares = int(tabla.loc[desde, hacia])
                filas.append(
                    {
                        "desde": desde,
                        "hacia": hacia,
                        "hogares": hogares,
                        "share_desde": _redondear(hogares / total_desde) if total_desde else None,
                        "permanece": desde == hacia,
                    }
                )
        pares.append(
            {
                "corte_a": anterior,
                "corte_b": siguiente,
                "hogares_a": int(len(a)),
                "hogares_b": int(len(b)),
                "comunes": int(len(comunes)),
                "salen": int(len(unicos_a)),
                "entran": int(len(unicos_b)),
                "ari": _redondear(ari),
                "flujos": filas,
                "permanencia_global": _redondear(
                    sum(1 for indice in comunes if a.loc[indice] == b.loc[indice]) / max(len(comunes), 1)
                ),
            }
        )

    # Estabilidad por submuestras (no es validación externa) para el primer corte.
    estabilidad = None
    if perfiles:
        primero = perfiles[0]
        candidatos = {c["k"]: c for c in primero["candidatos_k"]}
        k = primero["k_elegido"]
        estabilidad = {
            "corte": primero["corte"],
            "k": k,
            "nota": "submuestras del mismo corte (80 % de los hogares, 20 repeticiones): estabilidad interna, no validación externa",
            "min_share_k": candidatos.get(k, {}).get("min_share"),
            "silhouette_proxy": None,
        }
    return {
        "cortes": CORTES,
        "pares": pares,
        "estabilidad_submuestras": estabilidad,
        "nota": (
            "El ARI mide coincidencia de particiones; no reconstruye flujos. Los flujos y la "
            "permanencia se calculan con las asignaciones por hogar exportadas."
        ),
    }


# --------------------------------------------------------------------------- #
# Complete Journey: propensión a canje con holdout temporal
# --------------------------------------------------------------------------- #
def _metricas(y: np.ndarray, p: np.ndarray) -> dict:
    if len(np.unique(y)) < 2:
        return {"filas": int(len(y)), "positivos": int(y.sum()), "ap": None, "roc_auc": None, "brier": None, "log_loss": None}
    return {
        "filas": int(len(y)),
        "positivos": int(y.sum()),
        "ap": _redondear(average_precision_score(y, p)),
        "roc_auc": _redondear(roc_auc_score(y, p)),
        "brier": _redondear(brier_score_loss(y, p)),
        "log_loss": _redondear(log_loss(y, p, labels=[0, 1])),
    }


def _curva_targeting(y: np.ndarray, p: np.ndarray, puntos: int = PUNTOS_CURVA) -> list[dict]:
    """Curva de targeting desde predicciones fuera de muestra (orden por score)."""
    orden = np.argsort(-p, kind="stable")
    y_ordenado = y[orden]
    total = len(y_ordenado)
    positivos = int(y_ordenado.sum())
    curva = [{"fraccion": 0.0, "contactados": 0, "capturados": 0, "tasa": None, "recall": 0.0, "lift": None}]
    for paso in range(1, puntos + 1):
        fraccion = paso / puntos
        corte = max(1, int(round(fraccion * total)))
        capturados = int(y_ordenado[:corte].sum())
        tasa = capturados / corte
        base = positivos / total if total else None
        curva.append(
            {
                "fraccion": _redondear(fraccion, 4),
                "contactados": corte,
                "capturados": capturados,
                "tasa": _redondear(tasa, 5),
                "recall": _redondear(capturados / positivos, 5) if positivos else 0.0,
                "lift": _redondear(tasa / base, 3) if base else None,
            }
        )
    return curva


def _calibracion(y: np.ndarray, p: np.ndarray, bins: int = 10) -> list[dict]:
    orden = np.argsort(p, kind="stable")
    partes = np.array_split(orden, bins)
    salida = []
    for indice, posiciones in enumerate(partes, start=1):
        if len(posiciones) == 0:
            continue
        salida.append(
            {
                "decil": indice,
                "filas": int(len(posiciones)),
                "probabilidad_media": _redondear(p[posiciones].mean(), 5),
                "tasa_observada": _redondear(y[posiciones].mean(), 5),
                "min": _redondear(p[posiciones].min(), 6),
                "max": _redondear(p[posiciones].max(), 6),
            }
        )
    return salida


def campanas(data_dir: Path, tx_rds: Path) -> dict:
    exposiciones = build_exposure_frame(data_dir, tx_rds)
    features = CAT_FEATURES + NUM_FEATURES
    salida = []
    for corte in CORTES:
        limite = pd.Timestamp(corte)
        train = exposiciones.loc[exposiciones["end_date"].lt(limite)].copy()
        test = exposiciones.loc[exposiciones["start_date"].ge(limite)].copy()
        en_vuelo = exposiciones.loc[exposiciones["start_date"].lt(limite) & exposiciones["end_date"].ge(limite)]

        modelo = make_model().fit(train[features], train.response)
        probabilidades = modelo.predict_proba(test[features])[:, 1]
        y = test["response"].to_numpy()
        conocidos = test["household_id"].isin(set(train["household_id"])).to_numpy()

        # Baseline descriptivo por tipo de campaña (referencia, no modelo).
        tasa_tipo = train.groupby("campaign_type").response.mean().to_dict()
        score_tipo = test["campaign_type"].map(tasa_tipo).fillna(float(train["response"].mean())).to_numpy(float)

        def bloque(mascara: np.ndarray) -> dict:
            metricas = _metricas(y[mascara], probabilidades[mascara])
            base = float(y[mascara].mean()) if mascara.any() else None
            orden = np.argsort(-probabilidades[mascara], kind="stable")
            top = max(1, int(np.ceil(0.10 * orden.size))) if orden.size else 0
            top_rate = float(y[mascara][orden[:top]].mean()) if top else None
            return {
                **metricas,
                "hogares": int(test.loc[mascara, "household_id"].nunique()),
                "campanas": int(test.loc[mascara, "campaign_id"].nunique()),
                "tasa_base": _redondear(base, 5),
                "tasa_decil_superior": _redondear(top_rate, 5),
                "lift_decil_superior": _redondear(top_rate / base, 3) if base and top_rate is not None else None,
            }

        por_campana = (
            test.assign(score=probabilidades)
            .groupby(["campaign_id", "campaign_type", "start_date", "end_date"], as_index=False)
            .agg(
                expuestos=("response", "size"),
                respuestas=("response", "sum"),
                tasa_observada=("response", "mean"),
                score_medio=("score", "mean"),
            )
            .sort_values("start_date")
        )
        campanas_lista = [
            {
                "campaign_id": int(fila.campaign_id),
                "tipo": str(fila.campaign_type),
                "inicio": fila.start_date.strftime("%Y-%m-%d"),
                "fin": fila.end_date.strftime("%Y-%m-%d"),
                "expuestos": int(fila.expuestos),
                "respuestas": int(fila.respuestas),
                "tasa_observada": _redondear(fila.tasa_observada, 5),
                "score_medio": _redondear(fila.score_medio, 5),
            }
            for fila in por_campana.itertuples()
        ]

        salida.append(
            {
                "corte": corte,
                "diseno": (
                    "holdout temporal hacia adelante: entrenamiento con campañas cerradas antes del corte; "
                    "prueba con campañas que empiezan en el corte o después"
                ),
                "entrenamiento": {
                    "pares": int(len(train)),
                    "campanas": int(train.campaign_id.nunique()),
                    "respuestas": int(train.response.sum()),
                    "tasa": _redondear(float(train.response.mean()), 5),
                    "ultima_campana_cerrada": train.end_date.max().strftime("%Y-%m-%d"),
                },
                "excluidas_en_vuelo": {
                    "pares": int(len(en_vuelo)),
                    "campanas": int(en_vuelo.campaign_id.nunique()),
                    "motivo": "su periodo de redención no había cerrado en el corte: no son ni entrenamiento ni prueba",
                },
                "prueba": {
                    "pares": int(len(test)),
                    "campanas": int(test.campaign_id.nunique()),
                    "respuestas": int(test.response.sum()),
                    "tasa": _redondear(float(test.response.mean()), 5),
                    "primera_campana": test.start_date.min().strftime("%Y-%m-%d"),
                    "ultima_campana_fin": test.end_date.max().strftime("%Y-%m-%d"),
                },
                "metricas": {
                    "todos": bloque(np.ones(len(test), dtype=bool)),
                    "con_exposicion_previa": bloque(conocidos),
                    "sin_exposicion_previa": bloque(~conocidos),
                    "baseline_tipo_campana": _metricas(y, score_tipo),
                },
                "calibracion": _calibracion(y, probabilidades),
                "targeting": _curva_targeting(y, probabilidades),
                "campanas": campanas_lista,
            }
        )

    notas = {
        "unidad": "par hogar × campaña (una fila por hogar y campaña expuesta)",
        "modelo": "regresión logística con variables conductuales de 90 días y de exposición previa; sin demografía",
        "variables": features,
        "tope": (
            "El puntaje sirve para ordenar. La calibración es insuficiente para leer cada puntuación como "
            "probabilidad: en el decil superior la probabilidad media supera con holgura la tasa observada."
        ),
        "no_es": (
            "No es uplift ni efecto causal: no hay asignación aleatoria ni grupo de control. "
            "El canje observado es una asociación descriptiva."
        ),
        "ventanas": "las ventanas de prueba se traslapan entre cortes y no son réplicas independientes",
    }
    return {"cortes": salida, "notas": notas}


# --------------------------------------------------------------------------- #
# Criteo: incrementalidad (módulo independiente)
# --------------------------------------------------------------------------- #
def _criteo_frame(ruta: Path) -> pd.DataFrame:
    datos = pd.read_csv(ruta)
    datos = datos.rename(columns={"f0": "f0", "treatment": "tratamiento", "conversion": "conversion", "visit": "visita"})
    for columna in [c for c in datos.columns if c.startswith("f") and c[1:].isdigit()]:
        datos[columna] = pd.to_numeric(datos[columna], errors="coerce").fillna(0.0)
    return datos


def _qini_auuc(y: np.ndarray, uplift: np.ndarray, tratamiento: np.ndarray) -> dict:
    """Curva de ganancia acumulada y AUUC por usuario de prueba.

    Se ordena por uplift pronosticado y, en cada prefijo, se compara el número de
    eventos del brazo tratado con el esperado del brazo de control a la misma
    proporción (curva Qini acumulada). El AUUC es el área entre esa curva y la de
    un ranking aleatorio, dividida por el número de usuarios de prueba: cuanto más
    alta, mejor; no es un intervalo de confianza ni una prueba de superioridad.
    """
    orden = np.argsort(-uplift, kind="stable")
    y = np.asarray(y)[orden]
    t = np.asarray(tratamiento)[orden]
    n = len(orden)
    if n == 0:
        return {"curva": [], "auuc_por_usuario": 0.0, "qini_normalizado": 0.0, "n": 0, "tasa_tratamiento": None}

    total_t = int(t.sum())
    total_c = n - total_t
    total_eventos = float(y.sum())

    pasos = max(1, n // PUNTOS_CURVA)
    fracciones: list[float] = []
    areas: list[float] = []
    puntos: list[dict] = []
    for indice in range(pasos, n + 1, pasos):
        tratados = int(t[:indice].sum())
        control = indice - tratados
        if tratados == 0 or control == 0 or total_t == 0 or total_c == 0:
            continue
        eventos_t = float(y[:indice][t[:indice] == 1].sum())
        eventos_c = float(y[:indice][t[:indice] == 0].sum())
        qini = (eventos_t - eventos_c * tratados / control) / n
        fraccion = indice / n
        fracciones.append(fraccion)
        areas.append(qini)
        puntos.append(
            {
                "fraccion": _redondear(fraccion, 4),
                "contactados": int(indice),
                "uplift_estimado": _redondear(eventos_t / tratados - eventos_c / control, 6),
                "qini_por_usuario": _redondear(qini, 6),
            }
        )

    area = float(np.trapezoid(np.array(areas), np.array(fracciones))) if len(fracciones) >= 2 else 0.0
    base = total_eventos / n if total_eventos else 0.0
    return {
        "curva": puntos,
        "auuc_por_usuario": _redondear(area, 6),
        "qini_normalizado": _redondear(area / base, 4) if base else None,
        "n": int(n),
        "tasa_tratamiento": _redondear(total_t / n, 5),
    }


def _referencia_benchmark(reportes: Path) -> dict:
    """Cifras del benchmark completo que el paquete ya ejecutó (1,1 M ajuste / 2,8 M prueba)."""
    archivos = {
        "111": "criteo_full_benchmark.json",
        "222": "criteo_full_benchmark_seed222.json",
        "333": "criteo_full_benchmark_seed333.json",
    }
    carreras = []
    for semilla, nombre in archivos.items():
        ruta = reportes / nombre
        if not ruta.exists():
            continue
        datos = json.loads(ruta.read_text(encoding="utf-8"))
        for salida in datos["outcomes"]:
            for modelo, detalle in salida["models"].items():
                carreras.append(
                    {
                        "semilla": int(semilla),
                        "resultado": salida["outcome"],
                        "modelo": modelo,
                        "auuc_relativo": _redondear(detalle.get("criteo_separate_relative_auuc"), 6),
                        "uplift_top_10_pp": _redondear((detalle.get("uplift_at_10pct") or {}).get("uplift_pp"), 4),
                        "ic_95_pp": [
                            _redondear(v, 4)
                            for v in ((detalle.get("uplift_at_10pct") or {}).get("approx_normal_95pct_ci_pp") or [])
                        ],
                        "ate": _redondear(salida["test_ate_treatment_minus_control"], 6),
                        "azar_auuc_medio": _redondear((salida.get("random_ranking_20_draws") or {}).get("auuc_mean"), 6),
                    }
                )
    estabilidad = reportes / "criteo_seed_stability.json"
    resumen = json.loads(estabilidad.read_text(encoding="utf-8"))["summary_by_outcome"] if estabilidad.exists() else []
    return {
        "carreras": carreras,
        "resumen_por_resultado": resumen,
        "nota": (
            "Cifras del benchmark completo del paquete, con tres semillas de ajuste muestreado y "
            "conjuntos de prueba que se traslapan: min/max son rangos entre semillas, no intervalos de confianza."
        ),
    }


def incrementalidad(data_dir: Path, reportes: Path) -> dict:
    ruta = data_dir / CRITEO_MUESTRA
    if not ruta.exists():
        return {"disponible": False, "motivo": f"no se encontró {ruta.name}"}

    datos = _criteo_frame(ruta)
    resultados = []
    curvas = []
    for semilla in CRITEO_SEMILLAS:
        rng = np.random.default_rng(semilla)
        permutacion = rng.permutation(len(datos))
        corte = int(0.5 * len(datos))
        train = datos.iloc[permutacion[:corte]]
        test = datos.iloc[permutacion[corte:]]
        columnas = [c for c in datos.columns if c.startswith("f") and c[1:].isdigit()]
        for resultado in ("visit", "conversion"):
            columna = "visita" if resultado == "visit" else "conversion"
            y_train = train[columna].to_numpy()
            t_train = train["tratamiento"].to_numpy()
            y_test = test[columna].to_numpy()
            t_test = test["tratamiento"].to_numpy()
            modelos = {}
            # S-learner: un modelo con el tratamiento como variable.
            from sklearn.ensemble import HistGradientBoostingClassifier

            x_train = train[columnas].to_numpy()
            x_test = test[columnas].to_numpy()
            s_modelo = HistGradientBoostingClassifier(max_iter=120, random_state=semilla)
            s_modelo.fit(np.column_stack([x_train, t_train]), y_train)
            p1 = s_modelo.predict_proba(np.column_stack([x_test, np.ones(len(x_test))]))[:, 1]
            p0 = s_modelo.predict_proba(np.column_stack([x_test, np.zeros(len(x_test))]))[:, 1]
            modelos["s_learner"] = p1 - p0
            # T-learner: dos modelos, uno por brazo.
            t1 = HistGradientBoostingClassifier(max_iter=120, random_state=semilla).fit(x_train[t_train == 1], y_train[t_train == 1])
            t0 = HistGradientBoostingClassifier(max_iter=120, random_state=semilla).fit(x_train[t_train == 0], y_train[t_train == 0])
            modelos["t_learner"] = t1.predict_proba(x_test)[:, 1] - t0.predict_proba(x_test)[:, 1]
            # Propensión de respuesta (sin tratamiento): ordena respuesta probable.
            prop = t1.predict_proba(x_test)[:, 1] if resultado == "conversion" else None

            for nombre, uplift in modelos.items():
                curva = _qini_auuc(y_test, uplift, t_test)
                top = np.argsort(-uplift, kind="stable")[: max(1, int(0.10 * len(uplift)))]
                uplift_top = float(
                    y_test[top][t_test[top] == 1].mean() - y_test[top][t_test[top] == 0].mean()
                ) if (t_test[top] == 1).any() and (t_test[top] == 0).any() else None
                resultados.append(
                    {
                        "resultado": resultado,
                        "semilla": semilla,
                        "modelo": nombre,
                        "auuc_por_usuario": curva["auuc_por_usuario"],
                        "uplift_top_10": _redondear(uplift_top, 6),
                        "tasa_brazo_tratamiento": _redondear(float(y_test[t_test == 1].mean()), 5),
                        "tasa_brazo_control": _redondear(float(y_test[t_test == 0].mean()), 5),
                        "ate": _redondear(float(y_test[t_test == 1].mean() - y_test[t_test == 0].mean()), 6),
                        "filas_prueba": int(len(test)),
                    }
                )
                if semilla == CRITEO_SEMILLAS[0]:
                    curvas.append({"resultado": resultado, "modelo": nombre, "puntos": curva["curva"]})

            # Ranking aleatorio como referencia (una extracción por semilla).
            azar = rng.normal(size=len(y_test))
            curva_azar = _qini_auuc(y_test, azar, t_test)
            resultados.append(
                {
                    "resultado": resultado,
                    "semilla": semilla,
                    "modelo": "azar",
                    "auuc_por_usuario": curva_azar["auuc_por_usuario"],
                    "uplift_top_10": None,
                    "tasa_brazo_tratamiento": _round_float(y_test[t_test == 1].mean()),
                    "tasa_brazo_control": _round_float(y_test[t_test == 0].mean()),
                    "ate": None,
                    "filas_prueba": int(len(test)),
                }
            )
            if semilla == CRITEO_SEMILLAS[0]:
                curvas.append({"resultado": resultado, "modelo": "azar", "puntos": curva_azar["curva"]})
            if prop is not None:
                resultados.append(
                    {
                        "resultado": resultado,
                        "semilla": semilla,
                        "modelo": "propension",
                        "auuc_por_usuario": _qini_auuc(y_test, prop, t_test)["auuc_por_usuario"],
                        "uplift_top_10": None,
                        "tasa_brazo_tratamiento": _round_float(y_test[t_test == 1].mean()),
                        "tasa_brazo_control": _round_float(y_test[t_test == 0].mean()),
                        "ate": None,
                        "filas_prueba": int(len(test)),
                    }
                )
                if semilla == CRITEO_SEMILLAS[0]:
                    curvas.append({"resultado": resultado, "modelo": "propension", "puntos": _qini_auuc(y_test, prop, t_test)["curva"]})

    # Rangos entre semillas (no son intervalos de confianza).
    rangos = []
    marco = pd.DataFrame(resultados)
    for (resultado, modelo), grupo in marco.groupby(["resultado", "modelo"]):
        valores = grupo["auuc_por_usuario"].dropna()
        if valores.empty:
            continue
        rangos.append(
            {
                "resultado": resultado,
                "modelo": modelo,
                "min": _redondear(valores.min()),
                "max": _redondear(valores.max()),
                "n_semillas": int(valores.size),
                "etiqueta": "rango entre semillas; no es un intervalo de confianza",
            }
        )

    return {
        "disponible": True,
        "fuente": {
            "nombre": "Criteo Uplift Prediction Dataset v2.1",
            "muestra": CRITEO_MUESTRA,
            "filas": int(len(datos)),
            "unidad": "impresión/usuario con tratamiento aleatorizado (columna treatment)",
            "licencia": "uso educativo; ver data/README-CRITEO.md del paquete",
        },
        "protocolo": {
            "division": "mitad de ajuste / mitad de prueba por semilla (permutación reproducible)",
            "modelos": ["s_learner", "t_learner", "propension", "azar"],
            "metrica": "AUUC por usuario de prueba, calculada desde predicciones fuera de muestra",
            "semillas": list(CRITEO_SEMILLAS),
            "nota": (
                "El benchmark completo del paquete ajusta con ~1,1 M y evalúa con ~2,8 M filas por semilla; "
                "las curvas de esta demo salen del muestreo de 500 000 filas y se identifican como tales."
            ),
        },
        "resultados": resultados,
        "rangos_entre_semillas": rangos,
        "curvas": curvas,
        "referencia_benchmark_completo": _referencia_benchmark(reportes),
        "limites": [
            "La diferencia entre modelos es pequeña y no se ha probado superioridad estadística.",
            "Los rangos entre semillas no son intervalos de confianza: los conjuntos de prueba se traslapan.",
            "Criteo no comparte hogares, segmentos ni campañas con Complete Journey: sus efectos no se atribuyen a esos segmentos.",
            "El uplift es sobre visitas y conversiones de la fuente, no sobre ingresos ni ROI.",
        ],
    }


def _round_float(valor: float) -> float | None:
    return _redondear(float(valor), 5)


# --------------------------------------------------------------------------- #
# Experimentación: potencia y diseño
# --------------------------------------------------------------------------- #
def _muestra_por_brazo(tasa: float, mde_relativo: float, alpha: float, potencia: float) -> int:
    """Misma fórmula que el informe de potencia del paquete (varianza agrupada)."""
    from statistics import NormalDist

    objetivo = tasa * (1 + mde_relativo)
    agrupada = (tasa + objetivo) / 2
    normal = NormalDist()
    z_alpha = normal.inv_cdf(1 - alpha / 2)
    z_potencia = normal.inv_cdf(potencia)
    numerador = (
        z_alpha * np.sqrt(2 * agrupada * (1 - agrupada))
        + z_potencia * np.sqrt(tasa * (1 - tasa) + objetivo * (1 - objetivo))
    ) ** 2
    return int(np.ceil(numerador / (objetivo - tasa) ** 2))


def experimento(reportes: Path, perfiles: list[dict]) -> dict:
    poder = json.loads((reportes / "segment_campaign_experiment_power.json").read_text(encoding="utf-8"))
    filas = []
    for escenario in poder["scenarios"]:
        por_segmento = []
        for segmento, datos in escenario["by_segment"].items():
            calculado = _muestra_por_brazo(
                datos["baseline_proxy"],
                escenario["relative_minimum_detectable_lift"],
                poder["power_assumptions"]["two_sided_alpha_per_primary_comparison"],
                poder["power_assumptions"]["power"],
            )
            por_segmento.append(
                {
                    "segmento": segmento,
                    "tasa_base": _redondear(datos["baseline_proxy"], 5),
                    "tasa_objetivo": _redondear(datos["target_response_rate"], 5),
                    "por_brazo_informe": datos["households_per_arm"],
                    "por_brazo_recalculado": calculado,
                    "tres_brazos": int(calculado * 3),
                }
            )
        filas.append(
            {
                "mde_relativo": escenario["relative_minimum_detectable_lift"],
                "por_segmento": por_segmento,
                "total_informe": escenario["total_households_all_segments_and_arms"],
                "total_recalculado": int(sum(s["tres_brazos"] for s in por_segmento)),
            }
        )
    capacidad = poder["current_data_capacity"]
    return {
        "estado": "diseño preparado; experimento no ejecutado",
        "diseño": poder["design"],
        "comparacion_primaria": poder["primary_comparison"],
        "resultado_primario": poder["primary_outcome"],
        "supuestos": poder["power_assumptions"],
        "formula": (
            "n por brazo = (p1(1-p1) + p2(1-p2)) × (z_{1-α/2} + z_{potencia})² / (p2-p1)², "
            "aproximación normal para dos proporciones independientes, redondeo hacia arriba"
        ),
        "escenarios": filas,
        "capacidad_actual": {
            **capacidad,
            "hogares_disponibles": int(capacidad["unique_households_in_august_90d_cohort"]),
        },
        "segmentos_actuales": [
            {
                "segmento": segmento["nombre"],
                "hogares": segmento["hogares"],
            }
            for segmento in (perfiles[1]["segmentos"] if len(perfiles) > 1 else [])
        ],
        "limitaciones": poder["limitations"]
        + [
            "La estimación de potencia no sustituye la asignación aleatoria ni la recolección de resultados.",
            "Los hogares del cohorte actual no alcanzan para un efecto modesto; haría falta un padrón elegible nuevo.",
        ],
        "aleatorizador": {
            "script": "marketing_customer_project/src/randomize_segment_campaign_trial.py",
            "correccion": "la columna randomization_confirmed ya no la escribe el aleatorizador: exige evidencia externa del manifiesto",
        },
        "analizador": {
            "script": "marketing_customer_project/src/evaluate_segment_campaign_trial.py",
            "correccion": "verifica el sha256 del manifiesto de asignación y aplica corrección de Holm a las comparaciones",
        },
    }


# --------------------------------------------------------------------------- #
# Programa principal
# --------------------------------------------------------------------------- #
def main() -> int:
    parser = argparse.ArgumentParser(description="Exporta los artefactos del tablero «Clientes y campañas»")
    parser.add_argument("--exports", type=Path, default=Path("marketing_customer_audit/exports"))
    parser.add_argument("--transactions", type=Path, default=Path("marketing_customer_audit/raw/transactions_full.rds"))
    parser.add_argument("--reports", type=Path, default=Path("marketing_customer_project/reports"))
    parser.add_argument("--data", type=Path, default=Path("marketing_customer_project/data"))
    parser.add_argument("--salida", type=Path, default=Path("dist/dashboards/clientes-campanas/data"))
    args = parser.parse_args()

    print("Customer Growth Intelligence · exportación de artefactos")
    tx = load_transactions(args.transactions)
    productos = _csv(args.exports / "products.csv")
    productos["product_id"] = productos["product_id"].astype(str).str.replace(r"\.0$", "", regex=True)
    departamentos = (
        tx.merge(productos[["product_id", "department"]], on="product_id", how="left")
        ["department"].fillna("UNKNOWN").value_counts().head(10).index.tolist()
    )
    print(f"  transacciones: {len(tx):,} · hogares: {tx['household_id'].nunique():,} · departamentos: {len(departamentos)}")

    perfiles, asignaciones = perfiles_por_corte(tx, productos, departamentos)
    print("  perfiles por corte:", ", ".join(f"{p['corte']} k={p['k_elegido']}" for p in perfiles))

    manifiesto = {
        "proyecto": "Customer Growth Intelligence",
        "version_artefactos": 1,
        "generado_en": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "unidad_complete_journey": "hogar comprador",
        "cortes": CORTES,
        "ventana_dias": VENTANA_DIAS,
        "parametros": {
            "kmeans_semilla": SEED,
            "criterio_k": f"menor k con al menos {int(MIN_SHARE * 100)} % por segmento",
            "muestra_beeswarm_por_segmento": MUESTRA_BEESWARM,
            "modelo_propension": "regresión logística (variables de 90 días y exposición previa; sin demografía)",
            "criteo_muestra": CRITEO_MUESTRA,
            "criteo_semillas": list(CRITEO_SEMILLAS),
            "puntos_curva": PUNTOS_CURVA,
        },
        "fuentes": {
            "complete_journey": {
                "descripcion": "Complete Journey (84.51°) — transacciones, campañas, cupones y demografía",
                "filas_transaccion": int(len(tx)),
                "hogares": int(tx["household_id"].nunique()),
                "desde": tx["transaction_timestamp"].min().strftime("%Y-%m-%d"),
                "hasta": tx["transaction_timestamp"].max().strftime("%Y-%m-%d"),
            },
            "criteo": {
                "descripcion": "Criteo Uplift Prediction Dataset v2.1 — muestra de 500 000 filas",
                "filas_muestra": int(pd.read_csv(args.data / CRITEO_MUESTRA, usecols=["treatment"]).shape[0]),
            },
        },
        "modulos": {
            "complete_journey": ["Perfiles", "Evolución", "Campañas"],
            "criteo": ["Incrementalidad"],
            "experimentacion": ["Experimento"],
            "separacion": "Criteo no comparte hogares, segmentos ni campañas con Complete Journey; no se unen ni se atribuyen efectos.",
        },
        "artefactos": [],
        "correcciones": [],
    }

    _json(args.salida / "perfiles.json", {"cortes": perfiles, "departamentos": departamentos})
    manifiesto["artefactos"].append({"archivo": "perfiles.json", "contenido": "perfiles, distribuciones, departamentos y asignaciones por hogar y corte"})

    _json(args.salida / "evolucion.json", evolucion(asignaciones, perfiles))
    manifiesto["artefactos"].append({"archivo": "evolucion.json", "contenido": "transiciones entre cortes, entradas y salidas, permanencia y ARI"})

    _json(args.salida / "campanas.json", campanas(args.exports, args.transactions))
    manifiesto["artefactos"].append({"archivo": "campanas.json", "contenido": "propensión por corte: métricas, calibración, targeting y campañas"})

    _json(args.salida / "incrementalidad.json", incrementalidad(args.data, args.reports))
    manifiesto["artefactos"].append({"archivo": "incrementalidad.json", "contenido": "Criteo: AUUC por modelo y semilla, rangos y curvas"})

    _json(args.salida / "experimento.json", experimento(args.reports, perfiles))
    manifiesto["artefactos"].append({"archivo": "experimento.json", "contenido": "diseño prospectivo, potencia y capacidad actual"})

    manifiesto["correcciones"] = [
        "la mezcla de departamentos conserva el nombre del departamento",
        f"el número de segmentos se elige con la regla de ≥{int(MIN_SHARE * 100)} % por segmento",
        "las etiquetas de segmento se alinean entre cortes por actividad (el id de K-Means es arbitrario)",
        "las transiciones se calculan desde las asignaciones por hogar, no desde el ARI",
        "las curvas de targeting y calibración salen de predicciones fuera de muestra",
        "los rangos entre semillas de Criteo se etiquetan como rangos, no como intervalos de confianza",
        "el aleatorizador ya no afirma randomization_confirmed; el analizador ITT exige manifiesto y aplica Holm",
    ]
    _json(args.salida / "manifiesto.json", manifiesto)
    print("Listo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

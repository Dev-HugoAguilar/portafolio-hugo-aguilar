"""Pruebas de los artefactos del tablero «Clientes y campañas» y de las plantillas.

Comprueban invariantes que la interfaz da por ciertas: reconciliación de tamaños,
conservación de flujos, curvas que terminan en el universo, separación de fuentes,
reproducción del cálculo de potencia y las guardas del aleatorizador y del
analizador ITT (que ya no aceptan una bandera como prueba de aleatorización).

Se ejecutan con la biblioteca estándar:

    python -m unittest discover -s marketing_customer_project/tests -v
"""

from __future__ import annotations

import csv
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DATOS = RAIZ / "dist" / "dashboards" / "clientes-campanas" / "data"
SRC = RAIZ / "marketing_customer_project" / "src"
sys.path.insert(0, str(SRC))

import evaluate_segment_campaign_trial as itt  # noqa: E402
import randomize_segment_campaign_trial as aleatorizador  # noqa: E402


def cargar(nombre: str) -> dict:
    return json.loads((DATOS / nombre).read_text(encoding="utf-8"))


class ArtefactosTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.perfiles = cargar("perfiles.json")
        cls.evolucion = cargar("evolucion.json")
        cls.campanas = cargar("campanas.json")
        cls.incrementalidad = cargar("incrementalidad.json")
        cls.experimento = cargar("experimento.json")
        cls.manifiesto = cargar("manifiesto.json")

    # ·· Complete Journey: perfiles y asignaciones ··········································
    def test_segmentos_suman_el_universo(self) -> None:
        for corte in self.perfiles["cortes"]:
            suma = sum(segmento["hogares"] for segmento in corte["segmentos"])
            self.assertEqual(suma, corte["universo"]["hogares"], corte["corte"])

    def test_asignaciones_por_hogar_completas_y_alineadas(self) -> None:
        for corte in self.perfiles["cortes"]:
            hogares = corte["hogares"]
            self.assertEqual(len(hogares["segmento"]), corte["universo"]["hogares"])
            self.assertEqual(len(set(hogares["hogar"])), corte["universo"]["hogares"])
            self.assertEqual(set(hogares["segmento"]), set(range(corte["k_elegido"])))
            self.assertEqual(corte["k_elegido"], len(corte["segmentos"]))

    def test_regla_de_tamano_minimo_por_segmento(self) -> None:
        for corte in self.perfiles["cortes"]:
            elegidos = [c for c in corte["candidatos_k"] if c["min_share"] >= 0.05]
            self.assertTrue(elegidos, corte["corte"])
            self.assertEqual(corte["k_elegido"], min(c["k"] for c in elegidos))

    def test_departamentos_con_nombre_y_soporte(self) -> None:
        for corte in self.perfiles["cortes"]:
            for segmento in corte["segmentos"]:
                self.assertTrue(segmento["departamentos"])
                for dato in segmento["departamentos"]:
                    self.assertNotIn("department_share_", dato["departamento"])
                    self.assertGreaterEqual(dato["hogares_con_compra"], 0)
                    self.assertLessEqual(dato["share_medio"], 1)

    # ·· Evolución: conservación de flujos ·················································
    def test_los_flujos_conservan_los_hogares_comunes(self) -> None:
        for par in self.evolucion["pares"]:
            suma = sum(flujo["hogares"] for flujo in par["flujos"])
            self.assertEqual(suma, par["comunes"], par["corte_a"])
            self.assertEqual(par["hogares_a"] - par["comunes"], par["salen"])
            self.assertEqual(par["hogares_b"] - par["comunes"], par["entran"])

    # ·· Campañas: curvas fuera de muestra ·················································
    def test_targeting_monotono_y_completo(self) -> None:
        for corte in self.campanas["cortes"]:
            curva = corte["targeting"]
            self.assertGreater(len(curva), 10)
            self.assertEqual(curva[-1]["recall"], 1)
            contactados = [punto["contactados"] for punto in curva]
            self.assertEqual(contactados, sorted(contactados))
            self.assertEqual(curva[-1]["contactados"], corte["prueba"]["pares"])

    def test_calibracion_con_deciles(self) -> None:
        for corte in self.campanas["cortes"]:
            self.assertGreaterEqual(len(corte["calibracion"]), 5)
            self.assertEqual(sum(decil["filas"] for decil in corte["calibracion"]), corte["prueba"]["pares"])

    # ·· Criteo: módulo separado ···························································
    def test_criteo_no_contiene_hogares_ni_segmentos(self) -> None:
        """El artefacto de Criteo no puede traer identificadores ni segmentos de hogares."""
        texto = json.dumps(self.incrementalidad, ensure_ascii=False).lower()
        # Sin claves de identificación de hogares ni de perfiles de Complete Journey:
        # la mención en prosa ("no comparte hogares") es parte de la advertencia.
        for clave in ('"household"', '"hogar"', '"hogares"', '"perfiles"', '"segmento"'):
            self.assertNotIn(clave, texto)
        self.assertTrue(self.incrementalidad["disponible"])

    def test_rangos_entre_semillas_no_son_intervalos(self) -> None:
        for rango in self.incrementalidad["rangos_entre_semillas"]:
            self.assertIn("no es un intervalo de confianza", rango["etiqueta"])
            self.assertLessEqual(rango["min"], rango["max"])

    def test_curvas_de_uplift_por_resultado(self) -> None:
        resultados = {curva["resultado"] for curva in self.incrementalidad["curvas"]}
        self.assertEqual(resultados, {"visit", "conversion"})
        for resultado in resultados:
            modelos = {curva["modelo"] for curva in self.incrementalidad["curvas"] if curva["resultado"] == resultado}
            self.assertGreaterEqual(len(modelos), 3)
            self.assertIn("azar", modelos)

    # ·· Experimento: potencia reproducible ···············································
    def test_potencia_reproduce_el_informe(self) -> None:
        for escenario in self.experimento["escenarios"]:
            self.assertEqual(escenario["total_informe"], escenario["total_recalculado"])
            for segmento in escenario["por_segmento"]:
                self.assertEqual(segmento["por_brazo_informe"], segmento["por_brazo_recalculado"])

    def test_el_experimento_no_esta_ejecutado(self) -> None:
        self.assertIn("no ejecutado", self.experimento["estado"])
        self.assertTrue(self.experimento["limitaciones"])

    def test_manifiesto_declara_correcciones(self) -> None:
        self.assertGreaterEqual(len(self.manifiesto["correcciones"]), 5)
        self.assertEqual(self.manifiesto["modulos"]["separacion"][:8], "Criteo n")


class PlantillasTest(unittest.TestCase):
    """Aleatorizador y analizador: las guardas que se corrigieron antes de publicar."""

    def _roster(self) -> list[dict]:
        filas = []
        for segmento in ("menor_actividad", "mayor_actividad"):
            for indice in range(12):
                filas.append({"household_id": f"{segmento}-{indice:03d}", "segment": segmento})
        return filas

    def _asignacion(self, carpeta: Path) -> tuple[Path, Path]:
        import pandas as pd

        roster = pd.DataFrame(self._roster())
        asignacion = aleatorizador.randomize(roster, seed=7, experiment_id="prueba", assigned_at="2026-11-10")
        archivo = carpeta / "asignacion.csv"
        asignacion.to_csv(archivo, index=False)
        manifiesto = {
            "assignment_sha256": hashlib.sha256(archivo.read_bytes()).hexdigest(),
            "randomization_confirmed": False,
        }
        ruta_manifiesto = carpeta / "asignacion.csv.manifest.json"
        ruta_manifiesto.write_text(json.dumps(manifiesto), encoding="utf-8")
        return archivo, ruta_manifiesto

    def test_el_aleatorizador_no_afirma_aleatorizacion(self) -> None:
        import pandas as pd

        resultado = aleatorizador.randomize(
            pd.DataFrame(self._roster()), seed=7, experiment_id="prueba", assigned_at="2026-11-10"
        )
        self.assertTrue((resultado["randomization_confirmed"] == "").all())
        conteo = resultado.groupby(["segment", "arm"]).size()
        self.assertEqual(conteo.sum(), len(resultado))
        self.assertEqual(len(conteo.index.get_level_values("arm").unique()), 3)

    def test_el_aleatorizador_rechaza_estratos_diminutos(self) -> None:
        import pandas as pd

        with self.assertRaises(ValueError):
            aleatorizador.randomize(
                pd.DataFrame([{"household_id": "a", "segment": "x"}, {"household_id": "b", "segment": "x"}]),
                seed=1,
                experiment_id="prueba",
            )

    def test_el_analizador_exige_manifiesto(self) -> None:
        import pandas as pd

        with tempfile.TemporaryDirectory() as carpeta:
            archivo, _ = self._asignacion(Path(carpeta))
            frame = pd.read_csv(archivo, dtype=str)
            frame["outcome_window_end"] = "2026-12-10"
            frame["outcome_complete"] = "true"
            frame["redeemed_30d"] = 0
            frame["assignment_manifest_sha256"] = hashlib.sha256(archivo.read_bytes()).hexdigest()
            with self.assertRaises(ValueError):
                itt.analyze(frame, None)

    def test_el_analizador_rechaza_bandera_sin_evidencia(self) -> None:
        import pandas as pd

        with tempfile.TemporaryDirectory() as carpeta:
            archivo, ruta_manifiesto = self._asignacion(Path(carpeta))
            manifiesto = json.loads(ruta_manifiesto.read_text(encoding="utf-8"))
            frame = pd.read_csv(archivo, dtype=str)
            frame["outcome_window_end"] = "2026-12-10"
            frame["outcome_complete"] = "true"
            frame["redeemed_30d"] = 0
            frame["assignment_manifest_sha256"] = manifiesto["assignment_sha256"]
            with self.assertRaises(ValueError):
                itt.analyze(frame, manifiesto)

    def test_el_analizador_aplica_holm_con_manifiesto(self) -> None:
        import pandas as pd

        with tempfile.TemporaryDirectory() as carpeta:
            archivo, ruta_manifiesto = self._asignacion(Path(carpeta))
            manifiesto = json.loads(ruta_manifiesto.read_text(encoding="utf-8"))
            manifiesto["randomization_confirmed"] = True
            frame = pd.read_csv(archivo, dtype=str)
            frame["outcome_window_end"] = "2026-12-10"
            frame["outcome_complete"] = "true"
            frame["redeemed_30d"] = [1 if fila == "tailored" else 0 for fila in frame["arm"]]
            frame["sales_30d"] = [12.5 if fila == "tailored" else 4.0 for fila in frame["arm"]]
            frame["margin_30d"] = [3.0 if fila == "tailored" else 1.0 for fila in frame["arm"]]
            frame["assignment_manifest_sha256"] = manifiesto["assignment_sha256"]
            self.assertTrue(frame["randomization_confirmed"].fillna("").eq("").all())
            frame["randomization_confirmed"] = "true"
            resultado = itt.analyze(frame, manifiesto)
            primarias = [
                comparacion["redemption_30d"]
                for segmento in resultado["segments"]
                for comparacion in segmento["comparisons"]
                if comparacion["redemption_30d"].get("primaria")
            ]
            self.assertEqual(len(primarias), 2)
            for primaria in primarias:
                self.assertIn("p_value_holm", primaria)
                self.assertGreaterEqual(primaria["p_value_holm"], primaria["p_value_unadjusted"])


if __name__ == "__main__":
    unittest.main(verbosity=2)

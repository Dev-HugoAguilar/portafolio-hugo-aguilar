# Decisión 02 — alcance real del puntaje de respuesta

## Decisión

Mantener la propensión como un **ranking experimental de hogares expuestos**, no como una probabilidad calibrada para asignar presupuesto o automatizar contactos. El resultado supera un baseline sencillo en Average Precision, pero cambia mucho por campaña y las probabilidades del segmento de mayor puntaje están infladas en dos de los tres cortes.

## Evidencia evaluada

Se usaron los cortes de la evaluación temporal corregida. El entrenamiento solo incluye campañas cerradas antes del corte; las campañas iniciadas después forman la evaluación. Se generaron 2,000 remuestreos por campaña para cuantificar sensibilidad a qué campañas caen en la prueba.

| Corte | Campañas de prueba | AP puntual | IC percentil 95 % por campaña | Diferencia top 10 %: probabilidad media − tasa observada | Gap absoluto medio por campaña |
|---|---:|---:|---:|---:|---:|
| 1 jun 2017 | 14 | 0.341 | 0.169–0.440 | −0.3 pp | 7.4 pp |
| 1 ago 2017 | 11 | 0.402 | 0.169–0.521 | +20.6 pp | 3.3 pp |
| 1 oct 2017 | 8 | 0.385 | 0.128–0.535 | +32.2 pp | 5.4 pp |

El signo negativo de junio significa que la media del puntaje del decil superior quedó apenas por debajo de su tasa observada; los otros cortes muestran sobreestimación. El AP del modelo por campaña también varía ampliamente, incluyendo campañas donde casi no ordena respuestas. Los intervalos de AP son anchos: con 8–14 campañas no se sostiene una afirmación precisa de desempeño estable.

## Qué permiten concluir las cifras

- Hay señal de ordenamiento retrospectivo frente al baseline por tipo de campaña en estos cortes.
- No se acredita una probabilidad bien calibrada ni un umbral de contacto económicamente óptimo.
- El bootstrap conserva la dependencia dentro de cada campaña, pero no modela completamente hogares repetidos entre campañas; sus intervalos son un diagnóstico de sensibilidad, no inferencia definitiva.
- Los cortes ya fueron consultados durante este trabajo. No constituyen un holdout intacto para la siguiente iteración.
- Canjear entre personas expuestas no demuestra el efecto incremental de la campaña. Para eso se necesita asignación aleatoria/control documentado y medir el resultado de tratamiento frente al control.

## Siguiente decisión de proyecto

1. Congelar este resultado como prueba de factibilidad y evitar seguir afinando contra los mismos cortes finales.
2. Para completar el módulo de propensión, hacer diagnóstico de calibración mediante validación temporal interna en campañas de desarrollo; toda recalibración y selección de umbral se ajusta solo dentro de desarrollo.
3. Mantener una ventana posterior reservada para evaluación final. Si el benchmark histórico ya no permite un periodo no consultado, declarar la evaluación interna como tal y buscar una fuente nueva para validación externa.
4. Desarrollar el módulo de incrementalidad con un benchmark aleatorizado separado (por ejemplo, Criteo Uplift), sin unir identidades ni confundir sus resultados con Complete Journey.

## Reproducibilidad

- Script: `src/robust_propensity_validation.py`.
- Resultados completos: `reports/robust_propensity_validation.json`.
- Método: 2,000 remuestreos de campañas por corte; deciles de puntuación como diagnóstico de calibración.
- Semilla bootstrap: 20261110.

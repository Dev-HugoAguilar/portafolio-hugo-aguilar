# Customer Growth Intelligence

Proyecto de ciencia de datos para demostrar cómo pasar de transacciones y campañas a decisiones medibles de segmentación y marketing. El primer caso usa Complete Journey, un conjunto de hogares compradores de Estados Unidos. Las fuentes adicionales se analizarán como estudios separados; no se fusionarán sus clientes como si fueran una misma población.

## Alcance por etapas

1. **Segmentación conductual:** perfiles RFM y mezcla de categorías con compras disponibles antes de la fecha de corte. Validar estabilidad temporal, tamaño de segmentos y utilidad comercial.
2. **Propensión de respuesta:** estimar la probabilidad de que un hogar expuesto a una campaña canjee al menos un cupón. La puntuación ordena respuestas probables; no estima el efecto incremental de enviar la campaña.
3. **Incrementalidad de campañas:** usar Criteo Uplift v2.1 como benchmark aleatorizado separado. Su auditoría completa ya confirmó 13,979,592 filas válidas y generó una muestra uniforme reproducible de 500,000 filas. Medir uplift y curvas Qini/AUUC; no unir filas ni identidades con Complete Journey.
4. **Retención y valor futuro:** definir inactividad como proxy de churn y pronosticar gasto observado a un horizonte fijo. Sin margen ni costo de adquisición, llamarlo valor futuro de compra, no CLV de beneficio.
5. **Recomendación:** usar el histórico completo de canastas, evaluar temporalmente con Recall@K/NDCG@K y comparar con popularidad y reglas de asociación.

## Evidencia inicial en Complete Journey

- Histórico completo usado para la prueba: 1,469,307 líneas, 2,469 hogares, 155,848 canastas, 68,509 productos, 457 tiendas y 53 semanas; 2017-01-01 a 2018-01-01.
- Los datos de campañas contienen 6,589 pares hogar-campaña en 27 campañas; al reducir las múltiples redenciones de cada hogar/campaña a una etiqueta binaria hay 792 pares con respuesta (12.0 %).
- Demografía disponible para 801 hogares (32.4 % del universo transaccional), por lo que los modelos deben funcionar sin demografía y reportar cobertura.
- La primera evaluación cronológica incluía en entrenamiento campañas iniciadas antes del corte, aunque algunas seguían aceptando canjes. Se conserva como exploración inicial, pero **no** como resultado principal.
- La evaluación corregida solo entrena con campañas cuya fecha de cierre es anterior al corte; las campañas aún abiertas se excluyen. Las pruebas incluyen campañas completas posteriores y se reportan por separado para hogares con y sin exposiciones en entrenamiento.

| Corte | Entrenamiento (pares / campañas / respuestas) | Prueba (pares / campañas) | AP total | AP hogares con exposiciones previas en entrenamiento | AP hogares sin exposiciones en entrenamiento | Lift del decil superior sin exposición previa |
|---|---:|---:|---:|---:|---:|---:|
| 1 jun 2017 | 1,091 / 11 / 74 | 4,246 / 14 | 0.341 | 0.379 | 0.275 | 3.03× |
| 1 ago 2017 | 2,466 / 14 / 262 | 3,739 / 11 | 0.402 | 0.419 | 0.241 | 3.01× |
| 1 oct 2017 | 3,927 / 17 / 475 | 2,421 / 8 | 0.385 | 0.399 | 0.283 | 2.42× |

En las tres ventanas, el AP total supera el baseline por tipo de campaña (0.172–0.177). El resultado para hogares sin exposición en entrenamiento es más débil y varía con el corte; además, en octubre solo hay 213 pares de prueba en ese grupo. No equivale a evaluar clientes completamente nuevos: pueden tener historial transaccional previo. Es evidencia de factibilidad para priorizar canjes en este dataset, no de transferencia a clientes o mercados actuales. Las ventanas se traslapan y no son réplicas independientes. Ver `reports/robust_propensity_validation.json` para métricas completas, campañas, cobertura y campañas excluidas por estar activas en el corte.

La calibración limita el uso: en el decil superior el promedio pronosticado fue 70.6 % frente a 50.0 % observado en agosto, y 80.1 % frente a 47.9 % en octubre. El bootstrap por campaña produce intervalos amplios para Average Precision (0.169–0.521 en agosto; 0.128–0.535 en octubre). El puntaje sirve como ranking experimental; no debe presentarse como probabilidad precisa ni usarse para fijar inversión. El remuestreo conserva la dependencia dentro de cada campaña, pero no resuelve completamente hogares repetidos entre campañas. La decisión está en `reports/decision_02.md`.
- Segmentación conductual validada con ventanas móviles de 90 días y cortes 2017-07-01, 2017-08-01 y 2017-09-01. K-Means eligió dos grupos en los tres cortes al exigir que cada segmento tenga al menos 5 % de los hogares. La división menor/mayor actividad fue estable al retirar 20 % de hogares (ARI medio 0.975–0.987), pero la pertenencia cambió moderadamente entre meses (ARI 0.50–0.67); debe recalcularse como segmento dinámico. Los canjes en campañas futuras fueron mayores en el grupo activo (15.5–17.1 %) que en el de menor actividad (0.9–5.5 %), como asociación descriptiva y no causal. Detalle: `reports/behavior_segments_validation.md` y `.json`; ejecución: `src/validate_behavior_segments.py`. Se diseñó además un experimento prospectivo con holdout, campaña genérica y variante adaptada; el dimensionamiento muestra que la cohorte actual no alcanza para detectar efectos modestos. Quedaron listos el aleatorizador para un padrón elegible real y el analizador ITT, que exige aleatorización confirmada y resultados completos. Complete Journey no permite recrear causalidad histórica. Consulta `reports/segment_campaign_experiment_design.md`.

Los resultados son una prueba de viabilidad sobre una fuente y una ventana temporal, no una promesa de desempeño en producción. La evaluación separa hogares presentes en las exposiciones de entrenamiento de hogares ausentes de esas exposiciones dentro del mismo periodo futuro. El segundo grupo puede tener historial de compras y no representa un cold start estricto. El conjunto es pequeño en número de campañas, las ventanas de prueba se traslapan y no permite afirmar estabilidad de largo plazo.

## Límites que guían el diseño

- Respuesta a canje no equivale a conversión incremental. La fuente no demuestra asignación aleatoria ni aporta un grupo de control causal.
- El resultado de propensión no estima ingresos incrementales ni ROI: no hay costos completos de campaña, márgenes ni costos de contacto.
- Es un retailer y una población de Estados Unidos; no representa México.
- Los atributos demográficos están incompletos y no deben imputarse como hechos conocidos.
- La edad del conjunto es 2017–2018. Es adecuado para métodos y portafolio, no para describir preferencias actuales.
- Las fechas de campaña y redención se respetan al crear variables; no entran resultados posteriores al inicio de cada campaña.
- El histórico completo permite estudiar canastas y repetición, pero las recomendaciones todavía requieren una evaluación temporal fuera de muestra.

## Reproducibilidad

Los scripts reciben tablas CSV del paquete en `marketing_customer_audit/exports/` y el archivo completo `transactions_full.rds` en `marketing_customer_audit/raw/`. El RDS completo no se incluye en este paquete de código. Consulta `reports/decision_01.md` y los JSON de resultados para cifras calculadas.

El benchmark Criteo tiene su propia fuente, auditoría, muestra y evaluación de holdout: `data/criteo_uplift_sample_500k.csv.gz`, `data/README-CRITEO.md`, `reports/criteo_uplift_audit.json`, `reports/criteo_uplift_viability.md`, `reports/criteo_uplift_prototype.json` y `reports/criteo_full_benchmark.json`, `reports/criteo_full_benchmark_seed222.json`, `reports/criteo_full_benchmark_seed333.json` y `reports/criteo_seed_stability.json`. No combines sus filas con Complete Journey. El holdout cubre el archivo completo, pero los modelos se ajustan con 1.1 millones de filas y se probaron tres semillas con holdouts solapados; los resultados son prometedores para demostrar uplift modeling, todavía no para elegir una política o afirmar rentabilidad.

```bash
python marketing_customer_project/src/response_propensity.py \
  --cutoff 2017-08-01 \
  --output marketing_customer_project/reports/response_propensity.json

python marketing_customer_project/src/robust_propensity_validation.py \
  --cutoffs 2017-06-01 2017-08-01 2017-10-01 \
  --output marketing_customer_project/reports/robust_propensity_validation.json

python marketing_customer_project/src/behavior_segments.py \
  --cutoff 2017-08-01 \
  --output marketing_customer_project/reports/behavior_segments.json

python marketing_customer_project/src/validate_behavior_segments.py \
  --output marketing_customer_project/reports/behavior_segments_validation.json

python marketing_customer_project/src/plan_segment_campaign_experiment.py \
  --output marketing_customer_project/reports/segment_campaign_experiment_power.json

# Solo con datos prospectivos aleatorizados y ventanas de resultado completas
python marketing_customer_project/src/randomize_segment_campaign_trial.py eligible_households.csv \
  --output trial_assignments.csv --seed 20261110 --experiment-id campaign-segment-test-01

python marketing_customer_project/src/evaluate_segment_campaign_trial.py trial_households.csv \
  --output marketing_customer_project/reports/campaign_trial_results.json

python marketing_customer_project/src/audit_criteo_uplift.py \
  --sample-size 500000 \
  --sample marketing_customer_project/data/criteo_uplift_sample_500k.csv.gz \
  --report marketing_customer_project/reports/criteo_uplift_audit.json

python marketing_customer_project/src/uplift_baseline.py \
  --sample marketing_customer_project/data/criteo_uplift_sample_500k.csv.gz \
  --output marketing_customer_project/reports/criteo_uplift_prototype.json

python marketing_customer_project/src/criteo_full_reference_benchmark.py \
  --archive marketing_customer_audit/raw/criteo-research-uplift-v2.1.csv.gz \
  --output marketing_customer_project/reports/criteo_full_benchmark.json

# Repetir con otras semillas para comprobar estabilidad
python marketing_customer_project/src/criteo_full_reference_benchmark.py --seed 222 \
  --output marketing_customer_project/reports/criteo_full_benchmark_seed222.json
python marketing_customer_project/src/criteo_full_reference_benchmark.py --seed 333 \
  --output marketing_customer_project/reports/criteo_full_benchmark_seed333.json
```

Dependencias: Python 3.12, pandas, NumPy, scikit-learn y pyreadr.

El archivo RDS se puede descargar y verificar con `python marketing_customer_project/src/download_transactions.py`. Los CSV del paquete de muestra deben extraerse previamente desde `muestra_marketing_clientes_auditada.zip` a `marketing_customer_audit/exports/`.

## Fuentes

- Complete Journey R package: https://cran.r-project.org/package=completejourney
- Repositorio del paquete y descripción de los archivos completos: https://github.com/bradleyboehmke/completejourney
- Archivo completo de transacciones usado en este primer experimento: https://raw.githubusercontent.com/bradleyboehmke/completejourney/master/data/transactions.rds
- Fuente original declarada por el paquete: 84.51° Complete Journey Study.

Revisar los términos del proveedor de los datos antes de redistribuirlos o utilizarlos fuera de un proyecto educativo/de portafolio.

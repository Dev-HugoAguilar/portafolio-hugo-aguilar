# Auditoría de viabilidad — Criteo Uplift v2.1

## Decisión

**Viable como benchmark independiente de incrementalidad publicitaria.** No sustituye Complete Journey ni permite perfilar segmentos comerciales interpretables. Se recomienda incorporarlo como un segundo caso del portafolio, conectado por la pregunta de negocio —a quién conviene impactar— pero con datos, población, etiquetas y resultados separados.

## Fuente y descarga

- Fuente: Criteo AI Lab, *A Large Scale Benchmark for Uplift Modeling* (Diemert et al., AdKDD 2018).
- Versión: **v2.1 no sesgada**. Criteo publicó esta revisión para resolver una fuga de la versión inicial causada por diferencias de incrementabilidad entre anunciantes.
- Archivo: `criteo-research-uplift-v2.1.csv.gz`, descargado del espejo oficial de Criteo en Hugging Face porque el enlace directo `go.criteo.net` respondió HTTP 404 durante esta ejecución.
- Filas publicadas: 13,979,592; columnas: 12 atributos numéricos anonimizados y cuatro indicadores: `treatment`, `conversion`, `visit`, `exposure`.
- Licencia indicada: **CC BY-NC-SA 4.0**. Requiere atribución, uso no comercial y compartir adaptaciones bajo términos compatibles. Revisar antes de distribuir datos o usar derivados con finalidad comercial.
- Archivo comprimido local: 311,422,618 bytes. SHA-256 calculado: `2716e1bf0fd157a93b5bf86924d9088419dfbac2022c6cd90030220634f616dc`.

## Auditoría del archivo completo

El recorrido streaming procesó todas las filas sin cargar el CSV descomprimido completo en memoria.

| Control / medida | Resultado |
|---|---:|
| Filas procesadas y válidas | 13,979,592 |
| Faltantes | 0 |
| Filas inválidas / valores binarios fuera de 0–1 | 0 |
| Proporción asignada a tratamiento | 85.00 % |
| Tratamiento: conversiones | 36,711 / 11,882,655 = 0.309 % |
| Control: conversiones | 4,063 / 2,096,937 = 0.194 % |
| Tratamiento: visitas | 576,824 / 11,882,655 = 4.854 % |
| Control: visitas | 80,105 / 2,096,937 = 3.820 % |
| Exposición efectiva dentro de tratamiento | 428,212 / 11,882,655 = 3.604 % |
| Exposición efectiva en control | 0 |

Las diferencias observadas tratamiento–control son +0.115 puntos porcentuales en conversión y +1.034 puntos en visita. Son descripciones del benchmark v2.1; por el submuestreo no uniforme que Criteo declara, no deben traducirse a impacto original, ROI ni proyección de una campaña real.

## Muestra reproducible

Se extrajo una muestra uniforme por reservoir sampling sobre las 13,979,592 filas:

- 500,000 filas; semilla `20261110`.
- Tratamiento: 85.04 %.
- Conversiones: 1,510 (0.302 %); visitas: 23,265 (4.653 %).
- SHA-256 del archivo comprimido de muestra: `730c9823cf4af12a4b504f583e7c1d4e710958d49d9057cc8b9d4e56c31bbde1`.
- Uso adecuado: validar ingesta, funciones de métricas, curva de uplift y prototipos computacionales.
- Límite: ~1,510 conversiones no bastan para afirmar heterogeneidad fina entre muchos subgrupos. Las conclusiones del modelo deben calcularse en el universo completo y con métricas de uplift, no extrapolarse desde esta muestra.

## Contrato analítico recomendado

- **Unidad:** una fila de benchmark por usuario anonimizado; no hay identificador persistente ni datos que permitan seguimiento individual.
- **Asignación:** `treatment` define el grupo asignado aleatoriamente en las pruebas de incrementabilidad reunidas.
- **Resultado primario:** `conversion`; `visit` es resultado secundario.
- **Estimando:** efecto de intención de tratar, comparando asignación (`treatment=1`) contra control (`treatment=0`).
- **No condicionar en `exposure`:** es entrega efectiva posterior a la asignación. Filtrar solo los expuestos rompería la comparación aleatorizada y cambiaría el estimando.
- **Modelos candidatos:** diferencia global como baseline; S-learner y T-learner; luego un modelo de uplift/ITE regularizado. La prioridad será estabilidad y evaluación, no acumular algoritmos.
- **Evaluación:** uplift/Qini y AUUC, uplift@k bajo presupuesto simulado, comparación con targeting aleatorio y targeting por propensión. Separar calibración de ITE del ranking de uplift.
- **Validación:** partición reproducible y sensibilidad por semillas/muestras. El conjunto mezcla pruebas y no documenta aquí calendario, campaña ni advertiser para hacer holdout temporal/campaña verificable.

## Adecuación al proyecto

| Necesidad de portafolio | Adecuación de Criteo |
|---|---|
| Propensión de compra/canje en un retailer | No es la pregunta principal; Complete Journey la cubre descriptivamente |
| Efecto incremental de publicidad | Sí; es el aporte principal de esta fuente |
| Segmentación comercial interpretable | No; `f0`–`f11` están anonimizadas y sin significado de negocio |
| Recomendación, retención o valor de vida | No hay historial, tiempo, identidad, margen ni gasto continuo |
| Caso geográfico o específicamente mexicano | No hay país, ubicación ni contexto identificable |
| Demostración técnica de causal ML | Sí, con límites de mezcla de experimentos y licencia |

## Prueba inicial de modelado

Se ejecutó un prototipo reproducible sobre la muestra de 500 mil filas: split aleatorio 70/30 estratificado por `treatment`, regresión logística S/T con interacciones y comparación contra propensión de conversión entre tratados y targeting aleatorio.

| Ranking en el test de 150,000 filas | Qini área por usuario | AUUC área por usuario | Uplift observado en top 10 % |
|---|---:|---:|---:|
| T-learner | 0.000345 | 0.001357 | 0.986 pp |
| S-learner | 0.000244 | 0.001257 | 0.932 pp |
| Propensión a conversión con tratamiento | 0.000823 | 0.001836 | 1.557 pp |
| Targeting aleatorio (una realización) | 0.000113 | 0.001126 | 0.445 pp |

**No elegir un ganador con esta prueba.** La propensión superó a S/T en esta muestra, pero solo hubo 136 conversiones del control en las 500 mil filas y 33 en el test; la incertidumbre del uplift en el segmento top es alta. El targeting aleatorio también tuvo uplift positivo, señal de esa variabilidad. Este resultado valida el recorrido técnico; no demuestra que la propensión sea mejor ni que una política sea rentable. La fórmula preliminar de AUUC ya se contrastó con la referencia oficial; el prototipo sigue siendo exploratorio por el bajo número de conversiones de control. El recálculo está en `reports/criteo_uplift_prototype.json`.


## Benchmark de referencia sobre el archivo completo

Se completaron tres holdouts reproducibles sobre todo el archivo v2.1 (semillas 111, 222 y 333) y se contrastó la fórmula de AUUC con `auuc_sep_rel_prop1` del repositorio oficial. En tres vectores sintéticos de 100, 1,000 y 10,000 observaciones, ambas implementaciones coincidieron dentro de 9e-19. Esto valida la fórmula, no implica que el modelo reproduzca el benchmark publicado.

| Elemento | Configuración / resultado |
|---|---|
| Partición | Tres holdouts aleatorios por fila 80/20, semillas 111/222/333; aproximadamente 11.18 M filas de entrenamiento y 2.80 M de prueba por ejecución |
| Ajuste | Muestras aleatorias de 1,098,995–1,101,851 filas de entrenamiento; estandarización aprendida solo en cada muestra |
| Modelos | Regresión logística T-learner, S-learner con interacciones y propensión de respuesta en tratados; ranking aleatorio como referencia |
| Resultado primario | `visit`, siguiendo el notebook oficial de Criteo; `conversion` se informa como resultado secundario más cercano a una conversión comercial |
| Métrica | AUUC relativo separado de Criteo y diferencia de tasas tratamiento-control dentro del top 10 % |

| Resultado / modelo | AUUC medio (rango entre semillas) | Uplift top 10 % medio (rango, pp) |
|---|---:|---:|
| **Visita** · T-learner | 0.009281 (0.009095–0.009435) | +6.24 (6.15–6.30) |
| Visita · S-learner | 0.009209 (0.009039–0.009325) | +6.09 (5.92–6.26) |
| Visita · propensión de respuesta | 0.009149 (0.008817–0.009319) | +5.04 (4.79–5.25) |
| Visita · ranking aleatorio, AUUC medio de 20 sorteos por semilla | 0.005117–0.005251 | — |
| **Conversión** · T-learner | 0.001107 (0.001041–0.001173) | +0.842 (0.775–0.894) |
| Conversión · S-learner | 0.001070 (0.001047–0.001089) | +0.825 (0.794–0.850) |
| Conversión · propensión de respuesta | 0.001147 (0.001082–0.001183) | +0.907 (0.847–0.937) |
| Conversión · ranking aleatorio, AUUC medio de 20 sorteos por semilla | 0.000568–0.000623 | — |

El efecto global tratamiento–control promedió +1.024 pp en visitas (rango 0.992–1.042) y +0.121 pp en conversiones (0.115–0.125). En las tres particiones el T-learner encabezó AUUC de visita; la propensión de respuesta encabezó AUUC de conversión. Las diferencias entre candidatos son pequeñas y sus rangos de AUUC se traslapan. Las semillas reutilizan la misma fuente y sus holdouts se solapan: **no son tres réplicas independientes** ni acreditan superioridad estadística. Los intervalos binomiales por top 10 % de cada ejecución son aproximados, no incorporan la selección del ranking ni reemplazan bootstrap por unidad experimental. El uplift@10 observado es diagnóstico; no es ingreso incremental ni ROI.

El ajuste no pretende reproducir el resultado del artículo: usa regresión logística con estandarización y una muestra de ajuste acotada a 1.1 millones; el notebook oficial usa otra preparación de variables y compara modelos distintos con su protocolo propio. La métrica sí se contrastó con su código. La fuente contiene población y pruebas mezcladas, sin fecha, campaña, anunciante, identificador estable ni geografía; por tanto no habilita validación por campaña/tiempo, segmentación interpretable ni transferencia a México. Para cerrar el caso de portafolio toca cuantificar incertidumbre con bootstrap por unidad experimental disponible (si se puede identificar), comparar sensibilidad a la regularización y documentar el protocolo; no presentar aún el efecto como política desplegable.

Los resultados por semilla están en `reports/criteo_full_benchmark.json`, `reports/criteo_full_benchmark_seed222.json` y `reports/criteo_full_benchmark_seed333.json`; el resumen está en `reports/criteo_seed_stability.json`. El ejecutor es `src/criteo_full_reference_benchmark.py`.

## Artefactos reproducibles

- `src/audit_criteo_uplift.py`: descarga, SHA-256, auditoría streaming y muestra determinista.
- `reports/criteo_uplift_audit.json`: resultados medidos y conteos de tratamiento/exposición.
- `data/criteo_uplift_sample_500k.csv.gz`: muestra de 500 mil filas.
- `data/README-CRITEO.md`: atribución, licencia y límites de uso.
- `src/uplift_baseline.py` y `reports/criteo_uplift_prototype.json`: primer prototipo de S/T-learner sobre la muestra; no usar como resultado final.
- `src/criteo_full_reference_benchmark.py` y `reports/criteo_full_benchmark.json`: holdouts de todo el archivo, modelos ajustados con muestras de 1.1 millones, tres semillas y métrica cotejada con la referencia; cortes solapados, no concluyente para superioridad estadística.

# Diseño de prueba de campañas por segmento

## Qué se hizo y qué no puede hacerse con la historia existente

Quedó especificado un experimento prospectivo y su dimensionamiento preliminar. **No se atribuye causalidad a las campañas históricas**: Complete Journey registra hogares expuestos y canjes, pero la auditoría disponible no acredita una asignación aleatoria por segmento. No es posible crear un grupo de control retroactivamente.

La unidad de aleatorización y análisis será el hogar. La etiqueta de segmento se calcula con los 90 días anteriores al inicio y se congela durante el periodo de prueba. Una misma familia no puede estar en brazos distintos ni recibir campañas experimentales cruzadas.

## Diseño propuesto

Dentro de cada segmento, asignar hogares al azar y en proporción 1:1:1:

| Brazo | Experiencia durante 30 días |
|---|---|
| `holdout` | Sin contacto experimental adicional; mantener y registrar el tratamiento comercial habitual definido antes de iniciar |
| `generic` | Campaña estándar, igual para los dos segmentos |
| `tailored` | Oferta o mensaje adaptado al segmento conductual |

La comparación primaria es **tailored vs generic dentro de cada segmento**: mide si adaptar la campaña añade valor frente a enviar la campaña estándar. Los contrastes con `holdout` son secundarios y estiman el efecto de añadir contacto experimental frente a la actividad habitual. La asignación debe ser por intención de tratar y mantenerse fija durante los 30 días. Deben registrarse contactos concurrentes, exposición efectiva, bajas y fallas de entrega; no excluir del análisis a quienes no reciban el mensaje asignado.

- **Primario:** proporción de hogares asignados que canjean al menos un cupón en 30 días.
- **Secundarios:** ventas observadas por hogar a 30 días y repetición de compra a 60 días. En una operación real añadir margen y costo de campaña para medir contribución; Complete Journey no aporta esa economía completa.
- **Asignación:** aleatoria dentro de segmento; equilibrar además por respuesta previa y actividad si esos estratos quedan definidos antes del sorteo.
- **Análisis:** ITT por segmento; reportar tamaño, tasa por brazo, diferencia absoluta, intervalo y resultado ajustado por las dos comparaciones primarias.

## Dimensionamiento preliminar

Para planear la muestra se tomó la media simple de las tasas descriptivas de canje observadas en los tres cortes completos: **3.78 %** en el segmento de menor actividad y **16.23 %** en el de mayor actividad. Estas tasas incluyen observaciones hogar-campaña repetidas y campañas no aleatorizadas; son **proxies de planeación**, no tasas de control válidas.

Supuestos: prueba bilateral de dos proporciones, potencia 80 %, asignación igual, alfa 0.025 por comparación primaria para controlar dos segmentos mediante Bonferroni. El experimento tiene tres brazos; el cálculo dimensiona cada brazo para comparar tailored con generic y deja holdout del mismo tamaño.

| Mejora relativa mínima a detectar | Menor actividad: hogares por brazo | Mayor actividad: hogares por brazo | Total requerido con 3 brazos y 2 segmentos |
|---:|---:|---:|---:|
| 20 % | 13,267 | 2,646 | 47,739 |
| 30 % | 6,152 | 1,217 | 22,107 |
| 50 % | 2,397 | 466 | 8,589 |

En el corte de agosto hay 749 hogares de menor actividad y 1,568 de mayor actividad (2,317 en total). **Este dataset es demasiado pequeño para un test con potencia razonable en ambos segmentos**, incluso para detectar una mejora relativa del 50 % en el segmento menor. Para un experimento real se necesita una base mayor o una sola pregunta primaria con una población objetivo más amplia. No se deben reutilizar hogares de distintos cortes como si fueran personas independientes.

Con esa misma cohorte, una asignación balanceada daría alrededor de 249 hogares por brazo en menor actividad y 522 en mayor actividad. Bajo los mismos supuestos, el efecto mínimo detectable sería aproximadamente **+7.20 pp** en el segmento menor (de 3.78 % a 10.98 %, +191 % relativo) y **+7.63 pp** en el mayor (de 16.23 % a 23.86 %, +47 % relativo). Esto confirma que un ensayo con la fuente actual solo detectaría efectos muy grandes y, aun así, la asignación sería hipotética: no hay intervención comercial que podamos aplicar a estos hogares históricos.

## Contrato de datos para la ejecución

El padrón de entrada del aleatorizador usa `data/trial_eligible_households_template.csv` (una fila por hogar) y acepta opcionalmente `randomization_stratum`. El archivo de asignación resultante lleva un manifiesto con semilla, balance y hash. Una fila por hogar y experimento, con `household_id` seudonimizado, `segment`, `arm`, `assigned_at`, `outcome_window_end`, `outcome_complete=true`, `redeemed_30d` (0/1), `sales_30d` (incluye cero cuando no compra) y `randomization_confirmed=true`. Si existen, agregar `margin_30d`, costo de contacto, estrato de aleatorización, exposición entregada y eventos de contaminación. No guardar nombre, teléfono, correo ni otros identificadores directos en el archivo analítico.

Se dejaron `src/randomize_segment_campaign_trial.py` para crear la asignación reproducible a partir de un padrón elegible real, y `src/evaluate_segment_campaign_trial.py` para estimar diferencias ITT por segmento cuando existan datos experimentales. El script falla si faltan brazos, hay más de una fila por hogar, falta el resultado binario o no se confirma la aleatorización. Los valores p que reporte son sin ajustar; la corrección de multiplicidad debe predefinirse antes de analizar el experimento. **No se creó un CSV de resultados ni se simularon controles.**

## Archivos

- Dimensionamiento numérico: `reports/segment_campaign_experiment_power.json`, reproducible con `src/plan_segment_campaign_experiment.py`
- Plantilla del padrón elegible: `data/trial_eligible_households_template.csv`
- Aleatorizador reproducible con manifiesto y hash: `src/randomize_segment_campaign_trial.py`
- Análisis ITT preparado para datos reales: `src/evaluate_segment_campaign_trial.py`
- Evidencia descriptiva usada como proxy: `reports/behavior_segments_validation.json`

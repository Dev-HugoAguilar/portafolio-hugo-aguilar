# Validación de la segmentación conductual

## Resultado

Se validó una segmentación de hogares basada en conducta de compra previa al corte, usando las **1,469,307 transacciones completas** de Complete Journey. No se usaron demografía, asignación de campañas, canjes futuros ni información posterior para formar los grupos.

La unidad analítica es el hogar. Cada corte utiliza una ventana móvil fija de 90 días y solo incluye hogares con al menos una transacción en esa ventana. Los cortes son 1-jul-2017, 1-ago-2017 y 1-sep-2017. El vocabulario de departamentos se fijó con el primer periodo (10 departamentos más frecuentes y “otros”) y se mantuvo en los cortes posteriores.

## Variables y criterio de clustering

Se construyeron recencia, número de canastas y líneas, ventas, productos distintos, líneas por canasta, ventas por canasta, proporción de líneas con descuento de cupón, descuento minorista por línea y mezcla de departamentos. Las variables de volumen y ventas se transformaron con `log1p`; las continuas se winsorizaron a percentiles 0.5 y 99.5 para evitar que unos pocos registros extremos formen microsegmentos. Luego se estandarizaron.

Se comparó K-Means con `k=2…8`. La regla de selección excluye soluciones con algún grupo menor al 5 % de los hogares y, entre las restantes, elige el mayor *silhouette*. Los tres cortes seleccionaron `k=2`.

| Corte | Hogares | k elegido | Silhouette | Tamaños | ARI al retirar 20 % de hogares (media; rango) |
|---|---:|---:|---:|---:|---:|
| 1-jul-2017 | 2,300 | 2 | 0.258 | 759 / 1,541 | 0.975 (0.944–0.995) |
| 1-ago-2017 | 2,317 | 2 | 0.265 | 749 / 1,568 | 0.987 (0.970–0.996) |
| 1-sep-2017 | 2,311 | 2 | 0.262 | 739 / 1,572 | 0.978 (0.946–0.996) |

La restricción de tamaño importa: al permitir grupos diminutos, algunos valores de `k` separan unos pocos hogares en clusters de 11–14 personas o incluso menos. Aunque esos cortes pueden mejorar otra métrica, no son segmentos operables a esta escala.

## Perfiles observados

Los perfiles se mantienen muy parecidos en los tres cortes:

| Perfil conductual | Proporción aproximada | Canastas medianas en 90 días | Ventas medianas observadas | Productos distintos medianos | Recencia mediana |
|---|---:|---:|---:|---:|---:|
| Compra ocasional / menor actividad | 32 % | 4 | 67.50–70.78 | 20–21 | 14.4–17.1 días |
| Compra frecuente / mayor actividad | 68 % | 17 | 517.80–526.20 | 133–136 | 3.1–3.3 días |

Los nombres describen diferencias observadas en esta fuente; no representan tipos psicológicos ni causas de compra.

## Estabilidad: qué sí y qué no demuestra

Al retirar aleatoriamente 20 % de los hogares y volver a ajustar estandarización y K-Means, el ARI fue alto (0.975–0.987 de media). Esto indica que la división dentro de cada corte no depende mucho de unos cuantos hogares.

Al comparar asignaciones de `k=2` entre meses para los mismos hogares, el ARI fue **0.50–0.67** (2,221–2,265 hogares comunes). La pertenencia cambia con el periodo observado. Por eso esta solución funciona mejor como **segmentación conductual dinámica que se recalcula periódicamente**, no como etiqueta permanente del hogar. Las ventanas se solapan y no son réplicas independientes.

## Comprobación descriptiva con campañas futuras

Como chequeo externo posterior, se asignó cada hogar a su cluster usando solo los 90 días previos al corte y después se midieron canjes en campañas que empezaron tras ese corte. Se incluyeron únicamente campañas con fecha de término no posterior al último día con redenciones observadas (31-dic-2017), para reducir censura de resultados.

| Corte | Campañas completas | Menor actividad: canjes / pares | Mayor actividad: canjes / pares |
|---|---:|---:|---:|
| 1-jul-2017 | 8 | 11 / 200 (5.5 %) | 486 / 3,134 (15.5 %) |
| 1-ago-2017 | 6 | 10 / 201 (5.0 %) | 470 / 2,750 (17.1 %) |
| 1-sep-2017 | 5 | 1 / 117 (0.9 %) | 283 / 1,760 (16.1 %) |

La asociación descriptiva se repite, pero no prueba causalidad ni que enviar más campañas al grupo de mayor actividad incremente ventas. Los hogares aparecen en varias campañas y la asignación no se ha demostrado aleatoria. El menor número de respuestas en algunos cortes también hace inestable la tasa de ese segmento.

### Hipótesis de activación para probar

- **Mayor actividad:** probar contenido de descubrimiento o venta cruzada, evitando asumir que un descuento adicional es necesario para hogares que ya compran con frecuencia.
- **Menor actividad:** probar una acción de reactivación con un grupo de control; la tasa de canje inferior indica oportunidad por investigar, no prueba de que un cupón la resuelva.
- **Medición:** aleatorizar dentro de segmento entre control y variantes de campaña; comparar canje y ventas a un horizonte fijado antes del experimento. Sin costos y margen, reportar ventas/canjes incrementales y no ROI.

## Dictamen y siguiente uso

**La segmentación sí es viable como componente del proyecto de ciencia de datos.** Con estos datos, el hallazgo defendible es una división entre hogares de menor y mayor actividad, reproducible dentro de cada ventana y útil para explorar estrategias diferenciadas. La pertenencia temporal moderada implica recalcularla, no tratarla como perfil fijo.

Para demostrar valor comercial, el siguiente experimento debe evaluar acciones por segmento con asignación controlada —por ejemplo, campaña habitual frente a una estrategia adaptada— y medir canje y ventas posteriores. Esta base no aporta costes de campaña ni margen, por lo que no permite afirmar ROI o incremento de utilidad.

## Reproducibilidad

- Código: `src/validate_behavior_segments.py`
- Resultados detallados, incluidos candidatos `k`, tamaños, perfiles, ARI y canjes: `reports/behavior_segments_validation.json`
- Ejecutar: `python marketing_customer_project/src/validate_behavior_segments.py`

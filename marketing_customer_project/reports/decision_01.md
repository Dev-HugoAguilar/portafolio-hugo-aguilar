# Decisión 01 — alcance viable con Complete Journey

## Decisión

Continuar con un producto de portafolio llamado **Customer Growth Intelligence**. El primer módulo será **segmentación conductual + propensión a canje de campaña**. El proyecto completo puede crecer hacia medición causal, retención, valor futuro y recomendación, pero esas funciones deben apoyarse en fuentes y objetivos distintos.

No usar una tabla maestra que mezcle Complete Journey, Criteo y otros conjuntos. Sus hogares, campañas, periodos y etiquetas no representan las mismas entidades. La plataforma puede compartir procesos y métricas, pero cada benchmark conserva su universo y resultados.

## Auditoría ampliada del histórico

Se obtuvo el archivo completo público `transactions.rds` del repositorio del paquete `completejourney` y se verificó su contenido:

- 1,469,307 líneas de transacción, 0 celdas nulas y 0 filas idénticas duplicadas.
- 2,469 hogares, 155,848 canastas, 68,509 productos, 457 tiendas, 53 semanas.
- Cobertura de fechas: 1 ene 2017 a 1 ene 2018.
- El catálogo aporta metadatos de departamento a 99.7 % de las líneas del periodo de perfilamiento anterior al corte (2017-08-01).
- Demografía para 801 de 2,469 hogares (32.4 %); no es una base demográfica completa.
- Asignaciones: 6,589 pares hogar-campaña en 27 campañas. La tabla de redenciones tiene 2,102 filas, pero 792 pares únicos hogar-campaña con al menos un canje. Por ello la tasa de respuesta por par expuesto es 12.0 %, no 2,102 respuestas independientes.

El RDS se conserva fuera del paquete de código. Huella SHA-256 y metadatos en `data_manifest.json`.

## Prueba 1: segmentación conductual

Variables calculadas antes del 1 ago 2017: canastas, líneas compradas, gasto observado, diversidad de productos, recencia, uso de descuentos y mezcla de departamentos. La segmentación usa comportamiento, no demografía, para cubrir también a hogares sin perfil demográfico.

Entre `k=2..8`, `k=2` obtuvo el mayor silhouette observado (0.268); se elige como exploración interpretable, no como óptimo universal. Los dos grupos identificados:

| Segmento exploratorio | Hogares | Mediana de canastas | Mediana de ventas observadas | Mediana de recencia |
|---|---:|---:|---:|---:|
| Compra frecuente y reciente | 1,680 | 37.5 | 1,106.72 | 3.2 días |
| Actividad menor y más espaciada | 734 | 7.0 | 144.37 | 23.2 días |

En las 11 campañas posteriores al corte, la respuesta observada fue 510/3,665 (13.9 %) para el primer grupo y 3/74 (4.1 %) para el segundo. El segundo denominador es pequeño. Es una asociación descriptiva útil para definir preguntas de negocio, no un efecto causado por pertenecer al segmento.

## Prueba 2: propensión a canje

Unidad de observación: un hogar asignado a una campaña. Etiqueta positiva: el hogar canjeó uno o más cupones vinculados a esa campaña durante su vigencia. Una sola etiqueta por par, aunque tenga varias redenciones.

Las variables se construyen con compras de los 90 días anteriores al inicio de cada campaña, exposiciones previas y canjes ya ocurridos. **Actualización metodológica:** la primera evaluación admitía campañas de entrenamiento que ya habían empezado pero seguían abiertas en la fecha de corte. Sus cifras se conservan en `response_propensity.json` como exploración, no como evidencia principal. La evaluación corregida requiere que cada campaña de entrenamiento haya cerrado antes del corte; las campañas abiertas se excluyen. Se puntúan campañas completas posteriores y se separan hogares conocidos y nuevos.

| Corte | Entrenamiento (pares / campañas / respuestas) | Prueba (pares / campañas) | AP total | AP con exposición previa en entrenamiento | AP sin exposición en entrenamiento | Lift del decil superior sin exposición previa |
|---|---:|---:|---:|---:|---:|---:|
| 1 jun 2017 | 1,091 / 11 / 74 | 4,246 / 14 | 0.341 | 0.379 | 0.275 | 3.03× |
| 1 ago 2017 | 2,466 / 14 / 262 | 3,739 / 11 | 0.402 | 0.419 | 0.241 | 3.01× |
| 1 oct 2017 | 3,927 / 17 / 475 | 2,421 / 8 | 0.385 | 0.399 | 0.283 | 2.42× |

El AP total supera al baseline de tasa por tipo de campaña (0.172–0.177). En hogares sin exposición en entrenamiento el AP va de 0.241 a 0.283, con muestras que bajan a 213 pares en octubre. Estos hogares pueden tener historial transaccional: no es una prueba de clientes nuevos. Las tasas de respuesta del decil superior son señales de priorización retrospectiva, no de incremento causado por contactarles. Los cortes se traslapan y no son réplicas independientes; solo hay 27 campañas. El JSON `robust_propensity_validation.json` guarda métricas completas y campañas excluidas por seguir activas al corte.

## Interpretación y límites comerciales

- El modelo estima **quién tiene mayor probabilidad de canjear**, dadas campañas que recibió. No demuestra quién canjeó por causa de la campaña.
- El decil superior concentra más respuestas observadas; no implica que contactar ese decil genere ventas incrementales o mayor utilidad.
- No hay asignación aleatoria/control verificado, costos completos de campaña ni márgenes. No reportar uplift causal, ROI ni valor de cliente rentable.
- El gasto es ventas observadas. Si se modela a futuro, el nombre correcto será valor de compra o ingreso futuro observado, no CLV de beneficio.
- El abandono no viene etiquetado; se podrá definir como inactividad durante una ventana operativa y probar varias ventanas, declarando que es un proxy.
- La recomendación necesita evaluación de siguiente compra en fecha posterior; no se ha ejecutado aún.
- La fuente es histórica, de retail en Estados Unidos. El resultado no es evidencia del mercado mexicano.

## Siguiente etapa

1. Congelar una especificación de negocio para el puntaje: objetivo de priorización de respuesta y política de contacto.
2. Cuantificar incertidumbre agrupando por campaña, calibrar probabilidades y examinar campañas con pocas exposiciones antes de presentar el puntaje como herramienta de decisión.
3. Validar estabilidad de segmentos con diferentes fechas de corte y perfiles; no publicar personas arquetípicas como si fueran hechos causales.
4. Incorporar Criteo como benchmark causal separado para uplift.
5. Incorporar un segundo conjunto transaccional internacional para retención/compra repetida y recomendación, conservando la separación de poblaciones.

## Reproducibilidad

- `src/response_propensity.py`: construcción ex ante de variables y evaluación temporal.
- `src/robust_propensity_validation.py`: evaluación temporal estricta con campañas cerradas y resultados separados por presencia de exposiciones en entrenamiento.
- `src/behavior_segments.py`: K-Means, selección exploratoria de k, perfiles y cruce descriptivo con campañas futuras.
- `reports/response_propensity.json`: resultado del corte 2017-08-01.
- `reports/robust_propensity_validation.json`: evaluación corregida y desglose de hogares/campañas.
- `reports/temporal_sensitivity.json`: tres puntos de corte.
- `reports/behavior_segments.json`: perfiles y tasas posteriores.
- `reports/data_manifest.json`: fuente, cobertura, huella y calidad del archivo completo.

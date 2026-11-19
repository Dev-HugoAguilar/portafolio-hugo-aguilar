# Clientes y campañas — Customer Growth Intelligence

Proyecto de portafolio integrado en la pestaña «Ciencia de datos y Machine Learning», junto a
Walmart M5. Nombre visible en el portafolio: **«Clientes y campañas»**, con el subtítulo
«Segmentación conductual, propensión de respuesta e incrementalidad publicitaria».

Unidad de Complete Journey: **hogar comprador**. Los otros dos módulos (Criteo y experimentación)
son evidencia separada: no comparten hogares, segmentos, campañas ni identificadores.

## Ruta y navegación

- Ficha: `#/area/ciencia-de-datos/clientes-campanas` (tarjeta con imagen real del tablero).
- Secciones del tablero: `Proyecto`, `Perfiles`, `Evolución`, `Campañas`, `Incrementalidad`,
  `Experimento`. La pestaña activa se refleja en la URL del portafolio como `?vista=perfiles`, de
  modo que recargar y compartir la reproducen; los filtros de cada bloque están inmediatamente
  encima de lo que afectan.

## Presentación: rediseño integrado

El tablero es hoy una **página autónoma** servida en
`dist/dashboards/clientes-campanas/index.html` y montada dentro de la ficha por
`dist/projects/clientes-campanas.js` (marco del mismo origen con altura ajustada al contenido,
igual que «Clientes en movimiento»). Sustituyó a la presentación anterior, que se compilaba con
React/TypeScript/Vite a `app.js`; ese bundle ya no existe.

- Código editable: `dashboards/clientes-campanas/integrado/src/` (recibido del rediseño, sin
  ediciones).
- Datos: los artefactos JSON de siempre. `integrado/tools/construir.py` los vuelve a tabular y
  compara cada tabla **byte a byte** con las 23 tablas de referencia de `integrado/paridad/` antes
  de generar el HTML; el resultado es idéntico (SHA-256) al artefacto de referencia de la entrega.
- El diálogo «Ampliar» se reposiciona desde el módulo del portafolio, porque dentro de un marco
  alto `position: fixed` se resuelve contra la caja del marco y quedaría fuera de la ventana.
- La tarjeta del área usa la misma geometría que la de Walmart M5: portada de **1600 × 1726 px**
  (`capturaRatio: '1600 / 1726'`, `capturaAjuste: 'tablero'`) y la clase compartida
  `.cover-tablero` con `object-fit: cover` y `object-position: top center`. Las tres tarjetas de
  Ciencia de datos miden lo mismo a igual ancho de columna.

## Los tres módulos

| Módulo | Fuente | Qué responde | Qué no es |
| --- | --- | --- | --- |
| Complete Journey | 84.51° (paquete R `completejourney`): 1 469 307 líneas, 2 469 hogares, 2017-01-01 – 2018-01-01 | Cómo se comportan los hogares por corte, cómo migran entre segmentos y quién responde a una campaña | No mide incrementalidad: no hay asignación aleatoria ni grupo de control |
| Criteo | Criteo Uplift Prediction Dataset v2.1 (muestra de 500 000 filas + benchmark completo del paquete) | Qué modelo ordena mejor el uplift cuando sí hay aleatorización | No describe a los hogares de Complete Journey |
| Experimentación | Diseño propio derivado de las tasas descriptivas | Cuántos hogares haría falta para detectar un efecto | No hay campaña ejecutada ni resultados de campo |

## Artefactos y exportador

`marketing_customer_project/src/export_dashboard_artifacts.py` recalcula y exporta los JSON que
consume la interfaz (no se entrena nada al navegar):

| Archivo | Contenido |
| --- | --- |
| `manifiesto.json` | proyecto, versión, fecha, cortes, ventana, parámetros, fuentes, artefactos y correcciones |
| `perfiles.json` | por corte: candidatos k, segmentos con medianas y mezcla de departamentos, cuantiles del universo, muestra visual del beeswarm y asignaciones por hogar |
| `evolucion.json` | transiciones entre cortes consecutivos, entradas/salidas, permanencia y ARI |
| `campanas.json` | por corte: entrenamiento/prueba, métricas por grupo de exposición, calibración por decil, curva de targeting y campañas |
| `incrementalidad.json` | carreras del benchmark completo por modelo y semilla, rangos entre semillas, curvas desde predicciones fuera de muestra y límites |
| `experimento.json` | diseño, supuestos, escenarios de potencia recalculados, capacidad actual y correcciones de las plantillas |

Comandos (desde la raíz del repositorio):

```bash
# Exportar los artefactos (lee los insumos y la muestra Criteo; tarda ~2 min)
python marketing_customer_project/src/export_dashboard_artifacts.py

# Pruebas de invariantes y de las plantillas
python -m unittest discover -s marketing_customer_project/tests

# Construir el tablero (verifica paridad con las tablas de referencia)
python dashboards/clientes-campanas/integrado/tools/construir.py

# Verificación sin navegador: paridad, invariantes y estado del sitio
python dashboards/clientes-campanas/integrado/tools/verificar.py

# Verificación en el sitio servido (127.0.0.1:8000) y portada de la tarjeta
cd dashboards/clientes-campanas
node integrado/tools/verificar-servido.mjs
node integrado/tools/capturar-portadas.mjs   # también regenera la de «Clientes en movimiento»
```

Dependencias: Python 3.12 con `pandas`, `numpy`, `scikit-learn`, `scipy` y `pyreadr`
(esta última solo para leer `transactions_full.rds`). El tablero es JavaScript y SVG generado a
mano sobre CSS propio; Playwright solo se usa para verificar y capturar.

## Datos y cortes

Cortes de segmentación: **1 jul, 1 ago y 1 sep de 2017**, ventana móvil de 90 días estrictamente
anterior al corte. Cortes de propensión: **1 jun, 1 ago y 1 oct de 2017**, con holdout temporal hacia
adelante (entrenamiento solo con campañas cerradas antes del corte; las campañas en vuelo se
excluyen de ambos lados).

## Correcciones metodológicas aplicadas

Auditoría previa a publicar. Cada punto se corrigió en el exportador o en los scripts, y se regeneró
lo afectado:

1. **Mezcla de departamentos sin identidad.** `behavior_segments.py` renombraba las columnas a
   `department_share_0..9`, perdiendo el departamento. Ahora se conserva el nombre (GROCERY, HBC,
   …) con su soporte (hogares con compra) y el universo como referencia.
2. **Selección de k inconsistente.** El script base elegía el máximo silhouette (que podía dejar
   segmentos por debajo del 5 %); la validación usaba la regla del 5 %. El tablero aplica la regla
   del 5 % y publica el tamaño mínimo de cada candidato k.
3. **Etiquetas de K-Means arbitrarias.** El identificador del cluster no es comparable entre cortes.
   Las etiquetas se alinean por mediana de gasto y el mapeo crudo → alineado se exporta y se declara.
4. **Transiciones reconstruidas desde el ARI.** El alluvial, la permanencia y las entradas/salidas se
   calculan desde las asignaciones por hogar exportadas; el ARI queda como medida de coincidencia de
   particiones, no como fuente de flujos.
5. **Curvas sin predicciones.** Las curvas de targeting y calibración salen de las predicciones fuera
   de muestra del holdout temporal; no se reconstruyen desde AUUC ni desde el top 10 %.
6. **Rangos entre semillas como intervalos.** Los rangos de Criteo se publican con la etiqueta
   explícita de que no son intervalos de confianza (los conjuntos de prueba se traslapan). Las curvas
   de uplift de la muestra se identifican como muestra, separadas del benchmark completo.
7. **Aleatorizador que afirmaba aleatorización.** `randomize_segment_campaign_trial.py` escribía
   `randomization_confirmed = True` por sí solo. Ahora lo deja vacío, añade el sha256 del manifiesto,
   el patrón por estrato y el desequilibrio máximo, y exige evidencia externa.
8. **Analizador ITT sin verificación de asignación.** `evaluate_segment_campaign_trial.py` exigía el
   manifiesto (`--manifest`), verifica que el sha256 coincida con la asignación recibida, comprueba la
   ventana de resultado completa, añade equilibrio por estrato y aplica **corrección de Holm** a las
   dos comparaciones primarias; el resto se marca como secundario.
9. **Potencia no reproducible.** El cálculo del tablero usa la misma fórmula que el informe (varianza
   agrupada, aproximación normal); la prueba comprueba que los totales recalculados coinciden
   exactamente con los publicados (47 739 / 22 107 / 8 589 hogares).

## Resultados publicados (resumen)

- Dos segmentos en los tres cortes (721–748 y 1 560–1 590 hogares), con el grupo de mayor actividad
  en torno al 68 % del universo y un gasto mediano de 509–519 USD frente a 67–71 USD.
- Permanencia entre cortes del 90,2 % y 91,1 % (ARI 0,64 y 0,67): el segmento es dinámico.
- Propensión: Average Precision 0,379–0,414 con lift del decil superior ≈ ×3,6–3,9 sobre la tasa base;
  el grupo sin exposición previa rinde menos. La calibración no permite leer el puntaje como
  probabilidad.
- Criteo: los tres modelos superan al ranking aleatorio en visitas y conversiones, con diferencias
  pequeñas y sin prueba de superioridad; la propensión de respuesta destaca levemente en conversión.
- Potencia: detectar 30 % de mejora relativa exige 22 107 hogares en tres brazos; el cohorte actual
  tiene 2 317 y no alcanza. El experimento **no se ejecutó**.

## Visualizaciones

1. Relieve de concentración (canastas × gasto) con vista plana y detalle por celda.
2. Distribuciones de hogares por perfil, con percentiles publicados separados de la muestra.
3. Coordenadas paralelas (recencia, frecuencia, gasto, diversidad, descuentos) en unidades
   originales, con escala logarítmica opcional, selección por rangos y ficha del hogar.
4. Rangos de cuantiles (P10–P90 y P25–P75) por variable y perfil.
5. Afinidad por departamento como comparación conectada entre los dos perfiles.
6. Alluvial de transiciones entre cortes y mosaico exacto de un punto por hogar común, con
   selección vinculada entre ambas lecturas.
7. Curva de targeting (captura acumulada y tasa entre seleccionados en paneles separados) con
   deslizador de capacidad, y calibración por decil con brecha y detalle.
8. Calendario de campañas y ficha de la campaña seleccionada.
9. Bandas del ranking (respuesta marginal por tramo del 1 %) y trayectorias de deciles de
   calibración entre los tres cortes.
10. Recorridos de AUUC entre semillas, curvas de ganancia acumulada absolutas o como diferencia
    frente al ranking aleatorio, y rangos de la muestra.
11. Escenarios publicados de potencia, capacidad por perfil y simulador con potencia y α editables.

Cada bloque conserva alternativa tabular, unidades y denominadores en las etiquetas, tooltips con
cifras, descarga CSV donde aplica, ampliación de la gráfica y navegación por teclado con foco
visible. Los 41 bloques del inventario auditado están mapeados a un destino del tablero
(`integrado/paridad/cobertura_redisenada.json`) y `verificar-servido.mjs` comprueba que cada
destino exista en su vista.

## Limitaciones y pendientes

- El canje observado no es uplift causal; no hay asignación aleatoria en Complete Journey.
- El puntaje ordena, no estima probabilidad exacta, ingresos, margen ni ROI; no hay costos completos
  de campaña.
- Las ventanas de prueba de los tres cortes se traslapan: no son réplicas independientes.
- El grupo «sin exposición previa» no es un arranque en frío estricto (puede tener historial de
  compras).
- La demografía está disponible para el 32 % del universo y no se imputa.
- Criteo es otro retailer, otro país y otro año; sus efectos no se transfieren a estos segmentos.
- La experimentación es diseño: sin padrón elegible real ni campaña ejecutada no hay ITT.
- Abandono, recomendación y valor futuro no están implementados.
- El tablero se sirve con artefactos estáticos: para actualizar cifras hay que volver a ejecutar el
  exportador y reconstruir (`construir.py`), que vuelve a comprobar la paridad antes de publicar.
- Este paquete solo trae detalle individual completo de septiembre. Los indicadores de julio se
  conservan como referencia; no se simulan hogares de otros cortes. El repositorio sí guarda los
  hogares de julio y agosto en `perfiles.json`, pero habilitar su exploración exigiría validar su
  contrato y sus resultados, y queda fuera de este cambio.
- El tablero va dentro de un marco con altura automática: los tooltips se sitúan bien respecto del
  cursor, pero su recorte contra el borde inferior usa la altura del marco, no la de la ventana.
- Los estados de hover no se verifican de forma automática; se comprueban por teclado (Enter sobre
  un flujo) y revisando los `title` de los elementos.

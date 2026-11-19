# Customer Growth Intelligence

Proyecto de ciencia de datos para segmentar hogares compradores, priorizar campañas y evaluar incrementalidad.

## Pregunta comercial
¿Cómo identificar comportamientos de compra, priorizar hogares para campañas y distinguir respuesta probable de respuesta incremental?

## Un proyecto, tres módulos de evidencia
1. **Clientes y campañas — Complete Journey:** transacciones → perfiles de compra → clustering dinámico → propensión a canje → evaluación temporal. Es el núcleo del producto.
2. **Incrementalidad — Criteo:** benchmark independiente de S/T-learners contra propensión y ranking aleatorio. Comparte metodología de decisión con el núcleo, pero no comparte hogares, segmentos, campañas ni identificadores. No se unen sus filas ni se atribuyen sus efectos a los segmentos de Complete Journey.
3. **Experimentación prospectiva:** protocolo, potencia, aleatorizador y analizador ITT. Es diseño preparado, no campaña ejecutada.

## Resultados disponibles
- Complete Journey: 1,469,307 líneas de transacción; perfiles móviles de 90 días; dos segmentos seleccionados en julio, agosto y septiembre.
- Silhouette 0.258–0.265; estabilidad por submuestras ARI 0.975–0.987; estabilidad temporal ARI 0.50–0.67. Segmentos dinámicos, principalmente de actividad de compra.
- Propensión: evaluación cronológica en tres cortes; AP total 0.341–0.402. La calibración es insuficiente para interpretar cada puntuación como probabilidad precisa.
- Criteo: 13,979,592 observaciones fuente; alrededor de 1.1 M para ajuste y 2.8 M para evaluación por semilla, tres semillas. La propensión supera por poco a S/T en conversión; T destaca en visita. No se ha probado superioridad estadística entre candidatos.
- Campaña prospectiva: diseño con tres brazos; aproximadamente 22,107 hogares para detectar 30 % de mejora relativa bajo las hipótesis del cálculo. No hay experimento comercial ejecutado.

## Recorrido del tablero
1. Resumen comercial: fuente, corte, universo y decisiones que permite cada resultado.
2. Perfiles: tamaño, intensidad, recencia, mezcla de categorías y distribuciones.
3. Evolución: migración de hogares entre segmentos, entradas/salidas y estabilidad.
4. Campañas: canjes observados, ranking de propensión y calibración por corte.
5. Incrementalidad: contexto Criteo explícito, comparadores y sensibilidad por semilla.
6. Experimento: diseño, muestra necesaria y estado pendiente de ejecución.

Los filtros de cada bloque se ubican inmediatamente sobre las visualizaciones que afectan. No debe existir un filtro de segmento de Complete Journey que aparentemente filtre Criteo.

## Selección visual investigada
Fuente de inspiración: https://www.dataviz-inspiration.com/ y su catálogo indexado. Se identificaron familias y proyectos de referencia; esta investigación no constituye una revisión visual exhaustiva de todas las piezas ni una implementación del tablero.

| Visualización propuesta | Referencia localizada en la galería | Resultado que mostraría | Estado del dato necesario |
|---|---|---|---|
| Coordenadas paralelas con selección de hogares | Bruxelles Malade — parallel coordinates | Recencia, frecuencia, gasto y descuentos; contraste entre perfiles | Hay transacciones; falta exportar matriz individual y asignaciones |
| Alluvial/Sankey temporal con transiciones seleccionables | The World Mental Health Survey — sankey; colección /sankey | Hogares que permanecen o cambian de segmento por corte | ARI disponible; faltan tablas de transiciones. No se pueden reconstruir flujos desde ARI |
| Beeswarm con caja y mediana superpuestas | How much sleep do you really need? — beeswarm, Reuters Graphics | Dispersión real de gasto, canastas y recencia dentro de cada grupo | Medianas disponibles; falta exportar distribuciones individuales |
| Matriz de calor por segmento y departamento | The World Mental Health Survey — heatmap | Afinidades de categorías respecto al universo y soporte | Variables se calculan; falta agregado publicable por segmento |
| Pequeños múltiplos por corte | The World Mental Health Survey — small multiples | Evolución de tamaños, calidad y respuesta descriptiva | Puede construirse con JSON existentes |
| Gráfico de puntos e intervalos por modelo y semilla | Mortality and mental disorders — dot plot | AUUC y diferencias entre modelos sin ocultar variación | JSON Criteo disponibles; rango entre semillas no equivale a IC |
| Curva acumulada de targeting y curva de uplift | Propuesta propia para el problema | Respuestas capturadas según porcentaje contactado; uplift frente al azar | Faltan predicciones por fila/curvas exportadas; AUUC y top10 no reconstruyen la curva |
| Frontera de potencia interactiva | Propuesta propia para el problema | Hogares disponibles, efecto mínimo detectable y muestra requerida | Calculador y escenarios disponibles; simulación de diseño claramente identificada |

## Prioridad y criterios de diseño
La combinación principal será **alluvial temporal + coordenadas paralelas + beeswarm**, acompañada por gráficos de evaluación más sencillos. Estas vistas añaden exploración de perfiles, cambios y heterogeneidad; una proyección 2D decorativa no demuestra separación real.

Usar un color estable por perfil conductual (la etiqueta debe alinearse entre cortes, no depender del número arbitrario del cluster). Líneas y puntos seleccionados deben mantener el mismo hogar en todas las vistas. En el alluvial, incluir explícitamente entradas/salidas del universo y comparar únicamente hogares identificables en ambos cortes. En la matriz, mostrar denominadores y evitar que categorías raras aparenten grandes oportunidades por pocos casos.

No dibujar intervalos con rangos entre semillas. No presentar tasas de canje históricas como efecto incremental. No usar Sankey entre Complete Journey y Criteo. Las vistas deben tener alternativa tabular, navegación por teclado, escalas explícitas y explicación breve de unidades.

## Qué está construido y qué falta
Código analítico, reportes y protocolo agrupados en este paquete. La interfaz interactiva y las exportaciones por hogar necesarias para las vistas avanzadas están pendientes. Recomendación, abandono y valor futuro siguen como extensiones; no se presentan como modelos ya terminados.

## Contenido del paquete
- marketing_customer_project/: código, resultados, documentación y muestras Criteo.
- marketing_customer_audit/exports/: insumos Complete Journey.
- marketing_customer_audit/raw/transactions_full.rds: transacciones completas.
- El archivo completo Criteo de 311 MB no está duplicado en este ZIP; el script de auditoría y su documentación permiten recuperarlo. Se incluyen muestra y resultados, con atribución y condiciones en data/README-CRITEO.md.

Consultar README.md para dependencias y comandos. Los scripts prospectivos requieren un padrón real y resultados posteriores; el ZIP no contiene una campaña ejecutada.

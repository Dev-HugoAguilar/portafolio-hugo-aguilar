# Auditoría de producto · Perspectiva de dirección de retail

Evaluación de DockMind como demo de planificación, no como plataforma utilizada por Amazon. Fecha: 16 noviembre 2026.

## Juicio
La versión anterior reunía análisis sin separar decisiones, y hacía difícil distinguir entre cifras globales, filtros de catálogo y SKU seleccionado. Los modelos aportan evidencia, pero el valor para dirección depende de convertirla en acciones revisables y mostrar sus límites.

## Correcciones aplicadas
| Problema | Corrección | Efecto |
|---|---|---|
| Todos los módulos en un documento largo | Cinco tabs que muestran un solo panel, con roles accesibles y navegación por teclado | Una pantalla por tarea, sin perder producto ni escenario |
| Enlaces disfrazados de tabs | Botones reales Resumen/Demanda/Inventario/Compras/Modelos; hash de vista | Estado activo consistente con el contenido |
| Estilos de controles distintos | Rail gris azulado, activo slate #364154, acción índigo #4c57ff; naranja para exposición, lavanda para comparación, teal para recepción/aprobación | Concordancia con el portafolio |
| No había una prioridad comercial clara | Ranking lollipop de ocho SKU por ingreso bruto potencial sin cubrir | Seleccionar abre el balance de inventario del SKU |
| KPIs globales confundidos con catálogo filtrado | Alcance explícito en encabezado, catálogo y panel; benchmark público oculta controles operativos y KPIs de inventario | Evita sumar o mezclar USD, MXN y unidades |
| Comparación del modelo poco visible | Referencia estacional opcional en el pronóstico, mismo efecto supuesto de promoción | Se puede contrastar el pronóstico sin abandonar Demanda |
| Pedidos que llegan después de semana 12 | Se impide emitir compras con recepción fuera del horizonte | El presupuesto deja de consumirse en compras sin efecto dentro del plan |
| Aproximación de demanda como semana siguiente × plazo | Se suman los pronósticos semanales disponibles dentro de plazo+revisión, con horizonte explícito | El cálculo incorpora el perfil futuro, sin inventar semanas adicionales |
| Aprobación accesible en cualquier vista | Solo en Compras, con recibo local y persistencia al navegar | La acción se presenta al revisar su evidencia |
| Gráfica de políticas sin localizar el plan | Se resalta el plan actual con anillo y etiqueta | Facilita comparar el punto elegido |
| Texto de gráficas ilegible al reducir todo en móvil | Scroll local en gráficas densas | Mantiene tamaño mínimo del texto sin desbordar la página completa |

## Pantallas
- Resumen: KPIs globales, salud del plan, catálogo, explicación y ranking de exposición.
- Demanda: resumen del SKU, histórico/pronóstico/banda/referencia y segmentación ABC por variabilidad.
- Inventario: balance de SKU, matriz de cobertura y recepciones conceptuales por categoría.
- Compras: cálculo y cascada, primeras órdenes, comparación de políticas, tabla exportable y estrés del plan fijo.
- Modelos: comparación en datos sintéticos o benchmark histórico público y método.

## Inspiración visual consultada
https://www.dataviz-inspiration.com/lollipop
https://www.dataviz-inspiration.com/heatmap
https://www.dataviz-inspiration.com/boxplot
Se reutilizan familias de lectura: ranking lollipop, matriz, cajas de errores, cascada y distribución. Implementación propia, no copia de los ejemplos.

## Límites que siguen abiertos
1. La operación sigue usando productos, costos, existencias y canales sintéticos. El histórico público solo evalúa pronóstico por tienda.
2. Reposición por regla con presupuesto, no optimización global ni una recomendación comercial validada. No prioriza por margen neto, penalización contractual o retorno causal.
3. Ingreso expuesto es ventas no cubiertas × precio supuesto; no es pérdida contable, margen ni ingreso recuperable garantizado.
4. No hay caducidad, capacidad física, comisiones, devoluciones, restricciones de proveedor o inventario compartido multicanal reales.
5. Los escenarios de promoción y lead time son supuestos; Monte Carlo independiente no modela contagios entre SKU/proveedores.
6. Inspección visual desktop completada en navegador real. No se ha probado la vista móvil en un dispositivo real ni se certifica accesibilidad WCAG integral.

## Verificación ejecutada
Una sola pantalla visible, cinco tabs, selección, flechas de teclado, persistencia de SKU/escenario, navegación desde ranking, recibo de aprobación, aislamiento del benchmark USD y comparación del pronóstico. Balance de stock/demanda, presupuesto, empaque, lead time y recepción dentro de horizonte en 12 combinaciones.

## Segunda ronda de auditoría · correcciones adicionales

### Hallazgos materiales
- **Plazo contado desde un cierre de semana:** emisión al cierre de S1 y plazo de dos semanas completas implica recepción al inicio de S4, no S3. Se corrigió el motor y el calendario.
- **Sobrecompra por ventas perdidas:** sumar demanda durante todo el plazo y descontar stock suponía implícitamente que las ventas perdidas seguían pendientes. Ahora se proyecta el inventario hasta el inicio de recepción, con llegadas y ventas posibles, y se compra una semana de demanda desde esa fecha más colchón. No se reponen ventas ya perdidas. Caso de regresión: 100 unidades semanales, stock cero, plazo 2, sin colchón; primera compra 100, no 300; llegan S4 y las primeras 300 unidades siguen como ventas perdidas.
- **Presupuesto inicial sin contexto:** 3 millones frente a una referencia material neta de 16,086,357 MXN hacía que el estado base fuese una restricción de capital extrema. Se muestra la referencia y se inicializa en 16.1 millones, ajustable. No se cambiaron las ventas históricas ni el modelo para mejorar resultados. El servicio base observado es 86.7%; quedan faltantes por fechas y supuestos operativos. La referencia no incluye empaques/colchones ni garantiza servicio.

### Legibilidad e interacción
- Más contraste en números de la matriz de modelos y cobertura; letras pequeñas de las gráficas aumentadas. Se conserva la gama índigo/lavanda/naranja/teal del portafolio.
- Tabla consultable de doce pronósticos y límites, más etiquetas accesibles en puntos.
- Año histórico relativo corregido un índice; la referencia estacional aplica el mismo incremento de promoción y entra en el rango vertical.
- Matriz vacía informa qué filtro ajustar; Inventario/Compras muestran el alcance y si el SKU seleccionado está fuera del filtro.
- S12 de cobertura declara que usa demanda S12 de referencia, sin inventar S13.
- Calendario muestra «Sin nueva compra» y el catálogo distingue llegada de compra nueva del tránsito existente.
- Navegación permanece visible al desplazarse; hash inválido recupera Resumen, sin dejar todas las pantallas ocultas.
- Aprobación se invalida al cambiar el plan y se deshabilita si no hay órdenes.

### Evidencia ejecutada
36 combinaciones (retraso, promoción, presupuesto y política): reconciliación de existencias/demanda, presupuesto, empaque, recepción y horizonte. Caso específico de no sobrecomprar ventas perdidas. Pruebas DOM de carga, cinco pantallas exclusivas, teclado, hash inválido, filtros vacíos, selección, benchmark, tabla de pronóstico, recibo e invalidación.
En navegador real: revisión visual de Resumen, Demanda, Compras, matriz de Inventario y Modelos; selección de SKU y choque combinado; benchmark público; verificación de una sola pantalla visible, sin geometrías SVG NaN/Infinity y sin desbordamiento global a 1348 px. No se declara una prueba móvil real.

### Evaluación para dirección
La demo ahora explica la decisión, los límites temporales y la evidencia del modelo. Sigue siendo una demostración de planificación, con inventario simulado y heurística, no una operación validada ni un producto a escala Amazon. El siguiente salto material requiere datos de demanda y disponibilidad reales, costos y lead times por proveedor y comparación económica contra una política vigente.

## Tercera ronda · rediseño operativo aplicado

- Retirado el plano conceptual y sus andenes sin capacidad medida. Sustituido por calendario de seis categorías × doce semanas, barras de volumen semanal y detalle de cada celda.
- El calendario integra tránsito comprometido y compras propuestas, distinguiendo origen y fecha. Cada una de las 72 celdas reconcilia con su detalle y el total concilia con ambas fuentes. No se interpreta volumen mixto como capacidad física.
- Corregida la herencia de `stroke` sobre grupos SVG que engrosaba letras en hover; textos y cifras de recepciones son HTML con tamaño estable.
- Cobertura completa del catálogo filtrado (576 celdas para 48 SKU), ordenada por primera ruptura y con scroll local, sin ocultar silenciosamente productos después del duodécimo.
- Bandeja de cinco excepciones por ingreso expuesto, con faltantes antes/después, primera orden y navegación al pronóstico o compra del mismo SKU.
- Pequeños múltiplos del catálogo: doce semanas históricas y doce futuras, escala común explícita, WAPE frente a referencia y selección del pronóstico detallado.
- Comparación de políticas: alternativas dominadas atenuadas. Dominancia se refiere exclusivamente a las alternativas evaluadas, importe de compra y servicio; no demuestra óptimo económico global.
- Se mantienen los modelos Python entrenados, selección temporal, bandas evaluadas y cinco pestañas. No se añadió LLM, Web Worker ni persistencia Atlas en esta ronda; el prototipo sigue siendo autocontenido. Son ampliaciones de arquitectura, no capacidades que se atribuyan a esta entrega.

### Referencias de diseño consultadas
Data Viz Inspiration, colección Heatmap: https://www.dataviz-inspiration.com/heatmap . Referencias identificadas: Plastic waste — calendar heatmap, Datylon — skill matrix e Inflation in America: Where are prices rising and falling? Se adopta la organización temporal y matricial; código propio. Los pequeños múltiplos se implementan como comparación en escala común, sin atribuirlos a un ejemplo específico no inspeccionado.

### Validación de esta ronda
Pruebas DOM: 72 celdas contra detalle, total comprometido + propuesto, 576 celdas de cobertura, 48 miniseries, cinco excepciones, navegación contextual y pruebas anteriores. Motor: 36 combinaciones más regresión de sobrecompra. Revisión visual desktop en navegador real del calendario y selección de miniseries. No se declara certificación de accesibilidad ni prueba móvil real.

# DockMind · Demanda, compras y evaluación ML

## Integración en el portafolio

- Ficha: `#/area/agentes/dockmind`
- Runtime servido: `dist/dashboards/dockmind/index.html`
- Runtime editable: `runtime/index.html`, `runtime/styles.css`, `runtime/app.js`, `runtime/data.json`, `runtime/vendor/d3.min.js`
- Referencia autocontenida: `DockMind_prototipo.html` (no se sirve en el sitio)
- Publicar localmente: `python dashboards/dockmind/publicar.py`
- Portada real: `node dashboards/dockmind/capturar-portada.mjs`

El sitio se sirve desde `dist/`:

```bash
cd dist
python -m http.server 8000 --bind 127.0.0.1
```

Abre `http://127.0.0.1:8000/dashboards/dockmind/index.html` o la ficha del portafolio. El runtime no necesita Python. D3, datos y estilos se cargan desde archivos locales del mismo origen; no hay CDN, Atlas, LLM ni API de marketplace. La aprobación es local y efímera.

Abrir `DockMind_prototipo.html` directamente: CSS, D3, resultados de entrenamiento y JavaScript incluidos. No requiere servidor ni credenciales. Los modelos se entrenaron realmente con Python; el navegador consume sus resultados y recalcula el inventario.

## Qué incluye
- 48 SKU sintéticos, seis categorías, tres canales simulados, 104 semanas históricas, 12 futuras.
- Estacional 52, Holt, Ridge multisalida y Random Forest multisalida. Los dos últimos tienen artefactos joblib en models/.
- Entrenamiento por corte, selección global usando validación y test posterior, a horizontes 1/4/8/12 semanas. Métricas globales y por producto.
- Intervalos de residuos agrupados de validación, cobertura medida en test.
- Benchmark independiente de 45 tiendas × 143 semanas de ventas históricas Walmart reproducidas en GitHub. Es importe reportado en USD, no unidades SKU. No se utiliza para abastecer el catálogo sintético.
- Pronóstico con banda, matriz de cobertura, calendario de compras, balance semanal, cascada de compra, matriz de modelos, distribución de errores, ABC/variabilidad, alternativas capital/servicio y 120 escenarios de estrés.
- Búsqueda, categoría/canal/ABC, selección SKU, presupuesto, escenarios, exportación CSV y aprobación en memoria.

## Reproducir

Python 3.12; `pip install -r requirements.txt`. Ejecutar desde `dashboards/dockmind`.

1. `python prepare_data.py` genera el catálogo en `runtime/data.json`; sustituye los resultados, por lo que debe seguir el entrenamiento.
2. `python download_benchmark.py` obtiene el CSV público (requiere red). El raw no se redistribuye.
3. `python train_models.py research/Walmart.csv` entrena ambos conjuntos, actualiza `runtime/data.json`, `research/model_report.json` y `models/`.
4. `python build.py` regenera `DockMind_prototipo.html` desde `runtime/` para revisión sin servidor.

Para solo datos sintéticos: `python train_models.py` omite el benchmark público. No es necesario reentrenar para servir la demo.

## Evidencia de integración

Las capturas de las cinco pantallas, ficha, tarjeta, móvil y recepciones están en `evidencias/dockmind/`, junto con los logs de QA y las regresiones del portafolio. `verificacion-navegador.md` resume la inspección en Chromium, incluyendo altura del iframe, persistencia de SKU/escenario, filtros vacíos, aprobación local y viewport 390.

## Estructura

- `runtime/`: cinco archivos que se publican en `dist/dashboards/dockmind/`; no incluye Python, joblib, QA ni research.
- `qa/`: `verify_runtime.cjs` y `verify_ui.cjs`; leen el runtime.
- `research/model_report.json`: resultados, cortes, métricas y procedencia.
- `models/`: artefactos joblib de evidencia; no se sirven como assets.
- `prepare_data.py`, `train_models.py`, `download_benchmark.py`, `build.py`: reproducción Python.
- `AUDITORIA_DOCKMIND.md`, `REFERENCIAS_GITHUB.md`: auditoría y referencias.

## Diseño científico
Normalización por media de ocho semanas pasada; rezagos y estadísticas calculados solo con historia disponible. Targets directos de 12 pasos; ventanas de entrenamiento terminan antes del corte. Modelos globales por conjunto, no un bosque por SKU. Hiperparámetros fijos; ganador por WAPE de validación, no test. Sin reentrenamiento en el navegador ni LLM.
Cortes sintéticos: validación 64/68/72, test 84/88/92. Índices exclusivos, cada corte pronostica 12 semanas. Último target de validación anterior al primer origen de test. Los horizontes y cortes se solapan: no son muestras independientes ni intervalos de confianza de una mejora.
Bandas: cuantiles 10/90 de residuos de validación normalizados por media reciente. Cobertura test publicada; objetivo 80%, sin garantías individuales. Solo el campeón tiene bandas en la interfaz.

## Resultados ejecutados
Ver research/model_report.json: ganador Random Forest en ambos conjuntos. WAPE test de todos los horizontes, catálogo 7.47% frente a 10.56% de estacional; benchmark público 5.07% frente a 5.24%. Cobertura media 82.8% y 73.5%, respectivamente. No se atribuye al modelo un porcentaje de servicio comercial.

## Procedencia pública
CSV: https://github.com/GonzaloBP/Almacen-de-datos-Walmart/blob/main/Walmart.csv
2010-02-05 a 2012-10-26, 6,435 filas. Descarga 2026-11-16. SHA-256 en research/model_report.json. Reproducción comunitaria de un histórico de retail; no es un feed privado o actual de Walmart. No se afirma licencia comercial verificada. Se incluyen métricas derivadas y script de descarga, no el CSV raw.
Geografías/canales Amazon y Mercado Libre del catálogo no provienen de estas compañías: son etiquetas de un fixture. REFERENCIAS_GITHUB.md documenta inspiración funcional de terceros.

## Planificación y límites
Regla de reposición, no optimización global: demanda de la semana de recepción más colchón, descontando el inventario proyectado en esa fecha, empaque y presupuesto compartido. Ventas no cubiertas se pierden. No modela perecederos, capacidad, impuestos, comisiones ni devoluciones. El calendario de recepciones incluye tránsito comprometido y propuestas, sin modelar capacidad física.
Comparación de políticas: simulación determinista a demanda esperada; no es una frontera óptima demostrada. Estrés: 120 escenarios con remuestreo independiente de errores de validación por SKU/semana, y retrasos adicionales de 0/1/2 semanas con pesos supuestos 70/20/10. Plan fijo, sin correlaciones entre productos/proveedores ni reoptimización. No son probabilidades comerciales calibradas.
La promoción +25% es un supuesto. La precisión sintética no prueba validez de negocio. No hay despacho de compras, API marketplace, Atlas ni LLM conectado.

## Comprobaciones ejecutadas

Desde esta carpeta:

```bash
npm install
npm run verify
```

La QA lee `runtime/`. Incluye 36 escenarios del motor, la regresión de ventas perdidas y pruebas DOM de las cinco pantallas, teclado, filtros vacíos, pronóstico, aprobación, benchmark y SVG finitos. La inspección visual y de interacción se realiza en navegador servido; jsdom no sustituye esa prueba.

## Revisión de producto y navegación
Cinco pantallas por tabs del portafolio (no enlaces a secciones): Resumen, Demanda, Inventario, Compras y Modelos. Ver AUDITORIA_DOCKMIND.md para observaciones, cambios y límites. Compras restringidas a recepción dentro de 12 semanas; reposición basada en inventario proyectado a la recepción y una semana de demanda más colchón. La aprobación se ofrece solo en Compras. Gráficas densas con scroll local en móvil.

## Segunda auditoría
Se revisó visualmente en navegador real la versión desktop: pantallas, pronóstico, compras, matriz e indicadores de modelos. Se corrigió el plazo completo: emisión al cierre S1 + 2 semanas → recepción al inicio S4. La regla perdió la suposición implícita de backlog: primero proyecta existencias hasta llegada y luego calcula una semana de cobertura más colchón. Las ventas perdidas anteriores no se reponen como si fueran pedidos pendientes.
El presupuesto inicial se deriva del costo neto aproximado de demanda base menos stock y tránsito, redondeado a 100,000 MXN (16.1 millones en el fixture actual). No es recomendación óptima ni garantía de servicio. La demanda y métricas ML no se modificaron. El límite del slider es 1.5 veces esa referencia, redondeado.
Bandas y referencia con la misma promoción supuesta, semanas históricas corregidas, tabla accesible del pronóstico, vacíos de catálogo explícitos y estado de filtros visible en Inventario/Compras.
Verificación: 36 escenarios y caso de regresión de ventas perdidas; pruebas DOM y de navegador documentadas en AUDITORIA_DOCKMIND.md. `npm install` y `npm run verify` son opcionales para QA; el HTML autónomo no requiere Node.

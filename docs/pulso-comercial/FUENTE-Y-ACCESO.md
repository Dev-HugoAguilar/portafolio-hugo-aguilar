# Fuente, cobertura y modelo · Pulso comercial · Walmex

Qué se publica, de qué documento sale cada cifra y qué no se puede concluir. El
tablero analiza ventas, crecimiento y desempeño comercial de Walmart de México y
Centroamérica con los comunicados trimestrales oficiales. **No** es un tablero de
estados financieros: no incluye margen, EBITDA, deuda ni utilidad.

## 1. Fuentes

| | |
|---|---|
| Sitio | <https://www.walmex.mx/comunicados-y-eventos/comunicados-a-bmv.html> |
| Información financiera | <https://www.walmex.mx/informacion-financiera/> |
| Documentos por trimestre | «Estados Financieros» (xlsx) + comunicado de resultados (pdf) |
| Último trimestre publicado | **3T26** (comunicado del 27 de octubre de 2026) |
| Cobertura | **1T23 – 3T26 · 15 trimestres · 16 documentos** (15 pares + histórico de ventas) |
| Archivo local | `backend/data/walmex/fuentes/` (los originales no viven en Atlas) |

Cada trimestre usa **dos** documentos: los estados financieros dan los importes por
región (México, Centroamérica, Consolidado, con el año anterior y sus variaciones)
y el comunicado da la fecha de publicación y las variaciones de tráfico y ticket.
El histórico `Resumen_Ventas_Walmex_2T26.xlsx` aporta la serie de unidades iguales
por mercado (y el comunicado la completa para 3T26).

## 2. Matriz de cobertura

| Indicador | Unidad | Mercados | Trimestres con dato | Fuente y tabla |
|---|---|---|---|---|
| Total de ingresos | millones MXN | Consolidado, México, Centroamérica | 15 (1T23–3T26) | «P&L por región», fila «Total ingresos» |
| Ingresos del año anterior | millones MXN | Consolidado, México, Centroamérica | 15 | misma tabla, columna del año previo |
| Ventas netas | millones MXN | Consolidado | 15 | «P&L por trimestre», fila «Ventas netas» (miles → millones) |
| Crecimiento anual | % | Consolidado, México, Centroamérica | 15 (publicado) + 15 (calculado) | «P&L por región», columna «Var. %» |
| Crecimiento a moneda constante | % | Centroamérica | 15 | «P&L por región», columna «Sin efectos de tipo de cambio» |
| Unidades iguales (mismas tiendas) | % | México, Centroamérica | 15 | Histórico de ventas (UI) + comunicado 3T26 |
| Tráfico | % | México, Centroamérica | **10** (1T24–4T24, 2T25–3T26) | Comunicado, datos relevantes del trimestre |
| Ticket | % | México, Centroamérica | **10** (mismos) | ídem |

**No publicado (y por qué):** comercio electrónico (ventas netas y GMV) porque la
definición cambia entre trimestres y no cubre el periodo; detalle por tienda,
formato, producto o cliente porque la empresa no lo publica; metas o guidance
porque no hay una guía comparable en estos documentos; tráfico y ticket de 2023 y
1T25 porque el comunicado no los reporta.

## 3. Validaciones antes de publicar

`scripts/preparar_walmex.py` escribe los hechos fuera de Atlas y ejecuta **93
validaciones**; la publicación se bloquea si falla alguna de las bloqueantes:

| Prueba | Resultado |
|---|---|
| México + Centroamérica = Consolidado | 15/15 (residual ≤ 1 millón por redondeo del reporte) |
| Ventas netas + otros ingresos = total de ingresos | 15/15 |
| Variación calculada con importes = variación publicada | 45/45 (±0,06 pp) |
| (1+tráfico)×(1+ticket) ≈ unidades iguales | 10/18 · **8 discrepancias de hasta 2,2 pp** |

La última prueba es **informativa**: precisamente porque no se cumple siempre, el
tablero no presenta tráfico y ticket como descomposición exacta del crecimiento.

## 4. Modelo en Atlas (solo agregados)

| Colección | Contenido | Documentos |
|---|---|---|
| `walmex_hechos` | periodo × mercado × indicador × base, con valor, unidad y fuente | 280 |
| `walmex_catalogo` | indicadores, definiciones, mercados, periodos, combinaciones y cobertura | 1 |
| `walmex_fuentes` | documento, URL, SHA-256, fecha de publicación y páginas | 16 |
| `walmex_importaciones` | manifiesto de la versión (conteos, validaciones, modelo) | 1 |
| `walmex_estado` | puntero a la versión activa | 1 |

Consumo medido: **0,118 MiB** en total (`walmex_hechos` 0,079 · catálogo 0,015 ·
fuentes 0,016), **pico durante la publicación 0,114 MiB**. Presupuesto propuesto
para el tablero: **5 MiB**; el clúster pasó de 213,86 a 213,97 MiB de 512, con
**298 MiB de margen**. No se crearon índices: 280 documentos se leen completos y un
índice costaría más espacio del que ahorra.

## 5. Respuesta medida (sin caché / con caché)

Caché de la API: 300 s por versión y filtros.

| Endpoint | Sin caché | Con caché | Respuesta |
|---|---:|---:|---:|
| `/walmex/resumen` | 438 ms | 0 ms (hit) | 14,5 KB |
| `/walmex/motores` | 406 ms | 0 ms (hit) | 3,3 KB |
| `/walmex/matriz` (4 indicadores) | 422 ms | 0 ms (hit) | 24,8 KB |
| `/walmex/desempeno` (crecimiento) | 421 ms | 0 ms (hit) | 7,1 KB |
| `/walmex/resumen?mercado=mexico&desde=1T24` | 439 ms | 101 ms | 6,2 KB |
| `/walmex/estado` | 533 ms | sin caché | 4,6 KB |
| `/walmex/fuentes` | 290 ms | sin caché | 11,5 KB |
| `/walmex/exportar` | 510 ms | sin caché | 26,1 KB |

`/walmex/matriz` es la única lectura añadida para el rediseño: devuelve varios
indicadores de variación (crecimiento anual, unidades iguales, tráfico y ticket) por
mercado y trimestre, con su base, su fuente y el estado de cada celda (publicado, cero o
no publicado). Sirve al mapa de calor y a las series de motores sin colecciones ni
agregados nuevos: una sola consulta `indicador ∈ {…}` sobre los mismos hechos. La
exportación añade la columna `origen` (publicado o derivado).

## 6. Hallazgos publicados (3T26 frente a 3T25, sin filtros)

La ficha muestra **tres** hallazgos. El subtítulo de la sección declara el periodo
—«Resultados del tercer trimestre de 2026 frente al mismo trimestre de 2025»— y las
cifras se calculan con la API en el momento de abrir la ficha, no se escriben a mano:
`node tools/verificar-hallazgos.mjs` las contrasta contra `/walmex/resumen`,
`/walmex/motores` y `/walmex/desempeno`.

| Hallazgo (título publicado) | Cifra verificada | Referencia y cálculo |
|---|---|---|
| México concentra el aumento de ingresos | 84,7 % del incremento consolidado de **7 308** millones; Centroamérica 15,3 % | México 206 759 − 200 567 = **6 192**; Centroamérica 42 069 − 40 953 = **1 116**; 6 192 + 1 116 = 7 308. Participaciones = 100 × Δmercado / Δconsolidado (84,73 % y 15,27 %). Importes aditivos del mismo trimestre |
| Los mercados presentan patrones distintos | México: tráfico **0,0 %** (estable) y ticket **+1,6 %**; Centroamérica: tráfico **+3,4 %** y ticket **+1,4 %** | Comunicado 3T26, variaciones publicadas. Se describen; no se presentan como descomposición del crecimiento |
| Centroamérica destaca en ventas a unidades iguales | 4,8 % frente a 2,2 % de México: **2,6 puntos porcentuales** | Histórico de ventas (UI) + comunicado 3T26; 4,8 − 2,2 = 2,6 |

Denominación oficial: la empresa reporta **ventas a unidades iguales** («unidades
iguales» en la API y en el tablero); es la misma medida que en otros sectores se cita
como «ventas mismas tiendas». El título usa el nombre oficial.

Correcciones aplicadas en esta edición (verificadas antes de editar):

| Antes | Ahora |
|---|---|
| «El ticket explica más que el tráfico en ambos mercados» | Retirado: contradecía sus propias cifras, porque en Centroamérica el tráfico (+3,4 %) supera al ticket (+1,4 %). Sustituido por «Los mercados presentan patrones distintos», que describe cada mercado |
| «El último trimestre crece por encima del promedio reciente» | Retirado: hallazgo secundario y su redondeo (+0,16 pp) no se lee con claridad |
| «La diferencia entre lo nominal y lo comparable no se puede descomponer» | Retirado de Hallazgos; la advertencia se conserva en «Limitaciones» de la ficha |
| «El tráfico y el ticket no cubren todos los trimestres» | Retirado de Hallazgos; la cobertura (10 de 15 trimestres) se conserva en «Limitaciones» |
| Cifras con punto decimal (+3.1 %, +2.2 %) | Coma decimal en la prosa de la ficha (84,7 % · 1,6 % · 2,6 pp), como en el texto solicitado y en esta documentación; el tablero conserva su formato local |

Advertencias conservadas donde corresponden: la identidad tráfico × ticket no se
presenta como descomposición exacta y su producto no reproduce las unidades iguales en
todos los trimestres («Método y decisiones técnicas»); la cobertura de tráfico y ticket
(10 de 15 trimestres) y la brecha nominal/comparable no descomponible («Limitaciones»).

## 7. Límites

Muestra de una sola empresa y de dos mercados: no hay comparación con
competidores. Los importes son millones de pesos nominales del trimestre y las
variaciones son frente al mismo trimestre del año anterior; la variación a moneda
constante solo existe para Centroamérica. El tablero compara contra el año
anterior porque no hay metas públicas en los documentos usados. Los huecos de
tráfico y ticket no se interpolan.

## 8. Reproducir

```powershell
cd backend
.venv\Scripts\python.exe -m scripts.preparar_walmex      # prepara y valida fuera de Atlas
.venv\Scripts\python.exe -m scripts.publicar_walmex --aplicar
cd ..\dashboards\pulso-comercial
node tools/verificar-tablero.mjs                          # 225 comprobaciones del tablero
node tools/verificar-tarjeta.mjs                          # 14 comprobaciones de la tarjeta
node tools/verificar-hallazgos.mjs                        # 32 comprobaciones de «Hallazgos del análisis»
node tools/evidencia.mjs                                  # vistas, secuencia de interacciones y video
node tools/revisar-visual.mjs                             # barrido de defectos de maquetación
```

El diseño de la interfaz —vistas, visualizaciones, fórmulas, escalas, estado en la
URL, evidencia y comprobaciones— está en
[DISENO-Y-VERIFICACION.md](DISENO-Y-VERIFICACION.md).




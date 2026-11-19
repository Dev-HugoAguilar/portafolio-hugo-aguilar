# Especificación de diseño · Atlas vial · Ciudad de México

**Fase 1 · Compuerta B.** Tres artefactos para aprobación: wireframes de las tres vistas
en tres anchos, hoja de especificación y sistema cromático. **No hay código de producción
en esta fase**: los wireframes son desechables (`docs/atlas-vial/wireframes/index.html`).

Base semántica: `AUDITORIA-GRANO.md` y `DICCIONARIO-METRICAS.md` (Compuerta A aprobada).

---

## 1. Wireframes

Nueve capturas reales, renderizadas con Playwright desde el HTML desechable:

| Vista | Escritorio 1280 | Tableta 768 | Móvil 390 |
|---|---|---|---|
| Territorio | `wireframes/wireframe-territorio-1280.png` | `…-768.png` | `…-390.png` |
| Tiempo y entorno vial | `wireframes/wireframe-tiempo-1280.png` | `…-768.png` | `…-390.png` |
| Personas y vehículos | `wireframes/wireframe-personas-1280.png` | `…-768.png` | `…-390.png` |

Regenerar: `cd dashboards/atlas-vial && node tools/wireframes.mjs`.

### 1.1 Territorio · ¿Dónde se concentran los hechos registrados?

| Banda | Contenido | Rejilla (12 col) | Rol |
|---|---|---|---|
| 0 | Barra de filtros: fecha · alcaldía · consecuencia · **Más filtros (n)** · chips removibles · limpiar · exportar | 12 | fijo |
| 1 | Titular dinámico + subtítulo de alcance | 12 | contexto |
| 2 | **Mapa** con tres modos y su leyenda | 8 | protagonista |
| 2 | Perfil de alcaldías (dispersión) | 4 | apoyo |
| 3 | Comparador A/B: composición y evolución | 12 | apoyo |
| 4 | Tabla de hechos plegada | 12 | bajo demanda |

Al recorrer la vista en escritorio: la **barra de filtros** y el **titular** quedan fijos
arriba (sticky, 56 px + 44 px), el mapa se mantiene visible mientras se recorre su propio
panel de exploración, y el perfil de alcaldías se desplaza a la derecha. Los indicadores
compactos (hechos, lesionadas, fallecidas, % con fallecimiento) viven **dentro** del panel
lateral del mapa, no como fila repetida arriba.

### 1.2 Tiempo y entorno vial · ¿Cuándo y en qué entorno ocurren?

| Banda | Contenido | Rejilla | Rol |
|---|---|---|---|
| 0–1 | Barra de filtros + titular | 12 | fijo |
| 2 | **Calendario anual** (53 semanas × 7 días) | 12 | protagonista |
| 3 | Día × hora | 7 | apoyo |
| 3 | Perfil horario semanal (7 paneles) | 5 | apoyo |
| 4 | Tipo de evento × clasificación vial | 6 | apoyo |
| 4 | Composición por intersección (100 %) | 6 | apoyo |
| 5 | Serie temporal (conservada, segmentos rectos) | 12 | apoyo |

El calendario ocupa **todo el ancho** y es lo único que se ve en los primeros 400 px de
contenido. Al recorrer, el calendario se mantiene si el viewport permite 2 bloques
(`position: sticky` desactivado por debajo de 1024 px para no robar altura).

### 1.3 Personas y vehículos · ¿Qué personas y vehículos figuran en el registro?

| Banda | Contenido | Rejilla | Rol |
|---|---|---|---|
| 0–1 | Barra de filtros + titular | 12 | fijo |
| 2 | **Matriz alcaldía × tipo de persona registrada** | 7 | protagonista |
| 2 | Edad registrada (sin consecuencias) | 5 | apoyo |
| 3 | Sexo registrado (franja segmentada) | 12 | apoyo |
| 4 | Vehículos: frecuencia | 6 | apoyo |
| 4 | Vehículos: proporción con al menos un fallecido | 6 | apoyo alineado |
| 5 | Panel contextual plegado | 12 | bajo demanda |

### 1.4 Recomposición en móvil (≤ 430 px) — no se reduce el SVG

| Visualización | Escritorio | Móvil |
|---|---|---|
| Mapa | 8/12 con panel lateral | 12/12, alto 320 px; panel de exploración y detalle como **Sheet inferior** (90 vh) |
| Perfil de alcaldías | 4/12 | 12/12, alto 240 px, etiquetas de eje abreviadas |
| Comparador A/B | dos columnas | A y B apilados; cada uno con su tono y su volumen |
| Calendario | 53 semanas × 7 días | **cuatro trimestres apilados** (13 semanas cada uno), días a la izquierda, meses arriba |
| Día × hora | 7 filas × 24 columnas | **transpuesto**: 24 filas × 7 columnas, horas a la izquierda |
| Perfil semanal | 4 + 3 paneles | 2 columnas de paneles, alto 64 px |
| Evento × vialidad | 6 × 7 | matriz con encabezados abreviados y desplazamiento horizontal **con etiquetas fijas** |
| Intersección 100 % | barras al 100 % | barras al 100 % con leyenda de 2 líneas |
| Alcaldía × persona | 16 × 5 | 16 × 5 con nombres abreviados y valor dentro de la celda |
| Sexo | franja horizontal | franja de 2 filas (nombre arriba, % abajo) |
| Vehículos | dos paneles lado a lado | dos paneles apilados, mismo orden de categorías |

## 2. Hoja de especificación

### 2.1 Tipografía

Misma identidad del portafolio: **Fraunces** (serif) para titulares, **Inter** (sans) para
texto y **IBM Plex Mono** para etiquetas de eje, folios y cifras de tooltip.

| Token | Tamaño / interlínea | Peso | Uso |
|---|---|---|---|
| `--at-titular` | 20 / 1.35 (móvil 17) | 400 serif | Titular dinámico de la vista |
| `--at-h2` | 15 / 1.3 | 600 sans | Título de bloque |
| `--at-sub` | 12.5 / 1.5 | 400 sans | Subtítulo y unidad del bloque |
| `--at-cuerpo` | 13 / 1.55 | 400 sans | Texto, notas, ejes |
| `--at-etiqueta` | 10.5 / 1.4 | 500 mono, `letter-spacing .06em`, mayúsculas | Encabezados de eje, chips, leyenda |
| `--at-cifra` | 18 / 1.2 | 600 sans **tabular** | Valor destacado en panel |
| `--at-cifra-mini` | 12 / 1.2 | 500 sans **tabular** | Cifras en celdas y tooltips |

**Números tabulares obligatorios** en todo valor numérico, tooltip y celda:
`font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1;`. Formato local
es-MX (coma decimal, espacio fino de miles en prosa, millares con coma en tablas).

### 2.2 Espaciado (base 4 px)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`. Reglas: separación entre bloques **16 px**
(12 en móvil); relleno interno de bloque **16 px** (12 en móvil); separación título→contenido
**8 px**; entre etiqueta y cifra **4 px**. Ninguna medida improvisada.

### 2.3 Radios, bordes y elevación

| Token | Valor | Uso |
|---|---|---|
| `--r-xs` | 2 px | celdas de calendario y matrices |
| `--r-sm` | 6 px | controles, chips |
| `--r-md` | 10 px | bloques |
| `--r-lg` | 14 px | Sheet y diálogos |
| `--borde` | 1 px `#DDE2EB` | separadores **no interactivos** |
| `--borde-control` | 1 px `#7E8796` (3,42:1 sobre fondo) | bordes de control (exigencia 3:1) |
| `--sombra-1` | `0 1px 2px rgba(17,19,24,.06)` | tarjeta en reposo |
| `--sombra-2` | `0 6px 24px rgba(17,19,24,.10)` | Sheet, popover, tooltip |

Sin glassmorphism, brillos, degradados en texto, partículas, bordes animados ni 3D.

### 2.4 Escalas por métrica

| Métrica | Escala D3 | Dominio | Pasos | Marca |
|---|---|---|---|---|
| Hechos | `scaleSequential` (dominio continuo → 7 pasos) | `[0, max]` por vista; coropleta 0–4 349 | 7 | relleno sólido |
| Personas lesionadas | `scaleSequential` ámbar | `[0, max]` | 7 | relleno sólido + borde claro |
| Personas fallecidas | `scaleSequential` granate | `[0, max]` | 7 | relleno **rayado diagonal** sobre el color (nunca solo color) |
| Conteo por hexágono | `scaleSqrt` sobre el conteo | `[0, max celda]` | 6 | hexágono |
| % de hechos con ≥ 1 fallecido | `scaleLinear` | `[0, 3,5]` (máx. real 2,95) | continuo | eje Y del perfil |
| Categorías de evento | `scaleOrdinal` | orden fijo: Choque, Derrapado, Atropellado, Caída de ciclista, Caída de pasajero, Volcadura | 6 | color + etiqueta |
| Alcaldías A/B | tono fijo | A `#3D4553`, B `#98A2B3` | 2 | relleno + etiqueta |

Reglas transversales: el dominio de una escala **se declara en la leyenda** («0 – 4 349
hechos»); cambiar de métrica **interpola el color** (200 ms) sin salto; el cero usa el paso
más claro **con el 0 visible en el tooltip**; ausente y fuera de cobertura nunca comparten
color con el cero.

### 2.5 Sistema cromático

#### Canales de métrica (secuenciales, exclusivos)

| Elemento | Matiz | Rampa (7 pasos) | Tinta de texto |
|---|---|---|---|
| Hechos | azul | `#EDF0FE #D5DCFD #B4C0FA #8C9DF5 #6178EE #3458F5 #2745D7` | `#2745D7` (7,19:1) |
| Personas lesionadas | **ámbar** | `#FFF7E6 #FDE9C4 #F9D79A #F2BE68 #E9A23B #C2700F #A85B0A` | `#8A4A08` (6,43:1 sobre el paso 100) |
| Personas fallecidas | **granate** | `#FBEBEE #F5D2D9 #EBB0BC #DE8798 #CB5C74 #8A1F33 #7A1729` | `#7A1729` (9,19:1 sobre el paso 100) |

Ningún canal comparte matiz con otro: azul ≠ ámbar ≠ granate. El mismo color identifica la
misma métrica en mapa, calendario, barras, tooltip y tabla.

#### Categorías (cualitativa, 6 colores, segura para daltonismo)

Okabe–Ito en orden fijo: `#0072B2` · `#E69F00` · `#009E73` · `#CC79A7` · `#56B4E9` · `#D55E00`.

| Regla | Detalle |
|---|---|
| Mismo orden y color en todas las vistas | El orden se fija una vez y no depende de la selección ni del volumen |
| No se mezcla con los canales de métrica | Una gráfica usa **o** canales de métrica **o** categorías, nunca ambos en la misma marca |
| Etiqueta siempre | Todo segmento lleva etiqueta o leyenda con texto: el color no es el único canal |
| Texto sobre relleno | `#111318` sobre naranja (8,25:1) y celeste (8,05:1); blanco solo sobre los pasos oscuros verificados |

#### Estados del dato

| Estado | Tratamiento | Contraste con el cero |
|---|---|---|
| Cero | paso más claro de la escala de su métrica + `0` en el tooltip | — |
| Ausente (sin dato) | relleno `#F4F6FA` + **rayado diagonal** `#C8CFDB` | Distinto: nunca el paso claro |
| Fuera de cobertura | contorno punteado `#B3BCCB`, sin relleno, nota en leyenda | Distinto de ausente |
| Base reducida (n < 600 hechos) | rayado suave + marca «base reducida» en el tooltip | Aplica a proporciones |
| Selección persistente | contorno `#111318` 1,5 px + halo `#FFFFFF` 2 px | Aditivo |
| Filtro global activo | chip en la barra + etiqueta de alcance en el bloque afectado | Aditivo |

#### Contraste verificado

| Par | Ratio | Exigencia |
|---|---:|---|
| Texto `#111318` sobre `#F7F8FC` | 17,51:1 | ≥ 4,5 ✅ |
| Texto secundario `#596273` sobre `#F7F8FC` | 5,79:1 | ≥ 4,5 ✅ |
| Blanco sobre azul `#3458F5` | 5,44:1 | ≥ 4,5 ✅ |
| Blanco sobre ámbar `#A85B0A` | 5,04:1 | ≥ 4,5 ✅ |
| Blanco sobre granate `#8A1F33` | 9,03:1 | ≥ 4,5 ✅ |
| Borde de control `#7E8796` sobre `#F7F8FC` | 3,42:1 | ≥ 3 ✅ |
| Anillo de foco `#3458F5` sobre blanco | 5,44:1 | ≥ 3 ✅ |

### 2.6 Tokens de movimiento

| Token | Duración | Curva | Uso |
|---|---|---|---|
| `--m-hover` | **120 ms** | `cubic-bezier(.2,0,0,1)` (estándar) | Resaltado al pasar el puntero, tooltip de entrada |
| `--m-estado` | **200 ms** | `cubic-bezier(.2,0,0,1)` | Interpolación de color al cambiar de métrica, tabs, chips |
| `--m-panel` | **320 ms** | `cubic-bezier(.05,.7,.1,1)` (entrada) | Sheet lateral, panel de filtros, reordenamiento de barras |
| Transición entre vistas | **200 ms** | estándar | Contenido con desplazamiento ≤ 8 px; el indicador de pestaña activa se desliza |
| Brush | — | — | Sin animación: el rectángulo sigue al puntero; la consulta espera **150 ms** |

Prohibido: animaciones continuas, partículas, 3D, consultas por movimiento del puntero.
`@media (prefers-reduced-motion: reduce)`: todas las duraciones a `0.01 ms`, sin
desplazamiento; los cambios de estado son inmediatos y el color cambia sin interpolar.

### 2.7 Niveles de interacción (cuatro, con tratamiento propio)

| Nivel | Duración | Tratamiento visual | ¿Afecta datos? | Insignia |
|---|---|---|---|---|
| **Hover** | temporal | resaltado ligero (`--m-hover`), tooltip, fila/columna de apoyo | No | — |
| **Selección persistente** | hasta deseleccionar | contorno firme `#111318` + halo blanco; relacionados resaltados; resto al 60 % de opacidad | **No** | «Solo resalta» |
| **Filtro global** | hasta limpiarlo | chip removible en la barra + recálculo + etiqueta «Filtrado por…» en el bloque | **Sí** | — |
| **Comparación A/B** | mientras esté activa | tonos fijos A `#3D4553` / B `#98A2B3` en todos los gráficos del comparador | No (local) | «Comparación local» |

Las selecciones que **no** afectan un panel conservan su insignia de alcance, p. ej.
«No afectada por la selección de calendario» en el bloque de vehículos.

### 2.8 Estados de carga, error y vacío

| Estado | Presentación | Nota |
|---|---|---|
| Cargando | esqueleto del bloque con la altura final reservada (sin salto) | CLS ≈ 0 |
| Error | mensaje en el bloque, con el resto del tablero intacto y botón «Reintentar» | Nunca se vacía la vista |
| Sin resultados | «Ningún hecho coincide con …» + lista de chips a retirar (uno por uno) | No borra la selección |
| Campo no publicado | marca «sin dato» y su cobertura («1 005 de 30 655 sin sexo registrado») | Distinto de cero |
| Fuera de cobertura | contorno punteado con nota de periodo | Distinto de ausente |

### 2.9 Barra de filtros, panel avanzado y Sheet

- **Barra principal:** fecha, alcaldía, consecuencia y «Más filtros (n)». Los chips de lo
  aplicado siempre visibles, también con el panel cerrado.
- **Panel avanzado (Sheet):** tipo de evento, tipo de persona, vehículo, vialidad,
  intersección, edad y grupo de edad registrada. Solo combinaciones que el modelo resuelve
  (diccionario §6 y §7). Borrador separado de lo aplicado: **Aplicar** confirma,
  **Cancelar** descarta y la ✕ equivale a Cancelar (documentado en la cabecera del panel).
- **Comportamiento del Sheet** (patrón shadcn/Radix): velo con `--sombra-2`, foco atrapado,
  `Escape` cierra y devuelve el foco al disparador, scroll de la página bloqueado, panel de
  420 px a la derecha en escritorio y hoja inferior de 90 vh en móvil. Nunca por debajo de
  un SVG: se monta en portal sobre `body` con `z-index` propio.
- **Tooltips** (patrón visx `useTooltipInPortal`): portal, coordenadas de página, volteo
  automático cerca de los bordes y medición con *debounce* en scroll/resize.

### 2.10 Accesibilidad

Contraste verificado (§2.5); foco visible (`outline: 2px solid #3458F5; offset: 2px`) en
tabs, controles, celdas de matriz, calendario y Sheet; navegación completa con teclado
(flechas dentro de matrices y calendario, `Enter`/`Espacio` para seleccionar, `Escape` para
cerrar); objetivo táctil ≥ 44 px en móvil; textos alternativos y roles (`table`/`grid`) con
encabezados asociados; sin información dependiente solo del color; `aria-live` para el
resultado de aplicar filtros.

### 2.11 Presupuestos y cómo se miden

| Presupuesto | Objetivo | Medición |
|---|---|---|
| Filtros con caché p95 | < 400 ms | 20 peticiones por endpoint con `X-*-Cache: hit` |
| Filtros sin caché p95 | < 1.5 s | 20 peticiones con `?nocache=1` o versión nueva |
| Mapa de eventos | Canvas + quadtree > 2 000 puntos | 30 652 puntos reales: Canvas obligatorio |
| Brush | 150 ms de retardo | Medido en el evento `pointerup` |
| Consultas durante hover | 0 | Contador de red durante 10 s de movimiento |
| Bundle gzip | ≤ +40 KB | `vite build` antes/después |
| CLS al cambiar de vista | ≈ 0 | Alturas reservadas + `content-visibility` |

## 3. Registro de referencias (lo que se pudo leer y lo que no)

| Referencia | Estado | Qué se reutiliza |
|---|---|---|
| React Graph Gallery · hexbin-map ([enlace](https://www.react-graph-gallery.com/hexbin-map)) | Página leída; sus bloques de código se cargan en el cliente y el repositorio público devuelve 404 | El patrón documentado: **dos tipos** de hexbin (geometría GeoJSON vs densidad sobre coordenadas), agregación por celda y `centroid()` para etiquetas |
| React Graph Gallery · heatmap ([enlace](https://www.react-graph-gallery.com/heatmap)) | Igual: texto leído, código no accesible | Rejilla `scaleBand` × `scaleBand` con celda por par, escala secuencial de relleno y tooltip por celda |
| Observable · Calendar ([enlace](https://observablehq.com/@d3/calendar)) | **HTTP 429** (checkpoint de Vercel) en dos intentos | No se pudo leer el código. La estructura se implementa con las primitivas D3 equivalentes: columnas por `timeWeek`, filas por día de la semana y trazo de separación por mes. **Debe revisarse contra la referencia cuando sea accesible** |
| Visx · tooltip ([`useTooltipInPortal`](https://raw.githubusercontent.com/airbnb/visx/master/packages/visx-tooltip/src/hooks/useTooltipInPortal.tsx)) | Código leído | Tooltip en portal, conversión a coordenadas de página, `detectBounds` con volteo y medición con *debounce* |
| Visx · brush ([`Brush.tsx`](https://raw.githubusercontent.com/airbnb/visx/master/packages/visx-brush/src/Brush.tsx)) | Código leído | Separación `onChange` (continuo) / `onBrushEnd` (al soltar) y conversión rango→dominio con escala invertida |
| shadcn · Sheet ([enlace](https://ui.shadcn.com/docs/components/sheet)) | Página leída (contenido parcial) | Panel lateral con velo, foco atrapado, `Escape`, montaje en portal y transición de entrada |

Sin dependencias nuevas: el hexbin se calcula con una función propia de ~30 líneas (misma
matemática axial que `d3-hexbin`), el brush y el Sheet se construyen con React sobre las
primitivas que ya existen en el proyecto.

## Compuerta B · qué se pide aprobar

1. La **composición de las tres vistas** y las nueve capturas de wireframe, incluido qué
   permanece visible al recorrer y las reglas de recomposición en móvil.
2. La **hoja de especificación**: tipografía con números tabulares, base de 4 px, radios,
   elevación, escalas por métrica y tokens de movimiento (120 / 200 / 320 ms, dos curvas).
3. El **sistema cromático**: azul para hechos, ámbar para lesionadas, granate para
   fallecidas (sustituye turquesa y violeta actuales), cualitativa Okabe–Ito para
   categorías, y los tratamientos de cero, ausente, fuera de cobertura y base reducida.
4. Los cuatro **niveles de interacción** con su tratamiento e insignias de alcance.
5. El registro de referencias, con la salvedad del calendario de Observable (429).

Con la aprobación se pasa a implementación por bloques, con pruebas semánticas derivadas
del diccionario antes de tocar estilos finales.

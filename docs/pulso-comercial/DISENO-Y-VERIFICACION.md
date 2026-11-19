# Diseño y verificación · Pulso comercial · Walmex

Rediseño de la interfaz sobre los mismos datos oficiales, la misma API y la misma
persistencia compacta en MongoDB Atlas: tres vistas con nueve bloques analíticos,
gráficas propias y un estado compartido. La fuente, la cobertura y el modelo están en
[FUENTE-Y-ACCESO.md](FUENTE-Y-ACCESO.md).

Tablero único: `#/area/dashboards/pulso-comercial`.

---

## 1. Dirección visual

- Fondo claro con profundidad sutil (gradiente muy leve), superficies amplias y sombra
  baja; se eliminaron bordes repetidos y cajas anidadas.
- Jerarquía tipográfica: título editorial de la vista, subtítulo corto, cifras en
  serif para los totales y texto tabular en las gráficas.
- México `#3458F5`, Centroamérica `#8066E8` y consolidado `#596273` se mantienen en
  todas las vistas; aumento `#0F7B5A` y caída `#B4433F` solo indican dirección.
- Se retiraron: la numeración 1–9, las preguntas largas como título, los párrafos
  técnicos permanentes bajo las gráficas, las insignias de conciliación y las leyendas
  repetidas (se sustituyeron por etiquetas directas y globos).
- Una **observación verificada por vista** con el trimestre seleccionado, calculada con
  los datos (no escrita a mano).
- Tres indicadores con su tendencia (sparkline) solo en Resumen; las otras vistas no
  repiten cifras.
- Toda la información técnica (definiciones, fórmulas, fuentes, conciliaciones y
  límites) vive en el panel contextual expandible y en «Fuente, método y límites».

## 2. Composición

| Vista | Bloque protagonista | Complementarios |
|---|---|---|
| **Resumen comercial** | Origen del crecimiento (puente horizontal) | Mezcla del negocio (áreas apiladas) · Calendario comercial (círculos proporcionales) |
| **Motores del crecimiento** | Tráfico y ticket (trayectoria explorable) | Ventaja por indicador (barras divergentes) · Brecha de motores (áreas divergentes) |
| **Comparativa histórica** | Aportación al crecimiento (columnas divergentes) | Trayectorias comparables (índice base 100) · Pulso histórico (matriz con foco) |

Las tablas accesibles y la metodología siguen plegadas; ninguna gráfica se esconde.

## 3. Fórmulas y reglas

### A · Origen del crecimiento
Totales anterior y actual como cifras destacadas (escala de nivel) y una banda central
con las aportaciones en una escala común de millones (escala de cambio), con el cero
como centro: una aportación negativa se dibuja hacia la izquierda y nunca como parte
de un total positivo.

```
ΔMéxico = I(MX, t) − I(MX, t−4)      ΔCentroamérica = I(CA, t) − I(CA, t−4)
ΔTotal  = I(Cons, t) − I(Cons, t−4)  Residual = ΔMéxico + ΔCentroamérica − ΔTotal
participación = Δmercado ÷ ΔTotal × 100  (solo si comparten signo)
```

3T26: 241 520 → 248 828 M; ΔMéxico +6 192 (84,7 %), ΔCentroamérica +1 116 (15,3 %),
residual 0,0. Tolerancia de conciliación 1,0 M por el redondeo de la fuente.

### B · Mezcla del negocio
Áreas apiladas México + Centroamérica con **un punto por trimestre observado** e
interpolación lineal entre puntos; la superficie entre trimestres se declara como
interpolación en la leyenda y en el globo. Modos importe (eje desde cero) y
participación (0–100 % con base = consolidado publicado). El consolidado va en el globo,
nunca como tercera área. Resaltar un mercado atenúa el otro sin renormalizar.

### C · Calendario comercial
Círculos con **área proporcional al ingreso** (radio con raíz cuadrada) y color por
variación anual comparable (escala divergente centrada en cero). Sin ingreso publicado
la celda queda vacía con una señal discreta; con ingreso y sin variación, el círculo es
neutral. La leyenda de tamaño usa tres círculos anidados con su importe.

### D · Tráfico y ticket
Trayectoria por trimestre (X tráfico, Y ticket), cuadrantes identificados, referencias en
cero, flechas temporales, rastro anterior atenuado, etiquetas del inicio, el final y la
selección, y escalas compartidas entre mercados. Arrastre para recorrer trimestres,
**reproducción y pausa** de observaciones reales (una transición entre datos publicados,
nunca valores intermedios) y navegación con flechas del teclado. La reproducción no
arranca sola y se detiene al cambiar de vista.

### E · Ventaja por indicador
```
ventaja = tasa(México) − tasa(Centroamérica)   [puntos porcentuales]
```
Tres barras divergentes con cero central y escala común: arriba la tasa mayor es la de
México, abajo la de Centroamérica. Una tasa mayor no implica un importe mayor y las tres
diferencias no se suman. Elegir una barra resalta el panel de brecha correspondiente.

### F · Dónde se abre la diferencia
Tres paneles de **columnas divergentes** apilados uno debajo del otro y a todo el ancho
(tráfico, ticket y ventas mismas tiendas), con un único eje temporal y una sola escala
vertical simétrica calculada con todas las brechas válidas del rango visible.

```
brecha(indicador, t) = tasa(México, t) − tasa(Centroamérica, t)   [puntos porcentuales]
```

- Columna azul sobre cero: tasa mayor en México. Columna violeta bajo cero: tasa mayor en
  Centroamérica. Marca neutral sobre la línea: diferencia exactamente cero (distinta de
  una ausencia).
- Si falta cualquiera de las dos tasas, el espacio del trimestre queda vacío: no se une,
  no se interpola y no se elimina el periodo del eje.
- Cada panel muestra su nombre, la brecha del trimestre seleccionado con signo y «pp», y
  la cobertura cuando falta algún trimestre.
- El cursor (o el foco) resalta la misma columna temporal en los tres paneles con una
  banda discreta, y un globo compartido muestra tasa de México, tasa de Centroamérica y
  diferencia de cada indicador. Clic o toque fija el trimestre y sincroniza la selección
  del tablero; al salir del bloque se recupera la selección fijada. Con teclado: flechas
  para recorrer y Enter para fijar.
- Una sola leyenda: azul, mayor tasa en México; violeta, mayor tasa en Centroamérica. No
  se interpreta mayor tasa como mayores ventas ni se suman las tres brechas.

### G · Aportación al crecimiento
```
contribución(mercado, t) = (I(mercado, t) − I(mercado, t−4)) ÷ I(Cons, t−4) × 100
```
Columnas divergentes con las contribuciones positivas apiladas hacia arriba y las
negativas hacia abajo; el crecimiento consolidado calculado se marca con un trazo
propio y el residual se conserva. Solo se dibujan los trimestres calculables (12 en la
versión actual) y el subtítulo declara la cobertura. 3T26: +2,56 pp México, +0,46 pp
Centroamérica, calculado 3,03 pp, publicado +3,0 %.

### H · Trayectorias comparables
```
índice(mercado, t) = importe(mercado, t) ÷ importe(mercado, base) × 100
```
Base común, comparable y mayor que cero, **elegida sobre la línea temporal** (o con el
selector accesible); la base se etiqueta de forma permanente, vale 100 por definición y
no cambia al mover el rango (si queda fuera, se indica en el subtítulo). Referencia en
100, etiquetas directas MX/CA y cursor enlazado.

### I · Pulso histórico
Matriz de indicadores (todos en porcentaje) por trimestre y mercado; color divergente
centrado en cero con dominio compartido; se resaltan la fila y la columna al explorar;
elegir un indicador abre su historia (mínimo, máximo, media simple y cobertura) y
seleccionar una celda actualiza el trimestre compartido. Sin normalizaciones añadidas.

## 4. Estado e interacción

En la URL: `wm-vista`, `wm-desde`, `wm-hasta`, `wm-trimestre`, `wm-indicador`,
`wm-mercado`, `wm-indice-base`, `wm-motores`, `wm-estacional`, `wm-composicion`,
`wm-calor-mercado`. Compartir copia el enlace, Restablecer vuelve al inicio y Exportar
descarga el CSV agrupado con unidades, origen (publicado o derivado) y filtros.

Efectos con función: indicador deslizante de la pestaña activa, transición breve entre
vistas, realce del bloque en foco, marcas que se mueven al cambiar de trimestre,
resaltado vinculado entre gráficas (mercado e indicador), transiciones importe ↔
participación y al cambiar la base del índice. Sin 3D, partículas ni efectos que alteren
la percepción del tamaño o la posición. Con `prefers-reduced-motion` se desactivan las
transiciones y el indicador de pestaña.

Los globos se colocan junto a la marca, se voltean si no caben y se ocultan al
desplazar la página; nunca tapan el dato señalado.

## 5. Ausencias y cobertura

Cobertura compacta («10 trimestres con ambas variables», «12 trimestres calculables»),
huecos discretos, sin interpolar y sin sustituir por cero. Los periodos se conservan en
el eje temporal. Un indicador sin dato se explica en el globo y en la metodología; el
estado de la API (carga, error, sin versión publicada) se distingue del dato ausente.

## 6. Referencias consultadas y atribución

| Fuente | Qué se tomó | Licencia / uso |
|---|---|---|
| [react-graph-gallery](https://www.react-graph-gallery.com/) — *stacked area*, *bubble plot*, *heatmap*, *connected scatter* | Estructura de datos apilados con `d3.stack`/`area`, **área proporcional con `scaleSqrt` y leyenda de tamaños anidados**, mapa de calor con escalas de banda y leyenda de color, dispersión conectada con puntos y segmentos; patrón «D3 para el cálculo, React para el render» | Código de ejemplo del proyecto de Yan Holtz (repositorio MIT); se reescribieron los componentes, sin copiar código |
| [visx gallery](https://visx.airbnb.tech) (Airbnb) | Criterios de escalas compartidas, ejes y small multiples | MIT; solo conceptos, no se instaló |
| [Aceternity UI](https://ui.aceternity.com/) — *Animated Tabs*, *Tooltip Card* | Indicador deslizante de pestaña y globo posicionado sin tapar el dato | Componentes gratuitos con atribución; se implementaron con CSS y React propios (sin Framer Motion) |
| [Magic UI](https://magicui.design/) | Idea de animación breve de cifras al cambiar de valor | MIT; se resolvió con transiciones CSS |
| [D3 gallery (Observable)](https://observablehq.com/@d3/gallery) | Catálogo de referencia (la página devolvió un control de acceso 429 durante la consulta; no se usó código) | — |
| [D3](https://d3js.org) | `d3-scale`, `d3-shape` (ya instalados) | ISC |

**Dependencias añadidas: ninguna.** El proyecto ya tenía React 19, TypeScript, Vite,
`d3-scale` y `d3-shape`; la animación se resolvió con transiciones CSS y
`requestAnimationFrame` donde hacía falta, y los globos con un componente propio.

## 7. Evidencia

En `dashboards/pulso-comercial/evidencias/`:

| Archivo | Contenido |
|---|---|
| `antes/tablero-*.png` | Capturas de la versión anterior (tres vistas, escritorio y móvil) |
| `tablero-{resumen,motores,comparativa}-{escritorio,movil}.png` | Capturas reales del rediseño |
| `antes/bloque-brecha-{escritorio,movil}.png` | Bloque «Brecha de motores» antes del cambio (áreas conectadas en dos columnas) |
| `brecha-despues-{escritorio,movil}.png` | Bloque «Dónde se abre la diferencia» después del cambio (tres paneles de columnas) |
| `secuencia/1-selector-temporal.png` | Selector temporal: el trimestre cambia y las marcas lo siguen |
| `secuencia/2-reproduccion.png` | Reproducción de observaciones reales en Motores |
| `secuencia/3-foco-vinculado.png` | Indicador elegido en Ventaja resaltando su panel de brecha |
| `secuencia/4-base-en-la-linea.png` | Base del índice elegida sobre la línea temporal |
| `secuencia/5-panel-contextual.png` | Panel contextual expandido con fórmula, base y fuente |
| `video/interacciones.webm` | Video corto con las cinco acciones anteriores |
| `revision/verificacion.json`, `revision/informe.json` | Resultados de las suites |
| `tarjeta-{escritorio,movil}.png` | Tarjeta del catálogo con la captura nueva |
| `catalogo-{escritorio,movil}.png` | Catálogo completo con «Marketing y clientes» y «Pulso comercial» juntos (paridad de recuadros) |
| `zoom-tarjeta-escritorio.png` | Acercamiento a la tarjeta de Walmex dentro del catálogo |
| `hallazgos-{escritorio,movil}.png` | Sección «Hallazgos del análisis» de la ficha, ya con los tres hallazgos |
| `hallazgos-contexto-{escritorio,movil}.png` | La misma sección en su cuadrícula, con «Método y decisiones técnicas» y «Limitaciones» |
| `antes/hallazgos-{escritorio,movil}.png` | La sección antes de la edición (cinco párrafos con método y límites) |

Captura de la tarjeta: `dist/img/pulso-comercial-resumen.webp`, **1600 × 1726 px**
(proporción 0,9270, la misma de `marketing-clientes-resumen.webp`), 99,7 KB.

Cómo se armó: `node tools/captura-tarjeta.mjs --final` abre «Resumen comercial» en el
catálogo, espera datos, fuentes y los tres gráficos, y captura el marco completo del
tablero —cabecera y controles, los tres indicadores, «Origen del crecimiento», «Mezcla
del negocio» y «Calendario comercial»— sin navegación del portafolio, sin pie y sin los
paneles técnicos plegados. El único ajuste de composición es el espaciado interno
(pasos de 10 a 9 px), que lleva el marco de 1186 a 1178 px de alto sobre una columna fija
de 1092 px: exactamente 1092 × 1726/1600. No se reescala el contenido ni se recorta:
la imagen se entrega a 1600 × 1726 px y el recuadro del catálogo la muestra con
`object-fit: contain`.

### «Hallazgos del análisis» de la ficha

La sección tiene un subtítulo con el periodo y **tres** hallazgos, cada uno con título
breve, una o dos frases y como mucho dos cifras resaltadas. Se calculan con la API al
abrir la ficha (`src/hallazgos.ts`): el reparto del incremento de ingresos con importes
aditivos del mismo trimestre, el tráfico y el ticket de cada mercado tal como se
publican, y las ventas a unidades iguales con su diferencia en puntos porcentuales.

Las advertencias no viven en la sección: la identidad tráfico × ticket y el denominador
de las participaciones están en «Método y decisiones técnicas»; la cobertura de tráfico
y ticket (10 de 15 trimestres) y la brecha nominal/comparable no descomponible, en
«Limitaciones». La prosa usa coma decimal (84,7 % · 2,6 puntos porcentuales) como el
texto editorial y la documentación; el tablero conserva el formato local de sus ejes.
El bloque no fija alturas: los tres párrafos fluyen con la misma separación (10 px en
escritorio, 12 px en móvil) y la cuadrícula estira la celda solo por su vecina.

## 8. Comprobaciones

| Suite | Comando | Resultado |
|---|---|---|
| Tablero (escritorio, tableta y móvil) | `node tools/verificar-tablero.mjs` | **225/225** |
| Tarjeta en el catálogo | `node tools/verificar-tarjeta.mjs` | **14/14** |
| «Hallazgos del análisis» de la ficha | `node tools/verificar-hallazgos.mjs` | **32/32** |
| Portafolio (otros tableros) | `node dashboards/marketing-clientes/tools/revisar.mjs` | **18/18** |
| Fichas del portafolio | `node dashboards/marketing-clientes/tools/verificar-ficha.mjs` | **16/16** |
| API | `.venv\Scripts\python.exe -m pytest` | **191 pasan** |

La suite del tablero comprueba, entre otras cosas: los tres bloques de cada vista
visibles y sin acordeones; ausencia de numeración, insignias, preguntas largas y
párrafos técnicos permanentes; una observación por vista; **barras del puente
proporcionales a las aportaciones**; círculos del calendario con área proporcional;
reproducción que avanza entre observaciones reales sin inventar trimestres; arrastre y
teclado que cambian el trimestre; foco de un indicador que resalta su panel y viaja a la
URL; base del índice elegida sobre la línea temporal y equivalente a 100; historia del
indicador en el panel expandible; exportación con unidades, origen y filtros; globos;
cero desbordes horizontales; ningún texto fuera de su lienzo; ninguna etiqueta encimada;
cero errores de consola; y comportamiento con movimiento reducido.

Para el bloque «Dónde se abre la diferencia» se comprueba además: tres paneles apilados a todo el ancho, la misma escala simétrica en los tres, la banda temporal alineada, que la cifra de cada panel sea exactamente la diferencia de las dos tasas, columnas azules y violetas presentes, que solo se dibujen trimestres con ambas tasas, la ausencia de la nota de interpolación, el globo compartido con las dos tasas y la diferencia, el clic que fija el trimestre con su URL, la recuperación de la selección al salir, el recorrido con flechas y Enter, y cero peticiones de red al explorar.

Para la tarjeta del catálogo se comprueba, en escritorio (1440 px) y en móvil (390 px):
que la imagen carga con sus dimensiones naturales (1600 × 1726, idénticas a las de
«Marketing y clientes»), que **el recuadro mide exactamente lo mismo** que el de
referencia (527 × 569 en escritorio, 351 × 379 en móvil) y con la misma proporción, que
las etiquetas y los títulos arrancan a la misma altura relativa a su tarjeta —y a la misma
altura absoluta cuando comparten fila—, que la captura **se ve completa** (imagen del
tamaño del contenido, `object-fit: contain`, sin bandas ni desbordes), que declara
dimensiones y un texto alternativo de 450 caracteres, y que el catálogo no gana desbordes
horizontales.

Validaciones de datos (independientes del DOM, contra la API): el puente concilia con el
consolidado publicado (|ΔMX + ΔCA − ΔTotal| ≤ 1 M) y las contribuciones suman el
crecimiento calculado con el denominador consolidado correcto.

## 9. Alcance técnico y costo

- Sin colecciones, índices ni agregados nuevos. `/walmex/matriz` (una consulta
  `indicador ∈ {…}`) sigue siendo la única lectura añadida.
- El tablero hace tres lecturas agregadas (`/resumen`, `/motores`, `/matriz`) y **ninguna
  consulta** al mover el cursor, reproducir, arrastrar o cambiar de base.
- Almacenamiento sin cambios: `walmex_*` ≈ 0,2786 MiB sobre `hugo_portfolio`
  (73,4 MiB lógicos + 26,8 MiB de índices).
- Bundle: `app.js` 493 KB (124 KB gzip), `app.css` 18 KB (4,1 KB gzip).

## 10. Límites

Una empresa y dos mercados; sin detalle por tienda, formato, producto, estado ni
cliente; sin metas ni comercio electrónico. La aportación al crecimiento y el puente son
aritmética de importes, no causas económicas. El índice compara niveles nominales y
arrastra estacionalidad. Las brechas unen trimestres de forma lineal. Tráfico, ticket y
unidades iguales son variaciones publicadas y no se suman entre sí.

## 11. Archivos

```
dashboards/pulso-comercial/src/
├─ App.tsx                  tres vistas, estado compartido, URL y observaciones
├─ analisis.ts              derivaciones: puente, mezcla, calendario, contribuciones, ventaja, brechas, índice, pulso
├─ dominio.ts               colores, formatos, años y estado de la URL
├─ estilos.css              sistema visual (fondo, superficies, tipografía, efectos)
├─ api/{cliente,tipos}.ts   cliente de la API (incluye /matriz) y tipos
├─ hallazgos.ts             hallazgos de la ficha, calculados desde la API
└─ ui/
   ├─ Bloque.tsx            marco común: título breve, controles y observación
   ├─ Tooltip.tsx           globo posicionado que no tapa el dato
   ├─ Puente.tsx            bloque A
   ├─ Mezcla.tsx            bloque B
   ├─ Calendario.tsx        bloque C
   ├─ Motores.tsx           bloque D
   ├─ Ventaja.tsx           bloque E
   ├─ BrechaMotores.tsx     bloque F
   ├─ Contribuciones.tsx    bloque G
   ├─ Indice.tsx            bloque H
   ├─ Pulso.tsx             bloque I
   ├─ Contexto.tsx          panel contextual expandible
   ├─ comun.ts              medición, movimiento reducido y tipos
   └─ Hallazgos.tsx         bloque de hallazgos de la ficha
tools/{evidencia, verificar-tablero, verificar-tarjeta, revisar-visual, captura-tarjeta}.mjs
```

Cambios fuera del tablero: `dist/content.js` (captura, texto alternativo, meta y
descripción del proyecto) y `dist/img/pulso-comercial-resumen.webp`.


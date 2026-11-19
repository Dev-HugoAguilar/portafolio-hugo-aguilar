# Gaza · Vidas y territorio — integración en el portafolio

Observatorio del impacto humano, las lesiones duraderas y la transformación del territorio en Gaza,
integrado en la pestaña **Ciencia de datos y Machine Learning** junto a Walmart M5, «Clientes y
campañas» y «Clientes en movimiento».

- Ficha: `#/area/ciencia-de-datos/gaza-observatorio`
- Observatorio servido: `dist/dashboards/gaza-observatorio/index.html`
- Etiqueta de la tarjeta: **Observatorio humanitario**
- Estado declarado: **Publicado** — la ficha se anuncia como publicada en la tarjeta y en el detalle;
  el origen del estado es `dist/content.js` (`estado: 'publicado'`, sin `notaEstado`).

## De dónde sale el artefacto

El diseño aprobado es `demo/index.html` del paquete `Gaza_Integracion_Portafolio.zip` (versión visual
v0.3 restaurada). Se copió **literalmente**, sin editar una sola línea:

| Comprobación | Valor |
| --- | --- |
| SHA-256 del HTML aprobado | `F24943601DD0A1D5CAE0FC2F9D9D05D6E3A17421685807099060B8A2D80B70CC` |
| SHA-256 del HTML servido | `F24943601DD0A1D5CAE0FC2F9D9D05D6E3A17421685807099060B8A2D80B70CC` |

No se aplicaron los cinco rediseños v0.4 rechazados ni se tocaron modelos, métricas, fuentes, cortes
o denominadores. `python herramientas/verificar_paquete.py` valida los 53 archivos del paquete por
SHA-256.

## Arquitectura

El sitio del portafolio es estático y **`dist/` es su fuente canónica**: no hay generador, ni
`package.json` raíz, ni `src/` que produzca la carpeta publicada (`.openai/hosting.json` sirve `dist/`
tal cual, y `LEEME.txt` documenta que `dist/content.js` es el contenido editable). Por eso el cambio
se hace en `dist/` y no en un origen de build inexistente.

Se reutiliza el mecanismo de módulos del portafolio con el patrón de **página autónoma en marco del
mismo origen**, igual que «Clientes en movimiento» y «Clientes y campañas»:

1. `dist/dashboards/gaza-observatorio/index.html` — copia literal del HTML aprobado. Recursos
   integrados (D3 7.9.0 embebido con su aviso de licencia), sin peticiones externas ni backend.
2. `dist/projects/gaza-observatorio.js` — módulo que monta la página en la ficha: ancho completo,
   título accesible, altura ajustada al contenido real (`ResizeObserver` + respaldo por intervalo) y
   limpieza al salir. Mide 4 600 px de alto en escritorio: el observatorio no queda en miniatura ni
   obliga a un segundo desplazamiento de 400 px.
3. `dist/index.html` — alta del `<script src="projects/gaza-observatorio.js" defer>`, junto al resto.
4. `dist/content.js` — tarjeta y ficha del proyecto dentro del área `ciencia-de-datos`.

`dist/app.js` y `dist/style.css` **no se han modificado**: la tarjeta usa la clase compartida de
portada de tablero que ya existía (`.cover-tablero`, `object-fit: cover` y `object-position: top`).

## Tarjeta y portada

- Nombre: «Gaza · Vidas y territorio». Descripción: la aprobada, literal.
- Portada: `dist/img/gaza-observatorio-resumen.jpg`, **1600 × 1726** (proporción `1600 / 1726`), la
  misma geometría que Walmart M5, `object-fit: cover` desde arriba y versión `?v=1` para no servir
  caché vieja. Medida en el sitio: 527 × 569 px a 1440, 351 × 379 px a 390, igual que sus vecinas.
- La captura es real, del tablero servido: el encabezado de la cartografía bivariada con el
  denominador de 198 308 sitios, los controles de evaluación y ampliación, y el **mapa bivariado con
  su leyenda** de dos colores. No muestra la barra de pestañas: recorta la vista del mapa.
- Se regenera con `dashboards/clientes-campanas/integrado/tools/capturar-portadas.mjs --solo=gaza`,
  que fija el viewport al ancho del contenido del tablero, deriva la altura de la proporción de
  referencia y ajusta `deviceScaleFactor` para escribir el archivo ya en 1600 × 1726, sin reescalado
  y sin barras de desplazamiento.

## Contrato analítico preservado

Once pestañas: Impacto humano · Edades y prensa · **Cada punto, una vida** · Lesiones · Mapas y
cronología · **Sitios y trayectorias** · Experimento · Evidencia · Archivo completo · **Acceso y
respuesta** · Diseño y referencias. Las antiguas «Explorar sitios» y «Trayectorias» se unificaron en
una sola vista; «Acceso y respuesta» se añadió en la v0.3.4.

- Cada familia de cifras conserva su fuente y su fecha de corte en la cabecera del observatorio
  (reportes 10 nov 2026, edades 7 may 2026, daño satelital oct 2025, OMS may 2026).
- Un reporte no se llama incidente ni se trata como muerte del día; la falta de reporte no es cero
  (`#only24` y el aviso del calendario).
- Las categorías de lesiones se advierten como potencialmente solapadas y no se suman; las prótesis
  no se presentan como personas.
- El mapa bivariado usa el universo completo agregado (198 308 sitios, 1 352 celdas de 0,005
  grados); la exploración de «Sitios y trayectorias» trabaja sobre una muestra fija de 10 000 puntos
  y los perfiles de grupo sobre los 155 112 sitios del experimento.
- La validación del clustering se declara como partición de selección, no como prueba final
  independiente; el límite geográfico no es un frente militar; la fecha de evaluación no es la fecha
  del ataque.
- La lista nominal de fallecidos se incorpora solo en «Cada punto, una vida», con los límites de su
  fuente visibles (corte 7 may 2026, lista incompleta, edad declarada, sin fecha individual y con
  personas no identificadas fuera del conteo nominal). No completa nombres ni puntos: dibuja los
  72 835 registros documentados y solo ellos.

## Verificación ejecutada

Registro completo en `evidencias/gaza-observatorio/verificacion-integracion.log`.

| Comprobación | Resultado |
| --- | --- |
| `herramientas/verificar_paquete.py` (paquete recibido y tras las pruebas) | PASS · 53 archivos, 0 errores |
| `gaza_v1/redesign/verificar.py` | OK · 14 reconciliaciones, 10 vistas, sintaxis JS |
| `gaza_v1/verificar.py` (sobre copia) | PASS · 155 112 asignaciones, HTML autocontenido |
| `gaza_panel/verificar_panel.py` (sobre copia) | PASS · 2 776 312 filas, conteos y fechas |
| `node dashboards/gaza-observatorio/tools/verificar.mjs` | 32 comprobaciones OK (correcciones y vista nominal) |
| `node tools/verificar-gaza-integracion.mjs` (tras la vista nominal) | 25 comprobaciones OK, 1 aviso |
| `node dashboards/gaza-observatorio/tools/verificar-modulos-nuevos.mjs` (v0.3.4) | 44 comprobaciones OK, 0 fallos |
| `node dashboards/gaza-observatorio/tools/verificar-tooltips.mjs` (v0.3.3) | 55 comprobaciones OK, 0 fallos |
| `node tools/verificar-clientes-en-movimiento.mjs` | sin fallos |
| `node dashboards/clientes-campanas/integrado/tools/verificar-servido.mjs` | 32 comprobaciones OK |

Lo que cubre el verificador de integración: tarjeta con nombre, etiqueta, descripción aprobada,
portada de 1600 × 1726 en la caja de Walmart M5, estado no publicado, enlace y alineación de fila;
ficha con sus apartados y nota de estado; marco de 1092 px de ancho por 4 600 de alto; once
pestañas; «Cada punto, una vida» con 21 637 menores y su aviso de lista incompleta; cortes por
fuente; calendario con año, métrica y «solo 24 h» (1 139 marcas de día) y
recalculo de cobertura al cambiar de año; selección de círculo y detalle del reporte; mapa bivariado
con leyenda, 14 evaluaciones, control de mínimo de sitios y descarga `gaza_celdas.json`; «Explorar
sitios» con muestra declarada, gobernaciones, grupos y ficha vinculada; lesiones con aviso de
solapamiento; experimento con 0,701 y 36 223 sitios de validación; archivo con 61 filas, búsqueda,
paginación y descarga JSON del filtro; HTML idéntico al aprobado; cero peticiones externas del
módulo; ida y vuelta al área; recarga de la URL directa; foco visible y barra de pestañas con
teclado; consola y recursos sin errores a 1440, 1024 y 390 px.

## Correcciones de la revisión (v0.3.1)

Ahora el observatorio se construye desde su código fuente en el repositorio
(`dashboards/gaza-observatorio/fuente/`), no editando `dist/`. El procedimiento es el de
la entrega, sin reescribirlo: `fuente/construir_observatorio.py` (v0.2) y
`fuente/construir_redesign.py` (v0.3), orquestados por `tools/construir.py`, que publica
`dist/dashboards/gaza-observatorio/index.html`. Antes de tocar nada, el procedimiento
reproducía el HTML servido byte a byte (SHA-256 `f2494360…`), lo que confirma que la
fuente es la correcta.

### 1. Periodistas: exploración nominal y lectura de la curva

La entrega dibujaba 263 puntos anónimos a partir del acumulado publicado y una curva sin
controles. Como el paquete incluye la lista pública de prensa (263 registros con nombre
original, nombre en inglés y nota de la fuente), la vista ahora:

- dibuja **un punto por registro** de la lista, en el orden de la fuente, con búsqueda por
  nombre y nota, contador «N de 263», botón de limpieza y aviso explícito sin coincidencias;
- permite seleccionar el punto con clic o con flechas y Enter, y abre una **ficha** con
  nombre original (con dirección de escritura automática), nombre en inglés y nota original;
  el punto seleccionado se marca con anillo oscuro;
- añade encima de la curva **año del reporte**, **corte publicado** (fecha y acumulado),
  **anterior/siguiente** deshabilitados en los extremos, detalle de fecha y valor exactos y
  **selección directa de puntos** con ratón o teclado.

Los dos alcances siguen separados: la búsqueda afecta la lista nominal y el año/corte afectan
la serie acumulada; no hay correspondencia documentada entre una persona y una fecha. Las
fechas se declaran como fechas de **reporte** y se advierte que las diferencias entre
acumulados no son muertes ocurridas ese día.

### 2. Mapa bivariado más grande

- El mapa ocupa el ancho de su sección (1 312 px a 1440) con la proporción original 660:780.
- La leyenda de dos colores y el detalle de celda pasaron **debajo** del mapa, en dos columnas,
  para no comprimir la cartografía.
- Barra de **ampliación de 100 % a 250 %** y botón **«Ajustar mapa»**; por encima del 100 % el
  mapa se recorre dentro de su marco (`max-height: 78vh`) y la página no desborda.
- La ampliación y la posición se conservan al cambiar de evaluación o de mínimo de sitios;
  «Ajustar mapa» restablece escala y desplazamiento. La celda seleccionada queda marcada.
- No cambian celdas, colores, cálculos ni denominadores.

### 3. «Sitios y trayectorias»

Las dos pestañas se unificaron en una: explicación breve → filtros de gobernación, grupo y
color → mapa de la muestra con detalle del sitio → perfiles temporales de los grupos. La
explicación declara que cada punto es un sitio de la muestra, que un grupo reúne secuencias
parecidas, que «trayectoria» es evolución de clasificaciones y no desplazamiento, que el color
por grupo y por daño final son variables distintas, que las 14 evaluaciones no son 14 meses y
que los perfiles describen el experimento completo, no la muestra.

El detalle del sitio muestra las **14 clasificaciones** con número, clase legible, color y
fecha de evaluación (con el aviso de que es la fecha de la observación satelital, no la del
daño), y añade **«Comparar con su grupo»**. Los perfiles destacan el grupo del sitio
seleccionado, mantienen los demás, explican que cada columna es el 100 % del grupo del
experimento, permiten consultar evaluación, clase y porcentaje con clic o teclado y conservan
**«Filtrar este grupo en el mapa»** para volver a la exploración.

### Interacciones

Mapa, selector de sitio, ficha y grupo destacado comparten el mismo estado; «Siguiente sitio»
recorre solo el conjunto filtrado; la selección se conserva si sigue siendo válida; si un
filtro deja cero sitios se limpian ficha, secuencia y selector y se deshabilitan las acciones,
con un mensaje explícito. La navegación por teclado de las pestañas se reajustó a las diez
vistas y no quedan enlaces a la pestaña retirada.

### Verificación de esta iteración

`node dashboards/gaza-observatorio/tools/verificar.mjs` → **26 comprobaciones OK, 0 fallos**
sobre el build servido: búsqueda con y sin resultados, limpieza, ficha coherente y punto
marcado, extremos de anterior/siguiente, ampliación 250 % sin desbordar, zoom conservado al
cambiar de evaluación, «Ajustar mapa», selección de celda y exportación, unificación y
aclaraciones, 14 clasificaciones con fecha, «Siguiente sitio» dentro del filtro, sincronía del
grupo destacado, franjas consultables, retorno del perfil al mapa, estado vacío sin residuos,
teclado en puntos/curva/celdas/franjas/pestañas, cifras originales (74 645 · 175 978 · 21 976 ·
263 · 155 112 · 0,701), las otras seis secciones intactas, 390 px sin desbordamiento, la ficha
del portafolio montando el observatorio y cero errores de JavaScript o 404.

## «Cada punto, una vida» (v0.3.2)

Una vida por punto. La vista dibuja la **lista nominal** de personas identificadas en Gaza: un punto
es una persona registrada con nombre y edad, no una estimación ni un promedio. La inspiración es la
camiseta del homenaje; la base es la lista nominal documentada, sin inventar ni completar nada.

### Fuente y alcance

| Dato | Valor |
| --- | --- |
| Fuente | Tech for Palestine — *Killed in Gaza*, a partir de las listas del Ministerio de Salud de Gaza |
| Corte de la lista nominal | **7 de mayo de 2026** |
| Registros nominales | **72 835** (todos con nombre y edad numérica) |
| Menores de 18 años | **21 637** — selección inicial |
| Menores de 5 años | **5 293** |
| Adultos (18+) | **51 198** |
| Acumulado diario del observatorio | 74 645 reportados al **10 de noviembre de 2026** |

Los dos cortes son distintos y así se declara en la propia pestaña: el acumulado diario llega a
74 645 fallecidos al 10 nov 2026, mientras la lista nominal se cierra el 7 may 2026. La diferencia
incluye personas no identificadas, por eso **no se rellena**: la vista no completa nombres, edades ni
puntos artificiales. La fuente permite visibilizar a las personas identificadas **en Gaza**, no a
todos los niños fallecidos en Palestina; esa precisión aparece en el aviso y en la ficha de cada
persona.

Advertencias que la vista mantiene visibles: la edad es **declarada** (0 = menos de un año, sin poder
distinguir meses o días), no hay **fecha individual** de fallecimiento, la lista es **incompleta** y su
orden por edad y nombre no representa lugar ni fecha.

### Qué hace

- **Cuadrícula sin muestreo.** Los 21 637 puntos se dibujan completos sobre `canvas`, con una fila por
  edad y solo las filas visibles repintadas en cada cuadro de desplazamiento. No hay aleatoriedad ni
  subconjunto: el contador dice siempre el total de la selección.
- **Color = edad.** Violeta intenso para los más pequeños, aclarándose hasta el mínimo contraste
  legible en los 17 años; todos los puntos del mismo tamaño. La posición ordena por edad y luego por
  nombre, no por lugar ni por fecha, y la leyenda lo dice.
- **Controles sobre el gráfico.** Universo (Niños y adolescentes 0–17 · Adultos 18+ · Todas las
  edades), edad mínima y máxima, y búsqueda por nombre en árabe o transliterado. Un intervalo
  imposible se señala en vez de devolver una vista vacía sin explicación.
- **Ficha de la persona.** Nombre original en árabe, transliteración, edad declarada y procedencia
  («lista nominal de Tech for Palestine, listas del Ministerio de Salud de Gaza, corte 7 de mayo de
  2026»), más el aviso de que no hay fecha individual. Se abre con clic, con las flechas y con
  Inicio/Fin.
- **Tabla accesible.** Los nombres en una tabla con 25 filas por página y 866 páginas, navegable y
  seleccionable; el estado vacío y el botón de reinicio están previstos.
- Lectura en móvil: una columna, lienzo de 460 px y sin desbordamiento de la página.

### Cómo se construye

El código fuente de la vista vive en `dashboards/gaza-observatorio/fuente/memoria/` (sección
estática, guion y hoja de estilos) y los 72 835 registros en `memoria/personas.json`, extraídos de la
referencia entregada. `construir_memoria.py` los incrusta en el documento ya armado por los
constructores v0.2 y v0.3 —estilos al final del último `<style>`, botón de pestaña tras «Edades y
prensa», sección antes de `#personas` y guion con los datos— y `tools/construir.py` publica el
resultado en `dist/dashboards/gaza-observatorio/index.html`. Nada se edita a mano en `dist/`.

### Verificación de esta iteración

`node dashboards/gaza-observatorio/tools/verificar.mjs` → **32 comprobaciones OK, 0 fallos**;
`node tools/verificar-gaza-integracion.mjs` → **25 comprobaciones OK, 1 aviso** (Google Fonts del
cascarón, previo). Cubierto: 21 637 puntos pintados sin muestreo, universos 51 198 / 72 835, 5 293
menores de 5, intervalo inválido, búsquedas con resultado («Salhi» 27) y sin él, estado vacío,
reinicio, tabla de 25 por página con paginación y selección, teclado en la cuadrícula, ausencia de
identificadores duplicados, las cifras originales intactas (74 645 · 175 978 · 21 976 · 263 ·
155 112 · 0,701), 390 px sin desbordamiento y cero errores de JavaScript o 404.

Capturas en `evidencias/gaza-observatorio/cada-punto/` (`01-cada-punto-inicio` a `06-cuadricula`,
`07-ficha-textos-actualizados`, más las medidas de la barra de controles a 1440 y 390 px) y registro
en `evidencias/gaza-observatorio/cada-punto/verificacion-cada-punto.log`.

La ficha del portafolio se ajustó para no contradecir la nueva vista: «Fuentes y datos» ya no dice
que el archivo nominal queda fuera, «Limitaciones» recoge los límites propios de la lista (corte
distinto, lista incompleta, edad declarada, sin fecha individual, Gaza y no toda Palestina) y
«Método», «Resultados» y «Mi contribución» describen la cuadrícula sin muestreo y las cifras
21 637 · 5 293 · 51 198 · 72 835. El resumen corto de la tarjeta —el texto aprobado— no se tocó.

## Lesiones, prótesis y tooltips compartidos (v0.3.3)

Incremento sobre la versión activa del repositorio, no sobre el HTML de referencia. Se portaron las
dos gráficas corregidas y se añadió un tooltip a todas las visualizaciones.

### Divergencias con el paquete `Observatorio_Gaza_Acceso_y_Respuesta_v0.11.zip`

| Punto | Referencia v0.11 | Repositorio (fuente de verdad) | Decisión |
| --- | --- | --- | --- |
| `gaza_v1/expansion/visualizaciones.js` | 14 089 B, etapa de expansión previa al rediseño (aún llama a `tab('humano')`) | 20 115 B en la versión activa, con las correcciones v0.3.1 y «Sitios y trayectorias» unificado | Se portaron **solo** las dos gráficas; el archivo no se sustituye |
| Edades y prensa | `impacto_perfiles.js` + `impacto-perfiles.css` (enjambre de puntos) | No existen en el repositorio; la vista usa barras por grupo y el registro nominal de prensa | No se rediseña: se añade tooltip, como pide el alcance aditivo |
| Compilación | `construir_observatorio.py` (6 534 B) y `construir_redesign.py` (3 859 B) del paquete | Constructores propios de `gaza-observatorio/fuente/` | Se mantiene la cadena activa (`tools/construir.py`) |
| Cifras | 22 366–29 075 · 8 602–11 183 · 5 161–6 710 · 3 441–4 473 · 2 065–2 684 · 1 376–1 789 · 2 277 · 502 | Idénticas en `observatorio.json` | Sin cambios de datos, métricas ni cortes |
| Tooltips | Globos nativos del navegador (`<title>`) | Componente compartido propio | Aditivo: el globo nativo se retira al vuelo y lo sustituye el componente |

### Objetivo A · rangos de lesiones

Seis filas, una por categoría, con escala lineal común de **0 a 30 000** y marcas cada 5 000. El
mínimo se dibuja en índigo `#4b55ff` y el máximo en lavanda `#9b8bc4`; el segmento entre ambos
representa **solo** el rango publicado y no interpola valores intermedios. Los dos valores exactos
se escriben en su propia columna, separada del área de dibujo para que el rango más largo no los
tape. Se conservan las aclaraciones: escenarios estimados de necesidades de rehabilitación, no
intervalos de confianza; categorías potencialmente solapadas que no deben sumarse; fuente OMS y su
corte. Las seis filas son enfocables y se recorren con las flechas.

### Objetivo B · evaluación y prótesis

Dos barras independientes con eje común de **0 a 2 500** y etiquetas directas: **2 277 personas con
amputaciones evaluadas** y **502 prótesis colocadas**. No hay Sankey, embudo, conexión, flecha ni
orden implícito entre ambas: no se dibuja ninguna relación, no se calcula tasa, cobertura, déficit ni
personas sin prótesis. Se mantiene visible el periodo septiembre 2024 – mayo de 2026 y la nota de que
el 18 % corresponde solo a la cohorte evaluada.

### Objetivo C · tooltip compartido

Un solo componente (`expansion/tooltip.js` + `expansion/tooltip.css`) enganchado por delegación: toda
gráfica que se vuelva a pintar al cambiar un filtro queda cubierta sin registrar nada de nuevo.

- **Ratón:** aparece al pasar por puntos, celdas, barras, intervalos, círculos y franjas; se oculta al
  salir; se coloca en `position:fixed` y se recorta a la ventana para que ningún contenedor con
  `overflow` lo corte.
- **Teclado:** disponible al recibir foco; las marcas ya enfocables lo conservan (días del calendario,
  círculos de reporte, puntos de prensa, celdas del bivariado, franjas de grupo, barras de cobertura) y
  se añadieron las seis filas de lesiones y las dos barras de prótesis. Escape lo cierra.
- **Tacto:** un toque lo muestra y lo fija con control de cierre; un segundo toque, el botón ✕ o un
  toque fuera lo ocultan. No se depende del hover.
- **Contenido:** valores exactos, unidades, serie o categoría, fecha o corte, fuente y definición; en
  los intervalos se nombran «mínimo estimado» y «máximo estimado» con su color.
- **Accesibilidad:** `aria-label` ya existente o generado, región viva que anuncia el contenido, foco
  visible y tablas de datos equivalentes en las vistas que las tienen. Ninguna categoría se comunica
  solo por color.

### Inventario de gráficas y tooltips (medido con `tools/inventariar-graficas.mjs`)

| Pestaña | Gráfica | Marca que dispara | Contenido |
| --- | --- | --- | --- |
| Impacto humano | `#calendar` | día (1 131 marcas, 1 131 enfocables) | fecha, valor, periodo, fuente y corte |
| Impacto humano | `#cumulative` | punto (1 101) | serie, fecha, acumulado y lectura del valor |
| Impacto humano | `#reportPack` | círculo (926, 884 enfocables) | fecha y fallecidos de 24 h; año o mes en los grupos |
| Edades y prensa | `#ageChart` | barra (10) | grupo, sexo, conteo, porcentaje y total del grupo |
| Edades y prensa | `#pressDots` | punto (263, todos enfocables) | nombre y registro n de 263 |
| Edades y prensa | `#pressTrend` | corte (176, todos enfocables) | fecha, acumulado, año elegido |
| Cada punto, una vida | `#memCanvas` | punto por proximidad | nombre árabe, transliteración, edad, registro n |
| Lesiones | `#injuryChart` | fila y extremos (6 enfocables) | categoría, mínimo, máximo, fuente OMS |
| Lesiones | `#prosthetics` | barra (2 enfocables) | indicador, valor, periodo y aviso de no tasa |
| Mapas y cronología | `#biMap` | celda (1 161, todas enfocables) | cobertura, observados y destruidos |
| Mapas y cronología | `#pairedMaps` | sitio por proximidad (10 000 × 2) | clase, evaluación y fecha |
| Sitios y trayectorias | `#map` | sitio por proximidad (10 000) | sitio, gobernación, grupo y clase final |
| Sitios y trayectorias | `#profiles` | franja (286) | grupo, evaluación, fecha, clase y porcentaje |
| Evidencia | `#coverage` | barra (14 enfocables) | evaluación, sitios y porcentaje del universo |
| Archivo completo | `#fieldChart` | punto (1 101) | fecha y valor del campo elegido |

**15 contenedores de gráfica, ninguno sin tooltip.** Las pestañas «Experimento» y «Diseño y
referencias» no tienen gráficas: muestran métricas, tablas y fichas de diseño.

### Verificación de esta iteración

`node dashboards/gaza-observatorio/tools/verificar-tooltips.mjs` → **55 comprobaciones OK, 0 fallos**
sobre el build servido (`sha256 8115b9c3b489…`): seis categorías con mínimo índigo y máximo lavanda,
escala 0–30 000 rotulada, seis rangos escritos, aclaración de escenarios visible, dos barras con eje
0–2 500 y sin flechas ni flujo, tooltip con contenido y dentro de la ventana en las quince gráficas,
proximidad en los dos mapas de clasificación y en los dos lienzos, tooltip al enfocar en las nueve gráficas con marcas enfocables, cierre con Escape,
toque que fija y se cierra con ✕ o toque fuera, globo de 370 px en pantalla de 390 y cero
desbordamiento. Los otros dos verificadores siguen en verde: 32 comprobaciones
(`tools/verificar.mjs`) y 25 más un aviso (`tools/verificar-gaza-integracion.mjs`).

Capturas en `evidencias/gaza-observatorio/tooltips/` (`01-lesiones-rangos`, `02-protesis-barras`,
`03-tooltip-lesion`, `04-tooltip-calendario`, `05-tooltip-mapas`, `06-tooltip-cuadricula`,
`07-tablero-integrado`, versión móvil), el inventario medido en `inventario-graficas.json` y los
registros `verificacion-tooltips.log`, `verificacion-observatorio.log` y `verificacion-integracion.log`.

El tooltip funciona también dentro del marco de la ficha del portafolio: se comprobó con
`tools/verificar-tooltip-ficha.mjs` (globo visible sobre la primera fila de lesiones, sin errores de
JavaScript) y el resultado quedó en `verificacion-ficha.log` con la captura `09-tooltip-en-ficha.png`.

## Edades en dos vistas y «Acceso y respuesta» (v0.3.4)

Cierre de la integración del paquete v0.11: los dos módulos que faltaban están ahora **en la
navegación y visibles en el build servido**, no solo presentes en el repositorio.

### Edades · trama de cien celdas y pirámide de puntos

- **Trama (`#ageWaffle`).** Cien celdas a todo el ancho de la tarjeta, repartidas por mayores residuos
  para que sumen el 100 % de las 72 835 personas sin sesgo por orden. Cuatro franjas de color con
  botones seleccionables (`aria-pressed`), conteo exacto y porcentaje en cada franja y línea de
  detalle con el total: 21 637 niños y adolescentes (29,7 %), 11 229 jóvenes (15,4 %), 34 795 adultos
  (47,8 %) y 5 174 personas mayores (7,1 %).
- **Pirámide (`#ageChart`).** Sustituye a las barras por la versión de la referencia: un punto ≈100
  registros por lado, sexo registrado a izquierda y derecha, etiqueta de franja en el centro, conteo y
  porcentaje exactos en los bordes. El selector alterna entre **grupos** (5 franjas, 733 puntos) y
  **edad por año** (111 filas con `age_hist`). Cada franja es enfocable y la tabla accesible de cinco
  filas sigue debajo con su recuento.
- Ambos bloques usan `H.ages`, `H.age_total` y `H.age_hist` del `observatorio.json` activo: no se
  introdujeron datos nuevos ni se recalculó ninguna cifra.

### Acceso y respuesta · cuatro vistas

Se incorporaron `respuesta.html`, `respuesta.css` y `respuesta.js` de la referencia tal cual, con dos
añadidos aditivos: el ámbito del tooltip compartido en cada gráfica y su fuente con corte. Cuatro
vistas conectadas a la navegación del observatorio:

1. **Acceso y logística** · flujo 480 manifestados → 367 descargados (11–25 oct 2026, corredor de
   Egipto) más la segunda ventana con 1 857+, 11 % y 38 700+.
2. **Seguridad alimentaria** · IPC con conmutador personas / porcentaje (1,2 M → 1,4 M; 59 % → 67 %),
   notas de fase 3, fase 4 y cobertura geográfica, y contraste oferta / acceso económico.
3. **Respuesta y financiación** · nueve sectores ordenables por cobertura o brecha, con montos
   recibidos y requeridos, control de consistencia del dato fuente y alcance por sector en Gaza y
   Cisjordania.
4. **Efectivo y mercados** · cuatro indicadores postdistribución con medidor, lectura en dos capas y
   la siguiente capa analítica de precios.

### Tabla de paridad · módulo del ZIP v0.11 ↔ portafolio

| Módulo del ZIP | Dónde está en el portafolio | Estado |
| --- | --- | --- |
| `expansion/impacto_perfiles.js` (trama de 100 celdas) | pestaña «Edades y prensa», primera tarjeta (`#ageWaffle`, `#ageLegend`, `#ageDetail`) | **Integrado y visible** |
| `expansion/impacto-perfiles.css` | hoja del build (`.ageprofile-*`, `.age-waffle`, `.age-tile`, `.age-legend`) | **Integrado** |
| Pirámide de puntos (`ageChart` de `expansion/visualizaciones.js`) | pestaña «Edades y prensa», segunda tarjeta (`#ageChart`, `#ageTable`) | **Integrado y visible** |
| `redesign/respuesta.html` | pestaña «Acceso y respuesta» (`#respuesta`, 4 paneles `#rview-*`) | **Integrado y visible** |
| `redesign/respuesta.css` | hoja del build (`.response-*`, `.funding-*`, `.ipc-*`, `.cash-*`, `.reach-*`) | **Integrado** |
| `redesign/respuesta.js` | guion del build; dibuja las cuatro vistas | **Integrado** |
| Lesiones y prótesis de `expansion/visualizaciones.js` | pestaña «Lesiones» (v0.3.3) | Integrado antes |
| `redesign/exploracion.js` / `exploracion.css` (bivariado y sitios) | equivalente activo del repositorio: `redesign/redesign.js` + `template.html` | Ya presente (divergencia declarada) |
| `redesign/memorial.js` / `memorial.css` | equivalente activo: `memoria/memoria.js` y `memoria.css` | Ya presente |
| `construir_observatorio.py`, `construir_redesign.py` | cadena propia `tools/construir.py` + `fuente/construir_*.py` | Divergencia declarada |
| Tooltips | componente propio del repositorio, extendido a las gráficas nuevas | Aditivo |

### Verificación ejecutada sobre el build servido

`node dashboards/gaza-observatorio/tools/verificar-modulos-nuevos.mjs` → **44 comprobaciones OK, 0
fallos**, con capturas tomadas de la compilación:

- once pestañas en la navegación con «Acceso y respuesta» presente;
- trama: 100 celdas, cuatro franjas, cuatro botones con su conteo, detalle que cambia al seleccionar
  (Adultos 34 795 · 47,8 %) y ancho completo (1 302 de 1 364 px);
- pirámide: 5 franjas enfocables, 733 puntos, 111 filas en modo edad, porcentajes y tabla accesible;
- las cuatro vistas de respuesta con sus gráficas, el conmutador de IPC, el orden por brecha, el panel
  de fuentes y tooltips en acceso, IPC, financiación, alcance y efectivo;
- 390 px sin desbordamiento en las dos pestañas nuevas, sin errores de JavaScript.

Los demás verificadores siguen en verde sobre el mismo build: **32** comprobaciones
(`tools/verificar.mjs`, ya con once pestañas), **25 + 1 aviso** (`tools/verificar-gaza-integracion.mjs`)
y **55** (`tools/verificar-tooltips.mjs`). El inventario medido sube a **21 contenedores de gráfica**,
todos con tooltip.

Build servido: `dist/dashboards/gaza-observatorio/index.html`, 9 199 335 B, sha256
`f5b9b52736e2660dfacb…`, idéntico a `dashboards/gaza-observatorio/fuente/dist/index.html`. Se sirve en
`http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html` (raíz estática `dist/`) y dentro del
portafolio en `http://127.0.0.1:8000/#/area/ciencia-de-datos/gaza-observatorio`.

Capturas en `evidencias/gaza-observatorio/modulos-nuevos/`: `01`–`09` del build directo y
`10`–`18` tomadas **dentro de la ficha del portafolio** (trama, trama con selección, pirámide por
grupos, pirámide por edades, las cuatro vistas de respuesta y la pestaña completa).

## «Edad por año» paginada (v0.3.5)

En el modo «Edad por año» las 111 edades se dibujaban en un solo SVG: al ajustarse al ancho de la
tarjeta, las etiquetas y los valores quedaban ilegibles. Ahora se muestran **quince edades por vista**
con navegación accesible.

- **Controles.** «← Anterior» y «Siguiente →» con `aria-controls` y `aria-label` propios, y un
  indicador con región viva: «Edades 0–14 · 15 de 111 edades · vista 1 de 8». Los extremos
  deshabilitan el botón correspondiente y el foco salta al otro botón para no perderse.
- **Ocho vistas que recorren la edad 0 hasta la 110 sin saltarse ninguna** (la última lleva seis
  edades, 105–110). La paginación **solo elige qué edades se dibujan**: no filtra, no recalcula y no
  toca el universo; la tabla completa sigue sumando 50 959 + 21 876 = **72 835** registros.
- **Filas legibles.** Paso de 44 unidades por fila (≈51 px en pantalla), puntos de radio 4 en una sola
  línea —hasta quince por lado, según el conteo— y tipografía de 12,5–13 px para los valores y las
  etiquetas. El dibujo se renderiza entre 820 y 1 050 px: en escritorio se ve a tamaño natural y en
  móvil se recorre en horizontal **en lugar de reducirse** hasta quedar ilegible.
- **Se conserva** el eje central con la etiqueta de edad, los conteos exactos y porcentajes de ambos
  sexos en los bordes, el tooltip compartido en cada fila y de cada punto, y la tabla accesible —que
  ahora sigue a la vista— más un desplegable «Todas las edades en tabla (111 filas)» para que ningún
  registro quede fuera del alcance.
- **«Grupos de edad» sigue siendo la vista general**: cinco franjas, sin paginación visible.

Verificación: `node dashboards/gaza-observatorio/tools/verificar-edades-paginadas.mjs` → **27
comprobaciones OK, 0 fallos**: quince filas por vista, rango anunciado, recorrido completo de las 111
edades en ocho vistas (0→110), extremos deshabilitados, retroceso con «Anterior», suma de 72 835,
tooltip con edad y valores, teclado y foco, y móvil a 390 px sin desbordamiento con el dibujo a 820 px
dentro de una caja de 320. Siguen en verde: 45 (módulos nuevos), 55 (tooltips), 32 (observatorio) y
25 + 1 aviso (integración).

Build servido: `dist/dashboards/gaza-observatorio/index.html`, 9 203 840 B, sha256
`20770bc2801c0bf0…`, idéntico a `fuente/dist/index.html`, en
`http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html` y en la ficha
`http://127.0.0.1:8000/#/area/ciencia-de-datos/gaza-observatorio`.

Capturas en `evidencias/gaza-observatorio/edades-paginadas/`: `01` escritorio, `02` última vista,
`03` móvil, `04`–`07` tomadas dentro de la ficha del portafolio (paginación, gráfica, tarjeta y última
vista) y `08`–`09` la ficha en móvil. La captura `05-ficha-escritorio-grafica.png` es la que muestra
las etiquetas y los valores con claridad.

## «Grupos de edad» ampliada y maqueta móvil (v0.3.6)

La vista general de la pirámide se dibujaba con filas de 86 unidades y puntos de radio 2,7, así que
al ajustarse al ancho de la tarjeta las cifras quedaban pequeñas. Ahora **ocupa el ancho completo y se
lee sin hacer zoom**.

- **Escritorio.** ViewBox de 1 300 unidades (escala ≈1,0 en la tarjeta del observatorio), filas de
  **134 unidades** de alto, puntos de **radio 4,4** con ocho por columna y tipografía de **16,5
  unidades** para conteos, porcentajes y etiquetas de grupo. Se conservan los dos totales de cabecera
  (Masculino · 50 959 y Femenino · 21 876), las cinco franjas con su etiqueta y la escala de «un punto
  ≈ 100 registros». Medido en el build: fila de 133 px, cifras de 16,6 px efectivos, puntos de 4,4 px
  y ancho de 1 314 px (el 100 % de la tarjeta).
- **Móvil (maqueta propia, no la de escritorio encogida).** La gráfica se construye con el **ancho real
  medido** (1 unidad = 1 px) como una lista de bloques: título del grupo y total, y por cada sexo su
  conteo con porcentaje seguido de los puntos —en la misma línea si caben; si no, envueltos debajo—.
  Medido: escala 1,0, cifras de 12 px y etiquetas de 13,5 px, sin desplazamiento horizontal ni
  desbordamiento de página y **cero cruces** entre textos y puntos.
- La maqueta se elige por ancho y se recalcula sola cuando la tarjeta cambia de tamaño (`ResizeObserver`
  con umbral de 720 px), así que dentro de la ficha del portafolio —marco de 966 px en escritorio y
  281 px en móvil— también se lee.
- Se mantienen la paginación de quince edades por vista en «Edad por año», los tooltips por fila y por
  punto, la tabla accesible, el desplegable con las 111 edades y todos los datos sin cambios.

### Verificación de los dos modos, por separado

`node dashboards/gaza-observatorio/tools/verificar-edades-dos-modos.mjs` → **30 comprobaciones OK, 0
fallos**:

| Modo | Escritorio (1 440) | Móvil (390) |
| --- | --- | --- |
| Grupos de edad | 5 filas · paso 133 px · cifras 16,6 px · puntos r 4,4 · ancho 1 314 px (100 % de la tarjeta) · dos totales · sin paginación | maqueta compacta · 5 bloques · escala 1,0 · cifras 12 px · puntos r 2,9 · 281 px de ancho · 0 cruces |
| Edad por año | 15 filas · cifras 13,4 px · paginación visible · rango «Edades 0–14 · 15 de 111 edades · vista 1 de 8» | 15 bloques · escala 1,0 · cifras 12 px · 0 cruces · sin desbordamiento |

Y medido **dentro de la ficha** con `tools/medir-edades-ficha.mjs`: grupos 5 filas con cifras de 13,4 px
efectivos (escala 1,073 sobre 966 px) y móvil 5 bloques con cifras de 12 px (escala 1,0 sobre 281 px),
sin desbordamiento en ninguno de los dos.

`node dashboards/gaza-observatorio/tools/verificar-edades-paginadas.mjs` → **29 comprobaciones OK**
(paginación intacta, recorrido 0→110, suma de 72 835). Los demás verificadores siguen en verde: 45
(módulos nuevos), 55 (tooltips), 32 (observatorio) y 25 + 1 aviso (integración).

Build servido: `dist/dashboards/gaza-observatorio/index.html`, 9 208 706 B, sha256
`1e565552e9fa9d52…`, en `http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html` y en la ficha
`http://127.0.0.1:8000/#/area/ciencia-de-datos/gaza-observatorio`.

Capturas en `evidencias/gaza-observatorio/edades-dos-modos/`: `01`–`03` del build directo (grupos,
tarjeta y edad por año), `04`–`06` móvil, y `10`–`18` **dentro de la ficha del portafolio**
(`11` grupos en escritorio, `13` edad por año en escritorio, `16` grupos en móvil, `18` edad por año en
móvil, más las vistas de página completa).

## Panel «Experimento»: pronóstico y validación (v0.3.7)

La pestaña «Experimento» conserva etiqueta, posición y ruta, pero **su contenido es ahora el módulo
de pronóstico y validación** del paquete `Observatorio_Gaza_Modelos_Pronostico.zip`. No se añadió
proyecto, tarjeta, página ni pestaña: se sustituyó lo que aparece al seleccionarla.

- **Origen.** `prediccion/dashboard.html`, `dashboard.css` y `dashboard.js` del paquete, portados a
  `fuente/pronostico/`. Los valores salen de las salidas empaquetadas (`pronostico_muertes_directas.json`,
  `pronostico_fallecimientos.json`, `pesos_fallecimientos.json`, `pronostico_dano_zonas.json`,
  `riesgo_aumento_dano_sitios.json`) incrustadas como `datos.json`: **no se reconstruyó ninguna cifra ni
  se entrenó nada en el navegador**.
- **Pronóstico directo (`killed_truce_new`), primero y como foco.** Corte **2026-11-11** leído del JSON,
  con **506** informes válidos: **3,7** para 1 día (12 nov; candidato ML 5,0; rango empírico 90 %
  **0–9,3**) y **23,8** para 7 días (12–18 nov; candidato ML 30,0; rango **5,8–41,8**). El peso elegido
  en validación se declara en la propia tarjeta: **0 % ML / 100 % referencia** en ambos horizontes, y
  el escenario ML se muestra aparte. **28 días: «No estimable»** (una ventana completa desde octubre de
  2025 y ninguna desde enero de 2026).
- **Validación del pronóstico directo.** Tabla por horizonte con dos decimales: 1 día n=55, MAE ML
  **2,71** frente a referencia **3,32** y cobertura **89,10 %**; 7 días n=21, MAE **5,15 / 10,88** y
  cobertura **76,20 %**. Se advierte que las ventanas semanales se solapan y que el test final no se usó
  para escoger el peso.
- **Histórico de conteos reportados.** Gráfica de las últimas 90 fechas con observado, candidato ML,
  referencia estacional, mezcla (65/10/0/25) y banda del rango empírico, más tabla por periodo; el texto
  distingue explícitamente `killed` del objetivo `killed_truce_new`.
- **Daño por zona.** KPIs de MAE **5,50 pp** del ML frente a **4,40 pp** de persistencia, mapa por celda
  con filtro de gobernación y de métrica (pronóstico / observado / ancho del rango), tablas por
  gobernación y por corte, y el último corte real **2025-10-11** declarado en la ficha lateral.
- **Cambio de clasificación por sitio.** Objetivo `Damage_Status ∈ {1,3,4}`, AP 34,3 % (8,8 % sobre la
  referencia), ROC-AUC y Brier del combinado, mapa de probabilidad media por celda, tablas de prueba por
  evaluación y por gobernación, y escenario agregado. El corte se rotula como **histórico/condicional**
  (11 oct 2025), nunca como riesgo actual, y se recuerda que no se cruzan sitios con víctimas.

### Navegación y encapsulado

- Los tres análisis internos son **pestañas del panel** (`div[role=tablist]` + `div[role=tabpanel]`), no
  pestañas del proyecto: el conmutador del observatorio consulta `nav button` y `section[role=tabpanel]`,
  así que la navegación interna queda fuera de su alcance y el contador sigue en once vistas.
- Los estilos del prototipo se **delimitan a `#experimento`** (todos los selectores llevan el prefijo y
  las variables `--ink`, `--muted`, `--blue`… se redefinen solo dentro del panel), de modo que `.card`,
  `.kpi`, `.chart` o `.legend` del prototipo no tocan el resto del observatorio.
- El guion vive en un **IIFE** con las consultas acotadas al panel, sin `#payload`, sin `#tip` propio y
  sin listeners de documento: los tooltips usan el **componente compartido** (`window.TIP`), que ya
  resuelve ratón, teclado y tacto. Al entrar y salir de la pestaña no se duplican tarjetas, gráficas ni
  manejadores.
- El guion anterior del panel se neutraliza con una guarda en `template.html`, porque sus nodos
  (`#scores`, `#candidates`, `#stability`, `#sensitivities`, `#baseline`, `#diagnostics`) ya no existen.

### Verificación

`node dashboards/gaza-observatorio/tools/verificar-pronostico.mjs` → **51 comprobaciones OK, 0 fallos**:
pestaña conservada (etiqueta «Experimento», once vistas del proyecto, tres análisis internos), cifras
3,7 / 23,8 con sus rangos y candidatos ML, tarjeta de 28 días, corte y 506 informes leídos del JSON,
tabla de validación con 2,71 / 3,32 / 89,10 % y 5,15 / 10,88 / 76,20 %, gráfica histórica con tooltip,
mapa de celdas con filtro funcional (1 161 → 261), tooltip de celda, tercer análisis con AP y tablas,
**sin IDs duplicados**, once secciones con contenido, un solo componente de tooltip, otras pestañas
intactas, reentrada sin duplicados y móvil sin desbordamiento.

Resto de la batería en verde sobre el mismo build: **32** (`verificar.mjs`, con la comprobación de
cifras actualizada al pronóstico), **25 + 1 aviso** (`verificar-gaza-integracion.mjs`), **55**
(tooltips), **45** (módulos nuevos), **30** (edades, dos modos) y **29** (paginación).

Build servido: `dist/dashboards/gaza-observatorio/index.html`, 10 109 651 B, sha256
`f36ecdaf6c4f1900…`, en `http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html` y en la ficha
`http://127.0.0.1:8000/#/area/ciencia-de-datos/gaza-observatorio`.

Capturas en `evidencias/gaza-observatorio/pronostico/`: `01` cabecera con KPIs, estado y corte, `02`
tarjetas de horizonte, `03` histórico con su leyenda, `04` daño por zona, `05` cambio por sitio, `06`
panel completo y `07` móvil.

## Fila de análisis del panel «Experimento» (v0.3.8)

Los tres análisis internos del panel se veían como botones altos, con el texto partido y el encabezado
recortado. La causa era doble: el encabezado del módulo es un `<header class="mast">` y el CSS global
del portafolio aplica `header{display:flex;justify-content:space-between;gap:24px}`, de modo que los
tabs quedaban **junto al título** y el `h1` se comprimía; además los botones heredaban
`button{padding:…;margin-top:8px}` y no tenían `white-space:nowrap`, así que crecían y partían el texto.

- **Ubicación.** La fila salió del encabezado: ahora va **debajo del título y su descripción y antes
  del contenido** de las vistas (medido: la fila empieza donde termina el encabezado, +4 px).
- **Componente propio.** La clase es `pronostico-tabs` —no se reutiliza `.tabs`— y todos sus estilos
  cuelgan de `#experimento`, con el encabezado forzado a `display:block` para neutralizar la fila
  flexible global.
- **Forma.** Una sola fila horizontal alineada a la izquierda, `flex-wrap:nowrap`, botones de
  **42 px de alto** (40 px por debajo de 850 px), `white-space:nowrap`, texto en una línea, 16 px de
  relleno lateral y la paleta del portafolio (blanco, borde `--line`, seleccionado en índigo suave con
  borde `#bfc7ff` y texto `--blue`), más foco visible.
- **Pantallas estrechas.** El desplazamiento horizontal queda **solo dentro de la fila**
  (`overflow-x:auto`): en 390 px la fila tiene 120 px de recorrido interno y la página no desborda.
- Los estilos del prototipo se renombraron en consecuencia (`.tabs` → `.pronostico-tabs`) y el
  conmutador del guion apunta a la clase nueva; las tres vistas, sus datos, gráficas y filtros no
  cambian.

### Verificación

`node dashboards/gaza-observatorio/tools/verificar-tabs-experimento.mjs` → **54 comprobaciones OK, 0
fallos** en **1440, 1024 y 390 px**: clase propia, fila fuera del encabezado, fila por debajo de la
cabecera, encabezado sin recortes, una sola línea con los tres botones a la misma altura, alto de
42 px (40 en móvil), texto en una línea, alineación a la izquierda, sin desbordamiento de página, la
fila completa cabe desde 1024 y solo se desplaza en 390, y cada una de las tres vistas se abre,
oculta las demás y conserva gráficas y tablas. Cero errores de consola en los tres anchos.

Resto de la batería sobre el mismo build: **51** (panel de pronóstico), **32** (`verificar.mjs`),
**25 + 1 aviso** (integración), **55** (tooltips), **45** (módulos nuevos) y **30** (edades).

Build servido: `dist/dashboards/gaza-observatorio/index.html`, 10 111 496 B, sha256
`2f5d1181370e60…`, en `http://127.0.0.1:8000/dashboards/gaza-observatorio/index.html`.

Capturas en `evidencias/gaza-observatorio/pronostico/`: `08-tabs-1440.png`, `09-tabs-1024.png` y
`10-tabs-390.png`, tomadas con la primera vista activa.

## Etiquetas de grupo y ficha del sitio (v0.3.9)

El mapa de la muestra solo decía «Grupo 1», «Grupo 2»… sin explicar qué caracteriza a cada grupo, y la
ficha del sitio se titulaba «Sitio 46855» con la gobernación suelta.

### De dónde sale cada etiqueta

Los perfiles ya estaban calculados por el experimento: `report.profiles[].modes` (clase modal en cada
una de las **siete evaluaciones** con las que se ajustó el clustering) y `report.profiles[].proportions`
(reparto de clasificaciones por evaluación). El descriptor se deriva así, sin inventar nada:

1. se cuenta cuántas de las siete evaluaciones tienen cada clase como modal;
2. se elige la clase dominante (desempate por la proporción media);
3. se calcula el apoyo: evaluaciones en que domina, media de su proporción y tamaño del grupo;
4. el texto es «clase + alcance»: *en las 7 evaluaciones*, *en k de 7* o *termina en … (últimas n de 7)*.

| Número | Etiqueta publicada | Apoyo del perfil |
| --- | --- | --- |
| Grupo 1 | Destruido en las 7 evaluaciones | 7/7 · media 98,9 % · 51 665 sitios |
| Grupo 2 | Daño moderado en las 7 evaluaciones | 7/7 · media 97,8 % · 27 578 sitios |
| Grupo 3 | Posible daño en las 7 evaluaciones | 7/7 · media 94,1 % · 23 077 sitios |
| Grupo 4 | Daño severo en las 7 evaluaciones | 7/7 · media 87,8 % · 16 814 sitios |
| Grupo 5 | Termina en destruido (últimas 5 de 7) | 5/7 · media 54,2 % · 15 103 sitios |
| Grupo 6 | Daño moderado en 5 de 7 evaluaciones | 5/7 · media 74,7 % · 20 875 sitios |

El número se conserva delante para no perder la trazabilidad, y las etiquetas coinciden con los títulos
que ya usaba la tarjeta de perfiles («Destruido desde el inicio de la ventana», «Cambio predominante
hacia destruido · dic 2024»…), que ahora se muestran juntos. La etiqueta se aplica de forma consistente
en la **leyenda del mapa**, el **selector de grupo** (que conserva el valor numérico del filtro), el
**distintivo de la ficha del sitio**, el **tooltip** del punto y los **encabezados de los perfiles**.

### Encabezado descriptivo del sitio

Se une la muestra visual con el panel UNOSAT por `fid` (10 000 de 10 000 sitios encontrados) y se usan
los campos que existen para ese registro: `site_type_code` traducido con el catálogo oficial `Site_ID`
del producto, `neighborhood`, `municipality` y `governorate`. El resultado es:

- **Título:** `Tipo · barrio` (por ejemplo «Escuela o universidad · Al Bureij»); si faltara el barrio, el
  tipo solo; y si el sitio no estuviera en el panel, se conserva «Sitio <ID>».
- **Línea secundaria:** `Municipio · Gobernación · ID <ID>`, omitiendo lo que no exista.
- Los campos ausentes se omiten y no se deduce ningún nombre propio. La ficha sigue vinculada al punto,
  se actualiza al cambiar de sitio y expone el ID también en `data-site` para lecturas automáticas.

### Verificación

`node dashboards/gaza-observatorio/tools/verificar-etiquetas-territorio.mjs` → **27 comprobaciones OK,
0 fallos**: seis etiquetas con número y rasgo modal real, apoyo en la mayoría de evaluaciones, leyenda
del mapa idéntica a la de los perfiles y con «Fuera del experimento», selector con etiqueta y valor
numérico, encabezados de perfil coherentes, título y referencia del sitio con tipo, barrio, municipio,
gobernación e ID, tooltip con la etiqueta del grupo y el ID, filtro por grupo reduciendo la muestra
(10 000 → 719) y actualizando la ficha, cambio de sitio refrescando el encabezado, y en móvil leyenda en
una columna, sin recortes ni desbordamiento.

Batería completa sobre el mismo build: **32** (`verificar.mjs`), **25 + 1 aviso** (integración), **55**
(tooltips), **51** (pronóstico), **54** (fila de análisis del experimento), **45** (módulos nuevos) y
**30** (edades). Cero errores de consola.

Build servido: `dist/dashboards/gaza-observatorio/index.html`, 10 671 489 B, sha256
`f599d591dc056948…`.

Capturas en `evidencias/gaza-observatorio/territorio-etiquetas/`: `01-leyenda.png` (seis etiquetas),
`02-ficha-sitio.png` (título y referencia nuevos), `03-mapa-leyenda.png`, `04-movil-leyenda.png` y
`05-perfil-etiquetado.png`.

## Mapa de la muestra a tamaño principal (v0.3.10)

El mapa de «Distribución geográfica de la muestra visual» ocupaba poco ancho y dejaba un bloque vacío
debajo de los puntos: el lienzo medía una altura fija (590 px) mientras la proyección se calculaba con
una extensión fija y quedaba centrada, y el contenedor se estiraba a la altura de la ficha.

- **Ancho.** La rejilla pasa de `1fr / 310px` a `minmax(0,2.7fr) minmax(300px,1fr)`: el mapa ocupa
  **71,6 %** del ancho disponible (941 de 1 314 px medidos a 1440) y la ficha el resto.
- **Alto proporcional.** El lienzo ya no tiene altura fija: se calcula con la **proporción geográfica
  de los puntos** (longitud corregida por `cos(31,4°)`) y se ajusta al ancho; a 941 px resulta 1 100 px.
  La tinta ocupa el **98 % del alto del lienzo**. El contenedor lleva `align-self:start`, así que la caja
  termina donde termina el gráfico (+ su nota) y no se estira hasta la ficha.
- **Encuadre sobre los datos.** La proyección usa la extensión real de los puntos visibles (con un 5 %
  de margen) en lugar de un rectángulo fijo, y los puntos pasan a radio 2,15 px (hasta 3,75 con zoom).
- **Controles de vista.** «+ Ampliar», «− Reducir», «Centrar en el sitio», «Restablecer vista» y un
  indicador de nivel (100 % inicial). También zoom con la rueda —centrado en el cursor— y paneo
  arrastrando; el paneo no selecciona por accidente (se ignora el clic si hubo arrastre).
- **Selección.** El sitio elegido se resalta con halo blanco, relleno y anillo oscuro; si hay zoom, la
  vista se centra en él y nunca pierde la selección ni los filtros. «Centrar en el sitio» amplía a 200 %
  cuando estaba en 100 % para que el centrado sea visible.
- **Ficha.** No se elimina: se añadió «Contraer ficha» (`aria-expanded`) que oculta la secuencia de 14
  evaluaciones y la explicación, dejando título, referencia, grupo y controles.
- **Móvil.** Una sola columna con el mapa a todo el ancho (320 de 320 px) y la ficha debajo; sin scroll
  horizontal de página y con los cuatro controles disponibles.
- Se conserva la nota «Coordenadas geográficas · sin mapa base» y no se añadió ningún mapa base ni
  ninguna precisión que la fuente no garantice. Muestra, grupos, asignaciones, colores y filtros intactos.

### Verificación

`node dashboards/gaza-observatorio/tools/verificar-mapa-muestra.mjs` → **24 comprobaciones OK, 0
fallos**: proporción 71,6 % del ancho, lienzo de 1 100 px, caja ajustada al lienzo más su nota (2 px),
tinta al 98 % del alto, cuatro controles, zoom que cambia el nivel y mantiene el punto dentro del
lienzo, «Centrar en el sitio» con desvío < 40 px, «Restablecer vista» volviendo al encuadre, selección
conservada, ficha vinculada al cambiar de sitio, clic directo que selecciona, reajuste tras filtrar,
ficha contraíble y móvil a todo el ancho sin desbordamiento.

Resto de la batería sobre el mismo build: **32** (`verificar.mjs`), **25 + 1 aviso** (integración),
**55** (tooltips), **27** (etiquetas), **51** (pronóstico), **54** (fila del experimento), **30**
(edades) y **29** (paginación). Cero errores de consola.

Build servido: `dist/dashboards/gaza-observatorio/index.html`, 10 677 942 B, sha256
`36254a0fb84e9ca1…`.

Capturas en `evidencias/gaza-observatorio/mapa-muestra/`: `01-mapa-escritorio.png`,
`02-mapa-zoom.png`, `03-mapa-ficha-plegada.png` y `04-mapa-movil.png`.

## Ficha publicada (v0.3.11)

La tarjeta y el detalle de «Gaza · Vidas y territorio» se actualizaron **en su fuente**: `dist/content.js`
es el origen editable del contenido del portafolio según `LEEME.txt`, y `dist/app.js` compone con él la
tarjeta del área y la vista de detalle. No se editó HTML de salida ni se duplicó la ficha.

- **Estado.** `estado: 'desarrollo'` → **`'publicado'`** y se retiró `notaEstado`, la nota que explicaba
  que la integración era local. Con `estado === 'publicado'` el renderizador deja de pintar esa nota
  (`pendiente = project.estado !== 'publicado'`). El distintivo visible pasa a **PUBLICADO** en la
  tarjeta y en la cabecera del detalle.
- **Textos.** Se cotejaron las siete secciones entregadas contra la fuente y se alineó la única
  divergencia: «Mi contribución» decía «actúan sobre la vista que los contiene» y ahora dice «que la
  contiene», como el texto entregado. Problema, destinatario, fuentes, método, resultados y limitaciones
  ya coincidían carácter a carácter y se conservaron sin tocar cifras, cortes ni definiciones.
- **Tecnologías.** Se normalizaron a los tres grupos entregados (datos y análisis · interfaz ·
  verificación) sin alterar sus elementos.
- **Sin tocar nada más.** Mismo `id`, título, `resumen` aprobado, imagen de portada (`?v=2`),
  proporción 1600 × 1726, ruta `#/area/ciencia-de-datos/gaza-observatorio` y posición en la fila; ningún
  otro proyecto cambió. El observatorio (`dist/dashboards/…`) no se recompiló por este cambio: código,
  modelos y datos quedan como estaban.

### Verificación

`node tools/verificar-ficha-gaza-publicada.mjs` → **29 comprobaciones OK, 0 fallos**: la tarjeta muestra
«Publicado» con `data-estado="publicado"`, conserva nombre, imagen y destino; el detalle muestra el
distintivo, ya no pinta la nota de desarrollo, y **reproduce literalmente los siete textos entregados**
(534, 254, 1 227, 983, 1 242, 1 096 y 1 428 caracteres), con los siete apartados presentes, los tres
grupos de tecnologías y sin desbordamiento horizontal ni en 1440 ni en 390 px.

`node tools/verificar-gaza-integracion.mjs` → **25 comprobaciones OK, 1 aviso**: la aserción de estado se
invirtió (ahora exige «Publicado» y que no quede la nota antigua) y la del experimento sigue pasando.

Capturas en `evidencias/gaza-observatorio/ficha-publicada/`: `01-tarjeta-publicada.png`,
`02-ficha-escritorio.png`, `03-ficha-apartados.png` y `04-ficha-movil.png`.

## «Cada punto, una vida»: todo a la vista y zoom (v0.3.12)

La cuadrícula se dibujaba con un paso fijo (12, 18 o 26 px) que producía más filas de las que caben en
el marco: había que desplazarse para ver el conjunto y el selector «Tamaño de los puntos» cambiaba el
espaciado, no los puntos.

- **Encuadre completo por defecto.** El paso y el número de columnas se calculan para que **todos** los
  puntos quepan en el marco: se busca el número de columnas que maximiza el paso con
  `paso = min(ancho/columnas, alto/filas)` y `filas = ceil(n/columnas)`. Con 21 637 puntos y un marco de
  1 003 × 658 px resulta **182 columnas × 119 filas a 5,33 px de paso**, sin desplazamiento interno (la
  tinta cubre el **96 % del alto del lienzo**). El cálculo se memoriza y solo se rehace cuando cambian
  el número de puntos o el tamaño del marco.
- **Zoom.** Controles «−», «+» y «Ver todos» con indicador de nivel (100 % – 1 200 %), accesibles con
  `+`, `−` y `0` cuando el lienzo tiene el foco. Al acercarse, la cuadrícula crece y **se recorre dentro
  de su marco** (nunca la página); «Ver todos» vuelve al encuadre completo. La selección se conserva y
  se centra al ampliar.
- **Puntos legibles sin controles extra.** El grosor del punto es fijo (0,22 del paso, con radio mínimo
  de 0,9 px) para que a 100 % todos los puntos se vean aunque sean miles; el antiguo selector de tamaño se
  retiró y la fila de controles se queda en «−», el nivel, «+» y «Ver todos», sin que el texto se parta.
- **Sin cambios en los datos.** Se conservan filtros, búsqueda, universo, selección, flechas/Inicio/Fin,
  tooltips, tabla accesible y los avisos de alcance y lista incompleta. Cada punto sigue siendo una
  persona, del mismo tamaño, ordenada por edad y nombre.

### Verificación

`node dashboards/gaza-observatorio/tools/verificar-memoria-zoom.mjs` → **28 comprobaciones OK, 0 fallos**:
21 637 puntos, zoom inicial 100 %, cero desplazamiento interno (la rejilla cabe: `columnas × paso` y
`filas × paso` dentro del marco), paso ≥ 4,5 px, tinta al 96 % del lienzo, controles coherentes y con
indicador, «+» que sube el paso de 5,33 a más del triple, desplazamiento interno al acercarse sin
desbordar la página, punto seleccionado visible tras el zoom, «Ver todos» y la tecla `0` que restauran
el encuadre, clic que sigue seleccionando, filtro de adultos (51 198) que también cabe completo, y móvil
con 121 columnas a 2,42 px, sin scroll interno ni desbordamiento.

Resto de la batería sobre el mismo build: **32** (`verificar.mjs`, con la aserción de rejilla actualizada
al encuadre completo), **25 + 1 aviso** (integración), **55** (tooltips), **29** (ficha publicada),
**45** (módulos nuevos). Cero errores de consola.

Build servido: `dist/dashboards/gaza-observatorio/index.html`, 10 682 121 B, sha256
`4ff861bc0db41da5…`.

Capturas en `evidencias/gaza-observatorio/memoria-zoom/`: `01-todos-a-la-vista.png`,
`02-con-zoom.png`, `03-movil-todos.png`, `04-controles-escritorio.png` y `05-controles-movil.png`.

**Nombres alineados (v0.3.14).** El nombre original está en árabe con `dir="rtl"`, así que el navegador
lo empujaba a la derecha mientras la transliteración quedaba a la izquierda. Se conserva `dir="rtl"`
—necesario para el orden bidireccional— y se fija `text-align:left` en `.memName`, con la misma regla
para el nombre árabe del tooltip. Medido: ambos nombres comparten el borde izquierdo con **Δ 0 px** en
escritorio y en móvil, sin desbordar la tarjeta. Lo comprueba
`tools/verificar-nombres-memoria.mjs` → **15 comprobaciones OK, 0 fallos**.

`node dashboards/gaza-observatorio/tools/verificar-controles-memoria.mjs` → **24 comprobaciones OK, 0
fallos** (v0.3.13): el selector de grosor ya no existe, quedan «−», «+» y «Ver todos», cada botón tiene el
texto en una línea, ninguno desborda su caja —«Ver todos» mide 81 × 34 px en escritorio y 81 × 36 px en
móvil—, la fila no se desborda, y el zoom sigue acercando y volviendo al encuadre completo en los dos
tamaños.

## Tono por edad dentro de la selección (v0.3.15)

Los puntos de «Cada punto, una vida» salían casi del mismo tono: el color se calculaba con una escala fija
de 0 a 110 años, así que con la selección de menores (0–17) todas las edades caían en el 15 % inicial de
la rampa. Ahora el tono **recorre el rango de edad de la selección**.

- **Escala según la selección.** Menores 0–17, adultos 18–110 y todas las edades 0–110; el rango se lee de
  los propios datos filtrados, con una curva suave (`t = ((edad − mín) / (máx − mín))^0,7`) para que los
  más jóvenes no se agolpen en un extremo.
- **Rampa más ancha**, violeta intenso `rgb(58,54,236)` en el extremo joven y lavanda claro
  `rgb(192,190,210)` en el mayor, ambos legibles sobre el fondo; la muestra de la leyenda usa exactamente
  los mismos extremos.
- **Leyenda honesta:** muestra los años de cada extremo («Más joven · 0 años», «Mayor edad · 17 años») y
  declara el rango usado («Escala del tono: 0–17 años (según la selección)»; con todas las edades,
  «0–110 años»). Con un solo año seleccionado el tono es único, sin degradado falso.
- **Sin tocar los datos:** mismas personas, mismo orden por edad y nombre, mismo tamaño de punto; filtros,
  búsqueda, zoom, ficha y tabla siguen igual.

### Verificación

`node dashboards/gaza-observatorio/tools/verificar-color-edad.mjs` → **14 comprobaciones OK, 0 fallos**,
muestreando el color real del lienzo en la fila más joven y en la más mayor:

| Selección | Leyenda | Diferencia de tono entre extremos |
| --- | --- | --- |
| Menores 0–17 (inicial) | 0–17 (según la selección) | **Δ 247** (`rgb(58,54,236)` → `rgb(191,189,209)`) |
| Adultos 18–110 | 18–110 | Δ 223 |
| Todas las edades | 0–110 | Δ 160 |
| Un solo año (5–5) | 5–5 | Δ 0 (un solo tono, como debe ser) |
| Móvil 390 px | 0–17 | Δ 193 |

Resto de la batería sobre el mismo build: **32** (`verificar.mjs`), **15** (nombres), **28** (encuadre y
zoom), **24** (controles), **55** (tooltips), **25 + 1 aviso** (integración) y **29** (ficha publicada).
Cero errores de consola.

Build servido: `dist/dashboards/gaza-observatorio/index.html`, 10 683 401 B, sha256
`d10196e724f9a05f…`.

Capturas en `evidencias/gaza-observatorio/memoria-color/`: `01-menores-por-edad.png`,
`02-adultos-por-edad.png`, `03-todas-por-edad.png` y `04-movil-por-edad.png`.

## Fricciones y pendientes conocidos

- **Gráficos anchos del diseño aprobado.** `#reportPack svg` (ancho mínimo 700 px) y `#calendar svg`
  (980 px) se desplazan dentro de su contenedor en pantallas estrechas. Es comportamiento de la
  versión aprobada: no se rediseñó para pasar QA. A 1024 y 390 px la página no desborda; el
  desplazamiento ocurre dentro del marco de cada gráfico.
- **Fuentes del cascarón.** El portafolio carga Inter/Fraunces/IBM Plex Mono desde Google Fonts
  (comportamiento previo, ajeno a este cambio). El observatorio no pide nada externo; si no hay red,
  la página cae a las fuentes del sistema.
- **Estado publicado.** La ficha se anuncia como publicada desde `dist/content.js` (`estado:
  'publicado'`, sin `notaEstado`). El estado ya no es un pendiente.
- **Versión de los datos congelada.** No hay actualización automática: el HTML es una instantánea. Una
  nueva fuente o un reentrenamiento exigen nueva auditoría y reconstrucción del paquete.
- **Estas gráficas no se sustituyeron por las del paquete.** Las edades siguen como barras por grupo y
  los perfiles de grupo salen de `template.html`; el paquete v0.11 traía un enjambre de puntos y unos
  estilos que el repositorio no usa. La decisión y su motivo están en la tabla de divergencias.
- **Los mapas de 10 000 puntos resuelven el tooltip por proximidad** (radio de 14 px sobre el dibujo),
  no por marca individual: crear 20 000 marcas enfocables haría inmanejable el recorrido con Tab. La
  ficha vinculada del sitio sigue siendo el camino accesible completo.
- Los verificadores de datos (`gaza_v1/verificar.py`, `gaza_panel/verificar_panel.py`) escriben su
  propio JSON de salida, así que se ejecutaron sobre una copia de trabajo para no alterar el paquete
  entregado; `verificar_paquete.py` confirma que el paquete sigue intacto.

## Archivos del cambio

| Archivo | Cambio |
| --- | --- |
| `dist/dashboards/gaza-observatorio/index.html` | nuevo · copia literal del HTML aprobado (3 132 433 B) |
| `dist/projects/gaza-observatorio.js` | nuevo · montaje en marco con altura automática |
| `dist/index.html` | alta del script del módulo |
| `dist/content.js` | tarjeta y ficha del proyecto en Ciencia de datos |
| `dist/img/gaza-observatorio-resumen.jpg` | nuevo · portada 1600 × 1726 del tablero servido |
| `dashboards/clientes-campanas/integrado/tools/capturar-portadas.mjs` | tercera portada y soporte de pestaña previa |
| `tools/verificar-gaza-integracion.mjs` | nuevo · verificación de la integración servida |
| `dashboards/gaza-observatorio/fuente/` | nuevo · código fuente editable del observatorio (plantilla, secciones, guiones, datos y constructores) |
| `dashboards/gaza-observatorio/fuente/memoria/` | nuevo · vista «Cada punto, una vida»: `personas.json` (72 835 registros), `seccion.html`, `memoria.js` y `memoria.css` |
| `dashboards/gaza-observatorio/fuente/construir_memoria.py` | nuevo · incrusta la vista nominal en el documento del observatorio |
| `dashboards/gaza-observatorio/tools/construir.py` | nuevo · orquesta los constructores y publica el HTML en `dist/` |
| `dashboards/gaza-observatorio/tools/verificar.mjs` | nuevo · verificación de las correcciones en el build servido |
| `dashboards/gaza-observatorio/gaza_panel/validacion.json` | nuevo · validación del panel que consume el constructor v0.2 |
| `_respaldo_2026-11-10-gaza/` | nuevo · copia previa de `index.html` y `content.js` |
| `docs/GAZA-VIDAS-Y-TERRITORIO.md` | este documento |
| `evidencias/gaza-observatorio/` | capturas y registro de verificación |
| `evidencias/gaza-observatorio/cada-punto/` | nuevo · capturas de la vista nominal y su registro de verificación |
| `dashboards/gaza-observatorio/fuente/expansion/tooltip.js` | nuevo (v0.3.3) · tooltip compartido: ratón, teclado, tacto y API de proximidad |
| `dashboards/gaza-observatorio/fuente/expansion/tooltip.css` | nuevo (v0.3.3) · estilos del globo, foco visible y control de cierre |
| `dashboards/gaza-observatorio/fuente/expansion/visualizaciones.js` | gráficas de lesiones y prótesis reescritas; series y fuentes en curvas, edades y prensa; enganche por proximidad de los dos mapas de clasificación |
| `dashboards/gaza-observatorio/fuente/expansion/secciones.html` | ámbito consultable, serie y fuente en las ocho gráficas de las pestañas 1–4 |
| `dashboards/gaza-observatorio/fuente/redesign/nuevas_vistas.html` | ámbito y fuente del gráfico del archivo |
| `dashboards/gaza-observatorio/fuente/redesign/redesign.js` | ámbito y fuente del paquete de círculos y del mapa bivariado |
| `dashboards/gaza-observatorio/fuente/template.html` | mapa de la muestra y barras de cobertura con el globo compartido; ámbitos de perfiles y cobertura |
| `dashboards/gaza-observatorio/fuente/memoria/seccion.html` | serie y fuente declaradas en el lienzo nominal |
| `dashboards/gaza-observatorio/fuente/memoria/memoria.js` | tooltip por proximidad en la cuadrícula de 21 637 puntos |
| `dashboards/gaza-observatorio/fuente/construir_observatorio.py` | incrusta `tooltip.js` y `tooltip.css` en el documento |
| `dashboards/gaza-observatorio/tools/verificar-tooltips.mjs` | nuevo (v0.3.3) · 55 comprobaciones de tooltips y de las dos gráficas |
| `dashboards/gaza-observatorio/tools/inventariar-graficas.mjs` | nuevo (v0.3.3) · inventario medido de gráficas y marcas consultables |
| `dashboards/gaza-observatorio/tools/capturar-tooltips.mjs` | nuevo (v0.3.3) · capturas de las gráficas corregidas y de los tooltips |
| `dashboards/gaza-observatorio/tools/verificar-tooltip-ficha.mjs` | nuevo (v0.3.3) · comprueba el tooltip dentro del marco de la ficha |
| `evidencias/gaza-observatorio/tooltips/` | nuevo (v0.3.3) · capturas, inventario JSON y registros de verificación |
| `dashboards/gaza-observatorio/fuente/expansion/impacto-perfiles.css` | nuevo (v0.3.4) · estilos de la trama de cien celdas y de la pirámide de puntos |
| `dashboards/gaza-observatorio/fuente/expansion/visualizaciones.js` | pirámide de puntos con selector grupos/edades y lógica de la trama (`ageWaffle`) |
| `dashboards/gaza-observatorio/fuente/expansion/secciones.html` | tarjeta de la trama de 100 celdas en «Edades y prensa» |
| `dashboards/gaza-observatorio/fuente/redesign/respuesta.html` | nuevo (v0.3.4) · sección «Acceso y respuesta» con sus cuatro vistas |
| `dashboards/gaza-observatorio/fuente/redesign/respuesta.css` | nuevo (v0.3.4) · estilos del módulo de respuesta |
| `dashboards/gaza-observatorio/fuente/redesign/respuesta.js` | nuevo (v0.3.4) · dibujo de las cuatro vistas y sus controles |
| `dashboards/gaza-observatorio/fuente/construir_redesign.py` | pestaña «Acceso y respuesta», su sección, hoja y guion |
| `dashboards/gaza-observatorio/fuente/construir_observatorio.py` | incrusta la hoja de los perfiles de edad |
| `dashboards/gaza-observatorio/tools/verificar-modulos-nuevos.mjs` | nuevo (v0.3.4) · 44 comprobaciones de edades y respuesta, con capturas |
| `dashboards/gaza-observatorio/tools/capturar-ficha-modulos.mjs` | nuevo (v0.3.4) · capturas de las dos pestañas dentro de la ficha |
| `dist/content.js` | «once vistas» en la contribución de la ficha, con la nueva pestaña |
| `evidencias/gaza-observatorio/modulos-nuevos/` | nuevo (v0.3.4) · capturas del build directo y de la ficha, más registros |
| `dashboards/gaza-observatorio/fuente/expansion/secciones.html` | controles de paginación de «Edad por año» (`#agePager`, `#ageRange`) |
| `dashboards/gaza-observatorio/fuente/expansion/visualizaciones.js` | pirámide paginada de quince edades, con recorrido completo, tabla por vista y tabla completa |
| `dashboards/gaza-observatorio/fuente/expansion/impacto-perfiles.css` | estilos de la paginación y del ancho legible del dibujo |
| `dashboards/gaza-observatorio/tools/verificar-edades-paginadas.mjs` | nuevo (v0.3.5) · 27 comprobaciones de la paginación, escritorio y móvil |
| `dashboards/gaza-observatorio/tools/capturar-ficha-edades-paginadas.mjs` | nuevo (v0.3.5) · capturas de la vista paginada dentro de la ficha |
| `evidencias/gaza-observatorio/edades-paginadas/` | nuevo (v0.3.5) · capturas y registros de la paginación |
| `dashboards/gaza-observatorio/fuente/expansion/visualizaciones.js` | v0.3.6 · «Grupos de edad» a ancho completo con filas y puntos ampliados; maqueta móvil por bloques al ancho real |
| `dashboards/gaza-observatorio/fuente/expansion/impacto-perfiles.css` | v0.3.6 · estilos de la maqueta compacta |
| `dashboards/gaza-observatorio/tools/verificar-edades-dos-modos.mjs` | nuevo (v0.3.6) · 30 comprobaciones por modo, con medición de tipografía, paso de fila y cruces |
| `dashboards/gaza-observatorio/tools/medir-edades-ficha.mjs` | nuevo (v0.3.6) · medición de la gráfica dentro de la ficha, escritorio y móvil |
| `dashboards/gaza-observatorio/tools/capturar-ficha-edades-dos-modos.mjs` | nuevo (v0.3.6) · capturas de los dos modos dentro de la ficha |
| `evidencias/gaza-observatorio/edades-dos-modos/` | nuevo (v0.3.6) · capturas y registros de los dos modos |
| `dashboards/gaza-observatorio/fuente/pronostico/seccion.html` | nuevo (v0.3.7) · contenido del panel «Experimento» portado del prototipo |
| `dashboards/gaza-observatorio/fuente/pronostico/pronostico.css` | nuevo (v0.3.7) · estilos del prototipo delimitados a `#experimento` |
| `dashboards/gaza-observatorio/fuente/pronostico/pronostico.js` | nuevo (v0.3.7) · lógica en IIFE, acotada al panel y con el tooltip compartido |
| `dashboards/gaza-observatorio/fuente/pronostico/datos.json` | nuevo (v0.3.7) · salidas empaquetadas del paquete (866 KB, sin recalcular) |
| `dashboards/gaza-observatorio/fuente/construir_pronostico.py` | nuevo (v0.3.7) · sustituye el contenido del panel e incrusta datos y guion |
| `dashboards/gaza-observatorio/fuente/template.html` | v0.3.7 · guarda del guion anterior del panel (nodos `#scores`…) |
| `dashboards/gaza-observatorio/tools/construir.py` | v0.3.7 · añade el constructor del pronóstico a la cadena |
| `dashboards/gaza-observatorio/tools/verificar-pronostico.mjs` | nuevo (v0.3.7) · 51 comprobaciones del panel, con capturas |
| `tools/verificar-gaza-integracion.mjs` | v0.3.7 · el experimento se verifica por el pronóstico (3,7 / 23,8 / 28 días) |
| `dashboards/gaza-observatorio/tools/verificar.mjs` | v0.3.7 · la comprobación de cifras usa el pronóstico en lugar de la silueta |
| `dist/content.js` | v0.3.7 · la contribución describe el panel de pronóstico |
| `evidencias/gaza-observatorio/pronostico/` | nuevo (v0.3.7) · capturas y registros del panel |
| `dashboards/gaza-observatorio/fuente/pronostico/seccion.html` | v0.3.8 · la fila de análisis sale del encabezado y usa la clase `pronostico-tabs` |
| `dashboards/gaza-observatorio/fuente/pronostico/pronostico.css` | v0.3.8 · componente de la fila (42 px, una línea, scroll interno) y encabezado en bloque |
| `dashboards/gaza-observatorio/fuente/pronostico/pronostico.js` | v0.3.8 · el conmutador apunta a `pronostico-tabs` |
| `dashboards/gaza-observatorio/tools/verificar-tabs-experimento.mjs` | nuevo (v0.3.8) · 54 comprobaciones en 1440, 1024 y 390 px |
| `dashboards/gaza-observatorio/fuente/territorio/grupos.json` | nuevo (v0.3.9) · descriptor por grupo derivado de `report.profiles` (modos, apoyo, tamaño) |
| `dashboards/gaza-observatorio/fuente/territorio/sitios.json` | nuevo (v0.3.9) · tipo de sitio, municipio y barrio por `fid` (10 000 sitios) y catálogo `Site_ID` traducido |
| `dashboards/gaza-observatorio/fuente/territorio/etiquetas.css` | nuevo (v0.3.9) · leyenda en rejilla legible y distintivo de grupo con salto de línea |
| `dashboards/gaza-observatorio/fuente/construir_territorio_etiquetas.py` | nuevo (v0.3.9) · inyecta las etiquetas y los atributos antes de los guiones de la plantilla |
| `dashboards/gaza-observatorio/fuente/template.html` | v0.3.9 · etiquetas en leyenda, selector, distintivo y tooltip; encabezado del sitio con tipo, barrio e ID |
| `dashboards/gaza-observatorio/tools/construir.py` | v0.3.9 · añade el constructor de etiquetas tras el rediseño |
| `dashboards/gaza-observatorio/tools/verificar-etiquetas-territorio.mjs` | nuevo (v0.3.9) · 27 comprobaciones de etiquetas y ficha del sitio |
| `dashboards/gaza-observatorio/fuente/template.html` | v0.3.10 · mapa a ~72 % de ancho, alto proporcional, zoom/paneo/centrado, resaltado y ficha contraíble |
| `dashboards/gaza-observatorio/tools/verificar-mapa-muestra.mjs` | nuevo (v0.3.10) · 24 comprobaciones del mapa ampliado, escritorio y móvil |
| `dist/content.js` | v0.3.11 · ficha: estado `publicado`, sin `notaEstado`; textos entregados alineados y tecnologías normalizadas |
| `tools/verificar-ficha-gaza-publicada.mjs` | nuevo (v0.3.11) · 29 comprobaciones de la ficha publicada, escritorio y móvil |
| `tools/verificar-gaza-integracion.mjs` | v0.3.11 · la aserción de estado exige «Publicado» y la ausencia de la nota anterior |
| `dashboards/gaza-observatorio/fuente/memoria/memoria.js` | v0.3.12 · encuadre completo (columnas y paso calculados), zoom y grosor del punto |
| `dashboards/gaza-observatorio/fuente/memoria/seccion.html` | v0.3.12 · controles de zoom, grosor del punto y textos de ayuda |
| `dashboards/gaza-observatorio/fuente/memoria/memoria.css` | v0.3.12 · estilos de los controles de zoom |
| `dashboards/gaza-observatorio/tools/verificar-memoria-zoom.mjs` | nuevo (v0.3.12) · 28 comprobaciones del encuadre y del zoom |
| `dashboards/gaza-observatorio/tools/verificar.mjs` | v0.3.12 · la aserción de rejilla comprueba el encuadre completo en vez de la altura |
| `dashboards/gaza-observatorio/fuente/memoria/seccion.html` | v0.3.13 · se retira el selector «Grosor del punto» |
| `dashboards/gaza-observatorio/fuente/memoria/` `memoria.css` · `memoria.js` | v0.3.13 · botones de zoom sin partir el texto y grosor fijo del punto |
| `dashboards/gaza-observatorio/tools/verificar-controles-memoria.mjs` | nuevo (v0.3.13) · 24 comprobaciones de los controles, escritorio y móvil |
| `dashboards/gaza-observatorio/fuente/memoria/memoria.css` | v0.3.14 · los dos nombres (árabe y transliterado) alineados a la izquierda |
| `dashboards/gaza-observatorio/fuente/expansion/tooltip.css` | v0.3.14 · el nombre árabe del tooltip también a la izquierda |
| `dashboards/gaza-observatorio/tools/verificar-nombres-memoria.mjs` | nuevo (v0.3.14) · 15 comprobaciones de la alineación de los nombres |
| `dashboards/gaza-observatorio/fuente/memoria/memoria.js` · `seccion.html` · `memoria.css` | v0.3.15 · tono por edad según el rango de la selección y leyenda con los años de los extremos |
| `dashboards/gaza-observatorio/tools/verificar-color-edad.mjs` | nuevo (v0.3.15) · 14 comprobaciones del tono muestreado en el lienzo |











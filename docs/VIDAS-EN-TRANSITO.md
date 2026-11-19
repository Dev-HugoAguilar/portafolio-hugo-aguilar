# Vidas en tránsito — integración en el portafolio

Observatorio de muertes y desapariciones en tránsito, violencia reportada y evidencia territorial.
Integrado en el área **«Dashboards y visualización»** del portafolio con la etiqueta secundaria
**«Ciencia de datos · Observatorio humanitario»**.

- Ficha: `#/area/dashboards/vidas-en-transito`
- Tablero servido: `dist/dashboards/vidas-en-transito/index.html`
- Estado de la ficha: **En desarrollo** — la integración está completa y verificada en local, pero no se
  ha desplegado; la tarjeta no se anuncia como publicada.

## De dónde sale el artefacto

Del paquete `Observatorio_Vidas_en_transito_Harness_v0.13.0.zip`:

| Archivo | Papel |
| --- | --- |
| `dashboard/index.html` | tablero autónomo (HTML + CSS + JavaScript), 93 KB |
| `dashboard/data.json` | visualizaciones previas de MMP, El Paso, EAAF y REDODEM |
| `dashboard/fuentes_ampliadas.json` | agregados de UPMRIP, ICIJ/CLIP y OIM DTM |
| `dashboard/derive_data.py` | reproduce los agregados; **no** se ejecuta en el build ni en el navegador |
| `dashboard/LEEME.md`, `FUENTES_Y_LIMITES.md`, `INVENTARIO_GRAFICAS.md` | operación, fuentes y límites, inventario |
| `dashboard/MANIFEST.json` | inventario y hashes entregados |

## Arquitectura

El repositorio no tiene generador de sitio: **`dist/` es la fuente publicada** (`.openai/hosting.json`
sirve `dist/`, y `LEEME.txt` documenta `dist/content.js` como contenido editable). Para no mantener dos
copias divergentes:

1. `dashboards/vidas-en-transito/` — origen único: `runtime/` con los tres archivos de la aplicación, la
   documentación del paquete, `derive_data.py`, `MANIFEST_LOCAL.json` y el constructor.
2. `dashboards/vidas-en-transito/construir.py` — copia `runtime/` a `dist/dashboards/vidas-en-transito/`
   verificando el SHA-256 contra `MANIFEST_LOCAL.json` antes y después de copiar (`--comprobar` audita sin
   escribir).
3. `dist/projects/vidas-en-transito.js` — módulo que monta la página en la ficha con un marco del mismo
   origen, ancho completo, `title` accesible, altura mínima del 85 % de la ventana y altura ajustada al
   contenido real (`ResizeObserver` + respaldo por intervalo), igual que «Gaza · Vidas y territorio».
4. `dist/index.html` — alta del `<script src="projects/vidas-en-transito.js" defer>`.
5. `dist/content.js` — tarjeta en el área `dashboards`, con portada `img/vidas-en-transito-resumen.jpg`.
6. `dist/img/vidas-en-transito-resumen.jpg` — captura real de 1600 × 1726, la misma proporción y tamaño
   exterior que Walmart M5, generada con `dashboards/vidas-en-transito/capturar-portada.mjs`.

El tablero hace `fetch('./data.json')` y `fetch('./fuentes_ampliadas.json')`: ambos JSON quedan junto al
HTML en `dist/`. No hay backend, ni credenciales, ni peticiones externas (los enlaces a las fuentes son
solo texto).

## Corrección del artefacto (única)

El HTML entregado fallaba al cargar: `TypeError: fmtN is not a function` en `renderExpandedDashboard`,
porque dos llamadas usaban `fmtN(...)` sobre un `Intl.NumberFormat`. Con el error, **los veinte paneles
nuevos no se dibujaban** (14 tablas en lugar de 34). Se corrigieron las dos llamadas a `fmtN.format(...)`
sin tocar datos, etiquetas, cortes ni cifras. Registro completo en
`dashboards/vidas-en-transito/PARCHE.md`; `data.json` y `fuentes_ampliadas.json` son idénticos al paquete.

## Mapa geográfico (v0.13.1)

El bloque «Cartografía de evidencia» dejó de ser una silueta poligonal y es un mapa
geográfico real, dibujado en el cliente con SVG y una proyección Mercator propia
(sin teselas, sin librerías de mapas y sin servicios externos en ejecución).

- **Geografía.** Límites reales de Estados Unidos, México, Guatemala, Belice,
  Honduras, El Salvador, Nicaragua, Costa Rica, Panamá y Cuba (Natural Earth 50m,
  dominio público), recortados a la ventana del corredor y simplificados.
- **Corredor migratorio (OIM DTM).** Cinco tramos **generalizados** entre puntos
  representativos reales de cada país en la secuencia Panamá → Costa Rica →
  Nicaragua → Honduras → Guatemala → México; trazos discontinuos con flecha de
  dirección y pasos numerados. No es una línea GPS ni una ruta exacta.
- **Incidentes documentados (ICIJ/CLIP).** Capa independiente con los 148 puntos
  que tienen coordenadas y precisión declarada en `fuentes_ampliadas.json`.
- **Red ferroviaria de México (ARTF · IDE).** Capa **publicada y activa**: 809 tramos
  lineales descargados del servicio «Vías ferroviarias» de ARTF el 13 de noviembre de
  2026, con licencia CC BY 4.0 y datos actualizados hasta agosto de 2023. Se dibujan
  con línea continua los tramos en operación y discontinua los que están sin uso; la
  ficha muestra vía, empresa, tipo, estado, servicio, longitud, fecha y precisión. El
  SHP de ATTRAPI («Vía férrea, 2025») sigue pendiente: el intento de descarga
  registrado respondió HTTP 403 y esa fuente no se sustituye por geometría dibujada.
- **Interacción.** Capas activables por separado, zoom (−, + y rueda), paneo con
  arrastre, «Restablecer vista», leyenda persistente, ficha de selección (nombre,
  tipo, fuente, corte, precisión y nota) con clic y con `Tab` + `Enter`, etiquetas
  geográficas conmutables y nota metodológica fija.
- **Sin cambios en lo demás.** Indicadores, series, tablas y las demás secciones del
  tablero quedan intactos. El detalle por capa, con hashes y el registro de intentos,
  está en `dashboards/vidas-en-transito/CARTOGRAFIA.md`.

`node tools/verificar-mapa-vidas.mjs` → **45 comprobaciones OK, 0 fallos** (versión anterior del mapa; se sustituyó por 60 en v0.13.3).

## Mapa: rediseño cartográfico y selección corregida (v0.13.3)

El mapa de «Cartografía de evidencia» se recompuso y se corrigió su interacción.

- **Más mapa, mejor lectura.** Lienzo 1080×780 en escritorio (≈920×665 px
  renderizados) con panel lateral de ficha, leyenda y fuentes; en pantallas
  estrechas el encuadre se recorta a México-Centroamérica y el lienzo pasa a
  1080×1040 para no quedar en una franja. Los grosores, radios y etiquetas se
  calculan en píxeles de pantalla, así que se leen igual a 390 px que a 1440 px.
- **Capas diferenciadas.** Corredor con halo blanco, trazo discontinuo, flechas de
  dirección y seis nodos numerados; incidentes como puntos pequeños con halo y área
  de clic de 9 px; etiquetas de país con halo; retícula discreta.
- **Selección arreglada de extremo a extremo.** El defecto era el manejador de
  puntero: capturaba el puntero en cada `pointerdown`, de modo que el clic nunca
  llegaba al elemento. Ahora el arrastre solo captura tras superar 5 px; el clic
  abre la ficha del tramo, nodo o incidente. También funciona con Enter, barra
  espaciadora, `Escape` y el botón «Limpiar selección».
- **Ficha completa.** Tipo de evidencia, extremos o identificador, fuente,
  fecha/corte, precisión, datos disponibles y nota de alcance. Si la fuente no
  publica un dato se escribe «No disponible en la fuente»: no se inventan nombres
  ni atributos.
- **Filtro por año.** El campo `year` de ICIJ/CLIP (2018–2023) alimenta un selector que
  filtra el mapa y la lista y limpia la selección al cambiar; no se añadieron filtros
  que la fuente no sostenga.
- **Alternativa sin mapa.** Tabla plegable con los 159 elementos (5 tramos, 6 pasos
  y 148 incidentes) y un botón «Ver ficha» por fila que abre la misma ficha.
- **Fuentes, disponibilidad y límites.** El bloque atribuye cada capa a su fuente real:
  OIM DTM, ICIJ/CLIP, ARTF · IDE y Natural Earth. Distingue la capa cargada (809
  tramos de ARTF) del ZIP de ATTRAPI pendiente (HTTP 403 registrado). El conteo de
  incidentes del texto (148) coincide con los puntos dibujados.
- **Red ferroviaria.** Se incorporó desde el servicio IDE de ARTF (809 tramos, GeoJSON
  EPSG:4326, 6 707 vértices tras simplificar) porque el ZIP de ATTRAPI respondió
  HTTP 403 en el intento registrado. La capa se atribuye a ARTF, no a ATTRAPI, y su
  control está activo; el bloque de fuentes conserva ambos registros.
- **Sin cambios en lo demás.** Indicadores, series, tabla y las demás secciones del
  tablero quedan intactos.

`node tools/verificar-mapa-vidas.mjs` → **129 comprobaciones OK, 0 fallos** (incluye
clic y teclado en tramos e incidentes, cambio de selección sin datos obsoletos,
limpiar, lista sin mapa, capas, escritorio y móvil con toque).

## Burbujas empaquetadas (v0.13.2)

Los paneles categóricos de la serie REDODEM dejaron de usar puntos sueltos y barras:
ahora usan el **mismo componente de burbujas del Atlas vial**
(`dashboards/atlas-vial/src/ui/BurbujasEdadSexo.tsx`), portado a JavaScript sin React
en `dashboards/vidas-en-transito/runtime/burbujas.js`.

- **Qué se reutilizó.** El empaquetado circular real (`packSiblings` + `packEnclose`
  de d3-hierarchy, ISC © Mike Bostock, copiado con su aviso de licencia), la escala
  `r = k·√valor` con una sola constante `k` por vista, la guía «Cómo leer la
  gráfica», el tooltip, las leyendas de tamaño y de color, la selección con
  `aria-pressed`, el anillo de foco y la tabla accesible.
- **Qué se adaptó.** Los datos de cada panel: país de nacimiento, destino
  capturado, motivos generales, violencias y perpetradores. Los títulos,
  descripciones, notas y cifras del tablero no cambiaron.
- **Área, no diámetro.** El radio crece con la raíz del conteo: el área es
  proporcional al valor. Verificado con una desviación menor al 2 % en los cinco
  paneles y con la comprobación de que la razón `r/valor` no es constante.
- **Color.** Azul `#3458F5` = categoría del campo; magenta `#C22C7D` (borde
  `#EC4899`) = agrupación calculada «Otros»; gris `#9AA3B2` = valor faltante, que
  **no** se dibuja entre las burbujas. Cada panel explica su color en la leyenda;
  ninguno codifica demografía. El magenta se usa un paso más profundo que el rosa
  del Atlas vial para que el texto blanco de la etiqueta cumpla AA (5,3:1).
- **Valores faltantes.** «No especificado» (307 filas en nacimiento) y «NA»
  (34 741 de 40 800 en destino) aparecen en un bloque aparte, con su cifra exacta y
  la aclaración de que no son una categoría sustantiva ni se suman a «Otros».
- **Sin controles inventados.** Ninguno de estos agregados tiene una segunda
  dimensión (no hay vista por edad, sexo o año), así que no se añadió selector de
  agrupación: solo se puede calcular lo que el archivo contiene.
- **Motivos generales.** La unidad son menciones: 7 863 sobre 6 338 filas con algún
  motivo. La nota del panel y la del propio gráfico explican que una fila puede
  registrar varios motivos y que las menciones no suman 100 %.
- **Paneles convertidos.** 03 origen (8 burbujas), 04 destino (8 + bloque NA),
  05 motivos (4), 07 violencias (14) y 07 perpetradores (10). No se tocaron el mapa,
  la serie anual, la matriz edad × género, la trama de cobertura ni los paneles
  cartográficos, porque no son comparaciones categóricas.

`node tools/verificar-burbujas-vidas.mjs` → **150 comprobaciones OK, 0 fallos**
(incluye vista directa, ficha integrada, móvil, tooltip, teclado y paridad
tabla ↔ burbujas).

## Contrato de datos preservado

Cada fuente mantiene su unidad, periodo, cobertura y notas; no se suman entre sí:

- **UPMRIP/SEGOB** — personas migrantes en situación irregular que manifestaron victimización y quedaron
  en registros administrativos: serie 2016–2025 (6 368 registros anuales agregados, no personas únicas) y
  corte preliminar enero–septiembre de 2026 (62 registros). La entidad de registro no equivale al sitio
  del delito; no es un censo de delitos ni de toda la población migrante.
- **ICIJ/CLIP** — 156 incidentes documentados (2018–2023), 172 vehículos, al menos 111 muertes reportadas
  en 13 filas, 148 filas con coordenadas y 99 de precisión exacta. Una fila es un incidente, no una
  persona; las celdas vacías no son cero; el mapa señala incidentes, no rutas activas.
- **OIM DTM** — corredor centroamericano descrito por países (corte de referencia abril de 2026) y capa
  ArcGIS Shelter Service con 3 822 features en 8 países: extensión parcial, sin fecha de actualización
  visible; no es un directorio vigente de albergues ni orientación práctica.
- **Vistas previas** de MMP, El Paso, EAAF y REDODEM conservadas con su documentación anterior.
- **RARAMIR, Grupos Beta, ACNUR y OIT** quedan documentadas como fuentes pendientes, sin cifras
  inventadas. No se dibujan rutas de «La Bestia» ni rutas de carteles.

## Verificación ejecutada

`node tools/verificar-vidas-en-transito.mjs` → **60 comprobaciones OK, 0 fallos**:

- tarjeta en «Dashboards y visualización» con la etiqueta «Ciencia de datos · Observatorio humanitario»,
  estado «En desarrollo», portada propia de **1600 × 1726** con `object-fit: cover` en la caja de ratio
  `1600 / 1726`, destino `#/area/dashboards/vidas-en-transito` y las demás tarjetas del área intactas;
- ficha con marco de **1092 px** de ancho y **6 641 px** de alto (≥ 85vh), `title` accesible, contenido
  ajustado al marco (6 641 ≈ 6 641 px);
- tablero con **39 tablas** accesibles, **29** gráficos SVG, **148** puntos del mapa de incidentes y las
  **seis** vistas internas con contenido propio (panorama · muertes · desapariciones · contexto · rutas ·
  método);
- selección de un punto del mapa: `2023-12-14 · Oaxaca · precisión exacta. Migrantes mencionados: 30.
  Muertes: sin dato.`;
- «Volver» regresa al área; la ruta directa `/dashboards/vidas-en-transito/index.html` sirve el tablero
  con sus datos cargados;
- 1440, 1024 y 390 px sin desbordamiento de página, con marco utilizable y altura ≥ 85vh en cada tamaño;
- cero respuestas 4xx/5xx y cero errores de consola.

Capturas en `evidencias/vidas-en-transito/`: `01-area-dashboards.png`, `02-tarjeta.png`,
`03-ficha-dashboard.png`, `04-dashboard-top.png`, `05-mapa-incidentes.png`, `05b-detalle-incidente.png`,
`06-ficha-1024.png` y `06-ficha-390.png`, más `verificacion.log`.

Burbujas empaquetadas (v0.13.2): `node tools/verificar-burbujas-vidas.mjs` → **150 comprobaciones
OK, 0 fallos**. Además de lo anterior, comprueba que las 44 burbujas de los cinco paneles se dibujan en la
vista directa y dentro de la ficha, que ningún círculo se solapa ni se recorta, que el área es proporcional
al conteo, que la tabla accesible coincide con lo dibujado, que el tooltip y la selección funcionan con
cursor, toque y teclado, y que a 390 px no hay desplazamiento horizontal. Capturas: `burbujas-origen.png`,
`burbujas-destino.png`, `burbujas-destino-tooltip.png`, `burbujas-destino-seleccion.png`,
`burbujas-motivos.png`, `burbujas-violencias.png`, `burbujas-perpetradores.png`, `burbujas-movil.png`,
`burbujas-origen-movil.png`, `burbujas-ficha.png` y `verificacion-burbujas.log`.
Regresiones: `verificar-mapa-vidas.mjs` (129 OK), `verificar-burbujas-vidas.mjs` (150 OK) y `verificar-vidas-en-transito.mjs` (60 OK).

## Ferromex y evidencia de tránsito (v0.14.0)

El mapa conserva su composición y añade dos lecturas que antes no estaban separadas:

- **Ferromex dentro de la red oficial.** No se dibuja a mano ni se aproxima por
  ciudad: se usa el campo `ENTIDAD` del servicio «Vías ferroviarias» de ARTF · IDE.
  Los **270** tramos con «Ferrocarril Mexicano, S.A. de C.V.» se marcan como Ferromex
  (continuo oscuro) y el selector «Red ferroviaria · operador» permite ver los 270 de
  Ferromex, los 539 de otras redes o los 809. El resto de operadores se conserva con
  su nombre en la ficha (Ferrosur 146, KCSM 180, otros concesionarios 143, sin
  concesionar/asignar 70). Ferromex declara 11 000 km, 24 estados, 13 puertos y 6
  cruces fronterizos (consulta 13-nov-2026); son cifras corporativas de contexto, no
  la medida de la geometría.
- **Tránsito migrante documentado · INM 2023.** Capa aparte, con **13 zonas estatales**
  tomadas de los comunicados **119/23 (20-sep-2023)** y **124/23 (22-sep-2023)**. No
  son trayectos ni estaciones: la fuente solo identifica estados, así que la capa se
  dibuja con límites estatales de Natural Earth (dominio público) y cada ficha declara
  qué comunicado la sostiene, el período y el límite de lectura. El mapa archivístico
  de El Colegio de México (2014) se cita como referencia histórica y no se reproduce
  (CC BY-NC-ND, sin geometría).
- **Nota visible en el lienzo.** «Las vías representan infraestructura ferroviaria. Las
  capas de uso migrante se basan en fuentes y períodos específicos; no muestran todos
  los trayectos ni prueban que se haya utilizado cada tramo de la red. La superposición
  de capas no implica causalidad.»
- **Verificación.** `node tools/verificar-mapa-vidas.mjs` → **129 comprobaciones OK, 0
  fallos**. Comprueba, entre otras cosas, que la geometría servida coincide con los
  SHA-256 registrados (809 vías, 6 707 vértices, extensión −117,03…−88,15 /
  14,67…32,66; 13 zonas), que el filtro de operador devuelve 270/539/809, que las
  capas se encienden y apagan por separado, que las fichas de vía, zona, tramo e
  incidente se sustituyen sin residuos, que Enter y Escape funcionan sobre los
  elementos enfocados, que la tabla sin mapa abre las mismas fichas y que a 390 px no
  hay desbordamiento ni errores de consola.
- **Capturas.** `mapa-ferroviaria-evidencia.png` (vías, zonas, corredor e incidentes a
  la vez), `mapa-ficha-ferroviaria.png`, `mapa-ficha-evidencia.png`,
  `mapa-bloque-escritorio.png`, `mapa-ferroviaria-evidencia-movil.png`,
  `mapa-bloque-movil.png`, `mapa-ferromex-filtro.png` (solo los 270 tramos de
  Ferromex) y `mapa-zoom-norte.png` (norte de México al 332 %, símbolos a tamaño
  constante), con el log en `verificacion-mapa.log`.
- **Lo que no cambia.** El SHP «Vía férrea, 2025» de ATTRAPI sigue sin incorporarse
  (HTTP 403 registrado) y no se atribuye a la capa visible; no se etiqueta la red como
  «La Bestia»; los centros de apoyo siguen desactivados.

## Pendientes conocidos

- **El tablero es una página larga** (≈9 750 px a 1 092 de ancho): el marco crece con el contenido, como en
  «Gaza · Vidas y territorio». No hay scroll anidado, pero la ficha exige un desplazamiento largo.
- **Cuatro fuentes siguen pendientes** (RARAMIR, Grupos Beta, ACNUR y OIT): el propio tablero las declara
  sin cifras. La geometría ferroviaria ya está incorporada (ARTF · IDE) y el SHP de ATTRAPI 2025 queda
  documentado como no disponible (HTTP 403).
- **Estado «En desarrollo»**: al desplegar, cambiar `estado: 'publicado'` y retirar `notaEstado` en
  `dist/content.js`.
- El paquete rotula su inventario como 20 paneles nuevos (`MANIFEST.json`) y `LEEME.md` habla de 19
  visualizaciones nuevas; la ficha cita veinte siguiendo el manifiesto y el inventario numerado.








## Mapa hexagonal de muertes y desapariciones (v0.15.0)

La vista **Muertes documentadas** abre con un mapa hexagonal como pieza principal,
en un solo lienzo con selector **Muertes / Desapariciones**.

- **Datos.** OIM Missing Migrants Project (HDX, CC BY-IGO, descarga 13-nov-2026):
  23 826 filas; 6 089 del corredor del proyecto con coordenadas dentro del
  encuadre. Muertes = filas con `number_dead > 0` (5 926 incidentes, 7 142
  personas); desapariciones = filas con `number_missing > 0` (152 incidentes, 536
  personas). No se suman entre sí.
- **Malla.** 936 hexágonos terrestres, 206 con datos MMP, escala secuencial rosa a
  rojo oscuro por cuantiles; celdas sin registros en gris y con explicación de que
  la ausencia de filas no equivale a ausencia de muertes. Con la fuente ICIJ/CLIP
  activa se usan los mismos hexágonos y el mismo tamaño de celda, con una rampa
  naranja propia (148 filas en 56 celdas); no hay puntos circulares.
- **Base y capas.** Límites de país y estatales, corredor OIM generalizado (no
  GPS), red ferroviaria ARTF con Ferromex diferenciado, zonas del INM 2023. La
  fuente se elige en el control «Fuente»: OIM/MMP, ICIJ/CLIP y —solo en
  desapariciones— EAAF agregado.
- **Interacción.** Medida (incidentes/personas), periodo (solo años con datos),
  fuente, ficha por celda, tabla accesible y navegación por teclado; zoom con
  botones, rueda centrada en el cursor y pinza táctil, arrastre y «Restablecer».
  Los controles de MMP y de ICIJ/CLIP se mantienen separados: sus cifras no se
  suman ni se presentan como un total común.
- **EAAF.** El panel del mapa muestra los cinco agregados de
  `missing_search_aggregates` (2 351 casos no localizados; 2 240 familias; 6 000
  perfiles/donantes de ADN; 2 500 casos de desaparecidos y 490 identificaciones
  al 14-ago-2026) y no se suman con MMP. El detalle por banco/mecanismo, año,
  entidad de México* y país de hallazgo —incluido el total de 406
  identificaciones al 28-feb-2025— se abre en Desapariciones (v0.33.0).
- **Verificación.** `node tools/verificar-hexbin-vidas.mjs` → **94 comprobaciones
  OK** (sumas de celdas contra los totales derivados, modos, filtros, fuentes,
  fichas, capas, teclado, zoom de rueda y pinza, tabla y móvil, sin errores ni
  peticiones externas). Regresiones: mapa de Panorama **129 OK**, burbujas **150
  OK** y tablero **60 OK**.
- **Capturas.** `hexbin-escritorio.png`, `hexbin-mapa.png`,
  `hexbin-icij-mapa.png`, `hexbin-icij-ficha.png`,
  `hexbin-desapariciones.png`, `hexbin-ficha.png` y `hexbin-movil.png`, con el
  log en `verificacion-hexbin.log`.

- **Pendiente.** El CSV crudo de MMP no se distribuye (solo la malla agregada);
  El Paso no tiene puntos publicados en esta vista; 45 filas del corredor
  quedaron sin celda terrestre cercana y se declaran en el panel.

## Fechas de registro y contexto de fuentes (v0.22.0)

- La antigua sección «Calendario de evidencia» pasa a ser una **sección
  secundaria** titulada **«Fechas de registro en las fuentes»**, con pregunta
  editorial explícita: ¿en qué meses y años aparecen registros fechados en MMP y
  El Paso? La respuesta describe la disponibilidad de cada archivo, no una
  cronología de muertes.
- Cada calendario declara su campo exacto: MMP `reported_date` (fecha de reporte)
  y El Paso `Pronouncement Date` (fecha de pronunciamiento). Ninguno equivale
  necesariamente a la fecha de fallecimiento. Los calendarios conservan escalas
  independientes y una celda sin filas se explica como ausencia de fila fechada,
  no como cero muertes ni ausencia de observación.
- La secuencia de países del corredor OIM DTM, las tarjetas de volumen de archivo
  y la matriz de cobertura se trasladaron a **Fuentes y método**, bajo el título
  «Contexto territorial, fuentes y cobertura». Los volúmenes separan archivos de
  registros (filas MMP y registros de expediente de El Paso) de los agregados
  EAAF (casos), sin presentarlos como una misma unidad.
- La vista **Muertes documentadas** conserva el mapa hexagonal y los análisis de
  ruta y causa reportada, pero ya no muestra las tarjetas de volumen de archivo.
  Declara que no existe una fecha de fallecimiento comparable y que no dibuja una
  tendencia de muertes ocurridas; el periodo del mapa filtra la fecha de reporte
  de MMP y se lee como contexto de registro.
- **Verificación.** `node tools/verificar-vidas-en-transito.mjs` → **48
  comprobaciones OK**, incluidas la pregunta editorial, las dos semánticas de
  fecha, las escalas independientes, la reubicación de contexto/volumen/cobertura,
  la separación filas ↔ casos EAAF y la ausencia de tendencia de muertes.
  Capturas: `fechas-registro.png`, `fuentes-metodo.png` y
  `muertes-registros.png`.

## Panorama de personas y perfiles (v0.23.0)

- Panorama incluye la tarjeta **«Registros de monitoreo»**: 40,800
  filas calculadas desde `data.json`, periodo 2023–2024 y la aclaración de que son filas
  de atención/observación, no personas únicas ni el total de personas migrantes.
  Desde v0.25 el mapa abre la pestaña y estos perfiles quedan después.
- Tres visualizaciones responden preguntas concretas, cada una con su tabla
  accesible y su nota de fuente, periodo, unidad, denominador y límite:
  1. **Edad y sexo consignados** en la matriz de edad × género, conservando
     «No especificado».
  2. **País registrado en el campo de nacimiento**, con «No especificado» aparte y
     la advertencia de que no es nacionalidad verificada.
  3. **Destino capturado en el registro**, con el literal `NA` separado; no
     confirma cruce fronterizo, destino final ni permanencia en México.
- La sección explicita que no puede responderse cuántas personas cruzaron a
  Estados Unidos ni cuántas se quedaron en México, y no dibuja ninguna gráfica de
  resultados de cruce.
- La cobertura detallada del campo «violencias» se trasladó a **Fuentes y método**;
  la pestaña **Atención y perfiles** conserva la composición por año, motivos y
  violencias declaradas como detalle secundario. REDODEM no se combina con MMP,
  El Paso ni EAAF.
- **Verificación.** `node tools/verificar-vidas-en-transito.mjs` → **60
  comprobaciones OK**, con cifras contrastadas contra `data.json`, revisión de
  unidades, «No especificado»/`NA`, ausencia de cruce y orden de bloques
  del mapa. burbujas **150 OK**, mapa de Panorama **129 OK** y hexbin **94 OK**.
  Capturas: `panorama-perfiles.png`, `panorama-perfiles-movil.png` y
  `metodo-cobertura.png`.

## Mapa protagonista y panel cartográfico (v0.24.0)

- La sección cartográfica abre con el título **«Corredor, ferrocarril e
  incidentes documentados»** y una descripción única de las cuatro capas. El
  encabezado y la descripción no se repiten en la sección.
- En escritorio el mapa ocupa **dos tercios del ancho**; el panel lateral reúne
  capas, filtros y ficha de selección. La leyenda completa está inmediatamente
  debajo del mapa, dentro de su ancho, con una entrada por color/trazo, unidad y
  límite. «Fuentes, disponibilidad y límites» queda en un acordeón cerrado debajo
  de la leyenda, y «Explorar datos en tabla» integra corredor, red ferroviaria,
  zonas e incidentes en una sola tabla accesible.
- Los incidentes pasan a **marcadores naranjas**; la red ferroviaria distingue
  Ferromex, otras redes y tramos sin uso con los atributos disponibles. La
  selección muestra nombre, tipo, fuente, corte, precisión y nota metodológica;
  en incidentes, los campos ausentes dicen **«No disponible»**, nunca cero.
- En móvil el mapa usa casi todo el ancho y el panel «Capas y filtros» empieza
  plegado; se conservan zoom, arrastre, reset y teclado.
- **Verificación.** `node tools/verificar-mapa-vidas.mjs` → **129 comprobaciones
  OK**, incluidas proporción del mapa, título/descripción únicos, leyenda bajo el
  mapa, fuentes cerradas, tabla única, colores, fichas y móvil. Tablero **60 OK**,
  burbujas **150 OK** y hexbin **94 OK**. Capturas: `mapa-despues.png`,
  `mapa-movil.png`, `mapa-bloque-escritorio.png` y `mapa-bloque-movil.png`.

## Panorama con el mapa al inicio (v0.25.0)

- El orden de Panorama es ahora: navegación Atlas → mapa **«Corredor, ferrocarril
  e incidentes documentados»** con controles y panel lateral → leyenda → fuentes y
  tabla → tarjetas de personas y perfiles → EAAF. Los calendarios se retiraron de
  Panorama en v0.28 y viven en Fuentes y método.
- La tarjeta «Registros de monitoreo», sus tres gráficas y el aviso de que el
  destino no verifica cruce ni permanencia quedan **después** del mapa. No se
  eliminó información: solo se reubicó.
- El mapa no se duplica y las demás pestañas no cambian. En escritorio es visible
  desde el inicio de Panorama; el panel lateral conserva capas, filtros y ficha.
- **Verificación.** Tablero **60 OK**, mapa **129 OK**, burbujas **150 OK** y hexbin
  **94 OK**. Captura: `panorama-inicio.png`.

## Exploración por edad y sexo en las burbujas (v0.26.0; corregido en v0.27.0)

- «País registrado en el campo de nacimiento» y «Destino capturado en el registro»
  incorporan un selector segmentado con cápsula deslizante, al estilo del Atlas
  Vial: **Vista general**, **Explorar por edad** y **Explorar por sexo**.
- La **Vista general** conserva las burbujas actuales, el área proporcional a filas,
  la agrupación «Otros», «No especificado» y el literal `NA` separado.
- Cada tarjeta declara junto a la vista el total de filas, el denominador, los
  registros con dato y los faltantes; el detalle selecciona **una sola categoría**
  y no suma otros países o destinos.
- **Auditoría inicial:** la primera implementación solo consultaba los marginales
  de `data.json` y declaraba que faltaba el cruce. Se localizó el CSV oficial de
  REDODEM y en v0.27 se calcularon los cruces reales; el detalle ya dibuja el
  desglose y conserva «No especificado».
- **Verificación.** `node tools/verificar-burbujas-vidas.mjs` → **148
  comprobaciones OK**, incluidas cápsula, modos, cruces reconciliados, NA separado,
  detalle, vuelta a la vista general y móvil. Captura:
  `origen-explorar.png`.

## Cruces REDODEM reales (v0.27.0)

- Se añadió `preparar_redodem.py`, que lee el CSV/ZIP oficial de monitoreo de
  protección (40,800 filas) y publica en `runtime/data.json` los agregados:
  país × grupo etario, país × género, destino × grupo etario y destino × género.
- Los cruces de país suman 40,800 y los de destino 6,059; las 34,741 filas con
  `pais_destino = NA` quedan en el indicador aparte y no entran en el desglose.
  «No especificado» de edad y género se conserva como categoría.
- «Explorar por edad» y «Explorar por sexo» dibujan ahora burbujas reales para la
  categoría seleccionada, con tooltip, leyenda, denominador y tabla accesible; la
  vista general se oculta durante el detalle y «Volver» la restaura.
- La agrupación «Otros» suma los cruces de sus categorías miembros; no se inventan
  distribuciones a partir de marginales. El CSV crudo no se copia al build.
- **Fuente:** https://monitoreo-de-proteccion.redodem.org/csv/base_monitoreo-de-proteccion_redodem.zip
- **Verificación.** burbujas **150 OK**, tablero **60 OK**, mapa **129 OK** y hexbin
  **94 OK**. Verificación de cruces: 40,800 filas de país y 6,059 de destino
  reconciliadas en `tools/verificar-burbujas-vidas.mjs`.

## Fechas de registro fuera de Panorama (v0.28.0)

- La sección «Fechas de registro en las fuentes» y sus dos calendarios se
  retiraron de **Panorama**. Ya no aparece como contenido secundario, plegado ni
  en ninguna otra forma dentro de esa pestaña.
- Para conservar la trazabilidad, los calendarios se movieron a **Fuentes y
  método**, dentro de un bloque plegable titulado **«Fechas de registro de MMP y
  El Paso»**. El bloque inicia cerrado y reúne los calendarios, su tabla
  accesible y la explicación de `reported_date` y `Pronouncement Date`.
- Esa explicación se conserva solo donde interpreta las fuentes: ninguna de las
  dos fechas equivale necesariamente a la fecha de fallecimiento, una celda sin
  fila no es un cero de muertes y el bloque no se presenta como tendencia.
- Panorama conserva el mapa como primer bloque y, debajo, la tarjeta de
  registros, los perfiles REDODEM y la búsqueda e identificación. Se retiró el
  contenedor de dos columnas que solo existía para emparejar los calendarios con
  la tarjeta EAAF, sin dejar espacios ni separadores vacíos.
- **Verificación.** tablero **64 OK**, burbujas **150 OK**, mapa **129 OK** y
  hexbin **94 OK**; capturas `panorama-sin-fechas.png`, `metodo-fechas-plegado.png`,
  `metodo-fechas-abierto.png` y `metodo-fechas-movil.png`.

## Lenguaje visual compartido en Panorama (v0.29.0)

- Las gráficas de Panorama reutilizan el sistema del mapa: fondo blanco,
  superficies gris azulado muy tenue (`#f6f8fd` / `#fbfcff`), bordes finos
  (`#dfe4ec` / `#e8ecf3`), radios de 8–16 px y tipografía editorial Georgia para
  títulos con etiquetas Inter pequeñas y legibles.
- Los títulos de perfiles quedan por debajo del título del mapa; las notas
  metodológicas y de fuente adoptan el tratamiento de `.geo-note` (barra índigo,
  fondo muy claro), y las tablas accesibles comparten caption, encabezado
  `#f6f8fd` y etiquetas en mayúsculas con la tabla del mapa.
- La matriz edad × sexo usa una escala secuencial índigo–lavanda calculada desde
  cada conteo; no es una proporción poblacional. «No especificado» se conserva en
  gris y los ceros se distinguen como «ninguna fila en esa combinación». Todas
  las cifras mantienen contraste AA (mínimo 4.95:1).
- País de nacimiento y destino comparten lienzo (577×340 px en escritorio),
  guía, leyendas, tooltip oscuro y tabla. Las categorías usan índigo y la
  agrupación «Otros» lavanda con texto oscuro; `No especificado` y `NA` siguen
  fuera de las burbujas y en gris.
- La comparación EAAF conservó sus cinco indicadores y añadió fecha de corte y
  unidad; en v0.30 se sustituyeron los puntos y líneas por bloques editoriales.
- La tarjeta de cifras de v0.29 se sustituyó en v0.30 por una nota compacta de
  alcance; la unidad, la fuente y el periodo siguen visibles.
- Los colores semánticos del mapa no cambian: azul para el corredor OIM, naranja
  para incidentes ICIJ/CLIP, morado para ferrocarril y grises para límites y
  zonas INM. Ninguna gráfica demográfica usa naranja ni morado ferroviario.
- **Verificación.** visual de Panorama **53 OK**, tablero **64 OK**, burbujas
  **150 OK**, mapa **129 OK** y hexbin **94 OK**; capturas
  `panorama-unificado-perfiles.png`, `panorama-unificado-eaaf.png`,
  `panorama-unificado-tooltip.png` y `panorama-unificado-movil.png`.

## Alcance, totales y lectura de indicadores (v0.30.0)

- La tarjeta grande de 40,800 se sustituyó por una nota de alcance:
  «Base analizada: 40,800 registros REDODEM · 2023–2024», seguida de la
  advertencia de que son filas de atención u observación y no necesariamente
  personas distintas ni el total de población migrante. La fuente, el periodo y
  la unidad siguen visibles. La bajada de la sección ya no repite la cifra.
- La matriz de edad × sexo conserva sus 24 celdas y añade 11 celdas de total:
  6 totales por fila, 4 por columna y el total de la base. Los cálculos desde
  `data.json` son:
  - filas: Niñxs 6,768 · Adolescentes 2,768 · Adultos jóvenes 14,722 ·
    Adultos 15,666 · Adultos mayores 546 · No especificado 330;
  - columnas: Hombre 25,339 · Mujer 14,787 · Persona no binaria 63 ·
    No especificado 611;
  - total: 40,800. Todas las filas y columnas reconcilian exactamente con la base.
- El selector «Conteos» / «Composición dentro del grupo de edad» cambia los
  valores impresos, tooltips, leyenda y nota. En composición, el denominador es
  el total de registros de la fila de edad; los porcentajes se redondean a un
  decimal y no se presentan como proporciones de la población migrante. La fila
  «Total» permanece en filas absolutas y la columna «Total» muestra 100 % del
  grupo.
- El título se calcula desde los conteos: «Adultos y adultos jóvenes concentran
  el 74,5 % de los registros» (30,388 de 40,800). Si el patrón no se confirmara,
  quedaría el título neutral «Registros por grupo de edad y sexo registrado».
- La búsqueda e identificación deja de usar puntos del mismo tamaño: cinco
  indicadores se organizan en dos grupos editoriales por corte (28 feb 2025 y
  14 ago 2026). Cada tarjeta declara nombre, cifra, unidad, fuente y fecha;
  conserva `>` y las precisiones literales. Una nota final aclara que son
  agregados independientes y no etapas de un mismo proceso. La tabla accesible
  mantiene cinco filas y las mismas cifras.
- **Verificación.** visual de Panorama **76 OK**, tablero **64 OK**, burbujas
  **150 OK**, mapa **129 OK** y hexbin **94 OK**; capturas
  `panorama-composicion.png`, `panorama-composicion-movil.png` y
  `panorama-unificado-eaaf.png`.

## Eventos migratorios registrados por año (v0.31.0)

- Se añadió en Panorama la gráfica **«Eventos de personas en situación migratoria
  irregular registrados en México»**, con columnas anuales 2021–2026.
- La serie se verificó en los cuadros **3.1** del Boletín Estadístico de
  UPMRIP/SEGOB, con base en registros del INM:
  - 2021: 309,692 · 2022: 441,409 · 2023: 778,907 · 2024: 1,234,698 ·
    2025: 155,730;
  - 2026: 31,077, solo enero–septiembre, marcado como **parcial**. No se
    proyecta ni se anualiza.
- 2020 se excluyó de la serie: su cuadro 3.1 reporta «extranjeros presentados»
  y no tiene la misma definición ni las columnas Presentados/Canalizados de
  2021 en adelante. El XLS se conserva en `insumos_fuente/` como antecedente.
- Cada año completo cubre enero–diciembre. La tabla 3.1 declara información
  preliminar sujeta a validación. La definición administrativa cambió en 2013
  (presentación) y 2021 (PAM); la fuente homologa el concepto y una misma persona
  pudo tener más de un evento.
- La gráfica muestra fuente, unidad, periodo, fecha de consulta y corte, además
  de la definición oficial. Los tooltips declaran año, conteo, unidad y estado
  completo/parcial. La tabla accesible tiene seis filas y los mismos valores.
- La fecha consignada es la de consulta (13 nov 2026); la fuente no publica una
  fecha de actualización explícita. Los XLS oficiales quedaron archivados en
  `insumos_fuente/eventos_migratorios/` y `preparar_eventos_migratorios.py`
  regenera el bloque `eventos_migratorios` de `data.json` validando la suma de
  los subtotales mensuales.
- **Verificación.** eventos migratorios **37 OK**, visual de Panorama **76 OK**,
  tablero **64 OK**, burbujas **150 OK**, mapa **129 OK** y hexbin **94 OK**;
  capturas `eventos-migratorios.png` y `eventos-migratorios-movil.png`.

## Respuesta y alojamiento registrados (v0.32.0)

- Se añadió la sección **«Respuesta y alojamiento registrados»** con cuatro
  pequeños múltiplos alineados por año, escalas independientes y unidad de
  eventos: total de personas devueltas, eventos de deportación, retorno asistido
  y retorno asistido de niñas, niños o adolescentes. No hay barras apiladas ni
  líneas que conecten las medidas.
- Fuente: Cuadro **3.2.3** de UPMRIP/SEGOB. La serie usa 2021–2025 completos y
  2026 enero–septiembre parcial; el corte se declara como septiembre de 2026.
- Totales por año (total · deportación · retorno asistido · retorno asistido de
  NNA): 2021: 130,275 · 2,298 · 104,929 · 23,048; 2022: 121,963 · 4,143 ·
  104,897 · 12,923; 2023: 54,728 · 3,626 · 43,437 · 7,665; 2024: 20,834 · 516 ·
  16,398 · 3,920; 2025: 11,804 · 1,153 · 9,165 · 1,486; 2026: 10,829 · 4,559 ·
  5,832 · 438.
- Cada total es exactamente la suma de los tres tipos publicados. No se apila ni
  se suma con los eventos del Cuadro 3.1 ni con alojamiento. Los nombres y las
  definiciones literales de los tipos están en el panel desplegable
  «Definiciones de los tipos de resolución».
- **Alojamiento:** no se localizó una serie periódica comparable 2021–2026 de
  personas alojadas en estaciones migratorias o estancias provisionales en los
  cuadros del Boletín consultados. La vista se deja fuera y se informa el dato
  faltante; se distingue explícitamente entre personas alojadas durante un
  periodo, ocupación simultánea y capacidad instalada. No se inventa una serie.
- **Verificación.** respuesta migratoria **38 OK**, eventos migratorios **37 OK**,
  visual de Panorama **76 OK**, tablero **64 OK**, burbujas **150 OK**, mapa
  **129 OK** y hexbin **94 OK**; capturas `respuesta-alojamiento.png` y
  `respuesta-alojamiento-movil.png`.

## Explorador EAAF de Desapariciones (v0.33.0)

- Se integró de forma selectiva el módulo del paquete `v0.14.1` en el tablero
  `v0.32.0`, sin reemplazar el HTML ni los datos completos. La vista
  **Desapariciones** abre los cuatro indicadores EAAF del corte 28-feb-2025 y
  permite recorrer **corte → indicador → desglose → categoría**.
- **Datos.** `runtime/data.json` añade `eaaf_public_detail` con 160
  observaciones (una por indicador × corte × dimensión × categoría publicada).
  Totales: 2,351 casos no localizados; 2,240 familias; 6,000 donantes de ADN;
  406 identificaciones. `missing_search_aggregates` conserva sus cinco
  indicadores para no alterar el Panorama.
- **Desgloses.** Banco o mecanismo (11 categorías para casos, familias y
  donantes; 7 para identificaciones), serie anual (2010–2025 para casos y
  donantes; 2011–2025 para identificaciones), 22 entidades de México* y país de
  hallazgo para identificaciones. Los años son la fecha del evento que titula la
  serie, no la fecha de desaparición.
- **México*.** Al seleccionar el subtotal se ofrece abrir las 22 entidades. El
  detalle declara el subtotal (578 casos; 529 familias; 1,448 donantes) y que
  las entidades ausentes no se imputan a cero. Chiapas y Oaxaca son bancos
  separados y no forman parte de ese subtotal.
- **2026.** El corte 14-ago-2026 solo se muestra con >2,500 casos y >490
  identificaciones; no tiene desglose comparable, no se interpola y no se
  conecta como tendencia con 2025.
- **Accesibilidad.** Barras y tabla accesible usan el mismo indicador, unidad,
  corte y nivel. Los controles son botones con `aria-pressed`, foco visible y
  etiquetas; en 390 px no hay recorte horizontal. El estado seleccionado se
  anuncia en una región `aria-live`.
- **Respaldo.** Si falla `data.json`, `#eaaf-inline-data` dibuja el explorador y
  el Panorama EAAF; el resto del tablero sigue necesitando el servidor local.
- **Herramienta offline.** `preparar_eaaf.py` reconstruye el detalle y el
  respaldo; no forma parte del runtime ni de `construir.py`.
- **Verificación.** `node tools/verificar-eaaf-vidas.mjs` → **64 comprobaciones
  OK, 0 fallos**; capturas `eaaf-explorer-escritorio.png`,
  `eaaf-explorer-2026.png` y `eaaf-explorer-movil.png`. Regresiones: tablero
  **64 OK**, visual de Panorama **76 OK**, eventos **37 OK**, respuesta **38
  OK**, burbujas **150 OK**, mapa **129 OK** y hexbin **94 OK**.

## Atención y perfiles · lectura de motivos y violencias (v0.34.0)

- La pestaña **«04 — Atención y perfiles · detalle»** se reorganizó como una
  lectura editorial de las fichas REDODEM: contexto del archivo, UpSet de
  motivos, matriz de coaparición, rankings de menciones y cobertura del campo
  por año. La unidad visible es **registro de atención u observación**.
- **Fuente y grano.** 40,800 filas del CSV local REDODEM (2023–2024). El ETL usa
  la posición 1-based del CSV como identificador interno para contar filas
  distintas en cada pareja; no se exporta ni se muestran microdatos.
- **Motivos.** 6,338 filas con algún motivo, 34,462 con `NA`, 0 en blanco y 7,863
  menciones (4,066; 3,325; 405; 67). Las 14 combinaciones observadas suman 6,338
  filas. El UpSet separa el `NA`, no lo trata como motivo y no construye
  combinaciones no observadas.
- **Coaparición.** 469 filas con ambos campos; 30 solo violencias; 0 solo
  perpetradores; 40,301 sin valor en ninguno. Las 469 filas producen 950
  coapariciones de categoría; 76 pares tienen filas y 64 tienen 0. Cada celda
  cuenta filas distintas, no la suma de marginales.
- **Privacidad.** El proyecto no tenía umbral. Se adopta **5**: 38 celdas
  publican la cifra exacta, 38 celdas con 1–4 filas se suprimen como rango y 64
  pares con 0 no se listan. La tabla accesible tampoco revela las cifras
  suprimidas; el umbral se declara en la interfaz y en `data.json`.
- **Rankings.** 14 violencias (499 filas con valor; 737 menciones) y 10
  perpetradores (469; 597). «No especificado» es una respuesta explícita: 7
  menciones y 3 filas que solo declaran esa categoría. No es el literal `NA`.
- **Cobertura anual.** 2023: 317 de 22,123 (1.43 %); 2024: 182 de 18,677
  (0.97 %). Los puntos conectados solo unen los dos años; la advertencia visible
  aclara que no miden prevalencia ni evolución de la violencia.
- **Diferencia de etiqueta.** El archivo usa «Destrucción de documentos de
  identidad y migratorios»; la referencia de trabajo la abrevia. No hay otras
  diferencias de conteo.
- **Verificación.** `node tools/verificar-atencion-redodem.mjs` → **53
  comprobaciones OK, 0 fallos**; capturas `atencion-perfiles-escritorio.png`,
  `atencion-perfiles-movil.png`, `atencion-matriz-escritorio.png`,
  `atencion-matriz-movil.png` y `atencion-anio-movil.png`. Regresiones: EAAF
  **64 OK**, tablero **64 OK**, visual de Panorama **76 OK**, eventos **37 OK**,
  respuesta **38 OK**, burbujas **105 OK** (solo origen y destino de Panorama; los
  tres paneles de Atención pasaron a UpSet, matriz y rankings), mapa **129 OK** y
  hexbin **94 OK**.






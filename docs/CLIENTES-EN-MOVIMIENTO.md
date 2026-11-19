# Clientes en movimiento — integración en el portafolio

Proyecto del área «Ciencia de datos y Machine Learning», tras Walmart M5 y Clientes y campañas.
Ficha: `#/area/ciencia-de-datos/clientes-en-movimiento`.

Nombre visible: **Clientes en movimiento**.
Descripción de la tarjeta: «Segmentación de hogares compradores y evolución de sus hábitos con
clustering y datos reales de Complete Journey».

## Qué se integró

El paquete aprobado incluye un tablero autónomo (`marketing_customer_project/dashboard/index.html`)
con estilos, JavaScript, SVG y datos incrustados. Para conservar exactamente el diseño, los cálculos
y las interacciones sin reescribirlos, se sirve como **página estática dedicada** y se muestra dentro
de la ficha en un marco del mismo origen:

| Pieza | Archivo | Función |
| --- | --- | --- |
| Página aprobada (servida) | `dist/dashboards/clientes-en-movimiento/index.html` | Copia byte a byte del HTML aprobado (plantilla + datos), sin backend |
| Plantilla y datos | `marketing_customer_project/dashboard/{template-v2.html,data-v2.json,index.html}` | Fuente editable y datos precalculados |
| Montaje en la ficha | `dist/projects/clientes-en-movimiento.js` | Crea el marco, ajusta su altura al contenido real (mismo origen) y limpia al salir |
| Tarjeta | `dist/content.js`, `dist/app.js`, `dist/style.css` | Título, descripción, portada real 1600 × 1726 y enlace a la ficha |
| Portada | `dist/img/clientes-en-movimiento-resumen.jpg` | Captura real del tablero servido, con la geometría de la tarjeta de Walmart M5 |
| Regreso | navegación de la ficha | «Volver a Ciencia de datos» y la cabecera del sitio siguen disponibles |

El marco se ajusta con `ResizeObserver` sobre el cuerpo de la página ajena y un sondeo de respaldo,
de modo que el tablero mide lo que mide su contenido: 3 100 px en escritorio y 4 253 px en 390 px,
sin barras de desplazamiento anidadas.

La portada es una captura vertical del propio tablero a **1600 × 1726 px** —la misma proporción
`1600 / 1726` que la tarjeta de Walmart M5 y que «Clientes y campañas»—, tomada del tablero servido
a todo el ancho de su capa (sin fondo de página a los lados ni barras de desplazamiento). La tarjeta
la ajusta con la clase compartida `.cover-tablero`: `object-fit: cover` y `object-position: top
center`, con el encabezado del tablero siempre visible. Se regenera con
`dashboards/clientes-campanas/integrado/tools/capturar-portadas.mjs`.

## Navegación (revisión 2)

Las cuatro vistas usan el **patrón de pestañas del portafolio** —el mismo componente de Walmart M5—
en lugar del fondo azul tenue de la entrega original:

- contenedor compartido gris claro `#f4f6fa` con borde `1px solid #dde2eb`, radio `12px` y relleno
  `4px` (`.tabs` dentro de `.navpantallas`, igual que `.ac-tabs` / `.ac-nav-pantallas`);
- pestaña activa con fondo `#374151` y texto blanco, peso `600`;
- pestañas inactivas con texto `#374151`, fondo transparente y hover `#e2e5ea`;
- alto mínimo `40px`, relleno `0 12px`, radio `9px`, tipografía `13.5px` con peso `500` y foco
  `outline: 2px solid #374151; outline-offset: 2px`;
- a partir de 720 px el contenedor ocupa el ancho completo, el relleno baja a `0 9px`, el espacio a
  `5px` y la tipografía a `12.5px`.

Etiquetas sin numeración: «Explorar clientes», «Corrientes», «Ritmo de compra» y «Evidencia». Cada
botón declara `aria-selected`, que es el selector del componente original. Los valores se copiaron de
`dashboards/atlas-comercial/src/estilos.css`; no se inventaron medidas. Cambiar de pestaña conserva
corte, perfil, cohorte, mínimo de canastas y hogar seleccionado (comprobado en la verificación). El
detalle del cambio y los hashes están en `marketing_customer_project/dashboard/REVISION-2.md`.

## Gráficas (revisión 2)

**Trayectorias conectadas.** Ocupa todo el ancho del bloque y mide 560 px de alto en escritorio y
380 px por debajo de 640 px. El área de dibujo, los márgenes y las escalas se recalculan en cada
dibujo y en cada cambio de tamaño a partir del ancho real del contenedor: el SVG no se estira con CSS.
Los ejes conservan sus marcas y etiquetas dentro del marco. Los puntos siguen siendo pequeños
(radio 3,1) y semitransparentes (opacidad 0,38); el hogar seleccionado se destaca con un halo de
10 px, centro sólido, trayectoria de trazo 3 y etiquetas J/A/S acotadas al área de dibujo. La ficha
«Selección vinculada» es ahora una franja compacta debajo de la gráfica, con sus campos en rejilla y
apilados en pantallas angostas. Los controles de ejes, escala log1p y «Ampliar gráfica» quedan encima;
el filtro de canastas, justo debajo. Las coordenadas son las reales: no hay jitter ni datos alterados.

**Corrientes de comportamiento.** Ocupa el ancho útil del panel, con 600 px de alto en escritorio y
420 px en pantallas angostas, y distribuye julio, agosto y septiembre entre los márgenes del área de
dibujo. Las trayectorias de fondo se atenúan a opacidad 0,1 y la del hogar seleccionado se dibuja con
trazo 3,4 y sus valores rotulados. En pantallas angostas el dibujo conserva un ancho mínimo y se
desplaza en horizontal dentro de su contenedor, sin desbordar la página. Los filtros siguen
inmediatamente encima. Mismos datos, misma escala log1p y mismos conteos.

**Vista ampliada.** Ambas gráficas ofrecen «Ampliar gráfica», que abre un diálogo con el mismo dibujo
recalculado a mayor tamaño; se cierra con el botón «Cerrar» o con Escape y conserva filtros y
selección, repintando las gráficas del tablero al cerrar.

## Vista «Evidencia»

Describe el modelo (K-Means con regla de tamaño mínimo), su validación por corte y los límites de
lectura. **No incluye leyendas de inspiración visual ni enlaces a galerías externas**: esa referencia
se retiró del tablero.

## Contrato analítico (verificado contra los datos)

- Universos por corte: **2 300** (1 jul 2017), **2 317** (1 ago) y **2 311** (1 sep).
- Cohorte común de los tres cortes: **2 207** hogares; **364** cambian de perfil en alguna transición.
- Estado por omisión: agosto, cohorte común, ambos perfiles y mínimo 0 canastas → 2 207 hogares.
- Hogar **19** en agosto: **96 canastas** y **2 250,38** de gasto observado.
- Hogar **1**, bloque **S13** en agosto: 26–31 de julio, **6 días**, **1 canasta** y **96,71** de gasto.
- Los bloques semanales (13 por hogar y corte) reconcilian con el snapshot: venta, canastas, líneas y
  cupones se suman sin diferencias.
- La etiqueta del perfil se define en el corte de referencia y se conserva en las demás vistas; la
  cohorte, el perfil y el mínimo de canastas también se fijan en ese corte.
- El filtro «Trayectorias» es local a la vista Corrientes: no altera la selección ni las demás vistas
  (comprobado: tras filtrar quedan 364 trayectorias y la selección sigue en 2 207 hogares).

## Verificación ejecutada

```bash
# 1. Paquete aprobado (hashes, universos, transiciones, datos semanales y HTML reproducible)
python tools/verify_delivery.py          # en la raíz del paquete original: PASS

# 2. Integración en el repositorio (página servida reproducible y contrato intacto)
python tools/verify_clientes_en_movimiento.py

# 3. Recorrido real en el navegador sobre el sitio servido (127.0.0.1:8000)
node tools/verificar-clientes-en-movimiento.mjs
```

`tools/verify_clientes_en_movimiento.py` comprueba que la página servida es la plantilla con los datos
inyectados (bytes idénticos, sin traducción de fin de línea), que el HTML del repositorio se reconstruye
igual, los universos, la cohorte, los 364 cambios, los valores por hogar, la reconciliación semanal y el
estado del manifiesto: **46 de 51 archivos coinciden** y las cinco diferencias están documentadas (tres
son la revisión 2 de navegación y su constructor determinista; dos son las correcciones de seguridad de
los scripts prospectivos del incremento anterior, que el tablero no usa).

`tools/verificar-clientes-en-movimiento.mjs` recorre el camino completo y pasa sin fallos: tarjeta →
ficha → tablero embebido → **pestañas con el patrón del componente** (etiquetas sin numeración, fondo
`#f4f6fa` del contenedor, activa `#374151` con texto blanco y peso 600, inactiva transparente con texto
`#374151` y peso 500, radios 12 px y 9 px, alto 40 px, relleno `0 12px`, fuente 13,5 px y foco de 2 px
con separación de 2 px) → cambio de corte, perfil y cohorte → búsqueda del hogar 19 → ritmo del hogar 1
y S13 → **recorrido de las cuatro pestañas conservando selección y filtros** → corrientes con filtro de
cambios → ejes configurables con y sin log1p → CSV de la selección completa (2 207 filas, con la fila
del hogar 19 y sus ocho columnas) → ráfaga de cambios de filtro → estado vacío → «Restablecer» →
teclado (vistas con Enter, búsqueda con Enter) → 390 px sin desbordes, cifras en dos columnas y
pestañas a ancho completo con fuente de 12,5 px → regreso al área.

## Diferencias intencionales respecto del paquete

1. Los documentos del paquete (`PROMPT_HARNESS.md`, `README_ENTREGA.md`, `MANIFEST.json`) quedaron en
   la raíz del repositorio para poder ejecutar el verificador adjunto.
2. La **revisión 2** cambia la navegación (pestañas con el patrón del portafolio) y la geometría de
   las dos gráficas principales (ancho completo, alturas, franja de selección y vista ampliada), y hace
   determinista el constructor: `template-v2.html`, `index.html` y `tools/build_dashboard.py` difieren
   del manifiesto `approved-blue-v2`, que se conserva sin modificar como referencia.
2. `randomize_segment_campaign_trial.py` y `evaluate_segment_campaign_trial.py` conservan las
   correcciones del incremento anterior (el aleatorizador ya no afirma `randomization_confirmed` y el
   analizador exige el manifiesto y aplica Holm). El tablero aprobado no usa estos scripts.
3. `tools/build_dashboard.py` escribe con la traducción de fin de línea del sistema: en Windows añade
   24 bytes frente al HTML aprobado. Por eso se sirve el artefacto aprobado tal cual y la
   reproducibilidad se comprueba en memoria, con fin de línea sin traducir.

## Alcance y límites

- Cada fila es un **hogar comprador**, no una persona identificada; la fuente es histórica
  internacional de 2017 y los importes están en la moneda de la fuente (no en pesos mexicanos).
- Las ventanas de 90 días se solapan: los cambios no prueban causalidad ni abandono, y pueden reflejar
  también el reajuste del agrupamiento en cada corte.
- Las posiciones de las trayectorias son variables observadas, no un embedding ni una prueba visual de
  la separación del clustering.
- Los tres anillos de la huella temporal tienen escalas independientes; el porcentaje de cupón se
  calcula por líneas de compra.
- Este módulo no estima respuesta a campañas, ingreso incremental, valor de vida ni abandono, y no
  integra el benchmark publicitario (otra población, evaluación separada).
- El tablero se sirve desde archivos estáticos: no hay API, base de datos ni reentrenamiento en el
  navegador. La integración quedó en local; **no se publicó nada en remoto**.

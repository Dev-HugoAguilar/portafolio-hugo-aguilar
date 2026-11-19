# Revisión 2 del tablero — navegación del portafolio y gráficas ampliadas

Cambio aprobado posterior a la entrega `approved-blue-v2`: **solo** afecta a las pestañas.

## Qué cambió

- Las pestañas dejan de usar el fondo azul tenue propio (`--pale`) y reutilizan el patrón del
  componente de navegación del portafolio / Walmart M5 (`dashboards/atlas-comercial/src/estilos.css`,
  reglas `.ac-tabs`, `.ac-tabs-btn`, `.ac-nav-pantallas` y su bloque de medios a 720 px).
- Etiquetas sin numeración: «Explorar clientes», «Corrientes», «Ritmo de compra» y «Evidencia».
- El marcado envuelve los botones en el contenedor del componente (`.navpantallas` → `.tabs`) y cada
  botón declara `aria-selected`, que es el selector que usa el componente original.

## Valores copiados del componente (sin aproximaciones)

| Elemento | Valor del componente | Token local |
| --- | --- | --- |
| Contenedor: fondo | `#f4f6fa` (`--at-soft`) | `--tab-track` |
| Contenedor: borde | `1px solid #dde2eb` (`--at-border`) | `--tab-border` |
| Contenedor: radio / relleno | `12px` / `4px` | — |
| Contenedor: disposición | `inline-flex`, `align-items: stretch`, `gap: 0`, `overflow-x: auto`, `scrollbar-width: thin` | — |
| Pestaña: alto mínimo | `min-height: 40px` | — |
| Pestaña: relleno / radio | `0 12px` / `9px` | — |
| Pestaña: tipografía | `13.5px`, peso `500`, `white-space: nowrap` | — |
| Pestaña inactiva | texto `#374151` (`--control-text`), fondo transparente | `--tab-text` |
| Pestaña activa | fondo `#374151` (`--control-active`), texto `#ffffff`, peso `600` | `--tab-active`, `--tab-active-text` |
| Hover inactiva | fondo `#e2e5ea` (`--control-hover`) | `--tab-hover` |
| Foco visible | `outline: 2px solid #374151; outline-offset: 2px` | — |
| ≤720 px | contenedor y nav a `width: 100%`, pestañas `padding: 0 9px`, `gap: 5px`, fuente `12.5px` | — |

El componente original dibuja el fondo oscuro de la pestaña activa con una cápsula animada detrás del
texto; aquí la pestaña activa pinta ese mismo fondo en el propio botón, con el mismo radio, alto y
relleno, de modo que el resultado visual es idéntico sin añadir el elemento animado.

## Gráficas ampliadas (mismo cambio)

**Trayectorias conectadas**

- Ocupa todo el ancho del bloque (.grafo a 100 %); la ficha «Selección vinculada» pasa a una franja
  compacta debajo del gráfico, con los campos en rejilla y apilados en pantallas angostas.
- Altura: **560 px** en escritorio y **380 px** en pantallas de menos de 640 px.
- El iewBox, los márgenes (izq/der/arriba/abajo) y las escalas se **recalculan** desde el ancho
  real del contenedor en cada dibujo y en cada cambio de tamaño (
esize con retardo de 140 ms); el
  SVG no se estira con CSS.
- Puntos de radio 3,1 y opacidad 0,38; el hogar seleccionado se dibuja con halo de 10 px, centro
  sólido, trayectoria de trazo 3 y etiquetas J/A/S acotadas al área para no recortarse.
- Los controles de ejes, escala log1p y «Ampliar gráfica» quedan encima de la gráfica; el filtro de
  canastas, inmediatamente debajo.
- Las coordenadas son las reales: no se añade jitter ni se modifican los datos.

**Corrientes de comportamiento**

- Ocupa todo el ancho útil del panel; altura: **600 px** en escritorio y **420 px** en pantallas
  angostas, con julio, agosto y septiembre distribuidos entre los márgenes del área de dibujo.
- Trayectorias de fondo atenuadas a opacidad 0,1; la del hogar seleccionado, con trazo 3,4 y sus
  valores rotulados (canastas y perfil) en cada corte.
- En pantallas angostas el área de dibujo conserva un ancho mínimo y se desplaza en horizontal dentro
  de su contenedor, sin desbordar la página.
- Los filtros («Trayectorias», «Volver al hogar seleccionado») siguen inmediatamente encima.
- Mismos datos, misma escala log1p y mismos conteos: ampliar el espacio no altera las trayectorias.

**Vista ampliada** (<dialog>)

Ambas gráficas ofrecen «Ampliar gráfica». La ventana se abre con el mismo dibujo recalculado a un
tamaño mayor (≈90 % del ancho y 60–64 % del alto de la ventana), se cierra con el botón «Cerrar» o con
**Escape**, y conserva filtros y selección: al cerrar, las gráficas del tablero se repintan con el
mismo estado.

## Leyenda retirada

La vista «Evidencia» ya no incluye el párrafo «Inspiración visual: Remixing Rosling, Voting shifts y
Tech startup evolution. Implementación propia sobre los datos del experimento». Se retiró el párrafo
completo, con sus enlaces a la galería de referencia; el resto de la sección (modelo, validación y
alcance) queda igual.

## Lo que no cambia

Vistas, cálculos, filtros, selección vinculada, descarga CSV, textos y el resto del diseño aprobado.
El estado de navegación por pestañas ya era independiente de los filtros y sigue siéndolo: recorrer
las cuatro vistas conserva corte, perfil, cohorte, mínimo de canastas y hogar seleccionado
(comprobado en la verificación).

## Hashes de esta revisión

```
template-v2.html  b74053da907c5332fa748747ad83b5333afb7490168a02d475eb7eb4436d2447
index.html        12aa5923326db5f7eb913c9f205fcfc05685bb3627b340c5ae193f10eeb339de
```

El manifiesto original (`MANIFEST.json`, release `approved-blue-v2`) sigue siendo la referencia de la
entrega recibida: no se modificó. `tools/verify_clientes_en_movimiento.py` lista estos dos archivos y
`tools/build_dashboard.py` como diferencias documentadas de la revisión 2, y comprueba que la página
servida se reconstruye byte a byte desde la plantilla y los datos.

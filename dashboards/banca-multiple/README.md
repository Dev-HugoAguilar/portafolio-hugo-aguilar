# Banca múltiple mexicana — Comparativo financiero (módulo de visualización)

Dashboard interactivo del portafolio con **datos públicos reales de la CNBV**,
integrado dentro del sitio estático existente.

---

## 1. Diagnóstico del que se partió

La versión anterior (React + TS + Vite + D3 `scale/array/shape`) tenía cuatro
problemas:

| Problema | Causa concreta |
|---|---|
| Bajo contraste de los textos SVG | `fill` heredados de tokens secundarios (`#7c879b`, `#596273`) en cuerpos de 10–11 px, **más `opacity` aplicada a grupos `<g>` completos**, que atenuaba también las etiquetas junto con las barras; varias etiquetas no declaraban `fill` propio. |
| Paneles gigantes apilados | Tarjetas de 300–420 px de alto con párrafos explicativos dentro de cada panel; una sola columna efectiva en varios anchos. |
| Demasiado texto | Metodología, cobertura y advertencias vivían dentro de las tarjetas en lugar de un panel aparte. |
| Exploración incómoda | Estado de filtros propio (`useState` + `useRef`), sin historial, sin ventana temporal, sin brush en la dispersión y con el ranking reiniciándose al cambiar de selección. |

Estado y consultas de la versión anterior: un `useState` con periodo, concepto e
instituciones; cuatro consultas (`resumen`, `series`, `indicadores`, `detalle`)
con guardas de secuencia hechas a mano; eventos `onClick`/`onMouseEnter` en cada
`<g>`; el resumen se pedía sin filtro de instituciones.

## 2. Stack realmente integrado

| Tecnología | Dónde se usa |
|---|---|
| React 19 + TypeScript 7 + Vite 8 | Todo el módulo; `tsc --noEmit` en el build |
| D3.js (`d3-scale`, `d3-array`, `d3-shape`, `d3-selection`, `d3-brush`) | Escalas y dominios, agregaciones, trazos y brush de serie y dispersión |
| **Zustand** | `src/store.ts`: periodo, concepto, instituciones, resaltado temporal, ventana temporal e historial |
| **TanStack Query** | `src/queries.ts`: catálogo, resumen, series, indicadores y detalle con claves completas, `keepPreviousData` y `AbortSignal` |
| **TanStack Table** | `src/ui/DetailTable.tsx`: ordenación y paginación con `useLegacyTable` (API v8 de la v9) |
| **Radix UI** | Popover (periodo, concepto, instituciones), Dialog (fuentes y metodología) y Checkbox (instituciones) |
| **Playwright** | `tests/e2e/dashboard.spec.ts`: 11 escenarios × 2 dispositivos |
| CSS propio | `src/styles.css`, prefijo `bm-` y alcance en `.bm-app` |

No quedan dependencias instaladas sin uso: se retiraron `d3-zoom`, `d3-format`
y los paquetes de Radix que no llegaron a integrarse.

## 3. Composición

```
barra de aplicación (identidad + migas + fuentes/ampliar)
título con insignia de cobertura · filtros · etiquetas · 4 indicadores
[ ranking 5 | evolución 7 ]     ≈ 40 % / 60 %
[ dispersión 5 | tabla 7 ]      ≈ 43 % / 57 %
pie: cobertura histórica + «Fuentes y metodología»
```

* **Barra de aplicación**: monograma, migas `Portafolio / Visualización`,
  «Fuentes» y el botón de vista ampliada. No repite la navegación del portafolio.
* **Título**: nombre del caso, subtítulo, insignia de cobertura histórica, concepto
  activo y recuento de boletines.
* **Filtros**: una fila con la misma altura para periodo, concepto e
  instituciones (comportamiento de selector, desplegables blancos opacos),
  *Deshacer* como botón de icono y *Restablecer* como acción principal. Debajo,
  las etiquetas de los bancos seleccionados con su color y el recuento. El
  desglose de cartera solo aparece cuando el concepto lo admite.
* **Lenguaje único de controles**: los filtros de periodo, concepto e
  instituciones fijan el patrón —fondo lavanda (`--bm-ctrl-bg` `#EEF1FF`), borde
  azul (`--bm-ctrl-border` `#B8C5FF`) e iconos azules— y los controles internos
  de las gráficas lo repiten en tamaño compacto: *Top 10 / Top 20 / Todas*,
  *Crecimiento / Importe*, *Seleccionar / Desplazar*, *Comparar fechas*, los de
  zoom (*+ / − / Ver todos*) y las pastillas de cartera. En un grupo segmentado la
  lavanda la lleva el contenedor y la opción activa se vuelve blanca con borde y
  texto azules (el mismo par que un filtro desplegado, `--bm-ctrl-on-*`), así la
  selección se marca en azul sin competir con los datos. Estados homogéneos:
  reposo lavanda, hover `#E2E8FF` con borde azul, selección blanca/azul, foco de
  teclado con contorno azul de 2 px y desactivado sobre `--bm-soft`. Las
  transiciones son de 150 ms y solo de color y borde (`--bm-ctrl-t`): los filtros
  responden rápido y el movimiento narrativo queda para las visualizaciones y las
  tarjetas.
* **Indicadores**: cuatro tarjetas con icono lineal sobre superficie tenue —
  activo del sistema (con variación y su base), selección, participación y
  concentración Top 5 (contexto global que **no** cambia con la selección). Las
  cifras se abrevian a billones y la cifra original en millones queda en el
  tooltip de la tarjeta.
* **Ranking**: barras horizontales con **eje porcentual** y porcentaje al final de
  cada barra; el importe completo y la participación están en el tooltip. Si el
  concepto no admite participación (flujos), el eje y las etiquetas pasan a
  importes y el título cambia a «Importe por institución». Top 10 sin scroll,
  posiciones del boletín numeradas y los seleccionados fuera del top se añaden.
* **Evolución**: compara **las instituciones seleccionadas** (o «Sistema» cuando
  no hay selección), con bandas solo en los meses sin boletín, tramos únicamente
  entre meses consecutivos, tooltip compartido, leyenda con marca y punto, brush
  temporal y modos *Valor* / *Base 100*.
* **Dispersión**: ROA/ROE publicados, encuadre central por omisión con el número
  de puntos fuera del encuadre indicado, «Vista general» para recuperar los
  extremos, zoom, brush rectangular que selecciona bancos y leyenda.
* **Tabla** (TanStack Table): institución con marca de selección y color,
  importe en billones, participación, ROA y ROE; ordenación y paginación; fila
  desplegable con procedencia y panel lateral con el detalle del banco.

## 4. Reglas de datos que se conservan

* Millones de pesos tal como los publica la CNBV (en ejes y etiquetas se leen en
  billones cuando la magnitud lo pide; el tooltip da la cifra completa).
* «Sistema» es el agregado publicado: referencia y denominador, nunca suma.
* Los saldos se comparan con el periodo importado anterior; los flujos
  acumulados, solo con el mismo corte del año anterior.
* ROA y ROE se muestran institución por institución: no se suman ni se promedian.
* Los meses sin boletín se marcan; no se interpolan ni se rellenan.
* Solo datos reales de la API: si falla, se informa el error; no hay respaldo
  sintético.

## 5. Ejecución

```bash
# 1) API real
cd backend && python -m uvicorn app.main:app --port 8010

# 2) módulo
cd dashboards/banca-multiple
npm install
npm run build          # tsc --noEmit + vite build + minificación

# 3) sitio estático
cd ../../dist && python -m http.server 8000

# 4) abrir
#    http://localhost:8000/#/area/dashboards/comparativo-bancario
```

La base de la API se resuelve en este orden: `opts.apiBase` →
`window.PORTFOLIO_BANCA_API` → `http://127.0.0.1:8010/api/v1/cnbv/banca-multiple`.

## 6. Verificación con Playwright

```bash
cd dashboards/banca-multiple
npx playwright test            # 66 pruebas (33 escritorio + 33 móvil; una se omite en escritorio)
node tools/capturas-entrega.mjs # capturas de entrega del rediseño
node verificar-sitio.mjs       # 9 comprobaciones del sitio completo (no debe romperse nada)
```

Usa el Chrome instalado (`channel: 'chrome'`), sin descargar navegadores. Cada
prueba compara la interfaz con **respuestas reales de la API**. Capturas en
`evidencias/` (`app-escritorio.png`, `app-movil.png`, `final-*.png`, una por panel,
las del acabado visual `A-…png`, `B-…png`, `C-…png`, `D-…png`, `E-…png` y las de
navegación `sitio-…png`).

Cuatro archivos de prueba:

| Archivo | Qué comprueba |
|---|---|
| `tests/e2e/dashboard.spec.ts` | los 11 escenarios de aceptación del dashboard contra la API real (selección, coherencia entre vistas, filtros, deshacer, errores, teclado, móvil, modo ampliado) |
| `tests/e2e/visual.spec.ts` | la prueba visual A–E de la dirección aprobada (paleta, selección y deselección estables, cambio de periodo, filtro opaco) más tooltips, unidad monetaria con conversión comprobada, tono de indicadores, teclado, móvil y vista ampliada sin recortes |
| `tests/e2e/interaccion.spec.ts` | una respuesta antigua no sustituye a la selección vigente, el hover no dispara consultas, brush temporal funcional y transiciones de 200 ms (con movimiento reducido) |
| `tests/e2e/portafolio.spec.ts` | navegación del portafolio anfitrión: Inicio (hero y red animada), Portafolio, área, proyecto, Sobre mí, ruta desconocida, recarga, Atrás/Adelante y títulos nunca ocultos por la cabecera fija |

## 7. Acabado visual: causa encontrada y corrección

**Causa real del «desplegable opaco».** Los estilos computados del contenido
portalado mostraban `background-color: rgba(0, 0, 0, 0)` y
`border-color: rgb(17, 19, 24)` (el `currentColor` del texto). No era un problema
de `z-index` (el panel ya iba por encima de la cabecera del sitio) ni de
`backdrop-filter` (no había) ni de `opacity` (ya era 1): la paleta `--bm-*` estaba
declarada **solo dentro de `.bm-app`**, y Radix monta el popover y el diálogo en
`document.body` mediante Portal, donde esa variable no existe. Un `var()`
sin resolver en `background` deja el fondo transparente.

**Corrección.** La paleta pasa a una utilidad única (`src/colors.ts`) y se declara
en `:root` y en los contenedores alcanzables desde el portal (`src/theme.ts`,
inyectado en el arranque). `.bm-pop` y `.bm-dialog` fijan además sus valores con
literal de respaldo (`#FFFFFF`, `#DDE2EB`, `#111318`), tope de alto con el hueco
real que calcula Radix (`--radix-popover-content-available-height`) y scroll
interno; el resaltado usa `#EEF1FF` con texto `#111318` y el indicador de
selección `#3458F5`.

**Dirección de color restablecida.** Después de la iteración intermedia se volvió
a la regla aprobada, que es la que rige hoy:

* **Estado inicial**: barras del ranking y **todos** los puntos del mapa de
  rentabilidad en el mismo azul sólido `#3458F5`, con borde blanco fino para
  separar puntos próximos. Sin un color distinto por institución y sin paleta
  propia del mapa: también la miniatura de contexto y la leyenda van en azul.
* **Mapa de rentabilidad con selección**: cada banco seleccionado toma el color
  que ya tiene asignado en el estado compartido —idéntico al ranking, la
  evolución, la tabla y las etiquetas— con contorno de selección y opacidad 1, y
  las instituciones no seleccionadas quedan en gris `#C2CBDC`. Al quitar toda la
  selección todos los puntos vuelven al azul. El hover solo resalta (tamaño y
  etiqueta): no selecciona ni cambia el color asignado.
* **«Sistema» (agregado publicado por la CNBV)**: naranja quemado `#C05621` con
  trazo discontinuo, en *Crecimiento* y en *Importe*. Es el color exclusivo de la
  referencia del sector —línea, puntos, etiqueta final, leyenda y muestra del
  tooltip— y no entra en el reparto de colores de los bancos; tampoco expresa
  alerta, pérdida ni valoración del desempeño.
* **Al comparar**: azul, violeta y turquesa se asignan por orden de selección y se
  conservan mientras dure la comparación (quitar un banco no recolorea a los
  demás). El mismo par color/estilo se usa en ranking, serie, dispersión, leyenda
  y tabla.
* Los bancos fuera de la comparación pasan a **contexto neutro legible**
  (`#C2CBDC`), nunca a transparencias que apaguen las etiquetas.
* La selección se distingue además por **contorno grafito, marcador y etiqueta**,
  no solo por color. De la cuarta comparación en adelante se usa trazo
  discontinuo, y solo para los bancos comparados: no se agregan patrones a todo el
  universo.
* Se eliminaron los rayados diagonales de las barras, los anillos discontinuos
  decorativos de los puntos y cualquier variación arbitraria de saturación: la
  escala cromática es la de la paleta, sin tonos inventados.

**Archivos modificados:** `src/colors.ts`, `src/theme.ts`, `src/store.ts`,
`src/domain.ts`, `src/mount.tsx`, `src/main.tsx`, `src/DashboardApp.tsx`,
`src/charts/{Ranking,Evolution,Scatter}.tsx`,
`src/ui/{Header,Kpis,FilterBar,DetailTable,BankPanel}.tsx`, `src/styles.css`,
`tests/e2e/{visual,interaccion,portafolio}.spec.ts`.

**Unidad del gráfico temporal.** Se eligió una sola unidad por gráfico
(`src/domain.ts`): si el máximo llega a un billón de pesos el eje, el subtítulo
del panel y la nota usan **billones**, con la nota «Valores en billones de MXN;
detalle original en millones»; el tooltip muestra el valor en billones y, en la
misma tarjeta, la cifra original en millones. La conversión es exacta
(1 billón = 10¹² MXN = 1 000 000 de millones) y la prueba la comprueba número a
número con los datos publicados. La tarjeta de indicadores mantiene la cifra
principal en grafito y el turquesa se reserva para variaciones positivas
interpretables (`variacionTono` excluye cartera vencida, estimaciones
preventivas, provisiones, gastos, costos y castigos).

## 8. Reproducción de la referencia visual

La aplicación se rediseñó sobre la referencia aprobada (composición, jerarquía
tipográfica, controles, tarjetas, iconos y tratamiento de los gráficos). Lo que
**sí** se reprodujo:

| Pieza de la referencia | Implementación |
|---|---|
| Barra compacta con identidad, migas y acciones | `src/ui/Header.tsx` (`AppBar`) + `src/ui/icons.tsx` |
| Título, subtítulo e insignia de cobertura | `src/ui/Header.tsx` (`TitleBlock`) |
| Fila de filtros con alturas uniformes, deshacer de icono y acción principal | `src/ui/FilterBar.tsx` |
| Cuatro tarjetas con icono sobre superficie tenue y cifra en billones | `src/ui/Kpis.tsx`, `valorKpi()` en `src/domain.ts` |
| Ranking con eje porcentual, posición y porcentaje al final | `src/charts/Ranking.tsx` |
| Evolución de las instituciones comparadas, leyenda y brush | `src/charts/Evolution.tsx` |
| Dispersión con control «Vista central», brush discontinuo y leyenda | `src/charts/Scatter.tsx` |
| Tabla con marca de selección, fondo tenue y columnas esenciales | `src/ui/DetailTable.tsx` |
| Paleta exacta, tintes suaves, bordes finos y radios de 12 px | `src/styles.css`, `src/colors.ts` |

Diferencias que se mantienen a propósito (y por qué):

1. **Cifras reales, no las ilustrativas de la referencia.** Activo total del
   sistema `14.80` billones MXN, BBVA `3.28`, Santander `1.96` (oct 2024).
2. **La dispersión abre en el encuadre central** (80 % central) e indica cuántos
   puntos quedan fuera (`15 de 50 fuera del encuadre (extremos reales)`), con
   «Vista general» para recuperarlos. La referencia no tiene extremos porque es
   una maqueta; aquí se conservan y se señalan.
3. **Notas de integridad en los gráficos**: bandas de meses sin boletín y nota de
   unidad. La referencia no las necesita porque no usa datos reales.
4. **Controles añadidos por función, no por estética**: Top 10/20/todas, modos
   *Valor*/*Base 100*, paginación de la tabla y panel lateral del banco.
5. **Ancho**: la aplicación vive dentro del contenedor del portafolio (≈1090 px);
   la referencia es un panel a sangre de 1586 px. Las proporciones (40/60 y 43/57)
   sí se respetan.
6. **La evolución no incluye «Sistema» cuando hay comparación**: el eje se ajusta
   a los bancos comparados (como en la referencia) y el agregado sigue disponible
   en los indicadores, la tabla y el tooltip.

## 9. Auditoría del stack (uso real, no dependencias instaladas)

| Tecnología | Archivo donde se usa | Función implementada | Pendiente |
|---|---|---|---|
| React 19 + TypeScript + Vite | `src/mount.tsx`, `src/DashboardApp.tsx`, `vite.config.ts` | montaje/desmontaje del módulo dentro del portafolio, componentes tipados y build ESM (`app.js` + `app.css`) | — |
| D3.js + SVG | `src/charts/Ranking.tsx`, `Evolution.tsx`, `Scatter.tsx` | escalas (`d3-scale`), dominios y extremos (`d3-array`), líneas (`d3-shape`), brush temporal y rectangular (`d3-brush`, `d3-selection`) | — |
| Zustand | `src/store.ts` | estado único: periodo, concepto, selección, ranuras de color, ventana, resaltado e historial de deshacer, con persistencia en `sessionStorage` | — |
| TanStack Query | `src/queries.ts` | catálogo, resumen, series, indicadores y detalle; claves que incluyen todos los filtros, `keepPreviousData` y `AbortSignal` para descartar respuestas obsoletas | — |
| TanStack Table | `src/ui/DetailTable.tsx` | ordenación y paginación del conjunto filtrado, fila expandible de procedencia | — |
| Phosphor Icons (@phosphor-icons/react) | `src/ui/icons.tsx` | iconografía única del módulo: calendario (periodo), documento (concepto y fuentes), edificio (instituciones), flechas (deshacer, restablecer, ampliar) y símbolos de los indicadores; peso *regular*, 18–20 px en controles y máx. 22 px en indicadores | ampliar el catálogo si se añaden acciones |
| Radix UI | `src/ui/FilterBar.tsx` (Popover), `src/ui/Sources.tsx` (Dialog), `src/ui/FilterBar.tsx` (Checkbox) | selectores de periodo/concepto/instituciones, casillas y panel de fuentes; el contenido portalado recibe el tema desde `src/theme.ts` | valorar `Select`/`DropdownMenu` si crece el número de filtros |
| CSS/SVG con transiciones | `src/styles.css`, atributos `fill`/`stroke` de los SVG | transiciones de 200 ms en barras, puntos, líneas, muestras y marcadores; anuladas con `prefers-reduced-motion` | — |
| Playwright | `tests/e2e/*.spec.ts`, `playwright.config.ts`, `verificar-sitio.mjs` | 66 pruebas de interacción contra la API real y 9 comprobaciones del sitio | Safari, Firefox y dispositivos físicos |
| FastAPI + Pydantic | `backend/app/main.py`, `backend/app/api/v1/routes/cnbv.py`, `backend/app/models/{cnbv,filters,responses}.py` | endpoints `/catalogo`, `/resumen`, `/series`, `/indicadores`, `/detalle` y validación de parámetros con modelos Pydantic | — |
| PyMongo + MongoDB | `backend/app/db/mongo.py`, `backend/app/repositories/cnbv_repository.py`, `backend/app/db/indexes.py` | cliente Mongo con índices y agregaciones del boletín (hechos, revisiones, catálogo) | — |
| Docker Compose | `docker-compose.yml`, `backend/Dockerfile`, `deploy/mongo-init.js` | `mongo` + `backend` + perfil opcional `frontend` (nginx sobre `dist/`), con healthchecks y red interna | validar el arranque completo en un equipo limpio |

Pendiente: Safari, Firefox, lectores de pantalla reales y dispositivos físicos.

## 10. Últimas mejoras (una pasada)

* **Evolución temporal** → «Crecimiento frente al sector»: modo *Crecimiento*
  (base 100 en una fecha común, predeterminado en saldos positivos) y modo
  *Importe*. El Sistema va en naranja quemado `#C05621` discontinuo, la base se
  declara en el
  subtítulo y la nota, el tooltip da valor original, índice y variación desde la
  base, y el panel ofrece comparación entre dos fechas reales (inicial, final,
  cambio absoluto y %). En flujos acumulados la base solo puede ser el mismo
  corte del año anterior. La cobertura faltante se marca con muescas discretas,
  el brush se oculta con menos de 6 observaciones y el dominio vertical se ajusta
  al contenido.
* **Mapa de rentabilidad**: gráfico principal amplio con miniatura de contexto
  (mover/redimensionar el encuadre), controles *Seleccionar* / *Desplazar* / + /
  − / *Ver todos*, vista inicial P10–P90 por eje y aviso «Vista ampliada: N de M
  instituciones visibles». Los puntos coincidentes se eligen desde el tooltip.
* **Filtros identificables**: fondo #EEF1FF, borde #B8C5FF, etiqueta y valor
  visibles, iconos y flechas en #3458F5, hover #E2E8FF con borde azul y
  estado abierto en blanco con la flecha hacia arriba.
* **Migas sticky** en las vistas de área y proyecto, pegadas bajo la cabecera
  (	op: calc(var(--header-h) + 1px)), sin el espacio vertical que aportaba
  .section, con ria-current="page" en el proyecto.
* **Iconografía** unificada en Phosphor Icons (imports individuales, peso
  regular), sin cuadrados pastel alrededor de los iconos.
## 11. Hallazgos del análisis

La ficha del proyecto sustituye «Resultados medidos» por **Hallazgos del
análisis**; las cifras de conciliación y de pruebas se movieron a
**Metodología y calidad de datos** (campo técnico de la ficha y sección nueva del
panel «Fuentes y metodología»).

Los hallazgos se calculan en `src/hallazgos.ts` con funciones deterministas y
plantillas de texto sobre `resumen`, `series` e `indicadores` de la API, con los
filtros activos (concepto, periodo, selección y fechas de comparación):

1. **Concentración del sector** — top 5 sobre el total publicado (solo cuando la
   participación es interpretable).
2. **Posición en el universo comparable** — lugar y participación de los bancos
   comparados; con más de dos se resume y el detalle queda plegado.
3. **Crecimiento frente al sector** — variación entre las mismas dos fechas y
   diferencia en puntos porcentuales respecto del Sistema; en flujos acumulados
   solo se comparan cortes del mismo mes.
4. **Rentabilidad publicada** — ROA y ROE por institución, con diferencias en
   puntos porcentuales; nunca se suman, promedian ni se leen como prueba de
   solidez.

Cada tarjeta indica ámbito (sector o selección), alcance con concepto y
fechas, definición en el tooltip y una acción «Ver en gráfico» que enfoca el
panel sin tocar los filtros. Los hallazgos no dependen del cursor ni del zoom, y
mientras la consulta del periodo no corresponde a los filtros activos se marcan
como no vigentes. Las fechas de comparación viven en el estado compartido
(Zustand) para que panel y hallazgos usen exactamente las mismas.
- **Ajustes de marco y controles**: la vista del proyecto ya no muestra migas ni la
  franja «Aplicación» (y por tanto tampoco el botón exterior «Ampliar» ni el marco
  con borde duplicado): el dashboard se monta directamente y su cabecera interna
  (HA · Portafolio / Visualización · Fuentes · ampliar) es la única puerta a la
  vista ampliada, mediante `window.PORTFOLIO_DEMO.alternar()`. Deshacer revierte el
  último cambio (deshabilitado sin historial) y Restablecer recupera los filtros
  iniciales; ambos comparten el acabado de los filtros (`#EEF1FF`, borde
  `#B8C5FF`, texto `#3458F5`, radio 10 px, 42 px de alto).
### Ubicación de los hallazgos

Los hallazgos se muestran **en el bloque superior de la ficha del proyecto**,
antes del dashboard: el módulo los monta con `createPortal` en el contenedor
`#hallazgos-host` que reserva `renderProjectView`, con el mismo estado y los
mismos datos (una sola sección, un solo store). Sin selección se muestra el
hallazgo del sector y una única invitación; con selección, las ausencias se
explican solo si faltan datos comparables. La distribución se adapta al número de
hallazgos (una franja horizontal si hay uno; cuadrícula equilibrada si hay más) y
las fórmulas viven en «Fuente y definiciones» dentro de «Fuentes y metodología».
### Ficha descriptiva

El apartado «Limitaciones» se retiró de la ficha del comparativo (la cobertura y
las definiciones siguen en «Fuentes y metodología» del dashboard). «Hallazgos del
análisis» ocupa ahora una celda normal de la cuadrícula descriptiva, en la columna
derecha bajo «Fuentes y datos», con el mismo encabezado y el mismo
cuerpo de texto que los demás apartados: sin tarjeta, borde, sombra, fondo propio
ni iconos. Los hallazgos se muestran como párrafos breves (cifra, conclusión y
contexto con concepto y fechas) y se actualizan con los filtros; en móvil
conservan el orden natural de lectura.

Los títulos de los seis apartados (Problema, Destinatario, Mi contribución,
Fuentes y datos, Método y decisiones técnicas, Hallazgos del análisis) comparten
una sola jerarquía: sans del sitio, 20 px en escritorio y 18 px en móvil, peso 600,
color `#111318`, caja normal (sin mayúsculas ni *letter-spacing*), interlineado 1.3
y una regla azul `#3458F5` de 24 × 2 px con 10 px de aire sobre el texto. Cada
apartado es un bloque único —título y contenido separados por 14 px—, con 36 px
entre apartados en la cuadrícula de dos columnas y 32 px en la columna única del
móvil. Los huecos que aparecían bajo «Destinatario» y «Hallazgos del análisis»
venían de que la celda repartía su alto en dos filas elásticas y el `<dt>` crecía
hasta 52 px y 106 px; al pasar cada apartado a un bloque de altura propia, la
separación título → texto es siempre la misma.

«Tecnologías» ya no usa etiquetas redondeadas: es una lista agrupada por función
(interfaz y visualización, estado y consultas, tablas y controles, API y
almacenamiento, pruebas de interacción), con la función a la izquierda —14 px,
peso 600, `#596273`— y las tecnologías a la derecha —16 px, `#111318`— separadas
por ` · `. Las filas se separan 14 px de texto a texto con un filete de 1 px
`#DDE2EB` entre ellas (sin filete en la primera ni en la última), el fondo es el
de la página y no hay píldoras, tarjetas, sombras, iconos ni logotipos: los
nombres son texto plano. En móvil la función pasa encima de sus tecnologías. Los
grupos se declaran en `tecnologiasGrupos` dentro de `dist/content.js`; las fichas
que no los declaran conservan sus etiquetas de siempre.

El encabezado de la ficha comparte ahora la tipografía de los apartados (clase
propia `view-head--proyecto`, que no toca el encabezado de las áreas ni del
error): etiqueta «Proyecto / Área 01» en sans de 14 px, peso 500 y `#596273`, sin
monoespaciado ni mayúsculas; el acento azul `#3458F5` de 24 × 2 px sobre el
título; título en `h1` de 40 px (28 px en móvil), peso 600, `#111318`,
interlineado 1.15 y espaciado normal; y subtítulo de 22 px, peso 400 y `#596273`.
El dato del proyecto se guarda como «Título — Subtítulo» y la ficha lo separa sin
alterar el contenido: el título de la pestaña y las tarjetas del portafolio siguen
mostrando el nombre completo. Las separaciones son 16 px entre etiqueta y título,
8 px entre título y subtítulo y 20 px antes de la descripción, sin alturas fijas
ni saltos forzados.

El hueco entre la ficha descriptiva y el aplicativo se mide desde el final de
«Tecnologías» hasta el inicio de la cabecera interna del dashboard: **64 px** en
escritorio y **40 px** en móvil, declarados una sola vez en el contenedor exterior
`.demo-body` (54 px + 10 px de padding del aplicativo; 32 px + 8 px en móvil) para
no sumar márgenes ni tocar el espaciado interno del dashboard. Con la aplicación
ampliada ese margen se anula (`body.demo-ampliado .demo-body`), de modo que el
hueco desaparece mientras el diálogo está abierto.
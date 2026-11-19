# Prompt para Harness — Kilómetro Cero

Integra en el portafolio local el proyecto **Kilómetro Cero — centro de control de una red de envíos carreteros**. La pregunta del producto es: **¿qué cientos de envíos y corredores están expuestos cuando una parte de la red se interrumpe, y cómo se distribuye el impacto por estado del servicio?**

## Antes de editar

1. Inspecciona `AGENTS.md`, la arquitectura y los patrones reales del portafolio. Reutiliza el mecanismo existente de ficha, navegación, iframe/altura, estilos, tipografía, paleta y tabs. No inventes una segunda navegación.
2. Revisa cómo se integraron los otros proyectos IA/agentes. No cambies su estructura, assets ni textos.
3. Integra la demo en la categoría logística/agentes de decisión definida por el sitio. No cambies el nombre de otras áreas.

## Escala y experiencia

- El mapa debe representar **una red con muchos envíos distribuidos en varios corredores**, no una sola ruta origen–destino. La vista inicial debe presentar México, los 12 corredores del fixture, centenares de envíos agregados y 18 camiones virtuales de muestra visibles. El conteo de camiones debe decir que son una muestra; no equivale a la flota real ni a todos los envíos.
- En la vista general, consolida una vez cada tramo entre hubs compartidos por varios corredores. El grosor debe representar la suma de volúmenes que pasan por ese tramo y el color su composición de puntualidad/demora/riesgo. Mantén anchos finos y constantes en pantalla incluso al hacer zoom. Los totales por tramo se solapan entre rutas: no se deben sumar entre tramos ni llamar envíos únicos. Mantén la geografía base persistente y separada de la capa de tramos, hubs y flota.
- Al seleccionar un tramo, resalta un corredor asociado con su origen/destino con un trazo apenas más ancho que la red base; dibuja una flecha pequeña únicamente sobre esa selección. No superpongas una línea gruesa por cada corredor en la vista general.
- Permite seleccionar un corredor y abrir su ficha con origen, destino, envíos, puntualidad, demora, riesgo y distancia/unidad/corte.
- Filtros mínimos: estado del envío y escenario de red. Añade fecha, transportista o tipo de vehículo solo si hay datos con denominador y semántica definidos; no los simules como si fueran datos de operación real.
- Al activar una incidencia, los corredores afectados deben destacar y las gráficas, KPIs y tablas deben recalcularse con la misma regla. La demo debe dejar claro qué cambios son resultado de una simulación.
- La red ocupa el protagonismo. Mantén el mapa con buen contraste y jerarquía entre geografía, aristas, hubs, terminales y flota. En escritorio deja controles compactos a un lado; en móvil apila sin scroll horizontal global.

## Visualizaciones e inspiración

Utiliza DataViz Inspiration como referencia de familias y lecturas, no para copiar código o diseños: [mapas](https://www.dataviz-inspiration.com/map), [redes](https://www.dataviz-inspiration.com/network), [Sankey](https://www.dataviz-inspiration.com/sankey) y [edge bundling](https://www.dataviz-inspiration.com/edgeBundling).

1. **Mapa de red agregada**: segmentos únicos compartidos por los corredores, volumen por grosor y composición de estados por color, sin flechas repetidas. Al seleccionar una arista, revela el corredor y su dirección. Zoom con rueda anclado al cursor, botones, doble clic y arrastre; tooltips y selección por teclado.
2. **Vista tipo Sankey/alluvial**: para varios corredores, seguir cada volumen a su estado (en ventana, con demora, en riesgo). Los segmentos deben reconciliar exactamente con la cantidad de envíos del corredor y responder a filtros/incidentes.
3. **Dispersión volumen × puntualidad**: cada punto representa un corredor, tamaño comunica envíos y color la puntualidad o el riesgo. Etiqueta ejes/unidades, añade referencia explícita y tooltips; no uses doble eje.
4. **Ranking/tabla accesible** con los mismos totales; seleccionar fila sincroniza mapa, tooltip y detalle.

## Datos y mapa

- Si el entorno contiene la Red Nacional de Caminos de INEGI, utilízala para obtener la geometría vial real y conserva versión, fecha, atributos y licencia. Si no está disponible, muestra solo la geografía de referencia, etiquetas regionales discretas y marca las rutas como esquemáticas. No dibujes líneas ilustrativas como si fueran carreteras verificadas.
- La API de ruteo INEGI debe ejecutarse en backend local si exige token; nunca expongas claves en el navegador. Respeta tipos de vehículo, ejes y restricciones que la API acepte. Sus tiempos en condiciones óptimas no son tráfico en vivo.
- La fuente SICT de datos viales puede aportar contexto de tránsito y composición si el paquete local trae un recurso identificable. No transfieras el volumen de tránsito anual a envíos/vehículos de la empresa ni mezcles denominadores.
- En los fixtures, documenta si una unidad significa envío agregado, viaje, camión único, paso vehicular o toneladas. El paquete actual utiliza **envíos ficticios agregados por corredor** y marcadores de camiones sintéticos. No llames a estos valores datos reales, datos públicos ni telemetría.
- Separa datos oficiales, datos sintéticos y derivaciones en archivos/campos/metadatos distintos; muestra periodo, cobertura, fuente, unidad y supuestos. No inventes observaciones faltantes.

## Copiloto y decisión

- Presenta una lectura automática sobre los corredores de mayor volumen, impactos y compromisos entre puntualidad/riesgo, citando los valores visibles.
- Si no hay proveedor LLM en el entorno, nómbralo explícitamente **copiloto simulado por reglas**. Si el proyecto se conecta al proveedor ya configurado del portafolio, debe ser opcional, privado, con credenciales solo en backend y con fallback determinista.
- No simules conocimiento de cierres activos, clima, tráfico, seguridad, capacidad de flota o localización GPS si no existe fuente real y con fecha.
- La demo no despacha camiones ni modifica TMS, ERP, archivos, MongoDB Atlas o sistemas externos. Cualquier aprobación cambia solo el estado local del episodio.

## Implementación y protección del sitio

- Ajusta la fuente real del proyecto y no parches `dist` si ese directorio se genera desde otra fuente. Modifica únicamente la ficha y assets de Kilómetro Cero.
- Reutiliza dependencias y componentes existentes. Sin CDN, servicios remotos ni claves en el frontend. Atlas no es requisito.
- Conserva la paleta y el sistema de tabs estándar del portafolio. No introduzcas componentes negros ajenos a la estética existente.
- Añade README de ejecución local, procedencia de geometrías/datos, conteos de reconciliación, límites y pasos para incorporar posteriormente datos oficiales.
- No publiques ni despliegues.

## Validación y entrega

Verifica contra la implementación real que: el mapa muestra México y la red consolidada sin líneas repetidas; al seleccionar tramo se destaca corredor y aparecen sus camiones simulados; mostrar/ocultar flota y pausar/reanudar funcionan; rueda y doble clic acercan hasta 800% centrados en el puntero; filtros e incidente actualizan mapa/KPIs/Sankey/dispersión/tabla; los conteos por tramo se describen como solapados; selección de corredor sincroniza vistas; el diseño funciona a 390 px; el iframe y navegación conservan el patrón del sitio; teclado y tabla accesible funcionan. No declares comprobaciones que no hayas ejecutado.

Entrega un informe con archivos modificados, fuente exacta de la geometría y datos, conteos reconciliados, qué es sintético, qué hace el copiloto, instrucciones locales y límites pendientes. No despliegues.


### Actualización solicitada: legibilidad y lectura operativa

- Mantener el contexto geográfico (México, sur de EE. UU. y Centroamérica) en una capa persistente separada de las rutas y los vehículos. Ajustar la proyección a la extensión de la región para que el mapa no quede recortado.
- En la vista general dibujar tramos únicos consolidados: sumar el volumen de los corredores que comparten cada par de hubs y codificar grosor por volumen/color por composición de estado. Añadir una línea base clara bajo las aristas para conservar contraste. No sumar después los conteos de segmentos como si fueran envíos únicos.
- Mostrar inicialmente 18 camiones virtuales representativos distribuidos sobre varios trayectos. El control permite ocultar/mostrar y pausar/reanudar; el contador indica unidades visibles. Azul = en ventana, naranja = demora, violeta = riesgo. Los vehículos y su velocidad son simulados, nunca GPS. Si el filtro deja cero unidades, el control debe indicarlo y no ofrecer «Ocultar flota».
- El camión debe usar un pictograma relleno pequeño y claramente distinto del hub circular. Mantén su tamaño visual constante al hacer zoom; las demoras pueden llevar un pulso naranja discreto y pequeño.
- Incorporar controles separados para mostrar/ocultar flota y pausar/reanudar. Mostrar el número de marcadores visibles al filtrar; aclarar que son vehículos sintéticos representativos, no telemetría.
- Los filtros de estado deben filtrar tramos, flota y corredores. Los cambios de incidente recalculan el estado de la red y de las unidades virtuales. No dibujar una línea completa por corredor en la vista general ni flechas repetidas; solo el corredor elegido recibe un trazo destacado y una punta direccional. Mantener hubs y terminales compactos y fijar su tamaño en pantalla durante el zoom. Diferenciar visualmente terminales y hubs, conservar las etiquetas legibles y evitar colisiones. La leyenda debe explicar grosor = volumen agregado, color = estado dominante, y advertir que los tramos se solapan entre corredores.
- Bajar el contraste de la retícula y los bordes geográficos; destacar México suavemente y añadir contexto regional sin cubrir los corredores. Mantener visibles controles +/−/restablecer, la leyenda y el aviso de que son rutas esquemáticas. No inventar geometría vial ni estados si no hay un archivo fuente disponible.
- La rueda debe acercar/alejar hasta al menos 800%, tomando como ancla la posición del cursor; el doble clic acerca y los botones +/− deben seguir funcionando. Al alcanzar los límites, permitir que la rueda vuelva a desplazar la página. Mostrar esta instrucción cerca del mapa.
- Aclarar junto al mapa que las trayectorias son simuladas, no son GPS, carreteras ruteadas ni datos empresariales. Conservar la paleta del portafolio y los controles de zoom/arrastre.

### Refinamiento cartográfico
Usar la geometría Natural Earth 1:50m incluida, no la antigua silueta simplificada. Encuadrar México con extensión explícita, sin ajustar al territorio completo de Estados Unidos. Etiquetas regionales con escala inversa al zoom y ocultas en detalle. Desactivar selección de texto en el mapa durante arrastre. Camiones seleccionables con ficha de unidad virtual, avance y demora sintéticos. Mantener reloj de simulación continuo al pausar/reanudar. Este paquete usa D3; la migración MapLibre y geometrías carreteras verificadas requieren implementación posterior y no deben anunciarse como realizadas.

### Implementación final MapLibre (sustituye indicaciones SVG anteriores)
El mapa ahora usa MapLibre GL JS local 5.6.1 y data/roads.geojson con tramos viales OSM ruteados mediante OSRM. Conservar ambas dependencias vendor y licencia. No restaurar las rutas esquemáticas D3: D3 queda para gráficas. No consultar OSRM desde navegador; usar snapshots incluidos. Geometría vial real con perfil automóvil: no afirmar validación de carga pesada. Base GeoJSON local y sin tiles ni API key, WebGL obligatorio. Verificar zoom/pan, selección de tramo, ficha de unidad virtual, filtros, escenario y controles de flota. Abrir prototipo con WebGL activo.

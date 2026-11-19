# Integrar Clientes en movimiento en el portafolio existente

Actúa como desarrollador senior frontend y full-stack. Implementa la integración, no te limites a un plan. El diseño adjunto ya fue aprobado por Hugo. Usa el paquete como fuente de verdad.

## Objetivo
Incorporar «Clientes en movimiento» en la pestaña Ciencia de datos del portafolio, siguiendo el mecanismo usado por Walmart M5. Debe abrir un tablero funcional con datos reales, filtros vinculados y las cuatro vistas aprobadas: Explorar clientes, Corrientes, Ritmo de compra y Evidencia.

## Antes de editar
1. Lee las instrucciones del repositorio y revisa los cambios locales; conserva trabajo ajeno.
2. Localiza la tarjeta, la ruta, la captura y el mecanismo de navegación del proyecto Walmart M5. Identifica las fuentes editables y el proceso que genera dist. No asumas que las rutas históricas siguen vigentes.
3. Abre `marketing_customer_project/dashboard/index.html`, que es la referencia visual y funcional aprobada. Lee `README_ENTREGA.md` y ejecuta `python tools/verify_delivery.py` desde la raíz del paquete.

## Implementación
- Agrega una tarjeta bajo Ciencia de datos: título «Clientes en movimiento»; descripción «Segmentación de hogares compradores y evolución de sus hábitos con clustering y datos reales de Complete Journey». Usa el patrón real del portafolio.
- Conserva Walmart M5 y los demás proyectos. No llames Atlas al nuevo proyecto ni lo presentes como trabajo realizado para una empresa cliente.
- Integra el HTML autónomo mediante la misma estrategia de ruta/página que el portafolio ya utiliza. Prefiere servirlo como página estática dedicada si encaja. Si hace falta convertirlo a componentes, conserva la conducta, los cálculos y el diseño; no lo sustituyas por una plantilla de dashboard.
- Paleta aprobada de este tablero: azul #4359ff, fondo #f2f4fa, superficies blancas, texto #252d41, secundario #68738b, bordes #dce2f0 y segundo perfil #8894b6. Conserva jerarquía tipográfica, composición y espaciados. No vuelvas a verde/coral ni a crema/terracota.
- Tarjeta: genera una captura real del tablero servido, encuadra el contenido útil y ocupa el ancho y alto del contenedor. No dejes bandas vacías ni estires la imagen. Usa object-fit:cover y object-position apropiado, con recorte comprobado en escritorio y móvil.
- Incluye acceso de regreso al portafolio si la navegación existente lo requiere. Mantén los filtros junto a las gráficas correspondientes; no vuelvas a separar los controles de su visualización.
- Mantén selección de hogar vinculada, búsqueda por ID, corte, perfil, cohorte, mínimo de canastas, ejes configurables, log1p, filtro de cambio de perfil, selección semanal, tablas de respaldo y CSV completo de la selección.
- Revisa teclado, estados vacíos, contraste y tamaños a 390 px. Si hay problemas de usabilidad verificables, corrígelos preservando el diseño aprobado. No declares validación móvil hasta ejecutarla.

## Contrato analítico obligatorio
- Corte julio: 2300 hogares; agosto: 2317; septiembre: 2311. Cohorte común: 2207. En esa cohorte, 364 cambian de perfil entre los tres cortes (regla: más de una etiqueta observada).
- Por defecto: agosto, cohorte común, ambos perfiles, mínimo 0 canastas. La etiqueta se define en el corte de referencia.
- Cada fila de snapshot representa un hogar; no es una persona identificada. Son datos históricos internacionales de 2017, no clientes mexicanos ni datos actuales.
- Son 90 días previos al corte; las ventanas se solapan. Los modelos se reajustan por corte y las etiquetas se alinean por mediana de frecuencia. Los cambios no prueban causalidad ni abandono.
- Trayectorias: posiciones en variables observadas, no embedding ni prueba visual de la separación del clustering. Las corrientes usan solo hogares comunes y escala log1p compartida.
- Huella temporal: 13 bloques, doce de 7 días y uno de 6; totales y tasas salen de compras reales. Anillos independientes: canastas/día, gasto/día y proporción de líneas con cupón. No interpretar el tamaño entre anillos como la misma unidad.
- Los importes son moneda de la fuente, no MXN. Los porcentajes de cupón se calculan por líneas de compra, no por hogares.
- No simules predicciones, métricas, mapas, ingresos incrementales, CLV, abandono ni campañas ejecutadas. Este tablero aprobado corresponde al módulo de segmentación. No integres Criteo como si fueran los mismos hogares.
- Usa los datos precalculados adjuntos. No reentrenes para integrar; no necesitas MongoDB, API, claves ni servicios externos. No migres bases existentes.

## Validación y entrega
1. Verifica manifiesto y HTML reproducible con los scripts adjuntos.
2. Ejecuta build y comprobaciones relevantes del portafolio.
3. Prueba: tarjeta → tablero → cambio de corte/perfil → buscar hogar → explorar su ritmo → S13 → corrientes y filtro de cambios → CSV → regresar al portafolio.
4. Verifica el hogar 19 en agosto: 96 canastas y gasto 2250.38. S13 del hogar 1 en agosto: 26–31 julio, 6 días, 1 canasta y gasto 96.71.
5. Contrasta el CSV con la selección completa, no solo las 30 filas visibles. Verifica cambio rápido de filtros, estado vacío, teclado y 390 px. El control «Trayectorias» es local a Corrientes; no debe aparentar filtrar el resto.
6. Genera captura real para la tarjeta y revisa su encuadre dentro del contenedor. Comprueba rutas y assets desde la app realmente servida.
7. Actualiza la documentación técnica. En el contenido comercial evita notas de empaquetado, infraestructura o estado de MongoDB; preserva las limitaciones analíticas pertinentes en Evidencia.
8. Entrega resumen de archivos modificados, rutas implementadas, comprobaciones realmente ejecutadas y pendientes concretos. No afirmes publicación remota si solo trabajaste en local. La integración y build local están autorizados; no publiques ni cambies infraestructura remota con este encargo.

No cierres con una propuesta de implementación: completa la integración local y deja el resultado listo para revisar.

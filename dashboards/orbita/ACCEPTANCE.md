# Criterios de aceptación

- [ ] ORBITA aparece dentro de Dashboards sin sustituir otros proyectos.
- [ ] Ficha en español con todos los apartados y contenido coherente con el JSON.
- [ ] Número/orden de proyecto resuelto desde el catálogo real.
- [ ] La ficha monta la demo local directamente, sin barra superior; ruta directa y recarga funcionan bajo el base path del host.
- [ ] El HTML no se añade al bundle inicial; el catálogo no monta escenas por cada tarjeta.
- [ ] Menú interno en el flujo normal (`position: relative`, no sticky/fixed), marca UI 26 presente.
- [ ] Tierra interactiva, Luna y estaciones visibles; filtros múltiples por grupo.
- [ ] Tarjetas, campos y botones legibles en escritorio y móvil.
- [ ] Cinco vistas probadas; no overflow global involuntario.
- [ ] Rango de altura, restablecimiento, tabla y CSV funcionan.
- [ ] Pasos con worker real, selección de ventana y polar funcionan.
- [ ] Comparación: valores absolutos/normalizados, matriz y cursor coordinados.
- [ ] Carga/error y cero resultados se comprenden; nada se presenta como feed en vivo.
- [ ] Teclado, foco y reduced-motion comprobados.
- [ ] CSP compatible sin debilitamiento global; consola revisada.
- [ ] No backend, credenciales, LLM ni dependencias injustificadas incorporadas.
- [ ] Build/lint del host aprobados; límites restantes documentados.

Estado de esta integración: paquete UI26 verificado (10 hashes, 12,308 registros/NORAD únicos, seis grupos). La ficha sin barra superior, el iframe, las cinco vistas, las seis capas, el worker real, las descargas y los viewports 1440×900/390×844 se comprobaron con Chrome del sistema; el detalle y los límites están en `README.md`, `evidencias/orbita/verificacion-navegador.md` y `evidencias/orbita/verificacion-ui26.log`. Los criterios de build/lint del host no aplican a este `dist` estático.

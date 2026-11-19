# Clientes en movimiento — entrega al harness

El tablero aprobado está en `marketing_customer_project/dashboard/index.html`.
Abrir directamente en Chrome/Edge. Incluye estilos, JavaScript, SVG y datos; no requiere instalaciones ni conexión. Para integrarlo en el portafolio, entregar el ZIP y pegar `PROMPT_HARNESS.md` al agente.

## Archivos principales
- `dashboard/index.html`: tablero autónomo aprobado (versión azul).
- `dashboard/template-v2.html`: fuente editable de HTML/CSS/JS con marcador `__DATA__`.
- `dashboard/data-v2.json`: snapshots, validación y compras semanales por hogar.
- `tools/build_dashboard.py`: inyecta los datos en la plantilla, Python estándar.
- `tools/verify_delivery.py`: verifica hashes, cifras y reproducción.
- `marketing_customer_project/src/`: código analítico original; respaldo del experimento, no requisito para servir el tablero.
- `marketing_customer_project/reports/`: resultados y auditorías originales. No todos se muestran en este módulo.
- `marketing_customer_audit/`: transacciones completas RDS y CSV de Complete Journey necesarios para reproducir la segmentación.

## Uso desde la raíz de esta carpeta
```
python tools/verify_delivery.py
python tools/build_dashboard.py
```
La comprobación de hashes se hace antes de editar. Después de cambios intencionales el manifiesto original deja de coincidir: no modificarlo para ocultar diferencias; documentar una nueva revisión.

## Reproducción analítica opcional
Requiere dependencias de `marketing_customer_project/requirements.txt`. Ejecutar desde la raíz:
```
python marketing_customer_project/src/export_dashboard.py
python marketing_customer_project/src/export_weekly_dashboard.py
python tools/build_dashboard.py
```
No hace falta ejecutar estos pasos para integrar. El reajuste de K-Means puede variar entre versiones de librerías. Los datos aprobados precalculados son la referencia de esta entrega.

## Alcance y evidencia
Se probaron en navegador de escritorio la navegación, perfil, búsqueda, selección vinculada y semanas; se revisaron visualmente las vistas. JavaScript pasó `node --check`. El verificador incluye reconciliación por hogar. El diseño tiene CSS adaptable, pero no se ejecutó una validación completa de móvil ni de toda la navegación por teclado: el harness debe completarla en el portafolio. No se despliega nada remoto con este paquete.

La paleta reproduce la dirección azul aprobada; no se extrajo del CSS vigente del portafolio. No contiene captura para la tarjeta: debe producirse desde la integración servida final.

Fuentes Complete Journey: se conservan README y metadatos del experimento. Los scripts Criteo y de diseño experimental incluidos son respaldo separado; el archivo completo de Criteo no se incluye y no se necesita para este tablero. No se ejecutó un ensayo de campañas. Los scripts de ensayo no se presentan como producto validado para producción.

# Referencias funcionales consultadas · 16 noviembre 2026

Repositorios de terceros relacionados con marketplaces. No son tableros oficiales de Amazon, Walmart o Mercado Libre. Revisión de documentación pública; no se ejecutó ni auditó su código, ni se verificaron sus métricas de precisión. No se copió código.

| Referencia | Funciones documentadas | Aplicación en DockMind |
|---|---|---|
| https://github.com/BWB03/inventory-dashboard | Inventario FBA/AWD, entradas y días de cobertura; ejecución en navegador | Separación entre existencias y tránsito; tabla por producto |
| https://github.com/ecommerce1-cloud/vendor-forecast | Tabla de pronósticos filtrable y detalle por SKU a partir de reportes Vendor Central | Catálogo con búsqueda, filtros y detalle de pronóstico |
| https://github.com/aniket252005/walmart-sales-forecasting-inventory-optimizer | Pronóstico, inventario de seguridad y alertas de reposición | Relación explícita entre pronóstico y compras |
| https://github.com/renato-perussi/Vendas_Mercado_Livre | Ingresos, evolución, estacionalidad y ranking por producto | Ingreso potencial por SKU y ranking para priorizar |

## Implementado
48 SKU, seis categorías de ocho productos y tres canales de 16 SKU. 4,992 semanas-producto sintéticas. Precio, canal, inventario y proveedores son supuestos de la demo. Cada SKU se asigna a un canal para evitar duplicar existencias; no modela inventario compartido multicanal. Filtros de categoría/canal/ABC/búsqueda y orden por ventas perdidas, ingreso potencial o compra. Matriz limitada a 12 productos y calendario a 8, con avisos. Plano por categoría; selección abre detalle SKU. KPIs y presupuesto son globales; filtros de catálogo solo exploran la asignación ya calculada.

## No implementado
Conexiones a API Seller/Vendor Central, Mercado Libre o Walmart; ingesta de sus CSV; ventas reales; conciliación de comisiones/devoluciones; modelos de los repositorios. ABC calcula ingreso bruto histórico sintético anual, no margen.

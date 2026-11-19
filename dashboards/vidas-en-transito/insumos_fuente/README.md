## Consideraciones para el uso de la base de datos

- Cada fila corresponde a **una persona migrante registrada en un albergue** de la Redodem.  
- Una misma persona puede aparecer más de una vez si: 
  - Fue registrada en **más de un albergue durante el mismo año**, y/o  
  - Reportó **más de un motivo de salida, tipo de violencia, perpetrador de violencia, acompañante o actor que motivó su salida**.  
- No es posible analizar trayectorias de personas específicas entre albergues.

---

### Recomendación para análisis
Si se desea mantener como unidad de análisis a la persona (y evitar duplicaciones en variables como género, grupo etario, etc.), se recomienda **filtrar la base con la variable `org_ix`** usando el valor: "x1a_organizacion_que_registra"
Este filtro conserva solo la primera entrada registrada por persona en el año, reduciendo el efecto de las duplicaciones asociadas a múltiples registros. Sin embargo, **pueden seguir existiendo varias filas** para la misma persona si reportó **más de un tipo de violencia, motivo, acompañante o actor**.  
En esos casos, se debe agrupar o colapsar las variables de interés según el objetivo del análisis.

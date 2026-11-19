# Eventos de personas en situación migratoria irregular · UPMRIP/SEGOB

Cuadros oficiales **3.1** del Boletín Estadístico de la Unidad de Política
Migratoria, Registro e Identidad de Personas (UPMRIP), SEGOB, con base en
registros del Instituto Nacional de Migración (INM).

- Página de cuadros: <https://www.portales.segob.gob.mx/es/PoliticaMigratoria/CuadrosBOLETIN>
- Definición de la base: <https://portales.segob.gob.mx/es/PoliticaMigratoria/EvPerMigrIrreg>
- Consulta: 13 de noviembre de 2026.
- Unidad: **eventos administrativos**, no personas únicas.
- Los cuadros indican «Información preliminar» y están sujetos a validación.

| Año | Archivo local | Total oficial | Cobertura |
| --- | --- | ---: | --- |
| 2020 | `cuadro3.1_2020.xls` | 82,379 | enero–diciembre · excluido de la gráfica |
| 2021 | `cuadro3.1_2021.xls` | 309,692 | enero–diciembre |
| 2022 | `cuadro3.1_2022.xls` | 441,409 | enero–diciembre |
| 2023 | `cuadro3.1_2023.xls` | 778,907 | enero–diciembre |
| 2024 | `cuadro3.1_2024.xls` | 1,234,698 | enero–diciembre |
| 2025 | `cuadro3.1_2025.xls` | 155,730 | enero–diciembre |
| 2026 | `cuadro3.1_2026.xls` | 31,077 | enero–septiembre, parcial |

Los cuadros 2024–2026 declaran información preliminar; el cuadro 2026 solo
publica enero–septiembre. La definición administrativa cambió en 2013
(procedimiento de presentación) y en 2021 (Procedimiento Administrativo
Migratorio, PAM); la fuente homologa el concepto para comparabilidad. Una misma
persona pudo tener más de un evento.

**2020 no entra a la serie del tablero:** su cuadro 3.1 reporta «extranjeros
presentados» y no tiene las columnas Presentados/Canalizados de 2021 en adelante.
Se archiva como antecedente, pero la gráfica comparable comienza en 2021.

## Devoluciones por tipo de resolución · Cuadro 3.2.3

| Año | Total | Eventos de deportación | Retorno asistido | Retorno asistido de NNA | Cobertura |
| --- | ---: | ---: | ---: | ---: | --- |
| 2021 | 130,275 | 2,298 | 104,929 | 23,048 | enero–diciembre |
| 2022 | 121,963 | 4,143 | 104,897 | 12,923 | enero–diciembre |
| 2023 | 54,728 | 3,626 | 43,437 | 7,665 | enero–diciembre |
| 2024 | 20,834 | 516 | 16,398 | 3,920 | enero–diciembre |
| 2025 | 11,804 | 1,153 | 9,165 | 1,486 | enero–diciembre |
| 2026 | 10,829 | 4,559 | 5,832 | 438 | enero–septiembre · parcial |

El total es exactamente la suma de los tres tipos publicados; no se apila y no
se suma con los eventos del Cuadro 3.1 ni con alojamiento. Las definiciones
literales de cada tipo están en los XLS y en el panel «Definiciones de los tipos
de resolución» del tablero.

## Alojamiento

No se localizó una serie periódica comparable 2021–2026 de personas alojadas en
estaciones migratorias o estancias provisionales en los cuadros del Boletín
consultados. El tablero deja la vista fuera e informa el dato faltante; no
convierte ocupación simultánea, capacidad instalada ni cortes aislados en una
serie anual.

Para regenerar el bloque `eventos_migratorios` de `runtime/data.json`:

```bash
python dashboards/vidas-en-transito/preparar_eventos_migratorios.py
```

El script no descarga datos: lee estos XLS locales y valida los totales.

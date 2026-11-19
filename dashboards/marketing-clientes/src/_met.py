from pathlib import Path
p = Path("ui/Metodologia.tsx")
t = p.read_text(encoding="utf-8")

inicio = t.index("            <section>\n              <h4>Muestra y cobertura</h4>")
fin = t.index("        <h4>Fuente y condición</h4>")
nuevo = """            <section>
              <h4>Muestra y cobertura</h4>
              {cobertura ? (
                <ul className="mk-dialog-lista" data-testid="metodologia-muestra">
                  <li>
                    <strong>Población original:</strong>{' '}
                    {numero(cobertura.poblacion_original.usuarios)} usuarios distintos en el
                    periodo {etiquetaFecha(cobertura.poblacion_original.periodo.desde)} –{' '}
                    {etiquetaFecha(cobertura.poblacion_original.periodo.hasta)}, contados en la
                    extracción sin muestreo.
                  </li>
                  <li>
                    <strong>Muestra publicada:</strong>{' '}
                    {numero(cobertura.muestra_publicada.usuarios)} usuarios
                    {cobertura.muestra_publicada.porcentaje_efectivo !== null
                      ? ` (${cobertura.muestra_publicada.porcentaje_efectivo} % de la población)`
                      : ''}
                    . Es el universo del tablero: las cifras lo describen y no se extrapolan.
                  </li>
                  <li>
                    <strong>Unidad de muestreo:</strong>{' '}
                    {cobertura.muestra_publicada.unidad} (user_pseudo_id); se conservan íntegras
                    las historias de las personas elegidas.
                  </li>
                  <li>
                    <strong>Método:</strong>{' '}
                    {cobertura.metodo.predicado ? (
                      <code className="mk-mono">{cobertura.metodo.predicado}</code>
                    ) : (
                      'conjunto completo, sin muestreo'
                    )}
                    {cobertura.metodo.predicado ? ' — ' : ''}
                    {cobertura.metodo.explicacion}
                  </li>
                  <li>
                    <strong>Alcance de las cifras:</strong> describen{' '}
                    {cobertura.alcance.cifras_describen}
                    {'; '}
                    {cobertura.alcance.verificacion}
                  </li>
                </ul>
              ) : estado.muestra && (estado.muestra.porcentaje ?? 0) > 0 ? (
                <p className="mk-dialog-nota">
                  Muestra del {estado.muestra.porcentaje} % de usuarios (semilla «
                  {estado.muestra.semilla}»). La API no devolvió el detalle de cobertura.
                </p>
              ) : (
                <p className="mk-dialog-nota">
                  Conjunto completo del periodo (sin muestreo por usuario).
                </p>
              )}
"""
t = t[:inicio] + nuevo + t[fin:]

# Variables del componente: cobertura y numero().
t = t.replace(
    "  const acceso = estado.acceso_bigquery;",
    "  const acceso = estado.acceso_bigquery;\n  const cobertura = estado.cobertura_muestra ?? null;",
)
t = t.replace(
    "import { etiquetaFecha } from '../dominio';",
    "import { etiquetaFecha, numero } from '../dominio';",
)
p.write_text(t, encoding="utf-8")
print("Metodologia.tsx actualizada")

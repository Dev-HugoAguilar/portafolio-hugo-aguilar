/**
 * Diálogo «Fuentes y metodología».
 *
 * Todo el texto viene de la propia API (`/catalogo`): qué se publica, cómo se
 * cuentan las cifras, cómo se tratan los valores desconocidos y qué no se puede
 * concluir. La atribución de los límites de las alcaldías se muestra aquí y en
 * el propio mapa.
 */

import * as Dialog from '@radix-ui/react-dialog';

import type { Catalogo } from '../api/tipos';
import { etiquetaFecha, numero } from '../dominio';
import { IconoInformacion } from './iconos';

export interface PropsMetodologia {
  abierto: boolean;
  onAbierto: (abierto: boolean) => void;
  catalogo: Catalogo | null;
}

export function Metodologia({ abierto, onAbierto, catalogo }: PropsMetodologia) {
  const metodologia = catalogo?.metodologia;
  const fuente = catalogo?.fuente;
  const cobertura = catalogo?.cobertura;
  const geometria = metodologia?.fuente.geometria;

  return (
    <Dialog.Root open={abierto} onOpenChange={onAbierto}>
      <Dialog.Portal>
        <Dialog.Overlay className="at-overlay" />
        <Dialog.Content className="at-dialog" aria-describedby="at-dialog-desc">
          <div className="at-dialog-head">
            <div>
              <Dialog.Title className="at-dialog-title">Fuentes y metodología</Dialog.Title>
              <Dialog.Description id="at-dialog-desc" className="at-dialog-sub">
                Qué publica la SSC, cómo se cuentan las cifras y qué no se puede concluir
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="at-btn at-btn--mini" aria-label="Cerrar">
                Cerrar
              </button>
            </Dialog.Close>
          </div>

          <div className="at-dialog-body">
            <section>
              <h4>Fuente</h4>
              <p>
                <strong>{fuente?.titulo ?? metodologia?.fuente.conjunto}</strong>
              </p>
              <p>
                Autoridad: {metodologia?.fuente.autoridad ?? 'Secretaría de Seguridad Ciudadana de la CDMX'} ·
                Licencia: {fuente?.licencia ?? metodologia?.fuente.licencia ?? 'CC-BY-4.0-ESP'}
              </p>
              <p>
                Portal:{' '}
                <a href={fuente?.portal} target="_blank" rel="noreferrer">
                  {fuente?.portal}
                </a>
              </p>
              {fuente?.notas ? <p className="at-dialog-nota">{fuente.notas}</p> : null}
              <ul className="at-dialog-lista">
                <li>Versión publicada: {fuente?.version ?? 'sin publicar'}</li>
                <li>
                  Periodo real de los eventos: {etiquetaFecha(fuente?.periodo?.desde)} a{' '}
                  {etiquetaFecha(fuente?.periodo?.hasta)}
                </li>
                <li>
                  Catálogo modificado: {etiquetaFecha(fuente?.catalogo_modificado?.slice(0, 10))} ·
                  última sincronización correcta: {fuente?.ultima_sincronizacion ?? 'sin registro'}
                </li>
              </ul>
            </section>

            {fuente?.recursos ? (
              <section>
                <h4>Archivos que alimentan el tablero</h4>
                <ul className="at-dialog-lista at-dialog-lista--recursos">
                  {Object.entries(fuente.recursos).map(([clave, recurso]) => (
                    <li key={clave}>
                      <span className="at-dialog-recurso">{recurso.nombre ?? clave}</span>
                      <span className="at-dialog-mono">
                        {recurso.bytes ? `${numero(Math.round(recurso.bytes / 1024))} kB` : '—'} ·{' '}
                        {recurso.modificado_en_catalogo?.slice(0, 10) ?? 'sin fecha'}
                      </span>
                      {recurso.sha256 ? (
                        <span className="at-dialog-mono at-dialog-sha">SHA-256 {recurso.sha256.slice(0, 16)}…</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {metodologia ? (
              <>
                <section>
                  <h4>Granularidad y claves</h4>
                  <ul className="at-dialog-lista">
                    {Object.entries(metodologia.granularidad).map(([clave, texto]) => (
                      <li key={clave}>{texto}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4>Cómo se calcula cada cifra</h4>
                  <ul className="at-dialog-lista">
                    {Object.entries(metodologia.metricas).map(([clave, texto]) => (
                      <li key={clave}>{texto}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4>Tratamiento de los datos</h4>
                  <ul className="at-dialog-lista">
                    {Object.entries(metodologia.tratamiento).map(([clave, texto]) => (
                      <li key={clave}>{texto}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4>Fechas: no son la misma cosa</h4>
                  <ul className="at-dialog-lista">
                    {Object.entries(metodologia.fechas).map(([clave, texto]) => (
                      <li key={clave}>{texto}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4>Límites del conjunto</h4>
                  <ul className="at-dialog-lista">
                    {metodologia.limitaciones.map((texto) => (
                      <li key={texto}>{texto}</li>
                    ))}
                  </ul>
                </section>
              </>
            ) : null}

            {cobertura ? (
              <section>
                <h4>Cobertura del conjunto publicado</h4>
                <ul className="at-dialog-lista">
                  <li>{numero(cobertura.hechos)} hechos con folio único</li>
                  <li>{numero(cobertura.personas_lesionadas)} personas lesionadas registradas</li>
                  <li>{numero(cobertura.personas_fallecidas)} personas fallecidas registradas</li>
                  <li>
                    {numero(cobertura.con_coordenadas)} hechos con coordenadas utilizables ·{' '}
                    {numero(cobertura.sin_coordenadas)} sin ellas · {numero(cobertura.fuera_de_cdmx)}{' '}
                    fuera de la Ciudad de México
                  </li>
                  <li>
                    {numero(cobertura.con_sexo)} con sexo registrado · {numero(cobertura.con_edad)} con
                    edad registrada
                  </li>
                </ul>
                {cobertura.avisos.length > 0 ? (
                  <ul className="at-dialog-lista at-dialog-lista--avisos">
                    {cobertura.avisos.map((aviso) => (
                      <li key={aviso}>{aviso}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {geometria ? (
              <section>
                <h4>Límites de las alcaldías</h4>
                <p>
                  {geometria.conjunto} · {geometria.licencia} · {geometria.version}
                </p>
                <p>
                  <a href={geometria.portal} target="_blank" rel="noreferrer">
                    {geometria.portal}
                  </a>
                </p>
                <p className="at-dialog-nota">
                  Los polígonos se simplifican para la web y se usan para dibujar el mapa y
                  comprobar la pertenencia espacial de cada coordenada. El mapa no usa teselas de
                  terceros ni claves de proveedor: solo esta geometría y los puntos publicados.
                </p>
              </section>
            ) : null}

            <section>
              <h4>Actualización</h4>
              <p>
                El tablero nunca descarga los CSV desde el navegador: un proceso del backend
                resuelve el catálogo oficial, descarga, valida y publica una versión; la interfaz
                solo consulta la versión publicada. Si la validación falla, se conserva la última
                versión válida.
              </p>
            </section>
          </div>

          <p className="at-dialog-pie">
            <IconoInformacion tamano={13} /> Datos abiertos de la Ciudad de México · uso con
            atribución a la SSC y al catálogo de datos abiertos de la CDMX.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

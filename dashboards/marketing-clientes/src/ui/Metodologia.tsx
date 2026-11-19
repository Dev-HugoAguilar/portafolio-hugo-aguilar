/**
 * Diálogo «Metodología y datos».
 *
 * Reúne, con lo que devuelve la API: fuente y condición de los datos, periodo,
 * definiciones de cada métrica, campos usados, calidad y limitaciones, y el estado
 * real del acceso a BigQuery (incluida la vía de desbloqueo cuando no hay datos).
 */

import * as Dialog from '@radix-ui/react-dialog';

import type { Catalogo, Estado } from '../api/tipos';
import { etiquetaFecha, numero } from '../dominio';
import { IconoInformacion } from './iconos';

export interface PropsMetodologia {
  abierto: boolean;
  onAbierto: (abierto: boolean) => void;
  catalogo: Catalogo | null;
  estado: Estado;
}

const CAMPOS = [
  { campo: 'event_date', uso: 'periodo, series y cohortes' },
  { campo: 'event_timestamp', uso: 'orden y ventana del embudo' },
  { campo: 'event_name', uso: 'pasos del embudo y conteo de eventos' },
  { campo: 'user_pseudo_id', uso: 'usuarios distintos (se guarda como hash)' },
  { campo: 'event_params[ga_session_id]', uso: 'sesiones' },
  { campo: 'traffic_source.source / medium', uso: 'canal de adquisición del usuario' },
  { campo: 'device.category', uso: 'segmento por dispositivo' },
  { campo: 'geo.country / region', uso: 'segmento geográfico' },
  { campo: 'ecommerce.transaction_id', uso: 'deduplicación de compras' },
  { campo: 'ecommerce.purchase_revenue_in_usd', uso: 'ingresos en dólares' },
  { campo: 'items.item_name / item_category', uso: 'artículo y categoría (si existe)' },
];

const LIMITACIONES = [
  'Es una muestra histórica y ofuscada: puede contener valores de marcador y no es la información comercial de Google.',
  'El periodo termina el 31 de enero de 2021: el tablero no se actualiza en tiempo real.',
  'El canal es el de la primera actividad observada del usuario; el conjunto no documenta atribución por sesión.',
  'El embudo exige orden y una ventana de 24 horas: es un criterio del tablero, no una propiedad de la fuente.',
  'La cohorte es la primera actividad observada dentro del conjunto, que empieza el 1 de noviembre de 2020.',
  'Las semanas sin ventana de observación se dejan vacías: no se convierten en retención cero.',
  'No se calculan tasas de conversión del negocio real ni atribución publicitaria.',
  'No hay tabla de detalle: el modelo compacto guarda agregados y no eventos uno a uno.',
];

export function Metodologia({ abierto, onAbierto, catalogo, estado }: PropsMetodologia) {
  const fuente = catalogo?.fuente ?? estado.fuente;
  const definiciones = catalogo?.definiciones ?? {};
  const esquema = catalogo?.esquema ?? estado.esquema;
  const cobertura = estado.cobertura_muestra ?? null;

  return (
    <Dialog.Root open={abierto} onOpenChange={onAbierto}>
      <Dialog.Portal>
        <Dialog.Overlay className="mk-overlay" />
        <Dialog.Content className="mk-dialog" aria-describedby="mk-dialog-desc">
          <div className="mk-dialog-head">
            <div>
              <Dialog.Title className="mk-dialog-title">Metodología y datos</Dialog.Title>
              <Dialog.Description id="mk-dialog-desc" className="mk-dialog-sub">
                Fuente, definiciones, calidad y límites de lo que muestra el tablero
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="mk-btn mk-btn--mini" aria-label="Cerrar">
                Cerrar
              </button>
            </Dialog.Close>
          </div>

          <div className="mk-dialog-body">
            <section>
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
        <h4>Fuente y condición</h4>
              <p className="mk-mono">{fuente.conjunto}</p>
              <p>{fuente.condicion}</p>
              <ul className="mk-dialog-lista">
                <li>
                  Documentación:{' '}
                  <a href={fuente.documentacion} target="_blank" rel="noreferrer">
                    {fuente.documentacion}
                  </a>
                </li>
                <li>
                  Esquema:{' '}
                  <a href={fuente.esquema} target="_blank" rel="noreferrer">
                    {fuente.esquema}
                  </a>
                </li>
                <li>Licencia / programa: {fuente.licencia}</li>
                <li>
                  Periodo documentado por la fuente: {etiquetaFecha(fuente.periodo_documentado.desde)} a{' '}
                  {etiquetaFecha(fuente.periodo_documentado.hasta)}
                </li>
                <li>
                  Periodo observado en los datos publicados: {etiquetaFecha(estado.periodo?.desde)} a{' '}
                  {etiquetaFecha(estado.periodo?.hasta)}
                </li>
                <li>
                  Versión publicada: {estado.version ?? 'sin publicar'} · última lectura:{' '}
                  {estado.ultima_sincronizacion ?? 'sin registro'}
                </li>
              </ul>
            </section>

            <section>
              <h4>Definiciones de las métricas</h4>
              <dl className="mk-definiciones">
                {Object.entries(definiciones).map(([clave, texto]) => (
                  <div key={clave}>
                    <dt>{clave}</dt>
                    <dd>{texto}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section>
              <h4>Campos del esquema usados</h4>
              <ul className="mk-dialog-lista">
                {CAMPOS.map((fila) => (
                  <li key={fila.campo}>
                    <span className="mk-mono">{fila.campo}</span> — {fila.uso}
                  </li>
                ))}
              </ul>
              {esquema?.columnas_detectadas ? (
                <p className="mk-dialog-nota">
                  La ingesta detectó {esquema.columnas_detectadas} columnas en la tabla real y valida
                  las imprescindibles antes de calcular.
                </p>
              ) : (
                <p className="mk-dialog-nota">
                  El esquema real se inspecciona en cada ingesta: si falta una columna
                  imprescindible, no se publica nada.
                </p>
              )}
            </section>

            <section>
              <h4>Calidad y límites</h4>
              <ul className="mk-dialog-lista">
                {LIMITACIONES.map((texto) => (
                  <li key={texto}>{texto}</li>
                ))}
              </ul>
            </section>

            <section>
              <h4>Extracción, publicación y modelo</h4>
              <ul className="mk-dialog-lista">
                <li>
                  <strong>Extracción (preparación):</strong>{' '}
                  <span className="mk-mono">scripts.importar_marketing</span> guarda un CSV.gz por
                  entidad y un manifiesto con el SHA-256 de cada archivo, el SQL que lo produjo y los
                  conteos. La API no participa en la extracción.
                </li>
                <li>
                  <strong>Publicación por versiones:</strong> los agregados se calculan fuera de
                  Atlas y se escriben en una versión nueva; el puntero{' '}
                  <span className="mk-mono">marketing_estado</span> cambia en una sola operación, así
                  que nunca se sirve una publicación a medias.
                </li>
                <li>
                  <strong>Lectura:</strong> la API consulta la versión activa en MongoDB Atlas. El
                  tablero no consulta BigQuery mientras se usa.
                </li>
                <li>
                  <strong>Qué se guarda:</strong> agregaciones (flujo del Sankey, tiempos entre
                  etapas, categorías por compra, afinidad) y el detalle mínimo que las métricas no
                  aditivas necesitan: usuarios por usuario-día para contar personas exactas, compras
                  deduplicadas, embudo por día y dimensión y cohortes por semana. No se guardan
                  sesiones una a una, líneas de artículo ni el extracto de eventos.
                </li>
                <li>
                  <strong>Exportación:</strong> entrega los agregados del rango (una fila por día,
                  una por canal y el total) con su cabecera de fuente, muestra, método y filtros. No
                  hay extracto de eventos que descargar.
                </li>
              </ul>
            </section>

            <section>
              <h4>Fórmulas y reglas aplicadas</h4>
              <ul className="mk-dialog-lista">
                <li>
                  <strong>Usuario:</strong> <span className="mk-mono">user_pseudo_id</span> distinto,
                  guardado como hash SHA-256 con sal por versión; el identificador original no se
                  almacena.
                </li>
                <li>
                  <strong>Sesión:</strong> usuario + <span className="mk-mono">event_params[ga_session_id]</span>.
                </li>
                <li>
                  <strong>Compra:</strong> evento <span className="mk-mono">purchase</span>{' '}
                  deduplicado por usuario + <span className="mk-mono">transaction_id</span>; si falta
                  la transacción, por usuario + marca de tiempo. Los ingresos son{' '}
                  <span className="mk-mono">purchase_revenue_in_usd</span> solo de esas compras.
                </li>
                <li>
                  <strong>Adquisición:</strong>{' '}
                  <span className="mk-mono">traffic_source.source / medium</span> de la primera
                  actividad observada del usuario; no es atribución por sesión.
                </li>
                <li>
                  <strong>Embudo:</strong> sesiones que cumplen los cuatro pasos en orden dentro de
                  24 horas desde el primero. Una sesión que no respeta el orden o la ventana no
                  avanza de paso; las diferencias son conteos, no abandono medido.
                </li>
                <li>
                  <strong>Retención S(n):</strong> usuarios activos en la semana n ÷ usuarios
                  elegibles para esa semana (la cohorte completa cuando n = 0). Se suman usuarios y
                  se divide por la base: nunca se promedian porcentajes. Las semanas sin ventana
                  completa quedan vacías, no en cero.
                </li>
                <li>
                  <strong>Compras por categoría:</strong> compras distintas que incluyen la categoría
                  (el conteo se solapa entre categorías) y el importe es de la línea. Cada compra se
                  atribuye a la fecha y dimensiones de su primera línea.
                </li>
                <li>
                  <strong>Afinidad:</strong> pares de categorías de una misma compra, contados una
                  vez por compra y sin autorrelaciones; cubre el periodo completo publicado y no
                  depende de los filtros.
                </li>
              </ul>
            </section>

            <section>
              <h4>Verificación y conciliación</h4>
              <ul className="mk-dialog-lista">
                <li>
                  Antes de retirar el detalle, cada agregado se recalculó desde el CSV original y se
                  comparó clave por clave (flujo, tiempos entre etapas, categorías por compra,
                  usuarios y compradores): sin diferencias.
                </li>
                <li>
                  En cada consulta del resumen se comparan cinco indicadores con el total de sus
                  gráficas (serie diaria, Sankey y canales); el panel «Muestra y cobertura» publica
                  esa conciliación.
                </li>
                <li>
                  Hay pruebas automáticas de API y de navegador, en escritorio y en móvil, sobre los
                  datos publicados.
                </li>
              </ul>
            </section>

            {catalogo?.validacion?.avisos?.length ? (
              <section>
                <h4>Avisos de la última ingesta</h4>
                <ul className="mk-dialog-lista">
                  {catalogo.validacion.avisos.map((aviso) => (
                    <li key={aviso}>{aviso}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <p className="mk-dialog-pie">
            <IconoInformacion tamano={13} /> Muestra pública de BigQuery · sin datos personales en el
            tablero ni en la exportación.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

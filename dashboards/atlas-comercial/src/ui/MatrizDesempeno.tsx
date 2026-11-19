/**
 * «Desempeño por corte y horizonte»: matriz de 28 días por origen de evaluación.
 *
 * Dos lecturas con escalas y leyendas distintas:
 *
 * - **Mejora frente al baseline**: ventaja = MAE_baseline − MAE_candidato. Positivo = el
 *   candidato tiene menos error; negativo = más; cero = el mismo. Escala divergente
 *   centrada en cero, en unidades por serie (diferencia de MAE).
 * - **Sesgo**: media(predicción − observado). Positivo = sobreestimación; negativo =
 *   subestimación. Se puede ver el candidato o el baseline.
 *
 * Una celda sin observaciones no se pinta como cero: queda vacía, con su motivo en el
 * detalle. La matriz usa el grano artículo × tienda (el error se mide antes de agregar).
 */

import { useMemo } from 'react';

import type { CeldaHorizonte, MatrizDesempenoRespuesta } from '../api';
import { Segmentado } from './Segmentado';
import './matriz-desempeno.css';

export type LecturaMatriz = 'ventaja' | 'sesgo';
export type MetodoSesgo = 'candidato' | 'baseline';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const fechaCorta = (iso: string | null) => {
  if (!iso) return '—';
  const fecha = new Date(`${iso}T00:00:00`);
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
};

const numero2 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? 'n/c'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Color de la celda según la lectura activa; `null` si no hay valor. */
const colorCelda = (
  celda: CeldaHorizonte,
  lectura: LecturaMatriz,
  metodo: MetodoSesgo,
  escala: { max_abs_ventaja: number; max_abs_sesgo: number },
): { fondo: string; texto: string } | null => {
  const valor = lectura === 'ventaja' ? celda.ventaja : metodo === 'candidato' ? celda.sesgo_candidato : celda.sesgo_baseline;
  const maximo = lectura === 'ventaja' ? escala.max_abs_ventaja : escala.max_abs_sesgo;
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return null;
  if (maximo <= 0) return { fondo: '#f4f6fa', texto: '#111318' };
  const intensidad = Math.min(1, Math.abs(valor) / maximo);
  const alfa = 0.12 + 0.82 * intensidad;
  if (lectura === 'ventaja') {
    return valor >= 0
      ? { fondo: `rgba(52, 88, 245, ${alfa.toFixed(3)})`, texto: intensidad > 0.55 ? '#ffffff' : '#111318' }
      : { fondo: `rgba(55, 65, 81, ${alfa.toFixed(3)})`, texto: intensidad > 0.55 ? '#ffffff' : '#111318' };
  }
  // El sesgo no comparte la semántica de «mejor/peor»: sobreestimar y subestimar son
  // dos lados de la misma escala, no dos valoraciones.
  return valor >= 0
    ? { fondo: `rgba(55, 65, 81, ${alfa.toFixed(3)})`, texto: intensidad > 0.55 ? '#ffffff' : '#111318' }
    : { fondo: `rgba(52, 88, 245, ${alfa.toFixed(3)})`, texto: intensidad > 0.55 ? '#ffffff' : '#111318' };
};

export function MatrizDesempeno({
  datos,
  cargando,
  error,
  lectura,
  onLectura,
  metodo,
  onMetodo,
  onReintentar,
}: {
  datos: MatrizDesempenoRespuesta | null;
  cargando: boolean;
  error: string | null;
  lectura: LecturaMatriz;
  onLectura: (lectura: LecturaMatriz) => void;
  metodo: MetodoSesgo;
  onMetodo: (metodo: MetodoSesgo) => void;
  onReintentar?: () => void;
}) {
  const horizontes = useMemo(() => {
    const primero = datos?.origenes[0];
    return primero?.celdas.map((celda) => celda.horizonte) ?? Array.from({ length: 28 }, (_, i) => i + 1);
  }, [datos]);

  const maxAbsoluto = useMemo(() => {
    if (!datos) return 0;
    const valores = datos.origenes.flatMap((origen) =>
      origen.celdas.map((celda) =>
        lectura === 'ventaja'
          ? celda.ventaja
          : metodo === 'candidato'
            ? celda.sesgo_candidato
            : celda.sesgo_baseline,
      ),
    );
    return Math.max(0, ...valores.map((valor) => (valor === null || valor === undefined ? 0 : Math.abs(valor))));
  }, [datos, lectura, metodo]);

  const escala = {
    max_abs_ventaja: datos?.escala.max_abs_ventaja ?? 0,
    max_abs_sesgo: datos?.escala.max_abs_sesgo ?? 0,
  };

  const textoValor = (celda: CeldaHorizonte): string => {
    if (lectura === 'ventaja') return numero2(celda.ventaja);
    return numero2(metodo === 'candidato' ? celda.sesgo_candidato : celda.sesgo_baseline);
  };

  return (
    <section className="ac-panel" aria-labelledby="ac-t-matriz-desempeno">
      <header className="ac-panel-cab ac-md-cab">
        <div>
          <h3 id="ac-t-matriz-desempeno">Desempeño por corte y horizonte</h3>
          <p className="ac-panel-sub">
            {datos
              ? `${datos.origenes.length} cortes × ${horizontes.length} días del horizonte · grano artículo × tienda · ejecución ${datos.run_id}`
              : 'Comparación del candidato frente al baseline día por día'}
          </p>
        </div>
        <div className="ac-md-controles">
          <Segmentado<LecturaMatriz>
            etiqueta="Lectura de la matriz"
            valor={lectura}
            onElegir={onLectura}
            testid="selector-lectura-matriz"
            opciones={[
              { valor: 'ventaja', texto: 'Mejora frente al baseline' },
              { valor: 'sesgo', texto: 'Sesgo' },
            ]}
          />
          {lectura === 'sesgo' ? (
            <Segmentado<MetodoSesgo>
              etiqueta="Método del sesgo"
              valor={metodo}
              onElegir={onMetodo}
              testid="selector-metodo-sesgo"
              opciones={[
                { valor: 'candidato', texto: 'Candidato' },
                { valor: 'baseline', texto: 'Baseline' },
              ]}
            />
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="ac-hx-aviso" role="alert">
          <p>{error}</p>
          {onReintentar ? (
            <button type="button" className="ac-accion ac-accion--secundaria" onClick={onReintentar}>
              Reintentar
            </button>
          ) : null}
        </div>
      ) : null}

      {!error && (cargando || !datos) ? (
        <p className="ac-vacio" role="status" aria-busy="true">
          Calculando el desempeño por corte y horizonte…
        </p>
      ) : null}

      {!error && datos ? (
        <>
          <ul className="ac-md-leyenda">
            {lectura === 'ventaja' ? (
              <>
                <li>
                  <span className="ac-md-muestra" style={{ background: 'rgba(52, 88, 245, 0.85)' }} />
                  Ventaja del candidato: menos error que el baseline
                </li>
                <li>
                  <span className="ac-md-muestra" style={{ background: 'rgba(55, 65, 81, 0.85)' }} />
                  Desventaja: más error que el baseline
                </li>
                <li className="ac-md-leyenda-nota">
                  Unidades por serie; 0 = mismo error. Escala de {numero2(maxAbsoluto)} a −
                  {numero2(maxAbsoluto)}.
                </li>
              </>
            ) : (
              <>
                <li>
                  <span className="ac-md-muestra" style={{ background: 'rgba(55, 65, 81, 0.85)' }} />
                  Sobreestimación (predicción por encima de lo observado)
                </li>
                <li>
                  <span className="ac-md-muestra" style={{ background: 'rgba(52, 88, 245, 0.85)' }} />
                  Subestimación (predicción por debajo de lo observado)
                </li>
                <li className="ac-md-leyenda-nota">
                  Sesgo del {metodo}; unidades por serie. Escala de {numero2(maxAbsoluto)} a −
                  {numero2(maxAbsoluto)}. No indica calidad del pronóstico.
                </li>
              </>
            )}
          </ul>

          <div className="ac-md-marco">
            <table className="ac-md-tabla">
              <caption>
                {lectura === 'ventaja'
                  ? 'Diferencia de MAE (baseline − candidato) por origen y horizonte, en unidades por serie. Positivo significa menos error del candidato.'
                  : `Sesgo medio (predicción − observado) del ${metodo} por origen y horizonte, en unidades por serie.`}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Origen</th>
                  {horizontes.map((horizonte) => (
                    <th key={horizonte} scope="col" className="ac-md-dia">
                      {horizonte}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.origenes.map((origen) => (
                  <tr key={origen.origen_d}>
                    <th scope="row" className="ac-md-origen">
                      <span className="ac-md-origen-d">{fechaCorta(origen.origen_fecha)}</span>
                      <span className="ac-md-origen-fecha">{fechaCorta(origen.origen_fecha)}</span>
                      <span className={`ac-md-etapa${origen.etapa === 'final' ? ' ac-md-etapa--final' : ''}`}>
                        {origen.etapa === 'final' ? 'reservado' : 'desarrollo'}
                      </span>
                    </th>
                    {origen.celdas.map((celda) => {
                      const color = colorCelda(celda, lectura, metodo, escala);
                      const detalle = [
                        `Corte ${fechaCorta(origen.origen_fecha)} (d_${origen.origen_d})`,
                        `Día ${celda.horizonte}${celda.fecha ? ` · ${fechaCorta(celda.fecha)}` : ''}`,
                        `MAE candidato: ${numero2(celda.mae_candidato)}`,
                        `MAE baseline: ${numero2(celda.mae_baseline)}`,
                        `Ventaja: ${numero2(celda.ventaja)}`,
                        `Sesgo candidato: ${numero2(celda.sesgo_candidato)}`,
                        `Sesgo baseline: ${numero2(celda.sesgo_baseline)}`,
                        `Observaciones: ${celda.n.toLocaleString('es-MX')} · denominador ${celda.denominador.toLocaleString('es-MX')}`,
                        celda.motivo ? `Sin dato: ${celda.motivo}` : '',
                      ]
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <td
                          key={celda.horizonte}
                          className={`ac-md-celda${color ? '' : ' ac-md-celda--vacia'}`}
                          style={color ? { background: color.fondo, color: color.texto } : undefined}
                          title={detalle}
                        >
                          <span className="ac-md-valor">{color ? textoValor(celda) : '·'}</span>
                          {color ? null : <span className="ac-md-vacia">sin observación</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="ac-nota">
            {datos.formulas.grano}. {datos.formulas.comparabilidad}.{' '}
            {datos.formulas.no_calculable}. Cobertura del candidato:{' '}
            {datos.cobertura ? `${datos.cobertura.series_modelo}/${datos.cobertura.series} series` : 'sin declarar'}
            {datos.cobertura ? ` · ${datos.cobertura.fallback} con fallback al baseline` : ''}.
          </p>

          <details className="ac-md-metodo">
            <summary>Fórmulas y alcance de la matriz</summary>
            <dl className="ac-md-definiciones">
              {Object.entries(datos.formulas).map(([clave, texto]) => (
                <div key={clave}>
                  <dt>{clave.replace(/_/g, ' ')}</dt>
                  <dd>{texto}</dd>
                </div>
              ))}
            </dl>
            <p className="ac-nota">{datos.escala.nota}</p>
          </details>
        </>
      ) : null}
    </section>
  );
}

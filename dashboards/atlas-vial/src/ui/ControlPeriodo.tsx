/**
 * Desplegable de periodo por año y mes.
 *
 * El control resume la selección aplicada («Ene–Dic 2024», «Mar 2024»,
 * «Mar–Jun 2024») y el panel trabaja siempre con meses completos del año de
 * cobertura. La vista previa del intervalo es local: no toca los filtros hasta
 * que se pulsa «Aplicar»; «Cancelar» conserva lo anterior.
 *
 * Si el enlace trae fechas parciales (límites que no son meses completos), se
 * conservan tal cual y el panel las muestra hasta que se aplique una selección
 * mensual nueva.
 */

import * as Popover from '@radix-ui/react-popover';
import { useEffect, useId, useMemo, useState } from 'react';

import {
  anioDeCobertura,
  etiquetaMeses,
  leerPeriodo,
  limitesDeMeses,
  mesesDe,
} from '../periodo';
import { IconoCalendario, IconoCerrar, IconoChevron, IconoVerificar } from './iconos';

export function ControlPeriodo({
  limites,
  desde,
  hasta,
  onPeriodo,
}: {
  limites: { desde: string | null; hasta: string | null };
  desde: string | null;
  hasta: string | null;
  onPeriodo: (desde: string | null, hasta: string | null) => void;
}) {
  const anio = anioDeCobertura(limites.desde, limites.hasta);
  const meses = useMemo(() => mesesDe(anio), [anio]);
  const actual = useMemo(() => leerPeriodo(desde, hasta, anio), [desde, hasta, anio]);

  const [abierto, setAbierto] = useState(false);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [previa, setPrevia] = useState<number | null>(null);
  const idTitulo = useId();

  /* Al abrir, el panel parte de la selección aplicada; al cerrar se descarta. */
  const alCambiarApertura = (siguiente: boolean) => {
    setAbierto(siguiente);
    if (siguiente) {
      const indices = actual.indices;
      /* Con una selección aplicada, el panel arranca con ella completa: el
         siguiente clic inicia un intervalo nuevo, no la prolonga. */
      setInicio(indices.length ? Math.min(...indices) : null);
      setFin(indices.length ? Math.max(...indices) : null);
      setPrevia(null);
    } else {
      setPrevia(null);
    }
  };

  useEffect(() => {
    if (!abierto) setPrevia(null);
  }, [abierto]);

  const elegir = (indice: number) => {
    if (inicio === null || fin !== null) {
      setInicio(indice);
      setFin(null);
      setPrevia(null);
      return;
    }
    if (indice === inicio) {
      setFin(indice);
      return;
    }
    setFin(indice);
  };

  const rango = useMemo(() => {
    if (inicio === null) return [];
    const final = fin ?? previa ?? inicio;
    const desdeIndice = Math.min(inicio, final);
    const hastaIndice = Math.max(inicio, final);
    return meses
      .filter((mes) => mes.indice >= desdeIndice && mes.indice <= hastaIndice)
      .map((mes) => mes.indice);
  }, [inicio, fin, previa, meses]);

  const resumenPanel = rango.length === 0 ? 'Todo el año' : etiquetaMeses(rango, anio);
  const aplicado = actual.texto;

  const aplicar = () => {
    const nuevo = limitesDeMeses(rango, anio);
    onPeriodo(nuevo.desde, nuevo.hasta);
    setAbierto(false);
  };

  const alPulsarTecla = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    const teclas = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!teclas.includes(evento.key)) return;
    const botones = Array.from(
      evento.currentTarget.querySelectorAll<HTMLButtonElement>('.at-mes'),
    );
    if (botones.length === 0) return;
    evento.preventDefault();
    const actualIndice = botones.indexOf(document.activeElement as HTMLButtonElement);
    const paso = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : evento.key === 'ArrowDown' ? 4 : evento.key === 'ArrowUp' ? -4 : 0;
    const destino =
      evento.key === 'Home'
        ? 0
        : evento.key === 'End'
          ? botones.length - 1
          : Math.max(0, Math.min(botones.length - 1, actualIndice + paso));
    botones[destino]?.focus();
  };

  return (
    <Popover.Root open={abierto} onOpenChange={alCambiarApertura}>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-testid="ctrl-periodo"
          className={`at-ctrl at-ctrl--periodo${actual.tipo === 'todo' ? '' : ' is-activo'}`}
          aria-label={`Periodo: ${aplicado}`}
          title={`Periodo: ${aplicado}`}
        >
          <span className="at-ctrl-icono" aria-hidden="true">
            <IconoCalendario tamano={16} />
          </span>
          <span className="at-ctrl-label">Periodo</span>
          <IconoChevron tamano={12} className="at-ctrl-chevron" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="atf-panel atf-panel--periodo"
          data-testid="panel-periodo"
          sideOffset={8}
          align="start"
          collisionPadding={12}
        >
          <div className="atf-vista">
            <div className="atf-head">
              <div className="atf-head-texto">
                <h3 className="atf-titulo" id={idTitulo}>
                  Periodo
                </h3>
                <p className="atf-cuenta" data-testid="periodo-panel-cuenta">
                  {resumenPanel}
                </p>
              </div>
              <div className="atf-head-acciones">
                <button
                  type="button"
                  className="atf-icono-accion"
                  onClick={() => setAbierto(false)}
                  aria-label="Cancelar cambios"
                  data-tooltip="Cancelar cambios"
                  data-testid="periodo-cancelar"
                >
                  <IconoCerrar tamano={18} />
                </button>
                <button
                  type="button"
                  className="atf-icono-accion atf-icono-accion--aplicar"
                  onClick={aplicar}
                  aria-label="Aplicar periodo"
                  data-tooltip="Aplicar periodo"
                  data-testid="periodo-aplicar"
                >
                  <IconoVerificar tamano={18} />
                </button>
              </div>
            </div>

            <p className="atf-anio" data-testid="periodo-anio">
              Cobertura <strong>{anio}</strong> · enero a diciembre
            </p>

            {actual.tipo === 'exacto' ? (
              <p className="atf-aviso" data-testid="periodo-fechas-exactas">
                El filtro vigente usa fechas exactas: <strong>{desde}</strong> →{' '}
                <strong>{hasta}</strong>. Se conservan hasta que apliques un intervalo de meses.
              </p>
            ) : null}

            <div
              className="at-meses"
              role="group"
              aria-labelledby={idTitulo}
              data-testid="periodo-meses"
              onKeyDown={alPulsarTecla}
              onMouseLeave={() => setPrevia(null)}
            >
              {meses.map((mes) => {
                const enRango = rango.includes(mes.indice);
                const esInicio = enRango && mes.indice === Math.min(...rango);
                const esFin = enRango && fin !== null && mes.indice === Math.max(...rango);
                return (
                  <button
                    key={mes.clave}
                    type="button"
                    data-testid={`mes-${mes.clave}`}
                    className={`at-mes${enRango ? ' is-rango' : ''}${esInicio ? ' is-inicio' : ''}${
                      esFin ? ' is-fin' : ''
                    }`}
                    aria-label={`${mes.largo} ${anio}`}
                    aria-pressed={enRango}
                    onClick={() => elegir(mes.indice)}
                    onMouseEnter={() => {
                      if (inicio !== null && fin === null) setPrevia(mes.indice);
                    }}
                    onFocus={() => {
                      if (inicio !== null && fin === null) setPrevia(mes.indice);
                    }}
                  >
                    <span className="at-mes-nombre">{mes.largo.slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>

            <p className="atf-nota" data-testid="periodo-ayuda">
              {inicio === null
                ? 'Elige el mes inicial; después, el final del intervalo.'
                : fin === null
                  ? 'Elige el mes final o vuelve a pulsar el inicial para un solo mes.'
                  : 'Intervalo listo: aplícalo para filtrar.'}
            </p>

          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}





/**
 * Pestaña «Personas y vehículos».
 *
 * Tres gráficas con datos reales del mismo conjunto filtrado:
 *  1. «Una categoría, tres lecturas»: posiciones por tipo de persona principal.
 *  2. «Edad y sexo de la persona principal»: burbujas del cruce real
 *     `personas_sexo` × `personas_edad` del mismo registro.
 *  3. «Vehículo principal: comparación entre periodos»: dos puntos conectados
 *     por vehículo con periodos A/B dentro del filtro temporal global.
 *
 * Qué **no** hace: no reparte el total de personas entre categorías (el archivo
 * trae una persona principal por hecho), no suma desgloses entre sí y no
 * convierte «Sin dato» en cero. Las métricas de las gráficas 2 y 3 comparten un
 * único estado: cambiar la medida no filtra ni altera los KPI.
 */

import { useState } from 'react';

import type { Personas } from '../api/tipos';
import type { Metrica } from '../paleta';
import { BurbujasEdadSexo } from './BurbujasEdadSexo';
import { PosicionesTipoPersona } from './PosicionesTipoPersona';
import { Segmentado } from './Segmentado';
import { SelectorMetrica } from './SelectorMetrica';

export type VistaBurbujas = 'conjunto' | 'edad' | 'sexo';
import { VehiculosPeriodos, type Periodo } from './VehiculosPeriodos';

export interface PropsVistaPersonas {
  datos: Personas | null;
  /** Dataset del periodo A y B (mismos filtros no temporales). */
  datosA: Personas | null;
  datosB: Personas | null;
  periodos: { a: Periodo; b: Periodo } | null;
  cargando: boolean;
}

export function VistaPersonas({ datos, datosA, datosB, periodos, cargando }: PropsVistaPersonas) {
  const [metrica, setMetrica] = useState<Metrica>('hechos');
  const [vistaVehiculos, setVistaVehiculos] = useState<'volumen' | 'cambio'>('volumen');
  const [vistaBurbujas, setVistaBurbujas] = useState<VistaBurbujas>('conjunto');
  const totalCruce = datos?.cruce_edad_sexo.cobertura.hechos ?? 0;

  return (
    <div className="at-vista at-vista--personas">
      <section
        className="at-panel at-panel--posiciones"
        aria-labelledby="at-t-posiciones"
        data-testid="panel-posiciones"
      >
        <div className="at-panel-head">
          <div>
            <h3 id="at-t-posiciones">Una categoría, tres lecturas</h3>
            <p className="at-panel-sub">Tipo de persona principal del expediente</p>
          </div>
        </div>
        <PosicionesTipoPersona filas={datos?.por_tipo_usuario ?? []} />
      </section>

      <section
        className="at-panel at-panel--burbujas"
        aria-labelledby="at-t-burbujas"
        data-testid="panel-burbujas"
      >
        <div className="at-panel-head at-tl-cab">
          <div className="at-tl-cab-texto">
            <h3 id="at-t-burbujas">Edad y sexo de la persona principal</h3>
            <p className="at-panel-sub">Cada burbuja representa una combinación de edad y sexo registrado</p>
          </div>
          <div className="at-tl-controles">
            <SelectorMetrica metrica={metrica} onMetrica={setMetrica} etiqueta="Métrica de edad y sexo" />
            <Segmentado<VistaBurbujas>
              etiqueta="Agrupación de las burbujas"
              valor={vistaBurbujas}
              onElegir={setVistaBurbujas}
              testid="selector-agrupacion"
              opciones={[
                { valor: 'conjunto', texto: 'Conjunto' },
                { valor: 'edad', texto: 'Por edad' },
                { valor: 'sexo', texto: 'Por sexo' },
              ]}
            />
          </div>
        </div>
        <BurbujasEdadSexo
          cruce={datos?.cruce_edad_sexo ?? null}
          metrica={metrica}
          vista={vistaBurbujas}
          total={totalCruce}
        />
      </section>

      <section
        className="at-panel at-panel--vehiculos"
        aria-labelledby="at-t-vehiculos"
        data-testid="panel-vehiculos"
      >
        <div className="at-panel-head at-tl-cab">
          <div className="at-tl-cab-texto">
            <h3 id="at-t-vehiculos">Vehículo principal: comparación entre periodos</h3>
            <p className="at-panel-sub">Misma métrica y filtros para ambos periodos</p>
          </div>
          <div className="at-tl-controles">
            <SelectorMetrica
              metrica={metrica}
              onMetrica={setMetrica}
              etiqueta="Métrica de vehículos"
            />
            <Segmentado<'volumen' | 'cambio'>
              etiqueta="Presentación de la comparación"
              valor={vistaVehiculos}
              onElegir={setVistaVehiculos}
              testid="selector-presentacion"
              opciones={[
                { valor: 'volumen', texto: 'Volumen' },
                { valor: 'cambio', texto: 'Cambio entre periodos' },
              ]}
            />
          </div>
        </div>

        <VehiculosPeriodos
          serieA={datosA?.por_vehiculo ?? null}
          serieB={datosB?.por_vehiculo ?? null}
          metrica={metrica}
          periodos={periodos}
          vista={vistaVehiculos}
        />
      </section>

      {cargando ? <p className="at-nota">Actualizando los análisis de personas…</p> : null}

      <p className="at-aviso">
        Ninguna de estas lecturas describe riesgo individual ni permite comparar personas: los
        desgloses describen a la persona principal del expediente y no se suman entre sí. Las personas
        lesionadas y fallecidas se contabilizan en esos hechos y no necesariamente comparten el perfil
        de la persona principal.
      </p>
    </div>
  );
}






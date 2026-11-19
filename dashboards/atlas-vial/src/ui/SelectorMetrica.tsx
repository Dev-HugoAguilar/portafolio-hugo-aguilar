import type { Metrica } from '../paleta';
import { Segmentado } from './Segmentado';

export const METRICAS: { clave: Metrica; etiqueta: string }[] = [
  { clave: 'hechos', etiqueta: 'Hechos' },
  { clave: 'personas_lesionadas', etiqueta: 'Lesionadas' },
  { clave: 'personas_fallecidas', etiqueta: 'Fallecidas' },
];

/** Selector compartido: la métrica es un solo estado para burbujas y vehículos. */
export function SelectorMetrica({
  metrica,
  onMetrica,
  etiqueta,
}: {
  metrica: Metrica;
  onMetrica: (metrica: Metrica) => void;
  etiqueta: string;
}) {
  return (
    <Segmentado<Metrica>
      etiqueta={etiqueta}
      valor={metrica}
      onElegir={onMetrica}
      testid="selector-metrica"
      opciones={METRICAS.map((opcion) => ({ valor: opcion.clave, texto: opcion.etiqueta }))}
    />
  );
}

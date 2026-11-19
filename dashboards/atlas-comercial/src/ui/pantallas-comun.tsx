/**
 * Cabecera común de las pantallas del proyecto.
 *
 * Cada pantalla declara su título y su propósito en una sola línea, y opcionalmente
 * el contexto activo y sus controles propios. La cabecera no repite la navegación:
 * la navegación de pantallas vive en `NavPantallas`.
 */

import type { ReactNode } from 'react';

import './pantallas.css';

export function CabeceraPantalla({
  titulo,
  proposito,
  contexto,
  children,
}: {
  titulo: string;
  proposito: string;
  /** Resumen del contexto activo (territorio, catálogo y periodo). */
  contexto?: string | null;
  /** Controles propios de la pantalla. */
  children?: ReactNode;
}) {
  return (
    <header className="ac-ph">
      <div className="ac-ph-texto">
        <h2 className="ac-ph-titulo">{titulo}</h2>
        <p className="ac-ph-proposito">{proposito}</p>
        {contexto ? <p className="ac-ph-contexto">{contexto}</p> : null}
      </div>
      {children ? <div className="ac-ph-controles">{children}</div> : null}
    </header>
  );
}

/** Bloque con título y descripción, para las pantallas narrativas. */
export function Bloque({
  titulo,
  descripcion,
  children,
  testid,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  testid?: string;
}) {
  return (
    <section className="ac-panel ac-bloque" data-testid={testid}>
      <header className="ac-panel-cab ac-bloque-cab">
        <div>
          <h3>{titulo}</h3>
          {descripcion ? <p className="ac-panel-sub">{descripcion}</p> : null}
        </div>
      </header>
      <div className="ac-bloque-cuerpo">{children}</div>
    </section>
  );
}

/** Aviso de sección sin datos o con limitación declarada. */
export function Nota({ children, tono }: { children: ReactNode; tono?: 'aviso' | 'error' }) {
  return (
    <p className={tono === 'error' ? 'ac-aviso-inline ac-aviso--error' : 'ac-aviso-inline'}>
      {children}
    </p>
  );
}

/* Aceptan `null` para no obligar a comprobar cada cifra en la vista: se presentan como
   «n/c», nunca como cero. */
export const numero = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? 'n/c' : valor.toLocaleString('es-MX');
export const numero1 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? 'n/c'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const numero2 = (valor: number | null | undefined) =>
  valor === null || valor === undefined
    ? 'n/c'
    : valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Fecha ISO → «4 nov 2015», sin depender de la zona horaria del navegador. */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const fecha = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return iso;
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

# Política de seguridad

## Alcance

Sitio estático (HTML, CSS y JavaScript) sin backend ni dependencias en tiempo de
ejecución. No procesa datos personales, no usa cookies ni analítica y no
establece conexiones con servicios de terceros al navegar.

## Cómo reportar

Usa los **avisos privados de seguridad** de GitHub: pestaña *Security* →
*Report a vulnerability*. Evita abrir un issue público con detalles explotables.

Incluye el commit afectado, los pasos mínimos para reproducir y el impacto
observable.

## Buenas prácticas

- No añadas credenciales al repositorio; el sitio no las necesita.
- Sirve el sitio detrás de HTTPS si lo expones fuera de `127.0.0.1`.
- Revisa que la integración continua (sintaxis y credenciales) esté en verde
  antes de fusionar.

# Cómo contribuir

Sitio estático de portafolio. Las contribuciones más útiles son las que mejoran
la accesibilidad, la claridad editorial o la coherencia de la taxonomía.

## Entorno

```bash
python -m http.server 8000 --directory dist
```

No hay compilación ni `npm install` para el sitio.

## Convenciones

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/).
  Prefijos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `ci`.
  Ámbito por área del sitio: `feat(site):`, `fix(cards):`, `docs(readme):`.
- **Idioma**: contenido y documentación en español; identificadores y mensajes de
  commit pueden ir en inglés.
- **Estilo**: 2 espacios en CSS/JS/HTML; sin dependencias nuevas en el cliente.

## Contenido

- Las áreas y fichas se editan en `dist/content.js`. Cada ficha declara `estado`
  (`publicado`, `desarrollo`, `previsto`), `categoria` y, cuando existen,
  `codigoUrl` (repositorio) y `demoUrl` (demo publicada).
- Un campo vacío no se muestra: no se rellena con texto ficticio.
- Un enlace a un repositorio solo se declara si el repositorio existe.

## Verificación

```bash
node tools/verificar-taxonomia.mjs
```

Comprueba las cinco categorías, los estados, los enlaces y el tratamiento de
roadmap en un navegador real.

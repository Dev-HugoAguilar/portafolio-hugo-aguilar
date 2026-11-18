/* ==========================================================================
   PROYECTO: Atlas vial · Ciudad de México
   --------------------------------------------------------------------------
   Tablero construido con React, TypeScript y D3 (carpeta
   `dashboards/atlas-vial/`). Se compila a un módulo ESM en
   `dist/dashboards/atlas-vial/` y este archivo solo lo carga y lo monta DENTRO
   del portafolio.

   Datos: exclusivamente la API del backend del portafolio
   (`/api/v1/atlas-vial/*`), que sirve la versión publicada de los cinco
   archivos de la SSC. El navegador nunca descarga los CSV oficiales ni se
   conecta a MongoDB.

   Base de la API (en orden): `opts.apiBase` → `window.PORTFOLIO_ATLAS_API` →
   `http://127.0.0.1:8010/api/v1/atlas-vial`.
   ========================================================================== */

(function () {
  'use strict';

  var MODULO = 'dashboards/atlas-vial/app.js';
  var ESTILOS = 'dashboards/atlas-vial/app.css';

  /* Promesa compartida: el módulo se descarga una sola vez por visita. */
  var cargaModulo = null;
  var cargandoEstilos = false;

  function asegurarEstilos() {
    if (cargandoEstilos) return;
    if (document.querySelector('link[data-atlas-vial]')) return;
    cargandoEstilos = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ESTILOS;
    link.setAttribute('data-atlas-vial', '');
    document.head.appendChild(link);
  }

  function cargarAplicacion() {
    if (!cargaModulo) {
      cargaModulo = import(new URL(MODULO, document.baseURI).toString());
    }
    return cargaModulo;
  }

  function mensaje(host, titulo, detalle) {
    host.innerHTML = '';
    var caja = document.createElement('div');
    caja.className = 'at-app';

    var aviso = document.createElement('div');
    aviso.className = 'at-aviso at-aviso--error';

    var t = document.createElement('p');
    t.className = 'at-aviso-title';
    t.textContent = titulo;

    var p = document.createElement('p');
    p.textContent = detalle;

    aviso.appendChild(t);
    aviso.appendChild(p);
    caja.appendChild(aviso);
    host.appendChild(caja);
  }

  window.PORTFOLIO_PROJECTS.register({
    id: 'atlas-vial',
    areaId: 'dashboards',
    titulo: 'Atlas vial · Ciudad de México',

    mount: function (host, api) {
      var vivo = true;
      var instancia = null;

      asegurarEstilos();
      host.innerHTML = '';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', 'at-app', 'Cargando la aplicación…');
        espera.style.padding = '18px';
        espera.style.color = '#596273';
        espera.style.fontFamily = 'Inter, system-ui, sans-serif';
        host.appendChild(espera);
      }

      cargarAplicacion()
        .then(function (modulo) {
          if (!vivo) return;
          host.innerHTML = '';
          instancia = modulo.mount(host, { apiBase: window.PORTFOLIO_ATLAS_API });
        })
        .catch(function (error) {
          if (!vivo) return;
          // Un fallo al descargar el módulo se informa aquí; no hay datos de respaldo.
          mensaje(
            host,
            'No se pudo cargar la aplicación del Atlas vial',
            'Comprueba que exista dist/dashboards/atlas-vial/app.js. Detalle: ' +
              (error && error.message ? error.message : 'error desconocido')
          );
        });

      return {
        destroy: function () {
          vivo = false;
          if (instancia && typeof instancia.unmount === 'function') {
            instancia.unmount();
          }
          instancia = null;
          host.innerHTML = '';
        },
        onResize: function () {
          if (instancia && typeof instancia.resize === 'function') instancia.resize();
        }
      };
    }
  });
})();

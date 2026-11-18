/* ==========================================================================
   PROYECTO: Banca múltiple mexicana — Comparativo financiero
   --------------------------------------------------------------------------
   Dashboard construido con React, TypeScript y D3 (carpeta
   `dashboards/banca-multiple/`). Se compila a un módulo ESM en
   `dist/dashboards/banca-multiple/` y este archivo solo lo carga y lo monta
   DENTRO del portafolio.

   Datos: exclusivamente la API real de la CNBV del backend del portafolio
   (`/api/v1/cnbv/banca-multiple/*`). No se usa el dataset sintético, no se
   abre otra pestaña y no se conecta el navegador a MongoDB.

   Base de la API (en orden): `opts.apiBase` → `window.PORTFOLIO_BANCA_API` →
   `http://127.0.0.1:8010/api/v1/cnbv/banca-multiple`.
   ========================================================================== */

(function () {
  'use strict';

  var MODULO = 'dashboards/banca-multiple/app.js';
  var ESTILOS = 'dashboards/banca-multiple/app.css';

  /* Promesa compartida: el módulo se descarga una sola vez por visita. */
  var cargaModulo = null;
  var cargandoEstilos = false;

  function asegurarEstilos() {
    if (cargandoEstilos) return;
    if (document.querySelector('link[data-banca-multiple]')) return;
    cargandoEstilos = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = ESTILOS;
    link.setAttribute('data-banca-multiple', '');
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
    caja.className = 'bm-app';

    var aviso = document.createElement('div');
    aviso.className = 'bm-aviso bm-aviso--error';

    var t = document.createElement('p');
    t.className = 'bm-aviso-title';
    t.textContent = titulo;

    var p = document.createElement('p');
    p.textContent = detalle;

    aviso.appendChild(t);
    aviso.appendChild(p);
    caja.appendChild(aviso);
    host.appendChild(caja);
  }

  window.PORTFOLIO_PROJECTS.register({
    id: 'comparativo-bancario',
    areaId: 'dashboards',
    titulo: 'Banca múltiple mexicana — Comparativo financiero',

    mount: function (host, api) {
      var vivo = true;
      var instancia = null;

      asegurarEstilos();
      host.innerHTML = '';

      if (api && typeof api.el === 'function') {
        var espera = api.el('p', 'bm-app', 'Cargando la aplicación…');
        espera.style.padding = '18px';
        espera.style.color = '#596273';
        espera.style.fontFamily = 'Inter, system-ui, sans-serif';
        host.appendChild(espera);
      }

      cargarAplicacion()
        .then(function (modulo) {
          if (!vivo) return;
          host.innerHTML = '';
          instancia = modulo.mount(host, { apiBase: window.PORTAFOLIO_BANCA_API });
        })
        .catch(function (error) {
          if (!vivo) return;
          // Un fallo al descargar el módulo se informa aquí; no hay respaldo sintético.
          mensaje(
            host,
            'No se pudo cargar la aplicación del comparativo bancario',
            'Comprueba que exista dist/dashboards/banca-multiple/app.js. Detalle: ' +
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
